import {
  ArrowDownLeft, ArrowUpRight, CalendarDays, CheckCircle2, Clock3,
  FileHeart, Hash, XCircle,
} from 'lucide-react';

const STATUS: Record<string, { label: string; Icon: any; tone: string }> = {
  pending: { label: 'Pending', Icon: Clock3, tone: 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]' },
  accepted: { label: 'Accepted', Icon: CheckCircle2, tone: 'bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)]' },
  completed: { label: 'Completed', Icon: CheckCircle2, tone: 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]' },
  cancelled: { label: 'Cancelled', Icon: XCircle, tone: 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]' },
};

const URGENCY: Record<string, { label: string; tone: string }> = {
  routine: { label: 'Routine', tone: 'border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)]' },
  urgent: { label: 'Urgent', tone: 'border-[var(--icon-yellow-text)]/30 bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]' },
  stat: { label: 'STAT', tone: 'border-[var(--icon-red-text)]/30 bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]' },
};

function formatDate(value: any) {
  if (!value) return 'Date not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function patientName(referral: any) {
  const patient = referral?.patient || {};
  return [patient.surname, patient.otherNames].filter(Boolean).join(' ').trim()
    || patient.fullName || patient.name || 'Patient not linked';
}

function initials(name: string) {
  return name.split(/\\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'P';
}

export default function ReferralContextHeader({
  referral, eyebrow = 'Patient referral', subtitle,
}: {
  referral: any; eyebrow?: string; subtitle?: string;
}) {
  const outgoing = referral?.referralType !== 'incoming';
  const name = patientName(referral);
  const status = STATUS[referral?.status] || STATUS.pending;
  const urgency = URGENCY[referral?.urgency] || URGENCY.routine;
  const StatusIcon = status.Icon;
  const DirectionIcon = outgoing ? ArrowUpRight : ArrowDownLeft;

  return (
    <div className={`relative overflow-hidden border-b border-[var(--border-color)] px-4 py-4 sm:px-6 sm:py-5 ${outgoing ? 'bg-[var(--icon-blue-bg)]/35' : 'bg-[var(--icon-green-bg)]/35'}`}>
      <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full border-[24px] border-[var(--bg-card)]/25" />
      <div className="relative flex items-start gap-3 sm:gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] text-sm font-bold text-[var(--icon-cyan-text)] shadow-sm sm:h-14 sm:w-14">
          {initials(name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
              <FileHeart className="h-3.5 w-3.5" /> {eyebrow}
            </span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${outgoing ? 'bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)]' : 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]'}`}>
              <DirectionIcon className="h-3 w-3" /> {outgoing ? 'Outgoing' : 'Incoming'}
            </span>
          </div>
          <h2 className="break-words text-lg font-bold leading-tight text-[var(--text-primary)] sm:text-2xl">{name}</h2>
          {subtitle && <p className="mt-1 text-xs text-[var(--text-secondary)]">{subtitle}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-[var(--text-secondary)]">
            <span className="inline-flex items-center gap-1 font-mono font-semibold text-[var(--text-primary)]">
              <Hash className="h-3.5 w-3.5 text-[var(--text-tertiary)]" /> {referral?.referralNumber || 'Reference pending'}
            </span>
            <span className="hidden h-1 w-1 rounded-full bg-[var(--text-tertiary)] sm:block" />
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5 text-[var(--text-tertiary)]" /> {formatDate(referral?.referralDate || referral?.createdAt)}
            </span>
            {(outgoing ? referral?.referredToFacility : referral?.referredFromFacility) && (
              <>
                <span className="hidden h-1 w-1 rounded-full bg-[var(--text-tertiary)] sm:block" />
                <span className="max-w-full truncate">{outgoing ? referral.referredToFacility : referral.referredFromFacility}</span>
              </>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.tone}`}>
              <StatusIcon className="h-3.5 w-3.5" /> {status.label}
            </span>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${urgency.tone}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${referral?.urgency === 'stat' ? 'animate-pulse bg-[var(--icon-red-text)]' : referral?.urgency === 'urgent' ? 'bg-[var(--icon-yellow-text)]' : 'bg-[var(--text-tertiary)]'}`} />
              {urgency.label}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
