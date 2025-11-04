// src/pages/Attendance.tsx - ENHANCED WITH PAGINATION & VIEW OPTIONS
import { useState, useEffect } from 'react';
import { useAttendanceStore } from '../store/attendanceStore';
import { usePatientStore } from '../store/patientStore';
import { useAuthStore } from '../store/authStore';
import { 
  Search, 
  Plus, 
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
  Scissors
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Attendance() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [itemsPerPage, setItemsPerPage] = useState(6);
  
  const { attendances, getAttendances, isLoading: storeLoading } = useAttendanceStore();
  const { patients, loadPatients } = usePatientStore();
  const { hasRole } = useAuthStore();

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([
          getAttendances(),
          loadPatients()
        ]);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [getAttendances, loadPatients]);

  const displayedAttendances = searchQuery
    ? attendances.filter((a) => {
        const patient = patients.find((p) => p.id === a.patientId || p._id === a.patientId);
        const searchLower = searchQuery.toLowerCase();
        
        return (
          a.attendanceNumber?.toLowerCase().includes(searchLower) ||
          patient?.fullName?.toLowerCase().includes(searchLower) ||
          patient?.folderNumber?.toLowerCase().includes(searchLower) ||
          a.diagnosis?.toLowerCase().includes(searchLower) ||
          a.attendanceType?.toLowerCase().includes(searchLower) ||
          a.paymentMode?.toLowerCase().includes(searchLower) ||
          a.nhisCCC?.toLowerCase().includes(searchLower)
        );
      })
    : attendances;

  const sortedAttendances = [...displayedAttendances].sort(
    (a, b) => new Date(b.dateTime || b.createdAt).getTime() - new Date(a.dateTime || a.createdAt).getTime()
  );

  // Pagination calculations
  const totalPages = Math.ceil(sortedAttendances.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAttendances = sortedAttendances.slice(startIndex, startIndex + itemsPerPage);

  const canCreateAttendance = hasRole(['admin', 'doctor', 'nurse']);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border border-red-200';
      case 'admitted':
        return 'bg-purple-100 text-purple-800 border border-purple-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'active':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const getAttendanceTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      'general_opd': 'General OPD',
      'specialist_opd': 'Specialist OPD',
      'specialist_consultation': 'Specialist',
      'antenatal_care': 'Antenatal',
      'diagnostic_opd': 'Diagnostic',
      'emergency': 'Emergency',
      'other_opd': 'Other OPD',
      'inpatient': 'Inpatient',
      'surgical': 'Surgical',
      'maternity': 'Maternity',
      'pediatric': 'Pediatric',
      'dental': 'Dental',
      'optical': 'Optical',
      'physiotherapy': 'Physiotherapy',
      'laboratory': 'Laboratory',
      'radiology': 'Radiology'
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
      case 'nhis':
        return <Shield className="w-4 h-4 text-green-600" />;
      case 'private_insurance':
        return <Hospital className="w-4 h-4 text-blue-600" />;
      default:
        return <CreditCard className="w-4 h-4 text-gray-600" />;
    }
  };

  // Safe clinician name extraction
  const getClinicianName = (attendance: any) => {
    const clinician = attendance.clinicianName || attendance.attendingClinician;
    
    if (!clinician) return 'Unknown Clinician';
    
    // If clinician is an object, extract the name
    if (typeof clinician === 'object' && clinician !== null) {
      return clinician.fullName || clinician.username || clinician.name || 'Unknown Clinician';
    }
    
    // If clinician is a string or other primitive
    return clinician || 'Unknown Clinician';
  };

  // Safe date formatting
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

  if (isLoading || storeLoading) {
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
              {sortedAttendances.length} attendance(s) found
            </p>
          </div>
          {canCreateAttendance && (
            <Link
              to="/dashboard/attendance/new"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl hover:from-blue-700 hover:to-teal-700 transition-all duration-200 hover:shadow-lg shadow-md font-semibold"
            >
              <Plus className="w-5 h-5" />
              <span>New Attendance</span>
            </Link>
          )}
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          {/* Search */}
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
                placeholder="Search attendances..."
                className="w-full pl-10 pr-4 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-sm"
              />
            </div>
          </div>

          {/* View Controls */}
          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
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

            {/* Items Per Page */}
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
      {sortedAttendances.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-800">
                Showing {paginatedAttendances.length} of {sortedAttendances.length} attendances
              </p>
              {searchQuery && (
                <p className="text-xs text-blue-600 mt-1">
                  Search results for: "{searchQuery}"
                </p>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-blue-700">
              <span className="bg-blue-100 px-2 py-1 rounded-full">
                Active: {sortedAttendances.filter(a => a.status === 'active').length}
              </span>
              <span className="bg-green-100 px-2 py-1 rounded-full">
                Completed: {sortedAttendances.filter(a => a.status === 'completed').length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Attendance List */}
      {sortedAttendances.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-200 text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            {searchQuery ? 'No Attendances Found' : 'No Attendances Recorded'}
          </h3>
          <p className="text-gray-600 mb-6 text-lg">
            {searchQuery 
              ? 'Try adjusting your search terms to find what you\'re looking for.'
              : 'Get started by recording your first patient attendance.'
            }
          </p>
          {canCreateAttendance && !searchQuery && (
            <Link
              to="/dashboard/attendance/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl hover:from-blue-700 hover:to-teal-700 transition-all duration-200 font-semibold"
            >
              <Plus className="w-5 h-5" />
              Record First Attendance
            </Link>
          )}
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
        // Cards View
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {paginatedAttendances.map((attendance) => {
            const patient = patients.find((p) => p.id === attendance.patientId || p._id === attendance.patientId);
            const attendanceId = attendance._id || attendance.id;
            const totalBill = attendance.totalBill || 0;
            const paidAmount = attendance.paidAmount || 0;
            const outstandingBalance = totalBill - paidAmount;
            
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
                      <h3 className="font-bold text-gray-900">{patient?.fullName || 'Unknown Patient'}</h3>
                      <p className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded border mt-1">
                        {attendance.attendanceNumber || `ATT-${attendanceId?.slice(-8)}`}
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
                  {attendance.diagnosis && (
                    <p className="text-gray-700">
                      <span className="font-semibold">Diagnosis:</span> {attendance.diagnosis}
                    </p>
                  )}
                </div>

                {/* Quick Stats */}
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

                {/* Action Buttons */}
                <div className="flex gap-2 pt-3 border-t border-gray-200">
                  <Link
                    to={`/dashboard/attendance/${attendanceId}`}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-semibold text-xs shadow-sm hover:shadow-md"
                  >
                    <Eye className="w-3 h-3" />
                    View
                  </Link>
                  <Link
                    to={`/dashboard/attendance/${attendanceId}/edit`}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-all duration-200 font-semibold text-xs shadow-sm hover:shadow-md"
                  >
                    <Edit className="w-3 h-3" />
                    Edit
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // List View
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
                const patient = patients.find((p) => p.id === attendance.patientId || p._id === attendance.patientId);
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
                          <p className="font-semibold text-gray-900">{patient?.fullName || 'Unknown Patient'}</p>
                          <p className="text-xs text-gray-500">{attendance.attendanceNumber}</p>
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
                        <Link
                          to={`/dashboard/attendance/${attendanceId}/edit`}
                          className="p-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors duration-200"
                          title="Edit Attendance"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
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
      {sortedAttendances.length > 0 && totalPages > 1 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, sortedAttendances.length)} of{' '}
              {sortedAttendances.length} attendances
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              {/* Page Numbers */}
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
    </div>
  );
}
