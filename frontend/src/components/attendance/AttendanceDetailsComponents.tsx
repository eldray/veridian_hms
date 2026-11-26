// src/components/attendance/AttendanceControls.tsx
import { Search, Grid, List } from 'lucide-react';

interface AttendanceControlsProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  setCurrentPage: (page: number) => void;
  viewMode: 'cards' | 'list';
  setViewMode: (mode: 'cards' | 'list') => void;
  itemsPerPage: number;
  setItemsPerPage: (count: number) => void;
}

export const AttendanceControls: React.FC<AttendanceControlsProps> = ({
  searchQuery,
  setSearchQuery,
  setCurrentPage,
  viewMode,
  setViewMode,
  itemsPerPage,
  setItemsPerPage
}) => {
  return (
    <div className="bg-[var(--bg-card)] rounded-lg p-3 shadow-sm border border-[var(--border-color)]">
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex-1 w-full sm:max-w-sm">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search attendances..."
              className="w-full pl-9 pr-4 py-2 text-[var(--text-primary)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] transition-all bg-[var(--bg-card)] text-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-[var(--bg-main)] rounded-md p-0.5">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded transition-all duration-200 ${
                viewMode === 'cards'
                  ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded transition-all duration-200 ${
                viewMode === 'list'
                  ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2 py-1.5 border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] transition-all bg-[var(--bg-card)] text-xs"
          >
            <option value={6}>6/page</option>
            <option value={12}>12/page</option>
            <option value={24}>24/page</option>
          </select>
        </div>
      </div>
    </div>
  );
};