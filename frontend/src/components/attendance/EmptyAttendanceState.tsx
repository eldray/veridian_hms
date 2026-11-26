// src/components/attendance/EmptyAttendanceState.tsx
import { FileText } from 'lucide-react';

interface EmptyAttendanceStateProps {
  searchQuery: string;
  onClearSearch: () => void;
}

export const EmptyAttendanceState: React.FC<EmptyAttendanceStateProps> = ({
  searchQuery,
  onClearSearch
}) => {
  return (
    <div className="bg-[var(--bg-card)] rounded-lg p-6 shadow-sm border border-[var(--border-color)] text-center">
      <FileText className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
      <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">
        {searchQuery ? 'No Attendances Found' : 'No Attendances'}
      </h3>
      <p className="text-[var(--text-secondary)] mb-4 text-sm">
        {searchQuery 
          ? 'Try adjusting your search terms.'
          : 'No attendance records created yet.'
        }
      </p>
      {searchQuery && (
        <button
          onClick={onClearSearch}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:opacity-90 transition-all duration-200 font-semibold text-sm"
        >
          Clear Search
        </button>
      )}
    </div>
  );
};