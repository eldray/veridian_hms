// src/pages/MedicalEntries.tsx - UPDATED WITH FINANCIAL INTEGRATION
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatientStore } from '../store/patientStore';
import { useAttendanceStore } from '../store/attendanceStore';
import { useStockStore } from '../store/stockStore';
import { useMedicalServicesStore } from '../store/medicalServicesStore';
import { useAuthStore } from '../store/authStore';
import type { Medication, LabTest, Procedure, Scan, Diagnosis, ProgressNote } from '../types';
import type { MedicationEntry, LabTestEntry, ProcedureEntry, ScanEntry } from '../types/medical-entries';
import NewAttendanceModal from '../components/NewAttendanceModal';
import {
  ClinicalInformationSection,
  MedicationsSection,
  LabTestsSection,
  ProceduresSection,
  ScansSection
} from '../components/medical-entries';
import {
  Stethoscope,
  Activity,
  Save,
  Search,
  User,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Hospital,
  FileText,
  Plus,
  HeartPulse,
  RefreshCw,
  PlayCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Ban,
  Edit,
  Thermometer,
  Gauge,
  Heart,
  Wind,
  Droplets,
  Scale,
  Ruler,
  Shield
} from 'lucide-react';

// Helper: Get consistent ID from entity
const getEntityId = (entity: { id?: string; _id?: string } | null): string | undefined => {
  return entity?._id || entity?.id;
};

