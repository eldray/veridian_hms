// src/pages/Admissions.tsx — Full rewrite, theme-consistent
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAdmissionStore } from '../store/admissionStore';
import { usePatientStore } from '../store/patientStore';
import { useAttendanceStore } from '../store/attendanceStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import { useLiveRefresh } from '../api/realtime';
import { ConfirmationModal } from '../components/ConfirmationModal';
import {
  Search, Users, Hospital, Calendar, Clock, CheckCircle, X,
  RefreshCw, FileText, Bed, Loader2, Eye, ChevronLeft, ChevronRight,
  ClipboardList, Building2, Moon, Sun, ArrowRight, LogOut,
  Hash, LayoutGrid, List, CircleDot, Filter, MapPin, Baby, Heart,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types & helpers
// ─────────────────────────────────────────────────────────────────────────────

type DateFilterType = 'today' | 'yesterday' | 'custom';
type TabType = 'all' | 'active' | 'discharged';
type ViewMode = 'table' | 'cards';

const getEntityId = (entity: { id?: string; _id?: string } | null | undefined): string | undefined =>
  entity?._id || entity?.id;

const getPatientName = (patient: any): string => {
  if (!patient) return 'Unknown Patient';
  return (
    patient.name ||
    patient.fullName ||
    `${patient.surname || ''} ${patient.otherNames || ''}`.trim() ||
    'Unknown Patient'
  );
};

const calculateAge = (dateOfBirth: string): number => {
  if (!dateOfBirth) return 0;
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
  return Math.max(0, age);
};

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

const formatDate = (dateString: string) => {
  if (!dateString) return '—';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Invalid Date';
  }
};

const formatTimeOnly = (dateString: string) => {
  if (!dateString) return '—';
  try {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Shared style tokens (matches DashboardLayout / WardManagement patterns)
// ─────────────────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  borderColor: 'var(--border-color)',
  boxShadow: 'var(--shadow-sm)',
};

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-main)',
  borderColor: 'var(--border-color)',
  color: 'var(--text-primary)',
};

// ─────────────────────────────────────────────────────────────────────────────
// Badges
// ─────────────────────────────────────────────────────────────────────────────

const AdmissionTypeBadge: React.FC<{ type: string }> = ({ type }) => {
  const base =
    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border';

  const variant = (() => {
    switch (type) {
      case 'day_surgery':
        return { bg: 'var(--icon-purple-bg)', color: 'var(--icon-purple-text)', Icon: Sun, label: 'DAY SURGERY' };
      case 'detention':
        return { bg: 'var(--icon-orange-bg)', color: 'var(--icon-orange-text)', Icon: Moon, label: 'OBSERVATION' };
      case 'antenatal':
        return { bg: 'var(--icon-red-bg)', color: 'var(--icon-red-text)', Icon: Baby, label: 'ANTENATAL' };
      case 'delivery':
        return { bg: 'var(--icon-green-bg)', color: 'var(--icon-green-text)', Icon: Heart, label: 'DELIVERY' };
      case 'formal_ipd':
      default:
        return { bg: 'var(--icon-green-bg)', color: 'var(--icon-green-text)', Icon: Hospital, label: 'IPD' };
    }
  })();

  const { Icon } = variant;

  return (
    <span
      className={base}
      style={{
        background: variant.bg,
        color: variant.color,
        borderColor: 'var(--border-color)',
      }}
    >
      <Icon className="w-2.5 h-2.5" />
      {variant.label}
    </span>
  );
};

