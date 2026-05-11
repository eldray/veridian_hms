// src/pages/Nursing.tsx - COMPLETELY REDESIGNED WITH DOSAGE LOGIC
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAttendanceStore } from '../store/attendanceStore';
import { usePatientStore } from '../store/patientStore';
import { useAuthStore } from '../store/authStore';
import { useAdmissionStore } from '../store/admissionStore';
import { useStockStore } from '../store/stockStore';
import { useToast } from '../store/toastStore';
import { VitalsFormModal } from '../components/vitals/VitalsFormModal';
import { 
  ChevronLeft, RefreshCw, Pill, Users, Hospital, Bed, 
  Search, Plus, Clock, CheckCircle, AlertCircle, Syringe,
  FileText, Activity, User, Calendar, TrendingUp, Heart,
  Thermometer, Droplet, Wind, ClipboardList, Send, Save,
  X, Printer, Download, Eye, Trash2, Edit, Filter, History
} from 'lucide-react';

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
  // Default to once if unknown
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

// Medication Card Component with Administration Log
const MedicationCard = ({ medication, onAdminister, isAdministering, selectedAttendanceId, user }: any) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const frequencyInfo = getFrequencyInfo(medication.frequency);
  
  // Get administered doses from the medication object
  const administeredDoses = medication.administeredDoses || [];
  const administeredCount = administeredDoses.length;
  const remainingDoses = frequencyInfo.requiredDoses - administeredCount;
  const isComplete = remainingDoses <= 0;
  
  // Check if next dose is due based on last administration time
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
    return `Next Dose in ~${Math.ceil(frequencyInfo.intervalHours - ((new Date().getTime() - new Date(administeredDoses[administeredDoses.length - 1]?.administeredAt || 0).getTime()) / (1000 * 60 * 60)))} hours`;
  };
  
  const handleAdminister = () => {
    if (canAdminister) {
      onAdminister(medication.id, nextDoseNumber);
    }
  };
  
  return (
    <div className={`border rounded-lg transition-all ${isExpanded ? 'border-teal-300 shadow-md' : 'border-[var(--border-color)]'}`}>
      {/* Main Card */}
      <div className="p-4 hover:bg-[var(--bg-main)] transition-colors">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex-1 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="font-medium text-[var(--text-primary)]">{medication.name}</span>
              <span className="text-xs text-[var(--text-secondary)]">{medication.dosage}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor()}`}>
                {getStatusText()}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div><span className="text-[var(--text-secondary)]">Route:</span> {medication.route || 'Oral'}</div>
              <div><span className="text-[var(--text-secondary)]">Frequency:</span> {frequencyInfo.type}</div>
              <div><span className="text-[var(--text-secondary)]">Duration:</span> {medication.duration}</div>
              <div><span className="text-[var(--text-secondary)]">Progress:</span> {administeredCount}/{frequencyInfo.requiredDoses} doses given</div>
            </div>
          </div>
          
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
        </div>
      </div>
      
      {/* Expanded Administration Log */}
      {isExpanded && (
        <div className="border-t border-[var(--border-color)] p-4 bg-[var(--bg-main)]">
          <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <History className="w-4 h-4 text-teal-500" />
            Administration Log
          </h4>
          
          {administeredDoses.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)] text-center py-4">No doses administered yet</p>
          ) : (
            <div className="space-y-2">
              {/* Show all administered doses */}
              {administeredDoses.map((admin: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        Dose {admin.doseNumber} of {frequencyInfo.requiredDoses}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {new Date(admin.administeredAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    by {admin.administeredBy}
                  </div>
                </div>
              ))}
              
              {/* Show upcoming doses as placeholders */}
              {!isComplete && (
                <div className="mt-3 pt-3 border-t border-dashed border-[var(--border-color)]">
                  <p className="text-xs text-[var(--text-secondary)] mb-2">Upcoming:</p>
                  {Array.from({ length: remainingDoses }, (_, i) => {
                    const doseNum = administeredCount + i + 1;
                    return (
                      <div key={`upcoming-${doseNum}`} className="flex items-center gap-3 p-2 opacity-50">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <Clock className="w-4 h-4 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-sm text-[var(--text-secondary)]">
                            Dose {doseNum} of {frequencyInfo.requiredDoses} (Pending)
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

// Handover Notes Component - Full height
const HandoverNotes = () => {
  const [handoverNotes, setHandoverNotes] = useState('');
  const [handoverHistory, setHandoverHistory] = useState<any[]>(() => {
    const saved = localStorage.getItem('handoverHistory');
    return saved ? JSON.parse(saved) : [];
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { success, error } = useToast();
  const { user } = useAuthStore();
  
  const handleSubmitHandover = async () => {
    if (!handoverNotes.trim()) {
      error('Notes required', 'Please enter handover notes');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const newNote = {
        id: Date.now().toString(),
        content: handoverNotes,
        createdAt: new Date().toISOString(),
        createdBy: user?.fullName || user?.username || 'Unknown',
        shift: new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Night'
      };
      
      const updatedHistory = [newNote, ...handoverHistory];
      setHandoverHistory(updatedHistory);
      localStorage.setItem('handoverHistory', JSON.stringify(updatedHistory));
      setHandoverNotes('');
      success('Handover saved', 'Shift handover notes recorded');
    } catch (err: any) {
      error('Save failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden flex flex-col h-full">
      <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)] flex-shrink-0">
        <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <Send className="w-4 h-4 text-orange-500" />
          Shift Handover Notes
        </h3>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">Important information for next shift</p>
      </div>
      
      <div className="p-4 flex-shrink-0">
        <textarea
          value={handoverNotes}
          onChange={(e) => setHandoverNotes(e.target.value)}
          rows={3}
          placeholder={`Handover for ${new Date().toLocaleDateString()} - ${new Date().getHours() < 12 ? 'Morning' : 'Afternoon'} Shift:\n- Pending tasks\n- Patient status updates\n- Special instructions\n- Family communications\n- Upcoming procedures...`}
          className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm resize-none focus:ring-2 focus:ring-orange-500"
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={handleSubmitHandover}
            disabled={isSubmitting || !handoverNotes.trim()}
            className="flex items-center gap-2 px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm disabled:opacity-50"
          >
            {isSubmitting ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Save Handover
          </button>
        </div>
      </div>
      
      {/* Handover History - Scrollable, extends to bottom */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 pb-4">
        {handoverHistory.length > 0 ? (
          <div className="space-y-3">
            <h4 className="text-xs font-medium text-[var(--text-secondary)] sticky top-0 bg-[var(--bg-card)] py-1">Recent Handovers</h4>
            {handoverHistory.map((note) => (
              <div key={note.id} className="bg-[var(--bg-main)] rounded-lg p-3 border border-[var(--border-color)]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-orange-600">{note.shift} Shift</span>
                    <span className="text-xs text-[var(--text-secondary)]">{new Date(note.createdAt).toLocaleString()}</span>
                  </div>
                  <span className="text-xs text-[var(--text-secondary)]">by {note.createdBy}</span>
                </div>
                <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{note.content}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-[var(--text-secondary)] text-sm py-8">
            No handover notes recorded
          </div>
        )}
      </div>
    </div>
  );
};

// Nursing Notes Component
const NursingNotesTab = ({ admissionId }: { admissionId: string }) => {
  const [dailyNote, setDailyNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addDailyNote, admissions } = useAdmissionStore();
  const { success, error } = useToast();
  const { user } = useAuthStore();
  
  const admission = admissions.find(a => a.id === admissionId);
  const dailyNotes = admission?.dailyNotes ? Object.entries(admission.dailyNotes) : [];
  
  const handleSubmitDailyNote = async () => {
    if (!dailyNote.trim()) {
      error('Notes required', 'Please enter nursing assessment');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await addDailyNote(admissionId, { notes: dailyNote });
      success('Daily note saved', 'Nursing assessment recorded');
      setDailyNote('');
      
      // ✅ Refresh admissions to get updated dailyNotes
      const { getAdmissions } = useAdmissionStore.getState();
      await getAdmissions();
      
    } catch (err: any) {
      error('Save failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-4">
        <h3 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-teal-500" />
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
        />
        <div className="flex justify-end mt-3">
          <button
            onClick={handleSubmitDailyNote}
            disabled={isSubmitting || !dailyNote.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium disabled:opacity-50"
          >
            {isSubmitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            Save Daily Note
          </button>
        </div>
      </div>
      
      {dailyNotes.length > 0 && (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
          <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)]">
            <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-500" />
              Previous Daily Notes
            </h3>
          </div>
          <div className="divide-y divide-[var(--border-color)] max-h-[400px] overflow-y-auto">
            {dailyNotes.sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime()).map(([date, note]: [string, any]) => (
              <div key={date} className="p-4 hover:bg-[var(--bg-main)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{new Date(date).toLocaleDateString()}</span>
                  <span className="text-xs text-[var(--text-secondary)]">by {note.recordedBy?.fullName || note.recordedBy || 'Staff'}</span>
                </div>
                <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{note.notes}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default function Nursing() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const { user } = useAuthStore();
  
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAttendanceId, setSelectedAttendanceId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'medications' | 'nursingNotes' | 'vitals'>('medications');
  const [isAdministering, setIsAdministering] = useState<string | null>(null);
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [vitalsList, setVitalsList] = useState<any[]>([]);
  const [latestVitals, setLatestVitals] = useState<any>(null);
  // ✅ ONLY ONE declaration - use Record type to store medications per attendance
  const [localMedications, setLocalMedications] = useState<Record<string, any[]>>({});
  
  const { attendances, getAttendances, getAttendance, updateMedicationStatus, getVitalsByAttendance, addVitals } = useAttendanceStore();
  const { patients, loadPatients } = usePatientStore();
  const { admissions, getAdmissions } = useAdmissionStore();
  const { stockItems, getStockItems } = useStockStore();
  
  const inpatientAttendances = useMemo(() => attendances.filter(a => a.status === 'admitted'), [attendances]);

  const filteredAttendances = useMemo(() => {
    if (!searchQuery) return inpatientAttendances;
    const lower = searchQuery.toLowerCase();
    return inpatientAttendances.filter(a => {
      const patient = patients.find(p => getEntityId(p) === a.patientId);
      const patientName = patient ? `${patient.surname} ${patient.otherNames}`.toLowerCase() : '';
      const attendanceNumber = (a.attendanceNumber || '').toLowerCase();
      const folderNumber = (patient?.folderNumber || '').toLowerCase();
      
      // Search by patient name, attendance number, or folder number
      return patientName.includes(lower) || 
             attendanceNumber.includes(lower) || 
             folderNumber.includes(lower);
    });
  }, [inpatientAttendances, patients, searchQuery]);
  
  const selectedPatient = patients.find(p => getEntityId(p) === attendances.find(a => getEntityId(a) === selectedAttendanceId)?.patientId);
  const selectedAttendance = attendances.find(a => getEntityId(a) === selectedAttendanceId);
  const activeAdmission = admissions.find(a => a.attendanceId === selectedAttendanceId && a.status === 'admitted');
  
  // ✅ Get medications for current attendance from local state
  const medications = localMedications[selectedAttendanceId] || [];
  const dispensedMeds = medications.filter((m: any) => m.status === 'dispensed' || m.status === 'administered');
  
  const loadData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadPatients(), getAttendances(), getStockItems(), getAdmissions()]);
      success('Data loaded', 'Nursing station ready');
    } catch (err: any) {
      toastError('Load failed', err.message);
    } finally {
      setRefreshing(false);
      setIsLoading(false);
    }
  };
  
  useEffect(() => { loadData(); }, []);
  

  // ✅ Fix the handleAdministerMedication function
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
      
      // Update local state immediately - NO API WAIT
      const updatedMedications = medications.map((m: any) => 
        m.id === medicationId 
          ? { 
              ...m, 
              administeredDoses: updatedDoses, 
              status: isComplete ? 'administered' : 'dispensed',
              administeredAt: new Date().toISOString(),
              administeredById: user?.id
            }
          : m
      );
      
      // Update local state
      setLocalMedications(prev => ({
        ...prev,
        [selectedAttendanceId]: updatedMedications
      }));
      
      // Show success message immediately
      success('Medication administered', `Dose ${doseNumber} recorded as given`);
      
      // Fire and forget - update backend in background without waiting
      updateMedicationStatus(selectedAttendanceId, medicationId, {
        status: isComplete ? 'administered' : 'dispensed',
        administeredAt: new Date().toISOString(),
        administeredById: user?.id,
        doseNumber: doseNumber,
        administeredDoses: updatedDoses
      }).catch(err => {
        console.error('Background sync failed:', err);
        toastError('Sync Error', 'Medication recorded locally but may not have saved to server');
      });
      
    } catch (error: any) {
      toastError('Administer failed', error.message || 'Could not record medication');
    } finally {
      setIsAdministering(null);
    }
  };

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
      // Only initialize if not already in local state
      if (attendance.Medication && !localMedications[attendanceId]) {
        setLocalMedications(prev => ({
          ...prev,
          [attendanceId]: attendance.Medication
        }));
      }
    }
  };
  
  const isAntenatal = selectedAttendance?.attendanceType === 'antenatal';
  

  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
        <div className="text-center bg-[var(--bg-card)] p-8 rounded-xl border border-[var(--border-color)]">
          <div className="w-14 h-14 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Loading Nursing Station...</h2>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)]">
            <ChevronLeft className="w-5 h-5 text-[var(--text-primary)]" />
          </button>
          <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Nursing Station</h1>
            <p className="text-sm text-[var(--text-secondary)]">Medication administration and patient care</p>
          </div>
        </div>
        <button onClick={loadData} disabled={refreshing} className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] text-sm">
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
      
      {/* Two Column Layout - Left column has full height handover notes */}
      <div className="flex gap-6" style={{ minHeight: 'calc(100vh - 140px)' }}>
        {/* LEFT COLUMN - Patient List + Handover Notes (full height) */}
        <div className="w-80 flex-shrink-0 flex flex-col gap-4">
          {/* Patient List */}
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden flex-shrink-0">
            <div className="p-4 border-b border-[var(--border-color)]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                <input
                  type="text"
                  placeholder="Search admitted patients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
            <div className="divide-y divide-[var(--border-color)] max-h-[300px] overflow-y-auto">
              {filteredAttendances.length === 0 ? (
                <div className="p-8 text-center text-[var(--text-secondary)]">
                  <Hospital className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No admitted patients</p>
                </div>
              ) : (
                filteredAttendances.map(attendance => {
                  const patient = patients.find(p => getEntityId(p) === attendance.patientId);
                  const isSelected = getEntityId(attendance) === selectedAttendanceId;
                  const medsCount = attendance.Medication?.filter((m: any) => m.status === 'dispensed').length || 0;
                  return (
                    <div
                      key={attendance.id}
                      onClick={() => handleSelectAttendance(attendance.id!)}
                      className={`p-4 cursor-pointer transition-all hover:bg-[var(--bg-main)] ${isSelected ? 'bg-teal-50 border-l-4 border-teal-500' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-teal-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[var(--text-primary)] truncate">
                            {patient ? `${patient.surname} ${patient.otherNames}` : 'Unknown'}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mt-0.5">
                            <span>{patient?.folderNumber}</span>
                            <span>•</span>
                            <Bed className="w-3 h-3" />
                            <span>{attendance.bed?.bedNumber || '—'}</span>
                          </div>
                        </div>
                        {medsCount > 0 && (
                          <div className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-1 rounded-full">
                            {medsCount}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          
          {/* Handover Notes - Takes remaining height */}
          <div className="flex-1 min-h-0">
            <HandoverNotes />
          </div>
        </div>
        
        {/* RIGHT COLUMN - Patient Details */}
        <div className="flex-1 min-w-0 space-y-4">
          {selectedAttendance && selectedPatient ? (
            <>
              {/* Patient Header */}
              <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                      <User className="w-6 h-6 text-teal-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-[var(--text-primary)]">
                        {selectedPatient.surname} {selectedPatient.otherNames}
                      </h2>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)]">
                        <span>{selectedPatient.gender} • {selectedPatient.age || '?'} years</span>
                        <span>ID: {selectedPatient.folderNumber}</span>
                        <span>Admitted: {new Date(selectedAttendance.dateTime).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={selectedAttendance.status} />
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
              
              {/* Latest Vitals Summary */}
              {latestVitals && (
                <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-4">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-teal-500" />
                    Latest Vitals ({new Date(latestVitals.recordedAt).toLocaleString()})
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {latestVitals.bloodPressure && <div><p className="text-xs text-[var(--text-secondary)]">BP</p><p className="font-semibold">{latestVitals.bloodPressure}</p></div>}
                    {latestVitals.temperature && <div><p className="text-xs text-[var(--text-secondary)]">Temp</p><p className="font-semibold">{latestVitals.temperature}°C</p></div>}
                    {latestVitals.pulse && <div><p className="text-xs text-[var(--text-secondary)]">Pulse</p><p className="font-semibold">{latestVitals.pulse}</p></div>}
                    {latestVitals.respiration && <div><p className="text-xs text-[var(--text-secondary)]">Resp</p><p className="font-semibold">{latestVitals.respiration}</p></div>}
                    {latestVitals.spo2 && <div><p className="text-xs text-[var(--text-secondary)]">SpO2</p><p className="font-semibold">{latestVitals.spo2}%</p></div>}
                    {isAntenatal && latestVitals.fetalHeartRate && (
                      <div><p className="text-xs text-[var(--text-secondary)]">FHR</p><p className="font-semibold">{latestVitals.fetalHeartRate}</p></div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Tabs */}
              <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                <div className="border-b border-[var(--border-color)] px-4">
                  <div className="flex gap-6">
                    <button onClick={() => setActiveTab('medications')} className={`py-3 px-1 text-sm font-medium border-b-2 transition-all ${activeTab === 'medications' ? 'border-teal-500 text-teal-600' : 'border-transparent text-[var(--text-secondary)]'}`}>
                      <Pill className="w-4 h-4 inline mr-1" />
                      Medications ({dispensedMeds.length})
                    </button>
                    <button onClick={() => setActiveTab('nursingNotes')} className={`py-3 px-1 text-sm font-medium border-b-2 transition-all ${activeTab === 'nursingNotes' ? 'border-teal-500 text-teal-600' : 'border-transparent text-[var(--text-secondary)]'}`}>
                      <FileText className="w-4 h-4 inline mr-1" />
                      Nursing Notes
                    </button>
                    <button onClick={() => setActiveTab('vitals')} className={`py-3 px-1 text-sm font-medium border-b-2 transition-all ${activeTab === 'vitals' ? 'border-teal-500 text-teal-600' : 'border-transparent text-[var(--text-secondary)]'}`}>
                      <Activity className="w-4 h-4 inline mr-1" />
                      Vitals History
                    </button>
                  </div>
                </div>
                
                <div className="p-5 max-h-[500px] overflow-y-auto">
                  {activeTab === 'medications' && (
                    <div className="space-y-4">
                      {dispensedMeds.length === 0 ? (
                        <div className="text-center py-12 bg-[var(--bg-main)] rounded-lg">
                          <Pill className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
                          <p className="text-[var(--text-secondary)]">No medications ready for administration</p>
                        </div>
                      ) : (
                        dispensedMeds.map((med: any) => (
                          <MedicationCard
                            key={med.id}
                            medication={med}
                            onAdminister={handleAdministerMedication}
                            isAdministering={isAdministering === med.id}
                            selectedAttendanceId={selectedAttendanceId}
                            user={user}
                          />
                        ))
                      )}
                    </div>
                  )}
                  
                  {activeTab === 'nursingNotes' && activeAdmission && (
                    <NursingNotesTab admissionId={activeAdmission.id} />
                  )}
                  
                  {activeTab === 'vitals' && (
                    <div className="space-y-4">
                      {vitalsList.length === 0 ? (
                        <div className="text-center py-12 bg-[var(--bg-main)] rounded-lg">
                          <Activity className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
                          <p className="text-[var(--text-secondary)]">No vitals recorded for this admission</p>
                          <button onClick={() => setShowVitalsModal(true)} className="mt-3 text-teal-600 text-sm">Record First Vitals</button>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                              <tr>
                                <th className="px-3 py-2 text-left">Date/Time</th>
                                <th className="px-3 py-2 text-left">BP</th>
                                <th className="px-3 py-2 text-left">Temp</th>
                                <th className="px-3 py-2 text-left">Pulse</th>
                                <th className="px-3 py-2 text-left">Resp</th>
                                <th className="px-3 py-2 text-left">SpO2</th>
                                {isAntenatal && <th className="px-3 py-2 text-left">FHR</th>}
                                <th className="px-3 py-2 text-left">Recorded By</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-color)]">
                              {vitalsList.map((vital: any) => (
                                <tr key={vital.id} className="hover:bg-[var(--bg-main)]">
                                  <td className="px-3 py-2">{new Date(vital.recordedAt).toLocaleString()}</td>
                                  <td className="px-3 py-2">{vital.bloodPressure || '-'}</td>
                                  <td className="px-3 py-2">{vital.temperature ? `${vital.temperature}°C` : '-'}</td>
                                  <td className="px-3 py-2">{vital.pulse || '-'}</td>
                                  <td className="px-3 py-2">{vital.respiration || '-'}</td>
                                  <td className="px-3 py-2">{vital.spo2 ? `${vital.spo2}%` : '-'}</td>
                                  {isAntenatal && <td className="px-3 py-2">{vital.fetalHeartRate || '-'}</td>}
                                  <td className="px-3 py-2 text-[var(--text-secondary)]">{vital.recordedBy?.fullName || '—'}</td>
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
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-12 text-center">
              <Hospital className="w-16 h-16 text-[var(--text-tertiary)] mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Select a Patient</h3>
              <p className="text-[var(--text-secondary)] text-sm">Choose an admitted patient from the list to manage their care</p>
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
    </div>
  );
}