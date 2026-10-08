// src/pages/WardManagement.tsx - UPDATED with all backend fields + Grid/List toggle
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWardStore } from '../store/wardStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import {
  Plus,
  Search,
  Building,
  Bed,
  Edit,
  Trash2,
  RefreshCw,
  UserCheck,
  UserX,
  Hospital,
  Users,
  ArrowLeft,
  Loader2,
  DollarSign,
  Shield,
  CheckCircle,
  XCircle,
  TrendingUp,
  Clock,
  AlertTriangle,
  LayoutGrid,
  List,
  MapPin,
  Layers,
  Phone,
  ChevronRight,
  Filter,
  X,
  Info,
  Percent,
  FileText,
  Award,
  KeyRound,
  Stethoscope
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Helper function to get consistent ID
const getEntityId = (entity: { id?: string; _id?: string } | null): string | undefined => {
  return entity?._id || entity?.id;
};

// Format currency
const formatCurrency = (amount: number | string | null | undefined) => {
  if (amount === null || amount === undefined || amount === '') return '—';
  const numericAmount = typeof amount === 'number' ? amount : Number(amount);
  if (!Number.isFinite(numericAmount)) return '—';
  return `GHS ${numericAmount.toFixed(2)}`;
};

type ViewMode = 'grid' | 'list';

