"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/hooks/use-auth";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { AttendanceRecord } from "@/lib/types/firestore";
import { formatDateTimeDisplay } from "@/lib/utils/date";

export default function AttendancePage() {
  const { admin } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!admin) return;
    const fetch = async () => {
      try {
        const q = query(
          collection(db, COLLECTIONS.ATTENDANCE_RECORDS),
          where("organizationId", "==", admin.organizationId),
          orderBy("date", "desc")
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as AttendanceRecord[];
        setRecords(data.slice(0, 100)); // 最新100件
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
          <h1 className="text-3xl font-bold">勤怠管理</h1>
          <p className="text-gray-600 mt-1">出勤記録の確認</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>勤怠記録 ({records.length}件)</CardTitle>
          </CardHeader>
          <CardContent>
            {records.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">勤怠記録がありません</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>日付</TableHead>
                    <TableHead>スタッフID</TableHead>
                    <TableHead>出勤時刻</TableHead>
                    <TableHead>退勤時刻</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>エスカレーション</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{record.date}</TableCell>
                      <TableCell className="font-mono text-xs">{record.staffId.slice(0, 8)}...</TableCell>
                      <TableCell>
                        {record.clockInTime
                          ? formatDateTimeDisplay(record.clockInTime.toDate())
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {record.clockOutTime
                          ? formatDateTimeDisplay(record.clockOutTime.toDate())
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            record.status === "present"
                              ? "success"
                              : record.status === "absent"
                              ? "destructive"
                              : "warning"
                          }
                        >
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            record.escalationStatus === "resolved"
                              ? "success"
                              : record.escalationStatus === "escalating"
                              ? "warning"
                              : record.escalationStatus === "failed"
                              ? "destructive"
                              : "outline"
                          }
                        >
                          {record.escalationStatus}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
