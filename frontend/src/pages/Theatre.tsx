// src/pages/Theatre.tsx - REDESIGNED TO MATCH MEDICAL ENTRIES
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
  Droplet,
  Heart,
  Plus,
  X,
  Search,
} from 'lucide-react';

const getEntityId = (entity: { id?: string; _id?: string } | null): string | undefined => {
  return entity?.id || entity?._id;
};

const getStatusBadge = (status: string) => {
  const config: Record<string, { color: string; bg: string }> = {
    scheduled:   { color: 'text-blue-800',   bg: 'bg-blue-100'   },
    in_progress: { color: 'text-yellow-800', bg: 'bg-yellow-100' },
    completed:   { color: 'text-green-800',  bg: 'bg-green-100'  },
    cancelled:   { color: 'text-red-800',    bg: 'bg-red-100'    },
  };
  const c = config[status?.toLowerCase()] || { color: 'text-gray-800', bg: 'bg-gray-100' };
  return (
    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${c.bg} ${c.color}`}>
      {status?.replace('_', ' ') || 'Scheduled'}
    </span>
  );
};

export default function Theatre() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [isLoading, setIsLoading]                   = useState(true);
  const [refreshing, setRefreshing]                 = useState(false);
  const [selectedPatientId, setSelectedPatientId]   = useState('');
  const [selectedAttendanceId, setSelectedAttendanceId] = useState('');
  const [selectedProcedureId, setSelectedProcedureId]   = useState('');
  const [showScheduleModal, setShowScheduleModal]   = useState(false);

  // Theatre form
  const [anesthesiaNotes, setAnesthesiaNotes]       = useState('');
  const [intraOperativeNotes, setIntraOperativeNotes] = useState('');
  const [postOperativeNotes, setPostOperativeNotes] = useState('');
  const [bloodLoss, setBloodLoss]                   = useState<number | ''>('');
  const [complications, setComplications]           = useState('');
  const [hasComplications, setHasComplications]     = useState(false);
  const [anesthesiaType, setAnesthesiaType]         = useState('general');
  const [outcome, setOutcome]                       = useState('');
  const [isSubmitting, setIsSubmitting]             = useState(false);

  // Schedule modal
  const [scheduleSearch, setScheduleSearch]         = useState('');
  const [selectedTemplate, setSelectedTemplate]     = useState<any>(null);
  const [scheduledDate, setScheduledDate]           = useState('');
  const [procedureNotes, setProcedureNotes]         = useState('');
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const [isScheduling, setIsScheduling]             = useState(false);

  const hasLoaded      = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef    = useRef<HTMLDivElement>(null);

  const {
    attendances,
    getAttendances,
    addProcedure,
    updateProcedureStatus,
    canAddMedicalEntries,
  } = useAttendanceStore();

  const { patients, loadPatients }                        = usePatientStore();
  const { user }                                          = useAuthStore();
  const { procedureTemplates, getProcedureTemplates }     = useMedicalServicesStore();

  const loadData = async (force = false) => {
    if (!force && hasLoaded.current) return;
    try {
      setRefreshing(true);
      setIsLoading(true);
      await Promise.all([loadPatients(), getAttendances(), getProcedureTemplates(false)]);
      hasLoaded.current = true;
      success('Data loaded', 'Theatre system ready');
    } catch (err: any) {
      toastError('Load failed', err.message || 'Could not load data');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        searchInputRef.current && !searchInputRef.current.contains(e.target as Node)
      ) setShowTemplateDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const patientAttendances = useMemo(() => {
    if (!selectedPatientId || !attendances.length) return [];
    return attendances
      .filter(a => {
        const ids = [a.patientId, a.patient?.id, a.data?.patientId]
          .filter(Boolean).map(id => id?.toString());
        return ids.includes(selectedPatientId);
      })
      .sort((a, b) =>
        new Date(b.dateTime || b.createdAt || '').getTime() -
        new Date(a.dateTime || a.createdAt || '').getTime()
      );
  }, [attendances, selectedPatientId, patients]);

  const selectedPatient    = patients.find(p => getEntityId(p) === selectedPatientId);
  const selectedAttendance = patientAttendances.find(a => getEntityId(a) === selectedAttendanceId);

  const procedures = (selectedAttendance?.Procedure || []).map((proc: any) => ({
    ...proc,
    id:   proc.id,
    name: proc.ServiceCatalog?.name || proc.name || 'Unknown Procedure',
  }));

  const selectedProcedure = procedures.find((p: any) => getEntityId(p) === selectedProcedureId);

  useEffect(() => {
    setSelectedProcedureId('');
    resetForm();
  }, [selectedPatientId, selectedAttendanceId]);

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
        ['general','spinal','epidural','local','sedation','regional'].forEach(t => {
          if (n.includes(t)) setAnesthesiaType(t);
        });
      }
    } else {
      resetForm();
    }
  }, [selectedProcedure]);

  const canAddEntries      = selectedAttendance ? canAddMedicalEntries(selectedAttendance) : false;
  const canUpdateProcedure = selectedAttendance && ['pending', 'admitted'].includes(selectedAttendance.status);

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
      toastError('Selection required', 'Please select a procedure template'); return;
    }
    if (!scheduledDate) { toastError('Date required', 'Please select a scheduled date'); return; }
    if (!canAddEntries) { toastError('Access denied', `Cannot schedule for ${selectedAttendance?.status} visit`); return; }
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
      await getAttendances();
    } catch (err: any) {
      toastError('Schedule Failed', err.message || 'Could not schedule procedure');
    } finally {
      setIsScheduling(false);
    }
  };

  const handleSubmitTheatreNotes = async () => {
    if (!selectedProcedureId || !selectedAttendanceId) {
      toastError('Selection required', 'Please select a procedure'); return;
    }
    if (!canUpdateProcedure) {
      toastError('Access denied', 'Cannot update completed/cancelled attendance'); return;
    }
    setIsSubmitting(true);
    try {
      await updateProcedureStatus(selectedAttendanceId, selectedProcedureId, {
        status: 'completed',
        anesthesiaNotes:      anesthesiaNotes || null,
        intraOperativeNotes:  intraOperativeNotes || null,
        postOperativeNotes:   postOperativeNotes || null,
        bloodLoss:            bloodLoss ? Number(bloodLoss) : null,
        complications:        hasComplications ? complications : null,
        outcome:              outcome || null,
        performedById:        user?.id || '',
        performedAt:          new Date().toISOString(),
      });
      success('Operation notes saved', 'Theatre procedure completed');
      resetForm();
      setSelectedProcedureId('');
      await getAttendances();
    } catch (err: any) {
      toastError('Save failed', err.message || 'Could not save operation notes');
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const handleClearSelection = () => {
    setSelectedPatientId('');
    setSelectedAttendanceId('');
    setSelectedProcedureId('');
    resetForm();
  };

  const anesthesiaTypes = [
    { value: 'general',  label: 'General Anesthesia'   },
    { value: 'regional', label: 'Regional Anesthesia'  },
    { value: 'local',    label: 'Local Anesthesia'     },
    { value: 'sedation', label: 'Conscious Sedation'   },
    { value: 'spinal',   label: 'Spinal Anesthesia'    },
    { value: 'epidural', label: 'Epidural Anesthesia'  },
    { value: 'none',     label: 'None'                 },
  ];

  const outcomeOptions = [
    { value: 'successful',       label: 'Successful — No Complications'    },
    { value: 'successful_minor', label: 'Successful — Minor Complications' },
    { value: 'successful_major', label: 'Successful — Major Complications' },
    { value: 'unsuccessful',     label: 'Unsuccessful'                     },
    { value: 'aborted',          label: 'Procedure Aborted'                },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
        <div className="text-center bg-[var(--bg-card)] p-8 rounded-xl shadow-sm border border-[var(--border-color)]">
          <div className="w-14 h-14 border-4 border-[var(--icon-purple-text)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Loading Theatre...</h2>
          <p className="text-[var(--text-secondary)] text-sm mt-1">Fetching patient and procedure data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-[var(--bg-card)] rounded-lg transition-all border border-[var(--border-color)]"
          >
            <ChevronLeft className="w-5 h-5 text-[var(--text-primary)]" />
          </button>
          <div className="w-10 h-10 bg-[var(--icon-purple-bg)] rounded-xl flex items-center justify-center">
            <Scissors className="w-5 h-5 text-[var(--icon-purple-text)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Theatre &amp; Operation Notes</h1>
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
              className="flex items-center gap-2 px-3 py-2 bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] rounded-lg hover:bg-[var(--icon-purple-text)] hover:text-white transition-all text-sm font-medium"
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

      {/* ── PATIENT SELECTOR ── */}
      <PatientAttendanceSelector
        patients={patients}
        attendances={attendances}
        selectedPatientId={selectedPatientId}
        selectedAttendanceId={selectedAttendanceId}
        onPatientSelect={setSelectedPatientId}
        onAttendanceSelect={setSelectedAttendanceId}
        onClearSelection={handleClearSelection}
      />

      {/* ── PATIENT HEADER CARD ── */}
      {selectedPatient && selectedAttendance && (
        <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[var(--icon-purple-bg)] rounded-xl flex items-center justify-center">
                <User className="w-6 h-6 text-[var(--icon-purple-text)]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">
                  {selectedPatient.surname} {selectedPatient.otherNames}
                </h3>
                <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)] mt-1">
                  <span>{selectedPatient.age || 'N/A'} years • {selectedPatient.gender}</span>
                  <span>•</span>
                  <span>ID: {selectedPatient.folderNumber}</span>
                  <span>•</span>
                  <span>{selectedPatient.contact}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono bg-[var(--bg-main)] px-2.5 py-1 rounded-full border border-[var(--border-color)] text-[var(--text-secondary)]">
                #{selectedAttendance.attendanceNumber || 'New Visit'}
              </span>
              <span className="text-xs bg-[var(--bg-main)] px-2.5 py-1 rounded-full border border-[var(--border-color)] text-[var(--text-secondary)]">
                {new Date(selectedAttendance.dateTime || selectedAttendance.createdAt || '').toLocaleDateString()}
              </span>
              {getStatusBadge(selectedAttendance.status)}
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      {selectedAttendance ? (
        <div className="flex gap-4 items-stretch">

          {/* ── LEFT: PROCEDURES LIST ── */}
          <div className="w-72 xl:w-80 flex-shrink-0 flex flex-col gap-4">

            {/* Procedures card */}
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden flex flex-col">
              <div className="bg-[var(--bg-main)] px-4 py-2.5 border-b border-[var(--border-color)] flex items-center justify-between flex-shrink-0">
                <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2 text-sm">
                  <Scissors className="w-4 h-4 text-[var(--icon-purple-text)]" />
                  Scheduled Procedures ({procedures.length})
                </h3>
                {canAddEntries && (
                  <button
                    onClick={() => setShowScheduleModal(true)}
                    className="flex items-center gap-1 px-2 py-1 bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] rounded text-xs hover:bg-[var(--icon-purple-text)] hover:text-white transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                )}
              </div>

              <div className="divide-y divide-[var(--border-color)] overflow-y-auto flex-1" style={{ maxHeight: '420px' }}>
                {procedures.length === 0 ? (
                  <div className="p-8 text-center">
                    <Scissors className="w-10 h-10 text-[var(--text-secondary)] mx-auto mb-3 opacity-40" />
                    <p className="text-sm text-[var(--text-secondary)]">No procedures scheduled</p>
                    {canAddEntries && (
                      <button
                        onClick={() => setShowScheduleModal(true)}
                        className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] rounded-lg text-sm hover:bg-[var(--icon-purple-text)] hover:text-white transition-all"
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
                            ? 'bg-[var(--icon-purple-bg)]/10 border-l-4 border-[var(--icon-purple-text)]'
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

            {/* Stats card */}
            {procedures.length > 0 && (
              <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                <div className="bg-[var(--bg-main)] px-4 py-2.5 border-b border-[var(--border-color)]">
                  <h3 className="font-semibold text-[var(--text-primary)] text-sm flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[var(--icon-purple-text)]" />
                    Summary
                  </h3>
                </div>
                <div className="p-4 grid grid-cols-2 gap-3">
                  {[
                    { label: 'Scheduled',   value: procedures.filter((p: any) => p.status === 'scheduled').length,   color: 'text-blue-600'   },
                    { label: 'In Progress', value: procedures.filter((p: any) => p.status === 'in_progress').length, color: 'text-yellow-600' },
                    { label: 'Completed',   value: procedures.filter((p: any) => p.status === 'completed').length,   color: 'text-green-600'  },
                    { label: 'Total',       value: procedures.length,                                                 color: 'text-[var(--text-primary)]' },
                  ].map((s, i) => (
                    <div key={i} className="text-center bg-[var(--bg-main)] rounded-lg py-2.5">
                      <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: OPERATION NOTES (main area + notes sidebar) ── */}
          <div className="flex-1 min-w-0">
            {selectedProcedure ? (
              <div className="flex gap-4 items-stretch h-full">

                {/* FORM PANELS */}
                <div className="flex-1 min-w-0 space-y-4">

                  {/* Completed banner */}
                  {selectedProcedure.status === 'completed' && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <p className="text-sm text-green-700">
                        Procedure completed on{' '}
                        {selectedProcedure.performedAt
                          ? new Date(selectedProcedure.performedAt).toLocaleString()
                          : 'N/A'}
                      </p>
                    </div>
                  )}

                  {/* Anesthesia */}
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
                            className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--icon-purple-text)]"
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
                            className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--icon-purple-text)]"
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
                          className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm resize-none focus:ring-2 focus:ring-[var(--icon-purple-text)]"
                          disabled={!canUpdateProcedure || selectedProcedure.status === 'completed'}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Intra-operative */}
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
                        className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm resize-none focus:ring-2 focus:ring-[var(--icon-purple-text)]"
                        disabled={!canUpdateProcedure || selectedProcedure.status === 'completed'}
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="complications"
                          checked={hasComplications}
                          onChange={(e) => setHasComplications(e.target.checked)}
                          className="rounded border-[var(--border-color)] text-[var(--icon-purple-text)]"
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
                          className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm resize-none focus:ring-2 focus:ring-[var(--icon-purple-text)]"
                          disabled={!canUpdateProcedure || selectedProcedure.status === 'completed'}
                        />
                      )}
                    </div>
                  </div>

                  {/* Post-operative */}
                  <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                    <div className="bg-[var(--bg-main)] px-4 py-2.5 border-b border-[var(--border-color)]">
                      <h4 className="font-semibold text-[var(--text-primary)] flex items-center gap-2 text-sm">
                        <Stethoscope className="w-4 h-4 text-orange-500" />
                        Post-operative Notes
                      </h4>
                    </div>
                    <div className="p-4 space-y-3">
                      <textarea
                        value={postOperativeNotes}
                        onChange={(e) => setPostOperativeNotes(e.target.value)}
                        rows={3}
                        placeholder="Recovery status, immediate post-op care, discharge instructions..."
                        className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm resize-none focus:ring-2 focus:ring-[var(--icon-purple-text)]"
                        disabled={!canUpdateProcedure || selectedProcedure.status === 'completed'}
                      />
                      <div>
                        <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">Procedure Outcome</label>
                        <select
                          value={outcome}
                          onChange={(e) => setOutcome(e.target.value)}
                          className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--icon-purple-text)]"
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
                  {canUpdateProcedure && selectedProcedure.status !== 'completed' && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => { setSelectedProcedureId(''); resetForm(); }}
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
                          <span className="flex items-center justify-center gap-2">
                            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            Saving...
                          </span>
                        ) : 'Complete Procedure & Save Notes'}
                      </button>
                    </div>
                  )}
                </div>

                {/* OPERATION NOTES SIDEBAR (mirrors Physician Notes panel) */}
                <div className="w-64 xl:w-72 flex-shrink-0 sticky top-6 self-stretch flex flex-col" style={{ minHeight: 0 }}>
                  <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden flex flex-col h-full">

                    {/* Procedure info — top section */}
                    <div className="bg-[var(--bg-main)] px-4 py-2.5 border-b border-[var(--border-color)] flex-shrink-0">
                      <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2 text-sm">
                        <FileText className="w-4 h-4 text-[var(--icon-purple-text)]" />
                        Procedure Details
                      </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 bg-[var(--bg-main)] space-y-3" style={{ minHeight: '120px' }}>
                      <div className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border-color)] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[var(--icon-purple-text)]">Procedure</span>
                          {getStatusBadge(selectedProcedure.status)}
                        </div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">{selectedProcedure.name}</p>
                        {selectedProcedure.scheduledDate && (
                          <div className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Scheduled: {new Date(selectedProcedure.scheduledDate).toLocaleString()}
                          </div>
                        )}
                        {selectedProcedure.performedAt && (
                          <div className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Performed: {new Date(selectedProcedure.performedAt).toLocaleString()}
                          </div>
                        )}
                        {selectedProcedure.notes && (
                          <p className="text-xs text-[var(--text-secondary)] border-t border-[var(--border-color)] pt-2 mt-1">
                            {selectedProcedure.notes}
                          </p>
                        )}
                      </div>

                      {/* Outcome chip if completed */}
                      {selectedProcedure.outcome && (
                        <div className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border-color)]">
                          <span className="text-xs font-semibold text-[var(--icon-purple-text)] block mb-1">Outcome</span>
                          <span className={`text-xs font-medium ${
                            selectedProcedure.outcome.includes('unsuccessful') || selectedProcedure.outcome === 'aborted'
                              ? 'text-red-600'
                              : selectedProcedure.outcome.includes('major')
                              ? 'text-orange-600'
                              : selectedProcedure.outcome.includes('minor')
                              ? 'text-yellow-600'
                              : 'text-green-600'
                          }`}>
                            {outcomeOptions.find(o => o.value === selectedProcedure.outcome)?.label || selectedProcedure.outcome}
                          </span>
                        </div>
                      )}

                      {/* Blood loss chip */}
                      {selectedProcedure.bloodLoss && (
                        <div className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border-color)]">
                          <span className="text-xs font-semibold text-[var(--icon-purple-text)] block mb-1">Blood Loss</span>
                          <span className={`text-sm font-bold ${Number(selectedProcedure.bloodLoss) > 500 ? 'text-red-600' : 'text-[var(--text-primary)]'}`}>
                            {selectedProcedure.bloodLoss} ml
                          </span>
                        </div>
                      )}

                      {/* Complications */}
                      {selectedProcedure.complications && (
                        <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                          <span className="text-xs font-semibold text-red-600 block mb-1">⚠ Complications</span>
                          <p className="text-xs text-red-700 whitespace-pre-wrap">{selectedProcedure.complications}</p>
                        </div>
                      )}
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-2 px-4 py-2 border-t border-b border-[var(--border-color)] bg-[var(--bg-main)] flex-shrink-0">
                      <div className="flex-1 h-px bg-[var(--border-color)]" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                        <FileText className="w-3 h-3" />
                        Surgeon Notes
                      </span>
                      <div className="flex-1 h-px bg-[var(--border-color)]" />
                    </div>

                    {/* Surgeon notes feed — bottom section */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[var(--bg-main)]" style={{ minHeight: '80px' }}>
                      {selectedProcedure.intraOperativeNotes || selectedProcedure.postOperativeNotes || selectedProcedure.anesthesiaNotes ? (
                        <div className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border-color)] space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-[var(--icon-purple-text)]">
                              {selectedProcedure.performedById || 'Surgeon'}
                            </span>
                            {selectedProcedure.performedAt && (
                              <span className="text-[10px] text-[var(--text-secondary)]">
                                {new Date(selectedProcedure.performedAt).toLocaleString()}
                              </span>
                            )}
                          </div>
                          {selectedProcedure.anesthesiaNotes && (
                            <p className="text-xs text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
                              <span className="font-semibold">Anesthesia–</span>{selectedProcedure.anesthesiaNotes}
                            </p>
                          )}
                          {selectedProcedure.intraOperativeNotes && (
                            <p className="text-xs text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed border-t border-[var(--border-color)] pt-2">
                              <span className="font-semibold">Intra-op–</span>{selectedProcedure.intraOperativeNotes}
                            </p>
                          )}
                          {selectedProcedure.postOperativeNotes && (
                            <p className="text-xs text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed border-t border-[var(--border-color)] pt-2">
                              <span className="font-semibold">Post-op–</span>{selectedProcedure.postOperativeNotes}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="text-center text-[var(--text-secondary)] text-xs py-6">
                          No operation notes recorded yet
                        </div>
                      )}
                    </div>

                  </div>
                </div>

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
      ) : selectedPatientId && !selectedAttendanceId ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-yellow-800 mb-1">No Attendance Selected</h3>
          <p className="text-sm text-yellow-700">Please select an attendance to manage theatre procedures</p>
        </div>
      ) : null}

      {/* ── SCHEDULE PROCEDURE MODAL ── */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setShowScheduleModal(false)}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-[var(--bg-card)] rounded-xl shadow-xl max-w-md w-full border border-[var(--border-color)]">
              {/* Modal header */}
              <div className="bg-[var(--bg-main)] px-5 py-3 border-b border-[var(--border-color)] rounded-t-xl flex items-center justify-between">
                <h2 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-[var(--icon-purple-text)]" />
                  Schedule Procedure
                </h2>
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="p-1 hover:bg-[var(--bg-card)] rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-[var(--text-secondary)]" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Search */}
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
                      className="w-full pl-9 pr-8 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--icon-purple-text)]"
                    />
                    {scheduleSearch && (
                      <button
                        onClick={clearTemplateSelection}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-[var(--bg-main)]"
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

                {/* Date */}
                <div>
                  <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">Scheduled Date &amp; Time *</label>
                  <input
                    type="datetime-local"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--icon-purple-text)]"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">Notes (Optional)</label>
                  <textarea
                    value={procedureNotes}
                    onChange={(e) => setProcedureNotes(e.target.value)}
                    rows={2}
                    placeholder="Special instructions, equipment needed, etc."
                    className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm resize-none focus:ring-2 focus:ring-[var(--icon-purple-text)]"
                  />
                </div>
              </div>

              {/* Modal footer */}
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
                  className="flex-1 px-4 py-2 bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] rounded-lg hover:bg-[var(--icon-purple-text)] hover:text-white text-sm font-medium disabled:opacity-50 transition-all"
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