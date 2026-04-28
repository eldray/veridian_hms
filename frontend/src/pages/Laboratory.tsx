// src/pages/LabResults.tsx - COMPLETE REDESIGN
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAttendanceStore } from '../store/attendanceStore';
import { usePatientStore } from '../store/patientStore';
import { useAuthStore } from '../store/authStore';
import { useMedicalServicesStore } from '../store/medicalServicesStore';
import { useToast } from '../store/toastStore';
import { LabTest, Attendance, Patient } from '../types';
import { PatientAttendanceSelector } from '../components/vitals/PatientAttendanceSelector';

import {
  ChevronLeft,
  FlaskConical,
  Printer,
  RefreshCw,
  AlertCircle,
  Ban,
  Plus,
  Search,
  X,
  Clock,
  CheckCircle,
  AlertTriangle,
  Microscope,
  FileText,
  User,
  Calendar,
  DollarSign,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';

// Helper function
const getEntityId = (entity: { id?: string; _id?: string } | null): string | undefined => {
  return entity?.id || entity?._id;
};

// Status Badge Component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    requested: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: <Clock className="w-3 h-3" /> },
    in_progress: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <Activity className="w-3 h-3" /> },
    completed: { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle className="w-3 h-3" /> },
    cancelled: { bg: 'bg-red-100', text: 'text-red-700', icon: <Ban className="w-3 h-3" /> },
  };
  const c = config[status] || config.requested;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {c.icon}
      {status === 'in_progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

// Abnormal Value Indicator
const AbnormalIndicator: React.FC<{ value: string; normalRange: string }> = ({ value, normalRange }) => {
  if (!value || !normalRange) return null;
  
  // Parse normal range (e.g., "4.0-11.0" or "<5" or ">10")
  const normalMatch = normalRange.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/);
  if (normalMatch) {
    const val = parseFloat(value);
    const min = parseFloat(normalMatch[1]);
    const max = parseFloat(normalMatch[2]);
    if (val < min) return <TrendingDown className="w-3.5 h-3.5 text-red-500" title="Below normal" />;
    if (val > max) return <TrendingUp className="w-3.5 h-3.5 text-red-500" title="Above normal" />;
    return <Minus className="w-3.5 h-3.5 text-green-500" title="Normal" />;
  }
  return null;
};

