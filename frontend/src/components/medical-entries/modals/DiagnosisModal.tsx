// src/components/medical-entries/modals/DiagnosisModal.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Search, Stethoscope, AlertCircle, Star, Clock, Plus, CheckCircle } from 'lucide-react';
import { useAttendanceStore } from '../../../store/attendanceStore';
import { useToast } from '../../../store/toastStore';
import { describeApiError, describeApiErrorTitle } from '../../../utils/apiError';

interface DiagnosisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  attendanceId: string | null;
  diagnoses: any[];
  canAdd: boolean;
  userId?: string;
  userName?: string;
}

type DiagnosisType = 'provisional' | 'primary' | 'additional';

const DIAGNOSIS_TYPES: {
  value: DiagnosisType;
  label: string;
  icon: React.ReactNode;
  description: string;
  bg: string;
  text: string;
  border: string;
}[] = [
  {
    value: 'provisional',
    label: 'Provisional',
    icon: <Clock className="w-3.5 h-3.5" />,
    description: 'Working diagnosis — not yet confirmed',
    bg: 'bg-[var(--icon-yellow-bg)]',
    text: 'text-[var(--icon-yellow-text)]',
    border: 'border-[var(--icon-yellow-text)]',
  },
  {
    value: 'primary',
    label: 'Primary',
    icon: <Star className="w-3.5 h-3.5" />,
    description: 'Main confirmed diagnosis',
    bg: 'bg-[var(--icon-green-bg)]',
    text: 'text-[var(--icon-green-text)]',
    border: 'border-[var(--icon-green-text)]',
  },
  {
    value: 'additional',
    label: 'Additional',
    icon: <Plus className="w-3.5 h-3.5" />,
    description: 'Secondary / co-morbid conditions',
    bg: 'bg-[var(--icon-cyan-bg)]',
    text: 'text-[var(--icon-cyan-text)]',
    border: 'border-[var(--icon-cyan-text)]',
  },
];

