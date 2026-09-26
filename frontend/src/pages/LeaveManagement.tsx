// src/pages/LeaveManagement.tsx
import { useEffect, useMemo, useState } from 'react';
import { useLeaveStore } from '../store/leaveStore';
import { useUserStore } from '../store/userStore';
import { useToast } from '../store/toastStore';
import {
  FileText, Clock, Check, X, Ban, Search, RefreshCw, Filter,
  Calendar, User as UserIcon, MessageSquare, Trash2,
} from 'lucide-react';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const LEAVE_TYPES = [
  { value: 'annual',    label: 'Annual Leave',    color: 'bg-blue-100 text-blue-700'    },
  { value: 'sick',      label: 'Sick Leave',      color: 'bg-green-100 text-green-700'  },
  { value: 'maternity', label: 'Maternity Leave', color: 'bg-pink-100 text-pink-700'    },
  { value: 'paternity', label: 'Paternity Leave', color: 'bg-purple-100 text-purple-700'},
  { value: 'emergency', label: 'Emergency Leave', color: 'bg-red-100 text-red-700'      },
  { value: 'unpaid',    label: 'Unpaid Leave',    color: 'bg-gray-100 text-gray-700'    },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending:   { label: 'Pending',   color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  approved:  { label: 'Approved',  color: 'bg-green-100 text-green-700',   icon: Check },
  rejected:  { label: 'Rejected',  color: 'bg-red-100 text-red-700',       icon: Ban   },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-700',     icon: X     },
};

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch {
    return iso;
  }
};

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
    try {
      await onConfirm(reason.trim());
    } finally {
      setSaving(false);
    }
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
            Rejecting leave for{' '}
            <strong className="text-[var(--text-primary)]">{leave.user?.fullName}</strong> ({leave.totalDays} day
            {leave.totalDays !== 1 ? 's' : ''}).
          </p>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Reason *
            </label>
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
export default function LeaveManagement() {
  const {
    leaves, total, isLoading,
    fetchLeaves, approveLeave, rejectLeave, deleteLeave,
  } = useLeaveStore();
  const { users, getAllUsers } = useUserStore();
  const { success, error: toastError } = useToast();

  const [tab, setTab] = useState<'pending' | 'history'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterUser, setFilterUser] = useState<string>('all');

  const [rejectingLeave, setRejectingLeave] = useState<any | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);

  useEffect(() => {
    void getAllUsers({ isActive: true });
  }, []);

  useEffect(() => {
    void fetchLeaves(
      tab === 'pending'
        ? { status: 'pending', limit: 200 }
        : { limit: 200 },
    );
  }, [tab]);

  const userList = Array.isArray(users) ? users : [];

  const visibleLeaves = useMemo(() => {
    let list = [...leaves];

    if (filterType !== 'all') list = list.filter((l) => l.leaveType === filterType);
    if (filterUser !== 'all') list = list.filter((l) => l.userId === filterUser);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((l) => {
        const name = l.user?.fullName?.toLowerCase() ?? '';
        const reason = l.reason?.toLowerCase() ?? '';
        const type = l.leaveType?.toLowerCase() ?? '';
        return name.includes(q) || reason.includes(q) || type.includes(q);
      });
    }

    // Newest first
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [leaves, filterType, filterUser, searchQuery]);

  const pendingCount = leaves.filter((l) => l.status === 'pending').length;

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
    if (!window.confirm(`Delete this leave request permanently?`)) return;
    try {
      await deleteLeave(leave.id);
      success('Deleted', 'Leave request removed');
    } catch (err: any) {
      toastError('Failed', err?.response?.data?.message || 'Could not delete leave');
    }
  };

  const inputClass =
    'px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)]';

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
            <p className="text-sm text-[var(--text-secondary)]">
              Review, approve, and track staff leave requests
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchLeaves(tab === 'pending' ? { status: 'pending' } : {})}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] text-sm font-medium text-[var(--text-primary)] disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Pending Approval', value: pendingCount,                                color: 'text-[var(--icon-yellow-text)]', bg: 'bg-[var(--icon-yellow-bg)]', icon: Clock },
          { label: 'Approved (recent)', value: leaves.filter(l => l.status === 'approved').length,  color: 'text-[var(--icon-green-text)]',  bg: 'bg-[var(--icon-green-bg)]',  icon: Check },
          { label: 'Rejected (recent)', value: leaves.filter(l => l.status === 'rejected').length,  color: 'text-[var(--icon-red-text)]',    bg: 'bg-[var(--icon-red-bg)]',    icon: Ban   },
          { label: 'Total Loaded',      value: total,                                      color: 'text-[var(--icon-cyan-text)]',   bg: 'bg-[var(--icon-cyan-bg)]',   icon: FileText },
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
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-1 flex gap-1 max-w-md">
        {[
          { id: 'pending', label: `Pending (${pendingCount})`, icon: Clock },
          { id: 'history', label: 'All History',               icon: FileText },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                tab === t.id
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
              placeholder="Search by staff name, reason, or type…"
              className="w-full pl-10 pr-4 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className={`${inputClass} min-w-[160px] py-2.5`}
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
        </div>
        <p className="text-xs text-[var(--text-tertiary)] mt-3 pt-3 border-t border-[var(--border-color)]">
          Showing {visibleLeaves.length} of {total} leave requests
        </p>
      </div>

      {/* List */}
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
              {tab === 'pending' ? 'No pending leave requests' : 'No leave requests found'}
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
              {tab === 'pending' ? 'All caught up.' : 'Try widening your filters.'}
            </p>
          </div>
        ) : (
          visibleLeaves.map((leave) => {
            const typeConfig = LEAVE_TYPES.find((t) => t.value === leave.leaveType);
            const statusConfig = STATUS_CONFIG[leave.status] ?? STATUS_CONFIG.pending;
            const StatusIcon = statusConfig.icon;
            const isActioning = actioningId === leave.id;

            return (
              <div
                key={leave.id}
                className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <div className="w-9 h-9 rounded-full bg-[var(--icon-cyan-bg)] flex items-center justify-center flex-shrink-0">
                        <UserIcon className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          {leave.user?.fullName || '—'}
                        </p>
                        <p className="text-[11px] text-[var(--text-tertiary)]">
                          @{leave.user?.username ?? '—'}
                          {leave.user?.role && ` · ${leave.user.role.replace(/_/g, ' ')}`}
                          {leave.user?.department && ` · ${leave.user.department.name}`}
                        </p>
                      </div>

                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${typeConfig?.color ?? 'bg-[var(--bg-main)] text-[var(--text-secondary)]'}`}>
                        {typeConfig?.label ?? leave.leaveType}
                      </span>

                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${statusConfig.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
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
                        title="Delete request"
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