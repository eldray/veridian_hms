// src/pages/LeaveManagement.tsx
import { useEffect, useMemo, useState } from 'react';
import { useLeaveStore } from '../store/leaveStore';
import { useUserStore } from '../store/userStore';
import { useHospitalStore } from '../store/hospitalStore';
import { useToast } from '../store/toastStore';
import { generatePDF, openPrintWindow } from '../utils/pdfGenerator';
import {
  FileText, Clock, Check, X, Ban, Search, RefreshCw, Printer,
  Calendar, User as UserIcon, MessageSquare, Trash2, Table2,
  History, CalendarDays, List,
} from 'lucide-react';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const LEAVE_TYPES = [
  { value: 'annual',    label: 'Annual',    barClass: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'sick',      label: 'Sick',      barClass: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'maternity', label: 'Maternity', barClass: 'bg-pink-100 text-pink-700 border-pink-200' },
  { value: 'paternity', label: 'Paternity', barClass: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'emergency', label: 'Emergency', barClass: 'bg-red-100 text-red-700 border-red-200' },
  { value: 'unpaid',    label: 'Unpaid',    barClass: 'bg-slate-100 text-slate-700 border-slate-200' },
];

const leaveTypeConfig = (t: string) =>
  LEAVE_TYPES.find((x) => x.value === t) ?? LEAVE_TYPES[LEAVE_TYPES.length - 1];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending:   { label: 'Pending',   color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  approved:  { label: 'Approved',  color: 'bg-green-100 text-green-700',   icon: Check },
  rejected:  { label: 'Rejected',  color: 'bg-red-100 text-red-700',       icon: Ban   },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-700',     icon: X     },
};

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
};

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

// ─────────────────────────────────────────────
// Reject modal
// ─────────────────────────────────────────────
const RejectModal: React.FC<{
  leave: any;
  onCancel: () => void;
  onConfirm: (reason: string) => Promise<void>;
}> = ({ leave, onCancel, onConfirm }) => {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setSaving(true);
    try { await onConfirm(reason.trim()); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--bg-card)] rounded-xl w-full max-w-md border border-[var(--border-color)]">
        <div className="bg-[var(--bg-main)] px-5 py-3 border-b border-[var(--border-color)] flex items-center justify-between">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Reject Leave Request</h3>
          <button onClick={onCancel} className="p-1 rounded hover:bg-[var(--bg-card)]">
            <X className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-3">
          <p className="text-sm text-[var(--text-secondary)]">
            Rejecting leave for <strong className="text-[var(--text-primary)]">{leave.user?.fullName}</strong>{' '}
            ({leave.totalDays} day{leave.totalDays !== 1 ? 's' : ''}).
          </p>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Reason *</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
              placeholder="Explain why this leave is being rejected"
              className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] resize-none"
            />
          </div>
          <div className="flex gap-3 pt-3 border-t border-[var(--border-color)]">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !reason.trim()}
              className="flex-1 px-4 py-2 bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] rounded-lg hover:bg-[var(--icon-red-text)] hover:text-white text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'Rejecting…' : 'Reject Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────

type ViewMode = 'pending' | 'history' | 'yearly';

