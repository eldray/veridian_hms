// Immunization waiting list — shared clinical worklist UI.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveRefresh } from '../api/realtime';
import { useToast } from '../store/toastStore';
import api from '../api/api';
import { PatientAvatar } from '../components/patients/PatientAvatar';
import {
  AlertCircle, ArrowRight, CheckCircle, Clock, Eye, RefreshCw, Syringe, Users, UserCheck,
} from 'lucide-react';
import {
  Badge, Button, Card, humanStatus, PageHeader, Pagination, SearchInput,
  StatCard, statusTone, TD, TD_MONO, TH, TH_ROW, TR, cn,
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
const patientName = (patient?: Patient) =>
  [patient?.otherNames, patient?.surname].filter(Boolean).join(' ') || 'Patient';
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

export default function ImmunizationWorkspace() {
  const navigate = useNavigate();
  const { error: toastError } = useToast();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
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

  const queue = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return visits;
    return visits.filter(visit => [
      visit.Patient?.otherNames, visit.Patient?.surname, patientName(visit.Patient),
      visit.Patient?.folderNumber, visit.Patient?.phoneNumber, visit.attendanceNumber,
      visit.status,
    ].some(value => String(value ?? '').toLowerCase().includes(term)));
  }, [visits, search]);

  useEffect(() => { setCurrentPage(1); }, [search]);
  const totalPages = Math.max(1, Math.ceil(queue.length / itemsPerPage));
  const paginatedVisits = queue.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const completedCount = queue.filter(v => isCompleted(v.status)).length;
  const inProgressCount = queue.filter(v => isInProgress(v.status)).length;
  const waitingCount = queue.length - completedCount - inProgressCount;

  const openEntries = (visit: Visit) => {
    if (visit.Patient?.id) navigate('/dashboard/immunization/entries/' + visit.Patient.id);
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Immunization Waiting List"
        subtitle="Patients registered for vaccination today"
        icon={Syringe}
        accent="green"
        backTo="/dashboard"
        actions={<Button icon={RefreshCw} variant="secondary" loading={refreshing} onClick={() => void loadWaitingList()}>Refresh</Button>}
      />

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-lg border border-[var(--icon-red-text)] bg-[var(--icon-red-bg)] px-4 py-3 text-sm text-[var(--icon-red-text)]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Could not load the immunization waiting list: {error}</span>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Patients" value={queue.length} icon={Users} accent="green" />
        <StatCard label="Waiting" value={waitingCount} icon={Clock} accent="orange" />
        <StatCard label="In Progress" value={inProgressCount} icon={UserCheck} accent="purple" />
        <StatCard label="Completed" value={completedCount} icon={CheckCircle} accent="blue" />
      </div>

      <Card>
        <SearchInput value={search} onChange={setSearch} placeholder="Search name, folder number, phone, or attendance number…" />
      </Card>

      <Card title={`Immunization Waiting List (${queue.length} patients)`} description="Select a patient to record vaccines and review their immunization history" icon={Syringe} accent="green" padded={false}>
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 border-4 border-[var(--icon-green-text)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-[var(--text-secondary)]">Loading immunization queue…</p>
          </div>
        ) : queue.length === 0 ? (
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
                <p className="text-[var(--text-secondary)]">{search ? 'No patients match your search' : 'No patients on the immunization waiting list'}</p>
                <p className="text-sm text-[var(--text-tertiary)] mt-1">New immunization attendances will appear here</p>
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
                  <th className={TH}>Contact</th>
                  <th className={cn(TH, 'text-center')}>Status</th>
                  <th className={cn(TH, 'text-center')}>Action</th>
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
                      <td className={TD_MONO}>{patient?.folderNumber || '—'}</td>
                      <td className={TD_MONO}>{visit.attendanceNumber || '—'}</td>
                      <td className={cn(TD, 'text-xs text-[var(--text-secondary)]')}>{visit.dateTime ? new Date(visit.dateTime).toLocaleString() : '—'}</td>
                      <td className={TD}>{patient?.phoneNumber || '—'}</td>
                      <td className={cn(TD, 'text-center')}>
                        <Badge tone={statusTone(visit.status || 'pending')} dot size="sm">{humanStatus(visit.status || 'waiting')}</Badge>
                      </td>
                      <td className={cn(TD, 'text-center')}>
                        <Button size="sm" variant="soft" accent="green" icon={Eye} className="mx-auto" disabled={!patient?.id}
                          onClick={(event) => { event.stopPropagation(); openEntries(visit); }}>
                          Open Entries <ArrowRight className="w-3.5 h-3.5" />
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

      <Pagination page={currentPage} totalPages={totalPages} itemsPerPage={itemsPerPage}
        totalItems={queue.length} noun="patients" onChange={setCurrentPage} />
    </div>
  );
}
