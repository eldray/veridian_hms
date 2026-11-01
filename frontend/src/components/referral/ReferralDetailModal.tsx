// src/components/referral/ReferralDetailModal.tsx
import { ClipboardList, Printer, X } from 'lucide-react';
import { ReferralPartReadOnly } from './ReferralStructuredParts';
import { PART_I_SECTIONS, PART_II_SECTIONS, readPartI, readPartII, partHasContent } from './referralForm';

interface ReferralDetailModalProps {
  open: boolean;
  referral: any;
  onClose: () => void;
  onPrint?: () => void;
}

const Meta: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <div>
    <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">{label}</dt>
    <dd className="text-sm text-[var(--text-primary)] mt-0.5">{value || '—'}</dd>
  </div>
);

export default function ReferralDetailModal({ open, referral, onClose, onPrint }: ReferralDetailModalProps) {
  if (!open || !referral) return null;

  const structured = referral.structuredForm ?? {};
  const hasPartI = partHasContent(structured.partI);
  const hasPartII = partHasContent(structured.partII);
  const outgoing = referral.referralType === 'outgoing';
  const fullName = [referral.patient?.surname, referral.patient?.otherNames].filter(Boolean).join(' ').trim();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
        <div className="relative bg-[var(--bg-card)] rounded-2xl w-full max-w-3xl max-h-[94vh] flex flex-col overflow-hidden border border-[var(--border-color)] shadow-2xl">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 px-6 py-4 text-white flex-shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                  {outgoing ? 'Outgoing referral' : 'Incoming referral'}
                </p>
                <h2 className="text-base font-bold font-mono truncate">{referral.referralNumber}</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {fullName || 'Patient unavailable'} · status <span className="capitalize font-semibold">{referral.status}</span>
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {onPrint && (
                  <button
                    onClick={onPrint}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 text-white text-xs font-semibold hover:bg-cyan-600 transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print
                  </button>
                )}
                <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white" aria-label="Close">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-5" style={{ scrollbarWidth: 'thin' }}>
            <section className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] p-4">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-2.5">Referral</h4>
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3">
                <Meta label={outgoing ? 'Referred to' : 'Referred from'} value={outgoing ? referral.referredToFacility : referral.referredFromFacility} />
                <Meta label="Urgency" value={<span className="capitalize">{referral.urgency}</span>} />
                <Meta label="Date" value={referral.referralDate ? new Date(referral.referralDate).toLocaleDateString() : undefined} />
                <Meta label="Visit" value={referral.attendance?.attendanceNumber} />
                <Meta label="Folder no." value={referral.patient?.folderNumber} />
                <Meta label="Doctor" value={outgoing ? referral.referredToDoctor : referral.referredFromDoctor} />
                <Meta label="Department" value={referral.referredToDepartment} />
                <Meta label="Raised by" value={referral.createdBy?.fullName} />
              </dl>
              {referral.referralReason && (
                <div className="mt-3 pt-3 border-t border-[var(--border-color)]">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Reason for referral</p>
                  <p className="text-sm text-[var(--text-primary)] mt-1 whitespace-pre-wrap">{referral.referralReason}</p>
                </div>
              )}
              {referral.referralNotes && (
                <div className="mt-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Additional notes</p>
                  <p className="text-sm text-[var(--text-secondary)] mt-1 whitespace-pre-wrap">{referral.referralNotes}</p>
                </div>
              )}
            </section>

            {hasPartI ? (
              <section className="rounded-xl border border-cyan-200 bg-cyan-50/40 p-4">
                <h4 className="flex items-center gap-2 text-sm font-bold text-cyan-800 mb-3">
                  <ClipboardList className="w-4 h-4" />
                  Part I — Referral by the health worker
                </h4>
                <ReferralPartReadOnly sections={PART_I_SECTIONS} values={readPartI(structured.partI)} />
              </section>
            ) : (
              <p className="text-xs text-[var(--text-tertiary)] italic">
                No Part I was captured for this referral — only the summary fields above are available.
              </p>
            )}

            <section className="rounded-xl border border-green-200 bg-green-50/40 p-4">
              <h4 className="flex items-center gap-2 text-sm font-bold text-green-800 mb-3">
                <ClipboardList className="w-4 h-4" />
                Part II — Report back by the receiving facility
              </h4>
              {hasPartII ? (
                <ReferralPartReadOnly sections={PART_II_SECTIONS} values={readPartII(structured.partII)} />
              ) : (
                <p className="text-xs text-[var(--text-secondary)]">
                  {referral.status === 'pending'
                    ? 'Awaiting the receiving facility — capture this when the referral is accepted.'
                    : 'No report back recorded.'}
                </p>
              )}
              {referral.outcomeNotes && (
                <div className="mt-3 pt-3 border-t border-green-100">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Outcome notes</p>
                  <p className="text-sm text-[var(--text-primary)] mt-1 whitespace-pre-wrap">{referral.outcomeNotes}</p>
                </div>
              )}
            </section>
          </div>

          <div className="px-6 py-4 border-t border-[var(--border-color)] bg-[var(--bg-card)] flex justify-end flex-shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-[var(--border-color)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-main)] text-sm font-medium transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
