// src/pages/Vitals.tsx - WITH ANC FIELDS FOR ANTENATAL
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatientStore } from '../store/patientStore';
import { useAttendanceStore } from '../store/attendanceStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import { useWorklistStore } from '../store/worklistStore';
import { VitalsFormModal } from '../components/vitals/VitalsFormModal';
import { VitalsTrendGraph } from '../components/vitals/VitalsTrendGraph';
import { VitalsHistory } from '../components/vitals/VitalsHistory';
import { PatientAttendanceSelector } from '../components/vitals/PatientAttendanceSelector';
import { WorklistPanel } from '../components/worklist/WorklistPanel';
import { 
  ChevronLeft, RefreshCw, Activity, Plus, User, Calendar, 
  AlertTriangle, Heart, Thermometer, Wind, Droplet, 
  Ruler, Weight, TrendingUp, Clock, CheckCircle, 
  XCircle, Stethoscope, FileText, Download, Printer,
  Baby, Shield, Users
} from 'lucide-react';
import type { Vitals, VitalsEntry, Patient, Attendance } from '../types/vitals';

const getEntityId = (entity: { id?: string; _id?: string } | null): string | undefined => {
  return entity?._id || entity?.id;
};

// Enhanced vital status check with detailed feedback
const getVitalStatus = (type: string, value: any): { color: string; bgColor: string; isAbnormal: boolean; message?: string } => {
  if (!value) return { color: 'text-[var(--text-secondary)]', bgColor: 'bg-gray-100', isAbnormal: false };
  
  switch (type) {
    case 'bloodPressure':
      if (typeof value === 'string') {
        const [systolic, diastolic] = value.split('/').map(Number);
        if (systolic > 140 || diastolic > 90) {
          return { 
            color: 'text-red-600', 
            bgColor: 'bg-red-50', 
            isAbnormal: true, 
            message: 'High Blood Pressure' 
          };
        } else if (systolic < 90 || diastolic < 60) {
          return { 
            color: 'text-yellow-600', 
            bgColor: 'bg-yellow-50', 
            isAbnormal: true, 
            message: 'Low Blood Pressure' 
          };
        }
        return { color: 'text-green-600', bgColor: 'bg-green-50', isAbnormal: false, message: 'Normal' };
      }
      return { color: 'text-[var(--text-secondary)]', bgColor: 'bg-gray-100', isAbnormal: false };
    
    case 'temperature':
      if (value > 38.0) {
        return { color: 'text-red-600', bgColor: 'bg-red-50', isAbnormal: true, message: 'Fever' };
      } else if (value < 35.0) {
        return { color: 'text-yellow-600', bgColor: 'bg-yellow-50', isAbnormal: true, message: 'Hypothermia' };
      }
      return { color: 'text-green-600', bgColor: 'bg-green-50', isAbnormal: false, message: 'Normal' };
    
    case 'pulse':
      if (value > 100) {
        return { color: 'text-red-600', bgColor: 'bg-red-50', isAbnormal: true, message: 'Tachycardia' };
      } else if (value < 60) {
        return { color: 'text-yellow-600', bgColor: 'bg-yellow-50', isAbnormal: true, message: 'Bradycardia' };
      }
      return { color: 'text-green-600', bgColor: 'bg-green-50', isAbnormal: false, message: 'Normal' };
    
    case 'respiration':
      if (value > 20) {
        return { color: 'text-red-600', bgColor: 'bg-red-50', isAbnormal: true, message: 'Tachypnea' };
      } else if (value < 12) {
        return { color: 'text-yellow-600', bgColor: 'bg-yellow-50', isAbnormal: true, message: 'Bradypnea' };
      }
      return { color: 'text-green-600', bgColor: 'bg-green-50', isAbnormal: false, message: 'Normal' };
    
    case 'spo2':
      if (value < 95) {
        return { color: 'text-red-600', bgColor: 'bg-red-50', isAbnormal: true, message: 'Low Oxygen' };
      } else if (value < 97) {
        return { color: 'text-yellow-600', bgColor: 'bg-yellow-50', isAbnormal: true, message: 'Borderline' };
      }
      return { color: 'text-green-600', bgColor: 'bg-green-50', isAbnormal: false, message: 'Normal' };
    
    // ✅ ANC SPECIFIC STATUS
    case 'fetalHeartRate':
      if (value < 110 || value > 160) {
        return { color: 'text-red-600', bgColor: 'bg-red-50', isAbnormal: true, message: 'Abnormal FHR' };
      }
      return { color: 'text-green-600', bgColor: 'bg-green-50', isAbnormal: false, message: 'Normal FHR' };
    
    case 'fundalHeight':
      // Fundal height in cm should roughly equal weeks of gestation
      // This is a basic check - actual comparison needs GA
      if (value < 20 || value > 42) {
        return { color: 'text-yellow-600', bgColor: 'bg-yellow-50', isAbnormal: true, message: 'Check measurement' };
      }
      return { color: 'text-green-600', bgColor: 'bg-green-50', isAbnormal: false, message: 'Normal' };
    
    default:
      return { color: 'text-[var(--text-secondary)]', bgColor: 'bg-gray-100', isAbnormal: false };
  }
};

