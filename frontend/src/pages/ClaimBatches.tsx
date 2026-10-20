// src/pages/ClaimBatches.tsx — REWRITTEN FOR MONTHLY BATCHES
import { useEffect, useMemo, useState } from 'react';
import { useInsuranceStore } from '../store/insuranceStore';
import { useToast } from '../store/toastStore';
import {
  ArrowLeft, RefreshCw, Plus, Trash2, Eye, Download, CheckCircle,
  Clock, FileText, Calendar, User, DollarSign, Layers,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Search, Filter, Loader, Printer, XCircle, Link as LinkIcon,
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

type BatchStatus = 'generated' | 'finalized';
type InsuranceType = 'nhis' | 'private' | 'corporate';

interface BatchRow {
  id: string;
  batchNumber: string;
  insuranceType: InsuranceType;
  periodYear: number;
  periodMonth: number;
  totalClaims: number;
  totalAmount: number;
  status: BatchStatus;
  description: string | null;
  createdAt: string;
  finalizedAt?: string | null;
  createdBy?: { fullName?: string; username?: string };
  insuranceProvider?: { id: string; name: string } | null;
  corporateAccount?: { id: string; companyName: string } | null;
  claims?: any[];
}

const ITEMS_PER_PAGE = 10;
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const typeLabel = (t: InsuranceType) =>
  t === 'nhis' ? 'NHIS' : t === 'private' ? 'Private' : 'Corporate';

const typeColor = (t: InsuranceType) =>
  t === 'nhis' ? 'text-blue-600 bg-blue-50'
    : t === 'private' ? 'text-purple-600 bg-purple-50'
      : 'text-cyan-600 bg-cyan-50';

export default function ClaimBatches() {
  const navigate = useNavigate();
  const { success, error: toastError, warning } = useToast();

  const {
    batches,
    getClaimBatches,
    getClaimBatch,
    generateClaimBatch,
    finalizeClaimBatch,
    deleteClaimBatch,
    downloadBatchXml,
    printBatch,
    getEligibleClaimsForBatch,
    isLoading,
  } = useInsuranceStore();

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | InsuranceType>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | BatchStatus>('all');
  const [periodYear, setPeriodYear] = useState('');
  const [periodMonth, setPeriodMonth] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [viewing, setViewing] = useState<BatchRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Create form state
  const now = new Date();
  const [formType, setFormType] = useState<InsuranceType>('nhis');
  const [formYear, setFormYear] = useState(now.getFullYear());
  const [formMonth, setFormMonth] = useState(now.getMonth() + 1);
  const [formProviderId, setFormProviderId] = useState('');
  const [formCorporateId, setFormCorporateId] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [eligible, setEligible] = useState<{
    nhis: number; private: number; corporate: number;
    totalAmount: { nhis: number; private: number; corporate: number };
  } | null>(null);
  const [eligibleLoading, setEligibleLoading] = useState(false);

  useEffect(() => {
    loadBatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, filterStatus, periodYear, periodMonth]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, filterStatus, periodYear, periodMonth]);

  const loadBatches = async () => {
    try {
      const filters: any = {};
      if (filterType !== 'all') filters.insuranceType = filterType;
      if (filterStatus !== 'all') filters.status = filterStatus;
      if (periodYear) filters.periodYear = periodYear;
      if (periodMonth) filters.periodMonth = periodMonth;
      await getClaimBatches(filters);
    } catch (e: any) {
      toastError('Load failed', e?.message || 'Could not fetch batches');
    }
  };

  // Eligible preview whenever the create form's period changes
  useEffect(() => {
    if (!showCreate) return;
    let cancelled = false;
    setEligibleLoading(true);
    getEligibleClaimsForBatch({ periodYear: formYear, periodMonth: formMonth })
      .then((r) => { if (!cancelled) setEligible(r); })
      .catch(() => { if (!cancelled) setEligible(null); })
      .finally(() => { if (!cancelled) setEligibleLoading(false); });
    return () => { cancelled = true; };
  }, [showCreate, formYear, formMonth, getEligibleClaimsForBatch]);

  const filtered = useMemo(() => {
    const list = (batches as any[]).filter((b: BatchRow) => {
      const matchesSearch =
        !searchTerm ||
        b.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.description ?? '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
    return list as BatchRow[];
  }, [batches, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const pageRows = filtered.slice(startIndex, endIndex);

  const stats = {
    total: filtered.length,
    generated: filtered.filter((b) => b.status === 'generated').length,
    finalized: filtered.filter((b) => b.status === 'finalized').length,
    totalAmount: filtered.reduce((s, b) => s + Number(b.totalAmount || 0), 0),
  };

  const handleCreate = async () => {
    try {
      setProcessingId('__create__');
      await generateClaimBatch({
        insuranceType: formType,
        periodYear: formYear,
        periodMonth: formMonth,
        insuranceProviderId: formProviderId || undefined,
        corporateAccountId: formType === 'corporate' ? (formCorporateId || undefined) : undefined,
        description: formDescription || undefined,
      });
      success('Batch generated', `Batches are built from all finalized un-batched ${typeLabel(formType)} claims in ${MONTH_NAMES[formMonth - 1]} ${formYear}`);
      setShowCreate(false);
      setFormDescription('');
      await loadBatches();
    } catch (e: any) {
      toastError('Generation failed', e?.response?.data?.message || e?.message || 'Could not generate batch');
    } finally {
      setProcessingId(null);
    }
  };

  const handleView = async (id: string) => {
    try {
      const b = await getClaimBatch(id);
      setViewing(b as unknown as BatchRow);
    } catch (e: any) {
      toastError('View failed', e?.message || 'Could not load batch');
    }
  };

  const handleDownloadXml = (id: string) => {
    downloadBatchXml(id);
    success('XML ready', 'Batch XML is downloading');
  };

  const handlePrint = (id: string) => {
    printBatch(id);
  };

  const handleFinalize = async (id: string) => {
    try {
      setProcessingId(id);
      await finalizeClaimBatch(id);
      success('Finalized', 'Batch is now finalized and can no longer be deleted');
      await loadBatches();
      if (viewing?.id === id) {
        const refreshed = await getClaimBatch(id);
        setViewing(refreshed as unknown as BatchRow);
      }
    } catch (e: any) {
      toastError('Finalize failed', e?.response?.data?.message || e?.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setProcessingId(deleteId);
      await deleteClaimBatch(deleteId);
      success('Deleted', 'Batch removed; its claims are now un-batched');
      if (viewing?.id === deleteId) setViewing(null);
      setDeleteId(null);
      await loadBatches();
    } catch (e: any) {
      toastError('Delete failed', e?.response?.data?.message || e?.message);
    } finally {
      setProcessingId(null);
    }
  };

  const statusBadge = (status: BatchStatus) =>
    status === 'generated'
      ? <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"><Clock className="w-3 h-3" />Generated</span>
      : <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3" />Finalized</span>;

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)]">
            <ArrowLeft className="w-5 h-5 text-[var(--text-primary)]" />
          </button>
          <div className="w-10 h-10 bg-[var(--icon-cyan-bg)] rounded-xl flex items-center justify-center">
            <Layers className="w-5 h-5 text-[var(--icon-cyan-text)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Claim Batches</h1>
            <p className="text-sm text-[var(--text-secondary)]">Monthly bundles of finalized claims per insurance type</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to="/dashboard/insurance-claims"
            className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] text-sm"
          >
            <FileText className="w-4 h-4" />
            View All Claims
          </Link>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition text-sm"
          >
            <Plus className="w-4 h-4" />
            Generate Batch
          </button>
          <button
            onClick={loadBatches}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Batches" value={stats.total} />
        <StatCard label="Generated" value={stats.generated} color="text-blue-600" />
        <StatCard label="Finalized" value={stats.finalized} color="text-green-600" />
        <StatCard label="Total Amount" value={`GHS ${stats.totalAmount.toFixed(2)}`} />
      </div>

      {/* Filters */}
      <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[220px] relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder="Search batch number or description…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[var(--bg-main)] border rounded-lg text-sm"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-3 py-2 bg-[var(--bg-main)] border rounded-lg text-sm"
          >
            <option value="all">All Types</option>
            <option value="nhis">NHIS</option>
            <option value="private">Private</option>
            <option value="corporate">Corporate</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 bg-[var(--bg-main)] border rounded-lg text-sm"
          >
            <option value="all">All Status</option>
            <option value="generated">Generated</option>
            <option value="finalized">Finalized</option>
          </select>
          <input
            type="number"
            placeholder="Year"
            value={periodYear}
            onChange={(e) => setPeriodYear(e.target.value)}
            className="w-24 px-3 py-2 bg-[var(--bg-main)] border rounded-lg text-sm"
          />
          <select
            value={periodMonth}
            onChange={(e) => setPeriodMonth(e.target.value)}
            className="px-3 py-2 bg-[var(--bg-main)] border rounded-lg text-sm"
          >
            <option value="">All Months</option>
            {MONTH_NAMES.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
          {(searchTerm || filterType !== 'all' || filterStatus !== 'all' || periodYear || periodMonth) && (
            <button
              onClick={() => {
                setSearchTerm(''); setFilterType('all'); setFilterStatus('all');
                setPeriodYear(''); setPeriodMonth('');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-main)] border rounded-lg text-sm"
            >
              <XCircle className="w-4 h-4" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Results meta */}
      <div className="text-sm text-[var(--text-secondary)]">
        Showing <span className="font-medium text-[var(--text-primary)]">{filtered.length === 0 ? 0 : startIndex + 1}</span> to{' '}
        <span className="font-medium text-[var(--text-primary)]">{Math.min(endIndex, filtered.length)}</span> of{' '}
        <span className="font-medium text-[var(--text-primary)]">{filtered.length}</span> batches
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] animate-pulse">
              <div className="h-4 bg-[var(--bg-main)] rounded w-1/4 mb-2" />
              <div className="h-3 bg-[var(--bg-main)] rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[var(--bg-card)] rounded-xl p-8 border border-[var(--border-color)] text-center">
          <Layers className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
          <p className="text-[var(--text-secondary)]">No claim batches found</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg text-sm"
          >
            Generate your first batch
          </button>
        </div>
      ) : (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-main)] border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Batch #</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Period</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Provider / Account</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Claims</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {pageRows.map((b) => (
                <tr key={b.id} className="hover:bg-[var(--bg-main)]">
                  <td className="px-4 py-3 font-mono text-xs">{b.batchNumber}</td>
                  <td className="px-4 py-3">
                    {MONTH_NAMES[(b.periodMonth ?? 1) - 1]} {b.periodYear}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColor(b.insuranceType)}`}>
                      {typeLabel(b.insuranceType)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {b.insuranceType === 'corporate'
                      ? (b.corporateAccount?.companyName ?? '—')
                      : (b.insuranceProvider?.name ?? '—')}
                  </td>
                  <td className="px-4 py-3 text-right">{b.totalClaims ?? b.claims?.length ?? 0}</td>
                  <td className="px-4 py-3 text-right font-medium">GHS {Number(b.totalAmount || 0).toFixed(2)}</td>
                  <td className="px-4 py-3">{statusBadge(b.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => handleView(b.id)} title="View" className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {b.insuranceType === 'nhis' && (
                        <button onClick={() => handleDownloadXml(b.id)} title="Download XML" className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg">
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => handlePrint(b.id)} title="Print" className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      {b.status === 'generated' && (
                        <button
                          onClick={() => handleFinalize(b.id)}
                          disabled={processingId === b.id}
                          title="Finalize"
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {b.status === 'generated' && (
                        <button
                          onClick={() => setDeleteId(b.id)}
                          disabled={processingId === b.id}
                          title="Delete"
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-2 disabled:opacity-40"><ChevronsLeft className="w-4 h-4" /></button>
          <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm text-[var(--text-secondary)]">Page {currentPage} of {totalPages}</span>
          <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
          <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="p-2 disabled:opacity-40"><ChevronsRight className="w-4 h-4" /></button>
        </div>
      )}

      {/* ── Create batch (month) modal ─────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-xl max-w-2xl w-full border">
            <div className="border-b px-5 py-3 flex justify-between items-center">
              <h3 className="font-bold text-lg">Generate Monthly Batch</h3>
              <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-[var(--bg-main)] rounded">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-[var(--text-secondary)]">
                The batch is built automatically from <strong>finalized, un-batched</strong> claims whose attendance date falls in the selected month. You cannot pick individual claims.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Insurance Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as InsuranceType)}
                    className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg text-sm"
                  >
                    <option value="nhis">NHIS</option>
                    <option value="private">Private</option>
                    <option value="corporate">Corporate</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Description (optional)</label>
                  <input
                    type="text"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="e.g., October NHIS batch"
                    className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Year</label>
                  <input
                    type="number"
                    value={formYear}
                    onChange={(e) => setFormYear(parseInt(e.target.value, 10) || formYear)}
                    className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Month</label>
                  <select
                    value={formMonth}
                    onChange={(e) => setFormMonth(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg text-sm"
                  >
                    {MONTH_NAMES.map((m, i) => (
                      <option key={m} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                {formType !== 'nhis' && (
                  <div className="col-span-2">
                    <label className="block text-xs font-medium mb-1">
                      {formType === 'corporate' ? 'Corporate Account ID (optional)' : 'Insurance Provider ID'}
                    </label>
                    <input
                      type="text"
                      value={formType === 'corporate' ? formCorporateId : formProviderId}
                      onChange={(e) => formType === 'corporate' ? setFormCorporateId(e.target.value) : setFormProviderId(e.target.value)}
                      placeholder="UUID"
                      className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg text-sm font-mono"
                    />
                  </div>
                )}
              </div>

              <div className="rounded-lg border bg-[var(--bg-main)] p-3">
                <p className="text-xs font-medium mb-2 text-[var(--text-secondary)]">
                  Eligible claims in {MONTH_NAMES[formMonth - 1]} {formYear}
                </p>
                {eligibleLoading ? (
                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <Loader className="w-3 h-3 animate-spin" /> Loading…
                  </div>
                ) : eligible ? (
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <EligibleChip type="nhis" count={eligible.nhis} amount={eligible.totalAmount.nhis} active={formType === 'nhis'} />
                    <EligibleChip type="private" count={eligible.private} amount={eligible.totalAmount.private} active={formType === 'private'} />
                    <EligibleChip type="corporate" count={eligible.corporate} amount={eligible.totalAmount.corporate} active={formType === 'corporate'} />
                  </div>
                ) : (
                  <p className="text-xs text-red-600">Could not load eligible claims</p>
                )}
              </div>

              <div className="flex gap-3 pt-3 border-t">
                <button
                  onClick={handleCreate}
                  disabled={
                    processingId === '__create__' ||
                    !eligible ||
                    (eligible[formType] ?? 0) === 0
                  }
                  className="flex-1 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white disabled:opacity-50"
                >
                  {processingId === '__create__' ? 'Generating…' : `Generate ${typeLabel(formType)} Batch (${eligible?.[formType] ?? 0})`}
                </button>
                <button onClick={() => setShowCreate(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── View batch modal ───────────────────────────────────── */}
      {viewing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-xl max-w-4xl w-full max-h-[85vh] overflow-y-auto border">
            <div className="sticky top-0 bg-[var(--bg-card)] border-b px-5 py-3 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">{viewing.batchNumber}</h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  {MONTH_NAMES[(viewing.periodMonth ?? 1) - 1]} {viewing.periodYear} · {typeLabel(viewing.insuranceType)}
                </p>
              </div>
              <button onClick={() => setViewing(null)} className="p-1 hover:bg-[var(--bg-main)] rounded">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pb-4 border-b text-sm">
                <div>
                  <p className="text-xs text-[var(--text-secondary)]">Status</p>
                  <div className="mt-1">{statusBadge(viewing.status)}</div>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-secondary)]">Claims</p>
                  <p className="font-medium">{viewing.totalClaims ?? viewing.claims?.length ?? 0}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-secondary)]">Amount</p>
                  <p className="font-bold">GHS {Number(viewing.totalAmount || 0).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-secondary)]">Created By</p>
                  <p className="font-medium">{viewing.createdBy?.fullName ?? viewing.createdBy?.username ?? '—'}</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Claims ({viewing.claims?.length ?? 0})</h4>
                <div className="border rounded-lg overflow-x-auto max-h-80 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--bg-main)] sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left">Claim #</th>
                        <th className="px-3 py-2 text-left">Patient</th>
                        <th className="px-3 py-2 text-right">Amount</th>
                        <th className="px-3 py-2 text-left">Status</th>
                        <th className="px-3 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {(viewing.claims ?? []).map((c: any) => (
                        <tr key={c.id} className="hover:bg-[var(--bg-main)]">
                          <td className="px-3 py-2 font-mono text-xs">{c.claimNumber}</td>
                          <td className="px-3 py-2">{(c.patient?.surname ?? c.Patient?.surname ?? '')} {(c.patient?.otherNames ?? c.Patient?.otherNames ?? '')}</td>
                          <td className="px-3 py-2 text-right">GHS {Number(c.totalClaimAmount || 0).toFixed(2)}</td>
                          <td className="px-3 py-2 text-xs">{c.status}</td>
                          <td className="px-3 py-2 text-right">
                            <Link
                              to={`/dashboard/insurance-claims/${c.id}/edit`}
                              className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                            >
                              <LinkIcon className="w-3 h-3" />
                              Open claim
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t flex-wrap">
                {viewing.insuranceType === 'nhis' && (
                  <button onClick={() => handleDownloadXml(viewing.id)} className="flex-1 py-2 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-600 hover:text-white text-sm flex items-center justify-center gap-2">
                    <Download className="w-4 h-4" /> Download NHIS XML
                  </button>
                )}
                <button onClick={() => handlePrint(viewing.id)} className="flex-1 py-2 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-600 hover:text-white text-sm flex items-center justify-center gap-2">
                  <Printer className="w-4 h-4" /> Print Batch Summary
                </button>
                {viewing.status === 'generated' && (
                  <button
                    onClick={() => handleFinalize(viewing.id)}
                    disabled={processingId === viewing.id}
                    className="flex-1 py-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-600 hover:text-white text-sm disabled:opacity-50"
                  >
                    Finalize Batch
                  </button>
                )}
                <button onClick={() => setViewing(null)} className="px-4 py-2 border rounded-lg text-sm">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm ─────────────────────────────────────── */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-xl p-6 max-w-md w-full border">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Delete Batch</h3>
                <p className="text-sm text-[var(--text-secondary)]">Only generated batches can be deleted.</p>
              </div>
            </div>
            <p className="mb-6 text-sm">
              The claims in this batch will return to "finalized, un-batched" and can be picked up by a future batch.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 px-4 py-2 border rounded-lg">Cancel</button>
              <button
                onClick={handleDelete}
                disabled={processingId === deleteId}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {processingId === deleteId ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] text-center">
      <div className={`text-2xl font-bold ${color ?? 'text-[var(--text-primary)]'}`}>{value}</div>
      <div className="text-xs text-[var(--text-secondary)] mt-1">{label}</div>
    </div>
  );
}

function EligibleChip({
  type, count, amount, active,
}: { type: InsuranceType; count: number; amount: number; active: boolean }) {
  return (
    <div className={`rounded-lg border p-2 ${active ? 'border-[var(--icon-cyan-text)] bg-[var(--icon-cyan-bg)]/20' : 'border-[var(--border-color)]'}`}>
      <p className="text-xs font-medium text-[var(--text-secondary)]">{typeLabel(type)}</p>
      <p className="text-lg font-bold text-[var(--text-primary)]">{count}</p>
      <p className="text-[11px] text-[var(--text-secondary)]">GHS {amount.toFixed(2)}</p>
    </div>
  );
}