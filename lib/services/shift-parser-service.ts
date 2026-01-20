/**
 * Shift Parser Service for parsing natural language shift text
 */

export interface ParsedShiftData {
  type: "absence" | "change" | "unknown";
  workName: string | null;
  startDate: string | null;
  endDate: string | null;
}

/**
 * Parse shift text from natural language
 */
export function parseShiftText(text: string): ParsedShiftData {
  // Keyword detection
  const isAbsence = /休み|欠勤|お休み|休暇/.test(text);
  const isChange = /変更|シフト|交代/.test(text);

  // Extract work name (matches patterns like "Aコース", "配送作業", etc.)
  const workNameMatch = text.match(/([A-Za-z0-9ァ-ヶー]+コース|[A-Za-z0-9ァ-ヶー]+作業)/);
  const workName = workNameMatch ? workNameMatch[1] : null;

  // Extract dates
  const dates = extractDates(text);

  return {
    type: isAbsence ? "absence" : isChange ? "change" : "unknown",
    workName,
    startDate: dates.start,
    endDate: dates.end,
  };
}

/**
 * Extract dates from text
 */
function extractDates(text: string): { start: string | null; end: string | null } {
  const currentYear = new Date().getFullYear();

  // Pattern 1: "5月10日から15日まで"
  const rangeMatch = text.match(/(\d+)月(\d+)日から(\d+)日/);
  if (rangeMatch) {
    const month = rangeMatch[1].padStart(2, "0");
    const startDay = rangeMatch[2].padStart(2, "0");
    const endDay = rangeMatch[3].padStart(2, "0");
    return {
      start: `${currentYear}-${month}-${startDay}`,
      end: `${currentYear}-${month}-${endDay}`,
    };
  }

  // Pattern 2: "5/10-5/15" or "5/10～5/15"
  const dateRangeMatch = text.match(/(\d+)\/(\d+)\s*[-～]\s*(\d+)\/(\d+)/);
  if (dateRangeMatch) {
    const startMonth = dateRangeMatch[1].padStart(2, "0");
    const startDay = dateRangeMatch[2].padStart(2, "0");
    const endMonth = dateRangeMatch[3].padStart(2, "0");
    const endDay = dateRangeMatch[4].padStart(2, "0");
    return {
      start: `${currentYear}-${startMonth}-${startDay}`,
      end: `${currentYear}-${endMonth}-${endDay}`,
    };
  }

  // Pattern 3: "2026-05-10から2026-05-15"
  const isoRangeMatch = text.match(/(\d{4})-(\d{2})-(\d{2})から(\d{4})-(\d{2})-(\d{2})/);
  if (isoRangeMatch) {
    return {
      start: `${isoRangeMatch[1]}-${isoRangeMatch[2]}-${isoRangeMatch[3]}`,
      end: `${isoRangeMatch[4]}-${isoRangeMatch[5]}-${isoRangeMatch[6]}`,
    };
  }

  // Pattern 4: Single date "5月10日" or "5/10"
  const singleDateMatch =
    text.match(/(\d+)月(\d+)日/) || text.match(/(\d+)\/(\d+)/);
  if (singleDateMatch) {
    const month = singleDateMatch[1].padStart(2, "0");
    const day = singleDateMatch[2].padStart(2, "0");
    const date = `${currentYear}-${month}-${day}`;
    return {
      start: date,
      end: date,
    };
  }

  return { start: null, end: null };
}

/**
 * Validate parsed shift data
 */
export function validateShiftData(data: ParsedShiftData): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (data.type === "unknown") {
    errors.push("シフトの種類を判定できませんでした");
  }

  if (!data.startDate) {
    errors.push("開始日が見つかりませんでした");
  }

  if (!data.endDate) {
    errors.push("終了日が見つかりませんでした");
  }

  if (data.type === "change" && !data.workName) {
    errors.push("作業名が見つかりませんでした");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
