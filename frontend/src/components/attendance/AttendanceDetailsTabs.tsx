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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1.5">
      <nav className="flex flex-wrap gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id as any)}
              className={`flex items-center gap-2 py-2 px-3 rounded-lg font-medium transition-all duration-200 text-sm ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-600 to-teal-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                  activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
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