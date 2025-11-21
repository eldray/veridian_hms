// src/pages/Dashboard.tsx - UPDATED WITH SIMPLIFIED RECENT ACTIVITY
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import {
  getPatients,
  getAttendances,
  getBills,
  getAdmissions,
  getInsuranceClaims,
  getStockItems,
  getDashboardStats,
  getAppointmentStatistics,
  getFinancialReport,
  getClinicalReport
} from '../api';
import {
  RefreshCw,
  AlertCircle,
  Clock,
  Users,
  Calendar,
  Bed,
  DollarSign,
  Shield,
  Package,
  UserPlus,
  Pill,
  BarChart3,
  Stethoscope,
  FileText,
  TrendingUp,
  Activity,
  Heart,
  Syringe,
  CreditCard,
  Hospital
} from 'lucide-react';
import type { AttendanceStatus, BillStatus, ClaimStatus, Admission, PaymentMode } from '../types';

export default function Dashboard() {
  const { user } = useAuthStore();
  const { success, error: toastError } = useToast();

  const [stats, setStats] = useState({
    totalPatients: 0,
    todayVisits: 0,
    activeAdmissions: 0,
    pendingBills: 0,
    pendingClaims: 0,
    lowStockItems: 0,
    totalRevenue: 0,
    scheduledAppointments: 0,
    completedProcedures: 0
  });

  const [recentAttendances, setRecentAttendances] = useState<any[]>([]);
  const [diagnosisTrends, setDiagnosisTrends] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const getTodayRange = () => {
    const today = new Date();
    const start = new Date(today.setHours(0, 0, 0, 0)).toISOString();
    const end = new Date(today.setHours(23, 59, 59, 999)).toISOString();
    return { start, end };
  };

  const loadDashboardData = async () => {
    setIsLoading(true);
    setRefreshing(true);
    setErrors([]);

    const { start: todayStart, end: todayEnd } = getTodayRange();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    try {
      const [
        patientRes,
        attendanceRes,
        billRes,
        admissionRes,
        claimRes,
        stockRes,
        recentAttendanceRes,
        dashboardStatsRes,
        appointmentStatsRes,
        financialReportRes,
        clinicalReportRes
      ] = await Promise.allSettled([
        getPatients(),
        getAttendances({ dateFrom: todayStart, dateTo: todayEnd }),
        getBills({ status: 'pending,partial' }),
        getAdmissions({ status: 'admitted' }),
        getInsuranceClaims({ status: 'submitted,pending' }),
        getStockItems(),
        getAttendances({ 
          limit: 10, 
          sortBy: 'dateTime', 
          sortOrder: 'desc',
          include: 'patient'
        }),
        getDashboardStats(),
        getAppointmentStatistics({ dateFrom: todayStart }),
        getFinancialReport({
          period: 'today',
          dateFrom: todayStart,
          dateTo: todayEnd
        }),
        getClinicalReport({
          period: '30days',
          dateFrom: thirtyDaysAgo.toISOString(),
          dateTo: todayEnd
        })
      ]);

      const newErrors: string[] = [];
      let totalPatients = 0;
      let todayVisits = 0;
      let activeAdmissions = 0;
      let pendingBills = 0;
      let pendingClaims = 0;
      let lowStockItems = 0;
      let totalRevenue = 0;
      let scheduledAppointments = 0;
      let completedProcedures = 0;
      let recentAttendancesList: any[] = [];
      let diagnosisTrendsList: any[] = [];

      if (dashboardStatsRes.status === 'fulfilled' && dashboardStatsRes.value) {
        const dashboardData = dashboardStatsRes.value;
        totalPatients = dashboardData.totalPatients || 0;
        todayVisits = dashboardData.todayVisits || 0;
        activeAdmissions = dashboardData.activeAdmissions || 0;
        totalRevenue = dashboardData.totalRevenue || 0;
      } else {
        if (patientRes.status === 'fulfilled') {
          totalPatients = Array.isArray(patientRes.value) ? patientRes.value.length : 0;
        } else {
          newErrors.push('Patients');
        }

        if (attendanceRes.status === 'fulfilled') {
          todayVisits = Array.isArray(attendanceRes.value) ? attendanceRes.value.length : 0;
        } else {
          newErrors.push("Today's Visits");
        }

        if (admissionRes.status === 'fulfilled') {
          activeAdmissions = Array.isArray(admissionRes.value) ? admissionRes.value.length : 0;
        } else {
          newErrors.push('Admissions');
        }
      }

      if (financialReportRes.status === 'fulfilled' && financialReportRes.value) {
        const financialData = financialReportRes.value;
        totalRevenue = financialData.totalRevenue || totalRevenue;
      }

      if (clinicalReportRes.status === 'fulfilled' && clinicalReportRes.value) {
        const clinicalData = clinicalReportRes.value;
        diagnosisTrendsList = clinicalData.diagnosisTrends || clinicalData.topDiagnoses || [];
      }

      if (billRes.status === 'fulfilled') {
        pendingBills = Array.isArray(billRes.value) ? billRes.value.length : 0;
      } else {
        newErrors.push('Bills');
      }

      if (claimRes.status === 'fulfilled') {
        pendingClaims = Array.isArray(claimRes.value) ? claimRes.value.length : 0;
      } else {
        newErrors.push('Claims');
      }

      if (stockRes.status === 'fulfilled') {
        const stockItems = Array.isArray(stockRes.value) ? stockRes.value : [];
        lowStockItems = stockItems.filter((item: any) => 
          (item.currentStock || 0) <= (item.reorderLevel || 0)
        ).length;
      } else {
        newErrors.push('Stock');
      }

      if (appointmentStatsRes.status === 'fulfilled' && appointmentStatsRes.value) {
        const appointmentData = appointmentStatsRes.value;
        scheduledAppointments = appointmentData.scheduled || appointmentData.today || 0;
      }

      if (recentAttendanceRes.status === 'fulfilled') {
        recentAttendancesList = Array.isArray(recentAttendanceRes.value) 
          ? recentAttendanceRes.value.slice(0, 10)
          : [];
      }

      if (diagnosisTrendsList.length === 0 && recentAttendanceRes.status === 'fulfilled') {
        const allAttendances = Array.isArray(recentAttendanceRes.value) ? recentAttendanceRes.value : [];
        const diagnosisCount: Record<string, number> = {};
        
        allAttendances.forEach((attendance: any) => {
          if (attendance.diagnoses && Array.isArray(attendance.diagnoses)) {
            attendance.diagnoses.forEach((diag: any) => {
              const diagnosisName = diag.diagnosis?.name || diag.icdCode || 'Unknown Diagnosis';
              diagnosisCount[diagnosisName] = (diagnosisCount[diagnosisName] || 0) + 1;
            });
          }
        });

        diagnosisTrendsList = Object.entries(diagnosisCount)
          .map(([name, count]) => ({ disease: name, patients: count }))
          .sort((a, b) => b.patients - a.patients)
          .slice(0, 5);
      }

      setStats({
        totalPatients,
        todayVisits,
        activeAdmissions,
        pendingBills,
        pendingClaims,
        lowStockItems,
        totalRevenue,
        scheduledAppointments,
        completedProcedures
      });

      setRecentAttendances(recentAttendancesList);
      setDiagnosisTrends(diagnosisTrendsList);
      setErrors(newErrors);
      
      if (newErrors.length === 0) {
        success('Dashboard refreshed', 'All data is up to date.');
      } else {
        toastError('Partial data loaded', `Some data could not be loaded: ${newErrors.join(', ')}`);
      }
    } catch (err) {
      toastError('Refresh failed', 'Failed to load dashboard data.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': 
      case 'paid': 
      case 'discharged':
        return 'bg-green-100 text-green-800 border-green-200';
      
      case 'cancelled': 
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      
      case 'admitted': 
      case 'scheduled':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      
      case 'pending': 
      case 'draft':
      case 'submitted':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      
      case 'active': 
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      
      case 'partial':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      
      default: 
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getPaymentModeIcon = (mode: PaymentMode) => {
    switch (mode) {
      case 'nhis': return <Shield className="w-3.5 h-3.5 text-green-600" />;
      case 'private_insurance': return <Hospital className="w-3.5 h-3.5 text-blue-600" />;
      default: return <CreditCard className="w-3.5 h-3.5 text-gray-600" />;
    }
  };

  const getPaymentModeLabel = (mode: PaymentMode) => {
    const modeMap: Record<PaymentMode, string> = {
      'cash': 'Cash',
      'nhis': 'NHIS',
      'private_insurance': 'Insurance'
    };
    return modeMap[mode] || 'Cash';
  };

  const getPatientFullName = (patient: any) => {
    if (!patient) return 'Unknown Patient';
    return `${patient.surname || ''} ${patient.otherNames || ''}`.trim();
  };

  const formatTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return '—';
    }
  };

  const quickActions = [
    { icon: UserPlus, label: 'New Patient', path: '/dashboard/patients', color: 'bg-cyan-100 text-cyan-600 hover:bg-cyan-600 hover:text-white' },
    { icon: Calendar, label: 'Attendance', path: '/dashboard/attendance', color: 'bg-orange-100 text-orange-600 hover:bg-orange-600 hover:text-white' },
    { icon: Bed, label: 'Admission', path: '/dashboard/admissions', color: 'bg-green-100 text-green-600 hover:bg-green-600 hover:text-white' },
    { icon: DollarSign, label: 'Billing', path: '/dashboard/billing', color: 'bg-purple-100 text-purple-600 hover:bg-purple-600 hover:text-white' },
    { icon: Pill, label: 'Pharmacy', path: '/dashboard/pharmacy', color: 'bg-yellow-100 text-yellow-600 hover:bg-yellow-600 hover:text-white' },
    { icon: BarChart3, label: 'Reports', path: '/dashboard/reports', color: 'bg-red-100 text-red-600 hover:bg-red-600 hover:text-white' },
  ];

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center bg-white p-8 rounded-2xl shadow-lg border border-gray-200">
          <AlertCircle className="w-16 h-16 text-cyan-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Session Expired</h2>
          <p className="text-gray-600">Please log in to access the dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-gray-600 mt-1">Welcome back, {user.fullName}</p>
        </div>
        <button
          onClick={loadDashboardData}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50 text-sm text-gray-700"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Error Summary */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <p className="text-red-600 font-medium text-sm">Failed to load: {errors.join(', ')}</p>
            </div>
            <button
              onClick={loadDashboardData}
              className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-4 gap-6">
        {/* Left Column - Stats and Health Trends */}
        <div className="col-span-3 space-y-6">
          {/* Enhanced Stats Grid */}
          <div className="grid grid-cols-4 gap-4">
            {/* Total Patients */}
            <Link to="/dashboard/patients" className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-600 font-medium">Total Patients</span>
                <div className="w-10 h-10 bg-cyan-100 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-cyan-600" />
                </div>
              </div>
              {isLoading ? (
                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
              ) : (
                <div className="text-2xl font-bold text-gray-900">{stats.totalPatients.toLocaleString()}</div>
              )}
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3 text-green-500" />
                <span className="text-xs text-green-600">Active</span>
              </div>
            </Link>

            {/* Today's Visits */}
            <Link to="/dashboard/attendance" className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-600 font-medium">Today's Visits</span>
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-orange-600" />
                </div>
              </div>
              {isLoading ? (
                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
              ) : (
                <div className="text-2xl font-bold text-gray-900">{stats.todayVisits}</div>
              )}
              <div className="text-xs text-gray-500 mt-1">Consultations</div>
            </Link>

            {/* Active Admissions */}
            <Link to="/dashboard/admissions" className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-600 font-medium">Active Admissions</span>
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Bed className="w-5 h-5 text-green-600" />
                </div>
              </div>
              {isLoading ? (
                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
              ) : (
                <div className="text-2xl font-bold text-gray-900">{stats.activeAdmissions}</div>
              )}
              <div className="text-xs text-gray-500 mt-1">In patients</div>
            </Link>

            {/* Total Revenue */}
            <Link to="/dashboard/billing" className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-600 font-medium">Today's Revenue</span>
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
              {isLoading ? (
                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
              ) : (
                <div className="text-2xl font-bold text-gray-900">${stats.totalRevenue.toFixed(2)}</div>
              )}
              <div className="text-xs text-gray-500 mt-1">Collected</div>
            </Link>

            {/* Pending Bills */}
            <Link to="/dashboard/billing" className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-600 font-medium">Pending Bills</span>
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <FileText className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              {isLoading ? (
                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
              ) : (
                <div className="text-2xl font-bold text-gray-900">{stats.pendingBills}</div>
              )}
              <div className="text-xs text-gray-500 mt-1">Unpaid</div>
            </Link>

            {/* Insurance Claims */}
            <Link to="/dashboard/insurance-claims" className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-600 font-medium">Pending Claims</span>
                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-yellow-600" />
                </div>
              </div>
              {isLoading ? (
                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
              ) : (
                <div className="text-2xl font-bold text-gray-900">{stats.pendingClaims}</div>
              )}
              <div className="text-xs text-gray-500 mt-1">Awaiting processing</div>
            </Link>

            {/* Low Stock Items */}
            <Link to="/dashboard/stock" className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-600 font-medium">Low Stock</span>
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Package className="w-5 h-5 text-red-600" />
                </div>
              </div>
              {isLoading ? (
                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
              ) : (
                <div className="text-2xl font-bold text-gray-900">{stats.lowStockItems}</div>
              )}
              <div className="text-xs text-gray-500 mt-1">Need reorder</div>
            </Link>

            {/* Scheduled Appointments */}
            <Link to="/dashboard/appointments" className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-600 font-medium">Appointments</span>
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Activity className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              {isLoading ? (
                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
              ) : (
                <div className="text-2xl font-bold text-gray-900">{stats.scheduledAppointments}</div>
              )}
              <div className="text-xs text-gray-500 mt-1">Scheduled today</div>
            </Link>
          </div>

          {/* Diagnosis Trends */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Diagnosis Trends</h3>
                <p className="text-sm text-gray-600">Most common diagnoses (Last 30 days)</p>
              </div>
              <Heart className="w-5 h-5 text-red-500" />
            </div>
            
            {diagnosisTrends.length === 0 ? (
              <div className="text-center py-8">
                <Syringe className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No diagnosis data available</p>
              </div>
            ) : (
              <div className="space-y-4">
                {diagnosisTrends.map((trend, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-blue-600 font-bold text-sm">{idx + 1}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900 flex-1">{trend.disease}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-gray-900">{trend.patients} patients</div>
                      {trend.percentage && (
                        <div className="text-xs text-gray-500">{trend.percentage}% of cases</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900">Quick Actions</h3>
              <p className="text-sm text-gray-600">Common tasks and frequent operations</p>
            </div>
            <div className="grid grid-cols-6 gap-4">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <Link 
                    key={index} 
                    to={action.path} 
                    className={`flex flex-col items-center gap-3 p-4 ${action.color} rounded-xl hover:shadow-lg transition-all duration-200 border border-transparent hover:scale-105`}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-xs text-center font-medium">{action.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column - Recent Activity (SIMPLIFIED) */}
        <div className="col-span-1">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 h-full">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900">Today's Activity</h3>
              <p className="text-sm text-gray-600">Latest patient visits</p>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={`skeleton-${i}`} className="p-3 bg-gray-100 rounded-lg animate-pulse">
                    <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : recentAttendances.length === 0 ? (
              <div className="text-center py-8">
                <Stethoscope className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No visits today</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {recentAttendances.map((attendance) => {
                  const patient = attendance.patient || {};
                  const fullName = getPatientFullName(patient);
                  
                  return (
                    <Link 
                      key={attendance.id} 
                      to={`/dashboard/attendance/${attendance.id}`}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-cyan-300 hover:bg-cyan-50 transition-all group"
                    >
                      <div className="w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-cyan-200 transition-colors">
                        <Users className="w-4 h-4 text-cyan-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">
                          {fullName}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                          <span className="bg-gray-100 px-1.5 py-0.5 rounded border">
                            {patient.folderNumber || 'No Folder'}
                          </span>
                          <span className="bg-gray-100 px-1.5 py-0.5 rounded border">
                            {attendance.attendanceNumber}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          {getPaymentModeIcon(attendance.paymentMode)}
                          <span>{getPaymentModeLabel(attendance.paymentMode)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          {formatTime(attendance.dateTime)}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}