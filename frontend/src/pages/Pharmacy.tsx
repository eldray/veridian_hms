// src/pages/DispenseMedication.tsx - UPDATED with quantity input and prescribe modal
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAttendanceStore } from '../store/attendanceStore';
import { usePatientStore } from '../store/patientStore';
import { useStockStore } from '../store/stockStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import { PatientAttendanceSelector } from '../components/vitals/PatientAttendanceSelector';
import { documentApi } from '../api/documentApi';

// Import Medication Modal
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
  Ban,
  Clock,
  User,
  Activity,
  DollarSign,
  FileText,
  TrendingUp,
  AlertTriangle,
  X,
  Search,
  Filter,
  Eye,
  Calendar,
  Edit,
  Plus,
} from 'lucide-react';

const getEntityId = (entity: { id?: string; _id?: string } | null): string | undefined => {
  return entity?.id || entity?._id;
};

const getStatusBadge = (status: string) => {
  const config: Record<string, { bg: string; text: string }> = {
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
    admitted: { bg: 'bg-blue-100', text: 'text-blue-700' },
    completed: { bg: 'bg-green-100', text: 'text-green-700' },
    cancelled: { bg: 'bg-red-100', text: 'text-red-700' },
    prescribed: { bg: 'bg-purple-100', text: 'text-purple-700' },
    dispensed: { bg: 'bg-green-100', text: 'text-green-700' },
  };
  const c = config[status] || config.pending;
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

// Dispense Quantity Modal Component
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--bg-card)] rounded-xl max-w-md w-full border border-[var(--border-color)] shadow-xl">
        <div className="border-b border-[var(--border-color)] p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-bold text-[var(--text-primary)]">Dispense Medication</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[var(--bg-main)] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
        </div>
        
        <div className="p-5 space-y-4">
          <div className="bg-[var(--bg-main)] rounded-lg p-3 border border-[var(--border-color)]">
            <p className="font-semibold text-[var(--text-primary)]">{medication.name}</p>
            <div className="flex flex-wrap gap-3 mt-1 text-xs text-[var(--text-secondary)]">
              <span>💊 {medication.dosage || 'As directed'}</span>
              <span>⏰ {medication.frequency || 'As prescribed'}</span>
              <span>📅 {medication.duration || 'As needed'}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Quantity to Dispense
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={quantity}
                onChange={(e) => {
                  let val = parseInt(e.target.value);
                  if (isNaN(val)) val = 1;
                  val = Math.min(val, maxQuantity);
                  val = Math.max(val, 1);
                  setQuantity(val);
                }}
                min={1}
                max={maxQuantity}
                className="w-32 px-3 py-2 text-center text-lg font-bold bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-green-500 text-[var(--text-primary)]"
              />
              <span className="text-sm text-[var(--text-secondary)]">
                Available: <strong className="text-green-600">{maxQuantity}</strong> {stockItem?.unitOfMeasure || 'units'}
              </span>
            </div>
          </div>

          {medication.instructions && (
            <div className="text-sm text-[var(--text-secondary)]">
              <span className="font-medium">Instructions:</span> {medication.instructions}
            </div>
          )}

          <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-secondary)]">Unit Cost:</span>
              <span className="font-medium text-[var(--text-primary)]">
                GHS {(medication.unitCost || stockItem?.costPrice || 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-[var(--text-secondary)]">Total Cost:</span>
              <span className="font-bold text-green-700 dark:text-green-400">
                GHS {totalCost.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex gap-3 pt-3">
            <button
              onClick={() => onConfirm(quantity)}
              disabled={isProcessing}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all disabled:opacity-50 text-sm font-medium flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Confirm Dispense
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] transition-all text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function DispenseMedication() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedAttendanceId, setSelectedAttendanceId] = useState<string>('');
  const [dispensingId, setDispensingId] = useState<string | null>(null);
  const [printingId, setPrintingId] = useState<string | null>(null);
  
  // Dispense quantity modal state
  const [dispenseModal, setDispenseModal] = useState<{
    isOpen: boolean;
    medication: any;
    stockItem: any;
  }>({ isOpen: false, medication: null, stockItem: null });
  
  // Prescribe modal state
  const [isPrescribeModalOpen, setIsPrescribeModalOpen] = useState(false);

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

  const { patients, loadPatients } = usePatientStore();
  const { stockItems, getStockItems } = useStockStore();
  const { user } = useAuthStore();

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

  useEffect(() => {
    loadData();
  }, []);

  const patientAttendances = useMemo(() => {
    if (!selectedPatientId || !attendances.length) return [];
    return attendances.filter(attendance => {
      const possiblePatientIds = [
        attendance.patientId,
        attendance.patient?.id,
        attendance.patient?._id,
        attendance.data?.patientId
      ].filter(Boolean).map(id => id?.toString()).filter(id => id && id !== 'undefined');
      return possiblePatientIds.includes(selectedPatientId);
    });
  }, [attendances, selectedPatientId]);

  const selectedPatient = patients.find(p => getEntityId(p) === selectedPatientId);
  const selectedAttendance = patientAttendances.find(a => getEntityId(a) === selectedAttendanceId);

  useEffect(() => {
    setSelectedAttendanceId('');
    setDispensingId(null);
  }, [selectedPatientId]);

  const canDispatch = selectedAttendance && ['pending', 'admitted'].includes(selectedAttendance.status);
  const isReadOnly = selectedAttendance && selectedAttendance.status === 'completed';

  const allMedications = (selectedAttendance?.Medication || []).map((med: any) => ({
    ...med,
    id: med.id,
    name: med.name,
    dosage: med.dosage,
    frequency: med.frequency,
    duration: med.duration,
    quantity: med.quantity || 0,
    route: med.route,
    instructions: med.instructions,
    status: med.status,
    prescribedAt: med.prescribedAt,
    dispensedAt: med.dispensedAt,
    stockItemId: med.stockItemId,
    unitCost: med.dispensedUnitCost,
    prescribedBy: med.prescribedBy,
  }));

  const prescribedMeds = allMedications.filter(m => m.status === 'prescribed');
  const dispensedMeds = allMedications.filter(m => m.status === 'dispensed');

  const handleClearSelection = () => {
    setSelectedPatientId('');
    setSelectedAttendanceId('');
    setDispensingId(null);
    setDispenseModal({ isOpen: false, medication: null, stockItem: null });
  };

  const handleRefresh = () => loadData(true);

  const handleDispenseClick = (medication: any) => {
    const stockItem = stockItems.find(s => s.id === medication.stockItemId);
    if (!stockItem || stockItem.currentStock < (medication.quantity || 1)) {
      toastError('Low stock', `Only ${stockItem?.currentStock || 0} available`);
      return;
    }
    setDispenseModal({ isOpen: true, medication, stockItem });
  };


// In DispenseMedication.tsx - Update handleConfirmDispense
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
    // Call updateMedicationStatus with the quantity
    await updateMedicationStatus(selectedAttendanceId, medication.id, {
      status: 'dispensed',
      dispensedAt: new Date().toISOString(),
      dispensedById: user?.id,
      quantity: quantity,
      dispensedUnitCost: stockItem?.costPrice || medication.unitCost || 0,
      batchNumber: stockItem?.batchNumber || null
    });
    
    success(medication.name, `Dispensed ${quantity} unit(s) successfully`);
    
    // Refresh all data to show updated quantities
    await getAttendances();  // Refresh the attendances list
    await getStockItems();   // Refresh stock items to show decreased stock
    
    // Also get the attendance again to ensure latest data
    await getAttendance(selectedAttendanceId);
    await calculateBill(selectedAttendanceId);
    
  } catch (err: any) {
    console.error('Dispense error:', err);
    toastError('Dispense failed', err.response?.data?.message || err.message);
  } finally {
    setDispensingId(null);
    setDispenseModal({ isOpen: false, medication: null, stockItem: null });
  }
};

  const handleDispenseAll = async () => {
    if (!selectedAttendanceId) return;
    if (!canDispatch) {
      return toastError('Cannot dispense', 'Attendance must be active or pending');
    }

    const meds = prescribedMeds;
    if (meds.length === 0) {
      return toastError('No prescriptions', 'Nothing to dispense');
    }
    
    for (const med of meds) {
      const stock = stockItems.find(s => s.id === med.stockItemId);
      if (!stock || stock.currentStock < (med.quantity || 1)) {
        return toastError('Low stock', `${med.name} insufficient stock`);
      }
    }

    setDispensingId('all');
    try {
      for (const med of meds) {
        await updateMedicationStatus(selectedAttendanceId, med.id, {
          status: 'dispensed',
          dispensedAt: new Date().toISOString(),
          dispensedById: user?.id,
          quantity: med.quantity || 1,
          dispensedUnitCost: stockItems.find(s => s.id === med.stockItemId)?.costPrice || 0,
        });
      }
      success('All medications', 'Dispensed successfully');
      await getAttendances();
      await getStockItems();
      await getAttendance(selectedAttendanceId);
      await calculateBill(selectedAttendanceId);
    } catch (err: any) {
      toastError('Bulk dispense failed', err.message);
    } finally {
      setDispensingId(null);
    }
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
      const medicationsData = medsToPrint.map(med => ({
        name: med.name,
        dosage: med.dosage || 'As directed',
        frequency: med.frequency || 'As prescribed',
        duration: med.duration || 'As needed',
        quantity: med.quantity || 1,
        route: med.route || 'oral',
        instructions: med.instructions,
        notes: med.notes,
        prescribedAt: med.prescribedAt || new Date().toISOString(),
      }));
      
      const htmlContent = generatePDF('combinedPrescription', {
        medications: medicationsData,
        patient: {
          ...selectedPatient,
          fullName: `${selectedPatient.surname} ${selectedPatient.otherNames}`,
          age: calculateAge(selectedPatient.dateOfBirth),
        },
        attendance: selectedAttendance,
        prescriberName: user?.fullName || 'Unknown'
      }, hospital);
      
      openPrintWindow(htmlContent, `Prescription_${selectedPatient.folderNumber}`);
      success('Prescription ready', 'Print window opened');
    } catch (err) {
      console.error('Error printing prescription:', err);
      toastError('Print failed', 'Could not generate prescription');
    } finally {
      setPrintingId(null);
    }
  };
  
  const calculateAge = (dateOfBirth: string): number => {
    if (!dateOfBirth) return 0;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handlePrescribeSuccess = async () => {
    setIsPrescribeModalOpen(false);
    await getAttendances();
    await getAttendance(selectedAttendanceId);
    await calculateBill(selectedAttendanceId);
    success('Medication Prescribed', 'Prescription added successfully');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
        <div className="text-center bg-[var(--bg-card)] p-8 rounded-xl shadow-sm border border-[var(--border-color)]">
          <div className="w-14 h-14 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Loading Pharmacy...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-[var(--bg-card)] rounded-lg transition-all duration-200 border border-[var(--border-color)]"
          >
            <ChevronLeft className="w-5 h-5 text-[var(--text-primary)]" />
          </button>
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
            <Pill className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Medication Dispensing</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">Dispense, manage, and print prescriptions</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/dashboard/medical-entries')}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all text-sm"
          >
            <FileText className="w-4 h-4" />
            Medical Entries
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all disabled:opacity-50 text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Patient & Attendance Selection */}
      <PatientAttendanceSelector
        patients={patients}
        attendances={attendances}
        selectedPatientId={selectedPatientId}
        selectedAttendanceId={selectedAttendanceId}
        onPatientSelect={setSelectedPatientId}
        onAttendanceSelect={setSelectedAttendanceId}
        onClearSelection={handleClearSelection}
        placeholder="Select a visit to dispense medications..."
      />

      {/* Patient & Visit Header */}
      {selectedPatient && selectedAttendance && (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
          <div className="px-5 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center shadow-sm">
                <User className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-[var(--text-primary)] text-base">
                    {selectedPatient.surname} {selectedPatient.otherNames}
                  </h3>
                  <span className="text-xs text-[var(--text-secondary)]">
                    {selectedPatient.gender === 'male' ? '👨' : '👩'} • {selectedPatient.age || '?'}y
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-mono text-[10px] bg-[var(--bg-main)] px-1.5 py-0.5 rounded">#{selectedPatient.folderNumber}</span>
                  <span>•</span>
                  <span>{selectedPatient.contact}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="bg-[var(--bg-main)] px-2.5 py-1 rounded-full border border-[var(--border-color)]">
                <span className="text-xs font-mono text-[var(--text-secondary)]">
                  📋 {selectedAttendance.attendanceNumber || 'New Visit'}
                </span>
              </div>
              <div className="bg-[var(--bg-main)] px-2.5 py-1 rounded-full border border-[var(--border-color)]">
                <span className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                  📅 {new Date(selectedAttendance.dateTime || selectedAttendance.createdAt || '').toLocaleDateString()}
                </span>
              </div>
              {getStatusBadge(selectedAttendance.status)}
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {selectedAttendance && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{prescribedMeds.length}</p>
                <p className="text-xs text-[var(--text-secondary)]">Pending Dispense</p>
              </div>
            </div>
          </div>
          <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{dispensedMeds.length}</p>
                <p className="text-xs text-[var(--text-secondary)]">Dispensed</p>
              </div>
            </div>
          </div>
          <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Printer className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{prescribedMeds.length}</p>
                <p className="text-xs text-[var(--text-secondary)]">Ready to Print</p>
              </div>
            </div>
          </div>
          <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">
                  {prescribedMeds.length + dispensedMeds.length > 0 
                    ? Math.round((dispensedMeds.length / (prescribedMeds.length + dispensedMeds.length)) * 100) 
                    : 0}%
                </p>
                <p className="text-xs text-[var(--text-secondary)]">Completion Rate</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions Bar */}
      {selectedAttendance && canDispatch && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setIsPrescribeModalOpen(true)}
            className="flex items-center gap-2 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-700 hover:text-white transition-all text-sm"
          >
            <Plus className="w-4 h-4" />
            Prescribe Medication
          </button>
          {prescribedMeds.length > 0 && (
            <button
              onClick={handleDispenseAll}
              disabled={dispensingId === 'all'}
              className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-700 hover:text-white transition-all text-sm disabled:opacity-50"
            >
              {dispensingId === 'all' ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Package className="w-4 h-4" />
              )}
              Dispense All
            </button>
          )}
          {prescribedMeds.length > 0 && (
            <button
              onClick={() => handlePrintPrescription()}
              disabled={printingId === 'all'}
              className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-700 hover:text-white transition-all text-sm"
            >
              <Printer className="w-4 h-4" />
              Print All Prescriptions
            </button>
          )}
        </div>
      )}

      {/* Main Content */}
      {selectedAttendance ? (
        <div className="space-y-5">
          {/* Status Message */}
          {isReadOnly && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <p className="text-sm text-yellow-700">
                This visit is <strong>{selectedAttendance.status}</strong>. Medications can be viewed but not dispensed.
              </p>
            </div>
          )}

          {/* Ready for Dispensing Table - Show prescribed vs available */}
          {prescribedMeds.length > 0 && (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
              <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)]">
                <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Package className="w-4 h-4 text-yellow-600" />
                  Ready for Dispensing ({prescribedMeds.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)]">Medication</th>
                      <th className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)]">Dosage</th>
                      <th className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)]">Frequency</th>
                      <th className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)]">Prescribed Qty</th>
                      <th className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)]">Available Stock</th>
                      <th className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)]">Status</th>
                      <th className="px-4 py-2 text-center font-semibold text-[var(--text-secondary)]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {prescribedMeds.map((med) => {
                      const stockItem = stockItems.find(s => s.id === med.stockItemId);
                      const prescribedQty = med.originalQuantity || med.quantity || 1;
                      const hasStock = stockItem && stockItem.currentStock >= 1;
                      const isLowStock = stockItem && stockItem.currentStock < prescribedQty && stockItem.currentStock > 0;
                      
                      return (
                        <tr key={med.id} className="hover:bg-[var(--bg-main)] transition-colors">
                          <td className="px-4 py-2">
                            <div className="font-medium text-[var(--text-primary)]">{med.name}</div>
                            {med.instructions && (
                              <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">{med.instructions}</div>
                            )}
                          </td>
                          <td className="px-4 py-2 text-[var(--text-secondary)]">{med.dosage || '—'}</td>
                          <td className="px-4 py-2 text-[var(--text-secondary)]">{med.frequency || '—'}</td>
                          <td className="px-4 py-2 font-medium text-[var(--text-primary)]">{prescribedQty}</td>
                          <td className="px-4 py-2">
                            {stockItem ? (
                              <div className="flex items-center gap-1">
                                <span className={hasStock ? 'text-green-600' : isLowStock ? 'text-yellow-600' : 'text-red-600'}>
                                  {stockItem.currentStock}
                                </span>
                                <span className="text-[10px] text-[var(--text-secondary)]">{stockItem.unitOfMeasure || 'units'}</span>
                              </div>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-2">{getStatusBadge(med.status)}</td>
                          <td className="px-4 py-2">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handlePrintPrescription(med)}
                                disabled={printingId === med.id}
                                className="p-1.5 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                                title="Print Prescription"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              {canDispatch && stockItem && stockItem.currentStock > 0 && (
                                <button
                                  onClick={() => handleDispenseClick(med)}
                                  disabled={dispensingId === med.id}
                                  className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium hover:bg-green-700 hover:text-white transition-all"
                                >
                                  {dispensingId === med.id ? (
                                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mx-1" />
                                  ) : (
                                    `Dispense (Max ${Math.min(prescribedQty, stockItem.currentStock)})`
                                  )}
                                </button>
                              )}
                              {canDispatch && !stockItem && (
                                <span className="text-xs text-red-500">No stock item</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Dispensed Medications Table - Show actual dispensed quantity */}
          {dispensedMeds.length > 0 && (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
              <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)]">
                <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Dispensed Medications ({dispensedMeds.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)]">Medication</th>
                      <th className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)]">Dosage</th>
                      <th className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)]">Frequency</th>
                      <th className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)]">Prescribed Qty</th>
                      <th className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)]">Dispensed Qty</th>
                      <th className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)]">Dispensed On</th>
                      <th className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)]">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {dispensedMeds.map((med) => (
                      <tr key={med.id} className="hover:bg-[var(--bg-main)] transition-colors">
                        <td className="px-4 py-2 font-medium text-[var(--text-primary)]">{med.name}</td>
                        <td className="px-4 py-2 text-[var(--text-secondary)]">{med.dosage || '—'}</td>
                        <td className="px-4 py-2 text-[var(--text-secondary)]">{med.frequency || '—'}</td>
                        <td className="px-4 py-2 text-[var(--text-secondary)]">{med.prescribedQuantity || med.originalQuantity || '—'}</td>
                        <td className="px-4 py-2">
                          <span className="font-semibold text-green-600">{med.quantity || 1}</span>
                          {med.quantity !== (med.prescribedQuantity || med.originalQuantity) && (
                            <span className="text-[10px] text-yellow-600 ml-1">(partial)</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-[var(--text-secondary)] whitespace-nowrap">
                          {med.dispensedAt ? new Date(med.dispensedAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-2">{getStatusBadge(med.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* No Medications Message */}
          {allMedications.length === 0 && (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-8 text-center">
              <Package className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">No Medications</h3>
              <p className="text-sm text-[var(--text-secondary)]">
                No medications have been prescribed for this visit.
              </p>
              <button
                onClick={() => setIsPrescribeModalOpen(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-700 hover:text-white transition-all text-sm"
              >
                <Plus className="w-4 h-4" />
                Prescribe Medication
              </button>
            </div>
          )}
        </div>
      ) : selectedPatientId && !selectedAttendanceId ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-yellow-800 mb-1">No Attendance Selected</h3>
          <p className="text-sm text-yellow-700">Please select an attendance to dispense medications</p>
        </div>
      ) : null}

      {/* Dispense Quantity Modal */}
      {dispenseModal.isOpen && dispenseModal.medication && (
        <DispenseQuantityModal
          medication={dispenseModal.medication}
          stockItem={dispenseModal.stockItem}
          onConfirm={handleConfirmDispense}
          onClose={() => setDispenseModal({ isOpen: false, medication: null, stockItem: null })}
          isProcessing={dispensingId === dispenseModal.medication?.id}
        />
      )}

      {/* Prescribe Medication Modal */}
      {selectedAttendanceId && (
        <MedicationModal
          isOpen={isPrescribeModalOpen}
          onClose={() => setIsPrescribeModalOpen(false)}
          onSuccess={handlePrescribeSuccess}
          attendanceId={selectedAttendanceId}
          stockItems={stockItems}
          canAdd={canDispatch}
          userId={user?.id}
          userName={user?.fullName}
        />
      )}
    </div>
  );
}