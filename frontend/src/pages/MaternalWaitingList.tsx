// src/pages/MaternalWaitingList.tsx — Maternal queue on the shared UI primitives
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveRefresh } from '../api/realtime';
import { useWorklistStore } from '../store/worklistStore';
import { WorklistViewControls } from '../components/worklist/WorklistViewControls';
import { useToast } from '../store/toastStore';
import {
  AlertCircle, AlertTriangle, Baby, Calendar, CheckCircle, Clock, Eye, FileText, Heart,
  History, Hospital, LayoutGrid, List, RefreshCw, Stethoscope, User, Users,
} from 'lucide-react';
import {
  accentVar,
  Badge,
  Button,
  Card,
  humanStatus,
  PageHeader,
  Pagination,
  SearchInput,
  Segmented,
  StatCard,
  statusTone,
  Tabs,
  TABLE_SHELL,
  TD,
  TD_MONO,
  TH,
  TH_ROW,
  TR,
  cn,
  type Accent,
  type BadgeTone,
  type TabItem,
} from '../components/ui';

// ── Chips (shared Badge; only this queue's own tones and wording live here) ────
const VISIT_TYPES: Record<string, { tone: BadgeTone; label: string; accent: Accent; Icon: typeof Baby }> = {
  antenatal: { tone: 'purple', label: 'Antenatal', accent: 'purple', Icon: Baby },
  delivery: { tone: 'green', label: 'Delivery', accent: 'green', Icon: Hospital },
  postnatal: { tone: 'blue', label: 'Postnatal', accent: 'blue', Icon: Heart },
};

const getVisitTypeBadge = (type: string) => {
  const meta = VISIT_TYPES[type];
  const Icon = meta?.Icon ?? Stethoscope;
  return (
    <Badge tone={meta?.tone ?? 'neutral'} size="sm">
      <Icon className="w-2.5 h-2.5" />
      {meta?.label ?? 'Other'}
    </Badge>
  );
};

const priorityTone = (priority: string, riskLevel?: string): BadgeTone => {
  if (riskLevel === 'high' || priority === 'stat' || priority === 'emergency') return 'red';
  if (riskLevel === 'medium' || priority === 'urgent') return 'orange';
  return 'green';
};

const priorityLabel = (priority: string, riskLevel?: string): string => {
  if (riskLevel === 'high') return 'HIGH RISK';
  if (riskLevel === 'medium') return 'MEDIUM RISK';
  if (priority === 'stat' || priority === 'emergency') return 'EMERGENCY';
  if (priority === 'urgent') return 'URGENT';
  return 'SCHEDULED';
};

const initials = (name: string) =>
  (name || '').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');

// Visit type tabs — counts are added at render time, colours come from VISIT_TYPES.
const VISIT_TABS = [
  { key: 'all', label: 'All', icon: Users },
  { key: 'antenatal', label: 'Antenatal', icon: Baby },
  { key: 'delivery', label: 'Delivery', icon: Hospital },
  { key: 'postnatal', label: 'Postnatal', icon: Heart },
] as const;

const MATERNAL_VISIT_TYPES = new Set<string>(Object.keys(VISIT_TYPES));

