// src/components/settings/ServiceCatalogTab.tsx
import { useEffect, useState } from 'react';
import { useMedicalServicesStore } from '../../store/medicalServicesStore';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../../store/toastStore';
import {
  Plus, Search, ClipboardList, Edit, Trash2, RefreshCw,
  DollarSign, Shield, FlaskConical, Pill, Building, Stethoscope,
  X, Save
} from 'lucide-react';

export default function ServiceCatalogTab() {
  const {
    serviceCatalog,
    getServiceCatalog,
    createServiceCatalogItem,
    updateServiceCatalogItem,
    deleteServiceCatalogItem,
    isLoading
  } = useMedicalServicesStore();
  const { user } = useAuthStore();
  const { success, error: toastError } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterServiceType, setFilterServiceType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    nhisServiceCode: '',
    description: '',
    serviceType: 'consultation',
    serviceCategory: 'opd', // Changed from 'category' to 'serviceCategory'
    cashPrice: 0,
    insurancePrice: 0,
    nhisPrice: 0, // Added nhisPrice
    unit: 'Each',
    requiresAuthorization: false,
    tariffCode: '',
    vatRate: 0,
    isTaxable: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await getServiceCatalog();
    } catch (err) {
      toastError('Load failed', 'Could not load service data');
    }
  };

  const filteredServices = serviceCatalog.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (service.description?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesServiceType = filterServiceType === 'all' || service.serviceType === filterServiceType;
    const matchesCategory = filterCategory === 'all' || service.serviceCategory === filterCategory;
    return matchesSearch && matchesServiceType && matchesCategory;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    
    try {
      if (editingItem) {
        if (!editingItem.id) { // Changed from _id to id
          throw new Error('Cannot update service: missing service ID');
        }
        await updateServiceCatalogItem(editingItem.id, formData); // Changed from _id to id
        success('Service Updated', `${formData.name} has been updated successfully`);
      } else {
        await createServiceCatalogItem(formData);
        success('Service Created', `${formData.name} has been added to the catalog`);
      }
      
      resetForm();
      setEditingItem(null);
      setShowForm(false);
      await loadData();
      
    } catch (error: any) {
      toastError('Save Failed', error?.message || 'Could not save service item. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (item: any) => {
    if (!item || !item.id) { // Changed from _id to id
      toastError('Error', 'Cannot edit this service item');
      return;
    }

    setEditingItem(item);
    setFormData({
      name: item.name || '',
      code: item.code || '',
      nhisServiceCode: item.nhisServiceCode || '',
      description: item.description || '',
      serviceType: item.serviceType || 'consultation',
      serviceCategory: item.serviceCategory || 'opd', // Changed from category to serviceCategory
      cashPrice: item.pricing?.cashPrice || 0, // Get from pricing relation
      insurancePrice: item.pricing?.insurancePrice || 0, // Get from pricing relation
      nhisPrice: item.pricing?.nhisPrice || 0, // Get from pricing relation
      unit: item.unit || 'Each',
      requiresAuthorization: item.nhisRequiresAuth || false, // Updated field name
      tariffCode: item.tariffCode || '',
      vatRate: item.pricing?.vatRate || 0, // Get from pricing relation
      isTaxable: item.pricing?.isTaxable !== undefined ? item.pricing.isTaxable : true, // Get from pricing relation
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!id) {
      toastError('Error', 'Cannot delete this service item');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this service?')) return;
    
    try {
      await deleteServiceCatalogItem(id);
      success('Service Deleted', 'Service has been removed successfully');
      await loadData();
    } catch (error: any) {
      toastError('Delete Failed', error?.message || 'Could not delete service. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '', 
      code: '', 
      nhisServiceCode: '',
      description: '', 
      serviceType: 'consultation',
      serviceCategory: 'opd', // Changed from category to serviceCategory
      cashPrice: 0, 
      insurancePrice: 0, 
      nhisPrice: 0,
      unit: 'Each', 
      requiresAuthorization: false, 
      tariffCode: '', 
      vatRate: 0, 
      isTaxable: true
    });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingItem(null);
    resetForm();
  };

  // ✅ FIXED: Safe price display function
  const getPriceDisplay = (service: any, priceType: 'cash' | 'insurance' | 'nhis') => {
    // Try to get price from pricing relation first
    const pricing = service.pricing;
    if (pricing) {
      switch (priceType) {
        case 'cash': return pricing.cashPrice || 0;
        case 'insurance': return pricing.insurancePrice || 0;
        case 'nhis': return pricing.nhisPrice || 0;
        default: return 0;
      }
    }
    
    // Fallback to direct properties (for backward compatibility)
    switch (priceType) {
      case 'cash': return service.cashPrice || 0;
      case 'insurance': return service.insurancePrice || 0;
      case 'nhis': return service.nhisPrice || 0;
      default: return 0;
    }
  };

  const getServiceIcon = (type: string) => {
    const icons: Record<string, JSX.Element> = {
      consultation: <Stethoscope className="w-4 h-4" />,
      lab_test: <FlaskConical className="w-4 h-4" />,
      procedure: <ClipboardList className="w-4 h-4" />,
      medication: <Pill className="w-4 h-4" />,
      ward: <Building className="w-4 h-4" />,
      scan: <ClipboardList className="w-4 h-4" />,
    };
    return icons[type] || <ClipboardList className="w-4 h-4" />;
  };

  const getServiceColor = (type: string) => {
    const colors: Record<string, string> = {
      consultation: 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]',
      lab_test: 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]',
      procedure: 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]',
      medication: 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]',
      ward: 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]',
      scan: 'bg-[var(--icon-orange-bg)] text-[var(--icon-orange-text)]',
    };
    return colors[type] || 'bg-[var(--bg-main)] text-[var(--text-tertiary)]';
  };

  return (
    <div className="space-y-6">
      {/* Search and Add Service */}
      <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search services..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
            />
          </div>
          <select 
            value={filterServiceType} 
            onChange={e => setFilterServiceType(e.target.value)}
            className="px-3 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
          >
            <option value="all">All Types</option>
            {['consultation', 'lab_test', 'procedure', 'medication', 'ward', 'scan', 'other'].map(t => (
              <option key={t} value={t}>{t.replace('_', ' ')}</option>
            ))}
          </select>
          <select 
            value={filterCategory} 
            onChange={e => setFilterCategory(e.target.value)}
            className="px-3 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
          >
            <option value="all">All Categories</option>
            {['opd', 'ipd', 'diagnostics', 'pharmacy', 'other'].map(c => ( // Updated categories to match schema
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button 
            onClick={loadData} 
            disabled={isLoading}
            className="px-4 py-2.5 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {user?.role === 'admin' && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Service
            </button>
          )}
        </div>
      </div>

      {/* Services Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={`skeleton-${i}`} className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] animate-pulse">
              <div className="h-4 bg-[var(--bg-main)] rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-[var(--bg-main)] rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="text-center py-8 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)]">
          <ClipboardList className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-2" />
          <p className="text-[var(--text-secondary)] text-sm">No services found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServices.map(service => (
            <div key={service.id} className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] hover:shadow-sm transition-shadow"> {/* Changed from _id to id */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getServiceColor(service.serviceType)}`}>
                    {getServiceIcon(service.serviceType)}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">{service.name}</h3>
                    <div className="flex gap-1 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded ${getServiceColor(service.serviceType)}`}>
                        {service.serviceType.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
                {service.nhisRequiresAuthorization && <Shield className="w-4 h-4 text-[var(--icon-yellow-text)]" />} {/* Updated field name */}
              </div>
              <div className="space-y-1.5 text-xs mb-3">
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Code:</span>
                  <span className="font-mono font-medium text-[var(--text-primary)]">{service.code}</span>
                </div>
                {service.nhisServiceCode && (
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">NHIS Code:</span>
                    <span className="font-mono font-medium text-[var(--icon-cyan-text)]">{service.nhisServiceCode}</span>
                  </div>
                )}
                {service.description && <p className="text-[var(--text-secondary)] line-clamp-1">{service.description}</p>}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="flex items-center gap-1 text-[var(--text-secondary)] mb-0.5">
                      <DollarSign className="w-3 h-3" /> Cash
                    </div>
                    {/* ✅ FIXED: Using safe price display function */}
                    <p className="font-medium text-[var(--text-primary)]">
                      GHS {getPriceDisplay(service, 'cash').toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-[var(--text-secondary)] mb-0.5">
                      <Shield className="w-3 h-3" /> Insurance
                    </div>
                    {/* ✅ FIXED: Using safe price display function */}
                    <p className="font-medium text-[var(--text-primary)]">
                      GHS {getPriceDisplay(service, 'insurance').toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
              {user?.role === 'admin' && (
  <div className="flex gap-1 pt-2 border-t border-[var(--border-color)]">
    <button 
      onClick={() => handleEdit(service)}
      className="flex-1 py-1.5 text-[var(--icon-green-text)] hover:text-[var(--icon-green-text)]/80 flex items-center justify-center gap-1 text-xs"
    >
      <Edit className="w-3 h-3" /> Edit
    </button>
    <button 
      onClick={() => handleDelete(service.id)}
      className="flex-1 py-1.5 text-[var(--icon-red-text)] hover:text-[var(--icon-red-text)]/80 flex items-center justify-center gap-1 text-xs"
    >
      <Trash2 className="w-3 h-3" /> Delete
    </button>
  </div>
)}
            </div>
          ))}
        </div>
      )}

      {/* Service Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                {editingItem ? 'Edit Service' : 'Add New Service'}
              </h2>
              <button onClick={handleCancel} className="p-1 hover:bg-[var(--bg-main)] rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">Name *</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">Code *</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 text-sm text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">NHIS Code</label>
                  <input 
                    type="text" 
                    value={formData.nhisServiceCode}
                    onChange={e => setFormData({ ...formData, nhisServiceCode: e.target.value })}
                    className="w-full px-3 py-2 text-sm text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">Type *</label>
                  <select 
                    value={formData.serviceType}
                    onChange={e => setFormData({ ...formData, serviceType: e.target.value })}
                    className="w-full px-3 py-2 text-sm text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)]"
                  >
                    {['consultation', 'lab_test', 'procedure', 'medication', 'ward', 'scan', 'other'].map(t => (
                      <option key={t} value={t}>
                        {t.replace('_', ' ').toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">Category</label>
                  <select 
                     value={formData.serviceCategory}
  onChange={e => setFormData({ ...formData, serviceCategory: e.target.value })}
  className="w-full px-3 py-2 text-sm text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)]"
                    >
                    {['opd', 'ipd', 'diagnostics', 'pharmacy', 'other'].map(c => ( // Updated categories
                      <option key={c} value={c}>
                        {c.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">Unit</label>
                  <input 
                    type="text" 
                    value={formData.unit}
                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 text-sm text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">Cash Price *</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    required 
                    value={formData.cashPrice} 
                    onChange={e => setFormData({ ...formData, cashPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">Insurance Price *</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    required 
                    value={formData.insurancePrice} 
                    onChange={e => setFormData({ ...formData, insurancePrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">NHIS Price</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={formData.nhisPrice} 
                    onChange={e => setFormData({ ...formData, nhisPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">Tariff Code</label>
                  <input 
                    type="text" 
                    value={formData.tariffCode}
                    onChange={e => setFormData({ ...formData, tariffCode: e.target.value })}
                    className="w-full px-3 py-2 text-sm text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">VAT Rate %</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={formData.vatRate} 
                    onChange={e => setFormData({ ...formData, vatRate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">Description</label>
                <textarea 
                  rows={2} 
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)]"
                />
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={formData.requiresAuthorization}
                    onChange={e => setFormData({ ...formData, requiresAuthorization: e.target.checked })}
                    className="rounded border-[var(--border-color)] text-[var(--icon-cyan-text)] focus:ring-[var(--icon-cyan-text)] w-4 h-4"
                  />
                  <span className="text-sm text-[var(--text-primary)]">Requires Authorization</span>
                </label>
                
                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={formData.isTaxable}
                    onChange={e => setFormData({ ...formData, isTaxable: e.target.checked })}
                    className="rounded border-[var(--border-color)] text-[var(--icon-cyan-text)] focus:ring-[var(--icon-cyan-text)] w-4 h-4"
                  />
                  <span className="text-sm text-[var(--text-primary)]">Taxable</span>
                </label>
              </div>

              <div className="flex gap-2 pt-3 border-t border-[var(--border-color)]">
                <button 
                  type="submit"
                  disabled={formLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white disabled:opacity-50 text-sm font-medium"
                >
                  <Save className="w-4 h-4" />
                  {formLoading ? 'Saving...' : (editingItem ? 'Update' : 'Create')}
                </button>
                <button 
                  type="button" 
                  onClick={handleCancel}
                  disabled={formLoading}
                  className="px-4 py-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] disabled:opacity-50 text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}