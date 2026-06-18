// src/pages/Dashboard.tsx
import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import { getDashboardStats, getEncounters } from '../api';
import { RefreshCw, AlertCircle, Calendar, ChevronDown, X } from 'lucide-react';

import {
  getRoleDashboard, STAT_CATALOG, SENIORITY_CONFIG, EMPTY_STATS,
  QUICK_ACTIONS as QUICK_ACTION_LOOKUP,
  type DashboardStats, type PanelSpec,
} from '../config/dashboardConfig';
import {
  StatCard, WorklistPanel, RecentActivity, TopDiagnoses,
  FinanceSummary, StockAlerts,
  NurseSummary, MidwifeSummary, LabSummary, ScanSummary, RecordsSummary,
} from '../components/dashboard/DashboardPanels';
import { DiagnosesAndAttendance } from '../components/dashboard/DiagnosesAndAttendance';
import { DashboardDateContext, type DatePreset, type DateRange } from '../context/DashboardDateContext';
import type { Seniority } from '../types';

// ── helpers ───────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().split('T')[0];

const presetRange = (preset: DatePreset): DateRange => {
  const now = new Date();
  const ymd = (d: Date) => d.toISOString().split('T')[0];

  if (preset === 'week') {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { startDate: ymd(start), endDate: ymd(end) };
  }
  if (preset === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { startDate: ymd(start), endDate: ymd(end) };
  }
  // today (and custom initial value)
  return { startDate: today(), endDate: today() };
};

const fmtDate = (s: string) =>
  new Date(s + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const getSeniorityBadge = (seniority: Seniority) => {
  const config = SENIORITY_CONFIG[seniority] || SENIORITY_CONFIG.JUNIOR;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      <Icon className="w-3 h-3" />{config.label}
    </span>
  );
};

// ── Date toggle component ─────────────────────────────────────────────────────

const PRESETS: { key: DatePreset; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This week' },
  { key: 'month', label: 'This month' },
  { key: 'custom', label: 'Custom' },
];

