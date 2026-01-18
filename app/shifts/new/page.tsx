"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/hooks/use-auth";
import { createShift } from "@/lib/services/shift-service";
import { getStaffs } from "@/lib/services/staff-service";
import { getWorkTemplates } from "@/lib/services/work-template-service";
import { getEscalationPolicies } from "@/lib/services/escalation-policy-service";
import { ArrowLeft } from "lucide-react";

export default function NewShiftPage() {
  const { admin } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [staffs, setStaffs] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    date: "",
    startTime: "09:00",
    endTime: "18:00",
    staffIds: [] as string[],
    workTemplateId: "",
    escalationPolicyId: "",
  });

  useEffect(() => {
    if (!admin) return;
    const fetch = async () => {
      const [s, t, p] = await Promise.all([
        getStaffs(admin.organizationId),
        getWorkTemplates(admin.organizationId),
        getEscalationPolicies(admin.organizationId),
      ]);
      setStaffs(s);
      setTemplates(t);
      setPolicies(p);
      if (p.length > 0) {
        setFormData((prev) => ({ ...prev, escalationPolicyId: p[0].id }));
      }
      if (t.length > 0) {
        setFormData((prev) => ({ ...prev, workTemplateId: t[0].id }));
      }
    };
    fetch();
  }, [admin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admin) return;
    setLoading(true);
    try {
      await createShift({
        organizationId: admin.organizationId,
        ...formData,
        status: "scheduled",
      });
      router.push("/shifts");
    } catch (error) {
      alert("作成に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <Button variant="ghost" onClick={() => router.push("/shifts")} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            戻る
          </Button>
          <h1 className="text-3xl font-bold">シフト新規作成</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>基本情報</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="date">日付 *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">開始時刻 *</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">終了時刻</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="staffIds">担当者 *</Label>
                <Select
                  id="staffIds"
                  value={formData.staffIds[0] || ""}
                  onChange={(e) => setFormData({ ...formData, staffIds: [e.target.value] })}
                  required
                >
                  <option value="">選択してください</option>
                  {staffs.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name}
                    </option>
                  ))}
                </Select>
                <p className="text-xs text-gray-500">※簡略版のため1名のみ選択可能</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="workTemplateId">作業内容 *</Label>
                <Select
                  id="workTemplateId"
                  value={formData.workTemplateId}
                  onChange={(e) => setFormData({ ...formData, workTemplateId: e.target.value })}
                  required
                >
                  <option value="">選択してください</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="escalationPolicyId">エスカレーション設定 *</Label>
                <Select
                  id="escalationPolicyId"
                  value={formData.escalationPolicyId}
                  onChange={(e) => setFormData({ ...formData, escalationPolicyId: e.target.value })}
                  required
                >
                  <option value="">選択してください</option>
                  {policies.map((policy) => (
                    <option key={policy.id} value={policy.id}>
                      {policy.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex space-x-4 pt-4">
                <Button type="submit" disabled={loading}>
                  {loading ? "作成中..." : "作成"}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.push("/shifts")}>
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
