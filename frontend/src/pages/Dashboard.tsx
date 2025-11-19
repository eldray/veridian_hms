// src/pages/Dashboard.tsx
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
  getStockItems
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
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuthStore();
  const { success, error: toastError } = useToast();

  const [stats, setStats] = useState({
    totalPatients: 0,
    todayVisits: 0,
    activeAdmissions: 0,
    pendingBills: 0,
    pendingClaims: 0,
    lowStockItems: 0
  });

  const [recentAttendances, setRecentAttendances] = useState<any[]>([]);
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

    try {
      const [
        patientRes,
        attendanceRes,
        billRes,
        admissionRes,
        claimRes,
        stockRes,
        recentAttendanceRes
      ] = await Promise.allSettled([
        getPatients(),
        getAttendances({ dateFrom: todayStart, dateTo: todayEnd }),
        getBills({ status: 'pending,partial' }),
        getAdmissions({ status: 'admitted' }),
        getInsuranceClaims({ status: 'submitted,processing' }),
        getStockItems(),
        getAttendances({ limit: 10, sortBy: 'dateTime', sortOrder: 'desc' })
      ]);

      const newErrors: string[] = [];
      let totalPatients = 0;
      let todayVisits = 0;
      let activeAdmissions = 0;
      let pendingBills = 0;
      let pendingClaims = 0;
      let lowStockItems = 0;
      let recentAttendancesList: any[] = [];

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

      if (billRes.status === 'fulfilled') {
        pendingBills = Array.isArray(billRes.value) ? billRes.value.length : 0;
      } else {
        newErrors.push('Bills');
      }

      if (admissionRes.status === 'fulfilled') {
        activeAdmissions = Array.isArray(admissionRes.value) ? admissionRes.value.length : 0;
      } else {
        newErrors.push('Admissions');
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

      if (recentAttendanceRes.status === 'fulfilled') {
        recentAttendancesList = Array.isArray(recentAttendanceRes.value) 
          ? recentAttendanceRes.value.slice(0, 10)
          : [];
      }

      setStats({
        totalPatients,
        todayVisits,
        activeAdmissions,
        pendingBills,
        pendingClaims,
        lowStockItems
      });

      setRecentAttendances(recentAttendancesList);
      setErrors(newErrors);
      success('Dashboard refreshed', 'All data is up to date.');
    } catch (err) {
      toastError('Refresh failed', 'Some data could not be loaded.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const healthTrends = [
    { disease: 'Covid-19', patients: 498, recovers: 325, percentage: 82, isHighRisk: true },
    { disease: 'Heart Disease', patients: 354, recovers: 82, percentage: 65, isHighRisk: false },
    { disease: 'Diabetes', patients: 229, recovers: 43, percentage: 58, isHighRisk: false },
    { disease: 'TBC', patients: 58, recovers: 53, percentage: 91, isHighRisk: true },
    { disease: 'Dengue Fever', patients: 663, recovers: 543, percentage: 82, isHighRisk: false },
  ];

  const findPatientForAttendance = (attendance: any) => {
    return attendance.patient || { fullName: `Patient ${attendance.patientId?.toString().slice(-4) || 'Unknown'}` };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] border-[var(--icon-green-bg)]';
      case 'cancelled': return 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] border-[var(--icon-red-bg)]';
      case 'admitted': return 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] border-[var(--icon-purple-bg)]';
      case 'pending': return 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)] border-[var(--icon-yellow-bg)]';
      case 'active': return 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] border-[var(--icon-cyan-bg)]';
      default: return 'bg-[var(--bg-main)] text-[var(--text-secondary)] border-[var(--border-color)]';
    }
  };

  const quickActions = [
    { icon: UserPlus, label: 'New Patient', path: '/dashboard/patients', color: 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-text)] hover:text-white' },
    { icon: Calendar, label: 'Attendance', path: '/dashboard/attendance', color: 'bg-[var(--icon-orange-bg)] text-[var(--icon-orange-text)] hover:bg-[var(--icon-orange-text)] hover:text-white' },
    { icon: Bed, label: 'Admission', path: '/dashboard/admissions', color: 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] hover:bg-[var(--icon-green-text)] hover:text-white' },
    { icon: DollarSign, label: 'Billing', path: '/dashboard/billing', color: 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] hover:bg-[var(--icon-purple-text)] hover:text-white' },
    { icon: Pill, label: 'Pharmacy', path: '/dashboard/pharmacy', color: 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)] hover:bg-[var(--icon-yellow-text)] hover:text-white' },
    { icon: BarChart3, label: 'Reports', path: '/dashboard/reports', color: 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] hover:bg-[var(--icon-red-text)] hover:text-white' },
  ];

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)]">
        <div className="text-center bg-[var(--bg-card)] p-8 rounded-2xl shadow-lg border border-[var(--border-color)]">
          <AlertCircle className="w-16 h-16 text-[var(--icon-cyan-text)] mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Session Expired</h2>
          <p className="text-[var(--text-secondary)]">Please log in to access the dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Statistical Summary</h1>
        </div>
        <button
          onClick={loadDashboardData}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all disabled:opacity-50 text-sm text-[var(--text-primary)]"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Error Summary */}
      {errors.length > 0 && (
        <div className="bg-[var(--icon-red-bg)] border border-[var(--icon-red-text)] rounded-xl p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[var(--icon-red-text)]" />
              <p className="text-[var(--icon-red-text)] font-medium text-xs">Failed to load: {errors.join(', ')}</p>
            </div>
            <button
              onClick={loadDashboardData}
              className="px-3 py-1.5 bg-[var(--icon-red-text)] text-white text-xs rounded-lg hover:bg-[var(--icon-red-text)]/80 transition"
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
          {/* Stats Grid - Smaller Cards in 3x2 layout */}
          <div className="grid grid-cols-3 gap-4">
            {/* Number of Patients */}
            <Link to="/dashboard/patients" className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm hover:shadow-md transition-all border border-[var(--border-color)]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-[var(--text-secondary)]">Number of patients</span>
                <div className="w-8 h-8 bg-[var(--icon-cyan-bg)] rounded-full flex items-center justify-center">
                  <Users className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                </div>
              </div>
              {isLoading ? (
                <div className="h-7 bg-[var(--bg-main)] rounded animate-pulse"></div>
              ) : (
                <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.totalPatients}</div>
              )}
            </Link>

            {/* Daily Visit */}
            <Link to="/dashboard/attendance" className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm hover:shadow-md transition-all border border-[var(--border-color)]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-[var(--text-secondary)]">Daily Visit</span>
                <div className="w-8 h-8 bg-[var(--icon-orange-bg)] rounded-full flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-[var(--icon-orange-text)]" />
                </div>
              </div>
              {isLoading ? (
                <div className="h-7 bg-[var(--bg-main)] rounded animate-pulse"></div>
              ) : (
                <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.todayVisits}</div>
              )}
            </Link>

            {/* Room Capacity (Active Admissions) */}
            <Link to="/dashboard/admissions" className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm hover:shadow-md transition-all border border-[var(--border-color)]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-[var(--text-secondary)]">Room Capacity</span>
                <div className="w-8 h-8 bg-[var(--icon-green-bg)] rounded-full flex items-center justify-center">
                  <Bed className="w-4 h-4 text-[var(--icon-green-text)]" />
                </div>
              </div>
              {isLoading ? (
                <div className="h-7 bg-[var(--bg-main)] rounded animate-pulse"></div>
              ) : (
                <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.activeAdmissions}</div>
              )}
            </Link>

            {/* Pending Bills */}
            <Link to="/dashboard/billing" className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm hover:shadow-md transition-all border border-[var(--border-color)]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-[var(--text-secondary)]">Pending Bills</span>
                <div className="w-8 h-8 bg-[var(--icon-purple-bg)] rounded-full flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-[var(--icon-purple-text)]" />
                </div>
              </div>
              {isLoading ? (
                <div className="h-7 bg-[var(--bg-main)] rounded animate-pulse"></div>
              ) : (
                <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.pendingBills}</div>
              )}
            </Link>

            {/* Insurance Claims */}
            <Link to="/dashboard/insurance-claims" className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm hover:shadow-md transition-all border border-[var(--border-color)]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-[var(--text-secondary)]">Insurance Claims</span>
                <div className="w-8 h-8 bg-[var(--icon-yellow-bg)] rounded-full flex items-center justify-center">
                  <Shield className="w-4 h-4 text-[var(--icon-yellow-text)]" />
                </div>
              </div>
              {isLoading ? (
                <div className="h-7 bg-[var(--bg-main)] rounded animate-pulse"></div>
              ) : (
                <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.pendingClaims}</div>
              )}
            </Link>

            {/* Low Stock Items */}
            <Link to="/dashboard/stock" className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm hover:shadow-md transition-all border border-[var(--border-color)]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-[var(--text-secondary)]">Low Stock Items</span>
                <div className="w-8 h-8 bg-[var(--icon-red-bg)] rounded-full flex items-center justify-center">
                  <Package className="w-4 h-4 text-[var(--icon-red-text)]" />
                </div>
              </div>
              {isLoading ? (
                <div className="h-7 bg-[var(--bg-main)] rounded animate-pulse"></div>
              ) : (
                <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.lowStockItems}</div>
              )}
            </Link>
          </div>

          {/* Health Trends */}
          <div className="bg-[var(--bg-card)] rounded-xl p-6 shadow-sm border border-[var(--border-color)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Health Trends</h3>
            </div>
            <div className="flex gap-4 mb-4 border-b border-[var(--border-color)]">
              <button className="pb-2 border-b-2 border-[var(--text-primary)] text-sm font-medium text-[var(--text-primary)]">Diseases</button>
              <button className="pb-2 text-sm text-[var(--text-secondary)]">Characteristic</button>
              <button className="pb-2 text-sm text-[var(--text-secondary)]">Patients</button>
              <button className="pb-2 text-sm text-[var(--text-secondary)]">Recovers</button>
            </div>
            <div className="space-y-3">
              {healthTrends.map((trend, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <span className="text-sm text-[var(--text-primary)] w-28">{trend.disease}</span>
                  <div className="flex-1 bg-[var(--bg-main)] h-2 rounded-full overflow-hidden">
                    <div 
                      className={trend.isHighRisk ? 'bg-[var(--icon-red-text)] h-full' : 'bg-[var(--icon-cyan-text)] h-full'}
                      style={{ width: `${trend.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium w-12 text-right text-[var(--text-primary)]">{trend.patients}</span>
                  <span className="text-sm w-12 text-right text-[var(--text-secondary)]">{trend.recovers}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-[var(--bg-card)] rounded-xl p-6 shadow-sm border border-[var(--border-color)]">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Quick Actions</h3>
              <p className="text-xs text-[var(--text-secondary)]">Common tasks</p>
            </div>
            <div className="grid grid-cols-6 gap-4">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <Link 
                    key={index} 
                    to={action.path} 
                    className={`flex flex-col items-center gap-3 p-4 ${action.color} rounded-xl hover:shadow-lg transition-all duration-200 border border-transparent`}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-xs text-center font-medium">{action.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column - Today's Visit (Extended Height) */}
        <div className="col-span-1">
          <div className="bg-[var(--bg-card)] rounded-xl p-6 shadow-sm border border-[var(--border-color)] h-full">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Today's Visit</h3>
              <p className="text-xs text-[var(--text-secondary)]">Latest consultations</p>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
                  <div key={`skeleton-${i}`} className="p-3 bg-[var(--bg-main)] rounded-lg animate-pulse">
                    <div className="h-4 bg-[var(--border-color)] rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-[var(--border-color)] rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : recentAttendances.length === 0 ? (
              <div className="text-center py-10">
                <Stethoscope className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
                <p className="text-[var(--text-secondary)]">No visits today</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar">
                {recentAttendances.map((a) => {
                  const patient = findPatientForAttendance(a);
                  return (
                    <div 
                      key={a._id || a.id || `attendance-${a.attendanceNumber || Math.random()}`} 
                      className="flex items-center justify-between p-3 bg-[var(--bg-main)] rounded-lg border border-[var(--border-color)] hover:border-[var(--icon-cyan-text)] transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-[var(--icon-cyan-bg)] rounded-lg flex items-center justify-center">
                          <Users className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                        </div>
                        <div>
                          <p className="font-medium text-sm text-[var(--text-primary)]">
                            {patient.fullName}
                          </p>
                          <p className="text-xs text-[var(--text-secondary)]">
                            {a.diagnoses?.[0]?.diagnosisId?.name || 'No diagnosis'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right text-xs">
                        <div className="flex items-center gap-1 text-[var(--text-secondary)] mb-1">
                          <Clock className="w-3.5 h-3.5" />
                          {a.dateTime ? new Date(a.dateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </div>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(a.status)}`}>
                          {a.status || '—'}
                        </span>
                      </div>
                    </div>
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