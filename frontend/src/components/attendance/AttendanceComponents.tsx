// src/components/attendance/AttendanceCard.tsx
import { Link } from 'react-router-dom';
import { PatientAvatar } from '../patients/PatientAvatar';
import { getPatientName, getPatientFolderNumber, getAttendanceNumber } from '../../utils/patient';
import { Eye, Edit, Pill, FlaskConical, Scissors, DollarSign, Calendar, Stethoscope } from 'lucide-react';

interface AttendanceCardProps {
  attendance: any;
  patient: any;
  attendanceId: string;
  totalBill: number;
  statusColor: string;
  attendanceTypeLabel: string;
  paymentModeLabel: string;
  paymentModeIcon: React.ReactNode;
  formattedDate: string;
  onEditAttendance: (attendance: any) => void;
}

export const AttendanceCard: React.FC<AttendanceCardProps> = ({
  attendance,
  patient,
  attendanceId,
  totalBill,
  statusColor,
  attendanceTypeLabel,
  paymentModeLabel,
  paymentModeIcon,
  formattedDate,
  onEditAttendance
}) => {
  const identitySource = { ...attendance, patient: patient || attendance.patient };

  return (
    <div className="bg-[var(--bg-card)] rounded-lg p-3 shadow-sm border border-[var(--border-color)] hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <PatientAvatar patient={identitySource} size="md" />
          <div>
            <h3 className="font-semibold text-[var(--text-primary)] text-sm leading-tight">
              {getPatientName(identitySource)}
            </h3>
            <p className="text-xs text-[var(--text-secondary)] bg-[var(--bg-main)] px-1.5 py-0.5 rounded border mt-0.5">
              {getPatientFolderNumber(attendance) || getPatientFolderNumber(identitySource) || 'No Folder'} • {getAttendanceNumber(attendance) || `ATT-${attendanceId?.slice(-8)}`}
            </p>
          </div>
        </div>
        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusColor}`}>
          {(attendance.status || 'active').charAt(0).toUpperCase() + (attendance.status || 'active').slice(1)}
        </span>
      </div>

      <div className="space-y-1.5 text-xs mb-3">
        <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
          <Calendar className="w-3.5 h-3.5" />
          <span className="font-medium">{formattedDate}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Stethoscope className="w-3.5 h-3.5 text-[var(--icon-cyan-text)]" />
          <span className="font-medium text-[var(--icon-cyan-text)]">{attendanceTypeLabel}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {paymentModeIcon}
          <span className="font-medium text-[var(--text-secondary)]">{paymentModeLabel}</span>
        </div>
        {attendance.complaints && attendance.complaints !== 'No complaints recorded' && (
          <p className="text-[var(--text-secondary)] text-xs truncate">
            <span className="font-semibold">Complaints:</span> {attendance.complaints}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 mb-3 text-xs text-[var(--text-secondary)]">
        <span className="flex items-center gap-0.5">
          <Pill className="w-3 h-3" />
          {attendance.medications?.length || 0}
        </span>
        <span className="flex items-center gap-0.5">
          <FlaskConical className="w-3 h-3" />
          {attendance.labTests?.length || 0}
        </span>
        <span className="flex items-center gap-0.5">
          <Scissors className="w-3 h-3" />
          {attendance.procedures?.length || 0}
        </span>
        {totalBill > 0 && (
          <span className="flex items-center gap-0.5 ml-auto font-medium">
            <DollarSign className="w-3 h-3" />
            ${totalBill.toFixed(2)}
          </span>
        )}
      </div>

      <div className="flex gap-1.5 pt-2 border-t border-[var(--border-color)]">
        <Link
          to={`/dashboard/attendance/${attendanceId}`}
          className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] border border-[var(--border-color)] rounded-md hover:opacity-90 transition-all duration-200 font-medium text-xs"
        >
          <Eye className="w-3 h-3" />
          View
        </Link>
        <button
          onClick={() => onEditAttendance(attendance)}
          className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 bg-[var(--icon-orange-bg)] text-[var(--icon-orange-text)] border border-[var(--border-color)] rounded-md hover:opacity-90 transition-all duration-200 font-medium text-xs"
        >
          <Edit className="w-3 h-3" />
          Edit
        </button>
      </div>
    </div>
  );
};
