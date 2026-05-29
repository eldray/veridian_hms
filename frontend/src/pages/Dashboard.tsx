// src/pages/Dashboard.tsx - OPTIMIZED VERSION

import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import {
  getDashboardStats,
  getEncounters,
} from '../api';
import {
  RefreshCw,
  AlertCircle,
  Clock,
  Users,
  Calendar,
  BedDouble,
  DollarSign,
  Shield,
  Package,
  UserPlus,
  Pill,
  BarChart3,
  Stethoscope,
  FileText,
  Activity,
  Heart,
  CreditCard,
  Hospital,
} from 'lucide-react';
import type { PaymentMode } from '../types';

// ============================================
// HELPER FUNCTIONS
// ============================================

const fmtTime = (d: string) => {
  try { return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }); }
  catch { return '—'; }
};

const patientFullName = (att: any) => {
  const p = att?.patient ?? att?.Patient;
  if (!p) return 'Unknown Patient';
  return `${p.surname || ''} ${p.otherNames || ''}`.trim() || 'Unknown Patient';
};

const getStatusStyle = (status: string): { bg: string; color: string } => {
  const styles: Record<string, { bg: string; color: string }> = {
    completed: { bg: 'var(--icon-green-bg)', color: 'var(--icon-green-text)' },
    paid: { bg: 'var(--icon-green-bg)', color: 'var(--icon-green-text)' },
    discharged: { bg: 'var(--icon-green-bg)', color: 'var(--icon-green-text)' },
    cancelled: { bg: 'var(--icon-red-bg)', color: 'var(--icon-red-text)' },
    admitted: { bg: 'var(--icon-purple-bg)', color: 'var(--icon-purple-text)' },
    scheduled: { bg: 'var(--icon-purple-bg)', color: 'var(--icon-purple-text)' },
    pending: { bg: 'var(--icon-yellow-bg)', color: 'var(--icon-yellow-text)' },
    in_progress: { bg: 'var(--icon-cyan-bg)', color: 'var(--icon-cyan-text)' },
    partial: { bg: 'var(--icon-orange-bg)', color: 'var(--icon-orange-text)' },
  };
  return styles[status] || { bg: 'var(--bg-main)', color: 'var(--text-secondary)' };
};

const paymentModeIcon = (mode: PaymentMode) => {
  switch (mode) {
    case 'nhis': return <Shield className="w-3 h-3" style={{ color: 'var(--icon-green-text)' }} />;
    case 'private_insurance': return <Hospital className="w-3 h-3" style={{ color: 'var(--icon-cyan-text)' }} />;
    default: return <CreditCard className="w-3 h-3" style={{ color: 'var(--text-tertiary)' }} />;
  }
};

const paymentModeLabel = (mode: PaymentMode) =>
  ({ cash: 'Cash', nhis: 'NHIS', private_insurance: 'Insurance' }[mode] ?? 'Cash');

// ============================================
// STAT CARD COMPONENT
// ============================================

const StatCard = ({
  to, label, value, sub, Icon, bg, color, loading,
}: {
  to: string; label: string; value: React.ReactNode; sub?: string;
  Icon: React.ComponentType<any>; bg: string; color: string; loading: boolean;
}) => (
  <Link
    to={to}
    className="rounded-xl p-4 border transition-all hover:shadow-sm"
    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
  >
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </span>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: bg }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
    </div>
    {loading ? (
      <div className="h-7 rounded animate-pulse w-16" style={{ background: 'var(--bg-main)' }} />
    ) : (
      <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
    )}
    {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{sub}</p>}
  </Link>
);

// ============================================
// MAIN DASHBOARD COMPONENT
// ============================================

