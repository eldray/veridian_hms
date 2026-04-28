// src/pages/AttendanceDetails.tsx - REDESIGNED TO MATCH ATTENDANCE PAGE STYLE
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAttendanceStore } from '../store/attendanceStore';
import { usePatientStore } from '../store/patientStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import NewAttendanceModal from '../components/NewAttendanceModal';
import { 
  ArrowLeft, Edit, FileText, Pill, FlaskConical, Scissors, DollarSign, 
  User, Calendar, Stethoscope, Activity, CreditCard, Shield, 
  AlertCircle, Loader, Trash2, Plus, ChevronLeft, ChevronRight,
  Clock, MapPin, Phone, Mail, Clipboard, Heart, Thermometer, 
  Droplet, Ruler, Weight, Brain, Bone, Eye
} from 'lucide-react';
import type { AttendanceStatus, AttendanceType, PaymentMode } from '../types';

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
    error: attendanceError 
  } = useAttendanceStore();
  
  const { 
    patients, 
    loadPatients, 
    isLoading: patientsLoading 
  } = usePatientStore();
  
  const { hasRole } = useAuthStore();

  // ── State ─────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'overview' | 'medications' | 'lab-tests' | 'procedures' | 'billing' | 'clinical'>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  
  const isLoading = attendanceLoading || patientsLoading;

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
        loadPatients()
      ]);
    } catch (e) {
      toastError('Load failed', 'Could not load attendance data.');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  // Get full name from surname + otherNames
  const getPatientFullName = (patient: any) => {
    if (!patient) return 'Unknown Patient';
    return `${patient.surname || ''} ${patient.otherNames || ''}`.trim();
  };

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

  // ── UI Helper Functions ───────────────────────
  const getStatusColor = (status: AttendanceStatus) => {
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

  // Tabs configuration
  const tabs = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'clinical', label: 'Clinical', icon: Stethoscope },
    { id: 'medications', label: 'Medications', icon: Pill, count: currentAttendance?.medications?.length || 0 },
    { id: 'lab-tests', label: 'Lab Tests', icon: FlaskConical, count: currentAttendance?.labTests?.length || 0 },
    { id: 'procedures', label: 'Procedures', icon: Scissors, count: currentAttendance?.procedures?.length || 0 },
    { id: 'billing', label: 'Billing', icon: DollarSign },
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
      {/* Header - Matching Attendance Page Style */}
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

      {/* Stats Banner - Like Attendance Page */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/40 dark:to-cyan-950/40 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
              Attendance Summary
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
              Status: {currentAttendance.status.charAt(0).toUpperCase() + currentAttendance.status.slice(1)} • Type: {getAttendanceTypeLabel(currentAttendance.attendanceType)}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
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
              💰 ${currentAttendance.totalBill?.toFixed(2) || '0.00'}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions for Clinical Data */}
      {canAddClinical && currentAttendance.status === 'pending' && (
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/40 dark:to-cyan-950/40 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
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
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Two Column Layout */}
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
                    <div className={`inline-flex px-3 py-1.5 rounded-full text-sm font-semibold ${getStatusColor(currentAttendance.status)}`}>
                      {currentAttendance.status.charAt(0).toUpperCase() + currentAttendance.status.slice(1)}
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
                          ${currentAttendance.totalBill?.toFixed(2) || '0.00'}
                        </span>
                      </div>
                      {(currentAttendance.outstandingBalance || 0) > 0 && (
                        <div className="flex justify-between items-center bg-red-50 dark:bg-red-950/30 rounded-lg p-2 border border-red-200 dark:border-red-800">
                          <span className="text-sm font-semibold text-red-700 dark:text-red-400">Outstanding</span>
                          <span className="font-bold text-red-700 dark:text-red-400">
                            ${(currentAttendance.outstandingBalance || 0).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="bg-gradient-to-br from-gray-50 to-cyan-50 dark:from-gray-900/50 dark:to-cyan-950/30 rounded-xl p-4 border border-[var(--border-color)]">
                    <h3 className="text-md font-bold text-[var(--text-primary)] mb-3">Clinical Summary</h3>
                    <div className="grid grid-cols-3 gap-2">
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
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Clinical Tab */}
          {activeTab === 'clinical' && (
            <div className="text-center py-12">
              <Stethoscope className="w-16 h-16 text-[var(--text-tertiary)] mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Clinical Management</h3>
              <p className="text-[var(--text-secondary)] text-lg mb-6">
                Manage diagnoses, lab tests, medications, and procedures for this attendance.
              </p>
              {canAddClinical && currentAttendance.status === 'pending' && (
                <div className="flex justify-center gap-3 flex-wrap">
                  <button
                    onClick={() => handleAddClinical('diagnosis')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Diagnosis
                  </button>
                  <button
                    onClick={() => handleAddClinical('lab')}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Lab Test
                  </button>
                  <button
                    onClick={() => handleAddClinical('medication')}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Medication
                  </button>
                  <button
                    onClick={() => handleAddClinical('procedure')}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Procedure
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Other Tabs Placeholder */}
          {!['overview', 'clinical'].includes(activeTab) && (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-[var(--text-tertiary)] mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Content
              </h3>
              <p className="text-[var(--text-secondary)] text-lg">
                {activeTab} details and management features are coming soon.
              </p>
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