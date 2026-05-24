// src/components/nursing/NursingDashboardStats.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, Pill, AlertTriangle, ArrowRight } from 'lucide-react';

interface NursingDashboardStatsProps {
  stats: {
    admittedCount: number;
    pendingDischarges: number;
    medicationsDueToday: number;
    criticalAlerts: number;
  };
}

export const NursingDashboardStats: React.FC<NursingDashboardStatsProps> = ({ stats }) => {
  const navigate = useNavigate();
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.admittedCount}</div>
            <div className="text-xs text-[var(--text-secondary)] mt-1">Admitted Patients</div>
          </div>
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
        </div>
      </div>
      
      <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.pendingDischarges}</div>
            <div className="text-xs text-[var(--text-secondary)] mt-1">Due for Discharge Today</div>
          </div>
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <Calendar className="w-5 h-5 text-green-600" />
          </div>
        </div>
        <button 
          onClick={() => navigate('/dashboard/admissions')}
          className="mt-3 text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          View Admissions <ArrowRight className="w-3 h-3" />
        </button>
      </div>
      
      <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.medicationsDueToday}</div>
            <div className="text-xs text-[var(--text-secondary)] mt-1">Medications Due Today</div>
          </div>
          <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
            <Pill className="w-5 h-5 text-yellow-600" />
          </div>
        </div>
      </div>
      
      <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-red-600">{stats.criticalAlerts}</div>
            <div className="text-xs text-[var(--text-secondary)] mt-1">Critical Alerts</div>
          </div>
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
        </div>
      </div>
    </div>
  );
};