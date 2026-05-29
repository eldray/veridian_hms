// src/pages/VitalsEntry.tsx - FIXED with refresh and proper vitals display
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAttendanceStore } from '../store/attendanceStore';
import { usePatientStore } from '../store/patientStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import { VitalsFormModal } from '../components/vitals/VitalsFormModal';
import { VitalsTrendGraph } from '../components/vitals/VitalsTrendGraph';
import { VitalsHistory } from '../components/vitals/VitalsHistory';
import { PatientAttendanceSelector } from '../components/vitals/PatientAttendanceSelector';
import {
  ChevronLeft,
  Activity,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Heart,
  Thermometer,
  User,
  Calendar,
  TrendingUp,
  Clock,
  Plus,
  Printer,
  Download,
  Baby,
  Shield,
  Droplet,
  Wind,
  Ruler,
  Weight,
} from 'lucide-react';

const getEntityId = (entity: { id?: string; _id?: string } | null): string | undefined =>
  entity?.id || entity?._id;

// Helper function to calculate age
const calculateAge = (dateOfBirth: string | Date): number => {
  if (!dateOfBirth) return 0;
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

// Vital Card Component
const VitalCard = ({ icon: Icon, label, value, unit, type, abnormal }: any) => {
  const getVitalStatus = (type: string, value: any): { color: string; bgColor: string; message?: string } => {
    if (!value) return { color: 'text-[var(--text-secondary)]', bgColor: 'bg-gray-100' };
    
    switch (type) {
      case 'bloodPressure':
        if (typeof value === 'string') {
          const [systolic, diastolic] = value.split('/').map(Number);
          if (systolic > 140 || diastolic > 90) return { color: 'text-red-600', bgColor: 'bg-red-50', message: 'High' };
          if (systolic < 90 || diastolic < 60) return { color: 'text-yellow-600', bgColor: 'bg-yellow-50', message: 'Low' };
        }
        return { color: 'text-green-600', bgColor: 'bg-green-50', message: 'Normal' };
      case 'temperature':
        if (value > 38) return { color: 'text-red-600', bgColor: 'bg-red-50', message: 'Fever' };
        if (value < 35) return { color: 'text-yellow-600', bgColor: 'bg-yellow-50', message: 'Low' };
        return { color: 'text-green-600', bgColor: 'bg-green-50', message: 'Normal' };
      case 'pulse':
        if (value > 100) return { color: 'text-red-600', bgColor: 'bg-red-50', message: 'High' };
        if (value < 60) return { color: 'text-yellow-600', bgColor: 'bg-yellow-50', message: 'Low' };
        return { color: 'text-green-600', bgColor: 'bg-green-50', message: 'Normal' };
      case 'spo2':
        if (value < 95) return { color: 'text-red-600', bgColor: 'bg-red-50', message: 'Low' };
        return { color: 'text-green-600', bgColor: 'bg-green-50', message: 'Normal' };
      case 'fetalHeartRate':
        if (value < 110 || value > 160) return { color: 'text-red-600', bgColor: 'bg-red-50', message: 'Abnormal' };
        return { color: 'text-green-600', bgColor: 'bg-green-50', message: 'Normal' };
      default:
        return { color: 'text-[var(--text-secondary)]', bgColor: 'bg-gray-100' };
    }
  };
  
  const status = getVitalStatus(type, value);
  const displayColor = abnormal === true ? 'text-red-600' : abnormal === false ? 'text-green-600' : status.color;
  const displayBg = abnormal === true ? 'bg-red-50' : abnormal === false ? 'bg-green-50' : status.bgColor;
  
  return (
    <div className={`${displayBg} rounded-xl p-4 transition-all duration-200 border border-[var(--border-color)]`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded-lg ${displayBg} ${displayColor}`}>
          <Icon className="w-5 h-5" />
        </div>
        {status.message && (
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${displayBg} ${displayColor}`}>
            {status.message}
          </span>
        )}
      </div>
      <div className="mt-2">
        <p className="text-sm text-[var(--text-secondary)]">{label}</p>
        <p className={`text-2xl font-bold ${displayColor}`}>
          {value || '—'}
          {unit && <span className="text-sm font-normal ml-1">{unit}</span>}
        </p>
      </div>
    </div>
  );
};

