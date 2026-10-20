// src/pages/LabResultEntry.tsx — Laboratory Results Entry (Enhanced UI/UX)
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
  ChevronLeft, FlaskConical, Printer, RefreshCw, AlertCircle,
  Plus, Clock, CheckCircle, Activity, User, Calendar, X, Edit,
  FileText, Microscope, TrendingUp, TrendingDown, AlertTriangle,
  Save, MessageSquare, Hash, Phone, Info, ChevronDown,
  ChevronRight, Sparkles, TestTube, Stethoscope, Building2,
  BedDouble, Play, Wand2, BarChart3, ArrowUp, ArrowDown,
  CircleDot, Minus, ChevronUp, Maximize2,
} from 'lucide-react';

const getEntityId = (entity: { id?: string; _id?: string } | null): string | undefined =>
  entity?.id || entity?._id;

// ── Result flag helpers ───────────────────────────────────────────────────────
type FlagInfo = { flag: string; color: string };

const getResultFlag = (value: number | string, normalRange?: string): FlagInfo => {
  if (!normalRange) return { flag: '', color: 'text-gray-600' };
  const cleaned = normalRange.replace(/[–—]/g, '-');
  const rangeMatch = cleaned.match(/([<>])?\s*(\d+(?:\.\d+)?)\s*-?\s*(\d+(?:\.\d+)?)?/);
  if (!rangeMatch) return { flag: '', color: 'text-gray-600' };

  const numValue = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(numValue)) return { flag: '', color: 'text-gray-600' };

  const operator = rangeMatch[1];
  const low = parseFloat(rangeMatch[2]);
  const high = rangeMatch[3] ? parseFloat(rangeMatch[3]) : undefined;

  if (operator === '>') return numValue > low
    ? { flag: 'HIGH', color: 'text-red-600' }
    : { flag: 'NL', color: 'text-green-600' };
  if (operator === '<') return numValue < low
    ? { flag: 'LOW', color: 'text-yellow-600' }
    : { flag: 'NL', color: 'text-green-600' };
  if (high !== undefined) {
    if (numValue > high) return { flag: 'HIGH', color: 'text-red-600' };
    if (numValue < low) return { flag: 'LOW', color: 'text-yellow-600' };
    return { flag: 'NL', color: 'text-green-600' };
  }
  return { flag: '', color: 'text-gray-600' };
};

const computeParamFlag = (param: any): FlagInfo => {
  const { value, lowThreshold, highThreshold, normalRange, fieldType } = param || {};
  if (fieldType && fieldType !== 'number') return { flag: '', color: 'text-gray-600' };
  if (value === '' || value === null || value === undefined) return { flag: '', color: 'text-gray-600' };

  const num = typeof value === 'number' ? value : parseFloat(value);
  const hasLow = typeof lowThreshold === 'number';
  const hasHigh = typeof highThreshold === 'number';

  if (!isNaN(num) && (hasLow || hasHigh)) {
    if (hasLow && num < lowThreshold) return { flag: 'LOW', color: 'text-yellow-600' };
    if (hasHigh && num > highThreshold) return { flag: 'HIGH', color: 'text-red-600' };
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
        fieldName: f.fieldName,
        name: f.label || f.fieldName,
        fieldType: f.fieldType || 'text',
        options: f.options || undefined,
        unit: f.unit || '',
        normalRange: prior?.normalRange ?? (f.referenceRange || ''),
        lowThreshold: typeof f.lowThreshold === 'number' ? f.lowThreshold : undefined,
        highThreshold: typeof f.highThreshold === 'number' ? f.highThreshold : undefined,
        value: prior?.value ?? '',
        required: f.fieldType === 'number',
      };
    });
  }
  if (saved.length > 0) return saved.map((p) => ({ ...p }));
  return [];
};

const getTestName = (test: any): string =>
  test?.name || test?.LabTestTemplate?.name || test?.ServiceCatalog?.name || 'Unknown Test';

