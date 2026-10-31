// src/components/medical-entries/modals/MedicationModal.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Search, Pill, AlertCircle, CheckCircle, ShieldAlert } from 'lucide-react';
import { useAttendanceStore } from '../../../store/attendanceStore';
import { useMedicalServicesStore } from '../../../store/medicalServicesStore';
import { useToast } from '../../../store/toastStore';
import { findContraindications, isBlocked, type AllergenClash } from '../../../data/allergens';

interface MedicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  attendanceId: string | null;
  stockItems: any[];
  canAdd: boolean;
  userId?: string;
  /** The patient's recorded allergies. This is a UI gate: the API still accepts the line. */
  allergies?: Array<{ allergen?: string | null; reaction?: string | null; severity?: string | null }> | null;
}

function useDebounced<T>(value: T, delay = 150): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const FREQUENCIES = [
  { value: 'once',  label: 'Once daily' },
  { value: 'bd',    label: 'Twice daily (BD)' },
  { value: 'tds',   label: 'Three times daily (TDS)' },
  { value: 'qid',   label: 'Four times daily (QID)' },
  { value: 'stat',  label: 'STAT (immediately)' },
  { value: 'prn',   label: 'As needed (PRN)' },
  { value: 'nocte', label: 'At night (nocte)' },
  { value: 'mane',  label: 'In morning (mane)' },
];

const ROUTES = [
  { value: 'oral', label: 'Oral' },
  { value: 'iv', label: 'Intravenous (IV)' },
  { value: 'im', label: 'Intramuscular (IM)' },
  { value: 'sc', label: 'Subcutaneous (SC)' },
  { value: 'topical', label: 'Topical' },
  { value: 'inhalation', label: 'Inhalation' },
  { value: 'rectal', label: 'Rectal' },
];

