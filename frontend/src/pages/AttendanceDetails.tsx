// src/pages/AttendanceDetails.tsx - COMPLETE WITH MEDICAL ENTRIES, BILLING, AND VITALS DATA
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAttendanceStore } from '../store/attendanceStore';
import { usePatientStore } from '../store/patientStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import { useBillingStore } from '../store/billingStore';
import NewAttendanceModal from '../components/NewAttendanceModal';
import SendDocumentModal from '../components/SendDocumentModal';
import MedicalReportModal from '../components/MedicalReportModal';
import { VitalsHistory } from '../components/vitals/VitalsHistory';
import { getPatientName, getPatientFolderNumber, getAttendanceNumber } from '../utils/patient';
import { PatientAvatar } from '../components/patients/PatientAvatar';
import { PatientVisitHeader } from '../components/ui/PatientVisitHeader';
import { PageHeader } from '../components/ui';
import { getScanDisplayName, humanScanModality } from '../utils/scan';
import { canAccessPage } from '../config/access';
import { useHospitalStore } from '../store/hospitalStore';
import { generatePDF, openPrintWindow } from '../utils/pdfGenerator';
import { latestRecordedPayment, printThermalReceipt } from '../utils/receiptPrinter';
import { 
  ArrowLeft, Edit, FileText, Pill, FlaskConical, Scissors, DollarSign, 
  User, Calendar, Stethoscope, Activity, CreditCard, Shield, X,
  AlertCircle, Loader, Trash2, Plus, ChevronRight,
  Clock, MapPin, Phone, Mail, Clipboard, Heart, Thermometer, 
  Droplet, Ruler, Weight, Brain, Bone, Eye, Microscope, Scan,
  Syringe, Hospital, CheckCircle, XCircle, AlertTriangle, TrendingUp,
  Receipt, Printer, Download, Building2, Bed, Moon, Sun, History, RefreshCw,
  MessageSquare  
} from 'lucide-react';
import type { AttendanceStatus, AttendanceType, PaymentMode } from '../types';

/**
 * `GET /api/encounters/:id` answers with Prisma's relation names (`LabTest`, `Medication`,
 * `Scan`…), while the frontend `Attendance` type spells them camelCase. A screen that picks
 * one spelling silently shows an empty list for every visit that does have records, so read
 * whichever key the payload actually carries.
 */
const relationList = (attendance: any, keys: string[]): any[] => {
  for (const key of keys) {
    const value = attendance?.[key];
    if (Array.isArray(value)) return value;
  }
  return [];
};

// Helper function to format currency
// ✅ ROBUST: Handles strings, numbers, null, undefined, and invalid values
const formatCurrency = (amount: any): string => {
  // Handle null, undefined, empty string
  if (amount === null || amount === undefined || amount === '') {
    return '₵0.00';
  }
  
  // Convert to number if it's a string
  let numAmount: number;
  if (typeof amount === 'string') {
    numAmount = parseFloat(amount.replace(/[^0-9.-]/g, '')); // Remove currency symbols
  } else if (typeof amount === 'number') {
    numAmount = amount;
  } else {
    return '₵0.00';
  }
  
  // Check if it's a valid number
  if (isNaN(numAmount) || !isFinite(numAmount)) {
    return '₵0.00';
  }
  
  return `₵${numAmount.toFixed(2)}`;
};

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
  <div className="w-full overflow-x-auto"><table className="w-full min-w-[620px] text-sm">
    <thead className="sticky top-0 z-10 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
      <tr>
        {heads.map(h => (
          <th key={h} className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)] whitespace-nowrap">{h}</th>
        ))}
      </tr>
    </thead>
    <tbody className="divide-y divide-[var(--border-color)] [&>tr:hover]:bg-[var(--bg-main)] [&>tr]:transition-colors">{children}</tbody>
  </table></div>
);

const TdPrimary: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <td className={`px-3 py-2 text-[var(--text-primary)] font-medium ${className}`}>{children}</td>
);

const Td: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <td className={`px-3 py-2 text-[var(--text-secondary)] ${className}`}>{children}</td>
);

type ResultRow = { label: string; value: string; unit?: string; range?: string };

/**
 * A lab result is stored as JSON — `{ parameters: [{ name, value, unit, normalRange }], testName }`
 * — but older records hold free text and some templates answer as a flat object. Render all of
 * them as rows instead of handing the user a stringified object.
 */
const labResultRows = (result: any): { rows: ResultRow[]; note?: string } => {
  if (result === null || result === undefined) return { rows: [] };
  if (typeof result === 'string') return { rows: [], note: result };

  const toRow = (item: any, index: number): ResultRow => ({
    label: item?.name || item?.fieldName || item?.label || `Parameter ${index + 1}`,
    value: item?.value === undefined || item?.value === null || item?.value === '' ? '—' : String(item.value),
    unit: item?.unit || undefined,
    range: item?.normalRange || undefined,
  });

  if (Array.isArray(result?.parameters)) return { rows: result.parameters.map(toRow) };
  if (Array.isArray(result)) return { rows: result.map(toRow) };
  if (typeof result === 'object') {
    return {
      rows: Object.entries(result).map(([label, value]) => ({
        label,
        value: value && typeof value === 'object' ? JSON.stringify(value) : String(value ?? '—'),
      })),
    };
  }
  return { rows: [], note: String(result) };
};

