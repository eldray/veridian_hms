// frontend/src/components/reports/GenericReportPage.tsx
//
// Renders any report declared in config/reportRegistry.ts: filters, summary cards, sortable
// paginated tables, totals and export — one implementation for all of them.
//
// It exists because per-report JSX kept drifting from the API. Every table here can only read
// a field the endpoint returns, every total is either server-computed or an explicit column sum
// over rows the endpoint actually sent, and a list the server capped says so in its footer
// instead of passing itself off as the whole period.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Download, FileText, Filter, RefreshCw, Table2 } from 'lucide-react';
import {
  exportReport, getBillingCollections, getBillingRevenueLines, getClinicalReport,
  getDemographicReport, getEncounterReport, getFinancialReport, getInsuranceClaimsReport,
  getLabReport, getMedicationReport, getNhisClaimsSummary, getNhisExpiryReport,
  getProcedureReport, getRevenueReport, getScanReport, getVitalsReport,
} from '../../api';
import { useToast } from '../../store/toastStore';
import { useAuthStore } from '../../store/authStore';
import {
  currencyOf, columnMeta, EmptyRows, formatCell, isReportEmpty, kindFor, Pager, pickRows,
  readPath, REPORT_EXPORT_ROLES, resolveFilter, resolveTotals, rowKeyOf, SHELL_PAGE_SIZES,
  SortIcons, sumColumn, unwrapReport, useSortedRows,
  type ReportShape, type ReportTable,
} from './reportShell';

/**
 * The helpers a registry entry can name. Adding a report is a new entry in reportRegistry.ts
 * plus its helper here — the request, the shape and the rendering stay separate from both.
 */
const REPORT_LOADERS: Record<string, (params: any) => Promise<any>> = {
  getBillingCollections,
  getBillingRevenueLines,
  getInsuranceClaimsReport,
  getFinancialReport,
  getRevenueReport,
  getDemographicReport,
  // api/index.ts names the attendance report after the old "encounter" wording.
  getAttendanceReport: getEncounterReport,
  getClinicalReport,
  getLabReport,
  getScanReport,
  getProcedureReport,
  getMedicationReport,
  getVitalsReport,
  getNhisExpiryReport,
  getNhisClaimsSummary,
};

const labelOf = (value: unknown): string =>
  String(value).replace(/_/g, ' ').replace(/\b\w/g, character => character.toUpperCase());

/**
 * The period printed on the page. Some services echo the query strings back ("2026-10-01") and
 * some return the Date they built ("2026-10-01T00:00:00.000Z"), so both go through the same
 * date cell as the tables rather than being shown verbatim.
 */
const periodOf = (value: unknown): string => formatCell(value, 'date', 'GHS');

// ── One table ─────────────────────────────────────────────────────────────────

