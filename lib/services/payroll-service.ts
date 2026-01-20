import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import {
  PayrollRecord,
  CreatePayrollRecord,
  Staff,
  AttendanceRecord,
} from "@/lib/types/firestore";

export interface PayrollFilters {
  staffId?: string;
  year?: number;
  month?: number;
  status?: "draft" | "confirmed" | "paid";
}

/**
 * Get payroll records for an organization with optional filters
 */
export async function getPayrollRecords(
  organizationId: string,
  filters?: PayrollFilters
): Promise<PayrollRecord[]> {
  let q = query(
    collection(db, COLLECTIONS.PAYROLL_RECORDS),
    where("organizationId", "==", organizationId)
  );

  if (filters?.staffId) {
    q = query(q, where("staffId", "==", filters.staffId));
  }

  if (filters?.year) {
    q = query(q, where("year", "==", filters.year));
  }

  if (filters?.month) {
    q = query(q, where("month", "==", filters.month));
  }

  if (filters?.status) {
    q = query(q, where("status", "==", filters.status));
  }

  const snapshot = await getDocs(q);
  const records = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as PayrollRecord[];

  // Sort by year and month descending
  return records.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });
}

/**
 * Get a single payroll record by ID
 */
export async function getPayrollRecord(recordId: string): Promise<PayrollRecord | null> {
  const docRef = doc(db, COLLECTIONS.PAYROLL_RECORDS, recordId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as PayrollRecord;
}

/**
 * Create a new payroll record
 */
export async function createPayrollRecord(
  data: Omit<CreatePayrollRecord, "createdAt" | "updatedAt">
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTIONS.PAYROLL_RECORDS), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Update a payroll record
 */
export async function updatePayrollRecord(
  recordId: string,
  data: Partial<Omit<PayrollRecord, "id" | "createdAt" | "updatedAt">>
): Promise<void> {
  const docRef = doc(db, COLLECTIONS.PAYROLL_RECORDS, recordId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Calculate payment for a staff member based on attendance records
 */
export function calculatePayment(
  staff: Staff,
  attendanceRecords: AttendanceRecord[]
): {
  workDays: number;
  totalWorkMinutes: number;
  regularMinutes: number;
  overtimeMinutes: number;
  basePayment: number;
  overtimePayment: number;
  totalPayment: number;
} {
  const workDays = attendanceRecords.filter((r) => r.status === "present").length;
  const totalWorkMinutes = attendanceRecords.reduce((sum, r) => sum + (r.workHours || 0), 0);
  const overtimeMinutes = attendanceRecords.reduce((sum, r) => sum + (r.overtimeMinutes || 0), 0);
  const regularMinutes = totalWorkMinutes - overtimeMinutes;

  let basePayment = 0;
  let overtimePayment = 0;

  switch (staff.paymentType) {
    case "hourly":
      const hourlyRate = staff.hourlyRate || 0;
      basePayment = (regularMinutes / 60) * hourlyRate;
      const overtimeRate = staff.overtimeRate || hourlyRate * 1.25;
      overtimePayment = (overtimeMinutes / 60) * overtimeRate;
      break;

    case "daily":
      const dailyRate = staff.dailyRate || 0;
      basePayment = workDays * dailyRate;
      // For daily rate, overtime is usually calculated separately at hourly rate
      const dailyOvertimeRate = staff.overtimeRate || 0;
      overtimePayment = (overtimeMinutes / 60) * dailyOvertimeRate;
      break;

    case "monthly":
      basePayment = staff.monthlyRate || 0;
      // For monthly rate, overtime is calculated at specified overtime rate
      const monthlyOvertimeRate = staff.overtimeRate || 0;
      overtimePayment = (overtimeMinutes / 60) * monthlyOvertimeRate;
      break;
  }

  return {
    workDays,
    totalWorkMinutes,
    regularMinutes,
    overtimeMinutes,
    basePayment: Math.round(basePayment),
    overtimePayment: Math.round(overtimePayment),
    totalPayment: Math.round(basePayment + overtimePayment),
  };
}

/**
 * Generate payroll for all staff for a specific month
 */
export async function generatePayrollForMonth(
  organizationId: string,
  year: number,
  month: number
): Promise<string[]> {
  // Get all active staff
  const staffQuery = query(
    collection(db, COLLECTIONS.STAFFS),
    where("organizationId", "==", organizationId),
    where("isActive", "==", true)
  );
  const staffSnapshot = await getDocs(staffQuery);
  const staffs = staffSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Staff[];

  // Get attendance records for the month
  const monthStr = `${year}-${String(month).padStart(2, "0")}`;
  const startDate = `${monthStr}-01`;
  const endDate = `${monthStr}-${new Date(year, month, 0).getDate()}`;

  const attendanceQuery = query(
    collection(db, COLLECTIONS.ATTENDANCE_RECORDS),
    where("organizationId", "==", organizationId)
  );
  const attendanceSnapshot = await getDocs(attendanceQuery);
  const allAttendanceRecords = attendanceSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as AttendanceRecord[];

  // Filter attendance records for the month
  const monthAttendanceRecords = allAttendanceRecords.filter(
    (r) => r.date >= startDate && r.date <= endDate
  );

  // Generate payroll for each staff
  const payrollIds: string[] = [];

  for (const staff of staffs) {
    // Get attendance records for this staff
    const staffAttendance = monthAttendanceRecords.filter((r) => r.staffId === staff.id);

    // Calculate payment
    const calculation = calculatePayment(staff, staffAttendance);

    // Create payroll record
    const payrollData: Omit<CreatePayrollRecord, "createdAt" | "updatedAt"> = {
      organizationId,
      staffId: staff.id,
      year,
      month,
      workDays: calculation.workDays,
      totalWorkMinutes: calculation.totalWorkMinutes,
      regularMinutes: calculation.regularMinutes,
      overtimeMinutes: calculation.overtimeMinutes,
      basePayment: calculation.basePayment,
      overtimePayment: calculation.overtimePayment,
      allowances: 0,
      deductions: 0,
      totalPayment: calculation.totalPayment,
      status: "draft",
      notes: "",
      isManuallyAdjusted: false,
    };

    const payrollId = await createPayrollRecord(payrollData);
    payrollIds.push(payrollId);
  }

  return payrollIds;
}
