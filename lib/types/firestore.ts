import { Timestamp } from "firebase/firestore";

// ========================================
// Organization
// ========================================
export type PlanType = "trial" | "basic" | "premium" | "enterprise";
export type SubscriptionStatus = "trial" | "active" | "cancelled" | "expired";

export interface Organization {
  id: string;
  name: string;
  ownerEmail: string;
  plan: PlanType;
  subscriptionStatus: SubscriptionStatus;
  subscriptionExpiresAt: Timestamp | null;
  limits: {
    maxStaffs: number;
    maxShiftsPerMonth: number;
    maxEscalationStages: number;
  };
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  lineConfig: {
    channelAccessToken: string;
    channelSecret: string;
    webhookUrl: string;
    isConfigured: boolean;
    configuredAt: Timestamp | null;
  } | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ========================================
// Admin
// ========================================
export type AdminRole = "owner" | "admin";

export interface Admin {
  id: string;
  email: string;
  displayName: string;
  organizationId: string;
  role: AdminRole;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ========================================
// Staff
// ========================================
export type StaffRole = "general" | "leader" | "assistant";

export interface Staff {
  id: string;
  organizationId: string;
  name: string;
  role: StaffRole;
  lineUserId: string | null;
  phoneNumber: string;
  isEscalationTarget: boolean;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ========================================
// Work Template
// ========================================
export interface WorkTemplate {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  notes: string;
  estimatedDuration: number; // minutes
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ========================================
// Shift
// ========================================
export type ShiftStatus = "scheduled" | "active" | "completed" | "cancelled";

export interface Shift {
  id: string;
  organizationId: string;
  date: string; // YYYY-MM-DD
  staffIds: string[]; // Multiple staff support
  startTime: string; // HH:mm
  endTime: string | null; // HH:mm
  workTemplateId: string;
  escalationPolicyId: string; // Escalation policy per shift
  status: ShiftStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ========================================
// Attendance Record
// ========================================
export type AttendanceStatus = "pending" | "present" | "absent" | "late" | "early_leave";
export type EscalationStatus = "none" | "escalating" | "resolved" | "failed";

export interface AttendanceRecord {
  id: string;
  organizationId: string;
  shiftId: string;
  staffId: string;
  date: string; // YYYY-MM-DD
  clockInTime: Timestamp | null;
  clockOutTime: Timestamp | null;
  status: AttendanceStatus;
  escalationStatus: EscalationStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ========================================
// Escalation Policy
// ========================================
export type NotificationMethod = "line" | "sms" | "call";
export type TargetType = "self" | "designated" | "next_shift";

export interface EscalationStage {
  stageNumber: 1 | 2 | 3;
  waitMinutes: number;
  notificationMethod: NotificationMethod;
  targetType: TargetType;
  designatedStaffIds: string[];
  stopOnResponse: boolean;
}

export interface EscalationPolicy {
  id: string;
  organizationId: string;
  name: string;
  isDefault: boolean;
  isActive: boolean;
  stages: EscalationStage[];
  maxRetries: number;
  activeTimeRange: {
    start: string; // HH:mm
    end: string; // HH:mm
  } | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ========================================
// Notification Log
// ========================================
export type NotificationType = "line" | "sms" | "call";
export type NotificationStatus = "pending" | "sent" | "delivered" | "failed" | "responded";

export interface NotificationLog {
  id: string;
  organizationId: string;
  shiftId: string;
  staffId: string;
  attendanceRecordId: string;
  type: NotificationType;
  stage: number; // 0 = initial, 1-3 = escalation stages
  status: NotificationStatus;
  recipient: string;
  message: string;
  response: any | null;
  errorMessage: string | null;
  sentAt: Timestamp | null;
  respondedAt: Timestamp | null;
  createdAt: Timestamp;
}

// ========================================
// Escalation Execution
// ========================================
export type ExecutionStatus = "running" | "paused" | "completed" | "stopped";

export interface EscalationExecution {
  id: string;
  organizationId: string;
  shiftId: string;
  attendanceRecordId: string;
  policyId: string;
  currentStage: number;
  status: ExecutionStatus;
  nextExecutionAt: Timestamp | null;
  history: {
    stage: number;
    executedAt: Timestamp;
    result: string;
  }[];
  stoppedReason: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ========================================
// Utility Types for Creation
// ========================================
export type CreateOrganization = Omit<Organization, "id" | "createdAt" | "updatedAt">;
export type CreateAdmin = Omit<Admin, "id" | "createdAt" | "updatedAt">;
export type CreateStaff = Omit<Staff, "id" | "createdAt" | "updatedAt">;
export type CreateWorkTemplate = Omit<WorkTemplate, "id" | "createdAt" | "updatedAt">;
export type CreateShift = Omit<Shift, "id" | "createdAt" | "updatedAt">;
export type CreateAttendanceRecord = Omit<AttendanceRecord, "id" | "createdAt" | "updatedAt">;
export type CreateEscalationPolicy = Omit<EscalationPolicy, "id" | "createdAt" | "updatedAt">;
export type CreateNotificationLog = Omit<NotificationLog, "id" | "createdAt">;
export type CreateEscalationExecution = Omit<EscalationExecution, "id" | "createdAt" | "updatedAt">;
