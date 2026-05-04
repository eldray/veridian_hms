// src/components/settings/ServiceCatalogTab.tsx - FIXED VERSION

import { useEffect, useState } from 'react';
import { useMedicalServicesStore } from '../../store/medicalServicesStore';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../../store/toastStore';
import {
  Plus, Search, ClipboardList, Edit, Trash2, RefreshCw,
  DollarSign, Shield, FlaskConical, Pill, Building, Stethoscope,
  X, Save, TrendingUp, BarChart3, Filter, ChevronDown,
  Eye, EyeOff, Tag, Clock, AlertCircle, CheckCircle, Layers,
  ChevronLeft, ChevronRight, Loader2
} from 'lucide-react';

export default function ServiceCatalogTab() {
  const {
    serviceCatalog,
    getServiceCatalog,
    createServiceCatalogItem,
    updateServiceCatalogItem,
    deleteServiceCatalogItem,
    isLoading: storeLoading
  } = useMedicalServicesStore();
  const { user } = useAuthStore();
  const { success, error: toastError } = useToast();

  // Local loading state
  const [localLoading, setLocalLoading] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterServiceType, setFilterServiceType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterCoverage, setFilterCoverage] = useState('all');
  
  // UI states
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [formLoading, setFormLoading] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    nhisServiceCode: '',
    description: '',
    serviceType: 'consultation',
    serviceCategory: 'opd',
    cashPrice: 0,
    insurancePrice: 0,
    nhisPrice: 0,
    unit: 'Each',
    requiresAuthorization: false,
    tariffCode: '',
    vatRate: 0,
    isTaxable: true,
  });

  // Combined loading state
  const isLoading = storeLoading || localLoading;

  useEffect(() => {
    loadData();
  }, []);

  // ✅ FIXED: loadData function without undefined setIsLoading
  const loadData = async () => {
    setLocalLoading(true);
    try {
      // Use a high limit to get ALL services
      await getServiceCatalog({ limit: 10000, page: 1 });
      console.log('📊 Service catalog loaded:', serviceCatalog.length);
    } catch (err) {
      console.error('Failed to load service data:', err);
      toastError('Load failed', 'Could not load service data');
    } finally {
      setLocalLoading(false);
    }
  };

  // ✅ ADDED: Force load all services function
  const forceLoadAll = async () => {
    setLocalLoading(true);
    try {
      await getServiceCatalog({ limit: 10000, page: 1 });
      success('Data Loaded', `Loaded ${serviceCatalog.length} services`);
    } catch (err) {
      toastError('Load failed', 'Could not load all services');
    } finally {
      setLocalLoading(false);
    }
  };

  // Enhanced Analytics
  const getServiceAnalytics = () => {
    const byType: Record<string, { count: number; totalCash: number; totalInsurance: number }> = {};
    const byCategory: Record<string, { count: number; totalCash: number; totalInsurance: number }> = {};
    let totalCashValue = 0;
    let totalInsuranceValue = 0;
    let nhisCovered = 0;
    let requiresAuth = 0;

    serviceCatalog.forEach(service => {
      const cashPrice = service.pricing?.cashPrice || 0;
      const insurancePrice = service.pricing?.insurancePrice || 0;
      
      if (!byType[service.serviceType]) {
        byType[service.serviceType] = { count: 0, totalCash: 0, totalInsurance: 0 };
      }
      byType[service.serviceType].count++;
      byType[service.serviceType].totalCash += cashPrice;
      byType[service.serviceType].totalInsurance += insurancePrice;

      if (!byCategory[service.serviceCategory]) {
        byCategory[service.serviceCategory] = { count: 0, totalCash: 0, totalInsurance: 0 };
      }
      byCategory[service.serviceCategory].count++;
      byCategory[service.serviceCategory].totalCash += cashPrice;
      byCategory[service.serviceCategory].totalInsurance += insurancePrice;

      totalCashValue += cashPrice;
      totalInsuranceValue += insurancePrice;
      if (service.isNHISCovered !== false) nhisCovered++;
      if (service.nhisRequiresAuth) requiresAuth++;
    });

    return { 
      byType, 
      byCategory, 
      totalCashValue, 
      totalInsuranceValue, 
      totalServices: serviceCatalog.length,
      nhisCovered,
      requiresAuth,
      coverageRate: serviceCatalog.length > 0 ? (nhisCovered / serviceCatalog.length) * 100 : 0
    };
  };

  const analytics = getServiceAnalytics();

  // Filtered services
  const filteredServices = serviceCatalog.filter(service => {
    const matchesSearch = service.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (service.nhisServiceCode?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (service.description?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesServiceType = filterServiceType === 'all' || service.serviceType === filterServiceType;
    const matchesCategory = filterCategory === 'all' || service.serviceCategory === filterCategory;
    
    let matchesCoverage = true;
    if (filterCoverage === 'nhis_covered') matchesCoverage = service.isNHISCovered !== false;
    if (filterCoverage === 'not_covered') matchesCoverage = service.isNHISCovered === false;
    if (filterCoverage === 'requires_auth') matchesCoverage = service.nhisRequiresAuth === true;
    
    return matchesSearch && matchesServiceType && matchesCategory && matchesCoverage;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredServices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedServices = filteredServices.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    
    try {
      if (editingItem) {
        if (!editingItem.id) throw new Error('Missing service ID');
        await updateServiceCatalogItem(editingItem.id, formData);
        success('Service Updated', `${formData.name} has been updated`);
      } else {
        await createServiceCatalogItem(formData);
        success('Service Created', `${formData.name} has been added`);
      }
      
      resetForm();
      setEditingItem(null);
      setShowForm(false);
      await loadData();
      
    } catch (error: any) {
      toastError('Save Failed', error?.message || 'Could not save service');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (item: any) => {
    if (!item?.id) {
      toastError('Error', 'Cannot edit this service');
      return;
    }

    setEditingItem(item);
    setFormData({
      name: item.name || '',
      code: item.code || '',
      nhisServiceCode: item.nhisServiceCode || '',
      description: item.description || '',
      serviceType: item.serviceType || 'consultation',
      serviceCategory: item.serviceCategory || 'opd',
      cashPrice: item.pricing?.cashPrice || 0,
      insurancePrice: item.pricing?.insurancePrice || 0,
      nhisPrice: item.pricing?.nhisPrice || 0,
      unit: item.unit || 'Each',
      requiresAuthorization: item.nhisRequiresAuth || false,
      tariffCode: item.tariffCode || '',
      vatRate: item.pricing?.vatRate || 0,
      isTaxable: item.pricing?.isTaxable !== undefined ? item.pricing.isTaxable : true,
    });
    setShowForm(true);
  };

  const handleViewDetails = (service: any) => {
    setSelectedService(service);
    setShowDetailModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!id) return;
    if (!window.confirm('Are you sure you want to delete this service?')) return;
    
    try {
      await deleteServiceCatalogItem(id);
      success('Service Deleted', 'Service removed successfully');
      await loadData();
    } catch (error: any) {
      toastError('Delete Failed', error?.message || 'Could not delete service');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '', code: '', nhisServiceCode: '', description: '', serviceType: 'consultation',
      serviceCategory: 'opd', cashPrice: 0, insurancePrice: 0, nhisPrice: 0, unit: 'Each',
      requiresAuthorization: false, tariffCode: '', vatRate: 0, isTaxable: true
    });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingItem(null);
    resetForm();
  };

  const getPriceDisplay = (service: any, priceType: 'cash' | 'insurance' | 'nhis') => {
    const pricing = service.pricing;
    if (pricing) {
      switch (priceType) {
        case 'cash': return pricing.cashPrice || 0;
        case 'insurance': return pricing.insurancePrice || 0;
        case 'nhis': return pricing.nhisPrice || 0;
      }
    }
    return 0;
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
      consultation: 'bg-blue-100 text-blue-700',
      lab_test: 'bg-green-100 text-green-700',
      procedure: 'bg-purple-100 text-purple-700',
      medication: 'bg-red-100 text-red-700',
      ward: 'bg-amber-100 text-amber-700',
      scan: 'bg-indigo-100 text-indigo-700',
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  // Pagination component
  const Pagination = () => {
    if (totalPages <= 1) return null;
    
    const getPageNumbers = () => {
      const pages = [];
      const maxVisible = 5;
      let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
      let endPage = Math.min(totalPages, startPage + maxVisible - 1);
      
      if (endPage - startPage + 1 < maxVisible) {
        startPage = Math.max(1, endPage - maxVisible + 1);
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      return pages;
    };

    return (
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6 rounded-b-xl">
        <div className="flex flex-1 justify-between sm:hidden">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
        
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
              <span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredServices.length)}</span> of{' '}
              <span className="font-medium">{filteredServices.length}</span> results
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <select
              value={itemsPerPage}
              onChange={handleItemsPerPageChange}
              className="text-sm border border-gray-300 rounded-lg px-2 py-1"
            >
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
            
            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              
              {getPageNumbers().map(page => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`relative inline-flex items-center px-3 py-2 text-sm font-semibold ${
                    currentPage === page
                      ? 'z-10 bg-cyan-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600'
                      : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                  }`}
                >
                  {page}
                </button>
              ))}
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </nav>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900">{analytics.totalServices}</p>
              <p className="text-xs text-gray-500">Total Services</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Layers className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-green-600">GHS {analytics.totalCashValue.toFixed(0)}</p>
              <p className="text-xs text-gray-500">Total Value (Cash)</p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-purple-600">GHS {analytics.totalInsuranceValue.toFixed(0)}</p>
              <p className="text-xs text-gray-500">Insurance Value</p>
            </div>
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-cyan-600">{analytics.nhisCovered}</p>
              <p className="text-xs text-gray-500">NHIS Covered</p>
            </div>
            <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-cyan-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-amber-600">{analytics.requiresAuth}</p>
              <p className="text-xs text-gray-500">Need Auth</p>
            </div>
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-indigo-600">{analytics.coverageRate.toFixed(0)}%</p>
              <p className="text-xs text-gray-500">Coverage Rate</p>
            </div>
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search by name, code, NHIS code, or description..." 
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm"
              />
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium"
            >
              <Filter className="w-4 h-4" />
              Filters
              <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
            
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-cyan-100 text-cyan-700' : 'bg-gray-100 text-gray-500'}`}
              >
                <Layers className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-cyan-100 text-cyan-700' : 'bg-gray-100 text-gray-500'}`}
              >
                <ClipboardList className="w-4 h-4" />
              </button>
            </div>
            
            <button 
              onClick={loadData} 
              disabled={isLoading}
              className="px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            
            {/* ✅ ADDED: Force Load All button */}
            <button 
              onClick={forceLoadAll} 
              disabled={isLoading}
              className="px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-all text-sm font-medium"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Load All'}
            </button>
            
            {user?.role === 'admin' && (
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-all text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Service
              </button>
            )}
          </div>
          
          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-4 gap-3">
              <select 
                value={filterServiceType} 
                onChange={e => {
                  setFilterServiceType(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-cyan-500 text-sm"
              >
                <option value="all">All Service Types</option>
                {['consultation', 'lab_test', 'procedure', 'medication', 'ward', 'scan', 'other'].map(t => (
                  <option key={t} value={t}>{t.replace('_', ' ').toUpperCase()}</option>
                ))}
              </select>
              
              <select 
                value={filterCategory} 
                onChange={e => {
                  setFilterCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-cyan-500 text-sm"
              >
                <option value="all">All Categories</option>
                {['opd', 'ipd', 'diagnostics', 'pharmacy', 'other'].map(c => (
                  <option key={c} value={c}>{c.toUpperCase()}</option>
                ))}
              </select>
              
              <select 
                value={filterCoverage} 
                onChange={e => {
                  setFilterCoverage(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-cyan-500 text-sm"
              >
                <option value="all">All Coverage</option>
                <option value="nhis_covered">NHIS Covered</option>
                <option value="not_covered">Not NHIS Covered</option>
                <option value="requires_auth">Requires Authorization</option>
              </select>
              
              <div className="text-sm text-gray-500 flex items-center">
                Showing {filteredServices.length} of {serviceCatalog.length} services
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Services Display */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={`skeleton-${i}`} className="bg-white rounded-xl p-4 border border-gray-200 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">No services found</p>
          <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filters</p>
          <button 
            onClick={forceLoadAll}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Load All Services
          </button>
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {paginatedServices.map(service => (
                  <div 
                    key={service.id} 
                    className="bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => handleViewDetails(service)}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getServiceColor(service.serviceType)}`}>
                            {getServiceIcon(service.serviceType)}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 line-clamp-1">{service.name}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getServiceColor(service.serviceType)}`}>
                              {service.serviceType.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                        {service.nhisRequiresAuth && (
                          <div className="bg-amber-100 p-1 rounded-lg" title="Requires Authorization">
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-2 mb-3">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Code:</span>
                          <span className="font-mono font-medium text-gray-700">{service.code}</span>
                        </div>
                        {service.nhisServiceCode && (
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">NHIS:</span>
                            <span className="font-mono font-medium text-cyan-600">{service.nhisServiceCode}</span>
                          </div>
                        )}
                        {service.description && (
                          <p className="text-xs text-gray-500 line-clamp-2">{service.description}</p>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100">
                        <div className="bg-green-50 rounded-lg p-2 text-center">
                          <p className="text-xs text-gray-500 mb-1">Cash</p>
                          <p className="font-bold text-green-600">GHS {getPriceDisplay(service, 'cash').toFixed(2)}</p>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-2 text-center">
                          <p className="text-xs text-gray-500 mb-1">Insurance</p>
                          <p className="font-bold text-purple-600">GHS {getPriceDisplay(service, 'insurance').toFixed(2)}</p>
                        </div>
                        <div className="bg-cyan-50 rounded-lg p-2 text-center">
                          <p className="text-xs text-gray-500 mb-1">NHIS</p>
                          <p className="font-bold text-cyan-600">GHS {getPriceDisplay(service, 'nhis').toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                    
                    {user?.role === 'admin' && (
                      <div className="flex border-t border-gray-100 divide-x divide-gray-100">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleEdit(service); }}
                          className="flex-1 py-2 text-sm text-amber-600 hover:bg-amber-50 rounded-bl-xl transition-colors"
                        >
                          <Edit className="w-3 h-3 inline mr-1" /> Edit
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDelete(service.id); }}
                          className="flex-1 py-2 text-sm text-red-600 hover:bg-red-50 rounded-br-xl transition-colors"
                        >
                          <Trash2 className="w-3 h-3 inline mr-1" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <Pagination />
            </>
          ) : (
            <>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full">
                  {/* Replace the table header in list view (around line 420-450) */}
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left p-3 text-xs font-semibold text-gray-600">Service</th>
                      <th className="text-left p-3 text-xs font-semibold text-gray-600">Type</th>
                      <th className="text-left p-3 text-xs font-semibold text-gray-600">Code</th>
                      <th className="text-left p-3 text-xs font-semibold text-gray-600">NHIS Code</th>
                      <th className="text-right p-3 text-xs font-semibold text-gray-600">Cash (GHS)</th>
                      <th className="text-right p-3 text-xs font-semibold text-gray-600">Insurance (GHS)</th>
                      <th className="text-right p-3 text-xs font-semibold text-gray-600">NHIS (GHS)</th>
                      <th className="text-center p-3 text-xs font-semibold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedServices.map(service => (
                      <tr key={service.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleViewDetails(service)}>
                        <td className="p-3">
                          <div className="font-medium text-gray-900">{service.name}</div>
                          {service.description && <div className="text-xs text-gray-500 line-clamp-1">{service.description}</div>}
                        </td>
                        <td className="p-3">
                          <span className={`text-xs px-2 py-1 rounded-full ${getServiceColor(service.serviceType)}`}>
                            {service.serviceType.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-xs text-gray-600">{service.code}</td>
                        <td className="p-3 font-mono text-xs text-cyan-600">{service.nhisServiceCode || '-'}</td>
                        <td className="p-3 text-right font-medium text-green-600">GHS {getPriceDisplay(service, 'cash').toFixed(2)}</td>
                        <td className="p-3 text-right font-medium text-purple-600">GHS {getPriceDisplay(service, 'insurance').toFixed(2)}</td>
                        <td className="p-3 text-right font-medium text-cyan-600">GHS {getPriceDisplay(service, 'nhis').toFixed(2)}</td>
                        <td className="p-3 text-center">
                          <div className="flex justify-center gap-2">
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleEdit(service); }}
                              className="p-1 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDelete(service.id); }}
                              className="p-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination />
            </>
          )}
        </>
      )}

      {/* Service Detail Modal - Keep existing */}
      {showDetailModal && selectedService && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getServiceColor(selectedService.serviceType)}`}>
                  {getServiceIcon(selectedService.serviceType)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedService.name}</h2>
                  <p className="text-sm text-gray-500">{selectedService.code}</p>
                </div>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Service Type</label>
                  <p className="text-gray-900 mt-1">{selectedService.serviceType?.replace('_', ' ')}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Category</label>
                  <p className="text-gray-900 mt-1">{selectedService.serviceCategory?.toUpperCase()}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">NHIS Service Code</label>
                  <p className="text-gray-900 mt-1 font-mono">{selectedService.nhisServiceCode || 'Not assigned'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Tariff Code</label>
                  <p className="text-gray-900 mt-1">{selectedService.tariffCode || 'Not assigned'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Unit</label>
                  <p className="text-gray-900 mt-1">{selectedService.unit || 'Each'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Status</label>
                  <p className="text-gray-900 mt-1">
                    {selectedService.isActive !== false ? 
                      <span className="text-green-600">Active</span> : 
                      <span className="text-red-600">Inactive</span>
                    }
                  </p>
                </div>
              </div>
              
              {selectedService.description && (
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Description</label>
                  <p className="text-gray-700 mt-1 text-sm">{selectedService.description}</p>
                </div>
              )}
              
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase mb-2 block">Pricing</label>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-green-600 mb-1">Cash Price</p>
                    <p className="text-xl font-bold text-green-700">GHS {getPriceDisplay(selectedService, 'cash').toFixed(2)}</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-purple-600 mb-1">Insurance Price</p>
                    <p className="text-xl font-bold text-purple-700">GHS {getPriceDisplay(selectedService, 'insurance').toFixed(2)}</p>
                  </div>
                  <div className="bg-cyan-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-cyan-600 mb-1">NHIS Price</p>
                    <p className="text-xl font-bold text-cyan-700">GHS {getPriceDisplay(selectedService, 'nhis').toFixed(2)}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 pt-2">
                {selectedService.nhisRequiresAuth && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs">
                    <AlertCircle className="w-3 h-3" /> Requires Authorization
                  </span>
                )}
                {selectedService.isNHISCovered === false && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs">
                    <EyeOff className="w-3 h-3" /> Not NHIS Covered
                  </span>
                )}
                {selectedService.pricing?.isTaxable && selectedService.pricing?.vatRate > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs">
                    <Tag className="w-3 h-3" /> VAT {selectedService.pricing.vatRate}%
                  </span>
                )}
              </div>
              
              <div className="text-xs text-gray-400 pt-3 border-t border-gray-100">
                <p>Created: {new Date(selectedService.createdAt).toLocaleString()}</p>
                <p>Updated: {new Date(selectedService.updatedAt).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Service Form Modal - Keep existing */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">
                {editingItem ? 'Edit Service' : 'Add New Service'}
              </h2>
              <button onClick={handleCancel} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input 
                    type="text" required value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                  <input 
                    type="text" required value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">NHIS Code</label>
                  <input 
                    type="text" value={formData.nhisServiceCode}
                    onChange={e => setFormData({ ...formData, nhisServiceCode: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service Type *</label>
                  <select 
                    value={formData.serviceType}
                    onChange={e => setFormData({ ...formData, serviceType: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  >
                    {['consultation', 'lab_test', 'procedure', 'medication', 'ward', 'scan', 'other'].map(t => (
                      <option key={t} value={t}>{t.replace('_', ' ').toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select 
                    value={formData.serviceCategory}
                    onChange={e => setFormData({ ...formData, serviceCategory: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  >
                    {['opd', 'ipd', 'diagnostics', 'pharmacy', 'other'].map(c => (
                      <option key={c} value={c}>{c.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <input 
                    type="text" value={formData.unit}
                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cash Price *</label>
                  <input 
                    type="number" step="0.01" required value={formData.cashPrice}
                    onChange={e => setFormData({ ...formData, cashPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Price *</label>
                  <input 
                    type="number" step="0.01" required value={formData.insurancePrice}
                    onChange={e => setFormData({ ...formData, insurancePrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">NHIS Price</label>
                  <input 
                    type="number" step="0.01" value={formData.nhisPrice}
                    onChange={e => setFormData({ ...formData, nhisPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tariff Code</label>
                  <input 
                    type="text" value={formData.tariffCode}
                    onChange={e => setFormData({ ...formData, tariffCode: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">VAT Rate %</label>
                  <input 
                    type="number" step="0.01" value={formData.vatRate}
                    onChange={e => setFormData({ ...formData, vatRate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea 
                  rows={2} value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox" checked={formData.requiresAuthorization}
                    onChange={e => setFormData({ ...formData, requiresAuthorization: e.target.checked })}
                    className="rounded border-gray-300 text-cyan-600 w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">Requires Authorization</span>
                </label>
                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox" checked={formData.isTaxable}
                    onChange={e => setFormData({ ...formData, isTaxable: e.target.checked })}
                    className="rounded border-gray-300 text-cyan-600 w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">Taxable</span>
                </label>
              </div>

              <div className="flex gap-3 pt-3 border-t border-gray-200">
                <button 
                  type="submit"
                  disabled={formLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 text-sm font-medium"
                >
                  <Save className="w-4 h-4" />
                  {formLoading ? 'Saving...' : (editingItem ? 'Update' : 'Create')}
                </button>
                <button 
                  type="button" onClick={handleCancel}
                  disabled={formLoading}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm font-medium"
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