import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatientStore } from '../store/patientStore';
import { useAttendanceStore } from '../store/attendanceStore';
import { useStockStore } from '../store/stockStore';
import { useMedicalServicesStore } from '../store/medicalServicesStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import { PatientSelection } from '../components/vitals/PatientSelection';
import { AttendanceSelection } from '../components/vitals/AttendanceSelection';
import { VitalsDisplay } from '../components/medical-entries/VitalsDisplay';
import { AttendanceActions } from '../components/medical-entries/AttendanceActions';
import NewAttendanceModal from '../components/NewAttendanceModal';

// Import the medical entry sections
import ClinicalInformationSection from '../components/medical-entries/ClinicalInformationSection';
import MedicationsSection from '../components/medical-entries/MedicationsSection';
import LabTestsSection from '../components/medical-entries/LabTestsSection';
import ProceduresSection from '../components/medical-entries/ProceduresSection';
import ScansSection from '../components/medical-entries/ScansSection';

import { AlertCircle, Ban, RefreshCw, Stethoscope, Pill, FileText, FlaskConical, Scissors, Scan } from 'lucide-react';
import type { Medication, LabTest, Procedure, Scan as ScanType, Diagnosis, ProgressNote, Attendance, Patient } from '../types';
import type { MedicationEntry, LabTestEntry, ProcedureEntry, ScanEntry } from '../types/medical-entries';

// Helper: Get consistent ID
const getEntityId = (entity: { id?: string; _id?: string } | null): string | undefined => {
  return entity?.id || entity?._id;
};

