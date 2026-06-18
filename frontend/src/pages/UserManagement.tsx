// src/pages/UserManagement.tsx
import { useState, useEffect } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import { Search, Plus, User, Mail, Phone, Shield, Edit, Ban, Hospital, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import UserEditModal from '../components/UserEditModal';

export default function UserManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deactivatingUser, setDeactivatingUser] = useState<User | null>(null);
  
  const { users, getAllUsers, updateUser, deactivateUser, isLoading } = useSettingsStore();
  const { hasRole, user: currentUser } = useAuthStore();
  const { success, error } = useToast(); // TOAST INTEGRATION

  const canManageUsers = hasRole(['admin']);

  useEffect(() => {
    if (canManageUsers) {
      getAllUsers();
    }
  }, [canManageUsers, getAllUsers]);

  const filteredUsers = users.filter((user: User) =>
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
      pharmacist: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
      accounts: 'bg-gray-100 text-gray-800 border border-gray-200',
    };
    return colors[role] || 'bg-gray-100 text-gray-800 border border-gray-200';
  };

  const handleEditUser = async (userData: Partial<User>) => {
    if (!editingUser) return;
    
    try {
      await updateUser(editingUser._id, userData);
      setEditingUser(null);
      success('User Updated', `${userData.fullName || editingUser.fullName} has been updated successfully`);
    } catch (err) {
      error('Update Failed', 'Failed to update user. Please try again.');
      console.error('Failed to update user:', err);
    }
  };

  const handleDeactivateUser = async () => {
    if (!deactivatingUser) return;
    
    try {
      await deactivateUser(deactivatingUser._id);
      setDeactivatingUser(null);
      success('User Deactivated', `${deactivatingUser.fullName} has been deactivated`);
    } catch (err) {
      error('Deactivation Failed', 'Failed to deactivate user. Please try again.');
      console.error('Failed to deactivate user:', err);
    }
  };

  if (!canManageUsers) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-2xl shadow-lg border border-gray-200 p-8 max-w-md w-full">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You need administrator privileges to manage users.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-blue-900 rounded-xl p-6 text-white shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-3">
                <Hospital className="w-6 h-6" />
                User Management
              </h1>
              <p className="text-blue-100 mt-1 text-sm">Manage staff accounts and permissions</p>
            </div>
            <Link
              to="/dashboard/users/register"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-all duration-200 border border-white/20 font-medium text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add User</span>
            </Link>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, username, role, or email..."
              className="w-full pl-10 pr-4 py-2.5 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-sm"
            />
          </div>
        </div>

        {/* User List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden sm:table-cell">
                    Contact
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden lg:table-cell">
                    Department
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden md:table-cell">
                    License/PIN
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user: User) => (
                  <tr key={user._id} className="hover:bg-gray-50 transition-colors">
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
                      {user.seniority && (
                        <div className="text-xs font-medium text-gray-600 mt-1 capitalize">
                          {user.seniority.toLowerCase()}
                        </div>
                      )}
                      {user.specialization && (
                        <div className="text-xs text-gray-500 mt-1">
                          {user.specialization}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 hidden lg:table-cell">
                      {user.department?.name || '—'}
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
                          className="text-blue-600 hover:text-blue-900 p-1.5 rounded-lg hover:bg-blue-50 transition-all duration-200"
                          title="Edit User"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {user.isActive && user._id !== currentUser?._id && (
                          <button
                            onClick={() => setDeactivatingUser(user)}
                            className="text-red-600 hover:text-red-900 p-1.5 rounded-lg hover:bg-red-50 transition-all duration-200"
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
                <Link
                  to="/dashboard/users/register"
                  className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add First User
                </Link>
              )}
            </div>
          )}
        </div>

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
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                    <Ban className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Deactivate User</h3>
                    <p className="text-gray-600 text-sm">
                      This will prevent the user from accessing the system.
                    </p>
                  </div>
                </div>
                
                <p className="text-gray-700 mb-6 text-sm leading-relaxed">
                  Are you sure you want to deactivate <strong className="font-semibold text-gray-900">{deactivatingUser.fullName}</strong>? 
                  They will no longer be able to log in to the system.
                </p>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setDeactivatingUser(null)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeactivateUser}
                    disabled={isLoading}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-all duration-200 font-medium text-sm"
                  >
                    {isLoading ? 'Deactivating...' : 'Deactivate User'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}