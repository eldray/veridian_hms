// src/pages/UserProfile.tsx - COMPLETE WITH SHIFTS AND LEAVES
import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useUserStore } from '../store/userStore';  // ✅ Add UserStore for shifts/leaves
import { useToast } from '../store/toastStore';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Save,
  User,
  Mail,
  Phone,
  IdCard,
  Stethoscope,
  Lock,
  Eye,
  EyeOff,
  Shield,
  Briefcase,
  Calendar,
  Activity,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  GraduationCap,
  AtSign,
  Clock,
  CalendarPlus,
  FileText,
  Plus,
  X,
  Check,
  Ban,
  MoreVertical,
} from 'lucide-react';

const SENIORITY_CONFIG: Record<string, { label: string; color: string; icon: any; level: number }> = {
  TRAINEE: { 
    label: 'Trainee', 
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    icon: GraduationCap,
    level: 0
  },
  JUNIOR: { 
    label: 'Junior Staff', 
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: User,
    level: 1
  },
  SENIOR: { 
    label: 'Senior Staff', 
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    icon: TrendingUp,
    level: 2
  },
  PRINCIPAL: { 
    label: 'Principal', 
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: Shield,
    level: 3
  }
};

const SHIFT_TYPES = [
  { value: 'morning', label: 'Morning (8:00 AM - 2:00 PM)', icon: Clock },
  { value: 'afternoon', label: 'Afternoon (2:00 PM - 8:00 PM)', icon: Clock },
  { value: 'night', label: 'Night (8:00 PM - 8:00 AM)', icon: Clock },
  { value: 'on_call', label: 'On Call (24h)', icon: Clock },
];

const LEAVE_TYPES = [
  { value: 'annual', label: 'Annual Leave', color: 'blue' },
  { value: 'sick', label: 'Sick Leave', color: 'green' },
  { value: 'maternity', label: 'Maternity Leave', color: 'pink' },
  { value: 'paternity', label: 'Paternity Leave', color: 'blue' },
  { value: 'emergency', label: 'Emergency Leave', color: 'red' },
  { value: 'unpaid', label: 'Unpaid Leave', color: 'gray' },
];

