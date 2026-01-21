"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/hooks/use-auth";
import { getShifts } from "@/lib/services/shift-service";
import { getStaffs } from "@/lib/services/staff-service";
import { getWorkTemplates } from "@/lib/services/work-template-service";
import { Shift, Staff, WorkTemplate } from "@/lib/types/firestore";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Helper function to get week dates (Sunday to Saturday)
function getWeekDates(date: Date): Date[] {
  const week: Date[] = [];
  const sunday = new Date(date);
  sunday.setDate(date.getDate() - date.getDay()); // Go to Sunday of the week

  for (let i = 0; i < 7; i++) {
    const day = new Date(sunday);
    day.setDate(sunday.getDate() + i);
    week.push(day);
  }

  return week;
}

// Helper function to format date as YYYY-MM-DD
function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Helper function to check if date is a holiday (simplified - you can integrate a holiday library)
function isHoliday(date: Date): boolean {
  // For now, just return false. In a real implementation, use a holiday library like @holiday-jp/holiday_jp
  // Example: return HolidayJp.isHoliday(date);
  return false;
}

// Helper function to get day name in Japanese
function getDayName(dayOfWeek: number): string {
  const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
  return dayNames[dayOfWeek];
}

export default function DispatchTablePage() {
  const { admin } = useAuth();
  const router = useRouter();
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date());
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [workTemplates, setWorkTemplates] = useState<WorkTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const weekDates = getWeekDates(currentWeekStart);

  useEffect(() => {
    if (!admin) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch data for the current week
        const startDate = formatDateKey(weekDates[0]);
        const endDate = formatDateKey(weekDates[6]);

        const [shiftsData, staffsData, templatesData] = await Promise.all([
          getShifts(admin.organizationId),
          getStaffs(admin.organizationId),
          getWorkTemplates(admin.organizationId),
        ]);

        // Filter shifts for the current week
        const weekShifts = shiftsData.filter(
          (shift) => shift.date >= startDate && shift.date <= endDate
        );

        setShifts(weekShifts);
        setStaffs(staffsData);
        setWorkTemplates(templatesData);
      } catch (error) {
        console.error("Error fetching dispatch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [admin, currentWeekStart]);

  const goToPreviousWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeekStart(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeekStart(newDate);
  };

  const goToThisWeek = () => {
    setCurrentWeekStart(new Date());
  };

  // Group shifts by work template
  const shiftsByTemplate = new Map<string, Map<string, Shift[]>>();

  shifts.forEach((shift) => {
    if (!shiftsByTemplate.has(shift.workTemplateId)) {
      shiftsByTemplate.set(shift.workTemplateId, new Map());
    }
    const dateMap = shiftsByTemplate.get(shift.workTemplateId)!;
    if (!dateMap.has(shift.date)) {
      dateMap.set(shift.date, []);
    }
    dateMap.get(shift.date)!.push(shift);
  });

  // Get staff names for a shift
  const getStaffNames = (shift: Shift): string => {
    if (shift.staffIds.length === 0) return "×";

    const names = shift.staffIds
      .map((id) => {
        const staff = staffs.find((s) => s.id === id);
        return staff ? staff.name : "不明";
      })
      .filter(Boolean);

    return names.length > 0 ? names.join("・") : "×";
  };

  // Get work template name
  const getTemplateName = (templateId: string): string => {
    const template = workTemplates.find((t) => t.id === templateId);
    return template ? template.name : "不明な作業";
  };

  // Get vehicle number (using driver assignment for now)
  const getVehicleNumber = (templateId: string): string => {
    const template = workTemplates.find((t) => t.id === templateId);
    // For now, return empty. In a real implementation, you'd have a vehicle field
    return "-";
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
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">配車表（週次）</h1>
            <p className="text-gray-600 mt-1">
              {weekDates[0].toLocaleDateString("ja-JP")} 〜{" "}
              {weekDates[6].toLocaleDateString("ja-JP")}
            </p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
              <ChevronLeft className="h-4 w-4" />
              前週
            </Button>
            <Button variant="outline" size="sm" onClick={goToThisWeek}>
              今週
            </Button>
            <Button variant="outline" size="sm" onClick={goToNextWeek}>
              次週
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Dispatch Table */}
        <Card>
          <CardHeader>
            <CardTitle>週間配車表</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <div className="min-w-full">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-10 bg-white">
                  <tr className="border-b-2 border-gray-300">
                    <th className="sticky left-0 z-20 bg-white px-4 py-3 text-left text-sm font-semibold text-gray-900 border-r border-gray-300">
                      コース名
                    </th>
                    <th className="sticky left-[150px] z-20 bg-white px-4 py-3 text-left text-sm font-semibold text-gray-900 border-r border-gray-300">
                      車番
                    </th>
                    {weekDates.map((date, index) => {
                      const dayOfWeek = date.getDay();
                      const isSunday = dayOfWeek === 0;
                      const isHolidayDate = isHoliday(date);
                      const isRed = isSunday || isHolidayDate;

                      return (
                        <th
                          key={index}
                          className={`px-4 py-3 text-center text-sm font-semibold border-r border-gray-300 ${
                            isRed ? "text-red-600" : "text-gray-900"
                          }`}
                        >
                          <div>
                            {date.getMonth() + 1}/{date.getDate()}
                          </div>
                          <div className="text-xs">({getDayName(dayOfWeek)})</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {Array.from(shiftsByTemplate.keys()).map((templateId, rowIndex) => {
                    const dateMap = shiftsByTemplate.get(templateId)!;
                    const templateName = getTemplateName(templateId);
                    const vehicleNumber = getVehicleNumber(templateId);

                    return (
                      <tr
                        key={templateId}
                        className={`border-b border-gray-200 hover:bg-gray-50 ${
                          rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"
                        }`}
                      >
                        <td className="sticky left-0 z-10 bg-inherit px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-300">
                          {templateName}
                        </td>
                        <td className="sticky left-[150px] z-10 bg-inherit px-4 py-3 text-sm text-gray-600 border-r border-gray-300">
                          {vehicleNumber}
                        </td>
                        {weekDates.map((date, index) => {
                          const dateKey = formatDateKey(date);
                          const dayShifts = dateMap.get(dateKey) || [];
                          const staffNames = dayShifts.map((shift) => getStaffNames(shift)).join(", ");
                          const displayText = staffNames || "-";

                          return (
                            <td
                              key={index}
                              className="px-4 py-3 text-sm text-center text-gray-900 border-r border-gray-300"
                            >
                              {displayText}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {shiftsByTemplate.size === 0 && (
                <div className="py-12 text-center text-gray-500">
                  この週の配車データはありません
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>使い方</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-600">
            <p>• 週単位で配車表を確認できます</p>
            <p>• 前週・次週ボタンで週を切り替えられます</p>
            <p>• 複数スタッフが割り当てられている場合は「・」で区切って表示されます</p>
            <p>• スタッフが未割り当ての場合は「×」が表示されます</p>
            <p>• 日曜日と祝日は赤字で表示されます</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
