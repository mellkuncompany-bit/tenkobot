"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select } from "@/components/ui/select";
import { useAuth } from "@/lib/hooks/use-auth";
import { createWorkTemplate } from "@/lib/services/work-template-service";
import { getStaffsByRole } from "@/lib/services/staff-service";
import {
  createStaffDriverAssignment,
  createUnassignedDriverAssignment,
  createFreetextDriverAssignment,
} from "@/lib/services/driver-assignment-service";
import { Staff, DriverAssignmentType } from "@/lib/types/firestore";
import { ArrowLeft } from "lucide-react";

export default function NewWorkTemplatePage() {
  const { admin } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    notes: "",
    reportCheckTime: "",
    requiresRollCall: false, // 点呼確認対象
    workDate: "", // 作業日（何月何日）

    // Recurring schedule
    useRecurringSchedule: false,
    daysOfWeek: [] as number[],
    excludeHolidays: false,
    endDate: "", // 開始日は削除、終了日のみ
  });

  // Driver assignment state
  const [driverAssignmentType, setDriverAssignmentType] =
    useState<DriverAssignmentType>("unassigned");
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [freetextDriverName, setFreetextDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [drivers, setDrivers] = useState<Staff[]>([]);

  // Load drivers
  useEffect(() => {
    if (!admin) return;
    getStaffsByRole(admin.organizationId, "driver").then(setDrivers);
  }, [admin]);

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
    if (!admin) return;
    setLoading(true);

    try {
      const recurringSchedule = formData.useRecurringSchedule
        ? {
            daysOfWeek: formData.daysOfWeek,
            excludeHolidays: formData.excludeHolidays,
            startDate: null, // 開始日は不要
            endDate: formData.endDate || null,
          }
        : null;

      // Build driver assignment
      let defaultDriverAssignment = null;
      if (driverAssignmentType === "staff") {
        if (selectedDriverId) {
          defaultDriverAssignment = createStaffDriverAssignment(
            selectedDriverId,
            driverPhone || undefined
          );
        }
      } else if (driverAssignmentType === "freetext") {
        if (freetextDriverName) {
          defaultDriverAssignment = createFreetextDriverAssignment(
            freetextDriverName,
            driverPhone || undefined
          );
        }
      } else {
        defaultDriverAssignment = createUnassignedDriverAssignment();
      }

      await createWorkTemplate({
        organizationId: admin.organizationId,
        name: formData.name,
        description: formData.description,
        notes: formData.notes,
        reportCheckTime: formData.reportCheckTime || null,
        requiresRollCall: formData.requiresRollCall,
        recurringSchedule,
        unitPrice: 0, // 管理者専用ページで設定
        defaultDriverAssignment,
        escalationPolicyId: null, // 今後実装
        isActive: true,
      });

      router.push("/staffs");
    } catch (error) {
      alert("登録に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const dayNames = ["日", "月", "火", "水", "木", "金", "土"];

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
          <h1 className="text-3xl font-bold">作業マスタ新規登録</h1>
          <p className="text-gray-600 mt-1">新しい作業マスタを登録します</p>
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
                  disabled={loading}
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
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">注意事項</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="workDate">作業日</Label>
                <Input
                  id="workDate"
                  type="date"
                  value={formData.workDate}
                  onChange={(e) =>
                    setFormData({ ...formData, workDate: e.target.value })
                  }
                  disabled={loading}
                />
                <p className="text-xs text-gray-500">
                  作業を実施する日付を選択してください
                </p>
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
                  disabled={loading}
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
                  disabled={loading}
                />
                <Label htmlFor="requiresRollCall" className="cursor-pointer">
                  点呼確認対象にする（作業開始時刻に点呼が必要）
                </Label>
              </div>

              {/* 単価設定は管理者専用ページで設定 */}
              {/*
              <div className="space-y-2">
                <Label htmlFor="unitPrice">単価（円）</Label>
                <Input
                  id="unitPrice"
                  type="number"
                  min="0"
                  placeholder="5000"
                  value={formData.unitPrice}
                  onChange={(e) =>
                    setFormData({ ...formData, unitPrice: Number(e.target.value) })
                  }
                  disabled={loading}
                />
                <p className="text-xs text-gray-500">
                  請求書生成時に使用される単価は「管理者専用」ページで設定してください
                </p>
              </div>
              */}
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
                    disabled={loading}
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
                              disabled={loading}
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
                        disabled={loading}
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
                        disabled={loading}
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
                  disabled={loading}
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
            </CardContent>
          </Card>

          <div className="flex space-x-4">
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
