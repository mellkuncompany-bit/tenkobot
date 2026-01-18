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
import { Staff, CreateStaff, StaffRole } from "@/lib/types/firestore";

/**
 * Get all staffs for an organization
 */
export async function getStaffs(organizationId: string): Promise<Staff[]> {
  const q = query(
    collection(db, COLLECTIONS.STAFFS),
    where("organizationId", "==", organizationId),
    where("isActive", "==", true),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Staff[];
}

/**
 * Get a single staff by ID
 */
export async function getStaff(staffId: string): Promise<Staff | null> {
  const docRef = doc(db, COLLECTIONS.STAFFS, staffId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as Staff;
}

/**
 * Create a new staff
 */
export async function createStaff(data: Omit<CreateStaff, "createdAt" | "updatedAt">): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTIONS.STAFFS), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Update a staff
 */
export async function updateStaff(
  staffId: string,
  data: Partial<Omit<Staff, "id" | "createdAt" | "updatedAt">>
): Promise<void> {
  const docRef = doc(db, COLLECTIONS.STAFFS, staffId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a staff (soft delete)
 */
export async function deleteStaff(staffId: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.STAFFS, staffId);
  await updateDoc(docRef, {
    isActive: false,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Get staff role display name
 */
export function getStaffRoleDisplay(role: StaffRole): string {
  const roleMap: Record<StaffRole, string> = {
    general: "一般",
    leader: "リーダー",
    assistant: "管理補助",
  };
  return roleMap[role];
}
