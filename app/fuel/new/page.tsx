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
import { useAuth } from "@/lib/hooks/use-auth";
import { createFuelReceipt } from "@/lib/services/fuel-receipt-service";
import { getVehicles } from "@/lib/services/vehicle-service";
import { getStaffs } from "@/lib/services/staff-service";
import { Vehicle, Staff } from "@/lib/types/firestore";
import { ArrowLeft, Camera } from "lucide-react";

export default function NewFuelReceiptPage() {
  const { admin } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [formData, setFormData] = useState({
    vehicleId: "",
    staffId: "",
    date: new Date().toISOString().split("T")[0],
    amount: "",
    liters: "",
    odometerReading: "",
    isVerified: false,
  });

  useEffect(() => {
    if (!admin) return;

    const fetchData = async () => {
      try {
        const [vehiclesData, staffsData] = await Promise.all([
          getVehicles(admin.organizationId),
          getStaffs(admin.organizationId),
        ]);
        setVehicles(vehiclesData);
        setStaffs(staffsData);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, [admin]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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

    if (!formData.vehicleId || !formData.staffId || !formData.amount || !formData.liters) {
      setError("必須項目を入力してください");
      return;
    }

    setLoading(true);

    try {
      await createFuelReceipt({
        organizationId: admin.organizationId,
        vehicleId: formData.vehicleId,
        staffId: formData.staffId,
        date: formData.date,
        amount: parseFloat(formData.amount),
        liters: parseFloat(formData.liters),
        odometerReading: formData.odometerReading
          ? parseFloat(formData.odometerReading)
          : null,
        receiptImageUrl: "", // Placeholder - would be set after image upload
        ocrData: null,
        isVerified: formData.isVerified,
      });

      router.push("/fuel");
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
            onClick={() => router.push("/fuel")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            戻る
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">ガソリンレシート登録</h1>
          <p className="text-gray-600 mt-1">給油記録を手動で登録します</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>給油情報</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="vehicleId">
                  車両 <span className="text-red-500">*</span>
                </Label>
                <Select
                  id="vehicleId"
                  name="vehicleId"
                  value={formData.vehicleId}
                  onChange={handleChange}
                  disabled={loading}
                  required
                >
                  <option value="">選択してください</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.name} ({vehicle.licensePlate})
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="staffId">
                  給油者 <span className="text-red-500">*</span>
                </Label>
                <Select
                  id="staffId"
                  name="staffId"
                  value={formData.staffId}
                  onChange={handleChange}
                  disabled={loading}
                  required
                >
                  <option value="">選択してください</option>
                  {staffs.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">
                  給油日 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleChange}
                  disabled={loading}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">
                    金額（円） <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="5000"
                    value={formData.amount}
                    onChange={handleChange}
                    disabled={loading}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="liters">
                    給油量（L） <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="liters"
                    name="liters"
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="30.5"
                    value={formData.liters}
                    onChange={handleChange}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="odometerReading">走行距離（km）</Label>
                <Input
                  id="odometerReading"
                  name="odometerReading"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="12345"
                  value={formData.odometerReading}
                  onChange={handleChange}
                  disabled={loading}
                />
                <p className="text-xs text-gray-500">
                  走行距離を入力すると燃費計算ができます
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isVerified"
                  checked={formData.isVerified}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      isVerified: e.target.checked,
                    })
                  }
                  disabled={loading}
                />
                <Label htmlFor="isVerified" className="cursor-pointer">
                  確認済みとしてマーク
                </Label>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex items-start space-x-2">
                  <Camera className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">レシート画像のOCR機能</p>
                    <p>
                      LINEからレシート画像を送信すると、自動的に金額とリットルを読み取ります。
                      この画面は手動登録用です。
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4 pt-4">
                <Button type="submit" disabled={loading}>
                  {loading ? "登録中..." : "登録"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/fuel")}
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
