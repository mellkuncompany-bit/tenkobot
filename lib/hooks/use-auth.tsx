"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";
import { Admin } from "@/lib/types/firestore";
import { doc, getDoc } from "firebase/firestore";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { Timestamp } from "firebase/firestore";

interface AuthContextType {
  user: User | null;
  admin: Admin | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  admin: null,
  loading: true,
  signOut: async () => {},
});

// デモモード用のモックデータ
const DEMO_USER = {
  uid: "demo-user-id",
  email: "demo@example.com",
  displayName: "デモ管理者",
} as User;

const DEMO_ADMIN: Admin = {
  id: "demo-admin-id",
  email: "demo@example.com",
  displayName: "デモ管理者",
  organizationId: "demo-organization-id",
  role: "owner",
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  useEffect(() => {
    // デモモードの場合は即座にモックデータを設定
    if (isDemoMode) {
      setUser(DEMO_USER);
      setAdmin(DEMO_ADMIN);
      setLoading(false);
      return;
    }

    // 通常モード: Firebaseの認証状態を監視
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // Fetch admin data from Firestore
        try {
          const adminRef = doc(db, COLLECTIONS.ADMINS, firebaseUser.uid);
          const adminSnap = await getDoc(adminRef);

          if (adminSnap.exists()) {
            setAdmin({ id: adminSnap.id, ...adminSnap.data() } as Admin);
          } else {
            setAdmin(null);
          }
        } catch (error) {
          console.error("Error fetching admin data:", error);
          setAdmin(null);
        }
      } else {
        setAdmin(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [isDemoMode]);

  const signOut = async () => {
    if (isDemoMode) {
      // デモモードではログアウトしない（常にログイン状態を維持）
      return;
    }
    await firebaseSignOut(auth);
    setUser(null);
    setAdmin(null);
  };

  return (
    <AuthContext.Provider value={{ user, admin, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
