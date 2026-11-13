// components/referral/ReferralDetailModal.tsx — referral details, one fact in one place.
// DEDUP RULE: every value is rendered exactly once.
//   Patient name  -> hero only.  Folder / age / sex / contact / address / next of kin -> Patient only.
//   Facility / doctor / visit / created-by / reason -> Referral only.
//   Part I renders WITHOUT its Patient block (already in Patient) and WITHOUT
//     reasonForReferral (already in Referral). Part II skips institutionName when
//     it is the same facility already shown in Referral. Outcome shows only outcomeNotes.
// Same props as before (open, referral, onClose, onPrint). var(--*) tokens only.
import { useEffect, useMemo } from 'react';
import {
  X, Printer, User, Hash, Calendar, Building,
  Clock, CheckCircle, Check, XCircle, ArrowUpRight, ArrowDownLeft,
  FileText, MessageSquare, ClipboardList, BadgeCheck, Activity, ChevronRight,
} from 'lucide-react';
import { ReferralPartReadOnly } from './ReferralStructuredParts';
import {
  PART_I_SECTIONS, PART_II_SECTIONS, partHasContent, readPartI, readPartII,
} from './referralForm';
import type { FieldSection } from './referralForm';

type Referral = any;

const isEmpty = (v: any) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
const fmtDate = (v: any) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : String(v);
};
const ageFromDob = (dob: any) => {
  if (!dob) return '';
  const d = new Date(dob); if (!Number.isFinite(d.getTime())) return '';
  const now = new Date(); let y = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) y -= 1;
  return y >= 0 && y <= 125 ? `${y} yrs` : '';
};
const initials = (n: string) => n.split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? '').join('') || '?';
const titleCase = (s: any) =>
  String(s ?? '').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()).trim();
const humanize = (s: any) =>
  titleCase(String(s ?? '').replace(/_/g, ' ').replace(/-/g, ' '));
const nameOf = (p: any) =>
  p ? titleCase([p.surname, p.otherNames].filter(Boolean).join(' ') || p.fullName || p.name || 'Unnamed patient') : '—';
const sameText = (a: any, b: any) => String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase() && String(a ?? '').trim() !== '';

/** Drop whole sections / fields from a part that are already shown elsewhere. */
const withoutKeys = (sections: FieldSection[], skipKeys: string[], skipSections: string[] = []): FieldSection[] =>
  sections
    .filter((s) => !skipSections.includes(s.title))
    .map((s) => ({ ...s, fields: s.fields.filter((f) => !skipKeys.includes(f.key)) }))
    .filter((s) => s.fields.length > 0);

const STATUS: Record<string, { label: string; cls: string; Icon: any }> = {
  pending: { label: 'Pending', cls: 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]', Icon: Clock },
  accepted: { label: 'Accepted', cls: 'bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)]', Icon: Check },
  completed: { label: 'Completed', cls: 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]', Icon: CheckCircle },
  cancelled: { label: 'Cancelled', cls: 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]', Icon: XCircle },
};
const URGENCY: Record<string, { label: string; cls: string; dot: string }> = {
  routine: { label: 'Routine', cls: 'bg-[var(--bg-main)] text-[var(--text-secondary)] border border-[var(--border-color)]', dot: 'bg-[var(--text-tertiary)]' },
  urgent: { label: 'Urgent', cls: 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)] border border-[var(--icon-yellow-text)]/30', dot: 'bg-[var(--icon-yellow-text)]' },
  stat: { label: 'STAT', cls: 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] border border-[var(--icon-red-text)]/30', dot: 'bg-[var(--icon-red-text)]' },
};

function Field({ label, value, mono = false }: { label: string; value: any; mono?: boolean }) {
  if (isEmpty(value)) return null;
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium text-[var(--text-tertiary)]">{label}</dt>
      <dd className={`mt-0.5 text-[13px] font-semibold text-[var(--text-primary)] break-words ${mono ? 'font-mono' : ''}`}>{String(value)}</dd>
    </div>
  );
}

