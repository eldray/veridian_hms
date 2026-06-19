// src/pages/LabResultEntry.tsx - Laboratory Results Entry Page
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAttendanceStore } from '../store/attendanceStore';
import { usePatientStore } from '../store/patientStore';
import { useAuthStore } from '../store/authStore';
import { useMedicalServicesStore } from '../store/medicalServicesStore';
import { useToast } from '../store/toastStore';
import { PatientAttendanceSelector } from '../components/vitals/PatientAttendanceSelector';
import { LabTestModal } from '../components/medical-entries/modals/LabTestModal';
import {
  ChevronLeft,
  FlaskConical,
  Printer,
  RefreshCw,
  AlertCircle,
  Plus,
  Clock,
  CheckCircle,
  Activity,
  User,
  Calendar,
  X,
  Edit,
  FileText,
  Microscope,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Save,
  MessageSquare
} from 'lucide-react';
import SendDocumentModal from '../components/SendDocumentModal';

const getEntityId = (entity: { id?: string; _id?: string } | null): string | undefined =>
  entity?.id || entity?._id;

const getStatusBadge = (status: string) => {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    requested: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' },
    in_progress: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'In Progress' },
    completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completed' },
    cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelled' },
  };
  const c = config[status] || config.requested;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
};

// ✅ FIX: Helper to safely extract test name from nested relations
const getTestName = (test: any): string => 
  test?.name || test?.LabTestTemplate?.name || test?.ServiceCatalog?.name || 'Unknown Test';

// Result Flag Helper
const getResultFlag = (value: number | string, normalRange?: string): { flag: string; color: string } => {
  if (!normalRange) return { flag: '', color: 'text-gray-600' };
  
  const rangeMatch = normalRange.match(/([<>])?(\d+(?:\.\d+)?)\s*-?\s*(\d+(?:\.\d+)?)?/);
  if (!rangeMatch) return { flag: '', color: 'text-gray-600' };
  
  const numValue = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(numValue)) return { flag: '', color: 'text-gray-600' };
  
  const operator = rangeMatch[1];
  const low = parseFloat(rangeMatch[2]);
  const high = rangeMatch[3] ? parseFloat(rangeMatch[3]) : undefined;
  
  if (operator === '>') {
    if (numValue > low) return { flag: 'HIGH', color: 'text-red-600' };
    return { flag: 'NL', color: 'text-green-600' };
  }
  if (operator === '<') {
    if (numValue < low) return { flag: 'LOW', color: 'text-yellow-600' };
    return { flag: 'NL', color: 'text-green-600' };
  }
  if (high !== undefined) {
    if (numValue > high) return { flag: 'HIGH', color: 'text-red-600' };
    if (numValue < low) return { flag: 'LOW', color: 'text-yellow-600' };
    return { flag: 'NL', color: 'text-green-600' };
  }
  
  return { flag: '', color: 'text-gray-600' };
};

