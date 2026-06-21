// src/pages/LabResultEntry.tsx - Laboratory Results Entry Page
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAttendanceStore } from '../store/attendanceStore';
import { usePatientStore } from '../store/patientStore';
import { useAuthStore } from '../store/authStore';
import { useMedicalServicesStore } from '../store/medicalServicesStore';
import { useToast } from '../store/toastStore';
import { useHospitalStore } from '../store/hospitalStore';
import { PatientAttendanceSelector } from '../components/vitals/PatientAttendanceSelector';
import { LabTestModal } from '../components/medical-entries/modals/LabTestModal';
import { generatePDF, openPrintWindow } from '../utils/pdfGenerator';
import { getPatientName } from '../utils/patient';
import SendDocumentModal from '../components/SendDocumentModal';
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

const getEntityId = (entity: { id?: string; _id?: string } | null): string | undefined =>
  entity?.id || entity?._id;

const getStatusBadge = (status: string) => {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    requested:   { bg: 'bg-yellow-100', text: 'text-yellow-700',  label: 'Pending'     },
    in_progress: { bg: 'bg-blue-100',   text: 'text-blue-700',    label: 'In Progress' },
    completed:   { bg: 'bg-green-100',  text: 'text-green-700',   label: 'Completed'   },
    cancelled:   { bg: 'bg-red-100',    text: 'text-red-700',     label: 'Cancelled'   },
  };
  const c = config[status] || config.requested;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const getTestName = (test: any): string =>
  test?.name || test?.LabTestTemplate?.name || test?.ServiceCatalog?.name || 'Unknown Test';

const getResultFlag = (value: number | string, normalRange?: string): { flag: string; color: string } => {
  if (!normalRange) return { flag: '', color: 'text-gray-600' };
  const cleaned = normalRange.replace(/[–—]/g, '-');
  const rangeMatch = cleaned.match(/([<>])?\s*(\d+(?:\.\d+)?)\s*-?\s*(\d+(?:\.\d+)?)?/);
  if (!rangeMatch) return { flag: '', color: 'text-gray-600' };

  const numValue = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(numValue)) return { flag: '', color: 'text-gray-600' };

  const operator = rangeMatch[1];
  const low  = parseFloat(rangeMatch[2]);
  const high = rangeMatch[3] ? parseFloat(rangeMatch[3]) : undefined;

  if (operator === '>') return numValue > low
    ? { flag: 'HIGH', color: 'text-red-600' }
    : { flag: 'NL',   color: 'text-green-600' };
  if (operator === '<') return numValue < low
    ? { flag: 'LOW', color: 'text-yellow-600' }
    : { flag: 'NL',  color: 'text-green-600' };
  if (high !== undefined) {
    if (numValue > high) return { flag: 'HIGH', color: 'text-red-600' };
    if (numValue < low)  return { flag: 'LOW',  color: 'text-yellow-600' };
    return { flag: 'NL', color: 'text-green-600' };
  }
  return { flag: '', color: 'text-gray-600' };
};

const computeParamFlag = (param: any): { flag: string; color: string } => {
  const { value, lowThreshold, highThreshold, normalRange, fieldType } = param || {};
  if (fieldType && fieldType !== 'number') return { flag: '', color: 'text-gray-600' };
  if (value === '' || value === null || value === undefined) return { flag: '', color: 'text-gray-600' };

  const num    = typeof value === 'number' ? value : parseFloat(value);
  const hasLow = typeof lowThreshold === 'number';
  const hasHigh = typeof highThreshold === 'number';

  if (!isNaN(num) && (hasLow || hasHigh)) {
    if (hasLow  && num < lowThreshold)  return { flag: 'LOW',  color: 'text-yellow-600' };
    if (hasHigh && num > highThreshold) return { flag: 'HIGH', color: 'text-red-600'    };
    return { flag: 'NL', color: 'text-green-600' };
  }
  return getResultFlag(value, normalRange);
};

