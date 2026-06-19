// src/components/settings/UserManagementTab.tsx - FIXED JSX SYNTAX
import { useState, useEffect } from 'react';
import { useUserStore } from '../../store/userStore';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../../store/toastStore';
import { 
  Search, Plus, User, Mail, Phone, Shield, Edit, Ban, Activity, 
  Loader, AlertCircle, Clock, Calendar, FileText, CheckCircle, 
  XCircle, Clock as ClockIcon, Users, TrendingUp, GraduationCap,
  ChevronDown, Filter, CalendarRange
} from 'lucide-react';
import UserRegistrationModal from '../UserRegistrationModal';
import UserEditModal from '../UserEditModal';

// Seniority configuration
const SENIORITY_CONFIG: Record<string, { label: string; color: string; icon: any; level: number }> = {
  TRAINEE: { label: 'Trainee', color: 'bg-purple-100 text-purple-700', icon: GraduationCap, level: 0 },
  JUNIOR: { label: 'Junior', color: 'bg-blue-100 text-blue-700', icon: User, level: 1 },
  SENIOR: { label: 'Senior', color: 'bg-orange-100 text-orange-700', icon: TrendingUp, level: 2 },
  PRINCIPAL: { label: 'Principal', color: 'bg-amber-100 text-amber-700', icon: Shield, level: 3 }
};

const LEAVE_STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: ClockIcon },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: XCircle },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-700', icon: XCircle }
};

const SHIFT_TYPE_CONFIG = {
  morning: { label: 'Morning', color: 'bg-green-100 text-green-700' },
  afternoon: { label: 'Afternoon', color: 'bg-orange-100 text-orange-700' },
  night: { label: 'Night', color: 'bg-purple-100 text-purple-700' },
  on_call: { label: 'On Call', color: 'bg-blue-100 text-blue-700' }
};

type TabType = 'users' | 'shifts' | 'leaves';