// Loading Screen
const LoadingScreen: React.FC = () => (
  <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
    <div className="text-center bg-[var(--bg-card)] p-8 rounded-xl shadow-sm border border-[var(--border-color)]">
      <div className="w-14 h-14 border-4 border-[var(--icon-cyan-text)] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
      <h2 className="text-xl font-bold text-[var(--text-primary)]">Loading Laboratory...</h2>
      <p className="text-[var(--text-secondary)] text-sm mt-1">Fetching patient and test data</p>
    </div>
  </div>
);

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
  const [showRequestModal, setShowRequestModal] = useState(false);

  const [currentLabRequest, setCurrentLabRequest] = useState({
    templateId: '',
    name: '',
    priority: 'routine' as const,
    notes: '',
    status: 'requested' as const
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const hasLoaded = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Stores
  const {
    attendances,
    updateLabTestStatus,
    getAttendances,
    addLabTestToAttendance,
    updateAttendanceStatus,
    canAddMedicalEntries,
  } = useAttendanceStore();

  const { patients, loadPatients } = usePatientStore();
  const { user } = useAuthStore();
  const { labTestTemplates, getLabTestTemplates } = useMedicalServicesStore();

  // Load data
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Patient matching logic
  const patientAttendances = useMemo(() => {
    if (!selectedPatientId || !attendances.length) return [];
    const filtered = attendances.filter(attendance => {
      const possiblePatientIds = [
        attendance.patientId,
        attendance.patient?.id,
        attendance.patient?._id,
        attendance.data?.patientId
      ].filter(Boolean).map(id => id?.toString()).filter(id => id && id !== 'undefined');
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

  useEffect(() => {
    setSelectedAttendanceId('');
    setSelectedTest(null);
    setResult('');
    setNormalRange('');
    setUnits('');
    setNotes('');
  }, [selectedPatientId]);

  const canAddEntries = selectedAttendance ? canAddMedicalEntries(selectedAttendance) : false;
  const canUpdateLabTest = selectedAttendance && ['pending', 'admitted'].includes(selectedAttendance.status);

  // Lab tests from attendance
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
  }));

  const pendingTests = labTests.filter(t => t.status === 'requested');
  const inProgressTests = labTests.filter(t => t.status === 'in_progress');
  const completedTests = labTests.filter(t => t.status === 'completed');

  const selectedTestData = selectedTest ? labTests.find(t => getEntityId(t) === selectedTest.testId) : null;

  // Filter templates for dropdown
  const filteredTemplates = labTestTemplates.filter(template =>
    template.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.investigationCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectTemplate = (template: any) => {
    setCurrentLabRequest({
      templateId: template.id,
      name: template.name,
      priority: 'routine',
      notes: '',
      status: 'requested'
    });
    setSearchTerm(template.name);
    setShowDropdown(false);
  };

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
      const template = labTestTemplates.find(t => t.id === currentLabRequest.templateId);
      if (!template) throw new Error('Template not found');

      await addLabTestToAttendance(selectedAttendanceId, {
        serviceCatalogId: template.serviceCatalogId || template.id,
        priority: currentLabRequest.priority,
        notes: currentLabRequest.notes || ''
      });

      success('Test requested', `${template.name} added`);
      setCurrentLabRequest({ templateId: '', name: '', priority: 'routine', notes: '', status: 'requested' });
      setSearchTerm('');
      setShowRequestModal(false);
      await getAttendances();
    } catch (error: any) {
      toastError('Request failed', error.message || 'Could not add lab test');
    } finally {
      setIsRequestingLab(false);
    }
  };

  const handleSubmitResult = async () => {
    if (!selectedTest || !result.trim()) {
      toastError('Result missing', 'Please enter test result');
      return;
    }
    if (!selectedAttendanceId || !canUpdateLabTest) {
      toastError('Access denied', 'Cannot update this attendance');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateLabTestStatus(selectedTest.attendanceId, selectedTest.testId, {
        status: 'completed',
        result: result,
        normalRange: normalRange || null,
        units: units || null,
        notes: notes || null,
        performedById: user?.id || '',
        completedAt: new Date().toISOString(),
      });
      success('Result saved', 'Lab test completed');
      setSelectedTest(null);
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

  const handleClearSelection = () => {
    setSelectedPatientId('');
    setSelectedAttendanceId('');
    setSelectedTest(null);
    setResult('');
    setNormalRange('');
    setUnits('');
    setNotes('');
  };

  const handlePrintResults = () => {
    if (completedTests.length === 0) {
      toastError('No results', 'No completed tests to print');
      return;
    }
    success('Print ready', 'PDF generation in progress...');
  };

  if (isLoading) return <LoadingScreen />;

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
            onClick={() => navigate('/dashboard/medical-entries')}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all text-sm"
          >
            <FileText className="w-4 h-4" />
            Medical Entries
          </button>
          <button
            onClick={handlePrintResults}
            disabled={completedTests.length === 0}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all disabled:opacity-50 text-sm"
          >
            <Printer className="w-4 h-4" />
            Print ({completedTests.length})
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Patient Search */}
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1 flex items-center gap-1">
            <User className="w-3 h-3" />
            Patient
          </label>
          <PatientAttendanceSelector
            patients={patients}
            attendances={attendances}
            selectedPatientId={selectedPatientId}
            selectedAttendanceId={selectedAttendanceId}
            onPatientSelect={setSelectedPatientId}
            onAttendanceSelect={setSelectedAttendanceId}
            onClearSelection={handleClearSelection}
          />
        </div>
      </div>

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
              <StatusBadge status={selectedAttendance.status} />
            </div>
          </div>
        </div>
      )}

      {/* Main Content - 2 Column Layout */}
      {selectedAttendance ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT COLUMN - Request Tests & Pending */}
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
                    onClick={() => setShowRequestModal(true)}
                    className="flex items-center gap-1 px-2 py-1 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded text-xs hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all"
                  >
                    <Plus className="w-3 h-3" /> Request
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

            {/* Pending Tests */}
            {pendingTests.length > 0 && (
              <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)]">
                  <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                    <Clock className="w-4 h-4 text-yellow-500" />
                    Pending Tests ({pendingTests.length})
                  </h3>
                </div>
                <div className="divide-y divide-[var(--border-color)]">
                  {pendingTests.map((test) => (
                    <div key={test.id} className="p-3 hover:bg-[var(--bg-main)] transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-sm">{test.name}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <StatusBadge status={test.status} />
                            <span className="text-xs text-[var(--text-secondary)]">
                              Priority: {test.priority}
                            </span>
                          </div>
                        </div>
                        {canUpdateLabTest && (
                          <button
                            onClick={() => handleMarkInProgress(test.id)}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-700 hover:text-white transition-all"
                          >
                            Start Processing
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* In Progress Tests */}
            {inProgressTests.length > 0 && (
              <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)]">
                  <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-500" />
                    In Progress ({inProgressTests.length})
                  </h3>
                </div>
                <div className="divide-y divide-[var(--border-color)]">
                  {inProgressTests.map((test) => (
                    <div key={test.id} className="p-3 hover:bg-[var(--bg-main)] transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-sm">{test.name}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <StatusBadge status={test.status} />
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedTest({ attendanceId: selectedAttendanceId, testId: test.id })}
                          className="px-3 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-700 hover:text-white transition-all"
                        >
                          Enter Result
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN - Results Entry & Completed Tests Table */}
          <div className="space-y-5">
            {/* Result Entry Form */}
            {selectedTestData && (
              <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)]">
                  <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                    Enter Results: {selectedTestData.name}
                  </h3>
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
                        className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--icon-cyan-text)]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Normal Range</label>
                      <input
                        type="text"
                        value={normalRange}
                        onChange={(e) => setNormalRange(e.target.value)}
                        placeholder="e.g., 4.0-11.0"
                        className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--icon-cyan-text)]"
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
                      className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--icon-cyan-text)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Notes</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      placeholder="Additional comments..."
                      className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm resize-none focus:ring-2 focus:ring-[var(--icon-cyan-text)]"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setSelectedTest(null);
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
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-[var(--text-secondary)]">Test</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-[var(--text-secondary)]">Result</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-[var(--text-secondary)]">Normal Range</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-[var(--text-secondary)]">Status</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-[var(--text-secondary)]">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)]">
                      {completedTests.map((test) => {
                        const isAbnormal = test.result && test.normalRange && (() => {
                          const match = test.normalRange.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/);
                          if (match) {
                            const val = parseFloat(test.result);
                            return val < parseFloat(match[1]) || val > parseFloat(match[2]);
                          }
                          return false;
                        })();
                        return (
                          <tr key={test.id} className="hover:bg-[var(--bg-main)] transition-colors">
                            <td className="px-4 py-2 font-medium text-[var(--text-primary)]">{test.name}</td>
                            <td className={`px-4 py-2 font-mono ${isAbnormal ? 'text-red-600 font-bold' : 'text-green-600'}`}>
                              {test.result} {test.units && <span className="text-xs text-[var(--text-secondary)]">{test.units}</span>}
                              {isAbnormal && <AlertTriangle className="w-3.5 h-3.5 inline ml-1 text-red-500" />}
                            </td>
                            <td className="px-4 py-2 text-xs text-[var(--text-secondary)]">{test.normalRange || '—'}</td>
                            <td className="px-4 py-2"><StatusBadge status={test.status} /></td>
                            <td className="px-4 py-2 text-xs text-[var(--text-secondary)]">
                              {test.completedAt ? new Date(test.completedAt).toLocaleDateString() : '—'}
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
            {labTests.length === 0 && canAddEntries && (
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

      {/* Request Test Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowRequestModal(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-[var(--bg-card)] rounded-xl shadow-xl max-w-md w-full border border-[var(--border-color)]">
              <div className="px-6 py-4 border-b border-[var(--border-color)] flex items-center justify-between">
                <h2 className="text-lg font-bold text-[var(--text-primary)]">Request Lab Test</h2>
                <button onClick={() => setShowRequestModal(false)} className="p-1 hover:bg-[var(--bg-main)] rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Search Test</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setShowDropdown(true);
                      }}
                      onFocus={() => setShowDropdown(true)}
                      placeholder="Search by name or code..."
                      className="w-full pl-10 pr-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--icon-cyan-text)]"
                    />
                  </div>
                  {showDropdown && searchTerm && filteredTemplates.length > 0 && (
                    <div ref={dropdownRef} className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto border border-[var(--border-color)] rounded-lg bg-[var(--bg-card)] shadow-lg">
                      {filteredTemplates.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => handleSelectTemplate(template)}
                          className="w-full text-left p-2 hover:bg-[var(--bg-main)] border-b border-[var(--border-color)] last:border-b-0 text-sm"
                        >
                          <div className="font-medium text-[var(--text-primary)]">{template.name}</div>
                          <div className="text-xs text-[var(--text-secondary)]">{template.category} • {template.investigationCode}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Priority</label>
                  <select
                    value={currentLabRequest.priority}
                    onChange={(e) => setCurrentLabRequest({ ...currentLabRequest, priority: e.target.value as any })}
                    className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm"
                  >
                    <option value="routine">Routine</option>
                    <option value="urgent">Urgent</option>
                    <option value="stat">STAT</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Notes</label>
                  <textarea
                    value={currentLabRequest.notes}
                    onChange={(e) => setCurrentLabRequest({ ...currentLabRequest, notes: e.target.value })}
                    rows={2}
                    placeholder="Clinical notes..."
                    className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm resize-none"
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-[var(--border-color)] flex gap-3">
                <button onClick={() => setShowRequestModal(false)} className="flex-1 px-4 py-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] text-sm">
                  Cancel
                </button>
                <button
                  onClick={handleRequestLabTest}
                  disabled={isRequestingLab || !currentLabRequest.templateId}
                  className="flex-1 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white text-sm font-medium disabled:opacity-50"
                >
                  {isRequestingLab ? 'Requesting...' : 'Request Test'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}