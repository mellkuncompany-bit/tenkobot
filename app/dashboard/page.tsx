"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/hooks/use-auth";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { Shift, AttendanceRecord, NotificationLog, Staff, WorkTemplate } from "@/lib/types/firestore";
import { formatDateKey, formatDateTimeDisplay } from "@/lib/utils/date";
import { getUnassignedShifts } from "@/lib/services/shift-service";
import { getStaffs } from "@/lib/services/staff-service";
import { getWorkTemplate } from "@/lib/services/work-template-service";
import { getDriverDisplayName } from "@/lib/services/driver-assignment-service";
import { Users, Calendar, AlertCircle, CheckCircle } from "lucide-react";

export default function DashboardPage() {
  const { admin } = useAuth();
  const router = useRouter();
  const [todayShifts, setTodayShifts] = useState<Shift[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [recentLogs, setRecentLogs] = useState<NotificationLog[]>([]);
  const [unassignedShifts, setUnassignedShifts] = useState<Shift[]>([]);
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [workTemplates, setWorkTemplates] = useState<Record<string, WorkTemplate>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!admin) return;

    const fetchDashboardData = async () => {
      try {
        const today = formatDateKey(new Date());
        const nextWeek = formatDateKey(
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        );

        // Fetch staffs
        const staffsData = await getStaffs(admin.organizationId);
        setStaffs(staffsData);

        // Fetch today's shifts
        const shiftsQuery = query(
          collection(db, COLLECTIONS.SHIFTS),
          where("organizationId", "==", admin.organizationId),
          where("date", "==", today)
        );
        const shiftsSnapshot = await getDocs(shiftsQuery);
        const shifts = shiftsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Shift[];
        setTodayShifts(shifts);

        // Fetch attendance records for today
        const attendanceQuery = query(
          collection(db, COLLECTIONS.ATTENDANCE_RECORDS),
          where("organizationId", "==", admin.organizationId),
          where("date", "==", today)
        );
        const attendanceSnapshot = await getDocs(attendanceQuery);
        const records = attendanceSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as AttendanceRecord[];
        setAttendanceRecords(records);

        // Fetch recent notification logs
        const logsQuery = query(
          collection(db, COLLECTIONS.NOTIFICATIONS_LOG),
          where("organizationId", "==", admin.organizationId),
          orderBy("createdAt", "desc"),
          limit(10)
        );
        const logsSnapshot = await getDocs(logsQuery);
        const logs = logsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as NotificationLog[];
        setRecentLogs(logs);

        // Fetch unassigned shifts (next 7 days)
        const unassigned = await getUnassignedShifts(admin.organizationId, today, nextWeek);
        setUnassignedShifts(unassigned);

        // Fetch work templates for unassigned shifts
        const templateIds = [...new Set(unassigned.map((s) => s.workTemplateId))];
        const templates: Record<string, WorkTemplate> = {};
        await Promise.all(
          templateIds.map(async (id) => {
            const template = await getWorkTemplate(id);
            if (template) {
              templates[id] = template;
            }
          })
        );
        setWorkTemplates(templates);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [admin]);

  const confirmedCount = attendanceRecords.filter((r) => r.status === "present").length;
  const pendingCount = attendanceRecords.filter((r) => r.status === "pending").length;
  const escalatingCount = attendanceRecords.filter((r) => r.escalationStatus === "escalating").length;

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
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ダッシュボード</h1>
          <p className="text-gray-600 mt-1">本日の出勤状況を確認できます</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">本日のシフト</CardTitle>
              <Calendar className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayShifts.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">出勤確認済</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{confirmedCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">未確認</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">エスカレーション中</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{escalatingCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">未定作業</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{unassignedShifts.length}</div>
              <p className="text-xs text-muted-foreground">今後7日間</p>
            </CardContent>
          </Card>
        </div>

        {/* Today's Shifts */}
        <Card>
          <CardHeader>
            <CardTitle>本日のシフト</CardTitle>
          </CardHeader>
          <CardContent>
            {todayShifts.length === 0 ? (
              <p className="text-gray-500 text-center py-8">本日のシフトはありません</p>
            ) : (
              <div className="space-y-2">
                {todayShifts.map((shift) => {
                  const attendance = attendanceRecords.find((r) => r.shiftId === shift.id);
                  return (
                    <div
                      key={shift.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-4">
                        <Users className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="font-medium">スタッフID: {shift.staffIds.join(", ")}</p>
                          <p className="text-sm text-gray-500">
                            {shift.startTime} 〜 {shift.endTime || "未定"}
                          </p>
                        </div>
                      </div>
                      <div>
                        {attendance?.status === "present" && (
                          <span className="px-3 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                            出勤済
                          </span>
                        )}
                        {attendance?.status === "pending" && (
                          <span className="px-3 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                            未確認
                          </span>
                        )}
                        {attendance?.escalationStatus === "escalating" && (
                          <span className="px-3 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full ml-2">
                            エスカレーション中
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Unassigned Shifts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              未定作業一覧
            </CardTitle>
            <CardDescription>
              担当ドライバーが未定の作業（今後7日間）
            </CardDescription>
          </CardHeader>
          <CardContent>
            {unassignedShifts.length === 0 ? (
              <p className="text-sm text-muted-foreground">未定の作業はありません</p>
            ) : (
              <div className="space-y-3">
                {unassignedShifts.map((shift) => {
                  const template = workTemplates[shift.workTemplateId];
                  return (
                    <div
                      key={shift.id}
                      className="flex items-center justify-between border-b pb-3 last:border-b-0 last:pb-0"
                    >
                      <div>
                        <p className="font-medium">{template?.name || "不明な作業"}</p>
                        <p className="text-sm text-muted-foreground">
                          {shift.date} {shift.startTime}～{shift.endTime || "未定"}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => router.push(`/shifts/${shift.id}`)}
                      >
                        担当者を割り当て
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Logs */}
        <Card>
          <CardHeader>
            <CardTitle>直近の通知ログ</CardTitle>
          </CardHeader>
          <CardContent>
            {recentLogs.length === 0 ? (
              <p className="text-gray-500 text-center py-8">通知ログはありません</p>
            ) : (
              <div className="space-y-2">
                {recentLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 border-b last:border-b-0">
                    <div>
                      <p className="text-sm font-medium">{log.type.toUpperCase()}</p>
                      <p className="text-xs text-gray-500">
                        {log.createdAt && formatDateTimeDisplay(log.createdAt.toDate())}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        log.status === "responded"
                          ? "bg-green-100 text-green-800"
                          : log.status === "failed"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {log.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
