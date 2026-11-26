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
    { label: 'Total Visits', value: stats.totalVisits, icon: Activity },
    { label: 'Completed', value: stats.completedVisits, icon: CheckCircle },
    { label: 'Pending', value: stats.pendingVisits, icon: Clock },
    { label: 'Medications', value: stats.totalMedications, icon: Pill },
    { label: 'Lab Tests', value: stats.totalLabTests, icon: FlaskConical }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {statItems.map((stat) => {
        const Icon = stat.icon;

        return (
          <div
            key={stat.label}
            className="min-w-0 rounded-lg border p-3 sm:p-4 shadow-sm"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-color)'
            }}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div
                className="shrink-0 rounded-lg p-2"
                style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-secondary)' }}
                aria-hidden="true"
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {stat.label}
                </p>
                <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                  {stat.value}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};