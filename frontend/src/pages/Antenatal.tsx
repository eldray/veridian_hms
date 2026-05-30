// src/pages/Antenatal.tsx - WITH BED/WARD ASSIGNMENT FOR MATERNAL ADMISSIONS
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAntenatalStore } from '../store/antenatalStore';
import { useDeliveryStore } from '../store/deliveryStore';
import { usePostnatalStore } from '../store/postnatalStore';
import { useAttendanceStore } from '../store/attendanceStore';
import { usePatientStore } from '../store/patientStore';
import { useMedicalServicesStore } from '../store/medicalServicesStore';
import { useStockStore } from '../store/stockStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import { useWardStore } from '../store/wardStore'; // ✅ ADD THIS
import { useAdmissionStore } from '../store/admissionStore'; // ✅ ADD THIS
import { PatientAttendanceSelector } from '../components/vitals/PatientAttendanceSelector';
import { VitalsDisplay } from '../components/medical-entries/VitalsDisplay';
import NewAttendanceModal from '../components/NewAttendanceModal';
import { ANCVisitModal } from '../components/antenatal/ANCVisitModal';
import { DeliveryModal } from '../components/delivery/DeliveryModal';
import { PostnatalModal } from '../components/postnatal/PostnatalModal';
import { DiagnosisModal } from '../components/medical-entries/modals/DiagnosisModal';
import { LabTestModal } from '../components/medical-entries/modals/LabTestModal';
import { ProcedureModal } from '../components/medical-entries/modals/ProcedureModal';
import { MedicationModal } from '../components/medical-entries/modals/MedicationModal';
import { ScanModal } from '../components/medical-entries/modals/ScanModal';

import {
  ChevronLeft, RefreshCw, X, Stethoscope, Pill, FlaskConical, Scissors,
  Scan, FileText, Activity, AlertCircle, Plus, Trash2, Edit, User, Calendar,
  Baby, Heart, Droplet, Shield, CheckCircle, Clock, AlertTriangle, Syringe,
  Ruler, Weight, TrendingUp, Eye, Hospital, Users, Bed, Building2, Moon, Sun,
} from 'lucide-react';

const getEntityId = (e: { id?: string; _id?: string } | null) => e?._id || e?.id;
type ModalType = 'diagnosis' | 'lab' | 'procedure' | 'medication' | 'scan' | 'anc_booking' | 'delivery' | 'postnatal' | null;

function calculateAge(dob: Date): number {
  if (!dob) return 0;
  const today = new Date(), b = new Date(dob);
  let age = today.getFullYear() - b.getFullYear();
  if (today.getMonth() < b.getMonth() || (today.getMonth() === b.getMonth() && today.getDate() < b.getDate())) age--;
  return age;
}

// ── Shared primitives ─────────────────────────────────────────────────────────
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, string> = {
    pending:    'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]',
    requested:  'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]',
    scheduled:  'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]',
    prescribed: 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]',
    completed:  'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]',
    cancelled:  'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]',
    dispensed:  'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${map[status?.toLowerCase()] ?? 'bg-[var(--bg-main)] text-[var(--text-secondary)]'}`}>
      {status}
    </span>
  );
};

const RiskBadge: React.FC<{ risk: string }> = ({ risk }) => {
  const map: Record<string, string> = {
    low:    'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]',
    medium: 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]',
    high:   'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${map[risk?.toLowerCase()] ?? map.low}`}>
      {risk?.toUpperCase()} RISK
    </span>
  );
};

const SectionCard: React.FC<{
  icon: React.ReactNode; title: string; count?: number;
  countCls?: string; action?: React.ReactNode; children: React.ReactNode; maxH?: string;
}> = ({ icon, title, count, countCls = 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]', action, children, maxH = 'max-h-72' }) => (
  <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden flex flex-col">
    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-main)] flex-shrink-0">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-semibold text-[var(--text-primary)] tracking-tight">{title}</span>
        {count !== undefined && count > 0 && (
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${countCls}`}>{count}</span>
        )}
      </div>
      {action}
    </div>
    <div className={`${maxH} overflow-y-auto`} style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--border-color) transparent' }}>
      {children}
    </div>
  </div>
);

const EmptySlate: React.FC<{ icon: React.ReactNode; label: string; action?: React.ReactNode }> = ({ icon, label, action }) => (
  <div className="flex flex-col items-center justify-center py-10 gap-2.5">
    <div className="opacity-20">{icon}</div>
    <p className="text-xs text-[var(--text-tertiary)]">{label}</p>
    {action}
  </div>
);

const AddBtn: React.FC<{ onClick: () => void; label: string }> = ({ onClick, label }) => (
  <button onClick={onClick}
    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold
      bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]
      hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all">
    <Plus className="w-3 h-3" />{label}
  </button>
);

const DelBtn: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button onClick={onClick}
    className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--icon-red-text)] hover:bg-[var(--icon-red-bg)] transition-all">
    <Trash2 className="w-3.5 h-3.5" />
  </button>
);

const TH: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] whitespace-nowrap">{children}</th>
);
const TD: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <td className={`px-3 py-2 text-[var(--text-secondary)] text-xs ${className}`}>{children}</td>
);
const TDp: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <td className="px-3 py-2 text-[var(--text-primary)] text-xs font-medium">{children}</td>
);

// ── Modal shell ───────────────────────────────────────────────────────────────
const ModalShell: React.FC<{ title: string; subtitle?: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; maxW?: string }> =
  ({ title, subtitle, onClose, children, footer, maxW = 'max-w-2xl' }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-[var(--bg-card)] rounded-xl w-full ${maxW} border border-[var(--border-color)] overflow-hidden flex flex-col`}
        style={{ maxHeight: '85vh', boxShadow: 'var(--shadow-md)' }}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-color)] bg-[var(--bg-main)] flex-shrink-0">
          <div>
            <p className="text-sm font-bold text-[var(--text-primary)]">{title}</p>
            {subtitle && <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-color)] transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5" style={{ scrollbarWidth: 'thin' }}>{children}</div>
        {footer && <div className="flex-shrink-0 px-5 py-3.5 border-t border-[var(--border-color)] bg-[var(--bg-main)]">{footer}</div>}
      </div>
    </div>
  );

// ── Detail row for modals ─────────────────────────────────────────────────────
const DetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div>
    <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-0.5">{label}</p>
    <p className="text-xs font-medium text-[var(--text-primary)]">{value || '—'}</p>
  </div>
);

