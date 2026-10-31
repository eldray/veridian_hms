// src/pages/ClaimBatches.tsx — month-driven claim batching
//
// The screen is built around a period: pick a month, see every claim that belongs to it and what
// it adds up to, then generate the batch from that month. The claims and the totals both come from
// the server, because a month's worth of claims is not something the rows currently on screen can
// add up to.
import { useEffect, useMemo, useState } from 'react';
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
  RefreshCw, Plus, Trash2, Eye, Download, CheckCircle,
  Clock, FileText, Calendar, DollarSign, Layers, Send,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Loader, Printer, XCircle, Link as LinkIcon,
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import InsuranceTabs, { INSURANCE_FAMILIES, insuranceSectionPath, type InsuranceFamily } from '../components/InsuranceTabs';
import { Badge, Button, Card, cn, Field, FilterSelect, INPUT, PageHeader, SearchInput, StatCard, TH, TH_ROW, TD, TD_MONO, TR, humanStatus, statusTone, type BadgeTone } from '../components/ui';

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

/** Same chip colour story as the rest of the app: payer family keeps one accent. */
const typeTone: Record<InsuranceType, BadgeTone> = {
  nhis: 'green',
  private: 'blue',
  corporate: 'indigo',
};

const money = (value: unknown) => `GHS ${Number(value || 0).toFixed(2)}`;
const shortDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString() : '—';
const periodName = (year: number, month: number) => `${MONTH_NAMES[month - 1]} ${year}`;

