// src/pages/Antenatal.tsx - COMPLETE WITH TABLE VIEWS
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
  Ruler, Weight, TrendingUp, Eye, Hospital, Users,
} from 'lucide-react';

const getEntityId = (entity: { id?: string; _id?: string } | null): string | undefined =>
  entity?._id || entity?.id;

type ModalType = 'diagnosis' | 'lab' | 'procedure' | 'medication' | 'scan' | 'anc_booking' | 'delivery' | 'postnatal' | null;

// ── Shared badge helpers ─────────────────────────────────────────────────────
const getStatusBadge = (status: string) => {
  const cfg: Record<string, { color: string; bg: string }> = {
    pending:    { bg: 'bg-yellow-100', color: 'text-yellow-800' },
    requested:  { bg: 'bg-yellow-100', color: 'text-yellow-800' },
    scheduled:  { bg: 'bg-blue-100',   color: 'text-blue-800'   },
    prescribed: { bg: 'bg-purple-100', color: 'text-purple-800' },
    completed:  { bg: 'bg-green-100',  color: 'text-green-800'  },
    cancelled:  { bg: 'bg-red-100',    color: 'text-red-800'    },
    dispensed:  { bg: 'bg-green-100',  color: 'text-green-800'  },
  };
  const c = cfg[status?.toLowerCase()] || { bg: 'bg-gray-100', color: 'text-gray-800' };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.color}`}>{status}</span>;
};

const RiskBadge: React.FC<{ risk: string }> = ({ risk }) => {
  const cfg: Record<string, { bg: string; text: string }> = {
    low:    { bg: 'bg-green-100',  text: 'text-green-700'  },
    medium: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
    high:   { bg: 'bg-red-100',    text: 'text-red-700'    },
  };
  const c = cfg[risk?.toLowerCase()] || cfg.low;
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>{risk?.toUpperCase()} RISK</span>;
};

function calculateAge(dob: Date): number {
  if (!dob) return 0;
  const today = new Date(), b = new Date(dob);
  let age = today.getFullYear() - b.getFullYear();
  if (today.getMonth() < b.getMonth() || (today.getMonth() === b.getMonth() && today.getDate() < b.getDate())) age--;
  return age;
}

// ── Panel header (shared pattern) ────────────────────────────────────────────
const PanelHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
}> = ({ icon, title, action }) => (
  <div className="bg-[var(--bg-main)] px-4 py-2.5 border-b border-[var(--border-color)] flex items-center justify-between flex-shrink-0">
    <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2 text-sm">
      {icon}{title}
    </h3>
    {action}
  </div>
);

export default function Antenatal() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const { user } = useAuthStore();

  const { patients, loadPatients } = usePatientStore();
  const {
    attendances, currentAttendance, getAttendance, getAttendances,
    addDiagnosis, addLabTest, addProcedure, addMedication, addScan,
    removeDiagnosis, removeLabTest, removeProcedure, removeMedication, removeScan,
    canAddMedicalEntries, getVitalsByAttendance, calculateBill,
  } = useAttendanceStore();

  const { diagnoses, labTestTemplates, procedureTemplates, scanTemplates,
    getDiagnoses, getLabTestTemplates, getProcedureTemplates, getScanTemplates } = useMedicalServicesStore();
  const { stockItems, getStockItems } = useStockStore();

  const { currentBooking, currentVisits, getBooking, getANCVisitsByBooking,
    createBooking, deleteVisit, isLoading: ancLoading } = useAntenatalStore();

  const {
    deliveries,
    currentDelivery,
    getDeliveries,
    getDelivery,
    createDelivery,
    updateDelivery,
    deleteDelivery,
    getStats: getDeliveryStats,
    isLoading: deliveryLoading,
  } = useDeliveryStore();

  const {
    postnatalRecords,
    currentPostnatal,
    getPostnatalRecords,
    getPostnatalRecord,
    createPostnatalRecord,
    updatePostnatalRecord,
    deletePostnatalRecord,
    getPostnatalExamination,
    recordPostnatalExamination,
    isLoading: postnatalLoading,
  } = usePostnatalStore();

  // ── Local state ──────────────────────────────────────────────────────────
  const [isLoading, setIsLoading]                 = useState(true);
  const [refreshing, setRefreshing]               = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedAttendanceId, setSelectedAttendanceId] = useState('');
  const [latestVitals, setLatestVitals]           = useState<any>(null);
  const [activeTab, setActiveTab]                 = useState<'clinical' | 'anc' | 'delivery' | 'postnatal' | 'vitals'>('clinical');
  const [modalType, setModalType]                 = useState<ModalType>(null);
  const [showNewAttendance, setShowNewAttendance] = useState(false);

  const [showANCVisitModal, setShowANCVisitModal] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [editingVisit, setEditingVisit]           = useState<any>(null);

  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [editingDelivery, setEditingDelivery]     = useState<any>(null);

  const [showPostnatalModal, setShowPostnatalModal] = useState(false);
  const [editingPostnatal, setEditingPostnatal]     = useState<any>(null);

  const [selectedVisit, setSelectedVisit]         = useState<any>(null);
  const [showVisitDetails, setShowVisitDetails]   = useState(false);

  const [selectedDelivery, setSelectedDelivery]       = useState<any>(null);
  const [showDeliveryDetails, setShowDeliveryDetails] = useState(false);
  const [selectedPostnatal, setSelectedPostnatal]     = useState<any>(null);
  const [showPostnatalDetails, setShowPostnatalDetails] = useState(false);

  // ── Derived ──────────────────────────────────────────────────────────────
  const antenatalAttendances = useMemo(() => attendances.filter(a => a.attendanceType === 'antenatal'), [attendances]);
  const deliveryAttendances  = useMemo(() => attendances.filter(a => a.attendanceType === 'delivery'),  [attendances]);
  const postnatalAttendances = useMemo(() => attendances.filter(a => a.attendanceType === 'postnatal'), [attendances]);

  const getCurrentAttendances = () => {
    switch (activeTab) {
      case 'anc':      return antenatalAttendances;
      case 'delivery': return deliveryAttendances;
      case 'postnatal':return postnatalAttendances;
      default:         return attendances;
    }
  };

  const selectedPatient = patients.find(p => getEntityId(p) === selectedPatientId);
  const canAddEntries   = currentAttendance ? canAddMedicalEntries(currentAttendance) : false;
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

  const iptpSummary = useMemo(() => ({
    dose1: currentVisits.filter(v => v.iptpGiven && v.iptpDoseNumber === 1).length,
    dose2: currentVisits.filter(v => v.iptpGiven && v.iptpDoseNumber === 2).length,
    dose3: currentVisits.filter(v => v.iptpGiven && v.iptpDoseNumber === 3).length,
    dose4: currentVisits.filter(v => v.iptpGiven && v.iptpDoseNumber === 4).length,
    dose5: currentVisits.filter(v => v.iptpGiven && v.iptpDoseNumber >= 5).length,
  }), [currentVisits]);

  const ttSummary = useMemo(() => {
    const tt2Plus = currentVisits.filter(v => v.ttGiven && v.ttDoseNumber >= 2).length;
    return {
      dose1: currentVisits.filter(v => v.ttGiven && v.ttDoseNumber === 1).length,
      dose2: currentVisits.filter(v => v.ttGiven && v.ttDoseNumber === 2).length,
      dose3: currentVisits.filter(v => v.ttGiven && v.ttDoseNumber === 3).length,
      tt2Plus,
    };
  }, [currentVisits]);

  const getEDDDisplay = () => {
    if (!currentBooking?.estimatedDeliveryDate) return 'N/A';
    const edd = new Date(currentBooking.estimatedDeliveryDate);
    const daysLeft = Math.ceil((edd.getTime() - Date.now()) / 864e5);
    return `${edd.toLocaleDateString()} (${daysLeft} days left)`;
  };

  // ── Data loading ──────────────────────────────────────────────────────────
  const loadData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadPatients(), getAttendances(), getStockItems(), getDiagnoses(),
        getLabTestTemplates(), getProcedureTemplates(), getScanTemplates(),
        getDeliveries(), getPostnatalRecords(),
      ]);
      success('Data loaded', 'Maternal health ready');
    } catch (err: any) {
      toastError('Load failed', err.message);
    } finally {
      setRefreshing(false);
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (!selectedAttendanceId) return;
    getVitalsByAttendance(selectedAttendanceId)
      .then(v => setLatestVitals(v?.length ? v[v.length - 1] : null))
      .catch(() => setLatestVitals(null));
    getAttendance(selectedAttendanceId);
  }, [selectedAttendanceId]);

  useEffect(() => {
    if (!selectedPatientId) return;
    getBooking(selectedPatientId).catch(() => {});
    getDeliveries({ patientId: selectedPatientId }).catch(() => {});
    getPostnatalRecords({ patientId: selectedPatientId }).catch(() => {});
  }, [selectedPatientId]);

  useEffect(() => {
    if (currentBooking?.id) getANCVisitsByBooking(currentBooking.id);
  }, [currentBooking]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleClearSelection = () => { setSelectedPatientId(''); setSelectedAttendanceId(''); };

  const handleDeleteItem = async (type: string, id: string) => {
    if (!selectedAttendanceId) return;
    try {
      switch (type) {
        case 'diagnosis': await removeDiagnosis(selectedAttendanceId, id); break;
        case 'lab':       await removeLabTest(selectedAttendanceId, id);   break;
        case 'procedure': await removeProcedure(selectedAttendanceId, id); break;
        case 'medication':await removeMedication(selectedAttendanceId, id);break;
        case 'scan':      await removeScan(selectedAttendanceId, id);      break;
      }
      success('Deleted', 'Item removed');
      await getAttendance(selectedAttendanceId);
      await calculateBill(selectedAttendanceId);
    } catch (err: any) { toastError('Delete failed', err.message); }
  };

  const handleRecordVisit = () => {
    if (!currentBooking?.id)    { toastError('Error', 'Please create a pregnancy record first'); return; }
    if (!selectedAttendanceId)  { toastError('Error', 'Please select an attendance first');       return; }
    setSelectedBookingId(currentBooking.id);
    setEditingVisit(null);
    setShowANCVisitModal(true);
  };

  const handleDeleteVisit = async (id: string) => {
    if (!window.confirm('Delete this ANC visit?')) return;
    try {
      await deleteVisit(id);
      if (currentBooking?.id) getANCVisitsByBooking(currentBooking.id);
      success('Deleted', 'ANC visit removed');
    } catch (err: any) { toastError('Delete failed', err.message); }
  };

  const handleDeleteDelivery = async (id: string) => {
    if (!window.confirm('Delete this delivery record?')) return;
    try {
      await deleteDelivery(id);
      await getDeliveries({ patientId: selectedPatientId });
      success('Deleted', 'Delivery record removed');
    } catch (err: any) { toastError('Delete failed', err.message); }
  };

  const handleDeletePostnatal = async (id: string) => {
    if (!window.confirm('Delete this postnatal record?')) return;
    try {
      await deletePostnatalRecord(id);
      await getPostnatalRecords({ patientId: selectedPatientId });
      success('Deleted', 'Postnatal record removed');
    } catch (err: any) { toastError('Delete failed', err.message); }
  };

  const handleCreateBooking = async (data: any) => {
    if (!selectedPatientId || !selectedAttendanceId) {
      toastError('Error', 'Please select patient and attendance first'); return;
    }
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
      if (selectedPatientId) {
        const attendance = await getAttendance(newId);
        if (attendance?.attendanceType === 'antenatal') {
          await getBooking(selectedPatientId);
          const booking = await getBooking(selectedPatientId).catch(() => null);
          if (booking?.isActive && !booking?.isCompleted) {
            handleRecordVisit();
          } else {
            setModalType('anc_booking');
          }
        } else if (attendance?.attendanceType === 'delivery') {
          setEditingDelivery(null);
          setShowDeliveryModal(true);
        } else if (attendance?.attendanceType === 'postnatal') {
          setEditingPostnatal(null);
          setShowPostnatalModal(true);
        }
      }
    }, 500);
  };

  const handleViewDelivery = (delivery: any) => {
    setSelectedDelivery(delivery);
    setShowDeliveryDetails(true);
  };

  const handleViewPostnatal = (postnatal: any) => {
    setSelectedPostnatal(postnatal);
    setShowPostnatalDetails(true);
  };

  // ── Loading screen ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
        <div className="text-center bg-[var(--bg-card)] p-8 rounded-xl shadow-sm border border-[var(--border-color)]">
          <div className="w-14 h-14 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Loading Maternal Health...</h2>
        </div>
      </div>
    );
  }

  // ── Tab accent colours ────────────────────────────────────────────────────
  const tabAccent = {
    clinical:  { active: 'border-pink-500 text-pink-600',  hover: 'hover:text-pink-500'  },
    anc:       { active: 'border-pink-500 text-pink-600',  hover: 'hover:text-pink-500'  },
    delivery:  { active: 'border-green-500 text-green-600',hover: 'hover:text-green-500' },
    postnatal: { active: 'border-blue-500 text-blue-600',  hover: 'hover:text-blue-500'  },
    vitals:    { active: 'border-pink-500 text-pink-600',  hover: 'hover:text-pink-500'  },
  };

  return (
    <div className="space-y-4 p-6">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-[var(--bg-card)] rounded-lg transition-all border border-[var(--border-color)]"
          >
            <ChevronLeft className="w-5 h-5 text-[var(--text-primary)]" />
          </button>
          <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center">
            <Baby className="w-5 h-5 text-pink-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Maternal Health</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">Antenatal, Delivery &amp; Postnatal Care</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewAttendance(true)}
            className="flex items-center gap-2 px-3 py-2 bg-pink-100 text-pink-700 rounded-lg hover:bg-pink-700 hover:text-white transition-all text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            New Visit
          </button>
          <button
            onClick={loadData}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all disabled:opacity-50 text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── PATIENT SELECTOR ── */}
      <PatientAttendanceSelector
        patients={patients}
        attendances={getCurrentAttendances()}
        selectedPatientId={selectedPatientId}
        selectedAttendanceId={selectedAttendanceId}
        onPatientSelect={setSelectedPatientId}
        onAttendanceSelect={setSelectedAttendanceId}
        onClearSelection={handleClearSelection}
        placeholder={
          activeTab === 'anc' ? 'Select antenatal visit...'
          : activeTab === 'delivery' ? 'Select delivery visit...'
          : activeTab === 'postnatal' ? 'Select postnatal visit...'
          : 'Select visit...'
        }
      />

      {/* ── PATIENT HEADER CARD ── */}
      {selectedPatient && currentAttendance && (
        <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                activeTab === 'delivery' ? 'bg-green-100' : activeTab === 'postnatal' ? 'bg-blue-100' : 'bg-pink-100'
              }`}>
                {activeTab === 'delivery'  ? <Hospital className="w-6 h-6 text-green-600" />
                : activeTab === 'postnatal' ? <Heart className="w-6 h-6 text-blue-600" />
                : <Baby className="w-6 h-6 text-pink-600" />}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">
                    {selectedPatient.surname} {selectedPatient.otherNames}
                  </h3>
                  <span className="text-xs text-[var(--text-secondary)]">{calculateAge(selectedPatient.dateOfBirth)}y • {selectedPatient.gender}</span>
                  {activeTab === 'anc' && hasActiveBooking && <RiskBadge risk={currentBooking?.riskLevel || 'low'} />}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)] mt-1">
                  <span>ID: {selectedPatient.folderNumber}</span>
                  <span>•</span>
                  <span>{selectedPatient.contact}</span>
                  {activeTab === 'anc' && currentBooking?.estimatedDeliveryDate && (
                    <span className="text-pink-600 font-medium">EDD: {getEDDDisplay()}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono bg-[var(--bg-main)] px-2.5 py-1 rounded-full border border-[var(--border-color)] text-[var(--text-secondary)]">
                #{currentAttendance.attendanceNumber || 'New Visit'}
              </span>
              <span className="text-xs bg-[var(--bg-main)] px-2.5 py-1 rounded-full border border-[var(--border-color)] text-[var(--text-secondary)]">
                {new Date(currentAttendance.dateTime || currentAttendance.createdAt || '').toLocaleDateString()}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                currentAttendance.paymentMode === 'nhis' ? 'bg-green-100 text-green-800 border border-green-200'
                : currentAttendance.paymentMode === 'private_insurance' ? 'bg-purple-100 text-purple-800 border border-purple-200'
                : 'bg-blue-100 text-blue-800 border border-blue-200'
              }`}>
                {currentAttendance.paymentMode === 'nhis' ? 'NHIS'
                 : currentAttendance.paymentMode === 'private_insurance' ? 'PRIVATE INS' : 'CASH'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── VITALS DISPLAY ── */}
      {currentAttendance && latestVitals && <VitalsDisplay vitals={latestVitals} />}

      {/* ── ANC BOOKING BANNER ── */}
      {activeTab === 'anc' && selectedPatient && !hasActiveBooking && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <span className="text-sm text-yellow-700">No active pregnancy record. Create one to track ANC data.</span>
          </div>
          <button
            onClick={() => setModalType('anc_booking')}
            className="flex items-center gap-2 px-3 py-1.5 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm"
          >
            <Plus className="w-4 h-4" />
            Create Pregnancy Record
          </button>
        </div>
      )}

      {/* ── MAIN CONTENT (only when attendance selected) ── */}
      {selectedAttendanceId && currentAttendance ? (
        <div className="flex gap-4 items-stretch">

          {/* ── LEFT: TABS + CONTENT ── */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* Tab Bar */}
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
              <div className="border-b border-[var(--border-color)] px-4 overflow-x-auto">
                <div className="flex gap-1">
                  {([
                    { key: 'clinical',  label: 'Clinical',   icon: <Stethoscope className="w-3.5 h-3.5" />, count: diagnosesList.length + labTestsList.length + medicationsList.length },
                    { key: 'anc',       label: 'ANC Visits', icon: <Baby className="w-3.5 h-3.5" />,        count: currentVisits.length },
                    { key: 'delivery',  label: 'Delivery',   icon: <Hospital className="w-3.5 h-3.5" />,    count: deliveries.filter((d: any) => d.attendanceId === selectedAttendanceId).length },
                    { key: 'postnatal', label: 'Postnatal',  icon: <Heart className="w-3.5 h-3.5" />,       count: postnatalRecords.filter((p: any) => p.attendanceId === selectedAttendanceId).length },
                    { key: 'vitals',    label: 'Vitals',     icon: <Activity className="w-3.5 h-3.5" />,    count: null },
                  ] as const).map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex items-center gap-1.5 py-3 px-3 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
                        activeTab === tab.key
                          ? tabAccent[tab.key].active
                          : `border-transparent text-[var(--text-secondary)] ${tabAccent[tab.key].hover}`
                      }`}
                    >
                      {tab.icon}
                      {tab.label}
                      {tab.count !== null && (
                        <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                          activeTab === tab.key ? 'bg-current/10' : 'bg-[var(--bg-main)]'
                        }`}>
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── CLINICAL TAB (TABLE VIEWS) ── */}
              {activeTab === 'clinical' && (
                <div className="p-4 space-y-4">

                  {/* Action Bar - Add buttons */}
                  {canAddEntries && (
                    <div className="flex flex-wrap gap-2 pb-3 border-b border-[var(--border-color)]">
                      {[
                        { key: 'diagnosis', label: 'Add Diagnosis', icon: <Stethoscope className="w-3.5 h-3.5" />, cls: 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-text)] hover:text-white' },
                        { key: 'lab', label: 'Add Lab Test', icon: <FlaskConical className="w-3.5 h-3.5" />, cls: 'bg-purple-100 text-purple-700 hover:bg-purple-700 hover:text-white' },
                        { key: 'procedure', label: 'Add Procedure', icon: <Scissors className="w-3.5 h-3.5" />, cls: 'bg-orange-100 text-orange-700 hover:bg-orange-700 hover:text-white' },
                        { key: 'medication', label: 'Prescribe', icon: <Pill className="w-3.5 h-3.5" />, cls: 'bg-green-100 text-green-700 hover:bg-green-700 hover:text-white' },
                        { key: 'scan', label: 'Order Scan', icon: <Scan className="w-3.5 h-3.5" />, cls: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-700 hover:text-white' },
                      ].map(btn => (
                        <button
                          key={btn.key}
                          onClick={() => setModalType(btn.key as ModalType)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${btn.cls}`}
                        >
                          {btn.icon}{btn.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* ROW 1: DIAGNOSIS - TABLE VIEW */}
                  <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                    <PanelHeader
                      icon={<Stethoscope className="w-4 h-4 text-[var(--icon-cyan-text)]" />}
                      title={`Diagnosis (ICD-10)`}
                      action={canAddEntries && (
                        <button onClick={() => setModalType('diagnosis')} className="flex items-center gap-1 px-2 py-1 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded text-xs hover:bg-[var(--icon-cyan-text)] hover:text-white transition-colors">
                          <Plus className="w-3 h-3" /> Add
                        </button>
                      )}
                    />
                    {diagnosesList.length === 0 ? (
                      <div className="p-8 text-center">
                        <Stethoscope className="w-8 h-8 text-[var(--text-secondary)] opacity-30 mx-auto mb-2" />
                        <p className="text-sm text-[var(--text-secondary)]">No diagnoses added</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto max-h-[260px] overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead className="sticky top-0 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)] w-[40%]">Diagnosis</th>
                              <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">ICD-10</th>
                              <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Type</th>
                              <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Added By</th>
                              <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Date</th>
                              <th className="px-3 py-2 text-center font-semibold text-[var(--text-secondary)]">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border-color)]">
                            {diagnosesList.map((item: any) => (
                              <tr key={item.id} className="hover:bg-[var(--bg-main)] transition-colors">
                                <td className="px-3 py-2 font-medium text-[var(--text-primary)]">
                                  {item.Diagnosis?.name}
                                  {item.notes && <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">{item.notes}</div>}
                                </td>
                                <td className="px-3 py-2 font-mono text-[var(--text-secondary)]">{item.Diagnosis?.icdCode || '—'}</td>
                                <td className="px-3 py-2">
                                  {item.primary ? (
                                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-medium">Primary</span>
                                  ) : <span className="text-[var(--text-secondary)] text-[10px]">Secondary</span>}
                                </td>
                                <td className="px-3 py-2 text-[var(--text-secondary)]">{item.createdBy?.fullName || 'Unknown'}</td>
                                <td className="px-3 py-2 text-[var(--text-secondary)] whitespace-nowrap">
                                  {new Date(item.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  {canAddEntries && (
                                    <button onClick={() => handleDeleteItem('diagnosis', item.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* ROW 2: INVESTIGATIONS REQUESTED - TABLE VIEW */}
                  <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                    <PanelHeader
                      icon={<FlaskConical className="w-4 h-4 text-purple-600" />}
                      title={`Investigations Requested`}
                      action={canAddEntries && (
                        <button onClick={() => setModalType('lab')} className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs hover:bg-purple-700 hover:text-white transition-colors">
                          <Plus className="w-3 h-3" /> Request Test
                        </button>
                      )}
                    />
                    {labTestsList.length === 0 ? (
                      <div className="p-8 text-center">
                        <FlaskConical className="w-8 h-8 text-[var(--text-secondary)] opacity-30 mx-auto mb-2" />
                        <p className="text-sm text-[var(--text-secondary)]">No lab tests requested</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto max-h-[260px] overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead className="sticky top-0 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)] w-[35%]">Test Name</th>
                              <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Priority</th>
                              <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Status</th>
                              <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Requested By</th>
                              <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Date</th>
                              <th className="px-3 py-2 text-center font-semibold text-[var(--text-secondary)]">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border-color)]">
                            {labTestsList.map((test: any) => {
                              const priorityColor = test.priority === 'stat' ? 'bg-red-100 text-red-700' :
                                test.priority === 'urgent' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700';
                              return (
                                <tr key={test.id} className="hover:bg-[var(--bg-main)] transition-colors">
                                  <td className="px-3 py-2 font-medium text-[var(--text-primary)]">
                                    {test.ServiceCatalog?.name || test.name}
                                    {test.notes && <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">{test.notes}</div>}
                                  </td>
                                  <td className="px-3 py-2">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${priorityColor}`}>
                                      {test.priority || 'routine'}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2">{getStatusBadge(test.status)}</td>
                                  <td className="px-3 py-2 text-[var(--text-secondary)]">{test.requestedBy || '—'}</td>
                                  <td className="px-3 py-2 text-[var(--text-secondary)] whitespace-nowrap">
                                    {test.requestedAt ? new Date(test.requestedAt).toLocaleDateString() : '—'}
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    {canAddEntries && test.status === 'requested' && (
                                      <button onClick={() => handleDeleteItem('lab', test.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                   </td>
                                 </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* RESULTS OF INVESTIGATIONS - RICH TABLE */}
                  <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                    <div className="bg-[var(--bg-main)] px-4 py-2.5 border-b border-[var(--border-color)] flex items-center justify-between">
                      <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        Results of Investigations
                        {labTestsList.filter((t: any) => t.status === 'completed').length > 0 && (
                          <span className="ml-1 px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-bold">
                            {labTestsList.filter((t: any) => t.status === 'completed').length}
                          </span>
                        )}
                      </h3>
                    </div>
                    {labTestsList.filter((t: any) => t.status === 'completed').length === 0 ? (
                      <div className="p-6 text-center">
                        <FlaskConical className="w-8 h-8 text-[var(--text-secondary)] opacity-30 mx-auto mb-2" />
                        <p className="text-sm text-[var(--text-secondary)]">No results available yet</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead className="sticky top-0 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)] w-[30%]">Test</th>
                              <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Result</th>
                              <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Normal Range</th>
                              <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Flag</th>
                              <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border-color)]">
                            {labTestsList.filter((t: any) => t.status === 'completed').map((test: any) => {
                              const rawResult = typeof test.result === 'object' ? (test.result.value ?? JSON.stringify(test.result)) : (test.result ?? '—');
                              const isAbnormal = test.result?.abnormal || test.abnormal;
                              return (
                                <tr key={test.id} className={`hover:bg-[var(--bg-main)] transition-colors ${isAbnormal ? 'bg-red-50/30' : ''}`}>
                                  <td className="px-3 py-2 font-semibold text-[var(--text-primary)]">{test.ServiceCatalog?.name || test.name}</td>
                                  <td className={`px-3 py-2 font-bold ${isAbnormal ? 'text-red-600' : 'text-[var(--text-primary)]'}`}>{rawResult}</td>
                                  <td className="px-3 py-2 text-[var(--text-secondary)]">{test.normalRange || '—'}</td>
                                  <td className="px-3 py-2">
                                    {isAbnormal ? <span className="px-1.5 py-0.5 rounded text-[10px] font-bold text-red-600 bg-red-50">ABN</span> :
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold text-green-700 bg-green-50">NL</span>}
                                  </td>
                                  <td className="px-3 py-2 text-[var(--text-secondary)] whitespace-nowrap">
                                    {test.completedAt ? new Date(test.completedAt).toLocaleDateString() : '—'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* ROW 4: PROCEDURES - TABLE VIEW */}
                  <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                    <PanelHeader
                      icon={<Scissors className="w-4 h-4 text-orange-600" />}
                      title={`Procedures & Scheduling`}
                      action={canAddEntries && (
                        <button onClick={() => setModalType('procedure')} className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs hover:bg-orange-700 hover:text-white transition-colors">
                          <Plus className="w-3 h-3" /> Schedule
                        </button>
                      )}
                    />
                    {proceduresList.length === 0 ? (
                      <div className="p-8 text-center">
                        <Scissors className="w-8 h-8 text-[var(--text-secondary)] opacity-30 mx-auto mb-2" />
                        <p className="text-sm text-[var(--text-secondary)]">No procedures scheduled</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto max-h-[260px] overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead className="sticky top-0 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)] w-[30%]">Procedure</th>
                              <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Scheduled Date</th>
                              <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Status</th>
                              <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Scheduled By</th>
                              <th className="px-3 py-2 text-center font-semibold text-[var(--text-secondary)]">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border-color)]">
                            {proceduresList.map((proc: any) => (
                              <tr key={proc.id} className="hover:bg-[var(--bg-main)] transition-colors">
                                <td className="px-3 py-2 font-medium text-[var(--text-primary)]">{proc.ServiceCatalog?.name || proc.name}</td>
                                <td className="px-3 py-2 text-[var(--text-secondary)] whitespace-nowrap">
                                  {proc.scheduledDate ? new Date(proc.scheduledDate).toLocaleString() : '—'}
                                </td>
                                <td className="px-3 py-2">{getStatusBadge(proc.status)}</td>
                                <td className="px-3 py-2 text-[var(--text-secondary)]">{proc.requestedBy || '—'}</td>
                                <td className="px-3 py-2 text-center">
                                  {canAddEntries && proc.status === 'scheduled' && (
                                    <button onClick={() => handleDeleteItem('procedure', proc.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* ROW 5: MEDICATIONS - TWO TABLES (Prescribed & Dispensed) */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Prescribed Medications */}
                    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                      <PanelHeader
                        icon={<Pill className="w-4 h-4 text-green-600" />}
                        title={`Prescribed Medications`}
                        action={canAddEntries && (
                          <button onClick={() => setModalType('medication')} className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-700 hover:text-white transition-colors">
                            <Plus className="w-3 h-3" /> Prescribe
                          </button>
                        )}
                      />
                      {prescribedMeds.length === 0 ? (
                        <div className="p-8 text-center">
                          <Pill className="w-8 h-8 text-[var(--text-secondary)] opacity-30 mx-auto mb-2" />
                          <p className="text-sm text-[var(--text-secondary)]">No medications prescribed</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
                          <table className="w-full text-xs">
                            <thead className="sticky top-0 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                              <tr>
                                <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Medication</th>
                                <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Dosage</th>
                                <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Frequency</th>
                                <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Status</th>
                                <th className="px-3 py-2 text-center font-semibold text-[var(--text-secondary)]">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-color)]">
                              {prescribedMeds.map((med: any) => (
                                <tr key={med.id} className="hover:bg-[var(--bg-main)] transition-colors">
                                  <td className="px-3 py-2 font-medium text-[var(--text-primary)]">{med.name}</td>
                                  <td className="px-3 py-2 text-[var(--text-secondary)]">{med.dosage || '—'}</td>
                                  <td className="px-3 py-2 text-[var(--text-secondary)]">{med.frequency || '—'}</td>
                                  <td className="px-3 py-2">{getStatusBadge(med.status)}</td>
                                  <td className="px-3 py-2 text-center">
                                    {canAddEntries && (
                                      <button onClick={() => handleDeleteItem('medication', med.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Dispensed Medications */}
                    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                      <PanelHeader
                        icon={<CheckCircle className="w-4 h-4 text-blue-600" />}
                        title={`Dispensed Medications`}
                      />
                      {dispensedMeds.length === 0 ? (
                        <div className="p-8 text-center">
                          <CheckCircle className="w-8 h-8 text-[var(--text-secondary)] opacity-30 mx-auto mb-2" />
                          <p className="text-sm text-[var(--text-secondary)]">No medications dispensed yet</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
                          <table className="w-full text-xs">
                            <thead className="sticky top-0 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                              <tr>
                                <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Medication</th>
                                <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Quantity</th>
                                <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Total</th>
                                <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Dispensed Date</th>
                                <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-color)]">
                              {dispensedMeds.map((med: any) => (
                                <tr key={med.id} className="hover:bg-[var(--bg-main)] transition-colors">
                                  <td className="px-3 py-2 font-medium text-[var(--text-primary)]">{med.name}</td>
                                  <td className="px-3 py-2 text-[var(--text-secondary)]">{med.quantity}</td>
                                  <td className="px-3 py-2 text-[var(--text-secondary)]">GHS {((med.unitCost || 0) * med.quantity).toFixed(2)}</td>
                                  <td className="px-3 py-2 text-[var(--text-secondary)] whitespace-nowrap">
                                    {med.dispensedAt ? new Date(med.dispensedAt).toLocaleDateString() : '—'}
                                  </td>
                                  <td className="px-3 py-2">{getStatusBadge(med.status)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ROW 6: SCANS - TWO TABLES (Requested & Results) */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Requested Scans */}
                    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                      <PanelHeader
                        icon={<Scan className="w-4 h-4 text-indigo-600" />}
                        title={`Scans Requested`}
                        action={canAddEntries && (
                          <button onClick={() => setModalType('scan')} className="flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs hover:bg-indigo-700 hover:text-white transition-colors">
                            <Plus className="w-3 h-3" /> Request Scan
                          </button>
                        )}
                      />
                      {requestedScans.length === 0 ? (
                        <div className="p-8 text-center">
                          <Scan className="w-8 h-8 text-[var(--text-secondary)] opacity-30 mx-auto mb-2" />
                          <p className="text-sm text-[var(--text-secondary)]">No scans requested</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
                          <table className="w-full text-xs">
                            <thead className="sticky top-0 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                              <tr>
                                <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Scan Type</th>
                                <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Body Part</th>
                                <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Status</th>
                                <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Requested On</th>
                                <th className="px-3 py-2 text-center font-semibold text-[var(--text-secondary)]">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-color)]">
                              {requestedScans.map((scan: any) => (
                                <tr key={scan.id} className="hover:bg-[var(--bg-main)] transition-colors">
                                  <td className="px-3 py-2 font-medium text-[var(--text-primary)]">{scan.scanType || scan.ServiceCatalog?.name}</td>
                                  <td className="px-3 py-2 text-[var(--text-secondary)]">{scan.bodyPart || '—'}</td>
                                  <td className="px-3 py-2">{getStatusBadge(scan.status)}</td>
                                  <td className="px-3 py-2 text-[var(--text-secondary)] whitespace-nowrap">
                                    {new Date(scan.requestedAt).toLocaleDateString()}
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    {canAddEntries && (scan.status === 'requested' || scan.status === 'scheduled') && (
                                      <button onClick={() => handleDeleteItem('scan', scan.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Scan Results */}
                    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                      <PanelHeader
                        icon={<CheckCircle className="w-4 h-4 text-green-600" />}
                        title={`Scan Results`}
                      />
                      {completedScans.length === 0 ? (
                        <div className="p-8 text-center">
                          <CheckCircle className="w-8 h-8 text-[var(--text-secondary)] opacity-30 mx-auto mb-2" />
                          <p className="text-sm text-[var(--text-secondary)]">No scan results available</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
                          <table className="w-full text-xs">
                            <thead className="sticky top-0 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                              <tr>
                                <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Scan Type</th>
                                <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Findings</th>
                                <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Completed</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-color)]">
                              {completedScans.map((scan: any) => (
                                <tr key={scan.id} className="hover:bg-[var(--bg-main)] transition-colors">
                                  <td className="px-3 py-2 font-medium text-[var(--text-primary)]">
                                    {scan.scanType || scan.ServiceCatalog?.name}
                                    {scan.bodyPart && <div className="text-[10px] text-[var(--text-secondary)]">{scan.bodyPart}</div>}
                                  </td>
                                  <td className="px-3 py-2 text-[var(--text-secondary)] max-w-[200px] truncate">{scan.findings || '—'}</td>
                                  <td className="px-3 py-2 text-[var(--text-secondary)] whitespace-nowrap">
                                    {scan.completedAt ? new Date(scan.completedAt).toLocaleDateString() : '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── ANC TAB ── (keeping existing) */}
              {activeTab === 'anc' && (
                <div className="p-4 space-y-4">
                  {/* Pregnancy summary stats */}
                  {hasActiveBooking && (
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                      {[
                        { icon: <Baby className="w-4 h-4 text-pink-500" />, label: 'G/P', value: `${currentBooking?.gravida||0}/${currentBooking?.para||0}` },
                        { icon: <Calendar className="w-4 h-4 text-purple-500" />, label: 'Weeks', value: currentBooking?.gestationalAgeWeeks || '?' },
                        { icon: <Heart className="w-4 h-4 text-red-500" />, label: 'FHR (bpm)', value: latestVitals?.fetalHeartRate || '—' },
                        { icon: <Ruler className="w-4 h-4 text-blue-500" />, label: 'Fundal Ht', value: latestVitals?.fundalHeight ? `${latestVitals.fundalHeight}cm` : '—' },
                        { icon: <TrendingUp className="w-4 h-4 text-green-500" />, label: 'Visits', value: currentVisits.length },
                        { icon: <Shield className="w-4 h-4 text-cyan-500" />, label: 'TT2+', value: ttSummary.tt2Plus },
                      ].map((s, i) => (
                        <div key={i} className="bg-[var(--bg-main)] rounded-xl p-3 border border-[var(--border-color)] text-center">
                          <div className="flex justify-center mb-1">{s.icon}</div>
                          <p className="text-base font-bold text-[var(--text-primary)]">{s.value}</p>
                          <p className="text-xs text-[var(--text-secondary)]">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* IPTp strip */}
                  {hasActiveBooking && currentVisits.length > 0 && (
                    <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Syringe className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-semibold text-blue-800">IPTp Coverage</span>
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        {['IPTp-1','IPTp-2','IPTp-3','IPTp-4','IPTp-5+'].map((label, i) => (
                          <div key={i} className="text-center">
                            <span className="text-xs text-blue-600">{label}</span>
                            <p className="font-bold text-blue-800">{Object.values(iptpSummary)[i]}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Visits table - keeping existing */}
                  <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                    <PanelHeader
                      icon={<Baby className="w-4 h-4 text-pink-600" />}
                      title={`ANC Visit History (${currentVisits.length})`}
                      action={hasActiveBooking && selectedAttendanceId && (
                        <button onClick={handleRecordVisit} className="flex items-center gap-1 px-2 py-1 bg-pink-100 text-pink-700 rounded text-xs hover:bg-pink-700 hover:text-white transition-colors">
                          <Plus className="w-3 h-3" /> Record Visit
                        </button>
                      )}
                    />
                    {currentVisits.length === 0 ? (
                      <div className="p-8 text-center">
                        <Baby className="w-10 h-10 text-[var(--text-secondary)] opacity-40 mx-auto mb-3" />
                        <p className="text-sm text-[var(--text-secondary)]">No ANC visits recorded yet</p>
                        {hasActiveBooking && (
                          <button onClick={handleRecordVisit} className="mt-3 px-4 py-2 bg-pink-100 text-pink-700 rounded-lg text-sm hover:bg-pink-700 hover:text-white transition-all">
                            Record First Visit
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)] sticky top-0">
                            <tr>
                              {['#','Date','GA(wks)','Weight','BP','FHR','Fundal','IPTp','TT','ITN','Danger','Actions'].map(h => (
                                <th key={h} className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border-color)]">
                            {currentVisits.map((visit: any) => (
                              <tr key={visit.id} className="hover:bg-[var(--bg-main)] transition-colors">
                                <td className="px-3 py-2 font-medium">{visit.visitNumber}</td>
                                <td className="px-3 py-2">{new Date(visit.visitDate).toLocaleDateString()}</td>
                                <td className="px-3 py-2">{visit.gestationalAgeWeeks || '—'}</td>
                                <td className="px-3 py-2">{visit.weight ? `${visit.weight}kg` : '—'}</td>
                                <td className="px-3 py-2">{visit.bloodPressure || '—'}</td>
                                <td className="px-3 py-2">{visit.fetalHeartRate || '—'}</td>
                                <td className="px-3 py-2">{visit.fundalHeight ? `${visit.fundalHeight}cm` : '—'}</td>
                                <td className="px-3 py-2">{visit.iptpGiven ? `D${visit.iptpDoseNumber}` : '—'}</td>
                                <td className="px-3 py-2">{visit.ttGiven ? `D${visit.ttDoseNumber}` : '—'}</td>
                                <td className="px-3 py-2">{visit.itnGiven ? '✓' : '—'}</td>
                                <td className="px-3 py-2">{visit.dangerSignsPresent ? <span className="text-red-600 font-semibold">Yes</span> : '—'}</td>
                                <td className="px-3 py-2">
                                  <div className="flex gap-1">
                                    <button onClick={() => { setSelectedVisit(visit); setShowVisitDetails(true); }} className="p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-main)] rounded"><Eye className="w-3 h-3" /></button>
                                    <button onClick={() => { setEditingVisit(visit); setSelectedBookingId(currentBooking?.id||''); setShowANCVisitModal(true); }} className="p-1 text-blue-500 hover:bg-blue-50 rounded"><Edit className="w-3 h-3" /></button>
                                    <button onClick={() => handleDeleteVisit(visit.id)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-3 h-3" /></button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Malaria & Danger Signs summary */}
                  {currentVisits.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                        <PanelHeader icon={<AlertTriangle className="w-4 h-4 text-yellow-600" />} title="Malaria in Pregnancy" />
                        <div className="p-4 space-y-2 text-sm">
                          <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Tested:</span><span className="font-medium">{currentVisits.filter((v:any)=>v.malariaTestDone).length}</span></div>
                          <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Positive:</span><span className="font-medium text-red-600">{currentVisits.filter((v:any)=>v.malariaTestResult==='Positive').length}</span></div>
                          <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Treated:</span><span className="font-medium text-green-600">{currentVisits.filter((v:any)=>v.malariaTreatmentGiven).length}</span></div>
                        </div>
                      </div>
                      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                        <PanelHeader icon={<AlertCircle className="w-4 h-4 text-orange-600" />} title="Danger Signs & Referrals" />
                        <div className="p-4 space-y-2 text-sm">
                          <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Danger Signs:</span><span className="font-medium text-orange-600">{currentVisits.filter((v:any)=>v.dangerSignsPresent).length}</span></div>
                          <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Referrals Made:</span><span className="font-medium text-blue-600">{currentVisits.filter((v:any)=>v.referralMade).length}</span></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── DELIVERY TAB ── */}
              {activeTab === 'delivery' && (
                <div className="p-4 space-y-4">
                  {/* Delivery stats */}
                  {deliveries.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { icon: <Baby className="w-4 h-4 text-green-500" />, label: 'Total Deliveries', value: deliveries.length, color: 'text-[var(--text-primary)]' },
                        { icon: <Heart className="w-4 h-4 text-blue-500" />, label: 'Live Births', value: deliveries.filter((d:any)=>d.deliveryOutcome==='live_birth').length, color: 'text-blue-600' },
                        { icon: <AlertTriangle className="w-4 h-4 text-red-500" />, label: 'C-Section', value: deliveries.filter((d:any)=>d.deliveryType==='caesarean_section').length, color: 'text-red-600' },
                        { icon: <Users className="w-4 h-4 text-purple-500" />, label: 'Total Babies', value: deliveries.reduce((s:number,d:any)=>s+(d.numberOfBabies||1),0), color: 'text-purple-600' },
                      ].map((s,i)=>(
                        <div key={i} className="bg-[var(--bg-main)] rounded-xl p-3 border border-[var(--border-color)] text-center">
                          <div className="flex justify-center mb-1">{s.icon}</div>
                          <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                          <p className="text-xs text-[var(--text-secondary)]">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                    <PanelHeader
                      icon={<Hospital className="w-4 h-4 text-green-600" />}
                      title="Delivery Records"
                      action={selectedAttendanceId && (
                        <button onClick={() => { setEditingDelivery(null); setShowDeliveryModal(true); }} className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-700 hover:text-white transition-colors">
                          <Plus className="w-3 h-3" /> Add
                        </button>
                      )}
                    />
                    {deliveries.filter((d: any) => d.attendanceId === selectedAttendanceId).length === 0 ? (
                      <div className="p-8 text-center">
                        <Hospital className="w-10 h-10 text-[var(--text-secondary)] opacity-40 mx-auto mb-3" />
                        <p className="text-sm text-[var(--text-secondary)]">No delivery records for this visit</p>
                        <button onClick={() => { setEditingDelivery(null); setShowDeliveryModal(true); }} className="mt-3 px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-700 hover:text-white transition-all">Add Delivery Record</button>
                      </div>
                    ) : (
                      <div className="divide-y divide-[var(--border-color)]">
                        {deliveries.filter((d: any) => d.attendanceId === selectedAttendanceId).map((delivery: any) => (
                          <div key={delivery.id} className="p-4 hover:bg-[var(--bg-main)] transition-colors">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-sm text-[var(--text-primary)]">Delivery — {new Date(delivery.deliveryDate).toLocaleDateString()}</h4>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full font-medium">{delivery.deliveryType?.replace(/_/g, ' ')}</span>
                                  <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full font-medium">{delivery.deliveryOutcome?.replace(/_/g, ' ')}</span>
                                  {delivery.birthWeight && <span className="text-xs text-[var(--text-secondary)]">Birth Wt: {delivery.birthWeight}g</span>}
                                  {delivery.gestationWeeks && <span className="text-xs text-[var(--text-secondary)]">{delivery.gestationWeeks} wks</span>}
                                </div>
                                {delivery.Newborn?.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                    {delivery.Newborn.map((baby: any, idx: number) => (
                                      <span key={baby.id} className="text-[10px] bg-[var(--bg-main)] border border-[var(--border-color)] px-2 py-0.5 rounded-full">Baby {idx+1}: {baby.birthWeight}g • {baby.gender}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-1.5">
                                <button onClick={() => handleViewDelivery(delivery)} className="p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-main)] rounded"><Eye className="w-3.5 h-3.5" /></button>
                                <button onClick={() => { setEditingDelivery(delivery); setShowDeliveryModal(true); }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"><Edit className="w-3.5 h-3.5" /></button>
                                <button onClick={() => handleDeleteDelivery(delivery.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── POSTNATAL TAB ── */}
              {activeTab === 'postnatal' && (
                <div className="p-4 space-y-4">
                  <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                    <PanelHeader
                      icon={<Heart className="w-4 h-4 text-blue-600" />}
                      title="Postnatal Examinations"
                      action={selectedAttendanceId && (
                        <button onClick={() => { setEditingPostnatal(null); setShowPostnatalModal(true); }} className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-700 hover:text-white transition-colors">
                          <Plus className="w-3 h-3" /> Add
                        </button>
                      )}
                    />
                    {postnatalRecords.filter((p: any) => p.attendanceId === selectedAttendanceId).length === 0 ? (
                      <div className="p-8 text-center">
                        <Heart className="w-10 h-10 text-[var(--text-secondary)] opacity-40 mx-auto mb-3" />
                        <p className="text-sm text-[var(--text-secondary)]">No postnatal examinations for this visit</p>
                        <button onClick={() => { setEditingPostnatal(null); setShowPostnatalModal(true); }} className="mt-3 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-700 hover:text-white transition-all">Add Postnatal Exam</button>
                      </div>
                    ) : (
                      <div className="divide-y divide-[var(--border-color)]">
                        {postnatalRecords.filter((p: any) => p.attendanceId === selectedAttendanceId).map((pn: any) => (
                          <div key={pn.id} className="p-4 hover:bg-[var(--bg-main)] transition-colors">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-sm text-[var(--text-primary)]">Postnatal Day {pn.dayNumber}</h4>
                                <p className="text-xs text-[var(--text-secondary)] mt-0.5">{new Date(pn.examinationDate).toLocaleString()}</p>
                                <div className="flex flex-wrap gap-2 mt-1.5">
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pn.maternalCondition === 'good' ? 'bg-green-100 text-green-700' : pn.maternalCondition === 'fair' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>Maternal: {pn.maternalCondition}</span>
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pn.breastfeedingStatus === 'exclusive' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>BF: {pn.breastfeedingStatus}</span>
                                </div>
                              </div>
                              <div className="flex gap-1.5">
                                <button onClick={() => handleViewPostnatal(pn)} className="p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-main)] rounded"><Eye className="w-3.5 h-3.5" /></button>
                                <button onClick={() => { setEditingPostnatal(pn); setShowPostnatalModal(true); }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"><Edit className="w-3.5 h-3.5" /></button>
                                <button onClick={() => handleDeletePostnatal(pn.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── VITALS TAB ── */}
              {activeTab === 'vitals' && (
                <div className="p-4">
                  <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                    <PanelHeader icon={<Activity className="w-4 h-4 text-pink-600" />} title="Vitals History" />
                    {latestVitals ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                            <tr>
                              {['Date/Time','BP','Temp','Pulse','Weight','FHR','Fundal Ht'].map(h => (
                                <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-[var(--text-secondary)]">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="hover:bg-[var(--bg-main)]">
                              <td className="px-3 py-2.5 text-xs">{new Date(latestVitals.recordedAt).toLocaleString()}</td>
                              <td className="px-3 py-2.5 text-xs">{latestVitals.bloodPressure || '—'}</td>
                              <td className="px-3 py-2.5 text-xs">{latestVitals.temperature ? `${latestVitals.temperature}°C` : '—'}</td>
                              <td className="px-3 py-2.5 text-xs">{latestVitals.pulse || '—'}</td>
                              <td className="px-3 py-2.5 text-xs">{latestVitals.weight ? `${latestVitals.weight}kg` : '—'}</td>
                              <td className="px-3 py-2.5 text-xs">{latestVitals.fetalHeartRate || '—'}</td>
                              <td className="px-3 py-2.5 text-xs">{latestVitals.fundalHeight ? `${latestVitals.fundalHeight}cm` : '—'}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-8 text-center text-[var(--text-secondary)] text-sm">No vitals recorded</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT SIDEBAR: Pregnancy Summary / Notes ── */}
          <div className="w-64 xl:w-72 flex-shrink-0 sticky top-6 self-stretch flex flex-col" style={{ minHeight: 0 }}>
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden flex flex-col h-full">

              {/* Pregnancy overview — top */}
              <div className="bg-[var(--bg-main)] px-4 py-2.5 border-b border-[var(--border-color)] flex-shrink-0">
                <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2 text-sm">
                  <Baby className="w-4 h-4 text-pink-500" />
                  Pregnancy Overview
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[var(--bg-main)]" style={{ minHeight: '120px' }}>
                {hasActiveBooking ? (
                  <>
                    <div className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border-color)] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-pink-600">Current Pregnancy</span>
                        <RiskBadge risk={currentBooking?.riskLevel || 'low'} />
                      </div>
                      {[
                        { label: 'Gravida/Para', value: `${currentBooking?.gravida||0} / ${currentBooking?.para||0}` },
                        { label: 'Gestation', value: currentBooking?.gestationalAgeWeeks ? `${currentBooking.gestationalAgeWeeks} weeks` : 'N/A' },
                        { label: 'LMP', value: currentBooking?.lmp ? new Date(currentBooking.lmp).toLocaleDateString() : 'N/A' },
                        { label: 'EDD', value: getEDDDisplay() },
                        { label: 'Blood Group', value: currentBooking?.bloodGroup || 'Not recorded' },
                        { label: 'Prev. C-Section', value: currentBooking?.previousCSection ? 'Yes' : 'No' },
                      ].map((row, i) => (
                        <div key={i} className="flex justify-between items-center text-xs border-t border-[var(--border-color)] pt-1.5 first:border-0 first:pt-0">
                          <span className="text-[var(--text-secondary)]">{row.label}</span>
                          <span className="font-semibold text-[var(--text-primary)]">{row.value}</span>
                        </div>
                      ))}
                    </div>

                    {/* Last visit summary */}
                    {currentVisits.length > 0 && (() => {
                      const last = currentVisits[currentVisits.length - 1];
                      return (
                        <div className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border-color)]">
                          <span className="text-xs font-semibold text-pink-600 block mb-2">Last Visit (#{last.visitNumber})</span>
                          {[
                            { label: 'Date', value: new Date(last.visitDate).toLocaleDateString() },
                            { label: 'Weight', value: last.weight ? `${last.weight} kg` : '—' },
                            { label: 'BP', value: last.bloodPressure || '—' },
                            { label: 'FHR', value: last.fetalHeartRate || '—' },
                          ].map((r,i) => (
                            <div key={i} className="flex justify-between text-xs mt-1">
                              <span className="text-[var(--text-secondary)]">{r.label}</span>
                              <span className="font-medium">{r.value}</span>
                            </div>
                          ))}
                          {last.dangerSignsPresent && (
                            <div className="mt-2 bg-red-50 text-red-700 text-[10px] font-semibold px-2 py-1 rounded border border-red-200">⚠ Danger signs recorded</div>
                          )}
                        </div>
                      );
                    })()}
                  </>
                ) : (
                  <div className="text-center text-[var(--text-secondary)] text-xs py-6">No active pregnancy record</div>
                )}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-2 px-4 py-2 border-t border-b border-[var(--border-color)] bg-[var(--bg-main)] flex-shrink-0">
                <div className="flex-1 h-px bg-[var(--border-color)]" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                  <FileText className="w-3 h-3" />
                  Visit Notes
                </span>
                <div className="flex-1 h-px bg-[var(--border-color)]" />
              </div>

              {/* Visit notes feed — bottom */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[var(--bg-main)]" style={{ minHeight: '80px' }}>
                {currentVisits.length > 0 ? (
                  [...currentVisits].reverse().slice(0, 5).map((visit: any) => (
                    <div key={visit.id} className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border-color)]">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-pink-600">Visit #{visit.visitNumber}</span>
                        <span className="text-[10px] text-[var(--text-secondary)]">{new Date(visit.visitDate).toLocaleDateString()}</span>
                      </div>
                      {visit.generalObservations && (
                        <p className="text-xs text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">{visit.generalObservations}</p>
                      )}
                      {visit.nextAppointment && (
                        <p className="text-[10px] text-[var(--text-secondary)] mt-1.5 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Next: {new Date(visit.nextAppointment).toLocaleDateString()}
                        </p>
                      )}
                      {!visit.generalObservations && (
                        <p className="text-xs text-[var(--text-secondary)] italic">GA: {visit.gestationalAgeWeeks||'—'}wks • BP: {visit.bloodPressure||'—'} • FHR: {visit.fetalHeartRate||'—'}</p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center text-[var(--text-secondary)] text-xs py-6">No visit notes recorded yet</div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : selectedPatientId && !selectedAttendanceId ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">No Visit Selected</h3>
          <p className="text-yellow-700 mb-4">Select an existing visit or create a new one</p>
          <button onClick={() => setShowNewAttendance(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700">
            <Plus className="w-4 h-4" /> New Visit
          </button>
        </div>
      ) : null}

      {/* ── MODALS ── */}
      {showNewAttendance && selectedPatientId && (
        <NewAttendanceModal patientId={selectedPatientId} onSuccess={handleAttendanceCreated} onClose={() => setShowNewAttendance(false)} isEditMode={false} />
      )}

      <DiagnosisModal isOpen={modalType==='diagnosis'} onClose={()=>setModalType(null)} onSuccess={()=>{setModalType(null);selectedAttendanceId&&getAttendance(selectedAttendanceId);}} attendanceId={selectedAttendanceId} diagnoses={diagnoses} canAdd={canAddEntries} userId={user?.id} />
      <LabTestModal isOpen={modalType==='lab'} onClose={()=>setModalType(null)} onSuccess={()=>{setModalType(null);selectedAttendanceId&&getAttendance(selectedAttendanceId);}} attendanceId={selectedAttendanceId} labTests={labTestTemplates} canAdd={canAddEntries} userId={user?.id} />
      <ProcedureModal isOpen={modalType==='procedure'} onClose={()=>setModalType(null)} onSuccess={()=>{setModalType(null);selectedAttendanceId&&getAttendance(selectedAttendanceId);}} attendanceId={selectedAttendanceId} procedures={procedureTemplates} canAdd={canAddEntries} userId={user?.id} />
      <MedicationModal isOpen={modalType==='medication'} onClose={()=>setModalType(null)} onSuccess={()=>{setModalType(null);selectedAttendanceId&&getAttendance(selectedAttendanceId);}} attendanceId={selectedAttendanceId} stockItems={stockItems} canAdd={canAddEntries} userId={user?.id} />
      <ScanModal isOpen={modalType==='scan'} onClose={()=>setModalType(null)} onSuccess={()=>{setModalType(null);selectedAttendanceId&&getAttendance(selectedAttendanceId);}} attendanceId={selectedAttendanceId} scans={scanTemplates} canAdd={canAddEntries} userId={user?.id} />

      {showANCVisitModal && selectedBookingId && selectedAttendanceId && (
        <ANCVisitModal isOpen={showANCVisitModal} onClose={()=>setShowANCVisitModal(false)} onSuccess={()=>{setShowANCVisitModal(false);if(currentBooking?.id)getANCVisitsByBooking(currentBooking.id);loadData();}} attendanceId={selectedAttendanceId} bookingId={selectedBookingId} visitNumber={currentVisits.length+1} existingVisit={editingVisit} />
      )}

      {showDeliveryModal && selectedAttendanceId && (
        <DeliveryModal isOpen={showDeliveryModal} onClose={()=>setShowDeliveryModal(false)} onSuccess={()=>{setShowDeliveryModal(false);getDeliveries({patientId:selectedPatientId});loadData();}} attendanceId={selectedAttendanceId} patientId={selectedPatientId} existingDelivery={editingDelivery} />
      )}

      {showPostnatalModal && selectedAttendanceId && (
        <PostnatalModal isOpen={showPostnatalModal} onClose={()=>setShowPostnatalModal(false)} onSuccess={()=>{setShowPostnatalModal(false);getPostnatalRecords({patientId:selectedPatientId});loadData();}} attendanceId={selectedAttendanceId} patientId={selectedPatientId} existingPostnatal={editingPostnatal} />
      )}

      {/* ANC Booking Modal */}
      {modalType === 'anc_booking' && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setModalType(null)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-[var(--bg-card)] rounded-xl shadow-xl max-w-md w-full border border-[var(--border-color)]">
              <div className="bg-[var(--bg-main)] px-5 py-3 border-b border-[var(--border-color)] rounded-t-xl flex items-center justify-between">
                <h2 className="font-bold text-[var(--text-primary)] flex items-center gap-2"><Baby className="w-4 h-4 text-pink-500" /> Create Pregnancy Record</h2>
                <button onClick={() => setModalType(null)} className="p-1 hover:bg-[var(--bg-card)] rounded-lg"><X className="w-4 h-4 text-[var(--text-secondary)]" /></button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); const form = e.target as any; handleCreateBooking({ gravida: parseInt(form.gravida.value), para: parseInt(form.para.value), lmp: form.lmp.value || undefined }); }} className="p-5 space-y-4">
                <div><label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">Gravida *</label><input name="gravida" type="number" min="1" required className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm" /></div>
                <div><label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">Para *</label><input name="para" type="number" min="0" required className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm" /></div>
                <div><label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">LMP (Last Menstrual Period)</label><input name="lmp" type="date" className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm" /></div>
                <div><label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">Previous C-Section</label><select name="previousCSection" className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm"><option value="false">No</option><option value="true">Yes</option></select></div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setModalType(null)} className="flex-1 px-4 py-2 border border-[var(--border-color)] rounded-lg text-sm hover:bg-[var(--bg-main)] transition-colors">Cancel</button>
                  <button type="submit" disabled={ancLoading} className="flex-1 px-4 py-2 bg-pink-100 text-pink-700 rounded-lg text-sm font-medium hover:bg-pink-700 hover:text-white transition-all disabled:opacity-50">{ancLoading ? 'Creating...' : 'Create Record'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Visit Details Modal */}
      {showVisitDetails && selectedVisit && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowVisitDetails(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-[var(--bg-card)] rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-[var(--border-color)]">
              <div className="sticky top-0 bg-[var(--bg-main)] px-5 py-3 border-b border-[var(--border-color)] rounded-t-xl flex items-center justify-between">
                <div><h2 className="font-bold text-[var(--text-primary)]">ANC Visit #{selectedVisit.visitNumber}</h2><p className="text-xs text-[var(--text-secondary)]">{new Date(selectedVisit.visitDate).toLocaleString()}</p></div>
                <button onClick={() => setShowVisitDetails(false)} className="p-1 hover:bg-[var(--bg-card)] rounded-lg"><X className="w-4 h-4 text-[var(--text-secondary)]" /></button>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Gestational Age', value: `${selectedVisit.gestationalAgeWeeks||'—'} weeks` },
                    { label: 'Weight', value: selectedVisit.weight ? `${selectedVisit.weight} kg` : '—' },
                    { label: 'Blood Pressure', value: selectedVisit.bloodPressure || '—' },
                    { label: 'Fundal Height', value: selectedVisit.fundalHeight ? `${selectedVisit.fundalHeight} cm` : '—' },
                    { label: 'Fetal Heart Rate', value: selectedVisit.fetalHeartRate ? `${selectedVisit.fetalHeartRate} bpm` : '—' },
                    { label: 'Presentation', value: selectedVisit.presentation || '—' },
                  ].map((r,i) => (
                    <div key={i}><label className="text-xs text-[var(--text-secondary)]">{r.label}</label><p className="font-medium text-sm">{r.value}</p></div>
                  ))}
                </div>
                <div className="border-t border-[var(--border-color)] pt-4">
                  <h4 className="font-semibold text-sm mb-3">Preventive Care</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'IPTp Given', value: selectedVisit.iptpGiven ? `Yes (Dose ${selectedVisit.iptpDoseNumber})` : 'No' },
                      { label: 'TT Given', value: selectedVisit.ttGiven ? `Yes (Dose ${selectedVisit.ttDoseNumber})` : 'No' },
                      { label: 'Iron/Folate', value: selectedVisit.ironGiven||selectedVisit.folateGiven ? 'Yes' : 'No' },
                      { label: 'ITN Given', value: selectedVisit.itnGiven ? 'Yes' : 'No' },
                    ].map((r,i) => (
                      <div key={i}><label className="text-xs text-[var(--text-secondary)]">{r.label}</label><p className="font-medium text-sm">{r.value}</p></div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="border-t border-[var(--border-color)] px-5 py-3 flex justify-end gap-3">
                <button onClick={() => setShowVisitDetails(false)} className="px-4 py-2 border border-[var(--border-color)] rounded-lg text-sm hover:bg-[var(--bg-main)]">Close</button>
                <button onClick={() => { setShowVisitDetails(false); setEditingVisit(selectedVisit); setSelectedBookingId(currentBooking?.id||''); setShowANCVisitModal(true); }} className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-700 hover:text-white transition-all">Edit Visit</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Details Modal */}
      {showDeliveryDetails && selectedDelivery && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowDeliveryDetails(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-[var(--bg-card)] rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-[var(--border-color)]">
              <div className="sticky top-0 bg-[var(--bg-main)] px-5 py-3 border-b border-[var(--border-color)] rounded-t-xl flex items-center justify-between">
                <div><h2 className="font-bold text-[var(--text-primary)]">Delivery Details</h2><p className="text-xs text-[var(--text-secondary)]">{new Date(selectedDelivery.deliveryDate).toLocaleString()}</p></div>
                <button onClick={() => setShowDeliveryDetails(false)} className="p-1 hover:bg-[var(--bg-card)] rounded-lg"><X className="w-4 h-4 text-[var(--text-secondary)]" /></button>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Delivery Type', value: selectedDelivery.deliveryType?.replace(/_/g,' ') || '—' },
                    { label: 'Delivery Outcome', value: selectedDelivery.deliveryOutcome?.replace(/_/g,' ') || '—' },
                    { label: 'Birth Weight', value: selectedDelivery.birthWeight ? `${selectedDelivery.birthWeight}g` : '—' },
                    { label: 'Gestation Weeks', value: selectedDelivery.gestationWeeks ? `${selectedDelivery.gestationWeeks} weeks` : '—' },
                    { label: 'Number of Babies', value: selectedDelivery.numberOfBabies || 1 },
                    { label: 'Blood Loss (ml)', value: selectedDelivery.bloodLoss || '—' },
                    { label: 'APGAR Score', value: selectedDelivery.apgarScore || '—' },
                    { label: 'Attendant', value: selectedDelivery.attendant || '—' },
                  ].map((r, i) => (
                    <div key={i}><label className="text-xs text-[var(--text-secondary)]">{r.label}</label><p className="font-medium text-sm">{r.value}</p></div>
                  ))}
                </div>
                {selectedDelivery.complications && <div className="bg-red-50 border border-red-200 rounded-lg p-3"><p className="text-xs font-semibold text-red-600 mb-1">⚠ Complications</p><p className="text-sm text-red-700">{selectedDelivery.complications}</p></div>}
                {selectedDelivery.Newborn?.length > 0 && (
                  <div className="border-t border-[var(--border-color)] pt-4">
                    <h4 className="font-semibold text-sm mb-3">Newborn(s)</h4>
                    <div className="space-y-2">{selectedDelivery.Newborn.map((baby: any, idx: number) => (
                      <div key={baby.id} className="bg-[var(--bg-main)] rounded-lg p-3 border border-[var(--border-color)]"><p className="text-xs font-semibold mb-1">Baby {idx + 1}</p><div className="grid grid-cols-3 gap-2 text-xs"><div><span className="text-[var(--text-secondary)]">Weight: </span>{baby.birthWeight}g</div><div><span className="text-[var(--text-secondary)]">Gender: </span>{baby.gender}</div><div><span className="text-[var(--text-secondary)]">APGAR: </span>{baby.apgarScore || '—'}</div></div></div>
                    ))}</div>
                  </div>
                )}
                {selectedDelivery.notes && <div className="border-t border-[var(--border-color)] pt-4"><p className="text-xs font-semibold text-[var(--text-secondary)] mb-1">Notes</p><p className="text-sm whitespace-pre-wrap">{selectedDelivery.notes}</p></div>}
              </div>
              <div className="border-t border-[var(--border-color)] px-5 py-3 flex justify-end gap-3">
                <button onClick={() => setShowDeliveryDetails(false)} className="px-4 py-2 border border-[var(--border-color)] rounded-lg text-sm hover:bg-[var(--bg-main)]">Close</button>
                <button onClick={() => { setShowDeliveryDetails(false); setEditingDelivery(selectedDelivery); setShowDeliveryModal(true); }} className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-700 hover:text-white transition-all">Edit Delivery</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Postnatal Details Modal */}
      {showPostnatalDetails && selectedPostnatal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowPostnatalDetails(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-[var(--bg-card)] rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-[var(--border-color)]">
              <div className="sticky top-0 bg-[var(--bg-main)] px-5 py-3 border-b border-[var(--border-color)] rounded-t-xl flex items-center justify-between">
                <div><h2 className="font-bold text-[var(--text-primary)]">Postnatal Day {selectedPostnatal.dayNumber} Details</h2><p className="text-xs text-[var(--text-secondary)]">{new Date(selectedPostnatal.examinationDate).toLocaleString()}</p></div>
                <button onClick={() => setShowPostnatalDetails(false)} className="p-1 hover:bg-[var(--bg-card)] rounded-lg"><X className="w-4 h-4 text-[var(--text-secondary)]" /></button>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Day Number', value: selectedPostnatal.dayNumber },
                    { label: 'Maternal Condition', value: selectedPostnatal.maternalCondition || '—' },
                    { label: 'Breastfeeding', value: selectedPostnatal.breastfeedingStatus || '—' },
                    { label: 'Lochia', value: selectedPostnatal.lochia || '—' },
                    { label: 'Uterus Involution', value: selectedPostnatal.uterusInvolution || '—' },
                    { label: 'Blood Pressure', value: selectedPostnatal.bloodPressure || '—' },
                    { label: 'Temperature', value: selectedPostnatal.temperature ? `${selectedPostnatal.temperature}°C` : '—' },
                    { label: 'Pulse', value: selectedPostnatal.pulse || '—' },
                  ].map((r, i) => (
                    <div key={i}><label className="text-xs text-[var(--text-secondary)]">{r.label}</label><p className="font-medium text-sm capitalize">{r.value}</p></div>
                  ))}
                </div>
                {selectedPostnatal.complications && <div className="bg-red-50 border border-red-200 rounded-lg p-3"><p className="text-xs font-semibold text-red-600 mb-1">⚠ Complications</p><p className="text-sm text-red-700">{selectedPostnatal.complications}</p></div>}
                {selectedPostnatal.notes && <div className="border-t border-[var(--border-color)] pt-4"><p className="text-xs font-semibold text-[var(--text-secondary)] mb-1">Notes</p><p className="text-sm whitespace-pre-wrap">{selectedPostnatal.notes}</p></div>}
                {selectedPostnatal.familyPlanningCounselling && <div className="bg-blue-50 border border-blue-200 rounded-lg p-3"><p className="text-xs font-semibold text-blue-700">✓ Family Planning Counselling Given</p>{selectedPostnatal.familyPlanningMethod && <p className="text-xs text-blue-600 mt-1">Method: {selectedPostnatal.familyPlanningMethod}</p>}</div>}
              </div>
              <div className="border-t border-[var(--border-color)] px-5 py-3 flex justify-end gap-3">
                <button onClick={() => setShowPostnatalDetails(false)} className="px-4 py-2 border border-[var(--border-color)] rounded-lg text-sm hover:bg-[var(--bg-main)]">Close</button>
                <button onClick={() => { setShowPostnatalDetails(false); setEditingPostnatal(selectedPostnatal); setShowPostnatalModal(true); }} className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-700 hover:text-white transition-all">Edit Exam</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}