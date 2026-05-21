// src/pages/InsuranceProviders.tsx - UPDATED WITH TOGGLE STATUS
import { useEffect, useState } from 'react';
import { useInsuranceStore } from '../store/insuranceStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Shield,
  Building,
  CheckCircle,
  XCircle,
  RefreshCw,
  Grid3X3,
  List,
  Phone,
  Mail,
  User,
  ArrowLeft,
  Power,
  PowerOff
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function InsuranceProviders() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const {
    providers,
    getInsuranceProviders,
    createInsuranceProvider,
    updateInsuranceProvider,
    deleteInsuranceProvider,
    isLoading
  } = useInsuranceStore();

  const { user } = useAuthStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingProvider, setEditingProvider] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [formData, setFormData] = useState({
    name: '',
    type: 'private' as 'private' | 'nhis',
    coveragePercentage: 80,
    isActive: true,
    contactInfo: { 
      phone: '', 
      email: '', 
      address: '', 
      contactPerson: '' 
    }
  });

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      await getInsuranceProviders();
      success('Data loaded', 'Insurance providers ready');
    } catch {
      toastError('Load failed', 'Could not fetch providers');
    }
  };

  const filteredProviders = providers.filter(provider => {
    const matchesSearch =
      provider.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      provider.contactInfo?.phone?.includes(searchTerm) ||
      provider.contactInfo?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      provider.contactInfo?.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'all' || provider.type === filterType;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && provider.isActive) ||
      (filterStatus === 'inactive' && !provider.isActive);
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProvider) {
        await updateInsuranceProvider(editingProvider.id, formData);
        success('Provider Updated', `${formData.name} updated successfully`);
      } else {
        await createInsuranceProvider(formData);
        success('Provider Created', `${formData.name} added to providers`);
      }
      resetForm();
      await loadProviders();
    } catch (error: any) {
      toastError('Save Failed', error?.message || 'Could not save provider');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingProvider(null);
    setFormData({
      name: '',
      type: 'private',
      coveragePercentage: 80,
      isActive: true,
      contactInfo: { 
        phone: '', 
        email: '', 
        address: '', 
        contactPerson: '' 
      }
    });
  };

  const handleEdit = (provider: any) => {
    setEditingProvider(provider);
    setFormData({
      name: provider.name,
      type: provider.type,
      coveragePercentage: provider.coveragePercentage,
      isActive: provider.isActive,
      contactInfo: provider.contactInfo || { 
        phone: '', 
        email: '', 
        address: '', 
        contactPerson: '' 
      }
    });
    setShowForm(true);
  };

  const handleToggleStatus = async (provider: any) => {
    const newStatus = !provider.isActive;
    const action = newStatus ? 'activate' : 'deactivate';
    
    if (!window.confirm(`Are you sure you want to ${action} ${provider.name}?`)) return;
    
    try {
      await updateInsuranceProvider(provider.id, { isActive: newStatus });
      success('Status Updated', `${provider.name} has been ${action}d`);
      await loadProviders();
    } catch (error: any) {
      toastError('Update Failed', error?.message || 'Could not update provider status');
    }
  };

  const handleDelete = async (provider: any) => {
    if (!provider?.id) {
      toastError('Delete Failed', 'Invalid provider ID');
      return;
    }
    
    if (!window.confirm(`Delete ${provider.name}? This cannot be undone.`)) return;
  
    try {
      await deleteInsuranceProvider(provider.id);
      success('Provider Deleted', 'Insurance provider removed successfully');
      await loadProviders();
    } catch (error: any) {
      toastError('Delete Failed', error?.message || 'Could not remove provider');
    }
  };

  const getProviderStatus = (provider: any) => {
    return provider.isActive ? 'active' : 'inactive';
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-[var(--bg-main)] rounded-xl transition-all duration-200"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--text-primary)]" />
          </button>
          <div className="w-12 h-12 bg-[var(--icon-purple-bg)] rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-[var(--icon-purple-text)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Insurance Providers</h1>
            <p className="text-sm text-[var(--text-secondary)]">Manage insurance coverage and contacts</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/dashboard/insurance-claims')}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all text-sm text-[var(--text-primary)]"
          >
            <Shield className="w-4 h-4" />
            Insurance Claims
          </button>
          {user?.role === 'admin' && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Provider
            </button>
          )}
          <button
            onClick={loadProviders}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all disabled:opacity-50 text-sm text-[var(--text-primary)]"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters and View Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, phone, email, contact person..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-blue-text)] focus:border-[var(--icon-blue-text)] transition-all text-sm"
          />
        </div>
        
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2.5 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-blue-text)] focus:border-[var(--icon-blue-text)] transition-all text-sm"
        >
          <option value="all">All Types</option>
          <option value="nhis">NHIS</option>
          <option value="private">Private</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="px-4 py-2.5 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-blue-text)] focus:border-[var(--icon-blue-text)] transition-all text-sm"
        >
          <option value="all">All Status</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
        
        {/* View Mode Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2.5 border rounded-lg transition ${
              viewMode === 'grid'
                ? 'bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)] border-[var(--icon-blue-text)]'
                : 'bg-[var(--bg-main)] border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)]'
            }`}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2.5 border rounded-lg transition ${
              viewMode === 'list'
                ? 'bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)] border-[var(--icon-blue-text)]'
                : 'bg-[var(--bg-main)] border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)]'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-[var(--bg-card)] rounded-xl p-6 w-full max-w-2xl mt-8 mb-8 shadow-xl border border-[var(--border-color)]">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">
                {editingProvider ? 'Edit Provider' : 'Add New Provider'}
              </h2>
              <button
                onClick={resetForm}
                className="p-2 hover:bg-[var(--bg-main)] rounded-lg transition"
              >
                <XCircle className="w-5 h-5 text-[var(--text-secondary)]" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-blue-text)] focus:border-[var(--icon-blue-text)] transition-all"
                    placeholder="Provider name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Type *</label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'private' | 'nhis' })}
                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-blue-text)] focus:border-[var(--icon-blue-text)] transition-all"
                  >
                    <option value="private">Private</option>
                    <option value="nhis">NHIS</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Coverage % *</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={formData.coveragePercentage}
                    onChange={(e) => setFormData({ ...formData, coveragePercentage: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-blue-text)] focus:border-[var(--icon-blue-text)] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Status</label>
                  <div className="flex items-center gap-4 mt-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        value="true"
                        checked={formData.isActive === true}
                        onChange={() => setFormData({ ...formData, isActive: true })}
                        className="w-4 h-4 text-[var(--icon-green-text)]"
                      />
                      <span className="text-sm text-[var(--text-primary)]">Active</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        value="false"
                        checked={formData.isActive === false}
                        onChange={() => setFormData({ ...formData, isActive: false })}
                        className="w-4 h-4 text-[var(--icon-red-text)]"
                      />
                      <span className="text-sm text-[var(--text-primary)]">Inactive</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="border-t border-[var(--border-color)] pt-5">
                <h3 className="font-medium mb-3 text-[var(--text-primary)]">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Contact Person</label>
                    <input
                      type="text"
                      value={formData.contactInfo.contactPerson}
                      onChange={(e) => setFormData({
                        ...formData,
                        contactInfo: { ...formData.contactInfo, contactPerson: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-blue-text)] focus:border-[var(--icon-blue-text)] transition-all"
                      placeholder="Contact person name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Phone</label>
                    <input
                      type="tel"
                      value={formData.contactInfo.phone}
                      onChange={(e) => setFormData({
                        ...formData,
                        contactInfo: { ...formData.contactInfo, phone: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-blue-text)] focus:border-[var(--icon-blue-text)] transition-all"
                      placeholder="Phone number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Email</label>
                    <input
                      type="email"
                      value={formData.contactInfo.email}
                      onChange={(e) => setFormData({
                        ...formData,
                        contactInfo: { ...formData.contactInfo, email: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-blue-text)] focus:border-[var(--icon-blue-text)] transition-all"
                      placeholder="Email address"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Address</label>
                  <textarea
                    value={formData.contactInfo.address}
                    onChange={(e) => setFormData({
                      ...formData,
                      contactInfo: { ...formData.contactInfo, address: e.target.value }
                    })}
                    rows={2}
                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-blue-text)] focus:border-[var(--icon-blue-text)] transition-all"
                    placeholder="Full address"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2.5 text-[var(--text-secondary)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2.5 bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)] rounded-lg hover:bg-[var(--icon-blue-text)] hover:text-white transition-colors text-sm disabled:opacity-50"
                >
                  {isLoading ? 'Saving...' : (editingProvider ? 'Update' : 'Create')} Provider
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Providers Display */}
      {isLoading ? (
        <div className={viewMode === 'grid' 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" 
          : "space-y-4"
        }>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            viewMode === 'grid' ? (
              <div key={i} className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border-color)] animate-pulse">
                <div className="h-5 bg-[var(--bg-main)] rounded w-3/4 mb-3"></div>
                <div className="h-4 bg-[var(--bg-main)] rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-[var(--bg-main)] rounded w-2/3"></div>
              </div>
            ) : (
              <div key={i} className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border-color)] animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="h-5 bg-[var(--bg-main)] rounded w-1/4"></div>
                  <div className="h-4 bg-[var(--bg-main)] rounded w-1/6"></div>
                </div>
              </div>
            )
          ))}
        </div>
      ) : filteredProviders.length === 0 ? (
        <div className="bg-[var(--bg-card)] rounded-xl p-8 border border-[var(--border-color)] text-center">
          <Shield className="w-14 h-14 text-[var(--text-tertiary)] mx-auto mb-3" />
          <p className="text-[var(--text-secondary)]">No insurance providers found</p>
          <p className="text-[var(--text-tertiary)] text-sm mt-1">Add your first provider to get started</p>
        </div>
      ) : viewMode === 'grid' ? (
        // Grid View
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProviders.map((provider) => (
            <div key={provider.id} className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border-color)] hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                    provider.type === 'nhis' ? 'bg-[var(--icon-green-bg)]' : 'bg-[var(--icon-blue-bg)]'
                  }`}>
                    <Building className={`w-5.5 h-5.5 ${
                      provider.type === 'nhis' ? 'text-[var(--icon-green-text)]' : 'text-[var(--icon-blue-text)]'
                    }`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)] text-sm">{provider.name}</h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                      provider.type === 'nhis'
                        ? 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]'
                        : 'bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)]'
                    }`}>
                      {provider.type.toUpperCase()}
                    </span>
                  </div>
                </div>
                {/* Toggle Status Button */}
                <button
                  onClick={() => handleToggleStatus(provider)}
                  className={`p-2 rounded-lg transition-all ${
                    provider.isActive 
                      ? 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] hover:bg-[var(--icon-green-text)] hover:text-white'
                      : 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] hover:bg-[var(--icon-red-text)] hover:text-white'
                  }`}
                  title={provider.isActive ? 'Deactivate' : 'Activate'}
                >
                  {provider.isActive ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                </button>
              </div>

              <div className="space-y-2 mb-4 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Coverage:</span>
                  <span className="font-medium text-[var(--text-primary)]">{provider.coveragePercentage}%</span>
                </div>
                
                {provider.contactInfo?.contactPerson && (
                  <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <User className="w-3.5 h-3.5" />
                    <span className="flex-1">{provider.contactInfo.contactPerson}</span>
                  </div>
                )}
                
                {provider.contactInfo?.phone && (
                  <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <Phone className="w-3.5 h-3.5" />
                    <span className="flex-1">{provider.contactInfo.phone}</span>
                  </div>
                )}
                
                {provider.contactInfo?.email && (
                  <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <Mail className="w-3.5 h-3.5" />
                    <span className="flex-1 truncate">{provider.contactInfo.email}</span>
                  </div>
                )}
              </div>

              {user?.role === 'admin' && (
                <div className="flex gap-2 pt-3 border-t border-[var(--border-color)]">
                  <button
                    onClick={() => handleEdit(provider)}
                    className="flex-1 py-1.5 text-[var(--icon-blue-text)] border border-[var(--icon-blue-text)] rounded-lg hover:bg-[var(--icon-blue-bg)] transition text-xs flex items-center justify-center gap-1"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(provider)}
                    className="flex-1 py-1.5 text-[var(--icon-red-text)] border border-[var(--icon-red-text)] rounded-lg hover:bg-[var(--icon-red-bg)] transition text-xs flex items-center justify-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        // List View
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Provider</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Type & Coverage</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Status</th>
                  {user?.role === 'admin' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {filteredProviders.map((provider) => (
                  <tr key={provider.id} className="hover:bg-[var(--bg-main)] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          provider.type === 'nhis' ? 'bg-[var(--icon-green-bg)]' : 'bg-[var(--icon-blue-bg)]'
                        }`}>
                          <Building className={`w-5 h-5 ${
                            provider.type === 'nhis' ? 'text-[var(--icon-green-text)]' : 'text-[var(--icon-blue-text)]'
                          }`} />
                        </div>
                        <div>
                          <div className="font-medium text-[var(--text-primary)]">{provider.name}</div>
                          {provider.contactInfo?.contactPerson && (
                            <div className="text-sm text-[var(--text-secondary)] flex items-center gap-1">
                              <User className="w-3.5 h-3.5" />
                              {provider.contactInfo.contactPerson}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          provider.type === 'nhis'
                            ? 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]'
                            : 'bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)]'
                        }`}>
                          {provider.type.toUpperCase()}
                        </span>
                        <span className="text-sm text-[var(--text-secondary)]">
                          {provider.coveragePercentage}% coverage
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1 text-sm">
                        {provider.contactInfo?.phone && (
                          <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                            <Phone className="w-3.5 h-3.5" />
                            {provider.contactInfo.phone}
                          </div>
                        )}
                        {provider.contactInfo?.email && (
                          <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                            <Mail className="w-3.5 h-3.5" />
                            {provider.contactInfo.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleStatus(provider)}
                          className={`p-1.5 rounded-lg transition-all ${
                            provider.isActive 
                              ? 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] hover:bg-[var(--icon-green-text)] hover:text-white'
                              : 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] hover:bg-[var(--icon-red-text)] hover:text-white'
                          }`}
                          title={provider.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {provider.isActive ? <Power className="w-3.5 h-3.5" /> : <PowerOff className="w-3.5 h-3.5" />}
                        </button>
                        <span className={`text-sm ${provider.isActive ? 'text-[var(--icon-green-text)]' : 'text-[var(--icon-red-text)]'}`}>
                          {provider.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </td>
                    {user?.role === 'admin' && (
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(provider)}
                            className="text-[var(--icon-blue-text)] hover:text-[var(--icon-blue-text)] p-2 rounded-lg hover:bg-[var(--icon-blue-bg)] transition"
                            title="Edit provider"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(provider)}
                            className="text-[var(--icon-red-text)] hover:text-[var(--icon-red-text)] p-2 rounded-lg hover:bg-[var(--icon-red-bg)] transition"
                            title="Delete provider"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}