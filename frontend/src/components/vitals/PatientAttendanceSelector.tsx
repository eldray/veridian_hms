import React, { useState, useMemo, useEffect } from 'react';
import { User, Calendar, ChevronDown, X, Check } from 'lucide-react';
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

  // Get attendances for selected patient (sorted by date, newest first)
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

  // ✅ AUTOMATICALLY SELECT LATEST ATTENDANCE WHEN PATIENT IS SELECTED
  useEffect(() => {
    if (selectedPatientId && patientAttendances.length > 0 && !selectedAttendanceId) {
      const latestAttendance = patientAttendances[0];
      onAttendanceSelect(getEntityId(latestAttendance) || '');
    }
  }, [selectedPatientId, patientAttendances, selectedAttendanceId, onAttendanceSelect]);

  const handlePatientSelect = (patient: Patient) => {
    const patientId = getEntityId(patient) || '';
    onPatientSelect(patientId);
    setPatientSearch(''); // Clear search when patient is selected
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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Patient & Visit</h2>
        {(selectedPatientId || selectedAttendanceId) && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
            Clear
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Patient Selection - COMPACT DESIGN */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-500" />
            Patient
          </label>
          
          <div className="relative">
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder={selectedPatient ? "" : "Search patient..."}
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                onFocus={() => setShowPatientDropdown(true)}
                className={`w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 pr-20 transition-all ${
                  selectedPatient ? 'bg-blue-50 border-blue-200' : ''
                }`}
              />
              
              {/* Selected Patient Badge */}
              {selectedPatient && (
                <div className="absolute left-3 flex items-center gap-2 pointer-events-none">
                  <div className="flex items-center gap-2 bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-sm">
                    <Check className="w-3 h-3" />
                    <span className="font-medium truncate max-w-[120px]">
                      {selectedPatient.fullName}
                    </span>
                  </div>
                </div>
              )}
              
              <div className="absolute right-3 flex items-center gap-1">
                {selectedPatient && (
                  <div className="text-xs text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                    {selectedPatient.folderNumber}
                  </div>
                )}
                <ChevronDown className="text-gray-400 w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Patient Dropdown */}
          {showPatientDropdown && patientSearch && (
            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {filteredPatients.slice(0, 6).map((patient) => (
                <button
                  key={getEntityId(patient)}
                  onClick={() => handlePatientSelect(patient)}
                  className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-gray-200 last:border-b-0 transition-colors"
                >
                  <div className="font-medium text-gray-900">{patient.fullName}</div>
                  <div className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                    <span className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                      {patient.folderNumber}
                    </span>
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
        </div>

        {/* Attendance Selection - COMPACT DESIGN */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-green-500" />
            Visit
            {selectedAttendance && (
              <span className="text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">
                Latest
              </span>
            )}
          </label>
          
          <div className="relative">
            <button
              onClick={() => setShowAttendanceDropdown(!showAttendanceDropdown)}
              disabled={!selectedPatientId}
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-left disabled:opacity-50 disabled:cursor-not-allowed pr-10 flex items-center justify-between transition-all ${
                selectedAttendance 
                  ? 'bg-green-50 border-green-200 text-green-900' 
                  : 'bg-gray-50 border-gray-300 text-gray-900'
              }`}
            >
              <span className="truncate">
                {selectedAttendance 
                  ? `${selectedAttendance.attendanceNumber || 'Visit'} • ${new Date(selectedAttendance.dateTime || selectedAttendance.createdAt || '').toLocaleDateString()}`
                  : patientAttendances.length > 0 
                    ? 'Selecting latest...' 
                    : 'No visits'
                }
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${
                showAttendanceDropdown ? 'rotate-180' : ''
              } ${selectedAttendance ? 'text-green-500' : 'text-gray-400'}`} />
            </button>
          </div>

          {/* Attendance Dropdown */}
          {showAttendanceDropdown && selectedPatientId && patientAttendances.length > 0 && (
            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {patientAttendances.map((attendance, index) => (
                <button
                  key={getEntityId(attendance)}
                  onClick={() => handleAttendanceSelect(attendance)}
                  className={`w-full px-4 py-3 text-left hover:bg-green-50 border-b border-gray-200 last:border-b-0 transition-colors ${
                    index === 0 ? 'bg-green-50 border-l-4 border-l-green-400' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-medium text-gray-900 flex items-center gap-2">
                      {attendance.attendanceNumber || `Visit ${new Date(attendance.dateTime || attendance.createdAt || '').toLocaleDateString()}`}
                      {index === 0 && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                          Latest
                        </span>
                      )}
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

          {/* Status Messages */}
          {!selectedPatientId && (
            <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
              <User className="w-3 h-3" />
              Select a patient first
            </div>
          )}

          {selectedPatientId && patientAttendances.length === 0 && (
            <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              No visits found
            </div>
          )}
        </div>
      </div>
    </div>
  );
};