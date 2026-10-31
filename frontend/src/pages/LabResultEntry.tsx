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
import { QueuedVisits, type QueuedVisit } from '../components/worklist/QueuedVisits';
import { LabTestModal } from '../components/medical-entries/modals/LabTestModal';
import { getLabWorklist } from '../api';
import { generatePDF, openPrintWindow } from '../utils/pdfGenerator';
import { getPatientName } from '../utils/patient';
import { pickVisit } from '../utils/visitSelection';
import SendDocumentModal from '../components/SendDocumentModal';
import {
  FlaskConical, Printer, RefreshCw, AlertCircle,
  Plus, Clock, CheckCircle, Activity, User, Calendar, X, Edit,
  FileText, Microscope, ArrowUp, ArrowDown,
  Save, MessageSquare, Hash, Phone, Info, TestTube,
  BedDouble, Play,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  cn,
  Field,
  humanStatus,
  INPUT,
  PageHeader,
  StatCard,
  statusTone,
  TABLE_SHELL,
  TD,
  TD_MUTED,
  TH,
  TH_ROW,
  TR,
  type BadgeTone,
} from '../components/ui';

const OUTSTANDING_LAB_STATUSES = new Set(['requested', 'in_progress']);

/** A visit is "the one to open" when it still owes this department a test. */
const hasOutstandingLabWork = (visit: any): boolean =>
  (visit?.LabTest || []).some((test: any) => OUTSTANDING_LAB_STATUSES.has(String(test?.status)));

// ── Result flag helpers ───────────────────────────────────────────────────────
type FlagInfo = { flag: string; color: string };

const NEUTRAL_FLAG = 'text-[var(--text-tertiary)]';

const getResultFlag = (value: number | string, normalRange?: string): FlagInfo => {
  if (!normalRange) return { flag: '', color: NEUTRAL_FLAG };
  const cleaned = normalRange.replace(/[–—]/g, '-');
  const rangeMatch = cleaned.match(/([<>])?\s*(\d+(?:\.\d+)?)\s*-?\s*(\d+(?:\.\d+)?)?/);
  if (!rangeMatch) return { flag: '', color: NEUTRAL_FLAG };

  const numValue = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(numValue)) return { flag: '', color: NEUTRAL_FLAG };

  const operator = rangeMatch[1];
  const low = parseFloat(rangeMatch[2]);
  const high = rangeMatch[3] ? parseFloat(rangeMatch[3]) : undefined;

  if (operator === '>') return numValue > low
    ? { flag: 'HIGH', color: 'text-[var(--icon-red-text)]' }
    : { flag: 'NL', color: 'text-[var(--icon-green-text)]' };
  if (operator === '<') return numValue < low
    ? { flag: 'LOW', color: 'text-[var(--icon-yellow-text)]' }
    : { flag: 'NL', color: 'text-[var(--icon-green-text)]' };
  if (high !== undefined) {
    if (numValue > high) return { flag: 'HIGH', color: 'text-[var(--icon-red-text)]' };
    if (numValue < low) return { flag: 'LOW', color: 'text-[var(--icon-yellow-text)]' };
    return { flag: 'NL', color: 'text-[var(--icon-green-text)]' };
  }
  return { flag: '', color: NEUTRAL_FLAG };
};

