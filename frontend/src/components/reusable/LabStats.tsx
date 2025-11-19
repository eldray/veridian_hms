// src/components/reusable/LabStats.tsx - UPDATED
import React from 'react';
import { Clock, FlaskConical, CheckCircle } from 'lucide-react';

interface LabStatsProps {
  totalPending: number;
  inProgressCount: number;
  completedCount: number;
}

export const LabStats: React.FC<LabStatsProps> = ({
  totalPending,
  inProgressCount,
  completedCount
}) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <StatCard
      icon={Clock}
      iconColor="text-[var(--icon-yellow-text)]"
      bgColor="bg-[var(--icon-yellow-bg)]"
      label="Pending Tests"
      value={totalPending}
    />
    <StatCard
      icon={FlaskConical}
      iconColor="text-[var(--icon-blue-text)]"
      bgColor="bg-[var(--icon-blue-bg)]"
      label="In Progress"
      value={inProgressCount}
    />
    <StatCard
      icon={CheckCircle}
      iconColor="text-[var(--icon-green-text)]"
      bgColor="bg-[var(--icon-green-bg)]"
      label="Completed"
      value={completedCount}
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