const ShellTable = ({
  table, data, currency, rangeLabel,
}: {
  table: ReportTable;
  data: any;
  currency: string;
  rangeLabel: string;
}) => {
  const rows = useMemo(() => pickRows(table.source, data), [table.source, data]);

  // Type and alignment come from the column as a whole, so the metas are built once over every
  // row — a filter must not be able to make a money column print left-aligned as text.
  const metas = useMemo(() => table.columns.map(column => columnMeta(column, rows)), [table.columns, rows]);

  const [query, setQuery] = useState('');
  const [sortField, setSortField] = useState<string | null>(table.defaultSort || null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(SHELL_PAGE_SIZES[0]);

  const needle = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!needle) return rows;
    // Match on what the table shows, not on the raw JSON: searching "GHS 1,200.00" or
    // "Paid" has to find the row the user is looking at.
    return rows.filter(row => table.columns.some((column, columnIndex) => {
      const value = readPath(row, column.field);
      if (value == null) return false;
      const shown = formatCell(value, metas[columnIndex].value, currency, column.raw).toLowerCase();
      return shown.includes(needle) || String(value).toLowerCase().includes(needle);
    }));
  }, [rows, needle, table.columns, metas, currency]);

  const sorted = useSortedRows(filtered, metas, sortField, sortDir);

  useEffect(() => { setPage(1); }, [needle, pageSize, table.source]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pageCount);
  const visible = sorted.slice((current - 1) * pageSize, current * pageSize);

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir(direction => (direction === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('desc'); }
  };

  // A footer total is only honest if it says what it added up: the whole response, or the
  // subset the on-screen filter left behind.
  const sums = useMemo(() => (table.sumColumns || []).map(field => {
    const meta = metas.find(entry => entry.field === field);
    return { field, label: meta?.header || labelOf(field), value: sumColumn(filtered, field), kind: meta?.value || 'number' };
  }), [table.sumColumns, metas, filtered]);

  const serverTotals = resolveTotals(table, data, currency);

  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
        <div className="flex items-center gap-2">
          <Table2 className="w-4 h-4 text-[var(--icon-cyan-text)]" />
          <span className="text-xs font-semibold text-[var(--text-primary)]">{table.title}</span>
          <span className="text-[11px] text-[var(--text-tertiary)]">· {rows.length.toLocaleString()} row{rows.length === 1 ? '' : 's'}</span>
        </div>
        <div className="relative">
          <Filter className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Filter rows"
            aria-label={`Filter ${table.title} rows`}
            className="pl-8 pr-3 py-1.5 text-[11px] w-44 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--icon-cyan-text)]"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[var(--bg-main)]">
              {metas.map(meta => {
                const active = sortField === meta.field;
                return (
                  <th
                    key={meta.field}
                    style={meta.width ? { minWidth: `${meta.width}px` } : undefined}
                    className={`px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] whitespace-nowrap ${meta.numeric ? 'text-right' : 'text-left'}`}
                  >
                    <button type="button" onClick={() => toggleSort(meta.field)} className="inline-flex items-center hover:text-[var(--text-primary)]">
                      {meta.header}
                      {active && <SortIcons direction={sortDir} />}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <EmptyRows
                colSpan={metas.length}
                message={rows.length === 0
                  ? `${table.title} — nothing in range (${rangeLabel}).`
                  : 'No row matches the filter on this table.'}
              />
            ) : visible.map((row, index) => (
              <tr
                key={rowKeyOf(table, row, index)}
                className="border-t border-[var(--border-color)] hover:bg-[var(--bg-main)]"
              >
                {table.columns.map((column, columnIndex) => {
                  const meta = metas[columnIndex];
                  return (
                    <td
                      key={column.field}
                      className={`px-3 py-2.5 text-[var(--text-secondary)] ${meta.numeric ? 'text-right tabular-nums' : 'text-left'}`}
                    >
                      {formatCell(readPath(row, column.field), meta.value, currency, column.raw)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          {(sums.length > 0 || serverTotals.length > 0) && (
            <tfoot>
              <tr className="border-t border-[var(--border-color)] bg-[var(--bg-main)]">
                <td colSpan={metas.length} className="px-3 py-2.5">
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px]">
                    {serverTotals.map(total => (
                      <span key={total.label} className="text-[var(--text-tertiary)]">
                        {total.label}: <strong className="text-[var(--text-primary)]">{total.value}</strong>
                      </span>
                    ))}
                    {sums.map(sum => (
                      <span key={sum.field} className="text-[var(--text-tertiary)]">
                        {needle ? `${sum.label} (filtered)` : sum.label}:{' '}
                        <strong className="text-[var(--text-primary)]">
                          {sum.value === null ? '—' : formatCell(sum.value, sum.kind === 'money' ? 'money' : 'number', currency)}
                        </strong>
                      </span>
                    ))}
                    {table.cappedAt ? (
                      <span className="text-[var(--text-tertiary)]">List is the newest {table.cappedAt} in range, not the whole period.</span>
                    ) : null}
                  </div>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {table.note && <p className="px-5 py-2.5 text-[11px] text-[var(--text-tertiary)] border-t border-[var(--border-color)]">{table.note}</p>}

      <Pager
        page={current}
        pageSize={pageSize}
        total={sorted.length}
        onPage={setPage}
        onPageSize={setPageSize}
      />
    </div>
  );
};

// ── The page ──────────────────────────────────────────────────────────────────

export default function GenericReportPage({
  shape, dateFrom, dateTo,
}: {
  shape: ReportShape;
  dateFrom: string;
  dateTo: string;
}) {
  const { success, error: toastError } = useToast();
  const { hasRole } = useAuthStore();
  const filters = useMemo(() => (shape.filters || []).map(resolveFilter), [shape.filters]);

  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const filter of (shape.filters || []).map(resolveFilter)) initial[filter.stateKey || filter.key] = filter.defaultValue || '';
    return initial;
  });
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);
  const [format, setFormat] = useState<'csv' | 'excel' | 'pdf'>('csv');
  const sequence = useRef(0);

  // Only send a filter whose endpoint reads it, and send the range under both names the
  // reporting endpoints accept (dateFrom/dateTo and startDate/endDate).
  const request = useMemo(() => {
    const params: Record<string, string | number> = { dateFrom, dateTo, startDate: dateFrom, endDate: dateTo };
    for (const filter of filters) {
      const value = (values[filter.stateKey || filter.key] || '').trim();
      if (value) params[filter.key] = value;
    }
    return { ...shape.source.params, ...params };
  }, [dateFrom, dateTo, filters, values, shape.source.params]);

  const load = useCallback(async () => {
    const helper = REPORT_LOADERS[shape.source.api];
    if (!helper) { setFailed(`Report "${shape.key}" names a loader that does not exist: ${shape.source.api}`); return; }
    const attempt = ++sequence.current;
    setLoading(true);
    setFailed(null);
    try {
      const response = await helper(request);
      // A slow earlier answer must not replace a newer one the user is waiting on.
      if (attempt !== sequence.current) return;
      setData(unwrapReport(response));
      setGeneratedAt(new Date());
    } catch (err: any) {
      if (attempt !== sequence.current) return;
      setData(null);
      const status = err?.response?.status;
      setFailed(status === 401 || status === 403
        ? 'This session is not allowed to read this report.'
        : err?.message || 'The report could not be generated.');
    } finally {
      if (attempt === sequence.current) setLoading(false);
    }
  }, [request, shape.key, shape.source.api]);

  // Debounced, because the revenue-lines report has a search box and every keystroke would
  // otherwise be a fresh query over the whole ledger.
  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const onFilterChange = (stateKey: string, value: string) => {
    setValues(previous => ({ ...previous, [stateKey]: value }));
  };

  const currency = currencyOf(shape, data);
  const rangeLabel = `${dateFrom} to ${dateTo}`;
  const period = shape.periodField ? readPath(data, shape.periodField) : null;
  const periodLabel = period?.startDate && period?.endDate
    ? `${periodOf(period.startDate)} — ${periodOf(period.endDate)}`
    : rangeLabel;
  const cappedByServer = !!data?.capped;
  // POST /reports/export answers only to admin, accounts and records whatever the report is.
  const canExport = hasRole(REPORT_EXPORT_ROLES);

  const handleExport = async () => {
    if (!data) { toastError('Export Failed', 'There is nothing to export yet.'); return; }
    try {
      await exportReport({ reportType: shape.key, format, filters: { startDate: dateFrom, endDate: dateTo }, data });
      success('Export Started', `Generating as ${format.toUpperCase()}`);
    } catch (err: any) {
      toastError('Export Failed', err?.message || 'The report could not be exported.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls the endpoint itself honours */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] px-4 py-3 flex flex-wrap items-end gap-3">
        {filters.map(filter => (
          <label key={filter.stateKey || filter.key} className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">{filter.label}</span>
            {filter.kind === 'select' ? (
              <select
                value={values[filter.stateKey || filter.key] || ''}
                onChange={event => onFilterChange(filter.stateKey || filter.key, event.target.value)}
                className="px-3 py-1.5 text-xs bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--icon-cyan-text)] min-w-40"
              >
                {(filter.options || []).map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={values[filter.stateKey || filter.key] || ''}
                onChange={event => onFilterChange(filter.stateKey || filter.key, event.target.value)}
                placeholder={filter.placeholder}
                className="px-3 py-1.5 text-xs bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--icon-cyan-text)] min-w-40"
              />
            )}
          </label>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[11px] text-[var(--text-tertiary)]">Period: {periodLabel}</span>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)] text-xs font-medium disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Reload
          </button>
          {canExport ? (
            <>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg">
                <span className="text-[11px] text-[var(--text-tertiary)]">Export as</span>
                <select
                  value={format}
                  onChange={event => setFormat(event.target.value as any)}
                  className="bg-transparent text-xs text-[var(--text-primary)] focus:outline-none font-semibold"
                >
                  <option value="csv">CSV</option>
                  <option value="excel">Excel</option>
                  <option value="pdf">PDF</option>
                </select>
              </div>
              <button
                type="button"
                onClick={handleExport}
                disabled={loading || !data}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" /> Export
              </button>
            </>
          ) : (
            <span className="text-[11px] text-[var(--text-tertiary)]">
              Reading only — exporting a report is limited to admin, accounts and records.
            </span>
          )}
        </div>
      </div>

      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{shape.description}</p>

      {filters.length === 0 && (
        <p className="text-[11px] text-[var(--text-tertiary)]">
          This endpoint answers on the period alone, so each table narrows its own rows with its Filter rows box.
        </p>
      )}

      {cappedByServer && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]">
          <AlertCircle className="w-4 h-4 mt-0.5 text-[var(--icon-orange-text)]" />
          <p className="text-[11px] text-[var(--text-secondary)]">
            The period holds more lines than one response carries ({data.limit.toLocaleString()} delivered).
            Narrow the period or the filters before treating these totals as the whole picture.
          </p>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] gap-3">
          <div className="w-8 h-8 border-2 border-[var(--icon-cyan-text)] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-[var(--text-secondary)]">Generating {shape.label}…</p>
        </div>
      )}

      {!loading && failed && (
        <div className="flex items-start gap-3 px-5 py-6 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)]">
          <AlertCircle className="w-5 h-5 text-[var(--icon-red-text)]" />
          <div>
            <p className="text-xs font-semibold text-[var(--text-primary)]">{shape.label} could not be generated</p>
            <p className="text-[11px] text-[var(--text-tertiary)] mt-1">{failed}</p>
            <button type="button" onClick={load} className="mt-3 px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
              Try again
            </button>
          </div>
        </div>
      )}

      {!loading && !failed && data && isReportEmpty(shape, data) && (
        <div className="flex flex-col items-center justify-center gap-2 py-16 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)]">
          <FileText className="w-8 h-8 opacity-25 text-[var(--text-tertiary)]" />
          <p className="text-xs text-[var(--text-tertiary)]">{shape.emptyNote || `Nothing recorded for ${shape.label} in this period.`}</p>
        </div>
      )}

      {!loading && !failed && data && !isReportEmpty(shape, data) && (
        <>
          {shape.cards && shape.cards.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {shape.cards.map(card => {
                const value = readPath(data, card.field);
                return (
                  <div key={card.field} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">{card.label}</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)] leading-none">
                      {formatCell(value, kindFor(card.field, value, card.value), currency)}
                    </p>
                    {card.hint && <p className="text-[11px] text-[var(--text-tertiary)] mt-1.5">{card.hint}</p>}
                  </div>
                );
              })}
            </div>
          )}

          {(shape.tables || []).map(table => (
            <ShellTable key={table.title} table={table} data={data} currency={currency} rangeLabel={rangeLabel} />
          ))}

          {generatedAt && (
            <p className="text-right text-[11px] text-[var(--text-tertiary)]">Generated: {generatedAt.toLocaleString()}</p>
          )}
        </>
      )}
    </div>
  );
}
