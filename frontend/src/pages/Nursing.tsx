// src/pages/Nursing.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAttendanceStore } from '../store/attendanceStore';
import { usePatientStore } from '../store/patientStore';
import { useAuthStore } from '../store/authStore';
import { useAdmissionStore } from '../store/admissionStore';
import { useWardStore } from '../store/wardStore';
import { useStockStore } from '../store/stockStore';
import { useToast } from '../store/toastStore';
import { useHospitalStore } from '../store/hospitalStore';
import { VitalsFormModal } from '../components/vitals/VitalsFormModal';
import { PatientSummarySidebar } from '../components/nursing/PatientSummarySidebar';
import { ShiftHandoverModal } from '../components/nursing/ShiftHandoverModal';
import { NursingTaskList } from '../components/nursing/NursingTaskList';
import { NursingDashboardStats } from '../components/nursing/NursingDashboardStats';
import { getPatientName } from '../utils/patient';
import { getFrequencyInfo, isDoseDue } from '../utils/frequencyUtils';
import type { NursingTask } from '../components/nursing/NursingTaskList';
import {
  ChevronLeft, RefreshCw, Pill, Users, Hospital, Bed,
  Search, Plus, Clock, CheckCircle, AlertCircle, Syringe,
  FileText, Activity, User, Calendar, Heart,
  ClipboardList, Send, X, Printer, Eye, Trash2,
  AlertTriangle, Baby, Building2, History,
  ListTodo, Moon, Sun, ChevronRight, Play
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────

const getEntityId = (entity: { id?: string; _id?: string } | null | undefined): string =>
  entity?.id || entity?._id || '';

// ── Patient type badge ────────────────────────────────────────────────────────

const PatientTypeBadge: React.FC<{ attendance: any; admission: any }> = ({ attendance, admission }) => {
  const admType = admission?.admissionType || attendance?.admissionType;
  const cat     = attendance?.encounterCategory;

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
  if (admType === 'antenatal_observation') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-pink-100 text-pink-700 border border-pink-200">
      <Baby className="w-2.5 h-2.5" /> ANC Obs
    </span>
  );
  if (admType === 'delivery') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700 border border-green-200">
      <Hospital className="w-2.5 h-2.5" /> In Labour
    </span>
  );
  if (admType === 'postpartum_observation') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-100 text-cyan-700 border border-cyan-200">
      <Heart className="w-2.5 h-2.5" /> Postpartum
    </span>
  );
  if (cat === 'ipd') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700 border border-blue-200">
      <Hospital className="w-2.5 h-2.5" /> IPD
    </span>
  );
  return null;
};

// ── Medication card ───────────────────────────────────────────────────────────

