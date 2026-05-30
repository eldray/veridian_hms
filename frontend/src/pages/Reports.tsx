// src/pages/Reports.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useReportsStore } from '../store/reportsStore';
import { useToast } from '../store/toastStore';
import {
  BarChart3, TrendingUp, Users, DollarSign, FileText, Calendar,
  Download, Activity, Clock, CheckCircle, Baby, Heart, Stethoscope,
  PieChart, UserCheck, Shield, AlertTriangle, Droplet, RefreshCw,
  ArrowLeft, Hospital, Syringe, Scissors, FlaskConical, ListOrdered,
  FileSpreadsheet, ClipboardList, AlertCircle, Filter,
  CalendarDays, CreditCard, Package,Eye,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MalariaReportView } from '../components/reports/MalariaReportView';

const AGE_GROUPS = [
  '<28d', '1-11m', '1-4', '5-9', '10-14', '15-17',
  '18-19', '20-34', '35-49', '50-59', '60-69', '70+',
];

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

const FilterBar = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] px-4 py-3">
    <div className="flex flex-wrap items-center gap-3">{children}</div>
  </div>
);

const SelectField = ({ value, onChange, children }: any) => (
  <select value={value} onChange={onChange}
    className="px-3 py-1.5 text-xs bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--icon-cyan-text)]">
    {children}
  </select>
);

const ApplyBtn = ({ onClick }: { onClick: () => void }) => (
  <button onClick={onClick}
    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all">
    Apply
  </button>
);

const NhisStatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    EXPIRED:  'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]',
    CRITICAL: 'bg-[var(--icon-orange-bg)] text-[var(--icon-orange-text)]',
    WARNING:  'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]',
    HEALTHY:  'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]',
    ACTIVE:   'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${map[status] ?? 'bg-[var(--bg-main)] text-[var(--text-secondary)]'}`}>
      {status}
    </span>
  );
};

const expiryColour = (days: number | null) => {
  if (days === null) return 'text-[var(--text-tertiary)]';
  if (days <= 0)  return 'text-[var(--icon-red-text)] font-bold';
  if (days <= 7)  return 'text-[var(--icon-orange-text)] font-bold';
  if (days <= 30) return 'text-[var(--icon-yellow-text)] font-semibold';
  return 'text-[var(--icon-green-text)]';
};

// ═════════════════════════════════════════════════════════════════════════════

