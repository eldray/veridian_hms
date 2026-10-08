// src/pages/ScansEntry.tsx — Scans Results Entry (Enhanced UI/UX)
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAttendanceStore } from '../store/attendanceStore';
import { usePatientStore } from '../store/patientStore';
import { useAuthStore } from '../store/authStore';
import { useMedicalServicesStore } from '../store/medicalServicesStore';
import { useToast } from '../store/toastStore';
import { useHospitalStore } from '../store/hospitalStore';
import { PatientAttendanceSelector } from '../components/vitals/PatientAttendanceSelector';
import { ScanModal } from '../components/medical-entries/modals/ScanModal';
import { ScanResultForm } from '../components/scans/ScanResultForm';
import { generatePDF, openPrintWindow } from '../utils/pdfGenerator';
import { getPatientName } from '../utils/patient';
import SendDocumentModal from '../components/SendDocumentModal';
import {
  ChevronLeft, Scan, RefreshCw, AlertCircle, Plus, Clock,
  CheckCircle, Activity, User, Calendar, X, Edit, Trash2,
  Eye, Printer, Image as ImageIcon, MessageSquare,
  Play, FileText, Hash, Phone, AlertTriangle, Info,
  ChevronDown, ChevronRight, Stethoscope, Sparkles,
  Maximize2, Minimize2,
} from 'lucide-react';

const getEntityId = (entity: { id?: string; _id?: string } | null): string | undefined =>
  entity?.id || entity?._id;

const getScanDisplayName = (scan: any): string =>
  scan?.name || scan?.scanType || scan?.ServiceCatalog?.name || 'Unknown Scan';

