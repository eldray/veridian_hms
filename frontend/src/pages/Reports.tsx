import { useSmartBack } from '../utils/useSmartBack';
// src/pages/Reports.tsx
// Consistency fixes vs pasted version:
//  - Consulting Room Register: was entries.slice(0,100) + "Showing 100 of N" — rows 101+
//    were unreachable. Now shared Pagination, safePage, page resets on report/date change.
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
//  FIX #34  safePage could drift below registerPage after data shrank; a small effect
//           writes safePage back so Pagination and the raw state cannot disagree.
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
import GenericReportPage from '../components/reports/GenericReportPage';
import { SHELL_REPORT_BY_KEY, shellReportsForGroup } from '../config/reportRegistry';
import { REPORT_EXPORT_ROLES, type ReportShape } from '../components/reports/reportShell';
import { Card, PageHeader, Pagination, StatCard, TD, TD_MONO, TH, TH_ROW, TR, cn } from '../components/ui';

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
  { key: 'opd-attendance', label: 'OPD Attendance', icon: Users, color: 'cyan' },
  { key: 'consulting-room-register', label: 'Consulting Register', icon: ClipboardList, color: 'cyan' },
  { key: 'opd-morbidity', label: 'OPD Morbidity (Form A)', icon: FileSpreadsheet, color: 'red' },
  { key: 'top-diagnoses', label: 'Top 10 Diagnoses', icon: ListOrdered, color: 'orange' },
  { key: 'form-a', label: 'Form A (Maternal)', icon: Heart, color: 'cyan' },
  { key: 'ipd', label: 'IPD & Mortality', icon: Hospital, color: 'purple' },
  { key: 'malaria', label: 'Malaria Data', icon: Droplet, color: 'green' },
  { key: 'idsr', label: 'IDSR (Notifiable)', icon: AlertTriangle, color: 'orange' },
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
  <div className="flex flex-col items-center justify-center py-16 gap-3">
    <FileText className="w-10 h-10 opacity-20 text-[var(--text-tertiary)]" />
    <p className="text-xs text-[var(--text-tertiary)]">{message}</p>
    <p className="text-[11px] text-[var(--text-tertiary)] opacity-70">Try a different report type or date range</p>
  </div>
);

