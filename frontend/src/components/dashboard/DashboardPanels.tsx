// src/components/dashboard/DashboardPanels.tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock, Stethoscope, Shield, Hospital, CreditCard, Heart, FileText,
  DollarSign, Package, ClipboardList, AlertCircle, ChevronRight,
  Activity, FlaskConical, ScanLine, Users, Baby, UserPlus,
  CheckCircle, Bed, Calendar,
} from 'lucide-react';
import type { PaymentMode } from '../../types';
import {
  getVitalsWorklist, getMedicalWorklist, getLabWorklist,
  getPharmacyWorklist, getScansWorklist, getMaternalWorklist,
  getRequisitions,
  getEncounters,
  getAntenatalStatistics, getDeliveryStatistics,
  getLabReport, getScanReport,
  getPatients, getReferrals, getAppointments,
} from '../../api';
import {
  WORKLIST_META, type WorklistKind, type DashboardStats,
  fmtTime, patientFullName, getStatusStyle,
} from '../../config/dashboardConfig';
import { DiagnosesAndAttendance } from './DiagnosesAndAttendance';

// ── unwrap helper (mirrors reportsStore) ──────────────────────────────────────
const unwrap = (r: any): any => {
  if (r?.success && r?.data) {
    if (r.data.data !== undefined) return r.data.data;
    return r.data;
  }
  if (r?.data) return r.data;
  return r;
};

// ============================================
// STAT CARD
// ============================================

export const StatCard = ({
  to, label, value, sub, Icon, bg, color, loading,
}: {
  to: string; label: string; value: React.ReactNode; sub?: string;
  Icon: React.ComponentType<any>; bg: string; color: string; loading: boolean;
}) => (
  <Link to={to} className="rounded-xl p-4 border transition-all hover:shadow-sm"
    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>
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
// PANEL SHELL
// ============================================

const PanelShell = ({
  title, subtitle, Icon, iconColor, badge, children,
}: {
  title: string; subtitle?: string; Icon?: React.ComponentType<any>;
  iconColor?: string; badge?: React.ReactNode; children: React.ReactNode;
}) => (
  <div className="rounded-xl border flex flex-col"
    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', height: '100%', minHeight: 0, overflow: 'hidden' }}>
    <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
      style={{ borderColor: 'var(--border-color)', background: 'var(--bg-main)' }}>
      <div className="flex items-center gap-2 min-w-0">
        {Icon && <Icon className="w-4 h-4 flex-shrink-0" style={{ color: iconColor || 'var(--text-secondary)' }} />}
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{title}</p>
          {subtitle && <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>}
        </div>
      </div>
      {badge}
    </div>
    <div className="flex-1 overflow-y-auto p-3" style={{ minHeight: 0 }}>{children}</div>
  </div>
);

const CountBadge = ({ n }: { n: number }) => (
  <div className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-semibold"
    style={{ background: 'var(--icon-cyan-bg)', color: 'var(--icon-cyan-text)' }}>{n}</div>
);

const ListSkeleton = ({ rows = 5, h = 'h-14' }: { rows?: number; h?: string }) => (
  <div className="space-y-2">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className={`${h} rounded-lg animate-pulse`} style={{ background: 'var(--bg-main)' }} />
    ))}
  </div>
);

const EmptyState = ({ Icon, text }: { Icon: React.ComponentType<any>; text: string }) => (
  <div className="flex flex-col items-center justify-center h-full py-12 text-center">
    <Icon className="w-10 h-10 mb-3" style={{ color: 'var(--text-tertiary)' }} />
    <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{text}</p>
  </div>
);

// Compact metric tile used inside summary panels
const MetricTile = ({ label, value, color, Icon }: {
  label: string; value: React.ReactNode; color: string; Icon: React.ComponentType<any>;
}) => (
  <div className="rounded-lg px-3 py-2.5 border"
    style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}>
    <div className="flex items-center gap-1.5 mb-1">
      <Icon className="w-3 h-3" style={{ color }} />
      <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
    </div>
    <p className="text-lg font-bold leading-none" style={{ color }}>{value}</p>
  </div>
);

// ============================================
// WORKLIST PANEL
// ============================================

const WORKLIST_FETCHERS: Record<WorklistKind, () => Promise<any>> = {
  medical: getMedicalWorklist,
  vitals: getVitalsWorklist,
  lab: getLabWorklist,
  pharmacy: getPharmacyWorklist,
  scans: getScansWorklist,
  maternal: getMaternalWorklist,
};

