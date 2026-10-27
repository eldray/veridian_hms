// frontend/src/components/reports/reportShell.tsx
//
// One renderer for the operational reports on the Reports screen.
//
// Reports here used to carry their own hand-written JSX each, which is how the numbers
// drifted from the API: a table quietly showed "Showing 100 of 142" while the export
// carried everything, a card read a field the service never returns, and the claims report
// showed three stat cards and no rows at all. A report now declares where its numbers and
// its rows live, and this shell reads them the same way every time.
//
// Statutory GHS returns (Form A, malaria, morbidity, IDSR, the consulting register grid)
// deliberately keep their own renderers — those must match a printed form, so the exact
// position of every cell is the point. This shell is for operational reports only.

import { useMemo } from 'react';
import {
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, FileText,
} from 'lucide-react';

// ── Values ────────────────────────────────────────────────────────────────────

export type ColumnValue = 'auto' | 'text' | 'number' | 'money' | 'percent' | 'date' | 'datetime' | 'bool';

export interface ReportColumn {
  header: string;
  /** Dot path into the row. A missing segment is tried with its first letter flipped (see readPath). */
  field: string;
  /** Omit it and the shell decides from the value and the field name. */
  value?: ColumnValue;
  /** Keep the value verbatim — folder numbers, bill numbers and status words. */
  raw?: boolean;
  width?: number;
}

export interface StatField {
  label: string;
  field: string;
  value?: ColumnValue;
  hint?: string;
}

export interface ReportTable {
  title: string;
  /**
   * Where the rows live: a dot path, or a list of candidate paths. A path that resolves to
   * an object of counts (`{"cash": 12, "nhis": 40}`) is turned into rows of
   * `{ key, value }` so grouped counts need no backend change.
   */
  source: string | string[];
  columns: ReportColumn[];
  rowKey?: string;
  defaultSort?: string;
  /**
   * Read the totals from a different branch than the rows — a grouped summary that the
   * service computed, never a sum of the page on screen.
   */
  totalsSource?: string;
  totals?: StatField[];
  /**
   * Column paths to add up under the table. Legal only because these endpoints return every
   * row in the range (Tier 6 removed their silent caps): the sum is over the whole row set,
   * never over the page currently on screen.
   */
  sumColumns?: string[];
  /** Set when the server itself capped the list (top-N); the footer says so. */
  cappedAt?: number;
  note?: string;
}

export type StatCard = StatField;

// ── Filters ───────────────────────────────────────────────────────────────────

export type FilterKind = 'select' | 'text';

export interface ReportFilterDef {
  kind: FilterKind;
  /** Query parameter name this filter writes. */
  key: string;
  label: string;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  defaultValue?: string;
  /**
   * Identity in the page's own state. Two filters of the same report may write the same
   * query parameter (a bill status and a claim status are both `status`), so the control is
   * remembered under its registry name while the request uses `key`.
   */
  stateKey?: string;
}

/**
 * The options the money endpoints accept. Corporate and wallet are counted by
 * PaymentMode/Bill.paymentMode; momo is a payment METHOD, so it is not offered here.
 */
export const PAYMENT_MODE_OPTIONS = [
  { value: '', label: 'Any payer' },
  { value: 'cash', label: 'Cash' },
  { value: 'nhis', label: 'NHIS' },
  { value: 'private_insurance', label: 'Private insurance' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'wallet', label: 'Wallet' },
];