export default function MedicalEntries() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  // Store hooks
  const { patients, loadPatients } = usePatientStore();
  const {
    attendances,
    getAttendances,
    addDiagnosisToAttendance,
    addLabTestToAttendance,
    addProcedureToAttendance,
    addScanToAttendance,
    addMedicationToAttendance,
    updateAttendance,
    updateAttendanceStatus,
    canAddMedicalEntries,
    getVitalsByAttendance
  } = useAttendanceStore();

  const { stockItems, getStockItems } = useStockStore();
  
  // Medical services store imports
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

  const { user } = useAuthStore();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [selectedAttendanceForEdit, setSelectedAttendanceForEdit] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedAttendanceId, setSelectedAttendanceId] = useState<string>('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  // Medical entries state
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [notes, setNotes] = useState('');
  const [medications, setMedications] = useState<Medication[]>([]);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [scans, setScans] = useState<ScanType[]>([]);

  const [latestVitals, setLatestVitals] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'clinical' | 'medications' | 'labs' | 'procedures' | 'scans'>('clinical');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activatingAttendance, setActivatingAttendance] = useState(false);
  const [completingAttendance, setCompletingAttendance] = useState(false);

  // Current entry forms
  const [currentMed, setCurrentMed] = useState<MedicationEntry>({
    stockItemId: '',
    name: '',
    dosage: '',
    frequency: '',
    duration: '',
    quantity: 1,
    route: 'oral',
    instructions: '',
    status: 'prescribed',
    prescribedBy: user?.id || user?._id || user?.username || ''
  });

  const [currentLab, setCurrentLab] = useState<LabTestEntry>({
    templateId: '',
    name: '',
    priority: 'routine',
    notes: '',
    status: 'requested'
  });

  const [currentProcedure, setCurrentProcedure] = useState<ProcedureEntry>({
    templateId: '',
    name: '',
    scheduledDate: '',
    notes: '',
    status: 'scheduled',
    createdBy: user?.id || user?._id || user?.username || ''
  });

  const [currentScan, setCurrentScan] = useState<ScanEntry>({
    templateId: '',
    scanType: '',
    description: '',
    bodyPart: '',
    priority: 'routine',
    notes: '',
    status: 'requested'
  });

  // Load data
  const loadData = async () => {
    try {
      setRefreshing(true);
      setIsLoading(true);

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
    } catch {
      toastError('Load failed', 'Could not load data. Please try again.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Use same patient matching logic as Vitals page
  const patientAttendances = useMemo(() => {
    if (!selectedPatientId || !attendances.length) return [];

    const filtered = attendances.filter(attendance => {
      const possiblePatientIds = [
        attendance.patientId,
        attendance.patient?.id,
        attendance.patient?._id,
        attendance.data?.patientId
      ]
        .filter(Boolean)
        .map(id => id?.toString())
        .filter(id => id && id !== 'undefined');

      return possiblePatientIds.includes(selectedPatientId);
    });

    return filtered
      .sort((a, b) => new Date(b.dateTime || b.createdAt || '').getTime() - new Date(a.dateTime || a.createdAt || '').getTime())
      .map(attendance => ({
        ...attendance,
        patient: patients.find(p => getEntityId(p) === selectedPatientId) || attendance.patient
      }));
  }, [attendances, selectedPatientId, patients]);

  const selectedPatient = patients.find(p => getEntityId(p) === selectedPatientId);
  const selectedAttendance = patientAttendances.find(a => getEntityId(a) === selectedAttendanceId);

  // Load vitals using same function as Vitals page
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

  const canAddEntries = selectedAttendance ? canAddMedicalEntries(selectedAttendance) : false;

  // Handlers
  const handleRefresh = () => loadData();

  const handleNewAttendance = () => {
    setSelectedAttendanceForEdit({ patientId: selectedPatientId });
    setIsEditMode(false);
    setShowAttendanceModal(true);
  };

  const handleEditAttendance = (attendance: Attendance) => {
    setSelectedAttendanceForEdit(attendance);
    setIsEditMode(true);
    setShowAttendanceModal(true);
  };

  const handleAttendanceSuccess = async (updatedAttendance: any) => {
    setShowAttendanceModal(false);
    setSelectedAttendanceForEdit(null);
    setIsEditMode(false);

    await getAttendances();
    
    if (!isEditMode && selectedPatientId && updatedAttendance.patientId === selectedPatientId) {
      setSelectedAttendanceId(getEntityId(updatedAttendance) || '');
    }

    success(isEditMode ? 'Attendance updated' : 'New attendance created', isEditMode ? 'Visit updated' : 'Patient checked in');
  };

  const handleActivateAttendance = async () => {
    if (!selectedAttendanceId || !selectedAttendance) return;

    if (selectedAttendance.status !== 'pending') {
      toastError('Invalid action', 'Only pending attendances can be activated');
      return;
    }

    setActivatingAttendance(true);
    try {
      await updateAttendanceStatus(selectedAttendanceId, 'pending');
      success('Attendance updated', 'Patient visit status updated');
      await getAttendances();
    } catch {
      toastError('Failed', 'Could not update attendance status');
    } finally {
      setActivatingAttendance(false);
    }
  };

  const handleCompleteAttendance = async () => {
    if (!selectedAttendanceId || !selectedAttendance) return;

    if (!['pending', 'admitted'].includes(selectedAttendance.status)) {
      toastError('Invalid action', 'Only pending or admitted visits can be completed');
      return;
    }

    setCompletingAttendance(true);
    try {
      await updateAttendanceStatus(selectedAttendanceId, 'completed', {
        medicalNotes: notes,
        dischargeNotes: notes,
        completedAt: new Date().toISOString()
      });
      success('Visit completed', 'Patient discharged');
      await getAttendances();
    } catch {
      toastError('Failed', 'Could not complete attendance');
    } finally {
      setCompletingAttendance(false);
    }
  };

  const handleCancelAttendance = async () => {
    if (!selectedAttendanceId || !selectedAttendance) return;

    if (selectedAttendance.status === 'completed') {
      toastError('Invalid action', 'Completed visits cannot be cancelled');
      return;
    }

    if (!window.confirm('Cancel this visit? This cannot be undone.')) return;

    try {
      await updateAttendanceStatus(selectedAttendanceId, 'cancelled', {
        cancellationNotes: 'Cancelled by user',
        cancelledAt: new Date().toISOString()
      });
      success('Cancelled', 'Visit cancelled');
      await getAttendances();
    } catch {
      toastError('Failed', 'Could not cancel attendance');
    }
  };

  const handleAddMedication = () => {
    if (!selectedAttendance) {
      toastError('Selection required', 'Please select an attendance');
      return;
    }
    if (!canAddEntries) {
      toastError('Access denied', `Cannot add to ${selectedAttendance.status} visit`);
      return;
    }
    if (!currentMed.stockItemId || !currentMed.dosage) {
      toastError('Incomplete', 'Select medication and dosage');
      return;
    }

    const stockItem = stockItems.find(s => s.id === currentMed.stockItemId || s._id === currentMed.stockItemId);
    if (!stockItem) {
      toastError('Not found', 'Medication not in stock');
      return;
    }
    if (stockItem.currentStock < currentMed.quantity) {
      toastError('Low stock', `Only ${stockItem.currentStock} available`);
      return;
    }

    const newMed: Medication = {
      id: `med-${Date.now()}`,
      stockItemId: currentMed.stockItemId,
      name: stockItem.name,
      dosage: currentMed.dosage,
      frequency: currentMed.frequency,
      duration: currentMed.duration,
      quantity: currentMed.quantity,
      route: currentMed.route || 'oral',
      instructions: currentMed.instructions,
      status: 'prescribed',
      prescribedAt: new Date().toISOString(),
      prescribedBy: user?.id || user?._id || user?.username || '',
      notes: currentMed.instructions,
      cashPrice: stockItem.cashPrice || stockItem.sellingPrice || 0,
      insurancePrice: stockItem.insurancePrice || 0,
      costPrice: stockItem.costPrice || stockItem.unitPrice || 0,
      isActive: true,
      requiresAuthorization: stockItem.requiresAuthorization || false,
      tariffCode: stockItem.tariffCode || '',
      vatRate: stockItem.vatRate || 0,
      isTaxable: stockItem.isTaxable || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setMedications(prev => [...prev, newMed]);
    setCurrentMed({
      stockItemId: '',
      name: '',
      dosage: '',
      frequency: '',
      duration: '',
      quantity: 1,
      route: 'oral',
      instructions: '',
      status: 'prescribed',
      prescribedBy: user?.id || user?._id || user?.username || ''
    });
    success('Added', 'Medication prescribed');
  };

  const handleAddLabTest = () => {
    if (!selectedAttendance || !canAddEntries) {
      toastError('Access denied', 'Cannot add to this visit');
      return;
    }
    if (!currentLab.templateId) {
      toastError('Selection required', 'Please select a lab test');
      return;
    }

    const template = labTestTemplates.find(t => t.id === currentLab.templateId || t._id === currentLab.templateId);
    if (!template) {
      toastError('Not found', 'Test template missing');
      return;
    }

    const newTest: LabTest = {
      id: `lab-${Date.now()}`,
      templateId: currentLab.templateId,
      name: template.name,
      status: 'requested',
      priority: currentLab.priority,
      requestedAt: new Date().toISOString(),
      notes: currentLab.notes,
      cashPrice: template.cashPrice || 0,
      insurancePrice: template.insurancePrice || 0,
      costPrice: template.costPrice || 0,
      isActive: true,
      requiresAuthorization: template.requiresAuthorization || false,
      tariffCode: template.tariffCode || '',
      vatRate: template.vatRate || 0,
      isTaxable: template.isTaxable || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setLabTests(prev => [...prev, newTest]);
    setCurrentLab({ templateId: '', name: '', priority: 'routine', notes: '', status: 'requested' });
    success('Added', 'Lab test requested');
  };

  const handleAddProcedure = () => {
    if (!selectedAttendance || !canAddEntries) {
      toastError('Access denied', 'Cannot add to this visit');
      return;
    }
    if (!currentProcedure.templateId || !currentProcedure.scheduledDate) {
      toastError('Incomplete', 'Select procedure and date');
      return;
    }

    const template = procedureTemplates.find(t => t.id === currentProcedure.templateId || t._id === currentProcedure.templateId);
    if (!template) {
      toastError('Not found', 'Procedure template missing');
      return;
    }

    const newProcedure: Procedure = {
      id: `proc-${Date.now()}`,
      templateId: currentProcedure.templateId,
      name: template.name,
      status: 'scheduled',
      scheduledDate: currentProcedure.scheduledDate,
      notes: currentProcedure.notes,
      createdBy: user?.id || user?._id || user?.username || '',
      cashPrice: template.cashPrice || 0,
      insurancePrice: template.insurancePrice || 0,
      costPrice: template.costPrice || 0,
      isActive: true,
      requiresAuthorization: template.requiresAuthorization || false,
      tariffCode: template.tariffCode || '',
      vatRate: template.vatRate || 0,
      isTaxable: template.isTaxable || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setProcedures(prev => [...prev, newProcedure]);
    setCurrentProcedure({
      templateId: '',
      name: '',
      scheduledDate: '',
      notes: '',
      status: 'scheduled',
      createdBy: user?.id || user?._id || user?.username || ''
    });
    success('Added', 'Procedure scheduled');
  };

  const handleAddScan = () => {
    if (!selectedAttendance || !canAddEntries) {
      toastError('Access denied', 'Cannot add to this visit');
      return;
    }
    if (!currentScan.scanType || !currentScan.description) {
      toastError('Incomplete', 'Enter scan type and description');
      return;
    }

    // Find scan template for pricing and validation
    const scanTemplate = scanTemplates.find(t => 
      currentScan.templateId ? 
        (t.id === currentScan.templateId || t._id === currentScan.templateId) : 
        t.name.toLowerCase().includes(currentScan.scanType.toLowerCase())
    );

    const newScan: ScanType = {
      id: `scan-${Date.now()}`,
      templateId: currentScan.templateId || scanTemplate?.id || scanTemplate?._id,
      scanType: currentScan.scanType,
      description: currentScan.description,
      bodyPart: currentScan.bodyPart,
      status: 'requested',
      priority: currentScan.priority,
      requestedAt: new Date().toISOString(),
      notes: currentScan.notes,
      cashPrice: scanTemplate?.cashPrice || 0,
      insurancePrice: scanTemplate?.insurancePrice || 0,
      costPrice: scanTemplate?.costPrice || 0,
      isActive: true,
      requiresAuthorization: scanTemplate?.requiresAuthorization || false,
      tariffCode: scanTemplate?.tariffCode || '',
      vatRate: scanTemplate?.vatRate || 0,
      isTaxable: scanTemplate?.isTaxable || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setScans(prev => [...prev, newScan]);
    setCurrentScan({
      templateId: '',
      scanType: '',
      description: '',
      bodyPart: '',
      priority: 'routine',
      notes: '',
      status: 'requested'
    });
    success('Added', 'Scan requested');
  };

  const handleSubmitMedicalEntries = async () => {
    if (!selectedPatient || !selectedAttendance) {
      toastError('Selection required', 'Please select patient and attendance');
      return;
    }
    if (!canAddEntries) {
      toastError('Access denied', `Cannot add to ${selectedAttendance.status} visit`);
      return;
    }
    if (!chiefComplaint.trim()) {
      toastError('Required', 'Chief complaint is required');
      return;
    }

    setIsSubmitting(true);
    try {
      // Update attendance with basic info
      await updateAttendance(selectedAttendanceId, {
        complaints: chiefComplaint,
        medicalNotes: notes
      });

      // Add diagnosis if selected
      if (diagnosis) {
        await addDiagnosisToAttendance(selectedAttendanceId, {
          diagnosisId: diagnosis.id || diagnosis._id,
          primary: true,
          notes: notes,
          date: new Date().toISOString(),
          createdById: user?.id || user?._id || user?.username || ''
        });
      }

      // Add all medical entries with proper backend structure
      const medicalEntries = [
        ...labTests.map(test => addLabTestToAttendance(selectedAttendanceId, {
          templateId: test.templateId,
          priority: test.priority,
          notes: test.notes,
          createdById: user?.id || user?._id || user?.username || ''
        })),
        ...procedures.map(proc => addProcedureToAttendance(selectedAttendanceId, {
          templateId: proc.templateId,
          scheduledDate: proc.scheduledDate,
          notes: proc.notes,
          createdById: user?.id || user?._id || user?.username || ''
        })),
        ...scans.map(scan => addScanToAttendance(selectedAttendanceId, {
          templateId: scan.templateId,
          scanType: scan.scanType,
          description: scan.description,
          bodyPart: scan.bodyPart,
          priority: scan.priority,
          notes: scan.notes,
          createdById: user?.id || user?._id || user?.username || ''
        })),
        ...medications.map(med => addMedicationToAttendance(selectedAttendanceId, {
          stockItemId: med.stockItemId,
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          duration: med.duration,
          quantity: med.quantity,
          route: med.route,
          instructions: med.instructions,
          prescribedById: user?.id || user?._id || user?.username || ''
        })),
      ];

      await Promise.all(medicalEntries);

      success('Saved', 'All medical entries saved successfully');
      resetForm();
    } catch (error: any) {
      console.error('Save failed:', error);
      toastError('Save failed', error.message || 'Could not save entries');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setChiefComplaint('');
    setDiagnosis(null);
    setNotes('');
    setMedications([]);
    setLabTests([]);
    setProcedures([]);
    setScans([]);
    setActiveTab('clinical');
  };

  // Reset attendance selection when patient changes
  useEffect(() => {
    setSelectedAttendanceId('');
  }, [selectedPatientId]);

  // Reset form when attendance changes
  useEffect(() => {
    if (selectedAttendance) {
      // Load existing data from attendance if needed
      setChiefComplaint(selectedAttendance.complaints || '');
      setNotes(selectedAttendance.medicalNotes || '');
    } else {
      resetForm();
    }
  }, [selectedAttendance]);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)] border-[var(--icon-yellow-bg)]';
      case 'admitted': return 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] border-[var(--icon-green-bg)]';
      case 'completed': return 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] border-[var(--icon-cyan-bg)]';
      case 'cancelled': return 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] border-[var(--icon-red-bg)]';
      case 'discharged': return 'bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)] border-[var(--icon-blue-bg)]';
      default: return 'bg-[var(--bg-main)] text-[var(--text-secondary)] border-[var(--border-color)]';
    }
  };

  const tabCounts = {
    clinical: chiefComplaint || diagnosis || notes ? 1 : 0,
    medications: medications.length,
    labs: labTests.length,
    procedures: procedures.length,
    scans: scans.length
  };

  const tabs = [
    { id: 'clinical', label: 'Clinical', icon: FileText, count: tabCounts.clinical },
    { id: 'medications', label: 'Medications', icon: Pill, count: tabCounts.medications },
    { id: 'labs', label: 'Labs', icon: FlaskConical, count: tabCounts.labs },
    { id: 'procedures', label: 'Procedures', icon: Scissors, count: tabCounts.procedures },
    { id: 'scans', label: 'Scans', icon: Scan, count: tabCounts.scans },
  ];

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-[var(--bg-main)] rounded-xl transition-all duration-200"
          >
            <svg className="w-5 h-5 text-[var(--text-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="w-12 h-12 bg-[var(--icon-purple-bg)] rounded-xl flex items-center justify-center">
            <Pill className="w-6 h-6 text-[var(--icon-purple-text)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Medical Entries</h1>
            <p className="text-sm text-[var(--text-secondary)]">Diagnose, prescribe, request tests & procedures</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/dashboard/vitals')}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all text-sm text-[var(--text-primary)]"
          >
            <Stethoscope className="w-4 h-4" />
            Record Vitals
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all disabled:opacity-50 text-sm text-[var(--text-primary)]"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Patient & Attendance Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PatientSelection
          patients={patients}
          patientSearch={patientSearch}
          setPatientSearch={setPatientSearch}
          selectedPatientId={selectedPatientId}
          setSelectedPatientId={setSelectedPatientId}
          showPatientDropdown={showPatientDropdown}
          setShowPatientDropdown={setShowPatientDropdown}
          selectedPatient={selectedPatient}
        />
        
        {selectedPatientId && (
          <AttendanceSelection
            patientAttendances={patientAttendances}
            selectedAttendanceId={selectedAttendanceId}
            setSelectedAttendanceId={setSelectedAttendanceId}
            selectedPatientId={selectedPatientId}
            navigate={navigate}
            onActivateAttendance={handleActivateAttendance}
            activatingAttendance={activatingAttendance}
          />
        )}
      </div>

      {/* Vitals Display */}
      {selectedAttendance && latestVitals && (
        <VitalsDisplay vitals={latestVitals} />
      )}

      {/* Attendance Actions */}
      {selectedAttendance && (
        <AttendanceActions
          attendance={selectedAttendance}
          onActivate={handleActivateAttendance}
          onComplete={handleCompleteAttendance}
          onCancel={handleCancelAttendance}
          isActivating={activatingAttendance}
          isCompleting={completingAttendance}
        />
      )}

      {/* Medical Entries - Only show if attendance is selected and can add entries */}
      {selectedAttendanceId && canAddEntries && (
        <div className="bg-[var(--bg-card)] rounded-xl shadow-sm border border-[var(--border-color)]">
          {/* Tabs */}
          <div className="border-b border-[var(--border-color)]">
            <div className="flex overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-all whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-[var(--icon-cyan-text)] text-[var(--icon-cyan-text)] bg-[var(--icon-cyan-bg)] bg-opacity-20'
                        : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                    {tab.count > 0 && (
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        activeTab === tab.id
                          ? 'bg-[var(--icon-cyan-text)] text-white'
                          : 'bg-[var(--bg-main)] text-[var(--text-secondary)]'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'clinical' && (
              <ClinicalInformationSection
                chiefComplaint={chiefComplaint}
                diagnosis={diagnosis}
                notes={notes}
                diagnosisTemplates={diagnoses}
                onComplaintChange={setChiefComplaint}
                onDiagnosisChange={setDiagnosis}
                onNotesChange={setNotes}
                canAddEntries={canAddEntries}
                currentUser={user}
              />
            )}

            {activeTab === 'medications' && (
              <MedicationsSection
                medications={medications}
                currentMed={currentMed}
                onMedChange={setCurrentMed}
                onAddMedication={handleAddMedication}
                stockItems={stockItems}
                canAddEntries={canAddEntries}
                currentUser={user}
              />
            )}

            {activeTab === 'labs' && (
              <LabTestsSection
                labTests={labTests}
                currentLab={currentLab}
                onLabChange={setCurrentLab}
                onAddLabTest={handleAddLabTest}
                labTestTemplates={labTestTemplates}
                canAddEntries={canAddEntries}
                currentUser={user}
              />
            )}

            {activeTab === 'procedures' && (
              <ProceduresSection
                procedures={procedures}
                currentProcedure={currentProcedure}
                onProcedureChange={setCurrentProcedure}
                onAddProcedure={handleAddProcedure}
                procedureTemplates={procedureTemplates}
                canAddEntries={canAddEntries}
                currentUser={user}
              />
            )}

            {activeTab === 'scans' && (
              <ScansSection
                scans={scans}
                currentScan={currentScan}
                onScanChange={setCurrentScan}
                onAddScan={handleAddScan}
                scanTemplates={scanTemplates}
                canAddEntries={canAddEntries}
                currentUser={user}
              />
            )}
          </div>

          {/* Save Button */}
          <div className="border-t border-[var(--border-color)] p-6 bg-[var(--bg-main)] rounded-b-xl">
            <button
              onClick={handleSubmitMedicalEntries}
              disabled={isSubmitting || !chiefComplaint.trim()}
              className="flex items-center gap-2 px-6 py-3 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Save All Medical Entries
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* No Attendance Selected Message */}
      {selectedPatientId && !selectedAttendanceId && (
        <div className="bg-[var(--icon-yellow-bg)] border border-[var(--icon-yellow-text)] rounded-xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-[var(--icon-yellow-text)] mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-[var(--icon-yellow-text)] mb-2">No Attendance Selected</h3>
          <p className="text-[var(--icon-yellow-text)] mb-4">Please select an existing attendance or create a new one to add medical entries.</p>
          <button
            onClick={handleNewAttendance}
            className="bg-[var(--icon-yellow-text)] text-white px-6 py-2 rounded-lg hover:bg-[var(--icon-yellow-text)]/80 transition-colors"
          >
            Create New Attendance
          </button>
        </div>
      )}

      {/* Cannot Add Entries Message */}
      {selectedAttendance && !canAddEntries && (
        <div className="bg-[var(--icon-red-bg)] border border-[var(--icon-red-text)] rounded-xl p-6 text-center">
          <Ban className="w-12 h-12 text-[var(--icon-red-text)] mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-[var(--icon-red-text)] mb-2">Cannot Add Entries</h3>
          <p className="text-[var(--icon-red-text)]">
            This attendance is <span className="font-bold">{selectedAttendance.status}</span> and cannot be modified.
            {selectedAttendance.status === 'completed' && ' Please select an active or pending attendance.'}
            {selectedAttendance.status === 'cancelled' && ' This attendance has been cancelled.'}
          </p>
        </div>
      )}

      {/* Attendance Modal */}
      {showAttendanceModal && selectedAttendanceForEdit && (
        <NewAttendanceModal
          patientId={selectedAttendanceForEdit.patientId}
          onSuccess={handleAttendanceSuccess}
          onClose={() => setShowAttendanceModal(false)}
          isEditMode={isEditMode}
          attendanceData={isEditMode ? selectedAttendanceForEdit : undefined}
        />
      )}
    </div>
  );
}

// Loading Screen
const LoadingScreen: React.FC = () => (
  <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
    <div className="text-center bg-[var(--bg-card)] p-8 rounded-xl shadow-sm border border-[var(--border-color)]">
      <div className="w-14 h-14 border-4 border-[var(--icon-cyan-text)] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
      <h2 className="text-xl font-bold text-[var(--text-primary)]">Loading Medical Entries...</h2>
      <p className="text-[var(--text-secondary)] text-sm mt-1">Fetching patient and attendance data</p>
    </div>
  </div>
);