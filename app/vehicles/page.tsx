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
import { Vehicle } from "@/lib/types/firestore";
import { Plus, Pencil, Trash2, AlertTriangle } from "lucide-react";

export default function VehiclesPage() {
  const { admin } = useAuth();
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!admin) return;

    const fetchVehicles = async () => {
      try {
        const data = await getVehicles(admin.organizationId);
        setVehicles(data);
      } catch (error) {
        console.error("Error fetching vehicles:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
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

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>ガソリン管理</CardTitle>
              <Button onClick={() => router.push("/fuel")}>
                詳細を見る
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              ガソリンレシートの管理と燃費レポートは「ガソリン管理」ページで確認できます。
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
