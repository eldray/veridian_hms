// src/components/attendance/AttendanceHeader.tsx
import { Hospital, RefreshCw } from 'lucide-react';

interface AttendanceHeaderProps {
  filteredAttendances: any[];
  patients: any[];
  onRefresh: () => void;
  refreshing: boolean;
}

export const AttendanceHeader: React.FC<AttendanceHeaderProps> = ({
  filteredAttendances,
  patients,
  onRefresh,
  refreshing
}) => {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-3 sm:p-4 text-[var(--text-primary)] shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Hospital className="w-5 h-5 text-[var(--icon-cyan-text)]" />
            Attendance Management
          </h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">Manage patient visits and clinical records</p>
          <p className="text-[var(--text-tertiary)] text-xs mt-0.5">
            {filteredAttendances.length} attendance(s) • {patients.length} patient(s)
          </p>
        </div>
        
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] hover:opacity-90 rounded-lg transition-opacity font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--icon-cyan-text)]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
    </div>
  );
};