import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { Organization } from "@/lib/types/firestore";

/**
 * Get organization by ID
 */
export async function getOrganization(organizationId: string): Promise<Organization | null> {
  const docRef = doc(db, COLLECTIONS.ORGANIZATIONS, organizationId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as Organization;
}

/**
 * Update LINE configuration for an organization
 */
export async function updateLINEConfig(
  organizationId: string,
  config: {
    channelAccessToken: string;
    channelSecret: string;
    webhookUrl: string;
  }
): Promise<void> {
  const docRef = doc(db, COLLECTIONS.ORGANIZATIONS, organizationId);
  await updateDoc(docRef, {
    lineConfig: {
      channelAccessToken: config.channelAccessToken,
      channelSecret: config.channelSecret,
      webhookUrl: config.webhookUrl,
      isConfigured: true,
      configuredAt: serverTimestamp(),
    },
    updatedAt: serverTimestamp(),
  });
}

/**
 * Get LINE configuration for an organization
 */
export async function getLINEConfig(organizationId: string): Promise<Organization["lineConfig"] | null> {
  const org = await getOrganization(organizationId);
  return org?.lineConfig || null;
}

/**
 * Remove LINE configuration for an organization
 */
export async function removeLINEConfig(organizationId: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.ORGANIZATIONS, organizationId);
  await updateDoc(docRef, {
    lineConfig: null,
    updatedAt: serverTimestamp(),
  });
}
