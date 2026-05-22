// src/pages/Dashboard.tsx
import { useEffect, useState, useCallback } from 'react';
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
  getClinicalReport,
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
  TrendingUp,
  Activity,
  Heart,
  Syringe,
  CreditCard,
  Hospital,
} from 'lucide-react';
import type { PaymentMode } from '../types';

// ── helpers ───────────────────────────────────────────────────────────────────

const extractArray = (res: any): any[] => {
  if (!res) return [];
  if (res.success && Array.isArray(res.data))        return res.data;
  if (res.data && Array.isArray(res.data))           return res.data;
  if (Array.isArray(res))                            return res;
  if (res.claims     && Array.isArray(res.claims))   return res.claims;
  if (res.bills      && Array.isArray(res.bills))    return res.bills;
  if (res.patients   && Array.isArray(res.patients)) return res.patients;
  if (res.attendances && Array.isArray(res.attendances)) return res.attendances;
  return [];
};

const getTodayRange = () => {
  const s = new Date(); s.setHours(0,  0,  0,   0);
  const e = new Date(); e.setHours(23, 59, 59, 999);
  return { start: s.toISOString(), end: e.toISOString() };
};

const fmtTime = (d: string) => {
  try { return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }); }
  catch { return '—'; }
};

const patientFullName = (att: any) => {
  if (!att?.Patient) return 'Unknown Patient';
  return `${att.Patient.surname || ''} ${att.Patient.otherNames || ''}`.trim() || 'Unknown Patient';
};

// ── status badge ──────────────────────────────────────────────────────────────

const getStatusStyle = (status: string): { bg: string; color: string } => {
  switch (status) {
    case 'completed': case 'paid': case 'discharged':
      return { bg: 'var(--icon-green-bg)', color: 'var(--icon-green-text)' };
    case 'cancelled': case 'rejected':
      return { bg: 'var(--icon-red-bg)', color: 'var(--icon-red-text)' };
    case 'admitted': case 'scheduled':
      return { bg: 'var(--icon-purple-bg)', color: 'var(--icon-purple-text)' };
    case 'pending': case 'draft': case 'submitted':
      return { bg: 'var(--icon-yellow-bg)', color: 'var(--icon-yellow-text)' };
    case 'active': case 'in_progress':
      return { bg: 'var(--icon-cyan-bg)', color: 'var(--icon-cyan-text)' };
    case 'partial':
      return { bg: 'var(--icon-orange-bg)', color: 'var(--icon-orange-text)' };
    default:
      return { bg: 'var(--bg-main)', color: 'var(--text-secondary)' };
  }
};

const paymentModeIcon = (mode: PaymentMode) => {
  switch (mode) {
    case 'nhis':             return <Shield    className="w-3 h-3" style={{ color: 'var(--icon-green-text)'  }} />;
    case 'private_insurance': return <Hospital  className="w-3 h-3" style={{ color: 'var(--icon-cyan-text)'   }} />;
    default:                  return <CreditCard className="w-3 h-3" style={{ color: 'var(--text-tertiary)'    }} />;
  }
};

const paymentModeLabel = (mode: PaymentMode) =>
  ({ cash: 'Cash', nhis: 'NHIS', private_insurance: 'Insurance' }[mode] ?? 'Cash');

// ── stat card ─────────────────────────────────────────────────────────────────

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
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center"
        style={{ background: bg }}
      >
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
    </div>
    {loading ? (
      <div
        className="h-7 rounded animate-pulse w-16"
        style={{ background: 'var(--bg-main)' }}
      />
    ) : (
      <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
        {value}
      </p>
    )}
    {sub && (
      <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
        {sub}
      </p>
    )}
  </Link>
);

