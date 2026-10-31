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
  Hospital, Calendar, Clock, CheckCircle, X,
  RefreshCw, FileText, Loader2, Eye,
  Building2, Moon, Sun, ArrowRight, LogOut,
  Hash, LayoutGrid, List, CircleDot, MapPin, Baby, Heart,
} from 'lucide-react';
import {
  Button,
  Card,
  cn,
  PageHeader,
  Pagination,
  SearchInput,
  Segmented,
  StatCard,
  Tabs,
  TD,
  TD_MONO,
  TH,
  TH_ROW,
  TR,
} from '../components/ui';

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

const StatusBadge: React.FC<{ isDischarged: boolean; isCancelled?: boolean }> = ({ isDischarged, isCancelled = false }) => {
  if (isCancelled) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border"
        style={{ background: 'var(--bg-main)', color: 'var(--text-tertiary)', borderColor: 'var(--border-color)' }}
      >
        <X className="w-2.5 h-2.5" />
        CANCELLED
      </span>
    );
  }
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
  const [showCancelAdmissionModal, setShowCancelAdmissionModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isCancellingAdmission, setIsCancellingAdmission] = useState(false);
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
    deleteAdmission,
    getDetentionPatients,
    getFormalIPDPatients,
  } = useAdmissionStore();
  // Admission rows arrive with their patient already attached; the register is only consulted as
  // a last-resort name fallback, so this page never downloads it on open.
  const { patients } = usePatientStore();
  // Indexed once: the name fallback is consulted per admission row while filtering, and a
  // linear scan of the register from there froze the page on a long ward list.
  const patientById = useMemo(
    () => new Map((patients || []).map((p: any) => [p.id, p] as [string, any])),
    [patients],
  );

  // Admission rows come from the admissions API, whose relations are lower-cased
  // (attendance.patient, admission.patient) on top of the copied patientName /
  // folderNumber / wardName / bedNumber fields. Read every shape, so a row is
  // never rendered as "Unknown Patient".
  const rowPatient = (a: any) =>
    a?.attendance?.Patient ||
    a?.attendance?.patient ||
    a?.patient ||
    patientById.get(a?.attendance?.patientId || a?.patientId) ||
    null;
  const rowPatientName = (a: any) =>
    rowPatient(a) ? getPatientName(rowPatient(a)) : (a?.patientName || 'Unknown Patient');
  const rowFolderNumber = (a: any) => rowPatient(a)?.folderNumber || a?.folderNumber || '—';
  const rowWardName = (a: any) =>
    a?.attendance?.Ward?.wardName || a?.attendance?.ward?.wardName || a?.ward?.wardName || a?.wardName || '—';
  const rowBedNumber = (a: any) =>
    a?.attendance?.Bed?.bedNumber || a?.attendance?.bed?.bedNumber || a?.bed?.bedNumber || a?.bedNumber || '—';
  const { attendances, getAttendances } = useAttendanceStore();
  const { hasRole } = useAuthStore();

  useEffect(() => {
    localStorage.setItem('admissionsViewMode', viewMode);
  }, [viewMode]);

  const canDischarge = hasRole(['admin', 'doctor']);
  const canCancelAdmission = hasRole(['admin', 'super_admin']);
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
      // Avoid starting several large paginated database queries at once.
      // This page intentionally loads these lists sequentially to prevent API/DB
      // overload and the 30-second Axios timeouts seen during initial page load.
      await getAdmissions({ limit: 2000 });
      await getDetentionPatients();
      await getFormalIPDPatients();
      // Only admitted encounters are needed here (the day-surgery and IPD census rows), and
      // deliberately without the date filter: an inpatient stays on the list however long ago
      // they were admitted. Every admission row already carries its patient, so this screen
      // does not download the patient register.
      await getAttendances({ status: 'admitted', limit: 500 });
    } catch (err: any) {
      error('Load Failed', err?.response?.data?.message || 'Failed to load admissions data');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
      setHasLoadedOnce(true);
    }
  }, [getAdmissions, getAttendances, getDetentionPatients, getFormalIPDPatients, hasLoadedOnce, error]);

  // ── Live refresh ────────────────────────────────────────────────────────
  useLiveRefresh(
    ['admissions', 'encounters', 'nursing'],
    async () => {
      // Keep live refreshes from competing for database connections.
      await getAdmissions({ limit: 2000 }, { silent: true });
      await getDetentionPatients();
      await getFormalIPDPatients();
      await getAttendances({ status: 'admitted', limit: 500 }, { silent: true });
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
        attendanceNumber: att.attendanceNumber,
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
      status: adm.status === 'cancelled' ? 'cancelled' : (adm.dischargeDate ? 'discharged' : 'admitted'),
      displayType: 'formal_ipd',
    }));
    const detentionList = detention.map((adm) => ({
      ...adm,
      isDaySurgery: false,
      isDetention: true,
      isVirtual: false,
      status: adm.status === 'cancelled' ? 'cancelled' : (adm.dischargeDate ? 'discharged' : 'admitted'),
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
        attendanceNumber: att.attendanceNumber,
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

  /** Date and search narrow the page; the status tab is applied afterwards so the
   *  counters keep reporting the whole page instead of collapsing to the open tab. */
  const searchedAdmissions = useMemo(() => {
    if (!allAdmissions.length) return [];
    const dateRange = getDateRange();

    const filtered = allAdmissions.filter((admission) => {
      const isCancelled = admission.status === 'cancelled';
      const isDischarged =
        admission.dischargeDate !== null || admission.attendance?.status === 'discharged';

      // The admissions page is also the current inpatient census. Do not hide
      // an active inpatient simply because the original admission date is
      // before the selected historical date range. Date filters apply to
      // closed/cancelled records; active patients remain visible until closed.
      if (dateRange && (isDischarged || isCancelled)) {
        const admissionDate = new Date(admission.admissionDate);
        if (admissionDate < dateRange.startDate || admissionDate > dateRange.endDate) return false;
      }

      if (searchQuery) {
        const patient = rowPatient(admission);
        const fullName = rowPatientName(admission);
        const lower = searchQuery.toLowerCase();
        return (
          admission.admissionNumber?.toLowerCase().includes(lower) ||
          admission.attendanceNumber?.toLowerCase().includes(lower) ||
          fullName.toLowerCase().includes(lower) ||
          (patient?.folderNumber || (admission as any).folderNumber || '')?.toLowerCase().includes(lower) ||
          admission.attendance?.complaints?.toLowerCase().includes(lower)
        );
      }
      return true;
    });

    return filtered.sort(
      (a, b) => new Date(b.admissionDate).getTime() - new Date(a.admissionDate).getTime(),
    );
  }, [allAdmissions, patientById, searchQuery, getDateRange]);

  const isClosed = (a: any) => a.dischargeDate !== null || a.attendance?.status === 'discharged';
  const isCancelled = (a: any) => a.status === 'cancelled';

  const filteredAdmissions = useMemo(() => {
    if (activeTab === 'active') return searchedAdmissions.filter((a) => !isClosed(a) && !isCancelled(a));
    if (activeTab === 'discharged') return searchedAdmissions.filter((a) => isClosed(a) && !isCancelled(a));
    return searchedAdmissions;
  }, [searchedAdmissions, activeTab]);

  const activeAdmissions = searchedAdmissions.filter((a) => !isClosed(a) && !isCancelled(a));
  const dischargedAdmissions = searchedAdmissions.filter((a) => isClosed(a) && !isCancelled(a));
  const formalIPDCount = searchedAdmissions.filter(
    (a) => a.displayType === 'formal_ipd' && !isClosed(a) && !isCancelled(a),
  ).length;
  const detentionCount = searchedAdmissions.filter(
    (a) => a.displayType === 'detention' && !isClosed(a) && !isCancelled(a),
  ).length;
  const daySurgeryCount = searchedAdmissions.filter(
    (a) => a.displayType === 'day_surgery' && !isClosed(a) && !isCancelled(a),
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

  const handleCancelAdmission = (admission: any) => {
    setSelectedAdmission(admission);
    setCancellationReason('');
    setShowCancelAdmissionModal(true);
  };

  const confirmCancelAdmission = async () => {
    if (!selectedAdmission || !cancellationReason.trim()) {
      error('Cancellation Reason Required', 'Enter why this admission was created in error.');
      return;
    }
    setIsCancellingAdmission(true);
    try {
      await deleteAdmission(selectedAdmission.id, cancellationReason.trim());
      success('Admission Cancelled', 'The admission history was retained and the patient visit returned to OPD.');
      await loadData();
      setShowCancelAdmissionModal(false);
      setSelectedAdmission(null);
      setCancellationReason('');
    } catch (err: any) {
      error('Cancellation Failed', err?.response?.data?.message || err?.message || 'Unable to cancel admission');
    } finally {
      setIsCancellingAdmission(false);
    }
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
    <div className="space-y-6 p-4 sm:p-6" style={{ background: 'var(--bg-main)', minHeight: '100vh' }}>

      <PageHeader
        title="Patient Admissions"
        subtitle="Manage IPD admissions, observation cases, and day surgery patients"
        meta={`${searchedAdmissions.length} total · ${formalIPDCount} IPD · ${detentionCount} Obs · ${daySurgeryCount} Day Surgery · ${dischargedAdmissions.length} Discharged`}
        icon={Hospital}
        accent="cyan"
        backTo="/dashboard"
        tabs={(
          <Tabs<TabType>
            tabs={[
              { key: 'all', label: 'All', count: searchedAdmissions.length },
              { key: 'active', label: 'Active', count: activeAdmissions.length },
              { key: 'discharged', label: 'Discharged', count: dischargedAdmissions.length },
            ]}
            active={activeTab}
            onChange={setActiveTab}
            aria-label="Admission status"
          />
        )}
        actions={(
          <>
            <Button variant="secondary" icon={Building2} onClick={() => navigate('/dashboard/wards')}>
              Ward Management
            </Button>
            <Button icon={RefreshCw} loading={refreshing} onClick={loadData}>Refresh</Button>
          </>
        )}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Active IPD" value={formalIPDCount} icon={Hospital} accent="green" />
        <StatCard label="Observation" value={detentionCount} icon={Moon} accent="orange" />
        <StatCard label="Day Surgery" value={daySurgeryCount} icon={Sun} accent="purple" />
        <StatCard label="Discharged" value={dischargedAdmissions.length} icon={CheckCircle} accent="blue" />
      </div>

      <Card>
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by patient name, folder number, admission number…"
          />
          <div className="flex items-center gap-2 flex-wrap">
            <Segmented<DateFilterType>
              options={[
                { value: 'today', label: 'Today' },
                { value: 'yesterday', label: 'Yesterday' },
                { value: 'custom', label: 'Custom' },
              ]}
              value={dateFilter}
              onChange={(value) => {
                setDateFilter(value);
                setShowDatePicker(value === 'custom');
              }}
              aria-label="Admission date filter"
            />
            <Segmented<ViewMode>
              options={[
                { value: 'table', label: 'Table', icon: List },
                { value: 'cards', label: 'Cards', icon: LayoutGrid },
              ]}
              value={viewMode}
              onChange={setViewMode}
              aria-label="View mode"
            />
          </div>
        </div>

        {showDatePicker && dateFilter === 'custom' && (
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-[var(--border-color)]">
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-2 transition-all"
              style={inputStyle}
            />
            <span className="text-xs text-[var(--text-secondary)]">to</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-2 transition-all"
              style={inputStyle}
            />
            <span className="ml-auto text-xs text-[var(--text-tertiary)]">
              Showing: <strong className="text-[var(--text-primary)]">{getDateFilterDisplay()}</strong>
            </span>
          </div>
        )}
      </Card>

      {/* ═══════════ List ═══════════ */}
      {filteredAdmissions.length === 0 ? (
        <Card>
          <div className="py-10 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-[var(--icon-cyan-bg)]">
              <Hospital className="w-8 h-8 text-[var(--icon-cyan-text)]" />
            </div>
            <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">
              {searchQuery ? 'No Admissions Found' : 'No Admissions Yet'}
            </h3>
            <p className="text-sm max-w-sm mx-auto text-[var(--text-secondary)]">
              {searchQuery
                ? 'No records match your search or filter criteria.'
                : 'No patients are currently admitted or under observation for this period.'}
            </p>
          </div>
        </Card>
      ) : viewMode === 'table' ? (
        <>
          {/* ── Table ── */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className={TH_ROW}>
                  <tr>
                    {['Patient', 'Folder #', 'Attendance #', 'Type', 'ID', 'Admission', 'Location', 'Stay', 'Status', 'Actions'].map((h) => (
                      <th key={h} className={h === 'Actions' ? cn(TH, 'text-right') : TH}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedAdmissions.map((admission) => {
                    const patient = rowPatient(admission);
                    const fullName = rowPatientName(admission);
                    const wardName = rowWardName(admission);
                    const bedNumber = rowBedNumber(admission);
                    const isDischarged = !!admission.dischargeDate;
                    const stayDays = getLengthOfStay(admission);

                    const avatarBg =
                      admission.displayType === 'day_surgery'
                        ? 'var(--icon-purple-bg)'
                        : admission.displayType === 'detention'
                        ? 'var(--icon-orange-bg)'
                        : 'var(--icon-green-bg)';

                    return (
                      <tr key={admission.id} className={TR}>
                        <td className={TD}>
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
                                <span>{patient?.gender || '—'}</span>
                                <span className="opacity-40">·</span>
                                <span>
                                  {patient?.dateOfBirth ? `${calculateAge(patient.dateOfBirth)}y` : '?'}
                                </span>
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className={TD_MONO}>
                          {rowFolderNumber(admission)}
                        </td>
                        <td className={TD_MONO}>
                          {admission.attendanceNumber || admission.attendance?.attendanceNumber || '—'}
                        </td>
                        <td className={TD}>
                          <AdmissionTypeBadge type={admission.displayType} />
                        </td>
                        <td className={TD}>
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
                        <td className={TD}>
                          <div className="text-xs">
                            <p className="font-medium text-[var(--text-primary)]">
                              {formatDate(admission.admissionDate)}
                            </p>
                            <p className="text-[10px] text-[var(--text-tertiary)]">
                              {formatTimeOnly(admission.admissionDate)}
                            </p>
                          </div>
                        </td>
                        <td className={TD}>
                          <div className="flex items-center gap-1 text-xs">
                            <MapPin className="w-3 h-3 text-[var(--text-tertiary)]" />
                            <span className="truncate text-[var(--text-primary)]">{wardName}</span>
                            <span className="text-[var(--text-tertiary)]">/</span>
                            <span className="font-mono text-[var(--text-secondary)]">{bedNumber}</span>
                          </div>
                        </td>
                        <td className={TD}>
                          <span className="text-xs font-medium text-[var(--text-primary)]">
                            {stayDays} day{stayDays !== 1 ? 's' : ''}
                          </span>
                        </td>
                        <td className={TD}>
                          <StatusBadge isDischarged={isDischarged} isCancelled={admission.status === 'cancelled'} />
                        </td>
                        <td className={TD}>
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
                            {!isDischarged && admission.status !== 'cancelled' && !admission.isVirtual && canCancelAdmission && (
                              <button
                                onClick={() => handleCancelAdmission(admission)}
                                aria-label="Cancel admission entered in error"
                                title="Cancel Admission (entered in error)"
                                className="p-1.5 rounded-lg transition-all"
                                style={{ color: 'var(--text-tertiary)' }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.color = 'var(--icon-red-text)';
                                  e.currentTarget.style.background = 'var(--icon-red-bg)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.color = 'var(--text-tertiary)';
                                  e.currentTarget.style.background = 'transparent';
                                }}
                              >
                                <X className="w-3.5 h-3.5" />
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

          <Pagination
            page={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={filteredAdmissions.length}
            noun="admissions"
            onChange={goToPage}
            pageSizeOptions={[10, 25, 50, 100]}
            onPageSizeChange={(size) => { setItemsPerPage(size); setCurrentPage(1); }}
          />
        </>
      ) : (
        /* ═══════════ Cards view ═══════════ */
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {paginatedAdmissions.map((admission) => {
              const fullName = rowPatientName(admission);
              const wardName = rowWardName(admission);
              const bedNumber = rowBedNumber(admission);
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
                          #{rowFolderNumber(admission)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-4 space-y-2.5 flex-1 text-xs">
                    {[
                      { icon: Hash,     label: 'Attendance #',   value: admission.attendanceNumber || admission.attendance?.attendanceNumber || '—', mono: true },
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

          <Pagination
            page={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={filteredAdmissions.length}
            noun="admissions"
            onChange={goToPage}
            pageSizeOptions={[10, 25, 50, 100]}
            onPageSizeChange={(size) => { setItemsPerPage(size); setCurrentPage(1); }}
          />
        </>
      )}

      {/* ═══════════ Admission Cancellation Modal ═══════════ */}
      {showCancelAdmissionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-labelledby="cancel-admission-title">
          <div className="w-full max-w-lg rounded-2xl border shadow-2xl" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <div className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="rounded-xl p-2" style={{ background: 'var(--icon-red-bg)', color: 'var(--icon-red-text)' }}><X className="w-5 h-5" /></div>
                <div>
                  <h2 id="cancel-admission-title" className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Cancel Admission</h2>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Use only when the admission was entered in error and inpatient care has not begun. The record will be retained for audit.</p>
                </div>
              </div>
              <label htmlFor="admission-cancellation-reason" className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>Reason for cancellation</label>
              <textarea
                id="admission-cancellation-reason"
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Explain why this admission was entered in error…"
                className="w-full rounded-lg border px-3 py-2 text-sm resize-y"
                style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                disabled={isCancellingAdmission}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Billing or inpatient-care records will block cancellation; use discharge or the approved correction workflow instead.</p>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
              <button onClick={() => { setShowCancelAdmissionModal(false); setSelectedAdmission(null); setCancellationReason(''); }} disabled={isCancellingAdmission} className="px-4 py-2 rounded-lg border text-sm font-medium" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>Keep Admission</button>
              <button onClick={confirmCancelAdmission} disabled={isCancellingAdmission || cancellationReason.trim().length < 5} className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'var(--icon-red-text)' }}>
                {isCancellingAdmission ? 'Cancelling…' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
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