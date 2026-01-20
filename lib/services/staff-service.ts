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
    where("isActive", "==", true)
  );

  const snapshot = await getDocs(q);
  const staffs = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Staff[];

  // Sort by createdAt on the client side to avoid needing a composite index
  return staffs.sort((a, b) => {
    const aTime = a.createdAt?.toMillis?.() || 0;
    const bTime = b.createdAt?.toMillis?.() || 0;
    return bTime - aTime; // desc order
  });
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
    driver: "ドライバー",
    manager: "管理者",
    owner: "経営者",
  };
  return roleMap[role];
}

/**
 * Get staffs by role
 */
export async function getStaffsByRole(
  organizationId: string,
  role: StaffRole
): Promise<Staff[]> {
  const q = query(
    collection(db, COLLECTIONS.STAFFS),
    where("organizationId", "==", organizationId),
    where("isActive", "==", true),
    where("role", "==", role)
  );

  const snapshot = await getDocs(q);
  const staffs = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Staff[];

  return staffs.sort((a, b) => {
    const aTime = a.createdAt?.toMillis?.() || 0;
    const bTime = b.createdAt?.toMillis?.() || 0;
    return bTime - aTime;
  });
}

/**
 * Get drivers with license expiring within specified days
 */
export async function getDriversWithExpiringLicense(
  organizationId: string,
  withinDays: number
): Promise<Staff[]> {
  const q = query(
    collection(db, COLLECTIONS.STAFFS),
    where("organizationId", "==", organizationId),
    where("isActive", "==", true),
    where("licenseNotificationEnabled", "==", true)
  );

  const snapshot = await getDocs(q);
  const staffs = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Staff[];

  // Filter staffs with license expiring within specified days
  const now = new Date();
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + withinDays);

  return staffs
    .filter((staff) => {
      if (!staff.licenseExpiryDate) return false;
      const licenseDate = staff.licenseExpiryDate.toDate();
      return licenseDate >= now && licenseDate <= targetDate;
    })
    .sort((a, b) => {
      const aTime = a.licenseExpiryDate?.toMillis?.() || 0;
      const bTime = b.licenseExpiryDate?.toMillis?.() || 0;
      return aTime - bTime; // asc order (earliest first)
    });
}
