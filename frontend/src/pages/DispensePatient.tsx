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
import { AllergyBanner } from '../components/patients/AllergyBanner';
import { MedicationModal } from '../components/medical-entries/modals/MedicationModal';
import { ConsumableModal } from '../components/medical-entries/modals/ConsumableModal';
import { ConsumableUsesPanel } from '../components/medical-entries/ConsumableUsesPanel';
import { deleteEncounterConsumableUse, getEncounterConsumableUses, getPharmacyWorklist } from '../api';
import { generatePDF, openPrintWindow } from '../utils/pdfGenerator';
import { getPatientName } from '../utils/patient';
import { pickVisit } from '../utils/visitSelection';
import {
  Pill, CheckCircle, Package, Printer, RefreshCw,
  AlertCircle, User, X, Plus, FileText, Zap, History,
  Calendar, Clock, MessageSquare,
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
  const [quantity, setQuantity] = useState(toNum(medication.quantity, 1));
  const max = toNum(stockItem?.currentStock, toNum(medication.quantity, 1));
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
              <button onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-all text-sm font-bold">
                −
              </button>
              <input type="number" value={quantity} min={1} max={max}
                onChange={e => setQuantity(Math.min(Math.max(1, parseInt(e.target.value) || 1), max))}
                className={cn(INPUT, 'w-20 text-center font-bold')} />
              <button onClick={() => setQuantity(q => Math.min(max, q + 1))}
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
              <p className="text-sm font-bold text-[var(--icon-green-text)]">GHS {(unitCost * quantity).toFixed(2)}</p>
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
              icon={CheckCircle} loading={isProcessing}
              onClick={() => onConfirm(quantity)}
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

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedAttendanceId, setSelectedAttendanceId] = useState('');
  const [dispensingId, setDispensingId] = useState<string | null>(null);
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [showSendRx, setShowSendRx] = useState(false);
  const [isPrescribeModalOpen, setIsPrescribeModalOpen] = useState(false);
  const [isConsumableModalOpen, setIsConsumableModalOpen] = useState(false);
  const [editingConsumable, setEditingConsumable] = useState<any | null>(null);
  const [consumableUses, setConsumableUses] = useState<any[]>([]);
  const [bulkDispensing, setBulkDispensing] = useState(false);
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
      const response: any = await getPharmacyWorklist();
      const rows: any[] = response?.data?.data || [];
      setQueueRows(rows.map((row) => {
        const firstMed = Array.isArray(row.medications) && row.medications[0]
          ? row.medications[0].name
          : null;
        return {
          attendanceId: row.attendanceId,
          patientId: row.patientId,
          name: row.patient?.name || 'Unknown patient',
          folderNumber: row.patient?.folderNumber,
          age: row.patient?.age,
          gender: row.patient?.gender,
          attendanceNumber: row.attendanceNumber,
          visitDate: row.attendanceDateTime,
          detail: [
            `${row.prescribedCount ?? 0} to dispense`,
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

  const openQueuedVisit = (row: QueuedVisit) => {
    navigate(`/dashboard/dispense/${row.patientId}`, {
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
    setRefreshing(true);
    try {
      if (!id && !(location.state as any)?.patient) await loadQueue();
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

  useEffect(() => { loadData(); }, [id]);

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

  const handleDispenseClick = (med: any) => {
    const stock = getStockFor(med);
    if (!stock || toNum(stock.currentStock) < 1) {
      toastError('Out of stock', `${med.name} has no stock`);
      return;
    }
    setDispenseModal({ isOpen: true, medication: med, stockItem: stock });
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

  const handleBulkDispenseReady = async () => {
    if (!attendance?.id) return;
    const ready = prescriptions.filter(
      m => m.status === 'prescribed' &&
        toNum(getStockFor(m)?.currentStock) >= toNum(m.quantity, 1)
    );
    if (!ready.length) {
      toastError('Nothing ready', 'No prescriptions have sufficient stock');
      return;
    }
    setBulkDispensing(true);
    let okCount = 0;
    const failedItems: Array<{ name: string; reason: string }> = [];
    try {
      for (const m of ready) {
        setDispensingId(m.id);
        try {
          const stock = getStockFor(m);
          await dispenseMedication(attendance.id, m.id, {
            quantity: toNum(m.quantity, 1),
            batchNumber: stock?.batchNumber || undefined,
            expiryDate: stock?.expiryDate ? new Date(stock.expiryDate).toISOString() : undefined,
          });
          okCount++;
        } catch (err: any) {
          failedItems.push({
            name: m.name || 'Unnamed medication',
            reason: err?.response?.data?.message || err?.message || 'Dispensing failed',
          });
        }
      }
      await Promise.all([getStockItems(), calculateBill(attendance.id)]);
      const refreshed = await getAttendance(attendance.id);
      if (refreshed?.id === attendance.id) {
        setAttendance(refreshed);
        setPrescriptions((refreshed?.Medication || []).filter((m: any) =>
          ['prescribed', 'dispensed'].includes(m.status)));
        setAllAttendances(list => list.map(a => (a.id === attendance.id ? refreshed : a)));
      }
      if (failedItems.length > 0) {
        const details = failedItems
          .map(item => `${item.name}: ${item.reason}`)
          .join('; ');
        toastError(
          okCount > 0 ? 'Bulk dispense partially completed' : 'Bulk dispense failed',
          `${okCount} of ${ready.length} item(s) dispensed. ${details}`
        );
      } else {
        success('Bulk dispense', `${okCount} of ${ready.length} item(s) dispensed`);
      }
    } catch (err: any) {
      if (okCount > 0) {
        toastError(
          'Dispensing saved; refresh needed',
          `${okCount} item(s) were dispensed, but the screen could not refresh all updated details. Refresh the page before making further dispensing decisions.`
        );
      } else {
        const details = failedItems.map(item => `${item.name}: ${item.reason}`).join('; ');
        toastError('Bulk dispense failed', details || err?.response?.data?.message || err.message);
      }
    } finally {
      setDispensingId(null);
      setBulkDispensing(false);
    }
  };

  const handlePrint = async (med?: any) => {
    if (!attendance?.id || !patient) { toastError('Error', 'Missing required info'); return; }
    const meds = med ? [med] : prescriptions.filter(m => m.status === 'prescribed');
    if (!meds.length) { toastError('Nothing to print', 'No prescribed medications'); return; }
    setPrintingId(med?.id || 'all');
    try {
      const html = generatePDF('combinedPrescription', {
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
  const readyToDispenseCount = prescribedMeds.filter(
    m => m.status === 'prescribed' &&
      toNum(getStockFor(m)?.currentStock) >= toNum(m.quantity, 1)
  ).length;

  const dispensedHistory = useMemo(() => (attendance?.Medication || [])
    .filter((m: any) => m.status === 'dispensed')
    .sort((a: any, b: any) =>
      new Date(b.dispensedAt || 0).getTime() - new Date(a.dispensedAt || 0).getTime()),
    [attendance]);

  const dispensedTotal = useMemo(
    () => dispensedHistory.reduce(
      (sum: number, m: any) => sum + toNum(m.dispensedUnitCost) * toNum(m.quantity, 1),
      0
    ),
    [dispensedHistory]
  );

  const calcAge = (dob: string) => {
    if (!dob) return 0;
    const today = new Date(), b = new Date(dob);
    let age = today.getFullYear() - b.getFullYear();
    if (today.getMonth() < b.getMonth() || (today.getMonth() === b.getMonth() && today.getDate() < b.getDate())) age--;
    return age;
  };

  const paymentLabel = attendance?.paymentMode === 'nhis' ? 'NHIS'
    : attendance?.paymentMode === 'private_insurance' ? 'Private Ins.' : 'Cash';
  const paymentTone: BadgeTone = attendance?.paymentMode === 'nhis' ? 'green'
    : attendance?.paymentMode === 'private_insurance' ? 'purple' : 'cyan';

  const handleBack = () => (location.key === 'default' ? navigate('/dashboard/pharmacy') : navigate(-1));

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

      {/* ── PATIENT BANNER ──────────────────────────────────────────────── */}
      {patient && (
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] px-5 py-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[var(--icon-green-bg)] flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-[var(--icon-green-text)]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">{patientName}</h2>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                {[
                  patient.folderNumber,
                  // A queue-row summary carries the age but no date of birth.
                  `${patient.age ?? (patient.dateOfBirth ? calcAge(patient.dateOfBirth) : '—')}y`,
                  patient.gender,
                  patient.contact,
                ].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {attendance && (
              <>
                <Badge tone={paymentTone} dot size="sm">{paymentLabel}</Badge>
                <span className="text-[10px] font-mono text-[var(--text-tertiary)] bg-[var(--bg-main)] px-2.5 py-1 rounded-full border border-[var(--border-color)]">
                  #{attendance.attendanceNumber || '—'}
                </span>
                <span className="text-[10px] text-[var(--text-tertiary)] bg-[var(--bg-main)] px-2.5 py-1 rounded-full border border-[var(--border-color)] flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(attendance.dateTime || attendance.createdAt).toLocaleDateString()}
                </span>
                <StatusBadge status={attendance.status} />
              </>
            )}
          </div>
        </div>
      </div>
      )}

      <AllergyBanner
        patientId={patient?.id || selectedPatientId}
        allergies={patient?.allergies}
        allergyReviewStatus={attendance?.allergyReviewStatus}
      />

      {/* ── ALERT BANNERS ───────────────────────────────────────────────── */}
      {attendance && !canDispense && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-[var(--icon-yellow-text)] bg-[var(--icon-yellow-bg)]">
          <AlertCircle className="w-4 h-4 text-[var(--icon-yellow-text)] flex-shrink-0" />
          <p className="text-xs font-medium text-[var(--icon-yellow-text)]">
            This visit is <strong>{attendance.status}</strong> — medications can be viewed but not dispensed.
          </p>
        </div>
      )}

      {!selectedAttendanceId && (
        <QueuedVisits
          title="Dispensing queue"
          description="Prescriptions waiting to be filled — pick a visit to dispense"
          icon={Pill}
          accent="green"
          rows={queueRows}
          loading={queueLoading}
          emptyMessage="No prescriptions are waiting. Open the dispensing list to review dispensed history."
          onOpen={openQueuedVisit}
          onRefresh={loadData}
          onViewAll={() => navigate('/dashboard/pharmacy')}
        />
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
            actions={prescribedMeds.length > 0 && canDispense && readyToDispenseCount > 0 ? (
              <Button
                size="sm"
                variant="soft"
                accent="green"
                icon={Zap}
                loading={bulkDispensing}
                disabled={!!dispensingId}
                onClick={handleBulkDispenseReady}
              >
                Dispense Ready ({readyToDispenseCount})
              </Button>
            ) : undefined}
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
                  const avail = toNum(stock?.currentStock);
                  const needed = toNum(med.quantity, 1);
                  const hasStock = avail >= needed;
                  const lowStock = avail > 0 && avail < needed;
                  const noStock = avail === 0;
                  const unitCost = toNum(
                    med.dispensedUnitCost,
                    toNum(med.unitCost, toNum(stock?.costPrice, 0))
                  );
                  const isDispensed = med.status === 'dispensed';
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
                        <Col label="Qty">
                          <p className="text-sm font-bold text-[var(--text-primary)]">{needed}</p>
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
                        <Col label="Total">
                          <p className="text-xs font-bold text-[var(--icon-green-text)]">
                            GHS {(unitCost * needed).toFixed(2)}
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
                            : <StatusBadge status="prescribed" />}
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

                            {canDispense && !isDispensed && hasStock && (
                              <Button
                                size="sm"
                                variant="soft"
                                accent="green"
                                icon={Zap}
                                loading={dispensingId === med.id}
                                disabled={bulkDispensing}
                                onClick={() => handleDispenseClick(med)}
                              >
                                Dispense
                              </Button>
                            )}
                            {canDispense && !isDispensed && lowStock && (
                              <Button
                                size="sm"
                                variant="soft"
                                accent="yellow"
                                icon={Zap}
                                disabled={dispensingId === med.id || bulkDispensing}
                                onClick={() => handleDispenseClick(med)}
                              >
                                Partial
                              </Button>
                            )}
                            {canDispense && !isDispensed && noStock && (
                              <Badge tone="red" size="sm">Restock</Badge>
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
                          <StatusBadge status={isDispensed ? 'dispensed' : 'prescribed'} />
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          <Col label="Qty">
                            <p className="text-sm font-bold text-[var(--text-primary)]">{needed}</p>
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
                          <Col label="Total">
                            <p className="text-xs font-bold text-[var(--icon-green-text)]">
                              GHS {(unitCost * needed).toFixed(2)}
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

                          {canDispense && !isDispensed && hasStock && (
                            <Button
                              size="sm"
                              variant="soft"
                              accent="green"
                              className="flex-1"
                              icon={Zap}
                              loading={dispensingId === med.id}
                              disabled={bulkDispensing}
                              onClick={() => handleDispenseClick(med)}
                            >
                              Dispense
                            </Button>
                          )}
                          {canDispense && !isDispensed && lowStock && (
                            <Button
                              size="sm"
                              variant="soft"
                              accent="yellow"
                              className="flex-1"
                              icon={Zap}
                              disabled={dispensingId === med.id || bulkDispensing}
                              onClick={() => handleDispenseClick(med)}
                            >
                              Partial ({avail})
                            </Button>
                          )}
                          {canDispense && !isDispensed && noStock && (
                            <span className="flex-1 text-center text-xs font-semibold text-[var(--icon-red-text)] px-3 py-2 rounded-lg bg-[var(--icon-red-bg)]">
                              Out of stock
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
                    const qty = toNum(med.quantity, 1);
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
                          <Col label="Qty">
                            <p className="text-sm font-bold text-[var(--text-primary)]">{qty}</p>
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
                            <Col label="Qty">
                              <p className="text-sm font-bold text-[var(--text-primary)]">{qty}</p>
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