import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatientStore } from '../store/patientStore';
import { useAttendanceStore } from '../store/attendanceStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import { VitalsFormModal } from '../components/vitals/VitalsFormModal';
import { VitalsTrendGraph } from '../components/vitals/VitalsTrendGraph';
import { VitalsHistory } from '../components/vitals/VitalsHistory';
import { PatientAttendanceSelector } from '../components/vitals/PatientAttendanceSelector';
import { ChevronLeft, RefreshCw, Activity, Plus, User, Calendar, AlertTriangle } from 'lucide-react';
import type { Vitals, VitalsEntry, Patient, Attendance } from '../types/vitals';

// Helper function
const getEntityId = (entity: { id?: string; _id?: string } | null): string | undefined => {
  return entity?._id || entity?.id;
};

// Helper function to check if vital is abnormal and get color
const getVitalStatus = (type: string, value: any): { color: string; isAbnormal: boolean } => {
  if (!value) return { color: 'text-gray-600', isAbnormal: false };
  
  switch (type) {
    case 'bloodPressure':
      if (typeof value === 'string') {
        const [systolic, diastolic] = value.split('/').map(Number);
        // High BP: Systolic > 140 or Diastolic > 90
        // Low BP: Systolic < 90 or Diastolic < 60
        if (systolic > 140 || diastolic > 90) {
          return { color: 'text-red-600', isAbnormal: true };
        } else if (systolic < 90 || diastolic < 60) {
          return { color: 'text-yellow-600', isAbnormal: true };
        } else {
          return { color: 'text-green-600', isAbnormal: false };
        }
      }
      return { color: 'text-gray-600', isAbnormal: false };
    
    case 'temperature':
      // High fever: > 38°C, Hypothermia: < 35°C
      if (value > 38.0) {
        return { color: 'text-red-600', isAbnormal: true };
      } else if (value < 35.0) {
        return { color: 'text-yellow-600', isAbnormal: true };
      } else {
        return { color: 'text-green-600', isAbnormal: false };
      }
    
    case 'pulse':
      // Tachycardia: > 100 bpm, Bradycardia: < 60 bpm
      if (value > 100) {
        return { color: 'text-red-600', isAbnormal: true };
      } else if (value < 60) {
        return { color: 'text-yellow-600', isAbnormal: true };
      } else {
        return { color: 'text-green-600', isAbnormal: false };
      }
    
    case 'respiration':
      // Tachypnea: > 20 bpm, Bradypnea: < 12 bpm
      if (value > 20) {
        return { color: 'text-red-600', isAbnormal: true };
      } else if (value < 12) {
        return { color: 'text-yellow-600', isAbnormal: true };
      } else {
        return { color: 'text-green-600', isAbnormal: false };
      }
    
    case 'spo2':
      // Hypoxemia: < 95%
      if (value < 95) {
        return { color: 'text-red-600', isAbnormal: true };
      } else {
        return { color: 'text-green-600', isAbnormal: false };
      }
    
    default:
      return { color: 'text-gray-600', isAbnormal: false };
  }
};

