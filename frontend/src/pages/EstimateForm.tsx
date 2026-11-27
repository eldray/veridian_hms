import { useSmartBack } from '../utils/useSmartBack';
// src/pages/EstimateForm.tsx - New / Edit estimate
// UI: the form IS the proforma invoice. Same wide paper sheet as EstimateDetails,
// same letterhead order, same totals box — what you type is what prints.
// All logic, validation, pricing tiers and server search unchanged.
import { type FormEvent, useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Plus, Save, Trash2, FileText, Search, X,
  User as UserIcon, Building2, ChevronDown, Check, Calendar, Percent, Receipt,
} from 'lucide-react';
import { getCorporateAccounts, getPatient, getPatients, getServiceCatalog, getTaxConfiguration } from '../api';
import { useEstimatesStore } from '../store/estimatesStore';
import { MAX_PICKER_ROWS } from '../components/reusable/PickerLimit';
import { useToast } from '../store/toastStore';
import { Button, cn, INPUT, PageHeader, SELECT } from '../components/ui';
import { computeLineTax, DEFAULT_TAX_CONFIGURATION, type TaxConfiguration } from '../utils/tax';
import { getPatientName } from '../utils/patient';

// ─────────────────────────────────────────────
// Types & helpers (unchanged)
// ─────────────────────────────────────────────

interface FormItem {
  id?: string;
  serviceCatalogId?: string;
  description: string;
  serviceType: string;
  quantity: number;
  unitPrice: number;
  pricingBasis: string;
  vatRate: number;
  isTaxable?: boolean;
  isInsuranceCovered: boolean;
  insuranceCoverage: number;
  tiers?: Record<string, number>;
}

const emptyItem = (): FormItem => ({
  description: '',
  serviceType: 'miscellaneous',
  quantity: 1,
  unitPrice: 0,
  pricingBasis: 'cash',
  vatRate: 0,
  isTaxable: false,
  isInsuranceCovered: false,
  insuranceCoverage: 0,
});

const PRICING_FIELD: Record<string, string> = {
  cash: 'cashPrice',
  nhis: 'nhisPrice',
  private_insurance: 'insurancePrice',
  corporate: 'corporatePrice',
};

const tiersOf = (pricing: any): Record<string, number> => {
  if (!pricing) return {};
  return Object.fromEntries(
    Object.entries(PRICING_FIELD).map(([basis, field]) => [basis, Number(pricing[field] || 0)]),
  );
};

const asArray = (response: any): any[] => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.services)) return response.services;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  return [];
};

const FIELD_LABEL = 'block text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5';
const ROW_LABEL = 'block text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1';

// ─────────────────────────────────────────────
// SearchableSelect — lightweight combobox (unchanged)
// ─────────────────────────────────────────────

interface SearchableOption {
  value: string;
  label: string;
  sublabel?: string;
  searchText?: string;
}

