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
      iconColor="text-yellow-600"
      bgColor="bg-yellow-100"
      label="Pending Dispensing"
      value={totalPending}
    />
    <StatCard
      icon={CheckCircle}
      iconColor="text-green-600"
      bgColor="bg-green-100"
      label="Dispensed"
      value={totalDispensed}
    />
    <StatCard
      icon={Activity}
      iconColor="text-blue-600"
      bgColor="bg-blue-100"
      label="Dispensed Today"
      value={dispensedToday}
    />
    <StatCard
      icon={Printer}
      iconColor="text-purple-600"
      bgColor="bg-purple-100"
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
  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300">
    <div className="flex items-center gap-2 mb-2">
      <div className={`w-10 h-10 ${bgColor} rounded-lg flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <span className="text-gray-600 text-xs font-medium">{label}</span>
    </div>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
  </div>
);