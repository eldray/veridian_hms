import { useEffect, useMemo, useState } from 'react';
import api from '../../api/api';
import { Syringe, Plus, RefreshCw, AlertCircle, CalendarClock } from 'lucide-react';

type Vaccine = { id: string; code: string; name: string; description?: string | null; defaultDoseVolume?: string | null; defaultRoute?: string | null; diseaseTargets?: string[]; recommendedAge?: string | null };
type RecordRow = { id: string; doseNumber: string; administeredAt: string; doseVolume?: string | null; route?: string | null; administrationSite?: string | null; batchNumber?: string | null; expiryDate?: string | null; nextDoseDue?: string | null; adverseReaction?: string | null; notes?: string | null; Vaccine?: Vaccine; Attendance?: { attendanceNumber?: string; dateTime?: string }; AdministeredBy?: { fullName?: string } };
type Visit = { id: string; attendanceType?: string; attendanceNumber?: string; dateTime?: string; createdAt?: string };
const localToday = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const dateLabel = (v?: string | null) => v ? new Date(v).toLocaleDateString() : '—';

export default function ImmunizationPanel({ patientId, attendances, canRecord, canManageCatalogue, onCreateAttendance }: { patientId: string; attendances: Visit[]; canRecord: boolean; canManageCatalogue: boolean; onCreateAttendance: () => void }) {
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showCatalogue, setShowCatalogue] = useState(false);
  const [form, setForm] = useState({ attendanceId: '', vaccineId: '', doseNumber: '1', administeredAt: localToday(), doseVolume: '', route: '', administrationSite: '', batchNumber: '', expiryDate: '', nextDoseDue: '', adverseReaction: '', notes: '' });
  const [catalogue, setCatalogue] = useState({ code: '', name: '', description: '', defaultDoseVolume: '', defaultRoute: '' });
  const immunizationVisits = useMemo(() => attendances.filter(v => v.attendanceType === 'immunization'), [attendances]);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [v, r] = await Promise.all([api.get('/immunization/vaccines'), api.get(`/immunization/patients/${patientId}/records`)]);
      setVaccines(v.data?.data ?? []);
      setRecords(r.data?.data ?? []);
    } catch (e: any) { setError(e.response?.data?.message || e.message || 'Unable to load immunization records.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [patientId]);
  const dueRecords = useMemo(() => records.filter(r => r.nextDoseDue).sort((a, b) => new Date(a.nextDoseDue!).getTime() - new Date(b.nextDoseDue!).getTime()), [records]);
  const todayKey = localToday();
  const overdueRecords = dueRecords.filter(r => r.nextDoseDue!.slice(0, 10) < todayKey);
  const upcomingRecords = dueRecords.filter(r => r.nextDoseDue!.slice(0, 10) >= todayKey);
  const update = (key: keyof typeof form, value: string) => setForm(prev => ({ ...prev, [key]: value }));
  const saveRecord = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (!form.attendanceId || !form.vaccineId || !form.doseNumber.trim() || !form.administeredAt) { setError('Choose an immunization visit, vaccine, dose number and administration date.'); return; }
    setSaving(true);
    try {
      await api.post('/immunization/records', { patientId, ...form, administeredAt: form.administeredAt, expiryDate: form.expiryDate || null, nextDoseDue: form.nextDoseDue || null });
      setShowForm(false); setForm(prev => ({ ...prev, doseNumber: '1', administeredAt: localToday(), doseVolume: '', route: '', administrationSite: '', batchNumber: '', expiryDate: '', nextDoseDue: '', adverseReaction: '', notes: '' }));
      await load();
    } catch (e: any) { setError(e.response?.data?.message || e.message || 'Failed to save vaccination.'); }
    finally { setSaving(false); }
  };
  const saveVaccine = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (!catalogue.code.trim() || !catalogue.name.trim()) { setError('Vaccine code and name are required.'); return; }
    setSaving(true);
    try { await api.post('/immunization/vaccines', catalogue); setCatalogue({ code: '', name: '', description: '', defaultDoseVolume: '', defaultRoute: '' }); setShowCatalogue(false); await load(); }
    catch (e: any) { setError(e.response?.data?.message || e.message || 'Could not save vaccine catalogue entry.'); }
    finally { setSaving(false); }
  };
  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><h2 className="text-sm font-semibold text-[var(--text-primary)]">Immunization history</h2><p className="text-xs text-[var(--text-tertiary)]">Recorded vaccinations and upcoming doses for this patient.</p></div>
      <div className="flex gap-2">
        <button onClick={load} disabled={loading} className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border-color)] px-2.5 py-1.5 text-xs text-[var(--text-primary)]"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
        {canManageCatalogue && <button onClick={() => setShowCatalogue(s => !s)} className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border-color)] px-2.5 py-1.5 text-xs text-[var(--text-primary)]"><Plus className="h-3.5 w-3.5" /> Add vaccine</button>}
        {canRecord && <button onClick={() => setShowForm(s => !s)} className="inline-flex items-center gap-1.5 rounded-md bg-[var(--icon-cyan-bg)] px-2.5 py-1.5 text-xs font-semibold text-[var(--icon-cyan-text)]"><Syringe className="h-3.5 w-3.5" /> Record vaccination</button>}
      </div>
    </div>
    {error && <div className="rounded-md border border-[var(--icon-red-text)]/30 bg-[var(--icon-red-bg)] p-3 text-xs text-[var(--icon-red-text)]] flex items-center gap-2"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
    {showCatalogue && canManageCatalogue && <form onSubmit={saveVaccine} className="grid grid-cols-1 md:grid-cols-2 gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] p-3">
      <input required placeholder="Code (e.g. BCG)" value={catalogue.code} onChange={e => setCatalogue(s => ({ ...s, code: e.target.value }))} className="rounded-md border border-[var(--border-color)] bg-[var(--bg-card)] p-2 text-sm text-[var(--text-primary)]" />
      <input required placeholder="Vaccine name" value={catalogue.name} onChange={e => setCatalogue(s => ({ ...s, name: e.target.value }))} className="rounded-md border border-[var(--border-color)] bg-[var(--bg-card)] p-2 text-sm text-[var(--text-primary)]" />
      <input placeholder="Description / target disease" value={catalogue.description} onChange={e => setCatalogue(s => ({ ...s, description: e.target.value }))} className="rounded-md border border-[var(--border-color)] bg-[var(--bg-card)] p-2 text-sm text-[var(--text-primary)]" />
      <input placeholder="Default volume (e.g. 0.05 mL)" value={catalogue.defaultDoseVolume} onChange={e => setCatalogue(s => ({ ...s, defaultDoseVolume: e.target.value }))} className="rounded-md border border-[var(--border-color)] bg-[var(--bg-card)] p-2 text-sm text-[var(--text-primary)]" />
      <input placeholder="Default route (e.g. intradermal)" value={catalogue.defaultRoute} onChange={e => setCatalogue(s => ({ ...s, defaultRoute: e.target.value }))} className="rounded-md border border-[var(--border-color)] bg-[var(--bg-card)] p-2 text-sm text-[var(--text-primary)]" />
      <div className="flex gap-2"><button disabled={saving} className="rounded-md bg-[var(--icon-green-bg)] px-3 py-2 text-xs font-semibold text-[var(--icon-green-text)]">{saving ? 'Saving…' : 'Save vaccine'}</button><button type="button" onClick={() => setShowCatalogue(false)} className="rounded-md border border-[var(--border-color)] px-3 py-2 text-xs">Cancel</button></div>
    </form>}
    {showForm && canRecord && <form onSubmit={saveRecord} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] p-3 space-y-3">
      {immunizationVisits.length === 0 ? <div className="rounded-md bg-[var(--icon-yellow-bg)] p-3 text-xs text-[var(--text-primary)]">A vaccination visit is required first. <button type="button" onClick={onCreateAttendance} className="font-semibold underline">Create immunization visit</button> then return here.</div> : <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      <label className="text-xs text-[var(--text-secondary)]">Immunization attendance<select required value={form.attendanceId} onChange={e => update('attendanceId', e.target.value)} className="mt-1 w-full rounded-md border border-[var(--border-color)] bg-[var(--bg-card)] p-2 text-sm text-[var(--text-primary)]"><option value="">Select visit</option>{immunizationVisits.map(v => <option key={v.id} value={v.id}>{v.attendanceNumber || v.id} — {dateLabel(v.dateTime || v.createdAt)}</option>)}</select></label>
      <label className="text-xs text-[var(--text-secondary)]">Vaccine<select required value={form.vaccineId} onChange={e => { const v = vaccines.find(x => x.id === e.target.value); setForm(s => ({ ...s, vaccineId: e.target.value, doseVolume: v?.defaultDoseVolume || '', route: v?.defaultRoute || '' })); }} className="mt-1 w-full rounded-md border border-[var(--border-color)] bg-[var(--bg-card)] p-2 text-sm text-[var(--text-primary)]"><option value="">Select vaccine</option>{vaccines.map(v => <option key={v.id} value={v.id}>{v.name} ({v.code})</option>)}</select></label>
      <label className="text-xs text-[var(--text-secondary)]">Dose number / label<input required value={form.doseNumber} onChange={e => update('doseNumber', e.target.value)} placeholder="1, 2, Booster…" className="mt-1 w-full rounded-md border border-[var(--border-color)] bg-[var(--bg-card)] p-2 text-sm text-[var(--text-primary)]" /></label>
      <label className="text-xs text-[var(--text-secondary)]">Date administered<input type="date" required value={form.administeredAt} onChange={e => update('administeredAt', e.target.value)} className="mt-1 w-full rounded-md border border-[var(--border-color)] bg-[var(--bg-card)] p-2 text-sm text-[var(--text-primary)]" /></label>
      <label className="text-xs text-[var(--text-secondary)]">Dose / volume<input value={form.doseVolume} onChange={e => update('doseVolume', e.target.value)} placeholder="e.g. 0.5 mL" className="mt-1 w-full rounded-md border border-[var(--border-color)] bg-[var(--bg-card)] p-2 text-sm text-[var(--text-primary)]" /></label>
      <label className="text-xs text-[var(--text-secondary)]">Route<input value={form.route} onChange={e => update('route', e.target.value)} placeholder="IM, oral, SC…" className="mt-1 w-full rounded-md border border-[var(--border-color)] bg-[var(--bg-card)] p-2 text-sm text-[var(--text-primary)]" /></label>
      <label className="text-xs text-[var(--text-secondary)]">Site<input value={form.administrationSite} onChange={e => update('administrationSite', e.target.value)} placeholder="Left upper arm, thigh…" className="mt-1 w-full rounded-md border border-[var(--border-color)] bg-[var(--bg-card)] p-2 text-sm text-[var(--text-primary)]" /></label>
      <label className="text-xs text-[var(--text-secondary)]">Batch / lot number<input value={form.batchNumber} onChange={e => update('batchNumber', e.target.value)} className="mt-1 w-full rounded-md border border-[var(--border-color)] bg-[var(--bg-card)] p-2 text-sm text-[var(--text-primary)]" /></label>
      <label className="text-xs text-[var(--text-secondary)]">Vaccine expiry<input type="date" value={form.expiryDate} onChange={e => update('expiryDate', e.target.value)} className="mt-1 w-full rounded-md border border-[var(--border-color)] bg-[var(--bg-card)] p-2 text-sm text-[var(--text-primary)]" /></label>
      <label className="text-xs text-[var(--text-secondary)]">Next dose due<input type="date" value={form.nextDoseDue} onChange={e => update('nextDoseDue', e.target.value)} className="mt-1 w-full rounded-md border border-[var(--border-color)] bg-[var(--bg-card)] p-2 text-sm text-[var(--text-primary)]" /></label>
      <label className="text-xs text-[var(--text-secondary)] md:col-span-2">Adverse reaction<input value={form.adverseReaction} onChange={e => update('adverseReaction', e.target.value)} placeholder="None observed, or describe" className="mt-1 w-full rounded-md border border-[var(--border-color)] bg-[var(--bg-card)] p-2 text-sm text-[var(--text-primary)]" /></label>
      <label className="text-xs text-[var(--text-secondary)] md:col-span-2">Notes<textarea rows={2} value={form.notes} onChange={e => update('notes', e.target.value)} className="mt-1 w-full rounded-md border border-[var(--border-color)] bg-[var(--bg-card)] p-2 text-sm text-[var(--text-primary)]" /></label>
      <div className="md:col-span-2 flex justify-end gap-2"><button type="button" onClick={() => setShowForm(false)} className="rounded-md border border-[var(--border-color)] px-3 py-2 text-xs">Cancel</button><button disabled={saving} className="rounded-md bg-[var(--icon-cyan-bg)] px-3 py-2 text-xs font-semibold text-[var(--icon-cyan-text)]">{saving ? 'Saving…' : 'Save vaccination record'}</button></div>
      </div>}
    </form>}
    {records.length > 0 && <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] p-3"><p className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">Vaccinations recorded</p><p className="mt-1 text-xl font-bold text-[var(--text-primary)]">{records.length}</p></div>
      <div className="rounded-lg border border-[var(--icon-yellow-text)]/30 bg-[var(--icon-yellow-bg)] p-3"><p className="text-[10px] uppercase tracking-wide text-[var(--icon-yellow-text)]]">Upcoming doses</p><p className="mt-1 text-xl font-bold text-[var(--icon-yellow-text)]">{upcomingRecords.length}</p></div>
      <div className="rounded-lg border border-[var(--icon-red-text)]/30 bg-[var(--icon-red-bg)] p-3"><p className="text-[10px] uppercase tracking-wide text-[var(--icon-red-text)]">Overdue doses</p><p className="mt-1 text-xl font-bold text-[var(--icon-red-text)]">{overdueRecords.length}</p></div>
    </div>}
    {dueRecords.length > 0 && <div className="rounded-lg border border-[var(--border-color)] overflow-hidden">
      <div className="bg-[var(--bg-main)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)]">Dose follow-up</div>
      <div className="divide-y divide-[var(--border-color)]">
        {dueRecords.map(row => { const overdue = row.nextDoseDue!.slice(0, 10) < todayKey; return <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
          <div className="min-w-0"><p className="text-xs font-medium text-[var(--text-primary)]">{row.Vaccine?.name || 'Vaccine'} <span className="text-[var(--text-tertiary)]">· dose {row.doseNumber}</span></p><p className="text-[10px] text-[var(--text-tertiary)]">Next dose due: {dateLabel(row.nextDoseDue)}</p></div>
          <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${overdue ? 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]' : 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]'}`}>{overdue ? 'Overdue' : 'Upcoming'}</span>
        </div>; })}
      </div>
    </div>}
    {loading ? <div className="py-10 text-center text-xs text-[var(--text-tertiary)]">Loading immunization records…</div> : records.length === 0 ? <div className="rounded-lg border border-[var(--border-color)] p-8 text-center"><Syringe className="mx-auto mb-2 h-6 w-6 text-[var(--text-tertiary)]" /><p className="text-sm font-medium text-[var(--text-primary)]">No vaccinations recorded</p><p className="mt-1 text-xs text-[var(--text-tertiary)]">Vaccinations administered will appear here.</p></div> : <div className="overflow-x-auto rounded-lg border border-[var(--border-color)]"><table className="w-full text-xs"><thead className="bg-[var(--bg-main)] text-[var(--text-tertiary)]"><tr>{['Vaccine','Dose','Date given','Route / site','Batch / expiry','Next due','Administered by'].map(h => <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>)}</tr></thead><tbody>{records.map(row => <tr key={row.id} className="border-t border-[var(--border-color)]"><td className="px-3 py-2 font-semibold text-[var(--text-primary)]">{row.Vaccine?.name || '—'}<div className="text-[10px] text-[var(--text-tertiary)]">{row.Vaccine?.code}</div></td><td className="px-3 py-2">{row.doseNumber}</td><td className="px-3 py-2">{dateLabel(row.administeredAt)}</td><td className="px-3 py-2">{[row.route,row.administrationSite].filter(Boolean).join(' / ') || '—'}</td><td className="px-3 py-2">{[row.batchNumber,row.expiryDate ? `Exp ${dateLabel(row.expiryDate)}` : null].filter(Boolean).join(' / ') || '—'}</td><td className="px-3 py-2">{row.nextDoseDue ? <span className="inline-flex items-center gap-1"><CalendarClock className="h-3 w-3 text-[var(--icon-yellow-text)]" />{dateLabel(row.nextDoseDue)}</span> : '—'}</td><td className="px-3 py-2">{row.AdministeredBy?.fullName || '—'}</td></tr>)}</tbody></table></div>}
  </section>;
}
