// src/components/attendance/AttendanceDetailsHeader.tsx
import { ArrowLeft, Edit } from 'lucide-react';
import { getPatientName, getAttendanceNumber } from '../../utils/patient';

interface AttendanceDetailsHeaderProps {
  currentAttendance: any;
  patient: any;
  canEdit: boolean;
  onBack: () => void;
}

export const AttendanceDetailsHeader: React.FC<AttendanceDetailsHeaderProps> = ({
  currentAttendance,
  patient,
  canEdit,
  onBack
}) => {
  const identitySource = { ...currentAttendance, patient: patient || currentAttendance.patient };

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-3 sm:p-4 text-[var(--text-primary)] shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--icon-cyan-text)]"
            title="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
              {getAttendanceNumber(currentAttendance) || `ATT-${currentAttendance._id?.slice(-8) || currentAttendance.id?.slice(-8)}`}
            </h1>
            <p className="text-[var(--text-secondary)] text-xs sm:text-sm mt-0.5">
              {getPatientName(identitySource)} • {new Date(currentAttendance.dateTime || currentAttendance.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <button className="flex items-center gap-1.5 px-3 py-2 bg-[var(--bg-subtle)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors border border-[var(--border-color)] font-semibold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--icon-cyan-text)]">
              <Edit className="w-4 h-4" />
              <span>Edit Record</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
