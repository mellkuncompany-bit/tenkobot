import { NextRequest, NextResponse } from "next/server";
import { getLINEProviderForOrg } from "@/lib/providers/line-provider";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { Timestamp } from "firebase-admin/firestore";

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
  // For future implementation (e.g., PIN-based clock-in)
  console.log("[LINE Webhook] Message received:", event);
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
