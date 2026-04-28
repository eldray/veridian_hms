// src/pages/PatientDetails.tsx - COMPLETE UPDATED VERSION
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePatientStore } from '../store/patientStore';
import { useAttendanceStore } from '../store/attendanceStore';
import { useAuthStore } from '../store/authStore';
import { useInsuranceStore } from '../store/insuranceStore';
import { useToast } from '../store/toastStore';
import NewAttendanceModal from '../components/NewAttendanceModal';
import { 
  ArrowLeft, Edit, Calendar, Users, Pill, FlaskConical, Scissors, 
  DollarSign, RefreshCw, AlertCircle, Loader, Trash2, Eye, Clock, 
  CheckCircle, XCircle, Activity, File, Download, Printer, ChevronRight,
  Stethoscope, Syringe, Microscope, Heart
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Attendance, Diagnosis, LabTest, Medication, Procedure, Scan, Vitals } from '../types';
import { useDocumentStore } from '../store/documentStore';
import {  FileText as FileIcon, FileCheck, Receipt, ClipboardList, Stethoscope as StethIcon } from 'lucide-react';
import type { GeneratedDocument } from '../types/documents';

export default function PatientDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const { currentPatient, fetchPatient, deletePatient } = usePatientStore();
  const { attendances, getAttendances } = useAttendanceStore();
  const { hasRole } = useAuthStore();
  const { providers: insuranceProviders, getInsuranceProviders } = useInsuranceStore();

  const [activeTab, setActiveTab] = useState<'profile' | 'documents' | 'attendances' | 'medical-records'>('attendances');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState<Attendance | null>(null);
  const [showMedicalDetails, setShowMedicalDetails] = useState(false);
  const [stats, setStats] = useState({
    totalVisits: 0,
    completedVisits: 0,
    pendingVisits: 0,
    totalMedications: 0,
    totalLabTests: 0
  });
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Extract patient data properly from nested response
  const patient = useMemo(() => {
    if (!currentPatient) return null;
    
    if (currentPatient.data) {
      return currentPatient.data;
    } else if (currentPatient.success && currentPatient.data) {
      return currentPatient.data;
    } else {
      return currentPatient;
    }
  }, [currentPatient]);

  // Get full name from surname + otherNames
  const getPatientFullName = (patient: any) => {
    return `${patient.surname || ''} ${patient.otherNames || ''}`.trim();
  };

  // Filter patient attendances
  const patientAttendances = useMemo(() => {
    if (!patient || !attendances.length) return [];
    
    const patientId = patient.id;
    console.log('🔍 Filtering attendances for patient:', patientId);
    console.log('📊 Total attendances to filter:', attendances.length);

    const filtered = attendances.filter(attendance => {
      if (attendance.patientId === patientId) return true;
      if (attendance.patient && attendance.patient.id === patientId) return true;
      return false;
    });

    console.log('✅ Found attendances for patient:', filtered.length);
    return filtered;
  }, [attendances, patient]);

  // Load data
  const loadData = async () => {
    if (!id) {
      toastError('Error', 'No patient ID provided');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setRefreshing(true);
    try {
      console.log('🔄 Loading patient details for ID:', id);
      await fetchPatient(id);
      
      if (currentPatient) {
        await Promise.all([
          getAttendances({ patientId: id }),
          getInsuranceProviders()
        ]);
      }
      console.log('✅ Patient details loaded successfully');
    } catch (err: any) {
      console.error('❌ Failed to load patient details:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Could not load patient data';
      toastError('Load failed', errorMsg);
      if (err.response?.status === 404) {
        navigate('/dashboard/patients');
      }
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id, refreshTrigger]);

  // Recalculate stats when attendances change
  useEffect(() => {
    const totalVisits = patientAttendances.length;
    const completedVisits = patientAttendances.filter(a => a.status === 'completed').length;
    const pendingVisits = patientAttendances.filter(a => ['pending', 'active', 'in-progress'].includes(a.status)).length;
    const totalMedications = patientAttendances.reduce((sum, att) => sum + (att.medications?.length || 0), 0);
    const totalLabTests = patientAttendances.reduce((sum, att) => sum + (att.labTests?.length || 0), 0);

    setStats({ 
      totalVisits, 
      completedVisits, 
      pendingVisits, 
      totalMedications, 
      totalLabTests 
    });
  }, [patientAttendances]);

  const handleAttendanceSuccess = async () => {
    setShowAttendanceModal(false);
    try {
      await getAttendances();
      setActiveTab('attendances');
      setRefreshTrigger(prev => prev + 1);
      success('Check-in complete', 'New visit created');
    } catch {
      toastError('Refresh failed', 'Could not update visit list');
    }
  };

  const handleAttendanceClose = () => {
    setShowAttendanceModal(false);
  };

  const handleRefresh = () => {
    loadData();
  };

  const handleEdit = () => {
    navigate(`/dashboard/patients/register?edit=true&id=${patient?.id}`);
  };

  const handleNewAttendance = () => {
    setShowAttendanceModal(true);
  };

  const handleDeletePatient = async () => {
    if (!patient?.id) return;
    
    try {
      await deletePatient(patient.id);
      success('Patient Deleted', 'Patient record has been removed');
      navigate('/dashboard/patients');
    } catch (err: any) {
      toastError('Delete Failed', err.message || 'Failed to delete patient');
    }
  };

  const viewMedicalDetails = (attendance: Attendance) => {
    setSelectedAttendance(attendance);
    setShowMedicalDetails(true);
  };

  // UI Helper Functions
  const getGenderColor = (gender: string) => {
    switch (gender?.toLowerCase()) {
      case 'male': return 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]';
      case 'female': return 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]';
      default: return 'bg-[var(--bg-main)] text-[var(--text-secondary)]';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]"><CheckCircle className="w-3 h-3" /> Completed</span>;
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]"><Clock className="w-3 h-3" /> Pending</span>;
      case 'admitted':
        return <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]"><Activity className="w-3 h-3" /> Admitted</span>;
      case 'discharged':
        return <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]"><CheckCircle className="w-3 h-3" /> Discharged</span>;
      case 'cancelled':
        return <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]"><XCircle className="w-3 h-3" /> Cancelled</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-[var(--bg-main)] text-[var(--text-secondary)]">{status}</span>;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return 'No date';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      if (!dateString) return 'No date';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const canEdit = hasRole(['admin', 'doctor', 'nurse']);
  const canCreateAttendance = hasRole(['admin', 'doctor', 'nurse']);
  const canDelete = hasRole(['admin']);

  