export default function UserManagementTab() {
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingUser, setEditingUser] = useState<any>(null);
  const [deactivatingUser, setDeactivatingUser] = useState<any>(null);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [seniorityFilter, setSeniorityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedUserId, setSelectedUserId] = useState<string>('ALL');
  const [selectedLeaveId, setSelectedLeaveId] = useState<string | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  
  const { 
    users, 
    getAllUsers, 
    updateUser, 
    deactivateUser, 
    updateUserSeniority,
    shifts,
    getShifts,
    leaves,
    getLeaves,
    updateLeave,
    isLoading,
    error,
    clearError
  } = useUserStore();
  
  const { user: currentUser } = useAuthStore();
  const { success, error: toastError } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'shifts') loadShifts();
    if (activeTab === 'leaves') loadLeaves();
  }, [activeTab]);

  const loadData = async () => {
    await loadUsers();
    await loadShifts();
    await loadLeaves();
  };

  const loadUsers = async () => {
    try {
      await getAllUsers();
    } catch (err) {}
  };

  const loadShifts = async () => {
    try {
      await getShifts({});
    } catch (err) {}
  };

  const loadLeaves = async () => {
    try {
      await getLeaves({});
    } catch (err) {}
  };

  // Filtering
  const filteredUsers = users.filter((user: any) => {
    const matchesSearch = 
      user.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.role?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeniority = seniorityFilter === 'ALL' || user.seniority === seniorityFilter;
    return matchesSearch && matchesSeniority;
  });

  const filteredShifts = shifts.filter((shift: any) => {
    if (selectedUserId !== 'ALL' && shift.userId !== selectedUserId) return false;
    if (searchQuery) {
      const user = users.find(u => u.id === shift.userId);
      return user?.fullName?.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const filteredLeaves = leaves.filter((leave: any) => {
    if (selectedUserId !== 'ALL' && leave.userId !== selectedUserId) return false;
    if (statusFilter !== 'ALL' && leave.status !== statusFilter) return false;
    if (searchQuery) {
      const user = users.find(u => u.id === leave.userId);
      return user?.fullName?.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const seniorityStats = () => {
    const stats = { TRAINEE: 0, JUNIOR: 0, SENIOR: 0, PRINCIPAL: 0 };
    users.forEach((user: any) => {
      if (user.seniority && stats[user.seniority] !== undefined) stats[user.seniority]++;
      else stats.JUNIOR++;
    });
    return stats;
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-100 text-red-800',
      doctor: 'bg-blue-100 text-blue-800',
      nurse: 'bg-green-100 text-green-800',
      midwife: 'bg-purple-100 text-purple-800',
      records: 'bg-orange-100 text-orange-800',
      lab_tech: 'bg-yellow-100 text-yellow-800',
      pharmacist: 'bg-cyan-100 text-cyan-800',
      accounts: 'bg-gray-100 text-gray-800',
      sonographer: 'bg-indigo-100 text-indigo-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  // ✅ Fixed: Helper function to render seniority badge
  const renderSeniorityBadge = (seniority: string) => {
    const config = SENIORITY_CONFIG[seniority] || SENIORITY_CONFIG.JUNIOR;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  // ✅ Fixed: Helper function to render shift type badge
  const renderShiftTypeBadge = (shiftType: string) => {
    const config = SHIFT_TYPE_CONFIG[shiftType as keyof typeof SHIFT_TYPE_CONFIG] || { label: shiftType, color: 'bg-gray-100 text-gray-700' };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Clock className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  // ✅ Fixed: Helper function to render leave status badge
  const renderLeaveStatusBadge = (status: string) => {
    const config = LEAVE_STATUS_CONFIG[status as keyof typeof LEAVE_STATUS_CONFIG] || LEAVE_STATUS_CONFIG.pending;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  const handleApproveLeave = async () => {
    if (!selectedLeaveId) return;
    try {
      await updateLeave(selectedLeaveId, { status: 'approved' });
      success('Leave Approved', 'The leave request has been approved');
      setShowApprovalModal(false);
      setSelectedLeaveId(null);
      await loadLeaves();
    } catch (err) {
      toastError('Error', 'Failed to approve leave request');
    }
  };

  const handleRejectLeave = async () => {
    if (!selectedLeaveId) return;
    try {
      await updateLeave(selectedLeaveId, { status: 'rejected', reason: rejectionReason });
      success('Leave Rejected', 'The leave request has been rejected');
      setShowRejectionModal(false);
      setSelectedLeaveId(null);
      setRejectionReason('');
      await loadLeaves();
    } catch (err) {
      toastError('Error', 'Failed to reject leave request');
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
        <div className="flex border-b border-[var(--border-color)]">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all ${
              activeTab === 'users'
                ? 'border-b-2 border-[var(--icon-cyan-text)] text-[var(--icon-cyan-text)] bg-[var(--icon-cyan-bg)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Users className="w-4 h-4" />
            Users ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('shifts')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all ${
              activeTab === 'shifts'
                ? 'border-b-2 border-[var(--icon-cyan-text)] text-[var(--icon-cyan-text)] bg-[var(--icon-cyan-bg)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Clock className="w-4 h-4" />
            Staff Shifts ({shifts.length})
          </button>
          <button
            onClick={() => setActiveTab('leaves')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all ${
              activeTab === 'leaves'
                ? 'border-b-2 border-[var(--icon-cyan-text)] text-[var(--icon-cyan-text)] bg-[var(--icon-cyan-bg)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <FileText className="w-4 h-4" />
            Leave Requests ({leaves.filter(l => l.status === 'pending').length} pending)
          </button>
        </div>
      </div>

      {/* ========================================== */}
      {/* USERS TAB */}
      {/* ========================================== */}
      {activeTab === 'users' && (
        <>
          {/* Header Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-[var(--bg-card)] rounded-xl p-3 border border-[var(--border-color)] text-center">
              <p className="text-2xl font-bold text-[var(--text-primary)]">{users.length}</p>
              <p className="text-xs text-[var(--text-secondary)]">Total Users</p>
            </div>
            <div className="bg-[var(--bg-card)] rounded-xl p-3 border border-[var(--border-color)] text-center">
              <p className="text-2xl font-bold text-green-600">{users.filter((u: any) => u.isActive).length}</p>
              <p className="text-xs text-[var(--text-secondary)]">Active</p>
            </div>
            <div className="bg-[var(--bg-card)] rounded-xl p-3 border border-[var(--border-color)] text-center">
              <p className="text-2xl font-bold text-purple-600">{users.filter((u: any) => u.role === 'admin').length}</p>
              <p className="text-xs text-[var(--text-secondary)]">Admins</p>
            </div>
            <div className="bg-[var(--bg-card)] rounded-xl p-3 border border-[var(--border-color)] text-center">
              <p className="text-2xl font-bold text-amber-600">{seniorityStats().SENIOR + seniorityStats().PRINCIPAL}</p>
              <p className="text-xs text-[var(--text-secondary)]">Senior+ Staff</p>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users..."
                  className="w-full pl-10 pr-4 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm"
                />
              </div>
              <select
                value={seniorityFilter}
                onChange={(e) => setSeniorityFilter(e.target.value)}
                className="px-4 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm"
              >
                <option value="ALL">All Seniority</option>
                <option value="TRAINEE">Trainee</option>
                <option value="JUNIOR">Junior</option>
                <option value="SENIOR">Senior</option>
                <option value="PRINCIPAL">Principal</option>
              </select>
              <button
                onClick={() => setShowRegistrationModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Add User
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">User</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] hidden sm:table-cell">Contact</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Seniority</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {filteredUsers.map((user: any) => (
                    <tr key={user.id} className="hover:bg-[var(--bg-main)]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-[var(--icon-cyan-bg)] rounded-lg flex items-center justify-center">
                            <User className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                          </div>
                          <div>
                            <div className="font-medium text-[var(--text-primary)]">{user.fullName}</div>
                            <div className="text-xs text-[var(--text-secondary)]">@{user.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <div className="text-sm text-[var(--text-primary)]">{user.email || '-'}</div>
                        <div className="text-xs text-[var(--text-secondary)]">{user.phone || '-'}</div>
                       </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                          {user.role?.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {renderSeniorityBadge(user.seniority || 'JUNIOR')}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          <Activity className="w-3 h-3" />
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingUser(user)}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {user.isActive && user.id !== currentUser?.id && (
                            <button
                              onClick={() => setDeactivatingUser(user)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ========================================== */}
      {/* SHIFTS TAB */}
      {/* ========================================== */}
      {activeTab === 'shifts' && (
        <>
          <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by staff name..."
                  className="w-full pl-10 pr-4 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm"
                />
              </div>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="px-4 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm"
              >
                <option value="ALL">All Staff</option>
                {users.map((user: any) => (
                  <option key={user.id} value={user.id}>{user.fullName}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            {filteredShifts.length === 0 ? (
              <div className="text-center py-12 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)]">
                <Clock className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
                <p className="text-[var(--text-secondary)]">No shifts found</p>
              </div>
            ) : (
              filteredShifts.map((shift: any) => {
                const user = users.find(u => u.id === shift.userId);
                return (
                  <div key={shift.id} className="bg-[var(--bg-card)] rounded-lg p-4 border border-[var(--border-color)]">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {renderShiftTypeBadge(shift.shiftType)}
                        </div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">{user?.fullName || 'Unknown'}</p>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">
                          <Calendar className="w-3 h-3 inline mr-1" />
                          {new Date(shift.shiftDate).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)]">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {new Date(shift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(shift.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {shift.notes && <p className="text-xs text-[var(--text-secondary)] mt-1">{shift.notes}</p>}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* ========================================== */}
      {/* LEAVES TAB */}
      {/* ========================================== */}
      {activeTab === 'leaves' && (
        <>
          <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by staff name..."
                  className="w-full pl-10 pr-4 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm"
                />
              </div>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="px-4 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm"
              >
                <option value="ALL">All Staff</option>
                {users.map((user: any) => (
                  <option key={user.id} value={user.id}>{user.fullName}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm"
              >
                <option value="ALL">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            {filteredLeaves.length === 0 ? (
              <div className="text-center py-12 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)]">
                <FileText className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
                <p className="text-[var(--text-secondary)]">No leave requests found</p>
              </div>
            ) : (
              filteredLeaves.map((leave: any) => {
                const user = users.find(u => u.id === leave.userId);
                return (
                  <div key={leave.id} className="bg-[var(--bg-card)] rounded-lg p-4 border border-[var(--border-color)]">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {renderLeaveStatusBadge(leave.status)}
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            {leave.leaveType?.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">{user?.fullName || 'Unknown'}</p>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">
                          <Calendar className="w-3 h-3 inline mr-1" />
                          {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)]">
                          <Clock className="w-3 h-3 inline mr-1" />
                          Total: {leave.totalDays} day{leave.totalDays !== 1 ? 's' : ''}
                        </p>
                        {leave.reason && (
                          <p className="text-xs text-[var(--text-secondary)] mt-2 bg-[var(--bg-main)] p-2 rounded">
                            {leave.reason}
                          </p>
                        )}
                        {leave.approver && (
                          <p className="text-xs text-green-600 mt-2">
                            Approved by: {leave.approver.fullName}
                          </p>
                        )}
                      </div>
                      {leave.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedLeaveId(leave.id);
                              setShowApprovalModal(true);
                            }}
                            className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setSelectedLeaveId(leave.id);
                              setShowRejectionModal(true);
                            }}
                            className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Approval Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Approve Leave Request</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">Are you sure you want to approve this leave request?</p>
            <div className="flex gap-3">
              <button onClick={handleApproveLeave} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                Yes, Approve
              </button>
              <button onClick={() => setShowApprovalModal(false)} className="flex-1 px-4 py-2 border border-[var(--border-color)] rounded-lg">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Reject Leave Request</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">Please provide a reason for rejection:</p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm mb-4"
              placeholder="Reason for rejection..."
            />
            <div className="flex gap-3">
              <button onClick={handleRejectLeave} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                Yes, Reject
              </button>
              <button onClick={() => setShowRejectionModal(false)} className="flex-1 px-4 py-2 border border-[var(--border-color)] rounded-lg">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showRegistrationModal && (
        <UserRegistrationModal onClose={() => setShowRegistrationModal(false)} onSuccess={loadUsers} />
      )}
      {editingUser && (
        <UserEditModal
          user={editingUser}
          onSave={async (data) => {
            await updateUser(editingUser.id, data);
            setEditingUser(null);
            await loadUsers();
          }}
          onClose={() => setEditingUser(null)}
          isLoading={isLoading}
        />
      )}
      {deactivatingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Deactivate User</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Are you sure you want to deactivate <strong>{deactivatingUser.fullName}</strong>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  await deactivateUser(deactivatingUser.id);
                  setDeactivatingUser(null);
                  await loadUsers();
                  success('User Deactivated', `${deactivatingUser.fullName} has been deactivated`);
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Deactivate
              </button>
              <button onClick={() => setDeactivatingUser(null)} className="flex-1 px-4 py-2 border border-[var(--border-color)] rounded-lg">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}