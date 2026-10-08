// src/pages/Admissions.tsx — Enhanced UI/UX
import { useLiveRefresh } from '../api/realtime';
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAdmissionStore } from '../store/admissionStore';
import { usePatientStore } from '../store/patientStore';
import { useAttendanceStore } from '../store/attendanceStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import { useHospitalStore } from '../store/hospitalStore';
import {
  Search, Users, Hospital, Calendar, Clock, CheckCircle, X,
  RefreshCw, User, Stethoscope, FileText, Bed, AlertCircle,
  Loader2, Eye, ChevronLeft, ChevronRight, Activity,
  ClipboardList, Building2, Moon, Sun, ArrowRight, LogOut,
  Hash, Phone, XCircle, AlertTriangle, LayoutGrid, List,
  CircleDot, TrendingUp, ShieldCheck, ChevronDown, Filter,
  Sparkles, ArrowUpRight, Heart, Baby, MapPin, Info,
} from 'lucide-react';

type DateFilterType = 'today' | 'yesterday' | 'custom';
type TabType = 'all' | 'active' | 'discharged';
type ViewMode = 'table' | 'cards';

const getEntityId = (entity: { id?: string; _id?: string } | null): string | undefined =>
  entity?._id || entity?.id;

const getPatientName = (patient: any): string => {
  if (!patient) return 'Unknown Patient';
  return patient.name || patient.fullName || `${patient.surname || ''} ${patient.otherNames || ''}`.trim() || 'Unknown Patient';
};

const calculateAge = (dateOfBirth: string): number => {
  if (!dateOfBirth) return 0;
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
};

const initials = (name: string) =>
  name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');

// ── Badges ──
const AdmissionTypeBadge: React.FC<{ type: string }> = ({ type }) => {
  const base = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border';
  switch (type) {
    case 'day_surgery':
      return <span className={`${base} bg-purple-100 text-purple-700 border-purple-200`}><Sun className="w-2.5 h-2.5" />DAY SURGERY</span>;
    case 'detention':
      return <span className={`${base} bg-orange-100 text-orange-700 border-orange-200`}><Moon className="w-2.5 h-2.5" />OBSERVATION</span>;
    case 'antenatal':
      return <span className={`${base} bg-pink-100 text-pink-700 border-pink-200`}><Baby className="w-2.5 h-2.5" />ANTENATAL</span>;
    case 'delivery':
      return <span className={`${base} bg-green-100 text-green-700 border-green-200`}><Heart className="w-2.5 h-2.5" />DELIVERY</span>;
    case 'formal_ipd':
    default:
      return <span className={`${base} bg-green-100 text-green-700 border-green-200`}><Hospital className="w-2.5 h-2.5" />IPD</span>;
  }
};

const StatusBadge: React.FC<{ isDischarged: boolean; type: string }> = ({ isDischarged, type }) => {
  if (isDischarged) {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">
      <CheckCircle className="w-2.5 h-2.5" />DISCHARGED
    </span>;
  }
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700 border border-green-200">
    <CircleDot className="w-2.5 h-2.5 animate-pulse" />ACTIVE
  </span>;
};

