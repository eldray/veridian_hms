// src/pages/DispensePatient.tsx - REDESIGNED v3 (two-column card grid)
import { useLiveRefresh } from '../api/realtime';
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAttendanceStore } from '../store/attendanceStore';
import { usePatientStore } from '../store/patientStore';
import { useStockStore } from '../store/stockStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import { useHospitalStore } from '../store/hospitalStore';
import { PatientAttendanceSelector } from '../components/vitals/PatientAttendanceSelector';
import { MedicationModal } from '../components/medical-entries/modals/MedicationModal';
import { ConsumableModal } from '../components/medical-entries/modals/ConsumableModal';
import { ConsumableUsesPanel } from '../components/medical-entries/ConsumableUsesPanel';
import { deleteEncounterConsumableUse, getEncounterConsumableUses } from '../api';
import { generatePDF, openPrintWindow } from '../utils/pdfGenerator';
import { getPatientName } from '../utils/patient';
import {
  ChevronLeft, Pill, CheckCircle, Package, Printer, RefreshCw,
  AlertCircle, User, X, Plus, FileText, Zap, History,
  Calendar, Clock, MessageSquare, Stethoscope,
} from 'lucide-react';
import SendDocumentModal from '../components/SendDocumentModal';

const getEntityId = (entity: { id?: string; _id?: string } | null) =>
  entity?.id || entity?._id;

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
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, string> = {
    prescribed:   'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]',
    dispensed:    'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]',
    administered: 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]',
    cancelled:    'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${map[status] || map.prescribed}`}>
      {status?.charAt(0).toUpperCase() + status?.slice(1)}
    </span>
  );
};

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
          <button onClick={onClose} className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--border-color)] transition-all">
            <X className="w-4 h-4" />
          </button>
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
                className="w-20 text-center px-3 py-2 text-sm font-bold border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--icon-green-text)]" />
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
            <button onClick={onClose}
              className="flex-1 py-2 rounded-lg text-xs font-semibold border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-main)] transition-all">
              Cancel
            </button>
            <button onClick={() => onConfirm(quantity)} disabled={isProcessing}
              className="flex-1 py-2 rounded-lg text-xs font-semibold bg-[var(--icon-green-text)] text-white hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all">
              {isProcessing
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><CheckCircle className="w-3.5 h-3.5" /> Dispense</>}
            </button>
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

  const { attendances, getAttendances, updateMedicationStatus, getAttendance, refreshAttendance, calculateBill } = useAttendanceStore();
  const { patients, loadPatients } = usePatientStore();
  const { stockItems, getStockItems } = useStockStore();
  const { user } = useAuthStore();

  const [patient, setPatient] = useState<any>(null);
  const [attendance, setAttendance] = useState<any>(null);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [allAttendances, setAllAttendances] = useState<any[]>([]);

  const loadData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadPatients(), getAttendances(), getStockItems()]);
      let foundPatient = location.state?.patient;
      if (!foundPatient && id) foundPatient = patients.find(p => p.id === id);
      if (foundPatient) {
        setPatient(foundPatient);
        setSelectedPatientId(foundPatient.id);
        const patientAtts = attendances.filter(a => a.patientId === foundPatient.id);
        setAllAttendances(patientAtts);
        const initId = location.state?.attendanceId;
        const pick = initId
          ? attendances.find(a => a.id === initId)
          : patientAtts.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())[0];
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
    getEncounterConsumableUses(selectedAttendanceId)
      .then(response => setConsumableUses(Array.isArray(response?.data) ? response.data : []))
      .catch((err: any) => toastError('Consumable history unavailable', err?.response?.data?.message || err.message));
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
    if (!attendance?.id || !medication) return;
    setDispensingId(medication.id);
    try {
      await updateMedicationStatus(attendance.id, medication.id, {
        status: 'dispensed',
        dispensedAt: new Date().toISOString(),
        dispensedById: user?.id,
        quantity,
        dispensedUnitCost: toNum(stockItem?.costPrice, toNum(medication.unitCost, 0)),
        batchNumber: stockItem?.batchNumber || null,
      });
      success(medication.name, `${quantity} unit(s) dispensed`);
      await Promise.all([getAttendances(), getStockItems(), calculateBill(attendance.id)]);
      const refreshedAttendance = await getAttendance(attendance.id);
      setAttendance(refreshedAttendance);
      setPrescriptions((refreshedAttendance?.Medication || []).filter((m: any) => ['prescribed', 'dispensed'].includes(m.status)));
    } catch (err: any) {
      toastError('Dispense failed', err.response?.data?.message || err.message);
    } finally {
      setDispensingId(null);
      setDispenseModal({ isOpen: false, medication: null, stockItem: null });
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
    try {
      for (const m of ready) {
        setDispensingId(m.id);
        try {
          const stock = getStockFor(m);
          await updateMedicationStatus(attendance.id, m.id, {
            status: 'dispensed',
            dispensedAt: new Date().toISOString(),
            dispensedById: user?.id,
            quantity: toNum(m.quantity, 1),
            dispensedUnitCost: toNum(stock?.costPrice, toNum(m.unitCost, 0)),
            batchNumber: stock?.batchNumber || null,
          });
          okCount++;
        } catch {/* continue */}
      }
      success('Bulk dispense', `${okCount} of ${ready.length} item(s) dispensed`);
      await Promise.all([getAttendances(), getStockItems(), calculateBill(attendance.id)]);
      const refreshed = await getAttendance(attendance.id);
      setAttendance(refreshed);
      setPrescriptions((refreshed?.Medication || []).filter((m: any) =>
        ['prescribed', 'dispensed'].includes(m.status)));
    } catch (err: any) {
      toastError('Bulk dispense failed', err.message);
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
    setConsumableUses(Array.isArray(response?.data) ? response.data : []);
  };
  const afterConsumableChange = async () => {
    setIsConsumableModalOpen(false);
    setEditingConsumable(null);
    await Promise.all([refreshConsumableUses(), getStockItems()]);
  };
  const handleDeleteConsumable = async (use: any) => {
    if (!window.confirm(`Delete ${use.StockItem?.name || 'this consumable use'}? Stock will be restored.`)) return;
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

  const paymentCls = attendance?.paymentMode === 'nhis' ? 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]'
    : attendance?.paymentMode === 'private_insurance' ? 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]'
    : 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]';
  const paymentLabel = attendance?.paymentMode === 'nhis' ? 'NHIS'
    : attendance?.paymentMode === 'private_insurance' ? 'Private Ins.' : 'Cash';

  if (isLoading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-[var(--icon-green-text)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-[var(--text-secondary)]">Loading patient data…</p>
      </div>
    </div>
  );

  if (!patient) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-10">
        <AlertCircle className="w-10 h-10 text-[var(--icon-red-text)] mx-auto mb-3 opacity-60" />
        <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">Patient not found</p>
        <p className="text-xs text-[var(--text-secondary)] mb-4">The patient record doesn't exist.</p>
        <button onClick={() => navigate('/dashboard/dispense')}
          className="px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all">
          Back to Waiting List
        </button>
      </div>
    </div>
  );

  const patientName = getPatientName(patient);

  return (
    <div className="space-y-4">

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard/dispense')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-all text-xs font-medium">
            <ChevronLeft className="w-3.5 h-3.5" /> Waiting List
          </button>
          <div className="h-5 w-px bg-[var(--border-color)]" />
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--icon-green-bg)] flex items-center justify-center">
              <Pill className="w-4 h-4 text-[var(--icon-green-text)]" />
            </div>
            <div>
              <h1 className="text-base font-bold text-[var(--text-primary)] leading-tight">Dispense Medications</h1>
              <p className="text-[10px] text-[var(--text-tertiary)] leading-tight">{patientName}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canDispense && (
            <button onClick={() => setIsPrescribeModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] hover:bg-[var(--icon-purple-text)] hover:text-white transition-all">
              <Plus className="w-3.5 h-3.5" /> Add Prescription
            </button>
          )}
          {canDispense && (
            <button onClick={() => { setEditingConsumable(null); setIsConsumableModalOpen(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all">
              <Package className="w-3.5 h-3.5" /> Add Consumable
            </button>
          )}
          {prescribedMeds.length > 0 && (
            <button onClick={() => handlePrint()} disabled={printingId === 'all'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)] transition-all disabled:opacity-50">
              <Printer className="w-3.5 h-3.5" /> Print All
            </button>
          )}
          {prescribedMeds.length > 0 && (
            <button onClick={() => setShowSendRx(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-green-200 text-green-700 hover:bg-green-50 transition-all">
              <MessageSquare className="w-3.5 h-3.5" /> Send Rx
            </button>
          )}
          <button onClick={loadData} disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)] transition-all disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      <SendDocumentModal
        open={showSendRx}
        onClose={() => setShowSendRx(false)}
        patient={patient}
        documentType="prescription"
        entityId={attendance?.id || selectedAttendanceId}
      />

      {/* ── PATIENT SELECTOR ────────────────────────────────────────────── */}
      <PatientAttendanceSelector
        patients={[patient]}
        attendances={allAttendances}
        selectedPatientId={selectedPatientId}
        selectedAttendanceId={selectedAttendanceId}
        onPatientSelect={pid => {
          setSelectedPatientId(pid);
          setAllAttendances(attendances.filter(a => a.patientId === pid));
          setSelectedAttendanceId('');
          setAttendance(null);
          setPrescriptions([]);
        }}
        onAttendanceSelect={handleAttendanceChange}
        onClearSelection={() => { setSelectedAttendanceId(''); setAttendance(null); setPrescriptions([]); }}
      />

      {/* ── PATIENT BANNER ──────────────────────────────────────────────── */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] px-5 py-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[var(--icon-green-bg)] flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-[var(--icon-green-text)]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">{patientName}</h2>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                {patient.folderNumber} · {calcAge(patient.dateOfBirth)}y · {patient.gender} · {patient.contact}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {attendance && (
              <>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${paymentCls}`}>{paymentLabel}</span>
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
        <div className="flex flex-col items-center justify-center gap-3 py-14 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)]">
          <Calendar className="w-9 h-9 text-[var(--text-tertiary)] opacity-40" />
          <p className="text-sm font-semibold text-[var(--text-primary)]">No visit selected</p>
          <p className="text-xs text-[var(--text-tertiary)]">Select a visit above to view prescriptions</p>
        </div>
      )}

      {selectedAttendanceId && attendance && (
        <>
          {/* ── STATS STRIP ───────────────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'To dispense', value: pendingDispenseCount, icon: <Pill className="w-4 h-4 text-[var(--icon-purple-text)]" />, bg: 'bg-[var(--icon-purple-bg)]' },
              { label: 'Dispensed', value: dispensedHistory.length, icon: <CheckCircle className="w-4 h-4 text-[var(--icon-green-text)]" />, bg: 'bg-[var(--icon-green-bg)]' },
              { label: 'Total prescribed', value: prescribedMeds.length, icon: <FileText className="w-4 h-4 text-[var(--icon-cyan-text)]" />, bg: 'bg-[var(--icon-cyan-bg)]' },
            ].map(s => (
              <div key={s.label} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] px-4 py-3 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>{s.icon}</div>
                <div>
                  <p className="text-xl font-bold text-[var(--text-primary)] leading-none">{s.value}</p>
                  <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ═══════════════════════════════════════════════════════════
              PRESCRIBED MEDICATIONS — column-card grid
              ═══════════════════════════════════════════════════════════ */}
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-main)] flex-wrap">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-[var(--icon-purple-text)]" />
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                  Prescribed Medications
                </span>
                {prescribedMeds.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]">
                    {prescribedMeds.length}
                  </span>
                )}
              </div>
              {prescribedMeds.length > 0 && canDispense && readyToDispenseCount > 0 && (
                <button
                  onClick={handleBulkDispenseReady}
                  disabled={bulkDispensing || !!dispensingId}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-[var(--icon-green-text)] text-white hover:opacity-90 disabled:opacity-50 transition-all"
                >
                  {bulkDispensing
                    ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Zap className="w-3 h-3" />}
                  Dispense Ready ({readyToDispenseCount})
                </button>
              )}
            </div>

            {prescribedMeds.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="opacity-20"><Package className="w-10 h-10" /></div>
                <p className="text-xs text-[var(--text-tertiary)]">No pending prescriptions for this visit</p>
                {canDispense && (
                  <button onClick={() => setIsPrescribeModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] hover:bg-[var(--icon-purple-text)] hover:text-white transition-all">
                    <Plus className="w-3.5 h-3.5" /> Add Prescription
                  </button>
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
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]">
                              <AlertCircle className="w-3 h-3" /> Out of stock
                            </span>
                          ) : lowStock && !isDispensed ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]">
                              <AlertCircle className="w-3 h-3" /> Low: {avail} / {needed}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]">
                              <CheckCircle className="w-3 h-3" /> {avail} {unit}
                            </span>
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
                            ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]">
                                Blocked
                              </span>
                            : <StatusBadge status="prescribed" />}
                        </Col>

                        {/* 10. Actions */}
                        <Col label="Action">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handlePrint(med)}
                              disabled={printingId === med.id}
                              title="Print this prescription"
                              className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--icon-purple-text)] hover:bg-[var(--icon-purple-bg)] transition-all disabled:opacity-40"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            {canDispense && !isDispensed && hasStock && (
                              <button
                                onClick={() => handleDispenseClick(med)}
                                disabled={dispensingId === med.id || bulkDispensing}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--icon-green-text)] text-white hover:opacity-90 disabled:opacity-50 transition-all"
                              >
                                {dispensingId === med.id
                                  ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  : <><Zap className="w-3.5 h-3.5" /> Dispense</>}
                              </button>
                            )}
                            {canDispense && !isDispensed && lowStock && (
                              <button
                                onClick={() => handleDispenseClick(med)}
                                disabled={dispensingId === med.id || bulkDispensing}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--icon-yellow-text)] text-white hover:opacity-90 disabled:opacity-50 transition-all"
                              >
                                <Zap className="w-3.5 h-3.5" /> Partial
                              </button>
                            )}
                            {canDispense && !isDispensed && noStock && (
                              <span className="text-[10px] font-semibold text-[var(--icon-red-text)] px-2 py-1 rounded-lg bg-[var(--icon-red-bg)]">
                                Restock
                              </span>
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
                          <button
                            onClick={() => handlePrint(med)}
                            disabled={printingId === med.id}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-main)] transition-all disabled:opacity-40"
                          >
                            <Printer className="w-3.5 h-3.5" /> Print
                          </button>

                          {canDispense && !isDispensed && hasStock && (
                            <button
                              onClick={() => handleDispenseClick(med)}
                              disabled={dispensingId === med.id || bulkDispensing}
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-[var(--icon-green-text)] text-white hover:opacity-90 disabled:opacity-50 transition-all"
                            >
                              {dispensingId === med.id
                                ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                : <><Zap className="w-3.5 h-3.5" /> Dispense</>}
                            </button>
                          )}
                          {canDispense && !isDispensed && lowStock && (
                            <button
                              onClick={() => handleDispenseClick(med)}
                              disabled={dispensingId === med.id || bulkDispensing}
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-[var(--icon-yellow-text)] text-white hover:opacity-90 disabled:opacity-50 transition-all"
                            >
                              <Zap className="w-3.5 h-3.5" /> Partial ({avail})
                            </button>
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
          </div>

          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                <span className="text-xs font-semibold text-[var(--text-primary)]">Consumables Used</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]">{consumableUses.length}</span>
              </div>
              {canDispense && (
                <button onClick={() => { setEditingConsumable(null); setIsConsumableModalOpen(true); }}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]">
                  <Plus className="w-3 h-3" /> Add Consumable
                </button>
              )}
            </div>
            <ConsumableUsesPanel uses={consumableUses}
              onEdit={canDispense ? use => { setEditingConsumable(use); setIsConsumableModalOpen(true); } : undefined}
              onDelete={canDispense ? handleDeleteConsumable : undefined} />
          </div>

          {/* ═══════════════════════════════════════════════════════════
              DISPENSED THIS VISIT — SAME column-card grid
              ═══════════════════════════════════════════════════════════ */}
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[var(--icon-green-text)]" />
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                  Dispensed This Visit
                </span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]">
                  {dispensedHistory.length}
                </span>
              </div>
              {dispensedHistory.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-semibold">
                    Total value
                  </span>
                  <span className="text-sm font-bold text-[var(--icon-green-text)]">
                    GHS {dispensedTotal.toFixed(2)}
                  </span>
                </div>
              )}
            </div>

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
                            <button
                              onClick={() => handlePrint(med)}
                              disabled={printingId === med.id}
                              title="Re-print dispensing receipt"
                              className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--icon-green-text)] hover:bg-[var(--icon-green-bg)] transition-all disabled:opacity-40"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
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

                          <button
                            onClick={() => handlePrint(med)}
                            disabled={printingId === med.id}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-main)] transition-all disabled:opacity-40"
                          >
                            <Printer className="w-3.5 h-3.5" /> Re-print
                          </button>
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
          </div>
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
            await Promise.all([
              getAttendances(),
              getAttendance(attendance?.id),
              calculateBill(attendance?.id),
            ]);
            success('Added', 'Prescription added successfully');
            await loadData();
          }}
          attendanceId={attendance.id}
          stockItems={stockItems}
          canAdd={!!canDispense}
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