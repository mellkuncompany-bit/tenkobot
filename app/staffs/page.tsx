"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/hooks/use-auth";
import { getStaffs, deleteStaff, getStaffRoleDisplay } from "@/lib/services/staff-service";
import { Staff } from "@/lib/types/firestore";
import { Plus, Pencil, Trash2 } from "lucide-react";

export default function StaffsPage() {
  const { admin } = useAuth();
  const router = useRouter();
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!admin) return;

    const fetchStaffs = async () => {
      try {
        const data = await getStaffs(admin.organizationId);
        setStaffs(data);
      } catch (error) {
        console.error("Error fetching staffs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStaffs();
  }, [admin]);

  const handleDelete = async (staffId: string) => {
    if (!confirm("このスタッフを削除してもよろしいですか？")) return;

    setDeleting(staffId);
    try {
      await deleteStaff(staffId);
      setStaffs(staffs.filter((s) => s.id !== staffId));
    } catch (error) {
      console.error("Error deleting staff:", error);
      alert("削除に失敗しました");
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">スタッフ管理</h1>
            <p className="text-gray-600 mt-1">スタッフの登録・編集・削除を行えます</p>
          </div>
          <Button onClick={() => router.push("/staffs/new")}>
            <Plus className="h-4 w-4 mr-2" />
            新規登録
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>スタッフ一覧 ({staffs.length}名)</CardTitle>
          </CardHeader>
          <CardContent>
            {staffs.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">スタッフが登録されていません</p>
                <Button onClick={() => router.push("/staffs/new")}>
                  <Plus className="h-4 w-4 mr-2" />
                  最初のスタッフを登録
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>氏名</TableHead>
                    <TableHead>役割</TableHead>
                    <TableHead>電話番号</TableHead>
                    <TableHead>LINE連携</TableHead>
                    <TableHead>エスカレーション対象</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffs.map((staff) => (
                    <TableRow key={staff.id}>
                      <TableCell className="font-medium">{staff.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {getStaffRoleDisplay(staff.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>{staff.phoneNumber}</TableCell>
                      <TableCell>
                        {staff.lineUserId ? (
                          <Badge variant="success">連携済</Badge>
                        ) : (
                          <Badge variant="warning">未連携</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {staff.isEscalationTarget ? (
                          <Badge variant="info">対象</Badge>
                        ) : (
                          <Badge variant="outline">対象外</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/staffs/${staff.id}`)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(staff.id)}
                            disabled={deleting === staff.id}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
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
