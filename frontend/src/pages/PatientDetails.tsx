// src/pages/PatientDetails.tsx - COMPACT REDESIGNED VERSION
import { getPatientName as resolvePatientName, getPatientFolderNumber, getAttendanceNumber } from '../utils/patient';
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useSmartBack } from '../utils/useSmartBack';
import { usePatientStore } from '../store/patientStore';
import { useAttendanceStore } from '../store/attendanceStore';
import { useAuthStore } from '../store/authStore';
import { useInsuranceStore } from '../store/insuranceStore';
import { useToast } from '../store/toastStore';
import { getBills, getVitalsForEncounters } from '../api';
import NewAttendanceModal from '../components/NewAttendanceModal';
import { CompactAdditionalInfo } from '../components/patients/CompactAdditionalInfo';
import { PatientAvatar } from '../components/patients/PatientAvatar';
import { VitalsTrendGraph } from '../components/vitals/VitalsTrendGraph';
import {
  ArrowLeft, Edit, Calendar, Users, Pill, FlaskConical, Scissors, Syringe,
  DollarSign, RefreshCw, AlertCircle, Loader, Trash2, Eye, Clock,
  CheckCircle, Activity, File, Download, Printer, ChevronRight,
  Stethoscope, Microscope, Heart, AlertTriangle,
  Phone, MapPin, CreditCard,
  Receipt, ClipboardList, FileText, X, TrendingUp
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Badge, Button, cn, humanStatus, LinkButton, PageHeader, StatCard, statusTone,
  TABLE_SHELL, TD, TD_MUTED, TH, TH_ROW, TR,
  type Accent,
} from '../components/ui';
import type { Attendance, LabTest, Medication, Procedure, Scan, Vitals } from '../types';
import { useDocumentStore } from '../store/documentStore';
import type { GeneratedDocument } from '../types/documents';
import { getScanDisplayName, humanScanModality } from '../utils/scan';
import ImmunizationPanel from '../components/patients/ImmunizationPanel';
import PatientIdCardPrint from '../components/patients/PatientIdCardPrint';

// ============ HELPERS ============
const formatCurrency = (amount: unknown): string => {
  if (amount === null || amount === undefined) return '₵0.00';
  const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  if (!Number.isFinite(num)) return '₵0.00';
  return `₵${num.toFixed(2)}`;
};

// ============ STATUS BADGE ============
const LOCAL_STATUS_TONES: Record<string, Accent> = {
  prescribed: 'purple',
  requested: 'yellow',
  scheduled: 'cyan',
};
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const key = status?.toLowerCase() ?? '';
  return (
    <Badge tone={LOCAL_STATUS_TONES[key] ?? statusTone(status)} dot size="sm">
      {humanStatus(status || 'pending')}
    </Badge>
  );
};

