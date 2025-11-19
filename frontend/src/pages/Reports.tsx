// src/pages/Reports.tsx
import { useState, useEffect } from 'react';
import { useReportsStore } from '../store/reportsStore';
import { useAttendanceStore } from '../store/attendanceStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore'; // UNIFIED TOAST
import {
  FinancialReport,
  InsuranceClaimsReport,
  ClinicalReport,
  AttendanceReport,
  ReportFilter
} from '../types/api';
import {
  BarChart3, TrendingUp, Users, DollarSign, FileText, Calendar,
  Hospital, Download, Activity, Clock, PlayCircle, CheckCircle
} from 'lucide-react';

export default function Reports() {
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [reportType, setReportType] = useState<'financial' | 'insurance' | 'clinical' | 'attendance' | 'status'>('financial');
  const [activeReport, setActiveReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    getFinancialReport,
    getInsuranceClaimsReport,
    getClinicalReport,
    getAttendanceReport,
    exportReport
  } = useReportsStore();
  const { attendances, getAttendances } = useAttendanceStore();
  const { success, error: toastError } = useToast(); // TOAST

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

  const loadReport = async () => {
    setIsLoading(true);
    try {
      let report;
      switch (reportType) {
        case 'financial':
          report = await getFinancialReport(reportFilters);
          break;
        case 'insurance':
          report = await getInsuranceClaimsReport(reportFilters);
          break;
        case 'clinical':
          report = await getClinicalReport(reportFilters);
          break;
        case 'attendance':
          report = await getAttendanceReport(reportFilters);
          break;
        case 'status':
          report = generateStatusReport();
          break;
      }
      setActiveReport(report);
    } catch {
      toastError('Report error', 'Failed to generate report');
    } finally {
      setIsLoading(false);
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
      summary: { totalAttendances: filtered.length, statusBreakdown, typeBreakdown },
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
      await exportReport({ reportType, filters: reportFilters, format: 'excel' });
      success('Export started', 'Your report is being generated');
    } catch {
      toastError('Export failed', 'Could not export report');
    }
  };

  useEffect(() => {
    loadReport();
  }, [reportType, dateRange]);

  const stats = activeReport?.reportType === 'financial' ? {
    totalRevenue: activeReport.summary?.totalRevenue || 0,
    totalPaid: activeReport.summary?.totalPaid || 0,
    outstandingBalance: activeReport.summary?.outstandingBalance || 0,
    totalAttendances: activeReport.summary?.totalAttendances || 0,
  } : { totalRevenue: 0, totalPaid: 0, outstandingBalance: 0, totalAttendances: 0 };

  const getPaymentModeBreakdown = () => {
    if (!activeReport?.breakdown) return { cash: 0, nhis: 0, insurance: 0 };
    const breakdown = { cash: 0, nhis: 0, insurance: 0 };
    activeReport.breakdown.forEach((item: any) => {
      if (item.paymentMode === 'cash') breakdown.cash += item.totalRevenue || 0;
      else if (item.paymentMode === 'nhis') breakdown.nhis += item.totalRevenue || 0;
      else if (item.paymentMode === 'private_insurance') breakdown.insurance += item.totalRevenue || 0;
    });
    return breakdown;
  };

  const paymentModeBreakdown = getPaymentModeBreakdown();
  const topDiagnoses = activeReport?.reportType === 'clinical' ? (activeReport.clinicalReport?.slice(0, 5) || []) : [];

  const renderStatusReport = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: 'Total', value: activeReport?.summary?.totalAttendances || 0, icon: FileText, color: 'blue' },
          { label: 'Pending', value: activeReport?.summary?.statusBreakdown?.pending || 0, icon: Clock, color: 'yellow' },
          { label: 'Active', value: activeReport?.summary?.statusBreakdown?.active || 0, icon: PlayCircle, color: 'green' },
          { label: 'Completed', value: activeReport?.summary?.statusBreakdown?.completed || 0, icon: CheckCircle, color: 'purple' },
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
            <h2 className="text-lg font-bold text-gray-900">Status Distribution</h2>
          </div>
          <div className="space-y-5">
            {Object.entries(activeReport?.summary?.statusBreakdown || {}).map(([status, count]) => {
              const total = activeReport?.summary?.totalAttendances || 1;
              const percentage = ((count as number / total) * 100).toFixed(1);
              const config = {
                pending: { color: 'from-yellow-500 to-amber-500', label: 'Planning' },
                active: { color: 'from-green-500 to-emerald-500', label: 'Active' },
                completed: { color: 'from-purple-500 to-indigo-500', label: 'Completed' },
                cancelled: { color: 'from-gray-500 to-slate-500', label: 'Cancelled' }
              }[status] || { color: 'from-gray-500 to-slate-500', label: status };
              return (
                <div key={status}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600 font-medium capitalize">{config.label}</span>
                    <span className="font-bold text-gray-900">{count} ({percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className={`bg-gradient-to-r ${config.color} h-2.5 rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-5">
          <div className="flex items-center gap-2.5 mb-5">
            <TrendingUp className="w-5.5 h-5.5 text-green-600" />
            <h2 className="text-lg font-bold text-gray-900">Performance</h2>
          </div>
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-3.5 border border-green-200">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-green-800">Pending to Active</span>
                <span className="text-xl font-bold text-green-600">{activeReport?.analytics?.pendingToActiveRate || '0'}%</span>
              </div>
            </div>
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-3.5 border border-purple-200">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-purple-800">Completion Rate</span>
                <span className="text-xl font-bold text-purple-600">{activeReport?.analytics?.completionRate || '0'}%</span>
              </div>
            </div>
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-3.5 border border-blue-200">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-blue-800">Avg. Active Duration</span>
                <span className="text-base font-bold text-blue-600">{activeReport?.analytics?.avgDurationByStatus?.active || '0'} days</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
const renderFinancialReport = () => (
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
          {[
            { mode: 'Cash', amount: paymentModeBreakdown.cash, color: 'from-green-500 to-emerald-500' },
            { mode: 'NHIS', amount: paymentModeBreakdown.nhis, color: 'from-blue-500 to-cyan-500' },
            { mode: 'Insurance', amount: paymentModeBreakdown.insurance, color: 'from-purple-500 to-indigo-500' },
          ].map(({ mode, amount, color }) => {
            const total = Object.values(paymentModeBreakdown).reduce((sum, val) => sum + val, 0) || 1;
            const percentage = ((amount / total) * 100).toFixed(1);
            return (
              <div key={mode}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600 font-medium">{mode}</span>
                  <span className="font-bold text-gray-900">₵{amount.toLocaleString()} ({percentage}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className={`bg-gradient-to-r ${color} h-2.5 rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-5">
        <div className="flex items-center gap-2.5 mb-5">
          <TrendingUp className="w-5.5 h-5.5 text-green-600" />
          <h2 className="text-lg font-bold text-gray-900">Revenue Trend</h2>
        </div>
        <div className="text-center py-10">
          <p className="text-gray-500 text-sm">Revenue trend chart would appear here</p>
        </div>
      </div>
    </div>
  </div>
);

const renderInsuranceReport = () => (
  <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-5">
    <div className="flex items-center gap-2.5 mb-5">
      <FileText className="w-5.5 h-5.5 text-blue-600" />
      <h2 className="text-lg font-bold text-gray-900">Insurance Claims Report</h2>
    </div>
    <div className="text-center py-10">
      <p className="text-gray-500 text-sm">Insurance claims data would appear here</p>
    </div>
  </div>
);

const renderClinicalReport = () => (
  <div className="space-y-5">
    <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-5">
      <div className="flex items-center gap-2.5 mb-5">
        <Activity className="w-5.5 h-5.5 text-blue-600" />
        <h2 className="text-lg font-bold text-gray-900">Clinical Statistics</h2>
      </div>
      <div className="space-y-4">
        {topDiagnoses.map((diagnosis: any, index: number) => (
          <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-700 font-medium">{diagnosis.name || 'Unknown Diagnosis'}</span>
            <span className="text-gray-900 font-bold">{diagnosis.count || 0} cases</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const renderAttendanceReport = () => (
  <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-5">
    <div className="flex items-center gap-2.5 mb-5">
      <Users className="w-5.5 h-5.5 text-blue-600" />
      <h2 className="text-lg font-bold text-gray-900">Attendance Report</h2>
    </div>
    <div className="text-center py-10">
      <p className="text-gray-500 text-sm">Attendance statistics would appear here</p>
    </div>
  </div>
);

  // ... (other render functions: financial, insurance, clinical, attendance) remain unchanged but with tighter spacing

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
            <p className="text-blue-100 text-sm mt-0.5">View system statistics</p>
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
            { key: 'status', label: 'Status', icon: TrendingUp },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setReportType(key as any)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all duration-200 text-sm ${
                reportType === key
                  ? 'bg-gradient-to-r from-blue-600 to-teal-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Icon className="w-4.5 h-4.5" />
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
        <>
          {reportType === 'financial' && renderFinancialReport()}
          {reportType === 'insurance' && renderInsuranceReport()}
          {reportType === 'clinical' && renderClinicalReport()}
          {reportType === 'attendance' && renderAttendanceReport()}
          {reportType === 'status' && renderStatusReport()}
        </>
      )}
    </div>
  );
}