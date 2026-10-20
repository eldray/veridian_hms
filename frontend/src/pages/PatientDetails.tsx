// src/pages/PatientDetails.tsx - COMPACT REDESIGNED VERSION
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePatientStore } from '../store/patientStore';
import { useAttendanceStore } from '../store/attendanceStore';
import { useAuthStore } from '../store/authStore';
import { useInsuranceStore } from '../store/insuranceStore';
import { useToast } from '../store/toastStore';
import NewAttendanceModal from '../components/NewAttendanceModal';
import { CompactAdditionalInfo } from '../components/patients/CompactAdditionalInfo';
import { VitalsTrendGraph } from '../components/vitals/VitalsTrendGraph';
import {
  ArrowLeft, Edit, Calendar, Users, Pill, FlaskConical, Scissors,
  DollarSign, RefreshCw, AlertCircle, Loader, Trash2, Eye, Clock,
  CheckCircle, XCircle, Activity, File, Download, Printer, ChevronRight,
  Stethoscope, Microscope, Heart, AlertTriangle,
  Phone, MapPin, CreditCard,
  Receipt, ClipboardList, FileText, X, TrendingUp
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Attendance, LabTest, Medication, Procedure, Scan, Vitals } from '../types';
import { useDocumentStore } from '../store/documentStore';
import type { GeneratedDocument } from '../types/documents';

// ============ HELPERS ============
const formatCurrency = (amount: unknown): string => {
  if (amount === null || amount === undefined) return '₵0.00';
  const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  if (!Number.isFinite(num)) return '₵0.00';
  return `₵${num.toFixed(2)}`;
};

