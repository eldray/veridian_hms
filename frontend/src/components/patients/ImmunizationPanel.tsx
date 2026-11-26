import { useEffect, useMemo, useState } from 'react';
import api from '../../api/api';
import { Syringe, Plus, RefreshCw, AlertCircle, CalendarClock } from 'lucide-react';
import { Button, INPUT, cn } from '../../components/ui';

type Vaccine = { id: string; code: string; name: string; isActive?: boolean; description?: string | null; defaultDoseVolume?: string | null; defaultRoute?: string | null; diseaseTargets?: string[]; recommendedAge?: string | null; StockItem?: { id: string; name: string; drugCode: string; currentStock: number } | null };
type VaccineStockItem = { id: string; name: string; drugCode: string; currentStock: number; unitOfMeasure: string };
type VaccineBatchAvailability = { stockItem: { id: string; name: string; currentStock: number }; batchTracked: boolean; departmentAssigned: boolean; batches: Array<{ id: string; batchNumber: string; expiryDate: string; quantity: number; receivedDate: string }>; usableQuantity: number };
type RecordRow = { id: string; doseNumber: string; administeredAt: string; doseVolume?: string | null; route?: string | null; administrationSite?: string | null; batchNumber?: string | null; expiryDate?: string | null; nextDoseDue?: string | null; adverseReaction?: string | null; notes?: string | null; stockTransactionId?: string | null; StockTransaction?: { id: string; transactionType: string; quantity: number } | null; Vaccine?: Vaccine; Attendance?: { attendanceNumber?: string; dateTime?: string }; AdministeredBy?: { fullName?: string } };
type Visit = { id: string; attendanceType?: string; attendanceNumber?: string; dateTime?: string; createdAt?: string; status?: string };
const localToday = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const dateLabel = (v?: string | null) => v ? new Date(v).toLocaleDateString() : '—';

