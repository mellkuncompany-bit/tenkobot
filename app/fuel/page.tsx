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
import { Select } from "@/components/ui/select";
import { useAuth } from "@/lib/hooks/use-auth";
import { getFuelReceipts, generateFuelReport } from "@/lib/services/fuel-receipt-service";
import { getVehicles } from "@/lib/services/vehicle-service";
import { FuelReceipt, Vehicle } from "@/lib/types/firestore";
import { Plus, TrendingUp, Download } from "lucide-react";

export default function FuelPage() {
  const { admin } = useAuth();
  const router = useRouter();
  const [receipts, setReceipts] = useState<FuelReceipt[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState<string>("all");
  const [monthlyReport, setMonthlyReport] = useState<any>(null);

  useEffect(() => {
    if (!admin) return;

    const fetchData = async () => {
      try {
        const [receiptsData, vehiclesData] = await Promise.all([
          getFuelReceipts(admin.organizationId),
          getVehicles(admin.organizationId),
        ]);
        setReceipts(receiptsData);
        setVehicles(vehiclesData);

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

  const getVehicleName = (vehicleId: string) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    return vehicle?.name || "不明";
  };

  const filteredReceipts = selectedVehicle === "all"
    ? receipts
    : receipts.filter((r) => r.vehicleId === selectedVehicle);

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
            <h1 className="text-3xl font-bold text-gray-900">ガソリン管理</h1>
            <p className="text-gray-600 mt-1">ガソリンレシートと燃費を管理します</p>
          </div>
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
                    <TableHead>確認状態</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReceipts.map((receipt) => (
                    <TableRow key={receipt.id}>
                      <TableCell className="font-medium">{receipt.date}</TableCell>
                      <TableCell>{getVehicleName(receipt.vehicleId)}</TableCell>
                      <TableCell>{receipt.liters.toFixed(1)}L</TableCell>
                      <TableCell>¥{receipt.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        {receipt.odometerReading
                          ? `${receipt.odometerReading.toLocaleString()}km`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {receipt.isVerified ? (
                          <Badge variant="success">確認済</Badge>
                        ) : (
                          <Badge variant="warning">未確認</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/fuel/${receipt.id}`)}
                        >
                          <TrendingUp className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Fuel Efficiency by Vehicle */}
        {monthlyReport && Object.keys(monthlyReport.byVehicle).length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>車両別燃料使用状況</CardTitle>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  レポート出力
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>車両</TableHead>
                    <TableHead>給油回数</TableHead>
                    <TableHead>総給油量</TableHead>
                    <TableHead>総燃料費</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(monthlyReport.byVehicle).map(([vehicleId, data]: [string, any]) => (
                    <TableRow key={vehicleId}>
                      <TableCell className="font-medium">
                        {getVehicleName(vehicleId)}
                      </TableCell>
                      <TableCell>{data.receipts.length}回</TableCell>
                      <TableCell>{data.totalLiters.toFixed(1)}L</TableCell>
                      <TableCell>¥{data.totalCost.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
