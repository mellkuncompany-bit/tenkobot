import { NextRequest, NextResponse } from "next/server";
import { getLINEProviderForOrg } from "@/lib/providers/line-provider";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { Timestamp } from "firebase-admin/firestore";
import { extractReceiptData } from "@/lib/services/ocr-service";
import { parseShiftText } from "@/lib/services/shift-parser-service";

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * LINE Webhook Handler
 * Handles LINE bot events (postback, message, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    // Extract organization ID from query parameters
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");

    if (!orgId) {
      return NextResponse.json({ error: "Missing orgId parameter" }, { status: 400 });
    }

    const signature = request.headers.get("x-line-signature");
    const body = await request.text();

    if (!signature) {
      return NextResponse.json({ error: "No signature" }, { status: 401 });
    }

    // Get organization-specific LINE provider
    const lineProvider = await getLINEProviderForOrg(orgId);
    const isValid = lineProvider.verifySignature(body, signature);

    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const data = JSON.parse(body);
    const events = data.events || [];

    // Process each event
    for (const event of events) {
      if (event.type === "postback") {
        await handlePostback(event, orgId);
      } else if (event.type === "message") {
        await handleMessage(event, orgId);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[LINE Webhook] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * Handle postback events (Rich Menu actions)
 */
async function handlePostback(event: any, organizationId: string) {
  const { userId } = event.source;
  const { data } = event.postback;

  try {
    const postbackData = JSON.parse(data);
    const { action, staffId, shiftId } = postbackData;

    if (action === "clock_in") {
      await handleClockIn(userId, staffId, shiftId, organizationId);
    } else if (action === "clock_out") {
      await handleClockOut(userId, staffId, shiftId, organizationId);
    }
  } catch (error) {
    console.error("[LINE Webhook] Postback error:", error);
  }
}

/**
 * Handle message events
 */
async function handleMessage(event: any, organizationId: string) {
  const { message, source } = event;
  const { userId } = source;

  try {
    if (message.type === "image") {
      // Handle fuel receipt image OCR
      await handleImageMessage(event, organizationId);
    } else if (message.type === "text") {
      // Check if it's a shift-related message
      const text = message.text;
      const isShiftMessage = /休み|欠勤|お休み|変更|シフト/.test(text);

      if (isShiftMessage) {
        await handleShiftTextMessage(event, organizationId);
      } else {
        // Generic text message (future: PIN-based clock-in, etc.)
        console.log("[LINE Webhook] Generic text message:", text);
      }
    }
  } catch (error) {
    console.error("[LINE Webhook] Message handler error:", error);
  }
}

/**
 * Handle clock-in action
 */
async function handleClockIn(lineUserId: string, staffId: string, shiftId: string, organizationId: string) {
  try {
    // Find staff by LINE user ID and organization
    const staffsSnapshot = await adminDb
      .collection(COLLECTIONS.STAFFS)
      .where("lineUserId", "==", lineUserId)
      .where("organizationId", "==", organizationId)
      .limit(1)
      .get();

    if (staffsSnapshot.empty) {
      console.error("[Clock In] Staff not found for LINE user:", lineUserId);
      return;
    }

    const staff = staffsSnapshot.docs[0];
    const actualStaffId = staff.id;

    // Find today's attendance record for this staff
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    const attendanceSnapshot = await adminDb
      .collection(COLLECTIONS.ATTENDANCE_RECORDS)
      .where("staffId", "==", actualStaffId)
      .where("date", "==", today)
      .limit(1)
      .get();

    if (attendanceSnapshot.empty) {
      console.error("[Clock In] Attendance record not found for staff:", actualStaffId);
      return;
    }

    const attendanceDoc = attendanceSnapshot.docs[0];
    const attendanceRef = adminDb.collection(COLLECTIONS.ATTENDANCE_RECORDS).doc(attendanceDoc.id);

    // Update attendance record
    await attendanceRef.update({
      clockInTime: Timestamp.now(),
      status: "present",
      updatedAt: Timestamp.now(),
    });

    // Stop escalation if running
    const escalationSnapshot = await adminDb
      .collection(COLLECTIONS.ESCALATION_EXECUTIONS)
      .where("attendanceRecordId", "==", attendanceDoc.id)
      .where("status", "==", "running")
      .get();

    for (const escalationDoc of escalationSnapshot.docs) {
      await escalationDoc.ref.update({
        status: "stopped",
        stoppedReason: "本人が出勤確認を行いました",
        updatedAt: Timestamp.now(),
      });
    }

    // Update escalation status
    await attendanceRef.update({
      escalationStatus: "resolved",
    });

    // Send confirmation message via LINE
    const lineProvider = await getLINEProviderForOrg(organizationId);
    await lineProvider.pushMessage(lineUserId, [
      {
        type: "text",
        text: "出勤確認が完了しました。本日もよろしくお願いします。",
      },
    ]);

    console.log("[Clock In] Success for staff:", actualStaffId);
  } catch (error) {
    console.error("[Clock In] Error:", error);
  }
}

/**
 * Handle clock-out action
 */
async function handleClockOut(lineUserId: string, staffId: string, shiftId: string, organizationId: string) {
  try {
    // Find staff by LINE user ID and organization
    const staffsSnapshot = await adminDb
      .collection(COLLECTIONS.STAFFS)
      .where("lineUserId", "==", lineUserId)
      .where("organizationId", "==", organizationId)
      .limit(1)
      .get();

    if (staffsSnapshot.empty) {
      console.error("[Clock Out] Staff not found for LINE user:", lineUserId);
      return;
    }

    const staff = staffsSnapshot.docs[0];
    const actualStaffId = staff.id;

    // Find today's attendance record
    const today = new Date().toISOString().split("T")[0];

    const attendanceSnapshot = await adminDb
      .collection(COLLECTIONS.ATTENDANCE_RECORDS)
      .where("staffId", "==", actualStaffId)
      .where("date", "==", today)
      .limit(1)
      .get();

    if (attendanceSnapshot.empty) {
      console.error("[Clock Out] Attendance record not found for staff:", actualStaffId);
      return;
    }

    const attendanceDoc = attendanceSnapshot.docs[0];
    const attendanceRef = adminDb.collection(COLLECTIONS.ATTENDANCE_RECORDS).doc(attendanceDoc.id);

    // Update attendance record
    await attendanceRef.update({
      clockOutTime: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    // Send confirmation message via LINE
    const lineProvider = await getLINEProviderForOrg(organizationId);
    await lineProvider.pushMessage(lineUserId, [
      {
        type: "text",
        text: "退勤確認が完了しました。お疲れ様でした。",
      },
    ]);

    console.log("[Clock Out] Success for staff:", actualStaffId);
  } catch (error) {
    console.error("[Clock Out] Error:", error);
  }
}

/**
 * Handle image messages for fuel receipt OCR
 */
async function handleImageMessage(event: any, organizationId: string) {
  const { message, source } = event;
  const { userId } = source;
  const { id: messageId } = message;

  try {
    // Find staff by LINE user ID
    const staffsSnapshot = await adminDb
      .collection(COLLECTIONS.STAFFS)
      .where("lineUserId", "==", userId)
      .where("organizationId", "==", organizationId)
      .limit(1)
      .get();

    if (staffsSnapshot.empty) {
      console.error("[Fuel Receipt] Staff not found for LINE user:", userId);
      return;
    }

    const staff = staffsSnapshot.docs[0];
    const staffId = staff.id;

    // Get LINE provider to download image
    const lineProvider = await getLINEProviderForOrg(organizationId);

    // Download image content
    const imageBuffer = await lineProvider.getMessageContent(messageId);

    // Upload to Cloud Storage (placeholder - in production, use actual Cloud Storage)
    // For now, we'll use a data URL for OCR
    const base64Image = imageBuffer.toString('base64');
    const imageUrl = `data:image/jpeg;base64,${base64Image}`;

    // Perform OCR
    const ocrResult = await extractReceiptData(imageUrl);
    const { amount, liters, date } = ocrResult;

    // Get list of vehicles for selection
    const vehiclesSnapshot = await adminDb
      .collection(COLLECTIONS.VEHICLES)
      .where("organizationId", "==", organizationId)
      .where("isActive", "==", true)
      .get();

    const vehicles = vehiclesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    if (vehicles.length === 0) {
      await lineProvider.pushMessage(userId, [
        {
          type: "text",
          text: "車両が登録されていません。先に車両を登録してください。",
        },
      ]);
      return;
    }

    // Send confirmation message with extracted data
    let confirmationText = "ガソリンレシートを読み取りました：\n\n";
    confirmationText += `金額: ${amount > 0 ? `¥${amount.toLocaleString()}` : "読み取れませんでした"}\n`;
    confirmationText += `給油量: ${liters > 0 ? `${liters}L` : "読み取れませんでした"}\n`;
    confirmationText += `日付: ${date || "読み取れませんでした"}\n\n`;
    confirmationText += "車両を選択してください：\n";
    vehicles.forEach((v: any, index: number) => {
      confirmationText += `${index + 1}. ${v.name} (${v.licensePlate})\n`;
    });

    await lineProvider.pushMessage(userId, [
      {
        type: "text",
        text: confirmationText,
      },
    ]);

    // Store temporary receipt data in Firestore for later confirmation
    // (In production, you'd implement a proper state machine for this conversation flow)
    await adminDb.collection("temp_fuel_receipts").add({
      organizationId,
      staffId,
      amount,
      liters,
      date: date || new Date().toISOString().split("T")[0],
      imageUrl, // In production, this would be a Cloud Storage URL
      ocrData: ocrResult,
      createdAt: Timestamp.now(),
      expiresAt: Timestamp.fromMillis(Date.now() + 30 * 60 * 1000), // 30 minutes
    });

    console.log("[Fuel Receipt] OCR completed for staff:", staffId);
  } catch (error) {
    console.error("[Fuel Receipt] Error:", error);

    const lineProvider = await getLINEProviderForOrg(organizationId);
    await lineProvider.pushMessage(userId, [
      {
        type: "text",
        text: "レシートの読み取りに失敗しました。手動で登録してください。",
      },
    ]);
  }
}

/**
 * Handle text messages for shift natural language parsing
 */
async function handleShiftTextMessage(event: any, organizationId: string) {
  const { message, source } = event;
  const { userId } = source;
  const text = message.text;

  try {
    // Find staff by LINE user ID
    const staffsSnapshot = await adminDb
      .collection(COLLECTIONS.STAFFS)
      .where("lineUserId", "==", userId)
      .where("organizationId", "==", organizationId)
      .limit(1)
      .get();

    if (staffsSnapshot.empty) {
      console.error("[Shift Parser] Staff not found for LINE user:", userId);
      return;
    }

    const staff = staffsSnapshot.docs[0];
    const staffId = staff.id;
    const staffData = staff.data();

    // Parse shift text
    const parsed = parseShiftText(text);
    const { type, workName, startDate, endDate } = parsed;

    if (!startDate || !endDate) {
      // Could not parse dates
      const lineProvider = await getLINEProviderForOrg(organizationId);
      await lineProvider.pushMessage(userId, [
        {
          type: "text",
          text: "日付を認識できませんでした。「5月10日から15日まで」のように入力してください。",
        },
      ]);
      return;
    }

    // Get work templates to match workName
    let matchedWorkTemplate = null;
    if (workName) {
      const workTemplatesSnapshot = await adminDb
        .collection(COLLECTIONS.WORK_TEMPLATES)
        .where("organizationId", "==", organizationId)
        .where("isActive", "==", true)
        .get();

      for (const doc of workTemplatesSnapshot.docs) {
        const template = doc.data();
        if (template.name.includes(workName) || workName.includes(template.name)) {
          matchedWorkTemplate = { id: doc.id, ...template };
          break;
        }
      }
    }

    // Build confirmation message
    let confirmationText = "シフト変更内容を確認してください：\n\n";
    confirmationText += `種類: ${type === "absence" ? "休み" : "変更"}\n`;
    confirmationText += `作業: ${matchedWorkTemplate ? matchedWorkTemplate.name : workName || "（未指定）"}\n`;
    confirmationText += `期間: ${startDate} ～ ${endDate}\n\n`;
    confirmationText += "この内容で登録する場合は「確認」、修正する場合は「キャンセル」と返信してください。";

    const lineProvider = await getLINEProviderForOrg(organizationId);
    await lineProvider.pushMessage(userId, [
      {
        type: "text",
        text: confirmationText,
      },
    ]);

    // Store temporary shift change request in Firestore
    // (In production, implement proper conversation state management)
    await adminDb.collection("temp_shift_changes").add({
      organizationId,
      staffId,
      type,
      workTemplateId: matchedWorkTemplate?.id || null,
      workName: matchedWorkTemplate?.name || workName,
      startDate,
      endDate,
      originalText: text,
      createdAt: Timestamp.now(),
      expiresAt: Timestamp.fromMillis(Date.now() + 30 * 60 * 1000), // 30 minutes
    });

    console.log("[Shift Parser] Parsed shift request for staff:", staffId);
  } catch (error) {
    console.error("[Shift Parser] Error:", error);

    const lineProvider = await getLINEProviderForOrg(organizationId);
    await lineProvider.pushMessage(userId, [
      {
        type: "text",
        text: "シフト変更の解析に失敗しました。管理画面から変更してください。",
      },
    ]);
  }
}