// ── main ──────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuthStore();

  // ── FIX: get store actions only — read patient/attendance data after load ──
  const { loadPatients }  = usePatientStore();
  const { getAttendances } = useAttendanceStore();
  const { success, error: toastError } = useToast();

  const hasRole = useCallback(
    (roles: string[]) => roles.includes(user?.role ?? ''),
    [user]
  );

  const [stats, setStats] = useState({
    totalPatients:        0,
    todayVisits:          0,
    activeAdmissions:     0,
    pendingBills:         0,
    pendingClaims:        0,
    lowStockItems:        0,
    totalRevenue:         0,
    scheduledAppointments: 0,
  });
  const [recentAttendances, setRecentAttendances] = useState<any[]>([]);
  const [diagnosisTrends,   setDiagnosisTrends]   = useState<any[]>([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errors,     setErrors]     = useState<string[]>([]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setRefreshing(true);
    setErrors([]);

    const { start: todayStart, end: todayEnd } = getTodayRange();
    const thirtyAgo = new Date();
    thirtyAgo.setDate(thirtyAgo.getDate() - 30);

    try {
      // ── FIX: await store calls then read the latest state directly ──────────
      await loadPatients();
      await getAttendances();

      // read current store state AFTER the awaits resolve
      const latestPatients    = usePatientStore.getState().patients;
      const latestAttendances = useAttendanceStore.getState().attendances;

      const totalPatients = latestPatients.length;

      const todayStart_ms = new Date(todayStart).getTime();
      const todayEnd_ms   = new Date(todayEnd).getTime();

      const todayVisits = latestAttendances.filter((a) => {
        const t = new Date(a.dateTime || a.createdAt).getTime();
        return t >= todayStart_ms && t <= todayEnd_ms;
      }).length;

      const sorted = [...latestAttendances]
        .sort(
          (a, b) =>
            new Date(b.dateTime || b.createdAt).getTime() -
            new Date(a.dateTime || a.createdAt).getTime()
        )
        .slice(0, 12);

      // ── API calls ────────────────────────────────────────────────────────────
      const isAccounts = hasRole(['admin', 'accounts']);
      const isClinical = hasRole(['admin', 'doctor', 'pharmacist', 'nurse', 'midwife', 'lab_tech', 'sonographer']);

      const results = await Promise.allSettled([
        getAdmissions({ status: 'admitted' }),                                    // 0
        getStockItems(),                                                           // 1
        getDashboardStats(),                                                       // 2
        getAppointmentStatistics({ dateFrom: todayStart }),                        // 3
        isAccounts ? getBills({ status: 'pending,partial' }) : null,              // 4
        isAccounts ? getInsuranceClaims({ status: 'submitted,pending' }) : null,  // 5
        isAccounts ? getFinancialReport({ period: 'today', dateFrom: todayStart, dateTo: todayEnd }) : null, // 6
        isClinical ? getClinicalReport({ period: '30days', dateFrom: thirtyAgo.toISOString(), dateTo: todayEnd }) : null, // 7
      ]);

      const newErrors: string[] = [];
      let activeAdmissions      = 0;
      let lowStockItems         = 0;
      let scheduledAppointments = 0;
      let totalRevenue          = 0;
      let pendingBills          = 0;
      let pendingClaims         = 0;
      let diagList: any[]       = [];

      const ok = (r: PromiseSettledResult<any>) =>
        r.status === 'fulfilled' && r.value != null ? r.value : null;

      // admissions
      const admArr = extractArray(ok(results[0]));
      activeAdmissions = admArr.filter((a: any) => a.status === 'admitted').length;
      if (results[0].status === 'rejected') newErrors.push('Admissions');

      // stock
      const stockArr = extractArray(ok(results[1]));
      lowStockItems = stockArr.filter(
        (i: any) => (i.currentStock ?? 0) <= (i.reorderLevel ?? 0)
      ).length;

      // dashboard stats
      const ds = ok(results[2]);
      if (ds) totalRevenue = ds.totalRevenue ?? ds.data?.totalRevenue ?? 0;

      // appointments
      const ap = ok(results[3]);
      if (ap) scheduledAppointments = ap.scheduled ?? ap.today ?? ap.data?.scheduled ?? 0;
      else newErrors.push('Appointments');

      // bills
      if (isAccounts) {
        const bArr = extractArray(ok(results[4]));
        pendingBills = bArr.filter(
          (b: any) => b.status === 'pending' || b.status === 'partial'
        ).length;
        if (results[4].status === 'rejected') newErrors.push('Bills');
      }

      // claims
      if (isAccounts) {
        const cArr = extractArray(ok(results[5]));
        pendingClaims = cArr.filter(
          (c: any) => ['submitted', 'pending', 'draft'].includes(c.status)
        ).length;
        if (results[5].status === 'rejected') newErrors.push('Claims');
      }

      // financial
      if (isAccounts) {
        const fr = ok(results[6]);
        if (fr) {
          const rev = fr.totalRevenue ?? fr.data?.totalRevenue ?? 0;
          if (rev > 0) totalRevenue = rev;
        }
      }

      // clinical / diagnosis
      if (isClinical) {
        const cr = ok(results[7]);
        if (cr) {
          diagList =
            cr.diagnosisTrends ?? cr.topDiagnoses ?? cr.data?.diagnosisTrends ?? [];
        }
      }

      // fallback diagnosis from store attendances
      if (diagList.length === 0 && sorted.length > 0) {
        const cnt: Record<string, number> = {};
        sorted.forEach((att: any) => {
          (att.AttendanceDiagnosis || []).forEach((d: any) => {
            const n = d.Diagnosis?.name || d.icdCode || 'Unknown';
            cnt[n] = (cnt[n] || 0) + 1;
          });
        });
        diagList = Object.entries(cnt)
          .map(([disease, patients]) => ({ disease, patients }))
          .sort((a, b) => b.patients - a.patients)
          .slice(0, 5);
      }

      setStats({ totalPatients, todayVisits, activeAdmissions, pendingBills, pendingClaims, lowStockItems, totalRevenue, scheduledAppointments });
      setRecentAttendances(sorted);
      setDiagnosisTrends(diagList);
      setErrors(newErrors);

      if (newErrors.length === 0) {
        success('Dashboard refreshed', 'All data is up to date.');
      } else if (newErrors.length < 4) {
        toastError('Partial data', `Could not load: ${newErrors.join(', ')}`);
      }
    } catch (err) {
      console.error('Dashboard error:', err);
      toastError('Refresh failed', 'Failed to load dashboard data.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [hasRole, loadPatients, getAttendances, success, toastError]);

  useEffect(() => { loadData(); }, []);   // intentionally no loadData dep to run once

  if (!user) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--bg-main)' }}
      >
        <div
          className="text-center p-8 rounded-2xl border"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
        >
          <AlertCircle className="w-14 h-14 mx-auto mb-4" style={{ color: 'var(--icon-cyan-text)' }} />
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            Session expired
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>Please log in to access the dashboard.</p>
        </div>
      </div>
    );
  }

  // ── stat card definitions ─────────────────────────────────────────────────

  const statCards = [
    {
      to: '/dashboard/patients', label: 'Total Patients',
      value: stats.totalPatients.toLocaleString(), sub: 'Registered',
      Icon: Users, bg: 'var(--icon-cyan-bg)', color: 'var(--icon-cyan-text)',
      show: true,
    },
    {
      to: '/dashboard/attendance', label: "Today's Visits",
      value: stats.todayVisits, sub: 'Consultations',
      Icon: Calendar, bg: 'var(--icon-orange-bg)', color: 'var(--icon-orange-text)',
      show: true,
    },
    {
      to: '/dashboard/admissions', label: 'Active Admissions',
      value: stats.activeAdmissions, sub: 'In-patients',
      Icon: BedDouble, bg: 'var(--icon-green-bg)', color: 'var(--icon-green-text)',
      show: true,
    },
    {
      to: '/dashboard/billing', label: 'Pending Bills',
      value: stats.pendingBills, sub: 'Unpaid',
      Icon: FileText, bg: 'var(--icon-purple-bg)', color: 'var(--icon-purple-text)',
      show: hasRole(['admin', 'accounts']),
    },
    {
      to: '/dashboard/appointments', label: 'Scheduled',
      value: stats.scheduledAppointments, sub: 'Appointments',
      Icon: Activity, bg: 'var(--icon-cyan-bg)', color: 'var(--icon-cyan-text)',
      show: !hasRole(['admin', 'accounts']),
    },
    {
      to: '/dashboard/insurance-claims', label: 'Pending Claims',
      value: stats.pendingClaims, sub: 'Awaiting process',
      Icon: Shield, bg: 'var(--icon-yellow-bg)', color: 'var(--icon-yellow-text)',
      show: hasRole(['admin', 'accounts']),
    },
    {
      to: '/dashboard/stock', label: 'Low Stock',
      value: stats.lowStockItems, sub: 'Need reorder',
      Icon: Package, bg: 'var(--icon-red-bg)', color: 'var(--icon-red-text)',
      show: hasRole(['admin', 'pharmacist']),
    },
    {
      to: '/dashboard/billing', label: "Today's Revenue",
      value: `₵${stats.totalRevenue.toFixed(2)}`, sub: 'Collected',
      Icon: DollarSign, bg: 'var(--icon-green-bg)', color: 'var(--icon-green-text)',
      show: hasRole(['admin', 'accounts']),
    },
  ].filter((s) => s.show);

  // ── quick actions ─────────────────────────────────────────────────────────

  const quickActions = [
    { icon: UserPlus,  label: 'New Patient', path: '/dashboard/patients',    bg: 'var(--icon-cyan-bg)',    color: 'var(--icon-cyan-text)',    roles: ['admin','doctor','nurse','midwife','records','pharmacist','sonographer'] },
    { icon: Calendar,  label: 'Attendance',  path: '/dashboard/attendance',  bg: 'var(--icon-orange-bg)', color: 'var(--icon-orange-text)', roles: ['admin','doctor','nurse','midwife','pharmacist','records','sonographer'] },
    { icon: BedDouble, label: 'Admissions',  path: '/dashboard/admissions',  bg: 'var(--icon-green-bg)',  color: 'var(--icon-green-text)',  roles: ['admin','doctor','nurse','midwife'] },
    { icon: DollarSign,label: 'Billing',     path: '/dashboard/billing',     bg: 'var(--icon-purple-bg)', color: 'var(--icon-purple-text)', roles: ['admin','accounts'] },
    { icon: Pill,      label: 'Pharmacy',    path: '/dashboard/pharmacy',    bg: 'var(--icon-yellow-bg)', color: 'var(--icon-yellow-text)', roles: ['admin','pharmacist','doctor'] },
    { icon: BarChart3, label: 'Reports',     path: '/dashboard/reports',     bg: 'var(--icon-red-bg)',    color: 'var(--icon-red-text)',    roles: ['admin','accounts','records'] },
  ].filter((a) => a.roles.includes(user.role ?? ''));

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="p-6"
      style={{
        height: '100vh',
        background: 'var(--bg-main)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Dashboard Overview
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Welcome back, {user.fullName}
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-all disabled:opacity-50"
          style={{
            background: 'var(--bg-card)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)',
          }}
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* Error banner */}
      {errors.length > 0 && errors.length < 5 && (
        <div
          className="flex items-center justify-between px-4 py-3 rounded-xl border flex-shrink-0"
          style={{
            background: 'var(--icon-yellow-bg)',
            borderColor: 'var(--border-color)',
          }}
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" style={{ color: 'var(--icon-yellow-text)' }} />
            <p className="text-sm" style={{ color: 'var(--icon-yellow-text)' }}>
              Could not load: {errors.join(', ')}
            </p>
          </div>
          <button
            onClick={loadData}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-80"
            style={{ background: 'var(--icon-yellow-text)' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* ── main grid — stretches to fill remaining height ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 320px',
          gap: '1.25rem',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        {/* LEFT column */}
        <div 
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '1.25rem', 
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          {/* Stat cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.min(statCards.length, 4)}, 1fr)`,
              gap: '0.75rem',
              flexShrink: 0,
            }}
          >
            {statCards.map((s) => (
              <StatCard key={s.label} {...s} loading={isLoading} />
            ))}
          </div>

          {/* Diagnosis trends */}
          {hasRole(['admin', 'doctor', 'nurse', 'pharmacist', 'midwife']) && (
            <div
              className="rounded-xl border"
              style={{ 
                background: 'var(--bg-card)', 
                borderColor: 'var(--border-color)',
                flexShrink: 0,
              }}
            >
              <div
                className="flex items-center justify-between px-5 py-3 border-b"
                style={{ borderColor: 'var(--border-color)', background: 'var(--bg-main)' }}
              >
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Diagnosis Trends
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    Most common — last 30 days
                  </p>
                </div>
                <Heart className="w-4 h-4" style={{ color: 'var(--icon-red-text)' }} />
              </div>

              <div className="p-4">
                {isLoading ? (
                  <div className="space-y-2">
                    {[1,2,3].map((i) => (
                      <div
                        key={i}
                        className="h-10 rounded-lg animate-pulse"
                        style={{ background: 'var(--bg-main)' }}
                      />
                    ))}
                  </div>
                ) : diagnosisTrends.length === 0 ? (
                  <div className="text-center py-6">
                    <Syringe className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--text-tertiary)' }} />
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      No diagnosis data available
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {diagnosisTrends.map((t, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg"
                        style={{ background: 'var(--bg-main)' }}
                      >
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
                          style={{
                            background: 'var(--icon-cyan-bg)',
                            color: 'var(--icon-cyan-text)',
                          }}
                        >
                          {i + 1}
                        </div>
                        <span
                          className="flex-1 text-sm truncate"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {t.disease}
                        </span>
                        <span
                          className="text-xs font-semibold"
                          style={{ color: 'var(--icon-cyan-text)' }}
                        >
                          {t.patients} pts
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div
            className="rounded-xl border"
            style={{ 
              background: 'var(--bg-card)', 
              borderColor: 'var(--border-color)',
              flexShrink: 0,
              marginTop: 'auto',
            }}
          >
            <div
              className="px-5 py-3 border-b"
              style={{ borderColor: 'var(--border-color)', background: 'var(--bg-main)' }}
            >
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Quick actions
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                Frequent operations
              </p>
            </div>
            <div
              className="p-4"
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${Math.min(quickActions.length, 6)}, 1fr)`,
                gap: '0.75rem',
              }}
            >
              {quickActions.map((a) => (
                <Link
                  key={a.path}
                  to={a.path}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border transition-all hover:shadow-sm"
                  style={{
                    background: a.bg,
                    borderColor: 'var(--border-color)',
                    color: a.color,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.opacity = '.85';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.opacity = '1';
                  }}
                >
                  <a.icon className="w-5 h-5" style={{ color: a.color }} />
                  <span className="text-xs font-medium text-center leading-tight" style={{ color: a.color }}>
                    {a.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT column — today's activity */}
        <div
          className="rounded-xl border flex flex-col"
          style={{
            background: 'var(--bg-card)',
            borderColor: 'var(--border-color)',
            height: '100%',
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          {/* panel header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
            style={{ borderColor: 'var(--border-color)', background: 'var(--bg-main)' }}
          >
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Today's Activity
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                Latest patient visits
              </p>
            </div>
            <div
              className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
              style={{ background: 'var(--icon-cyan-bg)', color: 'var(--icon-cyan-text)' }}
            >
              {recentAttendances.length}
            </div>
          </div>

          {/* scrollable list */}
          <div 
            className="flex-1 overflow-y-auto p-3" 
            style={{ 
              minHeight: 0,
              maxHeight: '100%',
            }}
          >
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-14 rounded-lg animate-pulse"
                    style={{ background: 'var(--bg-main)' }}
                  />
                ))}
              </div>
            ) : recentAttendances.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                <Stethoscope
                  className="w-10 h-10 mb-3"
                  style={{ color: 'var(--text-tertiary)' }}
                />
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  No visits today
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                  Patient visits will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentAttendances.map((att) => {
                  const name    = patientFullName(att);
                  const patient = att.Patient || {};
                  const ss      = getStatusStyle(att.status || 'pending');

                  return (
                    <Link
                      key={att.id}
                      to={`/dashboard/attendance/${att.id}`}
                      className="flex flex-col gap-1.5 p-3 rounded-lg border transition-all"
                      style={{
                        background: 'var(--bg-main)',
                        borderColor: 'var(--border-color)',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLAnchorElement).style.borderColor =
                          'var(--icon-cyan-text)';
                        (e.currentTarget as HTMLAnchorElement).style.background =
                          'var(--icon-cyan-bg)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLAnchorElement).style.borderColor =
                          'var(--border-color)';
                        (e.currentTarget as HTMLAnchorElement).style.background =
                          'var(--bg-main)';
                      }}
                    >
                      {/* name + mode */}
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className="text-xs font-semibold truncate flex-1"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {name}
                        </p>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {paymentModeIcon(att.paymentMode)}
                          <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                            {paymentModeLabel(att.paymentMode)}
                          </span>
                        </div>
                      </div>

                      {/* folder + attendance no + time + status */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                            style={{ background: 'var(--bg-card)', color: 'var(--text-tertiary)' }}
                          >
                            {patient.folderNumber || '—'}
                          </span>
                          <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                            {att.attendanceNumber || '—'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                            style={{ background: ss.bg, color: ss.color }}
                          >
                            {(att.status || 'pending').charAt(0).toUpperCase() +
                              (att.status || 'pending').slice(1)}
                          </span>
                          <div className="flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" style={{ color: 'var(--text-tertiary)' }} />
                            <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                              {fmtTime(att.dateTime || att.createdAt)}
                            </span>
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