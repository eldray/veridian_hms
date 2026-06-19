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
  DRAFT: 'bg-gray-100 text-gray-700',
  SENT: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  CONVERTED: 'bg-purple-100 text-purple-700',
  EXPIRED: 'bg-amber-100 text-amber-700',
};

const STATUSES: (EstimateStatus | 'all')[] = ['all', 'DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'CONVERTED', 'EXPIRED'];

export default function Estimates() {
  const navigate = useNavigate();
  const { error: toastError } = useToast();
  const { estimates, isLoading, loadEstimates, statistics, loadStatistics } = useEstimatesStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<EstimateStatus | 'all'>('all');

  const load = async () => {
    try {
      await Promise.all([loadEstimates(), loadStatistics()]);
    } catch (e: any) {
      toastError('Load failed', e?.response?.data?.message || e.message);
    }
  };

  useEffect(() => { load(); }, []);

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
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Estimates / Proforma Invoices</h1>
            <p className="text-sm text-gray-500">Patient and corporate cost estimates</p>
            <p className="text-xs text-gray-400 mt-0.5">{filtered.length} estimate(s)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50 text-sm text-gray-700"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      {statistics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500">Total Estimates</p>
            <p className="text-xl font-bold text-gray-900">{statistics.total ?? estimates.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500">Pending (Sent)</p>
            <p className="text-xl font-bold text-blue-600">{statusCount('SENT')}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500">Approved</p>
            <p className="text-xl font-bold text-green-600">{statusCount('APPROVED')}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Total Value</p>
              <p className="text-xl font-bold text-gray-900">GHS {fmt(statistics.totalAmount)}</p>
            </div>
            <DollarSign className="w-5 h-5 text-gray-300" />
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by reference, patient, company, folder no..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as EstimateStatus | 'all')}
          className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Patient / Company</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {isLoading && filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">Loading…</td></tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">No estimates found</td></tr>
            )}
            {filtered.map((e) => (
              <tr key={e.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/dashboard/estimates/${e.id}`)}>
                <td className="px-4 py-3 font-mono text-xs text-gray-700">{e.referenceNumber}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{getPatientName(e.patient)}</div>
                  {e.corporateAccount && (
                    <div className="text-xs text-cyan-600 flex items-center gap-1">
                      <Briefcase className="w-3 h-3" /> {e.corporateAccount.companyName}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 font-semibold text-gray-900">GHS {fmt(e.totalAmount)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[e.status]}`}>{e.status}</span>
                </td>
                <td className="px-4 py-3 text-gray-500">{e.createdAt ? new Date(e.createdAt).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={(ev) => { ev.stopPropagation(); navigate(`/dashboard/estimates/${e.id}`); }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100"
                  >
                    <Eye className="w-3.5 h-3.5" /> View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
