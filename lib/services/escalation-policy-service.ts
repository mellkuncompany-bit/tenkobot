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
import { EscalationPolicy, CreateEscalationPolicy } from "@/lib/types/firestore";

export async function getEscalationPolicies(organizationId: string): Promise<EscalationPolicy[]> {
  const q = query(
    collection(db, COLLECTIONS.ESCALATION_POLICIES),
    where("organizationId", "==", organizationId),
    where("isActive", "==", true),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as EscalationPolicy[];
}

export async function getEscalationPolicy(policyId: string): Promise<EscalationPolicy | null> {
  const docRef = doc(db, COLLECTIONS.ESCALATION_POLICIES, policyId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as EscalationPolicy;
}

export async function createEscalationPolicy(
  data: Omit<CreateEscalationPolicy, "createdAt" | "updatedAt">
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTIONS.ESCALATION_POLICIES), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function updateEscalationPolicy(
  policyId: string,
  data: Partial<Omit<EscalationPolicy, "id" | "createdAt" | "updatedAt">>
): Promise<void> {
  const docRef = doc(db, COLLECTIONS.ESCALATION_POLICIES, policyId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteEscalationPolicy(policyId: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.ESCALATION_POLICIES, policyId);
  await updateDoc(docRef, {
    isActive: false,
    updatedAt: serverTimestamp(),
  });
}
