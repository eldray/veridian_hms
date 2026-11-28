import { useSmartBack } from '../utils/useSmartBack';
// src/pages/DispensePatient.tsx - REDESIGNED v3 (two-column card grid)
import { useLiveRefresh } from '../api/realtime';
import { confirmDialog } from '../context/ConfirmDialog';
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAttendanceStore } from '../store/attendanceStore';
import { usePatientStore } from '../store/patientStore';
import { useStockStore } from '../store/stockStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import { useHospitalStore } from '../store/hospitalStore';
import { PatientAttendanceSelector } from '../components/vitals/PatientAttendanceSelector';
import { QueuedVisits, type QueuedVisit } from '../components/worklist/QueuedVisits';
import { WorklistViewControls } from '../components/worklist/WorklistViewControls';
import { useWorklistStore } from '../store/worklistStore';
import { AllergyBanner } from '../components/patients/AllergyBanner';
import { PatientVisitHeader } from '../components/ui/PatientVisitHeader';
import { PatientAvatar } from '../components/patients/PatientAvatar';
import { MedicationModal } from '../components/medical-entries/modals/MedicationModal';
import { ConsumableModal } from '../components/medical-entries/modals/ConsumableModal';
import { ConsumableUsesPanel } from '../components/medical-entries/ConsumableUsesPanel';
import { deleteEncounterConsumableUse, getEncounterConsumableUses, getPharmacyWorklist, startMedicationDispensing } from '../api';
import { generatePDF, openPrintWindow } from '../utils/pdfGenerator';
import { PrintFormatToggle, getPrintFormat } from '../components/PrintFormatToggle';
import { getPatientName } from '../utils/patient';
import { pickVisit } from '../utils/visitSelection';
import {
  Pill, CheckCircle, Package, Printer, RefreshCw,
  AlertCircle, User, X, Plus, FileText, Zap, History,
  Clock, MessageSquare,
} from 'lucide-react';
import SendDocumentModal from '../components/SendDocumentModal';
import {
  Badge, Button, Card, PageHeader, StatCard, cn,
  humanStatus, statusTone, INPUT,
  type BadgeTone,
} from '../components/ui';

/** A visit is "the one to open" when it still owes the pharmacy a prescription to dispense. */
const hasPrescribedWork = (visit: any): boolean =>
  (visit?.Medication || []).some((med: any) => med?.status === 'prescribed');

/** Safely coerce any value to a finite number. */
const toNum = (v: any, fallback = 0): number => {
  if (v === null || v === undefined || v === '') return fallback;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : fallback;
};

const formatDate = (d?: string | Date | null) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatTime = (d?: string | Date | null) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '—';
  return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// ── Status badge ──────────────────────────────────────────────────────────────
// 'prescribed' and 'administered' have no entry in Badge's STATUS_TONES, so this
// page keeps a small local tone map for them; everything else (dispensed,
// cancelled, pending, admitted, completed…) goes through statusTone().
const LOCAL_STATUS_TONES: Record<string, BadgeTone> = {
  prescribed: 'purple',
  administered: 'cyan',
};
const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <Badge tone={LOCAL_STATUS_TONES[status] ?? statusTone(status)} dot size="sm">
    {humanStatus(status)}
  </Badge>
);

// ── Column label + value primitives ──────────────────────────────────────────
const Col: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({
  label, children, className = '',
}) => (
  <div className={`min-w-0 ${className}`}>
    <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] leading-tight mb-0.5">
      {label}
    </p>
    <div className="leading-tight">{children}</div>
  </div>
);

