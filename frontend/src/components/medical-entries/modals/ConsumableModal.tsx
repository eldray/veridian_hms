import React, { useEffect, useMemo, useState } from 'react';
import { X, Search, Package } from 'lucide-react';
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

export const ConsumableModal: React.FC<ConsumableModalProps> = ({
  isOpen, onClose, onSuccess, encounterId, stockItems, canAdd, existingUse = null,
}) => {
  const [search, setSearch] = useState(existingUse?.StockItem?.name || '');
  const [selectedId, setSelectedId] = useState(existingUse?.stockItemId || '');
  const [quantity, setQuantity] = useState(existingUse?.quantity || 1);
  const [notes, setNotes] = useState(existingUse?.notes?.replace(/^Consumable use:\s*/, '') || '');
  const [submitting, setSubmitting] = useState(false);
  const { success, error } = useToast();

  useEffect(() => {
    if (!isOpen) return;
    setSearch(existingUse?.StockItem?.name || '');
    setSelectedId(existingUse?.stockItemId || '');
    setQuantity(existingUse?.quantity || 1);
    setNotes(existingUse?.notes?.replace(/^Consumable use:\s*/, '') || '');
  }, [isOpen, existingUse]);

  const consumables = useMemo(() => stockItems.filter(item =>
    item.isActive && !item.isMedication &&
    (item.name?.toLowerCase().includes(search.toLowerCase()) ||
      item.drugCode?.toLowerCase().includes(search.toLowerCase()) ||
      item.category?.toLowerCase().includes(search.toLowerCase()))
  ), [stockItems, search]);
  const selected = stockItems.find(item => item.id === selectedId);
  const maxQuantity = selected
    ? selected.currentStock + (existingUse?.stockItemId === selected.id ? existingUse.quantity : 0)
    : 0;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-cyan-600" />
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Record consumable use</h2>
              <p className="text-xs text-gray-500">Stock is updated immediately and logged for this visit.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <label htmlFor="consumable-search" className="mb-1 block text-sm font-medium">Consumable</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input id="consumable-search" value={search} onChange={event => { setSearch(event.target.value); setSelectedId(''); }}
                placeholder="Search consumables" className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm dark:border-gray-600 dark:bg-gray-800"
                disabled={!canAdd} />
            </div>
            {search && !selectedId && (
              <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
                {consumables.length ? consumables.map(item => (
                  <button type="button" key={item.id} onClick={() => { setSelectedId(item.id); setSearch(item.name); }}
                    className="flex w-full justify-between px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
                    <span>{item.name}</span>
                    <span className="text-gray-500">{item.currentStock} {item.unitOfMeasure || 'available'}</span>
                  </button>
                )) : <p className="px-3 py-2 text-sm text-gray-500">No active consumables found.</p>}
              </div>
            )}
          </div>
          {selected && (
            <p className="text-xs text-gray-500">Available: {selected.currentStock} {selected.unitOfMeasure || 'unit(s)'}{existingUse?.stockItemId === selected.id ? ` (up to ${maxQuantity} including current use)` : ''}</p>
          )}
          <div>
            <label htmlFor="consumable-quantity" className="mb-1 block text-sm font-medium">Quantity</label>
            <input id="consumable-quantity" type="number" min={1} max={selected?.currentStock ?? 1} step={1} value={quantity}
              onChange={event => setQuantity(Number(event.target.value))}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
              disabled={!canAdd || !selected} />
          </div>
          <div>
            <label htmlFor="consumable-notes" className="mb-1 block text-sm font-medium">Notes (optional)</label>
            <textarea id="consumable-notes" value={notes} onChange={event => setNotes(event.target.value)} rows={2}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
              disabled={!canAdd} />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-4 dark:border-gray-700">
          <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm">Cancel</button>
          <button type="button" onClick={submit} disabled={!canAdd || !selected || submitting}
            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            {submitting ? (existingUse ? 'Saving…' : 'Recording…') : existingUse ? 'Save changes' : 'Record use'}
          </button>
        </div>
      </div>
    </div>
  );
};
