// src/components/patients/AttendancesTab.tsx - WITH DEBUGGING
import { Link } from 'react-router-dom';
import { History, Stethoscope, Pill, FlaskConical, DollarSign, Plus, Calendar, User } from 'lucide-react';

interface AttendancesTabProps {
  attendances: any[];
  patient: any;
  onNewAttendance?: () => void;
}

export const AttendancesTab: React.FC<AttendancesTabProps> = ({ 
  attendances, 
  patient, 
  onNewAttendance 
}) => {
  // ✅ ADD DEBUGGING
  console.log('🔍 AttendancesTab Debug:', {
    patient: patient ? {
      id: patient.id || patient._id,
      fullName: patient.fullName
    } : 'NO PATIENT',
    attendancesCount: attendances.length,
    attendances: attendances.map(a => ({
      id: a.id || a._id,
      patientId: a.patientId,
      patient: a.patient,
      status: a.status,
      attendanceType: a.attendanceType
    }))
  });

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

  const getClinicianName = (attendance: any): string => {
    const clinician = attendance.clinicianName || attendance.attendingClinician;
    
    if (!clinician) return 'Unknown Clinician';
    
    if (typeof clinician === 'object' && clinician !== null) {
      return clinician.fullName || clinician.username || clinician.name || 'Unknown Clinician';
    }
    
    return clinician.toString() || 'Unknown Clinician';
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

  const formatCurrency = (amount: any): string => {
    if (amount === null || amount === undefined) return '$0.00';
    
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return isNaN(num) ? '$0.00' : `$${num.toFixed(2)}`;
  };

  const getArrayLength = (arr: any): number => {
    return Array.isArray(arr) ? arr.length : 0;
  };

  const sortedAttendances = [...attendances].sort((a, b) => 
    new Date(b.dateTime || b.createdAt).getTime() - new Date(a.dateTime || a.createdAt).getTime()
  );

  if (sortedAttendances.length === 0) {
    return (
      <div className="text-center py-6">
        <History className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-gray-900 mb-2">No Previous Attendances</h3>
        <p className="text-gray-600 text-sm mb-4">No attendance records found for this patient</p>
        {onNewAttendance ? (
          <button
            onClick={onNewAttendance}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            Create First Attendance
          </button>
        ) : (
          <Link
            to={`/dashboard/attendance/new?patientId=${patient.id || patient._id}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            Create First Attendance
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-base font-bold text-gray-900">Attendance History</h3>
          <p className="text-xs text-gray-600">All visits and consultations for {patient.fullName}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full font-medium">
            {sortedAttendances.length} visit{sortedAttendances.length !== 1 ? 's' : ''}
          </span>
          {onNewAttendance && (
            <button
              onClick={onNewAttendance}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 font-medium text-xs"
            >
              <Plus className="w-3 h-3" />
              New Visit
            </button>
          )}
        </div>
      </div>

      {sortedAttendances.map((attendance) => {
        const attendanceId = attendance._id || attendance.id;
        const totalBill = attendance.totalBill || 0;
        const outstandingBalance = attendance.outstandingBalance || 0;
        
        return (
          <div 
            key={attendanceId} 
            className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-all duration-300 bg-white group"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-start gap-2">
                <div className="bg-blue-100 text-blue-600 p-1.5 rounded">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <h4 className="font-bold text-gray-900 text-sm">
                      {attendance.attendanceNumber || `ATT-${attendanceId?.slice(-8)}`}
                    </h4>
                    <span className={`px-1.5 py-0.5 text-xs font-bold rounded-full ${getStatusColor(attendance.status)}`}>
                      {attendance.status ? 
                        attendance.status.charAt(0).toUpperCase() + attendance.status.slice(1) : 
                        'Active'
                      }
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(attendance.dateTime || attendance.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>{getClinicianName(attendance)}</span>
                    </div>
                  </div>
                </div>
              </div>
              <Link
                to={`/dashboard/attendance/${attendanceId}`}
                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-all duration-200 font-medium text-xs opacity-0 group-hover:opacity-100"
              >
                <span>View</span>
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
              <div className="bg-gray-50 rounded p-2">
                <p className="text-xs text-gray-600 font-medium mb-1">Visit Type</p>
                <p className="font-semibold text-gray-900 text-xs">
                  {getAttendanceTypeLabel(attendance.attendanceType)}
                </p>
              </div>
              <div className="bg-gray-50 rounded p-2">
                <p className="text-xs text-gray-600 font-medium mb-1">Payment Mode</p>
                <p className="font-semibold text-gray-900 text-xs capitalize">
                  {attendance.paymentMode || 'Not specified'}
                </p>
              </div>
              <div className="bg-gray-50 rounded p-2">
                <p className="text-xs text-gray-600 font-medium mb-1">Complaints</p>
                <p className="font-semibold text-gray-900 text-xs">
                  {attendance.complaints || 'No complaints recorded'}
                </p>
              </div>
            </div>

            {/* Services Summary */}
            <div className="flex items-center gap-2 mb-2 text-xs">
              <div className="flex items-center gap-1 bg-blue-50 px-1.5 py-0.5 rounded">
                <Pill className="w-3 h-3 text-blue-600" />
                <span className="font-medium text-blue-700">
                  {getArrayLength(attendance.medications)} Meds
                </span>
              </div>
              <div className="flex items-center gap-1 bg-green-50 px-1.5 py-0.5 rounded">
                <FlaskConical className="w-3 h-3 text-green-600" />
                <span className="font-medium text-green-700">
                  {getArrayLength(attendance.labTests)} Tests
                </span>
              </div>
              {getArrayLength(attendance.procedures) > 0 && (
                <div className="flex items-center gap-1 bg-purple-50 px-1.5 py-0.5 rounded">
                  <span className="font-medium text-purple-700">
                    {getArrayLength(attendance.procedures)} Procedures
                  </span>
                </div>
              )}
            </div>

            {/* Billing Information */}
            {(totalBill > 0 || outstandingBalance > 0) && (
              <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                <div className="flex items-center gap-2 text-xs">
                  {totalBill > 0 && (
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-green-600" />
                      <span className="font-semibold text-gray-900">
                        Total: {formatCurrency(totalBill)}
                      </span>
                    </div>
                  )}
                  {outstandingBalance > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-red-600">
                        Outstanding: {formatCurrency(outstandingBalance)}
                      </span>
                    </div>
                  )}
                </div>
                <Link
                  to={`/dashboard/attendance/${attendanceId}`}
                  className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                >
                  View Details →
                </Link>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};