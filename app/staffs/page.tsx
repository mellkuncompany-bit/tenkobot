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
import { getWorkTemplates, deleteWorkTemplate } from "@/lib/services/work-template-service";
import {
  getDriverDisplayName,
  getDriverAssignmentBadgeVariant,
} from "@/lib/services/driver-assignment-service";
import { Staff, WorkTemplate } from "@/lib/types/firestore";
import { Plus, Pencil, Trash2 } from "lucide-react";

export default function StaffsPage() {
  const { admin } = useAuth();
  const router = useRouter();
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [templates, setTemplates] = useState<WorkTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!admin) return;

    const fetchData = async () => {
      try {
        const [staffsData, templatesData] = await Promise.all([
          getStaffs(admin.organizationId),
          getWorkTemplates(admin.organizationId),
        ]);
        setStaffs(staffsData);
        setTemplates(templatesData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [admin]);

  const handleDeleteStaff = async (staffId: string) => {
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

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm("この作業マスタを削除してもよろしいですか？")) return;

    try {
      await deleteWorkTemplate(templateId);
      setTemplates(templates.filter((t) => t.id !== templateId));
    } catch (error) {
      console.error("Error deleting template:", error);
      alert("削除に失敗しました");
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
      <div className="space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">スタッフ・作業管理</h1>
          <p className="text-gray-600 mt-1">スタッフと作業マスタの登録・編集・削除を行えます</p>
        </div>

        {/* Staff Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>スタッフ一覧 ({staffs.length}名)</CardTitle>
              <Button onClick={() => router.push("/staffs/new")}>
                <Plus className="h-4 w-4 mr-2" />
                スタッフを追加
              </Button>
            </div>
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
                    <TableHead>点呼確認対象</TableHead>
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
                            onClick={() => handleDeleteStaff(staff.id)}
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

        {/* Work Templates Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>作業マスタ一覧 ({templates.length}件)</CardTitle>
              <Button onClick={() => router.push("/work-templates/new")}>
                <Plus className="h-4 w-4 mr-2" />
                作業マスタを追加
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {templates.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">作業マスタが登録されていません</p>
                <Button onClick={() => router.push("/work-templates/new")}>
                  <Plus className="h-4 w-4 mr-2" />
                  最初の作業マスタを登録
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>作業名</TableHead>
                    <TableHead>説明</TableHead>
                    <TableHead>所要時間</TableHead>
                    <TableHead>単価</TableHead>
                    <TableHead>デフォルト担当者</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell className="max-w-md truncate">{template.description}</TableCell>
                      <TableCell>{template.estimatedDuration}分</TableCell>
                      <TableCell>¥{template.unitPrice?.toLocaleString() || 0}</TableCell>
                      <TableCell>
                        <Badge variant={getDriverAssignmentBadgeVariant(template.defaultDriverAssignment)}>
                          {getDriverDisplayName(template.defaultDriverAssignment, staffs)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/work-templates/${template.id}`)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTemplate(template.id)}
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
