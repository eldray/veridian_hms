// src/pages/MedicalEntries.tsx - FULL MULTI-PANEL REDESIGN
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatientStore } from '../store/patientStore';
import { useAttendanceStore } from '../store/attendanceStore';
import { useMedicalServicesStore } from '../store/medicalServicesStore';
import { useStockStore } from '../store/stockStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import { PatientAttendanceSelector } from '../components/vitals/PatientAttendanceSelector';

// Modal Components
import { DiagnosisModal } from '../components/medical-entries/modals/DiagnosisModal';
import { LabTestModal } from '../components/medical-entries/modals/LabTestModal';
import { ProcedureModal } from '../components/medical-entries/modals/ProcedureModal';
import { MedicationModal } from '../components/medical-entries/modals/MedicationModal';
import { ScanModal } from '../components/medical-entries/modals/ScanModal';

import {
  ChevronLeft,
  RefreshCw,
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
  User,
  Calendar,
  DollarSign,
  Clock,
  Heart,
  Thermometer,
  Wind,
  Droplets,
  Gauge,
  Weight,
  Ruler,
  CheckCircle,
  XCircle,
  Printer,
  Download,
  Send,
  History,
  Eye,
  Edit,
} from 'lucide-react';

const getEntityId = (entity: { id?: string; _id?: string } | null): string | undefined => {
  return entity?._id || entity?.id;
};

type ModalType = 'diagnosis' | 'lab' | 'procedure' | 'medication' | 'scan' | null;

