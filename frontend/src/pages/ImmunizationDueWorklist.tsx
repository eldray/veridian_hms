import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import { getPatientName, getPatientFolderNumber } from '../utils/patient';
import { useToast } from '../store/toastStore';
import ImmunizationSectionTabs from '../components/immunization/ImmunizationSectionTabs';
import { AlertCircle, ArrowRight, CalendarClock, CheckCircle, Clock, RefreshCw, Syringe } from 'lucide-react';
import { Badge, Button, Card, PageHeader, SearchInput, StatCard, TABLE_SHELL, TD, TD_MONO, TH, TH_ROW, TR, cn } from '../components/ui';

type Patient = { id: string; surname?: string; otherNames?: string; folderNumber?: string; phoneNumber?: string; gender?: string };
type DueRecord = { id: string; patientId: string; vaccineId: string; doseNumber: string; administeredAt: string; nextDoseDue: string; Patient?: Patient; Vaccine?: { id: string; code: string; name: string } };
const patientName = (patient?: Patient) => getPatientName(patient);

export default function ImmunizationDueWorklist() {
  const navigate = useNavigate();
  const { error: toastError } = useToast();
  const [records, setRecords] = useState<DueRecord[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const from = '1970-01-01T00:00:00.000Z';
      const to = new Date(Date.now() + 90 * 86400000).toISOString();
      const response = await api.get('/immunization/records/due', { params: { from, to } });
      setRecords(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (e: any) {
      const message = e.response?.data?.message || e.message || 'Unable to load upcoming and overdue doses.';
      setError(message);
      toastError('Dose worklist unavailable', message);
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const term = search.trim().toLowerCase();
  const filtered = useMemo(() => records.filter(record => !term || [
    patientName(record.Patient), getPatientFolderNumber(record), record.Patient?.phoneNumber,
    record.Vaccine?.name, record.Vaccine?.code, record.doseNumber,
  ].some(value => String(value || '').toLowerCase().includes(term))), [records, term]);
  const overdue = filtered.filter(record => new Date(record.nextDoseDue) < today);
  const upcoming = filtered.filter(record => new Date(record.nextDoseDue) >= today);

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <PageHeader title="Upcoming & Missed Doses" subtitle="Follow up patients whose next vaccine dose is due or overdue" icon={CalendarClock} accent="cyan" backTo="/dashboard/immunization"
        actions={<Button icon={RefreshCw} variant="outline" loading={loading} onClick={() => void load()}>Refresh</Button>} />
      <ImmunizationSectionTabs />
      {error && <div role="alert" className="flex items-center gap-2 rounded-lg border border-[var(--icon-red-text)] bg-[var(--icon-red-bg)] px-4 py-3 text-sm text-[var(--icon-red-text)]"><AlertCircle className="h-4 w-4 shrink-0" /><span>{error}</span></div>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Outstanding reminders" value={filtered.length} icon={Syringe} accent="cyan" />
        <StatCard label="Overdue doses" value={overdue.length} icon={Clock} accent="orange" />
        <StatCard label="Due in next 90 days" value={upcoming.length} icon={CalendarClock} accent="green" />
      </div>
      <Card><SearchInput className="w-full" value={search} onChange={setSearch} placeholder="Search patient, folder number, phone or vaccine…" /></Card>
      <Card title={`Dose follow-up list (${filtered.length})`} description="Based on the next-dose date recorded with the previous vaccination. A later recorded dose clears the earlier reminder." icon={CalendarClock} accent="cyan" padded={false}>
        {loading ? <div className="p-10 text-center text-sm text-[var(--text-secondary)]">Loading dose reminders…</div> : filtered.length === 0 ? (
          <div className="p-10 text-center"><CheckCircle className="mx-auto mb-2 h-9 w-9 text-[var(--icon-green-text)]" /><p className="text-sm font-medium text-[var(--text-primary)]">No outstanding dose reminders</p><p className="mt-1 text-xs text-[var(--text-tertiary)]">Reminders appear when a next-dose date is recorded.</p></div>
        ) : (
          <div className={TABLE_SHELL}><div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className={TH_ROW}><tr><th className={TH}>Patient</th><th className={TH}>Folder #</th><th className={TH}>Vaccine / dose given</th><th className={TH}>Next dose due</th><th className={TH}>Contact</th><th className={cn(TH, 'text-center')}>Status</th><th className={cn(TH, 'text-right')}>Action</th></tr></thead>
            <tbody>{filtered.map(record => {
              const isOverdue = new Date(record.nextDoseDue) < today;
              return <tr key={record.id} className={TR}>
                <td className={TD}><div className="font-semibold text-[var(--text-primary)]">{patientName(record.Patient)}</div><div className="mt-0.5 text-xs text-[var(--text-tertiary)]">{record.Patient?.gender || '—'}</div></td>
                <td className={TD_MONO}>{getPatientFolderNumber(record) || '—'}</td>
                <td className={TD}><div className="font-medium text-[var(--text-primary)]">{record.Vaccine?.name || 'Vaccine'}</div><div className="mt-0.5 text-xs text-[var(--text-tertiary)]">{record.Vaccine?.code || '—'} · Dose {record.doseNumber}</div></td>
                <td className={cn(TD, 'text-xs text-[var(--text-secondary)]')}>{new Date(record.nextDoseDue).toLocaleDateString()}</td>
                <td className={TD}>{record.Patient?.phoneNumber || '—'}</td>
                <td className={cn(TD, 'text-center')}><Badge tone={isOverdue ? 'danger' : 'success'} dot size="sm">{isOverdue ? 'Overdue' : 'Upcoming'}</Badge></td>
                <td className={cn(TD, 'text-right')}><Button size="sm" variant="soft" accent="cyan" icon={ArrowRight} onClick={() => navigate('/dashboard/immunization/entries/' + record.patientId)}>Open Patient</Button></td>
              </tr>;
            })}</tbody>
          </table></div></div>
        )}
      </Card>
    </div>
  );
}
