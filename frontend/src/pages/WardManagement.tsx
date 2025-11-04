// src/pages/WardManagement.tsx - UPDATED WITH CONSISTENT UI THEME
import { useEffect, useState } from 'react';
import { useWardStore } from '../store/wardStore';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import {
  Plus,
  Search,
  Filter,
  Building,
  Bed,
  Edit,
  Trash2,
  RefreshCw,
  Users,
  UserCheck,
  UserX,
  Hospital // ← ADDED HOSPITAL ICON
} from 'lucide-react';

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
    updateBed,
    deleteBed,
    isLoading 
  } = useWardStore();
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showWardForm, setShowWardForm] = useState(false);
  const [showBedForm, setShowBedForm] = useState(false);
  const [editingWard, setEditingWard] = useState(null);
  const [selectedWard, setSelectedWard] = useState(null);
  const [wardFormData, setWardFormData] = useState({
    wardName: '',
    wardType: 'general',
    totalBeds: 10,
    cashDailyRate: 0,
    insuranceDailyRate: 0,
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
    } catch (error) {
      addToast('Failed to load ward data', 'error');
    }
  };

  const filteredWards = wards.filter(ward => {
    const matchesSearch = ward.wardName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || ward.wardType === filterType;
    return matchesSearch && matchesType;
  });

  const getWardBeds = (wardId: string) => {
    return beds.filter(bed => bed.wardId === wardId);
  };

  const getOccupiedBeds = (wardId: string) => {
    return getWardBeds(wardId).filter(bed => bed.isOccupied).length;
  };

  const handleWardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingWard) {
        await updateWard(editingWard._id, wardFormData);
        addToast('Ward updated successfully', 'success');
      } else {
        await createWard(wardFormData);
        addToast('Ward created successfully', 'success');
      }
      setShowWardForm(false);
      setEditingWard(null);
      setWardFormData({
        wardName: '',
        wardType: 'general',
        totalBeds: 10,
        cashDailyRate: 0,
        insuranceDailyRate: 0,
      });
    } catch (error) {
      addToast('Failed to save ward', 'error');
    }
  };

  const handleBedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createBed(bedFormData);
      addToast('Bed created successfully', 'success');
      setShowBedForm(false);
      setBedFormData({
        bedNumber: '',
        wardId: '',
      });
    } catch (error) {
      addToast('Failed to create bed', 'error');
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
    });
    setShowWardForm(true);
  };

  const handleDeleteWard = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this ward? This will also delete all beds in this ward.')) {
      try {
        await deleteWard(id);
        addToast('Ward deleted successfully', 'success');
      } catch (error) {
        addToast('Failed to delete ward', 'error');
      }
    }
  };

  const handleDeleteBed = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this bed?')) {
      try {
        await deleteBed(id);
        addToast('Bed deleted successfully', 'success');
      } catch (error) {
        addToast('Failed to delete bed', 'error');
      }
    }
  };

  const getWardTypeColor = (type: string) => {
    switch (type) {
      case 'icu': return 'bg-red-100 text-red-800 border border-red-200';
      case 'maternity': return 'bg-pink-100 text-pink-800 border border-pink-200';
      case 'pediatric': return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'surgical': return 'bg-purple-100 text-purple-800 border border-purple-200';
      case 'private': return 'bg-green-100 text-green-800 border border-green-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  return (
    <div className="space-y-8 p-6 bg-gray-50 min-h-screen"> {/* ← CONSISTENT BACKGROUND */}
      {/* Header - Consistent with other pages */}
      <div className="bg-gradient-to-r from-slate-800 to-blue-900 rounded-2xl p-8 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20">
              <Hospital className="w-8 h-8 text-white" /> {/* ← CONSISTENT ICON */}
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">Ward Management</h1>
              <p className="text-blue-100 text-lg">Manage wards, beds, and patient admissions</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setSelectedWard(null);
                setShowBedForm(true);
              }}
              className="flex items-center gap-3 px-6 py-3 bg-white/10 backdrop-blur-sm text-white rounded-xl hover:bg-white/20 transition-all duration-200 border border-white/20 font-semibold"
            >
              <Plus className="w-5 h-5" />
              Add Bed
            </button>
            {user?.role === 'admin' && (
              <button
                onClick={() => setShowWardForm(true)}
                className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl hover:from-blue-700 hover:to-teal-700 transition-all duration-200 hover:shadow-lg shadow-md font-semibold"
              >
                <Plus className="w-5 h-5" />
                Add Ward
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <div className="flex gap-4">
          <div className="flex-1 relative group">
            <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2 group-focus-within:text-blue-600 transition-colors" />
            <input
              type="text"
              placeholder="Search wards by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base shadow-sm"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base shadow-sm"
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
            className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 flex items-center gap-2 font-semibold"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Wards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : filteredWards.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-200 text-center">
          <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg mb-2">
            {searchTerm ? 'No wards found' : 'No wards configured yet'}
          </p>
          <p className="text-gray-400 text-sm mb-4">Get started by creating your first ward</p>
          {user?.role === 'admin' && (
            <button
              onClick={() => setShowWardForm(true)}
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold text-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create First Ward
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWards.map((ward) => {
            const wardBeds = getWardBeds(ward._id);
            const occupiedBeds = getOccupiedBeds(ward._id);
            const availableBeds = wardBeds.length - occupiedBeds;
            
            return (
              <div key={ward._id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full flex items-center justify-center shadow-lg">
                      <Building className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-xl text-gray-900">{ward.wardName}</h3>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold mt-2 ${getWardTypeColor(ward.wardType)}`}>
                        {ward.wardType.charAt(0).toUpperCase() + ward.wardType.slice(1)}
                      </span>
                    </div>
                  </div>
                  {user?.role === 'admin' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditWard(ward)}
                        className="p-2 text-gray-600 hover:text-blue-600 transition-colors hover:bg-blue-50 rounded-xl"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteWard(ward._id)}
                        className="p-2 text-gray-600 hover:text-red-600 transition-colors hover:bg-red-50 rounded-xl"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Ward Stats */}
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <Bed className="w-5 h-5 text-gray-600" />
                      <span className="text-gray-700 font-medium">Total Beds:</span>
                    </div>
                    <span className="font-bold text-gray-900">{wardBeds.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <UserCheck className="w-5 h-5 text-green-600" />
                      <span className="text-gray-700 font-medium">Available:</span>
                    </div>
                    <span className="font-bold text-green-600">{availableBeds}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <UserX className="w-5 h-5 text-red-600" />
                      <span className="text-gray-700 font-medium">Occupied:</span>
                    </div>
                    <span className="font-bold text-red-600">{occupiedBeds}</span>
                  </div>
                  <div className="flex justify-between items-center text-base">
                    <span className="text-gray-700 font-medium">Daily Rate:</span>
                    <span className="font-bold text-gray-900">GHS {ward.cashDailyRate?.toFixed(2)}</span>
                  </div>
                </div>

                {/* Beds in this ward */}
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-gray-900 text-lg">Beds</h4>
                    <button
                      onClick={() => {
                        setSelectedWard(ward);
                        setBedFormData({ ...bedFormData, wardId: ward._id });
                        setShowBedForm(true);
                      }}
                      className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold text-sm transition-colors group"
                    >
                      <Plus className="w-4 h-4" />
                      Add Bed
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {wardBeds.slice(0, 8).map((bed) => (
                      <div
                        key={bed._id}
                        className={`p-3 rounded-xl text-center text-sm font-bold transition-all duration-200 ${
                          bed.isOccupied
                            ? 'bg-red-100 text-red-800 border-2 border-red-300 hover:border-red-400'
                            : 'bg-green-100 text-green-800 border-2 border-green-300 hover:border-green-400'
                        }`}
                        title={bed.isOccupied ? `Occupied by ${bed.currentPatient?.fullName || 'patient'}` : 'Available'}
                      >
                        {bed.bedNumber}
                      </div>
                    ))}
                    {wardBeds.length > 8 && (
                      <div className="p-3 rounded-xl text-center text-sm font-bold bg-gray-100 text-gray-600 border-2 border-gray-300">
                        +{wardBeds.length - 8}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ward Form Modal - Updated with blur background */}
      {showWardForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"> {/* ← BLUR BACKGROUND */}
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-200"> {/* ← SHADOW AND BORDER */}
            <h2 className="text-2xl font-bold mb-6 text-gray-900">
              {editingWard ? 'Edit Ward' : 'Create New Ward'}
            </h2>
            <form onSubmit={handleWardSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Ward Name *
                </label>
                <input
                  type="text"
                  required
                  value={wardFormData.wardName}
                  onChange={(e) => setWardFormData({ ...wardFormData, wardName: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
                  placeholder="Enter ward name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Ward Type *
                </label>
                <select
                  required
                  value={wardFormData.wardType}
                  onChange={(e) => setWardFormData({ ...wardFormData, wardType: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
                >
                  <option value="general">General</option>
                  <option value="private">Private</option>
                  <option value="icu">ICU</option>
                  <option value="maternity">Maternity</option>
                  <option value="pediatric">Pediatric</option>
                  <option value="surgical">Surgical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Total Beds *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={wardFormData.totalBeds}
                  onChange={(e) => setWardFormData({ ...wardFormData, totalBeds: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Cash Rate (GHS) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={wardFormData.cashDailyRate}
                    onChange={(e) => setWardFormData({ ...wardFormData, cashDailyRate: parseFloat(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Insurance Rate (GHS) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={wardFormData.insuranceDailyRate}
                    onChange={(e) => setWardFormData({ ...wardFormData, insuranceDailyRate: parseFloat(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
                  />
                </div>
              </div>

              <div className="flex gap-4 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowWardForm(false);
                    setEditingWard(null);
                    setWardFormData({
                      wardName: '',
                      wardType: 'general',
                      totalBeds: 10,
                      cashDailyRate: 0,
                      insuranceDailyRate: 0,
                    });
                  }}
                  className="px-6 py-3 text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl hover:from-blue-700 hover:to-teal-700 transition-all duration-200 hover:shadow-lg shadow-md font-semibold"
                >
                  {editingWard ? 'Update' : 'Create'} Ward
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bed Form Modal - Updated with blur background */}
      {showBedForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"> {/* ← BLUR BACKGROUND */}
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-200"> {/* ← SHADOW AND BORDER */}
            <h2 className="text-2xl font-bold mb-6 text-gray-900">
              Add Bed {selectedWard && `to ${selectedWard.wardName}`}
            </h2>
            <form onSubmit={handleBedSubmit} className="space-y-6">
              {!selectedWard && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Select Ward *
                  </label>
                  <select
                    required
                    value={bedFormData.wardId}
                    onChange={(e) => setBedFormData({ ...bedFormData, wardId: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
                  >
                    <option value="">Choose a ward</option>
                    {wards.map(ward => (
                      <option key={ward._id} value={ward._id}>
                        {ward.wardName} ({ward.wardType})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Bed Number *
                </label>
                <input
                  type="text"
                  required
                  value={bedFormData.bedNumber}
                  onChange={(e) => setBedFormData({ ...bedFormData, bedNumber: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
                  placeholder="e.g., A1, B2, etc."
                />
              </div>

              <div className="flex gap-4 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowBedForm(false);
                    setSelectedWard(null);
                    setBedFormData({
                      bedNumber: '',
                      wardId: '',
                    });
                  }}
                  className="px-6 py-3 text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl hover:from-blue-700 hover:to-teal-700 transition-all duration-200 hover:shadow-lg shadow-md font-semibold"
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
