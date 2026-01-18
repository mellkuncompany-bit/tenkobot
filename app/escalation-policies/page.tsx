"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/hooks/use-auth";
import { getEscalationPolicies, deleteEscalationPolicy } from "@/lib/services/escalation-policy-service";
import { EscalationPolicy } from "@/lib/types/firestore";
import { Plus, Pencil, Trash2, Star } from "lucide-react";

export default function EscalationPoliciesPage() {
  const { admin } = useAuth();
  const router = useRouter();
  const [policies, setPolicies] = useState<EscalationPolicy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!admin) return;
    const fetch = async () => {
      try {
        const data = await getEscalationPolicies(admin.organizationId);
        setPolicies(data);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [admin]);

  const handleDelete = async (id: string) => {
    if (!confirm("削除してもよろしいですか？")) return;
    try {
      await deleteEscalationPolicy(id);
      setPolicies(policies.filter((p) => p.id !== id));
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
            <h1 className="text-3xl font-bold">エスカレーション設定</h1>
            <p className="text-gray-600 mt-1">段階的なエスカレーションルールの管理</p>
          </div>
          <Button onClick={() => router.push("/escalation-policies/new")}>
            <Plus className="h-4 w-4 mr-2" />
            新規作成
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>設定一覧 ({policies.length}件)</CardTitle>
          </CardHeader>
          <CardContent>
            {policies.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">エスカレーション設定が登録されていません</p>
                <Button onClick={() => router.push("/escalation-policies/new")}>
                  <Plus className="h-4 w-4 mr-2" />
                  最初の設定を作成
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>設定名</TableHead>
                    <TableHead>段階数</TableHead>
                    <TableHead>デフォルト</TableHead>
                    <TableHead>最大リトライ</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {policies.map((policy) => (
                    <TableRow key={policy.id}>
                      <TableCell className="font-medium">
                        {policy.isDefault && <Star className="inline h-4 w-4 mr-1 text-yellow-500" />}
                        {policy.name}
                      </TableCell>
                      <TableCell>{policy.stages.length}段階</TableCell>
                      <TableCell>
                        {policy.isDefault ? (
                          <Badge variant="info">デフォルト</Badge>
                        ) : (
                          <Badge variant="outline">-</Badge>
                        )}
                      </TableCell>
                      <TableCell>{policy.maxRetries}回</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => router.push(`/escalation-policies/${policy.id}`)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(policy.id)}>
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
