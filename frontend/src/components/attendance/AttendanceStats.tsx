// src/components/attendance/AttendanceStats.tsx
interface AttendanceStatsProps {
  filteredAttendances: any[];
  searchQuery: string;
  paginatedAttendances: any[];
}

export const AttendanceStats: React.FC<AttendanceStatsProps> = ({
  filteredAttendances,
  searchQuery,
  paginatedAttendances
}) => {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-3 border border-blue-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-800">
            Showing {paginatedAttendances.length} of {filteredAttendances.length}
          </p>
          {searchQuery && (
            <p className="text-xs text-blue-600 mt-0.5">
              Search: "{searchQuery}"
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-blue-700">
          <span className="bg-blue-100 px-1.5 py-0.5 rounded">
            Active: {filteredAttendances.filter(a => a.status === 'active').length}
          </span>
          <span className="bg-green-100 px-1.5 py-0.5 rounded">
            Completed: {filteredAttendances.filter(a => a.status === 'completed').length}
          </span>
          <span className="bg-yellow-100 px-1.5 py-0.5 rounded">
            Pending: {filteredAttendances.filter(a => a.status === 'pending').length}
          </span>
        </div>
      </div>
    </div>
  );
};