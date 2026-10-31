// src/pages/ClaimBatches.tsx — month-driven claim batching
//
// The screen is built around a period: pick a month, see every claim that belongs to it and what
// it adds up to, then generate the batch from that month. The claims and the totals both come from
// the server, because a month's worth of claims is not something the rows currently on screen can
// add up to.
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useInsuranceStore } from '../store/insuranceStore';
import { useToast } from '../store/toastStore';
import { useAuthStore } from '../store/authStore';
import { confirmDialog } from '../context/ConfirmDialog';
import { describeApiError } from '../utils/apiError';
import { ClaimItBatchOutcomes, ClaimItHeldBack, ClaimItOutcomeBadge, ClaimItStatusNote } from '../components/claims/ClaimItUI';
import {
  getBatchClaimItSubmissions,
  getClaimItStatus,
  getCorporateAccounts,
  submitBatchToClaimIt,
  deleteBatchFromClaimIt,
  type BatchEligibility,
  type ClaimItBatchResult,
  type ClaimItStatus,
  type ClaimItSubmissionRow,
  type PeriodClaimRow,
} from '../api';
import type { CorporateAccount } from '../types';
import {
  ArrowLeft, RefreshCw, Plus, Trash2, Eye, Download, CheckCircle,
  Clock, FileText, Calendar, DollarSign, Layers, Send,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Search, Loader, Printer, XCircle, Link as LinkIcon,
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
  createdBy?: { fullName?: string; username: string };
  insuranceProvider?: { id: string; name: string } | null;
  corporateAccount?: { id: string; companyName: string } | null;
  claims?: any[];
}

const BATCHES_PER_PAGE = 20;
const CLAIMS_PER_PAGE = 25;
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

const money = (value: unknown) => `GHS ${Number(value || 0).toFixed(2)}`;
const shortDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString() : '—';
const periodName = (year: number, month: number) => `${MONTH_NAMES[month - 1]} ${year}`;

