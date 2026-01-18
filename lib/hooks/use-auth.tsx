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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Firebaseの認証状態を監視
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
            console.log("Admin document does not exist yet for user:", firebaseUser.uid);
            setAdmin(null);
          }
        } catch (error: any) {
          console.error("Error fetching admin data:", error);
          console.error("Error code:", error.code);
          console.error("Error message:", error.message);

          // If the error is due to the document not existing yet (during registration),
          // don't treat it as a critical error
          if (error.code === 'unavailable' || error.message?.includes('offline')) {
            console.log("Firestore temporarily unavailable, will retry on next auth state change");
          }
          setAdmin(null);
        }
      } else {
        setAdmin(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      // Firebase認証からログアウト
      await firebaseSignOut(auth);
      setUser(null);
      setAdmin(null);

      // ローカルストレージとセッションストレージをクリア
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }
    } catch (error) {
      console.error("Sign out error:", error);
      // エラーが発生してもstateはクリア
      setUser(null);
      setAdmin(null);
    }
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
