// src/pages/Nursing.tsx — Nursing Station Hub
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAttendanceStore } from '../store/attendanceStore';
import { usePatientStore } from '../store/patientStore';
import { useAuthStore } from '../store/authStore';
import { useAdmissionStore } from '../store/admissionStore';
import { useWardStore } from '../store/wardStore';
import { useToast } from '../store/toastStore';
import { useHospitalStore } from '../store/hospitalStore';
import { useNursingStore } from '../store/nursingStore';
import { ShiftHandoverModal } from '../components/nursing/ShiftHandoverModal';
import { NursingDashboardStats } from '../components/nursing/NursingDashboardStats';
import { getPatientName } from '../utils/patient';
import { getFrequencyInfo, isDoseDue } from '../utils/frequencyUtils';
import {
  ChevronLeft, RefreshCw, Users, Hospital, Bed,
  Search, Activity, User, AlertTriangle, StickyNote,
  ClipboardList, Send, ChevronRight, Building2,
  Moon, Sun, Pill,
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

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

// ─────────────────────────────────────────────
// Hub
// ─────────────────────────────────────────────

export default function Nursing() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const { user } = useAuthStore();
  const { hospital } = useHospitalStore();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [wardFilter, setWardFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'ipd' | 'daycase' | 'observation'>('all');
  const [showHandoverModal, setShowHandoverModal] = useState(false);

  const { attendances, getAttendances, getVitalsByAttendance } = useAttendanceStore();
  const { patients, loadPatients } = usePatientStore();
  const { admissions, getAdmissions, addDailyNote } = useAdmissionStore();
  const { wards, getWards, getBeds } = useWardStore();
  const { doses, tasks, fetchDoses, fetchTasks } = useNursingStore();

  // Track latest vitals per attendance (fetched lazily)
  const [vitalsByAtt, setVitalsByAtt] = useState<Record<string, any>>({});

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

  // ── Load base data ──
  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadPatients(),
        getAttendances(),
        getAdmissions(),
        getWards(),
        getBeds(),
      ]);
    } catch (err: any) {
      toastError('Load failed', err?.message || 'Could not load nursing data');
    } finally {
      setRefreshing(false);
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);   // ← stable reference, no refetch on every store update

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);   // ← run once on mount

  useEffect(() => { loadData(); }, []);

  // ── Inpatients (admitted IPD/daycase) ──
  const inpatients = useMemo(
    () => attendances.filter((a) =>
      a.status === 'admitted' &&
      (a.encounterCategory === 'ipd' || a.encounterCategory === 'daycase'),
    ),
    [attendances],
  );

  // ── Fetch MAR doses and tasks for all inpatients (lightweight views) ──
  useEffect(() => {
    const ids = inpatients.map((a) => getEntityId(a)).filter(Boolean);
    if (ids.length === 0) return;

    (async () => {
      try {
        await Promise.all([
          ...ids.map((id) => fetchDoses({ attendanceId: id, limit: 500 }).catch(() => {})),
          ...ids.map((id) => fetchTasks({ attendanceId: id }).catch(() => {})),
        ]);
      } catch {
        // Non-fatal
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inpatients.length]);   // ← only when the count of inpatients changes

  // ── Fetch latest vitals per inpatient (throttled — one per patient) ──
  useEffect(() => {
    const ids = inpatients.map((a) => getEntityId(a)).filter(Boolean);
    if (ids.length === 0) return;

    (async () => {
      const updates: Record<string, any> = {};
      await Promise.all(
        ids.map(async (id) => {
          try {
            const list: any[] = await getVitalsByAttendance(id);
            if (Array.isArray(list) && list.length > 0) {
              const sorted = [...list].sort(
                (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
              );
              updates[id] = sorted[0];
            }
          } catch {
            // ignore
          }
        }),
      );
      setVitalsByAtt((prev) => ({ ...prev, ...updates }));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inpatients.length]);

  // ── Filtered list ──
  const filteredInpatients = useMemo(() => {
    return inpatients.filter((a) => {
      // Ward
      if (wardFilter !== 'all' && a.wardId !== wardFilter) return false;

      // Type
      if (typeFilter !== 'all') {
        const adm = admissions.find((x) => x.attendanceId === getEntityId(a) && !x.dischargeDate);
        const admType = adm?.admissionType || a.admissionType;
        if (typeFilter === 'ipd' && a.encounterCategory !== 'ipd') return false;
        if (typeFilter === 'daycase' && a.encounterCategory !== 'daycase') return false;
        if (typeFilter === 'observation' && admType !== 'detention_observation') return false;
      }

      // Search
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const p = findPatient(a);
      const name = p ? getPatientName(p).toLowerCase() : '';
      return (
        name.includes(q) ||
        (a.attendanceNumber || '').toLowerCase().includes(q) ||
        (p?.folderNumber || '').toLowerCase().includes(q) ||
        (a.Bed?.bedNumber || a.bed?.bedNumber || '').toLowerCase().includes(q)
      );
    });
  }, [inpatients, wardFilter, typeFilter, searchQuery, admissions, findPatient]);

  // ── Dashboard stats ──
  const dashboardStats = useMemo(() => {
    let medsDue = 0;
    let criticalAlerts = 0;

    for (const att of inpatients) {
      const id = getEntityId(att);
      const attDoses = doses.filter((d) => d.medication.attendanceId === id);
      if (attDoses.length > 0) {
        medsDue += attDoses.filter((d) => d.status === 'due').length;
      } else {
        const meds = att.Medication || [];
        meds.forEach((m: any) => {
          if (m.status === 'dispensed' && isDoseDue(m)) medsDue++;
        });
      }

      const v = vitalsByAtt[id];
      if (v) {
        if (v.bloodPressure) {
          const [sys] = v.bloodPressure.split('/').map(Number);
          if (sys >= 180 || sys < 90) criticalAlerts++;
        }
        if (v.temperature && (v.temperature >= 39.5 || v.temperature < 35)) criticalAlerts++;
        if (v.spo2 && v.spo2 < 90) criticalAlerts++;
        if (v.pulse && (v.pulse > 130 || v.pulse < 50)) criticalAlerts++;
      }
    }

    return {
      admittedCount: inpatients.length,
      ipdCount: inpatients.filter((a) =>
        a.encounterCategory === 'ipd' &&
        admissions.find((x) => x.attendanceId === getEntityId(a))?.admissionType !== 'detention_observation',
      ).length,
      detentionCount: inpatients.filter((a) =>
        admissions.find((x) => x.attendanceId === getEntityId(a))?.admissionType === 'detention_observation',
      ).length,
      daySurgeryCount: inpatients.filter((a) => a.encounterCategory === 'daycase').length,
      pendingDischarges: admissions.filter((a) => !a.dischargeDate && a.status === 'admitted').length,
      medicationsDueToday: medsDue,
      criticalAlerts,
    };
  }, [inpatients, admissions, doses, vitalsByAtt]);

  // ── Per-patient derived info (badges on each card) ──
  const patientBadges = useMemo(() => {
    const map: Record<string, { alerts: number; medsDue: number; tasksPending: number; lastVitals?: string }> = {};

    for (const att of inpatients) {
      const id = getEntityId(att);

      const attDoses = doses.filter((d) => d.medication.attendanceId === id);
      const medsDue = attDoses.length > 0
        ? attDoses.filter((d) => d.status === 'due').length
        : (att.Medication || []).filter((m: any) => m.status === 'dispensed' && isDoseDue(m)).length;

      const tasksPending = tasks.filter((t) => t.attendanceId === id && t.status !== 'completed').length;

      let alerts = 0;
      const v = vitalsByAtt[id];
      if (v) {
        if (v.bloodPressure) {
          const [sys] = v.bloodPressure.split('/').map(Number);
          if (sys >= 180 || sys < 90) alerts++;
        }
        if (v.temperature && (v.temperature >= 38 || v.temperature < 35)) alerts++;
        if (v.spo2 && v.spo2 < 94) alerts++;
        if (v.pulse && (v.pulse > 100 || v.pulse < 50)) alerts++;
      }

      map[id] = {
        alerts,
        medsDue,
        tasksPending,
        lastVitals: v?.recordedAt,
      };
    }

    return map;
  }, [inpatients, doses, tasks, vitalsByAtt]);

  // ── Handover ──
  const handleHandoverComplete = async (data: any) => {
    const notesText = [
      `[SHIFT HANDOVER — ${data.currentShift} → ${data.nextShift}]`,
      `By: ${data.handedOverBy}`,
      data.notes ? `Notes: ${data.notes}` : '',
      `Tasks completed this shift: ${Object.values(data.completedTasks).filter(Boolean).length}`,
    ].filter(Boolean).join('\n');

    const promises = admissions
      .filter((a) => !a.dischargeDate)
      .map((a) => addDailyNote(a.id, { notes: notesText, noteType: 'handover' }).catch(() => {}));

    await Promise.allSettled(promises);
    success('Handover saved', 'Shift handover recorded for all patients');
    setShowHandoverModal(false);
  };

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-[var(--text-primary)]">Loading Nursing Station…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-card)] transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
          <div className="w-9 h-9 bg-teal-100 rounded-xl flex items-center justify-center">
            <Users className="w-4 h-4 text-teal-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[var(--text-primary)]">Nursing Station</h1>
            <p className="text-xs text-[var(--text-secondary)]">
              {dashboardStats.admittedCount} patients · {dashboardStats.ipdCount} IPD · {dashboardStats.detentionCount} Obs · {dashboardStats.daySurgeryCount} Day Surgery
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

      {/* Stats */}
      <NursingDashboardStats stats={dashboardStats} />

      {/* Filters */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-3 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)]" />
          <input
            type="text"
            placeholder="Search by name, folder, bed, or attendance number…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <select
          value={wardFilter}
          onChange={(e) => setWardFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]"
        >
          <option value="all">All wards</option>
          {wards.map((w: any) => (
            <option key={w.id} value={w.id}>{w.wardName}</option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as any)}
          className="px-3 py-2 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]"
        >
          <option value="all">All types</option>
          <option value="ipd">IPD</option>
          <option value="daycase">Day Surgery</option>
          <option value="observation">Observation</option>
        </select>

        <span className="ml-auto text-xs text-[var(--text-tertiary)]">
          {filteredInpatients.length} patient{filteredInpatients.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Patient cards */}
      {filteredInpatients.length === 0 ? (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-12 text-center">
          <Hospital className="w-12 h-12 text-[var(--text-tertiary)] opacity-40 mx-auto mb-3" />
          <p className="text-sm text-[var(--text-secondary)] font-medium">No admitted patients</p>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">
            {searchQuery || wardFilter !== 'all' || typeFilter !== 'all'
              ? 'Try different filters'
              : 'Patients admitted from OPD or Emergency will appear here'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredInpatients.map((att) => {
            const id = getEntityId(att);
            const patient = findPatient(att);
            const admission = admissions.find((a) => a.attendanceId === id && !a.dischargeDate);
            const badges = patientBadges[id] || { alerts: 0, medsDue: 0, tasksPending: 0 };
            const name = patient ? getPatientName(patient) : 'Unknown Patient';
            const bedNumber = att.Bed?.bedNumber || att.bed?.bedNumber;
            const age = patient?.dateOfBirth
              ? Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 3600000))
              : null;

            const lastVitalsLabel = (() => {
              if (!badges.lastVitals) return 'No vitals';
              const diffMs = Date.now() - new Date(badges.lastVitals).getTime();
              const mins = Math.floor(diffMs / 60000);
              if (mins < 1) return 'vitals just now';
              if (mins < 60) return `vitals ${mins}m ago`;
              const hrs = Math.floor(mins / 60);
              if (hrs < 24) return `vitals ${hrs}h ago`;
              return `vitals ${Math.floor(hrs / 24)}d ago`;
            })();

            return (
              <button
                key={id}
                onClick={() => navigate(`/dashboard/nursing/patient/${id}`)}
                className="text-left bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] hover:border-teal-500 hover:shadow-md transition-all overflow-hidden group"
              >
                {/* Header strip */}
                <div className="flex items-start gap-3 p-4 pb-3">
                  <div className="w-11 h-11 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center flex-shrink-0 font-bold text-sm">
                    {initials(name) || <User className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[var(--text-primary)] truncate">{name}</p>
                    <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)] mt-0.5 flex-wrap">
                      <span>#{patient?.folderNumber || '—'}</span>
                      {bedNumber && (
                        <>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1">
                            <Bed className="w-3 h-3" />
                            {bedNumber}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <PatientTypeBadge attendance={att} admission={admission} />
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        att.paymentMode === 'nhis' ? 'bg-green-100 text-green-700' :
                        att.paymentMode === 'private_insurance' ? 'bg-purple-100 text-purple-700' :
                        att.paymentMode === 'corporate' ? 'bg-cyan-100 text-cyan-700' :
                        'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]'
                      }`}>
                        {att.paymentMode === 'nhis' ? 'NHIS' :
                         att.paymentMode === 'private_insurance' ? 'PVT INS' :
                         att.paymentMode === 'corporate' ? 'CORP' :
                         'CASH'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Meta */}
                <div className="px-4 pb-3 flex items-center gap-3 text-[11px] text-[var(--text-secondary)]">
                  <span>{patient?.gender === 'male' ? '♂' : patient?.gender === 'female' ? '♀' : '·'}</span>
                  {age != null && <span>{age} yrs</span>}
                  <span>·</span>
                  <span>
                    Admitted {new Date(att.dateTime || att.createdAt).toLocaleDateString([], {
                      month: 'short', day: 'numeric',
                    })}
                  </span>
                </div>

                {/* Badges row */}
                <div className="px-4 pb-4 flex items-center gap-3 flex-wrap border-t border-[var(--border-color)] pt-3">
                  <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                    badges.alerts > 0 ? 'text-[var(--icon-red-text)]' : 'text-[var(--text-tertiary)]'
                  }`}>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {badges.alerts} alert{badges.alerts !== 1 ? 's' : ''}
                  </span>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                    badges.medsDue > 0 ? 'text-[var(--icon-yellow-text)]' : 'text-[var(--text-tertiary)]'
                  }`}>
                    <Pill className="w-3.5 h-3.5" />
                    {badges.medsDue} due
                  </span>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                    badges.tasksPending > 0 ? 'text-[var(--icon-cyan-text)]' : 'text-[var(--text-tertiary)]'
                  }`}>
                    <ClipboardList className="w-3.5 h-3.5" />
                    {badges.tasksPending} task{badges.tasksPending !== 1 ? 's' : ''}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--text-tertiary)]">
                    <Activity className="w-3.5 h-3.5" />
                    {lastVitalsLabel}
                  </span>
                </div>

                {/* Footer — open action */}
                <div className="px-4 py-2.5 bg-[var(--bg-main)] border-t border-[var(--border-color)] flex items-center justify-between text-xs font-semibold text-teal-600 group-hover:bg-teal-50">
                  Open patient workspace
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Handover modal */}
      <ShiftHandoverModal
        isOpen={showHandoverModal}
        onClose={() => setShowHandoverModal(false)}
        onComplete={handleHandoverComplete}
        patients={filteredInpatients.map((a) => {
          const p = findPatient(a);
          const id = getEntityId(a);
          return {
            id: id,
            patientId: a.patientId,
            patient: p,
            patientName: p ? getPatientName(p) : 'Unknown',
            bedNumber: a.Bed?.bedNumber || a.bed?.bedNumber,
            admissionType: a.admissionType,
            encounterCategory: a.encounterCategory,
            tasks: tasks.filter((t) => t.attendanceId === id) as any,
          };
        })}
        currentUser={user}
        hospital={hospital}
      />
    </div>
  );
}