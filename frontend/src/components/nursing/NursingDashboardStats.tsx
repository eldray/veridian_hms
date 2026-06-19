// src/components/nursing/NursingDashboardStats.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Hospital, Sun, Moon, ArrowRight, Pill,
  AlertTriangle, ClipboardCheck, Bed
} from 'lucide-react';

interface NursingDashboardStatsProps {
  stats: {
    admittedCount: number;
    ipdCount: number;
    detentionCount: number;
    daySurgeryCount: number;
    pendingDischarges: number;
    medicationsDueToday: number;
    criticalAlerts: number;
  };
}

export const NursingDashboardStats: React.FC<NursingDashboardStatsProps> = ({ stats }) => {
  const navigate = useNavigate();

  const cards = [
    {
      label: 'Total Admitted',
      value: stats.admittedCount,
      sub: `${stats.ipdCount} IPD · ${stats.detentionCount} Obs · ${stats.daySurgeryCount} Day Surgery`,
      icon: <Users className="w-5 h-5 text-[var(--icon-cyan-text)]" />,
      bg: 'bg-[var(--icon-cyan-bg)]',
      onClick: undefined,
    },
    {
      label: 'Formal IPD',
      value: stats.ipdCount,
      sub: 'Full admissions',
      icon: <Hospital className="w-5 h-5 text-[var(--icon-blue-text)]" />,
      bg: 'bg-[var(--icon-blue-bg)]',
      onClick: () => navigate('/dashboard/admissions'),
    },
    {
      label: 'Under Observation',
      value: stats.detentionCount,
      sub: 'Detention / ANC obs',
      icon: <Moon className="w-5 h-5 text-orange-600" />,
      bg: 'bg-orange-100',
      onClick: undefined,
    },
    {
      label: 'Day Surgery',
      value: stats.daySurgeryCount,
      sub: 'Day-case patients',
      icon: <Sun className="w-5 h-5 text-[var(--icon-yellow-text)]" />,
      bg: 'bg-[var(--icon-yellow-bg)]',
      onClick: undefined,
    },
    {
      label: 'Meds Due Now',
      value: stats.medicationsDueToday,
      sub: 'Across all patients',
      icon: <Pill className="w-5 h-5 text-[var(--icon-purple-text)]" />,
      bg: 'bg-[var(--icon-purple-bg)]',
      onClick: undefined,
    },
    {
      label: 'Pending Discharge',
      value: stats.pendingDischarges,
      sub: 'Awaiting clearance',
      icon: <ClipboardCheck className="w-5 h-5 text-[var(--icon-green-text)]" />,
      bg: 'bg-[var(--icon-green-bg)]',
      onClick: () => navigate('/dashboard/admissions'),
    },
    {
      label: 'Critical Alerts',
      value: stats.criticalAlerts,
      sub: 'Abnormal vitals',
      icon: <AlertTriangle className="w-5 h-5 text-[var(--icon-red-text)]" />,
      bg: 'bg-[var(--icon-red-bg)]',
      onClick: undefined,
      highlight: stats.criticalAlerts > 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          onClick={card.onClick}
          className={`bg-[var(--bg-card)] rounded-xl p-3 border transition-all ${
            card.highlight
              ? 'border-[var(--icon-red-text)] shadow-md'
              : 'border-[var(--border-color)]'
          } ${card.onClick ? 'cursor-pointer hover:shadow-md hover:border-[var(--icon-cyan-text)]' : ''}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className={`w-8 h-8 ${card.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
              {card.icon}
            </div>
            {card.onClick && (
              <ArrowRight className="w-3.5 h-3.5 text-[var(--text-tertiary)] mt-1 flex-shrink-0" />
            )}
          </div>
          <div className="mt-2">
            <p className={`text-2xl font-bold leading-none ${
              card.highlight ? 'text-[var(--icon-red-text)]' : 'text-[var(--text-primary)]'
            }`}>
              {card.value}
            </p>
            <p className="text-[10px] font-medium text-[var(--text-secondary)] mt-1 leading-tight">
              {card.label}
            </p>
            <p className="text-[9px] text-[var(--text-tertiary)] mt-0.5 leading-tight">
              {card.sub}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};