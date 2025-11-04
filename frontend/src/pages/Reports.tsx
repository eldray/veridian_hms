// src/pages/Reports.tsx
import { useState, useEffect } from 'react';
import { useReportsStore } from '../store/reportsStore';
import { useAuthStore } from '../store/authStore';
import { 
  FinancialReport, 
  InsuranceClaimsReport, 
  ClinicalReport, 
  AttendanceReport,
  ReportFilter 
} from '../types/api';
import {
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  FileText,
  Calendar,
  Hospital,
  Download,
  Activity
} from 'lucide-react';

export default function Reports() {
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [reportType, setReportType] = useState<'financial' | 'insurance' | 'clinical' | 'attendance'>('financial');
  const [activeReport, setActiveReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { 
    getFinancialReport, 
    getInsuranceClaimsReport, 
    getClinicalReport, 
    getAttendanceReport, 
    exportReport 
  } = useReportsStore();
  const { user } = useAuthStore();

  const reportFilters: ReportFilter = {
    startDate: dateRange.start,
    endDate: dateRange.end,
    groupBy: 'month'
  };

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
      }
      setActiveReport(report);
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      await exportReport({
        reportType,
        filters: reportFilters,
        format: 'excel'
      });
    } catch (error) {
      console.error('Error exporting report:', error);
    }
  };

  useEffect(() => {
    loadReport();
  }, [reportType, dateRange]);

  // Calculate statistics from financial report
  const stats = activeReport?.reportType === 'financial' ? {
    totalRevenue: activeReport.summary?.totalRevenue || 0,
    totalPaid: activeReport.summary?.totalPaid || 0,
    outstandingBalance: activeReport.summary?.outstandingBalance || 0,
    totalAttendances: activeReport.summary?.totalAttendances || 0,
  } : {
    totalRevenue: 0,
    totalPaid: 0,
    outstandingBalance: 0,
    totalAttendances: 0,
  };

  // Registration type breakdown from financial report
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

  // Top diagnoses from clinical report
  const getTopDiagnoses = () => {
    if (activeReport?.reportType !== 'clinical') return [];
    return activeReport.clinicalReport?.slice(0, 5) || [];
  };

  const topDiagnoses = getTopDiagnoses();

  const renderFinancialReport = () => (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shadow-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-gray-600 text-sm font-medium">Total Attendances</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.totalAttendances}</p>
          <p className="text-xs text-gray-500 mt-2 font-medium">Selected period</p>
        </div>

        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center shadow-lg">
              <DollarSign className="w-6 h-6 text-emerald-600" />
            </div>
            <span className="text-gray-600 text-sm font-medium">Total Revenue</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">${stats.totalRevenue.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-2 font-medium">Selected period</p>
        </div>

        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center shadow-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-gray-600 text-sm font-medium">Amount Paid</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">${stats.totalPaid.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-2 font-medium">Collected</p>
        </div>

        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center shadow-lg">
              <DollarSign className="w-6 h-6 text-red-600" />
            </div>
            <span className="text-gray-600 text-sm font-medium">Outstanding</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            ${stats.outstandingBalance.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 mt-2 font-medium">Pending payment</p>
        </div>
      </div>

      {/* Charts and Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Mode Breakdown */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6">
          <div className="flex items-center gap-3 mb-6">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">
              Revenue by Payment Mode
            </h2>
          </div>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-3">
                <span className="text-gray-600 font-medium">Cash</span>
                <span className="font-bold text-gray-900">${paymentModeBreakdown.cash.toFixed(2)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-blue-600 to-teal-600 h-3 rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      stats.totalRevenue > 0
                        ? (paymentModeBreakdown.cash / stats.totalRevenue) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-3">
                <span className="text-gray-600 font-medium">NHIS</span>
                <span className="font-bold text-gray-900">${paymentModeBreakdown.nhis.toFixed(2)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-green-600 to-emerald-600 h-3 rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      stats.totalRevenue > 0
                        ? (paymentModeBreakdown.nhis / stats.totalRevenue) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-3">
                <span className="text-gray-600 font-medium">Private Insurance</span>
                <span className="font-bold text-gray-900">
                  ${paymentModeBreakdown.insurance.toFixed(2)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-purple-600 to-pink-600 h-3 rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      stats.totalRevenue > 0
                        ? (paymentModeBreakdown.insurance / stats.totalRevenue) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Breakdown */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-bold text-gray-900">Monthly Revenue</h2>
          </div>
          {activeReport?.breakdown?.length > 0 ? (
            <div className="space-y-4">
              {activeReport.breakdown.slice(0, 6).map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-blue-600 bg-blue-100 w-8 h-8 rounded-full flex items-center justify-center">
                      {item.month}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">{item.year}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900 bg-white px-3 py-1 rounded-full border">
                    ${item.totalRevenue?.toFixed(2) || '0.00'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No data available for selected period</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderInsuranceReport = () => (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Insurance Claims Report</h2>
      {activeReport?.claimsReport?.length > 0 ? (
        <div className="space-y-4">
          {activeReport.claimsReport.map((claim: any, index: number) => (
            <div key={index} className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-6 border border-gray-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Provider</p>
                  <p className="font-semibold text-gray-900">{claim.insuranceProvider}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Status</p>
                  <p className="font-semibold text-gray-900 capitalize">{claim.status}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Total Claims</p>
                  <p className="font-semibold text-gray-900">{claim.totalClaims}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Approved Amount</p>
                  <p className="font-semibold text-gray-900">${claim.totalApprovedAmount?.toFixed(2)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">No insurance claims data for selected period</p>
        </div>
      )}
    </div>
  );

  const renderClinicalReport = () => (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Clinical Report</h2>
      {topDiagnoses.length > 0 ? (
        <div className="space-y-4">
          {topDiagnoses.map((diagnosis: any, index: number) => (
            <div key={index} className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-4">
                <span className="text-sm font-bold text-blue-600 bg-blue-100 w-8 h-8 rounded-full flex items-center justify-center">
                  #{index + 1}
                </span>
                <div>
                  <span className="text-sm font-semibold text-gray-900">{diagnosis.diagnosis}</span>
                  <p className="text-xs text-gray-600">{diagnosis.icdCode}</p>
                </div>
              </div>
              <span className="text-sm font-bold text-gray-900 bg-white px-3 py-1 rounded-full border">
                {diagnosis.totalCases} {diagnosis.totalCases === 1 ? 'case' : 'cases'}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">No clinical data for selected period</p>
        </div>
      )}
    </div>
  );

  const renderAttendanceReport = () => (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Attendance Report</h2>
      {activeReport?.attendanceReport?.length > 0 ? (
        <div className="space-y-4">
          {activeReport.attendanceReport.map((attendance: any, index: number) => (
            <div key={index} className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-6 border border-gray-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Type</p>
                  <p className="font-semibold text-gray-900 capitalize">{attendance.attendanceType?.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Status</p>
                  <p className="font-semibold text-gray-900 capitalize">{attendance.status}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Count</p>
                  <p className="font-semibold text-gray-900">{attendance.count}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Month</p>
                  <p className="font-semibold text-gray-900">{attendance.month}/{attendance.year}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">No attendance data for selected period</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-blue-900 rounded-2xl p-8 text-white shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Hospital className="w-8 h-8" />
                Reports & Analytics
              </h1>
              <p className="text-blue-100 mt-2">View system statistics and reports</p>
            </div>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-sm text-white rounded-xl hover:bg-white/20 transition-all duration-200 border border-white/20 font-semibold"
            >
              <Download className="w-5 h-5" />
              Export Report
            </button>
          </div>
        </div>

        {/* Report Type Selector */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6">
          <div className="flex flex-wrap gap-4">
            {[
              { key: 'financial', label: 'Financial', icon: DollarSign },
              { key: 'insurance', label: 'Insurance Claims', icon: FileText },
              { key: 'clinical', label: 'Clinical', icon: Activity },
              { key: 'attendance', label: 'Attendance', icon: Users },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setReportType(key as any)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                  reportType === key
                    ? 'bg-gradient-to-r from-blue-600 to-teal-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Icon className="w-5 h-5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6">
          <div className="flex items-center gap-4">
            <Calendar className="w-6 h-6 text-blue-600" />
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Start Date
                </label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  End Date
                </label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Report Content */}
        {isLoading ? (
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg">Loading report data...</p>
          </div>
        ) : (
          <>
            {reportType === 'financial' && renderFinancialReport()}
            {reportType === 'insurance' && renderInsuranceReport()}
            {reportType === 'clinical' && renderClinicalReport()}
            {reportType === 'attendance' && renderAttendanceReport()}
          </>
        )}
      </div>
    </div>
  );
}
