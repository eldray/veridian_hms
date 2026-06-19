// src/components/vitals/PatientAttendanceSelector.tsx - FIXED VERSION
import React, { useState, useEffect, useRef } from 'react';
import { Search, User, Calendar, ChevronDown, X, Clock, Activity, CheckCircle, Sparkles } from 'lucide-react';

interface PatientAttendanceSelectorProps {
  patients: any[];
  attendances: any[];
  selectedPatientId: string;
  selectedAttendanceId: string;
  onPatientSelect: (patientId: string) => void;
  onAttendanceSelect: (attendanceId: string) => void;
  onClearSelection: () => void;
  autoSelectMostRecent?: boolean;
}

// ✅ Normalize patient data - extract from possible nested structures
const normalizePatient = (patient: any): any => {
  if (!patient) return null;
  
  // If patient has a data property (nested response)
  if (patient.data && patient.data.id) {
    return patient.data;
  }
  
  // If patient has a patient property
  if (patient.patient && patient.patient.id) {
    return patient.patient;
  }
  
  // Already flat
  return patient;
};

// ✅ Safe getters
const getPatientId = (patient: any): string => {
  const normalized = normalizePatient(patient);
  return normalized?.id || '';
};

const getPatientSurname = (patient: any): string => {
  const normalized = normalizePatient(patient);
  return normalized?.surname || '';
};

const getPatientOtherNames = (patient: any): string => {
  const normalized = normalizePatient(patient);
  return normalized?.otherNames || '';
};

const getPatientFullName = (patient: any): string => {
  const surname = getPatientSurname(patient);
  const otherNames = getPatientOtherNames(patient);
  if (surname || otherNames) {
    return `${surname} ${otherNames}`.trim();
  }
  const normalized = normalizePatient(patient);
  return normalized?.fullName || normalized?.name || 'Unknown Patient';
};

const getPatientFolderNumber = (patient: any): string => {
  const normalized = normalizePatient(patient);
  return normalized?.folderNumber || '';
};

const getPatientContact = (patient: any): string => {
  const normalized = normalizePatient(patient);
  return normalized?.contact || '';
};

const getPatientAge = (patient: any): string => {
  const normalized = normalizePatient(patient);
  return normalized?.age || normalized?.ageDisplay || '';
};

const getPatientGender = (patient: any): string => {
  const normalized = normalizePatient(patient);
  return normalized?.gender || '';
};

const getPatientPaymentMode = (patient: any): string => {
  const normalized = normalizePatient(patient);
  return normalized?.paymentMode || '';
};