export default function MedicalEntries() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

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
    updateAttendance,
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
  const { user } = useAuthStore();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedAttendanceId, setSelectedAttendanceId] = useState<string>('');
  const [latestVitals, setLatestVitals] = useState<any>(null);

  // Clinical form state
  const [presentedComplaints, setPresentedComplaints] = useState('');
  const [hpc, setHpc] = useState('');
  const [odq, setOdq] = useState('');
  const [physicalExam, setPhysicalExam] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');

  // Modal state
  const [modalType, setModalType] = useState<ModalType>(null);

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
      success('Data loaded', 'Medical entries ready');
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
      getAttendance(selectedAttendanceId).then((att) => {
        if (att) {
          setPresentedComplaints(att.complaints || '');
          setHpc((att as any).historyPresentingComplaint || '');
          setOdq((att as any).onsetDurationQuality || '');
          setPhysicalExam((att as any).physicalExamination || '');
          setTreatmentPlan((att as any).treatmentPlan || '');
          setFollowUpDate((att as any).followUpDate ? new Date((att as any).followUpDate).toISOString().slice(0, 16) : '');
        }
      });
    }
  }, [selectedAttendanceId, getAttendance]);

  const selectedPatient = patients.find((p) => getEntityId(p) === selectedPatientId);
  const canAddEntries = currentAttendance ? canAddMedicalEntries(currentAttendance) : false;

  // Get all entries from current attendance
  const diagnosesList = currentAttendance?.AttendanceDiagnosis || [];
  const labTestsList = currentAttendance?.LabTest || [];
  const proceduresList = currentAttendance?.Procedure || [];
  const medicationsList = currentAttendance?.Medication || [];
  const scansList = currentAttendance?.Scan || [];

  // Separate prescribed vs dispensed medications
  const prescribedMeds = medicationsList.filter(m => m.status === 'prescribed');
  const dispensedMeds = medicationsList.filter(m => m.status === 'dispensed');

  const hasConsultationFee = diagnosesList.length > 0;

  const handleClearSelection = () => {
    setSelectedPatientId('');
    setSelectedAttendanceId('');
    setPresentedComplaints('');
    setHpc('');
    setOdq('');
    setPhysicalExam('');
    setTreatmentPlan('');
    setFollowUpDate('');
  };

  const handleRefresh = () => loadData();

  const handleSaveClinical = async () => {
    if (!selectedAttendanceId) return;
    try {
      await updateAttendance(selectedAttendanceId, {
        complaints: presentedComplaints,
        historyPresentingComplaint: hpc,
        onsetDurationQuality: odq,
        physicalExamination: physicalExam,
        treatmentPlan: treatmentPlan,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
      });
      success('Saved', 'Clinical information saved');
      await getAttendance(selectedAttendanceId);
    } catch (err: any) {
      toastError('Save failed', err.message);
    }
  };

  const handleDeleteItem = async (type: string, id: string) => {
    if (!selectedAttendanceId) return;
    try {
      switch (type) {
        case 'diagnosis':
          await removeDiagnosis(selectedAttendanceId, id);
          success('Deleted', 'Diagnosis removed');
          break;
        case 'lab':
          await removeLabTest(selectedAttendanceId, id);
          success('Deleted', 'Lab test removed');
          break;
        case 'procedure':
          await removeProcedure(selectedAttendanceId, id);
          success('Deleted', 'Procedure removed');
          break;
        case 'medication':
          await removeMedication(selectedAttendanceId, id);
          success('Deleted', 'Medication removed');
          break;
        case 'scan':
          await removeScan(selectedAttendanceId, id);
          success('Deleted', 'Scan removed');
          break;
      }
      await getAttendance(selectedAttendanceId);
      await calculateBill(selectedAttendanceId);
    } catch (err: any) {
      toastError('Delete failed', err.message);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; bg: string }> = {
      requested: { color: 'text-yellow-800', bg: 'bg-yellow-100' },
      scheduled: { color: 'text-blue-800', bg: 'bg-blue-100' },
      prescribed: { color: 'text-purple-800', bg: 'bg-purple-100' },
      dispensed: { color: 'text-green-800', bg: 'bg-green-100' },
      completed: { color: 'text-green-800', bg: 'bg-green-100' },
      cancelled: { color: 'text-red-800', bg: 'bg-red-100' },
      pending: { color: 'text-yellow-800', bg: 'bg-yellow-100' },
    };
    const c = config[status?.toLowerCase()] || { color: 'text-gray-800', bg: 'bg-gray-100' };
    return <span className={`px-2 py-0.5 text-xs rounded-full ${c.bg} ${c.color}`}>{status}</span>;
  };

  const getVitalStatusColor = (type: string, value: any) => {
    if (!value) return 'text-gray-400';
    switch (type) {
      case 'bp':
        const [sys, dia] = String(value).split('/').map(Number);
        if (sys > 140 || dia > 90) return 'text-red-600';
        if (sys < 90 || dia < 60) return 'text-yellow-600';
        return 'text-green-600';
      case 'temp':
        if (value > 38) return 'text-red-600';
        if (value < 35) return 'text-yellow-600';
        return 'text-green-600';
      case 'pulse':
        if (value > 100 || value < 60) return 'text-red-600';
        return 'text-green-600';
      case 'spo2':
        if (value < 95) return 'text-red-600';
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
        <div className="text-center bg-[var(--bg-card)] p-8 rounded-xl shadow-sm border border-[var(--border-color)]">
          <div className="w-14 h-14 border-4 border-[var(--icon-cyan-text)] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Loading Medical Entries...</h2>
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
          <div className="w-10 h-10 bg-[var(--icon-purple-bg)] rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-[var(--icon-purple-text)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Medical Entries</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">Complete clinical documentation</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all text-sm"
          >
            <Printer className="w-4 h-4" />
            Print
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
      />

      {/* Only show content if attendance is selected */}
      {selectedAttendanceId && currentAttendance ? (
        <>
          {/* PATIENT HEADER with badges */}
          <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[var(--icon-cyan-bg)] rounded-xl flex items-center justify-center">
                  <User className="w-6 h-6 text-[var(--icon-cyan-text)]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">
                    {selectedPatient?.surname} {selectedPatient?.otherNames}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)] mt-1">
                    <span>{selectedPatient?.age || 'N/A'} years • {selectedPatient?.gender}</span>
                    <span>•</span>
                    <span>ID: {selectedPatient?.folderNumber}</span>
                    <span>•</span>
                    <span>{selectedPatient?.contact}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  currentAttendance.paymentMode === 'nhis' 
                    ? 'bg-green-100 text-green-800 border border-green-200' 
                    : currentAttendance.paymentMode === 'private_insurance'
                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                    : 'bg-blue-100 text-blue-800 border border-blue-200'
                }`}>
                  {currentAttendance.paymentMode === 'nhis' ? 'NHIS' : 
                   currentAttendance.paymentMode === 'private_insurance' ? 'PRIVATE INS' : 'CASH'}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  currentAttendance.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  currentAttendance.status === 'completed' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {currentAttendance.status?.toUpperCase()}
                </span>
                {currentAttendance.outstandingBalance > 0 && (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                    Balance: GHS {currentAttendance.outstandingBalance.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* VITALS STRIP - 9 columns */}
          {latestVitals && (
            <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-9 gap-3">
                <div className="text-center">
                  <Gauge className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                  <div className={`text-sm font-bold ${getVitalStatusColor('bp', latestVitals.bloodPressure)}`}>
                    {latestVitals.bloodPressure || '—'}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">BP (mmHg)</div>
                </div>
                <div className="text-center">
                  <Thermometer className="w-4 h-4 text-red-500 mx-auto mb-1" />
                  <div className={`text-sm font-bold ${getVitalStatusColor('temp', latestVitals.temperature)}`}>
                    {latestVitals.temperature ? `${latestVitals.temperature}°C` : '—'}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">Temp</div>
                </div>
                <div className="text-center">
                  <Heart className="w-4 h-4 text-red-500 mx-auto mb-1" />
                  <div className={`text-sm font-bold ${getVitalStatusColor('pulse', latestVitals.pulse)}`}>
                    {latestVitals.pulse || '—'}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">Pulse (bpm)</div>
                </div>
                <div className="text-center">
                  <Wind className="w-4 h-4 text-teal-500 mx-auto mb-1" />
                  <div className="text-sm font-bold">{latestVitals.respiration || '—'}</div>
                  <div className="text-xs text-[var(--text-secondary)]">Resp (bpm)</div>
                </div>
                <div className="text-center">
                  <Droplets className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                  <div className={`text-sm font-bold ${getVitalStatusColor('spo2', latestVitals.spo2)}`}>
                    {latestVitals.spo2 ? `${latestVitals.spo2}%` : '—'}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">SpO2 (%)</div>
                </div>
                <div className="text-center">
                  <Weight className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                  <div className="text-sm font-bold">{latestVitals.weight ? `${latestVitals.weight}kg` : '—'}</div>
                  <div className="text-xs text-[var(--text-secondary)]">Weight</div>
                </div>
                <div className="text-center">
                  <Ruler className="w-4 h-4 text-cyan-500 mx-auto mb-1" />
                  <div className="text-sm font-bold">{latestVitals.height ? `${latestVitals.height}cm` : '—'}</div>
                  <div className="text-xs text-[var(--text-secondary)]">Height</div>
                </div>
                <div className="text-center">
                  <Activity className="w-4 h-4 text-purple-500 mx-auto mb-1" />
                  <div className="text-sm font-bold">{latestVitals.bmi || '—'}</div>
                  <div className="text-xs text-[var(--text-secondary)]">BMI</div>
                </div>
                <div className="text-center">
                  <Activity className="w-4 h-4 text-indigo-500 mx-auto mb-1" />
                  <div className="text-sm font-bold">{latestVitals.muac || '—'}</div>
                  <div className="text-xs text-[var(--text-secondary)]">MUAC (cm)</div>
                </div>
              </div>
            </div>
          )}

          {/* ROW 1: CLINICAL PRESENTATION - 4 columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
              <label className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                Presented Complaints
              </label>
              <textarea
                value={presentedComplaints}
                onChange={(e) => setPresentedComplaints(e.target.value)}
                rows={4}
                placeholder="Patient's main complaint..."
                className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] text-sm"
                disabled={!canAddEntries}
              />
            </div>
            <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
              <label className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-2">
                <History className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                H.P.C (History)
              </label>
              <textarea
                value={hpc}
                onChange={(e) => setHpc(e.target.value)}
                rows={4}
                placeholder="History of presenting complaint..."
                className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] text-sm"
                disabled={!canAddEntries}
              />
            </div>
            <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
              <label className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                O.D.Q (Onset/Duration/Quality)
              </label>
              <textarea
                value={odq}
                onChange={(e) => setOdq(e.target.value)}
                rows={4}
                placeholder="Onset, duration, quality of symptoms..."
                className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] text-sm"
                disabled={!canAddEntries}
              />
            </div>
            <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
              <label className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-2">
                <Stethoscope className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                Physical Examination
              </label>
              <textarea
                value={physicalExam}
                onChange={(e) => setPhysicalExam(e.target.value)}
                rows={4}
                placeholder="Physical examination findings..."
                className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] text-sm"
                disabled={!canAddEntries}
              />
            </div>
          </div>

          {/* Save Clinical Button */}
          {canAddEntries && (
            <div className="flex justify-end">
              <button
                onClick={handleSaveClinical}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium"
              >
                <CheckCircle className="w-4 h-4" />
                Save Clinical Information
              </button>
            </div>
          )}

          {/* ROW 2: INVESTIGATIONS & RESULTS - 2 columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* INVESTIGATIONS REQUESTED */}
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
              <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)] flex items-center justify-between">
                <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-purple-600" />
                  Investigations Requested
                </h3>
                {canAddEntries && (
                  <button
                    onClick={() => setModalType('lab')}
                    className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs hover:bg-purple-700 hover:text-white"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                )}
              </div>
              <div className="divide-y divide-[var(--border-color)] max-h-[400px] overflow-y-auto">
                {labTestsList.length === 0 && (
                  <div className="p-4 text-center text-[var(--text-secondary)] text-sm">No lab tests requested</div>
                )}
                {labTestsList.map((test: any) => (
                  <div key={test.id} className="p-3 hover:bg-[var(--bg-main)]">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-sm">{test.ServiceCatalog?.name || test.name}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-[var(--text-secondary)]">Priority: {test.priority}</span>
                          {getStatusBadge(test.status)}
                        </div>
                      </div>
                      {canAddEntries && test.status === 'requested' && (
                        <button onClick={() => handleDeleteItem('lab', test.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RESULTS OF INVESTIGATIONS */}
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
              <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)]">
                <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Results of Investigations
                </h3>
              </div>
              <div className="divide-y divide-[var(--border-color)] max-h-[400px] overflow-y-auto">
                {labTestsList.filter(t => t.status === 'completed').length === 0 && (
                  <div className="p-4 text-center text-[var(--text-secondary)] text-sm">No results available yet</div>
                )}
                {labTestsList.filter(t => t.status === 'completed').map((test: any) => (
                  <div key={test.id} className="p-3 hover:bg-[var(--bg-main)]">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium text-sm">{test.ServiceCatalog?.name || test.name}</span>
                        {test.result && (
                          <div className="text-sm mt-1">
                            <span className={test.result?.abnormal ? 'text-red-600 font-medium' : 'text-green-600'}>
                              Result: {typeof test.result === 'object' ? JSON.stringify(test.result) : test.result}
                            </span>
                            {test.normalRange && <span className="text-xs text-[var(--text-secondary)] ml-2">(Normal: {test.normalRange})</span>}
                          </div>
                        )}
                        <div className="text-xs text-[var(--text-secondary)] mt-1">Completed: {new Date(test.completedAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ROW 3: DIAGNOSIS & PROCEDURES - 2 columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* DIAGNOSIS LIST */}
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
              <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)] flex items-center justify-between">
                <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                  Diagnosis (ICD-10)
                </h3>
                {canAddEntries && (
                  <button
                    onClick={() => setModalType('diagnosis')}
                    className="flex items-center gap-1 px-2 py-1 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded text-xs hover:bg-[var(--icon-cyan-text)] hover:text-white"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                )}
              </div>
              <div className="divide-y divide-[var(--border-color)] max-h-[300px] overflow-y-auto">
                {diagnosesList.length === 0 && (
                  <div className="p-4 text-center text-[var(--text-secondary)] text-sm">No diagnoses added</div>
                )}
                {diagnosesList.map((item: any) => (
                  <div key={item.id} className="p-3 hover:bg-[var(--bg-main)]">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{item.Diagnosis?.name}</span>
                          {item.primary && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Primary</span>}
                        </div>
                        <div className="text-xs text-[var(--text-secondary)] mt-1">ICD-10: {item.Diagnosis?.icdCode}</div>
                        {item.notes && <div className="text-xs text-[var(--text-secondary)] mt-1">{item.notes}</div>}
                      </div>
                      {canAddEntries && (
                        <button onClick={() => handleDeleteItem('diagnosis', item.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* PROCEDURES & SCHEDULING */}
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
              <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)] flex items-center justify-between">
                <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-orange-600" />
                  Procedures & Scheduling
                </h3>
                {canAddEntries && (
                  <button
                    onClick={() => setModalType('procedure')}
                    className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs hover:bg-orange-700 hover:text-white"
                  >
                    <Plus className="w-3 h-3" /> Schedule
                  </button>
                )}
              </div>
              <div className="divide-y divide-[var(--border-color)] max-h-[300px] overflow-y-auto">
                {proceduresList.length === 0 && (
                  <div className="p-4 text-center text-[var(--text-secondary)] text-sm">No procedures scheduled</div>
                )}
                {proceduresList.map((proc: any) => (
                  <div key={proc.id} className="p-3 hover:bg-[var(--bg-main)]">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-medium text-sm">{proc.ServiceCatalog?.name || proc.name}</span>
                        <div className="flex items-center gap-2 mt-1">
                          {proc.scheduledDate && (
                            <span className="text-xs text-[var(--text-secondary)]">
                              Scheduled: {new Date(proc.scheduledDate).toLocaleString()}
                            </span>
                          )}
                          {getStatusBadge(proc.status)}
                        </div>
                        {proc.notes && <div className="text-xs text-[var(--text-secondary)] mt-1">{proc.notes}</div>}
                      </div>
                      {canAddEntries && proc.status === 'scheduled' && (
                        <button onClick={() => handleDeleteItem('procedure', proc.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ROW 4: MEDICATIONS - 2 columns (Requested vs Issued) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ITEMS REQUESTED (Prescribed) */}
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
              <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)] flex items-center justify-between">
                <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Pill className="w-4 h-4 text-green-600" />
                  Items Requested (Prescribed)
                </h3>
                {canAddEntries && (
                  <button
                    onClick={() => setModalType('medication')}
                    className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-700 hover:text-white"
                  >
                    <Plus className="w-3 h-3" /> Prescribe
                  </button>
                )}
              </div>
              <div className="divide-y divide-[var(--border-color)] max-h-[350px] overflow-y-auto">
                {prescribedMeds.length === 0 && (
                  <div className="p-4 text-center text-[var(--text-secondary)] text-sm">No medications prescribed</div>
                )}
                {prescribedMeds.map((med: any) => (
                  <div key={med.id} className="p-3 hover:bg-[var(--bg-main)]">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{med.name}</span>
                          <span className="text-xs text-[var(--text-secondary)]">{med.dosage}</span>
                          <span className="text-xs text-[var(--text-secondary)]">{med.frequency}</span>
                        </div>
                        <div className="text-xs text-[var(--text-secondary)] mt-1">
                          Duration: {med.duration} • Qty: {med.quantity}
                        </div>
                        {med.instructions && <div className="text-xs text-[var(--text-secondary)] mt-1">{med.instructions}</div>}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] bg-purple-100 text-purple-700 rounded">
                            Payer: {med.paymentMode === 'nhis' ? 'A' : med.paymentMode === 'private_insurance' ? 'P' : 'C'}
                          </span>
                          {getStatusBadge(med.status)}
                        </div>
                      </div>
                      {canAddEntries && (
                        <button onClick={() => handleDeleteItem('medication', med.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ITEMS ISSUED (Dispensed) */}
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
              <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)]">
                <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  Items Issued (Dispensed)
                </h3>
              </div>
              <div className="divide-y divide-[var(--border-color)] max-h-[350px] overflow-y-auto">
                {dispensedMeds.length === 0 && (
                  <div className="p-4 text-center text-[var(--text-secondary)] text-sm">No medications dispensed yet</div>
                )}
                {dispensedMeds.map((med: any) => (
                  <div key={med.id} className="p-3 hover:bg-[var(--bg-main)]">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{med.name}</span>
                          <span className="text-xs text-[var(--text-secondary)]">{med.dosage}</span>
                          <span className="text-xs text-[var(--text-secondary)]">{med.frequency}</span>
                        </div>
                        <div className="text-xs text-[var(--text-secondary)] mt-1">
                          Qty: {med.quantity} • Rate: GHS {(med.unitCost || 0).toFixed(2)} • Total: GHS {((med.unitCost || 0) * med.quantity).toFixed(2)}
                        </div>
                        {med.dispensedAt && (
                          <div className="text-xs text-[var(--text-secondary)] mt-1">Dispensed: {new Date(med.dispensedAt).toLocaleString()}</div>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] bg-purple-100 text-purple-700 rounded">
                            Payer: {med.paymentMode === 'nhis' ? 'A' : med.paymentMode === 'private_insurance' ? 'P' : 'C'}
                          </span>
                          {getStatusBadge(med.status)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ROW 5: PHYSICIAN NOTES & TREATMENT PLAN */}
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)]">
            <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)]">
              <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                Physician Notes & Treatment Plan
              </h3>
            </div>
            <div className="p-4">
              <textarea
                value={treatmentPlan}
                onChange={(e) => setTreatmentPlan(e.target.value)}
                rows={4}
                placeholder="Treatment plan, follow-up instructions, medications to continue, lifestyle modifications..."
                className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] text-sm"
                disabled={!canAddEntries}
              />
              {canAddEntries && (
                <div className="flex justify-end mt-3">
                  <button
                    onClick={handleSaveClinical}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Save Treatment Plan
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ROW 6: GENERAL INFO */}
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)]">
            <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)]">
              <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                General Information
              </h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">Follow-up Date</label>
                  <input
                    type="datetime-local"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm"
                    disabled={!canAddEntries}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">Referred To/From</label>
                  <input
                    type="text"
                    value={currentAttendance?.referringFacility || ''}
                    readOnly
                    className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-secondary)]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">Admission Status</label>
                  <div className="px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm">
                    {currentAttendance?.Admission ? `Admitted (${currentAttendance.Admission.admissionNumber})` : 'Not Admitted'}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">Created By</label>
                  <div className="px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm">
                    {currentAttendance?.createdBy?.fullName || 'Unknown'} • {new Date(currentAttendance?.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : selectedPatientId && !selectedAttendanceId ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">No Attendance Selected</h3>
          <p className="text-yellow-700">Please select an existing attendance to view or add medical entries.</p>
        </div>
      ) : null}

      {/* Modals */}
      <DiagnosisModal
        isOpen={modalType === 'diagnosis'}
        onClose={() => setModalType(null)}
        onSuccess={() => {
          setModalType(null);
          if (selectedAttendanceId) {
            getAttendance(selectedAttendanceId);
            calculateBill(selectedAttendanceId);
          }
        }}
        attendanceId={selectedAttendanceId}
        diagnoses={diagnoses}
        canAdd={canAddEntries}
        userId={user?.id}
      />

      <LabTestModal
        isOpen={modalType === 'lab'}
        onClose={() => setModalType(null)}
        onSuccess={() => {
          setModalType(null);
          if (selectedAttendanceId) {
            getAttendance(selectedAttendanceId);
            calculateBill(selectedAttendanceId);
          }
        }}
        attendanceId={selectedAttendanceId}
        labTests={labTestTemplates}
        canAdd={canAddEntries}
        userId={user?.id}
      />

      <ProcedureModal
        isOpen={modalType === 'procedure'}
        onClose={() => setModalType(null)}
        onSuccess={() => {
          setModalType(null);
          if (selectedAttendanceId) {
            getAttendance(selectedAttendanceId);
            calculateBill(selectedAttendanceId);
          }
        }}
        attendanceId={selectedAttendanceId}
        procedures={procedureTemplates}
        canAdd={canAddEntries}
        userId={user?.id}
      />

      <MedicationModal
        isOpen={modalType === 'medication'}
        onClose={() => setModalType(null)}
        onSuccess={() => {
          setModalType(null);
          if (selectedAttendanceId) {
            getAttendance(selectedAttendanceId);
            calculateBill(selectedAttendanceId);
          }
        }}
        attendanceId={selectedAttendanceId}
        stockItems={stockItems}
        canAdd={canAddEntries}
        userId={user?.id}
      />

      <ScanModal
        isOpen={modalType === 'scan'}
        onClose={() => setModalType(null)}
        onSuccess={() => {
          setModalType(null);
          if (selectedAttendanceId) {
            getAttendance(selectedAttendanceId);
            calculateBill(selectedAttendanceId);
          }
        }}
        attendanceId={selectedAttendanceId}
        scans={scanTemplates}
        canAdd={canAddEntries}
        userId={user?.id}
      />
    </div>
  );
}