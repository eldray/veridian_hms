// src/pages/Reports.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useReportsStore } from '../store/reportsStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import {
  BarChart3, Users, DollarSign, FileText, Calendar,
  Download, Activity, Clock, Baby, Heart,
  PieChart, UserCheck, Shield, AlertTriangle, Droplet, RefreshCw,
  ArrowLeft, Hospital, ListOrdered,
  FileSpreadsheet, ClipboardList,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MalariaReportView } from '../components/reports/MalariaReportView';
import FormAReportView from '../components/reports/ANCReportView';
import GenericReportPage from '../components/reports/GenericReportPage';
import { SHELL_REPORT_BY_KEY, shellReportsForGroup } from '../config/reportRegistry';
import { REPORT_EXPORT_ROLES, type ReportShape } from '../components/reports/reportShell';

const AGE_GROUPS = [
  '<28d', '1-11m', '1-4', '5-9', '10-14', '15-17',
  '18-19', '20-34', '35-49', '50-59', '60-69', '70+',
];

// The hand-written views that are left. Each of them reproduces a printed GHS return, so the
// position of every cell is the point and they cannot be rendered from the shared report shell.
const GHS_REPORTS = [
  { key: 'opd-attendance',           label: 'OPD Attendance',         icon: Users,          color: 'cyan'   },
  { key: 'consulting-room-register', label: 'Consulting Register',    icon: ClipboardList,  color: 'cyan'   },
  { key: 'opd-morbidity',            label: 'OPD Morbidity (Form A)', icon: FileSpreadsheet, color: 'red'   },
  { key: 'top-diagnoses',            label: 'Top 10 Diagnoses',       icon: ListOrdered,    color: 'orange' },
  { key: 'form-a',                   label: 'Form A (Maternal)',      icon: Heart,          color: 'cyan'   },
  { key: 'ipd',                      label: 'IPD & Mortality',        icon: Hospital,       color: 'purple' },
  { key: 'malaria',                  label: 'Malaria Data',           icon: Droplet,        color: 'green'  },
  { key: 'idsr',                     label: 'IDSR (Notifiable)',      icon: AlertTriangle,  color: 'orange' },
  { key: 'family-planning',          label: 'Family Planning',        icon: Users,          color: 'cyan'   },
];

// All nine are answered by /ghs-reports, which guards the whole module with this one list
// (GHSReportRoutes.ts) — so the tab is gated, not each pill.
const GHS_REPORT_ROLES = ['admin', 'doctor', 'nurse', 'midwife', 'records', 'accounts'];

// The tabs are the report groups the registry knows about, so a new group is one edit in
// reportShell's ReportShape and not a new string union here.
type ReportsTab = ReportShape['group'];

// ── Shared primitives ─────────────────────────────────────────────────────────

const StatCard = ({ label, value, icon: Icon, color, subtext }: any) => (
  <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-4">
    <div className="flex items-center gap-2.5 mb-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--icon-${color}-bg)]`}>
        <Icon className={`w-4 h-4 text-[var(--icon-${color}-text)]`} />
      </div>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">{label}</span>
    </div>
    <p className="text-2xl font-bold text-[var(--text-primary)] leading-none">
      {typeof value === 'number' ? value.toLocaleString() : value}
    </p>
    {subtext && <p className="text-[11px] text-[var(--text-tertiary)] mt-1.5">{subtext}</p>}
  </div>
);

const SectionCard = ({ title, icon: Icon, subtitle, action, children }: any) => (
  <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-[var(--icon-cyan-text)]" />
        <span className="text-xs font-semibold text-[var(--text-primary)]">{title}</span>
        {subtitle && <span className="text-[11px] text-[var(--text-tertiary)]">· {subtitle}</span>}
      </div>
      {action}
    </div>
    <div className="overflow-x-auto">{children}</div>
  </div>
);

const TH = ({ children, center }: { children: React.ReactNode; center?: boolean }) => (
  <th className={`px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] whitespace-nowrap ${center ? 'text-center' : 'text-left'}`}>
    {children}
  </th>
);