// Status Badge component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colors: Record<string, string> = {
    'pending': 'bg-yellow-100 text-yellow-800',
    'active': 'bg-green-100 text-green-800',
    'completed': 'bg-blue-100 text-blue-800',
    'cancelled': 'bg-red-100 text-red-800',
    'admitted': 'bg-purple-100 text-purple-800',
    'discharged': 'bg-gray-100 text-gray-800'
  };
  const cls = colors[status?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {status || 'pending'}
    </span>
  );
};

export default function VitalsEntry() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { success, error: toastError } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedAttendanceId, setSelectedAttendanceId] = useState<string>('');
  const [vitalsList, setVitalsList] = useState<any[]>([]);
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [editingVitals, setEditingVitals] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const initialLoadDone = useRef(false);

  const { 
    attendances, 
    getAttendances, 
    addVitals, 
    updateVitals, 
    deleteVitals, 
    getVitalsByAttendance,
    canRecordVitals 
  } = useAttendanceStore();
  const { patients, loadPatients } = usePatientStore();
  const { user } = useAuthStore();

  // Derived data
  const selectedPatient = patients.find(p => getEntityId(p) === selectedPatientId);
  const selectedAttendance = attendances.find(a => a.id === selectedAttendanceId);
  const canRecord = selectedAttendance ? canRecordVitals(selectedAttendance) : false;
  const isAntenatal = selectedAttendance?.attendanceType === 'antenatal';
  
  // Get patient's attendances for the selector
  const patientAttendances = useMemo(() => {
    if (!selectedPatientId) return [];
    return attendances.filter(a => a.patientId === selectedPatientId);
  }, [attendances, selectedPatientId]);

  const latestVitals = vitalsList.length > 0 ? vitalsList[vitalsList.length - 1] : null;
  
  const hasAbnormalVitals = latestVitals ? (
    (latestVitals.bloodPressure && (() => {
      const [sys] = latestVitals.bloodPressure.split('/').map(Number);
      return sys > 140 || sys < 90;
    })()) ||
    (latestVitals.temperature !== undefined && (latestVitals.temperature > 38 || latestVitals.temperature < 35)) ||
    (latestVitals.pulse !== undefined && (latestVitals.pulse > 100 || latestVitals.pulse < 60)) ||
    (latestVitals.spo2 !== undefined && latestVitals.spo2 < 95) ||
    (isAntenatal && latestVitals.fetalHeartRate !== undefined && (latestVitals.fetalHeartRate < 110 || latestVitals.fetalHeartRate > 160))
  ) : false;

  // ============================================
  // LOAD DATA
  // ============================================
  
  const loadData = async () => {
    try {
      setRefreshing(true);
      await Promise.all([
        loadPatients(),
        getAttendances()
      ]);
    } catch (err: any) {
      toastError('Load failed', err.message);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const loadVitals = async (attendanceId: string) => {
    try {
      const vitals = await getVitalsByAttendance(attendanceId);
      console.log('Loaded vitals:', vitals); // Debug log
      setVitalsList(vitals || []);
    } catch (err: any) {
      console.error('Error loading vitals:', err);
      setVitalsList([]);
    }
  };

  // Refresh function - reloads both data and vitals
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadData();
      if (selectedAttendanceId) {
        await loadVitals(selectedAttendanceId);
      }
      success('Refreshed', 'Data updated successfully');
    } catch (err: any) {
      toastError('Refresh failed', err.message);
    } finally {
      setRefreshing(false);
    }
  };

  // ============================================
  // HANDLE NAVIGATION FROM WAITING LIST
  // ============================================
  
  const processNavigationState = useCallback(() => {
    if (location.state?.patient) {
      const navPatient = location.state.patient;
      const existingPatient = patients.find(p => 
        p.id === navPatient.id || p.folderNumber === navPatient.folderNumber
      );
      
      if (existingPatient) {
        setSelectedPatientId(existingPatient.id);
        
        if (location.state.attendanceId) {
          const attendance = attendances.find(a => a.id === location.state.attendanceId);
          if (attendance) {
            setSelectedAttendanceId(location.state.attendanceId);
            loadVitals(location.state.attendanceId);
          }
        }
      }
    }
  }, [location.state, patients, attendances]);

  // ============================================
  // EFFECTS
  // ============================================
  
  // Initial load
  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      loadData();
    }
  }, []);

  // Process navigation state after data is loaded
  useEffect(() => {
    if (isLoading) return;
    processNavigationState();
  }, [isLoading, processNavigationState]);

  // Handle URL param
  useEffect(() => {
    if (isLoading || !attendances.length) return;
    
    if (id) {
      const attendance = attendances.find(a => a.id === id);
      if (attendance) {
        setSelectedPatientId(attendance.patientId);
        setSelectedAttendanceId(id);
        loadVitals(id);
      }
    }
  }, [id, isLoading, attendances]);

  // Load vitals when selected attendance changes
  useEffect(() => {
    if (selectedAttendanceId) {
      loadVitals(selectedAttendanceId);
    } else {
      setVitalsList([]);
    }
  }, [selectedAttendanceId]);

  // ============================================
  // EVENT HANDLERS
  // ============================================
  
  const handlePatientSelect = (patientId: string) => {
    setSelectedPatientId(patientId);
    setSelectedAttendanceId('');
    setVitalsList([]);
    setEditingVitals(null);
  };

  const handleAttendanceSelect = (attendanceId: string) => {
    setSelectedAttendanceId(attendanceId);
    setEditingVitals(null);
  };

  const handleClearSelection = () => {
    setSelectedPatientId('');
    setSelectedAttendanceId('');
    setVitalsList([]);
    setEditingVitals(null);
  };

  const handleSubmitVitals = async (vitalsData: any) => {
    if (!selectedAttendanceId) {
      toastError('Error', 'No attendance selected');
      return;
    }
    
    if (!canRecordVitals(selectedAttendance)) {
      toastError('Cannot Record', 'Cannot record vitals for this attendance status');
      return;
    }
    
    setIsSubmitting(true);
    try {
      let result;
      if (editingVitals?.id) {
        result = await updateVitals(selectedAttendanceId, editingVitals.id, vitalsData);
        success('Vitals Updated', 'Vitals updated successfully!');
      } else {
        result = await addVitals(selectedAttendanceId, {
          ...vitalsData,
          recordedAt: new Date().toISOString(),
          recordedById: user?.id,
        });
        success('Vitals Recorded', 'Vitals recorded successfully!');
      }
      
      console.log('Save result:', result);
      
      // IMPORTANT: Force reload vitals after save
      await loadVitals(selectedAttendanceId);
      
      // Also refresh the attendance to ensure UI updates
      await getAttendances();
      
      setShowVitalsModal(false);
      setEditingVitals(null);
    } catch (err: any) {
      console.error('Save error:', err);
      toastError('Save Failed', err.message || 'Failed to save vitals');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditVitals = (vitals: any) => {
    setEditingVitals(vitals);
    setShowVitalsModal(true);
  };

  const handleDeleteVitals = async (vitals: any) => {
    if (!selectedAttendanceId || !vitals.id) return;
    if (!confirm('Are you sure you want to delete these vitals?')) return;
    
    try {
      await deleteVitals(selectedAttendanceId, vitals.id);
      success('Vitals Deleted', 'Vitals record deleted successfully!');
      await loadVitals(selectedAttendanceId);
    } catch (err: any) {
      toastError('Delete Failed', err.message || 'Failed to delete vitals');
    }
  };

  // ============================================
  // RENDER
  // ============================================
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
        <div className="text-center bg-[var(--bg-card)] p-8 rounded-xl border border-[var(--border-color)]">
          <div className="w-12 h-12 border-4 border-[var(--icon-red-text)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Loading Vitals Data...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard/vitals')}
            className="p-2 hover:bg-[var(--bg-card)] rounded-lg transition-all border border-[var(--border-color)]"
          >
            <ChevronLeft className="w-5 h-5 text-[var(--text-primary)]" />
          </button>
          <div className="w-10 h-10 bg-[var(--icon-red-bg)] rounded-xl flex items-center justify-center">
            <Activity className="w-5 h-5 text-[var(--icon-red-text)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Vital Signs</h1>
            <p className="text-sm text-[var(--text-secondary)]">Record and monitor patient vital signs</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* ✅ REFRESH BUTTON */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all disabled:opacity-50 text-sm text-[var(--text-primary)]"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {/* Print button */}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all text-sm text-[var(--text-primary)]"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      {/* Patient & Attendance Selector */}
      <PatientAttendanceSelector
        patients={patients}
        attendances={patientAttendances}
        selectedPatientId={selectedPatientId}
        selectedAttendanceId={selectedAttendanceId}
        onPatientSelect={handlePatientSelect}
        onAttendanceSelect={handleAttendanceSelect}
        onClearSelection={handleClearSelection}
        placeholder="Search for a patient..."
      />

      {/* Show message when patient is selected but no attendance */}
      {selectedPatientId && !selectedAttendanceId && (
        <div className="bg-[var(--icon-yellow-bg)] border border-[var(--icon-yellow-text)] rounded-xl p-6 text-center">
          <Calendar className="w-12 h-12 text-[var(--icon-yellow-text)] mx-auto mb-3 opacity-50" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Select an Attendance</h3>
          <p className="text-[var(--text-secondary)]">
            Please select an attendance from the dropdown above to record vitals for {selectedPatient?.surname} {selectedPatient?.otherNames}.
          </p>
          {patientAttendances.length === 0 && (
            <p className="text-sm text-[var(--icon-red-text)] mt-2">
              No existing attendances found. Please create an attendance first.
            </p>
          )}
        </div>
      )}

      {/* No Patient Selected */}
      {!selectedPatientId && (
        <div className="bg-[var(--icon-cyan-bg)] border border-[var(--icon-cyan-text)] rounded-xl p-8 text-center">
          <User className="w-12 h-12 text-[var(--icon-cyan-text)] mx-auto mb-3 opacity-50" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Select a Patient</h3>
          <p className="text-[var(--text-secondary)]">
            Search and select a patient from the dropdown above to view or record vitals.
          </p>
        </div>
      )}

      {/* Main Content - When attendance is selected */}
      {selectedAttendanceId && selectedAttendance && (
        <>
          {/* Patient & Visit Overview Banner */}
          <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[var(--icon-cyan-bg)] rounded-xl flex items-center justify-center">
                  <User className="w-6 h-6 text-[var(--icon-cyan-text)]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">
                    {selectedPatient?.surname} {selectedPatient?.otherNames}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)] mt-1">
                    <span>{calculateAge(selectedPatient?.dateOfBirth)} years • {selectedPatient?.gender}</span>
                    <span>•</span>
                    <span>ID: {selectedPatient?.folderNumber}</span>
                    <span>•</span>
                    <span>{selectedPatient?.contact}</span>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-md font-semibold text-[var(--text-primary)]">
                  {selectedAttendance.attendanceNumber || 'Current Visit'}
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2 text-sm text-[var(--text-secondary)] mt-1">
                  <StatusBadge status={selectedAttendance.status} />
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(selectedAttendance.dateTime || selectedAttendance.createdAt).toLocaleDateString()}
                  </span>
                  {isAntenatal && (
                    <span className="flex items-center gap-1 text-pink-600">
                      <Baby className="w-3.5 h-3.5" />
                      Antenatal Visit
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Read-only warning */}
          {!canRecord && (
            <div className="bg-[var(--icon-yellow-bg)] border border-[var(--icon-yellow-text)] rounded-xl p-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-[var(--icon-yellow-text)]" />
              <p className="text-sm text-[var(--icon-yellow-text)]">
                This visit is <strong>{selectedAttendance.status}</strong>. Vitals can be viewed but not recorded.
              </p>
            </div>
          )}

          {/* Vitals Tracking Section */}
          <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Vital Signs Tracking</h2>
                {hasAbnormalVitals && (
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Abnormal Values Detected</span>
                  </div>
                )}
                {latestVitals && (
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                    <CheckCircle className="w-3 h-3" />
                    <span>Updated: {new Date(latestVitals.recordedAt).toLocaleTimeString()}</span>
                  </div>
                )}
              </div>
              {canRecord && (
                <button
                  onClick={() => setShowVitalsModal(true)}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  Record New Vitals
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Current Vitals Grid */}
              <div className="space-y-4">
                <h3 className="text-md font-semibold text-[var(--text-primary)]">Current Readings</h3>
                <div className="grid grid-cols-2 gap-3">
                  <VitalCard 
                    icon={Activity} 
                    label="Blood Pressure" 
                    value={latestVitals?.bloodPressure} 
                    unit="mmHg" 
                    type="bloodPressure"
                  />
                  <VitalCard 
                    icon={Thermometer} 
                    label="Temperature" 
                    value={latestVitals?.temperature} 
                    unit="°C" 
                    type="temperature"
                  />
                  <VitalCard 
                    icon={Heart} 
                    label="Pulse" 
                    value={latestVitals?.pulse} 
                    unit="bpm" 
                    type="pulse"
                  />
                  <VitalCard 
                    icon={Wind} 
                    label="Respiration" 
                    value={latestVitals?.respiration} 
                    unit="bpm" 
                    type="respiration"
                  />
                  <VitalCard 
                    icon={Droplet} 
                    label="SpO2" 
                    value={latestVitals?.spo2} 
                    unit="%" 
                    type="spo2"
                  />
                  <VitalCard 
                    icon={Weight} 
                    label="Weight" 
                    value={latestVitals?.weight} 
                    unit="kg" 
                    type="weight"
                  />
                  {latestVitals?.height && (
                    <VitalCard 
                      icon={Ruler} 
                      label="Height" 
                      value={latestVitals.height} 
                      unit="cm" 
                      type="height"
                    />
                  )}
                  {latestVitals?.bmi && (
                    <VitalCard 
                      icon={TrendingUp} 
                      label="BMI" 
                      value={latestVitals.bmi} 
                      unit="kg/m²" 
                      type="bmi"
                    />
                  )}
                </div>
                
                {/* Debug: Show vitals count */}
                <div className="text-xs text-[var(--text-tertiary)] text-center">
                  {vitalsList.length} vital record(s) found
                </div>
              </div>

              {/* Vitals Trend Graph */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-md font-semibold text-[var(--text-primary)]">Historical Trend Analysis</h3>
                {vitalsList.length > 1 ? (
                  <div className="bg-[var(--bg-main)] rounded-lg p-4 h-[450px]">
                    <VitalsTrendGraph vitals={vitalsList} isAntenatal={isAntenatal} />
                  </div>
                ) : (
                  <div className="h-[450px] bg-[var(--bg-main)] rounded-lg flex flex-col items-center justify-center text-[var(--text-secondary)]">
                    <Activity className="w-12 h-12 mb-3 opacity-50" />
                    <p className="text-sm">Need at least 2 vitals records to show trend</p>
                    <p className="text-xs mt-1">Record more vitals to see patterns over time</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Vitals History Table */}
          {vitalsList.length > 0 && (
            <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Vitals History</h3>
                <div className="flex gap-2">
                  <button 
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="p-1.5 hover:bg-[var(--bg-main)] rounded-lg transition-colors"
                    title="Refresh"
                  >
                    <RefreshCw className={`w-4 h-4 text-[var(--text-secondary)] ${refreshing ? 'animate-spin' : ''}`} />
                  </button>
                  <button className="p-1.5 hover:bg-[var(--bg-main)] rounded-lg transition-colors" title="Export">
                    <Download className="w-4 h-4 text-[var(--text-secondary)]" />
                  </button>
                </div>
              </div>
              <VitalsHistory 
                vitals={vitalsList}
                onEdit={canRecord ? handleEditVitals : undefined}
                onDelete={canRecord ? handleDeleteVitals : undefined}
                isLoading={false}
                isAntenatal={isAntenatal}
              />
            </div>
          )}

          {/* Show message when no vitals */}
          {vitalsList.length === 0 && (
            <div className="bg-[var(--bg-card)] rounded-xl p-8 text-center border border-[var(--border-color)]">
              <Activity className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3 opacity-50" />
              <p className="text-[var(--text-secondary)]">No vitals recorded for this visit</p>
              {canRecord && (
                <button
                  onClick={() => setShowVitalsModal(true)}
                  className="mt-3 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg text-sm font-medium"
                >
                  Record First Vitals
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* Vitals Form Modal */}
      <VitalsFormModal
        isOpen={showVitalsModal}
        onClose={() => {
          setShowVitalsModal(false);
          setEditingVitals(null);
        }}
        onSubmit={handleSubmitVitals}
        isLoading={isSubmitting}
        initialData={editingVitals ? {
          bloodPressure: editingVitals.bloodPressure || '',
          temperature: editingVitals.temperature,
          pulse: editingVitals.pulse,
          respiration: editingVitals.respiration,
          spo2: editingVitals.spo2,
          weight: editingVitals.weight,
          height: editingVitals.height,
          fetalHeartRate: editingVitals.fetalHeartRate,
          fundalHeight: editingVitals.fundalHeight,
          presentingPart: editingVitals.presentingPart,
          fetalMovement: editingVitals.fetalMovement,
          oedema: editingVitals.oedema,
          notes: editingVitals.notes || '',
        } : undefined}
        isEditing={!!editingVitals}
        isAntenatal={isAntenatal}
        attendanceId={selectedAttendanceId}
        attendanceType={selectedAttendance?.attendanceType}
      />
    </div>
  );
}