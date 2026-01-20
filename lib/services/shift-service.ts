import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { Shift, CreateShift, Staff, WorkTemplate, RecurringSchedule } from "@/lib/types/firestore";
import { getStaffs } from "./staff-service";
import { getWorkTemplates } from "./work-template-service";

export async function getShifts(organizationId: string, month?: string): Promise<Shift[]> {
  const q = month
    ? query(
        collection(db, COLLECTIONS.SHIFTS),
        where("organizationId", "==", organizationId),
        where("date", ">=", `${month}-01`),
        where("date", "<=", `${month}-31`),
        orderBy("date", "asc")
      )
    : query(
        collection(db, COLLECTIONS.SHIFTS),
        where("organizationId", "==", organizationId),
        orderBy("date", "desc")
      );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Shift[];
}

export async function getShift(shiftId: string): Promise<Shift | null> {
  const docRef = doc(db, COLLECTIONS.SHIFTS, shiftId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Shift;
}

export async function createShift(data: Omit<CreateShift, "createdAt" | "updatedAt">): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTIONS.SHIFTS), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateShift(
  shiftId: string,
  data: Partial<Omit<Shift, "id" | "createdAt" | "updatedAt">>
): Promise<void> {
  const docRef = doc(db, COLLECTIONS.SHIFTS, shiftId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Get today's shifts for an organization
 */
export async function getTodayShifts(organizationId: string): Promise<Shift[]> {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  const q = query(
    collection(db, COLLECTIONS.SHIFTS),
    where("organizationId", "==", organizationId),
    where("date", "==", today)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Shift[];
}

/**
 * Get shifts by date range
 */
export async function getShiftsByDateRange(
  organizationId: string,
  startDate: string,
  endDate: string
): Promise<Shift[]> {
  const q = query(
    collection(db, COLLECTIONS.SHIFTS),
    where("organizationId", "==", organizationId),
    where("date", ">=", startDate),
    where("date", "<=", endDate),
    orderBy("date", "asc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Shift[];
}

/**
 * Get unassigned shifts (driver not assigned)
 */
export async function getUnassignedShifts(
  organizationId: string,
  startDate?: string,
  endDate?: string
): Promise<Shift[]> {
  // Build query with date range if provided
  let q;

  if (startDate && endDate) {
    q = query(
      collection(db, COLLECTIONS.SHIFTS),
      where("organizationId", "==", organizationId),
      where("date", ">=", startDate),
      where("date", "<=", endDate),
      orderBy("date", "asc")
    );
  } else {
    q = query(
      collection(db, COLLECTIONS.SHIFTS),
      where("organizationId", "==", organizationId),
      orderBy("date", "asc")
    );
  }

  const snapshot = await getDocs(q);
  const shifts = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Shift[];

  // Filter for unassigned drivers on the client side
  // (driverAssignment is null OR driverAssignment.type === "unassigned")
  return shifts.filter((shift) => {
    if (!shift.driverAssignment) return true;
    return shift.driverAssignment.type === "unassigned";
  });
}

/**
 * Helper function to check if a date should be included based on recurring schedule
 */
function shouldIncludeDate(
  date: Date,
  schedule: RecurringSchedule,
  holidays: Set<string>
): boolean {
  const dateStr = date.toISOString().split("T")[0];

  // Check if date is within range
  if (schedule.startDate && dateStr < schedule.startDate) return false;
  if (schedule.endDate && dateStr > schedule.endDate) return false;

  // Check if day of week matches
  const dayOfWeek = date.getDay(); // 0=Sunday, 1=Monday...6=Saturday
  if (!schedule.daysOfWeek.includes(dayOfWeek)) return false;

  // Check if we should exclude holidays
  if (schedule.excludeHolidays && holidays.has(dateStr)) return false;

  return true;
}

/**
 * Generate shifts automatically from recurring schedules
 * This will look at both Staff and WorkTemplate recurring schedules
 */
export async function generateRecurringShifts(
  organizationId: string,
  startDate: string, // YYYY-MM-DD
  endDate: string,   // YYYY-MM-DD
  options?: {
    dryRun?: boolean; // If true, return what would be created without actually creating
  }
): Promise<{
  created: number;
  skipped: number;
  details: Array<{ date: string; staffId: string; workTemplateId: string; reason?: string }>;
}> {
  const results = {
    created: 0,
    skipped: 0,
    details: [] as Array<{ date: string; staffId: string; workTemplateId: string; reason?: string }>,
  };

  // Get all staff and work templates
  const [staffs, workTemplates, existingShifts] = await Promise.all([
    getStaffs(organizationId),
    getWorkTemplates(organizationId),
    getShiftsByDateRange(organizationId, startDate, endDate),
  ]);

  // Simple holiday check (in production, use a proper holiday API)
  const holidays = new Set<string>(); // TODO: Implement holiday detection

  // Parse date range
  const start = new Date(startDate);
  const end = new Date(endDate);
  const dates: Date[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(new Date(d));
  }

  // Generate shifts for staff with recurring schedules
  for (const staff of staffs) {
    if (!staff.recurringSchedule || staff.assignedWorkTemplateIds.length === 0) continue;

    for (const date of dates) {
      if (!shouldIncludeDate(date, staff.recurringSchedule, holidays)) continue;

      const dateStr = date.toISOString().split("T")[0];

      // For each assigned work template
      for (const workTemplateId of staff.assignedWorkTemplateIds) {
        const workTemplate = workTemplates.find((t) => t.id === workTemplateId);
        if (!workTemplate) continue;

        // Check if shift already exists for this date, staff, and work template
        const exists = existingShifts.some(
          (s) =>
            s.date === dateStr &&
            s.staffIds.includes(staff.id) &&
            s.workTemplateId === workTemplateId
        );

        if (exists) {
          results.skipped++;
          results.details.push({
            date: dateStr,
            staffId: staff.id,
            workTemplateId,
            reason: "Shift already exists",
          });
          continue;
        }

        // Create the shift
        if (!options?.dryRun) {
          await createShift({
            organizationId,
            date: dateStr,
            staffIds: [staff.id],
            startTime: "09:00", // Default time, can be customized
            endTime: "17:00",   // Default time, can be customized
            workTemplateId,
            escalationPolicyId: workTemplate.escalationPolicyId || "",
            status: "scheduled",
            driverAssignment: workTemplate.defaultDriverAssignment || null,
          });
        }

        results.created++;
        results.details.push({
          date: dateStr,
          staffId: staff.id,
          workTemplateId,
        });
      }
    }
  }

  // Also generate shifts for work templates with recurring schedules (and no specific staff)
  for (const workTemplate of workTemplates) {
    if (!workTemplate.recurringSchedule) continue;

    for (const date of dates) {
      if (!shouldIncludeDate(date, workTemplate.recurringSchedule, holidays)) continue;

      const dateStr = date.toISOString().split("T")[0];

      // Check if a shift already exists for this date and work template
      const exists = existingShifts.some(
        (s) => s.date === dateStr && s.workTemplateId === workTemplate.id
      );

      if (exists) {
        results.skipped++;
        results.details.push({
          date: dateStr,
          staffId: "",
          workTemplateId: workTemplate.id,
          reason: "Shift already exists",
        });
        continue;
      }

      // Create shift with unassigned staff
      if (!options?.dryRun) {
        await createShift({
          organizationId,
          date: dateStr,
          staffIds: [], // No staff assigned yet
          startTime: "09:00", // Default time
          endTime: "17:00",   // Default time
          workTemplateId: workTemplate.id,
          escalationPolicyId: workTemplate.escalationPolicyId || "",
          status: "scheduled",
          driverAssignment: workTemplate.defaultDriverAssignment || null,
        });
      }

      results.created++;
      results.details.push({
        date: dateStr,
        staffId: "",
        workTemplateId: workTemplate.id,
      });
    }
  }

  return results;
}
