"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/hooks/use-auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { Organization } from "@/lib/types/firestore";
import { PLANS } from "@/lib/utils/plans";
import { formatDateDisplay } from "@/lib/utils/date";
import { CreditCard, Check } from "lucide-react";

export default function SubscriptionPage() {
  const { admin } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!admin) return;
    const fetch = async () => {
      try {
        const docRef = doc(db, COLLECTIONS.ORGANIZATIONS, admin.organizationId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setOrganization({ id: docSnap.id, ...docSnap.data() } as Organization);
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [admin]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">読み込み中...</div>
      </DashboardLayout>
    );
  }

  const currentPlan = organization ? PLANS[organization.plan] : null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">サブスクリプション</h1>
          <p className="text-gray-600 mt-1">プラン情報と請求管理</p>
        </div>

        {organization && (
          <Card>
            <CardHeader>
              <CardTitle>現在のプラン</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold">{currentPlan?.name}</h3>
                  <p className="text-gray-600 mt-1">
                    {currentPlan?.price === 0
                      ? "無料"
                      : `¥${currentPlan?.price.toLocaleString()}/月`}
                  </p>
                </div>
                <Badge
                  variant={
                    organization.subscriptionStatus === "active"
                      ? "success"
                      : organization.subscriptionStatus === "trial"
                      ? "info"
                      : "destructive"
                  }
                >
                  {organization.subscriptionStatus}
                </Badge>
              </div>

              {organization.subscriptionExpiresAt && (
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-600">
                    有効期限:{" "}
                    {formatDateDisplay(organization.subscriptionExpiresAt.toDate())}
                  </p>
                </div>
              )}

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">プラン制限</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• スタッフ数: {organization.limits.maxStaffs}名まで</li>
                  <li>
                    • 月間シフト数: {organization.limits.maxShiftsPerMonth}件まで
                  </li>
                  <li>
                    • エスカレーション段階: {organization.limits.maxEscalationStages}
                    段階まで
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(PLANS).map(([key, plan]) => (
            <Card
              key={key}
              className={organization?.plan === key ? "border-primary border-2" : ""}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {plan.name}
                  {organization?.plan === key && (
                    <Badge variant="success">現在のプラン</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-3xl font-bold">
                    {plan.price === 0 ? "無料" : `¥${plan.price.toLocaleString()}`}
                  </p>
                  <p className="text-sm text-gray-600">
                    {plan.price === 0 ? `${plan.duration}日間` : "/月"}
                  </p>
                </div>

                <ul className="space-y-2 text-sm">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  variant={organization?.plan === key ? "outline" : "default"}
                  disabled={organization?.plan === key}
                >
                  {organization?.plan === key ? "現在のプラン" : "プラン変更"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="h-5 w-5 mr-2" />
              支払い方法
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">
              支払い方法は設定されていません（開発中）
            </p>
            <Button className="mt-4" variant="outline" disabled>
              支払い方法を追加
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
