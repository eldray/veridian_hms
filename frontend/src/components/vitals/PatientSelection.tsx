import React from 'react';
import { User, Search, X } from 'lucide-react';
import type { Patient } from '../../types';
import { PatientAvatar } from '../patients/PatientAvatar';

interface PatientSelectionProps {
  patients: Patient[];
  patientSearch: string;
  setPatientSearch: (search: string) => void;
  selectedPatientId: string;
  setSelectedPatientId: (id: string) => void;
  showPatientDropdown: boolean;
  setShowPatientDropdown: (show: boolean) => void;
  selectedPatient: Patient | undefined;
}

const getEntityId = (entity: { id?: string; _id?: string } | null): string | undefined => {
  return entity?._id || entity?.id;
};

export const PatientSelection: React.FC<PatientSelectionProps> = ({
  patients,
  patientSearch,
  setPatientSearch,
  selectedPatientId,
  setSelectedPatientId,
  showPatientDropdown,
  setShowPatientDropdown,
  selectedPatient
}) => {
  const filteredPatients = patients.filter(patient =>
    patient.fullName?.toLowerCase().includes(patientSearch.toLowerCase()) ||
    patient.folderNumber?.toLowerCase().includes(patientSearch.toLowerCase()) ||
    patient.contact?.includes(patientSearch)
  );

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatientId(getEntityId(patient) || '');
    setPatientSearch(patient.fullName || '');
    setShowPatientDropdown(false);
  };

  const handleClearSelection = () => {
    setSelectedPatientId('');
    setPatientSearch('');
    setShowPatientDropdown(false);
  };

  return (
    <div className="bg-[var(--bg-card)] rounded-xl p-6 shadow-sm border border-[var(--border-color)]">
      <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2 mb-4">
        <User className="w-5 h-5 text-[var(--icon-cyan-text)]" />
        Select Patient
      </h2>
      
      <div className="relative mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-tertiary)] w-4 h-4" />
          <input
            type="text"
            placeholder="Search by name, folder number, or contact..."
            value={patientSearch}
            onChange={(e) => setPatientSearch(e.target.value)}
            onFocus={() => setShowPatientDropdown(true)}
            className="w-full pl-10 pr-4 py-3 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-transparent text-[var(--text-primary)] placeholder-[var(--text-tertiary)]"
          />
        </div>

        {showPatientDropdown && patientSearch && (
          <div className="absolute z-20 w-full mt-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {filteredPatients.slice(0, 8).map((patient) => (
              <button
                key={getEntityId(patient)}
                onClick={() => handlePatientSelect(patient)}
                className="w-full px-4 py-3 text-left hover:bg-[var(--bg-main)] border-b border-[var(--border-color)] last:border-b-0 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <PatientAvatar imageUrl={patient.imageUrl} name={patient.fullName} size="sm" className="rounded-full bg-[var(--icon-cyan-bg)]" fallbackClassName="text-[var(--icon-cyan-text)]" />
                  <div className="min-w-0">
                    <div className="font-medium text-[var(--text-primary)]">{patient.fullName}</div>
                    <div className="text-xs text-[var(--text-secondary)]">{patient.folderNumber || 'No folder number'}</div>
                  </div>
                </div>
                <div className="text-sm text-[var(--text-secondary)] flex items-center gap-2 mt-1">
                  <span>ID: {patient.folderNumber}</span>
                  <span>•</span>
                  <span>{patient.contact}</span>
                </div>
              </button>
            ))}
            {filteredPatients.length === 0 && (
              <div className="px-4 py-3 text-sm text-[var(--text-secondary)] text-center">
                No patients found
              </div>
            )}
          </div>
        )}
      </div>

      {selectedPatient && (
        <div className="bg-[var(--icon-cyan-bg)] border border-[var(--icon-cyan-text)] rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <PatientAvatar imageUrl={selectedPatient.imageUrl} name={selectedPatient.fullName} size="lg" className="rounded-lg bg-[var(--icon-cyan-text)]/10" fallbackClassName="text-[var(--icon-cyan-text)]" />
              <div>
                <div className="font-semibold text-[var(--icon-cyan-text)]">{selectedPatient.fullName}</div>
                <div className="text-sm text-[var(--icon-cyan-text)] opacity-80 flex items-center gap-2">
                  <span>{selectedPatient.folderNumber}</span>
                  <span>•</span>
                  <span>{selectedPatient.gender}</span>
                  <span>•</span>
                  <span>{selectedPatient.age} years</span>
                </div>
              </div>
            </div>
            <button
              onClick={handleClearSelection}
              className="p-1 text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-text)] hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};