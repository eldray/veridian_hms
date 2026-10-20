// src/pages/MaternalWaitingList.tsx — Redesigned (visit tabs restored + accent colors)
import { useLiveRefresh } from '../api/realtime';
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorklistStore } from '../store/worklistStore';
import { useToast } from '../store/toastStore';
import {
  ChevronLeft, Baby, Heart, Hospital, Users, AlertCircle, Clock,
  Search, User, Calendar, Activity, AlertTriangle, CheckCircle,
  RefreshCw, Eye, Stethoscope, History, FileText, LayoutGrid, List,
  X,
} from 'lucide-react';

// ── Badges (theme tokens only) ────────────────────────────────────────────────
const getPriorityBadge = (priority: string, riskLevel?: string) => {
  if (riskLevel === 'high') {
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]">HIGH RISK</span>;
  }
  if (riskLevel === 'medium') {
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--icon-orange-bg)] text-[var(--icon-orange-text)]">MEDIUM RISK</span>;
  }
  switch (priority) {
    case 'stat':
    case 'emergency':
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]">EMERGENCY</span>;
    case 'urgent':
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--icon-orange-bg)] text-[var(--icon-orange-text)]">URGENT</span>;
    default:
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]">SCHEDULED</span>;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'pending':
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]">Pending</span>;
    case 'in_progress':
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]">In Progress</span>;
    case 'completed':
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]">Completed</span>;
    case 'discharged':
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]">Discharged</span>;
    default:
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--bg-main)] text-[var(--text-secondary)]">{status}</span>;
  }
};

const getVisitTypeBadge = (type: string) => {
  switch (type) {
    case 'antenatal':
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--icon-pink-bg)] text-[var(--icon-pink-text)]"><Baby className="w-2.5 h-2.5" /> Antenatal</span>;
    case 'delivery':
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]"><Hospital className="w-2.5 h-2.5" /> Delivery</span>;
    case 'postnatal':
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)]"><Heart className="w-2.5 h-2.5" /> Postnatal</span>;
    default:
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--bg-main)] text-[var(--text-secondary)]"><Stethoscope className="w-2.5 h-2.5" /> Other</span>;
  }
};

const initials = (name: string) =>
  (name || '').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');

// Visit type tab config — one place to keep icon + label + accent
const VISIT_TABS = [
  { key: 'all',        label: 'All',        icon: Users,        colorVar: 'cyan'   },
  { key: 'antenatal',  label: 'Antenatal',  icon: Baby,         colorVar: 'pink'   },
  { key: 'delivery',   label: 'Delivery',   icon: Hospital,     colorVar: 'green'  },
  { key: 'postnatal',  label: 'Postnatal',  icon: Heart,        colorVar: 'blue'   },
] as const;

type ViewMode = 'grid' | 'table';

