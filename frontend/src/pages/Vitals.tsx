import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatientStore } from '../store/patientStore';
import { useAttendanceStore } from '../store/attendanceStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import { VitalsFormModal } from '../components/vitals/VitalsFormModal';
import { VitalsHistory } from '../components/vitals/VitalsHistory';
import { Header } from '../components/vitals/Header';
import { PatientSelection } from '../components/vitals/PatientSelection';
import { AttendanceSelection } from '../components/vitals/AttendanceSelection';
import { VitalsVisualization } from '../components/vitals/VitalsVisualization';
import { AlertCircle, Activity, RefreshCw } from 'lucide-react';
import type { Vitals, VitalsEntry, Patient, Attendance } from '../types/vitals';

// Helper function
const getEntityId = (entity: { id?: string; _id?: string } | null): string | undefined => {
  return entity?._id || entity?.id;
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
    updateAttendanceStatus,
    canRecordVitals
  } = useAttendanceStore();
  const { user } = useAuthStore();
  const { success, error } = useToast();

  // State
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedAttendanceId, setSelectedAttendanceId] = useState<string>('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [activatingAttendance, setActivatingAttendance] = useState(false);
  const [previousVitals, setPreviousVitals] = useState<Vitals[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showVisualization, setShowVisualization] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal and edit states
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [editingVitals, setEditingVitals] = useState<Vitals | null>(null);

  // Load data
  const loadData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadPatients(), getAttendances()]);
      success('Data loaded', 'Vitals page ready');
    } catch (err: any) {
      error('Load failed', 'Could not load patient data');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [loadPatients, getAttendances]);

  // Simple patient filtering
  const patientAttendances = useMemo(() => {
    if (!selectedPatientId || !attendances.length) return [];

    const filtered = attendances.filter(attendance => {
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
    });

    return filtered
      .sort((a, b) => new Date(b.dateTime || b.createdAt || '').getTime() - new Date(a.dateTime || a.createdAt || '').getTime())
      .map(attendance => ({
        ...attendance,
        patient: patients.find(p => getEntityId(p) === selectedPatientId) || attendance.patient
      }));
  }, [attendances, selectedPatientId, patients]);

  // Selected entities
  const selectedPatient = patients.find((p) => getEntityId(p) === selectedPatientId);
  const selectedAttendance = patientAttendances.find((a) => getEntityId(a) === selectedAttendanceId);

  // Auto-select latest pending attendance when patient is selected
  useEffect(() => {
    if (selectedPatientId && patientAttendances.length > 0) {
      const getBestAttendanceToSelect = () => {
        const pending = patientAttendances.filter(a => a.status === 'pending');
        if (pending.length > 0) {
          return pending[0];
        }
        
        const active = patientAttendances.filter(a => a.status === 'active');
        if (active.length > 0) {
          return active[0];
        }
        
        return patientAttendances[0];
      };

      const bestAttendance = getBestAttendanceToSelect();
      if (bestAttendance) {
        setSelectedAttendanceId(getEntityId(bestAttendance) || '');
      }
    }
  }, [selectedPatientId, patientAttendances]);

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
  const isAttendancePending = selectedAttendance?.status === 'pending';

  // Event handlers
  const handleActivateAttendance = async (attendance?: any) => {
    const attendanceId = attendance ? getEntityId(attendance) : selectedAttendanceId;
    if (!attendanceId) return;
    
    setActivatingAttendance(true);
    try {
      await updateAttendanceStatus(attendanceId, { status: 'active' });
      success('Attendance Activated', 'You can now record vitals');
      await getAttendances();
    } catch (err: any) {
      error('Activation Failed', err.message || 'Failed to activate attendance');
    } finally {
      setActivatingAttendance(false);
    }
  };

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
      // ✅ FIXED: Use id instead of _id
      if (editingVitals && editingVitals.id) { // Changed _id to id
        await updateVitals(selectedAttendanceId, editingVitals.id, vitalsData); // Changed _id to id
        success('Vitals Updated', 'Vitals updated successfully!');
      } else {
        // ✅ FIXED: Use id consistently
        await addVitals(selectedAttendanceId, {
          ...vitalsData,
          recordedAt: new Date().toISOString(),
          recordedBy: user?.id || user?.username || 'Unknown', // Removed _id reference
        });
        success('Vitals Recorded', 'Vitals recorded successfully!');
      }
  
      // Reload vitals
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

  // Edit vitals handler
  const handleEditVitals = (vitals: Vitals) => {
    setEditingVitals(vitals);
    setShowVitalsModal(true);
  };

  // Delete vitals handler
  const handleDeleteVitals = async (vitals: Vitals) => {
    if (!selectedAttendanceId || !vitals.id) return; // Changed _id to id
    
    if (!confirm('Are you sure you want to delete these vitals? This action cannot be undone.')) return;
    
    setIsLoading(true);
    try {
      await deleteVitals(selectedAttendanceId, vitals.id); // Changed _id to id
      success('Vitals Deleted', 'Vitals record deleted successfully!');
      
      const updatedVitals = await getVitalsByAttendance(selectedAttendanceId);
      setPreviousVitals(updatedVitals || []);
    } catch (err: any) {
      error('Delete Failed', err.message || 'Failed to delete vitals');
    } finally {
      setIsLoading(false);
    }
  };

  // Open modal for new vitals
  const handleOpenVitalsModal = () => {
    setEditingVitals(null);
    setShowVitalsModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)] border-[var(--icon-yellow-bg)]';
      case 'active': return 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] border-[var(--icon-green-bg)]';
      case 'completed': return 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] border-[var(--icon-cyan-bg)]';
      case 'cancelled': return 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] border-[var(--icon-red-bg)]';
      case 'admitted': return 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] border-[var(--icon-purple-bg)]';
      default: return 'bg-[var(--bg-main)] text-[var(--text-secondary)] border-[var(--border-color)]';
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-[var(--bg-main)] rounded-xl transition-all duration-200"
          >
            <svg className="w-5 h-5 text-[var(--text-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="w-12 h-12 bg-[var(--icon-red-bg)] rounded-xl flex items-center justify-center">
            <Activity className="w-6 h-6 text-[var(--icon-red-text)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Vital Signs</h1>
            <p className="text-sm text-[var(--text-secondary)]">Record and monitor patient vital signs</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {previousVitals.length > 0 && (
            <button
              onClick={() => setShowVisualization(!showVisualization)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                showVisualization
                  ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] border-[var(--icon-cyan-bg)]'
                  : 'bg-[var(--bg-card)] text-[var(--text-primary)] border-[var(--border-color)] hover:bg-[var(--bg-main)]'
              }`}
            >
              <Activity className="w-4 h-4" />
              {showVisualization ? 'Hide Overview' : 'Show Overview'}
            </button>
          )}
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

      {/* Patient and Attendance Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PatientSelection
          patients={patients}
          patientSearch={patientSearch}
          setPatientSearch={setPatientSearch}
          selectedPatientId={selectedPatientId}
          setSelectedPatientId={setSelectedPatientId}
          showPatientDropdown={showPatientDropdown}
          setShowPatientDropdown={setShowPatientDropdown}
          selectedPatient={selectedPatient}
        />

        {selectedPatientId && (
          <AttendanceSelection
            patientAttendances={patientAttendances}
            selectedAttendanceId={selectedAttendanceId}
            setSelectedAttendanceId={setSelectedAttendanceId}
            selectedPatientId={selectedPatientId}
            navigate={navigate}
            onActivateAttendance={handleActivateAttendance}
            activatingAttendance={activatingAttendance}
          />
        )}
      </div>

      {/* Vitals Visualization */}
      {showVisualization && previousVitals.length > 0 && (
        <VitalsVisualization vitals={previousVitals} />
      )}

      {/* Attendance Status & Actions */}
      {selectedAttendance && (
        <div className="bg-[var(--bg-card)] rounded-xl p-6 shadow-sm border border-[var(--border-color)]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
                Visit: {selectedAttendance.attendanceNumber || `Visit ${new Date(selectedAttendance.dateTime || selectedAttendance.createdAt || '').toLocaleDateString()}`}
              </h3>
              <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)]">
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedAttendance.status || '')}`}>
                  Status: {selectedAttendance.status}
                </span>
                <span>Date: {new Date(selectedAttendance.dateTime || selectedAttendance.createdAt || '').toLocaleDateString()}</span>
                <span>Type: {selectedAttendance.attendanceType?.replace(/_/g, ' ') || 'General'}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {!canRecordVitalsForSelected && selectedAttendance.status === 'pending' && (
                <button
                  onClick={() => handleActivateAttendance()}
                  disabled={activatingAttendance}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] rounded-lg hover:bg-[var(--icon-green-text)] hover:text-white transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Activity className="w-4 h-4" />
                  {activatingAttendance ? 'Activating...' : 'Activate Visit'}
                </button>
              )}
              
              {canRecordVitalsForSelected && (
                <button
                  onClick={handleOpenVitalsModal}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-colors font-medium"
                >
                  <Activity className="w-4 h-4" />
                  Record Vitals
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Vitals History */}
      {previousVitals.length > 0 && (
        <VitalsHistory
          vitals={previousVitals}
          onEdit={handleEditVitals}
          onDelete={handleDeleteVitals}
          isLoading={isLoading}
        />
      )}

      {/* Cannot record vitals message */}
      {selectedAttendanceId && !canRecordVitalsForSelected && selectedAttendance?.status === 'pending' && (
        <div className="bg-[var(--icon-yellow-bg)] border border-[var(--icon-yellow-text)] rounded-xl p-5">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-[var(--icon-yellow-text)]" />
            <div>
              <h3 className="font-semibold text-[var(--icon-yellow-text)]">Visit Not Active</h3>
              <p className="text-[var(--icon-yellow-text)] text-sm mt-1">
                This visit needs to be activated before you can record vitals.
              </p>
            </div>
            <button
              onClick={() => handleActivateAttendance()}
              disabled={activatingAttendance}
              className="ml-auto px-4 py-2 bg-[var(--icon-yellow-text)] text-white rounded-lg hover:bg-[var(--icon-yellow-text)]/80 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {activatingAttendance ? 'Activating...' : 'Activate Visit'}
            </button>
          </div>
        </div>
      )}

      {/* No vitals recorded message */}
      {selectedAttendanceId && canRecordVitalsForSelected && previousVitals.length === 0 && (
        <div className="bg-[var(--bg-card)] rounded-xl p-8 text-center border border-[var(--border-color)]">
          <Activity className="w-16 h-16 text-[var(--text-tertiary)] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No Vitals Recorded</h3>
          <p className="text-[var(--text-secondary)] mb-4">No vital signs have been recorded for this visit yet.</p>
          <button
            onClick={handleOpenVitalsModal}
            className="px-6 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-colors font-medium"
          >
            Record First Vitals
          </button>
        </div>
      )}

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