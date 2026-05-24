// src/pages/Reports.tsx - COMPLETE UPDATED VERSION WITH ALL REPORTS
import React, { useState, useEffect, useCallback } from 'react';
import { useReportsStore } from '../store/reportsStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import {
  BarChart3, TrendingUp, Users, DollarSign, FileText, Calendar,
  Download, Activity, Clock, CheckCircle, Baby, Heart, Stethoscope,
  PieChart, UserCheck, Shield, AlertTriangle, Droplet, RefreshCw,
  ArrowLeft, Hospital, Syringe, Scissors, FlaskConical, ListOrdered,
  FileSpreadsheet, ClipboardList, IdCard, AlertCircle, Eye,
  ChevronRight, Search, Printer, Filter, X, Phone, Mail, MapPin,
  CalendarDays, FileWarning, CreditCard, Package
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MalariaReportView } from '../components/reports/MalariaReportView';

// Age groups for GHS Morbidity Report (Full Form A)
const AGE_GROUPS = [
  '<28d', '1-11m', '1-4', '5-9', '10-14', '15-17',
  '18-19', '20-34', '35-49', '50-59', '60-69', '70+'
];

export default function Reports() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [activeCategory, setActiveCategory] = useState<'ghs' | 'clinical' | 'financial' | 'nhis'>('ghs');
  const [reportType, setReportType] = useState<string>('opd-attendance');
  const [activeFormATab, setActiveFormATab] = useState<'antenatal' | 'delivery' | 'postnatal'>('antenatal');
  const [isLoading, setIsLoading] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel' | 'pdf'>('csv');
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);
  const [nhisExpiryDays, setNhisExpiryDays] = useState<number>(30);
  const [nhisExpiryStatus, setNhisExpiryStatus] = useState<string>('all');

  // Store functions
  const {
    // GHS Reports
    getGHSOPDReport,
    getGHSIPDReport,
    getGHSIDSRReport,
    getGHSMalariaReport,
    getGHSFormAReport,
    getFamilyPlanningReport,
    getMorbidityMortalityReport,
    getTopDiagnoses,
    
    // Clinical Reports
    getDemographicReport,
    getFinancialReport,
    getInsuranceClaimsReport,
    getClinicalReport,
    getAttendanceReport,
    getRevenueReport,
    getLabReport,
    getScanReport,
    getProcedureReport,
    getMedicationReport,
    getVitalsReport,
    
    // NHIS Reports
    getNhisExpiryReport,
    getNhisClaimsSummary,
    
    // Export
    exportReport,
    
    // State
    opdReport,
    ipdReport,
    formAReport,
    malariaReport,
    idsrReport,
    familyPlanningReport,
    morbidityMortalityReport,
    topDiagnoses,
    demographicReport,
    financialReport,
    insuranceClaimsReport,
    clinicalReport,
    attendanceReport,
    revenueReport,
    labReport,
    scanReport,
    procedureReport,
    medicationReport,
    vitalsReport,
    nhisExpiryReport,
    nhisClaimsSummary,
    
    isLoading: storeLoading,
  } = useReportsStore();

  // Category configurations
  const categories = [
    { id: 'ghs', label: 'GHS Standard Reports', icon: FileText },
    { id: 'clinical', label: 'Clinical Reports', icon: Activity },
    { id: 'financial', label: 'Financial Reports', icon: DollarSign },
    { id: 'nhis', label: 'NHIS Reports', icon: Shield },
  ];

  // Report items by category
  const reportItems = {
    ghs: [
      { key: 'opd-attendance', label: 'OPD Attendance', icon: Users, color: 'cyan' },
      { key: 'consulting-room-register', label: 'Consulting Room Register', icon: ClipboardList, color: 'teal' },
      { key: 'opd-morbidity', label: 'OPD Morbidity (Full Form A)', icon: FileSpreadsheet, color: 'red' },
      { key: 'top-diagnoses', label: 'Top 10 Diagnoses', icon: ListOrdered, color: 'orange' },
      { key: 'form-a', label: 'Form A (Maternal Health)', icon: Heart, color: 'pink' },
      { key: 'ipd', label: 'IPD & Mortality', icon: Hospital, color: 'purple' },
      { key: 'malaria', label: 'Malaria Data', icon: Droplet, color: 'green' },
      { key: 'idsr', label: 'IDSR (Notifiable)', icon: AlertTriangle, color: 'orange' },
      { key: 'family-planning', label: 'Family Planning', icon: Users, color: 'teal' },
    ],
    clinical: [
      { key: 'demographic', label: 'Demographic Analysis', icon: PieChart, color: 'indigo' },
      { key: 'attendance', label: 'Attendance Patterns', icon: Calendar, color: 'cyan' },
      { key: 'lab', label: 'Laboratory Reports', icon: FlaskConical, color: 'blue' },
      { key: 'scans', label: 'Radiology/Scans', icon: ClipboardList, color: 'indigo' },
      { key: 'procedures', label: 'Procedures', icon: Scissors, color: 'purple' },
      { key: 'medications', label: 'Medications', icon: Syringe, color: 'green' },
      { key: 'vitals', label: 'Vitals & Observations', icon: Activity, color: 'red' },
    ],
    financial: [
      { key: 'financial', label: 'Financial Summary', icon: DollarSign, color: 'green' },
      { key: 'revenue', label: 'Revenue Analysis', icon: TrendingUp, color: 'emerald' },
      { key: 'insurance', label: 'Insurance Claims', icon: Shield, color: 'purple' },
    ],
    nhis: [
      { key: 'nhis-expiry', label: 'NHIS Membership Expiry', icon: CalendarDays, color: 'orange' },
      { key: 'nhis-claims', label: 'NHIS Claims Summary', icon: CreditCard, color: 'blue' },
    ],
  };

  const setDatePreset = (preset: 'month' | 'quarter' | 'year') => {
    const end = new Date();
    let start = new Date();
    switch (preset) {
      case 'month':
        start = new Date(end.getFullYear(), end.getMonth(), 1);
        break;
      case 'quarter':
        start = new Date(end.getFullYear(), Math.floor(end.getMonth() / 3) * 3, 1);
        break;
      case 'year':
        start = new Date(end.getFullYear(), 0, 1);
        break;
    }
    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    });
  };

  const loadReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters = { startDate: dateRange.start, endDate: dateRange.end };
      
      switch (reportType) {
        // GHS Reports
        case 'opd-attendance': await getGHSOPDReport(filters); break;
        case 'opd-morbidity': await getMorbidityMortalityReport(filters); break;
        case 'top-diagnoses': await getTopDiagnoses(filters, 10); break;
        case 'form-a': await getGHSFormAReport(filters); break;
        case 'ipd': await getGHSIPDReport(filters); break;
        case 'malaria': await getGHSMalariaReport(filters); break;
        case 'idsr': await getGHSIDSRReport(filters); break;
        case 'family-planning': await getFamilyPlanningReport(filters); break;
        
        // Clinical Reports
        case 'demographic': await getDemographicReport(filters); break;
        case 'financial': await getFinancialReport(filters); break;
        case 'insurance': await getInsuranceClaimsReport(filters); break;
        case 'clinical-stats': await getClinicalReport(filters); break;
        case 'attendance': await getAttendanceReport(filters); break;
        case 'revenue': await getRevenueReport(filters); break;
        case 'lab': await getLabReport(filters); break;
        case 'scans': await getScanReport(filters); break;
        case 'procedures': await getProcedureReport(filters); break;
        case 'medications': await getMedicationReport(filters); break;
        case 'vitals': await getVitalsReport(filters); break;
        
        // NHIS Reports
        case 'nhis-expiry': 
          await getNhisExpiryReport({ daysThreshold: nhisExpiryDays, startDate: dateRange.start, endDate: dateRange.end }); 
          break;
        case 'nhis-claims': 
          await getNhisClaimsSummary({ startDate: dateRange.start, endDate: dateRange.end, expiryStatus: nhisExpiryStatus !== 'all' ? nhisExpiryStatus : undefined }); 
          break;
      }
      setGeneratedAt(new Date());
    } catch (err: any) {
      toastError('Report Error', err.message || 'Failed to generate report');
    } finally {
      setIsLoading(false);
    }
  }, [reportType, dateRange, nhisExpiryDays, nhisExpiryStatus]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleExport = async () => {
    try {
      const activeReport = getActiveReport();
      if (!activeReport) {
        toastError('Export Failed', 'No report data available');
        return;
      }
      await exportReport({
        reportType,
        format: exportFormat,
        filters: { startDate: dateRange.start, endDate: dateRange.end },
        data: activeReport
      });
      success('Export Started', `Report is being generated as ${exportFormat.toUpperCase()}`);
    } catch (err: any) {
      toastError('Export Failed', err.message || 'Could not export report');
    }
  };

  const getActiveReport = () => {
    switch (reportType) {
      case 'opd-attendance': return opdReport;
      case 'opd-morbidity': return morbidityMortalityReport;
      case 'top-diagnoses': return topDiagnoses;
      case 'form-a': return formAReport;
      case 'ipd': return ipdReport;
      case 'malaria': return malariaReport;
      case 'idsr': return idsrReport;
      case 'family-planning': return familyPlanningReport;
      case 'demographic': return demographicReport;
      case 'financial': return financialReport;
      case 'insurance': return insuranceClaimsReport;
      case 'attendance': return attendanceReport;
      case 'revenue': return revenueReport;
      case 'lab': return labReport;
      case 'scans': return scanReport;
      case 'procedures': return procedureReport;
      case 'medications': return medicationReport;
      case 'vitals': return vitalsReport;
      case 'nhis-expiry': return nhisExpiryReport;
      case 'nhis-claims': return nhisClaimsSummary;
      default: return null;
    }
  };

  const isLoading_ = isLoading || storeLoading;

  const getReportTitle = () => {
    const titles: Record<string, string> = {
      'opd-attendance': 'OPD Attendance Report',
      'consulting-room-register': 'Consulting Room Register',
      'opd-morbidity': 'OPD Morbidity Report (GHS Form A)',
      'top-diagnoses': 'Top 10 Diagnoses',
      'form-a': 'GHS Form A - Maternal Health Report',
      'ipd': 'IPD & Mortality Report',
      'malaria': 'Malaria Data Report',
      'idsr': 'IDSR Notifiable Diseases Report',
      'family-planning': 'Family Planning Report',
      'demographic': 'Demographic Analysis Report',
      'financial': 'Financial Summary Report',
      'insurance': 'Insurance Claims Report',
      'attendance': 'Attendance Patterns Report',
      'revenue': 'Revenue Analysis Report',
      'lab': 'Laboratory Report',
      'scans': 'Radiology/Scans Report',
      'procedures': 'Procedures Report',
      'medications': 'Medications Report',
      'vitals': 'Vitals & Observations Report',
      'nhis-expiry': 'NHIS Membership Expiry Report',
      'nhis-claims': 'NHIS Claims Summary Report',
    };
    return titles[reportType] || 'Report';
  };

  // ==================== STAT CARD COMPONENT ====================
  const StatCard = ({ label, value, icon: Icon, color, subtext }: any) => (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-5">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--icon-${color}-bg)]`}>
          <Icon className={`w-5 h-5 text-[var(--icon-${color}-text)]`} />
        </div>
        <span className="text-[var(--text-secondary)] text-xs font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold text-[var(--text-primary)]">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      {subtext && <p className="text-xs text-[var(--text-tertiary)] mt-1">{subtext}</p>}
    </div>
  );

  const TableCard = ({ title, icon: Icon, children }: any) => (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
        <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Icon className="w-5 h-5 text-[var(--icon-cyan-text)]" />
          {title}
        </h2>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">
          From {dateRange.start} to {dateRange.end}
        </p>
      </div>
      <div className="overflow-x-auto">
        {children}
      </div>
    </div>
  );

  // ==================== CONSULTING ROOM REGISTER ====================
  const renderConsultingRoomRegister = () => {
    const report = opdReport as any;
    if (!report) return <EmptyState message="No consulting room register data available for this period" />;

    const entries = report.entries || [];
    
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Patients" value={report.summary?.totalPatients || 0} icon={Users} color="cyan" />
          <StatCard label="New Patients" value={report.summary?.newPatients || 0} icon={UserCheck} color="green" />
          <StatCard label="NHIS Patients" value={report.summary?.nhisPatients || 0} icon={Shield} color="blue" />
          <StatCard label="Pregnant Women" value={report.summary?.pregnantWomen || 0} icon={Baby} color="pink" />
        </div>

        <TableCard title="Consulting Room Register - Daily Patient Log" icon={ClipboardList}>
          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[var(--bg-main)] border-b border-[var(--border-color)] z-10">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Date</th>
                  <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Patient No</th>
                  <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">NHIS No</th>
                  <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Name</th>
                  <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Age</th>
                  <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Sex</th>
                  <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Provisional Diagnosis</th>
                  <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Lab Tests</th>
                  <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Drugs Prescribed</th>
                  <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">NHIS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {entries.slice(0, 100).map((entry: any, idx: number) => (
                  <tr key={idx} className="hover:bg-[var(--bg-main)]">
                    <td className="px-3 py-2 text-[var(--text-secondary)] whitespace-nowrap">{entry.date}</td>
                    <td className="px-3 py-2 font-mono text-[var(--text-primary)]">{entry.patientNo}</td>
                    <td className="px-3 py-2 font-mono text-[var(--text-secondary)]">{entry.nhisNo || '-'}</td>
                    <td className="px-3 py-2 text-[var(--text-primary)]">{entry.patientName}</td>
                    <td className="px-3 py-2 text-[var(--text-secondary)]">{entry.age}</td>
                    <td className="px-3 py-2 text-[var(--text-secondary)]">{entry.sex === 'male' ? 'M' : 'F'}</td>
                    <td className="px-3 py-2 text-[var(--text-secondary)] max-w-[200px] truncate">{entry.provisionalDiagnosis || '-'}</td>
                    <td className="px-3 py-2 text-[var(--text-secondary)] max-w-[150px] truncate">{entry.labTestsRequested || '-'}</td>
                    <td className="px-3 py-2 text-[var(--text-secondary)] max-w-[200px] truncate">{entry.drugsPrescribed || '-'}</td>
                    <td className="px-3 py-2 text-center">
                      {entry.isNHIS ? <span className="text-green-600 font-bold">Y</span> : <span className="text-gray-400">N</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TableCard>
        
        {entries.length > 100 && (
          <p className="text-xs text-[var(--text-tertiary)] text-center">Showing first 100 of {entries.length} entries</p>
        )}
      </div>
    );
  };

  // ==================== NHIS EXPIRY REPORT ====================
  const renderNhisExpiryReport = () => {
    const report = nhisExpiryReport as any;
    if (!report) return <EmptyState message="No NHIS expiry data available for this period" />;

    const summary = report.summary || {};
    const patients = report.patients || [];

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'EXPIRED': return 'bg-red-100 text-red-800';
        case 'CRITICAL': return 'bg-orange-100 text-orange-800';
        case 'WARNING': return 'bg-yellow-100 text-yellow-800';
        case 'HEALTHY': return 'bg-green-100 text-green-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    };

    return (
      <div className="space-y-5">
        {/* Filter controls */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[var(--text-secondary)]" />
              <span className="text-sm font-medium text-[var(--text-primary)]">Days threshold:</span>
            </div>
            <select 
              value={nhisExpiryDays} 
              onChange={(e) => setNhisExpiryDays(parseInt(e.target.value))}
              className="px-3 py-1.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg"
            >
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
            </select>
            <button 
              onClick={() => loadReport()}
              className="px-3 py-1.5 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg text-sm"
            >
              Apply
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard label="Total NHIS Patients" value={summary.totalNHISPatients || 0} icon={Users} color="cyan" />
          <StatCard label="Expired" value={summary.expired || 0} icon={AlertTriangle} color="red" />
          <StatCard label="Critical (0-7 days)" value={summary.critical || 0} icon={AlertCircle} color="orange" />
          <StatCard label="Warning (8-30 days)" value={summary.warning || 0} icon={AlertTriangle} color="yellow" />
          <StatCard label="Healthy" value={summary.healthy || 0} icon={CheckCircle} color="green" />
        </div>

        {/* Patients Table */}
        <TableCard title="NHIS Memberships - Expiry Status" icon={CalendarDays}>
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Folder No</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Patient Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">NHIS Number</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Expiry Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Days Left</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Last Visit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {patients.map((patient: any, idx: number) => (
                <tr key={idx} className="hover:bg-[var(--bg-main)] transition-colors">
                  <td className="px-4 py-3 font-mono text-[var(--text-primary)]">{patient.folderNumber}</td>
                  <td className="px-4 py-3 text-[var(--text-primary)]">{patient.fullName}</td>
                  <td className="px-4 py-3 font-mono text-[var(--text-secondary)]">{patient.nhisNumber || '-'}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{patient.phoneNumber || patient.contact || '-'}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{patient.nhisExpiryDate ? new Date(patient.nhisExpiryDate).toLocaleDateString() : '-'}</td>
                  <td className="px-4 py-3 font-bold">
                    {patient.daysUntilExpiry !== null ? (
                      <span className={patient.daysUntilExpiry <= 0 ? 'text-red-600' : patient.daysUntilExpiry <= 7 ? 'text-orange-600' : patient.daysUntilExpiry <= 30 ? 'text-yellow-600' : 'text-green-600'}>
                        {patient.daysUntilExpiry <= 0 ? 'Expired' : `${patient.daysUntilExpiry} days`}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(patient.expiryStatus)}`}>
                      {patient.expiryStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">
                    {patient.lastVisit ? new Date(patient.lastVisit).toLocaleDateString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      </div>
    );
  };

  // ==================== NHIS CLAIMS SUMMARY ====================
  const renderNhisClaimsSummary = () => {
    const report = nhisClaimsSummary as any;
    if (!report) return <EmptyState message="No NHIS claims data available for this period" />;

    const summary = report.summary || {};
    const claims = report.claims || [];
    const byExpiryStatus = summary.byExpiryStatus || {};

    const getExpiryStatusColor = (status: string) => {
      switch (status) {
        case 'EXPIRED': return 'text-red-600 bg-red-50';
        case 'CRITICAL': return 'text-orange-600 bg-orange-50';
        case 'WARNING': return 'text-yellow-600 bg-yellow-50';
        case 'ACTIVE': return 'text-green-600 bg-green-50';
        default: return 'text-gray-600 bg-gray-50';
      }
    };

    return (
      <div className="space-y-5">
        {/* Filter controls */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[var(--text-secondary)]" />
              <span className="text-sm font-medium text-[var(--text-primary)]">Expiry Status:</span>
            </div>
            <select 
              value={nhisExpiryStatus} 
              onChange={(e) => setNhisExpiryStatus(e.target.value)}
              className="px-3 py-1.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg"
            >
              <option value="all">All</option>
              <option value="ACTIVE">Active</option>
              <option value="WARNING">Warning (31-60 days)</option>
              <option value="CRITICAL">Critical (0-30 days)</option>
              <option value="EXPIRED">Expired</option>
            </select>
            <button 
              onClick={() => loadReport()}
              className="px-3 py-1.5 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg text-sm"
            >
              Apply Filter
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total NHIS Claims" value={summary.totalClaims || 0} icon={FileText} color="cyan" />
          <StatCard label="Total Claim Amount" value={`GHS ${(summary.totalClaimAmount || 0).toLocaleString()}`} icon={DollarSign} color="green" />
          <StatCard label="Active Members" value={byExpiryStatus.ACTIVE || 0} icon={CheckCircle} color="green" />
          <StatCard label="Expired Members" value={byExpiryStatus.EXPIRED || 0} icon={AlertTriangle} color="red" />
        </div>

        {/* By Expiry Status Breakdown */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="p-3 bg-green-50 rounded-lg text-center border border-green-200">
            <p className="text-xs text-green-600">Active Claims</p>
            <p className="text-2xl font-bold text-green-700">{byExpiryStatus.ACTIVE || 0}</p>
          </div>
          <div className="p-3 bg-yellow-50 rounded-lg text-center border border-yellow-200">
            <p className="text-xs text-yellow-600">Warning</p>
            <p className="text-2xl font-bold text-yellow-700">{byExpiryStatus.WARNING || 0}</p>
          </div>
          <div className="p-3 bg-orange-50 rounded-lg text-center border border-orange-200">
            <p className="text-xs text-orange-600">Critical</p>
            <p className="text-2xl font-bold text-orange-700">{byExpiryStatus.CRITICAL || 0}</p>
          </div>
          <div className="p-3 bg-red-50 rounded-lg text-center border border-red-200">
            <p className="text-xs text-red-600">Expired</p>
            <p className="text-2xl font-bold text-red-700">{byExpiryStatus.EXPIRED || 0}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg text-center border border-gray-200">
            <p className="text-xs text-gray-600">Unknown</p>
            <p className="text-2xl font-bold text-gray-700">{byExpiryStatus.UNKNOWN || 0}</p>
          </div>
        </div>

        {/* Claims Table */}
        <TableCard title="NHIS Claims with Expiry Status" icon={CreditCard}>
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Claim #</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Patient</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">NHIS #</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Expiry Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-secondary)]">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Submission Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {claims.slice(0, 50).map((claim: any, idx: number) => (
                <tr key={idx} className="hover:bg-[var(--bg-main)] transition-colors">
                  <td className="px-4 py-3 font-mono text-[var(--text-primary)]">{claim.claimNumber}</td>
                  <td className="px-4 py-3 text-[var(--text-primary)]">{claim.patientName}</td>
                  <td className="px-4 py-3 font-mono text-[var(--text-secondary)]">{claim.nhisNumber || '-'}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">
                    {claim.nhisExpiryDate ? new Date(claim.nhisExpiryDate).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getExpiryStatusColor(claim.nhisExpiryStatus)}`}>
                      {claim.nhisExpiryStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-[var(--text-primary)]">
                    GHS {claim.totalClaimAmount?.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">
                    {claim.submissionDate ? new Date(claim.submissionDate).toLocaleDateString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
        
        {claims.length > 50 && (
          <p className="text-xs text-[var(--text-tertiary)] text-center">Showing first 50 of {claims.length} claims</p>
        )}
      </div>
    );
  };

  // ==================== OPD ATTENDANCE REPORT ====================
  const renderOPDAttendanceReport = () => {
    const report = opdReport as any;
    if (!report) return <EmptyState message="No OPD attendance data available for this period" />;
  
    const ageGroups = report.ageGroups || {};
    const totals = report.totals || {};
  
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Attendances" value={totals.totalAttendances || 0} icon={Users} color="cyan" />
          <StatCard label="New Cases" value={totals.new || 0} icon={UserCheck} color="green" />
          <StatCard label="Re-Attendances" value={totals.old || 0} icon={Clock} color="yellow" />
          <StatCard label="Insured Patients" value={totals.insured?.total || 0} icon={Shield} color="blue" />
        </div>
  
        <TableCard title="Age Group Distribution (OPD Attendance)" icon={Users}>
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Age Group</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-secondary)]" colSpan={2}>Insured</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-secondary)]" colSpan={2}>Non-Insured</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-secondary)]">New</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-secondary)]">Old</th>
              </tr>
              <tr className="bg-[var(--bg-main)]">
                <th className="px-4 py-2"></th>
                <th className="px-4 py-2 text-center text-xs text-[var(--text-tertiary)]">Male</th>
                <th className="px-4 py-2 text-center text-xs text-[var(--text-tertiary)]">Female</th>
                <th className="px-4 py-2 text-center text-xs text-[var(--text-tertiary)]">Male</th>
                <th className="px-4 py-2 text-center text-xs text-[var(--text-tertiary)]">Female</th>
                <th className="px-4 py-2"></th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {Object.entries(ageGroups).map(([group, data]: [string, any]) => (
                <tr key={group} className="hover:bg-[var(--bg-main)] transition-colors">
                  <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{group}</td>
                  <td className="px-4 py-3 text-center text-[var(--text-secondary)]">{data?.insured?.male || 0}</td>
                  <td className="px-4 py-3 text-center text-[var(--text-secondary)]">{data?.insured?.female || 0}</td>
                  <td className="px-4 py-3 text-center text-[var(--text-secondary)]">{data?.nonInsured?.male || 0}</td>
                  <td className="px-4 py-3 text-center text-[var(--text-secondary)]">{data?.nonInsured?.female || 0}</td>
                  <td className="px-4 py-3 text-center text-[var(--text-secondary)]">{data?.new || 0}</td>
                  <td className="px-4 py-3 text-center text-[var(--text-secondary)]">{data?.old || 0}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-[var(--bg-main)] border-t border-[var(--border-color)] font-semibold">
              <tr>
                <td className="px-4 py-3 text-[var(--text-primary)]">TOTAL</td>
                <td className="px-4 py-3 text-center text-[var(--text-primary)]">{totals.insured?.male || 0}</td>
                <td className="px-4 py-3 text-center text-[var(--text-primary)]">{totals.insured?.female || 0}</td>
                <td className="px-4 py-3 text-center text-[var(--text-primary)]">{totals.nonInsured?.male || 0}</td>
                <td className="px-4 py-3 text-center text-[var(--text-primary)]">{totals.nonInsured?.female || 0}</td>
                <td className="px-4 py-3 text-center text-[var(--text-primary)]">{totals.new || 0}</td>
                <td className="px-4 py-3 text-center text-[var(--text-primary)]">{totals.old || 0}</td>
              </tr>
            </tfoot>
          </table>
        </TableCard>
      </div>
    );
  };

  // ==================== DISEASE TABLE FOR MORBIDITY REPORT ====================
  const renderDiseaseTable = (title: string, data: Record<string, any>, diseaseLabels: Record<string, string>) => {
    const entries = Object.entries(diseaseLabels).filter(([key]) => data && data[key]);
    if (entries.length === 0) return null;

    const columnTotals: Record<string, { male: number; female: number }> = {};
    AGE_GROUPS.forEach(age => { columnTotals[age] = { male: 0, female: 0 }; });

    entries.forEach(([key]) => {
      const rowData = data[key];
      if (rowData) {
        AGE_GROUPS.forEach(age => {
          if (rowData[age]) {
            columnTotals[age].male += rowData[age].male || 0;
            columnTotals[age].female += rowData[age].female || 0;
          }
        });
      }
    });

    return (
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden mb-6">
        <div className="px-4 py-3 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
          <h3 className="font-bold text-[var(--text-primary)] text-lg">{title}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-[var(--bg-main)] sticky top-0">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] sticky left-0 bg-[var(--bg-main)] z-10 min-w-[200px]">
                  Disease/Condition
                </th>
                {AGE_GROUPS.map(age => (
                  <th key={`${age}-header`} colSpan={2} className="px-1 py-2 text-center text-xs font-semibold text-[var(--text-secondary)] border-x border-[var(--border-color)] min-w-[60px]">
                    {age}
                  </th>
                ))}
                <th colSpan={2} className="px-2 py-2 text-center text-xs font-semibold text-[var(--text-secondary)] bg-[var(--bg-hover)]">
                  Total
                </th>
              </tr>
              <tr className="border-b border-[var(--border-color)]">
                <th className="px-3 py-2 text-left text-xs text-[var(--text-tertiary)] sticky left-0 bg-[var(--bg-main)]"></th>
                {AGE_GROUPS.map(age => (
                  <React.Fragment key={`${age}-sub`}>
                    <th className="px-1 py-1 text-center text-[10px] text-[var(--text-tertiary)]">M</th>
                    <th className="px-1 py-1 text-center text-[10px] text-[var(--text-tertiary)]">F</th>
                  </React.Fragment>
                ))}
                <th className="px-2 py-1 text-center text-[10px] text-[var(--text-tertiary)] bg-[var(--bg-hover)]">M</th>
                <th className="px-2 py-1 text-center text-[10px] text-[var(--text-tertiary)] bg-[var(--bg-hover)]">F</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {entries.map(([key, label]) => {
                const rowData = data[key];
                if (!rowData) return null;
                let totalMale = 0, totalFemale = 0;
                return (
                  <tr key={key} className="hover:bg-[var(--bg-main)] transition-colors">
                    <td className="px-3 py-2 text-sm text-[var(--text-primary)] font-medium sticky left-0 bg-[var(--bg-card)]">
                      {label}
                    </td>
                    {AGE_GROUPS.map(age => {
                      const maleCount = rowData[age]?.male || 0;
                      const femaleCount = rowData[age]?.female || 0;
                      totalMale += maleCount;
                      totalFemale += femaleCount;
                      return (
                        <React.Fragment key={`${key}-${age}`}>
                          <td className="px-1 py-2 text-center text-sm text-[var(--text-secondary)]">
                            {maleCount > 0 ? maleCount : '-'}
                          </td>
                          <td className="px-1 py-2 text-center text-sm text-[var(--text-secondary)]">
                            {femaleCount > 0 ? femaleCount : '-'}
                          </td>
                        </React.Fragment>
                      );
                    })}
                    <td className="px-2 py-2 text-center text-sm font-semibold text-[var(--text-primary)] bg-[var(--bg-hover)]">
                      {totalMale > 0 ? totalMale : '-'}
                    </td>
                    <td className="px-2 py-2 text-center text-sm font-semibold text-[var(--text-primary)] bg-[var(--bg-hover)]">
                      {totalFemale > 0 ? totalFemale : '-'}
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-[var(--bg-main)] font-semibold border-t-2 border-[var(--border-color)]">
                <td className="px-3 py-2 text-sm font-bold text-[var(--text-primary)] sticky left-0 bg-[var(--bg-main)]">TOTAL</td>
                {AGE_GROUPS.map(age => (
                  <React.Fragment key={`total-${age}`}>
                    <td className="px-1 py-2 text-center text-sm font-bold text-[var(--text-primary)]">{columnTotals[age]?.male || 0}</td>
                    <td className="px-1 py-2 text-center text-sm font-bold text-[var(--text-primary)]">{columnTotals[age]?.female || 0}</td>
                  </React.Fragment>
                ))}
                <td className="px-2 py-2 text-center text-sm font-bold text-[var(--text-primary)] bg-[var(--bg-hover)]">
                  {Object.values(columnTotals).reduce((sum, age) => sum + age.male, 0)}
                </td>
                <td className="px-2 py-2 text-center text-sm font-bold text-[var(--text-primary)] bg-[var(--bg-hover)]">
                  {Object.values(columnTotals).reduce((sum, age) => sum + age.female, 0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ==================== FULL MORBIDITY REPORT ====================
  const renderFullMorbidityReport = () => {
    const report = morbidityMortalityReport as any;
    if (!report) return <EmptyState message="No morbidity data available for this period" />;

    const immunizableDiseases = {
      afp_polio: 'AFP / Polio',
      meningitis: 'Meningitis',
      neonatal_tetanus: 'Neonatal Tetanus',
      pertussis_whooping_cough: 'Pertussis (Whooping Cough)',
      diphtheria: 'Diphtheria',
      measles: 'Measles',
      yellow_fever: 'Yellow Fever',
      tetanus: 'Tetanus',
      tuberculosis: 'Tuberculosis'
    };

    const nonImmunizableDiseases = {
      uncomplicated_malaria_suspected: 'Uncomplicated Malaria - Suspected',
      uncomplicated_malaria_tested: 'Uncomplicated Malaria - Tested',
      uncomplicated_malaria_positive: 'Uncomplicated Malaria - Positive',
      severe_malaria_lab_confirmed: 'Severe Malaria - Lab Confirmed',
      typhoid_fever: 'Typhoid Fever',
      suspected_cholera: 'Suspected Cholera',
      diarrhoea_diseases: 'Diarrhoea Diseases',
      viral_hepatitis: 'Viral Hepatitis',
      pneumonia: 'Pneumonia',
      upper_respiratory_tract_infections: 'Upper Respiratory Tract Infections'
    };

    const ncdDiseases = {
      malnutrition: 'Malnutrition',
      obesity: 'Obesity',
      anaemia: 'Anaemia',
      hypertension: 'Hypertension',
      cardiac_diseases: 'Cardiac Diseases',
      stroke: 'Stroke',
      diabetes_mellitus: 'Diabetes Mellitus',
      asthma: 'Asthma',
      sickle_cell_disease: 'Sickle Cell Disease'
    };

    const mentalHealthDiseases = {
      depression: 'Depression',
      epilepsy: 'Epilepsy',
      schizophrenia: 'Schizophrenia',
      substance_abuse: 'Substance Abuse'
    };

    const injuriesList = {
      transport_injuries_road_traffic_accidents: 'Road Traffic Accidents',
      home_injuries: 'Home Injuries',
      burns: 'Burns',
      snake_bite: 'Snake Bite',
      domestic_violence: 'Domestic Violence'
    };

    const totals = report.totals || {};

    return (
      <div className="space-y-6">
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-6">
          <div className="text-center">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">GHANA HEALTH SERVICE</h2>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mt-1">OPD MORBIDITY REPORT (FORM A)</h3>
            <div className="mt-2 text-sm text-[var(--text-secondary)]">
              <p>{report.facility?.name}</p>
              <p>District: {report.facility?.district} | GHF Code: {report.facility?.ghfCode}</p>
              <p>Reporting Period: {report.period?.startDate?.split('T')[0]} to {report.period?.endDate?.split('T')[0]}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Attendances" value={totals.totalAttendances || 0} icon={Users} color="cyan" />
          <StatCard label="New Cases" value={totals.totalNewCases || 0} icon={UserCheck} color="green" />
          <StatCard label="Re-Attendances" value={totals.totalReAttendances || 0} icon={Clock} color="yellow" />
          <StatCard label="Referrals" value={totals.totalReferrals || 0} icon={Shield} color="purple" />
        </div>

        {renderDiseaseTable('SECTION 1: COMMUNICABLE IMMUNIZABLE', report.communicableImmunizable, immunizableDiseases)}
        {renderDiseaseTable('SECTION 2: COMMUNICABLE NON-IMMUNIZABLE', report.communicableNonImmunizable, nonImmunizableDiseases)}
        {renderDiseaseTable('SECTION 3: NON-COMMUNICABLE DISEASES', report.nonCommunicable, ncdDiseases)}
        {renderDiseaseTable('SECTION 4: MENTAL HEALTH', report.mentalHealth, mentalHealthDiseases)}
        {renderDiseaseTable('SECTION 5: SPECIALIZED CONDITIONS', report.specializedConditions, {})}
        {renderDiseaseTable('SECTION 6: OBSTETRICS & GYNAECOLOGY', report.obstetricsGynaecology, {})}
        {renderDiseaseTable('SECTION 7: REPRODUCTIVE TRACT', report.reproductiveTract, {})}
        {renderDiseaseTable('SECTION 8: INJURIES', report.injuries, injuriesList)}
        {renderDiseaseTable('SECTION 9: RE-ATTENDANCES & REFERRALS', report.reAttendancesReferrals, {
          re_attendances: 'Re-Attendances',
          referrals: 'Referrals'
        })}

        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-4 text-center">
          <p className="text-xs text-[var(--text-tertiary)]">
            Generated on {new Date().toLocaleString()} | GHS OPD Morbidity Report (Form A)
          </p>
        </div>
      </div>
    );
  };

  // ==================== TOP 10 DIAGNOSES ====================
  const renderTopDiagnoses = () => {
    const diagnoses = topDiagnoses as any[];
    if (!diagnoses || diagnoses.length === 0) {
      return <EmptyState message="No diagnosis data available for this period" />;
    }

    return (
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
          <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <ListOrdered className="w-5 h-5 text-[var(--icon-orange-text)]" />
            Top 10 Diagnoses
          </h2>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">
            From {dateRange.start} to {dateRange.end}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Rank</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Diagnosis Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">ICD Code</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Morbidity Group</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-secondary)]">Male</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-secondary)]">Female</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-secondary)]">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {/* FIX 1: corrected .map() — added opening parenthesis around parameters */}
              {diagnoses.map((diag: any, idx: number) => (
                <tr key={diag.diagnosisId || idx} className="hover:bg-[var(--bg-main)] transition-colors">
                  <td className="px-4 py-3 font-bold text-[var(--icon-orange-text)]">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{diag.diagnosisName || diag.name}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{diag.icdCode || '-'}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-full text-xs bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]">
                      {diag.morbidityGroup?.replace(/_/g, ' ') || 'General'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-[var(--text-secondary)]">{diag.male || 0}</td>
                  <td className="px-4 py-3 text-center text-[var(--text-secondary)]">{diag.female || 0}</td>
                  <td className="px-4 py-3 text-center font-bold text-[var(--text-primary)]">{diag.totalCases || 0}</td>
                </tr>
                /* FIX 2: changed stray <tr> to </tr> closing tag */
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ==================== FORM A REPORT ====================
  const renderFormAReport = () => {
    const report = formAReport as any;
    if (!report) return <EmptyState message="No Form A data available for this period" />;

    return (
      <div className="space-y-6">
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-6 text-center">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">GHANA HEALTH SERVICE</h2>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mt-1">FORM A: MATERNAL HEALTH REPORT</h3>
          <p className="text-sm text-[var(--text-secondary)] mt-2">{report.facility?.name}</p>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">
            {report.period?.monthName} {report.period?.year} ({report.period?.startDate?.split('T')[0]} to {report.period?.endDate?.split('T')[0]})
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="ANC Registrants" value={report.antenatal?.newRegistrants || 0} icon={UserCheck} color="green" />
          <StatCard label="Total Deliveries" value={report.delivery?.totalDeliveries || 0} icon={Baby} color="cyan" />
          <StatCard label="Live Births" value={report.delivery?.liveBirths || 0} icon={Heart} color="pink" />
          <StatCard label="PNC Visits" value={report.postnatal?.totalVisits || 0} icon={Activity} color="purple" />
        </div>

        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-1 flex gap-1">
          <button onClick={() => setActiveFormATab('antenatal')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeFormATab === 'antenatal' ? 'bg-pink-500 text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-main)]'}`}>Antenatal</button>
          <button onClick={() => setActiveFormATab('delivery')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeFormATab === 'delivery' ? 'bg-pink-500 text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-main)]'}`}>Delivery</button>
          <button onClick={() => setActiveFormATab('postnatal')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeFormATab === 'postnatal' ? 'bg-pink-500 text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-main)]'}`}>Postnatal</button>
        </div>

        {/* Antenatal Tab */}
        {activeFormATab === 'antenatal' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-pink-50 rounded-lg text-center">
                <div className="text-2xl font-bold text-pink-600">{report.antenatal?.iptp?.dose3 || 0}</div>
                <div className="text-xs">IPTp-3+</div>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">{report.antenatal?.ttVaccination?.tt2Plus || 0}</div>
                <div className="text-xs">TT2+ (Protected)</div>
              </div>
              <div className="p-3 bg-green-50 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">{report.antenatal?.itnDistributed || 0}</div>
                <div className="text-xs">ITN Distributed</div>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg text-center">
                <div className="text-2xl font-bold text-yellow-600">{report.antenatal?.firstVisits || 0}</div>
                <div className="text-xs">First ANC Visits</div>
              </div>
            </div>
          </div>
        )}

        {/* Delivery Tab */}
        {activeFormATab === 'delivery' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-green-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">{report.delivery?.spontaneousVertex || 0}</div>
              <div className="text-xs">Spontaneous Vertex</div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">{report.delivery?.caesareanSection || 0}</div>
              <div className="text-xs">Caesarean Section</div>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-yellow-600">{report.delivery?.liveBirths || 0}</div>
              <div className="text-xs">Live Births</div>
            </div>
            <div className="p-3 bg-red-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-600">{(report.delivery?.stillbirthsFresh || 0) + (report.delivery?.stillbirthsMacerated || 0)}</div>
              <div className="text-xs">Stillbirths</div>
            </div>
          </div>
        )}

        {/* Postnatal Tab */}
        {activeFormATab === 'postnatal' && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="p-3 bg-blue-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">{report.postnatal?.newMothers || 0}</div>
              <div className="text-xs">New Mothers</div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">{report.postnatal?.pncWithin48Hours || 0}</div>
              <div className="text-xs">PNC within 48h</div>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-yellow-600">{report.postnatal?.exclusiveBreastfeeding || 0}</div>
              <div className="text-xs">Exclusive BF</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ==================== IPD REPORT ====================
  const renderIPDReport = () => {
    const report = ipdReport as any;
    if (!report) return <EmptyState message="No IPD data available for this period" />;

    const ageGroups = report.ageGroups || {};
    const malaria = report.malaria || {};
    const totals = report.totals || {};

    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Admissions" value={totals.totalAdmissions || 0} icon={Hospital} color="cyan" />
          <StatCard label="Total Deaths" value={totals.totalDeaths || 0} icon={AlertTriangle} color="red" />
          <StatCard label="Under-5 Malaria Admissions" value={malaria.under5_admitted || 0} icon={Baby} color="yellow" />
          <StatCard label="Malaria Deaths" value={(malaria.under5_deaths || 0) + (malaria.above5_deaths || 0)} icon={AlertTriangle} color="red" />
        </div>

        <TableCard title="Admissions by Age Group" icon={Hospital}>
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Age Group</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-secondary)]" colSpan={2}>Insured</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-secondary)]" colSpan={2}>Non-Insured</th>
              </tr>
              <tr className="bg-[var(--bg-main)]">
                <th className="px-4 py-2"></th>
                <th className="px-4 py-2 text-center text-xs text-[var(--text-tertiary)]">Male</th>
                <th className="px-4 py-2 text-center text-xs text-[var(--text-tertiary)]">Female</th>
                <th className="px-4 py-2 text-center text-xs text-[var(--text-tertiary)]">Male</th>
                <th className="px-4 py-2 text-center text-xs text-[var(--text-tertiary)]">Female</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {Object.entries(ageGroups).map(([group, data]: [string, any]) => (
                <tr key={group} className="hover:bg-[var(--bg-main)] transition-colors">
                  <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{group}</td>
                  <td className="px-4 py-3 text-center text-[var(--text-secondary)]">{data?.admissions?.insured?.male || 0}</td>
                  <td className="px-4 py-3 text-center text-[var(--text-secondary)]">{data?.admissions?.insured?.female || 0}</td>
                  <td className="px-4 py-3 text-center text-[var(--text-secondary)]">{data?.admissions?.nonInsured?.male || 0}</td>
                  <td className="px-4 py-3 text-center text-[var(--text-secondary)]">{data?.admissions?.nonInsured?.female || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      </div>
    );
  };

  // ==================== MALARIA REPORT ====================
  const renderMalariaReport = () => {
    const report = malariaReport as any;
    if (!report) return <EmptyState message="No malaria data available for this period" />;

    return <MalariaReportView data={report} dateRange={dateRange} />;
  };

  // ==================== IDSR REPORT ====================
  const renderIDSRReport = () => {
    const report = idsrReport as any;
    if (!report) return <EmptyState message="No IDSR data available for this period" />;

    const diseases = report.diseases || [];

    return (
      <TableCard title="Notifiable Diseases (IDSR)" icon={AlertTriangle}>
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Disease</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-secondary)]">Suspected Cases</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-secondary)]">Confirmed</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-secondary)]">Deaths</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {diseases.map((d: any, i: number) => (
              <tr key={i} className="hover:bg-[var(--bg-main)] transition-colors">
                <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{d.disease}</td>
                <td className="px-4 py-3 text-center text-[var(--text-secondary)]">{d.suspected}</td>
                <td className="px-4 py-3 text-center text-[var(--text-secondary)]">{d.confirmed}</td>
                <td className="px-4 py-3 text-center text-[var(--icon-red-text)] font-medium">{d.deaths}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>
    );
  };

  // ==================== FAMILY PLANNING REPORT ====================
  const renderFamilyPlanningReport = () => {
    const report = familyPlanningReport as any;
    if (!report) return <EmptyState message="No family planning data available for this period" />;

    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard label="Total FP Clients" value={report.summary?.totalFPClients || 0} icon={Users} color="cyan" />
          <StatCard label="Total FP Visits" value={report.summary?.totalFPVisits || 0} icon={Calendar} color="green" />
          <StatCard label="New Acceptors" value={report.summary?.newAcceptors || 0} icon={UserCheck} color="purple" />
        </div>

        <TableCard title="Method Mix" icon={PieChart}>
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Method</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-secondary)]">Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {Object.entries(report.methodMix || {}).map(([method, count]: [string, any]) => (
                <tr key={method} className="hover:bg-[var(--bg-main)]">
                  <td className="px-4 py-3 text-[var(--text-primary)]">{method}</td>
                  <td className="px-4 py-3 text-right text-[var(--text-secondary)]">{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      </div>
    );
  };

  // ==================== DEMOGRAPHIC REPORT ====================
  const renderDemographicReport = () => {
    const report = demographicReport as any;
    if (!report) return <EmptyState message="No demographic data available for this period" />;

    const demographics = report.patientDemographics || {};

    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Patients" value={demographics.totalPatients || 0} icon={Users} color="cyan" />
          <StatCard label="Male" value={demographics.genderDistribution?.male || 0} icon={Users} color="blue" />
          <StatCard label="Female" value={demographics.genderDistribution?.female || 0} icon={Users} color="pink" />
          <StatCard label="Avg Visits/Patient" value={report.attendancePatterns?.visitsPerPatient?.toFixed(1) || 0} icon={Activity} color="green" />
        </div>

        <TableCard title="Age Distribution" icon={PieChart}>
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Age Group</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-secondary)]">Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {Object.entries(demographics.ageDistribution || {}).map(([group, count]: [string, any]) => (
                <tr key={group} className="hover:bg-[var(--bg-main)]">
                  <td className="px-4 py-3 text-[var(--text-primary)]">{group}</td>
                  <td className="px-4 py-3 text-right text-[var(--text-secondary)]">{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      </div>
    );
  };

  // ==================== FINANCIAL REPORT ====================
  const renderFinancialReport = () => {
    const report = financialReport as any;
    if (!report) return <EmptyState message="No financial data available for this period" />;

    const summary = report.summary || {};

    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Revenue" value={`GHS ${(summary.totalRevenue || 0).toLocaleString()}`} icon={DollarSign} color="green" />
          <StatCard label="Total Paid" value={`GHS ${(summary.totalPaid || 0).toLocaleString()}`} icon={CheckCircle} color="cyan" />
          <StatCard label="Outstanding Balance" value={`GHS ${(summary.outstandingBalance || 0).toLocaleString()}`} icon={AlertTriangle} color="red" />
          <StatCard label="Total Bills" value={summary.totalBills || 0} icon={FileText} color="blue" />
        </div>

        <TableCard title="Revenue by Payment Mode" icon={PieChart}>
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Payment Mode</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-secondary)]">Revenue</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-secondary)]">Bills</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-secondary)]">Avg Bill</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {(report.revenueByPaymentMode || []).map((item: any, i: number) => (
                <tr key={i} className="hover:bg-[var(--bg-main)]">
                  <td className="px-4 py-3 capitalize text-[var(--text-primary)]">{item.paymentMode?.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-right text-[var(--text-secondary)]">GHS {item.totalRevenue?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-[var(--text-secondary)]">{item.billCount}</td>
                  <td className="px-4 py-3 text-right text-[var(--text-secondary)]">GHS {item.averageBill?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      </div>
    );
  };

  // ==================== LABORATORY REPORT ====================
  const renderLabReport = () => {
    const report = labReport as any;
    if (!report) return <EmptyState message="No laboratory data available for this period" />;

    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Tests" value={report.summary?.totalTests || 0} icon={FlaskConical} color="blue" />
          <StatCard label="Completed" value={report.summary?.byStatus?.completed || 0} icon={CheckCircle} color="green" />
          <StatCard label="In Progress" value={report.summary?.byStatus?.inProgress || 0} icon={Activity} color="yellow" />
          <StatCard label="Avg Turnaround" value={`${report.summary?.averageTurnaroundTime || 0} min`} icon={Clock} color="cyan" />
        </div>

        <TableCard title="Top 10 Tests" icon={FlaskConical}>
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Test Name</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-secondary)]">Count</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-secondary)]">Positivity Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {(report.topTests || []).map((test: any, i: number) => (
                <tr key={i} className="hover:bg-[var(--bg-main)]">
                  <td className="px-4 py-3 text-[var(--text-primary)]">{i + 1}. {test.testName}</td>
                  <td className="px-4 py-3 text-right text-[var(--text-secondary)]">{test.count}</td>
                  <td className="px-4 py-3 text-right text-[var(--text-secondary)]">{test.positiveRate || 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      </div>
    );
  };

  // ==================== ATTENDANCE REPORT ====================
  const renderAttendanceReport = () => {
    const report = attendanceReport as any;
    if (!report) return <EmptyState message="No attendance data available for this period" />;

    const summary = report.summary || {};
    const patterns = report.attendancePatterns || {};

    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard label="Total Attendances" value={summary.totalAttendances || 0} icon={Users} color="cyan" />
          <StatCard label="Unique Patients" value={summary.uniquePatients || 0} icon={UserCheck} color="green" />
          <StatCard label="Avg Visits/Patient" value={summary.averageVisitsPerPatient?.toFixed(1) || 0} icon={Activity} color="purple" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <TableCard title="Attendance by Type" icon={PieChart}>
            <div className="p-4 space-y-2">
              {Object.entries(patterns.byType || {}).map(([type, count]: [string, any]) => (
                <div key={type} className="flex justify-between text-sm">
                  <span className="capitalize text-[var(--text-primary)]">{type.replace('_', ' ')}</span>
                  <span className="font-bold text-[var(--text-primary)]">{count}</span>
                </div>
              ))}
            </div>
          </TableCard>

          <TableCard title="Payment Mode Distribution" icon={Shield}>
            <div className="p-4 space-y-2">
              {Object.entries(patterns.byPaymentMode || {}).map(([mode, count]: [string, any]) => (
                <div key={mode} className="flex justify-between text-sm">
                  <span className="capitalize text-[var(--text-primary)]">{mode.replace('_', ' ')}</span>
                  <span className="font-bold text-[var(--text-primary)]">{count}</span>
                </div>
              ))}
            </div>
          </TableCard>
        </div>
      </div>
    );
  };

  // ==================== REVENUE REPORT ====================
  const renderRevenueReport = () => {
    const report = revenueReport as any;
    if (!report) return <EmptyState message="No revenue data available for this period" />;

    const summary = report.summary || {};

    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard label="Total Revenue" value={`GHS ${(summary.totalRevenue || 0).toLocaleString()}`} icon={DollarSign} color="green" />
          <StatCard label="Total Bills" value={summary.totalBills || 0} icon={FileText} color="cyan" />
          <StatCard label="Average Bill" value={`GHS ${(summary.averageBillAmount || 0).toLocaleString()}`} icon={TrendingUp} color="purple" />
        </div>

        <TableCard title="Monthly Revenue Trend" icon={TrendingUp}>
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Period</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-secondary)]">Revenue</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-secondary)]">Bills</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {(report.monthlyRevenueTrend || []).map((item: any, i: number) => (
                <tr key={i} className="hover:bg-[var(--bg-main)]">
                  <td className="px-4 py-3 text-[var(--text-primary)]">{item.period}</td>
                  <td className="px-4 py-3 text-right text-[var(--text-secondary)]">GHS {item.totalRevenue?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-[var(--text-secondary)]">{item.billCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      </div>
    );
  };

  // ==================== SCANS REPORT ====================
  const renderScanReport = () => {
    const report = scanReport as any;
    if (!report) return <EmptyState message="No radiology data available for this period" />;

    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Scans" value={report.summary?.totalScans || 0} icon={ClipboardList} color="indigo" />
          <StatCard label="Completed" value={report.summary?.byStatus?.completed || 0} icon={CheckCircle} color="green" />
          <StatCard label="Avg Turnaround" value={`${report.summary?.averageTurnaroundTime || 0} min`} icon={Clock} color="cyan" />
          <StatCard label="Cancelled" value={report.summary?.byStatus?.cancelled || 0} icon={AlertTriangle} color="red" />
        </div>

        <TableCard title="Top Scans" icon={ClipboardList}>
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Scan Name</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-secondary)]">Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {(report.topScans || []).map((scan: any, i: number) => (
                <tr key={i} className="hover:bg-[var(--bg-main)]">
                  <td className="px-4 py-3 text-[var(--text-primary)]">{i + 1}. {scan.scanName}</td>
                  <td className="px-4 py-3 text-right font-bold text-[var(--text-primary)]">{scan.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      </div>
    );
  };

  // ==================== PROCEDURES REPORT ====================
  const renderProcedureReport = () => {
    const report = procedureReport as any;
    if (!report) return <EmptyState message="No procedure data available for this period" />;

    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Procedures" value={report.summary?.totalProcedures || 0} icon={Scissors} color="purple" />
          <StatCard label="Completed" value={report.summary?.byStatus?.completed || 0} icon={CheckCircle} color="green" />
          <StatCard label="Scheduled" value={report.summary?.byStatus?.scheduled || 0} icon={Calendar} color="blue" />
          <StatCard label="Avg Duration" value={`${report.summary?.averageDuration || 0} min`} icon={Clock} color="cyan" />
        </div>

        <TableCard title="Top Procedures" icon={Scissors}>
          {/* FIX 3: corrected </tr> → <tr> in thead opening */}
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Procedure Name</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-secondary)]">Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {(report.topProcedures || []).map((proc: any, i: number) => (
                <tr key={i} className="hover:bg-[var(--bg-main)]">
                  <td className="px-4 py-3 text-[var(--text-primary)]">{i + 1}. {proc.procedureName}</td>
                  <td className="px-4 py-3 text-right font-bold text-[var(--text-primary)]">{proc.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      </div>
    );
  };

  // ==================== MEDICATIONS REPORT ====================
  const renderMedicationReport = () => {
    const report = medicationReport as any;
    if (!report) return <EmptyState message="No medication data available for this period" />;

    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Prescriptions" value={report.summary?.totalPrescriptions || 0} icon={Syringe} color="green" />
          <StatCard label="Dispensed" value={report.summary?.byStatus?.dispensed || 0} icon={CheckCircle} color="green" />
          <StatCard label="Administered" value={report.summary?.byStatus?.administered || 0} icon={Activity} color="blue" />
          {/* FIX 4: Package is now imported at the top */}
          <StatCard label="Total Quantity" value={report.summary?.totalQuantity || 0} icon={Package} color="orange" />
        </div>

        <TableCard title="Top Medications" icon={Syringe}>
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Medication Name</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-secondary)]">Prescriptions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {(report.topMedications || []).map((med: any, i: number) => (
                <tr key={i} className="hover:bg-[var(--bg-main)]">
                  <td className="px-4 py-3 text-[var(--text-primary)]">{i + 1}. {med.medicationName}</td>
                  <td className="px-4 py-3 text-right font-bold text-[var(--text-primary)]">{med.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      </div>
    );
  };

  // ==================== VITALS REPORT ====================
  const renderVitalsReport = () => {
    const report = vitalsReport as any;
    if (!report) return <EmptyState message="No vitals data available for this period" />;

    const abnormal = report.summary?.abnormalFindings || {};

    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Records" value={report.summary?.totalVitalsRecords || 0} icon={Activity} color="cyan" />
          <StatCard label="Unique Patients" value={report.summary?.uniquePatients || 0} icon={Users} color="blue" />
          <StatCard label="Hypertension" value={abnormal.hypertension || 0} icon={AlertTriangle} color="red" />
          <StatCard label="Fever" value={abnormal.fever || 0} icon={AlertTriangle} color="orange" />
        </div>

        <TableCard title="Abnormal Findings" icon={AlertTriangle}>
          <div className="p-4 grid grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Hypertension:</span><span className="font-bold text-red-600">{abnormal.hypertension || 0}</span></div>
            <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Hypotension:</span><span className="font-bold text-orange-600">{abnormal.hypotension || 0}</span></div>
            <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Fever (&gt;38°C):</span><span className="font-bold text-red-600">{abnormal.fever || 0}</span></div>
            <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Tachycardia:</span><span className="font-bold text-yellow-600">{abnormal.tachycardia || 0}</span></div>
            <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Bradycardia:</span><span className="font-bold text-blue-600">{abnormal.bradycardia || 0}</span></div>
            <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Hypoxia:</span><span className="font-bold text-purple-600">{abnormal.hypoxia || 0}</span></div>
          </div>
        </TableCard>
      </div>
    );
  };

  // ==================== INSURANCE CLAIMS REPORT ====================
  const renderInsuranceClaimsReport = () => {
    const report = insuranceClaimsReport as any;
    if (!report) return <EmptyState message="No insurance claims data available for this period" />;

    const totals = report.totals || {};

    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard label="Total Claims" value={totals.totalClaims || 0} icon={FileText} color="cyan" />
          <StatCard label="Total Claim Amount" value={`GHS ${(totals.totalClaimAmount || 0).toLocaleString()}`} icon={DollarSign} color="yellow" />
          <StatCard label="Total Paid Amount" value={`GHS ${(totals.totalPaidAmount || 0).toLocaleString()}`} icon={CheckCircle} color="green" />
        </div>

        <TableCard title="Claims by Status" icon={PieChart}>
          <div className="p-4 space-y-2">
            {Object.entries(totals.byStatus || {}).map(([status, count]: [string, any]) => (
              <div key={status} className="flex justify-between text-sm">
                <span className="capitalize text-[var(--text-primary)]">{status}</span>
                <span className="font-bold text-[var(--text-primary)]">{count}</span>
              </div>
            ))}
          </div>
        </TableCard>
      </div>
    );
  };

  const EmptyState = ({ message }: { message: string }) => (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-12 text-center">
      <FileText className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-4" />
      <p className="text-[var(--text-secondary)] text-sm">{message}</p>
      <p className="text-[var(--text-tertiary)] text-xs mt-2">Try selecting a different report type or date range</p>
    </div>
  );

  const renderReportContent = () => {
    switch (reportType) {
      case 'consulting-room-register': return renderConsultingRoomRegister();
      case 'nhis-expiry': return renderNhisExpiryReport();
      case 'nhis-claims': return renderNhisClaimsSummary();
      case 'opd-attendance': return renderOPDAttendanceReport();
      case 'opd-morbidity': return renderFullMorbidityReport();
      case 'top-diagnoses': return renderTopDiagnoses();
      case 'form-a': return renderFormAReport();
      case 'ipd': return renderIPDReport();
      case 'malaria': return renderMalariaReport();
      case 'idsr': return renderIDSRReport();
      case 'family-planning': return renderFamilyPlanningReport();
      case 'demographic': return renderDemographicReport();
      case 'financial': return renderFinancialReport();
      case 'insurance': return renderInsuranceClaimsReport();
      case 'attendance': return renderAttendanceReport();
      case 'revenue': return renderRevenueReport();
      case 'lab': return renderLabReport();
      case 'scans': return renderScanReport();
      case 'procedures': return renderProcedureReport();
      case 'medications': return renderMedicationReport();
      case 'vitals': return renderVitalsReport();
      default: return <EmptyState message="Select a report type to view data" />;
    }
  };

  const currentReports = reportItems[activeCategory as keyof typeof reportItems] || reportItems.ghs;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 px-3 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)] rounded-lg transition-all text-sm font-medium">
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-[var(--icon-cyan-text)]" />
              Reports & Analytics
            </h1>
            <p className="text-[var(--text-secondary)] text-sm">GHS compliant reporting and facility statistics</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg">
            <span className="text-xs text-[var(--text-secondary)]">Export as:</span>
            <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value as any)} className="bg-transparent text-[var(--text-primary)] text-sm focus:outline-none">
              <option value="csv">CSV</option>
              <option value="excel">Excel</option>
              <option value="pdf">PDF</option>
            </select>
          </div>
          <button onClick={handleExport} disabled={isLoading_ || !getActiveReport()} className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium disabled:opacity-50">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button onClick={loadReport} disabled={isLoading_} className="flex items-center gap-2 px-4 py-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] transition-all text-sm font-medium disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${isLoading_ ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-1 flex gap-1">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <button
              key={category.id}
              onClick={() => {
                setActiveCategory(category.id as any);
                const firstReport = reportItems[category.id as keyof typeof reportItems]?.[0]?.key;
                if (firstReport) setReportType(firstReport);
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${activeCategory === category.id ? 'bg-[var(--icon-cyan-text)] text-white shadow-md' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)]'}`}
            >
              <Icon className="w-4 h-4" />
              {category.label}
            </button>
          );
        })}
      </div>

      {/* Report Type Buttons */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-4">
        <div className="flex flex-wrap gap-2">
          {currentReports.map(({ key, label, icon: Icon, color }) => (
            <button
              key={key}
              onClick={() => setReportType(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${reportType === key ? `bg-[var(--icon-${color}-text)] text-white shadow-md` : 'bg-[var(--bg-main)] text-[var(--text-primary)] border border-[var(--border-color)] hover:bg-[var(--bg-hover)]'}`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Date Range Selection */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[var(--text-secondary)]" />
            <span className="text-sm font-medium text-[var(--text-primary)]">Period:</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setDatePreset('month')} className="px-3 py-1.5 text-xs bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-hover)]">This Month</button>
            <button onClick={() => setDatePreset('quarter')} className="px-3 py-1.5 text-xs bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-hover)]">This Quarter</button>
            <button onClick={() => setDatePreset('year')} className="px-3 py-1.5 text-xs bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-hover)]">This Year</button>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <input type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} className="px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm" />
            <span className="text-[var(--text-secondary)]">to</span>
            <input type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} className="px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm" />
          </div>
        </div>
      </div>

      {/* Generated At Info */}
      {generatedAt && (
        <div className="text-right text-xs text-[var(--text-tertiary)]">
          Report generated: {generatedAt.toLocaleString()}
        </div>
      )}

      {/* Report Content */}
      {isLoading_ ? (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-12 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--icon-cyan-text)] mx-auto mb-4"></div>
          <p className="text-[var(--text-secondary)]">Generating {getReportTitle()}...</p>
        </div>
      ) : (
        renderReportContent()
      )}
    </div>
  );
}