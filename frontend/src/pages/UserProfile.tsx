// src/pages/UserProfile.tsx - USING ONLY SETTINGSSTORE
import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';  // For auth only (login/logout/user info)
import { useSettingsStore } from '../store/settingsStore';
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

export default function UserProfile() {
  const navigate = useNavigate();
  const { user: authUser } = useAuthStore();  // Only for the logged-in user info
  const { updateUser, isLoading, getAllUsers, users } = useSettingsStore();
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
    }
  }, [authUser]);

  // Update profile using settingsStore
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
  
    try {
      // Update user via settingsStore
      const updatedUser = await updateUser(authUser!.id, {
        fullName: profileData.fullName,
        email: profileData.email,
        phone: profileData.phone,
        licenseNumber: profileData.licenseNumber,
        specialization: profileData.specialization,
        seniority: profileData.seniority
      });
      
      success('Profile Updated', 'Your profile has been updated successfully');
      
      // ✅ Force logout and redirect to login
      // This ensures a fresh token is created
      setTimeout(() => {
        // Clear local storage
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        // Redirect to login
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
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
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">Manage your account settings</p>
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

      {/* Seniority Info Card */}
      <div className="bg-gradient-to-r from-[var(--icon-cyan-bg)] to-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-[var(--icon-cyan-bg)] rounded-lg flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-4 h-4 text-[var(--icon-cyan-text)]" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-1">About Seniority Levels</h4>
            <p className="text-xs text-[var(--text-secondary)]">
              <strong>Trainee:</strong> In training, requires supervision.<br />
              <strong>Junior:</strong> Regular staff privileges.<br />
              <strong>Senior:</strong> Can supervise juniors and approve actions.<br />
              <strong>Principal:</strong> Highest authority, can approve high-value operations.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
        <div className="border-b border-[var(--border-color)] px-4">
          <nav className="flex gap-1">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-all ${
                activeTab === 'profile'
                  ? 'border-[var(--icon-cyan-text)] text-[var(--icon-cyan-text)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <User className="w-4 h-4" />
              Profile Information
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
              Change Password
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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

                {/* Seniority Dropdown */}
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
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Seniority affects your permissions and approval authority.
                  </p>
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
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="px-4 py-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] transition-all text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
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
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="px-4 py-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] transition-all text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}