export default function ImmunizationPanel({ patientId, attendances, initialAttendanceId, canRecord, canManageCatalogue, onCreateAttendance }: { patientId: string; attendances: Visit[]; initialAttendanceId?: string; canRecord: boolean; canManageCatalogue: boolean; onCreateAttendance: () => void }) {
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [catalogueVaccines, setCatalogueVaccines] = useState<Vaccine[]>([]);
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [vaccineStockItems, setVaccineStockItems] = useState<VaccineStockItem[]>([]);
  const [batchAvailability, setBatchAvailability] = useState<VaccineBatchAvailability | null>(null);
  const [batchAvailabilityLoading, setBatchAvailabilityLoading] = useState(false);
  const [batchAvailabilityError, setBatchAvailabilityError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showCatalogue, setShowCatalogue] = useState(false);
  const [editingVaccineId, setEditingVaccineId] = useState<string | null>(null);
  const [form, setForm] = useState({ attendanceId: '', vaccineId: '', doseNumber: '1', administeredAt: localToday(), doseVolume: '', route: '', administrationSite: '', batchNumber: '', expiryDate: '', nextDoseDue: '', adverseReaction: '', notes: '', underlyingCondition: '', healthWorker: '', pregnancyStatus: '' });
  const [catalogue, setCatalogue] = useState({ code: '', name: '', description: '', defaultDoseVolume: '', defaultRoute: '', stockItemId: '' });
  const immunizationVisits = useMemo(() => attendances.filter(v => v.attendanceType === 'immunization'), [attendances]);
  useEffect(() => {
    if (!immunizationVisits.length) return;
    setForm(current => {
      if (current.attendanceId && immunizationVisits.some(v => v.id === current.attendanceId)) return current;
      const requested = immunizationVisits.find(v => v.id === initialAttendanceId);
      const preferred = requested || immunizationVisits.find(v => !['completed', 'complete', 'closed', 'discharged'].includes(String(v.status || '').toLowerCase())) || immunizationVisits[0];
      return { ...current, attendanceId: preferred.id };
    });
  }, [immunizationVisits, initialAttendanceId]);
  const selectedVaccine = useMemo(() => vaccines.find(v => v.id === form.vaccineId), [vaccines, form.vaccineId]);

  useEffect(() => {
    const vaccineId = selectedVaccine?.id;
    if (!selectedVaccine?.StockItem?.id || !vaccineId) {
      setBatchAvailability(null);
      setBatchAvailabilityError('');
      setBatchAvailabilityLoading(false);
      return;
    }
    let active = true;
    setBatchAvailabilityLoading(true);
    setBatchAvailabilityError('');
    api.get('/immunization/vaccines/' + vaccineId + '/stock-batches')
      .then(response => { if (active) setBatchAvailability(response.data?.data ?? null); })
      .catch((e: any) => {
        if (active) {
          setBatchAvailability(null);
          setBatchAvailabilityError(e.response?.data?.message || e.message || 'Could not check vaccine batches.');
        }
      })
      .finally(() => { if (active) setBatchAvailabilityLoading(false); });
    return () => { active = false; };
  }, [selectedVaccine?.id, selectedVaccine?.StockItem?.id]);



  const load = async () => {
    setLoading(true); setError('');
    try {
      // Patient records are core; optional catalogue administration calls are isolated.
      const [v, r] = await Promise.all([
        api.get('/immunization/vaccines'),
        api.get(`/immunization/patients/${patientId}/records`)
      ]);
      setVaccines(v.data?.data ?? []);
      setRecords(r.data?.data ?? []);
      if (canManageCatalogue) {
        const [stockResult, managedResult] = await Promise.allSettled([
          api.get('/immunization/vaccine-stock-items'),
          api.get('/immunization/vaccines/manage')
        ]);
        if (stockResult.status === 'fulfilled') setVaccineStockItems(stockResult.value.data?.data ?? []);
        if (managedResult.status === 'fulfilled') setCatalogueVaccines(managedResult.value.data?.data ?? []);
        const optionalFailure = stockResult.status === 'rejected' ? stockResult.reason : managedResult.status === 'rejected' ? managedResult.reason : null;
        if (optionalFailure) setError(optionalFailure.response?.data?.message || optionalFailure.message || 'Some vaccine catalogue information could not be loaded.');
      }
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
      await api.post('/immunization/records', { patientId, ...form, underlyingCondition: form.underlyingCondition === 'yes' ? true : form.underlyingCondition === 'no' ? false : null, healthWorker: form.healthWorker === 'yes' ? true : form.healthWorker === 'no' ? false : null, administeredAt: form.administeredAt, expiryDate: form.expiryDate || null, nextDoseDue: form.nextDoseDue || null });
      setShowForm(false); setForm(prev => ({ ...prev, doseNumber: '1', administeredAt: localToday(), doseVolume: '', route: '', administrationSite: '', batchNumber: '', expiryDate: '', nextDoseDue: '', adverseReaction: '', notes: '', underlyingCondition: '', healthWorker: '', pregnancyStatus: '' }));
      await load();
    } catch (e: any) { setError(e.response?.data?.message || e.message || 'Failed to save vaccination.'); }
    finally { setSaving(false); }
  };
  const saveVaccine = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (!catalogue.code.trim() || !catalogue.name.trim()) { setError('Vaccine code and name are required.'); return; }
    setSaving(true);
    try {
      if (editingVaccineId) await api.put(`/immunization/vaccines/${editingVaccineId}`, catalogue);
      else await api.post('/immunization/vaccines', catalogue);
      setCatalogue({ code: '', name: '', description: '', defaultDoseVolume: '', defaultRoute: '', stockItemId: '' });
      setEditingVaccineId(null); setShowCatalogue(false); await load();
    }
    catch (e: any) { setError(e.response?.data?.message || e.message || 'Could not save vaccine catalogue entry.'); }
    finally { setSaving(false); }
  };
  const editVaccine = (v: Vaccine) => {
    setEditingVaccineId(v.id);
    setCatalogue({ code: v.code, name: v.name, description: v.description || '', defaultDoseVolume: v.defaultDoseVolume || '', defaultRoute: v.defaultRoute || '', stockItemId: v.StockItem?.id || '' });
    setShowCatalogue(true);
  };
  const toggleVaccine = async (v: Vaccine) => {
    setError(''); setSaving(true);
    try { await api.put(`/immunization/vaccines/${v.id}`, { isActive: v.isActive === false }); await load(); }
    catch (e: any) { setError(e.response?.data?.message || e.message || 'Could not update vaccine status.'); }
    finally { setSaving(false); }
  };
  return <section className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><h2 className="text-base font-semibold text-[var(--text-primary)]">Immunization history</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">Recorded vaccinations and upcoming doses for this patient.</p></div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" icon={RefreshCw} loading={loading} onClick={() => void load()}>Refresh</Button>
        {canManageCatalogue && <button onClick={() => { setEditingVaccineId(null); setCatalogue({ code: '', name: '', description: '', defaultDoseVolume: '', defaultRoute: '', stockItemId: '' }); setShowCatalogue(s => !s); }} className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border-color)] px-2.5 py-1.5 text-xs text-[var(--text-primary)]"><Plus className="h-3.5 w-3.5" /> Add vaccine</button>}
        {canRecord && <Button size="sm" icon={Syringe} onClick={() => setShowForm(s => !s)}>Record vaccination</Button>}
      </div>
    </div>
    {error && <div className="flex items-center gap-2 rounded-lg border border-[var(--icon-red-text)]/30 bg-[var(--icon-red-bg)] p-3 text-sm text-[var(--icon-red-text)]"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
    {showCatalogue && canManageCatalogue && <form onSubmit={saveVaccine} className="grid grid-cols-1 gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] p-4 md:grid-cols-2">
      <input required placeholder="Code (e.g. BCG)" value={catalogue.code} onChange={e => setCatalogue(s => ({ ...s, code: e.target.value }))} className={cn(INPUT, 'w-full')} />
      <input required placeholder="Vaccine name" value={catalogue.name} onChange={e => setCatalogue(s => ({ ...s, name: e.target.value }))} className={cn(INPUT, 'w-full')} />
      <input placeholder="Description / target disease" value={catalogue.description} onChange={e => setCatalogue(s => ({ ...s, description: e.target.value }))} className={cn(INPUT, 'w-full')} />
      <input placeholder="Default volume (e.g. 0.05 mL)" value={catalogue.defaultDoseVolume} onChange={e => setCatalogue(s => ({ ...s, defaultDoseVolume: e.target.value }))} className={cn(INPUT, 'w-full')} />
      <input placeholder="Default route (e.g. intradermal)" value={catalogue.defaultRoute} onChange={e => setCatalogue(s => ({ ...s, defaultRoute: e.target.value }))} className={cn(INPUT, 'w-full')} />
      <label className="text-xs text-[var(--text-secondary)] md:col-span-2">Link to medicine / stock item (optional)
        <select value={catalogue.stockItemId} onChange={e => setCatalogue(s => ({ ...s, stockItemId: e.target.value }))} className={cn(INPUT, 'mt-1 w-full')}>
          <option value="">No stock link yet</option>
          {vaccineStockItems.map(item => <option key={item.id} value={item.id}>{item.name} ({item.drugCode}) · On hand: {item.currentStock}</option>)}
        </select>
      </label>
      <div className="flex gap-2"><button disabled={saving} className="rounded-md bg-[var(--icon-green-bg)] px-3 py-2 text-xs font-semibold text-[var(--icon-green-text)]">{saving ? 'Saving…' : editingVaccineId ? 'Update vaccine' : 'Save vaccine'}</button><button type="button" onClick={() => { setShowCatalogue(false); setEditingVaccineId(null); }} className="rounded-md border border-[var(--border-color)] px-3 py-2 text-xs">Cancel</button></div>
    </form>}
    {canManageCatalogue && <div className="overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]">
      <div className="border-b border-[var(--border-color)] bg-[var(--bg-main)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)]">Vaccine catalogue</div>
      <div className="divide-y divide-[var(--border-color)]">{catalogueVaccines.map(v => <div key={v.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
        <div className="min-w-0"><p className="text-xs font-semibold text-[var(--text-primary)]">{v.name} <span className="font-normal text-[var(--text-tertiary)]">({v.code})</span></p><p className="text-[10px] text-[var(--text-tertiary)]">{v.StockItem ? `Stock: ${v.StockItem.name} · ${v.StockItem.currentStock} on hand` : 'No stock item linked'} · {v.isActive === false ? 'Inactive' : 'Active'}</p></div>
        <div className="flex gap-2"><button type="button" onClick={() => editVaccine(v)} className="rounded-md border border-[var(--border-color)] px-2 py-1 text-[10px]">Edit</button><button type="button" disabled={saving} onClick={() => toggleVaccine(v)} className="rounded-md border border-[var(--border-color)] px-2 py-1 text-[10px]">{v.isActive === false ? 'Reactivate' : 'Deactivate'}</button></div>
      </div>)}</div>
    </div>}
    {showForm && canRecord && <form onSubmit={saveRecord} className="space-y-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] p-4">
      {immunizationVisits.length === 0 ? <div className="rounded-md bg-[var(--icon-yellow-bg)] p-3 text-xs text-[var(--text-primary)]">A vaccination visit is required first. <button type="button" onClick={onCreateAttendance} className="font-semibold underline">Create immunization visit</button> then return here.</div> : <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      <label className="text-xs text-[var(--text-secondary)]">Immunization attendance<select required value={form.attendanceId} onChange={e => update('attendanceId', e.target.value)} className={cn(INPUT, 'mt-1 w-full')}><option value="">Select visit</option>{immunizationVisits.map(v => <option key={v.id} value={v.id}>{v.attendanceNumber || v.id} — {dateLabel(v.dateTime || v.createdAt)}</option>)}</select></label>
      <label className="text-xs text-[var(--text-secondary)]">Vaccine<select required value={form.vaccineId} onChange={e => { const v = vaccines.find(x => x.id === e.target.value); setForm(s => ({ ...s, vaccineId: e.target.value, doseVolume: v?.defaultDoseVolume || '', route: v?.defaultRoute || '' })); }} className={cn(INPUT, 'mt-1 w-full')}><option value="">Select vaccine</option>{vaccines.map(v => <option key={v.id} value={v.id}>{v.name} ({v.code}){v.StockItem ? ` · ${v.StockItem.drugCode}` : ' · no stock link'}</option>)}</select></label>
      <label className="text-xs text-[var(--text-secondary)]">Dose number / label<input required value={form.doseNumber} onChange={e => update('doseNumber', e.target.value)} placeholder="1, 2, Booster…" className={cn(INPUT, 'mt-1 w-full')} /></label>
      <label className="text-xs text-[var(--text-secondary)]">Date administered<input type="date" required value={form.administeredAt} onChange={e => update('administeredAt', e.target.value)} className={cn(INPUT, 'mt-1 w-full')} /></label>
      <label className="text-xs text-[var(--text-secondary)]">Dose / volume<input value={form.doseVolume} onChange={e => update('doseVolume', e.target.value)} placeholder="e.g. 0.5 mL" className={cn(INPUT, 'mt-1 w-full')} /></label>
      <label className="text-xs text-[var(--text-secondary)]">Route<input value={form.route} onChange={e => update('route', e.target.value)} placeholder="IM, oral, SC…" className={cn(INPUT, 'mt-1 w-full')} /></label>
      <label className="text-xs text-[var(--text-secondary)]">Site<input value={form.administrationSite} onChange={e => update('administrationSite', e.target.value)} placeholder="Left upper arm, thigh…" className={cn(INPUT, 'mt-1 w-full')} /></label>
      {selectedVaccine?.StockItem ? <div className="md:col-span-2 rounded-md border border-[var(--border-color)] bg-[var(--bg-card)] p-3 text-xs text-[var(--text-secondary)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><p className="font-semibold text-[var(--text-primary)]">Stock linked: {selectedVaccine.StockItem.name}</p><p className="mt-0.5">Hospital on hand: {selectedVaccine.StockItem.currentStock}</p></div>
          {batchAvailability?.batchTracked && <span className="rounded-full bg-[var(--icon-cyan-bg)] px-2 py-1 font-semibold text-[var(--icon-cyan-text)]">Batch tracked · FEFO issue</span>}
        </div>
        {batchAvailabilityLoading ? <p className="mt-2">Checking usable batches in your department…</p> :
          batchAvailabilityError ? <p role="alert" className="mt-2 text-[var(--icon-red-text)]">{batchAvailabilityError}</p> :
          !batchAvailability?.departmentAssigned ? <p className="mt-2 text-[var(--icon-yellow-text)]">Your account has no department assigned. Ask an administrator to assign your department before issuing batch-tracked vaccine stock.</p> :
          batchAvailability.batchTracked ? <>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1"><span>Usable department stock: <strong className="text-[var(--text-primary)]">{batchAvailability.usableQuantity}</strong></span><span>Available lots: <strong className="text-[var(--text-primary)]">{batchAvailability.batches.length}</strong></span></div>
            {batchAvailability.batches.length ? <div className="mt-2 overflow-x-auto rounded-md border border-[var(--border-color)]"><table className="w-full min-w-[360px] text-left"><thead className="bg-[var(--bg-main)] text-[var(--text-tertiary)]"><tr><th className="px-2 py-1.5">Batch / lot</th><th className="px-2 py-1.5">Expiry</th><th className="px-2 py-1.5 text-right">Qty</th></tr></thead><tbody>{batchAvailability.batches.map(batch => <tr key={batch.id} className="border-t border-[var(--border-color)]"><td className="px-2 py-1.5 font-medium text-[var(--text-primary)]">{batch.batchNumber}</td><td className="px-2 py-1.5">{dateLabel(batch.expiryDate)}</td><td className="px-2 py-1.5 text-right tabular-nums">{batch.quantity}</td></tr>)}</tbody></table></div> : <p className="mt-2 text-[var(--icon-red-text)]">No unexpired batch is available in your department. Vaccination stock will not be deducted until usable stock is received or transferred.</p>}
            <p className="mt-2">On save, one dose is issued from the earliest-expiry usable batch (FEFO). The actual batch number and expiry are attached to the vaccination record and stock transaction automatically.</p>
          </> : <p className="mt-2">No batch lots are recorded for this stock item. The existing department stock ledger will be used; batch and expiry must be recorded on receipt before batch-level tracking can apply.</p>}
      </div> : <>
        <label className="text-xs text-[var(--text-secondary)]">Batch / lot number<input value={form.batchNumber} onChange={e => update('batchNumber', e.target.value)} className={cn(INPUT, 'mt-1 w-full')} /></label>
        <label className="text-xs text-[var(--text-secondary)]">Vaccine expiry<input type="date" value={form.expiryDate} onChange={e => update('expiryDate', e.target.value)} className={cn(INPUT, 'mt-1 w-full')} /></label>
      </>}
      <label className="text-xs text-[var(--text-secondary)]">Next dose due<input type="date" value={form.nextDoseDue} onChange={e => update('nextDoseDue', e.target.value)} className={cn(INPUT, 'mt-1 w-full')} /></label>
      <label className="text-xs text-[var(--text-secondary)]">Underlying condition (COVID-19 reporting)<select value={form.underlyingCondition} onChange={e => update('underlyingCondition', e.target.value)} className={cn(INPUT, 'mt-1 w-full')}><option value="">Not recorded / not applicable</option><option value="yes">Yes</option><option value="no">No</option></select></label>
      <label className="text-xs text-[var(--text-secondary)]">Health worker (COVID-19 reporting)<select value={form.healthWorker} onChange={e => update('healthWorker', e.target.value)} className={cn(INPUT, 'mt-1 w-full')}><option value="">Not recorded / not applicable</option><option value="yes">Yes</option><option value="no">No</option></select></label>
      <label className="text-xs text-[var(--text-secondary)]">Pregnancy status (Td / COVID-19 reporting)<select value={form.pregnancyStatus} onChange={e => update('pregnancyStatus', e.target.value)} className={cn(INPUT, 'mt-1 w-full')}><option value="">Not recorded</option><option value="pregnant">Pregnant</option><option value="non_pregnant">Non-pregnant</option><option value="not_applicable">Others / not applicable</option><option value="unknown">Unknown</option></select></label>
      <label className="text-xs text-[var(--text-secondary)] md:col-span-2">Adverse reaction<input value={form.adverseReaction} onChange={e => update('adverseReaction', e.target.value)} placeholder="None observed, or describe" className={cn(INPUT, 'mt-1 w-full')} /></label>
      <label className="text-xs text-[var(--text-secondary)] md:col-span-2">Notes<textarea rows={2} value={form.notes} onChange={e => update('notes', e.target.value)} className={cn(INPUT, 'mt-1 w-full')} /></label>
      <div className="md:col-span-2 flex justify-end gap-2"><button type="button" onClick={() => setShowForm(false)} className="rounded-md border border-[var(--border-color)] px-3 py-2 text-xs">Cancel</button><button disabled={saving} className="rounded-md bg-[var(--icon-cyan-bg)] px-3 py-2 text-xs font-semibold text-[var(--icon-cyan-text)]">{saving ? 'Saving…' : 'Save vaccination record'}</button></div>
      </div>}
    </form>}
    {records.length > 0 && <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] p-3"><p className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">Vaccinations recorded</p><p className="mt-1 text-xl font-bold text-[var(--text-primary)]">{records.length}</p></div>
      <div className="rounded-lg border border-[var(--icon-yellow-text)]/30 bg-[var(--icon-yellow-bg)] p-3"><p className="text-[10px] uppercase tracking-wide text-[var(--icon-yellow-text)]]">Upcoming doses</p><p className="mt-1 text-xl font-bold text-[var(--icon-yellow-text)]">{upcomingRecords.length}</p></div>
      <div className="rounded-lg border border-[var(--icon-red-text)]/30 bg-[var(--icon-red-bg)] p-3"><p className="text-[10px] uppercase tracking-wide text-[var(--icon-red-text)]">Overdue doses</p><p className="mt-1 text-xl font-bold text-[var(--icon-red-text)]">{overdueRecords.length}</p></div>
    </div>}
    {dueRecords.length > 0 && <div className="overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]">
      <div className="border-b border-[var(--border-color)] bg-[var(--bg-main)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)]">Dose follow-up</div>
      <div className="divide-y divide-[var(--border-color)]">
        {dueRecords.map(row => { const overdue = row.nextDoseDue!.slice(0, 10) < todayKey; return <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
          <div className="min-w-0"><p className="text-xs font-medium text-[var(--text-primary)]">{row.Vaccine?.name || 'Vaccine'} <span className="text-[var(--text-tertiary)]">· dose {row.doseNumber}</span></p><p className="text-[10px] text-[var(--text-tertiary)]">Next dose due: {dateLabel(row.nextDoseDue)}</p></div>
          <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${overdue ? 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]' : 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]'}`}>{overdue ? 'Overdue' : 'Upcoming'}</span>
        </div>; })}
      </div>
    </div>}
    {loading ? <div className="py-10 text-center text-xs text-[var(--text-tertiary)]">Loading immunization records…</div> : records.length === 0 ? <div className="rounded-lg border border-[var(--border-color)] p-8 text-center"><Syringe className="mx-auto mb-2 h-6 w-6 text-[var(--text-tertiary)]" /><p className="text-sm font-medium text-[var(--text-primary)]">No vaccinations recorded</p><p className="mt-1 text-xs text-[var(--text-tertiary)]">Vaccinations administered will appear here.</p></div> : <div className="overflow-x-auto rounded-xl border border-[var(--border-color)]"><table className="w-full text-xs"><thead className="bg-[var(--bg-main)] text-[var(--text-tertiary)]"><tr>{['Vaccine','Dose','Date given','Route / site','Batch / expiry','Next due','Administered by'].map(h => <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>)}</tr></thead><tbody>{records.map(row => <tr key={row.id} className="border-t border-[var(--border-color)]"><td className="px-4 py-3 font-semibold text-[var(--text-primary)]">{row.Vaccine?.name || '—'}<div className="text-[10px] text-[var(--text-tertiary)]">{row.Vaccine?.code}</div></td><td className="px-4 py-3">{row.doseNumber}</td><td className="px-4 py-3">{dateLabel(row.administeredAt)}</td><td className="px-4 py-3">{[row.route,row.administrationSite].filter(Boolean).join(' / ') || '—'}</td><td className="px-4 py-3">{[row.batchNumber,row.expiryDate ? `Exp ${dateLabel(row.expiryDate)}` : null].filter(Boolean).join(' / ') || '—'}</td><td className="px-4 py-3">{row.nextDoseDue ? <span className="inline-flex items-center gap-1"><CalendarClock className="h-3 w-3 text-[var(--icon-yellow-text)]" />{dateLabel(row.nextDoseDue)}</span> : '—'}</td><td className="px-4 py-3">{row.AdministeredBy?.fullName || '—'}{row.StockTransaction ? <div className="text-[10px] text-[var(--icon-green-text)]">Stock issued</div> : null}</td></tr>)}</tbody></table></div>}
  </section>;
}