const StatusBadge: React.FC<{ isDischarged: boolean }> = ({ isDischarged }) => {
  if (isDischarged) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border"
        style={{
          background: 'var(--bg-main)',
          color: 'var(--text-secondary)',
          borderColor: 'var(--border-color)',
        }}
      >
        <CheckCircle className="w-2.5 h-2.5" />
        DISCHARGED
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border"
      style={{
        background: 'var(--icon-green-bg)',
        color: 'var(--icon-green-text)',
        borderColor: 'var(--border-color)',
      }}
    >
      <CircleDot className="w-2.5 h-2.5 animate-pulse" />
      ACTIVE
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

export default function Admissions() {
  const { success, error } = useToast();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState<any>(null);
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [selectedDaycase, setSelectedDaycase] = useState<any>(null);
  const [dateFilter, setDateFilter] = useState<DateFilterType>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isDischarging, setIsDischarging] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('admissionsViewMode');
    return (saved as ViewMode) || 'table';
  });

  const {
    admissions,
    getAdmissions,
    convertDaycaseToIPD,
    dischargePatient,
    getDetentionPatients,
    getFormalIPDPatients,
  } = useAdmissionStore();
  const { patients, loadPatients } = usePatientStore();
  const { attendances, getAttendances } = useAttendanceStore();
  const { hasRole } = useAuthStore();

  useEffect(() => {
    localStorage.setItem('admissionsViewMode', viewMode);
  }, [viewMode]);

  const canDischarge = hasRole(['admin', 'doctor']);
  const canConvert = hasRole(['admin', 'doctor']);

  // ── Date range (memoized so live refresh sees fresh closures) ───────────
  const getDateRange = useCallback((): { startDate: Date; endDate: Date } | null => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    switch (dateFilter) {
      case 'today':
        return { startDate: today, endDate: endOfDay };
      case 'yesterday': {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const endOfYesterday = new Date(yesterday);
        endOfYesterday.setHours(23, 59, 59, 999);
        yesterday.setHours(0, 0, 0, 0);
        return { startDate: yesterday, endDate: endOfYesterday };
      }
      case 'custom':
        if (customStartDate && customEndDate) {
          const start = new Date(customStartDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          return { startDate: start, endDate: end };
        }
        return null;
      default:
        return null;
    }
  }, [dateFilter, customStartDate, customEndDate]);

  // ── Data loading ────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      setRefreshing(true);
      if (!hasLoadedOnce) setIsLoading(true);
      const range = getDateRange();
      await Promise.all([
        getAdmissions({ limit: 2000 }),
        loadPatients(),
        getAttendances({
          limit: 5000,
          ...(range
            ? { dateFrom: range.startDate.toISOString(), dateTo: range.endDate.toISOString() }
            : {}),
        }),
        getDetentionPatients(),
        getFormalIPDPatients(),
      ]);
    } catch (err: any) {
      error('Load Failed', err?.response?.data?.message || 'Failed to load admissions data');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
      setHasLoadedOnce(true);
    }
  }, [getAdmissions, loadPatients, getAttendances, getDetentionPatients, getFormalIPDPatients, getDateRange, hasLoadedOnce, error]);

  // ── Live refresh ────────────────────────────────────────────────────────
  useLiveRefresh(
    ['admissions', 'encounters', 'nursing'],
    async () => {
      const range = getDateRange();
      await Promise.all([
        getAdmissions({ limit: 2000 }, { silent: true }),
        getAttendances(
          {
            limit: 5000,
            ...(range
              ? { dateFrom: range.startDate.toISOString(), dateTo: range.endDate.toISOString() }
              : {}),
          },
          { silent: true },
        ),
        getDetentionPatients(),
        getFormalIPDPatients(),
      ]);
    },
    !(dateFilter === 'custom' && !(customStartDate && customEndDate)),
  );

  useEffect(() => {
    if (dateFilter === 'custom' && !(customStartDate && customEndDate)) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter, customStartDate, customEndDate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, dateFilter, customStartDate, customEndDate, activeTab]);

  // ── Derived lists ───────────────────────────────────────────────────────
  const formalIPD = useMemo(
    () => admissions.filter((a) => a.admissionType !== 'detention_observation'),
    [admissions],
  );
  const detention = useMemo(
    () => admissions.filter((a) => a.admissionType === 'detention_observation'),
    [admissions],
  );

  const daycasePatients = useMemo(
    () => attendances.filter((a) => a.encounterCategory === 'daycase' && a.status === 'admitted'),
    [attendances],
  );

  const virtualDaycaseAdmissions = useMemo(
    () =>
      daycasePatients.map((att) => ({
        id: att.id,
        admissionNumber: att.attendanceNumber || `DAY-${att.id.slice(-8)}`,
        attendanceId: att.id,
        admissionDate: att.dateTime || att.createdAt,
        dischargeDate: null,
        admissionType: 'day_surgery',
        admissionSource: 'opd',
        dischargeStatus: null,
        dailyNotes: [],
        createdAt: att.createdAt,
        updatedAt: att.updatedAt,
        attendance: att,
        isDaySurgery: true,
        isVirtual: true,
        status: 'admitted',
        displayType: 'day_surgery',
      })),
    [daycasePatients],
  );

  const allAdmissions = useMemo(() => {
    const formal = formalIPD.map((adm) => ({
      ...adm,
      isDaySurgery: false,
      isDetention: false,
      isVirtual: false,
      status: adm.dischargeDate ? 'discharged' : 'admitted',
      displayType: 'formal_ipd',
    }));
    const detentionList = detention.map((adm) => ({
      ...adm,
      isDaySurgery: false,
      isDetention: true,
      isVirtual: false,
      status: adm.dischargeDate ? 'discharged' : 'admitted',
      displayType: 'detention',
    }));
    const daySurgery = virtualDaycaseAdmissions;
    const admittedFromAttendances = attendances
      .filter(
        (a) =>
          a.status === 'admitted' &&
          a.encounterCategory === 'ipd' &&
          !formal.some((f) => f.attendanceId === a.id) &&
          !detentionList.some((d) => d.attendanceId === a.id),
      )
      .map((att) => ({
        id: att.id,
        admissionNumber: att.attendanceNumber || `ADM-${att.id.slice(-8)}`,
        attendanceId: att.id,
        admissionDate: att.dateTime || att.createdAt,
        dischargeDate: null,
        admissionType: att.admissionType || 'emergency',
        admissionSource: 'opd',
        dischargeStatus: null,
        dailyNotes: [],
        createdAt: att.createdAt,
        updatedAt: att.updatedAt,
        attendance: att,
        isDaySurgery: false,
        isDetention: false,
        isVirtual: true,
        status: 'admitted',
        displayType: 'formal_ipd',
      }));

    const existingAttendanceIds = new Set(
      [...formal, ...detentionList].map((a) => a.attendanceId),
    );
    const uniqueDaySurgery = daySurgery.filter((o) => !existingAttendanceIds.has(o.attendanceId));
    const uniqueFromAttendances = admittedFromAttendances.filter(
      (a) => !existingAttendanceIds.has(a.attendanceId),
    );

    return [...formal, ...detentionList, ...uniqueDaySurgery, ...uniqueFromAttendances];
  }, [formalIPD, detention, virtualDaycaseAdmissions, attendances]);

  const filteredAdmissions = useMemo(() => {
    if (!allAdmissions.length) return [];
    const dateRange = getDateRange();

    const filtered = allAdmissions.filter((admission) => {
      if (dateRange) {
        const admissionDate = new Date(admission.admissionDate);
        if (admissionDate < dateRange.startDate || admissionDate > dateRange.endDate) return false;
      }

      const isDischarged =
        admission.dischargeDate !== null || admission.attendance?.status === 'discharged';

      if (activeTab === 'active' && isDischarged) return false;
      if (activeTab === 'discharged' && !isDischarged) return false;

      if (searchQuery) {
        const patient =
          admission.attendance?.Patient ||
          patients.find((p) => p.id === admission.attendance?.patientId);
        const fullName = patient ? getPatientName(patient) : '';
        const lower = searchQuery.toLowerCase();
        return (
          admission.admissionNumber?.toLowerCase().includes(lower) ||
          fullName.toLowerCase().includes(lower) ||
          patient?.folderNumber?.toLowerCase().includes(lower) ||
          admission.attendance?.complaints?.toLowerCase().includes(lower)
        );
      }
      return true;
    });

    return filtered.sort(
      (a, b) => new Date(b.admissionDate).getTime() - new Date(a.admissionDate).getTime(),
    );
  }, [allAdmissions, patients, searchQuery, getDateRange, activeTab]);

  const activeAdmissions = filteredAdmissions.filter((a) => !a.dischargeDate);
  const dischargedAdmissions = filteredAdmissions.filter((a) => a.dischargeDate);
  const formalIPDCount = filteredAdmissions.filter(
    (a) => a.displayType === 'formal_ipd' && !a.dischargeDate,
  ).length;
  const detentionCount = filteredAdmissions.filter(
    (a) => a.displayType === 'detention' && !a.dischargeDate,
  ).length;
  const daySurgeryCount = filteredAdmissions.filter(
    (a) => a.displayType === 'day_surgery' && !a.dischargeDate,
  ).length;

  const totalPages = Math.ceil(filteredAdmissions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAdmissions = filteredAdmissions.slice(startIndex, startIndex + itemsPerPage);
  const goToPage = (page: number) => setCurrentPage(Math.max(1, Math.min(page, totalPages)));

  const getDateFilterDisplay = () => {
    switch (dateFilter) {
      case 'today':
        return 'Today';
      case 'yesterday':
        return 'Yesterday';
      case 'custom':
        if (customStartDate && customEndDate) {
          const fmt = (d: string) =>
            new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          return `${fmt(customStartDate)} – ${fmt(customEndDate)}`;
        }
        return 'Custom Range';
      default:
        return 'Today';
    }
  };

  const getLengthOfStay = (admission: any) => {
    const start = new Date(admission.admissionDate).getTime();
    const end = admission.dischargeDate
      ? new Date(admission.dischargeDate).getTime()
      : Date.now();
    return Math.max(0, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
  };

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleConvertToIPD = (daycaseAdmission: any) => {
    setSelectedDaycase(daycaseAdmission);
    setShowConvertModal(true);
  };

  const confirmConvertToIPD = async () => {
    if (!selectedDaycase) return;
    setIsConverting(true);
    try {
      await convertDaycaseToIPD(selectedDaycase.attendanceId, { admissionType: 'emergency' });
      success('Converted', 'Day surgery patient converted to formal IPD admission');
      await loadData();
      setShowConvertModal(false);
      setSelectedDaycase(null);
    } catch (err: any) {
      error('Conversion Failed', err?.message || 'Failed to convert');
    } finally {
      setIsConverting(false);
    }
  };

  const handleDischargePatient = (admission: any) => {
    setSelectedAdmission(admission);
    setShowDischargeModal(true);
  };

  const confirmDischarge = async () => {
    if (!selectedAdmission) return;
    setIsDischarging(true);
    try {
      await dischargePatient(selectedAdmission.attendanceId, {
        dischargeDate: new Date().toISOString(),
        dischargeStatus: 'home',
      });
      success('Patient Discharged', 'Patient has been successfully discharged');
      await loadData();
      setShowDischargeModal(false);
      setSelectedAdmission(null);
    } catch (err: any) {
      error('Discharge Failed', err?.message || 'Failed to discharge');
    } finally {
      setIsDischarging(false);
    }
  };

  // ── Initial full-page loader (cold start only) ──────────────────────────
  if (isLoading && !hasLoadedOnce) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: 'var(--bg-main)' }}
      >
        <div
          className="text-center p-8 rounded-xl border"
          style={cardStyle}
        >
          <Loader2
            className="w-10 h-10 mx-auto mb-4 animate-spin"
            style={{ color: 'var(--icon-cyan-text)' }}
          />
          <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            Loading Admissions…
          </h2>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Fetching patient list
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 sm:p-6" style={{ background: 'var(--bg-main)', minHeight: '100vh' }}>

      {/* ═══════════ Header ═══════════ */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--icon-cyan-text)' }}
          >
            <Hospital className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Patient Admissions
            </h1>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Manage IPD admissions, observation cases, and day surgery patients
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              {filteredAdmissions.length} total · {formalIPDCount} IPD · {detentionCount} Obs ·{' '}
              {daySurgeryCount} Day Surgery · {dischargedAdmissions.length} Discharged
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => navigate('/dashboard/wards')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: 'var(--icon-purple-bg)',
              color: 'var(--icon-purple-text)',
            }}
          >
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">Ward Management</span>
          </button>

          <button
            onClick={loadData}
            disabled={refreshing}
            aria-label="Refresh"
            title="Refresh"
            className="p-2 rounded-lg border transition-all disabled:opacity-50"
            style={{ ...cardStyle, color: 'var(--text-secondary)' }}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ═══════════ Stats row (compact tiles) ═══════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Active IPD',  value: formalIPDCount,              Icon: Hospital,    bg: 'var(--icon-green-bg)',  color: 'var(--icon-green-text)' },
          { label: 'Observation', value: detentionCount,              Icon: Moon,        bg: 'var(--icon-orange-bg)', color: 'var(--icon-orange-text)' },
          { label: 'Day Surgery', value: daySurgeryCount,             Icon: Sun,         bg: 'var(--icon-purple-bg)', color: 'var(--icon-purple-text)' },
          { label: 'Discharged',  value: dischargedAdmissions.length, Icon: CheckCircle, bg: 'var(--bg-main)',        color: 'var(--text-secondary)' },
        ].map((s) => {
          const Icon = s.Icon;
          return (
            <div
              key={s.label}
              className="rounded-xl px-4 py-3.5 border transition-shadow"
              style={cardStyle}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {s.label}
                </span>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: s.bg }}
                >
                  <Icon className="w-4 h-4" style={{ color: s.color }} />
                </div>
              </div>
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {s.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* ═══════════ Tabs ═══════════ */}
      <div
        className="rounded-xl border p-1 flex gap-1"
        style={cardStyle}
      >
        {[
          { id: 'all',        label: 'All',        count: filteredAdmissions.length },
          { id: 'active',     label: 'Active',     count: activeAdmissions.length },
          { id: 'discharged', label: 'Discharged', count: dischargedAdmissions.length },
        ].map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as TabType)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={
                isActive
                  ? { background: 'var(--icon-cyan-text)', color: '#fff', boxShadow: 'var(--shadow-sm)' }
                  : { color: 'var(--text-secondary)', background: 'transparent' }
              }
            >
              {t.label}
              <span
                className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                style={
                  isActive
                    ? { background: 'rgba(255,255,255,0.25)', color: '#fff' }
                    : { background: 'var(--bg-main)', color: 'var(--text-secondary)' }
                }
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ═══════════ Toolbar ═══════════ */}
      <div className="rounded-xl border" style={cardStyle}>
        <div className="p-3">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: 'var(--text-tertiary)' }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by patient name, folder number, admission number…"
                className="w-full pl-10 pr-9 py-2.5 text-sm rounded-lg border focus:outline-none focus:ring-2 transition-all"
                style={inputStyle}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Desktop filters */}
            <div className="hidden lg:flex items-center gap-2">
              <Calendar className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
              <div
                className="flex gap-1 rounded-lg p-1 border"
                style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
              >
                {[
                  { id: 'today',     label: 'Today' },
                  { id: 'yesterday', label: 'Yesterday' },
                  { id: 'custom',    label: 'Custom' },
                ].map((d) => (
                  <button
                    key={d.id}
                    onClick={() => {
                      setDateFilter(d.id as DateFilterType);
                      setShowDatePicker(d.id === 'custom');
                    }}
                    className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                    style={
                      dateFilter === d.id
                        ? {
                            background: 'var(--bg-card)',
                            color: 'var(--icon-cyan-text)',
                            boxShadow: 'var(--shadow-sm)',
                          }
                        : { color: 'var(--text-secondary)' }
                    }
                  >
                    {d.label}
                  </button>
                ))}
              </div>

              {/* View toggle */}
              <div
                className="flex items-center rounded-lg p-1 border"
                style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
              >
                {(['table', 'cards'] as ViewMode[]).map((mode) => {
                  const Icon = mode === 'table' ? List : LayoutGrid;
                  const isActive = viewMode === mode;
                  return (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                      style={
                        isActive
                          ? {
                              background: 'var(--bg-card)',
                              color: 'var(--icon-cyan-text)',
                              boxShadow: 'var(--shadow-sm)',
                            }
                          : { color: 'var(--text-tertiary)' }
                      }
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {mode === 'table' ? 'Table' : 'Cards'}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Custom date range */}
          {showDatePicker && dateFilter === 'custom' && (
            <div
              className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-2 transition-all"
                style={inputStyle}
              />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                to
              </span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-2 transition-all"
                style={inputStyle}
              />
              <span className="ml-auto text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Showing:{' '}
                <strong style={{ color: 'var(--text-primary)' }}>{getDateFilterDisplay()}</strong>
              </span>
            </div>
          )}

          {/* Mobile controls */}
          <div
            className="lg:hidden flex items-center gap-2 mt-3 pt-3 border-t flex-wrap"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <Calendar className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
            <div
              className="flex gap-1 rounded-lg p-1 border flex-1"
              style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
            >
              {[
                { id: 'today',     label: 'Today' },
                { id: 'yesterday', label: 'Yest.' },
                { id: 'custom',    label: 'Custom' },
              ].map((d) => (
                <button
                  key={d.id}
                  onClick={() => {
                    setDateFilter(d.id as DateFilterType);
                    setShowDatePicker(d.id === 'custom');
                  }}
                  className="flex-1 px-2 py-1.5 rounded-md text-[11px] font-medium transition-all"
                  style={
                    dateFilter === d.id
                      ? {
                          background: 'var(--bg-card)',
                          color: 'var(--icon-cyan-text)',
                          boxShadow: 'var(--shadow-sm)',
                        }
                      : { color: 'var(--text-secondary)' }
                  }
                >
                  {d.label}
                </button>
              ))}
            </div>
            <div
              className="flex items-center rounded-lg p-1 border"
              style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
            >
              {(['table', 'cards'] as ViewMode[]).map((mode) => {
                const Icon = mode === 'table' ? List : LayoutGrid;
                const isActive = viewMode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    aria-label={mode === 'table' ? 'Table view' : 'Cards view'}
                    className="px-2.5 py-1.5 rounded-md transition-all"
                    style={
                      isActive
                        ? {
                            background: 'var(--bg-card)',
                            color: 'var(--icon-cyan-text)',
                            boxShadow: 'var(--shadow-sm)',
                          }
                        : { color: 'var(--text-tertiary)' }
                    }
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ List ═══════════ */}
      {filteredAdmissions.length === 0 ? (
        <div className="rounded-xl p-12 text-center border" style={cardStyle}>
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--icon-cyan-bg)' }}
          >
            <Hospital className="w-8 h-8" style={{ color: 'var(--icon-cyan-text)' }} />
          </div>
          <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            {searchQuery ? 'No Admissions Found' : 'No Admissions Yet'}
          </h3>
          <p className="text-sm max-w-sm mx-auto" style={{ color: 'var(--text-secondary)' }}>
            {searchQuery
              ? 'No records match your search or filter criteria.'
              : 'No patients are currently admitted or under observation for this period.'}
          </p>
        </div>
      ) : viewMode === 'table' ? (
        <>
          {/* ── Table ── */}
          <div className="rounded-xl border overflow-hidden" style={cardStyle}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead
                  className="border-b"
                  style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
                >
                  <tr>
                    {['Patient', 'Type', 'ID', 'Admission', 'Location', 'Stay', 'Status', 'Actions'].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedAdmissions.map((admission) => {
                    const patient =
                      admission.attendance?.Patient ||
                      patients.find((p) => p.id === admission.attendance?.patientId);
                    const fullName = patient ? getPatientName(patient) : 'Unknown Patient';
                    const wardName = admission.attendance?.Ward?.wardName || '—';
                    const bedNumber = admission.attendance?.Bed?.bedNumber || '—';
                    const isDischarged = !!admission.dischargeDate;
                    const stayDays = getLengthOfStay(admission);

                    const avatarBg =
                      admission.displayType === 'day_surgery'
                        ? 'var(--icon-purple-bg)'
                        : admission.displayType === 'detention'
                        ? 'var(--icon-orange-bg)'
                        : 'var(--icon-green-bg)';

                    return (
                      <tr
                        key={admission.id}
                        className="transition-colors"
                        style={{ borderTop: '1px solid var(--border-color)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-main)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 rounded-full border flex items-center justify-center flex-shrink-0"
                              style={{ background: avatarBg, borderColor: 'var(--border-color)' }}
                            >
                              <span className="text-[10px] font-bold" style={{ color: 'var(--text-primary)' }}>
                                {initials(fullName)}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                                {fullName}
                              </p>
                              <p className="text-[10px] flex items-center gap-1.5" style={{ color: 'var(--text-tertiary)' }}>
                                <span className="font-mono">{patient?.folderNumber || '—'}</span>
                                <span className="opacity-40">·</span>
                                <span>{patient?.gender || '—'}</span>
                                <span className="opacity-40">·</span>
                                <span>
                                  {patient?.dateOfBirth ? `${calculateAge(patient.dateOfBirth)}y` : '?'}
                                </span>
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <AdmissionTypeBadge type={admission.displayType} />
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="text-xs font-mono font-semibold px-2 py-0.5 rounded border"
                            style={{
                              color: 'var(--text-primary)',
                              background: 'var(--bg-main)',
                              borderColor: 'var(--border-color)',
                            }}
                          >
                            {admission.admissionNumber}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs">
                            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                              {formatDate(admission.admissionDate)}
                            </p>
                            <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                              {formatTimeOnly(admission.admissionDate)}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-xs">
                            <MapPin className="w-3 h-3" style={{ color: 'var(--text-tertiary)' }} />
                            <span className="truncate" style={{ color: 'var(--text-primary)' }}>
                              {wardName}
                            </span>
                            <span style={{ color: 'var(--text-tertiary)' }}>/</span>
                            <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
                              {bedNumber}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                            {stayDays} day{stayDays !== 1 ? 's' : ''}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge isDischarged={isDischarged} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              to={`/dashboard/admissions/${admission.id}`}
                              aria-label="View admission details"
                              title="View Admission Details"
                              className="p-1.5 rounded-lg transition-all"
                              style={{ color: 'var(--text-tertiary)' }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = 'var(--icon-cyan-text)';
                                e.currentTarget.style.background = 'var(--icon-cyan-bg)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = 'var(--text-tertiary)';
                                e.currentTarget.style.background = 'transparent';
                              }}
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </Link>
                            {admission.attendance?.id && (
                              <Link
                                to={`/dashboard/medical-entries/${admission.attendance.id}`}
                                aria-label="View medical records"
                                title="View Medical Records"
                                className="p-1.5 rounded-lg transition-all"
                                style={{ color: 'var(--text-tertiary)' }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.color = 'var(--icon-purple-text)';
                                  e.currentTarget.style.background = 'var(--icon-purple-bg)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.color = 'var(--text-tertiary)';
                                  e.currentTarget.style.background = 'transparent';
                                }}
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Link>
                            )}
                            {admission.displayType === 'day_surgery' && !isDischarged && canConvert && (
                              <button
                                onClick={() => handleConvertToIPD(admission)}
                                aria-label="Convert to IPD"
                                title="Convert to IPD"
                                className="p-1.5 rounded-lg transition-all"
                                style={{ color: 'var(--text-tertiary)' }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.color = 'var(--icon-purple-text)';
                                  e.currentTarget.style.background = 'var(--icon-purple-bg)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.color = 'var(--text-tertiary)';
                                  e.currentTarget.style.background = 'transparent';
                                }}
                              >
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {!isDischarged && canDischarge && (
                              <button
                                onClick={() => handleDischargePatient(admission)}
                                aria-label="Discharge patient"
                                title="Discharge Patient"
                                className="p-1.5 rounded-lg transition-all"
                                style={{ color: 'var(--text-tertiary)' }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.color = 'var(--icon-green-text)';
                                  e.currentTarget.style.background = 'var(--icon-green-bg)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.color = 'var(--text-tertiary)';
                                  e.currentTarget.style.background = 'transparent';
                                }}
                              >
                                <LogOut className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Pagination ── */}
          {filteredAdmissions.length > 0 && (
            <div className="rounded-xl p-4 border" style={cardStyle}>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Showing <strong style={{ color: 'var(--text-primary)' }}>{startIndex + 1}</strong> to{' '}
                    <strong style={{ color: 'var(--text-primary)' }}>
                      {Math.min(startIndex + itemsPerPage, filteredAdmissions.length)}
                    </strong>{' '}
                    of <strong style={{ color: 'var(--text-primary)' }}>{filteredAdmissions.length}</strong>
                  </div>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-2 py-1.5 text-xs rounded-lg border"
                    style={inputStyle}
                  >
                    {[10, 25, 50, 100].map((n) => (
                      <option key={n} value={n}>
                        {n} per page
                      </option>
                    ))}
                  </select>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      aria-label="Previous page"
                      className="p-2 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ borderColor: 'var(--border-color)' }}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-3 py-1 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      aria-label="Next page"
                      className="p-2 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ borderColor: 'var(--border-color)' }}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        /* ═══════════ Cards view ═══════════ */
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {paginatedAdmissions.map((admission) => {
              const patient =
                admission.attendance?.Patient ||
                patients.find((p) => p.id === admission.attendance?.patientId);
              const fullName = patient ? getPatientName(patient) : 'Unknown Patient';
              const wardName = admission.attendance?.Ward?.wardName || '—';
              const bedNumber = admission.attendance?.Bed?.bedNumber || '—';
              const isDischarged = !!admission.dischargeDate;
              const stayDays = getLengthOfStay(admission);

              const avatarBg =
                admission.displayType === 'day_surgery'
                  ? 'var(--icon-purple-bg)'
                  : admission.displayType === 'detention'
                  ? 'var(--icon-orange-bg)'
                  : 'var(--icon-green-bg)';

              return (
                <div
                  key={admission.id}
                  className="rounded-xl border transition-all overflow-hidden flex flex-col"
                  style={cardStyle}
                >
                  {/* Header */}
                  <div
                    className="p-4 pb-3 border-b"
                    style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <AdmissionTypeBadge type={admission.displayType} />
                      <StatusBadge isDischarged={isDischarged} />
                    </div>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0"
                        style={{ background: avatarBg, borderColor: 'var(--border-color)' }}
                      >
                        <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                          {initials(fullName)}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                          {fullName}
                        </p>
                        <p className="text-[10px] font-mono" style={{ color: 'var(--text-tertiary)' }}>
                          #{patient?.folderNumber || '—'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-4 space-y-2.5 flex-1 text-xs">
                    {[
                      { icon: Hash,     label: 'Admission #',    value: admission.admissionNumber, mono: true },
                      { icon: Calendar, label: 'Admitted',       value: formatDate(admission.admissionDate) },
                      {
                        icon: MapPin,
                        label: 'Location',
                        value: `${wardName} / ${bedNumber}`,
                      },
                      {
                        icon: Clock,
                        label: 'Length of stay',
                        value: `${stayDays} day${stayDays !== 1 ? 's' : ''}`,
                        bold: true,
                      },
                    ].map((row) => {
                      const Icon = row.icon;
                      return (
                        <div key={row.label} className="flex items-center justify-between gap-2">
                          <span
                            className="flex items-center gap-1"
                            style={{ color: 'var(--text-tertiary)' }}
                          >
                            <Icon className="w-3 h-3" />
                            {row.label}
                          </span>
                          <span
                            className={`truncate max-w-[60%] text-right ${row.mono ? 'font-mono' : ''} ${
                              row.bold ? 'font-semibold' : 'font-medium'
                            }`}
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {row.value}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer */}
                  <div
                    className="px-4 py-3 border-t flex items-center justify-between gap-2"
                    style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
                  >
                    <div className="flex items-center gap-1">
                      <Link
                        to={`/dashboard/admissions/${admission.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg transition-all"
                        style={{ background: 'var(--icon-cyan-bg)', color: 'var(--icon-cyan-text)' }}
                      >
                        <FileText className="w-3 h-3" />
                        Details
                      </Link>
                      {admission.attendance?.id && (
                        <Link
                          to={`/dashboard/medical-entries/${admission.attendance.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg transition-all"
                          style={{ background: 'var(--icon-purple-bg)', color: 'var(--icon-purple-text)' }}
                        >
                          <Eye className="w-3 h-3" />
                          Records
                        </Link>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5">
                      {admission.displayType === 'day_surgery' && !isDischarged && canConvert && (
                        <button
                          onClick={() => handleConvertToIPD(admission)}
                          aria-label="Convert to IPD"
                          title="Convert to IPD"
                          className="p-1.5 rounded-lg transition-all"
                          style={{ color: 'var(--text-tertiary)' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = 'var(--icon-purple-text)';
                            e.currentTarget.style.background = 'var(--icon-purple-bg)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'var(--text-tertiary)';
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {!isDischarged && canDischarge && (
                        <button
                          onClick={() => handleDischargePatient(admission)}
                          aria-label="Discharge patient"
                          title="Discharge"
                          className="p-1.5 rounded-lg transition-all"
                          style={{ color: 'var(--text-tertiary)' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = 'var(--icon-green-text)';
                            e.currentTarget.style.background = 'var(--icon-green-bg)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'var(--text-tertiary)';
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <LogOut className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Pagination ── */}
          {filteredAdmissions.length > 0 && (
            <div className="rounded-xl p-4 border" style={cardStyle}>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Showing <strong style={{ color: 'var(--text-primary)' }}>{startIndex + 1}</strong> to{' '}
                    <strong style={{ color: 'var(--text-primary)' }}>
                      {Math.min(startIndex + itemsPerPage, filteredAdmissions.length)}
                    </strong>{' '}
                    of <strong style={{ color: 'var(--text-primary)' }}>{filteredAdmissions.length}</strong>
                  </div>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-2 py-1.5 text-xs rounded-lg border"
                    style={inputStyle}
                  >
                    {[10, 25, 50, 100].map((n) => (
                      <option key={n} value={n}>
                        {n} per page
                      </option>
                    ))}
                  </select>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      aria-label="Previous page"
                      className="p-2 rounded-lg border transition-colors disabled:opacity-40"
                      style={{ borderColor: 'var(--border-color)' }}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-3 py-1 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      aria-label="Next page"
                      className="p-2 rounded-lg border transition-colors disabled:opacity-40"
                      style={{ borderColor: 'var(--border-color)' }}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══════════ Convert Modal ═══════════ */}
      <ConfirmationModal
        isOpen={showConvertModal}
        onClose={() => {
          setShowConvertModal(false);
          setSelectedDaycase(null);
        }}
        onConfirm={confirmConvertToIPD}
        title="Convert to IPD"
        message="Convert this day surgery patient to a formal IPD admission? This will create a full inpatient record."
        confirmText="Convert to IPD"
        cancelText="Cancel"
        type="info"
        isLoading={isConverting}
      />

      {/* ═══════════ Discharge Modal ═══════════ */}
      <ConfirmationModal
        isOpen={showDischargeModal}
        onClose={() => {
          setShowDischargeModal(false);
          setSelectedAdmission(null);
        }}
        onConfirm={confirmDischarge}
        title="Confirm Discharge"
        message="Are you sure you want to discharge this patient? Their bed will be freed and the admission will be marked as complete. This cannot be undone."
        confirmText="Confirm Discharge"
        cancelText="Cancel"
        type="warning"
        isLoading={isDischarging}
      />
    </div>
  );
}