export default function WardManagement() {
  const { 
    wards, 
    beds, 
    getWards, 
    getBeds, 
    createWard, 
    updateWard, 
    deleteWard,
    createBed,
    deleteBed,
    isLoading,
    getAvailableBeds,
    availableBeds
  } = useWardStore();
  const { user } = useAuthStore();
  const { success, error } = useToast();
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showWardForm, setShowWardForm] = useState(false);
  const [showBedForm, setShowBedForm] = useState(false);
  const [showWardDetails, setShowWardDetails] = useState(false);
  const [selectedWard, setSelectedWard] = useState<any>(null);
  const [editingWard, setEditingWard] = useState<any>(null);
  const [localLoading, setLocalLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('wardViewMode');
    return (saved as ViewMode) || 'grid';
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // Extended ward form data with all backend fields
  const [wardFormData, setWardFormData] = useState({
    wardName: '',
    wardType: 'general',
    totalBeds: 10,
    description: '',
    location: '',
    floor: '',
    dailyCashRate: 150,
    dailyNHISRate: 120,
    dailyInsuranceRate: 135,
    vatRate: 15,
    isTaxable: true,
    isNHISCovered: true,
    nhisRequiresAuth: false,
    isPrivateInsExempted: false,
    requiresAuthorization: false,
    tariffCode: ''
  });
  
  const [bedFormData, setBedFormData] = useState({
    bedNumber: '',
    wardId: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    localStorage.setItem('wardViewMode', viewMode);
  }, [viewMode]);

  const loadData = async () => {
    setLocalLoading(true);
    try {
      await Promise.all([
        getWards(),
        getBeds(),
        getAvailableBeds().catch(() => null)
      ]);
      success('Data Loaded', 'Ward data refreshed successfully');
    } catch (err: any) {
      error('Load Failed', err.message || 'Failed to load ward data');
    } finally {
      setLocalLoading(false);
    }
  };

  const filteredWards = wards.filter(ward => {
    const matchesSearch = ward.wardName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || ward.wardType === filterType;
    return matchesSearch && matchesType;
  });

  const getWardBeds = (wardId: string) => {
    return beds.filter(bed => bed.wardId === wardId || bed.ward?.id === wardId);
  };

  const getOccupiedBeds = (wardId: string) => {
    return getWardBeds(wardId).filter(bed => bed.isOccupied === true).length;
  };

  const getAvailableBedsCount = (wardId: string) => {
    const wardBeds = getWardBeds(wardId);
    return wardBeds.length - getOccupiedBeds(wardId);
  };

  const handleWardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingWard) {
        await updateWard(getEntityId(editingWard)!, wardFormData);
        success('Ward Updated', 'Ward updated successfully');
      } else {
        await createWard(wardFormData);
        success('Ward Created', 'Ward created successfully');
      }
      setShowWardForm(false);
      setEditingWard(null);
      resetWardForm();
      await loadData();
    } catch (err: any) {
      error('Save Failed', err.response?.data?.message || err.message || 'Failed to save ward');
    }
  };

  const handleBedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createBed(bedFormData);
      success('Bed Created', 'Bed created successfully');
      setShowBedForm(false);
      resetBedForm();
      await getBeds();
    } catch (err: any) {
      error('Create Failed', err.response?.data?.message || err.message || 'Failed to create bed');
    }
  };

  const handleEditWard = (ward: any) => {
    setEditingWard(ward);
    setWardFormData({
      wardName: ward.wardName || '',
      wardType: ward.wardType || 'general',
      totalBeds: ward.totalBeds || 10,
      description: ward.description || '',
      location: ward.location || '',
      floor: ward.floor || '',
      dailyCashRate: ward.dailyCashRate || 150,
      dailyNHISRate: ward.dailyNHISRate || 120,
      dailyInsuranceRate: ward.dailyInsuranceRate || 135,
      vatRate: ward.vatRate || 15,
      isTaxable: ward.isTaxable ?? true,
      isNHISCovered: ward.isNHISCovered ?? true,
      nhisRequiresAuth: ward.nhisRequiresAuth || false,
      isPrivateInsExempted: ward.isPrivateInsExempted || false,
      requiresAuthorization: ward.requiresAuthorization || false,
      tariffCode: ward.tariffCode || ''
    });
    setShowWardForm(true);
  };

  const handleViewWardDetails = (ward: any) => {
    setSelectedWard(ward);
    setShowWardDetails(true);
  };

  const handleDeleteWard = async (ward: any) => {
    const wardId = getEntityId(ward);
    const bedsInWard = getWardBeds(wardId!);
    
    if (bedsInWard.length > 0) {
      if (!confirm(`Ward "${ward.wardName}" has ${bedsInWard.length} bed(s). Delete them as well?`)) {
        return;
      }
    } else {
      if (!confirm(`Are you sure you want to delete "${ward.wardName}"?`)) {
        return;
      }
    }
    
    try {
      await deleteWard(wardId!);
      success('Ward Deleted', 'Ward deleted successfully');
      await loadData();
    } catch (err: any) {
      error('Delete Failed', err.response?.data?.message || err.message || 'Failed to delete ward');
    }
  };

  const handleDeleteBed = async (bed: any) => {
    if (bed.isOccupied) {
      error('Cannot Delete', 'Cannot delete an occupied bed. Please discharge the patient first.');
      return;
    }
    
    if (confirm(`Are you sure you want to delete bed "${bed.bedNumber}"?`)) {
      try {
        await deleteBed(getEntityId(bed)!);
        success('Bed Deleted', 'Bed deleted successfully');
        await getBeds();
      } catch (err: any) {
        error('Delete Failed', err.response?.data?.message || err.message || 'Failed to delete bed');
      }
    }
  };

  const resetWardForm = () => {
    setWardFormData({
      wardName: '',
      wardType: 'general',
      totalBeds: 10,
      description: '',
      location: '',
      floor: '',
      dailyCashRate: 150,
      dailyNHISRate: 120,
      dailyInsuranceRate: 135,
      vatRate: 15,
      isTaxable: true,
      isNHISCovered: true,
      nhisRequiresAuth: false,
      isPrivateInsExempted: false,
      requiresAuthorization: false,
      tariffCode: ''
    });
  };

  const resetBedForm = () => {
    setBedFormData({
      bedNumber: '',
      wardId: '',
    });
  };

  const getWardTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'icu': return 'bg-red-100 text-red-700 border-red-200';
      case 'maternity': return 'bg-pink-100 text-pink-700 border-pink-200';
      case 'pediatric': return 'bg-cyan-100 text-cyan-700 border-cyan-200';
      case 'surgical': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'private': return 'bg-green-100 text-green-700 border-green-200';
      case 'medical': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'emergency': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'isolation': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getWardTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'icu': return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'maternity': return <Users className="w-5 h-5 text-pink-600" />;
      case 'pediatric': return <Users className="w-5 h-5 text-cyan-600" />;
      case 'surgical': return <Stethoscope className="w-5 h-5 text-orange-600" />;
      case 'private': return <Shield className="w-5 h-5 text-green-600" />;
      case 'emergency': return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'isolation': return <Shield className="w-5 h-5 text-purple-600" />;
      default: return <Building className="w-5 h-5 text-teal-600" />;
    }
  };

  const getOccupancyColor = (occupancyRate: number) => {
    if (occupancyRate > 80) return 'bg-red-100 text-red-700';
    if (occupancyRate > 60) return 'bg-yellow-100 text-yellow-700';
    return 'bg-green-100 text-green-700';
  };

  const canManageWards = user?.role === 'admin' || user?.role === 'super_admin';

  // Stats calculation
  const totalBeds = beds.length;
  const totalOccupied = beds.filter(b => b.isOccupied).length;
  const totalAvailable = totalBeds - totalOccupied;
  const overallOccupancy = totalBeds > 0 ? (totalOccupied / totalBeds) * 100 : 0;

  if (localLoading && wards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Loader2 className="w-10 h-10 text-teal-500 animate-spin mb-4" />
        <p className="text-gray-500">Loading wards and beds...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Ward Management</h1>
            <p className="text-gray-500 text-sm mt-0.5">Manage hospital wards and bed allocation</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link
            to="/dashboard/admissions"
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium"
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">View</span> Admissions
          </Link>
          {canManageWards && (
            <button
              onClick={() => setShowWardForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-all text-sm font-medium shadow-sm shadow-teal-600/20"
            >
              <Plus className="w-4 h-4" />
              Add Ward
            </button>
          )}
        </div>
      </div>

      {/* Stats Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 bg-teal-50 rounded-lg flex items-center justify-center">
              <Building className="w-4.5 h-4.5 text-teal-600" />
            </div>
            <span className="text-xs text-gray-400 font-medium">Total</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{wards.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Wards</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
              <Bed className="w-4.5 h-4.5 text-blue-600" />
            </div>
            <span className="text-xs text-gray-400 font-medium">All Beds</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalBeds}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total capacity</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center">
              <UserCheck className="w-4.5 h-4.5 text-green-600" />
            </div>
            <span className="text-xs text-gray-400 font-medium">Available</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{totalAvailable}</p>
          <p className="text-xs text-gray-500 mt-0.5">Ready for use</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${getOccupancyColor(overallOccupancy).replace('text-', 'text-').split(' ')[0]}`}>
              <TrendingUp className="w-4.5 h-4.5 text-gray-700" />
            </div>
            <span className="text-xs text-gray-400 font-medium">Occupancy</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{overallOccupancy.toFixed(0)}%</p>
          <div className="mt-1.5 w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                overallOccupancy > 80 ? 'bg-red-500' : overallOccupancy > 60 ? 'bg-yellow-500' : 'bg-teal-500'
              }`}
              style={{ width: `${Math.min(overallOccupancy, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Search and Filters Toolbar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search wards by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Desktop filters */}
            <div className="hidden lg:flex items-center gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2.5 text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
              >
                <option value="all">All Types</option>
                <option value="general">General</option>
                <option value="private">Private</option>
                <option value="icu">ICU</option>
                <option value="maternity">Maternity</option>
                <option value="pediatric">Pediatric</option>
                <option value="surgical">Surgical</option>
                <option value="medical">Medical</option>
                <option value="emergency">Emergency</option>
                <option value="isolation">Isolation</option>
              </select>

              <button
                onClick={loadData}
                disabled={isLoading}
                className="p-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-all"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>

              {/* View Toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'grid'
                      ? 'bg-white text-teal-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-4 h-4" />
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'list'
                      ? 'bg-white text-teal-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="List View"
                >
                  <List className="w-4 h-4" />
                  List
                </button>
              </div>
            </div>

            {/* Mobile filter toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
            >
              <Filter className="w-4 h-4" />
              Filters
              {filterType !== 'all' && (
                <span className="w-2 h-2 bg-teal-500 rounded-full" />
              )}
            </button>
          </div>

          {/* Mobile filters expanded */}
          {showFilters && (
            <div className="lg:hidden mt-3 pt-3 border-t border-gray-100 space-y-3">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2.5 text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 text-sm"
              >
                <option value="all">All Types</option>
                <option value="general">General</option>
                <option value="private">Private</option>
                <option value="icu">ICU</option>
                <option value="maternity">Maternity</option>
                <option value="pediatric">Pediatric</option>
                <option value="surgical">Surgical</option>
                <option value="medical">Medical</option>
                <option value="emergency">Emergency</option>
                <option value="isolation">Isolation</option>
              </select>
              <div className="flex gap-2">
                <button
                  onClick={loadData}
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      viewMode === 'grid' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      viewMode === 'list' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Active filters indicator */}
          {(searchTerm || filterType !== 'all') && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 flex-wrap">
              <span className="text-xs text-gray-500 font-medium">Active filters:</span>
              {searchTerm && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-teal-50 text-teal-700 rounded-md text-xs font-medium">
                  Search: "{searchTerm}"
                  <button onClick={() => setSearchTerm('')} className="hover:text-teal-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filterType !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-teal-50 text-teal-700 rounded-md text-xs font-medium capitalize">
                  Type: {filterType}
                  <button onClick={() => setFilterType('all')} className="hover:text-teal-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              <span className="text-xs text-gray-400 ml-auto">
                {filteredWards.length} of {wards.length} wards
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Wards Display */}
      {filteredWards.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-200 shadow-sm">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-700 font-medium mb-1">
            {searchTerm || filterType !== 'all' ? 'No wards match your filters' : 'No wards configured yet'}
          </p>
          <p className="text-gray-400 text-sm mb-5">
            {searchTerm || filterType !== 'all' 
              ? 'Try adjusting your search or filters' 
              : 'Get started by creating your first ward'}
          </p>
          {canManageWards && !searchTerm && filterType === 'all' && (
            <button
              onClick={() => setShowWardForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Create First Ward
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* ============ GRID VIEW ============ */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {filteredWards.map((ward) => {
            const wardId = getEntityId(ward)!;
            const wardBeds = getWardBeds(wardId);
            const occupiedBeds = getOccupiedBeds(wardId);
            const availableBedsCount = wardBeds.length - occupiedBeds;
            const occupancyRate = wardBeds.length > 0 ? (occupiedBeds / wardBeds.length) * 100 : 0;
            
            return (
              <div 
                key={wardId} 
                className="bg-white rounded-xl border border-gray-200 hover:border-teal-300 hover:shadow-lg transition-all overflow-hidden cursor-pointer group"
                onClick={() => handleViewWardDetails(ward)}
              >
                {/* Ward Header */}
                <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-teal-100 transition-colors">
                        {getWardTypeIcon(ward.wardType)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-gray-900 truncate">{ward.wardName}</h3>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold mt-1 border ${getWardTypeColor(ward.wardType)}`}>
                          {ward.wardType?.charAt(0).toUpperCase() + ward.wardType?.slice(1) || 'General'}
                        </span>
                      </div>
                    </div>
                    {canManageWards && (
                      <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleEditWard(ward)}
                          className="p-1.5 text-gray-400 hover:text-teal-600 transition-colors hover:bg-teal-50 rounded-lg"
                          title="Edit Ward"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteWard(ward)}
                          className="p-1.5 text-gray-400 hover:text-red-600 transition-colors hover:bg-red-50 rounded-lg"
                          title="Delete Ward"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Ward Stats */}
                <div className="p-4 space-y-3">
                  {/* Occupancy Bar */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-gray-500">Occupancy</span>
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${getOccupancyColor(occupancyRate)}`}>
                        {occupancyRate.toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          occupancyRate > 80 ? 'bg-red-500' : occupancyRate > 60 ? 'bg-yellow-500' : 'bg-teal-500'
                        }`}
                        style={{ width: `${Math.min(occupancyRate, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Bed Stats */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-2 bg-gray-50 rounded-lg">
                      <Bed className="w-3.5 h-3.5 text-gray-500 mx-auto mb-1" />
                      <p className="text-sm font-bold text-gray-900">{wardBeds.length}</p>
                      <p className="text-[10px] text-gray-500">Total</p>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded-lg">
                      <UserCheck className="w-3.5 h-3.5 text-green-600 mx-auto mb-1" />
                      <p className="text-sm font-bold text-green-700">{availableBedsCount}</p>
                      <p className="text-[10px] text-green-600">Free</p>
                    </div>
                    <div className="text-center p-2 bg-red-50 rounded-lg">
                      <UserX className="w-3.5 h-3.5 text-red-600 mx-auto mb-1" />
                      <p className="text-sm font-bold text-red-700">{occupiedBeds}</p>
                      <p className="text-[10px] text-red-600">Used</p>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="bg-gray-50 rounded-lg p-2.5 space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500 flex items-center gap-1">
                        <DollarSign className="w-3 h-3" /> Cash
                      </span>
                      <span className="font-semibold text-gray-900">{formatCurrency(ward.dailyCashRate)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500 flex items-center gap-1">
                        <Shield className="w-3 h-3" /> NHIS
                      </span>
                      <span className="font-semibold text-gray-900">{formatCurrency(ward.dailyNHISRate)}</span>
                    </div>
                  </div>
                  
                  {/* Coverage Badges */}
                  <div className="flex flex-wrap gap-1">
                    {ward.isNHISCovered && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
                        <Shield className="w-2.5 h-2.5" />
                        NHIS
                      </span>
                    )}
                    {!ward.isPrivateInsExempted && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-700 border border-green-100">
                        <CheckCircle className="w-2.5 h-2.5" />
                        Insurance
                      </span>
                    )}
                    {ward.isTaxable && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-50 text-orange-700 border border-orange-100">
                        <Percent className="w-2.5 h-2.5" />
                        VAT {ward.vatRate}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Beds Preview */}
                <div className="border-t border-gray-100 p-3 bg-gray-50/50">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-700 text-xs flex items-center gap-1">
                      <Bed className="w-3 h-3" />
                      Beds ({wardBeds.length})
                    </h4>
                    {canManageWards && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedWard(ward);
                          setBedFormData({ bedNumber: '', wardId: wardId });
                          setShowBedForm(true);
                        }}
                        className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-700 font-medium text-[10px] transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        Add
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-6 gap-1.5">
                    {wardBeds.slice(0, 6).map((bed) => (
                      <div
                        key={getEntityId(bed)}
                        className={`relative group/bed p-1.5 rounded text-center text-[10px] font-bold transition-all ${
                          bed.isOccupied
                            ? 'bg-red-100 text-red-700 border border-red-200'
                            : 'bg-green-100 text-green-700 border border-green-200'
                        }`}
                        title={bed.isOccupied ? `Occupied by ${bed.currentPatient?.fullName || 'patient'}` : 'Available'}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {bed.bedNumber}
                        {canManageWards && !bed.isOccupied && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteBed(bed);
                            }}
                            className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white rounded-full flex items-center justify-center text-[8px] opacity-0 group-hover/bed:opacity-100 transition-opacity hover:bg-red-600"
                            title="Delete Bed"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                    {wardBeds.length > 6 && (
                      <div className="p-1.5 rounded text-center text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                        +{wardBeds.length - 6}
                      </div>
                    )}
                    {wardBeds.length === 0 && (
                      <div className="col-span-6 text-center text-[10px] text-gray-400 py-2">
                        No beds configured
                      </div>
                    )}
                  </div>
                </div>

                {/* Click indicator */}
                <div className="px-3 py-2 bg-teal-50/50 border-t border-teal-100 flex items-center justify-center gap-1 text-[10px] text-teal-700 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Click to view details
                  <ChevronRight className="w-3 h-3" />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ============ LIST VIEW ============ */
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* List Header - Desktop only */}
          <div className="hidden lg:grid grid-cols-12 gap-4 px-5 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <div className="col-span-3">Ward</div>
            <div className="col-span-1 text-center">Beds</div>
            <div className="col-span-2 text-center">Availability</div>
            <div className="col-span-2">Pricing</div>
            <div className="col-span-2">Coverage</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          <div className="divide-y divide-gray-100">
            {filteredWards.map((ward) => {
              const wardId = getEntityId(ward)!;
              const wardBeds = getWardBeds(wardId);
              const occupiedBeds = getOccupiedBeds(wardId);
              const availableBedsCount = wardBeds.length - occupiedBeds;
              const occupancyRate = wardBeds.length > 0 ? (occupiedBeds / wardBeds.length) * 100 : 0;

              return (
                <div
                  key={wardId}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 px-4 lg:px-5 py-4 hover:bg-teal-50/30 transition-colors cursor-pointer group items-center"
                  onClick={() => handleViewWardDetails(ward)}
                >
                  {/* Ward info */}
                  <div className="lg:col-span-3 flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-teal-100 transition-colors">
                      {getWardTypeIcon(ward.wardType)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-gray-900 truncate text-sm">{ward.wardName}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${getWardTypeColor(ward.wardType)}`}>
                          {ward.wardType?.charAt(0).toUpperCase() + ward.wardType?.slice(1) || 'General'}
                        </span>
                        {ward.location && (
                          <span className="text-[10px] text-gray-400 flex items-center gap-0.5 truncate">
                            <MapPin className="w-2.5 h-2.5" />
                            {ward.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Beds count */}
                  <div className="lg:col-span-1 flex lg:justify-center items-center gap-2">
                    <span className="lg:hidden text-xs text-gray-500">Total Beds:</span>
                    <span className="text-sm font-bold text-gray-900 flex items-center gap-1">
                      <Bed className="w-3.5 h-3.5 text-gray-400" />
                      {wardBeds.length}
                    </span>
                  </div>

                  {/* Availability */}
                  <div className="lg:col-span-2">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-green-500 rounded-full" />
                        <span className="text-xs font-medium text-gray-700">{availableBedsCount} free</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-red-500 rounded-full" />
                        <span className="text-xs font-medium text-gray-700">{occupiedBeds} used</span>
                      </div>
                    </div>
                    <div className="mt-1.5 w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          occupancyRate > 80 ? 'bg-red-500' : occupancyRate > 60 ? 'bg-yellow-500' : 'bg-teal-500'
                        }`}
                        style={{ width: `${Math.min(occupancyRate, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="lg:col-span-2 flex lg:block items-center gap-4">
                    <div className="text-xs">
                      <span className="text-gray-500">Cash: </span>
                      <span className="font-semibold text-gray-900">{formatCurrency(ward.dailyCashRate)}</span>
                    </div>
                    <div className="text-xs lg:mt-1">
                      <span className="text-gray-500">NHIS: </span>
                      <span className="font-semibold text-gray-900">{formatCurrency(ward.dailyNHISRate)}</span>
                    </div>
                  </div>

                  {/* Coverage */}
                  <div className="lg:col-span-2 flex flex-wrap gap-1">
                    {ward.isNHISCovered && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
                        <Shield className="w-2.5 h-2.5" />
                        NHIS
                      </span>
                    )}
                    {!ward.isPrivateInsExempted && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-700 border border-green-100">
                        <CheckCircle className="w-2.5 h-2.5" />
                        Insurance
                      </span>
                    )}
                    {ward.isTaxable && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-50 text-orange-700 border border-orange-100">
                        <Percent className="w-2.5 h-2.5" />
                        VAT {ward.vatRate}%
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="lg:col-span-2 flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    {canManageWards && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedWard(ward);
                            setBedFormData({ bedNumber: '', wardId: wardId });
                            setShowBedForm(true);
                          }}
                          className="p-2 text-gray-400 hover:text-teal-600 transition-colors hover:bg-teal-50 rounded-lg"
                          title="Add Bed"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditWard(ward)}
                          className="p-2 text-gray-400 hover:text-teal-600 transition-colors hover:bg-teal-50 rounded-lg"
                          title="Edit Ward"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteWard(ward)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors hover:bg-red-50 rounded-lg"
                          title="Delete Ward"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-teal-500 transition-colors ml-1" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Ward Details Modal */}
      {showWardDetails && selectedWard && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center">
                  {getWardTypeIcon(selectedWard.wardType)}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{selectedWard.wardName}</h2>
                  <p className="text-xs text-gray-500 capitalize">{selectedWard.wardType} Ward</p>
                </div>
              </div>
              <button 
                onClick={() => setShowWardDetails(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              {/* Bed Statistics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <Bed className="w-5 h-5 text-blue-600 mx-auto mb-1.5" />
                  <p className="text-2xl font-bold text-blue-700">{getWardBeds(getEntityId(selectedWard)!).length}</p>
                  <p className="text-[11px] text-blue-600 font-medium">Total Beds</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-xl border border-green-100">
                  <UserCheck className="w-5 h-5 text-green-600 mx-auto mb-1.5" />
                  <p className="text-2xl font-bold text-green-700">{getAvailableBedsCount(getEntityId(selectedWard)!)}</p>
                  <p className="text-[11px] text-green-600 font-medium">Available</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-xl border border-red-100">
                  <UserX className="w-5 h-5 text-red-600 mx-auto mb-1.5" />
                  <p className="text-2xl font-bold text-red-700">{getOccupiedBeds(getEntityId(selectedWard)!)}</p>
                  <p className="text-[11px] text-red-600 font-medium">Occupied</p>
                </div>
              </div>

              {/* Basic Info */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                  <Info className="w-4 h-4 text-teal-600" />
                  Basic Information
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-[11px] text-gray-500 mb-0.5">Location</p>
                    <p className="font-semibold text-gray-900 text-sm">{selectedWard.location || 'Not specified'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-[11px] text-gray-500 mb-0.5">Floor</p>
                    <p className="font-semibold text-gray-900 text-sm">{selectedWard.floor || 'Not specified'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg col-span-2">
                    <p className="text-[11px] text-gray-500 mb-0.5">Tariff Code</p>
                    <p className="font-semibold text-gray-900 text-sm">{selectedWard.tariffCode || 'Not specified'}</p>
                  </div>
                </div>
              </div>

              {/* Pricing Details */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                  <DollarSign className="w-4 h-4 text-teal-600" />
                  Pricing & Rates
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gradient-to-br from-teal-50 to-white p-3 rounded-lg border border-teal-100">
                    <p className="text-[11px] text-teal-600 font-medium mb-0.5">Daily Cash Rate</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(selectedWard.dailyCashRate)}</p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-white p-3 rounded-lg border border-blue-100">
                    <p className="text-[11px] text-blue-600 font-medium mb-0.5">Daily NHIS Rate</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(selectedWard.dailyNHISRate)}</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-white p-3 rounded-lg border border-green-100">
                    <p className="text-[11px] text-green-600 font-medium mb-0.5">Daily Insurance Rate</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(selectedWard.dailyInsuranceRate)}</p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-white p-3 rounded-lg border border-orange-100">
                    <p className="text-[11px] text-orange-600 font-medium mb-0.5">VAT Rate</p>
                    <p className="text-lg font-bold text-gray-900">{selectedWard.vatRate || 0}%</p>
                  </div>
                </div>
              </div>

              {/* Coverage Details */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                  <Shield className="w-4 h-4 text-teal-600" />
                  Insurance Coverage
                </h3>
                <div className="bg-gray-50 rounded-lg divide-y divide-gray-100">
                  {[
                    { label: 'NHIS Covered', value: selectedWard.isNHISCovered },
                    { label: 'NHIS Requires Authorization', value: selectedWard.nhisRequiresAuth },
                    { label: 'Private Insurance Exempted', value: selectedWard.isPrivateInsExempted },
                    { label: 'Requires Authorization', value: selectedWard.requiresAuthorization },
                    { label: 'Taxable', value: selectedWard.isTaxable },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2.5">
                      <span className="text-sm text-gray-600">{item.label}</span>
                      {item.value ? (
                        <span className="text-green-600 flex items-center gap-1 text-xs font-medium">
                          <CheckCircle className="w-3.5 h-3.5" /> Yes
                        </span>
                      ) : (
                        <span className="text-gray-400 flex items-center gap-1 text-xs font-medium">
                          <XCircle className="w-3.5 h-3.5" /> No
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Description */}
              {selectedWard.description && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4 text-teal-600" />
                    Description
                  </h3>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{selectedWard.description}</p>
                </div>
              )}

              {/* Beds Grid */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                  <Bed className="w-4 h-4 text-teal-600" />
                  All Beds ({getWardBeds(getEntityId(selectedWard)!).length})
                </h3>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {getWardBeds(getEntityId(selectedWard)!).map((bed) => (
                    <div
                      key={getEntityId(bed)}
                      className={`p-2.5 rounded-lg text-center text-xs font-bold transition-all ${
                        bed.isOccupied
                          ? 'bg-red-100 text-red-700 border border-red-200'
                          : 'bg-green-100 text-green-700 border border-green-200'
                      }`}
                      title={bed.isOccupied ? `Occupied by ${bed.currentPatient?.fullName || 'patient'}` : 'Available'}
                    >
                      {bed.bedNumber}
                    </div>
                  ))}
                  {getWardBeds(getEntityId(selectedWard)!).length === 0 && (
                    <div className="col-span-full text-center text-xs text-gray-400 py-4">
                      No beds configured for this ward
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            {canManageWards && (
              <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-2 rounded-b-2xl">
                <button
                  onClick={() => {
                    setShowWardDetails(false);
                    setSelectedWard(null);
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    const ward = selectedWard;
                    setShowWardDetails(false);
                    handleEditWard(ward);
                  }}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit Ward
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ward Form Modal */}
      {showWardForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-teal-50 rounded-lg flex items-center justify-center">
                  {editingWard ? <Edit className="w-4.5 h-4.5 text-teal-600" /> : <Plus className="w-4.5 h-4.5 text-teal-600" />}
                </div>
                <h2 className="text-lg font-bold text-gray-900">
                  {editingWard ? 'Edit Ward' : 'Create New Ward'}
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowWardForm(false);
                  setEditingWard(null);
                  resetWardForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleWardSubmit} className="p-6 space-y-5">
              {/* Basic Information */}
              <div className="border-b border-gray-100 pb-5">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                  <Building className="w-4 h-4 text-teal-600" />
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Ward Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={wardFormData.wardName}
                      onChange={(e) => setWardFormData({ ...wardFormData, wardName: e.target.value })}
                      className="w-full px-3 py-2.5 text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm transition-all"
                      placeholder="Enter ward name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Ward Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={wardFormData.wardType}
                      onChange={(e) => setWardFormData({ ...wardFormData, wardType: e.target.value })}
                      className="w-full px-3 py-2.5 text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                    >
                      <option value="general">General</option>
                      <option value="private">Private</option>
                      <option value="icu">ICU</option>
                      <option value="maternity">Maternity</option>
                      <option value="pediatric">Pediatric</option>
                      <option value="surgical">Surgical</option>
                      <option value="medical">Medical</option>
                      <option value="emergency">Emergency</option>
                      <option value="isolation">Isolation</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Total Beds <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={wardFormData.totalBeds}
                      onChange={(e) => setWardFormData({ ...wardFormData, totalBeds: parseInt(e.target.value) })}
                      className="w-full px-3 py-2.5 text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Tariff Code
                    </label>
                    <input
                      type="text"
                      value={wardFormData.tariffCode}
                      onChange={(e) => setWardFormData({ ...wardFormData, tariffCode: e.target.value })}
                      className="w-full px-3 py-2.5 text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                      placeholder="Optional tariff code"
                    />
                  </div>
                </div>
              </div>

              {/* Pricing Section */}
              <div className="border-b border-gray-100 pb-5">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                  <DollarSign className="w-4 h-4 text-teal-600" />
                  Pricing
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Daily Cash Rate <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={wardFormData.dailyCashRate}
                      onChange={(e) => setWardFormData({ ...wardFormData, dailyCashRate: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2.5 text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Daily NHIS Rate</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={wardFormData.dailyNHISRate}
                      onChange={(e) => setWardFormData({ ...wardFormData, dailyNHISRate: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2.5 text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Daily Insurance Rate</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={wardFormData.dailyInsuranceRate}
                      onChange={(e) => setWardFormData({ ...wardFormData, dailyInsuranceRate: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2.5 text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">VAT Rate (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={wardFormData.vatRate}
                      onChange={(e) => setWardFormData({ ...wardFormData, vatRate: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2.5 text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 text-sm"
                    />
                  </div>
                  <div className="flex items-end pb-2.5">
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={wardFormData.isTaxable}
                        onChange={(e) => setWardFormData({ ...wardFormData, isTaxable: e.target.checked })}
                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 w-4 h-4"
                      />
                      Taxable
                    </label>
                  </div>
                </div>
              </div>

              {/* Coverage Section */}
              <div className="border-b border-gray-100 pb-5">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                  <Shield className="w-4 h-4 text-teal-600" />
                  Insurance Coverage
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: 'isNHISCovered', label: 'NHIS Covered' },
                    { key: 'nhisRequiresAuth', label: 'NHIS Requires Authorization' },
                    { key: 'isPrivateInsExempted', label: 'Private Insurance Exempted' },
                    { key: 'requiresAuthorization', label: 'Requires Authorization' },
                  ].map((item) => (
                    <label key={item.key} className="flex items-center gap-2 text-sm text-gray-700 p-2.5 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                      <input
                        type="checkbox"
                        checked={wardFormData[item.key as keyof typeof wardFormData] as boolean}
                        onChange={(e) => setWardFormData({ ...wardFormData, [item.key]: e.target.checked })}
                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 w-4 h-4"
                      />
                      {item.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Location & Description */}
              <div className="pb-2">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-teal-600" />
                  Location & Description
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Location</label>
                    <input
                      type="text"
                      value={wardFormData.location}
                      onChange={(e) => setWardFormData({ ...wardFormData, location: e.target.value })}
                      className="w-full px-3 py-2.5 text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 text-sm"
                      placeholder="e.g., Main Building"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Floor</label>
                    <input
                      type="text"
                      value={wardFormData.floor}
                      onChange={(e) => setWardFormData({ ...wardFormData, floor: e.target.value })}
                      className="w-full px-3 py-2.5 text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 text-sm"
                      placeholder="e.g., 2nd Floor"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Description</label>
                  <textarea
                    value={wardFormData.description}
                    onChange={(e) => setWardFormData({ ...wardFormData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2.5 text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 text-sm resize-none"
                    placeholder="Ward description"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowWardForm(false);
                    setEditingWard(null);
                    resetWardForm();
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium shadow-sm shadow-teal-600/20"
                >
                  {editingWard ? 'Update Ward' : 'Create Ward'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bed Form Modal */}
      {showBedForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-teal-50 rounded-lg flex items-center justify-center">
                  <Bed className="w-4.5 h-4.5 text-teal-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">
                  Add Bed {selectedWard && <span className="text-sm font-normal text-gray-500">to {selectedWard.wardName}</span>}
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowBedForm(false);
                  setSelectedWard(null);
                  resetBedForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleBedSubmit} className="p-6 space-y-4">
              {!selectedWard && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Select Ward <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={bedFormData.wardId}
                    onChange={(e) => setBedFormData({ ...bedFormData, wardId: e.target.value })}
                    className="w-full px-3 py-2.5 text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 text-sm"
                  >
                    <option value="">Choose a ward</option>
                    {wards.map(ward => (
                      <option key={getEntityId(ward)} value={getEntityId(ward)}>
                        {ward.wardName} ({ward.wardType}) - {getWardBeds(getEntityId(ward)!).length} beds
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Bed Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={bedFormData.bedNumber}
                  onChange={(e) => setBedFormData({ ...bedFormData, bedNumber: e.target.value })}
                  className="w-full px-3 py-2.5 text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 text-sm"
                  placeholder="e.g., A1, B2, ICU-01"
                  autoFocus
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowBedForm(false);
                    setSelectedWard(null);
                    resetBedForm();
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium shadow-sm shadow-teal-600/20"
                >
                  Create Bed
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}