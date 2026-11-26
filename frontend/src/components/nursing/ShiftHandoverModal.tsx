// src/components/nursing/ShiftHandoverModal.tsx
import React, { useState, useMemo } from 'react';
import {
  X, Send, Printer, CheckCircle, Clock, User,
  Moon, Sun, Sunrise
} from 'lucide-react';
import { getPatientName } from '../../utils/patient';
import { generatePDF, openPrintWindow } from '../../utils/pdfGenerator';
import { describeApiError } from '../../utils/apiError';

// ── Types ─────────────────────────────────────────────────────────────────────

interface HandoverPatient {
  id: string;
  patientId?: string | null; // null for counter-ticket walk-ins without a folder
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
  Morning:   <Sunrise className="w-4 h-4 text-[var(--icon-yellow-text)]" />,
  Afternoon: <Sun className="w-4 h-4 text-[var(--icon-orange-text)]" />,
  Night:     <Moon className="w-4 h-4 text-[var(--icon-purple-text)]" />,
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
  const patients = data.patients.map((p) => {
    const tasks = p.tasks || [];
    const isDone = (t: any) => t.status === 'completed' || data.checkedTasks[`${p.id}::${t.id}`];
    return {
      name: p.patient ? getPatientName(p.patient) : (p.patientName || 'Unknown'),
      bedNumber: p.bedNumber || undefined,
      pendingTasks: tasks.filter((t: any) => !isDone(t)).map((t: any) => ({
        title: t.title,
        priority: t.priority || 'medium',
        scheduledTime: t.scheduledTime || t.dueAt || undefined,
      })),
      completedTasks: tasks.filter(isDone),
    };
  });
  const html = generatePDF('handover', {
    shiftFrom: `${data.currentShift} shift`,
    shiftTo: `${data.nextShift} shift`,
    handoverNotes: data.handoverNotes,
    completedTasksCount: patients.reduce((n, p) => n + p.completedTasks.length, 0),
    patients,
    handedOverBy: data.handedOverBy,
    handedOverAt: new Date().toISOString(),
  }, data.hospital);
  openPrintWindow(html, `Shift-Handover-${data.currentShift}-to-${data.nextShift}`);
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
  const [saveError, setSaveError] = useState('');

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
    setSaveError('');
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
    } catch (err: any) {
      // Closing on a failed write would tell the nurse the handover was recorded when it was not.
      setSaveError(describeApiError(err, 'The handover could not be recorded.'));
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
            <div className="w-9 h-9 bg-[var(--icon-orange-bg)] rounded-lg flex items-center justify-center">
              <Send className="w-4 h-4 text-[var(--icon-orange-text)]" />
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
              { label: 'Pending tasks', value: totalPending, color: 'text-[var(--icon-yellow-text)]' },
              { label: 'Marked done', value: totalCompleted, color: 'text-[var(--icon-green-text)]' },
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
              className="w-full px-3 py-2 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] resize-none focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] placeholder-[var(--text-tertiary)]"
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
                        <div className="w-6 h-6 rounded-full bg-[var(--icon-cyan-bg)] flex items-center justify-center flex-shrink-0">
                          <User className="w-3 h-3 text-[var(--icon-cyan-text)]" />
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
                                checked ? 'bg-[var(--icon-green-bg)]' : 'hover:bg-[var(--bg-card)]'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleTask(p.id, task.id)}
                                className="w-4 h-4 rounded text-[var(--icon-green-text)] focus:ring-[var(--icon-green-text)]"
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
                                task.priority === 'high'   ? 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]' :
                                task.priority === 'medium' ? 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]' :
                                'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]'
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
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[var(--icon-green-bg)] border border-[var(--border-color)]">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
              <p className="text-xs text-[var(--icon-green-text)]">
                <span className="font-semibold">{patientsWithoutTasks.length} patient{patientsWithoutTasks.length > 1 ? 's' : ''}</span>
                {' '}({patientsWithoutTasks.map(p => p.patient ? getPatientName(p.patient) : (p.patientName || 'Unknown')).join(', ')}) have no pending tasks.
              </p>
            </div>
          )}
        </div>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        {saveError ? (
          <div role="alert" className="px-6 py-3 border-t border-[var(--border-color)] bg-[var(--icon-red-bg)] text-sm text-[var(--icon-red-text)]">
            {saveError}
          </div>
        ) : null}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-[var(--border-color)] bg-[var(--bg-main)] rounded-b-xl flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-[var(--text-secondary)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-card)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] rounded-lg hover:opacity-90 transition-colors font-medium"
          >
            <Printer className="w-4 h-4" />
            Print Preview
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold bg-[var(--icon-orange-bg)] text-[var(--icon-orange-text)] rounded-lg hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--icon-orange-text)] transition-colors disabled:opacity-50"
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