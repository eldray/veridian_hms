import { User, Calendar, Phone, MapPin, Folder } from 'lucide-react';

interface CompactBasicInfoProps {
  patient: any;
}

export const CompactBasicInfo: React.FC<CompactBasicInfoProps> = ({ patient }) => {
  if (!patient) {
    return (
      <div className="rounded-lg border p-6 text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} role="status">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No patient data available</p>
      </div>
    );
  }

  const fields = [
    { label: 'Full Name', value: patient.fullName, icon: User },
    { label: 'Gender', value: patient.gender, icon: User, capitalize: true },
    { label: 'Date of Birth', value: patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString('en-GH') : '', icon: Calendar },
    { label: 'Contact', value: patient.contact, icon: Phone },
    { label: 'Address', value: patient.address, icon: MapPin, wide: true }
  ];

  return (
    <div className="space-y-3">
      <div className="rounded-lg border p-3" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <div className="flex min-w-0 items-center gap-2">
          <Folder className="h-4 w-4 shrink-0" style={{ color: 'var(--text-secondary)' }} aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Folder Number</p>
            <p className="break-words text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{patient.folderNumber || 'Not assigned'}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {fields.map(({ label, value, icon: Icon, capitalize, wide }) => (
          <div
            key={label}
            className={`min-w-0 rounded-lg border p-3 ${wide ? 'md:col-span-2' : ''}`}
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
          >
            <div className="mb-1 flex items-center gap-1.5">
              <Icon className="h-3.5 w-3.5" style={{ color: 'var(--text-tertiary)' }} aria-hidden="true" />
              <p className="text-xs font-semibold uppercase" style={{ color: 'var(--text-secondary)' }}>{label}</p>
            </div>
            <p className={`break-words text-sm font-medium ${capitalize ? 'capitalize' : ''}`} style={{ color: 'var(--text-primary)' }}>
              {value || 'Not provided'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
