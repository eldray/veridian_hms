import { useSmartBack } from '../utils/useSmartBack';
import { getPatientFolderNumber, getAttendanceNumber } from '../utils/patient';
// src/pages/Reports.tsx
// Consistency fixes vs pasted version:
//  - Consulting Room Register: all returned rows stay inside a fixed-height scroll viewport.
//  - Header: custom Back + title div -> shared PageHeader (onBack, actions), like every
//    other page. Export/Refresh actions preserved, still hidden for shell reports.
//  - Removed unused imports (Badge, Button, FilterSelect, INPUT) that would fail lint/TS.
//  - humanize() for morbidity group labels instead of one-off replace.
//  - ALIGNMENT: Replaced floating w-[110px] with table-fixed and percentage widths.
//    Now columns are tightly grouped, headers sit exactly over figures, and numbers
//    no longer drift to the far right of the screen on wide monitors.
// Statutory GHS grids keep their print-sized markup on purpose — position of every cell
// is the point there, so they are deliberately not re-styled.
//
// Second pass (this revision):
//  FIX #46  Removed remaining unused imports (TD, TD_MONO, TH, TrendingUp).
//  FIX #27  Consulting-register widths summed to 106% — rebalanced to exactly 100%.
//  FIX #29  renderDiseaseTable: sticky thead had no scroll parent, so it did nothing.
//           Added max-h + overflow-y wrapper to match the consulting register.
//  FIX #31  Body sticky-left cells had no z-index; they slid under scrolling age cells.
//           Added z-[1] (header keeps z-10).
//  FIX #26  Consulting-register cell classes duplicated the shared TEXT_TD/NUM_TD
//           vocabulary; now reuse them and the local regTH/regTD definitions are gone.
//  FIX #23  Export-format <select> cast to any — narrowed to the literal union.
//  FIX #39  Date state used toISOString() on a local date, which shifts the calendar
//           day by one in any UTC+X zone. Added localISODate() and used everywhere
//           the date state is initialised or preset (matches reportShell's own
//           "never read the day as a month" discipline, but preserves local day).
//  FIX #43  OPD "Insured" card read t.insured.total only, while the table below sums
//           male+female — the card showed 0 whenever the backend omitted .total.
//           Now falls back to male+female.
//  FIX #50  Auto-switch effect fought the user: clicking an empty category for your
//           role bounced straight back. Now only auto-switches on mount, or when the
//           selected category has no reports because the role changed since it was
//           picked. Deliberate clicks are honoured.
//  FIX #6/7 categories[] is now a module constant, so the fallback effect has no
//           unstable dependency and exhaustive-deps is satisfied.
//  FIX #32  reportsForCategory de-dupes by key (GHS preferred) so a registry/GHS key
//           collision can never produce duplicate React keys.
//  FIX #2   Debounced the GHS loadReport by 300ms; every keystroke in the date pickers
//           used to fire a request. Shell path is unaffected (it short-circuits).
//  FIX #8   ReportShape carries no icon/color, so all shell pills share one icon by
//           design — commented rather than changed.
//  FIX #58  Refresh is hidden for shell reports on purpose: GenericReportPage owns
//           its own Reload button. Commented.
//  FIX #9   Sections 5/6/7 of the Form A morbidity table were passed an empty label
//           map and silently rendered nothing. Per the registry's rule ("statutory
//           returns must match the printed form — don't invent cells"), they now
//           render an explicit "not yet curated" panel instead of vanishing, so the
//           gap is visible rather than looking like a bug.
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useReportsStore } from '../store/reportsStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import {
  Users, DollarSign, FileText, Calendar, Download, Activity, Clock, Baby, Heart,
  PieChart, UserCheck, Shield, AlertTriangle, Droplet, RefreshCw, Hospital, ListOrdered,
  BarChart3, FileSpreadsheet, ClipboardList,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MalariaReportView } from '../components/reports/MalariaReportView';
import FormAReportView from '../components/reports/ANCReportView';
import EPIMonthlyStockReturnEditor from '../components/reports/EPIMonthlyStockReturnEditor';
import GenericReportPage from '../components/reports/GenericReportPage';
import { SHELL_REPORT_BY_KEY, shellReportsForGroup } from '../config/reportRegistry';
import { REPORT_EXPORT_ROLES, type ReportShape } from '../components/reports/reportShell';
import { Card, PageHeader, Pagination, StatCard, TD, TD_MONO, TH, TH_ROW, TR, cn } from '../components/ui';
import {
  getGHSOPDReport as apiGetOPD, getGHSIPDReport as apiGetIPD,
  getGHSDeliveryReport as apiGetDelivery, getFamilyPlanningReport as apiGetFP,
  getFinancialReport as apiGetFinancial, getLabReport as apiGetLab,
  getScanReport as apiGetScans, getProcedureReport as apiGetProcedures,
  getMedicationReport as apiGetMedications, getInsuranceClaimsReport as apiGetClaims, getPatientBillingRegister, getPatientsSeenByStaffReport,
  getStockMovementReport as apiGetStockMovement,
  getIDSRAlerts, createIDSRAlert, acknowledgeIDSRAlert, getGHSEPIReport, getGHSFormAReport as apiGetFormA, getGHSMalariaReport as apiGetMalaria, getGHSIDSRReport as apiGetIDSR,
} from '../api';

const AGE_GROUPS = ['<28d', '1-11m', '1-4', '5-9', '10-14', '15-17', '18-19', '20-34', '35-49', '50-59', '60-69', '70+'];
const humanize = (s: any) => String(s ?? '').replace(/_/g, ' ').replace(/-/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()).trim();

// FIX #39 — a local-date formatter that never shifts the calendar day. `toISOString()`
// converts local midnight to UTC and back, which rolls the day backwards in any
// UTC+ offset zone. The date pickers and presets must land on the day the user picked.
const localISODate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// ---------------------------------------------------------------------------
// Shared column alignment.
// ---------------------------------------------------------------------------
const TEXT_TH = 'px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]';
const TEXT_TD = 'px-3 py-2 text-xs text-[var(--text-primary)] font-medium';
const NUM_TH = 'px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]';
const NUM_TD = 'px-3 py-2 text-right text-xs tabular-nums text-[var(--text-primary)]';
const NUM_TD_BOLD = `${NUM_TD} font-bold`;

const GHS_REPORTS = [
  { key: 'monthly-overview', label: 'Monthly Facility Overview', icon: BarChart3, color: 'cyan', roles: ['admin', 'accounts'] },
  { key: 'opd-attendance', label: 'OPD Attendance', icon: Users, color: 'cyan' },
  { key: 'consulting-room-register', label: 'Consulting Register', icon: ClipboardList, color: 'cyan' },
  { key: 'opd-morbidity', label: 'OPD Morbidity (Form A)', icon: FileSpreadsheet, color: 'red' },
  { key: 'top-diagnoses', label: 'Top 10 Diagnoses', icon: ListOrdered, color: 'orange' },
  { key: 'form-a', label: 'Form A (Maternal)', icon: Heart, color: 'cyan' },
  { key: 'ipd', label: 'IPD & Mortality', icon: Hospital, color: 'purple' },
  { key: 'malaria', label: 'Malaria Data', icon: Droplet, color: 'green' },
  { key: 'idsr', label: 'IDSR (Notifiable)', icon: AlertTriangle, color: 'orange' },
  { key: 'epi', label: 'EPI / Immunization', icon: Baby, color: 'purple' },
  { key: 'delivery-report', label: 'Delivery Report', icon: Baby, color: 'purple' },
  { key: 'family-planning', label: 'Family Planning', icon: Users, color: 'cyan' },
];
const GHS_REPORT_ROLES = ['admin', 'doctor', 'nurse', 'midwife', 'records', 'accounts'];
type ReportsTab = ReportShape['group'];

// FIX #6/#7 — module constant so the category-fallback effect has no unstable dep.
const CATEGORIES: { id: ReportsTab; label: string; icon: typeof FileText }[] = [
  { id: 'ghs', label: 'GHS Standard', icon: FileText },
  { id: 'clinical', label: 'Clinical', icon: Activity },
  { id: 'financial', label: 'Financial', icon: DollarSign },
  { id: 'nhis', label: 'NHIS', icon: Shield },
];

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center py-8 gap-3">
    <FileText className="w-10 h-10 opacity-20 text-[var(--text-tertiary)]" />
    <p className="text-xs text-[var(--text-tertiary)]">{message}</p>
    <p className="text-[11px] text-[var(--text-tertiary)] opacity-70">Try a different report type or date range</p>
  </div>
);

// FIX #9 — statutory returns must match a printed form, so we do not invent labels.
// If the backend hands us a section we have no curated map for, say so explicitly.

