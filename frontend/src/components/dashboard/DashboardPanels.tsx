// src/components/dashboard/DashboardPanels.tsx - COMPLETE
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock, Stethoscope, Shield, Hospital, CreditCard, Heart, FileText,
  DollarSign, Package, ClipboardList, AlertCircle, ChevronRight,
  Activity, FlaskConical, ScanLine, Users, Baby, UserPlus,
  CheckCircle, Bed, Calendar, Pill, AlertTriangle,
} from 'lucide-react';
import type { PaymentMode } from '../../types';
import {
  getVitalsWorklist, getMedicalWorklist, getLabWorklist,
  getPharmacyWorklist, getScansWorklist, getMaternalWorklist,
  getRequisitions, getEncounters,
  getAntenatalStatistics, getDeliveryStatistics,
  getLabReport, getScanReport,
  getPatients, getReferrals, getAppointments,
  getExpiryReport, getAntenatalRecords,
  getLeaves, getShifts, getAllUsers, getBills, getBeds, getWards,
} from '../../api';
import { getMarDoses, type MarDose } from '../../api/nursing';
import {
  WORKLIST_META, type WorklistKind, type DashboardStats,
  fmtTime, patientFullName, getStatusStyle,
} from '../../config/dashboardConfig';

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
          {items.slice(0, 5).map((t, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg"
              style={{ background: 'var(--bg-main)' }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
                style={{ background: 'var(--icon-cyan-bg)', color: 'var(--icon-cyan-text)' }}>{i + 1}</div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t.disease}</span>
                {t.icdCode && t.icdCode !== '—' && (
                  <span className="text-[10px] ml-2" style={{ color: 'var(--text-tertiary)' }}>({t.icdCode})</span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, (t.patients / (items[0]?.patients || 1)) * 100)}%`,
                      background: 'var(--icon-cyan-text)'
                    }} />
                </div>
                <span className="text-xs font-semibold" style={{ color: 'var(--icon-cyan-text)' }}>
                  {t.patients}
                </span>
              </div>
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
// NURSE SUMMARY
// ============================================

export function NurseSummary() {
  const [admitted, setAdmitted] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getEncounters({ status: 'admitted', limit: 50 })
      .then((res: any) => {
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
            <MetricTile label="IPD" value={ipd.length} color="var(--icon-purple-text)" Icon={Hospital} />
            <MetricTile label="Day Care" value={daycase.length} color="var(--icon-cyan-text)" Icon={Bed} />
            <MetricTile label="Meds Due" value={medsReady} color="var(--icon-orange-text)" Icon={Activity} />
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
// MIDWIFE SUMMARY
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
      if (ancRes.status === 'fulfilled') setAncStats(unwrap(ancRes.value));
      if (delRes.status === 'fulfilled') setDelStats(unwrap(delRes.value));
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
              <MetricTile label="ANC Bookings" value={ancTotal} color="var(--icon-cyan-text)" Icon={Users} />
              <MetricTile label="Visits Today" value={ancToday} color="var(--icon-green-text)" Icon={Calendar} />
            </div>
          </div>
          <div className="border-t pt-3" style={{ borderColor: 'var(--border-color)' }}>
            <p className="text-[9px] font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--text-tertiary)' }}>Deliveries</p>
            <div className="grid grid-cols-3 gap-2">
              <MetricTile label="Total" value={delTotal} color="var(--icon-purple-text)" Icon={Baby} />
              <MetricTile label="Live Births" value={liveTotal} color="var(--icon-green-text)" Icon={CheckCircle} />
              <MetricTile label="C-Sections" value={csTotal} color="var(--icon-orange-text)" Icon={Activity} />
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
// LAB SUMMARY
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
            <MetricTile label="Total" value={total} color="var(--icon-cyan-text)" Icon={FlaskConical} />
            <MetricTile label="Completed" value={completed} color="var(--icon-green-text)" Icon={CheckCircle} />
            <MetricTile label="Pending" value={pending} color="var(--icon-orange-text)" Icon={Clock} />
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
// SCAN SUMMARY
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
            <MetricTile label="Total" value={total} color="var(--icon-cyan-text)" Icon={ScanLine} />
            <MetricTile label="Completed" value={completed} color="var(--icon-green-text)" Icon={CheckCircle} />
            <MetricTile label="Pending" value={pending} color="var(--icon-orange-text)" Icon={Clock} />
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
// RECORDS SUMMARY
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
        const list = Array.isArray(d) ? d : (d as any)?.data || [];
        newPats = list.length;
        recentList = list.slice(0, 5);
      }

      let appts = 0;
      if (apptRes.status === 'fulfilled') {
        const d = apptRes.value;
        appts = Array.isArray(d) ? d.length : (d as any)?.length || 0;
      }

      let refs = 0;
      if (refRes.status === 'fulfilled') {
        const d = unwrap(refRes.value);
        refs = Array.isArray(d) ? d.length : d?.total || 0;
      }

      let visits = 0;
      if (encRes.status === 'fulfilled') {
        const d = encRes.value as any;
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
            <MetricTile label="New Patients" value={stats.newPatients} color="var(--icon-cyan-text)" Icon={UserPlus} />
            <MetricTile label="Today's Visits" value={stats.todayVisits} color="var(--icon-orange-text)" Icon={Users} />
            <MetricTile label="Appointments" value={stats.appointments} color="var(--icon-purple-text)" Icon={Calendar} />
            <MetricTile label="Referrals" value={stats.referrals} color="var(--icon-green-text)" Icon={ChevronRight} />
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

// ============================================
// MEDS DUE PANEL (Nurse)
// ============================================

export function MedsDuePanel() {
  const [doses, setDoses] = useState<MarDose[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getMarDoses({ status: ['due', 'late', 'missed'], limit: 30 })
      .then((res: any) => { if (active) setDoses(res?.doses ?? []); })
      .catch(() => { if (active) setDoses([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const due = doses.filter(d => d.status === 'due').length;
  const late = doses.filter(d => d.status === 'late').length;
  const missed = doses.filter(d => d.status === 'missed').length;

  return (
    <PanelShell
      title="Medications Due"
      subtitle="Doses to administer now"
      Icon={Pill}
      iconColor="var(--icon-orange-text)"
      badge={<CountBadge n={due + late + missed} />}
    >
      {loading ? <ListSkeleton rows={3} h="h-12" /> : (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <MetricTile label="Due"    value={due}    color="var(--icon-cyan-text)"   Icon={Clock} />
            <MetricTile label="Late"   value={late}   color="var(--icon-orange-text)" Icon={AlertCircle} />
            <MetricTile label="Missed" value={missed} color="var(--icon-red-text)"    Icon={AlertTriangle} />
          </div>

          {doses.length === 0 ? (
            <p className="text-xs text-center py-3" style={{ color: 'var(--text-tertiary)' }}>
              No doses outstanding
            </p>
          ) : (
            <div className="space-y-1.5">
              <p className="text-[9px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-tertiary)' }}>
                Next up
              </p>
              {doses.slice(0, 5).map((dose) => {
                const ss = getStatusStyle(dose.status);
                return (
                  <Link key={dose.id}
                    to={`/dashboard/nursing/patient/${dose.medication.attendanceId}`}
                    className="block p-2 rounded-lg border transition-all hover:shadow-sm"
                    style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold truncate"
                        style={{ color: 'var(--text-primary)' }}>
                        {dose.medication.name}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase shrink-0"
                        style={{ background: ss.bg, color: ss.color }}>
                        {dose.status}
                      </span>
                    </div>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                      Due {fmtTime(dose.scheduledAt)} · {dose.dose || '—'} · {dose.route || '—'}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}

          <Link to="/dashboard/nursing"
            className="flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 rounded-lg"
            style={{ color: 'var(--icon-orange-text)', background: 'var(--icon-orange-bg)' }}>
            Open Nursing Workspace <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      )}
    </PanelShell>
  );
}

// ============================================
// EXPIRING STOCK PANEL (Pharmacist)
// ============================================

export function ExpiringStockPanel() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getExpiryReport(30)
      .then((res: any) => {
        if (!active) return;
        const list = Array.isArray(res) ? res : res?.data || res?.items || [];
        setItems(list);
      })
      .catch(() => { if (active) setItems([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <PanelShell
      title="Expiring Stock"
      subtitle="Next 30 days"
      Icon={Package}
      iconColor="var(--icon-red-text)"
      badge={<CountBadge n={items.length} />}
    >
      {loading ? <ListSkeleton rows={4} h="h-12" /> : items.length === 0 ? (
        <EmptyState Icon={Package} text="No items expiring soon" />
      ) : (
        <div className="space-y-1.5">
          {items.slice(0, 8).map((it: any, i: number) => {
            const days = it.daysToExpiry ?? Math.floor(
              (new Date(it.expiryDate).getTime() - Date.now()) / 86400000
            );
            const urgency = days <= 7
              ? { bg: 'var(--icon-red-bg)',    color: 'var(--icon-red-text)' }
              : days <= 14
              ? { bg: 'var(--icon-orange-bg)', color: 'var(--icon-orange-text)' }
              : { bg: 'var(--icon-yellow-bg)', color: 'var(--icon-yellow-text)' };
            return (
              <div key={it.id || i}
                className="flex items-center justify-between p-2 rounded-lg border"
                style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {it.name || it.itemName || 'Unnamed'}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                    Qty {it.quantity ?? it.currentStock ?? 0} · Expires {new Date(it.expiryDate).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                  style={{ background: urgency.bg, color: urgency.color }}>
                  {days}d
                </span>
              </div>
            );
          })}
          {items.length > 8 && (
            <Link to="/dashboard/stock?filter=expiring"
              className="block text-center text-xs py-1" style={{ color: 'var(--icon-cyan-text)' }}>
              +{items.length - 8} more →
            </Link>
          )}
        </div>
      )}
    </PanelShell>
  );
}

// ============================================
// CRITICAL RESULTS PANEL (Lab Tech)
// ============================================

export function CriticalResultsPanel() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const today = new Date().toISOString().split('T')[0];
    getLabReport({ startDate: today, endDate: today })
      .then((res: any) => {
        if (!active) return;
        const r = unwrap(res) ?? {};
        const critical = r.criticalResultsList ?? r.criticalResults ?? [];
        setItems(Array.isArray(critical) ? critical : []);
      })
      .catch(() => { if (active) setItems([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <PanelShell
      title="Critical Results"
      subtitle="Immediate notification needed"
      Icon={AlertTriangle}
      iconColor="var(--icon-red-text)"
      badge={<CountBadge n={items.length} />}
    >
      {loading ? <ListSkeleton rows={3} h="h-12" /> : items.length === 0 ? (
        <EmptyState Icon={CheckCircle} text="No critical results pending" />
      ) : (
        <div className="space-y-1.5">
          {items.slice(0, 8).map((t: any, i: number) => (
            <Link key={t.id || i}
              to={`/dashboard/laboratory/${t.id}`}
              className="block p-2 rounded-lg border"
              style={{ background: 'var(--icon-red-bg)', borderColor: 'var(--border-color)' }}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold truncate"
                  style={{ color: 'var(--icon-red-text)' }}>
                  {t.testName || t.name || 'Critical result'}
                </span>
                <span className="text-[10px] shrink-0" style={{ color: 'var(--icon-red-text)' }}>
                  {fmtTime(t.completedAt || t.createdAt)}
                </span>
              </div>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {t.patient?.name || patientFullName(t)} · {t.resultSummary || t.flag || 'Flagged'}
              </p>
            </Link>
          ))}
        </div>
      )}
    </PanelShell>
  );
}

// ============================================
// HIGH-RISK ANC PANEL (Midwife)
// ============================================

export function HighRiskANCPanel() {
  const [stats, setStats] = useState<any>(null);
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const today = new Date().toISOString().split('T')[0];
    Promise.allSettled([
      getAntenatalStatistics({ startDate: today, endDate: today }),
      getAntenatalRecords({ isActive: true, limit: 50 } as any),
    ]).then(([statsRes, listRes]) => {
      if (!active) return;
      if (statsRes.status === 'fulfilled') setStats(unwrap(statsRes.value));
      if (listRes.status === 'fulfilled') {
        const raw = unwrap(listRes.value);
        const arr = Array.isArray(raw) ? raw : raw?.data || [];
        const highRisk = arr.filter((r: any) =>
          r.riskLevel === 'high' || r.riskFactors?.length > 0
        );
        setList(highRisk);
      }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const byRisk = stats?.byRiskLevel ?? {};
  const high = byRisk.high ?? list.length;
  const medium = byRisk.medium ?? 0;
  const low = byRisk.low ?? 0;

  return (
    <PanelShell
      title="ANC Risk Overview"
      subtitle="Active pregnancies"
      Icon={Baby}
      iconColor="var(--icon-red-text)"
    >
      {loading ? <ListSkeleton rows={3} h="h-12" /> : (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <MetricTile label="High"   value={high}   color="var(--icon-red-text)"    Icon={AlertTriangle} />
            <MetricTile label="Medium" value={medium} color="var(--icon-orange-text)" Icon={AlertCircle} />
            <MetricTile label="Low"    value={low}    color="var(--icon-green-text)"  Icon={CheckCircle} />
          </div>

          {list.length > 0 && (
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--text-tertiary)' }}>
                High-risk mothers
              </p>
              <div className="space-y-1.5">
                {list.slice(0, 5).map((r: any, i: number) => {
                  const p = r.patient || r.Patient || {};
                  const name = p.name || p.fullName ||
                    `${p.surname || ''} ${p.otherNames || ''}`.trim() || 'Unknown';
                  return (
                    <Link key={r.id || i}
                      to={`/dashboard/maternal/${r.attendanceId || r.id}`}
                      className="flex items-center justify-between p-2 rounded-lg border"
                      style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate"
                          style={{ color: 'var(--text-primary)' }}>{name}</p>
                        <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                          {p.folderNumber || '—'} · G{r.gravida ?? '?'} P{r.para ?? '?'}
                        </p>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0"
                        style={{ background: 'var(--icon-red-bg)', color: 'var(--icon-red-text)' }}>
                        High
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          <Link to="/dashboard/antenatal?filter=high_risk"
            className="flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 rounded-lg"
            style={{ color: 'var(--icon-red-text)', background: 'var(--icon-red-bg)' }}>
            Open Antenatal <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      )}
    </PanelShell>
  );
}

// ============================================
// BILLING AGING PANEL (Accounts)
// ============================================

export function BillingAgingPanel() {
  const [buckets, setBuckets] = useState({ d0_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0 });
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let active = true;
    getBills({})
      .then((bills: any) => {
        if (!active) return;
        const arr = Array.isArray(bills) ? bills : bills?.data || [];
        const now = Date.now();
        const b = { d0_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0 };
        let t = 0;
        arr.forEach((bill: any) => {
          const due = (bill.totalBill || 0) - (bill.paidAmount || 0);
          if (due <= 0) return;
          t += due;
          const ageDays = Math.floor((now - new Date(bill.createdAt || bill.date).getTime()) / 86400000);
          if (ageDays <= 30) b.d0_30 += due;
          else if (ageDays <= 60) b.d31_60 += due;
          else if (ageDays <= 90) b.d61_90 += due;
          else b.d90_plus += due;
        });
        setBuckets(b);
        setTotal(t);
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const rows = [
    { label: '0–30 days', value: buckets.d0_30, color: 'var(--icon-green-text)' },
    { label: '31–60 days', value: buckets.d31_60, color: 'var(--icon-cyan-text)' },
    { label: '61–90 days', value: buckets.d61_90, color: 'var(--icon-orange-text)' },
    { label: '90+ days', value: buckets.d90_plus, color: 'var(--icon-red-text)' },
  ];

  const fmtCcy = (n: number) => `₵${Number(n || 0).toFixed(2)}`;
  const maxVal = Math.max(...rows.map(r => r.value), 1);

  return (
    <PanelShell
      title="Receivables Aging"
      subtitle={`Total outstanding: ${fmtCcy(total)}`}
      Icon={DollarSign}
      iconColor="var(--icon-green-text)"
    >
      {loading ? <ListSkeleton rows={4} h="h-12" /> : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{r.label}</span>
                <span className="text-xs font-semibold" style={{ color: r.color }}>{fmtCcy(r.value)}</span>
              </div>
              <div className="w-full rounded-full overflow-hidden"
                style={{ height: 5, background: 'var(--bg-main)' }}>
                <div className="h-full rounded-full"
                  style={{ width: `${(r.value / maxVal) * 100}%`, background: r.color, transition: 'width .3s' }} />
              </div>
            </div>
          ))}
          <Link to="/dashboard/billing"
            className="flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 mt-2 rounded-lg"
            style={{ color: 'var(--icon-cyan-text)', background: 'var(--icon-cyan-bg)' }}>
            Open Billing <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      )}
    </PanelShell>
  );
}

// ============================================
// HR WORKLIST PANEL
// ============================================

export function HRWorklistPanel() {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getLeaves({ status: 'pending', limit: 20 })
      .then((res: any) => {
        if (!active) return;
        const list = Array.isArray(res) ? res : res?.data || [];
        setLeaves(list);
      })
      .catch(() => { if (active) setLeaves([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <PanelShell
      title="Pending Approvals"
      subtitle="Leave requests awaiting action"
      Icon={FileText}
      iconColor="var(--icon-yellow-text)"
      badge={
        <Link to="/dashboard/leaves"
          className="flex items-center gap-1 text-xs font-medium"
          style={{ color: 'var(--icon-cyan-text)' }}>
          View all <ChevronRight className="w-3 h-3" />
        </Link>
      }
    >
      {loading ? <ListSkeleton rows={4} h="h-12" /> : leaves.length === 0 ? (
        <EmptyState Icon={CheckCircle} text="No pending leave requests" />
      ) : (
        <div className="space-y-2">
          {leaves.slice(0, 6).map((leave: any) => (
            <Link key={leave.id}
              to="/dashboard/leaves"
              className="block p-2.5 rounded-lg border transition-all hover:shadow-sm"
              style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold truncate"
                  style={{ color: 'var(--text-primary)' }}>
                  {leave.user?.fullName || leave.userName || 'Staff'}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 uppercase"
                  style={{
                    background: leave.leaveType === 'sick' ? 'var(--icon-red-bg)' : 'var(--icon-cyan-bg)',
                    color: leave.leaveType === 'sick' ? 'var(--icon-red-text)' : 'var(--icon-cyan-text)',
                  }}>
                  {leave.leaveType || 'leave'}
                </span>
              </div>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                {new Date(leave.startDate).toLocaleDateString()} – {new Date(leave.endDate).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </PanelShell>
  );
}

// ============================================
// HR SUMMARY PANEL
// ============================================

export function HRSummaryPanel() {
  const [stats, setStats] = useState({
    totalStaff: 0, onShift: 0, byRole: {} as Record<string, number>,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const today = new Date().toISOString().split('T')[0];
    Promise.allSettled([
      getAllUsers({ isActive: true }),
      getShifts({ shiftDate: today }),
    ]).then(([usersRes, shiftsRes]) => {
      if (!active) return;
      const usersRaw: any = usersRes.status === 'fulfilled' ? usersRes.value : [];
      const shiftsRaw: any = shiftsRes.status === 'fulfilled' ? shiftsRes.value : [];

      const users = Array.isArray(usersRaw) ? usersRaw : usersRaw?.data || [];
      const shifts = Array.isArray(shiftsRaw) ? shiftsRaw : shiftsRaw?.data || [];

      const byRole: Record<string, number> = {};
      users.forEach((u: any) => {
        const r = u.role || 'unknown';
        byRole[r] = (byRole[r] || 0) + 1;
      });

      setStats({ totalStaff: users.length, onShift: shifts.length, byRole });
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const topRoles = Object.entries(stats.byRole)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <PanelShell
      title="Staff Overview"
      subtitle="Active employees"
      Icon={Users}
      iconColor="var(--icon-cyan-text)"
      badge={<CountBadge n={stats.totalStaff} />}
    >
      {loading ? <ListSkeleton rows={4} h="h-10" /> : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <MetricTile label="Total" value={stats.totalStaff} color="var(--icon-cyan-text)" Icon={Users} />
            <MetricTile label="On Shift" value={stats.onShift} color="var(--icon-green-text)" Icon={Calendar} />
          </div>

          {topRoles.length > 0 && (
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--text-tertiary)' }}>
                By role
              </p>
              <div className="space-y-1.5">
                {topRoles.map(([role, count]) => (
                  <div key={role}
                    className="flex items-center justify-between px-3 py-1.5 rounded-lg"
                    style={{ background: 'var(--bg-main)' }}>
                    <span className="text-xs capitalize truncate" style={{ color: 'var(--text-primary)' }}>
                      {role.replace('_', ' ')}
                    </span>
                    <span className="text-xs font-semibold shrink-0"
                      style={{ color: 'var(--icon-cyan-text)' }}>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Link to="/dashboard/users"
            className="flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 rounded-lg"
            style={{ color: 'var(--icon-cyan-text)', background: 'var(--icon-cyan-bg)' }}>
            Open User Management <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      )}
    </PanelShell>
  );
}

// ============================================
// PAYMENT MODE PANEL (Linear breakdown)
// ============================================

export function PaymentModePanel() {
  const [data, setData] = useState({ cash: 0, nhis: 0, private_insurance: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const today = new Date().toISOString().split('T')[0];
    getEncounters({ date: today, limit: 500 })
      .then((res: any) => {
        if (!active) return;
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        const counts = { cash: 0, nhis: 0, private_insurance: 0, total: list.length };
        list.forEach((e: any) => {
          const m = e.paymentMode || 'cash';
          if (m === 'nhis') counts.nhis++;
          else if (m === 'private_insurance') counts.private_insurance++;
          else counts.cash++;
        });
        setData(counts);
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const rows = [
    { key: 'cash',              label: 'Cash',              value: data.cash,              Icon: CreditCard, color: 'var(--icon-green-text)',  bg: 'var(--icon-green-bg)' },
    { key: 'nhis',              label: 'NHIS',              value: data.nhis,              Icon: Shield,     color: 'var(--icon-cyan-text)',   bg: 'var(--icon-cyan-bg)' },
    { key: 'private_insurance', label: 'Private Insurance', value: data.private_insurance, Icon: Hospital,   color: 'var(--icon-purple-text)', bg: 'var(--icon-purple-bg)' },
  ];
  const max = Math.max(...rows.map(r => r.value), 1);

  return (
    <PanelShell
      title="Patients by Payment Mode"
      subtitle="Today's visits"
      Icon={CreditCard}
      iconColor="var(--icon-green-text)"
      badge={<CountBadge n={data.total} />}
    >
      {loading ? <ListSkeleton rows={3} h="h-14" /> : (
        <div className="space-y-3">
          {rows.map(r => (
            <div key={r.key}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center"
                    style={{ background: r.bg }}>
                    <r.Icon className="w-3 h-3" style={{ color: r.color }} />
                  </div>
                  <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                    {r.label}
                  </span>
                </div>
                <span className="text-sm font-bold" style={{ color: r.color }}>
                  {r.value}
                </span>
              </div>
              <div className="w-full rounded-full overflow-hidden"
                style={{ height: 6, background: 'var(--bg-main)' }}>
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${(r.value / max) * 100}%`, background: r.color }} />
              </div>
            </div>
          ))}

          {data.total === 0 && (
            <p className="text-xs text-center pt-2" style={{ color: 'var(--text-tertiary)' }}>
              No visits recorded today
            </p>
          )}
        </div>
      )}
    </PanelShell>
  );
}

