// src/pages/ServiceCatalog.tsx
import { useEffect, useState } from 'react';
import { useMedicalServicesStore } from '../store/medicalServicesStore';
import { useAttendanceStore } from '../store/attendanceStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import {
  Plus, Search, Filter, ClipboardList, Edit, Trash2, RefreshCw,
  DollarSign, Shield, Activity, FlaskConical, Pill, Building, Stethoscope,
  X, Save, TrendingUp, Users, BarChart3
} from 'lucide-react';

export default function ServiceCatalog() {
  const {
    serviceCatalog,
    serviceMetadata,
    getServiceCatalog,
    getServiceMetadata,
    createServiceCatalogItem,
    updateServiceCatalogItem,
    deleteServiceCatalogItem,
    isLoading
  } = useMedicalServicesStore();
  const { attendances, getAttendances } = useAttendanceStore();
  const { user } = useAuthStore();
  const { success, error: toastError } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterServiceType, setFilterServiceType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    nhisServiceCode: '',
    description: '',
    serviceType: 'consultation',
    category: 'consultation',
    cashPrice: 0,
    insurancePrice: 0,
    costPrice: 0,
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
    await Promise.all([
      getServiceCatalog(),
      getServiceMetadata(),
      getAttendances()
    ]);
  } catch (err) {
    console.error('Load data error:', err);
    toastError('Load failed', 'Could not load service data');
  }
};

  // Analytics
  const getServiceUsageAnalytics = () => {
    const analytics = {
      totalServices: serviceCatalog.length,
      byServiceType: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      totalRevenue: 0,
      mostUsedServices: [] as Array<{id: string, name: string, usage: number, revenue: number}>
    };

    serviceCatalog.forEach(service => {
      let usage = 0;
      let revenue = 0;

      attendances.forEach(attendance => {
        const price = attendance.paymentMode === 'cash' ? service.cashPrice : service.insurancePrice;

        if (attendance.diagnoses?.some((d: any) => d.diagnosisId === service.diagnosisId)) {
          usage++; revenue += price;
        }
        if (attendance.labTests?.some((lt: any) => lt.templateId === service.labTestTemplateId)) {
          usage++; revenue += price;
        }
        if (attendance.procedures?.some((p: any) => p.templateId === service.procedureTemplateId)) {
          usage++; revenue += price;
        }
        if (attendance.medications?.some((m: any) => m.stockItemId === service.stockItemId)) {
          usage++; revenue += service.cashPrice;
        }
        if (attendance.servicesRendered?.some((s: any) => s.serviceItemId === service._id)) {
          usage++; revenue += price;
        }
      });

      if (usage > 0) {
        analytics.mostUsedServices.push({ 
          id: service._id,
          name: service.name, 
          usage, 
          revenue 
        });
      }

      analytics.byServiceType[service.serviceType] = (analytics.byServiceType[service.serviceType] || 0) + 1;
      analytics.byCategory[service.category] = (analytics.byCategory[service.category] || 0) + 1;
      analytics.totalRevenue += revenue;
    });

    analytics.mostUsedServices.sort((a, b) => b.usage - a.usage);
    return analytics;
  };

  const serviceAnalytics = getServiceUsageAnalytics();

  const filteredServices = serviceCatalog.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (service.description?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesServiceType = filterServiceType === 'all' || service.serviceType === filterServiceType;
    const matchesCategory = filterCategory === 'all' || service.category === filterCategory;
    return matchesSearch && matchesServiceType && matchesCategory;
  });

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setFormLoading(true);
  
  try {
    if (editingItem) {
      // FIX 1: Validate that editingItem has an _id
      if (!editingItem._id) {
        throw new Error('Cannot update service: missing service ID');
      }
      
      await updateServiceCatalogItem(editingItem._id, formData);
      success('Service Updated', `${formData.name} has been updated successfully`);
    } else {
      await createServiceCatalogItem(formData);
      success('Service Created', `${formData.name} has been added to the catalog`);
    }
    
    // FIX 2: Reset form first, then close modal
    resetForm();
    setEditingItem(null);
    setShowForm(false);
    
    // FIX 3: Reload data with error handling
    await loadData();
    
  } catch (error: any) {
    console.error('Save error:', error);
    toastError(
      'Save Failed', 
      error?.message || 'Could not save service item. Please try again.'
    );
  } finally {
    setFormLoading(false);
  }
};

const handleEdit = (item: any) => {
  // FIX 4: Validate item before editing
  if (!item || !item._id) {
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
    category: item.category || 'consultation',
    cashPrice: item.cashPrice || 0,
    insurancePrice: item.insurancePrice || 0,
    costPrice: item.costPrice || 0,
    unit: item.unit || 'Each',
    requiresAuthorization: item.requiresAuthorization || false,
    tariffCode: item.tariffCode || '',
    vatRate: item.vatRate || 0,
    isTaxable: item.isTaxable !== undefined ? item.isTaxable : true,
  });
  setShowForm(true);
};

