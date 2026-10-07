// src/pages/NursingPatientWorkspace.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAttendanceStore } from '../store/attendanceStore';
import { usePatientStore } from '../store/patientStore';
import { useAuthStore } from '../store/authStore';
import { useAdmissionStore } from '../store/admissionStore';
import { useStockStore } from '../store/stockStore';
import { useToast } from '../store/toastStore';
import { useHospitalStore } from '../store/hospitalStore';
import { useNursingStore } from '../store/nursingStore';
import { VitalsFormModal } from '../components/vitals/VitalsFormModal';
import { NursingTaskList, type NursingTask as UiNursingTask } from '../components/nursing/NursingTaskList';
import { MarChart } from '../components/nursing/MarChart';
import { MarGrid } from '../components/nursing/MarGrid';
import { MarPrintModal } from '../components/nursing/MarPrintModal';
import { NursingNotesPanel } from '../components/nursing/NursingNotesPanel';
import { ConsumableModal } from '../components/medical-entries/modals/ConsumableModal';
import { ConsumableUsesPanel } from '../components/medical-entries/ConsumableUsesPanel';
import { deleteEncounterConsumableUse, getEncounterConsumableUses } from '../api';
import { getPatientName } from '../utils/patient';
import type { MarDose } from '../api/nursing';
import {
  ChevronLeft, Pill, Hospital, Bed,
  Plus, CheckCircle, Activity, User, Package,
  AlertTriangle, ClipboardList, ListTodo, StickyNote,
  Moon, Sun, Printer, LayoutGrid, List, Info,
  Heart, Phone, MapPin, Shield, Calendar, Syringe,
  TrendingUp, ChevronRight,
} from 'lucide-react';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const getEntityId = (entity: { id?: string; _id?: string } | null | undefined): string =>
  entity?.id || entity?._id || '';

const PatientTypeBadge: React.FC<{ attendance: any; admission: any }> = ({ attendance, admission }) => {
  const admType = admission?.admissionType || attendance?.admissionType;
  const cat = attendance?.encounterCategory;

  if (cat === 'daycase') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-700 border border-purple-200">
      <Sun className="w-2.5 h-2.5" /> Day Surgery
    </span>
  );
  if (admType === 'detention_observation') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-700 border border-orange-200">
      <Moon className="w-2.5 h-2.5" /> Observation
    </span>
  );
  if (cat === 'ipd') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700 border border-blue-200">
      <Hospital className="w-2.5 h-2.5" /> IPD
    </span>
  );
  return null;
};

