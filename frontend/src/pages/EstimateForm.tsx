// src/pages/EstimateForm.tsx
import { type FormEvent, useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Plus, Save, Trash2, FileText, Search, X,
  User as UserIcon, Building2, ChevronDown, Check,
} from 'lucide-react';
import { getCorporateAccounts, getServiceCatalog } from '../api';
import { usePatientStore } from '../store/patientStore';
import { useEstimatesStore } from '../store/estimatesStore';
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
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);

  // Filter by query
  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((o) => {
      const hay = (o.searchText ?? `${o.label} ${o.sublabel ?? ''}`).toLowerCase();
      return hay.includes(q);
    });
  }, [options, query]);

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
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-[var(--text-tertiary)]">
                No matches
              </div>
            ) : (
              filtered.map((opt, idx) => {
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
              })
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
  const editing = Boolean(id);
  const { error: toastError, success } = useToast();
  const { currentEstimate, loadEstimate, createEstimate, updateEstimate } = useEstimatesStore();

  // Patients come from the shared store, which loads every page (100 per request).
  const patients = usePatientStore((state) => state.patients);
  const [services, setServices] = useState<any[]>([]);
  const [corporateAccounts, setCorporateAccounts] = useState<any[]>([]);
  const [patientId, setPatientId] = useState('');
  const [corporateAccountId, setCorporateAccountId] = useState('');
  const [items, setItems] = useState<FormItem[]>([emptyItem()]);
  const [discount, setDiscount] = useState(0);
  const [validityDays, setValidityDays] = useState(7);
  const [notes, setNotes] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ── Load options once per id ─────────────────
  // NOTE: dependency is [id] ONLY. loadEstimate / toastError come from
  // Zustand stores and are not guaranteed to be reference-stable, so
  // including them caused an infinite refresh loop.
  useEffect(() => {
    const loadOptions = async () => {
      setIsLoading(true);
      try {
        // The backend returns at most 100 rows per request; these calls walk every page.
        const [serviceResponse, corporateResponse] = await Promise.all([
          getServiceCatalog({ isActive: true, limit: 5000, page: 1 }),
          getCorporateAccounts({ isActive: true, limit: 1000, page: 1 }),
          usePatientStore.getState().loadPatients(),
        ]);
        setServices(asArray(serviceResponse));
        setCorporateAccounts(asArray(corporateResponse));
        if (id) await loadEstimate(id);
      } catch (e: any) {
        toastError('Load failed', e?.response?.data?.message || e.message);
      } finally {
        setIsLoading(false);
      }
    };
    loadOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
  const patientOptions: SearchableOption[] = useMemo(
    () =>
      patients.map((p) => ({
        value: p.id,
        label: `${p.surname || ''} ${p.otherNames || ''}`.trim() || p.folderNumber,
        sublabel: `${p.folderNumber}${p.contact ? ` · ${p.contact}` : ''}`,
        searchText: `${p.surname || ''} ${p.otherNames || ''} ${p.folderNumber || ''} ${p.contact || ''}`,
      })),
    [patients],
  );

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

  const serviceOptions: SearchableOption[] = useMemo(
    () =>
      services.map((s) => ({
        value: s.id,
        label: s.name,
        sublabel: `${s.code} · ${s.serviceType || 'service'}`,
        searchText: `${s.name || ''} ${s.code || ''} ${s.serviceType || ''}`,
      })),
    [services],
  );

  // ── Item helpers ─────────────────────────────
  const updateItem = (index: number, patch: Partial<FormItem>) => {
    setItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    );
  };

  const selectService = (index: number, serviceId: string) => {
    if (!serviceId) {
      updateItem(index, { serviceCatalogId: undefined });
      return;
    }
    const service = services.find((candidate) => candidate.id === serviceId);
    if (!service) {
      updateItem(index, { serviceCatalogId: undefined });
      return;
    }
    const pricing = Array.isArray(service.pricing) ? service.pricing[0] : service.pricing;
    updateItem(index, {
      serviceCatalogId: service.id,
      description: service.name || '',
      serviceType: service.serviceType || 'miscellaneous',
      unitPrice: Number(pricing?.cashPrice || service.cashPrice || 0),
      vatRate: Number(pricing?.vatRate || service.vatRate || 0),
    });
  };

  // ── Save ─────────────────────────────────────
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!patientId) return toastError('Validation failed', 'Select a patient.');
    const validItems = items.filter((item) => item.description.trim() && item.quantity > 0);
    if (!validItems.length) return toastError('Validation failed', 'Add at least one line item.');

    setIsSaving(true);
    try {
      const payload = {
        patientId,
        corporateAccountId: corporateAccountId || undefined,
        discount: Math.max(0, discount),
        validityDays: Math.max(1, validityDays),
        notes: notes || undefined,
        termsAndConditions: termsAndConditions || undefined,
        items: validItems.map(({ id: itemId, ...item }) => ({
          ...item,
          id: editing ? itemId : undefined,
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
            <UserIcon className="w-3.5 h-3.5 inline mr-1" /> Patient *
          </label>
          <SearchableSelect
            options={patientOptions}
            value={patientId}
            onChange={setPatientId}
            placeholder="Search patients by name, folder, or phone…"
            emptyLabel="Select patient"
            icon={<UserIcon className="w-3.5 h-3.5" />}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
            <Building2 className="w-3.5 h-3.5 inline mr-1" /> Corporate Account (optional)
          </label>
          <SearchableSelect
            options={corporateOptions}
            value={corporateAccountId}
            onChange={setCorporateAccountId}
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
                onChange={(e) => updateItem(index, { pricingBasis: e.target.value })}
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