const handleDelete = async (id: string) => {
  // FIX 5: Validate ID before deleting
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
    console.error('Delete error:', error);
    toastError(
      'Delete Failed', 
      error?.message || 'Could not delete service. Please try again.'
    );
  }
};

  const resetForm = () => {
    setFormData({
      name: '', 
      code: '', 
      nhisServiceCode: '',
      description: '', 
      serviceType: 'consultation',
      category: 'consultation', 
      cashPrice: 0, 
      insurancePrice: 0, 
      costPrice: 0,
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

  const getServiceIcon = (type: string) => {
    const icons: Record<string, JSX.Element> = {
      consultation: <Stethoscope className="w-4 h-4" />,
      lab_test: <FlaskConical className="w-4 h-4" />,
      procedure: <Activity className="w-4 h-4" />,
      medication: <Pill className="w-4 h-4" />,
      ward: <Building className="w-4 h-4" />,
      scan: <Activity className="w-4 h-4" />,
    };
    return icons[type] || <ClipboardList className="w-4 h-4" />;
  };

  const getServiceColor = (type: string) => {
    const colors: Record<string, string> = {
      consultation: 'bg-blue-100 text-blue-800',
      lab_test: 'bg-green-100 text-green-800',
      procedure: 'bg-purple-100 text-purple-800',
      medication: 'bg-red-100 text-red-800',
      ward: 'bg-amber-100 text-amber-800',
      scan: 'bg-indigo-100 text-indigo-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getPriceColor = (cash: number, ins: number) => {
    if (ins > cash) return 'text-green-600';
    if (ins < cash) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Service Catalog</h1>
            <p className="text-sm text-gray-600">Manage billable services</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            <TrendingUp className="w-4 h-4" />
            Analytics
          </button>
          {user?.role === 'admin' && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Service
            </button>
          )}
        </div>
      </div>

      {/* Analytics Panel */}
      {showAnalytics && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-teal-600" />
            <h2 className="text-lg font-bold text-gray-900">Service Analytics</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {[
              { id: 'total', label: 'Total', value: serviceAnalytics.totalServices, color: 'blue' },
              { id: 'active', label: 'Active', value: serviceAnalytics.mostUsedServices.length, color: 'green' },
              { id: 'revenue', label: 'Revenue', value: `GHS ${serviceAnalytics.totalRevenue.toFixed(2)}`, color: 'purple' },
              { id: 'top-used', label: 'Top Used', value: serviceAnalytics.mostUsedServices[0]?.usage || 0, color: 'amber' },
            ].map(({ id, label, value, color }) => (
              <div key={id} className={`bg-${color}-50 rounded-lg p-3 border border-${color}-200`}>
                <div className="text-lg font-bold text-gray-900">{value}</div>
                <div className="text-xs text-gray-600">{label}</div>
              </div>
            ))}
          </div>
          {serviceAnalytics.mostUsedServices.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Top Services</h3>
              <div className="space-y-2">
                {serviceAnalytics.mostUsedServices.slice(0, 5).map((service, index) => (
                  <div key={service.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-teal-600 bg-teal-100 w-6 h-6 rounded-full flex items-center justify-center">
                        {index + 1}
                      </span>
                      <span className="text-sm font-medium text-gray-900 truncate max-w-[120px]">{service.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-gray-900">GHS {service.revenue.toFixed(2)}</div>
                      <div className="text-xs text-gray-600">{service.usage} uses</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Compact Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-5 w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                {editingItem ? 'Edit Service' : 'Add New Service'}
              </h2>
              <button onClick={handleCancel} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Name */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>

                {/* Code */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Code *</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>

                {/* NHIS Service Code */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">NHIS Code</label>
                  <input 
                    type="text" 
                    value={formData.nhisServiceCode}
                    onChange={e => setFormData({ ...formData, nhisServiceCode: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>

                {/* Service Type */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Type *</label>
                  <select 
                    value={formData.serviceType}
                    onChange={e => setFormData({ ...formData, serviceType: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                  >
                    {['consultation', 'lab_test', 'procedure', 'medication', 'ward', 'scan', 'other'].map(t => (
                      <option key={t} value={t}>
                        {t.replace('_', ' ').toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                  <select 
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                  >
                    {['consultation', 'diagnostic', 'procedural', 'pharmacy', 'ward', 'laboratory', 'radiology', 'other'].map(c => (
                      <option key={c} value={c}>
                        {c.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Unit */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Unit</label>
                  <input 
                    type="text" 
                    value={formData.unit}
                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>

                {/* Cash Price */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Cash Price *</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    required 
                    value={formData.cashPrice} 
                    onChange={e => setFormData({ ...formData, cashPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>

                {/* Insurance Price */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Insurance Price *</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    required 
                    value={formData.insurancePrice} 
                    onChange={e => setFormData({ ...formData, insurancePrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>

                {/* Cost Price */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Cost Price *</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    required 
                    value={formData.costPrice} 
                    onChange={e => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>

                {/* Tariff Code */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tariff Code</label>
                  <input 
                    type="text" 
                    value={formData.tariffCode}
                    onChange={e => setFormData({ ...formData, tariffCode: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>

                {/* VAT Rate */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">VAT Rate %</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={formData.vatRate} 
                    onChange={e => setFormData({ ...formData, vatRate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea 
                  rows={2} 
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              {/* Checkboxes */}
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={formData.requiresAuthorization}
                    onChange={e => setFormData({ ...formData, requiresAuthorization: e.target.checked })}
                    className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">Requires Authorization</span>
                </label>
                
                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={formData.isTaxable}
                    onChange={e => setFormData({ ...formData, isTaxable: e.target.checked })}
                    className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">Taxable</span>
                </label>
              </div>

              {/* Form Actions */}
              <div className="flex gap-2 pt-3 border-t border-gray-200">
                <button 
                  type="submit"
                  disabled={formLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors text-sm font-medium"
                >
                  <Save className="w-4 h-4" />
                  {formLoading ? 'Saving...' : (editingItem ? 'Update' : 'Create')}
                </button>
                <button 
                  type="button" 
                  onClick={handleCancel}
                  disabled={formLoading}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rest of your existing code for filters and services grid remains the same */}
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search services..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-teal-500"
          />
        </div>
        <select 
          value={filterServiceType} 
          onChange={e => setFilterServiceType(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-teal-500"
        >
          <option value="all">All Types</option>
          {['consultation', 'lab_test', 'procedure', 'medication', 'ward', 'scan', 'other'].map(t => (
            <option key={t} value={t}>{t.replace('_', ' ')}</option>
          ))}
        </select>
        <select 
          value={filterCategory} 
          onChange={e => setFilterCategory(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-teal-500"
        >
          <option value="all">All Categories</option>
          {['consultation', 'diagnostic', 'procedural', 'pharmacy', 'ward', 'laboratory', 'radiology', 'other'].map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button 
          onClick={loadData} 
          disabled={isLoading}
          className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Services Grid - Keep your existing grid code */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={`skeleton-${i}`} className="bg-white rounded-xl p-4 border border-gray-200 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-xl border border-gray-200">
          <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No services found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServices.map(service => (
            <div key={service._id} className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getServiceColor(service.serviceType)}`}>
                    {getServiceIcon(service.serviceType)}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{service.name}</h3>
                    <div className="flex gap-1 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded ${getServiceColor(service.serviceType)}`}>
                        {service.serviceType.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
                {service.requiresAuthorization && <Shield className="w-4 h-4 text-amber-500" />}
              </div>
              <div className="space-y-1.5 text-xs mb-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Code:</span>
                  <span className="font-mono font-medium">{service.code}</span>
                </div>

                {/* ADD THIS NHIS CODE DISPLAY */}
{service.nhisServiceCode && (
  <div className="flex justify-between">
    <span className="text-gray-600">NHIS Code:</span>
    <span className="font-mono font-medium text-blue-600">{service.nhisServiceCode}</span>
  </div>
  )}

                {service.description && <p className="text-gray-600 line-clamp-1">{service.description}</p>}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="flex items-center gap-1 text-gray-600 mb-0.5">
                      <DollarSign className="w-3 h-3" /> Cash
                    </div>
                    <p className="font-medium">GHS {service.cashPrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-gray-600 mb-0.5">
                      <Shield className="w-3 h-3" /> Insurance
                    </div>
                    <p className={`font-medium ${getPriceColor(service.cashPrice, service.insurancePrice)}`}>
                      GHS {service.insurancePrice.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
              {user?.role === 'admin' && (
                <div className="flex gap-1 pt-2 border-t border-gray-100">
                  <button 
                    onClick={() => handleEdit(service)}
                    className="flex-1 py-1.5 text-blue-600 hover:text-blue-800 flex items-center justify-center gap-1 text-xs"
                  >
                    <Edit className="w-3 h-3" /> Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(service._id)}
                    className="flex-1 py-1.5 text-red-600 hover:text-red-800 flex items-center justify-center gap-1 text-xs"
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}