function Section({ icon: Icon, title, subtitle, children, tone = 'cyan' }: any) {
  return (
    <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden">
      <header className="flex items-center gap-2.5 px-4 sm:px-5 py-3 border-b border-[var(--border-color)] bg-[var(--bg-main)]/60">
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${tone === 'green' ? 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]' : 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]'}`}>
          <Icon className="w-4 h-4" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-[var(--text-primary)] leading-tight">{title}</h3>
          {subtitle && <p className="text-[11px] text-[var(--text-secondary)] leading-tight">{subtitle}</p>}
        </div>
      </header>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export default function ReferralDetailModal({ open, referral, onClose, onPrint }: {
  open: boolean; referral: Referral | null; onClose: () => void; onPrint?: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [open, onClose]);

  const r = referral;
  const timeline = useMemo(() => {
    if (!r) return [];
    const steps = [
      { key: 'pending', label: 'Referral created', date: r.referralDate || r.createdAt, done: true },
      { key: 'accepted', label: 'Accepted by receiving facility', date: r.acceptedAt || r.updatedAt, done: ['accepted', 'completed'].includes(r.status) },
      { key: 'completed', label: 'Completed', date: r.completedAt, done: r.status === 'completed' },
    ];
    return r.status === 'cancelled'
      ? [{ key: 'cancelled', label: 'Referral cancelled', date: r.updatedAt, done: true }]
      : steps;
  }, [r]);

  if (!open || !r) return null;

  const p = r.patient || {};
  const patientName = nameOf(p);
  const outgoing = r.referralType !== 'incoming';
  const status = STATUS[r.status] || STATUS.pending;
  const urgency = URGENCY[r.urgency] || URGENCY.routine;
  const StatusIcon = status.Icon;
  const facility = outgoing ? r.referredToFacility : r.referredFromFacility;
  const doctor = outgoing ? r.referredToDoctor : r.referredFromDoctor;

  const partI = readPartI(r.structuredForm?.partI ?? r.partI);
  const partII = readPartII(r.structuredForm?.partII ?? r.partII);
  const showPartI = partHasContent(r.structuredForm?.partI ?? r.partI);
  const showPartII = partHasContent(r.structuredForm?.partII ?? r.partII);
  // Part I without what Patient / Referral already show. Reason lives in Referral below.
  const partISections = withoutKeys(PART_I_SECTIONS, ['reasonForReferral'], ['Patient']);
  // Part II without the institution name when it duplicates the facility above.
  const partIISections = sameText(partII.institutionName, facility)
    ? withoutKeys(PART_II_SECTIONS, ['institutionName'])
    : PART_II_SECTIONS;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6" role="dialog" aria-modal="true" aria-label="Referral details">
      <button aria-label="Close details" onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-[var(--bg-main)] rounded-t-3xl sm:rounded-3xl border border-[var(--border-color)] shadow-2xl overflow-hidden">

        {/* ── Hero: name + referral identity + badges ONLY ── */}
        <div className={`shrink-0 px-4 sm:px-6 pt-4 sm:pt-5 pb-4 border-b border-[var(--border-color)] ${outgoing ? 'bg-[var(--icon-blue-bg)]/40' : 'bg-[var(--icon-green-bg)]/40'}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center text-base font-bold text-[var(--icon-cyan-text)] shrink-0 shadow-sm">
                {initials(patientName)}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] truncate">{patientName}</h2>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${outgoing ? 'bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)]' : 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]'}`}>
                    {outgoing ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}{outgoing ? 'Outgoing' : 'Incoming'}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="inline-flex items-center gap-1"><Hash className="w-3 h-3" />{r.referralNumber || '—'}</span>
                  <span>·</span><span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{fmtDate(r.referralDate)}</span>
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${status.cls}`}><StatusIcon className="w-3.5 h-3.5" />{status.label}</span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${urgency.cls}`}><span className={`w-1.5 h-1.5 rounded-full ${urgency.dot} ${r.urgency === 'stat' ? 'animate-pulse' : ''}`} />{urgency.label}</span>
                </div>
              </div>
            </div>
            <button onClick={onClose} aria-label="Close" className="shrink-0 w-9 h-9 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Body: each fact once ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4" style={{ scrollbarWidth: 'thin' }}>

          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 sm:px-5 py-4">
            <p className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5 mb-3"><Activity className="w-3.5 h-3.5 text-[var(--icon-cyan-text)]" /> Progress</p>
            <ol className="flex flex-col sm:flex-row sm:items-center gap-3">
              {timeline.map((s, i) => (
                <li key={s.key} className="flex sm:flex-1 items-center gap-2 min-w-0">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 ${s.done ? 'bg-[var(--icon-green-bg)] border-[var(--icon-green-text)] text-[var(--icon-green-text)]' : 'border-[var(--border-color)] text-[var(--text-tertiary)]'}`}>
                    {s.done ? <Check className="w-3.5 h-3.5" /> : <span className="w-2 h-2 rounded-full bg-[var(--text-tertiary)]" />}
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-xs font-semibold truncate ${s.done ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}`}>{s.label}</span>
                    <span className="block text-[11px] text-[var(--text-tertiary)]">{s.date ? fmtDate(s.date) : 'Not yet'}</span>
                  </span>
                  {i < timeline.length - 1 && <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)] hidden sm:block shrink-0" />}
                </li>
              ))}
            </ol>
          </div>

          {/* Patient — the ONLY place for demographics (name itself lives in the hero) */}
          <Section icon={User} title="Patient" subtitle="From the patient register">
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
              <Field label="Folder #" value={p.folderNumber} mono />
              <Field label="Date of birth" value={fmtDate(p.dateOfBirth || p.dob)} />
              <Field label="Age" value={p.ageDisplay || p.age || ageFromDob(p.dateOfBirth || p.dob)} />
              <Field label="Sex" value={humanize(p.gender || p.sex)} />
              <Field label="Contact" value={p.contact || p.phone || p.phoneNumber} />
              <Field label="Address" value={p.address || p.residentialAddress} />
              <Field label="Occupation" value={p.occupation} />
              <Field label="Marital status" value={p.maritalStatus} />
              <Field label="Next of kin" value={p.nextOfKin ? `${p.nextOfKin.name || ''}${p.nextOfKin.relationship ? ` (${p.nextOfKin.relationship})` : ''}${p.nextOfKin.contact || p.nextOfKin.phone ? ` · ${p.nextOfKin.contact || p.nextOfKin.phone}` : ''}`.trim() : p.nextOfKinName} />
            </dl>
          </Section>

          {/* Referral — the ONLY place for destination / visit / reason / created-by */}
          <Section icon={Building} title={outgoing ? 'Referred to' : 'Referred from'} subtitle={outgoing ? 'Receiving facility' : 'Sending facility'}>
            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4">
              <Field label="Facility" value={facility} />
              <Field label={outgoing ? 'Receiving doctor' : 'Referring doctor'} value={doctor} />
              <Field label="Department" value={humanize(r.referredToDepartment || r.referredFromDepartment)} />
              <Field label="Visit" value={r.attendance ? `${r.attendance.attendanceNumber || ''}${r.attendance.attendanceType ? ` · ${humanize(r.attendance.attendanceType)}` : ''}`.trim() : undefined} />
              <Field label="Referred by" value={r.createdBy ? `${titleCase(r.createdBy.fullName)}${r.createdBy.role ? ` · ${humanize(r.createdBy.role)}` : ''}` : undefined} />
            </dl>
            {(r.referralReason || partI.reasonForReferral) && (
              <div className="mt-4 border-t border-[var(--border-color)] pt-4">
                <p className="text-[11px] font-medium text-[var(--text-tertiary)] flex items-center gap-1.5 mb-1"><FileText className="w-3 h-3" /> Reason for referral</p>
                <p className="text-sm leading-relaxed text-[var(--text-primary)] whitespace-pre-wrap">{partI.reasonForReferral || r.referralReason}</p>
              </div>
            )}
            {r.referralNotes && (
              <div className="mt-4 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] p-3.5">
                <p className="text-[11px] font-semibold text-[var(--text-tertiary)] flex items-center gap-1.5 mb-1"><MessageSquare className="w-3 h-3" /> Additional notes</p>
                <p className="text-[13px] leading-relaxed text-[var(--text-primary)] whitespace-pre-wrap">{r.referralNotes}</p>
              </div>
            )}
          </Section>

          {/* Part I — clinical detail only; Patient + Reason already shown above */}
          {showPartI && (
            <Section icon={ClipboardList} title="Part I — Referral by the health worker" subtitle="Clinical summary, request & signature">
              <ReferralPartReadOnly sections={partISections} values={partI} hideEmpty />
            </Section>
          )}

          {/* Part II — report back only; facility name skipped if already shown above */}
          {showPartII && (
            <Section icon={ClipboardList} title="Part II — Report back by the receiving facility" subtitle="Findings, actions & disposition" tone="green">
              <ReferralPartReadOnly sections={partIISections} values={partII} hideEmpty />
            </Section>
          )}

          {/* Outcome — ONLY outcomeNotes; created-by / created date already in Referral */}
          {r.outcomeNotes && (
            <Section icon={BadgeCheck} title="Outcome">
              <p className="text-sm leading-relaxed text-[var(--text-primary)] whitespace-pre-wrap">{r.outcomeNotes}</p>
            </Section>
          )}

          {!showPartI && !showPartII && !r.referralReason && !r.outcomeNotes && (
            <p className="text-center text-xs text-[var(--text-tertiary)] py-2">No structured Part I / Part II form was saved with this referral.</p>
          )}
        </div>

        {/* ── Footer: actions only — ref / date already in the hero ── */}
        <div className="shrink-0 px-4 sm:px-6 py-4 border-t border-[var(--border-color)] bg-[var(--bg-card)] flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-sm font-semibold text-[var(--text-primary)]">Close</button>
          {onPrint && (
            <button onClick={onPrint} className="px-4 py-2 rounded-lg bg-[var(--icon-cyan-text)] text-white text-sm font-semibold inline-flex items-center gap-2 hover:opacity-90">
              <Printer className="w-4 h-4" /> Print referral
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
