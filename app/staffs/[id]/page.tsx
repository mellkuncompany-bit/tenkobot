"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/lib/hooks/use-auth";
import { getStaff, updateStaff, getStaffs } from "@/lib/services/staff-service";
import { getWorkTemplates } from "@/lib/services/work-template-service";
import { StaffRole, PaymentType, WorkTemplate, Staff } from "@/lib/types/firestore";
import { ArrowLeft } from "lucide-react";
import { Timestamp } from "firebase/firestore";

export default function EditStaffPage() {
  const { admin } = useAuth();
  const router = useRouter();
  const params = useParams();
  const staffId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [staff, setStaff] = useState<Staff | null>(null);
  const [workTemplates, setWorkTemplates] = useState<WorkTemplate[]>([]);
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    role: "driver" as StaffRole,
    phoneNumber: "",
    lineUserId: "",
    isEscalationTarget: false,

    // License management
    licenseExpiryDate: "",
    licenseNotificationEnabled: true,
    escalationGraceMinutes: 5,

    // Escalation staff and notification methods
    escalation1stStaffId: "",
    escalation1stMethod: "sms" as "sms" | "call",
    escalation2ndStaffId: "",
    escalation2ndMethod: "sms" as "sms" | "call",
    escalation3rdStaffId: "",
    escalation3rdMethod: "call" as "sms" | "call",

    // Assigned work templates
    workAssignmentType: "unassigned" as "template" | "freetext" | "unassigned",
    assignedWorkTemplateIds: [] as string[],
    assignedWorkFreetext: "",

    // Payment settings
    paymentType: "hourly" as PaymentType,
    hourlyRate: "",
    dailyRate: "",
    monthlyRate: "",
    overtimeRate: "",

    // Recurring schedule
    useRecurringSchedule: false,
    daysOfWeek: [] as number[],
    excludeHolidays: false,
    startDate: "",
    endDate: "",

    // Work hours
    defaultStartTime: "09:00",
    defaultEndTime: "17:00",
  });

  useEffect(() => {
    if (!admin) return;

    const fetchData = async () => {
      try {
        const [staffData, templates, staffList] = await Promise.all([
          getStaff(staffId),
          getWorkTemplates(admin.organizationId),
          getStaffs(admin.organizationId),
        ]);

        if (!staffData) {
          setError("スタッフが見つかりません");
          setLoading(false);
          return;
        }

        setStaff(staffData);
        setWorkTemplates(templates);
        setStaffs(staffList.filter(s => s.id !== staffId)); // Exclude current staff from escalation options

        // Populate form data from existing staff
        let workAssignmentType: "template" | "freetext" | "unassigned" = "unassigned";
        if (staffData.assignedWorkTemplateIds && staffData.assignedWorkTemplateIds.length > 0) {
          workAssignmentType = "template";
        } else if (staffData.assignedWorkFreetext) {
          workAssignmentType = "freetext";
        }

        setFormData({
          name: staffData.name,
          role: staffData.role,
          phoneNumber: staffData.phoneNumber,
          lineUserId: staffData.lineUserId || "",
          isEscalationTarget: staffData.isEscalationTarget,

          licenseExpiryDate: staffData.licenseExpiryDate
            ? new Date(staffData.licenseExpiryDate.toMillis()).toISOString().split('T')[0]
            : "",
          licenseNotificationEnabled: staffData.licenseNotificationEnabled ?? true,
          escalationGraceMinutes: staffData.escalationGraceMinutes ?? 30,

          escalation1stStaffId: staffData.escalation1stStaffId || "",
          escalation1stMethod: staffData.escalation1stMethod || "sms",
          escalation2ndStaffId: staffData.escalation2ndStaffId || "",
          escalation2ndMethod: staffData.escalation2ndMethod || "sms",
          escalation3rdStaffId: staffData.escalation3rdStaffId || "",
          escalation3rdMethod: staffData.escalation3rdMethod || "call",

          workAssignmentType,
          assignedWorkTemplateIds: staffData.assignedWorkTemplateIds || [],
          assignedWorkFreetext: staffData.assignedWorkFreetext || "",

          paymentType: staffData.paymentType,
          hourlyRate: staffData.hourlyRate?.toString() || "",
          dailyRate: staffData.dailyRate?.toString() || "",
          monthlyRate: staffData.monthlyRate?.toString() || "",
          overtimeRate: staffData.overtimeRate?.toString() || "",

          useRecurringSchedule: !!staffData.recurringSchedule,
          daysOfWeek: staffData.recurringSchedule?.daysOfWeek || [],
          excludeHolidays: staffData.recurringSchedule?.excludeHolidays || false,
          startDate: staffData.recurringSchedule?.startDate || "",
          endDate: staffData.recurringSchedule?.endDate || "",

          defaultStartTime: staffData.defaultStartTime || "09:00",
          defaultEndTime: staffData.defaultEndTime || "17:00",
        });

        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("データの取得に失敗しました");
        setLoading(false);
      }
    };

    fetchData();
  }, [admin, staffId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleWorkTemplateToggle = (templateId: string) => {
    setFormData({
      ...formData,
      assignedWorkTemplateIds: formData.assignedWorkTemplateIds.includes(templateId)
        ? formData.assignedWorkTemplateIds.filter(id => id !== templateId)
        : [...formData.assignedWorkTemplateIds, templateId]
    });
  };

  const handleDayToggle = (day: number) => {
    setFormData({
      ...formData,
      daysOfWeek: formData.daysOfWeek.includes(day)
        ? formData.daysOfWeek.filter(d => d !== day)
        : [...formData.daysOfWeek, day].sort()
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!admin) {
      setError("管理者情報が取得できません");
      return;
    }

    if (!formData.name || !formData.phoneNumber) {
      setError("氏名と電話番号は必須です");
      return;
    }

    setSaving(true);

    try {
      // Convert license expiry date to Timestamp
      const licenseExpiryDate = formData.licenseExpiryDate
        ? Timestamp.fromDate(new Date(formData.licenseExpiryDate))
        : null;

      // Parse payment rates
      const hourlyRate = formData.paymentType === "hourly" && formData.hourlyRate
        ? parseFloat(formData.hourlyRate)
        : null;
      const dailyRate = formData.paymentType === "daily" && formData.dailyRate
        ? parseFloat(formData.dailyRate)
        : null;
      const monthlyRate = formData.paymentType === "monthly" && formData.monthlyRate
        ? parseFloat(formData.monthlyRate)
        : null;
      const overtimeRate = formData.overtimeRate
        ? parseFloat(formData.overtimeRate)
        : null;

      // Build recurring schedule
      const recurringSchedule = formData.useRecurringSchedule
        ? {
            daysOfWeek: formData.daysOfWeek,
            excludeHolidays: formData.excludeHolidays,
            startDate: formData.startDate || null,
            endDate: formData.endDate || null,
          }
        : null;

      await updateStaff(staffId, {
        name: formData.name,
        role: formData.role,
        phoneNumber: formData.phoneNumber,
        lineUserId: formData.lineUserId || null,
        isEscalationTarget: formData.isEscalationTarget,

        licenseExpiryDate,
        licenseNotificationEnabled: formData.licenseNotificationEnabled,
        assignedWorkTemplateIds: formData.assignedWorkTemplateIds,
        assignedWorkFreetext: formData.assignedWorkFreetext || null,
        escalationGraceMinutes: parseInt(formData.escalationGraceMinutes.toString()) || 30,

        // Escalation staff settings
        escalation1stStaffId: formData.escalation1stStaffId || null,
        escalation1stMethod: formData.escalation1stMethod,
        escalation2ndStaffId: formData.escalation2ndStaffId || null,
        escalation2ndMethod: formData.escalation2ndMethod,
        escalation3rdStaffId: formData.escalation3rdStaffId || null,
        escalation3rdMethod: formData.escalation3rdMethod,

        paymentType: formData.paymentType,
        hourlyRate,
        dailyRate,
        monthlyRate,
        overtimeRate,

        recurringSchedule,
        defaultStartTime: formData.defaultStartTime || null,
        defaultEndTime: formData.defaultEndTime || null,
      });

      router.push("/staffs");
    } catch (err: any) {
      setError(err.message || "更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const dayNames = ["日", "月", "火", "水", "木", "金", "土"];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (error && !staff) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-red-50 text-red-600 p-4 rounded-md">{error}</div>
          <Button onClick={() => router.push("/staffs")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            スタッフ一覧に戻る
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6 pb-12">
        <div>
          <Button
            variant="ghost"
            onClick={() => router.push("/staffs")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            戻る
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">スタッフ編集</h1>
          <p className="text-gray-600 mt-1">スタッフ情報を編集します</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>基本情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  氏名 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="山田太郎"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={saving}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">役割</Label>
                <Select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  disabled={saving}
                >
                  <option value="driver">ドライバー</option>
                  <option value="general">一般スタッフ</option>
                  <option value="manager">マネージャー</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber">
                  電話番号 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  placeholder="090-1234-5678"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  disabled={saving}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lineUserId">LINE ユーザーID</Label>
                <Input
                  id="lineUserId"
                  name="lineUserId"
                  type="text"
                  placeholder="U1234567890abcdef"
                  value={formData.lineUserId}
                  onChange={handleChange}
                  disabled={saving}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isEscalationTarget"
                  checked={formData.isEscalationTarget}
                  onChange={(e) =>
                    setFormData({ ...formData, isEscalationTarget: e.target.checked })
                  }
                  disabled={saving}
                />
                <Label htmlFor="isEscalationTarget" className="cursor-pointer">
                  エスカレーション対象にする
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* License Management - Same as registration form */}
          <Card>
            <CardHeader>
              <CardTitle>免許証管理</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="licenseExpiryDate">免許証有効期限</Label>
                <Input
                  id="licenseExpiryDate"
                  name="licenseExpiryDate"
                  type="date"
                  value={formData.licenseExpiryDate}
                  onChange={handleChange}
                  disabled={saving}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="licenseNotificationEnabled"
                  checked={formData.licenseNotificationEnabled}
                  onChange={(e) =>
                    setFormData({ ...formData, licenseNotificationEnabled: e.target.checked })
                  }
                  disabled={saving}
                />
                <Label htmlFor="licenseNotificationEnabled" className="cursor-pointer">
                  1ヶ月前に通知する
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* All Settings Consolidated */}
          <Card>
            <CardHeader>
              <CardTitle>各種設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Work Assignment */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">担当作業</h3>

                <RadioGroup
                  value={formData.workAssignmentType}
                  onValueChange={(value) => setFormData({
                    ...formData,
                    workAssignmentType: value as "template" | "freetext" | "unassigned",
                    assignedWorkTemplateIds: [],
                    assignedWorkFreetext: ""
                  })}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="template" id="work-template" />
                    <Label htmlFor="work-template" className="cursor-pointer">
                      作業テンプレートから選択
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="freetext" id="work-freetext" />
                    <Label htmlFor="work-freetext" className="cursor-pointer">
                      自由記入
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="unassigned" id="work-unassigned" />
                    <Label htmlFor="work-unassigned" className="cursor-pointer">
                      未定
                    </Label>
                  </div>
                </RadioGroup>

                {formData.workAssignmentType === "template" && (
                  <div className="space-y-2 ml-6">
                    <Label htmlFor="assignedWork">作業を選択</Label>
                    <Select
                      id="assignedWork"
                      value={formData.assignedWorkTemplateIds[0] || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFormData({
                          ...formData,
                          assignedWorkTemplateIds: value ? [value] : []
                        });
                      }}
                      disabled={saving}
                    >
                      <option value="">選択してください</option>
                      {workTemplates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}

                {formData.workAssignmentType === "freetext" && (
                  <div className="space-y-2 ml-6">
                    <Label htmlFor="assignedWorkFreetext">担当作業を入力</Label>
                    <Input
                      id="assignedWorkFreetext"
                      type="text"
                      placeholder="例：東京エリア配送、荷物仕分け"
                      value={formData.assignedWorkFreetext}
                      onChange={(e) => setFormData({
                        ...formData,
                        assignedWorkFreetext: e.target.value
                      })}
                      disabled={saving}
                    />
                  </div>
                )}
              </div>

              <div className="border-t pt-4"></div>

              {/* Work Hours */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">勤務時間（シフト自動生成に使用）</h3>
                <p className="text-sm text-muted-foreground">
                  繰り返し設定と組み合わせて、自動的にシフトを生成します
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="defaultStartTime">始業時間（点呼確認時間）</Label>
                    <Input
                      id="defaultStartTime"
                      name="defaultStartTime"
                      type="time"
                      value={formData.defaultStartTime}
                      onChange={handleChange}
                      disabled={saving}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="defaultEndTime">終業時間</Label>
                    <Input
                      id="defaultEndTime"
                      name="defaultEndTime"
                      type="time"
                      value={formData.defaultEndTime}
                      onChange={handleChange}
                      disabled={saving}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4"></div>

              {/* Recurring Schedule */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">繰り返し設定</h3>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="useRecurringSchedule"
                    checked={formData.useRecurringSchedule}
                    onChange={(e) => setFormData({ ...formData, useRecurringSchedule: e.target.checked })}
                    disabled={saving}
                  />
                  <Label htmlFor="useRecurringSchedule" className="cursor-pointer">
                    繰り返しスケジュールを使用
                  </Label>
                </div>

                {formData.useRecurringSchedule && (
                  <div className="space-y-4 ml-6">
                    <div className="space-y-2">
                      <Label>曜日を選択</Label>
                      <div className="grid grid-cols-7 gap-2">
                        {dayNames.map((day, index) => (
                          <Button
                            key={index}
                            type="button"
                            variant={formData.daysOfWeek.includes(index) ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleDayToggle(index)}
                            disabled={saving}
                          >
                            {day}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="excludeHolidays"
                        checked={formData.excludeHolidays}
                        onChange={(e) => setFormData({ ...formData, excludeHolidays: e.target.checked })}
                        disabled={saving}
                      />
                      <Label htmlFor="excludeHolidays" className="cursor-pointer">
                        祝日を除外
                      </Label>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="startDate">開始日（任意）</Label>
                        <Input
                          id="startDate"
                          name="startDate"
                          type="date"
                          value={formData.startDate}
                          onChange={handleChange}
                          disabled={saving}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="endDate">終了日（任意）</Label>
                        <Input
                          id="endDate"
                          name="endDate"
                          type="date"
                          value={formData.endDate}
                          onChange={handleChange}
                          disabled={saving}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t pt-4"></div>

              {/* Payment Settings */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">給与設定</h3>

                <div className="space-y-2">
                  <Label htmlFor="paymentType">給与形態</Label>
                  <Select
                    id="paymentType"
                    name="paymentType"
                    value={formData.paymentType}
                    onChange={handleChange}
                    disabled={saving}
                  >
                    <option value="hourly">時給</option>
                    <option value="daily">日給</option>
                    <option value="monthly">月給</option>
                  </Select>
                </div>

                {formData.paymentType === "hourly" && (
                  <div className="space-y-2">
                    <Label htmlFor="hourlyRate">時給（円）</Label>
                    <Input
                      id="hourlyRate"
                      name="hourlyRate"
                      type="number"
                      placeholder="1500"
                      value={formData.hourlyRate}
                      onChange={handleChange}
                      disabled={saving}
                    />
                  </div>
                )}

                {formData.paymentType === "daily" && (
                  <div className="space-y-2">
                    <Label htmlFor="dailyRate">日給（円）</Label>
                    <Input
                      id="dailyRate"
                      name="dailyRate"
                      type="number"
                      placeholder="12000"
                      value={formData.dailyRate}
                      onChange={handleChange}
                      disabled={saving}
                    />
                  </div>
                )}

                {formData.paymentType === "monthly" && (
                  <div className="space-y-2">
                    <Label htmlFor="monthlyRate">月給（円）</Label>
                    <Input
                      id="monthlyRate"
                      name="monthlyRate"
                      type="number"
                      placeholder="250000"
                      value={formData.monthlyRate}
                      onChange={handleChange}
                      disabled={saving}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="overtimeRate">残業単価（円/時間）</Label>
                  <Input
                    id="overtimeRate"
                    name="overtimeRate"
                    type="number"
                    placeholder="2000"
                    value={formData.overtimeRate}
                    onChange={handleChange}
                    disabled={saving}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/staffs")}
              disabled={saving}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "更新中..." : "更新"}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
