// src/components/patients/PatientDetailsHeader.tsx
import { User, Edit, Plus, ArrowLeft, Folder } from 'lucide-react';
import { PatientAvatar } from './PatientAvatar';

interface PatientDetailsHeaderProps {
  patient: any;
  canEdit: boolean;
  canCreateAttendance: boolean;
  onEdit: () => void;
  onNewAttendance: () => void;
  onBack: () => void;
}

export const PatientDetailsHeader: React.FC<PatientDetailsHeaderProps> = ({
  patient,
  canEdit,
  canCreateAttendance,
  onEdit,
  onNewAttendance,
  onBack
}) => {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-3 sm:p-4 text-[var(--text-primary)] shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--icon-cyan-text)]" aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4">
            <PatientAvatar patient={patient} size="lg" className="rounded-xl border border-[var(--border-color)] shadow-sm" />
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)]">{patient.fullName}</h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[var(--text-secondary)] mt-1 text-xs sm:text-sm">
                <div className="flex items-center gap-1">
                  <Folder className="w-4 h-4" />
                  <span className="font-mono font-semibold">{patient.folderNumber}</span>
                </div>
                <div className="w-1 h-1 bg-[var(--text-tertiary)] rounded-full"></div>
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  <span className="capitalize">{patient.gender}</span>
                </div>
                <div className="w-1 h-1 bg-[var(--text-tertiary)] rounded-full"></div>
                <div className="flex items-center gap-1">
                  <span className="font-semibold">Age:</span>
                  <span>{patient.age} years</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canCreateAttendance && (
            <button
              onClick={onNewAttendance}
              className="flex items-center gap-2 px-3 py-2 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] rounded-lg hover:opacity-90 transition-opacity font-semibold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--icon-cyan-text)]"
            >
              <Plus className="w-4 h-4" />
              <span>New Visit</span>
            </button>
          )}
          {canEdit && (
            <button
              onClick={onEdit}
              className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-subtle)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors font-semibold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--icon-cyan-text)]"
            >
              <Edit className="w-4 h-4" />
              <span>Edit</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};