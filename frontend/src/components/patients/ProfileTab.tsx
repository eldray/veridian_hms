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

  // ✅ ADD DEBUGGING
  console.log('🔍 ProfileTab rendering:', {
    patient: patient ? {
      id: patient.id || patient._id,
      fullName: patient.fullName,
      folderNumber: patient.folderNumber
    } : 'NO PATIENT',
    activeSection,
    insuranceProvidersCount: insuranceProviders?.length || 0,
    patientId
  });

  if (!patient) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <User className="w-6 h-6 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Patient Data</h3>
        <p className="text-gray-600 text-sm">Patient information could not be loaded</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Debug Info - Remove this after fixing */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
        <h4 className="font-semibold text-yellow-800 text-sm mb-2">Debug Info</h4>
        <div className="text-xs text-yellow-700 space-y-1">
          <div><strong>Patient ID:</strong> {patient.id || patient._id}</div>
          <div><strong>Full Name:</strong> {patient.fullName}</div>
          <div><strong>Folder Number:</strong> {patient.folderNumber}</div>
          <div><strong>Active Section:</strong> {activeSection}</div>
        </div>
      </div>

      {/* Compact Section Navigation */}
      <div className="flex gap-2 p-2 bg-gray-50 rounded-lg">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 flex-1 justify-center ${
                activeSection === section.id
                  ? 'bg-white text-blue-600 shadow-sm border border-blue-200'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {section.label}
            </button>
          );
        })}
      </div>

      {/* Section Content */}
      <div className="min-h-[400px]">
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