export default function Dashboard() {
  const { user } = useAuthStore();
  const { error: toastError } = useToast();
  const toastErrorRef = useRef(toastError);
  toastErrorRef.current = toastError;

  const hasRole = useCallback(
    (roles: string[]) => roles.includes(user?.role ?? ''),
    [user]
  );

  const [stats, setStats] = useState({
    totalPatients: 0,
    todayVisits: 0,
    activeAdmissions: 0,
    pendingBills: 0,
    pendingClaims: 0,
    lowStockItems: 0,
    totalRevenue: 0,
    scheduledAppointments: 0,
    completedProcedures: 0,
  });
  const [recentAttendances, setRecentAttendances] = useState<any[]>([]);
  const [topDiagnoses, setTopDiagnoses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  
  const currentRequestId = useRef(0);
  const refreshingRef = useRef(false);

  const loadData = useCallback(async () => {
    if (refreshingRef.current) return;

    const requestId = ++currentRequestId.current;
    refreshingRef.current = true;
    setIsLoading(true);
    setRefreshing(true);
    setErrors([]);

    try {
      const [statsResult, recentResult] = await Promise.allSettled([
        getDashboardStats(),
        getEncounters({ limit: 12 }),
      ]);

      if (currentRequestId.current !== requestId) return;

      const errors: string[] = [];

      if (statsResult.status === 'fulfilled') {
        const statsResponse = statsResult.value;
        if (statsResponse?.success && statsResponse?.data) {
          const data = statsResponse.data;
          setStats({
            totalPatients: data.totalPatients || 0,
            todayVisits: data.todayVisits || 0,
            activeAdmissions: data.activeAdmissions || 0,
            pendingBills: data.pendingBills || 0,
            pendingClaims: data.pendingClaims || 0,
            lowStockItems: data.lowStockItems || 0,
            totalRevenue: Number(data.totalRevenue) || 0,
            scheduledAppointments: data.scheduledAppointments || 0,
            completedProcedures: data.completedProcedures || 0,
          });
          setTopDiagnoses(data.topDiagnoses ?? []);
        }
      } else {
        console.error('Dashboard stats error:', statsResult.reason);
        errors.push('Statistics');
      }

      if (recentResult.status === 'fulfilled') {
        if (recentResult.value?.data) {
          setRecentAttendances(recentResult.value.data);
        }
      } else {
        console.error('Recent activity error:', recentResult.reason);
        errors.push('Recent activity');
      }

      if (errors.length > 0) {
        toastErrorRef.current(
          errors.length === 2 ? 'Load failed' : 'Partial load',
          `Could not load: ${errors.join(', ')}`
        );
        setErrors(errors.map((e) => `Failed to load ${e.toLowerCase()}`));
      }
    } catch (err: any) {
      console.error('Dashboard error:', err);
      if (currentRequestId.current === requestId) {
        toastErrorRef.current('Load failed', err.message || 'Failed to load dashboard data.');
        setErrors(['Failed to load dashboard data']);
      }
    } finally {
      if (currentRequestId.current === requestId) {
        refreshingRef.current = false;
        setIsLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    loadData();
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-main)' }}>
        <div className="text-center p-8 rounded-2xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <AlertCircle className="w-14 h-14 mx-auto mb-4" style={{ color: 'var(--icon-cyan-text)' }} />
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Session expired</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Please log in to access the dashboard.</p>
        </div>
      </div>
    );
  }

  const statCards = [
    { to: '/dashboard/patients', label: 'Total Patients', value: stats.totalPatients.toLocaleString(), sub: 'Registered', Icon: Users, bg: 'var(--icon-cyan-bg)', color: 'var(--icon-cyan-text)', show: true },
    { to: '/dashboard/attendance', label: "Today's Visits", value: stats.todayVisits, sub: 'Consultations', Icon: Calendar, bg: 'var(--icon-orange-bg)', color: 'var(--icon-orange-text)', show: true },
    { to: '/dashboard/admissions', label: 'Active Admissions', value: stats.activeAdmissions, sub: 'In-patients', Icon: BedDouble, bg: 'var(--icon-green-bg)', color: 'var(--icon-green-text)', show: true },
    { to: '/dashboard/billing', label: 'Pending Bills', value: stats.pendingBills, sub: 'Unpaid', Icon: FileText, bg: 'var(--icon-purple-bg)', color: 'var(--icon-purple-text)', show: hasRole(['admin', 'accounts']) },
    { to: '/dashboard/appointments', label: 'Scheduled Today', value: stats.scheduledAppointments, sub: 'Appointments', Icon: Activity, bg: 'var(--icon-cyan-bg)', color: 'var(--icon-cyan-text)', show: true },
    { to: '/dashboard/insurance-claims', label: 'Pending Claims', value: stats.pendingClaims, sub: 'Awaiting process', Icon: Shield, bg: 'var(--icon-yellow-bg)', color: 'var(--icon-yellow-text)', show: hasRole(['admin', 'accounts']) },
    { to: '/dashboard/stock', label: 'Low Stock Items', value: stats.lowStockItems, sub: 'Need reorder', Icon: Package, bg: 'var(--icon-red-bg)', color: 'var(--icon-red-text)', show: hasRole(['admin', 'pharmacist']) },
    { to: '/dashboard/billing', label: "Today's Revenue", value: `₵${stats.totalRevenue.toFixed(2)}`, sub: 'Collected', Icon: DollarSign, bg: 'var(--icon-green-bg)', color: 'var(--icon-green-text)', show: hasRole(['admin', 'accounts']) },
  ].filter((s) => s.show);

  const quickActions = [
    { icon: UserPlus, label: 'New Patient', path: '/dashboard/patients', bg: 'var(--icon-cyan-bg)', color: 'var(--icon-cyan-text)', roles: ['admin','doctor','nurse','midwife','records','pharmacist','sonographer'] },
    { icon: Calendar, label: 'Attendance', path: '/dashboard/attendance', bg: 'var(--icon-orange-bg)', color: 'var(--icon-orange-text)', roles: ['admin','doctor','nurse','midwife','pharmacist','records','sonographer'] },
    { icon: BedDouble, label: 'Admissions', path: '/dashboard/admissions', bg: 'var(--icon-green-bg)', color: 'var(--icon-green-text)', roles: ['admin','doctor','nurse','midwife'] },
    { icon: DollarSign, label: 'Billing', path: '/dashboard/billing', bg: 'var(--icon-purple-bg)', color: 'var(--icon-purple-text)', roles: ['admin','accounts'] },
    { icon: Pill, label: 'Pharmacy', path: '/dashboard/pharmacy', bg: 'var(--icon-yellow-bg)', color: 'var(--icon-yellow-text)', roles: ['admin','pharmacist','doctor'] },
    { icon: BarChart3, label: 'Reports', path: '/dashboard/reports', bg: 'var(--icon-red-bg)', color: 'var(--icon-red-text)', roles: ['admin','accounts','records'] },
  ].filter((a) => a.roles.includes(user.role ?? ''));

  return (
    <div className="p-6" style={{ height: '100vh', background: 'var(--bg-main)', display: 'flex', flexDirection: 'column', gap: '1.25rem', overflow: 'hidden' }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Dashboard Overview</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Welcome back, {user.fullName}</p>
        </div>
        <button onClick={handleRefresh} disabled={refreshing} className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-all disabled:opacity-50" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* Error banner */}
      {errors.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl border flex-shrink-0" style={{ background: 'var(--icon-yellow-bg)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" style={{ color: 'var(--icon-yellow-text)' }} />
            <p className="text-sm" style={{ color: 'var(--icon-yellow-text)' }}>{errors.join(', ')}</p>
          </div>
          <button onClick={handleRefresh} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-80" style={{ background: 'var(--icon-yellow-text)' }}>Retry</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.25rem', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* LEFT column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
          
          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(statCards.length, 4)}, 1fr)`, gap: '0.75rem', flexShrink: 0 }}>
            {statCards.map((s) => (
              <StatCard key={s.label} {...s} loading={isLoading} />
            ))}
          </div>

          {/* Top Diagnoses - Using backend aggregated data */}
          {topDiagnoses.length > 0 && (
            <div className="rounded-xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', flexShrink: 0 }}>
              <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-main)' }}>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Top Diagnoses (Last 30 Days)</p>
                </div>
                <Heart className="w-4 h-4" style={{ color: 'var(--icon-red-text)' }} />
              </div>

              <div className="p-4">
                {isLoading ? (
                  <div className="space-y-2">
                    {[1,2,3,4,5].map((i) => (<div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: 'var(--bg-main)' }} />))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {topDiagnoses.slice(0, 10).map((t, i) => (
                      <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: 'var(--bg-main)' }}>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{ background: 'var(--icon-cyan-bg)', color: 'var(--icon-cyan-text)' }}>{i + 1}</div>
                        <div className="flex-1">
                          <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{t.disease}</span>
                          {t.icdCode && t.icdCode !== '—' && (
                            <span className="text-[10px] ml-2" style={{ color: 'var(--text-tertiary)' }}>({t.icdCode})</span>
                          )}
                        </div>
                        <span className="text-xs font-semibold" style={{ color: 'var(--icon-cyan-text)' }}>{t.patients} cases</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div className="rounded-xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', flexShrink: 0, marginTop: 'auto' }}>
            <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-main)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Quick actions</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Frequent operations</p>
            </div>
            <div className="p-4" style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(quickActions.length, 6)}, 1fr)`, gap: '0.75rem' }}>
              {quickActions.map((a) => (
                <Link key={a.path} to={a.path} className="flex flex-col items-center gap-2 p-3 rounded-xl border transition-all hover:shadow-sm" style={{ background: a.bg, borderColor: 'var(--border-color)', color: a.color }}>
                  <a.icon className="w-5 h-5" style={{ color: a.color }} />
                  <span className="text-xs font-medium text-center leading-tight" style={{ color: a.color }}>{a.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT column - Recent Activity */}
        <div className="rounded-xl border flex flex-col" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', height: '100%', minHeight: 0, overflow: 'hidden' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-main)' }}>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Recent Activity</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Latest patient visits</p>
            </div>
            <div className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: 'var(--icon-cyan-bg)', color: 'var(--icon-cyan-text)' }}>{recentAttendances.length}</div>
          </div>

          <div className="flex-1 overflow-y-auto p-3" style={{ minHeight: 0, maxHeight: '100%' }}>
            {isLoading ? (
              <div className="space-y-2">
                {[1,2,3,4,5].map((i) => (<div key={i} className="h-14 rounded-lg animate-pulse" style={{ background: 'var(--bg-main)' }} />))}
              </div>
            ) : recentAttendances.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                <Stethoscope className="w-10 h-10 mb-3" style={{ color: 'var(--text-tertiary)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No visits recorded</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Patient visits will appear here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentAttendances.map((att) => {
                  const name = patientFullName(att);
                  const patient = att.patient ?? att.Patient ?? {};
                  const ss = getStatusStyle(att.status || 'pending');
                  return (
                    <Link key={att.id} to={`/dashboard/attendance/${att.id}`} className="flex flex-col gap-1.5 p-3 rounded-lg border transition-all" style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold truncate flex-1" style={{ color: 'var(--text-primary)' }}>{name}</p>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {paymentModeIcon(att.paymentMode)}
                          <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{paymentModeLabel(att.paymentMode)}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-card)', color: 'var(--text-tertiary)' }}>{patient.folderNumber || '—'}</span>
                          <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{att.attendanceNumber || '—'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: ss.bg, color: ss.color }}>
                            {(att.status || 'pending').charAt(0).toUpperCase() + (att.status || 'pending').slice(1)}
                          </span>
                          <div className="flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" style={{ color: 'var(--text-tertiary)' }} />
                            <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{fmtTime(att.dateTime || att.createdAt)}</span>
                          </div>
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