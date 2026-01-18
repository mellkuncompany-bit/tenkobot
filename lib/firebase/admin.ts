import * as admin from "firebase-admin";

// Only initialize if environment variables are present
const hasFirebaseConfig =
  process.env.FIREBASE_ADMIN_PROJECT_ID &&
  process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
  process.env.FIREBASE_ADMIN_PRIVATE_KEY;

if (!admin.apps.length && hasFirebaseConfig) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  } catch (error) {
    console.error("Firebase admin initialization error", error);
  }
}

// Export functions that check if admin is initialized
export const adminDb = hasFirebaseConfig ? admin.firestore() : (null as any);
export const adminAuth = hasFirebaseConfig ? admin.auth() : (null as any);

export default admin;
