// src/components/referral/ReferralReportBackModal.tsx
// Colours: var(--*) tokens only — no hard-coded Tailwind palette colours.
// Logic, validation and props unchanged.
import { useState } from 'react';
import { CheckCircle, ClipboardList, Loader2, X } from 'lucide-react';
import { ReferralPartFields } from './ReferralStructuredParts';
import { PART_II_SECTIONS, missingRequired } from './referralForm';

interface ReportBackModalProps {
  open: boolean;
  referral: any;
  /** Prefilled by the caller with the signed-in clinician and their facility. */
  values: Record<string, string>;
  onValuesChange: (values: Record<string, string>) => void;
  onClose: () => void;
  onSubmit: (partII: Record<string, string>) => Promise<void> | void;
  submitting?: boolean;
}

export default function ReferralReportBackModal({
  open, referral, values, onValuesChange, onClose, onSubmit, submitting,
}: ReportBackModalProps) {
  const [errors, setErrors] = useState<string[]>([]);

  if (!open || !referral) return null;

  const handleChange = (key: string, value: string) => {
    onValuesChange({ ...values, [key]: value });
    if (errors.length) setErrors([]);
  };

  const handleConfirm = async () => {
    const missing = missingRequired(PART_II_SECTIONS, values);
    if (missing.length) {
      setErrors(missing);
      return;
    }
    await onSubmit(values);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={submitting ? undefined : onClose} />
      <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
        <div className="relative bg-[var(--bg-card)] rounded-2xl w-full max-w-2xl max-h-[94vh] flex flex-col overflow-hidden border border-[var(--border-color)] shadow-2xl">
          <div className="bg-[var(--icon-green-bg)]/60 border-b border-[var(--border-color)] px-6 py-4 text-[var(--text-primary)] flex-shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-[var(--icon-green-text)] font-semibold flex items-center gap-1.5">
                  <ClipboardList className="w-3.5 h-3.5" />
                  Part II — Report back
                </p>
                <h2 className="text-base font-bold truncate mt-0.5">Accept referral {referral.referralNumber}</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {[referral.patient?.surname, referral.patient?.otherNames].filter(Boolean).join(' ')} ·
                  raised {referral.referralDate ? new Date(referral.referralDate).toLocaleDateString() : 'unknown'}
                </p>
              </div>
              <button onClick={onClose} disabled={submitting} className="p-1.5 hover:bg-[var(--bg-main)] rounded-lg text-[var(--text-secondary)] disabled:opacity-50" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4" style={{ scrollbarWidth: 'thin' }}>
            <p className="text-xs text-[var(--text-secondary)]">
              The referral only moves to accepted once the receiving clinician records what was found and who is signing.
            </p>
            <ReferralPartFields
              sections={PART_II_SECTIONS}
              values={values}
              onChange={handleChange}
              tone="green"
            />
            {errors.length > 0 && (
              <div className="rounded-lg border border-[var(--icon-red-text)]/30 bg-[var(--icon-red-bg)] px-3 py-2.5">
                <p className="text-xs font-semibold text-[var(--icon-red-text)]">Complete these before accepting</p>
                <ul className="text-xs text-[var(--icon-red-text)] mt-1 list-disc list-inside space-y-0.5">
                  {errors.map(label => <li key={label}>{label}</li>)}
                </ul>
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-[var(--border-color)] bg-[var(--bg-card)] flex items-center justify-end gap-3 flex-shrink-0">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 border border-[var(--border-color)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-main)] text-sm font-medium transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2 text-white rounded-lg bg-[var(--icon-green-text)] hover:opacity-90 disabled:opacity-50 text-sm font-semibold shadow-sm transition-all"
            >
              {submitting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                : <><CheckCircle className="w-4 h-4" /> Accept referral</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
