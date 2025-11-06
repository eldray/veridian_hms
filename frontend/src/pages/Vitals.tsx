// src/pages/Vitals.tsx - UPDATED LAYOUT
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatientStore } from '../store/patientStore';
import { useAttendanceStore } from '../store/attendanceStore';
import { useAuthStore } from '../store/authStore';
import type { Vitals, Patient, Attendance } from '../types';
import {
  Heart,
  Save,
  Search,
  User,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Hospital,
  ArrowLeft,
  Activity,
  Thermometer,
  Gauge,
  Wind,
  Droplets,
  Scale,
  Ruler,
  PlayCircle,
  Clock,
  Edit
} from 'lucide-react';

// Helper: Get consistent ID from entity
const getEntityId = (entity: { id?: string; _id?: string } | null): string | undefined => {
  return entity?._id || entity?.id;
};

export default function Vitals() {
  const navigate = useNavigate(); 
  const { patients, loadPatients } = usePatientStore();
  const {
    attendances,
    getAttendances,
    addVitalsToAttendance,
    getVitalsByAttendance,
    updateAttendanceStatus,
    canPerformActivities
  } = useAttendanceStore();
  const { user } = useAuthStore();

  // Load initial data
  useEffect(() => {
    loadPatients();
    getAttendances();
  }, []);

  // Search state
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedAttendanceId, setSelectedAttendanceId] = useState<string>('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [activatingAttendance, setActivatingAttendance] = useState(false);

  // Vitals input state
  const [vitalsInput, setVitalsInput] = useState<Omit<Vitals, 'recordedAt' | 'recordedBy' | 'bmi'>>({
    bloodPressure: '',
    temperature: undefined,
    pulse: undefined,
    respiration: undefined,
    spo2: undefined,
    weight: undefined,
    height: undefined,
  });

  // Previous vitals
  const [previousVitals, setPreviousVitals] = useState<Vitals[]>([]);

  // Success/error state
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Filter patients based on search term
  const filteredPatients = patients.filter(
    (p) =>
      p.fullName.toLowerCase().includes(patientSearch.toLowerCase()) ||
      p.contact.includes(patientSearch) ||
      (p.folderNumber && p.folderNumber.toLowerCase().includes(patientSearch.toLowerCase()))
  );

  // Enhanced patient matching function for attendances
  const findPatient = (attendance: any) => {
    if (attendance?.patient?.fullName) {
      return attendance.patient;
    }

    let actualPatientId: string | null = null;
    
    if (attendance.patientId && typeof attendance.patientId === 'object') {
      actualPatientId = (
        attendance.patientId._id ||
        attendance.patientId.id ||
        attendance.patientId.patientId ||
        attendance.patientId.patientID
      )?.toString();
    } else if (attendance.patientId) {
      actualPatientId = attendance.patientId.toString();
    }

    if (actualPatientId) {
      const patient = patients.find(p => {
        const patientId = getEntityId(p);
        return patientId === actualPatientId;
      });
      if (patient) return patient;
    }

    if (attendance.patient && typeof attendance.patient === 'object') {
      const patientObjId = getEntityId(attendance.patient);
      if (patientObjId) {
        const patient = patients.find(p => getEntityId(p) === patientObjId);
        if (patient) return patient;
      }
    }

    return null;
  };

  // Get attendances for selected patient
  const patientAttendances = attendances
    .filter(a => {
      const patient = findPatient(a);
      return patient && (getEntityId(patient) === selectedPatientId);
    })
    .map(attendance => ({
      ...attendance,
      patient: findPatient(attendance)
    }));

  // Get the latest pending attendance for auto-selection
  const getLatestPendingAttendance = () => {
    const pendingAttendances = patientAttendances.filter(a => a.status === 'pending');
    return pendingAttendances.sort((a, b) => 
      new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
    )[0];
  };

  // Lookup selected entities
  const selectedPatient = patients.find((p) => getEntityId(p) === selectedPatientId);
  const selectedAttendance = attendances.find((a) => getEntityId(a) === selectedAttendanceId);

  // Auto-select latest pending attendance when patient is selected
  useEffect(() => {
    if (selectedPatientId && patientAttendances.length > 0) {
      const latestPending = getLatestPendingAttendance();
      if (latestPending) {
        setSelectedAttendanceId(getEntityId(latestPending) || '');
      } else {
        setSelectedAttendanceId(getEntityId(patientAttendances[0]) || '');
      }
    }
  }, [selectedPatientId, patientAttendances]);

  // Status checks
  const canRecordVitals = selectedAttendance ? canPerformActivities(selectedAttendance) : false;
  const isAttendancePending = selectedAttendance?.status === 'pending';

  // Compute BMI reactively
  const bmi = useMemo(() => {
    if (vitalsInput.weight && vitalsInput.height) {
      const heightInMeters = vitalsInput.height / 100;
      const calculated = vitalsInput.weight / (heightInMeters * heightInMeters);
      return parseFloat(calculated.toFixed(1));
    }
    return undefined;
  }, [vitalsInput.weight, vitalsInput.height]);

  // Load previous vitals when attendance changes
  useEffect(() => {
    if (selectedAttendanceId && selectedAttendanceId.trim()) {
      const loadVitals = async () => {
        try {
          const data = await getVitalsByAttendance(selectedAttendanceId);
          setPreviousVitals(data || []);
        } catch (error) {
          console.error('Failed to load previous vitals:', error);
          setPreviousVitals([]);
        }
      };
      loadVitals();
    } else {
      setPreviousVitals([]);
    }
  }, [selectedAttendanceId, getVitalsByAttendance]);

  // Activate attendance
  const handleActivateAttendance = async () => {
    if (!selectedAttendanceId) return;
    setActivatingAttendance(true);
    try {
      await updateAttendanceStatus(selectedAttendanceId, 'active');
      setMessage({ type: 'success', text: 'Attendance activated! You can now record vitals.' });
      await getAttendances(); // Refresh
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to activate attendance' });
    } finally {
      setActivatingAttendance(false);
    }
  };

  // Submit vitals
  const handleSubmitVitals = async () => {
    if (!selectedPatientId || !selectedAttendanceId) {
      setMessage({ type: 'error', text: 'Please select a patient and attendance' });
      return;
    }

    if (!canRecordVitals) {
      setMessage({ type: 'error', text: 'Cannot record vitals for pending or completed attendance' });
      return;
    }

    const hasAnyValue =
      vitalsInput.bloodPressure ||
      vitalsInput.temperature !== undefined ||
      vitalsInput.pulse !== undefined ||
      vitalsInput.respiration !== undefined ||
      vitalsInput.spo2 !== undefined ||
      vitalsInput.weight !== undefined ||
      vitalsInput.height !== undefined;

    if (!hasAnyValue) {
      setMessage({ type: 'error', text: 'Please enter at least one vital sign' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const vitalsToSubmit: Vitals = {
        ...vitalsInput,
        bmi,
        recordedAt: new Date().toISOString(),
        recordedBy: user?.fullName || user?.username || 'Unknown',
      };

      await addVitalsToAttendance(selectedAttendanceId, vitalsToSubmit);
      const updatedVitals = await getVitalsByAttendance(selectedAttendanceId);
      setPreviousVitals(updatedVitals || []);

      setMessage({ type: 'success', text: 'Vitals recorded successfully!' });

      // Reset form
      setTimeout(() => {
        setVitalsInput({
          bloodPressure: '',
          temperature: undefined,
          pulse: undefined,
          respiration: undefined,
          spo2: undefined,
          weight: undefined,
          height: undefined,
        });
        setMessage(null);
      }, 2000);
    } catch (error: any) {
      console.error('Failed to save vitals:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Failed to save vitals'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Status helpers
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'active': return <Activity className="w-4 h-4" />;
      case 'completed': return <CheckCircle2 className="w-4 h-4" />;
      case 'cancelled': return <AlertCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-8 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-blue-900 rounded-2xl p-8 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard/medical-entries')}
              className="p-3 hover:bg-white/20 rounded-xl transition-all duration-200 backdrop-blur-sm"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20">
              <Heart className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">Vital Signs</h1>
              <p className="text-blue-100 text-lg">
                Record and monitor patient vital signs
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-xl flex items-center gap-3 border ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border-green-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {/* Patient and Attendance Selection - SIDE BY SIDE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patient Selection */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900">
            <User className="w-5 h-5 text-blue-600" />
            Patient Selection
          </h2>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search patient by name, contact, or folder number..."
                value={patientSearch}
                onChange={(e) => {
                  setPatientSearch(e.target.value);
                  setShowPatientDropdown(true);
                }}
                onFocus={() => setShowPatientDropdown(true)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
              
              {/* Patient Search Results */}
              {showPatientDropdown && patientSearch && (
                <div className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto border border-gray-300 rounded-xl bg-white shadow-lg">
                  {filteredPatients.length > 0 ? (
                    filteredPatients.map((patient) => {
                      const pid = getEntityId(patient);
                      if (!pid) return null;
                      return (
                        <button
                          key={pid}
                          onClick={() => {
                            setSelectedPatientId(pid);
                            setPatientSearch(patient.fullName);
                            setShowPatientDropdown(false);
                          }}
                          className="w-full text-left p-4 hover:bg-blue-50 border-b last:border-b-0 transition-colors"
                        >
                          <div className="font-semibold text-gray-900">{patient.fullName}</div>
                          <div className="text-sm text-gray-600">
                            {patient.gender} • {patient.contact} • {patient.folderNumber}
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="p-4 text-gray-500 text-center">No patients found</div>
                  )}
                </div>
              )}
            </div>
            
            {selectedPatient && (
              <div className="p-4 bg-gradient-to-r from-blue-50 to-teal-50 rounded-xl border border-blue-200">
                <div className="font-bold text-lg text-gray-900">{selectedPatient.fullName}</div>
                <div className="text-sm text-gray-700 mt-1">
                  {selectedPatient.age} years • {selectedPatient.gender} • {selectedPatient.folderNumber}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Attendance Selection */}
        {selectedPatientId && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900">
              <Calendar className="w-5 h-5 text-green-600" />
              Select Attendance
            </h2>
            
            {patientAttendances.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm mb-2">No attendances found for this patient</p>
                <button
                  onClick={() => navigate('/dashboard/medical-entries')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all text-sm"
                >
                  Create New Attendance
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <select
                    value={selectedAttendanceId}
                    onChange={(e) => setSelectedAttendanceId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none bg-white"
                  >
                    <option value="">Select an attendance...</option>
                    {patientAttendances.map((attendance) => {
                      const aid = getEntityId(attendance);
                      if (!aid) return null;
                      return (
                        <option key={aid} value={aid}>
                          {attendance.attendanceNumber} - {new Date(attendance.dateTime).toLocaleDateString()} - {attendance.status}
                        </option>
                      );
                    })}
                  </select>
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Selected Attendance Details */}
                {selectedAttendance && (
                  <div className="p-4 border-2 border-blue-500 bg-blue-50 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-gray-900">
                          {selectedAttendance.attendanceNumber}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {new Date(selectedAttendance.dateTime).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-600 capitalize">
                          {selectedAttendance.attendanceType?.replace('_', ' ')}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {/* Status Badge */}
                        <div className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(selectedAttendance.status)}`}>
                          {selectedAttendance.status}
                        </div>

                        {/* Edit Button */}
                        <button
                          onClick={() => navigate('/dashboard/medical-entries')}
                          className="p-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors duration-200"
                          title="Edit Attendance"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Attendance Status & Actions */}
      {selectedAttendance && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Attendance Status</h3>
              <p className="text-sm text-gray-600">
                Current status: 
                <span className={`ml-2 px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(selectedAttendance.status)} flex items-center gap-1 w-fit mt-1`}>
                  {getStatusIcon(selectedAttendance.status)}
                  {selectedAttendance.status?.charAt(0).toUpperCase() + selectedAttendance.status?.slice(1)}
                </span>
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {isAttendancePending && (
                <button
                  onClick={handleActivateAttendance}
                  disabled={activatingAttendance}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all disabled:opacity-50"
                >
                  <PlayCircle className="w-4 h-4" />
                  {activatingAttendance ? 'Activating...' : 'Activate to Record Vitals'}
                </button>
              )}
              
              <div
                className={`px-3 py-2 text-sm font-semibold rounded-full border ${
                  canRecordVitals
                    ? 'bg-green-100 text-green-800 border-green-200'
                    : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                }`}
              >
                {canRecordVitals ? (
                  <div className="flex items-center gap-1">
                    <Activity className="w-4 h-4" />
                    Ready to Record Vitals
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {isAttendancePending ? 'Attendance Not Active' : 'Attendance Completed'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Previous Vitals Display - Compact */}
      {previousVitals.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900">
            <Activity className="w-5 h-5 text-blue-600" />
            Previous Vitals History
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date & Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">BP</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Temp</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Pulse</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Resp</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">SpO2</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Weight</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Height</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">BMI</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {previousVitals.map((vital, index) => {
                  const key = vital._id || `vital-${index}`;
                  return (
                    <tr key={key} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {new Date(vital.recordedAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{vital.bloodPressure || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{vital.temperature || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{vital.pulse || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{vital.respiration || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{vital.spo2 || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{vital.weight || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{vital.height || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{vital.bmi || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Vitals Input Form */}
      {selectedAttendance && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-semibold mb-4 text-gray-900">Record New Vitals</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Blood Pressure */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Blood Pressure (mmHg)</label>
              <div className="relative">
                <Gauge className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="e.g., 120/80"
                  value={vitalsInput.bloodPressure}
                  onChange={(e) => setVitalsInput({ ...vitalsInput, bloodPressure: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Temperature */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Temperature (°C)</label>
              <div className="relative">
                <Thermometer className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g., 37.0"
                  value={vitalsInput.temperature ?? ''}
                  onChange={(e) =>
                    setVitalsInput({
                      ...vitalsInput,
                      temperature: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Pulse */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pulse (bpm)</label>
              <div className="relative">
                <Heart className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  placeholder="e.g., 72"
                  value={vitalsInput.pulse ?? ''}
                  onChange={(e) =>
                    setVitalsInput({
                      ...vitalsInput,
                      pulse: e.target.value ? parseInt(e.target.value, 10) : undefined,
                    })
                  }
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Respiration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Respiration (rpm)</label>
              <div className="relative">
                <Wind className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  placeholder="e.g., 16"
                  value={vitalsInput.respiration ?? ''}
                  onChange={(e) =>
                    setVitalsInput({
                      ...vitalsInput,
                      respiration: e.target.value ? parseInt(e.target.value, 10) : undefined,
                    })
                  }
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* SpO2 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SpO2 (%)</label>
              <div className="relative">
                <Droplets className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  placeholder="e.g., 98"
                  value={vitalsInput.spo2 ?? ''}
                  onChange={(e) =>
                    setVitalsInput({
                      ...vitalsInput,
                      spo2: e.target.value ? parseInt(e.target.value, 10) : undefined,
                    })
                  }
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Weight */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
              <div className="relative">
                <Scale className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g., 70.5"
                  value={vitalsInput.weight ?? ''}
                  onChange={(e) =>
                    setVitalsInput({
                      ...vitalsInput,
                      weight: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Height */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Height (cm)</label>
              <div className="relative">
                <Ruler className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  placeholder="e.g., 170"
                  value={vitalsInput.height ?? ''}
                  onChange={(e) =>
                    setVitalsInput({
                      ...vitalsInput,
                      height: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* BMI (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">BMI</label>
              <div className="relative">
                <Activity className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={bmi ?? ''}
                  readOnly
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-500"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end mt-6">
            <button
              onClick={handleSubmitVitals}
              disabled={isLoading || !canRecordVitals}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl hover:from-blue-700 hover:to-teal-700 transition-all duration-200 hover:shadow-xl shadow-lg flex items-center gap-3 text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Recording...</span>
                </>
              ) : (
                <>
                  <Save className="w-6 h-6" />
                  <span>Record Vitals</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Cannot record vitals message */}
      {selectedAttendanceId && !canRecordVitals && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="text-center py-8">
            <Clock className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {isAttendancePending ? 'Attendance Not Active' : 'Attendance Completed'}
            </h3>
            <p className="text-gray-600 mb-4">
              {isAttendancePending
                ? 'This attendance is in planning phase. Activate it to start recording vitals.'
                : 'This attendance has been completed. No further vitals can be recorded.'}
            </p>
            {isAttendancePending && (
              <button
                onClick={handleActivateAttendance}
                disabled={activatingAttendance}
                className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all disabled:opacity-50"
              >
                {activatingAttendance ? 'Activating...' : 'Activate Attendance'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