export default function MedicalEntries() {
  const navigate = useNavigate();
  const { patients, loadPatients } = usePatientStore();
  const {
    attendances,
    getAttendances,
    addDiagnosisToAttendance,
    addLabTestToAttendance,
    addProcedureToAttendance,
    addScanToAttendance,
    addMedicationToAttendance,
    addProgressNoteToAttendance,
    updateAttendance,
    updateAttendanceStatus,
    canAddMedicalEntries,
    canPerformActivities,
    canRecordVitals,
    canAddProgressNotes,
    canCompleteAttendance,
    calculateBill,
    getVitalsByAttendance
  } = useAttendanceStore();
  const { stockItems, getStockItems } = useStockStore();
  const {
    diagnoses,
    labTestTemplates,
    procedureTemplates,
    getDiagnoses,
    getLabTestTemplates,
    getProcedureTemplates,
  } = useMedicalServicesStore();
  const { user } = useAuthStore();

  // Load initial data
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // New Attendance Modal State
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [selectedAttendanceForEdit, setSelectedAttendanceForEdit] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Search and selection state
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [selectedAttendance, setSelectedAttendance] = useState<string>('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  // Medical entries state
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [notes, setNotes] = useState('');
  const [medications, setMedications] = useState<Medication[]>([]);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  const [progressNotes, setProgressNotes] = useState<ProgressNote[]>([]);

  // Vitals state
  const [latestVitals, setLatestVitals] = useState<any>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<'clinical' | 'medications' | 'labs' | 'procedures' | 'scans' | 'progress'>('clinical');

  // Current entry state
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
    prescribedBy: user?._id || user?.username || ''
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
    createdBy: user?._id || user?.username || ''
  });

  const [currentScan, setCurrentScan] = useState<ScanEntry>({
    scanType: '',
    description: '',
    bodyPart: '',
    priority: 'routine',
    notes: '',
    status: 'requested'
  });

  const [currentProgressNote, setCurrentProgressNote] = useState('');

  // UI state
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activatingAttendance, setActivatingAttendance] = useState(false);
  const [completingAttendance, setCompletingAttendance] = useState(false);
  const [addingProgressNote, setAddingProgressNote] = useState(false);

  // Load data
  const loadData = async () => {
    try {
      setRefreshing(true);
      setIsLoading(true);
      
      await loadPatients();
      await getAttendances();
      await getStockItems();
      
      await Promise.all([
        getDiagnoses(),
        getLabTestTemplates(),
        getProcedureTemplates()
      ]);
      
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage({ 
        type: 'error', 
        text: 'Failed to load medical templates. Please try refreshing.' 
      });
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);
  
  // Load vitals when attendance changes
  useEffect(() => {
    const loadVitals = async () => {
      if (selectedAttendance) {
        try {
          const vitals = await getVitalsByAttendance(selectedAttendance);
          if (vitals && vitals.length > 0) {
            setLatestVitals(vitals[vitals.length - 1]);
          } else {
            setLatestVitals(null);
          }
        } catch (error) {
          console.error('Error loading vitals:', error);
          setLatestVitals(null);
        }
      }
    };
    
    loadVitals();
  }, [selectedAttendance, getVitalsByAttendance]);

  // Enhanced patient matching function
  const findPatient = (attendance: any) => {
    if (attendance?.patient?.fullName) {
      return attendance.patient;
    }

    let actualPatientId: string | null = null;
    
    if (attendance.patientId && typeof attendance.patientId === 'object') {
      actualPatientId = (
        attendance.patientId._id ||
        attendance.patientId.id ||
        attendance.patientId.patientId ||
        attendance.patientId.patientID
      )?.toString();
    } else if (attendance.patientId) {
      actualPatientId = attendance.patientId.toString();
    }

    if (actualPatientId) {
      const patient = patients.find(p => {
        const patientId = getEntityId(p);
        return patientId === actualPatientId;
      });
      if (patient) return patient;
    }

    if (attendance.patient && typeof attendance.patient === 'object') {
      const patientObjId = getEntityId(attendance.patient);
      if (patientObjId) {
        const patient = patients.find(p => getEntityId(p) === patientObjId);
        if (patient) return patient;
      }
    }

    return null;
  };

  // Filter patients based on search term
  const filteredPatients = patients.filter(
    (p) =>
      p.fullName.toLowerCase().includes(patientSearch.toLowerCase()) ||
      p.contact.includes(patientSearch) ||
      p.folderNumber?.toLowerCase().includes(patientSearch.toLowerCase())
  );

  // Get attendances for selected patient
  const patientAttendances = attendances
    .filter(a => {
      const patient = findPatient(a);
      return patient && (getEntityId(patient) === selectedPatient);
    })
    .map(attendance => ({
      ...attendance,
      patient: findPatient(attendance)
    }));

  // Get the latest pending attendance for auto-selection
  const getLatestPendingAttendance = () => {
    const pendingAttendances = patientAttendances.filter(a => a.status === 'pending');
    return pendingAttendances.sort((a, b) => 
      new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
    )[0];
  };

  // Get patient and attendance data
  const selectedPatientData = patients.find((p) => getEntityId(p) === selectedPatient);
  const selectedAttendanceData = patientAttendances.find((a) => 
    getEntityId(a) === selectedAttendance
  );

  // Auto-select latest pending attendance when patient is selected
  useEffect(() => {
    if (selectedPatient && patientAttendances.length > 0) {
      const latestPending = getLatestPendingAttendance();
      if (latestPending) {
        setSelectedAttendance(getEntityId(latestPending) || '');
      } else {
        setSelectedAttendance(getEntityId(patientAttendances[0]) || '');
      }
    }
  }, [selectedPatient, patientAttendances]);

  // Status checking
  const isAttendancePending = selectedAttendanceData?.status === 'pending';
  const isAttendanceActive = selectedAttendanceData?.status === 'active';
  const isAttendanceCompleted = selectedAttendanceData?.status === 'completed';
  const isAttendanceCancelled = selectedAttendanceData?.status === 'cancelled';

  // Status-based permissions
  const canAddEntries = selectedAttendanceData ? canAddMedicalEntries(selectedAttendanceData) : false;
  const canAddProgress = selectedAttendanceData ? canAddProgressNotes(selectedAttendanceData) : false;

  // User role check
  const canCreateEntries = ['admin', 'doctor', 'nurse', 'midwife'].includes(user?.role || '');

  // Payment mode
  const paymentMode = selectedAttendanceData?.paymentMode || 'cash';

  // Refresh function
  const handleRefresh = () => {
    loadData();
  };

  // Modal handlers
  const handleNewAttendance = (patientId: string) => {
    setSelectedAttendanceForEdit({ patientId });
    setIsEditMode(false);
    setShowAttendanceModal(true);
  };

  const handleEditAttendance = (attendance: any) => {
    setSelectedAttendanceForEdit(attendance);
    setIsEditMode(true);
    setShowAttendanceModal(true);
  };

  const handleAttendanceSuccess = (updatedAttendance: any) => {
    setShowAttendanceModal(false);
    setSelectedAttendanceForEdit(null);
    setIsEditMode(false);
    
    loadData();
    
    if (!isEditMode && selectedPatient && updatedAttendance.patientId === selectedPatient) {
      setSelectedAttendance(getEntityId(updatedAttendance) || '');
    }
    
    setMessage({ 
      type: 'success', 
      text: isEditMode ? 'Attendance updated successfully!' : 'New attendance created successfully!' 
    });
  };

  const handleAttendanceClose = () => {
    setShowAttendanceModal(false);
    setSelectedAttendanceForEdit(null);
    setIsEditMode(false);
  };

  // Status management functions
  const handleActivateAttendance = async () => {
    if (!selectedAttendance || !selectedAttendanceData) return;
    
    if (!isAttendancePending) {
      setMessage({ type: 'error', text: 'Only pending attendances can be activated' });
      return;
    }

    setActivatingAttendance(true);
    try {
      await updateAttendanceStatus(selectedAttendance, 'active');
      setMessage({ type: 'success', text: 'Attendance activated successfully!' });
      await getAttendances();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to activate attendance' });
    } finally {
      setActivatingAttendance(false);
    }
  };

  const handleCompleteAttendance = async () => {
    if (!selectedAttendance || !selectedAttendanceData) return;
    
    if (!isAttendanceActive && !isAttendancePending) {
      setMessage({ type: 'error', text: 'Only active or pending attendances can be completed' });
      return;
    }

    setCompletingAttendance(true);
    try {
      await updateAttendanceStatus(selectedAttendance, 'completed', {
        medicalNotes: notes,
        dischargeNotes: notes,
        completedAt: new Date().toISOString()
      });
      setMessage({ type: 'success', text: 'Attendance completed successfully!' });
      await getAttendances();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to complete attendance' });
    } finally {
      setCompletingAttendance(false);
    }
  };

  const handleCancelAttendance = async () => {
    if (!selectedAttendance || !selectedAttendanceData) return;
    
    if (isAttendanceCompleted) {
      setMessage({ type: 'error', text: 'Completed attendances cannot be cancelled' });
      return;
    }

    if (!confirm('Are you sure you want to cancel this attendance? This action cannot be undone.')) {
      return;
    }

    try {
      await updateAttendanceStatus(selectedAttendance, 'cancelled', {
        cancellationNotes: 'Cancelled by user',
        cancelledAt: new Date().toISOString()
      });
      setMessage({ type: 'success', text: 'Attendance cancelled successfully!' });
      await getAttendances();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to cancel attendance' });
    }
  };

  // Progress Notes
  const handleAddProgressNote = async () => {
    if (!selectedAttendance || !currentProgressNote.trim()) return;

    setAddingProgressNote(true);
    try {
      const newNote: ProgressNote = {
        _id: `progress-${Date.now()}`,
        note: currentProgressNote,
        type: 'progress',
        createdBy: user?.fullName || user?.username || '',
        createdAt: new Date().toISOString()
      };

      await addProgressNoteToAttendance(selectedAttendance, newNote);
      setProgressNotes([...progressNotes, newNote]);
      setCurrentProgressNote('');
      setMessage({ type: 'success', text: 'Progress note added successfully!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to add progress note' });
    } finally {
      setAddingProgressNote(false);
    }
  };

  // Medical entry functions
  const handleAddMedication = () => {
    if (!selectedAttendanceData) {
      setMessage({ type: 'error', text: 'Please select an attendance first' });
      return;
    }

    if (!canAddEntries) {
      setMessage({ type: 'error', text: `Cannot add medications to ${selectedAttendanceData.status} attendance` });
      return;
    }

    if (!currentMed.stockItemId || !currentMed.dosage) {
      setMessage({ type: 'error', text: 'Please select medication and enter dosage' });
      return;
    }
    
    const stockItem = stockItems.find((s) => s._id === currentMed.stockItemId);
    if (!stockItem) {
      setMessage({ type: 'error', text: 'Stock item not found' });
      return;
    }

    if (stockItem.currentStock < currentMed.quantity) {
      setMessage({ type: 'error', text: `Insufficient stock. Only ${stockItem.currentStock} items available` });
      return;
    }
    
    const newMed: Medication = {
      _id: `med-${Date.now()}`,
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
      prescribedBy: user?._id || user?.username || '',
      notes: currentMed.instructions,
      // Financial fields
      cashPrice: stockItem.sellingPrice,
      insurancePrice: stockItem.insurancePrice,
      costPrice: stockItem.unitPrice,
      isActive: true,
      requiresAuthorization: stockItem.requiresAuthorization,
      tariffCode: stockItem.tariffCode,
      vatRate: stockItem.vatRate,
      isTaxable: stockItem.isTaxable,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setMedications([...medications, newMed]);
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
      prescribedBy: user?._id || user?.username || ''
    });
    setMessage({ type: 'success', text: 'Medication added' });
    setTimeout(() => setMessage(null), 2000);
  };

  const handleAddLabTest = () => {
    if (!selectedAttendanceData) {
      setMessage({ type: 'error', text: 'Please select an attendance first' });
      return;
    }

    if (!canAddEntries) {
      setMessage({ type: 'error', text: `Cannot add lab tests to ${selectedAttendanceData.status} attendance` });
      return;
    }

    if (!currentLab.templateId) {
      setMessage({ type: 'error', text: 'Please select a lab test' });
      return;
    }
    
    const template = labTestTemplates.find((t) => t._id === currentLab.templateId);
    if (!template) {
      setMessage({ type: 'error', text: 'Lab test template not found' });
      return;
    }
    
    const newTest: LabTest = {
      _id: `lab-${Date.now()}`,
      templateId: currentLab.templateId,
      name: template.name,
      status: 'requested',
      priority: currentLab.priority,
      requestedAt: new Date().toISOString(),
      notes: currentLab.notes,
      // Financial fields
      cashPrice: template.cashPrice,
      insurancePrice: template.insurancePrice,
      costPrice: template.costPrice,
      isActive: true,
      requiresAuthorization: template.requiresAuthorization,
      tariffCode: template.tariffCode,
      vatRate: template.vatRate,
      isTaxable: template.isTaxable,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setLabTests([...labTests, newTest]);
    setCurrentLab({
      templateId: '',
      name: '',
      priority: 'routine',
      notes: '',
      status: 'requested'
    });
    setMessage({ type: 'success', text: 'Lab test added' });
    setTimeout(() => setMessage(null), 2000);
  };

  const handleAddProcedure = () => {
    if (!selectedAttendanceData) {
      setMessage({ type: 'error', text: 'Please select an attendance first' });
      return;
    }

    if (!canAddEntries) {
      setMessage({ type: 'error', text: `Cannot add procedures to ${selectedAttendanceData.status} attendance` });
      return;
    }

    if (!currentProcedure.templateId || !currentProcedure.scheduledDate) {
      setMessage({ type: 'error', text: 'Please select procedure and schedule date' });
      return;
    }
    
    const template = procedureTemplates.find((t) => t._id === currentProcedure.templateId);
    if (!template) {
      setMessage({ type: 'error', text: 'Procedure template not found' });
      return;
    }
    
    const newProcedure: Procedure = {
      _id: `proc-${Date.now()}`,
      templateId: currentProcedure.templateId,
      name: template.name,
      status: 'scheduled',
      scheduledDate: currentProcedure.scheduledDate,
      notes: currentProcedure.notes,
      createdBy: user?._id || user?.username || '',
      // Financial fields
      cashPrice: template.cashPrice,
      insurancePrice: template.insurancePrice,
      costPrice: template.costPrice,
      isActive: true,
      requiresAuthorization: template.requiresAuthorization,
      tariffCode: template.tariffCode,
      vatRate: template.vatRate,
      isTaxable: template.isTaxable,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setProcedures([...procedures, newProcedure]);
    setCurrentProcedure({
      templateId: '',
      name: '',
      scheduledDate: '',
      notes: '',
      status: 'scheduled',
      createdBy: user?._id || user?.username || ''
    });
    setMessage({ type: 'success', text: 'Procedure added' });
    setTimeout(() => setMessage(null), 2000);
  };

  const handleAddScan = () => {
    if (!selectedAttendanceData) {
      setMessage({ type: 'error', text: 'Please select an attendance first' });
      return;
    }

    if (!canAddEntries) {
      setMessage({ type: 'error', text: `Cannot add scans to ${selectedAttendanceData.status} attendance` });
      return;
    }

    if (!currentScan.scanType || !currentScan.description) {
      setMessage({ type: 'error', text: 'Please enter scan type and description' });
      return;
    }
    
    const newScan: Scan = {
      _id: `scan-${Date.now()}`,
      scanType: currentScan.scanType,
      description: currentScan.description,
      bodyPart: currentScan.bodyPart,
      status: 'requested',
      priority: currentScan.priority,
      requestedAt: new Date().toISOString(),
      notes: currentScan.notes,
      // Financial fields would be added from template when saving to backend
      cashPrice: 0,
      insurancePrice: 0,
      costPrice: 0,
      isActive: true,
      requiresAuthorization: false,
      vatRate: 0,
      isTaxable: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setScans([...scans, newScan]);
    setCurrentScan({
      scanType: '',
      description: '',
      bodyPart: '',
      priority: 'routine',
      notes: '',
      status: 'requested'
    });
    setMessage({ type: 'success', text: 'Scan added' });
    setTimeout(() => setMessage(null), 2000);
  };

  const handleSubmitMedicalEntries = async () => {
    if (!selectedPatient || !selectedAttendance || !selectedAttendanceData) {
      setMessage({ type: 'error', text: 'Please select a patient and attendance' });
      return;
    }
    
    if (!canAddEntries) {
      setMessage({ type: 'error', text: `Cannot add entries to ${selectedAttendanceData.status} attendance` });
      return;
    }

    if (!chiefComplaint) {
      setMessage({ type: 'error', text: 'Chief complaint is required' });
      return;
    }
    
    setIsSubmitting(true);
    setMessage(null);
    
    try {
      // Update attendance with clinical information
      await updateAttendance(selectedAttendance, {
        complaints: chiefComplaint,
        medicalNotes: notes
      });

      // Add diagnosis if selected
      if (diagnosis) {
        await addDiagnosisToAttendance(selectedAttendance, diagnosis);
      }

      // Add lab tests
      for (const test of labTests) {
        await addLabTestToAttendance(selectedAttendance, test);
      }

      // Add procedures
      for (const procedure of procedures) {
        await addProcedureToAttendance(selectedAttendance, procedure);
      }

      // Add scans
      for (const scan of scans) {
        await addScanToAttendance(selectedAttendance, scan);
      }

      // Add medications
      for (const medication of medications) {
        await addMedicationToAttendance(selectedAttendance, medication);
      }

      // Add progress notes
      for (const note of progressNotes) {
        await addProgressNoteToAttendance(selectedAttendance, note);
      }

      // Calculate final bill
      await calculateBill(selectedAttendance);

      setMessage({
        type: 'success',
        text: 'Medical entries saved successfully! Bill has been updated.'
      });

      // Reset form after successful submission
      setTimeout(() => {
        setChiefComplaint('');
        setDiagnosis(null);
        setNotes('');
        setMedications([]);
        setLabTests([]);
        setProcedures([]);
        setScans([]);
        setProgressNotes([]);
        setCurrentProgressNote('');
        setMessage(null);
      }, 2000);
    } catch (error: any) {
      console.error('Failed to save medical entries:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Failed to save medical entries'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status helpers
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'active': return <Activity className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <Ban className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  // Calculate summary counts for tabs
  const getTabCounts = () => ({
    clinical: chiefComplaint || diagnosis || notes ? 1 : 0,
    medications: medications.length,
    labs: labTests.length,
    procedures: procedures.length,
    scans: scans.length,
    progress: progressNotes.length
  });

  const tabCounts = getTabCounts();

  // Check if authorization is required for any service
  const requiresAuthorization = 
    (diagnosis?.requiresAuthorization) ||
    medications.some(med => {
      const stockItem = stockItems.find(s => getEntityId(s) === med.stockItemId);
      return stockItem?.requiresAuthorization;
    }) ||
    labTests.some(test => {
      const template = labTestTemplates.find(t => t._id === test.templateId);
      return template?.requiresAuthorization;
    }) ||
    procedures.some(procedure => {
      const template = procedureTemplates.find(t => t._id === procedure.templateId);
      return template?.requiresAuthorization;
    }) ||
    scans.some(scan => {
      // This would need scan template integration
      return false;
    });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-6">
        <div className="text-center bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-12">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading Medical Entries...</h2>
          <p className="text-gray-600">Please wait while we load patient and attendance data.</p>
        </div>
      </div>
    );
  }

  if (!canCreateEntries) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-6">
        <div className="text-center bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-12">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">You don't have permission to access medical entries.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-blue-900 rounded-2xl p-8 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20">
              <Hospital className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">Medical Entries</h1>
              <p className="text-blue-100 text-lg">
                Add diagnoses, medications, lab tests, procedures, and scans
              </p>
              <p className="text-blue-200 text-sm mt-1">
                {patients.length} patient(s) loaded • {attendances.length} attendance(s) found
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-3 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-all duration-200 border border-white/20 font-semibold disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              onClick={() => navigate('/dashboard/vitals')}
              className="flex items-center gap-2 px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-all duration-200 border border-white/20 font-semibold"
            >
              <HeartPulse className="w-5 h-5" />
              <span>Record Vitals</span>
            </button>
          </div>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-xl flex items-center gap-3 border ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border-green-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {/* Patient and Attendance Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patient Selection */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900">
            <User className="w-5 h-5 text-blue-600" />
            Patient Selection
          </h2>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search patient by name, contact, or folder number..."
                value={patientSearch}
                onChange={(e) => {
                  setPatientSearch(e.target.value);
                  setShowPatientDropdown(true);
                }}
                onFocus={() => setShowPatientDropdown(true)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
              
              {/* Patient Search Results */}
              {showPatientDropdown && patientSearch && (
                <div className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto border border-gray-300 rounded-xl bg-white shadow-lg">
                  {filteredPatients.length > 0 ? (
                    filteredPatients.map((patient) => {
                      const pid = getEntityId(patient);
                      if (!pid) return null;
                      return (
                        <button
                          key={pid}
                          onClick={() => {
                            setSelectedPatient(pid);
                            setPatientSearch(patient.fullName);
                            setShowPatientDropdown(false);
                          }}
                          className="w-full text-left p-4 hover:bg-blue-50 border-b last:border-b-0 transition-colors"
                        >
                          <div className="font-semibold text-gray-900">{patient.fullName}</div>
                          <div className="text-sm text-gray-600">
                            {patient.gender} • {patient.contact} • {patient.folderNumber}
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="p-4 text-gray-500 text-center">No patients found</div>
                  )}
                </div>
              )}
            </div>
            
            {selectedPatientData && (
              <div className="p-4 bg-gradient-to-r from-blue-50 to-teal-50 rounded-xl border border-blue-200">
                <div className="font-bold text-lg text-gray-900">{selectedPatientData.fullName}</div>
                <div className="text-sm text-gray-700 mt-1">
                  {selectedPatientData.age} years • {selectedPatientData.gender} • {selectedPatientData.folderNumber}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Payment Mode: <span className="font-semibold capitalize">{selectedPatientData.paymentMode || 'cash'}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Attendance Selection */}
        {selectedPatient && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-900">
                <Calendar className="w-5 h-5 text-green-600" />
                Select Attendance
              </h2>
              <button
                onClick={() => handleNewAttendance(selectedPatient)}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all text-sm"
              >
                New Attendance
              </button>
            </div>
            
            {patientAttendances.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm mb-2">No attendances found</p>
                <button
                  onClick={() => handleNewAttendance(selectedPatient)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all text-sm"
                >
                  Create New Attendance
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <select
                    value={selectedAttendance}
                    onChange={(e) => setSelectedAttendance(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none bg-white"
                  >
                    <option value="">Select an attendance...</option>
                    {patientAttendances.map((attendance) => {
                      const aid = getEntityId(attendance);
                      if (!aid) return null;
                      return (
                        <option key={aid} value={aid}>
                          {attendance.attendanceNumber} - {new Date(attendance.dateTime).toLocaleDateString()} - {attendance.status}
                        </option>
                      );
                    })}
                  </select>
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Selected Attendance Details */}
                {selectedAttendanceData && (
                  <div className="p-4 border-2 border-blue-500 bg-blue-50 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-gray-900">
                          {selectedAttendanceData.attendanceNumber}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {new Date(selectedAttendanceData.dateTime).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-600 capitalize">
                          {selectedAttendanceData.attendanceType?.replace('_', ' ')}
                        </div>
                        <div className="text-sm text-gray-600">
                          Payment: <span className="font-semibold capitalize">{selectedAttendanceData.paymentMode}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {/* Bill Amount Display */}
                        {selectedAttendanceData.totalBill > 0 && (
                          <div className="text-right">
                            <div className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                              <DollarSign className="w-4 h-4 text-green-600" />
                              ${selectedAttendanceData.totalBill?.toFixed(2) || '0.00'}
                            </div>
                            <div className="text-xs text-gray-500">
                              Bill
                            </div>
                          </div>
                        )}
                        
                        {/* Status Badge */}
                        <div className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(selectedAttendanceData.status)} flex items-center gap-1`}>
                          {getStatusIcon(selectedAttendanceData.status)}
                          {selectedAttendanceData.status}
                        </div>

                        {/* Edit Button */}
                        <button
                          onClick={() => handleEditAttendance(selectedAttendanceData)}
                          className="p-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors duration-200"
                          title="Edit Attendance"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Authorization Warning */}
                    {requiresAuthorization && paymentMode !== 'cash' && (
                      <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-3">
                        <Shield className="w-5 h-5 text-orange-600 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-orange-800">Insurance Authorization Required</p>
                          <p className="text-xs text-orange-700">
                            Some services require insurance authorization. Please ensure authorization is obtained.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Status Actions */}
                    <div className="flex items-center gap-2 mt-3">
                      {isAttendancePending && (
                        <button
                          onClick={handleActivateAttendance}
                          disabled={activatingAttendance}
                          className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold disabled:opacity-50"
                        >
                          {activatingAttendance ? 'Activating...' : 'Activate Attendance'}
                        </button>
                      )}
                      
                      {(isAttendancePending || isAttendanceActive) && (
                        <button
                          onClick={handleCompleteAttendance}
                          disabled={completingAttendance}
                          className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold disabled:opacity-50"
                        >
                          {completingAttendance ? 'Completing...' : 'Complete Attendance'}
                        </button>
                      )}
                      
                      {!isAttendanceCompleted && (
                        <button
                          onClick={handleCancelAttendance}
                          className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold"
                        >
                          Cancel Attendance
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      {/* Vitals Display - Compact */}
      {selectedAttendanceData && latestVitals && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900">
            <Activity className="w-5 h-5 text-blue-600" />
            Recent Vitals
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 text-sm">
            {/* Blood Pressure */}
            {latestVitals.bloodPressure && (
              <div className="text-center p-3 bg-blue-50 rounded-xl border border-blue-200">
                <Gauge className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                <div className="font-semibold text-gray-900">{latestVitals.bloodPressure}</div>
                <div className="text-xs text-gray-600">BP</div>
              </div>
            )}

            {/* Temperature */}
            {latestVitals.temperature && (
              <div className="text-center p-3 bg-orange-50 rounded-xl border border-orange-200">
                <Thermometer className="w-6 h-6 text-orange-600 mx-auto mb-1" />
                <div className="font-semibold text-gray-900">{latestVitals.temperature}°C</div>
                <div className="text-xs text-gray-600">Temp</div>
              </div>
            )}

            {/* Pulse */}
            {latestVitals.pulse && (
              <div className="text-center p-3 bg-red-50 rounded-xl border border-red-200">
                <Heart className="w-6 h-6 text-red-600 mx-auto mb-1" />
                <div className="font-semibold text-gray-900">{latestVitals.pulse} bpm</div>
                <div className="text-xs text-gray-600">Pulse</div>
              </div>
            )}

            {/* Respiration */}
            {latestVitals.respiration && (
              <div className="text-center p-3 bg-green-50 rounded-xl border border-green-200">
                <Wind className="w-6 h-6 text-green-600 mx-auto mb-1" />
                <div className="font-semibold text-gray-900">{latestVitals.respiration} rpm</div>
                <div className="text-xs text-gray-600">Resp</div>
              </div>
            )}

            {/* SpO2 */}
            {latestVitals.spo2 && (
              <div className="text-center p-3 bg-purple-50 rounded-xl border border-purple-200">
                <Droplets className="w-6 h-6 text-purple-600 mx-auto mb-1" />
                <div className="font-semibold text-gray-900">{latestVitals.spo2}%</div>
                <div className="text-xs text-gray-600">SpO2</div>
              </div>
            )}

            {/* Weight */}
            {latestVitals.weight && (
              <div className="text-center p-3 bg-yellow-50 rounded-xl border border-yellow-200">
                <Scale className="w-6 h-6 text-yellow-600 mx-auto mb-1" />
                <div className="font-semibold text-gray-900">{latestVitals.weight} kg</div>
                <div className="text-xs text-gray-600">Weight</div>
              </div>
            )}

            {/* Height */}
            {latestVitals.height && (
              <div className="text-center p-3 bg-teal-50 rounded-xl border border-teal-200">
                <Ruler className="w-6 h-6 text-teal-600 mx-auto mb-1" />
                <div className="font-semibold text-gray-900">{latestVitals.height} cm</div>
                <div className="text-xs text-gray-600">Height</div>
              </div>
            )}
          </div>
          {latestVitals.bmi && (
            <div className="mt-3 text-sm text-gray-600 text-center">
              Recorded: {new Date(latestVitals.recordedAt).toLocaleDateString()} • BMI: {latestVitals.bmi}
            </div>
          )}
        </div>
      )}
      
{/* Admission Status Display */}
{selectedPatientData && selectedAttendanceData && (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900">
      <Hospital className="w-5 h-5 text-purple-600" />
      Admission Status
    </h3>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-gray-700">
          <strong>Attendance:</strong> {selectedAttendanceData.attendanceNumber}
        </p>
        <p className="text-sm text-gray-600">
          {selectedAttendanceData.attendanceType === 'inpatient' ? 
            'Patient is already admitted as inpatient' : 
            'Outpatient - Can be admitted to ward if needed'
          }
        </p>
        {selectedAttendanceData.attendanceType === 'outpatient' && (
          <p className="text-xs text-blue-600 mt-1">
            Admitting will change attendance type to inpatient
          </p>
        )}
      </div>
      
      {/* SHOW ADMIT BUTTON FOR OUTPATIENTS, NOT INPATIENTS */}
      {selectedAttendanceData.attendanceType === 'outpatient' && 
       selectedAttendanceData.status === 'active' && (
        <Link
          to="/dashboard/admissions"
          state={{ 
            patientId: selectedPatient,
            attendanceId: selectedAttendance,
            patientName: selectedPatientData.fullName,
            attendanceNumber: selectedAttendanceData.attendanceNumber
          }}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all"
        >
          <BedDouble className="w-4 h-4" />
          <span>Admit to Ward</span>
        </Link>
      )}
      
      {/* Show status for inpatients */}
      {selectedAttendanceData.attendanceType === 'inpatient' && (
        <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-xl border border-green-200">
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm font-semibold">Admitted</span>
        </div>
      )}
    </div>
  </div>
)}

      {/* Medical Entries Form - TABBED INTERFACE */}
      {selectedAttendance && canAddEntries && (
        <div className="space-y-6">
          {/* Tab Navigation */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900">
              <FileText className="w-5 h-5 text-blue-600" />
              Medical Entries
            </h2>
            
            <div className="flex border-b border-gray-200 overflow-x-auto">
              {[
                { id: 'clinical', label: 'Clinical Information', icon: Stethoscope, count: tabCounts.clinical },
                { id: 'medications', label: 'Medications', icon: FileText, count: tabCounts.medications },
                { id: 'labs', label: 'Lab Tests', icon: Activity, count: tabCounts.labs },
                { id: 'procedures', label: 'Procedures', icon: Stethoscope, count: tabCounts.procedures },
                { id: 'scans', label: 'Scans', icon: Activity, count: tabCounts.scans },
                { id: 'progress', label: 'Progress Notes', icon: FileText, count: tabCounts.progress }
              ].map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-all whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-blue-600 text-blue-600 font-semibold'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span>{tab.label}</span>
                    {tab.count > 0 && (
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            <div className="mt-6">
              {activeTab === 'clinical' && (
                <ClinicalInformationSection
                  chiefComplaint={chiefComplaint}
                  diagnosis={diagnosis}
                  notes={notes}
                  diagnosisTemplates={diagnoses}
                  isLoadingDiagnoses={isLoading} 
                  onComplaintChange={setChiefComplaint}
                  onDiagnosisChange={setDiagnosis}
                  onNotesChange={setNotes}
                  canAddEntries={canAddEntries}
                  currentUser={user}
                  paymentMode={paymentMode}
                  onSave={(data) => {
                    setChiefComplaint(data.chiefComplaint);
                    setDiagnosis(data.diagnosis);
                    setNotes(data.notes);
                  }}
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
                  paymentMode={paymentMode}
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
                  paymentMode={paymentMode}
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
                  paymentMode={paymentMode}
                  currentUser={user}
                />
              )}

              {activeTab === 'scans' && (
                <ScansSection
                  scans={scans}
                  currentScan={currentScan}
                  onScanChange={setCurrentScan}
                  onAddScan={handleAddScan}
                  canAddEntries={canAddEntries}
                  paymentMode={paymentMode}
                  currentUser={user}
                />
              )}

              {activeTab === 'progress' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Progress Note
                    </label>
                    <textarea
                      placeholder="Enter progress note..."
                      value={currentProgressNote}
                      onChange={(e) => setCurrentProgressNote(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                    />
                  </div>
                  <button
                    onClick={handleAddProgressNote}
                    disabled={!currentProgressNote.trim() || addingProgressNote}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50"
                  >
                    {addingProgressNote ? 'Adding...' : 'Add Progress Note'}
                  </button>

                  {progressNotes.length > 0 && (
                    <div className="mt-4 space-y-3">
                      <h4 className="text-sm font-semibold text-gray-700">Previous Notes</h4>
                      {progressNotes.map((note, index) => (
                        <div key={index} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                          <p className="text-gray-700">{note.note}</p>
                          <div className="text-xs text-gray-500 mt-2">
                            {new Date(note.createdAt).toLocaleString()} • By: {note.createdBy}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSubmitMedicalEntries}
              disabled={isSubmitting}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl hover:from-blue-700 hover:to-teal-700 transition-all duration-200 hover:shadow-xl shadow-lg flex items-center gap-3 text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-6 h-6" />
                  <span>Save Medical Entries</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Read-only view for completed/cancelled attendances */}
      {selectedAttendance && !canAddEntries && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Attendance {selectedAttendanceData?.status?.charAt(0).toUpperCase() + selectedAttendanceData?.status?.slice(1)}
            </h3>
            <p className="text-gray-600 mb-4">
              This attendance has been {selectedAttendanceData?.status}. No further changes can be made to medical entries.
            </p>
            {selectedAttendanceData?.totalBill > 0 && (
              <div className="mt-4 p-4 bg-green-50 rounded-xl border border-green-200">
                <p className="text-lg font-semibold text-green-800">
                  Final Bill: ${selectedAttendanceData.totalBill?.toFixed(2)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Attendance Modal */}
      {showAttendanceModal && selectedAttendanceForEdit && (
        <NewAttendanceModal
          patientId={selectedAttendanceForEdit.patientId}
          onSuccess={handleAttendanceSuccess}
          onClose={handleAttendanceClose}
          isEditMode={isEditMode}
          attendanceData={isEditMode ? selectedAttendanceForEdit : undefined}
        />
      )}
    </div>
  );
}
