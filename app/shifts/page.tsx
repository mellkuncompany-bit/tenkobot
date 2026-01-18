"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/hooks/use-auth";
import { getShifts } from "@/lib/services/shift-service";
import { Shift } from "@/lib/types/firestore";
import { Plus, Pencil, Calendar } from "lucide-react";
import { formatDateDisplay } from "@/lib/utils/date";

export default function ShiftsPage() {
  const { admin } = useAuth();
  const router = useRouter();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!admin) return;
    const fetch = async () => {
      try {
        const data = await getShifts(admin.organizationId);
        setShifts(data.slice(0, 50)); // 最新50件
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">シフト管理</h1>
            <p className="text-gray-600 mt-1">シフトの作成・編集</p>
          </div>
          <Button onClick={() => router.push("/shifts/new")}>
            <Plus className="h-4 w-4 mr-2" />
            新規作成
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>シフト一覧 ({shifts.length}件)</CardTitle>
          </CardHeader>
          <CardContent>
            {shifts.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">シフトが登録されていません</p>
                <Button onClick={() => router.push("/shifts/new")}>
                  <Plus className="h-4 w-4 mr-2" />
                  最初のシフトを作成
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>日付</TableHead>
                    <TableHead>時間</TableHead>
                    <TableHead>担当者</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shifts.map((shift) => (
                    <TableRow key={shift.id}>
                      <TableCell className="font-medium">{shift.date}</TableCell>
                      <TableCell>
                        {shift.startTime} 〜 {shift.endTime || "未定"}
                      </TableCell>
                      <TableCell>{shift.staffIds.length}名</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            shift.status === "completed"
                              ? "success"
                              : shift.status === "active"
                              ? "info"
                              : "outline"
                          }
                        >
                          {shift.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/shifts/${shift.id}`)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
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
