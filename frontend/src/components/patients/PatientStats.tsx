// src/components/patients/PatientStats.tsx
import { Activity, CheckCircle, Clock, Pill, FlaskConical } from 'lucide-react';

interface PatientStatsProps {
  stats: {
    totalVisits: number;
    completedVisits: number;
    pendingVisits: number;
    totalMedications: number;
    totalLabTests: number;
  };
}

export const PatientStats: React.FC<PatientStatsProps> = ({ stats }) => {
  const statItems = [
    { label: 'Total Visits', value: stats.totalVisits, icon: Activity, color: 'blue' },
    { label: 'Completed', value: stats.completedVisits, icon: CheckCircle, color: 'green' },
    { label: 'Pending', value: stats.pendingVisits, icon: Clock, color: 'yellow' },
    { label: 'Medications', value: stats.totalMedications, icon: Pill, color: 'purple' },
    { label: 'Lab Tests', value: stats.totalLabTests, icon: FlaskConical, color: 'red' }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {statItems.map((stat, index) => {
        const Icon = stat.icon;
        const colorClasses = {
          blue: 'bg-blue-100 text-blue-600',
          green: 'bg-green-100 text-green-600',
          yellow: 'bg-yellow-100 text-yellow-600',
          purple: 'bg-purple-100 text-purple-600',
          red: 'bg-red-100 text-red-600'
        }[stat.color];

        return (
          <div key={index} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${colorClasses}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-gray-600 font-medium">{stat.label}</p>
                <p className="text-lg font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};