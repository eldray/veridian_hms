// src/pages/Nursing.tsx - UPDATED with proper admission type handling
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAttendanceStore } from '../store/attendanceStore';
import { usePatientStore } from '../store/patientStore';
import { useAuthStore } from '../store/authStore';
import { useAdmissionStore } from '../store/admissionStore';
import { useWardStore } from '../store/wardStore';
import { useStockStore } from '../store/stockStore';
import { useToast } from '../store/toastStore';
import { useHospitalStore } from '../store/hospitalStore';
import { VitalsFormModal } from '../components/vitals/VitalsFormModal';
import { generatePDF, openPrintWindow } from '../utils/pdfGenerator';
import { 
  ChevronLeft, RefreshCw, Pill, Users, Hospital, Bed, 
  Search, Plus, Clock, CheckCircle, AlertCircle, Syringe,
  FileText, Activity, User, Calendar, TrendingUp, Heart,
  Thermometer, Droplet, Wind, ClipboardList, Send, Save,
  X, Printer, Download, Eye, Trash2, Edit, Filter, History,
  AlertTriangle, Stethoscope, Baby, Shield, LogOut, Building,
  ListTodo, ClipboardCheck, Phone, Mail, MapPin, UserCheck,
  Flag, Bell, ChevronRight, MoreVertical, Play, Pause,
  Moon, Sun, Building2
} from 'lucide-react';

// Import components
import { PatientSummarySidebar } from '../components/nursing/PatientSummarySidebar';
import { ShiftHandoverModal } from '../components/nursing/ShiftHandoverModal';
import { NursingTaskList } from '../components/nursing/NursingTaskList';
import { NursingDashboardStats } from '../components/nursing/NursingDashboardStats';

const getEntityId = (entity: { id?: string; _id?: string } | null): string | undefined => {
  return entity?._id || entity?.id;
};

// Helper to determine frequency type and calculate required doses
const getFrequencyInfo = (frequency: string): { type: string; requiredDoses: number; intervalHours: number } => {
  const freq = frequency?.toLowerCase() || '';
  
  if (freq.includes('once') || freq === 'od' || freq === 'stat' || freq === 'daily') {
    return { type: 'Once Daily (OD)', requiredDoses: 1, intervalHours: 24 };
  }
  if (freq.includes('bd') || freq === 'twice' || freq === '12hrly') {
    return { type: 'Twice Daily (BD)', requiredDoses: 2, intervalHours: 12 };
  }
  if (freq.includes('tds') || freq === 'thrice' || freq === '8hrly') {
    return { type: 'Three Times Daily (TDS)', requiredDoses: 3, intervalHours: 8 };
  }
  if (freq.includes('qid') || freq === 'four' || freq === '6hrly') {
    return { type: 'Four Times Daily (QID)', requiredDoses: 4, intervalHours: 6 };
  }
  return { type: 'Once Daily (OD)', requiredDoses: 1, intervalHours: 24 };
};

// Status Badge Component
const StatusBadge = ({ status }: { status: string }) => {
  const config: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    admitted: 'bg-blue-100 text-blue-800',
    discharged: 'bg-green-100 text-green-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };
  const className = config[status?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>{status}</span>;
};

// Patient Type Badge Component
const PatientTypeBadge = ({ attendance, admissionType }: { attendance: any; admissionType?: string }) => {
  const category = attendance?.encounterCategory;
  const admType = admissionType || attendance?.admissionType;
  
  if (category === 'daycase') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200">
        <Sun className="w-3 h-3" />
        Day Surgery
      </span>
    );
  }
  if (admType === 'detention_observation') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">
        <Moon className="w-3 h-3" />
        Observation (Detention)
      </span>
    );
  }
  if (admType === 'antenatal_observation') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-700 border border-pink-200">
        <Baby className="w-3 h-3" />
        Antenatal Observation
      </span>
    );
  }
  if (admType === 'delivery') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
        <Hospital className="w-3 h-3" />
        In Labor / Delivery
      </span>
    );
  }
  if (admType === 'postpartum_observation') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-cyan-100 text-cyan-700 border border-cyan-200">
        <Heart className="w-3 h-3" />
        Postpartum Observation
      </span>
    );
  }
  if (category === 'ipd' && (!admType || admType === 'emergency' || admType === 'elective' || admType === 'transfer')) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
        <Hospital className="w-3 h-3" />
        IPD Admission
      </span>
    );
  }
  return null;
};

