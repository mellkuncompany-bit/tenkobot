"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/hooks/use-auth";
import { getShifts, generateRecurringShifts } from "@/lib/services/shift-service";
import { getStaffs } from "@/lib/services/staff-service";
import { getWorkTemplates } from "@/lib/services/work-template-service";
import {
  getDriverDisplayName,
  getDriverAssignmentBadgeVariant,
} from "@/lib/services/driver-assignment-service";
import { Shift, Staff, WorkTemplate } from "@/lib/types/firestore";
import { Plus, Pencil, Calendar, Filter, Wand2 } from "lucide-react";
import { formatDateDisplay } from "@/lib/utils/date";

export default function ShiftsPage() {
  const { admin } = useAuth();
  const router = useRouter();
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

  useEffect(() => {
    if (!admin) return;
    const fetch = async () => {
      try {
        const [shiftsData, staffsData, workTemplatesData] = await Promise.all([
          getShifts(admin.organizationId),
          getStaffs(admin.organizationId),
          getWorkTemplates(admin.organizationId),
        ]);
        setShifts(shiftsData.slice(0, 50)); // 最新50件
        setStaffs(staffsData);
        setWorkTemplates(workTemplatesData);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [admin]);

  // Filter shifts based on selected filters
  const filteredShifts = useMemo(() => {
    let result = shifts;

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
  }, [shifts, filterDriver, filterWork]);

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
      const shiftsData = await getShifts(admin.organizationId);
      setShifts(shiftsData.slice(0, 50));

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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">読み込み中...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">シフト管理</h1>
            <p className="text-gray-600 mt-1">シフトの作成・編集</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowAutoGen(true)}>
              <Wand2 className="h-4 w-4 mr-2" />
              自動生成
            </Button>
            <Button onClick={() => router.push("/shifts/new")}>
              <Plus className="h-4 w-4 mr-2" />
              新規作成
            </Button>
          </div>
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
                <Label htmlFor="filterDriver">担当ドライバー</Label>
                <Select
                  id="filterDriver"
                  value={filterDriver}
                  onChange={(e) => setFilterDriver(e.target.value)}
                >
                  <option value="">すべて</option>
                  <option value="unassigned">未定</option>
                  {staffs
                    .filter((s) => s.role === "driver")
                    .map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name}
                      </option>
                    ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="filterWork">作業</Label>
                <Select
                  id="filterWork"
                  value={filterWork}
                  onChange={(e) => setFilterWork(e.target.value)}
                >
                  <option value="">すべて</option>
                  {workTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
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

        <Card>
          <CardHeader>
            <CardTitle>
              シフト一覧 (
              {filterDriver || filterWork
                ? `${filteredShifts.length}件 / ${shifts.length}件`
                : `${shifts.length}件`}
              )
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredShifts.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                {filterDriver || filterWork ? (
                  <>
                    <p className="text-gray-500 mb-4">条件に一致するシフトがありません</p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setFilterDriver("");
                        setFilterWork("");
                      }}
                    >
                      フィルターをクリア
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-gray-500 mb-4">シフトが登録されていません</p>
                    <Button onClick={() => router.push("/shifts/new")}>
                      <Plus className="h-4 w-4 mr-2" />
                      最初のシフトを作成
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>日付</TableHead>
                    <TableHead>時間</TableHead>
                    <TableHead>作業</TableHead>
                    <TableHead>担当スタッフ</TableHead>
                    <TableHead>担当ドライバー</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredShifts.map((shift) => {
                    const workTemplate = workTemplates.find((t) => t.id === shift.workTemplateId);
                    return (
                      <TableRow key={shift.id}>
                        <TableCell className="font-medium">{shift.date}</TableCell>
                        <TableCell>
                          {shift.startTime} 〜 {shift.endTime || "未定"}
                        </TableCell>
                        <TableCell>{workTemplate?.name || "不明"}</TableCell>
                        <TableCell>{shift.staffIds.length}名</TableCell>
                        <TableCell>
                          <Badge variant={getDriverAssignmentBadgeVariant(shift.driverAssignment)}>
                            {getDriverDisplayName(shift.driverAssignment, staffs)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              shift.status === "completed"
                                ? "success"
                                : shift.status === "active"
                                ? "info"
                                : "outline"
                            }
                          >
                            {shift.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/shifts/${shift.id}`)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Auto-generation Modal */}
        {showAutoGen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5" />
                  シフト自動生成
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  繰り返し設定に基づいてシフトを自動生成します
                </p>

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

                {genResult && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm text-green-800">
                      ✓ {genResult.created}件のシフトを作成しました
                      {genResult.skipped > 0 && ` (${genResult.skipped}件はスキップ)`}
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleAutoGenerate}
                    disabled={!autoGenStartDate || !autoGenEndDate || generating}
                    className="flex-1"
                  >
                    {generating ? "生成中..." : "生成"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAutoGen(false);
                      setGenResult(null);
                      setAutoGenStartDate("");
                      setAutoGenEndDate("");
                    }}
                    disabled={generating}
                  >
                    閉じる
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
