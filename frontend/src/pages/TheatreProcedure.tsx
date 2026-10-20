// src/pages/TheatreProcedure.tsx — V2 with Grid Note Tiles
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
  ChevronLeft, Scissors, ClipboardList, RefreshCw, AlertCircle,
  Syringe, FileText, CheckCircle, Clock, User, Calendar,
  Activity, Plus, X, Search, Edit, Trash2, Printer,
  Droplet, Heart, Hash, Phone, Info, ChevronDown, ChevronRight,
  Save, Maximize2, AlertTriangle, CircleDot, Stethoscope,
} from 'lucide-react';

const getEntityId = (entity: { id?: string; _id?: string } | null): string | undefined =>
  entity?.id || entity?._id;

const getStatusBadge = (status: string) => {
  const map: Record<string, string> = {
    scheduled:   'bg-blue-100 text-blue-700 border-blue-200',
    in_progress: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    completed:   'bg-green-100 text-green-700 border-green-200',
    cancelled:   'bg-red-100 text-red-700 border-red-200',
  };
  const labels: Record<string, string> = {
    scheduled: 'Scheduled', in_progress: 'In Progress',
    completed: 'Completed', cancelled: 'Cancelled',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${map[status?.toLowerCase()] || map.scheduled}`}>
      {labels[status?.toLowerCase()] || 'Scheduled'}
    </span>
  );
};

const getStatusDot = (status: string) => {
  const map: Record<string, string> = {
    scheduled: 'bg-blue-500',
    in_progress: 'bg-yellow-500',
    completed: 'bg-green-500',
    cancelled: 'bg-red-500',
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${map[status] || 'bg-gray-400'}`} />;
};

const countWords = (text: string) =>
  text?.trim() ? text.trim().split(/\s+/).length : 0;

const initials = (name: string) =>
  name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');

// ─────────────────────────────────────────────────────────────
// Note Tile
// ─────────────────────────────────────────────────────────────
type TileKey = 'anesthesia' | 'bloodLoss' | 'intraOp' | 'complications' | 'postOp' | 'outcome';

interface NoteTileProps {
  tileKey: TileKey;
  icon: React.ElementType;
  label: string;
  preview: string;
  meta?: string;
  isEmpty: boolean;
  isOpen: boolean;
  isDimmed: boolean;
  disabled: boolean;
  onOpen: () => void;
  onClose: () => void;
  onSave: () => void;
  children: React.ReactNode; // editor content when open
}

