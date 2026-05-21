// src/pages/Reports.tsx - COMPLETE UPDATED VERSION
import React, { useState, useEffect, useCallback } from 'react';
import { useReportsStore } from '../store/reportsStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import {
  BarChart3, TrendingUp, Users, DollarSign, FileText, Calendar,
  Download, Activity, Clock, CheckCircle, Baby, Heart, Stethoscope,
  PieChart, UserCheck, Shield, AlertTriangle, Droplet, RefreshCw,
  ArrowLeft, Hospital, Syringe, Scissors, FlaskConical, ListOrdered,
  FileSpreadsheet, ClipboardList
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
  const [activeCategory, setActiveCategory] = useState<'ghs' | 'clinical' | 'financial'>('ghs');
  const [reportType, setReportType] = useState<string>('opd-attendance');
  const [activeFormATab, setActiveFormATab] = useState<'antenatal' | 'delivery' | 'postnatal'>('antenatal');
  const [isLoading, setIsLoading] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel' | 'pdf'>('csv');
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);

// ✅ Correct function names from your store
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
  
  isLoading: storeLoading,
} = useReportsStore();

  // Category configurations
  const categories = [
    { id: 'ghs', label: 'GHS Standard Reports', icon: FileText },
    { id: 'clinical', label: 'Clinical Reports', icon: Activity },
    { id: 'financial', label: 'Financial Reports', icon: DollarSign },
  ];

  // Report items by category - UPDATED (removed separate ANC and Delivery)
  const reportItems = {
    ghs: [
      { key: 'opd-attendance', label: 'OPD Attendance', icon: Users, color: 'cyan' },
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
        case 'opd-attendance': await getGHSOPDReport(filters); break;      // Changed
        case 'opd-morbidity': await getMorbidityMortalityReport(filters); break;
        case 'top-diagnoses': await getTopDiagnoses(filters, 10); break;
        case 'form-a': await getGHSFormAReport(filters); break;           // Changed
        case 'ipd': await getGHSIPDReport(filters); break;                // Changed
        case 'malaria': await getGHSMalariaReport(filters); break;        // Changed
        case 'idsr': await getGHSIDSRReport(filters); break;              // Changed
        case 'family-planning': await getFamilyPlanningReport(filters); break;
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
      }
      setGeneratedAt(new Date());
    } catch (err: any) {
      toastError('Report Error', err.message || 'Failed to generate report');
    } finally {
      setIsLoading(false);
    }
  }, [reportType, dateRange]);

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
      case 'morbidity-mortality': return morbidityMortalityReport;
      case 'demographic': return demographicReport;
      case 'financial': return financialReport;
      case 'insurance': return insuranceClaimsReport;
      case 'clinical-stats': return clinicalReport;
      case 'attendance': return attendanceReport;
      case 'revenue': return revenueReport;
      case 'lab': return labReport;
      case 'scans': return scanReport;
      case 'procedures': return procedureReport;
      case 'medications': return medicationReport;
      case 'vitals': return vitalsReport;
      default: return null;
    }
  };

  const isLoading_ = isLoading || storeLoading;

  const getReportTitle = () => {
    const titles: Record<string, string> = {
      'opd-attendance': 'OPD Attendance Report',
      'opd-morbidity': 'OPD Morbidity Report (GHS Form A)',
      'top-diagnoses': 'Top 10 Diagnoses',
      'form-a': 'GHS Form A - Maternal Health Report (ANC + Delivery + Postnatal)',
      ipd: 'IPD & Mortality Report',
      malaria: 'Malaria Data Report',
      idsr: 'IDSR Notifiable Diseases Report',
      'family-planning': 'Family Planning Report',
      'morbidity-mortality': 'Morbidity & Mortality Report',
      demographic: 'Demographic Analysis Report',
      financial: 'Financial Summary Report',
      insurance: 'Insurance Claims Report',
      'clinical-stats': 'Clinical Statistics Report',
      attendance: 'Attendance Patterns Report',
      revenue: 'Revenue Analysis Report',
      'lab': 'Laboratory Report',
      'scans': 'Radiology/Scans Report',
      'procedures': 'Procedures Report',
      'medications': 'Medications Report',
      'vitals': 'Vitals & Observations Report',
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

  // ==================== 1. OPD ATTENDANCE REPORT ====================
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

  // ==================== 2. FULL OPD MORBIDITY REPORT ====================
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

  // ==================== 3. TOP 10 DIAGNOSES ====================
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };


  // ==================== LABORATORY REPORT ====================
const renderLabReport = () => {
  const report = labReport as any;
  if (!report) return <EmptyState message="No laboratory data available for this period" />;

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Total Tests" value={report.summary?.totalTests || 0} icon={FlaskConical} color="blue" />
        <StatCard label="Completed" value={report.summary?.byStatus?.completed || 0} icon={CheckCircle} color="green" />
        <StatCard label="In Progress" value={report.summary?.byStatus?.inProgress || 0} icon={Activity} color="yellow" />
        <StatCard label="Avg Turnaround" value={`${report.summary?.averageTurnaroundTime || 0} min`} icon={Clock} color="cyan" />
        <StatCard label="Stat Requests" value={report.summary?.byPriority?.stat || 0} icon={AlertTriangle} color="red" />
      </div>

      {/* Top Tests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <TableCard title="Top 10 Tests Requested" icon={FlaskConical}>
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-main)] border-b">
              <tr><th className="px-4 py-2 text-left">Test Name</th><th className="px-4 py-2 text-right">Count</th><th className="px-4 py-2 text-right">Positivity Rate</th></tr>
            </thead>
            <tbody className="divide-y">
              {(report.topTests || []).map((test: any, i: number) => (
                <tr key={i}><td className="px-4 py-2">{i+1}. {test.testName}</td><td className="px-4 py-2 text-right font-medium">{test.count}</td><td className="px-4 py-2 text-right">{test.positiveRate || 0}%</td></tr>
              ))}
            </tbody>
          </table>
        </TableCard>

        <TableCard title="Test Status Distribution" icon={PieChart}>
          <div className="p-4 space-y-2">
            <div className="flex justify-between"><span>Requested:</span><span className="font-bold text-yellow-600">{report.summary?.byStatus?.requested || 0}</span></div>
            <div className="flex justify-between"><span>In Progress:</span><span className="font-bold text-blue-600">{report.summary?.byStatus?.inProgress || 0}</span></div>
            <div className="flex justify-between"><span>Completed:</span><span className="font-bold text-green-600">{report.summary?.byStatus?.completed || 0}</span></div>
            <div className="flex justify-between"><span>Cancelled:</span><span className="font-bold text-red-600">{report.summary?.byStatus?.cancelled || 0}</span></div>
          </div>
        </TableCard>
      </div>
    </div>
  );
};

// ==================== SCAN/RADIOLOGY REPORT ====================
const renderScanReport = () => {
  const report = scanReport as any;
  if (!report) return <EmptyState message="No radiology data available for this period" />;

  const byType = report.summary?.byType || {};
  const byBodyPart = report.summary?.byBodyPart || {};

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Scans" value={report.summary?.totalScans || 0} icon={ClipboardList} color="indigo" />
        <StatCard label="Completed" value={report.summary?.byStatus?.completed || 0} icon={CheckCircle} color="green" />
        <StatCard label="Avg Turnaround" value={`${report.summary?.averageTurnaroundTime || 0} min`} icon={Clock} color="cyan" />
        <StatCard label="Cancelled" value={report.summary?.byStatus?.cancelled || 0} icon={AlertTriangle} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <TableCard title="Scans by Type" icon={PieChart}>
          <div className="p-4 space-y-2">
            {Object.entries(byType).slice(0, 10).map(([type, count]: [string, any]) => (
              <div key={type} className="flex justify-between"><span className="capitalize">{type}</span><span className="font-bold">{count}</span></div>
            ))}
          </div>
        </TableCard>

        <TableCard title="Scans by Body Part" icon={Activity}>
          <div className="p-4 space-y-2">
            {Object.entries(byBodyPart).slice(0, 10).map(([part, count]: [string, any]) => (
              <div key={part} className="flex justify-between"><span className="capitalize">{part}</span><span className="font-bold">{count}</span></div>
            ))}
          </div>
        </TableCard>
      </div>

      <TableCard title="Top Scans" icon={ClipboardList}>
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg-main)] border-b"><tr><th className="px-4 py-2 text-left">Scan Name</th><th className="px-4 py-2 text-right">Count</th></tr></thead>
          <tbody className="divide-y">
            {(report.topScans || []).map((scan: any, i: number) => (
              <tr key={i}><td className="px-4 py-2">{i+1}. {scan.scanName}</td><td className="px-4 py-2 text-right font-bold">{scan.count}</td></tr>
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

  const byCategory = report.summary?.byCategory || {};

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Procedures" value={report.summary?.totalProcedures || 0} icon={Scissors} color="purple" />
        <StatCard label="Completed" value={report.summary?.byStatus?.completed || 0} icon={CheckCircle} color="green" />
        <StatCard label="Scheduled" value={report.summary?.byStatus?.scheduled || 0} icon={Calendar} color="blue" />
        <StatCard label="Avg Duration" value={`${report.summary?.averageDuration || 0} min`} icon={Clock} color="cyan" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <TableCard title="Procedures by Category" icon={PieChart}>
          <div className="p-4 space-y-2">
            {Object.entries(byCategory).map(([category, count]: [string, any]) => (
              <div key={category} className="flex justify-between"><span className="capitalize">{category}</span><span className="font-bold">{count}</span></div>
            ))}
          </div>
        </TableCard>

        <TableCard title="Top 10 Procedures" icon={Scissors}>
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-main)] border-b"><tr><th className="px-4 py-2 text-left">Procedure Name</th><th className="px-4 py-2 text-right">Count</th></tr></thead>
            <tbody className="divide-y">
              {(report.topProcedures || []).map((proc: any, i: number) => (
                <tr key={i}><td className="px-4 py-2">{i+1}. {proc.procedureName}</td><td className="px-4 py-2 text-right font-bold">{proc.count}</td></tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      </div>
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
        <StatCard label="Cancelled" value={report.summary?.byStatus?.cancelled || 0} icon={AlertTriangle} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <TableCard title="Medications by Route" icon={PieChart}>
          <div className="p-4 space-y-2">
            {(report.summary?.byRoute ? Object.entries(report.summary.byRoute) : []).map(([route, count]: [string, any]) => (
              <div key={route} className="flex justify-between"><span className="capitalize">{route}</span><span className="font-bold">{count}</span></div>
            ))}
          </div>
        </TableCard>

        <TableCard title="Top 10 Medications" icon={Syringe}>
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-main)] border-b"><tr><th className="px-4 py-2 text-left">Medication Name</th><th className="px-4 py-2 text-right">Prescriptions</th><th className="px-4 py-2 text-right">Total Quantity</th></tr></thead>
            <tbody className="divide-y">
              {(report.topMedications || []).slice(0, 10).map((med: any, i: number) => (
                <tr key={i}><td className="px-4 py-2">{i+1}. {med.medicationName}</td><td className="px-4 py-2 text-right font-bold">{med.count}</td><td className="px-4 py-2 text-right">{med.totalQuantity}</td></tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      </div>
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
        <StatCard label="Fever (>38°C)" value={abnormal.fever || 0} icon={AlertTriangle} color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <TableCard title="Abnormal Findings" icon={AlertTriangle}>
          <div className="p-4 space-y-2">
            <div className="flex justify-between">
              <span>Hypertension (BP &gt;140/90):</span>
              <span className="font-bold text-red-600">{abnormal?.hypertension ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Hypotension (BP &lt;90/60):</span>
              <span className="font-bold text-orange-600">{abnormal?.hypotension ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Fever (&gt;38°C):</span>
              <span className="font-bold text-red-600">{abnormal?.fever ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Tachycardia (Pulse &gt;100):</span>
              <span className="font-bold text-yellow-600">{abnormal?.tachycardia ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Bradycardia (Pulse &lt;60):</span>
              <span className="font-bold text-blue-600">{abnormal?.bradycardia ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Hypoxia (SpO2 &lt;94%):</span>
              <span className="font-bold text-purple-600">{abnormal?.hypoxia ?? 0}</span>
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="font-semibold mb-1">BMI Categories:</div>
              <div className="flex justify-between">
                <span>Underweight (BMI &lt;18.5):</span>
                <span>{abnormal?.underweight ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Overweight (BMI 25-29.9):</span>
                <span>{abnormal?.overweight ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Obese (BMI ≥30):</span>
                <span>{abnormal?.obese ?? 0}</span>
              </div>
            </div>
          </div>
        </TableCard>

        <TableCard title="Vital Trends (Monthly)" icon={TrendingUp}>
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-main)] border-b"><tr><th className="px-4 py-2 text-left">Month</th><th className="px-4 py-2 text-center">Avg Temp (°C)</th><th className="px-4 py-2 text-center">Avg BP (Systolic)</th></tr></thead>
            <tbody className="divide-y">
              {(report.trends || []).slice(-6).map((trend: any, i: number) => (
                <tr key={i}><td className="px-4 py-2">{trend.month}</td><td className="px-4 py-2 text-center">{trend.avgTemp}</td><td className="px-4 py-2 text-center">{trend.avgBPSystolic}</td></tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      </div>
    </div>
  );
};
  // ==================== 4. FORM A REPORT (Combined ANC + Delivery + Postnatal) ====================
  const renderFormAReport = () => {
    const report = formAReport as any;
    if (!report) return <EmptyState message="No Form A data available for this period" />;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-6 text-center">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">GHANA HEALTH SERVICE</h2>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mt-1">FORM A: MATERNAL HEALTH REPORT</h3>
          <p className="text-sm text-[var(--text-secondary)] mt-2">{report.facility?.name}</p>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">
            {report.period?.monthName} {report.period?.year} ({report.period?.startDate?.split('T')[0]} to {report.period?.endDate?.split('T')[0]})
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="ANC Registrants" value={report.antenatal?.newRegistrants || 0} icon={UserCheck} color="green" />
          <StatCard label="Total Deliveries" value={report.delivery?.totalDeliveries || 0} icon={Baby} color="cyan" />
          <StatCard label="Live Births" value={report.delivery?.liveBirths || 0} icon={Heart} color="pink" />
          <StatCard label="PNC Visits" value={report.postnatal?.totalVisits || 0} icon={Activity} color="purple" />
        </div>

        {/* Section Tabs */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-1 flex gap-1">
          <button onClick={() => setActiveFormATab('antenatal')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeFormATab === 'antenatal' ? 'bg-[var(--icon-pink-text)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-main)]'}`}>Antenatal</button>
          <button onClick={() => setActiveFormATab('delivery')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeFormATab === 'delivery' ? 'bg-[var(--icon-pink-text)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-main)]'}`}>Delivery</button>
          <button onClick={() => setActiveFormATab('postnatal')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeFormATab === 'postnatal' ? 'bg-[var(--icon-pink-text)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-main)]'}`}>Postnatal</button>
        </div>

        {/* Antenatal Tab */}
        {activeFormATab === 'antenatal' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-pink-50 rounded-lg text-center"><div className="text-2xl font-bold text-pink-600">{report.antenatal?.iptp?.dose3 || 0}</div><div className="text-xs">IPTp-3+</div></div>
              <div className="p-3 bg-blue-50 rounded-lg text-center"><div className="text-2xl font-bold text-blue-600">{report.antenatal?.ttVaccination?.tt2Plus || 0}</div><div className="text-xs">TT2+ (Protected)</div></div>
              <div className="p-3 bg-green-50 rounded-lg text-center"><div className="text-2xl font-bold text-green-600">{report.antenatal?.itnDistributed || 0}</div><div className="text-xs">ITN Distributed</div></div>
              <div className="p-3 bg-yellow-50 rounded-lg text-center"><div className="text-2xl font-bold text-yellow-600">{report.antenatal?.firstVisits || 0}</div><div className="text-xs">First ANC Visits</div></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <h4 className="font-bold mb-3 flex items-center gap-2"><Shield className="w-4 h-4 text-blue-600" /> IPTp Coverage</h4>
                <div className="space-y-2">
                  <div className="flex justify-between"><span>IPTp-1:</span><span className="font-bold">{report.antenatal?.iptp?.dose1 || 0}</span></div>
                  <div className="flex justify-between"><span>IPTp-2:</span><span className="font-bold">{report.antenatal?.iptp?.dose2 || 0}</span></div>
                  <div className="flex justify-between bg-pink-50 p-1 rounded"><span>IPTp-3+:</span><span className="font-bold text-pink-600">{report.antenatal?.iptp?.dose3 || 0}</span></div>
                  <div className="flex justify-between"><span>IPTp-4:</span><span className="font-bold">{report.antenatal?.iptp?.dose4 || 0}</span></div>
                  <div className="flex justify-between"><span>IPTp-5+:</span><span className="font-bold">{report.antenatal?.iptp?.dose5Plus || 0}</span></div>
                </div>
              </div>
              <div className="border rounded-lg p-4">
                <h4 className="font-bold mb-3 flex items-center gap-2"><Syringe className="w-4 h-4 text-green-600" /> TT Vaccination</h4>
                <div className="space-y-2">
                  <div className="flex justify-between"><span>TT1:</span><span className="font-bold">{report.antenatal?.ttVaccination?.dose1 || 0}</span></div>
                  <div className="flex justify-between"><span>TT2:</span><span className="font-bold">{report.antenatal?.ttVaccination?.dose2 || 0}</span></div>
                  <div className="flex justify-between bg-green-50 p-1 rounded"><span>TT2+ (Protected):</span><span className="font-bold text-green-600">{report.antenatal?.ttVaccination?.tt2Plus || 0}</span></div>
                  <div className="flex justify-between"><span>TT3:</span><span className="font-bold">{report.antenatal?.ttVaccination?.dose3 || 0}</span></div>
                  <div className="flex justify-between"><span>TT4:</span><span className="font-bold">{report.antenatal?.ttVaccination?.dose4 || 0}</span></div>
                  <div className="flex justify-between"><span>TT5:</span><span className="font-bold">{report.antenatal?.ttVaccination?.dose5 || 0}</span></div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <h4 className="font-bold mb-3 flex items-center gap-2"><Droplet className="w-4 h-4 text-red-600" /> Malaria in Pregnancy</h4>
                <div className="space-y-2">
                  <div className="flex justify-between"><span>Tested:</span><span className="font-bold">{report.antenatal?.malariaTested || 0}</span></div>
                  <div className="flex justify-between"><span>Positive:</span><span className="font-bold text-red-600">{report.antenatal?.malariaPositive || 0}</span></div>
                  <div className="flex justify-between"><span>Treated:</span><span className="font-bold text-green-600">{report.antenatal?.malariaTreated || 0}</span></div>
                </div>
              </div>
              <div className="border rounded-lg p-4">
                <h4 className="font-bold mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-orange-600" /> Complications</h4>
                <div className="space-y-2">
                  <div className="flex justify-between"><span>High Risk:</span><span className="font-bold">{report.antenatal?.highRisk || 0}</span></div>
                  <div className="flex justify-between"><span>Anaemia at Booking:</span><span className="font-bold">{report.antenatal?.anaemiaAtBooking || 0}</span></div>
                  <div className="flex justify-between"><span>Referrals Made:</span><span className="font-bold">{report.antenatal?.referralsMade || 0}</span></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delivery Tab */}
        {activeFormATab === 'delivery' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-green-50 rounded-lg text-center"><div className="text-2xl font-bold text-green-600">{report.delivery?.spontaneousVertex || 0}</div><div className="text-xs">Spontaneous Vertex</div></div>
              <div className="p-3 bg-blue-50 rounded-lg text-center"><div className="text-2xl font-bold text-blue-600">{report.delivery?.caesareanSection || 0}</div><div className="text-xs">Caesarean Section</div></div>
              <div className="p-3 bg-yellow-50 rounded-lg text-center"><div className="text-2xl font-bold text-yellow-600">{report.delivery?.liveBirths || 0}</div><div className="text-xs">Live Births</div></div>
              <div className="p-3 bg-red-50 rounded-lg text-center"><div className="text-2xl font-bold text-red-600">{report.delivery?.stillbirthsFresh + report.delivery?.stillbirthsMacerated || 0}</div><div className="text-xs">Stillbirths</div></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <h4 className="font-bold mb-3">Mode of Delivery</h4>
                <div className="space-y-2">
                  <div className="flex justify-between"><span>Spontaneous Vertex:</span><span className="font-bold">{report.delivery?.spontaneousVertex || 0}</span></div>
                  <div className="flex justify-between"><span>Assisted Breech:</span><span className="font-bold">{report.delivery?.assistedBreech || 0}</span></div>
                  <div className="flex justify-between"><span>Vacuum:</span><span className="font-bold">{report.delivery?.vacuum || 0}</span></div>
                  <div className="flex justify-between"><span>Forceps:</span><span className="font-bold">{report.delivery?.forceps || 0}</span></div>
                  <div className="flex justify-between bg-blue-50 p-1 rounded"><span>Caesarean Section:</span><span className="font-bold text-blue-600">{report.delivery?.caesareanSection || 0}</span></div>
                  <div className="flex justify-between"><span>Multiple Births:</span><span className="font-bold">{report.delivery?.multiple || 0}</span></div>
                </div>
              </div>
              <div className="border rounded-lg p-4">
                <h4 className="font-bold mb-3">Delivery Outcomes</h4>
                <div className="space-y-2">
                  <div className="flex justify-between"><span>Live Births:</span><span className="font-bold text-green-600">{report.delivery?.liveBirths || 0}</span></div>
                  <div className="flex justify-between"><span>Fresh Stillbirths:</span><span className="font-bold text-red-600">{report.delivery?.stillbirthsFresh || 0}</span></div>
                  <div className="flex justify-between"><span>Macerated Stillbirths:</span><span className="font-bold text-red-600">{report.delivery?.stillbirthsMacerated || 0}</span></div>
                  <div className="flex justify-between"><span>Neonatal Deaths:</span><span className="font-bold text-red-600">{report.delivery?.neonatalDeaths || 0}</span></div>
                  <div className="flex justify-between bg-red-50 p-1 rounded"><span>Maternal Deaths:</span><span className="font-bold text-red-600">{report.delivery?.maternalDeaths || 0}</span></div>
                  <div className="flex justify-between"><span>Low Birth Weight:</span><span className="font-bold">{report.delivery?.lowBirthWeight || 0}</span></div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <h4 className="font-bold mb-3">Place of Delivery</h4>
                <div className="space-y-2">
                  <div className="flex justify-between"><span>Hospital:</span><span className="font-bold">{report.delivery?.hospitalDeliveries || 0}</span></div>
                  <div className="flex justify-between"><span>Health Centre/Clinic:</span><span className="font-bold">{report.delivery?.healthCentreDeliveries || 0}</span></div>
                  <div className="flex justify-between"><span>Home/En Route:</span><span className="font-bold">{report.delivery?.homeDeliveries || 0}</span></div>
                </div>
              </div>
              <div className="border rounded-lg p-4">
                <h4 className="font-bold mb-3">Birth Attendant</h4>
                <div className="space-y-2">
                  <div className="flex justify-between"><span>Skilled Attendant:</span><span className="font-bold text-green-600">{report.delivery?.skilledAttendant || 0}</span></div>
                  <div className="flex justify-between"><span>TBA:</span><span className="font-bold">{report.delivery?.tbaAttendant || 0}</span></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Postnatal Tab */}
        {activeFormATab === 'postnatal' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="p-3 bg-blue-50 rounded-lg text-center"><div className="text-2xl font-bold text-blue-600">{report.postnatal?.newMothers || 0}</div><div className="text-xs">New Mothers</div></div>
              <div className="p-3 bg-green-50 rounded-lg text-center"><div className="text-2xl font-bold text-green-600">{report.postnatal?.pncWithin48Hours || 0}</div><div className="text-xs">PNC within 48h</div></div>
              <div className="p-3 bg-yellow-50 rounded-lg text-center"><div className="text-2xl font-bold text-yellow-600">{report.postnatal?.exclusiveBreastfeeding || 0}</div><div className="text-xs">Exclusive BF</div></div>
            </div>

            <div className="border rounded-lg p-4">
              <h4 className="font-bold mb-3">Postnatal Care Summary</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex justify-between p-2 bg-gray-50 rounded"><span>Total PNC Visits:</span><span className="font-bold">{report.postnatal?.totalVisits || 0}</span></div>
                <div className="flex justify-between p-2 bg-gray-50 rounded"><span>PNC within 48 hours:</span><span className="font-bold text-green-600">{report.postnatal?.pncWithin48Hours || 0}</span></div>
                <div className="flex justify-between p-2 bg-gray-50 rounded"><span>PNC within 6 weeks:</span><span className="font-bold">{report.postnatal?.pncWithin6Weeks || 0}</span></div>
                <div className="flex justify-between p-2 bg-gray-50 rounded"><span>Family Planning Accepted:</span><span className="font-bold">{report.postnatal?.familyPlanningAccepted || 0}</span></div>
                <div className="flex justify-between p-2 bg-green-50 rounded"><span>Exclusive Breastfeeding:</span><span className="font-bold text-green-600">{report.postnatal?.exclusiveBreastfeeding || 0}</span></div>
                <div className="flex justify-between p-2 bg-gray-50 rounded"><span>Immunizations Given:</span><span className="font-bold">{report.postnatal?.immunizationGiven || 0}</span></div>
                <div className="flex justify-between p-2 bg-red-50 rounded"><span>Postnatal Complications:</span><span className="font-bold text-red-600">{report.postnatal?.complications || 0}</span></div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-4 text-center">
          <p className="text-xs text-[var(--text-tertiary)]">
            Generated on {new Date(report.generatedAt).toLocaleString()} | GHS Form A - Maternal Health Report
          </p>
        </div>
      </div>
    );
  };

  // ==================== 5. IPD REPORT ====================
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

        <TableCard title="Malaria in Inpatients" icon={Droplet}>
          <div className="grid grid-cols-2 gap-4 p-5">
            <div className="text-center p-4 bg-[var(--icon-red-bg)] rounded-lg">
              <p className="text-sm text-[var(--text-secondary)]">Under-5 Admitted with Malaria</p>
              <p className="text-2xl font-bold text-[var(--icon-red-text)]">{malaria.under5_admitted || 0}</p>
            </div>
            <div className="text-center p-4 bg-[var(--icon-red-bg)] rounded-lg">
              <p className="text-sm text-[var(--text-secondary)]">5+ Years Admitted with Malaria</p>
              <p className="text-2xl font-bold text-[var(--icon-red-text)]">{malaria.above5_admitted || 0}</p>
            </div>
            <div className="text-center p-4 bg-[var(--icon-red-bg)] rounded-lg opacity-75">
              <p className="text-sm text-[var(--text-secondary)]">Under-5 Malaria Deaths</p>
              <p className="text-2xl font-bold text-[var(--icon-red-text)]">{malaria.under5_deaths || 0}</p>
            </div>
            <div className="text-center p-4 bg-[var(--icon-red-bg)] rounded-lg opacity-75">
              <p className="text-sm text-[var(--text-secondary)]">5+ Years Malaria Deaths</p>
              <p className="text-2xl font-bold text-[var(--icon-red-text)]">{malaria.above5_deaths || 0}</p>
            </div>
          </div>
        </TableCard>
      </div>
    );
  };

  // ==================== 6. MALARIA REPORT ====================

const renderMalariaReport = () => {
  const report = malariaReport as any;
  if (!report) return <EmptyState message="No malaria data available for this period" />;

  return <MalariaReportView data={report} dateRange={dateRange} />;
};

  // ==================== 7. IDSR REPORT ====================
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

  // ==================== 8. FAMILY PLANNING REPORT ====================
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
              <tr><th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Method</th><th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-secondary)]">Count</th></tr></thead>
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

        <TableCard title="Age Group Distribution (15-49 years)" icon={Users}>
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
              <tr><th className="px-4 py-3 text-left">Age Group</th><th className="px-4 py-3 text-right">Count</th></tr></thead>
            <tbody className="divide-y">
              {Object.entries(report.demographicBreakdown || {}).map(([group, count]: [string, any]) => (
                <tr key={group} className="hover:bg-[var(--bg-main)]"><td className="px-4 py-3">{group}</td><td className="px-4 py-3 text-right">{count}</td></tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      </div>
    );
  };

  // ==================== 9. MORBIDITY & MORTALITY REPORT ====================
  const renderMorbidityMortalityReport = () => {
    const report = morbidityMortalityReport as any;
    if (!report) return <EmptyState message="No morbidity & mortality data available for this period" />;

    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Cases" value={report.totals?.totalCases || 0} icon={Activity} color="cyan" />
          <StatCard label="Top Disease" value={report.topDiseases?.[0]?.name || 'N/A'} icon={AlertTriangle} color="red" />
          <StatCard label="Under-5 Cases" value={report.totals?.under5 || 0} icon={Baby} color="yellow" />
          <StatCard label="Above-5 Cases" value={report.totals?.above5 || 0} icon={Users} color="green" />
        </div>

        <TableCard title="Top 10 Diseases" icon={Activity}>
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-main)] border-b">
              <tr><th className="px-4 py-3 text-left">Rank</th><th className="px-4 py-3 text-left">Disease</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-right">Male</th><th className="px-4 py-3 text-right">Female</th><th className="px-4 py-3 text-right">Under-5</th></tr></thead>
            <tbody className="divide-y">
              {(report.topDiseases || []).map((d: any, i: number) => (
                <tr key={i} className="hover:bg-[var(--bg-main)]">
                  <td className="px-4 py-3 font-medium">{i+1}</td>
                  <td className="px-4 py-3">{d.name}</td>
                  <td className="px-4 py-3 text-right">{d.totalCases}</td>
                  <td className="px-4 py-3 text-right">{d.male}</td>
                  <td className="px-4 py-3 text-right">{d.female}</td>
                  <td className="px-4 py-3 text-right">{d.under5}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      </div>
    );
  };

  // ==================== 10. DEMOGRAPHIC REPORT ====================
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
            <thead className="bg-[var(--bg-main)] border-b"><tr><th className="px-4 py-3 text-left">Age Group</th><th className="px-4 py-3 text-right">Count</th></tr></thead>
            <tbody className="divide-y">
              {Object.entries(demographics.ageDistribution || {}).map(([group, count]: [string, any]) => (
                <tr key={group} className="hover:bg-[var(--bg-main)]"><td className="px-4 py-3">{group}</td><td className="px-4 py-3 text-right">{count}</td></tr>
              ))}
            </tbody>
          </table>
        </TableCard>

        <TableCard title="Payment Mode Distribution" icon={Shield}>
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-main)] border-b">
              <tr>
                <th className="px-4 py-3 text-left">Payment Mode</th>
                <th className="px-4 py-3 text-right">Count</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {Object.entries(demographics.paymentModeDistribution || {}).map(([mode, count]: [string, any]) => (
                <tr key={mode} className="hover:bg-[var(--bg-main)]">
                  <td className="px-4 py-3 capitalize">{mode.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-right">{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      </div>
    );
  };

  // ==================== 11. FINANCIAL REPORT ====================
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
              <tr key={i} className="hover:bg-[var(--bg-main)] transition-colors">
                <td className="px-4 py-3 capitalize text-[var(--text-primary)]">{item.paymentMode?.replace('_', ' ')}</td>
                <td className="px-4 py-3 text-right text-[var(--text-secondary)]">GHS {item.totalRevenue?.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-[var(--text-secondary)]">{item.billCount}</td>
                <td className="px-4 py-3 text-right text-[var(--text-secondary)]">GHS {item.averageBill?.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </TableCard>

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
                <tr key={i} className="hover:bg-[var(--bg-main)] transition-colors">
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

  // ==================== 12. INSURANCE CLAIMS REPORT ====================
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

        <TableCard title="Claims by Provider" icon={Shield}>
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Provider</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-secondary)]">Claims</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-secondary)]">Amount</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-secondary)]">Paid</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-secondary)]">Approval Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {(report.claimsReport || []).map((item: any, i: number) => (
                <tr key={i} className="hover:bg-[var(--bg-main)] transition-colors">
                  <td className="px-4 py-3 text-[var(--text-primary)]">{item.insuranceProvider}</td>
                  <td className="px-4 py-3 text-right text-[var(--text-secondary)]">{item.totalClaims}</td>
                  <td className="px-4 py-3 text-right text-[var(--text-secondary)]">GHS {item.totalClaimAmount?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-[var(--text-secondary)]">GHS {item.totalPaidAmount?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-[var(--text-secondary)]">{item.approvalRate?.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      </div>
    );
  };

  // ==================== 13. CLINICAL STATS REPORT ====================
  const renderClinicalStatsReport = () => {
    const report = clinicalReport as any;
    if (!report) return <EmptyState message="No clinical data available for this period" />;

    return (
      <TableCard title="Clinical Statistics" icon={BarChart3}>
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Diagnosis</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-secondary)]">Cases</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-secondary)]">Avg Age</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-secondary)]">Male</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-secondary)]">Female</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {(report.clinicalReport || []).slice(0, 20).map((item: any, i: number) => (
              <tr key={i} className="hover:bg-[var(--bg-main)] transition-colors">
                <td className="px-4 py-3 text-[var(--text-primary)]">{item.diagnosis}</td>
                <td className="px-4 py-3 text-right text-[var(--text-secondary)]">{item.totalCases}</td>
                <td className="px-4 py-3 text-right text-[var(--text-secondary)]">{item.averageAge}</td>
                <td className="px-4 py-3 text-right text-[var(--text-secondary)]">{item.genderDistribution?.male}</td>
                <td className="px-4 py-3 text-right text-[var(--text-secondary)]">{item.genderDistribution?.female}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>
    );
  };

  // ==================== 14. ATTENDANCE REPORT ====================
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
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                <tr><th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Type</th><th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-secondary)]">Count</th></tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {Object.entries(patterns.byType || {}).map(([type, count]: [string, any]) => (
                  <tr key={type} className="hover:bg-[var(--bg-main)] transition-colors">
                    <td className="px-4 py-3 capitalize text-[var(--text-primary)]">{type.replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-right text-[var(--text-secondary)]">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>

          <TableCard title="Payment Mode Distribution" icon={Shield}>
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                <tr><th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Payment Mode</th><th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-secondary)]">Count</th></tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {Object.entries(patterns.byPaymentMode || {}).map(([mode, count]: [string, any]) => (
                  <tr key={mode} className="hover:bg-[var(--bg-main)] transition-colors">
                    <td className="px-4 py-3 capitalize text-[var(--text-primary)]">{mode.replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-right text-[var(--text-secondary)]">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>
        </div>
      </div>
    );
  };

  // ==================== 15. REVENUE REPORT ====================
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
                <tr key={i} className="hover:bg-[var(--bg-main)] transition-colors">
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

  const EmptyState = ({ message }: { message: string }) => (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-12 text-center">
      <FileText className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-4" />
      <p className="text-[var(--text-secondary)] text-sm">{message}</p>
      <p className="text-[var(--text-tertiary)] text-xs mt-2">Try selecting a different report type or date range</p>
    </div>
  );

  const renderReportContent = () => {
    switch (reportType) {
      case 'opd-attendance': return renderOPDAttendanceReport();
      case 'opd-morbidity': return renderFullMorbidityReport();
      case 'top-diagnoses': return renderTopDiagnoses();
      case 'form-a': return renderFormAReport();
      case 'ipd': return renderIPDReport();
      case 'malaria': return renderMalariaReport();
      case 'idsr': return renderIDSRReport();
      case 'family-planning': return renderFamilyPlanningReport();
      case 'morbidity-mortality': return renderMorbidityMortalityReport();
      case 'demographic': return renderDemographicReport();
      case 'financial': return renderFinancialReport();
      case 'insurance': return renderInsuranceClaimsReport();
      case 'clinical-stats': return renderClinicalStatsReport();
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
      {/* Header with Back Button */}
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
            <button key={category.id} onClick={() => { setActiveCategory(category.id as any); const firstReport = reportItems[category.id as keyof typeof reportItems]?.[0]?.key; if (firstReport) setReportType(firstReport); }} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${activeCategory === category.id ? 'bg-[var(--icon-cyan-text)] text-white shadow-md' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)]'}`}>
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
            <button key={key} onClick={() => setReportType(key)} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${reportType === key ? `bg-[var(--icon-${color}-text)] text-white shadow-md` : 'bg-[var(--bg-main)] text-[var(--text-primary)] border border-[var(--border-color)] hover:bg-[var(--bg-hover)]'}`}>
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