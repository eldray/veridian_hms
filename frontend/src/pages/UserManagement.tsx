// src/pages/UserManagement.tsx - Admin HR hub
import { useState, useEffect } from 'react';
import { useUserStore } from '../store/userStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import {
  Search, Plus, User as UserIcon, Shield, Edit, Ban, Hospital, Activity,
  RefreshCw, Users, Mail, Phone, X, CheckCircle, AlertTriangle, ArrowLeft,
  Stethoscope, Briefcase, DollarSign, FileText, Play, Download, Check,
  Clock,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import UserEditModal from '../components/UserEditModal';
import UserRegistrationModal from '../components/UserRegistrationModal'; // 🔧 FIXED
import type { User } from '../types';

const formatCedis = (v: number | string | undefined | null) => {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v ?? 0);
  return `₵${(isNaN(n) ? 0 : n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function UserManagement() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'directory' | 'payslips' | 'documents'>('directory');

  // Directory state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Modal state — three distinct modals, no confusion
  const [showRegisterModal, setShowRegisterModal] = useState(false);       // 🔧 FIXED: Add User
  const [editingUser, setEditingUser] = useState<User | null>(null);       // Edit existing
  const [deactivatingUser, setDeactivatingUser] = useState<User | null>(null);

  // Payslips state
  const now = new Date();
  const [payrollMonth, setPayrollMonth] = useState(now.getMonth() + 1);
  const [payrollYear, setPayrollYear] = useState(now.getFullYear());
  const [payrollRunning, setPayrollRunning] = useState(false);

  const {
    users, getAllUsers, updateUser, deactivateUser, isLoading,
    allPayslips, getAllPayslips,
    allDocuments, getAllDocuments,
    runPayroll,
  } = useUserStore();
  const { hasRole, user: currentUser } = useAuthStore();
  const { success, error: toastError } = useToast();

const canManageUsers = hasRole(['admin', 'super_admin', 'hr_officer']);

  useEffect(() => {
    if (canManageUsers) {
      getAllUsers();
    }
  }, [canManageUsers, getAllUsers]);

  useEffect(() => {
    if (activeTab === 'payslips') {
      getAllPayslips({ month: payrollMonth, year: payrollYear });
    } else if (activeTab === 'documents') {
      getAllDocuments();
    }
  }, [activeTab, payrollMonth, payrollYear]);

  const userList = Array.isArray(users) ? users : [];

  const filteredUsers = userList.filter((user: User) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      user.fullName?.toLowerCase().includes(q) ||
      user.username?.toLowerCase().includes(q) ||
      user.role?.toLowerCase().includes(q) ||
      user.email?.toLowerCase().includes(q);
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    let matchesStatus = true;
    if (filterStatus === 'active') matchesStatus = user.isActive === true;
    else if (filterStatus === 'inactive') matchesStatus = user.isActive === false;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalUsers = userList.length;
  const activeUsers = userList.filter((u) => u.isActive).length;
  const inactiveUsers = totalUsers - activeUsers;
  const rolesCount = new Set(userList.map((u) => u.role).filter(Boolean)).size;

  const uniqueRoles = Array.from(new Set(userList.map((u) => u.role).filter(Boolean))).sort();

  const getRoleBadge = (role: string) => {
    const map: Record<string, string> = {
      super_admin: 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]',
      admin: 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]',
      doctor: 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]',
      nurse: 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]',
      midwife: 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]',
      records: 'bg-[var(--icon-orange-bg)] text-[var(--icon-orange-text)]',
      lab_tech: 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]',
      pharmacist: 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]',
      accounts: 'bg-[var(--bg-main)] text-[var(--text-secondary)]',
      billing_officer: 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]',
      hr_officer: 'bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)]',
      store_keeper: 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]',
      sonographer: 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]',
      community_nurse: 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]',
    };
    return map[role] || 'bg-[var(--bg-main)] text-[var(--text-secondary)]';
  };

  const getRoleIcon = (role: string) => {
    if (role === 'doctor' || role === 'nurse' || role === 'midwife') return <Stethoscope className="w-3 h-3" />;
    if (role === 'admin' || role === 'super_admin') return <Shield className="w-3 h-3" />;
    return <Briefcase className="w-3 h-3" />;
  };

  // 🔧 FIXED: After creating or editing, refresh the list from the server.
  const handleRegisterSuccess = async () => {
    setShowRegisterModal(false);
    await getAllUsers();
  };

  const handleEditUser = async (userData: Partial<User>) => {
    if (!editingUser) return;
    try {
      await updateUser(editingUser.id, userData);
      setEditingUser(null);
      success('User Updated', `${userData.fullName || editingUser.fullName} updated`);
    } catch (err) {
      toastError('Update Failed', 'Could not update user');
    }
  };

  const handleDeactivateUser = async () => {
    if (!deactivatingUser) return;
    try {
      await deactivateUser(deactivatingUser.id);
      setDeactivatingUser(null);
      success('User Deactivated', `${deactivatingUser.fullName} deactivated`);
    } catch (err) {
      toastError('Deactivation Failed', 'Could not deactivate user');
    }
  };

const handleRunPayroll = async () => {
  if (!window.confirm(`Run payroll for ${payrollMonth}/${payrollYear}? This will generate or refresh payslips for every active staff member.`)) return;
  setPayrollRunning(true);
  try {
    const result = await runPayroll(payrollMonth, payrollYear);

    if (!Array.isArray(result) || result.length === 0) {
      toastError(
        'No staff to pay',
        'No active staff profiles were found. Open each user\'s HR tab and save it once to create a staff profile.',
      );
      return;
    }

    const ok = result.filter((r: any) => r.ok).length;
    const fail = result.filter((r: any) => !r.ok).length;
    success('Payroll complete', `${ok} payslips generated/refreshed${fail ? `, ${fail} failed` : ''}`);
    await getAllPayslips({ month: payrollMonth, year: payrollYear });
  } catch (err: any) {
    toastError('Payroll failed', err?.response?.data?.message || 'Could not run payroll');
  } finally {
    setPayrollRunning(false);
  }
};

  const handleTogglePaid = async (recordId: string, isPaid: boolean) => {
    try {
      const { updatePayslip } = useUserStore.getState();
      await updatePayslip(recordId, { isPaid });
      await getAllPayslips({ month: payrollMonth, year: payrollYear });
      success('Updated', isPaid ? 'Marked paid' : 'Marked pending');
    } catch (err: any) {
      toastError('Update failed', err?.response?.data?.message || 'Could not update payslip');
    }
  };

  if (!canManageUsers) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
        <div className="text-center bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-8 max-w-md w-full">
          <Shield className="w-16 h-16 text-[var(--icon-red-text)] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Access Denied</h2>
          <p className="text-[var(--text-secondary)] text-sm mb-6">Administrator privileges required.</p>
          <button onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg font-semibold text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-[var(--bg-main)]">
            <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Hospital className="w-5 h-5 text-[var(--icon-cyan-text)]" />
              HR &amp; User Management
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">Users, payroll, and staff documents</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => getAllUsers()} disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] text-sm text-[var(--text-primary)]">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          {/* 🔧 FIXED: Add User opens the registration modal, no navigation */}
          {activeTab === 'directory' && (
            <button
              onClick={() => setShowRegisterModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> Add User
            </button>
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
            <div>
              <p className="text-sm text-[var(--text-secondary)]">{s.label}</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{s.value}</p>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.bg}`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-1 flex gap-1 max-w-md">
        {[
          { id: 'directory', label: 'Directory', icon: Users },
          { id: 'payslips', label: 'Payslips', icon: DollarSign },
          { id: 'documents', label: 'Documents', icon: FileText },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === t.id
                  ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* DIRECTORY TAB */}
      {activeTab === 'directory' && (
        <>
          <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users..."
                  className="w-full pl-10 pr-4 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm"
                />
              </div>
              <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}
                className="px-3 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm min-w-[150px]">
                <option value="all">All Roles</option>
                {uniqueRoles.map((r) => (
                  <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                ))}
              </select>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm min-w-[130px]">
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
            {filteredUsers.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-16 h-16 text-[var(--text-tertiary)] mx-auto mb-4" />
                <p className="text-sm text-[var(--text-secondary)]">No users found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">User</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase hidden sm:table-cell">Contact</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Role</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase hidden lg:table-cell">Department</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-secondary)] uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {filteredUsers.map((user: User) => (
                      <tr key={user.id} className="hover:bg-[var(--bg-main)]">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-[var(--icon-cyan-bg)] rounded-lg flex items-center justify-center">
                              <UserIcon className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-[var(--text-primary)]">{user.fullName}</div>
                              <div className="text-xs text-[var(--text-tertiary)]">@{user.username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap hidden sm:table-cell">
                          {user.email && <div className="text-sm text-[var(--text-primary)]">{user.email}</div>}
                          {user.phone && <div className="text-xs text-[var(--text-secondary)]">{user.phone}</div>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getRoleBadge(user.role)}`}>
                            {getRoleIcon(user.role)}
                            {user.role?.replace(/_/g, ' ').toUpperCase()}
                          </span>
                          {user.seniority && <div className="text-xs font-medium text-[var(--text-secondary)] mt-1 capitalize">{user.seniority.toLowerCase()}</div>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-[var(--text-primary)] hidden lg:table-cell">
                          {user.department?.name || '—'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            user.isActive
                              ? 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]'
                              : 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]'
                          }`}>
                            <Activity className="w-3 h-3" />
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* 🔧 FIXED: clearer labels + tooltips */}
                            <button
                              onClick={() => navigate(`/dashboard/users/${user.id}`)}
                              className="p-1.5 text-[var(--icon-cyan-text)] border border-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-bg)] transition-all"
                              title="Open full profile (account + HR + payslips)"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingUser(user)}
                              className="p-1.5 text-[var(--icon-green-text)] border border-[var(--icon-green-text)] rounded-lg hover:bg-[var(--icon-green-bg)]"
                              title="Quick edit account"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            {user.isActive && user.id !== currentUser?.id && (
                              <button
                                onClick={() => setDeactivatingUser(user)}
                                className="p-1.5 text-[var(--icon-red-text)] border border-[var(--icon-red-text)] rounded-lg hover:bg-[var(--icon-red-bg)]"
                                title="Deactivate account"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* PAYSLIPS TAB */}
      {activeTab === 'payslips' && (
        <>
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Month</label>
              <select value={payrollMonth} onChange={(e) => setPayrollMonth(Number(e.target.value))}
                className="px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)]">
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{new Date(2000, m - 1, 1).toLocaleString('default', { month: 'long' })}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Year</label>
              <select value={payrollYear} onChange={(e) => setPayrollYear(Number(e.target.value))}
                className="px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)]">
                {[0, 1, 2].map(i => {
                  const y = new Date().getFullYear() - i;
                  return <option key={y} value={y}>{y}</option>;
                })}
              </select>
            </div>
            <button
              onClick={handleRunPayroll}
              disabled={payrollRunning}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white text-sm font-medium disabled:opacity-50 ml-auto"
            >
              <Play className={`w-4 h-4 ${payrollRunning ? 'animate-pulse' : ''}`} />
              {payrollRunning ? 'Running…' : `Run Payroll for ${payrollMonth}/${payrollYear}`}
            </button>
          </div>

          {allPayslips?.totals && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {[
                { label: 'Payslips', value: allPayslips.totals.count },
                { label: 'Total Gross', value: formatCedis(allPayslips.totals.gross + allPayslips.totals.deductions > 0 ? allPayslips.totals.gross : 0) },
                { label: 'Total Deductions', value: formatCedis(allPayslips.totals.deductions) },
                { label: 'Total Net', value: formatCedis(allPayslips.totals.net) },
                { label: 'Paid / Pending', value: `${allPayslips.totals.paid} / ${allPayslips.totals.pending}` },
              ].map((s) => (
                <div key={s.label} className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
                  <p className="text-xs text-[var(--text-secondary)]">{s.label}</p>
                  <p className="text-lg font-bold text-[var(--text-primary)] mt-1">{s.value}</p>
                </div>
              ))}
            </div>
          )}

          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
            {!allPayslips || allPayslips.records.length === 0 ? (
              <div className="p-12 text-center">
                <DollarSign className="w-16 h-16 text-[var(--text-tertiary)] mx-auto mb-4" />
                <p className="text-sm text-[var(--text-secondary)]">No payslips for {payrollMonth}/{payrollYear}.</p>
                <p className="text-xs text-[var(--text-tertiary)] mt-1">Click "Run Payroll" to generate them.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-[var(--text-secondary)]">Employee</th>
                      <th className="px-4 py-3 text-right font-semibold text-[var(--text-secondary)]">Base</th>
                      <th className="px-4 py-3 text-right font-semibold text-[var(--text-secondary)]">Allowances</th>
                      <th className="px-4 py-3 text-right font-semibold text-[var(--text-secondary)]">Deductions</th>
                      <th className="px-4 py-3 text-right font-semibold text-[var(--text-secondary)]">Net</th>
                      <th className="px-4 py-3 text-center font-semibold text-[var(--text-secondary)]">Status</th>
                      <th className="px-4 py-3 text-center font-semibold text-[var(--text-secondary)]">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {allPayslips.records.map((r) => (
                      <tr key={r.id} className="hover:bg-[var(--bg-main)]">
                        <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                          {r.staff?.user.fullName || '—'}
                          <div className="text-xs text-[var(--text-tertiary)]">
                            {r.staff?.user.role?.replace(/_/g, ' ')}
                            {r.staff?.user.department && ` · ${r.staff.user.department.name}`}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">{formatCedis(r.baseSalary)}</td>
                        <td className="px-4 py-3 text-right">{formatCedis(r.allowances)}</td>
                        <td className="px-4 py-3 text-right">{formatCedis(r.deductions)}</td>
                        <td className="px-4 py-3 text-right font-semibold">{formatCedis(r.netPay)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            r.isPaid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {r.isPaid ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            {r.isPaid ? 'Paid' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleTogglePaid(r.id, !r.isPaid)}
                            className="text-xs text-[var(--icon-cyan-text)] hover:underline"
                          >
                            Mark {r.isPaid ? 'Pending' : 'Paid'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* DOCUMENTS TAB */}
      {activeTab === 'documents' && (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
          {allDocuments.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-16 h-16 text-[var(--text-tertiary)] mx-auto mb-4" />
              <p className="text-sm text-[var(--text-secondary)]">No documents on file.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-[var(--text-secondary)]">Employee</th>
                    <th className="px-4 py-3 text-left font-semibold text-[var(--text-secondary)]">Document</th>
                    <th className="px-4 py-3 text-left font-semibold text-[var(--text-secondary)]">Expires</th>
                    <th className="px-4 py-3 text-center font-semibold text-[var(--text-secondary)]">Verified</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {allDocuments.map((doc: any) => (
                    <tr key={doc.id} className="hover:bg-[var(--bg-main)]">
                      <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{doc.staff?.user.fullName || '—'}</td>
                      <td className="px-4 py-3">{doc.title || doc.type}</td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">
                        {doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          doc.isVerified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {doc.isVerified ? 'Verified' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 🔧 FIXED: Register modal opens on Add User */}
      {showRegisterModal && (
        <UserRegistrationModal
          onClose={() => setShowRegisterModal(false)}
          onSuccess={handleRegisterSuccess}
        />
      )}

      {/* Quick Edit Modal (existing users only) */}
      {editingUser && (
        <UserEditModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={handleEditUser}
          isLoading={isLoading}
        />
      )}

      {/* Deactivate Modal */}
      {deactivatingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setDeactivatingUser(null)}>
          <div className="bg-[var(--bg-card)] rounded-xl w-full max-w-md border border-[var(--border-color)]" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[var(--icon-red-bg)] rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-[var(--icon-red-text)]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">Deactivate User</h3>
                  <p className="text-xs text-[var(--text-secondary)]">The user will lose access</p>
                </div>
                <button onClick={() => setDeactivatingUser(null)} className="ml-auto p-1.5 rounded-lg hover:bg-[var(--bg-main)]">
                  <X className="w-4 h-4 text-[var(--text-secondary)]" />
                </button>
              </div>
              <p className="text-sm text-[var(--text-primary)] mb-6">
                Deactivate <strong>{deactivatingUser.fullName}</strong>?
              </p>
              <div className="flex gap-3 pt-4 border-t border-[var(--border-color)]">
                <button onClick={() => setDeactivatingUser(null)}
                  className="flex-1 px-5 py-2.5 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg text-sm font-medium">
                  Cancel
                </button>
                <button onClick={handleDeactivateUser} disabled={isLoading}
                  className="flex-1 px-5 py-2.5 bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] rounded-lg hover:bg-[var(--icon-red-text)] hover:text-white text-sm font-medium disabled:opacity-50">
                  {isLoading ? 'Deactivating…' : 'Deactivate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}