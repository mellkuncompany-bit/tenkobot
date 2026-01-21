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
import { Shift, AttendanceRecord, NotificationLog, Staff, WorkTemplate, Reminder } from "@/lib/types/firestore";
import { formatDateKey, formatDateTimeDisplay } from "@/lib/utils/date";
import { getStaffs } from "@/lib/services/staff-service";
import { getWorkTemplates } from "@/lib/services/work-template-service";
import { getUpcomingReminders, completeReminder } from "@/lib/services/reminder-service";
import { Users, Calendar, AlertCircle, CheckCircle, Bell } from "lucide-react";

export default function DashboardPage() {
  const { admin } = useAuth();
  const router = useRouter();
  const [todayShifts, setTodayShifts] = useState<Shift[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [recentLogs, setRecentLogs] = useState<NotificationLog[]>([]);
  const [upcomingReminders, setUpcomingReminders] = useState<Reminder[]>([]);
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [workTemplates, setWorkTemplates] = useState<WorkTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!admin) return;

    const fetchDashboardData = async () => {
      const today = formatDateKey(new Date());
      const oneWeekLater = formatDateKey(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      );

      // Fetch next 7 days' shifts
      try {
        const shiftsQuery = query(
          collection(db, COLLECTIONS.SHIFTS),
          where("organizationId", "==", admin.organizationId),
          where("date", ">=", today),
          where("date", "<=", oneWeekLater)
        );
        const shiftsSnapshot = await getDocs(shiftsQuery);
        const shifts = shiftsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Shift[];

        // Sort by date and time
        shifts.sort((a, b) => {
          if (a.date !== b.date) {
            return a.date.localeCompare(b.date);
          }
          return (a.startTime || "").localeCompare(b.startTime || "");
        });

        setTodayShifts(shifts);
        console.log('[Dashboard] Fetched shifts:', shifts.length);
      } catch (error) {
        console.error("Error fetching shifts:", error);
        setTodayShifts([]);
      }

      // Fetch attendance records for today
      try {
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
        console.log('[Dashboard] Fetched attendance records:', records.length);
      } catch (error) {
        console.error("Error fetching attendance records:", error);
        setAttendanceRecords([]);
      }

      // Fetch recent notification logs
      try {
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
        console.log('[Dashboard] Fetched logs:', logs.length);
      } catch (error) {
        console.error("Error fetching logs:", error);
        setRecentLogs([]);
      }

      // Fetch upcoming reminders (next 7 days)
      try {
        const reminders = await getUpcomingReminders(admin.organizationId);
        setUpcomingReminders(reminders);
        console.log('[Dashboard] Fetched reminders:', reminders.length);
      } catch (error) {
        console.error("Error fetching reminders:", error);
        setUpcomingReminders([]);
      }

      // Fetch staffs and work templates for dispatch table
      try {
        const [staffsData, templatesData] = await Promise.all([
          getStaffs(admin.organizationId),
          getWorkTemplates(admin.organizationId),
        ]);
        console.log('[Dashboard] Fetched staffs:', staffsData.length, staffsData);
        console.log('[Dashboard] Fetched work templates:', templatesData.length, templatesData);
        setStaffs(staffsData);
        setWorkTemplates(templatesData);
      } catch (error) {
        console.error("Error fetching staffs/templates:", error);
        setStaffs([]);
        setWorkTemplates([]);
      }

      setLoading(false);
    };

    fetchDashboardData();
  }, [admin]);

  // Helper functions for dispatch tables
  const getStaffRoleJapanese = (role: string): string => {
    switch (role) {
      case "driver": return "ドライバー";
      case "manager": return "管理職";
      case "owner": return "経営者";
      default: return role;
    }
  };

  const getStaffAssignedCoursesForDate = (staff: Staff, date: Date): string => {
    const dayOfWeek = date.getDay();

    if (staff.assignedWorkTemplateIds && staff.assignedWorkTemplateIds.length > 0) {
      const courseNames = staff.assignedWorkTemplateIds
        .map(id => {
          const template = workTemplates.find(t => t.id === id);
          if (template && template.recurringSchedule &&
              template.recurringSchedule.daysOfWeek.includes(dayOfWeek)) {
            return template.name;
          }
          return null;
        })
        .filter(Boolean);
      return courseNames.length > 0 ? courseNames.join("・") : "-";
    }
    if (staff.assignedWorkFreetext) {
      if (staff.recurringSchedule && staff.recurringSchedule.daysOfWeek.includes(dayOfWeek)) {
        return staff.assignedWorkFreetext;
      }
      return "-";
    }
    return "-";
  };

  const getDriverNamesOrCircle = (shifts: Shift[], template: WorkTemplate | undefined, date: Date): string => {
    if (shifts.length > 0) {
      const driverNames = new Set<string>();
      shifts.forEach(shift => {
        shift.staffIds.forEach(staffId => {
          const staff = staffs.find(s => s.id === staffId);
          if (staff) {
            driverNames.add(staff.name);
          }
        });
      });
      return driverNames.size > 0 ? Array.from(driverNames).join("・") : "○";
    }

    if (template && template.recurringSchedule) {
      const dayOfWeek = date.getDay();
      if (template.recurringSchedule.daysOfWeek.includes(dayOfWeek)) {
        return "○";
      }
    }

    return "-";
  };

  // Get today's date
  const today = formatDateKey(new Date());
  const todayShiftsCount = todayShifts.filter(shift => shift.date === today).length;

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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">本日の出勤予定者</CardTitle>
              <Calendar className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayShiftsCount}</div>
              <p className="text-xs text-muted-foreground">人</p>
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
        </div>

        {/* Upcoming Reminders */}
        {upcomingReminders.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-orange-600" />
                今週のリマインダー
              </CardTitle>
              <CardDescription>
                1週間以内に期限が来るリマインダー
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingReminders.map((reminder) => {
                  const eventDate = new Date(reminder.eventDate);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const diffTime = eventDate.getTime() - today.getTime();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                  return (
                    <div
                      key={reminder.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div>
                        <p className="font-medium">{reminder.title}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(reminder.eventDate).toLocaleDateString("ja-JP")} -
                          {diffDays < 0 ? (
                            <span className="text-red-600 font-bold ml-1">
                              {Math.abs(diffDays)}日超過
                            </span>
                          ) : diffDays === 0 ? (
                            <span className="text-red-600 font-bold ml-1">今日</span>
                          ) : (
                            <span className={diffDays <= 3 ? "text-orange-600 font-bold ml-1" : "ml-1"}>
                              あと{diffDays}日
                            </span>
                          )}
                        </p>
                        {reminder.description && (
                          <p className="text-xs text-gray-400 mt-1">{reminder.description}</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            await completeReminder(reminder.id);
                            setUpcomingReminders(upcomingReminders.filter(r => r.id !== reminder.id));
                          } catch (error) {
                            console.error("Error completing reminder:", error);
                          }
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        完了
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dispatch Tables */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>配車表（今週7日間）- スタッフ: {staffs.length}名, 作業: {workTemplates.length}件</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/dispatch")}
            >
              詳細を見る
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {todayShifts.length === 0 && staffs.length === 0 ? (
              <p className="text-gray-500 text-center py-8">配車データはありません</p>
            ) : (
              <div className="space-y-6">
                {/* Staff-based Dispatch Table */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 px-4 py-2 bg-gray-50">スタッフ別配車表</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead className="bg-gray-50">
                        <tr className="border-b border-gray-200">
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-200 w-24">
                            スタッフ名
                          </th>
                          <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 border-r border-gray-200 w-20">
                            役割
                          </th>
                          {(() => {
                            const today = new Date();
                            const dates = Array.from({ length: 7 }, (_, i) => {
                              const date = new Date(today);
                              date.setDate(today.getDate() + i);
                              return date;
                            });

                            return dates.map((date, index) => {
                              const dayOfWeek = date.getDay();
                              const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
                              const isSunday = dayOfWeek === 0;

                              return (
                                <th
                                  key={index}
                                  className={`px-3 py-2 text-center text-xs font-semibold border-r border-gray-200 ${
                                    isSunday ? "text-red-600" : "text-gray-700"
                                  }`}
                                >
                                  <div>
                                    {date.getMonth() + 1}/{date.getDate()}
                                  </div>
                                  <div className="text-[10px]">({dayNames[dayOfWeek]})</div>
                                </th>
                              );
                            });
                          })()}
                        </tr>
                      </thead>
                      <tbody>
                        {staffs.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="px-3 py-8 text-center text-sm text-gray-500">
                              スタッフが登録されていません
                            </td>
                          </tr>
                        ) : (() => {
                          // Group shifts by staff
                          const shiftsByStaff = new Map<string, Map<string, Shift[]>>();

                          staffs.forEach((staff) => {
                            shiftsByStaff.set(staff.id, new Map());
                          });

                          todayShifts.forEach((shift) => {
                            shift.staffIds.forEach((staffId) => {
                              if (!shiftsByStaff.has(staffId)) {
                                shiftsByStaff.set(staffId, new Map());
                              }
                              const dateMap = shiftsByStaff.get(staffId)!;
                              if (!dateMap.has(shift.date)) {
                                dateMap.set(shift.date, []);
                              }
                              dateMap.get(shift.date)!.push(shift);
                            });
                          });

                          return staffs.map((staff, rowIndex) => {
                            const dateMap = shiftsByStaff.get(staff.id) || new Map();
                            const today = new Date();
                            const dates = Array.from({ length: 7 }, (_, i) => {
                              const date = new Date(today);
                              date.setDate(today.getDate() + i);
                              return date;
                            });

                            return (
                              <tr
                                key={staff.id}
                                className={`border-b border-gray-200 hover:bg-gray-50 ${
                                  rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                                }`}
                              >
                                <td className="px-3 py-2 text-xs font-medium text-gray-900 border-r border-gray-200">
                                  {staff.name}
                                </td>
                                <td className="px-3 py-2 text-xs text-center text-gray-600 border-r border-gray-200">
                                  {getStaffRoleJapanese(staff.role)}
                                </td>
                                {dates.map((date, index) => {
                                  const dateKey = formatDateKey(date);
                                  const dayShifts = dateMap.get(dateKey) || [];
                                  const assignedCourses = getStaffAssignedCoursesForDate(staff, date);

                                  return (
                                    <td
                                      key={index}
                                      className="px-3 py-2 text-xs text-center text-gray-900 border-r border-gray-200"
                                    >
                                      {assignedCourses}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Work-based Dispatch Table */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 px-4 py-2 bg-gray-50">作業別配車表</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead className="bg-gray-50">
                        <tr className="border-b border-gray-200">
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-200 w-24">
                            作業名
                          </th>
                          <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 border-r border-gray-200 w-20">
                            業務開始
                          </th>
                          {(() => {
                            const today = new Date();
                            const dates = Array.from({ length: 7 }, (_, i) => {
                              const date = new Date(today);
                              date.setDate(today.getDate() + i);
                              return date;
                            });

                            return dates.map((date, index) => {
                              const dayOfWeek = date.getDay();
                              const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
                              const isSunday = dayOfWeek === 0;

                              return (
                                <th
                                  key={index}
                                  className={`px-3 py-2 text-center text-xs font-semibold border-r border-gray-200 ${
                                    isSunday ? "text-red-600" : "text-gray-700"
                                  }`}
                                >
                                  <div>
                                    {date.getMonth() + 1}/{date.getDate()}
                                  </div>
                                  <div className="text-[10px]">({dayNames[dayOfWeek]})</div>
                                </th>
                              );
                            });
                          })()}
                        </tr>
                      </thead>
                      <tbody>
                        {workTemplates.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="px-3 py-8 text-center text-sm text-gray-500">
                              作業マスタが登録されていません
                            </td>
                          </tr>
                        ) : (() => {
                          // Get all work templates and create rows
                          return workTemplates.map((template, rowIndex) => {
                            // Group shifts by date for this template
                            const shiftsByDate = new Map<string, Shift[]>();
                            todayShifts.forEach((shift) => {
                              if (shift.workTemplateId === template.id) {
                                if (!shiftsByDate.has(shift.date)) {
                                  shiftsByDate.set(shift.date, []);
                                }
                                shiftsByDate.get(shift.date)!.push(shift);
                              }
                            });

                            const today = new Date();
                            const dates = Array.from({ length: 7 }, (_, i) => {
                              const date = new Date(today);
                              date.setDate(today.getDate() + i);
                              return date;
                            });

                            return (
                              <tr
                                key={template.id}
                                className={`border-b border-gray-200 hover:bg-gray-50 ${
                                  rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                                }`}
                              >
                                <td className="px-3 py-2 text-xs font-medium text-gray-900 border-r border-gray-200">
                                  {template.name}
                                </td>
                                <td className="px-3 py-2 text-xs text-center text-gray-600 border-r border-gray-200">
                                  {template.reportCheckTime || "-"}
                                </td>
                                {dates.map((date, index) => {
                                  const dateKey = formatDateKey(date);
                                  const dayShifts = shiftsByDate.get(dateKey) || [];
                                  const displayText = getDriverNamesOrCircle(dayShifts, template, date);

                                  return (
                                    <td
                                      key={index}
                                      className="px-3 py-2 text-xs text-center text-gray-900 border-r border-gray-200"
                                    >
                                      {displayText}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
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
