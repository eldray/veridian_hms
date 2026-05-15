// src/pages/Scans.tsx - COMPLETE FIXED VERSION
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAttendanceStore } from '../store/attendanceStore';
import { usePatientStore } from '../store/patientStore';
import { useAuthStore } from '../store/authStore';
import { useMedicalServicesStore } from '../store/medicalServicesStore';
import { useToast } from '../store/toastStore';
import { useWorklistStore } from '../stores/worklistStore';
import { PatientAttendanceSelector } from '../components/vitals/PatientAttendanceSelector';
import { ScanModal } from '../components/medical-entries/modals/ScanModal';
import { ScanResultForm } from '../components/scans/ScanResultForm';
import { generatePDF, openPrintWindow } from '../utils/pdfGenerator';
import { useHospitalStore } from '../store/hospitalStore';
import { WorklistPanel } from '../components/worklist/WorklistPanel';

import {
  ChevronLeft,
  Scan,
  Printer,
  RefreshCw,
  AlertCircle,
  Ban,
  Plus,
  Clock,
  CheckCircle,
  AlertTriangle,
  FileText,
  User,
  Calendar,
  Activity,
  Edit,
  Trash2,
  Eye,
  Users,
} from 'lucide-react';

const getEntityId = (entity: { id?: string; _id?: string } | null): string | undefined => {
  return entity?.id || entity?._id;
};

