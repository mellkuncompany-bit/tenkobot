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
    eventDate: "",
    notificationDaysBefore: 7, // Default to 7 days before
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
        eventDate: formData.eventDate,
        notificationDaysBefore: formData.notificationDaysBefore,
        isCompleted: false,
        completedAt: null,
      });

      setFormData({ title: "", description: "", eventDate: "", notificationDaysBefore: 7 });
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

  const getDaysUntilEvent = (eventDate: string) => {
    const event = new Date(eventDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = event.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getNotificationDate = (eventDate: string, daysBefore: number) => {
    const event = new Date(eventDate);
    const notification = new Date(event);
    notification.setDate(notification.getDate() - daysBefore);
    return notification;
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
                  <Label htmlFor="eventDate">
                    イベント日付 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="eventDate"
                    type="date"
                    value={formData.eventDate}
                    onChange={(e) =>
                      setFormData({ ...formData, eventDate: e.target.value })
                    }
                    disabled={submitting}
                    required
                  />
                  <p className="text-xs text-gray-500">
                    イベントが実際に発生する日付を選択してください
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notificationDaysBefore">
                    通知タイミング <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="notificationDaysBefore"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={formData.notificationDaysBefore}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        notificationDaysBefore: Number(e.target.value),
                      })
                    }
                    disabled={submitting}
                    required
                  >
                    <option value={1}>1日前</option>
                    <option value={3}>3日前</option>
                    <option value={7}>7日前（1週間前）</option>
                    <option value={14}>14日前（2週間前）</option>
                    <option value={30}>30日前（1ヶ月前）</option>
                    <option value={60}>60日前（2ヶ月前）</option>
                    <option value={90}>90日前（3ヶ月前）</option>
                  </select>
                  <p className="text-xs text-gray-500">
                    イベントの何日前に通知を表示するか選択してください
                  </p>
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
                    <TableHead>イベント日</TableHead>
                    <TableHead>通知日</TableHead>
                    <TableHead>残り日数</TableHead>
                    <TableHead>状態</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeReminders.map((reminder) => {
                    const daysUntilEvent = getDaysUntilEvent(reminder.eventDate);
                    const notificationDate = getNotificationDate(
                      reminder.eventDate,
                      reminder.notificationDaysBefore
                    );
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const daysUntilNotification = Math.ceil(
                      (notificationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                    );

                    return (
                      <TableRow key={reminder.id}>
                        <TableCell className="font-medium">
                          {reminder.title}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {reminder.description || "-"}
                        </TableCell>
                        <TableCell>
                          {new Date(reminder.eventDate).toLocaleDateString("ja-JP")}
                        </TableCell>
                        <TableCell>
                          {notificationDate.toLocaleDateString("ja-JP")}
                          <div className="text-xs text-gray-500">
                            ({reminder.notificationDaysBefore}日前)
                          </div>
                        </TableCell>
                        <TableCell>
                          {daysUntilEvent < 0 ? (
                            <span className="text-red-600 font-bold">
                              {Math.abs(daysUntilEvent)}日経過
                            </span>
                          ) : daysUntilEvent === 0 ? (
                            <span className="text-red-600 font-bold">今日</span>
                          ) : (
                            <span className={daysUntilEvent <= 3 ? "text-orange-600 font-bold" : ""}>
                              あと{daysUntilEvent}日
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {getUrgencyBadge(daysUntilNotification, reminder.isCompleted)}
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
                    <TableHead>イベント日</TableHead>
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
                        {new Date(reminder.eventDate).toLocaleDateString("ja-JP")}
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
