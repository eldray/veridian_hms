import { useSmartBack } from '../utils/useSmartBack';
// src/pages/TheatreProcedure.tsx — V3, restructured to Antenatal UI language
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { confirmDialog } from '../context/ConfirmDialog';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAttendanceStore } from '../store/attendanceStore';
import { usePatientStore } from '../store/patientStore';
import { useAuthStore } from '../store/authStore';
import { useMedicalServicesStore } from '../store/medicalServicesStore';
import { useToast } from '../store/toastStore';
import { PatientAttendanceSelector } from '../components/vitals/PatientAttendanceSelector';
import { QueuedVisits, type QueuedVisit } from '../components/worklist/QueuedVisits';
import { AllergyBanner } from '../components/patients/AllergyBanner';
import { getTheatreWorklist, removeProcedureFromEncounter } from '../api';
import { getPatientName } from '../utils/patient';
import { PatientVisitHeader } from '../components/ui/PatientVisitHeader';
import { PageHeader } from '../components/ui';
import { pickVisit } from '../utils/visitSelection';
import {
  ChevronLeft, Scissors, ClipboardList, RefreshCw, AlertCircle,
  Syringe, FileText, CheckCircle, Clock, User, Calendar,
  Activity, Plus, X, Search, Edit, Trash2, Printer,
  Droplet, Heart, Info, ChevronDown, ChevronRight,
  Save, Maximize2, AlertTriangle, CircleDot, Stethoscope,
} from 'lucide-react';

const getEntityId = (entity: { id?: string; _id?: string } | null): string | undefined =>
  entity?.id || entity?._id;

const OUTSTANDING_PROCEDURE_STATUSES = new Set(['scheduled', 'in_progress']);

/** A visit is "the one to open" when it still owes this department a procedure. */
const hasOutstandingProcedureWork = (visit: any): boolean =>
  (visit?.Procedure || []).some((proc: any) => OUTSTANDING_PROCEDURE_STATUSES.has(String(proc?.status)));

const getStatusBadge = (status: string) => {
  const map: Record<string, string> = {
    scheduled:   'bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)] border-[var(--icon-blue-text)]/30',
    in_progress: 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)] border-[var(--icon-yellow-text)]/30',
    completed:   'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] border-[var(--icon-green-text)]/30',
    cancelled:   'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] border-[var(--icon-red-text)]/30',
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
    scheduled: 'bg-[var(--icon-blue-text)]',
    in_progress: 'bg-[var(--icon-yellow-text)]',
    completed: 'bg-[var(--icon-green-text)]',
    cancelled: 'bg-[var(--icon-red-text)]',
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${map[status] || 'bg-[var(--text-tertiary)]'}`} />;
};

const countWords = (text: string) =>
  text?.trim() ? text.trim().split(/\s+/).length : 0;

/**
 * Procedure workflow is configurable per ServiceCatalog metadata:
 * metadata.procedureWorkflow = "theatre" | "minor", or metadata.requiresTheatre = boolean.
 * Older catalogue entries fall back to a conservative name-based classification.
 */
const isTheatreRequiredProcedure = (procedure: any): boolean => {
  const metadata = procedure?.ServiceCatalog?.metadata || procedure?.metadata || {};
  const configured = String(metadata.procedureWorkflow || metadata.workflow || '').toLowerCase();
  if (configured === 'theatre' || configured === 'major') return true;
  if (configured === 'minor' || configured === 'clinic') return false;
  if (typeof metadata.requiresTheatre === 'boolean') return metadata.requiresTheatre;

  const name = String(procedure?.name || procedure?.ServiceCatalog?.name || '').toLowerCase();
  // Common bedside/minor work is explicitly kept out of the full theatre form.
  if (/\b(dressing|wound\s+toilet|sutur(e|ing)|suture\s+removal|incision\s+and\s+drainage|abscess\s+drainage|catheterisation|catheterization|urinary\s+catheter|cannulation|venepuncture|venipuncture|injection|aspiration|nail\s+avulsion|wound\s+care|packing|simple\s+biopsy|circumcision)\b/.test(name)) return false;
  if (/\b(laparotom|laparoscop|craniotom|thoracotom|mastectom|hysterectom|caesarean|cesarean|appendectom|cholecystectom|resection|amputation|major\s+surgery|hernia\s+repair|internal\s+fixation|open\s+reduction|thyroidectom|prostatectom|nephrectom|colostom|ileostom|thoracostom|general\s+anaesthe|general\s+anesthe)\b/.test(name)) return true;

  const template = procedure?.ServiceCatalog?.ProcedureTemplate || procedure?.ProcedureTemplate || {};
  const classification = String(template.category || procedure?.ServiceCatalog?.department || '').toLowerCase();
  return classification.includes('surgery') || classification.includes('theatre');
};

// ─────────────────────────────────────────────────────────────
// Shared primitives (mirroring src/pages/Antenatal.tsx)
// ─────────────────────────────────────────────────────────────
const SectionCard: React.FC<{
  icon: React.ReactNode; title: string; count?: number;
  countCls?: string; action?: React.ReactNode; children: React.ReactNode; maxH?: string;
}> = ({ icon, title, count, countCls = 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]', action, children, maxH = 'max-h-none' }) => (
  <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden flex flex-col">
    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-main)] flex-shrink-0">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-semibold text-[var(--text-primary)] tracking-tight">{title}</span>
        {count !== undefined && count > 0 && (
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${countCls}`}>{count}</span>
        )}
      </div>
      {action}
    </div>
    <div className={`${maxH} overflow-y-auto`} style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--border-color) transparent' }}>
      {children}
    </div>
  </div>
);

const EmptySlate: React.FC<{ icon: React.ReactNode; label: string; action?: React.ReactNode }> = ({ icon, label, action }) => (
  <div className="flex flex-col items-center justify-center py-10 gap-2.5">
    <div className="opacity-20">{icon}</div>
    <p className="text-xs text-[var(--text-tertiary)]">{label}</p>
    {action}
  </div>
);

const AddBtn: React.FC<{ onClick: () => void; label: string }> = ({ onClick, label }) => (
  <button onClick={onClick}
    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold
      bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]
      hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all">
    <Plus className="w-3 h-3" />{label}
  </button>
);

const FormField: React.FC<{ label: string; children: React.ReactNode; className?: string; hint?: string }> = ({ label, children, className = '', hint }) => (
  <label className={`block text-xs font-semibold text-[var(--text-primary)] ${className}`}>
    {label}
    <div className="mt-1 font-normal">{children}</div>
    {hint && <p className="mt-1 text-[10px] font-normal text-[var(--text-tertiary)]">{hint}</p>}
  </label>
);

const TickBox: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string }> = ({ checked, onChange, label }) => (
  <label className="flex items-start gap-2 rounded-lg border border-[var(--border-color)] p-3 text-xs text-[var(--text-primary)] cursor-pointer hover:bg-[var(--bg-main)] transition-colors">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5" />
    <span>{label}</span>
  </label>
);

const TH: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] whitespace-nowrap">{children}</th>
);
const TD: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <td className={`px-3 py-2 text-[var(--text-secondary)] text-xs ${className}`}>{children}</td>
);
const TDp: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <td className="px-3 py-2 text-[var(--text-primary)] text-xs font-medium">{children}</td>
);

type TheatreTabKey = 'procedures' | 'record' | 'narrative' | 'handover' | 'history';

