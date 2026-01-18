"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/hooks/use-auth";
import { createEscalationPolicy } from "@/lib/services/escalation-policy-service";
import { EscalationStage } from "@/lib/types/firestore";
import { ArrowLeft } from "lucide-react";

export default function NewEscalationPolicyPage() {
  const { admin } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    isDefault: false,
    maxRetries: 3,
    stages: [
      { stageNumber: 1 as 1, waitMinutes: 5, notificationMethod: "line" as const, targetType: "self" as const, designatedStaffIds: [], stopOnResponse: true },
      { stageNumber: 2 as 2, waitMinutes: 10, notificationMethod: "sms" as const, targetType: "designated" as const, designatedStaffIds: [], stopOnResponse: true },
      { stageNumber: 3 as 3, waitMinutes: 15, notificationMethod: "call" as const, targetType: "next_shift" as const, designatedStaffIds: [], stopOnResponse: false },
    ] as EscalationStage[],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admin) return;
    setLoading(true);
    try {
      await createEscalationPolicy({
        organizationId: admin.organizationId,
        ...formData,
        activeTimeRange: null,
        isActive: true,
      });
      router.push("/escalation-policies");
    } catch (error) {
      alert("登録に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <Button variant="ghost" onClick={() => router.push("/escalation-policies")} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            戻る
          </Button>
          <h1 className="text-3xl font-bold">エスカレーション設定 新規作成</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>基本設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">設定名 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isDefault"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                />
                <Label htmlFor="isDefault">デフォルト設定にする</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxRetries">最大リトライ回数</Label>
                <Input
                  id="maxRetries"
                  type="number"
                  value={formData.maxRetries}
                  onChange={(e) => setFormData({ ...formData, maxRetries: Number(e.target.value) })}
                />
              </div>
            </CardContent>
          </Card>

          {formData.stages.map((stage, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle>段階 {stage.stageNumber}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>待機時間（分）</Label>
                  <Input
                    type="number"
                    value={stage.waitMinutes}
                    onChange={(e) => {
                      const newStages = [...formData.stages];
                      newStages[index].waitMinutes = Number(e.target.value);
                      setFormData({ ...formData, stages: newStages });
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label>通知手段</Label>
                  <Select
                    value={stage.notificationMethod}
                    onChange={(e) => {
                      const newStages = [...formData.stages];
                      newStages[index].notificationMethod = e.target.value as any;
                      setFormData({ ...formData, stages: newStages });
                    }}
                  >
                    <option value="line">LINE</option>
                    <option value="sms">SMS</option>
                    <option value="call">架電</option>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>通知対象</Label>
                  <Select
                    value={stage.targetType}
                    onChange={(e) => {
                      const newStages = [...formData.stages];
                      newStages[index].targetType = e.target.value as any;
                      setFormData({ ...formData, stages: newStages });
                    }}
                  >
                    <option value="self">本人</option>
                    <option value="designated">指定従業員</option>
                    <option value="next_shift">次担当</option>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={stage.stopOnResponse}
                    onChange={(e) => {
                      const newStages = [...formData.stages];
                      newStages[index].stopOnResponse = e.target.checked;
                      setFormData({ ...formData, stages: newStages });
                    }}
                  />
                  <Label>反応時に停止</Label>
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="flex space-x-4">
            <Button type="submit" disabled={loading}>
              {loading ? "作成中..." : "作成"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push("/escalation-policies")}>
              キャンセル
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
