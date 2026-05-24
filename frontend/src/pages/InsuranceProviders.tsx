// src/pages/InsuranceProviders.tsx - UPDATED WITH CORPORATE SUPPORT
import { useEffect, useState } from 'react';
import { useInsuranceStore } from '../store/insuranceStore';
import { useCorporateStore } from '../store/corporateStore';
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
  PowerOff,
  Briefcase,
  Users,
  DollarSign,
  CreditCard,
  Wallet,
  Calendar,
  MapPin,
  AlertCircle
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
    isLoading: insuranceLoading
  } = useInsuranceStore();

  const {
    corporateAccounts,
    getCorporateAccounts,
    createCorporateAccount,
    updateCorporateAccount,
    deactivateCorporateAccount,
    getCorporateStatistics,
    statistics: corporateStats,
    isLoading: corporateLoading
  } = useCorporateStore();

  const { user } = useAuthStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'nhis', 'private', 'corporate'
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingProvider, setEditingProvider] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [providerType, setProviderType] = useState<'nhis' | 'private' | 'corporate'>('private');
  const [showAddDropdown, setShowAddDropdown] = useState(false);


  // Form data for Insurance Providers (NHIS/Private)
  const [formData, setFormData] = useState({
    name: '',
    type: 'private' as 'private' | 'nhis' | 'corporate',
    coveragePercentage: 80,
    isActive: true,
    contactInfo: { 
      phone: '', 
      email: '', 
      address: '', 
      contactPerson: '' 
    }
  });

  // Form data for Corporate Account
  const [corporateFormData, setCorporateFormData] = useState({
    companyName: '',
    registrationNumber: '',
    taxId: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    creditLimit: 0,
    paymentTerms: 30,
    discountPercentage: 0,
    isActive: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([
        getInsuranceProviders(),
        getCorporateAccounts(),
        getCorporateStatistics()
      ]);
      success('Data loaded', 'Insurance providers and corporate accounts ready');
    } catch {
      toastError('Load failed', 'Could not fetch data');
    }
  };

  // Combined list of all providers (Insurance + Corporate)
  const allProviders = [
    ...providers.map(p => ({ ...p, _type: 'insurance' as const })),
    ...corporateAccounts.map(c => ({ 
      id: c.id,
      name: c.companyName,
      type: 'corporate' as const,
      coveragePercentage: 100,
      isActive: c.isActive,
      contactInfo: {
        contactPerson: c.contactPerson,
        phone: c.phone,
        email: c.email,
        address: c.address
      },
      corporateDetails: {
        creditLimit: c.creditLimit,
        currentBalance: c.currentBalance,
        paymentTerms: c.paymentTerms,
        discountPercentage: c.discountPercentage,
        employeeCount: c._count?.employees || 0
      },
      _type: 'corporate' as const
    }))
  ];

  const filteredProviders = allProviders.filter(provider => {
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
      if (providerType === 'corporate') {
        // Handle Corporate Account
        if (editingProvider && editingProvider._type === 'corporate') {
          await updateCorporateAccount(editingProvider.id, corporateFormData);
          success('Corporate Account Updated', `${corporateFormData.companyName} updated successfully`);
        } else {
          await createCorporateAccount(corporateFormData);
          success('Corporate Account Created', `${corporateFormData.companyName} added successfully`);
        }
      } else {
        // Handle Insurance Provider (NHIS/Private)
        if (editingProvider && editingProvider._type === 'insurance') {
          await updateInsuranceProvider(editingProvider.id, formData);
          success('Provider Updated', `${formData.name} updated successfully`);
        } else {
          await createInsuranceProvider(formData);
          success('Provider Created', `${formData.name} added to providers`);
        }
      }
      resetForm();
      await loadData();
    } catch (error: any) {
      toastError('Save Failed', error?.message || 'Could not save provider');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingProvider(null);
    setProviderType('private');
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
    setCorporateFormData({
      companyName: '',
      registrationNumber: '',
      taxId: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      creditLimit: 0,
      paymentTerms: 30,
      discountPercentage: 0,
      isActive: true
    });
  };

  const handleEdit = (provider: any) => {
    setEditingProvider(provider);
    
    if (provider.type === 'corporate') {
      setProviderType('corporate');
      setCorporateFormData({
        companyName: provider.name,
        registrationNumber: provider.corporateDetails?.registrationNumber || '',
        taxId: provider.corporateDetails?.taxId || '',
        contactPerson: provider.contactInfo?.contactPerson || '',
        email: provider.contactInfo?.email || '',
        phone: provider.contactInfo?.phone || '',
        address: provider.contactInfo?.address || '',
        creditLimit: provider.corporateDetails?.creditLimit || 0,
        paymentTerms: provider.corporateDetails?.paymentTerms || 30,
        discountPercentage: provider.corporateDetails?.discountPercentage || 0,
        isActive: provider.isActive
      });
    } else {
      setProviderType(provider.type);
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
    }
    setShowForm(true);
  };

  const handleToggleStatus = async (provider: any) => {
    const newStatus = !provider.isActive;
    const action = newStatus ? 'activate' : 'deactivate';
    
    if (!window.confirm(`Are you sure you want to ${action} ${provider.name}?`)) return;
    
    try {
      if (provider.type === 'corporate') {
        if (!newStatus) {
          await deactivateCorporateAccount(provider.id);
        } else {
          await updateCorporateAccount(provider.id, { isActive: true });
        }
      } else {
        await updateInsuranceProvider(provider.id, { isActive: newStatus });
      }
      success('Status Updated', `${provider.name} has been ${action}d`);
      await loadData();
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
      if (provider.type === 'corporate') {
        await deactivateCorporateAccount(provider.id);
        success('Corporate Account Deactivated', 'Account deactivated successfully');
      } else {
        await deleteInsuranceProvider(provider.id);
        success('Provider Deleted', 'Insurance provider removed successfully');
      }
      await loadData();
    } catch (error: any) {
      toastError('Delete Failed', error?.message || 'Could not remove provider');
    }
  };

  const openAddForm = (type: 'nhis' | 'private' | 'corporate') => {
    setProviderType(type);
    setEditingProvider(null);
    setShowForm(true);
  };

  const getProviderIcon = (type: string) => {
    switch (type) {
      case 'nhis': return <Shield className="w-5.5 h-5.5 text-[var(--icon-green-text)]" />;
      case 'corporate': return <Briefcase className="w-5.5 h-5.5 text-[var(--icon-indigo-text)]" />;
      default: return <Building className="w-5.5 h-5.5 text-[var(--icon-blue-text)]" />;
    }
  };

  const getProviderBg = (type: string) => {
    switch (type) {
      case 'nhis': return 'bg-[var(--icon-green-bg)]';
      case 'corporate': return 'bg-[var(--icon-indigo-bg)]';
      default: return 'bg-[var(--icon-blue-bg)]';
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'nhis': return 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]';
      case 'corporate': return 'bg-[var(--icon-indigo-bg)] text-[var(--icon-indigo-text)]';
      default: return 'bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)]';
    }
  };

  const isLoading = insuranceLoading || corporateLoading;

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
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Insurance & Corporate Providers</h1>
            <p className="text-sm text-[var(--text-secondary)]">Manage NHIS, private insurance, and corporate accounts</p>
            {corporateStats && (
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                Corporate: {corporateStats.activeAccounts} active accounts • GHS {corporateStats.totalOutstanding.toFixed(2)} outstanding
              </p>
            )}
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
            <div className="relative">
              <button
                onClick={() => setShowAddDropdown(!showAddDropdown)}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Provider
              </button>
              
              {showAddDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-[var(--bg-card)] rounded-lg shadow-lg border border-[var(--border-color)] z-50">
                  <button
                    onClick={() => { setShowAddDropdown(false); openAddForm('nhis'); }}
                    className="w-full px-4 py-2.5 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-main)] rounded-t-lg flex items-center gap-3 transition-colors"
                  >
                    <Shield className="w-4 h-4 text-[var(--icon-green-text)]" />
                    <span>NHIS Provider</span>
                  </button>
                  <button
                    onClick={() => { setShowAddDropdown(false); openAddForm('private'); }}
                    className="w-full px-4 py-2.5 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-main)] flex items-center gap-3 transition-colors"
                  >
                    <Building className="w-4 h-4 text-[var(--icon-blue-text)]" />
                    <span>Private Insurance</span>
                  </button>
                  <button
                    onClick={() => { setShowAddDropdown(false); openAddForm('corporate'); }}
                    className="w-full px-4 py-2.5 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-main)] rounded-b-lg flex items-center gap-3 transition-colors"
                  >
                    <Briefcase className="w-4 h-4 text-[var(--icon-indigo-text)]" />
                    <span>Corporate Account</span>
                  </button>
                </div>
              )}
            </div>
          )}
          <button
            onClick={loadData}
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
          <option value="corporate">Corporate</option>
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
              <div className="flex items-center gap-2">
                {providerType === 'corporate' ? (
                  <Briefcase className="w-6 h-6 text-[var(--icon-indigo-text)]" />
                ) : providerType === 'nhis' ? (
                  <Shield className="w-6 h-6 text-[var(--icon-green-text)]" />
                ) : (
                  <Building className="w-6 h-6 text-[var(--icon-blue-text)]" />
                )}
                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                  {editingProvider ? 'Edit' : 'Add'} {providerType === 'corporate' ? 'Corporate Account' : providerType === 'nhis' ? 'NHIS Provider' : 'Private Insurance Provider'}
                </h2>
              </div>
              <button
                onClick={resetForm}
                className="p-2 hover:bg-[var(--bg-main)] rounded-lg transition"
              >
                <XCircle className="w-5 h-5 text-[var(--text-secondary)]" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              {providerType === 'corporate' ? (
                // Corporate Account Form
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Company Name *</label>
                      <input
                        type="text"
                        required
                        value={corporateFormData.companyName}
                        onChange={(e) => setCorporateFormData({ ...corporateFormData, companyName: e.target.value })}
                        className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-blue-text)] focus:border-[var(--icon-blue-text)] transition-all"
                        placeholder="Company name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Registration Number</label>
                      <input
                        type="text"
                        value={corporateFormData.registrationNumber}
                        onChange={(e) => setCorporateFormData({ ...corporateFormData, registrationNumber: e.target.value })}
                        className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-blue-text)] focus:border-[var(--icon-blue-text)] transition-all"
                        placeholder="Business registration number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Tax ID</label>
                      <input
                        type="text"
                        value={corporateFormData.taxId}
                        onChange={(e) => setCorporateFormData({ ...corporateFormData, taxId: e.target.value })}
                        className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-blue-text)] focus:border-[var(--icon-blue-text)] transition-all"
                        placeholder="Tax/VAT number"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Contact Person *</label>
                      <input
                        type="text"
                        required
                        value={corporateFormData.contactPerson}
                        onChange={(e) => setCorporateFormData({ ...corporateFormData, contactPerson: e.target.value })}
                        className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-blue-text)] focus:border-[var(--icon-blue-text)] transition-all"
                        placeholder="Contact person name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Email *</label>
                      <input
                        type="email"
                        required
                        value={corporateFormData.email}
                        onChange={(e) => setCorporateFormData({ ...corporateFormData, email: e.target.value })}
                        className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-blue-text)] focus:border-[var(--icon-blue-text)] transition-all"
                        placeholder="contact@company.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Phone *</label>
                      <input
                        type="tel"
                        required
                        value={corporateFormData.phone}
                        onChange={(e) => setCorporateFormData({ ...corporateFormData, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-blue-text)] focus:border-[var(--icon-blue-text)] transition-all"
                        placeholder="Phone number"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Address</label>
                      <textarea
                        value={corporateFormData.address}
                        onChange={(e) => setCorporateFormData({ ...corporateFormData, address: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-blue-text)] focus:border-[var(--icon-blue-text)] transition-all"
                        placeholder="Company address"
                      />
                    </div>
                  </div>

                  <div className="border-t border-[var(--border-color)] pt-5">
                    <h3 className="font-medium mb-3 text-[var(--text-primary)] flex items-center gap-2">
                      <Wallet className="w-4 h-4" />
                      Financial Settings
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Credit Limit (GHS)</label>
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={corporateFormData.creditLimit}
                          onChange={(e) => setCorporateFormData({ ...corporateFormData, creditLimit: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-blue-text)] focus:border-[var(--icon-blue-text)] transition-all"
                        />
                        <p className="text-xs text-[var(--text-tertiary)] mt-1">Maximum monthly credit</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Payment Terms (days)</label>
                        <input
                          type="number"
                          min="0"
                          value={corporateFormData.paymentTerms}
                          onChange={(e) => setCorporateFormData({ ...corporateFormData, paymentTerms: parseInt(e.target.value) || 30 })}
                          className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-blue-text)] focus:border-[var(--icon-blue-text)] transition-all"
                        />
                        <p className="text-xs text-[var(--text-tertiary)] mt-1">Days to pay invoice</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Discount (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={corporateFormData.discountPercentage}
                          onChange={(e) => setCorporateFormData({ ...corporateFormData, discountPercentage: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-blue-text)] focus:border-[var(--icon-blue-text)] transition-all"
                        />
                        <p className="text-xs text-[var(--text-tertiary)] mt-1">Early payment discount</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Status</label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={corporateFormData.isActive === true}
                          onChange={() => setCorporateFormData({ ...corporateFormData, isActive: true })}
                          className="w-4 h-4 text-[var(--icon-green-text)]"
                        />
                        <span className="text-sm text-[var(--text-primary)]">Active</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={corporateFormData.isActive === false}
                          onChange={() => setCorporateFormData({ ...corporateFormData, isActive: false })}
                          className="w-4 h-4 text-[var(--icon-red-text)]"
                        />
                        <span className="text-sm text-[var(--text-primary)]">Inactive</span>
                      </label>
                    </div>
                  </div>
                </>
              ) : (
                // Insurance Provider Form (NHIS/Private)
                <>
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

                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Status</label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={formData.isActive === true}
                          onChange={() => setFormData({ ...formData, isActive: true })}
                          className="w-4 h-4 text-[var(--icon-green-text)]"
                        />
                        <span className="text-sm text-[var(--text-primary)]">Active</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={formData.isActive === false}
                          onChange={() => setFormData({ ...formData, isActive: false })}
                          className="w-4 h-4 text-[var(--icon-red-text)]"
                        />
                        <span className="text-sm text-[var(--text-primary)]">Inactive</span>
                      </label>
                    </div>
                  </div>
                </>
              )}

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
                  {isLoading ? 'Saving...' : (editingProvider ? 'Update' : 'Create')}
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
          <p className="text-[var(--text-secondary)]">No providers found</p>
          <p className="text-[var(--text-tertiary)] text-sm mt-1">Add your first provider to get started</p>
        </div>
      ) : viewMode === 'grid' ? (
        // Grid View
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProviders.map((provider) => (
            <div key={`${provider._type}-${provider.id}`} className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border-color)] hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${getProviderBg(provider.type)}`}>
                    {getProviderIcon(provider.type)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)] text-sm">{provider.name}</h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${getTypeBadge(provider.type)}`}>
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
                {provider.type !== 'corporate' && (
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Coverage:</span>
                    <span className="font-medium text-[var(--text-primary)]">{provider.coveragePercentage}%</span>
                  </div>
                )}
                
                {provider.type === 'corporate' && provider.corporateDetails && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Credit Limit:</span>
                      <span className="font-medium text-[var(--text-primary)]">GHS {provider.corporateDetails.creditLimit.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Current Balance:</span>
                      <span className={`font-medium ${provider.corporateDetails.currentBalance > 0 ? 'text-[var(--icon-red-text)]' : 'text-[var(--icon-green-text)]'}`}>
                        GHS {provider.corporateDetails.currentBalance.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Employees:</span>
                      <span className="font-medium text-[var(--text-primary)]">{provider.corporateDetails.employeeCount || 0}</span>
                    </div>
                  </>
                )}
                
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Status</th>
                  {user?.role === 'admin' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {filteredProviders.map((provider) => (
                  <tr key={`${provider._type}-${provider.id}`} className="hover:bg-[var(--bg-main)] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getProviderBg(provider.type)}`}>
                          {getProviderIcon(provider.type)}
                        </div>
                        <div>
                          <div className="font-medium text-[var(--text-primary)]">{provider.name}</div>
                          {provider.type === 'corporate' && provider.corporateDetails && (
                            <div className="text-xs text-[var(--text-secondary)] flex items-center gap-2 mt-1">
                              <Users className="w-3 h-3" />
                              {provider.corporateDetails.employeeCount || 0} employees
                              <span className="mx-1">•</span>
                              <Wallet className="w-3 h-3" />
                              Limit: GHS {provider.corporateDetails.creditLimit.toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeBadge(provider.type)}`}>
                        {provider.type.toUpperCase()}
                      </span>
                      {provider.type !== 'corporate' && (
                        <div className="text-xs text-[var(--text-secondary)] mt-1">
                          {provider.coveragePercentage}% coverage
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1 text-sm">
                        {provider.contactInfo?.contactPerson && (
                          <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                            <User className="w-3.5 h-3.5" />
                            {provider.contactInfo.contactPerson}
                          </div>
                        )}
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