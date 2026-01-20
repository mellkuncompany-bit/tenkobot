"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/lib/hooks/use-auth";
import { createShift } from "@/lib/services/shift-service";
import { getStaffs, getStaffsByRole } from "@/lib/services/staff-service";
import { getWorkTemplates, getWorkTemplate } from "@/lib/services/work-template-service";
import { getEscalationPolicies } from "@/lib/services/escalation-policy-service";
import {
  createStaffDriverAssignment,
  createUnassignedDriverAssignment,
  createFreetextDriverAssignment,
  getDriverDisplayName,
} from "@/lib/services/driver-assignment-service";
import { Staff, DriverAssignmentType, WorkTemplate } from "@/lib/types/firestore";
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

  // Driver assignment state
  const [selectedWorkTemplate, setSelectedWorkTemplate] = useState<WorkTemplate | null>(null);
  const [overrideDriverAssignment, setOverrideDriverAssignment] = useState(false);
  const [driverAssignmentType, setDriverAssignmentType] =
    useState<DriverAssignmentType>("unassigned");
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [freetextDriverName, setFreetextDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [drivers, setDrivers] = useState<Staff[]>([]);

  useEffect(() => {
    if (!admin) return;
    const fetch = async () => {
      const [s, t, p, d] = await Promise.all([
        getStaffs(admin.organizationId),
        getWorkTemplates(admin.organizationId),
        getEscalationPolicies(admin.organizationId),
        getStaffsByRole(admin.organizationId, "driver"),
      ]);
      setStaffs(s);
      setTemplates(t);
      setPolicies(p);
      setDrivers(d);
      if (p.length > 0) {
        setFormData((prev) => ({ ...prev, escalationPolicyId: p[0].id }));
      }
      if (t.length > 0) {
        setFormData((prev) => ({ ...prev, workTemplateId: t[0].id }));
        // Load default driver assignment from first template
        const firstTemplate = t[0];
        setSelectedWorkTemplate(firstTemplate);
        if (firstTemplate.defaultDriverAssignment) {
          const da = firstTemplate.defaultDriverAssignment;
          setDriverAssignmentType(da.type);
          if (da.type === "staff" && da.staffId) {
            setSelectedDriverId(da.staffId);
          }
          if (da.type === "freetext" && da.freetextName) {
            setFreetextDriverName(da.freetextName);
          }
          if (da.contactPhone) {
            setDriverPhone(da.contactPhone);
          }
        }
      }
    };
    fetch();
  }, [admin]);

  // Load template when workTemplateId changes
  useEffect(() => {
    if (!formData.workTemplateId) return;
    getWorkTemplate(formData.workTemplateId).then((template) => {
      if (template) {
        setSelectedWorkTemplate(template);
        // Reset driver assignment if not overriding
        if (!overrideDriverAssignment && template.defaultDriverAssignment) {
          const da = template.defaultDriverAssignment;
          setDriverAssignmentType(da.type);
          if (da.type === "staff" && da.staffId) {
            setSelectedDriverId(da.staffId);
          } else {
            setSelectedDriverId("");
          }
          if (da.type === "freetext" && da.freetextName) {
            setFreetextDriverName(da.freetextName);
          } else {
            setFreetextDriverName("");
          }
          if (da.contactPhone) {
            setDriverPhone(da.contactPhone);
          } else {
            setDriverPhone("");
          }
        }
      }
    });
  }, [formData.workTemplateId, overrideDriverAssignment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admin) return;
    setLoading(true);
    try {
      // Build driver assignment
      let driverAssignment = null;
      if (overrideDriverAssignment) {
        // Use custom driver assignment
        if (driverAssignmentType === "staff") {
          if (selectedDriverId) {
            driverAssignment = createStaffDriverAssignment(
              selectedDriverId,
              driverPhone || undefined
            );
          }
        } else if (driverAssignmentType === "freetext") {
          if (freetextDriverName) {
            driverAssignment = createFreetextDriverAssignment(
              freetextDriverName,
              driverPhone || undefined
            );
          }
        } else {
          driverAssignment = createUnassignedDriverAssignment();
        }
      } else {
        // Use template's default driver assignment
        driverAssignment = selectedWorkTemplate?.defaultDriverAssignment || null;
      }

      await createShift({
        organizationId: admin.organizationId,
        ...formData,
        driverAssignment,
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

              {/* Driver Assignment */}
              <div className="space-y-4 pt-4 border-t">
                <div>
                  <Label className="text-base font-semibold">担当ドライバー</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedWorkTemplate?.defaultDriverAssignment
                      ? `テンプレートのデフォルト: ${getDriverDisplayName(
                          selectedWorkTemplate.defaultDriverAssignment,
                          drivers
                        )}`
                      : "テンプレートにデフォルトが設定されていません"}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="overrideDriverAssignment"
                    checked={overrideDriverAssignment}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setOverrideDriverAssignment(checked);
                      if (!checked) {
                        // Reset to template default
                        const da = selectedWorkTemplate?.defaultDriverAssignment;
                        if (da) {
                          setDriverAssignmentType(da.type);
                          if (da.type === "staff" && da.staffId) {
                            setSelectedDriverId(da.staffId);
                          } else {
                            setSelectedDriverId("");
                          }
                          if (da.type === "freetext" && da.freetextName) {
                            setFreetextDriverName(da.freetextName);
                          } else {
                            setFreetextDriverName("");
                          }
                          if (da.contactPhone) {
                            setDriverPhone(da.contactPhone);
                          } else {
                            setDriverPhone("");
                          }
                        }
                      }
                    }}
                    disabled={loading}
                  />
                  <Label htmlFor="overrideDriverAssignment" className="cursor-pointer">
                    テンプレートのデフォルトを上書き
                  </Label>
                </div>

                {overrideDriverAssignment && (
                  <div className="space-y-4 pl-6">
                    <RadioGroup
                      value={driverAssignmentType}
                      onValueChange={(value) =>
                        setDriverAssignmentType(value as DriverAssignmentType)
                      }
                      disabled={loading}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="staff" id="driver-staff" />
                        <Label htmlFor="driver-staff" className="cursor-pointer">
                          スタッフから選択
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="unassigned" id="driver-unassigned" />
                        <Label htmlFor="driver-unassigned" className="cursor-pointer">
                          未定
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="freetext" id="driver-freetext" />
                        <Label htmlFor="driver-freetext" className="cursor-pointer">
                          自由記入
                        </Label>
                      </div>
                    </RadioGroup>

                    {driverAssignmentType === "staff" && (
                      <div className="space-y-2">
                        <Label htmlFor="driverId">ドライバー選択</Label>
                        <Select
                          id="driverId"
                          value={selectedDriverId}
                          onChange={(e) => setSelectedDriverId(e.target.value)}
                          disabled={loading}
                        >
                          <option value="">ドライバーを選択してください</option>
                          {drivers.map((driver) => (
                            <option key={driver.id} value={driver.id}>
                              {driver.name}
                            </option>
                          ))}
                        </Select>
                      </div>
                    )}

                    {driverAssignmentType === "freetext" && (
                      <div className="space-y-2">
                        <Label htmlFor="freetextName">担当者名</Label>
                        <Input
                          id="freetextName"
                          placeholder="担当者名を入力"
                          value={freetextDriverName}
                          onChange={(e) => setFreetextDriverName(e.target.value)}
                          disabled={loading}
                        />
                      </div>
                    )}

                    {(driverAssignmentType === "staff" ||
                      driverAssignmentType === "freetext") && (
                      <div className="space-y-2">
                        <Label htmlFor="driverPhone">連絡先電話番号（任意）</Label>
                        <Input
                          id="driverPhone"
                          type="tel"
                          placeholder="090-1234-5678"
                          value={driverPhone}
                          onChange={(e) => setDriverPhone(e.target.value)}
                          disabled={loading}
                        />
                        <p className="text-xs text-gray-500">
                          将来の自動架電機能で使用されます
                        </p>
                      </div>
                    )}
                  </div>
                )}
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
