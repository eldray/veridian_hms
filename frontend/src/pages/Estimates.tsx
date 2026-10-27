// src/pages/Estimates.tsx - Proforma invoices (patient/corporate estimates) list
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEstimatesStore, type EstimateStatus } from '../store/estimatesStore';
import { useToast } from '../store/toastStore';
import { getPatientName } from '../utils/patient';
import {
  FileText, Search, RefreshCw, ArrowLeft, Eye, Briefcase, DollarSign,
} from 'lucide-react';

const STATUS_STYLES: Record<EstimateStatus, string> = {
  DRAFT: 'bg-[var(--bg-main)] text-[var(--text-secondary)]',
  SENT: 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]',
  APPROVED: 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]',
  REJECTED: 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]',
  CONVERTED: 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]',
  EXPIRED: 'bg-[var(--icon-orange-bg)] text-[var(--icon-orange-text)]',
};

const STATUSES: (EstimateStatus | 'all')[] = ['all', 'DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'CONVERTED', 'EXPIRED'];

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
        getPatientName(e.patient).toLowerCase().includes(q) ||
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-[var(--bg-main)] rounded-xl transition-all">
            <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
          <button
            onClick={() => navigate('/dashboard/estimates/new')}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-text)] text-white rounded-lg hover:opacity-90 transition-all text-sm"
          >
            New estimate
          </button>
          <div className="w-12 h-12 bg-[var(--icon-cyan-bg)] rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-[var(--icon-cyan-text)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Estimates / Proforma Invoices</h1>
            <p className="text-sm text-[var(--text-secondary)]">Patient and corporate cost estimates</p>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{filtered.length} of {pagination.total || filtered.length} estimate(s)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all disabled:opacity-50 text-sm text-[var(--text-primary)]"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      {statistics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4">
            <p className="text-xs text-[var(--text-secondary)]">Total Estimates</p>
            <p className="text-xl font-bold text-[var(--text-primary)]">{statistics.total ?? estimates.length}</p>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4">
            <p className="text-xs text-[var(--text-secondary)]">Pending (Sent)</p>
            <p className="text-xl font-bold text-[var(--icon-cyan-text)]">{statusCount('SENT')}</p>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4">
            <p className="text-xs text-[var(--text-secondary)]">Approved</p>
            <p className="text-xl font-bold text-[var(--icon-green-text)]">{statusCount('APPROVED')}</p>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--text-secondary)]">Total Value</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">GHS {fmt(statistics.totalAmount)}</p>
            </div>
            <DollarSign className="w-5 h-5 text-[var(--text-tertiary)]" />
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by reference, patient, company, folder no..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-cyan-text)]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as EstimateStatus | 'all');
            setPage(1);
          }}
          className="px-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)]"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-[var(--bg-main)] text-left text-xs font-medium text-[var(--text-secondary)] uppercase">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Patient / Company</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)] text-sm">
            {isLoading && filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-[var(--text-tertiary)]">Loading…</td></tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-[var(--text-tertiary)]">No estimates found</td></tr>
            )}
            {filtered.map((e) => (
              <tr key={e.id} className="hover:bg-[var(--bg-main)] cursor-pointer" onClick={() => navigate(`/dashboard/estimates/${e.id}`)}>
                <td className="px-4 py-3 font-mono text-xs text-[var(--text-primary)]">{e.referenceNumber}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-[var(--text-primary)]">{getPatientName(e.patient)}</div>
                  {e.corporateAccount && (
                    <div className="text-xs text-[var(--icon-cyan-text)] flex items-center gap-1">
                      <Briefcase className="w-3 h-3" /> {e.corporateAccount.companyName}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">GHS {fmt(e.totalAmount)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[e.status]}`}>{e.status}</span>
                </td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">{e.createdAt ? new Date(e.createdAt).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={(ev) => { ev.stopPropagation(); navigate(`/dashboard/estimates/${e.id}`); }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white"
                  >
                    <Eye className="w-3.5 h-3.5" /> View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-[var(--text-secondary)]">
          <span>Page {pagination.page} of {pagination.totalPages}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="px-3 py-1.5 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg disabled:opacity-40">Previous</button>
            <button disabled={page >= pagination.totalPages} onClick={() => setPage((current) => current + 1)} className="px-3 py-1.5 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
