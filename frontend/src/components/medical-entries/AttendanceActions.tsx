import React from 'react';
import { Attendance } from '../types';

interface AttendanceActionsProps {
  attendance: Attendance;
  onActivate: () => void;
  onComplete: () => void;
  onCancel: () => void;
  isActivating: boolean;
  isCompleting: boolean;
}

export const AttendanceActions: React.FC<AttendanceActionsProps> = ({
  attendance,
  onActivate,
  onComplete,
  onCancel,
  isActivating,
  isCompleting,
}) => {
  const isPending = attendance.status === 'pending';
  const isActive = attendance.status === 'active';
  const isCompleted = attendance.status === 'completed';

  return (
    <div className="flex items-center gap-2 mt-3">
      {isPending && (
        <button
          onClick={onActivate}
          disabled={isActivating}
          className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
        >
          {isActivating ? 'Activating...' : 'Activate'}
        </button>
      )}
      
      {(isPending || isActive) && (
        <button
          onClick={onComplete}
          disabled={isCompleting}
          className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
        >
          {isCompleting ? 'Completing...' : 'Complete'}
        </button>
      )}
      
      {!isCompleted && (
        <button
          onClick={onCancel}
          className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
        >
          Cancel
        </button>
      )}
    </div>
  );
};