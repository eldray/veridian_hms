// src/pages/Laboratory.tsx — Laboratory queue on the shared UI primitives
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveRefresh } from '../api/realtime';
import { useWorklistStore } from '../store/worklistStore';
import { WorklistViewControls } from '../components/worklist/WorklistViewControls';
import { useToast } from '../store/toastStore';
import {
  AlertCircle,
  AlertTriangle,
  Bed,
  CheckCircle,
  Clock,
  Eye,
  FileText,
  FlaskConical,
  History,
  Microscope,
  RefreshCw,
  User,
  Users,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  humanStatus,
  PageHeader,
  Pagination,
  SearchInput,
  StatCard,
  statusTone,
  TD,
  TD_MONO,
  TH,
  TH_ROW,
  TR,
  cn,
  type BadgeTone,
} from '../components/ui';

const PRIORITY_TONES: Record<string, BadgeTone> = {
  stat: 'red',
  urgent: 'orange',
};

const PRIORITY_LABELS: Record<string, string> = {
  stat: 'STAT',
  urgent: 'URGENT',
};

/** Each grouped row carries the raw LabTest rows; the API returns no `nextTest`. */
const testName = (test: any) => test.labTestTemplate?.name || 'Lab test';

const pendingTests = (item: any) =>
  (item.tests || []).filter((test: any) => test.status === 'requested' || test.status === 'in_progress');

const completedTests = (item: any) =>
  (item.tests || [])
    .filter((test: any) => test.status === 'completed')
    .sort((a: any, b: any) => new Date(b.completedAt ?? 0).getTime() - new Date(a.completedAt ?? 0).getTime());

const ProgressBadge = ({ requested, inProgress, completed }: { requested: number; inProgress: number; completed: number }) => {
  const total = requested + inProgress + completed;
  const pending = requested + inProgress;

  if (pending === 0) {
    return <Badge tone="green" dot size="sm">All Completed</Badge>;
  }
  if (completed === 0) {
    return <Badge tone="yellow" dot size="sm">{pending} Pending</Badge>;
  }
  return <Badge tone="blue" dot size="sm">{completed}/{total} Completed</Badge>;
};

