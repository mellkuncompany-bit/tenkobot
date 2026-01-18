"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/hooks/use-auth";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { NotificationLog } from "@/lib/types/firestore";
import { formatDateTimeDisplay } from "@/lib/utils/date";

export default function LogsPage() {
  const { admin } = useAuth();
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!admin) return;
    const fetch = async () => {
      try {
        const q = query(
          collection(db, COLLECTIONS.NOTIFICATIONS_LOG),
          where("organizationId", "==", admin.organizationId),
          orderBy("createdAt", "desc"),
          limit(100)
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as NotificationLog[];
        setLogs(data);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [admin]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">読み込み中...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">通知ログ</h1>
          <p className="text-gray-600 mt-1">送信された通知の履歴</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>ログ一覧 ({logs.length}件)</CardTitle>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">ログがありません</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>送信日時</TableHead>
                      <TableHead>種別</TableHead>
                      <TableHead>段階</TableHead>
                      <TableHead>送信先</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead>メッセージ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs">
                          {log.sentAt ? formatDateTimeDisplay(log.sentAt.toDate()) : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              log.type === "line"
                                ? "info"
                                : log.type === "sms"
                                ? "warning"
                                : "destructive"
                            }
                          >
                            {log.type.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {log.stage === 0 ? "初回" : `段階${log.stage}`}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {log.recipient.slice(0, 12)}...
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              log.status === "responded"
                                ? "success"
                                : log.status === "failed"
                                ? "destructive"
                                : log.status === "sent"
                                ? "info"
                                : "outline"
                            }
                          >
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-xs">
                          {log.message}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