const QUEUE_TABS: TabItem[] = [
  { key: 'pending', label: 'Pending Visits', icon: Clock },
  { key: 'recent', label: 'Recent Visits Today', icon: CheckCircle },
];

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

  const { worklistItems, fetchWorklist, view } = useWorklistStore();

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

  // "Awaiting results" reads the hospital-wide warning list, so this queue keeps only its own
  // visits: a maternal list must never offer a male chronic-care or specialist visit.
  const queueItems = useMemo<any[]>(
    () => worklistItems.filter(item => MATERNAL_VISIT_TYPES.has((item as any).visitType)),
    [worklistItems],
  );

  const pendingPatients = useMemo(
    () => queueItems.filter(item => !item.hasBeenAttended && item.status !== 'completed'),
    [queueItems],
  );

  const recentPatients = useMemo(
    () => queueItems.filter(item => item.hasBeenAttended || item.status === 'completed'),
    [queueItems],
  );

  const getFilteredByVisitType = (patients: any[]) => {
    if (activeVisitType === 'all') return patients;
    return patients.filter(p => p.visitType === activeVisitType);
  };

  const filteredPatients = useMemo(() => {
    const source = view === 'pending'
      ? getFilteredByVisitType(activeTab === 'pending' ? pendingPatients : recentPatients)
      : getFilteredByVisitType(queueItems as any[]);
    if (!searchQuery) return source;
    const lower = searchQuery.toLowerCase();
    return source.filter(patient =>
      patient.patient?.name?.toLowerCase().includes(lower) ||
      patient.patient?.folderNumber?.toLowerCase().includes(lower) ||
      (patient.attendanceNumber || '').toLowerCase().includes(lower) ||
      patient.complaints?.toLowerCase().includes(lower),
    );
  }, [pendingPatients, recentPatients, queueItems, searchQuery, activeTab, activeVisitType, view]);

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

  // The visit type decides the action's colour; the shared soft button paints it from the token.
  const getActionAccent = (visitType: string, isPending: boolean): Accent =>
    isPending ? (VISIT_TYPES[visitType]?.accent ?? 'cyan') : 'purple';

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
      case 'antenatal': return 'bg-[var(--icon-purple-text)]';
      case 'delivery':  return 'bg-[var(--icon-green-text)]';
      case 'postnatal': return 'bg-[var(--icon-blue-text)]';
      default:          return 'bg-[var(--icon-cyan-text)]';
    }
  };

  // One header for the whole screen, so the loading branch and the queue open identically.
  const queueHeader = (
    <PageHeader
      title="Maternal Health Queue"
      subtitle="Antenatal · Delivery · Postnatal waiting patients"
      icon={Baby}
      accent="green"
      backTo="/dashboard"
      actions={(
        <>
          <Button variant="secondary" icon={Baby} onClick={() => navigate('/dashboard/antenatal')}>
            Antenatal Entry
          </Button>
          <Button icon={RefreshCw} loading={refreshing} onClick={loadData}>Refresh</Button>
        </>
      )}
      tabs={(
        <div className="space-y-3">
          <Tabs
            tabs={VISIT_TABS.map(tab => ({ ...tab, count: getVisitTabCount(tab.key) }))}
            active={activeVisitType}
            onChange={(key) => setActiveVisitType(key as 'all' | 'antenatal' | 'delivery' | 'postnatal')}
            accent="green"
            aria-label="Visit type"
          />
          {view === 'pending' && (
            <Tabs
              tabs={QUEUE_TABS.map(tab => ({
                ...tab,
                count: tab.key === 'pending' ? stats.total : stats.recentCompleted,
              }))}
              active={activeTab}
              onChange={(key) => setActiveTab(key as 'pending' | 'recent')}
              accent="green"
              aria-label="Review status"
            />
          )}
        </div>
      )}
    />
  );

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        {queueHeader}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl py-16 text-center">
          <div className="w-12 h-12 border-4 border-[var(--icon-green-text)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-[var(--text-secondary)]">Loading Maternal Queue…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {queueHeader}

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Waiting" value={stats.total} icon={Users} accent="cyan" />
        <StatCard label="High Risk" value={stats.highRisk} icon={AlertTriangle} accent="red" />
        <StatCard label="Urgent" value={stats.urgent} icon={AlertCircle} accent="orange" />
        <StatCard label="Completed Today" value={stats.recentCompleted} icon={CheckCircle} accent="purple" />
      </div>

      {/* ── Search + view toggle ── */}
      <Card>
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
          <SearchInput
            className="w-full"
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by patient name, folder number, or complaint…"
          />
          <Segmented
            options={[{ value: 'grid', icon: LayoutGrid }, { value: 'table', icon: List }]}
            value={viewMode}
            onChange={setViewMode}
            accent="green"
            aria-label="Queue layout"
          />
        </div>
      </Card>

      {/* ── Queue view: open visits, visits closed today, visits closed with a result still owed ── */}
      <Card>
        <WorklistViewControls department="maternal" />
      </Card>

      {/* ── List ── */}
      {filteredPatients.length === 0 ? (
        <Card padded={false}>
          <div className="p-12 text-center">
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
        </Card>
      ) : viewMode === 'grid' ? (
        /* ════════ GRID VIEW ════════ */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {paginatedPatients.map((patient) => {
            const isPending = activeTab === 'pending';
            const name = patient.patient?.name || 'Unknown Patient';
            const accent = getRowAccent(patient);
            const actionAccent = getActionAccent(patient.visitType, isPending);

            // The whole card is the affordance that opens the visit, so it stays exactly a card.
            return (
              <button
                key={patient.id}
                onClick={() => handleStartVisit(patient)}
                className={cn(
                  'text-left bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] hover:shadow-md',
                  'transition-all overflow-hidden group flex flex-col',
                  accent,
                )}
              >
                {/* Top color bar per visit type */}
                <div className={cn('h-1', getCardAccentBar(patient.visitType))} />

                {/* Header: visit type + priority */}
                <div className="flex items-center justify-between gap-2 p-3.5 pb-3">
                  {getVisitTypeBadge(patient.visitType)}
                  {isPending ? (
                    <Badge tone={priorityTone(patient.priority, patient.riskLevel)} dot size="sm">
                      {priorityLabel(patient.priority, patient.riskLevel)}
                    </Badge>
                  ) : (
                    <span className="text-[10px] text-[var(--text-tertiary)] font-mono">
                      {patient.completedAt ? new Date(patient.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </span>
                  )}
                </div>

                {/* Body */}
                <div className="px-4 pb-4 flex-1 space-y-3">
                  {/* Patient */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--icon-green-bg)] border border-[var(--border-color)] flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-[var(--icon-green-text)]">
                        {initials(name) || <User className="w-4 h-4" />}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[var(--text-primary)] truncate">{name}</p>
                      <p className="text-[10px] text-[var(--text-tertiary)] font-mono">
                        #{patient.patient?.folderNumber || '—'} · {patient.attendanceNumber || '—'}
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
                          <Baby className="w-3 h-3 text-[var(--icon-purple-text)]" />
                          <span>{patient.gestationalAge} weeks</span>
                        </div>
                      )}
                      {patient.edd && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-[var(--icon-purple-text)]" />
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
                <div
                  className="px-4 py-2.5 border-t border-[var(--border-color)] flex items-center justify-between text-xs font-semibold transition-colors"
                  style={{ background: accentVar(actionAccent, 'bg'), color: accentVar(actionAccent, 'text') }}
                >
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
        <div className={TABLE_SHELL}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={TH_ROW}>
                <tr>
                  {['Patient', 'Folder #', 'Attendance #', 'Visit', 'Priority', 'Wait', 'Status', 'Action'].map(h => (
                    <th key={h} className={TH}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedPatients.map((patient) => {
                  const isPending = activeTab === 'pending';
                  const name = patient.patient?.name || 'Unknown Patient';
                  const accent = getRowAccent(patient);

                  return (
                    <tr
                      key={patient.id}
                      className={cn(TR, 'cursor-pointer', accent)}
                      onClick={() => handleStartVisit(patient)}
                    >
                      <td className={TD}>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[var(--icon-green-bg)] flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] font-bold text-[var(--icon-green-text)]">
                              {initials(name) || <User className="w-3.5 h-3.5" />}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-[var(--text-primary)] truncate">{name}</p>
                            <p className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-1.5">
                              <span>{patient.patient?.gender || '—'}</span>
                              <span className="opacity-40">·</span>
                              <span>{patient.patient?.age || '?'}y</span>
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className={TD_MONO}>{patient.patient?.folderNumber || '—'}</td>

                      <td className={TD_MONO}>
                        <div className="space-y-0.5">
                          <p>{patient.attendanceNumber || '—'}</p>
                          {patient.attendanceDateTime && (
                            <p className="text-[10px] text-[var(--text-tertiary)]">
                              {new Date(patient.attendanceDateTime).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className={TD}>
                        <div className="space-y-1">
                          {getVisitTypeBadge(patient.visitType)}
                          {patient.visitType === 'antenatal' && patient.gestationalAge && (
                            <p className="text-[10px] text-[var(--text-secondary)] flex items-center gap-1">
                              <Baby className="w-2.5 h-2.5 text-[var(--icon-purple-text)]" />
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

                      <td className={TD}>
                        {isPending ? (
                          <Badge tone={priorityTone(patient.priority, patient.riskLevel)} dot size="sm">
                            {priorityLabel(patient.priority, patient.riskLevel)}
                          </Badge>
                        ) : (
                          <span className="text-xs text-[var(--text-secondary)]">
                            {patient.completedAt ? new Date(patient.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </span>
                        )}
                      </td>

                      <td className={TD}>
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

                      <td className={TD}>
                        <Badge tone={statusTone(patient.status)} dot size="sm">{humanStatus(patient.status)}</Badge>
                      </td>

                      <td className={TD}>
                        <Button
                          size="sm"
                          variant="soft"
                          accent={getActionAccent(patient.visitType, isPending)}
                          icon={isPending ? Eye : FileText}
                          onClick={(e) => { e.stopPropagation(); handleStartVisit(patient); }}
                        >
                          {getActionButtonText(patient.visitType, isPending)}
                        </Button>
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
      <Pagination
        page={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        totalItems={filteredPatients.length}
        noun="patients"
        onChange={setCurrentPage}
      />
    </div>
  );
}
