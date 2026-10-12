// src/components/medical-entries/modals/LabTestModal.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Search, FlaskConical, AlertCircle, Shield, CheckCircle, Clock } from 'lucide-react';
import { useAttendanceStore } from '../../../store/attendanceStore';
import { useToast } from '../../../store/toastStore';

interface LabTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  attendanceId: string | null;
  labTests: any[];
  canAdd: boolean;
  userId?: string;
}

type Priority = 'routine' | 'urgent' | 'stat';

function useDebounced<T>(value: T, delay = 150): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export const LabTestModal: React.FC<LabTestModalProps> = ({
  isOpen, onClose, onSuccess, attendanceId, labTests, canAdd,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTest, setSelectedTest] = useState<any>(null);
  const [priority, setPriority] = useState<Priority>('routine');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const debouncedSearch = useDebounced(searchTerm, 150);

  const { addLabTest } = useAttendanceStore();
  const { success, error } = useToast();

  useEffect(() => {
    if (!isOpen) return;
    setSearchTerm('');
    setSelectedTest(null);
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

  const filteredTests = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return [];
    return labTests.filter(t =>
      t.name?.toLowerCase().includes(q) ||
      t.investigationCode?.toLowerCase().includes(q) ||
      t.category?.toLowerCase().includes(q)
    ).slice(0, 40);
  }, [labTests, debouncedSearch]);

  const handleSelect = (t: any) => {
    setSelectedTest(t);
    setSearchTerm(t.name);
    setShowDropdown(false);
  };

  const clearSelection = () => {
    setSelectedTest(null);
    setSearchTerm('');
    setPriority('routine');
    setNotes('');
    searchInputRef.current?.focus();
  };

  const handleSubmit = async () => {
    if (!attendanceId) { error('No attendance', 'Please select an attendance first.'); return; }
    if (!selectedTest) { error('No test selected', 'Please select a lab test.'); return; }
    setIsSubmitting(true);
    try {
      await addLabTest(attendanceId, {
        serviceCatalogId: selectedTest.id,
        priority,
        notes,
      });
      success('Lab test requested', `${selectedTest.name} has been requested.`);
      clearSelection();
      onSuccess();
    } catch (err: any) {
      error('Request failed', err.response?.data?.message || err.message || 'Could not request lab test');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPrice = (t: any): number => {
    const raw = t?.pricing?.cashPrice ?? t?.cashPrice ?? t?.price ?? 0;
    const n = typeof raw === 'string' ? parseFloat(raw) : Number(raw);
    return Number.isFinite(n) ? n : 0;
  };

  if (!isOpen) return null;

  const priorities: { key: Priority; label: string; icon: React.ReactNode; activeCls: string }[] = [
    { key: 'routine', label: 'Routine', icon: <Clock className="w-3.5 h-3.5" />, activeCls: 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] border-[var(--icon-cyan-text)]' },
    { key: 'urgent', label: 'Urgent', icon: <AlertCircle className="w-3.5 h-3.5" />, activeCls: 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)] border-[var(--icon-yellow-text)]' },
    { key: 'stat', label: 'STAT', icon: <AlertCircle className="w-3.5 h-3.5" />, activeCls: 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] border-[var(--icon-red-text)]' },
  ];

  const inputCls = 'w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--icon-purple-text)] disabled:opacity-60';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-main)] px-5 py-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--icon-purple-bg)] flex items-center justify-center">
              <FlaskConical className="h-4 w-4 text-[var(--icon-purple-text)]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Request lab test</h2>
              <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">Select a laboratory investigation</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"
            className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-color)] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ scrollbarWidth: 'thin' }}>
          {/* Search */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">
              Lab test
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
              <input
                ref={searchInputRef}
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                  setShowDropdown(true);
                  if (selectedTest) setSelectedTest(null);
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search by name, code, or category…"
                className={`${inputCls} pl-9`}
                disabled={!canAdd}
                autoComplete="off"
              />
            </div>

            {showDropdown && debouncedSearch && filteredTests.length > 0 && (
              <div className="mt-1 max-h-56 overflow-y-auto rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm"
                style={{ scrollbarWidth: 'thin' }}>
                {filteredTests.map(t => (
                  <button type="button" key={t.id} onClick={() => handleSelect(t)}
                    className="w-full text-left p-3 hover:bg-[var(--bg-main)] border-b border-[var(--border-color)] last:border-b-0 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{t.name}</p>
                        <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                          {t.category || 'General'} · Specimen: {t.specimenType || 'N/A'}
                        </p>
                      </div>
                      <p className="text-[11px] font-semibold text-[var(--icon-cyan-text)] shrink-0">
                        GHS {getPrice(t).toFixed(2)}
                      </p>
                    </div>
                    {t.requiresAuthorization && (
                      <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[10px] bg-[var(--icon-orange-bg)] text-[var(--icon-orange-text)]">
                        <Shield className="w-3 h-3" /> Auth required
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {showDropdown && debouncedSearch && filteredTests.length === 0 && (
              <div className="mt-1 p-4 text-center rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)]">
                <AlertCircle className="w-6 h-6 text-[var(--text-tertiary)] mx-auto mb-2" />
                <p className="text-xs text-[var(--text-secondary)]">No lab tests match "{debouncedSearch}".</p>
              </div>
            )}
          </div>

          {/* Selected + priority */}
          {selectedTest && (
            <>
              <div className="rounded-lg p-3 border border-[var(--border-color)] bg-[var(--bg-main)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{selectedTest.name}</p>
                    <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                      {selectedTest.category || 'General'} · Specimen: {selectedTest.specimenType || 'N/A'}
                    </p>
                    <p className="text-[11px] font-semibold text-[var(--icon-cyan-text)] mt-1">
                      GHS {getPrice(selectedTest).toFixed(2)}
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
                  Priority
                </label>
                <div className="grid grid-cols-3 gap-2">
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

          {/* Notes */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">
              Clinical notes <span className="normal-case font-normal">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Indications, suspected diagnosis, special instructions…"
              className={`${inputCls} resize-none`}
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
            disabled={!selectedTest || isSubmitting}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--icon-purple-text)] text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2">
            {isSubmitting
              ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Requesting…</>
              : <>Request lab test</>}
          </button>
        </div>
      </div>
    </div>
  );
};