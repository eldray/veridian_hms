import { useEffect, useMemo, useState } from 'react';
import api from '../api/api';
import { useToast } from '../store/toastStore';
import { confirmDialog } from '../context/ConfirmDialog';
import ImmunizationSectionTabs from '../components/immunization/ImmunizationSectionTabs';
import {
  AlertCircle, CheckCircle, Edit, Plus, RefreshCw, Syringe, X,
  Link2, Package, Power, Save,
} from 'lucide-react';
import {
  Badge, Button, Card, PageHeader, SearchInput, StatCard, TABLE_SHELL, TD, TH, TH_ROW, TR, cn,
} from '../components/ui';

type StockItem = { id: string; name: string; drugCode: string; currentStock: number; unitOfMeasure?: string };
type Vaccine = {
  id: string; code: string; name: string; description?: string | null; diseaseTargets?: string[];
  recommendedAge?: string | null; doseSchedule?: unknown; defaultDoseVolume?: string | null;
  defaultRoute?: string | null; isActive: boolean;
  StockItem?: { id: string; name: string; drugCode: string; currentStock: number } | null;
};
type FormState = {
  code: string; name: string; description: string; diseaseTargets: string; recommendedAge: string;
  doseSchedule: string; defaultDoseVolume: string; defaultRoute: string; stockItemId: string;
};
const EMPTY_FORM: FormState = {
  code: '', name: '', description: '', diseaseTargets: '', recommendedAge: '',
  doseSchedule: '', defaultDoseVolume: '', defaultRoute: '', stockItemId: '',
};
const inputClass = 'w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--icon-cyan-text)]/30';
const labelClass = 'block space-y-1.5 text-xs font-medium text-[var(--text-secondary)]';

