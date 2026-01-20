"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/hooks/use-auth";
import { createVehicle } from "@/lib/services/vehicle-service";
import { ArrowLeft } from "lucide-react";
import { Timestamp } from "firebase/firestore";

export default function NewVehiclePage() {
  const { admin } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    licensePlate: "",
    inspectionDate: "",
    inspectionNotificationEnabled: true,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    if (!formData.name || !formData.licensePlate || !formData.inspectionDate) {
      setError("すべての必須項目を入力してください");
      return;
    }

    setLoading(true);

    try {
      const inspectionDate = Timestamp.fromDate(new Date(formData.inspectionDate));

      await createVehicle({
        organizationId: admin.organizationId,
        name: formData.name,
        licensePlate: formData.licensePlate,
        inspectionDate,
        inspectionNotificationEnabled: formData.inspectionNotificationEnabled,
        isActive: true,
      });

      router.push("/vehicles");
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
            onClick={() => router.push("/vehicles")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            戻る
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">車両新規登録</h1>
          <p className="text-gray-600 mt-1">新しい車両を登録します</p>
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
                  車両名 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="配送車1号"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="licensePlate">
                  ナンバープレート <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="licensePlate"
                  name="licensePlate"
                  type="text"
                  placeholder="品川 500 あ 12-34"
                  value={formData.licensePlate}
                  onChange={handleChange}
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="inspectionDate">
                  車検期限 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="inspectionDate"
                  name="inspectionDate"
                  type="date"
                  value={formData.inspectionDate}
                  onChange={handleChange}
                  disabled={loading}
                  required
                />
                <p className="text-xs text-gray-500">
                  車検の有効期限を入力してください
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="inspectionNotificationEnabled"
                  checked={formData.inspectionNotificationEnabled}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      inspectionNotificationEnabled: e.target.checked,
                    })
                  }
                  disabled={loading}
                />
                <Label htmlFor="inspectionNotificationEnabled" className="cursor-pointer">
                  1ヶ月前に通知する
                </Label>
              </div>

              <div className="flex items-center space-x-4 pt-4">
                <Button type="submit" disabled={loading}>
                  {loading ? "登録中..." : "登録"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/vehicles")}
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
