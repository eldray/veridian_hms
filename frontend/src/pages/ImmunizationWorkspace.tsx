import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import { Search, RefreshCw, ArrowRight } from 'lucide-react';

type Patient = { id: string; surname?: string; otherNames?: string; folderNumber?: string; phoneNumber?: string };
type Visit = { id: string; attendanceNumber?: string; attendanceType?: string; dateTime?: string; status?: string; Patient?: Patient };
const patientName = (p?: Patient) => [p?.otherNames, p?.surname].filter(Boolean).join(' ') || 'Patient';

export default function ImmunizationWorkspace() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadWaitingList = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/immunization/attendances');
      setVisits(response.data?.data ?? []);
    } catch (e: any) {
      setError(e.response?.data?.message || e.message || 'Unable to load the immunization waiting list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadWaitingList(); }, []);

  const queue = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return visits;
    return visits.filter(v => [
      v.Patient?.otherNames, v.Patient?.surname, v.Patient?.folderNumber,
      v.Patient?.phoneNumber, v.attendanceNumber
    ].some(value => String(value ?? '').toLowerCase().includes(term)));
  }, [visits, search]);

  return <main className="space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Immunization Waiting List</h1>
        <p className="text-sm text-[var(--text-secondary)]">Select a patient to open their separate vaccination entries workspace.</p>
      </div>
      <button onClick={() => void loadWaitingList()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm disabled:opacity-50">
        <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /> Refresh
      </button>
    </header>

    <section className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-[var(--text-primary)]">Patients waiting ({queue.length})</h2>
          <p className="text-xs text-[var(--text-secondary)]">Immunization attendances registered today.</p>
        </div>
        <div className="flex min-w-[220px] items-center gap-2 rounded-lg border border-[var(--border-color)] px-3">
          <Search className="h-4 w-4 text-[var(--text-secondary)]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, folder or phone" className="w-full bg-transparent py-2 text-sm outline-none" />
        </div>
      </div>

      {error && <div className="mb-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {loading ? <p className="py-10 text-center text-sm text-[var(--text-secondary)]">Loading waiting list…</p>
        : queue.length === 0 ? <p className="py-10 text-center text-sm text-[var(--text-secondary)]">No patients are currently on the immunization waiting list.</p>
        : <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b border-[var(--border-color)] text-xs text-[var(--text-secondary)]">
              <th className="p-3">Patient</th><th className="p-3">Folder number</th><th className="p-3">Attendance number</th><th className="p-3">Time</th><th className="p-3">Status</th><th className="p-3 text-right">Action</th>
            </tr></thead>
            <tbody>{queue.map(visit => <tr key={visit.id} className="border-b border-[var(--border-color)] last:border-0">
              <td className="p-3 font-medium text-[var(--text-primary)]">{patientName(visit.Patient)}</td>
              <td className="p-3">{visit.Patient?.folderNumber || '—'}</td>
              <td className="p-3">{visit.attendanceNumber || '—'}</td>
              <td className="p-3">{visit.dateTime ? new Date(visit.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
              <td className="p-3">{visit.status || 'Waiting'}</td>
              <td className="p-3 text-right"><button onClick={() => navigate('/dashboard/immunization/entries/' + visit.Patient?.id)} className="inline-flex items-center gap-1 font-medium text-[var(--icon-cyan-text)] hover:underline">Open entries <ArrowRight className="h-4 w-4" /></button></td>
            </tr>)}</tbody>
          </table>
        </div>}
    </section>
  </main>;
}
