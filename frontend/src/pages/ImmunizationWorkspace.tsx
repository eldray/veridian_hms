import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/api';
import { Users, Syringe, CalendarClock, ClipboardList, Search, ArrowRight, ShieldCheck, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';

type DueRow = { id: string; nextDoseDue: string; administeredAt: string; doseNumber: string; Patient?: { id: string; surname?: string; otherNames?: string; folderNumber?: string; phoneNumber?: string }; Vaccine?: { name?: string; code?: string } };
const dayKey = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,10);
const labelName = (p?: DueRow['Patient']) => [p?.otherNames,p?.surname].filter(Boolean).join(' ') || 'Patient';

export default function ImmunizationWorkspace() {
  const [search, setSearch] = useState('');
  const [due, setDue] = useState<DueRow[]>([]);
  const [vaccines, setVaccines] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const load = async () => {
    setLoading(true); setError('');
    try {
      const now = new Date(); const from = new Date(now); from.setDate(from.getDate()-30);
      const to = new Date(now); to.setDate(to.getDate()+30);
      const [d,v] = await Promise.all([
        api.get('/immunization/records/due', { params: { from: from.toISOString(), to: to.toISOString() } }),
        api.get('/immunization/vaccines')
      ]);
      setDue(d.data?.data ?? []); setVaccines(v.data?.data ?? []);
    } catch(e:any) { setError(e.response?.data?.message || e.message || 'Unable to load clinic overview'); }
    finally { setLoading(false); }
  };
  useEffect(()=>{ load(); },[]);
  const today = dayKey(new Date());
  const overdue = useMemo(()=>due.filter(r=>r.nextDoseDue?.slice(0,10)<today),[due,today]);
  const upcoming = useMemo(()=>due.filter(r=>r.nextDoseDue?.slice(0,10)>=today),[due,today]);
  const visible = useMemo(()=>due.filter(r=>!search.trim() || labelName(r.Patient).toLowerCase().includes(search.toLowerCase()) || String(r.Patient?.folderNumber||'').includes(search.trim()) || String(r.Patient?.phoneNumber||'').includes(search.trim())),[due,search]);
  const cards = [
    { title:'Vaccine catalogue', value:vaccines.length, description:'Active vaccine types', icon:ClipboardList },
    { title:'Due in next 30 days', value:upcoming.length, description:'Scheduled follow-up doses', icon:CalendarClock },
    { title:'Overdue doses', value:overdue.length, description:'Require follow-up', icon:AlertTriangle },
  ];
  return <div className="space-y-6">
    <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div><h1 className="text-2xl font-bold text-[var(--text-primary)]">Immunization Clinic</h1><p className="text-sm text-[var(--text-secondary)]">Vaccination follow-ups, patient entries and dose tracking.</p></div>
      <div className="flex gap-2"><button onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm"><RefreshCw className={loading?'animate-spin h-4 w-4':'h-4 w-4'}/>Refresh</button><Link to="/dashboard/patients" className="inline-flex items-center gap-2 rounded-lg bg-[var(--icon-cyan-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--icon-cyan-text)]"><Syringe className="h-4 w-4"/> New patient entry</Link></div>
    </header>
    {error && <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    <div className="grid gap-3 sm:grid-cols-3">{cards.map(c=><div key={c.title} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4"><div className="flex items-center gap-2 text-[var(--text-secondary)]"><c.icon className="h-4 w-4"/><span className="text-xs">{c.title}</span></div><div className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{c.value}</div><p className="text-xs text-[var(--text-secondary)]">{c.description}</p></div>)}</div>
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold text-[var(--text-primary)]">Dose follow-up worklist</h2><div className="flex items-center gap-2 rounded-lg border border-[var(--border-color)] px-2"><Search className="h-4 w-4 text-[var(--text-secondary)]"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Filter patient, folder or phone" className="bg-transparent py-2 text-sm outline-none"/></div></div>
    {loading?<p className="py-8 text-center text-sm text-[var(--text-secondary)]">Loading worklist…</p>:visible.length===0?<p className="py-8 text-center text-sm text-[var(--text-secondary)]">No follow-up doses found in this 60-day window.</p>:<div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-[var(--border-color)] text-xs text-[var(--text-secondary)]"><th className="p-2">Patient</th><th className="p-2">Folder</th><th className="p-2">Vaccine</th><th className="p-2">Dose</th><th className="p-2">Due</th><th className="p-2">Status</th><th className="p-2">Action</th></tr></thead><tbody>{visible.map(r=><tr key={r.id} className="border-b border-[var(--border-color)]"><td className="p-2 font-medium text-[var(--text-primary)]">{labelName(r.Patient)}</td><td className="p-2">{r.Patient?.folderNumber||'—'}</td><td className="p-2">{r.Vaccine?.name||r.Vaccine?.code||'Vaccine'}</td><td className="p-2">{r.doseNumber}</td><td className="p-2">{r.nextDoseDue?new Date(r.nextDoseDue).toLocaleDateString():'—'}</td><td className="p-2"><span className={r.nextDoseDue?.slice(0,10)<today?'text-red-600':'text-emerald-600'}>{r.nextDoseDue?.slice(0,10)<today?'Overdue':'Upcoming'}</span></td><td className="p-2"><Link to={r.Patient?.id? `/dashboard/patients/${r.Patient.id}?tab=immunizations`:'/dashboard/patients'} className="inline-flex items-center gap-1 text-[var(--icon-cyan-text)] hover:underline">Open record <ArrowRight className="h-3 w-3"/></Link></td></tr>)}</tbody></table></div>}</div>
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4"><h2 className="font-semibold text-[var(--text-primary)]">Quick entry workflow</h2><ol className="mt-3 grid gap-2 text-sm text-[var(--text-secondary)] sm:grid-cols-2"><li>1. Find or register the patient.</li><li>2. Start an immunization attendance from their record.</li><li>3. Select the vaccine and record the administered dose.</li><li>4. Record batch, expiry, route, site and staff.</li><li>5. Schedule next dose to populate this worklist.</li></ol><Link to="/dashboard/patients" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[var(--icon-cyan-text)]">Patient register <ArrowRight className="h-4 w-4"/></Link></div>
  </div>;
}
