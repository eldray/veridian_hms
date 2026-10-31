// src/pages/ScansEntry.tsx — Scans Results Entry (Enhanced UI/UX)
import React, { useState, useEffect, useMemo } from 'react';
import { confirmDialog } from '../context/ConfirmDialog';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAttendanceStore } from '../store/attendanceStore';
import { usePatientStore } from '../store/patientStore';
import { useAuthStore } from '../store/authStore';
import { useMedicalServicesStore } from '../store/medicalServicesStore';
import { useToast } from '../store/toastStore';
import { useHospitalStore } from '../store/hospitalStore';
import { PatientAttendanceSelector } from '../components/vitals/PatientAttendanceSelector';
import { QueuedVisits, type QueuedVisit } from '../components/worklist/QueuedVisits';
import { ScanModal } from '../components/medical-entries/modals/ScanModal';
import { getScansWorklist } from '../api';
import { ScanResultForm } from '../components/scans/ScanResultForm';
import { generatePDF, openPrintWindow } from '../utils/pdfGenerator';
import { getPatientName } from '../utils/patient';
import { pickVisit } from '../utils/visitSelection';
import SendDocumentModal from '../components/SendDocumentModal';
import {
  Scan, RefreshCw, AlertCircle, Plus, Clock,
  CheckCircle, Activity, User, Calendar, X, Edit, Trash2,
  Printer, Image as ImageIcon, MessageSquare,
  Play, FileText, Hash, Phone, AlertTriangle, Info,
  ChevronDown, ChevronRight, Stethoscope, Sparkles,
  Maximize2,
} from 'lucide-react';
import {
  Badge, Button, Card, PageHeader, StatCard,
  TH, TH_ROW, TD, TD_MUTED, TR,
  statusTone, humanStatus, cn,
  type Accent,
} from '../components/ui';

const getScanDisplayName = (scan: any): string =>
  scan?.name || scan?.scanType || scan?.ServiceCatalog?.name || 'Unknown Scan';

const OUTSTANDING_SCAN_STATUSES = new Set(['requested', 'in_progress']);

/** A visit is "the one to open" when it still owes this department a scan. */
const hasOutstandingScanWork = (visit: any): boolean =>
  (visit?.Scan || []).some((scan: any) => OUTSTANDING_SCAN_STATUSES.has(String(scan?.status)));

// ── Priority pill ──
const PRIORITY_TONES: Record<string, Accent> = {
  stat: 'red',
  urgent: 'orange',
  routine: 'cyan',
};
const PriorityPill: React.FC<{ priority: string }> = ({ priority }) => (
  <Badge tone={PRIORITY_TONES[priority] ?? 'cyan'}>
    {priority === 'stat' && <AlertTriangle className="w-2.5 h-2.5" />}
    {priority?.toUpperCase() || 'ROUTINE'}
  </Badge>
);

