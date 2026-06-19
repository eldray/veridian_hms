// src/components/nursing/ShiftHandoverModal.tsx
import React, { useState, useMemo } from 'react';
import {
  X, Send, Printer, CheckCircle, Clock, User,
  AlertTriangle, FileText, Moon, Sun, Sunrise
} from 'lucide-react';
import { getPatientName } from '../../utils/patient';

// ── Types ─────────────────────────────────────────────────────────────────────

interface HandoverPatient {
  id: string;
  patientId: string;
  patientName?: string;
  patient?: any;            // raw patient object — getPatientName prefers this
  bedNumber?: string;
  admissionType?: string;
  encounterCategory?: string;
  tasks: any[];
  pendingMedsCount?: number;
}

interface ShiftHandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (handoverData: any) => Promise<void>;
  patients: HandoverPatient[];
  currentUser: any;
  hospital: any;
}

// ── Shift helpers ─────────────────────────────────────────────────────────────

type ShiftName = 'Morning' | 'Afternoon' | 'Night';

function detectCurrentShift(): ShiftName {
  const h = new Date().getHours();
  if (h >= 6 && h < 14)  return 'Morning';
  if (h >= 14 && h < 22) return 'Afternoon';
  return 'Night';
}

function detectNextShift(current: ShiftName): ShiftName {
  if (current === 'Morning')   return 'Afternoon';
  if (current === 'Afternoon') return 'Night';
  return 'Morning';
}

const shiftIcon: Record<ShiftName, React.ReactNode> = {
  Morning:   <Sunrise className="w-4 h-4 text-yellow-500" />,
  Afternoon: <Sun className="w-4 h-4 text-orange-500" />,
  Night:     <Moon className="w-4 h-4 text-indigo-500" />,
};

// ── Simple print helper ───────────────────────────────────────────────────────

