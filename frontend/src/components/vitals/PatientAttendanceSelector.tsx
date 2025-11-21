import React, { useState, useMemo } from 'react';
import { User, Calendar, ChevronDown, X } from 'lucide-react';
import type { Patient, Attendance } from '../../types/vitals';

interface PatientAttendanceSelectorProps {
  patients: Patient[];
  attendances: Attendance[];
  selectedPatientId: string;
  selectedAttendanceId: string;
  onPatientSelect: (patientId: string) => void;
  onAttendanceSelect: (attendanceId: string) => void;
  onClearSelection?: () => void;
}

const getEntityId = (entity: { id?: string; _id?: string } | null): string | undefined => {
  return entity?._id || entity?.id;
};

export const PatientAttendanceSelector: React.FC<PatientAttendanceSelectorProps> = ({
  patients,
  attendances,
  selectedPatientId,
  selectedAttendanceId,
  onPatientSelect,
  onAttendanceSelect,
  onClearSelection
}) => {
  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [showAttendanceDropdown, setShowAttendanceDropdown] = useState(false);

  const selectedPatient = patients.find(p => getEntityId(p) === selectedPatientId);
  const selectedAttendance = attendances.find(a => getEntityId(a) === selectedAttendanceId);

  // Filter patients for search
  const filteredPatients = useMemo(() => {
    return patients.filter(patient =>
      patient.fullName?.toLowerCase().includes(patientSearch.toLowerCase()) ||
      patient.folderNumber?.toLowerCase().includes(patientSearch.toLowerCase()) ||
      patient.contact?.includes(patientSearch)
    );
  }, [patients, patientSearch]);

  // Get attendances for selected patient
  const patientAttendances = useMemo(() => {
    if (!selectedPatientId) return [];
    
    return attendances
      .filter(attendance => {
        const possiblePatientIds = [
          attendance.patientId,
          attendance.patient?.id,
          attendance.patient?._id,
          attendance.data?.patientId,
          attendance.patientId?._id,
          attendance.patientId?.id
        ]
          .filter(Boolean)
          .map(id => id?.toString())
          .filter(id => id && id !== 'undefined');

        return possiblePatientIds.includes(selectedPatientId);
      })
      .sort((a, b) => new Date(b.dateTime || b.createdAt || '').getTime() - new Date(a.dateTime || a.createdAt || '').getTime());
  }, [attendances, selectedPatientId]);

  const handlePatientSelect = (patient: Patient) => {
    onPatientSelect(getEntityId(patient) || '');
    setPatientSearch(patient.fullName || '');
    setShowPatientDropdown(false);
  };

  const handleAttendanceSelect = (attendance: Attendance) => {
    onAttendanceSelect(getEntityId(attendance) || '');
    setShowAttendanceDropdown(false);
  };

  const clearAll = () => {
    setPatientSearch('');
    onPatientSelect('');
    onAttendanceSelect('');
    onClearSelection?.();
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'admitted': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Select Patient & Visit</h2>
        {(selectedPatientId || selectedAttendanceId) && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
            Clear
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Patient Selection */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" />
            Patient
          </label>
          
          <div className="relative">
            <input
              type="text"
              placeholder="Search patient..."
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              onFocus={() => setShowPatientDropdown(true)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 pr-10"
            />
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          </div>

          {showPatientDropdown && patientSearch && (
            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {filteredPatients.slice(0, 6).map((patient) => (
                <button
                  key={getEntityId(patient)}
                  onClick={() => handlePatientSelect(patient)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-200 last:border-b-0 transition-colors"
                >
                  <div className="font-medium text-gray-900">{patient.fullName}</div>
                  <div className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                    <span>ID: {patient.folderNumber}</span>
                    <span>•</span>
                    <span>{patient.contact}</span>
                  </div>
                </button>
              ))}
              {filteredPatients.length === 0 && (
                <div className="px-4 py-3 text-sm text-gray-500 text-center">
                  No patients found
                </div>
              )}
            </div>
          )}

          {selectedPatient && (
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="font-medium text-blue-900">{selectedPatient.fullName}</div>
              <div className="text-sm text-blue-700 flex items-center gap-2 mt-1">
                <span>{selectedPatient.folderNumber}</span>
                <span>•</span>
                <span>{selectedPatient.gender}</span>
                <span>•</span>
                <span>{selectedPatient.age} years</span>
              </div>
            </div>
          )}
        </div>

        {/* Attendance Selection */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-green-600" />
            Visit
          </label>
          
          <div className="relative">
            <button
              onClick={() => setShowAttendanceDropdown(!showAttendanceDropdown)}
              disabled={!selectedPatientId}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed pr-10 flex items-center justify-between"
            >
              <span>
                {selectedAttendance 
                  ? `${selectedAttendance.attendanceNumber || 'Visit'} • ${new Date(selectedAttendance.dateTime || selectedAttendance.createdAt || '').toLocaleDateString()}`
                  : 'Select visit'
                }
              </span>
              <ChevronDown className="text-gray-400 w-4 h-4" />
            </button>
          </div>

          {showAttendanceDropdown && selectedPatientId && patientAttendances.length > 0 && (
            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {patientAttendances.map((attendance) => (
                <button
                  key={getEntityId(attendance)}
                  onClick={() => handleAttendanceSelect(attendance)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-200 last:border-b-0 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-medium text-gray-900">
                      {attendance.attendanceNumber || `Visit ${new Date(attendance.dateTime || attendance.createdAt || '').toLocaleDateString()}`}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(attendance.status || '')}`}>
                      {attendance.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {new Date(attendance.dateTime || attendance.createdAt || '').toLocaleDateString()} • {attendance.attendanceType?.replace(/_/g, ' ') || 'General'}
                  </div>
                </button>
              ))}
            </div>
          )}

          {!selectedPatientId && (
            <div className="mt-2 text-sm text-gray-500">
              Select a patient first to see visits
            </div>
          )}

          {selectedPatientId && patientAttendances.length === 0 && (
            <div className="mt-2 text-sm text-gray-500">
              No visits found for this patient
            </div>
          )}
        </div>
      </div>
    </div>
  );
};