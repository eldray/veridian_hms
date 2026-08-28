// src/pages/ScansEntry.tsx - Scans Results Entry Page
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAttendanceStore } from '../store/attendanceStore';
import { usePatientStore } from '../store/patientStore';
import { useAuthStore } from '../store/authStore';
import { useMedicalServicesStore } from '../store/medicalServicesStore';
import { useToast } from '../store/toastStore';
import { useHospitalStore } from '../store/hospitalStore';
import { PatientAttendanceSelector } from '../components/vitals/PatientAttendanceSelector';
import { ScanModal } from '../components/medical-entries/modals/ScanModal';
import { ScanResultForm } from '../components/scans/ScanResultForm';
import { generatePDF, openPrintWindow } from '../utils/pdfGenerator';
import { getPatientName } from '../utils/patient';
import {
  ChevronLeft,
  Scan,
  RefreshCw,
  AlertCircle,
  Plus,
  Clock,
  CheckCircle,
  Activity,
  User,
  Calendar,
  X,
  Edit,
  Trash2,
  Eye,
  FileText,
  Printer,
  Image,
  MessageSquare
} from 'lucide-react';
import SendDocumentModal from '../components/SendDocumentModal';

const getEntityId = (entity: { id?: string; _id?: string } | null): string | undefined =>
  entity?.id || entity?._id;

const getStatusBadge = (status: string) => {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    requested: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' },
    scheduled: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Scheduled' },
    in_progress: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'In Progress' },
    completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completed' },
    cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelled' },
  };
  const c = config[status] || config.requested;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
};

