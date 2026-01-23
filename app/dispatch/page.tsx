"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useAuth } from "@/lib/hooks/use-auth";
import { getShifts, generateRecurringShifts } from "@/lib/services/shift-service";
import { getStaffs } from "@/lib/services/staff-service";
import { getWorkTemplates } from "@/lib/services/work-template-service";
import { Shift, Staff, WorkTemplate } from "@/lib/types/firestore";
import { ChevronLeft, ChevronRight, Plus, Wand2, Filter, Pencil, X, Move } from "lucide-react";

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

  // Filter states
  const [filterDriver, setFilterDriver] = useState<string>("");
  const [filterWork, setFilterWork] = useState<string>("");

  // Auto-generation states
  const [showAutoGen, setShowAutoGen] = useState(false);
  const [autoGenStartDate, setAutoGenStartDate] = useState("");
  const [autoGenEndDate, setAutoGenEndDate] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<{ created: number; skipped: number } | null>(null);

  // View mode: 'week' or 'month'
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const workTableRef = useRef<HTMLDivElement>(null);

  // Long press and context menu state
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    show: boolean;
    x: number;
    y: number;
    staffId: string;
    date: string;
    shifts: Shift[];
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Generate date range based on view mode
  const visibleDates = useMemo(() => {
    const dates: Date[] = [];

    if (viewMode === 'week') {
      // Week view: 7 days starting from currentWeekStart (today)
      for (let i = 0; i < 7; i++) {
        const date = new Date(currentWeekStart);
        date.setDate(currentWeekStart.getDate() + i);
        dates.push(date);
      }
    } else {
      // Month view: all days in the current month
      const year = currentWeekStart.getFullYear();
      const month = currentWeekStart.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      for (let day = 1; day <= daysInMonth; day++) {
        dates.push(new Date(year, month, day));
      }
    }

    return dates;
  }, [currentWeekStart, viewMode]);

  const fetchData = async () => {
    if (!admin) return;

    try {
      setLoading(true);

      const [shiftsData, staffsData, templatesData] = await Promise.all([
        getShifts(admin.organizationId),
        getStaffs(admin.organizationId),
        getWorkTemplates(admin.organizationId),
      ]);

      setShifts(shiftsData);
      setStaffs(staffsData);
      setWorkTemplates(templatesData);
    } catch (error) {
      console.error("Error fetching dispatch data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [admin]);

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


  // Long press handlers for drag & drop
  const handleCellTouchStart = (e: React.TouchEvent, staffId: string, date: string, dayShifts: Shift[]) => {
    if (dayShifts.length === 0) return; // Only allow long press on cells with shifts

    const touch = e.touches[0];
    const timer = setTimeout(() => {
      // Show context menu after 500ms long press
      setContextMenu({
        show: true,
        x: touch.clientX,
        y: touch.clientY,
        staffId,
        date,
        shifts: dayShifts,
      });
      setIsDragging(true);
    }, 500);

    setLongPressTimer(timer);
  };

  const handleCellTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleCellTouchMove = () => {
    // Cancel long press if user moves finger
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  // Close context menu
  const closeContextMenu = () => {
    setContextMenu(null);
    setIsDragging(false);
  };

  // Mark shifts as "no delivery"
  const handleMarkAsNoDelivery = async () => {
    if (!contextMenu || !admin) return;

    try {
      // In a real implementation, you would update the shifts in Firestore
      // For now, just close the menu
      console.log("Marking as no delivery:", contextMenu.shifts.map(s => s.id));
      closeContextMenu();
      await fetchData(); // Refresh data
    } catch (error) {
      console.error("Error marking as no delivery:", error);
    }
  };

  // Move shifts to another staff
  const handleMoveToStaff = async (targetStaffId: string) => {
    if (!contextMenu || !admin) return;

    try {
      // In a real implementation, you would update the shifts in Firestore
      // to reassign them to the target staff
      console.log("Moving shifts to staff:", targetStaffId, contextMenu.shifts.map(s => s.id));
      closeContextMenu();
      await fetchData(); // Refresh data
    } catch (error) {
      console.error("Error moving shifts:", error);
    }
  };

  // Handle automatic shift generation
  const handleAutoGenerate = async () => {
    if (!admin || !autoGenStartDate || !autoGenEndDate) return;

    setGenerating(true);
    setGenResult(null);

    try {
      const result = await generateRecurringShifts(
        admin.organizationId,
        autoGenStartDate,
        autoGenEndDate
      );

      setGenResult({
        created: result.created,
        skipped: result.skipped,
      });

      // Refresh shifts list
      await fetchData();

      // Close modal after a delay
      setTimeout(() => {
        setShowAutoGen(false);
        setGenResult(null);
        setAutoGenStartDate("");
        setAutoGenEndDate("");
      }, 3000);
    } catch (error) {
      console.error("Auto-generation error:", error);
      alert("シフトの自動生成に失敗しました");
    } finally {
      setGenerating(false);
    }
  };

  // Filter shifts based on selected filters and visible dates
  const visibleShifts = useMemo(() => {
    const startDate = formatDateKey(visibleDates[0]);
    const endDate = formatDateKey(visibleDates[6]);

    let result = shifts.filter(
      (shift) => shift.date >= startDate && shift.date <= endDate
    );

    // Filter by driver
    if (filterDriver) {
      result = result.filter((shift) => {
        if (!shift.driverAssignment) return filterDriver === "unassigned";
        if (filterDriver === "unassigned") {
          return shift.driverAssignment.type === "unassigned";
        }
        return shift.driverAssignment.staffId === filterDriver;
      });
    }

    // Filter by work template
    if (filterWork) {
      result = result.filter((shift) => shift.workTemplateId === filterWork);
    }

    return result;
  }, [shifts, visibleDates, filterDriver, filterWork]);

  // Section A: Group shifts by staff and date
  const shiftsByStaff = useMemo(() => {
    const map = new Map<string, Map<string, Shift[]>>();

    // Initialize map for all active staff
    staffs.forEach((staff) => {
      map.set(staff.id, new Map());
    });

    // Group shifts by staff
    visibleShifts.forEach((shift) => {
      shift.staffIds.forEach((staffId) => {
        if (!map.has(staffId)) {
          map.set(staffId, new Map());
        }
        const dateMap = map.get(staffId)!;
        if (!dateMap.has(shift.date)) {
          dateMap.set(shift.date, []);
        }
        dateMap.get(shift.date)!.push(shift);
      });
    });

    return map;
  }, [visibleShifts, staffs]);

  // Filter and sort staffs based on filterDriver and role
  const visibleStaffs = useMemo(() => {
    // Define role priority: owner > manager > driver
    const rolePriority: Record<string, number> = {
      owner: 1,
      manager: 2,
      driver: 3
    };

    let filteredStaffs = staffs;
    if (filterDriver) {
      filteredStaffs = staffs.filter(staff => staff.id === filterDriver);
    }

    // Sort by role priority, then by name
    return filteredStaffs.sort((a, b) => {
      const priorityA = rolePriority[a.role] || 999;
      const priorityB = rolePriority[b.role] || 999;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // Same role: sort by name (Japanese alphabetical order)
      return a.name.localeCompare(b.name, 'ja');
    });
  }, [staffs, filterDriver]);

  // Get unique assigned work templates from all staffs
  const assignedWorkTemplates = useMemo(() => {
    const templateIds = new Set<string>();
    staffs.forEach(staff => {
      if (staff.assignedWorkTemplateIds && staff.assignedWorkTemplateIds.length > 0) {
        staff.assignedWorkTemplateIds.forEach(templateId => {
          templateIds.add(templateId);
        });
      }
    });

    // If no assigned templates, return all work templates as fallback
    if (templateIds.size === 0) {
      console.log('[Dispatch] No assigned work templates found, showing all work templates');
      return workTemplates;
    }

    // Filter to only include templates that exist in workTemplates
    const filtered = workTemplates.filter(template => templateIds.has(template.id));
    console.log('[Dispatch] Assigned work templates:', filtered.length, '/', workTemplates.length);
    return filtered;
  }, [staffs, workTemplates]);

  // Section B: Group shifts by work template
  const shiftsByTemplate = useMemo(() => {
    const map = new Map<string, Map<string, Shift[]>>();

    visibleShifts.forEach((shift) => {
      if (!map.has(shift.workTemplateId)) {
        map.set(shift.workTemplateId, new Map());
      }
      const dateMap = map.get(shift.workTemplateId)!;
      if (!dateMap.has(shift.date)) {
        dateMap.set(shift.date, []);
      }
      dateMap.get(shift.date)!.push(shift);
    });

    return map;
  }, [visibleShifts]);

  // Get work template names for shifts
  const getWorkNames = (shifts: Shift[]): string => {
    if (shifts.length === 0) return "-";

    const names = shifts
      .map((shift) => {
        const template = workTemplates.find((t) => t.id === shift.workTemplateId);
        return template ? template.name : "不明";
      })
      .filter(Boolean);

    return names.length > 0 ? names.join("・") : "-";
  };


  // Get staff role in Japanese
  const getStaffRoleJapanese = (role: string): string => {
    switch (role) {
      case "driver": return "ドライバー";
      case "manager": return "管理職";
      case "owner": return "経営者";
      default: return role;
    }
  };

  // Get staff assigned course names for a specific date (based on recurring schedule)
  const getStaffAssignedCoursesForDate = (staff: Staff, date: Date): string => {
    const dayOfWeek = date.getDay();

    if (staff.assignedWorkTemplateIds && staff.assignedWorkTemplateIds.length > 0) {
      const courseNames = staff.assignedWorkTemplateIds
        .map(id => {
          const template = workTemplates.find(t => t.id === id);
          // Only include if template's recurring schedule includes this day
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
      // For freetext assignments, check staff's own recurring schedule
      if (staff.recurringSchedule && staff.recurringSchedule.daysOfWeek.includes(dayOfWeek)) {
        return staff.assignedWorkFreetext;
      }
      return "-";
    }
    return "-";
  };

  // Get driver names for work template shifts or ○ based on recurring schedule
  const getDriverNamesOrCircle = (shifts: Shift[], template: WorkTemplate | undefined, date: Date): string => {
    // If there are shifts, show driver names
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

    // If no shifts, check recurring schedule
    if (template && template.recurringSchedule) {
      const dayOfWeek = date.getDay();
      if (template.recurringSchedule.daysOfWeek.includes(dayOfWeek)) {
        return "○";
      }
    }

    return "-";
  };


  // Get work times for shifts
  const getWorkTimes = (shifts: Shift[]): string => {
    if (shifts.length === 0) return "-";

    const times = shifts
      .map((shift) => {
        const end = shift.endTime || "未定";
        return `${shift.startTime}～${end}`;
      })
      .filter(Boolean);

    return times.length > 0 ? times.join("、") : "-";
  };

  // Get work template name
  const getTemplateName = (templateId: string): string => {
    const template = workTemplates.find((t) => t.id === templateId);
    return template ? template.name : "不明な作業";
  };

  // Get staff name
  const getStaffName = (staffId: string): string => {
    const staff = staffs.find((s) => s.id === staffId);
    return staff ? staff.name : "不明";
  };

  // Handle cell click to edit shift
  const handleCellClick = (dateKey: string, shifts: Shift[]) => {
    if (shifts.length > 0) {
      // Navigate to edit page for the first shift
      router.push(`/shifts/${shifts[0].id}`);
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

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">配車表</h1>
            <p className="text-gray-600 mt-1">
              {visibleDates[0]?.toLocaleDateString("ja-JP")} 〜{" "}
              {visibleDates[visibleDates.length - 1]?.toLocaleDateString("ja-JP")}
            </p>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex justify-center gap-2 mb-4">
          <Button
            variant={viewMode === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('week')}
          >
            週表示
          </Button>
          <Button
            variant={viewMode === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('month')}
          >
            1ヶ月表示
          </Button>
        </div>

        {/* Navigation Controls */}
        <div className="flex justify-center gap-2 flex-wrap mb-4">
          {viewMode === 'week' ? (
            <>
              <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                前週
              </Button>
              <Button variant="outline" size="sm" onClick={goToThisWeek}>
                今週
              </Button>
              <Button variant="outline" size="sm" onClick={goToNextWeek}>
                次週
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newDate = new Date(currentWeekStart);
                  newDate.setMonth(newDate.getMonth() - 1);
                  setCurrentWeekStart(newDate);
                }}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                前月
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentWeekStart(new Date())}
              >
                今月
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newDate = new Date(currentWeekStart);
                  newDate.setMonth(newDate.getMonth() + 1);
                  setCurrentWeekStart(newDate);
                }}
              >
                次月
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </>
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              絞り込み
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="filterDriver">
                  スタッフで絞り込み
                  <span className="text-xs text-gray-500 ml-2">
                    ({staffs.length}人登録)
                  </span>
                </Label>
                <Select
                  id="filterDriver"
                  value={filterDriver}
                  onChange={(e) => setFilterDriver(e.target.value)}
                >
                  <option value="">すべて表示</option>
                  <option value="unassigned">未定のみ</option>
                  {staffs.length === 0 && (
                    <option disabled>スタッフを読み込み中...</option>
                  )}
                  {staffs.length > 0 && (
                    <optgroup label="スタッフ一覧">
                      {staffs.map((staff) => (
                        <option key={staff.id} value={staff.id}>
                          {staff.name} ({getStaffRoleJapanese(staff.role)})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="filterWork">
                  担当作業で絞り込み
                  <span className="text-xs text-gray-500 ml-2">
                    ({assignedWorkTemplates.length}件)
                  </span>
                </Label>
                <Select
                  id="filterWork"
                  value={filterWork}
                  onChange={(e) => setFilterWork(e.target.value)}
                >
                  <option value="">すべて表示</option>
                  {assignedWorkTemplates.length === 0 && (
                    <option disabled>担当作業が設定されていません</option>
                  )}
                  {assignedWorkTemplates.length > 0 && (
                    <optgroup label="担当作業一覧">
                      {assignedWorkTemplates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </Select>
              </div>
            </div>

            {(filterDriver || filterWork) && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilterDriver("");
                    setFilterWork("");
                  }}
                >
                  フィルターをクリア
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Auto Generation Modal */}
        {showAutoGen && (
          <Card className="border-blue-500 border-2">
            <CardHeader>
              <CardTitle>シフト自動生成</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                作業マスタの繰り返し設定に基づいてシフトを自動生成します
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="autoGenStartDate">開始日</Label>
                  <Input
                    id="autoGenStartDate"
                    type="date"
                    value={autoGenStartDate}
                    onChange={(e) => setAutoGenStartDate(e.target.value)}
                    disabled={generating}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="autoGenEndDate">終了日</Label>
                  <Input
                    id="autoGenEndDate"
                    type="date"
                    value={autoGenEndDate}
                    onChange={(e) => setAutoGenEndDate(e.target.value)}
                    disabled={generating}
                  />
                </div>
              </div>

              {genResult && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-800">
                    ✓ {genResult.created}件のシフトを作成しました
                    {genResult.skipped > 0 && `（${genResult.skipped}件はスキップ）`}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleAutoGenerate}
                  disabled={generating || !autoGenStartDate || !autoGenEndDate}
                >
                  {generating ? "生成中..." : "生成"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAutoGen(false);
                    setAutoGenStartDate("");
                    setAutoGenEndDate("");
                    setGenResult(null);
                  }}
                  disabled={generating}
                >
                  キャンセル
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section A: Staff-based Dispatch Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              スタッフ別配車表
              {(filterDriver || filterWork) && (
                <span className="text-sm font-normal text-gray-500 ml-2">
                  （絞り込み中）
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent
            className="p-0 overflow-x-scroll overflow-y-hidden max-w-full"
            style={{
              WebkitOverflowScrolling: 'touch',
              overscrollBehaviorX: 'contain',
              maxWidth: '100vw'
            }}
            ref={scrollContainerRef}
          >
            <table className="border-collapse" style={{ minWidth: 'max-content' }}>
                <thead className="sticky top-0 z-10 bg-white">
                  <tr className="border-b-2 border-gray-300">
                    <th className="sticky left-0 z-20 bg-white px-3 py-3 text-left text-xs font-semibold text-gray-900 border-r border-gray-300 min-w-[80px]">
                      名前
                    </th>
                    <th className="sticky left-20 z-20 bg-white px-3 py-3 text-center text-xs font-semibold text-gray-900 border-r border-gray-300 min-w-[100px] hidden md:table-cell">
                      役割
                    </th>
                    <th className="sticky left-20 md:left-[180px] z-20 bg-white px-3 py-3 text-center text-xs font-semibold text-gray-900 border-r border-gray-300 min-w-[80px]">
                      車両No.
                    </th>
                    {visibleDates.map((date, index) => {
                      const dayOfWeek = date.getDay();
                      const isSunday = dayOfWeek === 0;
                      const isHolidayDate = isHoliday(date);
                      const isRed = isSunday || isHolidayDate;

                      return (
                        <th
                          key={index}
                          className={`px-4 py-3 text-center text-sm font-semibold border-r border-gray-300 min-w-[120px] ${
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
                  {visibleStaffs.map((staff, rowIndex) => {
                    const dateMap = shiftsByStaff.get(staff.id) || new Map();

                    return (
                      <tr
                        key={staff.id}
                        className={`border-b border-gray-200 hover:bg-gray-50 ${
                          rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"
                        }`}
                      >
                        <td className="sticky left-0 z-10 bg-inherit px-3 py-2 text-xs font-medium text-gray-900 border-r border-gray-300 min-w-[80px]">
                          <div>{staff.name}</div>
                          <div className="text-[10px] text-gray-500 mt-0.5">車番未設定</div>
                        </td>
                        <td className="sticky left-20 z-10 bg-inherit px-3 py-2 text-xs text-center text-gray-600 border-r border-gray-300 min-w-[100px] whitespace-nowrap hidden md:table-cell">
                          {getStaffRoleJapanese(staff.role)}
                        </td>
                        <td className="sticky left-20 md:left-[180px] z-10 bg-inherit px-3 py-2 text-xs text-center text-gray-600 border-r border-gray-300 min-w-[80px] whitespace-nowrap">
                          -
                        </td>
                        {visibleDates.map((date, index) => {
                          const dateKey = formatDateKey(date);
                          const dayShifts = dateMap.get(dateKey) || [];
                          const assignedCourses = getStaffAssignedCoursesForDate(staff, date);
                          const hasShift = dayShifts.length > 0;

                          return (
                            <td
                              key={index}
                              className="px-2 py-2 text-xs text-center text-gray-900 border-r border-gray-300 cursor-pointer hover:bg-blue-50 transition-colors"
                              onClick={() => handleCellClick(dateKey, dayShifts)}
                              onTouchStart={(e) => handleCellTouchStart(e, staff.id, dateKey, dayShifts)}
                              onTouchEnd={handleCellTouchEnd}
                              onTouchMove={handleCellTouchMove}
                              title={dayShifts.length > 0 ? "長押しでメニュー表示" : undefined}
                            >
                              <div className="flex flex-col items-center justify-center gap-1">
                                <div className="text-[11px] text-gray-700">{assignedCourses}</div>
                                {dayShifts.length > 0 && (
                                  <Pencil className="h-3 w-3 text-gray-400" />
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {staffs.length === 0 && (
                <div className="py-12 text-center text-gray-500">
                  スタッフが登録されていません
                </div>
              )}
          </CardContent>
        </Card>

        {/* Section B: Work-based Dispatch Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              作業別配車表（時間）
              {(filterDriver || filterWork) && (
                <span className="text-sm font-normal text-gray-500 ml-2">
                  （絞り込み中）
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent
            className="p-0 overflow-x-scroll overflow-y-hidden max-w-full"
            style={{
              WebkitOverflowScrolling: 'touch',
              overscrollBehaviorX: 'contain',
              maxWidth: '100vw'
            }}
            ref={workTableRef}
          >
            <table className="border-collapse" style={{ minWidth: 'max-content' }}>
                <thead className="sticky top-0 z-10 bg-white">
                  <tr className="border-b-2 border-gray-300">
                    <th className="sticky left-0 z-20 bg-white px-3 py-3 text-left text-xs font-semibold text-gray-900 border-r border-gray-300 min-w-[150px]">
                      作業
                    </th>
                    <th className="sticky left-[150px] z-20 bg-white px-3 py-3 text-center text-xs font-semibold text-gray-900 border-r border-gray-300 min-w-[80px]">
                      車両No.
                    </th>
                    {visibleDates.map((date, index) => {
                      const dayOfWeek = date.getDay();
                      const isSunday = dayOfWeek === 0;
                      const isHolidayDate = isHoliday(date);
                      const isRed = isSunday || isHolidayDate;

                      return (
                        <th
                          key={index}
                          className={`px-4 py-3 text-center text-sm font-semibold border-r border-gray-300 min-w-[120px] ${
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
                    const template = workTemplates.find(t => t.id === templateId);
                    const templateName = getTemplateName(templateId);

                    return (
                      <tr
                        key={templateId}
                        className={`border-b border-gray-200 hover:bg-gray-50 ${
                          rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"
                        }`}
                      >
                        <td className="sticky left-0 z-10 bg-inherit px-3 py-2 text-xs font-medium text-gray-900 border-r border-gray-300 min-w-[150px] whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]" title={templateName}>
                          {templateName}
                        </td>
                        <td className="sticky left-[150px] z-10 bg-inherit px-3 py-2 text-xs text-center text-gray-600 border-r border-gray-300 min-w-[80px] whitespace-nowrap">
                          -
                        </td>
                        {visibleDates.map((date, index) => {
                          const dateKey = formatDateKey(date);
                          const dayShifts = dateMap.get(dateKey) || [];
                          const displayText = getDriverNamesOrCircle(dayShifts, template, date);

                          return (
                            <td
                              key={index}
                              className="px-2 py-2 text-xs text-center text-gray-900 border-r border-gray-300 cursor-pointer hover:bg-blue-50 transition-colors"
                              onClick={() => handleCellClick(dateKey, dayShifts)}
                              title={dayShifts.length > 0 ? "クリックして編集" : undefined}
                            >
                              <div className="flex flex-col items-center justify-center gap-1">
                                {dayShifts.length > 0 && dayShifts[0].startTime && (
                                  <div className="text-[10px] text-gray-500 font-medium">
                                    {dayShifts[0].startTime}
                                  </div>
                                )}
                                <div className="flex items-center gap-1">
                                  {displayText}
                                  {dayShifts.length > 0 && (
                                    <Pencil className="h-3 w-3 text-gray-400" />
                                  )}
                                </div>
                              </div>
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
                  {filterDriver || filterWork
                    ? "条件に一致する配車データはありません"
                    : "この期間の配車データはありません"}
                </div>
              )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>使い方</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-600">
            <p>• 2つのセクションで配車表を確認できます</p>
            <p>  - スタッフ別配車表：各スタッフの役割、担当コース、車両ナンバーを確認</p>
            <p>  - 作業別配車表：各作業の業務開始時間、車両ナンバー、割り当てられたドライバーを確認</p>
            <p>• セルをクリックすると、配車の編集ができます</p>
            <p>• 前週・次週ボタンで週を切り替えられます</p>
            <p>• 前日・次日ボタンで日付をスライドして閲覧できます</p>
            <p>• 配車表の上で左右にスワイプすると、日付を前後にスクロールできます</p>
            <p>• ドライバーや作業で絞り込みができます</p>
            <p>• 自動生成ボタンで繰り返し設定から一括生成できます</p>
            <p>• 担当作業は繰り返し設定の曜日に基づいて表示されます</p>
            <p>• 複数のドライバーや作業は「・」で区切って表示されます</p>
            <p>• 日曜日と祝日は赤字で表示されます</p>
          </CardContent>
        </Card>

        {/* Context Menu for Drag & Drop */}
        {contextMenu && contextMenu.show && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black bg-opacity-30 z-40"
              onClick={closeContextMenu}
            />
            {/* Menu */}
            <div
              className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-2 min-w-[200px]"
              style={{
                left: Math.min(contextMenu.x, window.innerWidth - 220),
                top: Math.min(contextMenu.y, window.innerHeight - 300),
              }}
            >
              <div className="flex items-center justify-between mb-2 pb-2 border-b">
                <h3 className="text-sm font-semibold text-gray-900">配車操作</h3>
                <button
                  onClick={closeContextMenu}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Mark as no delivery option */}
              <button
                onClick={handleMarkAsNoDelivery}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                配送無しにする
              </button>

              {/* Move to another staff */}
              <div className="mt-2 pt-2 border-t">
                <p className="text-xs text-gray-500 px-3 mb-1">他のスタッフに移動:</p>
                <div className="max-h-40 overflow-y-auto">
                  {staffs
                    .filter(s => s.id !== contextMenu.staffId)
                    .map(staff => (
                      <button
                        key={staff.id}
                        onClick={() => handleMoveToStaff(staff.id)}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2"
                      >
                        <Move className="h-4 w-4" />
                        {staff.name}
                      </button>
                    ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
