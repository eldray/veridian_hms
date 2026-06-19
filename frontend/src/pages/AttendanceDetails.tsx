// src/pages/AttendanceDetails.tsx - COMPLETE WITH MEDICAL ENTRIES, BILLING, AND VITALS DATA
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAttendanceStore } from '../store/attendanceStore';
import { usePatientStore } from '../store/patientStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import { useBillingStore } from '../store/billingStore';
import NewAttendanceModal from '../components/NewAttendanceModal';
import { VitalsHistory } from '../components/vitals/VitalsHistory';
import { getPatientName } from '../utils/patient';
import { 
  ArrowLeft, Edit, FileText, Pill, FlaskConical, Scissors, DollarSign, 
  User, Calendar, Stethoscope, Activity, CreditCard, Shield, 
  AlertCircle, Loader, Trash2, Plus, ChevronLeft, ChevronRight,
  Clock, MapPin, Phone, Mail, Clipboard, Heart, Thermometer, 
  Droplet, Ruler, Weight, Brain, Bone, Eye, Microscope, Scan,
  Syringe, Hospital, CheckCircle, XCircle, AlertTriangle, TrendingUp,
  Receipt, Printer, Download, Building2, Bed, Moon, Sun, History  
} from 'lucide-react';
import type { AttendanceStatus, AttendanceType, PaymentMode } from '../types';

// Helper function to format currency
const formatCurrency = (amount: number) => `₵${amount?.toFixed(2) ?? '0.00'}`;

