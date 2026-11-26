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
    <div className="bg-[var(--bg-card)] rounded-lg shadow-sm border border-[var(--border-color)] p-1.5">
      <nav className="flex flex-wrap gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id as any)}
              className={`flex items-center gap-2 py-2 px-3 rounded-lg font-medium transition-all duration-200 text-sm ${
                activeTab === tab.id
                  ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                  activeTab === tab.id ? 'bg-[var(--bg-card)] text-[var(--icon-cyan-text)]' : 'bg-[var(--bg-main)] text-[var(--text-secondary)]'
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