import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveRefresh } from '../api/realtime';
import { useToast } from '../store/toastStore';
import api from '../api/api';
import { PatientAvatar } from '../components/patients/PatientAvatar';
import { getPatientName, getPatientFolderNumber, getAttendanceNumber } from '../utils/patient';
import ImmunizationSectionTabs from '../components/immunization/ImmunizationSectionTabs';
import {
  AlertCircle, ArrowRight, CheckCircle, Clock, RefreshCw, Syringe, Users, UserCheck,
} from 'lucide-react';
import {
  Badge, Button, Card, humanStatus, PageHeader, Pagination, SearchInput,
  StatCard, statusTone, Tabs, TABLE_SHELL, TD, TD_MONO, TH, TH_ROW, TR, cn,
} from '../components/ui';

type Patient = {
  id: string;
  surname?: string;
  otherNames?: string;
  folderNumber?: string;
  phoneNumber?: string;
  age?: number;
  dateOfBirth?: string;
  gender?: string;
  imageUrl?: string | null;
};
type Visit = {
  id: string;
  attendanceNumber?: string;
  attendanceType?: string;
  dateTime?: string;
  status?: string;
  Patient?: Patient;
};

const patientName = (patient?: Patient) => getPatientName(patient);
const patientAge = (patient?: Patient) => {
  if (patient?.age != null) return patient.age;
  if (!patient?.dateOfBirth) return undefined;
  const dob = new Date(patient.dateOfBirth);
  if (Number.isNaN(dob.getTime())) return undefined;
  const now = new Date();
  return now.getFullYear() - dob.getFullYear() - (now.getMonth() < dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate()) ? 1 : 0);
};
const normalizedStatus = (status?: string) => (status || 'pending').toLowerCase();
const isCompleted = (status?: string) =>
  ['completed', 'complete', 'closed', 'discharged', 'done'].includes(normalizedStatus(status));
const isInProgress = (status?: string) =>
  ['in_progress', 'attending', 'processing'].includes(normalizedStatus(status));
type QueueTab = 'pending' | 'completed';

