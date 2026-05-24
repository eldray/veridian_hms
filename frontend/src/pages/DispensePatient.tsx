// src/pages/DispensePatient.tsx - Dispense Page for Specific Patient
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAttendanceStore } from '../store/attendanceStore';
import { usePatientStore } from '../store/patientStore';
import { useStockStore } from '../store/stockStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import { useHospitalStore } from '../store/hospitalStore';
import { MedicationModal } from '../components/medical-entries/modals/MedicationModal';
import { generatePDF, openPrintWindow } from '../utils/pdfGenerator';
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
  AlertTriangle,
  Clock,
  Calendar,
  Bed,
  Phone,
  Mail,
  MapPin,
  Syringe,
  History
} from 'lucide-react';

const getEntityId = (entity: { id?: string; _id?: string } | null): string | undefined =>
  entity?.id || entity?._id;

const getStatusBadge = (status: string) => {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    prescribed:   { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Prescribed' },
    dispensed:    { bg: 'bg-green-100', text: 'text-green-700', label: 'Dispensed' },
    administered: { bg: 'bg-cyan-100', text: 'text-cyan-700', label: 'Administered' },
    cancelled:    { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelled' },
  };
  const c = config[status] || config.prescribed;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
};

// Dispense Quantity Modal
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
      <div className="bg-white rounded-xl w-full max-w-md border border-gray-200 shadow-xl">
        <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 rounded-t-xl flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
            <Package className="w-4 h-4 text-green-600" />
            Dispense Medication
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <p className="font-semibold text-gray-900 text-sm">{medication.name}</p>
            <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
              <span>{medication.dosage || 'As directed'}</span>
              <span>·</span>
              <span>{medication.frequency || 'As prescribed'}</span>
              <span>·</span>
              <span>{medication.duration || 'As needed'}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
                className="w-28 px-3 py-2 text-center text-lg font-bold bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 text-gray-900"
              />
              <span className="text-sm text-gray-500">
                Available:{' '}
                <strong className="text-green-600">{maxQuantity}</strong>{' '}
                {stockItem?.unitOfMeasure || 'units'}
              </span>
            </div>
          </div>

          {medication.instructions && (
            <p className="text-sm text-gray-600">
              <span className="font-medium text-gray-700">Instructions:</span>{' '}
              {medication.instructions}
            </p>
          )}

          <div className="bg-green-50 rounded-lg p-3 border border-green-200">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Unit cost:</span>
              <span className="font-medium text-gray-900">
                GHS {(medication.unitCost || stockItem?.costPrice || 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-600">Total cost:</span>
              <span className="font-bold text-green-700">
                GHS {totalCost.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all text-sm text-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(quantity)}
              disabled={isProcessing}
              className="flex-1 px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50"
            >
              {isProcessing ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Confirm Dispense
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function DispensePatient() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { success, error: toastError } = useToast();
  const { hospital } = useHospitalStore();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dispensingId, setDispensingId] = useState<string | null>(null);
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [isPrescribeModalOpen, setIsPrescribeModalOpen] = useState(false);
  const [dispenseModal, setDispenseModal] = useState<{
    isOpen: boolean;
    medication: any;
    stockItem: any;
  }>({ isOpen: false, medication: null, stockItem: null });

  const { 
    attendances, 
    getAttendances, 
    updateMedicationStatus,
    getAttendance,
    calculateBill 
  } = useAttendanceStore();
  const { patients, loadPatients } = usePatientStore();
  const { stockItems, getStockItems } = useStockStore();
  const { user } = useAuthStore();

  // Get patient data from location state or fetch
  const [patient, setPatient] = useState<any>(null);
  const [attendance, setAttendance] = useState<any>(null);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);

  const loadData = async () => {
    try {
      setRefreshing(true);
      await Promise.all([loadPatients(), getAttendances(), getStockItems()]);
      
      // Find patient from location state or by ID
      let foundPatient = location.state?.patient;
      let foundAttendance = null;
      let foundPrescriptions = location.state?.prescriptions || [];
      
      if (!foundPatient && id) {
        foundPatient = patients.find(p => p.id === id);
      }
      
      if (foundPatient) {
        const attendanceId = location.state?.attendanceId;
        if (attendanceId) {
          foundAttendance = attendances.find(a => a.id === attendanceId);
          if (foundAttendance && !foundPrescriptions.length) {
            foundPrescriptions = (foundAttendance.Medication || []).filter((m: any) => m.status === 'prescribed');
          }
        }
      }
      
      setPatient(foundPatient);
      setAttendance(foundAttendance);
      setPrescriptions(foundPrescriptions);
      
    } catch (err: any) {
      toastError('Load failed', err.message);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const getStockItemForMedication = (medication: any) => {
    return stockItems.find(s => s.id === medication.stockItemId);
  };

  const handleDispenseClick = (medication: any) => {
    const stockItem = getStockItemForMedication(medication);
    if (!stockItem || stockItem.currentStock < 1) {
      toastError('Low stock', `Only ${stockItem?.currentStock || 0} available`);
      return;
    }
    setDispenseModal({ isOpen: true, medication, stockItem });
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
        dispensedUnitCost: stockItem?.costPrice || medication.unitCost || 0,
        batchNumber: stockItem?.batchNumber || null,
      });
      
      success(medication.name, `Dispensed ${quantity} unit(s) successfully`);
      
      // Refresh data
      await Promise.all([
        getAttendances(),
        getStockItems(),
        getAttendance(attendance.id),
        calculateBill(attendance.id),
      ]);
      
      // Update local prescriptions list
      const updatedPrescriptions = prescriptions.map(p => 
        p.id === medication.id ? { ...p, status: 'dispensed' } : p
      );
      setPrescriptions(updatedPrescriptions);
      
    } catch (err: any) {
      toastError('Dispense failed', err.response?.data?.message || err.message);
    } finally {
      setDispensingId(null);
      setDispenseModal({ isOpen: false, medication: null, stockItem: null });
    }
  };

  const handlePrintPrescription = async (medication?: any) => {
    if (!attendance?.id || !patient) {
      toastError('Error', 'Missing required information');
      return;
    }
    
    const medsToPrint = medication ? [medication] : prescriptions;
    if (medsToPrint.length === 0) {
      toastError('No prescriptions', 'No medications to print');
      return;
    }
    
    setPrintingId(medication?.id || 'all');
    try {
      const medicationsData = medsToPrint.map((med: any) => ({
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
      
      const htmlContent = generatePDF(
        'combinedPrescription',
        {
          medications: medicationsData,
          patient: {
            ...patient,
            fullName: `${patient.surname} ${patient.otherNames}`,
          },
          attendance: attendance,
          prescriberName: user?.fullName || 'Unknown',
        },
        hospital
      );
      
      openPrintWindow(htmlContent, `Prescription_${patient.folderNumber}`);
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
      getAttendance(attendance?.id),
      calculateBill(attendance?.id),
    ]);
    success('Medication prescribed', 'Prescription added successfully');
    await loadData();
  };

  const canDispense = attendance && ['pending', 'admitted'].includes(attendance.status);

  // Calculate age
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

  // Get dispensed medications history
  const dispensedHistory = useMemo(() => {
    if (!attendance?.Medication) return [];
    return attendance.Medication.filter((m: any) => m.status === 'dispensed')
      .sort((a: any, b: any) => new Date(b.dispensedAt).getTime() - new Date(a.dispensedAt).getTime());
  }, [attendance]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center bg-white p-8 rounded-xl shadow-sm border border-gray-200">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-900">Loading Patient Data...</h2>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center bg-white p-8 rounded-xl shadow-sm border border-gray-200">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">Patient Not Found</h2>
          <p className="text-gray-500">The patient you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/dashboard/dispense')}
            className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
          >
            Back to Waiting List
          </button>
        </div>
      </div>
    );
  }

  const prescribedMeds = prescriptions.filter(m => m.status === 'prescribed');
  const patientFullName = `${patient.surname} ${patient.otherNames}`;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard/dispense')}
              className="p-2 hover:bg-white rounded-lg transition-all border border-gray-200"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
              <Pill className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Dispense Medication</h1>
              <p className="text-sm text-gray-500">{patientFullName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPrescribeModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all text-sm"
              disabled={!canDispense}
            >
              <Plus className="w-4 h-4" />
              Prescribe New
            </button>
            {prescribedMeds.length > 0 && (
              <button
                onClick={() => handlePrintPrescription()}
                disabled={printingId === 'all'}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-all text-sm disabled:opacity-50"
              >
                <Printer className="w-4 h-4" />
                Print All
              </button>
            )}
            <button
              onClick={loadData}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50 text-sm text-gray-700"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Patient Information Card */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <User className="w-4 h-4 text-teal-600" />
              Patient Information
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Full Name</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{patientFullName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Folder Number</p>
                <p className="text-sm font-mono text-gray-900 mt-1">{patient.folderNumber}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Age & Gender</p>
                <p className="text-sm text-gray-900 mt-1 capitalize">{calculateAge(patient.dateOfBirth)} years • {patient.gender}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Contact</p>
                <p className="text-sm text-gray-900 mt-1">{patient.contact}</p>
              </div>
              {attendance && (
                <>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Ward / Bed</p>
                    <p className="text-sm text-gray-900 mt-1">
                      {attendance.ward?.wardName || '—'} / {attendance.bed?.bedNumber || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Admission Date</p>
                    <p className="text-sm text-gray-900 mt-1">
                      {new Date(attendance.dateTime).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Status</p>
                    <div className="mt-1">{getStatusBadge(attendance.status)}</div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Read-only warning */}
        {!canDispense && attendance && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <p className="text-sm text-yellow-700">
              This visit is <strong>{attendance.status}</strong>. Medications can be viewed but not dispensed.
            </p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-purple-600">{prescribedMeds.length}</div>
                <div className="text-xs text-gray-500 mt-1">To Dispense</div>
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Pill className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">{dispensedHistory.length}</div>
                <div className="text-xs text-gray-500 mt-1">Dispensed</div>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-teal-600">{prescribedMeds.length + dispensedHistory.length}</div>
                <div className="text-xs text-gray-500 mt-1">Total Prescribed</div>
              </div>
              <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-teal-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Prescribed Medications Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex justify-between items-center">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-purple-600" />
              Prescribed Medications ({prescribedMeds.length})
            </h2>
          </div>
          
          {prescribedMeds.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No prescribed medications</p>
              {canDispense && (
                <button
                  onClick={() => setIsPrescribeModalOpen(true)}
                  className="mt-3 text-teal-600 text-sm hover:underline"
                >
                  Prescribe new medication
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Medication</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Dosage</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Frequency</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Stock</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Qty</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Instructions</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {prescribedMeds.map((med) => {
                    const stockItem = getStockItemForMedication(med);
                    const stockAvailable = stockItem?.currentStock || 0;
                    const hasStock = stockAvailable >= (med.quantity || 1);
                    const isLowStock = stockAvailable > 0 && stockAvailable < (med.quantity || 1);
                    
                    return (
                      <tr key={med.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-900">{med.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Prescribed: {new Date(med.prescribedAt).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{med.dosage || '—'}</td>
                        <td className="px-6 py-4 text-gray-600">{med.frequency || '—'}</td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span className={`font-medium ${hasStock ? 'text-green-600' : isLowStock ? 'text-yellow-600' : 'text-red-600'}`}>
                              {stockAvailable}
                            </span>
                            <span className="text-xs text-gray-400">{stockItem?.unitOfMeasure || 'units'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center font-medium text-gray-900">
                          {med.quantity || 1}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-gray-500 max-w-xs block truncate">
                            {med.instructions || '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handlePrintPrescription(med)}
                              disabled={printingId === med.id}
                              className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                              title="Print Prescription"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            {canDispense && hasStock && (
                              <button
                                onClick={() => handleDispenseClick(med)}
                                disabled={dispensingId === med.id}
                                className="px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs font-medium flex items-center gap-1 disabled:opacity-50"
                              >
                                {dispensingId === med.id ? (
                                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Zap className="w-3 h-3" />
                                )}
                                Dispense
                              </button>
                            )}
                            {canDispense && isLowStock && (
                              <button
                                onClick={() => handleDispenseClick(med)}
                                disabled={dispensingId === med.id}
                                className="px-3 py-1.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-xs font-medium flex items-center gap-1 disabled:opacity-50"
                              >
                                Dispense ({stockAvailable} left)
                              </button>
                            )}
                            {canDispense && stockAvailable === 0 && (
                              <span className="text-xs text-red-600">Out of stock</span>
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

        {/* Dispensed History Table */}
        {dispensedHistory.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <History className="w-4 h-4 text-green-600" />
                Recently Dispensed
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date & Time</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Medication</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Quantity</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Unit Cost</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Dispensed By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {dispensedHistory.map((med: any) => (
                    <tr key={med.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                        {new Date(med.dispensedAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{med.name}</p>
                        <p className="text-xs text-gray-500">{med.dosage}</p>
                      </td>
                      <td className="px-6 py-4 text-center font-medium text-green-600">
                        {med.quantity || 1}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-600">
                        GHS {(med.dispensedUnitCost || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-gray-900">
                        GHS {((med.dispensedUnitCost || 0) * (med.quantity || 1)).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {med.dispensedBy?.fullName || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Dispense Modal */}
      {dispenseModal.isOpen && dispenseModal.medication && (
        <DispenseQuantityModal
          medication={dispenseModal.medication}
          stockItem={dispenseModal.stockItem}
          onConfirm={handleConfirmDispense}
          onClose={() => setDispenseModal({ isOpen: false, medication: null, stockItem: null })}
          isProcessing={dispensingId === dispenseModal.medication?.id}
        />
      )}

      {/* Prescribe Modal */}
      {attendance && (
        <MedicationModal
          isOpen={isPrescribeModalOpen}
          onClose={() => setIsPrescribeModalOpen(false)}
          onSuccess={handlePrescribeSuccess}
          attendanceId={attendance.id}
          stockItems={stockItems}
          canAdd={canDispense}
          userId={user?.id}
          userName={user?.fullName}
        />
      )}
    </div>
  );
}