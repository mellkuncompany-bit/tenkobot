"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/hooks/use-auth";
import { getOrganization, updateLINEConfig } from "@/lib/services/organization-service";
import { Settings as SettingsIcon, User, Building, Bell, Copy, MessageSquare, Check } from "lucide-react";

export default function SettingsPage() {
  const { admin } = useAuth();
  const [lineConfig, setLineConfig] = useState({
    channelAccessToken: "",
    channelSecret: "",
    isConfigured: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copied, setCopied] = useState(false);

  const webhookUrl = admin?.organizationId
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/api/line/webhook?orgId=${admin.organizationId}`
    : "";

  useEffect(() => {
    async function loadLINEConfig() {
      if (!admin?.organizationId) return;

      try {
        const org = await getOrganization(admin.organizationId);
        if (org?.lineConfig?.isConfigured) {
          setLineConfig({
            channelAccessToken: org.lineConfig.channelAccessToken,
            channelSecret: org.lineConfig.channelSecret,
            isConfigured: org.lineConfig.isConfigured,
          });
        }
      } catch (err) {
        console.error("Failed to load LINE config:", err);
      }
    }

    loadLINEConfig();
  }, [admin?.organizationId]);

  const handleSaveLINEConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!admin?.organizationId) {
      setError("組織情報が取得できません");
      return;
    }

    if (!lineConfig.channelAccessToken || !lineConfig.channelSecret) {
      setError("Channel Access TokenとChannel Secretは必須です");
      return;
    }

    setLoading(true);

    try {
      await updateLINEConfig(admin.organizationId, {
        channelAccessToken: lineConfig.channelAccessToken,
        channelSecret: lineConfig.channelSecret,
        webhookUrl,
      });

      setSuccess("LINE連携設定を保存しました");
      setLineConfig(prev => ({ ...prev, isConfigured: true }));
    } catch (err: any) {
      setError(err.message || "保存に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyWebhookUrl = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold">設定</h1>
          <p className="text-gray-600 mt-1">アカウントとシステムの設定</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              アカウント情報
            </CardTitle>
            <CardDescription>管理者アカウントの基本情報</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">表示名</Label>
              <Input
                id="displayName"
                value={admin?.displayName || ""}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input id="email" value={admin?.email || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">役割</Label>
              <Input id="role" value={admin?.role || ""} disabled />
            </div>
            <Button variant="outline" disabled>
              プロフィールを編集
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building className="h-5 w-5 mr-2" />
              組織情報
            </CardTitle>
            <CardDescription>組織の基本設定</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="orgId">組織ID</Label>
              <Input
                id="orgId"
                value={admin?.organizationId || ""}
                disabled
                className="font-mono text-xs"
              />
            </div>
            <p className="text-sm text-gray-500">
              組織情報の編集機能は開発中です
            </p>
          </CardContent>
        </Card>

        {admin?.role === "owner" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                LINE連携設定
              </CardTitle>
              <CardDescription>
                組織専用のLINE Messaging API認証情報を設定
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveLINEConfig} className="space-y-4">
                {error && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="bg-green-50 text-green-600 p-3 rounded-md text-sm">
                    {success}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="webhookUrl">Webhook URL</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="webhookUrl"
                      value={webhookUrl}
                      disabled
                      className="font-mono text-xs flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCopyWebhookUrl}
                      disabled={!webhookUrl}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    このURLをLINE Developers ConsoleのWebhook URLに設定してください
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="channelAccessToken">
                    Channel Access Token <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="channelAccessToken"
                    type="password"
                    placeholder="Channel Access Tokenを入力"
                    value={lineConfig.channelAccessToken}
                    onChange={(e) =>
                      setLineConfig({ ...lineConfig, channelAccessToken: e.target.value })
                    }
                    disabled={loading}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="channelSecret">
                    Channel Secret <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="channelSecret"
                    type="password"
                    placeholder="Channel Secretを入力"
                    value={lineConfig.channelSecret}
                    onChange={(e) =>
                      setLineConfig({ ...lineConfig, channelSecret: e.target.value })
                    }
                    disabled={loading}
                    required
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <div className={`px-2 py-1 rounded text-xs ${
                    lineConfig.isConfigured
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }`}>
                    {lineConfig.isConfigured ? "設定済み" : "未設定"}
                  </div>
                </div>

                <div className="flex items-center space-x-4 pt-4">
                  <Button type="submit" disabled={loading}>
                    {loading ? "保存中..." : "設定を保存"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="h-5 w-5 mr-2" />
              通知設定
            </CardTitle>
            <CardDescription>
              システム通知とアラートの設定
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-500">
              通知設定機能は開発中です
            </p>
            <div className="space-y-2">
              <Label className="text-sm text-gray-600">
                • エスカレーション失敗時のメール通知
              </Label>
              <Label className="text-sm text-gray-600">
                • 日次レポートの送信
              </Label>
              <Label className="text-sm text-gray-600">
                • システムメンテナンス通知
              </Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <SettingsIcon className="h-5 w-5 mr-2" />
              システム情報
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">バージョン</span>
              <span className="font-mono">v1.0.0</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">環境</span>
              <span className="font-mono">
                {process.env.NODE_ENV}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">最終デプロイ</span>
              <span>2026-01-11</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
