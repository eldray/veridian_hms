// src/pages/Dashboard.tsx — Fixed-height regions with internal scrolling
import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import { getDashboardStats, getEncounters } from '../api';
import { RefreshCw, AlertCircle, Calendar, X, ChevronDown, ChevronUp, LayoutDashboard } from 'lucide-react';
import { Button, Card, cn, INPUT, PageHeader } from '../components/ui';

import {
  getRoleDashboard, STAT_CATALOG, SENIORITY_CONFIG, EMPTY_STATS,
  QUICK_ACTIONS as QUICK_ACTION_LOOKUP,
  type DashboardStats, type PanelSpec, type StatGroup, type StatKey,
} from '../config/dashboardConfig';
import {
  StatCard, WorklistPanel, RecentActivity, TopDiagnoses,
  FinanceSummary, StockAlerts,
  NurseSummary, MidwifeSummary, LabSummary, ScanSummary, RecordsSummary,
  MedsDuePanel, ExpiringStockPanel, CriticalResultsPanel,
  HighRiskANCPanel, BillingAgingPanel,
  HRWorklistPanel, HRSummaryPanel,
  PaymentModePanel, WardOccupancyPanel, RecentAdmissionsPanel,
  VitalsSnapshotPanel, RecentPaymentsPanel,
} from '../components/dashboard/DashboardPanels';
import { DiagnosesAndAttendance } from '../components/dashboard/DiagnosesAndAttendance';
import { DashboardDateContext, type DatePreset, type DateRange } from '../context/DashboardDateContext';
import { fetchRoleExtras } from '../api/dashboardExtras';
import type { Seniority } from '../types';

// ── helpers ─────────────────────────────────────────────────────────────────

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

const isStatActive = (key: StatKey, stats: DashboardStats): boolean => {
  const meta = STAT_CATALOG[key];
  if (!meta) return false;
  const v = meta.value(stats);
  if (typeof v === 'number') return v > 0;
  if (typeof v === 'string') {
    const num = Number(v.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(num) && num > 0;
  }
  return false;
};

const PRESETS: { key: DatePreset; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This week' },
  { key: 'month', label: 'This month' },
  { key: 'custom', label: 'Custom' },
];

// ── Date toggle ────────────────────────────────────────────────────────────

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

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setShowCustom(false);
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
    : null;

  return (
    <div className="relative flex items-center gap-1" ref={popRef}>
      <div
        className="flex items-center gap-0.5 rounded-lg border border-[var(--border-color)] p-0.5"
        style={{ background: 'var(--bg-main)' }}
      >
        {PRESETS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handlePreset(key)}
            className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
            style={
              preset === key
                ? { background: 'var(--icon-cyan-text)', color: '#fff' }
                : { color: 'var(--text-secondary)' }
            }
          >
            {label}
          </button>
        ))}
      </div>

      {rangeLabel && (
        <div
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--border-color)] text-xs"
          style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)' }}
        >
          <Calendar className="w-3.5 h-3.5" style={{ color: 'var(--icon-cyan-text)' }} />
          <span style={{ color: 'var(--text-primary)' }}>{rangeLabel}</span>
        </div>
      )}

      {showCustom && (
        <div
          className="absolute top-full right-0 mt-2 z-50 rounded-xl border border-[var(--border-color)] shadow-lg p-4 w-72"
          style={{ background: 'var(--bg-card)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Custom range</p>
            <Button variant="ghost" size="sm" iconOnly icon={X} aria-label="Close custom date range" onClick={() => setShowCustom(false)} />
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: 'var(--text-tertiary)' }}>
                From
              </label>
              <input
                type="date"
                value={draft.startDate}
                max={draft.endDate || today()}
                onChange={e => setDraft(d => ({ ...d, startDate: e.target.value }))}
                className={cn(INPUT, 'w-full text-xs focus:outline-none')}
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: 'var(--text-tertiary)' }}>
                To
              </label>
              <input
                type="date"
                value={draft.endDate}
                min={draft.startDate}
                max={today()}
                onChange={e => setDraft(d => ({ ...d, endDate: e.target.value }))}
                className={cn(INPUT, 'w-full text-xs focus:outline-none')}
              />
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1 border-t border-[var(--border-color)]">
              {[
                { label: 'Last 7 days', days: 7 },
                { label: 'Last 14 days', days: 14 },
                { label: 'Last 30 days', days: 30 },
                { label: 'Last 90 days', days: 90 },
              ].map(({ label, days }) => (
                <Button
                  key={days}
                  size="xs"
                  variant="secondary"
                  onClick={() => {
                    const end = new Date();
                    const start = new Date();
                    start.setDate(end.getDate() - (days - 1));
                    setDraft({
                      startDate: start.toISOString().split('T')[0],
                      endDate: end.toISOString().split('T')[0],
                    });
                  }}
                >
                  {label}
                </Button>
              ))}
            </div>

            <Button
              variant="primary"
              fullWidth
              onClick={applyCustom}
              disabled={!draft.startDate || !draft.endDate || draft.startDate > draft.endDate}
            >
              Apply range
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Stat group section ─────────────────────────────────────────────────────
// The grid of StatCards scrolls internally if the group has many cards.