export default function Admissions() {
  const { success, error } = useToast();
  const { hospital } = useHospitalStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAdmission, setSelectedAdmission] = useState<any>(null);
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [selectedDaycase, setSelectedDaycase] = useState<any>(null);
  const [dateFilter, setDateFilter] = useState<DateFilterType>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('admissionsViewMode');
    return (saved as ViewMode) || 'table';
  });

  const {
    admissions, getAdmissions, convertDaycaseToIPD, dischargePatient,
    getDetentionPatients, getFormalIPDPatients,
  } = useAdmissionStore();
  const { patients, loadPatients } = usePatientStore();
  const { attendances, getAttendances, updateAttendance, dischargeFromEncounter } = useAttendanceStore();
  const { user, hasRole } = useAuthStore();

  useEffect(() => {
    localStorage.setItem('admissionsViewMode', viewMode);
  }, [viewMode]);

  const getDateRange = (): { startDate: Date; endDate: Date } | null => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    switch (dateFilter) {
      case 'today': return { startDate: today, endDate: endOfDay };
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
      default: return null;
    }
  };

  const loadData = async () => {
    try {
      setRefreshing(true);
      setIsLoading(true);
      const range = getDateRange();
      await Promise.all([
        getAdmissions({ limit: 2000 }),
        loadPatients(),
        getAttendances({
          limit: 5000,
          ...(range ? { dateFrom: range.startDate.toISOString(), dateTo: range.endDate.toISOString() } : {}),
        }),
        getDetentionPatients(),
        getFormalIPDPatients(),
      ]);
    } catch (err: any) {
      console.error('❌ Error loading admissions data:', err);
      error('Load Failed', err.response?.data?.message || 'Failed to load admissions data');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useLiveRefresh(['admissions', 'encounters', 'nursing'], async () => {
    const range = getDateRange();
    await Promise.all([
      getAdmissions({ limit: 2000 }, { silent: true }),
      getAttendances({
        limit: 5000,
        ...(range ? { dateFrom: range.startDate.toISOString(), dateTo: range.endDate.toISOString() } : {}),
      }, { silent: true }),
      getDetentionPatients(),
      getFormalIPDPatients(),
    ]);
  }, !(dateFilter === 'custom' && !(customStartDate && customEndDate)));

  useEffect(() => {
    if (dateFilter === 'custom' && !(customStartDate && customEndDate)) return;
    loadData();
  }, [dateFilter, customStartDate, customEndDate]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, dateFilter, customStartDate, customEndDate, activeTab]);

  const formalIPD = useMemo(() => admissions.filter(a => a.admissionType !== 'detention_observation'), [admissions]);
  const detention = useMemo(() => admissions.filter(a => a.admissionType === 'detention_observation'), [admissions]);

  const daycasePatients = useMemo(
    () => attendances.filter(a => a.encounterCategory === 'daycase' && a.status === 'admitted'),
    [attendances],
  );

  const virtualDaycaseAdmissions = useMemo(() =>
    daycasePatients.map(att => ({
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
    })), [daycasePatients]);

  const allAdmissions = useMemo(() => {
    const formal = formalIPD.map(adm => ({
      ...adm, isDaySurgery: false, isDetention: false, isVirtual: false,
      status: adm.dischargeDate ? 'discharged' : 'admitted', displayType: 'formal_ipd',
    }));
    const detentionList = detention.map(adm => ({
      ...adm, isDaySurgery: false, isDetention: true, isVirtual: false,
      status: adm.dischargeDate ? 'discharged' : 'admitted', displayType: 'detention',
    }));
    const daySurgery = virtualDaycaseAdmissions;
    const admittedFromAttendances = attendances
      .filter(a =>
        a.status === 'admitted' && a.encounterCategory === 'ipd' &&
        !formal.some(f => f.attendanceId === a.id) &&
        !detentionList.some(d => d.attendanceId === a.id),
      )
      .map(att => ({
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
        isDaySurgery: false, isDetention: false, isVirtual: true,
        status: 'admitted', displayType: 'formal_ipd',
      }));
    const existingAttendanceIds = new Set([...formal, ...detentionList].map(a => a.attendanceId));
    const uniqueDaySurgery = daySurgery.filter(o => !existingAttendanceIds.has(o.attendanceId));
    const uniqueFromAttendances = admittedFromAttendances.filter(a => !existingAttendanceIds.has(a.attendanceId));
    return [...formal, ...detentionList, ...uniqueDaySurgery, ...uniqueFromAttendances];
  }, [formalIPD, detention, virtualDaycaseAdmissions, attendances]);

  const filteredAdmissions = useMemo(() => {
    if (!allAdmissions.length) return [];
    const dateRange = getDateRange();
    const filtered = allAdmissions.filter(admission => {
      if (dateRange) {
        const admissionDate = new Date(admission.admissionDate);
        if (admissionDate < dateRange.startDate || admissionDate > dateRange.endDate) return false;
      }
      const isDischarged = admission.dischargeDate !== null || admission.attendance?.status === 'discharged';
      if (activeTab === 'active' && isDischarged) return false;
      if (activeTab === 'discharged' && !isDischarged) return false;
      if (searchQuery) {
        const patient = admission.attendance?.Patient || patients.find(p => p.id === admission.attendance?.patientId);
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
    return filtered.sort((a, b) => new Date(b.admissionDate).getTime() - new Date(a.admissionDate).getTime());
  }, [allAdmissions, patients, searchQuery, dateFilter, customStartDate, customEndDate, activeTab]);

  const activeAdmissions = filteredAdmissions.filter(a => !a.dischargeDate);
  const dischargedAdmissions = filteredAdmissions.filter(a => a.dischargeDate);
  const formalIPDCount = filteredAdmissions.filter(a => a.displayType === 'formal_ipd' && !a.dischargeDate).length;
  const detentionCount = filteredAdmissions.filter(a => a.displayType === 'detention' && !a.dischargeDate).length;
  const daySurgeryCount = filteredAdmissions.filter(a => a.displayType === 'day_surgery' && !a.dischargeDate).length;

  const totalPages = Math.ceil(filteredAdmissions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAdmissions = filteredAdmissions.slice(startIndex, startIndex + itemsPerPage);
  const goToPage = (page: number) => setCurrentPage(Math.max(1, Math.min(page, totalPages)));

  const getDateFilterDisplay = () => {
    switch (dateFilter) {
      case 'today': return 'Today';
      case 'yesterday': return 'Yesterday';
      case 'custom':
        if (customStartDate && customEndDate) {
          const fmt = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          return `${fmt(customStartDate)} – ${fmt(customEndDate)}`;
        }
        return 'Custom Range';
      default: return 'Today';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return 'Invalid Date'; }
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    } catch { return 'Invalid Date'; }
  };

  const getLengthOfStay = (admission: any) => {
    const start = new Date(admission.admissionDate);
    const end = admission.dischargeDate ? new Date(admission.dischargeDate) : new Date();
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  const handleConvertToIPD = (daycaseAdmission: any) => {
    setSelectedDaycase(daycaseAdmission);
    setShowConvertModal(true);
  };

  const confirmConvertToIPD = async () => {
    if (!selectedDaycase) return;
    try {
      await convertDaycaseToIPD(selectedDaycase.attendanceId, { admissionType: 'emergency' });
      success('Converted', 'Day surgery patient converted to formal IPD admission');
      await loadData();
      setShowConvertModal(false);
      setSelectedDaycase(null);
    } catch (err: any) {
      error('Conversion Failed', err.message);
    }
  };

  const handleDischargePatient = (admission: any) => {
    setSelectedAdmission(admission);
    setShowDischargeModal(true);
  };

  const confirmDischarge = async () => {
    if (!selectedAdmission) return;
    try {
      await dischargePatient(selectedAdmission.attendanceId, {
        dischargeDate: new Date().toISOString(), dischargeStatus: 'home',
      });
      success('Patient Discharged', 'Patient has been successfully discharged');
      await loadData();
      setShowDischargeModal(false);
      setSelectedAdmission(null);
    } catch (err: any) {
      error('Discharge Failed', err.message);
    }
  };

  const canDischarge = hasRole(['admin', 'doctor']);
  const canConvert = hasRole(['admin', 'doctor']);

  const navigateToWardManagement = () => { window.location.href = '/dashboard/wards'; };

  if (isLoading && !refreshing) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
        <div className="text-center bg-[var(--bg-card)] p-8 rounded-xl border border-[var(--border-color)]">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-1">Loading Admissions…</h2>
          <p className="text-xs text-[var(--text-secondary)]">Fetching patient list</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4 sm:p-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center shadow-sm shadow-cyan-500/20">
            <Hospital className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[var(--text-primary)]">Patient Admissions</h1>
            <p className="text-xs text-[var(--text-secondary)]">
              Manage IPD admissions, observation cases, and day surgery patients
            </p>
            <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
              {filteredAdmissions.length} total · {formalIPDCount} IPD · {detentionCount} Obs · {daySurgeryCount} Day Surgery · {dischargedAdmissions.length} Discharged
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={navigateToWardManagement}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-700 hover:text-white transition-all"
          >
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">Ward Management</span>
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

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Active IPD', value: formalIPDCount, Icon: Hospital, bg: 'bg-green-100', color: 'text-green-600' },
          { label: 'Observation', value: detentionCount, Icon: Moon, bg: 'bg-orange-100', color: 'text-orange-600' },
          { label: 'Day Surgery', value: daySurgeryCount, Icon: Sun, bg: 'bg-purple-100', color: 'text-purple-600' },
          { label: 'Discharged', value: dischargedAdmissions.length, Icon: CheckCircle, bg: 'bg-gray-100', color: 'text-gray-600' },
        ].map(s => {
          const Icon = s.Icon;
          return (
            <div key={s.label} className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] hover:shadow-sm transition-shadow">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${s.bg}`}>
                <Icon className={`w-4.5 h-4.5 ${s.color}`} />
              </div>
              <p className="text-2xl font-bold text-[var(--text-primary)] leading-tight">{s.value}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* ── Tabs ── */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-1 flex gap-1 shadow-sm">
        {[
          { id: 'all', label: 'All', count: filteredAdmissions.length, color: 'cyan' },
          { id: 'active', label: 'Active', count: activeAdmissions.length, color: 'green' },
          { id: 'discharged', label: 'Discharged', count: dischargedAdmissions.length, color: 'gray' },
        ].map(t => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as TabType)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                isActive
                  ? t.color === 'green' ? 'bg-green-600 text-white shadow-sm'
                    : t.color === 'gray' ? 'bg-gray-600 text-white shadow-sm'
                    : 'bg-cyan-600 text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)]'
              }`}
            >
              {t.label}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                isActive ? 'bg-white/20 text-white' : 'bg-[var(--bg-main)] text-[var(--text-secondary)]'
              }`}>
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Filters Toolbar ── */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] shadow-sm">
        <div className="p-3">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by patient name, folder number, admission number…"
                className="w-full pl-10 pr-9 py-2.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Date range quick buttons (desktop) */}
            <div className="hidden lg:flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[var(--text-tertiary)]" />
              <div className="flex gap-1 bg-[var(--bg-main)] rounded-lg p-1 border border-[var(--border-color)]">
                {[
                  { id: 'today', label: 'Today' },
                  { id: 'yesterday', label: 'Yesterday' },
                  { id: 'custom', label: 'Custom' },
                ].map(d => (
                  <button
                    key={d.id}
                    onClick={() => { setDateFilter(d.id as DateFilterType); setShowDatePicker(d.id === 'custom'); }}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      dateFilter === d.id
                        ? 'bg-[var(--bg-card)] text-cyan-700 shadow-sm'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>

              {/* View toggle */}
              <div className="flex items-center bg-[var(--bg-main)] rounded-lg p-1 border border-[var(--border-color)]">
                <button
                  onClick={() => setViewMode('table')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    viewMode === 'table'
                      ? 'bg-[var(--bg-card)] text-cyan-700 shadow-sm'
                      : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  Table
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    viewMode === 'cards'
                      ? 'bg-[var(--bg-card)] text-cyan-700 shadow-sm'
                      : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  Cards
                </button>
              </div>
            </div>
          </div>

          {/* Custom date range */}
          {showDatePicker && dateFilter === 'custom' && (
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-[var(--border-color)]">
              <input type="date" value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-2 text-xs border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-cyan-500 transition-all" />
              <span className="text-[var(--text-secondary)] text-xs">to</span>
              <input type="date" value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-2 text-xs border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-cyan-500 transition-all" />
              <span className="ml-auto text-xs text-[var(--text-tertiary)]">
                Showing: <strong className="text-[var(--text-primary)]">{getDateFilterDisplay()}</strong>
              </span>
            </div>
          )}

          {/* Mobile date chips + view toggle */}
          <div className="lg:hidden flex items-center gap-2 mt-3 pt-3 border-t border-[var(--border-color)] flex-wrap">
            <Calendar className="w-4 h-4 text-[var(--text-tertiary)]" />
            <div className="flex gap-1 bg-[var(--bg-main)] rounded-lg p-1 border border-[var(--border-color)] flex-1">
              {[
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yest.' },
                { id: 'custom', label: 'Custom' },
              ].map(d => (
                <button
                  key={d.id}
                  onClick={() => { setDateFilter(d.id as DateFilterType); setShowDatePicker(d.id === 'custom'); }}
                  className={`flex-1 px-2 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                    dateFilter === d.id
                      ? 'bg-[var(--bg-card)] text-cyan-700 shadow-sm'
                      : 'text-[var(--text-secondary)]'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <div className="flex items-center bg-[var(--bg-main)] rounded-lg p-1 border border-[var(--border-color)]">
              <button onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                  viewMode === 'table' ? 'bg-[var(--bg-card)] text-cyan-700 shadow-sm' : 'text-[var(--text-tertiary)]'
                }`}>
                <List className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setViewMode('cards')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                  viewMode === 'cards' ? 'bg-[var(--bg-card)] text-cyan-700 shadow-sm' : 'text-[var(--text-tertiary)]'
                }`}>
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Admissions List ── */}
      {filteredAdmissions.length === 0 ? (
        <div className="bg-[var(--bg-card)] rounded-xl p-12 text-center border border-[var(--border-color)] shadow-sm">
          <div className="w-16 h-16 bg-cyan-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Hospital className="w-8 h-8 text-cyan-400" />
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">
            {searchQuery ? 'No Admissions Found' : 'No Admissions Yet'}
          </h3>
          <p className="text-sm text-[var(--text-secondary)] max-w-sm mx-auto">
            {searchQuery
              ? 'No records match your search or filter criteria.'
              : 'No patients are currently admitted or under observation for this period.'}
          </p>
        </div>
      ) : viewMode === 'table' ? (
        <>
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                  <tr>
                    {['Patient', 'Type', 'ID', 'Admission', 'Location', 'Stay', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {paginatedAdmissions.map((admission) => {
                    const patient = admission.attendance?.Patient || patients.find(p => p.id === admission.attendance?.patientId);
                    const fullName = patient ? getPatientName(patient) : 'Unknown Patient';
                    const wardName = admission.attendance?.Ward?.wardName || '—';
                    const bedNumber = admission.attendance?.Bed?.bedNumber || '—';
                    const isDischarged = !!admission.dischargeDate;
                    const stayDays = getLengthOfStay(admission);

                    return (
                      <tr key={admission.id} className="hover:bg-cyan-50/30 transition-colors group">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full border flex items-center justify-center flex-shrink-0 ${
                              admission.displayType === 'day_surgery' ? 'bg-purple-100 border-purple-200' :
                              admission.displayType === 'detention' ? 'bg-orange-100 border-orange-200' :
                              'bg-green-100 border-green-200'
                            }`}>
                              <span className="text-[10px] font-bold text-[var(--text-primary)]">
                                {initials(fullName)}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-[var(--text-primary)] text-sm truncate">{fullName}</p>
                              <p className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-1.5">
                                <span className="font-mono">{patient?.folderNumber || '—'}</span>
                                <span className="opacity-40">·</span>
                                <span>{patient?.gender || '—'}</span>
                                <span className="opacity-40">·</span>
                                <span>{patient?.dateOfBirth ? calculateAge(patient.dateOfBirth) : '?'}y</span>
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <AdmissionTypeBadge type={admission.displayType} />
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono font-semibold text-[var(--text-primary)] bg-[var(--bg-main)] px-2 py-0.5 rounded border border-[var(--border-color)]">
                            {admission.admissionNumber}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs">
                            <p className="font-medium text-[var(--text-primary)]">
                              {formatDate(admission.admissionDate)}
                            </p>
                            <p className="text-[var(--text-tertiary)] text-[10px]">
                              {formatDateTime(admission.admissionDate)}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-xs">
                            <MapPin className="w-3 h-3 text-[var(--text-tertiary)]" />
                            <span className="text-[var(--text-primary)] truncate">{wardName}</span>
                            <span className="text-[var(--text-tertiary)]">/</span>
                            <span className="font-mono text-[var(--text-secondary)]">{bedNumber}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-medium text-[var(--text-primary)]">
                            {stayDays} day{stayDays !== 1 ? 's' : ''}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge isDischarged={isDischarged} type={admission.displayType} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              to={`/dashboard/admissions/${admission.id}`}
                              className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-blue-600 hover:bg-blue-50 transition-all"
                              title="View Admission Details"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </Link>
                            {admission.attendance?.id && (
                              <Link
                                to={`/dashboard/medical-entries/${admission.attendance.id}`}
                                className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-cyan-600 hover:bg-cyan-50 transition-all"
                                title="View Medical Records"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Link>
                            )}
                            {admission.displayType === 'day_surgery' && !isDischarged && canConvert && (
                              <button
                                onClick={() => handleConvertToIPD(admission)}
                                className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-purple-600 hover:bg-purple-50 transition-all"
                                title="Convert to IPD"
                              >
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {!isDischarged && canDischarge && (
                              <button
                                onClick={() => handleDischargePatient(admission)}
                                className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-green-600 hover:bg-green-50 transition-all"
                                title="Discharge Patient"
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="text-xs text-[var(--text-secondary)]">
                  Showing <strong className="text-[var(--text-primary)]">{startIndex + 1}</strong> to{' '}
                  <strong className="text-[var(--text-primary)]">{Math.min(startIndex + itemsPerPage, filteredAdmissions.length)}</strong>{' '}
                  of <strong className="text-[var(--text-primary)]">{filteredAdmissions.length}</strong>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* ═══ Cards view ═══ */
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {paginatedAdmissions.map(admission => {
              const patient = admission.attendance?.Patient || patients.find(p => p.id === admission.attendance?.patientId);
              const fullName = patient ? getPatientName(patient) : 'Unknown Patient';
              const wardName = admission.attendance?.Ward?.wardName || '—';
              const bedNumber = admission.attendance?.Bed?.bedNumber || '—';
              const isDischarged = !!admission.dischargeDate;
              const stayDays = getLengthOfStay(admission);

              return (
                <div key={admission.id} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] hover:border-cyan-400 hover:shadow-lg transition-all overflow-hidden group flex flex-col">
                  {/* Header */}
                  <div className="p-4 pb-3 border-b border-[var(--border-color)] bg-gradient-to-r from-gray-50 to-white">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <AdmissionTypeBadge type={admission.displayType} />
                      <StatusBadge isDischarged={isDischarged} type={admission.displayType} />
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${
                        admission.displayType === 'day_surgery' ? 'bg-purple-100 border-purple-200' :
                        admission.displayType === 'detention' ? 'bg-orange-100 border-orange-200' :
                        'bg-green-100 border-green-200'
                      }`}>
                        <span className="text-xs font-bold text-[var(--text-primary)]">
                          {initials(fullName)}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-[var(--text-primary)] truncate">{fullName}</p>
                        <p className="text-[10px] text-[var(--text-tertiary)] font-mono">
                          #{patient?.folderNumber || '—'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-4 space-y-2.5 flex-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-tertiary)] flex items-center gap-1">
                        <Hash className="w-3 h-3" /> Admission #
                      </span>
                      <span className="font-mono font-semibold text-[var(--text-primary)]">
                        {admission.admissionNumber}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-tertiary)] flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Admitted
                      </span>
                      <span className="text-[var(--text-primary)] font-medium">
                        {formatDate(admission.admissionDate)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-tertiary)] flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Location
                      </span>
                      <span className="text-[var(--text-primary)] font-medium truncate max-w-[60%] text-right">
                        {wardName} / <span className="font-mono">{bedNumber}</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-tertiary)] flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Length of stay
                      </span>
                      <span className="text-[var(--text-primary)] font-semibold">
                        {stayDays} day{stayDays !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-4 py-3 bg-[var(--bg-main)] border-t border-[var(--border-color)] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <Link
                        to={`/dashboard/admissions/${admission.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-600 hover:text-white transition-all"
                      >
                        <FileText className="w-3 h-3" />
                        Details
                      </Link>
                      {admission.attendance?.id && (
                        <Link
                          to={`/dashboard/medical-entries/${admission.attendance.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold bg-cyan-100 text-cyan-700 rounded-lg hover:bg-cyan-600 hover:text-white transition-all"
                        >
                          <Eye className="w-3 h-3" />
                          Records
                        </Link>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5">
                      {admission.displayType === 'day_surgery' && !isDischarged && canConvert && (
                        <button onClick={() => handleConvertToIPD(admission)}
                          className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-purple-600 hover:bg-purple-50 transition-all"
                          title="Convert to IPD">
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {!isDischarged && canDischarge && (
                        <button onClick={() => handleDischargePatient(admission)}
                          className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-green-600 hover:bg-green-50 transition-all"
                          title="Discharge">
                          <LogOut className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination for cards */}
          {totalPages > 1 && (
            <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="text-xs text-[var(--text-secondary)]">
                  Showing <strong className="text-[var(--text-primary)]">{startIndex + 1}</strong> to{' '}
                  <strong className="text-[var(--text-primary)]">{Math.min(startIndex + itemsPerPage, filteredAdmissions.length)}</strong>{' '}
                  of <strong className="text-[var(--text-primary)]">{filteredAdmissions.length}</strong>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}
                    className="p-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] disabled:opacity-40 transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}
                    className="p-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] disabled:opacity-40 transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Convert Modal ── */}
      {showConvertModal && selectedDaycase && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowConvertModal(false)} />
          <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
            <div className="relative bg-[var(--bg-card)] rounded-2xl shadow-2xl max-w-md w-full border border-[var(--border-color)] overflow-hidden">
              <div className="relative bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 px-6 py-5 text-white">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-400 via-fuchsia-400 to-transparent" />
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-400/30 flex items-center justify-center">
                    <ArrowRight className="w-5 h-5 text-purple-300" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Convert to IPD</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Promote day surgery to formal admission</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <p className="text-sm text-[var(--text-secondary)]">
                  Convert this day surgery patient to a formal IPD admission? This will create a full inpatient record.
                </p>
              </div>
              <div className="px-6 py-4 border-t border-[var(--border-color)] flex justify-end gap-2">
                <button onClick={() => setShowConvertModal(false)}
                  className="px-4 py-2 border border-[var(--border-color)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-main)] text-sm font-medium transition-all">
                  Cancel
                </button>
                <button onClick={confirmConvertToIPD}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-semibold shadow-sm shadow-purple-500/20 transition-all">
                  Convert to IPD
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Discharge Modal ── */}
      {showDischargeModal && selectedAdmission && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDischargeModal(false)} />
          <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
            <div className="relative bg-[var(--bg-card)] rounded-2xl shadow-2xl max-w-md w-full border border-[var(--border-color)] overflow-hidden">
              <div className="relative bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 px-6 py-5 text-white">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-400 via-teal-400 to-transparent" />
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500/15 border border-green-400/30 flex items-center justify-center">
                    <LogOut className="w-5 h-5 text-green-300" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Confirm Discharge</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">This action cannot be undone</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <p className="text-sm text-[var(--text-secondary)]">
                  Are you sure you want to discharge this patient? Their bed will be freed and the admission will be marked as completed.
                </p>
              </div>
              <div className="px-6 py-4 border-t border-[var(--border-color)] flex justify-end gap-2">
                <button onClick={() => setShowDischargeModal(false)}
                  className="px-4 py-2 border border-[var(--border-color)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-main)] text-sm font-medium transition-all">
                  Cancel
                </button>
                <button onClick={confirmDischarge}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-semibold shadow-sm shadow-green-500/20 transition-all">
                  Confirm Discharge
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}