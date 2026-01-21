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
  completeReminderWithRecurring,
  deleteReminder,
} from "@/lib/services/reminder-service";
import { Reminder, RecurringPattern, NotificationTiming, RecurringFrequency, RecurringEndType } from "@/lib/types/firestore";
import { Plus, Check, Trash2, ArrowLeft, X, Bell } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/components/ui/select";

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
    notificationDaysBefore: 7, // Default to 7 days before (backward compatibility)
  });
  const [submitting, setSubmitting] = useState(false);

  // Recurring settings state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<RecurringFrequency>("monthly");
  const [recurringInterval, setRecurringInterval] = useState(1);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [endType, setEndType] = useState<RecurringEndType>("never");
  const [endDate, setEndDate] = useState("");
  const [endCount, setEndCount] = useState(10);

  // Notification timings state
  const [notificationTimings, setNotificationTimings] = useState<NotificationTiming[]>([
    { daysBefore: 7, time: "09:00" }
  ]);

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
      // Build recurring pattern
      let recurringPattern: RecurringPattern | null = null;
      if (isRecurring) {
        recurringPattern = {
          frequency: recurringFrequency,
          interval: recurringInterval,
          daysOfWeek: recurringFrequency === "weekly" ? daysOfWeek : undefined,
          dayOfMonth: recurringFrequency === "monthly" ? dayOfMonth : undefined,
          endType,
          endDate: endType === "date" ? endDate : null,
          endCount: endType === "count" ? endCount : null,
        };
      }

      await createReminder({
        organizationId: admin.organizationId,
        title: formData.title,
        description: formData.description || null,
        eventDate: formData.eventDate,
        notificationDaysBefore: formData.notificationDaysBefore,
        notificationTimings,
        isRecurring,
        recurringPattern,
        parentReminderId: null,
        isCompleted: false,
        completedAt: null,
      });

      // Reset form
      setFormData({ title: "", description: "", eventDate: "", notificationDaysBefore: 7 });
      setIsRecurring(false);
      setRecurringFrequency("monthly");
      setRecurringInterval(1);
      setDaysOfWeek([]);
      setDayOfMonth(1);
      setEndType("never");
      setEndDate("");
      setEndCount(10);
      setNotificationTimings([{ daysBefore: 7, time: "09:00" }]);
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
      const nextId = await completeReminderWithRecurring(id);
      if (nextId) {
        alert("次回のリマインダーが自動生成されました");
      }
      await fetchReminders();
    } catch (error) {
      console.error("Error completing reminder:", error);
      alert("リマインダーの完了処理に失敗しました");
    }
  };

  // Notification timing handlers
  const addNotificationTiming = () => {
    setNotificationTimings([...notificationTimings, { daysBefore: 1, time: "09:00" }]);
  };

  const removeNotificationTiming = (index: number) => {
    setNotificationTimings(notificationTimings.filter((_, i) => i !== index));
  };

  const updateNotificationTiming = (index: number, field: keyof NotificationTiming, value: any) => {
    const updated = [...notificationTimings];
    updated[index] = { ...updated[index], [field]: value };
    setNotificationTimings(updated);
  };

  // Days of week toggle
  const toggleDayOfWeek = (day: number) => {
    if (daysOfWeek.includes(day)) {
      setDaysOfWeek(daysOfWeek.filter(d => d !== day));
    } else {
      setDaysOfWeek([...daysOfWeek, day].sort());
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

                {/* Notification Timings */}
                <div className="space-y-3 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <Label>通知タイミング</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addNotificationTiming}
                      disabled={submitting}
                    >
                      <Bell className="h-4 w-4 mr-1" />
                      通知を追加
                    </Button>
                  </div>

                  {notificationTimings.map((timing, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-md">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <div>
                          <Input
                            type="number"
                            min="0"
                            placeholder="日数"
                            value={timing.daysBefore}
                            onChange={(e) =>
                              updateNotificationTiming(index, "daysBefore", Number(e.target.value))
                            }
                            disabled={submitting}
                          />
                          <p className="text-xs text-gray-500 mt-1">日前</p>
                        </div>
                        <div>
                          <Input
                            type="time"
                            value={timing.time}
                            onChange={(e) =>
                              updateNotificationTiming(index, "time", e.target.value)
                            }
                            disabled={submitting}
                          />
                          <p className="text-xs text-gray-500 mt-1">時刻</p>
                        </div>
                      </div>
                      {notificationTimings.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeNotificationTiming(index)}
                          disabled={submitting}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Recurring Settings */}
                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isRecurring"
                      checked={isRecurring}
                      onChange={(e) => setIsRecurring(e.target.checked)}
                      disabled={submitting}
                    />
                    <Label htmlFor="isRecurring" className="cursor-pointer">
                      繰り返し設定を有効にする
                    </Label>
                  </div>

                  {isRecurring && (
                    <div className="space-y-4 pl-6 border-l-2 border-blue-200">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>繰り返しパターン</Label>
                          <Select
                            value={recurringFrequency}
                            onChange={(e) => setRecurringFrequency(e.target.value as RecurringFrequency)}
                            disabled={submitting}
                          >
                            <option value="daily">毎日</option>
                            <option value="weekly">毎週</option>
                            <option value="monthly">毎月</option>
                            <option value="yearly">毎年</option>
                            <option value="custom">カスタム（日数指定）</option>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>間隔</Label>
                          <Input
                            type="number"
                            min="1"
                            value={recurringInterval}
                            onChange={(e) => setRecurringInterval(Number(e.target.value))}
                            disabled={submitting}
                          />
                          <p className="text-xs text-gray-500">
                            {recurringFrequency === "daily" && `${recurringInterval}日ごと`}
                            {recurringFrequency === "weekly" && `${recurringInterval}週間ごと`}
                            {recurringFrequency === "monthly" && `${recurringInterval}ヶ月ごと`}
                            {recurringFrequency === "yearly" && `${recurringInterval}年ごと`}
                            {recurringFrequency === "custom" && `${recurringInterval}日ごと`}
                          </p>
                        </div>
                      </div>

                      {recurringFrequency === "weekly" && (
                        <div className="space-y-2">
                          <Label>曜日指定</Label>
                          <div className="flex gap-2">
                            {["日", "月", "火", "水", "木", "金", "土"].map((day, index) => (
                              <button
                                key={index}
                                type="button"
                                onClick={() => toggleDayOfWeek(index)}
                                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                  daysOfWeek.includes(index)
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                                disabled={submitting}
                              >
                                {day}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {recurringFrequency === "monthly" && (
                        <div className="space-y-2">
                          <Label>日付指定</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="-1"
                              max="31"
                              value={dayOfMonth}
                              onChange={(e) => setDayOfMonth(Number(e.target.value))}
                              disabled={submitting}
                              className="w-24"
                            />
                            <span className="text-sm text-gray-600">日</span>
                            <p className="text-xs text-gray-500">（-1 = 月末）</p>
                          </div>
                        </div>
                      )}

                      <div className="space-y-3">
                        <Label>繰り返し終了条件</Label>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="endNever"
                              name="endType"
                              checked={endType === "never"}
                              onChange={() => setEndType("never")}
                              disabled={submitting}
                            />
                            <Label htmlFor="endNever" className="cursor-pointer">無期限</Label>
                          </div>

                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="endDate"
                              name="endType"
                              checked={endType === "date"}
                              onChange={() => setEndType("date")}
                              disabled={submitting}
                            />
                            <Label htmlFor="endDate" className="cursor-pointer">終了日指定:</Label>
                            <Input
                              type="date"
                              value={endDate}
                              onChange={(e) => setEndDate(e.target.value)}
                              disabled={submitting || endType !== "date"}
                              className="w-40"
                            />
                          </div>

                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="endCount"
                              name="endType"
                              checked={endType === "count"}
                              onChange={() => setEndType("count")}
                              disabled={submitting}
                            />
                            <Label htmlFor="endCount" className="cursor-pointer">回数指定:</Label>
                            <Input
                              type="number"
                              min="1"
                              value={endCount}
                              onChange={(e) => setEndCount(Number(e.target.value))}
                              disabled={submitting || endType !== "count"}
                              className="w-20"
                            />
                            <span className="text-sm text-gray-600">回</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
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
