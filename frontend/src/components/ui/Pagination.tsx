import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';
import { cn } from './cn';

interface PaginationProps {
  page: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
  onChange: (page: number) => void;
  /** What is being counted, used to word the summary line — e.g. "claim records". */
  noun?: string;
  className?: string;
  /** Optional page-size picker, for lists that let staff widen the page. */
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
}

/**
 * Windowed pager: always five page buttons at most, centred on the current one,
 * so a 3-page list and a 300-page list look and behave the same.
 */
export function Pagination({ page, totalPages, itemsPerPage, totalItems, onChange, noun = 'records', className, pageSizeOptions, onPageSizeChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const start = (page - 1) * itemsPerPage;
  const first = totalPages <= 5
    ? 1
    : page <= 3
      ? 1
      : page >= totalPages - 2
        ? totalPages - 4
        : page - 2;
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => first + i);

  return (
    <div className={cn('bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 flex items-center justify-between flex-wrap gap-4', className)}>
      <div className="flex items-center gap-3 flex-wrap">
        <p className="text-sm text-[var(--text-secondary)]">
          Showing {totalItems === 0 ? 0 : start + 1} to {Math.min(start + itemsPerPage, totalItems)} of {totalItems} {noun}
        </p>
        {pageSizeOptions?.length && onPageSizeChange ? (
          <select
            value={itemsPerPage}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            aria-label="Rows per page"
            className="px-2 py-1.5 text-xs rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-primary)]"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>{size} per page</option>
            ))}
          </select>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" iconOnly icon={ChevronLeft} aria-label="Previous page" disabled={page === 1} onClick={() => onChange(page - 1)} />
        {pages.map((candidate) => (
          <Button
            key={candidate}
            size="sm"
            variant={candidate === page ? 'primary' : 'ghost'}
            aria-current={candidate === page ? 'page' : undefined}
            className="w-8"
            onClick={() => onChange(candidate)}
          >
            {candidate}
          </Button>
        ))}
        <Button variant="secondary" size="sm" iconOnly icon={ChevronRight} aria-label="Next page" disabled={page === totalPages} onClick={() => onChange(page + 1)} />
      </div>
    </div>
  );
}

export default Pagination;