// Medication Card Component with Administration Log
const MedicationCard = ({ medication, onAdminister, onMissed, isAdministering, selectedAttendanceId, user, onViewDetails }: any) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const frequencyInfo = getFrequencyInfo(medication.frequency);
  
  const administeredDoses = medication.administeredDoses || [];
  const administeredCount = administeredDoses.length;
  const remainingDoses = frequencyInfo.requiredDoses - administeredCount;
  const isComplete = remainingDoses <= 0;
  
  const isNextDoseDue = () => {
    if (isComplete) return false;
    if (administeredCount === 0) return true;
    
    const lastDose = administeredDoses[administeredDoses.length - 1];
    if (!lastDose) return true;
    
    const lastTime = new Date(lastDose.administeredAt).getTime();
    const now = new Date().getTime();
    const hoursSince = (now - lastTime) / (1000 * 60 * 60);
    
    return hoursSince >= frequencyInfo.intervalHours;
  };
  
  const canAdminister = !isComplete && isNextDoseDue();
  const nextDoseNumber = administeredCount + 1;
  
  const getStatusColor = () => {
    if (isComplete) return 'bg-green-100 text-green-800 border-green-200';
    if (canAdminister) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };
  
  const getStatusText = () => {
    if (isComplete) return 'Completed';
    if (canAdminister) return `Due for Dose ${nextDoseNumber}/${frequencyInfo.requiredDoses}`;
    const lastDoseTime = administeredDoses[administeredDoses.length - 1]?.administeredAt;
    if (lastDoseTime) {
      const hoursUntilNext = Math.ceil(frequencyInfo.intervalHours - ((new Date().getTime() - new Date(lastDoseTime).getTime()) / (1000 * 60 * 60)));
      return `Next dose in ~${hoursUntilNext} hours`;
    }
    return 'Pending';
  };
  
  const handleAdminister = () => {
    if (canAdminister) {
      onAdminister(medication.id, nextDoseNumber);
    }
  };
  
  const handleMissed = () => {
    if (confirm(`Mark dose ${nextDoseNumber} as missed? This will record that the dose was not given.`)) {
      onMissed(medication.id, nextDoseNumber);
    }
  };
  
  return (
    <div className={`border rounded-lg transition-all ${isExpanded ? 'border-teal-300 shadow-md' : 'border-gray-200'}`}>
      <div className="p-4 hover:bg-gray-50 transition-colors">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex-1 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="font-medium text-gray-900">{medication.name}</span>
              <span className="text-xs text-gray-500">{medication.dosage}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor()}`}>
                {getStatusText()}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div><span className="text-gray-500">Route:</span> {medication.route || 'Oral'}</div>
              <div><span className="text-gray-500">Frequency:</span> {frequencyInfo.type}</div>
              <div><span className="text-gray-500">Duration:</span> {medication.duration}</div>
              <div><span className="text-gray-500">Progress:</span> {administeredCount}/{frequencyInfo.requiredDoses} doses given</div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleMissed}
              disabled={!canAdminister || isComplete || isAdministering}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                canAdminister && !isComplete
                  ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              title="Mark as Missed"
            >
              <X className="w-3.5 h-3.5" />
              Miss
            </button>
            <button
              onClick={handleAdminister}
              disabled={!canAdminister || isAdministering}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                canAdminister 
                  ? 'bg-green-600 text-white hover:bg-green-700' 
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isAdministering ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Syringe className="w-4 h-4" />
              )}
              {canAdminister ? `Administer Dose ${nextDoseNumber}` : isComplete ? 'Completed' : 'Wait for Next Dose'}
            </button>
            <button
              onClick={() => onViewDetails?.(medication)}
              className="p-2 text-gray-500 hover:text-teal-600 rounded-lg"
              title="View Details"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <History className="w-4 h-4 text-teal-500" />
            Administration Log
          </h4>
          
          {administeredDoses.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No doses administered yet</p>
          ) : (
            <div className="space-y-2">
              {administeredDoses.map((admin: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Dose {admin.doseNumber} of {frequencyInfo.requiredDoses}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(admin.administeredAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    by {admin.administeredBy}
                  </div>
                </div>
              ))}
              
              {!isComplete && (
                <div className="mt-3 pt-3 border-t border-dashed border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">Upcoming:</p>
                  {Array.from({ length: remainingDoses }, (_, i) => {
                    const doseNum = administeredCount + i + 1;
                    const isCurrent = i === 0 && canAdminister;
                    return (
                      <div key={`upcoming-${doseNum}`} className={`flex items-center gap-3 p-2 ${isCurrent ? 'bg-yellow-50 rounded-lg' : 'opacity-70'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isCurrent ? 'bg-yellow-100' : 'bg-gray-100'}`}>
                          {isCurrent ? <Play className="w-4 h-4 text-yellow-600" /> : <Clock className="w-4 h-4 text-gray-400" />}
                        </div>
                        <div>
                          <p className={`text-sm ${isCurrent ? 'font-medium text-yellow-800' : 'text-gray-500'}`}>
                            Dose {doseNum} of {frequencyInfo.requiredDoses} {isCurrent ? '(Due Now)' : '(Pending)'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function Nursing() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const { user } = useAuthStore();
  const { hospital } = useHospitalStore();
  
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAttendanceId, setSelectedAttendanceId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'medications' | 'tasks' | 'vitals'>('medications');
  const [isAdministering, setIsAdministering] = useState<string | null>(null);
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [vitalsList, setVitalsList] = useState<any[]>([]);
  const [latestVitals, setLatestVitals] = useState<any>(null);
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [localMedications, setLocalMedications] = useState<Record<string, any[]>>({});
  const [localTasks, setLocalTasks] = useState<Record<string, any[]>>({});
  
  const { attendances, getAttendances, getAttendance, updateMedicationStatus, getVitalsByAttendance, addVitals } = useAttendanceStore();
  const { patients, loadPatients } = usePatientStore();
  const { admissions, getAdmissions, addDailyNote, getDetentionPatients, getFormalIPDPatients } = useAdmissionStore();
  const { stockItems, getStockItems } = useStockStore();
  const { wards, getWards, beds, getBeds } = useWardStore();
  
  // Get all admitted patients from attendances (IPD, Daycase, and Detention)
  const inpatientAttendances = useMemo(() => {
    return attendances.filter(a => 
      a.status === 'admitted' && 
      (a.encounterCategory === 'ipd' || a.encounterCategory === 'daycase')
    );
  }, [attendances]);

  const filteredAttendances = useMemo(() => {
    if (!searchQuery) return inpatientAttendances;
    const lower = searchQuery.toLowerCase();
    return inpatientAttendances.filter(a => {
      const patient = patients.find(p => getEntityId(p) === a.patientId);
      const patientName = patient ? `${patient.surname} ${patient.otherNames}`.toLowerCase() : '';
      const attendanceNumber = (a.attendanceNumber || '').toLowerCase();
      const folderNumber = (patient?.folderNumber || '').toLowerCase();
      
      return patientName.includes(lower) || attendanceNumber.includes(lower) || folderNumber.includes(lower);
    });
  }, [inpatientAttendances, patients, searchQuery]);
  
  const selectedPatient = patients.find(p => getEntityId(p) === attendances.find(a => getEntityId(a) === selectedAttendanceId)?.patientId);
  const selectedAttendance = attendances.find(a => getEntityId(a) === selectedAttendanceId);
  const activeAdmission = admissions.find(a => a.attendanceId === selectedAttendanceId && !a.dischargeDate);
  
  const medications = localMedications[selectedAttendanceId] || [];
  const dispensedMeds = medications.filter((m: any) => m.status === 'dispensed' || m.status === 'administered');
  const pendingTasks = localTasks[selectedAttendanceId] || [];
  
  const loadData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadPatients(), 
        getAttendances(), 
        getStockItems(), 
        getAdmissions(),
        getWards(),
        getBeds(),
        getDetentionPatients(),
        getFormalIPDPatients()
      ]);
      
      // Load medications for each admitted patient
      for (const attendance of inpatientAttendances) {
        if (attendance.Medication && !localMedications[attendance.id]) {
          setLocalMedications(prev => ({ ...prev, [attendance.id]: attendance.Medication }));
        }
      }
      success('Data loaded', 'Nursing station ready');
    } catch (err: any) {
      toastError('Load failed', err.message);
    } finally {
      setRefreshing(false);
      setIsLoading(false);
    }
  };
  
  useEffect(() => { loadData(); }, []);
  
  useEffect(() => {
    const loadVitals = async () => {
      if (selectedAttendanceId) {
        try {
          const vitals = await getVitalsByAttendance(selectedAttendanceId);
          setVitalsList(Array.isArray(vitals) ? vitals : []);
          setLatestVitals(vitals?.length ? vitals[vitals.length - 1] : null);
        } catch (err) {
          setVitalsList([]);
          setLatestVitals(null);
        }
      }
    };
    loadVitals();
  }, [selectedAttendanceId, getVitalsByAttendance]);
  
  const handleAdministerMedication = async (medicationId: string, doseNumber: number) => {
    if (!selectedAttendanceId || !user) return;
    
    setIsAdministering(medicationId);
    try {
      const medication = medications.find((m: any) => m.id === medicationId);
      if (!medication) return;
      
      const frequencyInfo = getFrequencyInfo(medication.frequency);
      const existingAdmins = medication.administeredDoses || [];
      const isComplete = existingAdmins.length + 1 >= frequencyInfo.requiredDoses;
      
      const updatedDoses = [...existingAdmins, {
        doseNumber: doseNumber,
        administeredAt: new Date().toISOString(),
        administeredBy: user?.fullName || user?.username
      }];
      
      const updatedMedications = medications.map((m: any) => 
        m.id === medicationId 
          ? { ...m, administeredDoses: updatedDoses, status: isComplete ? 'administered' : 'dispensed' }
          : m
      );
      
      setLocalMedications(prev => ({ ...prev, [selectedAttendanceId]: updatedMedications }));
      success('Medication administered', `Dose ${doseNumber} recorded as given`);
      
      updateMedicationStatus(selectedAttendanceId, medicationId, {
        status: isComplete ? 'administered' : 'dispensed',
        administeredAt: new Date().toISOString(),
        administeredById: user?.id,
        doseNumber: doseNumber,
        administeredDoses: updatedDoses
      }).catch(err => console.error('Background sync failed:', err));
      
    } catch (error: any) {
      toastError('Administer failed', error.message || 'Could not record medication');
    } finally {
      setIsAdministering(null);
    }
  };
  
  const handleMissedMedication = async (medicationId: string, doseNumber: number) => {
    if (!selectedAttendanceId || !user) return;
    
    try {
      const medication = medications.find((m: any) => m.id === medicationId);
      if (!medication) return;
      
      const missedDoses = medication.missedDoses || [];
      const updatedMissed = [...missedDoses, {
        doseNumber: doseNumber,
        missedAt: new Date().toISOString(),
        missedBy: user?.fullName || user?.username,
        reason: 'Not administered'
      }];
      
      const updatedMedications = medications.map((m: any) => 
        m.id === medicationId ? { ...m, missedDoses: updatedMissed } : m
      );
      
      setLocalMedications(prev => ({ ...prev, [selectedAttendanceId]: updatedMedications }));
      success('Medication marked', `Dose ${doseNumber} recorded as missed`);
      
    } catch (error: any) {
      toastError('Failed', error.message || 'Could not record missed dose');
    }
  };
  
  const handleSubmitVitals = async (vitalsData: any) => {
    if (!selectedAttendanceId) return;
    try {
      await addVitals(selectedAttendanceId, { ...vitalsData, recordedAt: new Date().toISOString(), recordedById: user?.id });
      success('Vitals Recorded', 'Vitals recorded successfully');
      const updatedVitals = await getVitalsByAttendance(selectedAttendanceId);
      setVitalsList(updatedVitals || []);
      setLatestVitals(updatedVitals?.length ? updatedVitals[updatedVitals.length - 1] : null);
      setShowVitalsModal(false);
    } catch (err: any) {
      toastError('Save Failed', err.message);
    }
  };
  
  const handleSelectAttendance = (attendanceId: string) => {
    const attendance = attendances.find(a => getEntityId(a) === attendanceId);
    if (attendance) {
      setSelectedAttendanceId(attendanceId);
      if (attendance.Medication && !localMedications[attendanceId]) {
        setLocalMedications(prev => ({ ...prev, [attendanceId]: attendance.Medication }));
      }
    }
  };
  
  const handleHandoverComplete = async (handoverData: any) => {
    if (activeAdmission) {
      await addDailyNote(activeAdmission.id, { notes: handoverData.notes });
    }
    success('Handover Saved', 'Shift handover recorded successfully');
    setShowHandoverModal(false);
  };
  
  const isAntenatal = selectedAttendance?.attendanceType === 'antenatal';
  const isDetention = selectedAttendance?.admissionType === 'detention_observation';
  
  // Calculate dashboard stats
  const dashboardStats = {
    admittedCount: inpatientAttendances.length,
    ipdCount: inpatientAttendances.filter(a => a.encounterCategory === 'ipd' && a.admissionType !== 'detention_observation').length,
    detentionCount: inpatientAttendances.filter(a => a.admissionType === 'detention_observation').length,
    daySurgeryCount: inpatientAttendances.filter(a => a.encounterCategory === 'daycase').length,
    pendingDischarges: admissions.filter(a => a.dischargeDate && a.status === 'admitted').length,
    medicationsDueToday: dispensedMeds.filter(m => {
      const freq = getFrequencyInfo(m.frequency);
      const lastAdmin = m.administeredDoses?.[m.administeredDoses.length - 1];
      if (!lastAdmin && m.status === 'dispensed') return true;
      if (lastAdmin) {
        const hoursSince = (new Date().getTime() - new Date(lastAdmin.administeredAt).getTime()) / (1000 * 60 * 60);
        return hoursSince >= freq.intervalHours;
      }
      return false;
    }).length,
    criticalAlerts: (() => {
      let alerts = 0;
      if (latestVitals) {
        if (latestVitals.bloodPressure) {
          const [sys] = latestVitals.bloodPressure.split('/').map(Number);
          if (sys > 180 || sys < 90) alerts++;
        }
        if (latestVitals.temperature && (latestVitals.temperature > 39 || latestVitals.temperature < 35)) alerts++;
        if (latestVitals.spo2 && latestVitals.spo2 < 90) alerts++;
        if (latestVitals.pulse && (latestVitals.pulse > 120 || latestVitals.pulse < 50)) alerts++;
      }
      return alerts;
    })()
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
          <div className="w-14 h-14 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <h2 className="text-xl font-bold text-gray-900">Loading Nursing Station...</h2>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-gray-100 rounded-lg border border-gray-200">
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Nursing Station</h1>
            <p className="text-sm text-gray-500">Medication administration, patient care, and shift handover</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {dashboardStats.admittedCount} total • {dashboardStats.ipdCount} IPD • {dashboardStats.detentionCount} Observation • {dashboardStats.daySurgeryCount} Day Surgery
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/dashboard/wards')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-700 hover:text-white transition-all text-sm font-medium"
          >
            <Building2 className="w-4 h-4" />
            Ward Management
          </button>
          <button
            onClick={() => navigate('/dashboard/admissions')}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 text-sm"
          >
            <Hospital className="w-4 h-4" />
            Admissions
          </button>
          <button
            onClick={() => setShowHandoverModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium"
          >
            <Send className="w-4 h-4" />
            Shift Handover
          </button>
          <button onClick={loadData} disabled={refreshing} className="flex items-center gap-2 px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 text-sm">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>
      
      {/* Dashboard Stats */}
      <NursingDashboardStats stats={dashboardStats} />
      
      {/* Two Column Layout */}
      <div className="flex gap-6" style={{ minHeight: 'calc(100vh - 280px)' }}>
        {/* LEFT COLUMN - Patient List */}
        <div className="w-80 flex-shrink-0 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search admitted patients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
          <div className="divide-y divide-gray-200 flex-1 overflow-y-auto">
            {filteredAttendances.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Hospital className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No admitted patients</p>
              </div>
            ) : (
              filteredAttendances.map(attendance => {
                const patient = patients.find(p => getEntityId(p) === attendance.patientId);
                const isSelected = getEntityId(attendance) === selectedAttendanceId;
                const patientMeds = localMedications[attendance.id] || [];
                const pendingMedsCount = patientMeds.filter((m: any) => m.status === 'dispensed' && (!m.administeredDoses || m.administeredDoses.length < getFrequencyInfo(m.frequency).requiredDoses)).length;
                
                return (
                  <div
                    key={attendance.id}
                    onClick={() => handleSelectAttendance(attendance.id!)}
                    className={`p-4 cursor-pointer transition-all hover:bg-gray-50 ${isSelected ? 'bg-teal-50 border-l-4 border-teal-500' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-teal-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {patient ? `${patient.surname} ${patient.otherNames}` : 'Unknown'}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                          <span>{patient?.folderNumber}</span>
                          <span>•</span>
                          <Bed className="w-3 h-3" />
                          <span>{attendance.Bed?.bedNumber || attendance.bed?.bedNumber || '—'}</span>
                        </div>
                        <div className="mt-1">
                          <PatientTypeBadge attendance={attendance} admissionType={attendance.admissionType} />
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {pendingMedsCount > 0 && (
                          <div className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-0.5 rounded-full">
                            {pendingMedsCount} meds
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
        
        {/* RIGHT COLUMN - Patient Details */}
        <div className="flex-1 min-w-0">
          {selectedAttendance && selectedPatient ? (
            <>
              {/* Patient Header */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                      <User className="w-6 h-6 text-teal-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">
                        {selectedPatient.surname} {selectedPatient.otherNames}
                      </h2>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                        <span>{selectedPatient.gender} • {selectedPatient.age || '?'} years</span>
                        <span>ID: {selectedPatient.folderNumber}</span>
                        <span>Admitted: {new Date(selectedAttendance.dateTime).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={selectedAttendance.status} />
                    <PatientTypeBadge attendance={selectedAttendance} admissionType={selectedAttendance.admissionType} />
                    {activeAdmission && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        {activeAdmission.admissionNumber}
                      </span>
                    )}
                    <button
                      onClick={() => setShowVitalsModal(true)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm"
                    >
                      <Activity className="w-3.5 h-3.5" />
                      Record Vitals
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Patient Summary Sidebar */}
              <PatientSummarySidebar
                patient={selectedPatient}
                attendance={selectedAttendance}
                admission={activeAdmission}
                latestVitals={latestVitals}
                vitalsHistory={vitalsList}
                medications={dispensedMeds}
                tasks={pendingTasks}
                isAntenatal={isAntenatal}
              />
              
              {/* Tabs */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mt-4 shadow-sm">
                <div className="border-b border-gray-200 px-4">
                  <div className="flex gap-6">
                    <button onClick={() => setActiveTab('medications')} className={`py-3 px-1 text-sm font-medium border-b-2 transition-all ${activeTab === 'medications' ? 'border-teal-500 text-teal-600' : 'border-transparent text-gray-500'}`}>
                      <Pill className="w-4 h-4 inline mr-1" />
                      Medications ({dispensedMeds.length})
                    </button>
                    <button onClick={() => setActiveTab('tasks')} className={`py-3 px-1 text-sm font-medium border-b-2 transition-all ${activeTab === 'tasks' ? 'border-teal-500 text-teal-600' : 'border-transparent text-gray-500'}`}>
                      <ListTodo className="w-4 h-4 inline mr-1" />
                      Care Plan / Tasks ({pendingTasks.length})
                    </button>
                    <button onClick={() => setActiveTab('vitals')} className={`py-3 px-1 text-sm font-medium border-b-2 transition-all ${activeTab === 'vitals' ? 'border-teal-500 text-teal-600' : 'border-transparent text-gray-500'}`}>
                      <Activity className="w-4 h-4 inline mr-1" />
                      Vitals History ({vitalsList.length})
                    </button>
                  </div>
                </div>
                
                <div className="p-5 max-h-[450px] overflow-y-auto">
                  {activeTab === 'medications' && (
                    <div className="space-y-4">
                      {dispensedMeds.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-lg">
                          <Pill className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-500">No medications ready for administration</p>
                          {isDetention && (
                            <p className="text-xs text-orange-500 mt-2">Detention patients may have fewer medications</p>
                          )}
                        </div>
                      ) : (
                        dispensedMeds.map((med: any) => (
                          <MedicationCard
                            key={med.id}
                            medication={med}
                            onAdminister={handleAdministerMedication}
                            onMissed={handleMissedMedication}
                            isAdministering={isAdministering === med.id}
                            selectedAttendanceId={selectedAttendanceId}
                            user={user}
                            onViewDetails={() => {}}
                          />
                        ))
                      )}
                    </div>
                  )}
                  
                  {activeTab === 'tasks' && (
                    <NursingTaskList
                      tasks={pendingTasks}
                      patientId={selectedPatient.id}
                      attendanceId={selectedAttendanceId}
                      admissionId={activeAdmission?.id}
                      onTaskComplete={(taskId) => {
                        setLocalTasks(prev => ({
                          ...prev,
                          [selectedAttendanceId]: (prev[selectedAttendanceId] || []).map(t => 
                            t.id === taskId ? { ...t, status: 'completed', completedAt: new Date() } : t
                          )
                        }));
                        success('Task Completed', 'Task marked as completed');
                      }}
                      onAddTask={() => setShowTaskModal(true)}
                    />
                  )}
                  
                  {activeTab === 'vitals' && (
                    <div className="space-y-4">
                      {vitalsList.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-lg">
                          <Activity className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-500">No vitals recorded for this admission</p>
                          <button onClick={() => setShowVitalsModal(true)} className="mt-3 text-teal-600 text-sm">Record First Vitals</button>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                              <tr>
                                <th className="px-3 py-2 text-left text-gray-600">Date/Time</th>
                                <th className="px-3 py-2 text-left text-gray-600">BP</th>
                                <th className="px-3 py-2 text-left text-gray-600">Temp</th>
                                <th className="px-3 py-2 text-left text-gray-600">Pulse</th>
                                <th className="px-3 py-2 text-left text-gray-600">Resp</th>
                                <th className="px-3 py-2 text-left text-gray-600">SpO2</th>
                                {isAntenatal && <th className="px-3 py-2 text-left text-gray-600">FHR</th>}
                                <th className="px-3 py-2 text-left text-gray-600">Recorded By</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {vitalsList.map((vital: any) => (
                                <tr key={vital.id} className="hover:bg-gray-50">
                                  <td className="px-3 py-2 text-gray-700">{new Date(vital.recordedAt).toLocaleString()}</td>
                                  <td className="px-3 py-2 font-mono text-gray-700">{vital.bloodPressure || '-'}</td>
                                  <td className="px-3 py-2">{vital.temperature ? `${vital.temperature}°C` : '-'}</td>
                                  <td className="px-3 py-2">{vital.pulse || '-'}</td>
                                  <td className="px-3 py-2">{vital.respiration || '-'}</td>
                                  <td className="px-3 py-2">{vital.spo2 ? `${vital.spo2}%` : '-'}</td>
                                  {isAntenatal && <td className="px-3 py-2">{vital.fetalHeartRate || '-'}</td>}
                                  <td className="px-3 py-2 text-gray-500">{vital.recordedBy?.fullName || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
              <Hospital className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Patient</h3>
              <p className="text-gray-500 text-sm">Choose an admitted patient from the list to manage their care</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Vitals Modal */}
      <VitalsFormModal
        isOpen={showVitalsModal}
        onClose={() => setShowVitalsModal(false)}
        onSubmit={handleSubmitVitals}
        isLoading={false}
        isAntenatal={isAntenatal}
        attendanceId={selectedAttendanceId}
        attendanceType={selectedAttendance?.attendanceType}
      />
      
      {/* Shift Handover Modal */}
      <ShiftHandoverModal
        isOpen={showHandoverModal}
        onClose={() => setShowHandoverModal(false)}
        onComplete={handleHandoverComplete}
        patients={filteredAttendances.map(a => {
          const p = patients.find(pa => getEntityId(pa) === a.patientId);
          return {
            id: a.id,
            patientId: a.patientId,
            patientName: p ? `${p.surname} ${p.otherNames}` : 'Unknown',
            bedNumber: a.Bed?.bedNumber || a.bed?.bedNumber,
            admissionType: a.admissionType,
            encounterCategory: a.encounterCategory,
            tasks: localTasks[a.id] || []
          };
        })}
        currentUser={user}
        hospital={hospital}
      />
    </div>
  );
}