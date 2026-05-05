// src/pages/MedicalEntries.tsx - THEMED VERSION WITH AUDIT LOGGING
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { usePatientStore } from '../store/patientStore';
import { useAttendanceStore } from '../store/attendanceStore';
import { useMedicalServicesStore } from '../store/medicalServicesStore';
import { useStockStore } from '../store/stockStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import { PatientAttendanceSelector } from '../components/vitals/PatientAttendanceSelector';

// Modal Components
import { DiagnosisModal } from '../components/medical-entries/modals/DiagnosisModal';
import { LabTestModal } from '../components/medical-entries/modals/LabTestModal';
import { ProcedureModal } from '../components/medical-entries/modals/ProcedureModal';
import { MedicationModal } from '../components/medical-entries/modals/MedicationModal';
import { ScanModal } from '../components/medical-entries/modals/ScanModal';

// Add to existing imports
import ComplaintInput from '../components/ComplaintInput';
import ODQInput from '../components/medical-entries/ODQInput';
import {
  ChevronLeft,
  RefreshCw,
  Stethoscope,
  Pill,
  FlaskConical,
  Scissors,
  Scan,
  FileText,
  Activity,
  AlertCircle,
  Plus,
  Trash2,
  Hospital,
  User,
  Calendar,
  DollarSign,
  Clock,
  Heart,
  Thermometer,
  Wind,
  Droplets,
  Gauge,
  Weight,
  Ruler,
  CheckCircle,
  XCircle,
  Printer,
  History,
  Eye,
  Edit,
  ClipboardList,
  Microscope,
  Image
} from 'lucide-react';

const getEntityId = (entity: { id?: string; _id?: string } | null): string | undefined => {
  return entity?._id || entity?.id;
};
import { useAdmissionStore } from '../store/admissionStore';

// ✅ ADD PanelHeader Component HERE
const PanelHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
}> = ({ icon, title, action }) => (
  <div className="bg-[var(--bg-main)] px-4 py-2.5 border-b border-[var(--border-color)] flex items-center justify-between flex-shrink-0">
    <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2 text-sm">
      {icon}{title}
    </h3>
    {action}
  </div>
);

type ModalType = 'diagnosis' | 'lab' | 'procedure' | 'medication' | 'scan' | null;

