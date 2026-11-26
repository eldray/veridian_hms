import React from 'react';
import { Package, CheckCircle, Activity, Printer } from 'lucide-react';

interface DispenseStatsProps {
  totalPending: number;
  totalDispensed: number;
  dispensedToday: number;
  readyToPrint: number;
}

export const DispenseStats: React.FC<DispenseStatsProps> = ({
  totalPending,
  totalDispensed,
  dispensedToday,
  readyToPrint
}) => (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
    <StatCard
      icon={Package}
      iconColor="text-[var(--icon-yellow-text)]"
      bgColor="bg-[var(--icon-yellow-bg)]"
      label="Pending Dispensing"
      value={totalPending}
    />
    <StatCard
      icon={CheckCircle}
      iconColor="text-[var(--icon-green-text)]"
      bgColor="bg-[var(--icon-green-bg)]"
      label="Dispensed"
      value={totalDispensed}
    />
    <StatCard
      icon={Activity}
      iconColor="text-[var(--icon-cyan-text)]"
      bgColor="bg-[var(--icon-cyan-bg)]"
      label="Dispensed Today"
      value={dispensedToday}
    />
    <StatCard
      icon={Printer}
      iconColor="text-[var(--icon-purple-text)]"
      bgColor="bg-[var(--icon-purple-bg)]"
      label="Ready to Print"
      value={readyToPrint}
    />
  </div>
);

const StatCard: React.FC<{
  icon: React.ComponentType<any>;
  iconColor: string;
  bgColor: string;
  label: string;
  value: number;
}> = ({ icon: Icon, iconColor, bgColor, label, value }) => (
  <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)] hover:shadow-md transition-all duration-300">
    <div className="flex items-center gap-2 mb-2">
      <div className={`w-10 h-10 ${bgColor} rounded-lg flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <span className="text-[var(--text-secondary)] text-xs font-medium">{label}</span>
    </div>
    <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
  </div>
);