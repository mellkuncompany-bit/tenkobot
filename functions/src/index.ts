import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Client } from "@line/bot-sdk";

admin.initializeApp();

const db = admin.firestore();

/**
 * Get LINE client for a specific organization
 * Fetches credentials from Firestore organization document
 */
async function getLINEClientForOrg(organizationId: string): Promise<Client> {
  try {
    const orgDoc = await db.collection("organizations").doc(organizationId).get();

    if (!orgDoc.exists) {
      console.warn(`[LINE] Organization ${organizationId} not found, using environment variables`);
      return new Client({
        channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "",
        channelSecret: process.env.LINE_CHANNEL_SECRET || "",
      });
    }

    const orgData = orgDoc.data();
    const lineConfig = orgData?.lineConfig;

    if (!lineConfig || !lineConfig.isConfigured) {
      console.warn(`[LINE] LINE config not set for organization ${organizationId}, using environment variables`);
      return new Client({
        channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "",
        channelSecret: process.env.LINE_CHANNEL_SECRET || "",
      });
    }

    return new Client({
      channelAccessToken: lineConfig.channelAccessToken,
      channelSecret: lineConfig.channelSecret,
    });
  } catch (error) {
    console.error(`[LINE] Error fetching LINE config for organization ${organizationId}:`, error);
    // Fallback to environment variables
    return new Client({
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "",
      channelSecret: process.env.LINE_CHANNEL_SECRET || "",
    });
  }
}

/**
 * Check shifts and send attendance notifications
 * Runs every 10 minutes
 */
export const checkAndSendAttendanceNotification = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .pubsub.schedule("*/10 * * * *")
  .timeZone("Asia/Tokyo")
  .onRun(async (context) => {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    const today = now.toISOString().split("T")[0]; // YYYY-MM-DD

    console.log(`[Check Shifts] Running at ${currentTime} for date ${today}`);

    try {
      // Find shifts that should start within the next 10 minutes
      const shiftsSnapshot = await db
        .collection("shifts")
        .where("date", "==", today)
        .where("status", "==", "scheduled")
        .get();

      console.log(`[Check Shifts] Found ${shiftsSnapshot.size} shifts for today`);

      for (const shiftDoc of shiftsSnapshot.docs) {
        const shift = shiftDoc.data();
        const shiftTime = shift.startTime; // HH:mm

        // Check if we should send notification now (within ±5 minutes)
        if (isTimeToSend(currentTime, shiftTime)) {
          await sendAttendanceNotifications(shiftDoc.id, shift);
        }
      }
    } catch (error) {
      console.error("[Check Shifts] Error:", error);
    }
  });

/**
 * Process escalation for unresponsive staff
 * Runs every 5 minutes
 */
export const processEscalation = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .pubsub.schedule("*/5 * * * *")
  .timeZone("Asia/Tokyo")
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();

    console.log("[Process Escalation] Running...");

    try {
      // Find escalation executions that need processing
      const executionsSnapshot = await db
        .collection("escalationExecutions")
        .where("status", "==", "running")
        .where("nextExecutionAt", "<=", now)
        .get();

      console.log(`[Process Escalation] Found ${executionsSnapshot.size} executions to process`);

      for (const executionDoc of executionsSnapshot.docs) {
        await processEscalationExecution(executionDoc.id, executionDoc.data());
      }
    } catch (error) {
      console.error("[Process Escalation] Error:", error);
    }
  });

/**
 * Check if it's time to send notification
 */
function isTimeToSend(currentTime: string, targetTime: string): boolean {
  const [currentHour, currentMinute] = currentTime.split(":").map(Number);
  const [targetHour, targetMinute] = targetTime.split(":").map(Number);

  const currentMinutes = currentHour * 60 + currentMinute;
  const targetMinutes = targetHour * 60 + targetMinute;

  const diff = Math.abs(currentMinutes - targetMinutes);

  // Within 5 minutes
  return diff <= 5;
}

/**
 * Send attendance notifications for a shift
 */
