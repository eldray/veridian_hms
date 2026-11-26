// src/components/attendance/AttendancePagination.tsx
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface AttendancePaginationProps {
  currentPage: number;
  totalPages: number;
  startIndex: number;
  itemsPerPage: number;
  filteredAttendances: any[];
  onPageChange: (page: number) => void;
}

export const AttendancePagination: React.FC<AttendancePaginationProps> = ({
  currentPage,
  totalPages,
  startIndex,
  itemsPerPage,
  filteredAttendances,
  onPageChange
}) => {
  return (
    <div className="bg-[var(--bg-card)] rounded-lg p-3 shadow-sm border border-[var(--border-color)]">
      <div className="flex items-center justify-between">
        <div className="text-xs text-[var(--text-secondary)]">
          Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredAttendances.length)} of{' '}
          {filteredAttendances.length}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-1.5 border border-[var(--border-color)] rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-main)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--icon-cyan-text)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }

            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`w-7 h-7 rounded-md text-xs font-medium transition-colors ${
                  currentPage === pageNum
                    ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] shadow-sm'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-main)] hover:text-[var(--text-primary)]'
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-1.5 border border-[var(--border-color)] rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-main)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--icon-cyan-text)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};