function DateToggle({
  preset, dateRange, onChange,
}: {
  preset: DatePreset;
  dateRange: DateRange;
  onChange: (preset: DatePreset, range: DateRange) => void;
}) {
  const [showCustom, setShowCustom] = useState(false);
  const [draft, setDraft] = useState<DateRange>(dateRange);
  const popRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) {
        setShowCustom(false);
      }
    };
    if (showCustom) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showCustom]);

  const handlePreset = (p: DatePreset) => {
    if (p === 'custom') { setShowCustom(true); return; }
    setShowCustom(false);
    onChange(p, presetRange(p));
  };

  const applyCustom = () => {
    if (!draft.startDate || !draft.endDate) return;
    if (draft.startDate > draft.endDate) return;
    onChange('custom', draft);
    setShowCustom(false);
  };

  const rangeLabel = preset === 'custom'
    ? `${fmtDate(dateRange.startDate)} – ${fmtDate(dateRange.endDate)}`
    : PRESETS.find(p => p.key === preset)?.label ?? 'Today';

  return (
    <div className="relative flex items-center gap-1" ref={popRef}>
      {/* Preset pills */}
      <div className="flex items-center gap-0.5 rounded-lg border p-0.5"
        style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}>
        {PRESETS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handlePreset(key)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${preset === key
                ? 'text-white shadow-sm'
                : 'hover:bg-[var(--bg-card)]'
              }`}
            style={preset === key
              ? { background: 'var(--icon-cyan-text)', color: '#fff' }
              : { color: 'var(--text-secondary)' }
            }
          >
            {label}
          </button>
        ))}
      </div>

      {/* Active range badge */}
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
        <Calendar className="w-3.5 h-3.5" style={{ color: 'var(--icon-cyan-text)' }} />
        <span style={{ color: 'var(--text-primary)' }}>{rangeLabel}</span>
      </div>

      {/* Custom date range popover */}
      {showCustom && (
        <div className="absolute top-full right-0 mt-2 z-50 rounded-xl border shadow-lg p-4 w-72"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Custom range</p>
            <button onClick={() => setShowCustom(false)}
              className="p-1 rounded hover:bg-[var(--bg-main)] transition-colors">
              <X className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1"
                style={{ color: 'var(--text-tertiary)' }}>From</label>
              <input
                type="date"
                value={draft.startDate}
                max={draft.endDate || today()}
                onChange={e => setDraft(d => ({ ...d, startDate: e.target.value }))}
                className="w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-1"
                style={{
                  background: 'var(--bg-main)', borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)', ['--tw-ring-color' as any]: 'var(--icon-cyan-text)',
                }}
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1"
                style={{ color: 'var(--text-tertiary)' }}>To</label>
              <input
                type="date"
                value={draft.endDate}
                min={draft.startDate}
                max={today()}
                onChange={e => setDraft(d => ({ ...d, endDate: e.target.value }))}
                className="w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-1"
                style={{
                  background: 'var(--bg-main)', borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            {/* Quick shortcuts */}
            <div className="flex flex-wrap gap-1.5 pt-1 border-t" style={{ borderColor: 'var(--border-color)' }}>
              {[
                { label: 'Last 7 days', days: 7 },
                { label: 'Last 14 days', days: 14 },
                { label: 'Last 30 days', days: 30 },
                { label: 'Last 90 days', days: 90 },
              ].map(({ label, days }) => (
                <button
                  key={days}
                  onClick={() => {
                    const end = new Date();
                    const start = new Date();
                    start.setDate(end.getDate() - (days - 1));
                    setDraft({
                      startDate: start.toISOString().split('T')[0],
                      endDate: end.toISOString().split('T')[0],
                    });
                  }}
                  className="px-2 py-1 text-[10px] rounded-md border transition-colors hover:bg-[var(--bg-main)]"
                  style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                >
                  {label}
                </button>
              ))}
            </div>

            <button
              onClick={applyCustom}
              disabled={!draft.startDate || !draft.endDate || draft.startDate > draft.endDate}
              className="w-full py-2 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-40"
              style={{ background: 'var(--icon-cyan-text)' }}
            >
              Apply range
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Dashboard page
// ═════════════════════════════════════════════════════════════════════════════

export default function Dashboard() {
  const { user } = useAuthStore();
  const { error: toastError } = useToast();
  const toastErrorRef = useRef(toastError);
  toastErrorRef.current = toastError;

  const role = user?.role ?? '';
  const config = getRoleDashboard(role);

  const needsRecent =
    config.rightPanel.type === 'recent' || config.leftPanel?.type === 'recent';

  // ── Date state ────────────────────────────────────────────────────────────
  const [preset, setPreset] = useState<DatePreset>('today');
  const [dateRange, setDateRange] = useState<DateRange>(presetRange('today'));

  const handleDateChange = (p: DatePreset, r: DateRange) => {
    setPreset(p);
    setDateRange(r);
  };

  // ── Stats state ───────────────────────────────────────────────────────────
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [topDiagnoses, setTopDiagnoses] = useState<any[]>([]);
  const [recentAttendances, setRecentAttendances] = useState<any[]>([]);
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
        getDashboardStats({
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          period: preset !== 'custom' ? preset : undefined,
        }),
        needsRecent ? getEncounters({ limit: 12 }) : Promise.resolve(null),
      ]);

      if (currentRequestId.current !== requestId) return;
      const errs: string[] = [];

      if (statsResult.status === 'fulfilled') {
        const resp = statsResult.value;
        if (resp?.success && resp?.data) {
          const d = resp.data;
          setStats({
            totalPatients: d.totalPatients || 0,
            todayVisits: d.todayVisits || 0,
            activeAdmissions: d.activeAdmissions || 0,
            pendingBills: d.pendingBills || 0,
            pendingClaims: d.pendingClaims || 0,
            lowStockItems: d.lowStockItems || 0,
            totalRevenue: Number(d.totalRevenue) || 0,
            scheduledAppointments: d.scheduledAppointments || 0,
            completedProcedures: d.completedProcedures || 0,
          });
          setTopDiagnoses(d.topDiagnoses ?? []);
        }
      } else {
        errs.push('Statistics');
      }

      if (needsRecent && recentResult.status === 'fulfilled') {
        if (recentResult.value?.data) setRecentAttendances(recentResult.value.data);
      } else if (needsRecent) {
        errs.push('Recent activity');
      }

      if (errs.length > 0) {
        toastErrorRef.current(
          errs.length > 1 ? 'Load failed' : 'Partial load',
          `Could not load: ${errs.join(', ')}`
        );
        setErrors(errs.map(e => `Failed to load ${e.toLowerCase()}`));
      }
    } catch (err: any) {
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
  }, [needsRecent, dateRange, preset]);

  // Reload whenever date changes
  useEffect(() => { loadData(); }, [loadData]);

  // ── Panel renderer ────────────────────────────────────────────────────────
  const renderPanel = (spec: PanelSpec, key: string) => {
    switch (spec.type) {
      case 'worklist': return <WorklistPanel key={key} kind={spec.kind} />;
      case 'recent': return <RecentActivity key={key} items={recentAttendances} loading={isLoading} />;
      case 'diagnoses': return <TopDiagnoses key={key} items={topDiagnoses} loading={isLoading} />;
      case 'finance': return <FinanceSummary key={key} stats={stats} loading={isLoading} />;
      case 'stock': return <StockAlerts key={key} lowStock={stats.lowStockItems} loading={isLoading} />;
      case 'diagnoses-attendance': return <DiagnosesAndAttendance key={key} />;
      case 'nurse-summary': return <NurseSummary key={key} />;
      case 'midwife-summary': return <MidwifeSummary key={key} />;
      case 'lab-summary': return <LabSummary key={key} />;
      case 'scan-summary': return <ScanSummary key={key} />;
      case 'records-summary': return <RecordsSummary key={key} />;
      default: return null;
    }
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

  const statCards = config.cards.map(k => ({ key: k, ...STAT_CATALOG[k] }));
  const quickActions = config.quickActions
    .map(k => ({ key: k, ...(QUICK_ACTION_LOOKUP[k]) }))
    .filter(a => a.path);

  // ── Stat card label adapts to period ─────────────────────────────────────
  const visitLabel = preset === 'today' ? "Today's Visits"
    : preset === 'week' ? "This Week's Visits"
      : preset === 'month' ? "This Month's Visits"
        : "Visits";
  const revLabel = preset === 'today' ? "Today's Revenue"
    : preset === 'week' ? "Week's Revenue"
      : preset === 'month' ? "Month's Revenue"
        : "Revenue";

  return (
    <DashboardDateContext.Provider value={{ preset, dateRange }}>
      <div className="p-6" style={{ height: '100vh', background: 'var(--bg-main)', display: 'flex', flexDirection: 'column', gap: '1.25rem', overflow: 'hidden' }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4 flex-wrap flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Dashboard Overview</h1>
              {user.seniority && getSeniorityBadge(user.seniority)}
            </div>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Welcome back, {user.fullName}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Date toggle */}
            <DateToggle preset={preset} dateRange={dateRange} onChange={handleDateChange} />

            {/* Refresh */}
            <button onClick={loadData} disabled={refreshing}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all disabled:opacity-50"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* ── Error banner ────────────────────────────────────────────────── */}
        {errors.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 rounded-xl border flex-shrink-0"
            style={{ background: 'var(--icon-yellow-bg)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" style={{ color: 'var(--icon-yellow-text)' }} />
              <p className="text-sm" style={{ color: 'var(--icon-yellow-text)' }}>{errors.join(', ')}</p>
            </div>
            <button onClick={loadData}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-80"
              style={{ background: 'var(--icon-yellow-text)' }}>Retry</button>
          </div>
        )}

        {/* ── Grid ────────────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.25rem', flex: 1, minHeight: 0, overflow: 'hidden' }}>

          {/* LEFT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>

            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(Math.max(statCards.length, 1), 4)}, 1fr)`, gap: '0.75rem', flexShrink: 0 }}>
              {statCards.map(s => (
                <StatCard
                  key={s.key}
                  to={s.to}
                  label={s.key === 'todayVisits' ? visitLabel : s.key === 'totalRevenue' ? revLabel : s.label}
                  value={s.value(stats)}
                  sub={s.sub}
                  Icon={s.Icon}
                  bg={s.bg}
                  color={s.color}
                  loading={isLoading}
                />
              ))}
            </div>

            {/* Secondary / left panel */}
            {config.leftPanel && (
              <div style={{ flexShrink: 0, minHeight: 220, maxHeight: 360, display: 'flex' }}>
                {renderPanel(config.leftPanel, 'left')}
              </div>
            )}

            {/* Quick actions */}
            {quickActions.length > 0 && (
              <div className="rounded-xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', flexShrink: 0, marginTop: 'auto' }}>
                <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-main)' }}>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Quick actions</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Frequent operations</p>
                </div>
                <div className="p-4" style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(quickActions.length, 6)}, 1fr)`, gap: '0.75rem' }}>
                  {quickActions.map(a => (
                    <Link key={a.key} to={a.path}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl border transition-all hover:shadow-sm"
                      style={{ background: a.bg, borderColor: 'var(--border-color)', color: a.color }}>
                      <a.icon className="w-5 h-5" style={{ color: a.color }} />
                      <span className="text-xs font-medium text-center leading-tight" style={{ color: a.color }}>{a.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT */}
          <div style={{ minHeight: 0, height: '100%' }}>
            {renderPanel(config.rightPanel, 'right')}
          </div>
        </div>
      </div>
    </DashboardDateContext.Provider>
  );
}