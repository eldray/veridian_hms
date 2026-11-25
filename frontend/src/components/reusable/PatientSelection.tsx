import React, { useState } from 'react';
import type { Patient } from '../../types';
import { User, Search } from 'lucide-react';
import { PatientAvatar } from '../patients/PatientAvatar';

interface PatientSelectionProps {
  patients: Patient[];
  selectedPatientId: string;
  onPatientSelect: (patientId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  showDropdown: boolean;
  onDropdownToggle: (show: boolean) => void;
}

export const PatientSelection: React.FC<PatientSelectionProps> = ({
  patients,
  selectedPatientId,
  onPatientSelect,
  searchQuery,
  onSearchChange,
  showDropdown,
  onDropdownToggle,
}) => {
  const filteredPatients = patients.filter(
    (p) =>
      p.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.contact?.includes(searchQuery) ||
      p.folderNumber?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedPatient = patients.find((p) => p._id === selectedPatientId);

  const getEntityId = (entity: { id?: string; _id?: string } | null): string | undefined => {
    return entity?._id || entity?.id;
  };

  return (
    <section
      className="rounded-xl shadow-sm border p-4"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-color)',
        color: 'var(--text-primary)',
      }}
      aria-labelledby="patient-selection-heading"
    >
      <h2 id="patient-selection-heading" className="text-base font-semibold mb-3 flex items-center gap-2">
        <User className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} aria-hidden="true" />
        Patient Selection
      </h2>
      <div className="space-y-3">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
            style={{ color: 'var(--text-tertiary)' }}
            aria-hidden="true"
          />
          <input
            type="text"
            placeholder="Search patient by name, contact, or folder number..."
            value={searchQuery}
            onChange={(e) => {
              onSearchChange(e.target.value);
              onDropdownToggle(true);
            }}
            onFocus={() => onDropdownToggle(true)}
            className="w-full pl-9 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
            style={{
              backgroundColor: 'var(--bg-main)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
            }}
            aria-label="Search patients by name, contact, or folder number"
            aria-expanded={showDropdown && Boolean(searchQuery)}
            aria-controls="patient-selection-results"
            autoComplete="off"
          />

          {showDropdown && searchQuery && (
            <div
              id="patient-selection-results"
              className="absolute z-20 w-full mt-1 max-h-56 overflow-y-auto border rounded-lg shadow-lg"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-color)',
              }}
            >
              {filteredPatients.length > 0 ? (
                filteredPatients.map((patient) => {
                  const pid = getEntityId(patient);
                  if (!pid) return null;
                  return (
                    <button
                      key={pid}
                      type="button"
                      onClick={() => {
                        onPatientSelect(pid);
                        onSearchChange(patient.fullName || '');
                        onDropdownToggle(false);
                      }}
                      className="w-full text-left p-3 border-b last:border-b-0 transition-colors text-sm hover:bg-black/5 dark:hover:bg-white/5"
                      style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                    >
                      <div className="flex items-center gap-3">
                        <PatientAvatar patient={patient} size="sm" />
                        <div className="font-semibold">{patient.fullName}</div>
                      </div>
                      <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                        {patient.gender} • {patient.contact} • {patient.folderNumber}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="p-3 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                  No patients found
                </div>
              )}
            </div>
          )}
        </div>

        {selectedPatient && (
          <div
            className="p-3 rounded-lg border"
            style={{
              backgroundColor: 'var(--bg-main)',
              borderColor: 'var(--border-color)',
            }}
          >
            <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
              {selectedPatient.fullName}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              {selectedPatient.age} years • {selectedPatient.gender} • {selectedPatient.folderNumber}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              Payment Mode:{' '}
              <span className="font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>
                {selectedPatient.paymentMode || 'cash'}
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
