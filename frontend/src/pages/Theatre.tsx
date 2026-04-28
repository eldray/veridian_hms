// src/pages/Theatre.tsx - COMPLETE REDESIGN
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAttendanceStore } from '../store/attendanceStore';
import { usePatientStore } from '../store/patientStore';
import { useAuthStore } from '../store/authStore';
import { useMedicalServicesStore } from '../store/medicalServicesStore';
import { useToast } from '../store/toastStore';
import { PatientAttendanceSelector } from '../components/vitals/PatientAttendanceSelector';

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
  AlertTriangle,
  Droplet,
  Heart,
  Plus,
  Trash2,
  Eye,
  Edit,
  X,
  Search,
  DollarSign,
  Shield
} from 'lucide-react';

// Helper function
const getEntityId = (entity: { id?: string; _id?: string } | null): string | undefined => {
  return entity?.id || entity?._id;
};

// Status Badge Component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    scheduled: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <Clock className="w-3 h-3" /> },
    in_progress: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: <Activity className="w-3 h-3" /> },
    completed: { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle className="w-3 h-3" /> },
    cancelled: { bg: 'bg-red-100', text: 'text-red-700', icon: <AlertCircle className="w-3 h-3" /> },
  };
  const c = config[status?.toLowerCase()] || config.scheduled;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {c.icon}
      {status?.replace('_', ' ') || 'Scheduled'}
    </span>
  );
};

// Loading Screen
const LoadingScreen: React.FC = () => (
  <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
    <div className="text-center bg-[var(--bg-card)] p-8 rounded-xl shadow-sm border border-[var(--border-color)]">
      <div className="w-14 h-14 border-4 border-[var(--icon-purple-text)] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
      <h2 className="text-xl font-bold text-[var(--text-primary)]">Loading Theatre...</h2>
      <p className="text-[var(--text-secondary)] text-sm mt-1">Fetching patient and procedure data</p>
    </div>
  </div>
);

