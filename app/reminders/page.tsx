"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
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
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/hooks/use-auth";
import { getDriversWithExpiringLicense } from "@/lib/services/staff-service";
import { getVehiclesWithExpiringInspection } from "@/lib/services/vehicle-service";
import { Staff, Vehicle } from "@/lib/types/firestore";
import { AlertTriangle, Bell, CheckCircle } from "lucide-react";

export default function RemindersPage() {
  const { admin } = useAuth();
  const [expiringLicenses, setExpiringLicenses] = useState<Staff[]>([]);
  const [expiringInspections, setExpiringInspections] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!admin) return;

    const fetchData = async () => {
      try {
        // Get items expiring within 30 days
        const [licenses, inspections] = await Promise.all([
          getDriversWithExpiringLicense(admin.organizationId, 30),
          getVehiclesWithExpiringInspection(admin.organizationId, 30),
        ]);
        setExpiringLicenses(licenses);
        setExpiringInspections(inspections);
      } catch (error) {
        console.error("Error fetching reminders:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [admin]);

  const getDaysUntilExpiry = (date: any) => {
    if (!date) return 999;
    const expiryDate = date.toDate();
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getUrgencyBadge = (days: number) => {
    if (days < 0) {
      return (
        <Badge variant="destructive">
          <AlertTriangle className="h-3 w-3 mr-1" />
          期限切れ
        </Badge>
      );
    } else if (days <= 7) {
      return (
        <Badge variant="destructive">
          <AlertTriangle className="h-3 w-3 mr-1" />
          緊急
        </Badge>
      );
    } else if (days <= 14) {
      return (
        <Badge variant="warning">
          <Bell className="h-3 w-3 mr-1" />
          警告
        </Badge>
      );
    } else {
      return (
        <Badge variant="info">
          <Bell className="h-3 w-3 mr-1" />
          注意
        </Badge>
      );
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

  const totalReminders = expiringLicenses.length + expiringInspections.length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">リマインダー</h1>
          <p className="text-gray-600 mt-1">免許と車検の期限を管理します</p>
        </div>

        {totalReminders === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  すべて期限内です
                </h3>
                <p className="text-gray-500">
                  30日以内に期限が切れる項目はありません
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Card */}
            <Card>
              <CardContent className="py-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      リマインダー概要
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      30日以内に期限が切れる項目
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-orange-600">
                      {totalReminders}
                    </div>
                    <div className="text-sm text-gray-600">件</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* License Expiry */}
            {expiringLicenses.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    免許有効期限 ({expiringLicenses.length}件)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>スタッフ名</TableHead>
                        <TableHead>電話番号</TableHead>
                        <TableHead>有効期限</TableHead>
                        <TableHead>残り日数</TableHead>
                        <TableHead>緊急度</TableHead>
                        <TableHead>通知</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expiringLicenses.map((staff) => {
                        const daysLeft = getDaysUntilExpiry(staff.licenseExpiryDate);
                        return (
                          <TableRow key={staff.id}>
                            <TableCell className="font-medium">
                              {staff.name}
                            </TableCell>
                            <TableCell>{staff.phoneNumber}</TableCell>
                            <TableCell>
                              {staff.licenseExpiryDate?.toDate().toLocaleDateString("ja-JP")}
                            </TableCell>
                            <TableCell>
                              {daysLeft < 0 ? (
                                <span className="text-red-600 font-bold">
                                  {Math.abs(daysLeft)}日超過
                                </span>
                              ) : (
                                <span className={daysLeft <= 7 ? "text-red-600 font-bold" : ""}>
                                  あと{daysLeft}日
                                </span>
                              )}
                            </TableCell>
                            <TableCell>{getUrgencyBadge(daysLeft)}</TableCell>
                            <TableCell>
                              {staff.licenseNotificationEnabled ? (
                                <Badge variant="success">ON</Badge>
                              ) : (
                                <Badge variant="outline">OFF</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Vehicle Inspection */}
            {expiringInspections.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    車検期限 ({expiringInspections.length}件)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>車両名</TableHead>
                        <TableHead>ナンバープレート</TableHead>
                        <TableHead>車検期限</TableHead>
                        <TableHead>残り日数</TableHead>
                        <TableHead>緊急度</TableHead>
                        <TableHead>通知</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expiringInspections.map((vehicle) => {
                        const daysLeft = getDaysUntilExpiry(vehicle.inspectionDate);
                        return (
                          <TableRow key={vehicle.id}>
                            <TableCell className="font-medium">
                              {vehicle.name}
                            </TableCell>
                            <TableCell>{vehicle.licensePlate}</TableCell>
                            <TableCell>
                              {vehicle.inspectionDate.toDate().toLocaleDateString("ja-JP")}
                            </TableCell>
                            <TableCell>
                              {daysLeft < 0 ? (
                                <span className="text-red-600 font-bold">
                                  {Math.abs(daysLeft)}日超過
                                </span>
                              ) : (
                                <span className={daysLeft <= 7 ? "text-red-600 font-bold" : ""}>
                                  あと{daysLeft}日
                                </span>
                              )}
                            </TableCell>
                            <TableCell>{getUrgencyBadge(daysLeft)}</TableCell>
                            <TableCell>
                              {vehicle.inspectionNotificationEnabled ? (
                                <Badge variant="success">ON</Badge>
                              ) : (
                                <Badge variant="outline">OFF</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
