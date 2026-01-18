import { format, parse, addDays, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { ja } from "date-fns/locale";

/**
 * Format date to YYYY-MM-DD
 */
export function formatDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * Format time to HH:mm
 */
export function formatTime(date: Date): string {
  return format(date, "HH:mm");
}

/**
 * Parse date key (YYYY-MM-DD) to Date
 */
export function parseDateKey(dateKey: string): Date {
  return parse(dateKey, "yyyy-MM-dd", new Date());
}

/**
 * Parse time (HH:mm) to Date (today)
 */
export function parseTime(time: string): Date {
  return parse(time, "HH:mm", new Date());
}

/**
 * Format date for display
 */
export function formatDateDisplay(date: Date): string {
  return format(date, "yyyy年M月d日(E)", { locale: ja });
}

/**
 * Format datetime for display
 */
export function formatDateTimeDisplay(date: Date): string {
  return format(date, "yyyy年M月d日(E) HH:mm", { locale: ja });
}

/**
 * Get month date range
 */
export function getMonthDateRange(year: number, month: number): { start: Date; end: Date } {
  const date = new Date(year, month - 1, 1);
  return {
    start: startOfMonth(date),
    end: endOfMonth(date),
  };
}

/**
 * Get all days in month
 */
export function getDaysInMonth(year: number, month: number): Date[] {
  const { start, end } = getMonthDateRange(year, month);
  return eachDayOfInterval({ start, end });
}

/**
 * Check if time is within range
 */
export function isTimeInRange(
  time: string,
  range: { start: string; end: string }
): boolean {
  const [timeHour, timeMinute] = time.split(":").map(Number);
  const [startHour, startMinute] = range.start.split(":").map(Number);
  const [endHour, endMinute] = range.end.split(":").map(Number);

  const timeValue = timeHour * 60 + timeMinute;
  const startValue = startHour * 60 + startMinute;
  const endValue = endHour * 60 + endMinute;

  return timeValue >= startValue && timeValue <= endValue;
}

/**
 * Add minutes to time string
 */
export function addMinutesToTime(time: string, minutes: number): string {
  const date = parseTime(time);
  const newDate = new Date(date.getTime() + minutes * 60 * 1000);
  return formatTime(newDate);
}

/**
 * Calculate next execution time
 */
export function calculateNextExecution(currentTime: Date, waitMinutes: number): Date {
  return addDays(currentTime, waitMinutes / (24 * 60));
}
