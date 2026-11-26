// src/components/patients/PatientsPagination.tsx
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PatientsPaginationProps {
  currentPage: number;
  totalPages: number;
  startIndex: number;
  itemsPerPage: number;
  displayedPatients: any[];
  onPageChange: (page: number) => void;
}

export const PatientsPagination: React.FC<PatientsPaginationProps> = ({
  currentPage,
  totalPages,
  startIndex,
  itemsPerPage,
  displayedPatients,
  onPageChange
}) => {
  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3 shadow-sm sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--text-secondary)]" aria-live="polite">
          Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, displayedPatients.length)} of{' '}
          {displayedPatients.length} patients
        </p>
        <nav aria-label="Patient list pagination" className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            aria-label="Go to previous page"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="rounded-lg border border-[var(--border-color)] p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-main)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-color)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          </button>

          {/* Page Numbers */}
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
                type="button"
                aria-label={`Go to page ${pageNum}`}
                aria-current={currentPage === pageNum ? 'page' : undefined}
                onClick={() => onPageChange(pageNum)}
                className={`h-8 min-w-8 rounded-lg px-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-color)] ${
                  currentPage === pageNum
                    ? 'bg-[var(--primary-color)] text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-main)] hover:text-[var(--text-primary)]'
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            type="button"
            aria-label="Go to next page"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="rounded-lg border border-[var(--border-color)] p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-main)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-color)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </button>
        </nav>
      </div>
    </div>
  );
};