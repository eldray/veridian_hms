// src/pages/Nursing.tsx — Nursing Station Hub (Enhanced UI/UX)
import { useLiveRefresh } from '../api/realtime';
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
import { getPatientName } from '../utils/patient';
import { describeApiError } from '../utils/apiError';
import { getLatestVitals } from '../api';
import { isDoseDue } from '../utils/frequencyUtils';
import {
  RefreshCw, Users, Hospital, Bed,
  Activity, User, AlertTriangle,
  ClipboardList, ClipboardCheck, Send, ChevronRight, Building2,
  Moon, Sun, Pill, LayoutGrid, List,
  Clock, Stethoscope,
} from 'lucide-react';
import {
  Button,
  Card,
  FilterSelect,
  PageHeader,
  Pagination,
  SearchInput,
  Segmented,
  StatCard,
  Tabs,
  type TabItem,
} from '../components/ui';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const getEntityId = (entity: { id?: string; _id?: string } | null | undefined): string =>
  entity?.id || entity?._id || '';

const PatientTypeBadge: React.FC<{ attendance: any; admission: any; size?: 'sm' | 'md' }> = ({
  attendance,
  admission,
  size = 'sm',
}) => {
  const admType = admission?.admissionType || attendance?.admissionType;
  const cat = attendance?.encounterCategory;
  const cls = size === 'sm'
    ? 'px-2 py-0.5 text-[10px] gap-1'
    : 'px-2.5 py-1 text-xs gap-1.5';
  const iconCls = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3';

  if (cat === 'daycase') return (
    <span className={`inline-flex items-center rounded-full font-semibold bg-purple-100 text-purple-700 border border-purple-200 ${cls}`}>
      <Sun className={iconCls} /> Day Surgery
    </span>
  );
  if (admType === 'detention_observation') return (
    <span className={`inline-flex items-center rounded-full font-semibold bg-orange-100 text-orange-700 border border-orange-200 ${cls}`}>
      <Moon className={iconCls} /> Observation
    </span>
  );
  if (cat === 'ipd') return (
    <span className={`inline-flex items-center rounded-full font-semibold bg-blue-100 text-blue-700 border border-blue-200 ${cls}`}>
      <Hospital className={iconCls} /> IPD
    </span>
  );
  return null;
};

