// src/pages/Departments.tsx - WITH HEAD ASSIGNMENT
import { useEffect, useState } from 'react';
import { useDepartmentStore } from '../store/departmentStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import api from '../api/api';
import {
  Plus,
  Search,
  Building,
  Users,
  Edit,
  Trash2,
  RefreshCw,
  UserCheck,
  Calendar,
  Crown,
  ArrowLeft,
  Grid3x3,
  List,
  Eye,
  MoreVertical,
  CheckCircle,
  XCircle,
  User,
  Mail,
  Phone,
  Clock,
  UserPlus,
  UserMinus,
  Shield
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Departments() {
  const { 
    departments, 
    getDepartments, 
    createDepartment, 
    updateDepartment, 
    deleteDepartment,
    assignDepartmentHead,
    isLoading 
  } = useDepartmentStore();
  const { user } = useAuthStore();
  const { success, error } = useToast();
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [editingDepartment, setEditingDepartment] = useState<any>(null);
  const [showAssignHeadModal, setShowAssignHeadModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<any>(null);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedHeadId, setSelectedHeadId] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#0891b2',
    icon: 'building',
    isActive: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await getDepartments();
    } catch (err) {
      error('Load Failed', 'Failed to load department data');
    }
  };

  const loadAvailableUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await api.get('/users', {
        params: {
          role: ['admin', 'doctor'].join(',')
        }
      });
      const usersData = response.data?.data || response.data || [];
      setAvailableUsers(usersData);
    } catch (err) {
      console.error('Error loading users:', err);
      error('Load Failed', 'Could not load available users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleAssignHead = async () => {
    if (!selectedDepartment || !selectedHeadId) {
      error('Selection Required', 'Please select a department head');
      return;
    }

    try {
      await assignDepartmentHead(selectedDepartment.id, selectedHeadId);
      success('Head Assigned', `${selectedDepartment.name} now has a department head`);
      setShowAssignHeadModal(false);
      setSelectedDepartment(null);
      setSelectedHeadId('');
      await loadData();
    } catch (err: any) {
      error('Assignment Failed', err.message || 'Could not assign department head');
    }
  };

  const handleRemoveHead = async (dept: any) => {
    if (!window.confirm(`Remove ${dept.head?.fullName} as head of ${dept.name}?`)) return;
    
    try {
      await updateDepartment(dept.id, { headId: null });
      success('Head Removed', `${dept.name} no longer has a department head`);
      await loadData();
    } catch (err: any) {
      error('Action Failed', err.message || 'Could not remove department head');
    }
  };

  const filteredDepartments = departments.filter(dept => 
    dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dept.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDepartment) {
        await updateDepartment(editingDepartment.id, formData);
        success('Department Updated', 'Department updated successfully');
      } else {
        await createDepartment(formData);
        success('Department Created', 'Department created successfully');
      }
      setShowForm(false);
      setEditingDepartment(null);
      setFormData({
        name: '',
        description: '',
        color: '#0891b2',
        icon: 'building',
        isActive: true
      });
      await loadData();
    } catch (err) {
      error('Save Failed', 'Failed to save department');
    }
  };

  const handleEdit = (dept: any) => {
    setEditingDepartment(dept);
    setFormData({
      name: dept.name,
      description: dept.description || '',
      color: dept.color || '#0891b2',
      icon: dept.icon || 'building',
      isActive: dept.isActive
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this department? This action cannot be undone.')) {
      try {
        await deleteDepartment(id);
        success('Department Deleted', 'Department deleted successfully');
        await loadData();
      } catch (err) {
        error('Delete Failed', 'Failed to delete department');
      }
    }
  };

  const openAssignHeadModal = async (dept: any) => {
    setSelectedDepartment(dept);
    setSelectedHeadId(dept.head?.id || '');
    await loadAvailableUsers();
    setShowAssignHeadModal(true);
  };

  const getDepartmentIcon = (iconName: string) => {
    const icons: any = {
      building: Building,
      users: Users,
      calendar: Calendar,
      crown: Crown
    };
    return icons[iconName] || Building;
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-[var(--bg-card)] rounded-lg transition-all duration-200 border border-[var(--border-color)]"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--text-primary)]" />
          </button>
          <div className="w-10 h-10 bg-[var(--icon-cyan-bg)] rounded-xl flex items-center justify-center">
            <Building className="w-5 h-5 text-[var(--icon-cyan-text)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Department Management</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">Manage hospital departments, staff, and leadership</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle Buttons */}
          <div className="flex items-center gap-1 bg-[var(--bg-main)] rounded-lg p-1 border border-[var(--border-color)]">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'grid' 
                  ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]' 
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              title="Grid View"
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'list' 
                  ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]' 
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          
          {user?.role === 'admin' && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-3 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Department
            </button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search departments by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
            />
          </div>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="px-4 py-2.5 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Departments Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-secondary)]">
          Showing <span className="font-semibold text-[var(--text-primary)]">{filteredDepartments.length}</span> of{' '}
          <span className="font-semibold text-[var(--text-primary)]">{departments.length}</span> departments
        </p>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className={viewMode === 'grid' 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          : "space-y-3"
        }>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[var(--bg-main)] rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-4 bg-[var(--bg-main)] rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-[var(--bg-main)] rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredDepartments.length === 0 ? (
        <div className="bg-[var(--bg-card)] rounded-xl p-12 text-center shadow-sm border border-[var(--border-color)]">
          <Building className="w-16 h-16 text-[var(--text-tertiary)] mx-auto mb-4 opacity-50" />
          <p className="text-[var(--text-secondary)] text-base mb-2">
            {searchTerm ? 'No departments found matching your search' : 'No departments configured yet'}
          </p>
          <p className="text-[var(--text-tertiary)] text-sm mb-6">Get started by creating your first department</p>
          {user?.role === 'admin' && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Create First Department
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDepartments.map((dept) => {
            const IconComponent = getDepartmentIcon(dept.icon || 'building');
            return (
              <div 
                key={dept.id} 
                className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-sm"
                      style={{ backgroundColor: dept.color || '#0891b2' }}
                    >
                      <IconComponent className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[var(--text-primary)] text-base">{dept.name}</h3>
                      {dept.head && (
                        <div className="flex items-center gap-1 mt-1">
                          <Crown className="w-3 h-3 text-[var(--icon-yellow-text)]" />
                          <span className="text-xs text-[var(--text-secondary)]">{dept.head.fullName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      dept.isActive 
                        ? 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]' 
                        : 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]'
                    }`}>
                      {dept.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                {dept.description && (
                  <p className="text-[var(--text-secondary)] text-sm mb-4 line-clamp-2">{dept.description}</p>
                )}

                <div className="space-y-3 pt-3 border-t border-[var(--border-color)]">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-[var(--text-secondary)]" />
                      <span className="text-[var(--text-secondary)] text-sm">Staff</span>
                    </div>
                    <span className="font-semibold text-[var(--text-primary)] text-sm">{dept._count?.users || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[var(--text-secondary)]" />
                      <span className="text-[var(--text-secondary)] text-sm">Appointments</span>
                    </div>
                    <span className="font-semibold text-[var(--text-primary)] text-sm">{dept._count?.appointments || 0}</span>
                  </div>
                </div>

                {user?.role === 'admin' && (
                  <div className="flex gap-2 mt-4 pt-3 border-t border-[var(--border-color)]">
                    <button
                      onClick={() => openAssignHeadModal(dept)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--icon-yellow-text)] hover:bg-[var(--icon-yellow-bg)] rounded-lg transition-colors"
                    >
                      <Crown className="w-3.5 h-3.5" />
                      {dept.head ? 'Change Head' : 'Assign Head'}
                    </button>
                    <button
                      onClick={() => handleEdit(dept)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--icon-green-text)] hover:bg-[var(--icon-green-bg)] rounded-lg transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(dept.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--icon-red-text)] hover:bg-[var(--icon-red-bg)] rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW - WITH HEAD COLUMN */
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Department</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Head of Department</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Staff</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Appointments</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-secondary)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {filteredDepartments.map((dept) => {
                  const IconComponent = getDepartmentIcon(dept.icon || 'building');
                  return (
                    <tr key={dept.id} className="hover:bg-[var(--bg-main)] transition-colors group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-white flex-shrink-0 shadow-sm"
                            style={{ backgroundColor: dept.color || '#0891b2' }}
                          >
                            <IconComponent className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-medium text-[var(--text-primary)] text-sm">{dept.name}</p>
                            {dept.description && (
                              <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-1">{dept.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {dept.head ? (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-[var(--icon-yellow-bg)] rounded-full flex items-center justify-center">
                              <Crown className="w-3.5 h-3.5 text-[var(--icon-yellow-text)]" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-[var(--text-primary)]">{dept.head.fullName}</p>
                              <p className="text-xs text-[var(--text-secondary)] capitalize">{dept.head.role}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-[var(--text-secondary)] italic">Not assigned</span>
                            {user?.role === 'admin' && (
                              <button
                                onClick={() => openAssignHeadModal(dept)}
                                className="text-xs text-[var(--icon-cyan-text)] hover:text-[var(--icon-cyan-text)]/80 flex items-center gap-1"
                              >
                                <UserPlus className="w-3 h-3" />
                                Assign
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                          <span className="text-sm text-[var(--text-primary)] font-medium">{dept._count?.users || 0}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                          <span className="text-sm text-[var(--text-primary)] font-medium">{dept._count?.appointments || 0}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          dept.isActive 
                            ? 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]' 
                            : 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]'
                        }`}>
                          {dept.isActive ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {dept.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {user?.role === 'admin' && !dept.head && (
                            <button
                              onClick={() => openAssignHeadModal(dept)}
                              className="p-1.5 text-[var(--icon-yellow-text)] hover:bg-[var(--icon-yellow-bg)] rounded-lg transition-colors"
                              title="Assign Department Head"
                            >
                              <Crown className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {user?.role === 'admin' && dept.head && (
                            <button
                              onClick={() => handleRemoveHead(dept)}
                              className="p-1.5 text-[var(--icon-red-text)] hover:bg-[var(--icon-red-bg)] rounded-lg transition-colors"
                              title="Remove Department Head"
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(dept)}
                            className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--icon-green-text)] hover:bg-[var(--icon-green-bg)] rounded-lg transition-colors"
                            title="Edit Department"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          {user?.role === 'admin' && (
                            <button
                              onClick={() => handleDelete(dept.id)}
                              className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--icon-red-text)] hover:bg-[var(--icon-red-bg)] rounded-lg transition-colors"
                              title="Delete Department"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assign Department Head Modal */}
      {showAssignHeadModal && selectedDepartment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-xl p-6 w-full max-w-md border border-[var(--border-color)] shadow-xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-[var(--icon-yellow-bg)] rounded-lg flex items-center justify-center">
                <Crown className="w-5 h-5 text-[var(--icon-yellow-text)]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">Assign Department Head</h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  {selectedDepartment.name}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                  Select Head of Department
                </label>
                <select
                  value={selectedHeadId}
                  onChange={(e) => setSelectedHeadId(e.target.value)}
                  className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] text-sm"
                  disabled={loadingUsers}
                >
                  <option value="">-- Select a user --</option>
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.role?.replace('_', ' ')})
                    </option>
                  ))}
                </select>
                {loadingUsers && (
                  <p className="text-xs text-[var(--text-secondary)] mt-1">Loading users...</p>
                )}
                {availableUsers.length === 0 && !loadingUsers && (
                  <p className="text-xs text-red-500 mt-1">No admin or doctor users available</p>
                )}
              </div>

              <div className="bg-[var(--bg-main)] rounded-lg p-3 border border-[var(--border-color)]">
                <p className="text-xs text-[var(--text-secondary)]">
                  <strong className="text-[var(--text-primary)]">Note:</strong> Department heads must be users with 
                  <strong className="text-[var(--text-primary)]"> Admin</strong> or 
                  <strong className="text-[var(--text-primary)]"> Doctor</strong> roles.
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-5 mt-2 border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => {
                  setShowAssignHeadModal(false);
                  setSelectedDepartment(null);
                  setSelectedHeadId('');
                }}
                className="px-4 py-2 text-[var(--text-primary)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignHead}
                disabled={!selectedHeadId}
                className="px-4 py-2 bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)] rounded-lg hover:bg-[var(--icon-yellow-text)] hover:text-white transition-all text-sm font-medium disabled:opacity-50"
              >
                Assign as Head
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Department Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto border border-[var(--border-color)] shadow-xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-[var(--icon-cyan-bg)] rounded-lg flex items-center justify-center">
                <Building className="w-5 h-5 text-[var(--icon-cyan-text)]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  {editingDepartment ? 'Edit Department' : 'Create New Department'}
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  {editingDepartment ? 'Update department information' : 'Add a new department to the hospital'}
                </p>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                  Department Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-transparent text-sm"
                  placeholder="e.g., Cardiology, Pediatrics"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-transparent text-sm resize-none"
                  placeholder="Enter department description"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                    Color
                  </label>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full h-10 border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] bg-[var(--bg-main)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                    Icon
                  </label>
                  <select
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] text-sm"
                  >
                    <option value="building">Building</option>
                    <option value="users">Users</option>
                    <option value="calendar">Calendar</option>
                    <option value="crown">Crown</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-[var(--icon-cyan-text)] border-[var(--border-color)] rounded focus:ring-[var(--icon-cyan-text)] bg-[var(--bg-main)]"
                />
                <label htmlFor="isActive" className="text-sm text-[var(--text-primary)]">
                  Active Department
                </label>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingDepartment(null);
                    setFormData({
                      name: '',
                      description: '',
                      color: '#0891b2',
                      icon: 'building',
                      isActive: true
                    });
                  }}
                  className="px-4 py-2 text-[var(--text-primary)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium"
                >
                  {editingDepartment ? 'Update Department' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}