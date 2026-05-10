// src/pages/Dashboard.tsx - UPDATED WITH WORKING INSURANCE CLAIMS
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { usePatientStore } from '../store/patientStore';
import { useAttendanceStore } from '../store/attendanceStore';
import { useToast } from '../store/toastStore';
import {
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
  const { patients, loadPatients } = usePatientStore();
  const { attendances, getAttendances } = useAttendanceStore();
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

  // Helper to check if user has role
  const hasRole = (roles: string[]) => {
    return roles.includes(user?.role || '');
  };

  const getTodayRange = () => {
    const today = new Date();
    const start = new Date(today.setHours(0, 0, 0, 0)).toISOString();
    const end = new Date(today.setHours(23, 59, 59, 999)).toISOString();
    return { start, end };
  };

  // Helper to extract array from API response
  const extractArrayFromResponse = (response: any): any[] => {
    if (!response) return [];
    
    // If response has success and data property
    if (response.success && Array.isArray(response.data)) {
      return response.data;
    }
    // If response has data property that's an array
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    }
    // If response is directly an array
    if (Array.isArray(response)) {
      return response;
    }
    // If response has claims property (for insurance claims)
    if (response.claims && Array.isArray(response.claims)) {
      return response.claims;
    }
    // If response has bills property
    if (response.bills && Array.isArray(response.bills)) {
      return response.bills;
    }
    // If response has patients property
    if (response.patients && Array.isArray(response.patients)) {
      return response.patients;
    }
    // If response has attendances property
    if (response.attendances && Array.isArray(response.attendances)) {
      return response.attendances;
    }
    
    console.warn('Could not extract array from response:', response);
    return [];
  };

  const loadDashboardData = async () => {
    setIsLoading(true);
    setRefreshing(true);
    setErrors([]);

    const { start: todayStart, end: todayEnd } = getTodayRange();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    try {
      console.log('🔄 Loading dashboard data for role:', user?.role);

      // Load patients and attendances using stores
      await Promise.all([
        loadPatients(),
        getAttendances()
      ]);

      const totalPatients = patients.length;
      
      const todayVisits = attendances.filter(att => {
        const attDate = new Date(att.dateTime || att.createdAt);
        return attDate >= new Date(todayStart) && attDate <= new Date(todayEnd);
      }).length;

      const recentAttendancesList = [...attendances]
        .sort((a, b) => new Date(b.dateTime || b.createdAt).getTime() - new Date(a.dateTime || a.createdAt).getTime())
        .slice(0, 10);

      console.log('✅ Store data loaded:', {
        totalPatients,
        todayVisits, 
        totalAttendances: attendances.length,
        recentAttendances: recentAttendancesList.length
      });

      // Build API calls based on user role
      const apiCalls: Promise<any>[] = [];
      
      apiCalls.push(getAdmissions({ status: 'admitted' }));
      apiCalls.push(getStockItems());
      apiCalls.push(getDashboardStats());
      apiCalls.push(getAppointmentStatistics({ dateFrom: todayStart }));

      const isAccountsStaff = hasRole(['admin', 'accounts']);
      const isClinicalStaff = hasRole(['admin', 'doctor', 'nurse', 'midwife', 'lab_tech', 'sonographer']);
      const isAdminOnly = hasRole(['admin']);
      
      if (isAccountsStaff) {
        apiCalls.push(getBills({ status: 'pending,partial' }));
        apiCalls.push(getInsuranceClaims({ status: 'submitted,pending' }));
        apiCalls.push(getFinancialReport({
          period: 'today',
          dateFrom: todayStart,
          dateTo: todayEnd
        }));
      } else {
        apiCalls.push(Promise.resolve(null));
        apiCalls.push(Promise.resolve(null));
        apiCalls.push(Promise.resolve(null));
      }
      
      if (isClinicalStaff) {
        apiCalls.push(getClinicalReport({
          period: '30days',
          dateFrom: thirtyDaysAgo.toISOString(),
          dateTo: todayEnd
        }));
      } else {
        apiCalls.push(Promise.resolve(null));
      }

      const [
        admissionRes,
        stockRes,
        dashboardStatsRes,
        appointmentStatsRes,
        billRes,
        claimRes,
        financialReportRes,
        clinicalReportRes
      ] = await Promise.allSettled(apiCalls);

      console.log('📊 API Results:', {
        admissions: admissionRes.status,
        stock: stockRes.status,
        dashboardStats: dashboardStatsRes.status,
        appointments: appointmentStatsRes.status,
        bills: isAccountsStaff ? billRes.status : 'skipped',
        claims: isAccountsStaff ? claimRes.status : 'skipped',
        financial: isAccountsStaff ? financialReportRes.status : 'skipped',
        clinical: isClinicalStaff ? clinicalReportRes.status : 'skipped'
      });

      const newErrors: string[] = [];
      let activeAdmissions = 0;
      let lowStockItems = 0;
      let scheduledAppointments = 0;
      let totalRevenue = 0;
      let pendingBills = 0;
      let pendingClaims = 0;
      let diagnosisTrendsList: any[] = [];

      // Process admissions
      if (admissionRes.status === 'fulfilled') {
        const admissionsArray = extractArrayFromResponse(admissionRes.value);
        activeAdmissions = admissionsArray.filter((a: any) => a.status === 'admitted').length;
      } else {
        newErrors.push('Admissions');
      }

      // Process stock
      if (stockRes.status === 'fulfilled') {
        const stockItemsArray = extractArrayFromResponse(stockRes.value);
        lowStockItems = stockItemsArray.filter((item: any) => 
          (item.currentStock || 0) <= (item.reorderLevel || 0)
        ).length;
      } else {
        newErrors.push('Stock');
      }

      // Process dashboard stats
      if (dashboardStatsRes.status === 'fulfilled' && dashboardStatsRes.value) {
        const dashboardData = dashboardStatsRes.value;
        totalRevenue = dashboardData.totalRevenue || dashboardData.data?.totalRevenue || 0;
      }

      // Process appointments
      if (appointmentStatsRes.status === 'fulfilled' && appointmentStatsRes.value) {
        const appointmentData = appointmentStatsRes.value;
        scheduledAppointments = appointmentData.scheduled || appointmentData.today || appointmentData.data?.scheduled || 0;
      } else {
        newErrors.push('Appointments');
      }

      // Process bills (accounts only) - FIXED
      if (isAccountsStaff && billRes.status === 'fulfilled' && billRes.value) {
        const billsArray = extractArrayFromResponse(billRes.value);
        pendingBills = billsArray.filter((bill: any) => 
          bill.status === 'pending' || bill.status === 'partial'
        ).length;
        console.log(`💰 Bills loaded: ${billsArray.length} total, ${pendingBills} pending`);
      } else if (isAccountsStaff && billRes.status === 'rejected') {
        newErrors.push('Bills');
        console.warn('⚠️ Failed to load bills data');
      }

      // Process claims (accounts only) - FIXED
      if (isAccountsStaff && claimRes.status === 'fulfilled' && claimRes.value) {
        const claimsArray = extractArrayFromResponse(claimRes.value);
        // Filter for pending claims (submitted status)
        pendingClaims = claimsArray.filter((claim: any) => 
          claim.status === 'submitted' || claim.status === 'pending' || claim.status === 'draft'
        ).length;
        console.log(`📋 Claims loaded: ${claimsArray.length} total, ${pendingClaims} pending`);
      } else if (isAccountsStaff && claimRes.status === 'rejected') {
        newErrors.push('Claims');
        console.warn('⚠️ Failed to load claims data');
      }

      // Process financial report (accounts only)
      if (isAccountsStaff && financialReportRes.status === 'fulfilled' && financialReportRes.value) {
        const financialData = financialReportRes.value;
        const reportRevenue = financialData.totalRevenue || financialData.data?.totalRevenue || 0;
        if (reportRevenue > 0) {
          totalRevenue = reportRevenue;
        }
      }

      // Process clinical report (clinical staff only)
      if (isClinicalStaff && clinicalReportRes.status === 'fulfilled' && clinicalReportRes.value) {
        const clinicalData = clinicalReportRes.value;
        diagnosisTrendsList = clinicalData.diagnosisTrends || clinicalData.topDiagnoses || clinicalData.data?.diagnosisTrends || [];
      }

      // Generate diagnosis trends from recent attendances if clinical report failed
      if (diagnosisTrendsList.length === 0 && recentAttendancesList.length > 0) {
        const diagnosisCount: Record<string, number> = {};
        
        recentAttendancesList.forEach((attendance: any) => {
          if (attendance.AttendanceDiagnosis && Array.isArray(attendance.AttendanceDiagnosis)) {
            attendance.AttendanceDiagnosis.forEach((diag: any) => {
              const diagnosisName = diag.Diagnosis?.name || diag.icdCode || 'Unknown Diagnosis';
              diagnosisCount[diagnosisName] = (diagnosisCount[diagnosisName] || 0) + 1;
            });
          }
        });

        diagnosisTrendsList = Object.entries(diagnosisCount)
          .map(([name, count]) => ({ disease: name, patients: count }))
          .sort((a, b) => b.patients - a.patients)
          .slice(0, 5);
      }

      console.log('🎯 Final stats:', {
        totalPatients,
        todayVisits,
        activeAdmissions,
        pendingBills,
        pendingClaims,
        lowStockItems,
        totalRevenue,
        scheduledAppointments,
        recentAttendancesCount: recentAttendancesList.length
      });

      setStats({
        totalPatients,
        todayVisits,
        activeAdmissions,
        pendingBills,
        pendingClaims,
        lowStockItems,
        totalRevenue,
        scheduledAppointments,
        completedProcedures: 0
      });

      setRecentAttendances(recentAttendancesList);
      setDiagnosisTrends(diagnosisTrendsList);
      setErrors(newErrors);
      
      if (newErrors.length === 0) {
        success('Dashboard refreshed', 'All data is up to date.');
      } else if (newErrors.length > 0 && newErrors.length < 4) {
        toastError('Partial data loaded', `Some data could not be loaded: ${newErrors.join(', ')}`);
      }
      
    } catch (err) {
      console.error('💥 Dashboard load error:', err);
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

  const getPatientFullName = (attendance: any) => {
    if (!attendance.Patient) return 'Unknown Patient';
    return `${attendance.Patient.surname || ''} ${attendance.Patient.otherNames || ''}`.trim();
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
    { icon: UserPlus, label: 'New Patient', path: '/dashboard/patients', color: 'bg-cyan-100 text-cyan-600 hover:bg-cyan-600 hover:text-white', roles: ['admin', 'doctor', 'nurse', 'midwife', 'records', 'sonographer'] },
    { icon: Calendar, label: 'Attendance', path: '/dashboard/attendance', color: 'bg-orange-100 text-orange-600 hover:bg-orange-600 hover:text-white', roles: ['admin', 'doctor', 'nurse', 'midwife', 'sonographer'] },
    { icon: Bed, label: 'Admission', path: '/dashboard/admissions', color: 'bg-green-100 text-green-600 hover:bg-green-600 hover:text-white', roles: ['admin', 'doctor', 'nurse', 'midwife'] },
    { icon: DollarSign, label: 'Billing', path: '/dashboard/billing', color: 'bg-purple-100 text-purple-600 hover:bg-purple-600 hover:text-white', roles: ['admin', 'accounts'] },
    { icon: Pill, label: 'Pharmacy', path: '/dashboard/pharmacy', color: 'bg-yellow-100 text-yellow-600 hover:bg-yellow-600 hover:text-white', roles: ['admin', 'pharmacist', 'doctor'] },
    { icon: BarChart3, label: 'Reports', path: '/dashboard/reports', color: 'bg-red-100 text-red-600 hover:bg-red-600 hover:text-white', roles: ['admin', 'accounts', 'records'] },
  ];

  // Filter quick actions based on user role
  const filteredQuickActions = quickActions.filter(action => 
    action.roles.includes(user?.role || '')
  );

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
      {errors.length > 0 && errors.length < 4 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <p className="text-yellow-600 font-medium text-sm">Some data could not be loaded: {errors.join(', ')}</p>
            </div>
            <button
              onClick={loadDashboardData}
              className="px-3 py-1.5 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700 transition"
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
            {/* Total Patients - All roles */}
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

            {/* Today's Visits - Clinical roles */}
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

            {/* Active Admissions - Clinical roles */}
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

            {/* Pending Bills - Accounts only */}
            {hasRole(['admin', 'accounts']) ? (
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
            ) : (
              <Link to="/dashboard/appointments" className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-gray-600 font-medium">Scheduled</span>
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Activity className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                {isLoading ? (
                  <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                ) : (
                  <div className="text-2xl font-bold text-gray-900">{stats.scheduledAppointments}</div>
                )}
                <div className="text-xs text-gray-500 mt-1">Appointments</div>
              </Link>
            )}

            {/* Pending Claims - Accounts only */}
            {hasRole(['admin', 'accounts']) && (
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
            )}

            {/* Low Stock Items - Pharmacy roles */}
            {hasRole(['admin', 'pharmacist']) && (
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
            )}

            {/* Today's Revenue - Accounts only */}
            {hasRole(['admin', 'accounts']) && (
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
                  <div className="text-2xl font-bold text-gray-900">GH₵ {stats.totalRevenue.toFixed(2)}</div>
                )}
                <div className="text-xs text-gray-500 mt-1">Collected</div>
              </Link>
            )}
          </div>

          {/* Diagnosis Trends - Clinical roles only */}
          {hasRole(['admin', 'doctor', 'nurse', 'midwife']) && (
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
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900">Quick Actions</h3>
              <p className="text-sm text-gray-600">Common tasks and frequent operations</p>
            </div>
            <div className="grid grid-cols-6 gap-4">
              {filteredQuickActions.map((action, index) => {
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

        {/* Right Column - Recent Activity */}
        <div className="col-span-1">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 h-full">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900">Today's Activity</h3>
              <p className="text-sm text-gray-600">Latest patient visits</p>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={`skeleton-${i}`} className="p-3 bg-gray-100 rounded-lg animate-pulse">
                    <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : recentAttendances.length === 0 ? (
              <div className="text-center py-8">
                <Stethoscope className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No visits today</p>
                <p className="text-gray-400 text-xs mt-1">Patient visits will appear here</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {recentAttendances.map((attendance) => {
                  const fullName = getPatientFullName(attendance);
                  const patient = attendance.Patient || {};
                  
                  return (
                    <Link 
                      key={attendance.id} 
                      to={`/dashboard/attendance/${attendance.id}`}
                      className="block p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-gray-900 text-sm truncate flex-1">
                          {fullName}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-gray-500 ml-2">
                          {getPaymentModeIcon(attendance.paymentMode)}
                          <span>{getPaymentModeLabel(attendance.paymentMode)}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <div className="flex items-center gap-4">
                          <span className="font-medium">{patient.folderNumber || 'No Folder'}</span>
                          <span>{attendance.attendanceNumber}</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-500">
                          <Clock className="w-3 h-3" />
                          <span>{formatTime(attendance.dateTime || attendance.createdAt)}</span>
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