export default function ImmunizationWorkspace() {
  const navigate = useNavigate();
  const { error: toastError } = useToast();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<QueueTab>('pending');
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadWaitingList = async (silent = false) => {
    setRefreshing(true);
    if (!silent) setLoading(true);
    setError('');
    try {
      const response = await api.get('/immunization/attendances');
      setVisits(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (e: any) {
      const message = e.response?.data?.message || e.message || 'Unable to load the immunization waiting list.';
      setError(message);
      toastError('Load failed', message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { void loadWaitingList(); }, []);
  useLiveRefresh(['encounters'], () => loadWaitingList(true));

  const filteredVisits = useMemo(() => {
    const term = search.trim().toLowerCase();
    return visits.filter(visit => !term || [
      visit.Patient?.otherNames, visit.Patient?.surname, patientName(visit.Patient),
      getPatientFolderNumber(visit), visit.Patient?.phoneNumber, getAttendanceNumber(visit),
    ].some(value => String(value ?? '').toLowerCase().includes(term)));
  }, [visits, search]);

  const pendingVisits = useMemo(() => filteredVisits
    .filter(visit => !isCompleted(visit.status))
    .sort((a, b) => new Date(a.dateTime || 0).getTime() - new Date(b.dateTime || 0).getTime()), [filteredVisits]);
  const completedVisits = useMemo(() => filteredVisits
    .filter(visit => isCompleted(visit.status))
    .sort((a, b) => new Date(b.dateTime || 0).getTime() - new Date(a.dateTime || 0).getTime()), [filteredVisits]);
  const queue = activeTab === 'pending' ? pendingVisits : completedVisits;

  useEffect(() => { setCurrentPage(1); }, [search]);
  const totalPages = Math.max(1, Math.ceil(queue.length / itemsPerPage));
  const paginatedVisits = queue.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const completedCount = filteredVisits.filter(visit => isCompleted(visit.status)).length;
  const inProgressCount = filteredVisits.filter(visit => isInProgress(visit.status)).length;
  const waitingCount = filteredVisits.filter(visit => !isCompleted(visit.status) && !isInProgress(visit.status)).length;

  const openEntries = (visit: Visit) => {
    if (visit.Patient?.id) navigate(`/dashboard/immunization/entries/${visit.Patient.id}?attendanceId=${encodeURIComponent(visit.id)}`);
  };

  const markCompleted = async (visit: Visit) => {
    setCompletingId(visit.id);
    setError('');
    try {
      await api.patch(`/immunization/attendances/${visit.id}/complete`);
      await loadWaitingList();
      setActiveTab('pending');
    } catch (e: any) {
      setError(e.response?.data?.message || e.message || 'Could not complete this immunization visit.');
    } finally {
      setCompletingId(null);
    }
  };

  const pageHeader = (
    <PageHeader
      title="Immunization Management"
      subtitle="Immunization waiting list and patient vaccination entries"
      icon={Syringe}
      accent="cyan"
      backTo="/dashboard"
      actions={<Button icon={RefreshCw} loading={refreshing} onClick={() => void loadWaitingList()}>Refresh</Button>}
      tabs={(
        <Tabs
          tabs={[
            { key: 'pending', label: 'Pending', count: pendingVisits.length },
            { key: 'completed', label: 'Completed', count: completedVisits.length },
          ]}
          active={activeTab}
          onChange={(key) => { setActiveTab(key as QueueTab); setCurrentPage(1); }}
          accent="cyan"
          aria-label="Immunization visit status"
        />
      )}
    />
  );

  if (loading) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        {pageHeader}
        <ImmunizationSectionTabs />
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl py-8 text-center">
          <div className="w-12 h-12 border-4 border-[var(--icon-cyan-text)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-[var(--text-secondary)]">Loading Immunization Queue…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {pageHeader}
      <ImmunizationSectionTabs />

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-lg border border-[var(--icon-red-text)] bg-[var(--icon-red-bg)] px-4 py-3 text-sm text-[var(--icon-red-text)]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Could not load the immunization waiting list: {error}</span>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Visits" value={filteredVisits.length} icon={Users} accent="cyan" />
        <StatCard label="Waiting" value={waitingCount} icon={Clock} accent="orange" />
        <StatCard label="In Progress" value={inProgressCount} icon={UserCheck} accent="purple" />
        <StatCard label="Completed" value={completedCount} icon={CheckCircle} accent="green" />
      </div>

      <Card>
        <SearchInput
          className="w-full"
          value={search}
          onChange={setSearch}
          placeholder="Search by patient name, folder number, phone, or attendance number…"
        />
      </Card>

      <Card
        title={`${activeTab === 'pending' ? 'Pending' : 'Completed'} Immunization Visits (${queue.length})`}
        description="Select a patient to record vaccines and review their immunization history"
        icon={Syringe}
        accent="cyan"
        padded={false}
      >
        {queue.length === 0 ? (
          <div className="p-8 text-center">
            {error ? (
              <>
                <AlertCircle className="w-12 h-12 text-[var(--icon-red-text)] mx-auto mb-3 opacity-75" />
                <p className="text-[var(--text-secondary)]">Immunization waiting list unavailable</p>
                <p className="text-sm text-[var(--text-tertiary)] mt-1">Refresh to try again</p>
              </>
            ) : (
              <>
                <CheckCircle className="w-12 h-12 text-[var(--icon-green-text)] mx-auto mb-3 opacity-50" />
                <p className="text-[var(--text-secondary)]">{search ? 'No patients match your search' : activeTab === 'pending' ? 'No pending immunization visits' : 'No completed immunization visits'}</p>
                <p className="text-sm text-[var(--text-tertiary)] mt-1">New immunization attendances will appear in Pending</p>
              </>
            )}
          </div>
        ) : (
          <div className={TABLE_SHELL}>
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={TH_ROW}>
                <tr>
                  <th className={TH}>Patient</th>
                  <th className={TH}>Folder #</th>
                  <th className={TH}>Attendance #</th>
                  <th className={TH}>Visit date</th>
                  <th className={TH}>Contact</th>
                  <th className={cn(TH, 'text-center')}>Status</th>
                  <th className={cn(TH, 'text-center')}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedVisits.map(visit => {
                  const patient = visit.Patient;
                  return (
                    <tr key={visit.id} className={cn(TR, patient?.id && 'cursor-pointer')} onClick={() => openEntries(visit)}>
                      <td className={TD}>
                        <div className="flex items-center gap-3">
                          <PatientAvatar patient={{ ...patient, name: patientName(patient) }} size="sm" />
                          <div>
                            <p className="font-medium text-[var(--text-primary)] text-sm">{patientName(patient)}</p>
                            <p className="text-xs text-[var(--text-secondary)]">
                              {[patientAge(patient) != null ? patientAge(patient) + ' years' : null, patient?.gender].filter(Boolean).join(' • ') || 'Patient'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className={TD_MONO}>{getPatientFolderNumber(visit) || '—'}</td>
                      <td className={TD_MONO}>{getAttendanceNumber(visit) || '—'}</td>
                      <td className={cn(TD, 'text-xs text-[var(--text-secondary)]')}>
                        {visit.dateTime ? new Date(visit.dateTime).toLocaleString() : '—'}
                      </td>
                      <td className={TD}>{patient?.phoneNumber || '—'}</td>
                      <td className={cn(TD, 'text-center')}>
                        <Badge tone={statusTone(visit.status || 'pending')} dot size="sm">
                          {humanStatus(visit.status || 'waiting')}
                        </Badge>
                      </td>
                      <td className={cn(TD, 'text-center')}>
                        <div className="flex flex-wrap justify-center gap-1.5">
                          <Button size="sm" variant="soft" accent="cyan" icon={ArrowRight}
                            disabled={!patient?.id}
                            onClick={(event) => { event.stopPropagation(); openEntries(visit); }}>
                            {activeTab === 'completed' ? 'View Entries' : 'Open Entries'}
                          </Button>
                          {activeTab === 'pending' && (
                            <Button size="sm" variant="outline" icon={CheckCircle}
                              loading={completingId === visit.id}
                              disabled={!!completingId}
                              onClick={(event) => { event.stopPropagation(); void markCompleted(visit); }}>
                              Mark Completed
                            </Button>
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
        )}
      </Card>

      <Pagination page={currentPage} totalPages={totalPages} itemsPerPage={itemsPerPage}
        totalItems={queue.length} noun="visits" onChange={setCurrentPage} />
    </div>
  );
}
