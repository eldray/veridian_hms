import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import NewAttendanceModal from '../components/NewAttendanceModal';
import ImmunizationPanel from '../components/patients/ImmunizationPanel';
import { useAuthStore } from '../store/authStore';
import { Syringe, Search, ArrowRight, RefreshCw, Download, UserRound, CalendarClock } from 'lucide-react';

type Patient = { id: string; surname?: string; otherNames?: string; folderNumber?: string; phoneNumber?: string; dateOfBirth?: string; gender?: string };
type Visit = { id: string; attendanceNumber?: string; attendanceType?: string; dateTime?: string; status?: string; Patient?: Patient };
type DueRow = { id: string; nextDoseDue: string; administeredAt: string; doseNumber: string; Patient?: Patient; Vaccine?: { name?: string; code?: string } };
const dayKey = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,10);
const patientName = (p?: Patient) => [p?.otherNames,p?.surname].filter(Boolean).join(' ') || 'Patient';

export default function ImmunizationWorkspace() {
  const { hasRole } = useAuthStore();
  const navigate = useNavigate();
  const [queueSearch, setQueueSearch] = useState('');
  const [dueSearch, setDueSearch] = useState('');
  const [due, setDue] = useState<DueRow[]>([]);
  const [todayVisits, setTodayVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registerFrom, setRegisterFrom] = useState(() => { const d = new Date(); d.setDate(1); return dayKey(d); });
  const [registerTo, setRegisterTo] = useState(() => dayKey(new Date()));
  const [registerRows, setRegisterRows] = useState<any[]>([]);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const now = new Date(); const from = new Date(now); from.setDate(from.getDate()-30);
      const to = new Date(now); to.setDate(to.getDate()+30);
      const [d,q] = await Promise.all([
        api.get('/immunization/records/due', { params: { from: from.toISOString(), to: to.toISOString() } }),
        api.get('/immunization/attendances')
      ]);
      setDue(d.data?.data ?? []); setTodayVisits(q.data?.data ?? []);
    } catch(e:any) { setError(e.response?.data?.message || e.message || 'Unable to load immunization clinic.'); }
    finally { setLoading(false); }
  };
  useEffect(()=>{ load(); },[]);

  const queue = useMemo(() => todayVisits.filter(v => !queueSearch.trim() || [v.Patient?.otherNames,v.Patient?.surname,v.Patient?.folderNumber,v.attendanceNumber,v.Patient?.phoneNumber].some(x => String(x||'').toLowerCase().includes(queueSearch.toLowerCase()))), [todayVisits,queueSearch]);
  const today = dayKey(new Date());
  const dueRows = useMemo(() => due.filter(r => !dueSearch.trim() || [r.Patient?.otherNames,r.Patient?.surname,r.Patient?.folderNumber,r.Vaccine?.name,r.Vaccine?.code].some(x => String(x||'').toLowerCase().includes(dueSearch.toLowerCase()))), [due,dueSearch]);

  const loadRegister = async () => {
    if (!registerFrom || !registerTo || registerTo < registerFrom) { setRegisterError('Choose a valid date range.'); return; }
    setRegisterLoading(true); setRegisterError('');
    try {
      const response = await api.get('/immunization/records/register', { params: { from: registerFrom, to: registerTo } });
      setRegisterRows(response.data?.data ?? []);
    } catch (e:any) { setRegisterError(e.response?.data?.message || e.message || 'Unable to load immunization register.'); }
    finally { setRegisterLoading(false); }
  };
  const exportRegister = () => {
    const columns = ['Administration date','Patient','Folder number','Date of birth','Gender','Vaccine code','Vaccine','Dose number','Attendance number','Administered by','Recorded by','Stock transaction','Batch allocations'];
    const cell = (value: any) => '"' + String(value ?? '').replace(/"/g, '""') + '"';
    const rows = registerRows.map(r => [r.administeredAt ? new Date(r.administeredAt).toLocaleString() : '', patientName(r.Patient), r.Patient?.folderNumber, r.Patient?.dateOfBirth ? new Date(r.Patient.dateOfBirth).toLocaleDateString() : '', r.Patient?.gender, r.Vaccine?.code, r.Vaccine?.name, r.doseNumber, r.Attendance?.attendanceNumber, r.AdministeredBy?.fullName, r.RecordedBy?.fullName, r.StockTransaction?.id, r.StockTransaction?.batchAllocations ? JSON.stringify(r.StockTransaction.batchAllocations) : '']);
    const csv = [columns, ...rows].map(row => row.map(cell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'immunization-register-' + registerFrom + '-to-' + registerTo + '.csv';
    document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return <div className="space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-bold text-[var(--text-primary)]">Immunization Clinic</h1><p className="text-sm text-[var(--text-secondary)]">Waiting list and vaccination entries</p></div>
      <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm"><RefreshCw className={loading?'animate-spin h-4 w-4':'h-4 w-4'}/>Refresh list</button>
    </header>
    {error && <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

    <section className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-semibold text-[var(--text-primary)]">Immunization waiting list ({queue.length})</h2><p className="text-xs text-[var(--text-secondary)]">Today's immunization attendances. Select a patient to record vaccinations.</p></div><div className="flex items-center gap-2 rounded-lg border border-[var(--border-color)] px-2"><Search className="h-4 w-4 text-[var(--text-secondary)]"/><input value={queueSearch} onChange={e=>setQueueSearch(e.target.value)} placeholder="Search patient or folder" className="bg-transparent py-2 text-sm outline-none"/></div></div>
      {loading ? <p className="py-8 text-center text-sm text-[var(--text-secondary)]">Loading waiting list…</p> : queue.length===0 ? <p className="py-8 text-center text-sm text-[var(--text-secondary)]">No immunization attendances in today's list.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-[var(--border-color)] text-xs text-[var(--text-secondary)]"><th className="p-2">Patient</th><th className="p-2">Folder</th><th className="p-2">Attendance #</th><th className="p-2">Time</th><th className="p-2">Status</th><th className="p-2">Open</th></tr></thead><tbody>{queue.map(v=><tr key={v.id} className="border-b border-[var(--border-color)]"><td className="p-2 font-medium text-[var(--text-primary)]">{patientName(v.Patient)}</td><td className="p-2">{v.Patient?.folderNumber||'—'}</td><td className="p-2">{v.attendanceNumber||'—'}</td><td className="p-2">{v.dateTime?new Date(v.dateTime).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}):'—'}</td><td className="p-2">{v.status||'Waiting'}</td><td className="p-2"><button onClick={()=>navigate('/dashboard/immunization/entries/'+v.Patient?.id,{state:{visit:v,attendances:todayVisits.filter(x=>x.Patient?.id===v.Patient?.id)}})} className="inline-flex items-center gap-1 text-[var(--icon-cyan-text)] hover:underline"><UserRound className="h-3.5 w-3.5"/>Select patient</button></td></tr>)}</tbody></table></div>}
    </section>



    <section className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-semibold text-[var(--text-primary)]">Dose follow-up worklist</h2><p className="text-xs text-[var(--text-secondary)]">Patients with a scheduled next dose (30 days before to 30 days ahead).</p></div><div className="flex items-center gap-2 rounded-lg border border-[var(--border-color)] px-2"><Search className="h-4 w-4 text-[var(--text-secondary)]"/><input value={dueSearch} onChange={e=>setDueSearch(e.target.value)} placeholder="Filter patient or vaccine" className="bg-transparent py-2 text-sm outline-none"/></div></div>
      {loading?<p className="py-8 text-center text-sm text-[var(--text-secondary)]">Loading worklist…</p>:dueRows.length===0?<p className="py-8 text-center text-sm text-[var(--text-secondary)]">No follow-up doses found.</p>:<div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-[var(--border-color)] text-xs text-[var(--text-secondary)]"><th className="p-2">Patient</th><th className="p-2">Folder</th><th className="p-2">Vaccine</th><th className="p-2">Dose</th><th className="p-2">Due</th><th className="p-2">Status</th><th className="p-2">Action</th></tr></thead><tbody>{dueRows.map(r=><tr key={r.id} className="border-b border-[var(--border-color)]"><td className="p-2 font-medium text-[var(--text-primary)]">{patientName(r.Patient)}</td><td className="p-2">{r.Patient?.folderNumber||'—'}</td><td className="p-2">{r.Vaccine?.name||r.Vaccine?.code||'Vaccine'}</td><td className="p-2">{r.doseNumber}</td><td className="p-2">{r.nextDoseDue?new Date(r.nextDoseDue).toLocaleDateString():'—'}</td><td className="p-2"><span className={r.nextDoseDue?.slice(0,10)<today?'text-red-600':'text-emerald-600'}>{r.nextDoseDue?.slice(0,10)<today?'Overdue':'Upcoming'}</span></td><td className="p-2"><button onClick={()=>{const visit=todayVisits.find(v=>v.Patient?.id===r.Patient?.id);if(visit)navigate('/dashboard/immunization/entries/'+visit.Patient?.id,{state:{visit,attendances:todayVisits.filter(x=>x.Patient?.id===visit.Patient?.id)}});else window.alert('This patient is not on today\'s immunization waiting list. Please check them in first.');}} className="inline-flex items-center gap-1 text-[var(--icon-cyan-text)] hover:underline">Select <ArrowRight className="h-3 w-3"/></button></td></tr>)}</tbody></table></div>}
    </section>

    <section className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-[var(--text-primary)]">Immunization administration register</h2><p className="mt-1 text-xs text-[var(--text-secondary)]">Clinical line list of doses administered; not an EPI coverage report.</p></div><button onClick={exportRegister} disabled={!registerRows.length} className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm disabled:opacity-50"><Download className="h-4 w-4"/>Export CSV</button></div>
      <div className="mt-4 flex flex-wrap items-end gap-3"><label className="text-xs text-[var(--text-secondary)]">From date<input type="date" value={registerFrom} max={registerTo||undefined} onChange={e=>setRegisterFrom(e.target.value)} className="mt-1 block rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-sm"/></label><label className="text-xs text-[var(--text-secondary)]">To date<input type="date" value={registerTo} min={registerFrom||undefined} onChange={e=>setRegisterTo(e.target.value)} className="mt-1 block rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-sm"/></label><button onClick={loadRegister} disabled={registerLoading} className="rounded-lg bg-[var(--icon-cyan-bg)] px-4 py-2 text-sm font-semibold text-[var(--icon-cyan-text)] disabled:opacity-50">{registerLoading?'Loading…':'Load register'}</button><span className="text-xs text-[var(--text-secondary)]">{registerRows.length} record(s)</span></div>
      {registerError && <p className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{registerError}</p>}
      {registerRows.length>0 ? <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-[var(--border-color)] text-xs text-[var(--text-secondary)]"><th className="p-2">Date</th><th className="p-2">Patient / folder</th><th className="p-2">Vaccine</th><th className="p-2">Dose</th><th className="p-2">Attendance</th><th className="p-2">Administered by</th><th className="p-2">Batch / stock</th></tr></thead><tbody>{registerRows.map((r,i)=><tr key={r.id||i} className="border-b border-[var(--border-color)]"><td className="p-2 whitespace-nowrap">{r.administeredAt?new Date(r.administeredAt).toLocaleDateString():'—'}</td><td className="p-2"><span className="block font-medium">{patientName(r.Patient)}</span><span className="text-xs text-[var(--text-secondary)]">{r.Patient?.folderNumber||'—'}</span></td><td className="p-2">{r.Vaccine?.name||r.Vaccine?.code||'—'}</td><td className="p-2">{r.doseNumber||'—'}</td><td className="p-2">{r.Attendance?.attendanceNumber||'—'}</td><td className="p-2">{r.AdministeredBy?.fullName||'—'}</td><td className="p-2 text-xs">{r.StockTransaction?.batchAllocations?.length?r.StockTransaction.batchAllocations.map((b:any)=>b.batchNumber||b.batch?.batchNumber||'Batch').join(', '):r.StockTransaction?.id?'Stock issued':'Not linked'}</td></tr>)}</tbody></table></div> : <p className="mt-4 py-5 text-center text-sm text-[var(--text-secondary)]">{registerLoading?'Loading register…':'Select a date range and load the register.'}</p>}
    </section>
  </div>;
}