// FIXED: removed invalid 'center' prop passing to <td> — handled via className instead
const TD = ({ children, className = '', center }: { children: React.ReactNode; className?: string; center?: boolean }) => (
  <td className={`px-3 py-2.5 text-xs text-[var(--text-secondary)] ${center ? 'text-center' : ''} ${className}`}>
    {children}
  </td>
);

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center py-16 gap-3">
    <FileText className="w-10 h-10 opacity-20 text-[var(--text-tertiary)]" />
    <p className="text-xs text-[var(--text-tertiary)]">{message}</p>
    <p className="text-[11px] text-[var(--text-tertiary)] opacity-70">Try a different report type or date range</p>
  </div>
);

// ═════════════════════════════════════════════════════════════════════════════

export default function Reports() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const { hasRole } = useAuthStore();

  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    end:   new Date().toISOString().split('T')[0],
  });
  const [activeCategory,   setActiveCategory]   = useState<ReportsTab>('ghs');
  const [reportType,       setReportType]        = useState('opd-attendance');
  const [isLoading,        setIsLoading]         = useState(false);
  const [exportFormat,     setExportFormat]      = useState<'csv' | 'excel' | 'pdf'>('csv');
  const [generatedAt,      setGeneratedAt]       = useState<Date | null>(null);

  // Only the statutory GHS returns are still fetched here. Everything else the screen offers is
  // declared in config/reportRegistry.ts and loaded by the shared shell beside its own tables.
  const {
    getGHSOPDReport, getGHSIPDReport, getGHSIDSRReport, getGHSMalariaReport,
    getGHSFormAReport, getFamilyPlanningReport, getMorbidityMortalityReport, getTopDiagnoses,
    getConsultingRoomRegister, exportReport,
    opdReport, ipdReport, formAReport, malariaReport, idsrReport, familyPlanningReport,
    morbidityMortalityReport, topDiagnoses, consultingRoomRegister,
    isLoading: storeLoading,
  } = useReportsStore();

  const categories: { id: ReportsTab; label: string; icon: typeof FileText }[] = [
    { id: 'ghs',      label: 'GHS Standard',  icon: FileText   },
    { id: 'clinical', label: 'Clinical',       icon: Activity   },
    { id: 'financial',label: 'Financial',      icon: DollarSign },
    { id: 'nhis',     label: 'NHIS',           icon: Shield     },
  ];

  const setDatePreset = (preset: 'month' | 'quarter' | 'year') => {
    const end = new Date(); let start = new Date();
    if (preset === 'month')   start = new Date(end.getFullYear(), end.getMonth(), 1);
    if (preset === 'quarter') start = new Date(end.getFullYear(), Math.floor(end.getMonth() / 3) * 3, 1);
    if (preset === 'year')    start = new Date(end.getFullYear(), 0, 1);
    setDateRange({ start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] });
  };

  const loadReport = useCallback(async () => {
    // Shell reports load themselves: the request, the filters and the totals all come from the
    // entry in config/reportRegistry.ts, so the page must not fetch a second copy.
    if (SHELL_REPORT_BY_KEY[reportType]) return;
    setIsLoading(true);
    try {
      const f = { startDate: dateRange.start, endDate: dateRange.end };
      switch (reportType) {
        case 'opd-attendance':    await getGHSOPDReport(f);             break;
        case 'opd-morbidity':     await getMorbidityMortalityReport(f); break;
        case 'top-diagnoses':     await getTopDiagnoses(f, 10);         break;
        case 'form-a':            await getGHSFormAReport(f);           break;
        case 'ipd':               await getGHSIPDReport(f);             break;
        case 'malaria':           await getGHSMalariaReport(f);         break;
        case 'idsr':              await getGHSIDSRReport(f);            break;
        case 'family-planning':   await getFamilyPlanningReport(f);     break;
        // FIXED: was calling getGHSOPDReport — now calls the correct store action
        case 'consulting-room-register':
          await getConsultingRoomRegister({ ...f, period: 'daily' });   break;
      }
      setGeneratedAt(new Date());
    } catch (err: any) {
      toastError('Report Error', err.message || 'Failed to generate report');
    } finally { setIsLoading(false); }
  }, [reportType, dateRange]);

  useEffect(() => { loadReport(); }, [loadReport]);
  
  const getActiveReport = () => {
    const map: Record<string, any> = {
      'opd-attendance':           opdReport,
      'consulting-room-register': consultingRoomRegister, // FIXED: was opdReport
      'opd-morbidity':            morbidityMortalityReport,
      'top-diagnoses':            topDiagnoses,
      'form-a':                   formAReport,
      'ipd':                      ipdReport,
      'malaria':                  malariaReport,
      'idsr':                     idsrReport,
      'family-planning':          familyPlanningReport,
    };
    return map[reportType] ?? null;
  };

  const handleExport = async () => {
    const activeReport = getActiveReport();
    if (!activeReport) { toastError('Export Failed', 'No report data available'); return; }
    try {
      await exportReport({ reportType, format: exportFormat, filters: { startDate: dateRange.start, endDate: dateRange.end }, data: activeReport });
      success('Export Started', `Generating as ${exportFormat.toUpperCase()}`);
    } catch (err: any) { toastError('Export Failed', err.message); }
  };

  const isLoading_ = isLoading || storeLoading;
  const shellReport = SHELL_REPORT_BY_KEY[reportType];
  const allowedForRole = useCallback((roles?: string[]) => !roles || hasRole(roles), [hasRole]);
  // The export endpoint answers to fewer roles than the reports do, so the button is hidden
  // rather than left to fail with a 403.
  const canExport = hasRole(REPORT_EXPORT_ROLES);

  // A tab is the hand-written GHS returns plus whatever the registry declares for that group, so
  // a new operational report is a registry entry and not an edit to this page. Every pill carries
  // the roles its own endpoint answers to: the Reports page is open to all staff but the reporting
  // routes are not, and a pill that 403s is worse than no pill.
  const reportsForCategory = useCallback((groupId: ReportsTab) => [
    ...(groupId === 'ghs' ? GHS_REPORTS.map(item => ({ ...item, roles: GHS_REPORT_ROLES })) : []),
    ...shellReportsForGroup(groupId).map(shape => ({
      key: shape.key,
      label: shape.label,
      icon: ListOrdered,
      color: 'green',
      roles: shape.roles,
    })),
  ].filter(item => allowedForRole(item.roles)), [allowedForRole]);

  const currentReports = useMemo(() => reportsForCategory(activeCategory), [reportsForCategory, activeCategory]);

  // GHS is the tab the screen opens on, but a lab or pharmacy role cannot open any of those
  // statutory returns — move to the first group whose reports answer to this role.
  useEffect(() => {
    if (currentReports.length > 0) return;
    const next = categories.map(category => category.id).find(id => reportsForCategory(id).length > 0);
    if (next) setActiveCategory(next);
  }, [currentReports.length, reportsForCategory]);

  // The remembered or default report may not be one this role may open.
  useEffect(() => {
    if (currentReports.length > 0 && !currentReports.some(item => item.key === reportType)) {
      setReportType(currentReports[0].key);
    }
  }, [currentReports, reportType]);

  const getReportTitle = () => {
    if (shellReport) return shellReport.label;
    const m: Record<string, string> = {
      'opd-attendance': 'OPD Attendance', 'consulting-room-register': 'Consulting Room Register',
      'opd-morbidity': 'OPD Morbidity (Form A)', 'top-diagnoses': 'Top 10 Diagnoses',
      'form-a': 'Form A — Maternal Health', 'ipd': 'IPD & Mortality',
      'malaria': 'Malaria Data', 'idsr': 'IDSR Notifiable Diseases', 'family-planning': 'Family Planning',
    };
    return m[reportType] || 'Report';
  };

  // ── Report renderers ──────────────────────────────────────────────────────

  const renderConsultingRoomRegister = () => {
    // FIXED: reads from consultingRoomRegister state, not opdReport
    const report = consultingRoomRegister as any;
    if (!report) return <EmptyState message="No consulting room register data available" />;
    const entries = report.entries || [];
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Patients" value={report.summary?.totalPatients || 0} icon={Users}     color="cyan"  />
          <StatCard label="New Patients"   value={report.summary?.newPatients    || 0} icon={UserCheck} color="green" />
          <StatCard label="NHIS Patients"  value={report.summary?.nhisPatients   || 0} icon={Shield}   color="cyan"  />
          <StatCard label="Pregnant Women" value={report.summary?.pregnantWomen  || 0} icon={Baby}     color="cyan"  />
        </div>
        <SectionCard title="Daily Patient Log" icon={ClipboardList} subtitle={`${dateRange.start} → ${dateRange.end}`}>
          <div className="max-h-[560px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[var(--bg-main)] border-b border-[var(--border-color)] z-10">
                <tr>
                  {['Date','Patient No','NHIS No','Name','Age','Sex','Provisional Dx','Lab Tests','Drugs','NHIS'].map(h => <TH key={h}>{h}</TH>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {entries.slice(0, 100).map((e: any, i: number) => (
                  <tr key={i} className="hover:bg-[var(--bg-main)] transition-colors">
                    <TD>{e.date}</TD>
                    <TD className="font-mono text-[var(--text-primary)]">{e.patientNo}</TD>
                    <TD className="font-mono">{e.nhisNo || '—'}</TD>
                    <TD className="text-[var(--text-primary)]">{e.patientName}</TD>
                    <TD>{e.age}</TD>
                    <TD>{e.sex === 'male' ? 'M' : 'F'}</TD>
                    <TD className="max-w-[180px] truncate">{e.provisionalDiagnosis || '—'}</TD>
                    <TD className="max-w-[130px] truncate">{e.labTestsRequested || '—'}</TD>
                    <TD className="max-w-[180px] truncate">{e.drugsPrescribed || '—'}</TD>
                    <TD center>{e.isNHIS ? <span className="text-[var(--icon-green-text)] font-bold">Y</span> : <span className="text-[var(--text-tertiary)]">N</span>}</TD>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {entries.length > 100 && <p className="text-center text-[11px] text-[var(--text-tertiary)] py-2">Showing 100 of {entries.length}</p>}
        </SectionCard>
      </div>
    );
  };

  const renderOPDAttendanceReport = () => {
    const report = opdReport as any;
    if (!report) return <EmptyState message="No OPD attendance data available" />;
    const ag = report.ageGroups || {};
    const t  = report.totals   || {};
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total Attendances" value={t.totalAttendances||0} icon={Users}     color="cyan"   />
          <StatCard label="New Cases"          value={t.new||0}             icon={UserCheck}  color="green"  />
          <StatCard label="Re-Attendances"     value={t.old||0}             icon={Clock}      color="yellow" />
          <StatCard label="Insured"            value={t.insured?.total||0}  icon={Shield}     color="cyan"   />
        </div>
        <SectionCard title="Age Group Distribution" icon={Users}>
          <table className="w-full text-xs">
            <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
              <tr>
                <TH>Age Group</TH>
                <th colSpan={2} className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Insured</th>
                <th colSpan={2} className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Non-Insured</th>
                <TH center>New</TH><TH center>Old</TH>
              </tr>
              <tr className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                <th className="px-3 py-1.5" />
                {['M','F','M','F'].map((l, i) => <th key={i} className="px-3 py-1.5 text-center text-[10px] text-[var(--text-tertiary)]">{l}</th>)}
                <th className="px-3 py-1.5" /><th className="px-3 py-1.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {Object.entries(ag).map(([group, data]: [string, any]) => (
                <tr key={group} className="hover:bg-[var(--bg-main)] transition-colors">
                  <TD className="text-[var(--text-primary)] font-medium">{group}</TD>
                  <TD center>{data?.insured?.male||0}</TD>
                  <TD center>{data?.insured?.female||0}</TD>
                  <TD center>{data?.nonInsured?.male||0}</TD>
                  <TD center>{data?.nonInsured?.female||0}</TD>
                  <TD center>{data?.new||0}</TD>
                  <TD center>{data?.old||0}</TD>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-[var(--bg-main)] border-t-2 border-[var(--border-color)]">
              <tr>
                <td className="px-3 py-2.5 text-xs font-bold text-[var(--text-primary)]">TOTAL</td>
                {[t.insured?.male||0,t.insured?.female||0,t.nonInsured?.male||0,t.nonInsured?.female||0,t.new||0,t.old||0].map((v,i) => (
                  <td key={i} className="px-3 py-2.5 text-center text-xs font-bold text-[var(--text-primary)]">{v}</td>
                ))}
              </tr>
            </tfoot>
          </table>
        </SectionCard>
      </div>
    );
  };

  const renderDiseaseTable = (title: string, data: Record<string, any>, diseaseLabels: Record<string, string>) => {
    const entries = Object.entries(diseaseLabels).filter(([key]) => data?.[key]);
    if (!entries.length) return null;
    const colTotals: Record<string, { male: number; female: number }> = {};
    AGE_GROUPS.forEach(a => { colTotals[a] = { male: 0, female: 0 }; });
    entries.forEach(([key]) => {
      const rd = data[key];
      if (rd) AGE_GROUPS.forEach(a => { if (rd[a]) { colTotals[a].male += rd[a].male||0; colTotals[a].female += rd[a].female||0; } });
    });
    return (
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden mb-5">
        <div className="px-4 py-3 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
          <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">{title}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-[var(--bg-main)] sticky top-0">
              <tr>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] sticky left-0 bg-[var(--bg-main)] z-10 min-w-[200px]">Disease / Condition</th>
                {AGE_GROUPS.map(a => (
                  <th key={a} colSpan={2} className="px-1 py-2 text-center text-[10px] font-semibold text-[var(--text-tertiary)] border-x border-[var(--border-color)] min-w-[56px]">{a}</th>
                ))}
                <th colSpan={2} className="px-2 py-2 text-center text-[10px] font-bold text-[var(--text-primary)] bg-[var(--bg-main)]">Total</th>
              </tr>
              <tr className="border-b border-[var(--border-color)]">
                <th className="sticky left-0 bg-[var(--bg-main)]" />
                {AGE_GROUPS.map(a => (
                  <React.Fragment key={a}>
                    <th className="px-1 py-1 text-center text-[9px] text-[var(--text-tertiary)]">M</th>
                    <th className="px-1 py-1 text-center text-[9px] text-[var(--text-tertiary)]">F</th>
                  </React.Fragment>
                ))}
                <th className="px-2 py-1 text-center text-[9px] text-[var(--text-tertiary)]">M</th>
                <th className="px-2 py-1 text-center text-[9px] text-[var(--text-tertiary)]">F</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {entries.map(([key, label]) => {
                const rd = data[key]; if (!rd) return null;
                let tm = 0, tf = 0;
                return (
                  <tr key={key} className="hover:bg-[var(--bg-main)] transition-colors">
                    <td className="px-3 py-2 text-xs text-[var(--text-primary)] font-medium sticky left-0 bg-[var(--bg-card)]">{label}</td>
                    {AGE_GROUPS.map(a => {
                      const m = rd[a]?.male||0, f = rd[a]?.female||0; tm+=m; tf+=f;
                      return (
                        <React.Fragment key={a}>
                          <td className="px-1 py-2 text-center text-xs text-[var(--text-secondary)]">{m||'—'}</td>
                          <td className="px-1 py-2 text-center text-xs text-[var(--text-secondary)]">{f||'—'}</td>
                        </React.Fragment>
                      );
                    })}
                    <td className="px-2 py-2 text-center text-xs font-bold text-[var(--text-primary)] bg-[var(--bg-main)]">{tm||'—'}</td>
                    <td className="px-2 py-2 text-center text-xs font-bold text-[var(--text-primary)] bg-[var(--bg-main)]">{tf||'—'}</td>
                  </tr>
                );
              })}
              <tr className="bg-[var(--bg-main)] border-t-2 border-[var(--border-color)]">
                <td className="px-3 py-2 text-xs font-bold text-[var(--text-primary)] sticky left-0 bg-[var(--bg-main)]">TOTAL</td>
                {AGE_GROUPS.map(a => (
                  <React.Fragment key={a}>
                    <td className="px-1 py-2 text-center text-xs font-bold text-[var(--text-primary)]">{colTotals[a]?.male||0}</td>
                    <td className="px-1 py-2 text-center text-xs font-bold text-[var(--text-primary)]">{colTotals[a]?.female||0}</td>
                  </React.Fragment>
                ))}
                <td className="px-2 py-2 text-center text-xs font-bold text-[var(--text-primary)] bg-[var(--bg-main)]">{Object.values(colTotals).reduce((s,a)=>s+a.male,0)}</td>
                <td className="px-2 py-2 text-center text-xs font-bold text-[var(--text-primary)] bg-[var(--bg-main)]">{Object.values(colTotals).reduce((s,a)=>s+a.female,0)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
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
          <StatCard label="Attendances" value={t.totalAttendances||0}   icon={Users}     color="cyan"   />
          <StatCard label="New Cases"   value={t.totalNewCases||0}      icon={UserCheck} color="green"  />
          <StatCard label="Re-Attend."  value={t.totalReAttendances||0} icon={Clock}     color="yellow" />
          <StatCard label="Referrals"   value={t.totalReferrals||0}     icon={Shield}    color="cyan"   />
        </div>
        {renderDiseaseTable('Section 1: Communicable Immunizable', report.communicableImmunizable, { afp_polio:'AFP / Polio', meningitis:'Meningitis', neonatal_tetanus:'Neonatal Tetanus', pertussis_whooping_cough:'Pertussis', diphtheria:'Diphtheria', measles:'Measles', yellow_fever:'Yellow Fever', tetanus:'Tetanus', tuberculosis:'Tuberculosis' })}
        {renderDiseaseTable('Section 2: Communicable Non-Immunizable', report.communicableNonImmunizable, { uncomplicated_malaria_suspected:'Malaria - Suspected', uncomplicated_malaria_tested:'Malaria - Tested', uncomplicated_malaria_positive:'Malaria - Positive', severe_malaria_lab_confirmed:'Severe Malaria', typhoid_fever:'Typhoid Fever', suspected_cholera:'Suspected Cholera', diarrhoea_diseases:'Diarrhoea', viral_hepatitis:'Viral Hepatitis', pneumonia:'Pneumonia', upper_respiratory_tract_infections:'URTI' })}
        {renderDiseaseTable('Section 3: Non-Communicable Diseases', report.nonCommunicable, { malnutrition:'Malnutrition', obesity:'Obesity', anaemia:'Anaemia', hypertension:'Hypertension', cardiac_diseases:'Cardiac Diseases', stroke:'Stroke', diabetes_mellitus:'Diabetes Mellitus', asthma:'Asthma', sickle_cell_disease:'Sickle Cell Disease' })}
        {renderDiseaseTable('Section 4: Mental Health', report.mentalHealth, { depression:'Depression', epilepsy:'Epilepsy', schizophrenia:'Schizophrenia', substance_abuse:'Substance Abuse' })}
        {renderDiseaseTable('Section 5: Specialized Conditions', report.specializedConditions, {})}
        {renderDiseaseTable('Section 6: Obstetrics & Gynaecology', report.obstetricsGynaecology, {})}
        {renderDiseaseTable('Section 7: Reproductive Tract', report.reproductiveTract, {})}
        {renderDiseaseTable('Section 8: Injuries', report.injuries, { transport_injuries_road_traffic_accidents:'Road Traffic Accidents', home_injuries:'Home Injuries', burns:'Burns', snake_bite:'Snake Bite', domestic_violence:'Domestic Violence' })}
        {renderDiseaseTable('Section 9: Re-Attendances & Referrals', report.reAttendancesReferrals, { re_attendances:'Re-Attendances', referrals:'Referrals' })}
        <p className="text-center text-[11px] text-[var(--text-tertiary)]">Generated {new Date().toLocaleString()}</p>
      </div>
    );
  };

  const renderTopDiagnoses = () => {
    const list = topDiagnoses as any[];
    if (!list?.length) return <EmptyState message="No diagnosis data available" />;
    return (
      <SectionCard title="Top 10 Diagnoses" icon={ListOrdered}>
        <table className="w-full text-xs">
          <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
            <tr><TH>Rank</TH><TH>Diagnosis</TH><TH>ICD-10</TH><TH>Group</TH><TH center>Male</TH><TH center>Female</TH><TH center>Total</TH></tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {list.map((d: any, i: number) => (
              <tr key={d.diagnosisId||i} className="hover:bg-[var(--bg-main)] transition-colors">
                <TD><span className="font-bold text-[var(--icon-orange-text)]">{i+1}</span></TD>
                <TD className="text-[var(--text-primary)] font-medium">{d.diagnosisName||d.name||d.disease}</TD>
                <TD className="font-mono">{d.icdCode||'—'}</TD>
                <TD><span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]">{d.morbidityGroup?.replace(/_/g,' ')||'General'}</span></TD>
                <TD center>{d.male||0}</TD>
                <TD center>{d.female||0}</TD>
                <TD center><span className="font-bold text-[var(--text-primary)]">{d.totalCases||d.patients||0}</span></TD>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    );
  };

// src/pages/Reports.tsx - Replace renderFormAReport
const renderFormAReport = () => {
  const report = formAReport as any;
  if (!report) return <EmptyState message="No Form A data available" />;
  
  // Pass the complete report data to the FormAReportView component
  return <FormAReportView data={report} />;
};

  const renderIPDReport = () => {
    const report = ipdReport as any;
    if (!report) return <EmptyState message="No IPD data available" />;
    const ag=report.ageGroups||{}, mal=report.malaria||{}, t=report.totals||{};
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total Admissions" value={t.totalAdmissions||0}                         icon={Hospital}     color="cyan"  />
          <StatCard label="Total Deaths"      value={t.totalDeaths||0}                             icon={AlertTriangle}color="red"   />
          {/* FIXED: camelCase field names — schema returns under5Admitted not under5_admitted */}
          <StatCard label="Under-5 Malaria"   value={mal.under5Admitted||0}                       icon={Baby}         color="yellow"/>
          <StatCard label="Malaria Deaths"    value={(mal.under5Deaths||0)+(mal.above5Deaths||0)} icon={AlertTriangle}color="red"   />
        </div>
        <SectionCard title="Admissions by Age Group" icon={Hospital}>
          <table className="w-full text-xs">
            <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
              <tr>
                <TH>Age Group</TH>
                <th colSpan={2} className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Insured</th>
                <th colSpan={2} className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Non-Insured</th>
              </tr>
              <tr className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                <th />
                {['M','F','M','F'].map((l,i) => <th key={i} className="px-3 py-1 text-center text-[9px] text-[var(--text-tertiary)]">{l}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {Object.entries(ag).map(([group, data]: [string,any]) => (
                <tr key={group} className="hover:bg-[var(--bg-main)] transition-colors">
                  <TD className="text-[var(--text-primary)] font-medium">{group}</TD>
                  <TD center>{data?.admissions?.insured?.male||0}</TD>
                  <TD center>{data?.admissions?.insured?.female||0}</TD>
                  <TD center>{data?.admissions?.nonInsured?.male||0}</TD>
                  <TD center>{data?.admissions?.nonInsured?.female||0}</TD>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      </div>
    );
  };

  const renderMalariaReport = () => {
    const report = malariaReport as any;
    if (!report) return <EmptyState message="No malaria data available" />;
    return <MalariaReportView data={report} dateRange={dateRange} />;
  };

  const renderIDSRReport = () => {
    const report = idsrReport as any;
    if (!report) return <EmptyState message="No IDSR data available" />;
    return (
      <SectionCard title="Notifiable Diseases (IDSR)" icon={AlertTriangle}>
        <table className="w-full text-xs">
          <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
            <tr><TH>Disease</TH><TH center>Suspected</TH><TH center>Confirmed</TH><TH center>Deaths</TH></tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {(report.diseases||[]).map((d: any, i: number) => (
              <tr key={i} className="hover:bg-[var(--bg-main)] transition-colors">
                <TD className="text-[var(--text-primary)] font-medium">{d.disease}</TD>
                <TD center>{d.suspected}</TD><TD center>{d.confirmed}</TD>
                <TD center><span className="font-bold text-[var(--icon-red-text)]">{d.deaths}</span></TD>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    );
  };

  const renderFamilyPlanningReport = () => {
    const report = familyPlanningReport as any;
    if (!report) return <EmptyState message="No family planning data available" />;
    if (report.returns) {
      return <FormAReportView data={{ ...report, form: report.returns, title: 'Monthly Family Planning Returns', filePrefix: 'GHS_FP_Returns' }} />;
    }
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <StatCard label="FP Clients"    value={report.summary?.totalFPClients||0} icon={Users}    color="cyan"   />
          <StatCard label="FP Visits"     value={report.summary?.totalFPVisits||0}  icon={Calendar} color="green"  />
          <StatCard label="New Acceptors" value={report.summary?.newAcceptors||0}   icon={UserCheck}color="cyan"   />
        </div>
        <SectionCard title="Method Mix" icon={PieChart}>
          <table className="w-full text-xs">
            <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
              <tr><TH>Method</TH><TH>Count</TH></tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {Object.entries(report.methodMix||{}).map(([m, c]: [string,any]) => (
                <tr key={m} className="hover:bg-[var(--bg-main)]">
                  <TD className="text-[var(--text-primary)]">{m}</TD>
                  <TD className="font-bold text-[var(--text-primary)]">{c}</TD>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      </div>
    );
  };

  const renderReportContent = () => {
    // Declared reports render through the shared shell; anything not in the registry keeps its
    // own view, which is what the statutory GHS returns need.
    if (shellReport) {
      return <GenericReportPage shape={shellReport} dateFrom={dateRange.start} dateTo={dateRange.end} />;
    }
    const map: Record<string, () => React.ReactNode> = {
      'consulting-room-register': renderConsultingRoomRegister,
      'opd-attendance':           renderOPDAttendanceReport,
      'opd-morbidity':            renderFullMorbidityReport,
      'top-diagnoses':            renderTopDiagnoses,
      'form-a':                   renderFormAReport,
      'ipd':                      renderIPDReport,
      'malaria':                  renderMalariaReport,
      'idsr':                     renderIDSRReport,
      'family-planning':          renderFamilyPlanningReport,
    };
    return map[reportType]?.() ?? <EmptyState message="Select a report type to view data" />;
  };

  // ── Page ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-all text-xs font-medium">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <div className="h-5 w-px bg-[var(--border-color)]" />
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--icon-cyan-bg)] flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-[var(--icon-cyan-text)]" />
            </div>
            <div>
              <h1 className="text-base font-bold text-[var(--text-primary)] leading-tight">Reports & Analytics</h1>
              <p className="text-[10px] text-[var(--text-tertiary)] leading-tight">GHS-compliant reporting</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* A shell report carries its own export and reload beside its filters; a second set of
              buttons that exported nothing was the old trap on this screen. */}
          {!shellReport && (
            <>
              {canExport ? (
                <>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg">
                    <span className="text-[11px] text-[var(--text-tertiary)]">Export as</span>
                    <select value={exportFormat} onChange={e => setExportFormat(e.target.value as any)}
                      className="bg-transparent text-xs text-[var(--text-primary)] focus:outline-none font-semibold">
                      <option value="csv">CSV</option>
                      <option value="excel">Excel</option>
                      <option value="pdf">PDF</option>
                    </select>
                  </div>
                  <button onClick={handleExport} disabled={isLoading_ || !getActiveReport()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all disabled:opacity-50">
                    <Download className="w-3.5 h-3.5" /> Export
                  </button>
                </>
              ) : (
                <span className="text-[11px] text-[var(--text-tertiary)]">Reading only — exporting a report is limited to admin, accounts and records.</span>
              )}
              <button onClick={loadReport} disabled={isLoading_}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-all text-xs font-medium disabled:opacity-50">
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading_ ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </>
          )}
        </div>
      </div>

      {/* Category tabs */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-1 flex gap-1">
        {categories.map(({ id, label, icon: Icon }) => (
          <button key={id}
            onClick={() => setActiveCategory(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${activeCategory === id ? 'bg-[var(--icon-cyan-text)] text-white shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)]'}`}>
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>

      {/* Report type pills */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-3">
        {currentReports.length === 0 ? (
          <p className="text-[11px] text-[var(--text-tertiary)] px-1 py-1.5">
            No reports are available for your role in this category.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {currentReports.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setReportType(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  reportType === key
                    ? 'bg-[var(--icon-cyan-text)] text-white shadow'
                    : 'bg-[var(--bg-main)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:text-[var(--text-primary)] hover:border-[var(--icon-cyan-text)]'
                }`}>
                <Icon className="w-3.5 h-3.5" />{label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Date range */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[var(--text-tertiary)]" />
            <span className="text-xs font-semibold text-[var(--text-secondary)]">Period:</span>
          </div>
          <div className="flex gap-1.5">
            {(['month','quarter','year'] as const).map(p => (
              <button key={p} onClick={() => setDatePreset(p)}
                className="px-2.5 py-1 text-[11px] font-medium rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)] transition-all capitalize">
                This {p}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})}
              className="px-3 py-1.5 text-xs text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--icon-cyan-text)]" />
            <span className="text-[var(--text-tertiary)] text-xs">to</span>
            <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})}
              className="px-3 py-1.5 text-xs text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--icon-cyan-text)]" />
          </div>
        </div>
      </div>

      {/* Generated timestamp */}
      {generatedAt && (
        <div className="text-right text-[11px] text-[var(--text-tertiary)]">
          Generated: {generatedAt.toLocaleString()}
        </div>
      )}

      {/* Report content */}
      {isLoading_ ? (
        <div className="flex flex-col items-center justify-center py-20 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] gap-3">
          <div className="w-8 h-8 border-2 border-[var(--icon-cyan-text)] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-[var(--text-secondary)]">Generating {getReportTitle()}…</p>
        </div>
      ) : renderReportContent()}
    </div>
  );
}