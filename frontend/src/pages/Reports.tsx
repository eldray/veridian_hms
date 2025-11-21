// src/pages/Reports.tsx
import { useState, useEffect } from 'react';
import { useReportsStore } from '../store/reportsStore';
import { useAttendanceStore } from '../store/attendanceStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import {
  FinancialReport,
  InsuranceClaimsReport,
  ClinicalReport,
  AttendanceReport,
  RevenueReport,
  ReportFilter
} from '../types/api';
import {
  BarChart3, TrendingUp, Users, DollarSign, FileText, Calendar,
  Hospital, Download, Activity, Clock, PlayCircle, CheckCircle,
  Baby, Heart, Stethoscope, PieChart, UserCheck
} from 'lucide-react';

export default function Reports() {
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [reportType, setReportType] = useState<
    'financial' | 'insurance' | 'clinical' | 'attendance' | 'revenue' | 
    'ghs-opd' | 'ghs-ipd' | 'ghs-anc' | 'ghs-cwc' | 'ghs-family-planning' | 
    'morbidity' | 'demographic' | 'status'
  >('financial');
  const [isLoading, setIsLoading] = useState(false);

  // ✅ USE ALL REPORTS STORE FUNCTIONS
  const {
    // Core reports
    financialReport,
    insuranceClaimsReport,
    clinicalReport,
    attendanceReport,
    revenueReport,
    
    // GHS reports
    ghsOPDReport,
    ghsIPDReport,
    ghsANCReport,
    ghsCWCReport,
    ghsFamilyPlanningReport,
    
    // Clinical reports
    morbidityMortalityReport,
    demographicReport,
    
    // Actions
    getFinancialReport,
    getInsuranceClaimsReport,
    getClinicalReport,
    getAttendanceReport,
    getRevenueReport,
    getGHSOPDReport,
    getGHSIPDReport,
    getGHSANCReport,
    getGHSCWCReport,
    getGHSFamilyPlanningReport,
    getMorbidityMortalityReport,
    getDemographicReport,
    exportReport,
    clearReports
  } = useReportsStore();

  const { attendances, getAttendances } = useAttendanceStore();
  const { success, error: toastError } = useToast();

  const reportFilters: ReportFilter = {
    startDate: dateRange.start,
    endDate: dateRange.end,
    groupBy: 'month'
  };

  useEffect(() => {
    getAttendances().catch(() => {
      toastError('Load failed', 'Could not load attendances');
    });
  }, [getAttendances]);

  // ✅ LOAD ALL REPORT TYPES
  const loadReport = async () => {
    setIsLoading(true);
    try {
      switch (reportType) {
        case 'financial':
          await getFinancialReport(reportFilters);
          break;
        case 'insurance':
          await getInsuranceClaimsReport(reportFilters);
          break;
        case 'clinical':
          await getClinicalReport(reportFilters);
          break;
        case 'attendance':
          await getAttendanceReport(reportFilters);
          break;
        case 'revenue':
          await getRevenueReport(reportFilters);
          break;
        case 'ghs-opd':
          await getGHSOPDReport(reportFilters);
          break;
        case 'ghs-ipd':
          await getGHSIPDReport(reportFilters);
          break;
        case 'ghs-anc':
          await getGHSANCReport(reportFilters);
          break;
        case 'ghs-cwc':
          await getGHSCWCReport(reportFilters);
          break;
        case 'ghs-family-planning':
          await getGHSFamilyPlanningReport(reportFilters);
          break;
        case 'morbidity':
          await getMorbidityMortalityReport(reportFilters);
          break;
        case 'demographic':
          await getDemographicReport(reportFilters);
          break;
        case 'status':
          // Status report is generated locally
          break;
      }
    } catch (error: any) {
      toastError('Report error', error.message || 'Failed to generate report');
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ GET ACTIVE REPORT BASED ON TYPE
  const getActiveReport = () => {
    switch (reportType) {
      case 'financial': return financialReport;
      case 'insurance': return insuranceClaimsReport;
      case 'clinical': return clinicalReport;
      case 'attendance': return attendanceReport;
      case 'revenue': return revenueReport;
      case 'ghs-opd': return ghsOPDReport;
      case 'ghs-ipd': return ghsIPDReport;
      case 'ghs-anc': return ghsANCReport;
      case 'ghs-cwc': return ghsCWCReport;
      case 'ghs-family-planning': return ghsFamilyPlanningReport;
      case 'morbidity': return morbidityMortalityReport;
      case 'demographic': return demographicReport;
      case 'status': return generateStatusReport();
      default: return null;
    }
  };

  const generateStatusReport = () => {
    const filtered = attendances.filter(a => {
      const date = new Date(a.dateTime).toISOString().split('T')[0];
      return date >= dateRange.start && date <= dateRange.end;
    });

    const statusBreakdown = filtered.reduce((acc, a) => {
      acc[a.status] = (acc[a.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const typeBreakdown = filtered.reduce((acc, a) => {
      acc[a.attendanceType] = (acc[a.attendanceType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const statusDurations = filtered.map(a => {
      const created = new Date(a.createdAt);
      const now = new Date();
      const durationDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      return { status: a.status, durationDays, attendanceType: a.attendanceType };
    });

    const avgDurationByStatus = statusDurations.reduce((acc, item) => {
      if (!acc[item.status]) acc[item.status] = { total: 0, count: 0 };
      acc[item.status].total += item.durationDays;
      acc[item.status].count += 1;
      return acc;
    }, {} as Record<string, { total: number; count: number }>);

    return {
      reportType: 'status',
      period: { startDate: dateRange.start, endDate: dateRange.end },
      summary: { 
        totalAttendances: filtered.length, 
        statusBreakdown, 
        typeBreakdown 
      },
      analytics: {
        avgDurationByStatus: Object.entries(avgDurationByStatus).reduce((acc, [status, data]) => {
          acc[status] = data.count > 0 ? (data.total / data.count).toFixed(1) : '0';
          return acc;
        }, {} as Record<string, string>),
        pendingToActiveRate: calculateConversionRate(filtered),
        completionRate: calculateCompletionRate(filtered)
      },
      generatedAt: new Date().toISOString()
    };
  };

  const calculateConversionRate = (attendances: any[]) => {
    const pending = attendances.filter(a => a.status === 'pending').length;
    const active = attendances.filter(a => a.status === 'active').length;
    const total = pending + active;
    return total > 0 ? ((active / total) * 100).toFixed(1) : '0';
  };

  const calculateCompletionRate = (attendances: any[]) => {
    const completed = attendances.filter(a => a.status === 'completed').length;
    const total = attendances.length;
    return total > 0 ? ((completed / total) * 100).toFixed(1) : '0';
  };

  const handleExport = async () => {
    try {
      await exportReport({ 
        reportType, 
        filters: reportFilters, 
        format: 'excel',
        data: getActiveReport()
      });
      success('Export started', 'Your report is being generated');
    } catch (error: any) {
      toastError('Export failed', error.message || 'Could not export report');
    }
  };

  useEffect(() => {
    loadReport();
  }, [reportType, dateRange]);

  const activeReport = getActiveReport();

  // ✅ FINANCIAL REPORT
  const renderFinancialReport = () => {
    const stats = activeReport?.summary || {
      totalRevenue: 0,
      totalPaid: 0,
      outstandingBalance: 0,
      totalAttendances: 0
    };

    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { label: 'Total Revenue', value: `₵${stats.totalRevenue?.toLocaleString() || '0'}`, icon: DollarSign, color: 'green' },
            { label: 'Total Paid', value: `₵${stats.totalPaid?.toLocaleString() || '0'}`, icon: CheckCircle, color: 'blue' },
            { label: 'Outstanding', value: `₵${stats.outstandingBalance?.toLocaleString() || '0'}`, icon: FileText, color: 'orange' },
            { label: 'Attendances', value: stats.totalAttendances?.toLocaleString() || '0', icon: Users, color: 'purple' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-5 hover:shadow-2xl transition-shadow">
              <div className="flex items-center gap-2.5 mb-2">
                <div className={`w-10 h-10 bg-${color}-100 rounded-xl flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 text-${color}-600`} />
                </div>
                <span className="text-gray-600 text-xs font-medium">{label}</span>
              </div>
              <p className="text-2.5xl font-bold text-gray-900">{value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-5">
            <div className="flex items-center gap-2.5 mb-5">
              <BarChart3 className="w-5.5 h-5.5 text-blue-600" />
              <h2 className="text-lg font-bold text-gray-900">Payment Mode Breakdown</h2>
            </div>
            <div className="space-y-5">
              {activeReport?.paymentBreakdown?.map((item: any) => {
                const total = activeReport?.summary?.totalRevenue || 1;
                const percentage = ((item.amount / total) * 100).toFixed(1);
                const colorConfig = {
                  cash: 'from-green-500 to-emerald-500',
                  nhis: 'from-blue-500 to-cyan-500',
                  insurance: 'from-purple-500 to-indigo-500'
                }[item.mode] || 'from-gray-500 to-slate-500';
                
                return (
                  <div key={item.mode}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600 font-medium capitalize">{item.mode}</span>
                      <span className="font-bold text-gray-900">₵{item.amount?.toLocaleString()} ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className={`bg-gradient-to-r ${colorConfig} h-2.5 rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              }) || (
                <p className="text-gray-500 text-center py-4">No payment data available</p>
              )}
            </div>
          </div>

          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-5">
            <div className="flex items-center gap-2.5 mb-5">
              <TrendingUp className="w-5.5 h-5.5 text-green-600" />
              <h2 className="text-lg font-bold text-gray-900">Revenue Trend</h2>
            </div>
            <div className="text-center py-10">
              <p className="text-gray-500 text-sm">Revenue trend visualization</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ✅ INSURANCE CLAIMS REPORT
  const renderInsuranceReport = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: 'Total Claims', value: activeReport?.totalClaims || 0, icon: FileText, color: 'blue' },
          { label: 'Approved', value: activeReport?.approvedClaims || 0, icon: CheckCircle, color: 'green' },
          { label: 'Pending', value: activeReport?.pendingClaims || 0, icon: Clock, color: 'yellow' },
          { label: 'Rejected', value: activeReport?.rejectedClaims || 0, icon: FileText, color: 'red' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-5 hover:shadow-2xl transition-shadow">
            <div className="flex items-center gap-2.5 mb-2">
              <div className={`w-10 h-10 bg-${color}-100 rounded-xl flex items-center justify-center`}>
                <Icon className={`w-5 h-5 text-${color}-600`} />
              </div>
              <span className="text-gray-600 text-xs font-medium">{label}</span>
            </div>
            <p className="text-2.5xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>
      
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-5">
        <div className="flex items-center gap-2.5 mb-5">
          <PieChart className="w-5.5 h-5.5 text-blue-600" />
          <h2 className="text-lg font-bold text-gray-900">Claims by Provider</h2>
        </div>
        <div className="space-y-4">
          {activeReport?.providers?.map((provider: any) => (
            <div key={provider.name} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700 font-medium">{provider.name}</span>
              <span className="text-gray-900 font-bold">{provider.claims} claims</span>
            </div>
          )) || (
            <p className="text-gray-500 text-center py-4">No insurance claims data available</p>
          )}
        </div>
      </div>
    </div>
  );

  // ✅ GHS OPD REPORT
  const renderGHSOPDReport = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: 'Total Visits', value: activeReport?.totalVisits || 0, icon: Users, color: 'blue' },
          { label: 'New Cases', value: activeReport?.newCases || 0, icon: UserCheck, color: 'green' },
          { label: 'Follow-ups', value: activeReport?.followUpCases || 0, icon: Clock, color: 'purple' },
          { label: 'Male/Female', value: `${activeReport?.maleCount || 0}/${activeReport?.femaleCount || 0}`, icon: Users, color: 'pink' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-5 hover:shadow-2xl transition-shadow">
            <div className="flex items-center gap-2.5 mb-2">
              <div className={`w-10 h-10 bg-${color}-100 rounded-xl flex items-center justify-center`}>
                <Icon className={`w-5 h-5 text-${color}-600`} />
              </div>
              <span className="text-gray-600 text-xs font-medium">{label}</span>
            </div>
            <p className="text-2.5xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );

  // ✅ GHS ANC REPORT
  const renderGHSANCReport = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: 'ANC Visits', value: activeReport?.totalANCVisits || 0, icon: Heart, color: 'pink' },
          { label: 'First Visits', value: activeReport?.firstVisits || 0, icon: UserCheck, color: 'green' },
          { label: 'High Risk', value: activeReport?.highRiskPregnancies || 0, icon: Activity, color: 'orange' },
          { label: 'Deliveries', value: activeReport?.deliveries || 0, icon: Baby, color: 'blue' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-5 hover:shadow-2xl transition-shadow">
            <div className="flex items-center gap-2.5 mb-2">
              <div className={`w-10 h-10 bg-${color}-100 rounded-xl flex items-center justify-center`}>
                <Icon className={`w-5 h-5 text-${color}-600`} />
              </div>
              <span className="text-gray-600 text-xs font-medium">{label}</span>
            </div>
            <p className="text-2.5xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );

  // ✅ ADD RENDER FUNCTIONS FOR OTHER REPORT TYPES...
  const renderReportContent = () => {
    switch (reportType) {
      case 'financial': return renderFinancialReport();
      case 'insurance': return renderInsuranceReport();
      case 'clinical': return renderClinicalReport();
      case 'attendance': return renderAttendanceReport();
      case 'revenue': return renderRevenueReport();
      case 'ghs-opd': return renderGHSOPDReport();
      case 'ghs-ipd': return renderGHSIPDReport();
      case 'ghs-anc': return renderGHSANCReport();
      case 'ghs-cwc': return renderGHSCWCReport();
      case 'ghs-family-planning': return renderGHSFamilyPlanningReport();
      case 'morbidity': return renderMorbidityReport();
      case 'demographic': return renderDemographicReport();
      case 'status': return renderStatusReport();
      default: return <div>Select a report type</div>;
    }
  };

  // Add placeholder render functions for other report types
  const renderGHSIPDReport = () => <div className="text-center py-10">GHS IPD Report Content</div>;
  const renderGHSCWCReport = () => <div className="text-center py-10">GHS CWC Report Content</div>;
  const renderGHSFamilyPlanningReport = () => <div className="text-center py-10">GHS Family Planning Report Content</div>;
  const renderMorbidityReport = () => <div className="text-center py-10">Morbidity & Mortality Report Content</div>;
  const renderDemographicReport = () => <div className="text-center py-10">Demographic Report Content</div>;
  const renderClinicalReport = () => <div className="text-center py-10">Clinical Report Content</div>;
  const renderAttendanceReport = () => <div className="text-center py-10">Attendance Report Content</div>;
  const renderRevenueReport = () => <div className="text-center py-10">Revenue Report Content</div>;

  // Your existing renderStatusReport function remains the same...
  const renderStatusReport = () => (
    <div className="space-y-5">
      {/* ... your existing status report JSX ... */}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-blue-900 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2.5">
              <Hospital className="w-7 h-7" />
              Reports & Analytics
            </h1>
            <p className="text-blue-100 text-sm mt-0.5">Comprehensive system reporting</p>
          </div>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 backdrop-blur-sm text-white rounded-xl hover:bg-white/20 transition-all duration-200 border border-white/20 font-medium text-sm"
          >
            <Download className="w-4.5 h-4.5" />
            Export
          </button>
        </div>
      </div>

      {/* Type Selector */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-5">
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'financial', label: 'Financial', icon: DollarSign },
            { key: 'insurance', label: 'Insurance', icon: FileText },
            { key: 'clinical', label: 'Clinical', icon: Activity },
            { key: 'attendance', label: 'Attendance', icon: Users },
            { key: 'revenue', label: 'Revenue', icon: TrendingUp },
            { key: 'ghs-opd', label: 'GHS OPD', icon: Stethoscope },
            { key: 'ghs-ipd', label: 'GHS IPD', icon: Hospital },
            { key: 'ghs-anc', label: 'GHS ANC', icon: Heart },
            { key: 'ghs-cwc', label: 'GHS CWC', icon: Baby },
            { key: 'ghs-family-planning', label: 'Family Planning', icon: UserCheck },
            { key: 'morbidity', label: 'Morbidity', icon: Activity },
            { key: 'demographic', label: 'Demographic', icon: Users },
            { key: 'status', label: 'Status', icon: PieChart },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setReportType(key as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 text-xs ${
                reportType === key
                  ? 'bg-gradient-to-r from-blue-600 to-teal-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Date Range */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-5">
        <div className="flex items-center gap-3">
          <Calendar className="w-5.5 h-5.5 text-blue-600" />
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-4 py-3 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
            />
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="px-4 py-3 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
            />
          </div>
        </div>
      </div>

      {/* Report Content */}
      {isLoading ? (
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-10 text-center">
          <div className="animate-spin rounded-full h-11 w-11 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-gray-600 text-base">Loading report...</p>
        </div>
      ) : (
        renderReportContent()
      )}
    </div>
  );
}