const NoteTile: React.FC<NoteTileProps> = ({
  icon: Icon, label, preview, meta, isEmpty, isOpen, isDimmed,
  disabled, onOpen, onClose, onSave, children,
}) => {
  const wordCount = countWords(preview);

  // Collapsed view
  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={onOpen}
        disabled={disabled}
        className={`text-left rounded-xl border transition-all flex flex-col min-h-[140px] p-4 ${
          isEmpty
            ? 'border-dashed border-[var(--border-color)] bg-[var(--bg-card)] hover:border-purple-400'
            : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:border-purple-400 hover:shadow-sm'
        } ${isDimmed ? 'opacity-40' : 'opacity-100'} ${
          disabled ? 'cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between w-full mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
              <Icon className="w-4 h-4 text-purple-600" />
            </div>
            <span className="text-xs font-bold text-[var(--text-primary)] truncate">{label}</span>
          </div>
          {!disabled && (
            <Edit className="w-3.5 h-3.5 text-[var(--text-tertiary)] flex-shrink-0" />
          )}
        </div>

        {/* Body */}
        <div className="flex-1 mt-1 min-w-0 w-full">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-2">
              <div className="w-7 h-7 rounded-full bg-[var(--bg-main)] border border-[var(--border-color)] flex items-center justify-center mb-1.5">
                <Plus className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
              </div>
              <p className="text-[11px] text-[var(--text-tertiary)]">Click to add</p>
            </div>
          ) : (
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-3">
              {preview}
            </p>
          )}
        </div>

        {/* Footer */}
        {!isEmpty && (
          <div className="mt-2 pt-2 border-t border-[var(--border-color)] flex items-center justify-between w-full">
            <span className="text-[10px] text-[var(--text-tertiary)]">
              {wordCount} word{wordCount !== 1 ? 's' : ''}
            </span>
            {meta && (
              <span className="text-[10px] text-[var(--text-tertiary)] truncate ml-2">
                {meta}
              </span>
            )}
          </div>
        )}
      </button>
    );
  }

  // Expanded view — full width
  return (
    <div className="col-span-full rounded-xl border border-purple-300 bg-[var(--bg-card)] shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
            <Icon className="w-4 h-4 text-purple-600" />
          </div>
          <h3 className="text-sm font-bold text-[var(--text-primary)] truncate">{label}</h3>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={onSave}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-xs font-semibold transition-all"
          >
            <Save className="w-3.5 h-3.5" />
            Done
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-colors"
            aria-label="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editor body */}
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────
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
  const [openTile, setOpenTile] = useState<TileKey | null>(null);

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
    attendances, currentAttendance, getAttendance, getAttendances,
    addProcedure, updateProcedureStatus, canAddMedicalEntries, calculateBill,
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
      await Promise.all([loadPatients(), getProcedureTemplates(false)]);

      const statePatient = location.state?.patient;
      const patientId = statePatient?.id || id;
      const initialAttendanceId = location.state?.attendanceId;

      if (patientId) {
        const patientAttendances = await getAttendances({ patientId });
        setAllAttendances(patientAttendances);

        let foundPatient = patients.find(p => p.id === patientId) || statePatient || null;
        if (!foundPatient || !foundPatient.surname) {
          try { foundPatient = await fetchPatient(patientId); } catch {}
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

  useEffect(() => { loadData(); }, [id]);

  useEffect(() => {
    if (selectedAttendanceId && selectedAttendanceId !== 'undefined' && selectedAttendanceId !== 'null') {
      getAttendance(selectedAttendanceId);
    }
  }, [selectedAttendanceId, getAttendance]);

  useEffect(() => {
    if (currentAttendance) setAttendance(currentAttendance);
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
    setOpenTile(null);
    await getAttendance(attendanceId);
  };

  const handleClearSelection = () => {
    setSelectedAttendanceId('');
    setAttendance(null);
    setSelectedProcedureId('');
    setOpenTile(null);
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
    setOpenTile(null);
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
      setOpenTile(null);
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
      await updateProcedureStatus(selectedAttendanceId!, procedureId, { status: 'cancelled' });
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
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
        <div className="text-center bg-[var(--bg-card)] p-8 rounded-xl border border-[var(--border-color)]">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Loading Theatre Data…</h2>
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

  // Group for left pane
  const groupedProcedures = [
    { key: 'in_progress', label: 'In Progress', items: inProgressProcedures },
    { key: 'scheduled', label: 'Scheduled', items: scheduledProcedures },
    { key: 'completed', label: 'Completed', items: completedProcedures },
  ].filter(g => g.items.length > 0);

  // Completion count for progress text
  const sections = [
    { key: 'anesthesia', filled: !!anesthesiaType && (!!anesthesiaNotes || anesthesiaType !== 'none') },
    { key: 'bloodLoss', filled: bloodLoss !== '' && bloodLoss !== null },
    { key: 'intraOp', filled: !!intraOperativeNotes },
    { key: 'complications', filled: !hasComplications || !!complications },
    { key: 'postOp', filled: !!postOperativeNotes },
    { key: 'outcome', filled: !!outcome },
  ];
  const filledCount = sections.filter(s => s.filled).length;

  return (
    <div className="space-y-5 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard/theatre')}
            className="p-2 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-card)] transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
            <Scissors className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[var(--text-primary)]">Theatre Management</h1>
            <p className="text-xs text-[var(--text-secondary)]">{patientFullName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowScheduleModal(true)}
            disabled={!canAddEntries}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all disabled:opacity-50 text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Schedule Procedure</span>
            <span className="sm:hidden">New</span>
          </button>
          <button
            onClick={loadData}
            disabled={refreshing}
            className="p-2 rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)] transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Selector */}
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

      {!selectedAttendanceId && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-10 text-center">
          <Calendar className="w-10 h-10 text-[var(--text-tertiary)] mx-auto mb-3 opacity-50" />
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">No Attendance Selected</h3>
          <p className="text-sm text-[var(--text-secondary)]">Select an attendance above to manage procedures.</p>
        </div>
      )}

      {selectedAttendanceId && attendance && (
        <>
          {/* Patient Summary Bar */}
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-purple-700">
                    {initials(patientFullName) || <User className="w-5 h-5" />}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-base font-bold text-[var(--text-primary)] truncate">{patientFullName}</p>
                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mt-0.5 flex-wrap">
                    <span>{patient.gender === 'male' ? '♂' : patient.gender === 'female' ? '♀' : '·'}</span>
                    <span>{calculateAge(patient.dateOfBirth)}y</span>
                    <span className="opacity-40">·</span>
                    <span className="font-mono text-[10px] bg-[var(--bg-main)] px-1.5 py-0.5 rounded border border-[var(--border-color)]">
                      #{patient.folderNumber}
                    </span>
                    {patient.contact && (
                      <>
                        <span className="opacity-40">·</span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-2.5 h-2.5" />{patient.contact}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono bg-[var(--bg-main)] px-2 py-1 rounded-full border border-[var(--border-color)] text-[var(--text-secondary)]">
                  #{attendance.attendanceNumber || 'New Visit'}
                </span>
                <span className="text-[10px] bg-[var(--bg-main)] px-2 py-1 rounded-full border border-[var(--border-color)] text-[var(--text-secondary)] flex items-center gap-1">
                  <Calendar className="w-2.5 h-2.5" />
                  {new Date(attendance.dateTime || attendance.createdAt || '').toLocaleDateString()}
                </span>
                {getStatusBadge(attendance.status)}
              </div>
            </div>
          </div>

          {/* Read-only warning */}
          {!canUpdateProcedure && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3.5 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-800">
                This visit is <strong>{attendance.status}</strong>. Procedures can be viewed but not modified.
              </p>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { count: scheduledProcedures.length, label: 'Scheduled', Icon: Clock, bg: 'bg-blue-100', color: 'text-blue-600' },
              { count: inProgressProcedures.length, label: 'In Progress', Icon: Activity, bg: 'bg-yellow-100', color: 'text-yellow-600' },
              { count: completedProcedures.length, label: 'Completed', Icon: CheckCircle, bg: 'bg-green-100', color: 'text-green-600' },
            ].map(s => {
              const Icon = s.Icon;
              return (
                <div key={s.label} className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
                  <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center mb-1.5`}>
                    <Icon className={`w-4 h-4 ${s.color}`} />
                  </div>
                  <p className={`text-2xl font-bold ${s.color} leading-tight`}>{s.count}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">{s.label}</p>
                </div>
              );
            })}
          </div>

          {/* Main two-pane */}
          <div className="flex flex-col lg:flex-row gap-4 items-start">
            {/* LEFT: Procedures list */}
            <div className="w-full lg:w-72 lg:flex-shrink-0 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-main)] flex items-center justify-between">
                <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
                  <ClipboardList className="w-3.5 h-3.5 text-purple-600" />
                  Procedures ({procedures.length})
                </h3>
                {canAddEntries && (
                  <button
                    onClick={() => setShowScheduleModal(true)}
                    className="p-1 rounded text-purple-600 hover:bg-purple-100 transition-colors"
                    title="Schedule procedure"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {procedures.length === 0 ? (
                <div className="p-6 text-center">
                  <Scissors className="w-8 h-8 text-[var(--text-tertiary)] mx-auto mb-2 opacity-40" />
                  <p className="text-xs text-[var(--text-secondary)]">No procedures scheduled</p>
                  {canAddEntries && (
                    <button
                      onClick={() => setShowScheduleModal(true)}
                      className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-700 hover:text-white transition-all"
                    >
                      <Plus className="w-3 h-3" /> Schedule
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-color)] max-h-[560px] overflow-y-auto">
                  {groupedProcedures.map(group => (
                    <div key={group.key}>
                      {/* Group header */}
                      <div className="px-4 py-2 bg-[var(--bg-main)]/60 border-y border-[var(--border-color)] first:border-t-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                          {group.label} ({group.items.length})
                        </p>
                      </div>
                      {/* Items */}
                      {group.items.map((procedure: any) => {
                        const isSelected = selectedProcedureId === procedure.id;
                        return (
                          <button
                            key={procedure.id}
                            onClick={() => { setSelectedProcedureId(procedure.id); setOpenTile(null); }}
                            className={`w-full text-left px-4 py-3 transition-colors relative ${
                              isSelected
                                ? 'bg-purple-50 border-l-2 border-purple-600'
                                : 'hover:bg-[var(--bg-main)] border-l-2 border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              {getStatusDot(procedure.status)}
                              <span className="font-medium text-xs text-[var(--text-primary)] truncate flex-1">
                                {procedure.name}
                              </span>
                            </div>
                            {procedure.scheduledDate && (
                              <p className="text-[10px] text-[var(--text-secondary)] flex items-center gap-1 ml-4">
                                <Calendar className="w-2.5 h-2.5" />
                                {new Date(procedure.scheduledDate).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
                            {procedure.performedAt && procedure.status === 'completed' && (
                              <p className="text-[10px] text-green-600 flex items-center gap-1 ml-4">
                                <CheckCircle className="w-2.5 h-2.5" />
                                {new Date(procedure.performedAt).toLocaleDateString()}
                              </p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT: Workspace */}
            <div className="flex-1 min-w-0 w-full">
              {selectedProcedure ? (
                <div className="space-y-4">
                  {/* Procedure header */}
                  <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <h2 className="text-base font-bold text-[var(--text-primary)] truncate">
                          {selectedProcedure.name}
                        </h2>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs text-[var(--text-secondary)]">
                          {selectedProcedure.scheduledDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Scheduled: {new Date(selectedProcedure.scheduledDate).toLocaleString()}
                            </span>
                          )}
                          {selectedProcedure.ServiceCatalog?.category && (
                            <>
                              <span className="opacity-40">·</span>
                              <span>{selectedProcedure.ServiceCatalog.category}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(selectedProcedure.status)}
                      </div>
                    </div>
                  </div>

                  {/* Note grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Anesthesia */}
                    <NoteTile
                      tileKey="anesthesia"
                      icon={Syringe}
                      label="Anesthesia"
                      preview={anesthesiaType !== 'none'
                        ? `${anesthesiaTypes.find(t => t.value === anesthesiaType)?.label || anesthesiaType}${anesthesiaNotes ? ' · ' + anesthesiaNotes : ''}`
                        : 'None'}
                      isEmpty={anesthesiaType === 'none' && !anesthesiaNotes}
                      isOpen={openTile === 'anesthesia'}
                      isDimmed={openTile !== null && openTile !== 'anesthesia'}
                      disabled={!canUpdateProcedure || selectedProcedure.status === 'completed' || selectedProcedure.status === 'cancelled'}
                      onOpen={() => setOpenTile('anesthesia')}
                      onClose={() => setOpenTile(null)}
                      onSave={() => setOpenTile(null)}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                            Anesthesia Type
                          </label>
                          <select
                            value={anesthesiaType}
                            onChange={(e) => setAnesthesiaType(e.target.value)}
                            className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          >
                            {anesthesiaTypes.map(t => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                            Blood Loss (ml)
                          </label>
                          <input
                            type="number"
                            value={bloodLoss}
                            onChange={(e) => setBloodLoss(e.target.value ? Number(e.target.value) : '')}
                            placeholder="Optional"
                            className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                          Anesthesia Notes
                        </label>
                        <textarea
                          value={anesthesiaNotes}
                          onChange={(e) => setAnesthesiaNotes(e.target.value)}
                          rows={8}
                          placeholder="Medications, patient responses, monitoring details…"
                          className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] resize-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                        <p className="text-[10px] text-[var(--text-tertiary)] mt-1.5">
                          {countWords(anesthesiaNotes)} word{countWords(anesthesiaNotes) !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </NoteTile>

                    {/* Blood Loss */}
                    <NoteTile
                      tileKey="bloodLoss"
                      icon={Droplet}
                      label="Blood Loss"
                      preview={bloodLoss !== '' && bloodLoss !== null ? `${bloodLoss} ml` : ''}
                      isEmpty={bloodLoss === '' || bloodLoss === null}
                      isOpen={openTile === 'bloodLoss'}
                      isDimmed={openTile !== null && openTile !== 'bloodLoss'}
                      disabled={!canUpdateProcedure || selectedProcedure.status === 'completed' || selectedProcedure.status === 'cancelled'}
                      onOpen={() => setOpenTile('bloodLoss')}
                      onClose={() => setOpenTile(null)}
                      onSave={() => setOpenTile(null)}
                    >
                      <div>
                        <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                          Estimated Blood Loss (ml)
                        </label>
                        <input
                          type="number"
                          value={bloodLoss}
                          onChange={(e) => setBloodLoss(e.target.value ? Number(e.target.value) : '')}
                          placeholder="e.g., 150"
                          className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                          Anesthesia Notes
                        </label>
                        <textarea
                          value={anesthesiaNotes}
                          onChange={(e) => setAnesthesiaNotes(e.target.value)}
                          rows={6}
                          placeholder="Additional notes about blood loss…"
                          className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] resize-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>
                    </NoteTile>

                    {/* Intra-operative */}
                    <NoteTile
                      tileKey="intraOp"
                      icon={Scissors}
                      label="Intra-operative Notes"
                      preview={intraOperativeNotes}
                      isEmpty={!intraOperativeNotes}
                      isOpen={openTile === 'intraOp'}
                      isDimmed={openTile !== null && openTile !== 'intraOp'}
                      disabled={!canUpdateProcedure || selectedProcedure.status === 'completed' || selectedProcedure.status === 'cancelled'}
                      onOpen={() => setOpenTile('intraOp')}
                      onClose={() => setOpenTile(null)}
                      onSave={() => setOpenTile(null)}
                    >
                      <div>
                        <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                          Surgical Procedure Details
                        </label>
                        <textarea
                          value={intraOperativeNotes}
                          onChange={(e) => setIntraOperativeNotes(e.target.value)}
                          rows={10}
                          placeholder="Findings, techniques, instruments, intra-operative events…"
                          className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] resize-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                        <p className="text-[10px] text-[var(--text-tertiary)] mt-1.5">
                          {countWords(intraOperativeNotes)} word{countWords(intraOperativeNotes) !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </NoteTile>

                    {/* Complications */}
                    <NoteTile
                      tileKey="complications"
                      icon={AlertTriangle}
                      label="Complications"
                      preview={hasComplications ? (complications || 'Complications recorded') : 'None recorded'}
                      isEmpty={false}
                      isOpen={openTile === 'complications'}
                      isDimmed={openTile !== null && openTile !== 'complications'}
                      disabled={!canUpdateProcedure || selectedProcedure.status === 'completed' || selectedProcedure.status === 'cancelled'}
                      onOpen={() => setOpenTile('complications')}
                      onClose={() => setOpenTile(null)}
                      onSave={() => setOpenTile(null)}
                    >
                      <label className="flex items-center gap-2.5 p-3 bg-[var(--bg-main)] rounded-lg border border-[var(--border-color)] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={hasComplications}
                          onChange={(e) => setHasComplications(e.target.checked)}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 w-4 h-4"
                        />
                        <span className="text-sm font-medium text-[var(--text-primary)]">
                          Complications were encountered
                        </span>
                      </label>
                      {hasComplications && (
                        <div>
                          <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                            Describe Complications
                          </label>
                          <textarea
                            value={complications}
                            onChange={(e) => setComplications(e.target.value)}
                            rows={6}
                            placeholder="Describe complications and how they were managed…"
                            className="w-full px-3 py-2 bg-[var(--bg-main)] border border-red-300 rounded-lg text-sm text-[var(--text-primary)] resize-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          />
                        </div>
                      )}
                    </NoteTile>

                    {/* Post-op */}
                    <NoteTile
                      tileKey="postOp"
                      icon={Heart}
                      label="Post-operative Notes"
                      preview={postOperativeNotes}
                      isEmpty={!postOperativeNotes}
                      isOpen={openTile === 'postOp'}
                      isDimmed={openTile !== null && openTile !== 'postOp'}
                      disabled={!canUpdateProcedure || selectedProcedure.status === 'completed' || selectedProcedure.status === 'cancelled'}
                      onOpen={() => setOpenTile('postOp')}
                      onClose={() => setOpenTile(null)}
                      onSave={() => setOpenTile(null)}
                    >
                      <div>
                        <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                          Recovery & Post-op Care
                        </label>
                        <textarea
                          value={postOperativeNotes}
                          onChange={(e) => setPostOperativeNotes(e.target.value)}
                          rows={8}
                          placeholder="Recovery status, immediate post-op care, discharge instructions…"
                          className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] resize-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                        <p className="text-[10px] text-[var(--text-tertiary)] mt-1.5">
                          {countWords(postOperativeNotes)} word{countWords(postOperativeNotes) !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </NoteTile>

                    {/* Outcome */}
                    <NoteTile
                      tileKey="outcome"
                      icon={CheckCircle}
                      label="Outcome"
                      preview={outcome ? (outcomeOptions.find(o => o.value === outcome)?.label || outcome) : ''}
                      isEmpty={!outcome}
                      isOpen={openTile === 'outcome'}
                      isDimmed={openTile !== null && openTile !== 'outcome'}
                      disabled={!canUpdateProcedure || selectedProcedure.status === 'completed' || selectedProcedure.status === 'cancelled'}
                      onOpen={() => setOpenTile('outcome')}
                      onClose={() => setOpenTile(null)}
                      onSave={() => setOpenTile(null)}
                    >
                      <div>
                        <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                          Procedure Outcome
                        </label>
                        <select
                          value={outcome}
                          onChange={(e) => setOutcome(e.target.value)}
                          className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        >
                          <option value="">Select outcome…</option>
                          {outcomeOptions.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                    </NoteTile>
                  </div>

                  {/* Completion progress + action bar */}
                  <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-[var(--text-primary)]">
                            {filledCount} of 6
                          </span>
                          <span className="text-xs text-[var(--text-secondary)]">sections completed</span>
                        </div>
                        <div className="w-24 h-1.5 bg-[var(--bg-main)] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded-full transition-all"
                            style={{ width: `${(filledCount / 6) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {(selectedProcedure.status === 'scheduled' || selectedProcedure.status === 'in_progress') && canUpdateProcedure && (
                          <>
                            <button
                              onClick={() => handleCancelProcedure(selectedProcedure.id)}
                              className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium transition-all"
                            >
                              Cancel Procedure
                            </button>
                            {selectedProcedure.status === 'scheduled' && (
                              <button
                                onClick={() => handleStartProcedure(selectedProcedure.id)}
                                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm font-semibold transition-all"
                              >
                                Start Procedure
                              </button>
                            )}
                            {selectedProcedure.status === 'in_progress' && (
                              <button
                                onClick={handleSubmitTheatreNotes}
                                disabled={isSubmitting}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-semibold transition-all flex items-center gap-2"
                              >
                                {isSubmitting ? (
                                  <>
                                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Saving…
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="w-4 h-4" />
                                    Complete Procedure
                                  </>
                                )}
                              </button>
                            )}
                          </>
                        )}
                        {selectedProcedure.status === 'completed' && (
                          <span className="text-xs text-[var(--text-tertiary)] italic">
                            This procedure is completed and locked.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : procedures.length > 0 ? (
                <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-12 text-center">
                  <ClipboardList className="w-10 h-10 text-[var(--text-tertiary)] mx-auto mb-3 opacity-40" />
                  <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">No Procedure Selected</h3>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Select a procedure from the list to enter operation notes
                  </p>
                </div>
              ) : (
                <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-12 text-center">
                  <Scissors className="w-10 h-10 text-[var(--text-tertiary)] mx-auto mb-3 opacity-40" />
                  <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">No Procedures</h3>
                  <p className="text-sm text-[var(--text-secondary)]">
                    No procedures have been scheduled for this visit
                  </p>
                  {canAddEntries && (
                    <button
                      onClick={() => setShowScheduleModal(true)}
                      className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-semibold"
                    >
                      <Plus className="w-4 h-4" />
                      Schedule First Procedure
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowScheduleModal(false)} />
          <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
            <div className="relative bg-[var(--bg-card)] rounded-2xl shadow-2xl max-w-md w-full border border-[var(--border-color)] overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--border-color)] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Scissors className="w-4 h-4 text-purple-600" />
                  </div>
                  <h2 className="text-base font-bold text-[var(--text-primary)]">Schedule Procedure</h2>
                </div>
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                    Procedure <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={scheduleSearch}
                      onChange={(e) => { setScheduleSearch(e.target.value); setShowTemplateDropdown(true); }}
                      onFocus={() => setShowTemplateDropdown(true)}
                      placeholder="Search procedures…"
                      className="w-full pl-9 pr-9 py-2.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                    {scheduleSearch && (
                      <button
                        onClick={clearTemplateSelection}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {showTemplateDropdown && scheduleSearch && filteredTemplates.length > 0 && (
                    <div
                      ref={dropdownRef}
                      className="relative z-20 mt-1 max-h-48 overflow-y-auto border border-[var(--border-color)] rounded-lg bg-[var(--bg-card)] shadow-lg"
                    >
                      {filteredTemplates.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => handleSelectTemplate(template)}
                          className="w-full text-left p-3 hover:bg-[var(--bg-main)] border-b border-[var(--border-color)] last:border-b-0"
                        >
                          <div className="font-medium text-sm text-[var(--text-primary)]">{template.name}</div>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-[var(--text-tertiary)]">
                            <span>{template.category || 'General'}</span>
                            <span>·</span>
                            <span>Duration: {template.duration || 30} min</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                    Scheduled Date & Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={procedureNotes}
                    onChange={(e) => setProcedureNotes(e.target.value)}
                    rows={3}
                    placeholder="Special instructions, equipment needed…"
                    className="w-full px-3 py-2.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] resize-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="px-5 py-4 border-t border-[var(--border-color)] flex justify-end gap-2">
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 border border-[var(--border-color)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-main)] text-sm font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleScheduleProcedure}
                  disabled={isScheduling || !selectedTemplate || !scheduledDate}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-semibold transition-all"
                >
                  {isScheduling ? 'Scheduling…' : 'Schedule Procedure'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}