// ─────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────
export default function TheatreProcedure() {
  const goBack = useSmartBack('/dashboard/theatre');
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
  const [openTile, setOpenTile] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TheatreTabKey>('procedures');

  // Theatre form state
  const [anesthesiaNotes, setAnesthesiaNotes] = useState('');
  const [intraOperativeNotes, setIntraOperativeNotes] = useState('');
  const [postOperativeNotes, setPostOperativeNotes] = useState('');
  const [bloodLoss, setBloodLoss] = useState<number | ''>('');
  const [complications, setComplications] = useState('');
  const [hasComplications, setHasComplications] = useState(false);
  const [anesthesiaType, setAnesthesiaType] = useState('general');
  const [outcome, setOutcome] = useState('');
  const [clinicalRecord, setClinicalRecord] = useState<any>({
    indication: '', preOpDiagnosis: '', operativeSite: '',
    identityConfirmed: false, procedureAndSiteConfirmed: false, siteMarked: false,
    consentConfirmed: false, consentStatus: '', consentNotes: '',
    allergyStatusReviewed: false, allergyNotes: '', preOpAssessmentCompleted: false,
    asaClass: '', surgeonName: '', assistantName: '', anaesthetistName: '',
    scrubNurseName: '', circulatingNurseName: '', incisionTime: '', closureTime: '',
    instrumentCountsCorrect: false, instrumentCountsStatus: '', instrumentCountNotes: '', specimens: '', specimenLabelled: false,
    postOpDestination: '', postOpPlan: '', handoverNotes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditingCompletedProcedure, setIsEditingCompletedProcedure] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [minorProcedureRecord, setMinorProcedureRecord] = useState({
    indication: '',
    site: '',
    findings: '',
    procedureDetails: '',
    anaesthesia: 'local',
    complications: '',
    aftercare: '',
    outcome: 'successful',
  });

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
  const [queueRows, setQueueRows] = useState<QueuedVisit[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);

  const loadQueue = async () => {
    setQueueLoading(true);
    try {
      const response: any = await getTheatreWorklist();
      // The API returns the standard envelope around a worklist object whose
      // rows live in its own data array. Support intercepted/direct shapes too.
      const payload = response?.data?.data ?? response?.data ?? response;
      const rows: any[] = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : [];
      setQueueRows(rows.map((row) => ({
        attendanceId: row.attendanceId,
        patientId: row.patientId,
        name: row.patient?.name || 'Unknown patient',
        imageUrl: row.patient?.imageUrl,
        folderNumber: row.patient?.folderNumber,
        age: row.patient?.age,
        gender: row.patient?.gender,
        attendanceNumber: row.attendanceNumber,
        visitDate: row.attendanceDateTime,
        detail: [
          `${row.procedureCount ?? 0} procedure${row.procedureCount === 1 ? '' : 's'}`,
          row.scheduledCount ? `${row.scheduledCount} scheduled` : null,
          row.inProgressCount ? `${row.inProgressCount} in progress` : null,
          Array.isArray(row.procedureNames) && row.procedureNames[0] ? row.procedureNames[0] : null,
        ].filter(Boolean).join(' · '),
        priority: row.priority,
        waitMinutes: row.waitTime,
      })));
    } catch {
      setQueueRows([]);
    } finally {
      setQueueLoading(false);
    }
  };

  const openQueuedVisit = (row: QueuedVisit) => {
    navigate(`/dashboard/theatre/${row.patientId}`, {
      state: {
        patient: {
          id: row.patientId,
          name: row.name,
          imageUrl: row.imageUrl,
          folderNumber: row.folderNumber,
          age: row.age,
          gender: row.gender,
        },
        attendanceId: row.attendanceId,
      },
    });
  };

  const loadData = async () => {
    try {
      setRefreshing(true);
      await Promise.all([loadPatients().catch(() => undefined), getProcedureTemplates(false)]);

      const statePatient = location.state?.patient;
      const patientId = statePatient?.id || id;
      const initialAttendanceId = location.state?.attendanceId;

      if (!patientId) await loadQueue();

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

        let target: any = initialAttendanceId
          ? patientAttendances.find(a => a.id === initialAttendanceId)
          : undefined;
        if (!target && initialAttendanceId) {
          target = await getAttendance(initialAttendanceId).catch(() => null);
          if (target && !patientAttendances.some(a => a.id === target.id)) {
            setAllAttendances([target, ...patientAttendances]);
          }
        }
        target = target || pickVisit(patientAttendances, hasOutstandingProcedureWork);
        if (target) {
          setSelectedAttendanceId(target.id);
          if (!foundPatient) {
            const linked = target.Patient || target.patient || null;
            if (linked) setPatient(linked);
          }
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

  useEffect(() => { loadData(); }, [id, location.key, location.state?.attendanceId]);

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
  const canUpdateProcedure = !!attendance && ['pending', 'admitted'].includes(String(attendance?.status || '').toLowerCase());
  const canManageProcedures = ['admin', 'super_admin', 'doctor'].includes(user?.role || '');

  const procedures = useMemo(() => {
    const entries = Array.isArray(currentAttendance?.Procedure) ? currentAttendance.Procedure : [];
    return entries.filter((proc: any) => !!proc && typeof proc === 'object').map((proc: any) => ({
      ...proc,
      id: proc.id || proc._id || '',
      status: String(proc.status || 'scheduled').toLowerCase(),
      name: proc.ServiceCatalog?.name || proc.name || 'Unknown Procedure',
    }));
  }, [currentAttendance]);

  const selectedProcedure = procedures.find((p: any) => p.id === selectedProcedureId);
  const procedureDocumentationUnlocked = !!selectedProcedure && ['in_progress', 'completed'].includes(String(selectedProcedure.status || '').toLowerCase());
  const canEditCompletedProcedure = !!selectedProcedure && selectedProcedure.status === 'completed' && canManageProcedures && isEditingCompletedProcedure;
  const procedureRecordEditable = !!selectedProcedure && (selectedProcedure.status === 'in_progress' || canEditCompletedProcedure);

  const appliedInitialProcedureId = useRef<string | null>(null);
  useEffect(() => {
    const requestedProcedureId = location.state?.procedureId;
    if (
      typeof requestedProcedureId === 'string' &&
      requestedProcedureId !== appliedInitialProcedureId.current &&
      procedures.some((procedure: any) => procedure.id === requestedProcedureId)
    ) {
      setSelectedProcedureId(requestedProcedureId);
      appliedInitialProcedureId.current = requestedProcedureId;
    }
  }, [procedures, location.state?.procedureId]);

  useEffect(() => {
    if (selectedProcedure) {
      setAnesthesiaNotes(selectedProcedure.anesthesiaNotes || '');
      setIntraOperativeNotes(selectedProcedure.intraOperativeNotes || '');
      setPostOperativeNotes(selectedProcedure.postOperativeNotes || '');
      setBloodLoss(selectedProcedure.bloodLoss ?? '');
      setComplications(selectedProcedure.complications || '');
      setHasComplications(!!selectedProcedure.complications);
      setOutcome(selectedProcedure.outcome || '');
      setMinorProcedureRecord({
        indication: selectedProcedure.clinicalRecord?.minorProcedure?.indication || '',
        site: selectedProcedure.clinicalRecord?.minorProcedure?.site || '',
        findings: selectedProcedure.clinicalRecord?.minorProcedure?.findings || '',
        procedureDetails: selectedProcedure.clinicalRecord?.minorProcedure?.procedureDetails || '',
        anaesthesia: selectedProcedure.clinicalRecord?.minorProcedure?.anaesthesia || 'local',
        complications: selectedProcedure.clinicalRecord?.minorProcedure?.complications || '',
        aftercare: selectedProcedure.clinicalRecord?.minorProcedure?.aftercare || '',
        outcome: selectedProcedure.clinicalRecord?.minorProcedure?.outcome || 'successful',
      });
      setClinicalRecord({
        indication: '', preOpDiagnosis: '', operativeSite: '',
        identityConfirmed: false, procedureAndSiteConfirmed: false, siteMarked: false,
        consentConfirmed: false, consentStatus: '', consentNotes: '',
        allergyStatusReviewed: false, allergyNotes: '', preOpAssessmentCompleted: false,
        asaClass: '', surgeonName: '', assistantName: '', anaesthetistName: '',
        scrubNurseName: '', circulatingNurseName: '', incisionTime: '', closureTime: '',
        instrumentCountsCorrect: false, instrumentCountsStatus: '', instrumentCountNotes: '', specimens: '', specimenLabelled: false,
        postOpDestination: '', postOpPlan: '', handoverNotes: '',
        ...(selectedProcedure.clinicalRecord || {}),
      });
      setAnesthesiaType(selectedProcedure.clinicalRecord?.anesthesiaType || 'general');
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
  }, [selectedProcedure?.id]);

  useEffect(() => {
    setIsEditingCompletedProcedure(false);
  }, [selectedProcedureId]);

  // Debounced draft autosave. It preserves the procedure's current status and never completes work.
  useEffect(() => {
    if (!selectedProcedure || !selectedAttendanceId || !selectedProcedureId ||
        (!canUpdateProcedure && !canEditCompletedProcedure) ||
        !['in_progress', 'completed'].includes(String(selectedProcedure.status || '').toLowerCase()) ||
        (selectedProcedure.status === 'completed' && !canEditCompletedProcedure)) {
      setAutosaveStatus('idle');
      return;
    }

    const isMinor = !isTheatreRequiredProcedure(selectedProcedure);
    const currentMinor = { ...minorProcedureRecord };
    const currentClinicalRecord = { ...clinicalRecord };
    const currentAudit = Array.isArray(selectedProcedure.clinicalRecord?.auditLog)
      ? selectedProcedure.clinicalRecord.auditLog : [];
    const nextClinicalRecord = isMinor
      ? { ...(selectedProcedure.clinicalRecord || {}), minorProcedure: currentMinor, workflow: 'minor' }
      : { ...currentClinicalRecord, anesthesiaType, workflow: 'theatre' };
    const persistedClinicalRecord = { ...(selectedProcedure.clinicalRecord || {}) };
    const comparableClinicalRecord = { ...nextClinicalRecord };
    delete persistedClinicalRecord.auditLog;
    delete comparableClinicalRecord.auditLog;

    const unchanged = isMinor
      ? JSON.stringify(selectedProcedure.clinicalRecord?.minorProcedure || {}) === JSON.stringify(currentMinor) &&
        selectedProcedure.clinicalRecord?.workflow === 'minor'
      : selectedProcedure.anesthesiaNotes === (anesthesiaNotes || null) &&
        selectedProcedure.intraOperativeNotes === (intraOperativeNotes || null) &&
        selectedProcedure.postOperativeNotes === (postOperativeNotes || null) &&
        selectedProcedure.bloodLoss === (bloodLoss === '' ? null : Number(bloodLoss)) &&
        selectedProcedure.complications === (hasComplications ? complications : null) &&
        JSON.stringify(persistedClinicalRecord) === JSON.stringify(comparableClinicalRecord);
    if (unchanged) return;

    setAutosaveStatus('saving');
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    const timer = setTimeout(async () => {
      try {
        const actor = user?.fullName || user?.email || user?.username || user?.id || 'Clinical user';
        const timestamp = new Date().toISOString();
        const auditLog = [...currentAudit, {
          action: 'procedure_draft_autosaved',
          userId: user?.id || null,
          userLabel: actor,
          timestamp,
        }];
        await updateProcedureStatus(selectedAttendanceId, selectedProcedureId, {
          status: selectedProcedure.status,
          ...(isMinor ? {
            outcome: currentMinor.outcome,
            complications: currentMinor.complications.trim() || null,
            clinicalRecord: { ...nextClinicalRecord, auditLog },
          } : {
            anesthesiaNotes: anesthesiaNotes || null,
            intraOperativeNotes: intraOperativeNotes || null,
            postOperativeNotes: postOperativeNotes || null,
            bloodLoss: bloodLoss === '' ? null : Number(bloodLoss),
            complications: hasComplications ? complications : null,
            outcome: outcome || null,
            clinicalRecord: { ...nextClinicalRecord, auditLog },
          }),
        });
        setAutosaveStatus('saved');
      } catch {
        setAutosaveStatus('error');
      }
    }, 1800);
    autosaveTimer.current = timer;
    return () => clearTimeout(timer);
  }, [
    selectedProcedureId, selectedAttendanceId, selectedProcedure, canUpdateProcedure, canEditCompletedProcedure,
    minorProcedureRecord, clinicalRecord, anesthesiaNotes, intraOperativeNotes,
    postOperativeNotes, bloodLoss, complications, hasComplications, outcome,
    anesthesiaType, user?.id, user?.fullName, user?.email, user?.username,
    updateProcedureStatus,
  ]);

  useEffect(() => () => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
  }, []);

  const resetForm = () => {
    setAnesthesiaNotes('');
    setIntraOperativeNotes('');
    setPostOperativeNotes('');
    setBloodLoss('');
    setComplications('');
    setHasComplications(false);
    setAnesthesiaType('general');
    setOutcome('');
    setClinicalRecord({
      indication: '', preOpDiagnosis: '', operativeSite: '',
      identityConfirmed: false, procedureAndSiteConfirmed: false, siteMarked: false,
      consentConfirmed: false, consentStatus: '', consentNotes: '',
      allergyStatusReviewed: false, allergyNotes: '', preOpAssessmentCompleted: false,
      asaClass: '', surgeonName: '', assistantName: '', anaesthetistName: '',
      scrubNurseName: '', circulatingNurseName: '', incisionTime: '', closureTime: '',
      instrumentCountsCorrect: false, instrumentCountsStatus: '', instrumentCountNotes: '', specimens: '', specimenLabelled: false,
      postOpDestination: '', postOpPlan: '', handoverNotes: '',
    });
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
      success('Procedure started', 'Operation in progress. Continue with the clinical record below.');
      setActiveTab('record');
      await getAttendance(selectedAttendanceId);
    } catch (error: any) {
      toastError('Update failed', error.message);
    }
  };

  const handleSubmitTheatreNotes = async (complete = true) => {
    if (bloodLoss !== '' && (!Number.isFinite(Number(bloodLoss)) || !Number.isInteger(Number(bloodLoss)) || Number(bloodLoss) < 0)) {
      toastError('Invalid estimated blood loss', 'Enter zero or a positive whole-number blood loss in millilitres.');
      return;
    }
    if (!selectedProcedureId || !selectedAttendanceId) {
      toastError('Selection required', 'Please select a procedure');
      return;
    }
    if (!canUpdateProcedure && !canEditCompletedProcedure) {
      toastError('Access denied', 'This procedure record cannot be edited in the current state.');
      return;
    }
    const customProtocolFields = Array.isArray(clinicalRecord.customProtocolFields) ? clinicalRecord.customProtocolFields : [];
    const unlabeledProtocolField = customProtocolFields.find((field: any) => !String(field.label || '').trim());
    if (unlabeledProtocolField) {
      toastError('Protocol field label required', 'Give each hospital-specific theatre field a name before saving.');
      return;
    }
    if (complete) {
      if (!outcome || !outcomeOptions.some((option) => option.value === outcome)) {
        toastError('Procedure outcome required', 'Select the documented outcome before completing the theatre record.');
        return;
      }
      if (
        !String(clinicalRecord.indication || '').trim() ||
        !String(clinicalRecord.preOpDiagnosis || '').trim() ||
        !String(clinicalRecord.operativeSite || '').trim()
      ) {
        toastError('Operative details incomplete', 'Record the clinical indication, pre-operative diagnosis and operative site before completing the theatre record.');
        return;
      }
      const missingProtocolField = customProtocolFields.find((field: any) => field.required === true && (
        field.type === 'checkbox' ? field.value !== true : String(field.value ?? '').trim() === ''
      ));
      if (missingProtocolField) {
        toastError('Hospital protocol field required', `Complete the required field: ${missingProtocolField.label || 'Unnamed protocol field'}`);
        return;
      }
      if (!clinicalRecord.identityConfirmed || !clinicalRecord.procedureAndSiteConfirmed) {
        toastError('Safety checks incomplete', 'Confirm patient identity and the planned procedure/site before completion.');
        return;
      }
      if (!clinicalRecord.consentConfirmed && clinicalRecord.consentStatus !== 'emergency_exception') {
        toastError('Consent documentation required', 'Record informed consent or document the emergency exception.');
        return;
      }
      if (
        clinicalRecord.consentStatus === 'emergency_exception' &&
        !String(clinicalRecord.consentNotes || '').trim()
      ) {
        toastError('Emergency exception details required', 'Document the reason and circumstances for proceeding without informed consent.');
        return;
      }
      if (String(clinicalRecord.specimens || '').trim() && clinicalRecord.specimenLabelled !== true) {
        toastError('Specimen labelling required', 'Confirm that the specimen is correctly labelled before completing the procedure.');
        return;
      }
      if (!clinicalRecord.allergyStatusReviewed || !clinicalRecord.preOpAssessmentCompleted) {
        toastError('Pre-operative checks incomplete', 'Review allergies and complete the pre-operative assessment.');
        return;
      }
      if (clinicalRecord.instrumentCountsStatus !== 'correct' && !(clinicalRecord.instrumentCountsStatus === 'not_applicable' && String(clinicalRecord.instrumentCountNotes || '').trim())) {
        toastError('Counts not confirmed', 'Confirm counts or document why they are not applicable. Resolve any discrepancy before completion.');
        return;
      }
      if (!String(clinicalRecord.postOpDestination || '').trim() || !String(clinicalRecord.postOpPlan || '').trim()) {
        toastError('Post-operative handover incomplete', 'Record the post-operative destination and care plan.');
        return;
      }
      if (!String(clinicalRecord.handoverNotes || '').trim()) {
        toastError('Clinical handover required', 'Document the key information handed over to the receiving recovery or ward team.');
        return;
      }
    }
    setIsSubmitting(true);
    try {
      await updateProcedureStatus(selectedAttendanceId, selectedProcedureId, {
        status: complete ? 'completed' : (selectedProcedure?.status === 'completed' ? 'completed' : 'in_progress'),
        anesthesiaNotes: anesthesiaNotes || null,
        intraOperativeNotes: intraOperativeNotes || null,
        postOperativeNotes: postOperativeNotes || null,
        bloodLoss: bloodLoss !== '' && bloodLoss !== null ? Number(bloodLoss) : null,
        complications: hasComplications ? complications : null,
        outcome: outcome || null,
        clinicalRecord: {
          ...clinicalRecord,
          anesthesiaType,
          workflow: 'theatre',
          auditLog: [
            ...(Array.isArray(selectedProcedure?.clinicalRecord?.auditLog) ? selectedProcedure.clinicalRecord.auditLog : []),
            {
              action: selectedProcedure?.status === 'completed' ? 'completed_theatre_record_edited' : (complete ? 'theatre_record_completed' : 'theatre_record_saved'),
              userId: user?.id || null,
              userLabel: user?.fullName || user?.email || user?.username || user?.id || 'Clinical user',
              timestamp: new Date().toISOString(),
            },
          ],
        },
        performedById: selectedProcedure?.status === 'completed' ? (selectedProcedure.performedById || user?.id || '') : (user?.id || ''),
        performedAt: selectedProcedure?.status === 'completed' ? (selectedProcedure.performedAt || new Date().toISOString()) : new Date().toISOString(),
      });
      if (complete) {
        success('Operation notes saved', 'Theatre procedure completed');
        resetForm();
        setSelectedProcedureId('');
        setOpenTile(null);
        await getAttendance(selectedAttendanceId);
        await calculateBill(selectedAttendanceId);
      } else {
        success('Theatre record saved', selectedProcedure?.status === 'completed' ? 'Changes to the completed procedure have been saved.' : 'Your procedure documentation has been saved as in progress');
        if (selectedProcedure?.status === 'completed') setIsEditingCompletedProcedure(false);
        await getAttendance(selectedAttendanceId);
      }
    } catch (err: any) {
      toastError('Save failed', err.message || 'Could not save operation notes');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitMinorProcedure = async () => {
    if (!selectedProcedureId || !selectedAttendanceId || !selectedProcedure) {
      toastError('Selection required', 'Select the minor procedure before saving.');
      return;
    }
    if (!canUpdateProcedure && !canEditCompletedProcedure) {
      toastError('Access denied', 'This procedure record cannot be edited in the current state.');
      return;
    }
    if (!minorProcedureRecord.procedureDetails.trim()) {
      toastError('Procedure details required', 'Describe the procedure performed.');
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      const previousRecord = selectedProcedure.clinicalRecord || {};
      const auditLog = Array.isArray(previousRecord.auditLog) ? previousRecord.auditLog : [];
      const actor = user?.fullName || user?.email || user?.username || user?.id || 'Clinical user';
      await updateProcedureStatus(selectedAttendanceId, selectedProcedureId, {
        status: 'completed',
        performedById: selectedProcedure.status === 'completed' ? (selectedProcedure.performedById || user?.id || '') : (user?.id || ''),
        performedAt: selectedProcedure.status === 'completed' ? (selectedProcedure.performedAt || now) : now,
        outcome: minorProcedureRecord.outcome,
        complications: minorProcedureRecord.complications.trim() || null,
        clinicalRecord: {
          ...previousRecord,
          minorProcedure: { ...minorProcedureRecord },
          workflow: 'minor',
          auditLog: [...auditLog, {
            action: selectedProcedure.status === 'completed' ? 'completed_procedure_record_edited' : 'procedure_documented',
            userId: user?.id || null,
            userLabel: actor,
            timestamp: now,
          }],
        },
      });
      if (selectedProcedure.status === 'completed') {
        success('Changes saved', 'The completed minor procedure record has been updated.');
        setIsEditingCompletedProcedure(false);
      } else {
        success('Procedure saved', 'Minor procedure documentation has been recorded.');
        setActiveTab('procedures');
        setSelectedProcedureId('');
        setMinorProcedureRecord({
          indication: '', site: '', findings: '', procedureDetails: '',
          anaesthesia: 'local', complications: '', aftercare: '', outcome: 'successful',
        });
        await calculateBill(selectedAttendanceId);
      }
      await getAttendance(selectedAttendanceId);
    } catch (err: any) {
      toastError('Save failed', err.message || 'Could not save the minor procedure.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelProcedure = async (procedureId: string) => {
    if (!(await confirmDialog({ title: 'Cancel procedure', message: 'Cancel this procedure? It will remain in the clinical record as cancelled.', confirmText: 'Cancel procedure' }))) return;
    try {
      await updateProcedureStatus(selectedAttendanceId!, procedureId, { status: 'cancelled' });
      success('Procedure cancelled', 'The procedure has been cancelled');
      await getAttendance(selectedAttendanceId!);
    } catch (error: any) {
      toastError('Cancel failed', error.message || 'Unable to cancel procedure');
    }
  };

  const handleRemoveProcedure = async (procedureId: string) => {
    if (!selectedAttendanceId || !canManageProcedures) return;
    if (!(await confirmDialog({ title: 'Remove scheduled procedure', message: 'Remove this scheduled procedure from the attendance? This is only available before the procedure starts. Completed procedures cannot be removed.', confirmText: 'Remove procedure' }))) return;
    try {
      await removeProcedureFromEncounter(selectedAttendanceId, procedureId);
      success('Procedure removed', 'The scheduled procedure was removed');
      setSelectedProcedureId('');
      setOpenTile(null);
      await getAttendance(selectedAttendanceId);
      await calculateBill(selectedAttendanceId);
    } catch (error: any) {
      toastError('Removal failed', error.message || 'Unable to remove procedure');
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

  // ── Loading / error ──────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[var(--icon-purple-text)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-[var(--text-secondary)]">Loading Theatre Data…</p>
        </div>
      </div>
    );
  }

  if (!patient && (id || (location.state as any)?.patient)) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
        <div className="text-center bg-[var(--bg-card)] p-8 rounded-xl border border-[var(--border-color)]">
          <AlertCircle className="w-12 h-12 text-[var(--icon-red-text)] mx-auto mb-3" />
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">Patient Not Found</h2>
          <p className="text-[var(--text-secondary)]">The patient you're looking for doesn't exist.</p>
          <button
            onClick={goBack}
            className="mt-4 px-4 py-2 bg-[var(--icon-purple-text)] text-white rounded-lg hover:opacity-90 transition-all"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  const scheduledProcedures = procedures.filter((p: any) => p.status === 'scheduled');
  const inProgressProcedures = procedures.filter((p: any) => p.status === 'in_progress');
  const completedProcedures = procedures.filter((p: any) => p.status === 'completed');

  const groupedProcedures = [
    { key: 'in_progress', label: 'In Progress', items: inProgressProcedures },
    { key: 'scheduled', label: 'Scheduled', items: scheduledProcedures },
    { key: 'completed', label: 'Completed', items: completedProcedures },
  ].filter(g => g.items.length > 0);

  const sections = [
    { key: 'anesthesia', filled: !!anesthesiaType && (!!anesthesiaNotes || anesthesiaType !== 'none') },
    { key: 'bloodLoss', filled: bloodLoss !== '' && bloodLoss !== null },
    { key: 'intraOp', filled: !!intraOperativeNotes },
    { key: 'complications', filled: !hasComplications || !!complications },
    { key: 'postOp', filled: !!postOperativeNotes },
    { key: 'outcome', filled: !!outcome },
  ];
  const filledCount = sections.filter(s => s.filled).length;

  const setCR = (patch: any) => setClinicalRecord((p: any) => ({ ...p, ...patch }));

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* ── PAGE HEADER ─────────────────────────────────────────── */}
      <PageHeader
        title="Theatre Management"
        subtitle="Scheduled · In progress · Documented"
        icon={Scissors}
        accent="purple"
        onBack={goBack}
        actions={(
          <>
            <button
              onClick={() => setShowScheduleModal(true)}
              disabled={!canAddEntries}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] hover:opacity-90 hover:text-white transition-all disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" /> New Procedure
            </button>
            <button
              onClick={loadData}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-color)]
                             text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-all text-xs font-medium disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </>
        )}
      />

      {/* ── SELECTOR ────────────────────────────────────────────── */}
      <PatientAttendanceSelector
        patients={patient ? [patient, ...patients.filter(p => p.id !== patient.id)] : patients}
        attendances={allAttendances}
        selectedPatientId={selectedPatientId}
        selectedAttendanceId={selectedAttendanceId}
        onPatientSelect={async (patientId) => {
          setSelectedPatientId(patientId);
          setSelectedAttendanceId('');
          setAttendance(null);
          setSelectedProcedureId('');
          setOpenTile(null);
          let resolved: any = null;
          try { resolved = await fetchPatient(patientId); } catch {}
          let visits: any[] = [];
          try {
            visits = await getAttendances({ patientId });
            setAllAttendances(visits);
            if (!resolved) {
              const linked = visits.find((a: any) => a.Patient || a.patient);
              resolved = linked?.Patient ?? linked?.patient ?? null;
            }
          } catch {
            visits = attendances.filter(a => a.patientId === patientId);
            setAllAttendances(visits);
          }
          if (resolved) setPatient(resolved);
          const best = pickVisit(visits, hasOutstandingProcedureWork);
          if (best) setSelectedAttendanceId(best.id);
        }}
        onAttendanceSelect={handleAttendanceChange}
        onClearSelection={handleClearSelection}
      />

      {/* ── QUEUE (no visit selected) ───────────────────────────── */}
      {!selectedAttendanceId && (
        <QueuedVisits
          title="Theatre queue"
          description="Procedures scheduled or in progress — pick a visit to record notes"
          icon={Scissors}
          accent="purple"
          rows={queueRows}
          loading={queueLoading}
          emptyMessage="No procedures are queued. Open the theatre waiting list to review completed operations."
          onOpen={openQueuedVisit}
          onRefresh={loadData}
          onViewAll={() => navigate('/dashboard/theatre')}
        />
      )}

      {selectedAttendanceId && attendance && patient && (
        <>
          {/* Shared patient and visit header — consistent across clinical entry pages. */}
          <PatientVisitHeader patient={patient} attendance={attendance} icon={Scissors} accent="purple" />

          <div className="flex flex-wrap items-stretch gap-2">
            <div className="min-w-0 flex-1 basis-[320px]">
              <AllergyBanner
                patientId={patient?.id}
                allergies={patient?.allergies}
                allergyReviewStatus={attendance?.allergyReviewStatus}
              />
            </div>

            {/* ── READ-ONLY WARNING ─────────────────────────────── */}
            {!canUpdateProcedure && (
              <div className="min-w-0 flex-1 basis-[320px] bg-[var(--icon-yellow-bg)] border border-[var(--icon-yellow-text)]/30 rounded-lg px-3 py-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[var(--icon-yellow-text)] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-[var(--icon-yellow-text)]">
                This visit is <strong>{attendance?.status || 'not available'}</strong>. Procedures can be viewed but not modified.
              </p>
                </div>
            )}
          </div>

          {/* ── STATS STRIP ───────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { count: scheduledProcedures.length, label: 'Scheduled', Icon: Clock, bg: 'bg-[var(--icon-blue-bg)]', color: 'text-[var(--icon-blue-text)]' },
              { count: inProgressProcedures.length, label: 'In Progress', Icon: Activity, bg: 'bg-[var(--icon-yellow-bg)]', color: 'text-[var(--icon-yellow-text)]' },
              { count: completedProcedures.length, label: 'Completed', Icon: CheckCircle, bg: 'bg-[var(--icon-green-bg)]', color: 'text-[var(--icon-green-text)]' },
            ].map(s => {
              const Icon = s.Icon;
              return (
                <div key={s.label} className="flex min-w-0 items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-2.5 py-2 sm:px-3">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${s.bg}`}>
                    <Icon className={`h-3.5 w-3.5 ${s.color}`} />
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-lg font-bold leading-none tabular-nums ${s.color}`}>{s.count}</span>
                    <span className="mt-1 block truncate text-[10px] leading-tight text-[var(--text-secondary)] sm:text-[11px]">{s.label}</span>
                  </span>
                </div>
              );
            })}
          </div>

          {/* ── THEATRE PROCEDURES AND OPERATIVE RECORD ─────────── */}
          {/* ── WORKSPACE CARD WITH TABS ──────────────────────── */}
          {selectedProcedure || activeTab === 'procedures' ? (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
              {selectedProcedure && (
                <>
              {/* Procedure header strip */}
              <div className="px-5 py-4 border-b border-[var(--border-color)] bg-[var(--bg-main)] flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-[var(--text-primary)] truncate">{selectedProcedure.name}</h2>
                  <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-[var(--text-secondary)]">
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
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getStatusBadge(selectedProcedure.status)}
                    <span className="text-[10px] text-[var(--text-tertiary)]">
                      {selectedProcedure.status === 'scheduled'
                        ? 'Next: start the procedure, then complete the clinical record.'
                        : selectedProcedure.status === 'in_progress'
                          ? 'In progress · document the procedure below.'
                          : selectedProcedure.status === 'completed'
                            ? 'Procedure and documentation completed.'
                            : 'Procedure cancelled.'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedProcedure.status === 'completed' && canManageProcedures && !isEditingCompletedProcedure && (
                      <button type="button" onClick={() => setIsEditingCompletedProcedure(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--icon-purple-text)]/40 text-[var(--icon-purple-text)] hover:bg-[var(--icon-purple-bg)] text-xs font-bold transition-all">
                        <Edit className="w-4 h-4" /> Edit entries
                      </button>
                    )}
                    {selectedProcedure.status === 'completed' && canEditCompletedProcedure && (
                      <button type="button" onClick={() => setIsEditingCompletedProcedure(false)} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)] text-xs font-semibold">Cancel editing</button>
                    )}
                    {selectedProcedure.status === 'scheduled' && canUpdateProcedure && (
                      <button
                        type="button"
                        onClick={() => handleStartProcedure(selectedProcedure.id)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--icon-yellow-text)] text-[var(--icon-yellow-on-text)] hover:opacity-90 text-xs font-bold shadow-sm transition-all"
                      >
                        <Activity className="w-4 h-4" /> Start procedure
                      </button>
                    )}
                    {selectedProcedure.status === 'scheduled' && canManageProcedures && canUpdateProcedure && (
                      <button
                        type="button"
                        onClick={() => handleRemoveProcedure(selectedProcedure.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--icon-red-text)]/30 text-[var(--icon-red-text)] hover:bg-[var(--icon-red-bg)] text-xs font-semibold"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove scheduled procedure
                      </button>
                    )}
                  </div>
                </div>
              </div>
                </>
              )}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 p-3">
              <div className="min-w-0">
                        <SectionCard
            icon={<ClipboardList className="w-4 h-4 text-[var(--icon-purple-text)]" />}
            title={`Procedures for this visit (${procedures.length})`}
            action={canAddEntries ? <AddBtn onClick={() => setShowScheduleModal(true)} label="Schedule" /> : undefined}
            maxH="max-h-none"
          >
            {procedures.length === 0 ? (
              <EmptySlate
                icon={<Scissors className="w-9 h-9" />}
                label="No procedures scheduled for this visit"
                action={canAddEntries ? (
                  <button
                    onClick={() => setShowScheduleModal(true)}
                    className="mt-1 inline-flex items-center gap-1 px-3 py-1.5 bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] rounded-lg text-xs font-medium hover:opacity-90 hover:text-white transition-all"
                  >
                    <Plus className="w-3 h-3" /> Schedule first procedure
                  </button>
                ) : undefined}
              />
            ) : (
              <div className="divide-y divide-[var(--border-color)]">
                {groupedProcedures.map(group => (
                  <div key={group.key}>
                    <div className="px-3 py-1.5 bg-[var(--bg-main)]/60 border-y border-[var(--border-color)] first:border-t-0 flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                        {group.label} ({group.items.length})
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 p-2">
                      {group.items.map((procedure: any) => {
                        const isSelected = selectedProcedureId === procedure.id;
                        return (
                          <button
                            key={procedure.id}
                            onClick={() => { setSelectedProcedureId(procedure.id); setOpenTile(null); setActiveTab('record'); }}
                            className={`text-left rounded-md border p-2 transition-all ${
                              isSelected
                                ? 'border-[var(--icon-purple-text)] bg-[var(--icon-purple-bg)] ring-1 ring-[var(--icon-purple-text)]'
                                : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--icon-purple-text)]/40 hover:bg-[var(--bg-main)]'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              {getStatusDot(procedure.status)}
                              <span className="font-semibold text-xs text-[var(--text-primary)] truncate flex-1">
                                {procedure.name}
                              </span>
                              <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${isTheatreRequiredProcedure(procedure) ? 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]' : 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]'}`}>
                                {isTheatreRequiredProcedure(procedure) ? 'Major · Theatre' : 'Minor'}
                              </span>
                            </div>
                            {procedure.scheduledDate && (
                              <p className="text-[10px] text-[var(--text-secondary)] flex items-center gap-1">
                                <Calendar className="w-2.5 h-2.5" />
                                {new Date(procedure.scheduledDate).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
                            {procedure.performedAt && procedure.status === 'completed' && (
                              <p className="text-[10px] text-[var(--icon-green-text)] flex items-center gap-1 mt-0.5">
                                <CheckCircle className="w-2.5 h-2.5" />
                                {new Date(procedure.performedAt).toLocaleDateString()}
                              </p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
              </div>
              <div className="min-w-0">
                <SectionCard
                  icon={<CheckCircle className="w-4 h-4 text-[var(--icon-green-text)]" />}
                  title={`Procedure Results (${completedProcedures.length})`}
                  maxH="max-h-none"
                >
                  {completedProcedures.length === 0 ? (
                    <EmptySlate icon={<CheckCircle className="w-8 h-8" />} label="No completed procedures yet" />
                  ) : (
                    <div className="divide-y divide-[var(--border-color)]">
                      {completedProcedures.map((procedure: any) => (
                        <button
                          key={procedure.id}
                          type="button"
                          onClick={() => { setSelectedProcedureId(procedure.id); setActiveTab('record'); setOpenTile(null); }}
                          className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left hover:bg-[var(--bg-main)]"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-semibold text-[var(--text-primary)]">{procedure.name}</span>
                            <span className="mt-1 block text-[10px] text-[var(--text-secondary)]">
                              {procedure.performedAt ? new Date(procedure.performedAt).toLocaleString() : 'Completed'}
                            </span>
                          </span>
                          {getStatusBadge(procedure.status || 'completed')}
                        </button>
                      ))}
                    </div>
                  )}
                </SectionCard>
              </div>
              </div>

              {selectedProcedure?.status === 'scheduled' && (
                <div className="mx-3 mb-3 flex flex-col gap-3 rounded-xl border border-[var(--icon-yellow-text)]/40 bg-[var(--icon-yellow-bg)] p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[var(--icon-yellow-text)] text-[var(--icon-yellow-text)]">Procedure is scheduled — documentation is not started</p>
                    <p className="mt-1 text-xs text-[var(--icon-yellow-text)] text-[var(--icon-yellow-text)]">Confirm the team is ready, then select <strong>Start procedure</strong> above. The clinical documentation will unlock when the status changes to In Progress.</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-[var(--icon-yellow-text)] px-3 py-1 text-[10px] font-semibold text-[var(--icon-yellow-text)] text-[var(--icon-yellow-text)]">Step 1 of 3 · Scheduled</span>
                </div>
              )}

              {/* ── TAB: PERI-OPERATIVE RECORD ─────────────────── */}
              {procedureDocumentationUnlocked && (
              <fieldset disabled={!procedureRecordEditable} className="contents">
              {procedureDocumentationUnlocked && isTheatreRequiredProcedure(selectedProcedure) && (
                <div className="space-y-4">
                  <div className="overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]">
                    <div className="flex items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-main)] px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[var(--text-primary)]">Theatre documentation</p>
                        <p className="truncate text-xs text-[var(--text-secondary)]">{selectedProcedure.name}</p>
                      </div>
                    </div>
                    <div className="p-3 sm:p-4 space-y-4">
                  {/* Allergy reminder inside record */}
                  <div className={`rounded-lg border p-3 ${Array.isArray(patient.allergies) && patient.allergies.length ? 'border-[var(--icon-red-text)]/40 bg-[var(--icon-red-bg)]' : 'border-[var(--icon-yellow-text)]/40 bg-[var(--icon-yellow-bg)]'}`}>
                    <p className={`text-xs font-bold ${Array.isArray(patient.allergies) && patient.allergies.length ? 'text-[var(--icon-red-text)]' : 'text-[var(--icon-yellow-text)]'}`}>
                      Known allergy record — verify directly with the patient
                    </p>
                    {Array.isArray(patient.allergies) && patient.allergies.length > 0 ? (
                      <ul className="mt-1 list-disc pl-5 text-xs text-[var(--icon-red-text)]">
                        {patient.allergies.map((allergy: any, index: number) => (
                          <li key={allergy.id || index}>
                            {allergy.allergen}
                            {allergy.reaction ? ` — reaction: ${allergy.reaction}` : ''}
                            {allergy.severity ? ` (${allergy.severity})` : ''}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-xs text-[var(--icon-yellow-text)]">
                        No allergy entries are available on this patient record. Confirm and document the patient's allergy status rather than assuming there are no allergies.
                      </p>
                    )}
                  </div>

                  {/* Pre-operative safety & team */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <SectionCard
                      icon={<Stethoscope className="w-4 h-4 text-[var(--icon-purple-text)]" />}
                      title="Clinical & operative details"
                    >
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <FormField label="Indication / reason for procedure" className="md:col-span-2">
                          <input
                            value={clinicalRecord.indication || ''}
                            onChange={(e) => setCR({ indication: e.target.value })}
                            maxLength={500}
                            className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-sm"
                          />
                        </FormField>
                        <FormField label="Pre-operative diagnosis">
                          <input
                            value={clinicalRecord.preOpDiagnosis || ''}
                            onChange={(e) => setCR({ preOpDiagnosis: e.target.value })}
                            maxLength={500}
                            className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-sm"
                          />
                        </FormField>
                        <FormField label="Operative site / laterality">
                          <input
                            value={clinicalRecord.operativeSite || ''}
                            onChange={(e) => setCR({ operativeSite: e.target.value })}
                            maxLength={500}
                            className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-sm"
                          />
                        </FormField>
                        <FormField label="ASA physical status (if assessed)">
                          <input
                            value={clinicalRecord.asaClass || ''}
                            onChange={(e) => setCR({ asaClass: e.target.value })}
                            maxLength={50}
                            className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-sm"
                          />
                        </FormField>
                        <FormField label="Consent status">
                          <select
                            value={clinicalRecord.consentStatus || ''}
                            onChange={(e) => setCR({ consentStatus: e.target.value, consentConfirmed: e.target.value === 'consented' })}
                            className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-sm"
                          >
                            <option value="">Select consent status</option>
                            <option value="consented">Informed consent obtained</option>
                            <option value="emergency_exception">Emergency exception (must explain)</option>
                          </select>
                        </FormField>
                        <FormField label="Consent / exception details" className="md:col-span-2">
                          <input
                            value={clinicalRecord.consentNotes || ''}
                            onChange={(e) => setCR({ consentNotes: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-sm"
                          />
                        </FormField>
                      </div>
                    </SectionCard>

                    <SectionCard
                      icon={<User className="w-4 h-4 text-[var(--icon-purple-text)]" />}
                      title="Theatre team"
                    >
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                          ['surgeonName', 'Surgeon / lead operator'],
                          ['assistantName', 'Assistant'],
                          ['anaesthetistName', 'Anaesthetist / anaesthesia provider'],
                          ['scrubNurseName', 'Scrub nurse'],
                          ['circulatingNurseName', 'Circulating nurse'],
                        ].map(([key, label]) => (
                          <FormField key={key} label={label}>
                            <input
                              value={clinicalRecord[key] || ''}
                              onChange={(e) => setCR({ [key]: e.target.value })}
                              maxLength={500}
                              className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-sm"
                            />
                          </FormField>
                        ))}
                        <FormField label="Allergy review notes" className="md:col-span-2">
                          <input
                            value={clinicalRecord.allergyNotes || ''}
                            onChange={(e) => setCR({ allergyNotes: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-sm"
                          />
                        </FormField>
                      </div>
                    </SectionCard>
                  </div>

                  {/* Safety + anaesthesia: paired clinical sections, matching Antenatal layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Safety time-out checks */}
                  <SectionCard
                    icon={<AlertTriangle className="w-4 h-4 text-[var(--icon-purple-text)]" />}
                    title="Safety time-out checks"
                  >
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      <TickBox
                        checked={clinicalRecord.identityConfirmed === true}
                        onChange={(v) => setCR({ identityConfirmed: v })}
                        label="Patient identity confirmed using identifiers"
                      />
                      <TickBox
                        checked={clinicalRecord.procedureAndSiteConfirmed === true}
                        onChange={(v) => setCR({ procedureAndSiteConfirmed: v })}
                        label="Planned procedure and site confirmed (time-out)"
                      />
                      <TickBox
                        checked={clinicalRecord.siteMarked === true}
                        onChange={(v) => setCR({ siteMarked: v })}
                        label="Site marked where applicable"
                      />
                      <TickBox
                        checked={clinicalRecord.allergyStatusReviewed === true}
                        onChange={(v) => setCR({ allergyStatusReviewed: v })}
                        label="Allergy status reviewed"
                      />
                      <TickBox
                        checked={clinicalRecord.preOpAssessmentCompleted === true}
                        onChange={(v) => setCR({ preOpAssessmentCompleted: v })}
                        label="Pre-operative assessment reviewed"
                      />
                    </div>
                  </SectionCard>

                  {/* Anaesthesia */}
                  <SectionCard
                    icon={<Syringe className="w-4 h-4 text-[var(--icon-purple-text)]" />}
                    title="Anaesthesia"
                  >
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <FormField label="Anaesthesia type">
                        <select
                          value={anesthesiaType}
                          onChange={(e) => setAnesthesiaType(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-sm"
                        >
                          {anesthesiaTypes.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </FormField>
                      <FormField label="Estimated blood loss (ml)">
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={bloodLoss}
                          onChange={(e) => setBloodLoss(e.target.value ? Number(e.target.value) : '')}
                          placeholder="Optional"
                          className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-sm"
                        />
                      </FormField>
                      <FormField label="Anaesthesia notes" className="md:col-span-2">
                        <textarea
                          value={anesthesiaNotes}
                          onChange={(e) => setAnesthesiaNotes(e.target.value)}
                          rows={5}
                          placeholder="Medications, patient responses, monitoring details…"
                          className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-sm resize-none"
                        />
                        <p className="mt-1 text-[10px] text-[var(--text-tertiary)]">
                          {countWords(anesthesiaNotes)} word{countWords(anesthesiaNotes) !== 1 ? 's' : ''}
                        </p>
                      </FormField>
                    </div>
                  </SectionCard>
                  </div>

                  {/* Intra-operative + local protocol: paired clinical sections */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Intra-operative */}
                  <SectionCard
                    icon={<Scissors className="w-4 h-4 text-[var(--icon-purple-text)]" />}
                    title="Intra-operative"
                  >
                    <div className="p-4 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <FormField label="Incision / procedure start time">
                          <input
                            type="time"
                            value={clinicalRecord.incisionTime || ''}
                            onChange={(e) => setCR({ incisionTime: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-sm"
                          />
                        </FormField>
                        <FormField label="Closure / procedure end time">
                          <input
                            type="time"
                            value={clinicalRecord.closureTime || ''}
                            onChange={(e) => setCR({ closureTime: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-sm"
                          />
                        </FormField>
                      </div>
                      <FormField label="Surgical procedure details">
                        <textarea
                          value={intraOperativeNotes}
                          onChange={(e) => setIntraOperativeNotes(e.target.value)}
                          rows={8}
                          placeholder="Findings, techniques, instruments, intra-operative events…"
                          className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-sm resize-none"
                        />
                        <p className="mt-1 text-[10px] text-[var(--text-tertiary)]">
                          {countWords(intraOperativeNotes)} word{countWords(intraOperativeNotes) !== 1 ? 's' : ''}
                        </p>
                      </FormField>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <FormField label="Instrument / swab / needle counts">
                          <select
                            value={clinicalRecord.instrumentCountsStatus || ''}
                            onChange={(e) => setCR({ instrumentCountsStatus: e.target.value, instrumentCountsCorrect: e.target.value === 'correct' })}
                            className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-sm"
                          >
                            <option value="">Select count status</option>
                            <option value="correct">Counts correct</option>
                            <option value="not_applicable">Not applicable to this procedure</option>
                            <option value="discrepancy">Discrepancy — must be resolved before completion</option>
                          </select>
                        </FormField>
                        <FormField label="Count exception / reconciliation notes" hint="Required when counts are not applicable">
                          <input
                            value={clinicalRecord.instrumentCountNotes || ''}
                            onChange={(e) => setCR({ instrumentCountNotes: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-sm"
                          />
                        </FormField>
                      </div>
                      <FormField label="Specimens / pathology requests">
                        <textarea
                          value={clinicalRecord.specimens || ''}
                          onChange={(e) => setCR({ specimens: e.target.value })}
                          rows={2}
                          className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-sm"
                        />
                      </FormField>
                      <TickBox
                        checked={clinicalRecord.specimenLabelled === true}
                        onChange={(v) => setCR({ specimenLabelled: v })}
                        label="Specimen correctly labelled, if applicable"
                      />
                    </div>
                  </SectionCard>

                  {/* Hospital-specific protocol fields */}
                  <SectionCard
                    icon={<Info className="w-4 h-4 text-[var(--icon-purple-text)]" />}
                    title="Hospital-specific theatre protocol"
                    action={
                      <button
                        type="button"
                        onClick={() => setCR({
                          customProtocolFields: [...(Array.isArray(clinicalRecord.customProtocolFields) ? clinicalRecord.customProtocolFields : []), {
                            id: `protocol-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                            label: '', type: 'note', required: false, value: '',
                          }],
                        })}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] hover:opacity-90 hover:text-white transition-all"
                      >
                        <Plus className="w-3 h-3" /> Add field
                      </button>
                    }
                  >
                    <div className="p-4 space-y-3">
                      <p className="text-xs text-[var(--text-secondary)]">
                        Add local protocol items not covered above (antibiotic prophylaxis, positioning, airway checks, implant details, equipment checks, specialty notes). These additions are saved with this procedure.
                      </p>
                      {(!Array.isArray(clinicalRecord.customProtocolFields) || clinicalRecord.customProtocolFields.length === 0) ? (
                        <p className="rounded-lg bg-[var(--bg-main)] p-3 text-xs text-[var(--text-secondary)]">
                          No additional local protocol fields have been added to this entry.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {clinicalRecord.customProtocolFields.map((field: any, index: number) => (
                            <div key={field.id || index} className="rounded-lg border border-[var(--border-color)] p-3 space-y-3">
                              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                <div className="md:col-span-5">
                                  <FormField label="Field label / protocol requirement">
                                    <input
                                      value={field.label || ''}
                                      maxLength={160}
                                      required
                                      onChange={(e) => setCR({
                                        customProtocolFields: clinicalRecord.customProtocolFields.map((item: any, i: number) => i === index ? { ...item, label: e.target.value } : item),
                                      })}
                                      placeholder="e.g. Antibiotic prophylaxis"
                                      className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-sm"
                                    />
                                  </FormField>
                                </div>
                                <div className="md:col-span-3">
                                  <FormField label="Response type">
                                    <select
                                      value={field.type || 'note'}
                                      onChange={(e) => setCR({
                                        customProtocolFields: clinicalRecord.customProtocolFields.map((item: any, i: number) => i === index ? { ...item, type: e.target.value, value: e.target.value === 'checkbox' ? false : '' } : item),
                                      })}
                                      className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-sm"
                                    >
                                      <option value="note">Long note</option>
                                      <option value="text">Short text</option>
                                      <option value="number">Number</option>
                                      <option value="date">Date</option>
                                      <option value="time">Time</option>
                                      <option value="checkbox">Yes / checked</option>
                                    </select>
                                  </FormField>
                                </div>
                                <div className="md:col-span-3 flex items-end">
                                  <label className="flex items-center gap-2 pb-2 text-xs text-[var(--text-primary)]">
                                    <input
                                      type="checkbox"
                                      checked={field.required === true}
                                      onChange={(e) => setCR({
                                        customProtocolFields: clinicalRecord.customProtocolFields.map((item: any, i: number) => i === index ? { ...item, required: e.target.checked } : item),
                                      })}
                                    />
                                    Required to complete
                                  </label>
                                </div>
                                <div className="md:col-span-1 flex items-end justify-end">
                                  <button
                                    type="button"
                                    aria-label="Remove protocol field"
                                    onClick={() => setCR({
                                      customProtocolFields: clinicalRecord.customProtocolFields.filter((_: any, i: number) => i !== index),
                                    })}
                                    className="p-2 rounded-lg text-[var(--icon-red-text)] hover:bg-[var(--icon-red-bg)]"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              </div>
                              {field.type === 'checkbox' ? (
                                <TickBox
                                  checked={field.value === true}
                                  onChange={(v) => setCR({
                                    customProtocolFields: clinicalRecord.customProtocolFields.map((item: any, i: number) => i === index ? { ...item, value: v } : item),
                                  })}
                                  label={field.label || 'Confirm this protocol item'}
                                />
                              ) : field.type === 'note' ? (
                                <textarea
                                  value={String(field.value ?? '')}
                                  rows={3}
                                  maxLength={10000}
                                  onChange={(e) => setCR({
                                    customProtocolFields: clinicalRecord.customProtocolFields.map((item: any, i: number) => i === index ? { ...item, value: e.target.value } : item),
                                  })}
                                  placeholder="Document the hospital-specific requirement, finding or action…"
                                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-sm"
                                />
                              ) : (
                                <input
                                  type={['text', 'number', 'date', 'time'].includes(field.type) ? field.type : 'text'}
                                  value={String(field.value ?? '')}
                                  maxLength={field.type === 'text' ? 1000 : undefined}
                                  onChange={(e) => setCR({
                                    customProtocolFields: clinicalRecord.customProtocolFields.map((item: any, i: number) => i === index ? { ...item, value: e.target.value } : item),
                                  })}
                                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-sm"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="text-[10px] text-[var(--text-secondary)]">
                        Local protocol fields supplement, and do not replace, mandatory safety checks or your hospital's approved theatre policy.
                      </p>
                    </div>
                  </SectionCard>
                  </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB: MINOR PROCEDURE DOCUMENTATION MODAL ─────── */}
              {procedureDocumentationUnlocked && !isTheatreRequiredProcedure(selectedProcedure) && (
                <SectionCard
                  icon={<ClipboardList className="w-4 h-4 text-[var(--icon-purple-text)]" />}
                  title="Minor procedure documentation"
                >
                  <div className="space-y-4 p-4">
                    <p className="text-xs text-[var(--text-secondary)]">Documenting: <strong className="text-[var(--text-primary)]">{selectedProcedure.name}</strong></p>
                      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] p-3 text-xs text-[var(--text-secondary)]">
                        This procedure is documented using a short clinical record. Theatre safety, anaesthesia and operative forms are not required for this workflow.
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <FormField label="Indication / reason">
                          <input value={minorProcedureRecord.indication} onChange={(e) => setMinorProcedureRecord((v) => ({ ...v, indication: e.target.value }))} className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-sm" />
                        </FormField>
                        <FormField label="Site / location">
                          <input value={minorProcedureRecord.site} onChange={(e) => setMinorProcedureRecord((v) => ({ ...v, site: e.target.value }))} className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-sm" />
                        </FormField>
                        <FormField label="Anaesthesia / analgesia">
                          <select value={minorProcedureRecord.anaesthesia} onChange={(e) => setMinorProcedureRecord((v) => ({ ...v, anaesthesia: e.target.value }))} className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-sm">
                            <option value="none">None</option><option value="local">Local</option><option value="topical">Topical</option><option value="regional">Regional</option><option value="sedation">Sedation</option>
                          </select>
                        </FormField>
                        <FormField label="Outcome">
                          <select value={minorProcedureRecord.outcome} onChange={(e) => setMinorProcedureRecord((v) => ({ ...v, outcome: e.target.value }))} className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-sm">
                            <option value="successful">Completed successfully</option><option value="successful_minor">Completed with minor complications</option><option value="unsuccessful">Unsuccessful</option><option value="aborted">Aborted</option>
                          </select>
                        </FormField>
                      </div>
                      <FormField label="Findings">
                        <textarea rows={2} value={minorProcedureRecord.findings} onChange={(e) => setMinorProcedureRecord((v) => ({ ...v, findings: e.target.value }))} className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-sm" />
                      </FormField>
                      <FormField label="Procedure performed *">
                        <textarea rows={4} value={minorProcedureRecord.procedureDetails} onChange={(e) => setMinorProcedureRecord((v) => ({ ...v, procedureDetails: e.target.value }))} placeholder="Describe the technique, key steps and materials used…" className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-sm" />
                      </FormField>
                      <FormField label="Complications / events">
                        <textarea rows={2} value={minorProcedureRecord.complications} onChange={(e) => setMinorProcedureRecord((v) => ({ ...v, complications: e.target.value }))} className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-sm" />
                      </FormField>
                      <FormField label="Aftercare / advice / follow-up">
                        <textarea rows={3} value={minorProcedureRecord.aftercare} onChange={(e) => setMinorProcedureRecord((v) => ({ ...v, aftercare: e.target.value }))} className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-sm" />
                      </FormField>
                      <p className="text-[11px] text-[var(--text-tertiary)]">On save, the system records the authenticated user and exact save time in the procedure audit log.</p>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-[var(--border-color)] pt-3">
                      <span className="text-[11px] text-[var(--text-tertiary)]">
                        {autosaveStatus === 'saving' ? 'Saving draft…' : autosaveStatus === 'saved' ? 'Draft saved automatically' : autosaveStatus === 'error' ? 'Auto-save failed — check connection' : 'Changes save automatically'}
                      </span>
                      <button type="button" disabled={isSubmitting} onClick={handleSubmitMinorProcedure} className="rounded-lg bg-[var(--icon-purple-text)] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{isSubmitting ? 'Saving…' : selectedProcedure.status === 'completed' ? 'Save changes' : 'Complete procedure'}</button>
                    </div>
                </SectionCard>
              )}

              {/* ── TAB: NARRATIVE NOTES ─────────────────────────── */}
              {procedureDocumentationUnlocked && (
                <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Complications */}
                  <SectionCard
                    icon={<AlertTriangle className="w-4 h-4 text-[var(--icon-red-text)]" />}
                    title="Complications"
                  >
                    <div className="p-4 space-y-3">
                      <TickBox
                        checked={hasComplications}
                        onChange={setHasComplications}
                        label="Complications were encountered"
                      />
                      {hasComplications && (
                        <FormField label="Describe complications and management">
                          <textarea
                            value={complications}
                            onChange={(e) => setComplications(e.target.value)}
                            rows={6}
                            placeholder="Describe complications and how they were managed…"
                            className="w-full px-3 py-2 rounded-lg border border-[var(--icon-red-text)]/40 bg-[var(--bg-main)] text-sm resize-none focus:ring-2 focus:ring-[var(--icon-red-text)]/30 focus:border-[var(--icon-red-text)]"
                          />
                        </FormField>
                      )}
                    </div>
                  </SectionCard>

                  {/* Post-op notes */}
                  <SectionCard
                    icon={<Heart className="w-4 h-4 text-[var(--icon-purple-text)]" />}
                    title="Post-operative notes"
                  >
                    <div className="p-4">
                      <FormField label="Recovery & post-op care">
                        <textarea
                          value={postOperativeNotes}
                          onChange={(e) => setPostOperativeNotes(e.target.value)}
                          rows={8}
                          placeholder="Recovery status, immediate post-op care, discharge instructions…"
                          className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-sm resize-none"
                        />
                        <p className="mt-1 text-[10px] text-[var(--text-tertiary)]">
                          {countWords(postOperativeNotes)} word{countWords(postOperativeNotes) !== 1 ? 's' : ''}
                        </p>
                      </FormField>
                    </div>
                  </SectionCard>

                  {/* Outcome */}
                  <SectionCard
                    icon={<CheckCircle className="w-4 h-4 text-[var(--icon-green-text)]" />}
                    title="Procedure outcome"
                  >
                    <div className="p-4">
                      <FormField label="Select outcome">
                        <select
                          value={outcome}
                          onChange={(e) => setOutcome(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-sm"
                        >
                          <option value="">Select outcome…</option>
                          {outcomeOptions.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </FormField>
                    </div>
                  </SectionCard>
                </div>
              )}

              {/* ── TAB: HANDOVER ─────────────────────────────────── */}
              {procedureDocumentationUnlocked && (
                <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <SectionCard
                    icon={<Save className="w-4 h-4 text-[var(--icon-purple-text)]" />}
                    title="Post-operative handover"
                  >
                    <div className="p-4 space-y-3">
                      <FormField label="Post-operative destination" hint="Recovery, ward, HDU/ICU, referral…">
                        <textarea
                          value={clinicalRecord.postOpDestination || ''}
                          onChange={(e) => setCR({ postOpDestination: e.target.value })}
                          rows={2}
                          className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-sm"
                        />
                      </FormField>
                      <FormField label="Post-operative plan / monitoring / analgesia / escalation criteria">
                        <textarea
                          value={clinicalRecord.postOpPlan || ''}
                          onChange={(e) => setCR({ postOpPlan: e.target.value })}
                          rows={4}
                          className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-sm"
                        />
                      </FormField>
                    </div>
                  </SectionCard>

                  <SectionCard
                    icon={<FileText className="w-4 h-4 text-[var(--icon-purple-text)]" />}
                    title="Clinical handover notes"
                  >
                    <div className="p-4">
                      <FormField label="Key information handed over to the receiving recovery or ward team">
                        <textarea
                          value={clinicalRecord.handoverNotes || ''}
                          onChange={(e) => setCR({ handoverNotes: e.target.value })}
                          rows={10}
                          placeholder="Critical findings, equipment in situ, drains, catheters, blood products, next-review plan…"
                          className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-sm resize-none"
                        />
                      </FormField>
                    </div>
                  </SectionCard>
                </div>
              )}

              </fieldset>
              )}

              {/* ── COMPLETION BAR + ACTION BUTTONS ────────────── */}
              {procedureDocumentationUnlocked && (
              <div className="border-t border-[var(--border-color)] bg-[var(--bg-main)] p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-[var(--text-primary)]">
                        {filledCount} of 6
                      </span>
                      <span className="text-xs text-[var(--text-secondary)]">sections completed</span>
                    </div>
                    <div className="w-24 h-1.5 bg-[var(--bg-card)] rounded-full overflow-hidden border border-[var(--border-color)]">
                      <div
                        className="h-full bg-[var(--icon-purple-text)] rounded-full transition-all"
                        style={{ width: `${(filledCount / 6) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {(selectedProcedure.status === 'scheduled' || selectedProcedure.status === 'in_progress' || canEditCompletedProcedure) && (canUpdateProcedure || canEditCompletedProcedure) && (
                      <>
                        {(selectedProcedure.status === 'scheduled' || selectedProcedure.status === 'in_progress') && (
                          <button
                            onClick={() => handleCancelProcedure(selectedProcedure.id)}
                            className="px-4 py-2 border border-[var(--icon-red-text)]/40 text-[var(--icon-red-text)] rounded-lg hover:bg-[var(--icon-red-bg)] text-sm font-medium transition-all"
                          >
                            Cancel Procedure
                          </button>
                        )}
                        {(selectedProcedure.status === 'in_progress' || canEditCompletedProcedure) && (
                          <>
                            <span className="self-center text-[11px] text-[var(--text-tertiary)]">
                              {autosaveStatus === 'saving' ? 'Saving draft…' : autosaveStatus === 'saved' ? 'Draft saved automatically' : autosaveStatus === 'error' ? 'Auto-save failed — check connection' : 'Changes save automatically'}
                            </span>
                            <button
                              onClick={() => handleSubmitTheatreNotes(false)}
                              disabled={isSubmitting}
                              className="px-4 py-2 border border-[var(--icon-purple-text)]/40 text-[var(--icon-purple-text)] rounded-lg hover:bg-[var(--icon-purple-bg)] disabled:opacity-50 text-sm font-semibold transition-all"
                            >
                              {selectedProcedure.status === 'completed' ? 'Save changes' : 'Save now'}
                            </button>
                            {selectedProcedure.status === 'in_progress' && (
                              <button
                                onClick={() => handleSubmitTheatreNotes(true)}
                                disabled={isSubmitting}
                                className="px-4 py-2 bg-[var(--icon-purple-text)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 text-sm font-semibold transition-all flex items-center gap-2"
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
                      </>
                    )}
                    {selectedProcedure.status === 'completed' && (
                      <span className="text-xs text-[var(--text-tertiary)] italic">
                        {isEditingCompletedProcedure ? 'Editing completed record — save changes when finished.' : 'This procedure is completed. Use Edit entries to make an amendment.'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              )}
            </div>
          ) : procedures.length > 0 ? (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-12 text-center">
              <ClipboardList className="w-10 h-10 text-[var(--text-tertiary)] mx-auto mb-3 opacity-40" />
              <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">No Procedure Selected</h3>
              <p className="text-sm text-[var(--text-secondary)]">
                Pick a procedure tile above to record the operation notes.
              </p>
            </div>
          ) : null}
        </>
      )}

      {/* ── SCHEDULE MODAL (unchanged behaviour) ───────────────── */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowScheduleModal(false)} />
          <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
            <div className="relative bg-[var(--bg-card)] rounded-2xl shadow-2xl max-w-md w-full border border-[var(--border-color)] overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--border-color)] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-[var(--icon-purple-bg)] flex items-center justify-center">
                    <Scissors className="w-4 h-4 text-[var(--icon-purple-text)]" />
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
                    Procedure <span className="text-[var(--icon-red-text)]">*</span>
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
                      className="w-full pl-9 pr-9 py-2.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-purple-text)] focus:border-[var(--icon-purple-text)]"
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
                    Scheduled Date & Time <span className="text-[var(--icon-red-text)]">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-purple-text)] focus:border-[var(--icon-purple-text)]"
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
                    className="w-full px-3 py-2.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] resize-none focus:ring-2 focus:ring-[var(--icon-purple-text)] focus:border-[var(--icon-purple-text)]"
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
                  className="px-4 py-2 bg-[var(--icon-purple-text)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 text-sm font-semibold transition-all"
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