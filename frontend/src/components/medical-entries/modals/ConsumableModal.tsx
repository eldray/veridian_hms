// src/components/medical-entries/modals/ConsumableModal.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Search, Package, AlertCircle, CheckCircle } from 'lucide-react';
import { recordEncounterConsumableUse, updateEncounterConsumableUse } from '../../../api';
import { useToast } from '../../../store/toastStore';

interface ConsumableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  encounterId: string;
  stockItems: any[];
  canAdd: boolean;
  existingUse?: any | null;
}

/** Debounce hook — returns the debounced value of `value` after `delay` ms. */
function useDebounced<T>(value: T, delay = 150): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export const ConsumableModal: React.FC<ConsumableModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  encounterId,
  stockItems,
  canAdd,
  existingUse = null,
}) => {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { success, error } = useToast();

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const debouncedSearch = useDebounced(search, 150);

  // Reset / hydrate form when the modal opens
  useEffect(() => {
    if (!isOpen) return;
    setSearch(existingUse?.StockItem?.name || '');
    setSelectedId(existingUse?.stockItemId || '');
    setQuantity(existingUse?.quantity || 1);
    setNotes(existingUse?.notes?.replace(/^Consumable use:\s*/, '') || '');

    // Focus the search field once the modal is mounted
    const t = setTimeout(() => searchInputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [isOpen, existingUse]);

  // Escape closes the modal
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Memoised filter — only recomputes when stockItems or the debounced query change
  const consumables = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return stockItems
      .filter(item => {
        if (!item.isActive || item.isMedication) return false;
        return !q || (
          item.name?.toLowerCase().includes(q) ||
          item.drugCode?.toLowerCase().includes(q) ||
          item.category?.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  }, [stockItems, debouncedSearch]);

  const visibleConsumables = useMemo(
    () => consumables.slice(0, debouncedSearch.trim() ? 12 : 8),
    [consumables, debouncedSearch],
  );

  const selected = stockItems.find(item => item.id === selectedId) || null;

  // Available stock + any already-held quantity when editing
  const maxQuantity = selected
    ? (Number(selected.currentStock) || 0) +
      (existingUse?.stockItemId === selected.id ? Number(existingUse.quantity) || 0 : 0)
    : 0;

  const showDropdown = !selectedId;
  const isOutOfStock = !!selected && (Number(selected.currentStock) || 0) <= 0;
  const isOverMax = !!selected && quantity > maxQuantity;

  const handleSelect = (item: any) => {
    setSelectedId(item.id);
    setSearch(item.name);
  };

  const clearSelection = () => {
    setSelectedId('');
    setSearch('');
    setQuantity(1);
    searchInputRef.current?.focus();
  };

  const submit = async () => {
    if (!selected || !Number.isInteger(quantity) || quantity < 1 || quantity > maxQuantity) {
      error('Invalid quantity', `Enter a whole-number quantity from 1 to ${maxQuantity}.`);
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        stockItemId: selected.id,
        quantity,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      };
      if (existingUse) {
        await updateEncounterConsumableUse(encounterId, existingUse.id, payload);
        success('Consumable updated', `${selected.name} usage was updated.`);
      } else {
        await recordEncounterConsumableUse(encounterId, payload);
        success('Consumable recorded', `${quantity} ${selected.unitOfMeasure || 'unit(s)'} of ${selected.name} recorded.`);
      }
      setSearch('');
      setSelectedId('');
      setQuantity(1);
      setNotes('');
      onSuccess();
    } catch (err: any) {
      error('Could not record consumable', err?.response?.data?.message || err?.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const inputCls = 'w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--icon-cyan-text)] disabled:opacity-60';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-main)] px-5 py-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--icon-cyan-bg)] flex items-center justify-center">
              <Package className="h-4 w-4 text-[var(--icon-cyan-text)]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                {existingUse ? 'Edit consumable use' : 'Record consumable use'}
              </h2>
              <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                Stock is updated immediately and logged for this visit.
              </p>
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
          {/* Consumable search */}
          <div>
            <label htmlFor="consumable-search" className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">
              Consumable
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
              <input
                id="consumable-search"
                ref={searchInputRef}
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  if (selectedId) setSelectedId('');
                }}
                placeholder="Search by name, code, or category…"
                className={`${inputCls} pl-9`}
                disabled={!canAdd}
                autoComplete="off"
              />
            </div>

            {showDropdown && (
              <div className="mt-2 overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]">
                <div className="flex items-center justify-between gap-2 border-b border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    {debouncedSearch.trim() ? 'Search results' : 'Available consumables'}
                  </span>
                  <span className="text-[10px] text-[var(--text-tertiary)]">
                    {debouncedSearch.trim() ? consumables.length : `Showing ${visibleConsumables.length} of ${consumables.length}`}
                  </span>
                </div>
                <div className="max-h-64 overflow-y-auto p-1.5" style={{ scrollbarWidth: 'thin' }}>
                  {visibleConsumables.length ? (
                    visibleConsumables.map(item => {
                      const available = Number(item.currentStock) || 0;
                      const out = available <= 0;
                      const low = !out && available < (Number(item.reorderLevel) || 0);
                      return (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => handleSelect(item)}
                          disabled={out || !canAdd}
                          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                            out ? 'cursor-not-allowed opacity-50' : 'hover:bg-[var(--bg-main)]'
                          }`}
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]">
                            <Package className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-semibold text-[var(--text-primary)]">{item.name}</span>
                            <span className="mt-0.5 block truncate text-[10px] text-[var(--text-tertiary)]">
                              {[item.drugCode, item.category].filter(Boolean).join(' · ') || 'General consumable'}
                            </span>
                          </span>
                          <span className="shrink-0 text-right">
                            <span className={`block text-xs font-bold ${out ? 'text-[var(--icon-red-text)]' : low ? 'text-[var(--icon-yellow-text)]' : 'text-[var(--icon-green-text)]'}`}>
                              {available}
                            </span>
                            <span className="block text-[9px] text-[var(--text-tertiary)]">{item.unitOfMeasure || 'units'} in stock</span>
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-4 py-7 text-center">
                      <Package className="mx-auto mb-2 h-6 w-6 text-[var(--text-tertiary)] opacity-50" />
                      <p className="text-xs font-semibold text-[var(--text-primary)]">No matching consumables</p>
                      <p className="mt-1 text-[10px] text-[var(--text-tertiary)]">Try a different name, item code, or category.</p>
                    </div>
                  )}
                </div>
                {!debouncedSearch.trim() && consumables.length > visibleConsumables.length && (
                  <p className="border-t border-[var(--border-color)] px-3 py-2 text-[10px] text-[var(--text-tertiary)]">
                    Type in the search box to find other items.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Selected summary */}
          {selected && (
            <div className={`rounded-lg border p-3 ${
              isOutOfStock
                ? 'border-[var(--icon-red-text)]/30 bg-[var(--icon-red-bg)]'
                : 'border-[var(--border-color)] bg-[var(--bg-main)]'
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{selected.name}</p>
                  <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                    Available: {selected.currentStock} {selected.unitOfMeasure || 'unit(s)'}
                    {existingUse?.stockItemId === selected.id && maxQuantity !== selected.currentStock
                      ? ` · up to ${maxQuantity} including this use`
                      : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {isOutOfStock ? (
                    <AlertCircle className="w-4 h-4 text-[var(--icon-red-text)]" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-[var(--icon-green-text)]" />
                  )}
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="text-[11px] text-[var(--icon-cyan-text)] hover:underline"
                  >
                    Change
                  </button>
                </div>
              </div>

              {isOutOfStock && (
                <p className="mt-2 text-[10px] text-[var(--icon-red-text)]">
                  This item has 0 stock. You cannot record a use until it is restocked.
                </p>
              )}
            </div>
          )}

          {/* Quantity */}
          <div>
            <label htmlFor="consumable-quantity" className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">
              Quantity
            </label>
            <div className="flex items-center gap-2">
              <input
                id="consumable-quantity"
                type="number"
                min={1}
                max={maxQuantity || 1}
                step={1}
                value={quantity}
                onChange={e => setQuantity(Number(e.target.value))}
                className={`${inputCls} flex-1 ${
                  isOverMax ? 'border-[var(--icon-red-text)]' : ''
                }`}
                disabled={!canAdd || !selected}
              />
              {selected && (
                <span className="text-[11px] text-[var(--text-tertiary)] shrink-0 min-w-[40px]">
                  {selected.unitOfMeasure || 'unit(s)'}
                </span>
              )}
            </div>
            {isOverMax && (
              <p className="text-[10px] text-[var(--icon-red-text)] mt-1">
                Max is {maxQuantity}. You entered {quantity}.
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="consumable-notes" className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">
              Notes <span className="normal-case font-normal">(optional)</span>
            </label>
            <textarea
              id="consumable-notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Dressing change, catheterisation kit…"
              className={`${inputCls} resize-none`}
              disabled={!canAdd}
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
            onClick={submit}
            disabled={!canAdd || !selected || isOutOfStock || isOverMax || submitting}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--icon-cyan-text)] text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {submitting ? (existingUse ? 'Saving…' : 'Recording…') : existingUse ? 'Save changes' : 'Record use'}
          </button>
        </div>
      </div>
    </div>
  );
};