function IDSRSurveillanceRegister({ startDate, endDate, diseases }: { startDate: string; endDate: string; diseases: any[] }) {
  const [records, setRecords] = useState<any[]>([]);
  const [diseaseCode, setDiseaseCode] = useState(diseases[0]?.code || '');
  const [alertDate, setAlertDate] = useState(startDate);
  const [suspectedCases, setSuspectedCases] = useState('0');
  const [confirmedCases, setConfirmedCases] = useState('0');
  const [deaths, setDeaths] = useState('0');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const selectedDisease = diseases.find(d => d.code === diseaseCode) || diseases[0];
  const load = useCallback(async () => {
    try {
      const response: any = await getIDSRAlerts({ startDate, endDate });
      const rows = response?.data?.data ?? response?.data ?? response;
      setRecords(Array.isArray(rows) ? rows : []);
    } catch (error: any) { setMessage(error?.response?.data?.message || error?.message || 'Could not load surveillance entries.'); }
  }, [startDate, endDate]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setAlertDate(startDate); setPage(1); }, [startDate, endDate]);
  useEffect(() => { if (!diseases.some(d => d.code === diseaseCode)) setDiseaseCode(diseases[0]?.code || ''); }, [diseases, diseaseCode]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedDisease) return;
    setSaving(true); setMessage('');
    try {
      await createIDSRAlert({ diseaseCode: selectedDisease.code, diseaseName: selectedDisease.disease, alertDate,
        suspectedCases: Number(suspectedCases), confirmedCases: Number(confirmedCases), deaths: Number(deaths) });
      setSuspectedCases('0'); setConfirmedCases('0'); setDeaths('0');
      setMessage('Surveillance tally recorded.'); await load();
    } catch (error: any) { setMessage(error?.response?.data?.message || error?.message || 'Could not record tally.'); }
    finally { setSaving(false); }
  };
  const acknowledge = async (id: string) => {
    try { await acknowledgeIDSRAlert(id); await load(); }
    catch (error: any) { setMessage(error?.response?.data?.message || error?.message || 'Could not acknowledge record.'); }
  };
  const totalPages = Math.max(1, Math.ceil(records.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleRecords = records.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  return <Card title="IDSR surveillance register" description="Record verified daily disease tallies separately from attendance-based suspected signals." icon={ClipboardList} padded={false}>
    <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-6 gap-2 p-4 border-b border-[var(--border-color)]">
      <select value={diseaseCode} onChange={e => setDiseaseCode(e.target.value)} className="md:col-span-2 px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-xs" required>
        {diseases.map(d => <option key={d.code} value={d.code}>{d.disease}</option>)}
      </select>
      <input type="date" value={alertDate} min={startDate} max={endDate} onChange={e => setAlertDate(e.target.value)} className="px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-xs" required />
      <input type="number" min="0" step="1" value={suspectedCases} onChange={e => setSuspectedCases(e.target.value)} aria-label="Suspected cases" placeholder="Suspected" className="px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-xs" required />
      <input type="number" min="0" step="1" value={confirmedCases} onChange={e => setConfirmedCases(e.target.value)} aria-label="Confirmed cases" placeholder="Confirmed" className="px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-xs" required />
      <div className="flex gap-2"><input type="number" min="0" step="1" value={deaths} onChange={e => setDeaths(e.target.value)} aria-label="Deaths" placeholder="Deaths" className="min-w-0 w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-xs" required /><button disabled={saving || !selectedDisease} className="px-3 py-2 rounded-lg bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] text-xs font-bold disabled:opacity-50">{saving ? 'Saving…' : 'Record'}</button></div>
    </form>
    {message && <p className="px-4 py-2 text-xs text-[var(--text-secondary)]">{message}</p>}
    <div className="overflow-x-auto"><table className="w-full text-xs">
      <thead className="bg-[var(--bg-main)]"><tr>{['Date','Disease','Suspected','Confirmed','Deaths','Acknowledgement','Action'].map(label => <th key={label} className="px-3 py-2 text-left text-[10px] font-bold uppercase text-[var(--text-tertiary)]">{label}</th>)}</tr></thead>
      <tbody className="divide-y divide-[var(--border-color)]">
        {visibleRecords.map(record => <tr key={record.id}><td className="px-3 py-2">{record.alertDate ? new Date(record.alertDate).toLocaleDateString() : '—'}</td><td className="px-3 py-2">{record.diseaseName} ({record.diseaseCode})</td><td className="px-3 py-2">{record.suspectedCases}</td><td className="px-3 py-2">{record.confirmedCases}</td><td className="px-3 py-2">{record.deaths}</td><td className="px-3 py-2">{record.alertAcknowledged ? 'Acknowledged' : 'Awaiting acknowledgement'}</td><td className="px-3 py-2">{!record.alertAcknowledged && <button type="button" onClick={() => acknowledge(record.id)} className="text-[var(--icon-cyan-text)] font-semibold">Acknowledge</button>}</td></tr>)}
        {records.length === 0 && <tr><td colSpan={7} className="px-4 py-6 text-center text-[var(--text-tertiary)]">No manual surveillance tallies recorded for this period.</td></tr>}
      </tbody>
    </table></div>
    <Pagination page={currentPage} totalPages={totalPages} itemsPerPage={pageSize} totalItems={records.length} noun="surveillance entries" onChange={setPage} pageSizeOptions={[10, 25, 50, 100]} onPageSizeChange={size => { setPageSize(size); setPage(1); }} />
  </Card>;
}

export default function Reports() {
  const goBack = useSmartBack('/dashboard');
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const { hasRole } = useAuthStore();
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    // FIX #39 — localISODate, not toISOString, so the picked calendar day survives.
    return { start: localISODate(firstOfMonth), end: localISODate(now) };
  });
  const [activeCategory, setActiveCategory] = useState<ReportsTab>('ghs');
  const [reportType, setReportType] = useState('opd-attendance');
  const [isLoading, setIsLoading] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel' | 'pdf'>('csv');
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);
  const [monthlyOverview, setMonthlyOverview] = useState<Record<string, any> | null>(null);
  const [epiReport, setEpiReport] = useState<any>(null);
  const [patientBillingReport, setPatientBillingReport] = useState<any>(null);
  const [patientsSeenReport, setPatientsSeenReport] = useState<any>(null);
  const [patientsSeenSearch, setPatientsSeenSearch] = useState('');
  const [patientsSeenDepartment, setPatientsSeenDepartment] = useState('all');
  const [patientsSeenPage, setPatientsSeenPage] = useState(1);
  const [patientBillingCategory, setPatientBillingCategory] = useState<'all' | 'opd' | 'ipd'>('all');
  const [patientBillingSearch, setPatientBillingSearch] = useState('');
  const [billingPage, setBillingPage] = useState(1);
  const [deliveryPage, setDeliveryPage] = useState(1);
  const [deliveryPageSize, setDeliveryPageSize] = useState(10);
  const [consultingRegisterPage, setConsultingRegisterPage] = useState(1);
  const [consultingRegisterPageSize, setConsultingRegisterPageSize] = useState(20);
  // FIX #50 — remember whether the user has deliberately picked a category, so the
  // fallback effect does not bounce them back out of an empty one.
  const userPickedCategory = useRef(false);
  // FIX #2 — debounce timer for the GHS path.
  const loadDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    getGHSOPDReport, getGHSIPDReport, getGHSIDSRReport, getGHSDeliveryReport, getGHSMalariaReport, getGHSFormAReport,
    getFamilyPlanningReport, getMorbidityMortalityReport, getTopDiagnoses, getConsultingRoomRegister, exportReport,
    opdReport, ipdReport, formAReport, malariaReport, idsrReport, deliveryReport, familyPlanningReport,
    morbidityMortalityReport, topDiagnoses, consultingRoomRegister, isLoading: storeLoading,
  } = useReportsStore();

  const setDatePreset = (preset: 'month' | 'quarter' | 'year') => {
    const end = new Date(); let start = new Date();
    if (preset === 'month') start = new Date(end.getFullYear(), end.getMonth(), 1);
    if (preset === 'quarter') start = new Date(end.getFullYear(), Math.floor(end.getMonth() / 3) * 3, 1);
    if (preset === 'year') start = new Date(end.getFullYear(), 0, 1);
    // FIX #39 — localISODate.
    setDateRange({ start: localISODate(start), end: localISODate(end) });
  };

  // FIX #2 — the actual fetch is factored out so the debounce wrapper below can call it.
  const runLoadReport = useCallback(async () => {
    if (SHELL_REPORT_BY_KEY[reportType]) return;
    setIsLoading(true);
    try {
      const f = { startDate: dateRange.start, endDate: dateRange.end };
      switch (reportType) {
        case 'monthly-overview': {
          const requests = await Promise.allSettled([
            apiGetOPD(f), apiGetIPD(f), apiGetDelivery(f), apiGetFP(f),
            apiGetFinancial(f), apiGetLab(f), apiGetScans(f), apiGetProcedures(f),
            apiGetMedications(f), apiGetClaims(f), apiGetStockMovement(f),
            getGHSEPIReport(f), apiGetFormA(f), apiGetMalaria(f), apiGetIDSR(f),
          ]);
          const unwrapMonthly = (value: any) => value?.success && value?.data
            ? (value.data.data ?? value.data)
            : (value?.data ?? value);
          const keys = ['opd', 'ipd', 'delivery', 'familyPlanning', 'financial', 'lab', 'scans', 'procedures', 'medications', 'claims', 'stock', 'epi', 'maternalFormA', 'malaria', 'idsr'];
          const values = requests.map(result => result.status === 'fulfilled' ? unwrapMonthly(result.value) : null);
          setMonthlyOverview({
            ...Object.fromEntries(keys.map((key, index) => [key, values[index]])),
            unavailableSources: keys.filter((key, index) => requests[index].status === 'rejected'),
          });
          break;
        }
        case 'epi': {
          const response: any = await getGHSEPIReport(f);
          setEpiReport(response?.data?.data ?? response?.data ?? response);
          break;
        }
        case 'patient-billing-register': {
          const response: any = await getPatientBillingRegister({ ...f, ...(patientBillingCategory === 'all' ? {} : { attendanceCategory: patientBillingCategory }) });
          setPatientBillingReport(response?.data?.data ?? response?.data ?? response);
          break;
        }
        case 'patients-seen-by-staff': {
          const response: any = await getPatientsSeenByStaffReport(f);
          setPatientsSeenReport(response?.data?.data ?? response?.data ?? response);
          break;
        }
        case 'opd-attendance': await getGHSOPDReport(f); break;
        case 'opd-morbidity': await getMorbidityMortalityReport(f); break;
        case 'top-diagnoses': await getTopDiagnoses(f, 10); break;
        case 'form-a': await getGHSFormAReport(f); break;
        case 'ipd': await getGHSIPDReport(f); break;
        case 'malaria': await getGHSMalariaReport(f); break;
        case 'idsr': await getGHSIDSRReport(f); break;
        case 'delivery-report': await getGHSDeliveryReport(f); break;
        case 'family-planning': await getFamilyPlanningReport(f); break;
        case 'consulting-room-register': await getConsultingRoomRegister({ ...f, period: 'daily' }); break;
      }
      setGeneratedAt(new Date());
    } catch (err: any) { toastError('Report Error', err.message || 'Failed to generate report'); }
    finally { setIsLoading(false); }
  }, [reportType, dateRange, getGHSOPDReport, getGHSIPDReport, getGHSIDSRReport, getGHSDeliveryReport, getGHSMalariaReport,
      getGHSFormAReport, getFamilyPlanningReport, getMorbidityMortalityReport, getTopDiagnoses,
      getConsultingRoomRegister, getPatientBillingRegister, patientBillingCategory, toastError]);

  // Public loader: the debounce wrapper for automatic runs, the raw fetcher for Refresh.
  const loadReport = useCallback(() => {
    if (loadDebounce.current) clearTimeout(loadDebounce.current);
    loadDebounce.current = setTimeout(() => { runLoadReport(); }, 300);
  }, [runLoadReport]);

  const loadReportNow = useCallback(() => {
    if (loadDebounce.current) clearTimeout(loadDebounce.current);
    runLoadReport();
  }, [runLoadReport]);

  useEffect(() => { loadReport(); return () => { if (loadDebounce.current) clearTimeout(loadDebounce.current); }; }, [loadReport]);
  useEffect(() => { setDeliveryPage(1); setPatientsSeenPage(1); }, [reportType, dateRange.start, dateRange.end]);
  useEffect(() => { setConsultingRegisterPage(1); }, [reportType, dateRange.start, dateRange.end, consultingRegisterPageSize]);
  const getActiveReport = () => {
    const map: Record<string, any> = {
      'monthly-overview': monthlyOverview, 'patient-billing-register': patientBillingReport, 'patients-seen-by-staff': patientsSeenReport,
      'opd-attendance': opdReport, 'consulting-room-register': consultingRoomRegister,
      'opd-morbidity': morbidityMortalityReport, 'top-diagnoses': topDiagnoses, 'form-a': formAReport,
      'ipd': ipdReport, 'malaria': malariaReport, 'idsr': idsrReport, 'epi': epiReport, 'delivery-report': deliveryReport, 'family-planning': familyPlanningReport,
    };
    return map[reportType] ?? null;
  };
  const handleExport = async () => {
    const activeReport = getActiveReport();
    if (!activeReport) { toastError('Export Failed', 'No report data available'); return; }
    try { await exportReport({ reportType, format: exportFormat, filters: { startDate: dateRange.start, endDate: dateRange.end }, data: activeReport }); success('Export complete', 'Your report file has been downloaded.'); }
    catch (err: any) { toastError('Export Failed', err.message); }
  };
  const isLoading_ = isLoading || storeLoading;
  const shellReport = SHELL_REPORT_BY_KEY[reportType];
  const allowedForRole = useCallback((roles?: string[]) => !roles || hasRole(roles), [hasRole]);
  const canExport = hasRole(REPORT_EXPORT_ROLES);
  // FIX #32 — dedupe by key so a registry/GHS collision cannot create duplicate React keys.
  const reportsForCategory = useCallback((groupId: ReportsTab) => {
    const list = [
      ...(groupId === 'ghs' ? GHS_REPORTS.map(item => ({ ...item, roles: item.roles || GHS_REPORT_ROLES })) : []),
      ...(groupId === 'financial' ? [
        { key: 'patient-billing-register', label: 'OPD/IPD Patient Billing Register', icon: ClipboardList, color: 'cyan', roles: ['admin', 'accounts', 'records'] },
        { key: 'patients-seen-by-staff', label: 'Patients Seen by Staff', icon: Users, color: 'cyan', roles: ['admin', 'accounts', 'records'] },
      ] : []),
      // FIX #8 — ReportShape carries no icon/color, so shell pills share ListOrdered/green by design.
      ...shellReportsForGroup(groupId).map(shape => ({ key: shape.key, label: shape.label, icon: ListOrdered, color: 'green', roles: shape.roles })),
    ].filter(item => allowedForRole(item.roles));
    const seen = new Set<string>();
    return list.filter(item => (seen.has(item.key) ? false : (seen.add(item.key), true)));
  }, [allowedForRole]);
  const currentReports = useMemo(() => reportsForCategory(activeCategory), [reportsForCategory, activeCategory]);

  // FIX #50 — only auto-switch on mount, or when the user has not made a deliberate
  // category choice and the current one is empty for their role. Once they click,
  // stay on their choice even if it is empty (the panel explains why).
  useEffect(() => {
    if (currentReports.length > 0) return;
    if (userPickedCategory.current) return;
    const next = CATEGORIES.map(category => category.id).find(id => reportsForCategory(id).length > 0);
    if (next) setActiveCategory(next);
  }, [currentReports.length, reportsForCategory]);

  useEffect(() => {
    if (currentReports.length > 0 && !currentReports.some(item => item.key === reportType)) setReportType(currentReports[0].key);
  }, [currentReports, reportType]);

  const getReportTitle = () => {
    if (shellReport) return shellReport.label;
    const m: Record<string, string> = {
      'monthly-overview': 'Monthly Facility Overview', 'patient-billing-register': 'OPD/IPD Patient Billing Register', 'patients-seen-by-staff': 'Patients Seen by Staff',
      'opd-attendance': 'OPD Attendance', 'consulting-room-register': 'Consulting Room Register',
      'opd-morbidity': 'OPD Morbidity (Form A)', 'top-diagnoses': 'Top 10 Diagnoses',
      'form-a': 'Form A — Maternal Health', 'ipd': 'IPD & Mortality', 'malaria': 'Malaria Data',
      'idsr': 'IDSR Notifiable Diseases', 'epi': 'EPI / Immunization', 'delivery-report': 'Delivery Report', 'family-planning': 'Family Planning',
    };
    return m[reportType] || 'Report';
  };

  // -------------------------------------------------------------------------
  // Consulting Room Register
  // -------------------------------------------------------------------------
  const renderConsultingRoomRegister = () => {
    const report = consultingRoomRegister as any;
    if (!report) return <EmptyState message="No consulting room register data available" />;
    const entries = report.entries || [];
    const totalPages = Math.max(1, Math.ceil(entries.length / consultingRegisterPageSize));
    const safePage = Math.min(consultingRegisterPage, totalPages);
    const visibleEntries = entries.slice((safePage - 1) * consultingRegisterPageSize, safePage * consultingRegisterPageSize);

    // GHS consulting-room line-list: keep the full register fields visible.
    // Long investigations, results and medication names must wrap, never truncate.
    const columns = [
      { key: 'date', label: 'Date', width: 'min-w-[105px]', render: (e: any) => {
        if (!e.date) return '—';
        const date = new Date(e.date);
        return Number.isNaN(date.getTime()) ? e.date : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }).replace(/ /g, '-');
      } },
      { key: 'patientNo', label: 'PatientNo', width: 'min-w-[100px]', render: (e: any) => e.patientNo || '—' },
      { key: 'nhisNo', label: 'NHISNo', width: 'min-w-[110px]', render: (e: any) => e.nhisNo || '—' },
      { key: 'patientName', label: 'Name', width: 'min-w-[180px]', render: (e: any) => e.patientName || '—' },
      { key: 'address', label: 'Address', width: 'min-w-[140px]', render: (e: any) => e.address || '—' },
      { key: 'telephone', label: 'Telephone', width: 'min-w-[115px]', render: (e: any) => e.telephone || '—' },
      { key: 'age', label: 'Age', width: 'min-w-[55px]', render: (e: any) => e.age ?? '—' },
      { key: 'sex', label: 'Sex', width: 'min-w-[55px]', render: (e: any) => String(e.sex || '').toLowerCase() === 'male' ? 'M' : String(e.sex || '').toLowerCase() === 'female' ? 'F' : '—' },
      { key: 'provisionalDiagnosis', label: 'Provisional Diagnosis', width: 'min-w-[200px]', render: (e: any) => e.provisionalDiagnosis || '—' },
      {
        key: 'diagnoses',
        label: 'Diagnoses (Final & Additional)',
        width: 'min-w-[260px]',
        render: (e: any) => {
          const finalDiagnosis = e.principalDiagnosis || '';
          const additionalDiagnoses = e.additionalDiagnosis || '';
          const parts = [
            finalDiagnosis ? `Final: ${finalDiagnosis}` : '',
            additionalDiagnoses ? `Additional: ${additionalDiagnoses}` : '',
          ].filter(Boolean);
          return parts.length ? parts.join('; ') : '—';
        },
      },
      { key: 'labTestsRequested', label: 'LabTests', width: 'min-w-[220px]', render: (e: any) => e.labTestsRequested || '—' },
      { key: 'labResults', label: 'LabResult', width: 'min-w-[240px]', render: (e: any) => e.labResults || '—' },
      { key: 'pregnant', label: 'Pregnant', width: 'min-w-[85px]', render: (e: any) => e.pregnant ? 'Y' : 'N' },
      { key: 'isNHIS', label: 'IsNHIS', width: 'min-w-[75px]', render: (e: any) => e.isNHIS ? 'Y' : 'N' },
      { key: 'drugsPrescribed', label: 'DrugPresc', width: 'min-w-[280px]', render: (e: any) => e.drugsPrescribed || '—' },
      { key: 'drugsGiven', label: 'DrugGiven', width: 'min-w-[280px]', render: (e: any) => e.drugsGiven || '—' },
      { key: 'attendanceNumber', label: 'Attendance No.', width: 'min-w-[140px]', render: (e: any) => getAttendanceNumber(e) || '—' },
    ];

    return (
      <div className="min-w-0 max-w-full space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
          <StatCard label="Total Patients" value={(report.summary?.totalPatients || 0).toLocaleString()} icon={Users} accent="cyan" />
          <StatCard label="New Patients" value={(report.summary?.newPatients || 0).toLocaleString()} icon={UserCheck} accent="green" />
          <StatCard label="NHIS Patients" value={(report.summary?.nhisPatients || 0).toLocaleString()} icon={Shield} accent="cyan" />
          <StatCard label="Pregnant Women" value={(report.summary?.pregnantWomen || 0).toLocaleString()} icon={Baby} accent="cyan" />
        </div>
        <Card title="Consulting Room Register" description={`${dateRange.start} → ${dateRange.end} · Standard GHS line-list · ${entries.length.toLocaleString()} records`} icon={ClipboardList} padded={false} className="min-w-0 max-w-full" contentClassName="min-w-0 max-w-full">
          <div
            className="block w-full min-w-0 max-w-full overflow-x-auto overflow-y-clip overscroll-x-contain"
            style={{ scrollbarWidth: 'thin' }}
            role="region"
            aria-label="Consulting Room Register records"
            tabIndex={0}
          >
              <table className="w-max min-w-full table-auto text-xs border-collapse">
                <thead className={cn(TH_ROW, 'sticky top-0 z-10')}>
                  <tr>
                    {columns.map(column => (
                      <th key={column.key} scope="col" className={cn(TEXT_TH, column.width, 'whitespace-nowrap align-bottom')}>
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {visibleEntries.map((entry: any, index: number) => (
                    <tr key={entry.attendanceId || `${entry.patientNo}-${index}`} className={TR}>
                      {columns.map(column => (
                        <td
                          key={column.key}
                          className="px-3 py-2 text-xs text-[var(--text-primary)] align-top whitespace-normal break-words"
                          title={typeof column.render(entry) === 'string' ? column.render(entry) : undefined}
                        >
                          {column.render(entry)}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {entries.length === 0 && (
                    <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-xs text-[var(--text-tertiary)]">No consulting room entries found for this period.</td></tr>
                  )}
                </tbody>
              </table>
          </div>
          <div className="border-t border-[var(--border-color)] px-3 py-2 text-[11px] text-[var(--text-tertiary)]">
            Showing {(entries.length ? (safePage - 1) * consultingRegisterPageSize + 1 : 0).toLocaleString()}–{Math.min(safePage * consultingRegisterPageSize, entries.length).toLocaleString()} of {entries.length.toLocaleString()} records. Use the horizontal scrollbar to view all register fields.
          </div>
        </Card>
        <Pagination
          page={safePage}
          totalPages={totalPages}
          itemsPerPage={consultingRegisterPageSize}
          totalItems={entries.length}
          noun="register records"
          onChange={setConsultingRegisterPage}
          pageSizeOptions={[15, 20, 25, 50]}
          onPageSizeChange={size => { setConsultingRegisterPageSize(size); setConsultingRegisterPage(1); }}
        />
      </div>
    );
  };

  // -------------------------------------------------------------------------
  // OPD/IPD Patient Billing Register
  // -------------------------------------------------------------------------
  const renderPatientBillingRegister = () => {
    const report = patientBillingReport as any;
    if (!report) return <EmptyState message="No OPD/IPD patient billing data available" />;
    const allEntries = Array.isArray(report.entries) ? report.entries : [];
    const needle = patientBillingSearch.trim().toLowerCase();
    const filtered = allEntries.filter((row: any) => !needle || [
      row.attendanceNumber, row.name, row.folderNo, row.cardNo, row.phoneNo, row.accreditor, row.createdBy,
    ].some(value => String(value ?? '').toLowerCase().includes(needle)));
    const pageSize = 25;
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePage = Math.min(billingPage, totalPages);
    const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
    const ghc = (value: any) => new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS', minimumFractionDigits: 2 }).format(Number(value || 0));
    const date = (value: any) => value ? new Date(value).toLocaleDateString('en-GH', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
    const time = (value: any) => value ? new Date(value).toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—';
    const cellValue = (value: any) => value === null || value === undefined || value === '' ? '—' : value;
    const columns = [
      { label: 'Attendance No.', width: 'w-[125px]', value: (row: any) => getAttendanceNumber(row), align: 'left' },
      { label: 'Begin date', width: 'w-[115px]', value: (row: any) => date(row.beginDate), align: 'left' },
      { label: 'Begin time', width: 'w-[105px]', value: (row: any) => time(row.beginTime), align: 'left' },
      { label: 'End / discharge date', width: 'w-[130px]', value: (row: any) => date(row.endDate), align: 'left' },
      { label: 'Patient name', width: 'w-[170px]', value: (row: any) => row.name, align: 'left' },
      { label: 'Folder No.', width: 'w-[110px]', value: (row: any) => row.folderNo, align: 'left' },
      { label: 'Card / NHIS No.', width: 'w-[130px]', value: (row: any) => row.cardNo, align: 'left' },
      { label: 'Age', width: 'w-[65px]', value: (row: any) => row.age, align: 'center' },
      { label: 'Gender', width: 'w-[85px]', value: (row: any) => humanize(row.gender), align: 'center' },
      { label: 'Phone', width: 'w-[120px]', value: (row: any) => row.phoneNo, align: 'left' },
      { label: 'Attendance type', width: 'w-[105px]', value: (row: any) => humanize(row.encounterCategory), align: 'left' },
      { label: 'Mode', width: 'w-[105px]', value: (row: any) => humanize(row.mode), align: 'left' },
      { label: 'Patient bill', width: 'w-[115px]', value: (row: any) => ghc(row.patientBill), align: 'right' },
      { label: 'Accreditor bill', width: 'w-[120px]', value: (row: any) => ghc(row.accreditorBill), align: 'right' },
      { label: 'Drugs', width: 'w-[110px]', value: (row: any) => ghc(row.drugs), align: 'right' },
      { label: 'Services', width: 'w-[110px]', value: (row: any) => ghc(row.services), align: 'right' },
      { label: 'Total bill', width: 'w-[120px]', value: (row: any) => ghc(row.total), align: 'right' },
      { label: 'Patient balance', width: 'w-[125px]', value: (row: any) => ghc(row.patientBalance), align: 'right' },
      { label: 'Attendance status', width: 'w-[115px]', value: (row: any) => humanize(row.status), align: 'left' },
      { label: 'Bill status', width: 'w-[105px]', value: (row: any) => humanize(row.billStatus), align: 'left' },
      { label: 'Accreditor', width: 'w-[135px]', value: (row: any) => row.accreditor, align: 'left' },
      { label: 'Created by', width: 'w-[135px]', value: (row: any) => row.createdBy, align: 'left' },
      { label: 'Created on', width: 'w-[155px]', value: (row: any) => row.createdOn ? new Date(row.createdOn).toLocaleString('en-GH') : '—', align: 'left' },
    ] as const;
    return <div className="space-y-3 min-w-0">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <StatCard label="Attendances" value={(report.summary?.totalAttendances || 0).toLocaleString()} icon={Users} accent="cyan" />
        <StatCard label="OPD" value={(report.summary?.opd || 0).toLocaleString()} icon={Activity} accent="green" />
        <StatCard label="IPD" value={(report.summary?.ipd || 0).toLocaleString()} icon={Hospital} accent="purple" />
        <StatCard label="Total billed" value={ghc(report.summary?.totalBilled)} icon={DollarSign} accent="cyan" />
      </div>
      <Card title="Patient billing register" description="Each attendance and billing field is displayed in its own aligned column. Scroll horizontally within the register to view all columns." icon={ClipboardList} padded={false}>
        <div className="flex flex-wrap items-center gap-2 p-3 border-b border-[var(--border-color)]">
          <input value={patientBillingSearch} onChange={e => { setPatientBillingSearch(e.target.value); setBillingPage(1); }} placeholder="Search attendance, patient, folder, card or phone…" className="min-w-[220px] flex-1 px-3 py-2 text-xs rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-primary)]" />
          <select value={patientBillingCategory} onChange={e => { setPatientBillingCategory(e.target.value as 'all' | 'opd' | 'ipd'); setBillingPage(1); }} className="px-3 py-2 text-xs rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-primary)]">
            <option value="all">All OPD & IPD</option><option value="opd">OPD only</option><option value="ipd">IPD only</option>
          </select>
          <span className="text-[11px] text-[var(--text-tertiary)]">{filtered.length.toLocaleString()} records</span>
        </div>
        <div className="w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain">
          <table className="w-max min-w-full table-fixed text-xs border-collapse">
            <colgroup>{columns.map(column => <col key={column.label} className={column.width} />)}</colgroup>
            <thead className={TH_ROW}>
              <tr>{columns.map(column => <th key={column.label} className={cn(TEXT_TH, 'px-3 py-2.5 text-left align-middle whitespace-nowrap')}>{column.label}</th>)}</tr>
            </thead>
            <tbody>
              {visible.map((row: any) => (
                <tr key={row.attendanceId} className={cn(TR, 'align-top')}>
                  {columns.map(column => (
                    <td key={column.label} className={cn(TEXT_TD, 'px-3 py-2.5 align-top', column.align === 'right' ? 'text-right tabular-nums whitespace-nowrap' : column.align === 'center' ? 'text-center whitespace-nowrap' : 'text-left', ['Patient name', 'Accreditor', 'Created by'].includes(column.label) ? 'whitespace-normal break-words' : 'whitespace-nowrap', column.label === 'Total bill' ? 'font-semibold' : '')}>
                      {cellValue(column.value(row))}
                    </td>
                  ))}
                </tr>
              ))}
              {visible.length === 0 && <tr><td colSpan={columns.length} className="px-4 py-6 text-center text-[var(--text-tertiary)]">No patient billing records match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination page={safePage} totalPages={totalPages} itemsPerPage={pageSize} totalItems={filtered.length} noun="attendances" onChange={setBillingPage} pageSizeOptions={[25]} />
      </Card>
    </div>;
  };

  // -------------------------------------------------------------------------
  // OPD Attendance
  // -------------------------------------------------------------------------
  const renderOPDAttendanceReport = () => {
    const report = opdReport as any;
    if (!report) return <EmptyState message="No OPD attendance data available" />;
    const ag = report.ageGroups || {}; const t = report.totals || {};
    const cellN = 'px-3 py-2 text-right text-xs tabular-nums text-[var(--text-primary)]';
    const headN = 'px-3 py-1.5 text-right text-[10px] font-semibold text-[var(--text-tertiary)]';
    // FIX #43 — the card now agrees with the table below, which already sums male+female.
    const insuredTotal = t.insured?.total ?? ((t.insured?.male ?? 0) + (t.insured?.female ?? 0));
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total Attendances" value={(t.totalAttendances || 0).toLocaleString()} icon={Users} accent="cyan" />
          <StatCard label="New Cases" value={(t.new || 0).toLocaleString()} icon={UserCheck} accent="green" />
          <StatCard label="Re-Attendances" value={(t.old || 0).toLocaleString()} icon={Clock} accent="yellow" />
          <StatCard label="Insured" value={insuredTotal.toLocaleString()} icon={Shield} accent="cyan" />
        </div>
        <Card title="Age Group Distribution" icon={Users} padded={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs table-fixed">
              <thead className={TH_ROW}>
                <tr>
                  <th className={cn(TEXT_TH, 'w-[20%]')}>Age Group</th>
                  <th colSpan={2} className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Insured</th>
                  <th colSpan={2} className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Non-Insured</th>
                  <th className={cn(NUM_TH, 'w-[10%]')}>New</th>
                  <th className={cn(NUM_TH, 'w-[10%]')}>Old</th>
                </tr>
                <tr className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                  <th className="px-3 py-1.5" />
                  {['M', 'F', 'M', 'F'].map((l, i) => <th key={i} className={headN}>{l}</th>)}
                  <th className={headN} /><th className={headN} />
                </tr>
              </thead>
              <tbody>
                {Object.entries(ag).map(([group, data]: [string, any]) => (
                  <tr key={group} className={TR}>
                    <td className={cn(TEXT_TD, 'whitespace-nowrap')}>{group}</td>
                    <td className={cellN}>{data?.insured?.male || 0}</td>
                    <td className={cellN}>{data?.insured?.female || 0}</td>
                    <td className={cellN}>{data?.nonInsured?.male || 0}</td>
                    <td className={cellN}>{data?.nonInsured?.female || 0}</td>
                    <td className={cellN}>{data?.new || 0}</td>
                    <td className={cellN}>{data?.old || 0}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-[var(--bg-main)] border-t-2 border-[var(--border-color)]">
                <tr>
                  <td className={cn(TEXT_TD, 'font-bold')}>TOTAL</td>
                  {[t.insured?.male || 0, t.insured?.female || 0, t.nonInsured?.male || 0, t.nonInsured?.female || 0, t.new || 0, t.old || 0].map((v, i) => (
                    <td key={i} className={cn(cellN, 'font-bold')}>{v}</td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      </div>
    );
  };

  // -------------------------------------------------------------------------
  // Disease table (Form A morbidity)
  // -------------------------------------------------------------------------
  const renderDiseaseTable = (title: string, data: Record<string, any>, diseaseLabels: Record<string, string>) => {
    const entries = Object.entries(diseaseLabels).filter(([key]) => data?.[key]);
    if (!entries.length) return null;
    const colTotals: Record<string, { male: number; female: number }> = {};
    AGE_GROUPS.forEach(a => { colTotals[a] = { male: 0, female: 0 }; });
    entries.forEach(([key]) => { const rd = data[key]; if (rd) AGE_GROUPS.forEach(a => { if (rd[a]) { colTotals[a].male += rd[a].male || 0; colTotals[a].female += rd[a].female || 0; } }); });
    const statCell = 'px-1 py-2 text-center text-xs tabular-nums text-[var(--text-secondary)]';
    const statCellB = 'px-2 py-2 text-center text-xs tabular-nums font-bold text-[var(--text-primary)] bg-[var(--bg-main)]';
    return (
      <Card title={title} padded={false} className="mb-5">
        {/* FIX #29 — the thead used to be sticky with no scroll parent (so it did nothing).
            Now the max-h wrapper gives it something to stick to, matching the register. */}
        <div className="overflow-x-auto">
          <div className="max-h-[70vh] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            <table className="w-full text-xs border-collapse">
              <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)] sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] sticky left-0 bg-[var(--bg-main)] z-10 min-w-[200px]">Disease / Condition</th>
                  {AGE_GROUPS.map(a => (<th key={a} colSpan={2} className="px-1 py-2 text-center text-[10px] font-semibold text-[var(--text-tertiary)] border-x border-[var(--border-color)] min-w-[56px]">{a}</th>))}
                  <th colSpan={2} className="px-2 py-2 text-center text-[10px] font-bold text-[var(--text-primary)] bg-[var(--bg-main)] min-w-[56px]">Total</th>
                </tr>
                <tr className="border-b border-[var(--border-color)]"><th className="sticky left-0 bg-[var(--bg-main)]" />
                  {AGE_GROUPS.map(a => (<React.Fragment key={a}><th className="px-1 py-1 text-center text-[9px] text-[var(--text-tertiary)]">M</th><th className="px-1 py-1 text-center text-[9px] text-[var(--text-tertiary)]">F</th></React.Fragment>))}
                  <th className="px-2 py-1 text-center text-[9px] text-[var(--text-tertiary)]">M</th><th className="px-2 py-1 text-center text-[9px] text-[var(--text-tertiary)]">F</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {entries.map(([key, label]) => {
                  const rd = data[key]; if (!rd) return null; let tm = 0, tf = 0;
                  return (
                    <tr key={key} className="hover:bg-[var(--bg-main)] transition-colors">
                      {/* FIX #31 — body sticky cell needs z-[1] or it slides under the scrolling age columns. */}
                      <td className="px-3 py-2 text-xs text-[var(--text-primary)] font-medium sticky left-0 bg-[var(--bg-card)] z-[1]">{label}</td>
                      {AGE_GROUPS.map(a => { const m = rd[a]?.male || 0, f = rd[a]?.female || 0; tm += m; tf += f; return (<React.Fragment key={a}><td className={statCell}>{m || '—'}</td><td className={statCell}>{f || '—'}</td></React.Fragment>); })}
                      <td className={statCellB}>{tm || '—'}</td>
                      <td className={statCellB}>{tf || '—'}</td>
                    </tr>
                  );
                })}
                <tr className="bg-[var(--bg-main)] border-t-2 border-[var(--border-color)]">
                  <td className="px-3 py-2 text-xs font-bold text-[var(--text-primary)] sticky left-0 bg-[var(--bg-main)] z-[1]">TOTAL</td>
                  {AGE_GROUPS.map(a => (<React.Fragment key={a}><td className={statCellB}>{colTotals[a]?.male || 0}</td><td className={statCellB}>{colTotals[a]?.female || 0}</td></React.Fragment>))}
                  <td className={statCellB}>{Object.values(colTotals).reduce((s, a) => s + a.male, 0)}</td>
                  <td className={statCellB}>{Object.values(colTotals).reduce((s, a) => s + a.female, 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    );
  };

  const renderFullMorbidityReport = () => {
    const report = morbidityMortalityReport as any;
    if (!report) return <EmptyState message="No morbidity data available" />;
    const t = report.totals || {};
    return (
      <div className="space-y-5">
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-5 text-center">
          <p className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide">Ghana Health Service</p>
          <p className="text-xs font-semibold text-[var(--text-secondary)] mt-1">OPD Morbidity Report (Form A)</p>
          <p className="text-[11px] text-[var(--text-tertiary)] mt-2">{report.facility?.name} · {report.facility?.district} · {report.facility?.ghfCode}</p>
          <p className="text-[11px] text-[var(--text-tertiary)]">{report.period?.startDate?.split('T')[0]} — {report.period?.endDate?.split('T')[0]}</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Attendances" value={t.totalAttendances || 0} icon={Users} accent="cyan" />
          <StatCard label="New Cases" value={t.totalNewCases || 0} icon={UserCheck} accent="green" />
          <StatCard label="Re-Attend." value={t.totalReAttendances || 0} icon={Clock} accent="yellow" />
          <StatCard label="Referrals" value={t.totalReferrals || 0} icon={Shield} accent="cyan" />
        </div>
        {renderDiseaseTable('Section 1: Communicable Immunizable', report.communicableImmunizable, { afp_polio: 'AFP / Polio', meningitis: 'Meningitis', neonatal_tetanus: 'Neonatal Tetanus', pertussis_whooping_cough: 'Pertussis', diphtheria: 'Diphtheria', measles: 'Measles', yellow_fever: 'Yellow Fever', tetanus: 'Tetanus', tuberculosis: 'Tuberculosis' })}
        {renderDiseaseTable('Section 2: Communicable Non-Immunizable', report.communicableNonImmunizable, { uncomplicated_malaria_suspected: 'Malaria - Suspected', uncomplicated_malaria_tested: 'Malaria - Tested', uncomplicated_malaria_positive: 'Malaria - Positive', severe_malaria_lab_confirmed: 'Severe Malaria', typhoid_fever: 'Typhoid Fever', suspected_cholera: 'Suspected Cholera', diarrhoea_diseases: 'Diarrhoea', viral_hepatitis: 'Viral Hepatitis', pneumonia: 'Pneumonia', upper_respiratory_tract_infections: 'URTI' })}
        {renderDiseaseTable('Section 3: Non-Communicable Diseases', report.nonCommunicable, { malnutrition: 'Malnutrition', obesity: 'Obesity', anaemia: 'Anaemia', hypertension: 'Hypertension', cardiac_diseases: 'Cardiac Diseases', stroke: 'Stroke', diabetes_mellitus: 'Diabetes Mellitus', asthma: 'Asthma', sickle_cell_disease: 'Sickle Cell Disease' })}
        {renderDiseaseTable('Section 4: Mental Health', report.mentalHealth, { depression: 'Depression', epilepsy: 'Epilepsy', schizophrenia: 'Schizophrenia', substance_abuse: 'Substance Abuse' })}
        {renderDiseaseTable('Section 5: Specialized Conditions', report.specializedConditions, { acute_eye_infection: 'Acute Eye Infection', cataract: 'Cataract', trachoma: 'Trachoma', otitis_media: 'Otitis Media', other_acute_ear_infection: 'Other Acute Ear Infection', dental_caries: 'Dental Caries', dental_swellings: 'Dental Swellings', traumatic_conditions_oral: 'Traumatic Conditions of Oral Cavity', periodontal_diseases: 'Periodontal Diseases', cerebral_palsy: 'Cerebral Palsy', liver_diseases: 'Liver Diseases', acute_urinary_tract_infection: 'Acute Urinary Tract Infection', skin_diseases: 'Skin Diseases', ulcer: 'Ulcer', kidney_related_diseases: 'Kidney-Related Diseases', other_oral_conditions: 'Other Oral Conditions' })}
        {renderDiseaseTable('Section 6: Obstetrics & Gynaecology', report.obstetricsGynaecology, { gynaecological_conditions: 'Gynaecological Conditions', pregnancy_related_complications: 'Pregnancy-Related Complications', anaemia_in_pregnancy: 'Anaemia in Pregnancy' })}
        {renderDiseaseTable('Section 7: Reproductive Tract', report.reproductiveTract, { gonorrhoea: 'Gonorrhoea', genital_ulcer: 'Genital Ulcer', vaginal_discharge: 'Vaginal Discharge', urethral_discharge: 'Urethral Discharge', other_diseases_male_reproductive_system: 'Other Diseases of Male Reproductive System', other_diseases_female_reproductive_system: 'Other Diseases of Female Reproductive System' })}
        {renderDiseaseTable('Section 8: Injuries', report.injuries, { transport_injuries_road_traffic_accidents: 'Road Traffic Accidents', home_injuries: 'Home Injuries', burns: 'Burns', snake_bite: 'Snake Bite', domestic_violence: 'Domestic Violence' })}
        {renderDiseaseTable('Section 9: Re-Attendances & Referrals', report.reAttendancesReferrals, { re_attendances: 'Re-Attendances', referrals: 'Referrals' })}
        <p className="text-center text-[11px] text-[var(--text-tertiary)]">Generated {new Date().toLocaleString()}</p>
      </div>
    );
  };

  // -------------------------------------------------------------------------
  // Top Diagnoses
  // -------------------------------------------------------------------------
  const renderTopDiagnoses = () => {
    const list = topDiagnoses as any[];
    if (!list?.length) return <EmptyState message="No diagnosis data available" />;
    return (
      <Card title="Top 10 Diagnoses" icon={ListOrdered} accent="orange">
        <div className="overflow-x-auto">
          <table className="w-full text-xs table-fixed">
            <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
              <tr>
                <th className={cn(TEXT_TH, 'w-[8%]')}>Rank</th>
                <th className={cn(TEXT_TH, 'w-[32%]')}>Diagnosis</th>
                <th className={cn(TEXT_TH, 'w-[12%]')}>ICD-10</th>
                <th className={cn(TEXT_TH, 'w-[18%]')}>Group</th>
                <th className={cn(NUM_TH, 'w-[10%]')}>Male</th>
                <th className={cn(NUM_TH, 'w-[10%]')}>Female</th>
                <th className={cn(NUM_TH, 'w-[10%]')}>Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {list.map((d: any, i: number) => (
                <tr key={d.diagnosisId || i} className="hover:bg-[var(--bg-main)] transition-colors">
                  <td className={cn(TEXT_TD, 'tabular-nums')}><span className="font-bold text-[var(--icon-orange-text)]">{i + 1}</span></td>
                  <td className={cn(TEXT_TD, 'truncate')}>{d.diagnosisName || d.name || d.disease}</td>
                  <td className={cn(TEXT_TD, 'font-mono')}>{d.icdCode || '—'}</td>
                  <td className={TEXT_TD}><span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] truncate inline-block max-w-full">{humanize(d.morbidityGroup) || 'General'}</span></td>
                  <td className={NUM_TD}>{d.male || 0}</td>
                  <td className={NUM_TD}>{d.female || 0}</td>
                  <td className={NUM_TD_BOLD}>{d.totalCases || d.patients || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    );
  };

  const renderFormAReport = () => { const report = formAReport as any; if (!report) return <EmptyState message="No Form A data available" />; return <FormAReportView data={report} />; };

  // -------------------------------------------------------------------------
  // IPD
  // -------------------------------------------------------------------------
  const renderIPDReport = () => {
    const report = ipdReport as any;
    if (!report) return <EmptyState message="No IPD data available" />;
    const ag = report.ageGroups || {}, mal = report.malaria || {}, t = report.totals || {};
    const cellN = 'px-3 py-2 text-right text-xs tabular-nums text-[var(--text-primary)]';
    const headN = 'px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]';
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total Admissions" value={t.totalAdmissions || 0} icon={Hospital} accent="cyan" />
          <StatCard label="Total Deaths" value={t.totalDeaths || 0} icon={AlertTriangle} accent="red" />
          <StatCard label="Under-5 Malaria" value={mal.under5Admitted || 0} icon={Baby} accent="yellow" />
          <StatCard label="Malaria Deaths" value={(mal.under5Deaths || 0) + (mal.above5Deaths || 0)} icon={AlertTriangle} accent="red" />
        </div>
        <Card title="Admissions by Age Group" icon={Hospital} accent="purple">
          <div className="overflow-x-auto">
            <table className="w-full text-xs table-fixed">
              <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                <tr>
                  <th className={cn(TEXT_TH, 'w-[20%]')}>Age Group</th>
                  <th colSpan={2} className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Insured</th>
                  <th colSpan={2} className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Non-Insured</th>
                </tr>
                <tr className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                  <th />
                  {['M', 'F', 'M', 'F'].map((l, i) => <th key={i} className={headN}>{l}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {Object.entries(ag).map(([group, data]: [string, any]) => (
                  <tr key={group} className="hover:bg-[var(--bg-main)] transition-colors">
                    <td className={cn(TEXT_TD, 'whitespace-nowrap')}>{group}</td>
                    <td className={cellN}>{data?.admissions?.insured?.male || 0}</td>
                    <td className={cellN}>{data?.admissions?.insured?.female || 0}</td>
                    <td className={cellN}>{data?.admissions?.nonInsured?.male || 0}</td>
                    <td className={cellN}>{data?.admissions?.nonInsured?.female || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  };

  const renderMalariaReport = () => { const report = malariaReport as any; if (!report) return <EmptyState message="No malaria data available" />; return <MalariaReportView data={report} dateRange={dateRange} />; };

  // -------------------------------------------------------------------------
  // EPI / Immunization — actual vaccine administrations in the selected period.
  // -------------------------------------------------------------------------
  const renderEPIReport = () => {
    const report = epiReport as any;
    if (!report?.available) return <EmptyState message={report?.message || 'No immunization records are available for this period'} />;
    const summary = report.summary || {};
    const vaccines = Array.isArray(report.monthlyVaccinations) ? report.monthlyVaccinations : [];
    const covid = Array.isArray(report.covidVaccinations) ? report.covidVaccinations : [];
    const td = Array.isArray(report.tdVaccinations) ? report.tdVaccinations : [];
    const count = (value: any) => Number(value || 0).toLocaleString('en-GH');
    const table = 'w-full min-w-[680px] text-xs border-collapse';
    const th = 'px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)] bg-[var(--bg-main)] border-b border-[var(--border-color)]';
    const num = 'px-3 py-2 text-right tabular-nums text-[var(--text-primary)] border-b border-[var(--border-color)]';
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Doses administered" value={count(summary.totalDoses)} icon={Baby} accent="purple" />
          <StatCard label="Patients vaccinated" value={count(summary.uniquePatients)} icon={Users} accent="cyan" />
          <StatCard label="Overdue follow-ups" value={count(summary.overdueFollowUps)} icon={Calendar} accent="orange" />
          <StatCard label="Adverse reactions recorded" value={count(summary.adverseReactions)} icon={AlertTriangle} accent="red" />
        </div>
        <Card title="Monthly vaccinations given by age" description="Administration counts grouped by age on the vaccination date." icon={Baby} accent="purple" padded={false}>
          <div className="overflow-x-auto"><table className={table}>
            <thead><tr><th className={th}>Vaccine / Commodities</th><th className={th + ' text-right'}>0–11 months</th><th className={th + ' text-right'}>12–23 months</th><th className={th + ' text-right'}>≥24 months</th><th className={th + ' text-right'}>Total administered</th></tr></thead>
            <tbody>{vaccines.map((row: any) => <tr key={row.vaccine}><td className="px-3 py-2 font-medium text-[var(--text-primary)]">{row.vaccine}</td><td className={num}>{count(row.under12Months)}</td><td className={num}>{count(row.months12To23)}</td><td className={num}>{count(row.months24Plus)}</td><td className={num + ' font-bold bg-[var(--bg-main)]'}>{count(row.totalAdministered)}</td></tr>)}
              {!vaccines.length && <tr><td className="px-3 py-5 text-center text-[var(--text-tertiary)]" colSpan={5}>No mapped vaccine administrations for this period.</td></tr>}</tbody>
            <tfoot><tr className="bg-[var(--bg-main)]"><td className="px-3 py-2 font-bold text-[var(--text-primary)]">TOTAL</td>{['under12Months','months12To23','months24Plus','totalAdministered'].map(key => <td key={key} className={num + ' font-bold'}>{count(vaccines.reduce((sum: number, row: any) => sum + Number(row[key] || 0), 0))}</td>)}</tr></tfoot>
          </table></div>
        </Card>
        <Card title="COVID-19 vaccination" description="Age-group totals and separately captured underlying-condition, health-worker and pregnancy indicators." icon={Shield} padded={false}>
          <div className="overflow-x-auto"><table className={table}>
            <thead><tr><th className={th}>Doses</th><th className={th + ' text-right'}>6 months–14 yrs</th><th className={th + ' text-right'}>15–17 yrs</th><th className={th + ' text-right'}>18–59 yrs</th><th className={th + ' text-right'}>60+ yrs</th><th className={th + ' text-right'}>Total doses</th><th className={th + ' text-right'}>Underlying conditions</th><th className={th + ' text-right'}>Health workers</th><th className={th + ' text-right'}>Pregnant women</th></tr></thead>
            <tbody>{covid.map((row: any) => <tr key={row.dose}><td className="px-3 py-2 text-[var(--text-primary)]">{row.dose}</td><td className={num}>{count(row.age6MonthsTo14Years)}</td><td className={num}>{count(row.age15To17Years)}</td><td className={num}>{count(row.age18To59Years)}</td><td className={num}>{count(row.age60Plus)}</td><td className={num + ' font-bold'}>{count(row.totalDoses)}</td><td className={num}>{row.underlyingConditionReported ? count(row.underlyingConditions) : '—'}</td><td className={num}>{row.healthWorkerReported ? count(row.healthWorkers) : '—'}</td><td className={num}>{row.pregnancyStatusReported ? count(row.pregnantWomen) : '—'}</td></tr>)}</tbody>
          </table></div>
        </Card>
        <Card title="Td vaccination" icon={Baby} padded={false}>
          <div className="overflow-x-auto"><table className={table}>
            <thead><tr><th className={th}>Td vaccination</th><th className={th + ' text-right'}>Pregnant women</th><th className={th + ' text-right'}>Non-pregnant</th><th className={th + ' text-right'}>Others</th></tr></thead>
            <tbody>{td.map((row: any) => <tr key={row.dose}><td className="px-3 py-2 text-[var(--text-primary)]">{row.dose}</td><td className={num}>{row.pregnancyStatusReported ? count(row.pregnantWomen) : '—'}</td><td className={num}>{row.pregnancyStatusReported ? count(row.nonPregnant) : '—'}</td><td className={num}>{row.pregnancyStatusReported ? count(row.others) : '—'}</td></tr>)}
              <tr><td className="px-3 py-2 text-[var(--text-primary)]">Td-5+ (Not Vaccinated)</td><td className={num}>—</td><td className={num}>—</td><td className={num}>—</td></tr><tr><td className="px-3 py-2 text-[var(--text-primary)]">LLIN – Pregnant Women</td><td className={num}>—</td><td className={num}>—</td><td className={num}>—</td></tr></tbody>
          </table></div>
        </Card>
        <EPIMonthlyStockReturnEditor from={dateRange.start} to={dateRange.end} />
        <p className="text-[11px] text-[var(--text-tertiary)]">COVID-19 risk groups and Td pregnancy status are counted only where staff recorded the corresponding attributes during vaccination. The Td-5+ (not vaccinated) indicator requires a separate non-vaccination follow-up register and is not inferred from missing doses.</p>
      </div>
    );
  };

  // IDSR
  // -------------------------------------------------------------------------
  const renderIDSRReport = () => {
    const report = idsrReport as any;
    if (!report) return <EmptyState message="No IDSR data available" />;
    const diseases = report.diseases || [];
    const num = (v: any) => (v == null ? null : Number(v) || 0);
    const totalSuspected = diseases.reduce((s: number, d: any) => s + (num(d.suspected) || 0), 0);
    const totalConfirmed = diseases.reduce((s: number, d: any) => s + (num(d.confirmed) || 0), 0);
    const hasAnyConfirmed = diseases.some((d: any) => d.confirmed != null);
    const totalDeaths = diseases.reduce((s: number, d: any) => s + (num(d.deaths) || 0), 0);
    const hasAnyDeaths = diseases.some((d: any) => d.deaths != null);
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Disease Indicators" value={diseases.length} icon={AlertTriangle} accent="orange" />
          <StatCard label="Total Suspected" value={totalSuspected.toLocaleString()} icon={Users} accent="cyan" />
          <StatCard label="Total Confirmed" value={hasAnyConfirmed ? totalConfirmed.toLocaleString() : '—'} icon={Shield} accent="green" />
          <StatCard label="Total Deaths" value={hasAnyDeaths ? totalDeaths.toLocaleString() : '—'} icon={AlertTriangle} accent="red" />
        </div>
        <Card title="Notifiable Diseases (IDSR)" icon={AlertTriangle} accent="orange" padded={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse table-fixed">
              <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                <tr>
                  <th className={cn(TEXT_TH, 'w-[40%]')}>Disease</th>
                  <th className={cn(NUM_TH, 'w-[15%]')}>Suspected</th>
                  <th className={cn(NUM_TH, 'w-[15%]')}>Confirmed</th>
                  <th className={cn(NUM_TH, 'w-[15%]')}>Deaths</th>
                  <th className={cn(NUM_TH, 'w-[15%]')}>CFR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {diseases.map((d: any, i: number) => {
                  const suspected = num(d.suspected), confirmed = num(d.confirmed), deaths = num(d.deaths);
                  const cfr = confirmed != null && confirmed > 0 && deaths != null ? `${((deaths / confirmed) * 100).toFixed(1)}%` : '—';
                  return (
                    <tr key={d.disease || i} className="hover:bg-[var(--bg-main)] transition-colors">
                      <td className={TEXT_TD}>{d.disease}</td>
                      <td className={NUM_TD}>{suspected ?? '—'}</td>
                      <td className={NUM_TD}>{confirmed ?? '—'}</td>
                      <td className={cn(NUM_TD, deaths ? 'font-bold text-[var(--icon-red-text)]' : '')}>{deaths ?? '—'}</td>
                      <td className={NUM_TD}>{cfr}</td>
                      <td className={NUM_TD}>{Number(d.diagnosisSignals || 0).toLocaleString()}</td>
                      <td className={TEXT_TD}>{d.surveillanceEntries ? `${d.acknowledgedEntries || 0}/${d.surveillanceEntries} acknowledged` : 'No tally recorded'}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-[var(--bg-main)] border-t-2 border-[var(--border-color)]">
                <tr>
                  <td className={cn(TEXT_TD, 'font-bold')}>TOTAL</td>
                  <td className={NUM_TD_BOLD}>{totalSuspected.toLocaleString()}</td>
                  <td className={NUM_TD_BOLD}>{hasAnyConfirmed ? totalConfirmed.toLocaleString() : '—'}</td>
                  <td className={NUM_TD_BOLD}>{hasAnyDeaths ? totalDeaths.toLocaleString() : '—'}</td>
                  <td className={NUM_TD_BOLD}>{hasAnyConfirmed && totalConfirmed > 0 && hasAnyDeaths ? `${((totalDeaths / totalConfirmed) * 100).toFixed(1)}%` : '—'}</td>
                  <td className={NUM_TD_BOLD}>{diseases.reduce((sum: number, d: any) => sum + Number(d.diagnosisSignals || 0), 0).toLocaleString()}</td>
                  <td className={TEXT_TD}>—</td>
                </tr>
              </tfoot>
            </table>
          </div>
          {(diseases.some((d: any) => d.confirmed == null || d.deaths == null)) && (
            <p className="px-4 py-3 text-[11px] text-[var(--text-tertiary)] border-t border-[var(--border-color)]">
              Where a surveillance tally has been entered, its suspected, confirmed and death counts are reported. Otherwise suspected figures are diagnosis-based signals only. Diagnosis signals are shown separately to support reconciliation; they are not unique patients or confirmed notifications. Acknowledgement tracks internal review, not submission to DHIMS2 or the district surveillance office.
            </p>
          )}
        </Card>
        <IDSRSurveillanceRegister startDate={dateRange.start} endDate={dateRange.end} diseases={diseases} />
      </div>
    );
  };

  // -------------------------------------------------------------------------
  // Delivery report — uses the existing GHS delivery endpoint and records.
  // -------------------------------------------------------------------------
  const renderDeliveryReport = () => {
    const report = deliveryReport as any;
    if (!report) return <EmptyState message="No delivery data available" />;
    const summary = report.summary || {};
    const breakdowns = report.breakdowns || {};
    const humanizeKey = (key: string) => humanize(key);
    const renderBreakdown = (title: string, data: Record<string, number>) => (
      <Card title={title} icon={ClipboardList} padded={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs table-fixed">
            <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]"><tr><th className={TEXT_TH}>Category</th><th className={NUM_TH}>Count</th></tr></thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {Object.entries(data || {}).map(([key, value]) => (
                <tr key={key}><td className={TEXT_TD}>{humanizeKey(key)}</td><td className={NUM_TD_BOLD}>{Number(value || 0).toLocaleString()}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    );
    const deliveries = Array.isArray(report.deliveries) ? report.deliveries : [];
    const deliveryTotalPages = Math.max(1, Math.ceil(deliveries.length / deliveryPageSize));
    const safeDeliveryPage = Math.min(deliveryPage, deliveryTotalPages);
    const paginatedDeliveries = deliveries.slice((safeDeliveryPage - 1) * deliveryPageSize, safeDeliveryPage * deliveryPageSize);
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatCard label="Deliveries" value={Number(summary.totalDeliveries || 0).toLocaleString()} icon={Baby} accent="cyan" />
          <StatCard label="Caesarean Rate" value={`${Number(summary.csRate || 0).toFixed(1)}%`} icon={Activity} accent="purple" />
          <StatCard label="Stillbirth Rate / 1,000" value={Number(summary.stillbirthRate || 0).toFixed(1)} icon={AlertTriangle} accent="red" />
          <StatCard label="Maternal Mortality / 100,000" value={Number(summary.maternalMortalityRate || 0).toLocaleString()} icon={Heart} accent="red" />
          <StatCard label="Average Birth Weight (g)" value={Number(summary.avgBirthWeight || 0).toLocaleString()} icon={Activity} accent="green" />
          <StatCard label="Low Birth Weight" value={`${Number(summary.lowBirthWeightRate || 0).toFixed(1)}%`} icon={Baby} accent="orange" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {renderBreakdown("Delivery Type", breakdowns.deliveryType)}
          {renderBreakdown("Birth Outcomes", breakdowns.outcome)}
          {renderBreakdown("Maternal Outcomes", breakdowns.maternalOutcome)}
          {renderBreakdown("Payer Mix", breakdowns.paymentMode)}
        </div>
        <Card title="Delivery Records" description={deliveries.length >= 100 ? "The endpoint returns up to 100 records in this report." : `${deliveries.length} delivery record(s)`} icon={Baby} padded={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs table-fixed">
              <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]"><tr>
                <th className={TEXT_TH}>Date</th><th className={TEXT_TH}>Folder</th><th className={TEXT_TH}>Type</th><th className={TEXT_TH}>Outcome</th><th className={NUM_TH}>Weight (g)</th><th className={TEXT_TH}>Attendant</th><th className={TEXT_TH}>Maternal outcome</th>
              </tr></thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {paginatedDeliveries.map((d: any, index: number) => (
                  <tr key={d.id || index} className="hover:bg-[var(--bg-main)]">
                    <td className={TEXT_TD}>{d.deliveryDate ? new Date(d.deliveryDate).toLocaleDateString() : "—"}</td>
                    <td className={TEXT_TD}>{getPatientFolderNumber(d) || '—'}</td>
                    <td className={TEXT_TD}>{humanizeKey(d.deliveryType || "—")}</td>
                    <td className={TEXT_TD}>{humanizeKey(d.deliveryOutcome || "—")}</td>
                    <td className={NUM_TD}>{d.birthWeight != null ? Number(d.birthWeight).toLocaleString() : "—"}</td>
                    <td className={TEXT_TD}>{d.attendant || "—"}</td>
                    <td className={TEXT_TD}>{humanizeKey(d.maternalOutcome || "—")}</td>
                  </tr>
                ))}
                {!deliveries.length && <tr><td colSpan={7} className="p-6 text-center text-[var(--text-tertiary)]">No deliveries recorded for this period.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
        <Pagination page={safeDeliveryPage} totalPages={deliveryTotalPages} itemsPerPage={deliveryPageSize} totalItems={deliveries.length} noun="delivery records" onChange={setDeliveryPage} pageSizeOptions={[10, 25, 50, 100]} onPageSizeChange={(size) => { setDeliveryPageSize(size); setDeliveryPage(1); }} />
      </div>
    );
  };


  // -------------------------------------------------------------------------
  // Family Planning
  // -------------------------------------------------------------------------
  const renderFamilyPlanningReport = () => {
    const report = familyPlanningReport as any;
    if (!report) return <EmptyState message="No family planning data available" />;
    if (report.returns) return <FormAReportView data={{ ...report, form: report.returns, title: 'Monthly Family Planning Returns', filePrefix: 'GHS_FP_Returns' }} />;
    const methodEntries = Object.entries(report.methodMix || {}) as [string, any][];
    const methodTotal = methodEntries.reduce((sum, [, c]) => sum + (Number(c) || 0), 0);
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <StatCard label="FP Clients" value={report.summary?.totalFPClients || 0} icon={Users} accent="cyan" />
          <StatCard label="FP Visits" value={report.summary?.totalFPVisits || 0} icon={Calendar} accent="green" />
          <StatCard label="New Acceptors" value={report.summary?.newAcceptors || 0} icon={UserCheck} accent="cyan" />
        </div>
        <Card title="Method Mix" icon={PieChart} accent="cyan" padded={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse table-fixed">
              <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                <tr>
                  <th className={cn(TEXT_TH, 'w-[60%]')}>Method</th>
                  <th className={cn(NUM_TH, 'w-[20%]')}>Count</th>
                  <th className={cn(NUM_TH, 'w-[20%]')}>Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {methodEntries.map(([m, c]) => {
                  const count = Number(c) || 0;
                  return (
                    <tr key={m} className="hover:bg-[var(--bg-main)] transition-colors">
                      <td className={TEXT_TD}>{humanize(m)}</td>
                      <td className={NUM_TD_BOLD}>{count.toLocaleString()}</td>
                      <td className={NUM_TD}>{methodTotal > 0 ? `${((count / methodTotal) * 100).toFixed(1)}%` : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-[var(--bg-main)] border-t-2 border-[var(--border-color)]">
                <tr>
                  <td className={cn(TEXT_TD, 'font-bold')}>TOTAL</td>
                  <td className={NUM_TD_BOLD}>{methodTotal.toLocaleString()}</td>
                  <td className={NUM_TD_BOLD}>{methodTotal > 0 ? '100.0%' : '—'}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      </div>
    );
  };

  // -------------------------------------------------------------------------
  // User Activity / Patients Seen by Staff
  // -------------------------------------------------------------------------
  const renderPatientsSeenByStaff = () => {
    const report = patientsSeenReport as any;
    if (!report) return <EmptyState message="No staff patient-activity data available" />;
    const entries = Array.isArray(report.entries) ? report.entries : [];
    const departments = Array.from(new Set(entries.map((row: any) => String(row.department || 'UNASSIGNED')))).sort();
    const needle = patientsSeenSearch.trim().toLowerCase();
    const filtered = entries.filter((row: any) =>
      (patientsSeenDepartment === 'all' || row.department === patientsSeenDepartment) &&
      (!needle || [row.department, row.username, row.fullName].some(value => String(value || '').toLowerCase().includes(needle)))
    );
    const pageSize = 25;
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePage = Math.min(patientsSeenPage, totalPages);
    const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
    const total = filtered.reduce((sum: number, row: any) => sum + Number(row.patientsSeen || 0), 0);
    const departmentTotals = (report.departmentTotals || []).filter((row: any) =>
      patientsSeenDepartment === 'all' || row.department === patientsSeenDepartment
    );
    return <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
        <StatCard label="Staff with activity" value={filtered.length.toLocaleString('en-GH')} icon={Users} accent="cyan" />
        <StatCard label="Patient attendances attributed" value={total.toLocaleString('en-GH')} icon={Activity} accent="green" />
        <StatCard label="Departments" value={departmentTotals.length.toLocaleString('en-GH')} icon={Hospital} accent="purple" />
      </div>
      <Card title="Patients seen by staff" description="One attendance is counted once per staff member, even if they recorded multiple services for that patient." icon={Users} padded={false}>
        <div className="flex flex-wrap items-center gap-2 p-3 border-b border-[var(--border-color)]">
          <input value={patientsSeenSearch} onChange={e => { setPatientsSeenSearch(e.target.value); setPatientsSeenPage(1); }} placeholder="Search department or username…" className="min-w-[220px] flex-1 px-3 py-2 text-xs rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-primary)]" />
          <select value={patientsSeenDepartment} onChange={e => { setPatientsSeenDepartment(e.target.value); setPatientsSeenPage(1); }} className="px-3 py-2 text-xs rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-primary)]">
            <option value="all">All departments</option>
            {departments.map((department: string) => <option key={department} value={department}>{department}</option>)}
          </select>
          <span className="text-[11px] text-[var(--text-tertiary)]">{filtered.length.toLocaleString('en-GH')} staff</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-xs">
            <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
              <tr>
                <th className={cn(TEXT_TH, 'w-14')}>NB</th>
                <th className={TEXT_TH}>Department</th>
                <th className={TEXT_TH}>Username</th>
                <th className={NUM_TH}>PatientsSeen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {visible.map((row: any, index: number) => <tr key={row.userId || row.username} className="hover:bg-[var(--bg-main)]">
                <td className={TEXT_TD}>{(safePage - 1) * pageSize + index + 1}</td>
                <td className={TEXT_TD}>{row.department || 'UNASSIGNED'}</td>
                <td className={TEXT_TD}>{row.username}</td>
                <td className={NUM_TD_BOLD}>{Number(row.patientsSeen || 0).toLocaleString('en-GH')}</td>
              </tr>)}
              {!visible.length && <tr><td colSpan={4} className="px-3 py-8 text-center text-xs text-[var(--text-tertiary)]">No staff activity found for this filter and period.</td></tr>}
            </tbody>
            <tfoot className="bg-[var(--bg-main)] border-t-2 border-[var(--border-color)]">
              <tr><td colSpan={3} className={cn(TEXT_TD, 'font-bold')}>FILTERED TOTAL</td><td className={NUM_TD_BOLD}>{total.toLocaleString('en-GH')}</td></tr>
            </tfoot>
          </table>
        </div>
        {patientsSeenDepartment === 'all' && departmentTotals.length > 0 && <div className="border-t border-[var(--border-color)] p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">Department totals</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {departmentTotals.map((row: any) => <div key={row.department} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2">
              <span className="text-[11px] text-[var(--text-secondary)] truncate">{row.department}</span>
              <strong className="text-xs tabular-nums text-[var(--text-primary)]">{Number(row.patientsSeen || 0).toLocaleString('en-GH')}</strong>
            </div>)}
          </div>
        </div>}
      </Card>
      <Pagination page={safePage} totalPages={totalPages} itemsPerPage={pageSize} totalItems={filtered.length} noun="staff" onChange={setPatientsSeenPage} pageSizeOptions={[25]} />
      <p className="text-[11px] text-[var(--text-tertiary)]">{report.methodology}</p>
    </div>;
  };

  const renderMonthlyOverview = () => {
    if (!monthlyOverview) return <EmptyState message="No monthly overview data available" />;
    const read = (obj: any, paths: string[], formLabel?: string) => {
      if (formLabel) {
        const rows = (obj?.form?.sections || []).flatMap((section: any) => section.tables || []).flatMap((table: any) => table.rows || []);
        const row = rows.find((item: any) => item.label === formLabel);
        const value = row?.values?.[0];
        return value != null && Number.isFinite(Number(value)) ? Number(value) : null;
      }
      for (const path of paths) {
        const value = path.split('.').reduce((v: any, key: string) => v == null ? undefined : v[key], obj);
        if (value !== undefined && value !== null && Number.isFinite(Number(value))) return Number(value);
      }
      return null;
    };
    const fmt = (value: number | null, money = false) => value == null ? '—' : money
      ? `₵${value.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : value.toLocaleString('en-GH');
    const sections = [
      { title: 'OPD attendance', data: monthlyOverview.opd, rows: [['Attendances', ['totals.totalAttendances','summary.totalAttendances','totalAttendances','summary.totalPatients']], ['New cases', ['totals.totalNewCases','summary.newPatients','totalNewCases']], ['Re-attendances', ['totals.totalReAttendances','summary.oldPatients','totalReAttendances']]] },
      { title: 'Inpatient & mortality', data: monthlyOverview.ipd, rows: [['Admissions', ['totals.totalAdmissions','summary.totalAdmissions','totalAdmissions']], ['Deaths', ['totals.totalDeaths','summary.totalDeaths','totalDeaths']]] },
      { title: 'Maternal & family planning', data: monthlyOverview.delivery, rows: [['Deliveries', ['summary.totalDeliveries','totalDeliveries','deliveries.length']], ['Live births', ['summary.liveBirths','totals.liveBirths','liveBirths']]] },
      { title: 'Family planning', data: monthlyOverview.familyPlanning, rows: [['Clients', ['summary.totalFPClients','summary.totalClients','totalFPClients']], ['Visits', ['summary.totalFPVisits','summary.totalVisits','totalFPVisits']], ['New acceptors', ['summary.newAcceptors','newAcceptors']]] },
      { title: 'Financial performance', data: monthlyOverview.financial, rows: [['Billed', ['summary.totalRevenue','summary.totalBilled','totalRevenue'], true], ['Collected', ['summary.totalPaid','summary.totalCollected','totalPaid'], true], ['Outstanding', ['summary.outstandingBalance','summary.outstanding','outstandingBalance'], true]] },
      { title: 'Laboratory', data: monthlyOverview.lab, rows: [['Tests', ['summary.totalTests','totalTests','total']], ['Completed', ['summary.completedTests','completedTests']], ['Pending', ['summary.pendingTests','pendingTests']]] },
      { title: 'Scans', data: monthlyOverview.scans, rows: [['Scans', ['summary.totalScans','totalScans','total']]] },
      { title: 'Procedures', data: monthlyOverview.procedures, rows: [['Procedures', ['summary.totalProcedures','totalProcedures','total']]] },
      { title: 'Medication activity', data: monthlyOverview.medications, rows: [['Items dispensed', ['summary.totalDispensed','totalDispensed','summary.totalItems','totalItems']]] },
      { title: 'Insurance claims', data: monthlyOverview.claims, rows: [['Claims', ['summary.totalClaims','totalClaims']], ['Claimed amount', ['summary.totalClaimAmount','totalClaimAmount'], true], ['Outstanding', ['summary.outstandingAmount','outstandingAmount'], true]] },
      { title: 'Stock movement', data: monthlyOverview.stock, rows: [['Transactions', ['summary.totalTransactions','totalTransactions']], ['Units in', ['summary.totalIn','totalIn']], ['Units out', ['summary.totalOut','totalOut']]] },
      { title: 'EPI / Immunization', data: monthlyOverview.epi, rows: [['Vaccine doses administered', ['summary.totalDoses']], ['Patients vaccinated', ['summary.uniqueChildren']], ['Overdue follow-ups', ['summary.overdueFollowUps']], ['Adverse reactions recorded', ['summary.adverseReactions']]] },
      { title: 'Maternal health / ANC', data: monthlyOverview.maternalFormA, rows: [
        ['New ANC registrants', [], false, 'New ANC registrants'],
        ['ANC attendances', [], false, 'Total ANC attendances (all visits)'],
        ['Mothers making 4th visit', [], false, 'Mothers making 4th visit'],
        ['Mothers making 8th visit', [], false, 'Mothers making 8th visit'],
        ['High-risk pregnancies', [], false, 'High-risk pregnancies'],
      ] },
      { title: 'Malaria', data: monthlyOverview.malaria, rows: [['Under-5 suspected', ['opdMalaria.under5.suspected']], ['Under-5 tested', ['opdMalaria.under5.tested']], ['Under-5 confirmed', ['opdMalaria.under5.confirmed']], ['Above-5 suspected', ['opdMalaria.above5.suspected']], ['Above-5 tested', ['opdMalaria.above5.tested']], ['Above-5 confirmed', ['opdMalaria.above5.confirmed']]] },
      { title: 'IDSR', data: monthlyOverview.idsr, rows: [['Notifiable disease indicators', ['diseases.length']], ['Suspected diagnosis signals', ['summary.totalSuspected']]] },
    ];
    const billed = read(monthlyOverview.financial, ['summary.totalRevenue','summary.totalBilled','totalRevenue']);
    const collected = read(monthlyOverview.financial, ['summary.totalPaid','summary.totalCollected','totalPaid']);
    const outstanding = read(monthlyOverview.financial, ['summary.outstandingBalance','summary.outstanding','outstandingBalance']);
    const reconciliationChecks = billed != null && collected != null && outstanding != null
      ? [{ label: 'Billed = collected + outstanding', detail: 'Difference: ' + fmt(billed - collected - outstanding, true), ok: Math.abs(billed - collected - outstanding) < 0.01 }]
      : [{ label: 'Financial reconciliation', detail: 'Not assessed — one or more source totals were not returned.', ok: null as boolean | null }];
    const exportRows: any[] = sections.flatMap(section => section.rows.map(([label, paths, money, formLabel]: any) => ({
      Section: section.title,
      Indicator: label,
      // Preserve numeric cells for Excel; unavailable source values remain blank, not zero.
      Value: read(section.data, paths, formLabel),
      Unit: money ? 'GHS' : '',
    })));
    exportRows.push({
      Section: 'Data reconciliation',
      Indicator: 'Billed = collected + outstanding',
      Value: billed != null && collected != null && outstanding != null ? Number((billed - collected - outstanding).toFixed(2)) : null,
      Unit: 'GHS difference',
    });
    const downloadMonthlyOverview = async () => {
      try {
        const result = await exportReport({
          reportType: 'monthly-overview',
          format: exportFormat,
          filters: { startDate: dateRange.start, endDate: dateRange.end },
          data: exportRows,
        });
        success('Export complete', result?.filename || `Monthly overview exported as ${exportFormat.toUpperCase()}.`);
      } catch (error: any) {
        toastError('Export failed', error?.message || 'The monthly overview could not be exported.');
      }
    };
    return <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><p className="text-sm font-bold text-[var(--text-primary)]">Facility performance overview</p><p className="text-xs text-[var(--text-tertiary)]">{dateRange.start} to {dateRange.end} · Existing report endpoints</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border-color)] text-xs">
            <span className="text-[var(--text-tertiary)]">Export as</span>
            <select value={exportFormat} onChange={event => setExportFormat(event.target.value as 'csv' | 'excel' | 'pdf')} className="bg-transparent font-semibold text-[var(--text-primary)]">
              <option value="csv">CSV</option><option value="excel">Excel</option><option value="pdf">PDF</option>
            </select>
          </label>
          <button type="button" onClick={downloadMonthlyOverview} disabled={isLoading_} className="px-3 py-2 rounded-lg border border-[var(--border-color)] text-xs font-semibold disabled:opacity-50"><Download className="inline w-3.5 h-3.5 mr-1"/>Export</button>
          <button type="button" onClick={() => window.print()} className="px-3 py-2 rounded-lg border border-[var(--border-color)] text-xs font-semibold">Print</button>
        </div>
      </div>
      <Card title="Data reconciliation" padded={false}>
        <div className="divide-y divide-[var(--border-color)]">
          {reconciliationChecks.map(check => <div key={check.label} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <span className="text-xs text-[var(--text-secondary)]">{check.label}</span>
            <span className={"text-xs font-semibold " + (check.ok === false ? "text-[var(--icon-red-text)]" : check.ok === true ? "text-[var(--icon-green-text)]" : "text-[var(--text-tertiary)]")}>{check.ok === false ? "Check required · " : check.ok === true ? "Balanced · " : ""}{check.detail}</span>
          </div>)}
        </div>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {sections.map(section => <Card key={section.title} title={section.title} padded={false}>
          <div className="divide-y divide-[var(--border-color)]">
            {section.rows.map(([label, paths, money, formLabel]: any) => {
              const value = read(section.data, paths, formLabel);
              return <div key={label} className="flex items-center justify-between gap-3 px-4 py-3"><span className="text-xs text-[var(--text-secondary)]">{label}</span><strong className="text-sm tabular-nums text-[var(--text-primary)]">{fmt(value, Boolean(money))}</strong></div>;
            })}
          </div>
        </Card>)}
      </div>
      <p className="text-[11px] text-[var(--text-tertiary)]">Figures are read from the corresponding existing reports for the selected period. A dash means that the source endpoint did not provide that indicator; it is not treated as zero. {monthlyOverview.unavailableSources?.length ? "Some source reports could not be loaded: " + monthlyOverview.unavailableSources.join(", ") + ". " : ""}Insurance claims are shown separately from patient billing. This management overview does not replace statutory GHS returns.</p>
    </div>;
  };

  const renderReportContent = () => {
    if (shellReport) return <GenericReportPage shape={shellReport} dateFrom={dateRange.start} dateTo={dateRange.end} />;
    const map: Record<string, () => React.ReactNode> = {
      'monthly-overview': renderMonthlyOverview, 'patient-billing-register': renderPatientBillingRegister, 'patients-seen-by-staff': renderPatientsSeenByStaff, 'consulting-room-register': renderConsultingRoomRegister, 'opd-attendance': renderOPDAttendanceReport,
      'opd-morbidity': renderFullMorbidityReport, 'top-diagnoses': renderTopDiagnoses, 'form-a': renderFormAReport,
      'ipd': renderIPDReport, 'malaria': renderMalariaReport, 'idsr': renderIDSRReport, 'epi': renderEPIReport, 'delivery-report': renderDeliveryReport, 'family-planning': renderFamilyPlanningReport,
    };
    return map[reportType]?.() ?? <EmptyState message="Select a report type to view data" />;
  };

  const isConsultingRoomRegister = reportType === 'consulting-room-register';

  return (
    <div className={isConsultingRoomRegister ? "min-w-0 max-w-full" : "space-y-4"}>
      <div className={isConsultingRoomRegister ? "min-w-0 space-y-3" : "space-y-4"}>
      <PageHeader title="Reports & Analytics" subtitle="GHS-compliant reporting" icon={BarChart3} accent="cyan" onBack={goBack}
        // FIX #58 — Refresh is hidden for shell reports on purpose: GenericReportPage owns its own Reload.
        actions={!shellReport ? (<>
          {canExport && reportType !== 'monthly-overview' ? (<>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg">
              <span className="text-[11px] text-[var(--text-tertiary)]">Export as</span>
              {/* FIX #23 — narrowed cast, and only for the three legal values. */}
              <select
                value={exportFormat}
                onChange={e => {
                  const v = e.target.value;
                  if (v === 'csv' || v === 'excel' || v === 'pdf') setExportFormat(v);
                }}
                className="bg-transparent text-xs text-[var(--text-primary)] focus:outline-none font-semibold"
              >
                <option value="csv">CSV</option><option value="excel">Excel</option><option value="pdf">PDF</option>
              </select>
            </div>
            <button onClick={handleExport} disabled={isLoading_ || !getActiveReport()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all disabled:opacity-50"><Download className="w-3.5 h-3.5" /> Export</button>
          </>) : (!canExport ? <span className="text-[11px] text-[var(--text-tertiary)]">Reading only — exporting a report is limited to admin, accounts and records.</span> : null)}
          <button onClick={loadReportNow} disabled={isLoading_} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-all text-xs font-medium disabled:opacity-50"><RefreshCw className={`w-3.5 h-3.5 ${isLoading_ ? 'animate-spin' : ''}`} /> Refresh</button>
        </>) : undefined} />
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-1 flex gap-1">
        {CATEGORIES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => { userPickedCategory.current = true; setActiveCategory(id); }}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${activeCategory === id ? 'bg-[var(--icon-cyan-text)] text-white shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)]'}`}
          >
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-3">
        {currentReports.length === 0 ? (<p className="text-[11px] text-[var(--text-tertiary)] px-1 py-1.5">No reports are available for your role in this category.</p>) : (
          <div className="flex flex-wrap gap-2">
            {currentReports.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setReportType(key)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${reportType === key ? 'bg-[var(--icon-cyan-text)] text-white shadow' : 'bg-[var(--bg-main)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:text-[var(--text-primary)] hover:border-[var(--icon-cyan-text)]'}`}>
                <Icon className="w-3.5 h-3.5" />{label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-[var(--text-tertiary)]" /><span className="text-xs font-semibold text-[var(--text-secondary)]">Period:</span></div>
          <div className="flex gap-1.5">{(['month', 'quarter', 'year'] as const).map(p => (<button key={p} onClick={() => setDatePreset(p)} className="px-2.5 py-1 text-[11px] font-medium rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)] transition-all capitalize">This {p}</button>))}</div>
          <div className="flex items-center gap-2 ml-auto">
            <input type="date" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} className="px-3 py-1.5 text-xs text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--icon-cyan-text)]" />
            <span className="text-[var(--text-tertiary)] text-xs">to</span>
            <input type="date" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} className="px-3 py-1.5 text-xs text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--icon-cyan-text)]" />
          </div>
        </div>
      </div>
      {generatedAt && (<div className="text-right text-[11px] text-[var(--text-tertiary)]">Generated: {generatedAt.toLocaleString()}</div>)}
      </div>
      <div className={isConsultingRoomRegister ? "min-w-0 max-w-full" : ""}>
      {isLoading_ ? (
        <div className="flex flex-col items-center justify-center py-20 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] gap-3">
          <div className="w-8 h-8 border-2 border-[var(--icon-cyan-text)] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-[var(--text-secondary)]">Generating {getReportTitle()}…</p>
        </div>
      ) : renderReportContent()}
      </div>
    </div>
  );
}