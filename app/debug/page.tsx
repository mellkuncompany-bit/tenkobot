"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase/client";
import { collection, getDocs } from "firebase/firestore";

export default function DebugPage() {
  const [status, setStatus] = useState<any>({});

  useEffect(() => {
    async function checkFirebase() {
      const result: any = {
        timestamp: new Date().toISOString(),
        env: {
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? "設定済み" : "未設定",
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "未設定",
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "未設定",
          demoMode: process.env.NEXT_PUBLIC_DEMO_MODE || "false",
        },
        auth: {
          initialized: !!auth,
          currentUser: auth?.currentUser?.email || "未ログイン",
        },
        firestore: {
          initialized: !!db,
          testConnection: "テスト中...",
        },
      };

      // Firestore接続テスト
      try {
        const testCollection = collection(db, "organizations");
        const snapshot = await getDocs(testCollection);
        result.firestore.testConnection = `成功 (${snapshot.size}件のドキュメント)`;
        result.firestore.documentsCount = snapshot.size;
        result.firestore.error = null;

        // List document IDs if any exist
        if (snapshot.size > 0) {
          result.firestore.documentIds = snapshot.docs.map(doc => doc.id);
        }
      } catch (error: any) {
        result.firestore.testConnection = "失敗";
        result.firestore.error = error.message;
        result.firestore.errorCode = error.code;
      }

      // Check admins collection
      try {
        const adminsCollection = collection(db, "admins");
        const adminsSnapshot = await getDocs(adminsCollection);
        result.adminsCollection = {
          count: adminsSnapshot.size,
          documentIds: adminsSnapshot.docs.map(doc => doc.id)
        };
      } catch (error: any) {
        result.adminsCollection = {
          error: error.message,
          errorCode: error.code
        };
      }

      setStatus(result);
    }

    checkFirebase();
  }, []);

  return (
    <div style={{ padding: "20px", fontFamily: "monospace" }}>
      <h1>Firebase 接続診断</h1>
      <pre style={{ background: "#f5f5f5", padding: "20px", overflow: "auto" }}>
        {JSON.stringify(status, null, 2)}
      </pre>
    </div>
  );
}