const getStatusBadge = (status: string) => {
  const config: Record<string, { bg: string; text: string }> = {
    requested: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
    scheduled: { bg: 'bg-blue-100', text: 'text-blue-700' },
    in_progress: { bg: 'bg-purple-100', text: 'text-purple-700' },
    completed: { bg: 'bg-green-100', text: 'text-green-700' },
    cancelled: { bg: 'bg-red-100', text: 'text-red-700' },
  };
  const c = config[status] || config.requested;
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {status === 'in_progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

export default function Scans() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const { setDepartment, selectItem, clearSelection } = useWorklistStore();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedAttendanceId, setSelectedAttendanceId] = useState<string>('');
  const [showScanModal, setShowScanModal] = useState(false);
  const [selectedScan, setSelectedScan] = useState<any>(null);
  const [showResultForm, setShowResultForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showWorklist, setShowWorklist] = useState(false);

  const {
    attendances,
    currentAttendance,
    getAttendance,
    getAttendances,
    updateScanStatus,
    removeScan,
    canAddMedicalEntries,
    calculateBill,
  } = useAttendanceStore();

  const { patients, loadPatients } = usePatientStore();
  const { user } = useAuthStore();
  const { scanTemplates, getScanTemplates } = useMedicalServicesStore();

  const hasLoaded = useRef(false);
  const isInitialLoad = useRef(true);

  const loadData = async (force = false) => {
    if (!force && hasLoaded.current) return;
    try {
      setRefreshing(true);
      setIsLoading(true);
      await Promise.all([
        loadPatients(),
        getAttendances(),
        getScanTemplates(false)
      ]);
      hasLoaded.current = true;
      success('Data loaded', 'Scans management ready');
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

  // Filter attendances for the selected patient
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

  // ✅ CRITICAL FIX: Load attendance data when selectedAttendanceId changes
  useEffect(() => {
    const loadAttendanceData = async () => {
      if (selectedAttendanceId && selectedAttendanceId !== 'undefined' && selectedAttendanceId !== 'null') {
        console.log('🔄 Loading attendance data for ID:', selectedAttendanceId);
        try {
          await getAttendance(selectedAttendanceId);
        } catch (err) {
          console.error('Error loading attendance:', err);
        }
      }
    };
    loadAttendanceData();
  }, [selectedAttendanceId, getAttendance]);

  // ✅ Clear selection when patient changes
  useEffect(() => {
    setSelectedAttendanceId('');
    setSelectedScan(null);
    setShowResultForm(false);
  }, [selectedPatientId]);

  const canAddEntries = selectedAttendance ? canAddMedicalEntries(selectedAttendance) : false;
  const canUpdateScan = selectedAttendance && ['pending', 'admitted'].includes(selectedAttendance.status);

  // ✅ Get scans from currentAttendance (not from the store directly)
  const scansList = useMemo(() => {
    if (!currentAttendance?.Scan) return [];
    return currentAttendance.Scan.map((scan: any) => ({
      ...scan,
      id: scan.id,
      name: scan.scanType || scan.ServiceCatalog?.name || 'Unknown Scan',
      scanType: scan.scanType || scan.ServiceCatalog?.name,
      status: scan.status,
      priority: scan.priority || 'routine',
      requestedAt: scan.requestedAt,
      completedAt: scan.completedAt,
      findings: scan.findings,
      impression: scan.impression,
      result: scan.result,
      bodyPart: scan.bodyPart,
      notes: scan.notes,
      imageUrls: scan.imageUrls || [],
    }));
  }, [currentAttendance]);

  const requestedScans = scansList.filter(s => s.status === 'requested');
  const inProgressScans = scansList.filter(s => s.status === 'in_progress');
  const completedScans = scansList.filter(s => s.status === 'completed');
  const { hospital } = useHospitalStore();

  const handleMarkInProgress = async (scanId: string) => {
    if (!selectedAttendanceId) return;
    try {
      await updateScanStatus(selectedAttendanceId, scanId, {
        status: 'in_progress',
        performedById: user?.id || '',
      });
      success('Status updated', 'Scan in progress');
      // ✅ Refresh the attendance data
      await getAttendance(selectedAttendanceId);
    } catch (error: any) {
      toastError('Update failed', error.message);
    }
  };

  const handleSaveResult = async (scanId: string, resultData: any) => {
    if (!selectedAttendanceId) return;
    setIsSubmitting(true);
    try {
      await updateScanStatus(selectedAttendanceId, scanId, {
        status: 'completed',
        ...resultData,
        performedById: user?.id || '',
        completedAt: new Date().toISOString(),
      });
      success('Result saved', 'Scan completed');
      // ✅ Refresh the attendance data to show updated status
      await getAttendance(selectedAttendanceId);
      setSelectedScan(null);
      setShowResultForm(false);
      await calculateBill(selectedAttendanceId);
    } catch (error: any) {
      toastError('Save failed', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditResult = (scan: any) => {
    setSelectedScan(scan);
    setShowResultForm(true);
  };

  const handleDeleteScan = async (scanId: string) => {
    if (!window.confirm('Delete this scan request?')) return;
    try {
      await removeScan(selectedAttendanceId!, scanId);
      success('Deleted', 'Scan removed');
      // ✅ Refresh the attendance data
      await getAttendance(selectedAttendanceId!);
      await calculateBill(selectedAttendanceId!);
    } catch (error: any) {
      toastError('Delete failed', error.message);
    }
  };

  const handleClearSelection = () => {
    setSelectedPatientId('');
    setSelectedAttendanceId('');
    setSelectedScan(null);
    setShowResultForm(false);
  };

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

  const handlePrintResults = async () => {
    if (completedScans.length === 0) {
      toastError('No results', 'No completed scans to print');
      return;
    }
    
    if (!selectedPatient || !currentAttendance) {
      toastError('Missing info', 'Patient or attendance information missing');
      return;
    }
    
    try {
      const scanData = {
        scans: completedScans.map(scan => ({
          name: scan.name,
          bodyPart: scan.bodyPart,
          findings: scan.findings,
          impression: scan.impression,
          imageUrls: scan.imageUrls,
          completedAt: scan.completedAt,
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
          attendanceNumber: currentAttendance.attendanceNumber || 'N/A',
          dateTime: currentAttendance.dateTime || currentAttendance.createdAt || new Date().toISOString(),
          attendingClinician: currentAttendance.createdBy?.fullName || 'N/A'
        }
      };
      
      const htmlContent = generatePDF('scanReport', scanData, hospital);
      openPrintWindow(htmlContent, `Radiology_Report_${selectedPatient.folderNumber}`);
      
      success('Print ready', 'Radiology report generated');
    } catch (err) {
      console.error('Error printing scan results:', err);
      toastError('Print failed', 'Could not generate radiology report');
    }
  };

  const handleAttendanceSelect = async (attendanceId: string) => {
    console.log('📞 Selecting attendance:', attendanceId);
    setSelectedAttendanceId(attendanceId);
    // The useEffect will handle loading the data
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
        <div className="text-center bg-[var(--bg-card)] p-8 rounded-xl shadow-sm border border-[var(--border-color)]">
          <div className="w-14 h-14 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Loading Scans Management...</h2>
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
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <Scan className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Scans Management</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">Request scans, enter radiology results</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setDepartment('scans');
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
            onClick={handlePrintResults}
            disabled={completedScans.length === 0}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all disabled:opacity-50 text-sm"
          >
            <Printer className="w-4 h-4" />
            Print ({completedScans.length})
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
        onAttendanceSelect={handleAttendanceSelect}
        onClearSelection={handleClearSelection}
        placeholder="Select a visit to manage scans..."
      />

      {/* Patient & Visit Header */}
      {selectedPatient && currentAttendance && (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
          <div className="px-5 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center shadow-sm">
                <User className="w-5 h-5 text-indigo-600" />
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
                  📋 {currentAttendance.attendanceNumber || 'New Visit'}
                </span>
              </div>
              <div className="bg-[var(--bg-main)] px-2.5 py-1 rounded-full border border-[var(--border-color)]">
                <span className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                  📅 {new Date(currentAttendance.dateTime || currentAttendance.createdAt || '').toLocaleDateString()}
                </span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                currentAttendance.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                currentAttendance.status === 'completed' ? 'bg-green-100 text-green-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {currentAttendance.status}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {selectedAttendanceId && currentAttendance ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT COLUMN - Request New Scan + Pending Scans */}
          <div className="space-y-5">
            {/* Request New Scan Card */}
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
              <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)] flex items-center justify-between">
                <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Plus className="w-4 h-4 text-indigo-600" />
                  Request New Scan
                </h3>
                {canAddEntries && (
                  <button
                    onClick={() => setShowScanModal(true)}
                    className="flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs hover:bg-indigo-700 hover:text-white transition-all"
                  >
                    <Plus className="w-3 h-3" /> Request Scan
                  </button>
                )}
              </div>
              <div className="p-4 text-center text-[var(--text-secondary)] text-sm">
                {canAddEntries ? (
                  <div className="flex flex-col items-center gap-2 py-4">
                    <Scan className="w-10 h-10 text-[var(--text-tertiary)]" />
                    <p>Click the Request button to order scans</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 py-4 text-yellow-600">
                    <AlertCircle className="w-4 h-4" />
                    Cannot request scans for {currentAttendance.status} attendance
                  </div>
                )}
              </div>
            </div>

            {/* Requested Scans Table */}
            {requestedScans.length > 0 && (
              <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)]">
                  <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                    <Clock className="w-4 h-4 text-yellow-500" />
                    Requested Scans ({requestedScans.length})
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)]">Scan Type</th>
                        <th className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)]">Body Part</th>
                        <th className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)]">Priority</th>
                        <th className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)]">Requested On</th>
                        <th className="px-4 py-2 text-center font-semibold text-[var(--text-secondary)]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)]">
                      {requestedScans.map((scan) => (
                        <tr key={scan.id} className="hover:bg-[var(--bg-main)] transition-colors">
                          <td className="px-4 py-2 font-medium text-[var(--text-primary)]">{scan.name}</td>
                          <td className="px-4 py-2 text-[var(--text-secondary)]">{scan.bodyPart || '—'}</td>
                          <td className="px-4 py-2">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              scan.priority === 'stat' ? 'bg-red-100 text-red-700' :
                              scan.priority === 'urgent' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {scan.priority}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-[var(--text-secondary)] whitespace-nowrap">
                            {new Date(scan.requestedAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleMarkInProgress(scan.id)}
                                className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-700 hover:text-white transition-all"
                                title="Start Processing"
                              >
                                Start
                              </button>
                              {canUpdateScan && (
                                <button
                                  onClick={() => handleDeleteScan(scan.id)}
                                  className="p-1 text-red-500 hover:bg-red-50 rounded"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* In Progress Scans Table */}
            {inProgressScans.length > 0 && (
              <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)]">
                  <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                    <Activity className="w-4 h-4 text-purple-500" />
                    In Progress ({inProgressScans.length})
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)]">Scan Type</th>
                        <th className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)]">Body Part</th>
                        <th className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)]">Status</th>
                        <th className="px-4 py-2 text-center font-semibold text-[var(--text-secondary)]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)]">
                      {inProgressScans.map((scan) => (
                        <tr key={scan.id} className="hover:bg-[var(--bg-main)] transition-colors">
                          <td className="px-4 py-2 font-medium text-[var(--text-primary)]">{scan.name}</td>
                          <td className="px-4 py-2 text-[var(--text-secondary)]">{scan.bodyPart || '—'}</td>
                          <td className="px-4 py-2">{getStatusBadge(scan.status)}</td>
                          <td className="px-4 py-2 text-center">
                            <button
                              onClick={() => handleEditResult(scan)}
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

          {/* RIGHT COLUMN - Completed Scans */}
          <div className="space-y-5">
            {/* Completed Scans Table */}
            {completedScans.length > 0 && (
              <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)]">
                  <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Completed Scans ({completedScans.length})
                  </h3>
                </div>
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)]">Scan Type</th>
                        <th className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)]">Findings</th>
                        <th className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)]">Impression</th>
                        <th className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)]">Images</th>
                        <th className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)]">Completed</th>
                        <th className="px-4 py-2 text-center font-semibold text-[var(--text-secondary)]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)]">
                      {completedScans.map((scan) => (
                        <tr key={scan.id} className="hover:bg-[var(--bg-main)] transition-colors">
                          <td className="px-4 py-2 font-medium text-[var(--text-primary)]">
                            {scan.name}
                            {scan.bodyPart && <div className="text-[10px] text-[var(--text-secondary)]">{scan.bodyPart}</div>}
                          </td>
                          <td className="px-4 py-2 text-[var(--text-secondary)] max-w-[200px] truncate">
                            {scan.findings || '—'}
                          </td>
                          <td className="px-4 py-2 text-[var(--text-secondary)] max-w-[200px] truncate">
                            {scan.impression || '—'}
                          </td>
                          <td className="px-4 py-2">
                            {scan.imageUrls?.length > 0 ? (
                              <span className="flex items-center gap-1 text-indigo-600">
                                <Eye className="w-3.5 h-3.5" />
                                {scan.imageUrls.length}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-4 py-2 text-[var(--text-secondary)] whitespace-nowrap">
                            {scan.completedAt ? new Date(scan.completedAt).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <button
                              onClick={() => handleEditResult(scan)}
                              className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                              title="Edit Results"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* No Scans Message */}
            {scansList.length === 0 && (
              <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-8 text-center">
                <Scan className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">No Scans</h3>
                <p className="text-sm text-[var(--text-secondary)]">Request scans from the left panel</p>
              </div>
            )}
          </div>
        </div>
      ) : selectedPatientId && !selectedAttendanceId ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-yellow-800 mb-1">No Attendance Selected</h3>
          <p className="text-sm text-yellow-700">Please select an attendance to manage scans</p>
        </div>
      ) : null}

      {/* Scan Modal */}
      <ScanModal
        isOpen={showScanModal}
        onClose={() => setShowScanModal(false)}
        onSuccess={() => {
          setShowScanModal(false);
          if (selectedAttendanceId) {
            // ✅ Refresh attendance after adding a scan
            getAttendance(selectedAttendanceId);
            calculateBill(selectedAttendanceId);
          }
        }}
        attendanceId={selectedAttendanceId}
        scans={scanTemplates}
        canAdd={canAddEntries}
        userId={user?.id}
        userName={user?.fullName}
      />

      {/* Scan Result Form Modal */}
      {showResultForm && selectedScan && (
        <ScanResultForm
          scan={selectedScan}
          onSaveResult={handleSaveResult}
          onClose={() => {
            setShowResultForm(false);
            setSelectedScan(null);
          }}
          saving={isSubmitting}
        />
      )}

      {/* Worklist Panel */}
      {showWorklist && (
        <WorklistPanel
          department="scans"
          onClose={() => {
            setShowWorklist(false);
            clearSelection();
          }}
          onSelect={(item) => {
            selectItem(item);
            setShowWorklist(false);
            // Auto-select patient and attendance if available
            if (item.patientId) setSelectedPatientId(item.patientId);
            if (item.attendanceId) setSelectedAttendanceId(item.attendanceId);
          }}
        />
      )}
    </div>
  );
}