"use client";

import { useEffect, useState, useRef } from "react";
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
import { getUnassignedShifts } from "@/lib/services/shift-service";
import { getUpcomingRemindersWithTimings, completeReminderWithRecurring } from "@/lib/services/reminder-service";
import { getDriverDisplayName } from "@/lib/services/driver-assignment-service";
import { Users, Calendar, AlertCircle, CheckCircle, Bell, ChevronLeft, ChevronRight } from "lucide-react";

export default function DashboardPage() {
  const { admin } = useAuth();
  const router = useRouter();
  const [todayShifts, setTodayShifts] = useState<Shift[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [recentLogs, setRecentLogs] = useState<NotificationLog[]>([]);
  const [upcomingReminders, setUpcomingReminders] = useState<Reminder[]>([]);
  const [unassignedShifts, setUnassignedShifts] = useState<Shift[]>([]);
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [workTemplates, setWorkTemplates] = useState<WorkTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateOffset, setDateOffset] = useState(0); // Offset from today for scrolling
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!admin) return;

    const fetchDashboardData = async () => {
      const today = formatDateKey(new Date());
      const thirtyDaysLater = formatDateKey(
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      );

      // Fetch next 30 days' shifts for horizontal scrolling
      try {
        const shiftsQuery = query(
          collection(db, COLLECTIONS.SHIFTS),
          where("organizationId", "==", admin.organizationId),
          where("date", ">=", today),
          where("date", "<=", thirtyDaysLater)
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
        const reminders = await getUpcomingRemindersWithTimings(admin.organizationId);
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

      // Fetch unassigned shifts (next 7 days)
      try {
        const nextWeek = formatDateKey(
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        );
        const unassigned = await getUnassignedShifts(
          admin.organizationId,
          today,
          nextWeek
        );
        setUnassignedShifts(unassigned);
        console.log('[Dashboard] Fetched unassigned shifts:', unassigned.length);
      } catch (error) {
        console.error("Error fetching unassigned shifts:", error);
        setUnassignedShifts([]);
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

  // Generate dates for the current view (7 days starting from offset)
  const getViewDates = () => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() + dateOffset + i);
      return date;
    });
  };

  // Navigation functions
  const handlePreviousWeek = () => {
    setDateOffset(prev => prev - 7);
  };

  const handleNextWeek = () => {
    setDateOffset(prev => prev + 7);
  };

  const handleToday = () => {
    setDateOffset(0);
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

        {/* Stats - Compact */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">出勤予定</p>
                <p className="text-xl font-bold">{todayShiftsCount}人</p>
              </div>
              <Calendar className="h-5 w-5 text-gray-400" />
            </div>
          </Card>

          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">確認済</p>
                <p className="text-xl font-bold text-green-600">{confirmedCount}</p>
              </div>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
          </Card>

          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">未確認</p>
                <p className="text-xl font-bold text-yellow-600">{pendingCount}</p>
              </div>
              <AlertCircle className="h-5 w-5 text-yellow-500" />
            </div>
          </Card>

          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">エスカレ中</p>
                <p className="text-xl font-bold text-red-600">{escalatingCount}</p>
              </div>
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
          </Card>

          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">未定作業</p>
                <p className="text-xl font-bold text-orange-600">{unassignedShifts.length}</p>
              </div>
              <Users className="h-5 w-5 text-orange-500" />
            </div>
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
                            await completeReminderWithRecurring(reminder.id);
                            // Refresh reminders to show next occurrence if generated
                            const reminders = await getUpcomingRemindersWithTimings(admin!.organizationId);
                            setUpcomingReminders(reminders);
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

        {/* Unassigned Shifts */}
        {unassignedShifts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                担当ドライバー未定の作業
              </CardTitle>
              <CardDescription>
                今後7日間で担当ドライバーが未定の作業
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {unassignedShifts.map((shift) => {
                  const workTemplate = workTemplates.find(
                    (t) => t.id === shift.workTemplateId
                  );
                  return (
                    <div
                      key={shift.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div>
                        <p className="font-medium">
                          {workTemplate?.name || "不明な作業"}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(shift.date).toLocaleDateString("ja-JP")}
                          {shift.startTime && ` ${shift.startTime}`}
                          {shift.endTime && `-${shift.endTime}`}
                        </p>
                        <p className="text-xs text-yellow-600 mt-1">
                          担当: {getDriverDisplayName(shift.driverAssignment, staffs)}
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
            </CardContent>
          </Card>
        )}

        {/* Dispatch Tables */}
        <Card>
          <CardHeader className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <CardTitle className="text-base sm:text-lg">
              配車表 - スタッフ: {staffs.length}名, 作業: {workTemplates.length}件
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousWeek}
                className="h-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant={dateOffset === 0 ? "default" : "outline"}
                size="sm"
                onClick={handleToday}
                className="h-8 px-3"
              >
                今週
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextWeek}
                className="h-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/dispatch")}
                className="h-8"
              >
                詳細
              </Button>
            </div>
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
                          <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-200 w-16">
                            名前
                          </th>
                          <th className="px-2 py-2 text-center text-xs font-semibold text-gray-700 border-r border-gray-200 w-12">
                            役割
                          </th>
                          {getViewDates().map((date, index) => {
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
                          })}
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
                            const dates = getViewDates();

                            return (
                              <tr
                                key={staff.id}
                                className={`border-b border-gray-200 hover:bg-gray-50 ${
                                  rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                                }`}
                              >
                                <td className="px-2 py-2 text-xs font-medium text-gray-900 border-r border-gray-200">
                                  {staff.name}
                                </td>
                                <td className="px-2 py-2 text-xs text-center text-gray-600 border-r border-gray-200">
                                  {getStaffRoleJapanese(staff.role)}
                                </td>
                                {dates.map((date, index) => {
                                  const dateKey = formatDateKey(date);
                                  const dayShifts = dateMap.get(dateKey) || [];
                                  const assignedCourses = getStaffAssignedCoursesForDate(staff, date);

                                  return (
                                    <td
                                      key={index}
                                      className="px-2 py-2 text-xs text-center text-gray-900 border-r border-gray-200"
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
                          <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-200 w-16">
                            作業
                          </th>
                          <th className="px-2 py-2 text-center text-xs font-semibold text-gray-700 border-r border-gray-200 w-12">
                            開始
                          </th>
                          {getViewDates().map((date, index) => {
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
                          })}
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

                            const dates = getViewDates();

                            return (
                              <tr
                                key={template.id}
                                className={`border-b border-gray-200 hover:bg-gray-50 ${
                                  rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                                }`}
                              >
                                <td className="px-2 py-2 text-xs font-medium text-gray-900 border-r border-gray-200">
                                  {template.name}
                                </td>
                                <td className="px-2 py-2 text-xs text-center text-gray-600 border-r border-gray-200">
                                  {template.reportCheckTime || "-"}
                                </td>
                                {dates.map((date, index) => {
                                  const dateKey = formatDateKey(date);
                                  const dayShifts = shiftsByDate.get(dateKey) || [];
                                  const displayText = getDriverNamesOrCircle(dayShifts, template, date);

                                  return (
                                    <td
                                      key={index}
                                      className="px-2 py-2 text-xs text-center text-gray-900 border-r border-gray-200"
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
