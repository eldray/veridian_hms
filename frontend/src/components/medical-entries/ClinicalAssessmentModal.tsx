// src/components/medical-entries/ClinicalAssessmentModal.tsx
//
// The clinical assessment (complaints, history, ODQ, examination and the two structured
// system lists) is edited as one form, the same way diagnoses, labs and medications are.
// Saving the form only updates the page; "Save Clinical" persists it to the attendance.

import React, { useEffect, useMemo, useState } from 'react';
import { X, Stethoscope, FileText, History, Clock, ClipboardList, ScanLine } from 'lucide-react';
import ComplaintInput from '../ComplaintInput';
import ODQInput from './ODQInput';

export interface ClinicalAssessmentValue {
  complaints: string;
  history: string;
  odq: string;
  examination: string;
  reviewOfSystems: Record<string, string>;
  physicalExamStructured: Record<string, string>;
}

interface ClinicalAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (next: ClinicalAssessmentValue) => void;
  value: ClinicalAssessmentValue;
  readOnly?: boolean;
}

const REVIEW_SYSTEMS = [
  'General', 'Cardiovascular', 'Respiratory', 'Gastrointestinal', 'Genitourinary',
  'Neurological', 'Musculoskeletal', 'Skin', 'ENT/Eyes', 'Endocrine', 'Psychiatric', 'Other',
];

const EXAMINATION_SYSTEMS = [
  'General appearance', 'Cardiovascular', 'Respiratory', 'Abdomen', 'Neurological',
  'Musculoskeletal', 'Skin', 'ENT/Eyes', 'Other',
];

// Existing records store these keys; changing the derivation would orphan past entries.
const systemKey = (system: string) => system.toLowerCase().replace(/[^a-z]+/g, '_');

const inputCls =
  'w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-xs ' +
  'text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] ' +
  'focus:outline-none focus:ring-1 focus:ring-[var(--icon-cyan-text)] disabled:opacity-60 resize-none';

const SectionLabel: React.FC<{ icon: React.ReactNode; children: React.ReactNode }> = ({ icon, children }) => (
  <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
    {icon}
    {children}
  </label>
);

const SystemGrid: React.FC<{
  title: string;
  icon: React.ReactNode;
  systems: string[];
  values: Record<string, string>;
  placeholder: string;
  disabled: boolean;
  onChange: (next: Record<string, string>) => void;
}> = ({ title, icon, systems, values, placeholder, disabled, onChange }) => {
  const recorded = useMemo(
    () => Object.entries(values).filter(([, value]) => String(value || '').trim()).length,
    [values],
  );

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <SectionLabel icon={icon}>{title}</SectionLabel>
        <span className="text-[10px] text-[var(--text-tertiary)]">
          {recorded > 0 ? `${recorded} recorded` : 'None recorded'}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {systems.map((system) => {
          const key = systemKey(system);
          return (
            <label key={key} className="text-[11px] font-medium text-[var(--text-secondary)]">
              <span className="mb-1 block">{system}</span>
              <textarea
                value={values[key] || ''}
                rows={2}
                disabled={disabled}
                placeholder={placeholder}
                onChange={(e) => onChange({ ...values, [key]: e.target.value })}
                className={inputCls}
              />
            </label>
          );
        })}
      </div>
      <p className="mt-1 text-[10px] text-[var(--text-tertiary)]">
        Record only what was assessed. Leave unassessed systems blank.
      </p>
    </div>
  );
};