export const BILL_STATUS_OPTIONS = [
  { value: '', label: 'Any bill status' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending' },
  { value: 'partial', label: 'Part paid' },
  { value: 'paid', label: 'Paid' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'waived', label: 'Waived' },
];

export const ORDER_STATUS_OPTIONS = [
  { value: '', label: 'Any status' },
  { value: 'requested', label: 'Requested' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'pending', label: 'Pending' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'dispensed', label: 'Dispensed' },
  { value: 'administered', label: 'Administered' },
];

/** The ServiceType enum, so a revenue-line filter sends the value the column actually holds. */
export const SERVICE_TYPE_OPTIONS = [
  { value: '', label: 'Any service' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'ward', label: 'Ward' },
  { value: 'lab_test', label: 'Lab test' },
  { value: 'scan', label: 'Scan' },
  { value: 'medication', label: 'Medication' },
  { value: 'procedure', label: 'Procedure' },
  { value: 'diagnosis', label: 'Diagnosis' },
  { value: 'miscellaneous', label: 'Miscellaneous' },
];

export const YES_NO_OPTIONS = [
  { value: '', label: 'Registered & walk-in' },
  { value: 'yes', label: 'Registered patients only' },
  { value: 'no', label: 'Walk-in customers only' },
];

export const CLAIM_STATE_OPTIONS = [
  { value: '', label: 'Any claim state' },
  { value: 'pending', label: 'Pending' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'finalized', label: 'Finalized' },
];

/**
 * The filters the endpoints honour. A report only lists a filter whose query parameter its
 * own endpoint actually reads — a control that silently does nothing is worse than none, and
 * this screen has shipped that bug before. Narrowing the rows on screen is separate: every
 * shell report has a "Filter rows" box for that.
 */
export const COMMON_FILTERS: Record<string, ReportFilterDef> = {
  paymentMode: { kind: 'select', key: 'paymentMode', label: 'Payer', options: PAYMENT_MODE_OPTIONS, defaultValue: '' },
  billStatus: { kind: 'select', key: 'status', label: 'Bill status', options: BILL_STATUS_OPTIONS, defaultValue: '' },
  claimStatus: { kind: 'select', key: 'status', label: 'Claim state', options: CLAIM_STATE_OPTIONS, defaultValue: '' },
  orderStatus: { kind: 'select', key: 'status', label: 'Order status', options: ORDER_STATUS_OPTIONS, defaultValue: '' },
  walkIn: { kind: 'select', key: 'walkIn', label: 'Customer', options: YES_NO_OPTIONS, defaultValue: '' },
};

/** A report declares filters by key, or writes its own when the shared set does not fit. */
export type FilterRef = string | ReportFilterDef;

export function resolveFilter(ref: FilterRef): ReportFilterDef {
  if (typeof ref !== 'string') return { ...ref, stateKey: ref.stateKey || ref.key };
  const known = COMMON_FILTERS[ref];
  if (!known) throw new Error(`Unknown report filter "${ref}" — declare it or name an existing one`);
  return { ...known, stateKey: ref };
}

// ── Shapes ────────────────────────────────────────────────────────────────────

export interface DataSource {
  /** api/index.ts helper that loads this report. */
  api: string;
  /** Static parameters merged into every request for this report. */
  params?: Record<string, string | number | boolean>;
}

export interface ReportShape {
  key: string;
  label: string;
  /** Which existing Reports tab the pill sits on. */
  group: 'ghs' | 'clinical' | 'financial' | 'nhis';
  description: string;
  source: DataSource;
  /** Response field holding the period actually covered, when it is not `period`. */
  periodField?: string;
  filters?: FilterRef[];
  /** Response field holding the currency code. */
  currencyField?: string;
  cards?: StatCard[];
  tables?: ReportTable[];
  /** Shown instead of the generic "no rows" when the endpoint returns nothing. */
  emptyNote?: string;
}

// ── Reading values out of a response ──────────────────────────────────────────

/**
 * Prisma relation names come back with only the first letter lowercased (`LabTest` becomes
 * `labTest`, `CounterClient` becomes `counterClient`), and the two spellings have bitten this
 * screen before, so a segment that is missing is tried with its first letter flipped.
 */
function readSegment(obj: any, segment: string): any {
  if (obj == null || typeof obj !== 'object') return undefined;
  if (Object.prototype.hasOwnProperty.call(obj, segment)) return obj[segment];
  const lower = segment.charAt(0).toLowerCase() + segment.slice(1);
  if (Object.prototype.hasOwnProperty.call(obj, lower)) return obj[lower];
  const upper = segment.charAt(0).toUpperCase() + segment.slice(1);
  if (Object.prototype.hasOwnProperty.call(obj, upper)) return obj[upper];
  return undefined;
}

export function readPath(data: any, path?: string): any {
  if (!path) return data;
  let cursor = data;
  for (const segment of path.split('.')) {
    cursor = readSegment(cursor, segment);
    if (cursor === undefined || cursor === null) return undefined;
  }
  return cursor;
}

/** `{ success, data }` — and sometimes `data` again inside `data`, which the store unwraps twice too. */
export function unwrapReport(response: any): any {
  let cursor = response;
  for (let depth = 0; depth < 3; depth++) {
    if (!cursor || typeof cursor !== 'object' || Array.isArray(cursor)) break;
    const inner = cursor.data;
    if (!inner || typeof inner !== 'object' || Array.isArray(inner)) break;
    if (!('success' in cursor) && !('data' in cursor)) break;
    cursor = inner;
  }
  return cursor;
}

const COUNT_MAP_KEYS = ['byType', 'byPaymentMode', 'byStatus', 'byMode', 'byPayer', 'byMethod', 'byDepartment', 'byWard', 'byPatientClass', 'bySeverity', 'byDrug', 'byTest', 'byScan', 'byProcedure'];

const isPlainCountMap = (value: any): boolean =>
  !!value && typeof value === 'object' && !Array.isArray(value) &&
  Object.values(value).every(entry => typeof entry === 'number');

/**
 * Rows may live at a dot path, behind one of the array keys the APIs keep renaming, or as an
 * object of counts — which becomes `{ key, value }` rows so a grouped table needs no endpoint.
 */
export function pickRows(source: ReportTable['source'], data: any): any[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  const candidates = typeof source === 'string' ? [source] : Array.isArray(source) ? source : [];
  for (const candidate of candidates) {
    const value = readPath(data, candidate);
    if (Array.isArray(value)) return value;
    if (isPlainCountMap(value)) {
      return Object.entries(value).map(([key, count]) => ({ key, value: count }));
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const nested = (Object.keys(value) as string[])
        .filter(key => Array.isArray(value[key]) || isPlainCountMap(value[key]))
        .sort((a, b) => (COUNT_MAP_KEYS.includes(a) ? -1 : 0) - (COUNT_MAP_KEYS.includes(b) ? -1 : 0));
      for (const key of nested) {
        const rows = pickRows(key, value);
        if (rows.length) return rows;
      }
    }
  }
  return [];
}

export function isReportEmpty(shape: ReportShape, data: any): boolean {
  if (data == null) return true;
  const anyCard = (shape.cards || []).some(card => readPath(data, card.field) != null);
  if (anyCard) return false;
  return (shape.tables || []).every(table => pickRows(table.source, data).length === 0);
}

// ── Cells ─────────────────────────────────────────────────────────────────────

const MONEY_NAME = /(amount|revenue|total|paid|balance|price|cost|value|bill|charge|fee|sum|money|collected|outstanding|waiver|credit|deposit)/i;
const COUNT_NAME = /(^|_)(count|total|quantity|qty|cases|visits|attendances|patients|bills|tests|scans|procedures|lines|records|claims|days|minutes|value)(_|$)/i;
const DATE_NAME = /(date|time|expiry|expires|birth|dob|day|month|created|updated|started|completed|resulted|performed|verified|dispensed|admitted|discharged|submitted|finalized|visit)/i;
const PERCENT_NAME = /(percent|pct|share|rate|positivity|proportion)/i;

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || value === '' || (typeof value === 'number' && Number.isNaN(value));
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.,-]/g, '').replace(/,/g, '');
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