async function sendAttendanceNotifications(shiftId: string, shift: any) {
  console.log(`[Send Notification] Processing shift ${shiftId}`);

  const { organizationId, staffIds, escalationPolicyId } = shift;

  // Get escalation policy
  const policyDoc = await db.collection("escalationPolicies").doc(escalationPolicyId).get();

  if (!policyDoc.exists) {
    console.error(`[Send Notification] Policy not found: ${escalationPolicyId}`);
    return;
  }

  const policy = policyDoc.data()!;

  // Send notification to each staff
  for (const staffId of staffIds) {
    await sendStaffNotification(shiftId, staffId, organizationId, policy);
  }
}

/**
 * Send notification to a single staff member
 */
async function sendStaffNotification(
  shiftId: string,
  staffId: string,
  organizationId: string,
  policy: any
) {
  try {
    // Get staff data
    const staffDoc = await db.collection("staffs").doc(staffId).get();

    if (!staffDoc.exists) {
      console.error(`[Send Notification] Staff not found: ${staffId}`);
      return;
    }

    const staff = staffDoc.data()!;
    const { lineUserId, name } = staff;

    if (!lineUserId) {
      console.error(`[Send Notification] Staff has no LINE user ID: ${staffId}`);
      return;
    }

    // Create attendance record
    const today = new Date().toISOString().split("T")[0];
    const attendanceRef = db.collection("attendanceRecords").doc();

    await attendanceRef.set({
      organizationId,
      shiftId,
      staffId,
      date: today,
      clockInTime: null,
      clockOutTime: null,
      status: "pending",
      escalationStatus: "none",
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    });

    // Send LINE notification
    const message = {
      type: "text" as const,
      text: `${name}さん、出勤確認の時間です。\n\nリッチメニューから「出勤する」ボタンを押してください。`,
    };

    const lineClient = await getLINEClientForOrg(organizationId);
    await lineClient.pushMessage(lineUserId, message);

    // Log notification
    await db.collection("notificationsLog").add({
      organizationId,
      shiftId,
      staffId,
      attendanceRecordId: attendanceRef.id,
      type: "line",
      stage: 0,
      status: "sent",
      recipient: lineUserId,
      message: message.text,
      response: null,
      errorMessage: null,
      sentAt: admin.firestore.Timestamp.now(),
      respondedAt: null,
      createdAt: admin.firestore.Timestamp.now(),
    });

    // Create escalation execution
    const firstStage = policy.stages[0];
    const nextExecutionAt = admin.firestore.Timestamp.fromMillis(
      Date.now() + firstStage.waitMinutes * 60 * 1000
    );

    await db.collection("escalationExecutions").add({
      organizationId,
      shiftId,
      attendanceRecordId: attendanceRef.id,
      policyId: policy.id || escalationPolicyId,
      currentStage: 0,
      status: "running",
      nextExecutionAt,
      history: [
        {
          stage: 0,
          executedAt: admin.firestore.Timestamp.now(),
          result: "Initial LINE notification sent",
        },
      ],
      stoppedReason: null,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    });

    console.log(`[Send Notification] Success for staff ${staffId}`);
  } catch (error) {
    console.error(`[Send Notification] Error for staff ${staffId}:`, error);
  }
}

/**
 * Process a single escalation execution
 */