export default function Laboratory() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const { worklistItems, fetchWorklist, view, isLoading: worklistLoading, error: worklistError } = useWorklistStore();
  useLiveRefresh(['encounters', 'nursing'], () => fetchWorklist('lab', { silent: true }));

  const loadData = async () => {
    try {
      setRefreshing(true);
      setIsLoading(true);
      await fetchWorklist('lab');
      const error = useWorklistStore.getState().error;
      if (error) {
        toastError('Load failed', error);
        return;
      }
      success('Data loaded', 'Laboratory ready');
    } catch (err: any) {
      toastError('Load failed', err.message || 'Could not load data');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // The server returns the queue for the active view, so no status split happens here.
  const filteredPatients = useMemo(() => {
    if (!searchQuery) return worklistItems;
    const lower = searchQuery.toLowerCase();
    return worklistItems.filter((item: any) =>
      item.patient?.name?.toLowerCase().includes(lower) ||
      item.patient?.folderNumber?.toLowerCase().includes(lower) ||
      (item.attendanceNumber || '').toLowerCase().includes(lower) ||
      (item.tests || []).some((test: any) => testName(test).toLowerCase().includes(lower)),
    );
  }, [worklistItems, searchQuery]);

  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
  const paginatedPatients = filteredPatients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [view, searchQuery]);

  const isDone = view === 'completed';
  const isOutstanding = view === 'outstanding';

  const stats = {
    patients: filteredPatients.length,
    openTests: filteredPatients.reduce(
      (sum, item: any) => sum + (item.requestedCount || 0) + (item.inProgressCount || 0),
      0,
    ),
    completedTests: filteredPatients.reduce((sum, item: any) => sum + (item.completedCount || 0), 0),
    urgent: filteredPatients.filter((item: any) => item.priority === 'urgent' || item.priority === 'stat').length,
  };

  const queueTitle = isDone
    ? `Tests Completed (${filteredPatients.length} patients)`
    : isOutstanding
      ? `Awaiting Results — Closed Visits (${filteredPatients.length} patients)`
      : `Laboratory Waiting List (${filteredPatients.length} patients)`;

  const handlePatientClick = (item: any) => {
    navigate(`/dashboard/laboratory/${item.patientId}`, {
      state: {
        patient: {
          id: item.patientId,
          name: item.patient?.name,
          folderNumber: item.patient?.folderNumber,
          age: item.patient?.age,
          gender: item.patient?.gender,
        },
        attendanceId: item.attendanceId,
        fromWaitingList: true,
        activeTab: isDone ? undefined : 'lab',
      },
    });
  };

  const queueHeader = (
    <PageHeader
      title="Laboratory Management"
      subtitle="Specimen waiting list and entered results"
      icon={Microscope}
      accent="cyan"
      backTo="/dashboard"
      actions={(
        <>
          <Button variant="secondary" icon={FileText} onClick={() => navigate('/dashboard/laboratory/entry')}>
            Enter Results
          </Button>
          <Button icon={RefreshCw} loading={refreshing} onClick={loadData}>Refresh</Button>
        </>
      )}
    />
  );

  if (isLoading || worklistLoading) {
    return (
      <div className="space-y-6 p-6">
        {queueHeader}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl py-16 text-center">
          <div className="w-12 h-12 border-4 border-[var(--icon-cyan-text)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-[var(--text-secondary)]">Loading Laboratory Queue…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {queueHeader}

      {worklistError && (
        <div role="alert" className="flex items-center gap-2 rounded-lg border border-[var(--icon-red-text)] bg-[var(--icon-red-bg)] px-4 py-3 text-sm text-[var(--icon-red-text)]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Could not load the laboratory waiting list: {worklistError}</span>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Patients" value={stats.patients} icon={Users} accent="cyan" />
        <StatCard label="Open Tests" value={stats.openTests} icon={FlaskConical} accent="purple" />
        <StatCard label="Completed Tests" value={stats.completedTests} icon={CheckCircle} accent="green" />
        <StatCard label="Urgent / STAT" value={stats.urgent} icon={AlertTriangle} accent="red" />
      </div>

      <Card>
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by patient name, folder number, or test…"
        />
      </Card>

      {/* To do, completed, and the requests still owed on visits already closed */}
      <Card>
        <WorklistViewControls department="lab" />
      </Card>

      <Card
        title={queueTitle}
        icon={isDone ? History : Microscope}
        accent={isDone ? 'green' : 'purple'}
        padded={false}
      >
        {filteredPatients.length === 0 ? (
          <div className="p-8 text-center">
            {worklistError ? (
              <>
                <AlertCircle className="w-12 h-12 text-[var(--icon-red-text)] mx-auto mb-3 opacity-75" />
                <p className="text-[var(--text-secondary)]">Laboratory waiting list unavailable</p>
                <p className="text-sm text-[var(--text-tertiary)] mt-1">Refresh to try again</p>
              </>
            ) : isDone ? (
              <>
                <History className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3 opacity-50" />
                <p className="text-[var(--text-secondary)]">No tests completed in the last 72 hours</p>
                <p className="text-sm text-[var(--text-tertiary)] mt-1">Entered results will appear here</p>
              </>
            ) : isOutstanding ? (
              <>
                <CheckCircle className="w-12 h-12 text-[var(--icon-green-text)] mx-auto mb-3 opacity-50" />
                <p className="text-[var(--text-secondary)]">No closed visit is owing a lab result</p>
                <p className="text-sm text-[var(--text-tertiary)] mt-1">Results requested before discharge have all been entered</p>
              </>
            ) : (
              <>
                <CheckCircle className="w-12 h-12 text-[var(--icon-green-text)] mx-auto mb-3 opacity-50" />
                <p className="text-[var(--text-secondary)]">No pending lab tests</p>
                <p className="text-sm text-[var(--text-tertiary)] mt-1">All tests have been completed</p>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={TH_ROW}>
                <tr>
                  <th className={TH}>Patient</th>
                  <th className={TH}>Folder #</th>
                  <th className={TH}>Attendance #</th>
                  <th className={TH}>Visit date</th>
                  <th className={TH}>Location</th>
                  <th className={cn(TH, 'text-center')}>Progress</th>
                  <th className={TH}>Tests</th>
                  <th className={TH}>{isDone ? 'Completed' : 'Next Test'}</th>
                  {!isDone && <th className={TH}>Priority</th>}
                  <th className={TH}>{isDone ? 'Status' : isOutstanding ? 'Visit status' : 'Waiting'}</th>
                  <th className={cn(TH, 'text-center')}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPatients.map((item: any) => {
                  const pending = pendingTests(item);
                  const done = completedTests(item);
                  const requested = item.requestedCount || 0;
                  const inProgress = item.inProgressCount || 0;
                  const completed = item.completedCount || 0;
                  const next = pending[0] ?? null;

                  return (
                    <tr
                      key={item.id}
                      className={cn(TR, 'cursor-pointer')}
                      onClick={() => handlePatientClick(item)}
                    >
                      <td className={TD}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-[var(--icon-cyan-bg)] rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                          </div>
                          <div>
                            <p className="font-medium text-[var(--text-primary)] text-sm">{item.patient?.name}</p>
                            <p className="text-xs text-[var(--text-secondary)]">
                              {item.patient?.age} years • {item.patient?.gender}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className={TD_MONO}>{item.patient?.folderNumber || '—'}</td>
                      <td className={TD_MONO}>{item.attendanceNumber || '—'}</td>
                      <td className={cn(TD, 'text-xs text-[var(--text-secondary)]')}>
                        {item.attendanceDateTime ? new Date(item.attendanceDateTime).toLocaleString() : '—'}
                      </td>
                      <td className={TD}>
                        <div className="flex items-center gap-1 text-[var(--text-secondary)]">
                          <Bed className="w-3.5 h-3.5" />
                          <span>{item.location?.ward || item.location?.bed || 'OPD'}</span>
                          {item.location?.bed && item.location?.ward && (
                            <span className="text-xs">({item.location.bed})</span>
                          )}
                        </div>
                      </td>
                      <td className={cn(TD, 'text-center')}>
                        <ProgressBadge requested={requested} inProgress={inProgress} completed={completed} />
                      </td>
                      <td className={cn(TD, 'whitespace-normal')}>
                        <p className="text-sm text-[var(--text-primary)]">
                          {item.testCount || 0} test{(item.testCount || 0) === 1 ? '' : 's'}
                        </p>
                        <p className="text-[10px] text-[var(--text-tertiary)]">
                          {requested} pending · {inProgress} in progress · {completed} completed
                        </p>
                      </td>
                      <td className={cn(TD, 'whitespace-normal')}>
                        {!isDone ? (
                          next ? (
                            <div className="text-xs">
                              <p className="font-medium text-[var(--text-primary)]">{testName(next)}</p>
                              <p className="text-[var(--text-secondary)]">
                                {next.status === 'in_progress' ? 'In progress' : 'Requested'}{' '}
                                {next.requestedAt ? new Date(next.requestedAt).toLocaleDateString() : ''}
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs text-[var(--text-secondary)]">—</span>
                          )
                        ) : (
                          <div className="flex flex-col gap-1">
                            {done.slice(0, 2).map((test: any) => (
                              <div key={test.id} className="text-xs">
                                <span className="font-medium">{testName(test)}</span>
                                <span className="text-[var(--text-tertiary)] ml-1">
                                  ({test.completedAt ? new Date(test.completedAt).toLocaleTimeString() : '—'})
                                </span>
                              </div>
                            ))}
                            {done.length > 2 && (
                              <span className="text-xs text-[var(--text-tertiary)]">+{done.length - 2} more</span>
                            )}
                            {done.length === 0 && <span className="text-xs text-[var(--text-secondary)]">—</span>}
                          </div>
                        )}
                      </td>
                      {!isDone && (
                        <td className={TD}>
                          <Badge tone={PRIORITY_TONES[item.priority] ?? 'blue'} dot size="sm">
                            {PRIORITY_LABELS[item.priority] ?? 'ROUTINE'}
                          </Badge>
                        </td>
                      )}
                      <td className={TD}>
                        {isDone ? (
                          <Badge tone={statusTone(item.status)} dot size="sm">{humanStatus(item.status)}</Badge>
                        ) : isOutstanding ? (
                          <div className="space-y-1">
                            <Badge tone={statusTone(item.attendanceStatus)} dot size="sm">
                              {humanStatus(item.attendanceStatus)}
                            </Badge>
                            <p className="flex items-center gap-1 text-[10px] text-[var(--text-tertiary)]">
                              <Clock className="w-3 h-3" />
                              owing {Math.floor((item.waitTime || 0) / 60)}h {(item.waitTime || 0) % 60}m
                            </p>
                          </div>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                            <Clock className="w-3.5 h-3.5" />
                            {Math.floor((item.waitTime || 0) / 60)}h {(item.waitTime || 0) % 60}m
                          </span>
                        )}
                      </td>
                      <td className={cn(TD, 'text-center')}>
                        <Button
                          size="sm"
                          variant="soft"
                          accent={isDone ? 'blue' : isOutstanding ? 'orange' : 'cyan'}
                          icon={isDone ? FileText : Eye}
                          className="mx-auto"
                          onClick={(e) => { e.stopPropagation(); handlePatientClick(item); }}
                        >
                          {isDone ? 'View Report' : isOutstanding ? 'Enter Result' : 'Process'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

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