export const PatientAttendanceSelector: React.FC<PatientAttendanceSelectorProps> = ({
  patients,
  attendances,
  selectedPatientId,
  selectedAttendanceId,
  onPatientSelect,
  onAttendanceSelect,
  onClearSelection,
  autoSelectMostRecent = true,
}) => {
  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [showAttendanceDropdown, setShowAttendanceDropdown] = useState(false);
  const patientInputRef = useRef<HTMLInputElement>(null);
  const attendanceInputRef = useRef<HTMLInputElement>(null);
  const patientDropdownRef = useRef<HTMLDivElement>(null);
  const attendanceDropdownRef = useRef<HTMLDivElement>(null);

  // ✅ Normalize patients array
  const normalizedPatients = React.useMemo(() => {
    return patients.map(p => normalizePatient(p)).filter(p => p);
  }, [patients]);

  // ✅ Find selected patient
  const selectedPatient = React.useMemo(() => {
    if (!selectedPatientId || !normalizedPatients.length) return null;
    return normalizedPatients.find(p => p.id === selectedPatientId);
  }, [normalizedPatients, selectedPatientId]);

  // ✅ Sync search input with selected patient name
  useEffect(() => {
    if (selectedPatient) {
      setPatientSearch(getPatientFullName(selectedPatient));
    }
  }, [selectedPatient]);

  // ✅ Filter patients based on search
  const filteredPatients = normalizedPatients.filter(patient => {
    const fullName = getPatientFullName(patient).toLowerCase();
    const folderNumber = getPatientFolderNumber(patient).toLowerCase();
    const contact = getPatientContact(patient).toLowerCase();
    const search = patientSearch.toLowerCase();
    
    return fullName.includes(search) || 
           folderNumber.includes(search) ||
           contact.includes(search);
  });

  // Filter attendances for selected patient
  const patientAttendances = attendances
    .filter(a => {
      const attendancePatientId = a.patientId || a.patient?.id;
      return attendancePatientId === selectedPatientId;
    })
    .sort((a, b) => new Date(b.dateTime || b.createdAt).getTime() - new Date(a.dateTime || a.createdAt).getTime());

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />;
      case 'completed': return <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />;
      case 'admitted': return <Activity className="w-3.5 h-3.5 text-rose-500" />;
      default: return <Clock className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const getStatusText = (status: string) => {
    return status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown';
  };

  // Auto-select most recent attendance
  useEffect(() => {
    if (autoSelectMostRecent && selectedPatientId && patientAttendances.length > 0 && !selectedAttendanceId) {
      onAttendanceSelect(patientAttendances[0].id);
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
    setPatientSearch(getPatientFullName(patient));
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

  // Debug log
  console.log('🔍 PatientAttendanceSelector - normalizedPatients:', normalizedPatients.length);
  console.log('🔍 Selected patient:', selectedPatient);
  console.log('🔍 Selected patient name:', selectedPatient ? getPatientFullName(selectedPatient) : 'none');

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Patient Search Box */}
      <div className="relative">
        <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
          <User className="w-4 h-4 text-indigo-500" />
          Select Patient
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
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
            placeholder="Search by name, folder number, or phone..."
            className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-slate-800 placeholder-slate-400 transition-all"
          />
          {patientSearch && selectedPatientId && (
            <button
              onClick={clearPatient}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-100"
            >
              <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
            </button>
          )}
        </div>

        {/* Patient Dropdown */}
        {showPatientDropdown && patientSearch && (
          <div 
            ref={patientDropdownRef}
            className="absolute z-20 w-full mt-1 max-h-72 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg"
          >
            {filteredPatients.length > 0 ? (
              filteredPatients.map((patient) => (
                <button
                  key={patient.id}
                  onClick={() => handlePatientSelect(patient)}
                  className="w-full text-left p-3 hover:bg-slate-50 border-b border-slate-100 last:border-b-0 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-slate-800">
                        {getPatientFullName(patient)}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        {getPatientFolderNumber(patient) && <span className="font-mono">#{getPatientFolderNumber(patient)}</span>}
                        {getPatientContact(patient) && <span>📞 {getPatientContact(patient)}</span>}
                        {getPatientAge(patient) && <span>🎂 {getPatientAge(patient)}y</span>}
                        {getPatientGender(patient) && <span>{getPatientGender(patient) === 'male' ? '♂ Male' : getPatientGender(patient) === 'female' ? '♀ Female' : ''}</span>}
                      </div>
                    </div>
                    {getPatientPaymentMode(patient) === 'nhis' && (
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full">NHIS</span>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-slate-500 text-sm">
                No patients found
              </div>
            )}
          </div>
        )}

        {/* Selected Patient Display */}
        {selectedPatient && !patientSearch && (
          <div className="mt-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <div className="font-semibold text-slate-800">
                    {getPatientFullName(selectedPatient)}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                    {getPatientFolderNumber(selectedPatient) && <span className="font-mono">#{getPatientFolderNumber(selectedPatient)}</span>}
                    {getPatientContact(selectedPatient) && <span>• {getPatientContact(selectedPatient)}</span>}
                    {getPatientAge(selectedPatient) && <span>• {getPatientAge(selectedPatient)} years</span>}
                    {getPatientGender(selectedPatient) && <span>• {getPatientGender(selectedPatient) === 'male' ? 'Male' : 'Female'}</span>}
                  </div>
                </div>
              </div>
              <button onClick={clearPatient} className="p-1.5 hover:bg-white rounded-lg transition-colors">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Attendance Selector */}
      <div className="relative">
        <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-amber-500" />
          Select Visit / Attendance
          {autoSelectMostRecent && selectedPatientId && patientAttendances.length > 0 && !selectedAttendanceId && (
            <span className="text-xs text-indigo-500 flex items-center gap-1 ml-2">
              <Sparkles className="w-3 h-3" />
              Auto-selecting latest...
            </span>
          )}
        </label>
        
        {!selectedPatientId ? (
          <div className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-400 flex items-center gap-2 cursor-not-allowed">
            <span className="w-2 h-2 rounded-full bg-slate-300" />
            Select a patient first
          </div>
        ) : (
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              ref={attendanceInputRef}
              type="text"
              value={selectedAttendanceId ? patientAttendances.find(a => a.id === selectedAttendanceId)?.attendanceNumber || '' : ''}
              onFocus={() => setShowAttendanceDropdown(true)}
              placeholder={patientAttendances.length > 0 ? "Select a visit..." : "No visits found"}
              readOnly
              className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-slate-800 placeholder-slate-400 cursor-pointer transition-all"
            />
            <button
              onClick={() => setShowAttendanceDropdown(!showAttendanceDropdown)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
            >
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>
            
            {selectedAttendanceId && (
              <button
                onClick={clearAttendance}
                className="absolute right-8 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-100"
              >
                <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
              </button>
            )}

            {/* Attendance Dropdown */}
            {showAttendanceDropdown && (
              <div 
                ref={attendanceDropdownRef}
                className="absolute z-20 w-full mt-1 max-h-64 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg"
              >
                {patientAttendances.length > 0 ? (
                  patientAttendances.map((att) => (
                    <button
                      key={att.id}
                      onClick={() => {
                        onAttendanceSelect(att.id);
                        setShowAttendanceDropdown(false);
                      }}
                      className={`w-full text-left p-3 hover:bg-slate-50 border-b border-slate-100 last:border-b-0 transition-colors ${
                        selectedAttendanceId === att.id ? 'bg-indigo-50' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-800">
                              {att.attendanceNumber}
                            </span>
                            {getStatusIcon(att.status)}
                            <span className="text-xs text-slate-500">
                              {getStatusText(att.status)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                            <span>📅 {new Date(att.dateTime || att.createdAt).toLocaleDateString()}</span>
                            <span>🏥 {att.attendanceType?.replace(/_/g, ' ') || 'General'}</span>
                          </div>
                          {att.complaints && (
                            <p className="text-xs text-slate-500 mt-1 truncate max-w-md">
                              {att.complaints}
                            </p>
                          )}
                        </div>
                        {att.paymentMode === 'nhis' && (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full">NHIS</span>
                        )}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-slate-500 text-sm">
                    No attendances found for this patient
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};