function StatGroupSection({
  group, collapsed, onToggle, stats, loading, visitLabel, revLabel,
}: {
  group: StatGroup;
  collapsed: boolean;
  onToggle: () => void;
  stats: DashboardStats;
  loading: boolean;
  visitLabel: string;
  revLabel: string;
}) {
  const statCards = group.cards
    .map(k => ({ key: k, ...STAT_CATALOG[k] }))
    .filter(s => s && s.Icon);
  const Icon = group.icon;

  return (
    <div className="flex flex-col min-h-0" style={{ flex: '1 1 auto' }}>
      <div className="flex items-center justify-between px-1 flex-shrink-0">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4" style={{ color: 'var(--icon-cyan-text)' }} />}
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
            {group.label}
          </span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
            style={{ background: 'var(--bg-main)', color: 'var(--text-tertiary)' }}
          >
            {group.cards.length}
          </span>
        </div>
        <button
          onClick={onToggle}
          aria-label={collapsed ? 'Expand section' : 'Collapse section'}
          className="p-1 rounded transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
      </div>

      {!collapsed && (
        <div
          className="mt-2 min-h-0"
          style={{
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            // Fade-out hint that content scrolls
            scrollbarWidth: 'thin',
          }}
        >
          <div
            className="grid gap-3 pb-1"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}
          >
            {statCards.map(s => (
              <StatCard
                key={s.key}
                to={s.to}
                label={
                  s.key === 'todayVisits' ? visitLabel
                    : s.key === 'totalRevenue' ? revLabel
                    : s.label
                }
                value={s.value(stats)}
                sub={s.sub}
                Icon={s.Icon}
                bg={s.bg}
                color={s.color}
                loading={loading}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Stat tabs ──────────────────────────────────────────────────────────────

function StatTabs({
  groups, activeKey, onSelect, stats,
}: {
  groups: StatGroup[];
  activeKey: string;
  onSelect: (key: string) => void;
  stats: DashboardStats;
}) {
  return (
    <div
      className="flex items-center gap-1 flex-wrap rounded-lg border border-[var(--border-color)] p-0.5 flex-shrink-0"
      style={{ background: 'var(--bg-main)' }}
    >
      {groups.map(g => {
        const Icon = g.icon;
        const isActive = activeKey === g.key;

        let badgeCount: number | null = null;
        if (g.alertsOnly) {
          badgeCount = g.cards.filter(k => isStatActive(k, stats)).length;
        }

        return (
          <button
            key={g.key}
            onClick={() => onSelect(g.key)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
            style={
              isActive
                ? { background: 'var(--icon-cyan-text)', color: '#fff' }
                : { color: 'var(--text-secondary)' }
            }
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            <span>{g.label}</span>
            {badgeCount !== null && badgeCount > 0 && (
              <span
                className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none"
                style={{
                  background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--icon-red-bg)',
                  color: isActive ? '#fff' : 'var(--icon-red-text)',
                }}
              >
                {badgeCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Dashboard
// ═════════════════════════════════════════════════════════════════════════════

export default function Dashboard() {
  const { user } = useAuthStore();
  const { error: toastError } = useToast();
  const toastErrorRef = useRef(toastError);
  toastErrorRef.current = toastError;

  const role = user?.role ?? '';
  const config = getRoleDashboard(role);

  const needsRecent = config.sidebarPanel.type === 'recent';

  const [preset, setPreset] = useState<DatePreset>('today');
  const [dateRange, setDateRange] = useState<DateRange>(presetRange('today'));

  const handleDateChange = (p: DatePreset, r: DateRange) => {
    setPreset(p);
    setDateRange(r);
  };

  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [topDiagnoses, setTopDiagnoses] = useState<any[]>([]);
  const [recentAttendances, setRecentAttendances] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem('dashboard.collapsedGroups');
      return stored ? JSON.parse(stored) : {};
    } catch { return {}; }
  });

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => {
      const next = { ...prev, [key]: !prev[key] };
      try { localStorage.setItem('dashboard.collapsedGroups', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const statGroups: StatGroup[] =
    config.cardGroups && config.cardGroups.length > 0
      ? config.cardGroups
      : [{ key: 'all', label: '', icon: () => null, cards: config.cards || [] }];

  const showTabs = statGroups.length > 1;

  const defaultTabKey = (() => {
    const def = statGroups.find(g => g.defaultActive) ?? statGroups[0];
    return def?.key ?? '';
  })();

  const [activeTab, setActiveTab] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(`dashboard.activeTab.${role}`);
      if (stored && statGroups.some(g => g.key === stored)) return stored;
    } catch {}
    return defaultTabKey;
  });

  useEffect(() => {
    if (!statGroups.some(g => g.key === activeTab)) {
      setActiveTab(defaultTabKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const handleSelectTab = (key: string) => {
    setActiveTab(key);
    try { localStorage.setItem(`dashboard.activeTab.${role}`, key); } catch {}
  };

  const currentRequestId = useRef(0);

  const loadData = useCallback(async () => {
    const requestId = ++currentRequestId.current;
    setIsLoading(true);
    setRefreshing(true);
    setErrors([]);

    try {
      const [statsResult, recentResult, extrasResult] = await Promise.allSettled([
        getDashboardStats({
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          period: preset !== 'custom' ? preset : undefined,
        }),
        needsRecent ? getEncounters({ limit: 12 }) : Promise.resolve(null),
        fetchRoleExtras(role),
      ]);

      if (currentRequestId.current !== requestId) return;
      const errs: string[] = [];

      let baseStats: Partial<DashboardStats> = {};
      if (statsResult.status === 'fulfilled') {
        const resp = statsResult.value as any;
        const d = resp?.data?.data ?? resp?.data ?? resp ?? {};
        if (typeof d.totalPatients === 'number' || typeof d.todayVisits === 'number') {
          baseStats = {
            totalPatients: d.totalPatients || 0,
            todayVisits: d.todayVisits || 0,
            activeAdmissions: d.activeAdmissions || 0,
            pendingBills: d.pendingBills || 0,
            pendingClaims: d.pendingClaims || 0,
            lowStockItems: d.lowStockItems || 0,
            totalRevenue: Number(d.totalRevenue) || 0,
            scheduledAppointments: d.scheduledAppointments || 0,
            completedProcedures: d.completedProcedures || 0,
          };
          setTopDiagnoses(d.topDiagnoses ?? []);
        }
      } else {
        errs.push('Statistics');
      }

      let extras: Partial<DashboardStats> = {};
      if (extrasResult.status === 'fulfilled') {
        extras = extrasResult.value as Partial<DashboardStats>;
      } else {
        errs.push('Role summary');
      }

      setStats({ ...EMPTY_STATS, ...baseStats, ...extras });

      if (needsRecent && recentResult.status === 'fulfilled') {
        const r = recentResult.value as any;
        if (r?.data) setRecentAttendances(r.data);
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
        setIsLoading(false);
        setRefreshing(false);
      }
    }
  }, [needsRecent, dateRange, preset, role]);

  useEffect(() => { loadData(); }, [loadData]);

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
      case 'meds-due': return <MedsDuePanel key={key} />;
      case 'expiring-stock': return <ExpiringStockPanel key={key} />;
      case 'critical-results': return <CriticalResultsPanel key={key} />;
      case 'high-risk-anc': return <HighRiskANCPanel key={key} />;
      case 'billing-aging': return <BillingAgingPanel key={key} />;
      case 'hr-worklist': return <HRWorklistPanel key={key} />;
      case 'hr-summary': return <HRSummaryPanel key={key} />;
      case 'payment-mode': return <PaymentModePanel key={key} />;
      case 'ward-occupancy': return <WardOccupancyPanel key={key} />;
      case 'recent-admissions': return <RecentAdmissionsPanel key={key} />;
      case 'vitals-snapshot': return <VitalsSnapshotPanel key={key} />;
      case 'recent-payments': return <RecentPaymentsPanel key={key} />;
      default: return null;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-main)' }}>
        <div className="text-center p-8 rounded-2xl border border-[var(--border-color)]" style={{ background: 'var(--bg-card)' }}>
          <AlertCircle className="w-14 h-14 mx-auto mb-4" style={{ color: 'var(--icon-cyan-text)' }} />
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Session expired</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Please log in to access the dashboard.</p>
        </div>
      </div>
    );
  }

  const quickActions = config.quickActions
    .map(k => ({ key: k, ...(QUICK_ACTION_LOOKUP[k]) }))
    .filter(a => a.path);

  const visitLabel = preset === 'today' ? "Today's Visits"
    : preset === 'week' ? "This Week's Visits"
      : preset === 'month' ? "This Month's Visits"
        : "Visits";
  const revLabel = preset === 'today' ? "Today's Revenue"
    : preset === 'week' ? "Week's Revenue"
      : preset === 'month' ? "Month's Revenue"
        : "Revenue";

  const visibleGroups: StatGroup[] = showTabs
    ? statGroups.filter(g => g.key === activeTab)
    : statGroups;

  const applyGroupFilter = (group: StatGroup): StatGroup => {
    if (!group.alertsOnly) return group;
    const filtered = group.cards.filter(k => isStatActive(k, stats));
    return { ...group, cards: filtered };
  };

  const activeGroupForAlerts = showTabs
    ? statGroups.find(g => g.key === activeTab)
    : statGroups[0];
  const alertsAllClear =
    activeGroupForAlerts?.alertsOnly === true &&
    activeGroupForAlerts.cards.every(k => !isStatActive(k, stats));

  return (
    <DashboardDateContext.Provider value={{ preset, dateRange }}>
      {/*
        ────────────────────────────────────────────────────────────────
        LAYOUT CONTRACT
        ────────────────────────────────────────────────────────────────
        • Root is a grid with fixed height = viewport minus page padding.
        • Rows:  auto (header)   → fits content
                 auto (error)    → fits content (or 0 if hidden)
                 1fr (main)      → takes all remaining space, never grows
                 auto (actions)  → fits content (or 0 if hidden)
        • Main row is itself a grid: content (1fr) + sidebar (320px).
        • Inside content: stats (auto) + panels (1fr).
        • Each scrollable region uses min-h-0 + overflow-y-auto.
        • Nothing pushes the page. Only inner regions scroll.
      */}
      <div
        style={{
          height: '100dvh',
          background: 'var(--bg-main)',
          display: 'grid',
          gridTemplateRows: 'auto auto 1fr auto',
          gap: '1rem',
          padding: '1rem',
          overflow: 'hidden',
        }}
        className="lg:p-6"
      >
        {/* ── HEADER ───────────────────────────────────────────── */}
        <PageHeader
          className="min-h-0"
          title={(
            <span className="flex items-center gap-2 flex-wrap">
              Dashboard
              {user.seniority && getSeniorityBadge(user.seniority)}
            </span>
          )}
          subtitle={`Welcome back, ${user.fullName}`}
          icon={LayoutDashboard}
          accent="cyan"
          actions={(
            <>
              <DateToggle preset={preset} dateRange={dateRange} onChange={handleDateChange} />
              <Button icon={RefreshCw} loading={refreshing} onClick={loadData}>
                {refreshing ? 'Refreshing…' : 'Refresh'}
              </Button>
            </>
          )}
        />

        {/* ── ERROR BANNER (auto-height row, collapses to 0 when empty) ── */}
        {errors.length > 0 && (
          <div
            className="flex items-center justify-between px-4 py-3 rounded-xl border border-[var(--border-color)] min-h-0"
            style={{ background: 'var(--icon-yellow-bg)' }}
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" style={{ color: 'var(--icon-yellow-text)' }} />
              <p className="text-sm" style={{ color: 'var(--icon-yellow-text)' }}>{errors.join(', ')}</p>
            </div>
            <Button size="sm" variant="soft" accent="yellow" onClick={loadData}>Retry</Button>
          </div>
        )}

        {/* ── MAIN ────────────────────────────────────────────── */}
        {/* Two columns: main content (flex 1) and sidebar (320px).
            Both columns are constrained to the row's height. */}
        <div
          className="grid gap-4 min-h-0"
          style={{
            gridTemplateColumns: 'minmax(0, 1fr) 320px',
            height: '100%',
            minHeight: 0,
          }}
        >
          {/* LEFT column: stats + panels stacked; stats auto, panels fill */}
          <div
            className="min-h-0"
            style={{
              display: 'grid',
              gridTemplateRows: 'auto minmax(0, 1fr)',
              gap: '1rem',
            }}
          >
            {/* Stats block */}
            <div className="flex flex-col gap-3 min-h-0" style={{ maxHeight: '40vh' }}>
              {showTabs && (
                <StatTabs
                  groups={statGroups}
                  activeKey={activeTab}
                  onSelect={handleSelectTab}
                  stats={stats}
                />
              )}

              {alertsAllClear && !isLoading ? (
                <div
                  className="rounded-xl border border-[var(--border-color)] px-4 py-6 flex items-center gap-3 flex-shrink-0"
                  style={{ background: 'var(--icon-green-bg)' }}
                >
                  <span className="text-2xl">✅</span>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--icon-green-text)' }}>All clear</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      No alerts requiring attention right now.
                    </p>
                  </div>
                </div>
              ) : (
                <div
                  className="min-h-0"
                  style={{
                    overflowY: 'auto',
                    overscrollBehavior: 'contain',
                    scrollbarWidth: 'thin',
                  }}
                >
                  <div className="flex flex-col gap-3">
                    {visibleGroups.map(group => (
                      <StatGroupSection
                        key={group.key}
                        group={applyGroupFilter(group)}
                        collapsed={collapsedGroups[group.key] || false}
                        onToggle={() => toggleGroup(group.key)}
                        stats={stats}
                        loading={isLoading}
                        visitLabel={visitLabel}
                        revLabel={revLabel}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Panels block — fills remaining height, each panel internally scrolled */}
            {config.primaryPanels.length > 0 && (
              <div
                className="grid gap-4 min-h-0"
                style={{
                  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                  gridAutoRows: 'minmax(0, 1fr)',
                  overflow: 'hidden',
                }}
              >
                {config.primaryPanels.map((spec, idx) => (
                  <div
                    key={idx}
                    className="min-h-0 min-w-0 overflow-hidden"
                    style={{ display: 'flex', flexDirection: 'column' }}
                  >
                    {/*
                      Each panel wrapper is a flex column with:
                      • flex: 1 (fill parent grid cell)
                      • overflow: hidden (so children can be internally scrolled)
                      The panel component itself should have overflow-y-auto
                      on its body — see the note at the bottom of this file.
                    */}
                    <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                      {renderPanel(spec, `primary-${idx}`)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT column: sidebar, full row height, internal scroll */}
          <div
            className="min-h-0"
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {renderPanel(config.sidebarPanel, 'sidebar')}
          </div>
        </div>

        {/* ── QUICK ACTIONS (auto-height row) ─────────────────── */}
        {quickActions.length > 0 && (
          <Card
            title="Quick actions"
            description="Frequent operations"
            accent="cyan"
            padded={false}
            className="flex flex-col min-h-0 max-h-[22vh] [&>div:last-child]:flex-1 [&>div:last-child]:min-h-0 [&>div:last-child]:overflow-y-auto"
          >
            <div
              className="p-4 grid gap-3"
              style={{
                overscrollBehavior: 'contain',
                scrollbarWidth: 'thin',
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              }}
            >
              {quickActions.map(a => (
                <Link
                  key={a.key}
                  to={a.path}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border border-[var(--border-color)] transition-all hover:shadow-sm"
                  style={{ background: a.bg, color: a.color }}
                >
                  <a.icon className="w-5 h-5" style={{ color: a.color }} />
                  <span className="text-xs font-medium text-center leading-tight" style={{ color: a.color }}>
                    {a.label}
                  </span>
                </Link>
              ))}
            </div>
          </Card>
        )}
      </div>
    </DashboardDateContext.Provider>
  );
}