// src/components/patients/PatientTabs.tsx
import { User, History, ClipboardList, FileArchive } from 'lucide-react';

interface PatientTabsProps {
  activeTab: 'profile' | 'documents' | 'attendances' | 'medical-records';
  onTabChange: (tab: 'profile' | 'documents' | 'attendances' | 'medical-records') => void;
  patientAttendances: any[];
}

export const PatientTabs: React.FC<PatientTabsProps> = ({
  activeTab,
  onTabChange,
  patientAttendances
}) => {
  const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: User, count: null },
    { id: 'attendances' as const, label: 'Visits', icon: History, count: patientAttendances.length },
    { id: 'medical-records' as const, label: 'Medical', icon: ClipboardList, count: null },
    { id: 'documents' as const, label: 'Documents', icon: FileArchive, count: null },
  ];

  return (
    <div className="border-b border-[var(--border-color)]">
      <nav className="flex space-x-1 px-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-1.5 py-2 px-3 border-b-2 font-medium text-xs transition-all duration-200 ${
                activeTab === tab.id
                  ? 'border-[var(--icon-cyan-text)] text-[var(--icon-cyan-text)] font-semibold'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
              {tab.count !== null && tab.count > 0 && (
                <span className={`px-1 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === tab.id ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]' : 'bg-[var(--bg-main)] text-[var(--text-secondary)]'
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