// Status Badge Component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colors: Record<string, string> = {
    'pending': 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]',
    'completed': 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]',
    'cancelled': 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]',
    'admitted': 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]',
    'discharged': 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]',
    'prescribed': 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]',
    'dispensed': 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]',
    'requested': 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]',
    'scheduled': 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]',
    'in_progress': 'bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)]',
  };
  const cls = colors[status?.toLowerCase()] || 'bg-[var(--bg-main)] text-[var(--text-secondary)]';
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls}`}>
      {status?.replace('_', ' ')}
    </span>
  );
};

// Section Card Component
const SectionCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  count?: number;
  action?: React.ReactNode;
  children: React.ReactNode;
}> = ({ icon, title, count, action, children }) => (
  <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-semibold text-[var(--text-primary)]">{title}</span>
        {count !== undefined && count > 0 && (
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]">
            {count}
          </span>
        )}
      </div>
      {action}
    </div>
    <div className="max-h-80 overflow-y-auto">
      {children}
    </div>
  </div>
);

// Table Components
const Table: React.FC<{ heads: string[]; children: React.ReactNode }> = ({ heads, children }) => (
  <table className="w-full text-xs">
    <thead className="sticky top-0 z-10 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
      <tr>
        {heads.map(h => (
          <th key={h} className="px-3 py-2 text-left font-semibold text-[var(--text-tertiary)] whitespace-nowrap">{h}</th>
        ))}
      </tr>
    </thead>
    <tbody className="divide-y divide-[var(--border-color)]">{children}</tbody>
  </table>
);

const TdPrimary: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <td className={`px-3 py-2 text-[var(--text-primary)] font-medium ${className}`}>{children}</td>
);

const Td: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <td className={`px-3 py-2 text-[var(--text-secondary)] ${className}`}>{children}</td>
);

export default function AttendanceDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { success, error: toastError } = useToast();

  // ── Stores ───────────────────────────────────
  const { 
    currentAttendance, 
    getAttendance, 
    deleteAttendance,
    isLoading: attendanceLoading, 
    error: attendanceError,
    getVitalsByAttendance,
  } = useAttendanceStore();
  
  const { 
    patients, 
    loadPatients, 
    isLoading: patientsLoading 
  } = usePatientStore();
  
  const { hasRole } = useAuthStore();
  const { bills, getBills, isLoading: billsLoading } = useBillingStore();

  // ── State ─────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'overview' | 'medications' | 'lab-tests' | 'procedures' | 'billing' | 'vitals' | 'clinical'>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [vitalsList, setVitalsList] = useState<any[]>([]);
  const [vitalsLoading, setVitalsLoading] = useState(false);
  
  const isLoading = attendanceLoading || patientsLoading || billsLoading;

  // ── Load data ─────────────────────────────────
  const loadData = async () => {
    try {
      setRefreshing(true);
      if (!id) {
        toastError('Invalid URL', 'Attendance ID is missing.');
        return;
      }
      
      await Promise.all([
        getAttendance(id),
        loadPatients(),
        getBills({ attendanceId: id })
      ]);
      
      // Load vitals for this attendance
      await loadVitals(id);
    } catch (e) {
      toastError('Load failed', 'Could not load attendance data.');
    } finally {
      setRefreshing(false);
    }
  };

  const loadVitals = async (attendanceId: string) => {
    setVitalsLoading(true);
    try {
      const vitals = await getVitalsByAttendance(attendanceId);
      setVitalsList(vitals || []);
    } catch (err) {
      console.error('Error loading vitals:', err);
      setVitalsList([]);
    } finally {
      setVitalsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  // Canonical name getter (handles name/fullName/surname+otherNames)
  const getPatientFullName = getPatientName;

  // ── Patient lookup ─────────────────────────────
  const findPatient = (attendance: any) => {
    if (attendance?.patient?.surname) return attendance.patient;
    const pid = (typeof attendance.patientId === 'object' 
      ? attendance.patientId.id 
      : attendance.patientId) ||
      (typeof attendance.patient === 'object' 
        ? attendance.patient.id 
        : null);

    return pid ? patients.find(p => p.id === pid) : null;
  };

  // Get patient for current attendance
  const patient = useMemo(() => {
    if (!currentAttendance) return null;
    return findPatient(currentAttendance);
  }, [currentAttendance, patients]);

  // Get bills for this attendance
  const attendanceBills = useMemo(() => {
    if (!currentAttendance) return [];
    return bills.filter(b => b.attendanceId === currentAttendance.id);
  }, [bills, currentAttendance]);

  const latestBill = attendanceBills[0];

  // Get latest vitals
  const latestVitals = vitalsList.length > 0 ? vitalsList[vitalsList.length - 1] : null;

  // Check if vitals are abnormal
  const hasAbnormalVitals = latestVitals ? (
    (latestVitals.bloodPressure && (() => {
      const [sys] = latestVitals.bloodPressure.split('/').map(Number);
      return sys > 140 || sys < 90;
    })()) ||
    (latestVitals.temperature !== undefined && (latestVitals.temperature > 38 || latestVitals.temperature < 35)) ||
    (latestVitals.pulse !== undefined && (latestVitals.pulse > 100 || latestVitals.pulse < 60)) ||
    (latestVitals.spo2 !== undefined && latestVitals.spo2 < 95)
  ) : false;

  // ── Handlers ──────────────────────────────────
  const handleBack = () => {
    if (location.key !== 'default') {
      navigate(-1);
    } else {
      navigate('/dashboard/attendance');
    }
  };

  const handleEditAttendance = () => {
    setEditModalOpen(true);
  };

  const handleDeleteAttendance = async () => {
    if (!currentAttendance?.id) return;
    
    try {
      await deleteAttendance(currentAttendance.id);
      success('Attendance Deleted', 'Attendance record has been removed');
      navigate('/dashboard/attendance');
    } catch (err: any) {
      toastError('Delete Failed', err.message || 'Failed to delete attendance');
    }
  };

  const handleRefresh = () => {
    loadData();
  };

  const handleEditSuccess = () => {
    setEditModalOpen(false);
    loadData();
    success('Attendance updated', 'Record saved successfully.');
  };

  const handleEditClose = () => {
    setEditModalOpen(false);
  };

  const handleAddClinical = (type: 'diagnosis' | 'lab' | 'medication' | 'procedure') => {
    navigate(`/dashboard/attendance/${id}/clinical/${type}`);
  };

  const handleGoToVitals = () => {
    navigate(`/dashboard/vitals/${id}`);
  };

  const handleGoToMedicalEntries = () => {
    navigate(`/dashboard/medical-entries/${id}`);
  };

  const handleGoToBilling = () => {
    if (patient) {
      navigate(`/dashboard/billing/patient/${patient.id}`);
    }
  };

  // ── UI Helper Functions ───────────────────────
  const getStatusColor = (status: AttendanceStatus) => {
    if (!status) return 'bg-[var(--bg-main)] text-[var(--text-secondary)] border-[var(--border-color)]';
    
    switch (status) {
      case 'completed': return 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] border-[var(--icon-green-bg)]';
      case 'cancelled': return 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] border-[var(--icon-red-bg)]';
      case 'admitted': return 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] border-[var(--icon-purple-bg)]';
      case 'pending': return 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)] border-[var(--icon-yellow-bg)]';
      case 'discharged': return 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] border-[var(--icon-cyan-bg)]';
      default: return 'bg-[var(--bg-main)] text-[var(--text-secondary)] border-[var(--border-color)]';
    }
  };

  const getPaymentModeLabel = (mode: PaymentMode) => {
    const modeMap: Record<PaymentMode, string> = {
      'cash': 'Cash',
      'nhis': 'NHIS',
      'private_insurance': 'Private Insurance'
    };
    return modeMap[mode] || 'Cash';
  };

  const getPaymentModeIcon = (mode: PaymentMode) => {
    switch (mode) {
      case 'nhis': return <Shield className="w-4 h-4 text-[var(--icon-green-text)]" />;
      case 'private_insurance': return <User className="w-4 h-4 text-[var(--icon-blue-text)]" />;
      default: return <CreditCard className="w-4 h-4 text-[var(--text-secondary)]" />;
    }
  };

  const getAttendanceTypeLabel = (type: AttendanceType) => {
    const typeMap: Record<AttendanceType, string> = {
      'emergency_acute': 'Emergency/Acute',
      'antenatal': 'Antenatal',
      'postnatal': 'Postnatal',
      'chronic_followup': 'Chronic Follow-up',
      'specialist_consultation': 'Specialist Consultation',
      'delivery': 'Delivery',
      'surgery': 'Surgery',
      'general_consultation': 'General Consultation'
    };
    return typeMap[type] || 'General Consultation';
  };

  const getClinicianName = (attendance: any) => {
    if (!attendance) return 'Unknown Clinician';
    
    const clinician = attendance.createdBy || attendance.attendingClinician;
    if (!clinician) return 'Unknown Clinician';
    
    if (typeof clinician === 'object' && clinician !== null) {
      return clinician.fullName || clinician.username || clinician.name || 'Unknown Clinician';
    }
    
    return clinician || 'Unknown Clinician';
  };

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return 'No date';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const formatShortDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const canEdit = hasRole(['admin', 'doctor', 'nurse']);
  const canDelete = hasRole(['admin']);
  const canAddClinical = hasRole(['admin', 'doctor', 'nurse']);

  // Get encounter category badge
  const getEncounterCategoryBadge = () => {
    const category = currentAttendance?.encounterCategory;
    const admissionType = currentAttendance?.admissionType;
    
    if (category === 'ipd' && admissionType === 'detention_observation') {
      return (
        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold
          border border-[var(--icon-orange-text)] bg-[var(--icon-orange-bg)] text-[var(--icon-orange-text)]">
          <Moon className="w-3 h-3" /> OBSERVATION (DETENTION)
        </span>
      );
    }
    
    if (category === 'ipd') {
      return (
        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold
          border border-[var(--icon-green-text)] bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]">
          <Hospital className="w-3 h-3" /> ADMITTED (IPD)
        </span>
      );
    }
    
    if (category === 'daycase') {
      return (
        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold
          border border-[var(--icon-purple-text)] bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]">
          <Sun className="w-3 h-3" /> DAY SURGERY
        </span>
      );
    }
    
    return (
      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold
        border border-[var(--icon-cyan-text)] bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]">
        <User className="w-3 h-3" /> OUTPATIENT (OPD)
      </span>
    );
  };

  // Tabs configuration with counts
  const tabs = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'clinical', label: 'Clinical', icon: Stethoscope, count: (currentAttendance?.diagnoses?.length || 0) + (currentAttendance?.medicalNotes ? 1 : 0) },
    { id: 'medications', label: 'Medications', icon: Pill, count: currentAttendance?.medications?.length || 0 },
    { id: 'lab-tests', label: 'Lab Tests', icon: FlaskConical, count: currentAttendance?.labTests?.length || 0 },
    { id: 'procedures', label: 'Procedures', icon: Scissors, count: currentAttendance?.procedures?.length || 0 },
    { id: 'vitals', label: 'Vitals', icon: Heart, count: vitalsList.length },
    { id: 'billing', label: 'Billing', icon: DollarSign, count: attendanceBills.length },
  ];

  // ── Loading State ─────────────────────────────
  if (isLoading && !refreshing) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Attendance Details</h1>
          </div>
          <button
            disabled
            className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-secondary)] text-sm"
          >
            <Loader className="w-4 h-4 animate-spin" />
            Loading...
          </button>
        </div>

        <div className="bg-[var(--bg-card)] rounded-xl p-8 shadow-sm border border-[var(--border-color)]">
          <div className="flex items-center justify-center">
            <Loader className="w-8 h-8 text-[var(--icon-cyan-text)] animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  // ── Error State ───────────────────────────────
  if (attendanceError || !currentAttendance) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Attendance Details</h1>
          </div>
        </div>

        <div className="bg-[var(--bg-card)] rounded-xl p-8 shadow-sm border border-[var(--border-color)] text-center">
          <AlertCircle className="w-12 h-12 text-[var(--icon-red-text)] mx-auto mb-4" />
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
            {attendanceError ? 'Error Loading Attendance' : 'Attendance Not Found'}
          </h3>
          <p className="text-[var(--text-secondary)] text-sm mb-6">
            {attendanceError || "The attendance record you're looking for doesn't exist or has been removed."}
          </p>
          <div className="flex gap-3 justify-center">
            <button 
              onClick={handleBack}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all duration-200 font-semibold text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to List
            </button>
            <button 
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--bg-main)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--border-color)] transition-all duration-200 font-semibold text-sm border border-[var(--border-color)]"
            >
              <Loader className="w-4 h-4" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Attendance Details</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Record #{currentAttendance.attendanceNumber || currentAttendance.id?.slice(-8)}
          </p>
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
            {patient ? getPatientFullName(patient) : 'Unknown Patient'} • Created {formatShortDate(currentAttendance.dateTime || currentAttendance.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all disabled:opacity-50 text-sm text-[var(--text-primary)]"
          >
            <Loader className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>

          {canEdit && (
            <button
              onClick={handleEditAttendance}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-colors shadow-sm text-sm font-semibold"
            >
              <Edit className="w-4 h-4" />
              <span>Edit Attendance</span>
            </button>
          )}

          {canDelete && (
            <button
              onClick={() => setDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] rounded-lg hover:bg-[var(--icon-red-text)] hover:text-white transition-colors shadow-sm text-sm font-semibold"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/40 dark:to-cyan-950/40 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
              Attendance Summary
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
              Status: {currentAttendance.status 
                ? currentAttendance.status.charAt(0).toUpperCase() + currentAttendance.status.slice(1) 
                : 'N/A'} • Type: {currentAttendance.attendanceType 
                  ? getAttendanceTypeLabel(currentAttendance.attendanceType) 
                  : 'N/A'}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className="bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300">
              💊 Meds: {currentAttendance.medications?.length || 0}
            </span>
            <span className="bg-green-100 dark:bg-green-900/50 px-2 py-1 rounded border border-green-200 dark:border-green-700 text-green-700 dark:text-green-300">
              🧪 Labs: {currentAttendance.labTests?.length || 0}
            </span>
            <span className="bg-purple-100 dark:bg-purple-900/50 px-2 py-1 rounded border border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-300">
              ✂️ Procs: {currentAttendance.procedures?.length || 0}
            </span>
            <span className="bg-yellow-100 dark:bg-yellow-900/50 px-2 py-1 rounded border border-yellow-200 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300 font-bold">
              💰 {formatCurrency(currentAttendance.totalBill || 0)}
            </span>
            <span className="bg-red-100 dark:bg-red-900/50 px-2 py-1 rounded border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300">
              ❤️ Vitals: {vitalsList.length}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <button
          onClick={handleGoToMedicalEntries}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl hover:bg-[var(--bg-main)] transition-all text-sm font-medium text-[var(--text-primary)]"
        >
          <Stethoscope className="w-4 h-4 text-[var(--icon-cyan-text)]" />
          Medical Entries
        </button>
        <button
          onClick={handleGoToVitals}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl hover:bg-[var(--bg-main)] transition-all text-sm font-medium text-[var(--text-primary)]"
        >
          <Heart className="w-4 h-4 text-[var(--icon-red-text)]" />
          Vitals
        </button>
        <button
          onClick={handleGoToBilling}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl hover:bg-[var(--bg-main)] transition-all text-sm font-medium text-[var(--text-primary)]"
        >
          <DollarSign className="w-4 h-4 text-[var(--icon-green-text)]" />
          Billing
        </button>
      </div>

      {/* Main Content Card */}
      <div className="bg-[var(--bg-card)] rounded-xl shadow-sm border border-[var(--border-color)] overflow-hidden">
        {/* Tabs Navigation */}
        <div className="border-b border-[var(--border-color)] p-4">
          <nav className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 py-2 px-4 rounded-lg font-medium transition-all duration-200 text-sm ${
                    activeTab === tab.id
                      ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
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

        {/* Tab Content */}
        <div className="p-6">
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Patient Info & Medical Details */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Patient Information Card */}
                  {patient && (
                    <div className="bg-gradient-to-r from-blue-50 to-teal-50 dark:from-blue-950/30 dark:to-teal-950/30 rounded-xl p-5 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-[var(--icon-cyan-bg)] rounded-lg flex items-center justify-center">
                          <User className="w-5 h-5 text-[var(--icon-cyan-text)]" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-[var(--text-primary)]">Patient Information</h3>
                          <p className="text-xs text-[var(--text-secondary)]">Demographic and contact details</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-[var(--bg-main)] rounded-lg p-3 border border-[var(--border-color)]">
                          <p className="text-xs text-[var(--text-secondary)] font-medium">Full Name</p>
                          <p className="font-bold text-[var(--text-primary)] text-sm">{getPatientFullName(patient)}</p>
                        </div>
                        <div className="bg-white dark:bg-[var(--bg-main)] rounded-lg p-3 border border-[var(--border-color)]">
                          <p className="text-xs text-[var(--text-secondary)] font-medium">Folder Number</p>
                          <p className="font-bold text-[var(--text-primary)] text-sm">{patient.folderNumber || 'N/A'}</p>
                        </div>
                        <div className="bg-white dark:bg-[var(--bg-main)] rounded-lg p-3 border border-[var(--border-color)]">
                          <p className="text-xs text-[var(--text-secondary)] font-medium">Age & Gender</p>
                          <p className="font-bold text-[var(--text-primary)] text-sm">
                            {patient.age || 'N/A'} years • {patient.gender || 'N/A'}
                          </p>
                        </div>
                        <div className="bg-white dark:bg-[var(--bg-main)] rounded-lg p-3 border border-[var(--border-color)]">
                          <p className="text-xs text-[var(--text-secondary)] font-medium">Contact</p>
                          <p className="font-bold text-[var(--text-primary)] text-sm">{patient.contact || 'N/A'}</p>
                        </div>
                        {patient.address && (
                          <div className="bg-white dark:bg-[var(--bg-main)] rounded-lg p-3 border border-[var(--border-color)] md:col-span-2">
                            <p className="text-xs text-[var(--text-secondary)] font-medium">Address</p>
                            <p className="font-bold text-[var(--text-primary)] text-sm">{patient.address}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Medical Information */}
                  <div className="bg-white dark:bg-[var(--bg-main)] rounded-xl p-5 border border-[var(--border-color)]">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-[var(--icon-green-bg)] rounded-lg flex items-center justify-center">
                        <Heart className="w-5 h-5 text-[var(--icon-green-text)]" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-[var(--text-primary)]">Medical Information</h3>
                        <p className="text-xs text-[var(--text-secondary)]">Complaints and clinical notes</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                        <p className="text-xs text-[var(--text-secondary)] font-medium mb-2 flex items-center gap-2">
                          <Clipboard className="w-3 h-3" />
                          Chief Complaints
                        </p>
                        <p className="font-semibold text-[var(--text-primary)] text-sm">
                          {currentAttendance.complaints || 'No complaints recorded'}
                        </p>
                      </div>
                      {(currentAttendance as any)?.historyPresentingComplaint && (
                        <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                          <p className="text-xs text-[var(--text-secondary)] font-medium mb-2 flex items-center gap-2">
                            <History className="w-3 h-3" />
                            History of Presenting Complaint
                          </p>
                          <p className="font-semibold text-[var(--text-primary)] text-sm">{(currentAttendance as any).historyPresentingComplaint}</p>
                        </div>
                      )}
                      {currentAttendance.medicalNotes && (
                        <div className="bg-yellow-50 dark:bg-yellow-950/30 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                          <p className="text-xs text-[var(--text-secondary)] font-medium mb-2 flex items-center gap-2">
                            <FileText className="w-3 h-3" />
                            Medical Notes
                          </p>
                          <p className="font-semibold text-[var(--text-primary)] text-sm">{currentAttendance.medicalNotes}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Diagnoses */}
                  {currentAttendance.diagnoses && currentAttendance.diagnoses.length > 0 && (
                    <div className="bg-white dark:bg-[var(--bg-main)] rounded-xl p-5 border border-[var(--border-color)]">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-[var(--icon-purple-bg)] rounded-lg flex items-center justify-center">
                          <Brain className="w-5 h-5 text-[var(--icon-purple-text)]" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-[var(--text-primary)]">Diagnoses</h3>
                          <p className="text-xs text-[var(--text-secondary)]">Medical diagnoses and conditions</p>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        {currentAttendance.diagnoses.map((diagnosis: any, index: number) => (
                          <div key={diagnosis.id || index} className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 border border-green-200 dark:border-green-800">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="font-semibold text-[var(--text-primary)] text-sm">
                                  {diagnosis.diagnosis?.name || diagnosis.icdCode}
                                </p>
                                {diagnosis.icdCode && (
                                  <p className="text-xs text-[var(--text-secondary)] mt-1">ICD-10: {diagnosis.icdCode}</p>
                                )}
                                {diagnosis.notes && (
                                  <p className="text-xs text-[var(--text-primary)] mt-2">{diagnosis.notes}</p>
                                )}
                              </div>
                              {diagnosis.primary && (
                                <span className="px-2 py-1 bg-green-600 text-white text-xs rounded-full font-medium ml-2">
                                  Primary
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column - Attendance Details & Stats */}
                <div className="space-y-6">
                  {/* Attendance Status Card */}
                  <div className="bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900/50 dark:to-blue-950/30 rounded-xl p-4 border border-[var(--border-color)]">
                    <div className="flex items-center gap-3 mb-3">
                      <Activity className="w-5 h-5 text-[var(--icon-cyan-text)]" />
                      <h3 className="text-md font-bold text-[var(--text-primary)]">Attendance Status</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <div className={`inline-flex px-3 py-1.5 rounded-full text-sm font-semibold ${getStatusColor(currentAttendance.status || 'pending')}`}>
                        {currentAttendance.status 
                          ? currentAttendance.status.charAt(0).toUpperCase() + currentAttendance.status.slice(1) 
                          : 'Pending'}
                      </div>
                      {getEncounterCategoryBadge()}
                    </div>
                  </div>

                  {/* Attendance Details */}
                  <div className="bg-gradient-to-br from-gray-50 to-green-50 dark:from-gray-900/50 dark:to-green-950/30 rounded-xl p-4 border border-[var(--border-color)]">
                    <div className="flex items-center gap-3 mb-3">
                      <Calendar className="w-5 h-5 text-[var(--icon-green-text)]" />
                      <h3 className="text-md font-bold text-[var(--text-primary)]">Visit Details</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[var(--text-secondary)]">Date & Time</span>
                        <span className="text-sm font-semibold text-[var(--text-primary)]">{formatDate(currentAttendance.dateTime)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[var(--text-secondary)]">Attendance Type</span>
                        <span className="text-sm font-semibold text-[var(--icon-cyan-text)]">{getAttendanceTypeLabel(currentAttendance.attendanceType)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[var(--text-secondary)]">Payment Mode</span>
                        <div className="flex items-center gap-1">
                          {getPaymentModeIcon(currentAttendance.paymentMode)}
                          <span className="text-sm font-semibold text-[var(--text-primary)]">{getPaymentModeLabel(currentAttendance.paymentMode)}</span>
                        </div>
                      </div>
                      {currentAttendance.bedId && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-[var(--text-secondary)]">Bed/Ward</span>
                          <span className="text-sm font-semibold text-[var(--text-primary)]">
                            <Bed className="w-3 h-3 inline mr-1" />
                            Bed {currentAttendance.bedNumber || currentAttendance.bedId}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Clinician Information */}
                  <div className="bg-gradient-to-br from-gray-50 to-purple-50 dark:from-gray-900/50 dark:to-purple-950/30 rounded-xl p-4 border border-[var(--border-color)]">
                    <div className="flex items-center gap-3 mb-3">
                      <Stethoscope className="w-5 h-5 text-[var(--icon-purple-text)]" />
                      <h3 className="text-md font-bold text-[var(--text-primary)]">Clinician</h3>
                    </div>
                    <div className="bg-white dark:bg-[var(--bg-main)] rounded-lg p-3 border border-[var(--border-color)]">
                      <p className="font-semibold text-[var(--text-primary)] text-sm">
                        {getClinicianName(currentAttendance)}
                      </p>
                    </div>
                  </div>

                  {/* Latest Vitals */}
                  {latestVitals && (
                    <div className="bg-gradient-to-br from-gray-50 to-red-50 dark:from-gray-900/50 dark:to-red-950/30 rounded-xl p-4 border border-[var(--border-color)]">
                      <div className="flex items-center gap-3 mb-3">
                        <Heart className="w-5 h-5 text-[var(--icon-red-text)]" />
                        <h3 className="text-md font-bold text-[var(--text-primary)]">Latest Vitals</h3>
                        {hasAbnormalVitals && (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {latestVitals.bloodPressure && (
                          <div className="bg-white dark:bg-[var(--bg-main)] rounded-lg p-2 text-center">
                            <p className="text-xs text-[var(--text-secondary)]">BP</p>
                            <p className="font-bold text-sm">{latestVitals.bloodPressure} mmHg</p>
                          </div>
                        )}
                        {latestVitals.temperature && (
                          <div className="bg-white dark:bg-[var(--bg-main)] rounded-lg p-2 text-center">
                            <p className="text-xs text-[var(--text-secondary)]">Temp</p>
                            <p className="font-bold text-sm">{latestVitals.temperature}°C</p>
                          </div>
                        )}
                        {latestVitals.pulse && (
                          <div className="bg-white dark:bg-[var(--bg-main)] rounded-lg p-2 text-center">
                            <p className="text-xs text-[var(--text-secondary)]">Pulse</p>
                            <p className="font-bold text-sm">{latestVitals.pulse} bpm</p>
                          </div>
                        )}
                        {latestVitals.spo2 && (
                          <div className="bg-white dark:bg-[var(--bg-main)] rounded-lg p-2 text-center">
                            <p className="text-xs text-[var(--text-secondary)]">SpO₂</p>
                            <p className="font-bold text-sm">{latestVitals.spo2}%</p>
                          </div>
                        )}
                      </div>
                      <div className="mt-2 text-center">
                        <button onClick={handleGoToVitals} className="text-xs text-[var(--icon-cyan-text)] hover:underline">
                          View all vitals →
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Financial Summary */}
                  <div className="bg-gradient-to-br from-gray-50 to-yellow-50 dark:from-gray-900/50 dark:to-yellow-950/30 rounded-xl p-4 border border-[var(--border-color)]">
                    <div className="flex items-center gap-3 mb-3">
                      <DollarSign className="w-5 h-5 text-[var(--icon-yellow-text)]" />
                      <h3 className="text-md font-bold text-[var(--text-primary)]">Financial Summary</h3>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center bg-white dark:bg-[var(--bg-main)] rounded-lg p-2 border border-[var(--border-color)]">
                        <span className="text-sm text-[var(--text-secondary)]">Total Bill</span>
                        <span className="font-bold text-lg text-[var(--text-primary)]">
                          {formatCurrency(currentAttendance.totalBill || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center bg-white dark:bg-[var(--bg-main)] rounded-lg p-2 border border-[var(--border-color)]">
                        <span className="text-sm text-[var(--text-secondary)]">Paid Amount</span>
                        <span className="font-bold text-lg text-[var(--icon-green-text)]">
                          {formatCurrency(currentAttendance.paidAmount || 0)}
                        </span>
                      </div>
                      {(currentAttendance.outstandingBalance || 0) > 0 && (
                        <div className="flex justify-between items-center bg-red-50 dark:bg-red-950/30 rounded-lg p-2 border border-red-200 dark:border-red-800">
                          <span className="text-sm font-semibold text-red-700 dark:text-red-400">Outstanding</span>
                          <span className="font-bold text-red-700 dark:text-red-400">
                            {formatCurrency(currentAttendance.outstandingBalance || 0)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="bg-gradient-to-br from-gray-50 to-cyan-50 dark:from-gray-900/50 dark:to-cyan-950/30 rounded-xl p-4 border border-[var(--border-color)]">
                    <h3 className="text-md font-bold text-[var(--text-primary)] mb-3">Clinical Summary</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-center bg-white dark:bg-[var(--bg-main)] rounded-lg p-2 border border-[var(--border-color)]">
                        <Pill className="w-4 h-4 text-[var(--icon-purple-text)] mx-auto mb-1" />
                        <div className="font-bold text-[var(--text-primary)]">{currentAttendance.medications?.length || 0}</div>
                        <div className="text-xs text-[var(--text-secondary)]">Medications</div>
                      </div>
                      <div className="text-center bg-white dark:bg-[var(--bg-main)] rounded-lg p-2 border border-[var(--border-color)]">
                        <FlaskConical className="w-4 h-4 text-[var(--icon-green-text)] mx-auto mb-1" />
                        <div className="font-bold text-[var(--text-primary)]">{currentAttendance.labTests?.length || 0}</div>
                        <div className="text-xs text-[var(--text-secondary)]">Lab Tests</div>
                      </div>
                      <div className="text-center bg-white dark:bg-[var(--bg-main)] rounded-lg p-2 border border-[var(--border-color)]">
                        <Scissors className="w-4 h-4 text-[var(--icon-red-text)] mx-auto mb-1" />
                        <div className="font-bold text-[var(--text-primary)]">{currentAttendance.procedures?.length || 0}</div>
                        <div className="text-xs text-[var(--text-secondary)]">Procedures</div>
                      </div>
                      <div className="text-center bg-white dark:bg-[var(--bg-main)] rounded-lg p-2 border border-[var(--border-color)]">
                        <Heart className="w-4 h-4 text-[var(--icon-red-text)] mx-auto mb-1" />
                        <div className="font-bold text-[var(--text-primary)]">{vitalsList.length}</div>
                        <div className="text-xs text-[var(--text-secondary)]">Vitals</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MEDICATIONS TAB */}
          {activeTab === 'medications' && (
            <div>
              {currentAttendance.medications && currentAttendance.medications.length > 0 ? (
                <Table heads={['Medication', 'Dosage', 'Frequency', 'Duration', 'Status', 'Prescribed By', 'Date']}>
                  {currentAttendance.medications.map((med: any) => (
                    <tr key={med.id}>
                      <TdPrimary>{med.name}</TdPrimary>
                      <Td>{med.dosage || '—'}</Td>
                      <Td>{med.frequency || '—'}</Td>
                      <Td>{med.duration || '—'}</Td>
                      <Td><StatusBadge status={med.status || 'prescribed'} /></Td>
                      <Td>{med.prescribedBy?.fullName || med.createdBy?.fullName || '—'}</Td>
                      <Td>{new Date(med.createdAt).toLocaleDateString()}</Td>
                    </tr>
                  ))}
                </Table>
              ) : (
                <div className="text-center py-12">
                  <Pill className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
                  <p className="text-[var(--text-secondary)]">No medications prescribed for this attendance.</p>
                </div>
              )}
            </div>
          )}

          {/* LAB TESTS TAB */}
          {activeTab === 'lab-tests' && (
            <div>
              {currentAttendance.labTests && currentAttendance.labTests.length > 0 ? (
                <Table heads={['Test', 'Priority', 'Status', 'Requested By', 'Requested Date', 'Result']}>
                  {currentAttendance.labTests.map((test: any) => (
                    <tr key={test.id}>
                      <TdPrimary>{test.ServiceCatalog?.name || test.name}</TdPrimary>
                      <Td>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          test.priority === 'stat' ? 'bg-red-100 text-red-700' :
                          test.priority === 'urgent' ? 'bg-orange-100 text-orange-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {test.priority || 'routine'}
                        </span>
                      </Td>
                      <Td><StatusBadge status={test.status} /></Td>
                      <Td>{test.requestedBy?.fullName || '—'}</Td>
                      <Td>{new Date(test.requestedAt || test.createdAt).toLocaleDateString()}</Td>
                      <Td>{test.result ? (typeof test.result === 'object' ? JSON.stringify(test.result) : test.result) : '—'}</Td>
                    </tr>
                  ))}
                </Table>
              ) : (
                <div className="text-center py-12">
                  <FlaskConical className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
                  <p className="text-[var(--text-secondary)]">No lab tests requested for this attendance.</p>
                </div>
              )}
            </div>
          )}

          {/* PROCEDURES TAB */}
          {activeTab === 'procedures' && (
            <div>
              {currentAttendance.procedures && currentAttendance.procedures.length > 0 ? (
                <Table heads={['Procedure', 'Scheduled Date', 'Status', 'Notes', 'Requested By']}>
                  {currentAttendance.procedures.map((proc: any) => (
                    <tr key={proc.id}>
                      <TdPrimary>{proc.ServiceCatalog?.name || proc.name}</TdPrimary>
                      <Td>{proc.scheduledDate ? new Date(proc.scheduledDate).toLocaleString() : '—'}</Td>
                      <Td><StatusBadge status={proc.status} /></Td>
                      <Td className="max-w-xs truncate">{proc.notes || '—'}</Td>
                      <Td>{proc.requestedBy?.fullName || proc.createdBy?.fullName || '—'}</Td>
                    </tr>
                  ))}
                </Table>
              ) : (
                <div className="text-center py-12">
                  <Scissors className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
                  <p className="text-[var(--text-secondary)]">No procedures scheduled for this attendance.</p>
                </div>
              )}
            </div>
          )}

          {/* VITALS TAB */}
          {activeTab === 'vitals' && (
            <div>
              {vitalsList.length > 0 ? (
                <VitalsHistory 
                  vitals={vitalsList}
                  isLoading={vitalsLoading}
                  isAntenatal={currentAttendance.attendanceType === 'antenatal'}
                />
              ) : (
                <div className="text-center py-12">
                  <Heart className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
                  <p className="text-[var(--text-secondary)]">No vitals recorded for this attendance.</p>
                  <button
                    onClick={handleGoToVitals}
                    className="mt-3 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg text-sm font-medium"
                  >
                    Record Vitals
                  </button>
                </div>
              )}
            </div>
          )}

          {/* BILLING TAB */}
          {activeTab === 'billing' && (
            <div>
              {attendanceBills.length > 0 ? (
                <div className="space-y-4">
                  {attendanceBills.map((bill: any) => (
                    <div key={bill.id} className="bg-[var(--bg-main)] rounded-xl p-4 border border-[var(--border-color)]">
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--border-color)]">
                        <div>
                          <h3 className="font-bold text-[var(--text-primary)]">{bill.billNumber}</h3>
                          <p className="text-xs text-[var(--text-secondary)]">{formatDate(bill.billDate || bill.createdAt)}</p>
                        </div>
                        <StatusBadge status={bill.status} />
                      </div>
                      
                      <div className="space-y-2">
                        {bill.BillLineItem?.filter((item: any) => !item.isVoided).slice(0, 5).map((item: any) => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span className="text-[var(--text-secondary)]">{item.description} x{item.quantity}</span>
                            <span className="font-medium text-[var(--text-primary)]">{formatCurrency(item.lineTotal)}</span>
                          </div>
                        ))}
                        {(bill.BillLineItem?.filter((item: any) => !item.isVoided).length || 0) > 5 && (
                          <p className="text-xs text-[var(--text-tertiary)] text-center">
                            +{(bill.BillLineItem?.filter((item: any) => !item.isVoided).length || 0) - 5} more items
                          </p>
                        )}
                        
                        <div className="pt-2 mt-2 border-t border-[var(--border-color)]">
                          <div className="flex justify-between font-bold">
                            <span>Total</span>
                            <span>{formatCurrency(bill.totalAmount)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-[var(--text-secondary)]">Paid</span>
                            <span className="text-[var(--icon-green-text)]">{formatCurrency(bill.paidAmount || 0)}</span>
                          </div>
                          {bill.balance > 0 && (
                            <div className="flex justify-between text-sm font-semibold">
                              <span className="text-[var(--icon-red-text)]">Balance</span>
                              <span className="text-[var(--icon-red-text)]">{formatCurrency(bill.balance)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Receipt className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
                  <p className="text-[var(--text-secondary)]">No billing records for this attendance.</p>
                  <button
                    onClick={handleGoToBilling}
                    className="mt-3 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg text-sm font-medium"
                  >
                    Go to Billing
                  </button>
                </div>
              )}
            </div>
          )}

          {/* CLINICAL TAB */}
          {activeTab === 'clinical' && (
            <div className="space-y-6">
              {/* Clinical Notes Section */}
              <div className="bg-[var(--bg-main)] rounded-xl p-5 border border-[var(--border-color)]">
                <div className="flex items-center gap-3 mb-4">
                  <Clipboard className="w-5 h-5 text-[var(--icon-cyan-text)]" />
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">Clinical Notes</h3>
                </div>
                
                <div className="space-y-4">
                  {/* History of Presenting Complaint */}
                  {(currentAttendance as any)?.historyPresentingComplaint && (
                    <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                      <p className="text-xs font-semibold text-purple-700 dark:text-purple-400 mb-2">History of Presenting Complaint</p>
                      <p className="text-sm text-[var(--text-primary)]">{(currentAttendance as any).historyPresentingComplaint}</p>
                    </div>
                  )}
                  
                  {/* ODQ */}
                  {(currentAttendance as any)?.onsetDurationQuality && (
                    <div className="bg-indigo-50 dark:bg-indigo-950/30 rounded-lg p-4 border border-indigo-200 dark:border-indigo-800">
                      <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 mb-2">Onset, Duration & Quality</p>
                      <p className="text-sm text-[var(--text-primary)]">{(currentAttendance as any).onsetDurationQuality}</p>
                    </div>
                  )}
                  
                  {/* Physical Examination */}
                  {(currentAttendance as any)?.physicalExamination && (
                    <div className="bg-teal-50 dark:bg-teal-950/30 rounded-lg p-4 border border-teal-200 dark:border-teal-800">
                      <p className="text-xs font-semibold text-teal-700 dark:text-teal-400 mb-2">Physical Examination</p>
                      <p className="text-sm text-[var(--text-primary)]">{(currentAttendance as any).physicalExamination}</p>
                    </div>
                  )}
                  
                  {/* Treatment Plan */}
                  {(currentAttendance as any)?.treatmentPlan && (
                    <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4 border border-green-200 dark:border-green-800">
                      <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-2">Treatment Plan</p>
                      <p className="text-sm text-[var(--text-primary)]">{(currentAttendance as any).treatmentPlan}</p>
                    </div>
                  )}
                  
                  {/* Follow-up Date */}
                  {(currentAttendance as any)?.followUpDate && (
                    <div className="bg-yellow-50 dark:bg-yellow-950/30 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                      <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 mb-2">Follow-up Date</p>
                      <p className="text-sm text-[var(--text-primary)]">{new Date((currentAttendance as any).followUpDate).toLocaleDateString()}</p>
                    </div>
                  )}
                  
                  {!(currentAttendance as any)?.historyPresentingComplaint && 
                   !(currentAttendance as any)?.onsetDurationQuality && 
                   !(currentAttendance as any)?.physicalExamination && 
                   !(currentAttendance as any)?.treatmentPlan && (
                    <div className="text-center py-8">
                      <Stethoscope className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
                      <p className="text-[var(--text-secondary)]">No clinical notes recorded for this attendance.</p>
                      {canAddClinical && currentAttendance.status === 'pending' && (
                        <button
                          onClick={() => handleAddClinical('diagnosis')}
                          className="mt-3 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg text-sm font-medium"
                        >
                          Add Clinical Notes
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Action Buttons for Adding Clinical Data */}
              {canAddClinical && currentAttendance.status === 'pending' && (
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/40 dark:to-cyan-950/40 rounded-xl p-5 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-blue-900 dark:text-blue-300 mb-1">Quick Clinical Actions</h3>
                      <p className="text-xs text-blue-700 dark:text-blue-400">Add clinical data to this attendance record</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => handleAddClinical('diagnosis')}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
                      >
                        <Plus className="w-3 h-3" />
                        Diagnosis
                      </button>
                      <button
                        onClick={() => handleAddClinical('lab')}
                        className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium"
                      >
                        <Plus className="w-3 h-3" />
                        Lab Test
                      </button>
                      <button
                        onClick={() => handleAddClinical('medication')}
                        className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-xs font-medium"
                      >
                        <Plus className="w-3 h-3" />
                        Medication
                      </button>
                      <button
                        onClick={() => handleAddClinical('procedure')}
                        className="flex items-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-xs font-medium"
                      >
                        <Plus className="w-3 h-3" />
                        Procedure
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-card)] rounded-xl p-6 max-w-md w-full border border-[var(--border-color)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[var(--icon-red-bg)] rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-[var(--icon-red-text)]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">Delete Attendance</h3>
                <p className="text-sm text-[var(--text-secondary)]">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-[var(--text-primary)] mb-4">
              Are you sure you want to delete this attendance record? 
              All clinical data associated with this attendance will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteAttendance}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Delete Attendance
              </button>
              <button
                onClick={() => setDeleteConfirm(false)}
                className="flex-1 px-4 py-2 bg-[var(--bg-main)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--border-color)] transition-colors font-medium border border-[var(--border-color)]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModalOpen && currentAttendance && (
        <NewAttendanceModal
          patientId={currentAttendance.patientId}
          onSuccess={handleEditSuccess}
          onClose={handleEditClose}
          isEditMode={true}
          attendanceData={currentAttendance}
        />
      )}
    </div>
  );
}