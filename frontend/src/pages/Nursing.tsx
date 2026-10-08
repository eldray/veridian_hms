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
import { NursingDashboardStats } from '../components/nursing/NursingDashboardStats';
import { getPatientName } from '../utils/patient';
import { getFrequencyInfo, isDoseDue } from '../utils/frequencyUtils';
import {
  ChevronLeft, RefreshCw, Users, Hospital, Bed,
  Search, Activity, User, AlertTriangle, StickyNote,
  ClipboardList, Send, ChevronRight, Building2,
  Moon, Sun, Pill, LayoutGrid, List, X, Filter,
  MapPin, Clock, Heart, Thermometer, Droplet,
  Eye, TrendingUp, Stethoscope, Shield, FileText,
} from 'lucide-react';

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
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('nursingViewMode');
    return (saved as ViewMode) || 'grid';
  });
  const [showFilters, setShowFilters] = useState(false);

  const { attendances, getAttendances, getVitalsByAttendance } = useAttendanceStore();
  const { patients, loadPatients } = usePatientStore();
  const { admissions, getAdmissions, addDailyNote } = useAdmissionStore();
  const { wards, getWards, getBeds } = useWardStore();
  const { doses, tasks, fetchDoses, fetchTasks } = useNursingStore();

  const [vitalsByAtt, setVitalsByAtt] = useState<Record<string, any>>({});

  useEffect(() => {
    localStorage.setItem('nursingViewMode', viewMode);
  }, [viewMode]);

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
  }, []);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLiveRefresh(['encounters', 'admissions', 'nursing', 'beds'], () =>
    Promise.all([getAttendances({}, { silent: true }), getAdmissions({}, { silent: true }), getBeds()])
  );

  // ── Inpatients ──
  const inpatients = useMemo(
    () => attendances.filter((a) =>
      a.status === 'admitted' &&
      (a.encounterCategory === 'ipd' || a.encounterCategory === 'daycase'),
    ),
    [attendances],
  );

  // ── Fetch MAR doses and tasks ──
  useEffect(() => {
    const ids = inpatients.map((a) => getEntityId(a)).filter(Boolean);
    if (ids.length === 0) return;

    (async () => {
      try {
        await Promise.all([
          ...ids.map((id) => fetchDoses({ attendanceId: id, limit: 500 }).catch(() => {})),
          ...ids.map((id) => fetchTasks({ attendanceId: id }).catch(() => {})),
        ]);
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inpatients.length]);

  // ── Fetch latest vitals ──
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
          } catch {}
        }),
      );
      setVitalsByAtt((prev) => ({ ...prev, ...updates }));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inpatients.length]);

  // ── Filtered ──
  const filteredInpatients = useMemo(() => {
    return inpatients.filter((a) => {
      if (wardFilter !== 'all' && a.wardId !== wardFilter) return false;

      if (typeFilter !== 'all') {
        const adm = admissions.find((x) => x.attendanceId === getEntityId(a) && !x.dischargeDate);
        const admType = adm?.admissionType || a.admissionType;
        if (typeFilter === 'ipd' && a.encounterCategory !== 'ipd') return false;
        if (typeFilter === 'daycase' && a.encounterCategory !== 'daycase') return false;
        if (typeFilter === 'observation' && admType !== 'detention_observation') return false;
      }

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

    const promises = admissions
      .filter((a) => !a.dischargeDate)
      .map((a) => addDailyNote(a.id, { notes: notesText, noteType: 'handover' }).catch(() => {}));

    await Promise.allSettled(promises);
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
      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-card)] transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
          <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-sm shadow-teal-500/20">
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[var(--text-primary)]">Nursing Station</h1>
            <p className="text-xs text-[var(--text-secondary)]">
              {dashboardStats.admittedCount} active patient{dashboardStats.admittedCount !== 1 ? 's' : ''}
              {dashboardStats.criticalAlerts > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 text-red-600 font-semibold">
                  <AlertTriangle className="w-3 h-3" />
                  {dashboardStats.criticalAlerts} critical
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => navigate('/dashboard/wards')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)] hover:bg-[var(--icon-blue-text)] hover:text-white transition-colors"
          >
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">Wards</span>
          </button>
          <button
            onClick={() => navigate('/dashboard/admissions')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)] transition-colors"
          >
            <Hospital className="w-4 h-4" />
            <span className="hidden sm:inline">Admissions</span>
          </button>
          <button
            onClick={() => setShowHandoverModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-orange-600 text-white hover:bg-orange-700 transition-colors shadow-sm shadow-orange-600/20"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Shift Handover</span>
          </button>
          <button
            onClick={loadData}
            disabled={refreshing}
            className="p-2 rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)] transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <NursingDashboardStats stats={dashboardStats} />

      {/* ── Filters Toolbar ── */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] shadow-sm">
        <div className="p-3">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
              <input
                type="text"
                placeholder="Search by name, folder, bed, or attendance number…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Desktop filters */}
            <div className="hidden lg:flex items-center gap-2">
              <select
                value={wardFilter}
                onChange={(e) => setWardFilter(e.target.value)}
                className="px-3 py-2.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">All wards</option>
                {wards.map((w: any) => (
                  <option key={w.id} value={w.id}>{w.wardName}</option>
                ))}
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="px-3 py-2.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">All types</option>
                <option value="ipd">IPD</option>
                <option value="daycase">Day Surgery</option>
                <option value="observation">Observation</option>
              </select>

              {/* View Toggle */}
              <div className="flex items-center bg-[var(--bg-main)] rounded-lg p-1 border border-[var(--border-color)]">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'grid'
                      ? 'bg-[var(--bg-card)] text-teal-700 shadow-sm'
                      : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-4 h-4" />
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'list'
                      ? 'bg-[var(--bg-card)] text-teal-700 shadow-sm'
                      : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                  }`}
                  title="List View"
                >
                  <List className="w-4 h-4" />
                  List
                </button>
              </div>
            </div>

            {/* Mobile filter toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden flex items-center justify-center gap-2 px-4 py-2.5 border border-[var(--border-color)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-main)] text-sm font-medium"
            >
              <Filter className="w-4 h-4" />
              Filters
              {activeFiltersCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-teal-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          {/* Mobile filters expanded */}
          {showFilters && (
            <div className="lg:hidden mt-3 pt-3 border-t border-[var(--border-color)] space-y-3">
              <select
                value={wardFilter}
                onChange={(e) => setWardFilter(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]"
              >
                <option value="all">All wards</option>
                {wards.map((w: any) => (
                  <option key={w.id} value={w.id}>{w.wardName}</option>
                ))}
              </select>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="w-full px-3 py-2.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]"
              >
                <option value="all">All types</option>
                <option value="ipd">IPD</option>
                <option value="daycase">Day Surgery</option>
                <option value="observation">Observation</option>
              </select>
              <div className="flex items-center bg-[var(--bg-main)] rounded-lg p-1 border border-[var(--border-color)]">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'grid' ? 'bg-[var(--bg-card)] text-teal-700 shadow-sm' : 'text-[var(--text-tertiary)]'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" /> Grid
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'list' ? 'bg-[var(--bg-card)] text-teal-700 shadow-sm' : 'text-[var(--text-tertiary)]'
                  }`}
                >
                  <List className="w-4 h-4" /> List
                </button>
              </div>
            </div>
          )}

          {/* Active filter chips */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--border-color)] flex-wrap">
              <span className="text-xs text-[var(--text-tertiary)] font-medium">Active:</span>
              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-teal-50 text-teal-700 rounded-md text-xs font-medium">
                  Search: "{searchQuery}"
                  <button onClick={() => setSearchQuery('')} className="hover:text-teal-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {wardFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-teal-50 text-teal-700 rounded-md text-xs font-medium">
                  Ward: {wards.find((w: any) => w.id === wardFilter)?.wardName || wardFilter}
                  <button onClick={() => setWardFilter('all')} className="hover:text-teal-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {typeFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-teal-50 text-teal-700 rounded-md text-xs font-medium capitalize">
                  Type: {typeFilter}
                  <button onClick={() => setTypeFilter('all')} className="hover:text-teal-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              <span className="ml-auto text-xs text-[var(--text-tertiary)]">
                {filteredInpatients.length} of {inpatients.length}
              </span>
            </div>
          )}
        </div>
      </div>

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
            {filteredInpatients.map((att) => {
              const id = getEntityId(att);
              const patient = findPatient(att);
              const admission = admissions.find((a) => a.attendanceId === id && !a.dischargeDate);
              const badges = patientBadges[id] || { alerts: 0, medsDue: 0, tasksPending: 0 };
              const name = patient ? getPatientName(patient) : 'Unknown Patient';
              const bedNumber = att.Bed?.bedNumber || att.bed?.bedNumber;
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