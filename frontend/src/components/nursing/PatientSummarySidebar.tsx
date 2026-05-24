// src/components/nursing/PatientSummarySidebar.tsx
import React from 'react';
import { AlertTriangle, CheckCircle, Clock, Pill, Activity, Heart, Thermometer, Droplet, Baby, Shield } from 'lucide-react';

interface PatientSummarySidebarProps {
  patient: any;
  attendance: any;
  admission: any;
  latestVitals: any;
  vitalsHistory: any[];
  medications: any[];
  tasks: any[];
  isAntenatal: boolean;
}

export const PatientSummarySidebar: React.FC<PatientSummarySidebarProps> = ({
  patient,
  attendance,
  admission,
  latestVitals,
  vitalsHistory,
  medications,
  tasks,
  isAntenatal
}) => {
  // Check for abnormal vitals
  const getCriticalAlerts = () => {
    const alerts = [];
    if (latestVitals) {
      if (latestVitals.bloodPressure) {
        const [sys, dia] = latestVitals.bloodPressure.split('/').map(Number);
        if (sys > 180) alerts.push({ type: 'critical', message: `BP extremely high: ${latestVitals.bloodPressure} mmHg` });
        else if (sys > 140) alerts.push({ type: 'warning', message: `BP elevated: ${latestVitals.bloodPressure} mmHg` });
        else if (sys < 90) alerts.push({ type: 'warning', message: `BP low: ${latestVitals.bloodPressure} mmHg` });
      }
      if (latestVitals.temperature && latestVitals.temperature > 39) {
        alerts.push({ type: 'critical', message: `High fever: ${latestVitals.temperature}°C` });
      }
      if (latestVitals.spo2 && latestVitals.spo2 < 90) {
        alerts.push({ type: 'critical', message: `Low oxygen: ${latestVitals.spo2}% SpO2` });
      }
      if (latestVitals.pulse && latestVitals.pulse > 120) {
        alerts.push({ type: 'warning', message: `Tachycardia: ${latestVitals.pulse} bpm` });
      }
      if (isAntenatal && latestVitals.fetalHeartRate) {
        if (latestVitals.fetalHeartRate < 110 || latestVitals.fetalHeartRate > 160) {
          alerts.push({ type: 'critical', message: `Abnormal FHR: ${latestVitals.fetalHeartRate} bpm` });
        }
      }
    }
    return alerts;
  };
  
  const criticalAlerts = getCriticalAlerts();
  
  // Get today's tasks due
  const todayTasks = tasks.filter(t => {
    if (t.status === 'completed') return false;
    if (!t.scheduledTime) return true;
    const today = new Date().toDateString();
    const taskDate = new Date(t.scheduledTime).toDateString();
    return taskDate === today;
  });
  
  // Get upcoming medications (next 4 hours)
  const upcomingMeds = medications.filter(med => {
    if (med.status !== 'dispensed') return false;
    const freq = getFrequencyInfo(med.frequency);
    const lastAdmin = med.administeredDoses?.[med.administeredDoses.length - 1];
    if (!lastAdmin) return true;
    const hoursSince = (new Date().getTime() - new Date(lastAdmin.administeredAt).getTime()) / (1000 * 60 * 60);
    return hoursSince >= freq.intervalHours - 4;
  }).slice(0, 3);
  
  // Get recent vitals (last 3)
  const recentVitals = vitalsHistory.slice(-3);
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Left Column - Alerts and Tasks */}
      <div className="space-y-4">
        {/* Critical Alerts */}
        {criticalAlerts.length > 0 && (
          <div className="bg-red-50 rounded-xl p-4 border border-red-200">
            <h4 className="text-sm font-semibold text-red-800 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Critical Alerts ({criticalAlerts.length})
            </h4>
            <div className="space-y-2">
              {criticalAlerts.map((alert, idx) => (
                <div key={idx} className={`flex items-center gap-2 text-sm ${alert.type === 'critical' ? 'text-red-700' : 'text-yellow-700'}`}>
                  <div className={`w-2 h-2 rounded-full ${alert.type === 'critical' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                  <span>{alert.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Today's Tasks */}
        <div className="bg-[var(--bg-main)] rounded-xl p-4 border border-[var(--border-color)]">
          <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-500" />
            Today's Tasks ({todayTasks.filter(t => t.status !== 'completed').length})
          </h4>
          <div className="space-y-2">
            {todayTasks.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)] text-center py-2">No pending tasks for today</p>
            ) : (
              todayTasks.map(task => (
                <div key={task.id} className="flex items-center justify-between p-2 bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)]">
                  <div className="flex items-center gap-2">
                    {task.status === 'completed' ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <Clock className="w-4 h-4 text-yellow-500" />
                    )}
                    <div>
                      <p className="text-sm text-[var(--text-primary)]">{task.title}</p>
                      {task.scheduledTime && (
                        <p className="text-xs text-[var(--text-secondary)]">
                          Due: {new Date(task.scheduledTime).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    task.priority === 'high' ? 'bg-red-100 text-red-700' :
                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {task.priority}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
      {/* Right Column - Recent Labs and Upcoming Medications */}
      <div className="space-y-4">
        {/* Recent Vitals */}
        <div className="bg-[var(--bg-main)] rounded-xl p-4 border border-[var(--border-color)]">
          <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-500" />
            Recent Vitals
          </h4>
          {recentVitals.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)] text-center py-2">No vitals recorded</p>
          ) : (
            <div className="space-y-2">
              {recentVitals.map((vital, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)]">
                  <div className="text-xs text-[var(--text-secondary)]">
                    {new Date(vital.recordedAt).toLocaleDateString()}
                  </div>
                  <div className="flex gap-3 text-sm">
                    {vital.bloodPressure && <span className="font-mono">{vital.bloodPressure}</span>}
                    {vital.temperature && <span className="font-mono">{vital.temperature}°C</span>}
                    {vital.pulse && <span className="font-mono">{vital.pulse} bpm</span>}
                    {vital.spo2 && <span className="font-mono">{vital.spo2}%</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Upcoming Medications */}
        <div className="bg-[var(--bg-main)] rounded-xl p-4 border border-[var(--border-color)]">
          <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <Pill className="w-4 h-4 text-teal-500" />
            Upcoming Medications
          </h4>
          {upcomingMeds.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)] text-center py-2">No upcoming medications</p>
          ) : (
            <div className="space-y-2">
              {upcomingMeds.map(med => (
                <div key={med.id} className="flex items-center justify-between p-2 bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)]">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{med.name}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{med.dosage} - {med.route || 'Oral'}</p>
                  </div>
                  <button className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded">
                    Due Soon
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper function (should match the one in Nursing.tsx)
function getFrequencyInfo(frequency: string): { type: string; requiredDoses: number; intervalHours: number } {
  const freq = frequency?.toLowerCase() || '';
  if (freq.includes('once') || freq === 'od' || freq === 'stat' || freq === 'daily') {
    return { type: 'Once Daily (OD)', requiredDoses: 1, intervalHours: 24 };
  }
  if (freq.includes('bd') || freq === 'twice' || freq === '12hrly') {
    return { type: 'Twice Daily (BD)', requiredDoses: 2, intervalHours: 12 };
  }
  if (freq.includes('tds') || freq === 'thrice' || freq === '8hrly') {
    return { type: 'Three Times Daily (TDS)', requiredDoses: 3, intervalHours: 8 };
  }
  if (freq.includes('qid') || freq === 'four' || freq === '6hrly') {
    return { type: 'Four Times Daily (QID)', requiredDoses: 4, intervalHours: 6 };
  }
  return { type: 'Once Daily (OD)', requiredDoses: 1, intervalHours: 24 };
}