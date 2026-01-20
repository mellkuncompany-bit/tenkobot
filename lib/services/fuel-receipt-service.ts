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
import { FuelReceipt, CreateFuelReceipt } from "@/lib/types/firestore";

export interface FuelReceiptFilters {
  vehicleId?: string;
  staffId?: string;
  startDate?: string;
  endDate?: string;
  isVerified?: boolean;
}

/**
 * Get fuel receipts for an organization with optional filters
 */
export async function getFuelReceipts(
  organizationId: string,
  filters?: FuelReceiptFilters
): Promise<FuelReceipt[]> {
  let q = query(
    collection(db, COLLECTIONS.FUEL_RECEIPTS),
    where("organizationId", "==", organizationId)
  );

  if (filters?.vehicleId) {
    q = query(q, where("vehicleId", "==", filters.vehicleId));
  }

  if (filters?.staffId) {
    q = query(q, where("staffId", "==", filters.staffId));
  }

  if (filters?.isVerified !== undefined) {
    q = query(q, where("isVerified", "==", filters.isVerified));
  }

  const snapshot = await getDocs(q);
  let receipts = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as FuelReceipt[];

  // Client-side filtering for date range
  if (filters?.startDate) {
    receipts = receipts.filter((r) => r.date >= filters.startDate!);
  }
  if (filters?.endDate) {
    receipts = receipts.filter((r) => r.date <= filters.endDate!);
  }

  // Sort by date descending
  return receipts.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Get fuel receipts for a specific vehicle
 */
export async function getFuelReceiptsByVehicle(vehicleId: string): Promise<FuelReceipt[]> {
  const q = query(
    collection(db, COLLECTIONS.FUEL_RECEIPTS),
    where("vehicleId", "==", vehicleId)
  );

  const snapshot = await getDocs(q);
  const receipts = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as FuelReceipt[];

  return receipts.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Get a single fuel receipt by ID
 */
export async function getFuelReceipt(receiptId: string): Promise<FuelReceipt | null> {
  const docRef = doc(db, COLLECTIONS.FUEL_RECEIPTS, receiptId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as FuelReceipt;
}

/**
 * Create a new fuel receipt
 */
export async function createFuelReceipt(
  data: Omit<CreateFuelReceipt, "createdAt" | "updatedAt">
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTIONS.FUEL_RECEIPTS), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Update a fuel receipt
 */
export async function updateFuelReceipt(
  receiptId: string,
  data: Partial<Omit<FuelReceipt, "id" | "createdAt" | "updatedAt">>
): Promise<void> {
  const docRef = doc(db, COLLECTIONS.FUEL_RECEIPTS, receiptId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Calculate fuel efficiency for a vehicle
 */
export async function calculateFuelEfficiency(
  vehicleId: string,
  startDate: string,
  endDate: string
): Promise<{
  averageFuelEfficiency: number;
  totalLiters: number;
  totalDistance: number;
  totalCost: number;
}> {
  const q = query(
    collection(db, COLLECTIONS.FUEL_RECEIPTS),
    where("vehicleId", "==", vehicleId),
    where("isVerified", "==", true)
  );

  const snapshot = await getDocs(q);
  const receipts = snapshot.docs
    .map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as FuelReceipt[];

  // Filter by date range
  const filteredReceipts = receipts.filter(
    (r) => r.date >= startDate && r.date <= endDate && r.odometerReading !== null
  );

  if (filteredReceipts.length < 2) {
    return {
      averageFuelEfficiency: 0,
      totalLiters: 0,
      totalDistance: 0,
      totalCost: 0,
    };
  }

  // Sort by date
  filteredReceipts.sort((a, b) => a.date.localeCompare(b.date));

  const totalLiters = filteredReceipts.reduce((sum, r) => sum + r.liters, 0);
  const totalCost = filteredReceipts.reduce((sum, r) => sum + r.amount, 0);
  const firstReading = filteredReceipts[0].odometerReading || 0;
  const lastReading = filteredReceipts[filteredReceipts.length - 1].odometerReading || 0;
  const totalDistance = lastReading - firstReading;

  const averageFuelEfficiency = totalDistance > 0 ? totalDistance / totalLiters : 0;

  return {
    averageFuelEfficiency,
    totalLiters,
    totalDistance,
    totalCost,
  };
}

/**
 * Generate monthly fuel report
 */
export async function generateFuelReport(organizationId: string, month: string) {
  const year = month.substring(0, 4);
  const monthNum = month.substring(5, 7);
  const startDate = `${year}-${monthNum}-01`;
  const endDate = `${year}-${monthNum}-31`;

  const receipts = await getFuelReceipts(organizationId, {
    startDate,
    endDate,
    isVerified: true,
  });

  const totalCost = receipts.reduce((sum, r) => sum + r.amount, 0);
  const totalLiters = receipts.reduce((sum, r) => sum + r.liters, 0);

  // Group by vehicle
  const byVehicle = receipts.reduce((acc, r) => {
    if (!acc[r.vehicleId]) {
      acc[r.vehicleId] = {
        receipts: [],
        totalCost: 0,
        totalLiters: 0,
      };
    }
    acc[r.vehicleId].receipts.push(r);
    acc[r.vehicleId].totalCost += r.amount;
    acc[r.vehicleId].totalLiters += r.liters;
    return acc;
  }, {} as Record<string, { receipts: FuelReceipt[]; totalCost: number; totalLiters: number }>);

  return {
    month,
    totalCost,
    totalLiters,
    receiptCount: receipts.length,
    byVehicle,
  };
}