async function processEscalationExecution(executionId: string, execution: any) {
  console.log(`[Escalation] Processing execution ${executionId}`);

  const { attendanceRecordId, policyId, currentStage, organizationId } = execution;

  try {
    // Check if attendance was confirmed
    const attendanceDoc = await db.collection("attendanceRecords").doc(attendanceRecordId).get();

    if (!attendanceDoc.exists) {
      console.error(`[Escalation] Attendance record not found: ${attendanceRecordId}`);
      return;
    }

    const attendance = attendanceDoc.data()!;

    if (attendance.status === "present") {
      // Already confirmed, stop escalation
      await db.collection("escalationExecutions").doc(executionId).update({
        status: "completed",
        stoppedReason: "Attendance confirmed",
        updatedAt: admin.firestore.Timestamp.now(),
      });
      return;
    }

    // Get policy
    const policyDoc = await db.collection("escalationPolicies").doc(policyId).get();

    if (!policyDoc.exists) {
      console.error(`[Escalation] Policy not found: ${policyId}`);
      return;
    }

    const policy = policyDoc.data()!;
    const nextStage = currentStage + 1;

    if (nextStage >= policy.stages.length) {
      // No more stages, mark as failed
      await db.collection("escalationExecutions").doc(executionId).update({
        status: "completed",
        stoppedReason: "All escalation stages exhausted",
        updatedAt: admin.firestore.Timestamp.now(),
      });

      await attendanceDoc.ref.update({
        escalationStatus: "failed",
        updatedAt: admin.firestore.Timestamp.now(),
      });

      return;
    }

    // Execute next stage
    const stage = policy.stages[nextStage];
    await executeEscalationStage(executionId, execution, stage, nextStage);
  } catch (error) {
    console.error(`[Escalation] Error processing execution ${executionId}:`, error);
  }
}

/**
 * Execute a single escalation stage
 */
async function executeEscalationStage(
  executionId: string,
  execution: any,
  stage: any,
  stageNumber: number
) {
  const { attendanceRecordId, shiftId, organizationId } = execution;

  console.log(`[Escalation] Executing stage ${stageNumber} for execution ${executionId}`);

  // Get attendance record
  const attendanceDoc = await db.collection("attendanceRecords").doc(attendanceRecordId).get();
  const attendance = attendanceDoc.data()!;
  const { staffId } = attendance;

  // Get staff
  const staffDoc = await db.collection("staffs").doc(staffId).get();
  const staff = staffDoc.data()!;

  let success = false;
  let recipient = "";

  try {
    if (stage.notificationMethod === "line") {
      // Send LINE notification
      if (staff.lineUserId) {
        const message = {
          type: "text" as const,
          text: `【再通知】出勤確認がまだ完了していません。至急確認をお願いします。`,
        };
        const lineClient = await getLINEClientForOrg(organizationId);
        await lineClient.pushMessage(staff.lineUserId, message);
        recipient = staff.lineUserId;
        success = true;
      }
    } else if (stage.notificationMethod === "sms" || stage.notificationMethod === "call") {
      // For MVP, just log (stub)
      console.log(`[Escalation] Would send ${stage.notificationMethod} to ${staff.phoneNumber}`);
      recipient = staff.phoneNumber;
      success = true;
    }

    // Log notification
    await db.collection("notificationsLog").add({
      organizationId,
      shiftId,
      staffId,
      attendanceRecordId,
      type: stage.notificationMethod,
      stage: stageNumber,
      status: success ? "sent" : "failed",
      recipient,
      message: `Stage ${stageNumber} escalation`,
      response: null,
      errorMessage: success ? null : "Failed to send",
      sentAt: admin.firestore.Timestamp.now(),
      respondedAt: null,
      createdAt: admin.firestore.Timestamp.now(),
    });

    // Update escalation execution
    const nextStage = stageNumber + 1;
    const nextExecutionAt =
      nextStage < stage.length
        ? admin.firestore.Timestamp.fromMillis(Date.now() + stage.waitMinutes * 60 * 1000)
        : null;

    await db.collection("escalationExecutions").doc(executionId).update({
      currentStage: stageNumber,
      nextExecutionAt,
      history: admin.firestore.FieldValue.arrayUnion({
        stage: stageNumber,
        executedAt: admin.firestore.Timestamp.now(),
        result: success ? "Sent" : "Failed",
      }),
      updatedAt: admin.firestore.Timestamp.now(),
    });

    // Update attendance escalation status
    await attendanceDoc.ref.update({
      escalationStatus: "escalating",
      updatedAt: admin.firestore.Timestamp.now(),
    });
  } catch (error) {
    console.error(`[Escalation] Error executing stage ${stageNumber}:`, error);
  }
}
