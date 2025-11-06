// src/pages/Attendance.tsx - WITH DEBUGGING AND FIXED PATIENT MATCHING
import { useState, useEffect, useMemo } from 'react';
import { useAttendanceStore } from '../store/attendanceStore';
import { usePatientStore } from '../store/patientStore';
import { useAuthStore } from '../store/authStore';
import { 
  Search, 
  Calendar, 
  User, 
  FileText, 
  Stethoscope, 
  CreditCard, 
  Hospital, 
  Shield, 
  Activity, 
  Loader,
  Grid,
  List,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  DollarSign,
  Pill,
  FlaskConical,
  Scissors,
  RefreshCw
} from 'lucide-react';
import { Link } from 'react-router-dom';
import NewAttendanceModal from '../components/NewAttendanceModal';

export default function Attendance() {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  const { 
    attendances, 
    getAttendances, 
    isLoading: attendancesLoading 
  } = useAttendanceStore();
  
  const { 
    patients, 
    loadPatients,
    isLoading: patientsLoading 
  } = usePatientStore();
  
  const { hasRole } = useAuthStore();

  const isLoading = attendancesLoading || patientsLoading;

  // Load data
  const loadData = async () => {
    try {
      setRefreshing(true);
      await Promise.all([
        getAttendances(),
        loadPatients()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ✅ DEBUGGING: Log data to see what we're working with
  useEffect(() => {
    if (attendances.length > 0 && patients.length > 0) {
      console.log('🔍 DEBUG - Attendance Data Analysis:');
      console.log('Total attendances:', attendances.length);
      console.log('Total patients:', patients.length);
      
      // Log first few attendances to see their structure
      attendances.slice(0, 3).forEach((attendance, index) => {
        console.log(`Attendance ${index}:`, {
          id: attendance._id || attendance.id,
          patientId: attendance.patientId,
          patientObject: attendance.patient,
          hasPatientObject: !!attendance.patient,
          hasPatientId: !!attendance.patientId
        });
      });
      
      // Log first few patients to see their structure
      patients.slice(0, 3).forEach((patient, index) => {
        console.log(`Patient ${index}:`, {
          id: patient._id || patient.id,
          fullName: patient.fullName,
          folderNumber: patient.folderNumber
        });
      });
    }
  }, [attendances, patients]);

  // ✅ IMPROVED PATIENT MATCHING WITH DEBUGGING
// FIXED PATIENT MATCHING FUNCTION
const findPatient = (attendance: any) => {
  console.log('🔍 [findPatient] Processing attendance:', {
    attendanceId: attendance._id || attendance.id,
    rawPatientId: attendance.patientId,
    patientIdType: typeof attendance.patientId,
    hasPatientObject: !!attendance.patient,
    patientObject: attendance.patient
  });

  // If attendance has a populated patient object with fullName, use it
  if (attendance?.patient?.fullName) {
    console.log('✅ Using populated patient object:', attendance.patient.fullName);
    return attendance.patient;
  }

  // Handle patientId as OBJECT - extract the actual ID
  let actualPatientId: string | null = null;
  
  if (attendance.patientId && typeof attendance.patientId === 'object') {
    // patientId is an object, extract the ID from common field names
    actualPatientId = (
      attendance.patientId._id ||
      attendance.patientId.id ||
      attendance.patientId.patientId ||
      attendance.patientId.patientID
    )?.toString();
    
    console.log('🔍 Extracted patient ID from object:', actualPatientId);
  } else if (attendance.patientId) {
    // patientId is already a string or primitive
    actualPatientId = attendance.patientId.toString();
  }

  // If we found an actual patient ID, try to match it
  if (actualPatientId) {
    console.log('🔍 Looking for patient with ID:', actualPatientId);
    console.log('🔍 Available patient IDs:', patients.map(p => (p._id || p.id)?.toString()));
    
    const patient = patients.find(p => {
      const patientId = (p._id || p.id)?.toString();
      const found = patientId === actualPatientId;
      if (found) {
        console.log(`✅ Matched patient: ${p.fullName} (${patientId})`);
      }
      return found;
    });

    if (patient) {
      return patient;
    }
  }

  // Last resort: check if patient object exists but without fullName
  if (attendance.patient && typeof attendance.patient === 'object') {
    console.log('🔍 Checking patient object without fullName:', attendance.patient);
    // If patient object has an ID but no fullName, see if we can find it in patients
    const patientObjId = (
      attendance.patient._id ||
      attendance.patient.id ||
      attendance.patient.patientId
    )?.toString();
    
    if (patientObjId) {
      const patient = patients.find(p => (p._id || p.id)?.toString() === patientObjId);
      if (patient) {
        console.log('✅ Found patient via patient object ID:', patient.fullName);
        return patient;
      }
    }
  }

  console.log('❌ No patient found for attendance:', {
    attendanceId: attendance._id || attendance.id,
    patientIdObject: attendance.patientId,
    extractedPatientId: actualPatientId,
    availablePatients: patients.map(p => ({ id: p._id || p.id, name: p.fullName }))
  });

  return null;
};

  // Memoize filtered/sorted attendances
  const filteredAttendances = useMemo(() => {
    if (!attendances.length) return [];
    
    const result = attendances.filter((a) => {
      const patient = findPatient(a);
      const searchLower = searchQuery.toLowerCase();
      
      return (
        a.attendanceNumber?.toLowerCase().includes(searchLower) ||
        patient?.fullName?.toLowerCase().includes(searchLower) ||
        patient?.folderNumber?.toLowerCase().includes(searchLower) ||
        a.complaints?.toLowerCase().includes(searchLower) ||
        a.attendanceType?.toLowerCase().includes(searchLower) ||
        a.paymentMode?.toLowerCase().includes(searchLower) ||
        a.nhisCCC?.toLowerCase().includes(searchLower)
      );
    });

    return result.sort(
      (a, b) => new Date(b.dateTime || b.createdAt).getTime() - new Date(a.dateTime || a.createdAt).getTime()
    );
  }, [attendances, patients, searchQuery]);

  // Rest of your component remains the same...
  const totalPages = Math.ceil(filteredAttendances.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAttendances = filteredAttendances.slice(startIndex, startIndex + itemsPerPage);

  const canCreateAttendance = hasRole(['admin', 'doctor', 'nurse']);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800 border border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border border-red-200';
      case 'admitted': return 'bg-purple-100 text-purple-800 border border-purple-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'active': return 'bg-blue-100 text-blue-800 border border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const getAttendanceTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      'general_opd': 'General OPD',
      'specialist_consultation': 'Specialist',
      'antenatal_care': 'Antenatal',
      'diagnostic_opd': 'Diagnostic',
      'emergency': 'Emergency',
      'other_opd': 'Other OPD',
      'inpatient': 'Inpatient'
    };
    return typeMap[type] || type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'General OPD';
  };

  const getPaymentModeLabel = (mode: string) => {
    const modeMap: Record<string, string> = {
      'cash': 'Cash',
      'nhis': 'NHIS',
      'private_insurance': 'Private Insurance'
    };
    return modeMap[mode] || mode?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Cash';
  };

  const getPaymentModeIcon = (mode: string) => {
    switch (mode) {
      case 'nhis': return <Shield className="w-4 h-4 text-green-600" />;
      case 'private_insurance': return <Hospital className="w-4 h-4 text-blue-600" />;
      default: return <CreditCard className="w-4 h-4 text-gray-600" />;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleEditAttendance = (attendance: any) => {
    setSelectedAttendance(attendance);
    setEditModalOpen(true);
  };

  const handleEditSuccess = (updatedAttendance: any) => {
    setEditModalOpen(false);
    setSelectedAttendance(null);
    loadData();
  };

  const handleEditClose = () => {
    setEditModalOpen(false);
    setSelectedAttendance(null);
  };

  const handleRefresh = () => {
    loadData();
    setCurrentPage(1);
  };

  if (isLoading && !refreshing) {
    return (
      <div className="space-y-8 p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl p-12 shadow-lg border border-gray-200">
          <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading Attendances...</h2>
          <p className="text-gray-600">Please wait while we load attendance records.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-blue-900 rounded-2xl p-8 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Hospital className="w-8 h-8 text-blue-600" />
              Attendance Management
            </h1>
            <p className="text-white mt-2">Manage patient visits and clinical records</p>
            <p className="text-blue-200 text-sm mt-1">
              {filteredAttendances.length} attendance(s) found • {patients.length} patient(s) loaded
            </p>
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex-1 w-full sm:max-w-md">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by patient name, folder number, attendance number..."
                className="w-full pl-10 pr-4 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('cards')}
                className={`p-2 rounded-md transition-all duration-200 ${
                  viewMode === 'cards'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-all duration-200 ${
                  viewMode === 'list'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-sm"
            >
              <option value={6}>6 per page</option>
              <option value={12}>12 per page</option>
              <option value={24}>24 per page</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Count */}
      {filteredAttendances.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-800">
                Showing {paginatedAttendances.length} of {filteredAttendances.length} attendances
              </p>
              {searchQuery && (
                <p className="text-xs text-blue-600 mt-1">
                  Search results for: "{searchQuery}"
                </p>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-blue-700">
              <span className="bg-blue-100 px-2 py-1 rounded-full">
                Active: {filteredAttendances.filter(a => a.status === 'active').length}
              </span>
              <span className="bg-green-100 px-2 py-1 rounded-full">
                Completed: {filteredAttendances.filter(a => a.status === 'completed').length}
              </span>
              <span className="bg-yellow-100 px-2 py-1 rounded-full">
                Pending: {filteredAttendances.filter(a => a.status === 'pending').length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Attendance List */}
      {filteredAttendances.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-200 text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            {searchQuery ? 'No Attendances Found' : 'No Attendances Recorded'}
          </h3>
          <p className="text-gray-600 mb-6 text-lg">
            {searchQuery 
              ? 'Try adjusting your search terms to find what you\'re looking for.'
              : 'No attendance records have been created yet.'
            }
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-all duration-200 font-semibold"
            >
              Clear Search
            </button>
          )}
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {paginatedAttendances.map((attendance) => {
            const patient = findPatient(attendance);
            const attendanceId = attendance._id || attendance.id;
            const totalBill = attendance.totalBill || 0;
            
            return (
              <div
                key={attendanceId}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">
                        {patient?.fullName || `Patient ${attendance.patientId?.toString().slice(-6) || 'Unknown'}`}
                      </h3>
                      <p className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded border mt-1">
                        {patient?.folderNumber || 'No Folder'} • {attendance.attendanceNumber || `ATT-${attendanceId?.slice(-8)}`}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(attendance.status)}`}
                  >
                    {(attendance.status || 'active').charAt(0).toUpperCase() + (attendance.status || 'active').slice(1)}
                  </span>
                </div>

                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span className="font-medium">
                      {formatDate(attendance.dateTime || attendance.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-blue-700">
                      {getAttendanceTypeLabel(attendance.attendanceType)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getPaymentModeIcon(attendance.paymentMode)}
                    <span className="font-medium text-gray-700">
                      {getPaymentModeLabel(attendance.paymentMode)}
                    </span>
                  </div>
                  {attendance.complaints && attendance.complaints !== 'No complaints recorded' && (
                    <p className="text-gray-700 text-xs">
                      <span className="font-semibold">Complaints:</span> {attendance.complaints}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 mb-4 text-xs text-gray-600">
                  <span className="flex items-center gap-1">
                    <Pill className="w-3 h-3" />
                    {attendance.medications?.length || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <FlaskConical className="w-3 h-3" />
                    {attendance.labTests?.length || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <Scissors className="w-3 h-3" />
                    {attendance.procedures?.length || 0}
                  </span>
                  {totalBill > 0 && (
                    <span className="flex items-center gap-1 ml-auto font-medium">
                      <DollarSign className="w-3 h-3" />
                      ${totalBill.toFixed(2)}
                    </span>
                  )}
                </div>

                <div className="flex gap-2 pt-3 border-t border-gray-200">
                  <Link
                    to={`/dashboard/attendance/${attendanceId}`}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-semibold text-xs shadow-sm hover:shadow-md"
                  >
                    <Eye className="w-3 h-3" />
                    View
                  </Link>
                  <button
                    onClick={() => handleEditAttendance(attendance)}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-all duration-200 font-semibold text-xs shadow-sm hover:shadow-md"
                  >
                    <Edit className="w-3 h-3" />
                    Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Patient</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date & Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Payment</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedAttendances.map((attendance) => {
                const patient = findPatient(attendance);
                const attendanceId = attendance._id || attendance.id;
                const totalBill = attendance.totalBill || 0;
                
                return (
                  <tr key={attendanceId} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-teal-500 rounded-lg flex items-center justify-center shadow-sm">
                          <User className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {patient?.fullName || `Patient ${attendance.patientId?.toString().slice(-6) || 'Unknown'}`}
                          </p>
                          <p className="text-xs text-gray-500">
                            {patient?.folderNumber || 'No Folder'} • {attendance.attendanceNumber}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        <p className="font-medium text-gray-900">
                          {formatDate(attendance.dateTime || attendance.createdAt)}
                        </p>
                        <p className="text-gray-600">{getAttendanceTypeLabel(attendance.attendanceType)}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-sm">
                        {getPaymentModeIcon(attendance.paymentMode)}
                        <span className="font-medium">{getPaymentModeLabel(attendance.paymentMode)}</span>
                        {totalBill > 0 && (
                          <span className="text-green-600 font-bold ml-2">${totalBill.toFixed(2)}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(attendance.status)}`}
                      >
                        {(attendance.status || 'active').charAt(0).toUpperCase() + (attendance.status || 'active').slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/dashboard/attendance/${attendanceId}`}
                          className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleEditAttendance(attendance)}
                          className="p-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors duration-200"
                          title="Edit Attendance"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {filteredAttendances.length > 0 && totalPages > 1 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredAttendances.length)} of{' '}
              {filteredAttendances.length} attendances
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => goToPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Attendance Modal */}
      {editModalOpen && selectedAttendance && (
        <NewAttendanceModal
          patientId={selectedAttendance.patientId}
          onSuccess={handleEditSuccess}
          onClose={handleEditClose}
          isEditMode={true}
          attendanceData={selectedAttendance}
        />
      )}
    </div>
  );
}