export default function UserProfile() {
  const navigate = useNavigate();
  const { user: authUser } = useAuthStore();
  const { 
    updateUser, 
    isLoading, 
    getAllUsers, 
    users,
    // Shifts
    getShifts,
    shifts,
    createShift,
    deleteShift,
    // Leaves
    getLeaves,
    leaves,
    createLeave,
    updateLeave,
    deleteLeave,
  } = useUserStore();
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'shifts' | 'leaves'>('profile');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Shift modal state
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [newShift, setNewShift] = useState({
    shiftDate: '',
    startTime: '08:00',
    endTime: '14:00',
    shiftType: 'morning' as const,
    notes: '',
  });
  
  // Leave modal state
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [newLeave, setNewLeave] = useState({
    leaveType: 'annual',
    startDate: '',
    endDate: '',
    reason: '',
  });

  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    phone: '',
    licenseNumber: '',
    specialization: '',
    seniority: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (authUser) {
      setProfileData({
        fullName: authUser.fullName || '',
        email: authUser.email || '',
        phone: authUser.phone || '',
        licenseNumber: authUser.licenseNumber || '',
        specialization: authUser.specialization || '',
        seniority: authUser.seniority || 'JUNIOR'
      });
      
      // Load user's shifts and leaves
      if (authUser.id) {
        loadShifts();
        loadLeaves();
      }
    }
  }, [authUser]);

  const loadShifts = async () => {
    try {
      await getShifts({ userId: authUser?.id });
    } catch (err) {
      console.error('Failed to load shifts:', err);
    }
  };

  const loadLeaves = async () => {
    try {
      await getLeaves({ userId: authUser?.id });
    } catch (err) {
      console.error('Failed to load leaves:', err);
    }
  };

  // Filter user's own shifts and leaves
  const userShifts = shifts.filter(shift => shift.userId === authUser?.id);
  const userLeaves = leaves.filter(leave => leave.userId === authUser?.id);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
  
    try {
      await updateUser(authUser!.id, {
        fullName: profileData.fullName,
        email: profileData.email,
        phone: profileData.phone,
        licenseNumber: profileData.licenseNumber,
        specialization: profileData.specialization,
        seniority: profileData.seniority
      });
      
      success('Profile Updated', 'Your profile has been updated successfully');
      
      setTimeout(() => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }, 1500);
      
    } catch (err: any) {
      console.error('❌ Profile update failed:', err);
      error('Update Failed', err.response?.data?.message || 'Failed to update profile');
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
      success('Password Changed', 'Your password has been updated successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to change password';
      error('Password Change Failed', errorMessage);
    }
  };

  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createShift({
        userId: authUser!.id,
        shiftDate: newShift.shiftDate,
        startTime: newShift.startTime,
        endTime: newShift.endTime,
        shiftType: newShift.shiftType,
        notes: newShift.notes || undefined,
      });
      success('Shift Created', 'Your shift has been added successfully');
      setShowShiftModal(false);
      setNewShift({ shiftDate: '', startTime: '08:00', endTime: '14:00', shiftType: 'morning', notes: '' });
      await loadShifts();
    } catch (err: any) {
      error('Failed', err.response?.data?.message || 'Could not create shift');
    }
  };

  const handleCreateLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const startDate = new Date(newLeave.startDate);
    const endDate = new Date(newLeave.endDate);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    if (startDate > endDate) {
      error('Invalid Dates', 'Start date cannot be after end date');
      return;
    }
    
    try {
      await createLeave({
        leaveType: newLeave.leaveType as any,
        startDate: newLeave.startDate,
        endDate: newLeave.endDate,
        reason: newLeave.reason || undefined,
      });
      success('Leave Request Submitted', 'Your leave request has been submitted for approval');
      setShowLeaveModal(false);
      setNewLeave({ leaveType: 'annual', startDate: '', endDate: '', reason: '' });
      await loadLeaves();
    } catch (err: any) {
      error('Failed', err.response?.data?.message || 'Could not submit leave request');
    }
  };

  const handleCancelLeave = async (leaveId: string) => {
    try {
      await deleteLeave(leaveId);
      success('Leave Cancelled', 'Your leave request has been cancelled');
      await loadLeaves();
    } catch (err: any) {
      error('Failed', err.response?.data?.message || 'Could not cancel leave request');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const getLeaveStatusBadge = (status: string) => {
    const config: Record<string, { color: string; icon: any }> = {
      pending: { color: 'bg-yellow-100 text-yellow-700', icon: Clock },
      approved: { color: 'bg-green-100 text-green-700', icon: Check },
      rejected: { color: 'bg-red-100 text-red-700', icon: Ban },
      cancelled: { color: 'bg-gray-100 text-gray-700', icon: X },
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

  const getLeaveTypeLabel = (type: string) => {
    const found = LEAVE_TYPES.find(t => t.value === type);
    return found?.label || type;
  };

  const getShiftTypeLabel = (type: string) => {
    const found = SHIFT_TYPES.find(t => t.value === type);
    return found?.label || type;
  };

  const medicalRoles = ['doctor', 'nurse', 'midwife'];
  const isMedicalStaff = authUser && medicalRoles.includes(authUser.role);
  const isDoctor = authUser?.role === 'doctor';

  const getRoleBadge = (role: string) => {
    const config: Record<string, { bg: string; text: string; icon: JSX.Element }> = {
      admin: { bg: 'bg-purple-100', text: 'text-purple-700', icon: <Shield className="w-3 h-3" /> },
      doctor: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <Stethoscope className="w-3 h-3" /> },
      nurse: { bg: 'bg-green-100', text: 'text-green-700', icon: <Activity className="w-3 h-3" /> },
      midwife: { bg: 'bg-pink-100', text: 'text-pink-700', icon: <Activity className="w-3 h-3" /> },
      lab_tech: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: <Briefcase className="w-3 h-3" /> },
      pharmacist: { bg: 'bg-cyan-100', text: 'text-cyan-700', icon: <Briefcase className="w-3 h-3" /> },
      accounts: { bg: 'bg-indigo-100', text: 'text-indigo-700', icon: <Briefcase className="w-3 h-3" /> },
      records: { bg: 'bg-gray-100', text: 'text-gray-700', icon: <Briefcase className="w-3 h-3" /> },
      sonographer: { bg: 'bg-orange-100', text: 'text-orange-700', icon: <Briefcase className="w-3 h-3" /> },
    };
    const c = config[role] || config.records;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
        {c.icon}
        {role?.replace('_', ' ').toUpperCase()}
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
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">Manage your account, shifts, and leave requests</p>
          </div>
        </div>
      </div>

      {/* Profile Overview Card */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
        <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--icon-cyan-bg)] to-[var(--icon-cyan-text)] flex items-center justify-center shadow-sm">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-[var(--text-primary)] text-lg">
                  {authUser.fullName}
                </h3>
                {getRoleBadge(authUser.role)}
                {getSeniorityBadge(profileData.seniority || authUser.seniority || 'JUNIOR')}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                  <AtSign className="w-3 h-3" />
                  Username:
                </span>
                <span className="text-xs font-mono bg-[var(--bg-main)] px-2 py-0.5 rounded text-[var(--text-primary)]">
                  {authUser.username}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)] mt-1">
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {authUser.email || 'No email set'}
                </span>
                {authUser.phone && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {authUser.phone}
                    </span>
                  </>
                )}
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Member since {new Date(authUser.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-green-50 px-3 py-1 rounded-full">
              <span className="text-xs text-green-700 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Active Account
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
        <div className="border-b border-[var(--border-color)] px-4">
          <nav className="flex flex-wrap gap-1">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-all ${
                activeTab === 'profile'
                  ? 'border-[var(--icon-cyan-text)] text-[var(--icon-cyan-text)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <User className="w-4 h-4" />
              Profile
            </button>
            <button
              onClick={() => setActiveTab('shifts')}
              className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-all ${
                activeTab === 'shifts'
                  ? 'border-[var(--icon-cyan-text)] text-[var(--icon-cyan-text)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Clock className="w-4 h-4" />
              My Shifts
            </button>
            <button
              onClick={() => setActiveTab('leaves')}
              className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-all ${
                activeTab === 'leaves'
                  ? 'border-[var(--icon-cyan-text)] text-[var(--icon-cyan-text)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <FileText className="w-4 h-4" />
              Leave Requests
            </button>
            <button
              onClick={() => setActiveTab('password')}
              className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-all ${
                activeTab === 'password'
                  ? 'border-[var(--icon-cyan-text)] text-[var(--icon-cyan-text)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Lock className="w-4 h-4" />
              Security
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Profile form fields - same as before */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                    <AtSign className="w-3.5 h-3.5 inline mr-1 text-gray-500" />
                    Username
                  </label>
                  <div className="px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-sm font-mono">
                    {authUser.username}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                    <User className="w-3.5 h-3.5 inline mr-1 text-[var(--icon-cyan-text)]" />
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={profileData.fullName}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-transparent text-[var(--text-primary)] text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                    <Mail className="w-3.5 h-3.5 inline mr-1 text-green-500" />
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={profileData.email}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-transparent text-[var(--text-primary)] text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                    <Phone className="w-3.5 h-3.5 inline mr-1 text-purple-500" />
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={profileData.phone}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-transparent text-[var(--text-primary)] text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                    <TrendingUp className="w-3.5 h-3.5 inline mr-1 text-amber-500" />
                    Seniority Level *
                  </label>
                  <select
                    name="seniority"
                    value={profileData.seniority}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] text-[var(--text-primary)] text-sm"
                  >
                    <option value="TRAINEE">Trainee</option>
                    <option value="JUNIOR">Junior Staff</option>
                    <option value="SENIOR">Senior Staff</option>
                    <option value="PRINCIPAL">Principal</option>
                  </select>
                </div>

                {isMedicalStaff && (
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                      <IdCard className="w-3.5 h-3.5 inline mr-1 text-yellow-500" />
                      License/PIN Number *
                    </label>
                    <input
                      type="text"
                      name="licenseNumber"
                      value={profileData.licenseNumber}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-transparent text-[var(--text-primary)] text-sm"
                      required
                    />
                  </div>
                )}

                {isDoctor && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                      <Stethoscope className="w-3.5 h-3.5 inline mr-1 text-red-500" />
                      Specialization *
                    </label>
                    <input
                      type="text"
                      name="specialization"
                      value={profileData.specialization}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-transparent text-[var(--text-primary)] text-sm"
                      placeholder="e.g., Pediatrics, Surgery, Cardiology"
                      required
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-[var(--border-color)]">
                <button
                  type="submit"
                  disabled={isLoading || isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {(isLoading || isSaving) ? 'Updating...' : 'Update Profile'}
                </button>
              </div>
            </form>
          )}

          {/* Shifts Tab */}
          {activeTab === 'shifts' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">My Shifts</h3>
                  <p className="text-sm text-[var(--text-secondary)]">View and manage your scheduled shifts</p>
                </div>
                <button
                  onClick={() => setShowShiftModal(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Request Shift
                </button>
              </div>

              <div className="space-y-3">
                {userShifts.length === 0 ? (
                  <div className="text-center py-8 bg-[var(--bg-main)] rounded-lg border border-[var(--border-color)]">
                    <Clock className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
                    <p className="text-[var(--text-secondary)]">No shifts scheduled yet</p>
                    <button
                      onClick={() => setShowShiftModal(true)}
                      className="mt-3 text-sm text-[var(--icon-cyan-text)] hover:underline"
                    >
                      Request a shift
                    </button>
                  </div>
                ) : (
                  userShifts.map((shift) => (
                    <div key={shift.id} className="bg-[var(--bg-main)] rounded-lg p-4 border border-[var(--border-color)]">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                              shift.shiftType === 'night' ? 'bg-purple-100 text-purple-700' :
                              shift.shiftType === 'morning' ? 'bg-green-100 text-green-700' :
                              shift.shiftType === 'afternoon' ? 'bg-orange-100 text-orange-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
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
                                day: 'numeric' 
                              })}
                            </p>
                            <p className="text-sm text-[var(--text-primary)]">
                              <Clock className="w-4 h-4 inline mr-2 text-[var(--text-secondary)]" />
                              {new Date(shift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(shift.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            {shift.notes && (
                              <p className="text-sm text-[var(--text-secondary)] mt-2">{shift.notes}</p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => deleteShift(shift.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Leaves Tab */}
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
                  <CalendarPlus className="w-4 h-4" />
                  Request Leave
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
                    <div key={leave.id} className="bg-[var(--bg-main)] rounded-lg p-4 border border-[var(--border-color)]">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                              leave.leaveType === 'annual' ? 'bg-blue-100 text-blue-700' :
                              leave.leaveType === 'sick' ? 'bg-green-100 text-green-700' :
                              leave.leaveType === 'maternity' ? 'bg-pink-100 text-pink-700' :
                              leave.leaveType === 'paternity' ? 'bg-purple-100 text-purple-700' :
                              leave.leaveType === 'emergency' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {getLeaveTypeLabel(leave.leaveType)}
                            </span>
                            {getLeaveStatusBadge(leave.status)}
                          </div>
                          <div className="space-y-1 mt-2">
                            <p className="text-sm text-[var(--text-primary)]">
                              <Calendar className="w-4 h-4 inline mr-2 text-[var(--text-secondary)]" />
                              {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
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
                            {leave.approver && leave.status === 'approved' && (
                              <p className="text-xs text-green-600 mt-2">
                                Approved by: {leave.approver.fullName}
                              </p>
                            )}
                            {leave.status === 'rejected' && (
                              <p className="text-xs text-red-600 mt-2">
                                Request was rejected
                              </p>
                            )}
                          </div>
                        </div>
                        {leave.status === 'pending' && (
                          <button
                            onClick={() => handleCancelLeave(leave.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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

          {/* Password Tab */}
          {activeTab === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-5">
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
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
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
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
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
                  {passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
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
                  {isLoading ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Shift Request Modal */}
      {showShiftModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-xl p-6 w-full max-w-md border border-[var(--border-color)]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">Request Shift</h3>
                <p className="text-sm text-[var(--text-secondary)]">Submit a shift request for approval</p>
              </div>
              <button onClick={() => setShowShiftModal(false)} className="p-1 hover:bg-[var(--bg-main)] rounded-lg">
                <X className="w-5 h-5 text-[var(--text-secondary)]" />
              </button>
            </div>
            <form onSubmit={handleCreateShift} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Shift Date *</label>
                <input
                  type="date"
                  value={newShift.shiftDate}
                  onChange={(e) => setNewShift({ ...newShift, shiftDate: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-sm"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Start Time</label>
                  <input
                    type="time"
                    value={newShift.startTime}
                    onChange={(e) => setNewShift({ ...newShift, startTime: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">End Time</label>
                  <input
                    type="time"
                    value={newShift.endTime}
                    onChange={(e) => setNewShift({ ...newShift, endTime: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-sm"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Shift Type</label>
                <select
                  value={newShift.shiftType}
                  onChange={(e) => setNewShift({ ...newShift, shiftType: e.target.value as any })}
                  className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-sm"
                >
                  {SHIFT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Notes (Optional)</label>
                <textarea
                  value={newShift.notes}
                  onChange={(e) => setNewShift({ ...newShift, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-sm"
                  placeholder="Any additional information..."
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
                  onClick={() => setShowShiftModal(false)}
                  className="px-4 py-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leave Request Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-xl p-6 w-full max-w-md border border-[var(--border-color)]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">Request Leave</h3>
                <p className="text-sm text-[var(--text-secondary)]">Submit a leave request for approval</p>
              </div>
              <button onClick={() => setShowLeaveModal(false)} className="p-1 hover:bg-[var(--bg-main)] rounded-lg">
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
                    <option key={type.value} value={type.value}>{type.label}</option>
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
                  className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-sm"
                  placeholder="Please provide a reason for your leave request..."
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