const PaymentBadge: React.FC<{ mode?: string; size?: 'sm' | 'md' }> = ({ mode, size = 'sm' }) => {
  const cls = size === 'sm'
    ? 'px-2 py-0.5 text-[10px]'
    : 'px-2.5 py-1 text-xs';

  const map: Record<string, { label: string; cls: string }> = {
    nhis: { label: 'NHIS', cls: 'bg-green-100 text-green-700 border-green-200' },
    private_insurance: { label: 'PVT INS', cls: 'bg-purple-100 text-purple-700 border-purple-200' },
    corporate: { label: 'CORP', cls: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
    cash: { label: 'CASH', cls: 'bg-gray-100 text-gray-700 border-gray-200' },
  };
  const cfg = map[mode || 'cash'] || map.cash;

  return (
    <span className={`inline-flex items-center rounded-full font-semibold border ${cls} ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
};

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

// Vital status pill
const VitalPill: React.FC<{ label: string; value?: string | number; unit?: string; status: 'ok' | 'warn' | 'critical' | 'none' }> = ({
  label, value, unit, status,
}) => {
  const colorMap = {
    ok: 'bg-green-50 text-green-700 border-green-100',
    warn: 'bg-yellow-50 text-yellow-700 border-yellow-100',
    critical: 'bg-red-50 text-red-700 border-red-100',
    none: 'bg-gray-50 text-gray-400 border-gray-100',
  };
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] font-medium ${colorMap[status]}`}>
      <span className="opacity-70">{label}</span>
      <span className="font-bold">{value ?? '—'}{unit || ''}</span>
    </div>
  );
};

type ViewMode = 'grid' | 'list';
type CareGroup = 'ipd' | 'daycase' | 'observation';

/** Mirrors PatientTypeBadge: day surgery wins, then observation, then formal IPD. */
const patientGroup = (attendance: any, admission: any): CareGroup => {
  if (attendance?.encounterCategory === 'daycase') return 'daycase';
  const admissionType = admission?.admissionType || attendance?.admissionType;
  if (admissionType === 'detention_observation') return 'observation';
  return 'ipd';
};

const GROUP_TABS: TabItem<'all' | CareGroup>[] = [
  { key: 'all', label: 'All patients', icon: Users },
  { key: 'ipd', label: 'IPD', icon: Hospital },
  { key: 'daycase', label: 'Day Surgery', icon: Sun },
  { key: 'observation', label: 'Observation', icon: Moon },
];

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
  const [typeFilter, setTypeFilter] = useState<'all' | CareGroup>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('nursingViewMode');
    return (saved as ViewMode) || 'grid';
  });

  const { attendances, getAttendances } = useAttendanceStore();
  const { patients } = usePatientStore(); // used only as a fallback for names; not loaded here
  const { admissions, getAdmissions, addDailyNote } = useAdmissionStore();
  const { wards, beds, getWards, getBeds } = useWardStore();
  const { doses, tasks, fetchDoses, fetchTasks } = useNursingStore();

  const [vitalsByAtt, setVitalsByAtt] = useState<Record<string, any>>({});

  useEffect(() => {
    localStorage.setItem('nursingViewMode', viewMode);
  }, [viewMode]);

  // Indexed register: findPatient() runs for every card on the board, and scanning the
  // whole patient list from there stalled the ward view while it streamed in.
  const patientById = useMemo(
    () => new Map((patients || []).map((p: any) => [p.id, p] as [string, any])),
    [patients],
  );

  const findPatient = useCallback((attendance: any) => {
    if (!attendance) return null;
    if (attendance.patient && typeof attendance.patient === 'object') return attendance.patient;
    if (attendance.patientId && typeof attendance.patientId === 'object') return attendance.patientId;
    if (attendance.patientId && typeof attendance.patientId === 'string') {
      const found = patientById.get(attendance.patientId);
      if (found) return found;
    }
    if (attendance.Patient && typeof attendance.Patient === 'object') return attendance.Patient;
    return null;
  }, [patientById]);

  // ── Load the nursing board without letting optional lookups block the page ──
  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      // The inpatient list is the essential first render. Wards, beds and admission
      // metadata can hydrate in the background; one slow secondary endpoint must not
      // hold the whole nursing station behind a full-screen spinner.
      // 500 rows bounds the walk to five requests; a ward never holds that many inpatients.
      await getAttendances({ status: 'admitted', limit: 500 });
    } catch (err: any) {
      toastError('Load failed', err?.message || 'Could not load the inpatient list');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }

    // These datasets enrich the board but are not prerequisites for displaying it.
    void Promise.allSettled([
      getAdmissions({ status: 'active', limit: 500 }),
      getWards(),
      getBeds(),
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLiveRefresh(['encounters', 'admissions', 'nursing', 'beds'], () =>
    Promise.all([
      getAttendances({ status: 'admitted', limit: 500 }, { silent: true }),
      getAdmissions({ status: 'active', limit: 500 }, { silent: true }),
      getBeds(),
    ])
  );

  // ── Inpatients ──
  const inpatients = useMemo(
    () => attendances.filter((a) =>
      a.status === 'admitted' &&
      (a.encounterCategory === 'ipd' || a.encounterCategory === 'daycase'),
    ),
    [attendances],
  );

  // ── Fetch MAR doses, tasks and latest vitals: ONE batched request each for all inpatients ──
  // (this used to send 3 requests per patient at once, which queued behind the browser's
  //  6-connection limit and timed out; each call also overwrote the previous patient's data)
  useEffect(() => {
    const ids = inpatients.map((a) => getEntityId(a)).filter(Boolean);
    if (ids.length === 0) return;
    const idList = ids.join(',');

    fetchDoses({ attendanceId: idList }).catch(() => {});
    fetchTasks({ attendanceId: idList }).catch(() => {});

    (async () => {
      try {
        const rows = await getLatestVitals(ids);
        const updates: Record<string, any> = {};
        for (const v of rows) if (v?.attendanceId) updates[v.attendanceId] = v;
        setVitalsByAtt((prev) => ({ ...prev, ...updates }));
      } catch {
        /* the board still works without the vitals badges */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inpatients.length]);

  // ── Grouping ──
  const groupCounts = useMemo(() => {
    const counts: Record<'all' | CareGroup, number> = { all: inpatients.length, ipd: 0, daycase: 0, observation: 0 };
    for (const attendance of inpatients) {
      const admission = admissions.find((x) => x.attendanceId === getEntityId(attendance) && !x.dischargeDate);
      counts[patientGroup(attendance, admission)]++;
    }
    return counts;
  }, [inpatients, admissions]);

  // ── Filtered ──
  const filteredInpatients = useMemo(() => {
    return inpatients.filter((a) => {
      if (wardFilter !== 'all' && a.wardId !== wardFilter) return false;

      if (typeFilter !== 'all') {
        const adm = admissions.find((x) => x.attendanceId === getEntityId(a) && !x.dischargeDate);
        if (patientGroup(a, adm) !== typeFilter) return false;
      }

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const p = findPatient(a);
      const name = p ? getPatientName(p).toLowerCase() : '';
      // Encounters carry bedId, not a nested bed; resolve it from the loaded bed list.
      const bedNumber = (beds.find((b: any) => b.id === a.bedId)?.bedNumber || '').toLowerCase();
      return (
        name.includes(q) ||
        (a.attendanceNumber || '').toLowerCase().includes(q) ||
        (p?.folderNumber || '').toLowerCase().includes(q) ||
        bedNumber.includes(q)
      );
    });
  }, [inpatients, wardFilter, typeFilter, searchQuery, admissions, findPatient, beds]);

  const totalPages = Math.ceil(filteredInpatients.length / itemsPerPage);
  const paginatedInpatients = filteredInpatients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, wardFilter, searchQuery]);

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
      ipdCount: groupCounts.ipd,
      detentionCount: groupCounts.observation,
      daySurgeryCount: groupCounts.daycase,
      pendingDischarges: admissions.filter((a) => !a.dischargeDate && a.status === 'admitted').length,
      medicationsDueToday: medsDue,
      criticalAlerts,
    };
  }, [inpatients, admissions, doses, vitalsByAtt, groupCounts]);

  // ── Per-patient badges ──
  const patientBadges = useMemo(() => {
    const map: Record<string, { alerts: number; medsDue: number; tasksPending: number; lastVitals?: string; vitalsRaw?: any }> = {};

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
        vitalsRaw: v,
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

    const targets = admissions.filter((a) => !a.dischargeDate);
    const results = await Promise.allSettled(
      targets.map((a) => addDailyNote(a.id, { notes: notesText, noteType: 'handover' })),
    );
    const failures = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];

    // A handover that reached some beds is not "recorded for all patients", so say which it missed
    // and let the modal keep the notes on screen for a retry.
    if (failures.length > 0) {
      const reason = describeApiError(failures[0].reason, 'the note could not be written');
      throw new Error(
        failures.length === targets.length
          ? `The handover was not recorded for any patient - ${reason}.`
          : `The handover reached ${targets.length - failures.length} of ${targets.length} patients - ${reason} for the rest.`,
      );
    }

    success('Handover saved', 'Shift handover recorded for all patients');
    setShowHandoverModal(false);
  };

  // ── Helpers ──
  const formatRelativeTime = (iso?: string) => {
    if (!iso) return 'No vitals';
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const getVitalStatus = (type: string, value: any): 'ok' | 'warn' | 'critical' | 'none' => {
    if (!value && value !== 0) return 'none';
    switch (type) {
      case 'bp': {
        const [sys, dia] = String(value).split('/').map(Number);
        if (sys >= 180 || sys < 90 || dia >= 120) return 'critical';
        if (sys >= 140 || dia >= 90) return 'warn';
        return 'ok';
      }
      case 'temp': {
        const t = Number(value);
        if (t >= 39 || t < 35) return 'critical';
        if (t >= 37.5) return 'warn';
        return 'ok';
      }
      case 'spo2': {
        const s = Number(value);
        if (s < 90) return 'critical';
        if (s < 94) return 'warn';
        return 'ok';
      }
      case 'pulse': {
        const p = Number(value);
        if (p > 130 || p < 50) return 'critical';
        if (p > 100) return 'warn';
        return 'ok';
      }
      default: return 'none';
    }
  };

  const activeFiltersCount =
    (searchQuery ? 1 : 0) +
    (wardFilter !== 'all' ? 1 : 0) +
    (typeFilter !== 'all' ? 1 : 0);

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
    <div className="space-y-5 p-4 sm:p-5">
      <PageHeader
        title="Nursing Station"
        subtitle="Inpatient board grouped by care setting"
        meta={`${dashboardStats.admittedCount} active patient${dashboardStats.admittedCount !== 1 ? 's' : ''}${dashboardStats.criticalAlerts > 0 ? ` • ${dashboardStats.criticalAlerts} critical` : ''}`}
        icon={Stethoscope}
        accent="cyan"
        backTo="/dashboard"
        actions={(
          <>
            <Button variant="soft" accent="blue" icon={Building2} onClick={() => navigate('/dashboard/wards')}>Wards</Button>
            <Button variant="secondary" icon={Hospital} onClick={() => navigate('/dashboard/admissions')}>Admissions</Button>
            <Button variant="soft" accent="orange" icon={Send} onClick={() => setShowHandoverModal(true)}>Shift Handover</Button>
            <Button icon={RefreshCw} loading={refreshing} onClick={loadData}>Refresh</Button>
          </>
        )}
        tabs={(
          <Tabs
            tabs={GROUP_TABS.map(tab => ({ ...tab, count: groupCounts[tab.key] }))}
            active={typeFilter}
            onChange={setTypeFilter}
            accent="cyan"
            aria-label="Inpatient grouping"
          />
        )}
      />

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        <StatCard
          label="Total Admitted"
          value={dashboardStats.admittedCount}
          icon={Users}
          accent="cyan"
          hint={`${dashboardStats.ipdCount} IPD · ${dashboardStats.detentionCount} obs · ${dashboardStats.daySurgeryCount} day`}
        />
        <StatCard label="Formal IPD" value={dashboardStats.ipdCount} icon={Hospital} accent="blue" onClick={() => navigate('/dashboard/admissions')} />
        <StatCard label="Under Observation" value={dashboardStats.detentionCount} icon={Moon} accent="orange" />
        <StatCard label="Day Surgery" value={dashboardStats.daySurgeryCount} icon={Sun} accent="yellow" />
        <StatCard label="Meds Due Now" value={dashboardStats.medicationsDueToday} icon={Pill} accent="purple" />
        <StatCard label="Pending Discharge" value={dashboardStats.pendingDischarges} icon={ClipboardCheck} accent="green" onClick={() => navigate('/dashboard/admissions')} />
        <StatCard
          label="Critical Alerts"
          value={dashboardStats.criticalAlerts}
          icon={AlertTriangle}
          accent={dashboardStats.criticalAlerts > 0 ? 'red' : undefined}
          hint="Abnormal vitals"
        />
      </div>

      {/* ── Filters Toolbar ── */}
      <Card>
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <SearchInput
            className="flex-1"
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by name, folder, bed, or attendance number…"
          />
          <FilterSelect
            value={wardFilter}
            onChange={setWardFilter}
            options={[
              { value: 'all', label: 'All wards' },
              ...wards.map((w: any) => ({ value: w.id, label: w.wardName })),
            ]}
            aria-label="Filter by ward"
          />
          <Segmented
            options={[
              { value: 'grid', label: 'Grid', icon: LayoutGrid },
              { value: 'list', label: 'List', icon: List },
            ]}
            value={viewMode}
            onChange={setViewMode}
            accent="cyan"
            aria-label="Board layout"
          />
          {activeFiltersCount > 0 && (
            <span className="text-xs text-[var(--text-tertiary)] whitespace-nowrap">
              {filteredInpatients.length} of {inpatients.length} shown
            </span>
          )}
        </div>
      </Card>

      {/* ── Patient Cards ── */}
      {filteredInpatients.length === 0 ? (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-12 text-center">
          <div className="w-16 h-16 bg-[var(--bg-main)] rounded-full flex items-center justify-center mx-auto mb-4">
            <Hospital className="w-8 h-8 text-[var(--text-tertiary)] opacity-40" />
          </div>
          <p className="text-sm text-[var(--text-primary)] font-semibold">No admitted patients</p>
          <p className="text-xs text-[var(--text-tertiary)] mt-1 max-w-xs mx-auto">
            {activeFiltersCount > 0
              ? 'Try adjusting your filters or search query'
              : 'Patients admitted from OPD or Emergency will appear here'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* ============ GRID VIEW ============ */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {paginatedInpatients.map((att) => {
            const id = getEntityId(att);
            const patient = findPatient(att);
            const admission = admissions.find((a) => a.attendanceId === id && !a.dischargeDate);
            const badges = patientBadges[id] || { alerts: 0, medsDue: 0, tasksPending: 0 };
            const name = patient ? getPatientName(patient) : 'Unknown Patient';
            const bedNumber = beds.find((b: any) => b.id === att.bedId)?.bedNumber;
            const age = patient?.dateOfBirth
              ? Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 3600000))
              : null;

            const v = badges.vitalsRaw;

            return (
              <button
                key={id}
                onClick={() => navigate(`/dashboard/nursing/patient/${id}`)}
                className="text-left bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] hover:border-teal-500 hover:shadow-lg transition-all overflow-hidden group flex flex-col"
              >
                {/* Header */}
                <div className="flex items-start gap-3 p-4 pb-3">
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-100 to-teal-50 text-teal-700 flex items-center justify-center font-bold text-sm border border-teal-200">
                      {initials(name) || <User className="w-4 h-4" />}
                    </div>
                    {badges.alerts > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-[var(--bg-card)] animate-pulse">
                        {badges.alerts}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[var(--text-primary)] truncate">{name}</p>
                    <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)] mt-0.5 flex-wrap">
                      <span className="font-mono">#{patient?.folderNumber || '—'}</span>
                      <span className="opacity-40">·</span>
                      <span className="font-mono">{att.attendanceNumber || '—'}</span>
                      {bedNumber && (
                        <>
                          <span className="opacity-40">·</span>
                          <span className="inline-flex items-center gap-1 font-semibold text-[var(--text-primary)]">
                            <Bed className="w-3 h-3" />
                            {bedNumber}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <PatientTypeBadge attendance={att} admission={admission} />
                      <PaymentBadge mode={att.paymentMode} />
                    </div>
                  </div>
                </div>

                {/* Meta row */}
                <div className="px-4 pb-3 flex items-center gap-3 text-[11px] text-[var(--text-secondary)]">
                  <span>{patient?.gender === 'male' ? '♂' : patient?.gender === 'female' ? '♀' : '·'}</span>
                  {age != null && <span>{age} yrs</span>}
                  <span className="opacity-40">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(att.dateTime || att.createdAt).toLocaleDateString([], {
                      month: 'short', day: 'numeric',
                    })}
                  </span>
                </div>

                {/* Vitals strip (only in grid view) */}
                {v && (
                  <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                    <VitalPill
                      label="BP"
                      value={v.bloodPressure}
                      status={getVitalStatus('bp', v.bloodPressure)}
                    />
                    <VitalPill
                      label="T"
                      value={v.temperature}
                      unit="°"
                      status={getVitalStatus('temp', v.temperature)}
                    />
                    <VitalPill
                      label="SpO₂"
                      value={v.spo2}
                      unit="%"
                      status={getVitalStatus('spo2', v.spo2)}
                    />
                    <VitalPill
                      label="HR"
                      value={v.pulse}
                      status={getVitalStatus('pulse', v.pulse)}
                    />
                  </div>
                )}

                {/* Badges row */}
                <div className="px-4 pb-4 flex items-center gap-3 flex-wrap border-t border-[var(--border-color)] pt-3 mt-auto">
                  <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                    badges.alerts > 0 ? 'text-red-600' : 'text-[var(--text-tertiary)]'
                  }`}>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {badges.alerts} alert{badges.alerts !== 1 ? 's' : ''}
                  </span>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                    badges.medsDue > 0 ? 'text-yellow-600' : 'text-[var(--text-tertiary)]'
                  }`}>
                    <Pill className="w-3.5 h-3.5" />
                    {badges.medsDue} due
                  </span>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                    badges.tasksPending > 0 ? 'text-cyan-600' : 'text-[var(--text-tertiary)]'
                  }`}>
                    <ClipboardList className="w-3.5 h-3.5" />
                    {badges.tasksPending} task{badges.tasksPending !== 1 ? 's' : ''}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--text-tertiary)] ml-auto">
                    <Activity className="w-3.5 h-3.5" />
                    {formatRelativeTime(badges.lastVitals)}
                  </span>
                </div>

                {/* Footer */}
                <div className="px-4 py-2.5 bg-[var(--bg-main)] border-t border-[var(--border-color)] flex items-center justify-between text-xs font-semibold text-teal-600 group-hover:bg-teal-50 transition-colors">
                  Open patient workspace
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        /* ============ LIST VIEW ============ */
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] shadow-sm overflow-hidden">
          {/* List header — desktop */}
          <div className="hidden lg:grid grid-cols-12 gap-4 px-4 py-3 bg-[var(--bg-main)] border-b border-[var(--border-color)] text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
            <div className="col-span-3">Patient</div>
            <div className="col-span-2">Bed / Ward</div>
            <div className="col-span-2">Type / Payment</div>
            <div className="col-span-2">Vitals</div>
            <div className="col-span-2">Care Alerts</div>
            <div className="col-span-1 text-right">Open</div>
          </div>

          <div className="divide-y divide-[var(--border-color)]">
            {paginatedInpatients.map((att) => {
              const id = getEntityId(att);
              const patient = findPatient(att);
              const admission = admissions.find((a) => a.attendanceId === id && !a.dischargeDate);
              const badges = patientBadges[id] || { alerts: 0, medsDue: 0, tasksPending: 0 };
              const name = patient ? getPatientName(patient) : 'Unknown Patient';
              const bedNumber = beds.find((b: any) => b.id === att.bedId)?.bedNumber;
              const ward = wards.find((w: any) => w.id === att.wardId);
              const age = patient?.dateOfBirth
                ? Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 3600000))
                : null;
              const v = badges.vitalsRaw;

              return (
                <button
                  key={id}
                  onClick={() => navigate(`/dashboard/nursing/patient/${id}`)}
                  className="w-full text-left grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 px-4 py-3.5 hover:bg-teal-50/30 transition-colors group items-center"
                >
                  {/* Patient info */}
                  <div className="lg:col-span-3 flex items-center gap-3 min-w-0">
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-100 to-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs border border-teal-200">
                        {initials(name) || <User className="w-3.5 h-3.5" />}
                      </div>
                      {badges.alerts > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[9px] font-bold border-2 border-[var(--bg-card)]">
                          {badges.alerts}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[var(--text-primary)] truncate">{name}</p>
                      <div className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)] mt-0.5">
                        <span className="font-mono">#{patient?.folderNumber || '—'}</span>
                        <span className="opacity-40">·</span>
                        <span className="font-mono">{att.attendanceNumber || '—'}</span>
                        <span className="opacity-40">·</span>
                        <span>{patient?.gender === 'male' ? '♂' : patient?.gender === 'female' ? '♀' : '·'}</span>
                        {age != null && <span>{age}y</span>}
                      </div>
                    </div>
                  </div>

                  {/* Bed / Ward */}
                  <div className="lg:col-span-2 flex items-center gap-2 text-xs">
                    {bedNumber ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-[var(--text-primary)]">
                        <Bed className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                        {bedNumber}
                      </span>
                    ) : (
                      <span className="text-[var(--text-tertiary)] italic text-[11px]">No bed</span>
                    )}
                    {ward && (
                      <span className="text-[var(--text-tertiary)] truncate">
                        · {ward.wardName}
                      </span>
                    )}
                  </div>

                  {/* Type / Payment */}
                  <div className="lg:col-span-2 flex items-center gap-1.5 flex-wrap">
                    <PatientTypeBadge attendance={att} admission={admission} />
                    <PaymentBadge mode={att.paymentMode} />
                  </div>

                  {/* Vitals */}
                  <div className="lg:col-span-2 flex items-center gap-1.5 flex-wrap">
                    {v ? (
                      <>
                        <VitalPill label="BP" value={v.bloodPressure} status={getVitalStatus('bp', v.bloodPressure)} />
                        <VitalPill label="T" value={v.temperature} unit="°" status={getVitalStatus('temp', v.temperature)} />
                        <VitalPill label="SpO₂" value={v.spo2} unit="%" status={getVitalStatus('spo2', v.spo2)} />
                      </>
                    ) : (
                      <span className="text-[11px] text-[var(--text-tertiary)] italic">
                        {formatRelativeTime(badges.lastVitals)}
                      </span>
                    )}
                  </div>

                  {/* Care alerts */}
                  <div className="lg:col-span-2 flex items-center gap-3 flex-wrap text-[11px]">
                    <span className={`inline-flex items-center gap-1 font-medium ${
                      badges.alerts > 0 ? 'text-red-600' : 'text-[var(--text-tertiary)]'
                    }`}>
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {badges.alerts}
                    </span>
                    <span className={`inline-flex items-center gap-1 font-medium ${
                      badges.medsDue > 0 ? 'text-yellow-600' : 'text-[var(--text-tertiary)]'
                    }`}>
                      <Pill className="w-3.5 h-3.5" />
                      {badges.medsDue}
                    </span>
                    <span className={`inline-flex items-center gap-1 font-medium ${
                      badges.tasksPending > 0 ? 'text-cyan-600' : 'text-[var(--text-tertiary)]'
                    }`}>
                      <ClipboardList className="w-3.5 h-3.5" />
                      {badges.tasksPending}
                    </span>
                  </div>

                  {/* Open */}
                  <div className="lg:col-span-1 flex items-center lg:justify-end gap-2">
                    <span className="lg:hidden text-xs text-teal-600 font-semibold">Open workspace</span>
                    <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)] group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Pagination
        page={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        totalItems={filteredInpatients.length}
        noun="patients"
        onChange={setCurrentPage}
      />

      {/* Handover modal */}
      <ShiftHandoverModal
        isOpen={showHandoverModal}
        onClose={() => setShowHandoverModal(false)}
        onComplete={handleHandoverComplete}
        patients={filteredInpatients.map((a) => {
          const p = findPatient(a);
          const id = getEntityId(a);
          const admission = admissions.find((x) => x.attendanceId === id && !x.dischargeDate);
          return {
            id: id,
            patientId: a.patientId,
            patient: p,
            patientName: p ? getPatientName(p) : 'Unknown',
            bedNumber: beds.find((b: any) => b.id === a.bedId)?.bedNumber,
            admissionType: admission?.admissionType,
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