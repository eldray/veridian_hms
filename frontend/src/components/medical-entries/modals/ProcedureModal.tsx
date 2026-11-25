// src/components/medical-entries/modals/ProcedureModal.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Search, Scissors, AlertCircle, Shield, Calendar, CheckCircle } from 'lucide-react';
import { useAttendanceStore } from '../../../store/attendanceStore';
import { useToast } from '../../../store/toastStore';

interface ProcedureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  attendanceId: string | null;
  procedures: any[];
  canAdd: boolean;
  userId?: string;
}

function useDebounced<T>(value: T, delay = 150): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export const ProcedureModal: React.FC<ProcedureModalProps> = ({
  isOpen, onClose, onSuccess, attendanceId, procedures, canAdd,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [scheduledDate, setScheduledDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const debouncedSearch = useDebounced(searchTerm, 150);

  const { addProcedure } = useAttendanceStore();
  const { success, error } = useToast();

  useEffect(() => {
    if (!isOpen) return;
    setSearchTerm('');
    setSelected(null);
    setScheduledDate('');
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
    return procedures.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.procedureCode?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q)
    ).slice(0, 40);
  }, [procedures, debouncedSearch]);

  const handleSelect = (p: any) => {
    setSelected(p);
    setSearchTerm(p.name);
    setShowDropdown(false);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setScheduledDate(tomorrow.toISOString().slice(0, 16));
  };

  const clearSelection = () => {
    setSelected(null);
    setSearchTerm('');
    setScheduledDate('');
    setNotes('');
    searchInputRef.current?.focus();
  };

  const handleSubmit = async () => {
    if (!attendanceId) { error('No attendance', 'Please select an attendance first.'); return; }
    if (!selected) { error('No procedure', 'Please select a procedure.'); return; }
    if (!scheduledDate) { error('Missing date', 'Please choose a scheduled date.'); return; }
    setIsSubmitting(true);
    try {
      await addProcedure(attendanceId, {
        serviceCatalogId: selected.id,
        scheduledDate,
        notes,
      });
      success('Procedure scheduled', `${selected.name} has been scheduled.`);
      clearSelection();
      onSuccess();
    } catch (err: any) {
      error('Schedule failed', err.response?.data?.message || err.message || 'Could not schedule procedure');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const nowLocal = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const inputCls = 'w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--icon-orange-text)] disabled:opacity-60';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-main)] px-5 py-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--icon-orange-bg)] flex items-center justify-center">
              <Scissors className="h-4 w-4 text-[var(--icon-orange-text)]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Schedule procedure</h2>
              <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">Select a procedure and schedule date</p>
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
              Procedure
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
                placeholder="Search procedures…"
                className={`${inputCls} pl-9`}
                disabled={!canAdd}
                autoComplete="off"
              />
            </div>

            {showDropdown && debouncedSearch && filtered.length > 0 && (
              <div className="mt-1 max-h-56 overflow-y-auto rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm"
                style={{ scrollbarWidth: 'thin' }}>
                {filtered.map(p => (
                  <button type="button" key={p.id} onClick={() => handleSelect(p)}
                    className="w-full text-left p-3 hover:bg-[var(--bg-main)] border-b border-[var(--border-color)] last:border-b-0 transition-colors">
                    <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{p.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[var(--text-secondary)] flex-wrap">
                      <span>{p.category || 'General'}</span>
                      <span>· {p.duration || 30} min</span>
                      {p.requiresAuthorization && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--icon-orange-bg)] text-[var(--icon-orange-text)]">
                          <Shield className="w-3 h-3" /> Auth
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {showDropdown && debouncedSearch && filtered.length === 0 && (
              <div className="mt-1 p-4 text-center rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)]">
                <AlertCircle className="w-6 h-6 text-[var(--text-tertiary)] mx-auto mb-2" />
                <p className="text-xs text-[var(--text-secondary)]">No procedures match "{debouncedSearch}".</p>
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
                      {selected.category || 'General'} · {selected.duration || 30} min
                    </p>
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
                  Scheduled date &amp; time
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
                  <input
                    type="datetime-local"
                    value={scheduledDate}
                    min={nowLocal}
                    onChange={e => setScheduledDate(e.target.value)}
                    className={`${inputCls} pl-9`}
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">
              Notes <span className="normal-case font-normal">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Special instructions, anaesthesia notes, other details…"
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
            disabled={!selected || !scheduledDate || isSubmitting}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--icon-orange-text)] text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2">
            {isSubmitting
              ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Scheduling…</>
              : <>Schedule procedure</>}
          </button>
        </div>
      </div>
    </div>
  );
};