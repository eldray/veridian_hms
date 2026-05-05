// src/pages/DispenseMedication.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAttendanceStore } from '../store/attendanceStore';
import { usePatientStore } from '../store/patientStore';
import { useStockStore } from '../store/stockStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import { PatientAttendanceSelector } from '../components/vitals/PatientAttendanceSelector';
import { MedicationModal } from '../components/medical-entries/modals/MedicationModal';
import { generatePDF, openPrintWindow } from '../utils/pdfGenerator';
import { useHospitalStore } from '../store/hospitalStore';
import {
  ChevronLeft,
  Pill,
  CheckCircle,
  Package,
  Printer,
  RefreshCw,
  AlertCircle,
  User,
  TrendingUp,
  X,
  Plus,
  FileText,
  UserCircle,
  Zap,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────

const getEntityId = (entity: { id?: string; _id?: string } | null): string | undefined =>
  entity?.id || entity?._id;

const getStatusBadge = (status: string) => {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    prescribed:   { bg: 'bg-[var(--icon-purple-bg)]', text: 'text-[var(--icon-purple-text)]', label: 'Prescribed'   },
    dispensed:    { bg: 'bg-[var(--icon-green-bg)]',  text: 'text-[var(--icon-green-text)]',  label: 'Dispensed'    },
    administered: { bg: 'bg-[var(--icon-cyan-bg)]',   text: 'text-[var(--icon-cyan-text)]',   label: 'Administered' },
    cancelled:    { bg: 'bg-[var(--icon-red-bg)]',    text: 'text-[var(--icon-red-text)]',    label: 'Cancelled'    },
  };
  const c = config[status] || config.prescribed;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
};

// ── Panel Header ──────────────────────────────────────────────────────────────

const PanelHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  count?: number;
  action?: React.ReactNode;
}> = ({ icon, title, count, action }) => (
  <div className="bg-[var(--bg-main)] px-4 py-2.5 border-b border-[var(--border-color)] flex items-center justify-between flex-shrink-0">
    <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2 text-sm">
      {icon}
      {title}
      {count !== undefined && count > 0 && (
        <span className="ml-1 px-1.5 py-0.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-full text-[10px] font-bold text-[var(--text-secondary)]">
          {count}
        </span>
      )}
    </h3>
    {action}
  </div>
);

// ── Dispense Quantity Modal ───────────────────────────────────────────────────

