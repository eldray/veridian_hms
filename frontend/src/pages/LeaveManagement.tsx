// src/pages/LeaveManagement.tsx
// Professional redesign: grids + lists + Patients/Attendance pagination.
// Nothing removed: all constants, sanitizers, RejectModal, handlers, yearly
// calendar, printing, filters and toasts are exactly as before.
// New: viewMode ('cards' | 'list') + Pagination, same components as
// Patients/Attendance — PageHeader, Segmented, FilterSelect, SearchInput,
// TABLE_SHELL/TD/TH/TR, Pagination. Pending/History get a real TABLE in list
// mode (Staff | Type | Dates | Days | Status | Reason | Actions) and a
// compact card grid in cards mode. Yearly staff rows are paginated too.
import { useEffect, useMemo, useState } from 'react';
import { confirmDialog } from '../context/ConfirmDialog';
import { useLeaveStore } from '../store/leaveStore';
import { useUserStore } from '../store/userStore';
import { useHospitalStore } from '../store/hospitalStore';
import { useToast } from '../store/toastStore';
import { generatePDF, openPrintWindow } from '../utils/pdfGenerator';
import {
  FileText, Clock, Check, X, Ban, RefreshCw, Printer,
  User as UserIcon, Trash2,
  History, CalendarDays, Grid, List,
} from 'lucide-react';
import {
  Button, FilterSelect, PageHeader, Pagination,
  SearchInput, Segmented, TABLE_SHELL, TD, TD_MUTED, TH, TH_ROW, TR,
} from '../components/ui';

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

type AnyLeave = any;

const isLeaveRecord = (x: unknown): x is AnyLeave =>
  !!x && typeof x === 'object'
  && typeof (x as any).id === 'string'
  && typeof (x as any).status === 'string';

