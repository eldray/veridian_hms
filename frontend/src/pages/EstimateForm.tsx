// src/pages/EstimateForm.tsx
import { type FormEvent, useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Plus, Save, Trash2, FileText, Search, X,
  User as UserIcon, Building2, ChevronDown, Check,
} from 'lucide-react';
import { getCorporateAccounts, getPatient, getPatients, getServiceCatalog } from '../api';
import { useEstimatesStore } from '../store/estimatesStore';
import { MAX_PICKER_ROWS } from '../components/reusable/PickerLimit';
import { useToast } from '../store/toastStore';

// ─────────────────────────────────────────────
// Types & helpers
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
  isInsuranceCovered: boolean;
  insuranceCoverage: number;
  // Catalog prices per payment mode, kept on the row so switching the basis can
  // re-price it. UI-only — never sent to the API.
  tiers?: Record<string, number>;
}

const emptyItem = (): FormItem => ({
  description: '',
  serviceType: 'miscellaneous',
  quantity: 1,
  unitPrice: 0,
  pricingBasis: 'cash',
  vatRate: 0,
  isInsuranceCovered: false,
  insuranceCoverage: 0,
});

// Which catalog column prices a line depends on the basis it is quoted on. The
// pricing row the catalog list returns is the newest active one and carries all four.
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

