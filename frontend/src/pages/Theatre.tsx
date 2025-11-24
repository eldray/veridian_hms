// src/pages/Theatre.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAttendanceStore } from '../store/attendanceStore';
import { usePatientStore } from '../store/patientStore';
import { useAuthStore } from '../store/authStore';
import { useMedicalServicesStore } from '../store/medicalServicesStore';
import { useToast } from '../store/toastStore';
import { Procedure, Attendance, Patient } from '../types';

// Reusable components (same as your lab page)
import { PatientAttendanceSelector } from '../components/vitals/PatientAttendanceSelector';

import {
  ArrowLeft,
  Scissors,
  ClipboardList,
  RefreshCw,
  AlertCircle,
  Syringe,
  Stethoscope,
  FileText
} from 'lucide-react';

// Helper function
const getEntityId = (entity: { id?: string; id?: string } | null): string | undefined => {
  return entity?.id || entity?.id;
};

export default function Theatre() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedAttendanceId, setSelectedAttendanceId] = useState<string>('');
  const [selectedProcedureId, setSelectedProcedureId] = useState<string>('');

  // Theatre notes form state
  const [anesthesiaNotes, setAnesthesiaNotes] = useState('');
  const [intraOperativeNotes, setIntraOperativeNotes] = useState('');
  const [postOperativeNotes, setPostOperativeNotes] = useState('');
  const [bloodLoss, setBloodLoss] = useState<number | ''>('');
  const [complications, setComplications] = useState('');
  const [hasComplications, setHasComplications] = useState(false);
  const [anesthesiaType, setAnesthesiaType] = useState('general');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activatingAttendance, setActivatingAttendance] = useState(false);
  const [completingAttendance, setCompletingAttendance] = useState(false);

  // Stores
  const {
    attendances,
    updateProcedure,
    getAttendances,
    updateAttendanceStatus,
    canAddMedicalEntries
  } = useAttendanceStore();

  const { patients, loadPatients } = usePatientStore();
  const { user } = useAuthStore();
  const { procedureTemplates, getProcedureTemplates } = useMedicalServicesStore();

  // Load data
  const loadData = async () => {
    try {
      setRefreshing(true);
      setIsLoading(true);

      await Promise.all([
        loadPatients(),
        getAttendances(),
        getProcedureTemplates()
      ]);

      success('Data loaded', 'Theatre system ready');
    } catch {
      toastError('Load failed', 'Could not load data. Please try again.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Patient matching logic (same as lab page)
  const patientAttendances = useMemo(() => {
    if (!selectedPatientId || !attendances.length) return [];

    const filtered = attendances.filter(attendance => {
      const possiblePatientIds = [
        attendance.patientId,
        attendance.patient?.id,
        attendance.patient?.id,
        attendance.data?.patientId
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

  const selectedPatient = patients.find(p => getEntityId(p) === selectedPatientId);
  const selectedAttendance = patientAttendances.find(a => getEntityId(a) === selectedAttendanceId);

  // Procedures for selected attendance
  const procedures = selectedAttendance?.procedures || [];
  const selectedProcedure = procedures.find(p => getEntityId(p) === selectedProcedureId);

  // Reset when patient/attendance changes
  useEffect(() => {
    setSelectedProcedureId('');
    resetTheatreForm();
  }, [selectedPatientId, selectedAttendanceId]);

  // Pre-fill form when procedure is selected
  useEffect(() => {
    if (selectedProcedure) {
      setAnesthesiaNotes(selectedProcedure.anesthesiaNotes || '');
      setIntraOperativeNotes(selectedProcedure.intraOperativeNotes || '');
      setPostOperativeNotes(selectedProcedure.postOperativeNotes || '');
      setBloodLoss(selectedProcedure.bloodLoss || '');
      setComplications(selectedProcedure.complications || '');
      setHasComplications(!!selectedProcedure.complications);
      setAnesthesiaType(selectedProcedure.anesthesiaType || 'general');
    } else {
      resetTheatreForm();
    }
  }, [selectedProcedure]);

  const canAddEntries = selectedAttendance ? canAddMedicalEntries(selectedAttendance) : false;
  const canUpdateProcedure = selectedAttendance && ['pending', 'active', 'admitted'].includes(selectedAttendance.status);

  // Handlers
  const handleRefresh = () => loadData();

  const handleActivateAttendance = async () => {
    if (!selectedAttendanceId || !selectedAttendance) return;

    if (selectedAttendance.status !== 'pending') {
      toastError('Invalid action', 'Only pending attendances can be activated');
      return;
    }

    setActivatingAttendance(true);
    try {
      await updateAttendanceStatus(selectedAttendanceId, 'active');
      success('Activated', 'Ready for theatre procedures');
      await getAttendances();
    } catch {
      toastError('Failed', 'Could not activate attendance');
    } finally {
      setActivatingAttendance(false);
    }
  };

  const handleCompleteAttendance = async () => {
    if (!selectedAttendanceId || !selectedAttendance) return;

    if (!['active', 'pending', 'admitted'].includes(selectedAttendance.status)) {
      toastError('Invalid action', 'Only active or pending visits can be completed');
      return;
    }

    setCompletingAttendance(true);
    try {
      await updateAttendanceStatus(selectedAttendanceId, 'completed', {
        completedAt: new Date().toISOString()
      });
      success('Visit completed', 'Patient discharged');
      await getAttendances();
    } catch {
      toastError('Failed', 'Could not complete attendance');
    } finally {
      setCompletingAttendance(false);
    }
  };

  const resetTheatreForm = () => {
    setAnesthesiaNotes('');
    setIntraOperativeNotes('');
    setPostOperativeNotes('');
    setBloodLoss('');
    setComplications('');
    setHasComplications(false);
    setAnesthesiaType('general');
  };

  // Submit theatre notes
  const handleSubmitTheatreNotes = async () => {
    if (!selectedProcedureId || !selectedAttendanceId) {
      toastError('Selection required', 'Please select a procedure');
      return;
    }

    if (!canUpdateProcedure) {
      toastError('Access denied', 'Cannot update completed/cancelled attendance');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateProcedure(
        selectedAttendanceId,
        selectedProcedureId,
        {
          anesthesiaNotes,
          intraOperativeNotes,
          postOperativeNotes,
          bloodLoss: bloodLoss ? Number(bloodLoss) : undefined,
          complications: hasComplications ? complications : undefined,
          anesthesiaType,
          status: 'completed', // Mark as completed when notes are submitted
          performedById: user?.id || user?.id || '',
          performedAt: new Date().toISOString(),
        }
      );

      success('Operation notes saved', 'Theatre procedure completed');
      resetTheatreForm();
      setSelectedProcedureId('');
      await getAttendances();
    } catch (error: any) {
      console.error('Failed to save theatre notes:', error);
      toastError('Save failed', error.message || 'Could not save operation notes');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Anesthesia types
  const anesthesiaTypes = [
    'general',
    'regional',
    'local',
    'sedation',
    'spinal',
    'epidural',
    'none'
  ];

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-white rounded-lg transition-all duration-200"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <Scissors className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Theatre & Operation Notes</h1>
            <p className="text-sm text-gray-600">Record surgical procedures and operation notes</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/dashboard/procedures')}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all text-sm text-gray-700"
          >
            <ClipboardList className="w-4 h-4" />
            All Procedures
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50 text-sm text-gray-700"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
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
          onClearSelection={() => {
            setSelectedPatientId('');
            setSelectedAttendanceId('');
            setSelectedProcedureId('');
            resetTheatreForm();
          }}
        />

        {/* Patient & Visit Overview */}
        {selectedPatient && selectedAttendance && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Scissors className="w-6 h-6 text-purple-600" />
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
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    selectedAttendance.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    selectedAttendance.status === 'active' ? 'bg-green-100 text-green-800' :
                    selectedAttendance.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                    selectedAttendance.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedAttendance.status}
                  </span>
                  <span>{new Date(selectedAttendance.dateTime || selectedAttendance.createdAt || '').toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Attendance Actions */}
        {selectedAttendance && (
          <AttendanceActions
            attendance={selectedAttendance}
            onActivate={handleActivateAttendance}
            onComplete={handleCompleteAttendance}
            onCancel={() => {}} // You can add cancel logic if needed
            isActivating={activatingAttendance}
            isCompleting={completingAttendance}
          />
        )}

        {/* Main Content */}
        {selectedAttendance && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Procedure Selection */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-purple-600" />
                  Select Procedure
                </h3>
                
                {procedures.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Scissors className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">No procedures scheduled</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {procedures.map((procedure) => {
                      const template = procedureTemplates.find(t => t.id === procedure.templateId);
                      return (
                        <button
                          key={getEntityId(procedure)}
                          onClick={() => setSelectedProcedureId(getEntityId(procedure) || '')}
                          className={`w-full text-left p-4 rounded-lg border transition-all ${
                            selectedProcedureId === getEntityId(procedure)
                              ? 'bg-purple-50 border-purple-300'
                              : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          <div className="font-semibold text-gray-900">{procedure.name}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            {template?.category || 'Procedure'} • {template?.duration || 'N/A'} min
                          </div>
                          <div className={`text-xs mt-2 px-2 py-1 rounded-full inline-block ${
                            procedure.status === 'completed' 
                              ? 'bg-green-100 text-green-800'
                              : procedure.status === 'in_progress'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {procedure.status.replace('_', ' ')}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Theatre Notes Form */}
            <div className="lg:col-span-2">
              {selectedProcedure ? (
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-purple-600" />
                    Operation Notes for {selectedProcedure.name}
                  </h3>

                  <div className="space-y-6">
                    {/* Anesthesia Section */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Syringe className="w-4 h-4 text-blue-600" />
                        Anesthesia
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Anesthesia Type
                          </label>
                          <select
                            value={anesthesiaType}
                            onChange={(e) => setAnesthesiaType(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            disabled={!canUpdateProcedure}
                          >
                            {anesthesiaTypes.map(type => (
                              <option key={type} value={type}>
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Blood Loss (ml)
                          </label>
                          <input
                            type="number"
                            value={bloodLoss}
                            onChange={(e) => setBloodLoss(e.target.value ? Number(e.target.value) : '')}
                            placeholder="Optional"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            disabled={!canUpdateProcedure}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Anesthesia Notes
                        </label>
                        <textarea
                          value={anesthesiaNotes}
                          onChange={(e) => setAnesthesiaNotes(e.target.value)}
                          rows={3}
                          placeholder="Record anesthesia details, medications, responses..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          disabled={!canUpdateProcedure}
                        />
                      </div>
                    </div>

                    {/* Intra-operative Section */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Scissors className="w-4 h-4 text-green-600" />
                        Intra-operative Notes
                      </h4>
                      
                      <textarea
                        value={intraOperativeNotes}
                        onChange={(e) => setIntraOperativeNotes(e.target.value)}
                        rows={4}
                        placeholder="Record surgical procedure, findings, techniques used..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent mb-4"
                        disabled={!canUpdateProcedure}
                      />

                      <div className="flex items-center gap-2 mb-3">
                        <input
                          type="checkbox"
                          id="complications"
                          checked={hasComplications}
                          onChange={(e) => setHasComplications(e.target.checked)}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          disabled={!canUpdateProcedure}
                        />
                        <label htmlFor="complications" className="text-sm font-medium text-gray-700">
                          Complications encountered
                        </label>
                      </div>

                      {hasComplications && (
                        <textarea
                          value={complications}
                          onChange={(e) => setComplications(e.target.value)}
                          rows={2}
                          placeholder="Describe any complications and how they were managed..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          disabled={!canUpdateProcedure}
                        />
                      )}
                    </div>

                    {/* Post-operative Section */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Stethoscope className="w-4 h-4 text-orange-600" />
                        Post-operative Notes
                      </h4>
                      
                      <textarea
                        value={postOperativeNotes}
                        onChange={(e) => setPostOperativeNotes(e.target.value)}
                        rows={3}
                        placeholder="Record recovery status, discharge instructions, follow-up plan..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        disabled={!canUpdateProcedure}
                      />
                    </div>

                    {/* Submit Button */}
                    {canUpdateProcedure && (
                      <div className="flex gap-3 pt-4 border-t border-gray-200">
                        <button
                          onClick={handleSubmitTheatreNotes}
                          disabled={isSubmitting}
                          className="flex-1 bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 font-semibold"
                        >
                          {isSubmitting ? 'Saving...' : 'Save Operation Notes'}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedProcedureId('');
                            resetTheatreForm();
                          }}
                          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-200">
                  <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Procedure Selected</h3>
                  <p className="text-gray-600 mb-4">Select a procedure from the list to enter operation notes</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty States */}
        {selectedPatientId && !selectedAttendanceId && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">No Attendance Selected</h3>
            <p className="text-yellow-700 mb-4">Please select an attendance to manage theatre procedures.</p>
          </div>
        )}

        {selectedAttendance && !canAddEntries && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-red-800 mb-2">Cannot Manage Procedures</h3>
            <p className="text-red-700">
              This attendance is <span className="font-bold">{selectedAttendance.status}</span> and cannot be modified.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Loading Screen (same as your lab page)
const LoadingScreen: React.FC = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
    <div className="text-center bg-white p-8 rounded-xl shadow-sm border border-gray-200">
      <div className="w-14 h-14 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
      <h2 className="text-xl font-bold text-gray-900">Loading Theatre...</h2>
      <p className="text-gray-600 text-sm mt-1">Fetching patient and procedure data</p>
    </div>
  </div>
);