const sanitizeLeaves = (raw: unknown): AnyLeave[] => {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isLeaveRecord);
};

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
            <button type="button" onClick={onCancel} className="flex-1 px-4 py-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg text-sm font-medium">Cancel</button>
            <button type="submit" disabled={saving || !reason.trim()} className="flex-1 px-4 py-2 bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] rounded-lg hover:bg-[var(--icon-red-text)] hover:text-white text-sm font-medium disabled:opacity-50">
              {saving ? 'Rejecting…' : 'Reject Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

type ViewMode = 'pending' | 'history' | 'yearly';
type LayoutMode = 'cards' | 'list';

export default function LeaveManagement() {
  const {
    leaves: rawLeaves,
    total,
    isLoading,
    fetchLeaves, approveLeave, rejectLeave, deleteLeave,
  } = useLeaveStore();
  const { users, getAllUsers } = useUserStore();
  const { hospital, fetchHospital } = useHospitalStore();
  const { success, error: toastError } = useToast();

  const [view, setView] = useState<ViewMode>('pending');
  const [layout, setLayout] = useState<LayoutMode>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterUser, setFilterUser] = useState('all');
  const [year, setYear] = useState<number>(new Date().getFullYear());

  const [rejectingLeave, setRejectingLeave] = useState<any | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

  const leaves = useMemo(() => sanitizeLeaves(rawLeaves), [rawLeaves]);

  useEffect(() => {
    void getAllUsers({ isActive: true });
    void fetchHospital().catch(() => {});
  }, []);

  const reload = () => {
    if (view === 'pending') void fetchLeaves({ status: 'pending', limit: 200 });
    else if (view === 'history') void fetchLeaves({ limit: 200 });
    else {
      const from = new Date(year, 0, 1).toISOString();
      const to = new Date(year, 11, 31, 23, 59, 59).toISOString();
      void fetchLeaves({ fromDate: from, toDate: to, limit: 1000 });
    }
  };

  useEffect(() => { reload(); }, [view, year]);

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
        return name.includes(q) || reason.includes(q);
      });
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [leaves, filterType, filterUser, searchQuery]);

  const pendingCount = leaves.filter((l) => l.status === 'pending').length;

  // ── Pagination — Patients/Attendance pattern ──
  // Pending/History paginate the leave rows; Yearly paginates the staff rows
  // below. Same currentPage/itemsPerPage, reset whenever the inputs change.
  useEffect(() => { setCurrentPage(1); }, [view, searchQuery, filterType, filterUser, year]);
  const goToPage = (p: number) => setCurrentPage(Math.max(1, Math.min(p, totalPages)));

  const yearlyStaffRows = useMemo(() => {
    const byStaff = new Map<string, { id: string; name: string; role: string; leaves: any[] }>();
    for (const l of visibleLeaves) {
      if (!l.userId) continue;
      if (filterUser !== 'all' && l.userId !== filterUser) continue;
      if (!byStaff.has(l.userId)) {
        byStaff.set(l.userId, { id: l.userId, name: l.user?.fullName || '—', role: l.user?.role || '', leaves: [] });
      }
      byStaff.get(l.userId)!.leaves.push(l);
    }
    return Array.from(byStaff.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [visibleLeaves, filterUser]);

  const pageTotal = view === 'yearly' ? yearlyStaffRows.length : visibleLeaves.length;
  const totalPages = Math.max(1, Math.ceil(pageTotal / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLeaves = visibleLeaves.slice(startIndex, startIndex + itemsPerPage);
  const paginatedStaffRows = yearlyStaffRows.slice(startIndex, startIndex + itemsPerPage);

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
      <div key={`${leave.id}-${monthIdx}`} title={`${cfg.label} · ${rangeText} · ${leave.status}`} className={`rounded px-1 py-0.5 text-[9px] font-semibold border ${cfg.barClass} mb-0.5 truncate`}>
        <div className="text-[10px] font-bold leading-tight">{rangeText}</div>
        <div className="text-[8px] uppercase tracking-wider opacity-80 leading-tight">{cfg.label}</div>
      </div>
    );
  };

  const handleApprove = async (leave: any) => {
    if (!(await confirmDialog({ title: 'Approve leave', message: `Approve ${leave.totalDays} day(s) of ${leave.leaveType} leave for ${leave.user?.fullName}?`, confirmText: 'Approve', type: 'info' }))) return;
    setActioningId(leave.id);
    try { await approveLeave(leave.id); success('Approved', `Leave approved for ${leave.user?.fullName}`); }
    catch (err: any) { toastError('Failed', err?.response?.data?.message || 'Could not approve leave'); }
    finally { setActioningId(null); }
  };

  const handleConfirmReject = async (reason: string) => {
    if (!rejectingLeave) return;
    setActioningId(rejectingLeave.id);
    try { await rejectLeave(rejectingLeave.id, reason); success('Rejected', `Leave rejected for ${rejectingLeave.user?.fullName}`); setRejectingLeave(null); }
    catch (err: any) { toastError('Failed', err?.response?.data?.message || 'Could not reject leave'); }
    finally { setActioningId(null); }
  };

  const handleDelete = async (leave: any) => {
    if (!(await confirmDialog({ title: 'Delete leave request', message: 'Delete this leave request permanently?', confirmText: 'Delete' }))) return;
    try { await deleteLeave(leave.id); success('Deleted', 'Leave request removed'); }
    catch (err: any) { toastError('Failed', err?.response?.data?.message || 'Could not delete leave'); }
  };

  const handlePrintRegister = async () => {
    setPrinting(true);
    try {
      const html = generatePDF('leaveRegister', { leaves: visibleLeaves, year, staffFilter: filterUser !== 'all' ? filterUser : null }, hospital);
      openPrintWindow(html, `Leave Register ${year}`);
      success('Print ready', 'Leave register opened');
    } catch (err: any) { toastError('Print failed', err?.message || 'Could not generate the register'); }
    finally { setPrinting(false); }
  };

  const handlePrintRequestForm = async (leave: any) => {
    setPrinting(true);
    try {
      const html = generatePDF('leaveRequestForm', { leave }, hospital);
      openPrintWindow(html, `Leave Request — ${leave.user?.fullName}`);
      success('Print ready', 'Leave request form opened');
    } catch (err: any) { toastError('Print failed', err?.message || 'Could not generate the request form'); }
    finally { setPrinting(false); }
  };

  // Shared per-row action buttons — identical in cards and list
  const rowActions = (leave: any) => {
    const isActioning = actioningId === leave.id;
    return (
      <div className="flex items-center gap-1.5">
        <Button variant="secondary" size="sm" iconOnly icon={Printer} aria-label="Print leave request form" onClick={() => handlePrintRequestForm(leave)} />
        {leave.status === 'pending' && (
          <>
            <Button variant="soft" accent="green" size="sm" icon={Check} disabled={isActioning} onClick={() => handleApprove(leave)}>Approve</Button>
            <Button variant="soft" accent="red" size="sm" icon={Ban} disabled={isActioning} onClick={() => setRejectingLeave(leave)}>Reject</Button>
          </>
        )}
        {leave.status !== 'pending' && (
          <Button variant="dangerSoft" size="sm" iconOnly icon={Trash2} aria-label="Delete" disabled={isActioning} onClick={() => handleDelete(leave)} />
        )}
      </div>
    );
  };

  const statusBadge = (leave: any) => {
    const statusCfg = STATUS_CONFIG[leave.status] ?? STATUS_CONFIG.pending;
    const StatusIcon = statusCfg.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${statusCfg.color}`}>
        <StatusIcon className="w-3 h-3" /> {statusCfg.label}
      </span>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Leave Management"
        subtitle="Review, approve, and track staff leave requests"
        meta={<>{total} total loaded • {pendingCount} pending</>}
        icon={FileText}
        accent="cyan"
        actions={<>
          <Button icon={RefreshCw} loading={isLoading} onClick={reload}>{isLoading ? 'Refreshing...' : 'Refresh'}</Button>
          <Button variant="secondary" icon={Printer} disabled={printing} onClick={handlePrintRegister} title="Print yearly leave register (landscape)">Print Register</Button>
        </>}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Pending Approval', value: pendingCount, color: 'text-[var(--icon-yellow-text)]', bg: 'bg-[var(--icon-yellow-bg)]', icon: Clock },
          { label: 'Approved (recent)', value: leaves.filter((l) => l.status === 'approved').length, color: 'text-[var(--icon-green-text)]', bg: 'bg-[var(--icon-green-bg)]', icon: Check },
          { label: 'Rejected (recent)', value: leaves.filter((l) => l.status === 'rejected').length, color: 'text-[var(--icon-red-text)]', bg: 'bg-[var(--icon-red-bg)]', icon: Ban },
          { label: 'Total Loaded', value: total, color: 'text-[var(--icon-cyan-text)]', bg: 'bg-[var(--icon-cyan-bg)]', icon: FileText },
        ].map((s) => (
          <div key={s.label} className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] flex items-center justify-between">
            <div><p className="text-xs text-[var(--text-secondary)]">{s.label}</p><p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{s.value}</p></div>
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
          </div>
        ))}
      </div>

      {/* Tabs — same Segmented pill bar as Patients/Attendance */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-1 flex gap-1 max-w-lg">
        {[
          { id: 'pending', label: `Pending (${pendingCount})`, icon: Clock },
          { id: 'history', label: 'History', icon: History },
          { id: 'yearly', label: 'Yearly Calendar', icon: CalendarDays },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setView(t.id as ViewMode)} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${view === t.id ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
              <Icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Filters + layout + rows-per-page — Patients pattern */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-3 sm:p-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <SearchInput className="w-full lg:max-w-sm" value={searchQuery} onChange={setSearchQuery} placeholder="Search by staff name or reason…" />
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <FilterSelect aria-label="Leave type" value={filterType} onChange={setFilterType} options={[{ value: 'all', label: 'All leave types' }, ...LEAVE_TYPES.map((t) => ({ value: t.value, label: t.label }))]} />
            <FilterSelect aria-label="Staff member" value={filterUser} onChange={setFilterUser} options={[{ value: 'all', label: 'All staff' }, ...userList.map((u: any) => ({ value: u.id, label: u.fullName }))]} />
            {view === 'yearly' && (
              <FilterSelect aria-label="Year" value={String(year)} onChange={(v) => setYear(Number(v))} options={[0, 1, 2, 3, 4].map((i) => { const y = new Date().getFullYear() - i; return { value: String(y), label: String(y) }; })} />
            )}
            {view !== 'yearly' && (
              <Segmented aria-label="Leave layout" accent="cyan" value={layout} onChange={setLayout} options={[{ value: 'cards', label: 'Cards', icon: Grid }, { value: 'list', label: 'List', icon: List }]} />
            )}
            <FilterSelect aria-label="Rows per page" value={String(itemsPerPage)} onChange={(v) => setItemsPerPage(Number(v))} options={[{ value: '10', label: '10 per page' }, { value: '15', label: '15 per page' }, { value: '20', label: '20 per page' }, { value: '25', label: '25 per page' }]} />
          </div>
        </div>
        <p className="text-xs text-[var(--text-tertiary)] mt-3 pt-3 border-t border-[var(--border-color)]">
          Showing {view === 'yearly' ? `${paginatedStaffRows.length} of ${yearlyStaffRows.length} staff` : `${paginatedLeaves.length} of ${visibleLeaves.length} leave requests`} • {total} total loaded
        </p>
      </div>

      {/* ───────── PENDING & HISTORY ───────── */}
      {(view === 'pending' || view === 'history') && (
        <>
          {isLoading ? (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-10 text-center">
              <RefreshCw className="w-6 h-6 text-[var(--text-tertiary)] mx-auto mb-3 animate-spin" />
              <p className="text-sm text-[var(--text-secondary)]">Loading leaves…</p>
            </div>
          ) : visibleLeaves.length === 0 ? (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-12 text-center">
              <FileText className="w-14 h-12 text-[var(--text-tertiary)] mx-auto mb-4" />
              <p className="text-sm font-medium text-[var(--text-primary)] mb-1">{view === 'pending' ? 'No pending leave requests' : 'No leave requests found'}</p>
              <p className="text-xs text-[var(--text-secondary)]">{view === 'pending' ? 'All caught up.' : 'Try widening your filters.'}</p>
            </div>
          ) : layout === 'list' ? (
            <div className={TABLE_SHELL}>
              <table className="w-full">
                <thead><tr className={TH_ROW}>
                  <th className={TH}>Staff</th>
                  <th className={TH}>Type</th>
                  <th className={`${TH} whitespace-nowrap`}>Dates</th>
                  <th className={TH}>Days</th>
                  <th className={TH}>Status</th>
                  <th className={TH}>Reason</th>
                  <th className={TH}>Actions</th>
                </tr></thead>
                <tbody>
                  {paginatedLeaves.map((leave) => {
                    const cfg = leaveTypeConfig(leave.leaveType);
                    return (
                      <tr key={leave.id} className={TR}>
                        <td className={`${TD} sticky left-0 z-10 bg-[var(--bg-card)]`}>
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-[var(--icon-cyan-bg)] flex items-center justify-center shrink-0"><UserIcon className="w-4 h-4 text-[var(--icon-cyan-text)]" /></div>
                            <div className="min-w-0">
                              <p className="font-semibold text-[var(--text-primary)] whitespace-nowrap truncate">{leave.user?.fullName || '—'}</p>
                              <p className="text-[11px] text-[var(--text-tertiary)] truncate">@{leave.user?.username ?? '—'}{leave.user?.role && ` · ${leave.user.role.replace(/_/g, ' ')}`}{leave.user?.department && ` · ${leave.user.department.name}`}</p>
                            </div>
                          </div>
                        </td>
                        <td className={TD}><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border whitespace-nowrap ${cfg.barClass}`}>{cfg.label}</span></td>
                        <td className={`${TD} whitespace-nowrap`}>{formatDate(leave.startDate)} – {formatDate(leave.endDate)}</td>
                        <td className={TD}>{leave.totalDays} day{leave.totalDays !== 1 ? 's' : ''}</td>
                        <td className={TD}>{statusBadge(leave)}</td>
                        <td className={TD}><span className="block max-w-[280px] truncate" title={leave.reason}>{leave.reason || '—'}</span>{leave.status === 'approved' && (leave.approver || leave.approvedBy) && (<span className="block text-xs text-green-600 mt-0.5">Approved by {(leave.approver || leave.approvedBy)?.fullName}</span>)}</td>
                        <td className={TD}>{rowActions(leave)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {paginatedLeaves.map((leave) => {
                const cfg = leaveTypeConfig(leave.leaveType);
                return (
                  <div key={leave.id} className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] hover:shadow-md transition-all">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-[var(--icon-cyan-bg)] flex items-center justify-center shrink-0"><UserIcon className="w-5 h-5 text-[var(--icon-cyan-text)]" /></div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-[var(--text-primary)] text-sm truncate">{leave.user?.fullName || '—'}</h3>
                          <p className="text-xs text-[var(--text-secondary)] truncate">@{leave.user?.username ?? '—'}{leave.user?.role && ` · ${leave.user.role.replace(/_/g, ' ')}`}</p>
                        </div>
                      </div>
                      {statusBadge(leave)}
                    </div>
                    <dl className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-[var(--bg-main)] rounded-lg p-2"><dt className="text-[var(--text-tertiary)]">Type</dt><dd className="font-semibold text-[var(--text-primary)]">{cfg.label}</dd></div>
                      <div className="bg-[var(--bg-main)] rounded-lg p-2"><dt className="text-[var(--text-tertiary)]">Days</dt><dd className="font-semibold text-[var(--text-primary)]">{leave.totalDays} day{leave.totalDays !== 1 ? 's' : ''}</dd></div>
                      <div className="bg-[var(--bg-main)] rounded-lg p-2 col-span-2"><dt className="text-[var(--text-tertiary)]">Dates</dt><dd className="font-medium text-[var(--text-primary)]">{formatDate(leave.startDate)} – {formatDate(leave.endDate)}</dd></div>
                      {leave.reason && (<div className="bg-[var(--bg-main)] rounded-lg p-2 col-span-2"><dt className="text-[var(--text-tertiary)]">Reason</dt><dd className="font-medium text-[var(--text-primary)] line-clamp-2">{leave.reason}</dd></div>)}
                    </dl>
                    {leave.status === 'approved' && (leave.approver || leave.approvedBy) && (<p className="mt-2 text-xs text-green-600">Approved by {(leave.approver || leave.approvedBy)?.fullName}</p>)}
                    <div className="flex items-center gap-2 pt-3 mt-3 border-t border-[var(--border-color)]">{rowActions(leave)}</div>
                  </div>
                );
              })}
            </div>
          )}
          {visibleLeaves.length > 0 && <Pagination page={currentPage} totalPages={totalPages} itemsPerPage={itemsPerPage} totalItems={visibleLeaves.length} noun="leave requests" onChange={goToPage} />}
        </>
      )}

      {/* ───────── YEARLY VIEW ───────── */}
      {view === 'yearly' && (
        <>
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="border-collapse" style={{ minWidth: '1400px' }}>
                <thead>
                  <tr className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                    <th className="sticky left-0 bg-[var(--bg-main)] px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] min-w-[180px] z-10">Staff</th>
                    {MONTHS.map((m) => (
                      <th key={m} className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]" style={{ minWidth: '108px' }}>{m.slice(0, 3)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {paginatedStaffRows.length === 0 ? (
                    <tr><td colSpan={13} className="px-4 py-12 text-center text-sm text-[var(--text-secondary)]">No leave records found for {year}</td></tr>
                  ) : (
                    paginatedStaffRows.map((row) => (
                      <tr key={row.id} className="hover:bg-[var(--bg-main)]">
                        <td className="sticky left-0 bg-[var(--bg-card)] px-3 py-2 z-10">
                          <div className="text-xs font-medium text-[var(--text-primary)] truncate max-w-[160px]">{row.name}</div>
                          <div className="text-[10px] text-[var(--text-tertiary)] capitalize">{row.role.replace(/_/g, ' ')}</div>
                        </td>
                        {MONTHS.map((_, idx) => (
                          <td key={idx} className="px-1 py-2 align-top">{row.leaves.map((leave) => renderLeaveBar(leave, idx))}</td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="border-t border-[var(--border-color)] px-4 py-3 flex flex-wrap items-center gap-4 text-xs text-[var(--text-secondary)]">
              {LEAVE_TYPES.map((t) => (
                <span key={t.value} className="flex items-center gap-1.5"><span className={`inline-block w-3.5 h-3.5 rounded border ${t.barClass}`} /> {t.label}</span>
              ))}
              <span className="ml-auto text-[10px] text-[var(--text-tertiary)]">Total staff: {yearlyStaffRows.length} · Total leave records: {visibleLeaves.length}</span>
            </div>
          </div>
          {yearlyStaffRows.length > 0 && <Pagination page={currentPage} totalPages={totalPages} itemsPerPage={itemsPerPage} totalItems={yearlyStaffRows.length} noun="staff" onChange={goToPage} />}
        </>
      )}

      {rejectingLeave && (
        <RejectModal leave={rejectingLeave} onCancel={() => setRejectingLeave(null)} onConfirm={handleConfirmReject} />
      )}
    </div>
  );
}
