// src/pages/Theatre.tsx — Theatre queue on the shared UI primitives
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveRefresh } from '../api/realtime';
import { useWorklistStore } from '../store/worklistStore';
import { WorklistViewControls } from '../components/worklist/WorklistViewControls';
import { useToast } from '../store/toastStore';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Bed,
  Calendar,
  CheckCircle,
  Clock,
  Eye,
  FileText,
  History,
  RefreshCw,
  Scissors,
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
  critical: 'red',
  urgent: 'orange',
};

const PRIORITY_LABELS: Record<string, string> = {
  stat: 'STAT',
  critical: 'STAT',
  urgent: 'URGENT',
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
};

/** The API counts the procedures in the group, not just the ones still to do. */
const pendingProcedureCount = (item: any) =>
  (item.scheduledCount || 0) + (item.inProgressCount || 0);

const scheduleLabel = (iso?: string | null) => {
  if (!iso) return 'Not scheduled';
  const minutes = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  const magnitude = Math.abs(minutes);
  const hours = Math.floor(magnitude / 60);
  const label = hours >= 24
    ? `${Math.floor(hours / 24)}d ${hours % 24}h`
    : `${hours}h ${magnitude % 60}m`;
  return minutes >= 0 ? `In ${label}` : `Overdue ${label}`;
};