export default function ClaimBatches({ family }: { family: InsuranceFamily }) {
  const familyMeta = INSURANCE_FAMILIES.find((f) => f.key === family) ?? INSURANCE_FAMILIES[0];
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
  // The payer family is a tab now, so the batch list is always scoped to one payer
  // rather than mixing three in one table.
  const filterType: InsuranceType = family;
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
        insuranceType: filterType,
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
      ? <Badge tone="blue" size="sm"><Clock className="w-3 h-3" />Generated</Badge>
      : <Badge tone="green" size="sm"><CheckCircle className="w-3 h-3" />Finalized</Badge>;

  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setClaimState('all');
  };

  const totalBatchPages = Math.max(1, pagination?.pages ?? 1);
  const shownBatchCount = pagination?.total ?? batches.length;

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <PageHeader
        title="Claim Batches"
        subtitle={`One month at a time — ${periodName(periodYear, periodMonth)}`}
        meta={`Showing ${familyMeta.label} batches`}
        icon={familyMeta.icon}
        accent={familyMeta.accent}
        backTo="/dashboard"
        tabs={<InsuranceTabs family={family} section="batches" />}
        actions={(
          <>
            <Button icon={FileText} onClick={() => navigate(insuranceSectionPath(family, 'claims'))}>
              {familyMeta.label} claims
            </Button>
            <Button
              variant="primary"
              icon={Plus}
              onClick={() => {
                setFormType(family);
                setFormYear(periodYear);
                setFormMonth(periodMonth);
                setShowCreate(true);
              }}
            >
              Generate {periodName(periodYear, periodMonth)} Batch
            </Button>
            <Button icon={RefreshCw} loading={isLoading} onClick={loadBatches}>Refresh</Button>
          </>
        )}
      />

      {/* Period selector */}
      <Card>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[var(--text-secondary)]" />
            <label className="text-xs font-medium text-[var(--text-secondary)]">Month</label>
            <FilterSelect
              aria-label="Claim month"
              value={String(periodMonth)}
              onChange={(value) => setPeriodMonth(Number(value))}
              options={MONTH_NAMES.map((m, i) => ({ value: String(i + 1), label: m }))}
            />
            <label className="text-xs font-medium text-[var(--text-secondary)]">Year</label>
            <FilterSelect
              aria-label="Claim year"
              value={String(periodYear)}
              onChange={(value) => setPeriodYear(Number(value))}
              options={yearOptions().map((y) => ({ value: String(y), label: String(y) }))}
            />
          </div>
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search batch number or description…"
          />
          <FilterSelect
            aria-label="Batch status"
            value={filterStatus}
            onChange={(value) => setFilterStatus(value as 'all' | BatchStatus)}
            options={[
              { value: 'all', label: 'All batch statuses' },
              { value: 'generated', label: 'Generated' },
              { value: 'finalized', label: 'Finalized' },
            ]}
          />
          <FilterSelect
            aria-label="Claim batching"
            value={claimState}
            onChange={(value) => setClaimState(value as 'all' | 'unbatched' | 'batched')}
            options={[
              { value: 'all', label: 'All claims' },
              { value: 'unbatched', label: 'Not yet batched' },
              { value: 'batched', label: 'Already batched' },
            ]}
          />
          {(searchTerm || filterStatus !== 'all' || claimState !== 'all') && (
            <Button icon={XCircle} onClick={clearFilters}>
              Clear
            </Button>
          )}
        </div>
      </Card>

      {/* Month totals — all from the server, for the whole period rather than the loaded page */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label={`Claims in ${MONTH_NAMES[periodMonth - 1]}`}
          value={totals?.claims ?? 0}
          hint={totals ? `${totals.batchable.count} ready to batch` : undefined}
        />
        <StatCard
          label="Value of the month"
          size="money"
          icon={DollarSign}
          value={money(totals?.amount)}
          hint={totals ? `${money(totals.batchable.amount)} still un-batched` : undefined}
        />
        <StatCard
          label="Batches this month"
          value={batchSummary?.batches ?? 0}
          hint={`${shownBatchCount} shown`}
        />
        <StatCard
          label="Batched value"
          size="money"
          value={money(batchSummary?.amount)}
          hint={batchSummary ? `${batchSummary.claims} claims inside` : undefined}
        />
      </div>

      {/* The month's claims */}
      <Card
        title={`Claims in ${periodName(periodYear, periodMonth)}`}
        description="A claim belongs to the month its visit happened in. Drafts are listed too — they are not claimable until finalized."
        actions={claimsLoading ? <Loader className="w-4 h-4 animate-spin text-[var(--text-secondary)]" /> : undefined}
        padded={false}
      >
        {claimsError ? (
          <p className="p-6 text-sm text-[var(--icon-red-text)] text-center">{claimsError}</p>
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
                <thead>
                  <tr className={TH_ROW}>
                    <th className={TH}>Claim #</th>
                    <th className={TH}>Visit</th>
                    <th className={TH}>Patient</th>
                    <th className={TH}>Payer</th>
                    <th className={TH}>Status</th>
                    <th className={TH}>Batch</th>
                    <th className={cn(TH, 'text-right')}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c: PeriodClaimRow) => (
                    <tr key={c.claimId} className={TR}>
                      <td className={cn(TD_MONO, 'text-xs')}>
                        <Link
                          to={`/dashboard/insurance/claims/${c.claimId}/edit`}
                          className="text-[var(--icon-cyan-text)] hover:underline"
                        >
                          {c.claimNumber}
                        </Link>
                      </td>
                      <td className={cn(TD, 'text-xs')}>
                        {shortDate(c.visitDate)}
                        {c.attendanceNumber ? <span className="block text-[var(--text-tertiary)]">{c.attendanceNumber}</span> : null}
                      </td>
                      <td className={TD}>
                        {c.patient || '—'}
                        {c.folderNumber ? <span className="block text-xs text-[var(--text-tertiary)]">{c.folderNumber}</span> : null}
                      </td>
                      <td className={cn(TD, 'text-xs')}>
                        {c.insuranceType ? (
                          <Badge tone={typeTone[c.insuranceType as InsuranceType]}>
                            {typeLabel(c.insuranceType as InsuranceType)}
                          </Badge>
                        ) : '—'}
                        {(c.provider || c.corporateAccount) && (
                          <span className="block text-[var(--text-tertiary)] mt-1">{c.corporateAccount ?? c.provider}</span>
                        )}
                      </td>
                      <td className={TD}>
                        <Badge tone={statusTone(c.status)} size="sm" dot>{humanStatus(c.status)}</Badge>
                      </td>
                      <td className={cn(TD, 'text-xs')}>
                        {c.batch ? (
                          <Button
                            size="xs"
                            variant="ghost"
                            className="font-mono"
                            title={`Batch is ${c.batch.status}`}
                            onClick={() => handleView(c.batch!.batchId)}
                          >
                            {c.batch.batchNumber}
                          </Button>
                        ) : (
                          <span className="text-[var(--text-tertiary)]">not batched</span>
                        )}
                      </td>
                      <td className={cn(TD, 'text-right font-medium')}>{money(c.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-[var(--border-color)] bg-[var(--bg-main)]">
                    <td className="px-4 py-3 text-xs font-medium text-[var(--text-primary)]" colSpan={6}>
                      Page {claimsPage} of {claimsPages} · all {totals?.claims ?? 0} claims in the month
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-[var(--text-primary)]">{money(totals?.amount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {claimsPages > 1 && (
              <div className="flex items-center justify-center gap-2 py-2 border-t border-[var(--border-color)]">
                <Button variant="secondary" size="sm" iconOnly icon={ChevronLeft} aria-label="Previous page" disabled={claimsPage === 1} onClick={() => setClaimsPage((p) => Math.max(1, p - 1))} />
                <span className="text-sm text-[var(--text-secondary)]">Page {claimsPage} of {claimsPages}</span>
                <Button variant="secondary" size="sm" iconOnly icon={ChevronRight} aria-label="Next page" disabled={claimsPage === claimsPages} onClick={() => setClaimsPage((p) => Math.min(claimsPages, p + 1))} />
              </div>
            )}
          </>
        )}
      </Card>

      {/* Batches of the month */}
      <Card
        title={`Batches in ${periodName(periodYear, periodMonth)}`}
        description={`Generated for ${typeLabel(filterType)}. A batch stays editable until it is finalized.`}
        padded={false}
      >
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className={TH_ROW}>
              <th className={TH}>Batch #</th>
              <th className={TH}>Period</th>
              <th className={TH}>Type</th>
              <th className={TH}>Provider / account</th>
              <th className={cn(TH, 'text-right')}>Claims</th>
              <th className={cn(TH, 'text-right')}>Amount</th>
              <th className={TH}>Status</th>
              <th className={cn(TH, 'text-right')}>Actions</th>
            </tr>
          </thead>
          <tbody>
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
                  {` for ${typeLabel(filterType)}`} yet.
                </td>
              </tr>
            ) : (
              batches.map((raw: any) => {
                const b = raw as BatchRow;
                return (
                  <tr key={b.id} className={TR}>
                    <td className={cn(TD_MONO, 'text-xs')}>{b.batchNumber}</td>
                    <td className={TD}>{periodName(b.periodYear, b.periodMonth)}</td>
                    <td className={TD}>
                      <Badge tone={typeTone[b.insuranceType]}>
                        {typeLabel(b.insuranceType)}
                      </Badge>
                    </td>
                    <td className={TD}>
                      {b.insuranceType === 'corporate'
                        ? (b.corporateAccount?.companyName ?? '—')
                        : (b.insuranceProvider?.name ?? '—')}
                    </td>
                    <td className={cn(TD, 'text-right')}>{b.totalClaims ?? b.claims?.length ?? 0}</td>
                    <td className={cn(TD, 'text-right font-medium')}>{money(b.totalAmount)}</td>
                    <td className={TD}>{statusBadge(b.status)}</td>
                    <td className={cn(TD, 'text-right')}>
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <Button size="xs" variant="ghost" iconOnly icon={Eye} aria-label="View batch" onClick={() => handleView(b.id)} />
                        {b.insuranceType === 'nhis' && (
                          <Button size="xs" variant="ghost" iconOnly icon={Download} aria-label="Download batch XML" onClick={() => handleDownloadXml(b.id)} />
                        )}
                        {b.insuranceType === 'nhis' && canSendToClaimIt && (
                          <Button
                            size="xs"
                            variant="ghost"
                            iconOnly
                            icon={claimitBusy === b.id ? undefined : Send}
                            loading={claimitBusy === b.id}
                            aria-label="Send to CLAIM-it"
                            className="text-[var(--icon-green-text)]"
                            onClick={() => handleSendBatch(b)}
                          />
                        )}
                        <Button size="xs" variant="ghost" iconOnly icon={Printer} aria-label="Print batch" onClick={() => handlePrint(b.id)} />
                        {b.status === 'generated' && (
                          <Button
                            size="xs"
                            variant="ghost"
                            iconOnly
                            icon={CheckCircle}
                            aria-label="Finalize batch"
                            className="text-[var(--icon-green-text)]"
                            disabled={processingId === b.id}
                            onClick={() => handleFinalize(b.id)}
                          />
                        )}
                        {b.status === 'generated' && (
                          <Button
                            size="xs"
                            variant="dangerSoft"
                            iconOnly
                            icon={Trash2}
                            aria-label="Delete batch"
                            disabled={processingId === b.id}
                            onClick={() => setDeleteId(b.id)}
                          />
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
      </Card>

      {/* Pagination */}
      {totalBatchPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="secondary" size="sm" iconOnly icon={ChevronsLeft} aria-label="First page" disabled={page === 1} onClick={() => setPage(1)} />
          <Button variant="secondary" size="sm" iconOnly icon={ChevronLeft} aria-label="Previous page" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} />
          <span className="text-sm text-[var(--text-secondary)]">Page {page} of {totalBatchPages} · {shownBatchCount} batches</span>
          <Button variant="secondary" size="sm" iconOnly icon={ChevronRight} aria-label="Next page" disabled={page === totalBatchPages} onClick={() => setPage((p) => Math.min(totalBatchPages, p + 1))} />
          <Button variant="secondary" size="sm" iconOnly icon={ChevronsRight} aria-label="Last page" disabled={page === totalBatchPages} onClick={() => setPage(totalBatchPages)} />
        </div>
      )}

      {/* ── Create batch (month) modal ─────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-xl max-w-2xl w-full border border-[var(--border-color)] shadow-xl">
            <div className="border-b border-[var(--border-color)] px-5 py-3 flex justify-between items-center">
              <h3 className="font-bold text-lg">Generate monthly batch</h3>
              <Button variant="ghost" iconOnly icon={XCircle} aria-label="Close" onClick={() => setShowCreate(false)} />
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-[var(--text-secondary)]">
                The batch takes <strong>finalized, un-batched</strong> claims whose visit happened in
                the selected month. Claims are not picked by hand.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Insurance type">
                  <FilterSelect
                    className="w-full"
                    value={formType}
                    onChange={(value) => { setFormType(value as InsuranceType); setFormProviderId(''); setFormCorporateId(''); }}
                    options={[
                      { value: 'nhis', label: 'NHIS' },
                      { value: 'private', label: 'Private' },
                      { value: 'corporate', label: 'Corporate' },
                    ]}
                  />
                </Field>
                <Field label="Description (optional)">
                  <input
                    type="text"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder={`e.g. ${periodName(formYear, formMonth)} ${typeLabel(formType)} batch`}
                    className={cn(INPUT, 'w-full')}
                  />
                </Field>
                <Field label="Month">
                  <FilterSelect
                    className="w-full"
                    value={String(formMonth)}
                    onChange={(value) => setFormMonth(Number(value))}
                    options={MONTH_NAMES.map((m, i) => ({ value: String(i + 1), label: m }))}
                  />
                </Field>
                <Field label="Year">
                  <FilterSelect
                    className="w-full"
                    value={String(formYear)}
                    onChange={(value) => setFormYear(Number(value))}
                    options={yearOptions().map((y) => ({ value: String(y), label: String(y) }))}
                  />
                </Field>
                {formType !== 'corporate' && (
                  <div className="col-span-2">
                    <Field label="Insurance provider" required={formType === 'private'}>
                      <FilterSelect
                        className="w-full"
                        value={formProviderId}
                        onChange={setFormProviderId}
                        options={[
                          {
                            value: '',
                            label: formType === 'private'
                              ? 'Choose a provider'
                              : 'All NHIS providers (auto-selects when only one exists)',
                          },
                          ...providerOptions.map((p: any) => ({ value: p.id, label: p.name })),
                        ]}
                      />
                    </Field>
                  </div>
                )}
                {formType === 'corporate' && (
                  <div className="col-span-2">
                    <Field label="Corporate account" required hint={corporateAccounts.length ? undefined : 'No active corporate accounts found.'}>
                      <FilterSelect
                        className="w-full"
                        value={formCorporateId}
                        onChange={setFormCorporateId}
                        options={[
                          { value: '', label: 'Choose an account' },
                          ...corporateAccounts.map((a) => ({ value: a.id, label: a.companyName })),
                        ]}
                      />
                    </Field>
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] p-3">
                <p className="text-xs font-medium mb-2 text-[var(--text-secondary)]">
                  Claims a {typeLabel(formType)} batch would take from {periodName(formYear, formMonth)}
                </p>
                {eligibleLoading ? (
                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <Loader className="w-3 h-3 animate-spin" /> Loading…
                  </div>
                ) : eligibleError ? (
                  <p className="text-xs text-[var(--icon-red-text)]">{eligibleError}</p>
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
                  <p className="text-xs text-[var(--icon-red-text)]">Could not load the month’s claims</p>
                )}
              </div>

              <div className="flex gap-3 pt-3 border-t border-[var(--border-color)]">
                <Button
                  className="flex-1"
                  variant="primary"
                  loading={processingId === '__create__'}
                  disabled={!canGenerate}
                  onClick={handleCreate}
                >
                  {`Generate ${typeLabel(formType)} batch (${eligibleForFormType})`}
                </Button>
                <Button onClick={() => setShowCreate(false)}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── View batch modal ───────────────────────────────────── */}
      {viewing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-xl max-w-4xl w-full max-h-[85vh] overflow-y-auto border border-[var(--border-color)] shadow-xl">
            <div className="sticky top-0 bg-[var(--bg-card)] border-b border-[var(--border-color)] px-5 py-3 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">{viewing.batchNumber}</h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  {periodName(viewing.periodYear, viewing.periodMonth)} · {typeLabel(viewing.insuranceType)}
                </p>
              </div>
              <Button variant="ghost" iconOnly icon={XCircle} aria-label="Close" onClick={() => setViewing(null)} />
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pb-4 border-b border-[var(--border-color)] text-sm">
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
                <h4 className="text-sm font-semibold mb-2">Claims ({viewing.claims?.length ?? 0})</h4>
                <div className="border border-[var(--border-color)] rounded-lg overflow-x-auto max-h-80 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0">
                      <tr className={TH_ROW}>
                        <th className={cn(TH, 'px-3 py-2')}>Claim #</th>
                        <th className={cn(TH, 'px-3 py-2')}>Visit</th>
                        <th className={cn(TH, 'px-3 py-2')}>Patient</th>
                        <th className={cn(TH, 'px-3 py-2')}>Status</th>
                        <th className={cn(TH, 'px-3 py-2 text-right')}>Amount</th>
                        <th className={cn(TH, 'px-3 py-2 text-right')}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(viewing.claims ?? []).map((c: any) => (
                        <tr key={c.id} className={TR}>
                          <td className="px-3 py-2 font-mono text-xs text-[var(--text-primary)]">{c.claimNumber}</td>
                          <td className="px-3 py-2 text-xs text-[var(--text-primary)]">
                            {shortDate(c.Attendance?.dateTime ?? c.attendance?.dateTime)}
                          </td>
                          <td className="px-3 py-2 text-sm text-[var(--text-primary)]">
                            {(c.Patient?.surname ?? c.patient?.surname ?? '')} {(c.Patient?.otherNames ?? c.patient?.otherNames ?? '')}
                          </td>
                          <td className="px-3 py-2">
                            <Badge tone={statusTone(c.status)} size="sm" dot>{humanStatus(c.status)}</Badge>
                          </td>
                          <td className="px-3 py-2 text-right text-sm text-[var(--text-primary)]">{money(c.totalClaimAmount)}</td>
                          <td className="px-3 py-2 text-right">
                            <Link
                              to={`/dashboard/insurance/claims/${c.id}/edit`}
                              className="text-xs text-[var(--icon-cyan-text)] hover:underline inline-flex items-center gap-1"
                            >
                              <LinkIcon className="w-3 h-3" />
                              Open claim
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-[var(--border-color)] bg-[var(--bg-main)]">
                        <td className="px-3 py-2 text-xs font-medium text-[var(--text-primary)]" colSpan={4}>
                          Sum of the claims in this batch
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-[var(--text-primary)]">
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
                    <p className="text-[11px] text-[var(--icon-orange-text)] mt-1">
                      The claims no longer add up to the batch total on record — finalize the batch to
                      recompute it.
                    </p>
                  )}
              </div>

              {viewing.insuranceType === 'nhis' && (
                <div className="pt-3 border-t border-[var(--border-color)]">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="text-sm font-semibold text-[var(--text-primary)]">CLAIM-it</h4>
                    {canSendToClaimIt && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="soft"
                          accent="green"
                          icon={Send}
                          loading={claimitBusy === viewing.id}
                          onClick={() => handleSendBatch(viewing)}
                        >
                          Send {viewing.totalClaims} claims
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={claimitBusy === viewing.id}
                          title="Re-send only the claims CLAIM-it rejected or could not confirm"
                          onClick={() => handleSendBatch(viewing, { onlyFailed: true })}
                        >
                          Retry rejected
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="mt-2">
                    <ClaimItStatusNote status={claimitStatus} />
                    {claimitError && <p className="text-xs text-[var(--icon-red-text)] mt-1">{claimitError}</p>}
                  </div>

                  {claimitResult && claimitResult.batchId === viewing.id && (
                    <div className="mt-3 border border-[var(--border-color)] rounded-lg p-3 bg-[var(--bg-main)]">
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
                    <Button
                      size="xs"
                      variant="ghost"
                      className="mt-3 text-[var(--icon-red-text)] underline"
                      disabled={claimitBusy === viewing.id}
                      onClick={() => handleWithdrawPeriod(viewing)}
                    >
                      Delete this month from CLAIM-it
                    </Button>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-3 border-t border-[var(--border-color)] flex-wrap">
                {viewing.insuranceType === 'nhis' && (
                  <Button className="flex-1" variant="soft" accent="purple" icon={Download} onClick={() => handleDownloadXml(viewing.id)}>
                    Download NHIS XML
                  </Button>
                )}
                <Button className="flex-1" variant="primary" icon={Printer} onClick={() => handlePrint(viewing.id)}>
                  Print batch summary
                </Button>
                {viewing.status === 'generated' && (
                  <Button
                    className="flex-1"
                    variant="soft"
                    accent="green"
                    disabled={processingId === viewing.id}
                    onClick={() => handleFinalize(viewing.id)}
                  >
                    Finalize batch
                  </Button>
                )}
                <Button onClick={() => setViewing(null)}>Close</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm ─────────────────────────────────────── */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-xl p-6 max-w-md w-full border border-[var(--border-color)] shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--icon-red-bg)', color: 'var(--icon-red-text)' }}>
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Delete batch</h3>
                <p className="text-sm text-[var(--text-secondary)]">Only generated batches can be deleted.</p>
              </div>
            </div>
            <p className="mb-6 text-sm">
              The claims in this batch return to "finalized, un-batched" and the next batch for their
              month will pick them up again.
            </p>
            <div className="flex gap-3">
              <Button className="flex-1" onClick={() => setDeleteId(null)}>Cancel</Button>
              <Button
                className="flex-1"
                variant="danger"
                loading={processingId === deleteId}
                onClick={handleDelete}
              >
                Delete
              </Button>
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