const prettyToken = (value: string): string =>
  value.replace(/_/g, ' ').replace(/\b\w/g, character => character.toUpperCase());

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "14/Jan/2026" — the day is never read as a month, which is how a report gets rejected. */
function formatDate(value: unknown, withTime: boolean): string {
  if (isBlank(value)) return '';
  const asDate = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(asDate.getTime())) return String(value);
  const day = asDate.getUTCDate();
  const month = MONTHS[asDate.getUTCMonth()];
  const year = asDate.getUTCFullYear();
  if (!withTime) return `${day}/${month}/${year}`;
  const hours = String(asDate.getUTCHours()).padStart(2, '0');
  const minutes = String(asDate.getUTCMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function looksLikeNumberyText(value: string): boolean {
  return /^-?[\d,]+(\.\d+)?$/.test(value.trim()) && toNumber(value) !== null;
}

/**
 * Decide how a value prints. When the registry declares nothing — which is most columns —
 * the type comes from the kind of thing the value actually is, and the field name only picks
 * between money and a count.
 */
export function kindFor(field: string, value: unknown, explicit?: ColumnValue): Exclude<ColumnValue, 'auto'> {
  if (explicit && explicit !== 'auto') return explicit;
  if (typeof value === 'boolean') return 'bool';
  if (typeof value === 'number') {
    if (PERCENT_NAME.test(field)) return 'percent';
    if (MONEY_NAME.test(field)) return 'money';
    return 'number';
  }
  if (typeof value === 'string') {
    if (DATE_NAME.test(field)) return 'date';
    if (looksLikeNumberyText(value)) {
      return PERCENT_NAME.test(field) ? 'percent' : MONEY_NAME.test(field) ? 'money' : 'number';
    }
    return 'text';
  }
  if (value && typeof value === 'object') return 'text';
  return 'text';
}

/** True when every value the column actually holds is numeric — that is what makes a sort honest. */
export function columnIsNumeric(rows: any[], column: ReportColumn): boolean {
  let seen = 0;
  for (const row of rows) {
    const value = readPath(row, column.field);
    if (isBlank(value)) continue;
    if (toNumber(value) === null) return false;
    seen++;
  }
  return seen > 0;
}

export interface ColumnMeta {
  field: string;
  header: string;
  width?: number;
  numeric: boolean;
  value: Exclude<ColumnValue, 'auto'>;
}

/**
 * One kind per column, decided from the first non-blank value in the column rather than from
 * row zero — an empty `paidAmount` at the top would otherwise make the whole money column
 * print as text and align left.
 */
export function columnMeta(column: ReportColumn, rows: any[]): ColumnMeta {
  const sample = rows.map(row => readPath(row, column.field)).find(value => !isBlank(value));
  const value = kindFor(column.field, sample, column.value);
  const numeric = value === 'number' || value === 'money' || value === 'percent'
    || (value === 'text' && columnIsNumeric(rows, column) && (MONEY_NAME.test(column.field) || COUNT_NAME.test(column.field)));
  return { field: column.field, header: column.header, width: column.width, numeric, value };
}

export function formatCell(value: unknown, kind: Exclude<ColumnValue, 'auto'>, currency: string, raw?: boolean): string {
  if (isBlank(value)) return '—';
  if (raw) return String(value);
  switch (kind) {
    case 'bool': {
      if (typeof value === 'boolean') return value ? 'Yes' : 'No';
      const text = String(value).toLowerCase();
      if (['true', 'yes', 'y', '1'].includes(text)) return 'Yes';
      if (['false', 'no', 'n', '0'].includes(text)) return 'No';
      return String(value);
    }
    case 'date':
      return formatDate(value, false);
    case 'datetime':
      return formatDate(value, true);
    case 'number': {
      const asNumber = toNumber(value);
      if (asNumber === null) return String(value);
      const digits = Number.isInteger(asNumber) ? 0 : 2;
      return asNumber.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
    }
    case 'money': {
      const asNumber = toNumber(value);
      if (asNumber === null) return String(value);
      return `${currency} ${asNumber.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    case 'percent': {
      const asNumber = toNumber(value);
      if (asNumber === null) return String(value);
      return `${Math.round(asNumber * 10) / 10}%`;
    }
    default: {
      if (value && typeof value === 'object') {
        for (const name of ['name', 'label', 'title', 'fullName', 'companyName', 'code']) {
          const candidate = readPath(value, name);
          if (typeof candidate === 'string' && candidate.trim()) return candidate;
        }
        return '—';
      }
      return prettyToken(String(value));
    }
  }
}

/** A row's identity, so a 5,000-line table still keys and sorts correctly. */
export function rowKeyOf(table: ReportTable, row: any, index: number): string {
  if (table.rowKey) {
    const value = readPath(row, table.rowKey);
    if (value != null) return String(value);
  }
  for (const candidate of ['id', 'billNumber', 'claimNumber', 'referenceNumber', 'folderNumber', 'testNumber', 'key', 'date', 'month']) {
    const value = readPath(row, candidate);
    if (value != null && typeof value !== 'object') return `${candidate}:${value}`;
  }
  return `row-${index}`;
}

// ── Sorting, totals and the paged slice ───────────────────────────────────────

export function sortRows(rows: any[], metas: ColumnMeta[], field: string | null, direction: 'asc' | 'desc'): any[] {
  if (!field) return rows;
  const meta = metas.find(entry => entry.field === field);
  if (!meta) return rows;
  const sign = direction === 'asc' ? 1 : -1;
  const key = (row: any): string | number => {
    const raw = readPath(row, meta.field);
    if (isBlank(raw)) return 0;
    if (meta.value === 'number' || meta.value === 'money' || meta.value === 'percent') {
      const asNumber = toNumber(raw);
      return asNumber === null ? 0 : asNumber;
    }
    if (meta.value === 'date' || meta.value === 'datetime') {
      const asDate = raw instanceof Date ? raw : new Date(String(raw));
      return Number.isNaN(asDate.getTime()) ? 0 : asDate.getTime();
    }
    return String(raw).toLowerCase();
  };
  return [...rows].sort((a, b) => {
    const left = key(a);
    const right = key(b);
    if (typeof left === 'number' && typeof right === 'number') return (left - right) * sign;
    return String(left).localeCompare(String(right)) * sign;
  });
}

/**
 * The totals row, from fields the service computed. The shell never adds up the rows on
 * screen and calls it a total: a filtered or paged table would print the wrong figure.
 */
export function resolveTotals(table: ReportTable, data: any, currency: string): Array<{ label: string; value: string }> {
  const source = table.totalsSource ? readPath(data, table.totalsSource) : data;
  return (table.totals || [])
    .map(entry => ({
      label: entry.label,
      value: formatCell(readPath(source || {}, entry.field), kindFor(entry.field, readPath(source || {}, entry.field), entry.value), currency, entry.value === 'text'),
    }))
    .filter(entry => entry.value !== '—' && entry.value !== '');
}

export function useSortedRows(rows: any[], metas: ColumnMeta[], field: string | null, direction: 'asc' | 'desc'): any[] {
  return useMemo(() => sortRows(rows, metas, field, direction), [rows, metas, field, direction]);
}

/** Add one numeric column across every row the endpoint returned (not the visible page). */
export function sumColumn(rows: any[], field: string): number | null {
  let seen = 0;
  let total = 0;
  for (const row of rows) {
    const asNumber = toNumber(readPath(row, field));
    if (asNumber === null) continue;
    total += asNumber;
    seen++;
  }
  return seen === 0 ? null : moneyRound(total);
}

/** Two decimal places without the drift that adding Prisma Decimals as text would give. */
function moneyRound(value: number): number {
  return Math.round(value * 100) / 100;
}

/** The currency the report prints in: the response's own field, else the registry default. */
export function currencyOf(shape: ReportShape, data: any): string {
  const fromResponse = shape.currencyField ? readPath(data, shape.currencyField) : undefined;
  return String(fromResponse || 'GHS');
}

// ── Presentational pieces the shell owns ──────────────────────────────────────

export const SortIcons = ({ direction }: { direction: 'asc' | 'desc' | null }) => (
  <span className="inline-flex flex-col leading-none ml-1 align-middle">
    <ChevronUp className={`w-3 h-3 ${direction === 'asc' ? 'text-[var(--icon-cyan-text)]' : 'text-[var(--text-tertiary)] opacity-40'}`} />
    <ChevronDown className={`w-3 h-3 -mt-1 ${direction === 'desc' ? 'text-[var(--icon-cyan-text)]' : 'text-[var(--text-tertiary)] opacity-40'}`} />
  </span>
);

export const EmptyRows = ({ colSpan, message }: { colSpan: number; message: string }) => (
  <tr>
    <td colSpan={colSpan} className="px-4 py-12">
      <div className="flex flex-col items-center justify-center gap-2 text-center">
        <FileText className="w-8 h-8 opacity-25 text-[var(--text-tertiary)]" />
        <p className="text-xs text-[var(--text-tertiary)]">{message}</p>
      </div>
    </td>
  </tr>
);

export const SHELL_PAGE_SIZES = [25, 50, 100, 250];

export const Pager = ({
  page, pageSize, total, onPage, onPageSize,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
}) => {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, pages);
  const from = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const to = Math.min(total, current * pageSize);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-t border-[var(--border-color)] bg-[var(--bg-main)]">
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-[var(--text-tertiary)]">Rows</span>
        <select
          value={String(pageSize)}
          onChange={event => onPageSize(Number(event.target.value))}
          className="px-2 py-1 text-[11px] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none"
        >
          {SHELL_PAGE_SIZES.map(size => <option key={size} value={size}>{size}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-[var(--text-secondary)]">
          {total === 0 ? 'No rows' : `${from.toLocaleString()}–${to.toLocaleString()} of ${total.toLocaleString()}`}
        </span>
        <button
          type="button"
          onClick={() => onPage(Math.max(1, current - 1))}
          disabled={current <= 1}
          className="p-1.5 rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] disabled:opacity-30 hover:text-[var(--text-primary)]"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onPage(Math.min(pages, current + 1))}
          disabled={current >= pages}
          className="p-1.5 rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] disabled:opacity-30 hover:text-[var(--text-primary)]"
          aria-label="Next page"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
