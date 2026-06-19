// src/components/nursing/PatientSummarySidebar.tsx
import React from 'react';
import {
  AlertTriangle, CheckCircle, Clock, Pill, Activity,
  Heart, Baby, Bed, Calendar, User
} from 'lucide-react';
import { getFrequencyInfo, isDoseDue, hoursUntilNextDose } from '../../utils/frequencyUtils';

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

// ── Vital sign thresholds ────────────────────────────────────────────────────

interface Alert { level: 'critical' | 'warning'; message: string }

function buildVitalAlerts(vitals: any, isAntenatal: boolean): Alert[] {
  const alerts: Alert[] = [];
  if (!vitals) return alerts;

  if (vitals.bloodPressure) {
    const [sys] = vitals.bloodPressure.split('/').map(Number);
    if (sys >= 180)      alerts.push({ level: 'critical', message: `Hypertensive crisis: BP ${vitals.bloodPressure} mmHg` });
    else if (sys >= 140) alerts.push({ level: 'warning',  message: `High BP: ${vitals.bloodPressure} mmHg` });
    else if (sys < 90)   alerts.push({ level: 'warning',  message: `Low BP: ${vitals.bloodPressure} mmHg` });
  }
  if (vitals.temperature !== undefined) {
    if (vitals.temperature >= 39.5) alerts.push({ level: 'critical', message: `High fever: ${vitals.temperature}°C` });
    else if (vitals.temperature >= 38) alerts.push({ level: 'warning', message: `Fever: ${vitals.temperature}°C` });
    else if (vitals.temperature < 35)  alerts.push({ level: 'critical', message: `Hypothermia: ${vitals.temperature}°C` });
  }
  if (vitals.spo2 !== undefined) {
    if (vitals.spo2 < 90)      alerts.push({ level: 'critical', message: `Critical SpO₂: ${vitals.spo2}%` });
    else if (vitals.spo2 < 94) alerts.push({ level: 'warning',  message: `Low SpO₂: ${vitals.spo2}%` });
  }
  if (vitals.pulse !== undefined) {
    if (vitals.pulse > 130)    alerts.push({ level: 'critical', message: `Severe tachycardia: ${vitals.pulse} bpm` });
    else if (vitals.pulse > 100) alerts.push({ level: 'warning', message: `Tachycardia: ${vitals.pulse} bpm` });
    else if (vitals.pulse < 50)  alerts.push({ level: 'warning', message: `Bradycardia: ${vitals.pulse} bpm` });
  }
  if (vitals.respiration !== undefined) {
    if (vitals.respiration > 25)  alerts.push({ level: 'critical', message: `Tachypnoea: RR ${vitals.respiration}/min` });
    else if (vitals.respiration < 10) alerts.push({ level: 'critical', message: `Bradypnoea: RR ${vitals.respiration}/min` });
  }
  if (isAntenatal && vitals.fetalHeartRate !== undefined) {
    if (vitals.fetalHeartRate < 110 || vitals.fetalHeartRate > 160)
      alerts.push({ level: 'critical', message: `Abnormal FHR: ${vitals.fetalHeartRate} bpm (normal 110–160)` });
  }
  return alerts;
}

// ── Sub-components ────────────────────────────────────────────────────────────