const PaymentBadge: React.FC<{ mode: string | null | undefined }> = ({ mode }) => {
  if (!mode) return null;
  const map: Record<string, { label: string; cls: string }> = {
    nhis:              { label: 'NHIS',    cls: 'bg-green-100 text-green-700' },
    private_insurance: { label: 'PVT INS', cls: 'bg-purple-100 text-purple-700' },
    corporate:         { label: 'CORP',    cls: 'bg-cyan-100 text-cyan-700' },
    cash:              { label: 'CASH',    cls: 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]' },
  };
  const conf = map[mode] ?? map.cash;
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${conf.cls}`}>
      {conf.label}
    </span>
  );
};

// ─────────────────────────────────────────────
// Vitals row
// ─────────────────────────────────────────────

const VitalsRow: React.FC<{
  label: string;
  value: string;
  unit?: string;
  alert?: boolean;
  icon?: React.ReactNode;
}> = ({ label, value, unit, alert, icon }) => (
  <div className={`flex items-center justify-between px-3 py-2 rounded-lg ${
    alert ? 'bg-[var(--icon-red-bg)]/40' : 'bg-[var(--bg-main)]'
  }`}>
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-[11px] font-medium text-[var(--text-secondary)]">{label}</span>
    </div>
    <span className={`text-sm font-bold font-mono ${
      alert ? 'text-[var(--icon-red-text)]' : 'text-[var(--text-primary)]'
    }`}>
      {value}
      {unit && <span className="text-[10px] font-normal text-[var(--text-tertiary)] ml-0.5">{unit}</span>}
    </span>
  </div>
);

// ═════════════════════════════════════════════
// Workspace
// ═════════════════════════════════════════════

type TabKey = 'overview' | 'mar' | 'tasks' | 'notes' | 'vitals';

export default function NursingPatientWorkspace() {
  const { attendanceId } = useParams<{ attendanceId: string }>();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const { user } = useAuthStore();
  const { hospital } = useHospitalStore();

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [marView, setMarView] = useState<'list' | 'grid'>('list');
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [showConsumableModal, setShowConsumableModal] = useState(false);
  const [editingConsumable, setEditingConsumable] = useState<any | null>(null);
  const [consumableUses, setConsumableUses] = useState<any[]>([]);
  const [showMarPrint, setShowMarPrint] = useState(false);
  const [vitalsList, setVitalsList] = useState<any[]>([]);
  const [latestVitals, setLatestVitals] = useState<any>(null);
  const [administeringId, setAdministeringId] = useState<string | null>(null);
  const [busyDoseId, setBusyDoseId] = useState<string | null>(null);

  const { attendances, getAttendances, refreshAttendance, updateMedicationStatus, getVitalsByAttendance, addVitals } = useAttendanceStore();
  const { patients, loadPatients } = usePatientStore();
  const { admissions, getAdmissions } = useAdmissionStore();
  const { stockItems, getStockItems } = useStockStore();

  const {
    doses, dosesLoading,
    tasks,
    fetchDoses, fetchTasks, createTask, editTask,
    administerDose, recordVariance,
  } = useNursingStore();

  // ── Bootstrap ─────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        await Promise.all([
          loadPatients(),
          getAttendances(),
          getAdmissions(),
          getStockItems(),
        ]);
      } catch (err: any) {
        toastError('Load failed', err?.message || 'Could not load patient data');
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Resolve patient ───────────────────────────
  const findPatient = useCallback((attendance: any) => {
    if (!attendance) return null;
    if (attendance.patient && typeof attendance.patient === 'object') return attendance.patient;
    if (attendance.patientId && typeof attendance.patientId === 'object') return attendance.patientId;
    if (attendance.patientId && typeof attendance.patientId === 'string') {
      const found = patients.find((p) => p.id === attendance.patientId);
      if (found) return found;
    }
    if (attendance.Patient && typeof attendance.Patient === 'object') return attendance.Patient;
    return null;
  }, [patients]);

  const selectedAtt = useMemo(
    () => attendances.find((a) => getEntityId(a) === attendanceId),
    [attendances, attendanceId],
  );
  const selectedPatient = useMemo(() => selectedAtt ? findPatient(selectedAtt) : null, [selectedAtt, findPatient]);
  const activeAdmission = useMemo(
    () => admissions.find((a) => a.attendanceId === attendanceId && !a.dischargeDate),
    [admissions, attendanceId],
  );
  const isAntenatal = selectedAtt?.attendanceType === 'antenatal';

  const meds = useMemo(() => selectedAtt?.Medication ?? [], [selectedAtt]);
  const administrableMeds = meds.filter((m: any) => m.status === 'dispensed' || m.status === 'administered');
  const canRecordConsumable = !!selectedAtt && ['pending', 'admitted'].includes(selectedAtt.status);

  const refreshConsumableUses = async () => {
    if (!attendanceId) return;
    const response = await getEncounterConsumableUses(attendanceId);
    setConsumableUses(Array.isArray(response?.data) ? response.data : []);
  };

  const afterConsumableChange = async () => {
    setShowConsumableModal(false);
    setEditingConsumable(null);
    try {
      await Promise.all([refreshConsumableUses(), getStockItems(), refreshAttendance(attendanceId || '')]);
    } catch (err: any) {
      toastError('Refresh failed', err?.response?.data?.message || err.message);
    }
  };

  const handleDeleteConsumable = async (use: any) => {
    if (!attendanceId || !window.confirm(`Delete ${use.StockItem?.name || 'this consumable use'}? Stock will be restored.`)) return;
    try {
      await deleteEncounterConsumableUse(attendanceId, use.id);
      success('Consumable use deleted', 'The stock was restored.');
      await Promise.all([refreshConsumableUses(), getStockItems()]);
    } catch (err: any) {
      toastError('Could not delete consumable use', err?.response?.data?.message || err.message);
    }
  };

  // ── Load MAR + Tasks + Vitals when attendance changes ──
  useEffect(() => {
    if (!attendanceId) return;

    refreshConsumableUses().catch((err: any) => {
      toastError('Consumable history unavailable', err?.response?.data?.message || err.message);
    });
    void fetchDoses({ attendanceId, limit: 500 }).catch(() => {});
    void fetchTasks({ attendanceId }).catch(() => {});

    getVitalsByAttendance(attendanceId)
      .then((v: any[]) => {
        const sorted = [...(v || [])].sort(
          (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
        );
        setVitalsList(sorted);
        setLatestVitals(sorted.length ? sorted[sorted.length - 1] : null);
      })
      .catch(() => {
        setVitalsList([]);
        setLatestVitals(null);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attendanceId]);

  // ── MAR actions ───────────────────────────────
  const handleMarAdminister = async (dose: MarDose) => {
    setBusyDoseId(dose.id);
    try {
      await administerDose(dose.id, {
        administeredAt: new Date().toISOString(),
        notes: 'Administered at bedside',
      });
      success('Dose given', `${dose.medication.name} dose ${dose.doseNumber}`);
    } catch (err: any) {
      toastError('Failed', err?.response?.data?.message || err.message);
    } finally {
      setBusyDoseId(null);
    }
  };

  const handleMarVariance = async (dose: MarDose, status: 'late' | 'missed' | 'refused' | 'held') => {
    const defaultReason =
      status === 'refused' ? 'Patient declined'
      : status === 'held' ? 'Awaiting doctor review'
      : status === 'missed' ? 'Not administered this shift'
      : 'Administered outside scheduled window';
    const reason = window.prompt(`Reason for ${status}:`, defaultReason);
    if (reason === null) return;

    setBusyDoseId(dose.id);
    try {
      await recordVariance(dose.id, { status, reason: reason || undefined });
      success('Recorded', `Dose ${dose.doseNumber} marked as ${status}`);
    } catch (err: any) {
      toastError('Failed', err?.response?.data?.message || err.message);
    } finally {
      setBusyDoseId(null);
    }
  };

  // ── Quick-give from Overview ──────────────────
  const handleQuickGive = async (dose: MarDose) => {
    await handleMarAdminister(dose);
  };

  // ── Tasks ─────────────────────────────────────
  const handleAddTask = async (task: Omit<UiNursingTask, 'id'>) => {
    if (!attendanceId || !selectedPatient) return;
    try {
      await createTask({
        patientId: getEntityId(selectedPatient),
        attendanceId,
        admissionId: activeAdmission?.id ?? null,
        title: task.title,
        description: task.description,
        taskType: (task.taskType as any) ?? 'general',
        priority: (task.priority as any) ?? 'medium',
        scheduledAt: task.scheduledTime || null,
        notes: task.notes ?? null,
      });
      success('Task added', task.title);
    } catch (err: any) {
      toastError('Failed', err?.response?.data?.message || err.message);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      await editTask(taskId, { status: 'completed' });
      success('Task done', 'Marked as completed');
    } catch (err: any) {
      toastError('Failed', err?.response?.data?.message || err.message);
    }
  };

  // ── Vitals ────────────────────────────────────
  const handleSubmitVitals = async (data: any) => {
    if (!attendanceId) return;
    try {
      await addVitals(attendanceId, { ...data, recordedAt: new Date().toISOString(), recordedById: user?.id });
      success('Vitals saved', 'Recorded successfully');
      const updated = await getVitalsByAttendance(attendanceId);
      const sorted = [...(updated || [])].sort(
        (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
      );
      setVitalsList(sorted);
      setLatestVitals(sorted.length ? sorted[sorted.length - 1] : null);
      setShowVitalsModal(false);
    } catch (err: any) {
      toastError('Save failed', err.response?.data?.message || err.message);
    }
  };

  // ── Derived: alerts ───────────────────────────
  const alerts = useMemo(() => {
    const list: { level: 'critical' | 'warning'; message: string }[] = [];
    if (!latestVitals) return list;
    if (latestVitals.bloodPressure) {
      const [sys] = latestVitals.bloodPressure.split('/').map(Number);
      if (sys >= 180) list.push({ level: 'critical', message: `Hypertensive crisis: BP ${latestVitals.bloodPressure}` });
      else if (sys >= 140) list.push({ level: 'warning', message: `High BP: ${latestVitals.bloodPressure}` });
      else if (sys < 90) list.push({ level: 'warning', message: `Low BP: ${latestVitals.bloodPressure}` });
    }
    if (latestVitals.temperature !== undefined) {
      if (latestVitals.temperature >= 39.5) list.push({ level: 'critical', message: `High fever: ${latestVitals.temperature}°C` });
      else if (latestVitals.temperature >= 38) list.push({ level: 'warning', message: `Fever: ${latestVitals.temperature}°C` });
      else if (latestVitals.temperature < 35) list.push({ level: 'critical', message: `Hypothermia: ${latestVitals.temperature}°C` });
    }
    if (latestVitals.spo2 !== undefined) {
      if (latestVitals.spo2 < 90) list.push({ level: 'critical', message: `Critical SpO₂: ${latestVitals.spo2}%` });
      else if (latestVitals.spo2 < 94) list.push({ level: 'warning', message: `Low SpO₂: ${latestVitals.spo2}%` });
    }
    if (latestVitals.pulse !== undefined) {
      if (latestVitals.pulse > 130) list.push({ level: 'critical', message: `Severe tachycardia: ${latestVitals.pulse} bpm` });
      else if (latestVitals.pulse > 100) list.push({ level: 'warning', message: `Tachycardia: ${latestVitals.pulse} bpm` });
      else if (latestVitals.pulse < 50) list.push({ level: 'warning', message: `Bradycardia: ${latestVitals.pulse} bpm` });
    }
    if (isAntenatal && latestVitals.fetalHeartRate !== undefined) {
      if (latestVitals.fetalHeartRate < 110 || latestVitals.fetalHeartRate > 160) {
        list.push({ level: 'critical', message: `Abnormal FHR: ${latestVitals.fetalHeartRate} bpm` });
      }
    }
    return list;
  }, [latestVitals, isAntenatal]);

  const dosesDueNow = useMemo(
    () => doses.filter((d) => d.status === 'due' || d.status === 'scheduled'),
    [doses],
  );

  const todayTasks = useMemo(
    () => tasks.filter((t) => t.status !== 'completed'),
    [tasks],
  );

  // ── Loading / not-found ───────────────────────
  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-[var(--text-primary)]">Loading patient workspace…</p>
        </div>
      </div>
    );
  }

  if (!selectedAtt || !selectedPatient) {
    return (
      <div className="p-6">
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-12 text-center max-w-lg mx-auto">
          <AlertTriangle className="w-12 h-12 text-[var(--icon-red-text)] mx-auto mb-4" />
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Patient not found</h3>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            The attendance record could not be found.
          </p>
          <button
            onClick={() => navigate('/dashboard/nursing')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Nursing Station
          </button>
        </div>
      </div>
    );
  }

  const patientName = getPatientName(selectedPatient);
  const age = selectedPatient.dateOfBirth
    ? Math.floor((Date.now() - new Date(selectedPatient.dateOfBirth).getTime()) / (365.25 * 24 * 3600000))
    : null;
  const bedNumber = selectedAtt.Bed?.bedNumber || selectedAtt.bed?.bedNumber;
  const daysOnWard = activeAdmission
    ? Math.max(1, Math.floor((Date.now() - new Date(activeAdmission.admissionDate).getTime()) / 86400000))
    : null;

  const hasCritical = alerts.some((a) => a.level === 'critical');

  return (
    <div className="space-y-4 p-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard/nursing')}
            className="p-2 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-card)] transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
          <div className="w-11 h-11 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm">
            {patientName.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-[var(--text-primary)]">{patientName}</h1>
              <PatientTypeBadge attendance={selectedAtt} admission={activeAdmission} />
              <PaymentBadge mode={selectedAtt.paymentMode} />
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              #{selectedPatient.folderNumber}
              {bedNumber && ` · Bed ${bedNumber}`}
              {age != null && ` · ${age} yrs`}
              {selectedPatient.gender && ` · ${selectedPatient.gender}`}
              {daysOnWard && ` · ${daysOnWard}d on ward`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowMarPrint(true)}
            disabled={doses.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)] transition-colors disabled:opacity-50"
          >
            <Printer className="w-4 h-4" /> Print MAR
          </button>
          <button
            onClick={() => setShowVitalsModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-colors"
          >
            <Activity className="w-4 h-4" /> Record Vitals
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
        <div className="border-b border-[var(--border-color)] px-4 flex gap-1 bg-[var(--bg-main)] overflow-x-auto">
          {([
            { key: 'overview', label: 'Overview',  icon: Info },
            { key: 'mar',      label: 'MAR',       icon: ClipboardList },
            { key: 'tasks',    label: 'Tasks',     icon: ListTodo },
            { key: 'notes',    label: 'Notes',     icon: StickyNote },
            { key: 'vitals',   label: 'Vitals',    icon: Activity },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as TabKey)}
              className={`flex items-center gap-1.5 py-3 px-3 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
                activeTab === key
                  ? 'border-teal-500 text-teal-600'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* ── Tab content — min-h keeps the page full, no hang ── */}
        <div className="p-5 min-h-[calc(100vh-320px)]">
          {/* ══════════ OVERVIEW ══════════ */}
          {activeTab === 'overview' && (
            <div className="space-y-4">

              {/* ─── ALERTS BANNER (full width) ─── */}
              {alerts.length > 0 ? (
                <div className={`rounded-xl border p-4 ${
                  hasCritical
                    ? 'border-[var(--icon-red-text)] bg-[var(--icon-red-bg)]/40'
                    : 'border-[var(--icon-yellow-text)] bg-[var(--icon-yellow-bg)]/40'
                }`}>
                  <p className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 mb-2 ${
                    hasCritical ? 'text-[var(--icon-red-text)]' : 'text-[var(--icon-yellow-text)]'
                  }`}>
                    <AlertTriangle className="w-4 h-4" />
                    {alerts.length} clinical alert{alerts.length !== 1 ? 's' : ''}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1">
                    {alerts.map((a, i) => (
                      <p key={i} className={`text-xs flex items-start gap-1.5 ${
                        a.level === 'critical' ? 'text-[var(--icon-red-text)]' : 'text-[var(--icon-yellow-text)]'
                      }`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current mt-1.5 flex-shrink-0" />
                        {a.message}
                      </p>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[var(--icon-green-text)]" />
                  <p className="text-xs text-[var(--text-secondary)]">No clinical alerts</p>
                </div>
              )}

              {/* ─── ROW 2: Vitals (2/3) | Meds due (1/3) ─── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* Vitals — 2 columns */}
                <div className="lg:col-span-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden flex flex-col">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
                    <Heart className="w-4 h-4 text-[var(--icon-purple-text)]" />
                    <span className="text-xs font-semibold text-[var(--text-primary)]">Current Vitals</span>
                    {latestVitals?.recordedAt && (
                      <span className="ml-auto text-[10px] text-[var(--text-tertiary)]">
                        Last recorded {new Date(latestVitals.recordedAt).toLocaleString([], {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    )}
                  </div>

                  {!latestVitals ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
                      <Activity className="w-10 h-10 text-[var(--text-tertiary)] opacity-40 mb-2" />
                      <p className="text-sm text-[var(--text-secondary)] font-medium">No vitals recorded yet</p>
                      <button
                        onClick={() => setShowVitalsModal(true)}
                        className="mt-3 text-xs text-teal-600 hover:underline font-medium"
                      >
                        Record the first vitals
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
                        {latestVitals.bloodPressure && (
                          <VitalsRow
                            label="Blood Pressure"
                            value={latestVitals.bloodPressure}
                            unit="mmHg"
                            alert={(() => {
                              const [sys] = latestVitals.bloodPressure.split('/').map(Number);
                              return sys >= 140 || sys < 90;
                            })()}
                            icon={<Activity className="w-3.5 h-3.5 text-[var(--icon-red-text)]" />}
                          />
                        )}
                        {latestVitals.temperature !== undefined && (
                          <VitalsRow
                            label="Temperature"
                            value={String(latestVitals.temperature)}
                            unit="°C"
                            alert={latestVitals.temperature >= 38 || latestVitals.temperature < 35}
                            icon={<TrendingUp className="w-3.5 h-3.5 text-[var(--icon-orange-text)]" />}
                          />
                        )}
                        {latestVitals.pulse !== undefined && (
                          <VitalsRow
                            label="Pulse"
                            value={String(latestVitals.pulse)}
                            unit="bpm"
                            alert={latestVitals.pulse > 100 || latestVitals.pulse < 50}
                            icon={<Activity className="w-3.5 h-3.5 text-[var(--icon-green-text)]" />}
                          />
                        )}
                        {latestVitals.spo2 !== undefined && (
                          <VitalsRow
                            label="SpO₂"
                            value={String(latestVitals.spo2)}
                            unit="%"
                            alert={latestVitals.spo2 < 94}
                            icon={<Activity className="w-3.5 h-3.5 text-[var(--icon-blue-text)]" />}
                          />
                        )}
                        {latestVitals.respiration !== undefined && (
                          <VitalsRow
                            label="Respiratory Rate"
                            value={String(latestVitals.respiration)}
                            unit="/min"
                            icon={<Activity className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />}
                          />
                        )}
                        {latestVitals.weight !== undefined && (
                          <VitalsRow
                            label="Weight"
                            value={String(latestVitals.weight)}
                            unit="kg"
                            icon={<Activity className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />}
                          />
                        )}
                        {latestVitals.height !== undefined && (
                          <VitalsRow
                            label="Height"
                            value={String(latestVitals.height)}
                            unit="cm"
                            icon={<Activity className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />}
                          />
                        )}
                        {latestVitals.bmi !== undefined && (
                          <VitalsRow
                            label="BMI"
                            value={String(latestVitals.bmi)}
                            icon={<Activity className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />}
                          />
                        )}
                      </div>

                      <div className="flex items-center justify-between px-4 py-2.5 border-t border-[var(--border-color)] bg-[var(--bg-main)]">
                        <p className="text-[10px] text-[var(--text-tertiary)]">
                          Recorded by {latestVitals.User?.fullName || latestVitals.recordedBy?.fullName || '—'}
                        </p>
                        <button
                          onClick={() => setActiveTab('vitals')}
                          className="flex items-center gap-1 text-[11px] font-semibold text-teal-600 hover:underline"
                        >
                          View full history <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Meds due — 1 column */}
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden flex flex-col">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
                    <Pill className="w-4 h-4 text-teal-600" />
                    <span className="text-xs font-semibold text-[var(--text-primary)]">Medications Due</span>
                    {dosesDueNow.length > 0 && (
                      <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]">
                        {dosesDueNow.length}
                      </span>
                    )}
                  </div>

                  {dosesDueNow.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-10 text-center px-4">
                      <CheckCircle className="w-10 h-10 text-[var(--icon-green-text)] opacity-50 mb-2" />
                      <p className="text-sm text-[var(--text-secondary)] font-medium">All medications up to date</p>
                      <button
                        onClick={() => setActiveTab('mar')}
                        className="mt-3 text-xs text-teal-600 hover:underline font-medium"
                      >
                        View MAR
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-color)]">
                      {dosesDueNow.slice(0, 8).map((dose) => (
                        <div
                          key={dose.id}
                          className={`px-4 py-3 ${dose.status === 'due' ? 'bg-[var(--icon-yellow-bg)]/30' : ''}`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                                {dose.medication.name}
                              </p>
                              <p className="text-[10px] text-[var(--text-tertiary)]">
                                Dose {dose.doseNumber}
                                {dose.dose && ` · ${dose.dose}`}
                                {dose.route && ` · ${dose.route}`}
                              </p>
                              <p className="text-[10px] font-mono text-[var(--text-secondary)] mt-0.5">
                                {new Date(dose.scheduledAt).toLocaleTimeString([], {
                                  hour: '2-digit', minute: '2-digit',
                                })}
                              </p>
                            </div>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                              dose.status === 'due'
                                ? 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]'
                                : 'bg-[var(--bg-main)] text-[var(--text-secondary)]'
                            }`}>
                              {dose.status === 'due' ? 'DUE' : 'SCHED'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 mt-2">
                            <button
                              onClick={() => handleQuickGive(dose)}
                              disabled={busyDoseId === dose.id}
                              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-semibold bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] hover:bg-[var(--icon-green-text)] hover:text-white transition-all disabled:opacity-50"
                            >
                              {busyDoseId === dose.id ? (
                                <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Syringe className="w-3 h-3" />
                              )}
                              Give
                            </button>
                            <button
                              onClick={() => handleMarVariance(dose, 'refused')}
                              disabled={busyDoseId === dose.id}
                              className="px-2 py-1.5 rounded-lg text-[10px] font-semibold bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] hover:bg-[var(--icon-red-text)] hover:text-white transition-all disabled:opacity-50"
                              title="Patient refused"
                            >
                              Refuse
                            </button>
                          </div>
                        </div>
                      ))}

                      {dosesDueNow.length > 8 && (
                        <button
                          onClick={() => setActiveTab('mar')}
                          className="w-full px-4 py-2 text-[10px] font-semibold text-teal-600 hover:bg-[var(--bg-main)] transition-colors"
                        >
                          +{dosesDueNow.length - 8} more doses →
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ─── Consumables used during care ─── */}
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                    <span className="text-xs font-semibold text-[var(--text-primary)]">Consumables Used</span>
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]">
                      {consumableUses.length}
                    </span>
                  </div>
                  {canRecordConsumable && (
                    <button onClick={() => { setEditingConsumable(null); setShowConsumableModal(true); }}
                      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]">
                      <Plus className="w-3 h-3" /> Add Consumable
                    </button>
                  )}
                </div>
                <ConsumableUsesPanel uses={consumableUses}
                  onEdit={canRecordConsumable ? use => { setEditingConsumable(use); setShowConsumableModal(true); } : undefined}
                  onDelete={canRecordConsumable ? handleDeleteConsumable : undefined} />
              </div>

              {/* ─── ROW 3: Tasks (2/3) | Patient info (1/3) ─── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* Tasks — 2 columns */}
                <div className="lg:col-span-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden flex flex-col">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
                    <ListTodo className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                    <span className="text-xs font-semibold text-[var(--text-primary)]">Today's Tasks</span>
                    {todayTasks.length > 0 && (
                      <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]">
                        {todayTasks.length}
                      </span>
                    )}
                  </div>

                  {todayTasks.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
                      <CheckCircle className="w-10 h-10 text-[var(--icon-green-text)] opacity-50 mb-2" />
                      <p className="text-sm text-[var(--text-secondary)] font-medium">No pending tasks</p>
                      <button
                        onClick={() => setActiveTab('tasks')}
                        className="mt-3 text-xs text-teal-600 hover:underline font-medium"
                      >
                        Add a task
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-color)]">
                      {todayTasks.slice(0, 8).map((t) => (
                        <div key={t.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--bg-main)] transition-colors">
                          <input
                            type="checkbox"
                            checked={false}
                            onChange={() => handleCompleteTask(t.id)}
                            className="w-4 h-4 rounded border-[var(--border-color)] text-teal-600 focus:ring-teal-500 cursor-pointer flex-shrink-0"
                          />
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            t.priority === 'high' ? 'bg-red-500' :
                            t.priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-400'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-[var(--text-primary)] truncate">{t.title}</p>
                            {t.description && (
                              <p className="text-[10px] text-[var(--text-tertiary)] truncate">{t.description}</p>
                            )}
                          </div>
                          {t.scheduledAt && (
                            <span className="text-[10px] text-[var(--text-tertiary)] font-mono flex-shrink-0">
                              {new Date(t.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      ))}

                      {todayTasks.length > 8 && (
                        <button
                          onClick={() => setActiveTab('tasks')}
                          className="w-full px-4 py-2 text-[10px] font-semibold text-teal-600 hover:bg-[var(--bg-main)] transition-colors"
                        >
                          +{todayTasks.length - 8} more tasks →
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Patient info — 1 column */}
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
                    <User className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                    <span className="text-xs font-semibold text-[var(--text-primary)]">Patient Info</span>
                  </div>

                  <div className="p-4 space-y-3 text-xs">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-[var(--text-tertiary)] flex-shrink-0" />
                      <span className="text-[var(--text-secondary)]">
                        {selectedPatient.gender === 'male' ? 'Male' : selectedPatient.gender === 'female' ? 'Female' : '—'}
                        {age != null && ` · ${age} yrs`}
                      </span>
                    </div>

                    {selectedPatient.contact && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-[var(--text-tertiary)] flex-shrink-0" />
                        <span className="text-[var(--text-secondary)] truncate">{selectedPatient.contact}</span>
                      </div>
                    )}

                    {selectedPatient.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-[var(--text-tertiary)] flex-shrink-0 mt-0.5" />
                        <span className="text-[var(--text-secondary)] line-clamp-2">{selectedPatient.address}</span>
                      </div>
                    )}

                    {activeAdmission && (
                      <>
                        <div className="h-px bg-[var(--border-color)] my-1" />
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-[var(--text-tertiary)] flex-shrink-0" />
                          <div>
                            <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">Admitted</p>
                            <p className="text-[var(--text-primary)] font-medium">
                              {new Date(activeAdmission.admissionDate).toLocaleDateString([], {
                                month: 'short', day: 'numeric', year: 'numeric',
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Hospital className="w-3.5 h-3.5 text-[var(--text-tertiary)] flex-shrink-0" />
                          <div>
                            <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">Admission #</p>
                            <p className="text-[var(--text-primary)] font-medium font-mono">
                              {activeAdmission.admissionNumber}
                            </p>
                          </div>
                        </div>
                      </>
                    )}

                    {selectedPatient.insuranceDetails?.memberId && (
                      <>
                        <div className="h-px bg-[var(--border-color)] my-1" />
                        <div className="flex items-center gap-2">
                          <Shield className="w-3.5 h-3.5 text-[var(--text-tertiary)] flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">Insurance ID</p>
                            <p className="text-[var(--text-primary)] font-medium font-mono truncate">
                              {selectedPatient.insuranceDetails.memberId}
                            </p>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="h-px bg-[var(--border-color)] my-1" />
                    <button
                      onClick={() => navigate(`/dashboard/patients/${getEntityId(selectedPatient)}`)}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-teal-600 hover:bg-teal-50 transition-colors font-semibold"
                    >
                      View full patient record
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════ MAR ══════════ */}
          {activeTab === 'mar' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Medication Administration Record</h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {doses.length} scheduled dose{doses.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5 p-0.5 rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)]">
                    <button
                      onClick={() => setMarView('list')}
                      className={`p-1.5 rounded-md transition-all ${
                        marView === 'list' ? 'bg-[var(--bg-card)] text-teal-600 shadow-sm' : 'text-[var(--text-tertiary)]'
                      }`}
                      title="List view"
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setMarView('grid')}
                      className={`p-1.5 rounded-md transition-all ${
                        marView === 'grid' ? 'bg-[var(--bg-card)] text-teal-600 shadow-sm' : 'text-[var(--text-tertiary)]'
                      }`}
                      title="Grid view"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button
                    onClick={() => setShowMarPrint(true)}
                    disabled={doses.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-text)] hover:text-white transition-colors disabled:opacity-50"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print
                  </button>
                </div>
              </div>

              {dosesLoading ? (
                <div className="text-center py-10">
                  <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : marView === 'list' ? (
                <MarChart
                  doses={doses}
                  onAdminister={handleMarAdminister}
                  onVariance={handleMarVariance}
                  busyId={busyDoseId}
                />
              ) : (
                <MarGrid doses={doses} />
              )}
            </div>
          )}

          {/* ══════════ TASKS ══════════ */}
          {activeTab === 'tasks' && (
            <NursingTaskList
              tasks={tasks as any}
              patientId={getEntityId(selectedPatient)}
              attendanceId={attendanceId || ''}
              admissionId={activeAdmission?.id}
              onTaskComplete={handleCompleteTask}
              onAddTask={handleAddTask}
            />
          )}

          {/* ══════════ NOTES ══════════ */}
          {activeTab === 'notes' && (
            <NursingNotesPanel
              patientId={getEntityId(selectedPatient)}
              attendanceId={attendanceId}
              admissionId={activeAdmission?.id ?? null}
              currentUserId={user?.id}
              currentRole={user?.role}
            />
          )}

          {/* ══════════ VITALS ══════════ */}
          {activeTab === 'vitals' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Vitals History</h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {vitalsList.length} recording{vitalsList.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  onClick={() => setShowVitalsModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Record Vitals
                </button>
              </div>

              {vitalsList.length === 0 ? (
                <div className="text-center py-12 bg-[var(--bg-main)] rounded-xl border border-dashed border-[var(--border-color)]">
                  <Activity className="w-10 h-10 text-[var(--text-tertiary)] opacity-40 mx-auto mb-2" />
                  <p className="text-sm text-[var(--text-secondary)] font-medium">No vitals recorded</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[var(--border-color)]">
                  <table className="w-full text-xs">
                    <thead className="bg-[var(--bg-main)]">
                      <tr className="border-b border-[var(--border-color)]">
                        {['Date', 'BP', 'Temp', 'Pulse', 'RR', 'SpO₂', 'Weight', 'By'].map((h) => (
                          <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold text-[var(--text-secondary)] uppercase whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)]">
                      {[...vitalsList].reverse().map((v, i) => (
                        <tr key={v.id || i} className="hover:bg-[var(--bg-main)]">
                          <td className="px-3 py-2 text-[var(--text-secondary)] whitespace-nowrap">
                            {new Date(v.recordedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-3 py-2 font-mono">{v.bloodPressure || '—'}</td>
                          <td className="px-3 py-2 font-mono">{v.temperature != null ? `${v.temperature}°C` : '—'}</td>
                          <td className="px-3 py-2 font-mono">{v.pulse != null ? v.pulse : '—'}</td>
                          <td className="px-3 py-2 font-mono">{v.respiration || '—'}</td>
                          <td className="px-3 py-2 font-mono">{v.spo2 != null ? `${v.spo2}%` : '—'}</td>
                          <td className="px-3 py-2 font-mono">{v.weight != null ? `${v.weight}kg` : '—'}</td>
                          <td className="px-3 py-2 text-[var(--text-tertiary)]">{v.recordedBy?.fullName || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      <VitalsFormModal
        isOpen={showVitalsModal}
        onClose={() => setShowVitalsModal(false)}
        onSubmit={handleSubmitVitals}
        isLoading={false}
        isAntenatal={isAntenatal}
        attendanceId={attendanceId || null}
        attendanceType={selectedAtt?.attendanceType}
      />

      {attendanceId && (
        <ConsumableModal
          isOpen={showConsumableModal}
          onClose={() => { setShowConsumableModal(false); setEditingConsumable(null); }}
          onSuccess={afterConsumableChange}
          encounterId={attendanceId}
          stockItems={stockItems}
          canAdd={canRecordConsumable}
          existingUse={editingConsumable}
        />
      )}

      {showMarPrint && (
        <MarPrintModal
          isOpen={showMarPrint}
          onClose={() => setShowMarPrint(false)}
          doses={doses}
          patientName={patientName}
          patientFolder={selectedPatient.folderNumber || '—'}
          dateFrom={new Date(doses[0]?.scheduledAt || Date.now()).toLocaleDateString()}
          dateTo={new Date(doses[doses.length - 1]?.scheduledAt || Date.now()).toLocaleDateString()}
        />
      )}
    </div>
  );
}