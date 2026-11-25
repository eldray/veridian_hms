// src/components/patients/ProfileTab.tsx - WITH DEBUGGING
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
      <div className="text-center py-8">
        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 bg-[var(--bg-main)]">
          <User className="w-6 h-6 text-[var(--text-tertiary)]" />
        </div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No Patient Data</h3>
        <p className="text-[var(--text-secondary)] text-sm">Patient information could not be loaded</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Compact Section Navigation */}
      <div className="flex flex-wrap gap-2 p-1.5 rounded-lg bg-[var(--bg-main)]">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 flex-1 justify-center ${
                activeSection === section.id
                  ? 'bg-[var(--bg-card)] text-[var(--accent-color)] shadow-sm border border-[var(--border-color)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {section.label}
            </button>
          );
        })}
      </div>

      {/* Section Content */}
      <div className="min-h-0">
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