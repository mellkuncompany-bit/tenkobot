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
import { Shift, CreateShift } from "@/lib/types/firestore";

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