// ── Reusable pills ────────────────────────────────────────────────────────────
const PriorityPill: React.FC<{ priority: string }> = ({ priority }) => {
  const map: Record<string, string> = {
    stat:   'bg-red-100 text-red-700 border-red-200',
    urgent: 'bg-orange-100 text-orange-700 border-orange-200',
    routine:'bg-blue-100 text-blue-700 border-blue-200',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${map[priority] || map.routine}`}>
      {priority === 'stat' && <AlertTriangle className="w-2.5 h-2.5" />}
      {priority?.toUpperCase() || 'ROUTINE'}
    </span>
  );
};

const FlagPill: React.FC<{ flag: string }> = ({ flag }) => {
  if (!flag) return <span className="text-[var(--text-tertiary)]">—</span>;
  const map: Record<string, string> = {
    HIGH: 'bg-red-100 text-red-700 border-red-200',
    LOW:  'bg-yellow-100 text-yellow-700 border-yellow-200',
    NL:   'bg-green-100 text-green-700 border-green-200',
  };
  const Icon = flag === 'HIGH' ? ArrowUp : flag === 'LOW' ? ArrowDown : CheckCircle;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${map[flag] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
      <Icon className="w-2.5 h-2.5" />
      {flag}
    </span>
  );
};

// ── Reusable section wrapper ──────────────────────────────────────────────────
const ResultSection: React.FC<{
  title: string;
  count: number;
  icon: React.ElementType;
  accent: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, count, icon: Icon, accent, actions, children }) => (
  <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden shadow-sm">
    <div className="bg-[var(--bg-main)] px-5 py-3 border-b border-[var(--border-color)] flex items-center justify-between gap-3">
      <h3 className="font-semibold text-sm text-[var(--text-primary)] flex items-center gap-2">
        <div className={`w-6 h-6 rounded-md flex items-center justify-center ${accent}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        {title}
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-color)]">
          {count}
        </span>
      </h3>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
    {children}
  </div>
);

