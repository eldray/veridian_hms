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
    const paid = events
      .filter((event: any) => event.eventType === 'payment')
      .reduce((sum: number, event: any) => sum + Number(event.amount || 0), 0);
    const latestAdjudication = [...events].reverse().find((event: any) => event.eventType === 'adjudication')?.status;
    const submission = events.find((event: any) => event.eventType === 'submission');
    return {
      amountSubmitted: submitted,
      totalPaid: paid,
      outstanding: Math.max(0, submitted - paid),
      latestStatus: paid >= submitted && paid > 0
        ? 'paid'
        : paid > 0
          ? 'partially_paid'
          : (latestAdjudication || (submission ? 'submitted' : 'not_submitted')),
      submittedAt: submission?.submissionDate || submission?.createdAt || batch.finalizedAt || null,
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
    const allowedTypes = ['submission', 'adjudication', 'payment', 'note'];
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
          if (paid + numericAmount > Number(batch.totalAmount) + 0.005) {
            throw new ValidationError(
              `Payment exceeds the ₵${Number(batch.totalAmount).toFixed(2)} submitted for ${batch.batchNumber}. Check the remittance and the payments already recorded.`,
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

    if (input.eventType === 'submission' && !String(input.payerReference || '').trim()) {
      throw new ValidationError('Enter the payer submission/batch reference where available');
    }
    if (input.eventType === 'submission' && input.submissionDate
      && Number.isNaN(new Date(input.submissionDate).getTime())) {
      throw new ValidationError('Submission date is invalid');
    }
    const allowedStatuses = ['acknowledged', 'under_review', 'queried', 'approved', 'partially_approved', 'rejected'];
    if (input.eventType === 'adjudication'
      && !allowedStatuses.includes(String(input.status || '').trim().toLowerCase())) {
      throw new ValidationError('Choose a valid payer adjudication status');
    }

    return this.prisma.claimBatchTrackingEvent.create({
      data: {
        batchId: batch.id,
        eventType: String(input.eventType),
        status: input.status ? String(input.status).trim().toLowerCase() : null,
        submissionDate: input.submissionDate
          ? new Date(input.submissionDate)
          : (input.eventType === 'submission' ? new Date() : null),
        payerReference: input.payerReference ? String(input.payerReference).trim() : null,
        notes: input.notes ? String(input.notes).trim() : null,
        recordedById: userId,
      },
    });
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

    let insuranceProviderId = input.insuranceProviderId ?? null;
    const corporateAccountId = input.corporateAccountId ?? null;

    // Provider / corporate scope validation
    if (insuranceType === 'private' && !insuranceProviderId) {
      throw new ValidationError('insuranceProviderId is required for private batches');
    }
    if (insuranceType === 'corporate') {
      if (!corporateAccountId && !insuranceProviderId) {
        throw new ValidationError(
          'corporateAccountId or insuranceProviderId is required for corporate batches',
        );
      }
      if (corporateAccountId) {
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
    }
    if (insuranceType === 'nhis') {
      // NHIS is a single provider nationally; if multiple nhis providers exist
      // in the DB, the caller must specify which one this batch targets.
      if (!insuranceProviderId) {
        const nhisProviders = await this.prisma.insuranceProvider.findMany({
          where: { type: 'nhis' },
          select: { id: true },
        });
        if (nhisProviders.length !== 1) {
          throw new ValidationError(
            `NHIS has ${nhisProviders.length} providers configured. Specify insuranceProviderId.`,
          );
        }
      }
    }

    // Refuse to create a duplicate for the same (type, provider, corp, period)
    const existing = await this.repo.findExistingBatch(
      insuranceType,
      periodYear,
      periodMonth,
      insuranceType === 'nhis'
        ? insuranceProviderId ?? (await this.resolveSingleNHISProvider())
        : insuranceProviderId,
      corporateAccountId,
    );
    if (existing) {
      throw new ConflictError(
        `Batch already exists for ${insuranceType} / ${periodYear}-${String(periodMonth).padStart(2, '0')} (${existing.batchNumber}). Delete it first to regenerate.`,
      );
    }

    const providerId =
      insuranceType === 'nhis'
        ? insuranceProviderId ?? (await this.resolveSingleNHISProvider())
        : insuranceProviderId;

    // Collect eligible claims
    const claims = await this.repo.findEligibleClaimsForBatch(
      insuranceType,
      periodYear,
      periodMonth,
      providerId,
      corporateAccountId,
    );
    if (!claims.length) {
      throw new ValidationError(
        `No finalized unbatched ${insuranceType} claims found for ${periodYear}-${String(periodMonth).padStart(2, '0')}`,
      );
    }

    // Sanity: every claim must have items
    const empty = claims.filter((c) => !c.items || c.items.length === 0);
    if (empty.length) {
      throw new ValidationError(
        `${empty.length} claim(s) have no items and cannot be batched (first: ${empty[0].claimNumber})`,
      );
    }

    // Totals
    const totalAmount = claims.reduce(
      (sum, c) => sum.plus(c.totalClaimAmount),
      new Prisma.Decimal(0),
    );
    const totalClaims = claims.length;

    const batchNumber = getCounterService().nextBatchNumber();

    const batch = await this.prisma.claimBatch.create({
      data: {
        batchNumber,
        insuranceType,
        insuranceProviderId: providerId,
        corporateAccountId,
        periodYear,
        periodMonth,
        totalClaims,
        totalAmount,
        status: 'generated',
        description: input.description ?? null,
        createdById: userId,
        claims: { connect: claims.map((c) => ({ id: c.id })) },
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

    this.logInfo('Claim batch generated', {
      batchId: batch.id,
      batchNumber,
      insuranceType,
      periodYear,
      periodMonth,
      totalClaims,
    });

    // NHIS → write XML file on disk immediately
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
        this.logInfo('NHIS batch XML written', { batchId: batch.id, filePath });
      } catch (err: any) {
        // XML failure must NOT roll back the batch — surface the error but
        // keep the batch so the user can retry the XML generation later.
        this.logError('NHIS batch XML generation failed', err, { batchId: batch.id });
        throw new Error(
          `Batch ${batchNumber} was created but XML generation failed: ${err.message}. Fix the issue and download the XML again.`,
        );
      }
    }

    return batch;
  }

  private async resolveSingleNHISProvider(): Promise<string> {
    const nhis = await this.prisma.insuranceProvider.findFirst({
      where: { type: 'nhis' },
      select: { id: true },
    });
    if (!nhis) throw new ValidationError('No NHIS provider is configured');
    return nhis.id;
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

    return {
      periodYear,
      periodMonth,
      ...types.reduce((acc, type) => {
        acc[type] = byType[type].count;
        return acc;
      }, {} as Record<(typeof types)[number], number>),
      totalAmount: types.reduce((acc, type) => {
        acc[type] = byType[type].amount;
        return acc;
      }, {} as Record<(typeof types)[number], number>),
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