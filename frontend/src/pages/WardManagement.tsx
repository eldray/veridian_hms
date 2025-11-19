// src/pages/WardManagement.tsx - UPDATED WITH THEME
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
  ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Helper function to get consistent ID
const getEntityId = (entity: { id?: string; _id?: string } | null): string | undefined => {
  return entity?._id || entity?.id;
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
    isLoading 
  } = useWardStore();
  const { user } = useAuthStore();
  const { success, error } = useToast();
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showWardForm, setShowWardForm] = useState(false);
  const [showBedForm, setShowBedForm] = useState(false);
  const [editingWard, setEditingWard] = useState<any>(null);
  const [selectedWard, setSelectedWard] = useState<any>(null);
  const [wardFormData, setWardFormData] = useState({
    wardName: '',
    wardType: 'general',
    totalBeds: 10,
    cashDailyRate: 0,
    insuranceDailyRate: 0,
    description: '',
    location: '',
    floor: ''
  });
  const [bedFormData, setBedFormData] = useState({
    bedNumber: '',
    wardId: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([getWards(), getBeds()]);
      success('Data Loaded', 'Ward data refreshed successfully');
    } catch (err) {
      error('Load Failed', 'Failed to load ward data');
    }
  };

  const filteredWards = wards.filter(ward => {
    const matchesSearch = ward.wardName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || ward.wardType === filterType;
    return matchesSearch && matchesType;
  });

  const getWardBeds = (wardId: string) => {
    return beds.filter(bed => getEntityId(bed.ward) === wardId || bed.wardId === wardId);
  };

  const getOccupiedBeds = (wardId: string) => {
    return getWardBeds(wardId).filter(bed => bed.isOccupied).length;
  };

  const handleWardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log('🔍 [Frontend] Submitting ward data:', wardFormData);
      
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
      console.error('❌ [Frontend] Error submitting ward:', err);
      error('Save Failed', err.response?.data?.message || 'Failed to save ward');
    }
  };

  const handleBedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log('🔍 [Frontend] Submitting bed data:', bedFormData);
      await createBed(bedFormData);
      success('Bed Created', 'Bed created successfully');
      setShowBedForm(false);
      resetBedForm();
      await getBeds();
    } catch (err: any) {
      console.error('❌ [Frontend] Error creating bed:', err);
      error('Create Failed', err.response?.data?.message || 'Failed to create bed');
    }
  };

  const handleEditWard = (ward: any) => {
    setEditingWard(ward);
    setWardFormData({
      wardName: ward.wardName,
      wardType: ward.wardType,
      totalBeds: ward.totalBeds,
      cashDailyRate: ward.cashDailyRate,
      insuranceDailyRate: ward.insuranceDailyRate,
      description: ward.description || '',
      location: ward.location || '',
      floor: ward.floor || ''
    });
    setShowWardForm(true);
  };

  const handleDeleteWard = async (ward: any) => {
    if (window.confirm(`Are you sure you want to delete "${ward.wardName}"? This will also delete all beds in this ward.`)) {
      try {
        await deleteWard(getEntityId(ward)!);
        success('Ward Deleted', 'Ward deleted successfully');
        await loadData();
      } catch (err: any) {
        error('Delete Failed', err.response?.data?.message || 'Failed to delete ward');
      }
    }
  };

  const handleDeleteBed = async (bed: any) => {
    if (window.confirm(`Are you sure you want to delete bed "${bed.bedNumber}"?`)) {
      try {
        await deleteBed(getEntityId(bed)!);
        success('Bed Deleted', 'Bed deleted successfully');
        await getBeds();
      } catch (err: any) {
        error('Delete Failed', err.response?.data?.message || 'Failed to delete bed');
      }
    }
  };

  const resetWardForm = () => {
    setWardFormData({
      wardName: '',
      wardType: 'general',
      totalBeds: 10,
      cashDailyRate: 0,
      insuranceDailyRate: 0,
      description: '',
      location: '',
      floor: ''
    });
  };

  const resetBedForm = () => {
    setBedFormData({
      bedNumber: '',
      wardId: '',
    });
  };

  const getWardTypeColor = (type: string) => {
    switch (type) {
      case 'icu': return 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] border border-[var(--icon-red-text)]';
      case 'maternity': return 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] border border-[var(--icon-purple-text)]';
      case 'pediatric': return 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] border border-[var(--icon-cyan-text)]';
      case 'surgical': return 'bg-[var(--icon-orange-bg)] text-[var(--icon-orange-text)] border border-[var(--icon-orange-text)]';
      case 'private': return 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] border border-[var(--icon-green-text)]';
      default: return 'bg-[var(--bg-main)] text-[var(--text-tertiary)] border border-[var(--border-color)]';
    }
  };

  const getOccupancyColor = (occupancyRate: number) => {
    if (occupancyRate > 80) return 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]';
    if (occupancyRate > 60) return 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]';
    return 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]';
  };

  const canManageWards = user?.role === 'admin';

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
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Ward Management</h1>
            <p className="text-[var(--text-secondary)] text-sm">Manage hospital wards and bed allocation</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            to="/dashboard/admissions"
            className="flex items-center gap-2 px-4 py-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] transition-all text-sm font-medium"
          >
            <Users className="w-4 h-4" />
            View Admissions
          </Link>
          {canManageWards && (
            <button
              onClick={() => setShowWardForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Ward
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
              placeholder="Search wards by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
          >
            <option value="all">All Types</option>
            <option value="general">General</option>
            <option value="private">Private</option>
            <option value="icu">ICU</option>
            <option value="maternity">Maternity</option>
            <option value="pediatric">Pediatric</option>
            <option value="surgical">Surgical</option>
          </select>
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

      {/* Wards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map(i => (
            <div key={i} className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] animate-pulse">
              <div className="h-4 bg-[var(--bg-main)] rounded w-3/4 mb-3"></div>
              <div className="h-3 bg-[var(--bg-main)] rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-[var(--bg-main)] rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : filteredWards.length === 0 ? (
        <div className="bg-[var(--bg-card)] rounded-xl p-8 text-center shadow-sm border border-[var(--border-color)]">
          <Building className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
          <p className="text-[var(--text-secondary)] text-sm mb-2">
            {searchTerm ? 'No wards found' : 'No wards configured yet'}
          </p>
          <p className="text-[var(--text-tertiary)] text-sm mb-4">Get started by creating your first ward</p>
          {canManageWards && (
            <button
              onClick={() => setShowWardForm(true)}
              className="inline-flex items-center gap-2 text-[var(--icon-cyan-text)] hover:text-[var(--icon-cyan-text)]/80 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Create First Ward
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWards.map((ward) => {
            const wardBeds = getWardBeds(getEntityId(ward)!);
            const occupiedBeds = getOccupiedBeds(getEntityId(ward)!);
            const availableBeds = wardBeds.length - occupiedBeds;
            const occupancyRate = wardBeds.length > 0 ? (occupiedBeds / wardBeds.length) * 100 : 0;
            
            return (
              <div key={getEntityId(ward)} className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] hover:shadow-sm transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[var(--icon-cyan-text)] rounded-lg flex items-center justify-center">
                      <Building className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[var(--text-primary)] text-sm">{ward.wardName}</h3>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${getWardTypeColor(ward.wardType)}`}>
                        {ward.wardType.charAt(0).toUpperCase() + ward.wardType.slice(1)}
                      </span>
                    </div>
                  </div>
                  {canManageWards && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEditWard(ward)}
                        className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--icon-green-text)] transition-colors hover:bg-[var(--icon-green-bg)] rounded-lg"
                        title="Edit Ward"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteWard(ward)}
                        className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--icon-red-text)] transition-colors hover:bg-[var(--icon-red-bg)] rounded-lg"
                        title="Delete Ward"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Ward Stats */}
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Bed className="w-4 h-4 text-[var(--text-secondary)]" />
                      <span className="text-[var(--text-secondary)] text-sm">Total Beds:</span>
                    </div>
                    <span className="font-bold text-[var(--text-primary)] text-sm">{wardBeds.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-[var(--icon-green-text)]" />
                      <span className="text-[var(--text-secondary)] text-sm">Available:</span>
                    </div>
                    <span className="font-bold text-[var(--icon-green-text)] text-sm">{availableBeds}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <UserX className="w-4 h-4 text-[var(--icon-red-text)]" />
                      <span className="text-[var(--text-secondary)] text-sm">Occupied:</span>
                    </div>
                    <span className="font-bold text-[var(--icon-red-text)] text-sm">{occupiedBeds}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--text-secondary)] text-sm">Daily Rate:</span>
                    <span className="font-bold text-[var(--text-primary)] text-sm">GHS {ward.cashDailyRate?.toFixed(2)}</span>
                  </div>
                  {ward.description && (
                    <p className="text-xs text-[var(--text-secondary)]">{ward.description}</p>
                  )}
                  <div className={`px-2 py-1 rounded text-xs font-medium text-center ${getOccupancyColor(occupancyRate)}`}>
                    {occupancyRate.toFixed(0)}% Occupied
                  </div>
                </div>

                {/* Beds in this ward */}
                <div className="border-t border-[var(--border-color)] pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-[var(--text-primary)] text-sm">Beds ({wardBeds.length})</h4>
                    {canManageWards && (
                      <button
                        onClick={() => {
                          setSelectedWard(ward);
                          setBedFormData({ ...bedFormData, wardId: getEntityId(ward)! });
                          setShowBedForm(true);
                        }}
                        className="inline-flex items-center gap-1 text-[var(--icon-cyan-text)] hover:text-[var(--icon-cyan-text)]/80 font-medium text-xs transition-colors"
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
                        className={`p-2 rounded-lg text-center text-xs font-bold transition-all duration-200 relative ${
                          bed.isOccupied
                            ? 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] border border-[var(--icon-red-text)]'
                            : 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] border border-[var(--icon-green-text)]'
                        }`}
                        title={bed.isOccupied ? `Occupied by ${bed.currentPatient?.fullName || 'patient'}` : 'Available'}
                      >
                        {bed.bedNumber}
                        {canManageWards && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteBed(bed);
                            }}
                            className="absolute -top-1 -right-1 w-3 h-3 bg-[var(--icon-red-text)] text-white rounded-full flex items-center justify-center text-[8px] hover:bg-[var(--icon-red-text)]/80"
                            title="Delete Bed"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                    {wardBeds.length > 8 && (
                      <div className="p-2 rounded-lg text-center text-xs font-bold bg-[var(--bg-main)] text-[var(--text-tertiary)] border border-[var(--border-color)]">
                        +{wardBeds.length - 8}
                      </div>
                    )}
                    {wardBeds.length === 0 && (
                      <div className="col-span-4 text-center text-xs text-[var(--text-tertiary)] py-2">
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

      {/* Ward Form Modal */}
      {showWardForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">
              {editingWard ? 'Edit Ward' : 'Create New Ward'}
            </h2>
            <form onSubmit={handleWardSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Ward Name *
                </label>
                <input
                  type="text"
                  required
                  value={wardFormData.wardName}
                  onChange={(e) => setWardFormData({ ...wardFormData, wardName: e.target.value })}
                  className="w-full px-3 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
                  placeholder="Enter ward name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Ward Type *
                </label>
                <select
                  required
                  value={wardFormData.wardType}
                  onChange={(e) => setWardFormData({ ...wardFormData, wardType: e.target.value })}
                  className="w-full px-3 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
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
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Total Beds *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={wardFormData.totalBeds}
                  onChange={(e) => setWardFormData({ ...wardFormData, totalBeds: parseInt(e.target.value) })}
                  className="w-full px-3 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Cash Rate (GHS) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={wardFormData.cashDailyRate}
                    onChange={(e) => setWardFormData({ ...wardFormData, cashDailyRate: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Insurance Rate (GHS) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={wardFormData.insuranceDailyRate}
                    onChange={(e) => setWardFormData({ ...wardFormData, insuranceDailyRate: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Description
                </label>
                <textarea
                  value={wardFormData.description}
                  onChange={(e) => setWardFormData({ ...wardFormData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm resize-none"
                  placeholder="Ward description"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={wardFormData.location}
                    onChange={(e) => setWardFormData({ ...wardFormData, location: e.target.value })}
                    className="w-full px-3 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
                    placeholder="e.g., Main Building"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Floor
                  </label>
                  <input
                    type="text"
                    value={wardFormData.floor}
                    onChange={(e) => setWardFormData({ ...wardFormData, floor: e.target.value })}
                    className="w-full px-3 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
                    placeholder="e.g., 2nd Floor"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => {
                    setShowWardForm(false);
                    setEditingWard(null);
                    resetWardForm();
                  }}
                  className="px-4 py-2.5 text-[var(--text-primary)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white text-sm font-medium"
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
          <div className="bg-[var(--bg-card)] rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">
              Add Bed {selectedWard && `to ${selectedWard.wardName}`}
            </h2>
            <form onSubmit={handleBedSubmit} className="space-y-4">
              {!selectedWard && (
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Select Ward *
                  </label>
                  <select
                    required
                    value={bedFormData.wardId}
                    onChange={(e) => setBedFormData({ ...bedFormData, wardId: e.target.value })}
                    className="w-full px-3 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
                  >
                    <option value="">Choose a ward</option>
                    {wards.map(ward => (
                      <option key={getEntityId(ward)} value={getEntityId(ward)}>
                        {ward.wardName} ({ward.wardType})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Bed Number *
                </label>
                <input
                  type="text"
                  required
                  value={bedFormData.bedNumber}
                  onChange={(e) => setBedFormData({ ...bedFormData, bedNumber: e.target.value })}
                  className="w-full px-3 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
                  placeholder="e.g., A1, B2, etc."
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => {
                    setShowBedForm(false);
                    setSelectedWard(null);
                    resetBedForm();
                  }}
                  className="px-4 py-2.5 text-[var(--text-primary)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white text-sm font-medium"
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