// Read-only viewer for one lab or scan result. Everything it shows is already embedded in the
// encounter payload, so opening it never needs a diagnostic-specific endpoint.
const ResultDetailModal: React.FC<{
  kind: 'lab' | 'scan';
  record: any;
  onClose: () => void;
  onPrint: () => void;
}> = ({ kind, record, onClose, onPrint }) => {
  const [image, setImage] = useState<string | null>(null);
  const images: string[] = Array.isArray(record?.imageUrls) ? record.imageUrls : [];
  const title = record?.ServiceCatalog?.name
    || record?.LabTestTemplate?.name
    || record?.ScanTemplate?.name
    || record?.scanType
    || record?.name
    || (kind === 'lab' ? 'Lab test' : 'Scan');
  const when = record?.completedAt || record?.updatedAt || record?.requestedAt;
  const whenText = when && !Number.isNaN(new Date(when).getTime()) ? new Date(when).toLocaleString() : '—';
  const performer = record?.User_LabTest_performedByIdToUser?.fullName
    || record?.User_Scan_performedByIdToUser?.fullName
    || record?.performedBy?.fullName;
  const { rows, note } = kind === 'lab' ? labResultRows(record?.result) : { rows: [], note: undefined as string | undefined };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-card)] rounded-xl max-w-2xl w-full border border-[var(--border-color)] max-h-[85vh] flex flex-col">
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[var(--border-color)]">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {kind === 'lab'
                ? <FlaskConical className="w-5 h-5 shrink-0 text-[var(--icon-green-text)]" />
                : <Scan className="w-5 h-5 shrink-0 text-[var(--icon-purple-text)]" />}
              <h3 className="text-base font-bold text-[var(--text-primary)] truncate">{title}</h3>
              <StatusBadge status={record?.status || 'requested'} />
            </div>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              {whenText}{performer ? ` · Performed by ${performer}` : ''}{record?.turnaroundMinutes ? ` · ${record.turnaroundMinutes} min turnaround` : ''}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-[var(--bg-main)] text-[var(--text-secondary)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto">
          {kind === 'lab' && (
            rows.length > 0 ? (
              <div className="rounded-lg border border-[var(--border-color)] overflow-hidden">
                <Table heads={['Parameter', 'Result', 'Units', 'Normal range']}>
                  {rows.map((row, index) => (
                    <tr key={`${row.label}-${index}`}>
                      <TdPrimary>{row.label}</TdPrimary>
                      <Td className="font-semibold text-[var(--text-primary)]">{row.value}</Td>
                      <Td>{row.unit || '—'}</Td>
                      <Td>{row.range || '—'}</Td>
                    </tr>
                  ))}
                </Table>
              </div>
            ) : note ? (
              <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{note}</p>
            ) : (
              <p className="text-sm text-[var(--text-secondary)]">No result values were recorded for this test.</p>
            )
          )}

          {kind === 'lab' && (record?.units || record?.normalRange) && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              {record?.units && (
                <div className="rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)] p-2">
                  <span className="text-[var(--text-secondary)]">Units: </span>
                  <span className="font-semibold text-[var(--text-primary)]">{record.units}</span>
                </div>
              )}
              {record?.normalRange && (
                <div className="rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)] p-2">
                  <span className="text-[var(--text-secondary)]">Normal range: </span>
                  <span className="font-semibold text-[var(--text-primary)]">{record.normalRange}</span>
                </div>
              )}
            </div>
          )}

          {kind === 'lab' && record?.notes && (
            <div className="rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)] p-3">
              <p className="text-xs font-semibold text-[var(--text-secondary)] mb-1">Technician notes</p>
              <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{record.notes}</p>
            </div>
          )}

          {kind === 'scan' && (
            <>
              {record?.findings ? (
                <div className="rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)] p-3">
                  <p className="text-xs font-semibold text-[var(--text-secondary)] mb-1">Findings</p>
                  <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{record.findings}</p>
                </div>
              ) : <p className="text-sm text-[var(--text-secondary)]">No findings text was recorded for this study.</p>}

              {record?.impression && (
                <div className="rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)] p-3">
                  <p className="text-xs font-semibold text-[var(--text-secondary)] mb-1">Impression / conclusion</p>
                  <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{record.impression}</p>
                </div>
              )}

              {record?.result && (
                <div className="rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)] p-3">
                  <p className="text-xs font-semibold text-[var(--text-secondary)] mb-1">Additional notes</p>
                  <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{record.result}</p>
                </div>
              )}

              {record?.description && (
                <div className="rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)] p-3">
                  <p className="text-xs font-semibold text-[var(--text-secondary)] mb-1">Requested study</p>
                  <p className="text-sm text-[var(--text-primary)]">{record.description}{record.bodyPart ? ` · ${record.bodyPart}` : ''}</p>
                </div>
              )}

              {images.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[var(--text-secondary)] mb-2">Images ({images.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {images.map((url, index) => (
                      <button
                        key={`${url}-${index}`}
                        type="button"
                        onClick={() => setImage(url)}
                        className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-2.5 py-1.5 text-xs text-[var(--icon-purple-text)] hover:opacity-80"
                      >
                        Image {index + 1}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[var(--border-color)]">
          <button
            type="button"
            onClick={onPrint}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--icon-cyan-bg)] px-3 py-2 text-sm font-medium text-[var(--icon-cyan-text)] hover:opacity-80"
          >
            <Printer className="w-4 h-4" />
            {kind === 'lab' ? 'Print results' : 'Print report'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--border-color)]"
          >
            Close
          </button>
        </div>
      </div>

      {image && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-6" onClick={() => setImage(null)}>
          <img src={image} alt="Study image" className="max-h-full max-w-full rounded-lg" />
        </div>
      )}
    </div>
  );
};

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
    currentPatient,
    fetchPatient,
  } = usePatientStore();

  const { hasRole, user } = useAuthStore();
  const { bills, getBills, generateBillFromAttendance, isLoading: billsLoading } = useBillingStore();
  const { hospital } = useHospitalStore();

  // ── State ─────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'overview' | 'medications' | 'lab-tests' | 'scans' | 'procedures' | 'billing' | 'vitals' | 'clinical'>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [vitalsList, setVitalsList] = useState<any[]>([]);
  const [vitalsLoading, setVitalsLoading] = useState(false);
  const [syncingBilling, setSyncingBilling] = useState(false);
  const [resultViewer, setResultViewer] = useState<{ kind: 'lab' | 'scan'; record: any } | null>(null);
  const [receiptToSend, setReceiptToSend] = useState<any | null>(null);

  // A patient search on another screen must not blank this one: the visit record is what
  // the page is waiting for.
  const isLoading = attendanceLoading || billsLoading;

  // ── Load data ─────────────────────────────────
  const loadData = async () => {
    try {
      setRefreshing(true);
      if (!id) {
        toastError('Invalid URL', 'Attendance ID is missing.');
        return;
      }
      
      const tasks: Promise<any>[] = [getAttendance(id)];
      // Only care, records and finance roles may load the linked bill/payment history.
      if (hasRole(['admin', 'accounts', 'records', 'doctor', 'nurse', 'midwife'])) {
        tasks.push(getBills({ attendanceId: id }));
      }
      await Promise.all(tasks);
      
      // Vitals are part of the clinical record; operational desks must not request them.
      if (hasRole(['admin', 'doctor', 'nurse', 'midwife'])) await loadVitals(id);
      else setVitalsList([]);
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
    // Prisma's relation is named "Patient"; some API responses normalize it to "patient".
    // Prefer the embedded record because it now includes allergy and history details.
    // If a walk-in counter client was registered later, use the linked Patient
    // for both the current identity and folder number instead of the old counter name.
    const counterClient = attendance?.counterClient ?? attendance?.CounterClient;
    const registeredCounterPatient = counterClient?.Patient ?? counterClient?.patient;
    if (registeredCounterPatient?.id || registeredCounterPatient?.surname) return registeredCounterPatient;

    // Normal registered attendance relation (Prisma/API casing variants).
    const embeddedPatient = attendance?.patient ?? attendance?.Patient;
    if (embeddedPatient?.surname || embeddedPatient?.id) return embeddedPatient;

    // A genuinely unregistered counter ticket has no folder; keep its counter name.
    if (counterClient?.name) return counterClient;

    const pid = (typeof attendance.patientId === 'object'
      ? attendance.patientId.id
      : attendance.patientId) ||
      (typeof embeddedPatient === 'object' ? embeddedPatient.id : null);

    if (!pid) return null;
    return patients.find(p => p.id === pid)
      || (currentPatient?.id === pid ? currentPatient : null);
  };

  // Get patient for current attendance
  const patient = useMemo(() => {
    if (!currentAttendance) return null;
    return findPatient(currentAttendance);
  }, [currentAttendance, patients, currentPatient]);

  // A counter ticket is a visit for someone who is deliberately not in the register, so
  // this page labels them as a walk-in rather than a patient with a missing folder.
  const isCounterTicket = currentAttendance?.attendanceType === 'walk_in'
    || Boolean((currentAttendance as any)?.counterClientId);

  // The visit record embeds its patient, so this page does not download the register. If a
  // visit ever arrives without one, ask for that single patient record instead.
  const encounterPatientId = typeof currentAttendance?.patientId === 'object'
    ? currentAttendance?.patientId?.id
    : currentAttendance?.patientId;
  useEffect(() => {
    if (!encounterPatientId) return;
    const embedded = (currentAttendance as any)?.patient ?? (currentAttendance as any)?.Patient;
    if (embedded?.surname) return;
    if (currentPatient?.id === encounterPatientId) return;
    if (patients.some(p => p.id === encounterPatientId)) return;
    void fetchPatient(encounterPatientId).catch(() => undefined);
  }, [encounterPatientId, currentAttendance, currentPatient?.id, patients, fetchPatient]);

  // Get bills for this attendance
  const attendanceBills = useMemo(() => {
    if (!currentAttendance) return [];
    return bills.filter(b => b.attendanceId === currentAttendance.id);
  }, [bills, currentAttendance]);

  // Records the encounter payload embeds, read under whichever key spelling it uses.
  const encounterMedications = useMemo(() => relationList(currentAttendance, ['Medication', 'medications']), [currentAttendance]);
  const encounterLabTests = useMemo(() => relationList(currentAttendance, ['LabTest', 'labTests']), [currentAttendance]);
  const encounterScans = useMemo(() => relationList(currentAttendance, ['Scan', 'scans']), [currentAttendance]);
  const encounterProcedures = useMemo(() => relationList(currentAttendance, ['Procedure', 'procedures']), [currentAttendance]);
  const encounterDiagnoses = useMemo(() => relationList(currentAttendance, ['AttendanceDiagnosis', 'diagnoses']), [currentAttendance]);

  const latestBill = attendanceBills[0];
  const clinicalNotes = currentAttendance?.clinicalNotes && typeof currentAttendance.clinicalNotes === 'object' && !Array.isArray(currentAttendance.clinicalNotes)
    ? currentAttendance.clinicalNotes as Record<string, any>
    : {};

  // Choose the most recent observation by timestamp when available; preserve API order as fallback.
  const latestVitals = useMemo(() => {
    if (!vitalsList.length) return null;
    const getTimestamp = (vital: any) => {
      const value = vital?.recordedAt || vital?.createdAt || vital?.dateTime || vital?.updatedAt;
      if (!value) return Number.NaN;
      const timestamp = new Date(value).getTime();
      return Number.isFinite(timestamp) ? timestamp : Number.NaN;
    };
    const datedVitals = vitalsList.filter((vital: any) => Number.isFinite(getTimestamp(vital)));
    if (!datedVitals.length) return vitalsList[vitalsList.length - 1];
    return datedVitals.reduce((latest: any, vital: any) =>
      getTimestamp(vital) > getTimestamp(latest) ? vital : latest
    );
  }, [vitalsList]);

  // Derive a concise, read-only visit summary from the existing encounter payload.
  // Keep the summary tolerant of older records that may not contain every field.
  const visitDiagnoses = useMemo(() => {
    return encounterDiagnoses
      .map((item: any) => item?.diagnosis?.name || item?.diagnosisName || item?.name || item?.icdCode)
      .filter((name: unknown): name is string => typeof name === 'string' && name.trim().length > 0);
  }, [encounterDiagnoses]);

  const visitClinicalSummary = [
    clinicalNotes.historyPresentingComplaint,
    clinicalNotes.physicalExamination,
    clinicalNotes.assessment,
    clinicalNotes.plan,
    currentAttendance?.medicalNotes,
  ].filter((value: unknown): value is string => typeof value === 'string' && value.trim().length > 0);

  const visitDateValue = currentAttendance?.dateTime || currentAttendance?.createdAt || currentAttendance?.visitDate;
  const visitDateLabel = visitDateValue && !Number.isNaN(new Date(visitDateValue).getTime())
    ? new Date(visitDateValue).toLocaleString()
    : 'Date not recorded';

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

  const handleAddClinical = (type: 'diagnosis' | 'lab' | 'medication' | 'procedure' | 'scan') => {
    // Medical Entries owns every clinical add for a visit and opens straight on the requested
    // entry through ?entry=; there is no separate /attendance/:id/clinical/:type screen.
    navigate(`/dashboard/medical-entries/${id}?entry=${type}`);
  };

  const handleGoToVitals = () => {
    navigate(`/dashboard/vitals/${id}`);
  };

  const handleGoToMedicalEntries = () => {
    navigate(`/dashboard/medical-entries/${id}`);
  };

  // Those four screens are keyed on a patient folder. A counter ticket has none, and the
  // counter page does everything they do for a walk-in, so send it there instead of
  // handing a counter-customer id to a patient screen.
  const counterFallback = (): string | null =>
    isCounterTicket ? `/dashboard/counter/${id}` : null;

  const handleGoToBilling = () => {
    const fallback = counterFallback();
    if (fallback) { navigate(fallback); return; }
    if (patient) {
      navigate(`/dashboard/patients/${patient.id}/billing`);
    }
  };

  // Both result screens are keyed on the patient and take the visit through route state.
  const handleGoToLaboratory = () => {
    const fallback = counterFallback();
    if (fallback) { navigate(fallback); return; }
    if (patient) {
      navigate(`/dashboard/laboratory/${patient.id}`, { state: { patient, attendanceId: id } });
    }
  };

  const handleGoToScans = () => {
    const fallback = counterFallback();
    if (fallback) { navigate(fallback); return; }
    if (patient) {
      navigate(`/dashboard/scans/${patient.id}`, { state: { patient, attendanceId: id } });
    }
  };

  const handleNewEstimate = () => {
    const fallback = counterFallback();
    if (fallback) { navigate(fallback); return; }
    if (patient) {
      navigate('/dashboard/estimates/new', { state: { patient } });
    }
  };

  const printDocument = (build: () => string, title: string) => {
    try {
      openPrintWindow(build(), title);
      success('Print view opened', 'Use the browser print dialog to print or save the document.');
    } catch (err: any) {
      toastError('Print failed', err?.message || 'Could not build this document.');
    }
  };

  const printLabResults = (test: any) => {
    printDocument(
      () => generatePDF('labResults', { labTests: [test], patient: patient ?? (currentAttendance as any)?.patient, attendance: currentAttendance }, hospital),
      `Lab-Results-${test?.ServiceCatalog?.name || test?.LabTestTemplate?.name || test?.id?.slice(-6)}`
    );
  };

  const printScanReport = (scan: any) => {
    printDocument(
      () => generatePDF('scanReport', { scans: [scan], patient: patient ?? (currentAttendance as any)?.patient, attendance: currentAttendance }, hospital),
      `Scan-Report-${getScanDisplayName(scan) || scan?.id?.slice(-6)}`
    );
  };

  const printVisitSummary = () => {
    printDocument(
      () => generatePDF('visitSummary', { attendance: currentAttendance, patient }, hospital),
      `Visit-Summary-${(currentAttendance as any)?.attendanceNumber || ''}`
    );
  };

  const printReceiptA4 = (bill: any, selectedPayment?: any) => {
    const payment = selectedPayment || latestRecordedPayment(bill);
    if (!payment) {
      toastError('No payment recorded', 'A receipt can only be issued for a recorded, non-voided payment.');
      return;
    }
    printDocument(
      () => generatePDF('receipt', { bill, patient: (bill as any).Patient || patient, payment, receivedBy: user?.fullName }, hospital),
      `Receipt-${bill.billNumber}`
    );
  };

  const printBillStatement = (bill: any) => {
    printDocument(
      () => generatePDF('billStatement', { bill, patient: (bill as any).Patient || patient }, hospital),
      `Bill-Statement-${bill.billNumber}`
    );
  };

  const printReceipt = (bill: any, selectedPayment?: any) => {
    const payment = selectedPayment || latestRecordedPayment(bill);
    if (!payment) {
      toastError('No payment recorded', 'A receipt can only be issued for a recorded, non-voided payment.');
      return;
    }
    // The reprint must produce the same 80mm slip the pay flow printed, not the A4 invoice.
    try {
      printThermalReceipt({
        bill,
        patient: (bill as any).Patient || patient,
        payment,
        hospital,
        receivedBy: user?.fullName,
      });
      success('Print view opened', 'Use the browser print dialog to print or save the document.');
    } catch (err: any) {
      toastError('Print failed', err?.message || 'Could not build this receipt.');
    }
  };

  // Generate the first bill or synchronize newly completed billable items into the
  // existing attendance bill. The backend source keys prevent duplicate line items.
  const handleSyncAttendanceBilling = async () => {
    if (!id || syncingBilling) return;
    setSyncingBilling(true);
    try {
      await generateBillFromAttendance(id);
      await getBills({ attendanceId: id });
      success('Billing synchronized', 'The attendance bill has been refreshed from its billable clinical and ward records.');
    } catch (err: any) {
      toastError('Billing synchronization failed', err?.response?.data?.message || err?.message || 'Could not synchronize this attendance bill.');
    } finally {
      setSyncingBilling(false);
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
      
      return date.toLocaleDateString('en-GH', {
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
      return new Date(dateString).toLocaleDateString('en-GH', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Invalid Date';
    }
  };

  // Mirrors PUT /api/encounters/:id, which allows midwife as well as doctor and nurse.
  const canReadFullClinicalRecord = hasRole(['admin', 'doctor', 'nurse', 'midwife']);
  const canEdit = hasRole(['admin', 'doctor', 'nurse', 'midwife']);
  const canWriteReport = hasRole(['admin', 'doctor']);
  const [showMedicalReport, setShowMedicalReport] = useState(false);
  const canDelete = hasRole(['admin']);
  // Mirrors POST /api/bills/generate/:encounterId. Lab techs and sonographers may
  // open the visit but must not raise charges.
  const canSyncBilling = hasRole(['admin', 'accounts', 'records', 'doctor', 'nurse', 'midwife']);
  // Quoting from the visit hands the estimate form the patient in route state, which is
  // how a role that owns Estimates but cannot search the patient register attaches one.
  const canQuote = canAccessPage(user?.role, 'estimates');
  // Links to another screen are only offered when that screen's own matrix entry admits the
  // role; otherwise the click lands on Access Denied.
  const canEnterMedicalEntries = canAccessPage(user?.role, 'medical_entries');
  const canEnterVitals = canAccessPage(user?.role, 'vitals');
  const canOpenBilling = canAccessPage(user?.role, 'billing');
  const canEnterLaboratory = canAccessPage(user?.role, 'laboratory');
  const canEnterScans = canAccessPage(user?.role, 'scans');
  // Mirrors POST /api/documents/receipt/:billId — recording the receipt document, not just
  // printing what the page already shows.
  const canIssueReceiptDocument = hasRole(['admin', 'records', 'accounts']);
  // Medical Entries keeps taking orders while the visit is open, so the shortcuts here stop
  // at the same point (status gate from attendanceStore.canAddMedicalEntries).
  const visitIsOpen = currentAttendance?.status === 'pending' || currentAttendance?.status === 'admitted';
  // Every clinical order on a visit — diagnosis, lab test, scan, procedure, prescription — is
  // POST-guarded to admin + doctor in the API. Offering the shortcut to a nurse or midwife
  // would only lead them to a 403 on the save button.
  const canAddClinical = canEnterMedicalEntries && visitIsOpen && hasRole(['admin', 'doctor']);

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
    { id: 'clinical', label: 'Clinical', icon: Stethoscope, count: encounterDiagnoses.length + (currentAttendance?.medicalNotes ? 1 : 0) },
    { id: 'medications', label: 'Medications', icon: Pill, count: encounterMedications.length },
    { id: 'lab-tests', label: 'Lab Tests', icon: FlaskConical, count: encounterLabTests.length },
    { id: 'scans', label: 'Scans', icon: Scan, count: encounterScans.length },
    { id: 'procedures', label: 'Procedures', icon: Scissors, count: encounterProcedures.length },
    { id: 'vitals', label: 'Vitals', icon: Heart, count: vitalsList.length },
    { id: 'billing', label: 'Billing', icon: DollarSign, count: attendanceBills.length },
  ].filter(tab => canReadFullClinicalRecord || tab.id === 'overview' ||
    (tab.id === 'lab-tests' && hasRole(['lab_tech'])) ||
    (tab.id === 'scans' && hasRole(['sonographer'])) ||
    (tab.id === 'billing' && canOpenBilling) ||
    (tab.id === 'hiv-testing' && hasRole(['admin', 'doctor', 'nurse', 'midwife'])));

  // ── Loading State ─────────────────────────────
  if (isLoading && !refreshing) {
    return (
      <div className="space-y-4 p-4">
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
      <div className="space-y-4 p-4">
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
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:opacity-80 transition-all duration-200 font-semibold text-sm"
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
    <div className="space-y-4 p-4">
      <PageHeader
        title="Attendance Details"
        subtitle={`Record #${getAttendanceNumber(currentAttendance) || currentAttendance.id?.slice(-8)}`}
        meta={`${getPatientName(currentAttendance)} · Created ${formatShortDate(currentAttendance.dateTime || currentAttendance.createdAt)}`}
        icon={Calendar}
        accent="cyan"
        onBack={() => navigate('/dashboard/attendance')}
        actions={(
          <>
            {patient?.id && (
              <button onClick={() => navigate(`/dashboard/patients/${patient.id}`)} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-main)] text-sm font-medium">
                <User className="w-4 h-4" /> Back to Patient
              </button>
            )}
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
                className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:opacity-80 transition-colors shadow-sm text-sm font-semibold"
              >
                <Edit className="w-4 h-4" /> Edit Attendance
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => setDeleteConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] rounded-lg hover:opacity-80 transition-colors shadow-sm text-sm font-semibold"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            )}
          </>
        )}
      />

      {/* Use the shared patient/visit header used across clinical workspaces. Walk-in
          tickets keep their explicit counter-customer identity because they have no folder. */}
      {patient && !isCounterTicket && (
        <PatientVisitHeader
          patient={patient}
          attendance={currentAttendance}
          icon={Calendar}
          accent="cyan"
          fields={[
            { label: 'Visit Type', value: getAttendanceTypeLabel(currentAttendance.attendanceType) },
            { label: 'Payment Mode', value: getPaymentModeLabel(currentAttendance.paymentMode), tone: 'pill' },
          ]}
        />
      )}
      {patient && isCounterTicket && (
        <section aria-label="Walk-in customer and visit summary" className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3 sm:p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <PatientAvatar imageUrl={patient.imageUrl} name={getPatientFullName(patient)} size="md" className="rounded-lg bg-[var(--icon-orange-bg)]" fallbackClassName="text-[var(--icon-orange-text)]" />
            <div className="min-w-0 flex-1">
              <h2 className="break-words text-sm font-bold text-[var(--text-primary)]">{getPatientFullName(patient)} <span className="ml-1 text-[10px] font-semibold uppercase text-[var(--icon-orange-text)]">Walk-in</span></h2>
              <p className="text-xs text-[var(--text-secondary)]">Counter customer · Age {patient?.ageYears ?? 'not given'} · {patient?.gender || 'Gender not recorded'}</p>
            </div>
            <StatusBadge status={currentAttendance.status || 'pending'} />
          </div>
        </section>
      )}
      {patient && (
        <section aria-label="Attendance summary" className="grid grid-cols-2 gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3 sm:grid-cols-4">
          <div className="rounded-lg bg-[var(--bg-main)] p-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Diagnoses</p>
            <p className="mt-1 text-lg font-bold text-[var(--text-primary)]">{encounterDiagnoses.length}</p>
          </div>
          <div className="rounded-lg bg-[var(--bg-main)] p-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Medicines</p>
            <p className="mt-1 text-lg font-bold text-[var(--text-primary)]">{encounterMedications.length}</p>
          </div>
          <div className="rounded-lg bg-[var(--bg-main)] p-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Lab / scans</p>
            <p className="mt-1 text-lg font-bold text-[var(--text-primary)]">{encounterLabTests.length + encounterScans.length}</p>
          </div>
          <div className="rounded-lg bg-[var(--bg-main)] p-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Visit charges</p>
            <p className="mt-1 text-lg font-bold text-[var(--text-primary)]">{formatCurrency(currentAttendance.totalBill || 0)}</p>
          </div>
        </section>
      )}

      {/* Medication safety: show recorded allergies across every attendance tab.
          A counter customer has no allergy record, so the banner would only shout about
          a review that cannot exist. */}
      {patient && !isCounterTicket && canReadFullClinicalRecord && (
        <section
          role="alert"
          aria-label="Patient allergy information"
          className={`rounded-xl border p-4 ${
            Array.isArray(patient.allergies) && patient.allergies.length > 0
              ? 'border-[var(--icon-red-text)] bg-[var(--icon-red-bg)]'
              : 'border-[var(--icon-orange-text)] bg-[var(--icon-orange-bg)]'
          }`}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className={`mt-0.5 h-5 w-5 shrink-0 ${
              Array.isArray(patient.allergies) && patient.allergies.length > 0
                ? 'text-[var(--icon-red-text)]'
                : 'text-[var(--icon-orange-text)]'
            }`} />
            <div className="min-w-0 flex-1">
              <h2 className={`text-sm font-bold ${
                Array.isArray(patient.allergies) && patient.allergies.length > 0
                  ? 'text-[var(--icon-red-text)]'
                  : 'text-[var(--icon-orange-text)]'
              }`}>
                {Array.isArray(patient.allergies) && patient.allergies.length > 0
                  ? 'RECORDED ALLERGIES — CHECK BEFORE PRESCRIBING'
                  : 'ALLERGY STATUS NOT DOCUMENTED'}
              </h2>
              {Array.isArray(patient.allergies) && patient.allergies.length > 0 ? (
                <ul className="mt-2 space-y-1.5">
                  {patient.allergies.map((allergy: any) => (
                    <li key={allergy.id || `${allergy.allergen}-${allergy.reaction || ''}`} className="text-sm text-[var(--icon-red-text)]">
                      <span className="font-semibold">{allergy.allergen}</span>
                      {allergy.severity && <span> · {allergy.severity} severity</span>}
                      {allergy.reaction && <span> — Reaction: {allergy.reaction}</span>}
                      {allergy.notes && <span> ({allergy.notes})</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-sm text-[var(--icon-orange-text)]">
                  No allergy records were returned for this patient. Confirm allergy status directly with the patient or caregiver before prescribing or dispensing; do not assume this means “no known allergies.”
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Stats Banner */}
      <div className="bg-[var(--bg-card)] rounded-xl p-3 border border-[var(--border-color)]">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Attendance Summary
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Status: {currentAttendance.status 
                ? currentAttendance.status.charAt(0).toUpperCase() + currentAttendance.status.slice(1) 
                : 'N/A'} • Type: {currentAttendance.attendanceType 
                  ? getAttendanceTypeLabel(currentAttendance.attendanceType) 
                  : 'N/A'}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className="bg-[var(--icon-blue-bg)] px-2 py-1 rounded border border-[var(--border-color)] text-[var(--icon-blue-text)]">
              💊 Meds: {encounterMedications.length}
            </span>
            <span className="bg-[var(--icon-green-bg)] px-2 py-1 rounded border border-[var(--border-color)] text-[var(--icon-green-text)]">
              🧪 Labs: {encounterLabTests.length}
            </span>
            <span className="bg-[var(--icon-cyan-bg)] px-2 py-1 rounded border border-[var(--border-color)] text-[var(--icon-cyan-text)]">
              🩻 Scans: {encounterScans.length}
            </span>
            <span className="bg-[var(--icon-purple-bg)] px-2 py-1 rounded border border-[var(--border-color)] text-[var(--icon-purple-text)]">
              ✂️ Procs: {encounterProcedures.length}
            </span>
            <span className="bg-[var(--icon-orange-bg)] px-2 py-1 rounded border border-[var(--border-color)] text-[var(--icon-orange-text)] font-semibold">
              💰 {formatCurrency(currentAttendance.totalBill || 0)}
            </span>
            <span className="bg-[var(--icon-red-bg)] px-2 py-1 rounded border border-[var(--border-color)] text-[var(--icon-red-text)]">
              ❤️ Vitals: {vitalsList.length}
            </span>
          </div>
        </div>
      </div>

      {/* Compact quick actions: four columns keep the eight shortcuts to two rows on desktop. */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        {canEnterMedicalEntries && (
          <button
            onClick={handleGoToMedicalEntries}
            className="flex items-center justify-center gap-1.5 px-2 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-colors text-xs font-medium text-[var(--text-primary)]"
          >
            <Stethoscope className="w-3.5 h-3.5 shrink-0 text-[var(--icon-cyan-text)]" />
            Medical Entries
          </button>
        )}
        {canEnterVitals && (
          <button
            onClick={handleGoToVitals}
            className="flex items-center justify-center gap-1.5 px-2 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-colors text-xs font-medium text-[var(--text-primary)]"
          >
            <Heart className="w-3.5 h-3.5 shrink-0 text-[var(--icon-red-text)]" />
            Vitals
          </button>
        )}
        {canOpenBilling && (
          <button
            onClick={handleGoToBilling}
            className="flex items-center justify-center gap-1.5 px-2 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-colors text-xs font-medium text-[var(--text-primary)]"
          >
            <DollarSign className="w-3.5 h-3.5 shrink-0 text-[var(--icon-green-text)]" />
            Billing
          </button>
        )}
        {patient && (
          <button
            onClick={printVisitSummary}
            className="flex items-center justify-center gap-1.5 px-2 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-colors text-xs font-medium text-[var(--text-primary)]"
          >
            <Printer className="w-3.5 h-3.5 shrink-0 text-[var(--icon-cyan-text)]" />
            Visit summary
          </button>
        )}
        {canWriteReport && patient && (
          <button
            onClick={() => setShowMedicalReport(true)}
            className="flex items-center justify-center gap-1.5 px-2 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-colors text-xs font-medium text-[var(--text-primary)]"
          >
            <FileText className="w-3.5 h-3.5 shrink-0 text-[var(--icon-purple-text)]" />
            Medical report
          </button>
        )}
        {canQuote && (
          <button
            onClick={handleNewEstimate}
            className="flex items-center justify-center gap-1.5 px-2 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-colors text-xs font-medium text-[var(--text-primary)]"
          >
            <FileText className="w-3.5 h-3.5 shrink-0 text-[var(--icon-cyan-text)]" />
            Estimate
          </button>
        )}
        {/* The two screens that own result entry, so their staff reach it from the visit. */}
        {canEnterLaboratory && patient && (
          <button
            onClick={handleGoToLaboratory}
            className="flex items-center justify-center gap-1.5 px-2 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-colors text-xs font-medium text-[var(--text-primary)]"
          >
            <Microscope className="w-3.5 h-3.5 shrink-0 text-[var(--icon-green-text)]" />
            Lab worklist
          </button>
        )}
        {canEnterScans && patient && (
          <button
            onClick={handleGoToScans}
            className="flex items-center justify-center gap-1.5 px-2 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-colors text-xs font-medium text-[var(--text-primary)]"
          >
            <Scan className="w-3.5 h-3.5 shrink-0 text-[var(--icon-purple-text)]" />
            Scan worklist
          </button>
        )}
      </div>

      {/* Main Content Card */}
      <div className="bg-[var(--bg-card)] rounded-xl shadow-sm border border-[var(--border-color)] overflow-hidden">
        {/* Tabs Navigation */}
        <div className="border-b border-[var(--border-color)] p-3">
          <nav aria-label="Attendance detail sections" className="flex flex-nowrap gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap py-1.5 px-3 rounded-lg font-medium transition-all duration-200 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--icon-cyan-text)] ${
                    activeTab === tab.id
                      ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      activeTab === tab.id ? 'bg-[var(--bg-card)] text-[var(--icon-cyan-text)] border border-[var(--border-color)]' : 'bg-[var(--bg-main)] text-[var(--text-secondary)]'
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
        <div className="p-4">
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-3">
              {/* Visit Summary: one-screen clinical snapshot; source records remain unchanged. */}
              <section className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 sm:p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-[var(--icon-cyan-text)]" />
                      <h2 className="text-base font-bold text-[var(--text-primary)]">Visit Summary</h2>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">A quick overview of this attendance, its documented findings and quick links to the full records.</p>
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> {visitDateLabel}
                  </div>
                </div>

                <div className="grid grid-cols-2 xl:grid-cols-6 gap-3">
                  {[
                    { label: 'Diagnoses', value: visitDiagnoses.length, icon: Stethoscope, tab: 'clinical' as const },
                    { label: 'Medicines', value: encounterMedications.length, icon: Pill, tab: 'medications' as const },
                    { label: 'Lab tests', value: encounterLabTests.length, icon: FlaskConical, tab: 'lab-tests' as const },
                    { label: 'Scans', value: encounterScans.length, icon: Scan, tab: 'scans' as const },
                    { label: 'Procedures', value: encounterProcedures.length, icon: Scissors, tab: 'procedures' as const },
                    { label: 'Vitals recorded', value: vitalsList.length, icon: Heart, tab: 'vitals' as const },
                  ].map((item) => {
                    const SummaryIcon = item.icon;
                    return (
                      <button key={item.label} type="button" onClick={() => setActiveTab(item.tab)}
                        className="text-left rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] p-3 hover:border-[var(--icon-cyan-text)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--icon-cyan-text)]">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-[var(--text-secondary)]">{item.label}</span>
                          <SummaryIcon className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                        </div>
                        <p className="text-xl font-bold text-[var(--text-primary)] mt-1">{item.value}</p>
                        <span className="text-[10px] text-[var(--text-secondary)]">View details</span>
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div className="rounded-lg border border-[var(--border-color)] p-3">
                    <p className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Presenting complaint</p>
                    <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{currentAttendance?.complaints || 'No complaint recorded for this visit.'}</p>
                  </div>
                  <div className="rounded-lg border border-[var(--border-color)] p-3">
                    <p className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Recorded diagnoses</p>
                    {visitDiagnoses.length ? (
                      <ul className="space-y-1">
                        {visitDiagnoses.slice(0, 4).map((diagnosis, index) => (
                          <li key={diagnosis + index} className="text-sm text-[var(--text-primary)] flex gap-2">
                            <span className="text-[var(--icon-green-text)]">•</span><span>{diagnosis}</span>
                          </li>
                        ))}
                        {visitDiagnoses.length > 4 && <li className="text-xs text-[var(--text-secondary)]">+{visitDiagnoses.length - 4} more diagnoses</li>}
                      </ul>
                    ) : <p className="text-sm text-[var(--text-secondary)]">No diagnosis recorded yet.</p>}
                  </div>
                  <div className="rounded-lg border border-[var(--border-color)] p-3">
                    <p className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Clinical notes</p>
                    {visitClinicalSummary.length ? (
                      <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap line-clamp-5">{visitClinicalSummary.join('\n\n')}</p>
                    ) : <p className="text-sm text-[var(--text-secondary)]">No additional clinical notes recorded.</p>}
                    <button type="button" onClick={() => setActiveTab('clinical')} className="mt-2 text-xs font-semibold text-[var(--icon-cyan-text)] hover:underline">Open clinical record</button>
                  </div>
                  <div className="rounded-lg border border-[var(--border-color)] p-3">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <p className="text-xs font-semibold text-[var(--text-secondary)]">Latest observations</p>
                      {hasAbnormalVitals && <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--icon-yellow-text)]"><AlertTriangle className="w-3.5 h-3.5" /> Review</span>}
                    </div>
                    {latestVitals ? (
                      <div className="flex flex-wrap gap-2">
                        {[
                          ['BP', latestVitals.bloodPressure],
                          ['Pulse', latestVitals.pulse != null ? `${latestVitals.pulse} bpm` : ''],
                          ['Temp', latestVitals.temperature != null ? `${latestVitals.temperature} °C` : ''],
                          ['SpO₂', latestVitals.spo2 != null ? `${latestVitals.spo2}%` : ''],
                          ['Weight', latestVitals.weight != null ? `${latestVitals.weight} kg` : ''],
                        ].filter((entry) => entry[1] !== '' && entry[1] != null).map(([label, value]) => (
                          <span key={label} className="rounded-md bg-[var(--bg-main)] border border-[var(--border-color)] px-2 py-1 text-xs text-[var(--text-primary)]"><span className="text-[var(--text-secondary)]">{label}:</span> {value}</span>
                        ))}
                      </div>
                    ) : <p className="text-sm text-[var(--text-secondary)]">No observations recorded for this attendance.</p>}
                    <button type="button" onClick={() => setActiveTab('vitals')} className="mt-2 text-xs font-semibold text-[var(--icon-cyan-text)] hover:underline">View vitals history</button>
                  </div>
                </div>
              </section>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left Column - Patient Info & Medical Details */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Patient Information Card */}
                  {patient && (
                    <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
                      <div className="flex items-center gap-3 mb-4">
                        <PatientAvatar imageUrl={patient.imageUrl} name={getPatientFullName(patient)} size="md" className="rounded-lg bg-[var(--icon-cyan-bg)]" fallbackClassName="text-[var(--icon-cyan-text)]" />
                        <div>
                          <h3 className="text-lg font-bold text-[var(--text-primary)]">Patient Information</h3>
                          <p className="text-xs text-[var(--text-secondary)]">Demographic and contact details</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border-color)]">
                          <p className="text-xs text-[var(--text-secondary)] font-medium">Full Name</p>
                          <p className="font-bold text-[var(--text-primary)] text-sm">{getPatientFullName(patient)}</p>
                        </div>
                        <div className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border-color)]">
                          <p className="text-xs text-[var(--text-secondary)] font-medium">Folder Number</p>
                          <p className="font-bold text-[var(--text-primary)] text-sm">{getPatientFolderNumber(currentAttendance) || getPatientFolderNumber(patient) || 'N/A'}</p>
                        </div>
                        <div className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border-color)]">
                          <p className="text-xs text-[var(--text-secondary)] font-medium">Age & Gender</p>
                          <p className="font-bold text-[var(--text-primary)] text-sm">
                            {patient.age || 'N/A'} years • {patient.gender || 'N/A'}
                          </p>
                        </div>
                        <div className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border-color)]">
                          <p className="text-xs text-[var(--text-secondary)] font-medium">Contact</p>
                          <p className="font-bold text-[var(--text-primary)] text-sm">{patient.contact || 'N/A'}</p>
                        </div>
                        {patient.address && (
                          <div className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border-color)] md:col-span-2">
                            <p className="text-xs text-[var(--text-secondary)] font-medium">Address</p>
                            <p className="font-bold text-[var(--text-primary)] text-sm">{patient.address}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Medical Information */}
                  <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-[var(--icon-green-bg)] rounded-lg flex items-center justify-center">
                        <Heart className="w-5 h-5 text-[var(--icon-green-text)]" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-[var(--text-primary)]">Medical Information</h3>
                        <p className="text-xs text-[var(--text-secondary)]">Complaints and clinical notes</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="bg-[var(--bg-main)] rounded-lg p-4 border border-[var(--border-color)]">
                        <p className="text-xs text-[var(--text-secondary)] font-medium mb-2 flex items-center gap-2">
                          <Clipboard className="w-3 h-3" />
                          Chief Complaints
                        </p>
                        <p className="font-semibold text-[var(--text-primary)] text-sm">
                          {currentAttendance.complaints || 'No complaints recorded'}
                        </p>
                      </div>
                      {clinicalNotes.historyPresentingComplaint && (
                        <div className="bg-[var(--bg-main)] rounded-lg p-4 border border-[var(--border-color)]">
                          <p className="text-xs text-[var(--text-secondary)] font-medium mb-2 flex items-center gap-2">
                            <History className="w-3 h-3" />
                            History of Presenting Complaint
                          </p>
                          <p className="font-semibold text-[var(--text-primary)] text-sm">{clinicalNotes.historyPresentingComplaint}</p>
                        </div>
                      )}
                      {currentAttendance.medicalNotes && (
                        <div className="bg-[var(--bg-main)] rounded-lg p-4 border border-[var(--border-color)]">
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
                  {encounterDiagnoses.length > 0 && (
                    <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
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
                        {encounterDiagnoses.map((diagnosis: any, index: number) => (
                          <div key={diagnosis.id || index} className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border-color)]">
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
                                <span className="px-2 py-1 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] text-xs rounded-full font-semibold ml-2 border border-[var(--border-color)]">
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
                <div className="space-y-3">
                  {/* Attendance Status Card */}
                  <div className="bg-[var(--bg-main)] rounded-xl p-4 border border-[var(--border-color)]">
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
                  <div className="bg-[var(--bg-main)] rounded-xl p-4 border border-[var(--border-color)]">
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
                  <div className="bg-[var(--bg-main)] rounded-xl p-4 border border-[var(--border-color)]">
                    <div className="flex items-center gap-3 mb-3">
                      <Stethoscope className="w-5 h-5 text-[var(--icon-purple-text)]" />
                      <h3 className="text-md font-bold text-[var(--text-primary)]">Clinician</h3>
                    </div>
                    <div className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border-color)]">
                      <p className="font-semibold text-[var(--text-primary)] text-sm">
                        {getClinicianName(currentAttendance)}
                      </p>
                    </div>
                  </div>

                  {/* Latest Vitals */}
                  {latestVitals && (
                    <div className="bg-[var(--bg-main)] rounded-xl p-4 border border-[var(--border-color)]">
                      <div className="flex items-center gap-3 mb-3">
                        <Heart className="w-5 h-5 text-[var(--icon-red-text)]" />
                        <h3 className="text-md font-bold text-[var(--text-primary)]">Latest Vitals</h3>
                        {hasAbnormalVitals && (
                          <AlertTriangle className="w-4 h-4 text-[var(--icon-red-text)]" />
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {latestVitals.bloodPressure && (
                          <div className="bg-[var(--bg-card)] rounded-lg p-2 text-center">
                            <p className="text-xs text-[var(--text-secondary)]">BP</p>
                            <p className="font-bold text-sm">{latestVitals.bloodPressure} mmHg</p>
                          </div>
                        )}
                        {latestVitals.temperature && (
                          <div className="bg-[var(--bg-card)] rounded-lg p-2 text-center">
                            <p className="text-xs text-[var(--text-secondary)]">Temp</p>
                            <p className="font-bold text-sm">{latestVitals.temperature}°C</p>
                          </div>
                        )}
                        {latestVitals.pulse && (
                          <div className="bg-[var(--bg-card)] rounded-lg p-2 text-center">
                            <p className="text-xs text-[var(--text-secondary)]">Pulse</p>
                            <p className="font-bold text-sm">{latestVitals.pulse} bpm</p>
                          </div>
                        )}
                        {latestVitals.spo2 && (
                          <div className="bg-[var(--bg-card)] rounded-lg p-2 text-center">
                            <p className="text-xs text-[var(--text-secondary)]">SpO₂</p>
                            <p className="font-bold text-sm">{latestVitals.spo2}%</p>
                          </div>
                        )}
                      </div>
                      {canEnterVitals && (
                        <div className="mt-2 text-center">
                          <button onClick={handleGoToVitals} className="text-xs text-[var(--icon-cyan-text)] hover:underline">
                            View all vitals →
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Financial Summary */}
                  <div className="bg-[var(--bg-main)] rounded-xl p-4 border border-[var(--border-color)]">
                    <div className="flex items-center gap-3 mb-3">
                      <DollarSign className="w-5 h-5 text-[var(--icon-yellow-text)]" />
                      <h3 className="text-md font-bold text-[var(--text-primary)]">Financial Summary</h3>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center bg-[var(--bg-card)] rounded-lg p-2 border border-[var(--border-color)]">
                        <span className="text-sm text-[var(--text-secondary)]">Total Bill</span>
                        <span className="font-bold text-lg text-[var(--text-primary)]">
                          {formatCurrency(currentAttendance.totalBill || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center bg-[var(--bg-card)] rounded-lg p-2 border border-[var(--border-color)]">
                        <span className="text-sm text-[var(--text-secondary)]">Paid Amount</span>
                        <span className="font-bold text-lg text-[var(--icon-green-text)]">
                          {formatCurrency(currentAttendance.paidAmount || 0)}
                        </span>
                      </div>
                      {(currentAttendance.outstandingBalance || 0) > 0 && (
                        <div className="flex justify-between items-center bg-[var(--bg-main)] rounded-lg p-2 border border-[var(--border-color)]">
                          <span className="text-sm font-semibold text-[var(--icon-red-text)]">Outstanding</span>
                          <span className="font-bold text-[var(--icon-red-text)]">
                            {formatCurrency(currentAttendance.outstandingBalance || 0)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="bg-[var(--bg-main)] rounded-xl p-4 border border-[var(--border-color)]">
                    <h3 className="text-md font-bold text-[var(--text-primary)] mb-3">Clinical Summary</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-center bg-[var(--bg-card)] rounded-lg p-2 border border-[var(--border-color)]">
                        <Stethoscope className="w-4 h-4 text-[var(--icon-cyan-text)] mx-auto mb-1" />
                        <div className="font-bold text-[var(--text-primary)]">{encounterDiagnoses.length}</div>
                        <div className="text-xs text-[var(--text-secondary)]">Diagnoses</div>
                      </div>
                      <div className="text-center bg-[var(--bg-card)] rounded-lg p-2 border border-[var(--border-color)]">
                        <Pill className="w-4 h-4 text-[var(--icon-purple-text)] mx-auto mb-1" />
                        <div className="font-bold text-[var(--text-primary)]">{encounterMedications.length}</div>
                        <div className="text-xs text-[var(--text-secondary)]">Medications</div>
                      </div>
                      <div className="text-center bg-[var(--bg-card)] rounded-lg p-2 border border-[var(--border-color)]">
                        <FlaskConical className="w-4 h-4 text-[var(--icon-green-text)] mx-auto mb-1" />
                        <div className="font-bold text-[var(--text-primary)]">{encounterLabTests.length}</div>
                        <div className="text-xs text-[var(--text-secondary)]">Lab Tests</div>
                      </div>
                      <div className="text-center bg-[var(--bg-card)] rounded-lg p-2 border border-[var(--border-color)]">
                        <Scan className="w-4 h-4 text-[var(--icon-purple-text)] mx-auto mb-1" />
                        <div className="font-bold text-[var(--text-primary)]">{encounterScans.length}</div>
                        <div className="text-xs text-[var(--text-secondary)]">Scans</div>
                      </div>
                      <div className="text-center bg-[var(--bg-card)] rounded-lg p-2 border border-[var(--border-color)]">
                        <Scissors className="w-4 h-4 text-[var(--icon-red-text)] mx-auto mb-1" />
                        <div className="font-bold text-[var(--text-primary)]">{encounterProcedures.length}</div>
                        <div className="text-xs text-[var(--text-secondary)]">Procedures</div>
                      </div>
                      <div className="text-center bg-[var(--bg-card)] rounded-lg p-2 border border-[var(--border-color)]">
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
              {encounterMedications.length > 0 ? (
                <Table heads={['Medication', 'Dosage', 'Frequency', 'Duration', 'Status', 'Prescribed By', 'Date']}>
                  {encounterMedications.map((med: any) => (
                    <tr key={med.id}>
                      <TdPrimary>{med.name || med.StockItem?.name || 'Medication'}</TdPrimary>
                      <Td>{med.dosage || '—'}</Td>
                      <Td>{med.frequency || '—'}</Td>
                      <Td>{med.duration || '—'}</Td>
                      <Td><StatusBadge status={med.status || 'prescribed'} /></Td>
                      <Td>{med.prescribedBy?.fullName || med.User_Medication_prescribedByIdToUser?.fullName || med.createdBy?.fullName || '—'}</Td>
                      <Td>{new Date(med.createdAt).toLocaleDateString()}</Td>
                    </tr>
                  ))}
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Pill className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
                  <p className="text-[var(--text-secondary)]">No medications prescribed for this attendance.</p>
                  {canAddClinical && (
                    <button
                      onClick={() => handleAddClinical('medication')}
                      className="mt-3 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg text-sm font-medium"
                    >
                      Prescribe medication
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* LAB TESTS TAB */}
          {activeTab === 'lab-tests' && (
            <div className="space-y-3">
              {encounterLabTests.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-[var(--text-secondary)]">Open a test to read its recorded parameters; print the sheet for the patient file.</p>
                  <div className="flex items-center gap-2">
                    {canEnterLaboratory && patient && (
                      <button
                        type="button"
                        onClick={handleGoToLaboratory}
                        className="inline-flex items-center gap-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-main)]"
                      >
                        <Microscope className="h-4 w-4 text-[var(--icon-green-text)]" />
                        Enter results
                      </button>
                    )}
                  </div>
                </div>
              )}
              {encounterLabTests.length > 0 ? (
                <Table heads={['Test', 'Priority', 'Status', 'Performed by', 'Requested Date', 'Result']}>
                  {encounterLabTests.map((test: any) => (
                    <tr key={test.id}>
                      <TdPrimary>{test.ServiceCatalog?.name || test.LabTestTemplate?.name || test.name}</TdPrimary>
                      <Td>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          test.priority === 'stat' ? 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]' :
                          test.priority === 'urgent' ? 'bg-[var(--icon-orange-bg)] text-[var(--icon-orange-text)]' :
                          'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]'
                        }`}>
                          {test.priority || 'routine'}
                        </span>
                      </Td>
                      <Td><StatusBadge status={test.status} /></Td>
                      <Td>{test.User_LabTest_performedByIdToUser?.fullName || test.requestedBy?.fullName || '—'}</Td>
                      <Td>{new Date(test.requestedAt || test.createdAt).toLocaleDateString()}</Td>
                      <Td>
                        {test.result ? (
                          <button
                            type="button"
                            onClick={() => setResultViewer({ kind: 'lab', record: test })}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--icon-cyan-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--icon-cyan-text)] hover:opacity-80"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View result
                          </button>
                        ) : <span className="text-[var(--text-tertiary)]">Not resulted</span>}
                      </Td>
                    </tr>
                  ))}
                </Table>
              ) : (
                <div className="text-center py-8">
                  <FlaskConical className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
                  <p className="text-[var(--text-secondary)]">No lab tests requested for this attendance.</p>
                  {canAddClinical && (
                    <button
                      onClick={() => handleAddClinical('lab')}
                      className="mt-3 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg text-sm font-medium"
                    >
                      Request a lab test
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* SCANS TAB */}
          {activeTab === 'scans' && (
            <div className="space-y-3">
              {encounterScans.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-[var(--text-secondary)]">Open a scan to read its findings and impression; print the report for the patient file.</p>
                  {canEnterScans && patient && (
                    <button
                      type="button"
                      onClick={handleGoToScans}
                      className="inline-flex items-center gap-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-main)]"
                    >
                      <Scan className="h-4 w-4 text-[var(--icon-purple-text)]" />
                      Enter results
                    </button>
                  )}
                </div>
              )}
              {encounterScans.length > 0 ? (
                <Table heads={['Study', 'Body part', 'Priority', 'Status', 'Requested', 'Result']}>
                  {encounterScans.map((scan: any) => (
                    <tr key={scan.id}>
                      <TdPrimary>
                        {getScanDisplayName(scan)}
                        <p className="text-[10px] font-normal text-[var(--text-tertiary)] mt-0.5">{humanScanModality(scan)}</p>
                      </TdPrimary>
                      <Td>{scan.bodyPart || scan.ScanTemplate?.bodyPart || '—'}</Td>
                      <Td>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          scan.priority === 'stat' ? 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]' :
                          scan.priority === 'urgent' ? 'bg-[var(--icon-orange-bg)] text-[var(--icon-orange-text)]' :
                          'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]'
                        }`}>
                          {scan.priority || 'routine'}
                        </span>
                      </Td>
                      <Td><StatusBadge status={scan.status} /></Td>
                      <Td>{new Date(scan.requestedAt || scan.createdAt).toLocaleDateString()}</Td>
                      <Td>
                        {scan.findings || scan.impression || scan.result ? (
                          <button
                            type="button"
                            onClick={() => setResultViewer({ kind: 'scan', record: scan })}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--icon-cyan-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--icon-cyan-text)] hover:opacity-80"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View report
                          </button>
                        ) : (
                          <span className="text-[var(--text-tertiary)]">{scan.status === 'completed' ? 'No report text' : 'Not reported'}</span>
                        )}
                      </Td>
                    </tr>
                  ))}
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Scan className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
                  <p className="text-[var(--text-secondary)]">No imaging requested for this attendance.</p>
                  {canAddClinical && (
                    <button
                      onClick={() => handleAddClinical('scan')}
                      className="mt-3 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg text-sm font-medium"
                    >
                      Request a scan
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* PROCEDURES TAB */}
          {activeTab === 'procedures' && (
            <div>
              {encounterProcedures.length > 0 ? (
                <Table heads={['Procedure', 'Scheduled Date', 'Status', 'Notes', 'Department']}>
                  {encounterProcedures.map((proc: any) => (
                    <tr key={proc.id}>
                      <TdPrimary>{proc.ServiceCatalog?.name || proc.ProcedureTemplate?.name || proc.name}</TdPrimary>
                      <Td>{proc.scheduledDate ? new Date(proc.scheduledDate).toLocaleString() : '—'}</Td>
                      <Td><StatusBadge status={proc.status} /></Td>
                      <Td className="max-w-xs truncate">{proc.notes || '—'}</Td>
                      <Td>{proc.ProcedureTemplate?.department || '—'}</Td>
                    </tr>
                  ))}
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Scissors className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
                  <p className="text-[var(--text-secondary)]">No procedures scheduled for this attendance.</p>
                  {canAddClinical && (
                    <button
                      onClick={() => handleAddClinical('procedure')}
                      className="mt-3 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg text-sm font-medium"
                    >
                      Schedule a procedure
                    </button>
                  )}
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
                <div className="text-center py-8">
                  <Heart className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
                  <p className="text-[var(--text-secondary)]">No vitals recorded for this attendance.</p>
                  {canEnterVitals && (
                    <button
                      onClick={handleGoToVitals}
                      className="mt-3 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg text-sm font-medium"
                    >
                      Record Vitals
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* BILLING TAB */}
          {activeTab === 'billing' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-[var(--text-primary)]">Attendance billing</h2>
                  <p className="text-xs text-[var(--text-secondary)]">Charges are limited to this visit. Synchronize after new billable services or ward charges are recorded.</p>
                </div>
                {canSyncBilling && (
                  <button
                    type="button"
                    onClick={handleSyncAttendanceBilling}
                    disabled={syncingBilling || !currentAttendance}
                    className="inline-flex items-center gap-2 rounded-lg bg-[var(--icon-cyan-bg)] px-3 py-2 text-sm font-medium text-[var(--icon-cyan-text)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RefreshCw className={syncingBilling ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                    {syncingBilling ? 'Synchronizing…' : attendanceBills.length > 0 ? 'Sync bill' : 'Generate bill'}
                  </button>
                )}
              </div>
              {attendanceBills.length > 0 ? (
                <div className="space-y-3">
                  {attendanceBills.map((bill: any) => {
                    const paidSoFar = latestRecordedPayment(bill);
                    return (
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
                            +{(bill.BillLineItem?.filter((item: any) => !item.isVoided).length || 0) - 5} more items — print the bill to see them all
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

                      {((bill.Payment || bill.payments || []) as any[]).filter((payment: any) => !payment.isVoided).length > 0 && (
                        <div className="mt-3 border-t border-[var(--border-color)] pt-3">
                          <h4 className="mb-2 text-xs font-semibold text-[var(--text-secondary)]">Payment history</h4>
                          <div className="space-y-2">
                            {((bill.Payment || bill.payments || []) as any[])
                              .filter((payment: any) => !payment.isVoided)
                              .slice()
                              .sort((a: any, b: any) => new Date(b.transactionDate || b.paymentDate || 0).getTime() - new Date(a.transactionDate || a.paymentDate || 0).getTime())
                              .map((payment: any) => (
                                <div key={payment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--bg-card)] px-3 py-2">
                                  <div className="min-w-0">
                                    <p className="text-xs font-medium text-[var(--text-primary)]">
                                      {formatCurrency(payment.amount)} · {(payment.paymentMethod || payment.paymentMode || 'Payment').replace(/_/g, ' ')}
                                    </p>
                                    <p className="text-[10px] text-[var(--text-tertiary)]">
                                      {formatDate(payment.transactionDate || payment.paymentDate || payment.createdAt)}
                                      {payment.reference ? ` · Ref: ${payment.reference}` : ''}
                                    </p>
                                  </div>
                                  <div className="flex shrink-0 items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => printReceipt(bill, payment)}
                                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[var(--icon-green-text)] hover:bg-[var(--icon-green-bg)]"
                                    >
                                      <Receipt className="h-3.5 w-3.5" />
                                      Thermal
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => printReceiptA4(bill, payment)}
                                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--border-color)]"
                                    >
                                      <Printer className="h-3.5 w-3.5" />
                                      A4
                                    </button>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Documents built from data this page already holds, so any role that can
                          read the bill can produce its paperwork. */}
                      <div className="mt-3 pt-3 border-t border-[var(--border-color)] flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => printBillStatement(bill)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--border-color)]"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          Print bill
                        </button>
                        {paidSoFar ? (
                          <>
                            <button
                              type="button"
                              onClick={() => printReceipt(bill)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--icon-green-bg)] px-3 py-1.5 text-xs font-medium text-[var(--icon-green-text)] hover:opacity-80"
                            >
                              <Receipt className="h-3.5 w-3.5" />
                              Print receipt
                            </button>
                            <button
                              type="button"
                              onClick={() => printReceiptA4(bill)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--border-color)]"
                            >
                              <Printer className="h-3.5 w-3.5" />
                              A4 receipt
                            </button>
                            {canIssueReceiptDocument && (
                              <button
                                type="button"
                                onClick={() => setReceiptToSend(bill)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--border-color)]"
                              >
                                <MessageSquare className="h-3.5 w-3.5" />
                                Send receipt
                              </button>
                            )}
                          </>
                        ) : (
                          <span className="text-[10px] text-[var(--text-tertiary)]">No payment recorded yet, so there is nothing to receipt.</span>
                        )}
                        {canOpenBilling && (
                          <button
                            type="button"
                            onClick={handleGoToBilling}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--border-color)]"
                          >
                            <DollarSign className="h-3.5 w-3.5 text-[var(--icon-green-text)]" />
                            Payments &amp; waivers
                          </button>
                        )}
                      </div>
                    </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-[var(--border-color)] py-10 text-center">
                  <Receipt className="mx-auto mb-3 h-12 w-12 text-[var(--text-tertiary)]" />
                  <p className="text-[var(--text-secondary)]">No bill has been generated for this attendance yet.</p>
                  <p className="mt-1 text-xs text-[var(--text-tertiary)]">Generate it when billable services are ready.</p>
                </div>
              )}
            </div>
          )}

          {/* CLINICAL TAB */}
          {activeTab === 'clinical' && (() => {
            // clinicalNotes may arrive as an object, a JSON string, or be missing entirely.
            const rawNotes = currentAttendance?.clinicalNotes;
            let notes: Record<string, any> = {};
            if (rawNotes && typeof rawNotes === 'object' && !Array.isArray(rawNotes)) {
              notes = rawNotes as Record<string, any>;
            } else if (typeof rawNotes === 'string' && rawNotes.trim()) {
              try {
                const parsed = JSON.parse(rawNotes);
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) notes = parsed;
              } catch {
                notes = { notes: rawNotes };
              }
            }

            // Friendly labels for every key Medical Entries may write.
            const NOTE_LABELS: Record<string, string> = {
              historyPresentingComplaint: 'History of Presenting Complaint',
              historyOfPresentingComplaint: 'History of Presenting Complaint',
              presentingComplaint: 'Presenting Complaint',
              onsetDurationQuality: 'Onset, Duration & Quality',
              physicalExamination: 'Physical Examination',
              examination: 'Physical Examination',
              assessment: 'Assessment',
              diagnosis: 'Diagnosis (notes)',
              plan: 'Plan',
              treatmentPlan: 'Treatment Plan',
              management: 'Management',
              investigations: 'Investigations',
              reviewOfSystems: 'Review of Systems',
              pastMedicalHistory: 'Past Medical History',
              pastSurgicalHistory: 'Past Surgical History',
              familyHistory: 'Family History',
              socialHistory: 'Social History',
              drugHistory: 'Drug History',
              notes: 'Notes',
              summary: 'Summary',
            };

            // Every non-empty note field, in a stable, clinically sensible order.
            const noteEntries = Object.entries(notes)
              .filter(([, value]) =>
                value !== null &&
                value !== undefined &&
                value !== '' &&
                !(Array.isArray(value) && value.length === 0) &&
                !(typeof value === 'object' && !Array.isArray(value))
              )
              .sort(([a], [b]) => {
                const order = Object.keys(NOTE_LABELS);
                const ia = order.indexOf(a);
                const ib = order.indexOf(b);
                return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
              })
              .map(([key, value]) => ({
                key,
                label: NOTE_LABELS[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()),
                text: Array.isArray(value) ? value.join(', ') : String(value),
              }));

            const hasDiagnoses = encounterDiagnoses.length > 0;
            const hasComplaint = Boolean(currentAttendance?.complaints);
            const hasMedicalNotes = Boolean(currentAttendance?.medicalNotes);
            const hasNotes = noteEntries.length > 0;
            const hasAnything = hasDiagnoses || hasComplaint || hasMedicalNotes || hasNotes;

            return (
              <div className="space-y-3">
                {/* DIAGNOSES — same source the Overview tab uses, now shown here too */}
                {hasDiagnoses && (
                  <div className="bg-[var(--bg-main)] rounded-xl p-4 border border-[var(--border-color)]">
                    <div className="flex items-center gap-3 mb-4">
                      <Brain className="w-5 h-5 text-[var(--icon-purple-text)]" />
                      <h3 className="text-lg font-bold text-[var(--text-primary)]">Diagnoses</h3>
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]">
                        {encounterDiagnoses.length}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {encounterDiagnoses.map((diagnosis: any, index: number) => (
                        <div
                          key={diagnosis.id || index}
                          className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border-color)]"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex-1">
                              <p className="font-semibold text-[var(--text-primary)] text-sm">
                                {diagnosis.diagnosis?.name || diagnosis.diagnosisName || diagnosis.name || diagnosis.icdCode || 'Diagnosis'}
                              </p>
                              {diagnosis.icdCode && (
                                <p className="text-xs text-[var(--text-secondary)] mt-1">ICD-10: {diagnosis.icdCode}</p>
                              )}
                              {diagnosis.notes && (
                                <p className="text-xs text-[var(--text-primary)] mt-2 whitespace-pre-wrap">{diagnosis.notes}</p>
                              )}
                            </div>
                            {diagnosis.primary && (
                              <span className="px-2 py-1 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] text-xs rounded-full font-semibold shrink-0 border border-[var(--border-color)]">
                                Primary
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* CHIEF COMPLAINT */}
                {hasComplaint && (
                  <div className="bg-[var(--bg-main)] rounded-lg p-4 border border-[var(--border-color)]">
                    <p className="text-xs font-semibold text-[var(--text-secondary)] mb-2 flex items-center gap-2">
                      <Clipboard className="w-3 h-3" /> Chief Complaints
                    </p>
                    <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{currentAttendance.complaints}</p>
                  </div>
                )}

                {/* ALL CLINICAL NOTES — every populated key, not just four hard-coded ones */}
                {hasNotes && (
                  <div className="bg-[var(--bg-main)] rounded-xl p-4 border border-[var(--border-color)]">
                    <div className="flex items-center gap-3 mb-4">
                      <Clipboard className="w-5 h-5 text-[var(--icon-cyan-text)]" />
                      <h3 className="text-lg font-bold text-[var(--text-primary)]">Clinical Notes</h3>
                    </div>
                    <div className="space-y-3">
                      {noteEntries.map((entry) => (
                        <div
                          key={entry.key}
                          className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border-color)]"
                        >
                          <p className="text-xs font-semibold text-[var(--text-secondary)] mb-2">{entry.label}</p>
                          <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{entry.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* MEDICAL NOTES */}
                {hasMedicalNotes && (
                  <div className="bg-[var(--bg-main)] rounded-lg p-4 border border-[var(--border-color)]">
                    <p className="text-xs font-semibold text-[var(--text-secondary)] mb-2 flex items-center gap-2">
                      <FileText className="w-3 h-3" /> Medical Notes
                    </p>
                    <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{currentAttendance.medicalNotes}</p>
                  </div>
                )}

                {/* FOLLOW-UP DATE */}
                {(currentAttendance as any)?.followUpDate && (
                  <div className="bg-[var(--bg-main)] rounded-lg p-4 border border-[var(--border-color)]">
                    <p className="text-xs font-semibold text-[var(--text-secondary)] mb-2">Follow-up Date</p>
                    <p className="text-sm text-[var(--text-primary)]">
                      {new Date((currentAttendance as any).followUpDate).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {/* EMPTY STATE — only when there is genuinely nothing */}
                {!hasAnything && (
                  <div className="text-center py-8">
                    <Stethoscope className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
                    <p className="text-[var(--text-secondary)]">No clinical notes or diagnoses recorded for this attendance.</p>
                    {canAddClinical && (
                      <button
                        onClick={() => handleAddClinical('diagnosis')}
                        className="mt-3 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg text-sm font-medium"
                      >
                        Add Clinical Notes
                      </button>
                    )}
                  </div>
                )}

                {/* Action Buttons for Adding Clinical Data (unchanged) */}
                {canAddClinical && (
                  <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">Quick Clinical Actions</h3>
                        <p className="text-xs text-[var(--text-secondary)]">Add clinical data to this attendance record</p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => handleAddClinical('diagnosis')} className="flex items-center gap-2 px-3 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] border border-[var(--border-color)] rounded-lg hover:opacity-80 transition-colors text-xs font-medium">
                          <Plus className="w-3 h-3" /> Diagnosis
                        </button>
                        <button onClick={() => handleAddClinical('lab')} className="flex items-center gap-2 px-3 py-2 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] border border-[var(--border-color)] rounded-lg hover:opacity-80 transition-colors text-xs font-medium">
                          <Plus className="w-3 h-3" /> Lab Test
                        </button>
                        <button onClick={() => handleAddClinical('scan')} className="flex items-center gap-2 px-3 py-2 bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] border border-[var(--border-color)] rounded-lg hover:opacity-80 transition-colors text-xs font-medium">
                          <Plus className="w-3 h-3" /> Scan
                        </button>
                        <button onClick={() => handleAddClinical('medication')} className="flex items-center gap-2 px-3 py-2 bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] border border-[var(--border-color)] rounded-lg hover:opacity-80 transition-colors text-xs font-medium">
                          <Plus className="w-3 h-3" /> Medication
                        </button>
                        <button onClick={() => handleAddClinical('procedure')} className="flex items-center gap-2 px-3 py-2 bg-[var(--icon-orange-bg)] text-[var(--icon-orange-text)] border border-[var(--border-color)] rounded-lg hover:opacity-80 transition-colors text-xs font-medium">
                          <Plus className="w-3 h-3" /> Procedure
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
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
                className="flex-1 px-4 py-2 bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] border border-[var(--border-color)] rounded-lg hover:opacity-80 transition-colors font-medium"
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

      {/* Lab / scan result viewer */}
      {resultViewer && (
        <ResultDetailModal
          kind={resultViewer.kind}
          record={resultViewer.record}
          onClose={() => setResultViewer(null)}
          onPrint={() => (resultViewer.kind === 'lab' ? printLabResults(resultViewer.record) : printScanReport(resultViewer.record))}
        />
      )}

      {/* Send the recorded receipt to the patient by SMS / WhatsApp */}
      {showMedicalReport && (
        <MedicalReportModal
          patient={patient}
          attendance={currentAttendance}
          onClose={() => setShowMedicalReport(false)}
        />
      )}
      {receiptToSend && (
        <SendDocumentModal
          open
          onClose={() => setReceiptToSend(null)}
          patient={patient ?? (receiptToSend as any).Patient}
          documentType="receipt"
          entityId={receiptToSend.id}
          paymentId={latestRecordedPayment(receiptToSend)?.id}
        />
      )}
    </div>
  );
}