// ── Multi-param result modal ──────────────────────────────────────────────────
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
    const cls = 'w-full px-2.5 py-1.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all';
    if (param.fieldType === 'select') return (
      <select value={param.value || ''} onChange={e => update(idx, 'value', e.target.value)} className={cls}>
        <option value="">— Select —</option>
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

  const filledCount = parameters.filter(p => p.value !== '' && p.value !== null && p.value !== undefined).length;
  const progress = parameters.length > 0 ? Math.round((filledCount / parameters.length) * 100) : 0;
  const abnormalCount = parameters.filter(p => {
    const f = computeParamFlag(p);
    return f.flag === 'HIGH' || f.flag === 'LOW';
  }).length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
        <div className="relative bg-[var(--bg-card)] rounded-2xl shadow-2xl max-w-4xl w-full max-h-[94vh] flex flex-col overflow-hidden border border-[var(--border-color)]">

          {/* Header */}
          <div className="relative bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 px-6 py-5 text-white flex-shrink-0">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400 via-teal-400 to-transparent" />
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center flex-shrink-0">
                  <FlaskConical className="w-6 h-6 text-cyan-300" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold truncate text-white">
                    Enter Results
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    {getTestName(test)}
                  </p>
                </div>
              </div>
              <button
                onClick={onCancel}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0 text-slate-300 hover:text-white"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live progress strip */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Parameters</p>
                <p className="text-sm font-bold text-white">{filledCount} / {parameters.length}</p>
              </div>
              <div className="bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Abnormal</p>
                <p className={`text-sm font-bold ${abnormalCount > 0 ? 'text-red-300' : 'text-white'}`}>
                  {abnormalCount} flagged
                </p>
              </div>
              <div className="bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Progress</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        progress === 100 ? 'bg-green-400' : 'bg-cyan-400'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-white">{progress}%</span>
                </div>
              </div>
            </div>

            {abnormalCount > 0 && (
              <div className="mt-3 flex items-center gap-2 bg-red-500/20 border border-red-400/40 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 text-red-300 flex-shrink-0" />
                <p className="text-xs font-semibold text-red-200">
                  {abnormalCount} abnormal result{abnormalCount > 1 ? 's' : ''} detected — review before saving
                </p>
              </div>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: 'thin' }}>
            <div className="overflow-x-auto rounded-xl border border-[var(--border-color)]">
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                  <tr>
                    <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] w-[32%]">Parameter</th>
                    <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Result</th>
                    <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Normal Range</th>
                    <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Units</th>
                    <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Flag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {parameters.map((param, idx) => {
                    const flagInfo = computeParamFlag(param);
                    return (
                      <tr key={param.fieldName || idx} className={`transition-colors ${
                        flagInfo.flag === 'HIGH' ? 'bg-red-50/40' :
                        flagInfo.flag === 'LOW' ? 'bg-yellow-50/40' : ''
                      }`}>
                        <td className="px-3 py-2 font-medium text-[var(--text-primary)]">
                          {param.name}
                          {param.required && <span className="text-red-500 ml-1">*</span>}
                        </td>
                        <td className="px-3 py-2">{renderValueInput(param, idx)}</td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={param.normalRange || ''}
                            onChange={e => update(idx, 'normalRange', e.target.value)}
                            placeholder="e.g., 4.0–11.0"
                            className="w-full px-2.5 py-1.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-secondary)] focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all"
                          />
                        </td>
                        <td className="px-3 py-2 text-[var(--text-secondary)] whitespace-nowrap text-xs">
                          {param.unit || '—'}
                        </td>
                        <td className="px-3 py-2">
                          <FlagPill flag={flagInfo.flag} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 border-t border-[var(--border-color)] bg-[var(--bg-card)] px-6 py-4 flex items-center justify-between gap-3 flex-wrap">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-[var(--border-color)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-main)] text-sm font-medium transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(parameters)}
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold shadow-sm shadow-cyan-500/20 transition-all"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Results
                </>
              )}
            </button>
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
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { success, error: toastError } = useToast();
  const { hospital } = useHospitalStore();

  // ── State ──
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedAttendanceId, setSelectedAttendanceId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLabModal, setShowLabModal] = useState(false);
  const [resultEntryTest, setResultEntryTest] = useState<any>(null);
  const [isMultiParamModalOpen, setIsMultiParamModalOpen] = useState(false);
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [showSendResult, setShowSendResult] = useState(false);
  const [sendResultTest, setSendResultTest] = useState<any>(null);

  const [result, setResult] = useState('');
  const [normalRange, setNormalRange] = useState('');
  const [units, setUnits] = useState('');
  const [notes, setNotes] = useState('');

  const { attendances, getAttendances, updateLabTestStatus } = useAttendanceStore();
  const { patients, loadPatients, fetchPatient } = usePatientStore();
  const { user } = useAuthStore();
  const { labTestTemplates, getLabTestTemplates } = useMedicalServicesStore();

  const [patient, setPatient] = useState<any>(null);
  const [attendance, setAttendance] = useState<any>(null);
  const [allAttendances, setAllAttendances] = useState<any[]>([]);
  const [labTests, setLabTests] = useState<any[]>([]);

  // ── Load ──
  const loadData = async () => {
    try {
      setRefreshing(true);
      await Promise.all([loadPatients(), getLabTestTemplates(false)]);

      const statePatient = location.state?.patient;
      const patientId = statePatient?.id || id;
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
    const hasTemplate = Array.isArray(template) && template.length > 0;
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
    if (!selectedAttendanceId) { toastError('Error', 'No attendance selected'); return; }
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

  const handlePrintResult = async (test: any) => {
    if (!patient || !attendance) { toastError('Error', 'Missing patient or attendance info'); return; }
    setPrintingId(test.id);
    try {
      const parameters = test.result?.parameters || [];
      const resultLines = parameters.length > 0
        ? parameters
        : [{ name: getTestName(test), value: typeof test.result === 'object' ? test.result?.value : test.result, normalRange: test.normalRange, unit: test.units }];

      const html = generatePDF('labResults', {
        labTests: [{
          testName: getTestName(test),
          parameters: resultLines,
          completedAt: test.completedAt,
          notes: test.notes || '',
          priority: test.priority || 'routine',
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
          testName: getTestName(test),
          parameters: resultLines,
          completedAt: test.completedAt,
          notes: test.notes || '',
          priority: test.priority || 'routine',
          specimenType: test.LabTestTemplate?.specimenType || '',
        };
      });

      const html = generatePDF('labResults', {
        labTests: labTestsData,
        patient: { ...patient, fullName: getPatientName(patient) },
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

  // ── Derived ──
  const canAddEntries = attendance && ['pending', 'admitted'].includes(attendance.status);
  const canUpdateLabTest = attendance && ['pending', 'admitted'].includes(attendance.status);

  const pendingTests = labTests.filter(t => t.status === 'requested');
  const inProgressTests = labTests.filter(t => t.status === 'in_progress');
  const completedTests = labTests.filter(t => t.status === 'completed');

  const abnormalCount = useMemo(() => {
    return completedTests.reduce((acc, test) => {
      const params = test.result?.parameters || [];
      return acc + params.filter((p: any) => {
        const f = computeParamFlag(p);
        return f.flag === 'HIGH' || f.flag === 'LOW';
      }).length;
    }, 0);
  }, [completedTests]);

  const calculateAge = (dob: string): number => {
    if (!dob) return 0;
    const today = new Date(), b = new Date(dob);
    let age = today.getFullYear() - b.getFullYear();
    if (today.getMonth() < b.getMonth() || (today.getMonth() === b.getMonth() && today.getDate() < b.getDate())) age--;
    return age;
  };

  if (isLoading) return (
    <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
      <div className="text-center bg-[var(--bg-card)] p-8 rounded-xl border border-[var(--border-color)]">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <h2 className="text-lg font-bold text-[var(--text-primary)]">Loading Laboratory Data…</h2>
      </div>
    </div>
  );

  if (!patient) return (
    <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
      <div className="text-center bg-[var(--bg-card)] p-8 rounded-xl border border-[var(--border-color)]">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">Patient Not Found</h2>
        <p className="text-[var(--text-secondary)]">The patient you're looking for doesn't exist.</p>
        <button onClick={() => navigate('/dashboard/laboratory')}
          className="mt-4 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-all">
          Back to Waiting List
        </button>
      </div>
    </div>
  );

  const patientFullName = getPatientName(patient);
  const patientAge = patient.age || calculateAge(patient.dateOfBirth);
  const totalTests = labTests.length;

  return (
    <div className="space-y-5 p-4 sm:p-6">

      {/* ── HEADER ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard/laboratory')}
            className="p-2 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-card)] transition-colors">
            <ChevronLeft className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-xl flex items-center justify-center shadow-sm shadow-cyan-500/20">
            <FlaskConical className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-[var(--text-primary)]">Laboratory Results</h1>
            <p className="text-xs text-[var(--text-secondary)] truncate">
              {patientFullName} · {totalTests} test{totalTests !== 1 ? 's' : ''}
              {abnormalCount > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 text-red-600 font-semibold">
                  <AlertTriangle className="w-3 h-3" />
                  {abnormalCount} abnormal
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowLabModal(true)} disabled={!canAddEntries}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-all text-sm font-semibold disabled:opacity-50 shadow-sm shadow-cyan-500/20">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Request Test</span>
            <span className="sm:hidden">New</span>
          </button>

          {completedTests.length > 0 && (
            <>
              <button onClick={handlePrintAll} disabled={printingId === 'all'}
                className="flex items-center gap-1.5 px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all disabled:opacity-50 text-sm font-medium"
                title="Print all completed results">
                <Printer className={`w-4 h-4 ${printingId === 'all' ? 'animate-pulse' : ''}`} />
                <span className="hidden sm:inline">Print All</span>
                <span className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--bg-main)] font-bold">
                  {completedTests.length}
                </span>
              </button>
              <button onClick={() => { setSendResultTest(null); setShowSendResult(true); }}
                className="p-2 rounded-lg border border-green-200 text-green-700 hover:bg-green-50 transition-all"
                title="Send all results">
                <MessageSquare className="w-4 h-4" />
              </button>
            </>
          )}

          <button onClick={loadData} disabled={refreshing}
            className="p-2 rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)] transition-colors disabled:opacity-50"
            title="Refresh">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── SEND MODAL ── */}
      <SendDocumentModal
        open={showSendResult}
        onClose={() => { setShowSendResult(false); setSendResultTest(null); }}
        patient={patient}
        documentType="lab-result"
        entityId={sendResultTest?.id || selectedAttendanceId}
      />

      {/* ── SELECTOR ── */}
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

      {!selectedAttendanceId && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-10 text-center shadow-sm">
          <div className="w-16 h-16 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-yellow-600" />
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">No Attendance Selected</h3>
          <p className="text-sm text-[var(--text-secondary)] max-w-sm mx-auto">
            Select an attendance from the dropdown above to manage lab tests.
          </p>
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      {selectedAttendanceId && attendance && (
        <>
          {/* Patient info card */}
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden shadow-sm">
            <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-100 to-cyan-50 border border-cyan-200 flex items-center justify-center shadow-sm">
                  <User className="w-5 h-5 text-cyan-600" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-[var(--text-primary)] text-base">{patientFullName}</h3>
                    <span className="text-xs text-[var(--text-secondary)]">
                      {patient.gender === 'male' ? '♂' : patient.gender === 'female' ? '♀' : '·'} · {patientAge}y
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs mt-1">
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] bg-[var(--bg-main)] px-1.5 py-0.5 rounded border border-[var(--border-color)]">
                      <Hash className="w-2.5 h-2.5 text-[var(--text-tertiary)]" />
                      {patient.folderNumber}
                    </span>
                    {patient.contact && (
                      <span className="inline-flex items-center gap-1 text-[var(--text-secondary)]">
                        <Phone className="w-2.5 h-2.5" />
                        {patient.contact}
                      </span>
                    )}
                    {(attendance.ward?.wardName || attendance.bed?.bedNumber) && (
                      <span className="inline-flex items-center gap-1 text-[var(--text-secondary)]">
                        <BedDouble className="w-2.5 h-2.5" />
                        {attendance.ward?.wardName || '—'} / {attendance.bed?.bedNumber || '—'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="bg-[var(--bg-main)] px-2.5 py-1 rounded-full border border-[var(--border-color)]">
                  <span className="text-xs font-mono text-[var(--text-secondary)]">
                    #{attendance.attendanceNumber || 'New Visit'}
                  </span>
                </div>
                <div className="bg-[var(--bg-main)] px-2.5 py-1 rounded-full border border-[var(--border-color)]">
                  <span className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(attendance.dateTime || attendance.createdAt || '').toLocaleDateString()}
                  </span>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                  attendance.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                  attendance.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' :
                  'bg-gray-50 text-gray-700 border-gray-200'
                }`}>
                  {attendance.status?.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
          </div>

          {/* Read-only warning */}
          {!canUpdateLabTest && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-yellow-800 font-medium">Read-only view</p>
                <p className="text-xs text-yellow-700 mt-0.5">
                  This visit is <strong>{attendance.status}</strong>. Tests can be viewed but not processed.
                </p>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { count: pendingTests.length, label: 'Pending', color: 'text-yellow-600', bg: 'bg-yellow-100', Icon: Clock },
              { count: inProgressTests.length, label: 'In Progress', color: 'text-blue-600', bg: 'bg-blue-100', Icon: Activity },
              { count: completedTests.length, label: 'Completed', color: 'text-green-600', bg: 'bg-green-100', Icon: CheckCircle },
            ].map(s => {
              const Icon = s.Icon;
              return (
                <div key={s.label} className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] hover:shadow-sm transition-shadow">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-1.5 ${s.bg}">
                    <Icon className={`w-4.5 h-4.5 ${s.color}`} />
                  </div>
                  <p className={`text-2xl font-bold ${s.color} leading-tight`}>{s.count}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">{s.label}</p>
                </div>
              );
            })}
          </div>

          {/* ── PENDING TESTS ── */}
          {pendingTests.length > 0 && (
            <ResultSection
              title="Pending Tests"
              count={pendingTests.length}
              icon={Clock}
              accent="bg-yellow-100 text-yellow-600"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--bg-main)]/50 border-b border-[var(--border-color)]">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Test Name</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Priority</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Requested</th>
                      <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {pendingTests.map(test => (
                      <tr key={test.id} className="hover:bg-cyan-50/30 transition-colors group">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-sm text-[var(--text-primary)]">{getTestName(test)}</p>
                          {test.LabTestTemplate?.specimenType && (
                            <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5 flex items-center gap-1">
                              <TestTube className="w-2.5 h-2.5" />
                              {test.LabTestTemplate.specimenType}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <PriorityPill priority={test.priority || 'routine'} />
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                          {test.requestedAt ? new Date(test.requestedAt).toLocaleString() : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {canUpdateLabTest && (
                            <button onClick={() => handleMarkInProgress(test.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-cyan-100 text-cyan-700 rounded-lg text-xs font-semibold hover:bg-cyan-600 hover:text-white transition-all">
                              <Play className="w-3 h-3" />
                              Start
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ResultSection>
          )}

          {/* ── IN PROGRESS ── */}
          {inProgressTests.length > 0 && (
            <ResultSection
              title="In Progress"
              count={inProgressTests.length}
              icon={Activity}
              accent="bg-blue-100 text-blue-600"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--bg-main)]/50 border-b border-[var(--border-color)]">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Test Name</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Started</th>
                      <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {inProgressTests.map(test => (
                      <tr key={test.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-sm text-[var(--text-primary)]">{getTestName(test)}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                          {test.updatedAt ? new Date(test.updatedAt).toLocaleString() : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => handleOpenResultEntry(test)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-semibold hover:bg-green-600 hover:text-white transition-all">
                            <FileText className="w-3 h-3" />
                            Enter Result
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ResultSection>
          )}

          {/* ── COMPLETED RESULTS ── */}
          {completedTests.length > 0 && (
            <ResultSection
              title="Completed Results"
              count={completedTests.length}
              icon={CheckCircle}
              accent="bg-green-100 text-green-600"
              actions={
                <>
                  <button onClick={handlePrintAll} disabled={printingId === 'all'}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium border border-[var(--border-color)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-card)] hover:text-cyan-600 hover:border-cyan-300 transition-all disabled:opacity-50">
                    <Printer className={`w-3 h-3 ${printingId === 'all' ? 'animate-pulse' : ''}`} />
                    <span className="hidden sm:inline">Print All</span>
                  </button>
                  <button onClick={() => { setSendResultTest(null); setShowSendResult(true); }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium border border-green-200 text-green-700 rounded-lg hover:bg-green-50 transition-all">
                    <MessageSquare className="w-3 h-3" />
                    <span className="hidden sm:inline">Send All</span>
                  </button>
                </>
              }
            >
              <div className="divide-y divide-[var(--border-color)]">
                {completedTests.map(test => {
                  const hasParameters = test.result && typeof test.result === 'object' && Array.isArray(test.result.parameters);
                  const parameters = hasParameters ? test.result.parameters : [];
                  const abnormalInTest = parameters.filter((p: any) => {
                    const f = computeParamFlag(p);
                    return f.flag === 'HIGH' || f.flag === 'LOW';
                  }).length;

                  return (
                    <div key={test.id}>
                      {/* Test header */}
                      <div className="bg-[var(--bg-main)]/50 px-4 py-3 border-b border-[var(--border-color)]">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-sm text-[var(--text-primary)] truncate">{getTestName(test)}</h4>
                              {abnormalInTest > 0 && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700 border border-red-200 flex-shrink-0">
                                  <AlertTriangle className="w-2.5 h-2.5" />
                                  {abnormalInTest} abnormal
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 flex items-center gap-1.5">
                              <Clock className="w-2.5 h-2.5" />
                              Completed: {test.completedAt ? new Date(test.completedAt).toLocaleString() : '—'}
                              {test.LabTestTemplate?.specimenType && (
                                <>
                                  <span className="opacity-40">·</span>
                                  <TestTube className="w-2.5 h-2.5" />
                                  {test.LabTestTemplate.specimenType}
                                </>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-0.5 flex-shrink-0">
                            <button onClick={() => handlePrintResult(test)} disabled={printingId === test.id}
                              className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-cyan-600 hover:bg-cyan-50 transition-all disabled:opacity-40"
                              title="Print">
                              <Printer className={`w-3.5 h-3.5 ${printingId === test.id ? 'animate-pulse' : ''}`} />
                            </button>
                            <button onClick={() => { setSendResultTest(test); setShowSendResult(true); }}
                              className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-green-600 hover:bg-green-50 transition-all"
                              title="Send">
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleOpenResultEntry(test)}
                              className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-blue-600 hover:bg-blue-50 transition-all"
                              title="Edit">
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Parameters table */}
                      {hasParameters && parameters.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead className="bg-[var(--bg-main)]/30 border-b border-[var(--border-color)]">
                              <tr>
                                <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] w-[35%]">Parameter</th>
                                <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Result</th>
                                <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Normal Range</th>
                                <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Flag</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-color)]">
                              {parameters.map((param: any, idx: number) => {
                                const flagInfo = computeParamFlag(param);
                                const rowBg = flagInfo.flag === 'HIGH' ? 'bg-red-50/40' :
                                              flagInfo.flag === 'LOW' ? 'bg-yellow-50/40' : '';
                                return (
                                  <tr key={param.fieldName || idx} className={`${rowBg} hover:bg-cyan-50/30 transition-colors`}>
                                    <td className="px-4 py-2 font-medium text-[var(--text-primary)]">{param.name}</td>
                                    <td className={`px-4 py-2 font-mono ${flagInfo.color}`}>
                                      {param.value || '—'}
                                      {param.unit && <span className="text-[10px] ml-1 opacity-70">{param.unit}</span>}
                                    </td>
                                    <td className="px-4 py-2 text-[var(--text-secondary)]">{param.normalRange || '—'}</td>
                                    <td className="px-4 py-2">
                                      <FlagPill flag={flagInfo.flag} />
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
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Result</span>
                              <p className="text-sm font-mono text-[var(--text-primary)] mt-1">
                                {typeof test.result === 'object' ? test.result?.value || '—' : test.result || '—'}
                                {test.units && <span className="text-xs text-[var(--text-secondary)] ml-1">{test.units}</span>}
                              </p>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Normal Range</span>
                              <p className="text-sm text-[var(--text-primary)] mt-1">{test.normalRange || '—'}</p>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Flag</span>
                              <div className="mt-1">
                                {(() => {
                                  const fi = getResultFlag(
                                    typeof test.result === 'object' ? test.result?.value : test.result,
                                    test.normalRange
                                  );
                                  return fi.flag ? <FlagPill flag={fi.flag} /> : <span className="text-[var(--text-tertiary)]">—</span>;
                                })()}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {test.notes && (
                        <div className="px-4 py-2.5 border-t border-[var(--border-color)] bg-blue-50">
                          <p className="text-xs text-blue-800 flex items-start gap-1.5">
                            <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
                            <span><strong>Notes:</strong> {test.notes}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ResultSection>
          )}

          {/* Empty state */}
          {!pendingTests.length && !inProgressTests.length && !completedTests.length && (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-12 text-center shadow-sm">
              <div className="w-16 h-16 bg-cyan-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Microscope className="w-8 h-8 text-cyan-400" />
              </div>
              <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">No Lab Tests Yet</h3>
              <p className="text-sm text-[var(--text-secondary)] max-w-sm mx-auto mb-4">
                No laboratory tests have been requested for this visit.
              </p>
              {canAddEntries && (
                <button onClick={() => setShowLabModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 text-sm font-semibold transition-all shadow-sm shadow-cyan-500/20">
                  <Plus className="w-4 h-4" />
                  Request First Test
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* ── SINGLE RESULT ENTRY MODAL ── */}
      {resultEntryTest && !isMultiParamModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setResultEntryTest(null)} />
          <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
            <div className="relative bg-[var(--bg-card)] rounded-2xl shadow-2xl max-w-md w-full border border-[var(--border-color)] overflow-hidden">

              <div className="relative bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 px-5 py-4 text-white">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400 via-teal-400 to-transparent" />
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center flex-shrink-0">
                      <FlaskConical className="w-4.5 h-4.5 text-cyan-300" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-white truncate">Enter Result</h3>
                      <p className="text-[11px] text-slate-400 truncate">{getTestName(resultEntryTest)}</p>
                    </div>
                  </div>
                  <button onClick={() => setResultEntryTest(null)}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0 text-slate-300 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                    Result <span className="text-red-500">*</span>
                  </label>
                  <input type="text" value={result} onChange={e => setResult(e.target.value)}
                    placeholder="Enter result value" autoFocus
                    className="w-full px-3 py-2.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">Normal Range</label>
                    <input type="text" value={normalRange} onChange={e => setNormalRange(e.target.value)}
                      placeholder="e.g., 4.0–11.0"
                      className="w-full px-3 py-2.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-cyan-500 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">Units</label>
                    <input type="text" value={units} onChange={e => setUnits(e.target.value)}
                      placeholder="e.g., g/dL"
                      className="w-full px-3 py-2.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-cyan-500 transition-all" />
                  </div>
                </div>

                {/* Live flag preview */}
                {result && normalRange && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                      Auto-flag:
                    </span>
                    <FlagPill flag={getResultFlag(result, normalRange).flag} />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">Notes</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                    placeholder="Additional comments…"
                    className="w-full px-3 py-2.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-cyan-500 resize-none transition-all" />
                </div>
              </div>

              <div className="px-5 py-4 border-t border-[var(--border-color)] bg-[var(--bg-card)] flex items-center justify-between gap-3">
                <button onClick={() => setResultEntryTest(null)}
                  className="px-4 py-2 border border-[var(--border-color)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-main)] text-sm font-medium transition-all">
                  Cancel
                </button>
                <button onClick={handleSingleResultSubmit} disabled={isSubmitting || !result.trim()}
                  className="flex items-center gap-2 px-5 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold shadow-sm shadow-cyan-500/20 transition-all">
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Result
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MULTI-PARAM MODAL ── */}
      {isMultiParamModalOpen && resultEntryTest && (
        <MultiParameterResultForm
          test={resultEntryTest}
          onSave={handleSaveMultiParameterResults}
          onCancel={() => { setIsMultiParamModalOpen(false); setResultEntryTest(null); }}
          isSaving={isSubmitting}
        />
      )}

      {/* ── LAB TEST MODAL ── */}
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