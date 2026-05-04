// src/pages/LabResults.tsx - UPDATED WITH TABLE VIEWS
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAttendanceStore } from '../store/attendanceStore';
import { usePatientStore } from '../store/patientStore';
import { useAuthStore } from '../store/authStore';
import { useMedicalServicesStore } from '../store/medicalServicesStore';
import { useToast } from '../store/toastStore';
import { PatientAttendanceSelector } from '../components/vitals/PatientAttendanceSelector';
import { LabTestModal } from '../components/medical-entries/modals/LabTestModal';
import { generatePDF, openPrintWindow } from '../utils/pdfGenerator';
import { useHospitalStore } from '../store/hospitalStore';

import {
  ChevronLeft,
  FlaskConical,
  Printer,
  RefreshCw,
  AlertCircle,
  Ban,
  Plus,
  Clock,
  CheckCircle,
  AlertTriangle,
  Microscope,
  FileText,
  User,
  Calendar,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  Trash2,
  Edit,
  Search,
  Filter,
} from 'lucide-react';

const getEntityId = (entity: { id?: string; _id?: string } | null): string | undefined => {
  return entity?.id || entity?._id;
};

const getStatusBadge = (status: string) => {
  const config: Record<string, { bg: string; text: string }> = {
    requested: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
    in_progress: { bg: 'bg-blue-100', text: 'text-blue-700' },
    completed: { bg: 'bg-green-100', text: 'text-green-700' },
    cancelled: { bg: 'bg-red-100', text: 'text-red-700' },
  };
  const c = config[status] || config.requested;
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>{status === 'in_progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}</span>;
};

export default function Laboratory() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedAttendanceId, setSelectedAttendanceId] = useState<string>('');
  const [selectedTest, setSelectedTest] = useState<{ attendanceId: string; testId: string } | null>(null);
  const [result, setResult] = useState('');
  const [normalRange, setNormalRange] = useState('');
  const [units, setUnits] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLabModal, setShowLabModal] = useState(false);
  const [resultEntryTest, setResultEntryTest] = useState<any>(null);

  const { hospital } = useHospitalStore();
  const {
    attendances,
    updateLabTestStatus,
    getAttendances,
    canAddMedicalEntries,
  } = useAttendanceStore();

  const { patients, loadPatients } = usePatientStore();
  const { user } = useAuthStore();
  const { labTestTemplates, getLabTestTemplates } = useMedicalServicesStore();

  const hasLoaded = useRef(false);

  const loadData = async (force = false) => {
    if (!force && hasLoaded.current) return;
    try {
      setRefreshing(true);
      setIsLoading(true);
      await Promise.all([
        loadPatients(),
        getAttendances(),
        getLabTestTemplates(false)
      ]);
      hasLoaded.current = true;
      success('Data loaded', 'Laboratory system ready');
    } catch (err: any) {
      toastError('Load failed', err.message || 'Could not load data');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const calculateAge = (dateOfBirth: string): number => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const patientAttendances = useMemo(() => {
    if (!selectedPatientId || !attendances.length) return [];
    return attendances.filter(attendance => {
      const possiblePatientIds = [
        attendance.patientId,
        attendance.patient?.id,
        attendance.patient?._id,
        attendance.data?.patientId
      ].filter(Boolean).map(id => id?.toString()).filter(id => id && id !== 'undefined');
      return possiblePatientIds.includes(selectedPatientId);
    });
  }, [attendances, selectedPatientId]);

  const selectedPatient = patients.find(p => getEntityId(p) === selectedPatientId);
  const selectedAttendance = patientAttendances.find(a => getEntityId(a) === selectedAttendanceId);

  useEffect(() => {
    setSelectedAttendanceId('');
    setSelectedTest(null);
    setResultEntryTest(null);
    setResult('');
    setNormalRange('');
    setUnits('');
    setNotes('');
  }, [selectedPatientId]);

  const canAddEntries = selectedAttendance ? canAddMedicalEntries(selectedAttendance) : false;
  const canUpdateLabTest = selectedAttendance && ['pending', 'admitted'].includes(selectedAttendance.status);

  const labTests = (selectedAttendance?.LabTest || []).map((test: any) => ({
    ...test,
    id: test.id,
    name: test.ServiceCatalog?.name || test.name || 'Unknown Test',
    status: test.status,
    priority: test.priority,
    requestedAt: test.requestedAt,
    notes: test.notes,
    result: test.result,
    normalRange: test.normalRange,
    units: test.units,
    completedAt: test.completedAt,
    requestedBy: test.requestedBy,
  }));

  const pendingTests = labTests.filter(t => t.status === 'requested');
  const inProgressTests = labTests.filter(t => t.status === 'in_progress');
  const completedTests = labTests.filter(t => t.status === 'completed');

  const handleMarkInProgress = async (testId: string) => {
    if (!selectedAttendanceId) return;
    try {
      await updateLabTestStatus(selectedAttendanceId, testId, {
        status: 'in_progress',
        performedById: user?.id || '',
      });
      success('Status updated', 'Test in progress');
      await getAttendances();
    } catch (error: any) {
      toastError('Update failed', error.message);
    }
  };

  const handleSubmitResult = async () => {
    if (!resultEntryTest || !result.trim()) {
      toastError('Result missing', 'Please enter test result');
      return;
    }
    if (!selectedAttendanceId || !canUpdateLabTest) {
      toastError('Access denied', 'Cannot update this attendance');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateLabTestStatus(selectedAttendanceId, resultEntryTest.id, {
        status: 'completed',
        result: result,
        normalRange: normalRange || null,
        units: units || null,
        notes: notes || null,
        performedById: user?.id || '',
        completedAt: new Date().toISOString(),
      });
      success('Result saved', 'Lab test completed');
      setResultEntryTest(null);
      setResult('');
      setNormalRange('');
      setUnits('');
      setNotes('');
      await getAttendances();
    } catch (error: any) {
      toastError('Save failed', error.message || 'Could not submit result');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearSelection = () => {
    setSelectedPatientId('');
    setSelectedAttendanceId('');
    setSelectedTest(null);
    setResultEntryTest(null);
    setResult('');
    setNormalRange('');
    setUnits('');
    setNotes('');
  };

  const handlePrintResults = async () => {
    if (completedTests.length === 0) {
      toastError('No results', 'No completed tests to print');
      return;
    }
    
    if (!selectedPatient || !selectedAttendance) {
      toastError('Missing info', 'Patient or attendance information missing');
      return;
    }
    
    try {
      // Format the lab tests data for the PDF template
      const labResultsData = {
        labTests: completedTests.map(test => ({
          name: test.name,
          result: typeof test.result === 'object' ? test.result.value || JSON.stringify(test.result) : (test.result || '-'),
          normalRange: test.normalRange || '-',
          units: test.units || '-',
          status: test.status,
          findings: test.notes || null,
          impression: null,
          completedAt: test.completedAt,
          requestedBy: test.requestedBy
        })),
        patient: {
          fullName: `${selectedPatient.surname} ${selectedPatient.otherNames}`,
          folderNumber: selectedPatient.folderNumber,
          contact: selectedPatient.contact,
          age: selectedPatient.age || calculateAge(selectedPatient.dateOfBirth),
          gender: selectedPatient.gender,
          id: selectedPatient.id
        },
        attendance: {
          attendanceNumber: selectedAttendance.attendanceNumber || 'N/A',
          dateTime: selectedAttendance.dateTime || selectedAttendance.createdAt || new Date().toISOString(),
          attendingClinician: selectedAttendance.createdBy?.fullName || 'N/A',
          attendanceType: selectedAttendance.attendanceType || 'general'
        }
      };
      
      // Generate the PDF HTML
      const htmlContent = generatePDF('labResults', labResultsData, hospital);
      
      // Open print window
      openPrintWindow(htmlContent, `Lab_Results_${selectedPatient.folderNumber}`);
      
      success('Print ready', 'Lab results report generated');
    } catch (err) {
      console.error('Error printing lab results:', err);
      toastError('Print failed', 'Could not generate lab results report');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
        <div className="text-center bg-[var(--bg-card)] p-8 rounded-xl shadow-sm border border-[var(--border-color)]">
          <div className="w-14 h-14 border-4 border-[var(--icon-cyan-text)] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Loading Laboratory...</h2>
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
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-[var(--bg-card)] rounded-lg transition-all duration-200 border border-[var(--border-color)]"
          >
            <ChevronLeft className="w-5 h-5 text-[var(--text-primary)]" />
          </button>
          <div className="w-10 h-10 bg-[var(--icon-cyan-bg)] rounded-xl flex items-center justify-center">
            <FlaskConical className="w-5 h-5 text-[var(--icon-cyan-text)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Laboratory Management</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">Request tests, enter results, print reports</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintResults}
            disabled={completedTests.length === 0}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all disabled:opacity-50 text-sm"
          >
            <Printer className="w-4 h-4" />
            Print ({completedTests.length})
          </button>
          <button
            onClick={() => navigate('/dashboard/medical-entries')}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all text-sm"
          >
            <FileText className="w-4 h-4" />
            Medical Entries
          </button>
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all disabled:opacity-50 text-sm"
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
        onClearSelection={handleClearSelection}
      />

      {/* Patient & Visit Header */}
      {selectedPatient && selectedAttendance && (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
          <div className="px-5 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--icon-cyan-bg)] to-[var(--icon-cyan-text)] flex items-center justify-center shadow-sm">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-[var(--text-primary)] text-base">
                    {selectedPatient.surname} {selectedPatient.otherNames}
                  </h3>
                  <span className="text-xs text-[var(--text-secondary)]">
                    {selectedPatient.gender === 'male' ? '👨' : '👩'} • {selectedPatient.age || '?'}y
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-mono text-[10px] bg-[var(--bg-main)] px-1.5 py-0.5 rounded">#{selectedPatient.folderNumber}</span>
                  <span>•</span>
                  <span>{selectedPatient.contact}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="bg-[var(--bg-main)] px-2.5 py-1 rounded-full border border-[var(--border-color)]">
                <span className="text-xs font-mono text-[var(--text-secondary)]">
                  📋 {selectedAttendance.attendanceNumber || 'New Visit'}
                </span>
              </div>
              <div className="bg-[var(--bg-main)] px-2.5 py-1 rounded-full border border-[var(--border-color)]">
                <span className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                  📅 {new Date(selectedAttendance.dateTime || selectedAttendance.createdAt || '').toLocaleDateString()}
                </span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                selectedAttendance.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                selectedAttendance.status === 'completed' ? 'bg-green-100 text-green-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {selectedAttendance.status}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {selectedAttendance ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT COLUMN - Request New Test + Pending Tests Table */}
          <div className="space-y-5">
            {/* Request New Test Card */}
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
              <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)] flex items-center justify-between">
                <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Plus className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                  Request New Test
                </h3>
                {canAddEntries && (
                  <button
                    onClick={() => setShowLabModal(true)}
                    className="flex items-center gap-1 px-2 py-1 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded text-xs hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all"
                  >
                    <Plus className="w-3 h-3" /> Request Test
                  </button>
                )}
              </div>
              <div className="p-4 text-center text-[var(--text-secondary)] text-sm">
                {canAddEntries ? (
                  <div className="flex flex-col items-center gap-2 py-4">
                    <Microscope className="w-10 h-10 text-[var(--text-tertiary)]" />
                    <p>Click the Request button to order lab tests</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 py-4 text-yellow-600">
                    <AlertCircle className="w-4 h-4" />
                    Cannot request tests for {selectedAttendance.status} attendance
                  </div>
                )}
              </div>
            </div>

            {/* Pending Tests Table */}
            {pendingTests.length > 0 && (
              <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)]">
                  <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                    <Clock className="w-4 h-4 text-yellow-500" />
                    Pending Tests ({pendingTests.length})
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)]">Test Name</th>
                        <th className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)]">Priority</th>
                        <th className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)]">Requested On</th>
                        <th className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)]">Status</th>
                        <th className="px-4 py-2 text-center font-semibold text-[var(--text-secondary)]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)]">
                      {pendingTests.map((test) => {
                        const priorityColor = test.priority === 'stat' ? 'bg-red-100 text-red-700' :
                          test.priority === 'urgent' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700';
                        return (
                          <tr key={test.id} className="hover:bg-[var(--bg-main)] transition-colors">
                            <td className="px-4 py-2 font-medium text-[var(--text-primary)]">{test.name}</td>
                            <td className="px-4 py-2">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${priorityColor}`}>
                                {test.priority || 'routine'}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-[var(--text-secondary)] whitespace-nowrap">
                              {test.requestedAt ? new Date(test.requestedAt).toLocaleDateString() : '—'}
                            </td>
                            <td className="px-4 py-2">{getStatusBadge(test.status)}</td>
                            <td className="px-4 py-2 text-center">
                              {canUpdateLabTest && (
                                <button
                                  onClick={() => handleMarkInProgress(test.id)}
                                  className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-700 hover:text-white transition-all"
                                >
                                  Start
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* In Progress Tests Table */}
            {inProgressTests.length > 0 && (
              <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)]">
                  <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-500" />
                    In Progress ({inProgressTests.length})
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)]">Test Name</th>
                        <th className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)]">Started On</th>
                        <th className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)]">Status</th>
                        <th className="px-4 py-2 text-center font-semibold text-[var(--text-secondary)]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)]">
                      {inProgressTests.map((test) => (
                        <tr key={test.id} className="hover:bg-[var(--bg-main)] transition-colors">
                          <td className="px-4 py-2 font-medium text-[var(--text-primary)]">{test.name}</td>
                          <td className="px-4 py-2 text-[var(--text-secondary)] whitespace-nowrap">
                            {test.updatedAt ? new Date(test.updatedAt).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-4 py-2">{getStatusBadge(test.status)}</td>
                          <td className="px-4 py-2 text-center">
                            <button
                              onClick={() => setResultEntryTest(test)}
                              className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-700 hover:text-white transition-all"
                            >
                              Enter Result
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN - Results Entry Form + Completed Tests Table */}
          <div className="space-y-5">
            {/* Result Entry Form */}
            {resultEntryTest && (
              <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)] flex items-center justify-between">
                  <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                    Enter Results: {resultEntryTest.name}
                  </h3>
                  <button
                    onClick={() => {
                      setResultEntryTest(null);
                      setResult('');
                      setNormalRange('');
                      setUnits('');
                      setNotes('');
                    }}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    <Ban className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Result *</label>
                      <input
                        type="text"
                        value={result}
                        onChange={(e) => setResult(e.target.value)}
                        placeholder="e.g., 5.6"
                        className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Normal Range</label>
                      <input
                        type="text"
                        value={normalRange}
                        onChange={(e) => setNormalRange(e.target.value)}
                        placeholder="e.g., 4.0-11.0"
                        className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Units</label>
                    <input
                      type="text"
                      value={units}
                      onChange={(e) => setUnits(e.target.value)}
                      placeholder="e.g., g/dL, mg/L, %"
                      className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Notes</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      placeholder="Additional comments..."
                      className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm resize-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setResultEntryTest(null);
                        setResult('');
                        setNormalRange('');
                        setUnits('');
                        setNotes('');
                      }}
                      className="flex-1 px-4 py-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmitResult}
                      disabled={isSubmitting || !result.trim()}
                      className="flex-1 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium disabled:opacity-50"
                    >
                      {isSubmitting ? 'Saving...' : 'Save Result'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Completed Tests Table */}
            {completedTests.length > 0 && (
              <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)]">
                  <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Completed Results ({completedTests.length})
                  </h3>
                </div>
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)]">Test Name</th>
                        <th className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)]">Result</th>
                        <th className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)]">Normal Range</th>
                        <th className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)]">Flag</th>
                        <th className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)]">Completed</th>
                        <th className="px-4 py-2 text-center font-semibold text-[var(--text-secondary)]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)]">
                      {completedTests.map((test) => {
                        const rawResult = typeof test.result === 'object' ? (test.result.value ?? JSON.stringify(test.result)) : (test.result ?? '—');
                        const isAbnormal = test.result?.abnormal || test.abnormal;
                        return (
                          <tr key={test.id} className={`hover:bg-[var(--bg-main)] transition-colors ${isAbnormal ? 'bg-red-50/30' : ''}`}>
                            <td className="px-4 py-2 font-medium text-[var(--text-primary)]">{test.name}</td>
                            <td className={`px-4 py-2 font-mono ${isAbnormal ? 'text-red-600 font-bold' : 'text-[var(--text-primary)]'}`}>
                              {rawResult} {test.units && <span className="text-xs text-[var(--text-secondary)]">{test.units}</span>}
                            </td>
                            <td className="px-4 py-2 text-[var(--text-secondary)]">{test.normalRange || '—'}</td>
                            <td className="px-4 py-2">
                              {isAbnormal ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold text-red-600 bg-red-50">ABN</span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold text-green-700 bg-green-50">NL</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-[var(--text-secondary)] whitespace-nowrap">
                              {test.completedAt ? new Date(test.completedAt).toLocaleDateString() : '—'}
                            </td>
                            <td className="px-4 py-2 text-center">
                              <button
                                onClick={() => {
                                  setResultEntryTest(test);
                                  setResult(typeof test.result === 'object' ? test.result.value || '' : test.result || '');
                                  setNormalRange(test.normalRange || '');
                                  setUnits(test.units || '');
                                  setNotes(test.notes || '');
                                }}
                                className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                                title="Edit Result"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* No Tests Message */}
            {labTests.length === 0 && (
              <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-8 text-center">
                <Microscope className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">No Lab Tests</h3>
                <p className="text-sm text-[var(--text-secondary)]">Request tests from the left panel</p>
              </div>
            )}
          </div>
        </div>
      ) : selectedPatientId && !selectedAttendanceId ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-yellow-800 mb-1">No Attendance Selected</h3>
          <p className="text-sm text-yellow-700">Please select an attendance to manage lab tests</p>
        </div>
      ) : null}

      {/* Lab Test Modal */}
      <LabTestModal
        isOpen={showLabModal}
        onClose={() => setShowLabModal(false)}
        onSuccess={() => {
          setShowLabModal(false);
          getAttendances();
        }}
        attendanceId={selectedAttendanceId}
        labTests={labTestTemplates}
        canAdd={canAddEntries}
        userId={user?.id}
      />
    </div>
  );
}