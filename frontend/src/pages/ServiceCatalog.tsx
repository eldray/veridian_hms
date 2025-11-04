// src/pages/ServiceCatalog.tsx (continued)
import { useEffect, useState } from 'react';
import { useMedicalServicesStore } from '../store/medicalServicesStore';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import {
  Plus,
  Search,
  Filter,
  ClipboardList,
  Edit,
  Trash2,
  RefreshCw,
  DollarSign,
  Shield,
  Activity,
  FlaskConical,
  Pill,
  Building,
  Stethoscope,
  X,
  Save,
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
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterServiceType, setFilterServiceType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
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
      await Promise.all([getServiceCatalog(), getServiceMetadata()]);
    } catch (error) {
      addToast('Failed to load service catalog', 'error');
    }
  };

  const filteredServices = serviceCatalog.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesServiceType = filterServiceType === 'all' || service.serviceType === filterServiceType;
    const matchesCategory = filterCategory === 'all' || service.category === filterCategory;
    return matchesSearch && matchesServiceType && matchesCategory;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await updateServiceCatalogItem(editingItem._id, formData);
        addToast('Service item updated successfully', 'success');
      } else {
        await createServiceCatalogItem(formData);
        addToast('Service item created successfully', 'success');
      }
      setShowForm(false);
      setEditingItem(null);
      resetForm();
    } catch (error) {
      addToast('Failed to save service item', 'error');
    }
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      code: item.code,
      description: item.description || '',
      serviceType: item.serviceType,
      category: item.category || 'consultation',
      cashPrice: item.cashPrice,
      insurancePrice: item.insurancePrice,
      costPrice: item.costPrice,
      unit: item.unit,
      requiresAuthorization: item.requiresAuthorization,
      tariffCode: item.tariffCode || '',
      vatRate: item.vatRate,
      isTaxable: item.isTaxable,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this service item?')) {
      try {
        await deleteServiceCatalogItem(id);
        addToast('Service item deleted successfully', 'success');
      } catch (error) {
        addToast('Failed to delete service item', 'error');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
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
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingItem(null);
    resetForm();
  };

  const getServiceIcon = (serviceType: string) => {
    switch (serviceType) {
      case 'consultation': return <Stethoscope className="w-5 h-5" />;
      case 'lab_test': return <FlaskConical className="w-5 h-5" />;
      case 'procedure': return <Activity className="w-5 h-5" />;
      case 'medication': return <Pill className="w-5 h-5" />;
      case 'ward': return <Building className="w-5 h-5" />;
      default: return <ClipboardList className="w-5 h-5" />;
    }
  };

  const getServiceColor = (serviceType: string) => {
    switch (serviceType) {
      case 'consultation': return 'bg-blue-100 text-blue-800';
      case 'lab_test': return 'bg-green-100 text-green-800';
      case 'procedure': return 'bg-purple-100 text-purple-800';
      case 'medication': return 'bg-red-100 text-red-800';
      case 'ward': return 'bg-amber-100 text-amber-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriceColor = (cashPrice: number, insurancePrice: number) => {
    if (insurancePrice > cashPrice) return 'text-green-600';
    if (insurancePrice < cashPrice) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-teal-100 rounded-2xl flex items-center justify-center">
            <ClipboardList className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Service Catalog</h1>
            <p className="text-gray-600">Manage all billable services and procedures</p>
          </div>
        </div>
        {user?.role === 'admin' && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Service
          </button>
        )}
      </div>

      {/* Service Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {editingItem ? 'Edit Service' : 'Add New Service'}
              </h2>
              <button
                onClick={handleCancel}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="Enter service name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="Enter unique code"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Type *
                  </label>
                  <select
                    value={formData.serviceType}
                    onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="consultation">Consultation</option>
                    <option value="lab_test">Lab Test</option>
                    <option value="procedure">Procedure</option>
                    <option value="medication">Medication</option>
                    <option value="ward">Ward</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="consultation">Consultation</option>
                    <option value="diagnostic">Diagnostic</option>
                    <option value="procedural">Procedural</option>
                    <option value="pharmacy">Pharmacy</option>
                    <option value="ward">Ward</option>
                    <option value="laboratory">Laboratory</option>
                    <option value="radiology">Radiology</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cash Price (GHS) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.cashPrice}
                    onChange={(e) => setFormData({ ...formData, cashPrice: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Insurance Price (GHS) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.insurancePrice}
                    onChange={(e) => setFormData({ ...formData, insurancePrice: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cost Price (GHS) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unit
                  </label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="e.g., Each, Session, Day"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tariff Code
                  </label>
                  <input
                    type="text"
                    value={formData.tariffCode}
                    onChange={(e) => setFormData({ ...formData, tariffCode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="Enter tariff code"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    VAT Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.vatRate}
                    onChange={(e) => setFormData({ ...formData, vatRate: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Enter service description"
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.requiresAuthorization}
                    onChange={(e) => setFormData({ ...formData, requiresAuthorization: e.target.checked })}
                    className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Requires Authorization</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isTaxable}
                    onChange={(e) => setFormData({ ...formData, isTaxable: e.target.checked })}
                    className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Taxable</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {editingItem ? 'Update Service' : 'Create Service'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search services..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
        <select
          value={filterServiceType}
          onChange={(e) => setFilterServiceType(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
        >
          <option value="all">All Service Types</option>
          <option value="consultation">Consultation</option>
          <option value="lab_test">Lab Test</option>
          <option value="procedure">Procedure</option>
          <option value="medication">Medication</option>
          <option value="ward">Ward</option>
          <option value="other">Other</option>
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
        >
          <option value="all">All Categories</option>
          <option value="consultation">Consultation</option>
          <option value="diagnostic">Diagnostic</option>
          <option value="procedural">Procedural</option>
          <option value="pharmacy">Pharmacy</option>
          <option value="ward">Ward</option>
          <option value="laboratory">Laboratory</option>
          <option value="radiology">Radiology</option>
          <option value="other">Other</option>
        </select>
        <button
          onClick={loadData}
          disabled={isLoading}
          className="px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Services Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-gray-200 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
          <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No services found</p>
          <p className="text-gray-400">Get started by adding your first service</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => (
            <div key={service._id} className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getServiceColor(service.serviceType)}`}>
                    {getServiceIcon(service.serviceType)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{service.name}</h3>
                    <div className="flex gap-2 mt-1">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getServiceColor(service.serviceType)}`}>
                        {service.serviceType.replace('_', ' ')}
                      </span>
                      {service.category && service.category !== 'other' && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {service.category}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {service.requiresAuthorization && (
                  <Shield className="w-5 h-5 text-amber-500" title="Requires Authorization" />
                )}
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Code:</span>
                  <span className="font-mono font-medium">{service.code}</span>
                </div>
                
                {service.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">{service.description}</p>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="flex items-center gap-1 text-gray-600 mb-1">
                      <DollarSign className="w-4 h-4" />
                      <span>Cash Price:</span>
                    </div>
                    <p className="font-medium">GHS {service.cashPrice?.toFixed(2)}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-gray-600 mb-1">
                      <Shield className="w-4 h-4" />
                      <span>Insurance:</span>
                    </div>
                    <p className={`font-medium ${getPriceColor(service.cashPrice, service.insurancePrice)}`}>
                      GHS {service.insurancePrice?.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Cost Price:</span>
                  <span className="font-medium text-gray-900">GHS {service.costPrice?.toFixed(2)}</span>
                </div>

                {service.tariffCode && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Tariff Code:</span>
                    <span className="font-medium">{service.tariffCode}</span>
                  </div>
                )}
              </div>

              {user?.role === 'admin' && (
                <div className="flex gap-2 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => handleEdit(service)}
                    className="flex-1 py-2 text-blue-600 hover:text-blue-800 transition-colors flex items-center justify-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(service._id)}
                    className="flex-1 py-2 text-red-600 hover:text-red-800 transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
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
