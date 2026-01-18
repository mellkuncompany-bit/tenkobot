"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getStaff, updateStaff } from "@/lib/services/staff-service";
import { Staff, StaffRole } from "@/lib/types/firestore";
import { ArrowLeft } from "lucide-react";

export default function EditStaffPage() {
  const router = useRouter();
  const params = useParams();
  const staffId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [staff, setStaff] = useState<Staff | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    role: "general" as StaffRole,
    phoneNumber: "",
    lineUserId: "",
    isEscalationTarget: false,
  });

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const data = await getStaff(staffId);
        if (!data) {
          setError("スタッフが見つかりません");
          return;
        }
        setStaff(data);
        setFormData({
          name: data.name,
          role: data.role,
          phoneNumber: data.phoneNumber,
          lineUserId: data.lineUserId || "",
          isEscalationTarget: data.isEscalationTarget,
        });
      } catch (err) {
        console.error("Error fetching staff:", err);
        setError("スタッフ情報の取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchStaff();
  }, [staffId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name || !formData.phoneNumber) {
      setError("氏名と電話番号は必須です");
      return;
    }

    setSaving(true);

    try {
      await updateStaff(staffId, {
        name: formData.name,
        role: formData.role,
        phoneNumber: formData.phoneNumber,
        lineUserId: formData.lineUserId || null,
        isEscalationTarget: formData.isEscalationTarget,
      });

      router.push("/staffs");
    } catch (err: any) {
      setError(err.message || "更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

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
      <div className="max-w-2xl mx-auto space-y-6">
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

        <Card>
          <CardHeader>
            <CardTitle>基本情報</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                  {error}
                </div>
              )}

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
                  <option value="general">一般</option>
                  <option value="leader">リーダー</option>
                  <option value="assistant">管理補助</option>
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
                  disabled={saving}
                />
                <p className="text-xs text-gray-500">
                  LINE公式アカウントから取得したUser IDを入力してください
                </p>
              </div>

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
                  disabled={saving}
                />
                <Label htmlFor="isEscalationTarget" className="cursor-pointer">
                  エスカレーション受信対象にする
                </Label>
              </div>
              <p className="text-xs text-gray-500 ml-6">
                他のスタッフが未反応の場合、このスタッフに通知が送られます
              </p>

              <div className="flex items-center space-x-4 pt-4">
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
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
