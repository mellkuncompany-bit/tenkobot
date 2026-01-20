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
import { getPayrollRecords, generatePayrollForMonth } from "@/lib/services/payroll-service";
import { getStaffs } from "@/lib/services/staff-service";
import { PayrollRecord, Staff } from "@/lib/types/firestore";
import { Plus, FileText, Download } from "lucide-react";

export default function PayrollPage() {
  const { admin } = useAuth();
  const router = useRouter();
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!admin) return;

    const fetchData = async () => {
      try {
        const [payrollsData, staffsData] = await Promise.all([
          getPayrollRecords(admin.organizationId),
          getStaffs(admin.organizationId),
        ]);
        setPayrolls(payrollsData);
        setStaffs(staffsData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [admin]);

  const getStaffName = (staffId: string) => {
    const staff = staffs.find((s) => s.id === staffId);
    return staff?.name || "不明";
  };

  const handleGeneratePayroll = async () => {
    if (!admin) return;
    if (!confirm("今月の給料明細を自動生成しますか？")) return;

    setGenerating(true);
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      await generatePayrollForMonth(admin.organizationId, year, month);

      // Refresh data
      const payrollsData = await getPayrollRecords(admin.organizationId);
      setPayrolls(payrollsData);

      alert("給料明細を生成しました");
    } catch (error) {
      console.error("Error generating payroll:", error);
      alert("生成に失敗しました");
    } finally {
      setGenerating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline">下書き</Badge>;
      case "confirmed":
        return <Badge variant="info">確定</Badge>;
      case "paid":
        return <Badge variant="success">支払済</Badge>;
      default:
        return <Badge>{status}</Badge>;
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">給料明細</h1>
            <p className="text-gray-600 mt-1">スタッフの給料明細を管理します</p>
          </div>
          <Button onClick={handleGeneratePayroll} disabled={generating}>
            <Plus className="h-4 w-4 mr-2" />
            {generating ? "生成中..." : "今月の明細を生成"}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>給料明細一覧 ({payrolls.length}件)</CardTitle>
          </CardHeader>
          <CardContent>
            {payrolls.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">給料明細がありません</p>
                <Button onClick={handleGeneratePayroll} disabled={generating}>
                  <Plus className="h-4 w-4 mr-2" />
                  明細を生成
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>対象月</TableHead>
                    <TableHead>スタッフ</TableHead>
                    <TableHead>勤務日数</TableHead>
                    <TableHead>基本給</TableHead>
                    <TableHead>残業代</TableHead>
                    <TableHead>支給額</TableHead>
                    <TableHead>状態</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrolls.map((payroll) => (
                    <TableRow key={payroll.id}>
                      <TableCell className="font-medium">
                        {payroll.year}年{payroll.month}月
                      </TableCell>
                      <TableCell>{getStaffName(payroll.staffId)}</TableCell>
                      <TableCell>{payroll.workDays}日</TableCell>
                      <TableCell>¥{payroll.basePayment.toLocaleString()}</TableCell>
                      <TableCell>¥{payroll.overtimePayment.toLocaleString()}</TableCell>
                      <TableCell className="font-bold">
                        ¥{payroll.totalPayment.toLocaleString()}
                      </TableCell>
                      <TableCell>{getStatusBadge(payroll.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/payroll/${payroll.id}`)}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
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
    </DashboardLayout>
  );
}
