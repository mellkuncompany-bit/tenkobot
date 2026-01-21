"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/hooks/use-auth";
import { createVehicle } from "@/lib/services/vehicle-service";
import { getStaffs } from "@/lib/services/staff-service";
import { Staff } from "@/lib/types/firestore";
import { ArrowLeft, UserPlus, X } from "lucide-react";
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

  // Administrator selection
  const [administrators, setAdministrators] = useState<Staff[]>([]);
  const [selectedAdminIds, setSelectedAdminIds] = useState<string[]>([]);
  const [showAdminModal, setShowAdminModal] = useState(false);

  // Fetch administrators (managers and owners)
  useEffect(() => {
    if (!admin) return;

    getStaffs(admin.organizationId).then((staffs) => {
      const admins = staffs.filter(
        (s) => s.role === "manager" || s.role === "owner"
      );
      setAdministrators(admins);
    });
  }, [admin]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const toggleAdminSelection = (adminId: string) => {
    setSelectedAdminIds((prev) =>
      prev.includes(adminId)
        ? prev.filter((id) => id !== adminId)
        : [...prev, adminId]
    );
  };

  const removeSelectedAdmin = (adminId: string) => {
    setSelectedAdminIds((prev) => prev.filter((id) => id !== adminId));
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
        inspectionNotificationAdminIds: selectedAdminIds,
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

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="inspectionNotificationEnabled"
                    checked={formData.inspectionNotificationEnabled}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData({
                        ...formData,
                        inspectionNotificationEnabled: e.target.checked,
                      })
                    }
                    disabled={loading}
                  />
                  <Label htmlFor="inspectionNotificationEnabled" className="cursor-pointer">
                    1か月前に管理者に通知する
                  </Label>
                </div>

                {formData.inspectionNotificationEnabled && (
                  <div className="ml-6 space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAdminModal(true)}
                      disabled={loading}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      通知先管理者を選択
                    </Button>

                    {selectedAdminIds.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-700">
                          選択された管理者 ({selectedAdminIds.length}人)
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {selectedAdminIds.map((adminId) => {
                            const adminData = administrators.find(
                              (a) => a.id === adminId
                            );
                            return (
                              <div
                                key={adminId}
                                className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm"
                              >
                                <span>{adminData?.name || "不明"}</span>
                                <button
                                  type="button"
                                  onClick={() => removeSelectedAdmin(adminId)}
                                  className="hover:bg-blue-100 rounded-full p-0.5"
                                  disabled={loading}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
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

      {/* Administrator Selection Modal */}
      <Dialog open={showAdminModal} onOpenChange={setShowAdminModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>通知先管理者を選択</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {administrators.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                管理者が登録されていません
              </p>
            ) : (
              administrators.map((admin) => (
                <div
                  key={admin.id}
                  className="flex items-center space-x-2 p-3 hover:bg-gray-50 rounded-md cursor-pointer"
                  onClick={() => toggleAdminSelection(admin.id)}
                >
                  <Checkbox
                    id={`admin-${admin.id}`}
                    checked={selectedAdminIds.includes(admin.id)}
                    onChange={() => toggleAdminSelection(admin.id)}
                  />
                  <Label
                    htmlFor={`admin-${admin.id}`}
                    className="flex-1 cursor-pointer"
                  >
                    <div>
                      <p className="font-medium">{admin.name}</p>
                      <p className="text-xs text-gray-500">
                        {admin.role === "owner" ? "経営者" : "管理者"}
                      </p>
                    </div>
                  </Label>
                </div>
              ))
            )}
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAdminModal(false)}
            >
              閉じる
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