export default function Vitals() {
  const navigate = useNavigate(); 
  
  // Stores
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

  // State
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedAttendanceId, setSelectedAttendanceId] = useState<string>('');
  const [previousVitals, setPreviousVitals] = useState<Vitals[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal and edit states
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [editingVitals, setEditingVitals] = useState<Vitals | null>(null);

  // Load data
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
  }, [loadPatients, getAttendances]);

  // Selected entities
  const selectedPatient = patients.find((p) => getEntityId(p) === selectedPatientId);
  const selectedAttendance = attendances.find((a) => getEntityId(a) === selectedAttendanceId);

  // Load previous vitals when attendance changes
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

  // Status checks
  const canRecordVitalsForSelected = selectedAttendance ? canRecordVitals(selectedAttendance) : false;

  // Handle form submission
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
      console.error('Failed to save vitals:', err);
      error('Save Failed', err.message || 'Failed to save vitals');
    } finally {
      setIsLoading(false);
    }
  };
  const handleEditVitals = (vitals: Vitals) => {
    setEditingVitals(vitals);
    setShowVitalsModal(true);
  };

  // Get latest vitals for display
  const latestVitals = previousVitals.length > 0 ? previousVitals[previousVitals.length - 1] : null;

  // Check if any vital is abnormal
  const hasAbnormalVitals = latestVitals ? (
    (latestVitals.bloodPressure && getVitalStatus('bloodPressure', latestVitals.bloodPressure).isAbnormal) ||
    (latestVitals.temperature !== undefined && getVitalStatus('temperature', latestVitals.temperature).isAbnormal) ||
    (latestVitals.pulse !== undefined && getVitalStatus('pulse', latestVitals.pulse).isAbnormal) ||
    (latestVitals.respiration !== undefined && getVitalStatus('respiration', latestVitals.respiration).isAbnormal) ||
    (latestVitals.spo2 !== undefined && getVitalStatus('spo2', latestVitals.spo2).isAbnormal)
  ) : false;

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
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-white rounded-lg transition-all duration-200"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
            <Activity className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Vital Signs</h1>
            <p className="text-sm text-gray-600">Record and monitor patient vital signs</p>
          </div>
        </div>
        
        <button
          onClick={loadData}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50 text-sm text-gray-700"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
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
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{selectedPatient.fullName}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                    <span>{selectedPatient.age} years • {selectedPatient.gender}</span>
                    <span>•</span>
                    <span>ID: {selectedPatient.folderNumber}</span>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-lg font-semibold text-gray-900">
                  {selectedAttendance.attendanceNumber || 'Current Visit'}
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedAttendance.status || '')}`}>
                    {selectedAttendance.status}
                  </span>
                  <span>{new Date(selectedAttendance.dateTime || selectedAttendance.createdAt || '').toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Vitals Tracking */}
        {selectedAttendance && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-gray-900">Vital Signs Tracking</h2>
                {hasAbnormalVitals && (
                  <div className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Abnormal Values</span>
                  </div>
                )}
              </div>
              {canRecordVitalsForSelected && (
                <button
                  onClick={() => setShowVitalsModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Record New Vitals
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Current Vitals - Horizontal display with alerts */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Current Vitals</h3>
                {latestVitals ? (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex flex-wrap gap-4 justify-between">
                      {latestVitals.bloodPressure && (() => {
                        const { color, isAbnormal } = getVitalStatus('bloodPressure', latestVitals.bloodPressure);
                        return (
                          <div className="flex flex-col items-center min-w-[80px]">
                            <span className="text-gray-600 font-medium text-sm">BP</span>
                            <div className="flex items-center gap-1">
                              <span className={`text-lg font-bold ${color}`}>
                                {latestVitals.bloodPressure}
                              </span>
                              {isAbnormal && <AlertTriangle className="w-3 h-3 text-red-500" />}
                            </div>
                            <span className="text-xs text-gray-500">mmHg</span>
                          </div>
                        );
                      })()}
                      
                      {latestVitals.temperature !== undefined && (() => {
                        const { color, isAbnormal } = getVitalStatus('temperature', latestVitals.temperature);
                        return (
                          <div className="flex flex-col items-center min-w-[80px]">
                            <span className="text-gray-600 font-medium text-sm">Temp</span>
                            <div className="flex items-center gap-1">
                              <span className={`text-lg font-bold ${color}`}>
                                {latestVitals.temperature}°C
                              </span>
                              {isAbnormal && <AlertTriangle className="w-3 h-3 text-red-500" />}
                            </div>
                          </div>
                        );
                      })()}
                      
                      {latestVitals.pulse !== undefined && (() => {
                        const { color, isAbnormal } = getVitalStatus('pulse', latestVitals.pulse);
                        return (
                          <div className="flex flex-col items-center min-w-[80px]">
                            <span className="text-gray-600 font-medium text-sm">Pulse</span>
                            <div className="flex items-center gap-1">
                              <span className={`text-lg font-bold ${color}`}>
                                {latestVitals.pulse}
                              </span>
                              {isAbnormal && <AlertTriangle className="w-3 h-3 text-red-500" />}
                            </div>
                            <span className="text-xs text-gray-500">bpm</span>
                          </div>
                        );
                      })()}
                      
                      {latestVitals.respiration !== undefined && (() => {
                        const { color, isAbnormal } = getVitalStatus('respiration', latestVitals.respiration);
                        return (
                          <div className="flex flex-col items-center min-w-[80px]">
                            <span className="text-gray-600 font-medium text-sm">Resp</span>
                            <div className="flex items-center gap-1">
                              <span className={`text-lg font-bold ${color}`}>
                                {latestVitals.respiration}
                              </span>
                              {isAbnormal && <AlertTriangle className="w-3 h-3 text-red-500" />}
                            </div>
                            <span className="text-xs text-gray-500">bpm</span>
                          </div>
                        );
                      })()}
                      
                      {latestVitals.spo2 !== undefined && (() => {
                        const { color, isAbnormal } = getVitalStatus('spo2', latestVitals.spo2);
                        return (
                          <div className="flex flex-col items-center min-w-[80px]">
                            <span className="text-gray-600 font-medium text-sm">SpO2</span>
                            <div className="flex items-center gap-1">
                              <span className={`text-lg font-bold ${color}`}>
                                {latestVitals.spo2}%
                              </span>
                              {isAbnormal && <AlertTriangle className="w-3 h-3 text-red-500" />}
                            </div>
                          </div>
                        );
                      })()}
                      
                      {latestVitals.weight !== undefined && (
                        <div className="flex flex-col items-center min-w-[80px]">
                          <span className="text-gray-600 font-medium text-sm">Weight</span>
                          <span className="text-lg font-bold text-gray-900">
                            {latestVitals.weight}
                          </span>
                          <span className="text-xs text-gray-500">kg</span>
                        </div>
                      )}
                      
                      {latestVitals.height !== undefined && (
                        <div className="flex flex-col items-center min-w-[80px]">
                          <span className="text-gray-600 font-medium text-sm">Height</span>
                          <span className="text-lg font-bold text-gray-900">
                            {latestVitals.height}
                          </span>
                          <span className="text-xs text-gray-500">cm</span>
                        </div>
                      )}
                    </div>
                    
                    {latestVitals.notes && (
                      <div className="mt-4 pt-3 border-t border-gray-200">
                        <span className="text-sm text-gray-600 font-medium">Notes: </span>
                        <span className="text-sm text-gray-700">{latestVitals.notes}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                    No vitals recorded for this visit
                  </div>
                )}
              </div>

              {/* Vitals Trend Graph - 2/3 width */}
              <div className="xl:col-span-2 space-y-4">
                <h3 className="font-semibold text-gray-900">Vitals Trend</h3>
                {previousVitals.length > 0 ? (
                  <div className="h-96">
                    <VitalsTrendGraph vitals={previousVitals} />
                  </div>
                ) : (
                  <div className="h-96 bg-gray-50 rounded-lg flex items-center justify-center text-gray-500">
                    No vitals history to display
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Vitals History Table */}
        {previousVitals.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Vitals History</h3>
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
            />
          </div>
        )}
      </div>

      {/* Vitals Form Modal */}
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
          notes: editingVitals.notes || '',
        } : undefined}
        isEditing={!!editingVitals}
      />
    </div>
  );
}