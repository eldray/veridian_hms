// src/pages/Attendance.tsx - COMPLETELY FIXED VERSION
import { useState, useEffect } from 'react';
import { useAttendanceStore } from '../store/attendanceStore';
import { usePatientStore } from '../store/patientStore';
import { useAuthStore } from '../store/authStore';
import { Search, Plus, Calendar, User, FileText, Stethoscope, CreditCard, Hospital, Shield, Activity, Loader } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Attendance() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
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
    <div className="space-y-8 p-6 bg-gray-50 min-h-screen">
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
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl hover:from-blue-700 hover:to-teal-700 transition-all duration-200 hover:shadow-lg shadow-md"
            >
              <Plus className="w-5 h-5" />
              <span className="font-semibold">New Attendance</span>
            </Link>
          )}
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
            placeholder="Search by attendance number, patient name, folder number, diagnosis, or payment mode..."
            className="w-full pl-12 pr-4 py-4 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base shadow-sm"
          />
        </div>
        {searchQuery && (
          <p className="text-sm text-gray-600 mt-3">
            Found {displayedAttendances.length} attendance(s) matching "{searchQuery}"
          </p>
        )}
      </div>

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
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {sortedAttendances.map((attendance) => {
            const patient = patients.find((p) => p.id === attendance.patientId || p._id === attendance.patientId);
            const attendanceId = attendance._id || attendance.id;
            const totalBill = attendance.totalBill || 0;
            const paidAmount = attendance.paidAmount || 0;
            const outstandingBalance = totalBill - paidAmount;
            
            return (
              <div
                key={attendanceId}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <h3 className="font-bold text-xl text-gray-900">
                          {patient?.fullName || 'Unknown Patient'}
                        </h3>
                        <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full border">
                          {attendance.attendanceNumber || `ATT-${attendanceId?.slice(-8)}`}
                        </span>
                        {patient?.folderNumber && (
                          <span className="text-sm text-gray-500 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                            {patient.folderNumber}
                          </span>
                        )}
                      </div>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span className="font-medium">
                            {formatDate(attendance.dateTime || attendance.createdAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 flex-wrap">
                          <div className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                            <Stethoscope className="w-4 h-4 text-blue-600" />
                            <span className="font-medium text-blue-700">
                              {getAttendanceTypeLabel(attendance.attendanceType)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                            {getPaymentModeIcon(attendance.paymentMode)}
                            <span className="font-medium text-green-700">
                              {getPaymentModeLabel(attendance.paymentMode)}
                            </span>
                          </div>
                          {attendance.nhisCCC && (
                            <span className="text-xs bg-green-100 text-green-800 px-3 py-1 rounded-full border border-green-200 font-medium">
                              CCC: {attendance.nhisCCC}
                            </span>
                          )}
                        </div>
                        <p className="text-base">
                          <span className="font-semibold text-gray-700">Diagnosis:</span> 
                          {attendance.diagnosis || 'Not specified'}
                        </p>
                        <p className="text-base">
                          <span className="font-semibold text-gray-700">Clinician:</span>{' '}
                          {getClinicianName(attendance)}
                        </p>
                        {attendance.complaints && (
                          <p className="text-base">
                            <span className="font-semibold text-gray-700">Complaints:</span>{' '}
                            {attendance.complaints.length > 100 
                              ? `${attendance.complaints.substring(0, 100)}...` 
                              : attendance.complaints
                            }
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm text-gray-600 font-medium">Total Bill</p>
                      <p className="text-2xl font-bold text-gray-900">
                        ${totalBill.toFixed(2)}
                      </p>
                      {outstandingBalance > 0 && (
                        <p className="text-sm text-red-600 font-medium">
                          Due: ${outstandingBalance.toFixed(2)}
                        </p>
                      )}
                      {outstandingBalance <= 0 && totalBill > 0 && (
                        <p className="text-sm text-green-600 font-medium">
                          Paid in full
                        </p>
                      )}
                    </div>
                    <span
                      className={`px-4 py-2 text-sm font-semibold rounded-full ${getStatusColor(attendance.status)}`}
                    >
                      {(attendance.status || 'active').charAt(0).toUpperCase() + (attendance.status || 'active').slice(1)}
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-4 text-sm text-gray-600 font-medium flex-wrap">
                    <span className="bg-gray-100 px-3 py-1 rounded-full border">
                      Medications: {attendance.medications?.length || 0}
                    </span>
                    <span className="bg-gray-100 px-3 py-1 rounded-full border">
                      Lab Tests: {attendance.labTests?.length || 0}
                    </span>
                    <span className="bg-gray-100 px-3 py-1 rounded-full border">
                      Procedures: {attendance.procedures?.length || 0}
                    </span>
                    {attendance.vitals && (
                      <span className="bg-green-100 px-3 py-1 rounded-full border border-green-200 text-green-700">
                        Vitals Recorded
                      </span>
                    )}
                  </div>
                  <Link
                    to={`/dashboard/attendance/${attendanceId}`}
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold text-sm transition-colors group"
                  >
                    View Details
                    <Activity className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
