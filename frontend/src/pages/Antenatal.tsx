// src/pages/Antenatal.tsx - CORRECTED VERSION (No Manual Creation)
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAntenatalStore } from '../store/antenatalStore';
import { useDeliveryStore } from '../store/deliveryStore';
import { usePostnatalStore } from '../store/postnatalStore';
import { useAttendanceStore } from '../store/attendanceStore';
import { usePatientStore } from '../store/patientStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import { useWardStore } from '../store/wardStore';
import { useAdmissionStore } from '../store/admissionStore';
import { PatientAttendanceSelector } from '../components/vitals/PatientAttendanceSelector';
import { VitalsDisplay } from '../components/medical-entries/VitalsDisplay';
import { ANCVisitModal } from '../components/antenatal/ANCVisitModal';
import { DeliveryModal } from '../components/delivery/DeliveryModal';
import { PostnatalModal } from '../components/postnatal/PostnatalModal';
import {
  ChevronLeft, RefreshCw, X, Stethoscope, Edit, Calendar,
  Baby, Heart, TrendingUp, Eye, Hospital, Users, Bed, Building2, Moon,
  AlertTriangle, Syringe, Ruler, Shield, ClipboardList, ShieldCheck, Pill,
} from 'lucide-react';

const getEntityId = (e: { id?: string; _id?: string } | null) => e?._id || e?.id;

function calculateAge(dob: Date): number {
  if (!dob) return 0;
  const today = new Date(), b = new Date(dob);
  let age = today.getFullYear() - b.getFullYear();
  if (today.getMonth() < b.getMonth() || (today.getMonth() === b.getMonth() && today.getDate() < b.getDate())) age--;
  return age;
}

// ── Shared primitives (same as before) ──
const RiskBadge: React.FC<{ risk: string }> = ({ risk }) => {
  const map: Record<string, string> = {
    low: 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]',
    medium: 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]',
    high: 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]',
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

const EmptySlate: React.FC<{ icon: React.ReactNode; label: string; description?: string }> = ({ icon, label, description }) => (
  <div className="flex flex-col items-center justify-center py-10 gap-2.5">
    <div className="opacity-20">{icon}</div>
    <p className="text-xs text-[var(--text-tertiary)]">{label}</p>
    {description && <p className="text-[10px] text-[var(--text-tertiary)] opacity-70">{description}</p>}
  </div>
);

const EditBtn: React.FC<{ onClick: () => void; label?: string }> = ({ onClick, label = 'Edit' }) => (
  <button onClick={onClick}
    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold
    bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]
    hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all">
    <Edit className="w-3 h-3" />{label}
  </button>
);

const DetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div>
    <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-0.5">{label}</p>
    <p className="text-xs font-medium text-[var(--text-primary)]">{value || '—'}</p>
  </div>
);

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