// Add to your component (inside the component function, before return)
const { 
  documents, 
  getDocumentsByEntity, 
  downloadDocument,
  isLoading: docsLoading 
} = useDocumentStore();

// Add state for documents tab
const [documentsByAttendance, setDocumentsByAttendance] = useState<Map<string, GeneratedDocument[]>>(new Map());
const [documentsLoading, setDocumentsLoading] = useState(false);

// Load documents for the patient
const loadPatientDocuments = async () => {
  if (!patient?.id) return;
  
  setDocumentsLoading(true);
  try {
    const docs = await getDocumentsByEntity('Patient', patient.id);
    
    // Group documents by attendance
    const grouped = new Map<string, GeneratedDocument[]>();
    for (const doc of docs) {
      const key = doc.entityId;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(doc);
    }
    setDocumentsByAttendance(grouped);
  } catch (error) {
    console.error('Failed to load documents:', error);
  } finally {
    setDocumentsLoading(false);
  }
};

// Load documents when switching to documents tab
useEffect(() => {
  if (activeTab === 'documents' && patient?.id) {
    loadPatientDocuments();
  }
}, [activeTab, patient?.id]);

// Helper to get document icon by template type
const getDocumentIcon = (templateType: string) => {
  switch (templateType) {
    case 'receipt':
      return <Receipt className="w-4 h-4" />;
    case 'prescription':
      return <ClipboardList className="w-4 h-4" />;
    case 'lab_result':
      return <FlaskConical className="w-4 h-4" />;
    case 'discharge_summary':
      return <FileCheck className="w-4 h-4" />;
    case 'referral_letter':
      return <StethIcon className="w-4 h-4" />;
    default:
      return <FileIcon className="w-4 h-4" />;
  }
};

