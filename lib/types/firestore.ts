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
  adminPasswordHash: string | null; // 管理者専用ページのパスワード（ハッシュ化）
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
export type StaffRole = "driver" | "manager" | "owner";
export type PaymentType = "hourly" | "daily" | "monthly";

export interface RecurringSchedule {
  daysOfWeek: number[]; // 0=Sunday, 1=Monday...6=Saturday
  excludeHolidays: boolean;
  startDate: string | null; // YYYY-MM-DD
  endDate: string | null; // YYYY-MM-DD
}

export interface Staff {
  id: string;
  organizationId: string;
  name: string;
  role: StaffRole;
  lineUserId: string | null;
  phoneNumber: string;
  isEscalationTarget: boolean;
  isActive: boolean;

  // License and notification settings
  licenseExpiryDate: Timestamp | null;
  licenseNotificationEnabled: boolean;
  assignedWorkTemplateIds: string[];
  escalationGraceMinutes: number;

  // Payment settings
  paymentType: PaymentType;
  hourlyRate: number | null;
  dailyRate: number | null;
  monthlyRate: number | null;
  overtimeRate: number | null;

  // Recurring schedule
  recurringSchedule: RecurringSchedule | null;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ========================================
// Driver Assignment
// ========================================
export type DriverAssignmentType = "staff" | "unassigned" | "freetext";

export interface DriverAssignment {
  type: DriverAssignmentType;
  staffId: string | null;        // type="staff"の場合に使用
  freetextName: string | null;   // type="freetext"の場合に使用
  contactPhone: string | null;   // Phase 2の自動架電用（任意）
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

  // New fields
  expectedDurationMinutes: number; // Expected duration for overtime checking
  recurringSchedule: RecurringSchedule | null;
  unitPrice: number; // Unit price for invoicing
  defaultDriverAssignment: DriverAssignment | null; // Default driver assignment

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
  driverAssignment: DriverAssignment | null; // Driver assignment for this shift
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

  // New fields for time tracking
  workHours: number; // Total work hours in minutes
  breakMinutes: number; // Break time in minutes
  overtimeMinutes: number; // Overtime in minutes
  notes: string; // Notes/remarks

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
// Vehicle
// ========================================
export interface Vehicle {
  id: string;
  organizationId: string;
  name: string;
  licensePlate: string;
  inspectionDate: Timestamp; // Vehicle inspection expiry date
  inspectionNotificationEnabled: boolean;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ========================================
// Fuel Receipt
// ========================================
export interface FuelReceipt {
  id: string;
  organizationId: string;
  vehicleId: string;
  staffId: string;
  date: string; // YYYY-MM-DD
  amount: number; // Amount in yen
  liters: number; // Fuel amount in liters
  odometerReading: number | null; // Odometer reading in km

  // OCR information
  receiptImageUrl: string; // Cloud Storage path
  ocrData: any | null; // OCR result data

  // Verification status
  isVerified: boolean; // Manual verification flag

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ========================================
// Payroll Record
// ========================================
export type PayrollStatus = "draft" | "confirmed" | "paid";

export interface PayrollRecord {
  id: string;
  organizationId: string;
  staffId: string;
  year: number;
  month: number; // 1-12

  // Auto-calculated items
  workDays: number;
  totalWorkMinutes: number;
  regularMinutes: number;
  overtimeMinutes: number;

  // Payment amounts
  basePayment: number; // Base payment
  overtimePayment: number; // Overtime payment
  allowances: number; // Allowances
  deductions: number; // Deductions
  totalPayment: number; // Total payment

  // Status
  status: PayrollStatus;
  notes: string;
  isManuallyAdjusted: boolean;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ========================================
// Invoice
// ========================================
export type InvoiceStatus = "draft" | "sent" | "paid";

export interface InvoiceItem {
  workTemplateName: string;
  quantity: number; // Number of times work was performed
  unitPrice: number;
  amount: number;
}

export interface Invoice {
  id: string;
  organizationId: string;
  invoiceNumber: string;
  year: number;
  month: number;

  clientName: string;
  clientAddress: string;

  items: InvoiceItem[];

  subtotal: number;
  tax: number;
  total: number;

  status: InvoiceStatus;
  dueDate: string; // YYYY-MM-DD
  paidDate: string | null;

  notes: string;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ========================================
// Document (Work Manuals)
// ========================================
export type DocumentCategory = "manual" | "policy" | "other";

export interface Document {
  id: string;
  organizationId: string;
  title: string;
  description: string;
  fileUrl: string; // Cloud Storage path
  fileName: string;
  fileSize: number;
  mimeType: string;
  category: DocumentCategory;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ========================================
// Announcement
// ========================================
export type AnnouncementPriority = "low" | "medium" | "high";

export interface Announcement {
  id: string;
  organizationId: string;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  publishDate: Timestamp;
  expiryDate: Timestamp | null;
  targetStaffIds: string[]; // Empty array = all staff
  isActive: boolean;
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
export type CreateVehicle = Omit<Vehicle, "id" | "createdAt" | "updatedAt">;
export type CreateFuelReceipt = Omit<FuelReceipt, "id" | "createdAt" | "updatedAt">;
export type CreatePayrollRecord = Omit<PayrollRecord, "id" | "createdAt" | "updatedAt">;
export type CreateInvoice = Omit<Invoice, "id" | "createdAt" | "updatedAt">;
export type CreateDocument = Omit<Document, "id" | "createdAt" | "updatedAt">;
export type CreateAnnouncement = Omit<Announcement, "id" | "createdAt" | "updatedAt">;