export const ClinicalAssessmentModal: React.FC<ClinicalAssessmentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  value,
  readOnly = false,
}) => {
  const [draft, setDraft] = useState<ClinicalAssessmentValue>(value);

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
        aria-labelledby="clinical-assessment-title"
        className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-xl flex flex-col"
      >
        <div className="flex items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-main)] px-5 py-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--icon-cyan-bg)] flex items-center justify-center">
              <Stethoscope className="h-4 w-4 text-[var(--icon-cyan-text)]" />
            </div>
            <div>
              <h2 id="clinical-assessment-title" className="text-sm font-bold text-[var(--text-primary)]">
                Clinical assessment
              </h2>
              <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                Presenting complaints, history, review of systems, examination and ODQ
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"
            className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-color)] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ scrollbarWidth: 'thin' }}>
          {readOnly && (
            <p className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-[11px] text-[var(--text-secondary)]">
              This clinical record is signed and finalized, so the assessment is read-only.
            </p>
          )}

          <div>
            <SectionLabel icon={<FileText className="w-3 h-3" />}>Presented complaints</SectionLabel>
            <ComplaintInput
              value={draft.complaints}
              onChange={(complaints) => setDraft((prev) => ({ ...prev, complaints }))}
              placeholder="Search or type complaints…"
              disabled={readOnly}
            />
          </div>

          <div>
            <SectionLabel icon={<History className="w-3 h-3" />}>History of presenting complaint</SectionLabel>
            <textarea
              value={draft.history}
              rows={4}
              disabled={readOnly}
              placeholder="History of presenting complaint…"
              onChange={(e) => setDraft((prev) => ({ ...prev, history: e.target.value }))}
              className={inputCls}
            />
          </div>

          <div>
            <SectionLabel icon={<Clock className="w-3 h-3" />}>ODQ (Onset · Duration · Quality)</SectionLabel>
            <ODQInput
              value={draft.odq}
              onChange={(odq) => setDraft((prev) => ({ ...prev, odq }))}
              disabled={readOnly}
            />
          </div>

          <div>
            <SectionLabel icon={<ScanLine className="w-3 h-3" />}>Physical examination</SectionLabel>
            <textarea
              value={draft.examination}
              rows={4}
              disabled={readOnly}
              placeholder="Physical examination findings…"
              onChange={(e) => setDraft((prev) => ({ ...prev, examination: e.target.value }))}
              className={inputCls}
            />
          </div>

          <SystemGrid
            title="Structured review of systems"
            icon={<ClipboardList className="w-3 h-3" />}
            systems={REVIEW_SYSTEMS}
            values={draft.reviewOfSystems}
            placeholder="Not assessed / symptoms and findings"
            disabled={readOnly}
            onChange={(reviewOfSystems) => setDraft((prev) => ({ ...prev, reviewOfSystems }))}
          />

          <SystemGrid
            title="Structured physical examination"
            icon={<Stethoscope className="w-3 h-3" />}
            systems={EXAMINATION_SYSTEMS}
            values={draft.physicalExamStructured}
            placeholder="Not examined / findings"
            disabled={readOnly}
            onChange={(physicalExamStructured) => setDraft((prev) => ({ ...prev, physicalExamStructured }))}
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
              Save assessment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const summarise = (values: Record<string, string>) =>
  Object.entries(values)
    .filter(([, value]) => String(value || '').trim())
    .map(([key, value]) => `${key.replace(/_/g, ' ')}: ${value}`)
    .join(' · ');

const SummaryLine: React.FC<{ label: string; text: string }> = ({ label, text }) => (
  <p className="mb-1 text-[11px] leading-relaxed text-[var(--text-primary)] last:mb-0">
    <span className="font-bold text-[var(--text-secondary)]">{label} — </span>
    <span className="whitespace-pre-wrap">{text}</span>
  </p>
);

export const ClinicalAssessmentSummary: React.FC<{
  value: ClinicalAssessmentValue;
  impression?: string;
  title?: string;
  onEdit?: () => void;
  editDisabled?: boolean;
}> = ({ value, impression, title = 'History & Examination', onEdit, editDisabled }) => {
  const complaints = value.complaints.split(',').map((c) => c.trim()).filter(Boolean);
  const review = summarise(value.reviewOfSystems);
  const examinationStructured = summarise(value.physicalExamStructured);
  const hasAnything =
    complaints.length > 0 || value.history.trim() || value.odq.trim() ||
    value.examination.trim() || review || examinationStructured || (impression || '').trim();

  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-3.5">
      <div className="flex items-start justify-between gap-2 mb-2">
        <SectionLabel icon={<Stethoscope className="w-3 h-3" />}>{title}</SectionLabel>
        {onEdit && (
          <button type="button" onClick={onEdit} disabled={editDisabled}
            className="inline-flex items-center gap-1 rounded-md border border-[var(--border-color)] px-2 py-1 text-[10px] font-semibold text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-bg)] disabled:opacity-50">
            <ClipboardList className="w-3 h-3" /> Edit assessment
          </button>
        )}
      </div>

      {!hasAnything ? (
        <p className="text-[11px] text-[var(--text-tertiary)]">
          No clinical assessment recorded yet.
        </p>
      ) : (
        <div className="space-y-1">
          {complaints.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {complaints.map((complaint) => (
                <span key={complaint}
                  className="px-2 py-0.5 rounded-full bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] text-[10px] font-semibold">
                  {complaint}
                </span>
              ))}
            </div>
          )}
          {value.history.trim() && <SummaryLine label="History" text={value.history} />}
          {value.odq.trim() && <SummaryLine label="ODQ" text={value.odq} />}
          {value.examination.trim() && <SummaryLine label="Examination" text={value.examination} />}
          {review && <SummaryLine label="Review of systems" text={review} />}
          {examinationStructured && <SummaryLine label="Structured findings" text={examinationStructured} />}
          {(impression || '').trim() && <SummaryLine label="Impression" text={impression || ''} />}
        </div>
      )}
    </div>
  );
};
