import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { Reminder, CreateReminder, RecurringPattern } from "@/lib/types/firestore";

/**
 * Get all reminders for an organization
 */
export async function getReminders(organizationId: string): Promise<Reminder[]> {
  const q = query(
    collection(db, COLLECTIONS.REMINDERS),
    where("organizationId", "==", organizationId),
    orderBy("eventDate", "asc")
  );

  const snapshot = await getDocs(q);
  const reminders = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Reminder[];

  return reminders;
}

/**
 * Get upcoming reminders (within 7 days) - shows reminders where notification date is today or later and event hasn't passed
 */
export async function getUpcomingReminders(organizationId: string): Promise<Reminder[]> {
  const today = new Date().toISOString().split('T')[0];

  const q = query(
    collection(db, COLLECTIONS.REMINDERS),
    where("organizationId", "==", organizationId),
    where("isCompleted", "==", false),
    where("eventDate", ">=", today),
    orderBy("eventDate", "asc")
  );

  const snapshot = await getDocs(q);
  let reminders = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Reminder[];

  // Filter reminders where notification date is within 7 days from today
  const todayTime = new Date(today).getTime();
  const oneWeekLater = todayTime + 7 * 24 * 60 * 60 * 1000;

  reminders = reminders.filter((reminder) => {
    const eventTime = new Date(reminder.eventDate).getTime();
    const notificationTime = eventTime - (reminder.notificationDaysBefore * 24 * 60 * 60 * 1000);

    // Show if notification date is today or within the next 7 days, and event hasn't passed
    return notificationTime <= oneWeekLater && eventTime >= todayTime;
  });

  return reminders;
}

/**
 * Get a single reminder by ID
 */
export async function getReminder(reminderId: string): Promise<Reminder | null> {
  const docRef = doc(db, COLLECTIONS.REMINDERS, reminderId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as Reminder;
}

/**
 * Create a new reminder
 */
export async function createReminder(data: Omit<CreateReminder, "createdAt" | "updatedAt">): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTIONS.REMINDERS), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Update a reminder
 */
