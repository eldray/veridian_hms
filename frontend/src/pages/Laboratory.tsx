// src/pages/LabResults.tsx - UPDATED WITH MULTI-PARAMETER SUPPORT
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAttendanceStore } from '../store/attendanceStore';
import { usePatientStore } from '../store/patientStore';
import { useAuthStore } from '../store/authStore';
import { useMedicalServicesStore } from '../store/medicalServicesStore';
import { useToast } from '../store/toastStore';
import { useWorklistStore } from '../store/worklistStore';
import { WorklistPanel } from '../components/worklist/WorklistPanel';
import { PatientAttendanceSelector } from '../components/vitals/PatientAttendanceSelector';
import { LabTestModal } from '../components/medical-entries/modals/LabTestModal';
import { generatePDF, openPrintWindow } from '../utils/pdfGenerator';
import { useHospitalStore } from '../store/hospitalStore';

import {
  ChevronLeft,
  FlaskConical,
  Printer,
  RefreshCw,
  AlertCircle,
  Ban,
  Plus,
  Clock,
  CheckCircle,
  AlertTriangle,
  Microscope,
  FileText,
  User,
  Calendar,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  Trash2,
  Edit,
  Search,
  Filter,
  X,
  Users,
} from 'lucide-react';

const getEntityId = (entity: { id?: string; _id?: string } | null): string | undefined => {
  return entity?.id || entity?._id;
};