export default function ClaimBatches() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const { hasRole } = useAuthStore();
  // Matches the routes: accounts and admin may submit, and only an administrator may ask CLAIM-it
  // to delete a whole period.
  const canSendToClaimIt = hasRole(['admin', 'accounts']);
  const canWithdrawPeriod = hasRole(['admin']);

  const {
    batches,
    batchSummary,
    periodClaims,
    providers,
    pagination,
    getClaimBatches,
    getClaimBatch,
    getPeriodClaims,
    generateClaimBatch,
    finalizeClaimBatch,
    deleteClaimBatch,
    downloadBatchXml,
    printBatch,
    getEligibleClaimsForBatch,
    getInsuranceProviders,
    isLoading,
  } = useInsuranceStore();

  const today = new Date();
  // The period the whole screen is looking at. Both the batch list and the month's claim rows
  // follow it, so a month that has not been batched yet still shows its claims and total.
  const [periodYear, setPeriodYear] = useState(today.getFullYear());
  const [periodMonth, setPeriodMonth] = useState(today.getMonth() + 1);

  const [searchTerm, setSearchTerm] = useState('');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | InsuranceType>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | BatchStatus>('all');
  const [claimState, setClaimState] = useState<'all' | 'batched' | 'unbatched'>('all');
  const [claimsPage, setClaimsPage] = useState(1);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [claimsError, setClaimsError] = useState<string | null>(null);

  const [page, setPage] = useState(1);

  const [showCreate, setShowCreate] = useState(false);
  const [viewing, setViewing] = useState<BatchRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Create form state — opens on the period already selected on screen.
  const [formType, setFormType] = useState<InsuranceType>('nhis');
  const [formYear, setFormYear] = useState(today.getFullYear());
  const [formMonth, setFormMonth] = useState(today.getMonth() + 1);
  const [formProviderId, setFormProviderId] = useState('');
  const [formCorporateId, setFormCorporateId] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [corporateAccounts, setCorporateAccounts] = useState<CorporateAccount[]>([]);
  const [eligible, setEligible] = useState<BatchEligibility | null>(null);
  const [eligibleLoading, setEligibleLoading] = useState(false);
  const [eligibleError, setEligibleError] = useState<string | null>(null);

  // CLAIM-it: the payer's answer per batch, kept on the screen until the operator moves on.
  const [claimitStatus, setClaimItStatus] = useState<ClaimItStatus | null>(null);
  const [claimitBusy, setClaimItBusy] = useState<string | null>(null);
  const [claimitResult, setClaimItResult] = useState<ClaimItBatchResult | null>(null);
  const [claimitHistory, setClaimItHistory] = useState<Array<{ claimId: string; claimNumber: string; submission: ClaimItSubmissionRow | null }>>([]);
  const [claimitError, setClaimItError] = useState<string | null>(null);

  useEffect(() => {
    // Which CLAIM-it host is configured, and whether sending is switched on at all.
    let cancelled = false;
    getClaimItStatus()
      .then(status => { if (!cancelled) setClaimItStatus(status); })
      .catch(() => { if (!cancelled) setClaimItStatus(null); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    getInsuranceProviders().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (formType !== 'corporate' || corporateAccounts.length) return;
    getCorporateAccounts({ isActive: true, limit: 200 })
      .then((res: any) => {
        const rows = res?.data?.data ?? res?.data ?? res ?? [];
        setCorporateAccounts(Array.isArray(rows) ? rows : []);
      })
      .catch(() => setCorporateAccounts([]));
  }, [formType, corporateAccounts.length]);

  // Search is server-side now: filtering only the page already loaded would hide batches that
  // belong to the month rather than find them.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchTerm.trim()), 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
    setClaimsPage(1);
  }, [periodYear, periodMonth, filterType, filterStatus, search, claimState]);

  useEffect(() => {
    loadBatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodYear, periodMonth, filterType, filterStatus, search, page]);

  useEffect(() => {
    let cancelled = false;
    setClaimsLoading(true);
    setClaimsError(null);
    getPeriodClaims({
      periodYear,
      periodMonth,
      insuranceType: filterType,
      batched: claimState,
      page: claimsPage,
      limit: CLAIMS_PER_PAGE,
    })
      .catch((e: any) => {
        if (!cancelled) setClaimsError(e?.response?.data?.message || 'Could not load the month’s claims');
      })
      .finally(() => {
        if (!cancelled) setClaimsLoading(false);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodYear, periodMonth, filterType, claimState, claimsPage]);

  const loadBatches = async () => {
    try {
      await getClaimBatches({
        periodYear,
        periodMonth,
        insuranceType: filterType !== 'all' ? filterType : undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined,
        search: search || undefined,
        page,
        limit: BATCHES_PER_PAGE,
      });
    } catch (e: any) {
      toastError('Load failed', e?.response?.data?.message || e?.message || 'Could not fetch batches');
    }
  };

  // Eligible preview whenever the create form's period or scope changes. The scope goes to the
  // server with the request, so the number on screen is the batch this form would build.
  useEffect(() => {
    if (!showCreate) return;
    let cancelled = false;
    setEligibleLoading(true);
    setEligibleError(null);
    getEligibleClaimsForBatch({
      periodYear: formYear,
      periodMonth: formMonth,
      insuranceProviderId: formProviderId || undefined,
      corporateAccountId: formType === 'corporate' ? (formCorporateId || undefined) : undefined,
    })
      .then((r) => { if (!cancelled) setEligible(r); })
      .catch((e: any) => {
        if (cancelled) return;
        setEligible(null);
        setEligibleError(e?.response?.data?.message || 'Could not load eligible claims');
      })
      .finally(() => { if (!cancelled) setEligibleLoading(false); });
    return () => { cancelled = true; };
  }, [showCreate, formYear, formMonth, formType, formProviderId, formCorporateId, getEligibleClaimsForBatch]);

  const totals = periodClaims?.totals ?? null;
  const claimsPages = Math.max(1, periodClaims?.pagination?.pages ?? 1);
  const rows = useMemo(() => periodClaims?.rows ?? [], [periodClaims]);

  const providerOptions = useMemo(
    () => providers.filter((p: any) => p.type === formType && p.isActive !== false),
    [providers, formType],
  );

  const eligibleForFormType = eligible ? eligible[formType] : 0;
  // Private batches are per provider and corporate batches per account — until one is chosen the
  // count spans every payer of that kind, which is not what the batch would take.
  const needsPayerChoice = formType === 'corporate' ? !formCorporateId : formType === 'private' && !formProviderId;
  const canGenerate =
    !eligibleLoading && !!eligible && eligibleForFormType > 0 && !needsPayerChoice;

  const handleCreate = async () => {
    try {
      setProcessingId('__create__');
      await generateClaimBatch({
        insuranceType: formType,
        periodYear: formYear,
        periodMonth: formMonth,
        insuranceProviderId: formType === 'corporate' ? undefined : (formProviderId || undefined),
        corporateAccountId: formType === 'corporate' ? formCorporateId : undefined,
        description: formDescription || undefined,
      });
      success(
        'Batch generated',
        `${eligibleForFormType} ${typeLabel(formType)} claim(s) from ${periodName(formYear, formMonth)}`,
      );
      setShowCreate(false);
      setFormDescription('');
      setPeriodYear(formYear);
      setPeriodMonth(formMonth);
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
      setClaimItResult(null);
      setClaimItError(null);
      await loadClaimItHistory(id, (b as unknown as BatchRow)?.insuranceType);
    } catch (e: any) {
      toastError('View failed', e?.message || 'Could not load batch');
    }
  };

  const handleDownloadXml = async (id: string) => {
    try {
      await downloadBatchXml(id);
      success('XML ready', 'Batch XML is downloading');
    } catch (e: any) {
      toastError('Download failed', e?.response?.data?.message || e?.message || 'Could not download batch XML');
    }
  };

  const handlePrint = async (id: string) => {
    try {
      await printBatch(id);
    } catch (e: any) {
      toastError('Print failed', e?.response?.data?.message || e?.message || 'Could not open batch print view');
    }
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
      success('Deleted', 'Batch removed; its claims are back in this month, un-batched');
      if (viewing?.id === deleteId) setViewing(null);
      setDeleteId(null);
      await loadBatches();
    } catch (e: any) {
      toastError('Delete failed', e?.response?.data?.message || e?.message);
    } finally {
      setProcessingId(null);
    }
  };

  const loadClaimItHistory = async (batchId: string, insuranceType?: string) => {
    if (insuranceType && insuranceType !== 'nhis') {
      setClaimItHistory([]);
      return;
    }
    try {
      const result = await getBatchClaimItSubmissions(batchId);
      setClaimItHistory(result.claims ?? []);
      setClaimItError(null);
    } catch (e: any) {
      setClaimItHistory([]);
      setClaimItError(describeApiError(e, 'The CLAIM-it history for this batch could not be read.'));
    }
  };

  /**
   * Push the batch to the NHIS claims server in one request.
   *
   * `onlyFailed` re-sends after corrections without re-submitting the claims CLAIM-it already took,
   * which is what would duplicate them on the payer's side.
   */
  const handleSendBatch = async (batch: BatchRow, options: { onlyFailed?: boolean } = {}) => {
    try {
      setClaimItBusy(batch.id);
      setClaimItError(null);
      const result = await submitBatchToClaimIt(batch.id, options);
      setClaimItResult(result);
      await loadClaimItHistory(batch.id, batch.insuranceType);
      const title =
        result.totals.failed || result.totals.unknown
          ? 'CLAIM-it did not take every claim'
          : result.totals.sent === 0 ? 'Nothing was sent' : 'Sent to CLAIM-it';
      if (result.totals.failed || result.totals.unknown || result.totals.sent === 0) {
        toastError(title, result.message);
      } else {
        success(title, result.message);
      }
    } catch (e: any) {
      setClaimItError(describeApiError(e, 'The batch could not be sent to CLAIM-it.'));
      toastError('Not sent to CLAIM-it', describeApiError(e, 'The batch could not be sent to CLAIM-it.'));
    } finally {
      setClaimItBusy(null);
    }
  };

  /**
   * Ask CLAIM-it to delete the whole month.
   *
   * This is wider than the batch: the payer removes every NHIS claim it holds for that period,
   * including claims this app never sent, so it is admin-only and asks for the number back.
   */
  const handleWithdrawPeriod = async (batch: BatchRow) => {
    const confirmed = await confirmDialog({
      title: `Delete ${periodName(batch.periodYear, batch.periodMonth)} from CLAIM-it?`,
      message: 'CLAIM-it will delete every NHIS claim it holds for this month, not only the claims in this batch, and anything already adjudicated against them is not restored. This cannot be undone from the app.',
      confirmText: 'Delete the period',
      type: 'danger',
    });
    if (!confirmed) return;
    try {
      setClaimItBusy(batch.id);
      const result = await deleteBatchFromClaimIt(batch.id);
      success('Period withdrawn', result.message);
      await loadClaimItHistory(batch.id, batch.insuranceType);
    } catch (e: any) {
      toastError('Not withdrawn', describeApiError(e, 'CLAIM-it could not delete this period.'));
    } finally {
      setClaimItBusy(null);
    }
  };

  const statusBadge = (status: BatchStatus) =>
    status === 'generated'
      ? <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"><Clock className="w-3 h-3" />Generated</span>
      : <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3" />Finalized</span>;

  const clearFilters = () => {
    setSearchTerm('');
    setFilterType('all');
    setFilterStatus('all');
    setClaimState('all');
  };

  const totalBatchPages = Math.max(1, pagination?.pages ?? 1);
  const shownBatchCount = pagination?.total ?? batches.length;

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
            <p className="text-sm text-[var(--text-secondary)]">
              One month at a time — {periodName(periodYear, periodMonth)}
            </p>
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
            onClick={() => {
              setFormYear(periodYear);
              setFormMonth(periodMonth);
              setShowCreate(true);
            }}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition text-sm"
          >
            <Plus className="w-4 h-4" />
            Generate {periodName(periodYear, periodMonth)} Batch
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

      {/* Period selector */}
      <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[var(--text-secondary)]" />
            <label className="text-xs font-medium text-[var(--text-secondary)]">Month</label>
            <select
              value={periodMonth}
              onChange={(e) => setPeriodMonth(Number(e.target.value))}
              className="px-3 py-2 bg-[var(--bg-main)] border rounded-lg text-sm"
            >
              {MONTH_NAMES.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
            <label className="text-xs font-medium text-[var(--text-secondary)]">Year</label>
            <select
              value={periodYear}
              onChange={(e) => setPeriodYear(Number(e.target.value))}
              className="px-3 py-2 bg-[var(--bg-main)] border rounded-lg text-sm"
            >
              {yearOptions().map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
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
            <option value="all">All Batch Status</option>
            <option value="generated">Generated</option>
            <option value="finalized">Finalized</option>
          </select>
          <select
            value={claimState}
            onChange={(e) => setClaimState(e.target.value as any)}
            className="px-3 py-2 bg-[var(--bg-main)] border rounded-lg text-sm"
          >
            <option value="all">All claims</option>
            <option value="unbatched">Not yet batched</option>
            <option value="batched">Already batched</option>
          </select>
          {(searchTerm || filterType !== 'all' || filterStatus !== 'all' || claimState !== 'all') && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-main)] border rounded-lg text-sm"
            >
              <XCircle className="w-4 h-4" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Month totals — all from the server, for the whole period rather than the loaded page */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label={`Claims in ${MONTH_NAMES[periodMonth - 1]}`}
          value={totals?.claims ?? 0}
          sub={totals ? `${totals.batchable.count} ready to batch` : undefined}
        />
        <StatCard
          label="Value of the month"
          value={money(totals?.amount)}
          icon={<DollarSign className="w-4 h-4" />}
          sub={totals ? `${money(totals.batchable.amount)} still un-batched` : undefined}
        />
        <StatCard
          label="Batches this month"
          value={batchSummary?.batches ?? 0}
          sub={`${shownBatchCount} shown`}
        />
        <StatCard
          label="Batched value"
          value={money(batchSummary?.amount)}
          sub={batchSummary ? `${batchSummary.claims} claims inside` : undefined}
        />
      </div>

      {/* The month's claims */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="font-semibold text-[var(--text-primary)]">
              Claims in {periodName(periodYear, periodMonth)}
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              A claim belongs to the month its visit happened in. Drafts are listed too — they are
              not claimable until finalized.
            </p>
          </div>
          {claimsLoading && <Loader className="w-4 h-4 animate-spin text-[var(--text-secondary)]" />}
        </div>

        {claimsError ? (
          <p className="p-6 text-sm text-red-600 text-center">{claimsError}</p>
        ) : rows.length === 0 && !claimsLoading ? (
          <div className="p-8 text-center">
            <Layers className="w-10 h-10 text-[var(--text-tertiary)] mx-auto mb-3" />
            <p className="text-[var(--text-secondary)] text-sm">
              No claims have a visit in {periodName(periodYear, periodMonth)}.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg-main)] border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Claim #</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Visit</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Patient</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Payer</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Batch</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((c: PeriodClaimRow) => (
                    <tr key={c.claimId} className="hover:bg-[var(--bg-main)]">
                      <td className="px-4 py-3 font-mono text-xs">
                        <Link
                          to={`/dashboard/insurance-claims/${c.claimId}/edit`}
                          className="text-blue-600 hover:underline"
                        >
                          {c.claimNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {shortDate(c.visitDate)}
                        {c.attendanceNumber ? <span className="block text-[var(--text-tertiary)]">{c.attendanceNumber}</span> : null}
                      </td>
                      <td className="px-4 py-3">
                        {c.patient || '—'}
                        {c.folderNumber ? <span className="block text-xs text-[var(--text-tertiary)]">{c.folderNumber}</span> : null}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {c.insuranceType ? (
                          <span className={`px-2 py-0.5 rounded-full font-medium ${typeColor(c.insuranceType as InsuranceType)}`}>
                            {typeLabel(c.insuranceType as InsuranceType)}
                          </span>
                        ) : '—'}
                        {(c.provider || c.corporateAccount) && (
                          <span className="block text-[var(--text-tertiary)] mt-1">{c.corporateAccount ?? c.provider}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs capitalize">{c.status}</td>
                      <td className="px-4 py-3 text-xs">
                        {c.batch ? (
                          <button
                            onClick={() => handleView(c.batch!.batchId)}
                            className="font-mono text-blue-600 hover:underline"
                            title={`Batch is ${c.batch.status}`}
                          >
                            {c.batch.batchNumber}
                          </button>
                        ) : (
                          <span className="text-[var(--text-tertiary)]">not batched</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{money(c.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-[var(--bg-main)]">
                    <td className="px-4 py-3 text-xs font-medium" colSpan={6}>
                      Page {claimsPage} of {claimsPages} · all {totals?.claims ?? 0} claims in the month
                    </td>
                    <td className="px-4 py-3 text-right font-bold">{money(totals?.amount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {claimsPages > 1 && (
              <div className="flex items-center justify-center gap-2 py-2 border-t">
                <button onClick={() => setClaimsPage((p) => Math.max(1, p - 1))} disabled={claimsPage === 1} className="p-2 disabled:opacity-40">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-[var(--text-secondary)]">Page {claimsPage} of {claimsPages}</span>
                <button onClick={() => setClaimsPage((p) => Math.min(claimsPages, p + 1))} disabled={claimsPage === claimsPages} className="p-2 disabled:opacity-40">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Batches of the month */}
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
            {isLoading && batches.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[var(--text-secondary)]">
                  <Loader className="w-4 h-4 animate-spin inline mr-2" /> Loading…
                </td>
              </tr>
            ) : batches.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[var(--text-secondary)]">
                  No batch covers {periodName(periodYear, periodMonth)}
                  {filterType !== 'all' ? ` for ${typeLabel(filterType)}` : ''} yet.
                </td>
              </tr>
            ) : (
              batches.map((raw: any) => {
                const b = raw as BatchRow;
                return (
                  <tr key={b.id} className="hover:bg-[var(--bg-main)]">
                    <td className="px-4 py-3 font-mono text-xs">{b.batchNumber}</td>
                    <td className="px-4 py-3">{periodName(b.periodYear, b.periodMonth)}</td>
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
                    <td className="px-4 py-3 text-right font-medium">{money(b.totalAmount)}</td>
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
                        {b.insuranceType === 'nhis' && canSendToClaimIt && (
                          <button
                            onClick={() => handleSendBatch(b)}
                            disabled={claimitBusy === b.id}
                            title="Send to CLAIM-it"
                            className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50"
                          >
                            {claimitBusy === b.id ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
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
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalBatchPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button onClick={() => setPage(1)} disabled={page === 1} className="p-2 disabled:opacity-40"><ChevronsLeft className="w-4 h-4" /></button>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-2 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm text-[var(--text-secondary)]">Page {page} of {totalBatchPages} · {shownBatchCount} batches</span>
          <button onClick={() => setPage((p) => Math.min(totalBatchPages, p + 1))} disabled={page === totalBatchPages} className="p-2 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
          <button onClick={() => setPage(totalBatchPages)} disabled={page === totalBatchPages} className="p-2 disabled:opacity-40"><ChevronsRight className="w-4 h-4" /></button>
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
                The batch takes <strong>finalized, un-batched</strong> claims whose visit happened in
                the selected month. Claims are not picked by hand.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Insurance Type</label>
                  <select
                    value={formType}
                    onChange={(e) => { setFormType(e.target.value as InsuranceType); setFormProviderId(''); setFormCorporateId(''); }}
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
                    placeholder={`e.g. ${periodName(formYear, formMonth)} ${typeLabel(formType)} batch`}
                    className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Month</label>
                  <select
                    value={formMonth}
                    onChange={(e) => setFormMonth(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg text-sm"
                  >
                    {MONTH_NAMES.map((m, i) => (
                      <option key={m} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Year</label>
                  <select
                    value={formYear}
                    onChange={(e) => setFormYear(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg text-sm"
                  >
                    {yearOptions().map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                {formType !== 'corporate' && (
                  <div className="col-span-2">
                    <label className="block text-xs font-medium mb-1">
                      Insurance provider{formType === 'private' ? ' (required)' : ' (optional)'}
                    </label>
                    <select
                      value={formProviderId}
                      onChange={(e) => setFormProviderId(e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg text-sm"
                    >
                      <option value="">
                        {formType === 'private'
                          ? 'Choose a provider'
                          : 'All NHIS providers (auto-selects when only one exists)'}
                      </option>
                      {providerOptions.map((p: any) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                {formType === 'corporate' && (
                  <div className="col-span-2">
                    <label className="block text-xs font-medium mb-1">Corporate account (required)</label>
                    <select
                      value={formCorporateId}
                      onChange={(e) => setFormCorporateId(e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg text-sm"
                    >
                      <option value="">Choose an account</option>
                      {corporateAccounts.map((a) => (
                        <option key={a.id} value={a.id}>{a.companyName}</option>
                      ))}
                    </select>
                    {!corporateAccounts.length && (
                      <p className="text-[11px] text-[var(--text-tertiary)] mt-1">No active corporate accounts found.</p>
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-lg border bg-[var(--bg-main)] p-3">
                <p className="text-xs font-medium mb-2 text-[var(--text-secondary)]">
                  Claims a {typeLabel(formType)} batch would take from {periodName(formYear, formMonth)}
                </p>
                {eligibleLoading ? (
                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <Loader className="w-3 h-3 animate-spin" /> Loading…
                  </div>
                ) : eligibleError ? (
                  <p className="text-xs text-red-600">{eligibleError}</p>
                ) : eligible ? (
                  <>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <EligibleChip type="nhis" count={eligible.nhis} amount={eligible.totalAmount.nhis} active={formType === 'nhis'} />
                      <EligibleChip type="private" count={eligible.private} amount={eligible.totalAmount.private} active={formType === 'private'} />
                      <EligibleChip type="corporate" count={eligible.corporate} amount={eligible.totalAmount.corporate} active={formType === 'corporate'} />
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-2">
                      {eligibleForFormType} claim(s) · {money(eligible.totalAmount[formType])}
                      {needsPayerChoice
                        ? ' — choose the payer above and this counts only their claims.'
                        : ''}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-red-600">Could not load the month’s claims</p>
                )}
              </div>

              <div className="flex gap-3 pt-3 border-t">
                <button
                  onClick={handleCreate}
                  disabled={!canGenerate || processingId === '__create__'}
                  className="flex-1 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white disabled:opacity-50"
                >
                  {processingId === '__create__'
                    ? 'Generating…'
                    : `Generate ${typeLabel(formType)} Batch (${eligibleForFormType})`}
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
                  {periodName(viewing.periodYear, viewing.periodMonth)} · {typeLabel(viewing.insuranceType)}
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
                  <p className="font-bold">{money(viewing.totalAmount)}</p>
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
                        <th className="px-3 py-2 text-left">Visit</th>
                        <th className="px-3 py-2 text-left">Patient</th>
                        <th className="px-3 py-2 text-left">Status</th>
                        <th className="px-3 py-2 text-right">Amount</th>
                        <th className="px-3 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {(viewing.claims ?? []).map((c: any) => (
                        <tr key={c.id} className="hover:bg-[var(--bg-main)]">
                          <td className="px-3 py-2 font-mono text-xs">{c.claimNumber}</td>
                          <td className="px-3 py-2 text-xs">
                            {shortDate(c.Attendance?.dateTime ?? c.attendance?.dateTime)}
                          </td>
                          <td className="px-3 py-2">
                            {(c.Patient?.surname ?? c.patient?.surname ?? '')} {(c.Patient?.otherNames ?? c.patient?.otherNames ?? '')}
                          </td>
                          <td className="px-3 py-2 text-xs capitalize">{c.status}</td>
                          <td className="px-3 py-2 text-right">{money(c.totalClaimAmount)}</td>
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
                    <tfoot>
                      <tr className="border-t bg-[var(--bg-main)]">
                        <td className="px-3 py-2 text-xs font-medium" colSpan={4}>
                          Sum of the claims in this batch
                        </td>
                        <td className="px-3 py-2 text-right font-bold">
                          {money((viewing.claims ?? []).reduce((s: number, c: any) => s + Number(c.totalClaimAmount || 0), 0))}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
                {!!viewing.claims?.length &&
                  Math.abs(
                    (viewing.claims as any[]).reduce((s: number, c: any) => s + Number(c.totalClaimAmount || 0), 0)
                    - Number(viewing.totalAmount || 0),
                  ) > 0.005 && (
                    <p className="text-[11px] text-orange-600 mt-1">
                      The claims no longer add up to the batch total on record — finalize the batch to
                      recompute it.
                    </p>
                  )}
              </div>

              {viewing.insuranceType === 'nhis' && (
                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="text-sm font-semibold text-[var(--text-primary)]">CLAIM-it</h4>
                    {canSendToClaimIt && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSendBatch(viewing)}
                          disabled={claimitBusy === viewing.id}
                          className="px-3 py-1.5 rounded-lg bg-green-100 text-green-800 hover:bg-green-600 hover:text-white text-xs flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {claimitBusy === viewing.id ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                          Send {viewing.totalClaims} claims
                        </button>
                        <button
                          onClick={() => handleSendBatch(viewing, { onlyFailed: true })}
                          disabled={claimitBusy === viewing.id}
                          title="Re-send only the claims CLAIM-it rejected or could not confirm"
                          className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-500 hover:text-white text-xs disabled:opacity-50"
                        >
                          Retry rejected
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-2">
                    <ClaimItStatusNote status={claimitStatus} />
                    {claimitError && <p className="text-xs text-red-600 mt-1">{claimitError}</p>}
                  </div>

                  {claimitResult && claimitResult.batchId === viewing.id && (
                    <div className="mt-3 border border-[var(--border-color)] p-3 bg-[var(--bg-main)]">
                      <p className="text-xs text-[var(--text-primary)]">{claimitResult.message}</p>
                      <ClaimItHeldBack held={claimitResult.notReady} />
                      <ClaimItBatchOutcomes results={claimitResult.results} />
                    </div>
                  )}

                  {!claimitResult && claimitHistory.some(row => row.submission) && (
                    <ul className="mt-2 space-y-1">
                      {claimitHistory
                        .filter(row => row.submission)
                        .map(row => (
                          <li key={row.claimId} className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                            <ClaimItOutcomeBadge outcome={row.submission!.outcome} />
                            <span className="text-[var(--text-primary)]">{row.claimNumber}</span>
                            <span>attempt {row.submission!.attemptNo}</span>
                            {row.submission!.payerCost != null && <span>CLAIM-it cost {Number(row.submission!.payerCost).toFixed(2)}</span>}
                          </li>
                        ))}
                    </ul>
                  )}

                  {canWithdrawPeriod && claimitHistory.some(row => row.submission) && (
                    <button
                      onClick={() => handleWithdrawPeriod(viewing)}
                      disabled={claimitBusy === viewing.id}
                      className="mt-3 text-xs text-red-600 underline disabled:opacity-50"
                    >
                      Delete this month from CLAIM-it
                    </button>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-3 border-t flex-wrap">
                {viewing.insuranceType === 'nhis' && (
                  <button onClick={() => handleDownloadXml(viewing.id)} className="flex-1 py-2 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-600 hover:text-white text-sm flex items-center justify-center gap-2">
                    <Download className="w-4 h-4" /> Download NHIS XML
                  </button>
                )}
                <button onClick={() => handlePrint(viewing.id)} className="flex-1 py-2 rounded-lg bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-text)] hover:text-white text-sm flex items-center justify-center gap-2">
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
              The claims in this batch return to "finalized, un-batched" and the next batch for their
              month will pick them up again.
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

/** This year plus the four before it — the batching window a facility actually works in. */
function yearOptions(): number[] {
  const current = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => current - i);
}

function StatCard({
  label, value, sub, color, icon,
}: { label: string; value: number | string; sub?: string; color?: string; icon?: ReactNode }) {
  return (
    <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
      <div className="flex items-center gap-2">
        {icon}
        <div className={`text-2xl font-bold ${color ?? 'text-[var(--text-primary)]'}`}>{value}</div>
      </div>
      <div className="text-xs text-[var(--text-secondary)] mt-1">{label}</div>
      {sub && <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">{sub}</div>}
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
      <p className="text-[11px] text-[var(--text-secondary)]">{money(amount)}</p>
    </div>
  );
}
