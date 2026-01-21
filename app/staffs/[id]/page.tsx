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
import { StaffRole, WorkTemplate, Staff } from "@/lib/types/firestore";
import { ArrowLeft, Plus } from "lucide-react";
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

    // Assigned work templates
    workAssignmentType: "unassigned" as "template" | "freetext" | "unassigned",
    assignedWorkTemplateIds: [] as string[],
    assignedWorkFreetext: "",

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

  // Phone notification contacts state
  const [contact1Type, setContact1Type] = useState<"self" | "staff" | "freetext" | null>(null);
  const [contact1StaffId, setContact1StaffId] = useState("");
  const [contact1Phone, setContact1Phone] = useState("");
  const [contact1Method, setContact1Method] = useState<"sms" | "call">("sms");

  const [showContact2, setShowContact2] = useState(false);
  const [contact2Type, setContact2Type] = useState<"self" | "staff" | "freetext" | null>(null);
  const [contact2StaffId, setContact2StaffId] = useState("");
  const [contact2Phone, setContact2Phone] = useState("");
  const [contact2Method, setContact2Method] = useState<"sms" | "call">("sms");

  const [showContact3, setShowContact3] = useState(false);
  const [contact3Type, setContact3Type] = useState<"self" | "staff" | "freetext" | null>(null);
  const [contact3StaffId, setContact3StaffId] = useState("");
  const [contact3Phone, setContact3Phone] = useState("");
  const [contact3Method, setContact3Method] = useState<"sms" | "call">("sms");

  // Phone relay escalation grace time
  const [escalationGraceMinutes, setEscalationGraceMinutes] = useState(5);

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

          workAssignmentType,
          assignedWorkTemplateIds: staffData.assignedWorkTemplateIds || [],
          assignedWorkFreetext: staffData.assignedWorkFreetext || "",

          useRecurringSchedule: !!staffData.recurringSchedule,
          daysOfWeek: staffData.recurringSchedule?.daysOfWeek || [],
          excludeHolidays: staffData.recurringSchedule?.excludeHolidays || false,
          startDate: staffData.recurringSchedule?.startDate || "",
          endDate: staffData.recurringSchedule?.endDate || "",

          defaultStartTime: staffData.defaultStartTime || "",
          defaultEndTime: staffData.defaultEndTime || "",
        });

        // Restore phone notification contacts
        if (staffData.phoneNotificationContact1) {
          setContact1Type(staffData.phoneNotificationContact1.type);
          setContact1StaffId(staffData.phoneNotificationContact1.staffId || "");
          setContact1Phone(staffData.phoneNotificationContact1.phoneNumber || "");
          setContact1Method(staffData.phoneNotificationContact1.notificationMethod);
        }

        if (staffData.phoneNotificationContact2) {
          setShowContact2(true);
          setContact2Type(staffData.phoneNotificationContact2.type);
          setContact2StaffId(staffData.phoneNotificationContact2.staffId || "");
          setContact2Phone(staffData.phoneNotificationContact2.phoneNumber || "");
          setContact2Method(staffData.phoneNotificationContact2.notificationMethod);
        }

        if (staffData.phoneNotificationContact3) {
          setShowContact3(true);
          setContact3Type(staffData.phoneNotificationContact3.type);
          setContact3StaffId(staffData.phoneNotificationContact3.staffId || "");
          setContact3Phone(staffData.phoneNotificationContact3.phoneNumber || "");
          setContact3Method(staffData.phoneNotificationContact3.notificationMethod);
        }

        // Restore escalation grace time
        setEscalationGraceMinutes(staffData.escalationGraceMinutes ?? 5);

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

      // Build recurring schedule
      const recurringSchedule = formData.useRecurringSchedule
        ? {
            daysOfWeek: formData.daysOfWeek,
            excludeHolidays: formData.excludeHolidays,
            startDate: formData.startDate || null,
            endDate: formData.endDate || null,
          }
        : null;

      // Build phone notification contacts
      const phoneNotificationContact1 = contact1Type
        ? {
            type: contact1Type,
            staffId: contact1Type === "staff" ? contact1StaffId : null,
            phoneNumber: contact1Type === "freetext" ? contact1Phone : null,
            notificationMethod: contact1Method,
          }
        : null;

      const phoneNotificationContact2 = contact2Type
        ? {
            type: contact2Type,
            staffId: contact2Type === "staff" ? contact2StaffId : null,
            phoneNumber: contact2Type === "freetext" ? contact2Phone : null,
            notificationMethod: contact2Method,
          }
        : null;

      const phoneNotificationContact3 = contact3Type
        ? {
            type: contact3Type,
            staffId: contact3Type === "staff" ? contact3StaffId : null,
            phoneNumber: contact3Type === "freetext" ? contact3Phone : null,
            notificationMethod: contact3Method,
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
        escalationGraceMinutes: parseInt(escalationGraceMinutes.toString()) || 5,

        // Escalation staff settings (set to null)
        escalation1stStaffId: null,
        escalation1stMethod: "sms",
        escalation2ndStaffId: null,
        escalation2ndMethod: "sms",
        escalation3rdStaffId: null,
        escalation3rdMethod: "call",

        recurringSchedule,
        defaultStartTime: formData.defaultStartTime || null,
        defaultEndTime: formData.defaultEndTime || null,

        phoneNotificationContact1,
        phoneNotificationContact2,
        phoneNotificationContact3,
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
                  <option value="manager">管理職</option>
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
                  点呼確認対象
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
                    <select
                      id="defaultStartTime"
                      name="defaultStartTime"
                      value={formData.defaultStartTime || ""}
                      onChange={handleChange}
                      disabled={saving}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">未設定</option>
                      {Array.from({ length: 48 }, (_, i) => {
                        const hours = Math.floor(i / 2).toString().padStart(2, '0');
                        const minutes = (i % 2 === 0 ? '00' : '30');
                        const time = `${hours}:${minutes}`;
                        return <option key={time} value={time}>{time}</option>;
                      })}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="defaultEndTime">終業時間</Label>
                    <select
                      id="defaultEndTime"
                      name="defaultEndTime"
                      value={formData.defaultEndTime || ""}
                      onChange={handleChange}
                      disabled={saving}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">未設定</option>
                      {Array.from({ length: 48 }, (_, i) => {
                        const hours = Math.floor(i / 2).toString().padStart(2, '0');
                        const minutes = (i % 2 === 0 ? '00' : '30');
                        const time = `${hours}:${minutes}`;
                        return <option key={time} value={time}>{time}</option>;
                      })}
                    </select>
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

              {/* Phone Relay Settings */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">電話リレー設定</h3>
                <p className="text-xs text-gray-500">
                  未報告時に電話通知する対象者を最大3人まで設定できます
                </p>

                {/* Escalation Grace Time */}
                <div className="space-y-2">
                  <Label htmlFor="escalationGraceMinutes">
                    エスカレーション猶予時間（分）
                  </Label>
                  <Input
                    id="escalationGraceMinutes"
                    type="number"
                    min="0"
                    value={escalationGraceMinutes}
                    onChange={(e) => setEscalationGraceMinutes(Number(e.target.value))}
                    disabled={saving}
                  />
                  <p className="text-xs text-gray-500">
                    電話に出たが出勤メッセージが送られてこない場合、次の担当者に電話するまでの時間（デフォルト：5分）
                  </p>
                </div>

                {/* Contact 1 */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">通知対象者 1</h4>
                  </div>

                  <RadioGroup
                    value={contact1Type || ""}
                    onValueChange={(value) => setContact1Type(value as "self" | "staff" | "freetext")}
                    disabled={saving}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="self" id="contact1-self" />
                      <Label htmlFor="contact1-self" className="cursor-pointer">
                        本人
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="staff" id="contact1-staff" />
                      <Label htmlFor="contact1-staff" className="cursor-pointer">
                        スタッフから選択
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="freetext" id="contact1-freetext" />
                      <Label htmlFor="contact1-freetext" className="cursor-pointer">
                        電話番号を直接入力
                      </Label>
                    </div>
                  </RadioGroup>

                  {contact1Type === "staff" && (
                    <div className="space-y-2">
                      <Label htmlFor="contact1StaffId">スタッフ選択</Label>
                      <Select
                        id="contact1StaffId"
                        value={contact1StaffId}
                        onChange={(e) => setContact1StaffId(e.target.value)}
                        disabled={saving}
                      >
                        <option value="">選択してください</option>
                        {staffs
                          .filter((s) => s.role === "manager" || s.role === "owner")
                          .map((staff) => (
                            <option key={staff.id} value={staff.id}>
                              {staff.name} ({staff.role === "owner" ? "経営者" : "管理者"})
                            </option>
                          ))}
                      </Select>
                    </div>
                  )}

                  {contact1Type === "freetext" && (
                    <div className="space-y-2">
                      <Label htmlFor="contact1Phone">電話番号</Label>
                      <Input
                        id="contact1Phone"
                        type="tel"
                        placeholder="090-1234-5678"
                        value={contact1Phone}
                        onChange={(e) => setContact1Phone(e.target.value)}
                        disabled={saving}
                      />
                    </div>
                  )}

                  {contact1Type && (
                    <div className="space-y-2">
                      <Label>通知方法</Label>
                      <RadioGroup
                        value={contact1Method}
                        onValueChange={(value) => setContact1Method(value as "sms" | "call")}
                        disabled={saving}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="sms" id="contact1-sms" />
                          <Label htmlFor="contact1-sms" className="cursor-pointer">
                            SMS
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="call" id="contact1-call" />
                          <Label htmlFor="contact1-call" className="cursor-pointer">
                            電話
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                  )}
                </div>

                {/* Add Contact 2 Button */}
                {!showContact2 && contact1Type && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowContact2(true)}
                    disabled={saving}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    2人目を追加
                  </Button>
                )}

                {/* Contact 2 */}
                {showContact2 && (
                  <div className="space-y-4 p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">通知対象者 2</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowContact2(false);
                          setContact2Type(null);
                          setContact2StaffId("");
                          setContact2Phone("");
                          setContact2Method("sms");
                          setShowContact3(false);
                        }}
                        disabled={saving}
                      >
                        削除
                      </Button>
                    </div>

                    <RadioGroup
                      value={contact2Type || ""}
                      onValueChange={(value) => setContact2Type(value as "self" | "staff" | "freetext")}
                      disabled={saving}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="self" id="contact2-self" />
                        <Label htmlFor="contact2-self" className="cursor-pointer">
                          本人
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="staff" id="contact2-staff" />
                        <Label htmlFor="contact2-staff" className="cursor-pointer">
                          スタッフから選択
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="freetext" id="contact2-freetext" />
                        <Label htmlFor="contact2-freetext" className="cursor-pointer">
                          電話番号を直接入力
                        </Label>
                      </div>
                    </RadioGroup>

                    {contact2Type === "staff" && (
                      <div className="space-y-2">
                        <Label htmlFor="contact2StaffId">スタッフ選択</Label>
                        <Select
                          id="contact2StaffId"
                          value={contact2StaffId}
                          onChange={(e) => setContact2StaffId(e.target.value)}
                          disabled={saving}
                        >
                          <option value="">選択してください</option>
                          {staffs
                            .filter((s) => s.role === "manager" || s.role === "owner")
                            .map((staff) => (
                              <option key={staff.id} value={staff.id}>
                                {staff.name} ({staff.role === "owner" ? "経営者" : "管理者"})
                              </option>
                            ))}
                        </Select>
                      </div>
                    )}

                    {contact2Type === "freetext" && (
                      <div className="space-y-2">
                        <Label htmlFor="contact2Phone">電話番号</Label>
                        <Input
                          id="contact2Phone"
                          type="tel"
                          placeholder="090-1234-5678"
                          value={contact2Phone}
                          onChange={(e) => setContact2Phone(e.target.value)}
                          disabled={saving}
                        />
                      </div>
                    )}

                    {contact2Type && (
                      <div className="space-y-2">
                        <Label>通知方法</Label>
                        <RadioGroup
                          value={contact2Method}
                          onValueChange={(value) => setContact2Method(value as "sms" | "call")}
                          disabled={saving}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="sms" id="contact2-sms" />
                            <Label htmlFor="contact2-sms" className="cursor-pointer">
                              SMS
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="call" id="contact2-call" />
                            <Label htmlFor="contact2-call" className="cursor-pointer">
                              電話
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>
                    )}
                  </div>
                )}

                {/* Add Contact 3 Button */}
                {showContact2 && !showContact3 && contact2Type && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowContact3(true)}
                    disabled={saving}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    3人目を追加
                  </Button>
                )}

                {/* Contact 3 */}
                {showContact3 && (
                  <div className="space-y-4 p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">通知対象者 3</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowContact3(false);
                          setContact3Type(null);
                          setContact3StaffId("");
                          setContact3Phone("");
                          setContact3Method("sms");
                        }}
                        disabled={saving}
                      >
                        削除
                      </Button>
                    </div>

                    <RadioGroup
                      value={contact3Type || ""}
                      onValueChange={(value) => setContact3Type(value as "self" | "staff" | "freetext")}
                      disabled={saving}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="self" id="contact3-self" />
                        <Label htmlFor="contact3-self" className="cursor-pointer">
                          本人
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="staff" id="contact3-staff" />
                        <Label htmlFor="contact3-staff" className="cursor-pointer">
                          スタッフから選択
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="freetext" id="contact3-freetext" />
                        <Label htmlFor="contact3-freetext" className="cursor-pointer">
                          電話番号を直接入力
                        </Label>
                      </div>
                    </RadioGroup>

                    {contact3Type === "staff" && (
                      <div className="space-y-2">
                        <Label htmlFor="contact3StaffId">スタッフ選択</Label>
                        <Select
                          id="contact3StaffId"
                          value={contact3StaffId}
                          onChange={(e) => setContact3StaffId(e.target.value)}
                          disabled={saving}
                        >
                          <option value="">選択してください</option>
                          {staffs
                            .filter((s) => s.role === "manager" || s.role === "owner")
                            .map((staff) => (
                              <option key={staff.id} value={staff.id}>
                                {staff.name} ({staff.role === "owner" ? "経営者" : "管理者"})
                              </option>
                            ))}
                        </Select>
                      </div>
                    )}

                    {contact3Type === "freetext" && (
                      <div className="space-y-2">
                        <Label htmlFor="contact3Phone">電話番号</Label>
                        <Input
                          id="contact3Phone"
                          type="tel"
                          placeholder="090-1234-5678"
                          value={contact3Phone}
                          onChange={(e) => setContact3Phone(e.target.value)}
                          disabled={saving}
                        />
                      </div>
                    )}

                    {contact3Type && (
                      <div className="space-y-2">
                        <Label>通知方法</Label>
                        <RadioGroup
                          value={contact3Method}
                          onValueChange={(value) => setContact3Method(value as "sms" | "call")}
                          disabled={saving}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="sms" id="contact3-sms" />
                            <Label htmlFor="contact3-sms" className="cursor-pointer">
                              SMS
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="call" id="contact3-call" />
                            <Label htmlFor="contact3-call" className="cursor-pointer">
                              電話
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>
                    )}
                  </div>
                )}
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
