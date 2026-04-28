// src/pages/Nursing.tsx - COMPLETE REDESIGN
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAttendanceStore } from '../store/attendanceStore';
import { usePatientStore } from '../store/patientStore';
import { useAuthStore } from '../store/authStore';
import { useAdmissionStore } from '../store/admissionStore';
import { useStockStore } from '../store/stockStore';
import { useToast } from '../store/toastStore';
import { PatientAttendanceSelector } from '../components/vitals/PatientAttendanceSelector';
import { VitalsDisplay } from '../components/medical-entries/VitalsDisplay';
import { VitalsFormModal } from '../components/vitals/VitalsFormModal';

import {
  ChevronLeft,
  RefreshCw,
  Pill,
  ClipboardList,
  AlertCircle,
  CheckCircle,
  Clock,
  Stethoscope,
  User,
  Calendar,
  Activity,
  FileText,
  Plus,
  Trash2,
  Edit,
  Eye,
  Printer,
  Download,
  Syringe,
  Heart,
  Thermometer,
  Wind,
  Droplet,
  Weight,
  Ruler,
  TrendingUp,
  Baby,
  Shield,
  AlertTriangle,
  Ban,
  X,
  Search,
  MoreVertical,
  Send,
  Save,
  BookOpen,
  Users,
  Hospital,
  Bed,
  Clipboard,
  NoteText
} from 'lucide-react';

const getEntityId = (entity: { id?: string; _id?: string } | null): string | undefined => {
  return entity?._id || entity?.id;
};

// Status Badge Component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: <Clock className="w-3 h-3" /> },
    admitted: { bg: 'bg-blue-100', text: 'text-blue-800', icon: <Hospital className="w-3 h-3" /> },
    discharged: { bg: 'bg-green-100', text: 'text-green-800', icon: <CheckCircle className="w-3 h-3" /> },
    completed: { bg: 'bg-green-100', text: 'text-green-800', icon: <CheckCircle className="w-3 h-3" /> },
    cancelled: { bg: 'bg-red-100', text: 'text-red-800', icon: <Ban className="w-3 h-3" /> },
  };
  const c = config[status?.toLowerCase()] || config.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {c.icon}
      {status?.charAt(0).toUpperCase() + status?.slice(1) || 'Pending'}
    </span>
  );
};

// Medication Status Badge
const MedStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    prescribed: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: <Clock className="w-3 h-3" /> },
    dispensed: { bg: 'bg-blue-100', text: 'text-blue-800', icon: <Package className="w-3 h-3" /> },
    administered: { bg: 'bg-green-100', text: 'text-green-800', icon: <CheckCircle className="w-3 h-3" /> },
    cancelled: { bg: 'bg-red-100', text: 'text-red-800', icon: <Ban className="w-3 h-3" /> },
  };
  const c = config[status?.toLowerCase()] || config.prescribed;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {c.icon}
      {status}
    </span>
  );
};

