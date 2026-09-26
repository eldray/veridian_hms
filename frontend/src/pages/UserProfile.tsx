// src/pages/UserProfile.tsx
import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useUserStore } from '../store/userStore';
import { useToast } from '../store/toastStore';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Save, User, Mail, Phone, IdCard, Stethoscope, Lock, Eye, EyeOff,
  Shield, Briefcase, Calendar, Activity, CheckCircle, AlertCircle, TrendingUp,
  GraduationCap, AtSign, Building2, Clock, CalendarPlus, FileText, X,
  Check, Ban, Download, DollarSign, Info,
} from 'lucide-react';

const SENIORITY_CONFIG: Record<string, { label: string; color: string; icon: any; level: number }> = {
  TRAINEE:   { label: 'Trainee',        color: 'bg-purple-100 text-purple-700 border-purple-200', icon: GraduationCap, level: 0 },
  JUNIOR:    { label: 'Junior Staff',   color: 'bg-blue-100 text-blue-700 border-blue-200',       icon: User,          level: 1 },
  SENIOR:    { label: 'Senior Staff',   color: 'bg-orange-100 text-orange-700 border-orange-200', icon: TrendingUp,    level: 2 },
  PRINCIPAL: { label: 'Principal',      color: 'bg-amber-100 text-amber-700 border-amber-200',    icon: Shield,        level: 3 },
};

const SHIFT_TYPES = [
  { value: 'morning',   label: 'Morning (8:00 AM - 2:00 PM)' },
  { value: 'afternoon', label: 'Afternoon (2:00 PM - 8:00 PM)' },
  { value: 'night',     label: 'Night (8:00 PM - 8:00 AM)' },
  { value: 'on_call',   label: 'On Call (24h)' },
];

const LEAVE_TYPES = [
  { value: 'annual',    label: 'Annual Leave',    color: 'blue'  },
  { value: 'sick',      label: 'Sick Leave',      color: 'green' },
  { value: 'maternity', label: 'Maternity Leave', color: 'pink'  },
  { value: 'paternity', label: 'Paternity Leave', color: 'blue'  },
  { value: 'emergency', label: 'Emergency Leave', color: 'red'   },
  { value: 'unpaid',    label: 'Unpaid Leave',    color: 'gray'  },
];

