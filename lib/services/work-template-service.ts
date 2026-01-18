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
import { WorkTemplate, CreateWorkTemplate } from "@/lib/types/firestore";

/**
 * Get all work templates for an organization
 */
export async function getWorkTemplates(organizationId: string): Promise<WorkTemplate[]> {
  const q = query(
    collection(db, COLLECTIONS.WORK_TEMPLATES),
    where("organizationId", "==", organizationId),
    where("isActive", "==", true),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as WorkTemplate[];
}

/**
 * Get a single work template by ID
 */
export async function getWorkTemplate(templateId: string): Promise<WorkTemplate | null> {
  const docRef = doc(db, COLLECTIONS.WORK_TEMPLATES, templateId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as WorkTemplate;
}

/**
 * Create a new work template
 */
export async function createWorkTemplate(
  data: Omit<CreateWorkTemplate, "createdAt" | "updatedAt">
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTIONS.WORK_TEMPLATES), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Update a work template
 */
export async function updateWorkTemplate(
  templateId: string,
  data: Partial<Omit<WorkTemplate, "id" | "createdAt" | "updatedAt">>
): Promise<void> {
  const docRef = doc(db, COLLECTIONS.WORK_TEMPLATES, templateId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a work template (soft delete)
 */
export async function deleteWorkTemplate(templateId: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.WORK_TEMPLATES, templateId);
  await updateDoc(docRef, {
    isActive: false,
    updatedAt: serverTimestamp(),
  });
}