// ── Result card ──
const ScanResultDisplay: React.FC<{
  scan: any;
  printing: boolean;
  onPrint: () => void;
  onSend: () => void;
  onEdit: () => void;
  canEdit: boolean;
}> = ({ scan, printing, onPrint, onSend, onEdit, canEdit }) => {
  const [expanded, setExpanded] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const imageCount = scan.imageUrls?.length || 0;

  useEffect(() => {
    if (!previewImage) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreviewImage(null);
    };
    window.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [previewImage]);

  return (
    <div className="border-b border-[var(--border-color)] last:border-b-0">
      {/* Header row */}
      <div
        className={`px-4 py-3 flex items-center gap-3 transition-colors cursor-pointer ${
          expanded ? 'bg-[var(--bg-main)]' : 'bg-[var(--bg-card)] hover:bg-[var(--bg-main)]'
        }`}
        onClick={() => setExpanded(v => !v)}
      >
        <div className="w-9 h-9 rounded-lg bg-[var(--icon-green-bg)] flex items-center justify-center flex-shrink-0">
          <CheckCircle className="w-4 h-4 text-[var(--icon-green-text)]" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm text-[var(--text-primary)] truncate">
              {getScanDisplayName(scan)}
            </h4>
            <Badge tone="green" className="flex-shrink-0">Completed</Badge>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)] mt-0.5 flex-wrap">
            {scan.bodyPart && (
              <span className="inline-flex items-center gap-1">
                <Stethoscope className="w-2.5 h-2.5" />
                {scan.bodyPart}
              </span>
            )}
            {scan.bodyPart && <span className="opacity-40">·</span>}
            <span className="inline-flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              {scan.completedAt ? new Date(scan.completedAt).toLocaleString() : '—'}
            </span>
            {imageCount > 0 && (
              <>
                <span className="opacity-40">·</span>
                <span className="inline-flex items-center gap-1 text-[var(--icon-indigo-text)] font-medium">
                  <ImageIcon className="w-2.5 h-2.5" />
                  {imageCount} image{imageCount !== 1 ? 's' : ''}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-0.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <Button variant="ghost" size="sm" iconOnly icon={Printer} onClick={onPrint} loading={printing} aria-label="Print" />
          <Button variant="ghost" size="sm" iconOnly icon={MessageSquare} onClick={onSend} aria-label="Send" />
          {canEdit && (
            <Button variant="ghost" size="sm" iconOnly icon={Edit} onClick={onEdit} aria-label="Edit" />
          )}
          <button
            onClick={() => setExpanded(v => !v)}
            className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)] transition-all"
            title={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-2 bg-[var(--bg-main)]/40 border-t border-[var(--border-color)] space-y-3">
          {scan.findings && (
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3 h-3" /> Findings
              </p>
              <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
                {scan.findings}
              </p>
            </div>
          )}
          {scan.impression && (
            <div className="bg-[var(--icon-indigo-bg)] border border-[var(--border-color)] rounded-lg p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--icon-indigo-text)] mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" /> Impression
              </p>
              <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
                {scan.impression}
              </p>
            </div>
          )}
          {scan.result && typeof scan.result === 'string' && (
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5 flex items-center gap-1.5">
                <Info className="w-3 h-3" /> Notes
              </p>
              <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
                {scan.result}
              </p>
            </div>
          )}
          {imageCount > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-2 flex items-center gap-1.5">
                <ImageIcon className="w-3 h-3" /> Images ({imageCount})
              </p>
              <div className="flex flex-wrap gap-2">
                {scan.imageUrls.map((url: string, idx: number) => (
                  <Button
                    key={idx}
                    variant="secondary"
                    size="xs"
                    icon={ImageIcon}
                    onClick={() => setPreviewImage(url)}
                    className="group"
                  >
                    Image {idx + 1}
                    <Maximize2 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Button>
                ))}
              </div>
            </div>
          )}
          {!scan.findings && !scan.impression && !scan.result && imageCount === 0 && (
            <div className="text-center py-4">
              <p className="text-xs text-[var(--text-tertiary)] italic">No result details recorded</p>
            </div>
          )}
        </div>
      )}

      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Scan image preview"
          onClick={() => setPreviewImage(null)}
        >
          <Button
            type="button"
            variant="secondary"
            iconOnly
            icon={X}
            onClick={() => setPreviewImage(null)}
            aria-label="Close image preview"
            autoFocus
            className="absolute right-4 top-4"
          />
          <img
            src={previewImage}
            alt="Scan"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};


