// src/components/vitals/PatientAttendanceSelector.tsx - WITH AUTO-SELECT
import React, { useState, useEffect, useRef } from 'react';
import { Search, User, Calendar, ChevronDown, X, Clock, Activity, CheckCircle } from 'lucide-react';

interface PatientAttendanceSelectorProps {
  patients: any[];
  attendances: any[];
  selectedPatientId: string;
  selectedAttendanceId: string;
  onPatientSelect: (patientId: string) => void;
  onAttendanceSelect: (attendanceId: string) => void;
  onClearSelection: () => void;
  autoSelectMostRecent?: boolean; // ✅ NEW: Option to auto-select most recent attendance
}

export const PatientAttendanceSelector: React.FC<PatientAttendanceSelectorProps> = ({
  patients,
  attendances,
  selectedPatientId,
  selectedAttendanceId,
  onPatientSelect,
  onAttendanceSelect,
  onClearSelection,
  autoSelectMostRecent = true, // ✅ Default to true
}) => {
  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [showAttendanceDropdown, setShowAttendanceDropdown] = useState(false);
  const patientInputRef = useRef<HTMLInputElement>(null);
  const attendanceInputRef = useRef<HTMLInputElement>(null);
  const patientDropdownRef = useRef<HTMLDivElement>(null);
  const attendanceDropdownRef = useRef<HTMLDivElement>(null);

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  // Filter patients based on search
  const filteredPatients = patients.filter(patient => {
    const fullName = `${patient.surname} ${patient.otherNames}`.toLowerCase();
    const search = patientSearch.toLowerCase();
    return fullName.includes(search) || 
           patient.folderNumber?.toLowerCase().includes(search) ||
           patient.contact?.toLowerCase().includes(search);
  });

  // Filter attendances for selected patient (sorted by most recent first)
  const patientAttendances = attendances
    .filter(a => a.patientId === selectedPatientId)
    .sort((a, b) => new Date(b.dateTime || b.createdAt).getTime() - new Date(a.dateTime || a.createdAt).getTime());

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />;
      case 'completed': return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'admitted': return <Activity className="w-3 h-3 text-red-500" />;
      default: return <Clock className="w-3 h-3 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    return status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown';
  };

  // ✅ AUTO-SELECT MOST RECENT ATTENDANCE WHEN PATIENT IS SELECTED
  useEffect(() => {
    if (autoSelectMostRecent && selectedPatientId && patientAttendances.length > 0 && !selectedAttendanceId) {
      const mostRecentAttendance = patientAttendances[0];
      onAttendanceSelect(mostRecentAttendance.id);
    }
  }, [selectedPatientId, patientAttendances, selectedAttendanceId, onAttendanceSelect, autoSelectMostRecent]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (patientDropdownRef.current && !patientDropdownRef.current.contains(event.target as Node) &&
          patientInputRef.current && !patientInputRef.current.contains(event.target as Node)) {
        setShowPatientDropdown(false);
      }
      if (attendanceDropdownRef.current && !attendanceDropdownRef.current.contains(event.target as Node) &&
          attendanceInputRef.current && !attendanceInputRef.current.contains(event.target as Node)) {
        setShowAttendanceDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePatientSelect = (patient: any) => {
    onPatientSelect(patient.id);
    setPatientSearch(`${patient.surname} ${patient.otherNames}`);
    setShowPatientDropdown(false);
  };

  const clearPatient = () => {
    onPatientSelect('');
    onAttendanceSelect('');
    setPatientSearch('');
    onClearSelection();
  };

  const clearAttendance = () => {
    onAttendanceSelect('');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {/* Patient Search Box */}
      <div className="relative">
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1 flex items-center gap-1">
          <User className="w-3 h-3" />
          Patient
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)]" />
          <input
            ref={patientInputRef}
            type="text"
            value={patientSearch}
            onChange={(e) => {
              setPatientSearch(e.target.value);
              setShowPatientDropdown(true);
              if (selectedPatientId) clearPatient();
            }}
            onFocus={() => setShowPatientDropdown(true)}
            placeholder="Search by name, folder #, or phone..."
            className="w-full pl-9 pr-8 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] transition-all"
          />
          {patientSearch && (
            <button
              onClick={clearPatient}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-[var(--bg-card)]"
            >
              <X className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
            </button>
          )}
        </div>

        {/* Patient Dropdown */}
        {showPatientDropdown && patientSearch && (
          <div 
            ref={patientDropdownRef}
            className="absolute z-20 w-full mt-1 max-h-64 overflow-y-auto border border-[var(--border-color)] rounded-lg bg-[var(--bg-card)] shadow-lg"
          >
            {filteredPatients.length > 0 ? (
              filteredPatients.map((patient) => (
                <button
                  key={patient.id}
                  onClick={() => handlePatientSelect(patient)}
                  className="w-full text-left p-3 hover:bg-[var(--bg-main)] border-b border-[var(--border-color)] last:border-b-0 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-[var(--text-primary)] text-sm">
                        {patient.surname} {patient.otherNames}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-[var(--text-secondary)]">
                        <span className="font-mono">#{patient.folderNumber}</span>
                        <span>•</span>
                        <span>{patient.contact}</span>
                        <span>•</span>
                        <span>{patient.age || '?'}y • {patient.gender === 'male' ? '♂' : '♀'}</span>
                      </div>
                    </div>
                    {patient.paymentMode === 'nhis' && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full">NHIS</span>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-[var(--text-secondary)] text-sm">
                No patients found
              </div>
            )}
          </div>
        )}

        {/* Selected Patient Display - Cute pill */}
        {selectedPatient && !patientSearch && (
          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[var(--icon-cyan-bg)]/10 rounded-full border border-[var(--icon-cyan-bg)]/30">
              <div className="w-5 h-5 rounded-full bg-[var(--icon-cyan-bg)] flex items-center justify-center">
                <User className="w-3 h-3 text-[var(--icon-cyan-text)]" />
              </div>
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {selectedPatient.surname} {selectedPatient.otherNames}
              </span>
              <span className="text-xs text-[var(--text-secondary)] font-mono">
                #{selectedPatient.folderNumber}
              </span>
              <button
                onClick={clearPatient}
                className="ml-1 p-0.5 rounded-full hover:bg-[var(--bg-main)]"
              >
                <X className="w-3 h-3 text-[var(--text-secondary)]" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Attendance Selector */}
      <div className="relative">
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1 flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          Visit / Attendance
          {autoSelectMostRecent && selectedPatientId && patientAttendances.length > 0 && !selectedAttendanceId && (
            <span className="text-[10px] text-[var(--icon-cyan-text)] animate-pulse">(Auto-selecting latest...)</span>
          )}
        </label>
        
        {!selectedPatientId ? (
          <div className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-tertiary)] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
            Select a patient first
          </div>
        ) : (
          <>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)]" />
              <button
                ref={attendanceInputRef as any}
                onClick={() => setShowAttendanceDropdown(!showAttendanceDropdown)}
                className="w-full pl-9 pr-8 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-all flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  {selectedAttendanceId ? (
                    <>
                      {getStatusIcon(patientAttendances.find(a => a.id === selectedAttendanceId)?.status || '')}
                      <span>
                        {patientAttendances.find(a => a.id === selectedAttendanceId)?.attendanceNumber || 'Select visit'}
                      </span>
                      {patientAttendances.find(a => a.id === selectedAttendanceId)?.status === 'pending' && (
                        <span className="text-xs text-yellow-600">(Active)</span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                      <span className="text-[var(--text-tertiary)]">
                        {patientAttendances.length > 0 ? 'Select a visit' : 'No visits found'}
                      </span>
                    </>
                  )}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
              </button>
              {selectedAttendanceId && (
                <button
                  onClick={clearAttendance}
                  className="absolute right-8 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-[var(--bg-card)]"
                >
                  <X className="w-3 h-3 text-[var(--text-tertiary)]" />
                </button>
              )}
            </div>

            {/* Attendance Dropdown */}
            {showAttendanceDropdown && (
              <div 
                ref={attendanceDropdownRef}
                className="absolute z-20 w-full mt-1 max-h-64 overflow-y-auto border border-[var(--border-color)] rounded-lg bg-[var(--bg-card)] shadow-lg"
              >
                {patientAttendances.length > 0 ? (
                  patientAttendances.map((att) => (
                    <button
                      key={att.id}
                      onClick={() => {
                        onAttendanceSelect(att.id);
                        setShowAttendanceDropdown(false);
                      }}
                      className={`w-full text-left p-3 hover:bg-[var(--bg-main)] border-b border-[var(--border-color)] last:border-b-0 transition-all ${
                        selectedAttendanceId === att.id ? 'bg-[var(--icon-cyan-bg)]/5' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-[var(--text-primary)] text-sm">
                              {att.attendanceNumber}
                            </span>
                            {getStatusIcon(att.status)}
                            <span className="text-xs text-[var(--text-secondary)]">
                              {getStatusText(att.status)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text-secondary)]">
                            <span>📅 {new Date(att.dateTime || att.createdAt).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>🏥 {att.attendanceType?.replace(/_/g, ' ') || 'General'}</span>
                          </div>
                          {att.complaints && (
                            <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-1">
                              {att.complaints.substring(0, 60)}...
                            </p>
                          )}
                        </div>
                        {att.paymentMode === 'nhis' && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full">NHIS</span>
                        )}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-[var(--text-secondary)] text-sm">
                    No attendances found for this patient
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};