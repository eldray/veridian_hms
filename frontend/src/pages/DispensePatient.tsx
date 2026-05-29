// src/pages/DispensePatient.tsx - Dispense Page for Specific Patient (WITH PatientAttendanceSelector)
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
  History,
  Eye,
  Building,
  CreditCard,
  Shield,
  Stethoscope
} from 'lucide-react';

const getEntityId = (entity: { id?: string; _id?: string } | null): string | undefined =>
  entity?.id || entity?._id;

const getStatusBadge = (status: string) => {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    prescribed:   { bg: 'bg-[var(--icon-purple-bg)]', text: 'text-[var(--icon-purple-text)]', label: 'Prescribed' },
    dispensed:    { bg: 'bg-[var(--icon-green-bg)]',  text: 'text-[var(--icon-green-text)]',  label: 'Dispensed' },
    administered: { bg: 'bg-[var(--icon-cyan-bg)]',   text: 'text-[var(--icon-cyan-text)]',   label: 'Administered' },
    cancelled:    { bg: 'bg-[var(--icon-red-bg)]',    text: 'text-[var(--icon-red-text)]',    label: 'Cancelled' },
  };
  const c = config[status] || config.prescribed;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
};

// Stats Card Component
const StatCard = ({ title, value, icon: Icon, color }: any) => (
  <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
        <p className="text-xs text-[var(--text-secondary)] mt-1">{title}</p>
      </div>
      <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  </div>
);

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
      <div className="bg-[var(--bg-card)] rounded-xl w-full max-w-md border border-[var(--border-color)] shadow-xl">
        <div className="bg-[var(--bg-main)] px-5 py-3 border-b border-[var(--border-color)] rounded-t-xl flex items-center justify-between">
          <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2 text-sm">
            <Package className="w-4 h-4 text-[var(--icon-green-text)]" />
            Dispense Medication
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-[var(--bg-main)] rounded-lg transition-colors">
            <X className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
        </div>

        <div className="p-5 space-y-4">
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

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
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
              className="flex-1 px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 text-white bg-[var(--icon-green-text)] hover:opacity-90 disabled:opacity-50"
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
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedAttendanceId, setSelectedAttendanceId] = useState<string>('');
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

  // Get patient from location state or fetch by ID
  const [patient, setPatient] = useState<any>(null);
  const [attendance, setAttendance] = useState<any>(null);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [allAttendances, setAllAttendances] = useState<any[]>([]);

  const loadData = async () => {
    try {
      setRefreshing(true);
      await Promise.all([loadPatients(), getAttendances(), getStockItems()]);
      
      let foundPatient = location.state?.patient;
      
      if (!foundPatient && id) {
        foundPatient = patients.find(p => p.id === id);
      }
      
      if (foundPatient) {
        setPatient(foundPatient);
        setSelectedPatientId(foundPatient.id);
        
        // Get all attendances for this patient
        const patientAttendances = attendances.filter(a => a.patientId === foundPatient.id);
        setAllAttendances(patientAttendances);
        
        // Set initial attendance from location state or most recent
        const initialAttendanceId = location.state?.attendanceId;
        if (initialAttendanceId) {
          const foundAttendance = attendances.find(a => a.id === initialAttendanceId);
          if (foundAttendance) {
            setSelectedAttendanceId(initialAttendanceId);
            setAttendance(foundAttendance);
            const prescribedMeds = (foundAttendance.Medication || []).filter((m: any) => m.status === 'prescribed');
            setPrescriptions(prescribedMeds);
          }
        } else if (patientAttendances.length > 0) {
          // Select most recent attendance
          const mostRecent = patientAttendances.sort((a, b) => 
            new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
          )[0];
          setSelectedAttendanceId(mostRecent.id);
          setAttendance(mostRecent);
          const prescribedMeds = (mostRecent.Medication || []).filter((m: any) => m.status === 'prescribed');
          setPrescriptions(prescribedMeds);
        }
      }
      
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

  // Handle attendance change
  const handleAttendanceChange = (attendanceId: string) => {
    const newAttendance = allAttendances.find(a => a.id === attendanceId);
    if (newAttendance) {
      setSelectedAttendanceId(attendanceId);
      setAttendance(newAttendance);
      const prescribedMeds = (newAttendance.Medication || []).filter((m: any) => m.status === 'prescribed');
      setPrescriptions(prescribedMeds);
    }
  };

  const handleClearSelection = () => {
    setSelectedAttendanceId('');
    setAttendance(null);
    setPrescriptions([]);
  };

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
      
      await Promise.all([
        getAttendances(),
        getStockItems(),
        getAttendance(attendance.id),
        calculateBill(attendance.id),
      ]);
      
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

  const prescribedMeds = prescriptions.filter(m => m.status === 'prescribed');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
        <div className="text-center bg-[var(--bg-card)] p-8 rounded-xl border border-[var(--border-color)]">
          <div className="w-12 h-12 border-4 border-[var(--icon-cyan-text)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Loading Patient Data...</h2>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
        <div className="text-center bg-[var(--bg-card)] p-8 rounded-xl border border-[var(--border-color)]">
          <AlertCircle className="w-12 h-12 text-[var(--icon-red-text)] mx-auto mb-3" />
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">Patient Not Found</h2>
          <p className="text-[var(--text-secondary)]">The patient you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/dashboard/dispense')}
            className="mt-4 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all"
          >
            Back to Waiting List
          </button>
        </div>
      </div>
    );
  }

  const patientFullName = `${patient.surname} ${patient.otherNames}`;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard/dispense')}
            className="p-2 hover:bg-[var(--bg-card)] rounded-lg transition-all border border-[var(--border-color)]"
          >
            <ChevronLeft className="w-5 h-5 text-[var(--text-primary)]" />
          </button>
          <div className="w-10 h-10 bg-[var(--icon-green-bg)] rounded-xl flex items-center justify-center">
            <Pill className="w-5 h-5 text-[var(--icon-green-text)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Dispense Medication</h1>
            <p className="text-sm text-[var(--text-secondary)]">{patientFullName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPrescribeModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] rounded-lg hover:bg-[var(--icon-purple-text)] hover:text-white transition-all text-sm"
            disabled={!canDispense}
          >
            <Plus className="w-4 h-4" />
            Prescribe New
          </button>
          {prescribedMeds.length > 0 && (
            <button
              onClick={() => handlePrintPrescription()}
              disabled={printingId === 'all'}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              Print All
            </button>
          )}
          <button
            onClick={loadData}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all disabled:opacity-50 text-sm text-[var(--text-primary)]"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Patient & Attendance Selector */}
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
          setPrescriptions([]);
        }}
        onAttendanceSelect={(attendanceId) => handleAttendanceChange(attendanceId)}
        onClearSelection={handleClearSelection}
      />

      {/* Patient Information Card */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
        <div className="bg-[var(--bg-main)] px-6 py-3 border-b border-[var(--border-color)]">
          <h2 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <User className="w-4 h-4 text-[var(--icon-cyan-text)]" />
            Patient Information
          </h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Full Name</p>
              <p className="text-sm font-medium text-[var(--text-primary)] mt-1">{patientFullName}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Folder Number</p>
              <p className="text-sm font-mono text-[var(--text-primary)] mt-1">{patient.folderNumber}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Age & Gender</p>
              <p className="text-sm text-[var(--text-primary)] mt-1 capitalize">{calculateAge(patient.dateOfBirth)} years • {patient.gender}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Contact</p>
              <p className="text-sm text-[var(--text-primary)] mt-1">{patient.contact}</p>
            </div>
            {attendance && (
              <>
                <div>
                  <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Ward / Bed</p>
                  <p className="text-sm text-[var(--text-primary)] mt-1">
                    {attendance.ward?.wardName || '—'} / {attendance.bed?.bedNumber || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Admission Date</p>
                  <p className="text-sm text-[var(--text-primary)] mt-1">
                    {new Date(attendance.dateTime).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Status</p>
                  <div className="mt-1">{getStatusBadge(attendance.status)}</div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Read-only warning */}
      {selectedAttendanceId && !attendance && (
        <div className="bg-[var(--icon-yellow-bg)] border border-[var(--icon-yellow-text)] rounded-xl p-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-[var(--icon-yellow-text)]" />
          <p className="text-sm text-[var(--icon-yellow-text)]">
            Please select an attendance to view and dispense medications.
          </p>
        </div>
      )}

      {attendance && !canDispense && (
        <div className="bg-[var(--icon-yellow-bg)] border border-[var(--icon-yellow-text)] rounded-xl p-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-[var(--icon-yellow-text)]" />
          <p className="text-sm text-[var(--icon-yellow-text)]">
            This visit is <strong>{attendance.status}</strong>. Medications can be viewed but not dispensed.
          </p>
        </div>
      )}

      {/* No Attendance Selected */}
      {!selectedAttendanceId && patient && (
        <div className="bg-[var(--icon-yellow-bg)] border border-[var(--icon-yellow-text)] rounded-xl p-8 text-center">
          <Calendar className="w-12 h-12 text-[var(--icon-yellow-text)] mx-auto mb-3 opacity-50" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No Attendance Selected</h3>
          <p className="text-[var(--text-secondary)]">Please select an attendance from the dropdown above to view prescriptions.</p>
        </div>
      )}

      {/* Stats Cards - Only show when attendance selected */}
      {selectedAttendanceId && attendance && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard 
            title="To Dispense" 
            value={prescribedMeds.length} 
            icon={Pill}
            color="bg-[var(--icon-purple-bg)]"
          />
          <StatCard 
            title="Dispensed" 
            value={dispensedHistory.length} 
            icon={CheckCircle}
            color="bg-[var(--icon-green-bg)]"
          />
          <StatCard 
            title="Total Prescribed" 
            value={prescribedMeds.length + dispensedHistory.length} 
            icon={FileText}
            color="bg-[var(--icon-cyan-bg)]"
          />
        </div>
      )}

      {/* Prescribed Medications Table - Only show when attendance selected */}
      {selectedAttendanceId && attendance && (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
          <div className="bg-[var(--bg-main)] px-6 py-3 border-b border-[var(--border-color)] flex justify-between items-center">
            <h2 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Package className="w-4 h-4 text-[var(--icon-purple-text)]" />
              Prescribed Medications ({prescribedMeds.length})
            </h2>
          </div>
          
          {prescribedMeds.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
              <p className="text-[var(--text-secondary)]">No prescribed medications for this visit</p>
              {canDispense && (
                <button
                  onClick={() => setIsPrescribeModalOpen(true)}
                  className="mt-3 text-[var(--icon-cyan-text)] text-sm hover:underline"
                >
                  Prescribe new medication
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Medication</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Dosage</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Frequency</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-secondary)] uppercase">Stock</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-secondary)] uppercase">Qty</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Instructions</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-secondary)] uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {prescribedMeds.map((med) => {
                    const stockItem = getStockItemForMedication(med);
                    const stockAvailable = stockItem?.currentStock || 0;
                    const hasStock = stockAvailable >= (med.quantity || 1);
                    const isLowStock = stockAvailable > 0 && stockAvailable < (med.quantity || 1);
                    
                    return (
                      <tr key={med.id} className="hover:bg-[var(--bg-main)] transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-[var(--text-primary)]">{med.name}</p>
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                            Prescribed: {new Date(med.prescribedAt).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-[var(--text-secondary)]">{med.dosage || '—'}</td>
                        <td className="px-4 py-3 text-[var(--text-secondary)]">{med.frequency || '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span className={`font-medium ${hasStock ? 'text-[var(--icon-green-text)]' : isLowStock ? 'text-[var(--icon-yellow-text)]' : 'text-[var(--icon-red-text)]'}`}>
                              {stockAvailable}
                            </span>
                            <span className="text-xs text-[var(--text-tertiary)]">{stockItem?.unitOfMeasure || 'units'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center font-medium text-[var(--text-primary)]">
                          {med.quantity || 1}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-[var(--text-secondary)] max-w-xs block truncate">
                            {med.instructions || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handlePrintPrescription(med)}
                              disabled={printingId === med.id}
                              className="p-1.5 text-[var(--icon-purple-text)] hover:bg-[var(--icon-purple-bg)] rounded-lg transition-colors"
                              title="Print Prescription"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            {canDispense && hasStock && (
                              <button
                                onClick={() => handleDispenseClick(med)}
                                disabled={dispensingId === med.id}
                                className="px-3 py-1.5 bg-[var(--icon-green-text)] text-white rounded-lg hover:opacity-90 text-xs font-medium flex items-center gap-1 disabled:opacity-50"
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
                                className="px-3 py-1.5 bg-[var(--icon-yellow-text)] text-white rounded-lg hover:opacity-90 text-xs font-medium flex items-center gap-1 disabled:opacity-50"
                              >
                                Dispense ({stockAvailable} left)
                              </button>
                            )}
                            {canDispense && stockAvailable === 0 && (
                              <span className="text-xs text-[var(--icon-red-text)]">Out of stock</span>
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
      )}

      {/* Dispensed History Table - Only show when attendance selected */}
      {selectedAttendanceId && attendance && dispensedHistory.length > 0 && (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
          <div className="bg-[var(--bg-main)] px-6 py-3 border-b border-[var(--border-color)]">
            <h2 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <History className="w-4 h-4 text-[var(--icon-green-text)]" />
              Recently Dispensed
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Date & Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Medication</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-secondary)] uppercase">Quantity</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-secondary)] uppercase">Unit Cost</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-secondary)] uppercase">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Dispensed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {dispensedHistory.map((med: any) => (
                  <tr key={med.id} className="hover:bg-[var(--bg-main)] transition-colors">
                    <td className="px-4 py-3 text-[var(--text-secondary)] whitespace-nowrap">
                      {new Date(med.dispensedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[var(--text-primary)]">{med.name}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{med.dosage}</p>
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-[var(--icon-green-text)]">
                      {med.quantity || 1}
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--text-secondary)]">
                      GHS {(med.dispensedUnitCost || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-[var(--text-primary)]">
                      GHS {((med.dispensedUnitCost || 0) * (med.quantity || 1)).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {med.dispensedBy?.fullName || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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