// ============ STATUS BADGE ============
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colors: Record<string, string> = {
    pending: 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]',
    completed: 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]',
    cancelled: 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]',
    admitted: 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]',
    discharged: 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]',
    prescribed: 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]',
    dispensed: 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]',
    requested: 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]',
    scheduled: 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]',
    in_progress: 'bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)]',
  };
  const cls = colors[status?.toLowerCase()] || 'bg-[var(--bg-main)] text-[var(--text-secondary)]';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide uppercase ${cls}`}>
      {status?.replace(/_/g, ' ') || 'pending'}
    </span>
  );
};

// ============ TABLE PRIMITIVES ============
const Table: React.FC<{ heads: string[]; children: React.ReactNode }> = ({ heads, children }) => (
  <div className="overflow-x-auto rounded-lg border border-[var(--border-color)]">
    <table className="w-full text-xs">
      <thead className="bg-[var(--bg-main)]">
        <tr>
          {heads.map(h => (
            <th key={h} className="px-3 py-2 text-left font-semibold text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-[var(--border-color)]">{children}</tbody>
    </table>
  </div>
);

const TdPrimary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <td className="px-3 py-2 font-medium text-[var(--text-primary)]">{children}</td>
);

const Td: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <td className={`px-3 py-2 text-[var(--text-secondary)] ${className}`}>{children}</td>
);

// ============ STAT CARD ============
const StatCard: React.FC<{
  label: string;
  value: string | number;
  icon: React.ElementType;
  tone?: 'cyan' | 'green' | 'yellow' | 'purple' | 'red' | 'blue';
}> = ({ label, value, icon: Icon, tone = 'cyan' }) => {
  const tones: Record<string, string> = {
    cyan: 'text-[var(--icon-cyan-text)] bg-[var(--icon-cyan-bg)]',
    green: 'text-[var(--icon-green-text)] bg-[var(--icon-green-bg)]',
    yellow: 'text-[var(--icon-yellow-text)] bg-[var(--icon-yellow-bg)]',
    purple: 'text-[var(--icon-purple-text)] bg-[var(--icon-purple-bg)]',
    red: 'text-[var(--icon-red-text)] bg-[var(--icon-red-bg)]',
    blue: 'text-[var(--icon-blue-text)] bg-[var(--icon-blue-bg)]',
  };
  return (
    <div className="group bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-2.5 flex items-center gap-2.5 hover:shadow-sm hover:border-[var(--icon-cyan-text)] transition-all">
      <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${tones[tone]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-[var(--text-primary)] leading-tight truncate">{value}</p>
        <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide truncate">{label}</p>
      </div>
    </div>
  );
};

// ============ INFO ROW ============
const InfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-center justify-between py-1.5 border-b border-[var(--border-color)] last:border-0">
    <span className="text-xs text-[var(--text-tertiary)]">{label}</span>
    <span className="text-xs font-medium text-[var(--text-primary)] text-right truncate ml-3">{value}</span>
  </div>
);

// ============ EMPTY STATE ============
const EmptyState: React.FC<{ icon: React.ElementType; title: string; hint?: string; action?: React.ReactNode }> = ({
  icon: Icon, title, hint, action,
}) => (
  <div className="text-center py-10">
    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[var(--bg-main)] flex items-center justify-center">
      <Icon className="w-6 h-6 text-[var(--text-tertiary)]" />
    </div>
    <p className="text-sm font-medium text-[var(--text-primary)]">{title}</p>
    {hint && <p className="text-xs text-[var(--text-tertiary)] mt-1">{hint}</p>}
    {action && <div className="mt-3">{action}</div>}
  </div>
);

// ============ MAIN COMPONENT ============
export default function PatientDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const { currentPatient, fetchPatient, deletePatient } = usePatientStore();
  const { attendances, getAttendances, getVitalsByAttendance } = useAttendanceStore();
  const { hasRole } = useAuthStore();
  const { getInsuranceProviders } = useInsuranceStore();

  const [activeTab, setActiveTab] = useState<
    'profile' | 'documents' | 'attendances' | 'medical-records' | 'overview' |
    'diagnoses' | 'medications' | 'lab-tests' | 'procedures' | 'vitals' | 'billing'
  >('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState<Attendance | null>(null);
  const [showMedicalDetails, setShowMedicalDetails] = useState(false);
  const [stats, setStats] = useState({
    totalVisits: 0, completedVisits: 0, pendingVisits: 0,
    totalMedications: 0, totalLabTests: 0,
  });
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [vitalsList, setVitalsList] = useState<any[]>([]);
  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);

  const { getDocumentsByEntity, downloadDocument } = useDocumentStore();

  const patient = useMemo(() => {
    if (!currentPatient) return null;
    if (currentPatient.data) return currentPatient.data;
    if (currentPatient.success && currentPatient.data) return currentPatient.data;
    return currentPatient;
  }, [currentPatient]);

  const getPatientFullName = (p: any) =>
    p?.name || p?.fullName || `${p?.surname || ''} ${p?.otherNames || ''}`.trim();

  const patientAttendances = useMemo(() => {
    if (!patient || !attendances.length) return [];
    const patientId = patient.id;
    const filtered = attendances.filter((a: any) =>
      a.patientId === patientId ||
      a.patient?.id === patientId ||
      a.Patient?.id === patientId
    );
    return filtered.map((att: any) => ({
      ...att,
      diagnoses: att.diagnoses ?? att.AttendanceDiagnosis ?? [],
      medications: att.medications ?? att.Medication ?? [],
      labTests: att.labTests ?? att.LabTest ?? [],
      procedures: att.procedures ?? att.Procedure ?? [],
      scans: att.scans ?? att.Scan ?? [],
      vitals: att.vitals ?? att.Vitals ?? [],
      servicesRendered: att.servicesRendered ?? att.ServiceRendered ?? [],
    }));
  }, [attendances, patient]);

  const aggregate = (key: string) => {
    const out: any[] = [];
    patientAttendances.forEach(att => {
      if (att[key]?.length) {
        out.push(...att[key].map((x: any) => ({
          ...x,
          attendanceId: att.id,
          attendanceDate: att.dateTime || att.createdAt,
          attendanceNumber: att.attendanceNumber,
        })));
      }
    });
    return out.sort((a, b) => new Date(b.attendanceDate).getTime() - new Date(a.attendanceDate).getTime());
  };

  const allDiagnoses = useMemo(() => aggregate('diagnoses'), [patientAttendances]);
  const allMedications = useMemo(() => aggregate('medications'), [patientAttendances]);
  const allLabTests = useMemo(() => aggregate('labTests'), [patientAttendances]);
  const allProcedures = useMemo(() => aggregate('procedures'), [patientAttendances]);

  const enhancedStats = useMemo(() => {
    const totalVisits = patientAttendances.length;
    const completedVisits = patientAttendances.filter(a => a.status === 'completed').length;
    const pendingVisits = patientAttendances.filter(a =>
      ['pending', 'active', 'in-progress'].includes(a.status)
    ).length;
    const admittedVisits = patientAttendances.filter(a => a.status === 'admitted').length;
    const totalBilled = patientAttendances.reduce((s, a) => s + (a.totalBill || 0), 0);
    const totalPaid = patientAttendances.reduce((s, a) => s + (a.paidAmount || 0), 0);
    return {
      totalVisits, completedVisits, pendingVisits, admittedVisits,
      totalBilled, totalPaid, outstanding: totalBilled - totalPaid,
    };
  }, [patientAttendances]);

  const loadAllVitals = async () => {
    const all: any[] = [];
    await Promise.all(
      patientAttendances.map(async att => {
        try {
          const v = await getVitalsByAttendance(att.id);
          if (v?.length) {
            all.push(...v.map((x: any) => ({
              ...x,
              attendanceId: att.id,
              attendanceDate: att.dateTime || att.createdAt,
              attendanceNumber: att.attendanceNumber,
            })));
          }
        } catch (e) {
          console.error('Vitals load error', att.id, e);
        }
      })
    );
    setVitalsList(all.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()));
  };

  const latestVitals = vitalsList[0] || null;

  const hasAbnormalVitals = useMemo(() => {
    if (!latestVitals) return false;
    try {
      const bp = latestVitals.bloodPressure;
      if (bp) {
        const [sys] = String(bp).split('/').map(Number);
        if (sys > 140 || sys < 90) return true;
      }
      if (latestVitals.temperature != null && (latestVitals.temperature > 38 || latestVitals.temperature < 35)) return true;
      if (latestVitals.pulse != null && (latestVitals.pulse > 100 || latestVitals.pulse < 60)) return true;
      if (latestVitals.spo2 != null && latestVitals.spo2 < 95) return true;
    } catch { /* noop */ }
    return false;
  }, [latestVitals]);

  const loadData = async () => {
    if (!id) {
      toastError('Error', 'No patient ID provided');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setRefreshing(true);
    try {
      const fetched = await fetchPatient(id);
      if (fetched) {
        await Promise.all([getAttendances({ patientId: id }), getInsuranceProviders()]);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Could not load patient data';
      toastError('Load failed', msg);
      if (err.response?.status === 404) navigate('/dashboard/patients');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const loadDocuments = async () => {
    if (!patient?.id) return;
    setDocumentsLoading(true);
    try {
      const docs = await getDocumentsByEntity('Patient', patient.id);
      setDocuments(docs);
    } catch (e) {
      console.error('Failed to load documents:', e);
    } finally {
      setDocumentsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [id, refreshTrigger]);

  useEffect(() => {
    const totalVisits = patientAttendances.length;
    const completedVisits = patientAttendances.filter(a => a.status === 'completed').length;
    const pendingVisits = patientAttendances.filter(a =>
      ['pending', 'active', 'in-progress'].includes(a.status)
    ).length;
    const totalMedications = patientAttendances.reduce((s, a) => s + (a.medications?.length || 0), 0);
    const totalLabTests = patientAttendances.reduce((s, a) => s + (a.labTests?.length || 0), 0);
    setStats({ totalVisits, completedVisits, pendingVisits, totalMedications, totalLabTests });
  }, [patientAttendances]);

  useEffect(() => {
    if (patientAttendances.length > 0) loadAllVitals();
  }, [patientAttendances]);

  useEffect(() => {
    if ((activeTab === 'documents' || activeTab === 'overview') && patient?.id) loadDocuments();
  }, [activeTab, patient?.id]);

  const handleAttendanceSuccess = async () => {
    setShowAttendanceModal(false);
    try {
      await getAttendances();
      setActiveTab('attendances');
      setRefreshTrigger(p => p + 1);
      success('Check-in complete', 'New visit created');
    } catch {
      toastError('Refresh failed', 'Could not update visit list');
    }
  };

  const handleEdit = () => navigate(`/dashboard/patients/register?edit=true&id=${patient?.id}`);
  const handleNewAttendance = () => setShowAttendanceModal(true);

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
      success('Download started', 'Document is being downloaded');
    } catch {
      toastError('Download Failed', 'Could not download document');
    }
  };

  const getDocumentIcon = (templateType: string) => {
    switch (templateType) {
      case 'receipt': return <Receipt className="w-3.5 h-3.5" />;
      case 'prescription': return <ClipboardList className="w-3.5 h-3.5" />;
      case 'lab_result': return <FlaskConical className="w-3.5 h-3.5" />;
      case 'discharge_summary': return <CheckCircle className="w-3.5 h-3.5" />;
      case 'referral_letter': return <Stethoscope className="w-3.5 h-3.5" />;
      default: return <FileText className="w-3.5 h-3.5" />;
    }
  };

  const getDocumentTypeLabel = (templateType: string): string => {
    const labels: Record<string, string> = {
      receipt: 'Payment Receipt',
      prescription: 'Prescription',
      lab_result: 'Lab Result',
      discharge_summary: 'Discharge Summary',
      referral_letter: 'Referral Letter',
      admission_letter: 'Admission Letter',
      scan_report: 'Scan Report',
      nhia_claim_form: 'NHIS Claim Form',
    };
    return labels[templateType] || 'Document';
  };

  const formatDate = (d: string) => {
    try {
      if (!d) return '—';
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return 'Invalid';
      return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return '—'; }
  };

  const formatDateTime = (d: string) => {
    try {
      if (!d) return '—';
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return 'Invalid';
      return dt.toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return '—'; }
  };

  const canEdit = hasRole(['admin', 'doctor', 'nurse']);
  const canCreateAttendance = hasRole(['admin', 'doctor', 'nurse']);
  const canDelete = hasRole(['admin']);

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: Activity, count: 0 },
    { id: 'profile' as const, label: 'Profile', icon: Users, count: 0 },
    { id: 'attendances' as const, label: 'Visits', icon: Calendar, count: patientAttendances.length },
    { id: 'medical-records' as const, label: 'Records', icon: Stethoscope, count: stats.totalMedications + stats.totalLabTests },
    { id: 'diagnoses' as const, label: 'Diagnoses', icon: Stethoscope, count: allDiagnoses.length },
    { id: 'medications' as const, label: 'Meds', icon: Pill, count: allMedications.length },
    { id: 'lab-tests' as const, label: 'Labs', icon: FlaskConical, count: allLabTests.length },
    { id: 'procedures' as const, label: 'Procedures', icon: Scissors, count: allProcedures.length },
    { id: 'vitals' as const, label: 'Vitals', icon: Heart, count: vitalsList.length },
    { id: 'billing' as const, label: 'Billing', icon: DollarSign, count: 0 },
    { id: 'documents' as const, label: 'Docs', icon: File, count: documents.length },
  ];

  // ============ LOADING ============
  if (isLoading && !refreshing) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
        <div className="text-center bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-8 max-w-xs w-full">
          <Loader className="w-8 h-8 text-[var(--icon-cyan-text)] animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-[var(--text-primary)]">Loading patient…</p>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">Please wait</p>
        </div>
      </div>
    );
  }

  // ============ NOT FOUND ============
  if (!patient) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
        <div className="text-center bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-8 max-w-sm w-full">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[var(--icon-red-bg)] flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-[var(--icon-red-text)]" />
          </div>
          <h2 className="text-base font-bold text-[var(--text-primary)] mb-1">Patient Not Found</h2>
          <p className="text-xs text-[var(--text-secondary)] mb-5">
            The patient record does not exist or has been removed.
          </p>
          <button
            onClick={() => navigate('/dashboard/patients')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-colors text-xs font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Patients
          </button>
        </div>
      </div>
    );
  }

  // ============ MAIN ============
  return (
    <div className="space-y-4 p-4 lg:p-6 max-w-[1600px] mx-auto">

      {/* ============ HEADER ============ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard/patients')}
            className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--icon-cyan-text)] transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base font-bold text-[var(--text-primary)] leading-tight">Patient Details</h1>
            <p className="text-[11px] text-[var(--text-tertiary)]">
              Record #{patient.folderNumber || patient.id?.slice(-8)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-colors disabled:opacity-50 text-xs font-medium text-[var(--text-primary)]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {canCreateAttendance && (
            <button
              onClick={handleNewAttendance}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] rounded-lg hover:bg-[var(--icon-green-text)] hover:text-white transition-colors text-xs font-semibold"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Visit</span>
            </button>
          )}

          {canEdit && (
            <button
              onClick={handleEdit}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-colors text-xs font-semibold"
            >
              <Edit className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Edit</span>
            </button>
          )}

          {canDelete && (
            <button
              onClick={() => setDeleteConfirm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] rounded-lg hover:bg-[var(--icon-red-text)] hover:text-white transition-colors text-xs font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          )}
        </div>
      </div>

      {/* ============ PATIENT HERO CARD ============ */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-12 h-12 rounded-lg bg-[var(--icon-cyan-bg)] flex items-center justify-center shrink-0">
              <Users className="w-6 h-6 text-[var(--icon-cyan-text)]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-[var(--text-primary)] truncate leading-tight">
                  {getPatientFullName(patient)}
                </h2>
                <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-md uppercase tracking-wide ${
                  patient.gender?.toLowerCase() === 'male'
                    ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]'
                    : patient.gender?.toLowerCase() === 'female'
                      ? 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]'
                      : 'bg-[var(--bg-main)] text-[var(--text-secondary)]'
                }`}>
                  {patient.gender || 'Unknown'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-[11px] text-[var(--text-secondary)]">
                <span className="inline-flex items-center gap-1">
                  <FileText className="w-3 h-3 text-[var(--text-tertiary)]" />
                  {patient.folderNumber || 'No folder'}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[var(--text-tertiary)]" />
                  {patient.ageDisplay || `${patient.age || 'N/A'} yrs`}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Phone className="w-3 h-3 text-[var(--text-tertiary)]" />
                  {patient.contact || 'N/A'}
                </span>
                <span className="inline-flex items-center gap-1">
                  <CreditCard className="w-3 h-3 text-[var(--text-tertiary)]" />
                  {patient.paymentMode || 'Cash'}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[var(--text-tertiary)]" />
                  Reg. {formatDate(patient.createdAt)}
                </span>
              </div>
              {patient.address && (
                <p className="text-[11px] text-[var(--text-tertiary)] mt-1 inline-flex items-center gap-1 truncate">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">{patient.address}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============ STATS BAR ============ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <StatCard label="Visits" value={enhancedStats.totalVisits} icon={Calendar} tone="cyan" />
        <StatCard label="Completed" value={enhancedStats.completedVisits} icon={CheckCircle} tone="green" />
        <StatCard label="Pending" value={enhancedStats.pendingVisits} icon={Clock} tone="yellow" />
        <StatCard label="Meds" value={allMedications.length} icon={Pill} tone="purple" />
        <StatCard label="Labs" value={allLabTests.length} icon={FlaskConical} tone="blue" />
        <StatCard label="Outstanding" value={formatCurrency(enhancedStats.outstanding)} icon={DollarSign} tone="red" />
      </div>

      {/* ============ TABS ============ */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
        <div className="border-b border-[var(--border-color)] overflow-x-auto scrollbar-thin">
          <nav className="flex gap-1 p-2 min-w-max">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
                    active
                      ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`ml-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      active ? 'bg-[var(--icon-cyan-text)]/15 text-[var(--icon-cyan-text)]' : 'bg-[var(--bg-main)] text-[var(--text-tertiary)]'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4">
          {/* ============ OVERVIEW ============ */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Patient Info */}
              <div className="bg-[var(--bg-main)] rounded-lg p-4 border border-[var(--border-color)]">
                <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[var(--icon-cyan-text)]" /> Patient Info
                </h3>
                <InfoRow label="Full Name" value={getPatientFullName(patient)} />
                <InfoRow label="Folder #" value={patient.folderNumber || 'N/A'} />
                <InfoRow label="Gender" value={patient.gender || 'N/A'} />
                <InfoRow label="DOB" value={formatDate(patient.dateOfBirth)} />
                <InfoRow label="Age" value={patient.ageDisplay || `${patient.age || 'N/A'} yrs`} />
                <InfoRow label="Contact" value={patient.contact || 'N/A'} />
                <InfoRow label="Payment" value={patient.paymentMode || 'Cash'} />
              </div>

              {/* Latest Vitals */}
              <div className="bg-[var(--bg-main)] rounded-lg p-4 border border-[var(--border-color)]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wide flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-[var(--icon-red-text)]" /> Latest Vitals
                  </h3>
                  {hasAbnormalVitals && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]">
                      <AlertTriangle className="w-3 h-3" /> Abnormal
                    </span>
                  )}
                </div>
                {latestVitals ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      {latestVitals.bloodPressure && (
                        <div className="bg-[var(--bg-card)] rounded-md p-2 border border-[var(--border-color)]">
                          <p className="text-[10px] text-[var(--text-tertiary)] uppercase">BP</p>
                          <p className="text-sm font-bold text-[var(--text-primary)]">{latestVitals.bloodPressure}</p>
                          <p className="text-[10px] text-[var(--text-tertiary)]">mmHg</p>
                        </div>
                      )}
                      {latestVitals.temperature && (
                        <div className="bg-[var(--bg-card)] rounded-md p-2 border border-[var(--border-color)]">
                          <p className="text-[10px] text-[var(--text-tertiary)] uppercase">Temp</p>
                          <p className="text-sm font-bold text-[var(--text-primary)]">{latestVitals.temperature}°</p>
                          <p className="text-[10px] text-[var(--text-tertiary)]">Celsius</p>
                        </div>
                      )}
                      {latestVitals.pulse && (
                        <div className="bg-[var(--bg-card)] rounded-md p-2 border border-[var(--border-color)]">
                          <p className="text-[10px] text-[var(--text-tertiary)] uppercase">Pulse</p>
                          <p className="text-sm font-bold text-[var(--text-primary)]">{latestVitals.pulse}</p>
                          <p className="text-[10px] text-[var(--text-tertiary)]">bpm</p>
                        </div>
                      )}
                      {latestVitals.spo2 && (
                        <div className="bg-[var(--bg-card)] rounded-md p-2 border border-[var(--border-color)]">
                          <p className="text-[10px] text-[var(--text-tertiary)] uppercase">SpO₂</p>
                          <p className="text-sm font-bold text-[var(--text-primary)]">{latestVitals.spo2}%</p>
                          <p className="text-[10px] text-[var(--text-tertiary)]">Oxygen</p>
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-[var(--text-tertiary)] mt-3 text-center">
                      Recorded {formatDateTime(latestVitals.recordedAt)}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-[var(--text-tertiary)] text-center py-4">No vitals recorded</p>
                )}
              </div>

              {/* Financial */}
              <div className="bg-[var(--bg-main)] rounded-lg p-4 border border-[var(--border-color)]">
                <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-[var(--icon-green-text)]" /> Financial
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-[var(--bg-card)] rounded-md p-2.5 border border-[var(--border-color)]">
                    <span className="text-xs text-[var(--text-secondary)]">Billed</span>
                    <span className="text-sm font-bold text-[var(--text-primary)]">{formatCurrency(enhancedStats.totalBilled)}</span>
                  </div>
                  <div className="flex items-center justify-between bg-[var(--bg-card)] rounded-md p-2.5 border border-[var(--border-color)]">
                    <span className="text-xs text-[var(--text-secondary)]">Paid</span>
                    <span className="text-sm font-bold text-[var(--icon-green-text)]">{formatCurrency(enhancedStats.totalPaid)}</span>
                  </div>
                  <div className="flex items-center justify-between bg-[var(--icon-yellow-bg)] rounded-md p-2.5 border border-[var(--icon-yellow-text)]/20">
                    <span className="text-xs font-semibold text-[var(--icon-yellow-text)]">Outstanding</span>
                    <span className="text-sm font-bold text-[var(--icon-yellow-text)]">{formatCurrency(enhancedStats.outstanding)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============ PROFILE ============ */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
                    <Users className="h-4 w-4 text-[var(--icon-cyan-text)]" />
                    Basic information
                  </h3>
                  <InfoRow label="Full Name" value={getPatientFullName(patient)} />
                  <InfoRow label="Folder Number" value={patient.folderNumber || 'N/A'} />
                  <InfoRow label="Gender" value={patient.gender || 'N/A'} />
                  <InfoRow label="Date of Birth" value={formatDate(patient.dateOfBirth)} />
                  <InfoRow label="Age" value={patient.ageDisplay || `${patient.age || 'N/A'} years`} />
                </div>
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
                    <MapPin className="h-4 w-4 text-[var(--icon-cyan-text)]" />
                    Contact information
                  </h3>
                  <InfoRow label="Contact" value={patient.contact || 'N/A'} />
                  <InfoRow label="Address" value={patient.address || 'No address'} />
                  {patient.additionalInfo?.email && (
                    <InfoRow label="Email" value={patient.additionalInfo.email} />
                  )}
                </div>
              </div>
              <CompactAdditionalInfo patient={patient} />
            </div>
          )}

          {/* ============ ATTENDANCES ============ */}
          {activeTab === 'attendances' && (
            <div>
              {patientAttendances.length === 0 ? (
                <EmptyState
                  icon={Calendar}
                  title="No visits yet"
                  hint="This patient has no recorded visits."
                  action={canCreateAttendance && (
                    <button
                      onClick={handleNewAttendance}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] rounded-lg hover:bg-[var(--icon-green-text)] hover:text-white transition-colors text-xs font-semibold"
                    >
                      <Calendar className="w-3.5 h-3.5" /> Create First Visit
                    </button>
                  )}
                />
              ) : (
                <div className="space-y-2.5">
                  {patientAttendances.map(att => (
                    <div
                      key={att.id}
                      className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:border-[var(--icon-cyan-text)] transition-colors"
                    >
                      <div className="p-3">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-[var(--icon-cyan-bg)] flex items-center justify-center shrink-0">
                              <Calendar className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold text-[var(--text-primary)]">
                                  {att.attendanceNumber || `Visit ${formatDate(att.dateTime)}`}
                                </span>
                                <StatusBadge status={att.status} />
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[var(--text-tertiary)]">
                                <span>{formatDateTime(att.dateTime || att.createdAt)}</span>
                                <span>•</span>
                                <span className="capitalize">{att.attendanceType?.replace(/_/g, ' ')}</span>
                                <span>•</span>
                                <span className="capitalize">{att.paymentMode}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Link
                              to={`/dashboard/attendance/${att.id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-md hover:bg-[var(--icon-cyan-text)] hover:text-white transition-colors text-[11px] font-semibold"
                            >
                              <Eye className="w-3 h-3" /> View
                            </Link>
                            <button
                              onClick={() => viewMedicalDetails(att)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] rounded-md hover:bg-[var(--icon-purple-text)] hover:text-white transition-colors text-[11px] font-semibold"
                            >
                              <Stethoscope className="w-3 h-3" /> Summary
                            </button>
                          </div>
                        </div>

                        <div className="mt-2.5 pt-2.5 border-t border-[var(--border-color)] flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]">
                          <span className="inline-flex items-center gap-1 text-[var(--text-secondary)]">
                            <Pill className="w-3 h-3 text-[var(--icon-green-text)]" />
                            Meds: <span className="font-semibold text-[var(--text-primary)]">{att.medications?.length || 0}</span>
                          </span>
                          <span className="inline-flex items-center gap-1 text-[var(--text-secondary)]">
                            <FlaskConical className="w-3 h-3 text-[var(--icon-purple-text)]" />
                            Labs: <span className="font-semibold text-[var(--text-primary)]">{att.labTests?.length || 0}</span>
                          </span>
                          <span className="inline-flex items-center gap-1 text-[var(--text-secondary)]">
                            <Scissors className="w-3 h-3 text-[var(--icon-yellow-text)]" />
                            Procedures: <span className="font-semibold text-[var(--text-primary)]">{att.procedures?.length || 0}</span>
                          </span>
                          {att.totalBill > 0 && (
                            <span className="inline-flex items-center gap-1 ml-auto text-[var(--text-secondary)]">
                              <DollarSign className="w-3 h-3 text-[var(--icon-green-text)]" />
                              Bill: <span className="font-semibold text-[var(--text-primary)]">{formatCurrency(att.totalBill)}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============ MEDICAL RECORDS ============ */}
          {activeTab === 'medical-records' && (
            <div>
              {patientAttendances.length === 0 ? (
                <EmptyState icon={Stethoscope} title="No medical records" hint="No records found for this patient." />
              ) : (
                <div className="space-y-2.5">
                  {patientAttendances.map(att => (
                    <div key={att.id} className="border border-[var(--border-color)] rounded-lg overflow-hidden">
                      <button
                        onClick={() => viewMedicalDetails(att)}
                        className="w-full bg-[var(--bg-main)] px-3 py-2.5 flex items-center justify-between hover:bg-[var(--bg-card)] transition-colors text-left"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-md bg-[var(--icon-cyan-bg)] flex items-center justify-center">
                            <Calendar className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-[var(--text-primary)]">
                              {formatDateTime(att.dateTime || att.createdAt)}
                            </p>
                            <p className="text-[10px] text-[var(--text-tertiary)]">
                              {att.attendanceType?.replace(/_/g, ' ')} • {att.attendanceNumber}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={att.status} />
                          <ChevronRight className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                        </div>
                      </button>
                      <div className="px-3 py-2 grid grid-cols-3 gap-2 text-[11px] border-t border-[var(--border-color)]">
                        <span className="inline-flex items-center gap-1 text-[var(--text-secondary)]">
                          <Pill className="w-3 h-3 text-[var(--icon-green-text)]" />
                          Meds: <span className="font-semibold text-[var(--text-primary)]">{att.medications?.length || 0}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 text-[var(--text-secondary)]">
                          <FlaskConical className="w-3 h-3 text-[var(--icon-purple-text)]" />
                          Labs: <span className="font-semibold text-[var(--text-primary)]">{att.labTests?.length || 0}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 text-[var(--text-secondary)]">
                          <Microscope className="w-3 h-3 text-[var(--icon-yellow-text)]" />
                          Scans: <span className="font-semibold text-[var(--text-primary)]">{att.scans?.length || 0}</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============ DIAGNOSES ============ */}
          {activeTab === 'diagnoses' && (
            allDiagnoses.length === 0 ? (
              <EmptyState icon={Stethoscope} title="No diagnoses recorded" />
            ) : (
              <Table heads={['Diagnosis', 'ICD-10', 'Type', 'Visit Date', '']}>
                {allDiagnoses.map((d, i) => (
                  <tr key={i} className="hover:bg-[var(--bg-main)] transition-colors">
                    <TdPrimary>{d.Diagnosis?.name || d.diagnosis?.name || d.icdCode}</TdPrimary>
                    <Td className="font-mono text-[11px]">{d.icdCode || d.Diagnosis?.icdCode || d.diagnosis?.icdCode}</Td>
                    <Td>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        d.diagnosisType === 'primary'
                          ? 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]'
                          : 'bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)]'
                      }`}>
                        {d.diagnosisType === 'primary' ? 'Primary' : 'Secondary'}
                      </span>
                    </Td>
                    <Td>{formatDate(d.attendanceDate)}</Td>
                    <Td>
                      <Link to={`/dashboard/attendance/${d.attendanceId}`} className="text-[var(--icon-cyan-text)] hover:underline text-[11px] font-medium">
                        View →
                      </Link>
                    </Td>
                  </tr>
                ))}
              </Table>
            )
          )}

          {/* ============ MEDICATIONS ============ */}
          {activeTab === 'medications' && (
            allMedications.length === 0 ? (
              <EmptyState icon={Pill} title="No medications prescribed" />
            ) : (
              <Table heads={['Medication', 'Dosage', 'Frequency', 'Duration', 'Status', '']}>
                {allMedications.map((m, i) => (
                  <tr key={i} className="hover:bg-[var(--bg-main)] transition-colors">
                    <TdPrimary>{m.name}</TdPrimary>
                    <Td>{m.dosage || '—'}</Td>
                    <Td>{m.frequency || '—'}</Td>
                    <Td>{m.duration || '—'}</Td>
                    <Td><StatusBadge status={m.status} /></Td>
                    <Td>
                      <Link to={`/dashboard/attendance/${m.attendanceId}`} className="text-[var(--icon-cyan-text)] hover:underline text-[11px] font-medium">
                        View →
                      </Link>
                    </Td>
                  </tr>
                ))}
              </Table>
            )
          )}

          {/* ============ LAB TESTS ============ */}
          {activeTab === 'lab-tests' && (
            allLabTests.length === 0 ? (
              <EmptyState icon={FlaskConical} title="No lab tests requested" />
            ) : (
              <Table heads={['Test', 'Status', 'Request Date', 'Result', '']}>
                {allLabTests.map((t, i) => (
                  <tr key={i} className="hover:bg-[var(--bg-main)] transition-colors">
                    <TdPrimary>{t.LabTestTemplate?.name || t.ServiceCatalog?.name || t.name || '—'}</TdPrimary>
                    <Td><StatusBadge status={t.status} /></Td>
                    <Td>{formatDate(t.requestedAt || t.createdAt)}</Td>
                    <Td>{t.result ? (typeof t.result === 'object' ? 'Available' : t.result) : 'Pending'}</Td>
                    <Td>
                      <Link to={`/dashboard/attendance/${t.attendanceId}`} className="text-[var(--icon-cyan-text)] hover:underline text-[11px] font-medium">
                        View →
                      </Link>
                    </Td>
                  </tr>
                ))}
              </Table>
            )
          )}

          {/* ============ PROCEDURES ============ */}
          {activeTab === 'procedures' && (
            allProcedures.length === 0 ? (
              <EmptyState icon={Scissors} title="No procedures scheduled" />
            ) : (
              <Table heads={['Procedure', 'Scheduled', 'Status', '']}>
                {allProcedures.map((p, i) => (
                  <tr key={i} className="hover:bg-[var(--bg-main)] transition-colors">
                    <TdPrimary>{p.ProcedureTemplate?.name || p.ServiceCatalog?.name || p.name || '—'}</TdPrimary>
                    <Td>{p.scheduledDate ? formatDate(p.scheduledDate) : '—'}</Td>
                    <Td><StatusBadge status={p.status} /></Td>
                    <Td>
                      <Link to={`/dashboard/attendance/${p.attendanceId}`} className="text-[var(--icon-cyan-text)] hover:underline text-[11px] font-medium">
                        View →
                      </Link>
                    </Td>
                  </tr>
                ))}
              </Table>
            )
          )}

          {/* ============ VITALS ============ */}
          {activeTab === 'vitals' && (
            vitalsList.length === 0 ? (
              <EmptyState icon={Heart} title="No vitals recorded" />
            ) : (
              <div className="space-y-4">
                {vitalsList.length > 1 && (
                  <div className="bg-[var(--bg-main)] rounded-lg p-3 h-[340px] border border-[var(--border-color)]">
                    <VitalsTrendGraph vitals={vitalsList} isAntenatal={false} />
                  </div>
                )}
                <Table heads={['Date', 'BP', 'Temp', 'Pulse', 'Resp', 'SpO₂', 'Weight', 'BMI', '']}>
                  {vitalsList.map((v, i) => (
                    <tr key={i} className="hover:bg-[var(--bg-main)] transition-colors">
                      <Td>{formatDateTime(v.recordedAt)}</Td>
                      <Td>{v.bloodPressure || '—'}</Td>
                      <Td>{v.temperature ? `${v.temperature}°C` : '—'}</Td>
                      <Td>{v.pulse || '—'}</Td>
                      <Td>{v.respiration || '—'}</Td>
                      <Td>{v.spo2 ? `${v.spo2}%` : '—'}</Td>
                      <Td>{v.weight ? `${v.weight}kg` : '—'}</Td>
                      <Td>{v.bmi || '—'}</Td>
                      <Td>
                        <Link to={`/dashboard/attendance/${v.attendanceId}`} className="text-[var(--icon-cyan-text)] hover:underline text-[11px] font-medium">
                          View →
                        </Link>
                      </Td>
                    </tr>
                  ))}
                </Table>
              </div>
            )
          )}

          {/* ============ BILLING ============ */}
          {activeTab === 'billing' && (
            <div className="max-w-md mx-auto space-y-3">
              <div className="bg-[var(--bg-main)] rounded-lg p-4 border border-[var(--border-color)] text-center">
                <p className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">Total Billed</p>
                <p className="text-xl font-bold text-[var(--text-primary)] mt-1">{formatCurrency(enhancedStats.totalBilled)}</p>
              </div>
              <div className="bg-[var(--icon-green-bg)] rounded-lg p-4 border border-[var(--icon-green-text)]/20 text-center">
                <p className="text-[10px] uppercase tracking-wide text-[var(--icon-green-text)]">Total Paid</p>
                <p className="text-xl font-bold text-[var(--icon-green-text)] mt-1">{formatCurrency(enhancedStats.totalPaid)}</p>
              </div>
              <div className="bg-[var(--icon-yellow-bg)] rounded-lg p-4 border border-[var(--icon-yellow-text)]/20 text-center">
                <p className="text-[10px] uppercase tracking-wide text-[var(--icon-yellow-text)]">Outstanding</p>
                <p className="text-xl font-bold text-[var(--icon-yellow-text)] mt-1">{formatCurrency(enhancedStats.outstanding)}</p>
              </div>
              <button
                onClick={() => navigate(`/dashboard/billing/patient/${patient.id}`)}
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-colors text-xs font-semibold"
              >
                <TrendingUp className="w-3.5 h-3.5" /> View Detailed Billing
              </button>
            </div>
          )}

          {/* ============ DOCUMENTS ============ */}
          {activeTab === 'documents' && (
            <div>
              {documentsLoading ? (
                <div className="text-center py-10">
                  <Loader className="w-6 h-6 text-[var(--icon-cyan-text)] animate-spin mx-auto mb-2" />
                  <p className="text-xs text-[var(--text-tertiary)]">Loading documents…</p>
                </div>
              ) : documents.length === 0 ? (
                <EmptyState
                  icon={File}
                  title="No documents found"
                  hint="Documents appear here when generated (receipts, prescriptions, lab results, etc.)"
                />
              ) : (
                <div className="space-y-3">
                  {Array.from(
                    documents.reduce((map, doc) => {
                      const key = doc.entityId;
                      if (!map.has(key)) map.set(key, []);
                      map.get(key)!.push(doc);
                      return map;
                    }, new Map<string, GeneratedDocument[]>()).entries()
                  ).map(([entityId, docs]) => {
                    const att = patientAttendances.find(a => a.id === entityId);
                    const displayName = att
                      ? `${att.attendanceNumber || 'Visit'} - ${formatDate(att.dateTime || att.createdAt)}`
                      : `Group ${entityId.slice(-8)}`;
                    return (
                      <div key={entityId} className="border border-[var(--border-color)] rounded-lg overflow-hidden">
                        <div className="bg-[var(--bg-main)] px-3 py-2 border-b border-[var(--border-color)] flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-[var(--icon-cyan-text)]" />
                          <span className="text-xs font-semibold text-[var(--text-primary)]">{displayName}</span>
                          {att && (
                            <span className="text-[10px] text-[var(--text-tertiary)] ml-auto">
                              {formatDateTime(att.dateTime || att.createdAt)}
                            </span>
                          )}
                        </div>
                        <div className="divide-y divide-[var(--border-color)]">
                          {docs.map(doc => (
                            <div key={doc.id} className="px-3 py-2.5 hover:bg-[var(--bg-main)] transition-colors flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${
                                  doc.template?.templateType === 'receipt' ? 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]'
                                    : doc.template?.templateType === 'prescription' ? 'bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)]'
                                      : doc.template?.templateType === 'lab_result' ? 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]'
                                        : doc.template?.templateType === 'discharge_summary' ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]'
                                          : 'bg-[var(--bg-main)] text-[var(--text-secondary)]'
                                }`}>
                                  {getDocumentIcon(doc.template?.templateType || '')}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-semibold text-[var(--text-primary)]">
                                      {getDocumentTypeLabel(doc.template?.templateType || '')}
                                    </span>
                                    <span className="text-[10px] text-[var(--text-tertiary)]">
                                      {doc.template?.name || 'Document'}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
                                    {formatDate(doc.generatedAt)} • {doc.generatedBy?.fullName || 'System'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  onClick={() => handleDownloadDocument(doc)}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-md hover:bg-[var(--icon-cyan-text)] hover:text-white transition-colors text-[10px] font-semibold"
                                >
                                  <Download className="w-3 h-3" /> Download
                                </button>
                                <button
                                  onClick={() => window.open(`/documents/download/${doc.id}`, '_blank')}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--bg-main)] text-[var(--text-secondary)] rounded-md hover:bg-[var(--border-color)] transition-colors text-[10px] font-semibold border border-[var(--border-color)]"
                                >
                                  <Printer className="w-3 h-3" /> Print
                                </button>
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

      {/* ============ DELETE MODAL ============ */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-card)] rounded-xl p-5 max-w-sm w-full border border-[var(--border-color)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-[var(--icon-red-bg)] rounded-lg flex items-center justify-center">
                <Trash2 className="w-4 h-4 text-[var(--icon-red-text)]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Delete Patient</h3>
                <p className="text-[11px] text-[var(--text-tertiary)]">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mb-4">
              Are you sure you want to delete <strong className="text-[var(--text-primary)]">{getPatientFullName(patient)}</strong>?
              All patient records and visits will be permanently removed.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDeletePatient}
                className="flex-1 px-3 py-2 bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] rounded-lg hover:bg-[var(--icon-red-text)] hover:text-white transition-colors font-semibold text-xs"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteConfirm(false)}
                className="flex-1 px-3 py-2 bg-[var(--bg-main)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--border-color)] transition-colors font-semibold text-xs border border-[var(--border-color)]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ MEDICAL DETAILS MODAL ============ */}
      {showMedicalDetails && selectedAttendance && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-card)] rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-[var(--border-color)]">
            <div className="px-4 py-3 border-b border-[var(--border-color)] flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-sm font-bold text-[var(--text-primary)]">Medical Records</h2>
                <p className="text-[11px] text-[var(--text-tertiary)]">
                  Visit: {formatDateTime(selectedAttendance.dateTime || selectedAttendance.createdAt)}
                </p>
              </div>
              <button
                onClick={() => { setShowMedicalDetails(false); setSelectedAttendance(null); }}
                className="p-1.5 hover:bg-[var(--bg-main)] rounded-md transition-colors"
              >
                <X className="w-4 h-4 text-[var(--text-secondary)]" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto">
              {selectedAttendance.diagnoses?.length > 0 && (
                <section>
                  <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Stethoscope className="w-3.5 h-3.5 text-[var(--icon-cyan-text)]" /> Diagnoses
                  </h3>
                  <div className="space-y-1.5">
                    {selectedAttendance.diagnoses.map((d: any, i: number) => (
                      <div key={i} className="bg-[var(--bg-main)] rounded-md p-2.5 border border-[var(--border-color)]">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium text-[var(--text-primary)]">
                            {d.Diagnosis?.name || d.diagnosis?.name || d.icdCode}
                          </p>
                          {d.diagnosisType === 'primary' && (
                            <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]">
                              Primary
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
                          ICD-10: {d.icdCode || d.Diagnosis?.icdCode || d.diagnosis?.icdCode}
                        </p>
                        {d.notes && <p className="text-[11px] text-[var(--text-secondary)] mt-1">{d.notes}</p>}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {selectedAttendance.medications?.length > 0 && (
                <section>
                  <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Pill className="w-3.5 h-3.5 text-[var(--icon-green-text)]" /> Medications
                  </h3>
                  <div className="space-y-1.5">
                    {selectedAttendance.medications.map((m: Medication, i: number) => (
                      <div key={i} className="bg-[var(--bg-main)] rounded-md p-2.5 border border-[var(--border-color)]">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium text-[var(--text-primary)]">{m.name}</p>
                          <StatusBadge status={m.status} />
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                          {m.dosage} • {m.frequency} • {m.duration}
                        </p>
                        {m.instructions && (
                          <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">Instructions: {m.instructions}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {selectedAttendance.labTests?.length > 0 && (
                <section>
                  <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <FlaskConical className="w-3.5 h-3.5 text-[var(--icon-purple-text)]" /> Lab Tests
                  </h3>
                  <div className="space-y-1.5">
                    {selectedAttendance.labTests.map((t: LabTest, i: number) => (
                      <div key={i} className="bg-[var(--bg-main)] rounded-md p-2.5 border border-[var(--border-color)]">
                        <p className="text-xs font-medium text-[var(--text-primary)]">
                          {t.LabTestTemplate?.name || t.ServiceCatalog?.name || 'Lab Test'}
                        </p>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-[11px] text-[var(--text-secondary)]">
                            Status: <span className="font-medium">{t.status}</span>
                          </span>
                          {t.result && (
                            <button
                              className="text-[10px] text-[var(--icon-cyan-text)] hover:underline font-medium"
                              onClick={() => window.open(`/api/documents/lab/${t.id}`)}
                            >
                              View Result
                            </button>
                          )}
                        </div>
                        {t.result && (
                          <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                            {typeof t.result === 'object' ? JSON.stringify(t.result) : t.result}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {selectedAttendance.procedures?.length > 0 && (
                <section>
                  <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Scissors className="w-3.5 h-3.5 text-[var(--icon-yellow-text)]" /> Procedures
                  </h3>
                  <div className="space-y-1.5">
                    {selectedAttendance.procedures.map((p: Procedure, i: number) => (
                      <div key={i} className="bg-[var(--bg-main)] rounded-md p-2.5 border border-[var(--border-color)]">
                        <p className="text-xs font-medium text-[var(--text-primary)]">
                          {p.ProcedureTemplate?.name || p.name}
                        </p>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-[11px] text-[var(--text-secondary)]">Status: {p.status}</span>
                          {p.performedAt && (
                            <span className="text-[10px] text-[var(--text-tertiary)]">
                              Performed: {formatDate(p.performedAt)}
                            </span>
                          )}
                        </div>
                        {p.notes && <p className="text-[11px] text-[var(--text-secondary)] mt-1">Notes: {p.notes}</p>}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {selectedAttendance.scans?.length > 0 && (
                <section>
                  <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Microscope className="w-3.5 h-3.5 text-[var(--icon-blue-text)]" /> Scans & Imaging
                  </h3>
                  <div className="space-y-1.5">
                    {selectedAttendance.scans.map((s: Scan, i: number) => (
                      <div key={i} className="bg-[var(--bg-main)] rounded-md p-2.5 border border-[var(--border-color)]">
                        <p className="text-xs font-medium text-[var(--text-primary)]">
                          {s.scanType} - {s.bodyPart || 'General'}
                        </p>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-[11px] text-[var(--text-secondary)]">Status: {s.status}</span>
                          {s.imageUrls && s.imageUrls.length > 0 && (
                            <button className="text-[10px] text-[var(--icon-cyan-text)] hover:underline font-medium">
                              View Images ({s.imageUrls.length})
                            </button>
                          )}
                        </div>
                        {s.findings && <p className="text-[11px] text-[var(--text-secondary)] mt-1">Findings: {s.findings}</p>}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {selectedAttendance.vitals?.length > 0 && (
                <section>
                  <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-[var(--icon-red-text)]" /> Vitals
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {selectedAttendance.vitals.map((v: Vitals, i: number) => (
                      <div key={i} className="bg-[var(--bg-main)] rounded-md p-2.5 border border-[var(--border-color)]">
                        <p className="text-[10px] text-[var(--text-tertiary)]">{formatDateTime(v.recordedAt)}</p>
                        {v.bloodPressure && <p className="text-[11px] font-medium text-[var(--text-primary)]">BP: {v.bloodPressure}</p>}
                        {v.temperature && <p className="text-[11px] text-[var(--text-secondary)]">Temp: {v.temperature}°C</p>}
                        {v.pulse && <p className="text-[11px] text-[var(--text-secondary)]">Pulse: {v.pulse} bpm</p>}
                        {v.spo2 && <p className="text-[11px] text-[var(--text-secondary)]">SpO₂: {v.spo2}%</p>}
                        {v.weight && v.height && <p className="text-[11px] text-[var(--text-secondary)]">BMI: {v.bmi}</p>}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {selectedAttendance.complaints && (
                <section>
                  <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wide mb-2">Chief Complaints</h3>
                  <p className="text-[11px] text-[var(--text-secondary)] bg-[var(--bg-main)] rounded-md p-2.5 border border-[var(--border-color)]">
                    {selectedAttendance.complaints}
                  </p>
                </section>
              )}
              {selectedAttendance.medicalNotes && (
                <section>
                  <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wide mb-2">Clinical Notes</h3>
                  <p className="text-[11px] text-[var(--text-secondary)] bg-[var(--bg-main)] rounded-md p-2.5 border border-[var(--border-color)]">
                    {selectedAttendance.medicalNotes}
                  </p>
                </section>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============ ATTENDANCE MODAL ============ */}
      {showAttendanceModal && (
        <NewAttendanceModal
          patientId={patient.id}
          onSuccess={handleAttendanceSuccess}
          onClose={() => setShowAttendanceModal(false)}
        />
      )}
    </div>
  );
}