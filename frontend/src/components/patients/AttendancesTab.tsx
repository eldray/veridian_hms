// src/components/patients/AttendancesTab.tsx
import api from '../../api/api';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { History, Stethoscope, Pill, FlaskConical, DollarSign, Plus, Calendar, User, CreditCard } from 'lucide-react';

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
  const [generatingCCC, setGeneratingCCC] = useState(false);

  const handleGenerateCCC = async () => {
    if (!patient.nhisNumber) {
      alert('Patient does not have an NHIS number. Please update patient profile first.');
      return;
    }

    setGeneratingCCC(true);
    try {
      const response = await api.post('/patients/generate-ccc', {
        patientId: patient.id || patient._id,
        nhisNumber: patient.nhisNumber
      });

      if (response.data.success) {
        alert(`CCC Generated Successfully!\nCCC ID: ${response.data.cccId}`);
        window.location.reload();
      }
    } catch (error: any) {
      alert(`Failed to generate CCC: ${error.response?.data?.message || error.message}`);
    } finally {
      setGeneratingCCC(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'border-[var(--icon-green-text)]/30 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]';
      case 'cancelled':
        return 'border-[var(--icon-red-text)]/30 bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]';
      case 'admitted':
        return 'border-[var(--icon-purple-text)]/30 bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]';
      case 'pending':
        return 'border-[var(--icon-yellow-text)]/30 bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]';
      case 'active':
        return 'border-[var(--icon-blue-text)]/30 bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)]';
      default:
        return 'border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-secondary)]';
    }
  };

  const getAttendanceTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      general_opd: 'General OPD',
      specialist_consultation: 'Specialist',
      antenatal_care: 'Antenatal',
      diagnostic_opd: 'Diagnostic',
      emergency: 'Emergency',
      other_opd: 'Other OPD',
      inpatient: 'Inpatient'
    };
    return typeMap[type] || type?.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase()) || 'General OPD';
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
    if (!dateString) return 'Date unavailable';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'Invalid Date';

    return date.toLocaleString('en-GH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: any): string => {
    if (amount === null || amount === undefined) return '₵0.00';

    const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
    return Number.isFinite(num) ? `₵${num.toFixed(2)}` : '₵0.00';
  };

  const getArrayLength = (arr: any): number => {
    return Array.isArray(arr) ? arr.length : 0;
  };

  const sortedAttendances = [...(Array.isArray(attendances) ? attendances : [])].sort((a, b) =>
    new Date(b.dateTime || b.createdAt).getTime() - new Date(a.dateTime || a.createdAt).getTime()
  );

  if (sortedAttendances.length === 0) {
    return (
      <div className="text-center py-6">
        <History className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">No Previous Attendances</h3>
        <p className="text-[var(--text-secondary)] text-sm mb-4">No attendance records found for this patient</p>
        {onNewAttendance ? (
          <button
            type="button"
            onClick={onNewAttendance}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--icon-blue-text)]"
            style={{ backgroundColor: 'var(--icon-blue-text)' }}
          >
            <Plus className="w-4 h-4" />
            Create First Attendance
          </button>
        ) : (
          <Link
            to={`/dashboard/attendance/new?patientId=${patient.id || patient._id}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--icon-blue-text)]"
            style={{ backgroundColor: 'var(--icon-blue-text)' }}
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
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-[var(--text-primary)]">Attendance History</h3>
          <p className="text-xs text-[var(--text-secondary)]">All visits and consultations for {patient.fullName}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {patient.nhisNumber && (
            <button
              type="button"
              onClick={handleGenerateCCC}
              disabled={generatingCCC}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-medium text-xs text-white transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--icon-purple-text)]"
              style={{ backgroundColor: 'var(--icon-purple-text)' }}
            >
              <CreditCard className={`w-3 h-3 ${generatingCCC ? 'animate-spin' : ''}`} />
              {generatingCCC ? 'Generating...' : 'Generate CCC'}
            </button>
          )}
          <span className="text-xs text-[var(--text-secondary)] bg-[var(--bg-main)] border border-[var(--border-color)] px-2 py-1 rounded-full font-medium">
            {sortedAttendances.length} visit{sortedAttendances.length !== 1 ? 's' : ''}
          </span>
          {onNewAttendance && (
            <button
              type="button"
              onClick={onNewAttendance}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-medium text-xs text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--icon-green-text)]"
              style={{ backgroundColor: 'var(--icon-green-text)' }}
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
            className="border border-[var(--border-color)] rounded-lg p-3 transition-shadow hover:shadow-md bg-[var(--bg-card)]"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-start gap-2 min-w-0">
                <div className="p-1.5 rounded bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)]">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1 mb-1">
                    <h4 className="font-bold text-[var(--text-primary)] text-sm">
                      {attendance.attendanceNumber || `ATT-${attendanceId?.slice(-8)}`}
                    </h4>
                    <span className={`px-1.5 py-0.5 text-xs font-bold rounded-full border ${getStatusColor(attendance.status)}`}>
                      {attendance.status
                        ? attendance.status.charAt(0).toUpperCase() + attendance.status.slice(1)
                        : 'Active'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-secondary)]">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(attendance.dateTime || attendance.createdAt)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {getClinicianName(attendance)}
                    </span>
                  </div>
                </div>
              </div>
              <Link
                to={`/dashboard/attendance/${attendanceId}`}
                aria-label={`View attendance ${attendance.attendanceNumber || attendanceId}`}
                className="inline-flex items-center gap-1 flex-shrink-0 px-2.5 py-1.5 rounded-md text-white transition-colors text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--icon-blue-text)]"
                style={{ backgroundColor: 'var(--icon-blue-text)' }}
              >
                View
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
              <div className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded p-2 min-w-0">
                <p className="text-xs text-[var(--text-secondary)] font-medium mb-1">Visit Type</p>
                <p className="font-semibold text-[var(--text-primary)] text-xs">
                  {getAttendanceTypeLabel(attendance.attendanceType)}
                </p>
              </div>
              <div className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded p-2 min-w-0">
                <p className="text-xs text-[var(--text-secondary)] font-medium mb-1">Payment Mode</p>
                <p className="font-semibold text-[var(--text-primary)] text-xs capitalize">
                  {attendance.paymentMode || 'Not specified'}
                </p>
              </div>
              <div className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded p-2 min-w-0">
                <p className="text-xs text-[var(--text-secondary)] font-medium mb-1">Complaints</p>
                <p className="font-semibold text-[var(--text-primary)] text-xs break-words">
                  {attendance.complaints || 'No complaints recorded'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-2 text-xs">
              <div className="flex items-center gap-1 bg-[var(--icon-blue-bg)] px-1.5 py-0.5 rounded">
                <Pill className="w-3 h-3 text-[var(--icon-blue-text)]" />
                <span className="font-medium text-[var(--icon-blue-text)]">
                  {getArrayLength(attendance.medications)} Meds
                </span>
              </div>
              <div className="flex items-center gap-1 bg-[var(--icon-green-bg)] px-1.5 py-0.5 rounded">
                <FlaskConical className="w-3 h-3 text-[var(--icon-green-text)]" />
                <span className="font-medium text-[var(--icon-green-text)]">
                  {getArrayLength(attendance.labTests)} Tests
                </span>
              </div>
              {getArrayLength(attendance.procedures) > 0 && (
                <div className="flex items-center gap-1 bg-[var(--icon-purple-bg)] px-1.5 py-0.5 rounded">
                  <span className="font-medium text-[var(--icon-purple-text)]">
                    {getArrayLength(attendance.procedures)} Procedures
                  </span>
                </div>
              )}
            </div>

            {(totalBill > 0 || outstandingBalance > 0) && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--border-color)]">
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  {totalBill > 0 && (
                    <span className="inline-flex items-center gap-1 font-semibold text-[var(--text-primary)]">
                      <DollarSign className="w-3 h-3 text-[var(--icon-green-text)]" />
                      Total: {formatCurrency(totalBill)}
                    </span>
                  )}
                  {outstandingBalance > 0 && (
                    <span className="font-semibold text-[var(--icon-red-text)]">
                      Outstanding: {formatCurrency(outstandingBalance)}
                    </span>
                  )}
                </div>
                <Link
                  to={`/dashboard/attendance/${attendanceId}`}
                  className="text-[var(--icon-blue-text)] hover:underline text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--icon-blue-text)] rounded"
                >
                  View Details
                </Link>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