function printHandover(data: {
  currentShift: ShiftName;
  nextShift: ShiftName;
  handedOverBy: string;
  handoverNotes: string;
  patients: HandoverPatient[];
  checkedTasks: Record<string, boolean>;
  hospital: any;
}) {
  const hospitalName = data.hospital?.name || 'Fuo Community Hospital';
  const now = new Date().toLocaleString();

  const patientRows = data.patients.map(p => {
    const name = p.patient ? getPatientName(p.patient) : (p.patientName || 'Unknown');
    const pendingTasks = p.tasks.filter(t => t.status !== 'completed' && !data.checkedTasks[`${p.id}::${t.id}`]);
    const doneTasks    = p.tasks.filter(t => data.checkedTasks[`${p.id}::${t.id}`]);

    return `
      <tr style="border-bottom:1px solid #e5e7eb">
        <td style="padding:8px 12px;font-weight:600">${name}</td>
        <td style="padding:8px 12px">${p.bedNumber || '—'}</td>
        <td style="padding:8px 12px">${p.encounterCategory?.toUpperCase() || 'IPD'}</td>
        <td style="padding:8px 12px">
          ${pendingTasks.map(t => `<div style="margin-bottom:4px">⏳ ${t.title}${t.priority === 'high' ? ' <b style="color:#dc2626">[HIGH]</b>' : ''}</div>`).join('')}
          ${pendingTasks.length === 0 ? '<span style="color:#6b7280;font-size:12px">No pending tasks</span>' : ''}
        </td>
        <td style="padding:8px 12px;color:#16a34a">
          ${doneTasks.map(t => `<div>✓ ${t.title}</div>`).join('')}
        </td>
      </tr>`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><title>Shift Handover — ${data.currentShift} to ${data.nextShift}</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 13px; color: #111; margin: 0; padding: 24px; }
      h1 { font-size: 18px; margin: 0 0 4px; }
      h2 { font-size: 14px; margin: 0; color: #374151; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; }
      th { background: #f3f4f6; text-align: left; padding: 8px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #e5e7eb; }
      .header-bar { background: #0f766e; color: white; padding: 16px 24px; margin: -24px -24px 24px; }
      .meta { display: flex; gap: 32px; margin-bottom: 16px; font-size: 12px; color: #6b7280; }
      .notes-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; margin-bottom: 16px; white-space: pre-wrap; }
      @media print { body { padding: 16px; } }
    </style></head><body>
    <div class="header-bar">
      <h1>${hospitalName} — Nursing Shift Handover</h1>
      <h2>${data.currentShift} Shift → ${data.nextShift} Shift</h2>
    </div>
    <div class="meta">
      <span>Handed over by: <b>${data.handedOverBy}</b></span>
      <span>Date/Time: <b>${now}</b></span>
      <span>Patients: <b>${data.patients.length}</b></span>
    </div>
    ${data.handoverNotes ? `<div class="notes-box">${data.handoverNotes}</div>` : ''}
    <table>
      <thead>
        <tr>
          <th>Patient</th><th>Bed</th><th>Type</th><th>Pending for Next Shift</th><th>Completed This Shift</th>
        </tr>
      </thead>
      <tbody>${patientRows}</tbody>
    </table>
    <div style="margin-top:40px;border-top:1px solid #e5e7eb;padding-top:12px;font-size:11px;color:#9ca3af">
      This handover report was generated electronically by the Nursing Station module. 
      Handover by ${data.handedOverBy} at ${now}.
    </div>
    <script>window.onload = () => { window.print(); }</script>
  </body></html>`;

  const win = window.open('', '_blank', 'width=900,height=700');
  if (win) { win.document.write(html); win.document.close(); }
}

// ── Main component ────────────────────────────────────────────────────────────

export const ShiftHandoverModal: React.FC<ShiftHandoverModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  patients,
  currentUser,
  hospital,
}) => {
  const currentShift = useMemo(detectCurrentShift, []);
  const nextShift    = useMemo(() => detectNextShift(currentShift), [currentShift]);

  const [handoverNotes, setHandoverNotes] = useState('');
  const [checkedTasks, setCheckedTasks]   = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting]   = useState(false);

  const toggleTask = (patientId: string, taskId: string) => {
    const key = `${patientId}::${taskId}`;
    setCheckedTasks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handedOverBy = currentUser?.fullName || currentUser?.username || 'Unknown Nurse';

  const totalPending   = patients.reduce((s, p) => s + p.tasks.filter(t => t.status !== 'completed').length, 0);
  const totalCompleted = Object.values(checkedTasks).filter(Boolean).length;

  const patientsWithTasks   = patients.filter(p => p.tasks.length > 0);
  const patientsWithoutTasks = patients.filter(p => p.tasks.length === 0);

  const handlePrint = () => {
    printHandover({ currentShift, nextShift, handedOverBy, handoverNotes, patients, checkedTasks, hospital });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onComplete({
        notes: handoverNotes,
        completedTasks: checkedTasks,
        currentShift,
        nextShift,
        handedOverAt: new Date().toISOString(),
        handedOverBy: handedOverBy,
      });
      handlePrint();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--bg-card)] rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-[var(--border-color)] shadow-xl">

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-main)] rounded-t-xl flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center">
              <Send className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">Shift Handover</h2>
              <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                {shiftIcon[currentShift]}
                <span>{currentShift} Shift</span>
                <span>→</span>
                {shiftIcon[nextShift]}
                <span>{nextShift} Shift</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] text-[var(--text-tertiary)]">Handed over by</p>
              <p className="text-xs font-semibold text-[var(--text-primary)]">{handedOverBy}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[var(--border-color)] transition-colors"
            >
              <X className="w-4 h-4 text-[var(--text-secondary)]" />
            </button>
          </div>
        </div>

        {/* ── Scrollable body ───────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Summary strip */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Patients', value: patients.length, color: 'text-[var(--icon-cyan-text)]' },
              { label: 'Pending tasks', value: totalPending, color: 'text-yellow-600' },
              { label: 'Marked done', value: totalCompleted, color: 'text-green-600' },
            ].map(s => (
              <div key={s.label} className="text-center bg-[var(--bg-main)] rounded-lg px-3 py-2 border border-[var(--border-color)]">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Handover notes */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
              Handover Notes for {nextShift} Shift
            </label>
            <textarea
              value={handoverNotes}
              onChange={e => setHandoverNotes(e.target.value)}
              rows={4}
              placeholder={`Write key handover points:\n• Any critical patient changes this shift\n• Pending results or decisions\n• Special instructions for next team\n• Family communications needed`}
              className="w-full px-3 py-2 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] resize-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 placeholder-[var(--text-tertiary)]"
            />
          </div>

          {/* Patient task summary */}
          {patientsWithTasks.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
                Patient Task Status — tick tasks completed this shift
              </p>
              <div className="space-y-3">
                {patientsWithTasks.map(p => {
                  const name = p.patient ? getPatientName(p.patient) : (p.patientName || 'Unknown');
                  const pendingTasks = p.tasks.filter(t => t.status !== 'completed');
                  return (
                    <div key={p.id} className="bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                      {/* Patient header */}
                      <div className="flex items-center gap-3 px-4 py-2.5 bg-[var(--bg-card)] border-b border-[var(--border-color)]">
                        <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                          <User className="w-3 h-3 text-teal-600" />
                        </div>
                        <span className="text-sm font-semibold text-[var(--text-primary)]">{name}</span>
                        {p.bedNumber && (
                          <span className="text-xs text-[var(--text-tertiary)]">Bed {p.bedNumber}</span>
                        )}
                        <span className="ml-auto text-[10px] text-[var(--text-tertiary)]">
                          {pendingTasks.length} task{pendingTasks.length !== 1 ? 's' : ''}
                        </span>
                      </div>

                      {/* Tasks */}
                      <div className="divide-y divide-[var(--border-color)]">
                        {pendingTasks.map(task => {
                          const key = `${p.id}::${task.id}`;
                          const checked = checkedTasks[key] || false;
                          return (
                            <label
                              key={task.id}
                              className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                                checked ? 'bg-green-50' : 'hover:bg-[var(--bg-card)]'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleTask(p.id, task.id)}
                                className="w-4 h-4 rounded text-green-600 focus:ring-green-500"
                              />
                              <div className="flex-1 min-w-0">
                                <span className={`text-xs font-medium ${checked ? 'line-through text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]'}`}>
                                  {task.title}
                                </span>
                                {task.scheduledTime && (
                                  <span className="text-[10px] text-[var(--text-tertiary)] ml-2">
                                    <Clock className="w-2.5 h-2.5 inline mr-0.5" />
                                    {new Date(task.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                              </div>
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                task.priority === 'high'   ? 'bg-red-100 text-red-700' :
                                task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                                {task.priority}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Patients with no tasks */}
          {patientsWithoutTasks.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-50 border border-green-200">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
              <p className="text-xs text-green-700">
                <span className="font-semibold">{patientsWithoutTasks.length} patient{patientsWithoutTasks.length > 1 ? 's' : ''}</span>
                {' '}({patientsWithoutTasks.map(p => p.patient ? getPatientName(p.patient) : (p.patientName || 'Unknown')).join(', ')}) have no pending tasks.
              </p>
            </div>
          )}
        </div>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-[var(--border-color)] bg-[var(--bg-main)] rounded-b-xl flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-[var(--text-secondary)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-card)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] rounded-lg hover:bg-[var(--icon-purple-text)] hover:text-white transition-colors font-medium"
          >
            <Printer className="w-4 h-4" />
            Print Preview
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Send className="w-4 h-4" />}
            {isSubmitting ? 'Saving…' : 'Complete Handover & Print'}
          </button>
        </div>
      </div>
    </div>
  );
};