// Multi-Parameter Result Form Component
const MultiParameterResultForm: React.FC<{
  test: any;
  onSave: (parameters: any[]) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}> = ({ test, onSave, onCancel, isSaving }) => {
  const [parameters, setParameters] = useState<any[]>([]);
  
  useEffect(() => {
    if (test.result && typeof test.result === 'object' && test.result.parameters) {
      setParameters(test.result.parameters);
    } else {
      // Default parameters based on test name
      // ✅ FIX: Use getTestName helper
      const name = getTestName(test).toLowerCase();
      let defaultParams = [{ name: 'Result', value: '', normalRange: '', unit: '', required: true }];
      
      if (name.includes('full blood count') || name.includes('fbc') || name.includes('cbc')) {
        defaultParams = [
          { name: 'Haemoglobin (Hb)', value: '', normalRange: '12.0-16.0', unit: 'g/dL', required: true },
          { name: 'White Blood Cell Count (WBC)', value: '', normalRange: '4.0-11.0', unit: '×10^9/L', required: true },
          { name: 'Platelet Count', value: '', normalRange: '150-400', unit: '×10^9/L', required: true },
          { name: 'Red Blood Cell Count (RBC)', value: '', normalRange: '4.0-5.2', unit: '×10^12/L', required: false },
          { name: 'Haematocrit (HCT)', value: '', normalRange: '36-46', unit: '%', required: false },
        ];
      } else if (name.includes('liver') || name.includes('lft')) {
        defaultParams = [
          { name: 'ALT (SGPT)', value: '', normalRange: '10-40', unit: 'U/L', required: true },
          { name: 'AST (SGOT)', value: '', normalRange: '10-40', unit: 'U/L', required: true },
          { name: 'ALP', value: '', normalRange: '30-120', unit: 'U/L', required: true },
          { name: 'Total Bilirubin', value: '', normalRange: '0.3-1.2', unit: 'mg/dL', required: true },
        ];
      } else if (name.includes('renal') || name.includes('rft')) {
        defaultParams = [
          { name: 'Urea', value: '', normalRange: '7-20', unit: 'mg/dL', required: true },
          { name: 'Creatinine', value: '', normalRange: '0.6-1.2', unit: 'mg/dL', required: true },
          { name: 'Uric Acid', value: '', normalRange: '2.5-7.0', unit: 'mg/dL', required: false },
        ];
      } else if (name.includes('lipid')) {
        defaultParams = [
          { name: 'Total Cholesterol', value: '', normalRange: '<200', unit: 'mg/dL', required: true },
          { name: 'Triglycerides', value: '', normalRange: '<150', unit: 'mg/dL', required: true },
          { name: 'HDL Cholesterol', value: '', normalRange: '>40', unit: 'mg/dL', required: true },
        ];
      }
      
      setParameters(defaultParams);
    }
  }, [test]);
  
  const updateParameter = (index: number, field: string, value: any) => {
    const updated = [...parameters];
    updated[index] = { ...updated[index], [field]: value };
    setParameters(updated);
  };
  
  const handleSubmit = async () => {
    await onSave(parameters);
  };
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onCancel} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-[var(--bg-card)] rounded-xl shadow-xl max-w-4xl w-full max-h-[85vh] overflow-y-auto border border-[var(--border-color)]">
          <div className="sticky top-0 bg-[var(--bg-main)] px-5 py-3 border-b border-[var(--border-color)] rounded-t-xl flex items-center justify-between">
            <h2 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-[var(--icon-cyan-text)]" />
              Enter Results: {getTestName(test)}
            </h2>
            <button onClick={onCancel} className="p-1 hover:bg-[var(--bg-card)] rounded-lg">
              <X className="w-4 h-4 text-[var(--text-secondary)]" />
            </button>
          </div>
          
          <div className="p-5 space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)] w-[35%]">Parameter</th>
                    <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Result</th>
                    <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Normal Range</th>
                    <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Units</th>
                    <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Flag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {parameters.map((param, idx) => {
                    const flagInfo = getResultFlag(param.value, param.normalRange);
                    return (
                      <tr key={idx}>
                        <td className="px-3 py-2 font-medium text-[var(--text-primary)]">
                          {param.name}
                          {param.required && <span className="text-red-500 ml-1">*</span>}
                         </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={param.value || ''}
                            onChange={(e) => updateParameter(idx, 'value', e.target.value)}
                            placeholder="Enter value"
                            className="w-full px-2 py-1 bg-[var(--bg-main)] border border-[var(--border-color)] rounded text-sm"
                          />
                         </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={param.normalRange || ''}
                            onChange={(e) => updateParameter(idx, 'normalRange', e.target.value)}
                            placeholder="e.g., 4.0-11.0"
                            className="w-full px-2 py-1 bg-[var(--bg-main)] border border-[var(--border-color)] rounded text-sm"
                          />
                         </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={param.unit || ''}
                            onChange={(e) => updateParameter(idx, 'unit', e.target.value)}
                            placeholder="Units"
                            className="w-full px-2 py-1 bg-[var(--bg-main)] border border-[var(--border-color)] rounded text-sm"
                          />
                         </td>
                        <td className="px-3 py-2">
                          <span className={`text-xs font-medium ${flagInfo.color}`}>
                            {flagInfo.flag}
                          </span>
                         </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            <div className="flex gap-3 pt-3 border-t border-[var(--border-color)]">
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSaving}
                className="flex-1 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Results'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function LabResultEntry() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { success, error: toastError } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSendResult, setShowSendResult] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedAttendanceId, setSelectedAttendanceId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLabModal, setShowLabModal] = useState(false);
  const [resultEntryTest, setResultEntryTest] = useState<any>(null);
  const [isMultiParamModalOpen, setIsMultiParamModalOpen] = useState(false);
  
  // Form state for single result
  const [result, setResult] = useState('');
  const [normalRange, setNormalRange] = useState('');
  const [units, setUnits] = useState('');
  const [notes, setNotes] = useState('');

  const { 
    attendances, 
    getAttendances, 
    updateLabTestStatus,
    canAddMedicalEntries 
  } = useAttendanceStore();
  const { patients, loadPatients, fetchPatient } = usePatientStore();
  const { user } = useAuthStore();
  const { labTestTemplates, getLabTestTemplates } = useMedicalServicesStore();

  const [patient, setPatient] = useState<any>(null);
  const [attendance, setAttendance] = useState<any>(null);
  const [allAttendances, setAllAttendances] = useState<any[]>([]);
  const [labTests, setLabTests] = useState<any[]>([]);

  const loadData = async () => {
    try {
      setRefreshing(true);
      await Promise.all([
        loadPatients(),
        getLabTestTemplates(false)
      ]);

      // Worklist navigates with :id = patientId plus state.{patient, attendanceId}.
      const statePatient = location.state?.patient;
      const patientId = statePatient?.id || id;
      const initialAttendanceId = location.state?.attendanceId;

      if (patientId) {
        // Load THIS patient's attendances directly (complete + small) instead of
        // searching a paginated global list that may not contain the target.
        const patientAttendances = await getAttendances({ patientId });
        setAllAttendances(patientAttendances);

        // Resolve the full patient object; the default patient list only holds a page,
        // so fall back to a direct fetch (or the navigation summary).
        let foundPatient = patients.find(p => p.id === patientId) || statePatient || null;
        if (!foundPatient || !foundPatient.surname) {
          try { foundPatient = await fetchPatient(patientId); } catch { /* keep summary */ }
        }
        if (foundPatient) {
          setPatient(foundPatient);
          setSelectedPatientId(patientId);
        }

        const target =
          (initialAttendanceId && patientAttendances.find(a => a.id === initialAttendanceId)) ||
          [...patientAttendances].sort((a, b) =>
            new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
          )[0];
        if (target) {
          setSelectedAttendanceId(target.id);
          setAttendance(target);
          setLabTests(target.LabTest || []);
        }
      }

    } catch (err: any) {
      toastError('Load failed', err.message);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleAttendanceChange = (attendanceId: string) => {
    const newAttendance = allAttendances.find(a => a.id === attendanceId);
    if (newAttendance) {
      setSelectedAttendanceId(attendanceId);
      setAttendance(newAttendance);
      setLabTests(newAttendance.LabTest || []);
      setResultEntryTest(null);
    }
  };

  const handleClearSelection = () => {
    setSelectedAttendanceId('');
    setAttendance(null);
    setLabTests([]);
    setResultEntryTest(null);
  };

  const handleMarkInProgress = async (testId: string) => {
    if (!selectedAttendanceId) return;
    try {
      await updateLabTestStatus(selectedAttendanceId, testId, {
        status: 'in_progress',
        performedById: user?.id || '',
      });
      success('Status updated', 'Test in progress');
      await loadData();
    } catch (error: any) {
      toastError('Update failed', error.message);
    }
  };

  const handleOpenResultEntry = (test: any) => {
    setResultEntryTest(test);
    setResult(test.result || '');
    setNormalRange(test.normalRange || '');
    setUnits(test.units || '');
    setNotes(test.notes || '');
    
    const multiParamTests = ['full blood count', 'fbc', 'cbc', 'liver', 'lft', 'renal', 'rft', 'kidney', 'lipid', 'thyroid'];
    // ✅ FIX: Use getTestName helper
    const testName = getTestName(test).toLowerCase();
    const isMultiParam = multiParamTests.some(keyword => testName.includes(keyword));
    
    if (isMultiParam) {
      setIsMultiParamModalOpen(true);
    }
  };

  const handleSaveMultiParameterResults = async (parameters: any[]) => {
    if (!resultEntryTest || !selectedAttendanceId) return;
    
    setIsSubmitting(true);
    try {
      await updateLabTestStatus(selectedAttendanceId, resultEntryTest.id, {
        status: 'completed',
        // ✅ FIX: Use getTestName helper
        result: { parameters, testName: getTestName(resultEntryTest) },
        performedById: user?.id || '',
        completedAt: new Date().toISOString(),
      });
      success('Results saved', `${getTestName(resultEntryTest)} completed`);
      setIsMultiParamModalOpen(false);
      setResultEntryTest(null);
      await loadData();
    } catch (error: any) {
      toastError('Save failed', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSingleResultSubmit = async () => {
    if (!resultEntryTest || !result.trim()) {
      toastError('Result missing', 'Please enter test result');
      return;
    }
    if (!selectedAttendanceId) {
      toastError('Error', 'No attendance selected');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateLabTestStatus(selectedAttendanceId, resultEntryTest.id, {
        status: 'completed',
        result: result,
        normalRange: normalRange || null,
        units: units || null,
        notes: notes || null,
        performedById: user?.id || '',
        completedAt: new Date().toISOString(),
      });
      success('Result saved', 'Lab test completed');
      setResultEntryTest(null);
      setResult('');
      setNormalRange('');
      setUnits('');
      setNotes('');
      await loadData();
    } catch (error: any) {
      toastError('Save failed', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrescribeSuccess = async () => {
    setShowLabModal(false);
    await loadData();
    success('Test requested', 'Lab test added successfully');
  };

  const canAddEntries = attendance && ['pending', 'admitted'].includes(attendance.status);
  const canUpdateLabTest = attendance && ['pending', 'admitted'].includes(attendance.status);

  const pendingTests = labTests.filter(t => t.status === 'requested');
  const inProgressTests = labTests.filter(t => t.status === 'in_progress');
  const completedTests = labTests.filter(t => t.status === 'completed');

  const calculateAge = (dateOfBirth: string): number => {
    if (!dateOfBirth) return 0;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
        <div className="text-center bg-[var(--bg-card)] p-8 rounded-xl border border-[var(--border-color)]">
          <div className="w-12 h-12 border-4 border-[var(--icon-cyan-text)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Loading Laboratory Data...</h2>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
        <div className="text-center bg-[var(--bg-card)] p-8 rounded-xl border border-[var(--border-color)]">
          <AlertCircle className="w-12 h-12 text-[var(--icon-red-text)] mx-auto mb-3" />
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">Patient Not Found</h2>
          <p className="text-[var(--text-secondary)]">The patient you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/dashboard/laboratory')}
            className="mt-4 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all"
          >
            Back to Waiting List
          </button>
        </div>
      </div>
    );
  }

  // ✅ FIX: Handle both full Prisma objects (surname/otherNames) and normalized objects (name)
  const patientFullName = patient.name || `${patient.surname || ''} ${patient.otherNames || ''}`.trim() || 'Unknown Patient';
  const patientAge = patient.age || calculateAge(patient.dateOfBirth);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard/laboratory')}
            className="p-2 hover:bg-[var(--bg-card)] rounded-lg transition-all border border-[var(--border-color)]"
          >
            <ChevronLeft className="w-5 h-5 text-[var(--text-primary)]" />
          </button>
          <div className="w-10 h-10 bg-[var(--icon-cyan-bg)] rounded-xl flex items-center justify-center">
            <FlaskConical className="w-5 h-5 text-[var(--icon-cyan-text)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Laboratory Results</h1>
            <p className="text-sm text-[var(--text-secondary)]">{patientFullName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLabModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] rounded-lg hover:bg-[var(--icon-purple-text)] hover:text-white transition-all text-sm"
            disabled={!canAddEntries}
          >
            <Plus className="w-4 h-4" />
            Request Test
          </button>
          <button
            onClick={() => setShowSendResult(true)}
            className="flex items-center gap-2 px-4 py-2 border border-green-200 text-green-700 rounded-lg hover:bg-green-50 transition-all text-sm"
          >
            <MessageSquare className="w-4 h-4" />
            Send Results
          </button>
          <button
            onClick={loadData}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all disabled:opacity-50 text-sm text-[var(--text-primary)]"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <SendDocumentModal
        open={showSendResult}
        onClose={() => setShowSendResult(false)}
        patient={patient}
        documentType="lab-result"
        entityId={selectedAttendanceId}
      />

      {/* Patient & Attendance Selector */}
      <PatientAttendanceSelector
        patients={[patient]}
        attendances={allAttendances}
        selectedPatientId={selectedPatientId}
        selectedAttendanceId={selectedAttendanceId}
        onPatientSelect={(patientId) => {
          setSelectedPatientId(patientId);
          setAllAttendances(attendances.filter(a => a.patientId === patientId));
          setSelectedAttendanceId('');
          setAttendance(null);
          setLabTests([]);
        }}
        onAttendanceSelect={handleAttendanceChange}
        onClearSelection={handleClearSelection}
      />

      {/* No Attendance Selected */}
      {!selectedAttendanceId && (
        <div className="bg-[var(--icon-yellow-bg)] border border-[var(--icon-yellow-text)] rounded-xl p-8 text-center">
          <Calendar className="w-12 h-12 text-[var(--icon-yellow-text)] mx-auto mb-3 opacity-50" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No Attendance Selected</h3>
          <p className="text-[var(--text-secondary)]">Please select an attendance from the dropdown above to manage lab tests.</p>
        </div>
      )}

      {/* Patient Information Card */}
      {selectedAttendanceId && attendance && (
        <>
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
            <div className="bg-[var(--bg-main)] px-6 py-3 border-b border-[var(--border-color)]">
              <h2 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <User className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                Patient Information
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Full Name</p>
                  <p className="text-sm font-medium text-[var(--text-primary)] mt-1">{patientFullName}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Folder Number</p>
                  <p className="text-sm font-mono text-[var(--text-primary)] mt-1">{patient.folderNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Age & Gender</p>
                  {/* ✅ FIX: Use safe patientAge and fallback for gender */}
                  <p className="text-sm text-[var(--text-primary)] mt-1 capitalize">{patientAge} years • {patient.gender || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Ward / Bed</p>
                  <p className="text-sm text-[var(--text-primary)] mt-1">
                    {attendance.ward?.wardName || '—'} / {attendance.bed?.bedNumber || '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Read-only warning */}
          {attendance && !canUpdateLabTest && (
            <div className="bg-[var(--icon-yellow-bg)] border border-[var(--icon-yellow-text)] rounded-xl p-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-[var(--icon-yellow-text)]" />
              <p className="text-sm text-[var(--icon-yellow-text)]">
                This visit is <strong>{attendance.status}</strong>. Tests can be viewed but not processed.
              </p>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-yellow-600">{pendingTests.length}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">Pending Tests</p>
                </div>
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
              </div>
            </div>
            <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-blue-600">{inProgressTests.length}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">In Progress</p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Activity className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </div>
            <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-green-600">{completedTests.length}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">Completed</p>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Request New Test Button */}
          {canAddEntries && (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-4">
              <button
                onClick={() => setShowLabModal(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Request Laboratory Test
              </button>
            </div>
          )}

          {/* Pending Tests Table */}
          {pendingTests.length > 0 && (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
              <div className="bg-[var(--bg-main)] px-6 py-3 border-b border-[var(--border-color)]">
                <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-500" />
                  Pending Tests ({pendingTests.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-[var(--text-secondary)]">Test Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-[var(--text-secondary)]">Priority</th>
                      <th className="px-4 py-3 text-left font-semibold text-[var(--text-secondary)]">Requested On</th>
                      <th className="px-4 py-3 text-left font-semibold text-[var(--text-secondary)]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {pendingTests.map((test) => {
                      const priorityColor = test.priority === 'stat' ? 'bg-red-100 text-red-700' :
                        test.priority === 'urgent' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700';
                      return (
                        <tr key={test.id} className="hover:bg-[var(--bg-main)] transition-colors">
                          {/* ✅ FIX: Use getTestName helper */}
                          <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{getTestName(test)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityColor}`}>
                              {test.priority || 'routine'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[var(--text-secondary)]">
                            {test.requestedAt ? new Date(test.requestedAt).toLocaleString() : '—'}
                          </td>
                          <td className="px-4 py-3">
                            {canUpdateLabTest && (
                              <button
                                onClick={() => handleMarkInProgress(test.id)}
                                className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs hover:bg-blue-700 hover:text-white transition-all"
                              >
                                Start Processing
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* In Progress Tests Table */}
          {inProgressTests.length > 0 && (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
              <div className="bg-[var(--bg-main)] px-6 py-3 border-b border-[var(--border-color)]">
                <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-500" />
                  In Progress ({inProgressTests.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-[var(--text-secondary)]">Test Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-[var(--text-secondary)]">Started On</th>
                      <th className="px-4 py-3 text-left font-semibold text-[var(--text-secondary)]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {inProgressTests.map((test) => (
                      <tr key={test.id} className="hover:bg-[var(--bg-main)] transition-colors">
                        {/* ✅ FIX: Use getTestName helper */}
                        <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{getTestName(test)}</td>
                        <td className="px-4 py-3 text-[var(--text-secondary)]">
                          {test.updatedAt ? new Date(test.updatedAt).toLocaleString() : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleOpenResultEntry(test)}
                            className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs hover:bg-green-700 hover:text-white transition-all"
                          >
                            Enter Result
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Completed Tests Table */}
          {completedTests.length > 0 && (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
              <div className="bg-[var(--bg-main)] px-6 py-3 border-b border-[var(--border-color)]">
                <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Completed Results ({completedTests.length})
                </h3>
              </div>
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                {completedTests.map((test) => {
                  const hasParameters = test.result && typeof test.result === 'object' && test.result.parameters;
                  const parameters = hasParameters ? test.result.parameters : [];
                  
                  return (
                    <div key={test.id} className="border-b border-[var(--border-color)] last:border-b-0">
                      <div className="bg-[var(--bg-main)] px-4 py-2 border-b border-[var(--border-color)]">
                        <div className="flex items-center justify-between">
                          <div>
                            {/* ✅ FIX: Use getTestName helper */}
                            <h4 className="font-semibold text-sm text-[var(--text-primary)]">{getTestName(test)}</h4>
                            <p className="text-[10px] text-[var(--text-secondary)]">
                              Completed: {test.completedAt ? new Date(test.completedAt).toLocaleString() : '—'}
                            </p>
                          </div>
                          <button
                            onClick={() => handleOpenResultEntry(test)}
                            className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                            title="Edit Result"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      
                      {hasParameters && parameters.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                              <tr>
                                <th className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)] w-[35%]">Parameter</th>
                                <th className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)]">Result</th>
                                <th className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)]">Normal Range</th>
                                <th className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)]">Flag</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-color)]">
                              {parameters.map((param: any, idx: number) => {
                                const flagInfo = getResultFlag(param.value, param.normalRange);
                                return (
                                  <tr key={idx} className="hover:bg-[var(--bg-main)] transition-colors">
                                    <td className="px-4 py-2 font-medium text-[var(--text-primary)]">{param.name}</td>
                                    <td className={`px-4 py-2 font-mono ${flagInfo.color}`}>
                                      {param.value || '—'} {param.unit && <span className="text-[10px]">{param.unit}</span>}
                                    </td>
                                    <td className="px-4 py-2 text-[var(--text-secondary)]">{param.normalRange || '—'}</td>
                                    <td className="px-4 py-2">
                                      {flagInfo.flag && (
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                          flagInfo.flag === 'HIGH' ? 'bg-red-100 text-red-700' :
                                          flagInfo.flag === 'LOW' ? 'bg-yellow-100 text-yellow-700' :
                                          'bg-green-100 text-green-700'
                                        }`}>
                                          {flagInfo.flag}
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="p-4">
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <span className="text-xs text-[var(--text-secondary)]">Result</span>
                              <p className="text-sm font-mono text-[var(--text-primary)]">
                                {typeof test.result === 'object' ? test.result.value || '—' : test.result || '—'}
                                {test.units && <span className="text-xs text-[var(--text-secondary)] ml-1">{test.units}</span>}
                              </p>
                            </div>
                            <div>
                              <span className="text-xs text-[var(--text-secondary)]">Normal Range</span>
                              <p className="text-sm text-[var(--text-primary)]">{test.normalRange || '—'}</p>
                            </div>
                            <div>
                              <span className="text-xs text-[var(--text-secondary)]">Flag</span>
                              <p>
                                {(() => {
                                  const flagInfo = getResultFlag(
                                    typeof test.result === 'object' ? test.result.value : test.result,
                                    test.normalRange
                                  );
                                  return flagInfo.flag ? (
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                      flagInfo.flag === 'HIGH' ? 'bg-red-100 text-red-700' :
                                      flagInfo.flag === 'LOW' ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-green-100 text-green-700'
                                    }`}>
                                      {flagInfo.flag}
                                    </span>
                                  ) : (
                                    <span className="text-[var(--text-secondary)]">—</span>
                                  );
                                })()}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {test.notes && (
                        <div className="px-4 py-2 border-t border-[var(--border-color)] bg-blue-50">
                          <p className="text-xs text-blue-700">📝 {test.notes}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* No Tests Message */}
          {pendingTests.length === 0 && inProgressTests.length === 0 && completedTests.length === 0 && (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-8 text-center">
              <Microscope className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">No Lab Tests</h3>
              <p className="text-sm text-[var(--text-secondary)]">No laboratory tests have been requested for this visit</p>
              {canAddEntries && (
                <button
                  onClick={() => setShowLabModal(true)}
                  className="mt-3 text-[var(--icon-cyan-text)] text-sm hover:underline"
                >
                  Request a test
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* Single Result Entry Modal */}
      {resultEntryTest && !isMultiParamModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setResultEntryTest(null)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-[var(--bg-card)] rounded-xl shadow-xl max-w-md w-full border border-[var(--border-color)]">
              <div className="bg-[var(--bg-main)] px-5 py-3 border-b border-[var(--border-color)] rounded-t-xl flex items-center justify-between">
                {/* ✅ FIX: Use getTestName helper */}
                <h3 className="font-semibold text-[var(--text-primary)]">Enter Results: {getTestName(resultEntryTest)}</h3>
                <button onClick={() => setResultEntryTest(null)} className="p-1 hover:bg-[var(--bg-card)] rounded-lg">
                  <X className="w-4 h-4 text-[var(--text-secondary)]" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Result *</label>
                  <input
                    type="text"
                    value={result}
                    onChange={(e) => setResult(e.target.value)}
                    placeholder="Enter result value"
                    className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm"
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Normal Range</label>
                    <input
                      type="text"
                      value={normalRange}
                      onChange={(e) => setNormalRange(e.target.value)}
                      placeholder="e.g., 4.0-11.0"
                      className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Units</label>
                    <input
                      type="text"
                      value={units}
                      onChange={(e) => setUnits(e.target.value)}
                      placeholder="e.g., g/dL"
                      className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Additional comments..."
                    className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm resize-none"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setResultEntryTest(null)}
                    className="flex-1 px-4 py-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSingleResultSubmit}
                    disabled={isSubmitting || !result.trim()}
                    className="flex-1 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Result'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Parameter Result Modal */}
      {isMultiParamModalOpen && resultEntryTest && (
        <MultiParameterResultForm
          test={resultEntryTest}
          onSave={handleSaveMultiParameterResults}
          onCancel={() => {
            setIsMultiParamModalOpen(false);
            setResultEntryTest(null);
          }}
          isSaving={isSubmitting}
        />
      )}

      {/* Lab Test Modal */}
      {selectedAttendanceId && (
        <LabTestModal
          isOpen={showLabModal}
          onClose={() => setShowLabModal(false)}
          onSuccess={handlePrescribeSuccess}
          attendanceId={selectedAttendanceId}
          labTests={labTestTemplates}
          canAdd={canAddEntries}
          userId={user?.id}
        />
      )}
    </div>
  );
}