// ─────────────────────────────────────────────
// SearchableSelect — lightweight combobox
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
  // When set, the list is searched by the server as the user types, so the page can offer
  // a whole register without downloading it. `options` is then whatever the last search returned.
  onSearch?: (query: string) => void;
  loading?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Search…',
  emptyLabel,
  disabled = false,
  icon,
  className = '',
  onSearch,
  loading = false,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);

  // Ask the server after a short pause so typing does not queue a request per keystroke.
  useEffect(() => {
    if (!onSearch) return;
    const timer = setTimeout(() => onSearch(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query, onSearch]);

  // Filter by query
  const matches = useMemo(() => {
    if (onSearch) return options; // the server already narrowed the list
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((o) => {
      const hay = (o.searchText ?? `${o.label} ${o.sublabel ?? ''}`).toLowerCase();
      return hay.includes(q);
    });
  }, [options, query, onSearch]);

  // Only the first rows are rendered: a 5,000-item catalogue turned the open dropdown,
  // and every keystroke in it, into thousands of buttons and stalled the renderer.
  const filtered = matches.slice(0, MAX_PICKER_ROWS);

  // Reset query and highlighted when dropdown opens
  useEffect(() => {
    if (open) {
      setQuery('');
      setHighlighted(0);
      // Focus the input after a tick so we can start typing immediately
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlighted]) {
        onChange(filtered[highlighted].value);
        setOpen(false);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setQuery('');
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-2 px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-left text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] transition-all disabled:opacity-50 ${
          open ? 'ring-2 ring-[var(--icon-cyan-text)] border-[var(--icon-cyan-text)]' : ''
        }`}
      >
        {icon && <span className="flex-shrink-0 text-[var(--text-tertiary)]">{icon}</span>}
        <span className={`flex-1 truncate ${!selected ? 'text-[var(--text-tertiary)]' : ''}`}>
          {selected ? selected.label : (emptyLabel || placeholder)}
        </span>
        {selected && !disabled && (
          <span
            role="button"
            tabIndex={-1}
            onClick={handleClear}
            className="p-0.5 rounded hover:bg-[var(--border-color)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          >
            <X className="w-3 h-3" />
          </span>
        )}
        <ChevronDown
          className={`w-3.5 h-3.5 flex-shrink-0 text-[var(--text-tertiary)] transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div
          className="absolute z-30 mt-1 w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg shadow-lg overflow-hidden"
          style={{ boxShadow: 'var(--shadow-md)' }}
        >
          <div className="relative border-b border-[var(--border-color)]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)]" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlighted(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Type to search…"
              className="w-full pl-9 pr-3 py-2 bg-[var(--bg-main)] text-sm text-[var(--text-primary)] outline-none placeholder-[var(--text-tertiary)]"
            />
          </div>

          <div className="max-h-60 overflow-y-auto py-1" style={{ scrollbarWidth: 'thin' }}>
            {loading && (
              <div className="px-3 py-1.5 text-center text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">
                Searching…
              </div>
            )}
            {!loading && filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-[var(--text-tertiary)]">
                No matches
              </div>
            ) : (
              <>
              {filtered.map((opt, idx) => {
                const isSelected = opt.value === value;
                const isHighlighted = idx === highlighted;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onMouseEnter={() => setHighlighted(idx)}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                      isHighlighted ? 'bg-[var(--bg-main)]' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[var(--text-primary)] truncate">{opt.label}</p>
                      {opt.sublabel && (
                        <p className="text-[10px] text-[var(--text-tertiary)] truncate">{opt.sublabel}</p>
                      )}
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[var(--icon-cyan-text)] flex-shrink-0" />}
                  </button>
                );
              })}
              {matches.length > filtered.length && (
                <div className="px-3 py-1.5 text-center text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">
                  Showing {filtered.length} of {matches.length} &mdash; keep typing
                </div>
              )}
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
  const location = useLocation();
  const editing = Boolean(id);
  const { error: toastError, success } = useToast();
  const { currentEstimate, loadEstimate, createEstimate, updateEstimate } = useEstimatesStore();

  // Arriving from a visit carries its patient, so the form can label the line without
  // a register search — which the roles that own Estimates are not allowed to make.
  const carriedPatient = (location.state as any)?.patient ?? null;

  // The patient picker is searched on the server (25 rows per keystroke pause) instead of
  // pulling the whole register into the shared store before the form is usable.
  const [patientChoices, setPatientChoices] = useState<any[]>([]);
  const [chosenPatient, setChosenPatient] = useState<any | null>(carriedPatient);
  const [patientSearching, setPatientSearching] = useState(false);
  const [patientSearchBlocked, setPatientSearchBlocked] = useState(false);
  const [services, setServices] = useState<any[]>([]);
  const [corporateAccounts, setCorporateAccounts] = useState<any[]>([]);
  const [patientId, setPatientId] = useState<string>(carriedPatient?.id || '');
  const [corporateAccountId, setCorporateAccountId] = useState('');
  const [items, setItems] = useState<FormItem[]>([emptyItem()]);
  const [discount, setDiscount] = useState(0);
  const [validityDays, setValidityDays] = useState(7);
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
      // A 403 here is the patient register guard, not a network problem — say so
      // instead of leaving an empty dropdown that looks like "no patients exist".
      setPatientSearchBlocked(err?.response?.status === 403);
    } finally {
      setPatientSearching(false);
    }
  }, []);

  // ── Load options once per id ─────────────────
  // NOTE: dependency is [id] ONLY. loadEstimate / toastError come from
  // Zustand stores and are not guaranteed to be reference-stable, so
  // including them caused an infinite refresh loop.
  useEffect(() => {
    let cancelled = false;
    const loadOptions = async () => {
      setIsLoading(true);
      // Only the saved estimate needs to block the form; without an id there is nothing to wait for.
      if (id) {
        try {
          await loadEstimate(id);
        } catch (e: any) {
          toastError('Load failed', e?.response?.data?.message || e.message);
        }
      }
      setIsLoading(false);

      // The backend returns at most 100 rows per request, so these calls walk every page.
      // They only fill the pickers, so they stream in behind the form instead of holding
      // the whole screen still while the service catalog is paged through.
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
      } finally {
        if (!cancelled) setOptionsLoading(false);
      }
    };
    loadOptions();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // A patient chosen from the search list is already labelled; one restored from a saved
  // estimate arrives inside that estimate, and only otherwise needs its own request — a
  // role without register access can still see the client its own quote belongs to.
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

  // ── Hydrate form when editing ────────────────
  useEffect(() => {
    if (!currentEstimate || currentEstimate.id !== id) return;
    setPatientId(currentEstimate.patientId);
    setCorporateAccountId(currentEstimate.corporateAccountId || '');
    setDiscount(Number(currentEstimate.discount || 0));
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
        vatRate: Number(item.vatRate || 0),
        isInsuranceCovered: item.isInsuranceCovered,
        insuranceCoverage: Number(item.insuranceCoverage || 0),
      })),
    );
  }, [currentEstimate, id]);

  // ── Derived totals ───────────────────────────
  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [items],
  );
  const tax = useMemo(
    () => items.reduce((sum, item) => sum + (item.quantity * item.unitPrice * item.vatRate) / 100, 0),
    [items],
  );
  const total = subtotal + tax - discount;

  // ── Option lists ─────────────────────────────
  const toPatientOption = (p: any): SearchableOption => ({
    value: p.id,
    label: `${p.surname || ''} ${p.otherNames || ''}`.trim() || p.folderNumber || p.id,
    sublabel: `${p.folderNumber || ''}${p.contact ? ` · ${p.contact}` : ''}`,
  });

  const patientOptions: SearchableOption[] = useMemo(() => {
    const list = patientChoices.map(toPatientOption);
    if (chosenPatient && !list.some((o) => o.value === chosenPatient.id)) {
      list.unshift(toPatientOption(chosenPatient));
    }
    return list;
  }, [patientChoices, chosenPatient]);

  const corporateOptions: SearchableOption[] = useMemo(
    () =>
      corporateAccounts.map((a) => ({
        value: a.id,
        label: a.companyName,
        sublabel: a.companyCode ? `Code: ${a.companyCode}` : undefined,
        searchText: `${a.companyName || ''} ${a.companyCode || ''} ${a.registrationNumber || ''}`,
      })),
    [corporateAccounts],
  );

  const serviceOptions: SearchableOption[] = useMemo(() => {
    const options = services.map((s) => ({
      value: s.id,
      label: s.name,
      sublabel: `${s.code} · ${s.serviceType || 'service'}`,
      searchText: `${s.name || ''} ${s.code || ''} ${s.serviceType || ''}`,
    }));
    const seen = new Set(options.map((o) => o.value));
    // Label the services already billed on this estimate straight away: the catalog
    // streams in behind the form, and an unlabelled row reads as a lost line item.
    (currentEstimate?.items || []).forEach((item: any) => {
      const svc = item.serviceCatalog;
      if (!svc?.id || seen.has(svc.id)) return;
      seen.add(svc.id);
      options.push({
        value: svc.id,
        label: svc.name || item.description || svc.id,
        sublabel: `${svc.code || ''} · ${svc.serviceType || 'service'}`,
        searchText: `${svc.name || ''} ${svc.code || ''}`,
      });
    });
    return options;
  }, [services, currentEstimate]);

  // ── Item helpers ─────────────────────────────
  const updateItem = (index: number, patch: Partial<FormItem>) => {
    setItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    );
  };

  const selectService = (index: number, serviceId: string) => {
    if (!serviceId) {
      updateItem(index, { serviceCatalogId: undefined, tiers: undefined });
      return;
    }
    const service = services.find((candidate) => candidate.id === serviceId);
    if (!service) {
      updateItem(index, { serviceCatalogId: undefined, tiers: undefined });
      return;
    }
    const pricing = Array.isArray(service.pricing) ? service.pricing[0] : service.pricing;
    const tiers = tiersOf(pricing);
    updateItem(index, {
      serviceCatalogId: service.id,
      description: service.name || '',
      serviceType: service.serviceType || 'miscellaneous',
      unitPrice: tiers[items[index]?.pricingBasis || 'cash'] ?? 0,
      vatRate: Number(pricing?.vatRate || 0),
      tiers,
    });
  };

  // The same service carries a different tariff per payment mode, so switching the
  // basis on a catalog line re-prices it rather than leaving the cash figure there.
  const setPricingBasis = (index: number, basis: string) => {
    const tiers = items[index]?.tiers;
    if (tiers && tiers[basis] !== undefined) updateItem(index, { pricingBasis: basis, unitPrice: tiers[basis] });
    else updateItem(index, { pricingBasis: basis });
  };

  // ── Save ─────────────────────────────────────
  const save = async (event: FormEvent) => {
    event.preventDefault();
    const validItems = items.filter((item) => item.description.trim() && item.quantity > 0);
    if (!validItems.length) return toastError('Validation failed', 'Add at least one line item.');

    setIsSaving(true);
    try {
      const payload = {
        // Blank means a walk-in client who is not on the register yet.
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
          pricingBasis: line.pricingBasis,
          vatRate: line.vatRate,
          isInsuranceCovered: line.isInsuranceCovered,
          insuranceCoverage: line.insuranceCoverage,
        })),
      };
      const saved = editing
        ? await updateEstimate(id!, payload)
        : await createEstimate(payload);
      success(editing ? 'Estimate updated' : 'Estimate created');
      navigate(`/dashboard/estimates/${saved.id}`);
    } catch (e: any) {
      toastError('Save failed', e?.response?.data?.message || e.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-10 text-center text-sm text-[var(--text-secondary)]">
        Loading estimate form…
      </div>
    );
  }

  const inputClass =
    'mt-1 w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] transition-all';

  return (
    <form onSubmit={save} className="space-y-6 p-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard/estimates')}
            className="p-2 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-card)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
          <div className="w-10 h-10 rounded-xl bg-[var(--icon-cyan-bg)] flex items-center justify-center">
            <FileText className="w-5 h-5 text-[var(--icon-cyan-text)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              {editing ? 'Edit Estimate' : 'New Estimate'}
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Create a draft proforma invoice from priced services.
            </p>
          </div>
        </div>
        <button
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving…' : 'Save Draft'}
        </button>
      </div>

      {/* ── Header card: patient, corporate, validity, discount ── */}
      <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5 grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
            <UserIcon className="w-3.5 h-3.5 inline mr-1" /> Patient (optional)
          </label>
          <SearchableSelect
            options={patientOptions}
            value={patientId}
            onChange={setPatientId}
            onSearch={searchPatients}
            loading={patientSearching}
            placeholder="Search patients by name, folder, or phone…"
            emptyLabel="Walk-in client"
            icon={<UserIcon className="w-3.5 h-3.5" />}
          />
          {patientSearchBlocked && (
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">
              Your role cannot search the patient register. Leave this blank to quote a walk-in
              client, or pick the patient from the visit list.
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
            <Building2 className="w-3.5 h-3.5 inline mr-1" /> Corporate Account (optional)
          </label>
          <SearchableSelect
            options={corporateOptions}
            value={corporateAccountId}
            onChange={setCorporateAccountId}
            loading={optionsLoading}
            placeholder="Search corporate accounts…"
            emptyLabel="No corporate account"
            icon={<Building2 className="w-3.5 h-3.5" />}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
            Validity (days)
          </label>
          <input
            type="number"
            min="1"
            value={validityDays}
            onChange={(e) => setValidityDays(Number(e.target.value))}
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
            Discount (GHS)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={discount}
            onChange={(e) => setDiscount(Number(e.target.value))}
            className={inputClass}
          />
        </div>
      </section>

      {/* ── Line items ── */}
      <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-[var(--text-primary)]">Line Items</h2>
          <button
            type="button"
            onClick={() => setItems([...items, emptyItem()])}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Add Item
          </button>
        </div>

        {items.map((item, index) => (
          <div
            key={item.id || index}
            className="grid gap-2 md:grid-cols-[2fr_1fr_80px_110px_80px_40px] items-start border-b border-[var(--border-color)] pb-4 last:border-0 last:pb-0"
          >
            <div>
              <label className="block text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">
                Service
              </label>
              <SearchableSelect
                options={serviceOptions}
                value={item.serviceCatalogId || ''}
                onChange={(v) => selectService(index, v)}
                loading={optionsLoading}
                placeholder="Search services…"
                emptyLabel="Custom description"
              />
              <input
                value={item.description}
                onChange={(e) => updateItem(index, { description: e.target.value })}
                className="mt-1 w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] transition-all"
                placeholder="Description"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">
                Pricing basis
              </label>
              <select
                value={item.pricingBasis}
                onChange={(e) => setPricingBasis(index, e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] transition-all"
              >
                <option value="cash">Cash</option>
                <option value="nhis">NHIS</option>
                <option value="private_insurance">Private Insurance</option>
                <option value="corporate">Corporate</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">
                Qty
              </label>
              <input
                type="number"
                min="1"
                value={item.quantity}
                onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">
                Unit Price
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={item.unitPrice}
                onChange={(e) => updateItem(index, { unitPrice: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">
                VAT %
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={item.vatRate}
                onChange={(e) => updateItem(index, { vatRate: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] transition-all"
              />
            </div>

            <button
              type="button"
              disabled={items.length === 1}
              onClick={() => setItems(items.filter((_, i) => i !== index))}
              className="mt-6 p-2 text-[var(--icon-red-text)] hover:bg-[var(--icon-red-bg)] rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Remove item"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        {/* Totals */}
        <div className="flex justify-end pt-2 border-t border-[var(--border-color)]">
          <div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between text-[var(--text-secondary)]">
              <span>Subtotal</span>
              <span className="text-[var(--text-primary)]">GHS {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[var(--text-secondary)]">
              <span>Tax</span>
              <span className="text-[var(--text-primary)]">GHS {tax.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>Discount</span>
                <span className="text-[var(--icon-red-text)]">− GHS {discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold border-t border-[var(--border-color)] pt-1 text-[var(--text-primary)]">
              <span>Total</span>
              <span>GHS {total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Notes and terms ── */}
      <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5 grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] transition-all resize-none min-h-24"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
            Terms and Conditions
          </label>
          <textarea
            value={termsAndConditions}
            onChange={(e) => setTermsAndConditions(e.target.value)}
            className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] transition-all resize-none min-h-24"
          />
        </div>
      </section>
    </form>
  );
}