const AlertBanner: React.FC<{ alerts: Alert[] }> = ({ alerts }) => {
  if (!alerts.length) return null;
  const critical = alerts.filter(a => a.level === 'critical');
  const warnings = alerts.filter(a => a.level === 'warning');
  return (
    <div className="space-y-2">
      {critical.length > 0 && (
        <div className="bg-red-50 rounded-xl border border-red-300 p-3">
          <p className="text-xs font-bold text-red-800 flex items-center gap-1.5 mb-2">
            <AlertTriangle className="w-3.5 h-3.5" />
            {critical.length} Critical Alert{critical.length > 1 ? 's' : ''}
          </p>
          <div className="space-y-1">
            {critical.map((a, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-red-700">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1 flex-shrink-0" />
                {a.message}
              </div>
            ))}
          </div>
        </div>
      )}
      {warnings.length > 0 && (
        <div className="bg-yellow-50 rounded-xl border border-yellow-300 p-3">
          <p className="text-xs font-bold text-yellow-800 flex items-center gap-1.5 mb-2">
            <AlertTriangle className="w-3.5 h-3.5" />
            {warnings.length} Warning{warnings.length > 1 ? 's' : ''}
          </p>
          <div className="space-y-1">
            {warnings.map((a, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-yellow-700">
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1 flex-shrink-0" />
                {a.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const VitalChip: React.FC<{ label: string; value: string; unit?: string; alert?: boolean }> = ({
  label, value, unit, alert
}) => (
  <div className={`px-3 py-2 rounded-lg border text-center ${alert ? 'bg-red-50 border-red-200' : 'bg-[var(--bg-main)] border-[var(--border-color)]'}`}>
    <p className={`text-sm font-bold font-mono ${alert ? 'text-red-700' : 'text-[var(--text-primary)]'}`}>
      {value}{unit && <span className="text-[10px] ml-0.5">{unit}</span>}
    </p>
    <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{label}</p>
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────

export const PatientSummarySidebar: React.FC<PatientSummarySidebarProps> = ({
  patient,
  attendance,
  admission,
  latestVitals,
  vitalsHistory,
  medications,
  tasks,
  isAntenatal,
}) => {
  const alerts = buildVitalAlerts(latestVitals, isAntenatal);

  // Medications due in the next 2 hours or overdue
  const medsDue = medications.filter(m => {
    if (m.status !== 'dispensed') return false;
    const freq = getFrequencyInfo(m.frequency);
    const doses = m.administeredDoses || [];
    if (doses.length >= freq.requiredDoses) return false;
    return isDoseDue(m) || hoursUntilNextDose(m) <= 2;
  });

  // Today's pending tasks
  const todayPending = tasks.filter(t => {
    if (t.status === 'completed') return false;
    if (!t.scheduledTime) return true;
    return new Date(t.scheduledTime).toDateString() === new Date().toDateString();
  });

  const recentVitals = [...vitalsHistory].reverse().slice(0, 3);

  // Vitals alert flags
  const bpAlert = latestVitals?.bloodPressure && (() => {
    const [s] = latestVitals.bloodPressure.split('/').map(Number);
    return s >= 140 || s < 90;
  })();
  const tempAlert = latestVitals?.temperature && (latestVitals.temperature >= 38 || latestVitals.temperature < 35);
  const spo2Alert = latestVitals?.spo2 && latestVitals.spo2 < 94;
  const pulseAlert = latestVitals?.pulse && (latestVitals.pulse > 100 || latestVitals.pulse < 50);

  return (
    <div className="space-y-4">
      {/* Critical alerts — full width */}
      <AlertBanner alerts={alerts} />

      {/* Two-column summary grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* ── LEFT: Vitals snapshot ─────────────────────────────────────── */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
            <Activity className="w-4 h-4 text-[var(--icon-purple-text)]" />
            <span className="text-xs font-semibold text-[var(--text-primary)]">Latest Vitals</span>
            {latestVitals?.recordedAt && (
              <span className="ml-auto text-[10px] text-[var(--text-tertiary)]">
                {new Date(latestVitals.recordedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          {!latestVitals ? (
            <p className="text-xs text-[var(--text-tertiary)] text-center py-6">No vitals recorded yet</p>
          ) : (
            <div className="p-3 grid grid-cols-2 gap-2">
              {latestVitals.bloodPressure && (
                <VitalChip label="BP" value={latestVitals.bloodPressure} unit=" mmHg" alert={bpAlert} />
              )}
              {latestVitals.temperature !== undefined && (
                <VitalChip label="Temp" value={`${latestVitals.temperature}`} unit="°C" alert={tempAlert} />
              )}
              {latestVitals.pulse !== undefined && (
                <VitalChip label="Pulse" value={`${latestVitals.pulse}`} unit=" bpm" alert={pulseAlert} />
              )}
              {latestVitals.spo2 !== undefined && (
                <VitalChip label="SpO₂" value={`${latestVitals.spo2}`} unit="%" alert={spo2Alert} />
              )}
              {latestVitals.respiration !== undefined && (
                <VitalChip label="RR" value={`${latestVitals.respiration}`} unit="/min" />
              )}
              {latestVitals.weight !== undefined && (
                <VitalChip label="Weight" value={`${latestVitals.weight}`} unit=" kg" />
              )}
              {isAntenatal && latestVitals.fetalHeartRate !== undefined && (
                <div className="col-span-2">
                  <VitalChip
                    label="Fetal Heart Rate"
                    value={`${latestVitals.fetalHeartRate}`}
                    unit=" bpm"
                    alert={latestVitals.fetalHeartRate < 110 || latestVitals.fetalHeartRate > 160}
                  />
                </div>
              )}
              {isAntenatal && latestVitals.fundalHeight !== undefined && (
                <VitalChip label="Fundal Ht." value={`${latestVitals.fundalHeight}`} unit=" cm" />
              )}
            </div>
          )}

          {/* Trend — last 3 */}
          {recentVitals.length > 1 && (
            <div className="border-t border-[var(--border-color)] px-3 py-2">
              <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase mb-1.5">Trend</p>
              <div className="space-y-1">
                {recentVitals.map((v, i) => (
                  <div key={i} className="flex items-center justify-between text-[10px] text-[var(--text-secondary)]">
                    <span>{new Date(v.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="font-mono">{v.bloodPressure || '—'}</span>
                    <span className="font-mono">{v.temperature ? `${v.temperature}°C` : '—'}</span>
                    <span className="font-mono">{v.pulse ? `${v.pulse}bpm` : '—'}</span>
                    <span className="font-mono">{v.spo2 ? `${v.spo2}%` : '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Meds due + tasks ───────────────────────────────────── */}
        <div className="space-y-3">
          {/* Medications due */}
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
              <Pill className="w-4 h-4 text-teal-600" />
              <span className="text-xs font-semibold text-[var(--text-primary)]">Medications Due</span>
              {medsDue.length > 0 && (
                <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                  {medsDue.length}
                </span>
              )}
            </div>
            {medsDue.length === 0 ? (
              <div className="flex items-center gap-2 px-4 py-3 text-xs text-[var(--text-secondary)]">
                <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                All medications up to date
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-color)]">
                {medsDue.slice(0, 4).map(med => {
                  const due = isDoseDue(med);
                  const hrs = hoursUntilNextDose(med);
                  const freq = getFrequencyInfo(med.frequency);
                  const dosesDone = (med.administeredDoses || []).length;
                  return (
                    <div key={med.id} className={`flex items-center gap-3 px-4 py-2.5 ${due ? 'bg-yellow-50' : ''}`}>
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${due ? 'bg-yellow-500' : 'bg-[var(--text-tertiary)]'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[var(--text-primary)] truncate">{med.name}</p>
                        <p className="text-[10px] text-[var(--text-tertiary)]">
                          {med.dosage} · Dose {dosesDone + 1}/{freq.requiredDoses}
                        </p>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${due ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-700'}`}>
                        {due ? 'Due now' : `~${Math.round(hrs)}h`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Today's pending tasks */}
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
              <Clock className="w-4 h-4 text-[var(--icon-cyan-text)]" />
              <span className="text-xs font-semibold text-[var(--text-primary)]">Today's Tasks</span>
              {todayPending.length > 0 && (
                <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]">
                  {todayPending.length}
                </span>
              )}
            </div>
            {todayPending.length === 0 ? (
              <div className="flex items-center gap-2 px-4 py-3 text-xs text-[var(--text-secondary)]">
                <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                No pending tasks for today
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-color)]">
                {todayPending.slice(0, 4).map(task => {
                  const overdue = task.scheduledTime && new Date(task.scheduledTime) < new Date();
                  return (
                    <div key={task.id} className={`flex items-center gap-3 px-4 py-2.5 ${overdue ? 'bg-red-50' : ''}`}>
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        task.priority === 'high' ? 'bg-red-500' :
                        task.priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-400'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[var(--text-primary)] truncate">{task.title}</p>
                        {task.scheduledTime && (
                          <p className={`text-[10px] ${overdue ? 'text-red-600 font-medium' : 'text-[var(--text-tertiary)]'}`}>
                            {overdue ? 'Overdue · ' : ''}
                            {new Date(task.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
                {todayPending.length > 4 && (
                  <p className="text-[10px] text-[var(--text-tertiary)] px-4 py-2">
                    +{todayPending.length - 4} more tasks — see Tasks tab
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Antenatal note strip */}
      {isAntenatal && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-pink-50 border border-pink-200">
          <Baby className="w-4 h-4 text-pink-600 flex-shrink-0" />
          <p className="text-xs text-pink-700 font-medium">
            Antenatal patient — record FHR, fundal height and fetal movements with every vitals entry
          </p>
        </div>
      )}
    </div>
  );
};