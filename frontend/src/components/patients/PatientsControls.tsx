// src/components/patients/PatientsControls.tsx
import { Search, Grid, List } from 'lucide-react';

interface PatientsControlsProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  setCurrentPage: (page: number) => void;
  viewMode: 'cards' | 'list';
  setViewMode: (mode: 'cards' | 'list') => void;
  itemsPerPage: number;
  setItemsPerPage: (count: number) => void;
}

export const PatientsControls: React.FC<PatientsControlsProps> = ({
  searchQuery,
  setSearchQuery,
  setCurrentPage,
  viewMode,
  setViewMode,
  itemsPerPage,
  setItemsPerPage
}) => {
  return (
    <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-3 shadow-sm">
      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        {/* Search */}
        <div className="w-full flex-1 sm:max-w-sm">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]"
            />
            <input
              type="search"
              aria-label="Search patients"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search patients..."
              className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] py-2 pl-9 pr-3 text-sm text-[var(--text-primary)] transition-colors placeholder:text-[var(--text-tertiary)] focus:border-[var(--primary-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/30"
            />
          </div>
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-2">
          <div
            role="group"
            aria-label="Patient display mode"
            className="flex rounded-md border border-[var(--border-color)] bg-[var(--bg-main)] p-0.5"
          >
            <button
              type="button"
              aria-label="Show patients as cards"
              aria-pressed={viewMode === 'cards'}
              onClick={() => setViewMode('cards')}
              className={`rounded p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-color)] focus-visible:ring-offset-1 ${
                viewMode === 'cards'
                  ? 'bg-[var(--bg-card)] text-[var(--primary-color)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Grid aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label="Show patients as a list"
              aria-pressed={viewMode === 'list'}
              onClick={() => setViewMode('list')}
              className={`rounded p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-color)] focus-visible:ring-offset-1 ${
                viewMode === 'list'
                  ? 'bg-[var(--bg-card)] text-[var(--primary-color)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]'
              }`}
            >
              <List aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Items Per Page */}
          <label className="sr-only" htmlFor="patients-items-per-page">
            Patients per page
          </label>
          <select
            id="patients-items-per-page"
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-2 py-1.5 text-xs text-[var(--text-primary)] transition-colors focus:border-[var(--primary-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/30"
          >
            <option value={6}>6/page</option>
            <option value={9}>9/page</option>
            <option value={12}>12/page</option>
            <option value={24}>24/page</option>
          </select>
        </div>
      </div>
    </div>
  );
};