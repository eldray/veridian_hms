// backend/src/utils/reportDates.ts
//
// Date handling shared by the report services.
//
// The screens send plain dates ("2026-10-15"). `new Date("2026-10-15")` is MIDNIGHT at the START of
// that day, so `lte: new Date(endDate)` silently dropped every record from the last day of the range.
// A range must run from the start of the first day to the very end of the last day.

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function startOfDay(d: Date): Date {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  return s;
}

function endOfDay(d: Date): Date {
  const e = new Date(d);
  e.setHours(23, 59, 59, 999);
  return e;
}

/** "2026-10-15" -> that day in the server's local time (not UTC, so the day never shifts). */
function parseLocal(value: string | Date): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const text = String(value).trim();
  if (!text) return null;
  if (DATE_ONLY.test(text)) {
    const [y, m, d] = text.split('-').map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export interface ReportRange {
  gte?: Date;
  lte?: Date;
}

/**
 * Inclusive range for a Prisma date filter.
 *   parseReportRange('2026-10-01', '2026-10-15') -> { gte: Oct 1 00:00:00.000, lte: Oct 15 23:59:59.999 }
 * Either end may be missing. Returns undefined when neither end is given (= no date filter).
 */
export function parseReportRange(
  startDate?: string | Date | null,
  endDate?: string | Date | null,
): ReportRange | undefined {
  const range: ReportRange = {};
  const start = startDate ? parseLocal(startDate) : null;
  const end = endDate ? parseLocal(endDate) : null;
  if (start) range.gte = startOfDay(start);
  if (end) range.lte = endOfDay(end);
  return range.gte || range.lte ? range : undefined;
}

/** Money / quantity from Prisma: Decimal objects, strings, null -> plain number (never string-concatenates). */
export function toNum(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const n = Number(value as any);
  return Number.isFinite(n) ? n : 0;
}

/** Round to 2 decimal places (money). */
export function money(value: unknown): number {
  return Math.round(toNum(value) * 100) / 100;
}


/**
 * Parse a report boundary from an API query.
 * Plain calendar dates use the server's local calendar (matching parseReportRange);
 * explicit timestamps retain their exact instant. This avoids mixing UTC date-only
 * parsing at the start boundary with local-time parsing at the end boundary.
 */
export function parseReportBoundary(
  value: unknown,
  boundary: 'start' | 'end',
): Date | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const raw = value.trim();
  let parsed: Date;
  const isDateOnly = DATE_ONLY.test(raw);
  if (isDateOnly) {
    const [year, month, day] = raw.split('-').map(Number);
    parsed = new Date(year, month - 1, day, 0, 0, 0, 0);
    if (boundary === 'end') parsed.setHours(23, 59, 59, 999);
  } else {
    parsed = new Date(raw);
  }
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}
