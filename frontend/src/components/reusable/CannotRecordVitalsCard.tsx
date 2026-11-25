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
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
    <div className="text-center py-4">
      <Clock className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {isAttendancePending ? 'Attendance Not Active' : 'Attendance Completed'}
      </h3>
      <p className="text-gray-600 text-sm mb-3">
        {isAttendancePending
          ? 'This attendance is in planning phase. Activate it to start recording vitals.'
          : 'This attendance has been completed. No further vitals can be recorded.'}
      </p>
      {isAttendancePending && (
        <button
          onClick={onActivate}
          disabled={activating}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all disabled:opacity-50 text-sm"
        >
          {activating ? 'Activating...' : 'Activate Attendance'}
        </button>
      )}
    </div>
  </div>
);