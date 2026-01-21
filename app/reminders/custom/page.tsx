"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  getReminders,
  createReminder,
  completeReminder,
  deleteReminder,
} from "@/lib/services/reminder-service";
import { Reminder } from "@/lib/types/firestore";
import { Plus, Check, Trash2, ArrowLeft } from "lucide-react";

export default function CustomRemindersPage() {
  const { admin } = useAuth();
  const router = useRouter();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    dueDate: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchReminders = async () => {
    if (!admin) return;
    try {
      const data = await getReminders(admin.organizationId);
      setReminders(data);
    } catch (error) {
      console.error("Error fetching reminders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, [admin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admin) return;

    setSubmitting(true);
    try {
      await createReminder({
        organizationId: admin.organizationId,
        title: formData.title,
        description: formData.description || null,
        dueDate: formData.dueDate,
        isCompleted: false,
        completedAt: null,
      });

      setFormData({ title: "", description: "", dueDate: "" });
      setShowForm(false);
      await fetchReminders();
    } catch (error) {
      console.error("Error creating reminder:", error);
      alert("リマインダーの作成に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await completeReminder(id);
      await fetchReminders();
    } catch (error) {
      console.error("Error completing reminder:", error);
      alert("リマインダーの完了処理に失敗しました");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このリマインダーを削除しますか？")) return;

    try {
      await deleteReminder(id);
      await fetchReminders();
    } catch (error) {
      console.error("Error deleting reminder:", error);
      alert("リマインダーの削除に失敗しました");
    }
  };

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getUrgencyBadge = (daysLeft: number, isCompleted: boolean) => {
    if (isCompleted) {
      return <Badge variant="success">完了</Badge>;
    }

    if (daysLeft < 0) {
      return <Badge variant="destructive">期限切れ</Badge>;
    } else if (daysLeft === 0) {
      return <Badge variant="destructive">今日</Badge>;
    } else if (daysLeft <= 3) {
      return <Badge variant="warning">緊急</Badge>;
    } else if (daysLeft <= 7) {
      return <Badge variant="info">近日</Badge>;
    } else {
      return <Badge variant="outline">予定</Badge>;
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

  const activeReminders = reminders.filter((r) => !r.isCompleted);
  const completedReminders = reminders.filter((r) => r.isCompleted);

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">
        <div className="flex items-center justify-between">
          <div>
            <Button
              variant="ghost"
              onClick={() => router.push("/reminders")}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              戻る
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">カスタムリマインダー</h1>
            <p className="text-gray-600 mt-1">自由にリマインダーを登録・管理できます</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-2" />
            {showForm ? "フォームを閉じる" : "新規登録"}
          </Button>
        </div>

        {/* Registration Form */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>新しいリマインダーを登録</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">
                    タイトル <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    placeholder="例：車検の更新、契約書の提出"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    disabled={submitting}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">説明（任意）</Label>
                  <Textarea
                    id="description"
                    placeholder="詳細な説明やメモを入力"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    disabled={submitting}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dueDate">
                    期限 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) =>
                      setFormData({ ...formData, dueDate: e.target.value })
                    }
                    disabled={submitting}
                    required
                  />
                </div>

                <div className="flex justify-end space-x-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                    disabled={submitting}
                  >
                    キャンセル
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "登録中..." : "登録"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Active Reminders */}
        <Card>
          <CardHeader>
            <CardTitle>未完了のリマインダー ({activeReminders.length}件)</CardTitle>
          </CardHeader>
          <CardContent>
            {activeReminders.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                未完了のリマインダーはありません
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>タイトル</TableHead>
                    <TableHead>説明</TableHead>
                    <TableHead>期限</TableHead>
                    <TableHead>残り日数</TableHead>
                    <TableHead>状態</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeReminders.map((reminder) => {
                    const daysLeft = getDaysUntilDue(reminder.dueDate);
                    return (
                      <TableRow key={reminder.id}>
                        <TableCell className="font-medium">
                          {reminder.title}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {reminder.description || "-"}
                        </TableCell>
                        <TableCell>
                          {new Date(reminder.dueDate).toLocaleDateString("ja-JP")}
                        </TableCell>
                        <TableCell>
                          {daysLeft < 0 ? (
                            <span className="text-red-600 font-bold">
                              {Math.abs(daysLeft)}日超過
                            </span>
                          ) : daysLeft === 0 ? (
                            <span className="text-red-600 font-bold">今日</span>
                          ) : (
                            <span className={daysLeft <= 3 ? "text-orange-600 font-bold" : ""}>
                              あと{daysLeft}日
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {getUrgencyBadge(daysLeft, reminder.isCompleted)}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleComplete(reminder.id)}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              完了
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(reminder.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Completed Reminders */}
        {completedReminders.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>完了済み ({completedReminders.length}件)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>タイトル</TableHead>
                    <TableHead>説明</TableHead>
                    <TableHead>期限</TableHead>
                    <TableHead>完了日</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedReminders.map((reminder) => (
                    <TableRow key={reminder.id} className="opacity-60">
                      <TableCell className="font-medium">
                        {reminder.title}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {reminder.description || "-"}
                      </TableCell>
                      <TableCell>
                        {new Date(reminder.dueDate).toLocaleDateString("ja-JP")}
                      </TableCell>
                      <TableCell>
                        {reminder.completedAt
                          ? new Date(reminder.completedAt.toMillis()).toLocaleDateString("ja-JP")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(reminder.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
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
