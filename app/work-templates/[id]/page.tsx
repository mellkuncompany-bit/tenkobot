"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getWorkTemplate, updateWorkTemplate } from "@/lib/services/work-template-service";
import { ArrowLeft } from "lucide-react";

export default function EditWorkTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    notes: "",
    reportCheckTime: "",
  });

  useEffect(() => {
    const fetch = async () => {
      const data = await getWorkTemplate(params.id as string);
      if (data) {
        setFormData({
          name: data.name,
          description: data.description,
          notes: data.notes,
          reportCheckTime: data.reportCheckTime || "",
        });
      }
      setLoading(false);
    };
    fetch();
  }, [params.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateWorkTemplate(params.id as string, formData);
      router.push("/work-templates");
    } catch (error) {
      alert("更新に失敗しました");
    } finally {
      setSaving(false);
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
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <Button variant="ghost" onClick={() => router.push("/work-templates")} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            戻る
          </Button>
          <h1 className="text-3xl font-bold">作業マスタ編集</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>基本情報</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">作業名 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">説明</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">注意事項</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reportCheckTime">作業報告確認時刻</Label>
                <Input
                  id="reportCheckTime"
                  type="time"
                  value={formData.reportCheckTime}
                  onChange={(e) => setFormData({ ...formData, reportCheckTime: e.target.value })}
                />
                <p className="text-xs text-gray-500">
                  この時刻に作業報告を確認します。未報告の場合はエスカレーション処理が実行されます
                </p>
              </div>

              <div className="flex space-x-4 pt-4">
                <Button type="submit" disabled={saving}>
                  {saving ? "更新中..." : "更新"}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.push("/work-templates")}>
                  キャンセル
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