// ── Section wrapper for scan groups ──
const ScanSection: React.FC<{
  title: string;
  count: number;
  icon: React.ElementType;
  accent: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}> = ({ title, count, icon: Icon, accent, children, actions }) => (
  <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden shadow-sm">
    <div className="bg-[var(--bg-main)] px-5 py-3 border-b border-[var(--border-color)] flex items-center justify-between gap-3">
      <h3 className="font-semibold text-sm text-[var(--text-primary)] flex items-center gap-2">
        <div className={`w-6 h-6 rounded-md flex items-center justify-center ${accent}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        {title}
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-color)]">
          {count}
        </span>
      </h3>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
    {children}
  </div>
);

export default function ScansEntry() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { success, error: toastError } = useToast();
  const { hospital } = useHospitalStore();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedAttendanceId, setSelectedAttendanceId] = useState<string>('');
  const [showScanModal, setShowScanModal] = useState(false);
  const [showSendResult, setShowSendResult] = useState(false);
  const [sendResultScan, setSendResultScan] = useState<any>(null);
  const [selectedScan, setSelectedScan] = useState<any>(null);
  const [showResultForm, setShowResultForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [printingId, setPrintingId] = useState<string | null>(null);

  const {
    attendances, currentAttendance, getAttendance, getAttendances,
    updateScanStatus, removeScan, canAddMedicalEntries, calculateBill,
  } = useAttendanceStore();
  const { patients, loadPatients, fetchPatient } = usePatientStore();
  const { user } = useAuthStore();
  const { scanTemplates, getScanTemplates } = useMedicalServicesStore();

  const [patient, setPatient] = useState<any>(null);
  const [attendance, setAttendance] = useState<any>(null);
  const [allAttendances, setAllAttendances] = useState<any[]>([]);
  const [queueRows, setQueueRows] = useState<QueuedVisit[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);

  // Direct entry has no patient yet, and sonographers cannot search the patient
  // directory, so the screen offers the same queue the waiting list shows instead.
  const loadQueue = async () => {
    setQueueLoading(true);
    try {
      const response: any = await getScansWorklist();
      const rows: any[] = response?.data?.data || [];
      setQueueRows(rows.map((row) => ({
        attendanceId: row.attendanceId,
        patientId: row.patientId,
        name: row.patient?.name || 'Unknown patient',
        folderNumber: row.patient?.folderNumber,
        age: row.patient?.age,
        gender: row.patient?.gender,
        attendanceNumber: row.attendanceNumber,
        visitDate: row.attendanceDateTime,
        detail: [
          `${row.scanCount ?? 0} scan${row.scanCount === 1 ? '' : 's'} to report`,
          row.inProgressCount ? `${row.inProgressCount} in progress` : null,
          row.requestedCount ? `${row.requestedCount} requested` : null,
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
    navigate(`/dashboard/scans/${row.patientId}`, {
      state: {
        patient: {
          id: row.patientId,
          name: row.name,
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
      // A sonographer has no read access to the patient directory, and this page is
      // reached from the scans worklist, so the register is optional here.
      await Promise.all([loadPatients().catch(() => undefined), getScanTemplates(false)]);

      const statePatient = location.state?.patient;
      const patientId = statePatient?.id || id;
      const initialAttendanceId = location.state?.attendanceId;

      if (!patientId) await loadQueue();

      if (patientId) {
        const patientAttendances = await getAttendances({ patientId });
        setAllAttendances(patientAttendances);

        let foundPatient = patients.find(p => p.id === patientId) || statePatient || null;
        if (!foundPatient || !foundPatient.surname) {
          try { foundPatient = await fetchPatient(patientId); } catch { /* keep summary */ }
        }
        if (foundPatient) {
          setPatient(foundPatient);
          setSelectedPatientId(patientId);
        }

        // A queued visit can be older than the patient's recent-visit window, so the
        // attendance named by the queue row is fetched on its own if the list missed it.
        let target: any = initialAttendanceId
          ? patientAttendances.find(a => a.id === initialAttendanceId)
          : undefined;
        if (!target && initialAttendanceId) {
          target = await getAttendance(initialAttendanceId).catch(() => null);
          if (target && !patientAttendances.some(a => a.id === target.id)) {
            setAllAttendances([target, ...patientAttendances]);
          }
        }
        target = target || pickVisit(patientAttendances, hasOutstandingScanWork);
        if (target) {
          setSelectedAttendanceId(target.id);
          // Without directory access the only patient record available is the one
          // carried by the visit, and the screen still needs it to draw the header.
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

  useEffect(() => { loadData(); }, [id]);

  useEffect(() => {
    if (selectedAttendanceId && selectedAttendanceId !== 'undefined' && selectedAttendanceId !== 'null') {
      getAttendance(selectedAttendanceId);
    }
  }, [selectedAttendanceId, getAttendance]);

  useEffect(() => {
    if (currentAttendance) setAttendance(currentAttendance);
  }, [currentAttendance]);

  const handleAttendanceChange = async (attendanceId: string) => {
    setSelectedAttendanceId(attendanceId);
    setSelectedScan(null);
    setShowResultForm(false);
    await getAttendance(attendanceId);
  };

  const handleClearSelection = () => {
    setSelectedAttendanceId('');
    setAttendance(null);
    setSelectedScan(null);
    setShowResultForm(false);
  };

  const canAddEntries = attendance ? canAddMedicalEntries(attendance) : false;
  const canUpdateScan = attendance && ['pending', 'admitted'].includes(attendance.status);

  const scansList = useMemo(() => {
    if (!currentAttendance?.Scan) return [];
    return currentAttendance.Scan.map((scan: any) => ({
      ...scan,
      id: scan.id,
      name: scan.scanType || scan.ServiceCatalog?.name || scan.ScanTemplate?.name || 'Unknown Scan',
      scanType: scan.scanType || scan.ServiceCatalog?.name,
      status: scan.status,
      priority: scan.priority || 'routine',
      requestedAt: scan.requestedAt,
      completedAt: scan.completedAt,
      findings: scan.findings,
      impression: scan.impression,
      result: scan.result,
      bodyPart: scan.bodyPart,
      notes: scan.notes,
      imageUrls: scan.imageUrls || [],
    }));
  }, [currentAttendance]);

  const requestedScans = scansList.filter(s => s.status === 'requested');
  const inProgressScans = scansList.filter(s => s.status === 'in_progress');
  const completedScans = scansList.filter(s => s.status === 'completed');

  const handleMarkInProgress = async (scanId: string) => {
    if (!selectedAttendanceId) return;
    try {
      await updateScanStatus(selectedAttendanceId, scanId, {
        status: 'in_progress', performedById: user?.id || '',
      });
      success('Status updated', 'Scan in progress');
      await getAttendance(selectedAttendanceId);
    } catch (error: any) {
      toastError('Update failed', error.message);
    }
  };

  const handleSaveResult = async (scanId: string, resultData: any) => {
    if (!selectedAttendanceId) return;
    setIsSubmitting(true);
    try {
      await updateScanStatus(selectedAttendanceId, scanId, {
        status: 'completed',
        ...resultData,
        performedById: user?.id || '',
        completedAt: new Date().toISOString(),
      });
      success('Result saved', 'Scan completed');
      await getAttendance(selectedAttendanceId);
      setSelectedScan(null);
      setShowResultForm(false);
      await calculateBill(selectedAttendanceId);
    } catch (error: any) {
      toastError('Save failed', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditResult = (scan: any) => {
    setSelectedScan(scan);
    setShowResultForm(true);
  };

  const handleDeleteScan = async (scanId: string) => {
    if (!(await confirmDialog({ title: 'Delete scan request', message: 'Delete this scan request?', confirmText: 'Delete' }))) return;
    try {
      await removeScan(selectedAttendanceId!, scanId);
      success('Deleted', 'Scan removed');
      await getAttendance(selectedAttendanceId!);
      await calculateBill(selectedAttendanceId!);
    } catch (error: any) {
      toastError('Delete failed', error.message);
    }
  };

  const calculateAge = (dateOfBirth: string): number => {
    if (!dateOfBirth) return 0;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  // ── PRINT: single scan ──
  const handlePrintScan = async (scan: any) => {
    if (!patient || !attendance) { toastError('Error', 'Missing patient or attendance info'); return; }
    setPrintingId(scan.id);
    try {
      const scanData = {
        scans: [{
          name: getScanDisplayName(scan),
          bodyPart: scan.bodyPart,
          findings: scan.findings,
          impression: scan.impression,
          result: scan.result,
          imageUrls: scan.imageUrls || [],
          completedAt: scan.completedAt,
          notes: scan.notes || '',
          priority: scan.priority || 'routine',
          scanType: scan.scanType,
          ScanTemplate: scan.ScanTemplate,
          ServiceCatalog: scan.ServiceCatalog,
        }],
        patient: { ...patient, fullName: getPatientName(patient) },
        attendance,
        performedByName: user?.fullName || 'Radiographer',
      };
      const html = generatePDF('scanReport', scanData, hospital);
      openPrintWindow(html, `Scan_${getScanDisplayName(scan).replace(/\s+/g, '_')}_${patient.folderNumber}`);
      success('Print ready', 'Scan report opened for printing');
    } catch (err) {
      console.error('Print failed:', err);
      toastError('Print failed', 'Could not generate scan report');
    } finally {
      setPrintingId(null);
    }
  };

  // ── PRINT: all completed scans ──
  const handlePrintAll = async () => {
    if (!patient || !attendance) { toastError('Error', 'Missing patient or attendance info'); return; }
    if (completedScans.length === 0) { toastError('Nothing to print', 'No completed scans'); return; }
    setPrintingId('all');
    try {
      const scanData = {
        scans: completedScans.map(scan => ({
          name: getScanDisplayName(scan),
          bodyPart: scan.bodyPart,
          findings: scan.findings,
          impression: scan.impression,
          result: scan.result,
          imageUrls: scan.imageUrls || [],
          completedAt: scan.completedAt,
          notes: scan.notes || '',
          priority: scan.priority || 'routine',
          scanType: scan.scanType,
          ScanTemplate: scan.ScanTemplate,
          ServiceCatalog: scan.ServiceCatalog,
        })),
        patient: { ...patient, fullName: getPatientName(patient) },
        attendance,
        performedByName: user?.fullName || 'Radiographer',
      };
      const html = generatePDF('scanReport', scanData, hospital);
      openPrintWindow(html, `Scans_${patient.folderNumber}`);
      success('Print ready', 'All scan reports opened for printing');
    } catch (err) {
      console.error('Print all failed:', err);
      toastError('Print failed', 'Could not generate scan reports');
    } finally {
      setPrintingId(null);
    }
  };

  const handlePrescribeSuccess = async () => {
    setShowScanModal(false);
    await loadData();
    if (selectedAttendanceId) {
      await getAttendance(selectedAttendanceId);
      await calculateBill(selectedAttendanceId);
    }
    success('Scan requested', 'Scan added successfully');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
        <div className="text-center bg-[var(--bg-card)] p-8 rounded-xl border border-[var(--border-color)]">
          <div className="w-12 h-12 border-4 border-[var(--icon-purple-text)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Loading Scans Data…</h2>
        </div>
      </div>
    );
  }

  // Direct entry starts without a patient until one is picked in the selector;
  // only a patient named in the route that failed to load is an error.
  if (!patient && (id || (location.state as any)?.patient)) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
        <div className="text-center bg-[var(--bg-card)] p-8 rounded-xl border border-[var(--border-color)]">
          <AlertCircle className="w-12 h-12 text-[var(--icon-red-text)] mx-auto mb-3" />
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">Patient Not Found</h2>
          <p className="text-[var(--text-secondary)]">The patient you're looking for doesn't exist.</p>
          <Button
            variant="primary"
            className="mt-4"
            onClick={() => (location.key === 'default' ? navigate('/dashboard/scans') : navigate(-1))}
          >
            Back
          </Button>
        </div>
      </div>
    );
  }

  const patientFullName = getPatientName(patient);
  const totalScans = scansList.length;

  return (
    <div className="space-y-5 p-4 sm:p-6">
      {/* ── HEADER ── */}
      <PageHeader
        title="Scans Management"
        meta={`${patientFullName} · ${totalScans} scan${totalScans !== 1 ? 's' : ''}`}
        icon={Scan}
        accent="purple"
        onBack={() => (location.key === 'default' ? navigate('/dashboard/scans') : navigate(-1))}
        actions={(
          <>
            <Button
              variant="ghost"
              iconOnly
              icon={RefreshCw}
              loading={refreshing}
              disabled={refreshing}
              onClick={loadData}
              aria-label="Refresh"
            />
            <Button
              variant="secondary"
              icon={Printer}
              loading={printingId === 'all'}
              disabled={completedScans.length === 0 || printingId === 'all'}
              onClick={handlePrintAll}
              title="Print all completed scans"
            >
              <span className="hidden sm:inline">Print All</span>
              {completedScans.length > 0 && (
                <span className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--bg-main)] font-bold">
                  {completedScans.length}
                </span>
              )}
            </Button>
            <Button
              variant="soft"
              accent="green"
              iconOnly
              icon={MessageSquare}
              disabled={completedScans.length === 0}
              onClick={() => { setSendResultScan(null); setShowSendResult(true); }}
              aria-label="Send all results"
            />
            <Button
              variant="primary"
              icon={Plus}
              disabled={!canAddEntries}
              onClick={() => setShowScanModal(true)}
            >
              <span className="hidden sm:inline">Request Scan</span>
              <span className="sm:hidden">New</span>
            </Button>
          </>
        )}
      />

      {/* ── SEND MODAL ── */}
      <SendDocumentModal
        open={showSendResult}
        onClose={() => { setShowSendResult(false); setSendResultScan(null); }}
        patient={patient}
        documentType="scan-result"
        entityId={sendResultScan?.id || selectedAttendanceId}
      />

      {/* ── PATIENT / ATTENDANCE SELECTOR ── */}
      <PatientAttendanceSelector
        patients={patient ? [patient, ...patients.filter(p => p.id !== patient.id)] : patients}
        attendances={allAttendances}
        selectedPatientId={selectedPatientId}
        selectedAttendanceId={selectedAttendanceId}
        onPatientSelect={async (patientId) => {
          setSelectedPatientId(patientId);
          setSelectedAttendanceId('');
          setAttendance(null);
          setSelectedScan(null);
          // Resolve the patient before the visits: the picker auto-selects an open visit as
          // soon as they arrive, and the screen renders that visit's patient details.
          let resolved: any = null;
          try { resolved = await fetchPatient(patientId); } catch { /* fall back to the visit's own patient */ }
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
          // Open the visit that owes the department a scan, not merely the most recent one.
          const best = pickVisit(visits, hasOutstandingScanWork);
          if (best) setSelectedAttendanceId(best.id);
        }}
        onAttendanceSelect={handleAttendanceChange}
        onClearSelection={handleClearSelection}
      />

      {!selectedAttendanceId && (
        <QueuedVisits
          title="Scans queue"
          description="Scans waiting for a result — pick a visit to start"
          icon={Scan}
          accent="purple"
          rows={queueRows}
          loading={queueLoading}
          emptyMessage="No scans are waiting. Open the scans waiting list to review completed work."
          onOpen={openQueuedVisit}
          onRefresh={loadData}
          onViewAll={() => navigate('/dashboard/scans')}
        />
      )}

      {/* ── MAIN CONTENT ── */}
      {selectedAttendanceId && attendance && patient && (
        <>
          {/* Patient info bar */}
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden shadow-sm">
            <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[var(--icon-indigo-bg)] border border-[var(--border-color)] flex items-center justify-center shadow-sm">
                  <User className="w-5 h-5 text-[var(--icon-indigo-text)]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-[var(--text-primary)] text-base">{patientFullName}</h3>
                    <span className="text-xs text-[var(--text-secondary)]">
                      {patient.gender === 'male' ? '♂' : patient.gender === 'female' ? '♀' : '·'} ·{' '}
                      {patient.age || calculateAge(patient.dateOfBirth)}y
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs mt-1">
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] bg-[var(--bg-main)] px-1.5 py-0.5 rounded border border-[var(--border-color)]">
                      <Hash className="w-2.5 h-2.5 text-[var(--text-tertiary)]" />
                      {patient.folderNumber}
                    </span>
                    {patient.contact && (
                      <span className="inline-flex items-center gap-1 text-[var(--text-secondary)]">
                        <Phone className="w-2.5 h-2.5" />
                        {patient.contact}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="bg-[var(--bg-main)] px-2.5 py-1 rounded-full border border-[var(--border-color)]">
                  <span className="text-xs font-mono text-[var(--text-secondary)]">
                    #{attendance.attendanceNumber || 'New Visit'}
                  </span>
                </div>
                <div className="bg-[var(--bg-main)] px-2.5 py-1 rounded-full border border-[var(--border-color)]">
                  <span className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(attendance.dateTime || attendance.createdAt || '').toLocaleDateString()}
                  </span>
                </div>
                <Badge tone={statusTone(attendance.status)} dot size="sm">
                  {humanStatus(attendance.status)}
                </Badge>
              </div>
            </div>
          </div>

          {/* Status warning */}
          {!canUpdateScan && (
            <div className="bg-[var(--icon-yellow-bg)] border border-[var(--border-color)] rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[var(--icon-yellow-text)] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-[var(--icon-yellow-text)] font-medium">
                  Read-only view
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  This visit is <strong>{attendance.status}</strong>. Scans can be viewed but not processed.
                </p>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Pending" value={requestedScans.length} icon={Clock} accent="yellow" />
            <StatCard label="In Progress" value={inProgressScans.length} icon={Activity} accent="purple" />
            <StatCard label="Completed" value={completedScans.length} icon={CheckCircle} accent="green" />
          </div>

          {/* Pending Scans */}
          {requestedScans.length > 0 && (
            <ScanSection
              title="Pending Scans"
              count={requestedScans.length}
              icon={Clock}
              accent="bg-yellow-100 text-yellow-600"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--bg-main)]/50 border-b border-[var(--border-color)]">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Scan Type</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Body Part</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Priority</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Requested</th>
                      <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {requestedScans.map((scan) => (
                      <tr key={scan.id} className="hover:bg-indigo-50/30 transition-colors group">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-sm text-[var(--text-primary)]">{scan.name}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                          {scan.bodyPart || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <PriorityPill priority={scan.priority} />
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                          {new Date(scan.requestedAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleMarkInProgress(scan.id)}
                              disabled={!canUpdateScan}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg text-xs font-semibold hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Play className="w-3 h-3" />
                              Start
                            </button>
                            {canUpdateScan && (
                              <button
                                onClick={() => handleDeleteScan(scan.id)}
                                className="p-1.5 text-[var(--text-tertiary)] hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                title="Delete scan request"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ScanSection>
          )}

          {/* In-Progress Scans */}
          {inProgressScans.length > 0 && (
            <ScanSection
              title="In Progress"
              count={inProgressScans.length}
              icon={Activity}
              accent="bg-purple-100 text-purple-600"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--bg-main)]/50 border-b border-[var(--border-color)]">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Scan Type</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Body Part</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Started</th>
                      <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {inProgressScans.map((scan) => (
                      <tr key={scan.id} className="hover:bg-purple-50/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-sm text-[var(--text-primary)]">{scan.name}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{scan.bodyPart || '—'}</td>
                        <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                          {scan.updatedAt ? new Date(scan.updatedAt).toLocaleString() : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleEditResult(scan)}
                            disabled={!canUpdateScan}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-semibold hover:bg-green-600 hover:text-white transition-all disabled:opacity-50"
                          >
                            <FileText className="w-3 h-3" />
                            Enter Result
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ScanSection>
          )}

          {/* Completed Scans */}
          {completedScans.length > 0 && (
            <ScanSection
              title="Completed Scans"
              count={completedScans.length}
              icon={CheckCircle}
              accent="bg-green-100 text-green-600"
              actions={
                <>
                  <button
                    onClick={handlePrintAll}
                    disabled={printingId === 'all'}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium border border-[var(--border-color)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-card)] hover:text-indigo-600 hover:border-indigo-300 transition-all disabled:opacity-50"
                  >
                    <Printer className={`w-3 h-3 ${printingId === 'all' ? 'animate-pulse' : ''}`} />
                    <span className="hidden sm:inline">Print All</span>
                  </button>
                  <button
                    onClick={() => { setSendResultScan(null); setShowSendResult(true); }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium border border-green-200 text-green-700 rounded-lg hover:bg-green-50 transition-all"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span className="hidden sm:inline">Send All</span>
                  </button>
                </>
              }
            >
              <div>
                {completedScans.map(scan => (
                  <ScanResultDisplay
                    key={scan.id}
                    scan={scan}
                    printing={printingId === scan.id}
                    onPrint={() => handlePrintScan(scan)}
                    onSend={() => { setSendResultScan(scan); setShowSendResult(true); }}
                    onEdit={() => handleEditResult(scan)}
                    canEdit={!!canUpdateScan && scan.status !== 'completed' && scan.status !== 'cancelled'}
                  />
                ))}
              </div>
            </ScanSection>
          )}

          {/* Empty state */}
          {scansList.length === 0 && (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-12 text-center shadow-sm">
              <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Scan className="w-8 h-8 text-indigo-400" />
              </div>
              <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">No Scans Yet</h3>
              <p className="text-sm text-[var(--text-secondary)] max-w-sm mx-auto mb-4">
                No scans have been requested for this visit.
              </p>
              {canAddEntries && (
                <button
                  onClick={() => setShowScanModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--icon-cyan-text)] text-white rounded-lg hover:opacity-90 text-sm font-semibold transition-all shadow-sm "
                >
                  <Plus className="w-4 h-4" />
                  Request First Scan
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* ── MODALS ── */}
      {selectedAttendanceId && (
        <ScanModal
          isOpen={showScanModal}
          onClose={() => setShowScanModal(false)}
          onSuccess={handlePrescribeSuccess}
          attendanceId={selectedAttendanceId}
          scans={scanTemplates}
          canAdd={canAddEntries}
          userId={user?.id}
          userName={user?.fullName}
        />
      )}

      {showResultForm && selectedScan && (
        <ScanResultForm
          scan={selectedScan}
          onSaveResult={handleSaveResult}
          onClose={() => { setShowResultForm(false); setSelectedScan(null); }}
          saving={isSubmitting}
        />
      )}
    </div>
  );
}