export async function updateReminder(
  reminderId: string,
  data: Partial<Omit<Reminder, "id" | "createdAt" | "updatedAt">>
): Promise<void> {
  const docRef = doc(db, COLLECTIONS.REMINDERS, reminderId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Mark a reminder as completed
 */
export async function completeReminder(reminderId: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.REMINDERS, reminderId);
  await updateDoc(docRef, {
    isCompleted: true,
    completedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a reminder
 */
export async function deleteReminder(reminderId: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.REMINDERS, reminderId);
  await deleteDoc(docRef);
}

/**
 * Calculate next event date based on recurring pattern
 */
export function calculateNextEventDate(
  currentDate: string,
  pattern: RecurringPattern
): string | null {
  const current = new Date(currentDate);
  let next = new Date(current);

  switch (pattern.frequency) {
    case "daily":
      next.setDate(next.getDate() + pattern.interval);
      break;

    case "weekly":
      next.setDate(next.getDate() + pattern.interval * 7);
      // If specific days of week are set, find the next matching day
      if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
        const sortedDays = [...pattern.daysOfWeek].sort((a, b) => a - b);
        const currentDay = next.getDay();
        let nextDay = sortedDays.find(d => d > currentDay);

        if (!nextDay) {
          // Wrap to next week
          nextDay = sortedDays[0];
          const daysToAdd = (7 - currentDay + nextDay) + (pattern.interval - 1) * 7;
          next.setDate(next.getDate() + daysToAdd);
        } else {
          next.setDate(next.getDate() + (nextDay - currentDay));
        }
      }
      break;

    case "monthly":
      next.setMonth(next.getMonth() + pattern.interval);

      // Handle day of month
      if (pattern.dayOfMonth !== undefined) {
        if (pattern.dayOfMonth === -1) {
          // Last day of month
          next.setMonth(next.getMonth() + 1);
          next.setDate(0);
        } else {
          next.setDate(Math.min(pattern.dayOfMonth, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()));
        }
      }
      break;

    case "yearly":
      next.setFullYear(next.getFullYear() + pattern.interval);
      break;

    case "custom":
      // Custom frequency uses interval as days
      next.setDate(next.getDate() + pattern.interval);
      break;

    default:
      return null;
  }

  // Check end conditions
  if (pattern.endType === "date" && pattern.endDate) {
    const endDate = new Date(pattern.endDate);
    if (next > endDate) {
      return null;
    }
  }

  return next.toISOString().split("T")[0];
}

/**
 * Mark a reminder as completed and generate next occurrence if recurring
 */
export async function completeReminderWithRecurring(reminderId: string): Promise<string | null> {
  const reminder = await getReminder(reminderId);
  if (!reminder) {
    throw new Error("Reminder not found");
  }

  // Mark current reminder as completed
  await completeReminder(reminderId);

  // If recurring, generate next occurrence
  if (reminder.isRecurring && reminder.recurringPattern) {
    const nextEventDate = calculateNextEventDate(
      reminder.eventDate,
      reminder.recurringPattern
    );

    if (nextEventDate) {
      // Check count limit
      if (reminder.recurringPattern.endType === "count" && reminder.recurringPattern.endCount) {
        // Count how many times this has been generated
        const parentId = reminder.parentReminderId || reminder.id;
        const q = query(
          collection(db, COLLECTIONS.REMINDERS),
          where("parentReminderId", "==", parentId)
        );
        const snapshot = await getDocs(q);
        const occurrenceCount = snapshot.size + 1; // +1 for the original

        if (occurrenceCount >= reminder.recurringPattern.endCount) {
          return null; // Reached count limit
        }
      }

      // Create next occurrence
      const nextReminder: Omit<CreateReminder, "createdAt" | "updatedAt"> = {
        organizationId: reminder.organizationId,
        title: reminder.title,
        description: reminder.description,
        eventDate: nextEventDate,
        notificationDaysBefore: reminder.notificationDaysBefore,
        notificationTimings: reminder.notificationTimings,
        isRecurring: true,
        recurringPattern: reminder.recurringPattern,
        parentReminderId: reminder.parentReminderId || reminder.id,
        isCompleted: false,
        completedAt: null,
      };

      const nextId = await createReminder(nextReminder);
      return nextId;
    }
  }

  return null;
}

/**
 * Get upcoming reminders with support for multiple notification timings
 */
export async function getUpcomingRemindersWithTimings(organizationId: string): Promise<Reminder[]> {
  const today = new Date().toISOString().split('T')[0];

  const q = query(
    collection(db, COLLECTIONS.REMINDERS),
    where("organizationId", "==", organizationId),
    where("isCompleted", "==", false),
    where("eventDate", ">=", today),
    orderBy("eventDate", "asc")
  );

  const snapshot = await getDocs(q);
  let reminders = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Reminder[];

  const todayTime = new Date(today).getTime();
  const oneWeekLater = todayTime + 7 * 24 * 60 * 60 * 1000;

  reminders = reminders.filter((reminder) => {
    const eventTime = new Date(reminder.eventDate).getTime();

    // Check if any notification timing is within the next 7 days
    if (reminder.notificationTimings && reminder.notificationTimings.length > 0) {
      return reminder.notificationTimings.some((timing) => {
        const notificationTime = eventTime - (timing.daysBefore * 24 * 60 * 60 * 1000);
        return notificationTime <= oneWeekLater && eventTime >= todayTime;
      });
    } else {
      // Fallback to old notificationDaysBefore for backward compatibility
      const notificationTime = eventTime - (reminder.notificationDaysBefore * 24 * 60 * 60 * 1000);
      return notificationTime <= oneWeekLater && eventTime >= todayTime;
    }
  });

  return reminders;
}
