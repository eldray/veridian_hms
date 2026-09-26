// src/pages/AuditLogs.tsx
import { useEffect, useMemo, useState } from 'react';
import { useAuditStore } from '../store/auditStore';
import { useToast } from '../store/toastStore';
import { AuditLogEntry } from '../api/audit';
import {
  ScrollText, Search, Filter, X, RefreshCw, Download, Eye,
  ChevronLeft, ChevronRight, Activity, User as UserIcon, Clock,
  Globe, FileJson, ChevronDown, ChevronUp, AlertCircle,
} from 'lucide-react';

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

  // Client-side quick search over visible rows
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

  const hasActiveFilters = Boolean(
    filters.entityType || filters.action || filters.userId || filters.startDate || filters.endDate,
  );

  const selectClass =
    'px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)]';

  return (
    <div className="space-y-5 p-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--icon-cyan-bg)] flex items-center justify-center">
            <ScrollText className="w-5 h-5 text-[var(--icon-cyan-text)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Audit Logs</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Immutable trail of system activity
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
              showFilters
                ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] border-[var(--icon-cyan-text)]'
                : 'bg-[var(--bg-card)] text-[var(--text-primary)] border-[var(--border-color)] hover:bg-[var(--bg-main)]'
            }`}
          >
            <Filter className="w-4 h-4" /> Filters
            {hasActiveFilters && (
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--icon-cyan-text)]" />
            )}
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] text-sm font-medium text-[var(--text-primary)] disabled:opacity-50"
          >
            <Download className={`w-4 h-4 ${isExporting ? 'animate-pulse' : ''}`} />
            {isExporting ? 'Exporting…' : 'Export CSV'}
          </button>
          <button
            onClick={() => void fetchLogs()}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] text-sm font-medium text-[var(--text-primary)] disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
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

      {/* Quick search */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-3">
        <div className="relative">
          <Search className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter visible rows by user, entity, action, or ID…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center">
            <RefreshCw className="w-6 h-6 text-[var(--text-tertiary)] mx-auto mb-3 animate-spin" />
            <p className="text-sm text-[var(--text-secondary)]">Loading audit logs…</p>
          </div>
        ) : visibleLogs.length === 0 ? (
          <div className="p-12 text-center">
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
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    When
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    Entity
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] hidden lg:table-cell">
                    Entity ID
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] hidden xl:table-cell">
                    IP
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
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
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-[var(--text-primary)]">
                        {formatRelative(log.timestamp)}
                      </div>
                      <div className="text-[10px] text-[var(--text-tertiary)]">
                        {formatDateTime(log.timestamp)}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${actionStyle(
                          log.action,
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-[var(--text-primary)]">
                        {humanizeEntity(log.entityType)}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap hidden lg:table-cell">
                      <div className="text-xs font-mono text-[var(--text-secondary)] max-w-[200px] truncate">
                        {log.entityId}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-[var(--text-primary)]">
                        {log.performedBy?.fullName || '—'}
                      </div>
                      <div className="text-[10px] text-[var(--text-tertiary)]">
                        @{log.performedBy?.username || log.performedById}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap hidden xl:table-cell">
                      <div className="text-xs font-mono text-[var(--text-secondary)]">
                        {log.ipAddress || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
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

        {/* Pagination */}
        {!isLoading && visibleLogs.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-[var(--border-color)] bg-[var(--bg-card)]">
            <div className="text-xs text-[var(--text-secondary)]">
              Page <strong>{pagination.page}</strong> of{' '}
              <strong>{pagination.totalPages}</strong> · {pagination.total.toLocaleString()} entries
            </div>

            <div className="flex items-center gap-2">
              <select
                value={pagination.limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="px-2 py-1.5 text-xs text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-1 focus:ring-[var(--icon-cyan-text)]"
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n} / page
                  </option>
                ))}
              </select>

              <button
                onClick={() => setPage(Math.max(1, pagination.page - 1))}
                disabled={pagination.page <= 1 || isLoading}
                className="p-1.5 rounded-lg border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-main)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() =>
                  setPage(Math.min(pagination.totalPages, pagination.page + 1))
                }
                disabled={pagination.page >= pagination.totalPages || isLoading}
                className="p-1.5 rounded-lg border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-main)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Drawer */}
      {selectedLog && <LogDrawer log={selectedLog} onClose={() => setSelectedLog(null)} />}
    </div>
  );
}