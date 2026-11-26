import React from 'react';
import type { Attendance } from '../../types';
import { Activity, Clock, PlayCircle, Edit } from 'lucide-react';

interface AttendanceStatusCardProps {
  attendance: Attendance;
  canRecordVitals: boolean;
  isAttendancePending: boolean;
  onActivate: () => void;
  onEdit: () => void;
  activating: boolean;
}

export const AttendanceStatusCard: React.FC<AttendanceStatusCardProps> = ({
  attendance,
  canRecordVitals,
  isAttendancePending,
  onActivate,
  onEdit,
  activating
}) => {
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)] border-[var(--border-color)]';
      case 'active': return 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] border-[var(--border-color)]';
      case 'completed': return 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] border-[var(--border-color)]';
      case 'cancelled': return 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] border-[var(--border-color)]';
      default: return 'bg-[var(--bg-main)] text-[var(--text-secondary)] border-[var(--border-color)]';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return <Clock className="w-3 h-3" />;
      case 'active': return <Activity className="w-3 h-3" />;
      case 'completed': return <Activity className="w-3 h-3" />;
      case 'cancelled': return <Clock className="w-3 h-3" />;
      default: return <Clock className="w-3 h-3" />;
    }
  };

  return (
    <div className="bg-[var(--bg-card)] rounded-xl shadow-sm border border-[var(--border-color)] p-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Attendance Status</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Current status: 
            <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(attendance.status)} flex items-center gap-1 w-fit mt-1`}>
              {getStatusIcon(attendance.status)}
              {attendance.status?.charAt(0).toUpperCase() + attendance.status?.slice(1)}
            </span>
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {isAttendancePending && (
            <button
              onClick={onActivate}
              disabled={activating}
              className="flex items-center gap-1 px-3 py-1.5 bg-[var(--icon-green-text)] text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50 text-sm"
            >
              <PlayCircle className="w-3 h-3" />
              {activating ? 'Activating...' : 'Activate'}
            </button>
          )}
          
          <button
            onClick={onEdit}
            className="p-1.5 bg-[var(--icon-yellow-text)] text-[var(--icon-yellow-on-text)] rounded hover:opacity-90 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--icon-cyan-text)]"
            title="Edit Attendance"
          >
            <Edit className="w-3 h-3" />
          </button>
          
          <div
            className={`px-2 py-1 text-xs font-semibold rounded-full border ${
              canRecordVitals
                ? 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] border-[var(--border-color)]'
                : 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)] border-[var(--border-color)]'
            }`}
          >
            {canRecordVitals ? (
              <div className="flex items-center gap-1">
                <Activity className="w-3 h-3" />
                Ready
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {isAttendancePending ? 'Not Active' : 'Completed'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};