// ── Priority pill ──
const PriorityPill: React.FC<{ priority: string }> = ({ priority }) => {
  const map: Record<string, string> = {
    stat:   'bg-red-100 text-red-700 border-red-200',
    urgent: 'bg-orange-100 text-orange-700 border-orange-200',
    routine:'bg-blue-100 text-blue-700 border-blue-200',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${map[priority] || map.routine}`}>
      {priority === 'stat' && <AlertTriangle className="w-2.5 h-2.5" />}
      {priority?.toUpperCase() || 'ROUTINE'}
    </span>
  );
};

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
  const imageCount = scan.imageUrls?.length || 0;

  return (
    <div className="border-b border-[var(--border-color)] last:border-b-0">
      {/* Header row */}
      <div
        className={`px-4 py-3 flex items-center gap-3 transition-colors cursor-pointer ${
          expanded ? 'bg-indigo-50/40' : 'bg-[var(--bg-card)] hover:bg-indigo-50/30'
        }`}
        onClick={() => setExpanded(v => !v)}
      >
        <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
          <CheckCircle className="w-4 h-4 text-green-600" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm text-[var(--text-primary)] truncate">
              {getScanDisplayName(scan)}
            </h4>
            <span className="inline-flex items-center gap-1 text-[10px] text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0">
              Completed
            </span>
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
                <span className="inline-flex items-center gap-1 text-indigo-600 font-medium">
                  <ImageIcon className="w-2.5 h-2.5" />
                  {imageCount} image{imageCount !== 1 ? 's' : ''}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-0.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <button
            onClick={onPrint}
            disabled={printing}
            className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-indigo-600 hover:bg-indigo-50 transition-all disabled:opacity-40"
            title="Print"
          >
            <Printer className={`w-3.5 h-3.5 ${printing ? 'animate-pulse' : ''}`} />
          </button>
          <button
            onClick={onSend}
            className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-green-600 hover:bg-green-50 transition-all"
            title="Send"
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </button>
          {canEdit && (
            <button
              onClick={onEdit}
              className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-blue-600 hover:bg-blue-50 transition-all"
              title="Edit"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>
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
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 mb-1.5 flex items-center gap-1.5">
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
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 border border-indigo-200 hover:border-indigo-400 rounded-lg px-2.5 py-1.5 bg-[var(--bg-card)] transition-all"
                  >
                    <ImageIcon className="w-3 h-3" />
                    <span className="font-medium">Image {idx + 1}</span>
                    <Maximize2 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
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

  const loadData = async () => {
    try {
      setRefreshing(true);
      await Promise.all([loadPatients(), getScanTemplates(false)]);

      const statePatient = location.state?.patient;
      const patientId = statePatient?.id || id;
      const initialAttendanceId = location.state?.attendanceId;

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
    if (!window.confirm('Delete this scan request?')) return;
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
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Loading Scans Data…</h2>
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
            onClick={() => navigate('/dashboard/scans')}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all"
          >
            Back to Scans Queue
          </button>
        </div>
      </div>
    );
  }

  const patientFullName = getPatientName(patient);
  const totalScans = scansList.length;

  return (
    <div className="space-y-5 p-4 sm:p-6">
      {/* ── HEADER ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard/scans')}
            className="p-2 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-card)] transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-sm shadow-indigo-500/20">
            <Scan className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-[var(--text-primary)]">Scans Management</h1>
            <p className="text-xs text-[var(--text-secondary)] truncate">
              {patientFullName} · {totalScans} scan{totalScans !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowScanModal(true)}
            disabled={!canAddEntries}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all text-sm font-semibold disabled:opacity-50 shadow-sm shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Request Scan</span>
            <span className="sm:hidden">New</span>
          </button>
          <button
            onClick={handlePrintAll}
            disabled={completedScans.length === 0 || printingId === 'all'}
            className="flex items-center gap-1.5 px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all disabled:opacity-50 text-sm font-medium"
            title="Print all completed scans"
          >
            <Printer className={`w-4 h-4 ${printingId === 'all' ? 'animate-pulse' : ''}`} />
            <span className="hidden sm:inline">Print All</span>
            {completedScans.length > 0 && (
              <span className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--bg-main)] font-bold">
                {completedScans.length}
              </span>
            )}
          </button>
          <button
            onClick={() => { setSendResultScan(null); setShowSendResult(true); }}
            disabled={completedScans.length === 0}
            className="p-2 rounded-lg border border-green-200 text-green-700 hover:bg-green-50 transition-all disabled:opacity-50"
            title="Send all results"
          >
            <MessageSquare className="w-4 h-4" />
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
        patients={[patient]}
        attendances={allAttendances}
        selectedPatientId={selectedPatientId}
        selectedAttendanceId={selectedAttendanceId}
        onPatientSelect={(patientId) => {
          setSelectedPatientId(patientId);
          setAllAttendances(attendances.filter(a => a.patientId === patientId));
          setSelectedAttendanceId('');
          setAttendance(null);
          setSelectedScan(null);
        }}
        onAttendanceSelect={handleAttendanceChange}
        onClearSelection={handleClearSelection}
      />

      {!selectedAttendanceId && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-10 text-center shadow-sm">
          <div className="w-16 h-16 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-yellow-600" />
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">No Attendance Selected</h3>
          <p className="text-sm text-[var(--text-secondary)] max-w-sm mx-auto">
            Select an attendance from the dropdown above to manage scans for this patient.
          </p>
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      {selectedAttendanceId && attendance && (
        <>
          {/* Patient info bar */}
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden shadow-sm">
            <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-50 border border-indigo-200 flex items-center justify-center shadow-sm">
                  <User className="w-5 h-5 text-indigo-600" />
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
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                  attendance.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                  attendance.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' :
                  'bg-gray-50 text-gray-700 border-gray-200'
                }`}>
                  {attendance.status?.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
          </div>

          {/* Status warning */}
          {!canUpdateScan && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-yellow-800 font-medium">
                  Read-only view
                </p>
                <p className="text-xs text-yellow-700 mt-0.5">
                  This visit is <strong>{attendance.status}</strong>. Scans can be viewed but not processed.
                </p>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { count: requestedScans.length, label: 'Pending', color: 'text-yellow-600', bg: 'bg-yellow-100', Icon: Clock },
              { count: inProgressScans.length, label: 'In Progress', color: 'text-purple-600', bg: 'bg-purple-100', Icon: Activity },
              { count: completedScans.length, label: 'Completed', color: 'text-green-600', bg: 'bg-green-100', Icon: CheckCircle },
            ].map(s => {
              const Icon = s.Icon;
              return (
                <div key={s.label} className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center`}>
                      <Icon className={`w-4.5 h-4.5 ${s.color}`} />
                    </div>
                  </div>
                  <p className={`text-2xl font-bold ${s.color} leading-tight`}>{s.count}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">{s.label}</p>
                </div>
              );
            })}
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
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                    canEdit={!!canUpdateScan}
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
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-semibold transition-all shadow-sm shadow-indigo-500/20"
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