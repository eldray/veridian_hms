// src/components/medical-entries/modals/ScanModal.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Search, Scan as ScanIcon, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useAttendanceStore } from '../../../store/attendanceStore';
import { useToast } from '../../../store/toastStore';

interface ScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  attendanceId: string | null;
  scans: any[];
  canAdd: boolean;
  userId?: string;
}

type Priority = 'routine' | 'urgent';

function useDebounced<T>(value: T, delay = 150): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export const ScanModal: React.FC<ScanModalProps> = ({
  isOpen, onClose, onSuccess, attendanceId, scans, canAdd,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [priority, setPriority] = useState<Priority>('routine');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const debouncedSearch = useDebounced(searchTerm, 150);

  const { addScan } = useAttendanceStore();
  const { success, error } = useToast();

  useEffect(() => {
    if (!isOpen) return;
    setSearchTerm('');
    setSelected(null);
    setPriority('routine');
    setNotes('');
    setShowDropdown(false);
    const t = setTimeout(() => searchInputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return [];
    return scans.filter(s =>
      s.name?.toLowerCase().includes(q) ||
      s.scanCode?.toLowerCase().includes(q) ||
      s.category?.toLowerCase().includes(q)
    ).slice(0, 40);
  }, [scans, debouncedSearch]);

  const handleSelect = (s: any) => {
    setSelected(s);
    setSearchTerm(s.name);
    setShowDropdown(false);
  };

  const clearSelection = () => {
    setSelected(null);
    setSearchTerm('');
    setPriority('routine');
    setNotes('');
    searchInputRef.current?.focus();
  };

  const handleSubmit = async () => {
    if (!attendanceId) { error('No attendance', 'Please select an attendance first.'); return; }
    if (!selected) { error('No scan', 'Please select a scan.'); return; }
    setIsSubmitting(true);
    try {
      await addScan(attendanceId, {
        serviceCatalogId: selected.id,
        priority,
        notes,
      });
      success('Scan ordered', `${selected.name} has been ordered.`);
      clearSelection();
      onSuccess();
    } catch (err: any) {
      error('Order failed', err.response?.data?.message || err.message || 'Could not order scan');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const priorities: { key: Priority; label: string; icon: React.ReactNode; activeCls: string }[] = [
    { key: 'routine', label: 'Routine', icon: <Clock className="w-3.5 h-3.5" />, activeCls: 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] border-[var(--icon-cyan-text)]' },
    { key: 'urgent',  label: 'Urgent',  icon: <AlertCircle className="w-3.5 h-3.5" />, activeCls: 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] border-[var(--icon-red-text)]' },
  ];

  const inputCls = 'w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--icon-red-text)] disabled:opacity-60';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-main)] px-5 py-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--icon-red-bg)] flex items-center justify-center">
              <ScanIcon className="h-4 w-4 text-[var(--icon-red-text)]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Order scan</h2>
              <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">Select an imaging study</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"
            className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-color)] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ scrollbarWidth: 'thin' }}>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">
              Scan
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
              <input
                ref={searchInputRef}
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                  setShowDropdown(true);
                  if (selected) setSelected(null);
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search scans (X-ray, CT, MRI, ultrasound)…"
                className={`${inputCls} pl-9`}
                disabled={!canAdd}
                autoComplete="off"
              />
            </div>

            {showDropdown && debouncedSearch && filtered.length > 0 && (
              <div className="mt-1 max-h-56 overflow-y-auto rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm"
                style={{ scrollbarWidth: 'thin' }}>
                {filtered.map(s => (
                  <button type="button" key={s.id} onClick={() => handleSelect(s)}
                    className="w-full text-left p-3 hover:bg-[var(--bg-main)] border-b border-[var(--border-color)] last:border-b-0 transition-colors">
                    <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{s.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[var(--text-secondary)] flex-wrap">
                      <span>{s.category || 'General'}</span>
                      {s.bodyPart && <span>· {s.bodyPart}</span>}
                      <span>· {s.duration || 30} min</span>
                      {s.contrastRequired && (
                        <span className="px-1.5 py-0.5 rounded bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]">
                          Contrast
                        </span>
                      )}
                    </div>
                    {s.preparationInstructions && (
                      <p className="text-[10px] text-[var(--text-tertiary)] mt-1 italic">
                        Prep: {s.preparationInstructions}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}

            {showDropdown && debouncedSearch && filtered.length === 0 && (
              <div className="mt-1 p-4 text-center rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)]">
                <AlertCircle className="w-6 h-6 text-[var(--text-tertiary)] mx-auto mb-2" />
                <p className="text-xs text-[var(--text-secondary)]">No scans match "{debouncedSearch}".</p>
              </div>
            )}
          </div>

          {selected && (
            <>
              <div className="rounded-lg p-3 border border-[var(--border-color)] bg-[var(--bg-main)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{selected.name}</p>
                    <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                      {selected.category || 'General'}{selected.bodyPart ? ` · ${selected.bodyPart}` : ''}
                    </p>
                    {selected.preparationInstructions && (
                      <p className="text-[10px] text-[var(--text-tertiary)] mt-1 italic">
                        Prep: {selected.preparationInstructions}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <CheckCircle className="w-4 h-4 text-[var(--icon-green-text)]" />
                    <button type="button" onClick={clearSelection} className="text-[11px] text-[var(--icon-cyan-text)] hover:underline">
                      Change
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">
                  Priority
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {priorities.map(p => {
                    const active = priority === p.key;
                    return (
                      <button key={p.key} type="button" onClick={() => setPriority(p.key)}
                        className={`flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                          active ? p.activeCls : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--text-tertiary)]'
                        }`}>
                        {p.icon} {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">
              Clinical notes <span className="normal-case font-normal">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Indications, suspected findings, special instructions…"
              className={`${inputCls} resize-none`}
              disabled={!selected}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-[var(--border-color)] bg-[var(--bg-main)] px-5 py-4 flex-shrink-0">
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)] transition-colors">
            Cancel
          </button>
          <button type="button" onClick={handleSubmit}
            disabled={!selected || isSubmitting}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--icon-red-text)] text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2">
            {isSubmitting
              ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Ordering…</>
              : <>Order scan</>}
          </button>
        </div>
      </div>
    </div>
  );
};