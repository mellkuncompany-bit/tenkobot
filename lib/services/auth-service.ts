import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  UserCredential,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { CreateOrganization, CreateAdmin } from "@/lib/types/firestore";
import { PLANS } from "@/lib/utils/plans";

export interface RegisterData {
  email: string;
  password: string;
  displayName: string;
  organizationName: string;
}

/**
 * Register new organization and admin user
 */
export async function registerOrganization(data: RegisterData): Promise<UserCredential> {
  try {
    // 1. Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      data.email,
      data.password
    );

    const userId = userCredential.user.uid;
    const now = Timestamp.now();

    // 2. Create organization with trial plan
    const trialPlan = PLANS.trial;
    const organizationData: CreateOrganization = {
      name: data.organizationName,
      ownerEmail: data.email,
      plan: "trial",
      subscriptionStatus: "trial",
      subscriptionExpiresAt: Timestamp.fromDate(
        new Date(Date.now() + trialPlan.duration * 24 * 60 * 60 * 1000)
      ),
      limits: trialPlan.limits,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      lineConfig: null,
    };

    const organizationRef = doc(db, COLLECTIONS.ORGANIZATIONS, userId);
    await setDoc(organizationRef, {
      ...organizationData,
      createdAt: now,
      updatedAt: now,
    });

    // 3. Create admin user
    const adminData: CreateAdmin = {
      email: data.email,
      displayName: data.displayName,
      organizationId: userId,
      role: "owner",
    };

    const adminRef = doc(db, COLLECTIONS.ADMINS, userId);
    await setDoc(adminRef, {
      ...adminData,
      createdAt: now,
      updatedAt: now,
    });

    return userCredential;
  } catch (error: any) {
    console.error("Registration error:", error);
    throw new Error(error.message || "登録に失敗しました");
  }
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string): Promise<UserCredential> {
  try {
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (error: any) {
    console.error("Sign in error:", error);

    // Firebase error codes to Japanese
    const errorMessages: Record<string, string> = {
      "auth/user-not-found": "ユーザーが見つかりません",
      "auth/wrong-password": "パスワードが間違っています",
      "auth/invalid-email": "メールアドレスの形式が正しくありません",
      "auth/user-disabled": "このアカウントは無効化されています",
      "auth/too-many-requests": "ログイン試行回数が多すぎます。しばらく待ってから再度お試しください",
      "auth/invalid-credential": "メールアドレスまたはパスワードが間違っています",
    };

    throw new Error(errorMessages[error.code] || "ログインに失敗しました");
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordReset(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    console.error("Password reset error:", error);
    throw new Error("パスワードリセットメールの送信に失敗しました");
  }
}
