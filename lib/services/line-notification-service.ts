/**
 * LINE Notification Service
 * Handles LINE notifications for driver assignments
 */

import { getLINEProviderForOrg } from "@/lib/providers/line-provider";
import { getStaffs } from "@/lib/services/staff-service";
import { getWorkTemplate } from "@/lib/services/work-template-service";
import { Shift, Staff, DriverAssignment } from "@/lib/types/firestore";

/**
 * Send LINE notification when driver is assigned to a shift
 */
export async function notifyDriverAssignment(
  organizationId: string,
  shift: Shift,
  driverAssignment: DriverAssignment
): Promise<{ success: boolean; error?: string }> {
  try {
    // Only notify if driver is assigned to a specific staff
    if (driverAssignment.type !== "staff" || !driverAssignment.staffId) {
      return { success: true }; // No notification needed for unassigned or freetext
    }

    // Get staff information
    const staffs = await getStaffs(organizationId);
    const assignedStaff = staffs.find((s) => s.id === driverAssignment.staffId);

    if (!assignedStaff) {
      return { success: false, error: "Assigned staff not found" };
    }

    // Check if staff has LINE user ID
    if (!assignedStaff.lineUserId) {
      console.log(`[LINE Notification] Staff ${assignedStaff.name} does not have LINE user ID`);
      return { success: true }; // Skip notification but don't fail
    }

    // Get work template information
    const workTemplate = await getWorkTemplate(shift.workTemplateId);
    if (!workTemplate) {
      return { success: false, error: "Work template not found" };
    }

    // Get LINE provider for organization
    const lineProvider = await getLINEProviderForOrg(organizationId);

    // Create notification message
    const message = createDriverAssignmentMessage(
      assignedStaff,
      shift,
      workTemplate.name
    );

    // Send push message
    const result = await lineProvider.pushMessage(assignedStaff.lineUserId, [message]);

    if (!result.success) {
      console.error("[LINE Notification] Failed to send message:", result.error);
      return { success: false, error: result.error };
    }

    console.log(`[LINE Notification] Successfully sent to ${assignedStaff.name}`);
    return { success: true };
  } catch (error) {
    console.error("[LINE Notification] Error:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Create LINE message for driver assignment notification
 */
function createDriverAssignmentMessage(
  staff: Staff,
  shift: Shift,
  workTemplateName: string
): {
  type: "text";
  text: string;
} {
  const dateStr = new Date(shift.date).toLocaleDateString("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  const timeStr = shift.startTime
    ? `${shift.startTime}${shift.endTime ? `〜${shift.endTime}` : ""}`
    : "時間未定";

  const message = `【担当作業の割り当て】

${staff.name} さん

以下の作業が割り当てられました：

📅 日時: ${dateStr} ${timeStr}
🚚 作業: ${workTemplateName}

詳細はアプリで確認してください。`;

  return {
    type: "text",
    text: message,
  };
}

/**
 * Send bulk notifications for multiple driver assignments
 */
export async function notifyMultipleDriverAssignments(
  organizationId: string,
  assignments: Array<{ shift: Shift; driverAssignment: DriverAssignment }>
): Promise<{ successCount: number; failureCount: number }> {
  let successCount = 0;
  let failureCount = 0;

  for (const { shift, driverAssignment } of assignments) {
    const result = await notifyDriverAssignment(
      organizationId,
      shift,
      driverAssignment
    );

    if (result.success) {
      successCount++;
    } else {
      failureCount++;
    }
  }

  return { successCount, failureCount };
}
