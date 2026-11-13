// src/pages/UserManagement.tsx — THE ONLY User Management page.
// MERGED: this file now contains everything that used to live in two places:
//   1. This page (Directory + Payslips + Documents)
//   2. src/components/settings/UserManagementTab.tsx (Users + Shifts + Leaves)
// Nothing was deleted in the merge — Shifts and Leaves are new tabs here,
// and the Users content from the Settings tab survives as the Seniority
// filter + Seniority column in the Directory.
// Settings.tsx no longer has a Users tab. DELETE src/components/settings/UserManagementTab.tsx.
import { useState, useEffect, useMemo } from 'react';
import { confirmDialog } from '../context/ConfirmDialog';
import { useUserStore } from '../store/userStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import {
  Search, Plus, User as UserIcon, Shield, Edit, Ban, Hospital, Activity,
  KeyRound, RefreshCw, Users, X, CheckCircle, AlertTriangle, ArrowLeft,
  Stethoscope, Briefcase, DollarSign, FileText, Play, Check,
  Clock, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  HeartPulse, Baby, FlaskConical, Pill, Calculator, Microscope,
  GraduationCap, TrendingUp, XCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import UserEditModal from '../components/UserEditModal';
import UserRegistrationModal from '../components/UserRegistrationModal';
import type { User } from '../types';
import { describeApiError } from '../utils/apiError';

const formatCedis = (v: number | string | undefined | null) => {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v ?? 0);
  return `₵${(isNaN(n) ? 0 : n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// ── Pagination (shared by all 5 tabs) ────────────────────────────────────────
interface PaginationProps {
  currentPage: number; totalPages: number; pageSize: number; totalItems: number;
  startIndex: number; endIndex: number;
  onPageChange: (page: number) => void; onPageSizeChange: (size: number) => void;
  pageSizeOptions: number[];
}
const Pagination: React.FC<PaginationProps> = ({
  currentPage, totalPages, pageSize, totalItems,
  startIndex, endIndex, onPageChange, onPageSizeChange, pageSizeOptions,
}) => {
  if (totalItems === 0) return null;
  const pageWindow = useMemo(() => {
    const pages: (number | 'ellipsis-l' | 'ellipsis-r')[] = [];
    const add = (p: number | 'ellipsis-l' | 'ellipsis-r') => pages.push(p);
    if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) add(i); return pages; }
    add(1);
    if (currentPage > 4) add('ellipsis-l');
    const from = Math.max(2, currentPage - 1);
    const to = Math.min(totalPages - 1, currentPage + 1);
    for (let i = from; i <= to; i++) add(i);
    if (currentPage < totalPages - 3) add('ellipsis-r');
    add(totalPages);
    return pages;
  }, [currentPage, totalPages]);
  const navBtn = 'inline-flex items-center justify-center h-8 min-w-8 px-2 rounded-md text-xs font-semibold transition-all border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-main)] disabled:opacity-40 disabled:cursor-not-allowed';
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-[var(--border-color)] bg-[var(--bg-card)]">
      <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
        <span>Showing <b className="text-[var(--text-primary)]">{startIndex + 1}</b>–<b className="text-[var(--text-primary)]">{Math.min(endIndex, totalItems)}</b> of <b className="text-[var(--text-primary)]">{totalItems}</b></span>
        <span className="hidden sm:inline text-[var(--border-color)]">·</span>
        <label className="hidden sm:flex items-center gap-1.5"><span>Per page</span>
          <select value={pageSize} onChange={e => onPageSizeChange(parseInt(e.target.value, 10))} className="px-2 py-1 text-xs border border-[var(--border-color)] rounded-md bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-cyan-500">
            {pageSizeOptions.map(sz => (<option key={sz} value={sz}>{sz}</option>))}
          </select>
        </label>
      </div>
      <div className="flex items-center gap-1">
        <button type="button" className={navBtn} onClick={() => onPageChange(1)} disabled={currentPage === 1} title="First page"><ChevronsLeft className="w-3.5 h-3.5" /></button>
        <button type="button" className={navBtn} onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} title="Previous"><ChevronLeft className="w-3.5 h-3.5" /></button>
        {pageWindow.map((p, i) => typeof p === 'number' ? (
          <button key={`p-${p}`} type="button" onClick={() => onPageChange(p)} className={`inline-flex items-center justify-center h-8 min-w-8 px-2 rounded-md text-xs font-bold transition-all border ${p === currentPage ? 'bg-cyan-600 text-white border-cyan-600 shadow-sm shadow-cyan-500/20' : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-main)]'}`}>{p}</button>
        ) : (<span key={`e-${i}`} className="px-1 text-[var(--text-tertiary)] text-xs">…</span>))}
        <button type="button" className={navBtn} onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} title="Next"><ChevronRight className="w-3.5 h-3.5" /></button>
        <button type="button" className={navBtn} onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages} title="Last page"><ChevronsRight className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
};

// ── Role catalogue — full coverage of the UserRole enum + graceful fallback ──
const ROLE_STYLES: Record<string, string> = {
  super_admin: 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]', admin: 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]',
  hr_officer: 'bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)]', doctor: 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]',
  nurse: 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]', midwife: 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]',
  lab_tech: 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]', sonographer: 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]',
  pharmacist: 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]', accounts: 'bg-[var(--bg-main)] text-[var(--text-secondary)]',
  records: 'bg-[var(--icon-orange-bg)] text-[var(--icon-orange-text)]', billing_officer: 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]',
  store_keeper: 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]', community_nurse: 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]',
};
const ROLE_ICON_KEYS: Record<string, 'stethoscope' | 'shield' | 'briefcase' | 'heart' | 'baby' | 'flask' | 'pill' | 'calculator' | 'microscope'> = {
  super_admin: 'shield', admin: 'shield', hr_officer: 'briefcase', doctor: 'stethoscope', nurse: 'heart', midwife: 'baby',
  lab_tech: 'flask', sonographer: 'microscope', pharmacist: 'pill', accounts: 'calculator', records: 'briefcase',
  billing_officer: 'calculator', store_keeper: 'briefcase', community_nurse: 'heart',
};
const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin', admin: 'Admin', hr_officer: 'HR Officer', doctor: 'Doctor', nurse: 'Nurse', midwife: 'Midwife',
  lab_tech: 'Lab Technician', sonographer: 'Sonographer', pharmacist: 'Pharmacist', accounts: 'Accounts', records: 'Records',
  billing_officer: 'Billing Officer', store_keeper: 'Store Keeper', community_nurse: 'Community Nurse',
};

