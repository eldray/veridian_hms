// src/pages/Admissions.tsx - FIXED VERSION
import { useState, useEffect } from 'react';
import { useAdmissionStore } from '../store/admissionStore';
import { usePatientStore } from '../store/patientStore';
import { useWardStore } from '../store/wardStore'; // ← ADD MISSING IMPORT
import { useAuthStore } from '../store/authStore';
import { Search, Plus, BedDouble, Users, Hospital, Shield, Activity, Heart, Calendar } from 'lucide-react'; // ← ADDED CALENDAR
import { Link } from 'react-router-dom';

export default function Admissions() {
  const [searchQuery, setSearchQuery] = useState('');
  const { admissions, getAdmissions, createAdmission, updateAdmission, dischargeAdmission } = useAdmissionStore();
  const { patients, loadPatients } = usePatientStore();
  const { wards, getWards } = useWardStore(); // ← ADD WARD STORE
  const { hasRole, user } = useAuthStore();

  // FIXED: useEffect
  useEffect(() => {
    const loadData = async () => {
      await getAdmissions({ status: 'active' }); // ✅ CORRECT METHOD
      await loadPatients();
      await getWards(); // ← LOAD WARDS
    };
    loadData();
  }, [getAdmissions, loadPatients, getWards]);

  // FIXED: Calculate active admissions from store data
  const activeAdmissions = admissions.filter(admission => 
    admission.status === 'active' || admission.status === 'admitted'
  );

  const displayedAdmissions = searchQuery
    ? activeAdmissions.filter((a) => {
        const patient = patients.find((p) => p.id === a.patientId || p._id === a.patientId);
        return (
          a.admissionNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          patient?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          patient?.folderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.diagnosis?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      })
    : activeAdmissions;

  const canAdmitPatient = hasRole(['admin', 'doctor', 'nurse']);

  // FIXED: Stats calculation with proper ward data
  const stats = {
    totalWards: wards.length,
    totalBeds: wards.reduce((sum, w) => sum + (w.totalBeds || 0), 0),
    occupiedBeds: activeAdmissions.length,
    activeAdmissions: activeAdmissions.length,
  };

  const occupancyRate = stats.totalBeds > 0 
    ? ((stats.occupiedBeds / stats.totalBeds) * 100).toFixed(1) 
    : '0';

  return (
    <div className="space-y-8 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-blue-900 rounded-2xl p-8 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20">
              <Hospital className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">Admissions & Ward Management</h1>
              <p className="text-blue-100 text-lg">Manage patient admissions and bed allocation</p>
            </div>
          </div>
          {canAdmitPatient && (
            <Link
              to="/admissions/new"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-sm text-white rounded-xl hover:bg-white/20 transition-all duration-200 hover:shadow-lg border border-white/20 font-semibold"
            >
              <Plus className="w-5 h-5" />
              <span>Admit Patient</span>
            </Link>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shadow-lg">
              <BedDouble className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-gray-600 text-sm font-medium">Total Wards</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.totalWards}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center shadow-lg">
              <BedDouble className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-gray-600 text-sm font-medium">Total Beds</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.totalBeds}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center shadow-lg">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-gray-600 text-sm font-medium">Active Admissions</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.activeAdmissions}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center shadow-lg">
              <Activity className="w-6 h-6 text-amber-600" />
            </div>
            <span className="text-gray-600 text-sm font-medium">Occupancy Rate</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{occupancyRate}%</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search admissions by number, patient name, folder number, or diagnosis..."
            className="w-full pl-12 pr-4 py-4 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base shadow-sm"
          />
        </div>
      </div>

      {/* Wards Overview */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <BedDouble className="w-6 h-6 text-blue-600" />
          Wards Overview
        </h2>
        {wards.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <BedDouble className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg mb-4">No wards configured</p>
            <Link
              to="/dashboard/wards"
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all"
            >
              Manage Wards
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {wards.map((ward) => {
              const wardAdmissions = activeAdmissions.filter(a => a.wardId === ward._id || a.wardId === ward.id);
              const occupancyPercent = ward.totalBeds > 0
                ? ((wardAdmissions.length / ward.totalBeds) * 100).toFixed(0)
                : '0';

              return (
                <div key={ward._id || ward.id} className="bg-gray-50 p-6 rounded-2xl border border-gray-200 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg text-gray-900">{ward.wardName}</h3>
                    <span className="text-xs px-3 py-1 bg-blue-100 text-blue-800 rounded-full capitalize font-medium border border-blue-200">
                      {ward.wardType}
                    </span>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Total Beds:</span>
                      <span className="font-semibold text-gray-900">{ward.totalBeds}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Occupied:</span>
                      <span className="font-semibold text-gray-900">{wardAdmissions.length}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Available:</span>
                      <span className="font-semibold text-green-600">
                        {ward.totalBeds - wardAdmissions.length}
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Daily Rate:</span>
                      <span className="font-semibold text-gray-900">${ward.dailyRate || 'N/A'}</span>
                    </div>
                    <div className="mt-4">
                      <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span className="font-medium">Occupancy</span>
                        <span className="font-semibold">{occupancyPercent}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-blue-600 to-teal-600 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${occupancyPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Admissions */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Users className="w-6 h-6 text-green-600" />
          Active Admissions
        </h2>
        {displayedAdmissions.length === 0 ? (
          <div className="text-center py-12">
            <BedDouble className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              {searchQuery ? 'No admissions found' : 'No active admissions'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedAdmissions.map((admission) => {
              const patient = patients.find((p) => p.id === admission.patientId || p._id === admission.patientId);
              const ward = wards.find((w) => w.id === admission.wardId || w._id === admission.wardId);
              const daysAdmitted = Math.floor(
                (new Date().getTime() - new Date(admission.admissionDate).getTime()) /
                  (1000 * 60 * 60 * 24)
              );

              return (
                <div
                  key={admission._id || admission.id}
                  className="bg-gray-50 rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <h3 className="font-bold text-xl text-gray-900">
                          {patient?.fullName || 'Unknown'}
                        </h3>
                        <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full border">
                          {admission.admissionNumber}
                        </span>
                        {patient?.folderNumber && (
                          <span className="text-sm text-gray-500 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                            {patient.folderNumber}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <BedDouble className="w-4 h-4 text-blue-600" />
                          <span><strong>Ward:</strong> {ward?.wardName || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-green-600" />
                          <span><strong>Admitted:</strong> {new Date(admission.admissionDate).toLocaleDateString()}</span>
                        </div>
                        <div>
                          <span><strong>Days:</strong> {daysAdmitted}</span>
                        </div>
                        <div>
                          <span><strong>Doctor:</strong> {admission.admittingDoctor}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-3">
                        <span className="font-semibold">Diagnosis:</span> {admission.diagnosis}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="px-4 py-2 text-sm font-semibold rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                          {admission.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