export default function Theatre() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedAttendanceId, setSelectedAttendanceId] = useState<string>('');
  const [selectedProcedureId, setSelectedProcedureId] = useState<string>('');
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Theatre notes form state
  const [anesthesiaNotes, setAnesthesiaNotes] = useState('');
  const [intraOperativeNotes, setIntraOperativeNotes] = useState('');
  const [postOperativeNotes, setPostOperativeNotes] = useState('');
  const [bloodLoss, setBloodLoss] = useState<number | ''>('');
  const [complications, setComplications] = useState('');
  const [hasComplications, setHasComplications] = useState(false);
  const [anesthesiaType, setAnesthesiaType] = useState('general');
  const [outcome, setOutcome] = useState('');

  // Schedule procedure form state
  const [scheduleSearch, setScheduleSearch] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [scheduledDate, setScheduledDate] = useState('');
  const [procedureNotes, setProcedureNotes] = useState('');
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasLoaded = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Stores
  const {
    attendances,
    getAttendances,
    updateAttendanceStatus,
    addProcedure,
    updateProcedureStatus,
    canAddMedicalEntries
  } = useAttendanceStore();

  const { patients, loadPatients } = usePatientStore();
  const { user } = useAuthStore();
  const { procedureTemplates, getProcedureTemplates } = useMedicalServicesStore();

  // Load data
  const loadData = async (force = false) => {
    if (!force && hasLoaded.current) return;
    try {
      setRefreshing(true);
      setIsLoading(true);
      await Promise.all([
        loadPatients(),
        getAttendances(),
        getProcedureTemplates(false)
      ]);
      hasLoaded.current = true;
      success('Data loaded', 'Theatre system ready');
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
        setShowTemplateDropdown(false);
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

  // Procedures from attendance
  const procedures = (selectedAttendance?.Procedure || []).map((proc: any) => ({
    ...proc,
    id: proc.id,
    name: proc.ServiceCatalog?.name || proc.name || 'Unknown Procedure',
    templateId: proc.templateId,
    status: proc.status,
    scheduledDate: proc.scheduledDate,
    performedAt: proc.performedAt,
    performedById: proc.performedById,
    assistantId: proc.assistantId,
    anesthesiaNotes: proc.anesthesiaNotes,
    intraOperativeNotes: proc.intraOperativeNotes,
    postOperativeNotes: proc.postOperativeNotes,
    bloodLoss: proc.bloodLoss,
    complications: proc.complications,
    outcome: proc.outcome,
    notes: proc.notes,
    createdById: proc.createdById,
    createdAt: proc.createdAt,
    updatedAt: proc.updatedAt
  }));

  const selectedProcedure = procedures.find(p => getEntityId(p) === selectedProcedureId);

  // Reset when patient/attendance changes
  useEffect(() => {
    setSelectedProcedureId('');
    resetTheatreForm();
  }, [selectedPatientId, selectedAttendanceId]);

  // Pre-fill form when procedure is selected
  useEffect(() => {
    if (selectedProcedure) {
      setAnesthesiaNotes(selectedProcedure.anesthesiaNotes || '');
      setIntraOperativeNotes(selectedProcedure.intraOperativeNotes || '');
      setPostOperativeNotes(selectedProcedure.postOperativeNotes || '');
      setBloodLoss(selectedProcedure.bloodLoss || '');
      setComplications(selectedProcedure.complications || '');
      setHasComplications(!!selectedProcedure.complications);
      setOutcome(selectedProcedure.outcome || '');
      // Set anesthesia type from notes or default
      if (selectedProcedure.anesthesiaNotes) {
        const notes = selectedProcedure.anesthesiaNotes.toLowerCase();
        if (notes.includes('general')) setAnesthesiaType('general');
        else if (notes.includes('spinal')) setAnesthesiaType('spinal');
        else if (notes.includes('epidural')) setAnesthesiaType('epidural');
        else if (notes.includes('local')) setAnesthesiaType('local');
        else if (notes.includes('sedation')) setAnesthesiaType('sedation');
        else if (notes.includes('regional')) setAnesthesiaType('regional');
      }
    } else {
      resetTheatreForm();
    }
  }, [selectedProcedure]);

  const canAddEntries = selectedAttendance ? canAddMedicalEntries(selectedAttendance) : false;
  const canUpdateProcedure = selectedAttendance && ['pending', 'admitted'].includes(selectedAttendance.status);

  // Filter templates for dropdown
  const filteredTemplates = procedureTemplates.filter(template =>
    template.name?.toLowerCase().includes(scheduleSearch.toLowerCase()) ||
    template.procedureCode?.toLowerCase().includes(scheduleSearch.toLowerCase()) ||
    template.category?.toLowerCase().includes(scheduleSearch.toLowerCase())
  );

  const handleSelectTemplate = (template: any) => {
    setSelectedTemplate(template);
    setScheduleSearch(template.name);
    setShowTemplateDropdown(false);
    // Set default scheduled date to tomorrow
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
      toastError('Access denied', `Cannot schedule for ${selectedAttendance?.status} visit`);
      return;
    }

    setIsScheduling(true);
    try {
      await addProcedure(selectedAttendanceId, {
        serviceCatalogId: selectedTemplate.id,
        scheduledDate: scheduledDate,
        notes: procedureNotes
      });

      success('Procedure Scheduled', `${selectedTemplate.name} has been scheduled`);
      clearTemplateSelection();
      setShowScheduleModal(false);
      await getAttendances();
    } catch (error: any) {
      toastError('Schedule Failed', error.message || 'Could not schedule procedure');
    } finally {
      setIsScheduling(false);
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
      await updateProcedureStatus(
        selectedAttendanceId,
        selectedProcedureId,
        {
          status: 'completed',
          anesthesiaNotes: anesthesiaNotes || null,
          intraOperativeNotes: intraOperativeNotes || null,
          postOperativeNotes: postOperativeNotes || null,
          bloodLoss: bloodLoss ? Number(bloodLoss) : null,
          complications: hasComplications ? complications : null,
          outcome: outcome || null,
          performedById: user?.id || '',
          performedAt: new Date().toISOString(),
        }
      );

      success('Operation notes saved', 'Theatre procedure completed');
      resetTheatreForm();
      setSelectedProcedureId('');
      await getAttendances();
    } catch (error: any) {
      toastError('Save failed', error.message || 'Could not save operation notes');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetTheatreForm = () => {
    setAnesthesiaNotes('');
    setIntraOperativeNotes('');
    setPostOperativeNotes('');
    setBloodLoss('');
    setComplications('');
    setHasComplications(false);
    setAnesthesiaType('general');
    setOutcome('');
  };

  const handleClearSelection = () => {
    setSelectedPatientId('');
    setSelectedAttendanceId('');
    setSelectedProcedureId('');
    resetTheatreForm();
  };

  // Anesthesia types
  const anesthesiaTypes = [
    { value: 'general', label: 'General Anesthesia', icon: <Heart className="w-3 h-3" /> },
    { value: 'regional', label: 'Regional Anesthesia', icon: <Syringe className="w-3 h-3" /> },
    { value: 'local', label: 'Local Anesthesia', icon: <Syringe className="w-3 h-3" /> },
    { value: 'sedation', label: 'Conscious Sedation', icon: <Activity className="w-3 h-3" /> },
    { value: 'spinal', label: 'Spinal Anesthesia', icon: <Droplet className="w-3 h-3" /> },
    { value: 'epidural', label: 'Epidural Anesthesia', icon: <Droplet className="w-3 h-3" /> },
    { value: 'none', label: 'None', icon: <X className="w-3 h-3" /> }
  ];

  // Outcome options
  const outcomeOptions = [
    { value: 'successful', label: 'Successful - No Complications', color: 'text-green-600' },
    { value: 'successful_minor', label: 'Successful - Minor Complications', color: 'text-yellow-600' },
    { value: 'successful_major', label: 'Successful - Major Complications', color: 'text-orange-600' },
    { value: 'unsuccessful', label: 'Unsuccessful', color: 'text-red-600' },
    { value: 'aborted', label: 'Procedure Aborted', color: 'text-red-600' }
  ];

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
          <div className="w-10 h-10 bg-[var(--icon-purple-bg)] rounded-xl flex items-center justify-center">
            <Scissors className="w-5 h-5 text-[var(--icon-purple-text)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Theatre & Operation Notes</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">Record surgical procedures and operation notes</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/dashboard/medical-entries')}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all text-sm"
          >
            <ClipboardList className="w-4 h-4" />
            Medical Entries
          </button>
          {canAddEntries && (
            <button
              onClick={() => setShowScheduleModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm"
            >
              <Plus className="w-4 h-4" />
              Schedule Procedure
            </button>
          )}
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
        onAttendanceSelect={setSelectedAttendanceId}
        onClearSelection={handleClearSelection}
      />

      {/* Patient & Visit Header */}
      {selectedPatient && selectedAttendance && (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
          <div className="px-5 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--icon-purple-bg)] to-[var(--icon-purple-text)] flex items-center justify-center shadow-sm">
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

      {/* Main Content */}
      {selectedAttendance ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT COLUMN - Procedures List */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
              <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)]">
                <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-[var(--icon-purple-text)]" />
                  Scheduled Procedures ({procedures.length})
                </h3>
              </div>
              <div className="divide-y divide-[var(--border-color)] max-h-[500px] overflow-y-auto">
                {procedures.length === 0 ? (
                  <div className="p-8 text-center">
                    <Scissors className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
                    <p className="text-sm text-[var(--text-secondary)]">No procedures scheduled</p>
                    {canAddEntries && (
                      <button
                        onClick={() => setShowScheduleModal(true)}
                        className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg text-sm hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Schedule Procedure
                      </button>
                    )}
                  </div>
                ) : (
                  procedures.map((procedure) => {
                    const template = procedureTemplates.find(t => t.id === procedure.templateId);
                    const isSelected = selectedProcedureId === procedure.id;
                    return (
                      <button
                        key={procedure.id}
                        onClick={() => setSelectedProcedureId(procedure.id)}
                        className={`w-full text-left p-4 transition-all ${
                          isSelected
                            ? 'bg-[var(--icon-purple-bg)]/10 border-l-4 border-[var(--icon-purple-text)]'
                            : 'hover:bg-[var(--bg-main)]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-[var(--text-primary)] text-sm">
                            {procedure.name}
                          </span>
                          <StatusBadge status={procedure.status} />
                        </div>
                        {procedure.scheduledDate && (
                          <div className="text-xs text-[var(--text-secondary)] flex items-center gap-1 mt-1">
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
                          <p className="text-xs text-[var(--text-secondary)] mt-2 line-clamp-2">
                            {procedure.notes}
                          </p>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Stats Summary */}
            {procedures.length > 0 && (
              <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[var(--text-primary)]">
                      {procedures.filter(p => p.status === 'scheduled').length}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">Scheduled</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-yellow-600">
                      {procedures.filter(p => p.status === 'in_progress').length}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">In Progress</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {procedures.filter(p => p.status === 'completed').length}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">Completed</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">
                      {procedures.length}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">Total</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN - Theatre Notes Form */}
          <div className="lg:col-span-2">
            {selectedProcedure ? (
              <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)] flex items-center justify-between flex-wrap gap-2">
                  <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[var(--icon-purple-text)]" />
                    Operation Notes: {selectedProcedure.name}
                  </h3>
                  <StatusBadge status={selectedProcedure.status} />
                </div>

                <div className="p-5 space-y-5">
                  {/* Read-only indicator */}
                  {selectedProcedure.status === 'completed' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <p className="text-sm text-green-700">
                        Procedure completed on {selectedProcedure.performedAt ? new Date(selectedProcedure.performedAt).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                  )}

                  {/* Anesthesia Section */}
                  <div className="border border-[var(--border-color)] rounded-lg p-4">
                    <h4 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                      <Syringe className="w-4 h-4 text-blue-500" />
                      Anesthesia
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                          Anesthesia Type
                        </label>
                        <select
                          value={anesthesiaType}
                          onChange={(e) => setAnesthesiaType(e.target.value)}
                          className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--icon-purple-text)]"
                          disabled={!canUpdateProcedure || selectedProcedure.status === 'completed'}
                        >
                          {anesthesiaTypes.map(type => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                          Blood Loss (ml)
                        </label>
                        <input
                          type="number"
                          value={bloodLoss}
                          onChange={(e) => setBloodLoss(e.target.value ? Number(e.target.value) : '')}
                          placeholder="Optional"
                          className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--icon-purple-text)]"
                          disabled={!canUpdateProcedure || selectedProcedure.status === 'completed'}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                        Anesthesia Notes
                      </label>
                      <textarea
                        value={anesthesiaNotes}
                        onChange={(e) => setAnesthesiaNotes(e.target.value)}
                        rows={3}
                        placeholder="Record anesthesia details, medications, patient responses..."
                        className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm resize-none focus:ring-2 focus:ring-[var(--icon-purple-text)]"
                        disabled={!canUpdateProcedure || selectedProcedure.status === 'completed'}
                      />
                    </div>
                  </div>

                  {/* Intra-operative Section */}
                  <div className="border border-[var(--border-color)] rounded-lg p-4">
                    <h4 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                      <Scissors className="w-4 h-4 text-green-500" />
                      Intra-operative Notes
                    </h4>
                    
                    <textarea
                      value={intraOperativeNotes}
                      onChange={(e) => setIntraOperativeNotes(e.target.value)}
                      rows={4}
                      placeholder="Record surgical procedure details, findings, techniques used, instruments..."
                      className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm resize-none focus:ring-2 focus:ring-[var(--icon-purple-text)] mb-4"
                      disabled={!canUpdateProcedure || selectedProcedure.status === 'completed'}
                    />

                    <div className="flex items-center gap-2 mb-3">
                      <input
                        type="checkbox"
                        id="complications"
                        checked={hasComplications}
                        onChange={(e) => setHasComplications(e.target.checked)}
                        className="rounded border-[var(--border-color)] text-[var(--icon-purple-text)] focus:ring-[var(--icon-purple-text)]"
                        disabled={!canUpdateProcedure || selectedProcedure.status === 'completed'}
                      />
                      <label htmlFor="complications" className="text-sm font-medium text-[var(--text-primary)]">
                        Complications encountered during procedure
                      </label>
                    </div>

                    {hasComplications && (
                      <textarea
                        value={complications}
                        onChange={(e) => setComplications(e.target.value)}
                        rows={2}
                        placeholder="Describe any complications and how they were managed..."
                        className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm resize-none focus:ring-2 focus:ring-[var(--icon-purple-text)]"
                        disabled={!canUpdateProcedure || selectedProcedure.status === 'completed'}
                      />
                    )}
                  </div>

                  {/* Post-operative Section */}
                  <div className="border border-[var(--border-color)] rounded-lg p-4">
                    <h4 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-orange-500" />
                      Post-operative Notes
                    </h4>
                    
                    <textarea
                      value={postOperativeNotes}
                      onChange={(e) => setPostOperativeNotes(e.target.value)}
                      rows={3}
                      placeholder="Record recovery status, immediate post-op care, discharge instructions, follow-up plan..."
                      className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm resize-none focus:ring-2 focus:ring-[var(--icon-purple-text)] mb-4"
                      disabled={!canUpdateProcedure || selectedProcedure.status === 'completed'}
                    />

                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                        Procedure Outcome
                      </label>
                      <select
                        value={outcome}
                        onChange={(e) => setOutcome(e.target.value)}
                        className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--icon-purple-text)]"
                        disabled={!canUpdateProcedure || selectedProcedure.status === 'completed'}
                      >
                        <option value="">Select outcome...</option>
                        {outcomeOptions.map(opt => (
                          <option key={opt.value} value={opt.value} className={opt.color}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {canUpdateProcedure && selectedProcedure.status !== 'completed' && (
                    <div className="flex gap-3 pt-4 border-t border-[var(--border-color)]">
                      <button
                        onClick={() => {
                          setSelectedProcedureId('');
                          resetTheatreForm();
                        }}
                        className="flex-1 px-4 py-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all text-sm font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSubmitTheatreNotes}
                        disabled={isSubmitting}
                        className="flex-1 px-4 py-2 bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] rounded-lg hover:bg-[var(--icon-purple-text)] hover:text-white transition-all text-sm font-medium disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Saving...
                          </div>
                        ) : (
                          'Complete Procedure & Save Notes'
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : procedures.length > 0 ? (
              <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-8 text-center">
                <ClipboardList className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">No Procedure Selected</h3>
                <p className="text-sm text-[var(--text-secondary)]">Select a procedure from the list to enter operation notes</p>
              </div>
            ) : null}
          </div>
        </div>
      ) : selectedPatientId && !selectedAttendanceId ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-yellow-800 mb-1">No Attendance Selected</h3>
          <p className="text-sm text-yellow-700">Please select an attendance to manage theatre procedures</p>
        </div>
      ) : null}

      {/* Schedule Procedure Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowScheduleModal(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-[var(--bg-card)] rounded-xl shadow-xl max-w-md w-full border border-[var(--border-color)]">
              <div className="px-6 py-4 border-b border-[var(--border-color)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scissors className="w-5 h-5 text-[var(--icon-purple-text)]" />
                  <h2 className="text-lg font-bold text-[var(--text-primary)]">Schedule Procedure</h2>
                </div>
                <button onClick={() => setShowScheduleModal(false)} className="p-1 hover:bg-[var(--bg-main)] rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {/* Search Procedure */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Procedure *</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={scheduleSearch}
                      onChange={(e) => {
                        setScheduleSearch(e.target.value);
                        setShowTemplateDropdown(true);
                      }}
                      onFocus={() => setShowTemplateDropdown(true)}
                      placeholder="Search procedures..."
                      className="w-full pl-10 pr-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--icon-purple-text)]"
                    />
                    {scheduleSearch && (
                      <button
                        onClick={clearTemplateSelection}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-[var(--bg-main)]"
                      >
                        <X className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                      </button>
                    )}
                  </div>
                  {showTemplateDropdown && scheduleSearch && filteredTemplates.length > 0 && (
                    <div ref={dropdownRef} className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto border border-[var(--border-color)] rounded-lg bg-[var(--bg-card)] shadow-lg">
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

                {/* Scheduled Date */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Scheduled Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--icon-purple-text)]"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Notes (Optional)</label>
                  <textarea
                    value={procedureNotes}
                    onChange={(e) => setProcedureNotes(e.target.value)}
                    rows={2}
                    placeholder="Special instructions, equipment needed, etc."
                    className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm resize-none focus:ring-2 focus:ring-[var(--icon-purple-text)]"
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-[var(--border-color)] flex gap-3">
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="flex-1 px-4 py-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleScheduleProcedure}
                  disabled={isScheduling || !selectedTemplate || !scheduledDate}
                  className="flex-1 px-4 py-2 bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] rounded-lg hover:bg-[var(--icon-purple-text)] hover:text-white text-sm font-medium disabled:opacity-50"
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