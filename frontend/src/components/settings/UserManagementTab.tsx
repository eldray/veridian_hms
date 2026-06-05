// src/components/settings/UserManagementTab.tsx - UPDATED WITH SENIORITY
import { useState, useEffect } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../../store/toastStore';
import { Search, Plus, User, Mail, Phone, Shield, Edit, Ban, Activity, Loader, AlertCircle, X, CheckCircle, TrendingUp, GraduationCap } from 'lucide-react';
import UserRegistrationModal from '../UserRegistrationModal';
import UserEditModal from '../UserEditModal';
import { UserMessageModal } from '../UserMessageModal';

// ✅ ADD Seniority configuration
const SENIORITY_CONFIG: Record<string, { label: string; color: string; icon: any; level: number }> = {
  TRAINEE: { 
    label: 'Trainee', 
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    icon: GraduationCap,
    level: 0
  },
  JUNIOR: { 
    label: 'Junior', 
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: User,
    level: 1
  },
  SENIOR: { 
    label: 'Senior', 
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

export default function UserManagementTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingUser, setEditingUser] = useState<any>(null);
  const [deactivatingUser, setDeactivatingUser] = useState<any>(null);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [messageUser, setMessageUser] = useState<{ id: string; name: string } | null>(null);
  const [seniorityFilter, setSeniorityFilter] = useState<string>('ALL');
  
  const { 
    users, 
    getAllUsers, 
    updateUser, 
    deactivateUser, 
    isLoading,
    error,
    clearError,
    updateUserSeniority  // ✅ ADD this
  } = useSettingsStore();
  
  const { user: currentUser } = useAuthStore();
  const { success, error: toastError } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    return () => {
      if (error) clearError();
    };
  }, [error, clearError]);

  const loadUsers = async () => {
    try {
      await getAllUsers();
    } catch (err) {
      // Error handled by store
    }
  };

  // ✅ UPDATE filtering to include seniority
  const filteredUsers = users.filter((user: any) => {
    const matchesSearch = 
      user.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSeniority = seniorityFilter === 'ALL' || user.seniority === seniorityFilter;
    
    return matchesSearch && matchesSeniority;
  });

  // ✅ UPDATE seniority stats
  const getSeniorityStats = () => {
    const stats: Record<string, number> = { TRAINEE: 0, JUNIOR: 0, SENIOR: 0, PRINCIPAL: 0 };
    users.forEach((user: any) => {
      if (user.seniority && stats[user.seniority] !== undefined) {
        stats[user.seniority]++;
      } else {
        stats.JUNIOR++; // Default fallback
      }
    });
    return stats;
  };

  const seniorityStats = getSeniorityStats();

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-100 text-red-800 border border-red-200',
      doctor: 'bg-blue-100 text-blue-800 border border-blue-200',
      nurse: 'bg-green-100 text-green-800 border border-green-200',
      midwife: 'bg-purple-100 text-purple-800 border border-purple-200',
      records: 'bg-orange-100 text-orange-800 border border-orange-200',
      lab_tech: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
      pharmacist: 'bg-cyan-100 text-cyan-800 border border-cyan-200',
      accounts: 'bg-gray-100 text-gray-800 border border-gray-200',
      sonographer: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
    };
    return colors[role] || 'bg-gray-100 text-gray-800 border border-gray-200';
  };

  // ✅ ADD get seniority badge component
  const getSeniorityBadge = (seniority: string) => {
    const config = SENIORITY_CONFIG[seniority] || SENIORITY_CONFIG.JUNIOR;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  const handleEditUser = async (userData: any) => {
    if (!editingUser) return;
    try {
      await updateUser(editingUser.id, userData);
      setEditingUser(null);
      success('User Updated', `${userData.fullName || editingUser.fullName} has been updated`);
      await loadUsers();
    } catch (err) {
      // Error handled by store
    }
  };

  const handleDeactivateUser = async () => {
    if (!deactivatingUser) return;
    try {
      await deactivateUser(deactivatingUser.id);
      setDeactivatingUser(null);
      success('User Deactivated', `${deactivatingUser.fullName} has been deactivated`);
      await loadUsers();
    } catch (err) {
    }
  };

  const handleRegistrationSuccess = () => {
    loadUsers();
  };

  // ✅ ADD handle seniority change
  const handleSeniorityChange = async (userId: string, newSeniority: string) => {
    try {
      await updateUserSeniority(userId, newSeniority as any);
      success('Seniority Updated', `User seniority level has been updated`);
      await loadUsers();
    } catch (err) {
      toastError('Update Failed', 'Could not update seniority level');
    }
  };

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium">Error:</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Header Stats - UPDATED with seniority stats */}
      <div className="grid grid-cols-5 gap-3">
        <div className="bg-[var(--bg-card)] rounded-xl p-3 border border-[var(--border-color)] text-center">
          <p className="text-2xl font-bold text-[var(--text-primary)]">{users.length}</p>
          <p className="text-xs text-[var(--text-secondary)]">Total Users</p>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl p-3 border border-[var(--border-color)] text-center">
          <p className="text-2xl font-bold text-green-600">{users.filter((u: any) => u.isActive).length}</p>
          <p className="text-xs text-[var(--text-secondary)]">Active</p>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl p-3 border border-[var(--border-color)] text-center">
          <p className="text-2xl font-bold text-red-600">{users.filter((u: any) => !u.isActive).length}</p>
          <p className="text-xs text-[var(--text-secondary)]">Inactive</p>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl p-3 border border-[var(--border-color)] text-center">
          <p className="text-2xl font-bold text-purple-600">{users.filter((u: any) => u.role === 'admin').length}</p>
          <p className="text-xs text-[var(--text-secondary)]">Admins</p>
        </div>
        {/* ✅ ADD Seniority summary */}
        <div className="bg-[var(--bg-card)] rounded-xl p-3 border border-[var(--border-color)] text-center">
          <p className="text-2xl font-bold text-amber-600">{seniorityStats.PRINCIPAL + seniorityStats.SENIOR}</p>
          <p className="text-xs text-[var(--text-secondary)]">Senior+ Staff</p>
        </div>
      </div>

      {/* Search, Filter and Add User */}
      <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, username, role, or email..."
              className="w-full pl-10 pr-4 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] text-sm"
            />
          </div>
          
          {/* ✅ ADD Seniority Filter Dropdown */}
          <select
            value={seniorityFilter}
            onChange={(e) => setSeniorityFilter(e.target.value)}
            className="px-4 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] text-sm"
          >
            <option value="ALL">All Seniority Levels</option>
            <option value="TRAINEE">Trainee</option>
            <option value="JUNIOR">Junior</option>
            <option value="SENIOR">Senior</option>
            <option value="PRINCIPAL">Principal</option>
          </select>
          
          <button
            onClick={() => setShowRegistrationModal(true)}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium disabled:opacity-50"
          >
            {isLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add User
          </button>
        </div>
        
        {/* ✅ ADD Seniority quick filters */}
        <div className="flex gap-2 mt-3">
          {Object.entries(SENIORITY_CONFIG).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setSeniorityFilter(seniorityFilter === key ? 'ALL' : key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                seniorityFilter === key 
                  ? config.color.replace('border', 'bg').split(' ')[0] + ' ring-2 ring-offset-1 ring-' + config.color.split(' ')[1].split('-')[1]
                  : 'bg-[var(--bg-main)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <span className="flex items-center gap-1">
                <config.icon className="w-3 h-3" />
                {config.label}
                <span className="ml-1 text-xs opacity-75">({seniorityStats[key] || 0})</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* User List Table - UPDATED with Seniority column */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider hidden sm:table-cell">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Seniority</th> {/* ✅ NEW COLUMN */}
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider hidden md:table-cell">License</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {filteredUsers.map((user: any) => (
                <tr key={user.id} className="hover:bg-[var(--bg-main)] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[var(--icon-cyan-bg)] rounded-lg flex items-center justify-center flex-shrink-0">
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
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                      <Shield className="w-3 h-3" />
                      {user.role?.replace('_', ' ').toUpperCase()}
                    </span>
                    {user.specialization && (
                      <div className="text-xs text-[var(--text-secondary)] mt-1">{user.specialization}</div>
                    )}
                  </td>
                  {/* ✅ NEW Seniority column */}
                  <td className="px-4 py-3">
                    {getSeniorityBadge(user.seniority || 'JUNIOR')}
                    {/* ✅ ADD inline seniority edit for admins */}
                    {currentUser?.role === 'admin' && (
                      <select
                        value={user.seniority || 'JUNIOR'}
                        onChange={(e) => handleSeniorityChange(user.id, e.target.value)}
                        className="mt-1 text-xs bg-[var(--bg-main)] border border-[var(--border-color)] rounded px-1 py-0.5 text-[var(--text-primary)]"
                        disabled={isLoading}
                      >
                        <option value="TRAINEE">Trainee</option>
                        <option value="JUNIOR">Junior</option>
                        <option value="SENIOR">Senior</option>
                        <option value="PRINCIPAL">Principal</option>
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-sm text-[var(--text-primary)]">{user.licenseNumber || '-'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      user.isActive 
                        ? 'bg-green-100 text-green-700 border border-green-200' 
                        : 'bg-red-100 text-red-700 border border-red-200'
                    }`}>
                      <Activity className="w-3 h-3" />
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingUser(user)}
                        disabled={isLoading}
                        className="p-1.5 text-[var(--icon-yellow-text)] hover:bg-[var(--icon-yellow-bg)] rounded-lg transition-colors disabled:opacity-50"
                        title="Edit User"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {user.isActive && user.id !== currentUser?.id && (
                        <button
                          onClick={() => setDeactivatingUser(user)}
                          disabled={isLoading}
                          className="p-1.5 text-[var(--icon-red-text)] hover:bg-[var(--icon-red-bg)] rounded-lg transition-colors disabled:opacity-50"
                          title="Deactivate User"
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

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <User className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
            <p className="text-[var(--text-secondary)] text-sm">
              {searchQuery ? "No users found matching your search." : "No users found."}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowRegistrationModal(true)}
                className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm"
              >
                <Plus className="w-4 h-4" />
                Add First User
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showRegistrationModal && (
        <UserRegistrationModal
          onClose={() => setShowRegistrationModal(false)}
          onSuccess={handleRegistrationSuccess}
        />
      )}

      {editingUser && (
        <UserEditModal
          user={editingUser}
          onSave={handleEditUser}
          onClose={() => setEditingUser(null)}
          isLoading={isLoading}
        />
      )}

      {messageUser && (
        <UserMessageModal
          isOpen={true}
          onClose={() => setMessageUser(null)}
          recipientId={messageUser.id}
          recipientName={messageUser.name}
        />
      )}

      {/* Deactivate Confirmation Modal */}
      {deactivatingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-xl p-6 w-full max-w-md border border-[var(--border-color)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[var(--icon-red-bg)] rounded-lg flex items-center justify-center">
                <Ban className="w-5 h-5 text-[var(--icon-red-text)]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">Deactivate User</h3>
                <p className="text-sm text-[var(--text-secondary)]">This will prevent the user from accessing the system.</p>
              </div>
            </div>
            
            <p className="text-[var(--text-secondary)] mb-6 text-sm">
              Are you sure you want to deactivate <strong className="font-semibold text-[var(--text-primary)]">{deactivatingUser.fullName}</strong>? 
              They will no longer be able to log in.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeactivatingUser(null)}
                disabled={isLoading}
                className="px-4 py-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] text-sm font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeactivateUser}
                disabled={isLoading}
                className="px-4 py-2 bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] rounded-lg hover:bg-[var(--icon-red-text)] hover:text-white transition-all text-sm font-medium disabled:opacity-50"
              >
                {isLoading ? 'Deactivating...' : 'Deactivate User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}