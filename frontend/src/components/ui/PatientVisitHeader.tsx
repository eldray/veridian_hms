import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { User } from 'lucide-react';
import { Badge, humanStatus, statusTone } from './Badge';
import { accentVar, type Accent } from './accent';
import { cn } from './cn';
import { getPatientName, getPatientFolderNumber, getAttendanceNumber } from '../../utils/patient';
import { PatientAvatar } from '../patients/PatientAvatar';

export interface HeaderField {
  label: string;
  value: ReactNode;
  mono?: boolean;
  tone?: 'default' | 'money' | 'moneyZero' | 'pill';
}

export interface PatientVisitHeaderProps {
  patient: any;
  attendance: any;
  icon?: LucideIcon;
  accent?: Accent;
  fields?: HeaderField[];
  aside?: ReactNode;
}

/* ── Field cell ─────────────────────────────────────────────────────── */

const Field = ({ label, value, mono, tone = 'default' }: HeaderField) => {
  const isEmpty = value == null || value === '' || value === '—';

  if (tone === 'pill') {
    return (
      <div className="flex flex-col gap-1 min-w-0">
        <span className="text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)] leading-none">
          {label}
        </span>
        <span
          className={cn(
            'inline-flex items-center self-start rounded px-2 py-0.5 whitespace-nowrap',
            'text-[10px] font-semibold uppercase tracking-wide leading-tight',
            'bg-[var(--bg-subtle,rgba(148,163,184,0.12))] text-[var(--text-secondary)]',
            'border border-[var(--border-color)]',
          )}
        >
          {value ?? '—'}
        </span>
      </div>
    );
  }

  const moneyColor = isEmpty
    ? 'text-[var(--text-tertiary)]'
    : tone === 'moneyZero'
      ? 'text-[var(--icon-green-text)]'
      : 'text-[var(--text-primary)]';

  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span className="text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)] leading-none">
        {label}
      </span>
      <span
        className={cn(
          'leading-tight truncate tabular-nums',
          tone === 'money' || tone === 'moneyZero'
            ? cn('text-[13px] font-bold', moneyColor)
            : 'text-[12.5px] font-semibold text-[var(--text-primary)]',
          mono && 'font-mono text-[12px] tracking-tight',
        )}
        title={typeof value === 'string' ? value : undefined}
      >
        {value ?? '—'}
      </span>
    </div>
  );
};

/* ── Helpers ────────────────────────────────────────────────────────── */

const sexLabel = (gender?: string) =>
  gender === 'male' ? 'Male' : gender === 'female' ? 'Female' : '—';

const yearsOld = (patient: any): string => {
  const stated = Number(patient?.age);
  if (Number.isFinite(stated) && stated > 0) return `${stated} yrs`;
  const dob = patient?.dateOfBirth;
  if (!dob) return '—';
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return '—';
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age--;
  return `${age} yrs`;
};

const visitDate = (attendance: any): string => {
  const raw = attendance?.dateTime || attendance?.createdAt;
  if (!raw) return '—';
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString();
};

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

/* ── Component ──────────────────────────────────────────────────────── */

