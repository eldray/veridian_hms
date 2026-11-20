import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/api';
import NewAttendanceModal from '../components/NewAttendanceModal';
import ImmunizationPanel from '../components/patients/ImmunizationPanel';
import { Syringe, CalendarClock, ClipboardList, Search, ArrowRight, RefreshCw, AlertTriangle, Download, UserRound } from 'lucide-react';

type DueRow = { id: string; nextDoseDue: string; administeredAt: string; doseNumber: string; Patient?: { id: string; surname?: string; otherNames?: string; folderNumber?: string; phoneNumber?: string }; Vaccine?: { name?: string; code?: string } };
const dayKey = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,10);
const labelName = (p?: DueRow['Patient']) => [p?.otherNames,p?.surname].filter(Boolean).join(' ') || 'Patient';

export default function ImmunizationWorkspace() {
  const [search, setSearch] = useState('');
  const [selectedVisit, setSelectedVisit] = useState<any>(null);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [due, setDue] = useState<DueRow[]>([]);
  const [todayVisits, setTodayVisits] = useState<any[]>([]);
  const [vaccines, setVaccines] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registerFrom, setRegisterFrom] = useState(() => { const d = new Date(); d.setDate(1); return dayKey(d); });
  const [registerTo, setRegisterTo] = useState(() => dayKey(new Date()));
  const [registerRows, setRegisterRows] = useState<any[]>([]);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const loadRegister = async () => {
    if (!registerFrom || !registerTo || registerTo < registerFrom) { setRegisterError('Choose a valid date range.'); return; }
    setRegisterLoading(true); setRegisterError('');
    try {
      const response = await api.get('/immunization/records/register', { params: { from: registerFrom, to: registerTo } });
      setRegisterRows(response.data?.data ?? []);
    } catch (e: any) { setRegisterError(e.response?.data?.message || e.message || 'Unable to load immunization register.'); }
    finally { setRegisterLoading(false); }
  };
  const exportRegister = () => {
    const columns = ['Administration date','Patient','Folder number','Date of birth','Gender','Vaccine code','Vaccine','Dose number','Attendance number','Administered by','Recorded by','Stock transaction','Batch allocations'];
    const cell = (value: any) => '"' + String(value ?? '').replace(/"/g, '""') + '"';
    const rows = registerRows.map(r => [r.administeredAt ? new Date(r.administeredAt).toLocaleString() : '', [r.Patient?.otherNames,r.Patient?.surname].filter(Boolean).join(' '), r.Patient?.folderNumber, r.Patient?.dateOfBirth ? new Date(r.Patient.dateOfBirth).toLocaleDateString() : '', r.Patient?.gender, r.Vaccine?.code, r.Vaccine?.name, r.doseNumber, r.Attendance?.attendanceNumber, r.AdministeredBy?.fullName, r.RecordedBy?.fullName, r.StockTransaction?.id, r.StockTransaction?.batchAllocations ? JSON.stringify(r.StockTransaction.batchAllocations) : '']);
    const csv = [columns, ...rows].map(row => row.map(cell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'immunization-register-' + registerFrom + '-to-' + registerTo + '.csv';
    document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
  };
  const load = async () => {
    setLoading(true); setError('');
    try {
      const now = new Date(); const from = new Date(now); from.setDate(from.getDate()-30);
      const to = new Date(now); to.setDate(to.getDate()+30);
      const [d,v,q] = await Promise.all([
        api.get('/immunization/records/due', { params: { from: from.toISOString(), to: to.toISOString() } }),
        api.get('/immunization/vaccines'),
        api.get('/immunization/attendances')
      ]);
      setDue(d.data?.data ?? []); setVaccines(v.data?.data ?? []); setTodayVisits(q.data?.data ?? []);
    } catch(e:any) { setError(e.response?.data?.message || e.message || 'Unable to load clinic overview'); }
    finally { setLoading(false); }
  };
  useEffect(()=>{ load(); },[]);
  const today = dayKey(new Date());
  const overdue = useMemo(()=>due.filter(r=>r.nextDoseDue?.slice(0,10)<today),[due,today]);
  const upcoming = useMemo(()=>due.filter(r=>r.nextDoseDue?.slice(0,10)>=today),[due,today]);
  const visible = useMemo(()=>due.filter(r=>!search.trim() || labelName(r.Patient).toLowerCase().includes(search.toLowerCase()) || String(r.Patient?.folderNumber||'').includes(search.trim()) || String(r.Patient?.phoneNumber||'').includes(search.trim())),[due,search]);

  return <div className="space-y-6">
    <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div><h1 className="text-2xl font-bold text-[var(--text-primary)]">Immunization Clinic</h1><p className="text-sm text-[var(--text-secondary)]">Vaccination follow-ups, patient entries and dose tracking.</p></div>
      <div className="flex gap-2"><button onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm"><RefreshCw className={loading?'animate-spin h-4 w-4':'h-4 w-4'}/>Refresh</button><Link to="/dashboard/patients" className="inline-flex items-center gap-2 rounded-lg bg-[var(--icon-cyan-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--icon-cyan-text)]"><Syringe className="h-4 w-4"/> New patient entry</Link></div>
    </header>
    {error && <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold text-[var(--text-primary)]">Dose follow-up worklist</h2><div className="flex items-center gap-2 rounded-lg border border-[var(--border-color)] px-2"><Search className="h-4 w-4 text-[var(--text-secondary)]"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Filter patient, folder or phone" className="bg-transparent py-2 text-sm outline-none"/></div></div>
    {loading?<p className="py-8 text-center text-sm text-[var(--text-secondary)]">Loading worklist…</p>:visible.length===0?<p className="py-8 text-center text-sm text-[var(--text-secondary)]">No follow-up doses found in this 60-day window.</p>:<div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-[var(--border-color)] text-xs text-[var(--text-secondary)]"><th className="p-2">Patient</th><th className="p-2">Folder</th><th className="p-2">Vaccine</th><th className="p-2">Dose</th><th className="p-2">Due</th><th className="p-2">Status</th><th className="p-2">Action</th></tr></thead><tbody>{visible.map(r=><tr key={r.id} className="border-b border-[var(--border-color)]"><td className="p-2 font-medium text-[var(--text-primary)]">{labelName(r.Patient)}</td><td className="p-2">{r.Patient?.folderNumber||'—'}</td><td className="p-2">{r.Vaccine?.name||r.Vaccine?.code||'Vaccine'}</td><td className="p-2">{r.doseNumber}</td><td className="p-2">{r.nextDoseDue?new Date(r.nextDoseDue).toLocaleDateString():'—'}</td><td className="p-2"><span className={r.nextDoseDue?.slice(0,10)<today?'text-red-600':'text-emerald-600'}>{r.nextDoseDue?.slice(0,10)<today?'Overdue':'Upcoming'}</span></td><td className="p-2"><Link to={r.Patient?.id? `/dashboard/patients/${r.Patient.id}?tab=immunizations`:'/dashboard/patients'} className="inline-flex items-center gap-1 text-[var(--icon-cyan-text)] hover:underline">Open record <ArrowRight className="h-3 w-3"/></Link></td></tr>)}</tbody></table></div>}</div>
    <section className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-semibold text-[var(--text-primary)]">Immunization waiting list</h2><p className="text-xs text-[var(--text-secondary)]">Select a patient to open their vaccination workspace.</p></div><div className="flex items-center gap-2 rounded-lg border border-[var(--border-color)] px-2"><Search className="h-4 w-4 text-[var(--text-secondary)]"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search patient, folder or attendance" className="bg-transparent py-2 text-sm outline-none"/></div></div>
      {loading ? <p className="py-8 text-center text-sm text-[var(--text-secondary)]">Loading waiting list…</p> : todayVisits.length===0 ? <p className="py-8 text-center text-sm text-[var(--text-secondary)]">No immunization patients are on today's waiting list.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-[var(--border-color)] text-xs text-[var(--text-secondary)]"><th className="p-2">Patient</th><th className="p-2">Folder</th><th className="p-2">Attendance</th><th className="p-2">Time</th><th className="p-2">Status</th><th className="p-2">Action</th></tr></thead><tbody>{todayVisits.filter(v=>!search.trim()||[v.Patient?.otherNames,v.Patient?.surname,v.Patient?.folderNumber,v.attendanceNumber].some(x=>String(x||'').toLowerCase().includes(search.toLowerCase()))).map(v=><tr key={v.id} className={selectedVisit?.id===v.id?'bg-[var(--bg-main)] border-b border-[var(--border-color)]':'border-b border-[var(--border-color)]'}><td className="p-2 font-medium text-[var(--text-primary)]">{[v.Patient?.otherNames,v.Patient?.surname].filter(Boolean).join(' ')||'Patient'}</td><td className="p-2">{v.Patient?.folderNumber||'—'}</td><td className="p-2">{v.attendanceNumber||'—'}</td><td className="p-2">{v.dateTime?new Date(v.dateTime).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}):'—'}</td><td className="p-2">{v.status||'Waiting'}</td><td className="p-2"><button onClick={()=>setSelectedVisit(v)} className="inline-flex items-center gap-1 text-[var(--icon-cyan-text)] hover:underline"><UserRound className="h-3.5 w-3.5"/>Select patient</button></td></tr>)}</tbody></table></div>}
    </section>
    {selectedVisit&&<section className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-color)] pb-3"><div><h2 className="font-semibold text-[var(--text-primary)]">Vaccination workspace</h2><p className="text-sm text-[var(--text-secondary)]">{[selectedVisit.Patient?.otherNames,selectedVisit.Patient?.surname].filter(Boolean).join(' ')} · Folder {selectedVisit.Patient?.folderNumber||'—'} · Attendance {selectedVisit.attendanceNumber||'—'}</p></div><button onClick={()=>setSelectedVisit(null)} className="rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm">Back to waiting list</button></div>
      <ImmunizationPanel patientId={selectedVisit.Patient.id} attendances={todayVisits.filter(v=>v.Patient?.id===selectedVisit.Patient.id)} canRecord={true} canManageCatalogue={false} onCreateAttendance={()=>setShowAttendanceModal(true)} />
      {showAttendanceModal&&<NewAttendanceModal patientId={selectedVisit.Patient.id} initialAttendanceType="immunization" onClose={()=>setShowAttendanceModal(false)} onSuccess={()=>{setShowAttendanceModal(false);load();}}/>}
    </section>}<section className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-[var(--text-primary)]">Immunization administration register</h2><p className="mt-1 text-xs text-[var(--text-secondary)]">Clinical line list of doses administered. This is not an EPI coverage report.</p></div><button onClick={exportRegister} disabled={!registerRows.length} className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm disabled:opacity-50"><Download className="h-4 w-4"/>Export CSV</button></div>
      <div className="mt-4 flex flex-wrap items-end gap-3"><label className="text-xs text-[var(--text-secondary)]">From date<input type="date" value={registerFrom} max={registerTo||undefined} onChange={e=>setRegisterFrom(e.target.value)} className="mt-1 block rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-sm"/></label><label className="text-xs text-[var(--text-secondary)]">To date<input type="date" value={registerTo} min={registerFrom||undefined} onChange={e=>setRegisterTo(e.target.value)} className="mt-1 block rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-sm"/></label><button onClick={loadRegister} disabled={registerLoading} className="rounded-lg bg-[var(--icon-cyan-bg)] px-4 py-2 text-sm font-semibold text-[var(--icon-cyan-text)] disabled:opacity-50">{registerLoading?'Loading…':'Load register'}</button><span className="text-xs text-[var(--text-secondary)]">{registerRows.length} record(s)</span></div>
      {registerError && <p className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{registerError}</p>}
      {registerRows.length>0 ? <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-[var(--border-color)] text-xs text-[var(--text-secondary)]"><th className="p-2">Date</th><th className="p-2">Patient / folder</th><th className="p-2">Vaccine</th><th className="p-2">Dose</th><th className="p-2">Attendance</th><th className="p-2">Administered by</th><th className="p-2">Batch / stock</th></tr></thead><tbody>{registerRows.map((r,i)=><tr key={r.id||i} className="border-b border-[var(--border-color)]"><td className="p-2 whitespace-nowrap">{r.administeredAt?new Date(r.administeredAt).toLocaleDateString():'—'}</td><td className="p-2"><span className="block font-medium">{[r.Patient?.otherNames,r.Patient?.surname].filter(Boolean).join(' ')||'Patient'}</span><span className="text-xs text-[var(--text-secondary)]">{r.Patient?.folderNumber||'—'}</span></td><td className="p-2">{r.Vaccine?.name||r.Vaccine?.code||'—'}</td><td className="p-2">{r.doseNumber||'—'}</td><td className="p-2">{r.Attendance?.attendanceNumber||'—'}</td><td className="p-2">{r.AdministeredBy?.fullName||'—'}</td><td className="p-2 text-xs">{r.StockTransaction?.batchAllocations?.length?r.StockTransaction.batchAllocations.map((b:any)=>b.batchNumber||b.batch?.batchNumber||'Batch').join(', '):r.StockTransaction?.id?'Stock issued':'Not linked'}</td></tr>)}</tbody></table></div> : <p className="mt-4 py-5 text-center text-sm text-[var(--text-secondary)]">{registerLoading?'Loading register…':'Select a date range and load the register.'}</p>}
    </section>
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4"><h2 className="font-semibold text-[var(--text-primary)]">Quick entry workflow</h2><ol className="mt-3 grid gap-2 text-sm text-[var(--text-secondary)] sm:grid-cols-2"><li>1. Find or register the patient.</li><li>2. Start an immunization attendance from their record.</li><li>3. Select the vaccine and record the administered dose.</li><li>4. Record batch, expiry, route, site and staff.</li><li>5. Schedule next dose to populate this worklist.</li></ol><Link to="/dashboard/patients" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[var(--icon-cyan-text)]">Patient register <ArrowRight className="h-4 w-4"/></Link></div>
  </div>;
}
