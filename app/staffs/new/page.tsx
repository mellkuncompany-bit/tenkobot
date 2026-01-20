"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/lib/hooks/use-auth";
import { createStaff, getStaffs } from "@/lib/services/staff-service";
import { getWorkTemplates } from "@/lib/services/work-template-service";
import { StaffRole, PaymentType, WorkTemplate, Staff } from "@/lib/types/firestore";
import { ArrowLeft } from "lucide-react";
import { Timestamp } from "firebase/firestore";

export default function NewStaffPage() {
  const { admin } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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
  });

  useEffect(() => {
    if (!admin) return;

    const fetchData = async () => {
      try {
        const [templates, staffList] = await Promise.all([
          getWorkTemplates(admin.organizationId),
          getStaffs(admin.organizationId),
        ]);
        setWorkTemplates(templates);
        setStaffs(staffList);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, [admin]);

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

    setLoading(true);

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

      await createStaff({
        organizationId: admin.organizationId,
        name: formData.name,
        role: formData.role,
        phoneNumber: formData.phoneNumber,
        lineUserId: formData.lineUserId || null,
        isEscalationTarget: formData.isEscalationTarget,
        isActive: true,

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
      });

      router.push("/staffs");
    } catch (err: any) {
      setError(err.message || "登録に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const dayNames = ["日", "月", "火", "水", "木", "金", "土"];

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
          <h1 className="text-3xl font-bold text-gray-900">スタッフ新規登録</h1>
          <p className="text-gray-600 mt-1">新しいスタッフを登録します</p>
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
                  disabled={loading}
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
                  disabled={loading}
                >
                  <option value="driver">ドライバー</option>
                  <option value="manager">管理者</option>
                  <option value="owner">経営者</option>
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
                  disabled={loading}
                  required
                />
                <p className="text-xs text-gray-500">
                  SMS・架電通知に使用されます
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lineUserId">LINE User ID</Label>
                <Input
                  id="lineUserId"
                  name="lineUserId"
                  type="text"
                  placeholder="U1234567890abcdef..."
                  value={formData.lineUserId}
                  onChange={handleChange}
                  disabled={loading}
                />
                <p className="text-xs text-gray-500">
                  LINE公式アカウントから取得したUser IDを入力してください
                </p>
              </div>
            </CardContent>
          </Card>

          {/* License Management */}
          <Card>
            <CardHeader>
              <CardTitle>免許管理</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="licenseExpiryDate">免許有効期限</Label>
                <Input
                  id="licenseExpiryDate"
                  name="licenseExpiryDate"
                  type="date"
                  value={formData.licenseExpiryDate}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="licenseNotificationEnabled"
                  checked={formData.licenseNotificationEnabled}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      licenseNotificationEnabled: e.target.checked,
                    })
                  }
                  disabled={loading}
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
                  onChange={(e) => setFormData({
                    ...formData,
                    workAssignmentType: e.target.value as "template" | "freetext" | "unassigned",
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
                      disabled={loading}
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
                      disabled={loading}
                    />
                  </div>
                )}
              </div>

              <div className="border-t pt-4"></div>

              {/* Recurring Schedule */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">繰り返し設定</h3>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="useRecurringSchedule"
                    checked={formData.useRecurringSchedule}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        useRecurringSchedule: e.target.checked,
                      })
                    }
                    disabled={loading}
                  />
                  <Label htmlFor="useRecurringSchedule" className="cursor-pointer">
                    繰り返しスケジュールを使用する
                  </Label>
                </div>

                {formData.useRecurringSchedule && (
                  <>
                    <div className="space-y-2">
                      <Label>勤務曜日</Label>
                      <div className="flex flex-wrap gap-2">
                        {dayNames.map((day, index) => (
                          <div key={index} className="flex items-center">
                            <Checkbox
                              id={`day-${index}`}
                              checked={formData.daysOfWeek.includes(index)}
                              onChange={() => handleDayToggle(index)}
                              disabled={loading}
                            />
                            <Label
                              htmlFor={`day-${index}`}
                              className="ml-2 cursor-pointer"
                            >
                              {day}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="excludeHolidays"
                        checked={formData.excludeHolidays}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            excludeHolidays: e.target.checked,
                          })
                        }
                        disabled={loading}
                      />
                      <Label htmlFor="excludeHolidays" className="cursor-pointer">
                        祝日は休み
                      </Label>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="startDate">開始日</Label>
                        <Input
                          id="startDate"
                          name="startDate"
                          type="date"
                          value={formData.startDate}
                          onChange={handleChange}
                          disabled={loading}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="endDate">終了日</Label>
                        <Input
                          id="endDate"
                          name="endDate"
                          type="date"
                          value={formData.endDate}
                          onChange={handleChange}
                          disabled={loading}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="border-t pt-4"></div>

              {/* Escalation Settings */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">エスカレーション設定</h3>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isEscalationTarget"
                    checked={formData.isEscalationTarget}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        isEscalationTarget: e.target.checked,
                      })
                    }
                    disabled={loading}
                  />
                  <Label htmlFor="isEscalationTarget" className="cursor-pointer">
                    エスカレーション受信対象にする
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="escalationGraceMinutes">
                    エスカレーション猶予時間（分）
                  </Label>
                  <Input
                    id="escalationGraceMinutes"
                    name="escalationGraceMinutes"
                    type="number"
                    min="0"
                    value={formData.escalationGraceMinutes}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500">
                    電話に出たが出勤メッセージが送られてこない場合、次の担当者に電話するまでの時間（デフォルト：5分）
                  </p>
                </div>

                <div className="space-y-6">
                  {/* 1人目 */}
                  <div className="space-y-3">
                    <Label htmlFor="escalation1stStaff">1人目の担当者</Label>
                    <Select
                      id="escalation1stStaff"
                      value={formData.escalation1stStaffId}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          escalation1stStaffId: e.target.value,
                        })
                      }
                      disabled={loading}
                    >
                      <option value="">選択してください</option>
                      {staffs
                        .filter((s) => s.role === "manager" || s.role === "owner")
                        .map((staff) => (
                          <option key={staff.id} value={staff.id}>
                            {staff.name} ({staff.role === "manager" ? "管理者" : "経営者"})
                          </option>
                        ))}
                    </Select>
                    <div className="ml-2">
                      <RadioGroup
                        value={formData.escalation1stMethod}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            escalation1stMethod: value as "sms" | "call",
                          })
                        }
                        disabled={loading}
                        className="flex space-x-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="sms" id="escalation1st-sms" />
                          <Label htmlFor="escalation1st-sms" className="cursor-pointer font-normal">
                            SMS
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="call" id="escalation1st-call" />
                          <Label htmlFor="escalation1st-call" className="cursor-pointer font-normal">
                            電話
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>

                  {/* 2人目 */}
                  <div className="space-y-3">
                    <Label htmlFor="escalation2ndStaff">2人目の担当者</Label>
                    <Select
                      id="escalation2ndStaff"
                      value={formData.escalation2ndStaffId}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          escalation2ndStaffId: e.target.value,
                        })
                      }
                      disabled={loading}
                    >
                      <option value="">選択してください</option>
                      {staffs
                        .filter((s) => s.role === "manager" || s.role === "owner")
                        .map((staff) => (
                          <option key={staff.id} value={staff.id}>
                            {staff.name} ({staff.role === "manager" ? "管理者" : "経営者"})
                          </option>
                        ))}
                    </Select>
                    <div className="ml-2">
                      <RadioGroup
                        value={formData.escalation2ndMethod}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            escalation2ndMethod: value as "sms" | "call",
                          })
                        }
                        disabled={loading}
                        className="flex space-x-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="sms" id="escalation2nd-sms" />
                          <Label htmlFor="escalation2nd-sms" className="cursor-pointer font-normal">
                            SMS
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="call" id="escalation2nd-call" />
                          <Label htmlFor="escalation2nd-call" className="cursor-pointer font-normal">
                            電話
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>

                  {/* 3人目 */}
                  <div className="space-y-3">
                    <Label htmlFor="escalation3rdStaff">3人目の担当者</Label>
                    <Select
                      id="escalation3rdStaff"
                      value={formData.escalation3rdStaffId}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          escalation3rdStaffId: e.target.value,
                        })
                      }
                      disabled={loading}
                    >
                      <option value="">選択してください</option>
                      {staffs
                        .filter((s) => s.role === "manager" || s.role === "owner")
                        .map((staff) => (
                          <option key={staff.id} value={staff.id}>
                            {staff.name} ({staff.role === "manager" ? "管理者" : "経営者"})
                          </option>
                        ))}
                    </Select>
                    <div className="ml-2">
                      <RadioGroup
                        value={formData.escalation3rdMethod}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            escalation3rdMethod: value as "sms" | "call",
                          })
                        }
                        disabled={loading}
                        className="flex space-x-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="sms" id="escalation3rd-sms" />
                          <Label htmlFor="escalation3rd-sms" className="cursor-pointer font-normal">
                            SMS
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="call" id="escalation3rd-call" />
                          <Label htmlFor="escalation3rd-call" className="cursor-pointer font-normal">
                            電話
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center space-x-4">
            <Button type="submit" disabled={loading}>
              {loading ? "登録中..." : "登録"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/staffs")}
              disabled={loading}
            >
              キャンセル
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