export default function MaternalWaitingList() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [activeTab, setActiveTab] = useState<'pending' | 'recent'>('pending');
  const [activeVisitType, setActiveVisitType] = useState<'all' | 'antenatal' | 'delivery' | 'postnatal'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('maternalQueueView');
    return (saved as ViewMode) || 'grid';
  });

  const { worklistItems, fetchWorklist, isLoading: worklistLoading } = useWorklistStore();

  useLiveRefresh(['encounters', 'nursing'], () => fetchWorklist('maternal', { silent: true }));

  useEffect(() => {
    localStorage.setItem('maternalQueueView', viewMode);
  }, [viewMode]);

  const loadData = async () => {
    try {
      setRefreshing(true);
      setIsLoading(true);
      await fetchWorklist('maternal');
      success('Data loaded', 'Maternal waiting list ready');
    } catch (err: any) {
      toastError('Load failed', err.message || 'Could not load data');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const pendingPatients = useMemo(
    () => worklistItems.filter(item => !item.hasBeenAttended && item.status !== 'completed'),
    [worklistItems],
  );

  const recentPatients = useMemo(
    () => worklistItems.filter(item => item.hasBeenAttended || item.status === 'completed'),
    [worklistItems],
  );

  const getFilteredByVisitType = (patients: any[]) => {
    if (activeVisitType === 'all') return patients;
    return patients.filter(p => p.visitType === activeVisitType);
  };

  const pendingFiltered = getFilteredByVisitType(pendingPatients);
  const recentFiltered = getFilteredByVisitType(recentPatients);

  const filteredPatients = useMemo(() => {
    const source = activeTab === 'pending' ? pendingFiltered : recentFiltered;
    if (!searchQuery) return source;
    const lower = searchQuery.toLowerCase();
    return source.filter(patient =>
      patient.patient?.name?.toLowerCase().includes(lower) ||
      patient.patient?.folderNumber?.toLowerCase().includes(lower) ||
      patient.complaints?.toLowerCase().includes(lower),
    );
  }, [pendingFiltered, recentFiltered, searchQuery, activeTab]);

  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
  const paginatedPatients = filteredPatients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  useEffect(() => { setCurrentPage(1); }, [activeTab, activeVisitType, searchQuery]);

  // ── Stats ──
  const stats = {
    total: pendingPatients.length,
    highRisk: pendingPatients.filter(p => p.riskLevel === 'high').length,
    urgent: pendingPatients.filter(p => p.priority === 'urgent' || p.priority === 'stat' || p.priority === 'emergency').length,
    recentCompleted: recentPatients.length,
    antenatal: pendingPatients.filter(p => p.visitType === 'antenatal').length,
    delivery: pendingPatients.filter(p => p.visitType === 'delivery').length,
    postnatal: pendingPatients.filter(p => p.visitType === 'postnatal').length,
  };

  const getVisitTabCount = (key: typeof activeVisitType) => {
    switch (key) {
      case 'all': return stats.total;
      case 'antenatal': return stats.antenatal;
      case 'delivery': return stats.delivery;
      case 'postnatal': return stats.postnatal;
    }
  };

  const handleStartVisit = (patient: any) => {
    navigate(`/dashboard/maternal/${patient.attendanceId}`, {
      state: {
        patient: {
          id: patient.patientId,
          name: patient.patient?.name,
          folderNumber: patient.patient?.folderNumber,
          age: patient.patient?.age,
          gender: patient.patient?.gender,
        },
        attendanceId: patient.attendanceId,
        visitType: patient.visitType,
        fromWaitingList: true,
      },
    });
  };

  const getActionButtonStyle = (visitType: string, isPending: boolean) => {
    if (!isPending) {
      return 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] hover:bg-[var(--icon-purple-text)] hover:text-white';
    }
    switch (visitType) {
      case 'antenatal':
        return 'bg-[var(--icon-pink-bg)] text-[var(--icon-pink-text)] hover:bg-[var(--icon-pink-text)] hover:text-white';
      case 'delivery':
        return 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] hover:bg-[var(--icon-green-text)] hover:text-white';
      case 'postnatal':
        return 'bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)] hover:bg-[var(--icon-blue-text)] hover:text-white';
      default:
        return 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-text)] hover:text-white';
    }
  };

  const getActionButtonText = (visitType: string, isPending: boolean) => {
    if (!isPending) return 'View Record';
    switch (visitType) {
      case 'antenatal': return 'Start ANC';
      case 'delivery': return 'Start Delivery';
      case 'postnatal': return 'Postnatal Check';
      default: return 'Start Visit';
    }
  };

  // Row accent (high-risk red, emergency orange)
  const getRowAccent = (patient: any) => {
    if (patient.riskLevel === 'high') return 'border-l-2 border-l-[var(--icon-red-text)]';
    if (patient.priority === 'stat' || patient.priority === 'emergency') return 'border-l-2 border-l-[var(--icon-orange-text)]';
    return 'border-l-2 border-l-transparent';
  };

  // Card top border accent (per visit type)
  const getCardAccentBar = (visitType: string) => {
    switch (visitType) {
      case 'antenatal': return 'bg-[var(--icon-pink-text)]';
      case 'delivery':  return 'bg-[var(--icon-green-text)]';
      case 'postnatal': return 'bg-[var(--icon-blue-text)]';
      default:          return 'bg-[var(--icon-cyan-text)]';
    }
  };

  if (isLoading || worklistLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
        <div className="text-center bg-[var(--bg-card)] p-8 rounded-xl border border-[var(--border-color)]">
          <div className="w-12 h-12 border-4 border-[var(--icon-pink-text)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Loading Maternal Queue…</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4 sm:p-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-card)] transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--icon-pink-bg)]">
            <Baby className="w-5 h-5 text-[var(--icon-pink-text)]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[var(--text-primary)]">Maternal Health Queue</h1>
            <p className="text-xs text-[var(--text-secondary)]">
              Antenatal · Delivery · Postnatal waiting patients
            </p>
          </div>
        </div>
        <button
          onClick={loadData}
          disabled={refreshing}
          className="p-2 rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)] transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ── Stats (balanced) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { count: stats.total,           label: 'Waiting',            Icon: Users,         bg: 'bg-[var(--icon-cyan-bg)]',   color: 'text-[var(--icon-cyan-text)]'   },
          { count: stats.highRisk,        label: 'High Risk',          Icon: AlertTriangle, bg: 'bg-[var(--icon-red-bg)]',    color: 'text-[var(--icon-red-text)]'    },
          { count: stats.urgent,          label: 'Urgent',             Icon: AlertCircle,   bg: 'bg-[var(--icon-orange-bg)]', color: 'text-[var(--icon-orange-text)]' },
          { count: stats.recentCompleted, label: 'Completed Today',    Icon: CheckCircle,   bg: 'bg-[var(--icon-purple-bg)]', color: 'text-[var(--icon-purple-text)]' },
        ].map(s => {
          const Icon = s.Icon;
          return (
            <div
              key={s.label}
              className="bg-[var(--bg-card)] rounded-xl px-4 py-3 border border-[var(--border-color)] flex items-center gap-3.5"
            >
              <div className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${s.bg}`}>
                <Icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div className="min-w-0">
                <p className={`text-2xl font-bold leading-none ${s.color}`}>{s.count}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1 truncate">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Visit Type Tabs (restored) ── */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-1.5">
        <div className="flex flex-wrap gap-1">
          {VISIT_TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeVisitType === tab.key;
            const count = getVisitTabCount(tab.key);
            return (
              <button
                key={tab.key}
                onClick={() => setActiveVisitType(tab.key)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  isActive
                    ? `bg-[var(--icon-${tab.colorVar}-bg)] text-[var(--icon-${tab.colorVar}-text)] shadow-sm`
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  isActive
                    ? 'bg-white/30'
                    : 'bg-[var(--bg-main)] text-[var(--text-secondary)]'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Search + View Toggle ── */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-3">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder="Search by patient name, folder number, or complaint…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:ring-2 focus:ring-[var(--icon-pink-text)] focus:border-[var(--icon-pink-text)] transition-all"
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

          <div className="flex items-center bg-[var(--bg-main)] rounded-lg p-1 border border-[var(--border-color)]">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'grid'
                  ? 'bg-[var(--bg-card)] text-[var(--icon-pink-text)] shadow-sm'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
              }`}
              title="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'table'
                  ? 'bg-[var(--bg-card)] text-[var(--icon-pink-text)] shadow-sm'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
              }`}
              title="Table view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Pending / Recent tabs ── */}
      <div className="border-b border-[var(--border-color)]">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all relative ${
              activeTab === 'pending'
                ? 'text-[var(--icon-pink-text)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Clock className="w-4 h-4" />
            Pending Visits
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'pending'
                ? 'bg-[var(--icon-pink-bg)] text-[var(--icon-pink-text)]'
                : 'bg-[var(--bg-main)] text-[var(--text-secondary)]'
            }`}>
              {stats.total}
            </span>
            {activeTab === 'pending' && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-[var(--icon-pink-text)] rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('recent')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all relative ${
              activeTab === 'recent'
                ? 'text-[var(--icon-purple-text)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            Recent Visits Today
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'recent'
                ? 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]'
                : 'bg-[var(--bg-main)] text-[var(--text-secondary)]'
            }`}>
              {stats.recentCompleted}
            </span>
            {activeTab === 'recent' && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-[var(--icon-purple-text)] rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* ── List ── */}
      {filteredPatients.length === 0 ? (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-12 text-center">
          {activeTab === 'pending' ? (
            <>
              <div className="w-14 h-14 rounded-full bg-[var(--icon-green-bg)] flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-7 h-7 text-[var(--icon-green-text)]" />
              </div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">All caught up</p>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">No patients waiting in this queue</p>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-full bg-[var(--bg-main)] flex items-center justify-center mx-auto mb-3">
                <History className="w-7 h-7 text-[var(--text-tertiary)]" />
              </div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">No visits completed today</p>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">Completed visits will appear here</p>
            </>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* ════════ GRID VIEW ════════ */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {paginatedPatients.map((patient) => {
            const isPending = activeTab === 'pending';
            const name = patient.patient?.name || 'Unknown Patient';
            const accent = getRowAccent(patient);

            return (
              <button
                key={patient.id}
                onClick={() => handleStartVisit(patient)}
                className={`text-left bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] hover:shadow-md transition-all overflow-hidden group flex flex-col ${accent}`}
              >
                {/* Top color bar per visit type */}
                <div className={`h-1 ${getCardAccentBar(patient.visitType)}`} />

                {/* Header: visit type + priority */}
                <div className="flex items-center justify-between gap-2 p-3.5 pb-3">
                  {getVisitTypeBadge(patient.visitType)}
                  {isPending
                    ? getPriorityBadge(patient.priority, patient.riskLevel)
                    : <span className="text-[10px] text-[var(--text-tertiary)] font-mono">
                        {patient.completedAt ? new Date(patient.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </span>
                  }
                </div>

                {/* Body */}
                <div className="px-4 pb-4 flex-1 space-y-3">
                  {/* Patient */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--icon-pink-bg)] border border-[var(--border-color)] flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-[var(--icon-pink-text)]">
                        {initials(name) || <User className="w-4 h-4" />}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[var(--text-primary)] truncate">{name}</p>
                      <p className="text-[10px] text-[var(--text-tertiary)] font-mono">
                        #{patient.patient?.folderNumber || '—'}
                      </p>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
                    <span>{patient.patient?.gender === 'male' ? '♂' : patient.patient?.gender === 'female' ? '♀' : '·'}</span>
                    <span>{patient.patient?.age || '?'} yrs</span>
                  </div>

                  {/* Context */}
                  {patient.visitType === 'antenatal' && (patient.gestationalAge || patient.edd) && (
                    <div className="space-y-1 text-[11px] text-[var(--text-secondary)]">
                      {patient.gestationalAge && (
                        <div className="flex items-center gap-1.5">
                          <Baby className="w-3 h-3 text-[var(--icon-pink-text)]" />
                          <span>{patient.gestationalAge} weeks</span>
                        </div>
                      )}
                      {patient.edd && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-[var(--icon-pink-text)]" />
                          <span>EDD: {new Date(patient.edd).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {patient.visitType === 'delivery' && patient.deliveryDate && (
                    <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
                      <Calendar className="w-3 h-3 text-[var(--icon-green-text)]" />
                      <span>Scheduled: {new Date(patient.deliveryDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  {patient.visitType === 'postnatal' && (
                    <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
                      <Heart className="w-3 h-3 text-[var(--icon-blue-text)]" />
                      <span>Day {patient.postnatalDay || 1} of follow-up</span>
                    </div>
                  )}

                  {/* Wait / attended */}
                  <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-tertiary)] pt-1">
                    {isPending ? (
                      <>
                        <Clock className="w-3 h-3" />
                        <span>Waiting {Math.floor((patient.waitTime || 0) / 60)}h {(patient.waitTime || 0) % 60}m</span>
                      </>
                    ) : (
                      <>
                        <User className="w-3 h-3" />
                        <span>Attended by {patient.completedBy || 'Staff'}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Footer action */}
                <div className={`px-4 py-2.5 border-t border-[var(--border-color)] flex items-center justify-between text-xs font-semibold transition-colors ${getActionButtonStyle(patient.visitType, isPending)}`}>
                  <span className="flex items-center gap-1.5">
                    {isPending ? <Eye className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                    {getActionButtonText(patient.visitType, isPending)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        /* ════════ TABLE VIEW ════════ */
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                <tr>
                  {['Patient', 'Visit', 'Priority', 'Wait', 'Status', 'Action'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {paginatedPatients.map((patient) => {
                  const isPending = activeTab === 'pending';
                  const name = patient.patient?.name || 'Unknown Patient';
                  const accent = getRowAccent(patient);

                  return (
                    <tr
                      key={patient.id}
                      className={`hover:bg-[var(--bg-main)] transition-colors cursor-pointer ${accent}`}
                      onClick={() => handleStartVisit(patient)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[var(--icon-pink-bg)] flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] font-bold text-[var(--icon-pink-text)]">
                              {initials(name) || <User className="w-3.5 h-3.5" />}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-[var(--text-primary)] truncate">{name}</p>
                            <p className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-1.5">
                              <span className="font-mono">#{patient.patient?.folderNumber || '—'}</span>
                              <span className="opacity-40">·</span>
                              <span>{patient.patient?.gender || '—'}</span>
                              <span className="opacity-40">·</span>
                              <span>{patient.patient?.age || '?'}y</span>
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {getVisitTypeBadge(patient.visitType)}
                          {patient.visitType === 'antenatal' && patient.gestationalAge && (
                            <p className="text-[10px] text-[var(--text-secondary)] flex items-center gap-1">
                              <Baby className="w-2.5 h-2.5 text-[var(--icon-pink-text)]" />
                              {patient.gestationalAge}w
                              {patient.edd && <> · EDD {new Date(patient.edd).toLocaleDateString([], { month: 'short', day: 'numeric' })}</>}
                            </p>
                          )}
                          {patient.visitType === 'delivery' && patient.deliveryDate && (
                            <p className="text-[10px] text-[var(--text-secondary)] flex items-center gap-1">
                              <Calendar className="w-2.5 h-2.5 text-[var(--icon-green-text)]" />
                              {new Date(patient.deliveryDate).toLocaleDateString()}
                            </p>
                          )}
                          {patient.visitType === 'postnatal' && (
                            <p className="text-[10px] text-[var(--text-secondary)] flex items-center gap-1">
                              <Heart className="w-2.5 h-2.5 text-[var(--icon-blue-text)]" />
                              Day {patient.postnatalDay || 1}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {isPending
                          ? getPriorityBadge(patient.priority, patient.riskLevel)
                          : <span className="text-xs text-[var(--text-secondary)]">
                              {patient.completedAt ? new Date(patient.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                            </span>
                        }
                      </td>

                      <td className="px-4 py-3">
                        {isPending ? (
                          <span className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                            <Clock className="w-3 h-3" />
                            {Math.floor((patient.waitTime || 0) / 60)}h {(patient.waitTime || 0) % 60}m
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--text-secondary)]">
                            {patient.completedBy || 'Staff'}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">{getStatusBadge(patient.status)}</td>

                      <td className="px-4 py-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleStartVisit(patient); }}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${getActionButtonStyle(patient.visitType, isPending)}`}
                        >
                          {isPending ? <Eye className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                          {getActionButtonText(patient.visitType, isPending)}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] px-4 py-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="text-xs text-[var(--text-secondary)]">
              Showing <strong className="text-[var(--text-primary)]">{(currentPage - 1) * itemsPerPage + 1}</strong> to{' '}
              <strong className="text-[var(--text-primary)]">{Math.min(currentPage * itemsPerPage, filteredPatients.length)}</strong>{' '}
              of <strong className="text-[var(--text-primary)]">{filteredPatients.length}</strong>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium text-[var(--text-primary)] transition-colors"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium text-[var(--text-primary)] transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}