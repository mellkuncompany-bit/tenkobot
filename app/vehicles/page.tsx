"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/hooks/use-auth";
import { getVehicles, deleteVehicle } from "@/lib/services/vehicle-service";
import { getFuelReceipts, generateFuelReport } from "@/lib/services/fuel-receipt-service";
import { Vehicle, FuelReceipt } from "@/lib/types/firestore";
import { Plus, Pencil, Trash2, AlertTriangle, TrendingUp } from "lucide-react";
import { Select } from "@/components/ui/select";

export default function VehiclesPage() {
  const { admin } = useAuth();
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [fuelReceipts, setFuelReceipts] = useState<FuelReceipt[]>([]);
  const [monthlyReport, setMonthlyReport] = useState<any>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<string>("all");

  useEffect(() => {
    if (!admin) return;

    const fetchData = async () => {
      try {
        const [vehiclesData, receiptsData] = await Promise.all([
          getVehicles(admin.organizationId),
          getFuelReceipts(admin.organizationId),
        ]);
        setVehicles(vehiclesData);
        setFuelReceipts(receiptsData);

        // Generate current month report
        const now = new Date();
        const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const report = await generateFuelReport(admin.organizationId, month);
        setMonthlyReport(report);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [admin]);

  const handleDelete = async (vehicleId: string) => {
    if (!confirm("この車両を削除してもよろしいですか？")) return;

    try {
      await deleteVehicle(vehicleId);
      setVehicles(vehicles.filter((v) => v.id !== vehicleId));
    } catch (error) {
      console.error("Error deleting vehicle:", error);
      alert("削除に失敗しました");
    }
  };

  const isExpiringSoon = (date: any) => {
    if (!date) return false;
    const inspectionDate = date.toDate();
    const now = new Date();
    const diffDays = Math.ceil((inspectionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays >= 0;
  };

  const isExpired = (date: any) => {
    if (!date) return false;
    const inspectionDate = date.toDate();
    return inspectionDate < new Date();
  };

  const getVehicleName = (vehicleId: string) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    return vehicle?.name || "不明";
  };

  const filteredReceipts = selectedVehicle === "all"
    ? fuelReceipts
    : fuelReceipts.filter((r) => r.vehicleId === selectedVehicle);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">車両・燃料管理</h1>
            <p className="text-gray-600 mt-1">車両情報と燃費を管理します</p>
          </div>
          <Button onClick={() => router.push("/vehicles/new")}>
            <Plus className="h-4 w-4 mr-2" />
            車両を追加
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>車両一覧 ({vehicles.length}台)</CardTitle>
          </CardHeader>
          <CardContent>
            {vehicles.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">車両が登録されていません</p>
                <Button onClick={() => router.push("/vehicles/new")}>
                  <Plus className="h-4 w-4 mr-2" />
                  最初の車両を登録
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>車両名</TableHead>
                    <TableHead>ナンバープレート</TableHead>
                    <TableHead>車検期限</TableHead>
                    <TableHead>通知</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.map((vehicle) => (
                    <TableRow key={vehicle.id}>
                      <TableCell className="font-medium">{vehicle.name}</TableCell>
                      <TableCell>{vehicle.licensePlate}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {vehicle.inspectionDate && (
                            <>
                              <span>
                                {vehicle.inspectionDate.toDate().toLocaleDateString("ja-JP")}
                              </span>
                              {isExpired(vehicle.inspectionDate) && (
                                <Badge variant="destructive">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  期限切れ
                                </Badge>
                              )}
                              {!isExpired(vehicle.inspectionDate) &&
                                isExpiringSoon(vehicle.inspectionDate) && (
                                  <Badge variant="warning">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    間もなく期限
                                  </Badge>
                                )}
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {vehicle.inspectionNotificationEnabled ? (
                          <Badge variant="success">ON</Badge>
                        ) : (
                          <Badge variant="outline">OFF</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/vehicles/${vehicle.id}`)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(vehicle.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Fuel Management Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">ガソリン管理</h2>
            <Button onClick={() => router.push("/fuel/new")}>
              <Plus className="h-4 w-4 mr-2" />
              レシートを追加
            </Button>
          </div>

          {/* Monthly Report */}
          {monthlyReport && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    今月の給油回数
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {monthlyReport.receiptCount}回
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    今月の給油量
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {monthlyReport.totalLiters.toFixed(1)}L
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    今月の燃料費
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ¥{monthlyReport.totalCost.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>レシート一覧 ({filteredReceipts.length}件)</CardTitle>
                <div className="flex items-center space-x-2">
                  <Select
                    value={selectedVehicle}
                    onChange={(e) => setSelectedVehicle(e.target.value)}
                  >
                    <option value="all">すべての車両</option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredReceipts.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 mb-4">レシートがありません</p>
                  <Button onClick={() => router.push("/fuel/new")}>
                    <Plus className="h-4 w-4 mr-2" />
                    最初のレシートを登録
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>日付</TableHead>
                      <TableHead>車両</TableHead>
                      <TableHead>給油量</TableHead>
                      <TableHead>金額</TableHead>
                      <TableHead>走行距離</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReceipts.map((receipt) => (
                      <TableRow key={receipt.id}>
                        <TableCell>{receipt.date}</TableCell>
                        <TableCell>{getVehicleName(receipt.vehicleId)}</TableCell>
                        <TableCell>{receipt.liters}L</TableCell>
                        <TableCell>¥{receipt.amount.toLocaleString()}</TableCell>
                        <TableCell>{receipt.odometerReading ? `${receipt.odometerReading}km` : "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/fuel/${receipt.id}`)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
