// src/pages/LabResults.tsx - UPDATED VERSION
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAttendanceStore } from '../store/attendanceStore';
import { usePatientStore } from '../store/patientStore';
import { useAuthStore } from '../store/authStore';
import { useMedicalServicesStore } from '../store/medicalServicesStore';
import { useToast } from '../store/toastStore';
import { LabTest, Attendance, Patient } from '../types';
import { LabTestEntry } from '../types/medical-entries';

// Reusable components
import { PatientAttendanceSelector } from '../components/vitals/PatientAttendanceSelector';
import { LabStats } from '../components/reusable/LabStats';
import { LabRequestSection } from '../components/reusable/LabRequestSection';
import { PendingTestsSection } from '../components/reusable/PendingTestsSection';
import { LabResultsEntry } from '../components/reusable/LabResultsEntry';
import { CompletedTestsSection } from '../components/reusable/CompletedTestsSection';

import {
  ArrowLeft,
  FlaskConical,
  Printer,
  RefreshCw,
  AlertCircle,
  Ban
} from 'lucide-react';

// Helper function
const getEntityId = (entity: { id?: string; id?: string } | null): string | undefined => {
  return entity?.id || entity?.id;
};

export default function Laboratory() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedAttendanceId, setSelectedAttendanceId] = useState<string>('');
  const [selectedTest, setSelectedTest] = useState<{
    attendanceId: string;
    testId: string;
  } | null>(null);

  const [result, setResult] = useState('');
  const [normalRange, setNormalRange] = useState('');
  const [units, setUnits] = useState('');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRequestingLab, setIsRequestingLab] = useState(false);
  const [activatingAttendance, setActivatingAttendance] = useState(false);
  const [completingAttendance, setCompletingAttendance] = useState(false);

  const [currentLabRequest, setCurrentLabRequest] = useState<LabTestEntry>({
    templateId: '',
    name: '',
    priority: 'routine',
    notes: '',
    status: 'requested'
  });

  // Stores
  const {
    attendances,
    updateLabTestStatus,
    getAttendances,
    addLabTestToAttendance,
    updateAttendanceStatus,
    canAddMedicalEntries,
    getVitalsByAttendance
  } = useAttendanceStore();

  const { patients, loadPatients } = usePatientStore();
  const { user } = useAuthStore();
  const { labTestTemplates, getLabTestTemplates } = useMedicalServicesStore();

  // Load data
  const loadData = async () => {
    try {
      setRefreshing(true);
      setIsLoading(true);

      await Promise.all([
        loadPatients(),
        getAttendances(),
        getLabTestTemplates()
      ]);

      success('Data loaded', 'Laboratory system ready');
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

  // Patient matching logic
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

  // Reset attendance selection when patient changes
  useEffect(() => {
    setSelectedAttendanceId('');
    setSelectedTest(null);
    resetResultForm();
  }, [selectedPatientId]);

  // Reset form when attendance changes
  useEffect(() => {
    resetResultForm();
  }, [selectedAttendance]);

  const canAddEntries = selectedAttendance ? canAddMedicalEntries(selectedAttendance) : false;
  const canUpdateLabTest = selectedAttendance && ['pending', 'active', 'admitted'].includes(selectedAttendance.status);

  // Lab tests data
  const labTests = selectedAttendance?.labTests || [];
  const pendingTests = labTests.filter((t: LabTest) => ['requested', 'in_progress'].includes(t.status));
  const completedTests = labTests.filter((t: LabTest) => t.status === 'completed');

  // Selected test data
  const selectedTestData = selectedTest
    ? labTests.find((t: LabTest) => getEntityId(t) === selectedTest.testId)
    : null;

  // Stats
  const totalPending = pendingTests.filter(t => t.status === 'requested').length;
  const inProgressCount = pendingTests.filter(t => t.status === 'in_progress').length;
  const completedCount = completedTests.length;

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
      success('Activated', 'Ready for lab tests');
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

  const handleCancelAttendance = async () => {
    if (!selectedAttendanceId || !selectedAttendance) return;

    if (selectedAttendance.status === 'completed') {
      toastError('Invalid action', 'Completed visits cannot be cancelled');
      return;
    }

    if (!window.confirm('Cancel this visit? This cannot be undone.')) return;

    try {
      await updateAttendanceStatus(selectedAttendanceId, 'cancelled', {
        cancellationNotes: 'Cancelled by laboratory',
        cancelledAt: new Date().toISOString()
      });
      success('Cancelled', 'Visit cancelled');
      await getAttendances();
    } catch {
      toastError('Failed', 'Could not cancel attendance');
    }
  };

  // Print function
  const handlePrintResults = () => {
    if (!selectedPatient || !selectedAttendance) {
      toastError('Selection required', 'Please select patient and attendance');
      return;
    }

    if (completedTests.length === 0) {
      toastError('No results', 'No completed tests to print');
      return;
    }

    success('Print ready', 'PDF generation in progress...');
    
    console.log('Printing lab results for:', {
      patient: selectedPatient.fullName,
      attendance: selectedAttendance.attendanceNumber,
      tests: completedTests
    });
  };

  // Submit result
  const handleSubmitResult = async () => {
    if (!selectedTest || !result.trim()) {
      toastError('Result missing', 'Please enter test result');
      return;
    }

    if (!selectedAttendanceId) {
      toastError('Attendance required', 'No attendance selected');
      return;
    }

    if (!canUpdateLabTest) {
      toastError('Access denied', 'Cannot update completed/cancelled attendance');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateLabTestStatus(
        selectedTest.attendanceId,
        selectedTest.testId,
        {
          status: 'completed',
          result,
          normalRange: normalRange || undefined,
          units: units || undefined,
          notes: notes || undefined,
          performedById: user?.id || user?.id || '',
          completedAt: new Date().toISOString(),
        }
      );

      success('Result saved', 'Lab test completed');
      resetResultForm();
      await getAttendances();
    } catch (error: any) {
      console.error('Failed to submit result:', error);
      toastError('Save failed', error.message || 'Could not submit result');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetResultForm = () => {
    setSelectedTest(null);
    setResult('');
    setNormalRange('');
    setUnits('');
    setNotes('');
  };

  // Mark in progress
  const handleMarkInProgress = async (testId: string) => {
    if (!selectedAttendanceId) return;

    try {
      await updateLabTestStatus(selectedAttendanceId, testId, {
        status: 'in_progress',
        performedById: user?.id || user?.id || '',
      });
      success('Status updated', 'Test in progress');
      await getAttendances();
    } catch (error: any) {
      console.error('Failed to mark test in progress:', error);
      toastError('Update failed', error.message || 'Could not mark test');
    }
  };

  // Request lab test
  const handleRequestLabTest = async () => {
    if (!selectedAttendanceId || !currentLabRequest.templateId) {
      toastError('Selection required', 'Please select a lab test');
      return;
    }

    if (!canAddEntries) {
      toastError('Access denied', `Cannot request for ${selectedAttendance?.status} visit`);
      return;
    }

    setIsRequestingLab(true);
    try {
      const template = labTestTemplates.find(t => 
        t.id === currentLabRequest.templateId || t.id === currentLabRequest.templateId
      );
      if (!template) throw new Error('Template not found');

      const newTest: LabTest = {
        id: `lab-${Date.now()}`,
        attendanceId: selectedAttendanceId,
        patientId: selectedPatientId,
        templateId: currentLabRequest.templateId,
        name: template.name,
        investigationCode: template.investigationCode,
        category: template.category,
        specimenType: template.specimenType,
        status: 'requested',
        priority: currentLabRequest.priority,
        requestedAt: new Date().toISOString(),
        notes: currentLabRequest.notes,
        createdById: user?.id || user?.id || '',
        cashPrice: template.cashPrice || 0,
        insurancePrice: template.insurancePrice || 0,
        costPrice: template.costPrice || 0,
        isActive: true,
        requiresAuthorization: template.requiresAuthorization || false,
        tariffCode: template.tariffCode,
        vatRate: template.vatRate || 0,
        isTaxable: template.isTaxable || false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await addLabTestToAttendance(selectedAttendanceId, newTest);
      success('Test requested', `${template.name} added`);
      setCurrentLabRequest({ 
        templateId: '', 
        name: '', 
        priority: 'routine', 
        notes: '',
        status: 'requested'
      });
      await getAttendances();
    } catch (error: any) {
      console.error('Failed to request lab test:', error);
      toastError('Request failed', error.message || 'Could not add lab test');
    } finally {
      setIsRequestingLab(false);
    }
  };

  // Handle test selection
  const handleTestSelect = (attendanceId: string, testId: string) => {
    setSelectedTest({ attendanceId, testId });
    
    // Pre-fill form if test already has data
    const test = labTests.find((t: LabTest) => getEntityId(t) === testId);
    if (test) {
      setResult(test.result || '');
      setNormalRange(test.normalRange || '');
      setUnits(test.units || '');
      setNotes(test.notes || '');
    } else {
      resetResultForm();
    }
  };

  // Handle clear selection
  const handleClearSelection = () => {
    setSelectedPatientId('');
    setSelectedAttendanceId('');
    setSelectedTest(null);
    resetResultForm();
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
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <FlaskConical className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Laboratory Management</h1>
            <p className="text-sm text-gray-600">Request tests, enter results, print reports</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/dashboard/medical-entries')}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all text-sm text-gray-700"
          >
            <FlaskConical className="w-4 h-4" />
            Medical Entries
          </button>
          <button
            onClick={handlePrintResults}
            disabled={completedTests.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50 text-sm text-gray-700"
          >
            <Printer className="w-4 h-4" />
            Print Results ({completedTests.length})
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
          onClearSelection={handleClearSelection}
        />

        {/* Patient & Visit Overview */}
        {selectedPatient && selectedAttendance && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <FlaskConical className="w-6 h-6 text-blue-600" />
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
            onCancel={handleCancelAttendance}
            isActivating={activatingAttendance}
            isCompleting={completingAttendance}
          />
        )}

        {/* Stats */}
        {selectedAttendance && (
          <LabStats
            totalPending={totalPending}
            inProgressCount={inProgressCount}
            completedCount={completedCount}
          />
        )}

        {/* Main Content */}
        {selectedAttendance && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Lab Request Section */}
              {canAddEntries && (
                <LabRequestSection
                  currentLabRequest={currentLabRequest}
                  onLabRequestChange={setCurrentLabRequest}
                  onRequestLabTest={handleRequestLabTest}
                  labTestTemplates={labTestTemplates}
                  selectedAttendance={selectedAttendance}
                  isRequestingLab={isRequestingLab}
                />
              )}

              {/* Pending Tests */}
              <PendingTestsSection
                pendingTests={pendingTests}
                selectedTest={selectedTest}
                onTestSelect={handleTestSelect}
                onMarkInProgress={handleMarkInProgress}
                selectedAttendanceId={selectedAttendanceId}
                canUpdateLabTest={canUpdateLabTest}
              />

              {/* Completed Tests */}
              <CompletedTestsSection completedTests={completedTests} />
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Lab Results Entry */}
              <LabResultsEntry
                selectedTest={selectedTest}
                selectedTestData={selectedTestData}
                selectedPatient={selectedPatient}
                selectedAttendance={selectedAttendance}
                result={result}
                normalRange={normalRange}
                units={units}
                notes={notes}
                onResultChange={setResult}
                onNormalRangeChange={setNormalRange}
                onUnitsChange={setUnits}
                onNotesChange={setNotes}
                onSubmitResult={handleSubmitResult}
                onCancel={resetResultForm}
                isLoading={isSubmitting}
                canUpdateLabTest={canUpdateLabTest}
              />
            </div>
          </div>
        )}

        {/* Empty States */}
        {selectedPatientId && !selectedAttendanceId && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">No Attendance Selected</h3>
            <p className="text-yellow-700 mb-4">Please select an existing attendance to manage lab tests.</p>
          </div>
        )}

        {selectedAttendance && !canAddEntries && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <Ban className="w-12 h-12 text-red-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-red-800 mb-2">Cannot Manage Lab Tests</h3>
            <p className="text-red-700">
              This attendance is <span className="font-bold">{selectedAttendance.status}</span> and cannot be modified.
            </p>
          </div>
        )}

        {/* No Lab Tests Message */}
        {selectedAttendance && labTests.length === 0 && canAddEntries && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
            <FlaskConical className="w-12 h-12 text-blue-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-blue-800 mb-2">No Lab Tests</h3>
            <p className="text-blue-700">Use the form above to request lab tests for this patient.</p>
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
      <div className="w-14 h-14 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
      <h2 className="text-xl font-bold text-gray-900">Loading Laboratory...</h2>
      <p className="text-gray-600 text-sm mt-1">Fetching patient and test data</p>
    </div>
  </div>
);