// src/pages/UserProfile.tsx - REDESIGNED WITH NEW THEME
import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
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
} from 'lucide-react';

export default function UserProfile() {
  const navigate = useNavigate();
  const { user, updateProfile, changePassword, isLoading } = useAuthStore();
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    phone: '',
    licenseNumber: '',
    specialization: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        fullName: user.fullName || '',
        email: user.email || '',
        phone: user.phone || '',
        licenseNumber: user.licenseNumber || '',
        specialization: user.specialization || ''
      });
    }
  }, [user]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const preparedData = {
      fullName: profileData.fullName || '',
      email: profileData.email || null,
      phone: profileData.phone || null,
      licenseNumber: profileData.licenseNumber || null,
      specialization: profileData.specialization || null
    };

    console.log('📤 Sending profile data:', preparedData);

    try {
      await updateProfile(preparedData);
      success('Profile Updated', 'Your profile has been updated successfully');
    } catch (err: any) {
      console.error('❌ Profile update failed:', err);
      const errorMessage = err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.msg ||
        'Failed to update profile';
      error('Update Failed', errorMessage);
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

    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    if (!strongPasswordRegex.test(passwordData.newPassword)) {
      error(
        'Weak Password',
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      );
      return;
    }

    try {
      await changePassword(passwordData.currentPassword, passwordData.newPassword);
      success('Password Changed', 'Your password has been updated successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      const errorMessage = err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.msg ||
        'Failed to change password';
      error('Password Change Failed', errorMessage);
    }
  };

  const medicalRoles = ['doctor', 'nurse', 'midwife'];
  const isMedicalStaff = user && medicalRoles.includes(user.role);
  const isDoctor = user?.role === 'doctor';

  // Get role badge color
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

  if (!user) {
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
                  {user.fullName}
                </h3>
                {getRoleBadge(user.role)}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)] mt-1">
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {user.email || 'No email set'}
                </span>
                {user.phone && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {user.phone}
                    </span>
                  </>
                )}
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Member since {new Date(user.createdAt).toLocaleDateString()}
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
                    <User className="w-3.5 h-3.5 inline mr-1 text-[var(--icon-cyan-text)]" />
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={profileData.fullName}
                    onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
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
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-transparent text-[var(--text-primary)] text-sm"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                    <Phone className="w-3.5 h-3.5 inline mr-1 text-purple-500" />
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-transparent text-[var(--text-primary)] text-sm"
                    placeholder="+233 XX XXX XXXX"
                  />
                </div>

                {isMedicalStaff && (
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                      <IdCard className="w-3.5 h-3.5 inline mr-1 text-yellow-500" />
                      License/PIN Number *
                    </label>
                    <input
                      type="text"
                      value={profileData.licenseNumber}
                      onChange={(e) => setProfileData({ ...profileData, licenseNumber: e.target.value })}
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
                      value={profileData.specialization}
                      onChange={(e) => setProfileData({ ...profileData, specialization: e.target.value })}
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
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isLoading ? 'Updating...' : 'Update Profile'}
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
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-[var(--text-secondary)]">Password must contain:</p>
                    <ul className="text-xs text-[var(--text-tertiary)] space-y-0.5 ml-4 list-disc">
                      <li className={passwordData.newPassword.length >= 6 ? 'text-green-600' : ''}>
                        At least 6 characters
                      </li>
                      <li className={/[A-Z]/.test(passwordData.newPassword) ? 'text-green-600' : ''}>
                        At least one uppercase letter
                      </li>
                      <li className={/[a-z]/.test(passwordData.newPassword) ? 'text-green-600' : ''}>
                        At least one lowercase letter
                      </li>
                      <li className={/\d/.test(passwordData.newPassword) ? 'text-green-600' : ''}>
                        At least one number
                      </li>
                    </ul>
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