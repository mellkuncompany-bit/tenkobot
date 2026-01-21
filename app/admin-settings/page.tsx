"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/lib/hooks/use-auth";
import { getStaffs, updateStaff } from "@/lib/services/staff-service";
import { getWorkTemplates, updateWorkTemplate } from "@/lib/services/work-template-service";
import { Staff, WorkTemplate } from "@/lib/types/firestore";
import { Lock, FileText, DollarSign, Receipt } from "lucide-react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";

export default function AdminSettingsPage() {
  const { admin } = useAuth();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"price" | "payroll" | "invoice">("price");

  // Data states
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [templates, setTemplates] = useState<WorkTemplate[]>([]);
  const [hasPassword, setHasPassword] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    const authStatus = sessionStorage.getItem("adminSettingsAuth");
    if (authStatus === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  // Check if password is set
  useEffect(() => {
    if (!admin) return;

    const checkPassword = async () => {
      const orgDoc = await getDoc(doc(db, COLLECTIONS.ORGANIZATIONS, admin.organizationId));
      const orgData = orgDoc.data();
      setHasPassword(!!orgData?.adminPasswordHash);
    };

    checkPassword();
  }, [admin]);

  // Load data when authenticated
  useEffect(() => {
    if (!admin || !isAuthenticated) return;

    const loadData = async () => {
      const [staffsData, templatesData] = await Promise.all([
        getStaffs(admin.organizationId),
        getWorkTemplates(admin.organizationId),
      ]);
      setStaffs(staffsData);
      setTemplates(templatesData);
    };

    loadData();
  }, [admin, isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admin) return;

    setLoading(true);
    setError("");

    try {
      const orgDoc = await getDoc(doc(db, COLLECTIONS.ORGANIZATIONS, admin.organizationId));
      const orgData = orgDoc.data();

      // If no password is set, set one
      if (!orgData?.adminPasswordHash) {
        if (password.length < 4) {
          setError("パスワードは4文字以上で設定してください");
          setLoading(false);
          return;
        }

        // Simple hash (in production, use bcrypt)
        const hash = btoa(password);
        await updateDoc(doc(db, COLLECTIONS.ORGANIZATIONS, admin.organizationId), {
          adminPasswordHash: hash,
        });

        setIsAuthenticated(true);
        sessionStorage.setItem("adminSettingsAuth", "true");
      } else {
        // Verify password
        const hash = btoa(password);
        if (hash === orgData.adminPasswordHash) {
          setIsAuthenticated(true);
          sessionStorage.setItem("adminSettingsAuth", "true");
        } else {
          setError("パスワードが正しくありません");
        }
      }
    } catch (err) {
      console.error(err);
      setError("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem("adminSettingsAuth");
    setPassword("");
  };

  const handleUpdateTemplatePrice = async (templateId: string, unitPrice: number) => {
    try {
      await updateWorkTemplate(templateId, { unitPrice });
      // Reload templates
      const templatesData = await getWorkTemplates(admin!.organizationId);
      setTemplates(templatesData);
    } catch (err) {
      alert("更新に失敗しました");
    }
  };

  if (!isAuthenticated) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-center mb-4">
                <Lock className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="text-center">管理者専用ページ</CardTitle>
              <CardDescription className="text-center">
                {hasPassword
                  ? "パスワードを入力してください"
                  : "初回アクセスです。パスワードを設定してください（4文字以上）"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">パスワード</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={hasPassword ? "パスワードを入力" : "パスワードを設定（4文字以上）"}
                    required
                    autoFocus
                  />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "処理中..." : hasPassword ? "ログイン" : "パスワードを設定"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">管理者専用設定</h1>
            <p className="text-gray-600 mt-1">単価設定・給料明細・請求書管理</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            ログアウト
          </Button>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex space-x-4">
            <button
              className={`pb-2 px-4 ${
                activeTab === "price"
                  ? "border-b-2 border-primary font-semibold"
                  : "text-gray-600"
              }`}
              onClick={() => setActiveTab("price")}
            >
              <DollarSign className="h-4 w-4 inline mr-2" />
              単価設定
            </button>
            <button
              className={`pb-2 px-4 ${
                activeTab === "payroll"
                  ? "border-b-2 border-primary font-semibold"
                  : "text-gray-600"
              }`}
              onClick={() => setActiveTab("payroll")}
            >
              <FileText className="h-4 w-4 inline mr-2" />
              給料明細
            </button>
            <button
              className={`pb-2 px-4 ${
                activeTab === "invoice"
                  ? "border-b-2 border-primary font-semibold"
                  : "text-gray-600"
              }`}
              onClick={() => setActiveTab("invoice")}
            >
              <Receipt className="h-4 w-4 inline mr-2" />
              請求書
            </button>
          </div>
        </div>

        {/* Price Settings Tab */}
        {activeTab === "price" && (
          <Card>
            <CardHeader>
              <CardTitle>作業単価設定</CardTitle>
              <CardDescription>各作業テンプレートの単価を管理します</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>作業名</TableHead>
                    <TableHead>説明</TableHead>
                    <TableHead>単価（円）</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <PriceRow
                      key={template.id}
                      template={template}
                      onUpdate={handleUpdateTemplatePrice}
                    />
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Payroll Tab */}
        {activeTab === "payroll" && (
          <Card>
            <CardHeader>
              <CardTitle>給料明細</CardTitle>
              <CardDescription>自動生成された給料明細を管理します（開発中）</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">この機能は開発中です</p>
            </CardContent>
          </Card>
        )}

        {/* Invoice Tab */}
        {activeTab === "invoice" && (
          <Card>
            <CardHeader>
              <CardTitle>請求書</CardTitle>
              <CardDescription>自動生成された請求書を管理します（開発中）</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">この機能は開発中です</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

// Price Row Component
function PriceRow({
  template,
  onUpdate,
}: {
  template: WorkTemplate;
  onUpdate: (id: string, price: number) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [unitPrice, setUnitPrice] = useState(template.unitPrice || 0);

  const handleSave = () => {
    onUpdate(template.id, unitPrice);
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <TableRow>
        <TableCell>{template.name}</TableCell>
        <TableCell className="max-w-md truncate">{template.description}</TableCell>
        <TableCell>¥{template.unitPrice?.toLocaleString() || 0}</TableCell>
        <TableCell>
          <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
            編集
          </Button>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell>{template.name}</TableCell>
      <TableCell className="max-w-md truncate">{template.description}</TableCell>
      <TableCell>
        <Input
          type="number"
          value={unitPrice}
          onChange={(e) => setUnitPrice(Number(e.target.value))}
          className="w-32"
        />
      </TableCell>
      <TableCell>
        <div className="flex space-x-2">
          <Button size="sm" onClick={handleSave}>
            保存
          </Button>
          <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
            キャンセル
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