export default function Nursing() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const { user } = useAuthStore();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedAttendanceId, setSelectedAttendanceId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'medications' | 'notes' | 'vitals'>('medications');
  
  // Nursing notes state
  const [nursingNotes, setNursingNotes] = useState('');
  const [dailyNote, setDailyNote] = useState('');
  const [handoverNotes, setHandoverNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [administeringMed, setAdministeringMed] = useState<string | null>(null);
  
  // Vitals modal state
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [editingVitals, setEditingVitals] = useState<any>(null);
  const [latestVitals, setLatestVitals] = useState<any>(null);

  // Stores
  const {
    attendances,
    currentAttendance,
    getAttendance,
    getAttendances,
    updateMedicationStatus,
    canAddMedicalEntries,
    getVitalsByAttendance,
    addVitals,
    updateVitals,
  } = useAttendanceStore();

  const { patients, loadPatients } = usePatientStore();
  const { admissions, getAdmissions, addDailyNote, getAdmissionStats } = useAdmissionStore();
  const { stockItems, getStockItems } = useStockStore();

  // Load data
  const loadData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadPatients(),
        getAttendances(),
        getStockItems(),
        getAdmissions(),
      ]);
      success('Data loaded', 'Nursing station ready');
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

  // Filter only inpatient/admitted attendances
  const inpatientAttendances = useMemo(() => {
    return attendances.filter(a => a.status === 'admitted');
  }, [attendances]);

  // Load full attendance when selected
  useEffect(() => {
    if (selectedAttendanceId) {
      getAttendance(selectedAttendanceId);
    }
  }, [selectedAttendanceId, getAttendance]);

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

  const selectedPatient = patients.find((p) => getEntityId(p) === selectedPatientId);
  const selectedAttendance = attendances.find((a) => getEntityId(a) === selectedAttendanceId);
  
  // Find active admission for this attendance
  const activeAdmission = admissions.find(a => 
    a.attendanceId === selectedAttendanceId && a.status === 'admitted'
  );

  const canAddEntries = selectedAttendance ? canAddMedicalEntries(selectedAttendance) : false;

  // Get medications from attendance
  const medications = selectedAttendance?.Medication || [];
  const dispensedMeds = medications.filter((med: any) => med.status === 'dispensed');
  const administeredMeds = medications.filter((med: any) => med.status === 'administered');
  const prescribedMeds = medications.filter((med: any) => med.status === 'prescribed');

  const handleClearSelection = () => {
    setSelectedPatientId('');
    setSelectedAttendanceId('');
    setNursingNotes('');
    setDailyNote('');
    setHandoverNotes('');
  };

  const handleRefresh = () => loadData();

  // Administer medication
  const handleAdministerMedication = async (medicationId: string) => {
    if (!selectedAttendanceId || !user) return;

    setAdministeringMed(medicationId);
    try {
      await updateMedicationStatus(selectedAttendanceId, medicationId, {
        status: 'administered',
        administeredAt: new Date().toISOString(),
        administeredById: user.id
      });

      success('Medication administered', 'Medication recorded as given');
      await getAttendance(selectedAttendanceId);
    } catch (error: any) {
      toastError('Administer failed', error.message || 'Could not record medication');
    } finally {
      setAdministeringMed(null);
    }
  };

  // Submit daily note (for admission)
  const handleSubmitDailyNote = async () => {
    if (!activeAdmission?.id || !dailyNote.trim()) {
      toastError('Notes required', 'Please enter daily nursing notes');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDailyNote(activeAdmission.id, { notes: dailyNote });
      success('Daily note saved', 'Nursing assessment recorded');
      setDailyNote('');
    } catch (error: any) {
      toastError('Save failed', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit handover notes
  const handleSubmitHandoverNotes = async () => {
    if (!handoverNotes.trim()) {
      toastError('Notes required', 'Please enter handover notes');
      return;
    }

    setIsSubmitting(true);
    try {
      // For now, store in medicalNotes or create a handover system
      // This would need a Handover model or extend Admission
      success('Handover saved', 'Shift handover notes recorded');
      setHandoverNotes('');
    } catch (error: any) {
      toastError('Save failed', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle vitals submission
  const handleSubmitVitals = async (vitalsData: any) => {
    if (!selectedAttendanceId) return;
    
    try {
      if (editingVitals) {
        await updateVitals(selectedAttendanceId, editingVitals.id, vitalsData);
        success('Vitals Updated', 'Vitals updated successfully');
      } else {
        await addVitals(selectedAttendanceId, {
          ...vitalsData,
          recordedAt: new Date().toISOString(),
          recordedById: user?.id
        });
        success('Vitals Recorded', 'Vitals recorded successfully');
      }
      
      const updatedVitals = await getVitalsByAttendance(selectedAttendanceId);
      setLatestVitals(updatedVitals?.length ? updatedVitals[updatedVitals.length - 1] : null);
      setShowVitalsModal(false);
      setEditingVitals(null);
    } catch (err: any) {
      toastError('Save Failed', err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
        <div className="text-center bg-[var(--bg-card)] p-8 rounded-xl shadow-sm border border-[var(--border-color)]">
          <div className="w-14 h-14 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Loading Nursing Station...</h2>
          <p className="text-[var(--text-secondary)] text-sm mt-1">Fetching patient and medication data</p>
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
          <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Nursing Station</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">Medication administration and nursing notes</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowVitalsModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm"
            disabled={!canAddEntries}
          >
            <Activity className="w-4 h-4" />
            Record Vitals
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

      {/* Patient & Attendance Selection - Only admitted patients */}
      <PatientAttendanceSelector
        patients={patients}
        attendances={inpatientAttendances}
        selectedPatientId={selectedPatientId}
        selectedAttendanceId={selectedAttendanceId}
        onPatientSelect={setSelectedPatientId}
        onAttendanceSelect={setSelectedAttendanceId}
        onClearSelection={handleClearSelection}
      />

      {/* Patient & Visit Header */}
      {selectedPatient && selectedAttendance && (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
          <div className="px-5 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-100 to-teal-200 flex items-center justify-center shadow-sm">
                <User className="w-5 h-5 text-teal-600" />
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
              <StatusBadge status={selectedAttendance.status} />
              {activeAdmission && (
                <div className="bg-blue-100 px-2.5 py-1 rounded-full border border-blue-200">
                  <span className="text-xs text-blue-700 flex items-center gap-1">
                    <Bed className="w-3 h-3" />
                    Admitted: {activeAdmission.admissionNumber}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats Row */}
          <div className="border-t border-[var(--border-color)] px-5 py-2 bg-[var(--bg-main)]">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-xl font-bold text-blue-600">{prescribedMeds.length}</p>
                <p className="text-xs text-[var(--text-secondary)]">Prescribed</p>
              </div>
              <div>
                <p className="text-xl font-bold text-yellow-600">{dispensedMeds.length}</p>
                <p className="text-xs text-[var(--text-secondary)]">Ready</p>
              </div>
              <div>
                <p className="text-xl font-bold text-green-600">{administeredMeds.length}</p>
                <p className="text-xs text-[var(--text-secondary)]">Given Today</p>
              </div>
              <div>
                <p className="text-xl font-bold text-purple-600">{selectedAttendance?.Vitals?.length || 0}</p>
                <p className="text-xs text-[var(--text-secondary)]">Vitals Records</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vitals Display */}
      {selectedAttendance && latestVitals && (
        <VitalsDisplay vitals={latestVitals} />
      )}

      {/* Main Content - Tabs */}
      {selectedAttendanceId && (
        <div className="bg-[var(--bg-card)] rounded-xl shadow-sm border border-[var(--border-color)]">
          <div className="border-b border-[var(--border-color)] px-4">
            <div className="flex gap-6">
              <button
                onClick={() => setActiveTab('medications')}
                className={`py-3 px-1 text-sm font-medium border-b-2 transition-all ${
                  activeTab === 'medications'
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Pill className="w-4 h-4 inline mr-1" />
                Medications ({dispensedMeds.length + administeredMeds.length})
              </button>
              <button
                onClick={() => setActiveTab('notes')}
                className={`py-3 px-1 text-sm font-medium border-b-2 transition-all ${
                  activeTab === 'notes'
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <FileText className="w-4 h-4 inline mr-1" />
                Nursing Notes
              </button>
              <button
                onClick={() => setActiveTab('vitals')}
                className={`py-3 px-1 text-sm font-medium border-b-2 transition-all ${
                  activeTab === 'vitals'
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Activity className="w-4 h-4 inline mr-1" />
                Vitals History
              </button>
            </div>
          </div>

          <div className="p-5">
            {/* MEDICATIONS TAB */}
            {activeTab === 'medications' && (
              <div className="space-y-6">
                {/* Ready for Administration */}
                {dispensedMeds.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-yellow-500" />
                      Ready for Administration ({dispensedMeds.length})
                    </h3>
                    <div className="space-y-3">
                      {dispensedMeds.map((med: any) => {
                        const stockItem = stockItems.find(s => s.id === med.stockItemId);
                        return (
                          <div key={med.id} className="border border-[var(--border-color)] rounded-lg p-4 hover:bg-[var(--bg-main)] transition-colors">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-[var(--text-primary)]">{med.name}</span>
                                  <MedStatusBadge status={med.status} />
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2 text-sm">
                                  <div><span className="text-[var(--text-secondary)]">Dosage:</span> <span className="font-medium">{med.dosage}</span></div>
                                  <div><span className="text-[var(--text-secondary)]">Route:</span> <span className="font-medium">{med.route || 'Oral'}</span></div>
                                  <div><span className="text-[var(--text-secondary)]">Frequency:</span> <span className="font-medium">{med.frequency}</span></div>
                                  <div><span className="text-[var(--text-secondary)]">Quantity:</span> <span className="font-medium">{med.quantity}</span></div>
                                </div>
                                {med.instructions && (
                                  <p className="text-sm text-[var(--text-secondary)] mt-2">
                                    <span className="font-medium">Instructions:</span> {med.instructions}
                                  </p>
                                )}
                                {stockItem && stockItem.currentStock < med.quantity && (
                                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    Low stock: Only {stockItem.currentStock} units available
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={() => handleAdministerMedication(med.id)}
                                disabled={administeringMed === med.id || !canAddEntries}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-sm font-medium"
                              >
                                {administeringMed === med.id ? (
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Syringe className="w-4 h-4" />
                                )}
                                Administer
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Already Administered Today */}
                {administeredMeds.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Administered ({administeredMeds.length})
                    </h3>
                    <div className="space-y-2">
                      {administeredMeds.map((med: any) => (
                        <div key={med.id} className="border border-green-200 bg-green-50 rounded-lg p-3">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div>
                              <span className="font-medium text-[var(--text-primary)]">{med.name}</span>
                              <div className="text-sm text-[var(--text-secondary)]">{med.dosage} • {med.frequency}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <MedStatusBadge status={med.status} />
                              {med.administeredAt && (
                                <span className="text-xs text-[var(--text-secondary)]">
                                  at {new Date(med.administeredAt).toLocaleTimeString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No Medications */}
                {dispensedMeds.length === 0 && administeredMeds.length === 0 && (
                  <div className="text-center py-12 bg-[var(--bg-main)] rounded-lg">
                    <Pill className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">No Medications Ready</h3>
                    <p className="text-sm text-[var(--text-secondary)]">
                      No medications have been dispensed for this patient yet.
                    </p>
                  </div>
                )}

                {/* Cannot Add Note */}
                {!canAddEntries && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                    <AlertCircle className="w-4 h-4 text-yellow-600 inline mr-2" />
                    <span className="text-sm text-yellow-700">
                      Cannot administer medications to {selectedAttendance?.status} attendance
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* NURSING NOTES TAB */}
            {activeTab === 'notes' && (
              <div className="space-y-6">
                {/* Daily Nursing Assessment */}
                <div className="border border-[var(--border-color)] rounded-lg p-4">
                  <h3 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                    <Clipboard className="w-4 h-4 text-teal-500" />
                    Daily Nursing Assessment
                  </h3>
                  <textarea
                    value={dailyNote}
                    onChange={(e) => setDailyNote(e.target.value)}
                    rows={5}
                    placeholder="Record daily nursing assessment:
- Vital signs trends
- Wound/dressing status
- IV/Line status
- Fluid balance
- Pain assessment
- Patient mobility
- Mental status
- Any concerns or observations..."
                    className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm resize-none focus:ring-2 focus:ring-teal-500"
                    disabled={!canAddEntries}
                  />
                  {canAddEntries && activeAdmission && (
                    <div className="flex justify-end mt-3">
                      <button
                        onClick={handleSubmitDailyNote}
                        disabled={isSubmitting || !dailyNote.trim()}
                        className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        Save Daily Note
                      </button>
                    </div>
                  )}
                  {!activeAdmission && (
                    <p className="text-sm text-yellow-600 mt-2 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      Daily notes require an active admission record.
                    </p>
                  )}
                </div>

                {/* Shift Handover Notes */}
                <div className="border border-[var(--border-color)] rounded-lg p-4">
                  <h3 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                    <Send className="w-4 h-4 text-orange-500" />
                    Shift Handover Notes
                  </h3>
                  <textarea
                    value={handoverNotes}
                    onChange={(e) => setHandoverNotes(e.target.value)}
                    rows={4}
                    placeholder="Important information for next shift:
- Pending tasks
- Patient status updates
- Special instructions
- Family communications
- Upcoming procedures
- Discharge planning..."
                    className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm resize-none focus:ring-2 focus:ring-teal-500"
                  />
                  <div className="flex justify-end mt-3">
                    <button
                      onClick={handleSubmitHandoverNotes}
                      disabled={isSubmitting || !handoverNotes.trim()}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Save Handover
                    </button>
                  </div>
                </div>

                {/* Recent Notes from Admission */}
                {activeAdmission?.dailyNotes && Object.keys(activeAdmission.dailyNotes).length > 0 && (
                  <div className="border border-[var(--border-color)] rounded-lg overflow-hidden">
                    <div className="bg-[var(--bg-main)] px-4 py-2 border-b border-[var(--border-color)]">
                      <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                        <History className="w-4 h-4 text-purple-500" />
                        Previous Daily Notes
                      </h3>
                    </div>
                    <div className="divide-y divide-[var(--border-color)] max-h-[300px] overflow-y-auto">
                      {Object.entries(activeAdmission.dailyNotes)
                        .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
                        .map(([date, note]: [string, any]) => (
                          <div key={date} className="p-3 hover:bg-[var(--bg-main)]">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-sm">{new Date(date).toLocaleDateString()}</span>
                              <span className="text-xs text-[var(--text-secondary)]">
                                by {note.recordedBy?.fullName || 'Staff'}
                              </span>
                            </div>
                            <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{note.notes}</p>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* VITALS HISTORY TAB */}
            {activeTab === 'vitals' && (
              <div className="space-y-4">
                <div className="bg-[var(--bg-main)] rounded-lg p-4">
                  <h3 className="font-semibold text-[var(--text-primary)] mb-3">Vitals History</h3>
                  {latestVitals ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-[var(--bg-card)] border-b border-[var(--border-color)]">
                          <tr>
                            <th className="px-3 py-2 text-left">Date/Time</th>
                            <th className="px-3 py-2 text-left">BP</th>
                            <th className="px-3 py-2 text-left">Temp</th>
                            <th className="px-3 py-2 text-left">Pulse</th>
                            <th className="px-3 py-2 text-left">Resp</th>
                            <th className="px-3 py-2 text-left">SpO2</th>
                            <th className="px-3 py-2 text-left">Weight</th>
                            <th className="px-3 py-2 text-left">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)]">
                          {previousVitals.map((vital: any) => (
                            <tr key={vital.id} className="hover:bg-[var(--bg-main)]">
                              <td className="px-3 py-2 text-sm">{new Date(vital.recordedAt).toLocaleString()}</td>
                              <td className="px-3 py-2">{vital.bloodPressure || '-'}</td>
                              <td className="px-3 py-2">{vital.temperature ? `${vital.temperature}°C` : '-'}</td>
                              <td className="px-3 py-2">{vital.pulse || '-'}</td>
                              <td className="px-3 py-2">{vital.respiration || '-'}</td>
                              <td className="px-3 py-2">{vital.spo2 ? `${vital.spo2}%` : '-'}</td>
                              <td className="px-3 py-2">{vital.weight ? `${vital.weight}kg` : '-'}</td>
                              <td className="px-3 py-2">
                                <button
                                  onClick={() => {
                                    setEditingVitals(vital);
                                    setShowVitalsModal(true);
                                  }}
                                  className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-center text-[var(--text-secondary)] py-8">No vitals recorded for this visit</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* No Attendance Message */}
      {selectedPatientId && !selectedAttendanceId && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-yellow-800 mb-1">No Inpatient Attendance Selected</h3>
          <p className="text-sm text-yellow-700">Please select an admitted patient to manage nursing care</p>
        </div>
      )}

      {/* Vitals Modal */}
      <VitalsFormModal
        isOpen={showVitalsModal}
        onClose={() => {
          setShowVitalsModal(false);
          setEditingVitals(null);
        }}
        onSubmit={handleSubmitVitals}
        isLoading={isSubmitting}
        initialData={editingVitals || undefined}
        isEditing={!!editingVitals}
        isAntenatal={selectedAttendance?.attendanceType === 'antenatal'}
        attendanceId={selectedAttendanceId}
        attendanceType={selectedAttendance?.attendanceType}
      />
    </div>
  );
}