// ═════════════════════════════════════════════════════════════════════════════
// ─── NEW: Bed/Ward Selection Modal for Antenatal ───────────────────────────
const BedWardSelectionModalAntenatal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (bedId: string, wardId: string, wardName: string, bedNumber: string) => Promise<void>;
  admissionType: 'antenatal_observation' | 'delivery' | 'postpartum_observation';
  isLoading: boolean;
}> = ({ isOpen, onClose, onConfirm, admissionType, isLoading }) => {
  const { wards, availableBeds, getWards, getAvailableBeds, isLoading: wardsLoading } = useWardStore();
  const [selectedWardId, setSelectedWardId] = useState('');
  const [selectedBedId, setSelectedBedId] = useState('');
  const [availableBedsInWard, setAvailableBedsInWard] = useState<any[]>([]);
  const [selectedWardName, setSelectedWardName] = useState('');
  const [selectedBedNumber, setSelectedBedNumber] = useState('');

  useEffect(() => {
    if (isOpen) {
      getWards();
      getAvailableBeds();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedWardId) {
      const wardBeds = availableBeds.filter(bed => bed.wardId === selectedWardId);
      setAvailableBedsInWard(wardBeds);
      setSelectedBedId('');
      setSelectedBedNumber('');
    } else {
      setAvailableBedsInWard([]);
    }
  }, [selectedWardId, availableBeds]);

  const handleConfirm = () => {
    if (!selectedWardId || !selectedBedId) return;
    onConfirm(selectedBedId, selectedWardId, selectedWardName, selectedBedNumber);
  };

  const getTitle = () => {
    switch (admissionType) {
      case 'antenatal_observation': return 'Admit for Antenatal Observation';
      case 'delivery': return 'Admit for Delivery';
      case 'postpartum_observation': return 'Admit for Postpartum Observation';
      default: return 'Assign Bed';
    }
  };

  const getSubtitle = () => {
    switch (admissionType) {
      case 'antenatal_observation': return 'Patient needs bed rest / monitoring during pregnancy';
      case 'delivery': return 'Patient in active labor - needs delivery bed';
      case 'postpartum_observation': return 'Post-delivery monitoring (24-72 hours)';
      default: return '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--bg-card)] rounded-xl w-full max-w-2xl border border-[var(--border-color)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
          <div className="flex items-center gap-2">
            <Bed className="w-4 h-4 text-pink-500" />
            <span className="text-sm font-bold text-[var(--text-primary)]">{getTitle()}</span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--border-color)]">
            <X className="w-4 h-4 text-[var(--text-tertiary)]" />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Info banner */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-pink-50 border border-pink-200">
            <AlertCircle className="w-4 h-4 text-pink-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-[var(--text-primary)]">Maternal Bed Assignment Required</p>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{getSubtitle()}</p>
            </div>
          </div>

          {wardsLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Step 1: Select Ward */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] mb-2">
                  <Building2 className="w-3.5 h-3.5" />
                  Step 1: Select Ward
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {wards.filter(w => w.isActive !== false && (w.wardType === 'maternity' || w.wardType === 'delivery' || w.wardType === 'antenatal')).map((ward) => {
                    const availableCount = availableBeds.filter(b => b.wardId === ward.id).length;
                    const isSelected = selectedWardId === ward.id;
                    return (
                      <button
                        key={ward.id}
                        onClick={() => { setSelectedWardId(ward.id); setSelectedWardName(ward.wardName); }}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          isSelected 
                            ? 'border-pink-500 bg-pink-50 ring-1 ring-pink-500'
                            : 'border-[var(--border-color)] hover:border-pink-300 hover:bg-[var(--bg-main)]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-[var(--text-primary)]">{ward.wardName}</span>
                          {availableCount > 0 ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]">
                              {availableCount} beds
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]">
                              Full
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                          Type: {ward.wardType} · Total: {ward.totalBeds}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Select Bed */}
              {selectedWardId && (
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] mb-2">
                    <Bed className="w-3.5 h-3.5" />
                    Step 2: Select Bed in {selectedWardName}
                  </label>
                  {availableBedsInWard.length === 0 ? (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <span className="text-xs text-[var(--text-secondary)]">No available beds in this ward. Please select another ward.</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {availableBedsInWard.map((bed) => (
                        <button
                          key={bed.id}
                          onClick={() => { setSelectedBedId(bed.id); setSelectedBedNumber(bed.bedNumber); }}
                          className={`p-2 rounded-lg border text-center transition-all ${
                            selectedBedId === bed.id
                              ? 'border-pink-500 bg-pink-50 ring-1 ring-pink-500'
                              : 'border-[var(--border-color)] hover:border-pink-300 hover:bg-[var(--bg-main)]'
                          }`}
                        >
                          <Bed className="w-4 h-4 mx-auto mb-1 text-[var(--text-secondary)]" />
                          <span className="text-xs font-semibold text-[var(--text-primary)]">Bed {bed.bedNumber}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-[var(--border-color)] bg-[var(--bg-main)]">
          <button
            onClick={handleConfirm}
            disabled={!selectedWardId || !selectedBedId || isLoading}
            className="flex-1 py-2 rounded-lg text-sm font-semibold bg-pink-500 text-white 
              hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? 'Processing...' : 'Confirm Admission'}
          </button>
          <button onClick={onClose}
            className="flex-1 py-2 rounded-lg text-sm font-semibold border border-[var(--border-color)]
              text-[var(--text-secondary)] hover:bg-[var(--bg-main)] transition-all">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
export default function Antenatal() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const { user } = useAuthStore();

  const { patients, loadPatients } = usePatientStore();
  const {
    attendances, currentAttendance, getAttendance, getAttendances,
    removeDiagnosis, removeLabTest, removeProcedure, removeMedication, removeScan,
    canAddMedicalEntries, getVitalsByAttendance, calculateBill, updateAttendance,
  } = useAttendanceStore();
  const { diagnoses, labTestTemplates, procedureTemplates, scanTemplates,
    getDiagnoses, getLabTestTemplates, getProcedureTemplates, getScanTemplates } = useMedicalServicesStore();
  const { stockItems, getStockItems } = useStockStore();
  const { currentBooking, currentVisits, getBooking, getANCVisitsByBooking,
    createBooking, deleteVisit, isLoading: ancLoading } = useAntenatalStore();
  const { deliveries, getDeliveries, deleteDelivery } = useDeliveryStore();
  const { postnatalRecords, getPostnatals, deletePostnatal } = usePostnatalStore();
  const { updateBed } = useWardStore();
  const { createAdmission, getAdmissions } = useAdmissionStore();

  const [isLoading, setIsLoading]                   = useState(true);
  const [refreshing, setRefreshing]                 = useState(false);
  const [selectedPatientId, setSelectedPatientId]   = useState('');
  const [selectedAttendanceId, setSelectedAttendanceId] = useState('');
  const [latestVitals, setLatestVitals]             = useState<any>(null);
  const [activeTab, setActiveTab]                   = useState<'clinical' | 'anc' | 'delivery' | 'postnatal' | 'vitals'>('clinical');
  const [modalType, setModalType]                   = useState<ModalType>(null);
  const [showNewAttendance, setShowNewAttendance]   = useState(false);

  const [showANCVisitModal, setShowANCVisitModal]   = useState(false);
  const [selectedBookingId, setSelectedBookingId]   = useState('');
  const [editingVisit, setEditingVisit]             = useState<any>(null);
  const [showDeliveryModal, setShowDeliveryModal]   = useState(false);
  const [editingDelivery, setEditingDelivery]       = useState<any>(null);
  const [showPostnatalModal, setShowPostnatalModal] = useState(false);
  const [editingPostnatal, setEditingPostnatal]     = useState<any>(null);

  const [selectedVisit, setSelectedVisit]           = useState<any>(null);
  const [showVisitDetails, setShowVisitDetails]     = useState(false);
  const [selectedDelivery, setSelectedDelivery]     = useState<any>(null);
  const [showDeliveryDetails, setShowDeliveryDetails] = useState(false);
  const [selectedPostnatal, setSelectedPostnatal]   = useState<any>(null);
  const [showPostnatalDetails, setShowPostnatalDetails] = useState(false);

  // Bed/Ward Admission States
  const [showBedWardModal, setShowBedWardModal] = useState(false);
  const [pendingAdmissionType, setPendingAdmissionType] = useState<'antenatal_observation' | 'delivery' | 'postpartum_observation' | null>(null);
  const [isProcessingAdmission, setIsProcessingAdmission] = useState(false);

  const antenatalAttendances = useMemo(() => attendances.filter(a => a.attendanceType === 'antenatal'), [attendances]);
  const deliveryAttendances  = useMemo(() => attendances.filter(a => a.attendanceType === 'delivery'),  [attendances]);
  const postnatalAttendances = useMemo(() => attendances.filter(a => a.attendanceType === 'postnatal'), [attendances]);

  const getCurrentAttendances = () => {
    if (activeTab === 'anc')      return antenatalAttendances;
    if (activeTab === 'delivery') return deliveryAttendances;
    if (activeTab === 'postnatal')return postnatalAttendances;
    return attendances;
  };

  const selectedPatient  = patients.find(p => getEntityId(p) === selectedPatientId);
  const canAddEntries    = currentAttendance ? canAddMedicalEntries(currentAttendance) : false;
  const hasActiveBooking = currentBooking?.isActive === true && currentBooking?.isCompleted === false;

  const diagnosesList   = currentAttendance?.AttendanceDiagnosis || [];
  const labTestsList    = currentAttendance?.LabTest || [];
  const proceduresList  = currentAttendance?.Procedure || [];
  const medicationsList = currentAttendance?.Medication || [];
  const scansList       = currentAttendance?.Scan || [];
  const prescribedMeds  = medicationsList.filter((m: any) => m.status === 'prescribed');
  const dispensedMeds   = medicationsList.filter((m: any) => m.status === 'dispensed');
  const requestedScans  = scansList.filter((s: any) => s.status === 'requested' || s.status === 'scheduled');
  const completedScans  = scansList.filter((s: any) => s.status === 'completed');

  const currentAttendanceVisit = useMemo(
    () => currentVisits.find(v => v.attendanceId === selectedAttendanceId),
    [currentVisits, selectedAttendanceId]
  );

  const iptpSummary = useMemo(() => ({
    dose1: currentVisits.filter(v => v.iptpGiven && v.iptpDoseNumber === 1).length,
    dose2: currentVisits.filter(v => v.iptpGiven && v.iptpDoseNumber === 2).length,
    dose3: currentVisits.filter(v => v.iptpGiven && v.iptpDoseNumber === 3).length,
    dose4: currentVisits.filter(v => v.iptpGiven && v.iptpDoseNumber === 4).length,
    dose5: currentVisits.filter(v => v.iptpGiven && v.iptpDoseNumber >= 5).length,
  }), [currentVisits]);

  const ttSummary = useMemo(() => ({
    dose1: currentVisits.filter(v => v.ttGiven && v.ttDoseNumber === 1).length,
    dose2: currentVisits.filter(v => v.ttGiven && v.ttDoseNumber === 2).length,
    dose3: currentVisits.filter(v => v.ttGiven && v.ttDoseNumber === 3).length,
    tt2Plus: currentVisits.filter(v => v.ttGiven && v.ttDoseNumber >= 2).length,
  }), [currentVisits]);

  const getEDDDisplay = () => {
    if (!currentBooking?.edd) return 'N/A';
    const edd = new Date(currentBooking.edd);
    const daysLeft = Math.ceil((edd.getTime() - Date.now()) / 864e5);
    return `${edd.toLocaleDateString()} (${daysLeft}d left)`;
  };

  const loadData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadPatients(), getAttendances(), getStockItems(), getDiagnoses(),
        getLabTestTemplates(), getProcedureTemplates(), getScanTemplates(),
        getDeliveries(), getPostnatals(),
      ]);
    } catch (err: any) { toastError('Load failed', err.message); }
    finally { setRefreshing(false); setIsLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (!selectedAttendanceId) return;
    getVitalsByAttendance(selectedAttendanceId).then(v => setLatestVitals(v?.length ? v[v.length - 1] : null)).catch(() => setLatestVitals(null));
    getAttendance(selectedAttendanceId);
  }, [selectedAttendanceId]);

  useEffect(() => {
    if (!selectedPatientId) return;
    getBooking(selectedPatientId).catch(() => {});
    getDeliveries({ patientId: selectedPatientId }).catch(() => {});
    getPostnatals({ patientId: selectedPatientId }).catch(() => {});
  }, [selectedPatientId]);

  useEffect(() => { if (currentBooking?.id) getANCVisitsByBooking(currentBooking.id); }, [currentBooking]);

  useEffect(() => {
    if (!currentAttendance?.attendanceType) return;
    const t = currentAttendance.attendanceType;
    if (t === 'antenatal') setActiveTab('anc');
    else if (t === 'delivery') setActiveTab('delivery');
    else if (t === 'postnatal') setActiveTab('postnatal');
    else setActiveTab('clinical');
  }, [currentAttendance?.attendanceType, selectedAttendanceId]);

  useEffect(() => { if (!selectedPatientId) setActiveTab('clinical'); }, [selectedPatientId]);

  const handleClearSelection = () => { setSelectedPatientId(''); setSelectedAttendanceId(''); };

  const handleDeleteItem = async (type: string, id: string) => {
    if (!selectedAttendanceId) return;
    try {
      const fn: Record<string, () => Promise<void>> = {
        diagnosis:  () => removeDiagnosis(selectedAttendanceId, id),
        lab:        () => removeLabTest(selectedAttendanceId, id),
        procedure:  () => removeProcedure(selectedAttendanceId, id),
        medication: () => removeMedication(selectedAttendanceId, id),
        scan:       () => removeScan(selectedAttendanceId, id),
      };
      await fn[type]?.();
      success('Removed', 'Item deleted');
      await getAttendance(selectedAttendanceId);
      await calculateBill(selectedAttendanceId);
    } catch (err: any) { toastError('Delete failed', err.message); }
  };

  const handleEditCurrentVisit = () => {
    if (!currentBooking?.id) { toastError('Error', 'Create a pregnancy record first'); return; }
    if (!currentAttendanceVisit) { toastError('No Visit', 'This attendance has no ANC visit record'); return; }
    setEditingVisit(currentAttendanceVisit);
    setSelectedBookingId(currentBooking.id);
    setShowANCVisitModal(true);
  };

  const handleDeleteVisit = async (id: string) => {
    if (!window.confirm('Delete this ANC visit?')) return;
    try { await deleteVisit(id); if (currentBooking?.id) getANCVisitsByBooking(currentBooking.id); success('Deleted', 'Visit removed'); }
    catch (err: any) { toastError('Delete failed', err.message); }
  };

  const handleDeleteDelivery = async (id: string) => {
    if (!window.confirm('Delete this delivery record?')) return;
    try { await deleteDelivery(id); await getDeliveries({ patientId: selectedPatientId }); success('Deleted', 'Delivery removed'); }
    catch (err: any) { toastError('Delete failed', err.message); }
  };

  const handleDeletePostnatal = async (id: string) => {
    if (!window.confirm('Delete this postnatal record?')) return;
    try { await deletePostnatal(id); await getPostnatals({ patientId: selectedPatientId }); success('Deleted', 'Record removed'); }
    catch (err: any) { toastError('Delete failed', err.message); }
  };

  const handleCreateBooking = async (data: any) => {
    if (!selectedPatientId || !selectedAttendanceId) { toastError('Error', 'Select patient and attendance first'); return; }
    try {
      await createBooking({ ...data, patientId: selectedPatientId, attendanceId: selectedAttendanceId });
      setModalType(null);
      success('Created', 'Pregnancy record created');
      await getBooking(selectedPatientId);
    } catch (err: any) { toastError('Creation failed', err.message); }
  };

  const handleAttendanceCreated = async (newId: string) => {
    setShowNewAttendance(false);
    await loadData();
    setSelectedAttendanceId(newId);
    setTimeout(async () => {
      if (!selectedPatientId) return;
      const att = await getAttendance(newId);
      if (att?.attendanceType === 'antenatal') {
        setActiveTab('anc');
        const booking = await getBooking(selectedPatientId).catch(() => null);
        if (!booking?.isActive || booking?.isCompleted) setModalType('anc_booking');
      } else if (att?.attendanceType === 'delivery') {
        setActiveTab('delivery'); setEditingDelivery(null); setShowDeliveryModal(true);
      } else if (att?.attendanceType === 'postnatal') {
        setActiveTab('postnatal'); setEditingPostnatal(null); setShowPostnatalModal(true);
      } else {
        setActiveTab('clinical');
      }
    }, 500);
  };

  const afterModal = async () => {
    setModalType(null);
    if (selectedAttendanceId) { await getAttendance(selectedAttendanceId); await calculateBill(selectedAttendanceId); }
  };

  // ─── MATERNAL ADMISSION HANDLERS ───────────────────────────────────────────
  
  // Handle Antenatal Admission (for observation during pregnancy)
  const handleAdmitForObservation = () => {
    setPendingAdmissionType('antenatal_observation');
    setShowBedWardModal(true);
  };

  const executeAntenatalAdmission = async (bedId: string, wardId: string, wardName: string, bedNumber: string) => {
    if (!selectedAttendanceId || !currentAttendance || !selectedPatient) return;
    
    setIsProcessingAdmission(true);
    try {
      // Update bed to occupied
      await updateBed(bedId, { isOccupied: true, currentPatientId: selectedPatientId });

      // Create admission record
      await createAdmission({
        attendanceId: selectedAttendanceId,
        admissionType: 'antenatal_observation',
        admissionSource: 'antenatal',
        admissionDate: new Date().toISOString(),
      });

      // Update attendance
      await updateAttendance(selectedAttendanceId, {
        encounterCategory: 'ipd',
        status: 'admitted',
        admissionType: 'antenatal_observation',
        bedId: bedId,
        wardId: wardId,
        medicalNotes: `${currentAttendance.medicalNotes || ''}\n\n[Antenatal Admission] Admitted for observation/monitoring. Bed: ${bedNumber}, Ward: ${wardName}`,
        updatedById: user?.id
      });

      success('Admitted', `Patient admitted for antenatal observation to Bed ${bedNumber}, ${wardName}`);
      await getAttendance(selectedAttendanceId);
      await getAdmissions();
      setShowBedWardModal(false);
      setPendingAdmissionType(null);
    } catch (err: any) {
      toastError('Admission Failed', err.response?.data?.message || err.message);
    } finally {
      setIsProcessingAdmission(false);
    }
  };

  // Handle Delivery Admission (active labor)
  const handleAdmitForDelivery = () => {
    setPendingAdmissionType('delivery');
    setShowBedWardModal(true);
  };

  const executeDeliveryAdmission = async (bedId: string, wardId: string, wardName: string, bedNumber: string) => {
    if (!selectedAttendanceId || !currentAttendance || !selectedPatient) return;
    
    setIsProcessingAdmission(true);
    try {
      await updateBed(bedId, { isOccupied: true, currentPatientId: selectedPatientId });

      await createAdmission({
        attendanceId: selectedAttendanceId,
        admissionType: 'delivery',
        admissionSource: 'antenatal',
        admissionDate: new Date().toISOString(),
      });

      await updateAttendance(selectedAttendanceId, {
        encounterCategory: 'ipd',
        status: 'admitted',
        admissionType: 'delivery',
        bedId: bedId,
        wardId: wardId,
        attendanceType: 'delivery',
        medicalNotes: `${currentAttendance.medicalNotes || ''}\n\n[Delivery Admission] Patient admitted in active labor. Bed: ${bedNumber}, Ward: ${wardName}`,
        updatedById: user?.id
      });

      success('Admitted', `Patient admitted for delivery to Bed ${bedNumber}, ${wardName}`);
      await getAttendance(selectedAttendanceId);
      await getAdmissions();
      setShowBedWardModal(false);
      setPendingAdmissionType(null);
    } catch (err: any) {
      toastError('Admission Failed', err.response?.data?.message || err.message);
    } finally {
      setIsProcessingAdmission(false);
    }
  };

  // Handle Postpartum Observation
  const handleAdmitForPostpartum = () => {
    setPendingAdmissionType('postpartum_observation');
    setShowBedWardModal(true);
  };

  const executePostpartumAdmission = async (bedId: string, wardId: string, wardName: string, bedNumber: string) => {
    if (!selectedAttendanceId || !currentAttendance || !selectedPatient) return;
    
    setIsProcessingAdmission(true);
    try {
      await updateBed(bedId, { isOccupied: true, currentPatientId: selectedPatientId });

      await createAdmission({
        attendanceId: selectedAttendanceId,
        admissionType: 'postpartum_observation',
        admissionSource: 'delivery',
        admissionDate: new Date().toISOString(),
      });

      await updateAttendance(selectedAttendanceId, {
        encounterCategory: 'ipd',
        status: 'admitted',
        admissionType: 'postpartum_observation',
        bedId: bedId,
        wardId: wardId,
        attendanceType: 'postnatal',
        medicalNotes: `${currentAttendance.medicalNotes || ''}\n\n[Postpartum] Patient admitted for postpartum observation (24-72 hours). Bed: ${bedNumber}, Ward: ${wardName}`,
        updatedById: user?.id
      });

      success('Admitted', `Patient admitted for postpartum observation to Bed ${bedNumber}, ${wardName}`);
      await getAttendance(selectedAttendanceId);
      await getAdmissions();
      setShowBedWardModal(false);
      setPendingAdmissionType(null);
    } catch (err: any) {
      toastError('Admission Failed', err.response?.data?.message || err.message);
    } finally {
      setIsProcessingAdmission(false);
    }
  };

  // Maternal Action Buttons Component
  const getMaternalActionButtons = () => {
    const status = currentAttendance?.status;
    const admissionType = currentAttendance?.admissionType;

    if (status === 'admitted') {
      return (
        <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
          admissionType === 'antenatal_observation' ? 'bg-purple-100 text-purple-700 border border-purple-300' :
          admissionType === 'delivery' ? 'bg-green-100 text-green-700 border border-green-300' :
          admissionType === 'postpartum_observation' ? 'bg-cyan-100 text-cyan-700 border border-cyan-300' :
          'bg-pink-100 text-pink-700 border border-pink-300'
        }`}>
          <Hospital className="w-3 h-3" /> 
          {admissionType === 'antenatal_observation' ? 'ANTENATAL OBSERVATION' :
           admissionType === 'delivery' ? 'IN LABOR / DELIVERY' :
           admissionType === 'postpartum_observation' ? 'POSTPARTUM OBSERVATION' :
           'ADMITTED'}
        </span>
      );
    }

    if (status !== 'discharged' && status !== 'completed') {
      return (
        <div className="flex gap-2">
          <button
            onClick={handleAdmitForObservation}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
              bg-purple-100 text-purple-700 hover:bg-purple-700 hover:text-white transition-all"
          >
            <Moon className="w-3.5 h-3.5" /> Antenatal Observation
          </button>
          <button
            onClick={handleAdmitForDelivery}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
              bg-green-100 text-green-700 hover:bg-green-700 hover:text-white transition-all"
          >
            <Hospital className="w-3.5 h-3.5" /> Admit for Delivery
          </button>
          <button
            onClick={handleAdmitForPostpartum}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
              bg-cyan-100 text-cyan-700 hover:bg-cyan-700 hover:text-white transition-all"
          >
            <Heart className="w-3.5 h-3.5" /> Postpartum Observation
          </button>
        </div>
      );
    }

    return null;
  };

  if (isLoading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-[var(--text-secondary)]">Loading Maternal Health…</p>
      </div>
    </div>
  );

  // Tab definitions — only show type-specific tabs when attendance matches
  const tabs = [
    { key: 'clinical',  label: 'Clinical',  icon: <Stethoscope className="w-3.5 h-3.5" />, count: diagnosesList.length + labTestsList.length + medicationsList.length, always: true },
    ...(currentAttendance?.attendanceType === 'antenatal'  ? [{ key: 'anc',      label: 'ANC Visits', icon: <Baby     className="w-3.5 h-3.5" />, count: currentVisits.length,                                                           always: false }] : []),
    ...(currentAttendance?.attendanceType === 'delivery'   ? [{ key: 'delivery', label: 'Delivery',   icon: <Hospital className="w-3.5 h-3.5" />, count: deliveries.filter((d:any) => d.attendanceId === selectedAttendanceId).length,    always: false }] : []),
    ...(currentAttendance?.attendanceType === 'postnatal'  ? [{ key: 'postnatal',label: 'Postnatal',  icon: <Heart    className="w-3.5 h-3.5" />, count: postnatalRecords.filter((p:any) => p.attendanceId === selectedAttendanceId).length, always: false }] : []),
    { key: 'vitals',   label: 'Vitals',    icon: <Activity className="w-3.5 h-3.5" />, count: undefined, always: true },
  ] as const;

  // Payment badge
  const paymentCls = currentAttendance?.paymentMode === 'nhis' ? 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]'
    : currentAttendance?.paymentMode === 'private_insurance' ? 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]'
    : 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]';
  const paymentLabel = currentAttendance?.paymentMode === 'nhis' ? 'NHIS'
    : currentAttendance?.paymentMode === 'private_insurance' ? 'PRIVATE INS.'
    : 'CASH';

  return (
    <div className="space-y-4">

      {/* ── PAGE HEADER ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard/maternal-waiting-list')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-color)]
              text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-all text-xs font-medium">
            <ChevronLeft className="w-3.5 h-3.5" /><Users className="w-3.5 h-3.5" /> Waiting List
          </button>
          <div className="h-5 w-px bg-[var(--border-color)]" />
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center">
              <Baby className="w-4 h-4 text-pink-600" />
            </div>
            <div>
              <h1 className="text-base font-bold text-[var(--text-primary)] leading-tight">Maternal Health</h1>
              <p className="text-[10px] text-[var(--text-tertiary)] leading-tight">Antenatal · Delivery · Postnatal</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowNewAttendance(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
              bg-pink-100 text-pink-700 hover:bg-pink-700 hover:text-white transition-all">
            <Plus className="w-3.5 h-3.5" /> New Visit
          </button>
          <button onClick={loadData} disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-color)]
              text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-all text-xs font-medium disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* ── PATIENT SELECTOR ──────────────────────────────────────────────── */}
      <PatientAttendanceSelector
        patients={patients} attendances={getCurrentAttendances()}
        selectedPatientId={selectedPatientId} selectedAttendanceId={selectedAttendanceId}
        onPatientSelect={setSelectedPatientId} onAttendanceSelect={setSelectedAttendanceId}
        onClearSelection={handleClearSelection}
        placeholder={activeTab === 'anc' ? 'Select antenatal visit…' : activeTab === 'delivery' ? 'Select delivery visit…' : activeTab === 'postnatal' ? 'Select postnatal visit…' : 'Select visit…'}
      />

      {/* ── PATIENT BANNER ────────────────────────────────────────────────── */}
      {selectedPatient && currentAttendance && (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] px-5 py-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                activeTab === 'delivery' ? 'bg-[var(--icon-green-bg)]' : activeTab === 'postnatal' ? 'bg-[var(--icon-cyan-bg)]' : 'bg-pink-100'
              }`}>
                {activeTab === 'delivery'  ? <Hospital className="w-5 h-5 text-[var(--icon-green-text)]" />
                : activeTab === 'postnatal' ? <Heart    className="w-5 h-5 text-[var(--icon-cyan-text)]" />
                : <Baby className="w-5 h-5 text-pink-600" />}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm font-bold text-[var(--text-primary)]">{selectedPatient.surname} {selectedPatient.otherNames}</h2>
                  <span className="text-[11px] text-[var(--text-tertiary)]">{calculateAge(selectedPatient.dateOfBirth)}y · {selectedPatient.gender}</span>
                  {activeTab === 'anc' && hasActiveBooking && <RiskBadge risk={currentBooking?.riskLevel || 'low'} />}
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                  {selectedPatient.folderNumber} · {selectedPatient.contact}
                  {activeTab === 'anc' && currentBooking?.edd && (
                    <span className="ml-2 font-semibold text-pink-600">EDD: {getEDDDisplay()}</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono text-[var(--text-tertiary)] bg-[var(--bg-main)] px-2.5 py-1 rounded-full border border-[var(--border-color)]">
                #{currentAttendance.attendanceNumber || 'New'}
              </span>
              <span className="text-[10px] text-[var(--text-tertiary)] bg-[var(--bg-main)] px-2.5 py-1 rounded-full border border-[var(--border-color)]">
                {new Date(currentAttendance.dateTime || currentAttendance.createdAt || '').toLocaleDateString()}
              </span>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${paymentCls}`}>{paymentLabel}</span>
              {/* Maternal Action Buttons */}
              {getMaternalActionButtons()}
            </div>
          </div>
        </div>
      )}

      {/* ── VITALS STRIP ──────────────────────────────────────────────────── */}
      {currentAttendance && latestVitals && <VitalsDisplay vitals={latestVitals} />}

      {/* ── NO BOOKING BANNER ─────────────────────────────────────────────── */}
      {activeTab === 'anc' && selectedPatient && !hasActiveBooking && (
        <div className="flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl border border-[var(--icon-yellow-text)] bg-[var(--icon-yellow-bg)] flex-wrap">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[var(--icon-yellow-text)] flex-shrink-0" />
            <span className="text-xs font-medium text-[var(--icon-yellow-text)]">No active pregnancy record. Create one to track ANC data.</span>
          </div>
          <button onClick={() => setModalType('anc_booking')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--icon-yellow-text)] text-white hover:opacity-90 transition-all">
            <Plus className="w-3 h-3" /> Create Record
          </button>
        </div>
      )}

      {/* ── MAIN CONTENT ──────────────────────────────────────────────────── */}
      {selectedAttendanceId && currentAttendance ? (
        <div className="flex gap-4 items-start">

          {/* LEFT */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* Tab bar */}
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
              <div className="flex border-b border-[var(--border-color)] px-1 overflow-x-auto">
                {tabs.map(tab => {
                  const isActive = activeTab === tab.key;
                  return (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
                      className={`flex items-center gap-1.5 px-4 py-3 text-[11px] font-semibold border-b-2 whitespace-nowrap transition-all ${
                        isActive
                          ? 'border-pink-500 text-pink-600'
                          : 'border-transparent text-[var(--text-secondary)] hover:text-pink-500'
                      }`}>
                      {tab.icon}{tab.label}
                      {tab.count !== undefined && tab.count > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[var(--bg-main)] text-[var(--text-tertiary)]">{tab.count}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* ── CLINICAL TAB ── */}
              {activeTab === 'clinical' && (
                <div className="p-4 space-y-4">
                  {/* ... clinical tab content (same as before) ... */}
                  <SectionCard
                    icon={<Stethoscope className="w-4 h-4 text-[var(--icon-cyan-text)]" />}
                    title="Diagnosis (ICD-10)" count={diagnosesList.length}
                    action={canAddEntries && <AddBtn onClick={() => setModalType('diagnosis')} label="Add" />}
                  >
                    {diagnosesList.length === 0 ? <EmptySlate icon={<Stethoscope className="w-9 h-9" />} label="No diagnoses added" /> : (
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                          <tr><TH>Diagnosis</TH><TH>ICD-10</TH><TH>Type</TH><TH>By</TH><TH>Date</TH><TH></TH></tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)]">
                          {diagnosesList.map((item: any) => {
                            const t = item.diagnosisType || (item.primary ? 'primary' : 'additional');
                            const cfg: Record<string, { label: string; cls: string }> = {
                              provisional: { label: 'Provisional', cls: 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]' },
                              primary:     { label: 'Primary',     cls: 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]' },
                              additional:  { label: 'Additional',  cls: 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]' },
                            };
                            const c = cfg[t] ?? cfg.additional;
                            return (
                              <tr key={item.id} className="hover:bg-[var(--bg-main)] transition-colors">
                                <TDp>{item.Diagnosis?.name}{item.notes && <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{item.notes}</p>}</TDp>
                                <TD className="font-mono">{item.Diagnosis?.icdCode || '—'}</TD>
                                <TD><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${c.cls}`}>{c.label}</span></TD>
                                <TD>{item.createdBy?.fullName || '—'}</TD>
                                <TD>{new Date(item.createdAt).toLocaleDateString()}</TD>
                                <TD>{canAddEntries && <DelBtn onClick={() => handleDeleteItem('diagnosis', item.id)} />}</TD>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </SectionCard>

                  {/* Lab tests + results */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <SectionCard icon={<FlaskConical className="w-4 h-4 text-[var(--icon-purple-text)]" />} title="Investigations"
                      count={labTestsList.length} countCls="bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]"
                      action={canAddEntries && <AddBtn onClick={() => setModalType('lab')} label="Request" />} maxH="max-h-80">
                      {labTestsList.length === 0 ? <EmptySlate icon={<FlaskConical className="w-8 h-8" />} label="No lab tests requested" /> : (
                        <table className="w-full text-xs">
                          <thead className="sticky top-0 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                            <tr><TH>Test</TH><TH>Priority</TH><TH>Status</TH><TH>Date</TH><TH></TH></tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border-color)]">
                            {labTestsList.map((t: any) => (
                              <tr key={t.id} className="hover:bg-[var(--bg-main)] transition-colors">
                                <TDp>{t.ServiceCatalog?.name || t.name}</TDp>
                                <TD><span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                  t.priority === 'stat' ? 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]'
                                  : t.priority === 'urgent' ? 'bg-[var(--icon-orange-bg)] text-[var(--icon-orange-text)]'
                                  : 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]'}`}>{t.priority || 'routine'}</span></TD>
                                <TD><StatusBadge status={t.status} /></TD>
                                <TD>{t.requestedAt ? new Date(t.requestedAt).toLocaleDateString() : t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '—'}</TD>
                                <TD>{canAddEntries && t.status === 'requested' && <DelBtn onClick={() => handleDeleteItem('lab', t.id)} />}</TD>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </SectionCard>

                    <SectionCard icon={<CheckCircle className="w-4 h-4 text-[var(--icon-green-text)]" />} title="Investigation Results"
                      count={labTestsList.filter((t: any) => t.status === 'completed').length}
                      countCls="bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]" maxH="max-h-80">
                      {labTestsList.filter((t: any) => t.status === 'completed').length === 0
                        ? <EmptySlate icon={<FlaskConical className="w-8 h-8" />} label="No results yet" />
                        : (
                          <table className="w-full text-xs">
                            <thead className="sticky top-0 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                              <tr><TH>Test</TH><TH>Result</TH><TH>Flag</TH><TH>Date</TH></tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-color)]">
                              {labTestsList.filter((t: any) => t.status === 'completed').map((test: any) => {
                                const val = typeof test.result === 'object' ? (test.result?.value ?? '—') : (test.result ?? '—');
                                const abn = test.abnormal || String(val).toLowerCase() === 'positive';
                                const flag = String(val).toLowerCase() === 'positive' ? 'POS' : String(val).toLowerCase() === 'negative' ? 'NEG' : abn ? 'ABN' : 'NL';
                                const flagCls = flag === 'POS' || abn ? 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]' : 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]';
                                return (
                                  <tr key={test.id} className="hover:bg-[var(--bg-main)] transition-colors">
                                    <TDp>{test.ServiceCatalog?.name || test.name}</TDp>
                                    <TD className={`font-mono ${abn ? 'font-bold text-[var(--icon-red-text)]' : ''}`}>{String(val)}</TD>
                                    <TD><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${flagCls}`}>{flag}</span></TD>
                                    <TD>{test.completedAt ? new Date(test.completedAt).toLocaleDateString() : '—'}</TD>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                    </SectionCard>
                  </div>

                  {/* Procedures */}
                  <SectionCard icon={<Scissors className="w-4 h-4 text-[var(--icon-orange-text)]" />} title="Procedures"
                    count={proceduresList.length} countCls="bg-[var(--icon-orange-bg)] text-[var(--icon-orange-text)]"
                    action={canAddEntries && <AddBtn onClick={() => setModalType('procedure')} label="Schedule" />}>
                    {proceduresList.length === 0 ? <EmptySlate icon={<Scissors className="w-8 h-8" />} label="No procedures scheduled" /> : (
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                          <tr><TH>Procedure</TH><TH>Scheduled</TH><TH>Status</TH><TH>By</TH><TH></TH></tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)]">
                          {proceduresList.map((p: any) => (
                            <tr key={p.id} className="hover:bg-[var(--bg-main)] transition-colors">
                              <TDp>{p.ServiceCatalog?.name || p.name}</TDp>
                              <TD>{p.scheduledDate ? new Date(p.scheduledDate).toLocaleString() : '—'}</TD>
                              <TD><StatusBadge status={p.status} /></TD>
                              <TD>{p.requestedBy || '—'}</TD>
                              <TD>{canAddEntries && p.status === 'scheduled' && <DelBtn onClick={() => handleDeleteItem('procedure', p.id)} />}</TD>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </SectionCard>

                  {/* Medications */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <SectionCard icon={<Pill className="w-4 h-4 text-[var(--icon-green-text)]" />} title="Prescribed"
                      count={prescribedMeds.length} countCls="bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]"
                      action={canAddEntries && <AddBtn onClick={() => setModalType('medication')} label="Prescribe" />}>
                      {prescribedMeds.length === 0 ? <EmptySlate icon={<Pill className="w-8 h-8" />} label="No medications prescribed" /> : (
                        <table className="w-full text-xs">
                          <thead className="sticky top-0 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                            <tr><TH>Medication</TH><TH>Dosage</TH><TH>Freq.</TH><TH>Status</TH><TH></TH></tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border-color)]">
                            {prescribedMeds.map((m: any) => (
                              <tr key={m.id} className="hover:bg-[var(--bg-main)] transition-colors">
                                <TDp>{m.name}</TDp><TD>{m.dosage || '—'}</TD><TD>{m.frequency || '—'}</TD>
                                <TD><StatusBadge status={m.status} /></TD>
                                <TD>{canAddEntries && <DelBtn onClick={() => handleDeleteItem('medication', m.id)} />}</TD>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </SectionCard>

                    <SectionCard icon={<CheckCircle className="w-4 h-4 text-[var(--icon-cyan-text)]" />} title="Dispensed"
                      count={dispensedMeds.length}>
                      {dispensedMeds.length === 0 ? <EmptySlate icon={<CheckCircle className="w-8 h-8" />} label="No medications dispensed yet" /> : (
                        <table className="w-full text-xs">
                          <thead className="sticky top-0 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                            <tr><TH>Medication</TH><TH>Qty</TH><TH>Total</TH><TH>Date</TH></tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border-color)]">
                            {dispensedMeds.map((m: any) => (
                              <tr key={m.id} className="hover:bg-[var(--bg-main)] transition-colors">
                                <TDp>{m.name}</TDp><TD>{m.quantity}</TD>
                                <TD>GHS {((m.unitCost || 0) * m.quantity).toFixed(2)}</TD>
                                <TD>{m.dispensedAt ? new Date(m.dispensedAt).toLocaleDateString() : '—'}</TD>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </SectionCard>
                  </div>

                  {/* Scans */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <SectionCard icon={<Scan className="w-4 h-4 text-[var(--icon-purple-text)]" />} title="Scans Requested"
                      count={requestedScans.length} countCls="bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]"
                      action={canAddEntries && <AddBtn onClick={() => setModalType('scan')} label="Request" />}>
                      {requestedScans.length === 0 ? <EmptySlate icon={<Scan className="w-8 h-8" />} label="No scans requested" /> : (
                        <table className="w-full text-xs">
                          <thead className="sticky top-0 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                            <tr><TH>Scan</TH><TH>Body Part</TH><TH>Status</TH><TH>Date</TH><TH></TH></tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border-color)]">
                            {requestedScans.map((s: any) => (
                              <tr key={s.id} className="hover:bg-[var(--bg-main)] transition-colors">
                                <TDp>{s.scanType || s.ServiceCatalog?.name}</TDp><TD>{s.bodyPart || '—'}</TD>
                                <TD><StatusBadge status={s.status} /></TD>
                                <TD>{new Date(s.requestedAt).toLocaleDateString()}</TD>
                                <TD>{canAddEntries && (s.status === 'requested' || s.status === 'scheduled') && <DelBtn onClick={() => handleDeleteItem('scan', s.id)} />}</TD>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </SectionCard>

                    <SectionCard icon={<CheckCircle className="w-4 h-4 text-[var(--icon-green-text)]" />} title="Scan Results"
                      count={completedScans.length} countCls="bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]">
                      {completedScans.length === 0 ? <EmptySlate icon={<Scan className="w-8 h-8" />} label="No scan results yet" /> : (
                        <table className="w-full text-xs">
                          <thead className="sticky top-0 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                            <tr><TH>Scan</TH><TH>Findings</TH><TH>Completed</TH></tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border-color)]">
                            {completedScans.map((s: any) => (
                              <tr key={s.id} className="hover:bg-[var(--bg-main)] transition-colors">
                                <TDp>{s.scanType || s.ServiceCatalog?.name}{s.bodyPart && <p className="text-[10px] text-[var(--text-tertiary)]">{s.bodyPart}</p>}</TDp>
                                <TD className="max-w-[160px] truncate">{s.findings || '—'}</TD>
                                <TD>{s.completedAt ? new Date(s.completedAt).toLocaleDateString() : '—'}</TD>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </SectionCard>
                  </div>
                </div>
              )}

              {/* ── ANC TAB ── */}
              {activeTab === 'anc' && (
                <div className="p-4 space-y-4">
                  {/* Pregnancy stats strip */}
                  {hasActiveBooking && (
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                      {[
                        { icon: <Baby className="w-4 h-4 text-pink-500" />,   label: 'G/P',       value: `${currentBooking?.gravida||0}/${currentBooking?.para||0}` },
                        { icon: <Calendar className="w-4 h-4 text-purple-500" />, label: 'Weeks',  value: currentBooking?.gestationalAgeWeeks || '?' },
                        { icon: <Heart className="w-4 h-4 text-red-500" />,   label: 'FHR (bpm)', value: latestVitals?.fetalHeartRate || '—' },
                        { icon: <Ruler className="w-4 h-4 text-blue-500" />,  label: 'Fundal Ht', value: latestVitals?.fundalHeight ? `${latestVitals.fundalHeight}cm` : '—' },
                        { icon: <TrendingUp className="w-4 h-4 text-[var(--icon-green-text)]" />, label: 'Visits', value: currentVisits.length },
                        { icon: <Shield className="w-4 h-4 text-[var(--icon-cyan-text)]" />, label: 'TT2+', value: ttSummary.tt2Plus },
                      ].map((s, i) => (
                        <div key={i} className="bg-[var(--bg-main)] rounded-xl p-3 border border-[var(--border-color)] text-center">
                          <div className="flex justify-center mb-1">{s.icon}</div>
                          <p className="text-sm font-bold text-[var(--text-primary)]">{s.value}</p>
                          <p className="text-[10px] text-[var(--text-tertiary)]">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* IPTp strip */}
                  {hasActiveBooking && currentVisits.length > 0 && (
                    <div className="flex items-center gap-4 px-4 py-3 rounded-xl border border-[var(--icon-cyan-text)] bg-[var(--icon-cyan-bg)]">
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Syringe className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                        <span className="text-xs font-bold text-[var(--icon-cyan-text)]">IPTp</span>
                      </div>
                      {['IPTp-1','IPTp-2','IPTp-3','IPTp-4','IPTp-5+'].map((label, i) => (
                        <div key={i} className="text-center">
                          <p className="text-xs font-bold text-[var(--icon-cyan-text)]">{Object.values(iptpSummary)[i]}</p>
                          <p className="text-[10px] text-[var(--text-secondary)]">{label}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ANC Visits table */}
                  <SectionCard
                    icon={<Baby className="w-4 h-4 text-pink-600" />}
                    title={`ANC Visit History (${currentVisits.length})`}
                    action={hasActiveBooking && currentAttendanceVisit && (
                      <button onClick={handleEditCurrentVisit}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold
                          bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all">
                        <Edit className="w-3 h-3" /> Edit Visit
                      </button>
                    )}
                    maxH="max-h-96"
                  >
                    {currentVisits.length === 0
                      ? <EmptySlate icon={<Baby className="w-9 h-9" />} label="No ANC visits recorded yet" />
                      : (
                        <table className="w-full text-xs">
                          <thead className="sticky top-0 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                            <tr><TH>#</TH><TH>Date</TH><TH>GA(wks)</TH><TH>Weight</TH><TH>BP</TH><TH>FHR</TH><TH>Fundal</TH><TH>IPTp</TH><TH>TT</TH><TH>ITN</TH><TH>Danger</TH><TH></TH></tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border-color)]">
                            {currentVisits.map((v: any) => {
                              const isCurrent = v.attendanceId === selectedAttendanceId;
                              return (
                                <tr key={v.id} className={`hover:bg-[var(--bg-main)] transition-colors ${isCurrent ? 'bg-pink-50/20' : ''}`}>
                                  <TD>{v.visitNumber}{isCurrent && <span className="ml-1 text-[9px] text-pink-500">(now)</span>}</TD>
                                  <TD>{new Date(v.visitDate).toLocaleDateString()}</TD>
                                  <TD>{v.gestationalAgeWeeks || '—'}</TD>
                                  <TD>{v.weight ? `${v.weight}kg` : '—'}</TD>
                                  <TD>{v.bloodPressure || '—'}</TD>
                                  <TD>{v.fetalHeartRate || '—'}</TD>
                                  <TD>{v.fundalHeight ? `${v.fundalHeight}cm` : '—'}</TD>
                                  <TD>{v.iptpGiven ? `D${v.iptpDoseNumber}` : '—'}</TD>
                                  <TD>{v.ttGiven ? `D${v.ttDoseNumber}` : '—'}</TD>
                                  <TD>{v.itnGiven ? '✓' : '—'}</TD>
                                  <TD>{v.dangerSignsPresent ? <span className="text-[var(--icon-red-text)] font-bold">Yes</span> : '—'}</TD>
                                  <TD>
                                    <div className="flex gap-0.5">
                                      <button onClick={() => { setSelectedVisit(v); setShowVisitDetails(true); }} className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-bg)] transition-all"><Eye className="w-3 h-3" /></button>
                                      <button onClick={() => { setEditingVisit(v); setSelectedBookingId(currentBooking?.id||''); setShowANCVisitModal(true); }} className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-bg)] transition-all"><Edit className="w-3 h-3" /></button>
                                      <button onClick={() => handleDeleteVisit(v.id)} className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--icon-red-text)] hover:bg-[var(--icon-red-bg)] transition-all"><Trash2 className="w-3 h-3" /></button>
                                    </div>
                                  </TD>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                  </SectionCard>

                  {/* Malaria + Danger signs */}
                  {currentVisits.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { icon: <AlertTriangle className="w-4 h-4 text-[var(--icon-yellow-text)]" />, title: 'Malaria in Pregnancy', rows: [
                          { l: 'Tested', v: currentVisits.filter((v:any)=>v.malariaTestDone).length },
                          { l: 'Positive', v: currentVisits.filter((v:any)=>v.malariaTestResult==='Positive').length, danger: true },
                          { l: 'Treated', v: currentVisits.filter((v:any)=>v.malariaTreatmentGiven).length },
                        ]},
                        { icon: <AlertCircle className="w-4 h-4 text-[var(--icon-orange-text)]" />, title: 'Danger Signs & Referrals', rows: [
                          { l: 'Danger Signs', v: currentVisits.filter((v:any)=>v.dangerSignsPresent).length, danger: true },
                          { l: 'Referrals', v: currentVisits.filter((v:any)=>v.referralMade).length },
                        ]},
                      ].map(card => (
                        <div key={card.title} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                          <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
                            {card.icon}
                            <span className="text-xs font-semibold text-[var(--text-primary)]">{card.title}</span>
                          </div>
                          <div className="p-4 space-y-2">
                            {card.rows.map(r => (
                              <div key={r.l} className="flex items-center justify-between text-xs">
                                <span className="text-[var(--text-secondary)]">{r.l}</span>
                                <span className={`font-bold ${(r as any).danger && r.v > 0 ? 'text-[var(--icon-red-text)]' : 'text-[var(--text-primary)]'}`}>{r.v}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── DELIVERY TAB ── */}
              {activeTab === 'delivery' && (
                <div className="p-4">
                  <SectionCard icon={<Hospital className="w-4 h-4 text-[var(--icon-green-text)]" />} title="Delivery Records"
                    count={deliveries.filter((d:any) => d.attendanceId === selectedAttendanceId).length}
                    countCls="bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]"
                    action={<AddBtn onClick={() => { setEditingDelivery(null); setShowDeliveryModal(true); }} label="Add" />}
                    maxH="max-h-[600px]">
                    {deliveries.filter((d:any) => d.attendanceId === selectedAttendanceId).length === 0
                      ? <EmptySlate icon={<Hospital className="w-9 h-9" />} label="No delivery records for this visit"
                          action={<button onClick={() => { setEditingDelivery(null); setShowDeliveryModal(true); }} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] hover:bg-[var(--icon-green-text)] hover:text-white transition-all">Add Record</button>} />
                      : <div className="divide-y divide-[var(--border-color)]">
                          {deliveries.filter((d:any) => d.attendanceId === selectedAttendanceId).map((d: any) => (
                            <div key={d.id} className="p-4 hover:bg-[var(--bg-main)] transition-colors">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-[var(--text-primary)]">Delivery — {new Date(d.deliveryDate).toLocaleDateString()}</p>
                                  <div className="flex flex-wrap gap-2 mt-1.5">
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]">{d.deliveryType?.replace(/_/g,' ')}</span>
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]">{d.deliveryOutcome?.replace(/_/g,' ')}</span>
                                    {d.birthWeight && <span className="text-[10px] text-[var(--text-tertiary)]">Wt: {d.birthWeight}g</span>}
                                    {d.gestationWeeks && <span className="text-[10px] text-[var(--text-tertiary)]">{d.gestationWeeks}wks</span>}
                                  </div>
                                </div>
                                <div className="flex gap-0.5">
                                  <button onClick={() => { setSelectedDelivery(d); setShowDeliveryDetails(true); }} className="p-1.5 rounded text-[var(--text-tertiary)] hover:text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-bg)] transition-all"><Eye className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => { setEditingDelivery(d); setShowDeliveryModal(true); }} className="p-1.5 rounded text-[var(--text-tertiary)] hover:text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-bg)] transition-all"><Edit className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => handleDeleteDelivery(d.id)} className="p-1.5 rounded text-[var(--text-tertiary)] hover:text-[var(--icon-red-text)] hover:bg-[var(--icon-red-bg)] transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>}
                  </SectionCard>
                </div>
              )}

              {/* ── POSTNATAL TAB ── */}
              {activeTab === 'postnatal' && (
                <div className="p-4">
                  <SectionCard icon={<Heart className="w-4 h-4 text-[var(--icon-cyan-text)]" />} title="Postnatal Examinations"
                    count={postnatalRecords.filter((p:any) => p.attendanceId === selectedAttendanceId).length}
                    action={<AddBtn onClick={() => { setEditingPostnatal(null); setShowPostnatalModal(true); }} label="Add" />}
                    maxH="max-h-[600px]">
                    {postnatalRecords.filter((p:any) => p.attendanceId === selectedAttendanceId).length === 0
                      ? <EmptySlate icon={<Heart className="w-9 h-9" />} label="No postnatal examinations for this visit"
                          action={<button onClick={() => { setEditingPostnatal(null); setShowPostnatalModal(true); }} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all">Add Exam</button>} />
                      : <div className="divide-y divide-[var(--border-color)]">
                          {postnatalRecords.filter((p:any) => p.attendanceId === selectedAttendanceId).map((pn: any) => (
                            <div key={pn.id} className="p-4 hover:bg-[var(--bg-main)] transition-colors">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-[var(--text-primary)]">Postnatal Day {pn.dayNumber}</p>
                                  <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">{new Date(pn.examinationDate).toLocaleString()}</p>
                                  <div className="flex flex-wrap gap-2 mt-1.5">
                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${pn.maternalCondition === 'good' ? 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]' : pn.maternalCondition === 'fair' ? 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]' : 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]'}`}>
                                      Maternal: {pn.maternalCondition}
                                    </span>
                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${pn.breastfeedingStatus === 'exclusive' ? 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]' : 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]'}`}>
                                      BF: {pn.breastfeedingStatus}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex gap-0.5">
                                  <button onClick={() => { setSelectedPostnatal(pn); setShowPostnatalDetails(true); }} className="p-1.5 rounded text-[var(--text-tertiary)] hover:text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-bg)] transition-all"><Eye className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => { setEditingPostnatal(pn); setShowPostnatalModal(true); }} className="p-1.5 rounded text-[var(--text-tertiary)] hover:text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-bg)] transition-all"><Edit className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => handleDeletePostnatal(pn.id)} className="p-1.5 rounded text-[var(--text-tertiary)] hover:text-[var(--icon-red-text)] hover:bg-[var(--icon-red-bg)] transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>}
                  </SectionCard>
                </div>
              )}

              {/* ── VITALS TAB ── */}
              {activeTab === 'vitals' && (
                <div className="p-4">
                  <SectionCard icon={<Activity className="w-4 h-4 text-pink-500" />} title="Latest Vitals" maxH="max-h-96">
                    {latestVitals ? (
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                          <tr><TH>Date / Time</TH><TH>BP</TH><TH>Temp</TH><TH>Pulse</TH><TH>Weight</TH><TH>FHR</TH><TH>Fundal Ht</TH></tr>
                        </thead>
                        <tbody>
                          <tr className="hover:bg-[var(--bg-main)] transition-colors">
                            <TD>{new Date(latestVitals.recordedAt).toLocaleString()}</TD>
                            <TD>{latestVitals.bloodPressure || '—'}</TD>
                            <TD>{latestVitals.temperature ? `${latestVitals.temperature}°C` : '—'}</TD>
                            <TD>{latestVitals.pulse || '—'}</TD>
                            <TD>{latestVitals.weight ? `${latestVitals.weight}kg` : '—'}</TD>
                            <TD>{latestVitals.fetalHeartRate || '—'}</TD>
                            <TD>{latestVitals.fundalHeight ? `${latestVitals.fundalHeight}cm` : '—'}</TD>
                          </tr>
                        </tbody>
                      </table>
                    ) : <EmptySlate icon={<Activity className="w-8 h-8" />} label="No vitals recorded" />}
                  </SectionCard>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="w-64 xl:w-72 flex-shrink-0 sticky top-4">
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden flex flex-col"
              style={{ maxHeight: 'calc(100vh - 120px)', boxShadow: 'var(--shadow-sm)' }}>

              <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-main)] flex-shrink-0">
                <Baby className="w-4 h-4 text-pink-500" />
                <span className="text-xs font-semibold text-[var(--text-primary)]">Pregnancy Overview</span>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[var(--bg-main)]"
                style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--border-color) transparent' }}>
                {hasActiveBooking ? (
                  <>
                    <div className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border-color)] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-pink-500 uppercase tracking-wider">Current Pregnancy</span>
                        <RiskBadge risk={currentBooking?.riskLevel || 'low'} />
                      </div>
                      {[
                        { l: 'Gravida / Para', v: `${currentBooking?.gravida||0} / ${currentBooking?.para||0}` },
                        { l: 'Gestation',      v: currentBooking?.gestationalAgeWeeks ? `${currentBooking.gestationalAgeWeeks} wks` : 'N/A' },
                        { l: 'LMP',            v: currentBooking?.lmp ? new Date(currentBooking.lmp).toLocaleDateString() : 'N/A' },
                        { l: 'EDD',            v: getEDDDisplay() },
                        { l: 'Blood Group',    v: currentBooking?.bloodGroup || 'Not recorded' },
                        { l: 'Prev. C-Section',v: currentBooking?.previousCSection ? 'Yes' : 'No' },
                      ].map((r, i) => (
                        <div key={i} className="flex items-center justify-between pt-1.5 border-t border-[var(--border-color)] first:border-0 first:pt-0">
                          <span className="text-[10px] text-[var(--text-tertiary)]">{r.l}</span>
                          <span className="text-[11px] font-semibold text-[var(--text-primary)]">{r.v}</span>
                        </div>
                      ))}
                    </div>

                    {currentVisits.length > 0 && (() => {
                      const last = currentVisits[currentVisits.length - 1];
                      return (
                        <div className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border-color)]">
                          <p className="text-[10px] font-bold text-pink-500 uppercase tracking-wider mb-2">Last Visit (#{last.visitNumber})</p>
                          {[
                            { l: 'Date', v: new Date(last.visitDate).toLocaleDateString() },
                            { l: 'Weight', v: last.weight ? `${last.weight}kg` : '—' },
                            { l: 'BP', v: last.bloodPressure || '—' },
                            { l: 'FHR', v: last.fetalHeartRate || '—' },
                          ].map((r, i) => (
                            <div key={i} className="flex items-center justify-between mt-1">
                              <span className="text-[10px] text-[var(--text-tertiary)]">{r.l}</span>
                              <span className="text-[11px] font-semibold text-[var(--text-primary)]">{r.v}</span>
                            </div>
                          ))}
                          {last.dangerSignsPresent && (
                            <div className="mt-2 px-2 py-1 rounded-lg text-[10px] font-bold bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]">
                              ⚠ Danger signs recorded
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </>
                ) : (
                  <p className="text-center text-[11px] text-[var(--text-tertiary)] pt-8">No active pregnancy record</p>
                )}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-main)] border-t border-b border-[var(--border-color)] flex-shrink-0">
                <div className="flex-1 h-px bg-[var(--border-color)]" />
                <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
                  <FileText className="w-3 h-3" /> Visit Notes
                </span>
                <div className="flex-1 h-px bg-[var(--border-color)]" />
              </div>

              <div className="overflow-y-auto p-3 space-y-2.5 bg-[var(--bg-main)]"
                style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--border-color) transparent', minHeight: '80px' }}>
                {currentVisits.length > 0
                  ? [...currentVisits].reverse().slice(0, 5).map((v: any) => (
                      <div key={v.id} className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border-color)]">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold text-pink-500">Visit #{v.visitNumber}</span>
                          <span className="text-[9px] text-[var(--text-tertiary)]">{new Date(v.visitDate).toLocaleDateString()}</span>
                        </div>
                        {v.generalObservations
                          ? <p className="text-[11px] text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">{v.generalObservations}</p>
                          : <p className="text-[11px] text-[var(--text-secondary)] italic">GA: {v.gestationalAgeWeeks||'—'}wks · BP: {v.bloodPressure||'—'} · FHR: {v.fetalHeartRate||'—'}</p>}
                        {v.nextAppointment && (
                          <p className="text-[10px] text-[var(--text-tertiary)] mt-1.5 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Next: {new Date(v.nextAppointment).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    ))
                  : <p className="text-center text-[11px] text-[var(--text-tertiary)] pt-6">No visit notes yet</p>}
              </div>
            </div>
          </div>
        </div>

      ) : selectedPatientId && !selectedAttendanceId ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)]">
          <AlertCircle className="w-10 h-10 text-[var(--icon-yellow-text)] opacity-60" />
          <div className="text-center">
            <p className="text-sm font-semibold text-[var(--text-primary)]">No Visit Selected</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Select an existing visit or create a new one</p>
          </div>
          <button onClick={() => setShowNewAttendance(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-pink-100 text-pink-700 hover:bg-pink-700 hover:text-white transition-all">
            <Plus className="w-3.5 h-3.5" /> New Visit
          </button>
        </div>
      ) : null}

      {/* ── MODALS ─────────────────────────────────────────────────────────── */}
      {showNewAttendance && selectedPatientId && (
        <NewAttendanceModal patientId={selectedPatientId} onSuccess={handleAttendanceCreated} onClose={() => setShowNewAttendance(false)} isEditMode={false} />
      )}

      <DiagnosisModal  isOpen={modalType==='diagnosis'}  onClose={()=>setModalType(null)} onSuccess={afterModal} attendanceId={selectedAttendanceId} diagnoses={diagnoses}          canAdd={canAddEntries} userId={user?.id} />
      <LabTestModal    isOpen={modalType==='lab'}         onClose={()=>setModalType(null)} onSuccess={afterModal} attendanceId={selectedAttendanceId} labTests={labTestTemplates}   canAdd={canAddEntries} userId={user?.id} />
      <ProcedureModal  isOpen={modalType==='procedure'}   onClose={()=>setModalType(null)} onSuccess={afterModal} attendanceId={selectedAttendanceId} procedures={procedureTemplates} canAdd={canAddEntries} userId={user?.id} />
      <MedicationModal isOpen={modalType==='medication'}  onClose={()=>setModalType(null)} onSuccess={afterModal} attendanceId={selectedAttendanceId} stockItems={stockItems}       canAdd={canAddEntries} userId={user?.id} />
      <ScanModal       isOpen={modalType==='scan'}        onClose={()=>setModalType(null)} onSuccess={afterModal} attendanceId={selectedAttendanceId} scans={scanTemplates}         canAdd={canAddEntries} userId={user?.id} />

      {showANCVisitModal && selectedBookingId && selectedAttendanceId && (
        <ANCVisitModal isOpen={showANCVisitModal} onClose={()=>setShowANCVisitModal(false)}
          onSuccess={()=>{setShowANCVisitModal(false);if(currentBooking?.id)getANCVisitsByBooking(currentBooking.id);loadData();}}
          attendanceId={selectedAttendanceId} bookingId={selectedBookingId}
          visitNumber={currentVisits.length+1} existingVisit={editingVisit} />
      )}

      {showDeliveryModal && selectedAttendanceId && (
        <DeliveryModal isOpen={showDeliveryModal} onClose={()=>setShowDeliveryModal(false)}
          onSuccess={()=>{setShowDeliveryModal(false);getDeliveries({patientId:selectedPatientId});loadData();}}
          attendanceId={selectedAttendanceId} patientId={selectedPatientId} existingDelivery={editingDelivery} />
      )}

      {showPostnatalModal && selectedAttendanceId && (
        <PostnatalModal isOpen={showPostnatalModal} onClose={()=>setShowPostnatalModal(false)}
          onSuccess={()=>{setShowPostnatalModal(false);getPostnatals({patientId:selectedPatientId});loadData();}}
          attendanceId={selectedAttendanceId} patientId={selectedPatientId} existingPostnatal={editingPostnatal} />
      )}

      {/* ANC Booking Modal */}
      {modalType === 'anc_booking' && (
        <ModalShell title="Create Pregnancy Record" onClose={() => setModalType(null)} maxW="max-w-sm"
          footer={
            <div className="flex gap-3">
              <button type="button" onClick={() => setModalType(null)}
                className="flex-1 py-2 rounded-lg text-xs font-semibold border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-main)] transition-all">
                Cancel
              </button>
              <button form="booking-form" type="submit" disabled={ancLoading}
                className="flex-1 py-2 rounded-lg text-xs font-semibold bg-pink-500 text-white hover:bg-pink-600 disabled:opacity-50 transition-all">
                {ancLoading ? 'Creating…' : 'Create Record'}
              </button>
            </div>
          }>
          <form id="booking-form" onSubmit={e => { e.preventDefault(); const f = e.target as any; handleCreateBooking({ gravida: parseInt(f.gravida.value), para: parseInt(f.para.value), lmp: f.lmp.value || undefined }); }} className="space-y-4">
            {[
              { name: 'gravida', label: 'Gravida', type: 'number', min: '1', required: true },
              { name: 'para',    label: 'Para',    type: 'number', min: '0', required: true },
              { name: 'lmp',     label: 'LMP (Last Menstrual Period)', type: 'date', required: false },
            ].map(f => (
              <div key={f.name}>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">{f.label}{f.required && ' *'}</label>
                <input name={f.name} type={f.type} min={(f as any).min} required={f.required}
                  className="w-full px-3 py-2 text-xs bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--icon-cyan-text)]" />
              </div>
            ))}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">Previous C-Section</label>
              <select name="previousCSection" className="w-full px-3 py-2 text-xs bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]">
                <option value="false">No</option><option value="true">Yes</option>
              </select>
            </div>
          </form>
        </ModalShell>
      )}

      {/* Bed/Ward Selection Modal for Maternal Admissions */}
      <BedWardSelectionModalAntenatal
        isOpen={showBedWardModal}
        onClose={() => {
          setShowBedWardModal(false);
          setPendingAdmissionType(null);
        }}
        onConfirm={async (bedId, wardId, wardName, bedNumber) => {
          switch (pendingAdmissionType) {
            case 'antenatal_observation':
              await executeAntenatalAdmission(bedId, wardId, wardName, bedNumber);
              break;
            case 'delivery':
              await executeDeliveryAdmission(bedId, wardId, wardName, bedNumber);
              break;
            case 'postpartum_observation':
              await executePostpartumAdmission(bedId, wardId, wardName, bedNumber);
              break;
          }
        }}
        admissionType={pendingAdmissionType || 'antenatal_observation'}
        isLoading={isProcessingAdmission}
      />

      {/* ANC Visit Details */}
      {showVisitDetails && selectedVisit && (
        <ModalShell title={`ANC Visit #${selectedVisit.visitNumber}`} subtitle={new Date(selectedVisit.visitDate).toLocaleString()}
          onClose={() => setShowVisitDetails(false)}
          footer={
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowVisitDetails(false)} className="px-4 py-2 rounded-lg text-xs font-semibold border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-main)] transition-all">Close</button>
              <button onClick={() => { setShowVisitDetails(false); setEditingVisit(selectedVisit); setSelectedBookingId(currentBooking?.id||''); setShowANCVisitModal(true); }}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all">Edit Visit</button>
            </div>
          }>
          <div className="grid grid-cols-2 gap-4">
            {[
              { l: 'Gestational Age', v: `${selectedVisit.gestationalAgeWeeks||'—'} weeks` },
              { l: 'Weight', v: selectedVisit.weight ? `${selectedVisit.weight}kg` : '—' },
              { l: 'Blood Pressure', v: selectedVisit.bloodPressure || '—' },
              { l: 'Fundal Height', v: selectedVisit.fundalHeight ? `${selectedVisit.fundalHeight}cm` : '—' },
              { l: 'Fetal Heart Rate', v: selectedVisit.fetalHeartRate ? `${selectedVisit.fetalHeartRate}bpm` : '—' },
              { l: 'Presentation', v: selectedVisit.presentation || '—' },
              { l: 'IPTp Given', v: selectedVisit.iptpGiven ? `Yes (Dose ${selectedVisit.iptpDoseNumber})` : 'No' },
              { l: 'TT Given', v: selectedVisit.ttGiven ? `Yes (Dose ${selectedVisit.ttDoseNumber})` : 'No' },
              { l: 'ITN Given', v: selectedVisit.itnGiven ? 'Yes' : 'No' },
              { l: 'Iron/Folate', v: selectedVisit.ironGiven || selectedVisit.folateGiven ? 'Yes' : 'No' },
              { l: 'IPTp Given', v: selectedVisit.iptpGiven ? `Yes (Dose ${selectedVisit.iptpDoseNumber})` : 'No' },
              { l: 'TT Given', v: selectedVisit.ttGiven ? `Yes (Dose ${selectedVisit.ttDoseNumber})` : 'No' },
              { l: 'ITN Given', v: selectedVisit.itnGiven ? 'Yes' : 'No' },
              { l: 'Iron/Folate', v: selectedVisit.ironGiven || selectedVisit.folateGiven ? 'Yes' : 'No' },
              
              // ✅ ADD THESE NEW FIELDS:
              { l: 'Malaria Test', v: selectedVisit.malariaTestDone ? `Done (${selectedVisit.malariaTestResult||'—'})` : 'Not done' },
              { l: 'Malaria Treated', v: selectedVisit.malariaTreatmentGiven ? 'Yes' : 'No' },
              { l: 'Danger Signs', v: selectedVisit.dangerSignsPresent ? <span className="text-[var(--icon-red-text)] font-bold">Yes</span> : 'No' },
              { l: 'Referral Made', v: selectedVisit.referralMade ? 'Yes' : 'No' },
            ].map(r => <DetailRow key={r.l} label={r.l} value={r.v} />)}
          </div>
          {/* Show danger signs list if present */}
          {selectedVisit.dangerSignsPresent && selectedVisit.dangerSignsList?.length > 0 && (
            <div className="mt-4 px-3 py-2.5 rounded-lg border border-[var(--icon-red-text)] bg-[var(--icon-red-bg)]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--icon-red-text)] mb-1">⚠ Danger Signs Recorded</p>
              <p className="text-xs text-[var(--icon-red-text)]">{selectedVisit.dangerSignsList.join(', ')}</p>
            </div>
          )}
          
          {/* Show referral details if present */}
          {selectedVisit.referralMade && (
            <div className="mt-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">Referral Details</p>
              <p className="text-xs text-[var(--text-primary)]">To: {selectedVisit.referredTo || '—'}</p>
              {selectedVisit.referralReason && <p className="text-xs text-[var(--text-secondary)] mt-0.5">Reason: {selectedVisit.referralReason}</p>}
            </div>
          )}
        </ModalShell>
      )}

      {/* Delivery Details */}
      {showDeliveryDetails && selectedDelivery && (
        <ModalShell title="Delivery Details" subtitle={new Date(selectedDelivery.deliveryDate).toLocaleString()}
          onClose={() => setShowDeliveryDetails(false)}
          footer={
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowDeliveryDetails(false)} className="px-4 py-2 rounded-lg text-xs font-semibold border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-main)] transition-all">Close</button>
              <button onClick={() => { setShowDeliveryDetails(false); setEditingDelivery(selectedDelivery); setShowDeliveryModal(true); }}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] hover:bg-[var(--icon-green-text)] hover:text-white transition-all">Edit Delivery</button>
            </div>
          }>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[
                { l: 'Delivery Type',    v: selectedDelivery.deliveryType?.replace(/_/g,' ') },
                { l: 'Outcome',          v: selectedDelivery.deliveryOutcome?.replace(/_/g,' ') },
                { l: 'Birth Weight',     v: selectedDelivery.birthWeight ? `${selectedDelivery.birthWeight}g` : null },
                { l: 'Gestation Weeks',  v: selectedDelivery.gestationWeeks ? `${selectedDelivery.gestationWeeks}wks` : null },
                { l: 'No. of Babies',    v: selectedDelivery.numberOfBabies || 1 },
                { l: 'Blood Loss (ml)',  v: selectedDelivery.bloodLoss },
                { l: 'APGAR Score',      v: selectedDelivery.apgarScore },
                { l: 'Attendant',        v: selectedDelivery.attendant },
                { l: 'Postpartum Haemorrhage', v: selectedDelivery.postpartumHaemorrhage ? <span className="text-[var(--icon-red-text)] font-bold">Yes</span> : 'No' },
                { l: 'Est. Blood Loss', v: selectedDelivery.estimatedBloodLoss ? `${selectedDelivery.estimatedBloodLoss}ml` : '—' },
                { l: 'Family Planning Discussed', v: selectedDelivery.familyPlanningDiscussed ? 'Yes' : 'No' },
                { l: 'Male Partner Present', v: selectedDelivery.malePartnerPresentDelivery ? <span className="text-[var(--icon-cyan-text)] font-bold">Yes</span> : 'No' },
              
              ].map(r => r.v !== null && <DetailRow key={r.l} label={r.l} value={r.v} />)}
            </div>
            {selectedDelivery.complications && (
              <div className="px-3 py-2.5 rounded-lg border border-[var(--icon-red-text)] bg-[var(--icon-red-bg)]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--icon-red-text)] mb-1">⚠ Complications</p>
                <p className="text-xs text-[var(--icon-red-text)]">{selectedDelivery.complications}</p>
              </div>
            )}
            {/* Complications */}
            {selectedDelivery.maternalComplications?.length > 0 && (
              <div className="px-3 py-2.5 rounded-lg border border-[var(--icon-red-text)] bg-[var(--icon-red-bg)]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--icon-red-text)] mb-1">⚠ Complications</p>
                <p className="text-xs text-[var(--icon-red-text)]">{selectedDelivery.maternalComplications.join(', ')}</p>
              </div>
            )}
      
            {/* ✅ NEW: Newborns Section (Essential Newborn Care) */}
            {selectedDelivery.Newborn?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
                <p className="text-xs font-bold text-[var(--text-primary)] mb-2">Newborns ({selectedDelivery.Newborn.length})</p>
                <div className="space-y-3">
                  {selectedDelivery.Newborn.map((baby: any, idx: number) => (
                    <div key={baby.id || idx} className="bg-[var(--bg-main)] rounded-lg p-3 border border-[var(--border-color)]">
                      <p className="text-xs font-semibold text-[var(--text-primary)] mb-2">Baby #{baby.babyNumber}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span className="text-[var(--text-tertiary)]">Gender:</span> <span className="font-medium text-[var(--text-primary)]">{baby.gender}</span></div>
                        <div><span className="text-[var(--text-tertiary)]">Birth Weight:</span> <span className="font-medium text-[var(--text-primary)]">{baby.birthWeight}g</span></div>
                        <div><span className="text-[var(--text-tertiary)]">APGAR 1min:</span> <span className="font-medium text-[var(--text-primary)]">{baby.apgarScore1min||'—'}</span></div>
                        <div><span className="text-[var(--text-tertiary)]">APGAR 5min:</span> <span className="font-medium text-[var(--text-primary)]">{baby.apgarScore5min||'—'}</span></div>
                        <div><span className="text-[var(--text-tertiary)]">Resuscitation:</span> <span className={`font-medium ${baby.resuscitation ? 'text-[var(--icon-red-text)]' : 'text-[var(--icon-green-text)]'}`}>{baby.resuscitation ? 'Yes' : 'No'}</span></div>
                        <div><span className="text-[var(--text-tertiary)]">Outcome:</span> <span className="font-medium text-[var(--text-primary)]">{baby.outcome?.replace(/_/g,' ')}</span></div>
                        
                        {/* ✅ NEW: Essential Newborn Care (GHS Form A) */}
                        <div><span className="text-[var(--text-tertiary)]">BF 30min:</span> <span className={`font-medium ${baby.breastfeedingWithin30Min ? 'text-[var(--icon-green-text)]' : 'text-[var(--text-secondary)]'}`}>{baby.breastfeedingWithin30Min ? 'Yes' : 'No'}</span></div>
                        <div><span className="text-[var(--text-tertiary)]">Eye Prophylaxis:</span> <span className={`font-medium ${baby.eyeProphylaxisGiven ? 'text-[var(--icon-green-text)]' : 'text-[var(--text-secondary)]'}`}>{baby.eyeProphylaxisGiven ? 'Yes' : 'No'}</span></div>
                        <div><span className="text-[var(--text-tertiary)]">Cord Care:</span> <span className="font-medium text-[var(--text-primary)]">{baby.cordCareMethod?.replace(/_/g,' ') || '—'}</span></div>
                        <div><span className="text-[var(--text-tertiary)]">Follow-up Weight:</span> <span className="font-medium text-[var(--text-primary)]">{baby.babyWeightAt6to10Days ? `${baby.babyWeightAt6to10Days}g` : '—'}</span></div>
                      </div>
                      {baby.congenitalAnomalies?.length > 0 && (
                        <p className="text-[10px] text-[var(--icon-red-text)] mt-2">Anomalies: {baby.congenitalAnomalies.join(', ')}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {selectedDelivery.notes && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">Notes</p>
                <p className="text-xs text-[var(--text-primary)] whitespace-pre-wrap">{selectedDelivery.notes}</p>
              </div>
            )}
          </div>
        </ModalShell>
      )}

      {/* Postnatal Details */}
      {showPostnatalDetails && selectedPostnatal && (
        <ModalShell title={`Postnatal Day ${selectedPostnatal.dayNumber} Details`} subtitle={new Date(selectedPostnatal.examinationDate).toLocaleString()}
          onClose={() => setShowPostnatalDetails(false)}
          footer={
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowPostnatalDetails(false)} className="px-4 py-2 rounded-lg text-xs font-semibold border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-main)] transition-all">Close</button>
              <button onClick={() => { setShowPostnatalDetails(false); setEditingPostnatal(selectedPostnatal); setShowPostnatalModal(true); }}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all">Edit Exam</button>
            </div>
          }>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[
                { l: 'Day Number',       v: selectedPostnatal.dayNumber },
                { l: 'Maternal Status',  v: selectedPostnatal.maternalCondition },
                { l: 'Breastfeeding',    v: selectedPostnatal.breastfeedingStatus },
                { l: 'Lochia',           v: selectedPostnatal.lochia },
                { l: 'Uterus Involution',v: selectedPostnatal.uterusInvolution },
                { l: 'Blood Pressure',   v: selectedPostnatal.bloodPressure },
                { l: 'Temperature',      v: selectedPostnatal.temperature ? `${selectedPostnatal.temperature}°C` : null },
                { l: 'Pulse',            v: selectedPostnatal.pulse },
                
                // ✅ ADD THESE NEW FIELDS:
                { l: 'Baby Condition', v: selectedPostnatal.babyCondition },
                { l: 'Baby Weight', v: selectedPostnatal.babyWeight ? `${selectedPostnatal.babyWeight}kg` : '—' },
                { l: 'Baby Temperature', v: selectedPostnatal.babyTemperature ? `${selectedPostnatal.babyTemperature}°C` : '—' },
                { l: 'Cord Condition', v: selectedPostnatal.cordCondition },
                { l: 'Jaundice', v: selectedPostnatal.jaundice ? `Yes (${selectedPostnatal.jaundiceSeverity||'—'})` : 'No' },
                { l: 'BCG Given', v: selectedPostnatal.bcgGiven ? 'Yes' : 'No' },
                { l: 'OPV0 Given', v: selectedPostnatal.opv0Given ? 'Yes' : 'No' },
                { l: 'HepB0 Given', v: selectedPostnatal.hepB0Given ? 'Yes' : 'No' },
                { l: 'Family Planning', v: selectedPostnatal.familyPlanningDiscussed ? `Yes (${selectedPostnatal.familyPlanningMethodAccepted||'—'})` : 'No' },
                { l: 'Exclusive BF at Discharge', v: selectedPostnatal.exclusiveBFAtDischarge ? <span className="text-[var(--icon-green-text)] font-bold">Yes</span> : 'No' },
                { l: 'Male Partner Present', v: selectedPostnatal.malePartnerPresentPNC ? <span className="text-[var(--icon-cyan-text)] font-bold">Yes</span> : 'No' },
              
              ].map(r => r.v !== null && <DetailRow key={r.l} label={r.l} value={r.v} />)}
            </div>
            {selectedPostnatal.complications && (
              <div className="px-3 py-2.5 rounded-lg border border-[var(--icon-red-text)] bg-[var(--icon-red-bg)]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--icon-red-text)] mb-1">⚠ Complications</p>
                <p className="text-xs text-[var(--icon-red-text)]">{selectedPostnatal.complications}</p>
              </div>
            )}
            {selectedPostnatal.familyPlanningCounselling && (
              <div className="px-3 py-2.5 rounded-lg border border-[var(--icon-green-text)] bg-[var(--icon-green-bg)]">
                <p className="text-[10px] font-bold text-[var(--icon-green-text)]">✓ Family Planning Counselling Given</p>
                {selectedPostnatal.familyPlanningMethod && <p className="text-[11px] text-[var(--icon-green-text)] mt-0.5">Method: {selectedPostnatal.familyPlanningMethod}</p>}
              </div>
            )}
            {selectedPostnatal.notes && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">Notes</p>
                <p className="text-xs text-[var(--text-primary)] whitespace-pre-wrap">{selectedPostnatal.notes}</p>
              </div>
            )}
                  {/* Complications */}
          {selectedPostnatal.maternalComplications?.length > 0 && (
            <div className="px-3 py-2.5 rounded-lg border border-[var(--icon-red-text)] bg-[var(--icon-red-bg)]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--icon-red-text)] mb-1">⚠ Maternal Complications</p>
              <p className="text-xs text-[var(--icon-red-text)]">{selectedPostnatal.maternalComplications.join(', ')}</p>
            </div>
          )}
          
          {/* Danger Signs */}
          {(selectedPostnatal.maternalDangerSigns?.length > 0 || selectedPostnatal.babyDangerSigns?.length > 0) && (
            <div className="px-3 py-2.5 rounded-lg border border-[var(--icon-orange-text)] bg-[var(--icon-orange-bg)]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--icon-orange-text)] mb-1">⚠ Danger Signs</p>
              {selectedPostnatal.maternalDangerSigns?.length > 0 && (
                <p className="text-xs text-[var(--icon-orange-text)]">Maternal: {selectedPostnatal.maternalDangerSigns.join(', ')}</p>
              )}
              {selectedPostnatal.babyDangerSigns?.length > 0 && (
                <p className="text-xs text-[var(--icon-orange-text)] mt-1">Baby: {selectedPostnatal.babyDangerSigns.join(', ')}</p>
              )}
            </div>
          )}
          
          {/* Next Visit */}
          {selectedPostnatal.nextVisitDate && (
            <div className="mt-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">Next Visit</p>
              <p className="text-xs text-[var(--text-primary)]">
                {new Date(selectedPostnatal.nextVisitDate).toLocaleDateString()} 
                {selectedPostnatal.nextVisitType && ` (${selectedPostnatal.nextVisitType.replace(/_/g,' ')})`}
              </p>
            </div>
          )}
          
          {/* Notes */}
          {selectedPostnatal.notes && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">Notes</p>
              <p className="text-xs text-[var(--text-primary)] whitespace-pre-wrap">{selectedPostnatal.notes}</p>
            </div>
          )}
          </div>
        </ModalShell>
      )}
    </div>
  );
}