const PRIORITY_STYLE: Record<string, { bg: string; color: string }> = {
  stat: { bg: 'var(--icon-red-bg)', color: 'var(--icon-red-text)' },
  critical: { bg: 'var(--icon-red-bg)', color: 'var(--icon-red-text)' },
  urgent: { bg: 'var(--icon-orange-bg)', color: 'var(--icon-orange-text)' },
};

export function WorklistPanel({ kind }: { kind: WorklistKind }) {
  const meta = WORKLIST_META[kind];
  const [items, setItems] = useState<any[]>([]);
  const [pending, setPending] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    WORKLIST_FETCHERS[kind]()
      .then((res) => {
        if (!active) return;
        const payload = res?.data ?? res;
        const list: any[] = Array.isArray(payload?.data) ? payload.data
          : Array.isArray(payload) ? payload : [];
        setItems(list);
        setPending(payload?.pending ?? payload?.total ?? list.length);
      })
      .catch(() => { if (active) { setItems([]); setPending(0); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [kind]);

  return (
    <PanelShell title={meta.title} subtitle={meta.subtitle} Icon={meta.Icon} iconColor={meta.color}
      badge={
        <Link to={meta.viewAllTo} className="flex items-center gap-1 text-xs font-medium"
          style={{ color: 'var(--icon-cyan-text)' }}>
          View all <ChevronRight className="w-3 h-3" />
        </Link>
      }>
      {loading ? <ListSkeleton /> : items.length === 0 ? (
        <EmptyState Icon={meta.Icon} text={meta.emptyText} />
      ) : (
        <>
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Waiting</span>
            <CountBadge n={pending} />
          </div>
          <div className="space-y-2">
            {items.slice(0, 25).map((it) => {
              const pr = PRIORITY_STYLE[it.priority];
              const loc = it.location?.ward
                ? `${it.location.ward}${it.location.bed ? ` · ${it.location.bed}` : ''}` : null;
              return (
                <Link key={it.id || it.attendanceId}
                  to={`${meta.itemLinkBase}${it.attendanceId || it.id}`}
                  className="flex flex-col gap-1.5 p-3 rounded-lg border transition-all hover:shadow-sm"
                  style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold truncate flex-1" style={{ color: 'var(--text-primary)' }}>
                      {patientFullName(it)}
                    </p>
                    {pr && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase flex-shrink-0"
                        style={{ background: pr.bg, color: pr.color }}>
                        {it.priority}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded flex-shrink-0"
                        style={{ background: 'var(--bg-card)', color: 'var(--text-tertiary)' }}>
                        {it.patient?.folderNumber || '—'}
                      </span>
                      {loc && <span className="text-[10px] truncate" style={{ color: 'var(--text-tertiary)' }}>{loc}</span>}
                    </div>
                    {typeof it.waitTime === 'number' && it.waitTime > 0 && (
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <Clock className="w-2.5 h-2.5" style={{ color: 'var(--text-tertiary)' }} />
                        <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{it.waitTime}m</span>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </PanelShell>
  );
}

// ============================================
// RECENT ACTIVITY
// ============================================

const paymentModeIcon = (mode: PaymentMode) => {
  switch (mode) {
    case 'nhis': return <Shield className="w-3 h-3" style={{ color: 'var(--icon-green-text)' }} />;
    case 'private_insurance': return <Hospital className="w-3 h-3" style={{ color: 'var(--icon-cyan-text)' }} />;
    default: return <CreditCard className="w-3 h-3" style={{ color: 'var(--text-tertiary)' }} />;
  }
};
const paymentModeLabel = (mode: PaymentMode) =>
  ({ cash: 'Cash', nhis: 'NHIS', private_insurance: 'Insurance' } as Record<string, string>)[mode] ?? 'Cash';

export function RecentActivity({ items, loading }: { items: any[]; loading: boolean }) {
  return (
    <PanelShell title="Recent Activity" subtitle="Latest patient visits" badge={<CountBadge n={items.length} />}>
      {loading ? <ListSkeleton /> : items.length === 0 ? (
        <EmptyState Icon={Stethoscope} text="No visits recorded" />
      ) : (
        <div className="space-y-2">
          {items.map((att) => {
            const patient = att.patient ?? att.Patient ?? {};
            const ss = getStatusStyle(att.status || 'pending');
            const status = att.status || 'pending';
            return (
              <Link key={att.id} to={`/dashboard/attendance/${att.id}`}
                className="flex flex-col gap-1.5 p-3 rounded-lg border transition-all"
                style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold truncate flex-1" style={{ color: 'var(--text-primary)' }}>
                    {patientFullName(att)}
                  </p>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {paymentModeIcon(att.paymentMode)}
                    <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                      {paymentModeLabel(att.paymentMode)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                      style={{ background: 'var(--bg-card)', color: 'var(--text-tertiary)' }}>
                      {patient.folderNumber || '—'}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                      {att.attendanceNumber || '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                      style={{ background: ss.bg, color: ss.color }}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
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
    </PanelShell>
  );
}

// ============================================
// TOP DIAGNOSES
// ============================================

export function TopDiagnoses({ items, loading }: { items: any[]; loading: boolean }) {
  return (
    <PanelShell title="Top Diagnoses" subtitle="Last 30 days" Icon={Heart} iconColor="var(--icon-red-text)">
      {loading ? <ListSkeleton rows={5} h="h-10" /> : items.length === 0 ? (
        <EmptyState Icon={Heart} text="No diagnoses recorded" />
      ) : (
        <div className="space-y-2">
          {items.slice(0, 10).map((t, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg"
              style={{ background: 'var(--bg-main)' }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
                style={{ background: 'var(--icon-cyan-bg)', color: 'var(--icon-cyan-text)' }}>{i + 1}</div>
              <div className="flex-1 min-w-0">
                <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{t.disease}</span>
                {t.icdCode && t.icdCode !== '—' && (
                  <span className="text-[10px] ml-2" style={{ color: 'var(--text-tertiary)' }}>({t.icdCode})</span>
                )}
              </div>
              <span className="text-xs font-semibold flex-shrink-0" style={{ color: 'var(--icon-cyan-text)' }}>
                {t.patients} cases
              </span>
            </div>
          ))}
        </div>
      )}
    </PanelShell>
  );
}

// ============================================
// FINANCE SUMMARY
// ============================================

export function FinanceSummary({ stats, loading }: { stats: DashboardStats; loading: boolean }) {
  const tiles = [
    { label: "Today's Revenue", value: `₵${Number(stats.totalRevenue).toFixed(2)}`, Icon: DollarSign, bg: 'var(--icon-green-bg)', color: 'var(--icon-green-text)', to: '/dashboard/billing' },
    { label: 'Pending Bills', value: stats.pendingBills, Icon: FileText, bg: 'var(--icon-purple-bg)', color: 'var(--icon-purple-text)', to: '/dashboard/billing' },
    { label: 'Pending Claims', value: stats.pendingClaims, Icon: Shield, bg: 'var(--icon-yellow-bg)', color: 'var(--icon-yellow-text)', to: '/dashboard/insurance-claims' },
  ];
  return (
    <PanelShell title="Finance Summary" subtitle="Today" Icon={DollarSign} iconColor="var(--icon-green-text)">
      {loading ? <ListSkeleton rows={3} h="h-16" /> : (
        <div className="space-y-2">
          {tiles.map((t) => (
            <Link key={t.label} to={t.to}
              className="flex items-center justify-between p-3 rounded-lg border transition-all hover:shadow-sm"
              style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: t.bg }}>
                  <t.Icon className="w-4 h-4" style={{ color: t.color }} />
                </div>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t.label}</span>
              </div>
              <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{t.value}</span>
            </Link>
          ))}
        </div>
      )}
    </PanelShell>
  );
}

// ============================================
// STOCK ALERTS
// ============================================

export function StockAlerts({ lowStock, loading }: { lowStock: number; loading: boolean }) {
  const [pendingReqs, setPendingReqs] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    getRequisitions({ status: 'submitted', limit: 100 })
      .then((list: any) => { if (active) setPendingReqs(Array.isArray(list) ? list.length : 0); })
      .catch(() => { if (active) setPendingReqs(0); });
    return () => { active = false; };
  }, []);

  const rows = [
    { label: 'Low stock items', value: lowStock, sub: 'Need reorder', Icon: Package, bg: 'var(--icon-red-bg)', color: 'var(--icon-red-text)', to: '/dashboard/stock' },
    { label: 'Requisitions to approve', value: pendingReqs ?? '—', sub: 'Submitted', Icon: ClipboardList, bg: 'var(--icon-yellow-bg)', color: 'var(--icon-yellow-text)', to: '/dashboard/requisitions' },
  ];
  return (
    <PanelShell title="Stock Alerts" subtitle="Inventory needing attention" Icon={AlertCircle} iconColor="var(--icon-red-text)">
      {loading ? <ListSkeleton rows={2} h="h-16" /> : (
        <div className="space-y-2">
          {rows.map((r) => (
            <Link key={r.label} to={r.to}
              className="flex items-center justify-between p-3 rounded-lg border transition-all hover:shadow-sm"
              style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: r.bg }}>
                  <r.Icon className="w-4 h-4" style={{ color: r.color }} />
                </div>
                <div>
                  <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{r.label}</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{r.sub}</p>
                </div>
              </div>
              <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{r.value}</span>
            </Link>
          ))}
        </div>
      )}
    </PanelShell>
  );
}

// ============================================
// NURSE SUMMARY  (admitted patients + vitals due)
// ============================================

export function NurseSummary() {
  const [admitted, setAdmitted] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getEncounters({ status: 'admitted', limit: 50 })
      .then((res) => {
        if (!active) return;
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        setAdmitted(list);
      })
      .catch(() => { if (active) setAdmitted([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const ipd = admitted.filter(a => a.encounterCategory === 'ipd');
  const daycase = admitted.filter(a => a.encounterCategory === 'daycase');
  const medsReady = admitted.reduce((acc, a) => {
    const dispensed = (a.Medication || []).filter((m: any) => m.status === 'dispensed').length;
    return acc + dispensed;
  }, 0);

  return (
    <PanelShell title="Ward Summary" subtitle="Admitted patients today" Icon={Bed} iconColor="var(--icon-green-text)"
      badge={<CountBadge n={admitted.length} />}>
      {loading ? <ListSkeleton rows={4} h="h-10" /> : (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="relative">
              <MetricTile label="IPD" value={ipd.length} color="var(--icon-purple-text)" Icon={Hospital} />
              <Link to="/dashboard/nursing?filter=ipd" className="absolute top-1 right-1 text-[10px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-0.5">
                View <ChevronRight className="w-2.5 h-2.5" />
              </Link>
            </div>
            <div className="relative">
              <MetricTile label="Day Care" value={daycase.length} color="var(--icon-cyan-text)" Icon={Bed} />
              <Link to="/dashboard/nursing?filter=daycase" className="absolute top-1 right-1 text-[10px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-0.5">
                View <ChevronRight className="w-2.5 h-2.5" />
              </Link>
            </div>
            <div className="relative">
              <MetricTile label="Meds Due" value={medsReady} color="var(--icon-orange-text)" Icon={Activity} />
              <Link to="/dashboard/pharmacy" className="absolute top-1 right-1 text-[10px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-0.5">
                View <ChevronRight className="w-2.5 h-2.5" />
              </Link>
            </div>
          </div>

          <div className="pt-1">
            <p className="text-[9px] font-semibold uppercase tracking-wider mb-2"
              style={{ color: 'var(--text-tertiary)' }}>Admitted patients</p>
            {admitted.length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: 'var(--text-tertiary)' }}>No admitted patients</p>
            ) : (
              <div className="space-y-1.5">
                {admitted.slice(0, 6).map((a) => {
                  const p = a.patient || a.Patient || {};
                  const name = p.name || p.fullName || `${p.surname || ''} ${p.otherNames || ''}`.trim() || 'Unknown';
                  const bed = a.Bed?.bedNumber || a.bed?.bedNumber || '—';
                  const ward = a.Ward?.wardName || a.ward?.wardName || '';
                  return (
                    <Link key={a.id} to={`/dashboard/nursing`}
                      className="flex items-center justify-between px-3 py-2 rounded-lg border"
                      style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{name}</p>
                        <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                          {p.folderNumber || '—'}{ward ? ` · ${ward}` : ''}
                        </p>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded flex-shrink-0 ml-2"
                        style={{ background: 'var(--icon-green-bg)', color: 'var(--icon-green-text)' }}>
                        Bed {bed}
                      </span>
                    </Link>
                  );
                })}
                {admitted.length > 6 && (
                  <Link to="/dashboard/nursing" className="block text-center text-xs py-1"
                    style={{ color: 'var(--icon-cyan-text)' }}>
                    +{admitted.length - 6} more →
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </PanelShell>
  );
}

// ============================================
// MIDWIFE SUMMARY  (ANC + delivery stats)
// ============================================

export function MidwifeSummary() {
  const [ancStats, setAncStats] = useState<any>(null);
  const [delStats, setDelStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const today = new Date().toISOString().split('T')[0];
    const f = { startDate: today, endDate: today };

    Promise.allSettled([
      getAntenatalStatistics(f),
      getDeliveryStatistics(f),
    ]).then(([ancRes, delRes]) => {
      if (!active) return;
      if (ancRes.status === 'fulfilled') {
        const d = unwrap(ancRes.value);
        setAncStats(d);
      }
      if (delRes.status === 'fulfilled') {
        const d = unwrap(delRes.value);
        setDelStats(d);
      }
    }).finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, []);

  const ancTotal = ancStats?.totalBookings || ancStats?.total || 0;
  const ancToday = ancStats?.todayVisits || ancStats?.visits || 0;
  const delTotal = delStats?.totalDeliveries || delStats?.total || 0;
  const liveTotal = delStats?.livebirths || delStats?.live || 0;
  const csTotal = delStats?.caesarean || delStats?.csection || 0;

  return (
    <PanelShell title="Maternal Overview" subtitle="Today's ANC & deliveries" Icon={Baby} iconColor="var(--icon-red-text)">
      {loading ? <ListSkeleton rows={4} h="h-10" /> : (
        <div className="space-y-3">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--text-tertiary)' }}>Antenatal</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <MetricTile label="ANC Bookings" value={ancTotal} color="var(--icon-cyan-text)" Icon={Users} />
                <Link to="/dashboard/antenatal" className="absolute top-1 right-1 text-[10px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-0.5">
                  View <ChevronRight className="w-2.5 h-2.5" />
                </Link>
              </div>
              <div className="relative">
                <MetricTile label="Visits Today" value={ancToday} color="var(--icon-green-text)" Icon={Calendar} />
                <Link to="/dashboard/antenatal?filter=today" className="absolute top-1 right-1 text-[10px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-0.5">
                  View <ChevronRight className="w-2.5 h-2.5" />
                </Link>
              </div>
            </div>
          </div>
          <div className="border-t pt-3" style={{ borderColor: 'var(--border-color)' }}>
            <p className="text-[9px] font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--text-tertiary)' }}>Deliveries</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="relative">
                <MetricTile label="Total" value={delTotal} color="var(--icon-purple-text)" Icon={Baby} />
                <Link to="/dashboard/deliveries" className="absolute top-1 right-1 text-[10px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-0.5">
                  View <ChevronRight className="w-2.5 h-2.5" />
                </Link>
              </div>
              <div className="relative">
                <MetricTile label="Live Births" value={liveTotal} color="var(--icon-green-text)" Icon={CheckCircle} />
                <Link to="/dashboard/deliveries?filter=live" className="absolute top-1 right-1 text-[10px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-0.5">
                  View <ChevronRight className="w-2.5 h-2.5" />
                </Link>
              </div>
              <div className="relative">
                <MetricTile label="C-Sections" value={csTotal} color="var(--icon-orange-text)" Icon={Activity} />
                <Link to="/dashboard/deliveries?filter=csection" className="absolute top-1 right-1 text-[10px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-0.5">
                  View <ChevronRight className="w-2.5 h-2.5" />
                </Link>
              </div>
            </div>
          </div>
          <div className="border-t pt-2" style={{ borderColor: 'var(--border-color)' }}>
            <Link to="/dashboard/antenatal"
              className="flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 rounded-lg"
              style={{ color: 'var(--icon-cyan-text)', background: 'var(--icon-cyan-bg)' }}>
              Open Antenatal Module <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </PanelShell>
  );
}

// ============================================
// LAB SUMMARY  (pending vs completed tests today)
// ============================================

export function LabSummary() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const today = new Date().toISOString().split('T')[0];
    getLabReport({ startDate: today, endDate: today })
      .then((res) => { if (active) setReport(unwrap(res)); })
      .catch(() => { if (active) setReport(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const total = report?.summary?.totalTests || 0;
  const completed = report?.summary?.byStatus?.completed || 0;
  const pending = report?.summary?.byStatus?.pending || report?.summary?.byStatus?.inProgress || 0;
  const avgTAT = report?.summary?.averageTurnaroundTime || 0;
  const topTests = report?.topTests || [];

  return (
    <PanelShell title="Lab Summary" subtitle="Today's test activity" Icon={FlaskConical} iconColor="var(--icon-purple-text)"
      badge={<CountBadge n={total} />}>
      {loading ? <ListSkeleton rows={4} h="h-10" /> : (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="relative">
              <MetricTile label="Total" value={total} color="var(--icon-cyan-text)" Icon={FlaskConical} />
              <Link to="/dashboard/laboratory" className="absolute top-1 right-1 text-[10px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-0.5">
                View <ChevronRight className="w-2.5 h-2.5" />
              </Link>
            </div>
            <MetricTile label="Completed" value={completed} color="var(--icon-green-text)" Icon={CheckCircle} />
            <div className="relative">
              <MetricTile label="Pending" value={pending} color="var(--icon-orange-text)" Icon={Clock} />
              <Link to="/dashboard/laboratory?filter=pending" className="absolute top-1 right-1 text-[10px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-0.5">
                View <ChevronRight className="w-2.5 h-2.5" />
              </Link>
            </div>
          </div>

          {avgTAT > 0 && (
            <div className="px-3 py-2 rounded-lg border text-xs"
              style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
              Avg turnaround: <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{avgTAT} min</span>
            </div>
          )}

          {topTests.length > 0 && (
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--text-tertiary)' }}>Top tests today</p>
              <div className="space-y-1.5">
                {topTests.slice(0, 4).map((t: any, i: number) => (
                  <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded-lg"
                    style={{ background: 'var(--bg-main)' }}>
                    <span className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>{t.testName}</span>
                    <span className="text-xs font-semibold flex-shrink-0 ml-2"
                      style={{ color: 'var(--icon-purple-text)' }}>{t.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Link to="/dashboard/laboratory"
            className="flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 rounded-lg"
            style={{ color: 'var(--icon-purple-text)', background: 'var(--icon-purple-bg)' }}>
            Open Lab Worklist <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      )}
    </PanelShell>
  );
}

// ============================================
// SCAN SUMMARY  (pending vs completed scans today)
// ============================================

export function ScanSummary() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const today = new Date().toISOString().split('T')[0];
    getScanReport({ startDate: today, endDate: today })
      .then((res) => { if (active) setReport(unwrap(res)); })
      .catch(() => { if (active) setReport(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const total = report?.summary?.totalScans || 0;
  const completed = report?.summary?.byStatus?.completed || 0;
  const pending = report?.summary?.byStatus?.pending || 0;
  const avgTAT = report?.summary?.averageTurnaroundTime || 0;
  const topScans = report?.topScans || [];

  return (
    <PanelShell title="Scan Summary" subtitle="Today's radiology activity" Icon={ScanLine} iconColor="var(--icon-cyan-text)"
      badge={<CountBadge n={total} />}>
      {loading ? <ListSkeleton rows={4} h="h-10" /> : (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="relative">
              <MetricTile label="Total" value={total} color="var(--icon-cyan-text)" Icon={ScanLine} />
              <Link to="/dashboard/scans" className="absolute top-1 right-1 text-[10px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-0.5">
                View <ChevronRight className="w-2.5 h-2.5" />
              </Link>
            </div>
            <MetricTile label="Completed" value={completed} color="var(--icon-green-text)" Icon={CheckCircle} />
            <div className="relative">
              <MetricTile label="Pending" value={pending} color="var(--icon-orange-text)" Icon={Clock} />
              <Link to="/dashboard/scans?filter=pending" className="absolute top-1 right-1 text-[10px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-0.5">
                View <ChevronRight className="w-2.5 h-2.5" />
              </Link>
            </div>
          </div>

          {avgTAT > 0 && (
            <div className="px-3 py-2 rounded-lg border text-xs"
              style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
              Avg turnaround: <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{avgTAT} min</span>
            </div>
          )}

          {topScans.length > 0 && (
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--text-tertiary)' }}>Top scans today</p>
              <div className="space-y-1.5">
                {topScans.slice(0, 4).map((s: any, i: number) => (
                  <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded-lg"
                    style={{ background: 'var(--bg-main)' }}>
                    <span className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>{s.scanName}</span>
                    <span className="text-xs font-semibold flex-shrink-0 ml-2"
                      style={{ color: 'var(--icon-cyan-text)' }}>{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Link to="/dashboard/scans"
            className="flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 rounded-lg"
            style={{ color: 'var(--icon-cyan-text)', background: 'var(--icon-cyan-bg)' }}>
            Open Radiology Worklist <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      )}
    </PanelShell>
  );
}

// ============================================
// RECORDS SUMMARY  (registrations + appointments + referrals)
// ============================================

export function RecordsSummary() {
  const [stats, setStats] = useState({ newPatients: 0, appointments: 0, referrals: 0, todayVisits: 0 });
  const [loading, setLoading] = useState(true);
  const [recentPats, setRecentPats] = useState<any[]>([]);

  useEffect(() => {
    let active = true;
    const today = new Date().toISOString().split('T')[0];

    Promise.allSettled([
      getPatients({ createdFrom: today, limit: 10 }),
      getAppointments({ date: today, limit: 5 }),
      getReferrals({ limit: 5 }),
      getEncounters({ date: today, limit: 1 }),
    ]).then(([patRes, apptRes, refRes, encRes]) => {
      if (!active) return;

      let newPats = 0, recentList: any[] = [];
      if (patRes.status === 'fulfilled') {
        const d = patRes.value;
        const list = Array.isArray(d) ? d : d?.data || [];
        newPats = list.length;
        recentList = list.slice(0, 5);
      }

      let appts = 0;
      if (apptRes.status === 'fulfilled') {
        const d = apptRes.value;
        appts = Array.isArray(d) ? d.length : d?.length || 0;
      }

      let refs = 0;
      if (refRes.status === 'fulfilled') {
        const d = unwrap(refRes.value);
        refs = Array.isArray(d) ? d.length : d?.total || 0;
      }

      let visits = 0;
      if (encRes.status === 'fulfilled') {
        const d = encRes.value;
        visits = d?.pagination?.total || (Array.isArray(d?.data) ? d.data.length : 0);
      }

      setStats({ newPatients: newPats, appointments: appts, referrals: refs, todayVisits: visits });
      setRecentPats(recentList);
    }).finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, []);

  return (
    <PanelShell title="Records Summary" subtitle="Today's registrations & activity" Icon={FileText} iconColor="var(--icon-cyan-text)">
      {loading ? <ListSkeleton rows={4} h="h-10" /> : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <MetricTile label="New Patients" value={stats.newPatients} color="var(--icon-cyan-text)" Icon={UserPlus} />
              <Link to="/dashboard/patients" className="absolute top-1 right-1 text-[10px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-0.5">
                View <ChevronRight className="w-2.5 h-2.5" />
              </Link>
            </div>
            <div className="relative">
              <MetricTile label="Today's Visits" value={stats.todayVisits} color="var(--icon-orange-text)" Icon={Users} />
              <Link to="/dashboard/encounters" className="absolute top-1 right-1 text-[10px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-0.5">
                View <ChevronRight className="w-2.5 h-2.5" />
              </Link>
            </div>
            <div className="relative">
              <MetricTile label="Appointments" value={stats.appointments} color="var(--icon-purple-text)" Icon={Calendar} />
              <Link to="/dashboard/appointments" className="absolute top-1 right-1 text-[10px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-0.5">
                View <ChevronRight className="w-2.5 h-2.5" />
              </Link>
            </div>
            <div className="relative">
              <MetricTile label="Referrals" value={stats.referrals} color="var(--icon-green-text)" Icon={ChevronRight} />
              <Link to="/dashboard/referrals" className="absolute top-1 right-1 text-[10px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-0.5">
                View <ChevronRight className="w-2.5 h-2.5" />
              </Link>
            </div>
          </div>

          {recentPats.length > 0 && (
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--text-tertiary)' }}>Recently registered</p>
              <div className="space-y-1.5">
                {recentPats.map((p, i) => {
                  const name = p.name || p.fullName || `${p.surname || ''} ${p.otherNames || ''}`.trim() || 'Unknown';
                  return (
                    <Link key={p.id || i} to={`/dashboard/patients/${p.id}`}
                      className="flex items-center justify-between px-3 py-1.5 rounded-lg border"
                      style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}>
                      <span className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>{name}</span>
                      <span className="font-mono text-[10px] flex-shrink-0 ml-2"
                        style={{ color: 'var(--text-tertiary)' }}>{p.folderNumber}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          <Link to="/dashboard/patients/register"
            className="flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 rounded-lg"
            style={{ color: 'var(--icon-cyan-text)', background: 'var(--icon-cyan-bg)' }}>
            Register New Patient <UserPlus className="w-3 h-3" />
          </Link>
        </div>
      )}
    </PanelShell>
  );
}