const DispenseQuantityModal: React.FC<{
  medication: any;
  stockItem: any;
  onConfirm: (quantity: number) => void;
  onClose: () => void;
  isProcessing: boolean;
}> = ({ medication, stockItem, onConfirm, onClose, isProcessing }) => {
  const [quantity, setQuantity] = useState(medication.quantity || 1);
  const maxQuantity = stockItem?.currentStock || medication.quantity || 1;
  const totalCost = (medication.unitCost || stockItem?.costPrice || 0) * quantity;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        minHeight: '100vh',
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] w-full"
        style={{ maxWidth: 440 }}
      >
        {/* Modal header */}
        <div className="bg-[var(--bg-main)] px-5 py-3 border-b border-[var(--border-color)] rounded-t-xl flex items-center justify-between">
          <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2 text-sm">
            <Package className="w-4 h-4 text-[var(--icon-green-text)]" />
            Dispense medication
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[var(--bg-card)] rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Medication summary */}
          <div className="bg-[var(--bg-main)] rounded-lg p-3 border border-[var(--border-color)]">
            <p className="font-semibold text-[var(--text-primary)] text-sm">{medication.name}</p>
            <div className="flex flex-wrap gap-3 mt-1 text-xs text-[var(--text-secondary)]">
              <span>{medication.dosage || 'As directed'}</span>
              <span>·</span>
              <span>{medication.frequency || 'As prescribed'}</span>
              <span>·</span>
              <span>{medication.duration || 'As needed'}</span>
            </div>
          </div>

          {/* Quantity input */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Quantity to dispense
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={quantity}
                onChange={(e) => {
                  let val = parseInt(e.target.value);
                  if (isNaN(val)) val = 1;
                  val = Math.min(Math.max(val, 1), maxQuantity);
                  setQuantity(val);
                }}
                min={1}
                max={maxQuantity}
                className="w-28 px-3 py-2 text-center text-lg font-bold bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] text-[var(--text-primary)]"
              />
              <span className="text-sm text-[var(--text-secondary)]">
                Available:{' '}
                <strong className="text-[var(--icon-green-text)]">{maxQuantity}</strong>{' '}
                {stockItem?.unitOfMeasure || 'units'}
              </span>
            </div>
          </div>

          {medication.instructions && (
            <p className="text-sm text-[var(--text-secondary)]">
              <span className="font-medium text-[var(--text-primary)]">Instructions:</span>{' '}
              {medication.instructions}
            </p>
          )}

          {/* Cost summary */}
          <div className="bg-[var(--icon-green-bg)] rounded-lg p-3 border border-[var(--border-color)]">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-secondary)]">Unit cost:</span>
              <span className="font-medium text-[var(--text-primary)]">
                GHS {(medication.unitCost || stockItem?.costPrice || 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-[var(--text-secondary)]">Total cost:</span>
              <span className="font-bold text-[var(--icon-green-text)]">
                GHS {totalCost.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all text-sm text-[var(--text-primary)]"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(quantity)}
              disabled={isProcessing}
              className="flex-1 px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: 'var(--icon-green-text)' }}
            >
              {isProcessing ? (
                <div
                  className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
                />
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Confirm dispense
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DispenseMedication() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [isLoading, setIsLoading]                       = useState(true);
  const [refreshing, setRefreshing]                     = useState(false);
  const [selectedPatientId, setSelectedPatientId]       = useState<string>('');
  const [selectedAttendanceId, setSelectedAttendanceId] = useState<string>('');
  const [dispensingId, setDispensingId]                 = useState<string | null>(null);
  const [printingId, setPrintingId]                     = useState<string | null>(null);
  const [isPrescribeModalOpen, setIsPrescribeModalOpen] = useState(false);
  const [dispenseModal, setDispenseModal]               = useState<{
    isOpen: boolean;
    medication: any;
    stockItem: any;
  }>({ isOpen: false, medication: null, stockItem: null });

  const hasLoaded = useRef(false);
  const { hospital } = useHospitalStore();

  const {
    attendances,
    getAttendances,
    updateMedicationStatus,
    canAddMedicalEntries,
    getAttendance,
    calculateBill,
  } = useAttendanceStore();

  const { patients, loadPatients }   = usePatientStore();
  const { stockItems, getStockItems } = useStockStore();
  const { user }                      = useAuthStore();

  // ── Data loading ────────────────────────────────────────────────────────────

  const loadData = async (force = false) => {
    if (!force && hasLoaded.current) return;
    try {
      setRefreshing(true);
      setIsLoading(true);
      await Promise.all([loadPatients(), getAttendances(), getStockItems()]);
      hasLoaded.current = true;
      success('Data loaded', 'Dispensing ready');
    } catch (err: any) {
      toastError('Load failed', err.message || 'Could not load data');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // ── Derived data ────────────────────────────────────────────────────────────

  const patientAttendances = useMemo(() => {
    if (!selectedPatientId || !attendances.length) return [];
    return attendances.filter((attendance) => {
      const ids = [
        attendance.patientId,
        attendance.patient?.id,
        attendance.patient?._id,
        attendance.data?.patientId,
      ]
        .filter(Boolean)
        .map((id) => id?.toString())
        .filter((id) => id && id !== 'undefined');
      return ids.includes(selectedPatientId);
    });
  }, [attendances, selectedPatientId]);

  const selectedPatient    = patients.find((p) => getEntityId(p) === selectedPatientId);
  const selectedAttendance = patientAttendances.find((a) => getEntityId(a) === selectedAttendanceId);

  useEffect(() => {
    setSelectedAttendanceId('');
    setDispensingId(null);
  }, [selectedPatientId]);

  const canDispatch  = selectedAttendance && ['pending', 'admitted'].includes(selectedAttendance.status);
  const canPrescribe = selectedAttendance && ['pending', 'admitted'].includes(selectedAttendance.status);

  const allMedications = (selectedAttendance?.Medication || []).map((med: any) => ({
    id:              med.id,
    name:            med.name,
    dosage:          med.dosage,
    frequency:       med.frequency,
    duration:        med.duration,
    quantity:        med.quantity || 0,
    route:           med.route,
    instructions:    med.instructions,
    status:          med.status,
    prescribedAt:    med.prescribedAt,
    dispensedAt:     med.dispensedAt,
    stockItemId:     med.stockItemId,
    unitCost:        med.dispensedUnitCost,
    prescribedBy:    med.prescribedBy?.fullName || med.prescribedBy || 'Unknown',
    prescribedById:  med.prescribedById,
    notes:           med.notes,
    dispensedUnitCost: med.dispensedUnitCost,
    dispensedBy:     med.dispensedBy,
  }));

  const prescribedMeds = allMedications.filter((m: any) => m.status === 'prescribed');
  const dispensedMeds  = allMedications.filter((m: any) => m.status === 'dispensed');

  const sortedPrescribedMeds = [...prescribedMeds].sort(
    (a: any, b: any) => new Date(a.prescribedAt).getTime() - new Date(b.prescribedAt).getTime()
  );
  const sortedDispensedMeds = [...dispensedMeds].sort(
    (a: any, b: any) => new Date(b.dispensedAt).getTime() - new Date(a.dispensedAt).getTime()
  );

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleClearSelection = () => {
    setSelectedPatientId('');
    setSelectedAttendanceId('');
    setDispensingId(null);
    setDispenseModal({ isOpen: false, medication: null, stockItem: null });
  };

  const handleRefresh = () => loadData(true);

  const handleDispenseClick = (medication: any) => {
    const stockItem = stockItems.find((s) => s.id === medication.stockItemId);
    if (!stockItem || stockItem.currentStock < 1) {
      toastError('Low stock', `Only ${stockItem?.currentStock || 0} available`);
      return;
    }
    setDispenseModal({ isOpen: true, medication, stockItem });
  };

  const handleConfirmDispense = async (quantity: number) => {
    const { medication, stockItem } = dispenseModal;
    if (!selectedAttendanceId || !medication) return;
    if (!canDispatch) {
      toastError('Cannot dispense', 'Attendance must be active or pending');
      setDispenseModal({ isOpen: false, medication: null, stockItem: null });
      return;
    }

    setDispensingId(medication.id);
    try {
      await updateMedicationStatus(selectedAttendanceId, medication.id, {
        status:            'dispensed',
        dispensedAt:       new Date().toISOString(),
        dispensedById:     user?.id,
        quantity,
        dispensedUnitCost: stockItem?.costPrice || medication.unitCost || 0,
        batchNumber:       stockItem?.batchNumber || null,
      });
      success(medication.name, `Dispensed ${quantity} unit(s) successfully`);
      await Promise.all([
        getAttendances(),
        getStockItems(),
        getAttendance(selectedAttendanceId),
        calculateBill(selectedAttendanceId),
      ]);
    } catch (err: any) {
      toastError('Dispense failed', err.response?.data?.message || err.message);
    } finally {
      setDispensingId(null);
      setDispenseModal({ isOpen: false, medication: null, stockItem: null });
    }
  };

  const calculateAge = (dateOfBirth: string): number => {
    if (!dateOfBirth) return 0;
    const today     = new Date();
    const birthDate = new Date(dateOfBirth);
    let age         = today.getFullYear() - birthDate.getFullYear();
    const mo        = today.getMonth() - birthDate.getMonth();
    if (mo < 0 || (mo === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const handlePrintPrescription = async (medication?: any) => {
    if (!selectedAttendanceId || !selectedPatient || !selectedAttendance) {
      toastError('Error', 'Missing required information');
      return;
    }
    const medsToPrint = medication ? [medication] : prescribedMeds;
    if (medsToPrint.length === 0) {
      toastError('No prescriptions', 'No medications to print');
      return;
    }
    setPrintingId(medication?.id || 'all');
    try {
      const medicationsData = medsToPrint.map((med: any) => ({
        name:         med.name,
        dosage:       med.dosage || 'As directed',
        frequency:    med.frequency || 'As prescribed',
        duration:     med.duration || 'As needed',
        quantity:     med.quantity || 1,
        route:        med.route || 'oral',
        instructions: med.instructions,
        notes:        med.notes,
        prescribedAt: med.prescribedAt || new Date().toISOString(),
      }));
      const htmlContent = generatePDF(
        'combinedPrescription',
        {
          medications: medicationsData,
          patient: {
            ...selectedPatient,
            fullName: `${selectedPatient.surname} ${selectedPatient.otherNames}`,
            age:      calculateAge(selectedPatient.dateOfBirth),
          },
          attendance:    selectedAttendance,
          prescriberName: user?.fullName || 'Unknown',
        },
        hospital
      );
      openPrintWindow(htmlContent, `Prescription_${selectedPatient.folderNumber}`);
      success('Prescription ready', 'Print window opened');
    } catch {
      toastError('Print failed', 'Could not generate prescription');
    } finally {
      setPrintingId(null);
    }
  };

  const handlePrescribeSuccess = async () => {
    setIsPrescribeModalOpen(false);
    await Promise.all([
      getAttendances(),
      getAttendance(selectedAttendanceId),
      calculateBill(selectedAttendanceId),
    ]);
    success('Medication prescribed', 'Prescription added successfully');
  };

  // ── Loading state ────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
        <div className="text-center bg-[var(--bg-card)] p-8 rounded-xl shadow-sm border border-[var(--border-color)]">
          <div
            className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-3"
            style={{ borderColor: 'var(--icon-green-text)', borderTopColor: 'transparent' }}
          />
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Loading pharmacy…</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Please wait</p>
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 p-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-[var(--bg-card)] rounded-lg transition-all border border-[var(--border-color)]"
          >
            <ChevronLeft className="w-4 h-4 text-[var(--text-primary)]" />
          </button>
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--icon-green-bg)' }}
          >
            <Pill className="w-4 h-4" style={{ color: 'var(--icon-green-text)' }} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[var(--text-primary)]">Medication Dispensing</h1>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Dispense, manage, and print prescriptions
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/dashboard/medical-entries')}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all text-sm text-[var(--text-primary)]"
          >
            <FileText className="w-4 h-4" />
            Medical entries
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all disabled:opacity-50 text-sm text-[var(--text-primary)]"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Patient & Attendance Selector */}
      <PatientAttendanceSelector
        patients={patients}
        attendances={attendances}
        selectedPatientId={selectedPatientId}
        selectedAttendanceId={selectedAttendanceId}
        onPatientSelect={setSelectedPatientId}
        onAttendanceSelect={setSelectedAttendanceId}
        onClearSelection={handleClearSelection}
        placeholder="Select a visit to dispense medications…"
      />

      {/* Patient / visit info strip */}
      {selectedPatient && selectedAttendance && (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
          <div className="px-5 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: 'var(--icon-green-bg)' }}
              >
                <User className="w-4 h-4" style={{ color: 'var(--icon-green-text)' }} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-[var(--text-primary)] text-sm">
                    {selectedPatient.surname} {selectedPatient.otherNames}
                  </h3>
                  <span className="text-xs text-[var(--text-secondary)] capitalize">
                    {selectedPatient.gender} · {selectedPatient.age || '?'}y
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <span
                    className="font-mono text-[10px] px-1.5 py-0.5 rounded border"
                    style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
                  >
                    #{selectedPatient.folderNumber}
                  </span>
                  <span>·</span>
                  <span>{selectedPatient.contact}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="text-xs font-mono px-2.5 py-1 rounded-full border"
                style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
              >
                {selectedAttendance.attendanceNumber || 'New Visit'}
              </span>
              <span
                className="text-xs px-2.5 py-1 rounded-full border"
                style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
              >
                {new Date(selectedAttendance.dateTime || selectedAttendance.createdAt || '').toLocaleDateString()}
              </span>
              {getStatusBadge(selectedAttendance.status)}
            </div>
          </div>
        </div>
      )}

      {/* Stats cards */}
      {selectedAttendance && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              icon: Pill,
              value: prescribedMeds.length,
              label: 'To dispense',
              bg:    'bg-[var(--icon-purple-bg)]',
              color: 'text-[var(--icon-purple-text)]',
            },
            {
              icon: CheckCircle,
              value: dispensedMeds.length,
              label: 'Dispensed',
              bg:    'bg-[var(--icon-green-bg)]',
              color: 'text-[var(--icon-green-text)]',
            },
            {
              icon: Printer,
              value: prescribedMeds.length,
              label: 'Ready to print',
              bg:    'bg-[var(--icon-cyan-bg)]',
              color: 'text-[var(--icon-cyan-text)]',
            },
            {
              icon: TrendingUp,
              value:
                allMedications.length > 0
                  ? `${Math.round((dispensedMeds.length / allMedications.length) * 100)}%`
                  : '0%',
              label: 'Completion',
              bg:    'bg-[var(--icon-yellow-bg)]',
              color: 'text-[var(--icon-yellow-text)]',
            },
          ].map((stat, i) => (
            <div
              key={i}
              className="bg-[var(--bg-card)] rounded-xl p-3 border border-[var(--border-color)]"
            >
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 ${stat.bg} rounded-lg flex items-center justify-center`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-lg font-bold text-[var(--text-primary)]">{stat.value}</p>
                  <p className="text-[10px] text-[var(--text-secondary)]">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick actions */}
      {selectedAttendance && canPrescribe && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setIsPrescribeModalOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90"
            style={{ background: 'var(--icon-purple-bg)', color: 'var(--icon-purple-text)' }}
          >
            <Plus className="w-4 h-4" />
            Prescribe medication
          </button>
          {prescribedMeds.length > 0 && (
            <button
              onClick={() => handlePrintPrescription()}
              disabled={printingId === 'all'}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: 'var(--icon-cyan-bg)', color: 'var(--icon-cyan-text)' }}
            >
              <Printer className="w-4 h-4" />
              Print all prescriptions
            </button>
          )}
        </div>
      )}

      {/* Read-only warning */}
      {selectedAttendance &&
        !canDispatch &&
        !['pending', 'admitted'].includes(selectedAttendance.status) && (
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-xl border text-sm"
            style={{
              background:   'var(--icon-yellow-bg)',
              borderColor:  'var(--border-color)',
              color:        'var(--icon-yellow-text)',
            }}
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p>
              This visit is{' '}
              <strong>{selectedAttendance.status}</strong>. Medications can be viewed but
              not dispensed.
            </p>
          </div>
        )}

      {/* ── Main content ────────────────────────────────────────────────────── */}

      {selectedAttendance ? (
        <div className="space-y-5">

          {/* DISPENSED panel — top */}
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
            <PanelHeader
              icon={<CheckCircle className="w-4 h-4 text-[var(--icon-green-text)]" />}
              title="Dispensed medications"
              count={dispensedMeds.length}
            />

            {sortedDispensedMeds.length === 0 ? (
              <div className="p-8 text-center">
                <CheckCircle
                  className="w-8 h-8 mx-auto mb-2"
                  style={{ color: 'var(--text-tertiary)' }}
                />
                <p className="text-sm text-[var(--text-secondary)]">No medications dispensed yet</p>
                {prescribedMeds.length > 0 && (
                  <p className="text-xs mt-1" style={{ color: 'var(--icon-yellow-text)' }}>
                    {prescribedMeds.length} prescription(s) awaiting dispensing
                  </p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto" style={{ maxHeight: 400, overflowY: 'auto' }}>
                <table className="w-full text-xs">
                  <thead
                    className="sticky top-0 border-b border-[var(--border-color)]"
                    style={{ background: 'var(--bg-main)' }}
                  >
                    <tr>
                      {[
                        'Medication', 'Dosage', 'Frequency',
                        'Qty dispensed', 'Unit cost', 'Total',
                        'Dispensed date', 'Dispensed by', 'Actions',
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)] whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {sortedDispensedMeds.map((med: any) => {
                      const total = (med.dispensedUnitCost || 0) * (med.quantity || 1);
                      return (
                        <tr
                          key={med.id}
                          className="hover:bg-[var(--bg-main)] transition-colors"
                        >
                          <td className="px-4 py-2 font-medium text-[var(--text-primary)]">
                            {med.name}
                          </td>
                          <td className="px-4 py-2 text-[var(--text-secondary)]">
                            {med.dosage || '—'}
                          </td>
                          <td className="px-4 py-2 text-[var(--text-secondary)]">
                            {med.frequency || '—'}
                          </td>
                          <td className="px-4 py-2 font-semibold text-[var(--icon-green-text)]">
                            {med.quantity || 1}
                          </td>
                          <td className="px-4 py-2 text-[var(--text-secondary)]">
                            GHS {(med.dispensedUnitCost || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-[var(--text-secondary)]">
                            GHS {total.toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-[var(--text-secondary)] whitespace-nowrap">
                            {med.dispensedAt
                              ? new Date(med.dispensedAt).toLocaleString()
                              : '—'}
                          </td>
                          <td className="px-4 py-2 text-[var(--text-secondary)]">
                            {med.dispensedBy?.fullName || '—'}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <button
                              onClick={() => handlePrintPrescription(med)}
                              disabled={printingId === med.id}
                              className="p-1 rounded transition-colors hover:bg-[var(--icon-purple-bg)]"
                              style={{ color: 'var(--icon-purple-text)' }}
                              title="Print prescription"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* PRESCRIBED panel — bottom */}
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
            <PanelHeader
              icon={<Pill className="w-4 h-4 text-[var(--icon-purple-text)]" />}
              title="Prescribed medications"
              count={prescribedMeds.length}
              action={
                canPrescribe ? (
                  <button
                    onClick={() => setIsPrescribeModalOpen(true)}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors hover:opacity-80"
                    style={{
                      background: 'var(--icon-purple-bg)',
                      color:      'var(--icon-purple-text)',
                    }}
                  >
                    <Plus className="w-3 h-3" />
                    Prescribe
                  </button>
                ) : undefined
              }
            />

            {sortedPrescribedMeds.length === 0 ? (
              <div className="p-8 text-center">
                <Pill
                  className="w-8 h-8 mx-auto mb-2"
                  style={{ color: 'var(--text-tertiary)' }}
                />
                <p className="text-sm text-[var(--text-secondary)]">No medications prescribed</p>
              </div>
            ) : (
              <div className="overflow-x-auto" style={{ maxHeight: 400, overflowY: 'auto' }}>
                <table className="w-full text-xs">
                  <thead
                    className="sticky top-0 border-b border-[var(--border-color)]"
                    style={{ background: 'var(--bg-main)' }}
                  >
                    <tr>
                      {[
                        'Medication', 'Dosage', 'Frequency', 'Duration',
                        'Quantity', 'Stock', 'Prescribed by', 'Prescribed on', 'Actions',
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)] whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {sortedPrescribedMeds.map((med: any) => {
                      const stockItem      = stockItems.find((s) => s.id === med.stockItemId);
                      const stockAvailable = stockItem?.currentStock || 0;
                      const hasStock       = stockAvailable >= (med.quantity || 1);
                      const isLowStock     = stockAvailable > 0 && stockAvailable < (med.quantity || 1);

                      return (
                        <tr
                          key={med.id}
                          className="hover:bg-[var(--bg-main)] transition-colors"
                        >
                          <td className="px-4 py-2">
                            <div className="font-medium text-[var(--text-primary)]">{med.name}</div>
                            {med.instructions && (
                              <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                                {med.instructions}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2 text-[var(--text-secondary)]">
                            {med.dosage || '—'}
                          </td>
                          <td className="px-4 py-2 text-[var(--text-secondary)]">
                            {med.frequency || '—'}
                          </td>
                          <td className="px-4 py-2 text-[var(--text-secondary)]">
                            {med.duration || '—'}
                          </td>
                          <td className="px-4 py-2 font-medium text-[var(--text-primary)]">
                            {med.quantity || 1}
                          </td>
                          <td className="px-4 py-2">
                            {stockItem ? (
                              <div className="flex items-center gap-1">
                                <span
                                  style={{
                                    color: hasStock
                                      ? 'var(--icon-green-text)'
                                      : isLowStock
                                      ? 'var(--icon-yellow-text)'
                                      : 'var(--icon-red-text)',
                                  }}
                                >
                                  {stockAvailable}
                                </span>
                                <span className="text-[10px] text-[var(--text-secondary)]">
                                  {stockItem.unitOfMeasure || 'units'}
                                </span>
                              </div>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-1 text-[var(--text-secondary)]">
                              <UserCircle className="w-3 h-3 flex-shrink-0" />
                              <span>{med.prescribedBy || 'Unknown'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-[var(--text-secondary)] whitespace-nowrap">
                            {med.prescribedAt
                              ? new Date(med.prescribedAt).toLocaleString()
                              : '—'}
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex items-center justify-center gap-1">
                              {/* Print button */}
                              <button
                                onClick={() => handlePrintPrescription(med)}
                                disabled={printingId === med.id}
                                className="p-1 rounded transition-colors hover:bg-[var(--icon-purple-bg)]"
                                style={{ color: 'var(--icon-purple-text)' }}
                                title="Print prescription"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>

                              {/* Dispense — has enough stock */}
                              {canDispatch && hasStock && (
                                <button
                                  onClick={() => handleDispenseClick(med)}
                                  disabled={dispensingId === med.id}
                                  className="px-2 py-1 rounded text-xs font-medium transition-all flex items-center gap-1 hover:opacity-80 disabled:opacity-50"
                                  style={{
                                    background: 'var(--icon-green-bg)',
                                    color:      'var(--icon-green-text)',
                                  }}
                                >
                                  {dispensingId === med.id ? (
                                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <>
                                      <Zap className="w-3 h-3" />
                                      Dispense
                                    </>
                                  )}
                                </button>
                              )}

                              {/* Dispense — low stock */}
                              {canDispatch && isLowStock && (
                                <button
                                  onClick={() => handleDispenseClick(med)}
                                  disabled={dispensingId === med.id}
                                  className="px-2 py-1 rounded text-xs font-medium transition-all hover:opacity-80 disabled:opacity-50"
                                  style={{
                                    background: 'var(--icon-yellow-bg)',
                                    color:      'var(--icon-yellow-text)',
                                  }}
                                >
                                  Dispense ({stockAvailable} left)
                                </button>
                              )}

                              {/* Out of stock */}
                              {canDispatch && stockAvailable === 0 && (
                                <span
                                  className="text-xs"
                                  style={{ color: 'var(--icon-red-text)' }}
                                >
                                  Out of stock
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>) : selectedPatientId && !selectedAttendanceId ? (
        <div
          className="rounded-xl p-8 text-center border"
          style={{
            background:  'var(--icon-yellow-bg)',
            borderColor: 'var(--border-color)',
          }}
        >
          <AlertCircle
            className="w-10 h-10 mx-auto mb-3"
            style={{ color: 'var(--icon-yellow-text)' }}
          />
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">
            No attendance selected
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Please select an attendance to dispense medications.
          </p>
        </div>
      ) : null}

      {/* Modals — rendered outside the ternary so they're always mounted when needed */}
      {dispenseModal.isOpen && dispenseModal.medication && (
        <DispenseQuantityModal
          medication={dispenseModal.medication}
          stockItem={dispenseModal.stockItem}
          onConfirm={handleConfirmDispense}
          onClose={() =>
            setDispenseModal({ isOpen: false, medication: null, stockItem: null })
          }
          isProcessing={dispensingId === dispenseModal.medication?.id}
        />
      )}

      {selectedAttendanceId && (
        <MedicationModal
          isOpen={isPrescribeModalOpen}
          onClose={() => setIsPrescribeModalOpen(false)}
          onSuccess={handlePrescribeSuccess}
          attendanceId={selectedAttendanceId}
          stockItems={stockItems}
          canAdd={canPrescribe}
          userId={user?.id}
          userName={user?.fullName}
        />
      )}

    </div> // closes outer space-y-5 p-6
  );
}