const formatCedis = (v: number | string | undefined | null) => {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v ?? 0);
  return `₵${(isNaN(n) ? 0 : n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function UserProfile() {
  const navigate = useNavigate();
  const { user: authUser, hasRole } = useAuthStore();
  const {
    getFullProfile, updateFullProfile, currentFullProfile,
    getShifts, shifts,
    getLeaves, leaves, createLeave, deleteLeave,
    getMyPayslips, myPayslips,
    getMyDocuments, myDocuments,
    isLoading,
  } = useUserStore();
  const { success, error } = useToast();

  const canManageShifts = hasRole(['admin', 'super_admin', 'hr_officer']);

  const [activeTab, setActiveTab] = useState<
    'profile' | 'hr' | 'payslips' | 'documents' | 'shifts' | 'leaves' | 'password'
  >('profile');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [profileForm, setProfileForm] = useState({ fullName: '', email: '', phone: '' });
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [newLeave, setNewLeave] = useState({
    leaveType: 'annual',
    startDate: '',
    endDate: '',
    reason: '',
  });

  useEffect(() => {
    if (authUser?.id) {
      getFullProfile(authUser.id).catch(() => {});
      getShifts({ userId: authUser.id }).catch(() => {});
      getLeaves({ userId: authUser.id }).catch(() => {});
      getMyPayslips().catch(() => {});
      getMyDocuments().catch(() => {});
    }
  }, [authUser?.id]);

  useEffect(() => {
    if (currentFullProfile) {
      setProfileForm({
        fullName: currentFullProfile.fullName || '',
        email: currentFullProfile.email || '',
        phone: currentFullProfile.phone || '',
      });
    }
  }, [currentFullProfile]);

  const userShifts = shifts.filter((s) => s.userId === authUser?.id);
  const userLeaves = leaves.filter((l) => l.userId === authUser?.id);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser?.id) return;
    setIsSaving(true);
    try {
      await updateFullProfile(authUser.id, { user: profileForm });
      success('Profile Updated', 'Your profile has been updated');
      await getFullProfile(authUser.id);
    } catch (err: any) {
      error('Update Failed', err?.response?.data?.message || 'Could not update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      error('Password Mismatch', 'New passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      error('Invalid Password', 'New password must be at least 6 characters');
      return;
    }
    try {
      const { changePassword } = useAuthStore.getState();
      await changePassword(passwordData.currentPassword, passwordData.newPassword);
      success('Password Changed', 'Your password has been updated');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      error('Password Change Failed', err?.response?.data?.message || 'Failed to change password');
    }
  };

  const handleCreateLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    const startDate = new Date(newLeave.startDate);
    const endDate = new Date(newLeave.endDate);
    if (startDate > endDate) {
      error('Invalid Dates', 'Start date cannot be after end date');
      return;
    }
    try {
      await createLeave({
        leaveType: newLeave.leaveType,
        startDate: newLeave.startDate,
        endDate: newLeave.endDate,
        reason: newLeave.reason || undefined,
      });
      success('Leave Submitted', 'Your leave request has been submitted');
      setShowLeaveModal(false);
      setNewLeave({ leaveType: 'annual', startDate: '', endDate: '', reason: '' });
      if (authUser?.id) await getLeaves({ userId: authUser.id });
    } catch (err: any) {
      error('Failed', err?.response?.data?.message || 'Could not submit leave request');
    }
  };

  const handleCancelLeave = async (leaveId: string) => {
    if (!window.confirm('Cancel this leave request?')) return;
    try {
      await deleteLeave(leaveId);
      success('Leave Cancelled', 'Your leave request has been cancelled');
      if (authUser?.id) await getLeaves({ userId: authUser.id });
    } catch (err: any) {
      error('Failed', err?.response?.data?.message || 'Could not cancel leave');
    }
  };

  const getLeaveStatusBadge = (status: string) => {
    const config: Record<string, { color: string; icon: any }> = {
      pending:   { color: 'bg-yellow-100 text-yellow-700', icon: Clock },
      approved:  { color: 'bg-green-100 text-green-700',  icon: Check },
      rejected:  { color: 'bg-red-100 text-red-700',      icon: Ban },
      cancelled: { color: 'bg-gray-100 text-gray-700',    icon: X },
    };
    const c = config[status] || config.pending;
    const Icon = c.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${c.color}`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getLeaveTypeLabel = (type: string) =>
    LEAVE_TYPES.find((t) => t.value === type)?.label || type;

  const getShiftTypeLabel = (type: string) =>
    SHIFT_TYPES.find((t) => t.value === type)?.label || type;

  const getRoleBadge = (role: string) => {
    const config: Record<string, { bg: string; text: string; icon: JSX.Element }> = {
      super_admin:  { bg: 'bg-red-100',    text: 'text-red-700',    icon: <Shield className="w-3 h-3" /> },
      admin:        { bg: 'bg-purple-100', text: 'text-purple-700', icon: <Shield className="w-3 h-3" /> },
      hr_officer:   { bg: 'bg-indigo-100', text: 'text-indigo-700', icon: <Shield className="w-3 h-3" /> },
      doctor:       { bg: 'bg-blue-100',   text: 'text-blue-700',   icon: <Stethoscope className="w-3 h-3" /> },
      nurse:        { bg: 'bg-green-100',  text: 'text-green-700',  icon: <Activity className="w-3 h-3" /> },
      midwife:      { bg: 'bg-pink-100',   text: 'text-pink-700',   icon: <Activity className="w-3 h-3" /> },
      lab_tech:     { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: <Briefcase className="w-3 h-3" /> },
      pharmacist:   { bg: 'bg-cyan-100',   text: 'text-cyan-700',   icon: <Briefcase className="w-3 h-3" /> },
      accounts:     { bg: 'bg-indigo-100', text: 'text-indigo-700', icon: <Briefcase className="w-3 h-3" /> },
      records:      { bg: 'bg-gray-100',   text: 'text-gray-700',   icon: <Briefcase className="w-3 h-3" /> },
      sonographer:  { bg: 'bg-orange-100', text: 'text-orange-700', icon: <Briefcase className="w-3 h-3" /> },
    };
    const c = config[role] || config.records;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
        {c.icon}
        {role?.replace(/_/g, ' ').toUpperCase()}
      </span>
    );
  };

  const getSeniorityBadge = (seniority: string) => {
    const config = SENIORITY_CONFIG[seniority] || SENIORITY_CONFIG.JUNIOR;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  if (!authUser) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
        <div className="text-center bg-[var(--bg-card)] p-8 rounded-xl shadow-sm border border-[var(--border-color)]">
          <User className="w-12 h-12 text-[var(--text-secondary)] mx-auto mb-3" />
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Please Log In</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-6">You need to be logged in to view your profile.</p>
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const p = currentFullProfile;
  const sp = p?.staffProfile;
  const seniorityValue = p?.seniority || authUser.seniority || 'JUNIOR';

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-[var(--bg-card)] rounded-lg transition-all duration-200 border border-[var(--border-color)]"
          >
            <ChevronLeft className="w-5 h-5 text-[var(--text-primary)]" />
          </button>
          <div className="w-10 h-10 bg-[var(--icon-cyan-bg)] rounded-xl flex items-center justify-center">
            <User className="w-5 h-5 text-[var(--icon-cyan-text)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">My Profile</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
              Manage your account, shifts, and leave requests
            </p>
          </div>
        </div>
      </div>

      {/* Overview card */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
        <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--icon-cyan-bg)] to-[var(--icon-cyan-text)] flex items-center justify-center shadow-sm">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-[var(--text-primary)] text-lg">
                  {p?.fullName || authUser.fullName}
                </h3>
                {getRoleBadge(p?.role || authUser.role)}
                {getSeniorityBadge(seniorityValue)}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                  <AtSign className="w-3 h-3" /> Username:
                </span>
                <span className="text-xs font-mono bg-[var(--bg-main)] px-2 py-0.5 rounded text-[var(--text-primary)]">
                  {p?.username || authUser.username}
                </span>
                {sp?.employeeId && (
                  <>
                    <span className="text-xs text-[var(--text-secondary)]">•</span>
                    <span className="text-xs font-mono bg-[var(--bg-main)] px-2 py-0.5 rounded text-[var(--text-primary)]">
                      {sp.employeeId}
                    </span>
                  </>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)] mt-1">
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3" /> {p?.email || authUser.email || 'No email set'}
                </span>
                {(p?.phone || authUser.phone) && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {p?.phone || authUser.phone}
                    </span>
                  </>
                )}
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> {p?.department?.name || authUser.department?.name || 'No department'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-green-50 px-3 py-1 rounded-full">
              <span className="text-xs text-green-700 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Active Account
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
        <div className="border-b border-[var(--border-color)] px-4 overflow-x-auto">
          <nav className="flex flex-nowrap gap-1 min-w-max">
            {[
              { id: 'profile',   label: 'Profile',        icon: User },
              { id: 'hr',        label: 'HR Details',     icon: Briefcase },
              { id: 'payslips',  label: 'My Payslips',    icon: DollarSign },
              { id: 'documents', label: 'My Documents',   icon: FileText },
              { id: 'shifts',    label: 'My Shifts',      icon: Clock },
              { id: 'leaves',    label: 'Leave Requests', icon: FileText },
              { id: 'password',  label: 'Security',       icon: Lock },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                    activeTab === t.id
                      ? 'border-[var(--icon-cyan-text)] text-[var(--icon-cyan-text)]'
                      : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Username (read-only)</label>
                  <div className="px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-secondary)] text-sm font-mono">
                    {p?.username || authUser.username}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                    <User className="w-3.5 h-3.5 inline mr-1 text-[var(--icon-cyan-text)]" />
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={profileForm.fullName}
                    onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-transparent text-[var(--text-primary)] text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                    <Mail className="w-3.5 h-3.5 inline mr-1 text-green-500" /> Email Address
                  </label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-transparent text-[var(--text-primary)] text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                    <Phone className="w-3.5 h-3.5 inline mr-1 text-purple-500" /> Phone Number
                  </label>
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-transparent text-[var(--text-primary)] text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Role (read-only)</label>
                  <div className="px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-secondary)] text-sm capitalize">
                    {(p?.role || authUser.role || '').replace(/_/g, ' ')}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Seniority (read-only)</label>
                  <div className="px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-secondary)] text-sm">
                    {SENIORITY_CONFIG[seniorityValue]?.label || seniorityValue}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Department (read-only)</label>
                  <div className="px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-secondary)] text-sm">
                    {p?.department?.name || '—'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                    <IdCard className="w-3.5 h-3.5 inline mr-1" /> License Number (read-only)
                  </label>
                  <div className="px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-secondary)] text-sm font-mono">
                    {p?.licenseNumber || '—'}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                    <Stethoscope className="w-3.5 h-3.5 inline mr-1" /> Specialization (read-only)
                  </label>
                  <div className="px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-secondary)] text-sm">
                    {p?.specialization || '—'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-[var(--border-color)]">
                <button
                  type="submit"
                  disabled={isLoading || isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isLoading || isSaving ? 'Updating…' : 'Update Profile'}
                </button>
                <p className="text-xs text-[var(--text-tertiary)]">
                  Role, seniority, department, license, and specialization are managed by HR.
                </p>
              </div>
            </form>
          )}

          {/* HR TAB */}
          {activeTab === 'hr' && (
            <div className="space-y-4">
              {!sp ? (
                <div className="text-center py-12 bg-[var(--bg-main)] rounded-lg border border-[var(--border-color)]">
                  <Briefcase className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
                  <p className="text-sm text-[var(--text-secondary)]">No HR record found for this account.</p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">Contact HR if this is unexpected.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {[
                    ['Employee ID',         sp.employeeId],
                    ['Employment Type',     sp.employmentType?.replace(/_/g, ' ')],
                    ['Date Joined',         sp.dateJoined ? new Date(sp.dateJoined).toLocaleDateString() : '—'],
                    ['Job Grade',           sp.jobGrade ? `${sp.jobGrade.name} (${sp.jobGrade.code})` : '—'],
                    ['Salary Step',         sp.salaryStep ? `Step ${sp.salaryStep.stepNumber}` : '—'],
                    ['Base Salary',         sp.salaryStep ? formatCedis(sp.salaryStep.amount) : '—'],
                    ['Next of Kin',         sp.nextOfKinName || '—'],
                    ['Next of Kin Phone',   sp.nextOfKinPhone || '—'],
                  ].map(([label, value]) => (
                    <div key={label as string}>
                      <label className="block text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-1">
                        {label}
                      </label>
                      <div className="px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)]">
                        {value || '—'}
                      </div>
                    </div>
                  ))}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-1">
                      Bio
                    </label>
                    <div className="px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] whitespace-pre-wrap min-h-[60px]">
                      {sp.bio || '—'}
                    </div>
                  </div>
                </div>
              )}
              <p className="text-xs text-[var(--text-tertiary)] pt-2 border-t border-[var(--border-color)]">
                HR details are managed by administration. Contact HR to request changes.
              </p>
            </div>
          )}

          {/* PAYSLIPS TAB */}
          {activeTab === 'payslips' && (
            <div className="space-y-4">
              {myPayslips.length === 0 ? (
                <div className="text-center py-12 bg-[var(--bg-main)] rounded-lg border border-[var(--border-color)]">
                  <DollarSign className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
                  <p className="text-sm text-[var(--text-secondary)]">No payslips yet.</p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">
                    Payslips appear here once HR runs payroll.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-[var(--text-secondary)]">Month</th>
                        <th className="px-4 py-3 text-right font-semibold text-[var(--text-secondary)]">Base</th>
                        <th className="px-4 py-3 text-right font-semibold text-[var(--text-secondary)]">Allowances</th>
                        <th className="px-4 py-3 text-right font-semibold text-[var(--text-secondary)]">Deductions</th>
                        <th className="px-4 py-3 text-right font-semibold text-[var(--text-secondary)]">Net Pay</th>
                        <th className="px-4 py-3 text-center font-semibold text-[var(--text-secondary)]">Status</th>
                        <th className="px-4 py-3 text-center font-semibold text-[var(--text-secondary)]">Payslip</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)]">
                      {myPayslips.map((r) => (
                        <tr key={r.id} className="hover:bg-[var(--bg-main)]">
                          <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                            {String(r.month).padStart(2, '0')}/{r.year}
                          </td>
                          <td className="px-4 py-3 text-right">{formatCedis(r.baseSalary)}</td>
                          <td className="px-4 py-3 text-right">{formatCedis(r.allowances)}</td>
                          <td className="px-4 py-3 text-right">{formatCedis(r.deductions)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-[var(--text-primary)]">
                            {formatCedis(r.netPay)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                r.isPaid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                              }`}
                            >
                              {r.isPaid ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                              {r.isPaid ? 'Paid' : 'Pending'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {r.payslipUrl ? (
                              <a
                                href={r.payslipUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[var(--icon-cyan-text)] hover:underline text-xs inline-flex items-center gap-1"
                              >
                                <Download className="w-3 h-3" /> Download
                              </a>
                            ) : (
                              <span className="text-[var(--text-tertiary)] text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* DOCUMENTS TAB */}
          {activeTab === 'documents' && (
            <div className="space-y-3">
              {myDocuments.length === 0 ? (
                <div className="text-center py-12 bg-[var(--bg-main)] rounded-lg border border-[var(--border-color)]">
                  <FileText className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
                  <p className="text-sm text-[var(--text-secondary)]">No documents on file.</p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">
                    Licenses and certificates uploaded by HR will appear here.
                  </p>
                </div>
              ) : (
                myDocuments.map((doc: any) => (
                  <div
                    key={doc.id}
                    className="flex justify-between items-center p-3 bg-[var(--bg-main)] rounded-lg border border-[var(--border-color)]"
                  >
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">{doc.title || doc.type}</p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {doc.expiryDate
                          ? `Expires: ${new Date(doc.expiryDate).toLocaleDateString()}`
                          : 'No expiry'}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        doc.isVerified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {doc.isVerified ? 'Verified' : 'Pending'}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* SHIFTS TAB — read-only */}
          {activeTab === 'shifts' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">My Shifts</h3>
                  <p className="text-sm text-[var(--text-secondary)]">Your scheduled shifts</p>
                </div>
                {canManageShifts && (
                  <span className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
                    <Info className="w-3 h-3" />
                    Manage shifts from the Shifts page
                  </span>
                )}
              </div>

              <div className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg p-3 flex items-start gap-2">
                <Info className="w-4 h-4 text-[var(--icon-cyan-text)] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-[var(--text-secondary)]">
                  Shifts are scheduled by hospital administration. Contact your supervisor or HR if you need a change.
                </p>
              </div>

              <div className="space-y-3">
                {userShifts.length === 0 ? (
                  <div className="text-center py-8 bg-[var(--bg-main)] rounded-lg border border-[var(--border-color)]">
                    <Clock className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
                    <p className="text-[var(--text-secondary)]">No shifts scheduled yet</p>
                  </div>
                ) : (
                  userShifts.map((shift) => (
                    <div
                      key={shift.id}
                      className="bg-[var(--bg-main)] rounded-lg p-4 border border-[var(--border-color)]"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                shift.shiftType === 'night'
                                  ? 'bg-purple-100 text-purple-700'
                                  : shift.shiftType === 'morning'
                                  ? 'bg-green-100 text-green-700'
                                  : shift.shiftType === 'afternoon'
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              <Clock className="w-3 h-3" />
                              {getShiftTypeLabel(shift.shiftType)}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm text-[var(--text-primary)]">
                              <Calendar className="w-4 h-4 inline mr-2 text-[var(--text-secondary)]" />
                              {new Date(shift.shiftDate).toLocaleDateString('en-GB', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </p>
                            <p className="text-sm text-[var(--text-primary)]">
                              <Clock className="w-4 h-4 inline mr-2 text-[var(--text-secondary)]" />
                              {new Date(shift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                              -{' '}
                              {new Date(shift.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            {shift.notes && (
                              <p className="text-sm text-[var(--text-secondary)] mt-2">{shift.notes}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* LEAVES TAB */}
          {activeTab === 'leaves' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">Leave Requests</h3>
                  <p className="text-sm text-[var(--text-secondary)]">Submit and track your leave requests</p>
                </div>
                <button
                  onClick={() => setShowLeaveModal(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium"
                >
                  <CalendarPlus className="w-4 h-4" /> Request Leave
                </button>
              </div>

              <div className="space-y-3">
                {userLeaves.length === 0 ? (
                  <div className="text-center py-8 bg-[var(--bg-main)] rounded-lg border border-[var(--border-color)]">
                    <FileText className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
                    <p className="text-[var(--text-secondary)]">No leave requests yet</p>
                    <button
                      onClick={() => setShowLeaveModal(true)}
                      className="mt-3 text-sm text-[var(--icon-cyan-text)] hover:underline"
                    >
                      Request leave
                    </button>
                  </div>
                ) : (
                  userLeaves.map((leave) => (
                    <div
                      key={leave.id}
                      className="bg-[var(--bg-main)] rounded-lg p-4 border border-[var(--border-color)]"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                leave.leaveType === 'annual'
                                  ? 'bg-blue-100 text-blue-700'
                                  : leave.leaveType === 'sick'
                                  ? 'bg-green-100 text-green-700'
                                  : leave.leaveType === 'maternity'
                                  ? 'bg-pink-100 text-pink-700'
                                  : leave.leaveType === 'paternity'
                                  ? 'bg-purple-100 text-purple-700'
                                  : leave.leaveType === 'emergency'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {getLeaveTypeLabel(leave.leaveType)}
                            </span>
                            {getLeaveStatusBadge(leave.status)}
                          </div>
                          <div className="space-y-1 mt-2">
                            <p className="text-sm text-[var(--text-primary)]">
                              <Calendar className="w-4 h-4 inline mr-2 text-[var(--text-secondary)]" />
                              {new Date(leave.startDate).toLocaleDateString()} -{' '}
                              {new Date(leave.endDate).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-[var(--text-primary)]">
                              <Clock className="w-4 h-4 inline mr-2 text-[var(--text-secondary)]" />
                              Total: {leave.totalDays} day{leave.totalDays !== 1 ? 's' : ''}
                            </p>
                            {leave.reason && (
                              <p className="text-sm text-[var(--text-secondary)] mt-2">
                                <FileText className="w-4 h-4 inline mr-2" />
                                {leave.reason}
                              </p>
                            )}
                            {(leave.approver || leave.approvedBy) && leave.status === 'approved' && (
                              <p className="text-xs text-green-600 mt-2">
                                Approved by: {(leave.approver || leave.approvedBy)?.fullName}
                              </p>
                            )}
                            {leave.status === 'rejected' && (
                              <p className="text-xs text-red-600 mt-2">Request was rejected</p>
                            )}
                          </div>
                        </div>
                        {leave.status === 'pending' && (
                          <button
                            onClick={() => handleCancelLeave(leave.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Cancel request"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* PASSWORD TAB */}
          {activeTab === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-5 max-w-md">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                    Current Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-transparent text-[var(--text-primary)] text-sm pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                    New Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-transparent text-[var(--text-primary)] text-sm pr-10"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                    Confirm New Password *
                  </label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-transparent text-[var(--text-primary)] text-sm"
                    required
                  />
                  {passwordData.confirmPassword &&
                    passwordData.newPassword !== passwordData.confirmPassword && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Passwords do not match
                      </p>
                    )}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-[var(--border-color)]">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium disabled:opacity-50"
                >
                  <Lock className="w-4 h-4" />
                  {isLoading ? 'Changing…' : 'Change Password'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* LEAVE MODAL */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-xl p-6 w-full max-w-md border border-[var(--border-color)]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">Request Leave</h3>
                <p className="text-sm text-[var(--text-secondary)]">Submit a leave request for approval</p>
              </div>
              <button
                onClick={() => setShowLeaveModal(false)}
                className="p-1 hover:bg-[var(--bg-main)] rounded-lg"
              >
                <X className="w-5 h-5 text-[var(--text-secondary)]" />
              </button>
            </div>
            <form onSubmit={handleCreateLeave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Leave Type *</label>
                <select
                  value={newLeave.leaveType}
                  onChange={(e) => setNewLeave({ ...newLeave, leaveType: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-sm"
                  required
                >
                  {LEAVE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Start Date *</label>
                  <input
                    type="date"
                    value={newLeave.startDate}
                    onChange={(e) => setNewLeave({ ...newLeave, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">End Date *</label>
                  <input
                    type="date"
                    value={newLeave.endDate}
                    onChange={(e) => setNewLeave({ ...newLeave, endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-sm"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Reason (Optional)</label>
                <textarea
                  value={newLeave.reason}
                  onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-sm resize-none"
                  placeholder="Please provide a reason for your leave request…"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white text-sm font-medium"
                >
                  Submit Request
                </button>
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="px-4 py-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}