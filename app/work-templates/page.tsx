"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/lib/hooks/use-auth";
import { getWorkTemplates, deleteWorkTemplate } from "@/lib/services/work-template-service";
import { WorkTemplate } from "@/lib/types/firestore";
import { Plus, Pencil, Trash2 } from "lucide-react";

export default function WorkTemplatesPage() {
  const { admin } = useAuth();
  const router = useRouter();
  const [templates, setTemplates] = useState<WorkTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!admin) return;
    const fetchTemplates = async () => {
      try {
        const data = await getWorkTemplates(admin.organizationId);
        setTemplates(data);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTemplates();
  }, [admin]);

  const handleDelete = async (id: string) => {
    if (!confirm("削除してもよろしいですか？")) return;
    try {
      await deleteWorkTemplate(id);
      setTemplates(templates.filter((t) => t.id !== id));
    } catch (error) {
      alert("削除に失敗しました");
    }
  };

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
            <h1 className="text-3xl font-bold">作業マスタ</h1>
            <p className="text-gray-600 mt-1">作業内容テンプレートの管理</p>
          </div>
          <Button onClick={() => router.push("/work-templates/new")}>
            <Plus className="h-4 w-4 mr-2" />
            新規登録
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>作業マスタ一覧 ({templates.length}件)</CardTitle>
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
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell className="max-w-md truncate">{template.description}</TableCell>
                      <TableCell>{template.estimatedDuration}分</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => router.push(`/work-templates/${template.id}`)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(template.id)}>
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