export default function VaccineCatalogue() {
  const { success: toastSuccess, error: toastError } = useToast();
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Vaccine | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [catalogue, stock] = await Promise.all([
        api.get('/immunization/vaccines/manage'),
        api.get('/immunization/vaccine-stock-items'),
      ]);
      setVaccines(Array.isArray(catalogue.data?.data) ? catalogue.data.data : []);
      setStockItems(Array.isArray(stock.data?.data) ? stock.data.data : []);
    } catch (e: any) {
      const message = e.response?.data?.message || e.message || 'Unable to load vaccine catalogue.';
      setError(message); toastError('Catalogue load failed', message);
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return vaccines.filter(v => {
      const statusMatch = statusFilter === 'all' || (statusFilter === 'active' ? v.isActive : !v.isActive);
      const textMatch = !term || [v.code, v.name, v.description, v.recommendedAge, ...(v.diseaseTargets || []), v.StockItem?.name, v.StockItem?.drugCode]
        .some(value => String(value || '').toLowerCase().includes(term));
      return statusMatch && textMatch;
    });
  }, [vaccines, search, statusFilter]);

  const activeCount = vaccines.filter(v => v.isActive).length;
  const linkedCount = vaccines.filter(v => v.StockItem?.id).length;
  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = (v: Vaccine) => {
    setEditing(v);
    setForm({
      code: v.code, name: v.name, description: v.description || '', diseaseTargets: (v.diseaseTargets || []).join(', '),
      recommendedAge: v.recommendedAge || '',
      doseSchedule: v.doseSchedule ? JSON.stringify(v.doseSchedule, null, 2) : '',
      defaultDoseVolume: v.defaultDoseVolume || '', defaultRoute: v.defaultRoute || '', stockItemId: v.StockItem?.id || '',
    });
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditing(null); setForm(EMPTY_FORM); };

  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    if (!form.code.trim() || !form.name.trim()) { setError('Vaccine code and name are required.'); return; }
    let doseSchedule: unknown = undefined;
    if (form.doseSchedule.trim()) {
      try { doseSchedule = JSON.parse(form.doseSchedule); }
      catch { setError('Dose schedule must be valid JSON.'); return; }
    }
    setSaving(true);
    try {
      const payload = {
        ...form, code: form.code.trim().toUpperCase(), name: form.name.trim(),
        diseaseTargets: form.diseaseTargets.split(',').map(x => x.trim()).filter(Boolean),
        recommendedAge: form.recommendedAge.trim() || null,
        doseSchedule,
        defaultDoseVolume: form.defaultDoseVolume.trim() || null,
        defaultRoute: form.defaultRoute.trim() || null,
        stockItemId: form.stockItemId || null,
      };
      if (editing) await api.put(`/immunization/vaccines/${editing.id}`, payload);
      else await api.post('/immunization/vaccines', payload);
      toastSuccess(editing ? 'Vaccine updated' : 'Vaccine added', `${payload.name} saved to the catalogue.`);
      closeForm(); await load();
    } catch (e: any) {
      const message = e.response?.data?.message || e.message || 'Could not save vaccine.';
      setError(message); toastError('Save failed', message);
    } finally { setSaving(false); }
  };

  const toggleStatus = async (v: Vaccine) => {
    const nextActive = !v.isActive;
    const confirmed = await confirmDialog({
      title: nextActive ? 'Reactivate vaccine' : 'Deactivate vaccine',
      message: nextActive
        ? `Reactivate ${v.name} so it can be selected for new vaccination records?`
        : `Deactivate ${v.name}? Existing vaccination history will remain, but staff will not be able to select it for new records.`,
      confirmText: nextActive ? 'Reactivate' : 'Deactivate',
    });
    if (!confirmed) return;
    setSaving(true);
    try {
      await api.put(`/immunization/vaccines/${v.id}`, { isActive: nextActive });
      toastSuccess(nextActive ? 'Vaccine reactivated' : 'Vaccine deactivated', v.name);
      await load();
    } catch (e: any) {
      const message = e.response?.data?.message || e.message || 'Could not update vaccine status.';
      setError(message); toastError('Update failed', message);
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Vaccine Catalogue"
        subtitle="Maintain the vaccines, dose schedules and stock links used by immunization services"
        meta={`${vaccines.length} catalogue entries · ${activeCount} active`}
        icon={Syringe} accent="cyan" backTo="/dashboard/immunization"
        actions={<>
          <Button variant="outline" icon={RefreshCw} loading={loading} onClick={() => void load()}>Refresh</Button>
          <Button icon={Plus} onClick={openCreate}>Add Vaccine</Button>
        </>}
      />
      <ImmunizationSectionTabs />

      {error && <div role="alert" className="flex items-start gap-2 rounded-lg border border-[var(--icon-red-text)]/30 bg-[var(--icon-red-bg)] px-3 py-2.5 text-sm text-[var(--icon-red-text)]"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Catalogue entries" value={vaccines.length} icon={Syringe} accent="cyan" />
        <StatCard label="Active vaccines" value={activeCount} icon={CheckCircle} accent="green" />
        <StatCard label="Linked to stock" value={linkedCount} icon={Package} accent="purple" />
      </div>

      <Card>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <SearchInput className="w-full lg:max-w-md" value={search} onChange={setSearch} placeholder="Search code, vaccine, disease or linked stock…" />
          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] p-1">
            {(['active', 'inactive', 'all'] as const).map(key => (
              <button key={key} type="button" onClick={() => setStatusFilter(key)}
                className={cn('rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition-colors', statusFilter === key ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]')}>
                {key} <span className="ml-1 opacity-70">{key === 'all' ? vaccines.length : vaccines.filter(v => key === 'active' ? v.isActive : !v.isActive).length}</span>
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card title={`Vaccine entries (${filtered.length})`} description="The same catalogue is used when recording a patient's vaccination." icon={Syringe} accent="cyan" padded={false}>
        {loading && vaccines.length === 0 ? (
          <div className="space-y-2 p-4">{[1,2,3].map(i => <div key={i} className="h-12 animate-pulse rounded-lg bg-[var(--bg-main)]" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <Syringe className="h-9 w-9 text-[var(--text-tertiary)]" />
            <p className="text-sm font-semibold text-[var(--text-primary)]">{search ? 'No matching vaccines' : 'No vaccine entries in this view'}</p>
            <p className="text-xs text-[var(--text-tertiary)]">{search ? 'Try another search term.' : 'Add a vaccine to begin building the catalogue.'}</p>
            {!search && <Button size="sm" icon={Plus} onClick={openCreate}>Add Vaccine</Button>}
          </div>
        ) : (
          <div className={TABLE_SHELL}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className={TH_ROW}><tr>
                  <th className={TH}>Vaccine</th><th className={TH}>Disease targets</th><th className={TH}>Schedule / age</th>
                  <th className={TH}>Default dose</th><th className={TH}>Stock link</th><th className={cn(TH, 'text-center')}>Status</th><th className={cn(TH, 'text-right')}>Actions</th>
                </tr></thead>
                <tbody>
                  {filtered.map(v => <tr key={v.id} className={TR}>
                    <td className={TD}><div className="font-semibold text-[var(--text-primary)]">{v.name}</div><div className="mt-0.5 text-xs text-[var(--text-tertiary)]">{v.code}</div></td>
                    <td className={TD}><div className="max-w-[220px] text-xs text-[var(--text-secondary)]">{v.diseaseTargets?.length ? v.diseaseTargets.join(', ') : v.description || '—'}</div></td>
                    <td className={TD}><div className="text-xs text-[var(--text-primary)]">{v.recommendedAge || 'Age not specified'}</div><div className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">{v.doseSchedule ? (Array.isArray(v.doseSchedule) ? `${v.doseSchedule.length} schedule entries` : 'Schedule configured') : 'No schedule configured'}</div></td>
                    <td className={TD}><div className="text-xs text-[var(--text-primary)]">{v.defaultDoseVolume || '—'}</div><div className="text-[11px] text-[var(--text-tertiary)]">{v.defaultRoute || 'Route not set'}</div></td>
                    <td className={TD}>{v.StockItem ? <><div className="flex items-center gap-1 text-xs text-[var(--text-primary)]"><Link2 className="h-3 w-3 text-[var(--icon-green-text)]" />{v.StockItem.name}</div><div className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">{v.StockItem.drugCode} · {Number(v.StockItem.currentStock || 0).toLocaleString('en-GH')} on hand</div></> : <span className="text-xs text-[var(--text-tertiary)]">Not linked</span>}</td>
                    <td className={cn(TD, 'text-center')}><Badge tone={v.isActive ? 'success' : 'neutral'} dot size="sm">{v.isActive ? 'Active' : 'Inactive'}</Badge></td>
                    <td className={cn(TD, 'text-right')}><div className="inline-flex items-center gap-1.5"><Button size="sm" variant="outline" icon={Edit} onClick={() => openEdit(v)}>Edit</Button><Button size="sm" variant="ghost" icon={Power} disabled={saving} onClick={() => void toggleStatus(v)}>{v.isActive ? 'Deactivate' : 'Reactivate'}</Button></div></td>
                  </tr>)}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 sm:p-5" role="dialog" aria-modal="true" aria-labelledby="vaccine-form-title">
          <button type="button" className="absolute inset-0 cursor-default" aria-label="Close dialog" onClick={closeForm} />
          <form onSubmit={save} className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-main)] px-4 py-3 sm:px-5">
              <div><h2 id="vaccine-form-title" className="text-sm font-bold text-[var(--text-primary)]">{editing ? 'Edit vaccine' : 'Add vaccine'}</h2><p className="mt-0.5 text-xs text-[var(--text-tertiary)]">Catalogue details used in vaccination entries and reports</p></div>
              <button type="button" onClick={closeForm} className="rounded-lg p-2 text-[var(--text-tertiary)] hover:bg-[var(--border-color)]"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid flex-1 grid-cols-1 gap-3 overflow-y-auto p-4 sm:grid-cols-2 sm:p-5">
              <label className={labelClass}>Vaccine code *<input required maxLength={30} value={form.code} onChange={e => setForm(s => ({ ...s, code: e.target.value.toUpperCase() }))} className={inputClass} placeholder="e.g. BCG" /></label>
              <label className={labelClass}>Vaccine name *<input required value={form.name} onChange={e => setForm(s => ({ ...s, name: e.target.value }))} className={inputClass} placeholder="e.g. Bacillus Calmette–Guérin" /></label>
              <label className={cn(labelClass, 'sm:col-span-2')}>Description<input value={form.description} onChange={e => setForm(s => ({ ...s, description: e.target.value }))} className={inputClass} placeholder="Short description or clinical note" /></label>
              <label className={labelClass}>Disease targets<input value={form.diseaseTargets} onChange={e => setForm(s => ({ ...s, diseaseTargets: e.target.value }))} className={inputClass} placeholder="Tuberculosis, etc. (comma separated)" /></label>
              <label className={labelClass}>Recommended age<input value={form.recommendedAge} onChange={e => setForm(s => ({ ...s, recommendedAge: e.target.value }))} className={inputClass} placeholder="e.g. At birth" /></label>
              <label className={labelClass}>Default dose / volume<input value={form.defaultDoseVolume} onChange={e => setForm(s => ({ ...s, defaultDoseVolume: e.target.value }))} className={inputClass} placeholder="e.g. 0.05 mL" /></label>
              <label className={labelClass}>Default route<input value={form.defaultRoute} onChange={e => setForm(s => ({ ...s, defaultRoute: e.target.value }))} className={inputClass} placeholder="Oral, IM, SC, intradermal…" /></label>
              <label className={cn(labelClass, 'sm:col-span-2')}>Linked vaccine stock item
                <select value={form.stockItemId} onChange={e => setForm(s => ({ ...s, stockItemId: e.target.value }))} className={inputClass}>
                  <option value="">No stock link</option>
                  {stockItems.map(item => <option key={item.id} value={item.id}>{item.name} ({item.drugCode}) · {item.currentStock} {item.unitOfMeasure || 'units'} on hand</option>)}
                </select>
                <span className="block text-[11px] font-normal text-[var(--text-tertiary)]">Only active items in the Vaccine inventory category are available.</span>
              </label>
              <label className={cn(labelClass, 'sm:col-span-2')}>Dose schedule (JSON, optional)
                <textarea rows={4} value={form.doseSchedule} onChange={e => setForm(s => ({ ...s, doseSchedule: e.target.value }))} className={cn(inputClass, 'font-mono text-xs')} placeholder='[{"dose":"1","recommendedAge":"At birth"}]' />
                <span className="block text-[11px] font-normal text-[var(--text-tertiary)]">Leave blank if the approved schedule has not yet been configured. Enter valid JSON only.</span>
              </label>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--border-color)] bg-[var(--bg-main)] px-4 py-3">
              <Button type="button" variant="outline" onClick={closeForm}>Cancel</Button>
              <Button type="submit" icon={Save} loading={saving}>{editing ? 'Save Changes' : 'Add Vaccine'}</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
