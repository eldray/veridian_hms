// src/components/settings/UserManagementTab.tsx - UPDATED & ALIGNED
import { useState, useEffect } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../../store/toastStore';
import { Search, Plus, User, Mail, Phone, Shield, Edit, Ban, Activity, Loader } from 'lucide-react';

// Import modals
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

  // Clear errors when component unmounts
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
      await updateUser(editingUser.id, userData); // ✅ FIXED: using user.id instead of user._id
      setEditingUser(null);
      success('User Updated', `${userData.fullName || editingUser.fullName} has been updated successfully`);
      await loadUsers(); // Refresh the list
    } catch (err) {
      // Error handled by store
    }
  };

  const handleDeactivateUser = async () => {
    if (!deactivatingUser) return;
    
    try {
      await deactivateUser(deactivatingUser.id); // ✅ FIXED: using user.id instead of user._id
      setDeactivatingUser(null);
      success('User Deactivated', `${deactivatingUser.fullName} has been deactivated`);
    } catch (err) {
      // Error handled by store
    }
  };

  const handleRegistrationSuccess = () => {
    loadUsers(); // Refresh the user list after successful registration
  };

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800 text-sm">
            <span className="font-medium">Error:</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Search and Add User */}
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, username, role, or email..."
              className="w-full pl-10 pr-4 py-2.5 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
          <button
            onClick={() => setShowRegistrationModal(true)}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-600 hover:text-white disabled:opacity-50 transition-all text-sm font-medium"
          >
            {isLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add User
          </button>
        </div>
      </div>

      {/* User List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider hidden sm:table-cell">
                  Contact
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider hidden md:table-cell">
                  License/PIN
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((user: any) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {user.fullName}
                        </div>
                        <div className="text-xs text-gray-500 sm:hidden">
                          @{user.username}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap hidden sm:table-cell">
                    <div className="text-sm text-gray-900">{user.email || '-'}</div>
                    <div className="text-xs text-gray-500">{user.phone || '-'}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                      <Shield className="w-3 h-3 mr-1" />
                      {user.role?.replace('_', ' ').toUpperCase()}
                    </span>
                    {user.specialization && (
                      <div className="text-xs text-gray-500 mt-1">
                        {user.specialization}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 hidden md:table-cell">
                    {user.licenseNumber || '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      user.isActive 
                        ? 'bg-green-100 text-green-800 border border-green-200' 
                        : 'bg-red-100 text-red-800 border border-red-200'
                    }`}>
                      <Activity className="w-3 h-3 mr-1" />
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingUser(user)}
                        disabled={isLoading}
                        className="p-1.5 text-gray-400 hover:text-green-600 transition-colors hover:bg-green-50 rounded-lg disabled:opacity-50"
                        title="Edit User"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {user.isActive && user.id !== currentUser?.id && ( // ✅ FIXED: using user.id
                        <button
                          onClick={() => setDeactivatingUser(user)}
                          disabled={isLoading}
                          className="p-1.5 text-gray-400 hover:text-red-600 transition-colors hover:bg-red-50 rounded-lg disabled:opacity-50"
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
            <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-sm font-medium">
              {searchQuery ? "No users found matching your search." : "No users found."}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowRegistrationModal(true)}
                disabled={isLoading}
                className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-600 hover:text-white transition-colors text-sm disabled:opacity-50"
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
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <Ban className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Deactivate User</h3>
                <p className="text-gray-500 text-sm">
                  This will prevent the user from accessing the system.
                </p>
              </div>
            </div>
            
            <p className="text-gray-500 mb-6 text-sm leading-relaxed">
              Are you sure you want to deactivate <strong className="font-semibold text-gray-900">{deactivatingUser.fullName}</strong>? 
              They will no longer be able to log in to the system.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeactivatingUser(null)}
                disabled={isLoading}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeactivateUser}
                disabled={isLoading}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-600 hover:text-white disabled:opacity-50 text-sm font-medium"
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