export default function Reports() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    end:   new Date().toISOString().split('T')[0],
  });
  const [activeCategory,   setActiveCategory]   = useState<'ghs' | 'clinical' | 'financial' | 'nhis'>('ghs');
  const [reportType,       setReportType]        = useState('opd-attendance');
  const [activeFormATab,   setActiveFormATab]    = useState<'antenatal' | 'delivery' | 'postnatal'>('antenatal');
  const [isLoading,        setIsLoading]         = useState(false);
  const [exportFormat,     setExportFormat]      = useState<'csv' | 'excel' | 'pdf'>('csv');
  const [generatedAt,      setGeneratedAt]       = useState<Date | null>(null);
  const [nhisExpiryDays,   setNhisExpiryDays]   = useState(30);
  const [nhisExpiryStatus, setNhisExpiryStatus] = useState('all');

  const {
    getGHSOPDReport, getGHSIPDReport, getGHSIDSRReport, getGHSMalariaReport,
    getGHSFormAReport, getFamilyPlanningReport, getMorbidityMortalityReport, getTopDiagnoses,
    getDemographicReport, getFinancialReport, getInsuranceClaimsReport, getClinicalReport,
    getAttendanceReport, getRevenueReport, getLabReport, getScanReport,
    getProcedureReport, getMedicationReport, getVitalsReport,
    getNhisExpiryReport, getNhisClaimsSummary, exportReport,
    // FIXED: also pull getConsultingRoomRegister from the store
    getConsultingRoomRegister,
    opdReport, ipdReport, formAReport, malariaReport, idsrReport, familyPlanningReport,
    morbidityMortalityReport, topDiagnoses, demographicReport, financialReport,
    insuranceClaimsReport, clinicalReport, attendanceReport, revenueReport,
    labReport, scanReport, procedureReport, medicationReport, vitalsReport,
    nhisExpiryReport, nhisClaimsSummary,
    // FIXED: consultingRoomRegister is its own state field in the store now
    consultingRoomRegister,
    isLoading: storeLoading,
  } = useReportsStore();

  const categories = [
    { id: 'ghs',      label: 'GHS Standard',  icon: FileText   },
    { id: 'clinical', label: 'Clinical',       icon: Activity   },
    { id: 'financial',label: 'Financial',      icon: DollarSign },
    { id: 'nhis',     label: 'NHIS',           icon: Shield     },
  ];

  const reportItems = {
    ghs: [
      { key: 'opd-attendance',           label: 'OPD Attendance',       icon: Users,         color: 'cyan'   },
      { key: 'consulting-room-register', label: 'Consulting Register',   icon: ClipboardList, color: 'cyan'   },
      { key: 'opd-morbidity',            label: 'OPD Morbidity (Form A)',icon: FileSpreadsheet,color: 'red'   },
      { key: 'top-diagnoses',            label: 'Top 10 Diagnoses',     icon: ListOrdered,   color: 'orange' },
      { key: 'form-a',                   label: 'Form A (Maternal)',     icon: Heart,         color: 'cyan'   },
      { key: 'ipd',                      label: 'IPD & Mortality',       icon: Hospital,      color: 'purple' },
      { key: 'malaria',                  label: 'Malaria Data',          icon: Droplet,       color: 'green'  },
      { key: 'idsr',                     label: 'IDSR (Notifiable)',     icon: AlertTriangle, color: 'orange' },
      { key: 'family-planning',          label: 'Family Planning',       icon: Users,         color: 'cyan'   },
    ],
    clinical: [
      { key: 'demographic', label: 'Demographic',  icon: PieChart,      color: 'cyan' },
      { key: 'attendance',  label: 'Attendance',   icon: Calendar,      color: 'cyan' },
      { key: 'lab',         label: 'Laboratory',   icon: FlaskConical,  color: 'cyan' },
      { key: 'scans',       label: 'Radiology',    icon: ClipboardList, color: 'cyan' },
      { key: 'procedures',  label: 'Procedures',   icon: Scissors,      color: 'cyan' },
      { key: 'medications', label: 'Medications',  icon: Syringe,       color: 'cyan' },
      { key: 'vitals',      label: 'Vitals',       icon: Activity,      color: 'cyan' },
    ],
    financial: [
      { key: 'financial', label: 'Financial Summary', icon: DollarSign, color: 'green'  },
      { key: 'revenue',   label: 'Revenue Analysis',  icon: TrendingUp, color: 'green'  },
      { key: 'insurance', label: 'Insurance Claims',  icon: Shield,     color: 'purple' },
    ],
    nhis: [
      { key: 'nhis-expiry', label: 'NHIS Expiry',         icon: CalendarDays, color: 'orange' },
      { key: 'nhis-claims', label: 'NHIS Claims Summary',  icon: CreditCard,  color: 'cyan'   },
    ],
  };

  const setDatePreset = (preset: 'month' | 'quarter' | 'year') => {
    const end = new Date(); let start = new Date();
    if (preset === 'month')   start = new Date(end.getFullYear(), end.getMonth(), 1);
    if (preset === 'quarter') start = new Date(end.getFullYear(), Math.floor(end.getMonth() / 3) * 3, 1);
    if (preset === 'year')    start = new Date(end.getFullYear(), 0, 1);
    setDateRange({ start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] });
  };

  const loadReport = useCallback(async () => {
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
        case 'demographic':       await getDemographicReport(f);        break;
        case 'financial':         await getFinancialReport(f);          break;
        case 'insurance':         await getInsuranceClaimsReport(f);    break;
        case 'attendance':        await getAttendanceReport(f);         break;
        case 'revenue':           await getRevenueReport(f);            break;
        case 'lab':               await getLabReport(f);                break;
        case 'scans':             await getScanReport(f);               break;
        case 'procedures':        await getProcedureReport(f);          break;
        case 'medications':       await getMedicationReport(f);         break;
        case 'vitals':            await getVitalsReport(f);             break;
        // FIXED: was calling getGHSOPDReport — now calls the correct store action
        case 'consulting-room-register':
          await getConsultingRoomRegister({ ...f, period: 'daily' });   break;
        case 'nhis-expiry':
          await getNhisExpiryReport({ daysThreshold: nhisExpiryDays, ...f }); break;
        case 'nhis-claims':
          await getNhisClaimsSummary({
            ...f,
            expiryStatus: nhisExpiryStatus !== 'all' ? nhisExpiryStatus as any : undefined,
          }); break;
      }
      setGeneratedAt(new Date());
    } catch (err: any) {
      toastError('Report Error', err.message || 'Failed to generate report');
    } finally { setIsLoading(false); }
  }, [reportType, dateRange, nhisExpiryDays, nhisExpiryStatus]);

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
      'demographic':              demographicReport,
      'financial':                financialReport,
      'insurance':                insuranceClaimsReport,
      'attendance':               attendanceReport,
      'revenue':                  revenueReport,
      'lab':                      labReport,
      'scans':                    scanReport,
      'procedures':               procedureReport,
      'medications':              medicationReport,
      'vitals':                   vitalsReport,
      'nhis-expiry':              nhisExpiryReport,
      'nhis-claims':              nhisClaimsSummary,
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
  const currentReports = reportItems[activeCategory as keyof typeof reportItems] || reportItems.ghs;

  const getReportTitle = () => {
    const m: Record<string, string> = {
      'opd-attendance': 'OPD Attendance', 'consulting-room-register': 'Consulting Room Register',
      'opd-morbidity': 'OPD Morbidity (Form A)', 'top-diagnoses': 'Top 10 Diagnoses',
      'form-a': 'Form A — Maternal Health', 'ipd': 'IPD & Mortality',
      'malaria': 'Malaria Data', 'idsr': 'IDSR Notifiable Diseases', 'family-planning': 'Family Planning',
      'demographic': 'Demographic Analysis', 'financial': 'Financial Summary',
      'insurance': 'Insurance Claims', 'attendance': 'Attendance Patterns',
      'revenue': 'Revenue Analysis', 'lab': 'Laboratory', 'scans': 'Radiology/Scans',
      'procedures': 'Procedures', 'medications': 'Medications', 'vitals': 'Vitals',
      'nhis-expiry': 'NHIS Membership Expiry', 'nhis-claims': 'NHIS Claims Summary',
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

  const renderNhisExpiryReport = () => {
    const report = nhisExpiryReport as any;
    if (!report) return <EmptyState message="No NHIS expiry data available" />;
    const s = report.summary || {};
    const patients = report.patients || [];
    return (
      <div className="space-y-4">
        <FilterBar>
          <AlertCircle className="w-4 h-4 text-[var(--text-tertiary)]" />
          <span className="text-xs font-semibold text-[var(--text-secondary)]">Days threshold:</span>
          <SelectField value={nhisExpiryDays} onChange={(e: any) => setNhisExpiryDays(parseInt(e.target.value))}>
            {[7,14,30,60,90].map(d => <option key={d} value={d}>{d} days</option>)}
          </SelectField>
          <ApplyBtn onClick={loadReport} />
        </FilterBar>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard label="Total NHIS" value={s.totalNHISPatients||0} icon={Users}         color="cyan"   />
          <StatCard label="Expired"    value={s.expired||0}           icon={AlertTriangle}  color="red"    />
          <StatCard label="Critical"   value={s.critical||0}          icon={AlertCircle}    color="orange" />
          <StatCard label="Warning"    value={s.warning||0}           icon={AlertTriangle}  color="yellow" />
          <StatCard label="Healthy"    value={s.healthy||0}           icon={CheckCircle}    color="green"  />
        </div>
        <SectionCard title="NHIS Memberships — Expiry Status" icon={CalendarDays}>
          <table className="w-full text-xs">
            <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
              <tr>{['Folder No','Patient Name','NHIS Number','Contact','Expiry Date','Days Left','Status','Last Visit'].map(h => <TH key={h}>{h}</TH>)}</tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {patients.map((p: any, i: number) => (
                <tr key={i} className="hover:bg-[var(--bg-main)] transition-colors">
                  <TD className="font-mono text-[var(--text-primary)]">{p.folderNumber}</TD>
                  <TD className="text-[var(--text-primary)]">{p.fullName}</TD>
                  <TD className="font-mono">{p.nhisNumber || '—'}</TD>
                  <TD>{p.phoneNumber || p.contact || '—'}</TD>
                  <TD>{p.nhisExpiryDate ? new Date(p.nhisExpiryDate).toLocaleDateString() : '—'}</TD>
                  <TD><span className={expiryColour(p.daysUntilExpiry)}>{p.daysUntilExpiry !== null ? (p.daysUntilExpiry <= 0 ? 'Expired' : `${p.daysUntilExpiry}d`) : '—'}</span></TD>
                  <TD><NhisStatusBadge status={p.expiryStatus} /></TD>
                  <TD>{p.lastVisit ? new Date(p.lastVisit).toLocaleDateString() : '—'}</TD>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      </div>
    );
  };

  const renderNhisClaimsSummary = () => {
    const report = nhisClaimsSummary as any;
    if (!report) return <EmptyState message="No NHIS claims data available" />;
    const s = report.summary || {};
    const claims = report.claims || [];
    const byStatus = s.byExpiryStatus || {};
    return (
      <div className="space-y-4">
        <FilterBar>
          <Filter className="w-4 h-4 text-[var(--text-tertiary)]" />
          <span className="text-xs font-semibold text-[var(--text-secondary)]">Expiry Status:</span>
          <SelectField value={nhisExpiryStatus} onChange={(e: any) => setNhisExpiryStatus(e.target.value)}>
            <option value="all">All</option>
            <option value="ACTIVE">Active</option>
            <option value="WARNING">Warning (31–60 days)</option>
            <option value="CRITICAL">Critical (0–30 days)</option>
            <option value="EXPIRED">Expired</option>
          </SelectField>
          <ApplyBtn onClick={loadReport} />
        </FilterBar>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total Claims"   value={s.totalClaims||0}                                    icon={FileText}     color="cyan"  />
          <StatCard label="Claim Amount"   value={`GHS ${(s.totalClaimAmount||0).toLocaleString()}`}   icon={DollarSign}   color="green" />
          <StatCard label="Active Members" value={byStatus.ACTIVE||0}                                  icon={CheckCircle}  color="green" />
          <StatCard label="Expired"        value={byStatus.EXPIRED||0}                                 icon={AlertTriangle}color="red"   />
        </div>
        <div className="grid grid-cols-5 gap-3">
          {[
            { k: 'ACTIVE',   l: 'Active',   cls: 'border-[var(--icon-green-text)] bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]' },
            { k: 'WARNING',  l: 'Warning',  cls: 'border-[var(--icon-yellow-text)] bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]' },
            { k: 'CRITICAL', l: 'Critical', cls: 'border-[var(--icon-orange-text)] bg-[var(--icon-orange-bg)] text-[var(--icon-orange-text)]' },
            { k: 'EXPIRED',  l: 'Expired',  cls: 'border-[var(--icon-red-text)] bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]' },
            { k: 'UNKNOWN',  l: 'Unknown',  cls: 'border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-secondary)]' },
          ].map(({ k, l, cls }) => (
            <div key={k} className={`p-3 rounded-xl border text-center ${cls}`}>
              <p className="text-[10px] font-semibold opacity-80">{l}</p>
              <p className="text-xl font-bold mt-0.5">{byStatus[k] || 0}</p>
            </div>
          ))}
        </div>
        <SectionCard title="NHIS Claims with Expiry Status" icon={CreditCard}>
          <table className="w-full text-xs">
            <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
              <tr><TH>Claim #</TH><TH>Patient</TH><TH>NHIS #</TH><TH>Expiry Date</TH><TH>Status</TH><TH>Amount</TH><TH>Submitted</TH></tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {claims.slice(0, 50).map((c: any, i: number) => (
                <tr key={i} className="hover:bg-[var(--bg-main)] transition-colors">
                  <TD className="font-mono text-[var(--text-primary)]">{c.claimNumber}</TD>
                  <TD className="text-[var(--text-primary)]">{c.patientName}</TD>
                  <TD className="font-mono">{c.nhisNumber || '—'}</TD>
                  <TD>{c.nhisExpiryDate ? new Date(c.nhisExpiryDate).toLocaleDateString() : '—'}</TD>
                  <TD><NhisStatusBadge status={c.nhisExpiryStatus} /></TD>
                  <TD className="text-right font-medium text-[var(--text-primary)]">GHS {c.totalClaimAmount?.toLocaleString()}</TD>
                  <TD>{c.submissionDate ? new Date(c.submissionDate).toLocaleDateString() : '—'}</TD>
                </tr>
              ))}
            </tbody>
          </table>
          {claims.length > 50 && <p className="text-center text-[11px] text-[var(--text-tertiary)] py-2">Showing 50 of {claims.length}</p>}
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

  const renderFormAReport = () => {
    const report = formAReport as any;
    if (!report) return <EmptyState message="No Form A data available" />;
    return (
      <div className="space-y-4">
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-5 text-center">
          <p className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide">Ghana Health Service</p>
          <p className="text-xs font-semibold text-[var(--text-secondary)] mt-1">Form A: Maternal Health Report</p>
          <p className="text-[11px] text-[var(--text-tertiary)] mt-1">{report.facility?.name} · {report.period?.monthName} {report.period?.year}</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="ANC Registrants"  value={report.antenatal?.newRegistrants||0}  icon={UserCheck}color="green" />
          <StatCard label="Total Deliveries" value={report.delivery?.totalDeliveries||0}   icon={Baby}     color="cyan"  />
          <StatCard label="Live Births"      value={report.delivery?.liveBirths||0}         icon={Heart}    color="cyan"  />
          <StatCard label="PNC Visits"       value={report.postnatal?.totalVisits||0}       icon={Activity} color="cyan"  />
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-1 flex gap-1">
          {(['antenatal','delivery','postnatal'] as const).map(t => (
            <button key={t} onClick={() => setActiveFormATab(t)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${activeFormATab===t?'bg-pink-500 text-white':'text-[var(--text-secondary)] hover:bg-[var(--bg-main)]'}`}>
              {t}
            </button>
          ))}
        </div>
        {activeFormATab === 'antenatal' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[{v:report.antenatal?.iptp?.dose3||0,l:'IPTp-3+'},{v:report.antenatal?.ttVaccination?.tt2Plus||0,l:'TT2+ Protected'},{v:report.antenatal?.itnDistributed||0,l:'ITN Distributed'},{v:report.antenatal?.firstVisits||0,l:'First ANC Visits'}].map(({v,l})=>(
              <div key={l} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-[var(--text-primary)]">{v}</p>
                <p className="text-[11px] text-[var(--text-tertiary)] mt-1">{l}</p>
              </div>
            ))}
          </div>
        )}
        {activeFormATab === 'delivery' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[{v:report.delivery?.spontaneousVertex||0,l:'Spontaneous Vertex'},{v:report.delivery?.caesareanSection||0,l:'Caesarean Section'},{v:report.delivery?.liveBirths||0,l:'Live Births'},{v:(report.delivery?.stillbirthsFresh||0)+(report.delivery?.stillbirthsMacerated||0),l:'Stillbirths'}].map(({v,l})=>(
              <div key={l} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-[var(--text-primary)]">{v}</p>
                <p className="text-[11px] text-[var(--text-tertiary)] mt-1">{l}</p>
              </div>
            ))}
          </div>
        )}
        {activeFormATab === 'postnatal' && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[{v:report.postnatal?.newMothers||0,l:'New Mothers'},{v:report.postnatal?.pncWithin48Hours||0,l:'PNC within 48h'},{v:report.postnatal?.exclusiveBreastfeeding||0,l:'Exclusive BF'}].map(({v,l})=>(
              <div key={l} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-[var(--text-primary)]">{v}</p>
                <p className="text-[11px] text-[var(--text-tertiary)] mt-1">{l}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
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

  const renderDemographicReport = () => {
    const report = demographicReport as any;
    if (!report) return <EmptyState message="No demographic data available" />;
    const demo = report.patientDemographics || {};
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total Patients"     value={demo.totalPatients||0}                                      icon={Users}    color="cyan"  />
          <StatCard label="Male"               value={demo.genderDistribution?.male||0}                           icon={Users}    color="cyan"  />
          <StatCard label="Female"             value={demo.genderDistribution?.female||0}                         icon={Users}    color="cyan"  />
          <StatCard label="Avg Visits/Patient" value={report.attendancePatterns?.visitsPerPatient?.toFixed(1)||0} icon={Activity} color="green" />
        </div>
        <SectionCard title="Age Distribution" icon={PieChart}>
          <table className="w-full text-xs">
            <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
              <tr><TH>Age Group</TH><TH>Count</TH></tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {Object.entries(demo.ageDistribution||{}).map(([g,c]: [string,any]) => (
                <tr key={g} className="hover:bg-[var(--bg-main)]">
                  <TD className="text-[var(--text-primary)]">{g}</TD>
                  <TD>{c}</TD>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      </div>
    );
  };

  const renderFinancialReport = () => {
    const report = financialReport as any;
    if (!report) return <EmptyState message="No financial data available" />;
    const s = report.summary || {};
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total Revenue"   value={`GHS ${(s.totalRevenue||0).toLocaleString()}`}      icon={DollarSign}   color="green" />
          <StatCard label="Total Paid"      value={`GHS ${(s.totalPaid||0).toLocaleString()}`}          icon={CheckCircle}  color="green" />
          <StatCard label="Outstanding"     value={`GHS ${(s.outstandingBalance||0).toLocaleString()}`} icon={AlertTriangle} color="red"  />
          <StatCard label="Total Bills"     value={s.totalBills||0}                                     icon={FileText}     color="cyan"  />
        </div>
        <SectionCard title="Revenue by Payment Mode" icon={PieChart}>
          <table className="w-full text-xs">
            <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
              <tr><TH>Payment Mode</TH><TH>Revenue</TH><TH>Bills</TH><TH>Avg Bill</TH></tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {(report.revenueByPaymentMode||[]).map((item: any, i: number) => (
                <tr key={i} className="hover:bg-[var(--bg-main)]">
                  <TD className="capitalize text-[var(--text-primary)]">{item.paymentMode?.replace('_',' ')}</TD>
                  <TD>GHS {item.totalRevenue?.toLocaleString()}</TD>
                  <TD>{item.billCount}</TD>
                  <TD>GHS {item.averageBill?.toLocaleString()}</TD>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      </div>
    );
  };

  const renderLabReport = () => {
    const report = labReport as any;
    if (!report) return <EmptyState message="No laboratory data available" />;
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total Tests"   value={report.summary?.totalTests||0}              icon={FlaskConical}color="cyan"  />
          <StatCard label="Completed"     value={report.summary?.byStatus?.completed||0}     icon={CheckCircle} color="green" />
          <StatCard label="In Progress"   value={report.summary?.byStatus?.inProgress||0}    icon={Activity}    color="yellow"/>
          <StatCard label="Avg Turnaround"value={`${report.summary?.averageTurnaroundTime||0}min`}icon={Clock}color="cyan"  />
        </div>
        <SectionCard title="Top 10 Tests" icon={FlaskConical}>
          <table className="w-full text-xs">
            <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
              <tr><TH>Test Name</TH><TH>Count</TH><TH>Positivity Rate</TH></tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {(report.topTests||[]).map((test: any, i: number) => (
                <tr key={i} className="hover:bg-[var(--bg-main)]">
                  <TD className="text-[var(--text-primary)]">{i+1}. {test.testName}</TD>
                  <TD>{test.count}</TD>
                  <TD>{test.positiveRate||0}%</TD>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      </div>
    );
  };

  const renderAttendanceReport = () => {
    const report = attendanceReport as any;
    if (!report) return <EmptyState message="No attendance data available" />;
    const s = report.summary||{}, p = report.attendancePatterns||{};
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <StatCard label="Total Attendances"  value={s.totalAttendances||0}                    icon={Users}    color="cyan"   />
          <StatCard label="Unique Patients"    value={s.uniquePatients||0}                      icon={UserCheck}color="green"  />
          <StatCard label="Avg Visits/Patient" value={s.averageVisitsPerPatient?.toFixed(1)||0} icon={Activity} color="cyan"   />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[{title:'By Type',data:p.byType},{title:'By Payment Mode',data:p.byPaymentMode}].map(({title,data})=>(
            <SectionCard key={title} title={title} icon={PieChart}>
              <div className="p-4 space-y-2">
                {Object.entries(data||{}).map(([k,v]: [string,any]) => (
                  <div key={k} className="flex items-center justify-between text-xs">
                    <span className="capitalize text-[var(--text-secondary)]">{k.replace('_',' ')}</span>
                    <span className="font-bold text-[var(--text-primary)]">{v}</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          ))}
        </div>
      </div>
    );
  };

  const renderRevenueReport = () => {
    const report = revenueReport as any;
    if (!report) return <EmptyState message="No revenue data available" />;
    const s = report.summary||{};
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <StatCard label="Total Revenue" value={`GHS ${(s.totalRevenue||0).toLocaleString()}`}    icon={DollarSign}color="green" />
          <StatCard label="Total Bills"   value={s.totalBills||0}                                   icon={FileText}  color="cyan"  />
          <StatCard label="Average Bill"  value={`GHS ${(s.averageBillAmount||0).toLocaleString()}`}icon={TrendingUp}color="cyan"  />
        </div>
        <SectionCard title="Revenue by Payment Mode" icon={TrendingUp}>
          <table className="w-full text-xs">
            <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
              <tr><TH>Payment Mode</TH><TH>Revenue</TH><TH>Bills</TH><TH>Avg Bill</TH></tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {(report.revenueByPaymentMode||[]).map((item: any, i: number) => (
                <tr key={i} className="hover:bg-[var(--bg-main)]">
                  <TD className="capitalize text-[var(--text-primary)]">{item.paymentMode?.replace('_',' ')}</TD>
                  <TD>GHS {item.totalRevenue?.toLocaleString()}</TD>
                  <TD>{item.billCount}</TD>
                  <TD>GHS {item.averageBill?.toLocaleString()}</TD>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      </div>
    );
  };

  const renderScanReport = () => {
    const report = scanReport as any;
    if (!report) return <EmptyState message="No radiology data available" />;
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total Scans"    value={report.summary?.totalScans||0}           icon={ClipboardList}color="cyan"  />
          <StatCard label="Completed"      value={report.summary?.byStatus?.completed||0}  icon={CheckCircle}  color="green" />
          <StatCard label="Avg Turnaround" value={`${report.summary?.averageTurnaroundTime||0}min`} icon={Clock}color="cyan"  />
          <StatCard label="Cancelled"      value={report.summary?.byStatus?.cancelled||0}  icon={AlertTriangle}color="red"   />
        </div>
        <SectionCard title="Top Scans" icon={ClipboardList}>
          <table className="w-full text-xs">
            <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
              <tr><TH>Scan Name</TH><TH>Count</TH></tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {(report.topScans||[]).map((s: any, i: number) => (
                <tr key={i} className="hover:bg-[var(--bg-main)]">
                  <TD className="text-[var(--text-primary)]">{i+1}. {s.scanName}</TD>
                  <TD className="font-bold text-[var(--text-primary)]">{s.count}</TD>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      </div>
    );
  };

  const renderProcedureReport = () => {
    const report = procedureReport as any;
    if (!report) return <EmptyState message="No procedure data available" />;
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatCard label="Total Procedures" value={report.summary?.totalProcedures||0}      icon={Scissors}   color="cyan"  />
          <StatCard label="Completed"        value={report.summary?.byStatus?.completed||0}  icon={CheckCircle}color="green" />
          <StatCard label="Scheduled"        value={report.summary?.byStatus?.scheduled||0}  icon={Calendar}   color="cyan"  />
          {/* FIXED: removed 'Avg Duration' — ProcedureReport.averageDuration is not computed in the service */}
        </div>
        <SectionCard title="Top Procedures" icon={Scissors}>
          <table className="w-full text-xs">
            <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
              <tr><TH>Procedure Name</TH><TH>Count</TH></tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {(report.topProcedures||[]).map((p: any, i: number) => (
                <tr key={i} className="hover:bg-[var(--bg-main)]">
                  <TD className="text-[var(--text-primary)]">{i+1}. {p.procedureName}</TD>
                  <TD className="font-bold text-[var(--text-primary)]">{p.count}</TD>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      </div>
    );
  };

  const renderMedicationReport = () => {
    const report = medicationReport as any;
    if (!report) return <EmptyState message="No medication data available" />;
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total Medications"  value={report.summary?.totalMedications||0}    icon={Syringe}    color="green" />
          <StatCard label="Dispensed"          value={report.summary?.byStatus?.dispensed||0} icon={CheckCircle}color="green" />
          <StatCard label="Administered"       value={report.summary?.byStatus?.administered||0}icon={Activity} color="cyan"  />
          <StatCard label="Total Quantity"     value={report.summary?.totalQuantity||0}        icon={Package}   color="cyan"  />
        </div>
        <SectionCard title="Top Medications" icon={Syringe}>
          <table className="w-full text-xs">
            <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
              <tr><TH>Medication</TH><TH>Prescriptions</TH></tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {(report.topMedications||[]).map((m: any, i: number) => (
                <tr key={i} className="hover:bg-[var(--bg-main)]">
                  {/* FIXED: service returns drugName not medicationName */}
                  <TD className="text-[var(--text-primary)]">{i+1}. {m.drugName || m.medicationName}</TD>
                  <TD className="font-bold text-[var(--text-primary)]">{m.count}</TD>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      </div>
    );
  };

  const renderVitalsReport = () => {
    const report = vitalsReport as any;
    if (!report) return <EmptyState message="No vitals data available" />;
    const abn = report.summary?.abnormalFindings||{};
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* FIXED: service returns totalVitals not totalVitalsRecords */}
          <StatCard label="Total Records"   value={report.summary?.totalVitals||0}    icon={Activity}     color="cyan"   />
          <StatCard label="Unique Patients" value={report.summary?.uniquePatients||0} icon={Users}        color="cyan"   />
          <StatCard label="Hypertension"    value={abn.hypertension||0}               icon={AlertTriangle}color="red"    />
          <StatCard label="Fever"           value={abn.fever||0}                      icon={AlertTriangle}color="orange" />
        </div>
        <SectionCard title="Abnormal Findings Summary" icon={AlertTriangle}>
          <div className="p-4 grid grid-cols-2 gap-3">
            {[
              {l:'Hypertension', v:abn.hypertension||0, cls:'text-[var(--icon-red-text)]'},
              {l:'Fever (>38°C)',  v:abn.fever||0,        cls:'text-[var(--icon-red-text)]'},
              {l:'Tachycardia',   v:abn.tachycardia||0,  cls:'text-[var(--icon-yellow-text)]'},
              {l:'Bradycardia',   v:abn.bradycardia||0,  cls:'text-[var(--icon-cyan-text)]'},
              {l:'Hypoxia',       v:abn.hypoxia||0,      cls:'text-[var(--icon-purple-text)]'},
            ].map(({l,v,cls}) => (
              <div key={l} className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)]">{l}</span>
                <span className={`font-bold ${cls}`}>{v}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    );
  };

  const renderInsuranceClaimsReport = () => {
    const report = insuranceClaimsReport as any;
    if (!report) return <EmptyState message="No insurance claims data available" />;
    // FIXED: service returns 'summary' not 'totals'
    const s = report.summary || report.totals || {};
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <StatCard label="Total Claims"       value={s.totalClaims||0}                                    icon={FileText}   color="cyan"  />
          <StatCard label="Total Claim Amount" value={`GHS ${(s.totalClaimAmount||0).toLocaleString()}`}   icon={DollarSign} color="yellow"/>
          <StatCard label="Total Paid"         value={`GHS ${(s.totalPaidAmount||0).toLocaleString()}`}    icon={CheckCircle}color="green" />
        </div>
      </div>
    );
  };

  const renderReportContent = () => {
    const map: Record<string, () => React.ReactNode> = {
      'consulting-room-register': renderConsultingRoomRegister,
      'nhis-expiry':              renderNhisExpiryReport,
      'nhis-claims':              renderNhisClaimsSummary,
      'opd-attendance':           renderOPDAttendanceReport,
      'opd-morbidity':            renderFullMorbidityReport,
      'top-diagnoses':            renderTopDiagnoses,
      'form-a':                   renderFormAReport,
      'ipd':                      renderIPDReport,
      'malaria':                  renderMalariaReport,
      'idsr':                     renderIDSRReport,
      'family-planning':          renderFamilyPlanningReport,
      'demographic':              renderDemographicReport,
      'financial':                renderFinancialReport,
      'insurance':                renderInsuranceClaimsReport,
      'attendance':               renderAttendanceReport,
      'revenue':                  renderRevenueReport,
      'lab':                      renderLabReport,
      'scans':                    renderScanReport,
      'procedures':               renderProcedureReport,
      'medications':              renderMedicationReport,
      'vitals':                   renderVitalsReport,
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
          <button onClick={loadReport} disabled={isLoading_}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-all text-xs font-medium disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading_ ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Category tabs */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-1 flex gap-1">
        {categories.map(({ id, label, icon: Icon }) => (
          <button key={id}
            onClick={() => { setActiveCategory(id as any); const first = reportItems[id as keyof typeof reportItems]?.[0]?.key; if (first) setReportType(first); }}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${activeCategory === id ? 'bg-[var(--icon-cyan-text)] text-white shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)]'}`}>
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>

      {/* Report type pills */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-3">
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