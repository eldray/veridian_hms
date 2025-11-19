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
    <div className="bg-gradient-to-r from-slate-800 to-blue-900 rounded-xl p-4 text-white shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Hospital className="w-5 h-5 text-blue-600" />
            Attendance Management
          </h1>
          <p className="text-white text-sm mt-1">Manage patient visits and clinical records</p>
          <p className="text-blue-200 text-xs mt-0.5">
            {filteredAttendances.length} attendance(s) • {patients.length} patient(s)
          </p>
        </div>
        
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
    </div>
  );
};