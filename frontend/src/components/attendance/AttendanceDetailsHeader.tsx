// src/components/attendance/AttendanceDetailsHeader.tsx
import { ArrowLeft, Edit } from 'lucide-react';

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
}) => (
  <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 shadow-sm">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Go back"
          className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--border-color)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-tight text-[var(--text-primary)]">
            {currentAttendance.attendanceNumber || `ATT-${currentAttendance._id?.slice(-8)}`}
          </h1>
          <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
            {patient?.fullName || `Patient ${currentAttendance.patientId?.toString().slice(-6) || 'Unknown'}`} · {new Date(currentAttendance.dateTime).toLocaleDateString()}
          </p>
        </div>
      </div>
      {canEdit && (
        <button type="button" className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--border-color)]">
          <Edit className="h-4 w-4" />
          Edit record
        </button>
      )}
    </div>
  </div>
);
