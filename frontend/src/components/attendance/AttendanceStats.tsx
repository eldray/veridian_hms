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
    <div className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border-color)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Showing {paginatedAttendances.length} of {filteredAttendances.length}
          </p>
          {searchQuery && (
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Search: "{searchQuery}"
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <span className="bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] px-1.5 py-0.5 rounded">
            Active: {filteredAttendances.filter(a => a.status === 'active').length}
          </span>
          <span className="bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] px-1.5 py-0.5 rounded">
            Completed: {filteredAttendances.filter(a => a.status === 'completed').length}
          </span>
          <span className="bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)] px-1.5 py-0.5 rounded">
            Pending: {filteredAttendances.filter(a => a.status === 'pending').length}
          </span>
        </div>
      </div>
    </div>
  );
};