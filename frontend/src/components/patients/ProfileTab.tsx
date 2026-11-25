import { useState } from 'react';
import { User, Info, CreditCard } from 'lucide-react';
import { CompactBasicInfo } from './CompactBasicInfo';
import { CompactPaymentInfo } from './CompactPaymentInfo';
import { CompactAdditionalInfo } from './CompactAdditionalInfo';

interface ProfileTabProps {
  patient: any;
  insuranceProviders: any[];
  patientId: string;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({ patient, insuranceProviders, patientId }) => {
  const [activeSection, setActiveSection] = useState<'basic' | 'payment' | 'additional'>('basic');

  const sections = [
    { id: 'basic' as const, label: 'Basic Info', icon: User },
    { id: 'additional' as const, label: 'Additional', icon: Info },
    { id: 'payment' as const, label: 'Payment', icon: CreditCard }
  ];

  if (!patient) {
    return (
      <div className="rounded-lg border p-6 text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} role="status">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-tertiary)' }}>
          <User className="h-6 w-6" aria-hidden="true" />
        </div>
        <h3 className="mb-1 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>No Patient Data</h3>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Patient information could not be loaded</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5 rounded-lg border p-1.5" style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-color)' }} role="tablist" aria-label="Patient profile sections">
        {sections.map((section) => {
          const Icon = section.icon;
          const selected = activeSection === section.id;
          return (
            <button
              key={section.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveSection(section.id)}
              className="flex min-w-[110px] flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{
                backgroundColor: selected ? 'var(--bg-card)' : 'transparent',
                color: selected ? 'var(--text-primary)' : 'var(--text-secondary)',
                border: selected ? '1px solid var(--border-color)' : '1px solid transparent',
                boxShadow: selected ? 'var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.08))' : 'none'
              }}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {section.label}
            </button>
          );
        })}
      </div>

      <div className="min-h-[240px]">
        {activeSection === 'basic' && <CompactBasicInfo patient={patient} />}
        {activeSection === 'payment' && (
          <CompactPaymentInfo
            patient={patient}
            insuranceProviders={insuranceProviders}
            patientId={patientId}
          />
        )}
        {activeSection === 'additional' && <CompactAdditionalInfo patient={patient} />}
      </div>
    </div>
  );
};
