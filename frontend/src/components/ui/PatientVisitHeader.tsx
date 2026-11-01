import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { User } from 'lucide-react';
import { Badge, humanStatus, statusTone } from './Badge';
import { accentVar, type Accent } from './accent';
import { cn } from './cn';
import { getPatientName } from '../../utils/patient';

export interface HeaderField {
  label: string;
  value: ReactNode;
  /** Numbers that must not be re-flowed (folder and visit numbers). */
  mono?: boolean;
}

export interface PatientVisitHeaderProps {
  patient: any;
  attendance: any;
  icon?: LucideIcon;
  accent?: Accent;
  /** Additional labelled data shown after the standard identity fields. */
  fields?: HeaderField[];
  /** Chips and buttons on the right, e.g. payment mode or the page's own actions. */
  aside?: ReactNode;
}

const Field = ({ label, value, mono }: HeaderField) => (
  <div className="min-w-0">
    <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] leading-none">
      {label}
    </p>
    <p className={cn('text-xs font-semibold text-[var(--text-primary)] mt-1.5 truncate', mono && 'font-mono')}>
      {value ?? '—'}
    </p>
  </div>
);

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

/**
 * Who the clinician is working on, and which visit. Every number is labelled so a folder
 * number can never be mistaken for an attendance number.
 */
export function PatientVisitHeader({
  patient,
  attendance,
  icon: Icon = User,
  accent = 'indigo',
  fields,
  aside,
}: PatientVisitHeaderProps) {
  const ward = attendance?.Bed?.Ward?.wardName || attendance?.Ward?.wardName;
  const identity: HeaderField[] = [
    { label: 'Folder No.', value: patient?.folderNumber || '—', mono: true },
    { label: 'Visit No.', value: attendance?.attendanceNumber || 'New Visit', mono: true },
    { label: 'Visit Date', value: visitDate(attendance) },
    ...(patient?.contact ? [{ label: 'Phone', value: patient.contact }] : []),
    ...(ward
      ? [{ label: 'Location', value: attendance?.Bed?.bedNumber ? `${ward} · Bed ${attendance.Bed.bedNumber}` : ward }]
      : []),
    ...(fields || []),
  ];

  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
      <div className="px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          {/* Name and the two facts that identify the person, not the record. */}
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-11 h-11 rounded-xl border border-[var(--border-color)] flex items-center justify-center flex-shrink-0"
              style={{ background: accentVar(accent, 'bg'), color: accentVar(accent, 'text') }}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-[var(--text-primary)] text-base leading-tight truncate">
                {getPatientName(patient)}
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                {sexLabel(patient?.gender)} · {yearsOld(patient)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {attendance?.status && (
              <Badge tone={statusTone(attendance.status)} dot size="sm">
                {humanStatus(attendance.status)}
              </Badge>
            )}
            {aside}
          </div>
        </div>

        {/* Every record number, each under its own label. */}
        <div className="mt-4 pt-3 border-t border-[var(--border-color)] grid grid-cols-2 sm:grid-cols-4 gap-x-5 gap-y-3">
          {identity.map((field) => <Field key={field.label} {...field} />)}
        </div>
      </div>
    </div>
  );
}

export default PatientVisitHeader;
