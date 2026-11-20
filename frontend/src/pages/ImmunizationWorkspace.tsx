// Immunization waiting list — follows the shared clinical worklist UI.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveRefresh } from '../api/realtime';
import { useToast } from '../store/toastStore';
import api from '../api/api';
import { PatientAvatar } from '../components/patients/PatientAvatar';
import {
  ArrowRight, CheckCircle, Clock, Eye, RefreshCw, Syringe, Users,
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
  [patient?.otherNames, patient?.surname].filter(Boolean).join(' ') || 'Unknown Patient';

export default function ImmunizationWorkspace() {
  const navigate = useNavigate();
  const { error: toastError } = useToast();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadWaitingList = async (silent = false) => {
    try {
      setRefreshing(true);
      if (!silent) setIsLoading(true);
      const response = await api.get('/immunization/attendances');
      setVisits(response.data?.data ?? []);
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Could not load the immunization waiting list.';
      toastError('Load failed', message);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { void loadWaitingList(); }, []);
  useLiveRefresh(['encounters'], () => loadWaitingList(true));

  const filteredVisits = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return visits;
    return visits.filter((visit) => [
      patientName(visit.Patient),
      visit.Patient?.folderNumber,
      visit.Patient?.phoneNumber,
      visit.attendanceNumber,
      visit.status,
    ].some(value => String(value ?? '').toLowerCase().includes(term)));
  }, [visits, searchQuery]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery]);
  const totalPages = Math.max(1, Math.ceil(filteredVisits.length / itemsPerPage));
  const paginatedVisits = filteredVisits.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );
  const stats = {
    patients: filteredVisits.length,
    waiting: filteredVisits.filter(v => !v.status || ['waiting', 'pending', 'open', 'in_progress'].includes(v.status.toLowerCase())).length,
    completed: filteredVisits.filter(v => ['completed', 'closed', 'done'].includes((v.status || '').toLowerCase())).length,
  };

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
        actions={<Button icon={RefreshCw} variant="secondary" loading={refreshing} onClick={() => loadWaitingList()}>Refresh</Button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Patients" value={stats.patients} icon={Users} accent="green" />
        <StatCard label="Waiting / In Progress" value={stats.waiting} icon={Clock} accent="orange" />
        <StatCard label="Completed" value={stats.completed} icon={CheckCircle} accent="blue" />
      </div>

      <Card>
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by patient name, folder number, or phone…"
        />
      </Card>

      <Card title={`Immunization Queue (${filteredVisits.length} patients)`} icon={Syringe} accent="green" padded={false}>
        {isLoading ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 border-4 border-[var(--icon-green-text)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-[var(--text-secondary)]">Loading immunization queue…</p>
          </div>
        ) : filteredVisits.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle className="w-12 h-12 text-[var(--icon-green-text)] mx-auto mb-3 opacity-60" />
            <p className="text-sm font-semibold text-[var(--text-primary)]">No patients waiting</p>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">New immunization attendances will appear here.</p>
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
                  <th className={TH}>Status</th>
                  <th className={cn(TH, 'text-center')}>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedVisits.map(visit => (
                  <tr key={visit.id} className={cn(TR, 'cursor-pointer')} onClick={() => openEntries(visit)}>
                    <td className={TD}>
                      <div className="flex items-center gap-3">
                        <PatientAvatar patient={{
                          id: visit.Patient?.id,
                          name: patientName(visit.Patient),
                          folderNumber: visit.Patient?.folderNumber,
                        }} size="sm" />
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">{patientName(visit.Patient)}</p>
                          <p className="text-xs text-[var(--text-secondary)]">{visit.Patient?.phoneNumber || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className={TD_MONO}>{visit.Patient?.folderNumber || '—'}</td>
                    <td className={TD_MONO}>{visit.attendanceNumber || '—'}</td>
                    <td className={cn(TD, 'text-xs text-[var(--text-secondary)]')}>
                      {visit.dateTime ? new Date(visit.dateTime).toLocaleString() : '—'}
                    </td>
                    <td className={TD}>
                      <Badge tone={statusTone(visit.status || 'waiting')} dot size="sm">
                        {humanStatus(visit.status || 'waiting')}
                      </Badge>
                    </td>
                    <td className={cn(TD, 'text-center')}>
                      <Button
                        size="sm"
                        variant="soft"
                        accent="green"
                        icon={Eye}
                        className="mx-auto"
                        onClick={(event) => { event.stopPropagation(); openEntries(visit); }}
                      >
                        Open Entries <ArrowRight className="w-3.5 h-3.5" />
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
        totalItems={filteredVisits.length}
        noun="patients"
        onChange={setCurrentPage}
      />
    </div>
  );
}