// ── Dispense modal ────────────────────────────────────────────────────────────
const DispenseModal: React.FC<{
  medication: any; stockItem: any;
  onConfirm: (qty: number) => void; onClose: () => void; isProcessing: boolean;
}> = ({ medication, stockItem, onConfirm, onClose, isProcessing }) => {
  const [quantity, setQuantity] = useState<number | ''>('');
  const max = Math.max(0, toNum(stockItem?.dispenseAvailable, 0));
  const unitCost = toNum(medication.unitCost, toNum(stockItem?.costPrice, 0));

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--bg-card)] rounded-xl w-full max-w-sm border border-[var(--border-color)] overflow-hidden" style={{ boxShadow: 'var(--shadow-md)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--icon-green-bg)] flex items-center justify-center">
              <Package className="w-3.5 h-3.5 text-[var(--icon-green-text)]" />
            </div>
            <p className="text-sm font-bold text-[var(--text-primary)]">Confirm Dispense</p>
          </div>
          <Button variant="ghost" iconOnly icon={X} aria-label="Close" onClick={onClose} />
        </div>

        <div className="p-5 space-y-4">
          <div className="px-3 py-2.5 rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)]">
            <p className="text-xs font-bold text-[var(--text-primary)]">{medication.name}</p>
            <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
              {[medication.dosage, medication.frequency, medication.duration].filter(Boolean).join(' · ') || 'As directed'}
            </p>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">Quantity</p>
            <div className="flex items-center gap-3">
              <button onClick={() => setQuantity(q => Math.max(1, (Number(q) || 1) - 1))}
                className="w-8 h-8 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-all text-sm font-bold">
                −
              </button>
              <input type="number" value={quantity} min={1} max={max}
                onChange={e => {
                  const raw = e.target.value;
                  if (!raw) { setQuantity(''); return; }
                  const parsed = Number.parseInt(raw, 10);
                  if (Number.isFinite(parsed)) setQuantity(Math.min(Math.max(1, parsed), max));
                }}
                className={cn(INPUT, 'w-20 text-center font-bold')} />
              <button onClick={() => setQuantity(q => Math.min(max, (Number(q) || 0) + 1))}
                className="w-8 h-8 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-all text-sm font-bold">
                +
              </button>
              <span className="text-[11px] text-[var(--text-tertiary)]">of {max} available</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="px-3 py-2 rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)]">
              <p className="text-[10px] text-[var(--text-tertiary)]">Unit cost</p>
              <p className="text-sm font-bold text-[var(--text-primary)]">GHS {unitCost.toFixed(2)}</p>
            </div>
            <div className="px-3 py-2 rounded-lg bg-[var(--icon-green-bg)] border border-[var(--border-color)]">
              <p className="text-[10px] text-[var(--icon-green-text)]">Total</p>
              <p className="text-sm font-bold text-[var(--icon-green-text)]">GHS {(unitCost * (Number(quantity) || 0)).toFixed(2)}</p>
            </div>
          </div>

          {medication.instructions && (
            <p className="text-[11px] text-[var(--text-secondary)] px-3 py-2 rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)]">
              <span className="font-semibold text-[var(--text-primary)]">Note: </span>{medication.instructions}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="secondary" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="soft" accent="green" className="flex-1"
              icon={CheckCircle} loading={isProcessing} disabled={max < 1 || quantity === '' || quantity < 1 || quantity > max}
              onClick={() => onConfirm(Number(quantity))}
            >
              Dispense
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
export default function DispensePatient() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { success, error: toastError } = useToast();
  const { hospital } = useHospitalStore();
  const worklistView = useWorklistStore((s) => s.view);
  const worklistDateFrom = useWorklistStore((s) => s.dateFrom);
  const worklistDateTo = useWorklistStore((s) => s.dateTo);

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedAttendanceId, setSelectedAttendanceId] = useState('');
  const [dispensingId, setDispensingId] = useState<string | null>(null);
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [showSendRx, setShowSendRx] = useState(false);
  const [isPrescribeModalOpen, setIsPrescribeModalOpen] = useState(false);
  const [isConsumableModalOpen, setIsConsumableModalOpen] = useState(false);
  const [medicationSectionTab, setMedicationSectionTab] = useState<'medications' | 'consumables'>('medications');
  const [editingConsumable, setEditingConsumable] = useState<any | null>(null);
  const [consumableUses, setConsumableUses] = useState<any[]>([]);
  const [dispenseModal, setDispenseModal] = useState<{ isOpen: boolean; medication: any; stockItem: any }>({
    isOpen: false, medication: null, stockItem: null,
  });

  const { getAttendances, dispenseMedication, getAttendance, refreshAttendance, calculateBill } = useAttendanceStore();
  const { patients: register, loadPatients, fetchPatient } = usePatientStore();
  const { stockItems, getStockItems } = useStockStore();
  const { user } = useAuthStore();

  const [patient, setPatient] = useState<any>(null);
  const [attendance, setAttendance] = useState<any>(null);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [allAttendances, setAllAttendances] = useState<any[]>([]);
  const [queueRows, setQueueRows] = useState<QueuedVisit[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);

  // Direct entry has no patient yet, and a pharmacist cannot search the patient
  // directory, so the screen offers the same queue the dispensing list shows.
  const loadQueue = async () => {
    setQueueLoading(true);
    try {
      const response: any = await getPharmacyWorklist({ view: worklistView, dateFrom: worklistDateFrom || undefined, dateTo: worklistDateTo || undefined });
      // Unwrap the standard API envelope and the worklist object's row array.
      // Also accept direct/intercepted response shapes for transport compatibility.
      const payload = response?.data?.data ?? response?.data ?? response;
      const rows: any[] = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : [];
      setQueueRows(rows.map((row) => {
        const firstMed = Array.isArray(row.medications) && row.medications[0]
          ? row.medications[0].name
          : null;
        return {
          attendanceId: row.attendanceId,
          patientId: row.patientId,
          name: getPatientName(row),
          imageUrl: row.patient?.imageUrl,
          folderNumber: row.patient?.folderNumber,
          age: row.patient?.age,
          gender: row.patient?.gender,
          attendanceNumber: row.attendanceNumber,
          visitDate: row.attendanceDateTime,
          detail: [
            worklistView === 'in_progress' ? `${row.inProgressCount ?? 0} in progress` : worklistView === 'completed' ? `${row.dispensedCount ?? 0} dispensed` : `${row.prescribedCount ?? 0} to dispense`,
            row.prescriptionCount ? `${row.prescriptionCount} prescribed` : null,
            firstMed,
          ].filter(Boolean).join(' · '),
          priority: row.priority,
          waitMinutes: row.waitTime,
        };
      }));
    } catch {
      setQueueRows([]);
    } finally {
      setQueueLoading(false);
    }
  };

  useEffect(() => {
    if (!id && !(location.state as any)?.patient) void loadQueue();
  }, [worklistView, worklistDateFrom, worklistDateTo, id]);

  const openQueuedVisit = (row: QueuedVisit) => {
    navigate(`/dashboard/dispense/${row.patientId}`, {
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
    setRefreshing(true);
    try {
      // The standalone dispensing queue is refreshed by its task-view effect.
      // The route names the patient, so ask for that patient's record and that
      // patient's visits. This screen used to download the whole patient register and
      // every live visit in the hospital before it could show one prescription list.
      // Pharmacy stock is awaited with the rest: the availability badges on every
      // prescription row read from it, so painting the list first would advertise stock
      // that has not been checked yet. The formulary walks in ~500-row pages, so this is cheap.
      // Its failure is reported separately: a stock outage must not hide the prescriptions.
      const stockItemsPromise = getStockItems().catch((err: any) => {
        toastError('Stock Not Loaded', err?.message || 'Could not load pharmacy stock');
      });
      // The patient picker searches the register in the browser, so it still arrives —
      // after the prescription list, not before it.
      void loadPatients().catch(() => undefined);
      let foundPatient: any = (location.state as any)?.patient || null;
      if (!foundPatient && id) foundPatient = await fetchPatient(id).catch(() => null);
      // A row-click summary carries only the name and folder number; the banner also needs
      // the date of birth and contact, so the full record is fetched when it is missing.
      if (foundPatient?.id && !foundPatient.dateOfBirth) {
        foundPatient = (await fetchPatient(foundPatient.id).catch(() => null)) || foundPatient;
      }
      const patientAtts = foundPatient?.id
        ? await getAttendances({ patientId: foundPatient.id })
        : await getAttendances({ live: true, limit: 500 });
      await stockItemsPromise;
      if (!foundPatient) setAllAttendances(patientAtts);
      if (foundPatient) {
        setPatient(foundPatient);
        setSelectedPatientId(foundPatient.id);
        setAllAttendances(patientAtts);
        const initId = (location.state as any)?.attendanceId;
        const pick = initId
          ? (patientAtts.find((a: any) => a.id === initId) || await getAttendance(initId).catch(() => null))
          : pickVisit(patientAtts, hasPrescribedWork);
        if (pick) {
          setSelectedAttendanceId(pick.id);
          setAttendance(pick);
          setPrescriptions((pick.Medication || []).filter((m: any) => ['prescribed', 'dispensed'].includes(m.status)));
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
    if (!selectedAttendanceId) {
      setConsumableUses([]);
      return;
    }
    let active = true;
    getEncounterConsumableUses(selectedAttendanceId)
      .then(response => {
        const data = response?.data;
        const uses = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
        if (active) setConsumableUses(uses);
      })
      .catch((err: any) => {
        if (active) toastError('Consumable history unavailable', err?.response?.data?.message || err.message);
      });
    return () => { active = false; };
  }, [selectedAttendanceId]);

  useLiveRefresh(['encounters'], async () => {
    if (!selectedAttendanceId || dispensingId || dispenseModal.isOpen) return;
    const fresh: any = await refreshAttendance(selectedAttendanceId);
    if (!fresh || !Array.isArray(fresh.Medication)) return;
    setAttendance((prev: any) => (prev && prev.id === fresh.id ? { ...prev, ...fresh } : prev));
    setPrescriptions(fresh.Medication.filter((m: any) => ['prescribed', 'dispensed'].includes(m.status)));
  });

  const handleAttendanceChange = (attId: string) => {
    const att = allAttendances.find(a => a.id === attId);
    if (att) {
      setSelectedAttendanceId(attId);
      setAttendance(att);
      setPrescriptions((att.Medication || []).filter((m: any) => ['prescribed', 'dispensed'].includes(m.status)));
    }
  };

  const getStockFor = (med: any) => stockItems.find(s => s.id === med.stockItemId);

  // StockItem.currentStock is the hospital-wide aggregate. Dispensing is restricted
  // to the signed-in user's issuing department, so use that department's ledger balance.
  const getDepartmentAvailable = (stock: any) => {
    const departmentId = user?.departmentId;
    if (!departmentId || !Array.isArray(stock?.stockBalances)) return 0;
    const balance = stock.stockBalances.find(
      (entry: any) => entry.departmentId === departmentId && !entry.wardId,
    );
    return Math.max(0, Number(balance?.quantity) || 0);
  };

  const handleDispenseClick = async (med: any) => {
    const stock = getStockFor(med);
    if (!user?.departmentId) {
      toastError('Pharmacy department not assigned', 'Assign your user account to the pharmacy/issuing department before dispensing.');
      return;
    }
    const available = getDepartmentAvailable(stock);
    if (!stock || available < 1) {
      toastError('No pharmacy stock', `${med.name} has no stock balance in your assigned issuing department. Check the stock allocation before dispensing.`);
      return;
    }
    try {
      if (!med.dispensingStartedAt) {
        await startMedicationDispensing(attendance?.id || selectedAttendanceId, med.id);
        med = { ...med, dispensingStartedAt: new Date().toISOString() };
        setPrescriptions((items) => items.map((item) => item.id === med.id ? med : item));
        void loadQueue();
      }
      setDispenseModal({ isOpen: true, medication: med, stockItem: { ...stock, dispenseAvailable: available } });
    } catch (err: any) {
      toastError('Could not start dispensing', err.response?.data?.message || err.message || 'Refresh the queue and try again.');
    }
  };

  const handleConfirmDispense = async (quantity: number) => {
    const { medication, stockItem } = dispenseModal;
    const attendanceId = attendance?.id;
    if (!attendanceId || !medication) return;
    setDispensingId(medication.id);
    try {
      await dispenseMedication(attendanceId, medication.id, {
        quantity,
        batchNumber: stockItem?.batchNumber || undefined,
        expiryDate: stockItem?.expiryDate ? new Date(stockItem.expiryDate).toISOString() : undefined,
      });
    } catch (err: any) {
      toastError('Dispense failed', err.response?.data?.message || err.message);
      setDispensingId(null);
      setDispenseModal({ isOpen: false, medication: null, stockItem: null });
      return;
    }

    // The dispensing transaction has succeeded. A later refresh failure must not tell
    // staff the medicine was not dispensed or encourage them to retry and double-handle it.
    success(medication.name, `${quantity} unit(s) dispensed`);
    setDispenseModal({ isOpen: false, medication: null, stockItem: null });
    try {
      // Refresh the stock quantities and this bill, then reload only the visit that
      // changed. Walking every live visit here used to cost ~50 requests per dispense.
      await Promise.all([getStockItems(), calculateBill(attendanceId)]);
      const refreshedAttendance = await getAttendance(attendanceId);
      if (refreshedAttendance?.id === attendanceId) {
        setAttendance(refreshedAttendance);
        setPrescriptions((refreshedAttendance?.Medication || []).filter((m: any) => ['prescribed', 'dispensed'].includes(m.status)));
        setAllAttendances(list => list.map(a => (a.id === attendanceId ? refreshedAttendance : a)));
      }
    } catch (err: any) {
      toastError('Dispensing saved; refresh needed', 'The medicine was dispensed, but the screen could not refresh all updated details. Refresh the page before making further dispensing decisions.');
    } finally {
      setDispensingId(null);
    }
  };

  const handlePrint = async (med?: any) => {
    if (!attendance?.id || !patient) { toastError('Error', 'Missing required info'); return; }
    const meds = med ? [med] : prescriptions.filter(m => m.status === 'prescribed');
    if (!meds.length) { toastError('Nothing to print', 'No prescribed medications'); return; }
    setPrintingId(med?.id || 'all');
    try {
      const html = generatePDF(getPrintFormat('prescription') === 'slip' ? 'thermalPrescription' : 'combinedPrescription', {
        medications: meds.map((m: any) => ({
          name: m.name,
          dosage: m.dosage || 'As directed',
          frequency: m.frequency,
          duration: m.duration,
          quantity: toNum(m.quantity, 1),
          route: m.route || 'oral',
          instructions: m.instructions,
          prescribedAt: m.prescribedAt || new Date().toISOString(),
        })),
        patient: { ...patient, fullName: getPatientName(patient) },
        attendance,
        prescriberName: user?.fullName || 'Unknown',
      }, hospital);
      openPrintWindow(html, `Rx_${patient.folderNumber}`);
      success('Print ready', 'Prescription opened');
    } catch { toastError('Print failed', 'Could not generate prescription'); }
    finally { setPrintingId(null); }
  };

  const canDispense = attendance && ['pending', 'admitted'].includes(attendance.status);
  const refreshConsumableUses = async () => {
    if (!selectedAttendanceId) return;
    const response = await getEncounterConsumableUses(selectedAttendanceId);
    const data = response?.data;
    setConsumableUses(Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []);
  };
  const afterConsumableChange = async () => {
    setIsConsumableModalOpen(false);
    setEditingConsumable(null);
    await Promise.all([refreshConsumableUses(), getStockItems()]);
  };
  const handleDeleteConsumable = async (use: any) => {
    if (!(await confirmDialog({ title: 'Delete consumable use', message: `Delete ${use.StockItem?.name || 'this consumable use'}? Stock will be restored.`, confirmText: 'Delete' }))) return;
    try {
      await deleteEncounterConsumableUse(selectedAttendanceId, use.id);
      success('Consumable use deleted', 'The stock was restored.');
      await Promise.all([refreshConsumableUses(), getStockItems()]);
    } catch (err: any) {
      toastError('Could not delete consumable use', err?.response?.data?.message || err.message);
    }
  };
  const prescribedMeds = prescriptions;
  const pendingDispenseCount = prescribedMeds.filter(m => m.status === 'prescribed').length;
  const dispensedHistory = useMemo(() => (attendance?.Medication || [])
    .filter((m: any) => m.status === 'dispensed')
    .sort((a: any, b: any) =>
      new Date(b.dispensedAt || 0).getTime() - new Date(a.dispensedAt || 0).getTime()),
    [attendance]);

  const dispensedTotal = useMemo(
    () => dispensedHistory.reduce(
      (sum: number, m: any) => sum + toNum(m.dispensedUnitCost) * toNum(m.dispensedQuantity, toNum(m.quantity, 1)),
      0
    ),
    [dispensedHistory]
  );

  const paymentLabel = attendance?.paymentMode === 'nhis' ? 'NHIS'
    : attendance?.paymentMode === 'private_insurance' ? 'Private Ins.' : 'Cash';
  const handleBack = useSmartBack('/dashboard/pharmacy');

  if (isLoading) return (
    <div className="space-y-4">
      <PageHeader title="Dispense Medications" icon={Pill} accent="green" onBack={handleBack} />
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[var(--icon-green-text)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-[var(--text-secondary)]">Loading patient data…</p>
        </div>
      </div>
    </div>
  );

  // Direct entry starts without a patient until one is picked in the selector; only a
  // patient named in the route that failed to load is an error.
  if (!patient && id) return (
    <div className="space-y-4">
      <PageHeader title="Dispense Medications" icon={Pill} accent="green" onBack={handleBack} />
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-10">
          <AlertCircle className="w-10 h-10 text-[var(--icon-red-text)] mx-auto mb-3 opacity-60" />
          <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">Patient not found</p>
          <p className="text-xs text-[var(--text-secondary)] mb-4">The patient record doesn't exist.</p>
          <Button variant="soft" accent="cyan" size="sm" onClick={handleBack}>Back</Button>
        </div>
      </div>
    </div>
  );

  const patientName = patient ? getPatientName(patient) : '';

  return (
    <div className="space-y-4">

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <PageHeader
        title="Dispense Medications"
        subtitle={patientName}
        icon={Pill}
        accent="green"
        onBack={handleBack}
        actions={(
          <>
            {canDispense && (
              <Button variant="soft" accent="purple" size="sm" icon={Plus} onClick={() => setIsPrescribeModalOpen(true)}>
                Add Prescription
              </Button>
            )}
            {prescribedMeds.length > 0 && <PrintFormatToggle doc="prescription" />}
            {prescribedMeds.length > 0 && (
              <Button size="sm" icon={Printer} disabled={printingId === 'all'} onClick={() => handlePrint()}>
                Print All
              </Button>
            )}
            {prescribedMeds.length > 0 && (
              <Button variant="soft" accent="green" size="sm" icon={MessageSquare} onClick={() => setShowSendRx(true)}>
                Send Rx
              </Button>
            )}
            <Button size="sm" icon={RefreshCw} loading={refreshing} onClick={loadData}>
              Refresh
            </Button>
          </>
        )}
      />

      <SendDocumentModal
        open={showSendRx}
        onClose={() => setShowSendRx(false)}
        patient={patient}
        documentType="prescription"
        entityId={attendance?.id || selectedAttendanceId}
      />

      {/* ── PATIENT SELECTOR ────────────────────────────────────────────── */}
      <PatientAttendanceSelector
        patients={patient ? [patient, ...register.filter((p: any) => p.id !== patient.id)] : register}
        attendances={allAttendances}
        selectedPatientId={selectedPatientId}
        selectedAttendanceId={selectedAttendanceId}
        onPatientSelect={async pid => {
          setSelectedPatientId(pid);
          setAllAttendances([]);
          setSelectedAttendanceId('');
          setAttendance(null);
          setPrescriptions([]);
          // Resolve the patient before the visits: the picker auto-selects an open visit as
          // soon as they arrive, and the banner renders that visit's patient details.
          let resolved: any = null;
          try { resolved = await fetchPatient(pid); } catch { /* fall back to the visit's own patient */ }
          setPatient(resolved);
          let rows: any[] = [];
          try {
            // Only the selected patient's visits are needed; the register-wide list is no
            // longer held in the store.
            rows = (await getAttendances({ patientId: pid })) || [];
            setAllAttendances(rows);
            if (!resolved) {
              const visit = rows.find((a: any) => a.Patient || a.patient);
              resolved = visit?.Patient ?? visit?.patient ?? null;
              if (resolved) setPatient(resolved);
            }
          } catch {
            setAllAttendances([]);
          }
          // Open the visit that still owes the pharmacy a prescription, not merely the
          // most recent one; otherwise the screen opens on a visit with nothing to dispense.
          const best = pickVisit(rows, hasPrescribedWork) as any;
          if (best) {
            setSelectedAttendanceId(best.id);
            setAttendance(best);
            setPrescriptions((best.Medication || []).filter((m: any) => ['prescribed', 'dispensed'].includes(m.status)));
          }
        }}
        onAttendanceSelect={handleAttendanceChange}
        onClearSelection={() => { setSelectedAttendanceId(''); setAttendance(null); setPrescriptions([]); }}
      />

      {/* Shared patient/visit banner used by Medical Entries and diagnostic workflows. */}
      {patient && attendance && (
        <PatientVisitHeader
          patient={patient}
          attendance={attendance}
          accent="green"
          fields={[
            { label: 'Payment Mode', value: paymentLabel },
            { label: 'Balance', value: `GHS ${toNum(attendance.outstandingBalance).toFixed(2)}` },
          ]}
          aside={canDispense ? (
            <Badge tone="green" dot size="sm">Ready to dispense</Badge>
          ) : undefined}
        />
      )}

      <div className="flex flex-wrap items-stretch gap-2">
        <div className="min-w-0 flex-1 basis-[320px]">
          <AllergyBanner
            patientId={patient?.id || selectedPatientId}
            allergies={patient?.allergies}
            allergyReviewStatus={attendance?.allergyReviewStatus}
          />
        </div>

        {/* ── ALERT BANNERS ───────────────────────────────────────────────── */}
        {attendance && !canDispense && (
          <div className="flex min-w-0 flex-1 basis-[320px] items-center gap-2.5 px-3 py-2 rounded-lg border border-[var(--icon-yellow-text)] bg-[var(--icon-yellow-bg)]">
          <AlertCircle className="w-4 h-4 text-[var(--icon-yellow-text)] flex-shrink-0" />
          <p className="text-xs font-medium text-[var(--icon-yellow-text)]">
            This visit is <strong>{attendance.status}</strong> — medications can be viewed but not dispensed.
          </p>
            </div>
        )}
      </div>

      {!selectedAttendanceId && (
        <>
          <WorklistViewControls department="pharmacy" />
          <QueuedVisits
            title="Dispensing queue"
            description="Prescriptions waiting to be filled — pick a visit to dispense"
            icon={Pill}
            accent="green"
            rows={queueRows}
            loading={queueLoading}
            emptyMessage="No prescriptions are waiting. Open the dispensing list to review dispensed history."
            onOpen={openQueuedVisit}
            onRefresh={loadQueue}
            onViewAll={() => navigate('/dashboard/pharmacy')}
          />
        </>
      )}

      {selectedAttendanceId && attendance && (
        <>
          {/* ── STATS STRIP ───────────────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="To dispense" value={pendingDispenseCount} icon={Pill} accent="purple" />
            <StatCard label="Dispensed" value={dispensedHistory.length} icon={CheckCircle} accent="green" />
            <StatCard label="Total prescribed" value={prescribedMeds.length} icon={FileText} accent="cyan" />
          </div>

          {/* ═══════════════════════════════════════════════════════════
              PRESCRIBED MEDICATIONS — column-card grid
              ═══════════════════════════════════════════════════════════ */}
          <div className="mb-3 flex w-fit max-w-full flex-nowrap items-center gap-1 overflow-x-auto rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-1">
            <button type="button" onClick={() => setMedicationSectionTab('medications')}
              className={`shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${medicationSectionTab === 'medications' ? 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-main)]'}`}>
              Prescribed Medications <span className="ml-1 inline-block opacity-75">({prescriptions.length})</span>
            </button>
            <button type="button" onClick={() => setMedicationSectionTab('consumables')}
              className={`shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${medicationSectionTab === 'consumables' ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-main)]'}`}>
              Consumables Issued <span className="ml-1 inline-block opacity-75">({consumableUses.length})</span>
            </button>
          </div>
          {medicationSectionTab === 'medications' && (
          <Card
            padded={false}
            icon={Package}
            accent="purple"
            title={(
              <span className="flex items-center gap-2">
                Prescribed Medications
                {prescribedMeds.length > 0 && <Badge tone="purple">{prescribedMeds.length}</Badge>}
              </span>
            )}
          >
            {prescribedMeds.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="opacity-20"><Package className="w-10 h-10" /></div>
                <p className="text-xs text-[var(--text-tertiary)]">No pending prescriptions for this visit</p>
                {canDispense && (
                  <Button variant="soft" accent="purple" size="sm" icon={Plus} onClick={() => setIsPrescribeModalOpen(true)}>
                    Add Prescription
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-color)]">
                {prescribedMeds.map((med: any) => {
                  const stock = getStockFor(med);
                  const avail = getDepartmentAvailable(stock);
                  const needed = 1;
                  const dispensedQty = toNum(med.dispensedQuantity, 0);
                  const hasStock = avail >= needed;
                  const lowStock = avail > 0 && avail < needed;
                  const noStock = avail === 0;
                  const unitCost = toNum(
                    med.dispensedUnitCost,
                    toNum(med.unitCost, toNum(stock?.costPrice, 0))
                  );
                  const isDispensed = med.status === 'dispensed' || med.status === 'administered';
                  const unit = stock?.unitOfMeasure || 'units';

                  const prescriberName =
                    med.prescribedBy?.fullName ||
                    med.prescriber?.fullName ||
                    med.prescribedByName ||
                    '—';
                  const prescribedAtRaw =
                    med.prescribedAt || med.createdAt || attendance?.dateTime;

                  return (
                    <div
                      key={med.id}
                      className="px-4 py-3 hover:bg-[var(--bg-main)] transition-colors"
                    >
                      {/* ═══ Desktop grid of columns ═══ */}
                      <div className="hidden lg:grid lg:grid-cols-[2fr_1.1fr_0.6fr_1.2fr_0.9fr_1fr_0.9fr_0.9fr_0.8fr_auto] gap-3 items-center">
                        {/* 1. Medication */}
                        <Col label="Medication">
                          <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                            {med.name}
                          </p>
                        </Col>

                        {/* 2. Dosage / Frequency */}
                        <Col label="Dosage · Freq">
                          <p className="text-[11px] text-[var(--text-secondary)] truncate">
                            {[med.dosage, med.frequency].filter(Boolean).join(' · ') || 'As directed'}
                          </p>
                          {med.duration && (
                            <p className="text-[10px] text-[var(--text-tertiary)] truncate">
                              {med.duration}
                            </p>
                          )}
                        </Col>

                        {/* 3. Qty */}
                        <Col label={isDispensed ? 'Dispensed Qty' : 'Dispense Qty'}>
                          <p className="text-sm font-bold text-[var(--text-primary)]">{isDispensed ? dispensedQty : 'Enter when dispensing'}</p>
                        </Col>

                        {/* 4. Stock */}
                        <Col label="In Stock">
                          {noStock && !isDispensed ? (
                            <Badge tone="red"><AlertCircle className="w-3 h-3" /> Out of stock</Badge>
                          ) : lowStock && !isDispensed ? (
                            <Badge tone="yellow"><AlertCircle className="w-3 h-3" /> Low: {avail} / {needed}</Badge>
                          ) : (
                            <Badge tone="green"><CheckCircle className="w-3 h-3" /> {avail} {unit}</Badge>
                          )}
                        </Col>

                        {/* 5. Unit Cost */}
                        <Col label="Unit Cost">
                          <p className="text-xs font-semibold text-[var(--text-primary)]">
                            GHS {unitCost.toFixed(2)}
                          </p>
                        </Col>

                        {/* 6. Total */}
                        <Col label={isDispensed ? 'Dispensed Total' : 'Total'}>
                          <p className="text-xs font-bold text-[var(--icon-green-text)]">
                            {isDispensed ? `GHS ${(unitCost * dispensedQty).toFixed(2)}` : '—'}
                          </p>
                        </Col>

                        {/* 7. Prescriber */}
                        <Col label="Prescribed By">
                          <p className="text-[11px] text-[var(--text-secondary)] truncate">
                            {prescriberName}
                          </p>
                        </Col>

                        {/* 8. Date & Time */}
                        <Col label="Prescribed On">
                          <p className="text-[11px] text-[var(--text-secondary)]">
                            {formatDate(prescribedAtRaw)}
                          </p>
                          <p className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {formatTime(prescribedAtRaw)}
                          </p>
                        </Col>

                        {/* 9. Status */}
                        <Col label="Status">
                          {isDispensed
                            ? <StatusBadge status="dispensed" />
                            : noStock
                            ? <Badge tone="red">Blocked</Badge>
                            : <StatusBadge status={med.dispensingStartedAt ? 'in_progress' : 'prescribed'} />}
                        </Col>

                        {/* 10. Actions */}
                        <Col label="Action">
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              iconOnly
                              icon={Printer}
                              aria-label="Print this prescription"
                              disabled={printingId === med.id}
                              onClick={() => handlePrint(med)}
                            />

                            {!isDispensed && (
                              <Button
                                size="sm"
                                variant="soft"
                                accent="green"
                                icon={Zap}
                                loading={dispensingId === med.id}
                                disabled={!canDispense || !hasStock || dispensingId === med.id}
                                onClick={() => handleDispenseClick(med)}
                              >
                                {med.dispensingStartedAt ? 'Continue' : 'Dispense'}
                              </Button>
                            )}
                            {canDispense && !isDispensed && lowStock && (
                              <Button
                                size="sm"
                                variant="soft"
                                accent="yellow"
                                icon={Zap}
                                disabled={dispensingId === med.id}
                                onClick={() => handleDispenseClick(med)}
                              >
                                Partial
                              </Button>
                            )}
                            {!isDispensed && noStock && (
                              <Badge tone="red" size="sm">Out of stock · Dispense disabled</Badge>
                            )}
                            {isDispensed && (
                              <span className="text-[10px] text-[var(--icon-green-text)] font-semibold px-2">✓ Done</span>
                            )}
                            {!canDispense && !isDispensed && (
                              <span className="text-[10px] text-[var(--text-tertiary)] px-2">Read only</span>
                            )}
                          </div>
                        </Col>
                      </div>

                      {/* ═══ Mobile / tablet: 2-col grid per attribute ═══ */}
                      <div className="lg:hidden space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[var(--text-primary)]">{med.name}</p>
                            <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                              {[med.dosage, med.frequency, med.duration].filter(Boolean).join(' · ') || 'As directed'}
                            </p>
                          </div>
                          <StatusBadge status={isDispensed ? 'dispensed' : med.dispensingStartedAt ? 'in_progress' : 'prescribed'} />
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          <Col label={isDispensed ? 'Dispensed Qty' : 'Dispense Qty'}>
                            <p className="text-sm font-bold text-[var(--text-primary)]">{isDispensed ? dispensedQty : 'Enter when dispensing'}</p>
                          </Col>
                          <Col label="In Stock">
                            <p className={`text-sm font-bold ${
                              noStock ? 'text-[var(--icon-red-text)]'
                              : lowStock ? 'text-[var(--icon-yellow-text)]'
                              : 'text-[var(--icon-green-text)]'
                            }`}>{avail} <span className="text-[10px] font-normal text-[var(--text-tertiary)]">{unit}</span></p>
                          </Col>
                          <Col label="Unit Cost">
                            <p className="text-xs font-semibold text-[var(--text-primary)]">
                              GHS {unitCost.toFixed(2)}
                            </p>
                          </Col>
                          <Col label={isDispensed ? 'Dispensed Total' : 'Total'}>
                            <p className="text-xs font-bold text-[var(--icon-green-text)]">
                              {isDispensed ? `GHS ${(unitCost * dispensedQty).toFixed(2)}` : '—'}
                            </p>
                          </Col>
                          <Col label="Prescribed By">
                            <p className="text-[11px] text-[var(--text-secondary)] truncate">
                              {prescriberName}
                            </p>
                          </Col>
                          <Col label="Prescribed On">
                            <p className="text-[11px] text-[var(--text-secondary)]">
                              {formatDate(prescribedAtRaw)}
                            </p>
                            <p className="text-[10px] text-[var(--text-tertiary)]">
                              {formatTime(prescribedAtRaw)}
                            </p>
                          </Col>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={Printer}
                            disabled={printingId === med.id}
                            onClick={() => handlePrint(med)}
                          >
                            Print
                          </Button>

                          {!isDispensed && (
                            <Button
                              size="sm"
                              variant="soft"
                              accent="green"
                              className="flex-1"
                              icon={Zap}
                              loading={dispensingId === med.id}
                              disabled={!canDispense || !hasStock || dispensingId === med.id}
                              onClick={() => handleDispenseClick(med)}
                            >
                              {med.dispensingStartedAt ? 'Continue' : 'Dispense'}
                            </Button>
                          )}
                          {canDispense && !isDispensed && lowStock && (
                            <Button
                              size="sm"
                              variant="soft"
                              accent="yellow"
                              className="flex-1"
                              icon={Zap}
                              disabled={dispensingId === med.id}
                              onClick={() => handleDispenseClick(med)}
                            >
                              Partial ({avail})
                            </Button>
                          )}
                          {!isDispensed && noStock && (
                            <span className="flex-1 text-center text-xs font-semibold text-[var(--icon-red-text)] px-3 py-2 rounded-lg bg-[var(--icon-red-bg)]">
                              Out of stock · Dispense disabled
                            </span>
                          )}
                          {isDispensed && (
                            <span className="flex-1 text-center text-xs font-semibold text-[var(--icon-green-text)] px-3 py-2 rounded-lg bg-[var(--icon-green-bg)]">
                              ✓ Dispensed
                            </span>
                          )}
                          {!canDispense && !isDispensed && (
                            <span className="flex-1 text-center text-xs text-[var(--text-tertiary)] px-3 py-2">
                              Read only
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          )}
          {medicationSectionTab === 'consumables' && (
          <Card
            padded={false}
            icon={Package}
            accent="cyan"
            title={(
              <span className="flex items-center gap-2">
                Consumables Used
                <Badge tone="cyan">{consumableUses.length}</Badge>
              </span>
            )}
            actions={canDispense ? (
              <Button
                size="sm"
                variant="soft"
                accent="cyan"
                icon={Plus}
                onClick={() => { setEditingConsumable(null); setIsConsumableModalOpen(true); }}
              >
                Add Consumable
              </Button>
            ) : undefined}
          >
            <ConsumableUsesPanel uses={consumableUses}
              onEdit={canDispense ? use => { setEditingConsumable(use); setIsConsumableModalOpen(true); } : undefined}
              onDelete={canDispense ? handleDeleteConsumable : undefined} />
          </Card>

          )}

          {/* ═══════════════════════════════════════════════════════════
              DISPENSED THIS VISIT — SAME column-card grid
              ═══════════════════════════════════════════════════════════ */}
          <Card
            padded={false}
            icon={History}
            accent="green"
            title={(
              <span className="flex items-center gap-2">
                Dispensed This Visit
                <Badge tone="green">{dispensedHistory.length}</Badge>
              </span>
            )}
            actions={dispensedHistory.length > 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-semibold">
                  Total value
                </span>
                <span className="text-sm font-bold text-[var(--icon-green-text)]">
                  GHS {dispensedTotal.toFixed(2)}
                </span>
              </div>
            ) : undefined}
          >

            {dispensedHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <div className="opacity-20"><History className="w-10 h-10" /></div>
                <p className="text-xs text-[var(--text-tertiary)]">
                  Nothing dispensed for this visit yet
                </p>
                {pendingDispenseCount > 0 && (
                  <p className="text-[10px] text-[var(--text-tertiary)]">
                    {pendingDispenseCount} item{pendingDispenseCount > 1 ? 's' : ''} waiting above
                  </p>
                )}
              </div>
            ) : (
              <>
                <div className="divide-y divide-[var(--border-color)]">
                  {dispensedHistory.map((med: any) => {
                    const qty = toNum(med.dispensedQuantity, toNum(med.quantity, 1));
                    const prescribedQty = toNum(med.quantity, qty);
                    const remainingQty = Math.max(0, prescribedQty - qty);
                    const unitCost = toNum(med.dispensedUnitCost);
                    const total = unitCost * qty;
                    const dispenserName =
                      med.dispensedBy?.fullName ||
                      med.dispensedByName ||
                      '—';

                    return (
                      <div
                        key={med.id}
                        className="relative px-4 py-3 hover:bg-[var(--bg-main)] transition-colors group"
                      >
                        {/* Left accent bar */}
                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[var(--icon-green-text)] opacity-60" />

                        {/* ═══ Desktop grid of columns ═══ */}
                        <div className="hidden lg:grid lg:grid-cols-[2fr_1.1fr_0.6fr_0.9fr_1fr_1.2fr_1fr_0.9fr_auto] gap-3 items-center">
                          {/* 1. Medication */}
                          <Col label="Medication">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-5 h-5 rounded-full bg-[var(--icon-green-bg)] flex items-center justify-center flex-shrink-0">
                                <CheckCircle className="w-3 h-3 text-[var(--icon-green-text)]" />
                              </div>
                              <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                                {med.name}
                              </p>
                            </div>
                          </Col>

                          {/* 2. Dosage / Frequency */}
                          <Col label="Dosage · Freq">
                            <p className="text-[11px] text-[var(--text-secondary)] truncate">
                              {[med.dosage, med.frequency].filter(Boolean).join(' · ') || 'As directed'}
                            </p>
                            {med.duration && (
                              <p className="text-[10px] text-[var(--text-tertiary)] truncate">
                                {med.duration}
                              </p>
                            )}
                          </Col>

                          {/* 3. Qty */}
                          <Col label="Dispensed / Prescribed">
                            <p className="text-sm font-bold text-[var(--text-primary)]">{qty} / {prescribedQty}</p>
                            {remainingQty > 0 && <p className="text-[10px] text-[var(--icon-yellow-text)]">{remainingQty} remaining</p>}
                          </Col>

                          {/* 4. Unit Cost */}
                          <Col label="Unit Cost">
                            <p className="text-xs font-semibold text-[var(--text-primary)]">
                              GHS {unitCost.toFixed(2)}
                            </p>
                          </Col>

                          {/* 5. Total */}
                          <Col label="Total">
                            <p className="text-xs font-bold text-[var(--icon-green-text)]">
                              GHS {total.toFixed(2)}
                            </p>
                          </Col>

                          {/* 6. Dispensed By */}
                          <Col label="Dispensed By">
                            <p className="text-[11px] text-[var(--text-secondary)] truncate flex items-center gap-1">
                              <User className="w-3 h-3 flex-shrink-0" />
                              {dispenserName}
                            </p>
                          </Col>

                          {/* 7. Date & Time */}
                          <Col label="Dispensed On">
                            <p className="text-[11px] text-[var(--text-secondary)]">
                              {formatDate(med.dispensedAt)}
                            </p>
                            <p className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              {formatTime(med.dispensedAt)}
                            </p>
                          </Col>

                          {/* 8. Batch */}
                          <Col label="Batch">
                            {med.batchNumber ? (
                              <span className="text-[10px] font-mono text-[var(--text-tertiary)] bg-[var(--bg-main)] px-1.5 py-0.5 rounded border border-[var(--border-color)] inline-block truncate max-w-full">
                                {med.batchNumber}
                              </span>
                            ) : (
                              <span className="text-[10px] text-[var(--text-tertiary)]">—</span>
                            )}
                          </Col>

                          {/* 9. Action */}
                          <Col label="Action">
                            <Button
                              size="sm"
                              variant="ghost"
                              iconOnly
                              icon={Printer}
                              aria-label="Re-print dispensing receipt"
                              disabled={printingId === med.id}
                              onClick={() => handlePrint(med)}
                            />
                          </Col>
                        </div>

                        {/* ═══ Mobile / tablet: 2-col grid ═══ */}
                        <div className="lg:hidden space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-[var(--icon-green-bg)] flex items-center justify-center flex-shrink-0">
                              <CheckCircle className="w-3.5 h-3.5 text-[var(--icon-green-text)]" />
                            </div>
                            <p className="text-sm font-semibold text-[var(--text-primary)] flex-1 truncate">
                              {med.name}
                            </p>
                            <StatusBadge status="dispensed" />
                          </div>

                          <p className="text-[11px] text-[var(--text-tertiary)]">
                            {[med.dosage, med.frequency, med.duration].filter(Boolean).join(' · ') || 'As directed'}
                          </p>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            <Col label="Dispensed / Prescribed">
                              <p className="text-sm font-bold text-[var(--text-primary)]">{qty} / {prescribedQty}</p>
                              {remainingQty > 0 && <p className="text-[10px] text-[var(--icon-yellow-text)]">{remainingQty} remaining</p>}
                            </Col>
                            <Col label="Unit Cost">
                              <p className="text-xs font-semibold text-[var(--text-primary)]">
                                GHS {unitCost.toFixed(2)}
                              </p>
                            </Col>
                            <Col label="Total">
                              <p className="text-xs font-bold text-[var(--icon-green-text)]">
                                GHS {total.toFixed(2)}
                              </p>
                            </Col>
                            <Col label="Dispensed By">
                              <p className="text-[11px] text-[var(--text-secondary)] truncate">
                                {dispenserName}
                              </p>
                            </Col>
                            <Col label="Dispensed On">
                              <p className="text-[11px] text-[var(--text-secondary)]">
                                {formatDate(med.dispensedAt)}
                              </p>
                              <p className="text-[10px] text-[var(--text-tertiary)]">
                                {formatTime(med.dispensedAt)}
                              </p>
                            </Col>
                            <Col label="Batch">
                              {med.batchNumber ? (
                                <span className="text-[10px] font-mono text-[var(--text-tertiary)] bg-[var(--bg-main)] px-1.5 py-0.5 rounded border border-[var(--border-color)] inline-block">
                                  {med.batchNumber}
                                </span>
                              ) : (
                                <span className="text-[10px] text-[var(--text-tertiary)]">—</span>
                              )}
                            </Col>
                          </div>

                          <Button
                            size="sm"
                            variant="secondary"
                            icon={Printer}
                            disabled={printingId === med.id}
                            onClick={() => handlePrint(med)}
                          >
                            Re-print
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Receipt-style total footer */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-color)] bg-[var(--bg-main)]">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                    <span className="text-[11px] font-medium text-[var(--text-secondary)]">
                      {dispensedHistory.length} item{dispensedHistory.length > 1 ? 's' : ''} dispensed
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-semibold">
                      Total
                    </p>
                    <p className="text-base font-bold text-[var(--icon-green-text)] leading-tight">
                      GHS {dispensedTotal.toFixed(2)}
                    </p>
                  </div>
                </div>
              </>
            )}
          </Card>
        </>
      )}

      {/* ── MODALS ──────────────────────────────────────────────────────── */}
      {dispenseModal.isOpen && dispenseModal.medication && (
        <DispenseModal
          medication={dispenseModal.medication}
          stockItem={dispenseModal.stockItem}
          onConfirm={handleConfirmDispense}
          onClose={() => setDispenseModal({ isOpen: false, medication: null, stockItem: null })}
          isProcessing={dispensingId === dispenseModal.medication?.id}
        />
      )}

      {attendance && (
        <MedicationModal
          isOpen={isPrescribeModalOpen}
          onClose={() => setIsPrescribeModalOpen(false)}
          onSuccess={async () => {
            setIsPrescribeModalOpen(false);
            // loadData() re-reads this patient's visits, stock and bill below, so the
            // live visit list must not be walked a second time here.
            await Promise.all([
              getAttendance(attendance?.id),
              calculateBill(attendance?.id),
            ]);
            success('Added', 'Prescription added successfully');
            await loadData();
          }}
          attendanceId={attendance.id}
          stockItems={stockItems}
          canAdd={!!canDispense}
          allergies={patient?.allergies}
          userId={user?.id}
          userName={user?.fullName}
        />
      )}
      {attendance && (
        <ConsumableModal
          isOpen={isConsumableModalOpen}
          onClose={() => { setIsConsumableModalOpen(false); setEditingConsumable(null); }}
          onSuccess={afterConsumableChange}
          encounterId={attendance.id}
          stockItems={stockItems}
          canAdd={!!canDispense}
          existingUse={editingConsumable}
        />
      )}
    </div>
  );
}