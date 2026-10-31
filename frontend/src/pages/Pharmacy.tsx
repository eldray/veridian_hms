// src/pages/Pharmacy.tsx — Dispensing queue on the shared UI primitives
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
  FileText,
  History,
  List,
  Package,
  Pill,
  Printer,
  RefreshCw,
  Syringe,
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
  high: 'red',
  urgent: 'orange',
  medium: 'orange',
};

const PRIORITY_LABELS: Record<string, string> = {
  stat: 'HIGH',
  high: 'HIGH',
  urgent: 'MEDIUM',
  medium: 'MEDIUM',
};

const nextPendingMedication = (item: any) =>
  item.nextMedication ?? (item.medications || []).find((med: any) => med.status === 'prescribed') ?? null;

export default function Pharmacy() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const { worklistItems, fetchWorklist, view, isLoading: worklistLoading, error: worklistError } = useWorklistStore();
  useLiveRefresh(['encounters', 'nursing'], () => fetchWorklist('pharmacy', { silent: true }));

  const loadData = async () => {
    try {
      setRefreshing(true);
      setIsLoading(true);
      await fetchWorklist('pharmacy');
      const error = useWorklistStore.getState().error;
      if (error) {
        toastError('Load failed', error);
        return;
      }
      success('Data loaded', 'Dispensing queue ready');
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
      (item.attendanceNumber || '').toLowerCase().includes(lower),
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
    openItems: filteredPatients.reduce((sum, item: any) => sum + (item.prescribedCount || 0), 0),
    dispensedItems: filteredPatients.reduce((sum, item: any) => sum + (item.dispensedCount || 0), 0),
    urgent: filteredPatients.filter(
      (item: any) => item.priority === 'urgent' || item.priority === 'medium' || item.priority === 'stat' || item.priority === 'high',
    ).length,
  };

  const queueTitle = isDone
    ? `Dispensed (${filteredPatients.length} patients)`
    : isOutstanding
      ? `Awaiting Collection — Closed Visits (${filteredPatients.length} patients)`
      : `Dispensing Queue (${filteredPatients.length} patients)`;

  const handlePatientClick = (item: any) => {
    navigate(`/dashboard/dispense/${item.patientId}`, {
      state: {
        patient: {
          id: item.patientId,
          name: item.patient?.name,
          folderNumber: item.patient?.folderNumber,
          age: item.patient?.age,
          gender: item.patient?.gender,
        },
        attendanceId: item.attendanceId,
        patientGroup: item,
      },
    });
  };

  const queueHeader = (
    <PageHeader
      title="Medication Dispensing"
      subtitle="Dispensing queue and recently collected prescriptions"
      icon={Pill}
      accent="green"
      backTo="/dashboard"
      actions={(
        <>
          <Button variant="secondary" icon={Pill} onClick={() => navigate('/dashboard/dispense')}>
            Dispense
          </Button>
          <Button variant="secondary" icon={Printer} onClick={() => window.print()}>Print</Button>
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
          <div className="w-12 h-12 border-4 border-[var(--icon-green-text)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-[var(--text-secondary)]">Loading Pharmacy Queue…</p>
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
          <span>Could not load the pharmacy waiting list: {worklistError}</span>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Patients" value={stats.patients} icon={Users} accent="cyan" />
        <StatCard label="Open Prescriptions" value={stats.openItems} icon={Pill} accent="purple" />
        <StatCard label="Dispensed Items" value={stats.dispensedItems} icon={CheckCircle} accent="green" />
        <StatCard label="Urgent / Critical" value={stats.urgent} icon={AlertTriangle} accent="red" />
      </div>

      <Card>
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by patient name, folder number, or attendance number…"
        />
      </Card>

      {/* To do, completed, and prescriptions still owed on visits already closed */}
      <Card>
        <WorklistViewControls department="pharmacy" />
      </Card>

      <Card
        title={queueTitle}
        icon={isDone ? History : Package}
        accent={isDone ? 'blue' : 'green'}
        padded={false}
      >
        {filteredPatients.length === 0 ? (
          <div className="p-8 text-center">
            {worklistError ? (
              <>
                <AlertCircle className="w-12 h-12 text-[var(--icon-red-text)] mx-auto mb-3 opacity-75" />
                <p className="text-[var(--text-secondary)]">Pharmacy waiting list unavailable</p>
                <p className="text-sm text-[var(--text-tertiary)] mt-1">Refresh to try again</p>
              </>
            ) : isDone ? (
              <>
                <History className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3 opacity-50" />
                <p className="text-[var(--text-secondary)]">No medications dispensed in the last 72 hours</p>
                <p className="text-sm text-[var(--text-tertiary)] mt-1">Dispensed prescriptions will appear here</p>
              </>
            ) : isOutstanding ? (
              <>
                <CheckCircle className="w-12 h-12 text-[var(--icon-green-text)] mx-auto mb-3 opacity-50" />
                <p className="text-[var(--text-secondary)]">No closed visit is owing medication</p>
                <p className="text-sm text-[var(--text-tertiary)] mt-1">Prescriptions written before discharge have all been dispensed</p>
              </>
            ) : (
              <>
                <CheckCircle className="w-12 h-12 text-[var(--icon-green-text)] mx-auto mb-3 opacity-50" />
                <p className="text-[var(--text-secondary)]">No pending prescriptions</p>
                <p className="text-sm text-[var(--text-tertiary)] mt-1">All prescriptions have been dispensed</p>
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
                  <th className={TH}>Prescriptions</th>
                  <th className={TH}>{isDone ? 'Dispensed' : 'Next Medication'}</th>
                  {!isDone && <th className={TH}>Priority</th>}
                  <th className={TH}>{isDone ? 'Status' : isOutstanding ? 'Visit status' : 'Waiting'}</th>
                  <th className={cn(TH, 'text-center')}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPatients.map((item: any) => {
                  const pending = item.prescribedCount || 0;
                  const dispensed = item.dispensedCount || 0;
                  const total = item.prescriptionCount || pending + dispensed;
                  const nextMed = nextPendingMedication(item);
                  const dispensedTimes = (item.medications || [])
                    .filter((med: any) => med.dispensedAt)
                    .map((med: any) => new Date(med.dispensedAt).toLocaleTimeString());

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
                          <span>{item.location?.bed || 'OPD'}</span>
                          {item.location?.ward && <span className="text-xs">({item.location.ward})</span>}
                        </div>
                      </td>
                      <td className={cn(TD, 'text-center')}>
                        {pending === 0 ? (
                          <Badge tone="green" dot size="sm">All Dispensed</Badge>
                        ) : dispensed === 0 ? (
                          <Badge tone="yellow" dot size="sm">{pending} Pending</Badge>
                        ) : (
                          <Badge tone="blue" dot size="sm">{dispensed}/{total} Dispensed</Badge>
                        )}
                      </td>
                      <td className={cn(TD, 'whitespace-normal')}>
                        <div className="flex items-center gap-2 text-xs text-[var(--text-primary)]">
                          <List className="w-3 h-3 text-[var(--text-tertiary)]" />
                          {total} item{total === 1 ? '' : 's'}
                        </div>
                        <p className="text-[10px] text-[var(--text-tertiary)]">
                          {pending} pending · {dispensed} dispensed
                        </p>
                      </td>
                      <td className={cn(TD, 'whitespace-normal')}>
                        {!isDone ? (
                          nextMed ? (
                            <div className="text-xs">
                              <p className="font-medium text-[var(--text-primary)]">{nextMed.name}</p>
                              <p className="text-[var(--text-secondary)]">
                                {[nextMed.dosage, nextMed.frequency].filter(Boolean).join(' · ') || '—'}
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs text-[var(--text-secondary)]">—</span>
                          )
                        ) : (
                          <span className="text-xs text-[var(--text-secondary)]">
                            {dispensedTimes.length ? dispensedTimes.slice(0, 2).join(', ') : '—'}
                          </span>
                        )}
                      </td>
                      {!isDone && (
                        <td className={TD}>
                          <Badge tone={PRIORITY_TONES[item.priority] ?? 'blue'} dot size="sm">
                            {PRIORITY_LABELS[item.priority] ?? 'LOW'}
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
                          accent={isDone ? 'blue' : isOutstanding ? 'orange' : 'green'}
                          icon={isDone ? FileText : Syringe}
                          className="mx-auto"
                          onClick={(e) => { e.stopPropagation(); handlePatientClick(item); }}
                        >
                          {isDone ? 'View Record' : isOutstanding ? 'Hand Over' : 'Dispense'}
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
