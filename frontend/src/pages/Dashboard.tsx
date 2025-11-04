// src/pages/Dashboard.tsx - UPDATED HEADER
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { usePatientStore } from '../store/patientStore';
import { useAttendanceStore } from '../store/attendanceStore';
import { useBillingStore } from '../store/billingStore';
import { useAdmissionStore } from '../store/admissionStore';
import { useInsuranceStore } from '../store/insuranceStore';
import { useStockStore } from '../store/stockStore';
import {
  Users,
  FileText,
  DollarSign,
  BedDouble,
  TrendingUp,
  Activity,
  AlertCircle,
  RefreshCw,
  Calendar,
  Clock,
  ArrowRight,
  Heart,
  Stethoscope,
  Shield,
  Package,
  Building,
  ClipboardList,
  BarChart3,
  Hospital // ← ADDED HOSPITAL ICON
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuthStore();
  
  const { patients, loadPatients, isLoading: patientsLoading } = usePatientStore();
  const { attendances, getAttendances, isLoading: attendancesLoading } = useAttendanceStore();
  const { bills, getBills, isLoading: billsLoading } = useBillingStore();
  const { 
    admissions, 
    getAdmissions,
    isLoading: admissionsLoading 
  } = useAdmissionStore();
  const { 
    claims, 
    getInsuranceClaims, 
    isLoading: claimsLoading 
  } = useInsuranceStore();
  const { 
    stockItems, 
    getStockItems, 
    isLoading: stockLoading 
  } = useStockStore();
  
  const [refreshing, setRefreshing] = useState(false);
  const isLoading = patientsLoading || attendancesLoading || billsLoading || admissionsLoading || claimsLoading || stockLoading;

  const loadAllData = async () => {
    setRefreshing(true);
    try {
      await Promise.allSettled([
        loadPatients(),
        getAttendances(),
        getBills(),
        getAdmissions(),
        getInsuranceClaims(),
        getStockItems(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const activeAdmissions = admissions?.filter((admission: any) => 
    admission?.status === 'admitted'
  ) || [];

  const todayAttendances = (attendances || []).filter((attendance: any) => {
    if (!attendance?.dateTime) return false;
    return new Date(attendance.dateTime).toDateString() === new Date().toDateString();
  }).length;

  const pendingBills = (bills || []).filter((bill: any) => 
    bill?.status === 'pending' || bill?.status === 'partial'
  ).length;

  const pendingClaims = (claims || []).filter((claim: any) => 
    claim?.status === 'submitted' || claim?.status === 'processing'
  ).length;

  const lowStockItems = (stockItems || []).filter((item: any) => 
    item?.currentStock <= item?.reorderLevel
  ).length;

  const stats = [
    {
      name: 'Total Patients',
      value: patients?.length ?? 0,
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-500',
      description: 'Registered patients',
      trend: '+12%',
      path: '/dashboard/patients'
    },
    {
      name: "Today's Visits",
      value: todayAttendances,
      icon: Activity,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-500',
      description: 'Patient visits today',
      trend: '+5%',
      path: '/dashboard/attendance'
    },
    {
      name: 'Active Admissions',
      value: activeAdmissions?.length ?? 0,
      icon: BedDouble,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-500',
      description: 'Currently admitted',
      trend: '-2%',
      path: '/dashboard/admissions'
    },
    {
      name: 'Pending Bills',
      value: pendingBills,
      icon: DollarSign,
      color: 'from-amber-500 to-amber-600',
      bgColor: 'bg-amber-500',
      description: 'Awaiting payment',
      trend: '+8%',
      path: '/dashboard/billing'
    },
    {
      name: 'Insurance Claims',
      value: pendingClaims,
      icon: Shield,
      color: 'from-indigo-500 to-indigo-600',
      bgColor: 'bg-indigo-500',
      description: 'Pending approval',
      trend: '+15%',
      path: '/dashboard/insurance-claims'
    },
    {
      name: 'Low Stock Items',
      value: lowStockItems,
      icon: Package,
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-500',
      description: 'Need restocking',
      trend: '+3%',
      path: '/dashboard/stock'
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'admitted': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'pending': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'active': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'discharged': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const recentAttendances = (attendances || [])
    .slice()
    .sort((a: any, b: any) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())
    .slice(0, 5);

  const hasData = patients?.length || attendances?.length || bills?.length || admissions?.length;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center bg-white p-8 rounded-2xl shadow-lg border border-blue-100">
          <AlertCircle className="w-16 h-16 text-blue-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Session Expired</h2>
          <p className="text-gray-600">Please log in to access the dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 bg-gradient-to-br from-slate-50 via-blue-50 to-gray-50 min-h-screen">
      {/* UPDATED HEADER - Consistent with Attendance component */}
      <div className="bg-gradient-to-r from-slate-800 to-blue-900 rounded-2xl p-8 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20">
              <Hospital className="w-8 h-8 text-white" /> {/* ← CHANGED FROM Heart TO Hospital */}
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">Dashboard Overview</h1> {/* ← CHANGED TITLE */}
              <p className="text-blue-100 text-lg">
                Welcome back, {user?.role === 'doctor' ? 'Dr.' : ''} {user?.fullName}!
                {' '}{new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p> {/* ← MOVED WELCOME MESSAGE HERE */}
            </div>
          </div>
          <button
            onClick={loadAllData}
            disabled={refreshing}
            className="flex items-center gap-3 px-6 py-3 bg-white/10 backdrop-blur-sm rounded-xl hover:bg-white/20 transition-all disabled:opacity-50 border border-white/20"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>

        {!hasData && !isLoading && (
          <div className="mt-6 flex items-center gap-3 bg-blue-500/30 backdrop-blur-sm rounded-xl p-4 border border-blue-400/30">
            <AlertCircle className="w-6 h-6 text-blue-200 flex-shrink-0" />
            <p className="text-blue-100">No data available. You may not have permission to view some data.</p>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.name}
              to={stat.path}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300 group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-r ${stat.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                {isLoading ? (
                  <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
                ) : (
                  <div className="text-right">
                    <p className="text-sm font-medium text-green-600">{stat.trend}</p>
                    <TrendingUp className="w-5 h-5 text-green-500" />
                  </div>
                )}
              </div>
              <p className="text-gray-600 text-sm mb-1">{stat.name}</p>
              {isLoading ? (
                <div className="space-y-2">
                  <div className="h-8 bg-gray-200 rounded-lg animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                </div>
              ) : (
                <>
                  <p className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
                  <p className="text-gray-500 text-sm">{stat.description}</p>
                </>
              )}
            </Link>
          );
        })}
      </div>

      {/* Error Display */}
      {(usePatientStore.getState().error || useAttendanceStore.getState().error || useBillingStore.getState().error || useAdmissionStore.getState().error) && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <div>
                <p className="text-red-800 font-medium text-lg">Failed to load some data</p>
                <div className="text-red-600 text-sm space-y-1 mt-1">
                  {usePatientStore.getState().error && <p>• Patients: {usePatientStore.getState().error}</p>}
                  {useAttendanceStore.getState().error && <p>• Attendances: {useAttendanceStore.getState().error}</p>}
                  {useBillingStore.getState().error && <p>• Bills: {useBillingStore.getState().error}</p>}
                  {useAdmissionStore.getState().error && <p>• Admissions: {useAdmissionStore.getState().error}</p>}
                </div>
              </div>
            </div>
            <button
              onClick={loadAllData}
              className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry All
            </button>
          </div>
        </div>
      )}

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Attendances */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Recent Patient Visits</h2>
                <p className="text-gray-500 text-sm">Latest patient consultations</p>
              </div>
            </div>
            {attendancesLoading && (
              <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />
            )}
          </div>

          {attendancesLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="p-4 bg-gray-50 rounded-xl animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : recentAttendances.length === 0 ? (
            <div className="text-center py-12">
              <Stethoscope className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-2">No recent visits</p>
              <p className="text-gray-400 text-sm">Patient visits will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentAttendances.map((attendance: any) => (
                <div key={attendance._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-blue-200 transition-colors group">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {attendance.patient?.fullName || 'Unknown Patient'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {attendance.diagnoses?.find((d: any) => d.primary)?.diagnosisId?.name || 'No diagnosis'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                      <Clock className="w-4 h-4" />
                      {attendance.dateTime
                        ? new Date(attendance.dateTime).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'No time'}
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(attendance.status)}`}
                    >
                      {attendance.status || 'unknown'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>
              <p className="text-gray-500 text-sm">Common tasks and shortcuts</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { 
                href: "/dashboard/patients/register", 
                icon: Users, 
                label: "Register Patient", 
                color: "blue",
                roles: ['admin', 'doctor', 'nurse', 'midwife', 'records']
              },
              { 
                href: "/dashboard/attendance/new", 
                icon: FileText, 
                label: "New Visit", 
                color: "green",
                roles: ['admin', 'doctor', 'nurse', 'midwife']
              },
              { 
                href: "/dashboard/billing", 
                icon: DollarSign, 
                label: "Billing", 
                color: "amber",
                roles: ['admin', 'doctor', 'accounts']
              },
              { 
                href: "/dashboard/admissions", 
                icon: BedDouble, 
                label: "Admissions", 
                color: "purple",
                roles: ['admin', 'doctor', 'nurse', 'midwife']
              },
              { 
                href: "/dashboard/insurance-claims", 
                icon: Shield, 
                label: "Insurance Claims", 
                color: "indigo",
                roles: ['admin', 'doctor', 'accounts']
              },
              { 
                href: "/dashboard/stock", 
                icon: Package, 
                label: "Stock Management", 
                color: "red",
                roles: ['admin', 'pharmacist']
              },
            ]
            .filter(action => action.roles.includes(user.role))
            .map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  to={action.href}
                  className={`group p-4 bg-${action.color}-50 rounded-xl border border-${action.color}-200 hover:border-${action.color}-300 transition-all duration-300 hover:shadow-md`}
                >
                  <div className="flex flex-col items-center text-center">
                    <div className={`w-12 h-12 bg-${action.color}-100 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                      <Icon className={`w-6 h-6 text-${action.color}-600`} />
                    </div>
                    <span className={`text-sm font-medium text-${action.color}-900`}>{action.label}</span>
                    <ArrowRight className={`w-4 h-4 text-${action.color}-600 mt-2 opacity-0 group-hover:opacity-100 transition-opacity`} />
                  </div>
                </Link>
              );
            })}
          </div>

          {/* System Status */}
          <div className="mt-8 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">System Status</p>
                <p className="text-sm text-gray-600">All systems operational</p>
              </div>
              <div className="flex items-center gap-2 text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Online</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
