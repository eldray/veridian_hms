// src/components/patients/PatientCard.tsx
import { Link } from 'react-router-dom';
import { Calendar, Phone, CreditCard, Eye, Stethoscope, Edit } from 'lucide-react';
import { PatientAvatar } from './PatientAvatar';

interface PatientCardProps {
  patient: any;
  patientId: string;
  paymentModeColor: string;
  paymentModeLabel: string;
  onAddAttendance: (patientId: string) => void;
}

export const PatientCard: React.FC<PatientCardProps> = ({
  patient,
  patientId,
  paymentModeColor,
  paymentModeLabel,
  onAddAttendance
}) => {
  return (
    <div className="group rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-3 shadow-sm transition-shadow duration-200 hover:shadow-md">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <PatientAvatar patient={patient} size="md" />
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold leading-tight text-[var(--text-primary)]">{patient.fullName}</h3>
            <p className="mt-0.5 rounded border border-[var(--border-color)] bg-[var(--bg-main)] px-1.5 py-0.5 text-xs text-[var(--text-secondary)]">
              {patient.folderNumber || patientId}
            </p>
          </div>
        </div>
        <Link
          to={`/dashboard/patients/register?edit=true&id=${patientId}`}
          className="rounded-md border border-[var(--border-color)] bg-[var(--bg-main)] p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-color)] focus-visible:ring-offset-2"
          title="Edit Patient"
          aria-label={`Edit ${patient.fullName || 'patient'}`}
        >
          <Edit className="h-3 w-3" />
        </Link>
      </div>

      <div className="mb-3 space-y-1.5 text-xs">
        <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
          <Calendar className="h-3 w-3 shrink-0 text-[var(--text-tertiary)]" />
          <span className="font-medium">{patient.age || 'N/A'}y • {patient.gender}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
          <Phone className="h-3 w-3 shrink-0 text-[var(--text-tertiary)]" />
          <span className="truncate font-medium">{patient.contact || 'No contact recorded'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CreditCard className="h-3 w-3 shrink-0 text-[var(--text-tertiary)]" />
          <span className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${paymentModeColor}`}>
            {paymentModeLabel}
          </span>
        </div>
      </div>

      <div className="flex gap-1.5 border-t border-[var(--border-color)] pt-2">
        <Link
          to={`/dashboard/patients/${patientId}`}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-md bg-[var(--primary-color)] px-2 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-color)] focus-visible:ring-offset-2"
        >
          <Eye className="h-3 w-3" />
          View
        </Link>
        <button
          type="button"
          onClick={() => onAddAttendance(patientId)}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-md border border-[var(--border-color)] bg-[var(--bg-main)] px-2 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-color)] focus-visible:ring-offset-2"
          aria-label={`Start visit for ${patient.fullName || 'patient'}`}
        >
          <Stethoscope className="h-3 w-3" />
          Visit
        </button>
      </div>
    </div>
  );
};