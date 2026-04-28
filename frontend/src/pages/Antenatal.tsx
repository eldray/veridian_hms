// src/pages/Antenatal.tsx - COMPLETE WITH MEDICAL ENTRIES UI + ANC TAB
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAntenatalStore } from '../store/antenatalStore';
import { useAttendanceStore } from '../store/attendanceStore';
import { usePatientStore } from '../store/patientStore';
import { useMedicalServicesStore } from '../store/medicalServicesStore';
import { useStockStore } from '../store/stockStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import { PatientAttendanceSelector } from '../components/vitals/PatientAttendanceSelector';
import { VitalsDisplay } from '../components/medical-entries/VitalsDisplay';
import NewAttendanceModal from '../components/NewAttendanceModal';

// Modal Components (same as Medical Entries)
import { DiagnosisModal } from '../components/medical-entries/modals/DiagnosisModal';
import { LabTestModal } from '../components/medical-entries/modals/LabTestModal';
import { ProcedureModal } from '../components/medical-entries/modals/ProcedureModal';
import { MedicationModal } from '../components/medical-entries/modals/MedicationModal';
import { ScanModal } from '../components/medical-entries/modals/ScanModal';

import {
  ChevronLeft,
  RefreshCw,
  X,
  Stethoscope,
  Pill,
  FlaskConical,
  Scissors,
  Scan,
  FileText,
  Activity,
  AlertCircle,
  Plus,
  Trash2,
  Edit,
  User,
  Calendar,
  DollarSign,
  Baby,
  Heart,
  Droplet,
  Shield,
  CheckCircle,
  Clock,
  AlertTriangle,
  Syringe,
  Ruler,
  Weight,
  TrendingUp,
} from 'lucide-react';

const getEntityId = (entity: { id?: string; _id?: string } | null): string | undefined => {
  return entity?._id || entity?.id;
};

type ModalType = 'diagnosis' | 'lab' | 'procedure' | 'medication' | 'scan' | 'anc_booking' | null;

// Risk Badge
const RiskBadge: React.FC<{ risk: string }> = ({ risk }) => {
  const config: Record<string, { bg: string; text: string }> = {
    low: { bg: 'bg-green-100', text: 'text-green-700' },
    medium: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
    high: { bg: 'bg-red-100', text: 'text-red-700' },
  };
  const c = config[risk?.toLowerCase()] || config.low;
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>{risk?.toUpperCase()} RISK</span>;
};

