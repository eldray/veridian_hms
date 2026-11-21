import { Prisma, PrismaClient } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { ConflictError, NotFoundError, ValidationError } from '../../utils/errors';
import { InsuranceClaimRepository } from './InsuranceClaimRepository';
import { money } from '../../utils/reportDates';
import { getCounterService } from '../../services/CounterService';
import { NHISClaimXMLBuilder } from './xml/NHISClaimXMLBuilder';
import * as fs from 'fs';
import * as path from 'path';

export interface GenerateBatchInput {
  insuranceType: 'nhis' | 'private' | 'corporate';
  periodYear: number;
  periodMonth: number;
  insuranceProviderId?: string;
  corporateAccountId?: string;
  description?: string;
}

const BATCH_OUTPUT_DIR = path.resolve(process.cwd(), 'uploads', 'claim-batches');

const PERIOD_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export class ClaimBatchService extends BaseService {
  private repo: InsuranceClaimRepository;
  private prisma: PrismaClient;
  private xmlBuilder: NHISClaimXMLBuilder;

  constructor(prisma: PrismaClient) {
    super('ClaimBatchService');
    this.prisma = prisma;
    this.repo = new InsuranceClaimRepository(prisma);
    this.xmlBuilder = new NHISClaimXMLBuilder();
  }

  // ==========================================
  // LISTING
  // ==========================================
  async listBatches(filters: any) {
    // The page size only limits the rows returned. The summary the screen shows is the whole
    // filter, which is the difference between "this month held GHS 41,200" and a total that
    // quietly stops at whatever fell inside the first page.
    return this.repo.findBatchesPaginated({
      ...filters,
      limit: Math.min(filters.limit ?? 20, 100),
    });
  }

  async getBatch(batchId: string) {
    const batch = await this.repo.findBatchById(batchId);
    if (!batch) throw new NotFoundError('Claim batch', batchId);
    return batch;
  }

  // ==========================================
  // TRACKING & PAYMENTS (batch level)
  // ==========================================

  /**
   * What the payer owes for the period, derived from the batch's own events.
   *
   * The reconciliation is against `totalAmount` — the amount submitted for the month — because
   * that is the figure the remittance answers. Individual claims are deliberately not tracked.
   */
  private summarizeTracking(batch: any) {
    const events = batch.trackingEvents || [];
    const submitted = Number(batch.totalAmount || 0);
    const paid = events.filter((event: any) => event.eventType === 'payment')
      .reduce((sum: number, event: any) => sum + Number(event.amount || 0), 0);
    const latestAdjudication = [...events].reverse().find((event: any) => event.eventType === 'adjudication');
    const status = String(latestAdjudication?.status || '').toLowerCase();
    const hasAmount = ['approved', 'partially_approved'].includes(status) && latestAdjudication?.amount != null;
    const adjudicated = hasAmount ? Number(latestAdjudication.amount) : null;
    const payable = status === 'rejected' ? (latestAdjudication?.amount != null ? Number(latestAdjudication.amount) : 0) : (hasAmount ? Number(adjudicated) : submitted);
    const outstanding = Math.max(0, payable - paid);
    const overpaid = Math.max(0, paid - payable);
    const submission = events.find((event: any) => event.eventType === 'submission');
    const resubmissions = events.filter((event: any) => event.eventType === 'resubmission');
    const latestResubmission = resubmissions[resubmissions.length - 1] || null;
    return { amountSubmitted: submitted, amountAdjudicated: adjudicated, amountPayable: payable, totalPaid: paid, outstanding, overpaid,
      latestStatus: overpaid > 0 ? 'overpaid' : paid >= payable && paid > 0 ? 'paid' : paid > 0 ? 'partially_paid' : (latestAdjudication?.status || (submission ? 'submitted' : 'not_submitted')),
      submittedAt: submission?.submissionDate || submission?.createdAt || batch.finalizedAt || null,
      resubmissionCount: resubmissions.length,
      latestResubmissionAt: latestResubmission?.submissionDate || latestResubmission?.createdAt || null,
    };
  }
  async listBatchTracking(filters: any) {
    const result = await this.repo.findBatchesForTracking({
      ...filters,
      limit: Math.min(filters.limit ?? 20, 100),
    });
    return {
      ...result,
      data: result.data.map((batch: any) => ({ ...batch, tracking: this.summarizeTracking(batch) })),
    };
  }

  async recordBatchTrackingEvent(
    batchId: string,
    input: {
      eventType: string;
      status?: string;
      submissionDate?: string;
      payerReference?: string;
      amount?: number | string;
      paymentReference?: string;
      paymentMethod?: string;
      notes?: string;
    },
    userId: string,
  ) {
    const allowedTypes = ['submission', 'resubmission', 'adjudication', 'payment', 'note'];
    if (!allowedTypes.includes(String(input.eventType))) {
      throw new ValidationError('Invalid tracking event type');
    }
    const batch = await this.prisma.claimBatch.findUnique({
      where: { id: batchId },
      select: { id: true, batchNumber: true, status: true, totalAmount: true },
    });
    if (!batch) throw new NotFoundError('Claim batch', batchId);
    if (batch.status !== 'finalized') {
      throw new ValidationError('Only finalized batches can be tracked for submission or remittance');
    }

    if (input.eventType === 'payment') {
      const numericAmount = Number(input.amount);
      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        throw new ValidationError('Payment amount must be greater than zero');
      }
      const paymentReference = String(input.paymentReference || '').trim();
      if (!paymentReference) {
        throw new ValidationError('A payer remittance/payment reference is required to prevent duplicate entries');
      }
      try {
        return await this.prisma.$transaction(async (tx: any) => {
          await tx.$queryRaw`SELECT "id" FROM "claim_batches" WHERE "id" = ${batch.id} FOR UPDATE`;
          const existing = await tx.claimBatchTrackingEvent.findMany({
            where: { batchId: batch.id, eventType: 'payment' }, select: { amount: true },
          });
          const paid = existing.reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0);
          const adjudications = await tx.claimBatchTrackingEvent.findMany({
            where: { batchId: batch.id, eventType: 'adjudication' },
            orderBy: { createdAt: 'desc' }, take: 1, select: { status: true, amount: true },
          });
          const latest = adjudications[0];
          const latestStatus = String(latest?.status || '').toLowerCase();
          const paymentLimit = latestStatus === 'rejected' ? (latest?.amount != null ? Number(latest.amount) : 0) : (['approved', 'partially_approved'].includes(latestStatus) && latest?.amount != null ? Number(latest.amount) : Number(batch.totalAmount));
          if (paid + numericAmount > paymentLimit + 0.005) {
            throw new ValidationError(
              `Payment exceeds the ₵${paymentLimit.toFixed(2)} approved limit for ${batch.batchNumber}. Check the remittance and the payments already recorded.`,
            );
          }
          return tx.claimBatchTrackingEvent.create({
            data: {
              batchId: batch.id,
              eventType: 'payment',
              amount: numericAmount,
              paymentReference,
              paymentMethod: input.paymentMethod ? String(input.paymentMethod).trim() : null,
              payerReference: input.payerReference ? String(input.payerReference).trim() : null,
              notes: input.notes ? String(input.notes).trim() : null,
              recordedById: userId,
            },
          });
        });
      } catch (error: any) {
        if (error?.code === 'P2002' || /unique constraint/i.test(String(error?.message))) {
          throw new ConflictError('This payment reference has already been recorded for the batch');
        }
        throw error;
      }
    }

    if (['submission', 'resubmission'].includes(input.eventType) && !String(input.payerReference || '').trim()) {
      throw new ValidationError('Enter the payer submission/resubmission reference');
    }
    if (['submission', 'resubmission'].includes(input.eventType) && input.submissionDate
      && Number.isNaN(new Date(input.submissionDate).getTime())) {
      throw new ValidationError('Submission or resubmission date is invalid');
    }
    const allowedStatuses = ['acknowledged', 'under_review', 'queried', 'approved', 'partially_approved', 'rejected'];
    if (input.eventType === 'adjudication'
      && !allowedStatuses.includes(String(input.status || '').trim().toLowerCase())) {
      throw new ValidationError('Choose a valid payer adjudication status');
    }
    // Record the payer's adjudicated value when supplied (especially partial
    // approvals); otherwise the event is still useful as a status-only update.
    if (input.eventType === 'adjudication' && input.amount != null) {
      const adjudicatedAmount = Number(input.amount);
      if (!Number.isFinite(adjudicatedAmount) || adjudicatedAmount < 0
        || adjudicatedAmount > Number(batch.totalAmount) + 0.005) {
        throw new ValidationError('Adjudicated amount must be zero or more and cannot exceed the submitted batch amount');
      }
    }

    const eventData = {
      batchId: batch.id,
      eventType: String(input.eventType),
      status: input.status ? String(input.status).trim().toLowerCase() : null,
      submissionDate: input.submissionDate ? new Date(input.submissionDate) : (['submission', 'resubmission'].includes(input.eventType) ? new Date() : null),
      payerReference: input.payerReference ? String(input.payerReference).trim() : null,
      amount: input.eventType === 'adjudication' && input.amount != null ? Number(input.amount) : null,
      notes: input.notes ? String(input.notes).trim() : null,
      recordedById: userId,
    };
    if (input.eventType === 'adjudication') {
      return this.prisma.$transaction(async (tx: any) => {
        await tx.$queryRaw`SELECT "id" FROM "claim_batches" WHERE "id" = ${batch.id} FOR UPDATE`;
        return tx.claimBatchTrackingEvent.create({ data: eventData });
      });
    }
    return this.prisma.claimBatchTrackingEvent.create({ data: eventData });
  }
  // ==========================================
  // GENERATE
  // ==========================================
  async generateBatch(input: GenerateBatchInput, userId: string) {
    const { insuranceType, periodYear, periodMonth } = input;

    if (!['nhis', 'private', 'corporate'].includes(insuranceType)) {
      throw new ValidationError('insuranceType must be nhis, private, or corporate');
    }
    this.assertPeriod(periodYear, periodMonth);
    this.assertPeriodClosed(periodYear, periodMonth);

    let insuranceProviderId = input.insuranceProviderId ?? null;
    const corporateAccountId = input.corporateAccountId ?? null;

    // Every batch represents one closed service month for one payer. NHIS and
    // private claims must be scoped to an explicit provider. Corporate claims
    // are scoped to one employer account and its contracted provider.
    if (insuranceType === 'nhis' || insuranceType === 'private') {
      if (!insuranceProviderId) {
        throw new ValidationError(`insuranceProviderId is required for ${insuranceType} monthly batches`);
      }
      const provider = await this.prisma.insuranceProvider.findUnique({
        where: { id: insuranceProviderId },
        select: { id: true, type: true, isActive: true, name: true },
      });
      if (!provider) throw new NotFoundError('Insurance provider', insuranceProviderId);
      if (provider.type !== insuranceType) {
        throw new ValidationError(`Provider "${provider.name}" is not a ${insuranceType} provider`);
      }
      if (!provider.isActive) throw new ValidationError('The selected insurance provider is inactive');
    }

    if (insuranceType === 'corporate') {
      if (!corporateAccountId) {
        throw new ValidationError('corporateAccountId is required. Corporate batches are generated per employer account and month.');
      }
      const account = await this.prisma.corporateAccount.findUnique({
        where: { id: corporateAccountId },
        select: { id: true, isActive: true, insuranceProviderId: true, companyName: true },
      });
      if (!account) throw new NotFoundError('Corporate account', corporateAccountId);
      if (!account.isActive) throw new ValidationError('Corporate account is inactive');
      if (!account.insuranceProviderId) {
        throw new ValidationError('Configure an insurance provider on this corporate account before generating a claim batch');
      }
      if (insuranceProviderId && insuranceProviderId !== account.insuranceProviderId) {
        throw new ValidationError('The selected insurance provider does not match this corporate account');
      }
      insuranceProviderId = account.insuranceProviderId;
    }

    const claims = await this.repo.findEligibleClaimsForBatch(
      insuranceType,
      periodYear,
      periodMonth,
      insuranceProviderId,
      corporateAccountId,
    );
    if (!claims.length) {
      throw new ValidationError(
        `No finalized unbatched ${insuranceType} claims found for ${periodYear}-${String(periodMonth).padStart(2, '0')} and the selected payer`,
      );
    }

    const empty = claims.filter((claim) => !claim.items?.length);
    if (empty.length) {
      throw new ValidationError(
        `${empty.length} claim(s) have no items and cannot be batched (first: ${empty[0].claimNumber})`,
      );
    }

    // NHIS claims without a priced G-DRG package remain outside the monthly
    // submission until corrected. All coded claims for this provider/month are
    // placed together in one batch, regardless of MDC/G-DRG family.
    const uncoded = insuranceType === 'nhis'
      ? claims.filter((claim) => !(claim.items ?? []).some(
          (item: any) => item.itemCategory === 'gdrg' && item.gdrgTariff?.mdc,
        ))
      : [];
    const batchClaims = insuranceType === 'nhis'
      ? claims.filter((claim) => !uncoded.includes(claim))
      : claims;
    if (!batchClaims.length) {
      throw new ValidationError(
        `No NHIS claims with a priced G-DRG package are ready for ${PERIOD_MONTH_NAMES[periodMonth - 1]} ${periodYear}. Correct the uncoded claims before generating this provider's monthly batch.`,
      );
    }

    const totalAmount = batchClaims.reduce(
      (sum, claim) => sum.plus(claim.totalClaimAmount),
      new Prisma.Decimal(0),
    );

    // Serialize generation by payer + service month. The database's composite
    // unique key includes nullable columns, and PostgreSQL treats NULLs as distinct;
    // the advisory lock closes that race for NHIS/private rows with no corporate account.
    const payerMonthLock = [
      'claim-batch',
      insuranceType,
      insuranceProviderId ?? 'no-provider',
      corporateAccountId ?? 'no-account',
      periodYear,
      periodMonth,
    ].join(':');
    const batchNumber = getCounterService().nextBatchNumber();
    const batch = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${payerMonthLock}))`;
      const existing = await tx.claimBatch.findFirst({
        where: {
          insuranceType: insuranceType as any,
          periodYear,
          periodMonth,
          insuranceProviderId: insuranceProviderId ?? null,
          corporateAccountId: corporateAccountId ?? null,
        },
        orderBy: { createdAt: 'asc' },
      });
      if (existing) {
        const periodLabel = `${PERIOD_MONTH_NAMES[periodMonth - 1]} ${periodYear}`;
        const isLegacyFamilyBatch = Boolean(existing.claimFamily && existing.claimFamily !== 'ALL');
        throw new ConflictError(
          isLegacyFamilyBatch
            ? `A legacy ${insuranceType} ${existing.claimFamily} batch already exists for this payer in ${periodLabel} (${existing.batchNumber}). Its submission and payment history will not be merged automatically; reconcile the existing batch before creating a single monthly batch.`
            : `A ${insuranceType} monthly batch already exists for this payer in ${periodLabel} (${existing.batchNumber}). Delete it if it is still unfinalized, or reconcile the existing monthly submission.`,
        );
      }

      return tx.claimBatch.create({
        data: {
          batchNumber,
          insuranceType,
          insuranceProviderId,
          corporateAccountId,
          claimFamily: 'ALL',
          periodYear,
          periodMonth,
          totalClaims: batchClaims.length,
          totalAmount,
          status: 'generated',
          description: input.description ?? null,
          createdById: userId,
          claims: { connect: batchClaims.map((claim) => ({ id: claim.id })) },
        },
        include: {
          insuranceProvider: true,
          corporateAccount: true,
          createdBy: { select: { id: true, fullName: true, username: true } },
          claims: {
            include: {
              Patient: true,
              Attendance: { include: { Admission: true } },
              items: { orderBy: { itemNumber: 'asc' } },
            },
          },
        },
      });
    });

    this.logInfo('Monthly claim batch generated', {
      batchId: batch.id,
      batchNumber,
      insuranceType,
      insuranceProviderId,
      corporateAccountId,
      periodYear,
      periodMonth,
      totalClaims: batchClaims.length,
      heldBackUncoded: uncoded.length,
    });

    if (insuranceType === 'nhis') {
      try {
        const xml = await this.buildNHISBatchXml(batch.id);
        await fs.promises.mkdir(BATCH_OUTPUT_DIR, { recursive: true });
        const filePath = path.join(BATCH_OUTPUT_DIR, `${batchNumber}.xml`);
        await fs.promises.writeFile(filePath, xml, 'utf-8');
        await this.prisma.claimBatch.update({
          where: { id: batch.id },
          data: { xmlFilePath: filePath },
        });
      } catch (err: any) {
        this.logError('NHIS monthly batch XML generation failed', err, { batchId: batch.id });
        throw new Error(
          `Batch ${batchNumber} was created but XML generation failed: ${err.message}. Fix the issue and download the XML again.`,
        );
      }
    }

    return { batches: [batch], heldBackUncoded: uncoded.length };
  }

  // ==========================================
  // FINALIZE
  // ==========================================
  async finalizeBatch(batchId: string, userId: string) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const batch = await tx.claimBatch.findUnique({
        where: { id: batchId },
        include: {
          claims: {
            select: {
              id: true,
              claimNumber: true,
              status: true,
              batchId: true,
              totalClaimAmount: true,
              items: { select: { id: true } },
            },
          },
        },
      });
      if (!batch) throw new NotFoundError('Claim batch', batchId);
      if (batch.status !== 'generated') {
        throw new ConflictError('Only generated batches can be finalized');
      }
      if (!batch.claims.length) {
        throw new ValidationError('An empty claim batch cannot be finalized.');
      }

      for (const claim of batch.claims) {
        if (claim.status !== 'finalized') {
          throw new ValidationError(`Claim ${claim.claimNumber} is not finalized.`);
        }
        if (claim.batchId !== batch.id) {
          throw new ValidationError(`Claim ${claim.claimNumber} is not linked to this batch.`);
        }
        if (!claim.items.length) {
          throw new ValidationError(`Claim ${claim.claimNumber} has no itemized lines and cannot be finalized in a batch.`);
        }
      }

      const totalAmount = batch.claims.reduce(
        (sum, claim) => sum.plus(claim.totalClaimAmount),
        new Prisma.Decimal(0),
      );
      const result = await tx.claimBatch.updateMany({
        where: { id: batchId, status: 'generated' },
        data: {
          status: 'finalized',
          totalClaims: batch.claims.length,
          totalAmount,
          finalizedAt: new Date(),
          finalizedById: userId,
        },
      });
      if (result.count !== 1) {
        throw new ConflictError('The batch status changed while it was being finalized. Refresh and try again.');
      }
      return tx.claimBatch.findUniqueOrThrow({ where: { id: batchId } });
    });

    this.logInfo('Claim batch finalized', {
      batchId,
      batchNumber: updated.batchNumber,
    });
    return updated;
  }

  // ==========================================
  // DELETE (generated only)
  // ==========================================
  async deleteBatch(batchId: string) {
    return this.prisma.$transaction(async (tx) => {
      const batch = await tx.claimBatch.findUnique({
        where: { id: batchId },
      });
      if (!batch) throw new NotFoundError('Claim batch', batchId);
      if (batch.status !== 'generated') {
        throw new ConflictError('Only generated batches can be deleted');
      }

      // Unlink claims — they return to "finalized, not batched" so they can
      // be picked up by a fresh batch.
      await tx.insuranceClaim.updateMany({
        where: { batchId },
        data: { batchId: null },
      });

      // Delete XML file if present
      if (batch.xmlFilePath) {
        try {
          await fs.promises.unlink(batch.xmlFilePath);
        } catch {
          // swallow — file may already be gone
        }
      }

      await tx.claimBatch.delete({ where: { id: batchId } });

      this.logInfo('Claim batch deleted', {
        batchId,
        batchNumber: batch.batchNumber,
      });
      return { deleted: true, batchNumber: batch.batchNumber };
    });
  }

  async eligibleForPeriod(
    periodYear: number,
    periodMonth: number,
    scope: { insuranceProviderId?: string | null; corporateAccountId?: string | null } = {},
  ) {
    this.assertPeriod(periodYear, periodMonth);

    // Deliberately the same query that fills a batch: the preview is a promise about what
    // "Generate" will do, and it was previously a second, disagreeing copy of that rule.
    const byType = await this.repo.summarizeBatchableByType(periodYear, periodMonth, scope);
    const types = ['nhis', 'private', 'corporate'] as const;

    // The preview uses the same provider-scoped claim set as generation.
    // NHIS package-less claims are visible as held back, not mixed into the batch total.
    let nhisClaims: any[] = [];
    if (!scope.corporateAccountId) {
      if (!scope.insuranceProviderId) {
        nhisClaims = await this.repo.findEligibleClaimsForBatch('nhis', periodYear, periodMonth, null, null);
      } else {
        const selectedProvider = await this.prisma.insuranceProvider.findUnique({
          where: { id: scope.insuranceProviderId },
          select: { type: true },
        });
        if (selectedProvider?.type === 'nhis') {
          nhisClaims = await this.repo.findEligibleClaimsForBatch(
            'nhis', periodYear, periodMonth, scope.insuranceProviderId, null,
          );
        }
      }
    }
    const nhisCoded = nhisClaims.filter((claim) => (claim.items ?? []).some(
      (item: any) => item.itemCategory === 'gdrg' && item.gdrgTariff?.mdc,
    ));
    const nhisUncoded = nhisClaims.length - nhisCoded.length;
    byType.nhis.count = nhisCoded.length;
    byType.nhis.amount = money(nhisCoded.reduce(
      (sum, claim) => sum.plus(claim.totalClaimAmount),
      new Prisma.Decimal(0),
    ));

    return {
      periodYear,
      periodMonth,
      // The preview screen offers "Generate" alongside these numbers. Telling it whether the month
      // has ended lets the form say why the button is off, instead of letting the click fail.
      periodIsClosed: this.isPeriodClosed(periodYear, periodMonth),
      lastClosedPeriod: ClaimBatchService.lastClosedPeriod(),
      ...types.reduce((acc, type) => {
        acc[type] = byType[type].count;
        return acc;
      }, {} as Record<(typeof types)[number], number>),
      totalAmount: types.reduce((acc, type) => {
        acc[type] = byType[type].amount;
        return acc;
      }, {} as Record<(typeof types)[number], number>),
      // Which payer each figure belongs to, so the provider list can show its own count instead
      // of repeating the type total against every name.
      byProvider: await this.repo.summarizeBatchableByProvider(periodYear, periodMonth),
      // Claims without a G-DRG package remain unbatched until coded.
      nhisUncoded,
      overall: {
        count: types.reduce((sum, type) => sum + byType[type].count, 0),
        totalAmount: money(types.reduce((sum, type) => sum + byType[type].amount, 0)),
      },
    };
  }

  /**
   * Every claim of one month — batched or not — with the month's totals, for the batching
   * screen's period view. Reading the whole month must not depend on a batch existing yet.
   */
  async claimsForPeriod(
    periodYear: number,
    periodMonth: number,
    options: { insuranceType?: string; batched?: string; page?: number; limit?: number } = {},
  ) {
    this.assertPeriod(periodYear, periodMonth);

    const insuranceType = options.insuranceType && options.insuranceType !== 'all'
      ? options.insuranceType
      : undefined;
    if (insuranceType && !['nhis', 'private', 'corporate'].includes(insuranceType)) {
      throw new ValidationError('insuranceType must be nhis, private, or corporate');
    }
    const batched = options.batched && options.batched !== 'all' ? options.batched : undefined;
    if (batched && !['batched', 'unbatched'].includes(batched)) {
      throw new ValidationError('batched must be batched or unbatched');
    }

    return this.repo.findClaimsForPeriod(periodYear, periodMonth, {
      insuranceType,
      batched,
      page: options.page ?? 1,
      limit: options.limit ?? 50,
    });
  }

  private assertPeriod(periodYear: number, periodMonth: number) {
    if (!Number.isInteger(periodMonth) || periodMonth < 1 || periodMonth > 12) {
      throw new ValidationError('periodMonth must be 1–12');
    }
    if (!Number.isInteger(periodYear) || periodYear < 2000 || periodYear > 2100) {
      throw new ValidationError('periodYear is out of range');
    }
  }

  /**
   * A period can only be batched once it has ended.
   *
   * Claims belong to the month of the visit, so a batch built mid-month misses every visit still to
   * come in that month — and the payer treats the second batch for the same month as a duplicate
   * submission. Reading a month that is still open stays allowed; only sending it is not.
   */
  private assertPeriodClosed(periodYear: number, periodMonth: number) {
    if (this.isPeriodClosed(periodYear, periodMonth)) return;
    const lastClosed = ClaimBatchService.lastClosedPeriod();
    throw new ValidationError(
      `${PERIOD_MONTH_NAMES[periodMonth - 1]} ${periodYear} has not ended yet. A batch can only be ` +
      `generated for a month that has passed — batch ${PERIOD_MONTH_NAMES[lastClosed.periodMonth - 1]} ` +
      `${lastClosed.periodYear} instead.`,
    );
  }

  private static lastClosedPeriod(reference = new Date()) {
    const year = reference.getFullYear();
    const month = reference.getMonth() + 1;
    return month === 1 ? { periodYear: year - 1, periodMonth: 12 } : { periodYear: year, periodMonth: month - 1 };
  }

  isPeriodClosed(periodYear: number, periodMonth: number, reference = new Date()) {
    const currentYear = reference.getFullYear();
    const currentMonth = reference.getMonth() + 1;
    return periodYear < currentYear || (periodYear === currentYear && periodMonth < currentMonth);
  }

  /** The most recent month a batch may be generated for, for the UI to default to. */
  lastClosedPeriod(reference = new Date()) {
    return ClaimBatchService.lastClosedPeriod(reference);
  }

  // ==========================================
  // XML (NHIS only)
  // ==========================================
  async buildNHISBatchXml(batchId: string): Promise<string> {
    const batch = await this.repo.findBatchById(batchId);
    if (!batch) throw new NotFoundError('Claim batch', batchId);
    if (batch.insuranceType !== 'nhis') {
      throw new ValidationError('Only NHIS batches produce XML');
    }

    const hospital = await this.prisma.hospital.findFirst();
    if (!hospital) throw new ValidationError('Hospital record not found');

    const xml = this.xmlBuilder.buildBatchXml(batch, hospital);

    this.logInfo('NHIS batch XML built', {
      batchId,
      batchNumber: batch.batchNumber,
      claimCount: batch.claims.length,
    });
    return xml;
  }

  async getNHISBatchXml(batchId: string): Promise<{ xml: string; filename: string }> {
    const batch = await this.prisma.claimBatch.findUnique({
      where: { id: batchId },
    });
    if (!batch) throw new NotFoundError('Claim batch', batchId);
    if (batch.insuranceType !== 'nhis') {
      throw new ValidationError('Only NHIS batches produce XML');
    }

    // Prefer the file on disk (it was written at generation time and is stable)
    if (batch.xmlFilePath && fs.existsSync(batch.xmlFilePath)) {
      const xml = await fs.promises.readFile(batch.xmlFilePath, 'utf-8');
      return { xml, filename: `${batch.batchNumber}.xml` };
    }

    // Fall back to regenerating on the fly
    const xml = await this.buildNHISBatchXml(batchId);
    return { xml, filename: `${batch.batchNumber}.xml` };
  }
  
}