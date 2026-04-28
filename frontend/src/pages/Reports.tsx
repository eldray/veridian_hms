// src/pages/Reports.tsx
import { useState, useEffect, useCallback } from 'react';
import { useReportsStore } from '../store/reportsStore';
import { useAttendanceStore } from '../store/attendanceStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import {
  BarChart3, TrendingUp, Users, DollarSign, FileText, Calendar,
  Hospital, Download, Activity, Clock, CheckCircle,
  Baby, Heart, Stethoscope, PieChart, UserCheck, Shield,
  AlertTriangle, FlaskConical, Scissors, Eye, Edit, ChevronLeft, ChevronRight,
  Printer, FileSpreadsheet, Filter, RefreshCw, Plus, Trash2, User,
  Syringe, Bone, Brain, Eye as EyeIcon, Ear, Tooth, Virus, Droplet
} from 'lucide-react';

export default function Reports() {
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [reportType, setReportType] = useState<
    'opd' | 'ipd' | 'anc' | 'delivery' | 'malaria' | 'idsr' | 
    'family-planning' | 'morbidity-mortality' | 'demographic' | 'financial' | 
    'insurance' | 'clinical' | 'attendance' | 'revenue'
  >('opd');
  const [isLoading, setIsLoading] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel' | 'pdf'>('csv');
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);

  const { success, error: toastError } = useToast();
  const { hasRole } = useAuthStore();

  // Store data
  const {
    opdReport,
    ipdReport,
    ancReport,
    deliveryReport,
    malariaReport,
    idsrReport,
    familyPlanningReport,
    morbidityMortalityReport,
    demographicReport,
    financialReport,
    insuranceClaimsReport,
    clinicalReport,
    attendanceReport,
    revenueReport,
    getOPDReport,
    getIPDReport,
    getANCReport,
    getDeliveryReport,
    getMalariaReport,
    getIDSRReport,
    getFamilyPlanningReport,
    getMorbidityMortalityReport,
    getDemographicReport,
    getFinancialReport,
    getInsuranceClaimsReport,
    getClinicalReport,
    getAttendanceReport,
    getRevenueReport,
    exportReport,
    isLoading: storeLoading,
    error: storeError
  } = useReportsStore();

  // Date range presets
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
        case 'opd':
          await getOPDReport(filters);
          break;
        case 'ipd':
          await getIPDReport(filters);
          break;
        case 'anc':
          await getANCReport(filters);
          break;
        case 'delivery':
          await getDeliveryReport(filters);
          break;
        case 'malaria':
          await getMalariaReport(filters);
          break;
        case 'idsr':
          await getIDSRReport(filters);
          break;
        case 'family-planning':
          await getFamilyPlanningReport(filters);
          break;
        case 'morbidity-mortality':
          await getMorbidityMortalityReport(filters);
          break;
        case 'demographic':
          await getDemographicReport(filters);
          break;
        case 'financial':
          await getFinancialReport(filters);
          break;
        case 'insurance':
          await getInsuranceClaimsReport(filters);
          break;
        case 'clinical':
          await getClinicalReport(filters);
          break;
        case 'attendance':
          await getAttendanceReport(filters);
          break;
        case 'revenue':
          await getRevenueReport(filters);
          break;
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
      case 'opd': return opdReport;
      case 'ipd': return ipdReport;
      case 'anc': return ancReport;
      case 'delivery': return deliveryReport;
      case 'malaria': return malariaReport;
      case 'idsr': return idsrReport;
      case 'family-planning': return familyPlanningReport;
      case 'morbidity-mortality': return morbidityMortalityReport;
      case 'demographic': return demographicReport;
      case 'financial': return financialReport;
      case 'insurance': return insuranceClaimsReport;
      case 'clinical': return clinicalReport;
      case 'attendance': return attendanceReport;
      case 'revenue': return revenueReport;
      default: return null;
    }
  };

  const isLoading_ = isLoading || storeLoading;

  // ==================== RENDER FUNCTIONS ====================

  // OPD Report - Age groups with insured/non-insured (from opd.pdf)
  const renderOPDReport = () => {
    const report = opdReport as any;
    if (!report) return <div className="text-center py-10 text-gray-500">No OPD data available</div>;

    const ageGroups = report.ageGroups || {};
    const totals = report.totals || {};

    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { label: 'Total Attendances', value: totals.totalAttendances || 0, icon: Users, color: 'blue' },
            { label: 'New Cases', value: totals.new || 0, icon: UserCheck, color: 'green' },
            { label: 'Re-Attendances', value: totals.old || 0, icon: Clock, color: 'orange' },
            { label: 'Insured Patients', value: totals.insured?.total || 0, icon: Shield, color: 'purple' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl shadow-sm border p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-10 h-10 bg-${color}-100 rounded-xl flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 text-${color}-600`} />
                </div>
                <span className="text-gray-600 text-xs font-medium">{label}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-5 py-4 border-b bg-gray-50">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Age Group Distribution (OPD)
            </h2>
            <p className="text-xs text-gray-500 mt-1">From {dateRange.start} to {dateRange.end}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Age Group</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600" colSpan={2}>Insured</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600" colSpan={2}>Non-Insured</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">New</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Old</th>
                </tr>
                <tr>
                  <th className="px-4 py-2 text-left text-xs text-gray-500"></th>
                  <th className="px-4 py-2 text-center text-xs text-gray-500">Male</th>
                  <th className="px-4 py-2 text-center text-xs text-gray-500">Female</th>
                  <th className="px-4 py-2 text-center text-xs text-gray-500">Male</th>
                  <th className="px-4 py-2 text-center text-xs text-gray-500">Female</th>
                  <th className="px-4 py-2 text-center text-xs text-gray-500"></th>
                  <th className="px-4 py-2 text-center text-xs text-gray-500"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {Object.entries(ageGroups).map(([group, data]: [string, any]) => (
                  <tr key={group} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{group}</td>
                    <td className="px-4 py-3 text-center text-gray-700">{data?.insured?.male || 0}</td>
                    <td className="px-4 py-3 text-center text-gray-700">{data?.insured?.female || 0}</td>
                    <td className="px-4 py-3 text-center text-gray-700">{data?.nonInsured?.male || 0}</td>
                    <td className="px-4 py-3 text-center text-gray-700">{data?.nonInsured?.female || 0}</td>
                    <td className="px-4 py-3 text-center text-gray-700">{data?.new || 0}</td>
                    <td className="px-4 py-3 text-center text-gray-700">{data?.old || 0}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 font-semibold border-t">
                <tr>
                  <td className="px-4 py-3 text-gray-900">TOTAL</td>
                  <td className="px-4 py-3 text-center text-gray-900">{totals.insured?.male || 0}</td>
                  <td className="px-4 py-3 text-center text-gray-900">{totals.insured?.female || 0}</td>
                  <td className="px-4 py-3 text-center text-gray-900">{totals.nonInsured?.male || 0}</td>
                  <td className="px-4 py-3 text-center text-gray-900">{totals.nonInsured?.female || 0}</td>
                  <td className="px-4 py-3 text-center text-gray-900">{totals.new || 0}</td>
                  <td className="px-4 py-3 text-center text-gray-900">{totals.old || 0}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // IPD Report - Admissions and deaths with age groups (from ipd report.pdf)
  const renderIPDReport = () => {
    const report = ipdReport as any;
    if (!report) return <div className="text-center py-10 text-gray-500">No IPD data available</div>;

    const ageGroups = report.ageGroups || {};
    const malaria = report.malaria || {};
    const totals = report.totals || {};

    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { label: 'Total Admissions', value: totals.totalAdmissions || 0, icon: Hospital, color: 'blue' },
            { label: 'Total Deaths', value: totals.totalDeaths || 0, icon: AlertTriangle, color: 'red' },
            { label: 'Under-5 Malaria Admissions', value: malaria.under5_admitted || 0, icon: Baby, color: 'yellow' },
            { label: 'Malaria Deaths', value: (malaria.under5_deaths || 0) + (malaria.above5_deaths || 0), icon: AlertTriangle, color: 'orange' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl shadow-sm border p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-10 h-10 bg-${color}-100 rounded-xl flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 text-${color}-600`} />
                </div>
                <span className="text-gray-600 text-xs font-medium">{label}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-5 py-4 border-b bg-gray-50">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Hospital className="w-5 h-5 text-blue-600" />
              Admissions by Age Group
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Age Group</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600" colSpan={2}>Insured</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600" colSpan={2}>Non-Insured</th>
                </tr>
                <tr>
                  <th className="px-4 py-2"></th>
                  <th className="px-4 py-2 text-center text-xs text-gray-500">Male</th>
                  <th className="px-4 py-2 text-center text-xs text-gray-500">Female</th>
                  <th className="px-4 py-2 text-center text-xs text-gray-500">Male</th>
                  <th className="px-4 py-2 text-center text-xs text-gray-500">Female</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {Object.entries(ageGroups).map(([group, data]: [string, any]) => (
                  <tr key={group} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{group}</td>
                    <td className="px-4 py-3 text-center text-gray-700">{data?.admissions?.insured?.male || 0}</td>
                    <td className="px-4 py-3 text-center text-gray-700">{data?.admissions?.insured?.female || 0}</td>
                    <td className="px-4 py-3 text-center text-gray-700">{data?.admissions?.nonInsured?.male || 0}</td>
                    <td className="px-4 py-3 text-center text-gray-700">{data?.admissions?.nonInsured?.female || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-5 py-4 border-b bg-gray-50">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Deaths by Age Group
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Age Group</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600" colSpan={2}>Insured</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600" colSpan={2}>Non-Insured</th>
                </tr>
                <tr>
                  <th className="px-4 py-2"></th>
                  <th className="px-4 py-2 text-center text-xs text-gray-500">Male</th>
                  <th className="px-4 py-2 text-center text-xs text-gray-500">Female</th>
                  <th className="px-4 py-2 text-center text-xs text-gray-500">Male</th>
                  <th className="px-4 py-2 text-center text-xs text-gray-500">Female</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {Object.entries(ageGroups).map(([group, data]: [string, any]) => (
                  <tr key={group}>
                    <td className="px-4 py-3 font-medium text-gray-900">{group}</td>
                    <td className="px-4 py-3 text-center text-gray-700">{data?.deaths?.insured?.male || 0}</td>
                    <td className="px-4 py-3 text-center text-gray-700">{data?.deaths?.insured?.female || 0}</td>
                    <td className="px-4 py-3 text-center text-gray-700">{data?.deaths?.nonInsured?.male || 0}</td>
                    <td className="px-4 py-3 text-center text-gray-700">{data?.deaths?.nonInsured?.female || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-5 py-4 border-b bg-gray-50">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Droplet className="w-5 h-5 text-red-600" />
              Malaria in Inpatients
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-4 p-5">
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-gray-600">Under-5 Admitted with Malaria</p>
              <p className="text-2xl font-bold text-red-600">{malaria.under5_admitted || 0}</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-gray-600">5+ Years Admitted with Malaria</p>
              <p className="text-2xl font-bold text-red-600">{malaria.above5_admitted || 0}</p>
            </div>
            <div className="text-center p-4 bg-red-100 rounded-lg">
              <p className="text-sm text-gray-600">Under-5 Malaria Deaths</p>
              <p className="text-2xl font-bold text-red-700">{malaria.under5_deaths || 0}</p>
            </div>
            <div className="text-center p-4 bg-red-100 rounded-lg">
              <p className="text-sm text-gray-600">5+ Years Malaria Deaths</p>
              <p className="text-2xl font-bold text-red-700">{malaria.above5_deaths || 0}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ANC Report
  const renderANCReport = () => {
    const report = ancReport as any;
    if (!report) return <div className="text-center py-10 text-gray-500">No ANC data available</div>;

    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { label: 'New Registrants', value: report.newRegistrants || 0, icon: UserCheck, color: 'green' },
            { label: 'Total ANC Visits', value: report.totalVisits || 0, icon: Heart, color: 'pink' },
            { label: 'IPTp Doses', value: report.iptp1 || 0, icon: Syringe, color: 'blue' },
            { label: 'TT2+ Vaccinations', value: report.tt2Plus || 0, icon: Shield, color: 'purple' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl shadow-sm border p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-10 h-10 bg-${color}-100 rounded-xl flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 text-${color}-600`} />
                </div>
                <span className="text-gray-600 text-xs font-medium">{label}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h3 className="font-bold mb-3">High Risk Pregnancies: {report.highRisk || 0}</h3>
          <h3 className="font-bold">Anaemia in Pregnancy: {report.anaemiaInPregnancy || 0}</h3>
        </div>
      </div>
    );
  };

  // Delivery Report
  const renderDeliveryReport = () => {
    const report = deliveryReport as any;
    if (!report) return <div className="text-center py-10 text-gray-500">No delivery data available</div>;

    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { label: 'Total Deliveries', value: report.totalDeliveries || 0, icon: Baby, color: 'pink' },
            { label: 'Live Births', value: report.liveBirths || 0, icon: Heart, color: 'green' },
            { label: 'Stillbirths', value: report.stillbirths || 0, icon: AlertTriangle, color: 'red' },
            { label: 'Caesarean Section', value: report.caesarean || 0, icon: Scissors, color: 'blue' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl shadow-sm border p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-10 h-10 bg-${color}-100 rounded-xl flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 text-${color}-600`} />
                </div>
                <span className="text-gray-600 text-xs font-medium">{label}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Malaria Report
  const renderMalariaReport = () => {
    const report = malariaReport as any;
    if (!report) return <div className="text-center py-10 text-gray-500">No malaria data available</div>;

    const opd = report.opdMalaria || {};
    const testing = report.testing || {};

    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { label: 'Suspected Cases (U5)', value: opd.under5?.suspected || 0, icon: AlertTriangle, color: 'yellow' },
            { label: 'Confirmed Cases (U5)', value: opd.under5?.confirmed || 0, icon: CheckCircle, color: 'green' },
            { label: 'Suspected Cases (5+)', value: opd.above5?.suspected || 0, icon: AlertTriangle, color: 'yellow' },
            { label: 'Confirmed Cases (5+)', value: opd.above5?.confirmed || 0, icon: CheckCircle, color: 'green' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl shadow-sm border p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-10 h-10 bg-${color}-100 rounded-xl flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 text-${color}-600`} />
                </div>
                <span className="text-gray-600 text-xs font-medium">{label}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <h3 className="font-bold flex items-center gap-2 mb-3"><FlaskConical className="w-4 h-4" /> Testing Methods</h3>
            <div className="space-y-2">
              <div className="flex justify-between"><span>Microscopy:</span><span className="font-bold">{testing.microscopy || 0}</span></div>
              <div className="flex justify-between"><span>Microscopy Positive:</span><span className="font-bold">{testing.microscopyPositive || 0}</span></div>
              <div className="flex justify-between"><span>RDT:</span><span className="font-bold">{testing.rdt || 0}</span></div>
              <div className="flex justify-between"><span>RDT Positive:</span><span className="font-bold">{testing.rdtPositive || 0}</span></div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <h3 className="font-bold flex items-center gap-2 mb-3"><Syringe className="w-4 h-4" /> ACT Treatment</h3>
            <div className="space-y-2">
              <div className="flex justify-between"><span>Under-5 Treated with ACT:</span><span className="font-bold">{opd.under5?.treatedWithACT || 0}</span></div>
              <div className="flex justify-between"><span>5+ Treated with ACT:</span><span className="font-bold">{opd.above5?.treatedWithACT || 0}</span></div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // IDSR Report
  const renderIDSRReport = () => {
    const report = idsrReport as any;
    if (!report) return <div className="text-center py-10 text-gray-500">No IDSR data available</div>;

    const diseases = report.diseases || [];

    return (
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-5 py-4 border-b bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Notifiable Diseases (IDSR)
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Disease</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Suspected Cases</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Confirmed</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Deaths</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {diseases.map((d: any, i: number) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{d.disease}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{d.suspected}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{d.confirmed}</td>
                  <td className="px-4 py-3 text-center text-red-600 font-medium">{d.deaths}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Placeholder render for other reports (simplified)
  const renderPlaceholderReport = (title: string) => (
    <div className="bg-white rounded-xl shadow-sm border p-10 text-center">
      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 text-sm">Report content will be displayed here</p>
    </div>
  );

  const renderReportContent = () => {
    switch (reportType) {
      case 'opd': return renderOPDReport();
      case 'ipd': return renderIPDReport();
      case 'anc': return renderANCReport();
      case 'delivery': return renderDeliveryReport();
      case 'malaria': return renderMalariaReport();
      case 'idsr': return renderIDSRReport();
      case 'family-planning': return renderPlaceholderReport('Family Planning Report');
      case 'morbidity-mortality': return renderPlaceholderReport('Morbidity & Mortality Report');
      case 'demographic': return renderPlaceholderReport('Demographic Report');
      case 'financial': return renderPlaceholderReport('Financial Report');
      case 'insurance': return renderPlaceholderReport('Insurance Claims Report');
      case 'clinical': return renderPlaceholderReport('Clinical Report');
      case 'attendance': return renderPlaceholderReport('Attendance Report');
      case 'revenue': return renderPlaceholderReport('Revenue Report');
      default: return null;
    }
  };

  const reportCategories = [
    {
      title: 'GHS Standard Reports',
      items: [
        { key: 'opd', label: 'OPD Morbidity', icon: Stethoscope, color: 'blue' },
        { key: 'ipd', label: 'IPD & Mortality', icon: Hospital, color: 'purple' },
        { key: 'anc', label: 'Antenatal Care (ANC)', icon: Heart, color: 'pink' },
        { key: 'delivery', label: 'Delivery Register', icon: Baby, color: 'red' },
        { key: 'malaria', label: 'Malaria Data', icon: Droplet, color: 'green' },
        { key: 'idsr', label: 'IDSR (Notifiable)', icon: AlertTriangle, color: 'orange' },
        { key: 'family-planning', label: 'Family Planning', icon: Users, color: 'teal' },
      ]
    },
    {
      title: 'Clinical Reports',
      items: [
        { key: 'morbidity-mortality', label: 'Morbidity & Mortality', icon: Activity, color: 'red' },
        { key: 'demographic', label: 'Demographic Analysis', icon: PieChart, color: 'indigo' },
        { key: 'attendance', label: 'Attendance Patterns', icon: Calendar, color: 'cyan' },
      ]
    },
    {
      title: 'Financial Reports',
      items: [
        { key: 'financial', label: 'Financial Summary', icon: DollarSign, color: 'green' },
        { key: 'revenue', label: 'Revenue Analysis', icon: TrendingUp, color: 'emerald' },
        { key: 'insurance', label: 'Insurance Claims', icon: Shield, color: 'purple' },
        { key: 'clinical', label: 'Clinical Statistics', icon: BarChart3, color: 'blue' },
      ]
    }
  ];

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-blue-900 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <BarChart3 className="w-7 h-7" />
              Reports & Analytics
            </h1>
            <p className="text-blue-100 text-sm mt-1">GHS compliant reporting and facility statistics</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as any)}
              className="px-3 py-2 bg-white/10 backdrop-blur-sm text-white rounded-lg border border-white/20 text-sm"
            >
              <option value="csv">CSV</option>
              <option value="excel">Excel</option>
              <option value="pdf">PDF</option>
            </select>
            <button
              onClick={handleExport}
              disabled={isLoading_ || !getActiveReport()}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm text-white rounded-xl hover:bg-white/20 transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={loadReport}
              disabled={isLoading_}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm text-white rounded-xl hover:bg-white/20 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading_ ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Report Type Selector - Categorized */}
      <div className="space-y-4">
        {reportCategories.map((category) => (
          <div key={category.title} className="bg-white rounded-xl shadow-sm border">
            <div className="px-4 py-3 border-b bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-700">{category.title}</h3>
            </div>
            <div className="p-3 flex flex-wrap gap-2">
              {category.items.map(({ key, label, icon: Icon, color }) => (
                <button
                  key={key}
                  onClick={() => setReportType(key as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                    reportType === key
                      ? `bg-${color}-600 text-white shadow-md`
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Date Range Selection */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Period:</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setDatePreset('month')}
              className="px-3 py-1.5 text-xs bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              This Month
            </button>
            <button
              onClick={() => setDatePreset('quarter')}
              className="px-3 py-1.5 text-xs bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              This Quarter
            </button>
            <button
              onClick={() => setDatePreset('year')}
              className="px-3 py-1.5 text-xs bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              This Year
            </button>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>
      </div>

      {/* Generated At Info */}
      {generatedAt && (
        <div className="text-right text-xs text-gray-500">
          Report generated: {generatedAt.toLocaleString()}
        </div>
      )}

      {/* Report Content */}
      {isLoading_ ? (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Generating report...</p>
        </div>
      ) : (
        renderReportContent()
      )}
    </div>
  );
}