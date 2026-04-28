// src/components/settings/UserManagementTab.tsx - UPDATED THEME
import { useState, useEffect } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../../store/toastStore';
import { Search, Plus, User, Mail, Phone, Shield, Edit, Ban, Activity, Loader, AlertCircle, X, CheckCircle } from 'lucide-react';
import UserRegistrationModal from '../UserRegistrationModal';
import UserEditModal from '../UserEditModal';

export default function UserManagementTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingUser, setEditingUser] = useState<any>(null);
  const [deactivatingUser, setDeactivatingUser] = useState<any>(null);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  
  const { 
    users, 
    getAllUsers, 
    updateUser, 
    deactivateUser, 
    isLoading,
    error,
    clearError 
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

  const filteredUsers = users.filter((user: any) =>
    user.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      // Error handled by store
    }
  };

  const handleRegistrationSuccess = () => {
    loadUsers();
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

      {/* Header Stats */}
      <div className="grid grid-cols-4 gap-3">
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
      </div>

      {/* Search and Add User */}
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
          <button
            onClick={() => setShowRegistrationModal(true)}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium disabled:opacity-50"
          >
            {isLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add User
          </button>
        </div>
      </div>

      {/* User List Table */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider hidden sm:table-cell">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Role</th>
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