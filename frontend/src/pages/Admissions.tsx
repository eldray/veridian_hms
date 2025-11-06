// src/pages/Admissions.tsx - UPDATED WITH ADMISSION MODAL
import { useState, useEffect } from 'react';
import { useAdmissionStore } from '../store/admissionStore';
import { usePatientStore } from '../store/patientStore';
import { useWardStore } from '../store/wardStore';
import { useAttendanceStore } from '../store/attendanceStore';
import { useAuthStore } from '../store/authStore';
import { 
  Search, 
  Plus, 
  BedDouble, 
  Users, 
  Hospital, 
  Shield, 
  Activity, 
  Heart, 
  Calendar,
  Clock,
  PlayCircle,
  CheckCircle,
  AlertCircle,
  X,
  ArrowRight,
  User,
  Stethoscope
} from 'lucide-react';
import { Link } from 'react-router-dom';

// Admission Modal Component
const AdmissionModal = ({ 
  isOpen, 
  onClose, 
  onAdmit,
  attendances,
  patients 
}) => {
  const [selectedAttendance, setSelectedAttendance] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  // Filter attendances based on search
  const filteredAttendances = attendances.filter(attendance => {
    const patient = patients.find(p => p._id === attendance.patientId || p.id === attendance.patientId);
    const patientName = patient?.fullName?.toLowerCase() || '';
    const attendanceNumber = attendance.attendanceNumber?.toLowerCase() || '';
    const search = searchTerm.toLowerCase();
    
    return patientName.includes(search) || 
           attendanceNumber.includes(search) ||
           patient?.folderNumber?.toLowerCase().includes(search);
  });

  const todayAttendances = filteredAttendances.filter(attendance => {
    const today = new Date().toDateString();
    const attendanceDate = new Date(attendance.dateTime).toDateString();
    return attendanceDate === today;
  });

  const olderAttendances = filteredAttendances.filter(attendance => {
    const today = new Date().toDateString();
    const attendanceDate = new Date(attendance.dateTime).toDateString();
    return attendanceDate !== today;
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-teal-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Admit Patient</h2>
                <p className="text-blue-100">Select an attendance to admit to ward</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-xl transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search patients by name, attendance number, or folder number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[60vh]">
          {/* Today's Attendances */}
          {todayAttendances.length > 0 && (
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-green-600" />
                Today's Attendances ({todayAttendances.length})
              </h3>
              <div className="space-y-3">
                {todayAttendances.map((attendance) => {
                  const patient = patients.find(p => p._id === attendance.patientId || p.id === attendance.patientId);
                  return (
                    <div
                      key={attendance._id}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedAttendance?._id === attendance._id
                          ? 'bg-blue-50 border-blue-500 shadow-lg'
                          : 'bg-gray-50 border-gray-200 hover:border-blue-300 hover:shadow-md'
                      }`}
                      onClick={() => setSelectedAttendance(attendance)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-gray-900">{patient?.fullName}</h4>
                            <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                              {attendance.attendanceNumber}
                            </span>
                            {patient?.folderNumber && (
                              <span className="text-sm bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                                {patient.folderNumber}
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Stethoscope className="w-4 h-4" />
                              <span>{attendance.attendingClinician}</span>
                            </div>
                            <div>
                              <span>{attendance.attendanceType}</span>
                            </div>
                            <div>
                              <span>{attendance.paymentMode}</span>
                            </div>
                          </div>
                          {attendance.complaints && (
                            <p className="text-sm text-gray-500 mt-2">
                              <span className="font-medium">Complaints:</span> {attendance.complaints}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {selectedAttendance?._id === attendance._id ? (
                            <CheckCircle className="w-6 h-6 text-green-600" />
                          ) : (
                            <div className="w-6 h-6 border-2 border-gray-300 rounded-full" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Older Attendances */}
          {olderAttendances.length > 0 && (
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                Previous Attendances ({olderAttendances.length})
              </h3>
              <div className="space-y-3">
                {olderAttendances.map((attendance) => {
                  const patient = patients.find(p => p._id === attendance.patientId || p.id === attendance.patientId);
                  return (
                    <div
                      key={attendance._id}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedAttendance?._id === attendance._id
                          ? 'bg-blue-50 border-blue-500 shadow-lg'
                          : 'bg-gray-50 border-gray-200 hover:border-blue-300 hover:shadow-md'
                      }`}
                      onClick={() => setSelectedAttendance(attendance)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-gray-900">{patient?.fullName}</h4>
                            <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                              {attendance.attendanceNumber}
                            </span>
                            {patient?.folderNumber && (
                              <span className="text-sm bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                                {patient.folderNumber}
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Stethoscope className="w-4 h-4" />
                              <span>{attendance.attendingClinician}</span>
                            </div>
                            <div>
                              <span>{attendance.attendanceType}</span>
                            </div>
                            <div>
                              <span>{attendance.paymentMode}</span>
                            </div>
                            <div className="text-yellow-600">
                              {new Date(attendance.dateTime).toLocaleDateString()}
                            </div>
                          </div>
                          {attendance.complaints && (
                            <p className="text-sm text-gray-500 mt-2">
                              <span className="font-medium">Complaints:</span> {attendance.complaints}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {selectedAttendance?._id === attendance._id ? (
                            <CheckCircle className="w-6 h-6 text-green-600" />
                          ) : (
                            <div className="w-6 h-6 border-2 border-gray-300 rounded-full" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {filteredAttendances.length === 0 && (
            <div className="p-12 text-center">
              <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Attendances Found</h3>
              <p className="text-gray-600">
                {searchTerm ? 'No attendances match your search' : 'No attendances available for admission'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => onAdmit(selectedAttendance)}
              disabled={!selectedAttendance}
              className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl hover:from-blue-700 hover:to-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Continue to Ward Selection</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Admissions() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdmissionModal, setShowAdmissionModal] = useState(false);
  const { admissions, getAdmissions, createAdmission, updateAdmission, dischargeAdmission } = useAdmissionStore();
  const { patients, loadPatients } = usePatientStore();
  const { wards, getWards } = useWardStore();
  const { attendances, getAttendances, updateAttendanceStatus } = useAttendanceStore();
  const { hasRole, user } = useAuthStore();

  useEffect(() => {
    const loadData = async () => {
      await getAdmissions({ status: 'active' });
      await loadPatients();
      await getWards();
      await getAttendances();
    };
    loadData();
  }, [getAdmissions, loadPatients, getWards, getAttendances]);

  const activeAdmissions = admissions.filter(admission => 
    admission.status === 'admitted'
  );

  // Get attendances that can be admitted (inpatient and pending)
  const admitableAttendances = attendances.filter(attendance => 
    attendance.attendanceType === 'inpatient' && 
    attendance.status === 'pending' &&
    !admissions.some(adm => adm.attendanceId === attendance._id)
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

  const stats = {
    totalWards: wards.length,
    totalBeds: wards.reduce((sum, w) => sum + (w.totalBeds || 0), 0),
    occupiedBeds: activeAdmissions.length,
    activeAdmissions: activeAdmissions.length,
    pendingAdmissions: admitableAttendances.length,
    availableBeds: Math.max(0, wards.reduce((sum, w) => sum + (w.totalBeds || 0), 0) - activeAdmissions.length)
  };

  const occupancyRate = stats.totalBeds > 0 
    ? ((stats.occupiedBeds / stats.totalBeds) * 100).toFixed(1) 
    : '0';

  const handleAdmitPatient = async (attendance) => {
    if (!attendance) return;
    
    try {
      // First activate the attendance
      await updateAttendanceStatus(attendance._id, 'active');
      
      // Close the modal
      setShowAdmissionModal(false);
      
      // Navigate to admission form with the selected attendance
      // This would typically open a form or navigate to admission creation page
      console.log('Admitting patient:', attendance);
      
      // For now, we'll create a basic admission
      // In a real implementation, you would navigate to a form with the attendance pre-filled
      const patient = patients.find(p => p._id === attendance.patientId || p.id === attendance.patientId);
      
      // This is a simplified version - you'd want a proper admission form
      const admissionData = {
        attendanceId: attendance._id,
        patientId: attendance.patientId,
        admissionNumber: `ADM-${Date.now()}`,
        admissionDate: new Date().toISOString(),
        admittingDoctor: user?.fullName || user?.username,
        diagnosis: attendance.complaints || 'To be determined',
        status: 'admitted'
      };
      
      await createAdmission(admissionData);
      await getAdmissions();
      
    } catch (error) {
      console.error('Error admitting patient:', error);
    }
  };

  const handleQuickAdmit = () => {
    setShowAdmissionModal(true);
  };

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
            <button
              onClick={handleQuickAdmit}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-sm text-white rounded-xl hover:bg-white/20 transition-all duration-200 hover:shadow-lg border border-white/20 font-semibold"
            >
              <Plus className="w-5 h-5" />
              <span>Admit Patient</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
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
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center shadow-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <span className="text-gray-600 text-sm font-medium">Pending Admissions</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.pendingAdmissions}</p>
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

      {/* Admission Modal */}
      <AdmissionModal
        isOpen={showAdmissionModal}
        onClose={() => setShowAdmissionModal(false)}
        onAdmit={handleAdmitPatient}
        attendances={admitableAttendances}
        patients={patients}
      />

      {/* Rest of the component remains the same... */}
      {/* Search, Wards Overview, Active Admissions sections */}
      
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
          Active Admissions ({activeAdmissions.length})
        </h2>
        {displayedAdmissions.length === 0 ? (
          <div className="text-center py-12">
            <BedDouble className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              {searchQuery ? 'No admissions found' : 'No active admissions'}
            </p>
            {admitableAttendances.length > 0 && (
              <p className="text-gray-600 mt-2">
                There are {admitableAttendances.length} pending inpatient attendances ready for admission.
              </p>
            )}
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
                        <span className="px-4 py-2 text-sm font-semibold rounded-full bg-green-100 text-green-800 border border-green-200">
                          Admitted
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