export default function LeaveManagement() {
  const {
    leaves, total, isLoading,
    fetchLeaves, approveLeave, rejectLeave, deleteLeave,
  } = useLeaveStore();
  const { users, getAllUsers } = useUserStore();
  const { hospital, fetchHospital } = useHospitalStore();
  const { success, error: toastError } = useToast();

  const [view, setView] = useState<ViewMode>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterUser, setFilterUser] = useState('all');
  const [year, setYear] = useState<number>(new Date().getFullYear());

  const [rejectingLeave, setRejectingLeave] = useState<any | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

  // ── Data loading ─────────────────────────────
  useEffect(() => {
    void getAllUsers({ isActive: true });
    void fetchHospital().catch(() => {});
  }, []);

  useEffect(() => {
    if (view === 'pending') {
      void fetchLeaves({ status: 'pending', limit: 200 });
    } else if (view === 'history') {
      void fetchLeaves({ limit: 200 });
    } else {
      // yearly — load everything for the year
      const from = new Date(year, 0, 1).toISOString();
      const to = new Date(year, 11, 31, 23, 59, 59).toISOString();
      void fetchLeaves({ fromDate: from, toDate: to, limit: 1000 });
    }
  }, [view, year]);

  const userList = Array.isArray(users) ? users : [];

  // ── Filtering ────────────────────────────────
  const visibleLeaves = useMemo(() => {
    let list = [...leaves];

    if (filterType !== 'all') list = list.filter((l) => l.leaveType === filterType);
    if (filterUser !== 'all') list = list.filter((l) => l.userId === filterUser);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((l) => {
        const name = l.user?.fullName?.toLowerCase() ?? '';
        const reason = l.reason?.toLowerCase() ?? '';
        return name.includes(q) || reason.includes(q);
      });
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [leaves, filterType, filterUser, searchQuery]);

  const pendingCount = leaves.filter((l) => l.status === 'pending').length;

  // ── Yearly grid data ─────────────────────────
  const yearlyStaffRows = useMemo(() => {
    const byStaff = new Map<string, { id: string; name: string; role: string; leaves: any[] }>();

    for (const l of visibleLeaves) {
      if (!l.userId) continue;
      if (filterUser !== 'all' && l.userId !== filterUser) continue;
      if (!byStaff.has(l.userId)) {
        byStaff.set(l.userId, {
          id: l.userId,
          name: l.user?.fullName || '—',
          role: l.user?.role || '',
          leaves: [],
        });
      }
      byStaff.get(l.userId)!.leaves.push(l);
    }
    return Array.from(byStaff.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [visibleLeaves, filterUser]);

  /**
   * Given a leave, month index, and target year, return the portion of
   * the leave that falls within that month of that year, or null.
   */
  const portionInMonth = (leave: any, month: number) => {
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);
    const leaveStart = new Date(leave.startDate);
    const leaveEnd = new Date(leave.endDate);

    if (leaveEnd < monthStart || leaveStart > monthEnd) return null;

    const overlapStart = leaveStart < monthStart ? monthStart : leaveStart;
    const overlapEnd = leaveEnd > monthEnd ? monthEnd : leaveEnd;

    return { from: overlapStart.getDate(), to: overlapEnd.getDate() };
  };

  const renderLeaveBar = (leave: any, monthIdx: number) => {
    const portion = portionInMonth(leave, monthIdx);
    if (!portion) return null;

    const cfg = leaveTypeConfig(leave.leaveType);
    const rangeText = portion.from === portion.to ? `${portion.from}` : `${portion.from}–${portion.to}`;

    return (
      <div
        key={`${leave.id}-${monthIdx}`}
        title={`${cfg.label} · ${rangeText} · ${leave.status}`}
        className={`rounded px-1 py-0.5 text-[9px] font-semibold border ${cfg.barClass} mb-0.5 truncate`}
      >
        <div className="text-[10px] font-bold leading-tight">{rangeText}</div>
        <div className="text-[8px] uppercase tracking-wider opacity-80 leading-tight">{cfg.label}</div>
      </div>
    );
  };

  // ── Handlers ─────────────────────────────────
  const handleApprove = async (leave: any) => {
    if (!window.confirm(`Approve ${leave.totalDays} day(s) of ${leave.leaveType} leave for ${leave.user?.fullName}?`)) return;
    setActioningId(leave.id);
    try {
      await approveLeave(leave.id);
      success('Approved', `Leave approved for ${leave.user?.fullName}`);
    } catch (err: any) {
      toastError('Failed', err?.response?.data?.message || 'Could not approve leave');
    } finally {
      setActioningId(null);
    }
  };

  const handleConfirmReject = async (reason: string) => {
    if (!rejectingLeave) return;
    setActioningId(rejectingLeave.id);
    try {
      await rejectLeave(rejectingLeave.id, reason);
      success('Rejected', `Leave rejected for ${rejectingLeave.user?.fullName}`);
      setRejectingLeave(null);
    } catch (err: any) {
      toastError('Failed', err?.response?.data?.message || 'Could not reject leave');
    } finally {
      setActioningId(null);
    }
  };

  const handleDelete = async (leave: any) => {
    if (!window.confirm('Delete this leave request permanently?')) return;
    try {
      await deleteLeave(leave.id);
      success('Deleted', 'Leave request removed');
    } catch (err: any) {
      toastError('Failed', err?.response?.data?.message || 'Could not delete leave');
    }
  };

  // ── Printing ─────────────────────────────────
  const handlePrintRegister = async () => {
    setPrinting(true);
    try {
      const html = generatePDF(
        'leaveRegister',
        { leaves: visibleLeaves, year, staffFilter: filterUser !== 'all' ? filterUser : null },
        hospital,
      );
      openPrintWindow(html, `Leave Register ${year}`);
      success('Print ready', 'Leave register opened');
    } catch (err: any) {
      toastError('Print failed', err?.message || 'Could not generate the register');
    } finally {
      setPrinting(false);
    }
  };

  const handlePrintRequestForm = async (leave: any) => {
    setPrinting(true);
    try {
      const html = generatePDF('leaveRequestForm', { leave }, hospital);
      openPrintWindow(html, `Leave Request — ${leave.user?.fullName}`);
      success('Print ready', 'Leave request form opened');
    } catch (err: any) {
      toastError('Print failed', err?.message || 'Could not generate the request form');
    } finally {
      setPrinting(false);
    }
  };

  const inputClass =
    'px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)]';

  // ── Render ───────────────────────────────────
  return (
    <div className="space-y-5 p-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--icon-cyan-bg)] flex items-center justify-center">
            <FileText className="w-5 h-5 text-[var(--icon-cyan-text)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Leave Management</h1>
            <p className="text-sm text-[var(--text-secondary)]">Review, approve, and track staff leave requests</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (view === 'pending') void fetchLeaves({ status: 'pending', limit: 200 });
              else if (view === 'history') void fetchLeaves({ limit: 200 });
              else {
                const from = new Date(year, 0, 1).toISOString();
                const to = new Date(year, 11, 31, 23, 59, 59).toISOString();
                void fetchLeaves({ fromDate: from, toDate: to, limit: 1000 });
              }
            }}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] text-sm font-medium text-[var(--text-primary)] disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handlePrintRegister}
            disabled={printing}
            className="flex items-center gap-2 px-3 py-2 text-xs border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-card)] transition-colors disabled:opacity-50"
            title="Print yearly leave register (landscape)"
          >
            <Printer className="w-3.5 h-3.5" /> Print Register
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Pending Approval', value: pendingCount, color: 'text-[var(--icon-yellow-text)]', bg: 'bg-[var(--icon-yellow-bg)]', icon: Clock },
          { label: 'Approved (recent)', value: leaves.filter((l) => l.status === 'approved').length, color: 'text-[var(--icon-green-text)]', bg: 'bg-[var(--icon-green-bg)]', icon: Check },
          { label: 'Rejected (recent)', value: leaves.filter((l) => l.status === 'rejected').length, color: 'text-[var(--icon-red-text)]', bg: 'bg-[var(--icon-red-bg)]', icon: Ban },
          { label: 'Total Loaded', value: total, color: 'text-[var(--icon-cyan-text)]', bg: 'bg-[var(--icon-cyan-bg)]', icon: FileText },
        ].map((s) => (
          <div key={s.label} className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--text-secondary)]">{s.label}</p>
              <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{s.value}</p>
            </div>
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-1 flex gap-1 max-w-lg">
        {[
          { id: 'pending', label: `Pending (${pendingCount})`, icon: Clock        },
          { id: 'history', label: 'History',                   icon: History      },
          { id: 'yearly',  label: 'Yearly Calendar',           icon: CalendarDays },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setView(t.id as ViewMode)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                view === t.id
                  ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by staff name or reason…"
              className="w-full pl-10 pr-4 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className={`${inputClass} min-w-[150px] py-2.5`}
          >
            <option value="all">All leave types</option>
            {LEAVE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className={`${inputClass} min-w-[180px] py-2.5`}
          >
            <option value="all">All staff</option>
            {userList.map((u: any) => (
              <option key={u.id} value={u.id}>{u.fullName}</option>
            ))}
          </select>
          {view === 'yearly' && (
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className={`${inputClass} py-2.5`}
            >
              {[0, 1, 2, 3, 4].map((i) => {
                const y = new Date().getFullYear() - i;
                return <option key={y} value={y}>{y}</option>;
              })}
            </select>
          )}
        </div>
        <p className="text-xs text-[var(--text-tertiary)] mt-3 pt-3 border-t border-[var(--border-color)]">
          Showing {visibleLeaves.length} of {total} leave requests
        </p>
      </div>

      {/* ───────── PENDING & HISTORY VIEW (card list) ───────── */}
      {(view === 'pending' || view === 'history') && (
        <div className="space-y-3">
          {isLoading ? (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-10 text-center">
              <RefreshCw className="w-6 h-6 text-[var(--text-tertiary)] mx-auto mb-3 animate-spin" />
              <p className="text-sm text-[var(--text-secondary)]">Loading leaves…</p>
            </div>
          ) : visibleLeaves.length === 0 ? (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-12 text-center">
              <FileText className="w-14 h-12 text-[var(--text-tertiary)] mx-auto mb-4" />
              <p className="text-sm font-medium text-[var(--text-primary)] mb-1">
                {view === 'pending' ? 'No pending leave requests' : 'No leave requests found'}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                {view === 'pending' ? 'All caught up.' : 'Try widening your filters.'}
              </p>
            </div>
          ) : (
            visibleLeaves.map((leave) => {
              const cfg = leaveTypeConfig(leave.leaveType);
              const statusCfg = STATUS_CONFIG[leave.status] ?? STATUS_CONFIG.pending;
              const StatusIcon = statusCfg.icon;
              const isActioning = actioningId === leave.id;

              return (
                <div key={leave.id} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <div className="w-9 h-9 rounded-full bg-[var(--icon-cyan-bg)] flex items-center justify-center flex-shrink-0">
                          <UserIcon className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[var(--text-primary)]">{leave.user?.fullName || '—'}</p>
                          <p className="text-[11px] text-[var(--text-tertiary)]">
                            @{leave.user?.username ?? '—'}
                            {leave.user?.role && ` · ${leave.user.role.replace(/_/g, ' ')}`}
                            {leave.user?.department && ` · ${leave.user.department.name}`}
                          </p>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${cfg.barClass}`}>
                          {cfg.label}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${statusCfg.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusCfg.label}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)] ml-11">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(leave.startDate)} – {formatDate(leave.endDate)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {leave.totalDays} day{leave.totalDays !== 1 ? 's' : ''}
                        </span>
                      </div>

                      {leave.reason && (
                        <div className="ml-11 mt-2 flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                          <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                          <span>{leave.reason}</span>
                        </div>
                      )}

                      {leave.status === 'approved' && (leave.approver || leave.approvedBy) && (
                        <p className="ml-11 mt-2 text-xs text-green-600">
                          Approved by {(leave.approver || leave.approvedBy)?.fullName}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handlePrintRequestForm(leave)}
                        className="p-2 text-[var(--text-secondary)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)]"
                        title="Print leave request form"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      {leave.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(leave)}
                            disabled={isActioning}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] rounded-lg hover:bg-[var(--icon-green-text)] hover:text-white transition-all text-xs font-medium disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Approve
                          </button>
                          <button
                            onClick={() => setRejectingLeave(leave)}
                            disabled={isActioning}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] rounded-lg hover:bg-[var(--icon-red-text)] hover:text-white transition-all text-xs font-medium disabled:opacity-50"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            Reject
                          </button>
                        </>
                      )}
                      {leave.status !== 'pending' && (
                        <button
                          onClick={() => handleDelete(leave)}
                          disabled={isActioning}
                          className="p-2 text-[var(--icon-red-text)] border border-[var(--icon-red-text)] rounded-lg hover:bg-[var(--icon-red-bg)] disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ───────── YEARLY VIEW ───────── */}
      {view === 'yearly' && (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="border-collapse" style={{ minWidth: '1400px' }}>
              <thead>
                <tr className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                  <th className="sticky left-0 bg-[var(--bg-main)] px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] min-w-[180px] z-10">
                    Staff
                  </th>
                  {MONTHS.map((m) => (
                    <th
                      key={m}
                      className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]"
                      style={{ minWidth: '108px' }}
                    >
                      {m.slice(0, 3)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {yearlyStaffRows.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="px-4 py-12 text-center text-sm text-[var(--text-secondary)]">
                      No leave records found for {year}
                    </td>
                  </tr>
                ) : (
                  yearlyStaffRows.map((row) => (
                    <tr key={row.id} className="hover:bg-[var(--bg-main)]">
                      <td className="sticky left-0 bg-[var(--bg-card)] px-3 py-2 z-10">
                        <div className="text-xs font-medium text-[var(--text-primary)] truncate max-w-[160px]">
                          {row.name}
                        </div>
                        <div className="text-[10px] text-[var(--text-tertiary)] capitalize">
                          {row.role.replace(/_/g, ' ')}
                        </div>
                      </td>
                      {MONTHS.map((_, idx) => (
                        <td key={idx} className="px-1 py-2 align-top">
                          {row.leaves.map((leave) => renderLeaveBar(leave, idx))}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-[var(--border-color)] px-4 py-3 flex flex-wrap items-center gap-4 text-xs text-[var(--text-secondary)]">
            {LEAVE_TYPES.map((t) => (
              <span key={t.value} className="flex items-center gap-1.5">
                <span className={`inline-block w-3.5 h-3.5 rounded border ${t.barClass}`} />
                {t.label}
              </span>
            ))}
            <span className="ml-auto text-[10px] text-[var(--text-tertiary)]">
              Total staff: {yearlyStaffRows.length} · Total leave records: {visibleLeaves.length}
            </span>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejectingLeave && (
        <RejectModal
          leave={rejectingLeave}
          onCancel={() => setRejectingLeave(null)}
          onConfirm={handleConfirmReject}
        />
      )}
    </div>
  );
}