// ============ TABLE PRIMITIVES ============
const Table: React.FC<{ heads: string[]; children: React.ReactNode }> = ({ heads, children }) => (
  <div className={TABLE_SHELL}>
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className={TH_ROW}>
          <tr>{heads.map(h => (<th key={h} className={cn(TH, 'px-3 py-2')}>{h}</th>))}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  </div>
);
const TdPrimary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <td className={cn(TD, 'px-3 py-2 text-xs font-medium whitespace-normal')}>{children}</td>
);
const Td: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <td className={cn(TD_MUTED, 'px-3 py-2 text-xs whitespace-normal', className)}>{children}</td>
);

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
  const goBack = useSmartBack('/dashboard/patients');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const { currentPatient, fetchPatient, deletePatient } = usePatientStore();
  const { attendances, getAttendances } = useAttendanceStore();
  const { hasRole } = useAuthStore();
  const { getInsuranceProviders } = useInsuranceStore();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'profile' | 'documents' | 'attendances' | 'medical-records' | 'overview' | 'diagnoses' | 'medications' | 'lab-tests' | 'procedures' | 'vitals' | 'billing' | 'immunizations'>(searchParams.get('tab') === 'immunizations' ? 'immunizations' : 'overview');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState<Attendance | null>(null);
  const [showMedicalDetails, setShowMedicalDetails] = useState(false);
  const [stats, setStats] = useState({ totalVisits: 0, completedVisits: 0, pendingVisits: 0, totalMedications: 0, totalLabTests: 0 });
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [returnToImmunizations, setReturnToImmunizations] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [showPatientIdCard, setShowPatientIdCard] = useState(false);
  const [vitalsList, setVitalsList] = useState<any[]>([]);
  const [patientBills, setPatientBills] = useState<any[]>([]);
  const [billsLoading, setBillsLoading] = useState(false);
  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const { getDocumentsByEntity, downloadDocument } = useDocumentStore();
  const patient = useMemo(() => {
    if (!currentPatient) return null;
    if (currentPatient.data) return currentPatient.data;
    if (currentPatient.success && currentPatient.data) return currentPatient.data;
    return currentPatient;
  }, [currentPatient]);
  const getPatientFullName = (p: any) => resolvePatientName(p);
  const patientAttendances = useMemo(() => {
    if (!patient || !attendances.length) return [];
    const patientId = patient.id;
    const filtered = attendances.filter((a: any) => a.patientId === patientId || a.patient?.id === patientId || a.Patient?.id === patientId);
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
        out.push(...att[key].map((x: any) => ({ ...x, attendanceId: att.id, attendanceDate: att.dateTime || att.createdAt, attendanceNumber: att.attendanceNumber })));
      }
    });
    return out.sort((a, b) => new Date(b.attendanceDate).getTime() - new Date(a.attendanceDate).getTime());
  };
  const allDiagnoses = useMemo(() => aggregate('diagnoses'), [patientAttendances]);
  const allMedications = useMemo(() => aggregate('medications'), [patientAttendances]);
  const medicationAttendanceGroups = useMemo(() => patientAttendances
    .filter(att => Array.isArray(att.medications) && att.medications.length > 0)
    .slice()
    .sort((a, b) => new Date(b.dateTime || b.createdAt).getTime() - new Date(a.dateTime || a.createdAt).getTime()), [patientAttendances]);
  const billsByAttendance = useMemo(() => {
    const grouped = new Map<string, any[]>();
    patientBills.forEach((bill: any) => {
      const attendanceId = bill.attendanceId || bill.Attendance?.id || bill.attendance?.id;
      if (!attendanceId) return;
      if (!grouped.has(attendanceId)) grouped.set(attendanceId, []);
      grouped.get(attendanceId)!.push(bill);
    });
    return grouped;
  }, [patientBills]);
  const allLabTests = useMemo(() => aggregate('labTests'), [patientAttendances]);
  const allProcedures = useMemo(() => aggregate('procedures'), [patientAttendances]);
  const enhancedStats = useMemo(() => {
    const totalVisits = patientAttendances.length;
    const completedVisits = patientAttendances.filter(a => a.status === 'completed').length;
    const pendingVisits = patientAttendances.filter(a => ['pending', 'active', 'in-progress'].includes(a.status)).length;
    const admittedVisits = patientAttendances.filter(a => a.status === 'admitted').length;
    const totalBilled = patientAttendances.reduce((s, a) => s + (a.totalBill || 0), 0);
    const totalPaid = patientAttendances.reduce((s, a) => s + (a.paidAmount || 0), 0);
    return { totalVisits, completedVisits, pendingVisits, admittedVisits, totalBilled, totalPaid, outstanding: totalBilled - totalPaid };
  }, [patientAttendances]);
  const loadAllVitals = async () => {
    const byVisit = new Map<string, Attendance>(patientAttendances.map((att) => [att.id, att] as [string, Attendance]));
    try {
      const rows = await getVitalsForEncounters(patientAttendances.map((att) => att.id));
      const all = (Array.isArray(rows) ? rows : []).filter((v: any) => byVisit.has(v.attendanceId)).map((v: any) => {
        const att = byVisit.get(v.attendanceId)!;
        return { ...v, attendanceId: att.id, attendanceDate: att.dateTime || att.createdAt, attendanceNumber: att.attendanceNumber };
      });
      setVitalsList(all.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()));
    } catch (e) { console.error('Vitals batch load error', e); setVitalsList([]); }
  };
  const latestVitals = vitalsList[0] || null;
  const hasAbnormalVitals = useMemo(() => {
    if (!latestVitals) return false;
    try {
      const bp = latestVitals.bloodPressure;
      if (bp) { const [sys] = String(bp).split('/').map(Number); if (sys > 140 || sys < 90) return true; }
      if (latestVitals.temperature != null && (latestVitals.temperature > 38 || latestVitals.temperature < 35)) return true;
      if (latestVitals.pulse != null && (latestVitals.pulse > 100 || latestVitals.pulse < 60)) return true;
      if (latestVitals.spo2 != null && latestVitals.spo2 < 95) return true;
    } catch { /* noop */ }
    return false;
  }, [latestVitals]);
  const loadData = async () => {
    if (!id) { toastError('Error', 'No patient ID provided'); setIsLoading(false); return; }
    setIsLoading(true); setRefreshing(true);
    try {
      const fetched = await fetchPatient(id);
      if (fetched) { await Promise.all([getAttendances({ patientId: id }), getInsuranceProviders()]); }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Could not load patient data';
      toastError('Load failed', msg);
      if (err.response?.status === 404) goBack();
    } finally { setIsLoading(false); setRefreshing(false); }
  };
  const loadDocuments = async () => {
    if (!patient?.id) return;
    setDocumentsLoading(true);
    try { const docs = await getDocumentsByEntity('Patient', patient.id); setDocuments(docs); }
    catch (e) { console.error('Failed to load documents:', e); }
    finally { setDocumentsLoading(false); }
  };
  useEffect(() => { loadData(); }, [id, refreshTrigger]);
  useEffect(() => {
    const totalVisits = patientAttendances.length;
    const completedVisits = patientAttendances.filter(a => a.status === 'completed').length;
    const pendingVisits = patientAttendances.filter(a => ['pending', 'active', 'in-progress'].includes(a.status)).length;
    const totalMedications = patientAttendances.reduce((s, a) => s + (a.medications?.length || 0), 0);
    const totalLabTests = patientAttendances.reduce((s, a) => s + (a.labTests?.length || 0), 0);
    setStats({ totalVisits, completedVisits, pendingVisits, totalMedications, totalLabTests });
  }, [patientAttendances]);
  useEffect(() => { if (patientAttendances.length > 0) loadAllVitals(); }, [patientAttendances]);
  useEffect(() => {
    if (!patient?.id) { setPatientBills([]); return; }
    let cancelled = false;
    setBillsLoading(true);
    getBills({ patientId: patient.id, limit: 1000 })
      .then((response: any) => {
        const rows = Array.isArray(response) ? response : response?.bills || response?.data?.bills || response?.data?.data || response?.data || [];
        if (!cancelled) setPatientBills(Array.isArray(rows) ? rows : []);
      })
      .catch((err: any) => { console.error('Patient billing history load failed', err); if (!cancelled) setPatientBills([]); })
      .finally(() => { if (!cancelled) setBillsLoading(false); });
    return () => { cancelled = true; };
  }, [patient?.id]);
  useEffect(() => { if ((activeTab === 'documents' || activeTab === 'overview') && patient?.id) loadDocuments(); }, [activeTab, patient?.id]);
  const handleAttendanceSuccess = async () => {
    setShowAttendanceModal(false);
    try {
      await getAttendances({ patientId: patient?.id || id });
      setActiveTab(returnToImmunizations ? 'immunizations' : 'attendances');
      setReturnToImmunizations(false);
      setRefreshTrigger(p => p + 1);
      success('Check-in complete', 'New visit created');
    } catch { toastError('Refresh failed', 'Could not update visit list'); }
  };
  const handleEdit = () => navigate(`/dashboard/patients/register?edit=true&id=${patient?.id}`);
  const handleNewAttendance = () => setShowAttendanceModal(true);
  const handleCreateImmunizationAttendance = () => { setReturnToImmunizations(true); setShowAttendanceModal(true); };
  const handleDeletePatient = async () => {
    if (!patient?.id) return;
    try { await deletePatient(patient.id); success('Patient Deleted', 'Patient record has been removed'); navigate('/dashboard/patients'); }
    catch (err: any) { toastError('Delete Failed', err.message || 'Failed to delete patient'); }
  };
  const viewMedicalDetails = (attendance: Attendance) => { setSelectedAttendance(attendance); setShowMedicalDetails(true); };
  const handleDownloadDocument = async (doc: GeneratedDocument) => {
    try {
      const blob = await downloadDocument(doc.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `${doc.template?.code || 'document'}-${doc.entityId}.pdf`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      success('Download started', 'Document is being downloaded');
    } catch { toastError('Download Failed', 'Could not download document'); }
  };
  const handlePrintDocument = async (doc: GeneratedDocument) => {
    const printWindow = window.open('', '_blank');
    try {
      const blob = await downloadDocument(doc.id);
      const url = window.URL.createObjectURL(blob);
      if (!printWindow) { window.URL.revokeObjectURL(url); toastError('Print Blocked', 'Allow pop-ups for this site to print documents'); return; }
      printWindow.opener = null; printWindow.location.href = url;
      printWindow.addEventListener('load', () => { window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000); }, { once: true });
    } catch { printWindow?.close(); toastError('Print Failed', 'Could not open document for printing'); }
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
    const labels: Record<string, string> = { receipt: 'Payment Receipt', prescription: 'Prescription', lab_result: 'Lab Result', discharge_summary: 'Discharge Summary', referral_letter: 'Referral Letter', admission_letter: 'Admission Letter', scan_report: 'Scan Report', nhia_claim_form: 'NHIS Claim Form' };
    return labels[templateType] || 'Document';
  };
  const formatDate = (d: string) => {
    try { if (!d) return '—'; const dt = new Date(d); if (isNaN(dt.getTime())) return 'Invalid'; return dt.toLocaleDateString('en-GH', { year: 'numeric', month: 'short', day: 'numeric' }); }
    catch { return '—'; }
  };
  const formatDateTime = (d: string) => {
    try { if (!d) return '—'; const dt = new Date(d); if (isNaN(dt.getTime())) return 'Invalid'; return dt.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return '—'; }
  };
  const canEdit = hasRole(['admin', 'doctor', 'nurse', 'midwife', 'records']);
  const canCreateAttendance = hasRole(['admin', 'doctor', 'nurse', 'midwife', 'records']);
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
    { id: 'immunizations' as const, label: 'Vaccines', icon: Syringe, count: 0 },
  ];
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
  if (!patient) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
        <div className="text-center bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-8 max-w-sm w-full">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[var(--icon-red-bg)] flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-[var(--icon-red-text)]" />
          </div>
          <h2 className="text-base font-bold text-[var(--text-primary)] mb-1">Patient Not Found</h2>
          <p className="text-xs text-[var(--text-secondary)] mb-5">The patient record does not exist or has been removed.</p>
          <Button variant="soft" accent="cyan" size="sm" icon={ArrowLeft} onClick={goBack}>Back</Button>
        </div>
      </div>
    );
  }

  // ============ MAIN ============
  return (
    <div className="space-y-4 p-4 lg:p-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Patient Details"
        meta={`Record #${getPatientFolderNumber(patient) || patient.id?.slice(-8)}`}
        icon={Users}
        accent="cyan"
        backTo="/dashboard/patients"
        actions={(
          <>
            <Button size="sm" variant="soft" accent="purple" icon={Printer} onClick={() => setShowPatientIdCard(true)}><span className="hidden sm:inline">Print ID card</span></Button>
            <Button size="sm" icon={RefreshCw} loading={refreshing} onClick={loadData}><span className="hidden sm:inline">Refresh</span></Button>
            {canCreateAttendance && (<Button size="sm" variant="soft" accent="green" icon={Calendar} onClick={handleNewAttendance}><span className="hidden sm:inline">New Visit</span></Button>)}
            {canEdit && (<Button size="sm" variant="soft" accent="cyan" icon={Edit} onClick={handleEdit}><span className="hidden sm:inline">Edit</span></Button>)}
            {canDelete && (<Button size="sm" variant="dangerSoft" icon={Trash2} onClick={() => setDeleteConfirm(true)}><span className="hidden sm:inline">Delete</span></Button>)}
          </>
        )}
      />

      {/* ============ PATIENT HERO CARD — REDESIGNED ============ */}
      <div className="overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]">
        <div className="h-1 bg-[var(--icon-cyan-text)]/70" />
        <div className="flex flex-wrap items-center gap-3 px-3 pt-3">
          <PatientAvatar patient={patient} size="lg" className="rounded-xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-xl font-bold leading-tight text-[var(--text-primary)]">{getPatientFullName(patient)}</h2>
              <Badge tone={patient.gender?.toLowerCase() === 'male' ? 'cyan' : patient.gender?.toLowerCase() === 'female' ? 'purple' : 'neutral'} size="sm">{patient.gender || 'Unknown'}</Badge>
              <Badge tone="green" size="sm">{patient.paymentMode || 'Cash'}</Badge>
              {hasAbnormalVitals && (<Badge tone="red" size="sm" dot>Abnormal vitals</Badge>)}
              {enhancedStats.outstanding > 0 && (<Badge tone="yellow" size="sm">Outstanding {formatCurrency(enhancedStats.outstanding)}</Badge>)}
            </div>
            <p className="mt-1 truncate text-xs text-[var(--text-tertiary)]">{patient.address || 'No address on file'}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Folder #</p>
            <p className="text-lg font-bold leading-tight text-[var(--text-primary)]">{getPatientFolderNumber(patient) || '—'}</p>
            <p className="text-[11px] text-[var(--text-tertiary)]">Reg. {formatDate(patient.createdAt)}</p>
          </div>
        </div>
        <dl className="mt-3 grid grid-cols-2 divide-y divide-[var(--border-color)] border-t border-[var(--border-color)] bg-[var(--bg-main)]/40 sm:grid-cols-3 sm:divide-y-0 lg:grid-cols-6 lg:divide-x">
          <div className="px-3 py-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Age</dt>
            <dd className="mt-0.5 truncate text-sm font-semibold text-[var(--text-primary)]">{patient.ageDisplay || `${patient.age || 'N/A'} yrs`}</dd>
            <dd className="truncate text-[11px] text-[var(--text-tertiary)]">DOB {formatDate(patient.dateOfBirth)}</dd>
          </div>
          <div className="px-3 py-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Gender</dt>
            <dd className="mt-0.5 truncate text-sm font-semibold capitalize text-[var(--text-primary)]">{patient.gender || 'Unknown'}</dd>
            <dd className="truncate text-[11px] text-[var(--text-tertiary)]">Record #{patient.id?.slice(-8)}</dd>
          </div>
          <div className="px-3 py-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Contact</dt>
            <dd className="mt-0.5 truncate text-sm font-semibold text-[var(--text-primary)]">{patient.contact || 'No contact'}</dd>
            <dd className="truncate text-[11px] text-[var(--text-tertiary)]">{patient.additionalInfo?.email || 'No email on file'}</dd>
          </div>
          <div className="px-3 py-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Payment</dt>
            <dd className="mt-0.5 truncate text-sm font-semibold text-[var(--text-primary)]">{patient.paymentMode || 'Cash'}</dd>
            <dd className="truncate text-[11px] text-[var(--text-tertiary)]">{patient.additionalInfo?.nhisNumber ? `NHIS ${patient.additionalInfo.nhisNumber}` : 'No scheme number'}</dd>
          </div>
          <div className="px-3 py-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Address</dt>
            <dd className="mt-0.5 truncate text-sm font-semibold text-[var(--text-primary)]">{patient.address || 'Not recorded'}</dd>
            <dd className="truncate text-[11px] text-[var(--text-tertiary)]">Home address</dd>
          </div>
          <div className="px-3 py-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Registered</dt>
            <dd className="mt-0.5 truncate text-sm font-semibold text-[var(--text-primary)]">{formatDate(patient.createdAt)}</dd>
            <dd className="truncate text-[11px] text-[var(--text-tertiary)]">{enhancedStats.totalVisits} visit{enhancedStats.totalVisits === 1 ? '' : 's'} on file</dd>
          </div>
        </dl>
      </div>

      {/* ============ STATS BAR ============ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <StatCard label="Visits" value={enhancedStats.totalVisits} icon={Calendar} accent="cyan" />
        <StatCard label="Completed" value={enhancedStats.completedVisits} icon={CheckCircle} accent="green" />
        <StatCard label="Pending" value={enhancedStats.pendingVisits} icon={Clock} accent="yellow" />
        <StatCard label="Meds" value={allMedications.length} icon={Pill} accent="purple" />
        <StatCard label="Labs" value={allLabTests.length} icon={FlaskConical} accent="blue" />
        <StatCard label="Outstanding" size="money" value={formatCurrency(enhancedStats.outstanding)} icon={DollarSign} accent="red" />
      </div>

      {/* ============ TABS ============ */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
        <div className="border-b border-[var(--border-color)] overflow-x-auto scrollbar-thin">
          <nav className="flex gap-1 p-2 min-w-max">
            {tabs.map(tab => {
              const Icon = tab.icon; const active = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${active ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)]'}`}>
                  <Icon className="w-3.5 h-3.5" />{tab.label}
                  {tab.count > 0 && (<span className={`ml-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${active ? 'bg-[var(--icon-cyan-text)]/15 text-[var(--icon-cyan-text)]' : 'bg-[var(--bg-main)] text-[var(--text-tertiary)]'}`}>{tab.count}</span>)}
                </button>
              );
            })}
          </nav>
        </div>
        <div className="p-4">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="bg-[var(--bg-main)] rounded-lg p-4 border border-[var(--border-color)]">
                <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wide mb-3 flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-[var(--icon-cyan-text)]" /> Patient Info</h3>
                <InfoRow label="Full Name" value={getPatientFullName(patient)} />
                <InfoRow label="Folder #" value={getPatientFolderNumber(patient) || 'N/A'} />
                <InfoRow label="Gender" value={patient.gender || 'N/A'} />
                <InfoRow label="DOB" value={formatDate(patient.dateOfBirth)} />
                <InfoRow label="Age" value={patient.ageDisplay || `${patient.age || 'N/A'} yrs`} />
                <InfoRow label="Contact" value={patient.contact || 'N/A'} />
                <InfoRow label="Payment" value={patient.paymentMode || 'Cash'} />
              </div>
              <div className="bg-[var(--bg-main)] rounded-lg p-4 border border-[var(--border-color)]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wide flex items-center gap-1.5"><Heart className="w-3.5 h-3.5 text-[var(--icon-red-text)]" /> Latest Vitals</h3>
                  {hasAbnormalVitals && (<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]"><AlertTriangle className="w-3 h-3" /> Abnormal</span>)}
                </div>
                {latestVitals ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      {latestVitals.bloodPressure && (<div className="bg-[var(--bg-card)] rounded-md p-2 border border-[var(--border-color)]"><p className="text-[10px] text-[var(--text-tertiary)] uppercase">BP</p><p className="text-sm font-bold text-[var(--text-primary)]">{latestVitals.bloodPressure}</p><p className="text-[10px] text-[var(--text-tertiary)]">mmHg</p></div>)}
                      {latestVitals.temperature && (<div className="bg-[var(--bg-card)] rounded-md p-2 border border-[var(--border-color)]"><p className="text-[10px] text-[var(--text-tertiary)] uppercase">Temp</p><p className="text-sm font-bold text-[var(--text-primary)]">{latestVitals.temperature}°</p><p className="text-[10px] text-[var(--text-tertiary)]">Celsius</p></div>)}
                      {latestVitals.pulse && (<div className="bg-[var(--bg-card)] rounded-md p-2 border border-[var(--border-color)]"><p className="text-[10px] text-[var(--text-tertiary)] uppercase">Pulse</p><p className="text-sm font-bold text-[var(--text-primary)]">{latestVitals.pulse}</p><p className="text-[10px] text-[var(--text-tertiary)]">bpm</p></div>)}
                      {latestVitals.spo2 && (<div className="bg-[var(--bg-card)] rounded-md p-2 border border-[var(--border-color)]"><p className="text-[10px] text-[var(--text-tertiary)] uppercase">SpO₂</p><p className="text-sm font-bold text-[var(--text-primary)]">{latestVitals.spo2}%</p><p className="text-[10px] text-[var(--text-tertiary)]">Oxygen</p></div>)}
                    </div>
                    <p className="text-[10px] text-[var(--text-tertiary)] mt-3 text-center">Recorded {formatDateTime(latestVitals.recordedAt)}</p>
                  </>
                ) : (<p className="text-xs text-[var(--text-tertiary)] text-center py-4">No vitals recorded</p>)}
              </div>
              <div className="bg-[var(--bg-main)] rounded-lg p-4 border border-[var(--border-color)]">
                <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wide mb-3 flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 text-[var(--icon-green-text)]" /> Financial</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-[var(--bg-card)] rounded-md p-2.5 border border-[var(--border-color)]"><span className="text-xs text-[var(--text-secondary)]">Billed</span><span className="text-sm font-bold text-[var(--text-primary)]">{formatCurrency(enhancedStats.totalBilled)}</span></div>
                  <div className="flex items-center justify-between bg-[var(--bg-card)] rounded-md p-2.5 border border-[var(--border-color)]"><span className="text-xs text-[var(--text-secondary)]">Paid</span><span className="text-sm font-bold text-[var(--icon-green-text)]">{formatCurrency(enhancedStats.totalPaid)}</span></div>
                  <div className="flex items-center justify-between bg-[var(--icon-yellow-bg)] rounded-md p-2.5 border border-[var(--icon-yellow-text)]/20"><span className="text-xs font-semibold text-[var(--icon-yellow-text)]">Outstanding</span><span className="text-sm font-bold text-[var(--icon-yellow-text)]">{formatCurrency(enhancedStats.outstanding)}</span></div>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]"><Users className="h-4 w-4 text-[var(--icon-cyan-text)]" /> Basic information</h3>
                  <InfoRow label="Full Name" value={getPatientFullName(patient)} />
                  <InfoRow label="Folder Number" value={getPatientFolderNumber(patient) || 'N/A'} />
                  <InfoRow label="Gender" value={patient.gender || 'N/A'} />
                  <InfoRow label="Date of Birth" value={formatDate(patient.dateOfBirth)} />
                  <InfoRow label="Age" value={patient.ageDisplay || `${patient.age || 'N/A'} years`} />
                </div>
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]"><MapPin className="h-4 w-4 text-[var(--icon-cyan-text)]" /> Contact information</h3>
                  <InfoRow label="Contact" value={patient.contact || 'N/A'} />
                  <InfoRow label="Address" value={patient.address || 'No address'} />
                  {patient.additionalInfo?.email && (<InfoRow label="Email" value={patient.additionalInfo.email} />)}
                </div>
              </div>
              <CompactAdditionalInfo patient={patient} />
            </div>
          )}

          {activeTab === 'attendances' && (
            <div>
              {patientAttendances.length === 0 ? (
                <EmptyState icon={Calendar} title="No visits yet" hint="This patient has no recorded visits." action={canCreateAttendance && (<Button size="sm" variant="soft" accent="green" icon={Calendar} onClick={handleNewAttendance}>Create First Visit</Button>)} />
              ) : (
                <div className="space-y-2.5">
                  {patientAttendances.map(att => (
                    <div key={att.id} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:border-[var(--icon-cyan-text)] transition-colors">
                      <div className="p-3">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-[var(--icon-cyan-bg)] flex items-center justify-center shrink-0"><Calendar className="w-4 h-4 text-[var(--icon-cyan-text)]" /></div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap"><span className="text-sm font-semibold text-[var(--text-primary)]">{getAttendanceNumber(att) || `Visit ${formatDate(att.dateTime)}`}</span><StatusBadge status={att.status} /></div>
                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[var(--text-tertiary)]"><span>{formatDateTime(att.dateTime || att.createdAt)}</span><span>•</span><span className="capitalize">{att.attendanceType?.replace(/_/g, ' ')}</span><span>•</span><span className="capitalize">{att.paymentMode}</span></div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <LinkButton size="xs" variant="soft" accent="cyan" icon={Eye} to={`/dashboard/attendance/${att.id}`}>View</LinkButton>
                            <Button size="xs" variant="soft" accent="purple" icon={Stethoscope} onClick={() => viewMedicalDetails(att)}>Summary</Button>
                          </div>
                        </div>
                        <div className="mt-2.5 pt-2.5 border-t border-[var(--border-color)] flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]">
                          <span className="inline-flex items-center gap-1 text-[var(--text-secondary)]"><Pill className="w-3 h-3 text-[var(--icon-green-text)]" /> Meds: <span className="font-semibold text-[var(--text-primary)]">{att.medications?.length || 0}</span></span>
                          <span className="inline-flex items-center gap-1 text-[var(--text-secondary)]"><FlaskConical className="w-3 h-3 text-[var(--icon-purple-text)]" /> Labs: <span className="font-semibold text-[var(--text-primary)]">{att.labTests?.length || 0}</span></span>
                          <span className="inline-flex items-center gap-1 text-[var(--text-secondary)]"><Scissors className="w-3 h-3 text-[var(--icon-yellow-text)]" /> Procedures: <span className="font-semibold text-[var(--text-primary)]">{att.procedures?.length || 0}</span></span>
                          {att.totalBill > 0 && (<span className="inline-flex items-center gap-1 ml-auto text-[var(--text-secondary)]"><DollarSign className="w-3 h-3 text-[var(--icon-green-text)]" /> Bill: <span className="font-semibold text-[var(--text-primary)]">{formatCurrency(att.totalBill)}</span></span>)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {activeTab === 'medical-records' && (
            <div>
              {patientAttendances.length === 0 ? (<EmptyState icon={Stethoscope} title="No medical records" hint="No records found for this patient." />) : (
                <div className="space-y-2.5">
                  {patientAttendances.map(att => (
                    <div key={att.id} className="border border-[var(--border-color)] rounded-lg overflow-hidden">
                      <button onClick={() => viewMedicalDetails(att)} className="w-full bg-[var(--bg-main)] px-3 py-2.5 flex items-center justify-between hover:bg-[var(--bg-card)] transition-colors text-left">
                        <div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-md bg-[var(--icon-cyan-bg)] flex items-center justify-center"><Calendar className="w-4 h-4 text-[var(--icon-cyan-text)]" /></div>
                          <div><p className="text-xs font-semibold text-[var(--text-primary)]">{formatDateTime(att.dateTime || att.createdAt)}</p><p className="text-[10px] text-[var(--text-tertiary)]">{att.attendanceType?.replace(/_/g, ' ')} • {getAttendanceNumber(att) || '—'}</p></div></div>
                        <div className="flex items-center gap-2"><StatusBadge status={att.status} /><ChevronRight className="w-3.5 h-3.5 text-[var(--text-tertiary)]" /></div>
                      </button>
                      <div className="px-3 py-2 grid grid-cols-3 gap-2 text-[11px] border-t border-[var(--border-color)]">
                        <span className="inline-flex items-center gap-1 text-[var(--text-secondary)]"><Pill className="w-3 h-3 text-[var(--icon-green-text)]" /> Meds: <span className="font-semibold text-[var(--text-primary)]">{att.medications?.length || 0}</span></span>
                        <span className="inline-flex items-center gap-1 text-[var(--text-secondary)]"><FlaskConical className="w-3 h-3 text-[var(--icon-purple-text)]" /> Labs: <span className="font-semibold text-[var(--text-primary)]">{att.labTests?.length || 0}</span></span>
                        <span className="inline-flex items-center gap-1 text-[var(--text-secondary)]"><Microscope className="w-3 h-3 text-[var(--icon-yellow-text)]" /> Scans: <span className="font-semibold text-[var(--text-primary)]">{att.scans?.length || 0}</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {activeTab === 'diagnoses' && (
            allDiagnoses.length === 0 ? (<EmptyState icon={Stethoscope} title="No diagnoses recorded" />) : (
              <Table heads={['Diagnosis', 'ICD-10', 'Type', 'Visit Date', '']}>
                {allDiagnoses.map((d, i) => (
                  <tr key={i} className={TR}>
                    <TdPrimary>{d.Diagnosis?.name || d.diagnosis?.name || d.icdCode}</TdPrimary>
                    <Td className="font-mono text-[11px]">{d.icdCode || d.Diagnosis?.icdCode || d.diagnosis?.icdCode}</Td>
                    <Td><Badge tone={d.diagnosisType === 'primary' ? 'green' : 'blue'} size="xs">{d.diagnosisType === 'primary' ? 'Primary' : 'Secondary'}</Badge></Td>
                    <Td>{formatDate(d.attendanceDate)}</Td>
                    <Td><Link to={`/dashboard/attendance/${d.attendanceId}`} className="text-[var(--icon-cyan-text)] hover:underline text-[11px] font-medium">View →</Link></Td>
                  </tr>
                ))}
              </Table>
            )
          )}
          {activeTab === 'medications' && (
            medicationAttendanceGroups.length === 0 ? (<EmptyState icon={Pill} title="No medications prescribed" />) : (
              <div className="space-y-3">
                {medicationAttendanceGroups.map(att => (
                  <section key={att.id} className="overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]">
                    <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2.5">
                      <Calendar className="h-4 w-4 text-[var(--icon-cyan-text)]" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[var(--text-primary)]">{getAttendanceNumber(att) || 'Attendance'} · {formatDate(att.dateTime || att.createdAt)}</p>
                        <p className="text-[10px] text-[var(--text-tertiary)]">{formatDateTime(att.dateTime || att.createdAt)} · {String(att.attendanceType || 'visit').replace(/_/g, ' ')}</p>
                      </div>
                      <Badge tone="neutral" size="sm">{att.medications.length} medication{att.medications.length === 1 ? '' : 's'}</Badge>
                      <Link to={`/dashboard/attendance/${att.id}`} className="ml-auto text-xs font-medium text-[var(--icon-cyan-text)] hover:underline">Open attendance →</Link>
                    </div>
                    <div className="overflow-x-auto">
                      <Table heads={['Medication', 'Dosage', 'Frequency', 'Duration', 'Status']}>
                        {att.medications.map((m: Medication, i: number) => (
                          <tr key={m.id || i} className={TR}>
                            <TdPrimary>{m.name}</TdPrimary><Td>{m.dosage || '—'}</Td><Td>{m.frequency || '—'}</Td><Td>{m.duration || '—'}</Td>
                            <Td><StatusBadge status={m.status} /></Td>
                          </tr>
                        ))}
                      </Table>
                    </div>
                  </section>
                ))}
              </div>
            )
          )}
          {activeTab === 'lab-tests' && (
            allLabTests.length === 0 ? (<EmptyState icon={FlaskConical} title="No lab tests requested" />) : (
              <Table heads={['Test', 'Status', 'Request Date', 'Result', '']}>
                {allLabTests.map((t, i) => (
                  <tr key={i} className={TR}>
                    <TdPrimary>{t.LabTestTemplate?.name || t.ServiceCatalog?.name || t.name || '—'}</TdPrimary>
                    <Td><StatusBadge status={t.status} /></Td>
                    <Td>{formatDate(t.requestedAt || t.createdAt)}</Td>
                    <Td>{t.result ? (typeof t.result === 'object' ? 'Available' : t.result) : 'Pending'}</Td>
                    <Td><Link to={`/dashboard/attendance/${t.attendanceId}`} className="text-[var(--icon-cyan-text)] hover:underline text-[11px] font-medium">View →</Link></Td>
                  </tr>
                ))}
              </Table>
            )
          )}
          {activeTab === 'procedures' && (
            allProcedures.length === 0 ? (<EmptyState icon={Scissors} title="No procedures scheduled" />) : (
              <Table heads={['Procedure', 'Scheduled', 'Status', '']}>
                {allProcedures.map((p, i) => (
                  <tr key={i} className={TR}>
                    <TdPrimary>{p.ProcedureTemplate?.name || p.ServiceCatalog?.name || p.name || '—'}</TdPrimary>
                    <Td>{p.scheduledDate ? formatDate(p.scheduledDate) : '—'}</Td>
                    <Td><StatusBadge status={p.status} /></Td>
                    <Td><Link to={`/dashboard/attendance/${p.attendanceId}`} className="text-[var(--icon-cyan-text)] hover:underline text-[11px] font-medium">View →</Link></Td>
                  </tr>
                ))}
              </Table>
            )
          )}
          {activeTab === 'vitals' && (
            vitalsList.length === 0 ? (<EmptyState icon={Heart} title="No vitals recorded" />) : (
              <div className="space-y-4">
                {vitalsList.length > 1 && (<div className="bg-[var(--bg-main)] rounded-lg p-3 h-[340px] border border-[var(--border-color)]"><VitalsTrendGraph vitals={vitalsList} isAntenatal={false} /></div>)}
                <Table heads={['Date', 'BP', 'Temp', 'Pulse', 'Resp', 'SpO₂', 'Weight', 'BMI', '']}>
                  {vitalsList.map((v, i) => (
                    <tr key={i} className={TR}>
                      <Td>{formatDateTime(v.recordedAt)}</Td><Td>{v.bloodPressure || '—'}</Td><Td>{v.temperature ? `${v.temperature}°C` : '—'}</Td>
                      <Td>{v.pulse || '—'}</Td><Td>{v.respiration || '—'}</Td><Td>{v.spo2 ? `${v.spo2}%` : '—'}</Td>
                      <Td>{v.weight ? `${v.weight}kg` : '—'}</Td><Td>{v.bmi || '—'}</Td>
                      <Td><Link to={`/dashboard/attendance/${v.attendanceId}`} className="text-[var(--icon-cyan-text)] hover:underline text-[11px] font-medium">View →</Link></Td>
                    </tr>
                  ))}
                </Table>
              </div>
            )
          )}
          {activeTab === 'immunizations' && patient?.id && (
            <ImmunizationPanel
              patientId={patient.id}
              attendances={patientAttendances as any}
              canRecord={hasRole(['admin', 'super_admin', 'doctor', 'nurse', 'midwife'])}
              canManageCatalogue={hasRole(['admin', 'super_admin'])}
              onCreateAttendance={handleCreateImmunizationAttendance}
            />
          )}
          {activeTab === 'billing' && (
            billsLoading ? (
              <div className="py-8 text-center"><Loader className="mx-auto mb-2 h-6 w-6 animate-spin text-[var(--icon-cyan-text)]" /><p className="text-xs text-[var(--text-tertiary)]">Loading billings by attendance…</p></div>
            ) : patientAttendances.length === 0 ? (<EmptyState icon={DollarSign} title="No attendances to show" />) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <StatCard label="Total billed" value={formatCurrency(enhancedStats.totalBilled)} icon={DollarSign} accent="cyan" />
                  <StatCard label="Total paid" value={formatCurrency(enhancedStats.totalPaid)} icon={CheckCircle} accent="green" />
                  <StatCard label="Outstanding" value={formatCurrency(enhancedStats.outstanding)} icon={AlertCircle} accent="yellow" />
                </div>
                {patientAttendances.slice().sort((a, b) => new Date(b.dateTime || b.createdAt).getTime() - new Date(a.dateTime || a.createdAt).getTime()).map(att => {
                  const visitBills = billsByAttendance.get(att.id) || [];
                  const billed = Number(att.totalBill || 0);
                  const paid = Number(att.paidAmount || 0);
                  const balance = Number(att.outstandingBalance ?? (billed - paid));
                  return (
                    <section key={att.id} className="overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]">
                      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2.5">
                        <Calendar className="h-4 w-4 text-[var(--icon-cyan-text)]" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[var(--text-primary)]">{getAttendanceNumber(att) || 'Attendance'} · {formatDate(att.dateTime || att.createdAt)}</p>
                          <p className="text-[10px] text-[var(--text-tertiary)]">{formatDateTime(att.dateTime || att.createdAt)} · {String(att.attendanceType || 'visit').replace(/_/g, ' ')} · {att.paymentMode || 'Cash'}</p>
                        </div>
                        <StatusBadge status={att.status} />
                        <Link to={`/dashboard/attendance/${att.id}`} className="ml-auto text-xs font-medium text-[var(--icon-cyan-text)] hover:underline">Open attendance →</Link>
                      </div>
                      <div className="grid grid-cols-1 divide-y divide-[var(--border-color)] sm:grid-cols-3 sm:divide-y-0 sm:divide-x">
                        <div className="px-3 py-2"><p className="text-[10px] uppercase text-[var(--text-tertiary)]">Visit billed</p><p className="text-sm font-bold text-[var(--text-primary)]">{formatCurrency(billed)}</p></div>
                        <div className="px-3 py-2"><p className="text-[10px] uppercase text-[var(--text-tertiary)]">Paid</p><p className="text-sm font-bold text-[var(--icon-green-text)]">{formatCurrency(paid)}</p></div>
                        <div className="px-3 py-2"><p className="text-[10px] uppercase text-[var(--text-tertiary)]">Balance</p><p className={`text-sm font-bold ${balance > 0 ? 'text-[var(--icon-yellow-text)]' : 'text-[var(--text-primary)]'}`}>{formatCurrency(balance)}</p></div>
                      </div>
                      {visitBills.length > 0 ? (
                        <div className="divide-y divide-[var(--border-color)]">
                          {visitBills.map((bill: any, bi: number) => {
                            const items = bill.BillLineItem || bill.billLineItem || bill.lineItems || [];
                            const payments = bill.Payment || bill.payment || bill.payments || [];
                            return (
                              <div key={bill.id || bi} className="p-3">
                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                  <Receipt className="h-3.5 w-3.5 text-[var(--icon-purple-text)]" />
                                  <span className="text-xs font-semibold text-[var(--text-primary)]">{bill.billNumber || `Bill ${bi + 1}`}</span>
                                  <Badge tone={bill.status === 'paid' ? 'green' : bill.status === 'cancelled' ? 'red' : bill.status === 'partial' ? 'yellow' : 'neutral'} size="xs">{humanStatus(bill.status || 'pending')}</Badge>
                                  <span className="ml-auto text-xs font-semibold text-[var(--text-primary)]">{formatCurrency(bill.totalAmount)}</span>
                                </div>
                                {items.length > 0 && (
                                  <div className="space-y-1">
                                    {items.map((item: any, ii: number) => (
                                      <div key={item.id || ii} className="flex items-start justify-between gap-3 text-[11px]">
                                        <span className="text-[var(--text-secondary)]">{item.description || item.serviceCatalog?.name || item.ServiceCatalog?.name || 'Bill item'} <span className="text-[var(--text-tertiary)]">× {item.quantity ?? 1}</span></span>
                                        <span className="shrink-0 font-medium text-[var(--text-primary)]">{formatCurrency(item.lineTotal)}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[var(--border-color)] pt-2 text-[10px] text-[var(--text-tertiary)]">
                                  <span>Bill paid: {formatCurrency(bill.paidAmount)}</span><span>Balance: {formatCurrency(bill.balance)}</span>
                                  {payments.length > 0 && <span>{payments.filter((p: any) => !p.isVoided).length} payment record(s)</span>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="px-3 py-3 text-xs text-[var(--text-tertiary)]">No individual bill record is available for this attendance. Visit totals are shown above.</div>
                      )}
                    </section>
                  );
                })}
                <Button variant="soft" accent="cyan" fullWidth icon={TrendingUp} onClick={() => navigate(`/dashboard/billing/patient/${patient.id}`)}>Open full billing history</Button>
              </div>
            )
          )}
          {activeTab === 'documents' && (
            <div>
              {documentsLoading ? (<div className="text-center py-10"><Loader className="w-6 h-6 text-[var(--icon-cyan-text)] animate-spin mx-auto mb-2" /><p className="text-xs text-[var(--text-tertiary)]">Loading documents…</p></div>)
              : documents.length === 0 ? (<EmptyState icon={File} title="No documents found" hint="Documents appear here when generated (receipts, prescriptions, lab results, etc.)" />)
              : (
                <div className="space-y-3">
                  {Array.from(documents.reduce((map, doc) => { const key = doc.entityId; if (!map.has(key)) map.set(key, []); map.get(key)!.push(doc); return map; }, new Map<string, GeneratedDocument[]>()).entries()).map(([entityId, docs]) => {
                    const att = patientAttendances.find(a => a.id === entityId);
                    const displayName = att ? `${att.attendanceNumber || 'Visit'} - ${formatDate(att.dateTime || att.createdAt)}` : `Group ${entityId.slice(-8)}`;
                    return (
                      <div key={entityId} className="border border-[var(--border-color)] rounded-lg overflow-hidden">
                        <div className="bg-[var(--bg-main)] px-3 py-2 border-b border-[var(--border-color)] flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-[var(--icon-cyan-text)]" /><span className="text-xs font-semibold text-[var(--text-primary)]">{displayName}</span>{att && (<span className="text-[10px] text-[var(--text-tertiary)] ml-auto">{formatDateTime(att.dateTime || att.createdAt)}</span>)}</div>
                        <div className="divide-y divide-[var(--border-color)]">
                          {docs.map(doc => (
                            <div key={doc.id} className="px-3 py-2.5 hover:bg-[var(--bg-main)] transition-colors flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${doc.template?.templateType === 'receipt' ? 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]' : doc.template?.templateType === 'prescription' ? 'bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)]' : doc.template?.templateType === 'lab_result' ? 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]' : doc.template?.templateType === 'discharge_summary' ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]' : 'bg-[var(--bg-main)] text-[var(--text-secondary)]'}`}>{getDocumentIcon(doc.template?.templateType || '')}</div>
                                <div className="min-w-0"><div className="flex items-center gap-1.5 flex-wrap"><span className="text-xs font-semibold text-[var(--text-primary)]">{getDocumentTypeLabel(doc.template?.templateType || '')}</span><span className="text-[10px] text-[var(--text-tertiary)]">{doc.template?.name || 'Document'}</span></div><p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{formatDate(doc.generatedAt)} • {doc.generatedBy?.fullName || 'System'}</p></div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0"><Button size="xs" variant="soft" accent="cyan" icon={Download} onClick={() => handleDownloadDocument(doc)}>Download</Button><Button size="xs" icon={Printer} onClick={() => handlePrintDocument(doc)}>Print</Button></div>
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

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-card)] rounded-xl p-5 max-w-sm w-full border border-[var(--border-color)]">
            <div className="flex items-center gap-3 mb-4"><div className="w-9 h-9 bg-[var(--icon-red-bg)] rounded-lg flex items-center justify-center"><Trash2 className="w-4 h-4 text-[var(--icon-red-text)]" /></div><div><h3 className="text-sm font-bold text-[var(--text-primary)]">Delete Patient</h3><p className="text-[11px] text-[var(--text-tertiary)]">This action cannot be undone.</p></div></div>
            <p className="text-xs text-[var(--text-secondary)] mb-4">Are you sure you want to delete <strong className="text-[var(--text-primary)]">{getPatientFullName(patient)}</strong>? All patient records and visits will be permanently removed.</p>
            <div className="flex gap-2"><Button variant="dangerSoft" className="flex-1" onClick={handleDeletePatient}>Delete</Button><Button variant="secondary" className="flex-1" onClick={() => setDeleteConfirm(false)}>Cancel</Button></div>
          </div>
        </div>
      )}
      {showMedicalDetails && selectedAttendance && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowMedicalDetails(false); setSelectedAttendance(null); }}>
          <div className="bg-[var(--bg-card)] rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-[var(--border-color)] shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* ===== HEADER ===== */}
            <div className="shrink-0 border-b border-[var(--border-color)]">
              <div className="flex items-start justify-between gap-3 px-4 pt-4 sm:px-5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--icon-purple-bg)]"><Stethoscope className="h-5 w-5 text-[var(--icon-purple-text)]" /></div>
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-bold leading-tight text-[var(--text-primary)]">Visit Summary</h2>
                    <p className="truncate text-xs text-[var(--text-tertiary)]">{getPatientFullName(patient)} · {getAttendanceNumber(selectedAttendance) || 'Visit'} · {formatDateTime(selectedAttendance.dateTime || selectedAttendance.createdAt)}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" iconOnly icon={X} aria-label="Close" onClick={() => { setShowMedicalDetails(false); setSelectedAttendance(null); }} />
              </div>
              <div className="flex flex-wrap items-center gap-2 px-4 py-3 sm:px-5">
                <StatusBadge status={selectedAttendance.status} />
                <Badge tone="neutral" size="sm" dot>{(selectedAttendance.attendanceType || 'Visit').replace(/_/g, ' ')}</Badge>
                <Badge tone="neutral" size="sm" dot>{selectedAttendance.paymentMode || 'Cash'}</Badge>
                {selectedAttendance.totalBill > 0 && (<Badge tone="green" size="sm">Bill {formatCurrency(selectedAttendance.totalBill)}</Badge>)}
                <div className="ml-auto flex items-center gap-1.5">
                  <LinkButton size="xs" variant="soft" accent="cyan" icon={Eye} to={`/dashboard/attendance/${selectedAttendance.id}`}>Open full visit</LinkButton>
                </div>
              </div>
            </div>
            {/* ===== BODY ===== */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {/* Count strip */}
              <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {[
                  { label: 'Diagnoses', n: selectedAttendance.diagnoses?.length || 0, icon: Stethoscope, cls: 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]' },
                  { label: 'Meds', n: selectedAttendance.medications?.length || 0, icon: Pill, cls: 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]' },
                  { label: 'Labs', n: selectedAttendance.labTests?.length || 0, icon: FlaskConical, cls: 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]' },
                  { label: 'Procedures', n: selectedAttendance.procedures?.length || 0, icon: Scissors, cls: 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]' },
                  { label: 'Scans', n: selectedAttendance.scans?.length || 0, icon: Microscope, cls: 'bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)]' },
                  { label: 'Vitals', n: selectedAttendance.vitals?.length || 0, icon: Heart, cls: 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]' },
                ].map(c => (
                  <div key={c.label} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)]/40 px-2.5 py-2 text-center">
                    <c.icon className={`mx-auto h-4 w-4 ${c.cls} rounded`} />
                    <p className="mt-1 text-sm font-bold leading-none text-[var(--text-primary)]">{c.n}</p>
                    <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--text-tertiary)]">{c.label}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {/* Diagnoses */}
                <section className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/30 p-3">
                  <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--text-primary)]"><Stethoscope className="h-3.5 w-3.5 text-[var(--icon-cyan-text)]" /> Diagnoses</h3>
                  {selectedAttendance.diagnoses?.length ? (
                    <ul className="space-y-1.5">{selectedAttendance.diagnoses.map((d: any, i: number) => (
                      <li key={i} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-2.5 py-2">
                        <div className="flex items-center justify-between gap-2"><span className="truncate text-xs font-semibold text-[var(--text-primary)]">{d.Diagnosis?.name || d.diagnosis?.name || d.icdCode}</span>{d.diagnosisType === 'primary' && (<Badge tone="cyan" size="xs">Primary</Badge>)}</div>
                        <p className="mt-0.5 font-mono text-[10px] text-[var(--text-tertiary)]">ICD-10 · {d.icdCode || d.Diagnosis?.icdCode || d.diagnosis?.icdCode || '—'}</p>
                        {d.notes && <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-secondary)]">{d.notes}</p>}
                      </li>))}
                    </ul>
                  ) : (<p className="text-xs text-[var(--text-tertiary)]">No diagnosis recorded for this visit.</p>)}
                </section>
                {/* Medications */}
                <section className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/30 p-3">
                  <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--text-primary)]"><Pill className="h-3.5 w-3.5 text-[var(--icon-green-text)]" /> Medications</h3>
                  {selectedAttendance.medications?.length ? (
                    <ul className="space-y-1.5">{selectedAttendance.medications.map((m: Medication, i: number) => (
                      <li key={i} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-2.5 py-2">
                        <div className="flex items-center justify-between gap-2"><span className="truncate text-xs font-semibold text-[var(--text-primary)]">{m.name}</span><StatusBadge status={m.status} /></div>
                        <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">{[m.dosage, m.frequency, m.duration].filter(Boolean).join(' · ') || 'No dosage info'}</p>
                        {m.instructions && (<p className="mt-1 text-[11px] leading-relaxed text-[var(--text-tertiary)]">Instructions: {m.instructions}</p>)}
                      </li>))}
                    </ul>
                  ) : (<p className="text-xs text-[var(--text-tertiary)]">No medication prescribed for this visit.</p>)}
                </section>
                {/* Lab Tests */}
                <section className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/30 p-3">
                  <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--text-primary)]"><FlaskConical className="h-3.5 w-3.5 text-[var(--icon-purple-text)]" /> Lab Tests</h3>
                  {selectedAttendance.labTests?.length ? (
                    <ul className="space-y-1.5">{selectedAttendance.labTests.map((lt: LabTest, i: number) => (
                      <li key={i} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-2.5 py-2">
                        <div className="flex items-center justify-between gap-2"><span className="truncate text-xs font-semibold text-[var(--text-primary)]">{lt.LabTestTemplate?.name || lt.ServiceCatalog?.name || 'Lab Test'}</span><StatusBadge status={lt.status} /></div>
                        {lt.result ? (<p className="mt-1 text-[11px] leading-relaxed text-[var(--text-secondary)]">Result: {typeof lt.result === 'object' ? JSON.stringify(lt.result) : lt.result}</p>) : (<p className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">Result pending</p>)}
                      </li>))}
                    </ul>
                  ) : (<p className="text-xs text-[var(--text-tertiary)]">No lab test requested for this visit.</p>)}
                </section>
                {/* Procedures */}
                <section className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/30 p-3">
                  <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--text-primary)]"><Scissors className="h-3.5 w-3.5 text-[var(--icon-yellow-text)]" /> Procedures</h3>
                  {selectedAttendance.procedures?.length ? (
                    <ul className="space-y-1.5">{selectedAttendance.procedures.map((pr: Procedure, i: number) => (
                      <li key={i} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-2.5 py-2">
                        <div className="flex items-center justify-between gap-2"><span className="truncate text-xs font-semibold text-[var(--text-primary)]">{pr.ProcedureTemplate?.name || pr.name}</span><StatusBadge status={pr.status} /></div>
                        {pr.performedAt && <p className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">Performed {formatDate(pr.performedAt)}</p>}
                        {pr.notes && <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-secondary)]">{pr.notes}</p>}
                      </li>))}
                    </ul>
                  ) : (<p className="text-xs text-[var(--text-tertiary)]">No procedure for this visit.</p>)}
                </section>
                {/* Scans */}
                <section className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/30 p-3">
                  <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--text-primary)]"><Microscope className="h-3.5 w-3.5 text-[var(--icon-blue-text)]" /> Scans & Imaging</h3>
                  {selectedAttendance.scans?.length ? (
                    <ul className="space-y-1.5">{selectedAttendance.scans.map((s: Scan, i: number) => (
                      <li key={i} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-2.5 py-2">
                        <div className="flex items-center justify-between gap-2"><span className="truncate text-xs font-semibold text-[var(--text-primary)]">{getScanDisplayName(s)}</span><StatusBadge status={s.status} /></div>
                        <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">{s.bodyPart || 'General'} · {humanScanModality(s)}{s.imageUrls?.length ? ` · ${s.imageUrls.length} image${s.imageUrls.length === 1 ? '' : 's'}` : ''}</p>
                        {s.findings && <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-secondary)]">Findings: {s.findings}</p>}
                      </li>))}
                    </ul>
                  ) : (<p className="text-xs text-[var(--text-tertiary)]">No scan for this visit.</p>)}
                </section>
                {/* Vitals */}
                <section className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/30 p-3">
                  <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--text-primary)]"><Heart className="h-3.5 w-3.5 text-[var(--icon-red-text)]" /> Vitals</h3>
                  {selectedAttendance.vitals?.length ? (
                    <ul className="space-y-1.5">{selectedAttendance.vitals.map((v: Vitals, i: number) => (
                      <li key={i} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-2.5 py-2">
                        <p className="text-[10px] font-medium text-[var(--text-tertiary)]">{formatDateTime(v.recordedAt)}</p>
                        <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-[var(--text-secondary)]">
                          {v.bloodPressure && <span><span className="text-[var(--text-tertiary)]">BP</span> <b className="text-[var(--text-primary)]">{v.bloodPressure}</b></span>}
                          {v.temperature && <span><span className="text-[var(--text-tertiary)]">Temp</span> <b className="text-[var(--text-primary)]">{v.temperature}°C</b></span>}
                          {v.pulse && <span><span className="text-[var(--text-tertiary)]">Pulse</span> <b className="text-[var(--text-primary)]">{v.pulse} bpm</b></span>}
                          {v.spo2 && <span><span className="text-[var(--text-tertiary)]">SpO₂</span> <b className="text-[var(--text-primary)]">{v.spo2}%</b></span>}
                          {v.weight && <span><span className="text-[var(--text-tertiary)]">Weight</span> <b className="text-[var(--text-primary)]">{v.weight} kg</b></span>}
                          {v.bmi && <span><span className="text-[var(--text-tertiary)]">BMI</span> <b className="text-[var(--text-primary)]">{v.bmi}</b></span>}
                        </p>
                      </li>))}
                    </ul>
                  ) : (<p className="text-xs text-[var(--text-tertiary)]">No vitals recorded for this visit.</p>)}
                </section>
              </div>
              {/* Complaints + Notes — full width at the bottom */}
              {(selectedAttendance.complaints || selectedAttendance.medicalNotes) && (
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {selectedAttendance.complaints && (
                    <section className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/30 p-3"><h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-[var(--text-primary)]">Chief Complaints</h3><p className="text-xs leading-relaxed text-[var(--text-secondary)]">{selectedAttendance.complaints}</p></section>
                  )}
                  {selectedAttendance.medicalNotes && (
                    <section className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/30 p-3"><h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-[var(--text-primary)]">Clinical Notes</h3><p className="text-xs leading-relaxed text-[var(--text-secondary)]">{selectedAttendance.medicalNotes}</p></section>
                  )}
                </div>
              )}
              {!(selectedAttendance.diagnoses?.length || selectedAttendance.medications?.length || selectedAttendance.labTests?.length || selectedAttendance.procedures?.length || selectedAttendance.scans?.length || selectedAttendance.vitals?.length || selectedAttendance.complaints || selectedAttendance.medicalNotes) && (
                <div className="mt-3 rounded-xl border border-dashed border-[var(--border-color)] p-6 text-center"><Stethoscope className="mx-auto h-6 w-6 text-[var(--text-tertiary)]" /><p className="mt-2 text-xs font-medium text-[var(--text-primary)]">Nothing recorded for this visit yet</p><p className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">Open the full visit to add diagnoses, meds, labs or notes.</p></div>
              )}
            </div>
            {/* ===== FOOTER ===== */}
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[var(--border-color)] bg-[var(--bg-main)]/40 px-4 py-3 sm:px-5">
              <p className="text-[11px] text-[var(--text-tertiary)]">Summary for one visit — full history lives in the tabs above.</p>
              <div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => { setShowMedicalDetails(false); setSelectedAttendance(null); }}>Close</Button><LinkButton size="sm" variant="soft" accent="cyan" icon={Eye} to={`/dashboard/attendance/${selectedAttendance.id}`}>Open full visit</LinkButton></div>
            </div>
          </div>
        </div>
      )}
{showPatientIdCard && (<PatientIdCardPrint patient={patient} onClose={() => setShowPatientIdCard(false)} />)}
      {showAttendanceModal && (<NewAttendanceModal patientId={patient.id} onSuccess={handleAttendanceSuccess} onClose={() => setShowAttendanceModal(false)} />)}
    </div>
  );
}