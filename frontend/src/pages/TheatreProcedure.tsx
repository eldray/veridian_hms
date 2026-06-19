// src/pages/TheatreProcedure.tsx - Theatre Procedure Management Page
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAttendanceStore } from '../store/attendanceStore';
import { usePatientStore } from '../store/patientStore';
import { useAuthStore } from '../store/authStore';
import { useMedicalServicesStore } from '../store/medicalServicesStore';
import { useToast } from '../store/toastStore';
import { PatientAttendanceSelector } from '../components/vitals/PatientAttendanceSelector';
import { getPatientName } from '../utils/patient';
import {
  ChevronLeft,
  Scissors,
  ClipboardList,
  RefreshCw,
  AlertCircle,
  Syringe,
  Stethoscope,
  FileText,
  CheckCircle,
  Clock,
  User,
  Calendar,
  Activity,
  Plus,
  X,
  Search,
  Eye,
  Edit,
  Trash2,
  Printer,
  Droplet,
  Heart
} from 'lucide-react';

const getEntityId = (entity: { id?: string; _id?: string } | null): string | undefined =>
  entity?.id || entity?._id;

const getStatusBadge = (status: string) => {
  const config: Record<string, { color: string; bg: string; label: string }> = {
    scheduled:   { color: 'text-blue-800',   bg: 'bg-blue-100',   label: 'Scheduled' },
    in_progress: { color: 'text-yellow-800', bg: 'bg-yellow-100', label: 'In Progress' },
    completed:   { color: 'text-green-800',  bg: 'bg-green-100',  label: 'Completed' },
    cancelled:   { color: 'text-red-800',    bg: 'bg-red-100',    label: 'Cancelled' },
  };
  const c = config[status?.toLowerCase()] || config.scheduled;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.color}`}>
      {c.label}
    </span>
  );
};

export default function TheatreProcedure() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { success, error: toastError } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedAttendanceId, setSelectedAttendanceId] = useState<string>('');
  const [selectedProcedureId, setSelectedProcedureId] = useState<string>('');
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Theatre form state
  const [anesthesiaNotes, setAnesthesiaNotes] = useState('');
  const [intraOperativeNotes, setIntraOperativeNotes] = useState('');
  const [postOperativeNotes, setPostOperativeNotes] = useState('');
  const [bloodLoss, setBloodLoss] = useState<number | ''>('');
  const [complications, setComplications] = useState('');
  const [hasComplications, setHasComplications] = useState(false);
  const [anesthesiaType, setAnesthesiaType] = useState('general');
  const [outcome, setOutcome] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Schedule modal state
  const [scheduleSearch, setScheduleSearch] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [scheduledDate, setScheduledDate] = useState('');
  const [procedureNotes, setProcedureNotes] = useState('');
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);

  const hasLoaded = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    attendances,
    currentAttendance,
    getAttendance,
    getAttendances,
    addProcedure,
    updateProcedureStatus,
    canAddMedicalEntries,
    calculateBill,
  } = useAttendanceStore();
  const { patients, loadPatients, fetchPatient } = usePatientStore();
  const { user } = useAuthStore();
  const { procedureTemplates, getProcedureTemplates } = useMedicalServicesStore();

  const [patient, setPatient] = useState<any>(null);
  const [attendance, setAttendance] = useState<any>(null);
  const [allAttendances, setAllAttendances] = useState<any[]>([]);

  const loadData = async () => {
    try {
      setRefreshing(true);
      await Promise.all([
        loadPatients(),
        getProcedureTemplates(false)
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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        searchInputRef.current && !searchInputRef.current.contains(e.target as Node)
      ) {
        setShowTemplateDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAttendanceChange = async (attendanceId: string) => {
    setSelectedAttendanceId(attendanceId);
    setSelectedProcedureId('');
    await getAttendance(attendanceId);
  };

  const handleClearSelection = () => {
    setSelectedAttendanceId('');
    setAttendance(null);
    setSelectedProcedureId('');
    resetForm();
  };

  const canAddEntries = attendance ? canAddMedicalEntries(attendance) : false;
  const canUpdateProcedure = attendance && ['pending', 'admitted'].includes(attendance.status);

  const procedures = useMemo(() => {
    if (!currentAttendance?.Procedure) return [];
    return currentAttendance.Procedure.map((proc: any) => ({
      ...proc,
      id: proc.id,
      name: proc.ServiceCatalog?.name || proc.name || 'Unknown Procedure',
    }));
  }, [currentAttendance]);

  const selectedProcedure = procedures.find((p: any) => p.id === selectedProcedureId);

  useEffect(() => {
    if (selectedProcedure) {
      setAnesthesiaNotes(selectedProcedure.anesthesiaNotes || '');
      setIntraOperativeNotes(selectedProcedure.intraOperativeNotes || '');
      setPostOperativeNotes(selectedProcedure.postOperativeNotes || '');
      setBloodLoss(selectedProcedure.bloodLoss || '');
      setComplications(selectedProcedure.complications || '');
      setHasComplications(!!selectedProcedure.complications);
      setOutcome(selectedProcedure.outcome || '');
      if (selectedProcedure.anesthesiaNotes) {
        const n = selectedProcedure.anesthesiaNotes.toLowerCase();
        ['general', 'spinal', 'epidural', 'local', 'sedation', 'regional'].forEach(t => {
          if (n.includes(t)) setAnesthesiaType(t);
        });
      }
    } else {
      resetForm();
    }
  }, [selectedProcedure]);

  const resetForm = () => {
    setAnesthesiaNotes('');
    setIntraOperativeNotes('');
    setPostOperativeNotes('');
    setBloodLoss('');
    setComplications('');
    setHasComplications(false);
    setAnesthesiaType('general');
    setOutcome('');
  };

  const filteredTemplates = procedureTemplates.filter(t =>
    t.name?.toLowerCase().includes(scheduleSearch.toLowerCase()) ||
    t.procedureCode?.toLowerCase().includes(scheduleSearch.toLowerCase()) ||
    t.category?.toLowerCase().includes(scheduleSearch.toLowerCase())
  );

  const handleSelectTemplate = (template: any) => {
    setSelectedTemplate(template);
    setScheduleSearch(template.name);
    setShowTemplateDropdown(false);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setScheduledDate(tomorrow.toISOString().slice(0, 16));
  };

  const clearTemplateSelection = () => {
    setSelectedTemplate(null);
    setScheduleSearch('');
    setScheduledDate('');
    setProcedureNotes('');
  };

  const handleScheduleProcedure = async () => {
    if (!selectedAttendanceId || !selectedTemplate) {
      toastError('Selection required', 'Please select a procedure template');
      return;
    }
    if (!scheduledDate) {
      toastError('Date required', 'Please select a scheduled date');
      return;
    }
    if (!canAddEntries) {
      toastError('Access denied', `Cannot schedule for ${attendance?.status} visit`);
      return;
    }
    setIsScheduling(true);
    try {
      await addProcedure(selectedAttendanceId, {
        serviceCatalogId: selectedTemplate.id,
        scheduledDate,
        notes: procedureNotes,
      });
      success('Procedure Scheduled', `${selectedTemplate.name} has been scheduled`);
      clearTemplateSelection();
      setShowScheduleModal(false);
      await getAttendance(selectedAttendanceId);
      await calculateBill(selectedAttendanceId);
    } catch (err: any) {
      toastError('Schedule Failed', err.message || 'Could not schedule procedure');
    } finally {
      setIsScheduling(false);
    }
  };

  const handleStartProcedure = async (procedureId: string) => {
    if (!selectedAttendanceId) return;
    try {
      await updateProcedureStatus(selectedAttendanceId, procedureId, {
        status: 'in_progress',
        performedById: user?.id || '',
      });
      success('Procedure started', 'Operation in progress');
      await getAttendance(selectedAttendanceId);
    } catch (error: any) {
      toastError('Update failed', error.message);
    }
  };

  const handleSubmitTheatreNotes = async () => {
    if (!selectedProcedureId || !selectedAttendanceId) {
      toastError('Selection required', 'Please select a procedure');
      return;
    }
    if (!canUpdateProcedure) {
      toastError('Access denied', 'Cannot update completed/cancelled attendance');
      return;
    }
    setIsSubmitting(true);
    try {
      await updateProcedureStatus(selectedAttendanceId, selectedProcedureId, {
        status: 'completed',
        anesthesiaNotes: anesthesiaNotes || null,
        intraOperativeNotes: intraOperativeNotes || null,
        postOperativeNotes: postOperativeNotes || null,
        bloodLoss: bloodLoss ? Number(bloodLoss) : null,
        complications: hasComplications ? complications : null,
        outcome: outcome || null,
        performedById: user?.id || '',
        performedAt: new Date().toISOString(),
      });
      success('Operation notes saved', 'Theatre procedure completed');
      resetForm();
      setSelectedProcedureId('');
      await getAttendance(selectedAttendanceId);
      await calculateBill(selectedAttendanceId);
    } catch (err: any) {
      toastError('Save failed', err.message || 'Could not save operation notes');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelProcedure = async (procedureId: string) => {
    if (!window.confirm('Cancel this procedure? This action cannot be undone.')) return;
    try {
      await updateProcedureStatus(selectedAttendanceId!, procedureId, {
        status: 'cancelled',
      });
      success('Procedure cancelled', 'The procedure has been cancelled');
      await getAttendance(selectedAttendanceId!);
    } catch (error: any) {
      toastError('Cancel failed', error.message);
    }
  };

  const anesthesiaTypes = [
    { value: 'general', label: 'General Anesthesia' },
    { value: 'regional', label: 'Regional Anesthesia' },
    { value: 'local', label: 'Local Anesthesia' },
    { value: 'sedation', label: 'Conscious Sedation' },
    { value: 'spinal', label: 'Spinal Anesthesia' },
    { value: 'epidural', label: 'Epidural Anesthesia' },
    { value: 'none', label: 'None' },
  ];

  const outcomeOptions = [
    { value: 'successful', label: 'Successful — No Complications' },
    { value: 'successful_minor', label: 'Successful — Minor Complications' },
    { value: 'successful_major', label: 'Successful — Major Complications' },
    { value: 'unsuccessful', label: 'Unsuccessful' },
    { value: 'aborted', label: 'Procedure Aborted' },
  ];

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
        <div className="text-center bg-[var(--bg-card)] p-8 rounded-xl border border-[var(--border-color)]">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Loading Theatre Data...</h2>
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
            onClick={() => navigate('/dashboard/theatre')}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all"
          >
            Back to Theatre Queue
          </button>
        </div>
      </div>
    );
  }

  const patientFullName = getPatientName(patient);
  const scheduledProcedures = procedures.filter((p: any) => p.status === 'scheduled');
  const inProgressProcedures = procedures.filter((p: any) => p.status === 'in_progress');
  const completedProcedures = procedures.filter((p: any) => p.status === 'completed');

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard/theatre')}
            className="p-2 hover:bg-[var(--bg-card)] rounded-lg transition-all border border-[var(--border-color)]"
          >
            <ChevronLeft className="w-5 h-5 text-[var(--text-primary)]" />
          </button>
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <Scissors className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Theatre Management</h1>
            <p className="text-sm text-[var(--text-secondary)]">{patientFullName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowScheduleModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all text-sm"
            disabled={!canAddEntries}
          >
            <Plus className="w-4 h-4" />
            Schedule Procedure
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
          setSelectedProcedureId('');
        }}
        onAttendanceSelect={handleAttendanceChange}
        onClearSelection={handleClearSelection}
      />

      {/* No Attendance Selected */}
      {!selectedAttendanceId && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
          <Calendar className="w-12 h-12 text-yellow-600 mx-auto mb-3 opacity-50" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No Attendance Selected</h3>
          <p className="text-[var(--text-secondary)]">Please select an attendance from the dropdown above to manage procedures.</p>
        </div>
      )}

      {/* Patient Header Card */}
      {selectedAttendanceId && attendance && (
        <>
          <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <User className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">
                    {patientFullName}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)] mt-1">
                    <span>{calculateAge(patient.dateOfBirth)} years • {patient.gender}</span>
                    <span>•</span>
                    <span>ID: {patient.folderNumber}</span>
                    <span>•</span>
                    <span>{patient.contact}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono bg-[var(--bg-main)] px-2.5 py-1 rounded-full border border-[var(--border-color)] text-[var(--text-secondary)]">
                  #{attendance.attendanceNumber || 'New Visit'}
                </span>
                <span className="text-xs bg-[var(--bg-main)] px-2.5 py-1 rounded-full border border-[var(--border-color)] text-[var(--text-secondary)]">
                  {new Date(attendance.dateTime || attendance.createdAt || '').toLocaleDateString()}
                </span>
                {getStatusBadge(attendance.status)}
              </div>
            </div>
          </div>

          {/* Read-only warning */}
          {!canUpdateProcedure && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <p className="text-sm text-yellow-700">
                This visit is <strong>{attendance.status}</strong>. Procedures can be viewed but not modified.
              </p>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-blue-600">{scheduledProcedures.length}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">Scheduled</p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </div>
            <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-yellow-600">{inProgressProcedures.length}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">In Progress</p>
                </div>
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Activity className="w-5 h-5 text-yellow-600" />
                </div>
              </div>
            </div>
            <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-green-600">{completedProcedures.length}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">Completed</p>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Main Content - Two Column Layout */}
          <div className="flex gap-4 items-stretch">
            {/* LEFT COLUMN - Procedures List */}
            <div className="w-80 flex-shrink-0 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden flex flex-col">
              <div className="bg-[var(--bg-main)] px-4 py-2.5 border-b border-[var(--border-color)] flex items-center justify-between flex-shrink-0">
                <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2 text-sm">
                  <Scissors className="w-4 h-4 text-purple-600" />
                  Procedures ({procedures.length})
                </h3>
                {canAddEntries && (
                  <button
                    onClick={() => setShowScheduleModal(true)}
                    className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs hover:bg-purple-700 hover:text-white transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                )}
              </div>

              <div className="divide-y divide-[var(--border-color)] overflow-y-auto flex-1" style={{ maxHeight: '500px' }}>
                {procedures.length === 0 ? (
                  <div className="p-8 text-center">
                    <Scissors className="w-10 h-10 text-[var(--text-secondary)] mx-auto mb-3 opacity-40" />
                    <p className="text-sm text-[var(--text-secondary)]">No procedures scheduled</p>
                    {canAddEntries && (
                      <button
                        onClick={() => setShowScheduleModal(true)}
                        className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-700 hover:text-white transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Schedule Procedure
                      </button>
                    )}
                  </div>
                ) : (
                  procedures.map((procedure: any) => {
                    const isSelected = selectedProcedureId === procedure.id;
                    return (
                      <button
                        key={procedure.id}
                        onClick={() => setSelectedProcedureId(procedure.id)}
                        className={`w-full text-left p-3 transition-all ${
                          isSelected
                            ? 'bg-purple-50 border-l-4 border-purple-600'
                            : 'hover:bg-[var(--bg-main)]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-medium text-[var(--text-primary)] text-sm leading-snug">
                            {procedure.name}
                          </span>
                          {getStatusBadge(procedure.status)}
                        </div>
                        {procedure.scheduledDate && (
                          <div className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(procedure.scheduledDate).toLocaleString()}
                          </div>
                        )}
                        {procedure.performedAt && procedure.status === 'completed' && (
                          <div className="text-xs text-green-600 flex items-center gap-1 mt-1">
                            <CheckCircle className="w-3 h-3" />
                            Completed: {new Date(procedure.performedAt).toLocaleDateString()}
                          </div>
                        )}
                        {procedure.notes && (
                          <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">{procedure.notes}</p>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* RIGHT COLUMN - Procedure Details & Notes */}
            <div className="flex-1 min-w-0">
              {selectedProcedure ? (
                <div className="space-y-4">
                  {/* Procedure Info Card */}
                  <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                    <div className="bg-[var(--bg-main)] px-4 py-2.5 border-b border-[var(--border-color)]">
                      <h4 className="font-semibold text-[var(--text-primary)] flex items-center gap-2 text-sm">
                        <FileText className="w-4 h-4 text-purple-600" />
                        Procedure Information
                      </h4>
                    </div>
                    <div className="p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-[var(--text-secondary)]">Procedure Name</p>
                          <p className="text-sm font-medium text-[var(--text-primary)]">{selectedProcedure.name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-[var(--text-secondary)]">Status</p>
                          <div className="mt-1">{getStatusBadge(selectedProcedure.status)}</div>
                        </div>
                        <div>
                          <p className="text-xs text-[var(--text-secondary)]">Scheduled Date</p>
                          <p className="text-sm text-[var(--text-primary)]">
                            {selectedProcedure.scheduledDate 
                              ? new Date(selectedProcedure.scheduledDate).toLocaleString()
                              : '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-[var(--text-secondary)]">Category</p>
                          <p className="text-sm text-[var(--text-primary)]">
                            {selectedProcedure.ServiceCatalog?.category || 'General'}
                          </p>
                        </div>
                      </div>
                      {selectedProcedure.notes && (
                        <div className="mt-3 pt-3 border-t border-[var(--border-color)]">
                          <p className="text-xs text-[var(--text-secondary)]">Notes</p>
                          <p className="text-sm text-[var(--text-primary)]">{selectedProcedure.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Anesthesia Section */}
                  <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                    <div className="bg-[var(--bg-main)] px-4 py-2.5 border-b border-[var(--border-color)]">
                      <h4 className="font-semibold text-[var(--text-primary)] flex items-center gap-2 text-sm">
                        <Syringe className="w-4 h-4 text-blue-500" />
                        Anesthesia
                      </h4>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">Anesthesia Type</label>
                          <select
                            value={anesthesiaType}
                            onChange={(e) => setAnesthesiaType(e.target.value)}
                            className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                            disabled={!canUpdateProcedure || selectedProcedure.status === 'completed'}
                          >
                            {anesthesiaTypes.map(t => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">Blood Loss (ml)</label>
                          <input
                            type="number"
                            value={bloodLoss}
                            onChange={(e) => setBloodLoss(e.target.value ? Number(e.target.value) : '')}
                            placeholder="Optional"
                            className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                            disabled={!canUpdateProcedure || selectedProcedure.status === 'completed'}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">Anesthesia Notes</label>
                        <textarea
                          value={anesthesiaNotes}
                          onChange={(e) => setAnesthesiaNotes(e.target.value)}
                          rows={3}
                          placeholder="Medications, patient responses, monitoring details..."
                          className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm resize-none focus:ring-2 focus:ring-purple-500"
                          disabled={!canUpdateProcedure || selectedProcedure.status === 'completed'}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Intra-operative Section */}
                  <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                    <div className="bg-[var(--bg-main)] px-4 py-2.5 border-b border-[var(--border-color)]">
                      <h4 className="font-semibold text-[var(--text-primary)] flex items-center gap-2 text-sm">
                        <Scissors className="w-4 h-4 text-green-500" />
                        Intra-operative Notes
                      </h4>
                    </div>
                    <div className="p-4 space-y-3">
                      <textarea
                        value={intraOperativeNotes}
                        onChange={(e) => setIntraOperativeNotes(e.target.value)}
                        rows={4}
                        placeholder="Surgical procedure details, findings, techniques, instruments..."
                        className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm resize-none focus:ring-2 focus:ring-purple-500"
                        disabled={!canUpdateProcedure || selectedProcedure.status === 'completed'}
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="complications"
                          checked={hasComplications}
                          onChange={(e) => setHasComplications(e.target.checked)}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          disabled={!canUpdateProcedure || selectedProcedure.status === 'completed'}
                        />
                        <label htmlFor="complications" className="text-sm font-medium text-[var(--text-primary)]">
                          Complications encountered
                        </label>
                      </div>
                      {hasComplications && (
                        <textarea
                          value={complications}
                          onChange={(e) => setComplications(e.target.value)}
                          rows={2}
                          placeholder="Describe complications and how they were managed..."
                          className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm resize-none focus:ring-2 focus:ring-purple-500"
                          disabled={!canUpdateProcedure || selectedProcedure.status === 'completed'}
                        />
                      )}
                    </div>
                  </div>

                  {/* Post-operative Section */}
                  <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                    <div className="bg-[var(--bg-main)] px-4 py-2.5 border-b border-[var(--border-color)]">
                      <h4 className="font-semibold text-[var(--text-primary)] flex items-center gap-2 text-sm">
                        <Heart className="w-4 h-4 text-red-500" />
                        Post-operative Notes
                      </h4>
                    </div>
                    <div className="p-4 space-y-3">
                      <textarea
                        value={postOperativeNotes}
                        onChange={(e) => setPostOperativeNotes(e.target.value)}
                        rows={3}
                        placeholder="Recovery status, immediate post-op care, discharge instructions..."
                        className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm resize-none focus:ring-2 focus:ring-purple-500"
                        disabled={!canUpdateProcedure || selectedProcedure.status === 'completed'}
                      />
                      <div>
                        <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">Procedure Outcome</label>
                        <select
                          value={outcome}
                          onChange={(e) => setOutcome(e.target.value)}
                          className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                          disabled={!canUpdateProcedure || selectedProcedure.status === 'completed'}
                        >
                          <option value="">Select outcome...</option>
                          {outcomeOptions.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {canUpdateProcedure && selectedProcedure.status !== 'completed' && selectedProcedure.status !== 'cancelled' && (
                    <div className="flex gap-3">
                      {selectedProcedure.status === 'scheduled' && (
                        <button
                          onClick={() => handleStartProcedure(selectedProcedure.id)}
                          className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-all text-sm font-medium"
                        >
                          Start Procedure
                        </button>
                      )}
                      {selectedProcedure.status === 'in_progress' && (
                        <button
                          onClick={handleSubmitTheatreNotes}
                          disabled={isSubmitting}
                          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm font-medium disabled:opacity-50"
                        >
                          {isSubmitting ? 'Saving...' : 'Complete Procedure'}
                        </button>
                      )}
                      <button
                        onClick={() => handleCancelProcedure(selectedProcedure.id)}
                        className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-all text-sm font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ) : procedures.length > 0 ? (
                <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-8 text-center h-full flex flex-col items-center justify-center">
                  <ClipboardList className="w-12 h-12 text-[var(--text-secondary)] opacity-40 mb-3" />
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">No Procedure Selected</h3>
                  <p className="text-sm text-[var(--text-secondary)]">Select a procedure from the list to enter operation notes</p>
                </div>
              ) : null}
            </div>
          </div>
        </>
      )}

      {/* Schedule Procedure Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowScheduleModal(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-[var(--bg-card)] rounded-xl shadow-xl max-w-md w-full border border-[var(--border-color)]">
              <div className="bg-[var(--bg-main)] px-5 py-3 border-b border-[var(--border-color)] rounded-t-xl flex items-center justify-between">
                <h2 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-purple-600" />
                  Schedule Procedure
                </h2>
                <button onClick={() => setShowScheduleModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                  <X className="w-4 h-4 text-[var(--text-secondary)]" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">Procedure *</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={scheduleSearch}
                      onChange={(e) => { setScheduleSearch(e.target.value); setShowTemplateDropdown(true); }}
                      onFocus={() => setShowTemplateDropdown(true)}
                      placeholder="Search procedures..."
                      className="w-full pl-9 pr-8 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                    />
                    {scheduleSearch && (
                      <button
                        onClick={clearTemplateSelection}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-gray-100"
                      >
                        <X className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                      </button>
                    )}
                  </div>
                  {showTemplateDropdown && scheduleSearch && filteredTemplates.length > 0 && (
                    <div
                      ref={dropdownRef}
                      className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto border border-[var(--border-color)] rounded-lg bg-[var(--bg-card)] shadow-lg"
                    >
                      {filteredTemplates.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => handleSelectTemplate(template)}
                          className="w-full text-left p-3 hover:bg-[var(--bg-main)] border-b border-[var(--border-color)] last:border-b-0"
                        >
                          <div className="font-medium text-[var(--text-primary)] text-sm">{template.name}</div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text-secondary)]">
                            <span>{template.category || 'General'}</span>
                            <span>•</span>
                            <span>Duration: {template.duration || 30} min</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">Scheduled Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">Notes (Optional)</label>
                  <textarea
                    value={procedureNotes}
                    onChange={(e) => setProcedureNotes(e.target.value)}
                    rows={2}
                    placeholder="Special instructions, equipment needed, etc."
                    className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm resize-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="px-5 py-3 border-t border-[var(--border-color)] flex gap-3">
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="flex-1 px-4 py-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleScheduleProcedure}
                  disabled={isScheduling || !selectedTemplate || !scheduledDate}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium disabled:opacity-50 transition-all"
                >
                  {isScheduling ? 'Scheduling...' : 'Schedule Procedure'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}