export default function Antenatal() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const { user } = useAuthStore();

  // Stores
  const { patients, loadPatients } = usePatientStore();
  const {
    attendances,
    currentAttendance,
    getAttendance,
    getAttendances,
    addDiagnosis,
    addLabTest,
    addProcedure,
    addMedication,
    addScan,
    removeDiagnosis,
    removeLabTest,
    removeProcedure,
    removeMedication,
    removeScan,
    canAddMedicalEntries,
    getVitalsByAttendance,
    calculateBill,
  } = useAttendanceStore();

  const {
    diagnoses,
    labTestTemplates,
    procedureTemplates,
    scanTemplates,
    getDiagnoses,
    getLabTestTemplates,
    getProcedureTemplates,
    getScanTemplates,
  } = useMedicalServicesStore();

  const { stockItems, getStockItems } = useStockStore();

  // Antenatal Store
  const {
    currentBooking,
    currentVisits,
    getBooking,
    getVisits,
    createBooking,
    isLoading: ancLoading,
  } = useAntenatalStore();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedAttendanceId, setSelectedAttendanceId] = useState<string>('');
  const [latestVitals, setLatestVitals] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'clinical' | 'anc' | 'vitals'>('clinical');
  const [modalType, setModalType] = useState<ModalType>(null);
  const [showNewAttendance, setShowNewAttendance] = useState(false);

  // Filter only antenatal attendances
  const antenatalAttendances = useMemo(() => {
    return attendances.filter(a => a.attendanceType === 'antenatal');
  }, [attendances]);

  // Load data
  const loadData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadPatients(),
        getAttendances(),
        getStockItems(),
        getDiagnoses(),
        getLabTestTemplates(),
        getProcedureTemplates(),
        getScanTemplates(),
      ]);
      success('Data loaded', 'Antenatal ready');
    } catch (err: any) {
      toastError('Load failed', err.message);
    } finally {
      setRefreshing(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Load vitals when attendance changes
  useEffect(() => {
    const loadVitals = async () => {
      if (selectedAttendanceId) {
        try {
          const vitals = await getVitalsByAttendance(selectedAttendanceId);
          setLatestVitals(vitals?.length ? vitals[vitals.length - 1] : null);
        } catch {
          setLatestVitals(null);
        }
      }
    };
    loadVitals();
  }, [selectedAttendanceId, getVitalsByAttendance]);

  // Load full attendance when selected
  useEffect(() => {
    if (selectedAttendanceId) {
      getAttendance(selectedAttendanceId);
    }
  }, [selectedAttendanceId, getAttendance]);

  // Load booking when patient is selected
  useEffect(() => {
    if (selectedPatientId) {
      getBooking(selectedPatientId).catch(() => {});
    }
  }, [selectedPatientId, getBooking]);

  // Load visits when booking exists
  useEffect(() => {
    if (currentBooking?.id) {
      getVisits(currentBooking.id);
    }
  }, [currentBooking, getVisits]);

  const selectedPatient = patients.find((p) => getEntityId(p) === selectedPatientId);
  const canAddEntries = currentAttendance ? canAddMedicalEntries(currentAttendance) : false;
  const hasActiveBooking = currentBooking?.isActive === true;

  // Get entries from current attendance
  const diagnosesList = currentAttendance?.AttendanceDiagnosis || [];
  const labTestsList = currentAttendance?.LabTest || [];
  const proceduresList = currentAttendance?.Procedure || [];
  const medicationsList = currentAttendance?.Medication || [];
  const scansList = currentAttendance?.Scan || [];

  const handleClearSelection = () => {
    setSelectedPatientId('');
    setSelectedAttendanceId('');
  };

  const handleRefresh = () => loadData();

  const handleCreateBooking = async (data: any) => {
    if (!selectedPatientId) return;
    try {
      await createBooking({ ...data, patientId: selectedPatientId });
      setModalType(null);
      success('Booking Created', 'Antenatal record created');
    } catch (err: any) {
      toastError('Creation failed', err.message);
    }
  };

  const handleDeleteItem = async (type: string, id: string) => {
    if (!selectedAttendanceId) return;
    try {
      switch (type) {
        case 'diagnosis': await removeDiagnosis(selectedAttendanceId, id); break;
        case 'lab': await removeLabTest(selectedAttendanceId, id); break;
        case 'procedure': await removeProcedure(selectedAttendanceId, id); break;
        case 'medication': await removeMedication(selectedAttendanceId, id); break;
        case 'scan': await removeScan(selectedAttendanceId, id); break;
      }
      success('Deleted', 'Item removed');
      await getAttendance(selectedAttendanceId);
      await calculateBill(selectedAttendanceId);
    } catch (err: any) {
      toastError('Delete failed', err.message);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      requested: 'bg-yellow-100 text-yellow-800',
      scheduled: 'bg-blue-100 text-blue-800',
      prescribed: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      dispensed: 'bg-green-100 text-green-800',
    };
    return colors[status?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  // Calculate EDD display
  const getEDDDisplay = () => {
    if (currentBooking?.estimatedDeliveryDate) {
      const edd = new Date(currentBooking.estimatedDeliveryDate);
      const today = new Date();
      const daysLeft = Math.ceil((edd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return `${edd.toLocaleDateString()} (${daysLeft} days left)`;
    }
    return 'N/A';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
        <div className="text-center bg-[var(--bg-card)] p-8 rounded-xl border border-[var(--border-color)]">
          <div className="w-14 h-14 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Loading Antenatal...</h2>
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
            className="p-2 hover:bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)]"
          >
            <ChevronLeft className="w-5 h-5 text-[var(--text-primary)]" />
          </button>
          <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center">
            <Baby className="w-5 h-5 text-pink-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Antenatal Care</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">Manage pregnancy visits and fetal monitoring</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewAttendance(true)}
            className="flex items-center gap-2 px-3 py-2 bg-pink-100 text-pink-700 rounded-lg hover:bg-pink-700 hover:text-white transition-all text-sm"
          >
            <Plus className="w-4 h-4" />
            New ANC Visit
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards - Pregnancy Overview */}
      {selectedPatient && hasActiveBooking && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-[var(--bg-card)] rounded-xl p-3 border text-center">
            <Baby className="w-5 h-5 text-pink-500 mx-auto mb-1" />
            <p className="text-xl font-bold">{currentBooking?.gravida || 0}/{currentBooking?.para || 0}</p>
            <p className="text-xs text-[var(--text-secondary)]">Gravida/Para</p>
          </div>
          <div className="bg-[var(--bg-card)] rounded-xl p-3 border text-center">
            <Calendar className="w-5 h-5 text-purple-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-sm">{currentBooking?.gestationalAgeWeeks || '?'}</p>
            <p className="text-xs text-[var(--text-secondary)]">Weeks</p>
          </div>
          <div className="bg-[var(--bg-card)] rounded-xl p-3 border text-center">
            <Heart className="w-5 h-5 text-red-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-sm">{latestVitals?.fetalHeartRate || '—'}</p>
            <p className="text-xs text-[var(--text-secondary)]">FHR (bpm)</p>
          </div>
          <div className="bg-[var(--bg-card)] rounded-xl p-3 border text-center">
            <Ruler className="w-5 h-5 text-blue-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-sm">{latestVitals?.fundalHeight ? `${latestVitals.fundalHeight}cm` : '—'}</p>
            <p className="text-xs text-[var(--text-secondary)]">Fundal Ht</p>
          </div>
          <div className="bg-[var(--bg-card)] rounded-xl p-3 border text-center">
            <TrendingUp className="w-5 h-5 text-green-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-sm">{currentVisits.length}</p>
            <p className="text-xs text-[var(--text-secondary)]">Visits</p>
          </div>
        </div>
      )}

      {/* Patient & Attendance Selection */}
      <PatientAttendanceSelector
        patients={patients}
        attendances={antenatalAttendances}
        selectedPatientId={selectedPatientId}
        selectedAttendanceId={selectedAttendanceId}
        onPatientSelect={setSelectedPatientId}
        onAttendanceSelect={setSelectedAttendanceId}
        onClearSelection={handleClearSelection}
      />

      {/* Patient & Visit Header */}
      {selectedPatient && currentAttendance && (
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center">
                <Baby className="w-6 h-6 text-pink-600" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-bold">{selectedPatient.surname} {selectedPatient.otherNames}</h3>
                  <span className="text-xs text-[var(--text-secondary)]">{selectedPatient.age || '?'}y</span>
                  {hasActiveBooking && <RiskBadge risk={currentBooking?.riskLevel || 'low'} />}
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-[var(--text-secondary)] mt-1">
                  <span>ID: {selectedPatient.folderNumber}</span>
                  <span>•</span>
                  <span>{selectedPatient.contact}</span>
                  {currentBooking?.estimatedDeliveryDate && (
                    <span className="text-pink-600">EDD: {getEDDDisplay()}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold">{currentAttendance.attendanceNumber}</div>
              <div className="text-xs text-[var(--text-secondary)] mt-1">
                {new Date(currentAttendance.dateTime || currentAttendance.createdAt || '').toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ANC Booking Banner */}
      {selectedPatient && !hasActiveBooking && (
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

      {/* Vitals Display */}
      {currentAttendance && latestVitals && <VitalsDisplay vitals={latestVitals} />}

      {/* Main Content - Tabs */}
      {selectedAttendanceId && currentAttendance && (
        <div className="bg-[var(--bg-card)] rounded-xl shadow-sm border">
          <div className="border-b px-4">
            <div className="flex gap-6">
              <button
                onClick={() => setActiveTab('clinical')}
                className={`py-3 px-1 text-sm font-medium border-b-2 transition-all ${
                  activeTab === 'clinical' ? 'border-pink-500 text-pink-600' : 'border-transparent text-[var(--text-secondary)]'
                }`}
              >
                <Stethoscope className="w-4 h-4 inline mr-1" />
                Clinical ({diagnosesList.length + labTestsList.length + medicationsList.length})
              </button>
              <button
                onClick={() => setActiveTab('anc')}
                className={`py-3 px-1 text-sm font-medium border-b-2 transition-all ${
                  activeTab === 'anc' ? 'border-pink-500 text-pink-600' : 'border-transparent text-[var(--text-secondary)]'
                }`}
              >
                <Baby className="w-4 h-4 inline mr-1" />
                Pregnancy ({currentVisits.length})
              </button>
              <button
                onClick={() => setActiveTab('vitals')}
                className={`py-3 px-1 text-sm font-medium border-b-2 transition-all ${
                  activeTab === 'vitals' ? 'border-pink-500 text-pink-600' : 'border-transparent text-[var(--text-secondary)]'
                }`}
              >
                <Activity className="w-4 h-4 inline mr-1" />
                Vitals History
              </button>
            </div>
          </div>

          <div className="p-5">
            {/* CLINICAL TAB - Same as Medical Entries */}
            {activeTab === 'clinical' && (
              <div className="space-y-6">
                {/* Quick Add Buttons */}
                {canAddEntries && (
                  <div className="flex flex-wrap gap-2 pb-4 border-b">
                    <button onClick={() => setModalType('diagnosis')} className="px-3 py-1.5 bg-cyan-100 text-cyan-700 rounded-lg text-sm">
                      <Plus className="w-4 h-4 inline mr-1" />Add Diagnosis
                    </button>
                    <button onClick={() => setModalType('lab')} className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm">
                      <FlaskConical className="w-4 h-4 inline mr-1" />Add Lab Test
                    </button>
                    <button onClick={() => setModalType('procedure')} className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg text-sm">
                      <Scissors className="w-4 h-4 inline mr-1" />Add Procedure
                    </button>
                    <button onClick={() => setModalType('medication')} className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm">
                      <Pill className="w-4 h-4 inline mr-1" />Prescribe
                    </button>
                    <button onClick={() => setModalType('scan')} className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm">
                      <Scan className="w-4 h-4 inline mr-1" />Order Scan
                    </button>
                  </div>
                )}

                {/* Diagnoses */}
                {diagnosesList.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-[var(--bg-main)] px-4 py-2">
                      <h4 className="font-semibold flex items-center gap-2"><Stethoscope className="w-4 h-4" /> Diagnoses ({diagnosesList.length})</h4>
                    </div>
                    <div className="divide-y">
                      {diagnosesList.map((item: any) => (
                        <div key={item.id} className="p-3 flex justify-between items-start">
                          <div>
                            <span className="font-medium">{item.Diagnosis?.name}</span>
                            <div className="text-xs text-[var(--text-secondary)]">ICD-10: {item.Diagnosis?.icdCode}</div>
                          </div>
                          {canAddEntries && (
                            <button onClick={() => handleDeleteItem('diagnosis', item.id)} className="p-1 text-red-500">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lab Tests */}
                {labTestsList.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-[var(--bg-main)] px-4 py-2">
                      <h4 className="font-semibold flex items-center gap-2"><FlaskConical className="w-4 h-4" /> Lab Tests ({labTestsList.length})</h4>
                    </div>
                    <div className="divide-y">
                      {labTestsList.map((item: any) => (
                        <div key={item.id} className="p-3 flex justify-between">
                          <span>{item.ServiceCatalog?.name || item.name}</span>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(item.status)}`}>{item.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Medications */}
                {medicationsList.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-[var(--bg-main)] px-4 py-2">
                      <h4 className="font-semibold flex items-center gap-2"><Pill className="w-4 h-4" /> Medications ({medicationsList.length})</h4>
                    </div>
                    <div className="divide-y">
                      {medicationsList.map((item: any) => (
                        <div key={item.id} className="p-3 flex flex-wrap justify-between items-center gap-2">
                          <span className="font-medium">{item.name}</span>
                          <span className="text-xs text-[var(--text-secondary)]">{item.dosage} • {item.frequency}</span>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(item.status)}`}>{item.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {diagnosesList.length === 0 && labTestsList.length === 0 && medicationsList.length === 0 && (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-[var(--text-tertiary)]" />
                    <p className="text-[var(--text-secondary)]">No clinical records for this visit</p>
                  </div>
                )}
              </div>
            )}

            {/* ANC TAB - Pregnancy specific with ANC Visits */}
            {activeTab === 'anc' && (
              <div className="space-y-6">
                {/* Pregnancy Details Card */}
                {currentBooking && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border rounded-lg p-4">
                      <h4 className="font-semibold mb-3 flex items-center gap-2"><Baby className="w-4 h-4 text-pink-500" /> Pregnancy Details</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Gravida/Para</span><span className="font-medium">{currentBooking.gravida}/{currentBooking.para}</span></div>
                        <div className="flex justify-between"><span className="text-[var(--text-secondary)]">LMP</span><span className="font-medium">{currentBooking.lmp ? new Date(currentBooking.lmp).toLocaleDateString() : 'N/A'}</span></div>
                        <div className="flex justify-between"><span className="text-[var(--text-secondary)]">EDD</span><span className="font-medium">{getEDDDisplay()}</span></div>
                        <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Gestational Age</span><span className="font-medium">{currentBooking.gestationalAgeWeeks || '?'} weeks</span></div>
                        <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Risk Level</span><RiskBadge risk={currentBooking.riskLevel || 'low'} /></div>
                      </div>
                    </div>
                    <div className="border rounded-lg p-4">
                      <h4 className="font-semibold mb-3 flex items-center gap-2"><Droplet className="w-4 h-4 text-blue-500" /> Lab Results</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Blood Group</span><span className="font-medium">{currentBooking.bloodGroup || 'Pending'}</span></div>
                        <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Rhesus</span><span className="font-medium">{currentBooking.rhesusStatus || 'Pending'}</span></div>
                        <div className="flex justify-between"><span className="text-[var(--text-secondary)]">HIV</span><span className={`font-medium ${currentBooking.hivStatus === 'positive' ? 'text-red-600' : ''}`}>{currentBooking.hivStatus || 'Pending'}</span></div>
                        <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Syphilis</span><span className="font-medium">{currentBooking.syphilisStatus || 'Pending'}</span></div>
                        <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Hepatitis B</span><span className="font-medium">{currentBooking.hepatitisBStatus || 'Pending'}</span></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ANC Visits Table */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-[var(--bg-main)] px-4 py-2 flex justify-between items-center">
                    <h4 className="font-semibold flex items-center gap-2"><Calendar className="w-4 h-4" /> ANC Visit History</h4>
                    {hasActiveBooking && (
                      <button
                        onClick={() => setShowNewAttendance(true)}
                        className="flex items-center gap-1 px-2 py-1 bg-pink-100 text-pink-700 rounded text-xs"
                      >
                        <Plus className="w-3 h-3" /> Record Visit
                      </button>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-[var(--bg-main)] border-b">
                        <tr>
                          <th className="px-3 py-2 text-left">Visit #</th>
                          <th className="px-3 py-2 text-left">Date</th>
                          <th className="px-3 py-2 text-left">GA (wks)</th>
                          <th className="px-3 py-2 text-left">Weight</th>
                          <th className="px-3 py-2 text-left">BP</th>
                          <th className="px-3 py-2 text-left">FHR</th>
                          <th className="px-3 py-2 text-left">Fundal Ht</th>
                          <th className="px-3 py-2 text-left">TT</th>
                          <th className="px-3 py-2 text-left">ITN</th>
                          <th className="px-3 py-2 text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {currentVisits.length === 0 ? (
                          <tr><td colSpan={10} className="text-center py-8 text-[var(--text-secondary)]">No ANC visits recorded</td></tr>
                        ) : (
                          currentVisits.map((visit: any) => (
                            <tr key={visit.id} className="hover:bg-[var(--bg-main)]">
                              <td className="px-3 py-2 font-medium">#{visit.visitNumber}</td>
                              <td className="px-3 py-2">{new Date(visit.visitDate).toLocaleDateString()}</td>
                              <td className="px-3 py-2">{visit.gestationalAgeWeeks || '—'}</td>
                              <td className="px-3 py-2">{visit.weight ? `${visit.weight}kg` : '—'}</td>
                              <td className="px-3 py-2">{visit.bloodPressure || '—'}</td>
                              <td className="px-3 py-2">{visit.fetalHeartRate || '—'}</td>
                              <td className="px-3 py-2">{visit.fundalHeight ? `${visit.fundalHeight}cm` : '—'}</td>
                              <td className="px-3 py-2">{visit.ttVaccineGiven ? '✓' : '—'}</td>
                              <td className="px-3 py-2">{visit.itnGiven ? '✓' : '—'}</td>
                              <td className="px-3 py-2">
                                <div className="flex gap-1">
                                  <button className="p-1 text-blue-500 hover:bg-blue-50 rounded"><Edit className="w-3.5 h-3.5" /></button>
                                  <button className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* TT & ITN Coverage Summary */}
                {currentVisits.length > 0 && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-green-600">{currentVisits.filter(v => v.ttVaccineGiven).length}/{currentVisits.length}</p>
                      <p className="text-xs text-green-700">TT Vaccinated</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-blue-600">{currentVisits.filter(v => v.itnGiven).length}/{currentVisits.length}</p>
                      <p className="text-xs text-blue-700">ITN Given</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Vitals History Tab */}
            {activeTab === 'vitals' && (
              <div className="space-y-4">
                <div className="bg-[var(--bg-main)] rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Vitals History</h3>
                  {latestVitals ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-[var(--bg-card)] border-b">
                          <tr><th className="px-3 py-2">Date/Time</th><th className="px-3 py-2">BP</th><th className="px-3 py-2">Temp</th><th className="px-3 py-2">Pulse</th><th className="px-3 py-2">Weight</th><th className="px-3 py-2">FHR</th><th className="px-3 py-2">Fundal Ht</th></tr>
                        </thead>
                        <tbody className="divide-y">
                          <tr><td className="px-3 py-2">{new Date(latestVitals.recordedAt).toLocaleString()}</td><td className="px-3 py-2">{latestVitals.bloodPressure || '-'}</td><td className="px-3 py-2">{latestVitals.temperature ? `${latestVitals.temperature}°C` : '-'}</td><td className="px-3 py-2">{latestVitals.pulse || '-'}</td><td className="px-3 py-2">{latestVitals.weight ? `${latestVitals.weight}kg` : '-'}</td><td className="px-3 py-2">{latestVitals.fetalHeartRate || '-'}</td><td className="px-3 py-2">{latestVitals.fundalHeight ? `${latestVitals.fundalHeight}cm` : '-'}</td></tr>
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-center py-8 text-[var(--text-secondary)]">No vitals recorded</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* No Attendance Message */}
      {selectedPatientId && !selectedAttendanceId && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">No Antenatal Visit Selected</h3>
          <p className="text-yellow-700 mb-4">Select an existing antenatal visit or create a new one</p>
          <button
            onClick={() => setShowNewAttendance(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
          >
            <Plus className="w-4 h-4" />
            New ANC Visit
          </button>
        </div>
      )}

      {/* New Attendance Modal */}
      {showNewAttendance && selectedPatientId && (
        <NewAttendanceModal
          patientId={selectedPatientId}
          onSuccess={() => {
            setShowNewAttendance(false);
            loadData();
          }}
          onClose={() => setShowNewAttendance(false)}
          isEditMode={false}
        />
      )}

      {/* Modals */}
      <DiagnosisModal isOpen={modalType === 'diagnosis'} onClose={() => setModalType(null)} onSuccess={() => { setModalType(null); selectedAttendanceId && getAttendance(selectedAttendanceId); }} attendanceId={selectedAttendanceId} diagnoses={diagnoses} canAdd={canAddEntries} userId={user?.id} />
      <LabTestModal isOpen={modalType === 'lab'} onClose={() => setModalType(null)} onSuccess={() => { setModalType(null); selectedAttendanceId && getAttendance(selectedAttendanceId); }} attendanceId={selectedAttendanceId} labTests={labTestTemplates} canAdd={canAddEntries} userId={user?.id} />
      <ProcedureModal isOpen={modalType === 'procedure'} onClose={() => setModalType(null)} onSuccess={() => { setModalType(null); selectedAttendanceId && getAttendance(selectedAttendanceId); }} attendanceId={selectedAttendanceId} procedures={procedureTemplates} canAdd={canAddEntries} userId={user?.id} />
      <MedicationModal isOpen={modalType === 'medication'} onClose={() => setModalType(null)} onSuccess={() => { setModalType(null); selectedAttendanceId && getAttendance(selectedAttendanceId); }} attendanceId={selectedAttendanceId} stockItems={stockItems} canAdd={canAddEntries} userId={user?.id} />
      <ScanModal isOpen={modalType === 'scan'} onClose={() => setModalType(null)} onSuccess={() => { setModalType(null); selectedAttendanceId && getAttendance(selectedAttendanceId); }} attendanceId={selectedAttendanceId} scans={scanTemplates} canAdd={canAddEntries} userId={user?.id} />

      {/* ANC Booking Modal - Simple form */}
      {modalType === 'anc_booking' && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setModalType(null)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-[var(--bg-card)] rounded-xl shadow-xl max-w-md w-full border">
              <div className="px-6 py-4 border-b flex justify-between items-center">
                <h2 className="text-lg font-bold">Create Pregnancy Record</h2>
                <button onClick={() => setModalType(null)} className="p-1 hover:bg-[var(--bg-main)] rounded"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); handleCreateBooking({ gravida: (e.target as any).gravida.value, para: (e.target as any).para.value, lmp: (e.target as any).lmp.value }); }} className="p-6 space-y-4">
                <div><label className="block text-sm font-medium mb-1">Gravida (Number of pregnancies) *</label><input name="gravida" type="number" min="1" required className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">Para (Number of deliveries) *</label><input name="para" type="number" min="0" required className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">LMP (Last Menstrual Period)</label><input name="lmp" type="date" className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg" /></div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setModalType(null)} className="flex-1 px-4 py-2 border rounded-lg">Cancel</button>
                  <button type="submit" disabled={ancLoading} className="flex-1 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700">Create Record</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}