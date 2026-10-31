// src/pages/Estimates.tsx - Proforma invoices (patient/corporate estimates) list
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEstimatesStore, type EstimateStatus } from '../store/estimatesStore';
import { useToast } from '../store/toastStore';
import { getPatientName } from '../utils/patient';
import {
  FileText, RefreshCw, Eye, Briefcase, DollarSign,
} from 'lucide-react';
import {
  Badge, Button, cn, FilterSelect, humanStatus, PageHeader, Pagination,
  SearchInput, StatCard, statusTone, TABLE_SHELL, TD, TD_MONO, TD_MUTED, TH, TH_ROW, TR,
} from '../components/ui';

const STATUSES: (EstimateStatus | 'all')[] = ['all', 'DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'CONVERTED', 'EXPIRED'];

// SENT and CONVERTED are not in Badge's STATUS_TONES, so the colours this page
// committed to for those two are kept locally; everything else uses statusTone().
const estimateBadgeTone = (status: EstimateStatus) =>
  status === 'SENT' ? 'cyan'
    : status === 'CONVERTED' ? 'purple'
      : statusTone(status);

// A quote can be raised before anyone is registered, so the client column has a
// walk-in label rather than showing every unregistered estimate as one "Unknown Patient".
const clientName = (patient: any): string => (patient ? getPatientName(patient) : 'Walk-in client');

export default function Estimates() {
  const navigate = useNavigate();
  const { error: toastError } = useToast();
  const { estimates, isLoading, loadEstimates, statistics, loadStatistics, pagination } = useEstimatesStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<EstimateStatus | 'all'>('all');
  const [page, setPage] = useState(1);

  const load = async () => {
    try {
      await Promise.all([
        loadEstimates({ page, limit: 20, status: statusFilter === 'all' ? undefined : statusFilter }),
        loadStatistics(),
      ]);
    } catch (e: any) {
      toastError('Load failed', e?.response?.data?.message || e.message);
    }
  };

  useEffect(() => { load(); }, [page, statusFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return estimates.filter((e) => {
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      if (!q) return true;
      return (
        e.referenceNumber?.toLowerCase().includes(q) ||
        clientName(e.patient).toLowerCase().includes(q) ||
        e.corporateAccount?.companyName?.toLowerCase().includes(q) ||
        e.patient?.folderNumber?.toLowerCase().includes(q)
      );
    });
  }, [estimates, search, statusFilter]);

  const fmt = (n: number) => Number(n || 0).toFixed(2);

  // statistics.byStatus is an array of { status, count, totalAmount }
  const statusCount = (s: string): number =>
    (statistics?.byStatus || []).find((b: any) => b.status === s)?.count ?? 0;

  return (
    <div className="space-y-6 p-6 text-[var(--text-primary)]">
      {/* Header */}
      <PageHeader
        title="Estimates / Proforma Invoices"
        subtitle="Patient and corporate cost estimates"
        meta={`${filtered.length} of ${pagination.total || filtered.length} estimate(s)`}
        icon={FileText}
        accent="cyan"
        backTo="/dashboard"
        actions={(
          <>
            <Button icon={RefreshCw} loading={isLoading} onClick={load}>Refresh</Button>
            <Button variant="primary" onClick={() => navigate('/dashboard/estimates/new')}>New estimate</Button>
          </>
        )}
      />

      {/* Stats */}
      {statistics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total Estimates" value={statistics.total ?? estimates.length} />
          <StatCard label="Pending (Sent)" accent="cyan" value={statusCount('SENT')} />
          <StatCard label="Approved" accent="green" value={statusCount('APPROVED')} />
          <StatCard label="Total Value" size="money" icon={DollarSign} value={`GHS ${fmt(statistics.totalAmount)}`} />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput
          className="flex-1"
          value={search}
          onChange={setSearch}
          placeholder="Search by reference, patient, company, folder no..."
        />
        <FilterSelect
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(v) => {
            setStatusFilter(v as EstimateStatus | 'all');
            setPage(1);
          }}
          options={STATUSES.map((s) => ({ value: s, label: s === 'all' ? 'All Statuses' : s }))}
        />
      </div>

      {/* Table */}
      <div className={TABLE_SHELL}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={TH_ROW}>
              <tr>
                <th className={TH}>Reference</th>
                <th className={TH}>Patient / Company</th>
                <th className={TH}>Total</th>
                <th className={TH}>Status</th>
                <th className={TH}>Created</th>
                <th className={cn(TH, 'text-right')}>Action</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {isLoading && filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-[var(--text-tertiary)]">Loading…</td></tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-[var(--text-tertiary)]">No estimates found</td></tr>
              )}
              {filtered.map((e) => (
                <tr key={e.id} className={cn(TR, 'cursor-pointer')} onClick={() => navigate(`/dashboard/estimates/${e.id}`)}>
                  <td className={cn(TD_MONO, 'text-xs')}>{e.referenceNumber}</td>
                  <td className={TD}>
                    <div className="font-medium text-[var(--text-primary)]">{clientName(e.patient)}</div>
                    {e.corporateAccount && (
                      <div className="text-xs text-[var(--icon-cyan-text)] flex items-center gap-1">
                        <Briefcase className="w-3 h-3" /> {e.corporateAccount.companyName}
                      </div>
                    )}
                  </td>
                  <td className={cn(TD, 'font-semibold')}>GHS {fmt(e.totalAmount)}</td>
                  <td className={TD}>
                    <Badge tone={estimateBadgeTone(e.status)} dot size="sm">{humanStatus(e.status)}</Badge>
                  </td>
                  <td className={TD_MUTED}>{e.createdAt ? new Date(e.createdAt).toLocaleDateString() : '—'}</td>
                  <td className={cn(TD, 'text-right')}>
                    <Button
                      size="sm"
                      variant="soft"
                      accent="cyan"
                      icon={Eye}
                      onClick={(ev) => { ev.stopPropagation(); navigate(`/dashboard/estimates/${e.id}`); }}
                    >
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination
        page={page}
        totalPages={pagination.totalPages}
        itemsPerPage={20}
        totalItems={pagination.total}
        noun="estimates"
        onChange={setPage}
      />
    </div>
  );
}
