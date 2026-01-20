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
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { Vehicle, CreateVehicle } from "@/lib/types/firestore";

/**
 * Get all vehicles for an organization
 */
export async function getVehicles(organizationId: string): Promise<Vehicle[]> {
  const q = query(
    collection(db, COLLECTIONS.VEHICLES),
    where("organizationId", "==", organizationId),
    where("isActive", "==", true)
  );

  const snapshot = await getDocs(q);
  const vehicles = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Vehicle[];

  // Sort by createdAt on the client side
  return vehicles.sort((a, b) => {
    const aTime = a.createdAt?.toMillis?.() || 0;
    const bTime = b.createdAt?.toMillis?.() || 0;
    return bTime - aTime; // desc order
  });
}

/**
 * Get a single vehicle by ID
 */
export async function getVehicle(vehicleId: string): Promise<Vehicle | null> {
  const docRef = doc(db, COLLECTIONS.VEHICLES, vehicleId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as Vehicle;
}

/**
 * Create a new vehicle
 */
export async function createVehicle(data: Omit<CreateVehicle, "createdAt" | "updatedAt">): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTIONS.VEHICLES), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Update a vehicle
 */
export async function updateVehicle(
  vehicleId: string,
  data: Partial<Omit<Vehicle, "id" | "createdAt" | "updatedAt">>
): Promise<void> {
  const docRef = doc(db, COLLECTIONS.VEHICLES, vehicleId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a vehicle (soft delete)
 */
export async function deleteVehicle(vehicleId: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.VEHICLES, vehicleId);
  await updateDoc(docRef, {
    isActive: false,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Get vehicles with inspection date expiring within specified days
 */
export async function getVehiclesWithExpiringInspection(
  organizationId: string,
  withinDays: number
): Promise<Vehicle[]> {
  const q = query(
    collection(db, COLLECTIONS.VEHICLES),
    where("organizationId", "==", organizationId),
    where("isActive", "==", true),
    where("inspectionNotificationEnabled", "==", true)
  );

  const snapshot = await getDocs(q);
  const vehicles = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Vehicle[];

  // Filter vehicles with inspection date within specified days
  const now = new Date();
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + withinDays);

  return vehicles.filter((vehicle) => {
    if (!vehicle.inspectionDate) return false;
    const inspectionDate = vehicle.inspectionDate.toDate();
    return inspectionDate >= now && inspectionDate <= targetDate;
  }).sort((a, b) => {
    const aTime = a.inspectionDate?.toMillis?.() || 0;
    const bTime = b.inspectionDate?.toMillis?.() || 0;
    return aTime - bTime; // asc order (earliest first)
  });
}
