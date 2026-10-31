// src/components/medical-entries/ClinicalNotesModal.tsx
//
// The clinical notes (the impression carried on the visit) are edited here, apart from the
// History & Examination form: the two summaries on the page have their own editors.

import React, { useEffect, useState } from 'react';
import { X, ClipboardList, FileText, Stethoscope } from 'lucide-react';

const inputCls =
  'w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-xs ' +
  'text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] ' +
  'focus:outline-none focus:ring-1 focus:ring-[var(--icon-cyan-text)] disabled:opacity-60 resize-none';

export const ClinicalNotesSummary: React.FC<{
  impression: string;
  onEdit?: () => void;
  editDisabled?: boolean;
}> = ({ impression, onEdit, editDisabled }) => (
  <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-3.5">
    <div className="mb-2 flex items-start justify-between gap-2">
      <label className="mb-0 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
        <Stethoscope className="w-3 h-3" />
        Clinical notes
      </label>
      {onEdit && (
        <button type="button" onClick={onEdit} disabled={editDisabled}
          className="inline-flex items-center gap-1 rounded-md border border-[var(--border-color)] px-2 py-1 text-[10px] font-semibold text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-bg)] disabled:opacity-50">
          <ClipboardList className="w-3 h-3" /> Edit notes
        </button>
      )}
    </div>
    {impression.trim() ? (
      <p className="text-[11px] leading-relaxed whitespace-pre-wrap text-[var(--text-primary)]">{impression}</p>
    ) : (
      <p className="text-[11px] text-[var(--text-tertiary)]">No clinical impression recorded yet.</p>
    )}
  </div>
);

interface ClinicalNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  value: string;
  onSave: (next: string) => void;
  readOnly?: boolean;
}

export const ClinicalNotesModal: React.FC<ClinicalNotesModalProps> = ({
  isOpen,
  onClose,
  value,
  onSave,
  readOnly = false,
}) => {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (isOpen) setDraft(value);
    // The draft seeds once per open; later value changes are the draft itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="clinical-notes-title"
        className="relative w-full max-w-xl rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-xl flex flex-col"
      >
        <div className="flex items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-main)] px-5 py-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--icon-cyan-bg)] flex items-center justify-center">
              <ClipboardList className="h-4 w-4 text-[var(--icon-cyan-text)]" />
            </div>
            <div>
              <h2 id="clinical-notes-title" className="text-sm font-bold text-[var(--text-primary)]">Clinical notes</h2>
              <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                The impression reached for this visit, kept apart from the history and examination
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"
            className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-color)] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          {readOnly && (
            <p className="mb-4 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-[11px] text-[var(--text-secondary)]">
              This clinical record is signed and finalized, so the notes are read-only.
            </p>
          )}
          <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
            <FileText className="w-3 h-3" />
            Clinical impression
          </label>
          <textarea
            value={draft}
            rows={8}
            disabled={readOnly}
            placeholder="Working or final clinical impression…"
            onChange={(e) => setDraft(e.target.value)}
            className={inputCls}
          />
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[var(--border-color)] bg-[var(--bg-main)] px-5 py-4 flex-shrink-0">
          <p className="text-[10px] text-[var(--text-tertiary)]">
            Changes stay on the page until you press Save Clinical.
          </p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose}
              className="rounded-lg border border-[var(--border-color)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-card)] transition-colors">
              Cancel
            </button>
            <button type="button" disabled={readOnly}
              onClick={() => { onSave(draft); onClose(); }}
              className="rounded-lg bg-[var(--icon-cyan-text)] px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-40 transition-all">
              Save notes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
