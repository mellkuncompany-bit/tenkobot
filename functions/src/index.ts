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

/**
 * Daily license expiry check
 * Runs at 9:00 AM daily
 */
export const dailyLicenseCheck = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .pubsub.schedule("0 9 * * *")
  .timeZone("Asia/Tokyo")
  .onRun(async (context) => {
    console.log("[License Check] Running daily license expiry check...");

    try {
      const now = new Date();
      const oneMonthLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const today = now.toISOString().split("T")[0];

      // Get all staffs with license expiry date
      const staffsSnapshot = await db
        .collection("staffs")
        .where("licenseExpiryDate", "!=", null)
        .where("licenseNotificationEnabled", "==", true)
        .where("isActive", "==", true)
        .get();

      console.log(`[License Check] Found ${staffsSnapshot.size} staffs with licenses`);

      for (const staffDoc of staffsSnapshot.docs) {
        const staff = staffDoc.data();
        const { licenseExpiryDate, name, lineUserId, organizationId } = staff;

        if (!licenseExpiryDate) continue;

        const expiryDate = licenseExpiryDate.toDate();
        const daysUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

        // Notify 30 days before, 7 days before, and on expiry day
        if (daysUntilExpiry === 30 || daysUntilExpiry === 7 || daysUntilExpiry === 0) {
          // Send notification to staff
          if (lineUserId) {
            try {
              const lineClient = await getLINEClientForOrg(organizationId);
              let message = "";

              if (daysUntilExpiry === 30) {
                message = `【免許更新リマインダー】\n\n${name}さんの運転免許証が1ヶ月後に期限切れとなります。\n期限日: ${expiryDate.toLocaleDateString("ja-JP")}\n\n早めに更新手続きをお願いします。`;
              } else if (daysUntilExpiry === 7) {
                message = `【重要】免許更新リマインダー】\n\n${name}さんの運転免許証が7日後に期限切れとなります。\n期限日: ${expiryDate.toLocaleDateString("ja-JP")}\n\n至急更新手続きをお願いします。`;
              } else {
                message = `【緊急】免許期限切れ通知】\n\n${name}さんの運転免許証が本日期限切れとなります。\n期限日: ${expiryDate.toLocaleDateString("ja-JP")}\n\n管理者に連絡してください。`;
              }

              await lineClient.pushMessage(lineUserId, {
                type: "text",
                text: message,
              });

              console.log(`[License Check] Sent notification to staff ${staffDoc.id} (${daysUntilExpiry} days)`);
            } catch (error) {
              console.error(`[License Check] Error sending to staff ${staffDoc.id}:`, error);
            }
          }

          // Notify managers and owners on expiry day
          if (daysUntilExpiry === 0) {
            await notifyManagersAndOwners(
              organizationId,
              `【免許期限切れ通知】\n\n${name}さんの運転免許証が本日期限切れとなりました。\n期限日: ${expiryDate.toLocaleDateString("ja-JP")}\n\n至急対応をお願いします。`
            );
          }
        }
      }

      console.log("[License Check] Completed");
    } catch (error) {
      console.error("[License Check] Error:", error);
    }
  });

/**
 * Daily vehicle inspection check
 * Runs at 9:00 AM daily
 */
