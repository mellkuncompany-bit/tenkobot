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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/hooks/use-auth";
import { getInvoices, generateInvoiceForMonth } from "@/lib/services/invoice-service";
import { Invoice } from "@/lib/types/firestore";
import { Plus, FileText, Download } from "lucide-react";

export default function InvoicesPage() {
  const { admin } = useAuth();
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateData, setGenerateData] = useState({
    clientName: "",
    clientAddress: "",
  });

  useEffect(() => {
    if (!admin) return;

    const fetchInvoices = async () => {
      try {
        const data = await getInvoices(admin.organizationId);
        setInvoices(data);
      } catch (error) {
        console.error("Error fetching invoices:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [admin]);

  const handleGenerateInvoice = async () => {
    if (!admin) return;
    if (!generateData.clientName || !generateData.clientAddress) {
      alert("クライアント名と住所を入力してください");
      return;
    }

    setGenerating(true);
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      await generateInvoiceForMonth(
        admin.organizationId,
        year,
        month,
        generateData.clientName,
        generateData.clientAddress
      );

      // Refresh data
      const data = await getInvoices(admin.organizationId);
      setInvoices(data);

      setShowGenerateModal(false);
      setGenerateData({ clientName: "", clientAddress: "" });
      alert("請求書を生成しました");
    } catch (error) {
      console.error("Error generating invoice:", error);
      alert("生成に失敗しました");
    } finally {
      setGenerating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline">下書き</Badge>;
      case "sent":
        return <Badge variant="info">送信済</Badge>;
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
            <h1 className="text-3xl font-bold text-gray-900">請求書</h1>
            <p className="text-gray-600 mt-1">請求書を管理します</p>
          </div>
          <Button onClick={() => setShowGenerateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            今月の請求書を生成
          </Button>
        </div>

        {showGenerateModal && (
          <Card>
            <CardHeader>
              <CardTitle>請求書の生成</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clientName">
                  クライアント名 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="clientName"
                  value={generateData.clientName}
                  onChange={(e) =>
                    setGenerateData({ ...generateData, clientName: e.target.value })
                  }
                  placeholder="株式会社サンプル"
                  disabled={generating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientAddress">
                  住所 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="clientAddress"
                  value={generateData.clientAddress}
                  onChange={(e) =>
                    setGenerateData({ ...generateData, clientAddress: e.target.value })
                  }
                  placeholder="東京都渋谷区..."
                  disabled={generating}
                />
              </div>

              <div className="flex space-x-4">
                <Button onClick={handleGenerateInvoice} disabled={generating}>
                  {generating ? "生成中..." : "生成"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowGenerateModal(false);
                    setGenerateData({ clientName: "", clientAddress: "" });
                  }}
                  disabled={generating}
                >
                  キャンセル
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>請求書一覧 ({invoices.length}件)</CardTitle>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">請求書がありません</p>
                <Button onClick={() => setShowGenerateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  請求書を生成
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>請求書番号</TableHead>
                    <TableHead>対象月</TableHead>
                    <TableHead>クライアント</TableHead>
                    <TableHead>小計</TableHead>
                    <TableHead>消費税</TableHead>
                    <TableHead>合計</TableHead>
                    <TableHead>支払期限</TableHead>
                    <TableHead>状態</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        {invoice.invoiceNumber}
                      </TableCell>
                      <TableCell>
                        {invoice.year}年{invoice.month}月
                      </TableCell>
                      <TableCell>{invoice.clientName}</TableCell>
                      <TableCell>¥{invoice.subtotal.toLocaleString()}</TableCell>
                      <TableCell>¥{invoice.tax.toLocaleString()}</TableCell>
                      <TableCell className="font-bold">
                        ¥{invoice.total.toLocaleString()}
                      </TableCell>
                      <TableCell>{invoice.dueDate}</TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/invoices/${invoice.id}`)}
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