// Scan Result Display Component
const ScanResultDisplay = ({ scan }: { scan: any }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-[var(--border-color)] rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between p-3 bg-[var(--bg-main)] cursor-pointer hover:bg-[var(--bg-card)]"
        onClick={() => setExpanded(!expanded)}
      >
        <div>
          <h4 className="font-medium text-[var(--text-primary)] text-sm">{scan.name}</h4>
          {scan.bodyPart && <p className="text-xs text-[var(--text-secondary)]">Body Part: {scan.bodyPart}</p>}
        </div>
        <div className="flex items-center gap-2">
          {scan.imageUrls?.length > 0 && (
            <span className="flex items-center gap-1 text-indigo-600 text-xs">
              <Image className="w-3.5 h-3.5" />
              {scan.imageUrls.length} images
            </span>
          )}
          <span className="text-xs text-[var(--text-secondary)]">
            {scan.completedAt ? new Date(scan.completedAt).toLocaleDateString() : '—'}
          </span>
          <button className="p-1 text-blue-500 hover:bg-blue-50 rounded">
            <Edit className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-3 border-t border-[var(--border-color)] space-y-3 bg-white">
          {scan.findings && (
            <div>
              <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase mb-1">Findings</p>
              <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{scan.findings}</p>
            </div>
          )}
          {scan.impression && (
            <div>
              <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase mb-1">Impression / Conclusion</p>
              <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{scan.impression}</p>
            </div>
          )}
          {scan.result && (
            <div>
              <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase mb-1">Additional Notes</p>
              <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{scan.result}</p>
            </div>
          )}
          {scan.imageUrls && scan.imageUrls.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase mb-1">Images</p>
              <div className="flex gap-2 flex-wrap">
                {scan.imageUrls.map((url: string, idx: number) => (
                  <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 text-xs hover:underline">
                    View Image {idx + 1}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function ScansEntry() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { success, error: toastError } = useToast();
  const { hospital } = useHospitalStore();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedAttendanceId, setSelectedAttendanceId] = useState<string>('');
  const [showScanModal, setShowScanModal] = useState(false);
  const [showSendResult, setShowSendResult] = useState(false);
  const [selectedScan, setSelectedScan] = useState<any>(null);
  const [showResultForm, setShowResultForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  const { patients, loadPatients, fetchPatient } = usePatientStore();
  const { user } = useAuthStore();
  const { scanTemplates, getScanTemplates } = useMedicalServicesStore();

  const [patient, setPatient] = useState<any>(null);
  const [attendance, setAttendance] = useState<any>(null);
  const [allAttendances, setAllAttendances] = useState<any[]>([]);

  const loadData = async () => {
    try {
      setRefreshing(true);
      await Promise.all([
        loadPatients(),
        getScanTemplates(false)
      ]);

      // Worklist navigates with :id = patientId plus state.{patient, attendanceId}.
      const statePatient = location.state?.patient;
      const patientId = statePatient?.id || id;
      const initialAttendanceId = location.state?.attendanceId;

      if (patientId) {
        // Load THIS patient's attendances directly (complete + small) instead of
        // filtering a paginated global list that may not contain the target.
        const patientAttendances = await getAttendances({ patientId });
        setAllAttendances(patientAttendances);

        // Resolve the full patient; the default list only holds a page, so fall back
        // to a direct fetch (or the navigation summary).
        let foundPatient = patients.find(p => p.id === patientId) || statePatient || null;
        if (!foundPatient || !foundPatient.surname) {
          try { foundPatient = await fetchPatient(patientId); } catch { /* keep summary */ }
        }
        if (foundPatient) {
          setPatient(foundPatient);
          setSelectedPatientId(patientId);
        }

        const target =
          (initialAttendanceId && patientAttendances.find(a => a.id === initialAttendanceId)) ||
          [...patientAttendances].sort((a, b) =>
            new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
          )[0];
        if (target) {
          setSelectedAttendanceId(target.id);
          await getAttendance(target.id);
        }
      }

    } catch (err: any) {
      toastError('Load failed', err.message);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    if (selectedAttendanceId && selectedAttendanceId !== 'undefined' && selectedAttendanceId !== 'null') {
      getAttendance(selectedAttendanceId);
    }
  }, [selectedAttendanceId, getAttendance]);

  useEffect(() => {
    if (currentAttendance) {
      setAttendance(currentAttendance);
    }
  }, [currentAttendance]);

  const handleAttendanceChange = async (attendanceId: string) => {
    setSelectedAttendanceId(attendanceId);
    setSelectedScan(null);
    setShowResultForm(false);
    await getAttendance(attendanceId);
  };

  const handleClearSelection = () => {
    setSelectedAttendanceId('');
    setAttendance(null);
    setSelectedScan(null);
    setShowResultForm(false);
  };

  const canAddEntries = attendance ? canAddMedicalEntries(attendance) : false;
  const canUpdateScan = attendance && ['pending', 'admitted'].includes(attendance.status);

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

  const handleMarkInProgress = async (scanId: string) => {
    if (!selectedAttendanceId) return;
    try {
      await updateScanStatus(selectedAttendanceId, scanId, {
        status: 'in_progress',
        performedById: user?.id || '',
      });
      success('Status updated', 'Scan in progress');
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
      await getAttendance(selectedAttendanceId!);
      await calculateBill(selectedAttendanceId!);
    } catch (error: any) {
      toastError('Delete failed', error.message);
    }
  };

  const handlePrintResults = async () => {
    if (completedScans.length === 0) {
      toastError('No results', 'No completed scans to print');
      return;
    }

    if (!patient || !attendance) {
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
          fullName: getPatientName(patient),
          folderNumber: patient.folderNumber,
          contact: patient.contact,
          age: patient.age || calculateAge(patient.dateOfBirth),
          gender: patient.gender,
          id: patient.id
        },
        attendance: {
          attendanceNumber: attendance.attendanceNumber || 'N/A',
          dateTime: attendance.dateTime || attendance.createdAt || new Date().toISOString(),
          attendingClinician: attendance.createdBy?.fullName || 'N/A'
        }
      };

      const htmlContent = generatePDF('scanReport', scanData, hospital);
      openPrintWindow(htmlContent, `Radiology_Report_${patient.folderNumber}`);

      success('Print ready', 'Radiology report generated');
    } catch (err) {
      console.error('Error printing scan results:', err);
      toastError('Print failed', 'Could not generate radiology report');
    }
  };

  const calculateAge = (dateOfBirth: string): number => {
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

  const handlePrescribeSuccess = async () => {
    setShowScanModal(false);
    await loadData();
    if (selectedAttendanceId) {
      await getAttendance(selectedAttendanceId);
      await calculateBill(selectedAttendanceId);
    }
    success('Scan requested', 'Scan added successfully');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
        <div className="text-center bg-[var(--bg-card)] p-8 rounded-xl border border-[var(--border-color)]">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Loading Scans Data...</h2>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
        <div className="text-center bg-[var(--bg-card)] p-8 rounded-xl border border-[var(--border-color)]">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">Patient Not Found</h2>
          <p className="text-[var(--text-secondary)]">The patient you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/dashboard/scans')}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all"
          >
            Back to Scans Queue
          </button>
        </div>
      </div>
    );
  }

  const patientFullName = getPatientName(patient);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard/scans')}
            className="p-2 hover:bg-[var(--bg-card)] rounded-lg transition-all border border-[var(--border-color)]"
          >
            <ChevronLeft className="w-5 h-5 text-[var(--text-primary)]" />
          </button>
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <Scan className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Scans Management</h1>
            <p className="text-sm text-[var(--text-secondary)]">{patientFullName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowScanModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all text-sm"
            disabled={!canAddEntries}
          >
            <Plus className="w-4 h-4" />
            Request Scan
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
            onClick={() => setShowSendResult(true)}
            disabled={completedScans.length === 0}
            className="flex items-center gap-2 px-3 py-2 border border-green-200 text-green-700 rounded-lg hover:bg-green-50 transition-all disabled:opacity-50 text-sm"
          >
            <MessageSquare className="w-4 h-4" />
            Send Results
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

      <SendDocumentModal
        open={showSendResult}
        onClose={() => setShowSendResult(false)}
        patient={patient}
        documentType="scan-result"
        entityId={selectedAttendanceId}
      />

      {/* Patient & Attendance Selector */}
      <PatientAttendanceSelector
        patients={[patient]}
        attendances={allAttendances}
        selectedPatientId={selectedPatientId}
        selectedAttendanceId={selectedAttendanceId}
        onPatientSelect={(patientId) => {
          setSelectedPatientId(patientId);
          setAllAttendances(attendances.filter(a => a.patientId === patientId));
          setSelectedAttendanceId('');
          setAttendance(null);
          setSelectedScan(null);
        }}
        onAttendanceSelect={handleAttendanceChange}
        onClearSelection={handleClearSelection}
      />

      {/* No Attendance Selected */}
      {!selectedAttendanceId && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
          <Calendar className="w-12 h-12 text-yellow-600 mx-auto mb-3 opacity-50" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No Attendance Selected</h3>
          <p className="text-[var(--text-secondary)]">Please select an attendance from the dropdown above to manage scans.</p>
        </div>
      )}

      {/* Patient & Visit Overview */}
      {selectedAttendanceId && attendance && (
        <>
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
            <div className="px-5 py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shadow-sm">
                  <User className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-[var(--text-primary)] text-base">
                      {patientFullName}
                    </h3>
                    <span className="text-xs text-[var(--text-secondary)]">
                      {patient.gender === 'male' ? '👨' : '👩'} • {patient.age || '?'}y
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono text-[10px] bg-[var(--bg-main)] px-1.5 py-0.5 rounded">#{patient.folderNumber}</span>
                    <span>•</span>
                    <span>{patient.contact}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="bg-[var(--bg-main)] px-2.5 py-1 rounded-full border border-[var(--border-color)]">
                  <span className="text-xs font-mono text-[var(--text-secondary)]">
                    📋 {attendance.attendanceNumber || 'New Visit'}
                  </span>
                </div>
                <div className="bg-[var(--bg-main)] px-2.5 py-1 rounded-full border border-[var(--border-color)]">
                  <span className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                    📅 {new Date(attendance.dateTime || attendance.createdAt || '').toLocaleDateString()}
                  </span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${attendance.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    attendance.status === 'completed' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                  }`}>
                  {attendance.status}
                </span>
              </div>
            </div>
          </div>

          {/* Read-only warning */}
          {!canUpdateScan && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <p className="text-sm text-yellow-700">
                This visit is <strong>{attendance.status}</strong>. Scans can be viewed but not processed.
              </p>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-yellow-600">{requestedScans.length}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">Pending Scans</p>
                </div>
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
              </div>
            </div>
            <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-purple-600">{inProgressScans.length}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">In Progress</p>
                </div>
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Activity className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </div>
            <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-green-600">{completedScans.length}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">Completed</p>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Requested Scans Table */}
          {requestedScans.length > 0 && (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
              <div className="bg-[var(--bg-main)] px-6 py-3 border-b border-[var(--border-color)]">
                <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-500" />
                  Pending Scans ({requestedScans.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-[var(--text-secondary)]">Scan Type</th>
                      <th className="px-4 py-3 text-left font-semibold text-[var(--text-secondary)]">Body Part</th>
                      <th className="px-4 py-3 text-left font-semibold text-[var(--text-secondary)]">Priority</th>
                      <th className="px-4 py-3 text-left font-semibold text-[var(--text-secondary)]">Requested On</th>
                      <th className="px-4 py-3 text-left font-semibold text-[var(--text-secondary)]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {requestedScans.map((scan) => (
                      <tr key={scan.id} className="hover:bg-[var(--bg-main)] transition-colors">
                        <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{scan.name}</td>
                        <td className="px-4 py-3 text-[var(--text-secondary)]">{scan.bodyPart || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${scan.priority === 'stat' ? 'bg-red-100 text-red-700' :
                              scan.priority === 'urgent' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                            {scan.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[var(--text-secondary)]">
                          {new Date(scan.requestedAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleMarkInProgress(scan.id)}
                              className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs hover:bg-blue-700 hover:text-white transition-all"
                            >
                              Start Processing
                            </button>
                            {canUpdateScan && (
                              <button
                                onClick={() => handleDeleteScan(scan.id)}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
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
              <div className="bg-[var(--bg-main)] px-6 py-3 border-b border-[var(--border-color)]">
                <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-500" />
                  In Progress ({inProgressScans.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-[var(--text-secondary)]">Scan Type</th>
                      <th className="px-4 py-3 text-left font-semibold text-[var(--text-secondary)]">Body Part</th>
                      <th className="px-4 py-3 text-left font-semibold text-[var(--text-secondary)]">Started On</th>
                      <th className="px-4 py-3 text-left font-semibold text-[var(--text-secondary)]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {inProgressScans.map((scan) => (
                      <tr key={scan.id} className="hover:bg-[var(--bg-main)] transition-colors">
                        <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{scan.name}</td>
                        <td className="px-4 py-3 text-[var(--text-secondary)]">{scan.bodyPart || '—'}</td>
                        <td className="px-4 py-3 text-[var(--text-secondary)]">
                          {scan.updatedAt ? new Date(scan.updatedAt).toLocaleString() : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleEditResult(scan)}
                            className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs hover:bg-green-700 hover:text-white transition-all"
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

          {/* Completed Scans Section */}
          {completedScans.length > 0 && (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
              <div className="bg-[var(--bg-main)] px-6 py-3 border-b border-[var(--border-color)] flex justify-between items-center">
                <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Completed Scans ({completedScans.length})
                </h3>
              </div>
              <div className="divide-y divide-[var(--border-color)]">
                {completedScans.map((scan) => (
                  <ScanResultDisplay key={scan.id} scan={scan} />
                ))}
              </div>
            </div>
          )}

          {/* No Scans Message */}
          {scansList.length === 0 && (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-8 text-center">
              <Scan className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">No Scans</h3>
              <p className="text-sm text-[var(--text-secondary)]">No scans have been requested for this visit</p>
              {canAddEntries && (
                <button
                  onClick={() => setShowScanModal(true)}
                  className="mt-3 text-indigo-600 text-sm hover:underline"
                >
                  Request a scan
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* Scan Modal */}
      {selectedAttendanceId && (
        <ScanModal
          isOpen={showScanModal}
          onClose={() => setShowScanModal(false)}
          onSuccess={handlePrescribeSuccess}
          attendanceId={selectedAttendanceId}
          scans={scanTemplates}
          canAdd={canAddEntries}
          userId={user?.id}
          userName={user?.fullName}
        />
      )}

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
    </div>
  );
}