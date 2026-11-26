// src/components/patients/PatientsHeader.tsx
import { Link } from 'react-router-dom';
import { Hospital, Plus } from 'lucide-react';

interface PatientsHeaderProps {
  canRegister: boolean;
}

export const PatientsHeader: React.FC<PatientsHeaderProps> = ({ canRegister }) => {
  return (
    <div className="bg-[var(--bg-card)] rounded-lg p-4 text-[var(--text-primary)] border border-[var(--border-color)] shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Hospital className="w-5 h-5 text-[var(--icon-cyan-text)]" />
            Patient Management
          </h1>
          <p className="text-[var(--text-secondary)] mt-0.5 text-xs">Manage patient records and medical history</p>
        </div>
        {canRegister && (
          <Link
            to="/dashboard/patients/register"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] border border-[var(--border-color)] rounded-lg hover:opacity-90 transition-all duration-200 hover:shadow-md font-semibold text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Register Patient</span>
          </Link>
        )}
      </div>
    </div>
  );
};