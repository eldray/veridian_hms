// src/pages/AuditLogs.tsx
// Aligned to Patients / Attendance / Admissions shell: PageHeader + SearchInput + pager card.
// Preserved: server-side pagination / filters via auditStore, JSON diff panels, detail drawer, CSV export.
// 2026-11-15 pass: removed the duplicated When column (same timestamp as Date & Time),
// added Role as its own column (was drawer-only), un-hid Entity ID / IP so every column
// is present at every viewport instead of vanishing at lg/xl.
// 2026-11-19 pass: pagination now PIXEL-MATCHES the Admissions bar — own card below the
// table, "Showing X to Y of Z entries" + "N per page" select on the left, bordered
// chevrons + numbered pages on the right, active page = solid cyan fill / white text.
// Built in-file (not the shared Pagination) because the shared component hides itself
// when totalPages <= 1 and the audit store can report totalPages as 0 — the fallback
// math below (total ÷ limit) guarantees the bar renders whenever rows exist.
// Still server-driven: page -> store setPage, rows per page -> store setLimit + page 1.
// Deliberately NOT added: client-side sort — sorting audit logs must happen server-side
// (a client sort would only reorder the current page and lie about the rest).
import { useEffect, useMemo, useState } from 'react';
import { useAuditStore } from '../store/auditStore';
import { useToast } from '../store/toastStore';
import { AuditLogEntry } from '../api/audit';
import {
  ScrollText, Filter, X, RefreshCw, Download, Eye, ChevronLeft, ChevronRight,
  Activity, User as UserIcon, Clock,
  Globe, FileJson, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Button, PageHeader, SearchInput } from '../components/ui';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const formatDateTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
};

const formatRelative = (iso: string) => {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  const yr = Math.floor(mo / 12);
  return `${yr}y ago`;
};

const ACTION_STYLES: Record<string, string> = {
  create:  'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]',
  update:  'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]',
  delete:  'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]',
  void:    'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]',
  approve: 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]',
  reject:  'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]',
  submit:  'bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)]',
  print:   'bg-[var(--bg-main)] text-[var(--text-secondary)]',
  login:   'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]',
  logout:  'bg-[var(--bg-main)] text-[var(--text-secondary)]',
};

const actionStyle = (action: string) =>
  ACTION_STYLES[action] ?? 'bg-[var(--bg-main)] text-[var(--text-secondary)]';

const humanizeEntity = (s: string) =>
  s
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

// Page numbers with ellipsis — 1 2 3 … last (same windowing the Admissions bar uses).
const pageNumbers = (page: number, totalPages: number): (number | '…')[] => {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = new Set<number>([1, 2, page - 1, page, page + 1, totalPages - 1, totalPages]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) out.push('…');
    out.push(p);
    prev = p;
  }
  return out;
};