const buildParametersForTest = (test: any): any[] => {
  const template: any[] | undefined = test?.LabTestTemplate?.resultTemplate || test?.resultTemplate;
  const saved: any[] = (test?.result && typeof test.result === 'object' && Array.isArray(test.result.parameters))
    ? test.result.parameters : [];

  if (Array.isArray(template) && template.length > 0) {
    return template.map((f: any) => {
      const prior = saved.find((p) => (p.fieldName && p.fieldName === f.fieldName) || p.name === f.label);
      return {
        fieldName:    f.fieldName,
        name:         f.label || f.fieldName,
        fieldType:    f.fieldType || 'text',
        options:      f.options || undefined,
        unit:         f.unit || '',
        normalRange:  prior?.normalRange ?? (f.referenceRange || ''),
        lowThreshold: typeof f.lowThreshold  === 'number' ? f.lowThreshold  : undefined,
        highThreshold: typeof f.highThreshold === 'number' ? f.highThreshold : undefined,
        value:        prior?.value ?? '',
        required:     f.fieldType === 'number',
      };
    });
  }
  if (saved.length > 0) return saved.map((p) => ({ ...p }));
  return [];
};

// ── Multi-param result form ────────────────────────────────────────────────────

const MultiParameterResultForm: React.FC<{
  test: any;
  onSave: (parameters: any[]) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}> = ({ test, onSave, onCancel, isSaving }) => {
  const [parameters, setParameters] = useState<any[]>([]);

  useEffect(() => {
    const built = buildParametersForTest(test);
    setParameters(built.length > 0
      ? built
      : [{ name: 'Result', value: '', normalRange: '', unit: '', fieldType: 'text', required: true }]
    );
  }, [test]);

  const update = (idx: number, field: string, value: any) => {
    const next = [...parameters];
    next[idx] = { ...next[idx], [field]: value };
    setParameters(next);
  };

  const renderValueInput = (param: any, idx: number) => {
    const cls = 'w-full px-2 py-1 bg-[var(--bg-main)] border border-[var(--border-color)] rounded text-sm';
    if (param.fieldType === 'select') return (
      <select value={param.value || ''} onChange={e => update(idx, 'value', e.target.value)} className={cls}>
        <option value="">-- Select --</option>
        {(param.options || []).map((o: string) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
    if (param.fieldType === 'textarea') return (
      <textarea value={param.value || ''} onChange={e => update(idx, 'value', e.target.value)}
        rows={2} placeholder="Enter result" className={`${cls} resize-none`} />
    );
    return (
      <input
        type={param.fieldType === 'number' ? 'number' : 'text'}
        step="any"
        value={param.value ?? ''}
        onChange={e => update(idx, 'value', e.target.value)}
        placeholder="Enter value"
        className={cls}
      />
    );
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
                    const flagInfo = computeParamFlag(param);
                    return (
                      <tr key={param.fieldName || idx}>
                        <td className="px-3 py-2 font-medium text-[var(--text-primary)]">
                          {param.name}{param.required && <span className="text-red-500 ml-1">*</span>}
                        </td>
                        <td className="px-3 py-2">{renderValueInput(param, idx)}</td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={param.normalRange || ''}
                            onChange={e => update(idx, 'normalRange', e.target.value)}
                            placeholder="e.g., 4.0–11.0"
                            className="w-full px-2 py-1 bg-[var(--bg-main)] border border-[var(--border-color)] rounded text-sm text-[var(--text-secondary)]"
                          />
                        </td>
                        <td className="px-3 py-2 text-[var(--text-secondary)] whitespace-nowrap">
                          {param.unit || '—'}
                        </td>
                        <td className="px-3 py-2">
                          {flagInfo.flag && (
                            <span className={`text-xs font-medium ${flagInfo.color}`}>{flagInfo.flag}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex gap-3 pt-3 border-t border-[var(--border-color)]">
              <button onClick={onCancel}
                className="flex-1 px-4 py-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-colors text-sm">
                Cancel
              </button>
              <button onClick={() => onSave(parameters)} disabled={isSaving}
                className="flex-1 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium disabled:opacity-50">
                {isSaving ? 'Saving...' : 'Save Results'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// Main page
// ═════════════════════════════════════════════════════════════════════════════

export default function LabResultEntry() {
  const navigate  = useNavigate();
  const { id }    = useParams<{ id: string }>();
  const location  = useLocation();
  const { success, error: toastError } = useToast();
  const { hospital } = useHospitalStore();

  // ── State ──────────────────────────────────────────────────────────────────
  const [isLoading,              setIsLoading]              = useState(true);
  const [refreshing,             setRefreshing]             = useState(false);
  const [selectedPatientId,      setSelectedPatientId]      = useState('');
  const [selectedAttendanceId,   setSelectedAttendanceId]   = useState('');
  const [isSubmitting,           setIsSubmitting]           = useState(false);
  const [showLabModal,           setShowLabModal]           = useState(false);
  const [resultEntryTest,        setResultEntryTest]        = useState<any>(null);
  const [isMultiParamModalOpen,  setIsMultiParamModalOpen]  = useState(false);
  const [printingId,             setPrintingId]             = useState<string | null>(null);
  const [showSendResult,         setShowSendResult]         = useState(false);
  const [sendResultTest,         setSendResultTest]         = useState<any>(null);  // which test to send

  // Single-result form fields
  const [result,      setResult]      = useState('');
  const [normalRange, setNormalRange] = useState('');
  const [units,       setUnits]       = useState('');
  const [notes,       setNotes]       = useState('');

  // ── Stores ─────────────────────────────────────────────────────────────────
  const { attendances, getAttendances, updateLabTestStatus } = useAttendanceStore();
  const { patients, loadPatients, fetchPatient }             = usePatientStore();
  const { user }                                             = useAuthStore();
  const { labTestTemplates, getLabTestTemplates }            = useMedicalServicesStore();

  const [patient,        setPatient]        = useState<any>(null);
  const [attendance,     setAttendance]     = useState<any>(null);
  const [allAttendances, setAllAttendances] = useState<any[]>([]);
  const [labTests,       setLabTests]       = useState<any[]>([]);

  // ── Load ───────────────────────────────────────────────────────────────────
  const loadData = async () => {
    try {
      setRefreshing(true);
      await Promise.all([loadPatients(), getLabTestTemplates(false)]);

      const statePatient       = location.state?.patient;
      const patientId          = statePatient?.id || id;
      const initialAttendanceId = location.state?.attendanceId;

      if (patientId) {
        const patientAttendances = await getAttendances({ patientId });
        setAllAttendances(patientAttendances);

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

  useEffect(() => { loadData(); }, [id]);

  // ── Attendance change ──────────────────────────────────────────────────────
  const handleAttendanceChange = (attendanceId: string) => {
    const att = allAttendances.find(a => a.id === attendanceId);
    if (att) {
      setSelectedAttendanceId(attendanceId);
      setAttendance(att);
      setLabTests(att.LabTest || []);
      setResultEntryTest(null);
    }
  };

  const handleClearSelection = () => {
    setSelectedAttendanceId('');
    setAttendance(null);
    setLabTests([]);
    setResultEntryTest(null);
  };

  // ── Workflow actions ───────────────────────────────────────────────────────
  const handleMarkInProgress = async (testId: string) => {
    if (!selectedAttendanceId) return;
    try {
      await updateLabTestStatus(selectedAttendanceId, testId, {
        status: 'in_progress',
        performedById: user?.id || '',
      });
      success('Status updated', 'Test in progress');
      await loadData();
    } catch (err: any) {
      toastError('Update failed', err.message);
    }
  };

  const handleOpenResultEntry = (test: any) => {
    setResultEntryTest(test);
    setNotes(test.notes || '');

    const template = test?.LabTestTemplate?.resultTemplate || test?.resultTemplate;
    const hasTemplate   = Array.isArray(template) && template.length > 0;
    const hasSavedParams = test?.result && typeof test.result === 'object'
      && Array.isArray(test.result.parameters) && test.result.parameters.length > 0;

    if (hasTemplate || hasSavedParams) {
      setIsMultiParamModalOpen(true);
    } else {
      setResult(typeof test.result === 'object' ? (test.result?.value || '') : (test.result || ''));
      setNormalRange(test.normalRange || '');
      setUnits(test.units || '');
    }
  };

  const handleSaveMultiParameterResults = async (parameters: any[]) => {
    if (!resultEntryTest || !selectedAttendanceId) return;
    setIsSubmitting(true);
    try {
      await updateLabTestStatus(selectedAttendanceId, resultEntryTest.id, {
        status: 'completed',
        result: { parameters, testName: getTestName(resultEntryTest) },
        performedById: user?.id || '',
        completedAt: new Date().toISOString(),
      });
      success('Results saved', `${getTestName(resultEntryTest)} completed`);
      setIsMultiParamModalOpen(false);
      setResultEntryTest(null);
      await loadData();
    } catch (err: any) {
      toastError('Save failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSingleResultSubmit = async () => {
    if (!resultEntryTest || !result.trim()) { toastError('Result missing', 'Please enter test result'); return; }
    if (!selectedAttendanceId)              { toastError('Error', 'No attendance selected'); return; }
    setIsSubmitting(true);
    try {
      await updateLabTestStatus(selectedAttendanceId, resultEntryTest.id, {
        status: 'completed',
        result,
        normalRange: normalRange || null,
        units: units || null,
        notes: notes || null,
        performedById: user?.id || '',
        completedAt: new Date().toISOString(),
      });
      success('Result saved', 'Lab test completed');
      setResultEntryTest(null);
      setResult(''); setNormalRange(''); setUnits(''); setNotes('');
      await loadData();
    } catch (err: any) {
      toastError('Save failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Print a single completed test result ──────────────────────────────────
  const handlePrintResult = async (test: any) => {
    if (!patient || !attendance) { toastError('Error', 'Missing patient or attendance info'); return; }
    setPrintingId(test.id);
    try {
      const parameters = test.result?.parameters || [];
      // Build a flat array of result lines whether multi-param or single-value
      const resultLines = parameters.length > 0
        ? parameters
        : [{ name: getTestName(test), value: typeof test.result === 'object' ? test.result?.value : test.result, normalRange: test.normalRange, unit: test.units }];

      const html = generatePDF('labResults', {
        labTests: [{
          testName:    getTestName(test),
          parameters:  resultLines,
          completedAt: test.completedAt,
          notes:       test.notes || '',
          priority:    test.priority || 'routine',
          specimenType: test.LabTestTemplate?.specimenType || '',
        }],
        patient: { ...patient, fullName: getPatientName(patient) },
        attendance,
        performedByName: user?.fullName || 'Lab Technician',
      }, hospital);

      openPrintWindow(html, `Lab_${getTestName(test).replace(/\s+/g, '_')}_${patient.folderNumber}`);
      success('Print ready', 'Lab result opened for printing');
    } catch (err) {
      toastError('Print failed', 'Could not generate lab result');
    } finally {
      setPrintingId(null);
    }
  };

  // ── Print ALL completed results at once ───────────────────────────────────
  const handlePrintAll = async () => {
    if (!patient || !attendance) { toastError('Error', 'Missing patient or attendance info'); return; }
    if (!completedTests.length) { toastError('Nothing to print', 'No completed lab results'); return; }
    setPrintingId('all');
    try {
      const labTestsData = completedTests.map(test => {
        const parameters = test.result?.parameters || [];
        const resultLines = parameters.length > 0
          ? parameters
          : [{ name: getTestName(test), value: typeof test.result === 'object' ? test.result?.value : test.result, normalRange: test.normalRange, unit: test.units }];
        return {
          testName:    getTestName(test),
          parameters:  resultLines,
          completedAt: test.completedAt,
          notes:       test.notes || '',
          priority:    test.priority || 'routine',
          specimenType: test.LabTestTemplate?.specimenType || '',
        };
      });

      const html = generatePDF('labResults', {
        labTests: labTestsData,
        patient:  { ...patient, fullName: getPatientName(patient) },
        attendance,
        performedByName: user?.fullName || 'Lab Technician',
      }, hospital);

      openPrintWindow(html, `Lab_Results_${patient.folderNumber}`);
      success('Print ready', 'All lab results opened for printing');
    } catch (err) {
      toastError('Print failed', 'Could not generate lab results');
    } finally {
      setPrintingId(null);
    }
  };

  const handlePrescribeSuccess = async () => {
    setShowLabModal(false);
    await loadData();
    success('Test requested', 'Lab test added successfully');
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const canAddEntries    = attendance && ['pending', 'admitted'].includes(attendance.status);
  const canUpdateLabTest = attendance && ['pending', 'admitted'].includes(attendance.status);

  const pendingTests    = labTests.filter(t => t.status === 'requested');
  const inProgressTests = labTests.filter(t => t.status === 'in_progress');
  const completedTests  = labTests.filter(t => t.status === 'completed');

  const calculateAge = (dob: string): number => {
    if (!dob) return 0;
    const today = new Date(), b = new Date(dob);
    let age = today.getFullYear() - b.getFullYear();
    if (today.getMonth() < b.getMonth() || (today.getMonth() === b.getMonth() && today.getDate() < b.getDate())) age--;
    return age;
  };

  // ── Loading / not found ────────────────────────────────────────────────────
  if (isLoading) return (
    <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
      <div className="text-center bg-[var(--bg-card)] p-8 rounded-xl border border-[var(--border-color)]">
        <div className="w-12 h-12 border-4 border-[var(--icon-cyan-text)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <h2 className="text-lg font-bold text-[var(--text-primary)]">Loading Laboratory Data...</h2>
      </div>
    </div>
  );

  if (!patient) return (
    <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
      <div className="text-center bg-[var(--bg-card)] p-8 rounded-xl border border-[var(--border-color)]">
        <AlertCircle className="w-12 h-12 text-[var(--icon-red-text)] mx-auto mb-3" />
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">Patient Not Found</h2>
        <p className="text-[var(--text-secondary)]">The patient you're looking for doesn't exist.</p>
        <button onClick={() => navigate('/dashboard/laboratory')}
          className="mt-4 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all">
          Back to Waiting List
        </button>
      </div>
    </div>
  );

  const patientFullName = getPatientName(patient);
  const patientAge      = patient.age || calculateAge(patient.dateOfBirth);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-6">

      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard/laboratory')}
            className="p-2 hover:bg-[var(--bg-card)] rounded-lg transition-all border border-[var(--border-color)]">
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

        <div className="flex items-center gap-2 flex-wrap">
          {/* Request test */}
          <button onClick={() => setShowLabModal(true)} disabled={!canAddEntries}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] rounded-lg hover:bg-[var(--icon-purple-text)] hover:text-white transition-all text-sm disabled:opacity-50">
            <Plus className="w-4 h-4" /> Request Test
          </button>

          {/* Print all completed results */}
          {completedTests.length > 0 && (
            <button onClick={handlePrintAll} disabled={printingId === 'all'}
              className="flex items-center gap-2 px-4 py-2 border border-[var(--border-color)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-card)] transition-all text-sm disabled:opacity-50">
              <Printer className={`w-4 h-4 ${printingId === 'all' ? 'animate-pulse' : ''}`} />
              Print All
            </button>
          )}

          {/* Send all results via SendDocumentModal */}
          {completedTests.length > 0 && (
            <button onClick={() => { setSendResultTest(null); setShowSendResult(true); }}
              className="flex items-center gap-2 px-4 py-2 border border-green-200 text-green-700 rounded-lg hover:bg-green-50 transition-all text-sm">
              <MessageSquare className="w-4 h-4" /> Send Results
            </button>
          )}

          <button onClick={loadData} disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all disabled:opacity-50 text-sm text-[var(--text-primary)]">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── SEND DOCUMENT MODAL ─────────────────────────────────────────────── */}
      <SendDocumentModal
        open={showSendResult}
        onClose={() => { setShowSendResult(false); setSendResultTest(null); }}
        patient={patient}
        documentType="lab-result"
        entityId={sendResultTest?.id || selectedAttendanceId}
      />

      {/* ── PATIENT / ATTENDANCE SELECTOR ───────────────────────────────────── */}
      <PatientAttendanceSelector
        patients={[patient]}
        attendances={allAttendances}
        selectedPatientId={selectedPatientId}
        selectedAttendanceId={selectedAttendanceId}
        onPatientSelect={patientId => {
          setSelectedPatientId(patientId);
          setAllAttendances(attendances.filter(a => a.patientId === patientId));
          setSelectedAttendanceId('');
          setAttendance(null);
          setLabTests([]);
        }}
        onAttendanceSelect={handleAttendanceChange}
        onClearSelection={handleClearSelection}
      />

      {/* No attendance selected */}
      {!selectedAttendanceId && (
        <div className="bg-[var(--icon-yellow-bg)] border border-[var(--icon-yellow-text)] rounded-xl p-8 text-center">
          <Calendar className="w-12 h-12 text-[var(--icon-yellow-text)] mx-auto mb-3 opacity-50" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No Attendance Selected</h3>
          <p className="text-[var(--text-secondary)]">Please select an attendance from the dropdown above to manage lab tests.</p>
        </div>
      )}

      {/* ── MAIN CONTENT ────────────────────────────────────────────────────── */}
      {selectedAttendanceId && attendance && (
        <>
          {/* Patient info card */}
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
                  <p className="text-sm text-[var(--text-primary)] mt-1 capitalize">{patientAge} years · {patient.gender || '—'}</p>
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
          {!canUpdateLabTest && (
            <div className="bg-[var(--icon-yellow-bg)] border border-[var(--icon-yellow-text)] rounded-xl p-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-[var(--icon-yellow-text)]" />
              <p className="text-sm text-[var(--icon-yellow-text)]">
                This visit is <strong>{attendance.status}</strong>. Tests can be viewed but not processed.
              </p>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { count: pendingTests.length,    label: 'Pending Tests', color: 'text-yellow-600', bg: 'bg-yellow-100', Icon: Clock },
              { count: inProgressTests.length, label: 'In Progress',   color: 'text-blue-600',   bg: 'bg-blue-100',   Icon: Activity },
              { count: completedTests.length,  label: 'Completed',     color: 'text-green-600',  bg: 'bg-green-100',  Icon: CheckCircle },
            ].map(s => (
              <div key={s.label} className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">{s.label}</p>
                  </div>
                  <div className={`w-10 h-10 ${s.bg} rounded-lg flex items-center justify-center`}>
                    <s.Icon className={`w-5 h-5 ${s.color}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Request new test */}
          {canAddEntries && (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-4">
              <button onClick={() => setShowLabModal(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium">
                <Plus className="w-4 h-4" /> Request Laboratory Test
              </button>
            </div>
          )}

          {/* ── PENDING TESTS ──────────────────────────────────────────────── */}
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
                    {pendingTests.map(test => {
                      const priorityCls = test.priority === 'stat'   ? 'bg-red-100 text-red-700'    :
                                          test.priority === 'urgent' ? 'bg-orange-100 text-orange-700' :
                                                                        'bg-blue-100 text-blue-700';
                      return (
                        <tr key={test.id} className="hover:bg-[var(--bg-main)] transition-colors">
                          <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{getTestName(test)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityCls}`}>
                              {test.priority || 'routine'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[var(--text-secondary)]">
                            {test.requestedAt ? new Date(test.requestedAt).toLocaleString() : '—'}
                          </td>
                          <td className="px-4 py-3">
                            {canUpdateLabTest && (
                              <button onClick={() => handleMarkInProgress(test.id)}
                                className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs hover:bg-blue-700 hover:text-white transition-all">
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

          {/* ── IN PROGRESS ────────────────────────────────────────────────── */}
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
                    {inProgressTests.map(test => (
                      <tr key={test.id} className="hover:bg-[var(--bg-main)] transition-colors">
                        <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{getTestName(test)}</td>
                        <td className="px-4 py-3 text-[var(--text-secondary)]">
                          {test.updatedAt ? new Date(test.updatedAt).toLocaleString() : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => handleOpenResultEntry(test)}
                            className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs hover:bg-green-700 hover:text-white transition-all">
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

          {/* ── COMPLETED RESULTS ──────────────────────────────────────────── */}
          {completedTests.length > 0 && (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
              <div className="bg-[var(--bg-main)] px-6 py-3 border-b border-[var(--border-color)] flex items-center justify-between">
                <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Completed Results ({completedTests.length})
                </h3>
                {/* Print all + send all shortcut in section header */}
                <div className="flex items-center gap-2">
                  <button onClick={handlePrintAll} disabled={printingId === 'all'}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[var(--border-color)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-card)] transition-all disabled:opacity-50">
                    <Printer className={`w-3.5 h-3.5 ${printingId === 'all' ? 'animate-pulse' : ''}`} />
                    Print All
                  </button>
                  <button onClick={() => { setSendResultTest(null); setShowSendResult(true); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-green-200 text-green-700 rounded-lg hover:bg-green-50 transition-all">
                    <MessageSquare className="w-3.5 h-3.5" /> Send All
                  </button>
                </div>
              </div>

              <div className="max-h-[600px] overflow-y-auto divide-y divide-[var(--border-color)]">
                {completedTests.map(test => {
                  const hasParameters = test.result && typeof test.result === 'object' && test.result.parameters;
                  const parameters    = hasParameters ? test.result.parameters : [];

                  return (
                    <div key={test.id}>
                      {/* Test header row */}
                      <div className="bg-[var(--bg-main)] px-4 py-2.5 border-b border-[var(--border-color)]">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-sm text-[var(--text-primary)]">{getTestName(test)}</h4>
                            <p className="text-[10px] text-[var(--text-secondary)]">
                              Completed: {test.completedAt ? new Date(test.completedAt).toLocaleString() : '—'}
                            </p>
                          </div>
                          {/* Per-test actions: print, send, edit */}
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handlePrintResult(test)}
                              disabled={printingId === test.id}
                              className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-bg)] transition-all disabled:opacity-40"
                              title="Print this result"
                            >
                              <Printer className={`w-3.5 h-3.5 ${printingId === test.id ? 'animate-pulse' : ''}`} />
                            </button>
                            <button
                              onClick={() => { setSendResultTest(test); setShowSendResult(true); }}
                              className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-green-600 hover:bg-green-50 transition-all"
                              title="Send this result"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenResultEntry(test)}
                              className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-blue-600 hover:bg-blue-50 transition-all"
                              title="Edit result"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Multi-parameter results table */}
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
                                const flagInfo = computeParamFlag(param);
                                return (
                                  <tr key={param.fieldName || idx} className="hover:bg-[var(--bg-main)] transition-colors">
                                    <td className="px-4 py-2 font-medium text-[var(--text-primary)]">{param.name}</td>
                                    <td className={`px-4 py-2 font-mono ${flagInfo.color}`}>
                                      {param.value || '—'}{param.unit && <span className="text-[10px] ml-1">{param.unit}</span>}
                                    </td>
                                    <td className="px-4 py-2 text-[var(--text-secondary)]">{param.normalRange || '—'}</td>
                                    <td className="px-4 py-2">
                                      {flagInfo.flag && (
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                          flagInfo.flag === 'HIGH' ? 'bg-red-100 text-red-700' :
                                          flagInfo.flag === 'LOW'  ? 'bg-yellow-100 text-yellow-700' :
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
                        /* Single-value result */
                        <div className="p-4">
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <span className="text-xs text-[var(--text-secondary)]">Result</span>
                              <p className="text-sm font-mono text-[var(--text-primary)]">
                                {typeof test.result === 'object' ? test.result?.value || '—' : test.result || '—'}
                                {test.units && <span className="text-xs text-[var(--text-secondary)] ml-1">{test.units}</span>}
                              </p>
                            </div>
                            <div>
                              <span className="text-xs text-[var(--text-secondary)]">Normal Range</span>
                              <p className="text-sm text-[var(--text-primary)]">{test.normalRange || '—'}</p>
                            </div>
                            <div>
                              <span className="text-xs text-[var(--text-secondary)]">Flag</span>
                              {(() => {
                                const fi = getResultFlag(
                                  typeof test.result === 'object' ? test.result?.value : test.result,
                                  test.normalRange
                                );
                                return fi.flag ? (
                                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                    fi.flag === 'HIGH' ? 'bg-red-100 text-red-700' :
                                    fi.flag === 'LOW'  ? 'bg-yellow-100 text-yellow-700' :
                                                         'bg-green-100 text-green-700'
                                  }`}>{fi.flag}</span>
                                ) : <span className="text-[var(--text-secondary)]">—</span>;
                              })()}
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

          {/* Empty state */}
          {!pendingTests.length && !inProgressTests.length && !completedTests.length && (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-8 text-center">
              <Microscope className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">No Lab Tests</h3>
              <p className="text-sm text-[var(--text-secondary)]">No laboratory tests have been requested for this visit</p>
              {canAddEntries && (
                <button onClick={() => setShowLabModal(true)} className="mt-3 text-[var(--icon-cyan-text)] text-sm hover:underline">
                  Request a test
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* ── SINGLE RESULT ENTRY MODAL ────────────────────────────────────────── */}
      {resultEntryTest && !isMultiParamModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setResultEntryTest(null)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-[var(--bg-card)] rounded-xl shadow-xl max-w-md w-full border border-[var(--border-color)]">
              <div className="bg-[var(--bg-main)] px-5 py-3 border-b border-[var(--border-color)] rounded-t-xl flex items-center justify-between">
                <h3 className="font-semibold text-[var(--text-primary)]">Enter Results: {getTestName(resultEntryTest)}</h3>
                <button onClick={() => setResultEntryTest(null)} className="p-1 hover:bg-[var(--bg-card)] rounded-lg">
                  <X className="w-4 h-4 text-[var(--text-secondary)]" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Result *</label>
                  <input type="text" value={result} onChange={e => setResult(e.target.value)}
                    placeholder="Enter result value" autoFocus
                    className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Normal Range</label>
                    <input type="text" value={normalRange} onChange={e => setNormalRange(e.target.value)}
                      placeholder="e.g., 4.0–11.0"
                      className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Units</label>
                    <input type="text" value={units} onChange={e => setUnits(e.target.value)}
                      placeholder="e.g., g/dL"
                      className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Notes</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                    placeholder="Additional comments..."
                    className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm resize-none" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setResultEntryTest(null)}
                    className="flex-1 px-4 py-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all text-sm">
                    Cancel
                  </button>
                  <button onClick={handleSingleResultSubmit} disabled={isSubmitting || !result.trim()}
                    className="flex-1 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium disabled:opacity-50">
                    {isSubmitting ? 'Saving...' : 'Save Result'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MULTI-PARAMETER RESULT MODAL ─────────────────────────────────────── */}
      {isMultiParamModalOpen && resultEntryTest && (
        <MultiParameterResultForm
          test={resultEntryTest}
          onSave={handleSaveMultiParameterResults}
          onCancel={() => { setIsMultiParamModalOpen(false); setResultEntryTest(null); }}
          isSaving={isSubmitting}
        />
      )}

      {/* ── LAB TEST REQUEST MODAL ───────────────────────────────────────────── */}
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