const MedicationCard: React.FC<{
  medication: any;
  onAdminister: (medicationId: string, doseNumber: number) => void;
  onMissed: (medicationId: string, doseNumber: number) => void;
  isAdministering: boolean;
}> = ({ medication, onAdminister, onMissed, isAdministering }) => {
  const [expanded, setExpanded] = useState(false);
  const freq = getFrequencyInfo(medication.frequency);
  const doses = medication.administeredDoses || [];
  const doneCount = doses.length;
  const isComplete = doneCount >= freq.requiredDoses;
  const due = !isComplete && isDoseDue(medication);
  const nextDoseNum = doneCount + 1;

  const statusCls = isComplete
    ? 'bg-green-50 border-green-200'
    : due
    ? 'bg-yellow-50 border-yellow-200'
    : 'bg-[var(--bg-card)] border-[var(--border-color)]';

  const statusText = isComplete
    ? 'All doses given'
    : due
    ? `Dose ${nextDoseNum}/${freq.requiredDoses} due now`
    : (() => {
        const last = doses[doses.length - 1];
        if (last) {
          const hrs = Math.ceil(freq.intervalHours - (Date.now() - new Date(last.administeredAt).getTime()) / 3600000);
          return `Next dose in ~${hrs}h`;
        }
        return 'Pending';
      })();

  return (
    <div className={`rounded-xl border transition-all ${expanded ? 'border-teal-300 shadow-sm' : statusCls}`}>
      {/* Summary row */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          {/* Drug info — clickable to expand */}
          <div className="flex-1 cursor-pointer min-w-0" onClick={() => setExpanded(e => !e)}>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-sm font-semibold text-[var(--text-primary)]">{medication.name}</span>
              <span className="text-xs text-[var(--text-secondary)]">{medication.dosage}</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                isComplete ? 'bg-green-100 text-green-700' :
                due        ? 'bg-yellow-100 text-yellow-800' :
                'bg-blue-100 text-blue-700'
              }`}>
                {statusText}
              </span>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-[var(--text-secondary)]">
              <span>Route: <b>{medication.route || 'Oral'}</b></span>
              <span>Freq: <b>{freq.type}</b></span>
              {medication.duration && <span>Duration: <b>{medication.duration}</b></span>}
              <span>Progress: <b>{doneCount}/{freq.requiredDoses}</b></span>
            </div>
            {medication.instructions && (
              <p className="text-[11px] text-[var(--icon-cyan-text)] mt-1 italic">{medication.instructions}</p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {!isComplete && due && (
              <>
                <button
                  onClick={() => {
                    if (window.confirm(`Mark dose ${nextDoseNum} as missed for ${medication.name}?`)) {
                      onMissed(medication.id, nextDoseNum);
                    }
                  }}
                  disabled={isAdministering}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors disabled:opacity-50"
                >
                  Missed
                </button>
                <button
                  onClick={() => onAdminister(medication.id, nextDoseNum)}
                  disabled={isAdministering}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {isAdministering
                    ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Syringe className="w-3.5 h-3.5" />}
                  Give Dose {nextDoseNum}
                </button>
              </>
            )}
            {!isComplete && !due && (
              <span className="text-xs text-[var(--text-tertiary)] px-3 py-1.5 bg-[var(--bg-main)] rounded-lg border border-[var(--border-color)]">
                Wait for next dose
              </span>
            )}
            {isComplete && (
              <span className="flex items-center gap-1 text-xs text-green-700 font-semibold px-3 py-1.5 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle className="w-3.5 h-3.5" /> Complete
              </span>
            )}
            <button
              onClick={() => setExpanded(e => !e)}
              className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-bg)] transition-colors"
              title="View administration log"
            >
              <History className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded: administration log */}
      {expanded && (
        <div className="border-t border-[var(--border-color)] p-4 bg-[var(--bg-main)] rounded-b-xl">
          <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5" /> Administration Log
          </p>
          {doses.length === 0 ? (
            <p className="text-xs text-[var(--text-tertiary)] text-center py-4">No doses given yet</p>
          ) : (
            <div className="space-y-2">
              {doses.map((d: any, i: number) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)]">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[var(--text-primary)]">
                        Dose {d.doseNumber} of {freq.requiredDoses}
                      </p>
                      <p className="text-[10px] text-[var(--text-tertiary)]">
                        {new Date(d.administeredAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] text-[var(--text-secondary)]">by {d.administeredBy}</span>
                </div>
              ))}
            </div>
          )}

          {/* Upcoming doses */}
          {!isComplete && (
            <div className="mt-3 pt-3 border-t border-dashed border-[var(--border-color)]">
              <p className="text-[10px] text-[var(--text-tertiary)] mb-2 font-semibold uppercase">Upcoming</p>
              {Array.from({ length: freq.requiredDoses - doneCount }, (_, i) => {
                const num = doneCount + i + 1;
                const isCurrent = i === 0 && due;
                return (
                  <div key={num} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg mb-1 ${isCurrent ? 'bg-yellow-50' : 'opacity-60'}`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${isCurrent ? 'bg-yellow-100' : 'bg-[var(--bg-main)]'}`}>
                      {isCurrent ? <Play className="w-2.5 h-2.5 text-yellow-600" /> : <Clock className="w-2.5 h-2.5 text-[var(--text-tertiary)]" />}
                    </div>
                    <p className={`text-xs ${isCurrent ? 'font-semibold text-yellow-800' : 'text-[var(--text-secondary)]'}`}>
                      Dose {num}/{freq.requiredDoses} {isCurrent ? '— Due Now' : '— Pending'}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// Main Page
// ═════════════════════════════════════════════════════════════════════════════

export default function Nursing() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const { user } = useAuthStore();
  const { hospital } = useHospitalStore();

  // ── State ──────────────────────────────────────────────────────────────────
  const [isLoading,           setIsLoading]           = useState(true);
  const [refreshing,          setRefreshing]           = useState(false);
  const [searchQuery,         setSearchQuery]          = useState('');
  const [selectedAttId,       setSelectedAttId]        = useState('');
  const [activeTab,           setActiveTab]            = useState<'medications' | 'tasks' | 'vitals'>('medications');
  const [administeringId,     setAdministeringId]      = useState<string | null>(null);
  const [showVitalsModal,     setShowVitalsModal]      = useState(false);
  const [showHandoverModal,   setShowHandoverModal]    = useState(false);
  const [vitalsList,          setVitalsList]           = useState<any[]>([]);
  const [latestVitals,        setLatestVitals]         = useState<any>(null);

  // Local medication + task state per attendance
  const [localMeds,  setLocalMeds]  = useState<Record<string, any[]>>({});
  const [localTasks, setLocalTasks] = useState<Record<string, NursingTask[]>>({});

  // ── Stores ─────────────────────────────────────────────────────────────────
  const { attendances, getAttendances, updateMedicationStatus, getVitalsByAttendance, addVitals, getAttendance } = useAttendanceStore();
  const { patients, loadPatients } = usePatientStore();
  const { admissions, getAdmissions, addDailyNote } = useAdmissionStore();
  const { stockItems, getStockItems } = useStockStore();
  const { wards, getWards, beds, getBeds } = useWardStore();

  // ── Derived: inpatient attendances ─────────────────────────────────────────
  const inpatients = useMemo(() =>
    attendances.filter(a =>
      a.status === 'admitted' &&
      (a.encounterCategory === 'ipd' || a.encounterCategory === 'daycase')
    ),
    [attendances]
  );

  const filteredInpatients = useMemo(() => {
    if (!searchQuery.trim()) return inpatients;
    const q = searchQuery.toLowerCase();
    return inpatients.filter(a => {
      const p = patients.find(pt => getEntityId(pt) === a.patientId);
      const name = p ? getPatientName(p).toLowerCase() : '';
      return (
        name.includes(q) ||
        (a.attendanceNumber || '').toLowerCase().includes(q) ||
        (p?.folderNumber || '').toLowerCase().includes(q)
      );
    });
  }, [inpatients, patients, searchQuery]);

  // ── Selected patient context ───────────────────────────────────────────────
  const selectedAtt     = useMemo(() => attendances.find(a => getEntityId(a) === selectedAttId), [attendances, selectedAttId]);
  const selectedPatient = useMemo(() => patients.find(p => getEntityId(p) === selectedAtt?.patientId), [patients, selectedAtt]);
  // NOTE: admissionType lives on the Admission record, NOT on Attendance in the schema
  const activeAdmission = useMemo(() => admissions.find(a => a.attendanceId === selectedAttId && !a.dischargeDate), [admissions, selectedAttId]);
  const isAntenatal     = selectedAtt?.attendanceType === 'antenatal';

  const meds        = localMeds[selectedAttId]  || [];
  const tasks       = localTasks[selectedAttId] || [];
  // Only show dispensed or administered meds (not prescribed — pharmacy handles that)
  const administrableMeds = meds.filter(m => m.status === 'dispensed' || m.status === 'administered');

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadPatients(),
        getAttendances(),
        getStockItems(),
        getAdmissions(),
        getWards(),
        getBeds(),
      ]);
    } catch (err: any) {
      toastError('Load failed', err.message);
    } finally {
      setRefreshing(false);
      setIsLoading(false);
    }
  }, [loadPatients, getAttendances, getStockItems, getAdmissions, getWards, getBeds, toastError]);

  useEffect(() => { loadData(); }, []);

  // Seed local meds from attendance data when store updates
  useEffect(() => {
    inpatients.forEach(a => {
      if (a.Medication && !localMeds[a.id]) {
        setLocalMeds(prev => ({ ...prev, [a.id]: a.Medication }));
      }
    });
  }, [inpatients]);

  // Load vitals when attendance changes
  useEffect(() => {
    if (!selectedAttId) { setVitalsList([]); setLatestVitals(null); return; }
    getVitalsByAttendance(selectedAttId)
      .then((v: any[]) => {
        const sorted = [...(v || [])].sort((a, b) =>
          new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
        );
        setVitalsList(sorted);
        setLatestVitals(sorted.length ? sorted[sorted.length - 1] : null);
      })
      .catch(() => { setVitalsList([]); setLatestVitals(null); });
  }, [selectedAttId]);

  // ── Select a patient ───────────────────────────────────────────────────────
  const handleSelectPatient = (attId: string) => {
    setSelectedAttId(attId);
    setActiveTab('medications');
    const att = attendances.find(a => getEntityId(a) === attId);
    if (att?.Medication && !localMeds[attId]) {
      setLocalMeds(prev => ({ ...prev, [attId]: att.Medication }));
    }
  };

  // ── Administer medication ──────────────────────────────────────────────────
  const handleAdminister = async (medicationId: string, doseNumber: number) => {
    if (!selectedAttId || !user) return;
    setAdministeringId(medicationId);
    try {
      const med = meds.find(m => m.id === medicationId);
      if (!med) return;

      const freq       = getFrequencyInfo(med.frequency);
      const prevDoses  = med.administeredDoses || [];
      const newDoses   = [
        ...prevDoses,
        { doseNumber, administeredAt: new Date().toISOString(), administeredBy: user.fullName || user.username },
      ];
      const isComplete = newDoses.length >= freq.requiredDoses;
      const newStatus  = isComplete ? 'administered' : 'dispensed';

      // Optimistic UI update
      setLocalMeds(prev => ({
        ...prev,
        [selectedAttId]: (prev[selectedAttId] || []).map(m =>
          m.id === medicationId ? { ...m, administeredDoses: newDoses, status: newStatus } : m
        ),
      }));

      success(`${med.name}`, `Dose ${doseNumber} recorded`);

      // Background sync — don't block the nurse
      updateMedicationStatus(selectedAttId, medicationId, {
        status: newStatus,
        administeredAt: new Date().toISOString(),
        administeredById: user.id,
        doseNumber,
        administeredDoses: newDoses,
      }).catch(err => {
        console.error('Background medication sync failed:', err);
        toastError('Sync warning', 'Dose recorded locally but failed to sync. Refresh to retry.');
      });

    } catch (err: any) {
      toastError('Failed', err.message);
    } finally {
      setAdministeringId(null);
    }
  };

  // ── Missed dose ────────────────────────────────────────────────────────────
  const handleMissed = (medicationId: string, doseNumber: number) => {
    const med = meds.find(m => m.id === medicationId);
    if (!med) return;
    const missed = [...(med.missedDoses || []), {
      doseNumber,
      missedAt: new Date().toISOString(),
      missedBy: user?.fullName || user?.username,
      reason: 'Not administered this shift',
    }];
    setLocalMeds(prev => ({
      ...prev,
      [selectedAttId]: (prev[selectedAttId] || []).map(m =>
        m.id === medicationId ? { ...m, missedDoses: missed } : m
      ),
    }));
    success('Recorded', `Dose ${doseNumber} of ${med.name} marked as missed`);
  };

  // ── Record vitals ──────────────────────────────────────────────────────────
  const handleSubmitVitals = async (data: any) => {
    if (!selectedAttId) return;
    try {
      await addVitals(selectedAttId, { ...data, recordedAt: new Date().toISOString(), recordedById: user?.id });
      success('Vitals saved', 'Recorded successfully');
      const updated = await getVitalsByAttendance(selectedAttId);
      const sorted  = [...(updated || [])].sort((a, b) =>
        new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
      );
      setVitalsList(sorted);
      setLatestVitals(sorted.length ? sorted[sorted.length - 1] : null);
      setShowVitalsModal(false);
    } catch (err: any) {
      toastError('Save failed', err.message);
    }
  };

  // ── Task management (local-first, saved to dailyNotes on handover) ─────────
  const handleAddTask = (task: Omit<NursingTask, 'id'>) => {
    const newTask: NursingTask = {
      ...task,
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date(),
    };
    setLocalTasks(prev => ({
      ...prev,
      [selectedAttId]: [...(prev[selectedAttId] || []), newTask],
    }));
    success('Task added', newTask.title);
  };

  const handleCompleteTask = (taskId: string) => {
    setLocalTasks(prev => ({
      ...prev,
      [selectedAttId]: (prev[selectedAttId] || []).map(t =>
        t.id === taskId ? { ...t, status: 'completed', completedAt: new Date() } : t
      ),
    }));
    success('Task done', 'Marked as completed');
  };

  // ── Shift handover ─────────────────────────────────────────────────────────
  const handleHandoverComplete = async (data: any) => {
    // Save handover notes as a daily note on each patient's admission
    const notesText = [
      `[SHIFT HANDOVER — ${data.currentShift} → ${data.nextShift}]`,
      `By: ${data.handedOverBy}`,
      data.notes ? `Notes: ${data.notes}` : '',
      `Tasks completed this shift: ${Object.values(data.completedTasks).filter(Boolean).length}`,
    ].filter(Boolean).join('\n');

    const promises = admissions
      .filter(a => !a.dischargeDate)
      .map(a => addDailyNote(a.id, { notes: notesText, noteType: 'handover' }).catch(() => {}));

    await Promise.allSettled(promises);
    success('Handover saved', 'Shift handover recorded for all patients');
    setShowHandoverModal(false);
  };

  // ── Dashboard stats ────────────────────────────────────────────────────────
  const dashboardStats = useMemo(() => {
    // Count meds due across all patients
    let medsDue = 0;
    inpatients.forEach(a => {
      const meds = localMeds[a.id] || a.Medication || [];
      meds.forEach((m: any) => {
        if (m.status === 'dispensed' && isDoseDue(m)) medsDue++;
      });
    });

    // Critical alerts from selected patient's latest vitals
    let criticalAlerts = 0;
    if (latestVitals) {
      if (latestVitals.bloodPressure) {
        const [s] = latestVitals.bloodPressure.split('/').map(Number);
        if (s >= 180 || s < 90) criticalAlerts++;
      }
      if (latestVitals.temperature && (latestVitals.temperature >= 39.5 || latestVitals.temperature < 35)) criticalAlerts++;
      if (latestVitals.spo2 && latestVitals.spo2 < 90) criticalAlerts++;
      if (latestVitals.pulse && (latestVitals.pulse > 130 || latestVitals.pulse < 50)) criticalAlerts++;
    }

    return {
      admittedCount:    inpatients.length,
      ipdCount:         inpatients.filter(a => a.encounterCategory === 'ipd' && a.admissionType !== 'detention_observation').length,
      detentionCount:   inpatients.filter(a => a.admissionType === 'detention_observation').length,
      daySurgeryCount:  inpatients.filter(a => a.encounterCategory === 'daycase').length,
      pendingDischarges: admissions.filter(a => !a.dischargeDate && a.status === 'admitted').length,
      medicationsDueToday: medsDue,
      criticalAlerts,
    };
  }, [inpatients, admissions, localMeds, latestVitals]);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm font-semibold text-[var(--text-primary)]">Loading Nursing Station…</p>
        <p className="text-xs text-[var(--text-secondary)] mt-1">Fetching admitted patients and ward data</p>
      </div>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 p-5">

      {/* ── PAGE HEADER ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-card)] transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
          <div className="w-9 h-9 bg-teal-100 rounded-xl flex items-center justify-center">
            <Users className="w-4.5 h-4.5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[var(--text-primary)]">Nursing Station</h1>
            <p className="text-xs text-[var(--text-secondary)]">
              {dashboardStats.admittedCount} patients · {dashboardStats.ipdCount} IPD · {dashboardStats.detentionCount} Observation · {dashboardStats.daySurgeryCount} Day Surgery
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => navigate('/dashboard/wards')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)] hover:bg-[var(--icon-blue-text)] hover:text-white transition-colors"
          >
            <Building2 className="w-4 h-4" /> Wards
          </button>
          <button
            onClick={() => navigate('/dashboard/admissions')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)] transition-colors"
          >
            <Hospital className="w-4 h-4" /> Admissions
          </button>
          <button
            onClick={() => setShowHandoverModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-orange-600 text-white hover:bg-orange-700 transition-colors"
          >
            <Send className="w-4 h-4" /> Shift Handover
          </button>
          <button
            onClick={loadData}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── DASHBOARD STATS ─────────────────────────────────────────────────── */}
      <NursingDashboardStats stats={dashboardStats} />

      {/* ── TWO COLUMN LAYOUT ───────────────────────────────────────────────── */}
      <div className="flex gap-5" style={{ minHeight: 'calc(100vh - 320px)' }}>

        {/* ── LEFT: Patient list ─────────────────────────────────────────────── */}
        <div className="w-72 flex-shrink-0 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden flex flex-col shadow-sm">
          {/* Search */}
          <div className="p-3 border-b border-[var(--border-color)]">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)]" />
              <input
                type="text"
                placeholder="Search patients…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-color)]">
            {filteredInpatients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <Hospital className="w-10 h-10 text-[var(--text-tertiary)] opacity-40 mb-2" />
                <p className="text-sm text-[var(--text-secondary)] font-medium">No admitted patients</p>
                <p className="text-xs text-[var(--text-tertiary)] mt-1">
                  {searchQuery ? 'Try a different search term' : 'Patients admitted from OPD or Emergency will appear here'}
                </p>
              </div>
            ) : (
              filteredInpatients.map(att => {
                const patient   = patients.find(p => getEntityId(p) === att.patientId);
                const admission = admissions.find(a => a.attendanceId === getEntityId(att) && !a.dischargeDate);
                const isSelected = getEntityId(att) === selectedAttId;
                const attMeds   = localMeds[att.id] || att.Medication || [];
                const medsDue   = attMeds.filter((m: any) => m.status === 'dispensed' && isDoseDue(m)).length;
                const pendingTaskCount = (localTasks[att.id] || []).filter(t => t.status !== 'completed').length;
                const patName   = getPatientName(patient);

                return (
                  <div
                    key={att.id}
                    onClick={() => handleSelectPatient(att.id!)}
                    className={`p-3 cursor-pointer transition-all hover:bg-[var(--bg-main)] ${
                      isSelected ? 'bg-teal-50 border-l-4 border-teal-500' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <User className="w-4 h-4 text-teal-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{patName}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-[var(--text-secondary)]">
                          <span>{patient?.folderNumber || '—'}</span>
                          {(att.Bed?.bedNumber || att.bed?.bedNumber) && (
                            <>
                              <span>·</span>
                              <Bed className="w-2.5 h-2.5" />
                              <span>{att.Bed?.bedNumber || att.bed?.bedNumber}</span>
                            </>
                          )}
                        </div>
                        <div className="mt-1">
                          <PatientTypeBadge attendance={att} admission={admission} />
                        </div>
                      </div>
                      {/* Badges */}
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        {medsDue > 0 && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200">
                            {medsDue} med{medsDue > 1 ? 's' : ''}
                          </span>
                        )}
                        {pendingTaskCount > 0 && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] border border-[var(--icon-cyan-bg)]">
                            {pendingTaskCount} task{pendingTaskCount > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── RIGHT: Patient detail ──────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-4">
          {!selectedAtt || !selectedPatient ? (
            <div className="flex flex-col items-center justify-center h-full bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-12 text-center shadow-sm">
              <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mb-4">
                <Hospital className="w-8 h-8 text-teal-300" />
              </div>
              <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">Select a patient</h3>
              <p className="text-sm text-[var(--text-secondary)]">Choose an admitted patient from the list to manage their care</p>
            </div>
          ) : (
            <>
              {/* Patient header card */}
              <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-4 shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-teal-600" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-[var(--text-primary)]">
                        {getPatientName(selectedPatient)}
                      </h2>
                      <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mt-0.5 flex-wrap">
                        <span>{selectedPatient.gender}</span>
                        {selectedPatient.dateOfBirth && (
                          <span>
                            · {Math.floor((Date.now() - new Date(selectedPatient.dateOfBirth).getTime()) / (365.25 * 24 * 3600000))} yrs
                          </span>
                        )}
                        <span>· ID: {selectedPatient.folderNumber}</span>
                        <span>· Admitted: {new Date(selectedAtt.dateTime || selectedAtt.createdAt).toLocaleDateString()}</span>
                        {activeAdmission && (
                          <span className="font-mono text-[var(--text-tertiary)]">#{activeAdmission.admissionNumber}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <PatientTypeBadge attendance={selectedAtt} admission={activeAdmission} />
                    <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${
                      selectedAtt.paymentMode === 'nhis' ? 'bg-green-100 text-green-700' :
                      selectedAtt.paymentMode === 'private_insurance' ? 'bg-purple-100 text-purple-700' :
                      'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]'
                    }`}>
                      {selectedAtt.paymentMode === 'nhis' ? 'NHIS' :
                       selectedAtt.paymentMode === 'private_insurance' ? 'Private Ins.' : 'CASH'}
                    </span>
                    <button
                      onClick={() => setShowVitalsModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-colors"
                    >
                      <Activity className="w-3.5 h-3.5" /> Record Vitals
                    </button>
                  </div>
                </div>
              </div>

              {/* Patient summary sidebar (inline) */}
              <PatientSummarySidebar
                patient={selectedPatient}
                attendance={selectedAtt}
                admission={activeAdmission}
                latestVitals={latestVitals}
                vitalsHistory={vitalsList}
                medications={administrableMeds}
                tasks={tasks}
                isAntenatal={isAntenatal}
              />

              {/* Tabbed content */}
              <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden shadow-sm">
                {/* Tab bar */}
                <div className="border-b border-[var(--border-color)] px-4 flex gap-1 bg-[var(--bg-main)]">
                  {([
                    { key: 'medications', label: `Medications (${administrableMeds.length})`, Icon: Pill },
                    { key: 'tasks',       label: `Care Tasks (${tasks.filter(t => t.status !== 'completed').length})`, Icon: ListTodo },
                    { key: 'vitals',      label: `Vitals (${vitalsList.length})`, Icon: Activity },
                  ] as const).map(({ key, label, Icon }) => (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key)}
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

                {/* Tab content */}
                <div className="p-5 max-h-[500px] overflow-y-auto">

                  {/* ── Medications tab ──────────────────────────────────────── */}
                  {activeTab === 'medications' && (
                    <div className="space-y-3">
                      {administrableMeds.length === 0 ? (
                        <div className="text-center py-12 bg-[var(--bg-main)] rounded-xl border border-dashed border-[var(--border-color)]">
                          <Pill className="w-10 h-10 text-[var(--text-tertiary)] opacity-40 mx-auto mb-2" />
                          <p className="text-sm text-[var(--text-secondary)] font-medium">No medications ready for administration</p>
                          <p className="text-xs text-[var(--text-tertiary)] mt-1">
                            Medications appear here after the pharmacist dispenses them
                          </p>
                        </div>
                      ) : (
                        administrableMeds.map(med => (
                          <MedicationCard
                            key={med.id}
                            medication={med}
                            onAdminister={handleAdminister}
                            onMissed={handleMissed}
                            isAdministering={administeringId === med.id}
                          />
                        ))
                      )}
                    </div>
                  )}

                  {/* ── Tasks tab ────────────────────────────────────────────── */}
                  {activeTab === 'tasks' && (
                    <NursingTaskList
                      tasks={tasks}
                      patientId={getEntityId(selectedPatient)}
                      attendanceId={selectedAttId}
                      admissionId={activeAdmission?.id}
                      onTaskComplete={handleCompleteTask}
                      onAddTask={handleAddTask}
                    />
                  )}

                  {/* ── Vitals tab ───────────────────────────────────────────── */}
                  {activeTab === 'vitals' && (
                    <div className="space-y-4">
                      <div className="flex justify-end">
                        <button
                          onClick={() => setShowVitalsModal(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" /> Record New Vitals
                        </button>
                      </div>
                      {vitalsList.length === 0 ? (
                        <div className="text-center py-12 bg-[var(--bg-main)] rounded-xl border border-dashed border-[var(--border-color)]">
                          <Activity className="w-10 h-10 text-[var(--text-tertiary)] opacity-40 mx-auto mb-2" />
                          <p className="text-sm text-[var(--text-secondary)] font-medium">No vitals recorded</p>
                          <button onClick={() => setShowVitalsModal(true)} className="mt-2 text-xs text-teal-600 hover:text-teal-700 font-medium">
                            Record first vitals
                          </button>
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-[var(--border-color)]">
                          <table className="w-full text-xs">
                            <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                              <tr>
                                {['Date / Time', 'BP', 'Temp', 'Pulse', 'RR', 'SpO₂', 'Weight',
                                  ...(isAntenatal ? ['FHR', 'Fundal Ht.'] : []),
                                  'Recorded by'].map(h => (
                                  <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap">
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-color)]">
                              {[...vitalsList].reverse().map((v, i) => {
                                const bpHigh = v.bloodPressure && (() => { const [s] = v.bloodPressure.split('/').map(Number); return s >= 140 || s < 90; })();
                                return (
                                  <tr key={v.id || i} className="hover:bg-[var(--bg-main)] transition-colors">
                                    <td className="px-3 py-2.5 text-[var(--text-secondary)] whitespace-nowrap">
                                      {new Date(v.recordedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td className={`px-3 py-2.5 font-mono font-semibold ${bpHigh ? 'text-red-600' : 'text-[var(--text-primary)]'}`}>
                                      {v.bloodPressure || '—'}
                                    </td>
                                    <td className={`px-3 py-2.5 font-mono ${v.temperature >= 38 ? 'text-orange-600 font-semibold' : 'text-[var(--text-primary)]'}`}>
                                      {v.temperature != null ? `${v.temperature}°C` : '—'}
                                    </td>
                                    <td className={`px-3 py-2.5 font-mono ${v.pulse > 100 || v.pulse < 50 ? 'text-orange-600 font-semibold' : 'text-[var(--text-primary)]'}`}>
                                      {v.pulse != null ? `${v.pulse}` : '—'}
                                    </td>
                                    <td className="px-3 py-2.5 font-mono text-[var(--text-primary)]">{v.respiration || '—'}</td>
                                    <td className={`px-3 py-2.5 font-mono ${v.spo2 < 94 ? 'text-red-600 font-semibold' : 'text-[var(--text-primary)]'}`}>
                                      {v.spo2 != null ? `${v.spo2}%` : '—'}
                                    </td>
                                    <td className="px-3 py-2.5 font-mono text-[var(--text-primary)]">
                                      {v.weight != null ? `${v.weight} kg` : '—'}
                                    </td>
                                    {isAntenatal && (
                                      <>
                                        <td className={`px-3 py-2.5 font-mono ${v.fetalHeartRate && (v.fetalHeartRate < 110 || v.fetalHeartRate > 160) ? 'text-red-600 font-semibold' : 'text-[var(--text-primary)]'}`}>
                                          {v.fetalHeartRate || '—'}
                                        </td>
                                        <td className="px-3 py-2.5 font-mono text-[var(--text-primary)]">
                                          {v.fundalHeight != null ? `${v.fundalHeight} cm` : '—'}
                                        </td>
                                      </>
                                    )}
                                    <td className="px-3 py-2.5 text-[var(--text-tertiary)]">
                                      {v.recordedBy?.fullName || v.User?.fullName || '—'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── MODALS ────────────────────────────────────────────────────────────── */}
      <VitalsFormModal
        isOpen={showVitalsModal}
        onClose={() => setShowVitalsModal(false)}
        onSubmit={handleSubmitVitals}
        isLoading={false}
        isAntenatal={isAntenatal}
        attendanceId={selectedAttId || null}
        attendanceType={selectedAtt?.attendanceType}
      />

      <ShiftHandoverModal
        isOpen={showHandoverModal}
        onClose={() => setShowHandoverModal(false)}
        onComplete={handleHandoverComplete}
        patients={filteredInpatients.map(a => {
          const p = patients.find(pt => getEntityId(pt) === a.patientId);
          return {
            id: a.id!,
            patientId: a.patientId,
            patient: p,                  // pass the full object — ShiftHandoverModal uses getPatientName
            patientName: p ? getPatientName(p) : 'Unknown',
            bedNumber: a.Bed?.bedNumber || a.bed?.bedNumber,
            admissionType: a.admissionType,
            encounterCategory: a.encounterCategory,
            tasks: localTasks[a.id!] || [],
          };
        })}
        currentUser={user}
        hospital={hospital}
      />
    </div>
  );
}