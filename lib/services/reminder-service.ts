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
import { Reminder, CreateReminder } from "@/lib/types/firestore";

/**
 * Get all reminders for an organization
 */
export async function getReminders(organizationId: string): Promise<Reminder[]> {
  const q = query(
    collection(db, COLLECTIONS.REMINDERS),
    where("organizationId", "==", organizationId),
    orderBy("dueDate", "asc")
  );

  const snapshot = await getDocs(q);
  const reminders = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Reminder[];

  return reminders;
}

/**
 * Get upcoming reminders (within 7 days)
 */
export async function getUpcomingReminders(organizationId: string): Promise<Reminder[]> {
  const today = new Date().toISOString().split('T')[0];
  const oneWeekLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const q = query(
    collection(db, COLLECTIONS.REMINDERS),
    where("organizationId", "==", organizationId),
    where("isCompleted", "==", false),
    where("dueDate", ">=", today),
    where("dueDate", "<=", oneWeekLater),
    orderBy("dueDate", "asc")
  );

  const snapshot = await getDocs(q);
  const reminders = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Reminder[];

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