const computeParamFlag = (param: any): FlagInfo => {
  const { value, lowThreshold, highThreshold, normalRange, fieldType } = param || {};
  if (fieldType && fieldType !== 'number') return { flag: '', color: NEUTRAL_FLAG };
  if (value === '' || value === null || value === undefined) return { flag: '', color: NEUTRAL_FLAG };

  const num = typeof value === 'number' ? value : parseFloat(value);
  const hasLow = typeof lowThreshold === 'number';
  const hasHigh = typeof highThreshold === 'number';

  if (!isNaN(num) && (hasLow || hasHigh)) {
    if (hasLow && num < lowThreshold) return { flag: 'LOW', color: 'text-[var(--icon-yellow-text)]' };
    if (hasHigh && num > highThreshold) return { flag: 'HIGH', color: 'text-[var(--icon-red-text)]' };
    return { flag: 'NL', color: 'text-[var(--icon-green-text)]' };
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

// ── Status chips ─────────────────────────────────────────────────────────────
// 'stat' / 'urgent' / 'routine' and the HIGH / LOW / NL flags are vocabulary of
// this screen alone, so they keep a local tone map instead of being pushed into
// the shared Badge (rule 10 — never edit the primitive).
const PRIORITY_TONES: Record<string, BadgeTone> = {
  stat: 'red',
  urgent: 'orange',
  routine: 'blue',
};

const FLAG_TONES: Record<string, BadgeTone> = {
  HIGH: 'red',
  LOW: 'yellow',
  NL: 'green',
};

const PriorityPill: React.FC<{ priority: string }> = ({ priority }) => (
  <Badge tone={PRIORITY_TONES[priority] ?? PRIORITY_TONES.routine} dot size="sm">
    {priority?.toUpperCase() || 'ROUTINE'}
  </Badge>
);

const FlagPill: React.FC<{ flag: string }> = ({ flag }) => {
  if (!flag) return <span className="text-[var(--text-tertiary)]">—</span>;
  const Icon = flag === 'HIGH' ? ArrowUp : flag === 'LOW' ? ArrowDown : CheckCircle;
  return (
    <Badge tone={FLAG_TONES[flag] ?? 'neutral'} size="sm">
      <Icon className="w-2.5 h-2.5" />
      {flag}
    </Badge>
  );
};

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
    const cls = cn(INPUT, 'w-full');
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
        <div className={cn(TABLE_SHELL, 'shadow-2xl max-w-4xl w-full max-h-[94vh] flex flex-col')}>

          {/* Header */}
          <div className="flex-shrink-0 bg-[var(--bg-main)] border-b border-[var(--border-color)] px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]">
                  <FlaskConical className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold truncate text-[var(--text-primary)]">
                    Enter Results
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">
                    {getTestName(test)}
                  </p>
                </div>
              </div>
              <Button variant="ghost" iconOnly icon={X} onClick={onCancel} aria-label="Close" />
            </div>

            {/* Live progress strip */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2">
                <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-semibold">Parameters</p>
                <p className="text-sm font-bold text-[var(--text-primary)]">{filledCount} / {parameters.length}</p>
              </div>
              <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2">
                <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-semibold">Abnormal</p>
                <p className={cn('text-sm font-bold', abnormalCount > 0 ? 'text-[var(--icon-red-text)]' : 'text-[var(--text-primary)]')}>
                  {abnormalCount} flagged
                </p>
              </div>
              <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2">
                <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-semibold">Progress</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-[var(--bg-main)] rounded-full overflow-hidden border border-[var(--border-color)]">
                    <div
                      className={cn('h-full rounded-full transition-all', progress === 100 ? 'bg-[var(--icon-green-text)]' : 'bg-[var(--icon-cyan-text)]')}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-[var(--text-primary)]">{progress}%</span>
                </div>
              </div>
            </div>

            {abnormalCount > 0 && (
              <div className="mt-3 flex items-center gap-2 bg-[var(--icon-red-bg)] border border-[var(--border-color)] rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 text-[var(--icon-red-text)] flex-shrink-0" />
                <p className="text-xs font-semibold text-[var(--icon-red-text)]">
                  {abnormalCount} abnormal result{abnormalCount > 1 ? 's' : ''} detected — review before saving
                </p>
              </div>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: 'thin' }}>
            <div className="overflow-x-auto rounded-xl border border-[var(--border-color)]">
              <table className="w-full text-sm">
                <thead className={TH_ROW}>
                  <tr>
                    <th className={cn(TH, 'w-[32%]')}>Parameter</th>
                    <th className={TH}>Result</th>
                    <th className={TH}>Normal Range</th>
                    <th className={TH}>Units</th>
                    <th className={TH}>Flag</th>
                  </tr>
                </thead>
                <tbody>
                  {parameters.map((param, idx) => {
                    const flagInfo = computeParamFlag(param);
                    return (
                      <tr
                        key={param.fieldName || idx}
                        className={cn(TR, flagInfo.flag === 'HIGH' ? 'bg-[var(--icon-red-bg)]' :
                          flagInfo.flag === 'LOW' ? 'bg-[var(--icon-yellow-bg)]' : '')}
                      >
                        <td className={cn(TD, 'font-medium')}>
                          {param.name}
                          {param.required && <span className="text-[var(--icon-red-text)] ml-1">*</span>}
                        </td>
                        <td className={cn(TD, 'whitespace-normal')}>{renderValueInput(param, idx)}</td>
                        <td className={cn(TD, 'whitespace-normal')}>
                          <input
                            type="text"
                            value={param.normalRange || ''}
                            onChange={e => update(idx, 'normalRange', e.target.value)}
                            placeholder="e.g., 4.0–11.0"
                            className={cn(INPUT, 'w-full')}
                          />
                        </td>
                        <td className={cn(TD_MUTED, 'text-xs')}>
                          {param.unit || '—'}
                        </td>
                        <td className={TD}>
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
            <Button variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button variant="primary" icon={Save} loading={isSaving} onClick={() => onSave(parameters)}>
              {isSaving ? 'Saving…' : 'Save Results'}
            </Button>
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

  const { attendances, getAttendance, getAttendances, updateLabTestStatus } = useAttendanceStore();
  const { patients, loadPatients, fetchPatient } = usePatientStore();
  const { user } = useAuthStore();
  const { labTestTemplates, getLabTestTemplates } = useMedicalServicesStore();

  const [patient, setPatient] = useState<any>(null);
  const [attendance, setAttendance] = useState<any>(null);
  const [allAttendances, setAllAttendances] = useState<any[]>([]);
  const [labTests, setLabTests] = useState<any[]>([]);
  const [queueRows, setQueueRows] = useState<QueuedVisit[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);

  // Direct entry has no patient yet, and laboratory staff cannot search the patient
  // directory, so the screen offers the same queue the waiting list shows instead.
  const loadQueue = async () => {
    setQueueLoading(true);
    try {
      const response: any = await getLabWorklist();
      const rows: any[] = response?.data?.data || [];
      setQueueRows(rows.map((row) => ({
        attendanceId: row.attendanceId,
        patientId: row.patientId,
        name: row.patient?.name || 'Unknown patient',
        folderNumber: row.patient?.folderNumber,
        age: row.patient?.age,
        gender: row.patient?.gender,
        attendanceNumber: row.attendanceNumber,
        visitDate: row.attendanceDateTime,
        detail: [
          `${row.testCount ?? 0} test${row.testCount === 1 ? '' : 's'} to report`,
          row.inProgressCount ? `${row.inProgressCount} in progress` : null,
          row.requestedCount ? `${row.requestedCount} requested` : null,
        ].filter(Boolean).join(' · '),
        priority: row.priority,
        waitMinutes: row.waitTime,
      })));
    } catch {
      setQueueRows([]);
    } finally {
      setQueueLoading(false);
    }
  };

  const openQueuedVisit = (row: QueuedVisit) => {
    navigate(`/dashboard/laboratory/${row.patientId}`, {
      state: {
        patient: {
          id: row.patientId,
          name: row.name,
          folderNumber: row.folderNumber,
          age: row.age,
          gender: row.gender,
        },
        attendanceId: row.attendanceId,
      },
    });
  };

  // ── Load ──
  const loadData = async () => {
    try {
      setRefreshing(true);
      // A lab tech has no read access to the patient directory, and this page is
      // reached from the laboratory worklist, so the register is optional here.
      await Promise.all([loadPatients().catch(() => undefined), getLabTestTemplates(false)]);

      const statePatient = location.state?.patient;
      const patientId = statePatient?.id || id;
      const initialAttendanceId = location.state?.attendanceId;

      if (!patientId) await loadQueue();

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

        // A queued visit can be older than the patient's recent-visit window, so the
        // attendance named by the queue row is fetched on its own if the list missed it.
        let target: any = initialAttendanceId
          ? patientAttendances.find(a => a.id === initialAttendanceId)
          : undefined;
        if (!target && initialAttendanceId) {
          target = await getAttendance(initialAttendanceId).catch(() => null);
          if (target && !patientAttendances.some(a => a.id === target.id)) {
            setAllAttendances([target, ...patientAttendances]);
          }
        }
        target = target || pickVisit(patientAttendances, hasOutstandingLabWork);
        if (target) {
          setSelectedAttendanceId(target.id);
          setAttendance(target);
          setLabTests(target.LabTest || []);
          // Without directory access the only patient record available is the one
          // carried by the visit, and the screen still needs it to draw the header.
          if (!foundPatient) {
            const linked = target.Patient || target.patient || null;
            if (linked) setPatient(linked);
          }
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

  // The laboratory worklist opens this screen for one patient; arriving there
  // directly has no history to pop, so it falls back to the queue.
  const goBack = () => (location.key === 'default' ? navigate('/dashboard/laboratory') : navigate(-1));
  const patientFullName = patient ? getPatientName(patient) : '';
  const patientAge = patient ? (patient.age || calculateAge(patient.dateOfBirth)) : 0;
  const totalTests = labTests.length;

  if (isLoading) return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Laboratory Results"
        icon={Microscope}
        accent="purple"
        onBack={goBack}
      />
      <div className="bg-[var(--bg-card)] p-8 rounded-xl border border-[var(--border-color)] text-center">
        <div className="w-12 h-12 border-4 border-[var(--icon-purple-text)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <h2 className="text-lg font-bold text-[var(--text-primary)]">Loading Laboratory Data…</h2>
      </div>
    </div>
  );

  // Direct entry starts without a patient until one is picked in the selector;
  // only a patient named in the route that failed to load is an error.
  if (!patient && (id || (location.state as any)?.patient)) return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Laboratory Results"
        icon={Microscope}
        accent="purple"
        onBack={goBack}
        actions={<Button variant="primary" onClick={goBack}>Back</Button>}
      />
      <div className="bg-[var(--bg-card)] p-8 rounded-xl border border-[var(--border-color)] text-center">
        <AlertCircle className="w-12 h-12 text-[var(--icon-red-text)] mx-auto mb-3" />
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">Patient Not Found</h2>
        <p className="text-[var(--text-secondary)]">The patient you're looking for doesn't exist.</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 p-4 md:p-6">

      {/* ── HEADER ── */}
      <PageHeader
        title="Laboratory Results"
        subtitle={`${patientFullName} · ${totalTests} test${totalTests !== 1 ? 's' : ''}`}
        meta={abnormalCount > 0 ? `${abnormalCount} abnormal` : undefined}
        icon={Microscope}
        accent="purple"
        onBack={goBack}
        actions={(
          <>
            <Button
              variant="secondary"
              icon={RefreshCw}
              loading={refreshing}
              onClick={loadData}
              title="Refresh"
            >
              Refresh
            </Button>

            {completedTests.length > 0 && (
              <>
                <Button
                  variant="secondary"
                  icon={Printer}
                  loading={printingId === 'all'}
                  onClick={handlePrintAll}
                  title="Print all completed results"
                >
                  <span className="hidden sm:inline">Print All</span>
                  <span className="hidden sm:inline px-1.5 py-0.5 rounded-full bg-[var(--bg-main)] font-bold text-[10px]">
                    {completedTests.length}
                  </span>
                </Button>
                <Button
                  variant="secondary"
                  icon={MessageSquare}
                  onClick={() => { setSendResultTest(null); setShowSendResult(true); }}
                  title="Send all results"
                >
                  <span className="hidden sm:inline">Send All</span>
                </Button>
              </>
            )}

            <Button
              variant="primary"
              icon={Plus}
              disabled={!canAddEntries}
              onClick={() => setShowLabModal(true)}
            >
              <span className="hidden sm:inline">Request Test</span>
              <span className="sm:hidden">New</span>
            </Button>
          </>
        )}
      />

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
        patients={patient ? [patient, ...patients.filter(p => p.id !== patient.id)] : patients}
        attendances={allAttendances}
        selectedPatientId={selectedPatientId}
        selectedAttendanceId={selectedAttendanceId}
        onPatientSelect={async patientId => {
          setSelectedPatientId(patientId);
          setSelectedAttendanceId('');
          setAttendance(null);
          setLabTests([]);
          // Resolve the patient before the visits: the picker auto-selects an open visit as
          // soon as they arrive, and the screen renders that visit's patient details.
          let resolved: any = null;
          try { resolved = await fetchPatient(patientId); } catch { /* fall back to the visit's own patient */ }
          let visits: any[] = [];
          try {
            visits = await getAttendances({ patientId });
            setAllAttendances(visits);
            if (!resolved) {
              const linked = visits.find((a: any) => a.Patient || a.patient);
              resolved = linked?.Patient ?? linked?.patient ?? null;
            }
          } catch {
            visits = attendances.filter(a => a.patientId === patientId);
            setAllAttendances(visits);
          }
          if (resolved) setPatient(resolved);
          // Open the visit that owes the lab a result, not merely the most recent one.
          const best = pickVisit(visits, hasOutstandingLabWork);
          if (best) {
            setSelectedAttendanceId(best.id);
            setAttendance(best);
            setLabTests(best.LabTest || []);
            setResultEntryTest(null);
          }
        }}
        onAttendanceSelect={handleAttendanceChange}
        onClearSelection={handleClearSelection}
      />

      {!selectedAttendanceId && (
        <QueuedVisits
          title="Laboratory queue"
          description="Tests waiting for a result — pick a visit to start"
          icon={FlaskConical}
          accent="purple"
          rows={queueRows}
          loading={queueLoading}
          emptyMessage="No lab tests are waiting. Open the laboratory waiting list to review completed work."
          onOpen={openQueuedVisit}
          onRefresh={loadData}
          onViewAll={() => navigate('/dashboard/laboratory')}
        />
      )}

      {/* ── MAIN CONTENT ── */}
      {selectedAttendanceId && attendance && patient && (
        <>
          {/* Patient info card */}
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl border border-[var(--border-color)] bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] flex items-center justify-center">
                  <User className="w-5 h-5" />
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
                <Badge tone={statusTone(attendance.status)} dot size="sm">
                  {humanStatus(attendance.status)}
                </Badge>
              </div>
            </div>
          </Card>

          {/* Read-only warning */}
          {!canUpdateLabTest && (
            <div className="bg-[var(--icon-yellow-bg)] border border-[var(--border-color)] rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[var(--icon-yellow-text)] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-[var(--icon-yellow-text)] font-medium">Read-only view</p>
                <p className="text-xs text-[var(--icon-yellow-text)] mt-0.5">
                  This visit is <strong>{attendance.status}</strong>. Tests can be viewed but not processed.
                </p>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Pending" value={pendingTests.length} icon={Clock} accent="yellow" />
            <StatCard label="In Progress" value={inProgressTests.length} icon={Activity} accent="blue" />
            <StatCard label="Completed" value={completedTests.length} icon={CheckCircle} accent="green" />
          </div>

          {/* ── PENDING TESTS ── */}
          {pendingTests.length > 0 && (
            <Card
              title="Pending Tests"
              icon={Clock}
              accent="yellow"
              padded={false}
              actions={<Badge tone="neutral" size="sm">{pendingTests.length}</Badge>}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className={TH_ROW}>
                    <tr>
                      <th className={TH}>Test Name</th>
                      <th className={TH}>Priority</th>
                      <th className={TH}>Requested</th>
                      <th className={cn(TH, 'text-right')}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingTests.map(test => (
                      <tr key={test.id} className={TR}>
                        <td className={cn(TD, 'whitespace-normal')}>
                          <p className="font-semibold text-sm text-[var(--text-primary)]">{getTestName(test)}</p>
                          {test.LabTestTemplate?.specimenType && (
                            <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5 flex items-center gap-1">
                              <TestTube className="w-2.5 h-2.5" />
                              {test.LabTestTemplate.specimenType}
                            </p>
                          )}
                        </td>
                        <td className={TD}>
                          <PriorityPill priority={test.priority || 'routine'} />
                        </td>
                        <td className={TD_MUTED}>
                          {test.requestedAt ? new Date(test.requestedAt).toLocaleString() : '—'}
                        </td>
                        <td className={cn(TD, 'text-right')}>
                          {canUpdateLabTest && (
                            <Button
                              size="sm"
                              variant="soft"
                              accent="purple"
                              icon={Play}
                              onClick={() => handleMarkInProgress(test.id)}
                            >
                              Start
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* ── IN PROGRESS ── */}
          {inProgressTests.length > 0 && (
            <Card
              title="In Progress"
              icon={Activity}
              accent="blue"
              padded={false}
              actions={<Badge tone="neutral" size="sm">{inProgressTests.length}</Badge>}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className={TH_ROW}>
                    <tr>
                      <th className={TH}>Test Name</th>
                      <th className={TH}>Started</th>
                      <th className={cn(TH, 'text-right')}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inProgressTests.map(test => (
                      <tr key={test.id} className={TR}>
                        <td className={cn(TD, 'font-semibold whitespace-normal')}>
                          {getTestName(test)}
                        </td>
                        <td className={TD_MUTED}>
                          {test.updatedAt ? new Date(test.updatedAt).toLocaleString() : '—'}
                        </td>
                        <td className={cn(TD, 'text-right')}>
                          <Button
                            size="sm"
                            variant="soft"
                            accent="green"
                            icon={FileText}
                            onClick={() => handleOpenResultEntry(test)}
                          >
                            Enter Result
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* ── COMPLETED RESULTS ── */}
          {completedTests.length > 0 && (
            <Card
              title="Completed Results"
              icon={CheckCircle}
              accent="green"
              padded={false}
              actions={(
                <>
                  <Badge tone="neutral" size="sm">{completedTests.length}</Badge>
                  <Button
                    size="xs"
                    variant="secondary"
                    icon={Printer}
                    loading={printingId === 'all'}
                    onClick={handlePrintAll}
                    title="Print all completed results"
                  >
                    <span className="hidden sm:inline">Print All</span>
                  </Button>
                  <Button
                    size="xs"
                    variant="secondary"
                    icon={MessageSquare}
                    onClick={() => { setSendResultTest(null); setShowSendResult(true); }}
                    title="Send all results"
                  >
                    <span className="hidden sm:inline">Send All</span>
                  </Button>
                </>
              )}
            >
              <div>
                {completedTests.map(test => {
                  const hasParameters = test.result && typeof test.result === 'object' && Array.isArray(test.result.parameters);
                  const parameters = hasParameters ? test.result.parameters : [];
                  const abnormalInTest = parameters.filter((p: any) => {
                    const f = computeParamFlag(p);
                    return f.flag === 'HIGH' || f.flag === 'LOW';
                  }).length;

                  return (
                    <div key={test.id} className="border-b border-[var(--border-color)] last:border-0">
                      {/* Test header */}
                      <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)]">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-sm text-[var(--text-primary)] truncate">{getTestName(test)}</h4>
                              {abnormalInTest > 0 && (
                                <Badge tone="red" size="sm" className="flex-shrink-0">
                                  {abnormalInTest} abnormal
                                </Badge>
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
                            <Button
                              variant="ghost"
                              size="sm"
                              iconOnly
                              icon={Printer}
                              loading={printingId === test.id}
                              onClick={() => handlePrintResult(test)}
                              aria-label="Print result"
                              title="Print"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              iconOnly
                              icon={MessageSquare}
                              onClick={() => { setSendResultTest(test); setShowSendResult(true); }}
                              aria-label="Send result"
                              title="Send"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              iconOnly
                              icon={Edit}
                              onClick={() => handleOpenResultEntry(test)}
                              aria-label="Edit result"
                              title="Edit"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Parameters table */}
                      {hasParameters && parameters.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead className={TH_ROW}>
                              <tr>
                                <th className={cn(TH, 'w-[35%]')}>Parameter</th>
                                <th className={TH}>Result</th>
                                <th className={TH}>Normal Range</th>
                                <th className={TH}>Flag</th>
                              </tr>
                            </thead>
                            <tbody>
                              {parameters.map((param: any, idx: number) => {
                                const flagInfo = computeParamFlag(param);
                                return (
                                  <tr
                                    key={param.fieldName || idx}
                                    className={cn(TR, flagInfo.flag === 'HIGH' ? 'bg-[var(--icon-red-bg)]' :
                                      flagInfo.flag === 'LOW' ? 'bg-[var(--icon-yellow-bg)]' : '')}
                                  >
                                    <td className={cn(TD, 'font-medium')}>{param.name}</td>
                                    <td className={cn(TD, 'font-mono', flagInfo.color)}>
                                      {param.value || '—'}
                                      {param.unit && <span className="text-[10px] ml-1 opacity-70">{param.unit}</span>}
                                    </td>
                                    <td className={TD_MUTED}>{param.normalRange || '—'}</td>
                                    <td className={TD}>
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
                        <div className="px-4 py-2.5 border-t border-[var(--border-color)] bg-[var(--icon-blue-bg)]">
                          <p className="text-xs text-[var(--icon-blue-text)] flex items-start gap-1.5">
                            <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
                            <span><strong>Notes:</strong> {test.notes}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Empty state */}
          {!pendingTests.length && !inProgressTests.length && !completedTests.length && (
            <Card>
              <div className="py-6 text-center">
                <div className="w-16 h-16 bg-[var(--icon-purple-bg)] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Microscope className="w-8 h-8 text-[var(--icon-purple-text)]" />
                </div>
                <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">No Lab Tests Yet</h3>
                <p className="text-sm text-[var(--text-secondary)] max-w-sm mx-auto mb-4">
                  No laboratory tests have been requested for this visit.
                </p>
                {canAddEntries && (
                  <Button variant="primary" icon={Plus} onClick={() => setShowLabModal(true)}>
                    Request First Test
                  </Button>
                )}
              </div>
            </Card>
          )}
        </>
      )}

      {/* ── SINGLE RESULT ENTRY MODAL ── */}
      {resultEntryTest && !isMultiParamModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setResultEntryTest(null)} />
          <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
            <div className={cn(TABLE_SHELL, 'max-w-md w-full')}>

              <div className="bg-[var(--bg-main)] border-b border-[var(--border-color)] px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-lg border border-[var(--border-color)] bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] flex items-center justify-center flex-shrink-0">
                      <FlaskConical className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-[var(--text-primary)] truncate">Enter Result</h3>
                      <p className="text-[11px] text-[var(--text-secondary)] truncate">{getTestName(resultEntryTest)}</p>
                    </div>
                  </div>
                  <Button variant="ghost" iconOnly icon={X} onClick={() => setResultEntryTest(null)} aria-label="Close" />
                </div>
              </div>

              <div className="p-5 space-y-4">
                <Field label="Result" required>
                  <input type="text" value={result} onChange={e => setResult(e.target.value)}
                    placeholder="Enter result value" autoFocus
                    className={cn(INPUT, 'w-full')} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Normal Range">
                    <input type="text" value={normalRange} onChange={e => setNormalRange(e.target.value)}
                      placeholder="e.g., 4.0–11.0"
                      className={cn(INPUT, 'w-full')} />
                  </Field>
                  <Field label="Units">
                    <input type="text" value={units} onChange={e => setUnits(e.target.value)}
                      placeholder="e.g., g/dL"
                      className={cn(INPUT, 'w-full')} />
                  </Field>
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

                <Field label="Notes">
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                    placeholder="Additional comments…"
                    className={cn(INPUT, 'w-full resize-none')} />
                </Field>
              </div>

              <div className="px-5 py-4 border-t border-[var(--border-color)] bg-[var(--bg-card)] flex items-center justify-between gap-3">
                <Button variant="secondary" onClick={() => setResultEntryTest(null)}>
                  Cancel
                </Button>
                <Button variant="primary" icon={Save} loading={isSubmitting} disabled={!result.trim()} onClick={handleSingleResultSubmit}>
                  {isSubmitting ? 'Saving…' : 'Save Result'}
                </Button>
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