interface SearchableSelectProps {
  options: SearchableOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  required?: boolean;
  className?: string;
  onSearch?: (query: string) => void;
  loading?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options, value, onChange, placeholder = 'Search…', emptyLabel, disabled = false, icon, className = '', onSearch, loading = false,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!onSearch) return;
    const timer = setTimeout(() => onSearch(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query, onSearch]);

  const matches = useMemo(() => {
    if (onSearch) return options;
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((o) => (o.searchText ?? `${o.label} ${o.sublabel ?? ''}`).toLowerCase().includes(q));
  }, [options, query, onSearch]);
  const filtered = matches.slice(0, MAX_PICKER_ROWS);

  useEffect(() => {
    if (open) { setQuery(''); setHighlighted(0); setTimeout(() => inputRef.current?.focus(), 0); }
  }, [open]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted((h) => Math.min(h + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted((h) => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtered[highlighted]) { onChange(filtered[highlighted].value); setOpen(false); } }
    else if (e.key === 'Escape') setOpen(false);
  };
  const handleClear = (e: React.MouseEvent) => { e.stopPropagation(); onChange(''); setQuery(''); };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button" disabled={disabled} onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-2 px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-left text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] transition-all disabled:opacity-50 ${open ? 'ring-2 ring-[var(--icon-cyan-text)] border-[var(--icon-cyan-text)]' : ''}`}
      >
        {icon && <span className="flex-shrink-0 text-[var(--text-tertiary)]">{icon}</span>}
        <span className={`flex-1 truncate ${!selected ? 'text-[var(--text-tertiary)]' : ''}`}>{selected ? selected.label : (emptyLabel || placeholder)}</span>
        {selected && !disabled && (<span role="button" tabIndex={-1} onClick={handleClear} className="p-0.5 rounded hover:bg-[var(--border-color)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"><X className="w-3 h-3" /></span>)}
        <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 text-[var(--text-tertiary)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg shadow-lg overflow-hidden" style={{ boxShadow: 'var(--shadow-md)' }}>
          <div className="relative border-b border-[var(--border-color)]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)]" />
            <input ref={inputRef} type="text" value={query} onChange={(e) => { setQuery(e.target.value); setHighlighted(0); }} onKeyDown={handleKeyDown} placeholder="Type to search…" className="w-full pl-9 pr-3 py-2 bg-[var(--bg-main)] text-sm text-[var(--text-primary)] outline-none placeholder-[var(--text-tertiary)]" />
          </div>
          <div className="max-h-60 overflow-y-auto py-1" style={{ scrollbarWidth: 'thin' }}>
            {loading && (<div className="px-3 py-1.5 text-center text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">Searching…</div>)}
            {!loading && filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-[var(--text-tertiary)]">No matches</div>
            ) : (
              <>
                {filtered.map((opt, idx) => {
                  const isSelected = opt.value === value;
                  const isHighlighted = idx === highlighted;
                  return (
                    <button key={opt.value} type="button" onMouseEnter={() => setHighlighted(idx)} onClick={() => { onChange(opt.value); setOpen(false); }} className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${isHighlighted ? 'bg-[var(--bg-main)]' : ''}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[var(--text-primary)] truncate">{opt.label}</p>
                        {opt.sublabel && (<p className="text-[10px] text-[var(--text-tertiary)] truncate">{opt.sublabel}</p>)}
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[var(--icon-cyan-text)] flex-shrink-0" />}
                    </button>
                  );
                })}
                {matches.length > filtered.length && (<div className="px-3 py-1.5 text-center text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">Showing {filtered.length} of {matches.length} &mdash; keep typing</div>)}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────

export default function EstimateForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const goBack = useSmartBack('/dashboard/estimates');
  const location = useLocation();
  const editing = Boolean(id);
  const { error: toastError, success } = useToast();
  const { currentEstimate, loadEstimate, createEstimate, updateEstimate } = useEstimatesStore();
  const carriedPatient = (location.state as any)?.patient ?? null;

  const [patientChoices, setPatientChoices] = useState<any[]>([]);
  const [chosenPatient, setChosenPatient] = useState<any | null>(carriedPatient);
  const [patientSearching, setPatientSearching] = useState(false);
  const [patientSearchBlocked, setPatientSearchBlocked] = useState(false);
  const [services, setServices] = useState<any[]>([]);
  const [taxConfig, setTaxConfig] = useState<TaxConfiguration>(DEFAULT_TAX_CONFIGURATION);
  const [corporateAccounts, setCorporateAccounts] = useState<any[]>([]);
  const [patientId, setPatientId] = useState<string>(carriedPatient?.id || '');
  const [corporateAccountId, setCorporateAccountId] = useState('');
  const [items, setItems] = useState<FormItem[]>([]);
  // The single input row above the table. Lines are only added to the table when Add is pressed.
  const [draft, setDraft] = useState<FormItem>(() => emptyItem());
  const [discount, setDiscount] = useState(0);
  const [validityDays, setValidityDays] = useState(7);
  // Pricing basis is set ONCE for the whole estimate — every line follows it.
  // A quote is either cash, NHIS, private insurance or corporate, never a mix.
  const [pricingBasis, setPricingBasis] = useState('cash');
  const [notes, setNotes] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const searchPatients = useCallback(async (query: string) => {
    setPatientSearching(true);
    try {
      const response = await getPatients(query ? { search: query, limit: 25 } : { limit: 25 });
      setPatientChoices(asArray(response));
      setPatientSearchBlocked(false);
    } catch (err: any) {
      setPatientSearchBlocked(err?.response?.status === 403);
    } finally { setPatientSearching(false); }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadOptions = async () => {
      setIsLoading(true);
      if (id) {
        try { await loadEstimate(id); } catch (e: any) { toastError('Load failed', e?.response?.data?.message || e.message); }
      }
      setIsLoading(false);
      setOptionsLoading(true);
      try {
        const [serviceResponse, corporateResponse] = await Promise.all([
          getServiceCatalog({ isActive: true, limit: 5000, page: 1 }),
          getCorporateAccounts({ isActive: true, limit: 1000, page: 1 }),
          searchPatients(''),
        ]);
        if (cancelled) return;
        setServices(asArray(serviceResponse));
        setCorporateAccounts(asArray(corporateResponse));
      } catch (e: any) {
        if (!cancelled) toastError('Load failed', e?.response?.data?.message || e.message);
      } finally { if (!cancelled) setOptionsLoading(false); }
    };
    loadOptions();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    // The preview must use the same regime the server will charge with; if the
    // endpoint is unavailable the estimate simply previews without tax.
    getTaxConfiguration()
      .then((config) => { if (!cancelled) setTaxConfig(config || DEFAULT_TAX_CONFIGURATION); })
      .catch(() => { /* preview stays exempt */ });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!patientId) { setChosenPatient(null); return; }
    if (chosenPatient?.id === patientId) return;
    if (currentEstimate?.patient?.id === patientId) { setChosenPatient(currentEstimate.patient); return; }
    const inList = patientChoices.find((p: any) => p.id === patientId);
    if (inList) { setChosenPatient(inList); return; }
    let isCurrent = true;
    getPatient(patientId)
      .then((response: any) => {
        const found = response?.patient || response?.data?.patient || response?.data || response;
        if (isCurrent && found?.id) setChosenPatient(found);
      })
      .catch(() => { /* label falls back to blank */ });
    return () => { isCurrent = false; };
  }, [patientId, patientChoices, chosenPatient?.id, currentEstimate]);

  useEffect(() => {
    if (!currentEstimate || currentEstimate.id !== id) return;
    setPatientId(currentEstimate.patientId);
    setCorporateAccountId(currentEstimate.corporateAccountId || '');
    setDiscount(Number(currentEstimate.discount || 0));
    setPricingBasis(currentEstimate.items?.[0]?.pricingBasis || 'cash');
    setValidityDays(currentEstimate.validityDays || 7);
    setNotes(currentEstimate.notes || '');
    setTermsAndConditions(currentEstimate.termsAndConditions || '');
    setItems(
      (currentEstimate.items || []).map((item) => ({
        id: item.id,
        serviceCatalogId: item.serviceCatalog?.id,
        description: item.description,
        serviceType: item.serviceType,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice || 0),
        pricingBasis: item.pricingBasis || 'cash',
        // Stored vatRate is the effective rate that was quoted; a line that carried
        // tax is previewed as taxable so an edit does not silently drop it.
        vatRate: Number(item.vatRate || 0),
        isTaxable: Number(item.vatAmount || 0) > 0,
        isInsuranceCovered: item.isInsuranceCovered,
        insuranceCoverage: Number(item.insuranceCoverage || 0),
      })),
    );
  }, [currentEstimate, id]);

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0), [items]);

  // Preview with the same engine the server uses: opt-in per line, per payer type,
  // charged on the patient's share. An item-level rate replaces the facility mix.
  const lineTax = useCallback((item: FormItem) => {
    const gross = item.quantity * item.unitPrice;
    const patientShare = item.isInsuranceCovered ? gross - Number(item.insuranceCoverage || 0) : gross;
    return computeLineTax(
      Math.max(0, patientShare),
      { isTaxable: item.isTaxable === true, overrideRate: item.vatRate },
      taxConfig,
      item.pricingBasis || pricingBasis,
    );
  }, [taxConfig, pricingBasis]);

  const tax = useMemo(() => items.reduce((sum, item) => sum + lineTax(item).total, 0), [items, lineTax]);
  const total = subtotal + tax - discount;
  const lineTotal = (item: FormItem) => item.quantity * item.unitPrice + lineTax(item).total;

  const toPatientOption = (p: any): SearchableOption => ({
    value: p.id,
    label: getPatientName(p) || p.folderNumber || p.id,
    sublabel: `${p.folderNumber || ''}${p.contact ? ` · ${p.contact}` : ''}`,
  });

  const patientOptions: SearchableOption[] = useMemo(() => {
    const list = patientChoices.map(toPatientOption);
    if (chosenPatient && !list.some((o) => o.value === chosenPatient.id)) list.unshift(toPatientOption(chosenPatient));
    return list;
  }, [patientChoices, chosenPatient]);

  const corporateOptions: SearchableOption[] = useMemo(
    () => corporateAccounts.map((a) => ({
      value: a.id, label: a.companyName,
      sublabel: a.companyCode ? `Code: ${a.companyCode}` : undefined,
      searchText: `${a.companyName || ''} ${a.companyCode || ''} ${a.registrationNumber || ''}`,
    })),
    [corporateAccounts],
  );

  const serviceOptions: SearchableOption[] = useMemo(() => {
    const options = services.map((s) => ({
      value: s.id, label: s.name,
      sublabel: `${s.code} · ${s.serviceType || 'service'}`,
      searchText: `${s.name || ''} ${s.code || ''} ${s.serviceType || ''}`,
    }));
    const seen = new Set(options.map((o) => o.value));
    (currentEstimate?.items || []).forEach((item: any) => {
      const svc = item.serviceCatalog;
      if (!svc?.id || seen.has(svc.id)) return;
      seen.add(svc.id);
      options.push({ value: svc.id, label: svc.name || item.description || svc.id, sublabel: `${svc.code || ''} · ${svc.serviceType || 'service'}`, searchText: `${svc.name || ''} ${svc.code || ''}` });
    });
    return options;
  }, [services, currentEstimate]);

  const updateDraft = (patch: Partial<FormItem>) => setDraft((d) => ({ ...d, ...patch }));

  // Picking a service fills the draft (description + price from the global basis + catalog VAT).
  const selectDraftService = (serviceId: string) => {
    if (!serviceId) { updateDraft({ serviceCatalogId: undefined, tiers: undefined }); return; }
    const service = services.find((candidate) => candidate.id === serviceId);
    if (!service) { updateDraft({ serviceCatalogId: undefined, tiers: undefined }); return; }
    const pricing = Array.isArray(service.pricing) ? service.pricing[0] : service.pricing;
    const tiers = tiersOf(pricing);
    updateDraft({
      serviceCatalogId: service.id,
      description: service.name || '',
      serviceType: service.serviceType || 'miscellaneous',
      unitPrice: tiers[pricingBasis] ?? 0,
      vatRate: Number(pricing?.vatRate || 0),
      isTaxable: pricing?.isTaxable === true,
      tiers,
    });
  };

  // Add logs the draft beneath in the table, then clears the row for the next line.
  const addDraftItem = () => {
    if (!draft.description.trim() || !(draft.quantity > 0)) {
      toastError('Validation failed', 'Pick a service (or type a description) and a quantity, then Add Item.');
      return;
    }
    setItems((current) => [...current, { ...draft, pricingBasis }]);
    setDraft(emptyItem());
  };

  const removeItem = (index: number) => setItems((current) => current.filter((_, i) => i !== index));


  // Switching the basis re-prices every catalog line from its own tiers.
  // Custom lines (no tiers) keep their hand-typed price, only the basis label changes.
  const setGlobalPricingBasis = (basis: string) => {
    setPricingBasis(basis);
    setItems((current) =>
      current.map((item) => {
        if (item.tiers && item.tiers[basis] !== undefined) return { ...item, pricingBasis: basis, unitPrice: item.tiers[basis] };
        return { ...item, pricingBasis: basis };
      }),
    );
    // The input row follows the basis too, so the next line prices correctly.
    setDraft((d) => (d.tiers && d.tiers[basis] !== undefined ? { ...d, pricingBasis: basis, unitPrice: d.tiers[basis] } : { ...d, pricingBasis: basis }));
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const validItems = items.filter((item) => item.description.trim() && item.quantity > 0); // only Added lines count — an unfinished input row is not a line
    if (!validItems.length) return toastError('Validation failed', 'Add at least one line item.');
    setIsSaving(true);
    try {
      const payload = {
        patientId: patientId || null,
        corporateAccountId: corporateAccountId || undefined,
        discount: Math.max(0, discount),
        validityDays: Math.max(1, validityDays),
        notes: notes || undefined,
        termsAndConditions: termsAndConditions || undefined,
        items: validItems.map((line) => ({
          id: editing ? line.id : undefined,
          serviceCatalogId: line.serviceCatalogId,
          description: line.description,
          serviceType: line.serviceType,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          pricingBasis, // one basis for the whole estimate
          vatRate: line.vatRate,
          isTaxable: line.isTaxable === true,
          isInsuranceCovered: line.isInsuranceCovered,
          insuranceCoverage: line.insuranceCoverage,
        })),
      };
      const saved = editing ? await updateEstimate(id!, payload) : await createEstimate(payload);
      success(editing ? 'Estimate updated' : 'Estimate created');
      navigate(`/dashboard/estimates/${saved.id}`);
    } catch (e: any) {
      toastError('Save failed', e?.response?.data?.message || e.message);
    } finally { setIsSaving(false); }
  };

  if (isLoading) {
    return (
      <div className="p-6 text-[var(--text-primary)]">
        <PageHeader title={editing ? 'Edit Estimate' : 'New Estimate'} subtitle="Create a draft proforma invoice from priced services." icon={FileText} accent="cyan" backTo="/dashboard/estimates" />
        <div className="p-6 text-center text-sm text-[var(--text-secondary)]">Loading estimate form…</div>
      </div>
    );
  }

  return (
    <form onSubmit={save} className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)]">
      <div className="p-4 md:p-6 pb-0">
        <PageHeader
          title={editing ? 'Edit Estimate' : 'New Estimate'}
          subtitle="Create a draft proforma invoice from priced services."
          icon={FileText} accent="cyan" backTo="/dashboard/estimates"
          actions={(
            <>
              <Button type="button" variant="secondary" onClick={goBack}>Cancel</Button>
              <Button type="submit" variant="primary" icon={Save} disabled={isSaving}>{isSaving ? 'Saving…' : 'Save Draft'}</Button>
            </>
          )}
        />
      </div>

      {/* ── THE PAGE — wide invoice sheet, same shape as EstimateDetails ── */}
      <div className="px-4 md:px-6 py-6 w-full">
        <div className="w-full bg-[var(--bg-card)] rounded-lg shadow-xl px-6 md:px-10 lg:px-14 py-10 md:py-12 min-h-[900px] flex flex-col">
          {/* Letterhead row: title on left, live total on right */}
          <div className="flex justify-between items-start gap-6 pb-6 border-b-[3px] border-[var(--icon-cyan-text)]">
            <div>
              <p className="text-[15px] font-bold tracking-[3px] uppercase" style={{ color: 'var(--icon-cyan-text)' }}>Proforma Invoice</p>
              <p className="text-sm text-[var(--text-secondary)] mt-1.5">{editing ? 'Editing a draft — changes are not sent until you save.' : 'Draft — not sent yet. Save it, then send it from the details page.'}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[11px] tracking-[2px] text-[var(--text-tertiary)]">TOTAL (ESTIMATE)</p>
              <p className="text-2xl font-bold mt-1">GHS {total.toFixed(2)}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{items.length} item{items.length === 1 ? '' : 's'}</p>
            </div>
          </div>

          {/* Bill-to / validity / discount — invoice header fields, not a settings card */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5 py-7 border-b border-[var(--border-color)]">
            <div className="lg:col-span-2">
              <label className={FIELD_LABEL}><UserIcon className="w-3.5 h-3.5 inline mr-1 -mt-0.5" /> Bill to — Patient (optional)</label>
              <SearchableSelect options={patientOptions} value={patientId} onChange={setPatientId} onSearch={searchPatients} loading={patientSearching} placeholder="Search patients by name, folder, or phone…" emptyLabel="Walk-in client" icon={<UserIcon className="w-3.5 h-3.5" />} />
              {chosenPatient && (<p className="mt-1.5 text-xs text-[var(--text-secondary)]">Folder: {chosenPatient.folderNumber || '—'}{chosenPatient.contact ? ` · ${chosenPatient.contact}` : ''}</p>)}
              {patientSearchBlocked && (<p className="mt-1.5 text-xs text-[var(--text-tertiary)]">Your role cannot search the patient register. Leave blank to quote a walk-in client, or pick the patient from the visit list.</p>)}
            </div>
            <div>
              <label className={FIELD_LABEL}><Building2 className="w-3.5 h-3.5 inline mr-1 -mt-0.5" /> Corporate Account (optional)</label>
              <SearchableSelect options={corporateOptions} value={corporateAccountId} onChange={setCorporateAccountId} loading={optionsLoading} placeholder="Search corporate accounts…" emptyLabel="No corporate account" icon={<Building2 className="w-3.5 h-3.5" />} />
            </div>
            <div>
              <label className={FIELD_LABEL}>Pricing basis — whole estimate</label>
              <select value={pricingBasis} onChange={(e) => setGlobalPricingBasis(e.target.value)} className={cn(SELECT, 'w-full')}>
                <option value="cash">Cash</option><option value="nhis">NHIS</option><option value="private_insurance">Private Insurance</option><option value="corporate">Corporate</option>
              </select>
              <p className="mt-1.5 text-xs text-[var(--text-tertiary)]">Every line follows this. Switching it re-prices catalog lines.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={FIELD_LABEL}><Calendar className="w-3.5 h-3.5 inline mr-1 -mt-0.5" /> Validity</label>
                <div className="flex items-center gap-2"><input type="number" min="1" value={validityDays} onChange={(e) => setValidityDays(Number(e.target.value))} className={cn(INPUT, 'w-full')} /><span className="text-xs text-[var(--text-tertiary)] shrink-0">days</span></div>
              </div>
              <div>
                <label className={FIELD_LABEL}><Percent className="w-3.5 h-3.5 inline mr-1 -mt-0.5" /> Discount</label>
                <div className="flex items-center gap-2"><span className="text-xs text-[var(--text-tertiary)]">GHS</span><input type="number" min="0" step="0.01" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className={cn(INPUT, 'w-full')} /></div>
              </div>
            </div>
          </div>

          {/* Line items — ONE input row on top, added lines log beneath in a simple table */}
          <div className="pt-7 flex-1">
            <h3 className="text-[11px] font-semibold tracking-[2px] text-[var(--text-tertiary)] flex items-center gap-2 mb-3"><Receipt className="w-3.5 h-3.5" /> LINE ITEMS</h3>

            {/* ── Input row: fill it, press Add Item, it logs below ── */}
            <div className="grid gap-2 md:grid-cols-[2.2fr_70px_120px_110px] items-end bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl p-3">
              <div>
                <label className={ROW_LABEL}>Service</label>
                <SearchableSelect options={serviceOptions} value={draft.serviceCatalogId || ''} onChange={selectDraftService} loading={optionsLoading} placeholder="Search services…" emptyLabel="Custom description" />
                <input value={draft.description} onChange={(e) => updateDraft({ description: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDraftItem(); } }} className={cn(INPUT, 'w-full mt-1.5')} placeholder="Description" />
              </div>
              <div>
                <label className={ROW_LABEL}>Qty</label>
                <input type="number" min="1" value={draft.quantity} onChange={(e) => updateDraft({ quantity: Number(e.target.value) })} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDraftItem(); } }} className={cn(INPUT, 'w-full text-center')} />
              </div>
              <div>
                <label className={ROW_LABEL}>Unit Price (GHS)</label>
                <input type="number" min="0" step="0.01" value={draft.unitPrice} onChange={(e) => updateDraft({ unitPrice: Number(e.target.value) })} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDraftItem(); } }} className={cn(INPUT, 'w-full text-right')} />
              </div>
              <Button type="button" variant="primary" icon={Plus} onClick={addDraftItem} className="w-full justify-center">Add Item</Button>
            </div>
            <p className="mt-2 text-xs text-[var(--text-tertiary)]">Pick a service — price and VAT come from the catalog. Press <span className="font-medium text-[var(--text-secondary)]">Add Item</span> (or Enter) and the line logs in the table below.</p>

            {/* ── Logged lines: simple read-only table ── */}
            <table className="w-full text-sm mt-5">
              <thead>
                <tr className="bg-[var(--bg-main)]">
                  <th className="text-left font-semibold px-3 py-3 border-b-2 border-[var(--border-color)]">#</th>
                  <th className="text-left font-semibold px-3 py-3 border-b-2 border-[var(--border-color)]">Description</th>
                  <th className="text-center font-semibold px-3 py-3 border-b-2 border-[var(--border-color)]">Qty</th>
                  <th className="text-right font-semibold px-3 py-3 border-b-2 border-[var(--border-color)]">Unit (GHS)</th>
                  <th className="text-right font-semibold px-3 py-3 border-b-2 border-[var(--border-color)]">Line total</th>
                  <th className="border-b-2 border-[var(--border-color)]"><span className="sr-only">Remove</span></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={item.id || index} className="border-b border-[var(--border-color)]">
                    <td className="px-3 py-3 text-[var(--text-tertiary)]">{index + 1}</td>
                    <td className="px-3 py-3 font-medium">{item.description}</td>
                    <td className="px-3 py-3 text-center">{item.quantity}</td>
                    <td className="px-3 py-3 text-right">GHS {item.unitPrice.toFixed(2)}</td>
                    <td className="px-3 py-3 text-right font-semibold">GHS {lineTotal(item).toFixed(2)}</td>
                    <td className="px-3 py-3 text-right">
                      <Button type="button" variant="ghost" iconOnly icon={Trash2} aria-label={`Remove ${item.description}`} className="text-[var(--icon-red-text)]" onClick={() => removeItem(index)} />
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-8 text-center text-[var(--text-tertiary)]">No items yet — add your first line above.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals + notes — same split as the details page */}
          <div className="flex flex-col md:flex-row justify-between gap-8 mt-8">
            <div className="grid gap-5 sm:grid-cols-2 flex-1 max-w-[560px]">
              <div>
                <label className={FIELD_LABEL}>Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything the client should know…" className={cn(INPUT, 'w-full resize-none min-h-24')} />
              </div>
              <div>
                <label className={FIELD_LABEL}>Terms and Conditions</label>
                <textarea value={termsAndConditions} onChange={(e) => setTermsAndConditions(e.target.value)} placeholder="Payment, validity, exclusions…" className={cn(INPUT, 'w-full resize-none min-h-24')} />
              </div>
            </div>
            <div className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl p-4 space-y-2 text-sm w-full md:w-[340px] shrink-0 h-fit">
              <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Subtotal</span><span>GHS {subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-[var(--text-secondary)]">VAT &amp; levies</span><span>GHS {tax.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Discount</span><span className={discount > 0 ? 'text-[var(--icon-red-text)]' : ''}>- GHS {discount.toFixed(2)}</span></div>
              <div className="flex justify-between border-t-2 border-[var(--border-color)] pt-2.5 text-base font-bold"><span>Total (estimate)</span><span>GHS {total.toFixed(2)}</span></div>
              <p className="text-xs text-[var(--text-tertiary)] text-right pt-1">Valid for {validityDays} day{validityDays === 1 ? '' : 's'}</p>
            </div>
          </div>

          {/* Bottom save bar — same actions as the header, reachable without scrolling back up */}
          <div className="flex justify-end gap-2 mt-10 pt-5 border-t border-[var(--border-color)]">
            <Button type="button" variant="secondary" onClick={goBack}>Cancel</Button>
            <Button type="submit" variant="primary" icon={Save} disabled={isSaving}>{isSaving ? 'Saving…' : 'Save Draft'}</Button>
          </div>
        </div>
      </div>
    </form>
  );
}
