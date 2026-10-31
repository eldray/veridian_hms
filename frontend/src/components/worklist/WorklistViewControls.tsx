// components/worklist/WorklistViewControls.tsx
import React from 'react';
import { AlertTriangle, CalendarDays, CheckCircle, ListChecks } from 'lucide-react';
import { useWorklistStore, supportsWorklistViews, supportsDateRange } from '../../store/worklistStore';
import type { DepartmentType, WorklistView } from '../../types/worklist';

interface WorklistViewControlsProps {
  department: DepartmentType;
}

/**
 * The three queues a visit-based worklist answers. A completed visit is no longer work, so it only
 * appears once its own tab is opened; the warning tab exists because a visit can be closed while a
 * lab, scan or procedure requested on it is still unanswered, and that request otherwise vanishes.
 */
export const WorklistViewControls: React.FC<WorklistViewControlsProps> = ({ department }) => {
  const { view, buckets, setView, dateFrom, dateTo, setDateRange } = useWorklistStore();

  if (!supportsWorklistViews(department)) return null;

  // Each tab is its own query, so a count is only known for the queue actually loaded; the other
  // two would have to be fetched on every page load to be honest about their size.
  const tabs: Array<{ key: WorklistView; label: string; count: number | null; icon: React.ReactNode; hint: string }> = [
    {
      key: 'pending',
      label: 'To do',
      count: view === 'pending' ? buckets.today + buckets.inpatients + buckets.overdue : null,
      icon: <ListChecks className="w-3.5 h-3.5" />,
      hint: `${buckets.today} today · ${buckets.inpatients} admitted · ${buckets.overdue} overdue`,
    },
    {
      key: 'completed',
      label: 'Completed',
      count: view === 'completed' ? buckets.closed : null,
      icon: <CheckCircle className="w-3.5 h-3.5" />,
      hint: 'Visits closed today',
    },
    {
      key: 'outstanding',
      label: 'Awaiting results',
      // The warning queue is a separate query, so its size is only known once it is open.
      count: view === 'outstanding' ? buckets.closed : null,
      icon: <AlertTriangle className="w-3.5 h-3.5 text-[var(--icon-yellow-text)]" />,
      hint: 'Closed visits still owing a lab, scan or procedure result',
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
          <span className="font-medium whitespace-nowrap">Visit date</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateRange({ dateFrom: e.target.value, dateTo })}
            className="px-2 py-1.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]"
            aria-label="Attendance date from"
          />
          <span>to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateRange({ dateFrom, dateTo: e.target.value })}
            className="px-2 py-1.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]"
            aria-label="Attendance date to"
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