// ─────────────────────────────────────────────
// JSON diff panel (collapsible)
// ─────────────────────────────────────────────
const JsonBlock: React.FC<{ title: string; value: any; defaultOpen?: boolean }> = ({
  title,
  value,
  defaultOpen = false,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const isEmpty = value === null || value === undefined;

  return (
    <div className="border border-[var(--border-color)] rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 bg-[var(--bg-main)] hover:bg-[var(--bg-card)] transition-colors"
      >
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2">
          <FileJson className="w-3.5 h-3.5" />
          {title}
          {isEmpty && (
            <span className="text-[10px] font-normal text-[var(--text-tertiary)] normal-case tracking-normal">
              (empty)
            </span>
          )}
        </span>
        {!isEmpty &&
          (open ? (
            <ChevronUp className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
          ))}
      </button>
      {open && !isEmpty && (
        <pre className="px-3 py-2 text-xs text-[var(--text-primary)] bg-[var(--bg-card)] overflow-x-auto whitespace-pre-wrap break-all">
          {JSON.stringify(value, null, 2)}
        </pre>
      )}
      {!open && !isEmpty && (
        <div className="px-3 py-2 text-xs text-[var(--text-tertiary)] bg-[var(--bg-card)] truncate">
          {JSON.stringify(value).slice(0, 120)}…
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// Detail drawer
// ─────────────────────────────────────────────
const LogDrawer: React.FC<{ log: AuditLogEntry; onClose: () => void }> = ({ log, onClose }) => (
  <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
    <div className="absolute inset-0 bg-black/40" />
    <div
      className="relative bg-[var(--bg-card)] w-full max-w-2xl h-full overflow-y-auto border-l border-[var(--border-color)] shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="sticky top-0 bg-[var(--bg-card)] border-b border-[var(--border-color)] px-5 py-4 flex items-start justify-between gap-4 z-10">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${actionStyle(
                log.action,
              )}`}
            >
              <Activity className="w-3 h-3" />
              {log.action}
            </span>
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              {humanizeEntity(log.entityType)}
            </span>
            <span className="text-xs font-mono text-[var(--text-tertiary)] break-all">
              {log.entityId}
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-1.5">
            {formatDateTime(log.timestamp)} · {formatRelative(log.timestamp)}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-[var(--bg-main)] transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4 text-[var(--text-secondary)]" />
        </button>
      </div>

      {/* Body */}
      <div className="p-5 space-y-4">
        {/* Actor card */}
        <div className="bg-[var(--bg-main)] rounded-lg p-3 border border-[var(--border-color)]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
            Performed by
          </p>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[var(--icon-cyan-bg)] flex items-center justify-center flex-shrink-0">
              <UserIcon className="w-4 h-4 text-[var(--icon-cyan-text)]" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                {log.performedBy?.fullName || 'Unknown user'}
              </p>
              <p className="text-xs text-[var(--text-secondary)] truncate">
                @{log.performedBy?.username || log.performedById}
                {log.performedBy?.role && (
                  <>
                    {' · '}
                    <span className="capitalize">
                      {log.performedBy.role.replace(/_/g, ' ')}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Request info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-[var(--bg-main)] rounded-lg p-3 border border-[var(--border-color)]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1 flex items-center gap-1">
              <Globe className="w-3 h-3" /> IP Address
            </p>
            <p className="text-sm font-mono text-[var(--text-primary)] break-all">
              {log.ipAddress || '—'}
            </p>
          </div>
          <div className="bg-[var(--bg-main)] rounded-lg p-3 border border-[var(--border-color)]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Log ID
            </p>
            <p className="text-sm font-mono text-[var(--text-primary)] break-all">{log.id}</p>
          </div>
        </div>

        {/* Metadata */}
        {log.metadata && (
          <JsonBlock title="Metadata" value={log.metadata} defaultOpen />
        )}

        {/* Diff */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <JsonBlock title="Previous state" value={log.previousState} />
          <JsonBlock title="New state" value={log.newState} defaultOpen />
        </div>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────
export default function AuditLogs() {
  const {
    logs,
    meta,
    pagination,
    filters,
    isLoading,
    isMetaLoading,
    isExporting,
    fetchLogs,
    fetchMeta,
    setFilters,
    resetFilters,
    setPage,
    setLimit,
    exportCsv,
    exportXlsx,
    clearError,
    error,
  } = useAuditStore();
  const { success, error: toastError } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [showFilters, setShowFilters] = useState(true);

  // Initial load
  useEffect(() => {
    void fetchMeta();
    void fetchLogs();
  }, []);

  // Surface store errors as toasts
  useEffect(() => {
    if (error) {
      toastError('Audit logs', error);
      clearError();
    }
  }, [error, toastError, clearError]);

  // Client-side quick search over visible rows ONLY — it does not reach other
  // pages. Server filters above are the ones that search the whole trail.
  const visibleLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter((log) => {
      const user = log.performedBy?.fullName?.toLowerCase() ?? '';
      const uname = log.performedBy?.username?.toLowerCase() ?? '';
      const entity = log.entityType.toLowerCase();
      const entityId = log.entityId.toLowerCase();
      const action = log.action.toLowerCase();
      return (
        user.includes(q) ||
        uname.includes(q) ||
        entity.includes(q) ||
        entityId.includes(q) ||
        action.includes(q)
      );
    });
  }, [logs, searchQuery]);

  const handleExport = async () => {
    try {
      const blob = await exportCsv();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      success('Exported', 'Audit log CSV downloaded');
    } catch {
      toastError('Export failed', 'Could not export audit logs');
    }
  };

  const handleExportExcel = async () => {
    try {
      const blob = await exportXlsx();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      success('Exported', 'Audit logs Excel workbook downloaded');
    } catch {
      toastError('Export failed', 'Could not export audit logs to Excel');
    }
  };

  // ── Server pagination, with fallbacks so the bar NEVER silently disappears ──
  // If the store/API omits totalPages (or reports 0), derive it from total ÷ limit.
  // If total is missing too, fall back to the loaded row count — a visible bar
  // with an approximate count beats no navigation at all.
  const pageSize = pagination.limit || 10;
  const totalItems = pagination.total || logs.length;
  const totalPages = Math.max(1, pagination.totalPages || Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, pagination.page || 1), totalPages);
  const rangeStart = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, totalItems);
  const goToPage = (page: number) => setPage(Math.max(1, Math.min(page, totalPages)));

  const hasActiveFilters = Boolean(
    filters.entityType || filters.action || filters.userId || filters.startDate || filters.endDate,
  );

  const selectClass =
    'px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)]';

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header — shared PageHeader, same as Patients / Attendance */}
      <PageHeader title="Audit Logs" subtitle="Immutable trail of system activity"
        meta={`${totalItems.toLocaleString()} entr${totalItems === 1 ? 'y' : 'ies'} · Page ${safePage} of ${totalPages}`}
        icon={ScrollText} accent="cyan" backTo="/dashboard"
        actions={<>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              showFilters
                ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] border-[var(--icon-cyan-text)]'
                : 'bg-[var(--bg-card)] text-[var(--text-primary)] border-[var(--border-color)] hover:bg-[var(--bg-main)]'
            }`}
          >
            <Filter className="w-3.5 h-3.5" /> Filters
            {hasActiveFilters && (
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--icon-cyan-text)]" />
            )}
          </button>
          <Button icon={Download} loading={isExporting} onClick={handleExport}>
            Export CSV
          </Button>
          <Button icon={Download} loading={isExporting} onClick={handleExportExcel}>
            Export Excel
          </Button>
          <Button icon={RefreshCw} loading={isLoading} onClick={() => void fetchLogs()}>
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </>} />

      {/* Controls — Search, same shell as Patients / Attendance */}
      <div className="bg-[var(--bg-card)] rounded-xl p-3 sm:p-4 shadow-sm border border-[var(--border-color)]">
        <SearchInput className="w-full lg:max-w-sm" value={searchQuery} onChange={setSearchQuery}
          placeholder="Filter visible rows by user, entity, action, or ID…" />
        {searchQuery.trim() && (
          <p className="text-[11px] text-[var(--text-tertiary)] mt-2">
            Quick filter only applies to this page — use the filters below to search the whole trail.
          </p>
        )}
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
                Entity
              </label>
              <select
                value={filters.entityType ?? ''}
                onChange={(e) => setFilters({ entityType: e.target.value || undefined })}
                disabled={isMetaLoading}
                className={`w-full ${selectClass}`}
              >
                <option value="">All entities</option>
                {meta?.entityTypes.map((t) => (
                  <option key={t} value={t}>
                    {humanizeEntity(t)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
                Action
              </label>
              <select
                value={filters.action ?? ''}
                onChange={(e) => setFilters({ action: e.target.value || undefined })}
                disabled={isMetaLoading}
                className={`w-full ${selectClass}`}
              >
                <option value="">All actions</option>
                {meta?.actions.map((a) => (
                  <option key={a} value={a}>
                    {a.charAt(0).toUpperCase() + a.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
                User
              </label>
              <select
                value={filters.userId ?? ''}
                onChange={(e) => setFilters({ userId: e.target.value || undefined })}
                disabled={isMetaLoading}
                className={`w-full ${selectClass}`}
              >
                <option value="">All users</option>
                {meta?.users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} (@{u.username})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
                  From
                </label>
                <input
                  type="date"
                  value={filters.startDate ?? ''}
                  onChange={(e) => setFilters({ startDate: e.target.value || undefined })}
                  className={`w-full ${selectClass}`}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
                  To
                </label>
                <input
                  type="date"
                  value={filters.endDate ?? ''}
                  onChange={(e) => setFilters({ endDate: e.target.value || undefined })}
                  className={`w-full ${selectClass}`}
                />
              </div>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex justify-end pt-2 border-t border-[var(--border-color)]">
              <button
                onClick={resetFilters}
                className="text-xs text-[var(--icon-cyan-text)] hover:underline font-medium"
              >
                Reset all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Table — every data point already in its own column, unchanged */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-6 h-6 text-[var(--text-tertiary)] mx-auto mb-3 animate-spin" />
            <p className="text-sm text-[var(--text-secondary)]">Loading audit logs…</p>
          </div>
        ) : visibleLogs.length === 0 ? (
          <div className="p-8 text-center">
            <ScrollText className="w-14 h-12 text-[var(--text-tertiary)] mx-auto mb-4" />
            <p className="text-sm font-medium text-[var(--text-primary)] mb-1">
              No audit logs found
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
              {hasActiveFilters || searchQuery
                ? 'Try widening your filters.'
                : 'Activity will appear here as users interact with the system.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                <tr>
                  <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] whitespace-nowrap">
                    Date &amp; Time
                  </th>
                  <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] whitespace-nowrap">
                    Action
                  </th>
                  <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] whitespace-nowrap">
                    Entity
                  </th>
                  <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] whitespace-nowrap">
                    Entity ID
                  </th>
                  <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] whitespace-nowrap">
                    User
                  </th>
                  <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] whitespace-nowrap">
                    Username
                  </th>
                  <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] whitespace-nowrap">
                    Role
                  </th>
                  <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] whitespace-nowrap">
                    IP
                  </th>
                  <th className="px-3 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] whitespace-nowrap">
                    &nbsp;
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {visibleLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-[var(--bg-main)] cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                  >
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="text-xs text-[var(--text-primary)]">
                        {formatDateTime(log.timestamp)}
                      </div>
                      <div className="text-[11px] text-[var(--text-tertiary)]">
                        {formatRelative(log.timestamp)}
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${actionStyle(
                          log.action,
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="text-sm text-[var(--text-primary)]">
                        {humanizeEntity(log.entityType)}
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="text-xs font-mono text-[var(--text-secondary)] max-w-[200px] truncate">
                        {log.entityId}
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="text-sm text-[var(--text-primary)]">
                        {log.performedBy?.fullName || '—'}
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="text-xs text-[var(--text-secondary)]">
                        @{log.performedBy?.username || log.performedById}
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="text-xs text-[var(--text-secondary)] capitalize">
                        {log.performedBy?.role ? log.performedBy.role.replace(/_/g, ' ') : '—'}
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="text-xs font-mono text-[var(--text-secondary)]">
                        {log.ipAddress || '—'}
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLog(log);
                        }}
                        className="p-1.5 text-[var(--icon-cyan-text)] border border-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-bg)] transition-all"
                        title="View details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═══════════ Pagination — pixel-matched to the Admissions bar ═══════════
          Own card BELOW the table (sibling, not a footer row inside it).
          Left:  "Showing X to Y of Z entries" + "N per page" select.
          Right: bordered chevrons + numbered pages; active page = solid cyan,
          white text; inactive pages = borderless with hover tint.
          Server-driven: goToPage -> store setPage; select -> setLimit + page 1.
          Gated on totalItems (not visibleLogs) so the quick filter emptying this
          page never strands you without navigation controls. */}
      {!isLoading && totalItems > 0 && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-sm px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs text-[var(--text-secondary)]">
              Showing <span className="font-medium text-[var(--text-primary)]">{rangeStart}</span> to{' '}
              <span className="font-medium text-[var(--text-primary)]">{rangeEnd}</span> of{' '}
              <span className="font-medium text-[var(--text-primary)]">{totalItems.toLocaleString()}</span> entries
            </p>
            <select
              id="audit-page-size"
              value={pageSize}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              disabled={isLoading}
              aria-label="Rows per page"
              className="px-2 py-1.5 text-xs text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--icon-cyan-text)]"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>{n} per page</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => goToPage(safePage - 1)}
              disabled={safePage <= 1 || isLoading}
              aria-label="Previous page"
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-main)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {pageNumbers(safePage, totalPages).map((pg, i) =>
              pg === '…' ? (
                <span
                  key={`e-${i}`}
                  className="w-8 h-8 flex items-center justify-center text-xs text-[var(--text-tertiary)]"
                >
                  …
                </span>
              ) : (
                <button
                  key={pg}
                  onClick={() => goToPage(pg)}
                  disabled={isLoading}
                  aria-label={`Page ${pg}`}
                  aria-current={pg === safePage ? 'page' : undefined}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-all disabled:opacity-40 ${
                    pg === safePage
                      ? 'text-white'
                      : 'text-[var(--text-primary)] hover:bg-[var(--bg-main)]'
                  }`}
                  style={pg === safePage ? { background: 'var(--icon-cyan-text)' } : undefined}
                >
                  {pg}
                </button>
              ),
            )}

            <button
              onClick={() => goToPage(safePage + 1)}
              disabled={safePage >= totalPages || isLoading}
              aria-label="Next page"
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-main)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Drawer */}
      {selectedLog && <LogDrawer log={selectedLog} onClose={() => setSelectedLog(null)} />}
    </div>
  );
}