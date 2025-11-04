// src/pages/UserManagement.tsx
import { useState, useEffect } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { useAuthStore } from '../store/authStore';
import { Search, Plus, User, Mail, Phone, Shield, Edit, Ban, Hospital, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import UserEditModal from '../components/UserEditModal';

export default function UserManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deactivatingUser, setDeactivatingUser] = useState<User | null>(null);
  
  const { users, getAllUsers, updateUser, deactivateUser, isLoading } = useSettingsStore();
  const { hasRole, user: currentUser } = useAuthStore();

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
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const handleDeactivateUser = async () => {
    if (!deactivatingUser) return;
    
    try {
      await deactivateUser(deactivatingUser._id);
      setDeactivatingUser(null);
    } catch (error) {
      console.error('Failed to deactivate user:', error);
    }
  };

  if (!canManageUsers) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-6">
        <div className="text-center bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-12">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 text-lg">You need administrator privileges to manage users.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-blue-900 rounded-2xl p-8 text-white shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Hospital className="w-8 h-8" />
                User Management
              </h1>
              <p className="text-blue-100 mt-2">Manage staff accounts and permissions</p>
            </div>
            <Link
              to="/dashboard/users/register"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-all duration-200 border border-white/20 font-semibold"
            >
              <Plus className="w-5 h-5" />
              <span>Add User</span>
            </Link>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, username, role, or email..."
              className="w-full pl-12 pr-4 py-4 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base shadow-sm"
            />
          </div>
        </div>

        {/* User List */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                    License/PIN
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user: User) => (
                  <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                          <User className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-bold text-gray-900">
                            {user.fullName}
                          </div>
                          <div className="text-sm text-gray-500">
                            @{user.username}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{user.email || '-'}</div>
                      <div className="text-sm text-gray-500">{user.phone || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${getRoleColor(user.role)}`}>
                        <Shield className="w-3 h-3 mr-1" />
                        {user.role?.replace('_', ' ').toUpperCase()}
                      </span>
                      {user.specialization && (
                        <div className="text-xs text-gray-500 mt-2">
                          {user.specialization}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.licenseNumber || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                        user.isActive 
                          ? 'bg-green-100 text-green-800 border border-green-200' 
                          : 'bg-red-100 text-red-800 border border-red-200'
                      }`}>
                        <Activity className="w-3 h-3 mr-1" />
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingUser(user)}
                          className="text-blue-600 hover:text-blue-900 p-2 rounded-xl hover:bg-blue-50 transition-all duration-200"
                          title="Edit User"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {user.isActive && user._id !== currentUser?._id && (
                          <button
                            onClick={() => setDeactivatingUser(user)}
                            className="text-red-600 hover:text-red-900 p-2 rounded-xl hover:bg-red-50 transition-all duration-200"
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
            <div className="text-center py-16">
              <User className="w-20 h-20 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg font-medium">
                {searchQuery ? "No users found matching your search." : "No users found."}
              </p>
              {!searchQuery && (
                <Link
                  to="/dashboard/users/register"
                  className="inline-flex items-center gap-2 mt-4 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
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
            <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 max-w-md w-full transform transition-all">
              <div className="p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center shadow-lg">
                    <Ban className="w-7 h-7 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Deactivate User</h3>
                    <p className="text-gray-600 text-sm mt-1">
                      This will prevent the user from accessing the system.
                    </p>
                  </div>
                </div>
                
                <p className="text-gray-700 mb-8 text-base leading-relaxed">
                  Are you sure you want to deactivate <strong className="font-semibold text-gray-900">{deactivatingUser.fullName}</strong>? 
                  They will no longer be able to log in to the system.
                </p>

                <div className="flex justify-end gap-4">
                  <button
                    onClick={() => setDeactivatingUser(null)}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeactivateUser}
                    disabled={isLoading}
                    className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 transition-all duration-200 font-medium shadow-lg shadow-red-200"
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