export function PatientVisitHeader({
  patient,
  attendance,
  icon: Icon = User,
  accent = 'indigo',
  fields,
  aside,
}: PatientVisitHeaderProps) {
  const ward = attendance?.Bed?.Ward?.wardName || attendance?.Ward?.wardName;

  const base: HeaderField[] = [
    // Split Sex and Age into separate fields
    { label: 'Sex', value: sexLabel(patient?.gender) },
    { label: 'Age', value: yearsOld(patient) },
    { label: 'Folder No.', value: getPatientFolderNumber(patient) || '—', mono: true },
    { label: 'Visit No.', value: getAttendanceNumber(attendance) || 'New Visit', mono: true },
    { label: 'Visit Date', value: visitDate(attendance) },
    ...(patient?.contact ? [{ label: 'Phone', value: patient.contact }] : []),
    ...(ward
      ? [{
          label: 'Location',
          value: attendance?.Bed?.bedNumber
            ? `${ward} · Bed ${attendance.Bed.bedNumber}`
            : ward,
        }]
      : []),
  ];

  const extra = (fields ?? []).map<HeaderField>((f) => {
    if (f.tone) return f;
    const l = f.label.toLowerCase();
    if (l === 'payment' || l === 'payment mode' || l.includes('method')) {
      return { ...f, label: 'Payment Mode', tone: 'pill' };
    }
    if (l === 'balance') {
      const n = Number(String(f.value ?? '').replace(/[^0-9.-]/g, ''));
      return { ...f, tone: Number.isFinite(n) && n === 0 ? 'moneyZero' : 'money' };
    }
    return f;
  });

  const isFinancial = (f: HeaderField) =>
    f.tone === 'pill' || f.tone === 'money' || f.tone === 'moneyZero';
  const facts = [...base, ...extra.filter((f) => !isFinancial(f))];
  const financials = extra.filter(isFinancial);

  const displayName = getPatientName(patient);
  const initials = initialsOf(displayName);

  return (
    <div
      className={cn(
        'group relative bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)]',
        'shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_3px_rgba(16,24,40,0.06)]',
        'overflow-hidden',
      )}
    >
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[2px] opacity-60"
        style={{
          background: `linear-gradient(90deg, transparent, ${accentVar(accent, 'text')}, transparent)`,
        }}
      />

      <div className="flex flex-col sm:flex-row sm:items-stretch">
        {/* ── Zone 1: identity ─────────────────────────────────────────── */}
        <div className="flex items-center gap-2.5 px-4 py-3 sm:flex-shrink-0 sm:max-w-[280px]">
          <PatientAvatar
            imageUrl={patient?.imageUrl}
            name={displayName}
            size="md"
            className="rounded-lg border bg-[var(--icon-cyan-bg)]"
            fallbackClassName="text-[var(--icon-cyan-text)]"
            fallbackText={initials}
            fallbackIcon={Icon}
          />
          <div className="min-w-0">
            <h2 className="font-bold text-[var(--text-primary)] text-[14px] leading-tight truncate">
              {displayName || 'Unnamed patient'}
            </h2>
            <span className="block text-[10.5px] text-[var(--text-secondary)] leading-tight mt-0.5 truncate">
              {sexLabel(patient?.gender)} · {yearsOld(patient)}
              {ward && <span className="text-[var(--text-tertiary)]"> · {ward}</span>}
            </span>
          </div>
        </div>

        {/* ── Zone 2: facts + locked financial pair ────────────────────── */}
        <div
          className={cn(
            'min-w-0 px-4 pb-3 sm:py-3 sm:flex-1',
            'border-t border-[var(--border-color)] sm:border-t-0 sm:border-l',
            // Changed to justify-between to stretch the items evenly
            'flex flex-wrap items-center justify-between gap-x-5 gap-y-2.5',
          )}
        >
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2.5">
            {facts.map((field) => (
              <Field key={field.label} {...field} />
            ))}
          </div>

          {/* Payment Mode + Balance: flex-nowrap pair, pinned right */}
          {financials.length > 0 && (
            <div
              className={cn(
                'flex flex-nowrap items-start gap-x-5',
                'sm:pl-5 sm:border-l sm:border-[var(--border-color)]',
              )}
            >
              {financials.map((field) => (
                <Field key={field.label} {...field} />
              ))}
            </div>
          )}
        </div>

        {/* ── Zone 3: aside ───────────────────────────────────────────── */}
        <div
          className={cn(
            'flex items-center gap-2 px-4 pb-3 sm:py-3 sm:flex-shrink-0',
            'border-t border-[var(--border-color)] sm:border-t-0 sm:border-l',
          )}
        >
          {attendance?.status && (
            <Badge tone={statusTone(attendance.status)} dot size="sm">
              {humanStatus(attendance.status)}
            </Badge>
          )}
          {aside}
        </div>
      </div>
    </div>
  );
}

export default PatientVisitHeader;