// src/pages/WardManagement.tsx - UPDATED with all backend fields
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
  AlertTriangle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Helper function to get consistent ID
const getEntityId = (entity: { id?: string; _id?: string } | null): string | undefined => {
  return entity?._id || entity?.id;
};

// Format currency
const formatCurrency = (amount: number) => {
  if (!amount && amount !== 0) return '—';
  return `GHS ${amount.toFixed(2)}`;
};

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
  
  // Extended ward form data with all backend fields
  const [wardFormData, setWardFormData] = useState({
    wardName: '',
    wardType: 'general',
    totalBeds: 10,
    description: '',
    location: '',
    floor: '',
    // Pricing fields
    dailyCashRate: 150,
    dailyNHISRate: 120,
    dailyInsuranceRate: 135,
    vatRate: 15,
    isTaxable: true,
    // Coverage flags
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

  const loadData = async () => {
    setLocalLoading(true);
    try {
      console.log('🔄 Loading ward data...');
      
      await Promise.all([
        getWards(),
        getBeds(),
        getAvailableBeds().catch(() => null)
      ]);
      
      console.log('✅ Wards loaded:', wards.length);
      console.log('✅ Beds loaded:', beds.length);
      console.log('✅ Available beds:', availableBeds.length);
      
      success('Data Loaded', 'Ward data refreshed successfully');
    } catch (err: any) {
      console.error('❌ Load failed:', err);
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

  const handleWardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log('🔍 Submitting ward data:', wardFormData);
      
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
      console.error('❌ Error submitting ward:', err);
      error('Save Failed', err.response?.data?.message || err.message || 'Failed to save ward');
    }
  };

  const handleBedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log('🔍 Submitting bed data:', bedFormData);
      await createBed(bedFormData);
      success('Bed Created', 'Bed created successfully');
      setShowBedForm(false);
      resetBedForm();
      await getBeds();
    } catch (err: any) {
      console.error('❌ Error creating bed:', err);
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

  const getOccupancyColor = (occupancyRate: number) => {
    if (occupancyRate > 80) return 'bg-red-100 text-red-700';
    if (occupancyRate > 60) return 'bg-yellow-100 text-yellow-700';
    return 'bg-green-100 text-green-700';
  };

  const canManageWards = user?.role === 'admin' || user?.role === 'super_admin';

  // Show loading spinner
  if (localLoading && wards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Loader2 className="w-10 h-10 text-teal-500 animate-spin mb-4" />
        <p className="text-gray-500">Loading wards and beds...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Ward Management</h1>
            <p className="text-gray-500 text-sm">Manage hospital wards and bed allocation</p>
            {wards.length > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                {wards.length} ward(s) • {beds.length} bed(s) total • {availableBeds.length} available
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link
            to="/dashboard/admissions"
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium"
          >
            <Users className="w-4 h-4" />
            View Admissions
          </Link>
          {canManageWards && (
            <button
              onClick={() => setShowWardForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-all text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Ward
            </button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search wards by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
            />
          </div>
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
            className="px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Wards Grid */}
      {filteredWards.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center border border-gray-200 shadow-sm">
          <Building className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 text-sm mb-2">
            {searchTerm ? 'No wards match your search' : 'No wards configured yet'}
          </p>
          <p className="text-gray-400 text-sm mb-4">Get started by creating your first ward</p>
          {canManageWards && (
            <button
              onClick={() => setShowWardForm(true)}
              className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Create First Ward
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredWards.map((ward) => {
            const wardId = getEntityId(ward)!;
            const wardBeds = getWardBeds(wardId);
            const occupiedBeds = getOccupiedBeds(wardId);
            const availableBedsCount = wardBeds.length - occupiedBeds;
            const occupancyRate = wardBeds.length > 0 ? (occupiedBeds / wardBeds.length) * 100 : 0;
            
            return (
              <div 
                key={wardId} 
                className="bg-white rounded-xl border border-gray-200 hover:shadow-md transition-all overflow-hidden cursor-pointer"
                onClick={() => handleViewWardDetails(ward)}
              >
                {/* Ward Header */}
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                        <Building className="w-5 h-5 text-teal-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{ward.wardName}</h3>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${getWardTypeColor(ward.wardType)}`}>
                          {ward.wardType?.charAt(0).toUpperCase() + ward.wardType?.slice(1) || 'General'}
                        </span>
                      </div>
                    </div>
                    {canManageWards && (
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleEditWard(ward)}
                          className="p-1.5 text-gray-500 hover:text-teal-600 transition-colors hover:bg-teal-50 rounded-lg"
                          title="Edit Ward"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteWard(ward)}
                          className="p-1.5 text-gray-500 hover:text-red-600 transition-colors hover:bg-red-50 rounded-lg"
                          title="Delete Ward"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Ward Stats */}
                <div className="p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Bed className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-500 text-sm">Total Beds:</span>
                    </div>
                    <span className="font-bold text-gray-900">{wardBeds.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-green-600" />
                      <span className="text-gray-500 text-sm">Available:</span>
                    </div>
                    <span className="font-bold text-green-600">{availableBedsCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <UserX className="w-4 h-4 text-red-600" />
                      <span className="text-gray-500 text-sm">Occupied:</span>
                    </div>
                    <span className="font-bold text-red-600">{occupiedBeds}</span>
                  </div>
                  
                  {/* Pricing Info */}
                  <div className="border-t border-gray-100 pt-3 mt-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500">Daily Cash Rate:</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(ward.dailyCashRate)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs mt-1">
                      <span className="text-gray-500">Daily NHIS Rate:</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(ward.dailyNHISRate)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs mt-1">
                      <span className="text-gray-500">Daily Insurance Rate:</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(ward.dailyInsuranceRate)}</span>
                    </div>
                  </div>
                  
                  {/* Coverage Badges */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {ward.isNHISCovered && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">
                        <Shield className="w-3 h-3" />
                        NHIS Covered
                      </span>
                    )}
                    {!ward.isPrivateInsExempted && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
                        <CheckCircle className="w-3 h-3" />
                        Insurance Accepted
                      </span>
                    )}
                    {ward.isTaxable && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-700">
                        VAT {ward.vatRate}%
                      </span>
                    )}
                  </div>

                  {ward.description && (
                    <p className="text-xs text-gray-500 mt-2 line-clamp-2">{ward.description}</p>
                  )}
                  
                  <div className={`px-2 py-1.5 rounded-lg text-xs font-medium text-center ${getOccupancyColor(occupancyRate)}`}>
                    {occupancyRate.toFixed(0)}% Occupied
                  </div>
                </div>

                {/* Beds Grid Preview */}
                <div className="border-t border-gray-200 p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-700 text-sm">Beds ({wardBeds.length})</h4>
                    {canManageWards && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedWard(ward);
                          setBedFormData({ bedNumber: '', wardId: wardId });
                          setShowBedForm(true);
                        }}
                        className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-700 font-medium text-xs transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        Add Bed
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {wardBeds.slice(0, 8).map((bed) => (
                      <div
                        key={getEntityId(bed)}
                        className={`relative group p-2 rounded-lg text-center text-xs font-bold transition-all duration-200 ${
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
                            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                            title="Delete Bed"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                    {wardBeds.length > 8 && (
                      <div className="p-2 rounded-lg text-center text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                        +{wardBeds.length - 8} more
                      </div>
                    )}
                    {wardBeds.length === 0 && (
                      <div className="col-span-4 text-center text-xs text-gray-400 py-3">
                        No beds configured
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ward Details Modal */}
      {showWardDetails && selectedWard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building className="w-6 h-6 text-teal-600" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedWard.wardName}</h2>
                  <p className="text-sm text-gray-500 capitalize">{selectedWard.wardType} Ward</p>
                </div>
              </div>
              <button 
                onClick={() => setShowWardDetails(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Ward Name</p>
                  <p className="font-semibold text-gray-900">{selectedWard.wardName}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Ward Type</p>
                  <p className="font-semibold text-gray-900 capitalize">{selectedWard.wardType}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Location</p>
                  <p className="font-semibold text-gray-900">{selectedWard.location || 'Not specified'}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Floor</p>
                  <p className="font-semibold text-gray-900">{selectedWard.floor || 'Not specified'}</p>
                </div>
              </div>

              {/* Bed Statistics */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <Bed className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-blue-700">{getWardBeds(selectedWard.id).length}</p>
                  <p className="text-xs text-blue-600">Total Beds</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <UserCheck className="w-5 h-5 text-green-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-green-700">{getAvailableBedsCount(selectedWard.id)}</p>
                  <p className="text-xs text-green-600">Available</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <UserX className="w-5 h-5 text-red-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-red-700">{getOccupiedBeds(selectedWard.id)}</p>
                  <p className="text-xs text-red-600">Occupied</p>
                </div>
              </div>

              {/* Pricing Details */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-teal-600" />
                  Pricing & Rates
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500">Daily Cash Rate</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(selectedWard.dailyCashRate)}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500">Daily NHIS Rate</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(selectedWard.dailyNHISRate)}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500">Daily Insurance Rate</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(selectedWard.dailyInsuranceRate)}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500">VAT Rate</p>
                    <p className="text-lg font-bold text-gray-900">{selectedWard.vatRate || 0}%</p>
                  </div>
                </div>
              </div>

              {/* Coverage Details */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-teal-600" />
                  Insurance Coverage
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">NHIS Covered</span>
                    {selectedWard.isNHISCovered ? (
                      <span className="text-green-600 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Yes</span>
                    ) : (
                      <span className="text-red-600 flex items-center gap-1"><XCircle className="w-4 h-4" /> No</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">NHIS Requires Authorization</span>
                    <span>{selectedWard.nhisRequiresAuth ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Private Insurance Exempted</span>
                    <span>{selectedWard.isPrivateInsExempted ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-600">Requires Authorization</span>
                    <span>{selectedWard.requiresAuthorization ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedWard.description && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-sm text-gray-600">{selectedWard.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Ward Form Modal - Enhanced with all fields */}
      {showWardForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-bold text-gray-900">
                {editingWard ? 'Edit Ward' : 'Create New Ward'}
              </h2>
            </div>
            <form onSubmit={handleWardSubmit} className="p-6 space-y-4">
              {/* Basic Information */}
              <div className="border-b border-gray-200 pb-4">
                <h3 className="font-semibold text-gray-900 mb-3">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ward Name *</label>
                    <input
                      type="text"
                      required
                      value={wardFormData.wardName}
                      onChange={(e) => setWardFormData({ ...wardFormData, wardName: e.target.value })}
                      className="w-full px-3 py-2 text-gray-900 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                      placeholder="Enter ward name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ward Type *</label>
                    <select
                      required
                      value={wardFormData.wardType}
                      onChange={(e) => setWardFormData({ ...wardFormData, wardType: e.target.value })}
                      className="w-full px-3 py-2 text-gray-900 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Total Beds *</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={wardFormData.totalBeds}
                      onChange={(e) => setWardFormData({ ...wardFormData, totalBeds: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 text-gray-900 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tariff Code</label>
                    <input
                      type="text"
                      value={wardFormData.tariffCode}
                      onChange={(e) => setWardFormData({ ...wardFormData, tariffCode: e.target.value })}
                      className="w-full px-3 py-2 text-gray-900 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                      placeholder="Optional tariff code"
                    />
                  </div>
                </div>
              </div>

              {/* Pricing Section */}
              <div className="border-b border-gray-200 pb-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-teal-600" />
                  Pricing
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Daily Cash Rate *</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={wardFormData.dailyCashRate}
                      onChange={(e) => setWardFormData({ ...wardFormData, dailyCashRate: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 text-gray-900 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Daily NHIS Rate</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={wardFormData.dailyNHISRate}
                      onChange={(e) => setWardFormData({ ...wardFormData, dailyNHISRate: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 text-gray-900 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Daily Insurance Rate</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={wardFormData.dailyInsuranceRate}
                      onChange={(e) => setWardFormData({ ...wardFormData, dailyInsuranceRate: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 text-gray-900 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">VAT Rate (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={wardFormData.vatRate}
                      onChange={(e) => setWardFormData({ ...wardFormData, vatRate: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 text-gray-900 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div className="flex items-center pt-6">
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={wardFormData.isTaxable}
                        onChange={(e) => setWardFormData({ ...wardFormData, isTaxable: e.target.checked })}
                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      />
                      Taxable
                    </label>
                  </div>
                </div>
              </div>

              {/* Coverage Section */}
              <div className="border-b border-gray-200 pb-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-teal-600" />
                  Insurance Coverage
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={wardFormData.isNHISCovered}
                      onChange={(e) => setWardFormData({ ...wardFormData, isNHISCovered: e.target.checked })}
                      className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                    />
                    NHIS Covered
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={wardFormData.nhisRequiresAuth}
                      onChange={(e) => setWardFormData({ ...wardFormData, nhisRequiresAuth: e.target.checked })}
                      className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                    />
                    NHIS Requires Authorization
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={wardFormData.isPrivateInsExempted}
                      onChange={(e) => setWardFormData({ ...wardFormData, isPrivateInsExempted: e.target.checked })}
                      className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                    />
                    Private Insurance Exempted
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={wardFormData.requiresAuthorization}
                      onChange={(e) => setWardFormData({ ...wardFormData, requiresAuthorization: e.target.checked })}
                      className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                    />
                    Requires Authorization
                  </label>
                </div>
              </div>

              {/* Location & Description */}
              <div className="pb-4">
                <h3 className="font-semibold text-gray-900 mb-3">Location & Description</h3>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                    <input
                      type="text"
                      value={wardFormData.location}
                      onChange={(e) => setWardFormData({ ...wardFormData, location: e.target.value })}
                      className="w-full px-3 py-2 text-gray-900 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                      placeholder="e.g., Main Building"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Floor</label>
                    <input
                      type="text"
                      value={wardFormData.floor}
                      onChange={(e) => setWardFormData({ ...wardFormData, floor: e.target.value })}
                      className="w-full px-3 py-2 text-gray-900 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                      placeholder="e.g., 2nd Floor"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={wardFormData.description}
                    onChange={(e) => setWardFormData({ ...wardFormData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 text-gray-900 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 resize-none"
                    placeholder="Ward description"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
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
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium"
                >
                  {editingWard ? 'Update' : 'Create'} Ward
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bed Form Modal */}
      {showBedForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Add Bed {selectedWard && `to ${selectedWard.wardName}`}
            </h2>
            <form onSubmit={handleBedSubmit} className="space-y-4">
              {!selectedWard && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Ward *</label>
                  <select
                    required
                    value={bedFormData.wardId}
                    onChange={(e) => setBedFormData({ ...bedFormData, wardId: e.target.value })}
                    className="w-full px-3 py-2 text-gray-900 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Bed Number *</label>
                <input
                  type="text"
                  required
                  value={bedFormData.bedNumber}
                  onChange={(e) => setBedFormData({ ...bedFormData, bedNumber: e.target.value })}
                  className="w-full px-3 py-2 text-gray-900 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  placeholder="e.g., A1, B2, ICU-01"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
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
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium"
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

// Helper function to get available beds count for a ward
function getAvailableBedsCount(wardId: string) {
  // This will be implemented in the component
  return 0;
}