const getStatusBadge = (status: string) => {
  const config: Record<string, { bg: string; text: string }> = {
    requested: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
    in_progress: { bg: 'bg-blue-100', text: 'text-blue-700' },
    completed: { bg: 'bg-green-100', text: 'text-green-700' },
    cancelled: { bg: 'bg-red-100', text: 'text-red-700' },
  };
  const c = config[status] || config.requested;
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>{status === 'in_progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}</span>;
};

// Flag helper for lab results
const getResultFlag = (value: number | string, normalRange?: string): { flag: string; color: string } => {
  if (!normalRange) return { flag: '', color: 'text-gray-600' };
  
  // Parse normal range (e.g., "4.0-11.0" or ">5.0" or "<1.0" or "0-5")
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

// Multi-parameter result entry component
const MultiParameterResultForm: React.FC<{
  test: any;
  onSave: (parameters: any[]) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}> = ({ test, onSave, onCancel, isSaving }) => {
  const [parameters, setParameters] = useState<any[]>([]);
  
  useEffect(() => {
    // Initialize parameters from existing result or from template
    if (test.result && typeof test.result === 'object' && test.result.parameters) {
      setParameters(test.result.parameters);
    } else {
      // Create default parameters based on test name
      const defaultParams = getDefaultParametersForTest(test.name);
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
              Enter Results: {test.name}
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
            
            {test.notes && (
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Notes</label>
                <textarea
                  value={test.notes}
                  onChange={(e) => {/* handle notes */}}
                  rows={2}
                  className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm"
                />
              </div>
            )}
            
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

// Helper to get default parameters for different test types
const getDefaultParametersForTest = (testName: string): any[] => {
  const name = testName.toLowerCase();
  
  if (name.includes('full blood count') || name.includes('fbc') || name.includes('cbc')) {
    return [
      { name: 'Haemoglobin (Hb)', value: '', normalRange: '12.0-16.0', unit: 'g/dL', required: true },
      { name: 'White Blood Cell Count (WBC)', value: '', normalRange: '4.0-11.0', unit: '×10^9/L', required: true },
      { name: 'Platelet Count', value: '', normalRange: '150-400', unit: '×10^9/L', required: true },
      { name: 'Red Blood Cell Count (RBC)', value: '', normalRange: '4.0-5.2', unit: '×10^12/L', required: false },
      { name: 'Haematocrit (HCT)', value: '', normalRange: '36-46', unit: '%', required: false },
      { name: 'MCV', value: '', normalRange: '80-100', unit: 'fL', required: false },
      { name: 'MCH', value: '', normalRange: '27-32', unit: 'pg', required: false },
      { name: 'MCHC', value: '', normalRange: '32-36', unit: 'g/dL', required: false },
      { name: 'Neutrophils', value: '', normalRange: '40-70', unit: '%', required: false },
      { name: 'Lymphocytes', value: '', normalRange: '20-40', unit: '%', required: false },
      { name: 'Monocytes', value: '', normalRange: '2-10', unit: '%', required: false },
      { name: 'Eosinophils', value: '', normalRange: '1-6', unit: '%', required: false },
      { name: 'Basophils', value: '', normalRange: '0-1', unit: '%', required: false },
    ];
  }
  
  if (name.includes('liver') || name.includes('lft')) {
    return [
      { name: 'ALT (SGPT)', value: '', normalRange: '10-40', unit: 'U/L', required: true },
      { name: 'AST (SGOT)', value: '', normalRange: '10-40', unit: 'U/L', required: true },
      { name: 'ALP', value: '', normalRange: '30-120', unit: 'U/L', required: true },
      { name: 'Total Bilirubin', value: '', normalRange: '0.3-1.2', unit: 'mg/dL', required: true },
      { name: 'Direct Bilirubin', value: '', normalRange: '0.1-0.3', unit: 'mg/dL', required: false },
      { name: 'Total Protein', value: '', normalRange: '6.0-8.0', unit: 'g/dL', required: false },
      { name: 'Albumin', value: '', normalRange: '3.5-5.0', unit: 'g/dL', required: false },
      { name: 'Globulin', value: '', normalRange: '2.5-3.5', unit: 'g/dL', required: false },
    ];
  }
  
  if (name.includes('renal') || name.includes('rft') || name.includes('kidney')) {
    return [
      { name: 'Urea', value: '', normalRange: '7-20', unit: 'mg/dL', required: true },
      { name: 'Creatinine', value: '', normalRange: '0.6-1.2', unit: 'mg/dL', required: true },
      { name: 'Uric Acid', value: '', normalRange: '2.5-7.0', unit: 'mg/dL', required: false },
      { name: 'Sodium (Na+)', value: '', normalRange: '135-145', unit: 'mmol/L', required: false },
      { name: 'Potassium (K+)', value: '', normalRange: '3.5-5.0', unit: 'mmol/L', required: false },
      { name: 'Chloride (Cl-)', value: '', normalRange: '98-106', unit: 'mmol/L', required: false },
      { name: 'Bicarbonate (HCO3-)', value: '', normalRange: '22-28', unit: 'mmol/L', required: false },
    ];
  }
  
  if (name.includes('lipid')) {
    return [
      { name: 'Total Cholesterol', value: '', normalRange: '<200', unit: 'mg/dL', required: true },
      { name: 'Triglycerides', value: '', normalRange: '<150', unit: 'mg/dL', required: true },
      { name: 'HDL Cholesterol', value: '', normalRange: '>40', unit: 'mg/dL', required: true },
      { name: 'LDL Cholesterol', value: '', normalRange: '<100', unit: 'mg/dL', required: true },
    ];
  }
  
  // Default single result
  return [{ name: 'Result', value: '', normalRange: '', unit: '', required: true }];
};

export default function Laboratory() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const { setDepartment, selectItem, clearSelection } = useWorklistStore();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedAttendanceId, setSelectedAttendanceId] = useState<string>('');
  const [selectedTest, setSelectedTest] = useState<{ attendanceId: string; testId: string } | null>(null);
  const [result, setResult] = useState('');
  const [normalRange, setNormalRange] = useState('');
  const [units, setUnits] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLabModal, setShowLabModal] = useState(false);
  const [resultEntryTest, setResultEntryTest] = useState<any>(null);
  const [isMultiParamModalOpen, setIsMultiParamModalOpen] = useState(false);
  const [showWorklist, setShowWorklist] = useState(false);

  const { hospital } = useHospitalStore();
  const {
    attendances,
    updateLabTestStatus,
    getAttendances,
    canAddMedicalEntries,
  } = useAttendanceStore();

  const { patients, loadPatients } = usePatientStore();
  const { user } = useAuthStore();
  const { labTestTemplates, getLabTestTemplates } = useMedicalServicesStore();

  const hasLoaded = useRef(false);

  const loadData = async (force = false) => {
    if (!force && hasLoaded.current) return;
    try {
      setRefreshing(true);
      setIsLoading(true);
      await Promise.all([
        loadPatients(),
        getAttendances(),
        getLabTestTemplates(false)
      ]);
      hasLoaded.current = true;
      success('Data loaded', 'Laboratory system ready');
    } catch (err: any) {
      toastError('Load failed', err.message || 'Could not load data');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const calculateAge = (dateOfBirth: string): number => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const patientAttendances = useMemo(() => {
    if (!selectedPatientId || !attendances.length) return [];
    return attendances.filter(attendance => {
      const possiblePatientIds = [
        attendance.patientId,
        attendance.patient?.id,
        attendance.patient?._id,
        attendance.data?.patientId
      ].filter(Boolean).map(id => id?.toString()).filter(id => id && id !== 'undefined');
      return possiblePatientIds.includes(selectedPatientId);
    });
  }, [attendances, selectedPatientId]);

  const selectedPatient = patients.find(p => getEntityId(p) === selectedPatientId);
  const selectedAttendance = patientAttendances.find(a => getEntityId(a) === selectedAttendanceId);

  useEffect(() => {
    setSelectedAttendanceId('');
    setSelectedTest(null);
    setResultEntryTest(null);
    setResult('');
    setNormalRange('');
    setUnits('');
    setNotes('');
  }, [selectedPatientId]);

  const canAddEntries = selectedAttendance ? canAddMedicalEntries(selectedAttendance) : false;
  const canUpdateLabTest = selectedAttendance && ['pending', 'admitted'].includes(selectedAttendance.status);

  const labTests = (selectedAttendance?.LabTest || []).map((test: any) => ({
    ...test,
    id: test.id,
    name: test.ServiceCatalog?.name || test.name || 'Unknown Test',
    status: test.status,
    priority: test.priority,
    requestedAt: test.requestedAt,
    notes: test.notes,
    result: test.result,
    normalRange: test.normalRange,
    units: test.units,
    completedAt: test.completedAt,
    requestedBy: test.requestedBy,
  }));

  const pendingTests = labTests.filter(t => t.status === 'requested');
  const inProgressTests = labTests.filter(t => t.status === 'in_progress');
  const completedTests = labTests.filter(t => t.status === 'completed');

  const handleMarkInProgress = async (testId: string) => {
    if (!selectedAttendanceId) return;
    try {
      await updateLabTestStatus(selectedAttendanceId, testId, {
        status: 'in_progress',
        performedById: user?.id || '',
      });
      success('Status updated', 'Test in progress');
      await getAttendances();
    } catch (error: any) {
      toastError('Update failed', error.message);
    }
  };

  const handleSaveMultiParameterResults = async (parameters: any[]) => {
    if (!resultEntryTest || !selectedAttendanceId || !canUpdateLabTest) return;
    
    setIsSubmitting(true);
    try {
      await updateLabTestStatus(selectedAttendanceId, resultEntryTest.id, {
        status: 'completed',
        result: { parameters, testName: resultEntryTest.name },
        performedById: user?.id || '',
        completedAt: new Date().toISOString(),
      });
      success('Results saved', `${resultEntryTest.name} completed`);
      setIsMultiParamModalOpen(false);
      setResultEntryTest(null);
      await getAttendances();
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
    if (!selectedAttendanceId || !canUpdateLabTest) {
      toastError('Access denied', 'Cannot update this attendance');
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
      await getAttendances();
    } catch (error: any) {
      toastError('Save failed', error.message || 'Could not submit result');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenResultEntry = (test: any) => {
    setResultEntryTest(test);
    setResult('');
    setNormalRange('');
    setUnits('');
    setNotes('');
    
    // Check if it's a multi-parameter test (FBC, LFT, RFT, Lipid Profile)
    const multiParamTests = ['full blood count', 'fbc', 'cbc', 'liver', 'lft', 'renal', 'rft', 'kidney', 'lipid', 'thyroid'];
    const testName = (test.name || '').toLowerCase();
    const isMultiParam = multiParamTests.some(keyword => testName.includes(keyword));
    
    if (isMultiParam) {
      setIsMultiParamModalOpen(true);
    }
  };

  const handleClearSelection = () => {
    setSelectedPatientId('');
    setSelectedAttendanceId('');
    setSelectedTest(null);
    setResultEntryTest(null);
    setResult('');
    setNormalRange('');
    setUnits('');
    setNotes('');
  };

  const handlePrintResults = async () => {
    if (completedTests.length === 0) {
      toastError('No results', 'No completed tests to print');
      return;
    }
    
    if (!selectedPatient || !selectedAttendance) {
      toastError('Missing info', 'Patient or attendance information missing');
      return;
    }
    
    try {
      const labResultsData = {
        labTests: completedTests.map(test => ({
          name: test.name,
          result: typeof test.result === 'object' ? test.result.value || JSON.stringify(test.result) : (test.result || '-'),
          normalRange: test.normalRange || '-',
          units: test.units || '-',
          status: test.status,
          findings: test.notes || null,
          impression: null,
          completedAt: test.completedAt,
          requestedBy: test.requestedBy
        })),
        patient: {
          fullName: `${selectedPatient.surname} ${selectedPatient.otherNames}`,
          folderNumber: selectedPatient.folderNumber,
          contact: selectedPatient.contact,
          age: selectedPatient.age || calculateAge(selectedPatient.dateOfBirth),
          gender: selectedPatient.gender,
          id: selectedPatient.id
        },
        attendance: {
          attendanceNumber: selectedAttendance.attendanceNumber || 'N/A',
          dateTime: selectedAttendance.dateTime || selectedAttendance.createdAt || new Date().toISOString(),
          attendingClinician: selectedAttendance.createdBy?.fullName || 'N/A',
          attendanceType: selectedAttendance.attendanceType || 'general'
        }
      };
      
      const htmlContent = generatePDF('labResults', labResultsData, hospital);
      openPrintWindow(htmlContent, `Lab_Results_${selectedPatient.folderNumber}`);
      success('Print ready', 'Lab results report generated');
    } catch (err) {
      console.error('Error printing lab results:', err);
      toastError('Print failed', 'Could not generate lab results report');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
        <div className="text-center bg-[var(--bg-card)] p-8 rounded-xl shadow-sm border border-[var(--border-color)]">
          <div className="w-14 h-14 border-4 border-[var(--icon-cyan-text)] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Loading Laboratory...</h2>
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
          <div className="w-10 h-10 bg-[var(--icon-cyan-bg)] rounded-xl flex items-center justify-center">
            <FlaskConical className="w-5 h-5 text-[var(--icon-cyan-text)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Laboratory Management</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">Request tests, enter results, print reports</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setDepartment('lab');
              setShowWorklist(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm shadow-md"
          >
            <Users className="w-4 h-4" />
            <span>Today's Queue</span>
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
              {useWorklistStore.getState().stats.total > 0 ? useWorklistStore.getState().stats.total : ''}
            </span>
          </button>
          
          <button
            onClick={handlePrintResults}
            disabled={completedTests.length === 0}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all disabled:opacity-50 text-sm"
          >
            <Printer className="w-4 h-4" />
            Print ({completedTests.length})
          </button>
          <button
            onClick={() => navigate('/dashboard/medical-entries')}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all text-sm"
          >
            <FileText className="w-4 h-4" />
            Medical Entries
          </button>
          <button
            onClick={() => loadData(true)}
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

      {/* Patient & Visit Header */}
      {selectedPatient && selectedAttendance && (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
          <div className="px-5 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--icon-cyan-bg)] to-[var(--icon-cyan-text)] flex items-center justify-center shadow-sm">
                <User className="w-5 h-5 text-white" />
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
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                selectedAttendance.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                selectedAttendance.status === 'completed' ? 'bg-green-100 text-green-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {selectedAttendance.status}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {selectedAttendance ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT COLUMN - Request New Test + Pending Tests Table */}
          <div className="space-y-5">
            {/* Request New Test Card - FIXED to fit inside box */}
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
              <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)]">
                <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Plus className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                  Request New Test
                </h3>
              </div>
              <div className="p-4">
                {canAddEntries ? (
                  <button
                    onClick={() => setShowLabModal(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Request Laboratory Test
                  </button>
                ) : (
                  <div className="flex items-center justify-center gap-2 py-3 text-yellow-600 bg-yellow-50 rounded-lg">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">Cannot request tests for {selectedAttendance.status} attendance</span>
                  </div>
                )}
              </div>
            </div>

            {/* Pending Tests Table */}
            {pendingTests.length > 0 && (
              <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)]">
                  <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                    <Clock className="w-4 h-4 text-yellow-500" />
                    Pending Tests ({pendingTests.length})
                  </h3>
                </div>
                <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)]">Test Name</th>
                        <th className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)]">Priority</th>
                        <th className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)]">Requested On</th>
                        <th className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)]">
                      {pendingTests.map((test) => {
                        const priorityColor = test.priority === 'stat' ? 'bg-red-100 text-red-700' :
                          test.priority === 'urgent' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700';
                        return (
                          <tr key={test.id} className="hover:bg-[var(--bg-main)] transition-colors">
                            <td className="px-4 py-2 font-medium text-[var(--text-primary)]">{test.name}</td>
                            <td className="px-4 py-2">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${priorityColor}`}>
                                {test.priority || 'routine'}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-[var(--text-secondary)] whitespace-nowrap">
                              {test.requestedAt ? new Date(test.requestedAt).toLocaleDateString() : '—'}
                            </td>
                            <td className="px-4 py-2">
                              {canUpdateLabTest && (
                                <button
                                  onClick={() => handleMarkInProgress(test.id)}
                                  className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-700 hover:text-white transition-all"
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
                <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)]">
                  <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-500" />
                    In Progress ({inProgressTests.length})
                  </h3>
                </div>
                <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)]">Test Name</th>
                        <th className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)]">Started On</th>
                        <th className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)]">
                      {inProgressTests.map((test) => (
                        <tr key={test.id} className="hover:bg-[var(--bg-main)] transition-colors">
                          <td className="px-4 py-2 font-medium text-[var(--text-primary)]">{test.name}</td>
                          <td className="px-4 py-2 text-[var(--text-secondary)] whitespace-nowrap">
                            {test.updatedAt ? new Date(test.updatedAt).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-4 py-2">
                            <button
                              onClick={() => handleOpenResultEntry(test)}
                              className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-700 hover:text-white transition-all"
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
          </div>

          {/* RIGHT COLUMN - Completed Tests Table */}
          <div className="space-y-5">
            {completedTests.length > 0 ? (
              <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)]">
                  <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Completed Results ({completedTests.length})
                  </h3>
                </div>
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  {completedTests.map((test) => {
                    // Check if this test has multi-parameter results
                    const hasParameters = test.result && typeof test.result === 'object' && test.result.parameters;
                    const parameters = hasParameters ? test.result.parameters : [];
                    
                    return (
                      <div key={test.id} className="border-b border-[var(--border-color)] last:border-b-0">
                        {/* Test Header */}
                        <div className="bg-[var(--bg-main)] px-4 py-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold text-sm text-[var(--text-primary)]">{test.name}</h4>
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
                        
                        {/* Results Table */}
                        <div className="overflow-x-auto">
                          {hasParameters && parameters.length > 0 ? (
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
                          ) : (
                            // Single result display
                            <div className="p-4">
                              <div className="grid grid-cols-3 gap-4">
                                <div>
                                  <span className="text-xs text-[var(--text-secondary)]">Result</span>
                                  <p className={`text-sm font-mono ${test.result?.abnormal ? 'text-red-600 font-bold' : 'text-[var(--text-primary)]'}`}>
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
                                    {test.result?.abnormal || test.abnormal ? (
                                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">ABNORMAL</span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700">NORMAL</span>
                                    )}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Notes */}
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
            ) : (
              <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-8 text-center">
                <Microscope className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">No Completed Tests</h3>
                <p className="text-sm text-[var(--text-secondary)]">Process and enter results for pending tests</p>
              </div>
            )}
          </div>
        </div>
      ) : selectedPatientId && !selectedAttendanceId ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-yellow-800 mb-1">No Attendance Selected</h3>
          <p className="text-sm text-yellow-700">Please select an attendance to manage lab tests</p>
        </div>
      ) : null}

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

      {/* Single Result Entry Form (inline) */}
      {resultEntryTest && !isMultiParamModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setResultEntryTest(null)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-[var(--bg-card)] rounded-xl shadow-xl max-w-md w-full border border-[var(--border-color)]">
              <div className="bg-[var(--bg-main)] px-5 py-3 border-b border-[var(--border-color)] rounded-t-xl flex items-center justify-between">
                <h3 className="font-semibold text-[var(--text-primary)]">Enter Results: {resultEntryTest.name}</h3>
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

      {/* Lab Test Modal */}
      <LabTestModal
        isOpen={showLabModal}
        onClose={() => setShowLabModal(false)}
        onSuccess={() => {
          setShowLabModal(false);
          getAttendances();
        }}
        attendanceId={selectedAttendanceId}
        labTests={labTestTemplates}
        canAdd={canAddEntries}
        userId={user?.id}
      />
    </div>
  );
}