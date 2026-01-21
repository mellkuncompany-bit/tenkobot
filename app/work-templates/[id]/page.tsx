"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select } from "@/components/ui/select";
import { getWorkTemplate, updateWorkTemplate } from "@/lib/services/work-template-service";
import { getStaffsByRole } from "@/lib/services/staff-service";
import { Staff, DriverAssignmentType, PhoneNotificationContact } from "@/lib/types/firestore";
import { ArrowLeft, Plus } from "lucide-react";
import { useAuth } from "@/lib/hooks/use-auth";

export default function EditWorkTemplatePage() {
  const { admin } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    notes: "",
    reportCheckTime: "",
    requiresRollCall: false,
    workDate: "",

    // Recurring schedule
    useRecurringSchedule: false,
    daysOfWeek: [] as number[],
    excludeHolidays: false,
    endDate: "",
  });

  // Driver assignment state
  const [driverAssignmentType, setDriverAssignmentType] =
    useState<DriverAssignmentType>("unassigned");
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [freetextDriverName, setFreetextDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [drivers, setDrivers] = useState<Staff[]>([]);

  // Phone notification contacts state
  const [showContact2, setShowContact2] = useState(false);
  const [showContact3, setShowContact3] = useState(false);
  const [managers, setManagers] = useState<Staff[]>([]);

  // Contact 1
  const [contact1Type, setContact1Type] = useState<"staff" | "freetext" | "self" | null>(null);
  const [contact1StaffId, setContact1StaffId] = useState("");
  const [contact1Phone, setContact1Phone] = useState("");
  const [contact1Method, setContact1Method] = useState<"sms" | "call">("sms");

  // Contact 2
  const [contact2Type, setContact2Type] = useState<"staff" | "freetext" | "self" | null>(null);
  const [contact2StaffId, setContact2StaffId] = useState("");
  const [contact2Phone, setContact2Phone] = useState("");
  const [contact2Method, setContact2Method] = useState<"sms" | "call">("sms");

  // Contact 3
  const [contact3Type, setContact3Type] = useState<"staff" | "freetext" | "self" | null>(null);
  const [contact3StaffId, setContact3StaffId] = useState("");
  const [contact3Phone, setContact3Phone] = useState("");
  const [contact3Method, setContact3Method] = useState<"sms" | "call">("sms");

  // Load drivers and managers
  useEffect(() => {
    if (!admin) return;
    getStaffsByRole(admin.organizationId, "driver").then(setDrivers);

    // Load managers and owners for phone notification contacts
    Promise.all([
      getStaffsByRole(admin.organizationId, "manager"),
      getStaffsByRole(admin.organizationId, "owner"),
    ]).then(([managersData, ownersData]) => {
      setManagers([...managersData, ...ownersData]);
    });
  }, [admin]);

  // Load work template data
  useEffect(() => {
    const fetch = async () => {
      const data = await getWorkTemplate(params.id as string);
      if (data) {
        setFormData({
          name: data.name,
          description: data.description,
          notes: data.notes,
          reportCheckTime: data.reportCheckTime || "",
          requiresRollCall: data.requiresRollCall || false,
          workDate: "",
          useRecurringSchedule: !!data.recurringSchedule,
          daysOfWeek: data.recurringSchedule?.daysOfWeek || [],
          excludeHolidays: data.recurringSchedule?.excludeHolidays || false,
          endDate: data.recurringSchedule?.endDate || "",
        });

        // Load driver assignment
        if (data.defaultDriverAssignment) {
          setDriverAssignmentType(data.defaultDriverAssignment.type);
          if (data.defaultDriverAssignment.type === "staff") {
            setSelectedDriverId(data.defaultDriverAssignment.staffId || "");
            setDriverPhone(data.defaultDriverAssignment.contactPhone || "");
          } else if (data.defaultDriverAssignment.type === "freetext") {
            setFreetextDriverName(data.defaultDriverAssignment.freetextName || "");
            setDriverPhone(data.defaultDriverAssignment.contactPhone || "");
          }
        }

        // Load phone notification contacts
        if (data.phoneNotificationContact1) {
          setContact1Type(data.phoneNotificationContact1.type);
          setContact1Method(data.phoneNotificationContact1.notificationMethod);
          if (data.phoneNotificationContact1.type === "staff") {
            setContact1StaffId(data.phoneNotificationContact1.staffId || "");
          } else {
            setContact1Phone(data.phoneNotificationContact1.phoneNumber || "");
          }
        }

        if (data.phoneNotificationContact2) {
          setShowContact2(true);
          setContact2Type(data.phoneNotificationContact2.type);
          setContact2Method(data.phoneNotificationContact2.notificationMethod);
          if (data.phoneNotificationContact2.type === "staff") {
            setContact2StaffId(data.phoneNotificationContact2.staffId || "");
          } else {
            setContact2Phone(data.phoneNotificationContact2.phoneNumber || "");
          }
        }

        if (data.phoneNotificationContact3) {
          setShowContact3(true);
          setContact3Type(data.phoneNotificationContact3.type);
          setContact3Method(data.phoneNotificationContact3.notificationMethod);
          if (data.phoneNotificationContact3.type === "staff") {
            setContact3StaffId(data.phoneNotificationContact3.staffId || "");
          } else {
            setContact3Phone(data.phoneNotificationContact3.phoneNumber || "");
          }
        }
      }
      setLoading(false);
    };
    fetch();
  }, [params.id]);

  const handleDayToggle = (day: number) => {
    setFormData({
      ...formData,
      daysOfWeek: formData.daysOfWeek.includes(day)
        ? formData.daysOfWeek.filter((d) => d !== day)
        : [...formData.daysOfWeek, day].sort(),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const recurringSchedule = formData.useRecurringSchedule
        ? {
            daysOfWeek: formData.daysOfWeek,
            excludeHolidays: formData.excludeHolidays,
            startDate: null,
            endDate: formData.endDate || null,
          }
        : null;

      // Build driver assignment
      let defaultDriverAssignment = null;
      if (driverAssignmentType === "staff") {
        if (selectedDriverId) {
          defaultDriverAssignment = {
            type: "staff" as const,
            staffId: selectedDriverId,
            freetextName: null,
            contactPhone: driverPhone || null,
          };
        }
      } else if (driverAssignmentType === "freetext") {
        if (freetextDriverName) {
          defaultDriverAssignment = {
            type: "freetext" as const,
            staffId: null,
            freetextName: freetextDriverName,
            contactPhone: driverPhone || null,
          };
        }
      } else {
        defaultDriverAssignment = {
          type: "unassigned" as const,
          staffId: null,
          freetextName: null,
          contactPhone: null,
        };
      }

      // Build phone notification contacts
      const buildContact = (
        type: "staff" | "freetext" | "self" | null,
        staffId: string,
        phone: string,
        method: "sms" | "call"
      ): PhoneNotificationContact | null => {
        if (!type) return null;
        if (type === "staff" && !staffId) return null;
        if (type === "freetext" && !phone) return null;
        // "self" is not applicable for work templates, but included for type compatibility

        return {
          type,
          staffId: type === "staff" ? staffId : null,
          phoneNumber: type === "freetext" ? phone : null,
          notificationMethod: method,
        };
      };

      const phoneNotificationContact1 = buildContact(
        contact1Type,
        contact1StaffId,
        contact1Phone,
        contact1Method
      );
      const phoneNotificationContact2 = showContact2
        ? buildContact(contact2Type, contact2StaffId, contact2Phone, contact2Method)
        : null;
      const phoneNotificationContact3 = showContact3
        ? buildContact(contact3Type, contact3StaffId, contact3Phone, contact3Method)
        : null;

      await updateWorkTemplate(params.id as string, {
        name: formData.name,
        description: formData.description,
        notes: formData.notes,
        reportCheckTime: formData.reportCheckTime || null,
        requiresRollCall: formData.requiresRollCall,
        recurringSchedule,
        defaultDriverAssignment,
        phoneNotificationContact1,
        phoneNotificationContact2,
        phoneNotificationContact3,
      });

      router.push("/staffs");
    } catch (error) {
      alert("更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const dayNames = ["日", "月", "火", "水", "木", "金", "土"];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">読み込み中...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6 pb-12">
        <div>
          <Button
            variant="ghost"
            onClick={() => router.push("/staffs")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            戻る
          </Button>
          <h1 className="text-3xl font-bold">作業マスタ編集</h1>
          <p className="text-gray-600 mt-1">作業マスタの情報を編集します</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>基本情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  作業名 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">説明</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">注意事項</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reportCheckTime">作業報告確認時刻</Label>
                <Input
                  id="reportCheckTime"
                  type="time"
                  value={formData.reportCheckTime}
                  onChange={(e) =>
                    setFormData({ ...formData, reportCheckTime: e.target.value })
                  }
                  disabled={saving}
                />
                <p className="text-xs text-gray-500">
                  この時刻に作業報告を確認します。未報告の場合はエスカレーション処理が実行されます
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="requiresRollCall"
                  checked={formData.requiresRollCall}
                  onChange={(e) =>
                    setFormData({ ...formData, requiresRollCall: e.target.checked })
                  }
                  disabled={saving}
                />
                <Label htmlFor="requiresRollCall" className="cursor-pointer">
                  点呼確認対象にする（作業開始時刻に点呼が必要）
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
                    disabled={saving}
                  />
                  <Label htmlFor="useRecurringSchedule" className="cursor-pointer">
                    繰り返しスケジュールを使用する
                  </Label>
                </div>

                {formData.useRecurringSchedule && (
                  <>
                    <div className="space-y-2">
                      <Label>実施曜日</Label>
                      <div className="flex flex-wrap gap-2">
                        {dayNames.map((day, index) => (
                          <div key={index} className="flex items-center">
                            <Checkbox
                              id={`day-${index}`}
                              checked={formData.daysOfWeek.includes(index)}
                              onChange={() => handleDayToggle(index)}
                              disabled={saving}
                            />
                            <Label htmlFor={`day-${index}`} className="ml-2 cursor-pointer">
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
                        disabled={saving}
                      />
                      <Label htmlFor="excludeHolidays" className="cursor-pointer">
                        祝日は除外
                      </Label>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="endDate">終了日（任意）</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={formData.endDate}
                        onChange={(e) =>
                          setFormData({ ...formData, endDate: e.target.value })
                        }
                        disabled={saving}
                      />
                      <p className="text-xs text-gray-500">
                        未定の場合は空欄のままで構いません
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="border-t pt-4"></div>

              {/* Driver Assignment */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">デフォルト担当ドライバー</h3>
                <p className="text-xs text-gray-500">
                  この作業テンプレートから作成されるシフトのデフォルト担当者
                </p>
                <RadioGroup
                  value={driverAssignmentType}
                  onValueChange={(value) =>
                    setDriverAssignmentType(value as DriverAssignmentType)
                  }
                  disabled={saving}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="staff" id="staff" />
                    <Label htmlFor="staff" className="cursor-pointer">
                      スタッフから選択
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="unassigned" id="unassigned" />
                    <Label htmlFor="unassigned" className="cursor-pointer">
                      未定
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="freetext" id="freetext" />
                    <Label htmlFor="freetext" className="cursor-pointer">
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
                      disabled={saving}
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
                      disabled={saving}
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
                      disabled={saving}
                    />
                    <p className="text-xs text-gray-500">
                      将来の自動架電機能で使用されます
                    </p>
                  </div>
                )}
              </div>

              <div className="border-t pt-4"></div>

              {/* Phone Notification Contacts */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">電話通知対象者</h3>
                <p className="text-xs text-gray-500">
                  未報告時に電話通知する対象者を最大3人まで設定できます
                </p>

                {/* Contact 1 */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">通知対象者 1</h4>
                  </div>

                  <RadioGroup
                    value={contact1Type || ""}
                    onValueChange={(value) => setContact1Type(value as "staff" | "freetext")}
                    disabled={saving}
                  >
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
                        {managers.map((manager) => (
                          <option key={manager.id} value={manager.id}>
                            {manager.name} ({manager.role === "owner" ? "経営者" : "管理者"})
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
                      onValueChange={(value) => setContact2Type(value as "staff" | "freetext")}
                      disabled={saving}
                    >
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
                          {managers.map((manager) => (
                            <option key={manager.id} value={manager.id}>
                              {manager.name} ({manager.role === "owner" ? "経営者" : "管理者"})
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
                    3人目を追加する
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
                      onValueChange={(value) => setContact3Type(value as "staff" | "freetext")}
                      disabled={saving}
                    >
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
                          {managers.map((manager) => (
                            <option key={manager.id} value={manager.id}>
                              {manager.name} ({manager.role === "owner" ? "経営者" : "管理者"})
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

          <div className="flex space-x-4">
            <Button type="submit" disabled={saving}>
              {saving ? "更新中..." : "更新"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/staffs")}
              disabled={saving}
            >
              キャンセル
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
