// components/worklist/WorklistViewControls.tsx
import React from 'react';
import { CalendarDays, CheckCircle, Clock3, ListChecks } from 'lucide-react';
import { useWorklistStore, supportsWorklistViews, supportsDateRange } from '../../store/worklistStore';
import type { DepartmentType, WorklistView } from '../../types/worklist';

interface WorklistViewControlsProps {
  department: DepartmentType;
}

/**
 * Shared task lifecycle controls. Pending, In Progress and Completed are the only status views;
 * closed-visit investigation follow-up is a separate workflow and is not a substitute for progress.
 */
export const WorklistViewControls: React.FC<WorklistViewControlsProps> = ({ department }) => {
  const { view, buckets, setView, dateFrom, dateTo, setDateRange } = useWorklistStore();

  if (!supportsWorklistViews(department)) return null;

  // Each tab is a task-level queue. Counts are shown only when the selected query provides a reliable count.
  const tabs: Array<{ key: WorklistView; label: string; count: number | null; icon: React.ReactNode; hint: string }> = [
    {
      key: 'pending',
      label: 'Pending',
      count: view === 'pending' ? buckets.today + buckets.inpatients + buckets.overdue : null,
      icon: <ListChecks className="w-3.5 h-3.5" />,
      hint: 'Work not yet started',
    },
    {
      key: 'in_progress',
      label: 'In Progress',
      count: null,
      icon: <Clock3 className="w-3.5 h-3.5" />,
      hint: 'Work currently being handled',
    },
    {
      key: 'completed',
      label: 'Completed',
      count: view === 'completed' ? buckets.closed : null,
      icon: <CheckCircle className="w-3.5 h-3.5" />,
      hint: 'Completed work history',
    },
  ];

  const active = tabs.find((tab) => tab.key === view);
  const withDates = supportsDateRange(department);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setView(tab.key)}
            title={tab.hint}
            className={`px-3 py-1.5 text-sm rounded-md flex items-center gap-1.5 transition-colors ${
              view === tab.key
                ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] font-medium'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-main)]'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== null && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-[var(--bg-main)] text-[var(--text-secondary)]">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {withDates && (
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <CalendarDays className="w-3.5 h-3.5" />
          <span className="font-medium whitespace-nowrap">{['vitals', 'maternal'].includes(department) ? (view === 'completed' ? 'Completed date' : view === 'in_progress' ? 'Started date' : 'Visit date') : ['lab', 'pharmacy', 'scans', 'theatre'].includes(department) ? (view === 'completed' ? 'Completed date' : view === 'in_progress' ? 'Started date' : 'Request date') : 'Visit date'}</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateRange({ dateFrom: e.target.value, dateTo })}
            className="px-2 py-1.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]"
            aria-label={['vitals', 'maternal'].includes(department) ? (view === 'completed' ? 'Completed date from' : view === 'in_progress' ? 'Started date from' : 'Visit date from') : ['lab', 'pharmacy', 'scans', 'theatre'].includes(department) ? (view === 'completed' ? 'Completed date from' : view === 'in_progress' ? 'Started date from' : 'Request date from') : 'Visit date from'}
          />
          <span>to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateRange({ dateFrom, dateTo: e.target.value })}
            className="px-2 py-1.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]"
            aria-label={['vitals', 'maternal'].includes(department) ? (view === 'completed' ? 'Completed date to' : view === 'in_progress' ? 'Started date to' : 'Visit date to') : ['lab', 'pharmacy', 'scans', 'theatre'].includes(department) ? (view === 'completed' ? 'Completed date to' : view === 'in_progress' ? 'Started date to' : 'Request date to') : 'Visit date to'}
          />
          {(dateFrom || dateTo) && (
            <button
              onClick={() => setDateRange({ dateFrom: '', dateTo: '' })}
              className="px-2 py-1.5 rounded-lg hover:bg-[var(--bg-card)] text-[var(--icon-cyan-text)]"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {withDates && active && active.key === 'pending' && !dateFrom && !dateTo && (
        <span className="text-xs text-[var(--text-secondary)]">{active.hint}</span>
      )}
    </div>
  );
};
