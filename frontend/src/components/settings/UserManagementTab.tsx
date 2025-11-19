// src/components/settings/UserManagementTab.tsx
import { useState, useEffect } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../../store/toastStore';
import { Search, Plus, User, Mail, Phone, Shield, Edit, Ban, Activity } from 'lucide-react';

// Import modals
import UserRegistrationModal from '../UserRegistrationModal';
import UserEditModal from '../UserEditModal';

export default function UserManagementTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingUser, setEditingUser] = useState<any>(null);
  const [deactivatingUser, setDeactivatingUser] = useState<any>(null);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  
  const { users, getAllUsers, updateUser, deactivateUser, isLoading } = useSettingsStore();
  const { user: currentUser } = useAuthStore();
  const { success, error } = useToast();

  useEffect(() => {
    getAllUsers();
  }, []);

  const filteredUsers = users.filter((user: any) =>
    user.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] border border-[var(--icon-red-text)]',
      doctor: 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] border border-[var(--icon-cyan-text)]',
      nurse: 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] border border-[var(--icon-green-text)]',
      midwife: 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] border border-[var(--icon-purple-text)]',
      records: 'bg-[var(--icon-orange-bg)] text-[var(--icon-orange-text)] border border-[var(--icon-orange-text)]',
      lab_tech: 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)] border border-[var(--icon-yellow-text)]',
      pharmacist: 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] border border-[var(--icon-cyan-text)]',
      accounts: 'bg-[var(--bg-main)] text-[var(--text-tertiary)] border border-[var(--border-color)]',
    };
    return colors[role] || 'bg-[var(--bg-main)] text-[var(--text-tertiary)] border border-[var(--border-color)]';
  };

  const handleEditUser = async (userData: any) => {
    if (!editingUser) return;
    
    try {
      await updateUser(editingUser._id, userData);
      setEditingUser(null);
      success('User Updated', `${userData.fullName || editingUser.fullName} has been updated successfully`);
      await getAllUsers(); // Refresh the list
    } catch (err) {
      error('Update Failed', 'Failed to update user. Please try again.');
    }
  };

  const handleDeactivateUser = async () => {
    if (!deactivatingUser) return;
    
    try {
      await deactivateUser(deactivatingUser._id);
      setDeactivatingUser(null);
      success('User Deactivated', `${deactivatingUser.fullName} has been deactivated`);
      await getAllUsers(); // Refresh the list
    } catch (err) {
      error('Deactivation Failed', 'Failed to deactivate user. Please try again.');
    }
  };

  const handleRegistrationSuccess = () => {
    getAllUsers(); // Refresh the user list after successful registration
  };

  return (
    <div className="space-y-6">
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
              className="w-full pl-10 pr-4 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
            />
          </div>
          <button
            onClick={() => setShowRegistrationModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add User
          </button>
        </div>
      </div>

      {/* User List */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-full">
            <thead className="bg-[var(--bg-main)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider hidden sm:table-cell">
                  Contact
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider hidden md:table-cell">
                  License/PIN
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {filteredUsers.map((user: any) => (
                <tr key={user._id} className="hover:bg-[var(--bg-main)] transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-[var(--icon-cyan-bg)] rounded-lg flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-[var(--text-primary)]">
                          {user.fullName}
                        </div>
                        <div className="text-xs text-[var(--text-secondary)] sm:hidden">
                          @{user.username}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap hidden sm:table-cell">
                    <div className="text-sm text-[var(--text-primary)]">{user.email || '-'}</div>
                    <div className="text-xs text-[var(--text-secondary)]">{user.phone || '-'}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                      <Shield className="w-3 h-3 mr-1" />
                      {user.role?.replace('_', ' ').toUpperCase()}
                    </span>
                    {user.specialization && (
                      <div className="text-xs text-[var(--text-secondary)] mt-1">
                        {user.specialization}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-[var(--text-primary)] hidden md:table-cell">
                    {user.licenseNumber || '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      user.isActive 
                        ? 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] border border-[var(--icon-green-text)]' 
                        : 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] border border-[var(--icon-red-text)]'
                    }`}>
                      <Activity className="w-3 h-3 mr-1" />
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingUser(user)}
                        className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--icon-green-text)] transition-colors hover:bg-[var(--icon-green-bg)] rounded-lg"
                        title="Edit User"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {user.isActive && user._id !== currentUser?._id && (
                        <button
                          onClick={() => setDeactivatingUser(user)}
                          className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--icon-red-text)] transition-colors hover:bg-[var(--icon-red-bg)] rounded-lg"
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
            <User className="w-16 h-16 text-[var(--text-tertiary)] mx-auto mb-4" />
            <p className="text-[var(--text-secondary)] text-sm font-medium">
              {searchQuery ? "No users found matching your search." : "No users found."}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowRegistrationModal(true)}
                className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Add First User
              </button>
            )}
          </div>
        )}
      </div>

      {/* User Registration Modal */}
      {showRegistrationModal && (
        <UserRegistrationModal
          onClose={() => setShowRegistrationModal(false)}
          onSuccess={handleRegistrationSuccess}
        />
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <UserEditModal
          user={editingUser}
          onSave={handleEditUser}
          onClose={() => setEditingUser(null)}
          isLoading={isLoading}
        />
      )}

      {/* Deactivate User Modal */}
      {deactivatingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[var(--icon-red-bg)] rounded-lg flex items-center justify-center">
                <Ban className="w-5 h-5 text-[var(--icon-red-text)]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">Deactivate User</h3>
                <p className="text-[var(--text-secondary)] text-sm">
                  This will prevent the user from accessing the system.
                </p>
              </div>
            </div>
            
            <p className="text-[var(--text-secondary)] mb-6 text-sm leading-relaxed">
              Are you sure you want to deactivate <strong className="font-semibold text-[var(--text-primary)]">{deactivatingUser.fullName}</strong>? 
              They will no longer be able to log in to the system.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeactivatingUser(null)}
                className="px-4 py-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeactivateUser}
                disabled={isLoading}
                className="px-4 py-2 bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] rounded-lg hover:bg-[var(--icon-red-text)] hover:text-white disabled:opacity-50 text-sm font-medium"
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