// Vital Card Component
const VitalCard = ({ icon: Icon, label, value, unit, type, onClick, abnormal }: any) => {
  const status = getVitalStatus(type, value);
  const displayColor = abnormal === true ? 'text-red-600' : abnormal === false ? 'text-green-600' : status.color;
  const displayBg = abnormal === true ? 'bg-red-50' : abnormal === false ? 'bg-green-50' : status.bgColor;
  
  return (
    <div 
      onClick={onClick}
      className={`${displayBg} rounded-xl p-4 transition-all duration-200 ${onClick ? 'cursor-pointer hover:scale-105' : ''} border border-[var(--border-color)]`}
    >
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

export default function Vitals() {
  const navigate = useNavigate();
  
  const { patients, loadPatients } = usePatientStore();
  const {
    attendances,
    getAttendances,
    addVitals,
    updateVitals,
    deleteVitals,
    getVitalsByAttendance,
    canRecordVitals
  } = useAttendanceStore();
  const { user } = useAuthStore();
  const { success, error } = useToast();
  const { setDepartment, selectItem, clearSelection } = useWorklistStore();

  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedAttendanceId, setSelectedAttendanceId] = useState<string>('');
  const [previousVitals, setPreviousVitals] = useState<Vitals[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [editingVitals, setEditingVitals] = useState<Vitals | null>(null);
  const [showWorklist, setShowWorklist] = useState(false);

  const loadData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadPatients(), getAttendances()]);
    } catch (err: any) {
      error('Load failed', 'Could not load patient data');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedPatient = patients.find((p) => getEntityId(p) === selectedPatientId);
  const selectedAttendance = attendances.find((a) => getEntityId(a) === selectedAttendanceId);
  
  // ✅ Check if attendance is antenatal to show ANC fields
  const isAntenatal = selectedAttendance?.attendanceType === 'antenatal';

  useEffect(() => {
    if (selectedAttendanceId && selectedAttendanceId.trim()) {
      const loadVitals = async () => {
        try {
          const data = await getVitalsByAttendance(selectedAttendanceId);
          setPreviousVitals(data || []);
        } catch (err) {
          console.error('Failed to load previous vitals:', err);
          setPreviousVitals([]);
        }
      };
      loadVitals();
    } else {
      setPreviousVitals([]);
    }
  }, [selectedAttendanceId, getVitalsByAttendance]);

  const canRecordVitalsForSelected = selectedAttendance ? canRecordVitals(selectedAttendance) : false;

  const handleSubmitVitals = async (vitalsData: VitalsEntry) => {
    if (!selectedPatientId || !selectedAttendanceId) {
      error('Selection Required', 'Please select a patient and attendance');
      return;
    }
  
    if (!canRecordVitalsForSelected) {
      error('Cannot Record', 'Cannot record vitals for this attendance status');
      return;
    }
  
    setIsLoading(true);
    try {
      if (editingVitals && editingVitals.id) {
        await updateVitals(selectedAttendanceId, editingVitals.id, vitalsData);
        success('Vitals Updated', 'Vitals updated successfully!');
      } else {
        await addVitals(selectedAttendanceId, {
          ...vitalsData,
          recordedAt: new Date().toISOString(),
          recordedBy: user?.id || user?.username || 'Unknown',
        });
        success('Vitals Recorded', 'Vitals recorded successfully!');
      }
  
      const updatedVitals = await getVitalsByAttendance(selectedAttendanceId);
      setPreviousVitals(updatedVitals || []);
      setShowVitalsModal(false);
      setEditingVitals(null);
    } catch (err: any) {
      error('Save Failed', err.message || 'Failed to save vitals');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditVitals = (vitals: Vitals) => {
    setEditingVitals(vitals);
    setShowVitalsModal(true);
  };

  const latestVitals = previousVitals.length > 0 ? previousVitals[previousVitals.length - 1] : null;
  
  // Check for abnormal vitals including ANC fields
  const hasAbnormalVitals = latestVitals ? (
    (latestVitals.bloodPressure && getVitalStatus('bloodPressure', latestVitals.bloodPressure).isAbnormal) ||
    (latestVitals.temperature !== undefined && getVitalStatus('temperature', latestVitals.temperature).isAbnormal) ||
    (latestVitals.pulse !== undefined && getVitalStatus('pulse', latestVitals.pulse).isAbnormal) ||
    (latestVitals.respiration !== undefined && getVitalStatus('respiration', latestVitals.respiration).isAbnormal) ||
    (latestVitals.spo2 !== undefined && getVitalStatus('spo2', latestVitals.spo2).isAbnormal) ||
    (isAntenatal && latestVitals.fetalHeartRate !== undefined && getVitalStatus('fetalHeartRate', latestVitals.fetalHeartRate).isAbnormal) ||
    (isAntenatal && latestVitals.fundalHeight !== undefined && getVitalStatus('fundalHeight', latestVitals.fundalHeight).isAbnormal)
  ) : false;

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'active': 'bg-green-100 text-green-800',
      'completed': 'bg-blue-100 text-blue-800',
      'cancelled': 'bg-red-100 text-red-800',
      'admitted': 'bg-purple-100 text-purple-800'
    };
    return colors[status?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-[var(--bg-card)] rounded-lg transition-all duration-200 border border-[var(--border-color)]"
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
          <button
            onClick={() => {
              setDepartment('vitals');
              setShowWorklist(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm shadow-md"
          >
            <Users className="w-4 h-4" />
            <span>Today's Queue</span>
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
              {useWorklistStore.getState().stats.total > 0 ? useWorklistStore.getState().stats.total : ''}
            </span>
          </button>
          
          <button
            onClick={loadData}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all disabled:opacity-50 text-sm text-[var(--text-primary)]"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Patient & Attendance Selection */}
      <PatientAttendanceSelector
        patients={patients}
        attendances={attendances}
        selectedPatientId={selectedPatientId}
        selectedAttendanceId={selectedAttendanceId}
        onPatientSelect={setSelectedPatientId}
        onAttendanceSelect={setSelectedAttendanceId}
        onClearSelection={() => setPreviousVitals([])}
      />

      {/* Patient & Visit Overview */}
      {selectedPatient && selectedAttendance && (
        <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[var(--icon-cyan-bg)] rounded-xl flex items-center justify-center">
                <User className="w-6 h-6 text-[var(--icon-cyan-text)]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">
                  {selectedPatient.surname} {selectedPatient.otherNames}
                </h3>
                <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)] mt-1">
                  <span>{selectedPatient.age || 'N/A'} years • {selectedPatient.gender}</span>
                  <span>•</span>
                  <span>ID: {selectedPatient.folderNumber}</span>
                  <span>•</span>
                  <span>{selectedPatient.contact}</span>
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-md font-semibold text-[var(--text-primary)]">
                {selectedAttendance.attendanceNumber || 'Current Visit'}
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2 text-sm text-[var(--text-secondary)] mt-1">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedAttendance.status || '')}`}>
                  {selectedAttendance.status || 'pending'}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(selectedAttendance.dateTime || selectedAttendance.createdAt || '').toLocaleDateString()}
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
      )}

      {/* Vitals Tracking */}
      {selectedAttendance && (
        <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
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
            {canRecordVitalsForSelected && (
              <button
                onClick={() => setShowVitalsModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all duration-200 font-medium text-sm"
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
              
              {/* ✅ ANC SPECIFIC FIELDS - Only show for antenatal attendance */}
              {isAntenatal && (
                <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
                  <h4 className="text-md font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                    <Baby className="w-4 h-4 text-pink-500" />
                    Antenatal Assessment
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <VitalCard 
                      icon={Heart} 
                      label="Fetal Heart Rate" 
                      value={latestVitals?.fetalHeartRate} 
                      unit="bpm" 
                      type="fetalHeartRate"
                      abnormal={latestVitals?.fetalHeartRate ? (latestVitals.fetalHeartRate < 110 || latestVitals.fetalHeartRate > 160) : false}
                    />
                    <VitalCard 
                      icon={Ruler} 
                      label="Fundal Height" 
                      value={latestVitals?.fundalHeight ? `${latestVitals.fundalHeight}cm` : null} 
                      unit="cm" 
                      type="fundalHeight"
                    />
                    <div className="bg-[var(--bg-main)] rounded-xl p-4 border border-[var(--border-color)]">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-4 h-4 text-pink-500" />
                        <span className="text-sm text-[var(--text-secondary)]">Presenting Part</span>
                      </div>
                      <p className="text-lg font-bold text-[var(--text-primary)]">
                        {latestVitals?.presentingPart || 'Not recorded'}
                      </p>
                    </div>
                    <div className="bg-[var(--bg-main)] rounded-xl p-4 border border-[var(--border-color)]">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-4 h-4 text-pink-500" />
                        <span className="text-sm text-[var(--text-secondary)]">Fetal Movement</span>
                      </div>
                      <p className="text-lg font-bold text-[var(--text-primary)]">
                        {latestVitals?.fetalMovement ? 'Present ✓' : 'Not recorded'}
                      </p>
                    </div>
                    <div className="bg-[var(--bg-main)] rounded-xl p-4 border border-[var(--border-color)] col-span-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Droplet className="w-4 h-4 text-pink-500" />
                        <span className="text-sm text-[var(--text-secondary)]">Oedema</span>
                      </div>
                      <p className="text-lg font-bold text-[var(--text-primary)]">
                        {latestVitals?.oedema ? 'Present' : 'Absent'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {latestVitals?.notes && (
                <div className="bg-[var(--bg-main)] rounded-lg p-3">
                  <p className="text-xs text-[var(--text-secondary)] font-medium mb-1">Clinical Notes</p>
                  <p className="text-sm text-[var(--text-primary)]">{latestVitals.notes}</p>
                </div>
              )}
              
              {!latestVitals && (
                <div className="text-center py-8 text-[var(--text-secondary)] bg-[var(--bg-main)] rounded-lg text-sm">
                  No vitals recorded for this visit
                </div>
              )}
            </div>

            {/* Vitals Trend Graph */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-md font-semibold text-[var(--text-primary)]">Historical Trend Analysis</h3>
              {previousVitals.length > 1 ? (
                <div className="bg-[var(--bg-main)] rounded-lg p-4 h-[450px]">
                  <VitalsTrendGraph vitals={previousVitals} isAntenatal={isAntenatal} />
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
      )}

      {/* Vitals History Table */}
      {previousVitals.length > 0 && (
        <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Vitals History</h3>
            <div className="flex gap-2">
              <button className="p-1.5 hover:bg-[var(--bg-main)] rounded-lg transition-colors" title="Export">
                <Download className="w-4 h-4 text-[var(--text-secondary)]" />
              </button>
              <button className="p-1.5 hover:bg-[var(--bg-main)] rounded-lg transition-colors" title="Print">
                <Printer className="w-4 h-4 text-[var(--text-secondary)]" />
              </button>
            </div>
          </div>
          <VitalsHistory 
            vitals={previousVitals}
            onEdit={handleEditVitals} 
            onDelete={async (vitals) => {
              if (!selectedAttendanceId || !vitals.id) return;
              if (!confirm('Are you sure you want to delete these vitals?')) return;
              
              setIsLoading(true);
              try {
                await deleteVitals(selectedAttendanceId, vitals.id);
                success('Vitals Deleted', 'Vitals record deleted successfully!');
                const updatedVitals = await getVitalsByAttendance(selectedAttendanceId);
                setPreviousVitals(updatedVitals || []);
              } catch (err: any) {
                error('Delete Failed', err.message || 'Failed to delete vitals');
              } finally {
                setIsLoading(false);
              }
            }}
            isLoading={isLoading}
            isAntenatal={isAntenatal}
          />
        </div>
      )}

      {/* Vitals Form Modal - Pass isAntenatal to show ANC fields */}
      <VitalsFormModal
        isOpen={showVitalsModal}
        onClose={() => {
          setShowVitalsModal(false);
          setEditingVitals(null);
        }}
        onSubmit={handleSubmitVitals}
        isLoading={isLoading}
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

      {/* Worklist Panel */}
      {showWorklist && (
        <WorklistPanel
          department="vitals"
          onClose={() => {
            setShowWorklist(false);
            clearSelection();
          }}
          onSelectPatient={(patientId, item) => {
            setSelectedPatientId(patientId);
            // Auto-select the first available attendance for this patient if not already selected
            if (!selectedAttendanceId) {
              const patientAttendances = attendances.filter(a => a.patientId === patientId);
              if (patientAttendances.length > 0) {
                setSelectedAttendanceId(patientAttendances[0].id || '');
              }
            }
            setShowWorklist(false);
            success('Patient Loaded', `${item.patient.firstName} ${item.patient.lastName}'s details loaded`);
          }}
        />
      )}
    </div>
  );
}