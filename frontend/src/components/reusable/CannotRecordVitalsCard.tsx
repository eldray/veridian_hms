import React from 'react';
import { Clock } from 'lucide-react';

interface CannotRecordVitalsCardProps {
  isAttendancePending: boolean;
  onActivate: () => void;
  activating: boolean;
}

export const CannotRecordVitalsCard: React.FC<CannotRecordVitalsCardProps> = ({
  isAttendancePending,
  onActivate,
  activating
}) => (
  <div className="bg-[var(--bg-card)] rounded-xl shadow-sm border border-[var(--border-color)] p-4">
    <div className="text-center py-4">
      <Clock className="w-12 h-12 text-[var(--icon-yellow-text)] mx-auto mb-3" />
      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
        {isAttendancePending ? 'Attendance Not Active' : 'Attendance Completed'}
      </h3>
      <p className="text-[var(--text-secondary)] text-sm mb-3">
        {isAttendancePending
          ? 'This attendance is in planning phase. Activate it to start recording vitals.'
          : 'This attendance has been completed. No further vitals can be recorded.'}
      </p>
      {isAttendancePending && (
        <button
          onClick={onActivate}
          disabled={activating}
          className="px-4 py-2 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] rounded-lg hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--icon-green-text)] transition-all disabled:opacity-50 text-sm"
        >
          {activating ? 'Activating...' : 'Activate Attendance'}
        </button>
      )}
    </div>
  </div>
);