// ═════════════════════════════════════════════════════════════════════════════
// ─── Bed/Ward Selection Modal for Maternal Admissions ─────────────────────
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
          {wardsLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
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
              {selectedWardId && (
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] mb-2">
                    <Bed className="w-3.5 h-3.5" />
                    Step 2: Select Bed in {selectedWardName}
                  </label>
                  {availableBedsInWard.length === 0 ? (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <span className="text-xs text-[var(--text-secondary)]">No available beds in this ward.</span>
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
  const { attendanceId: urlAttendanceId } = useParams();
  const { success, error: toastError } = useToast();
  const { user } = useAuthStore();

  const { patients, loadPatients } = usePatientStore();
  const {
    attendances, currentAttendance, getAttendance, getAttendances,
    canAddMedicalEntries, getVitalsByAttendance, updateAttendance,
  } = useAttendanceStore();
  
  // UPDATED: Use correct store method names
  const { currentRecord, currentVisits, getActiveAntenatalRecordByPatient, getANCVisitsByAntenatalRecord,
    deleteANCVisit, isLoading: ancLoading } = useAntenatalStore();
  const { deliveries, getDeliveryRecords, deleteDeliveryRecord } = useDeliveryStore();
  const { postnatalRecords, getPostnatalRecords, deletePostnatalRecord } = usePostnatalStore();
  
  const { updateBed } = useWardStore();
  const { createAdmission, getAdmissions } = useAdmissionStore();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedAttendanceId, setSelectedAttendanceId] = useState('');
  const [latestVitals, setLatestVitals] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'anc' | 'delivery' | 'postnatal' | 'family_planning' | 'vitals'>('anc');

  // Modal states - ONLY for editing existing records
  const [showANCVisitModal, setShowANCVisitModal] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [editingVisit, setEditingVisit] = useState<any>(null);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<any>(null);
  const [showPostnatalModal, setShowPostnatalModal] = useState(false);
  const [editingPostnatal, setEditingPostnatal] = useState<any>(null);

  const [selectedVisit, setSelectedVisit] = useState<any>(null);
  const [showVisitDetails, setShowVisitDetails] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);
  const [showDeliveryDetails, setShowDeliveryDetails] = useState(false);
  const [selectedPostnatal, setSelectedPostnatal] = useState<any>(null);
  const [showPostnatalDetails, setShowPostnatalDetails] = useState(false);

  // Bed/Ward Admission States
  const [showBedWardModal, setShowBedWardModal] = useState(false);
  const [pendingAdmissionType, setPendingAdmissionType] = useState<'antenatal_observation' | 'delivery' | 'postpartum_observation' | null>(null);
  const [isProcessingAdmission, setIsProcessingAdmission] = useState(false);

  const antenatalAttendances = useMemo(() => attendances.filter(a => a.attendanceType === 'antenatal'), [attendances]);
  const deliveryAttendances = useMemo(() => attendances.filter(a => a.attendanceType === 'delivery'), [attendances]);
  const postnatalAttendances = useMemo(() => attendances.filter(a => a.attendanceType === 'postnatal'), [attendances]);

  const getCurrentAttendances = () => {
    if (activeTab === 'anc') return antenatalAttendances;
    if (activeTab === 'delivery') return deliveryAttendances;
    if (activeTab === 'postnatal') return postnatalAttendances;
    return attendances;
  };

  const selectedPatient = patients.find(p => getEntityId(p) === selectedPatientId);
  const canAddEntries = currentAttendance ? canAddMedicalEntries(currentAttendance) : false;
  const hasActiveBooking = currentRecord?.isActive === true && currentRecord?.isCompleted === false;

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
    if (!currentRecord?.edd) return 'N/A';
    const edd = new Date(currentRecord.edd);
    const daysLeft = Math.ceil((edd.getTime() - Date.now()) / 864e5);
    return `${edd.toLocaleDateString()} (${daysLeft}d left)`;
  };

  const loadData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadPatients(),
        getAttendances(),
        getDeliveryRecords(),
        getPostnatalRecords(),
      ]);
    } catch (err: any) {
      toastError('Load failed', err.message);
    } finally {
      setRefreshing(false);
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (!urlAttendanceId || !attendances.length) return;
    const att = attendances.find(a => a.id === urlAttendanceId || a._id === urlAttendanceId);
    if (!att) return;
    const patientId = att.patientId || att.patient?.id || att.patient?._id;
    if (patientId) setSelectedPatientId(patientId);
    setSelectedAttendanceId(urlAttendanceId);
  }, [urlAttendanceId, attendances]);

  useEffect(() => {
    if (!selectedPatientId) {
      setSelectedAttendanceId('');
      setLatestVitals(null);
      return;
    }
    getActiveAntenatalRecordByPatient(selectedPatientId).catch(() => {});
    getDeliveryRecords({ patientId: selectedPatientId }).catch(() => {});
    getPostnatalRecords({ patientId: selectedPatientId }).catch(() => {});
  }, [selectedPatientId]);

  useEffect(() => {
    if (currentRecord?.id) getANCVisitsByAntenatalRecord(currentRecord.id);
  }, [currentRecord?.id]);

  useEffect(() => {
    if (!currentAttendance?.attendanceType) return;
    const t = currentAttendance.attendanceType;
    if (t === 'antenatal') setActiveTab('anc');
    else if (t === 'delivery') setActiveTab('delivery');
    else if (t === 'postnatal') setActiveTab('postnatal');
  }, [currentAttendance?.attendanceType, selectedAttendanceId]);

  const handleClearSelection = () => { setSelectedPatientId(''); setSelectedAttendanceId(''); };

  const handleEditCurrentVisit = () => {
    if (!currentRecord?.id) { toastError('Error', 'No pregnancy record found'); return; }
    if (!currentAttendanceVisit) { toastError('No Visit', 'This attendance has no ANC visit record'); return; }
    setEditingVisit(currentAttendanceVisit);
    setSelectedBookingId(currentRecord.id);
    setShowANCVisitModal(true);
  };

  const handleDeleteANCVisit = async (id: string) => {
    if (!window.confirm('Delete this ANC visit?')) return;
    try {
      await deleteANCVisit(id);
      if (currentRecord?.id) getANCVisitsByAntenatalRecord(currentRecord.id);
      success('Deleted', 'Visit removed');
    } catch (err: any) {
      toastError('Delete failed', err.message);
    }
  };

  const handleDeleteDeliveryRecord = async (id: string) => {
    if (!window.confirm('Delete this delivery record?')) return;
    try {
      await deleteDeliveryRecord(id);
      await getDeliveryRecords({ patientId: selectedPatientId });
      success('Deleted', 'Delivery removed');
    } catch (err: any) {
      toastError('Delete failed', err.message);
    }
  };

  const handleDeletePostnatalRecord = async (id: string) => {
    if (!window.confirm('Delete this postnatal record?')) return;
    try {
      await deletePostnatalRecord(id);
      await getPostnatalRecords({ patientId: selectedPatientId });
      success('Deleted', 'Record removed');
    } catch (err: any) {
      toastError('Delete failed', err.message);
    }
  };

  // ─── MATERNAL ADMISSION HANDLERS ───────────────────────────────────────
  const handleAdmitForObservation = () => {
    setPendingAdmissionType('antenatal_observation');
    setShowBedWardModal(true);
  };

  const executeAntenatalAdmission = async (bedId: string, wardId: string, wardName: string, bedNumber: string) => {
    if (!selectedAttendanceId || !currentAttendance || !selectedPatient) return;
    setIsProcessingAdmission(true);
    try {
      await updateBed(bedId, { isOccupied: true, currentPatientId: selectedPatientId });
      await createAdmission({
        attendanceId: selectedAttendanceId,
        admissionType: 'antenatal_observation',
        admissionSource: 'antenatal',
        admissionDate: new Date().toISOString(),
      });
      await updateAttendance(selectedAttendanceId, {
        encounterCategory: 'ipd',
        status: 'admitted',
        admissionType: 'antenatal_observation',
        bedId: bedId,
        wardId: wardId,
        medicalNotes: `${currentAttendance.medicalNotes || ''}\n\n[Antenatal Admission] Admitted for observation. Bed: ${bedNumber}, Ward: ${wardName}`,
        updatedById: user?.id
      });
      success('Admitted', `Patient admitted to Bed ${bedNumber}, ${wardName}`);
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
        medicalNotes: `${currentAttendance.medicalNotes || ''}\n\n[Delivery Admission] Patient in active labor. Bed: ${bedNumber}, Ward: ${wardName}`,
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
        medicalNotes: `${currentAttendance.medicalNotes || ''}\n\n[Postpartum] Patient admitted for observation. Bed: ${bedNumber}, Ward: ${wardName}`,
        updatedById: user?.id
      });
      success('Admitted', `Patient admitted to Bed ${bedNumber}, ${wardName}`);
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
          <button onClick={handleAdmitForObservation}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
              bg-purple-100 text-purple-700 hover:bg-purple-700 hover:text-white transition-all">
            <Moon className="w-3.5 h-3.5" /> Antenatal Observation
          </button>
          <button onClick={handleAdmitForDelivery}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
              bg-green-100 text-green-700 hover:bg-green-700 hover:text-white transition-all">
            <Hospital className="w-3.5 h-3.5" /> Admit for Delivery
          </button>
          <button onClick={handleAdmitForPostpartum}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
              bg-cyan-100 text-cyan-700 hover:bg-cyan-700 hover:text-white transition-all">
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

  const tabs = [
    { key: 'anc', label: 'ANC Visits', icon: <Baby className="w-3.5 h-3.5" />, count: currentVisits.length },
    { key: 'delivery', label: 'Delivery', icon: <Hospital className="w-3.5 h-3.5" />, count: deliveries.filter((d: any) => d.attendanceId === selectedAttendanceId).length },
    { key: 'postnatal', label: 'Postnatal', icon: <Heart className="w-3.5 h-3.5" />, count: postnatalRecords.filter((p: any) => p.attendanceId === selectedAttendanceId).length },
    { key: 'family_planning', label: 'Family Planning', icon: <ShieldCheck className="w-3.5 h-3.5" />, count: currentAttendance?.familyPlanningDiscussed ? 1 : 0 },
    { key: 'vitals', label: 'Vitals', icon: <Stethoscope className="w-3.5 h-3.5" /> },
  ] as const;

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
              <h1 className="text-base font-bold text-[var(--text-primary)] leading-tight">Maternal Health Management</h1>
              <p className="text-[10px] text-[var(--text-tertiary)] leading-tight">Manage ANC · Delivery · Postnatal Records</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
                activeTab === 'delivery' ? 'bg-[var(--icon-green-bg)]' : activeTab === 'postnatal' ? 'bg-[var(--icon-cyan-bg)]' : activeTab === 'family_planning' ? 'bg-purple-100' : 'bg-pink-100'
              }`}>
                {activeTab === 'delivery' ? <Hospital className="w-5 h-5 text-[var(--icon-green-text)]" />
                  : activeTab === 'postnatal' ? <Heart className="w-5 h-5 text-[var(--icon-cyan-text)]" />
                  : activeTab === 'family_planning' ? <ShieldCheck className="w-5 h-5 text-purple-600" />
                  : <Baby className="w-5 h-5 text-pink-600" />}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm font-bold text-[var(--text-primary)]">{selectedPatient.surname} {selectedPatient.otherNames}</h2>
                  <span className="text-[11px] text-[var(--text-tertiary)]">{calculateAge(selectedPatient.dateOfBirth)}y · {selectedPatient.gender}</span>
                  {activeTab === 'anc' && hasActiveBooking && <RiskBadge risk={currentRecord?.riskLevel || 'low'} />}
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                  {selectedPatient.folderNumber} · {selectedPatient.contact}
                  {activeTab === 'anc' && currentRecord?.edd && (
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
              {getMaternalActionButtons()}
            </div>
          </div>
        </div>
      )}

      {/* ── VITALS STRIP ──────────────────────────────────────────────────── */}
      {currentAttendance && latestVitals && <VitalsDisplay vitals={latestVitals} />}

      {/* ── NO RECORD INFO ─────────────────────────────────────────────── */}
      {activeTab === 'anc' && selectedPatient && !hasActiveBooking && (
        <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-[var(--icon-yellow-text)] bg-[var(--icon-yellow-bg)] flex-wrap">
          <AlertTriangle className="w-4 h-4 text-[var(--icon-yellow-text)] flex-shrink-0" />
          <span className="text-xs font-medium text-[var(--icon-yellow-text)]">No antenatal booking found for this patient. Create an antenatal encounter first to auto-generate the booking.</span>
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

              {/* ── ANC TAB ── */}
              {activeTab === 'anc' && (
                <div className="p-4 space-y-4">
                  {hasActiveBooking && (
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                      {[
                        { icon: <Baby className="w-4 h-4 text-pink-500" />, label: 'G/P', value: `${currentRecord?.gravida || 0}/${currentRecord?.para || 0}` },
                        { icon: <Calendar className="w-4 h-4 text-purple-500" />, label: 'Weeks', value: currentRecord?.gestationalAgeWeeks || '?' },
                        { icon: <Heart className="w-4 h-4 text-red-500" />, label: 'FHR (bpm)', value: latestVitals?.fetalHeartRate || '—' },
                        { icon: <Ruler className="w-4 h-4 text-blue-500" />, label: 'Fundal Ht', value: latestVitals?.fundalHeight ? `${latestVitals.fundalHeight}cm` : '—' },
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

                  {hasActiveBooking && currentVisits.length > 0 && (
                    <div className="flex items-center gap-4 px-4 py-3 rounded-xl border border-[var(--icon-cyan-text)] bg-[var(--icon-cyan-bg)]">
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Syringe className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                        <span className="text-xs font-bold text-[var(--icon-cyan-text)]">IPTp</span>
                      </div>
                      {['IPTp-1', 'IPTp-2', 'IPTp-3', 'IPTp-4', 'IPTp-5+'].map((label, i) => (
                        <div key={i} className="text-center">
                          <p className="text-xs font-bold text-[var(--icon-cyan-text)]">{Object.values(iptpSummary)[i]}</p>
                          <p className="text-[10px] text-[var(--text-secondary)]">{label}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <SectionCard
                    icon={<Baby className="w-4 h-4 text-pink-600" />}
                    title={`ANC Visit History (${currentVisits.length})`}
                    action={hasActiveBooking && currentAttendanceVisit && (
                      <EditBtn onClick={handleEditCurrentVisit} label="Edit Visit" />
                    )}
                    maxH="max-h-96"
                  >
                    {currentVisits.length === 0
                      ? <EmptySlate icon={<Baby className="w-9 h-9" />} label="No ANC visits recorded yet" description="Visit data will appear here once recorded" />
                      : (
                        <table className="w-full text-xs">
                          <thead className="sticky top-0 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                            <tr><th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">#</th><th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Date</th><th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">GA(wks)</th><th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Weight</th><th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">BP</th><th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">FHR</th><th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Fundal</th><th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">IPTp</th><th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">TT</th><th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">ITN</th><th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Danger</th><th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]"></th></tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border-color)]">
                            {currentVisits.map((v: any) => {
                              const isCurrent = v.attendanceId === selectedAttendanceId;
                              return (
                                <tr key={v.id} className={`hover:bg-[var(--bg-main)] transition-colors ${isCurrent ? 'bg-pink-50/20' : ''}`}>
                                  <td className="px-3 py-2 text-[var(--text-secondary)] text-xs">{v.visitNumber}{isCurrent && <span className="ml-1 text-[9px] text-pink-500">(now)</span>}</td>
                                  <td className="px-3 py-2 text-[var(--text-secondary)] text-xs">{new Date(v.visitDate).toLocaleDateString()}</td>
                                  <td className="px-3 py-2 text-[var(--text-secondary)] text-xs">{v.gestationalAgeWeeks || '—'}</td>
                                  <td className="px-3 py-2 text-[var(--text-secondary)] text-xs">{v.weight ? `${v.weight}kg` : '—'}</td>
                                  <td className="px-3 py-2 text-[var(--text-secondary)] text-xs">{v.bloodPressure || '—'}</td>
                                  <td className="px-3 py-2 text-[var(--text-secondary)] text-xs">{v.fetalHeartRate || '—'}</td>
                                  <td className="px-3 py-2 text-[var(--text-secondary)] text-xs">{v.fundalHeight ? `${v.fundalHeight}cm` : '—'}</td>
                                  <td className="px-3 py-2 text-[var(--text-secondary)] text-xs">{v.iptpGiven ? `D${v.iptpDoseNumber}` : '—'}</td>
                                  <td className="px-3 py-2 text-[var(--text-secondary)] text-xs">{v.ttGiven ? `D${v.ttDoseNumber}` : '—'}</td>
                                  <td className="px-3 py-2 text-[var(--text-secondary)] text-xs">{v.itnGiven ? '✓' : '—'}</td>
                                  <td className="px-3 py-2 text-[var(--text-secondary)] text-xs">{v.dangerSignsPresent ? <span className="text-[var(--icon-red-text)] font-bold">Yes</span> : '—'}</td>
                                  <td className="px-3 py-2 text-[var(--text-secondary)] text-xs">
                                    <div className="flex gap-0.5">
                                      <button onClick={() => { setSelectedVisit(v); setShowVisitDetails(true); }} className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-bg)] transition-all"><Eye className="w-3 h-3" /></button>
                                      <button onClick={() => { setEditingVisit(v); setSelectedBookingId(currentRecord?.id || ''); setShowANCVisitModal(true); }} className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-bg)] transition-all"><Edit className="w-3 h-3" /></button>
                                      <button onClick={() => handleDeleteANCVisit(v.id)} className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--icon-red-text)] hover:bg-[var(--icon-red-bg)] transition-all"><X className="w-3 h-3" /></button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                  </SectionCard>

                  {currentVisits.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { icon: <AlertTriangle className="w-4 h-4 text-[var(--icon-yellow-text)]" />, title: 'Malaria in Pregnancy', rows: [
                          { l: 'Tested', v: currentVisits.filter((v: any) => v.malariaTestDone).length },
                          { l: 'Positive', v: currentVisits.filter((v: any) => v.malariaTestResult === 'Positive').length, danger: true },
                          { l: 'Treated', v: currentVisits.filter((v: any) => v.malariaTreatmentGiven).length },
                        ]},
                        { icon: <AlertTriangle className="w-4 h-4 text-[var(--icon-orange-text)]" />, title: 'Danger Signs & Referrals', rows: [
                          { l: 'Danger Signs', v: currentVisits.filter((v: any) => v.dangerSignsPresent).length, danger: true },
                          { l: 'Referrals', v: currentVisits.filter((v: any) => v.referralMade).length },
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
                    count={deliveries.filter((d: any) => d.attendanceId === selectedAttendanceId).length}
                    countCls="bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]"
                    maxH="max-h-[600px]">
                    {deliveries.filter((d: any) => d.attendanceId === selectedAttendanceId).length === 0
                      ? <EmptySlate icon={<Hospital className="w-9 h-9" />} label="No delivery records for this visit" description="Delivery data will appear here once recorded" />
                      : <div className="divide-y divide-[var(--border-color)]">
                          {deliveries.filter((d: any) => d.attendanceId === selectedAttendanceId).map((d: any) => (
                            <div key={d.id} className="p-4 hover:bg-[var(--bg-main)] transition-colors">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-[var(--text-primary)]">Delivery — {new Date(d.deliveryDate).toLocaleDateString()}</p>
                                  <div className="flex flex-wrap gap-2 mt-1.5">
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]">{d.deliveryType?.replace(/_/g, ' ')}</span>
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]">{d.deliveryOutcome?.replace(/_/g, ' ')}</span>
                                    {d.birthWeight && <span className="text-[10px] text-[var(--text-tertiary)]">Wt: {d.birthWeight}g</span>}
                                    {d.gestationWeeks && <span className="text-[10px] text-[var(--text-tertiary)]">{d.gestationWeeks}wks</span>}
                                  </div>
                                </div>
                                <div className="flex gap-0.5">
                                  <button onClick={() => { setSelectedDelivery(d); setShowDeliveryDetails(true); }} className="p-1.5 rounded text-[var(--text-tertiary)] hover:text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-bg)] transition-all"><Eye className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => { setEditingDelivery(d); setShowDeliveryModal(true); }} className="p-1.5 rounded text-[var(--text-tertiary)] hover:text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-bg)] transition-all"><Edit className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => handleDeleteDeliveryRecord(d.id)} className="p-1.5 rounded text-[var(--text-tertiary)] hover:text-[var(--icon-red-text)] hover:bg-[var(--icon-red-bg)] transition-all"><X className="w-3.5 h-3.5" /></button>
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
                    count={postnatalRecords.filter((p: any) => p.attendanceId === selectedAttendanceId).length}
                    maxH="max-h-[600px]">
                    {postnatalRecords.filter((p: any) => p.attendanceId === selectedAttendanceId).length === 0
                      ? <EmptySlate icon={<Heart className="w-9 h-9" />} label="No postnatal examinations for this visit" description="Postnatal data will appear here once recorded" />
                      : <div className="divide-y divide-[var(--border-color)]">
                          {postnatalRecords.filter((p: any) => p.attendanceId === selectedAttendanceId).map((pn: any) => (
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
                                  <button onClick={() => handleDeletePostnatalRecord(pn.id)} className="p-1.5 rounded text-[var(--text-tertiary)] hover:text-[var(--icon-red-text)] hover:bg-[var(--icon-red-bg)] transition-all"><X className="w-3.5 h-3.5" /></button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>}
                  </SectionCard>
                </div>
              )}

              {/* ── FAMILY PLANNING TAB ── */}
              {activeTab === 'family_planning' && (
                <div className="p-4 space-y-4">
                  <SectionCard
                    icon={<ShieldCheck className="w-4 h-4 text-purple-600" />}
                    title="Family Planning Services"
                  >
                    {currentAttendance?.familyPlanningDiscussed ? (
                      <div className="p-4 space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="bg-purple-50 rounded-lg p-3 border border-purple-200 text-center">
                            <ShieldCheck className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                            <p className="text-xs font-bold text-purple-700">FP Discussed</p>
                            <p className="text-[10px] text-purple-600">Yes</p>
                          </div>
                          <div className="bg-green-50 rounded-lg p-3 border border-green-200 text-center">
                            <ClipboardList className="w-5 h-5 text-green-600 mx-auto mb-1" />
                            <p className="text-xs font-bold text-green-700">Counselling</p>
                            <p className="text-[10px] text-green-600">{currentAttendance.fpCounsellingGiven ? 'Given' : 'Not Given'}</p>
                          </div>
                          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 text-center">
                            <Calendar className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                            <p className="text-xs font-bold text-blue-700">Next Follow-up</p>
                            <p className="text-[10px] text-blue-600">
                              {currentAttendance.nextFollowUp ? new Date(currentAttendance.nextFollowUp).toLocaleDateString() : 'Not set'}
                            </p>
                          </div>
                          <div className="bg-cyan-50 rounded-lg p-3 border border-cyan-200 text-center">
                            <Pill className="w-5 h-5 text-cyan-600 mx-auto mb-1" />
                            <p className="text-xs font-bold text-cyan-700">Method</p>
                            <p className="text-[10px] text-cyan-600 truncate">
                              {currentAttendance.familyPlanningMethodAccepted?.replace(/_/g, ' ') || 'Not selected'}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="border rounded-lg p-3">
                            <h4 className="text-xs font-bold text-[var(--text-primary)] mb-2 flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                              Method Details
                            </h4>
                            <div className="space-y-2 text-xs">
                              <div className="flex justify-between">
                                <span className="text-[var(--text-secondary)]">Method Accepted:</span>
                                <span className="font-medium text-[var(--text-primary)]">
                                  {currentAttendance.familyPlanningMethodAccepted?.replace(/_/g, ' ') || '—'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-[var(--text-secondary)]">Method Provided:</span>
                                <span className="font-medium text-[var(--text-primary)]">
                                  {currentAttendance.fpMethodProvided?.replace(/_/g, ' ') || 'Not provided today'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="border rounded-lg p-3">
                            <h4 className="text-xs font-bold text-[var(--text-primary)] mb-2 flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
                              Side Effects & Notes
                            </h4>
                            <div className="space-y-2 text-xs">
                              <div>
                                <span className="text-[var(--text-secondary)]">Side Effects:</span>
                                <p className="font-medium text-[var(--text-primary)] mt-0.5">
                                  {currentAttendance.sideEffects || 'None reported'}
                                </p>
                              </div>
                              {currentAttendance.notes && (
                                <div>
                                  <span className="text-[var(--text-secondary)]">Notes:</span>
                                  <p className="font-medium text-[var(--text-primary)] mt-0.5 whitespace-pre-wrap">
                                    {currentAttendance.notes}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <EmptySlate
                        icon={<ShieldCheck className="w-9 h-9" />}
                        label="No family planning record for this visit"
                        description="FP data will appear here once recorded during the encounter"
                      />
                    )}
                  </SectionCard>
                </div>
              )}

              {/* ── VITALS TAB ── */}
              {activeTab === 'vitals' && (
                <div className="p-4">
                  <SectionCard icon={<Stethoscope className="w-4 h-4 text-pink-500" />} title="Latest Vitals" maxH="max-h-96">
                    {latestVitals ? (
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                          <tr><th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Date / Time</th><th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">BP</th><th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Temp</th><th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Pulse</th><th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Weight</th><th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">FHR</th><th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Fundal Ht</th></tr>
                        </thead>
                        <tbody>
                          <tr className="hover:bg-[var(--bg-main)] transition-colors">
                            <td className="px-3 py-2 text-[var(--text-secondary)] text-xs">{new Date(latestVitals.recordedAt).toLocaleString()}</td>
                            <td className="px-3 py-2 text-[var(--text-secondary)] text-xs">{latestVitals.bloodPressure || '—'}</td>
                            <td className="px-3 py-2 text-[var(--text-secondary)] text-xs">{latestVitals.temperature ? `${latestVitals.temperature}°C` : '—'}</td>
                            <td className="px-3 py-2 text-[var(--text-secondary)] text-xs">{latestVitals.pulse || '—'}</td>
                            <td className="px-3 py-2 text-[var(--text-secondary)] text-xs">{latestVitals.weight ? `${latestVitals.weight}kg` : '—'}</td>
                            <td className="px-3 py-2 text-[var(--text-secondary)] text-xs">{latestVitals.fetalHeartRate || '—'}</td>
                            <td className="px-3 py-2 text-[var(--text-secondary)] text-xs">{latestVitals.fundalHeight ? `${latestVitals.fundalHeight}cm` : '—'}</td>
                          </tr>
                        </tbody>
                      </table>
                    ) : <EmptySlate icon={<Stethoscope className="w-8 h-8" />} label="No vitals recorded" />}
                  </SectionCard>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="w-64 xl:w-72 flex-shrink-0">
            <div
              className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden flex flex-col"
              style={{
                position: 'sticky',
                top: '80px',
                height: 'calc(100vh - 100px)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-main)] flex-shrink-0">
                <Baby className="w-4 h-4 text-pink-500" />
                <span className="text-xs font-semibold text-[var(--text-primary)]">Pregnancy Overview</span>
              </div>
              <div
                className="overflow-y-auto p-3 space-y-3 bg-[var(--bg-main)]"
                style={{ flex: '1 1 0', minHeight: 0, scrollbarWidth: 'thin' }}
              >
                {hasActiveBooking ? (
                  <>
                    <div className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border-color)] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-pink-500 uppercase tracking-wider">Current Pregnancy</span>
                        <RiskBadge risk={currentRecord?.riskLevel || 'low'} />
                      </div>
                      {[
                        { l: 'Gravida / Para', v: `${currentRecord?.gravida || 0} / ${currentRecord?.para || 0}` },
                        { l: 'Gestation', v: currentRecord?.gestationalAgeWeeks ? `${currentRecord.gestationalAgeWeeks} wks` : 'N/A' },
                        { l: 'LMP', v: currentRecord?.lmp ? new Date(currentRecord.lmp).toLocaleDateString() : 'N/A' },
                        { l: 'EDD', v: getEDDDisplay() },
                        { l: 'Blood Group', v: currentRecord?.bloodGroup || 'Not recorded' },
                        { l: 'Prev. C-Section', v: currentRecord?.previousCSection ? 'Yes' : 'No' },
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
            </div>
          </div>
        </div>
      ) : selectedPatientId && !selectedAttendanceId ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)]">
          <AlertTriangle className="w-10 h-10 text-[var(--icon-yellow-text)] opacity-60" />
          <div className="text-center">
            <p className="text-sm font-semibold text-[var(--text-primary)]">No Visit Selected</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Select an existing maternal visit to manage records</p>
          </div>
        </div>
      ) : null}

      {/* ── MODALS ─────────────────────────────────────────────────────────── */}
      {showANCVisitModal && selectedBookingId && selectedAttendanceId && (
        <ANCVisitModal isOpen={showANCVisitModal} onClose={() => setShowANCVisitModal(false)}
          onSuccess={() => { setShowANCVisitModal(false); if (currentRecord?.id) getANCVisitsByAntenatalRecord(currentRecord.id); loadData(); }}
          attendanceId={selectedAttendanceId} bookingId={selectedBookingId}
          visitNumber={currentVisits.length + 1} existingVisit={editingVisit} />
      )}

      {showDeliveryModal && selectedAttendanceId && (
        <DeliveryModal isOpen={showDeliveryModal} onClose={() => setShowDeliveryModal(false)}
          onSuccess={() => { setShowDeliveryModal(false); getDeliveryRecords({ patientId: selectedPatientId }); loadData(); }}
          attendanceId={selectedAttendanceId} patientId={selectedPatientId} existingDelivery={editingDelivery} />
      )}

      {showPostnatalModal && selectedAttendanceId && (
        <PostnatalModal isOpen={showPostnatalModal} onClose={() => setShowPostnatalModal(false)}
          onSuccess={() => { setShowPostnatalModal(false); getPostnatalRecords({ patientId: selectedPatientId }); loadData(); }}
          attendanceId={selectedAttendanceId} patientId={selectedPatientId} existingPostnatal={editingPostnatal} />
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
              <button onClick={() => { setShowVisitDetails(false); setEditingVisit(selectedVisit); setSelectedBookingId(currentRecord?.id || ''); setShowANCVisitModal(true); }}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all">Edit Visit</button>
            </div>
          }>
          <div className="grid grid-cols-2 gap-4">
            {[
              { l: 'Gestational Age', v: `${selectedVisit.gestationalAgeWeeks || '—'} weeks` },
              { l: 'Weight', v: selectedVisit.weight ? `${selectedVisit.weight}kg` : '—' },
              { l: 'Blood Pressure', v: selectedVisit.bloodPressure || '—' },
              { l: 'Fundal Height', v: selectedVisit.fundalHeight ? `${selectedVisit.fundalHeight}cm` : '—' },
              { l: 'Fetal Heart Rate', v: selectedVisit.fetalHeartRate ? `${selectedVisit.fetalHeartRate}bpm` : '—' },
              { l: 'Presentation', v: selectedVisit.presentation || '—' },
              { l: 'IPTp Given', v: selectedVisit.iptpGiven ? `Yes (Dose ${selectedVisit.iptpDoseNumber})` : 'No' },
              { l: 'TT Given', v: selectedVisit.ttGiven ? `Yes (Dose ${selectedVisit.ttDoseNumber})` : 'No' },
              { l: 'ITN Given', v: selectedVisit.itnGiven ? 'Yes' : 'No' },
              { l: 'Iron/Folate', v: selectedVisit.ironGiven || selectedVisit.folateGiven ? 'Yes' : 'No' },
              { l: 'Malaria Test', v: selectedVisit.malariaTestDone ? `Done (${selectedVisit.malariaTestResult || '—'})` : 'Not done' },
              { l: 'Malaria Treated', v: selectedVisit.malariaTreatmentGiven ? 'Yes' : 'No' },
              { l: 'Danger Signs', v: selectedVisit.dangerSignsPresent ? <span className="text-[var(--icon-red-text)] font-bold">Yes</span> : 'No' },
              { l: 'Referral Made', v: selectedVisit.referralMade ? 'Yes' : 'No' },
            ].map(r => <DetailRow key={r.l} label={r.l} value={r.v} />)}
          </div>
          {selectedVisit.dangerSignsPresent && selectedVisit.dangerSignsList?.length > 0 && (
            <div className="mt-4 px-3 py-2.5 rounded-lg border border-[var(--icon-red-text)] bg-[var(--icon-red-bg)]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--icon-red-text)] mb-1">⚠ Danger Signs Recorded</p>
              <p className="text-xs text-[var(--icon-red-text)]">{selectedVisit.dangerSignsList.join(', ')}</p>
            </div>
          )}
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
                { l: 'Delivery Type', v: selectedDelivery.deliveryType?.replace(/_/g, ' ') },
                { l: 'Outcome', v: selectedDelivery.deliveryOutcome?.replace(/_/g, ' ') },
                { l: 'Birth Weight', v: selectedDelivery.birthWeight ? `${selectedDelivery.birthWeight}g` : null },
                { l: 'Gestation Weeks', v: selectedDelivery.gestationWeeks ? `${selectedDelivery.gestationWeeks}wks` : null },
                { l: 'No. of Babies', v: selectedDelivery.numberOfBabies || 1 },
                { l: 'Blood Loss (ml)', v: selectedDelivery.bloodLoss },
                { l: 'APGAR Score', v: selectedDelivery.apgarScore },
                { l: 'Attendant', v: selectedDelivery.attendant },
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
                        <div><span className="text-[var(--text-tertiary)]">APGAR 1min:</span> <span className="font-medium text-[var(--text-primary)]">{baby.apgarScore1min || '—'}</span></div>
                        <div><span className="text-[var(--text-tertiary)]">APGAR 5min:</span> <span className="font-medium text-[var(--text-primary)]">{baby.apgarScore5min || '—'}</span></div>
                        <div><span className="text-[var(--text-tertiary)]">Resuscitation:</span> <span className={`font-medium ${baby.resuscitation ? 'text-[var(--icon-red-text)]' : 'text-[var(--icon-green-text)]'}`}>{baby.resuscitation ? 'Yes' : 'No'}</span></div>
                        <div><span className="text-[var(--text-tertiary)]">Outcome:</span> <span className="font-medium text-[var(--text-primary)]">{baby.outcome?.replace(/_/g, ' ')}</span></div>
                        <div><span className="text-[var(--text-tertiary)]">BF 30min:</span> <span className={`font-medium ${baby.breastfeedingWithin30Min ? 'text-[var(--icon-green-text)]' : 'text-[var(--text-secondary)]'}`}>{baby.breastfeedingWithin30Min ? 'Yes' : 'No'}</span></div>
                        <div><span className="text-[var(--text-tertiary)]">Eye Prophylaxis:</span> <span className={`font-medium ${baby.eyeProphylaxisGiven ? 'text-[var(--icon-green-text)]' : 'text-[var(--text-secondary)]'}`}>{baby.eyeProphylaxisGiven ? 'Yes' : 'No'}</span></div>
                        <div><span className="text-[var(--text-tertiary)]">Cord Care:</span> <span className="font-medium text-[var(--text-primary)]">{baby.cordCareMethod?.replace(/_/g, ' ') || '—'}</span></div>
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
                { l: 'Day Number', v: selectedPostnatal.dayNumber },
                { l: 'Maternal Status', v: selectedPostnatal.maternalCondition },
                { l: 'Breastfeeding', v: selectedPostnatal.breastfeedingStatus },
                { l: 'Lochia', v: selectedPostnatal.lochia },
                { l: 'Uterus Involution', v: selectedPostnatal.uterusInvolution },
                { l: 'Blood Pressure', v: selectedPostnatal.bloodPressure },
                { l: 'Temperature', v: selectedPostnatal.temperature ? `${selectedPostnatal.temperature}°C` : null },
                { l: 'Pulse', v: selectedPostnatal.pulse },
                { l: 'Baby Condition', v: selectedPostnatal.babyCondition },
                { l: 'Baby Weight', v: selectedPostnatal.babyWeight ? `${selectedPostnatal.babyWeight}kg` : '—' },
                { l: 'Baby Temperature', v: selectedPostnatal.babyTemperature ? `${selectedPostnatal.babyTemperature}°C` : '—' },
                { l: 'Cord Condition', v: selectedPostnatal.cordCondition },
                { l: 'Jaundice', v: selectedPostnatal.jaundice ? `Yes (${selectedPostnatal.jaundiceSeverity || '—'})` : 'No' },
                { l: 'BCG Given', v: selectedPostnatal.bcgGiven ? 'Yes' : 'No' },
                { l: 'OPV0 Given', v: selectedPostnatal.opv0Given ? 'Yes' : 'No' },
                { l: 'HepB0 Given', v: selectedPostnatal.hepB0Given ? 'Yes' : 'No' },
                { l: 'Family Planning', v: selectedPostnatal.familyPlanningDiscussed ? `Yes (${selectedPostnatal.familyPlanningMethodAccepted || '—'})` : 'No' },
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
            {selectedPostnatal.notes && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">Notes</p>
                <p className="text-xs text-[var(--text-primary)] whitespace-pre-wrap">{selectedPostnatal.notes}</p>
              </div>
            )}
            {selectedPostnatal.nextVisitDate && (
              <div className="mt-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">Next Visit</p>
                <p className="text-xs text-[var(--text-primary)]">
                  {new Date(selectedPostnatal.nextVisitDate).toLocaleDateString()}
                  {selectedPostnatal.nextVisitType && ` (${selectedPostnatal.nextVisitType.replace(/_/g, ' ')})`}
                </p>
              </div>
            )}
          </div>
        </ModalShell>
      )}
    </div>
  );
}