export default function Theatre() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const { worklistItems, fetchWorklist, view, isLoading: worklistLoading, error: worklistError } = useWorklistStore();
  useLiveRefresh(['encounters', 'nursing'], () => fetchWorklist('theatre', { silent: true }));

  const loadData = async () => {
    try {
      setRefreshing(true);
      setIsLoading(true);
      await fetchWorklist('theatre');
      const error = useWorklistStore.getState().error;
      if (error) {
        toastError('Load failed', error);
        return;
      }
      success('Data loaded', 'Theatre queue ready');
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
      (item.procedureNames || '').toLowerCase().includes(lower),
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
    openProcedures: filteredPatients.reduce((sum, item: any) => sum + pendingProcedureCount(item), 0),
    inProgress: filteredPatients.filter((item: any) => item.status === 'in_progress').length,
    completedProcedures: filteredPatients.reduce((sum, item: any) => sum + (item.completedCount || 0), 0),
    urgent: filteredPatients.filter(
      (item: any) => item.priority === 'urgent' || item.priority === 'stat' || item.priority === 'critical',
    ).length,
  };

  const queueTitle = isDone
    ? `Procedures Completed (${filteredPatients.length} patients)`
    : isOutstanding
      ? `Awaiting Results — Closed Visits (${filteredPatients.length} patients)`
      : `Theatre Waiting List (${filteredPatients.length} patients)`;

  const handlePatientClick = (item: any) => {
    navigate(`/dashboard/theatre/${item.patientId}`, {
      state: {
        patient: {
          id: item.patientId,
          name: item.patient?.name,
          folderNumber: item.patient?.folderNumber,
          age: item.patient?.age,
          gender: item.patient?.gender,
        },
        attendanceId: item.attendanceId,
        procedureId: item.procedureIds?.[0] || item.nextProcedure?.id || null,
        procedure: item,
      },
    });
  };

  const queueHeader = (
    <PageHeader
      title="Theatre Management"
      subtitle="Surgical waiting list, completed procedures and closed visits owing a procedure"
      icon={Scissors}
      accent="purple"
      backTo="/dashboard"
      actions={(
        <>
          <Button variant="secondary" icon={FileText} onClick={() => navigate('/dashboard/theatre/entry')}>
            Procedure Entry
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
          <div className="w-12 h-12 border-4 border-[var(--icon-purple-text)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-[var(--text-secondary)]">Loading Theatre Queue…</p>
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
          <span>Could not load the theatre waiting list: {worklistError}</span>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Patients" value={stats.patients} icon={Users} accent="cyan" />
        <StatCard label="Open Procedures" value={stats.openProcedures} icon={Scissors} accent="purple" />
        <StatCard label="In Progress" value={stats.inProgress} icon={Activity} accent="yellow" />
        <StatCard label="Emergency / Urgent" value={stats.urgent} icon={AlertTriangle} accent="red" />
        <StatCard label="Completed Procedures" value={stats.completedProcedures} icon={History} accent="green" />
      </div>

      <Card>
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by patient name, folder number, or procedure…"
        />
      </Card>

      {/* To do, completed, and the procedures still owed on visits already closed */}
      <Card>
        <WorklistViewControls department="theatre" />
      </Card>

      <Card
        title={queueTitle}
        icon={isDone ? History : Scissors}
        accent={isDone ? 'green' : 'purple'}
        padded={false}
      >
        {filteredPatients.length === 0 ? (
          <div className="p-8 text-center">
            {worklistError ? (
              <>
                <AlertCircle className="w-12 h-12 text-[var(--icon-red-text)] mx-auto mb-3 opacity-75" />
                <p className="text-[var(--text-secondary)]">Theatre waiting list unavailable</p>
                <p className="text-sm text-[var(--text-tertiary)] mt-1">Refresh to try again</p>
              </>
            ) : isDone ? (
              <>
                <History className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3 opacity-50" />
                <p className="text-[var(--text-secondary)]">No procedures completed in the last 72 hours</p>
                <p className="text-sm text-[var(--text-tertiary)] mt-1">Performed procedures will appear here</p>
              </>
            ) : isOutstanding ? (
              <>
                <CheckCircle className="w-12 h-12 text-[var(--icon-green-text)] mx-auto mb-3 opacity-50" />
                <p className="text-[var(--text-secondary)]">No closed visit is owing a procedure</p>
                <p className="text-sm text-[var(--text-tertiary)] mt-1">Every procedure scheduled before discharge has been performed</p>
              </>
            ) : (
              <>
                <CheckCircle className="w-12 h-12 text-[var(--icon-green-text)] mx-auto mb-3 opacity-50" />
                <p className="text-[var(--text-secondary)]">No pending procedures</p>
                <p className="text-sm text-[var(--text-tertiary)] mt-1">All procedures have been completed</p>
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
                  <th className={cn(TH, 'text-center')}>Status</th>
                  <th className={TH}>Procedures</th>
                  <th className={TH}>{isDone ? 'Completed' : 'Scheduled'}</th>
                  {!isDone && <th className={TH}>Priority</th>}
                  <th className={TH}>{isDone ? 'Done' : isOutstanding ? 'Visit status' : 'Starts'}</th>
                  <th className={cn(TH, 'text-center')}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPatients.map((item: any) => (
                  <tr
                    key={item.id}
                    className={cn(TR, 'cursor-pointer')}
                    onClick={() => handlePatientClick(item)}
                  >
                    <td className={TD}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[var(--icon-purple-bg)] rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-[var(--icon-purple-text)]" />
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
                        <span>{item.location?.bed || item.location?.ward || 'Theatre'}</span>
                        {item.location?.ward && item.location?.bed && (
                          <span className="text-xs">({item.location.ward})</span>
                        )}
                      </div>
                    </td>
                    <td className={cn(TD, 'text-center')}>
                      <Badge tone={statusTone(isOutstanding ? item.attendanceStatus : item.status)} dot size="sm">
                        {STATUS_LABELS[isOutstanding ? item.attendanceStatus : item.status]
                          ?? humanStatus(isOutstanding ? item.attendanceStatus : item.status)}
                      </Badge>
                    </td>
                    <td className={cn(TD, 'whitespace-normal')}>
                      <p className="text-sm text-[var(--text-primary)] max-w-[220px] truncate">
                        {item.procedureNames || item.nextProcedure?.name || '—'}
                      </p>
                      <p className="text-[10px] text-[var(--text-tertiary)]">
                        {item.procedureCount || 0} procedure{(item.procedureCount || 0) === 1 ? '' : 's'}
                        {!isDone && item.scheduledCount ? ` • ${item.scheduledCount} scheduled` : ''}
                      </p>
                    </td>
                    <td className={cn(TD, 'text-xs text-[var(--text-secondary)]')}>
                      {isDone ? (
                        `${item.completedCount || 0} completed`
                      ) : (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {item.earliestScheduledDate
                            ? new Date(item.earliestScheduledDate).toLocaleString()
                            : 'Not scheduled'}
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
                        <span className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                          <CheckCircle className="w-3.5 h-3.5" />
                          {item.status === 'completed' ? 'Completed' : humanStatus(item.status)}
                        </span>
                      ) : isOutstanding ? (
                        <span className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
                          <Clock className="w-3.5 h-3.5" />
                          owing {Math.floor((item.waitTime || 0) / 60)}h {(item.waitTime || 0) % 60}m
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                          <Clock className="w-3.5 h-3.5" />
                          {item.status === 'in_progress' ? 'In progress' : scheduleLabel(item.earliestScheduledDate)}
                        </span>
                      )}
                    </td>
                    <td className={cn(TD, 'text-center')}>
                      <Button
                        size="sm"
                        variant="soft"
                        accent={isDone ? 'blue' : isOutstanding ? 'orange' : 'purple'}
                        icon={isDone ? FileText : Eye}
                        className="mx-auto"
                        onClick={(e) => { e.stopPropagation(); handlePatientClick(item); }}
                      >
                        {isDone ? 'View Report' : isOutstanding ? 'Complete' : 'Manage'}
                      </Button>
                    </td>
                  </tr>
                ))}
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
