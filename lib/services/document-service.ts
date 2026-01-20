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
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { Document, CreateDocument, DocumentCategory } from "@/lib/types/firestore";

/**
 * Get documents for an organization with optional category filter
 */
export async function getDocuments(
  organizationId: string,
  category?: DocumentCategory
): Promise<Document[]> {
  let q = query(
    collection(db, COLLECTIONS.DOCUMENTS),
    where("organizationId", "==", organizationId),
    where("isActive", "==", true)
  );

  if (category) {
    q = query(q, where("category", "==", category));
  }

  const snapshot = await getDocs(q);
  const documents = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Document[];

  // Sort by createdAt descending
  return documents.sort((a, b) => {
    const aTime = a.createdAt?.toMillis?.() || 0;
    const bTime = b.createdAt?.toMillis?.() || 0;
    return bTime - aTime;
  });
}

/**
 * Get a single document by ID
 */
export async function getDocument(documentId: string): Promise<Document | null> {
  const docRef = doc(db, COLLECTIONS.DOCUMENTS, documentId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as Document;
}

/**
 * Create a new document
 */
export async function createDocument(
  data: Omit<CreateDocument, "createdAt" | "updatedAt">
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTIONS.DOCUMENTS), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Update a document
 */
export async function updateDocument(
  documentId: string,
  data: Partial<Omit<Document, "id" | "createdAt" | "updatedAt">>
): Promise<void> {
  const docRef = doc(db, COLLECTIONS.DOCUMENTS, documentId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a document (soft delete)
 */
export async function deleteDocument(documentId: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.DOCUMENTS, documentId);
  await updateDoc(docRef, {
    isActive: false,
    updatedAt: serverTimestamp(),
  });
}
