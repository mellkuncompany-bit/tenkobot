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
import { Announcement, CreateAnnouncement } from "@/lib/types/firestore";

/**
 * Get active announcements for an organization
 */
export async function getActiveAnnouncements(organizationId: string): Promise<Announcement[]> {
  const q = query(
    collection(db, COLLECTIONS.ANNOUNCEMENTS),
    where("organizationId", "==", organizationId),
    where("isActive", "==", true)
  );

  const snapshot = await getDocs(q);
  const announcements = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Announcement[];

  const now = new Date();

  // Filter for active announcements (published and not expired)
  const activeAnnouncements = announcements.filter((announcement) => {
    const publishDate = announcement.publishDate.toDate();
    const isPublished = publishDate <= now;
    const isNotExpired = !announcement.expiryDate || announcement.expiryDate.toDate() > now;
    return isPublished && isNotExpired;
  });

  // Sort by priority (high > medium > low) then by publishDate (newest first)
  return activeAnnouncements.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;

    const aTime = a.publishDate?.toMillis?.() || 0;
    const bTime = b.publishDate?.toMillis?.() || 0;
    return bTime - aTime;
  });
}

/**
 * Get all announcements for an organization (including inactive)
 */
export async function getAllAnnouncements(organizationId: string): Promise<Announcement[]> {
  const q = query(
    collection(db, COLLECTIONS.ANNOUNCEMENTS),
    where("organizationId", "==", organizationId)
  );

  const snapshot = await getDocs(q);
  const announcements = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Announcement[];

  // Sort by publishDate descending
  return announcements.sort((a, b) => {
    const aTime = a.publishDate?.toMillis?.() || 0;
    const bTime = b.publishDate?.toMillis?.() || 0;
    return bTime - aTime;
  });
}

/**
 * Get a single announcement by ID
 */
export async function getAnnouncement(announcementId: string): Promise<Announcement | null> {
  const docRef = doc(db, COLLECTIONS.ANNOUNCEMENTS, announcementId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as Announcement;
}

/**
 * Create a new announcement
 */
export async function createAnnouncement(
  data: Omit<CreateAnnouncement, "createdAt" | "updatedAt">
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTIONS.ANNOUNCEMENTS), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Update an announcement
 */
export async function updateAnnouncement(
  announcementId: string,
  data: Partial<Omit<Announcement, "id" | "createdAt" | "updatedAt">>
): Promise<void> {
  const docRef = doc(db, COLLECTIONS.ANNOUNCEMENTS, announcementId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete an announcement (soft delete)
 */
export async function deleteAnnouncement(announcementId: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.ANNOUNCEMENTS, announcementId);
  await updateDoc(docRef, {
    isActive: false,
    updatedAt: serverTimestamp(),
  });
}
