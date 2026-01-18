import {
  collection,
  doc,
  CollectionReference,
  DocumentReference,
} from "firebase/firestore";
import { db } from "./client";
import type {
  Organization,
  Admin,
  Staff,
  WorkTemplate,
  Shift,
  AttendanceRecord,
  EscalationPolicy,
  NotificationLog,
  EscalationExecution,
} from "@/lib/types/firestore";

// Collection names
export const COLLECTIONS = {
  ORGANIZATIONS: "organizations",
  ADMINS: "admins",
  STAFFS: "staffs",
  WORK_TEMPLATES: "workTemplates",
  SHIFTS: "shifts",
  ATTENDANCE_RECORDS: "attendanceRecords",
  ESCALATION_POLICIES: "escalationPolicies",
  NOTIFICATIONS_LOG: "notificationsLog",
  ESCALATION_EXECUTIONS: "escalationExecutions",
} as const;

// Collection references
export const organizationsCol = () =>
  collection(db, COLLECTIONS.ORGANIZATIONS) as CollectionReference<Organization>;

export const adminsCol = () =>
  collection(db, COLLECTIONS.ADMINS) as CollectionReference<Admin>;

export const staffsCol = () =>
  collection(db, COLLECTIONS.STAFFS) as CollectionReference<Staff>;

export const workTemplatesCol = () =>
  collection(db, COLLECTIONS.WORK_TEMPLATES) as CollectionReference<WorkTemplate>;

export const shiftsCol = () =>
  collection(db, COLLECTIONS.SHIFTS) as CollectionReference<Shift>;

export const attendanceRecordsCol = () =>
  collection(db, COLLECTIONS.ATTENDANCE_RECORDS) as CollectionReference<AttendanceRecord>;

export const escalationPoliciesCol = () =>
  collection(db, COLLECTIONS.ESCALATION_POLICIES) as CollectionReference<EscalationPolicy>;

export const notificationsLogCol = () =>
  collection(db, COLLECTIONS.NOTIFICATIONS_LOG) as CollectionReference<NotificationLog>;

export const escalationExecutionsCol = () =>
  collection(db, COLLECTIONS.ESCALATION_EXECUTIONS) as CollectionReference<EscalationExecution>;

// Document references
export const organizationDoc = (id: string) =>
  doc(db, COLLECTIONS.ORGANIZATIONS, id) as DocumentReference<Organization>;

export const adminDoc = (id: string) =>
  doc(db, COLLECTIONS.ADMINS, id) as DocumentReference<Admin>;

export const staffDoc = (id: string) =>
  doc(db, COLLECTIONS.STAFFS, id) as DocumentReference<Staff>;

export const workTemplateDoc = (id: string) =>
  doc(db, COLLECTIONS.WORK_TEMPLATES, id) as DocumentReference<WorkTemplate>;

export const shiftDoc = (id: string) =>
  doc(db, COLLECTIONS.SHIFTS, id) as DocumentReference<Shift>;

export const attendanceRecordDoc = (id: string) =>
  doc(db, COLLECTIONS.ATTENDANCE_RECORDS, id) as DocumentReference<AttendanceRecord>;

export const escalationPolicyDoc = (id: string) =>
  doc(db, COLLECTIONS.ESCALATION_POLICIES, id) as DocumentReference<EscalationPolicy>;

export const notificationLogDoc = (id: string) =>
  doc(db, COLLECTIONS.NOTIFICATIONS_LOG, id) as DocumentReference<NotificationLog>;

export const escalationExecutionDoc = (id: string) =>
  doc(db, COLLECTIONS.ESCALATION_EXECUTIONS, id) as DocumentReference<EscalationExecution>;
