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
import { createStaff } from "@/lib/services/staff-service";
import { StaffRole } from "@/lib/types/firestore";
import { ArrowLeft } from "lucide-react";

export default function NewStaffPage() {
  const { admin } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    role: "general" as StaffRole,
    phoneNumber: "",
    lineUserId: "",
    isEscalationTarget: false,
  });

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
      await createStaff({
        organizationId: admin.organizationId,
        name: formData.name,
        role: formData.role,
        phoneNumber: formData.phoneNumber,
        lineUserId: formData.lineUserId || null,
        isEscalationTarget: formData.isEscalationTarget,
        isActive: true,
      });

      router.push("/staffs");
    } catch (err: any) {
      setError(err.message || "登録に失敗しました");
    } finally {
      setLoading(false);
    }
  };

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
          <h1 className="text-3xl font-bold text-gray-900">スタッフ新規登録</h1>
          <p className="text-gray-600 mt-1">新しいスタッフを登録します</p>
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
              <p className="text-xs text-gray-500 ml-6">
                他のスタッフが未反応の場合、このスタッフに通知が送られます
              </p>

              <div className="flex items-center space-x-4 pt-4">
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
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
