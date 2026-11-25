// src/components/patients/CompactBasicInfo.tsx - WITH DEBUGGING
import { User, Calendar, Phone, MapPin, Folder } from 'lucide-react';

interface CompactBasicInfoProps {
  patient: any;
}

export const CompactBasicInfo: React.FC<CompactBasicInfoProps> = ({ patient }) => {
  if (!patient) {
    return (
      <div className="text-center py-8">
        <p className="text-[var(--text-secondary)]">No patient data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Folder Number */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-3">
        <div className="flex items-center gap-2">
          <Folder className="w-4 h-4 text-[var(--icon-blue-text)]" />
          <div>
            <p className="text-xs font-semibold text-[var(--icon-blue-text)] uppercase tracking-wide">Folder Number</p>
            <p className="text-base font-bold text-[var(--text-primary)]">{patient.folderNumber || 'Not assigned'}</p>
          </div>
        </div>
      </div>

      {/* Basic Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="bg-[var(--bg-card)] p-3 rounded-lg border border-[var(--border-color)]">
          <div className="flex items-center gap-1 mb-1">
            <User className="w-3 h-3 text-[var(--text-secondary)]" />
            <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase">Full Name</p>
          </div>
          <p className="text-sm font-medium text-[var(--text-primary)]">{patient.fullName || 'Not provided'}</p>
        </div>

        <div className="bg-[var(--bg-card)] p-3 rounded-lg border border-[var(--border-color)]">
          <div className="flex items-center gap-1 mb-1">
            <User className="w-3 h-3 text-[var(--text-secondary)]" />
            <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase">Gender</p>
          </div>
          <p className="text-sm font-medium text-[var(--text-primary)] capitalize">{patient.gender || 'Not provided'}</p>
        </div>

        <div className="bg-[var(--bg-card)] p-3 rounded-lg border border-[var(--border-color)]">
          <div className="flex items-center gap-1 mb-1">
            <Calendar className="w-3 h-3 text-[var(--text-secondary)]" />
            <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase">Date of Birth</p>
          </div>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : 'Not provided'}
          </p>
        </div>

        <div className="bg-[var(--bg-card)] p-3 rounded-lg border border-[var(--border-color)]">
          <div className="flex items-center gap-1 mb-1">
            <Phone className="w-3 h-3 text-[var(--text-secondary)]" />
            <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase">Contact</p>
          </div>
          <p className="text-sm font-medium text-[var(--text-primary)]">{patient.contact || 'Not provided'}</p>
        </div>

        <div className="bg-[var(--bg-card)] p-3 rounded-lg border border-[var(--border-color)] md:col-span-2">
          <div className="flex items-center gap-1 mb-1">
            <MapPin className="w-3 h-3 text-[var(--text-secondary)]" />
            <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase">Address</p>
          </div>
          <p className="text-sm font-medium text-[var(--text-primary)]">{patient.address || 'Not provided'}</p>
        </div>
      </div>


    </div>
  );
};