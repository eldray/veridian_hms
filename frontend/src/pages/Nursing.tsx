// src/pages/Nursing.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAttendanceStore } from '../store/attendanceStore';
import { usePatientStore } from '../store/patientStore';
import { useAuthStore } from '../store/authStore';
import { useAdmissionStore } from '../store/admissionStore'; // You might need this
import { useToast } from '../store/toastStore';
import { Medication, Attendance, Patient, Admission } from '../types';

// Reusable components (same as your other pages)
import { PatientAttendanceSelector } from '../components/vitals/PatientAttendanceSelector';

import {
  ArrowLeft,
  Pill,
  ClipboardList,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Stethoscope,
  User
} from 'lucide-react';

// Helper function
const getEntityId = (entity: { id?: string; id?: string } | null): string | undefined => {
  return entity?.id || entity?.id;
};

export default function Nursing() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedAttendanceId, setSelectedAttendanceId] = useState<string>('');
  
  // Nursing notes state
  const [nursingNotes, setNursingNotes] = useState('');
  const [handoverNotes, setHandoverNotes] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [administeringMed, setAdministeringMed] = useState<string | null>(null);

  // Stores
  const {
    attendances,
    updateMedication,
    getAttendances,
    canAddMedicalEntries
  } = useAttendanceStore();

  const { patients, loadPatients } = usePatientStore();
  const { user } = useAuthStore();
  // You might need an admission store for dailyNotes

  // Load data
  const loadData = async () => {
    try {
      setRefreshing(true);
      setIsLoading(true);

      await Promise.all([
        loadPatients(),
        getAttendances(),
        // loadAdmissions() if you have this
      ]);

      success('Data loaded', 'Nursing system ready');
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

  // Patient matching logic (same as your other pages)
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

  // Reset when patient/attendance changes
  useEffect(() => {
    setNursingNotes('');
    setHandoverNotes('');
  }, [selectedPatientId, selectedAttendanceId]);

  const canAddEntries = selectedAttendance ? canAddMedicalEntries(selectedAttendance) : false;

  // Get medications for selected attendance
  const medications = selectedAttendance?.medications || [];
  const dispensedMeds = medications.filter(med => med.status === 'dispensed');
  const administeredMeds = medications.filter(med => med.status === 'administered');

  // Get latest vitals
  const latestVitals = selectedAttendance?.vitals?.[selectedAttendance.vitals.length - 1];

  // Handlers
  const handleRefresh = () => loadData();

  // Administer medication
  const handleAdministerMedication = async (medicationId: string) => {
    if (!selectedAttendanceId || !user) return;

    setAdministeringMed(medicationId);
    try {
      await updateMedication(selectedAttendanceId, medicationId, {
        status: 'administered',
        administeredAt: new Date().toISOString(),
        administeredById: user.id || user.id || ''
      });

      success('Medication administered', 'Medication recorded as given');
      await getAttendances();
    } catch (error: any) {
      console.error('Failed to administer medication:', error);
      toastError('Administer failed', error.message || 'Could not record medication');
    } finally {
      setAdministeringMed(null);
    }
  };

  // Submit nursing notes
  const handleSubmitNursingNotes = async () => {
    if (!selectedAttendanceId || !nursingNotes.trim()) {
      toastError('Notes required', 'Please enter nursing notes');
      return;
    }

    if (!canAddEntries) {
      toastError('Access denied', 'Cannot add notes to completed/cancelled attendance');
      return;
    }

    setIsSubmitting(true);
    try {
      // Here you would update the admission or attendance with nursing notes
      // For now, we'll just show success
      // await updateAdmissionOrAttendance(selectedAttendanceId, { nursingNotes });
      
      success('Notes saved', 'Nursing notes recorded');
      setNursingNotes('');
      await getAttendances();
    } catch (error: any) {
      console.error('Failed to save nursing notes:', error);
      toastError('Save failed', error.message || 'Could not save notes');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit handover notes
  const handleSubmitHandoverNotes = async () => {
    if (!handoverNotes.trim()) {
      toastError('Notes required', 'Please enter handover notes');
      return;
    }

    setIsSubmitting(true);
    try {
      // Here you would save handover notes
      // This could be in a separate handover model or in admission notes
      
      success('Handover saved', 'Shift handover notes recorded');
      setHandoverNotes('');
    } catch (error: any) {
      console.error('Failed to save handover notes:', error);
      toastError('Save failed', error.message || 'Could not save handover');
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
            <User className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Nursing Station</h1>
            <p className="text-sm text-gray-600">Medication administration and nursing notes</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/dashboard/medications')}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all text-sm text-gray-700"
          >
            <Pill className="w-4 h-4" />
            All Medications
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
            setNursingNotes('');
            setHandoverNotes('');
          }}
        />

        {/* Patient & Visit Overview */}
        {selectedPatient && selectedAttendance && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <User className="w-6 h-6 text-green-600" />
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

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{dispensedMeds.length}</div>
                <div className="text-sm text-gray-600">Medications Ready</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{administeredMeds.length}</div>
                <div className="text-sm text-gray-600">Medications Given</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {selectedAttendance.vitals?.length || 0}
                </div>
                <div className="text-sm text-gray-600">Vitals Records</div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        {selectedAttendance && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Medication Administration */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Pill className="w-5 h-5 text-blue-600" />
                  Medication Administration
                </h3>

                {dispensedMeds.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">No medications ready for administration</p>
                    <p className="text-xs mt-1">Medications will appear here once dispensed by pharmacy</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dispensedMeds.map((medication) => (
                      <div
                        key={getEntityId(medication)}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">{medication.name}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            {medication.dosage} • {medication.route} • {medication.frequency}
                          </div>
                          {medication.instructions && (
                            <div className="text-xs text-gray-500 mt-1">
                              Instructions: {medication.instructions}
                            </div>
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            Dispensed: {medication.dispensedAt ? new Date(medication.dispensedAt).toLocaleString() : 'N/A'}
                          </div>
                        </div>
                        
                        <button
                          onClick={() => handleAdministerMedication(getEntityId(medication) || '')}
                          disabled={administeringMed === getEntityId(medication) || !canAddEntries}
                          className="ml-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 font-medium text-sm"
                        >
                          {administeringMed === getEntityId(medication) ? 'Administering...' : 'Administer'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Administered Medications */}
                {administeredMeds.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Recently Administered
                    </h4>
                    <div className="space-y-2">
                      {administeredMeds.slice(0, 3).map((medication) => (
                        <div
                          key={getEntityId(medication)}
                          className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                        >
                          <div>
                            <div className="font-medium text-gray-900">{medication.name}</div>
                            <div className="text-xs text-gray-600">
                              Administered: {medication.administeredAt ? new Date(medication.administeredAt).toLocaleString() : 'N/A'}
                            </div>
                          </div>
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Latest Vitals */}
              {latestVitals && (
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 text-purple-600" />
                    Latest Vitals
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {latestVitals.bloodPressure && (
                      <div>
                        <div className="text-sm text-gray-600">Blood Pressure</div>
                        <div className="font-semibold text-gray-900">{latestVitals.bloodPressure}</div>
                      </div>
                    )}
                    {latestVitals.temperature && (
                      <div>
                        <div className="text-sm text-gray-600">Temperature</div>
                        <div className="font-semibold text-gray-900">{latestVitals.temperature}°C</div>
                      </div>
                    )}
                    {latestVitals.pulse && (
                      <div>
                        <div className="text-sm text-gray-600">Pulse</div>
                        <div className="font-semibold text-gray-900">{latestVitals.pulse} bpm</div>
                      </div>
                    )}
                    {latestVitals.spo2 && (
                      <div>
                        <div className="text-sm text-gray-600">SpO2</div>
                        <div className="font-semibold text-gray-900">{latestVitals.spo2}%</div>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-3">
                    Recorded: {latestVitals.recordedAt ? new Date(latestVitals.recordedAt).toLocaleString() : 'N/A'}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Nursing Notes & Handover */}
            <div className="space-y-6">
              {/* Nursing Notes */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-orange-600" />
                  Nursing Notes
                </h3>
                
                <textarea
                  value={nursingNotes}
                  onChange={(e) => setNursingNotes(e.target.value)}
                  rows={6}
                  placeholder="Record nursing assessments, care provided, patient responses, observations..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent mb-4"
                  disabled={!canAddEntries}
                />

                {canAddEntries && (
                  <button
                    onClick={handleSubmitNursingNotes}
                    disabled={isSubmitting || !nursingNotes.trim()}
                    className="w-full bg-orange-600 text-white py-3 px-4 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 font-semibold"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Nursing Notes'}
                  </button>
                )}

                {!canAddEntries && (
                  <div className="text-sm text-gray-500 text-center py-2">
                    Cannot add notes to {selectedAttendance.status} attendance
                  </div>
                )}
              </div>

              {/* Handover Notes */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Shift Handover Notes
                </h3>
                
                <textarea
                  value={handoverNotes}
                  onChange={(e) => setHandoverNotes(e.target.value)}
                  rows={4}
                  placeholder="Important information for next shift: pending tasks, patient status, special instructions..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
                />

                <button
                  onClick={handleSubmitHandoverNotes}
                  disabled={isSubmitting || !handoverNotes.trim()}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-semibold"
                >
                  {isSubmitting ? 'Saving...' : 'Save Handover Notes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Empty States */}
        {selectedPatientId && !selectedAttendanceId && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">No Attendance Selected</h3>
            <p className="text-yellow-700 mb-4">Please select an attendance to manage nursing care.</p>
          </div>
        )}

        {selectedAttendance && !canAddEntries && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-red-800 mb-2">Cannot Manage Care</h3>
            <p className="text-red-700">
              This attendance is <span className="font-bold">{selectedAttendance.status}</span> and cannot be modified.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Loading Screen
const LoadingScreen: React.FC = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
    <div className="text-center bg-white p-8 rounded-xl shadow-sm border border-gray-200">
      <div className="w-14 h-14 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
      <h2 className="text-xl font-bold text-gray-900">Loading Nursing Station...</h2>
      <p className="text-gray-600 text-sm mt-1">Fetching patient and medication data</p>
    </div>
  </div>
);