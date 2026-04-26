import { useEffect, useState } from 'react';
import { useDepartmentStore } from '../store/departmentStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
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
  ArrowLeft
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
  const [editingDepartment, setEditingDepartment] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#0891b2', // Changed to match cyan theme
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
      } catch (err) {
        error('Delete Failed', 'Failed to delete department');
      }
    }
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)] rounded-lg transition-all text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Department Management</h1>
            <p className="text-[var(--text-secondary)] text-sm">Manage hospital departments and staff assignments</p>
          </div>
        </div>
        {user?.role === 'admin' && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Department
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search departments..."
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

      {/* Departments Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] animate-pulse">
              <div className="h-4 bg-[var(--bg-main)] rounded w-3/4 mb-3"></div>
              <div className="h-3 bg-[var(--bg-main)] rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-[var(--bg-main)] rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : filteredDepartments.length === 0 ? (
        <div className="bg-[var(--bg-card)] rounded-xl p-8 text-center shadow-sm border border-[var(--border-color)]">
          <Building className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
          <p className="text-[var(--text-secondary)] text-sm mb-2">
            {searchTerm ? 'No departments found' : 'No departments configured yet'}
          </p>
          <p className="text-[var(--text-tertiary)] text-sm mb-4">Get started by creating your first department</p>
          {user?.role === 'admin' && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 text-[var(--icon-cyan-text)] hover:text-[var(--icon-cyan-text)]/80 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Create First Department
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDepartments.map((dept) => {
            const IconComponent = getDepartmentIcon(dept.icon || 'building');
            return (
              <div 
                key={dept.id} 
                className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                      style={{ backgroundColor: dept.color || '#0891b2' }}
                    >
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[var(--text-primary)] text-sm">{dept.name}</h3>
                      {dept.head && (
                        <div className="flex items-center gap-1 mt-1">
                          <Crown className="w-3 h-3 text-[var(--icon-yellow-text)]" />
                          <span className="text-xs text-[var(--text-secondary)]">{dept.head.fullName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {user?.role === 'admin' && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(dept)}
                        className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--icon-green-text)] transition-colors hover:bg-[var(--icon-green-bg)] rounded-lg"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(dept.id)}
                        className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--icon-red-text)] transition-colors hover:bg-[var(--icon-red-bg)] rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Department Description */}
                {dept.description && (
                  <p className="text-[var(--text-secondary)] text-sm mb-4 line-clamp-2">{dept.description}</p>
                )}

                {/* Department Stats */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-[var(--text-secondary)]" />
                      <span className="text-[var(--text-secondary)] text-sm">Staff Members:</span>
                    </div>
                    <span className="font-bold text-[var(--text-primary)] text-sm">{dept._count?.users || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[var(--text-secondary)]" />
                      <span className="text-[var(--text-secondary)] text-sm">Appointments:</span>
                    </div>
                    <span className="font-bold text-[var(--text-primary)] text-sm">{dept._count?.appointments || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--text-secondary)] text-sm">Status:</span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      dept.isActive 
                        ? 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] border border-[var(--icon-green-text)]' 
                        : 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] border border-[var(--icon-red-text)]'
                    }`}>
                      {dept.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Department Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">
              {editingDepartment ? 'Edit Department' : 'Create New Department'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Department Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
                  placeholder="Enter department name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm resize-none"
                  placeholder="Enter department description"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Color
                  </label>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full h-10 border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] bg-[var(--bg-main)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Icon
                  </label>
                  <select
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    className="w-full px-3 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
                  >
                    <option value="building">Building</option>
                    <option value="users">Users</option>
                    <option value="calendar">Calendar</option>
                    <option value="crown">Crown</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
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
                  className="px-4 py-2.5 text-[var(--text-primary)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white text-sm font-medium"
                >
                  {editingDepartment ? 'Update' : 'Create'} Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}