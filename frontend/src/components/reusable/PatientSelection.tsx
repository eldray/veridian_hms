import React, { useState } from 'react';
import { Patient } from '../types';
import { User, Search } from 'lucide-react';

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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-gray-900">
        <User className="w-4 h-4 text-blue-600" />
        Patient Selection
      </h2>
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search patient by name, contact, or folder number..."
            value={searchQuery}
            onChange={(e) => {
              onSearchChange(e.target.value);
              onDropdownToggle(true);
            }}
            onFocus={() => onDropdownToggle(true)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
          />
          
          {showDropdown && searchQuery && (
            <div className="absolute z-10 w-full mt-1 max-h-40 overflow-y-auto border border-gray-300 rounded-lg bg-white shadow-lg">
              {filteredPatients.length > 0 ? (
                filteredPatients.map((patient) => {
                  const pid = getEntityId(patient);
                  if (!pid) return null;
                  return (
                    <button
                      key={pid}
                      onClick={() => {
                        onPatientSelect(pid);
                        onSearchChange(patient.fullName || '');
                        onDropdownToggle(false);
                      }}
                      className="w-full text-left p-3 hover:bg-blue-50 border-b last:border-b-0 transition-colors text-sm"
                    >
                      <div className="font-semibold text-gray-900">{patient.fullName}</div>
                      <div className="text-xs text-gray-600">
                        {patient.gender} • {patient.contact} • {patient.folderNumber}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="p-3 text-gray-500 text-center text-sm">No patients found</div>
              )}
            </div>
          )}
        </div>
        
        {selectedPatient && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="font-bold text-gray-900 text-sm">{selectedPatient.fullName}</div>
            <div className="text-xs text-gray-700 mt-1">
              {selectedPatient.age} years • {selectedPatient.gender} • {selectedPatient.folderNumber}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Payment Mode: <span className="font-semibold capitalize">{selectedPatient.paymentMode || 'cash'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};