export const MedicationModal: React.FC<MedicationModalProps> = ({
  isOpen, onClose, onSuccess, attendanceId, stockItems, canAdd, allergies,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMed, setSelectedMed] = useState<any>(null);
  const [selectedServiceCatalog, setSelectedServiceCatalog] = useState<any>(null);
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [duration, setDuration] = useState('');
  const [route, setRoute] = useState('oral');
  const [instructions, setInstructions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const hasTriggeredCatalogLoad = useRef(false);
  const debouncedSearch = useDebounced(searchTerm, 150);

  const { addMedication } = useAttendanceStore();
  const { serviceCatalog, getServiceCatalog } = useMedicalServicesStore();
  const { success, error } = useToast();

  // Reset on open
  useEffect(() => {
    if (!isOpen) return;
    setSearchTerm('');
    setSelectedMed(null);
    setSelectedServiceCatalog(null);
    setDosage('');
    setFrequency('');
    setDuration('');
    setRoute('oral');
    setInstructions('');
    setShowDropdown(false);
    hasTriggeredCatalogLoad.current = false;
    const t = setTimeout(() => searchInputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [isOpen]);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Lazy: fetch the medication service catalog only once the user starts typing
  useEffect(() => {
    if (!isOpen || hasTriggeredCatalogLoad.current) return;
    if (debouncedSearch.trim().length < 2) return;
    hasTriggeredCatalogLoad.current = true;
    getServiceCatalog({ serviceType: 'medication', limit: 5000 }).catch(err => {
      console.error('Failed to load medication service catalog:', err);
    });
  }, [isOpen, debouncedSearch, getServiceCatalog]);

  const medicationServiceCatalogs = useMemo(
    () => serviceCatalog.filter(sc => sc.stockItemId),
    [serviceCatalog],
  );

  const medicationStockItems = useMemo(
    () => stockItems.filter(s => s.isMedication && s.isActive),
    [stockItems],
  );

  const filteredMeds = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return [];
    return medicationStockItems.filter(m =>
      m.name?.toLowerCase().includes(q) ||
      m.drugCode?.toLowerCase().includes(q) ||
      m.strength?.toLowerCase().includes(q)
    ).slice(0, 40);
  }, [medicationStockItems, debouncedSearch]);

  // Only the visible candidates are checked. The catalog is ~66 classes x every pattern, so
  // running it over all ~690 stocked items on each keystroke would be needless work.
  const blockedCandidateIds = useMemo(() => {
    const ids = new Set<string>();
    for (const m of filteredMeds) {
      if (isBlocked(findContraindications(allergies, m.name))) ids.add(m.id);
    }
    return ids;
  }, [filteredMeds, allergies]);

  const selectedClashes: AllergenClash[] = useMemo(
    () => (selectedMed ? findContraindications(allergies, selectedMed.name) : []),
    [selectedMed, allergies],
  );
  const blockingClashes = selectedClashes.filter(c => c.level === 'contraindicated');
  const cautionClashes = selectedClashes.filter(c => c.level === 'caution');

  const handleSelect = (m: any) => {
    setSelectedMed(m);
    setSearchTerm(m.name);
    setShowDropdown(false);
    const svc = medicationServiceCatalogs.find(sc => sc.stockItemId === m.id);
    setSelectedServiceCatalog(svc || null);
    if (m.strength && !dosage) setDosage(m.strength);
  };

  const clearSelection = () => {
    setSelectedMed(null);
    setSelectedServiceCatalog(null);
    setSearchTerm('');
    setDosage('');
    setFrequency('');
    setDuration('');
    setRoute('oral');
    setInstructions('');
    searchInputRef.current?.focus();
  };

  const handleSubmit = async () => {
    if (!attendanceId) { error('No attendance', 'Please select an attendance first.'); return; }
    if (!selectedMed) { error('No medication', 'Please select a medication.'); return; }
    if (!selectedServiceCatalog) { error('No pricing', 'This medication has no pricing configured.'); return; }
    if (!dosage.trim()) { error('Missing dosage', 'Please enter the dosage.'); return; }
    if (!frequency) { error('Missing frequency', 'Please select a frequency.'); return; }
    if (isBlocked(selectedClashes)) {
      error('Allergy conflict', 'This drug clashes with an allergy recorded for this patient.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addMedication(attendanceId, {
        stockItemId: selectedMed.id,
        serviceCatalogId: selectedServiceCatalog.id,
        dosage: dosage.trim(),
        frequency,
        duration: duration.trim(),
        route,
        instructions: instructions.trim(),
      });
      success('Medication prescribed', `${selectedMed.name} has been prescribed.`);
      clearSelection();
      onSuccess();
    } catch (err: any) {
      error('Prescription failed', err.response?.data?.message || err.message || 'Could not prescribe medication');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const hasPricing = !!selectedServiceCatalog;
  const isOutOfStock = !!selectedMed && selectedMed.currentStock === 0;
  const isLowStock = !!selectedMed && selectedMed.currentStock > 0 && selectedMed.currentStock < (selectedMed.reorderLevel || 50);
  const canEdit = !!selectedMed && hasPricing;

  const inputCls = 'w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--icon-green-text)] disabled:opacity-60';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-main)] px-5 py-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--icon-green-bg)] flex items-center justify-center">
              <Pill className="h-4 w-4 text-[var(--icon-green-text)]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Prescribe medication</h2>
              <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">Select a medication and specify dosage</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-color)] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ scrollbarWidth: 'thin' }}>
          {/* Medication search */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">
              Medication
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
              <input
                ref={searchInputRef}
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                  setShowDropdown(true);
                  if (selectedMed) setSelectedMed(null);
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search by drug name, code, or strength…"
                className={`${inputCls} pl-9`}
                disabled={!canAdd}
                autoComplete="off"
              />
            </div>

            {showDropdown && debouncedSearch && filteredMeds.length > 0 && (
              <div
                className="mt-1 max-h-56 overflow-y-auto rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm"
                style={{ scrollbarWidth: 'thin' }}
              >
                {filteredMeds.map(m => {
                  const out = m.currentStock === 0;
                  const low = m.currentStock > 0 && m.currentStock < (m.reorderLevel || 50);
                  const noPricing = !medicationServiceCatalogs.some(sc => sc.stockItemId === m.id);
                  const blocked = blockedCandidateIds.has(m.id);
                  const displayName = [m.name, m.strength].filter(Boolean).join(' ');
                  return (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => handleSelect(m)}
                      className="w-full text-left p-3 hover:bg-[var(--bg-main)] border-b border-[var(--border-color)] last:border-b-0 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{displayName}</p>
                          {m.drugCode && (
                            <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{m.drugCode}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-0.5 shrink-0">
                          <span
                            className={`text-[11px] font-semibold ${
                              out ? 'text-[var(--icon-red-text)]'
                              : low ? 'text-[var(--icon-yellow-text)]'
                              : 'text-[var(--icon-green-text)]'
                            }`}
                          >
                            {m.currentStock} in stock
                          </span>
                          {blocked && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--icon-red-text)]">
                              <ShieldAlert className="w-3 h-3" /> Allergy conflict
                            </span>
                          )}
                          {noPricing && (
                            <span className="text-[10px] text-[var(--icon-red-text)]">No pricing</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {showDropdown && debouncedSearch && filteredMeds.length === 0 && (
              <div className="mt-1 p-4 text-center rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)]">
                <AlertCircle className="w-6 h-6 text-[var(--text-tertiary)] mx-auto mb-2" />
                <p className="text-xs text-[var(--text-secondary)]">
                  No medications match "{debouncedSearch}".
                </p>
              </div>
            )}
          </div>

          {/* Selected medication summary */}
          {selectedMed && (
            <div
              className={`rounded-lg p-3 border ${
                !hasPricing || blockingClashes.length > 0
                  ? 'border-[var(--icon-red-text)]/30 bg-[var(--icon-red-bg)]'
                  : isOutOfStock
                  ? 'border-[var(--icon-red-text)]/30 bg-[var(--icon-red-bg)]'
                  : isLowStock
                  ? 'border-[var(--icon-yellow-text)]/30 bg-[var(--icon-yellow-bg)]'
                  : 'border-[var(--border-color)] bg-[var(--bg-main)]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                    {[selectedMed.name, selectedMed.strength].filter(Boolean).join(' ')}
                  </p>
                  <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                    {selectedMed.currentStock} {selectedMed.unitOfMeasure || 'unit(s)'} in stock
                    {selectedMed.drugCode ? ` · ${selectedMed.drugCode}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!isOutOfStock && <CheckCircle className="w-4 h-4 text-[var(--icon-green-text)]" />}
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="text-[11px] text-[var(--icon-cyan-text)] hover:underline"
                  >
                    Change
                  </button>
                </div>
              </div>

              {!hasPricing && (
                <p className="mt-2 text-[10px] text-[var(--icon-red-text)]">
                  No pricing configured. Contact an administrator before prescribing.
                </p>
              )}
              {hasPricing && isOutOfStock && (
                <p className="mt-2 text-[10px] text-[var(--icon-red-text)]">
                  Out of stock. Prescription can be recorded but cannot be dispensed until restocked.
                </p>
              )}
              {hasPricing && isLowStock && (
                <p className="mt-2 text-[10px] text-[var(--icon-yellow-text)]">
                  Low stock — only {selectedMed.currentStock} units available.
                </p>
              )}
            </div>
          )}

          {/* Allergy clash: a direct class match blocks, a cross-reactive class only warns */}
          {selectedMed && blockingClashes.length > 0 && (
            <div className="rounded-lg border p-3" style={{ borderColor: 'var(--icon-red-text)', background: 'var(--icon-red-bg)' }}>
              <p className="flex items-center gap-1.5 text-xs font-bold text-[var(--icon-red-text)]">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                Contraindicated with this patient&apos;s allergies
              </p>
              <ul className="mt-1.5 space-y-1">
                {blockingClashes.map((c, i) => (
                  <li key={`${c.allergen.id}-${c.recordedAs}-${i}`} className="text-[11px] text-[var(--text-primary)]">
                    <span className="font-semibold">{c.allergen.name}</span>
                    <span className="text-[var(--text-secondary)]"> — recorded as “{c.recordedAs}”</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[10px] text-[var(--text-secondary)]">
                Prescribing this item is blocked. Choose a drug from another class, or correct the
                allergy list on the patient record if this entry is wrong.
              </p>
            </div>
          )}

          {selectedMed && blockingClashes.length === 0 && cautionClashes.length > 0 && (
            <div className="rounded-lg border p-3" style={{ borderColor: 'var(--icon-yellow-text)', background: 'var(--icon-yellow-bg)' }}>
              <p className="text-xs font-bold text-[var(--icon-yellow-text)]">Possible cross-reaction</p>
              <ul className="mt-1.5 space-y-1">
                {cautionClashes.map((c, i) => (
                  <li key={`${c.allergen.id}-${c.recordedAs}-${i}`} className="text-[11px] text-[var(--text-primary)]">
                    <span className="font-semibold">{c.allergen.name}</span>
                    <span className="text-[var(--text-secondary)]"> — can cross-react with “{c.recordedAs}”</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[10px] text-[var(--text-secondary)]">
                Not a contraindication, so prescribing stays available. Confirm the reaction history before dispensing.
              </p>
            </div>
          )}

          {/* Prescription row: Dosage · Frequency · Duration · Route */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">
                Dosage
              </label>
              <input
                value={dosage}
                onChange={e => setDosage(e.target.value)}
                placeholder="500mg"
                className={inputCls}
                disabled={!canEdit}
                autoComplete="off"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">
                Frequency
              </label>
              <select
                value={frequency}
                onChange={e => setFrequency(e.target.value)}
                className={inputCls}
                disabled={!canEdit}
              >
                <option value="">Select…</option>
                {FREQUENCIES.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">
                Duration
              </label>
              <input
                value={duration}
                onChange={e => setDuration(e.target.value)}
                placeholder="7 days"
                className={inputCls}
                disabled={!canEdit}
                autoComplete="off"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">
                Route
              </label>
              <select
                value={route}
                onChange={e => setRoute(e.target.value)}
                className={inputCls}
                disabled={!canEdit}
              >
                {ROUTES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">
              Instructions <span className="normal-case font-normal">(optional)</span>
            </label>
            <textarea
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              rows={2}
              placeholder="e.g. Take with food, avoid alcohol…"
              className={`${inputCls} resize-none`}
              disabled={!canEdit}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-[var(--border-color)] bg-[var(--bg-main)] px-5 py-4 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canEdit || !dosage.trim() || !frequency || isSubmitting || blockingClashes.length > 0}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--icon-green-text)] text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            {isSubmitting
              ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Prescribing…</>
              : blockingClashes.length > 0
              ? <>Blocked by allergy</>
              : <>Prescribe medication</>}
          </button>
        </div>
      </div>
    </div>
  );
};