// ============================================
// WARD OCCUPANCY PANEL
// ============================================

export function WardOccupancyPanel() {
  const [data, setData] = useState({ occupied: 0, available: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.allSettled([getBeds(), getWards()])
      .then(([bedsRes]) => {
        if (!active) return;
        const bedsRaw: any = bedsRes.status === 'fulfilled' ? bedsRes.value : [];
        const beds = Array.isArray(bedsRaw) ? bedsRaw : bedsRaw?.data || [];
        const occupied = beds.filter((b: any) => b.isOccupied || b.status === 'occupied').length;
        const available = beds.length - occupied;
        setData({ occupied, available, total: beds.length });
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const pct = data.total ? Math.round((data.occupied / data.total) * 100) : 0;

  return (
    <PanelShell
      title="Ward Occupancy"
      subtitle="Beds currently in use"
      Icon={Bed}
      iconColor="var(--icon-purple-text)"
      badge={<CountBadge n={data.total} />}
    >
      {loading ? <ListSkeleton rows={2} h="h-16" /> : (
        <div className="space-y-4">
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {pct}%
              </span>
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {data.occupied} of {data.total} beds
              </span>
            </div>
            <div className="w-full rounded-full overflow-hidden"
              style={{ height: 10, background: 'var(--bg-main)' }}>
              <div className="h-full rounded-full transition-all"
                style={{
                  width: `${pct}%`,
                  background: pct > 85 ? 'var(--icon-red-text)' : pct > 60 ? 'var(--icon-orange-text)' : 'var(--icon-green-text)',
                }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg px-3 py-2 border"
              style={{ background: 'var(--icon-green-bg)', borderColor: 'var(--border-color)' }}>
              <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--icon-green-text)' }}>
                Available
              </p>
              <p className="text-xl font-bold" style={{ color: 'var(--icon-green-text)' }}>
                {data.available}
              </p>
            </div>
            <div className="rounded-lg px-3 py-2 border"
              style={{ background: 'var(--icon-purple-bg)', borderColor: 'var(--border-color)' }}>
              <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--icon-purple-text)' }}>
                Occupied
              </p>
              <p className="text-xl font-bold" style={{ color: 'var(--icon-purple-text)' }}>
                {data.occupied}
              </p>
            </div>
          </div>
        </div>
      )}
    </PanelShell>
  );
}

// ============================================
// RECENT ADMISSIONS PANEL
// ============================================

export function RecentAdmissionsPanel() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getEncounters({ status: 'admitted', limit: 8 })
      .then((res: any) => {
        if (!active) return;
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        setItems(list);
      })
      .catch(() => { if (active) setItems([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <PanelShell
      title="Recent Admissions"
      subtitle="Latest patients admitted"
      Icon={Bed}
      iconColor="var(--icon-green-text)"
      badge={
        <Link to="/dashboard/admissions" className="flex items-center gap-1 text-xs font-medium"
          style={{ color: 'var(--icon-cyan-text)' }}>
          View all <ChevronRight className="w-3 h-3" />
        </Link>
      }
    >
      {loading ? <ListSkeleton rows={4} h="h-12" /> : items.length === 0 ? (
        <EmptyState Icon={Bed} text="No admissions today" />
      ) : (
        <div className="space-y-1.5">
          {items.map((a: any) => {
            const p = a.patient || a.Patient || {};
            const name = p.name || p.fullName || `${p.surname || ''} ${p.otherNames || ''}`.trim() || 'Unknown';
            const ward = a.Ward?.wardName || a.ward?.wardName || '—';
            const bed = a.Bed?.bedNumber || a.bed?.bedNumber || '—';
            return (
              <Link key={a.id} to={`/dashboard/admissions/${a.id}`}
                className="block p-2 rounded-lg border transition-all hover:shadow-sm"
                style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold truncate"
                    style={{ color: 'var(--text-primary)' }}>{name}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0"
                    style={{ background: 'var(--icon-green-bg)', color: 'var(--icon-green-text)' }}>
                    {bed}
                  </span>
                </div>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                  {p.folderNumber || '—'} · {ward}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </PanelShell>
  );
}

// ============================================
// VITALS SNAPSHOT PANEL
// ============================================

export function VitalsSnapshotPanel() {
  const [data, setData] = useState({ taken: 0, overdue: 0, pending: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const today = new Date().toISOString().split('T')[0];
    Promise.allSettled([
      getEncounters({ date: today, limit: 500 }),
      getVitalsWorklist(),
    ]).then(([encRes, wlRes]) => {
      if (!active) return;
      const encRaw: any = encRes.status === 'fulfilled' ? encRes.value : [];
      const encs = Array.isArray(encRaw) ? encRaw : encRaw?.data || [];
      const wlRaw: any = wlRes.status === 'fulfilled' ? wlRes.value : [];
      const pending = (Array.isArray(wlRaw) ? wlRaw : wlRaw?.data || []).length;

      const taken = encs.filter((e: any) => e.vitals?.length > 0 || e.Vitals?.length > 0).length;
      const overdue = encs.filter((e: any) => {
        const last = e.Vitals?.[0]?.recordedAt || e.lastVitalsAt;
        if (!last) return e.status === 'active';
        return (Date.now() - new Date(last).getTime()) > 8 * 60 * 60 * 1000;
      }).length;

      setData({ taken, overdue, pending });
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <PanelShell
      title="Vitals Overview"
      subtitle="Today"
      Icon={Activity}
      iconColor="var(--icon-orange-text)"
    >
      {loading ? <ListSkeleton rows={2} h="h-16" /> : (
        <div className="grid grid-cols-3 gap-2">
          <MetricTile label="Taken"    value={data.taken}    color="var(--icon-green-text)"  Icon={CheckCircle} />
          <MetricTile label="Overdue"  value={data.overdue}  color="var(--icon-red-text)"    Icon={AlertTriangle} />
          <MetricTile label="Pending"  value={data.pending}  color="var(--icon-orange-text)" Icon={Clock} />
        </div>
      )}
    </PanelShell>
  );
}

// ============================================
// RECENT PAYMENTS PANEL
// ============================================

export function RecentPaymentsPanel() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getBills({ limit: 20 })
      .then((res: any) => {
        if (!active) return;
        const list = Array.isArray(res) ? res : res?.data || [];
        const paid = list.filter((b: any) => (b.paidAmount || 0) > 0).slice(0, 6);
        setItems(paid);
      })
      .catch(() => { if (active) setItems([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const fmtCcy = (n: number) => `₵${Number(n || 0).toFixed(2)}`;

  return (
    <PanelShell
      title="Recent Payments"
      subtitle="Latest collections"
      Icon={DollarSign}
      iconColor="var(--icon-green-text)"
      badge={
        <Link to="/dashboard/billing" className="flex items-center gap-1 text-xs font-medium"
          style={{ color: 'var(--icon-cyan-text)' }}>
          View all <ChevronRight className="w-3 h-3" />
        </Link>
      }
    >
      {loading ? <ListSkeleton rows={4} h="h-12" /> : items.length === 0 ? (
        <EmptyState Icon={DollarSign} text="No payments recorded" />
      ) : (
        <div className="space-y-1.5">
          {items.map((b: any) => {
            const p = b.patient || b.Patient || {};
            const name = p.name || p.fullName || `${p.surname || ''} ${p.otherNames || ''}`.trim() || 'Unknown';
            return (
              <Link key={b.id} to={`/dashboard/billing`}
                className="flex items-center justify-between gap-2 p-2 rounded-lg border transition-all hover:shadow-sm"
                style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate"
                    style={{ color: 'var(--text-primary)' }}>{name}</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                    {b.paymentMode === 'nhis' ? 'NHIS' :
                     b.paymentMode === 'private_insurance' ? 'Insurance' : 'Cash'}
                  </p>
                </div>
                <span className="text-xs font-bold shrink-0"
                  style={{ color: 'var(--icon-green-text)' }}>
                  {fmtCcy(b.paidAmount)}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </PanelShell>
  );
}