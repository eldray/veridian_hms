import { Prisma, PrismaClient } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { ConflictError, NotFoundError, ValidationError } from '../../utils/errors';
import { InsuranceClaimRepository } from './InsuranceClaimRepository';
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
  // GENERATE
  // ==========================================
  async generateBatch(input: GenerateBatchInput, userId: string) {
    const { insuranceType, periodYear, periodMonth } = input;

    if (!['nhis', 'private', 'corporate'].includes(insuranceType)) {
      throw new ValidationError('insuranceType must be nhis, private, or corporate');
    }
    if (periodMonth < 1 || periodMonth > 12) {
      throw new ValidationError('periodMonth must be 1–12');
    }
    if (periodYear < 2000 || periodYear > 2100) {
      throw new ValidationError('periodYear is out of range');
    }

    const insuranceProviderId = input.insuranceProviderId ?? null;
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
    const batch = await this.prisma.claimBatch.findUnique({
      where: { id: batchId },
    });
    if (!batch) throw new NotFoundError('Claim batch', batchId);
    if (batch.status !== 'generated') {
      throw new ConflictError('Only generated batches can be finalized');
    }

    const updated = await this.prisma.claimBatch.update({
      where: { id: batchId },
      data: {
        status: 'finalized',
        finalizedAt: new Date(),
        finalizedById: userId,
      },
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