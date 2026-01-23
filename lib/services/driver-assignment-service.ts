import { DriverAssignment, Staff } from "@/lib/types/firestore";

/**
 * Create a staff driver assignment
 */
export function createStaffDriverAssignment(
  staffId: string,
  phone?: string
): DriverAssignment {
  return {
    type: "staff",
    staffId,
    freetextName: null,
    contactPhone: phone || null,
  };
}

/**
 * Create an unassigned driver assignment
 */
export function createUnassignedDriverAssignment(): DriverAssignment {
  return {
    type: "unassigned",
    staffId: null,
    freetextName: null,
    contactPhone: null,
  };
}

/**
 * Create a freetext driver assignment
 */
export function createFreetextDriverAssignment(
  name: string,
  phone?: string
): DriverAssignment {
  return {
    type: "freetext",
    staffId: null,
    freetextName: name,
    contactPhone: phone || null,
  };
}

/**
 * Check if driver is assigned
 */
export function isDriverAssigned(
  assignment: DriverAssignment | null
): boolean {
  if (!assignment) return false;
  return assignment.type !== "unassigned";
}

/**
 * Get driver display name
 */
export function getDriverDisplayName(
  assignment: DriverAssignment | null,
  staffs: Staff[]
): string {
  if (!assignment) {
    return "未定";
  }

  switch (assignment.type) {
    case "staff":
      if (!assignment.staffId) return "未定";
      const staff = staffs.find((s) => s.id === assignment.staffId);
      return staff ? staff.name : "不明なスタッフ";

    case "freetext":
      return assignment.freetextName || "未定";

    case "unassigned":
      return "未定";

    default:
      return "未定";
  }
}

/**
 * Get badge variant for driver assignment
 */
export function getDriverAssignmentBadgeVariant(
  assignment: DriverAssignment | null
): "default" | "secondary" | "destructive" | "outline" {
  if (!assignment || assignment.type === "unassigned") {
    return "outline"; // Yellow-ish for unassigned
  }

  if (assignment.type === "staff") {
    return "default"; // Green for staff
  }

  if (assignment.type === "freetext") {
    return "secondary"; // Blue for freetext
  }

  return "outline";
}

/**
 * ドライバー役割のスタッフのみをフィルタリング
 */
export function getDriverStaffs(staffs: Staff[]): Staff[] {
  return staffs.filter((staff) => staff.role === "driver" && staff.isActive);
}

/**
 * 連絡先電話番号を取得
 */
export function getDriverContactPhone(
  assignment: DriverAssignment | null,
  staffs: Staff[]
): string | null {
  if (!assignment) return null;

  // assignment.contactPhone が設定されていれば優先
  if (assignment.contactPhone) {
    return assignment.contactPhone;
  }

  // type="staff" の場合、スタッフマスタから取得
  if (assignment.type === "staff" && assignment.staffId) {
    const staff = staffs.find((s) => s.id === assignment.staffId);
    return staff?.phoneNumber || null;
  }

  return null;
}