function useDebounced<T>(value: T, delay = 150): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export const DiagnosisModal: React.FC<DiagnosisModalProps> = ({
  isOpen, onClose, onSuccess, attendanceId, diagnoses, canAdd,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [diagnosisType, setDiagnosisType] = useState<DiagnosisType>('provisional');
  const [classification, setClassification] = useState<'' | 'NEW_DIAGNOSIS' | 'OLD_DIAGNOSIS'>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const debouncedSearch = useDebounced(searchTerm, 150);

  const { addDiagnosis } = useAttendanceStore();
  const { success, error, info } = useToast();

  useEffect(() => {
    if (!isOpen) return;
    // Reset on open
    setSearchTerm('');
    setSelectedDiagnosis(null);
    setNotes('');
    setDiagnosisType('provisional');
    setClassification('');
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

  const filteredDiagnoses = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return [];
    return diagnoses.filter(d =>
      d.name?.toLowerCase().includes(q) || d.icdCode?.toLowerCase().includes(q)
    ).slice(0, 40);
  }, [diagnoses, debouncedSearch]);

  const handleSelect = (d: any) => {
    setSelectedDiagnosis(d);
    setSearchTerm(`${d.name} (${d.icdCode})`);
    setShowDropdown(false);
  };

  const clearSelection = () => {
    setSelectedDiagnosis(null);
    setSearchTerm('');
    setNotes('');
    setDiagnosisType('provisional');
    setClassification('');
    searchInputRef.current?.focus();
  };

  const handleSubmit = async () => {
    if (!attendanceId) { error('No attendance', 'Please select an attendance first.'); return; }
    if (!selectedDiagnosis) { error('No diagnosis', 'Please select a diagnosis.'); return; }
    if (!classification) { error('Case classification required', 'Choose whether this is a new diagnosis/case or an old case / re-attendance for HMIS reporting.'); return; }
    setIsSubmitting(true);
    try {
      await addDiagnosis(attendanceId, {
        diagnosisId: selectedDiagnosis.id,
        notes,
        primary: diagnosisType === 'primary',
        diagnosisType,
        classification,
      });
      success('Diagnosis added', `${selectedDiagnosis.name} added as ${diagnosisType.toUpperCase()}`);
      clearSelection();
      onSuccess();
    } catch (err: any) {
      // A duplicate means the row is already on this visit. Refresh so the list shows it,
      // rather than leaving the panel looking as though nothing had been saved.
      if (err?.response?.status === 409) {
        info('Already recorded', `${selectedDiagnosis.name} is already on this visit.`);
        clearSelection();
        onSuccess();
        return;
      }
      error(describeApiErrorTitle(err, 'Add failed'), describeApiError(err, 'The diagnosis could not be added.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const activeType = DIAGNOSIS_TYPES.find(t => t.value === diagnosisType)!;
  const inputCls = 'w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--icon-cyan-text)] disabled:opacity-60';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-main)] px-5 py-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--icon-cyan-bg)] flex items-center justify-center">
              <Stethoscope className="h-4 w-4 text-[var(--icon-cyan-text)]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Add diagnosis</h2>
              <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">Select a diagnosis and specify its type</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"
            className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-color)] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ scrollbarWidth: 'thin' }}>
          {/* Type selector */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">
              Diagnosis type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {DIAGNOSIS_TYPES.map(type => {
                const isActive = diagnosisType === type.value;
                return (
                  <button key={type.value} type="button" onClick={() => setDiagnosisType(type.value)}
                    className={`p-2 rounded-lg border text-center transition-all ${
                      isActive ? `${type.bg} ${type.border} border-2` : 'bg-[var(--bg-card)] border-[var(--border-color)] hover:border-[var(--text-tertiary)]'
                    }`}>
                    <div className={`flex justify-center mb-1 ${isActive ? type.text : 'text-[var(--text-secondary)]'}`}>{type.icon}</div>
                    <span className={`text-[11px] font-semibold ${isActive ? type.text : 'text-[var(--text-primary)]'}`}>{type.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-[var(--text-tertiary)] mt-1.5">{activeType.description}</p>
          </div>

          {/* Search */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">
              Search diagnosis
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
              <input
                ref={searchInputRef}
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                  setShowDropdown(true);
                  if (selectedDiagnosis) setSelectedDiagnosis(null);
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search by name or ICD-10 code…"
                className={`${inputCls} pl-9`}
                disabled={!canAdd}
                autoComplete="off"
              />
            </div>

            {showDropdown && debouncedSearch && filteredDiagnoses.length > 0 && (
              <div className="mt-1 max-h-56 overflow-y-auto rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm"
                style={{ scrollbarWidth: 'thin' }}>
                {filteredDiagnoses.map(d => (
                  <button type="button" key={d.id} onClick={() => handleSelect(d)}
                    className="w-full text-left p-3 hover:bg-[var(--bg-main)] border-b border-[var(--border-color)] last:border-b-0 transition-colors">
                    <p className="text-xs font-semibold text-[var(--text-primary)]">{d.name}</p>
                    <p className="text-[10px] font-mono text-[var(--text-secondary)] mt-0.5">ICD-10: {d.icdCode}</p>
                  </button>
                ))}
              </div>
            )}

            {showDropdown && debouncedSearch && filteredDiagnoses.length === 0 && (
              <div className="mt-1 p-4 text-center rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)]">
                <AlertCircle className="w-6 h-6 text-[var(--text-tertiary)] mx-auto mb-2" />
                <p className="text-xs text-[var(--text-secondary)]">No diagnoses match "{debouncedSearch}".</p>
              </div>
            )}
          </div>

          {/* Selected summary */}
          {selectedDiagnosis && (
            <div className={`rounded-lg p-3 border-2 ${activeType.border} ${activeType.bg}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${activeType.text} bg-[var(--bg-card)]`}>
                    {activeType.label.toUpperCase()}
                  </span>
                  <p className="text-xs font-semibold text-[var(--text-primary)] mt-1.5 truncate">{selectedDiagnosis.name}</p>
                  <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">ICD-10: {selectedDiagnosis.icdCode}</p>
                </div>
                <button type="button" onClick={clearSelection} className="text-[11px] text-[var(--icon-cyan-text)] hover:underline shrink-0">
                  Change
                </button>
              </div>
            </div>
          )}

          {/* HMIS/DHIMS morbidity classification */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">
              HMIS case classification <span className="text-[var(--icon-red-text)]">*</span>
            </label>
            <select
              value={classification}
              onChange={e => setClassification(e.target.value as typeof classification)}
              className={inputCls}
              disabled={!canAdd}
              required
            >
              <option value="">Select new or old case…</option>
              <option value="NEW_DIAGNOSIS">New diagnosis / new case</option>
              <option value="OLD_DIAGNOSIS">Old case / re-attendance for an existing episode</option>
            </select>
            <p className="text-[10px] text-[var(--text-tertiary)] mt-1.5">
              Classify this diagnosis episode, not whether the patient has visited the hospital before.
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">
              Clinical notes <span className="normal-case font-normal">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Add clinical notes, findings, or comments…"
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
            disabled={!selectedDiagnosis || !classification || isSubmitting}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--icon-cyan-text)] text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2">
            {isSubmitting
              ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Adding…</>
              : <><CheckCircle className="w-3.5 h-3.5" /> Add {activeType.label.toLowerCase()} diagnosis</>}
          </button>
        </div>
      </div>
    </div>
  );
};