export const dailyVehicleInspectionCheck = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .pubsub.schedule("0 9 * * *")
  .timeZone("Asia/Tokyo")
  .onRun(async (context) => {
    console.log("[Inspection Check] Running daily vehicle inspection check...");

    try {
      const now = new Date();

      // Get all vehicles with inspection date
      const vehiclesSnapshot = await db
        .collection("vehicles")
        .where("inspectionDate", "!=", null)
        .where("inspectionNotificationEnabled", "==", true)
        .where("isActive", "==", true)
        .get();

      console.log(`[Inspection Check] Found ${vehiclesSnapshot.size} vehicles`);

      for (const vehicleDoc of vehiclesSnapshot.docs) {
        const vehicle = vehicleDoc.data();
        const { inspectionDate, name, licensePlate, organizationId } = vehicle;

        if (!inspectionDate) continue;

        const inspectionDateObj = inspectionDate.toDate();
        const daysUntilInspection = Math.floor(
          (inspectionDateObj.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        );

        // Notify 30 days before, 7 days before, and on inspection due day
        if (daysUntilInspection === 30 || daysUntilInspection === 7 || daysUntilInspection === 0) {
          let message = "";

          if (daysUntilInspection === 30) {
            message = `【車検リマインダー】\n\n車両「${name}」(${licensePlate})の車検が1ヶ月後に期限切れとなります。\n期限日: ${inspectionDateObj.toLocaleDateString("ja-JP")}\n\n早めに車検の予約をお願いします。`;
          } else if (daysUntilInspection === 7) {
            message = `【重要】車検リマインダー】\n\n車両「${name}」(${licensePlate})の車検が7日後に期限切れとなります。\n期限日: ${inspectionDateObj.toLocaleDateString("ja-JP")}\n\n至急車検を受けてください。`;
          } else {
            message = `【緊急】車検期限切れ通知】\n\n車両「${name}」(${licensePlate})の車検が本日期限切れとなります。\n期限日: ${inspectionDateObj.toLocaleDateString("ja-JP")}\n\n至急対応をお願いします。`;
          }

          await notifyManagersAndOwners(organizationId, message);

          console.log(`[Inspection Check] Sent notification for vehicle ${vehicleDoc.id} (${daysUntilInspection} days)`);
        }
      }

      console.log("[Inspection Check] Completed");
    } catch (error) {
      console.error("[Inspection Check] Error:", error);
    }
  });

/**
 * Monthly payroll generation
 * Runs at 1:00 AM on the 1st of each month
 */
export const monthlyPayrollGeneration = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .pubsub.schedule("0 1 1 * *")
  .timeZone("Asia/Tokyo")
  .onRun(async (context) => {
    console.log("[Payroll Generation] Running monthly payroll generation...");

    try {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const year = lastMonth.getFullYear();
      const month = lastMonth.getMonth() + 1;

      // Get all organizations
      const organizationsSnapshot = await db.collection("organizations").get();

      console.log(`[Payroll Generation] Processing ${organizationsSnapshot.size} organizations`);

      for (const orgDoc of organizationsSnapshot.docs) {
        const organizationId = orgDoc.id;

        try {
          // Get all active staffs in this organization
          const staffsSnapshot = await db
            .collection("staffs")
            .where("organizationId", "==", organizationId)
            .where("isActive", "==", true)
            .get();

          for (const staffDoc of staffsSnapshot.docs) {
            const staff = staffDoc.data();
            const staffId = staffDoc.id;

            // Get attendance records for the previous month
            const startDate = `${year}-${month.toString().padStart(2, "0")}-01`;
            const endDate = new Date(year, month, 0).toISOString().split("T")[0];

            const attendanceSnapshot = await db
              .collection("attendanceRecords")
              .where("organizationId", "==", organizationId)
              .where("staffId", "==", staffId)
              .where("date", ">=", startDate)
              .where("date", "<=", endDate)
              .get();

            // Calculate payroll
            const workDays = attendanceSnapshot.size;
            let totalWorkMinutes = 0;
            let regularMinutes = 0;
            let overtimeMinutes = 0;

            attendanceSnapshot.forEach((doc) => {
              const record = doc.data();
              const workMinutes = record.workHours || 0;
              totalWorkMinutes += workMinutes;

              // Assuming 8 hours (480 minutes) as regular work time
              if (workMinutes <= 480) {
                regularMinutes += workMinutes;
              } else {
                regularMinutes += 480;
                overtimeMinutes += workMinutes - 480;
              }
            });

            // Calculate payment based on payment type
            let basePayment = 0;
            let overtimePayment = 0;

            if (staff.paymentType === "hourly") {
              basePayment = (regularMinutes / 60) * (staff.hourlyRate || 0);
              overtimePayment = (overtimeMinutes / 60) * (staff.overtimeRate || staff.hourlyRate || 0);
            } else if (staff.paymentType === "daily") {
              basePayment = workDays * (staff.dailyRate || 0);
              overtimePayment = (overtimeMinutes / 60) * (staff.overtimeRate || 0);
            } else if (staff.paymentType === "monthly") {
              basePayment = staff.monthlyRate || 0;
              overtimePayment = (overtimeMinutes / 60) * (staff.overtimeRate || 0);
            }

            const totalPayment = basePayment + overtimePayment;

            // Create payroll record
            await db.collection("payrollRecords").add({
              organizationId,
              staffId,
              year,
              month,
              workDays,
              totalWorkMinutes,
              regularMinutes,
              overtimeMinutes,
              basePayment,
              overtimePayment,
              allowances: 0,
              deductions: 0,
              totalPayment,
              status: "draft",
              notes: "自動生成された給料明細",
              isManuallyAdjusted: false,
              createdAt: admin.firestore.Timestamp.now(),
              updatedAt: admin.firestore.Timestamp.now(),
            });

            console.log(`[Payroll Generation] Created payroll for staff ${staffId}`);
          }
        } catch (error) {
          console.error(`[Payroll Generation] Error processing organization ${organizationId}:`, error);
        }
      }

      // Notify managers and owners of all organizations
      const orgs = organizationsSnapshot.docs;
      for (const orgDoc of orgs) {
        await notifyManagersAndOwners(
          orgDoc.id,
          `【給料明細自動生成完了】\n\n${year}年${month}月の給料明細が自動生成されました。\n管理画面から確認・編集をお願いします。`
        );
      }

      console.log("[Payroll Generation] Completed");
    } catch (error) {
      console.error("[Payroll Generation] Error:", error);
    }
  });

/**
 * Check overtime work and trigger notifications
 * Firestore trigger on attendance record updates
 */
export const checkOvertimeWork = functions
  .runWith({ timeoutSeconds: 60, memory: "256MB" })
  .firestore.document("attendanceRecords/{recordId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Only check if clockInTime was just set or updated
    if (!before.clockInTime && after.clockInTime) {
      console.log(`[Overtime Check] Checking overtime for record ${context.params.recordId}`);

      try {
        const { shiftId, staffId, organizationId } = after;

        // Get shift details
        const shiftDoc = await db.collection("shifts").doc(shiftId).get();
        if (!shiftDoc.exists) {
          return;
        }

        const shift = shiftDoc.data()!;
        const { workTemplateId } = shift;

        // Get work template
        const workTemplateDoc = await db.collection("workTemplates").doc(workTemplateId).get();
        if (!workTemplateDoc.exists) {
          return;
        }

        const workTemplate = workTemplateDoc.data()!;
        const { expectedDurationMinutes } = workTemplate;

        if (!expectedDurationMinutes) {
          return;
        }

        // Calculate elapsed time
        const clockInTime = after.clockInTime.toDate();
        const now = new Date();
        const elapsedMinutes = Math.floor((now.getTime() - clockInTime.getTime()) / (60 * 1000));

        // Check if overtime
        if (elapsedMinutes >= expectedDurationMinutes) {
          // Get staff details
          const staffDoc = await db.collection("staffs").doc(staffId).get();
          if (!staffDoc.exists) {
            return;
          }

          const staff = staffDoc.data()!;
          const { name, lineUserId, escalationGraceMinutes } = staff;

          // Add grace period
          const graceMinutes = escalationGraceMinutes || 0;
          if (elapsedMinutes < expectedDurationMinutes + graceMinutes) {
            return; // Still within grace period
          }

          // Send overtime notification to staff
          if (lineUserId) {
            const lineClient = await getLINEClientForOrg(organizationId);
            const overtimeAmount = elapsedMinutes - expectedDurationMinutes;

            await lineClient.pushMessage(lineUserId, {
              type: "text",
              text: `【勤務時間超過通知】\n\n${name}さん、予定作業時間を${overtimeAmount}分超過しています。\n\n問題がなければこのまま作業を続けてください。\n問題がある場合は管理者に連絡してください。`,
            });

            console.log(`[Overtime Check] Sent overtime notification to staff ${staffId}`);
          }

          // Notify managers if significantly overtime (e.g., 30 minutes over expected + grace)
          if (elapsedMinutes >= expectedDurationMinutes + graceMinutes + 30) {
            await notifyManagersAndOwners(
              organizationId,
              `【勤務時間大幅超過アラート】\n\n${name}さんが予定作業時間を大幅に超過しています。\n超過時間: ${elapsedMinutes - expectedDurationMinutes}分\n\n状況を確認してください。`
            );
          }
        }
      } catch (error) {
        console.error("[Overtime Check] Error:", error);
      }
    }
  });

/**
 * Helper function to notify managers and owners of an organization
 */
async function notifyManagersAndOwners(organizationId: string, message: string) {
  try {
    // Get all managers and owners in the organization
    const staffsSnapshot = await db
      .collection("staffs")
      .where("organizationId", "==", organizationId)
      .where("role", "in", ["manager", "owner"])
      .where("isActive", "==", true)
      .get();

    const lineClient = await getLINEClientForOrg(organizationId);

    for (const staffDoc of staffsSnapshot.docs) {
      const staff = staffDoc.data();
      const { lineUserId, name } = staff;

      if (lineUserId) {
        try {
          await lineClient.pushMessage(lineUserId, {
            type: "text",
            text: message,
          });

          console.log(`[Notify Managers] Sent notification to ${name} (${staffDoc.id})`);
        } catch (error) {
          console.error(`[Notify Managers] Error sending to ${staffDoc.id}:`, error);
        }
      }
    }
  } catch (error) {
    console.error("[Notify Managers] Error:", error);
  }
}