// Scan Result Form Component - Themed
const ScanResultForm: React.FC<{ 
  scan: any; 
  onSaveResult: (scanId: string, resultData: any) => Promise<void>; 
  onClose: () => void;
  saving: boolean;
}> = ({ scan, onSaveResult, onClose, saving }) => {
  const [findings, setFindings] = useState(scan.findings || '');
  const [impression, setImpression] = useState(scan.impression || '');
  const [result, setResult] = useState(scan.result || '');

  const handleSubmit = async () => {
    await onSaveResult(scan.id, {
      findings,
      impression,
      result,
      status: 'completed',
      completedAt: new Date().toISOString()
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--bg-card)] rounded-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto border border-[var(--border-color)]">
        <div className="sticky top-0 bg-[var(--bg-card)] border-b border-[var(--border-color)] p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image className="w-5 h-5 text-[var(--icon-cyan-text)]" />
            <h3 className="text-lg font-bold text-[var(--text-primary)]">Enter Scan Results</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-[var(--bg-main)] rounded-lg">
            <XCircle className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
        </div>
        
        <div className="p-5 space-y-4">
          <div className="bg-[var(--bg-main)] p-3 rounded-lg border border-[var(--border-color)]">
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Scan Type: <span className="font-normal text-[var(--text-secondary)]">{scan.scanType || scan.ServiceCatalog?.name}</span>
            </p>
            <p className="text-sm font-medium text-[var(--text-primary)] mt-1">
              Body Part: <span className="font-normal text-[var(--text-secondary)]">{scan.bodyPart || 'N/A'}</span>
            </p>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              Requested by: {scan.requestedBy?.fullName || 'Unknown'} on {new Date(scan.requestedAt).toLocaleDateString()}
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Findings</label>
            <textarea
              value={findings}
              onChange={(e) => setFindings(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] text-sm text-[var(--text-primary)]"
              placeholder="Describe radiological findings..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Impression / Conclusion</label>
            <textarea
              value={impression}
              onChange={(e) => setImpression(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] text-sm text-[var(--text-primary)]"
              placeholder="Clinical impression based on findings..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Additional Notes</label>
            <textarea
              value={result}
              onChange={(e) => setResult(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] text-sm text-[var(--text-primary)]"
              placeholder="Any additional comments..."
            />
          </div>
          
          <div className="flex gap-3 pt-3 border-t border-[var(--border-color)]">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white disabled:opacity-50 text-sm font-medium"
            >
              {saving ? 'Saving...' : 'Save Results'}
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function MedicalEntries() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const { patients, loadPatients } = usePatientStore();
  const { attendanceId } = useParams();
  const { attendanceId: attendanceIdFromParams } = useParams();
  const [searchParams] = useSearchParams();
    // Inside component:
  const { createAdmission, getAdmissions } = useAdmissionStore();
  const { updateAttendance } = useAttendanceStore();
  const {
    attendances,
    currentAttendance,
    getAttendance,
    getAttendances,
    removeDiagnosis,
    removeLabTest,
    removeProcedure,
    removeMedication,
    removeScan,
    updateScanStatus,  // ✅ Add this import
    canAddMedicalEntries,
    getVitalsByAttendance,
    calculateBill,
  } = useAttendanceStore();

  const {
    diagnoses,
    labTestTemplates,
    procedureTemplates,
    scanTemplates,
    getDiagnoses,
    getLabTestTemplates,
    getProcedureTemplates,
    getScanTemplates,
  } = useMedicalServicesStore();

  const { stockItems, getStockItems } = useStockStore();
  const { user } = useAuthStore();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedAttendanceId, setSelectedAttendanceId] = useState<string>('');
  const [latestVitals, setLatestVitals] = useState<any>(null);
  const [scanResultFor, setScanResultFor] = useState<any>(null);
  const [savingResult, setSavingResult] = useState(false);

  // Clinical form state
  const [presentedComplaints, setPresentedComplaints] = useState('');
  const [hpc, setHpc] = useState('');
  const [odq, setOdq] = useState('');
  const [physicalExam, setPhysicalExam] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');

  // Modal state
  const [modalType, setModalType] = useState<ModalType>(null);

  const loadData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadPatients(),
        getAttendances(),
        getStockItems(),
        getDiagnoses(),
        getLabTestTemplates(),
        getProcedureTemplates(),
        getScanTemplates(),
      ]);
      success('Data loaded', 'Medical entries ready');
    } catch (err: any) {
      toastError('Load failed', err.message);
    } finally {
      setRefreshing(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const loadVitals = async () => {
      if (selectedAttendanceId) {
        try {
          const vitals = await getVitalsByAttendance(selectedAttendanceId);
          setLatestVitals(vitals?.length ? vitals[vitals.length - 1] : null);
        } catch {
          setLatestVitals(null);
        }
      }
    };
    loadVitals();
  }, [selectedAttendanceId, getVitalsByAttendance]);

    // Add useEffect to handle URL parameters on initial load
    useEffect(() => {
      if (attendanceId) {
        // Find the patient associated with this attendance
        const attendance = attendances.find(a => a.id === attendanceId);
        if (attendance) {
          setSelectedPatientId(attendance.patientId);
          setSelectedAttendanceId(attendanceId);
          getAttendance(attendanceId);
        }
      }
    }, [attendanceId, attendances]);

  useEffect(() => {
    if (selectedAttendanceId) {
      getAttendance(selectedAttendanceId).then((att) => {
        if (att) {
          setPresentedComplaints(att.complaints || '');
          setHpc((att as any).historyPresentingComplaint || '');
          setOdq((att as any).onsetDurationQuality || '');
          setPhysicalExam((att as any).physicalExamination || '');
          setTreatmentPlan((att as any).treatmentPlan || '');
          setFollowUpDate(
            (att as any).followUpDate
              ? new Date((att as any).followUpDate).toISOString().slice(0, 16)
              : ''
          );
        }
      });
    }
  }, [selectedAttendanceId, getAttendance]);

  const selectedPatient = patients.find((p) => getEntityId(p) === selectedPatientId);
  const canAddEntries = currentAttendance ? canAddMedicalEntries(currentAttendance) : false;
  const currentUser = user;

  const diagnosesList = currentAttendance?.AttendanceDiagnosis || [];
  const labTestsList = currentAttendance?.LabTest || [];
  const proceduresList = currentAttendance?.Procedure || [];
  const medicationsList = currentAttendance?.Medication || [];
  const scansList = currentAttendance?.Scan || [];

  const prescribedMeds = medicationsList.filter((m) => m.status === 'prescribed');
  const dispensedMeds = medicationsList.filter((m) => m.status === 'dispensed');
  const requestedScans = scansList.filter((s) => s.status === 'requested' || s.status === 'scheduled');
  const completedScans = scansList.filter((s) => s.status === 'completed');

  const handleClearSelection = () => {
    setSelectedPatientId('');
    setSelectedAttendanceId('');
    setPresentedComplaints('');
    setHpc('');
    setOdq('');
    setPhysicalExam('');
    setTreatmentPlan('');
    setFollowUpDate('');
  };

  const handleRefresh = () => loadData();

  const handleSaveClinical = async () => {
    if (!selectedAttendanceId) return;
    try {
      await updateAttendance(selectedAttendanceId, {
        complaints: presentedComplaints,
        historyPresentingComplaint: hpc,
        onsetDurationQuality: odq,
        physicalExamination: physicalExam,
        treatmentPlan: treatmentPlan,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        updatedById: currentUser?.id,
        updatedAt: new Date().toISOString()
      });
      success('Saved', 'Clinical information saved');
      await getAttendance(selectedAttendanceId);
    } catch (err: any) {
      toastError('Save failed', err.message);
    }
  };
  const handleDirectAdmit = async () => {
    if (!selectedAttendanceId || !currentAttendance || !selectedPatient) {
      toastError('Error', 'Missing required information');
      return;
    }
    
    if (currentAttendance.status === 'admitted') {
      toastError('Already Admitted', 'This patient is already admitted');
      return;
    }
    
    try {
      // Create admission directly
      const admissionData = {
        attendanceId: selectedAttendanceId,
        patientId: selectedPatientId,
        admissionNumber: `ADM-${Date.now()}`,
        admissionDate: new Date().toISOString(),
        admittingDoctor: user?.fullName || user?.username || 'Unknown Doctor',
        diagnosis: presentedComplaints || 'To be determined',
        status: 'admitted',
        complaints: presentedComplaints,
        paymentMode: currentAttendance.paymentMode,
        attendanceNumber: currentAttendance.attendanceNumber,
      };
      
      await createAdmission(admissionData);
      
      // Update attendance status
      await updateAttendance(selectedAttendanceId, {
        status: 'admitted',
        attendanceType: 'inpatient'
      });
      
      success('Success', 'Patient admitted successfully');
      
      // Refresh the page data
      await getAttendance(selectedAttendanceId);
      await getAdmissions();
      
    } catch (err: any) {
      toastError('Admission Failed', err.response?.data?.message || err.message);
    }
  };
  
  const handleDeleteItem = async (type: string, id: string) => {
    if (!selectedAttendanceId) return;
    try {
      switch (type) {
        case 'diagnosis':
          await removeDiagnosis(selectedAttendanceId, id);
          success('Deleted', 'Diagnosis removed');
          break;
        case 'lab':
          await removeLabTest(selectedAttendanceId, id);
          success('Deleted', 'Lab test removed');
          break;
        case 'procedure':
          await removeProcedure(selectedAttendanceId, id);
          success('Deleted', 'Procedure removed');
          break;
        case 'medication':
          await removeMedication(selectedAttendanceId, id);
          success('Deleted', 'Medication removed');
          break;
        case 'scan':
          await removeScan(selectedAttendanceId, id);
          success('Deleted', 'Scan removed');
          break;
      }
      await getAttendance(selectedAttendanceId);
      await calculateBill(selectedAttendanceId);
    } catch (err: any) {
      toastError('Delete failed', err.message);
    }
  };

  const handleSaveScanResult = async (scanId: string, resultData: any) => {
    if (!selectedAttendanceId) return;
    setSavingResult(true);
    try {
      // ✅ Use the dedicated updateScanStatus API instead of updateAttendance
      await updateScanStatus(selectedAttendanceId, scanId, {
        ...resultData,
        performedById: currentUser?.id,
        performedAt: new Date().toISOString()
      });
      
      success('Results Saved', 'Scan results have been recorded');
      await getAttendance(selectedAttendanceId);
      setScanResultFor(null);
    } catch (err: any) {
      toastError('Save failed', err.message);
    } finally {
      setSavingResult(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; bg: string }> = {
      requested: { color: 'text-yellow-800', bg: 'bg-yellow-100' },
      scheduled: { color: 'text-blue-800', bg: 'bg-blue-100' },
      prescribed: { color: 'text-purple-800', bg: 'bg-purple-100' },
      dispensed: { color: 'text-green-800', bg: 'bg-green-100' },
      completed: { color: 'text-green-800', bg: 'bg-green-100' },
      cancelled: { color: 'text-red-800', bg: 'bg-red-100' },
      pending: { color: 'text-yellow-800', bg: 'bg-yellow-100' },
      in_progress: { color: 'text-cyan-800', bg: 'bg-cyan-100' },
    };
    const c = config[status?.toLowerCase()] || { color: 'text-gray-800', bg: 'bg-gray-100' };
    return (
      <span className={`px-2 py-0.5 text-xs rounded-full ${c.bg} ${c.color}`}>{status?.replace('_', ' ')}</span>
    );
  };

  const getVitalStatusColor = (type: string, value: any) => {
    if (!value) return 'text-[var(--text-tertiary)]';
    switch (type) {
      case 'bp':
        const [sys, dia] = String(value).split('/').map(Number);
        if (sys > 140 || dia > 90) return 'text-[var(--icon-red-text)]';
        if (sys < 90 || dia < 60) return 'text-[var(--icon-yellow-text)]';
        return 'text-[var(--icon-green-text)]';
      case 'temp':
        if (value > 38) return 'text-[var(--icon-red-text)]';
        if (value < 35) return 'text-[var(--icon-yellow-text)]';
        return 'text-[var(--icon-green-text)]';
      case 'pulse':
        if (value > 100 || value < 60) return 'text-[var(--icon-red-text)]';
        return 'text-[var(--icon-green-text)]';
      case 'spo2':
        if (value < 95) return 'text-[var(--icon-red-text)]';
        return 'text-[var(--icon-green-text)]';
      default:
        return 'text-[var(--text-primary)]';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
        <div className="text-center bg-[var(--bg-card)] p-8 rounded-xl shadow-sm border border-[var(--border-color)]">
          <div className="w-14 h-14 border-4 border-[var(--icon-cyan-text)] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Loading Medical Entries...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-[var(--bg-card)] rounded-lg transition-all duration-200 border border-[var(--border-color)]"
          >
            <ChevronLeft className="w-5 h-5 text-[var(--text-primary)]" />
          </button>
          <div className="w-10 h-10 bg-[var(--icon-purple-bg)] rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-[var(--icon-purple-text)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Medical Entries</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">Complete clinical documentation</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all text-sm text-[var(--text-primary)]"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all disabled:opacity-50 text-sm text-[var(--text-primary)]"
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

      {selectedAttendanceId && currentAttendance ? (
        <>
          {/* PATIENT HEADER */}
            <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[var(--icon-cyan-bg)] rounded-xl flex items-center justify-center">
                    <User className="w-6 h-6 text-[var(--icon-cyan-text)]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[var(--text-primary)]">
                      {selectedPatient?.surname} {selectedPatient?.otherNames}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)] mt-1">
                      <span>{selectedPatient?.age || 'N/A'} years • {selectedPatient?.gender}</span>
                      <span>•</span>
                      <span>ID: {selectedPatient?.folderNumber}</span>
                      <span>•</span>
                      <span>{selectedPatient?.contact}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      currentAttendance.paymentMode === 'nhis'
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : currentAttendance.paymentMode === 'private_insurance'
                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}
                  >
                    {currentAttendance.paymentMode === 'nhis'
                      ? 'NHIS'
                      : currentAttendance.paymentMode === 'private_insurance'
                      ? 'PRIVATE INS'
                      : 'CASH'}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      currentAttendance.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : currentAttendance.status === 'admitted'
                        ? 'bg-green-100 text-green-800'
                        : currentAttendance.status === 'completed'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {currentAttendance.status?.toUpperCase()}
                  </span>
                  {currentAttendance.outstandingBalance > 0 && (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                      Balance: GHS {currentAttendance.outstandingBalance.toFixed(2)}
                    </span>
                  )}
                  
                  {/* ✅ ADMIT BUTTON - Only show if not already admitted or completed */}
                  {currentAttendance.status !== 'admitted' && currentAttendance.status !== 'completed' && (
                    <button
                      onClick={handleDirectAdmit}
                      className="flex items-center gap-2 px-4 py-1.5 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] rounded-lg hover:bg-[var(--icon-green-text)] hover:text-white transition-all text-sm font-medium"
                    >
                      <Hospital className="w-4 h-4" />
                      Admit Patient
                    </button>
                  )}
                  
                  {/* Show badge if already admitted */}
                  {currentAttendance.status === 'admitted' && (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
                      <Hospital className="w-3 h-3 inline mr-1" />
                      ADMITTED
                    </span>
                  )}
                </div>
              </div>
            </div>

          {/* VITALS STRIP */}
          {latestVitals && (
            <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-9 gap-3">
                {[
                  { icon: <Gauge className="w-4 h-4 text-blue-500" />, value: latestVitals.bloodPressure || '—', label: 'BP (mmHg)', colorType: 'bp' },
                  { icon: <Thermometer className="w-4 h-4 text-red-500" />, value: latestVitals.temperature ? `${latestVitals.temperature}°C` : '—', label: 'Temp', colorType: 'temp' },
                  { icon: <Heart className="w-4 h-4 text-red-500" />, value: latestVitals.pulse || '—', label: 'Pulse (bpm)', colorType: 'pulse' },
                  { icon: <Wind className="w-4 h-4 text-teal-500" />, value: latestVitals.respiration || '—', label: 'Resp (bpm)', colorType: null },
                  { icon: <Droplets className="w-4 h-4 text-blue-500" />, value: latestVitals.spo2 ? `${latestVitals.spo2}%` : '—', label: 'SpO2 (%)', colorType: 'spo2' },
                  { icon: <Weight className="w-4 h-4 text-amber-500" />, value: latestVitals.weight ? `${latestVitals.weight}kg` : '—', label: 'Weight', colorType: null },
                  { icon: <Ruler className="w-4 h-4 text-cyan-500" />, value: latestVitals.height ? `${latestVitals.height}cm` : '—', label: 'Height', colorType: null },
                  { icon: <Activity className="w-4 h-4 text-purple-500" />, value: latestVitals.bmi || '—', label: 'BMI', colorType: null },
                  { icon: <Activity className="w-4 h-4 text-indigo-500" />, value: latestVitals.muac || '—', label: 'MUAC (cm)', colorType: null },
                ].map((vital, i) => (
                  <div key={i} className="text-center">
                    <div className="flex justify-center mb-1">{vital.icon}</div>
                    <div className={`text-sm font-bold ${vital.colorType ? getVitalStatusColor(vital.colorType, vital.value) : 'text-[var(--text-primary)]'}`}>
                      {vital.value}
                    </div>
                    <div className="text-xs text-[var(--text-secondary)]">{vital.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MAIN TWO-COLUMN LAYOUT */}
          <div className="flex gap-4 items-stretch">

            {/* LEFT COLUMN - Main Content */}
            <div className="flex-1 min-w-0 space-y-4">

              {/* ROW 1: CLINICAL PRESENTATION - Compact Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Column - Complaints & HPC */}
                <div className="space-y-3">
                  {/* Presented Complaints */}
                  <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-3">
                    <label className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-2">
                      <FileText className="w-3.5 h-3.5 text-[var(--icon-cyan-text)]" />
                      Presented Complaints
                    </label>
                    <ComplaintInput
                      value={presentedComplaints}
                      onChange={setPresentedComplaints}
                      placeholder="Search or type complaints..."
                      disabled={!canAddEntries}
                    />
                  </div>

                  {/* H.P.C */}
                  <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-3">
                    <label className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-2">
                      <History className="w-3.5 h-3.5 text-[var(--icon-cyan-text)]" />
                      History of Presenting Complaint
                    </label>
                    <textarea
                      value={hpc}
                      onChange={(e) => setHpc(e.target.value)}
                      rows={2}
                      placeholder="History of presenting complaint..."
                      className="w-full px-2 py-1.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-1 focus:ring-[var(--icon-cyan-text)] resize-none text-[var(--text-primary)]"
                      disabled={!canAddEntries}
                    />
                  </div>
                </div>

                {/* Right Column - Physical Exam & ODQ */}
                <div className="space-y-3">
                  {/* Physical Examination */}
                  <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-3">
                    <label className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-2">
                      <Stethoscope className="w-3.5 h-3.5 text-[var(--icon-cyan-text)]" />
                      Physical Examination
                    </label>
                    <textarea
                      value={physicalExam}
                      onChange={(e) => setPhysicalExam(e.target.value)}
                      rows={2}
                      placeholder="Physical examination findings..."
                      className="w-full px-2 py-1.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-1 focus:ring-[var(--icon-cyan-text)] resize-none text-[var(--text-primary)]"
                      disabled={!canAddEntries}
                    />
                  </div>

                  {/* O.D.Q - Compact */}
                  <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-3">
                    <label className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-2">
                      <Clock className="w-3.5 h-3.5 text-[var(--icon-cyan-text)]" />
                      O.D.Q (Onset/Duration/Quality)
                    </label>
                    <ODQInput
                      value={odq}
                      onChange={setOdq}
                      disabled={!canAddEntries}
                    />
                  </div>
                </div>
              </div>

              {/* Save Button - Compact */}
              {canAddEntries && (
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveClinical}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Save Clinical Info
                  </button>
                </div>
              )}

              {/* ROW 2: INVESTIGATIONS - TWO COLUMN LAYOUT */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                
                {/* LEFT COLUMN: Investigations Requested */}
                <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                  <div className="bg-[var(--bg-main)] px-4 py-2.5 border-b border-[var(--border-color)] flex items-center justify-between">
                    <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2 text-sm">
                      <FlaskConical className="w-4 h-4 text-purple-600" />
                      Investigations Requested
                      {labTestsList.length > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-full text-[10px] font-bold">
                          {labTestsList.length}
                        </span>
                      )}
                    </h3>
                    {canAddEntries && (
                      <button
                        onClick={() => setModalType('lab')}
                        className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs hover:bg-purple-700 hover:text-white transition-colors"
                      >
                        <Plus className="w-3 h-3" /> Request Test
                      </button>
                    )}
                  </div>

                  {labTestsList.length === 0 ? (
                    <div className="p-8 text-center">
                      <FlaskConical className="w-8 h-8 text-[var(--text-secondary)] opacity-30 mx-auto mb-2" />
                      <p className="text-sm text-[var(--text-secondary)]">No lab tests requested</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)] w-[40%]">Test Name</th>
                            <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Priority</th>
                            <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Status</th>
                            <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Requested On</th>
                            <th className="px-3 py-2 text-center font-semibold text-[var(--text-secondary)]">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)]">
                          {labTestsList.map((test: any) => {
                            const priorityColor = test.priority === 'stat' ? 'bg-red-100 text-red-700' :
                              test.priority === 'urgent' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700';
                            
                            return (
                              <tr key={test.id} className="hover:bg-[var(--bg-main)] transition-colors">
                                <td className="px-3 py-2">
                                  <div className="font-medium text-[var(--text-primary)] text-sm">
                                    {test.ServiceCatalog?.name || test.name}
                                  </div>
                                  {test.notes && (
                                    <div className="text-[10px] text-[var(--text-secondary)] mt-0.5 line-clamp-1">
                                      {test.notes}
                                    </div>
                                  )}
                                </td>
                                <td className="px-3 py-2">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${priorityColor}`}>
                                    {test.priority || 'routine'}
                                  </span>
                                </td>
                                <td className="px-3 py-2">
                                  {getStatusBadge(test.status)}
                                </td>
                                <td className="px-3 py-2 text-[var(--text-secondary)] whitespace-nowrap">
                                  {test.requestedAt ? new Date(test.requestedAt).toLocaleDateString() : 
                                  test.createdAt ? new Date(test.createdAt).toLocaleDateString() : '—'}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  {canAddEntries && test.status === 'requested' && (
                                    <button
                                      onClick={() => handleDeleteItem('lab', test.id)}
                                      className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                                      title="Cancel Request"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* RIGHT COLUMN: Results of Investigations */}
                <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                  <div className="bg-[var(--bg-main)] px-4 py-2.5 border-b border-[var(--border-color)] flex items-center justify-between">
                    <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Results of Investigations
                      {labTestsList.filter((t: any) => t.status === 'completed').length > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-bold">
                          {labTestsList.filter((t: any) => t.status === 'completed').length}
                        </span>
                      )}
                    </h3>
                    {labTestsList.filter((t: any) => t.status !== 'completed').length > 0 && (
                      <span className="text-[10px] text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full font-medium">
                        {labTestsList.filter((t: any) => t.status !== 'completed').length} pending
                      </span>
                    )}
                  </div>

                  {labTestsList.filter((t: any) => t.status === 'completed').length === 0 ? (
                    <div className="p-8 text-center">
                      <FlaskConical className="w-8 h-8 text-[var(--text-secondary)] opacity-30 mx-auto mb-2" />
                      <p className="text-sm text-[var(--text-secondary)]">No results available yet</p>
                      {labTestsList.filter((t: any) => t.status !== 'completed').length > 0 && (
                        <p className="text-xs text-yellow-600 mt-1">
                          {labTestsList.filter((t: any) => t.status !== 'completed').length} test(s) awaiting results
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)] w-[35%]">Test / Parameter</th>
                            <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Result</th>
                            <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Normal Range</th>
                            <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Flag</th>
                            <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)]">
                          {labTestsList
                            .filter((t: any) => t.status === 'completed')
                            .map((test: any) => {
                              // Parse parameters for multi-parameter tests (FBC, LFT, RFT, etc.)
                              let parameters: any[] = [];
                              let hasParameters = false;
                              
                              if (test.result && typeof test.result === 'object') {
                                if (test.result.parameters && Array.isArray(test.result.parameters)) {
                                  parameters = test.result.parameters;
                                  hasParameters = true;
                                } else if (test.resultParameters && Array.isArray(test.resultParameters)) {
                                  parameters = test.resultParameters;
                                  hasParameters = true;
                                } else if (test.result.values && Array.isArray(test.result.values)) {
                                  parameters = test.result.values;
                                  hasParameters = true;
                                }
                              }
                              
                              if (!hasParameters && test.parameters && Array.isArray(test.parameters)) {
                                parameters = test.parameters;
                                hasParameters = true;
                              }
                              
                              if (hasParameters && parameters.length > 0) {
                                // Multi-parameter test - display each parameter as a row
                                return parameters.map((param: any, idx: number) => {
                                  const paramName = param.name || param.parameter || param.paramName || param.test;
                                  const paramValue = param.value ?? param.result ?? param.val ?? '—';
                                  const normalRange = param.normalRange || param.referenceRange || param.refRange || '—';
                                  
                                  let isAbnormal = false;
                                  let flag = param.flag || param.abnormalFlag;
                                  
                                  if (!flag) {
                                    if (param.abnormal === true) isAbnormal = true;
                                    else if (param.flag === 'H' || param.flag === 'HIGH') isAbnormal = true;
                                    else if (param.flag === 'L' || param.flag === 'LOW') isAbnormal = true;
                                  }
                                  
                                  const displayFlag = flag || (isAbnormal ? (paramValue > (param.highNormal || 0) ? 'H' : 'L') : 'NL');
                                  const flagColor = displayFlag === 'H' || displayFlag === 'HIGH' 
                                    ? 'text-red-600 bg-red-50' 
                                    : displayFlag === 'L' || displayFlag === 'LOW' 
                                      ? 'text-yellow-700 bg-yellow-50' 
                                      : 'text-green-700 bg-green-50';
                                  
                                  return (
                                    <tr key={`${test.id}-${idx}`} className={`hover:bg-[var(--bg-main)] transition-colors ${isAbnormal ? 'bg-red-50/30' : ''}`}>
                                      <td className="px-3 py-2">
                                        {idx === 0 && (
                                          <div className="font-semibold text-[var(--text-primary)] text-xs mb-0.5">
                                            {test.ServiceCatalog?.name || test.name}
                                          </div>
                                        )}
                                        <span className="text-[var(--text-secondary)]">└ {paramName}</span>
                                      </td>
                                      <td className={`px-3 py-2 font-mono ${isAbnormal ? 'text-red-600 font-bold' : 'text-[var(--text-primary)]'}`}>
                                        {paramValue}
                                      </td>
                                      <td className="px-3 py-2 text-[var(--text-secondary)]">{normalRange}</td>
                                      <td className="px-3 py-2">
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${flagColor}`}>
                                          {displayFlag}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2 text-[var(--text-secondary)] whitespace-nowrap">
                                        {idx === 0 && (test.completedAt ? new Date(test.completedAt).toLocaleDateString() : '—')}
                                      </td>
                                    </tr>
                                  );
                                });
                              }
                              
                              // Single result test
                              let resultValue = '—';
                              let isAbnormal = false;
                              let normalRange = test.normalRange || test.referenceRange || '—';
                              let flag = '';
                              
                              if (test.result) {
                                if (typeof test.result === 'object') {
                                  resultValue = test.result.value ?? test.result.result ?? '—';
                                  isAbnormal = test.result.abnormal === true;
                                  flag = test.result.flag || (isAbnormal ? 'ABN' : 'NL');
                                  normalRange = test.result.normalRange || normalRange;
                                } else {
                                  resultValue = test.result;
                                  isAbnormal = test.abnormal === true;
                                }
                              }
                              
                              const lowerResult = String(resultValue).toLowerCase();
                              if (lowerResult === 'positive') {
                                isAbnormal = true;
                                flag = 'POSITIVE';
                              } else if (lowerResult === 'negative') {
                                isAbnormal = false;
                                flag = 'NEGATIVE';
                              }
                              
                              const flagColor = flag === 'POSITIVE' 
                                ? 'text-red-600 bg-red-50'
                                : flag === 'NEGATIVE'
                                  ? 'text-green-700 bg-green-50'
                                  : isAbnormal
                                    ? 'text-red-600 bg-red-50'
                                    : 'text-green-700 bg-green-50';
                              
                              return (
                                <tr key={test.id} className={`hover:bg-[var(--bg-main)] transition-colors ${isAbnormal ? 'bg-red-50/30' : ''}`}>
                                  <td className="px-3 py-2 font-semibold text-[var(--text-primary)]">
                                    {test.ServiceCatalog?.name || test.name}
                                  </td>
                                  <td className={`px-3 py-2 font-mono ${isAbnormal ? 'text-red-600 font-bold' : 'text-[var(--text-primary)]'}`}>
                                    {resultValue}
                                  </td>
                                  <td className="px-3 py-2 text-[var(--text-secondary)]">{normalRange}</td>
                                  <td className="px-3 py-2">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${flagColor}`}>
                                      {flag === 'POSITIVE' ? 'POSITIVE' : flag === 'NEGATIVE' ? 'NEGATIVE' : isAbnormal ? 'ABN' : 'NL'}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-[var(--text-secondary)] whitespace-nowrap">
                                    {test.completedAt ? new Date(test.completedAt).toLocaleDateString() : '—'}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>

                      {/* Comments section */}
                      {labTestsList
                        .filter((t: any) => t.status === 'completed' && (t.comments || t.notes))
                        .map((test: any) => (
                          <div key={`cmt-${test.id}`} className="mx-3 mb-3 mt-2 p-2 bg-blue-50 rounded-lg border border-blue-100">
                            <span className="text-[10px] font-semibold text-blue-700">
                              {test.ServiceCatalog?.name || test.name} — Comment: 
                            </span>
                            <span className="text-[10px] text-blue-600 ml-1">{test.comments || test.notes}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ROW 3: DIAGNOSIS & PROCEDURES */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Diagnosis Table - Updated with diagnosis types */}
              <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                <PanelHeader
                  icon={<Stethoscope className="w-4 h-4 text-[var(--icon-cyan-text)]" />}
                  title={`Diagnosis (ICD-10)`}
                  action={canAddEntries && (
                    <button onClick={() => setModalType('diagnosis')} className="flex items-center gap-1 px-2 py-1 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded text-xs hover:bg-[var(--icon-cyan-text)] hover:text-white transition-colors">
                      <Plus className="w-3 h-3" /> Add
                    </button>
                  )}
                />
                {diagnosesList.length === 0 ? (
                  <div className="p-8 text-center">
                    <Stethoscope className="w-8 h-8 text-[var(--text-secondary)] opacity-30 mx-auto mb-2" />
                    <p className="text-sm text-[var(--text-secondary)]">No diagnoses added</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[260px] overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)] w-[40%]">Diagnosis</th>
                          <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">ICD-10</th>
                          <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Type</th>
                          <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Added By</th>
                          <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Date</th>
                          <th className="px-3 py-2 text-center font-semibold text-[var(--text-secondary)]">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-color)]">
                        {diagnosesList.map((item: any) => {
                          const diagnosisType = item.diagnosisType || (item.primary ? 'primary' : 'additional');
                          const typeConfig: Record<string, { label: string; bg: string; text: string; icon: string }> = {
                            provisional: { label: 'Provisional', bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '🟡' },
                            primary: { label: 'Primary', bg: 'bg-green-100', text: 'text-green-800', icon: '🟢' },
                            additional: { label: 'Additional', bg: 'bg-blue-100', text: 'text-blue-800', icon: '🔵' },
                          };
                          const config = typeConfig[diagnosisType] || typeConfig.additional;
                          return (
                            <tr key={item.id} className="hover:bg-[var(--bg-main)] transition-colors">
                              <td className="px-3 py-2 font-medium text-[var(--text-primary)]">
                                {item.Diagnosis?.name}
                                {item.notes && (<div className="text-[10px] text-[var(--text-secondary)] mt-0.5">{item.notes}</div>)}
                              </td>
                              <td className="px-3 py-2 font-mono text-[var(--text-secondary)]">{item.Diagnosis?.icdCode || '—'}</td>
                              <td className="px-3 py-2">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${config.bg} ${config.text}`}>
                                  {config.icon} {config.label}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-[var(--text-secondary)]">{item.createdBy?.fullName || 'Unknown'}</td>
                              <td className="px-3 py-2 text-[var(--text-secondary)] whitespace-nowrap">
                                {new Date(item.createdAt).toLocaleDateString()}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {canAddEntries && (
                                  <button onClick={() => handleDeleteItem('diagnosis', item.id)} className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Procedures - Table View */}
              <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                <div className="bg-[var(--bg-main)] px-4 py-2.5 border-b border-[var(--border-color)] flex items-center justify-between">
                  <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2 text-sm">
                    <Scissors className="w-4 h-4 text-orange-600" />
                    Procedures & Scheduling
                    {proceduresList.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded-full text-[10px] font-bold">
                        {proceduresList.length}
                      </span>
                    )}
                  </h3>
                  {canAddEntries && (
                    <button
                      onClick={() => setModalType('procedure')}
                      className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs hover:bg-orange-700 hover:text-white transition-colors"
                    >
                      <Plus className="w-3 h-3" /> Schedule
                    </button>
                  )}
                </div>
                
                {proceduresList.length === 0 ? (
                  <div className="p-8 text-center">
                    <Scissors className="w-8 h-8 text-[var(--text-secondary)] opacity-30 mx-auto mb-2" />
                    <p className="text-sm text-[var(--text-secondary)]">No procedures scheduled</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[260px] overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)] w-[30%]">Procedure</th>
                          <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Scheduled Date</th>
                          <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Status</th>
                          <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Notes</th>
                          <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Scheduled By</th>
                          <th className="px-3 py-2 text-center font-semibold text-[var(--text-secondary)]">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-color)]">
                        {proceduresList.map((proc: any) => (
                          <tr key={proc.id} className="hover:bg-[var(--bg-main)] transition-colors">
                            <td className="px-3 py-2 font-medium text-[var(--text-primary)]">
                              {proc.ServiceCatalog?.name || proc.name}
                            </td>
                            <td className="px-3 py-2 text-[var(--text-secondary)] whitespace-nowrap">
                              {proc.scheduledDate ? new Date(proc.scheduledDate).toLocaleString() : '—'}
                            </td>
                            <td className="px-3 py-2">
                              {getStatusBadge(proc.status)}
                            </td>
                            <td className="px-3 py-2 text-[var(--text-secondary)] max-w-[150px] truncate">
                              {proc.notes || '—'}
                            </td>
                            <td className="px-3 py-2 text-[var(--text-secondary)]">
                              {proc.requestedBy || currentUser?.fullName || 'Unknown'}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {canAddEntries && proc.status === 'scheduled' && (
                                <button
                                  onClick={() => handleDeleteItem('procedure', proc.id)}
                                  className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              </div>

                {/* Medications - Two Tables (Prescribed shows all, Dispensed shows history) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* All Prescribed Medications (including dispensed ones) */}
                  <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                    <div className="bg-[var(--bg-main)] px-4 py-2.5 border-b border-[var(--border-color)] flex items-center justify-between">
                      <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2 text-sm">
                        <Pill className="w-4 h-4 text-green-600" />
                        Prescribed Medications
                        {medicationsList.length > 0 && (
                          <span className="ml-1 px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-bold">
                            {medicationsList.length}
                          </span>
                        )}
                      </h3>
                      {canAddEntries && (
                        <button
                          onClick={() => setModalType('medication')}
                          className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-700 hover:text-white transition-colors"
                        >
                          <Plus className="w-3 h-3" /> Prescribe
                        </button>
                      )}
                    </div>
                    
                    {medicationsList.length === 0 ? (
                      <div className="p-8 text-center">
                        <Pill className="w-8 h-8 text-[var(--text-secondary)] opacity-30 mx-auto mb-2" />
                        <p className="text-sm text-[var(--text-secondary)]">No medications prescribed</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead className="sticky top-0 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Medication</th>
                              <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Dosage</th>
                              <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Frequency</th>
                              <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Duration</th>
                              <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Status</th>
                              <th className="px-3 py-2 text-center font-semibold text-[var(--text-secondary)]">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border-color)]">
                            {/* Show ALL medications - both prescribed and dispensed */}
                            {medicationsList.map((med: any) => (
                              <tr key={med.id} className={`hover:bg-[var(--bg-main)] transition-colors ${med.status === 'dispensed' ? 'bg-green-50/30 dark:bg-green-950/10' : ''}`}>
                                <td className="px-3 py-2 font-medium text-[var(--text-primary)]">{med.name}</td>
                                <td className="px-3 py-2 text-[var(--text-secondary)]">{med.dosage || '—'}</td>
                                <td className="px-3 py-2 text-[var(--text-secondary)]">{med.frequency || '—'}</td>
                                <td className="px-3 py-2 text-[var(--text-secondary)]">{med.duration || '—'}</td>
                                <td className="px-3 py-2">{getStatusBadge(med.status)}</td>
                                <td className="px-3 py-2 text-center">
                                  {canAddEntries && med.status === 'prescribed' && (
                                    <button
                                      onClick={() => handleDeleteItem('medication', med.id)}
                                      className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                                      title="Cancel Prescription"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {med.status === 'dispensed' && (
                                    <span className="text-[10px] text-green-600">✓</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Dispensed Medications History - Shows only dispensed items with details */}
                  <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                    <div className="bg-[var(--bg-main)] px-4 py-2.5 border-b border-[var(--border-color)]">
                      <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-blue-600" />
                        Dispensed History
                        {dispensedMeds.length > 0 && (
                          <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold">
                            {dispensedMeds.length}
                          </span>
                        )}
                      </h3>
                    </div>
                    
                    {dispensedMeds.length === 0 ? (
                      <div className="p-8 text-center">
                        <CheckCircle className="w-8 h-8 text-[var(--text-secondary)] opacity-30 mx-auto mb-2" />
                        <p className="text-sm text-[var(--text-secondary)]">No medications dispensed yet</p>
                        {medicationsList.filter(m => m.status === 'prescribed').length > 0 && (
                          <p className="text-xs text-yellow-600 mt-1">
                            {medicationsList.filter(m => m.status === 'prescribed').length} prescription(s) awaiting dispensing
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead className="sticky top-0 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Medication</th>
                              <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Quantity</th>
                              <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Unit Cost</th>
                              <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Total</th>
                              <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Dispensed Date</th>
                              <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Dispensed By</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border-color)]">
                            {dispensedMeds.map((med: any) => (
                              <tr key={med.id} className="hover:bg-[var(--bg-main)] transition-colors">
                                <td className="px-3 py-2 font-medium text-[var(--text-primary)]">{med.name}</td>
                                <td className="px-3 py-2 text-[var(--text-secondary)]">{med.quantity}</td>
                                <td className="px-3 py-2 text-[var(--text-secondary)]">GHS {((med.unitCost || 0)).toFixed(2)}</td>
                                <td className="px-3 py-2 text-[var(--text-secondary)]">GHS {((med.unitCost || 0) * med.quantity).toFixed(2)}</td>
                                <td className="px-3 py-2 text-[var(--text-secondary)] whitespace-nowrap">
                                  {med.dispensedAt ? new Date(med.dispensedAt).toLocaleString() : '—'}
                                </td>
                                <td className="px-3 py-2 text-[var(--text-secondary)]">
                                  {med.dispensedBy?.fullName || '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {/* Scans - Table View */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Requested Scans */}
              <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                <div className="bg-[var(--bg-main)] px-4 py-2.5 border-b border-[var(--border-color)] flex items-center justify-between">
                  <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2 text-sm">
                    <Scan className="w-4 h-4 text-indigo-600" />
                    Scans Requested
                    {requestedScans.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-[10px] font-bold">
                        {requestedScans.length}
                      </span>
                    )}
                  </h3>
                  {canAddEntries && (
                    <button
                      onClick={() => setModalType('scan')}
                      className="flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs hover:bg-indigo-700 hover:text-white transition-colors"
                    >
                      <Plus className="w-3 h-3" /> Request Scan
                    </button>
                  )}
                </div>
                
                {requestedScans.length === 0 ? (
                  <div className="p-8 text-center">
                    <Scan className="w-8 h-8 text-[var(--text-secondary)] opacity-30 mx-auto mb-2" />
                    <p className="text-sm text-[var(--text-secondary)]">No scans requested</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)] w-[35%]">Scan Type</th>
                          <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Body Part</th>
                          <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Priority</th>
                          <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Status</th>
                          <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Requested On</th>
                          <th className="px-3 py-2 text-center font-semibold text-[var(--text-secondary)]">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-color)]">
                        {requestedScans.map((scan: any) => (
                          <tr key={scan.id} className="hover:bg-[var(--bg-main)] transition-colors">
                            <td className="px-3 py-2 font-medium text-[var(--text-primary)]">
                              {scan.scanType || scan.ServiceCatalog?.name}
                            </td>
                            <td className="px-3 py-2 text-[var(--text-secondary)]">{scan.bodyPart || '—'}</td>
                            <td className="px-3 py-2">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                scan.priority === 'urgent' ? 'bg-orange-100 text-orange-700' :
                                scan.priority === 'stat' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {scan.priority || 'routine'}
                              </span>
                            </td>
                            <td className="px-3 py-2">{getStatusBadge(scan.status)}</td>
                            <td className="px-3 py-2 text-[var(--text-secondary)] whitespace-nowrap">
                              {new Date(scan.requestedAt).toLocaleDateString()}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {canAddEntries && (scan.status === 'requested' || scan.status === 'scheduled') && (
                                <button
                                  onClick={() => handleDeleteItem('scan', scan.id)}
                                  className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Scan Results - Table View */}
              <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                <div className="bg-[var(--bg-main)] px-4 py-2.5 border-b border-[var(--border-color)]">
                  <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Scan Results
                    {completedScans.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-bold">
                        {completedScans.length}
                      </span>
                    )}
                  </h3>
                </div>
                
                {completedScans.length === 0 && requestedScans.length === 0 ? (
                  <div className="p-8 text-center">
                    <Microscope className="w-8 h-8 text-[var(--text-secondary)] opacity-30 mx-auto mb-2" />
                    <p className="text-sm text-[var(--text-secondary)]">No scan results available</p>
                  </div>
                ) : (
                  <>

                    {/* Completed Scans Table */}
                    {completedScans.length > 0 && (
                      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead className="sticky top-0 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)] w-[30%]">Scan Type</th>
                              <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Findings</th>
                              <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Impression</th>
                              <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Completed</th>
                              <th className="px-3 py-2 text-center font-semibold text-[var(--text-secondary)]">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border-color)]">
                            {completedScans.map((scan: any) => (
                              <tr key={scan.id} className="hover:bg-[var(--bg-main)] transition-colors">
                                <td className="px-3 py-2 font-medium text-[var(--text-primary)]">
                                  {scan.scanType || scan.ServiceCatalog?.name}
                                  {scan.bodyPart && <div className="text-[10px] text-[var(--text-secondary)]">{scan.bodyPart}</div>}
                                </td>
                                <td className="px-3 py-2 text-[var(--text-secondary)] max-w-[200px] truncate">
                                  {scan.findings || '—'}
                                </td>
                                <td className="px-3 py-2 text-[var(--text-secondary)] max-w-[200px] truncate">
                                  {scan.impression || '—'}
                                </td>
                                <td className="px-3 py-2 text-[var(--text-secondary)] whitespace-nowrap">
                                  {scan.completedAt ? new Date(scan.completedAt).toLocaleDateString() : '—'}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  {canAddEntries && (
                                    <button
                                      onClick={() => setScanResultFor(scan)}
                                      className="p-1 text-blue-500 hover:bg-blue-50 rounded transition-colors"
                                      title="Edit Results"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

              {/* GENERAL INFORMATION */}
              <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)]">
                <div className="bg-[var(--bg-main)] px-4 py-2.5 border-b border-[var(--border-color)]">
                  <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                    General Information
                  </h3>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                        Follow-up Date
                      </label>
                      <input
                        type="datetime-local"
                        value={followUpDate}
                        onChange={(e) => setFollowUpDate(e.target.value)}
                        className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)]"
                        disabled={!canAddEntries}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                        Referred To/From
                      </label>
                      <input
                        type="text"
                        value={currentAttendance?.referringFacility || ''}
                        readOnly
                        className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-secondary)]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                        Admission Status
                      </label>
                      <div className="px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-secondary)]">
                        {currentAttendance?.Admission
                          ? `Admitted (${currentAttendance.Admission.admissionNumber})`
                          : 'Not Admitted'}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                        Last Modified By
                      </label>
                      <div className="px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-secondary)]">
                        {currentAttendance?.updatedBy?.fullName || currentAttendance?.createdBy?.fullName ||currentUser?.fullName || 'Unknown'} •{' '}
                        {new Date(currentAttendance?.updatedAt || currentAttendance?.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT SIDEBAR: Physician Notes + Treatment Plan */}
            <div className="w-72 xl:w-80 flex-shrink-0 sticky top-6 self-stretch flex flex-col" style={{ minHeight: 0 }}>
              <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden flex flex-col h-full">

                {/* Physician Notes */}
                <div className="bg-[var(--bg-main)] px-4 py-2.5 border-b border-[var(--border-color)] flex-shrink-0">
                  <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2 text-sm">
                    <ClipboardList className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                    Physician Notes
                  </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[var(--bg-main)]" style={{ minHeight: '120px' }}>
                  {(currentAttendance as any)?.physicianNotes?.length > 0 ? (
                    (currentAttendance as any).physicianNotes.map((note: any, i: number) => (
                      <div key={i} className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border-color)]">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold text-[var(--icon-cyan-text)]">
                            {note.author || note.createdBy?.fullName || 'Doctor'}
                          </span>
                          <span className="text-[10px] text-[var(--text-tertiary)]">
                            {note.createdAt ? new Date(note.createdAt).toLocaleString() : ''}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
                          {note.content || note.text}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="space-y-3">
                      {presentedComplaints || hpc || odq || physicalExam ? (
                        <div className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border-color)]">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-semibold text-[var(--icon-cyan-text)]">
                              {currentAttendance?.createdBy?.fullName || 'Physician'}
                            </span>
                            <span className="text-[10px] text-[var(--text-tertiary)]">
                              {new Date(currentAttendance?.createdAt).toLocaleString()}
                            </span>
                          </div>
                          {presentedComplaints && (
                            <p className="text-xs text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed mb-1">
                              <span className="font-semibold">PC–</span>{presentedComplaints}
                            </p>
                          )}
                          {hpc && (
                            <p className="text-xs text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed mb-1">
                              <span className="font-semibold">HPC–</span>{hpc}
                            </p>
                          )}
                          {odq && (
                            <p className="text-xs text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed mb-1">
                              <span className="font-semibold">ODQ–</span>{odq}
                            </p>
                          )}
                          {physicalExam && (
                            <p className="text-xs text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
                              <span className="font-semibold">O/E–</span>{physicalExam}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="text-center text-[var(--text-tertiary)] text-xs py-6">
                          No physician notes recorded
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="flex items-center gap-2 px-4 py-2 border-t border-b border-[var(--border-color)] bg-[var(--bg-main)] flex-shrink-0">
                  <div className="flex-1 h-px bg-[var(--border-color)]" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                    <FileText className="w-3 h-3" />
                    Treatment Plan
                  </span>
                  <div className="flex-1 h-px bg-[var(--border-color)]" />
                </div>

                {/* Treatment Plan Display */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[var(--bg-main)]" style={{ minHeight: '80px' }}>
                  {(currentAttendance as any)?.treatmentNotes?.length > 0 ? (
                    (currentAttendance as any).treatmentNotes.map((note: any, i: number) => (
                      <div key={i} className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border-color)]">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold text-[var(--icon-cyan-text)]">
                            {note.author || note.createdBy?.fullName || 'Doctor'}
                          </span>
                          <span className="text-[10px] text-[var(--text-tertiary)]">
                            {note.createdAt ? new Date(note.createdAt).toLocaleString() : ''}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
                          {note.content || note.text}
                        </p>
                      </div>
                    ))
                  ) : treatmentPlan ? (
                    <div className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border-color)]">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-[var(--icon-cyan-text)]">
                          {currentAttendance?.createdBy?.fullName || 'Physician'}
                        </span>
                        <span className="text-[10px] text-[var(--text-tertiary)]">
                          {new Date(currentAttendance?.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
                        {treatmentPlan}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center text-[var(--text-tertiary)] text-xs py-4">
                      No treatment plan recorded
                    </div>
                  )}
                </div>

                {/* Treatment Plan Input */}
                {canAddEntries && (
                  <div className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-card)] flex-shrink-0">
                    <textarea
                      value={treatmentPlan}
                      onChange={(e) => setTreatmentPlan(e.target.value)}
                      rows={3}
                      placeholder="Treatment plan, follow-up instructions..."
                      className="w-full px-2 py-1.5 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] text-xs resize-none text-[var(--text-primary)]"
                    />
                    <button
                      onClick={handleSaveClinical}
                      className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-xs font-medium"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Save Treatment Plan
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : selectedPatientId && !selectedAttendanceId ? (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-600 dark:text-yellow-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-400 mb-2">No Attendance Selected</h3>
          <p className="text-yellow-700 dark:text-yellow-500">Please select an existing attendance to view or add medical entries.</p>
        </div>
      ) : null}

      {/* Modals */}
      <DiagnosisModal
        isOpen={modalType === 'diagnosis'}
        onClose={() => setModalType(null)}
        onSuccess={() => {
          setModalType(null);
          if (selectedAttendanceId) {
            getAttendance(selectedAttendanceId);
            calculateBill(selectedAttendanceId);
          }
        }}
        attendanceId={selectedAttendanceId}
        diagnoses={diagnoses}
        canAdd={canAddEntries}
        userId={currentUser?.id}
        userName={currentUser?.fullName}
      />
      <LabTestModal
        isOpen={modalType === 'lab'}
        onClose={() => setModalType(null)}
        onSuccess={() => {
          setModalType(null);
          if (selectedAttendanceId) {
            getAttendance(selectedAttendanceId);
            calculateBill(selectedAttendanceId);
          }
        }}
        attendanceId={selectedAttendanceId}
        labTests={labTestTemplates}
        canAdd={canAddEntries}
        userId={currentUser?.id}
        userName={currentUser?.fullName}
      />
      <ProcedureModal
        isOpen={modalType === 'procedure'}
        onClose={() => setModalType(null)}
        onSuccess={() => {
          setModalType(null);
          if (selectedAttendanceId) {
            getAttendance(selectedAttendanceId);
            calculateBill(selectedAttendanceId);
          }
        }}
        attendanceId={selectedAttendanceId}
        procedures={procedureTemplates}
        canAdd={canAddEntries}
        userId={currentUser?.id}
        userName={currentUser?.fullName}
      />
      <MedicationModal
        isOpen={modalType === 'medication'}
        onClose={() => setModalType(null)}
        onSuccess={() => {
          setModalType(null);
          if (selectedAttendanceId) {
            getAttendance(selectedAttendanceId);
            calculateBill(selectedAttendanceId);
          }
        }}
        attendanceId={selectedAttendanceId}
        stockItems={stockItems}
        canAdd={canAddEntries}
        userId={currentUser?.id}
        userName={currentUser?.fullName}
      />
      <ScanModal
        isOpen={modalType === 'scan'}
        onClose={() => setModalType(null)}
        onSuccess={() => {
          setModalType(null);
          if (selectedAttendanceId) {
            getAttendance(selectedAttendanceId);
            calculateBill(selectedAttendanceId);
          }
        }}
        attendanceId={selectedAttendanceId}
        scans={scanTemplates}
        canAdd={canAddEntries}
        userId={currentUser?.id}
        userName={currentUser?.fullName}
      />

      {/* Scan Result Form Modal */}
      {scanResultFor && (
        <ScanResultForm
          scan={scanResultFor}
          onSaveResult={handleSaveScanResult}
          onClose={() => setScanResultFor(null)}
          saving={savingResult}
        />
      )}
    </div>
  );
}