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
