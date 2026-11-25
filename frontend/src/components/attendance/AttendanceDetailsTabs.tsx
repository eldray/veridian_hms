// src/components/attendance/AttendanceDetailsTabs.tsx
import { FileText, Pill, FlaskConical, Scissors, DollarSign } from 'lucide-react';

interface AttendanceDetailsTabsProps {
  activeTab: 'overview' | 'medications' | 'lab-tests' | 'procedures' | 'billing';
  onTabChange: (tab: 'overview' | 'medications' | 'lab-tests' | 'procedures' | 'billing') => void;
  currentAttendance: any;
}

export const AttendanceDetailsTabs: React.FC<AttendanceDetailsTabsProps> = ({
  activeTab,
  onTabChange,
  currentAttendance
}) => {
  const tabs = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'medications', label: 'Meds', icon: Pill, count: currentAttendance.medications?.length || 0 },
    { id: 'lab-tests', label: 'Labs', icon: FlaskConical, count: currentAttendance.labTests?.length || 0 },
    { id: 'procedures', label: 'Procedures', icon: Scissors, count: currentAttendance.procedures?.length || 0 },
    { id: 'billing', label: 'Billing', icon: DollarSign },
  ];

  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-1.5 shadow-sm">
      <nav aria-label="Attendance sections" className="flex flex-wrap gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const selected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              aria-current={selected ? 'page' : undefined}
              onClick={() => onTabChange(tab.id as any)}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--icon-cyan-text)] ${
                selected
                  ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-main)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`rounded-md px-1.5 py-0.5 text-xs font-semibold ${
                  selected ? 'bg-[var(--bg-card)] text-[var(--text-primary)]' : 'bg-[var(--bg-main)] text-[var(--text-secondary)]'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