// ── From the old Settings tab: seniority / shift / leave configs ─────────────
const SENIORITY_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  TRAINEE: { label: 'Trainee', color: 'bg-purple-100 text-purple-700', icon: GraduationCap },
  JUNIOR: { label: 'Junior', color: 'bg-blue-100 text-blue-700', icon: UserIcon },
  SENIOR: { label: 'Senior', color: 'bg-orange-100 text-orange-700', icon: TrendingUp },
  PRINCIPAL: { label: 'Principal', color: 'bg-amber-100 text-amber-700', icon: Shield },
};
const LEAVE_STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: XCircle },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-700', icon: XCircle },
};
const SHIFT_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  morning: { label: 'Morning', color: 'bg-green-100 text-green-700' },
  afternoon: { label: 'Afternoon', color: 'bg-orange-100 text-orange-700' },
  night: { label: 'Night', color: 'bg-purple-100 text-purple-700' },
  on_call: { label: 'On Call', color: 'bg-blue-100 text-blue-700' },
};

// ── Main page ────────────────────────────────────────────────────────────────
type TabId = 'directory' | 'payslips' | 'documents' | 'shifts' | 'leaves';

export default function UserManagement() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('directory');

  // Directory state (merged: + seniority filter from the old Settings tab)
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [seniorityFilter, setSeniorityFilter] = useState<string>('ALL');

  // Modals
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deactivatingUser, setDeactivatingUser] = useState<User | null>(null);
  const [resettingUser, setResettingUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // Payslips state
  const now = new Date();
  const [payrollMonth, setPayrollMonth] = useState(now.getMonth() + 1);
  const [payrollYear, setPayrollYear] = useState(now.getFullYear());
  const [payrollRunning, setPayrollRunning] = useState(false);

  // Shifts / Leaves state (from the old Settings tab)
  const [shiftSearch, setShiftSearch] = useState('');
  const [selectedShiftUserId, setSelectedShiftUserId] = useState<string>('ALL');
  const [leaveSearch, setLeaveSearch] = useState('');
  const [leaveStatusFilter, setLeaveStatusFilter] = useState<string>('ALL');
  const [selectedLeaveUserId, setSelectedLeaveUserId] = useState<string>('ALL');
  const [selectedLeaveId, setSelectedLeaveId] = useState<string | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // ── Pagination state (per-tab, persisted) ──
  const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
  const usePersistedSize = (key: string) => useState(() => {
    const saved = localStorage.getItem(key);
    return saved ? parseInt(saved, 10) : 20;
  });
  const [dirPage, setDirPage] = useState(1);
  const [dirPageSize, setDirPageSize] = usePersistedSize('userMgmtDirPageSize');
  const [payPage, setPayPage] = useState(1);
  const [payPageSize, setPayPageSize] = usePersistedSize('userMgmtPayPageSize');
  const [docPage, setDocPage] = useState(1);
  const [docPageSize, setDocPageSize] = usePersistedSize('userMgmtDocPageSize');
  const [shiftPage, setShiftPage] = useState(1);
  const [shiftPageSize, setShiftPageSize] = usePersistedSize('userMgmtShiftPageSize');
  const [leavePage, setLeavePage] = useState(1);
  const [leavePageSize, setLeavePageSize] = usePersistedSize('userMgmtLeavePageSize');
  useEffect(() => { localStorage.setItem('userMgmtDirPageSize', String(dirPageSize)); }, [dirPageSize]);
  useEffect(() => { localStorage.setItem('userMgmtPayPageSize', String(payPageSize)); }, [payPageSize]);
  useEffect(() => { localStorage.setItem('userMgmtDocPageSize', String(docPageSize)); }, [docPageSize]);
  useEffect(() => { localStorage.setItem('userMgmtShiftPageSize', String(shiftPageSize)); }, [shiftPageSize]);
  useEffect(() => { localStorage.setItem('userMgmtLeavePageSize', String(leavePageSize)); }, [leavePageSize]);

  const {
    users, getAllUsers, updateUser, deactivateUser, resetUserPassword, isLoading,
    allPayslips, getAllPayslips, allDocuments, getAllDocuments, runPayroll,
    shifts, getShifts, leaves, getLeaves, updateLeave,
  } = useUserStore();
  const { hasRole, user: currentUser } = useAuthStore();
  const { success, error: toastError } = useToast();

  const canManageUsers = hasRole(['admin', 'super_admin', 'hr_officer']);
  const canResetPasswords = hasRole(['admin', 'super_admin']); // HR may edit but may not hand out a new password

  useEffect(() => { if (canManageUsers) getAllUsers(); }, [canManageUsers, getAllUsers]);
  useEffect(() => {
    if (activeTab === 'payslips') getAllPayslips({ month: payrollMonth, year: payrollYear });
    else if (activeTab === 'documents') getAllDocuments();
    else if (activeTab === 'shifts') getShifts({});
    else if (activeTab === 'leaves') getLeaves({});
  }, [activeTab, payrollMonth, payrollYear]);

  const userList = Array.isArray(users) ? users : [];

  const filteredUsers = useMemo(() => userList.filter((user: User) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = user.fullName?.toLowerCase().includes(q) || user.username?.toLowerCase().includes(q) || user.role?.toLowerCase().includes(q) || user.email?.toLowerCase().includes(q);
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    let matchesStatus = true;
    if (filterStatus === 'active') matchesStatus = user.isActive === true;
    else if (filterStatus === 'inactive') matchesStatus = user.isActive === false;
    const matchesSeniority = seniorityFilter === 'ALL' || (user as any).seniority === seniorityFilter;
    return matchesSearch && matchesRole && matchesStatus && matchesSeniority;
  }), [userList, searchQuery, filterRole, filterStatus, seniorityFilter]);

  useEffect(() => { setDirPage(1); }, [searchQuery, filterRole, filterStatus, seniorityFilter, dirPageSize]);
  useEffect(() => { setPayPage(1); }, [payrollMonth, payrollYear, payPageSize]);
  useEffect(() => { setDocPage(1); }, [docPageSize]);
  useEffect(() => { setShiftPage(1); }, [shiftSearch, selectedShiftUserId, shiftPageSize]);
  useEffect(() => { setLeavePage(1); }, [leaveSearch, leaveStatusFilter, selectedLeaveUserId, leavePageSize]);

  // Generic paginate helper — same logic for all 5 tabs
  const paginate = <T,>(items: T[], page: number, pageSize: number) => {
    const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    return { totalPages, safePage, start, end: start + pageSize, pageItems: items.slice(start, start + pageSize) };
  };
  const dir = paginate(filteredUsers, dirPage, dirPageSize);
  const payRecords = allPayslips?.records ?? [];
  const pay = paginate(payRecords, payPage, payPageSize);
  const docsList = Array.isArray(allDocuments) ? allDocuments : [];
  const doc = paginate(docsList, docPage, docPageSize);
  const filteredShifts = (Array.isArray(shifts) ? shifts : []).filter((shift: any) => {
    if (selectedShiftUserId !== 'ALL' && shift.userId !== selectedShiftUserId) return false;
    if (shiftSearch) {
      const u = userList.find((x: any) => x.id === shift.userId);
      return u?.fullName?.toLowerCase().includes(shiftSearch.toLowerCase());
    }
    return true;
  });
  const shift = paginate(filteredShifts, shiftPage, shiftPageSize);
  const filteredLeaves = (Array.isArray(leaves) ? leaves : []).filter((leave: any) => {
    if (selectedLeaveUserId !== 'ALL' && leave.userId !== selectedLeaveUserId) return false;
    if (leaveStatusFilter !== 'ALL' && leave.status !== leaveStatusFilter) return false;
    if (leaveSearch) {
      const u = userList.find((x: any) => x.id === leave.userId);
      return u?.fullName?.toLowerCase().includes(leaveSearch.toLowerCase());
    }
    return true;
  });
  const leave = paginate(filteredLeaves, leavePage, leavePageSize);

  useEffect(() => { if (dirPage > dir.totalPages) setDirPage(dir.totalPages); }, [dirPage, dir.totalPages]);
  useEffect(() => { if (payPage > pay.totalPages) setPayPage(pay.totalPages); }, [payPage, pay.totalPages]);
  useEffect(() => { if (docPage > doc.totalPages) setDocPage(doc.totalPages); }, [docPage, doc.totalPages]);
  useEffect(() => { if (shiftPage > shift.totalPages) setShiftPage(shift.totalPages); }, [shiftPage, shift.totalPages]);
  useEffect(() => { if (leavePage > leave.totalPages) setLeavePage(leave.totalPages); }, [leavePage, leave.totalPages]);

  // ── Stats & role list ──
  const totalUsers = userList.length;
  const activeUsers = userList.filter((u) => u.isActive).length;
  const inactiveUsers = totalUsers - activeUsers;
  const rolesCount = new Set(userList.map((u) => u.role).filter(Boolean)).size;
  const ALL_ENUM_ROLES = ['super_admin', 'admin', 'hr_officer', 'doctor', 'nurse', 'midwife', 'records', 'lab_tech', 'pharmacist', 'accounts', 'sonographer'];
  const uniqueRoles = useMemo(() => {
    const present = new Set(userList.map((u) => u.role).filter(Boolean) as string[]);
    return Array.from(new Set<string>([...ALL_ENUM_ROLES, ...present])).sort((a, b) => (ROLE_LABELS[a] ?? a).localeCompare(ROLE_LABELS[b] ?? b));
  }, [userList]);

  const getRoleBadge = (role: string) => ROLE_STYLES[role] || 'bg-[var(--bg-main)] text-[var(--text-secondary)]';
  const getRoleIcon = (role: string) => {
    const key = ROLE_ICON_KEYS[role] || 'briefcase';
    switch (key) {
      case 'stethoscope': return <Stethoscope className="w-3 h-3" />;
      case 'shield': return <Shield className="w-3 h-3" />;
      case 'heart': return <HeartPulse className="w-3 h-3" />;
      case 'baby': return <Baby className="w-3 h-3" />;
      case 'flask': return <FlaskConical className="w-3 h-3" />;
      case 'pill': return <Pill className="w-3 h-3" />;
      case 'calculator': return <Calculator className="w-3 h-3" />;
      case 'microscope': return <Microscope className="w-3 h-3" />;
      default: return <Briefcase className="w-3 h-3" />;
    }
  };
  const getRoleLabel = (role: string) => ROLE_LABELS[role] || role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const renderSeniorityBadge = (seniority: string) => {
    const config = SENIORITY_CONFIG[seniority] || SENIORITY_CONFIG.JUNIOR;
    const Icon = config.icon;
    return (<span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}><Icon className="w-3 h-3" />{config.label}</span>);
  };
  const renderShiftTypeBadge = (shiftType: string) => {
    const config = SHIFT_TYPE_CONFIG[shiftType] || { label: shiftType, color: 'bg-gray-100 text-gray-700' };
    return (<span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}><Clock className="w-3 h-3" />{config.label}</span>);
  };
  const renderLeaveStatusBadge = (status: string) => {
    const config = LEAVE_STATUS_CONFIG[status] || LEAVE_STATUS_CONFIG.pending;
    const Icon = config.icon;
    return (<span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}><Icon className="w-3 h-3" />{config.label}</span>);
  };

  // ── Handlers (all preserved from both sources) ──
  const handleRegisterSuccess = async () => { setShowRegisterModal(false); await getAllUsers(); };
  const handleEditUser = async (userData: Partial<User>) => {
    if (!editingUser) return;
    try { await updateUser(editingUser.id, userData); setEditingUser(null); success('User Updated', `${userData.fullName || editingUser.fullName} updated`); }
    catch (err: any) { toastError('User not updated', describeApiError(err, 'The user could not be updated.')); }
  };
  const handleDeactivateUser = async () => {
    if (!deactivatingUser) return;
    try { await deactivateUser(deactivatingUser.id); setDeactivatingUser(null); success('User Deactivated', `${deactivatingUser.fullName} deactivated`); }
    catch (err: any) { toastError('User not deactivated', describeApiError(err, 'The user could not be deactivated.')); }
  };
  const openPasswordReset = (user: User) => { setResettingUser(user); setNewPassword(''); };
  const handlePasswordReset = async () => {
    if (!resettingUser) return;
    try {
      await resetUserPassword(resettingUser.id, newPassword);
      const name = resettingUser.fullName; setResettingUser(null);
      success('Password reset', `${name} can sign in with the new password. Every other session of that account is now closed.`);
    } catch (err: any) { toastError('Reset failed', err?.response?.data?.message || 'Could not reset the password'); }
  };
  const handleRunPayroll = async () => {
    if (!(await confirmDialog({ title: 'Run payroll', message: `Run payroll for ${payrollMonth}/${payrollYear}? This will generate or refresh payslips for every active staff member.`, confirmText: 'Run payroll', type: 'warning' }))) return;
    setPayrollRunning(true);
    try {
      const result = await runPayroll(payrollMonth, payrollYear);
      if (!Array.isArray(result) || result.length === 0) { toastError('No staff to pay', "No active staff profiles were found. Open each user's HR tab and save it once to create a staff profile."); return; }
      const ok = result.filter((r: any) => r.ok).length; const fail = result.filter((r: any) => !r.ok).length;
      success('Payroll complete', `${ok} payslips generated/refreshed${fail ? `, ${fail} failed` : ''}`);
      await getAllPayslips({ month: payrollMonth, year: payrollYear });
    } catch (err: any) { toastError('Payroll failed', err?.response?.data?.message || 'Could not run payroll'); }
    finally { setPayrollRunning(false); }
  };
  const handleTogglePaid = async (recordId: string, isPaid: boolean) => {
    try {
      const { updatePayslip } = useUserStore.getState();
      await updatePayslip(recordId, { isPaid });
      await getAllPayslips({ month: payrollMonth, year: payrollYear });
      success('Updated', isPaid ? 'Marked paid' : 'Marked pending');
    } catch (err: any) { toastError('Update failed', err?.response?.data?.message || 'Could not update payslip'); }
  };
  const handleApproveLeave = async () => {
    if (!selectedLeaveId) return;
    try { await updateLeave(selectedLeaveId, { status: 'approved' }); success('Leave Approved', 'The leave request has been approved'); setShowApprovalModal(false); setSelectedLeaveId(null); await getLeaves({}); }
    catch (err: any) { toastError('Leave not approved', describeApiError(err, 'The leave request could not be approved.')); }
  };
  const handleRejectLeave = async () => {
    if (!selectedLeaveId) return;
    try { await updateLeave(selectedLeaveId, { status: 'rejected', reason: rejectionReason }); success('Leave Rejected', 'The leave request has been rejected'); setShowRejectionModal(false); setSelectedLeaveId(null); setRejectionReason(''); await getLeaves({}); }
    catch (err: any) { toastError('Leave not rejected', describeApiError(err, 'The leave request could not be rejected.')); }
  };

  if (!canManageUsers) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
        <div className="text-center bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-8 max-w-md w-full">
          <Shield className="w-16 h-16 text-[var(--icon-red-text)] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Access Denied</h2>
          <p className="text-[var(--text-secondary)] text-sm mb-6">Administrator privileges required.</p>
          <button onClick={() => navigate('/dashboard')} className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg font-semibold text-sm"><ArrowLeft className="w-4 h-4" /> Back to Dashboard</button>
        </div>
      </div>
    );
  }

  const selectCls = "px-3 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm";

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-[var(--bg-main)]"><ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" /></button>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2"><Hospital className="w-5 h-5 text-[var(--icon-cyan-text)]" />HR &amp; User Management</h1>
            <p className="text-sm text-[var(--text-secondary)]">Users, payroll, documents, shifts and leave</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => getAllUsers()} disabled={isLoading} className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] text-sm text-[var(--text-primary)]"><RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh</button>
          {activeTab === 'directory' && (
            <button onClick={() => setShowRegisterModal(true)} className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white text-sm font-medium"><Plus className="w-4 h-4" /> Add User</button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: totalUsers, icon: Users, bg: 'bg-[var(--icon-cyan-bg)]', color: 'text-[var(--icon-cyan-text)]' },
          { label: 'Active', value: activeUsers, icon: CheckCircle, bg: 'bg-[var(--icon-green-bg)]', color: 'text-[var(--icon-green-text)]' },
          { label: 'Inactive', value: inactiveUsers, icon: Ban, bg: 'bg-[var(--icon-red-bg)]', color: 'text-[var(--icon-red-text)]' },
          { label: 'Roles', value: rolesCount, icon: Shield, bg: 'bg-[var(--icon-purple-bg)]', color: 'text-[var(--icon-purple-text)]' },
        ].map((s) => (
          <div key={s.label} className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] flex items-center justify-between">
            <div><p className="text-sm text-[var(--text-secondary)]">{s.label}</p><p className="text-2xl font-bold text-[var(--text-primary)]">{s.value}</p></div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.bg}`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
          </div>
        ))}
      </div>

      {/* Tabs — 5 now, was 3 + 3 in two places */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-1 flex gap-1 max-w-2xl overflow-x-auto">
        {[
          { id: 'directory' as TabId, label: 'Directory', icon: Users },
          { id: 'payslips' as TabId, label: 'Payslips', icon: DollarSign },
          { id: 'documents' as TabId, label: 'Documents', icon: FileText },
          { id: 'shifts' as TabId, label: `Shifts (${Array.isArray(shifts) ? shifts.length : 0})`, icon: Clock },
          { id: 'leaves' as TabId, label: `Leaves (${(Array.isArray(leaves) ? leaves : []).filter((l: any) => l.status === 'pending').length} pending)`, icon: FileText },
        ].map((t) => {
          const Icon = t.icon;
          return (<button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${activeTab === t.id ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}><Icon className="w-3.5 h-3.5" /> {t.label}</button>);
        })}
      </div>

      {/* ══════════ DIRECTORY ══════════ */}
      {activeTab === 'directory' && (
        <>
          <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search users..." className="w-full pl-10 pr-4 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm" />
              </div>
              <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className={`${selectCls} min-w-[170px]`}>
                <option value="all">All Roles</option>{uniqueRoles.map((r) => (<option key={r} value={r}>{getRoleLabel(r)}</option>))}
              </select>
              <select value={seniorityFilter} onChange={(e) => setSeniorityFilter(e.target.value)} className={`${selectCls} min-w-[150px]`}>
                <option value="ALL">All Seniority</option><option value="TRAINEE">Trainee</option><option value="JUNIOR">Junior</option><option value="SENIOR">Senior</option><option value="PRINCIPAL">Principal</option>
              </select>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={`${selectCls} min-w-[130px]`}>
                <option value="all">All Status</option><option value="active">Active</option><option value="inactive">Inactive</option>
              </select>
            </div>
            {(searchQuery || filterRole !== 'all' || filterStatus !== 'all' || seniorityFilter !== 'ALL') && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--border-color)] flex-wrap text-xs">
                <span className="text-[var(--text-tertiary)] font-medium">Active:</span>
                {searchQuery && (<span className="inline-flex items-center gap-1 px-2 py-1 bg-cyan-50 text-cyan-700 rounded-md font-medium">Search: "{searchQuery}"<button onClick={() => setSearchQuery('')} className="hover:text-cyan-900"><X className="w-3 h-3" /></button></span>)}
                {filterRole !== 'all' && (<span className="inline-flex items-center gap-1 px-2 py-1 bg-cyan-50 text-cyan-700 rounded-md font-medium">Role: {getRoleLabel(filterRole)}<button onClick={() => setFilterRole('all')} className="hover:text-cyan-900"><X className="w-3 h-3" /></button></span>)}
                {seniorityFilter !== 'ALL' && (<span className="inline-flex items-center gap-1 px-2 py-1 bg-cyan-50 text-cyan-700 rounded-md font-medium">Seniority: {seniorityFilter}<button onClick={() => setSeniorityFilter('ALL')} className="hover:text-cyan-900"><X className="w-3 h-3" /></button></span>)}
                {filterStatus !== 'all' && (<span className="inline-flex items-center gap-1 px-2 py-1 bg-cyan-50 text-cyan-700 rounded-md font-medium capitalize">Status: {filterStatus}<button onClick={() => setFilterStatus('all')} className="hover:text-cyan-900"><X className="w-3 h-3" /></button></span>)}
                <span className="ml-auto text-[var(--text-tertiary)]">{filteredUsers.length} of {userList.length}{filteredUsers.length > dirPageSize && <> · page {dir.safePage}/{dir.totalPages}</>}</span>
              </div>
            )}
          </div>

          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
            {filteredUsers.length === 0 ? (
              <div className="p-12 text-center"><Users className="w-16 h-16 text-[var(--text-tertiary)] mx-auto mb-4" /><p className="text-sm text-[var(--text-secondary)]">No users found.</p></div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase whitespace-nowrap">User</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase whitespace-nowrap">Username</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase whitespace-nowrap hidden sm:table-cell">Email</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase whitespace-nowrap hidden sm:table-cell">Phone</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase whitespace-nowrap">Role</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase whitespace-nowrap">Seniority</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase whitespace-nowrap hidden lg:table-cell">Department</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase whitespace-nowrap">Status</th>
                        <th className="px-3 py-3 text-right text-xs font-semibold text-[var(--text-secondary)] uppercase whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)]">
                      {dir.pageItems.map((user: User) => (
                        <tr key={user.id} className="hover:bg-[var(--bg-main)]">
                          <td className="px-3 py-3 whitespace-nowrap"><div className="flex items-center gap-3"><div className="w-9 h-9 bg-[var(--icon-cyan-bg)] rounded-lg flex items-center justify-center"><UserIcon className="w-4 h-4 text-[var(--icon-cyan-text)]" /></div><div className="text-sm font-medium text-[var(--text-primary)]">{user.fullName}</div></div></td>
                          <td className="px-3 py-3 whitespace-nowrap text-xs text-[var(--text-tertiary)]">@{user.username}</td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-[var(--text-primary)] hidden sm:table-cell">{user.email || '—'}</td>
                          <td className="px-3 py-3 whitespace-nowrap text-xs text-[var(--text-secondary)] hidden sm:table-cell">{user.phone || '—'}</td>
                          <td className="px-3 py-3 whitespace-nowrap"><span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getRoleBadge(user.role)}`}>{getRoleIcon(user.role)}{getRoleLabel(user.role)}</span></td>
                          <td className="px-3 py-3 whitespace-nowrap">{renderSeniorityBadge((user as any).seniority || 'JUNIOR')}</td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-[var(--text-primary)] hidden lg:table-cell">{user.department?.name || '—'}</td>
                          <td className="px-3 py-3 whitespace-nowrap"><span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${user.isActive ? 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]' : 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]'}`}><Activity className="w-3 h-3" />{user.isActive ? 'Active' : 'Inactive'}</span></td>
                          <td className="px-3 py-3 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => navigate(`/dashboard/users/${user.id}`)} className="p-1.5 text-[var(--icon-cyan-text)] border border-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-bg)] transition-all" title="Open full profile (account + HR + payslips)"><FileText className="w-3.5 h-3.5" /></button>
                              {(user.role !== 'super_admin' || currentUser?.role === 'super_admin') && (<button onClick={() => setEditingUser(user)} className="p-1.5 text-[var(--icon-green-text)] border border-[var(--icon-green-text)] rounded-lg hover:bg-[var(--icon-green-bg)]" title="Quick edit account"><Edit className="w-3.5 h-3.5" /></button>)}
                              {canResetPasswords && user.id !== currentUser?.id && (user.role !== 'super_admin' || currentUser?.role === 'super_admin') && (<button onClick={() => openPasswordReset(user)} className="p-1.5 text-[var(--icon-orange-text)] border border-[var(--icon-orange-text)] rounded-lg hover:bg-[var(--icon-orange-bg)]" title="Reset password (signs the account out everywhere)"><KeyRound className="w-3.5 h-3.5" /></button>)}
                              {user.isActive && user.id !== currentUser?.id && (user.role !== 'super_admin' || currentUser?.role === 'super_admin') && (<button onClick={() => setDeactivatingUser(user)} className="p-1.5 text-[var(--icon-red-text)] border border-[var(--icon-red-text)] rounded-lg hover:bg-[var(--icon-red-bg)]" title="Deactivate account"><Ban className="w-3.5 h-3.5" /></button>)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination currentPage={dir.safePage} totalPages={dir.totalPages} pageSize={dirPageSize} totalItems={filteredUsers.length} startIndex={dir.start} endIndex={dir.end} onPageChange={setDirPage} onPageSizeChange={setDirPageSize} pageSizeOptions={PAGE_SIZE_OPTIONS} />
              </>
            )}
          </div>
        </>
      )}

      {/* ══════════ PAYSLIPS ══════════ */}
      {activeTab === 'payslips' && (
        <>
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-4 flex flex-wrap items-end gap-3">
            <div><label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Month</label>
              <select value={payrollMonth} onChange={(e) => setPayrollMonth(Number(e.target.value))} className="px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)]">{Array.from({ length: 12 }, (_, i) => i + 1).map(m => (<option key={m} value={m}>{new Date(2000, m - 1, 1).toLocaleString('default', { month: 'long' })}</option>))}</select></div>
            <div><label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Year</label>
              <select value={payrollYear} onChange={(e) => setPayrollYear(Number(e.target.value))} className="px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)]">{[0, 1, 2].map(i => { const y = new Date().getFullYear() - i; return <option key={y} value={y}>{y}</option>; })}</select></div>
            <button onClick={handleRunPayroll} disabled={payrollRunning} className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white text-sm font-medium disabled:opacity-50 ml-auto"><Play className={`w-4 h-4 ${payrollRunning ? 'animate-pulse' : ''}`} />{payrollRunning ? 'Running…' : `Run Payroll for ${payrollMonth}/${payrollYear}`}</button>
          </div>
          {allPayslips?.totals && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {[
                { label: 'Payslips', value: allPayslips.totals.count },
                { label: 'Total Gross', value: formatCedis(allPayslips.totals.gross + allPayslips.totals.deductions > 0 ? allPayslips.totals.gross : 0) },
                { label: 'Total Deductions', value: formatCedis(allPayslips.totals.deductions) },
                { label: 'Total Net', value: formatCedis(allPayslips.totals.net) },
                { label: 'Paid / Pending', value: `${allPayslips.totals.paid} / ${allPayslips.totals.pending}` },
              ].map((s) => (<div key={s.label} className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]"><p className="text-xs text-[var(--text-secondary)]">{s.label}</p><p className="text-lg font-bold text-[var(--text-primary)] mt-1">{s.value}</p></div>))}
            </div>
          )}
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
            {!allPayslips || payRecords.length === 0 ? (
              <div className="p-12 text-center"><DollarSign className="w-16 h-16 text-[var(--text-tertiary)] mx-auto mb-4" /><p className="text-sm text-[var(--text-secondary)]">No payslips for {payrollMonth}/{payrollYear}.</p><p className="text-xs text-[var(--text-tertiary)] mt-1">Click "Run Payroll" to generate them.</p></div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                      <tr>
                        <th className="px-3 py-3 text-left font-semibold text-[var(--text-secondary)] whitespace-nowrap">Employee</th>
                        <th className="px-3 py-3 text-left font-semibold text-[var(--text-secondary)] whitespace-nowrap">Role</th>
                        <th className="px-3 py-3 text-left font-semibold text-[var(--text-secondary)] whitespace-nowrap">Department</th>
                        <th className="px-3 py-3 text-right font-semibold text-[var(--text-secondary)] whitespace-nowrap">Base</th>
                        <th className="px-3 py-3 text-right font-semibold text-[var(--text-secondary)] whitespace-nowrap">Allowances</th>
                        <th className="px-3 py-3 text-right font-semibold text-[var(--text-secondary)] whitespace-nowrap">Deductions</th>
                        <th className="px-3 py-3 text-right font-semibold text-[var(--text-secondary)] whitespace-nowrap">Net</th>
                        <th className="px-3 py-3 text-center font-semibold text-[var(--text-secondary)] whitespace-nowrap">Status</th>
                        <th className="px-3 py-3 text-center font-semibold text-[var(--text-secondary)] whitespace-nowrap">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)]">
                      {pay.pageItems.map((r: any) => (
                        <tr key={r.id} className="hover:bg-[var(--bg-main)]">
                          <td className="px-3 py-3 font-medium text-[var(--text-primary)] whitespace-nowrap">{r.staff?.user.fullName || '—'}</td>
                          <td className="px-3 py-3 text-[var(--text-secondary)] whitespace-nowrap">{r.staff?.user.role?.replace(/_/g, ' ') || '—'}</td>
                          <td className="px-3 py-3 text-[var(--text-secondary)] whitespace-nowrap">{r.staff?.user.department?.name || '—'}</td>
                          <td className="px-3 py-3 text-right">{formatCedis(r.baseSalary)}</td>
                          <td className="px-3 py-3 text-right">{formatCedis(r.allowances)}</td>
                          <td className="px-3 py-3 text-right">{formatCedis(r.deductions)}</td>
                          <td className="px-3 py-3 text-right font-semibold">{formatCedis(r.netPay)}</td>
                          <td className="px-3 py-3 text-center"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${r.isPaid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{r.isPaid ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}{r.isPaid ? 'Paid' : 'Pending'}</span></td>
                          <td className="px-3 py-3 text-center"><button onClick={() => handleTogglePaid(r.id, !r.isPaid)} className="text-xs text-[var(--icon-cyan-text)] hover:underline">Mark {r.isPaid ? 'Pending' : 'Paid'}</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination currentPage={pay.safePage} totalPages={pay.totalPages} pageSize={payPageSize} totalItems={payRecords.length} startIndex={pay.start} endIndex={pay.end} onPageChange={setPayPage} onPageSizeChange={setPayPageSize} pageSizeOptions={PAGE_SIZE_OPTIONS} />
              </>
            )}
          </div>
        </>
      )}

      {/* ══════════ DOCUMENTS ══════════ */}
      {activeTab === 'documents' && (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
          {docsList.length === 0 ? (
            <div className="p-12 text-center"><FileText className="w-16 h-16 text-[var(--text-tertiary)] mx-auto mb-4" /><p className="text-sm text-[var(--text-secondary)]">No documents on file.</p></div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                    <tr>
                      <th className="px-3 py-3 text-left font-semibold text-[var(--text-secondary)] whitespace-nowrap">Employee</th>
                      <th className="px-3 py-3 text-left font-semibold text-[var(--text-secondary)] whitespace-nowrap">Document</th>
                      <th className="px-3 py-3 text-left font-semibold text-[var(--text-secondary)] whitespace-nowrap">Expires</th>
                      <th className="px-3 py-3 text-center font-semibold text-[var(--text-secondary)] whitespace-nowrap">Verified</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {doc.pageItems.map((d: any) => (
                      <tr key={d.id} className="hover:bg-[var(--bg-main)]">
                        <td className="px-3 py-3 font-medium text-[var(--text-primary)]">{d.staff?.user.fullName || '—'}</td>
                        <td className="px-3 py-3">{d.title || d.type}</td>
                        <td className="px-3 py-3 text-[var(--text-secondary)]">{d.expiryDate ? new Date(d.expiryDate).toLocaleDateString() : '—'}</td>
                        <td className="px-3 py-3 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${d.isVerified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{d.isVerified ? 'Verified' : 'Pending'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination currentPage={doc.safePage} totalPages={doc.totalPages} pageSize={docPageSize} totalItems={docsList.length} startIndex={doc.start} endIndex={doc.end} onPageChange={setDocPage} onPageSizeChange={setDocPageSize} pageSizeOptions={PAGE_SIZE_OPTIONS} />
            </>
          )}
        </div>
      )}

      {/* ══════════ SHIFTS (from old Settings tab — was cards, now a table) ══════════ */}
      {activeTab === 'shifts' && (
        <>
          <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input type="text" value={shiftSearch} onChange={(e) => setShiftSearch(e.target.value)} placeholder="Search by staff name..." className="w-full pl-10 pr-4 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm" />
              </div>
              <select value={selectedShiftUserId} onChange={(e) => setSelectedShiftUserId(e.target.value)} className={selectCls}>
                <option value="ALL">All Staff</option>{userList.map((u: any) => (<option key={u.id} value={u.id}>{u.fullName}</option>))}
              </select>
            </div>
          </div>
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
            {filteredShifts.length === 0 ? (
              <div className="text-center py-12"><Clock className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" /><p className="text-[var(--text-secondary)]">No shifts found</p></div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                      <tr>
                        <th className="px-3 py-3 text-left font-semibold text-[var(--text-secondary)] whitespace-nowrap">Staff</th>
                        <th className="px-3 py-3 text-left font-semibold text-[var(--text-secondary)] whitespace-nowrap">Shift Type</th>
                        <th className="px-3 py-3 text-left font-semibold text-[var(--text-secondary)] whitespace-nowrap">Date</th>
                        <th className="px-3 py-3 text-left font-semibold text-[var(--text-secondary)] whitespace-nowrap">Start</th>
                        <th className="px-3 py-3 text-left font-semibold text-[var(--text-secondary)] whitespace-nowrap">End</th>
                        <th className="px-3 py-3 text-left font-semibold text-[var(--text-secondary)] whitespace-nowrap">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)]">
                      {shift.pageItems.map((s: any) => {
                        const u = userList.find((x: any) => x.id === s.userId);
                        return (
                          <tr key={s.id} className="hover:bg-[var(--bg-main)]">
                            <td className="px-3 py-3 font-medium text-[var(--text-primary)] whitespace-nowrap">{u?.fullName || 'Unknown'}</td>
                            <td className="px-3 py-3 whitespace-nowrap">{renderShiftTypeBadge(s.shiftType)}</td>
                            <td className="px-3 py-3 text-[var(--text-secondary)] whitespace-nowrap">{new Date(s.shiftDate).toLocaleDateString('en-GB', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</td>
                            <td className="px-3 py-3 whitespace-nowrap">{new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                            <td className="px-3 py-3 whitespace-nowrap">{new Date(s.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                            <td className="px-3 py-3 text-[var(--text-secondary)]">{s.notes || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <Pagination currentPage={shift.safePage} totalPages={shift.totalPages} pageSize={shiftPageSize} totalItems={filteredShifts.length} startIndex={shift.start} endIndex={shift.end} onPageChange={setShiftPage} onPageSizeChange={setShiftPageSize} pageSizeOptions={PAGE_SIZE_OPTIONS} />
              </>
            )}
          </div>
        </>
      )}

      {/* ══════════ LEAVES (from old Settings tab — was cards, now a table) ══════════ */}
      {activeTab === 'leaves' && (
        <>
          <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input type="text" value={leaveSearch} onChange={(e) => setLeaveSearch(e.target.value)} placeholder="Search by staff name..." className="w-full pl-10 pr-4 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm" />
              </div>
              <select value={selectedLeaveUserId} onChange={(e) => setSelectedLeaveUserId(e.target.value)} className={selectCls}>
                <option value="ALL">All Staff</option>{userList.map((u: any) => (<option key={u.id} value={u.id}>{u.fullName}</option>))}
              </select>
              <select value={leaveStatusFilter} onChange={(e) => setLeaveStatusFilter(e.target.value)} className={selectCls}>
                <option value="ALL">All Status</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
            {filteredLeaves.length === 0 ? (
              <div className="text-center py-12"><FileText className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" /><p className="text-[var(--text-secondary)]">No leave requests found</p></div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                      <tr>
                        <th className="px-3 py-3 text-left font-semibold text-[var(--text-secondary)] whitespace-nowrap">Staff</th>
                        <th className="px-3 py-3 text-left font-semibold text-[var(--text-secondary)] whitespace-nowrap">Leave Type</th>
                        <th className="px-3 py-3 text-left font-semibold text-[var(--text-secondary)] whitespace-nowrap">Status</th>
                        <th className="px-3 py-3 text-left font-semibold text-[var(--text-secondary)] whitespace-nowrap">Start</th>
                        <th className="px-3 py-3 text-left font-semibold text-[var(--text-secondary)] whitespace-nowrap">End</th>
                        <th className="px-3 py-3 text-left font-semibold text-[var(--text-secondary)] whitespace-nowrap">Total Days</th>
                        <th className="px-3 py-3 text-left font-semibold text-[var(--text-secondary)] whitespace-nowrap">Reason</th>
                        <th className="px-3 py-3 text-left font-semibold text-[var(--text-secondary)] whitespace-nowrap">Approver</th>
                        <th className="px-3 py-3 text-center font-semibold text-[var(--text-secondary)] whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)]">
                      {leave.pageItems.map((l: any) => {
                        const u = userList.find((x: any) => x.id === l.userId);
                        return (
                          <tr key={l.id} className="hover:bg-[var(--bg-main)]">
                            <td className="px-3 py-3 font-medium text-[var(--text-primary)] whitespace-nowrap">{u?.fullName || 'Unknown'}</td>
                            <td className="px-3 py-3 whitespace-nowrap"><span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{l.leaveType?.toUpperCase()}</span></td>
                            <td className="px-3 py-3 whitespace-nowrap">{renderLeaveStatusBadge(l.status)}</td>
                            <td className="px-3 py-3 whitespace-nowrap">{new Date(l.startDate).toLocaleDateString()}</td>
                            <td className="px-3 py-3 whitespace-nowrap">{new Date(l.endDate).toLocaleDateString()}</td>
                            <td className="px-3 py-3 whitespace-nowrap">{l.totalDays} day{l.totalDays !== 1 ? 's' : ''}</td>
                            <td className="px-3 py-3 text-[var(--text-secondary)]">{l.reason || '—'}</td>
                            <td className="px-3 py-3 text-green-600 whitespace-nowrap">{l.approver?.fullName || '—'}</td>
                            <td className="px-3 py-3 text-center whitespace-nowrap">
                              {l.status === 'pending' ? (
                                <div className="flex gap-2 justify-center">
                                  <button onClick={() => { setSelectedLeaveId(l.id); setShowApprovalModal(true); }} className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200">Approve</button>
                                  <button onClick={() => { setSelectedLeaveId(l.id); setShowRejectionModal(true); }} className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200">Reject</button>
                                </div>
                              ) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <Pagination currentPage={leave.safePage} totalPages={leave.totalPages} pageSize={leavePageSize} totalItems={filteredLeaves.length} startIndex={leave.start} endIndex={leave.end} onPageChange={setLeavePage} onPageSizeChange={setLeavePageSize} pageSizeOptions={PAGE_SIZE_OPTIONS} />
              </>
            )}
          </div>
        </>
      )}

      {/* Modals */}
      {showRegisterModal && (<UserRegistrationModal onClose={() => setShowRegisterModal(false)} onSuccess={handleRegisterSuccess} />)}
      {editingUser && (<UserEditModal user={editingUser} onClose={() => setEditingUser(null)} onSave={handleEditUser} isLoading={isLoading} />)}
      {deactivatingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setDeactivatingUser(null)}>
          <div className="bg-[var(--bg-card)] rounded-xl w-full max-w-md border border-[var(--border-color)]" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 bg-[var(--icon-red-bg)] rounded-xl flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-[var(--icon-red-text)]" /></div><div><h3 className="text-lg font-bold text-[var(--text-primary)]">Deactivate User</h3><p className="text-xs text-[var(--text-secondary)]">The user will lose access</p></div><button onClick={() => setDeactivatingUser(null)} className="ml-auto p-1.5 rounded-lg hover:bg-[var(--bg-main)]"><X className="w-4 h-4 text-[var(--text-secondary)]" /></button></div>
              <p className="text-sm text-[var(--text-primary)] mb-6">Deactivate <strong>{deactivatingUser.fullName}</strong>?</p>
              <div className="flex gap-3 pt-4 border-t border-[var(--border-color)]">
                <button onClick={() => setDeactivatingUser(null)} className="flex-1 px-5 py-2.5 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg text-sm font-medium">Cancel</button>
                <button onClick={handleDeactivateUser} disabled={isLoading} className="flex-1 px-5 py-2.5 bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] rounded-lg hover:bg-[var(--icon-red-text)] hover:text-white text-sm font-medium disabled:opacity-50">{isLoading ? 'Deactivating…' : 'Deactivate'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {resettingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setResettingUser(null)}>
          <div className="bg-[var(--bg-card)] rounded-xl w-full max-w-md border border-[var(--border-color)]" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 bg-[var(--icon-orange-bg)] rounded-xl flex items-center justify-center"><KeyRound className="w-5 h-5 text-[var(--icon-orange-text)]" /></div><div><h3 className="text-lg font-bold text-[var(--text-primary)]">Reset password</h3><p className="text-xs text-[var(--text-secondary)]">{resettingUser.fullName} · @{resettingUser.username}</p></div><button onClick={() => setResettingUser(null)} className="ml-auto p-1.5 rounded-lg hover:bg-[var(--bg-main)]"><X className="w-4 h-4 text-[var(--text-secondary)]" /></button></div>
              <label htmlFor="admin-new-password" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">New password</label>
              <input id="admin-new-password" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newPassword.length >= 12) handlePasswordReset(); }} className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-sm text-[var(--text-primary)]" />
              <p className="mt-2 text-xs text-[var(--text-secondary)]">At least 12 characters. The account is signed out on every machine, so give the password to the member of staff directly and have them choose their own afterwards.</p>
              <div className="flex gap-3 pt-4 mt-5 border-t border-[var(--border-color)]">
                <button onClick={() => setResettingUser(null)} className="flex-1 px-5 py-2.5 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg text-sm font-medium">Cancel</button>
                <button onClick={handlePasswordReset} disabled={isLoading || newPassword.length < 12} className="flex-1 px-5 py-2.5 bg-[var(--icon-orange-bg)] text-[var(--icon-orange-text)] rounded-lg hover:bg-[var(--icon-orange-text)] hover:text-white text-sm font-medium disabled:opacity-50">{isLoading ? 'Resetting…' : 'Reset password'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"><div className="bg-[var(--bg-card)] rounded-xl p-6 w-full max-w-md"><h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Approve Leave Request</h3><p className="text-sm text-[var(--text-secondary)] mb-4">Are you sure you want to approve this leave request?</p><div className="flex gap-3"><button onClick={handleApproveLeave} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Yes, Approve</button><button onClick={() => setShowApprovalModal(false)} className="flex-1 px-4 py-2 border border-[var(--border-color)] rounded-lg">Cancel</button></div></div></div>
      )}
      {showRejectionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"><div className="bg-[var(--bg-card)] rounded-xl p-6 w-full max-w-md"><h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Reject Leave Request</h3><p className="text-sm text-[var(--text-secondary)] mb-4">Please provide a reason for rejection:</p><textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} rows={3} className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm mb-4" placeholder="Reason for rejection..." /><div className="flex gap-3"><button onClick={handleRejectLeave} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Yes, Reject</button><button onClick={() => setShowRejectionModal(false)} className="flex-1 px-4 py-2 border border-[var(--border-color)] rounded-lg">Cancel</button></div></div></div>
      )}
    </div>
  );
}