// FIX #9 — statutory returns must match a printed form, so we do not invent labels.
// If the backend hands us a section we have no curated map for, say so explicitly.
const NotYetCurated = ({ title, section }: { title: string; section: string }) => (
  <Card title={title} className="mb-5">
    <div className="flex items-start gap-3">
      <AlertTriangle className="w-4 h-4 mt-0.5 text-[var(--icon-orange-text)]" />
      <div>
        <p className="text-xs font-semibold text-[var(--text-primary)]">{section} is not rendered on screen yet</p>
        <p className="text-[11px] text-[var(--text-tertiary)] mt-1 leading-relaxed">
          The DHIMS2 field names for this section have not been curated against the printed
          Form A, so it is left blank rather than guessed. Enter these rows directly on the
          paper return, or raise it with the records officer to add the label map.
        </p>
      </div>
    </div>
  </Card>
);

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
  const [registerPage, setRegisterPage] = useState(1);
  const [registerPageSize] = useState(50);
  // FIX #50 — remember whether the user has deliberately picked a category, so the
  // fallback effect does not bounce them back out of an empty one.
  const userPickedCategory = useRef(false);
  // FIX #2 — debounce timer for the GHS path.
  const loadDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    getGHSOPDReport, getGHSIPDReport, getGHSIDSRReport, getGHSMalariaReport, getGHSFormAReport,
    getFamilyPlanningReport, getMorbidityMortalityReport, getTopDiagnoses, getConsultingRoomRegister, exportReport,
    opdReport, ipdReport, formAReport, malariaReport, idsrReport, familyPlanningReport,
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
        case 'opd-attendance': await getGHSOPDReport(f); break;
        case 'opd-morbidity': await getMorbidityMortalityReport(f); break;
        case 'top-diagnoses': await getTopDiagnoses(f, 10); break;
        case 'form-a': await getGHSFormAReport(f); break;
        case 'ipd': await getGHSIPDReport(f); break;
        case 'malaria': await getGHSMalariaReport(f); break;
        case 'idsr': await getGHSIDSRReport(f); break;
        case 'family-planning': await getFamilyPlanningReport(f); break;
        case 'consulting-room-register': await getConsultingRoomRegister({ ...f, period: 'daily' }); break;
      }
      setGeneratedAt(new Date());
    } catch (err: any) { toastError('Report Error', err.message || 'Failed to generate report'); }
    finally { setIsLoading(false); }
  }, [reportType, dateRange, getGHSOPDReport, getGHSIPDReport, getGHSIDSRReport, getGHSMalariaReport,
      getGHSFormAReport, getFamilyPlanningReport, getMorbidityMortalityReport, getTopDiagnoses,
      getConsultingRoomRegister, toastError]);

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
  useEffect(() => { setRegisterPage(1); }, [reportType, dateRange.start, dateRange.end]);
  // FIX #34 — write safePage back so Pagination and the raw state cannot drift.
  // (The drift only happens when a report shrank under the current page.)
  useEffect(() => {
    const report: any = consultingRoomRegister;
    if (!report) return;
    const totalPages = Math.max(1, Math.ceil((report.entries?.length ?? 0) / registerPageSize));
    if (registerPage > totalPages) setRegisterPage(totalPages);
  }, [consultingRoomRegister, registerPageSize, registerPage]);

  const getActiveReport = () => {
    const map: Record<string, any> = {
      'opd-attendance': opdReport, 'consulting-room-register': consultingRoomRegister,
      'opd-morbidity': morbidityMortalityReport, 'top-diagnoses': topDiagnoses, 'form-a': formAReport,
      'ipd': ipdReport, 'malaria': malariaReport, 'idsr': idsrReport, 'family-planning': familyPlanningReport,
    };
    return map[reportType] ?? null;
  };
  const handleExport = async () => {
    const activeReport = getActiveReport();
    if (!activeReport) { toastError('Export Failed', 'No report data available'); return; }
    try { await exportReport({ reportType, format: exportFormat, filters: { startDate: dateRange.start, endDate: dateRange.end }, data: activeReport }); success('Export Started', `Generating as ${exportFormat.toUpperCase()}`); }
    catch (err: any) { toastError('Export Failed', err.message); }
  };
  const isLoading_ = isLoading || storeLoading;
  const shellReport = SHELL_REPORT_BY_KEY[reportType];
  const allowedForRole = useCallback((roles?: string[]) => !roles || hasRole(roles), [hasRole]);
  const canExport = hasRole(REPORT_EXPORT_ROLES);
  // FIX #32 — dedupe by key so a registry/GHS collision cannot create duplicate React keys.
  const reportsForCategory = useCallback((groupId: ReportsTab) => {
    const list = [
      ...(groupId === 'ghs' ? GHS_REPORTS.map(item => ({ ...item, roles: GHS_REPORT_ROLES })) : []),
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
      'opd-attendance': 'OPD Attendance', 'consulting-room-register': 'Consulting Room Register',
      'opd-morbidity': 'OPD Morbidity (Form A)', 'top-diagnoses': 'Top 10 Diagnoses',
      'form-a': 'Form A — Maternal Health', 'ipd': 'IPD & Mortality', 'malaria': 'Malaria Data',
      'idsr': 'IDSR Notifiable Diseases', 'family-planning': 'Family Planning',
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
    const totalPages = Math.max(1, Math.ceil(entries.length / registerPageSize));
    const safePage = Math.min(registerPage, totalPages);
    const paginated = entries.slice((safePage - 1) * registerPageSize, safePage * registerPageSize);

    // FIX #26 — reuse the shared TEXT_TD/NUM_TD vocabulary; the local regTH/regTD copies are gone.
    const regTH = TEXT_TH;
    const regTHc = 'px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]';
    const regTD = 'px-3 py-2 text-xs text-[var(--text-primary)]';
    const regTDc = 'px-3 py-2 text-xs text-center text-[var(--text-primary)]';

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Patients" value={(report.summary?.totalPatients || 0).toLocaleString()} icon={Users} accent="cyan" />
          <StatCard label="New Patients" value={(report.summary?.newPatients || 0).toLocaleString()} icon={UserCheck} accent="green" />
          <StatCard label="NHIS Patients" value={(report.summary?.nhisPatients || 0).toLocaleString()} icon={Shield} accent="cyan" />
          <StatCard label="Pregnant Women" value={(report.summary?.pregnantWomen || 0).toLocaleString()} icon={Baby} accent="cyan" />
        </div>
        <Card title="Daily Patient Log" description={`${dateRange.start} → ${dateRange.end}`} icon={ClipboardList} padded={false}>
          <div className="overflow-x-auto">
            <div className="max-h-[560px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              <table className="w-full text-xs table-fixed">
                <thead className={cn(TH_ROW, 'sticky top-0 z-10')}>
                  <tr>
                    {/* FIX #27 — widths summed to 106% before; now exactly 100. */}
                    <th className={cn(regTH, 'w-[9%]')}>Date</th>
                    <th className={cn(regTH, 'w-[11%]')}>Patient No</th>
                    <th className={cn(regTH, 'w-[11%]')}>NHIS No</th>
                    <th className={cn(regTH, 'w-[15%]')}>Name</th>
                    <th className={cn(regTHc, 'w-[6%]')}>Age</th>
                    <th className={cn(regTHc, 'w-[4%]')}>Sex</th>
                    <th className={cn(regTH, 'w-[15%]')}>Provisional Dx</th>
                    <th className={cn(regTH, 'w-[11%]')}>Lab Tests</th>
                    <th className={cn(regTH, 'w-[12%]')}>Drugs</th>
                    <th className={cn(regTHc, 'w-[6%]')}>NHIS</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((e: any, i: number) => (
                    <tr key={`${e.patientNo}-${i}`} className={TR}>
                      <td className={cn(regTD, 'whitespace-nowrap')}>{e.date}</td>
                      <td className={cn(regTD, 'font-mono whitespace-nowrap')}>{e.patientNo}</td>
                      <td className={cn(regTD, 'font-mono whitespace-nowrap')}>{e.nhisNo || '—'}</td>
                      <td className={cn(regTD, 'truncate')}>{e.patientName}</td>
                      <td className={cn(regTDc, 'tabular-nums')}>{e.age}</td>
                      <td className={regTDc}>{e.sex === 'male' ? 'M' : 'F'}</td>
                      <td className={cn(regTD, 'truncate')}>{e.provisionalDiagnosis || '—'}</td>
                      <td className={cn(regTD, 'truncate')}>{e.labTestsRequested || '—'}</td>
                      <td className={cn(regTD, 'truncate')}>{e.drugsPrescribed || '—'}</td>
                      <td className={regTDc}>{e.isNHIS ? <span className="text-[var(--icon-green-text)] font-bold">Y</span> : <span className="text-[var(--text-tertiary)]">N</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
        <Pagination page={safePage} totalPages={totalPages} itemsPerPage={registerPageSize} totalItems={entries.length} noun="entries" onChange={setRegisterPage} />
      </div>
    );
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
          <StatCard label="Diseases Reported" value={diseases.length} icon={AlertTriangle} accent="orange" />
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
                </tr>
              </tfoot>
            </table>
          </div>
          {(diseases.some((d: any) => d.confirmed == null || d.deaths == null)) && (
            <p className="px-4 py-3 text-[11px] text-[var(--text-tertiary)] border-t border-[var(--border-color)]">
              Suspected counts the attendances diagnosed with each disease in the period. Laboratory-confirmed cases and deaths are not recorded per
              disease in the system yet, so they are left blank (—) instead of estimated. Complete them by hand before submitting the IDSR return.
            </p>
          )}
        </Card>
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

  const renderReportContent = () => {
    if (shellReport) return <GenericReportPage shape={shellReport} dateFrom={dateRange.start} dateTo={dateRange.end} />;
    const map: Record<string, () => React.ReactNode> = {
      'consulting-room-register': renderConsultingRoomRegister, 'opd-attendance': renderOPDAttendanceReport,
      'opd-morbidity': renderFullMorbidityReport, 'top-diagnoses': renderTopDiagnoses, 'form-a': renderFormAReport,
      'ipd': renderIPDReport, 'malaria': renderMalariaReport, 'idsr': renderIDSRReport, 'family-planning': renderFamilyPlanningReport,
    };
    return map[reportType]?.() ?? <EmptyState message="Select a report type to view data" />;
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Reports & Analytics" subtitle="GHS-compliant reporting" icon={BarChart3} accent="cyan" onBack={goBack}
        // FIX #58 — Refresh is hidden for shell reports on purpose: GenericReportPage owns its own Reload.
        actions={!shellReport ? (<>
          {canExport ? (<>
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
          </>) : (<span className="text-[11px] text-[var(--text-tertiary)]">Reading only — exporting a report is limited to admin, accounts and records.</span>)}
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
      {isLoading_ ? (
        <div className="flex flex-col items-center justify-center py-20 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] gap-3">
          <div className="w-8 h-8 border-2 border-[var(--icon-cyan-text)] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-[var(--text-secondary)]">Generating {getReportTitle()}…</p>
        </div>
      ) : renderReportContent()}
    </div>
  );
}