// Helper to get document type label
const getDocumentTypeLabel = (templateType: string): string => {
  const labels: Record<string, string> = {
    'receipt': 'Payment Receipt',
    'prescription': 'Prescription',
    'lab_result': 'Lab Result',
    'discharge_summary': 'Discharge Summary',
    'referral_letter': 'Referral Letter',
    'admission_letter': 'Admission Letter',
    'scan_report': 'Scan Report',
    'nhia_claim_form': 'NHIS Claim Form'
  };
  return labels[templateType] || 'Document';
};

// Helper to download document
const handleDownloadDocument = async (doc: GeneratedDocument) => {
  try {
    const blob = await downloadDocument(doc.id);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${doc.template?.code || 'document'}-${doc.entityId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Download failed:', error);
    toastError('Download Failed', 'Could not download document');
  }
};

  // Loading state
  if (isLoading && !refreshing) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
        <div className="text-center bg-[var(--bg-card)] rounded-2xl shadow-lg border border-[var(--border-color)] p-10 max-w-md w-full">
          <Loader className="w-14 h-14 text-[var(--icon-cyan-text)] animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Loading Patient...</h2>
          <p className="text-[var(--text-secondary)]">Please wait while we load patient details.</p>
        </div>
      </div>
    );
  }

  // Error state
  if (!patient) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
        <div className="text-center bg-[var(--bg-card)] rounded-xl shadow-sm border border-[var(--border-color)] p-8 max-w-md w-full">
          <AlertCircle className="w-16 h-16 text-[var(--icon-red-text)] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Patient Not Found</h2>
          <p className="text-[var(--text-secondary)] mb-6 text-sm">
            The patient record does not exist or has been removed.
          </p>
          <button
            onClick={() => navigate('/dashboard/patients')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all duration-200 font-semibold text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Patients
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: Users, count: 0 },
    { id: 'attendances' as const, label: 'Visits', icon: Calendar, count: patientAttendances.length },
    { id: 'medical-records' as const, label: 'Medical', icon: Stethoscope, count: stats.totalMedications + stats.totalLabTests },
    { id: 'documents' as const, label: 'Documents', icon: File, count: 0 },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard/patients')}
            className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors bg-[var(--bg-card)] hover:bg-[var(--bg-main)] rounded-lg px-4 py-2 shadow-sm border border-[var(--border-color)]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Patient Details</h1>
            <p className="text-sm text-[var(--text-secondary)]">Record #{patient.folderNumber || patient.id}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all disabled:opacity-50 text-sm text-[var(--text-primary)]"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>

          {canCreateAttendance && (
            <button
              onClick={handleNewAttendance}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] rounded-lg hover:bg-[var(--icon-green-text)] hover:text-white transition-all duration-200 font-semibold text-sm"
            >
              <Calendar className="w-4 h-4" />
              New Visit
            </button>
          )}

          {canEdit && (
            <button
              onClick={handleEdit}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all duration-200 font-semibold text-sm"
            >
              <Edit className="w-4 h-4" />
              Edit Patient
            </button>
          )}

          {canDelete && (
            <button
              onClick={() => setDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] rounded-lg hover:bg-[var(--icon-red-text)] hover:text-white transition-all duration-200 font-semibold text-sm"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Delete Patient</h3>
                <p className="text-sm text-gray-600">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-gray-700 mb-4">
              Are you sure you want to delete <strong>{getPatientFullName(patient)}</strong>? 
              All patient records and visits will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDeletePatient}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Delete Patient
              </button>
              <button
                onClick={() => setDeleteConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Patient Header Card */}
      <div className="bg-[var(--bg-card)] rounded-xl p-6 shadow-sm border border-[var(--border-color)]">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-[var(--icon-cyan-bg)] rounded-xl flex items-center justify-center">
              <Users className="w-8 h-8 text-[var(--icon-cyan-text)]" />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h1 className="text-2xl font-bold text-[var(--text-primary)] leading-tight">
                    {getPatientFullName(patient)}
                  </h1>
                  <p className="text-sm text-[var(--text-secondary)] bg-[var(--bg-main)] px-3 py-1.5 rounded border mt-2 inline-block">
                    {patient.folderNumber || 'No Folder'} • {patient.ageDisplay || `${patient.age || 'N/A'} years`}
                  </p>
                </div>
                <span className={`px-3 py-1.5 text-sm font-semibold rounded-full ${getGenderColor(patient.gender)}`}>
                  {patient.gender?.charAt(0).toUpperCase() + patient.gender?.slice(1) || 'Unknown'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium">DOB: {formatDate(patient.dateOfBirth)}</span>
                </div>
                <div className="flex items-center gap-2 text-[var(--text-primary)]">
                  <span className="font-semibold">Contact:</span> {patient.contact || 'N/A'}
                </div>
                <div className="flex items-center gap-2 text-[var(--text-primary)]">
                  <span className="font-semibold">Payment:</span> {patient.paymentMode || 'Cash'}
                </div>
                <div className="flex items-center gap-2 text-[var(--text-primary)]">
                  <span className="font-semibold">Registered:</span> {formatDate(patient.createdAt)}
                </div>
              </div>

              {patient.address && (
                <div className="mt-3 pt-3 border-t border-[var(--border-color)]">
                  <p className="text-[var(--text-primary)] text-sm">
                    <span className="font-semibold">Address:</span> {patient.address}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-[var(--bg-card)] rounded-xl p-4 text-center border border-[var(--border-color)]">
          <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.totalVisits}</p>
          <p className="text-xs text-[var(--text-secondary)]">Total Visits</p>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl p-4 text-center border border-[var(--border-color)]">
          <p className="text-2xl font-bold text-[var(--icon-green-text)]">{stats.completedVisits}</p>
          <p className="text-xs text-[var(--text-secondary)]">Completed</p>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl p-4 text-center border border-[var(--border-color)]">
          <p className="text-2xl font-bold text-[var(--icon-yellow-text)]">{stats.pendingVisits}</p>
          <p className="text-xs text-[var(--text-secondary)]">Pending</p>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl p-4 text-center border border-[var(--border-color)]">
          <p className="text-2xl font-bold text-[var(--icon-cyan-text)]">{stats.totalMedications}</p>
          <p className="text-xs text-[var(--text-secondary)]">Medications</p>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl p-4 text-center border border-[var(--border-color)]">
          <p className="text-2xl font-bold text-[var(--icon-purple-text)]">{stats.totalLabTests}</p>
          <p className="text-xs text-[var(--text-secondary)]">Lab Tests</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-[var(--bg-card)] rounded-xl shadow-sm border border-[var(--border-color)]">
        <div className="border-b border-[var(--border-color)]">
          <nav className="flex flex-wrap gap-1 p-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-2 px-4 rounded-lg font-medium transition-all duration-200 text-sm ${
                    activeTab === tab.id
                      ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-[var(--bg-main)] text-[var(--text-secondary)]'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* ========== PROFILE TAB ========== */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gradient-to-r from-blue-50 to-teal-50 rounded-xl p-5 border border-blue-200">
                  <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">Basic Information</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center bg-white rounded-lg p-3 border border-[var(--border-color)]">
                      <span className="text-[var(--text-secondary)] text-sm font-medium">Full Name</span>
                      <span className="font-bold text-[var(--text-primary)]">{getPatientFullName(patient)}</span>
                    </div>
                    <div className="flex justify-between items-center bg-white rounded-lg p-3 border border-[var(--border-color)]">
                      <span className="text-[var(--text-secondary)] text-sm font-medium">Folder Number</span>
                      <span className="font-bold text-[var(--text-primary)]">{patient.folderNumber || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center bg-white rounded-lg p-3 border border-[var(--border-color)]">
                      <span className="text-[var(--text-secondary)] text-sm font-medium">Gender</span>
                      <span className="font-bold text-[var(--text-primary)]">{patient.gender || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center bg-white rounded-lg p-3 border border-[var(--border-color)]">
                      <span className="text-[var(--text-secondary)] text-sm font-medium">Date of Birth</span>
                      <span className="font-bold text-[var(--text-primary)]">{formatDate(patient.dateOfBirth)}</span>
                    </div>
                    <div className="flex justify-between items-center bg-white rounded-lg p-3 border border-[var(--border-color)]">
                      <span className="text-[var(--text-secondary)] text-sm font-medium">Age</span>
                      <span className="font-bold text-[var(--text-primary)]">{patient.ageDisplay || `${patient.age || 'N/A'} years`}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-5 border border-green-200">
                  <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">Contact Information</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center bg-white rounded-lg p-3 border border-[var(--border-color)]">
                      <span className="text-[var(--text-secondary)] text-sm font-medium">Contact Number</span>
                      <span className="font-bold text-[var(--text-primary)]">{patient.contact || 'N/A'}</span>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-[var(--border-color)]">
                      <p className="text-[var(--text-secondary)] text-sm font-medium mb-1">Address</p>
                      <p className="font-bold text-[var(--text-primary)] text-sm">{patient.address || 'No address provided'}</p>
                    </div>
                    {patient.additionalInfo?.email && (
                      <div className="flex justify-between items-center bg-white rounded-lg p-3 border border-[var(--border-color)]">
                        <span className="text-[var(--text-secondary)] text-sm font-medium">Email</span>
                        <span className="font-bold text-[var(--text-primary)]">{patient.additionalInfo.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========== ATTENDANCES TAB ========== */}
          {activeTab === 'attendances' && (
            <div className="space-y-4">
              {patientAttendances.length === 0 ? (
                <div className="text-center py-16">
                  <Calendar className="w-16 h-16 text-[var(--text-tertiary)] mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">No Visits Yet</h3>
                  <p className="text-[var(--text-secondary)] text-sm mb-4">
                    This patient has no recorded visits.
                  </p>
                  {canCreateAttendance && (
                    <button
                      onClick={handleNewAttendance}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] rounded-lg hover:bg-[var(--icon-green-text)] hover:text-white transition-colors font-medium text-sm"
                    >
                      <Calendar className="w-4 h-4" />
                      Create First Visit
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {patientAttendances.map((attendance) => (
                    <div 
                      key={attendance.id} 
                      className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl hover:shadow-md transition-all duration-200 overflow-hidden"
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between flex-wrap gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[var(--icon-cyan-bg)] rounded-lg flex items-center justify-center">
                              <Calendar className="w-5 h-5 text-[var(--icon-cyan-text)]" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-[var(--text-primary)]">
                                  {attendance.attendanceNumber || `Visit ${formatDate(attendance.dateTime)}`}
                                </span>
                                {getStatusBadge(attendance.status)}
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-secondary)]">
                                <span>{formatDateTime(attendance.dateTime || attendance.createdAt)}</span>
                                <span>•</span>
                                <span>{attendance.attendanceType?.replace(/_/g, ' ')}</span>
                                <span>•</span>
                                <span className="capitalize">{attendance.paymentMode}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/dashboard/attendance/${attendance.id}`}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-colors text-xs font-medium"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View Details
                            </Link>
                            <button
                              onClick={() => viewMedicalDetails(attendance)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] rounded-lg hover:bg-[var(--icon-purple-text)] hover:text-white transition-colors text-xs font-medium"
                            >
                              <Stethoscope className="w-3.5 h-3.5" />
                              Medical Summary
                            </button>
                          </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="mt-3 pt-3 border-t border-[var(--border-color)] flex flex-wrap gap-4 text-xs">
                          <div className="flex items-center gap-1.5">
                            <Pill className="w-3.5 h-3.5 text-[var(--icon-green-text)]" />
                            <span className="text-[var(--text-secondary)]">Medications:</span>
                            <span className="font-medium text-[var(--text-primary)]">{attendance.medications?.length || 0}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <FlaskConical className="w-3.5 h-3.5 text-[var(--icon-purple-text)]" />
                            <span className="text-[var(--text-secondary)]">Lab Tests:</span>
                            <span className="font-medium text-[var(--text-primary)]">{attendance.labTests?.length || 0}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Scissors className="w-3.5 h-3.5 text-[var(--icon-yellow-text)]" />
                            <span className="text-[var(--text-secondary)]">Procedures:</span>
                            <span className="font-medium text-[var(--text-primary)]">{attendance.procedures?.length || 0}</span>
                          </div>
                          {attendance.totalBill > 0 && (
                            <div className="flex items-center gap-1.5 ml-auto">
                              <DollarSign className="w-3.5 h-3.5 text-[var(--icon-green-text)]" />
                              <span className="text-[var(--text-secondary)]">Bill:</span>
                              <span className="font-medium text-[var(--text-primary)]">GHS {attendance.totalBill.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========== MEDICAL RECORDS TAB ========== */}
          {activeTab === 'medical-records' && (
            <div className="space-y-6">
              {patientAttendances.length === 0 ? (
                <div className="text-center py-16">
                  <Stethoscope className="w-16 h-16 text-[var(--text-tertiary)] mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">No Medical Records</h3>
                  <p className="text-[var(--text-secondary)] text-sm">
                    No medical records found for this patient.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {patientAttendances.map((attendance) => (
                    <div key={attendance.id} className="border border-[var(--border-color)] rounded-xl overflow-hidden">
                      <div 
                        className="bg-[var(--bg-main)] px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-[var(--bg-card)] transition-colors"
                        onClick={() => viewMedicalDetails(attendance)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-[var(--icon-cyan-bg)] rounded-lg flex items-center justify-center">
                            <Calendar className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                          </div>
                          <div>
                            <div className="font-semibold text-[var(--text-primary)]">
                              {formatDateTime(attendance.dateTime || attendance.createdAt)}
                            </div>
                            <div className="text-xs text-[var(--text-secondary)]">
                              {attendance.attendanceType?.replace(/_/g, ' ')} • {attendance.attendanceNumber}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(attendance.status)}
                          <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)]" />
                        </div>
                      </div>
                      
                      {/* Preview of medical entries */}
                      <div className="p-4 border-t border-[var(--border-color)] grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <Pill className="w-3.5 h-3.5 text-[var(--icon-green-text)]" />
                          <span className="text-[var(--text-secondary)]">Medications:</span>
                          <span className="font-medium text-[var(--text-primary)]">{attendance.medications?.length || 0}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Syringe className="w-3.5 h-3.5 text-[var(--icon-purple-text)]" />
                          <span className="text-[var(--text-secondary)]">Lab Tests:</span>
                          <span className="font-medium text-[var(--text-primary)]">{attendance.labTests?.length || 0}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Microscope className="w-3.5 h-3.5 text-[var(--icon-yellow-text)]" />
                          <span className="text-[var(--text-secondary)]">Scans:</span>
                          <span className="font-medium text-[var(--text-primary)]">{attendance.scans?.length || 0}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========== DOCUMENTS TAB ========== */}
          {/* ========== DOCUMENTS TAB ========== */}
{activeTab === 'documents' && (
  <div className="space-y-6">
    {documentsLoading ? (
      <div className="text-center py-16">
        <Loader className="w-12 h-12 text-[var(--icon-cyan-text)] animate-spin mx-auto mb-4" />
        <p className="text-[var(--text-secondary)]">Loading documents...</p>
      </div>
    ) : documents.length === 0 ? (
      <div className="text-center py-16">
        <File className="w-16 h-16 text-[var(--text-tertiary)] mx-auto mb-4" />
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">No Documents Found</h3>
        <p className="text-[var(--text-secondary)] text-sm">
          Documents will appear here when generated. You can generate:
        </p>
        <ul className="text-sm text-[var(--text-secondary)] mt-3 space-y-1">
          <li>• Receipts when processing payments</li>
          <li>• Prescriptions when adding medications</li>
          <li>• Lab results when tests are completed</li>
          <li>• Discharge summaries when patients are discharged</li>
          <li>• Referral letters when referring patients</li>
        </ul>
      </div>
    ) : (
      <div className="space-y-4">
        {/* Group documents by attendance/visit */}
        {Array.from(documentsByAttendance.entries()).map(([entityId, docs]) => {
          // Find the attendance for this document group
          const attendance = patientAttendances.find(a => a.id === entityId);
          const displayName = attendance 
            ? `${attendance.attendanceNumber || 'Visit'} - ${formatDate(attendance.dateTime || attendance.createdAt)}`
            : `Document Group ${entityId.slice(-8)}`;
          
          return (
            <div key={entityId} className="border border-[var(--border-color)] rounded-xl overflow-hidden">
              <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                  <span className="font-semibold text-[var(--text-primary)]">{displayName}</span>
                  {attendance && (
                    <span className="text-xs text-[var(--text-secondary)] ml-2">
                      {attendance.attendanceType?.replace(/_/g, ' ')}
                    </span>
                  )}
                </div>
                {attendance && (
                  <div className="text-xs text-[var(--text-tertiary)] mt-1">
                    {formatDateTime(attendance.dateTime || attendance.createdAt)}
                  </div>
                )}
              </div>
              <div className="divide-y divide-[var(--border-color)]">
                {docs.map((doc) => (
                  <div key={doc.id} className="p-4 hover:bg-[var(--bg-main)] transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          doc.template?.templateType === 'receipt' ? 'bg-green-100' :
                          doc.template?.templateType === 'prescription' ? 'bg-blue-100' :
                          doc.template?.templateType === 'lab_result' ? 'bg-purple-100' :
                          doc.template?.templateType === 'discharge_summary' ? 'bg-cyan-100' :
                          'bg-gray-100'
                        }`}>
                          {getDocumentIcon(doc.template?.templateType || '')}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-[var(--text-primary)]">
                              {getDocumentTypeLabel(doc.template?.templateType || '')}
                            </span>
                            <span className="text-xs text-[var(--text-secondary)]">
                              {doc.template?.name || 'Document'}
                            </span>
                          </div>
                          <div className="text-xs text-[var(--text-tertiary)] mt-1">
                            Generated: {formatDate(doc.generatedAt)} by {doc.generatedBy?.fullName || 'System'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDownloadDocument(doc)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-colors text-xs font-medium"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download
                        </button>
                        <button
                          onClick={() => window.open(`/documents/download/${doc.id}`, '_blank')}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-main)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--border-color)] transition-colors text-xs font-medium border border-[var(--border-color)]"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Print
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
)}
        </div>
      </div>

      {/* Medical Details Modal */}
      {showMedicalDetails && selectedAttendance && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Medical Records</h2>
                <p className="text-sm text-gray-500">
                  Visit: {formatDateTime(selectedAttendance.dateTime || selectedAttendance.createdAt)}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowMedicalDetails(false);
                  setSelectedAttendance(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XCircle className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Diagnoses */}
              {selectedAttendance.diagnoses && selectedAttendance.diagnoses.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 text-cyan-600" />
                    Diagnoses
                  </h3>
                  <div className="space-y-2">
                    {selectedAttendance.diagnoses.map((diag: any, idx: number) => (
                      <div key={idx} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{diag.diagnosis?.name || diag.icdCode}</p>
                            <p className="text-xs text-gray-500">ICD-10: {diag.icdCode || diag.diagnosis?.icdCode}</p>
                          </div>
                          {diag.primary && (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-cyan-100 text-cyan-700">
                              Primary
                            </span>
                          )}
                        </div>
                        {diag.notes && (
                          <p className="text-sm text-gray-600 mt-2">{diag.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Medications */}
              {selectedAttendance.medications && selectedAttendance.medications.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Pill className="w-5 h-5 text-green-600" />
                    Medications
                  </h3>
                  <div className="space-y-2">
                    {selectedAttendance.medications.map((med: Medication, idx: number) => (
                      <div key={idx} className="bg-green-50 rounded-lg p-3 border border-green-200">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-gray-900">{med.name}</p>
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                            {med.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {med.dosage} • {med.frequency} • {med.duration}
                        </p>
                        {med.instructions && (
                          <p className="text-xs text-gray-500 mt-1">Instructions: {med.instructions}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lab Tests */}
              {selectedAttendance.labTests && selectedAttendance.labTests.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <FlaskConical className="w-5 h-5 text-purple-600" />
                    Laboratory Tests
                  </h3>
                  <div className="space-y-2">
                    {selectedAttendance.labTests.map((test: LabTest, idx: number) => (
                      <div key={idx} className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                        <p className="font-medium text-gray-900">{test.serviceCatalog?.name || 'Lab Test'}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-sm text-gray-600">
                            Status: <span className="font-medium">{test.status}</span>
                          </span>
                          {test.result && (
                            <button 
                              className="text-xs text-purple-600 hover:text-purple-800"
                              onClick={() => window.open(`/api/documents/lab/${test.id}`)}
                            >
                              View Result
                            </button>
                          )}
                        </div>
                        {test.result && (
                          <p className="text-sm text-gray-700 mt-2">{JSON.stringify(test.result)}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Procedures */}
              {selectedAttendance.procedures && selectedAttendance.procedures.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Scissors className="w-5 h-5 text-yellow-600" />
                    Procedures
                  </h3>
                  <div className="space-y-2">
                    {selectedAttendance.procedures.map((proc: Procedure, idx: number) => (
                      <div key={idx} className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                        <p className="font-medium text-gray-900">{proc.name}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-sm text-gray-600">Status: {proc.status}</span>
                          {proc.performedAt && (
                            <span className="text-xs text-gray-500">Performed: {formatDate(proc.performedAt)}</span>
                          )}
                        </div>
                        {proc.notes && (
                          <p className="text-sm text-gray-600 mt-2">Notes: {proc.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Scans */}
              {selectedAttendance.scans && selectedAttendance.scans.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Microscope className="w-5 h-5 text-indigo-600" />
                    Scans & Imaging
                  </h3>
                  <div className="space-y-2">
                    {selectedAttendance.scans.map((scan: Scan, idx: number) => (
                      <div key={idx} className="bg-indigo-50 rounded-lg p-3 border border-indigo-200">
                        <p className="font-medium text-gray-900">{scan.scanType} - {scan.bodyPart || 'General'}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-sm text-gray-600">Status: {scan.status}</span>
                          {scan.imageUrls && scan.imageUrls.length > 0 && (
                            <button className="text-xs text-indigo-600 hover:text-indigo-800">
                              View Images ({scan.imageUrls.length})
                            </button>
                          )}
                        </div>
                        {scan.findings && (
                          <p className="text-sm text-gray-600 mt-2">Findings: {scan.findings}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Vitals */}
              {selectedAttendance.vitals && selectedAttendance.vitals.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Heart className="w-5 h-5 text-red-600" />
                    Vitals
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {selectedAttendance.vitals.map((vitals: Vitals, idx: number) => (
                      <div key={idx} className="bg-red-50 rounded-lg p-3 border border-red-200">
                        <p className="text-xs text-gray-500">{formatDateTime(vitals.recordedAt)}</p>
                        {vitals.bloodPressure && <p className="text-sm font-medium">BP: {vitals.bloodPressure}</p>}
                        {vitals.temperature && <p className="text-sm">Temp: {vitals.temperature}°C</p>}
                        {vitals.pulse && <p className="text-sm">Pulse: {vitals.pulse} bpm</p>}
                        {vitals.spo2 && <p className="text-sm">SpO2: {vitals.spo2}%</p>}
                        {vitals.weight && vitals.height && (
                          <p className="text-sm">BMI: {vitals.bmi}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Complaints & Notes */}
              {selectedAttendance.complaints && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Chief Complaints</h3>
                  <p className="text-gray-700 bg-gray-50 rounded-lg p-3 border border-gray-200">
                    {selectedAttendance.complaints}
                  </p>
                </div>
              )}
              {selectedAttendance.medicalNotes && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Clinical Notes</h3>
                  <p className="text-gray-700 bg-gray-50 rounded-lg p-3 border border-gray-200">
                    {selectedAttendance.medicalNotes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Attendance Modal */}
      {showAttendanceModal && (
        <NewAttendanceModal
          patientId={patient.id}
          onSuccess={handleAttendanceSuccess}
          onClose={handleAttendanceClose}
        />
      )}
    </div>
  );
}