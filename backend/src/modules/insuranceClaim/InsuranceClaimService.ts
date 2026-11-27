import { NotFoundError, ValidationError } from '../../utils/errors';
import { isValidNhisMemberNumber } from '../../utils/nhisMembership';
import { Prisma, PrismaClient } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { InsuranceClaimRepository } from './InsuranceClaimRepository';
import { getCounterService } from '../../services/CounterService';
import {
  findSpecialtyServiceMismatch,
  gdrgSpecialty,
  isoDay,
  mapAttendanceToNHIS,
  NHIS_SERVICE_OUTCOMES,
  nhisDatesOfService,
  nhisServiceOutcome,
  nhisSpecialtiesFor,
} from '../../utils/nhisAttendanceMapping';
import {
  facilityLevelFromType,
  gdrgBillsCase,
  NHIS_FALLBACK_GDRG_CODES,
  nhisCaseType,
  resolvePrincipalGdrg,
  type ResolverTariff,
} from './helpers/NHISPrincipalGdrgResolver';
import { approvedServicesCoverPrescription } from '../encounter/NHISPreAuthorisation';
import { calculateNHISMedicineAllocation, isPayerCovered, resolveMedicationUnitPrice, resolveUnitPrice } from '../../utils/pricing';
import { appendAuditLogWithinTransaction } from '../../services/auditChain';

const toNumber = (val: any): number => val ? parseFloat(val.toString()) : 0;
const safeArrayJoin = (arr: any, sep: string = ','): string => Array.isArray(arr) ? arr.join(sep) : (arr || '');
const escapeXml = (value: unknown): string => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;').replace(/'/g, '&apos;');
const safeMap = (arr: any[] | undefined, mapper: (item: any) => any): any[] => (arr || []).map(mapper).filter(Boolean);

/**
 * The priced lines, carried on every claim list so the desk can see what each claim
 * actually bills for. Without it the GDRG / services / labs / medicines columns read zero.
 */
const CLAIM_LINE_LIST_SELECT = {
  select: {
    id: true,
    itemNumber: true,
    itemCategory: true,
    code: true,
    description: true,
    quantity: true,
    unitPrice: true,
    lineTotal: true,
  },
  orderBy: { itemNumber: 'asc' as const },
};

/**
 * The newest active price row of a catalog entry. A claim line without a bill line has no
 * stored amount, so the form quotes this same row the bill generator would have used.
 */
const ACTIVE_PRICING = {
  where: { isActive: true },
  orderBy: { effectiveDate: 'desc' as const },
  take: 1,
};

export class InsuranceClaimService extends BaseService {
  private repo: InsuranceClaimRepository;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    super('InsuranceClaimService');
    this.prisma = prisma;
    this.repo = new InsuranceClaimRepository(prisma);
  }

  // attendanceId is @unique on InsuranceClaim, so an attendance can only ever carry ONE claim.
  // Return it if it is the requested type; refuse clearly if it is a different type
  // (otherwise the insert would fail later with an opaque duplicate-key error).
  private async findExistingClaim(tx: Prisma.TransactionClient, attendanceId: string, type: 'nhis' | 'private' | 'corporate') {
    const existing = await tx.insuranceClaim.findUnique({
      where: { attendanceId },
      include: {
        InsuranceProvider: { select: { type: true } },
        items: { select: { id: true } },
      }
    });
    if (!existing) return null;
    if (existing.InsuranceProvider?.type === type) {
      // Do not report a historical empty claim as a successful idempotent retry.
      // It needs a controlled repair so submitted/paid claim history is never
      // silently overwritten from today's billing data.
      if (!existing.items?.length) {
        throw new ValidationError(
          `Existing ${type} claim ${existing.claimNumber} has no itemized lines. It requires claims-audit review before it can be regenerated or submitted.`
        );
      }
      return existing;
    }
    throw new ValidationError(
      `This attendance already has a ${existing.InsuranceProvider?.type ?? 'different'} claim (${existing.claimNumber}), so a ${type} claim cannot be generated for it.`
    );
  }

  private calculateAgeInYears(dob: Date, asOf: Date): number {
    let age = asOf.getFullYear() - dob.getFullYear();
    const m = asOf.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && asOf.getDate() < dob.getDate())) age--;
    return Math.max(0, age);
  }


    // ==========================================
  // BATCH SERVICES (Fully Restored)
  // ==========================================
  async createClaimBatch(claimIds: string[], description: string | null, insuranceType: string | null, userId: string) {
    if (!claimIds?.length) throw new Error('At least one claim ID is required');
    let targetType = insuranceType;

    return this.prisma.$transaction(async (tx) => {
      const claims = await tx.insuranceClaim.findMany({ where: { id: { in: claimIds } }, include: { InsuranceProvider: true, Attendance: { select: { dateTime: true } }, items: { select: { id: true } } } });
      if (claims.length !== claimIds.length) throw new Error('One or more claims not found');
      if (!targetType && claims.length > 0) targetType = claims[0].InsuranceProvider?.type;
      if (!targetType) throw new Error('Insurance type must be specified or determinable');

      const firstServiceDate = claims[0].Attendance.dateTime;
      const periodYear = firstServiceDate.getFullYear();
      const periodMonth = firstServiceDate.getMonth() + 1;
      const providerId = claims[0].insuranceProviderId;
      const corporateAccountId = claims[0].corporateAccountId ?? null;

      for (const c of claims) {
        if (c.status !== 'finalized') throw new Error(`Claim ${c.claimNumber} is not finalized`);
        if (!c.items?.length) throw new ValidationError(`Claim ${c.claimNumber} has no itemized lines and cannot be batched. Repair the draft claim or resolve it through the claims audit workflow.`);
        if (c.InsuranceProvider?.type !== targetType) throw new Error(`Claim ${c.claimNumber} type mismatch`);
        if (c.batchId) throw new Error(`Claim ${c.claimNumber} already batched`);
        if (c.insuranceProviderId !== providerId) throw new Error('A claim batch cannot contain multiple insurance providers');
        if ((c.corporateAccountId ?? null) !== corporateAccountId) throw new Error('A claim batch cannot contain multiple corporate accounts');
        const serviceDate = c.Attendance.dateTime;
        if (serviceDate.getFullYear() !== periodYear || serviceDate.getMonth() + 1 !== periodMonth) {
          throw new Error('A claim batch can contain claims from only one service month');
        }
      }

      // ✅ FIXED: Decimal math
      const totalAmount = claims.reduce((sum, c) => sum + toNumber(c.totalClaimAmount), 0);
      // nextBatchNumber() already returns "BATCH-<n>" - do not prefix it again
      const batchNumber = getCounterService().nextBatchNumber();

      const batch = await tx.claimBatch.create({
        data: { batchNumber, insuranceType: targetType as any, insuranceProviderId: providerId, corporateAccountId, periodYear, periodMonth, totalClaims: claims.length, description, totalAmount, status: 'generated', createdById: userId, claims: { connect: claimIds.map(id => ({ id })) } },
        include: { claims: { include: { InsuranceProvider: true, Patient: true, Attendance: true, Bill: true } }, createdBy: { select: { id: true, fullName: true, username: true } } }
      });

      await tx.insuranceClaim.updateMany({ where: { id: { in: claimIds } }, data: { batchId: batch.id } });
      return batch;
    });
  }

  async getClaimBatches(status?: string, startDate?: Date, endDate?: Date, page = 1, limit = 50) {
    return this.repo.findBatchesWithFilters({ status, startDate, endDate, page, limit });
  }

  async getClaimBatch(batchId: string) {
    const batch = await this.prisma.claimBatch.findUnique({
      where: { id: batchId },
      include: { claims: { include: { InsuranceProvider: true, Patient: true, Attendance: true, Bill: true } }, createdBy: { select: { id: true, fullName: true, username: true } } }
    });
    if (!batch) throw new Error('Batch not found');
    return batch;
  }

  async addClaimsToBatch(batchId: string, claimIds: string[]) {
    if (!claimIds?.length) throw new Error('At least one claim ID is required');
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.claimBatch.findUnique({ where: { id: batchId }, include: { claims: true } });
      if (!existing) throw new Error('Batch not found');
      if (existing.status !== 'generated') throw new Error('Claims can only be added to generated, unfinalized batches');

      const claims = await tx.insuranceClaim.findMany({
        where: { id: { in: claimIds }, batchId: null },
        include: {
          InsuranceProvider: true,
          Attendance: { select: { dateTime: true } },
          items: { select: { id: true } },
        },
      });
      if (claims.length !== claimIds.length) throw new Error('Claims not found or already in a batch');

      for (const c of claims) {
        if (c.status !== 'finalized') throw new Error(`Claim ${c.claimNumber} is not finalized`);
        if (!c.items?.length) throw new ValidationError(`Claim ${c.claimNumber} has no itemized lines and cannot be added to a batch. Repair the draft claim or resolve it through the claims audit workflow.`);
        if (c.InsuranceProvider?.type !== existing.insuranceType) {
          throw new Error(`Claim ${c.claimNumber} insurance type does not match this batch`);
        }
        if (c.insuranceProviderId !== existing.insuranceProviderId) {
          throw new Error('A claim batch cannot contain multiple insurance providers');
        }
        if ((c.corporateAccountId ?? null) !== (existing.corporateAccountId ?? null)) {
          throw new Error('A claim batch cannot contain multiple corporate accounts');
        }
        const serviceDate = c.Attendance.dateTime;
        if (serviceDate.getFullYear() !== existing.periodYear || serviceDate.getMonth() + 1 !== existing.periodMonth) {
          throw new Error('A claim batch can contain claims from only one service month');
        }
      }

      // Recompute the aggregate from persisted claims, avoiding cumulative rounding drift.
      const addAmount = claims.reduce((sum, c) => sum + toNumber(c.totalClaimAmount), 0);

      await tx.claimBatch.update({
        where: { id: batchId },
        data: { totalAmount: toNumber(existing.totalAmount) + addAmount, claims: { connect: claimIds.map(id => ({ id })) } }
      });
      await tx.insuranceClaim.updateMany({ where: { id: { in: claimIds } }, data: { batchId } });

      return await tx.claimBatch.findUnique({
        where: { id: batchId },
        include: { claims: { include: { InsuranceProvider: true, Patient: true, Attendance: true, Bill: true } }, createdBy: { select: { id: true, fullName: true, username: true } } }
      });
    });
  }

  async removeClaimsFromBatch(batchId: string, claimIds: string[]) {
    if (!claimIds?.length) throw new Error('At least one claim ID is required');
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.claimBatch.findUnique({ where: { id: batchId }, include: { claims: { where: { id: { in: claimIds } }, select: { id: true, totalClaimAmount: true } } } });
      if (!existing) throw new Error('Batch not found');
      if (existing.status !== 'generated') throw new Error('Claims can only be removed from generated, unfinalized batches');

      // Reject mismatched IDs before touching the batch total or relation.
      const removedClaimIds = existing.claims.map((claim) => claim.id);
      if (removedClaimIds.length !== new Set(claimIds).size) {
        throw new ValidationError('One or more selected claims are not members of this batch.');
      }
      // Recompute the aggregate from persisted batch members, avoiding cumulative rounding drift.
      const remAmount = existing.claims.reduce((sum, c) => sum + toNumber(c.totalClaimAmount), 0);

      await tx.claimBatch.update({
        where: { id: batchId },
        data: { totalAmount: toNumber(existing.totalAmount) - remAmount, claims: { disconnect: removedClaimIds.map(id => ({ id })) } }
      });
      // Scope assignment clearing to the selected batch to protect claims from stale requests.
      await tx.insuranceClaim.updateMany({ where: { id: { in: removedClaimIds }, batchId }, data: { batchId: null } });

      return await tx.claimBatch.findUnique({
        where: { id: batchId },
        include: { claims: { include: { InsuranceProvider: true, Patient: true, Attendance: true, Bill: true } }, createdBy: { select: { id: true, fullName: true, username: true } } }
      });
    });
  }

  async generateBatchXML(batchId: string) {
    const batch = await this.prisma.claimBatch.findUnique({
      where: { id: batchId },
      include: { claims: { include: { InsuranceProvider: true, Patient: true, Attendance: true, Bill: true, items: { select: { id: true } } } }, createdBy: true }
    });
    if (!batch) throw new NotFoundError('Claim batch', batchId);
    if (batch.insuranceType !== 'nhis') throw new ValidationError('Only NHIS claim batches can be exported as NHIS XML.');
    if (!batch.claims.length) throw new ValidationError('An empty claim batch cannot be exported.');
    const claimWithoutItems = batch.claims.find((claim: any) => !claim.items?.length);
    if (claimWithoutItems) throw new ValidationError(`Claim ${claimWithoutItems.claimNumber} has no itemized lines. The batch XML cannot be generated until the claim is repaired.`);

    const facilityCode = process.env.NHIS_FACILITY_CODE || 'FAC001';
    
    // ✅ FIXED: Safely join JSON arrays for XML
    const claimsXml = batch.claims.map(c => `    <Claim>
      <ClaimNumber>${escapeXml(c.claimNumber)}</ClaimNumber>
      <PatientCCC>${escapeXml(c.Attendance?.nhisCCC || '')}</PatientCCC>
      <PatientName>${escapeXml(`${c.Patient?.surname || ''} ${c.Patient?.otherNames || ''}`.trim())}</PatientName>
      <TotalAmount>${toNumber(c.totalClaimAmount).toFixed(2)}</TotalAmount>
      <DiagnosisCodes>${escapeXml(safeArrayJoin(c.diagnosisCodes))}</DiagnosisCodes>
      <GDRGCodes>${escapeXml(safeArrayJoin(c.gdrgCodes))}</GDRGCodes>
    </Claim>`).join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<NHISBatchSubmission>
  <BatchInfo>
    <BatchNumber>${escapeXml(batch.batchNumber)}</BatchNumber>
    <BatchDate>${new Date(batch.periodYear, batch.periodMonth - 1, 1).toISOString()}</BatchDate>
    <FacilityCode>${escapeXml(facilityCode)}</FacilityCode>
    <TotalClaims>${batch.claims.length}</TotalClaims>
    <TotalAmount>${toNumber(batch.totalAmount).toFixed(2)}</TotalAmount>
    <GeneratedBy>${escapeXml(batch.createdBy.fullName || batch.createdBy.username)}</GeneratedBy>
    <GeneratedAt>${new Date().toISOString()}</GeneratedAt>
  </BatchInfo>
  <Claims>
${claimsXml}
  </Claims>
</NHISBatchSubmission>`;

    // Exporting a finalized batch is read-only; downloading must never reopen it.
    return { xml, batchNumber: batch.batchNumber };
  }

  async updateBatchStatus(batchId: string, status: string) {
    if (status !== 'finalized') throw new ValidationError('Batch status can only move from generated to finalized; finalized batches cannot be reopened.');
    return this.prisma.$transaction(async (tx) => {
      const batch = await tx.claimBatch.findUnique({
        where: { id: batchId },
        include: { claims: { select: { id: true, status: true, items: { select: { id: true } } } } },
      });
      if (!batch) throw new NotFoundError('Claim batch', batchId);
      if (batch.status !== 'generated') throw new ValidationError('Only generated batches can be finalized.');
      if (!batch.claims.length) throw new ValidationError('An empty claim batch cannot be finalized.');
      const invalidClaim = batch.claims.find((claim) => claim.status !== 'finalized' || !claim.items.length);
      if (invalidClaim) throw new ValidationError('Every claim in the batch must be finalized and contain itemized lines.');
      return tx.claimBatch.update({
        where: { id: batchId },
        data: { status: 'finalized', finalizedAt: new Date() },
        include: { claims: { include: { InsuranceProvider: true, Patient: true, Attendance: true, Bill: true } }, createdBy: { select: { id: true, fullName: true, username: true } } },
      });
    });
  }

  async deleteClaimBatch(batchId: string) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.claimBatch.findUnique({ where: { id: batchId }, include: { claims: true } });
      if (!existing) throw new Error('Batch not found');
      if (existing.status !== 'generated') throw new Error('Only generated, unfinalized batches can be deleted');
      await tx.insuranceClaim.updateMany({ where: { batchId }, data: { batchId: null } });
      await tx.claimBatch.delete({ where: { id: batchId } });
      return existing;
    });
  }

  // ==========================================
  // GENERAL CLAIM SERVICES (Fully Restored)
  // ==========================================
  async getAllInsuranceClaims(status?: string | string[], providerId?: string, patientId?: string, dateFrom?: Date, dateTo?: Date, page = 1, limit = 50) {
    const where: any = {};
    if (status) where.status = typeof status === 'string' && status.includes(',') ? { in: status.split(',').map(s => s.trim()) } : status;
    if (providerId) where.insuranceProviderId = providerId;
    if (patientId) where.patientId = patientId;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) { const d = new Date(dateTo); d.setHours(23, 59, 59, 999); where.createdAt.lte = d; }
    }

    const pageNum = Math.max(1, page);
    const limitNum = Math.min(100, Math.max(1, limit));
    const skip = (pageNum - 1) * limitNum;

    const [claims, total] = await Promise.all([
      this.prisma.insuranceClaim.findMany({
        where, include: { InsuranceProvider: { select: { id: true, name: true, type: true, coveragePercentage: true } }, Patient: { select: { id: true, folderNumber: true, surname: true, otherNames: true, contact: true } }, Attendance: { select: { id: true, attendanceNumber: true, dateTime: true, status: true, nhisCCC: true } }, Bill: { select: { id: true, billNumber: true, totalAmount: true } }, items: CLAIM_LINE_LIST_SELECT },
        orderBy: { createdAt: 'desc' }, skip, take: limitNum
      }),
      this.prisma.insuranceClaim.count({ where })
    ]);

    return { data: claims, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } };
  }

  // Include the encounter's clinical sub-records so claim forms can auto-populate
  // diagnoses / investigations / medicines / procedures from the attendance.
  // NOTE: the relation field on InsuranceClaim is `attendance` (lowercase).
  private claimDetailInclude = {
    InsuranceProvider: true,
    Patient: true,
    // Include priced line items so private/corporate claim forms can auto-load
    // billed services/medicines with their actual unit prices.
    Bill: { include: { BillLineItem: { include: { serviceCatalog: true } } } },
    // Include active employees so the corporate form can attribute services.
    CorporateAccount: { include: { employees: { where: { isActive: true } } } },
    Attendance: {
      include: {
        AttendanceDiagnosis: { include: { Diagnosis: true } },
        LabTest: { include: { LabTestTemplate: true, ServiceCatalog: true } },
        Scan: { include: { ScanTemplate: true, ServiceCatalog: true } },
        Medication: { include: { StockItem: true, ServiceCatalog: { include: { pricing: ACTIVE_PRICING } } } },
        Procedure: { include: { ProcedureTemplate: true, ServiceCatalog: true } },
        referral: true,
      }
    },
    // Saved claim line items (diagnoses / investigations / medicines / procedures).
    // The edit forms load these first, so without this an edited claim reverts to
    // the original attendance data on reload.
    items: {
      include: {
        diagnosis: true,
        gdrgTariff: true,
        serviceCatalog: true,
      },
      orderBy: { itemNumber: 'asc' as const },
    },
  } as const;

  // The frontend reads `claim.Attendance` (capitalised), so expose the lowercase
  // relation under that key too.
  private normalizeClaim(claim: any) {
    if (claim && claim.attendance && !claim.Attendance) {
      claim.Attendance = claim.attendance;
    }
    return claim;
  }

  async getInsuranceClaim(id: string) {
    const claim = await this.prisma.insuranceClaim.findUnique({ where: { id }, include: this.claimDetailInclude });
    if (!claim) throw new NotFoundError('Claim', id);
    return this.normalizeClaim(claim);
  }

  async getClaimByAttendanceId(attendanceId: string) {
    const claim = await this.prisma.insuranceClaim.findFirst({ where: { attendanceId }, include: this.claimDetailInclude });
    if (!claim) throw new Error('No claim found for this attendance');
    return this.normalizeClaim(claim);
  }

  /**
   * The medicines this claim may bill NHIS for, priced exactly the way saving the claim prices
   * them. A dispensed drug with no covered, in-force payer rule, no valid prescribing level or no
   * tariff is left out of the list and reported under `unclaimable`, because the save would refuse
   * it and the form has no amount to show for it.
   */
  async listNHISClaimableMedicines(claimId: string) {
    const claim = await this.prisma.insuranceClaim.findUnique({
      where: { id: claimId },
      select: {
        insuranceProviderId: true,
        Attendance: {
          select: {
            dateTime: true,
            insuranceProviderId: true,
            Admission: { select: { admissionDate: true } },
            Medication: {
              orderBy: { prescribedAt: 'asc' },
              select: {
                id: true, name: true, status: true, quantity: true, dosage: true, frequency: true, duration: true,
                prescribedAt: true, dispensedAt: true, stockItemId: true, serviceCatalogId: true,
                StockItem: { select: { id: true, drugCode: true, isNHISCovered: true, name: true, unitOfMeasure: true } },
              },
            },
          },
        },
      },
    });
    if (!claim) throw new NotFoundError('Claim', claimId);

    const attendance = claim.Attendance;
    const providerId = claim.insuranceProviderId ?? attendance?.insuranceProviderId ?? null;
    const medicines = attendance?.Medication ?? [];
    if (!providerId || !medicines.length) return { serviceDate: null, medicines: [], unclaimable: [] };

    // The same date the save quotes from: a stay is priced at its admission, a visit at its appointment.
    const policyDate = attendance.Admission?.admissionDate ?? attendance.dateTime;
    const stockItemIds = Array.from(new Set(medicines.map((m: any) => m.stockItemId).filter(Boolean))) as string[];

    const [rules, catalogs] = await Promise.all([
      this.prisma.stockItemPayerRule.findMany({
        where: { insuranceProviderId: providerId, stockItemId: { in: stockItemIds } },
        select: {
          stockItemId: true, isCovered: true, authorizationRequired: true, prescribingLevel: true,
          effectiveFrom: true, effectiveTo: true, tariffPrice: true,
          copaymentMode: true, copaymentAmount: true, copaymentPercentage: true,
        },
      }),
      this.prisma.serviceCatalog.findMany({
        where: { stockItemId: { in: stockItemIds } },
        select: {
          id: true, code: true, stockItemId: true,
          pricing: {
            where: { isActive: true, effectiveDate: { lte: policyDate }, OR: [{ expiryDate: null }, { expiryDate: { gt: policyDate } }] },
            orderBy: { effectiveDate: 'desc' },
            take: 1,
            select: { cashPrice: true, nhisPrice: true },
          },
        },
      }),
    ]);

    const ruleByStockItem = new Map(rules.map((r: any) => [r.stockItemId, r]));
    const catalogByStockItem = new Map(catalogs.map((c: any) => [c.stockItemId, c]));
    const validPrescribingLevels = ['A', 'M', 'B1', 'B2', 'C', 'D', 'SM'];

    const priced: any[] = [];
    const unclaimable: any[] = [];
    for (const med of medicines) {
      const stockItem = med.StockItem;
      const label = med.name || stockItem?.name || 'this medicine';
      // Claims may include active prescriptions even before dispensing. The source remains
      // the attendance's own Medication record; cancelled/discontinued rows are excluded.
      if (!['prescribed', 'dispensed', 'administered'].includes(med.status)) {
        unclaimable.push({
          code: stockItem?.drugCode,
          description: label,
          reason: `is marked ${String(med.status)}, so it is not an active prescription for this attendance`,
        });
        continue;
      }
      if (!stockItem) {
        unclaimable.push({ description: label, reason: 'its stock item is missing' });
        continue;
      }
      if (stockItem.isNHISCovered !== true) {
        unclaimable.push({ code: stockItem.drugCode, description: label, reason: 'has a facility catalogue code and is not listed as NHIS-covered' });
        continue;
      }
      const rule = ruleByStockItem.get(stockItem.id);
      if (!rule) {
        unclaimable.push({ code: stockItem.drugCode, description: label, reason: 'is not on the NHIS medicine list' });
        continue;
      }
      if (rule.isCovered !== true) {
        unclaimable.push({ code: stockItem.drugCode, description: label, reason: 'is on the NHIS list but marked not covered' });
        continue;
      }
      if (!validPrescribingLevels.includes(String(rule.prescribingLevel ?? '').trim().toUpperCase())) {
        unclaimable.push({ code: stockItem.drugCode, description: label, reason: 'has no valid NHIS prescribing level configured' });
        continue;
      }
      if ((rule.effectiveFrom && rule.effectiveFrom > policyDate) || (rule.effectiveTo && rule.effectiveTo < policyDate)) {
        unclaimable.push({ code: stockItem.drugCode, description: label, reason: 'its payer rule is not in force on the service date' });
        continue;
      }
      const catalog = catalogByStockItem.get(stockItem.id);
      const pricing = catalog?.pricing?.[0];
      const cashPrice = Number(pricing?.cashPrice ?? 0);
      const tariff = Number(rule.tariffPrice ?? pricing?.nhisPrice ?? 0);
      if (!Number.isFinite(cashPrice) || cashPrice <= 0) {
        unclaimable.push({ code: stockItem.drugCode, description: label, reason: 'has no active cash price configured' });
        continue;
      }
      if (!Number.isFinite(tariff) || tariff <= 0) {
        unclaimable.push({ code: stockItem.drugCode, description: label, reason: 'has no NHIS tariff configured' });
        continue;
      }
      let unitPrice: number;
      try {
        unitPrice = calculateNHISMedicineAllocation({
          cashPrice,
          nhisTariff: tariff,
          covered: true,
          copaymentMode: rule.copaymentMode,
          copaymentAmount: rule.copaymentAmount == null ? null : Number(rule.copaymentAmount),
          copaymentPercentage: rule.copaymentPercentage ?? null,
        }).nhisCoveredAmount;
      } catch (error) {
        unclaimable.push({
          code: stockItem.drugCode, description: label,
          reason: `cannot be priced: ${error instanceof Error ? error.message : 'the medicine payer policy is invalid'}`,
        });
        continue;
      }
      const quantity = Number(med.quantity ?? 1);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        unclaimable.push({ code: stockItem.drugCode, description: label, reason: 'has no valid prescribed quantity to claim' });
        continue;
      }
      const roundedUnit = Math.round(unitPrice * 100) / 100;
      priced.push({
        medicationId: med.id,
        stockItemId: stockItem.id,
        serviceCatalogId: catalog?.id ?? med.serviceCatalogId ?? null,
        code: stockItem.drugCode,
        description: label,
        unitOfMeasure: stockItem.unitOfMeasure,
        quantity,
        sourceStatus: med.status,
        date: isoDay(med.prescribedAt ?? med.dispensedAt ?? policyDate),
        prescription: `${med.dosage ?? ''} ${med.frequency ?? ''} x ${med.duration ?? ''}`.trim() || 'As prescribed',
        unitPrice: roundedUnit,
        lineTotal: Math.round(roundedUnit * quantity * 100) / 100,
        cashPrice: Math.round(cashPrice * 100) / 100,
        authorizationRequired: rule.authorizationRequired === true,
      });
    }

    priced.sort((x, y) => String(x.description).localeCompare(String(y.description)));
    return { serviceDate: isoDay(policyDate), medicines: priced, unclaimable };
  }

  async updateClaimDraft(claimId: string, data: any, userId: string) {
    const existing = await this.prisma.insuranceClaim.findUnique({
      where: { id: claimId },
      select: { id: true, status: true },
    });
    if (!existing) throw new NotFoundError('Claim', claimId);
    if (existing.status !== 'draft') throw new ValidationError('Only draft claims can be edited.');

    const fields = ['diagnosisCodes', 'procedureCodes', 'labTestCodes', 'scanCodes', 'serviceCodes', 'medicationCodes', 'totalClaimAmount', 'notes', 'preAuthNumber', 'principalGDRG', 'typeOfService', 'serviceOutcome', 'typeOfAttendance', 'mdcCode', 'datesOfService', 'metadata'];
    const toUpdate: any = { updatedById: userId, updatedAt: new Date() };
    fields.forEach(f => { if (data[f] !== undefined) toUpdate[f] = data[f]; });
    return this.prisma.insuranceClaim.update({ where: { id: claimId }, data: toUpdate });
  }

  /**
   * A claim is a financial/audit record. Only an untouched draft may be removed:
   * finalized, batched, tracked or externally submitted claims must remain immutable.
   * Claim items are removed by their schema cascade with the draft itself.
   */
  async deleteDraftClaim(claimId: string) {
    const claim = await this.prisma.insuranceClaim.findUnique({
      where: { id: claimId },
      select: {
        id: true,
        claimNumber: true,
        status: true,
        batchId: true,
        trackingEvents: { select: { id: true }, take: 1 },
        claimitSubmissions: { select: { id: true }, take: 1 },
      },
    });
    if (!claim) throw new NotFoundError('Claim', claimId);
    if (claim.status !== 'draft') throw new ValidationError('Only draft claims can be deleted. Finalized claim history must be retained.');
    if (claim.batchId) throw new ValidationError('This claim belongs to a claim batch and cannot be deleted.');
    if (claim.trackingEvents.length || claim.claimitSubmissions.length) {
      throw new ValidationError('This claim has submission or tracking history and cannot be deleted. Keep it for audit.');
    }
    return this.prisma.insuranceClaim.delete({ where: { id: claimId } });
  }

  /**
   * A draft is only finalizable when it could actually be paid. An NHIS claim whose header
   * contradicts itself — an outpatient visit reporting a clinical specialty, a service outcome the
   * payer does not accept, a principal G-DRG the claim carries no line for — is stopped here rather
   * than in the batch, because the payer's answer to all three is a query.
   */
  private async assertClaimFinalizable(claimId: string) {
    const claim = await this.prisma.insuranceClaim.findUnique({
      where: { id: claimId },
      include: {
        InsuranceProvider: { select: { type: true } },
        items: { select: { itemCategory: true, code: true, gdrgTariff: { select: { gdrgCode: true } } } },
      },
    });
    if (!claim) throw new NotFoundError('Claim', claimId);
    if (claim.status !== 'draft') throw new Error('Only draft claims can be finalized');
    if (!claim.items.length) {
      throw new ValidationError('A claim must contain at least one item before it can be finalized. Add or repair the claim items first.');
    }
    if (claim.InsuranceProvider?.type !== 'nhis') return claim;

    if (!(NHIS_SERVICE_OUTCOMES as readonly string[]).includes(String(claim.serviceOutcome))) {
      throw new ValidationError(
        `An NHIS claim must report a closed service outcome (${NHIS_SERVICE_OUTCOMES.join(', ')}). ` +
        `This one reports "${claim.serviceOutcome ?? 'nothing'}", which the payer rejects. Finish the encounter or edit the claim first.`,
      );
    }
    const carried = new Set(claim.items
      .map((item) => item.gdrgTariff?.gdrgCode ?? (item.itemCategory === 'gdrg' ? item.code : ''))
      .filter(Boolean));
    // Every G-DRG the claim carries, not only the header's specialty: a draft repaired by hand can
    // still hide a surgical code on an outpatient claim, and the payer reads the lines.
    const reported = Array.from(new Set(
      [claim.mdcCode ?? '', ...Array.from(carried).map(gdrgSpecialty)].map((s) => String(s).trim()).filter(Boolean)
    ));
    const mismatch = findSpecialtyServiceMismatch(claim.typeOfService || 'OPD', reported);
    if (mismatch) throw new ValidationError(mismatch);
    await this.assertOpdNotDatedInsideAnAdmission(this.prisma, {
      patientId: claim.patientId,
      attendanceId: claim.attendanceId,
      typeOfService: claim.typeOfService,
      datesOfService: claim.datesOfService,
    });
    if (!claim.principalGDRG) {
      throw new ValidationError('An NHIS claim must name a principal G-DRG before it can be finalized.');
    }
    if (carried.size && !carried.has(claim.principalGDRG)) {
      throw new ValidationError(
        `The principal G-DRG "${claim.principalGDRG}" is not one of the G-DRG codes this claim carries (${Array.from(carried).join(', ')}).`,
      );
    }
    return claim;
  }

  /**
   * An outpatient claim cannot be dated on a day the same patient was an inpatient elsewhere.
   *
   * The Tariffs Operation Manual prices every day of a stay inside that stay's G-DRG, so a visit
   * claimed over the top of an admission is a duplicate the payer reverses. Only stays recorded as
   * inpatient episodes count: a day case or an observation stay holds a bed and is billed as OPD by
   * design, and a cancelled admission was never a stay at all.
   */
  private async assertOpdNotDatedInsideAnAdmission(
    db: any,
    input: { patientId: string | null; attendanceId: string | null; typeOfService?: string | null; datesOfService: unknown }
  ) {
    if ((input.typeOfService || 'OPD') !== 'OPD' || !input.patientId) return;
    const days = (Array.isArray(input.datesOfService) ? input.datesOfService : [])
      .map(isoDay).filter(Boolean).sort();
    if (!days.length) return;
    const stay = await db.admission.findFirst({
      where: {
        status: { not: 'cancelled' },
        attendance: {
          patientId: input.patientId,
          encounterCategory: 'ipd',
          ...(input.attendanceId ? { id: { not: input.attendanceId } } : {}),
        },
        admissionDate: { lte: new Date(`${days[days.length - 1]}T23:59:59.999Z`) },
        OR: [{ dischargeDate: { gte: new Date(`${days[0]}T00:00:00.000Z`) } }, { dischargeDate: null }],
      },
      select: { admissionNumber: true, admissionDate: true, dischargeDate: true },
      orderBy: { admissionDate: 'asc' },
    });
    if (!stay) return;
    throw new ValidationError(
      `This outpatient claim is dated ${days.join(', ')}, which fall inside inpatient stay ${stay.admissionNumber} ` +
      `(${isoDay(stay.admissionDate)} to ${isoDay(stay.dischargeDate) || 'still open'}) for the same patient. ` +
      'The payer prices those days inside the admission claim, so the visit cannot be claimed separately.',
    );
  }

  async finalizeClaim(claimId: string, userId: string) {
    await this.assertClaimFinalizable(claimId);
    const repriced = await this.repriceGdrgLineAtFinalize(claimId);
    const claim = await this.prisma.insuranceClaim.update({ where: { id: claimId }, data: { status: 'finalized', finalizedAt: new Date(), finalizedById: userId, updatedById: userId } });
    if (repriced) this.logInfo('NHIS claim re-priced at finalization', { claimId, ...repriced });
    return claim;
  }

  /**
   * The tariff is edited in place, so a draft priced before a price update still carries the old
   * number. Finalizing is the last moment before the payer sees the claim, so the G-DRG line is
   * re-read from the tariff in force for the service date and the claim total rebuilt from it —
   * the same rule the claim editor applies when a draft is saved.
   *
   * A code with no tariff row in force is left alone rather than finalized at zero: the editor
   * already refuses to save that state, so it can only be an older claim, and its batch is priced
   * from the lines it carries.
   */
  private async repriceGdrgLineAtFinalize(claimId: string) {
    const claim = await this.prisma.insuranceClaim.findUnique({
      where: { id: claimId },
      select: {
        id: true, principalGDRG: true, totalClaimAmount: true, createdAt: true,
        InsuranceProvider: { select: { type: true } },
        Attendance: { select: { dateTime: true, Admission: { select: { admissionDate: true } } } },
        items: { select: { id: true, itemCategory: true, code: true, lineTotal: true } },
      },
    });
    if (!claim || claim.InsuranceProvider?.type !== 'nhis') return null;
    const gdrgRow = claim.items.find((item) => item.itemCategory === 'gdrg');
    const gdrgCode = gdrgRow?.code || claim.principalGDRG;
    if (!gdrgRow || !gdrgCode) return null;
    const policyDate = new Date(claim.Attendance?.dateTime ?? claim.Attendance?.Admission?.admissionDate ?? claim.createdAt);
    if (Number.isNaN(policyDate.getTime())) return null;
    const tariff = await this.prisma.gDRGTariff.findFirst({
      where: {
        gdrgCode,
        isActive: true,
        effectiveFrom: { lte: policyDate },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: policyDate } }],
      },
      orderBy: { effectiveFrom: 'desc' },
      select: { id: true, nhiaTariff: true },
    });
    if (!tariff || !Number.isFinite(Number(tariff.nhiaTariff)) || Number(tariff.nhiaTariff) <= 0) return null;

    const amount = Math.round(Number(tariff.nhiaTariff) * 100) / 100;
    const medicinesTotal = claim.items
      .filter((item) => item.itemCategory === 'medicine')
      .reduce((sum, item) => sum + toNumber(item.lineTotal), 0);
    const total = Math.round((amount + medicinesTotal) * 100) / 100;
    if (toNumber(gdrgRow.lineTotal) === amount && toNumber(claim.totalClaimAmount) === total) return null;

    await this.prisma.$transaction([
      this.prisma.insuranceClaimItem.update({
        where: { id: gdrgRow.id },
        data: { unitPrice: amount, lineTotal: amount, gdrgTariffId: tariff.id },
      }),
      this.prisma.insuranceClaim.update({ where: { id: claim.id }, data: { totalClaimAmount: total } }),
    ]);
    return {
      gdrgCode,
      previousLineAmount: toNumber(gdrgRow.lineTotal),
      lineAmount: amount,
      previousTotal: toNumber(claim.totalClaimAmount),
      total,
    };
  }

  async updateClaimStatus(claimId: string, status: string, notes: string | undefined, userId: string) {
    const valid = ['draft', 'finalized'];
    if (!valid.includes(status)) throw new Error('Invalid status');
    if (status === 'finalized') {
      await this.assertClaimFinalizable(claimId);
      const repriced = await this.repriceGdrgLineAtFinalize(claimId);
      if (repriced) this.logInfo('NHIS claim re-priced at finalization', { claimId, ...repriced });
    }
    const toUpdate: any = { status, updatedById: userId, updatedAt: new Date() };
    if (status === 'finalized') { toUpdate.finalizedAt = new Date(); toUpdate.finalizedById = userId; }
    if (notes) toUpdate.notes = notes;
    return this.prisma.insuranceClaim.update({ where: { id: claimId }, data: toUpdate });
  }

  async getClaimsSummary(filters: { insuranceType?: 'nhis' | 'private' | 'corporate' } = {}) {
    const where: any = {};
    if (filters.insuranceType) where.InsuranceProvider = { type: filters.insuranceType };
    const [totalClaims, draftClaims, finalizedClaims, aggregate] = await Promise.all([
      this.prisma.insuranceClaim.count({ where }),
      this.prisma.insuranceClaim.count({ where: { ...where, status: 'draft' } }),
      this.prisma.insuranceClaim.count({ where: { ...where, status: 'finalized' } }),
      this.prisma.insuranceClaim.aggregate({ where, _sum: { totalClaimAmount: true } }),
    ]);
    return {
      totalClaims,
      draftClaims,
      finalizedClaims,
      totalAmount: toNumber(aggregate._sum.totalClaimAmount),
    };
  }

  async getFinalizedClaimsTotal(dateFrom?: Date, dateTo?: Date, type?: string) {
    const where: any = { status: 'finalized' };
    if (type === 'nhis') where.InsuranceProvider = { type: 'nhis' };
    if (type === 'private') where.InsuranceProvider = { type: 'private' };
    if (dateFrom || dateTo) {
      where.finalizedAt = {};
      if (dateFrom) where.finalizedAt.gte = dateFrom;
      if (dateTo) where.finalizedAt.lte = dateTo;
    }

    const claims = await this.prisma.insuranceClaim.findMany({ where, include: { InsuranceProvider: true, Patient: true } });
    
    // ✅ FIXED: Decimal math
    const totalAmount = claims.reduce((sum, c) => sum + toNumber(c.totalClaimAmount), 0);

    return {
      total: claims.length, totalAmount,
      claims: claims.map(c => ({ id: c.id, claimNumber: c.claimNumber, patientName: `${c.Patient?.surname || ''} ${c.Patient?.otherNames || ''}`.trim(), amount: toNumber(c.totalClaimAmount), finalizedAt: c.finalizedAt, provider: c.InsuranceProvider?.name }))
    };
  }

  // ==========================================
  // NHIS SERVICES (Fully Restored)
  // ==========================================
  async generateNHISClaim(attendanceId: string, userId: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
      if (!attendanceId) throw new ValidationError('attendanceId is required');
      const existing = await this.findExistingClaim(tx, attendanceId, 'nhis');
      if (existing) return { claim: existing, isExisting: true };

      const att = await tx.attendance.findUnique({
        where: { id: attendanceId },
        include: { Patient: true, InsuranceProvider: true, Bill: true, Admission: true, User_Attendance_providerIdToUser: { select: { fullName: true, licenseNumber: true } }, AttendanceDiagnosis: { where: { diagnosisType: 'primary' }, include: { Diagnosis: true } }, ServiceRendered: { include: { ServiceCatalog: true } }, Medication: { include: { ServiceCatalog: true, StockItem: true } }, LabTest: { where: { status: 'completed' }, include: { ServiceCatalog: true, LabTestTemplate: true } }, Scan: { where: { status: 'completed' }, include: { ServiceCatalog: true, ScanTemplate: true } }, Procedure: { where: { status: 'completed' }, include: { ServiceCatalog: true, ProcedureTemplate: true } }, referral: true, familyPlanningServices: true }
      });

      if (!att) throw new NotFoundError('Attendance', attendanceId);
      // A claim is filed in a named patient's name with their age and NHIS identity, so a
      // counter ticket (no Patient row, cash only) can never be claimed. The NHIS form
      // reads the patient's date of birth below, so the relation itself is required here.
      if (!att.Patient || !att.patientId) throw new ValidationError(`Attendance ${att.attendanceNumber} has no registered patient, so no claim can be filed for it.`);
      if (!att.InsuranceProvider || att.InsuranceProvider.type !== 'nhis') {
        throw new ValidationError(`Attendance ${att.attendanceNumber} is not an NHIS visit (insurance provider: ${att.InsuranceProvider?.name ?? 'none selected'}). Set the NHIS provider on the attendance first.`);
      }
      if (!isValidNhisMemberNumber(att.Patient.nhisNumber)) {
        throw new ValidationError(
          `Attendance ${att.attendanceNumber} has no valid 8-digit NHIS number or 10-digit HIN. Update the patient's NHIS membership number before creating the claim.`,
        );
      }
      if (!/^[0-9]{5}$/.test(String(att.nhisCCC ?? '').trim())) {
        throw new ValidationError(`Attendance ${att.attendanceNumber} has no valid five-digit Claim Check Code (CCC). Generate or enter a five-digit NHIS CCC before creating the claim.`);
      }
      const pd = att.AttendanceDiagnosis[0];
      if (!pd) throw new ValidationError(`Attendance ${att.attendanceNumber} has no primary diagnosis. Record a primary diagnosis before creating the NHIS claim.`);

      // Bill is optional for legacy or bill-less encounters, but when present its
      // patient and payer identity must agree with the attendance before the claim
      // links to it. The Bill relation is one-to-one on attendanceId in Prisma.
      if (att.Bill) {
        if (att.Bill.patientId && att.Bill.patientId !== att.patientId) {
          throw new ValidationError(
            `Attendance ${att.attendanceNumber} cannot generate an NHIS claim: its bill belongs to a different patient.`,
          );
        }
        if (att.Bill.insuranceProviderId && att.Bill.insuranceProviderId !== att.insuranceProviderId) {
          throw new ValidationError(
            `Attendance ${att.attendanceNumber} cannot generate an NHIS claim: its bill uses a different insurance provider.`,
          );
        }
        if (att.Bill.corporateAccountId && att.Bill.corporateAccountId !== att.corporateAccountId) {
          throw new ValidationError(
            `Attendance ${att.attendanceNumber} cannot generate an NHIS claim: its bill uses a different corporate account.`,
          );
        }
      }

      // Revalidate dispensed NHIS medicines at claim-generation time so legacy or
      // imported prescriptions cannot bypass payer coverage/authorisation controls.
      const authorizationNumbers = new Set<string>();
      // Price and validate the claim against the encounter's service date, not the
      // day someone happens to submit the claim. For inpatient stays, use admission
      // date because this claim currently carries one G-DRG tariff for the stay.
      const servicePolicyDate = new Date(att.Admission?.admissionDate ?? att.dateTime);
      if (Number.isNaN(servicePolicyDate.getTime())) {
        throw new ValidationError('NHIS claim cannot be generated because the attendance service date is invalid.');
      }
      const claimValidationDate = servicePolicyDate;
      let nhisMedicineClaimTotal = 0;
      const nhisMedicineItems: any[] = [];
      for (const med of att.Medication) {
        const stockItem = med.StockItem;
        if (!stockItem) {
          throw new ValidationError(`NHIS claim cannot include medicine ${med.name ?? med.id}: its stock item is missing.`);
        }
        const payerRule = await tx.stockItemPayerRule.findUnique({
          where: {
            stockItemId_insuranceProviderId: {
              stockItemId: stockItem.id,
              insuranceProviderId: att.insuranceProviderId!,
            },
          },
          select: {
            isCovered: true,
            authorizationRequired: true,
            prescribingLevel: true,
            effectiveFrom: true,
            effectiveTo: true,
            tariffPrice: true,
            copaymentMode: true,
            copaymentAmount: true,
            copaymentPercentage: true,
          },
        });
        if (!payerRule || payerRule.isCovered !== true ||
            (payerRule.effectiveFrom && payerRule.effectiveFrom > claimValidationDate) ||
            (payerRule.effectiveTo && payerRule.effectiveTo < claimValidationDate)) {
          throw new ValidationError(
            `NHIS claim cannot include ${med.name ?? stockItem.name}: its medicine coverage rule is missing, uncovered, or outside its effective dates.`,
          );
        }
        const validPrescribingLevels = ['A', 'M', 'B1', 'B2', 'C', 'D', 'SM'];
        if (!payerRule.prescribingLevel || !validPrescribingLevels.includes(String(payerRule.prescribingLevel).trim().toUpperCase())) {
          throw new ValidationError(
            `NHIS claim cannot include ${med.name ?? stockItem.name}: its prescribing level is missing or invalid. Configure the medicine payer rule before claim generation.`,
          );
        }
        // Only an explicit "authorisation required" demands a matching pre-authorisation. The NHIS
        // medicine list the facility prices from carries no authorisation column, so a rule imported
        // from it leaves the flag null — that means "not stated", not "unknown, refuse the claim".
        // Reading null as a refusal would bar every covered medicine from every NHIS claim.
        if (payerRule.authorizationRequired === true) {
          const approvals = await tx.preAuthorisationRequest.findMany({
            where: {
              attendanceId: att.id,
              patientId: att.patientId,
              insuranceProviderId: att.insuranceProviderId!,
              status: { in: ['approved', 'partially_approved'] },
              authNumber: { not: null },
              authExpiry: { gt: claimValidationDate },
            },
            select: { authNumber: true, approvedServices: true },
          });
          const matchingApproval = approvals.find((approval) =>
            approvedServicesCoverPrescription(approval.approvedServices, {
              stockItemId: stockItem.id,
              serviceCatalogId: med.serviceCatalogId ?? '',
            }, Number(med.quantity ?? 1)),
          );
          if (!matchingApproval?.authNumber) {
            throw new ValidationError(
              `NHIS claim cannot include ${med.name ?? stockItem.name}: no current authorisation explicitly covering this medicine was found.`,
            );
          }
          authorizationNumbers.add(matchingApproval.authNumber);
        }

        // Use the same explicit payer-rule allocation as billing. NHIS receives only
        // its covered share; the patient's configured contribution is not added to
        // the insurer claim. Resolve the cash tariff as of the claim-generation date.
        const catalog = med.serviceCatalogId
          ? await tx.serviceCatalog.findUnique({
              where: { id: med.serviceCatalogId },
              select: {
                pricing: {
                  where: {
                    isActive: true,
                    effectiveDate: { lte: claimValidationDate },
                    OR: [{ expiryDate: null }, { expiryDate: { gt: claimValidationDate } }],
                  },
                  orderBy: { effectiveDate: 'desc' },
                  take: 1,
                  select: { cashPrice: true, nhisPrice: true },
                },
              },
            })
          : null;
        const currentPricing = catalog?.pricing?.[0];
        if (!currentPricing || !Number.isFinite(Number(currentPricing.cashPrice)) || Number(currentPricing.cashPrice) <= 0) {
          throw new ValidationError(
            `NHIS claim cannot price ${med.name ?? stockItem.name}: no valid active cash price is configured for this medicine.`,
          );
        }
        const cashPrice = Number(currentPricing.cashPrice);
        const configuredTariff = payerRule.tariffPrice ?? currentPricing.nhisPrice;
        if (configuredTariff == null || !Number.isFinite(Number(configuredTariff)) || Number(configuredTariff) <= 0) {
          throw new ValidationError(
            `NHIS claim cannot price ${med.name ?? stockItem.name}: no valid NHIS tariff is configured in the payer rule or active pricing.`,
          );
        }
        const nhisTariff = Number(configuredTariff);
        let allocation;
        try {
          allocation = calculateNHISMedicineAllocation({
            cashPrice,
            nhisTariff,
            covered: true,
            copaymentMode: payerRule.copaymentMode,
            copaymentAmount: payerRule.copaymentAmount == null ? null : Number(payerRule.copaymentAmount),
            copaymentPercentage: payerRule.copaymentPercentage ?? null,
          });
        } catch (error) {
          throw new ValidationError(
            `NHIS claim cannot price ${med.name ?? stockItem.name}: ${error instanceof Error ? error.message : 'the medicine payer policy is invalid'}`,
          );
        }
        const quantity = Number(med.quantity ?? 1);
        if (!Number.isFinite(quantity) || quantity <= 0) {
          throw new ValidationError(`NHIS claim cannot price ${med.name ?? stockItem.name}: supplied quantity is missing or invalid.`);
        }
        const coveredUnitAmount = Math.round(allocation.nhisCoveredAmount * 100) / 100;
        const coveredLineAmount = Math.round(coveredUnitAmount * quantity * 100) / 100;
        nhisMedicineClaimTotal += coveredLineAmount;
        nhisMedicineItems.push({
          itemCategory: 'medicine',
          itemType: 'medication',
          code: stockItem.drugCode || '',
          description: med.name || stockItem.name,
          quantity,
          unitPrice: coveredUnitAmount,
          lineTotal: coveredLineAmount,
          serviceDate: att.dateTime,
          medicationId: med.id,
          serviceCatalogId: med.ServiceCatalog?.id || null
        });
      }

      // The principal G-DRG is decided by the case the encounter actually is, then narrowed to the
      // age band as at the service date and to the codes this facility's NHIS level may bill. A
      // diagnosis linked to both an inpatient family and the OPD scheme is not a coin flip: an
      // outpatient visit bills OPDC, and a child bills the PAED family rather than an adult MEDI code.
      const age = this.calculateAgeInYears(att.Patient.dateOfBirth, servicePolicyDate);
      const hospital = await tx.hospital.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
        select: { nhisFacilityType: true },
      });
      const facilityLevel = facilityLevelFromType(hospital?.nhisFacilityType);
      let caseType = nhisCaseType({
        attendanceType: att.attendanceType,
        encounterCategory: att.encounterCategory,
        admissionType: att.Admission?.admissionType,
        hasAdmission: !!att.Admission,
      });

      // Use a ZOOM case for a recorded ZOOM day procedure or a family-planning method
      // that has an explicit NHIS ZOOM tariff. Do not invent codes for methods without one.
      const familyPlanningZoomCode = (method: unknown): string | null => {
        switch (String(method ?? '').toLowerCase()) {
          case 'female_sterilization': return 'ZOOM08A';
          case 'male_sterilization': return 'ZOOM09A';
          case 'iud_copper':
          case 'iud_hormonal': return 'ZOOM10A';
          case 'implant_implanon':
          case 'implant_jadelle': return 'ZOOM11A';
          case 'injectable_dmpa': return 'ZOOM12A';
          default: return null;
        }
      };
      const familyPlanningZoomCodes = Array.from(new Set(
        (att.familyPlanningServices ?? [])
          .map((service: any) => familyPlanningZoomCode(service.method))
          .filter((code: string | null): code is string => Boolean(code))
      ));
      if (familyPlanningZoomCodes.length && age < 12) {
        throw new ValidationError('The configured NHIS family-planning ZOOM tariffs are adult-only; verify the patient age and the current NHIS tariff schedule before claiming this service.');
      }
      const hasExplicitZoomProcedure = att.Procedure.some((procedure: any) => {
        const code = String(procedure.ProcedureTemplate?.procedureCode ?? procedure.ServiceCatalog?.nhisServiceCode ?? '').trim().toUpperCase();
        return code.startsWith('ZOOM');
      });
      if ((caseType === 'opd' || caseType === 'anc') && (hasExplicitZoomProcedure || familyPlanningZoomCodes.length)) {
        caseType = 'zoom';
      }
      const tariffContext = { caseType, age, facilityLevel };
      const pricedOnServiceDate: Prisma.GDRGTariffWhereInput = {
        isActive: true,
        effectiveFrom: { lte: servicePolicyDate },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: servicePolicyDate } }],
      };
      const diagnosisLinks = await tx.gDRGTariffDiagnosis.findMany({
        where: { diagnosisId: pd.diagnosisId, gdrgTariff: pricedOnServiceDate },
        include: { gdrgTariff: true },
      });
      const procedureCatalogIds = Array.from(new Set(
        att.Procedure.map((p) => p.serviceCatalogId).filter((id): id is string => Boolean(id))
      ));
      const procedureLinks = procedureCatalogIds.length
        ? await tx.gDRGTariffProcedure.findMany({
            where: { procedureId: { in: procedureCatalogIds }, gdrgTariff: pricedOnServiceDate },
            include: { gdrgTariff: true },
          })
        : [];
      const referralZoomCode = att.status === 'referred' && att.Admission
        ? (age >= 12 ? 'ZOOM03A' : 'ZOOM03C')
        : null;
      const additionalZoomCodes = Array.from(new Set([
        ...familyPlanningZoomCodes,
        ...(referralZoomCode ? [referralZoomCode] : []),
      ]));
      const [fallbackTariffs, additionalZoomTariffs] = await Promise.all([
        tx.gDRGTariff.findMany({
          where: { gdrgCode: { in: [...NHIS_FALLBACK_GDRG_CODES] }, ...pricedOnServiceDate },
        }),
        additionalZoomCodes.length
          ? tx.gDRGTariff.findMany({ where: { gdrgCode: { in: additionalZoomCodes }, ...pricedOnServiceDate } })
          : Promise.resolve([]),
      ]);
      const additionalZoomTariffByCode = new Map(additionalZoomTariffs.map((row: any) => [row.gdrgCode, row]));
      const missingFamilyPlanningTariffs = familyPlanningZoomCodes.filter((code) => !additionalZoomTariffByCode.has(code));
      if (missingFamilyPlanningTariffs.length) {
        throw new ValidationError(`NHIS family-planning service is missing its configured ZOOM tariff: ${missingFamilyPlanningTariffs.join(', ')}.`);
      }
      if (referralZoomCode && !additionalZoomTariffByCode.has(referralZoomCode)) {
        throw new ValidationError(`NHIS referral cannot be claimed because tariff ${referralZoomCode} is not configured and active for the service date.`);
      }

      const principal = resolvePrincipalGdrg({
        ...tariffContext,
        isSurgicalCase: att.attendanceType === 'surgery' || att.attendanceType === 'delivery',
        links: [
          ...diagnosisLinks.map((link) => ({
            tariff: link.gdrgTariff,
            isPrimary: link.isPrimary,
            origin: 'diagnosis' as const,
          })),
          ...procedureLinks.map((link) => ({
            tariff: link.gdrgTariff,
            isPrimary: link.isPrimary,
            origin: 'procedure' as const,
          })),
          ...familyPlanningZoomCodes.flatMap((code) => {
            const linkedTariff = additionalZoomTariffByCode.get(code);
            return linkedTariff ? [{
              tariff: linkedTariff,
              isPrimary: true,
              origin: 'procedure' as const,
              label: 'family-planning method',
            }] : [];
          }),
        ],
        fallbacks: fallbackTariffs,
      });
      const tariff = principal.tariff;

      // nextNHISClaimNumber() already returns "NHIS-<n>" - do not prefix it again
      const claimNumber = getCounterService().nextNHISClaimNumber();

      // Dates of service and specialties follow the payer's own rules, not the calendar: an
      // admission sends its two endpoints, and an outpatient visit is billed under the OPD scheme
      // whatever family its G-DRG belongs to. A day case or an observation stay goes out as OPD
      // even though it held a bed, because that is how its ZOOM code is priced.
      const { typeOfAttendance: typeOfAtt, typeOfService: mappedService } = mapAttendanceToNHIS(att.attendanceType, !!att.Admission);
      const typeOfService = caseType === 'zoom' ? 'OPD' : mappedService;
      const datesOfService = nhisDatesOfService(null, att, att.Admission, typeOfService);
      await this.assertOpdNotDatedInsideAnAdmission(tx, {
        patientId: att.patientId, attendanceId: att.id, typeOfService, datesOfService,
      });
      const [specialty] = nhisSpecialtiesFor(typeOfService, [tariff.gdrgCode]);
      const serviceOutcome = nhisServiceOutcome(att.status, att.Admission?.dischargeStatus);

      // The payer prices a bundled case from the principal G-DRG and the medicines, so these
      // supporting lines carry no money. They exist because the claim must name every diagnosis,
      // investigation and procedure the encounter actually produced.
      const otherDiagnoses = await tx.attendanceDiagnosis.findMany({
        where: { attendanceId: att.id, id: { not: pd.id } },
        include: { Diagnosis: true },
        orderBy: { date: 'asc' },
      });
      const otherDiagnosisLinks = otherDiagnoses.length
        ? await tx.gDRGTariffDiagnosis.findMany({
            where: { diagnosisId: { in: otherDiagnoses.map((d) => d.diagnosisId) }, gdrgTariff: pricedOnServiceDate },
            include: { gdrgTariff: true },
          })
        : [];
      // A supporting line names the G-DRG of its own diagnosis or operation, but only one that this
      // case type can bill. A surgical tariff written on an outpatient claim is the contradiction the
      // payer bounces, and the editor's own case filter is the rule that decides it.
      const billableGdrgId = (
        links: Array<{ gdrgTariff: ResolverTariff; isPrimary: boolean }>,
        origin: 'diagnosis' | 'procedure'
      ): string => {
        const own = links.filter((link) => gdrgBillsCase(link.gdrgTariff, tariffContext, origin));
        return (own.find((link) => link.isPrimary) ?? own[0])?.gdrgTariff.id ?? tariff.id;
      };
      const gdrgIdForDiagnosis = (diagnosisId: string): string =>
        billableGdrgId(otherDiagnosisLinks.filter((link) => link.diagnosisId === diagnosisId), 'diagnosis');

      const requiredNhisInvestigationCode = (value: unknown, label: string): string => {
        const code = String(value ?? '').trim().toUpperCase();
        if (!/^INVE[0-9]/.test(code)) {
          throw new ValidationError(`NHIS claim cannot include ${label}: no valid NHIS INVE investigation code is configured.`);
        }
        return code;
      };
      const requiredNhisProcedureCode = (value: unknown, label: string): string => {
        const code = String(value ?? '').trim().toUpperCase();
        if (!code || /^PROC-/i.test(code)) {
          throw new ValidationError(`NHIS claim cannot include procedure ${label}: no valid NHIS procedure code is configured.`);
        }
        return code;
      };

      const physicianLicense = String(att.User_Attendance_providerIdToUser?.licenseNumber ?? '').trim();
      const supportingItems: any[] = [
        {
          itemCategory: 'diagnosis',
          itemType: 'D',
          code: pd.Diagnosis?.icdCode ?? '',
          description: pd.Diagnosis?.name ?? '',
          quantity: 1,
          unitPrice: 0,
          lineTotal: 0,
          serviceDate: pd.date,
          diagnosisId: pd.diagnosisId,
          gdrgTariffId: tariff.id,
        },
        ...otherDiagnoses.map((d) => ({
          itemCategory: 'diagnosis',
          itemType: 'D',
          code: d.Diagnosis?.icdCode ?? d.icdCode ?? '',
          description: d.Diagnosis?.name ?? '',
          quantity: 1,
          unitPrice: 0,
          lineTotal: 0,
          serviceDate: d.date,
          diagnosisId: d.diagnosisId,
          gdrgTariffId: gdrgIdForDiagnosis(d.diagnosisId),
        })),
        ...att.LabTest.map((l) => ({
          itemCategory: 'investigation',
          itemType: 'N',
          code: requiredNhisInvestigationCode(l.LabTestTemplate?.investigationCode ?? l.ServiceCatalog?.nhisServiceCode, l.ServiceCatalog?.name ?? l.LabTestTemplate?.name ?? 'laboratory investigation'),
          description: l.ServiceCatalog?.name ?? '',
          quantity: 1,
          unitPrice: 0,
          lineTotal: 0,
          serviceDate: l.completedAt ?? att.dateTime,
          labTestId: l.id,
          serviceCatalogId: l.serviceCatalogId ?? null,
        })),
        ...att.Scan.map((s) => ({
          itemCategory: 'investigation',
          itemType: 'N',
          code: requiredNhisInvestigationCode(s.ScanTemplate?.investigationCode ?? s.ServiceCatalog?.nhisServiceCode, s.ServiceCatalog?.name ?? s.ScanTemplate?.name ?? 'scan'),
          description: s.ServiceCatalog?.name ?? '',
          quantity: 1,
          unitPrice: 0,
          lineTotal: 0,
          serviceDate: s.completedAt ?? att.dateTime,
          scanId: s.id,
          serviceCatalogId: s.serviceCatalogId ?? null,
        })),
        ...att.Procedure.map((p) => ({
          itemCategory: 'procedure',
          itemType: 'P',
          code: requiredNhisProcedureCode(p.ProcedureTemplate?.procedureCode ?? p.ServiceCatalog?.nhisServiceCode, p.ServiceCatalog?.name ?? p.ProcedureTemplate?.name ?? 'procedure'),
          description: p.ServiceCatalog?.name ?? '',
          quantity: 1,
          unitPrice: 0,
          lineTotal: 0,
          serviceDate: p.performedAt ?? p.scheduledDate ?? att.dateTime,
          procedureId: p.id,
          serviceCatalogId: p.serviceCatalogId ?? null,
          diagnosisId: pd.diagnosisId,
          gdrgTariffId: p.serviceCatalogId
            ? billableGdrgId(procedureLinks.filter((link) => link.procedureId === p.serviceCatalogId), 'procedure')
            : tariff.id,
        })),
        ...(att.familyPlanningServices ?? []).flatMap((service: any) => {
          const code = familyPlanningZoomCode(service.method);
          const linkedTariff: any = code ? additionalZoomTariffByCode.get(code) : null;
          return linkedTariff ? [{
            itemCategory: 'procedure',
            itemType: 'P',
            code,
            description: String(service.method).replace(/_/g, ' '),
            quantity: 1,
            unitPrice: 0,
            lineTotal: 0,
            serviceDate: service.serviceDate ?? att.dateTime,
            diagnosisId: pd.diagnosisId,
            gdrgTariffId: linkedTariff.id,
          }] : [];
        }),
        ...(referralZoomCode && additionalZoomTariffByCode.get(referralZoomCode) ? [{
          itemCategory: 'procedure',
          itemType: 'P',
          code: referralZoomCode,
          description: 'Inpatient transfer out/referral to ' + (att.referral?.referredToFacility ?? 'another facility'),
          quantity: 1,
          unitPrice: 0,
          lineTotal: 0,
          serviceDate: att.Admission?.dischargeDate ?? att.dateTime,
          diagnosisId: pd.diagnosisId,
          gdrgTariffId: (additionalZoomTariffByCode.get(referralZoomCode) as any).id,
        }] : []),
      ];

      const claim = await tx.insuranceClaim.create({
        data: {
          claimNumber, billId: att.Bill?.id, patientId: att.patientId, attendanceId: att.id, insuranceProviderId: att.insuranceProviderId!,
          preAuthNumber: authorizationNumbers.size ? Array.from(authorizationNumbers).join(',') : undefined,
          totalClaimAmount: Math.round((Number(tariff.nhiaTariff) + nhisMedicineClaimTotal) * 100) / 100, status: 'draft', createdById: userId,
          diagnosisCodes: safeMap([pd.Diagnosis?.icdCode], c => c),
          labTestCodes: safeMap(att.LabTest, l => requiredNhisInvestigationCode(l.LabTestTemplate?.investigationCode ?? l.ServiceCatalog?.nhisServiceCode, l.ServiceCatalog?.name ?? l.LabTestTemplate?.name ?? 'laboratory investigation')),
          scanCodes: safeMap(att.Scan, s => requiredNhisInvestigationCode(s.ScanTemplate?.investigationCode ?? s.ServiceCatalog?.nhisServiceCode, s.ServiceCatalog?.name ?? s.ScanTemplate?.name ?? 'scan')),
          procedureCodes: [
            ...safeMap(att.Procedure, p => requiredNhisProcedureCode(p.ProcedureTemplate?.procedureCode ?? p.ServiceCatalog?.nhisServiceCode, p.ServiceCatalog?.name ?? p.ProcedureTemplate?.name ?? 'procedure')),
            ...familyPlanningZoomCodes,
            ...(referralZoomCode && additionalZoomTariffByCode.has(referralZoomCode) ? [referralZoomCode] : []),
          ],
          medicationCodes: safeMap(att.Medication, m => m.StockItem?.isNHISCovered ? m.StockItem?.drugCode : null),
          serviceCodes: safeMap(att.ServiceRendered, s => s.ServiceCatalog?.nhisServiceCode),
          gdrgCodes: [tariff.gdrgCode], nhisServiceCodes: tariff.nhisServiceCode ? [tariff.nhisServiceCode] : [],
          principalGDRG: tariff.gdrgCode, claimCheckCode: att.nhisCCC,
          typeOfService, serviceOutcome,
          mdcCode: specialty, typeOfAttendance: typeOfAtt, datesOfService,
          metadata: att.referral?.referralType === 'outgoing' ? { referringFacility: att.referral.referredToFacility ?? '' } : undefined,
          notes: `NHIS CCC: ${att.nhisCCC}, GDRG: ${tariff.gdrgCode}`,
          items: {
            create: [
              {
                itemCategory: 'gdrg',
                itemType: 'GDRG',
                code: tariff.gdrgCode,
                description: `NHIS G-DRG tariff ${tariff.gdrgCode}`,
                quantity: 1,
                unitPrice: tariff.nhiaTariff,
                lineTotal: tariff.nhiaTariff,
                serviceDate: servicePolicyDate,
                gdrgTariffId: tariff.id
              },
              ...supportingItems,
              ...nhisMedicineItems,
            ] .map((item, index) => ({
               ...item,
               itemNumber: index + 1,
               clinician: physicianLicense || undefined,
               prescriberNo: physicianLicense || undefined,
             }))
          }
        },
        include: { items: { orderBy: { itemNumber: 'asc' } } }
      });
      return { claim, gdrgDetails: tariff, isExisting: false };
      });
    } catch (error) {
      // The unique attendanceId constraint is the final guard when requests race.
      // Recover only that conflict as an idempotent retry; rethrow other unique errors.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        String(error.meta?.target ?? '').toLowerCase().includes('attendanceid')
      ) {
        const existing = await this.findExistingClaim(
          this.prisma as unknown as Prisma.TransactionClient,
          attendanceId,
          'nhis',
        );
        if (existing) return { claim: existing, isExisting: true };
      }
      throw error;
    }
  }
  async getNHISClaims(status?: string, patientId?: string, startDate?: Date, endDate?: Date, page = 1, limit = 50) {
    const where: any = { InsuranceProvider: { type: 'nhis' } };
    if (status) where.status = status;
    if (patientId) where.patientId = patientId;
    if (startDate || endDate) {
      where.Attendance = {};
      if (startDate) where.Attendance.dateTime = { ...where.Attendance.dateTime, gte: startDate };
      if (endDate) { const d = new Date(endDate); d.setHours(23, 59, 59, 999); where.Attendance.dateTime = { ...where.Attendance.dateTime, lte: d }; }
    }

    const pageNum = Math.max(1, page);
    const limitNum = Math.min(100, limit);
    const skip = (pageNum - 1) * limitNum;

    const [claims, total] = await Promise.all([
      this.prisma.insuranceClaim.findMany({ where, include: { InsuranceProvider: { select: { id: true, name: true, type: true } }, Patient: { select: { id: true, folderNumber: true, surname: true, otherNames: true } }, Attendance: { select: { id: true, attendanceNumber: true, dateTime: true, nhisCCC: true } }, Bill: { select: { id: true, billNumber: true, totalAmount: true } }, items: CLAIM_LINE_LIST_SELECT }, orderBy: { createdAt: 'desc' }, skip, take: limitNum }),
      this.prisma.insuranceClaim.count({ where })
    ]);

    return { data: claims, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } };
  }

  async getPrivateInsuranceClaims(status?: string, patientId?: string, startDate?: Date, endDate?: Date, page = 1, limit = 50) {
    const where: any = { InsuranceProvider: { type: 'private' } };
    if (status) where.status = status;
    if (patientId) where.patientId = patientId;
    if (startDate || endDate) {
      where.Attendance = {};
      if (startDate) where.Attendance.dateTime = { ...where.Attendance.dateTime, gte: startDate };
      if (endDate) {
        const d = new Date(endDate);
        d.setHours(23, 59, 59, 999);
        where.Attendance.dateTime = { ...where.Attendance.dateTime, lte: d };
      }
    }

    const pageNum = Math.max(1, page);
    const limitNum = Math.min(100, limit);
    const skip = (pageNum - 1) * limitNum;
    const [claims, total] = await Promise.all([
      this.prisma.insuranceClaim.findMany({
        where,
        include: {
          InsuranceProvider: { select: { id: true, name: true, type: true, coveragePercentage: true } },
          Patient: { select: { id: true, folderNumber: true, surname: true, otherNames: true } },
          Attendance: { select: { id: true, attendanceNumber: true, dateTime: true } },
          Bill: { select: { id: true, billNumber: true, totalAmount: true } },
          items: CLAIM_LINE_LIST_SELECT,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      this.prisma.insuranceClaim.count({ where }),
    ]);
    return { data: claims, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } };
  }

  // ==========================================
  // PRIVATE INSURANCE SERVICES (Fully Restored)
  // ==========================================
  /**
   * Build payer-priced claim lines directly from completed attendance records.
   * Private/corporate claims intentionally have no Bill or BillLineItem dependency.
   */
  private async buildDirectPayerClaimItems(
    tx: Prisma.TransactionClient,
    att: any,
    payer: 'private_insurance' | 'corporate',
    coveragePercentage = 100,
    corporateDiscountPercentage = 0,
  ) {
    const serviceDate = new Date(att.dateTime);
    const lines: any[] = [];
    const money = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
    const addCatalogLine = async (record: any, catalog: any, quantity: number, category: string, source: string, id: string) => {
      if (!catalog) throw new ValidationError(`Cannot generate this claim: ${source} "${record.name || record.description || id}" has no linked service-catalog item.`);
      const pricing = await tx.servicePricing.findFirst({
        where: { serviceCatalogId: catalog.id, isActive: true, effectiveDate: { lte: serviceDate }, OR: [{ expiryDate: null }, { expiryDate: { gt: serviceDate } }] },
        orderBy: { effectiveDate: 'desc' },
      });
      if (!pricing) throw new ValidationError(`Cannot price ${catalog.name}: no active tariff exists for the date of service.`);
      const qty = Number(quantity || 1);
      if (!Number.isFinite(qty) || qty <= 0) throw new ValidationError(`Cannot price ${catalog.name}: quantity is invalid.`);
      const priceRow = { cashPrice: pricing.cashPrice, insurancePrice: pricing.insurancePrice, corporatePrice: pricing.corporatePrice };
      let unit = payer === 'corporate'
        ? resolveMedicationUnitPrice(priceRow, 'corporate', { corporateDiscountPercent: corporateDiscountPercentage })
        : resolveMedicationUnitPrice(priceRow, 'private_insurance');
      if (String(catalog.serviceType).toLowerCase() !== 'medication') {
        unit = payer === 'corporate'
          ? resolveUnitPrice(priceRow, 'corporate', { corporateDiscountPercent: corporateDiscountPercentage })
          : resolveUnitPrice(priceRow, 'private_insurance', { isPrivateInsuranceExempted: catalog.isPrivateInsuranceExempted });
      }
      const gross = money(unit * qty);
      const covered = payer === 'private_insurance'
        ? (isPayerCovered(priceRow, 'private_insurance', { isPrivateInsuranceExempted: catalog.isPrivateInsuranceExempted })
            ? money(gross * Math.min(100, Math.max(0, coveragePercentage)) / 100)
            : 0)
        : gross;
      if (covered <= 0) return;
      const type = String(catalog.serviceType || '').toLowerCase();
      const itemCategory = category || (type === 'lab_test' || type === 'scan' ? 'investigation' : type === 'medication' ? 'medicine' : type === 'procedure' ? 'procedure' : 'service');
      const code = source === 'lab'
        ? String(record.LabTestTemplate?.investigationCode ?? catalog.nhisServiceCode ?? '').trim().toUpperCase()
        : source === 'scan'
          ? String(record.ScanTemplate?.investigationCode ?? catalog.nhisServiceCode ?? '').trim().toUpperCase()
          : source === 'procedure'
            ? String(record.ProcedureTemplate?.procedureCode ?? catalog.nhisServiceCode ?? '').trim().toUpperCase()
            : source === 'medication'
              ? String(record.StockItem?.drugCode ?? catalog.code ?? '').trim().toUpperCase()
              : String(catalog.nhisServiceCode ?? catalog.code ?? type.toUpperCase()).trim().toUpperCase();
      if ((source === 'lab' || source === 'scan') && !/^INVE[0-9]/.test(code)) {
        throw new ValidationError(`Cannot generate this claim: ${source} "${catalog.name}" has no valid NHIS INVE investigation code.`);
      }
      if (source === 'procedure' && (!code || /^PROC-/i.test(code))) {
        throw new ValidationError(`Cannot generate this claim: procedure "${catalog.name}" has no valid NHIS procedure tariff code.`);
      }
      if (source === 'medication' && !code) {
        throw new ValidationError(`Cannot generate this claim: medicine "${catalog.name}" has no canonical drug code.`);
      }
      lines.push({
        itemCategory: itemCategory as any,
        itemType: type || source,
        code,
        description: catalog.name || record.name || record.description || source,
        quantity: qty,
        unitPrice: money(covered / qty),
        lineTotal: covered,
        serviceDate: record.completedAt || record.performedAt || record.date || record.dispensedAt || serviceDate,
        serviceCatalogId: catalog.id,
        ...(source === 'medication' ? { medicationId: id } : {}),
        ...(source === 'lab' ? { labTestId: id } : {}),
        ...(source === 'scan' ? { scanId: id } : {}),
        ...(source === 'procedure' ? { procedureId: id } : {}),
      });
    };

    for (const row of att.ServiceRendered || []) await addCatalogLine(row, row.ServiceCatalog, row.quantity, 'service', 'service', row.id);
    for (const row of att.LabTest || []) if (row.status === 'completed') await addCatalogLine(row, row.ServiceCatalog, 1, 'investigation', 'lab', row.id);
    for (const row of att.Scan || []) if (row.status === 'completed') await addCatalogLine(row, row.ServiceCatalog, 1, 'investigation', 'scan', row.id);
    for (const row of att.Procedure || []) if (row.status === 'completed') await addCatalogLine(row, row.ServiceCatalog, 1, 'procedure', 'procedure', row.id);
    for (const row of att.Medication || []) if (['dispensed', 'administered'].includes(row.status)) await addCatalogLine(row, row.ServiceCatalog, row.quantity, 'medicine', 'medication', row.id);

    if (!lines.length) throw new ValidationError(`Attendance ${att.attendanceNumber} has no completed, priced services or dispensed medicines eligible for this claim.`);
    return lines.map((line, index) => ({ ...line, itemNumber: index + 1 }));
  }

  async generatePrivateInsuranceClaim(attendanceId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      if (!attendanceId) throw new ValidationError('attendanceId is required');
      const existing = await this.findExistingClaim(tx, attendanceId, 'private');
      if (existing) return { claim: existing, isExisting: true };
      const att = await tx.attendance.findUnique({ where: { id: attendanceId }, include: {
        Patient: true, InsuranceProvider: true, AttendanceDiagnosis: { include: { Diagnosis: true } },
        ServiceRendered: { include: { ServiceCatalog: true } }, LabTest: { include: { ServiceCatalog: true, LabTestTemplate: true } },
        Medication: { include: { ServiceCatalog: true, StockItem: true } }, Procedure: { include: { ServiceCatalog: true, ProcedureTemplate: true } },
        Scan: { include: { ServiceCatalog: true, ScanTemplate: true } },
      }});
      if (!att) throw new NotFoundError('Attendance', attendanceId);
      if (!att.patientId) throw new ValidationError(`Attendance ${att.attendanceNumber} has no registered patient, so no claim can be filed for it.`);
      if (!att.InsuranceProvider || att.InsuranceProvider.type !== 'private') throw new ValidationError(`Attendance ${att.attendanceNumber} is not a private-insurance visit. Select a private insurance provider on the attendance first.`);
      const coverage = Math.min(100, Math.max(0, Number(att.InsuranceProvider.coveragePercentage) || 0));
      const items = await this.buildDirectPayerClaimItems(tx, att, 'private_insurance', coverage);
      const total = Math.round(items.reduce((sum: number, item: any) => sum + toNumber(item.lineTotal), 0) * 100) / 100;
      if (!Number.isFinite(total) || total <= 0) throw new ValidationError('The private-insurance claim amount must be greater than zero.');
      const claim = await tx.insuranceClaim.create({ data: {
        claimNumber: getCounterService().nextPrivateClaimNumber(), billId: null, patientId: att.patientId, attendanceId: att.id,
        insuranceProviderId: att.insuranceProviderId!, totalClaimAmount: total, status: 'draft', createdById: userId,
        metadata: { source: 'attendance_direct', coveragePercentage: coverage },
        diagnosisCodes: safeMap(att.AttendanceDiagnosis, (d: any) => d.Diagnosis?.icdCode),
        procedureCodes: safeMap(att.Procedure, (p: any) => p.ProcedureTemplate?.procedureCode ?? p.ServiceCatalog?.nhisServiceCode),
        labTestCodes: safeMap(att.LabTest, (l: any) => l.status === 'completed' ? (l.LabTestTemplate?.investigationCode ?? l.ServiceCatalog?.nhisServiceCode) : null),
        scanCodes: safeMap(att.Scan, (s: any) => s.status === 'completed' ? (s.ScanTemplate?.investigationCode ?? s.ServiceCatalog?.nhisServiceCode) : null),
        serviceCodes: safeMap(att.ServiceRendered, (s: any) => s.ServiceCatalog?.code),
        medicationCodes: safeMap(att.Medication, (m: any) => ['dispensed', 'administered'].includes(m.status) ? (m.StockItem?.drugCode || m.ServiceCatalog?.code) : null),
        notes: 'Private insurance claim - generated directly from attendance services; no bill created.',
        items: { create: items },
      }, include: { items: { orderBy: { itemNumber: 'asc' } } }});
      return { claim, isExisting: false };
    });
  }

  async generateCorporateClaim(attendanceId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      if (!attendanceId) throw new ValidationError('attendanceId is required');
      const existing = await this.findExistingClaim(tx, attendanceId, 'corporate');
      if (existing) return { claim: existing, isExisting: true };
      const att = await tx.attendance.findUnique({ where: { id: attendanceId }, include: {
        Patient: true, InsuranceProvider: true, CorporateAccount: true, AttendanceDiagnosis: { include: { Diagnosis: true } },
        ServiceRendered: { include: { ServiceCatalog: true } },
        LabTest: { include: { ServiceCatalog: true, LabTestTemplate: true } },
        Medication: { include: { ServiceCatalog: true, StockItem: true } },
        Procedure: { include: { ServiceCatalog: true, ProcedureTemplate: true } },
        Scan: { include: { ServiceCatalog: true, ScanTemplate: true } }, Admission: true,
      }});
      if (!att) throw new NotFoundError('Attendance', attendanceId);
      if (!att.patientId) throw new ValidationError(`Attendance ${att.attendanceNumber} has no registered patient, so no claim can be filed for it.`);
      if (!att.InsuranceProvider || att.InsuranceProvider.type !== 'corporate') throw new ValidationError(`Attendance ${att.attendanceNumber} is not a corporate visit. Select a corporate provider on the attendance first.`);
      if (!att.corporateAccountId) throw new ValidationError(`Attendance ${att.attendanceNumber} has no corporate account linked.`);
      const corp = await tx.corporateAccount.findUnique({ where: { id: att.corporateAccountId } });
      if (!corp) throw new NotFoundError('Corporate account', att.corporateAccountId);
      if (!corp.isActive) throw new ValidationError(`Corporate account "${corp.companyName}" is inactive.`);
      if (!corp.insuranceProviderId) throw new ValidationError(`Configure an insurance provider on corporate account "${corp.companyName}" before generating claims.`);
      if (att.insuranceProviderId && att.insuranceProviderId !== corp.insuranceProviderId) throw new ValidationError(`The insurance provider selected for attendance ${att.attendanceNumber} does not match corporate account "${corp.companyName}".`);
      const items = await this.buildDirectPayerClaimItems(tx, att, 'corporate', 100, Number(corp.discountPercentage) || 0);
      const claimAmt = Math.round(items.reduce((sum: number, item: any) => sum + toNumber(item.lineTotal), 0) * 100) / 100;
      const outstanding = await tx.insuranceClaim.aggregate({ where: { corporateAccountId: att.corporateAccountId, status: 'finalized' }, _sum: { totalClaimAmount: true } });
      const currentBal = toNumber(outstanding._sum?.totalClaimAmount), projected = currentBal + claimAmt, limit = toNumber(corp.creditLimit);
      if (limit > 0 && projected > limit) throw new ValidationError(`Exceeds credit limit. Current: GHS ${currentBal.toFixed(2)}, New claim: GHS ${claimAmt.toFixed(2)}, Limit: GHS ${limit.toFixed(2)}.`);
      const claim = await tx.insuranceClaim.create({ data: {
        claimNumber: getCounterService().nextCorporateClaimNumber(), billId: null, patientId: att.patientId, attendanceId: att.id,
        insuranceProviderId: corp.insuranceProviderId, corporateAccountId: att.corporateAccountId, totalClaimAmount: claimAmt,
        status: 'draft', createdById: userId, metadata: { source: 'attendance_direct', discountPercentage: Number(corp.discountPercentage) || 0 },
        diagnosisCodes: safeMap(att.AttendanceDiagnosis, (d: any) => d.Diagnosis?.icdCode),
        procedureCodes: safeMap(att.Procedure, (p: any) => p.ProcedureTemplate?.procedureCode ?? p.ServiceCatalog?.nhisServiceCode),
        labTestCodes: safeMap(att.LabTest, (l: any) => l.status === 'completed' ? (l.LabTestTemplate?.investigationCode ?? l.ServiceCatalog?.nhisServiceCode) : null),
        scanCodes: safeMap(att.Scan, (s: any) => s.status === 'completed' ? (s.ScanTemplate?.investigationCode ?? s.ServiceCatalog?.nhisServiceCode) : null),
        serviceCodes: safeMap(att.ServiceRendered, (s: any) => s.ServiceCatalog?.code),
        medicationCodes: safeMap(att.Medication, (m: any) => m.status === 'dispensed' ? (m.StockItem?.drugCode || m.ServiceCatalog?.code) : null),
        notes: `Corporate claim - Employee ID: ${att.corporateEmployeeId || 'N/A'}. Generated directly from attendance services; no bill created.`,
        items: { create: items },
      }, include: { items: { orderBy: { itemNumber: 'asc' } } }});
      return { claim, isExisting: false, creditInfo: { currentBalance: currentBal, projectedBalance: projected, limit } };
    });
  }

// backend/src/modules/insuranceClaim/InsuranceClaimService.ts


// Add to InsuranceClaimService (backend/src/modules/insuranceClaim/InsuranceClaimService.ts)

/** Controller calls: service.listClaimsByType(type, filters) */
async listClaimsByType(
  type: 'nhis' | 'private' | 'corporate',
  filters: {
    status?: string;
    patientId?: string;
    corporateAccountId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    limit?: number;
  },
) {
  const { status, patientId, corporateAccountId, dateFrom, dateTo, page = 1, limit = 50 } = filters;

  let result;
  if (type === 'nhis') {
    result = await this.getNHISClaims(status, patientId, dateFrom, dateTo, page, limit);
  } else if (type === 'private') {
    result = await this.getPrivateInsuranceClaims(status, patientId, dateFrom, dateTo, page, limit);
  } else {
    result = await this.getCorporateClaims(status, patientId, dateFrom, dateTo, corporateAccountId, page, limit);
  }

  return {
    data: result.data,
    page: result.pagination.page,
    limit: result.pagination.limit,
    total: result.pagination.total,
    pagination: result.pagination,
  };
}

/** Controller calls: service.listClaims(filters) */
async listClaims(filters: {
  status?: string;
  insuranceProviderId?: string;
  corporateAccountId?: string;
  patientId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}) {
  return this.getAllInsuranceClaims(
    filters.status,
    filters.insuranceProviderId,
    filters.patientId,
    filters.dateFrom,
    filters.dateTo,
    filters.page ?? 1,
    filters.limit ?? 50,
  ).then((r) => ({
    data: r.data,
    page: r.pagination.page,
    limit: r.pagination.limit,
    total: r.pagination.total,
    pagination: r.pagination,
  }));
}

/** Read-only report for historical claims that have no itemized rows. */
async listClaimsMissingItems(filters: { insuranceType?: string; status?: string; page?: number; limit?: number } = {}) {
  const allowedTypes = new Set(['nhis', 'private', 'corporate']);
  if (filters.insuranceType && !allowedTypes.has(filters.insuranceType)) {
    throw new ValidationError('insuranceType must be nhis, private, or corporate');
  }
  const allowedStatuses = new Set(['draft', 'finalized']);
  if (filters.status && !allowedStatuses.has(filters.status)) {
    throw new ValidationError('status must be draft or finalized');
  }
  return this.repo.findClaimsMissingItems(filters);
}

/** Controller calls: service.getClaim(id) */
async getClaim(id: string) {
  return this.getInsuranceClaim(id);
}

/** Controller calls: service.generatePrivateClaim(id, uid) */
async generatePrivateClaim(attendanceId: string, userId: string) {
  return this.generatePrivateInsuranceClaim(attendanceId, userId);
}

/** Controller calls: service.updateDraftHeader(id, data, uid) */
async updateDraftHeader(claimId: string, data: any, userId: string) {
  if (data.typeOfService !== undefined || data.mdcCode !== undefined) {
    const claim = await this.prisma.insuranceClaim.findUnique({
      where: { id: claimId },
      select: { typeOfService: true, mdcCode: true, InsuranceProvider: { select: { type: true } } },
    });
    if (claim?.InsuranceProvider?.type === 'nhis') {
      const mismatch = findSpecialtyServiceMismatch(
        data.typeOfService ?? claim.typeOfService ?? 'OPD',
        [data.mdcCode ?? claim.mdcCode ?? '']
      );
      if (mismatch) throw new ValidationError(mismatch);
    }
  }
  return this.updateClaimDraft(claimId, data, userId);
}

/**
 * Controller calls: service.replaceClaimItems(id, items, uid)
 * Replaces ALL line items of a DRAFT claim with the given list (PUT /insurance-claims/:id/items).
 * Items are renumbered 1..n in the order received. The claim header total is not changed here.
 */
async replaceClaimItems(claimId: string, items: any[], userId: string) {
  const claim = await this.prisma.insuranceClaim.findUnique({ where: { id: claimId }, include: { InsuranceProvider: { select: { id: true, type: true } }, Attendance: { select: { id: true, patientId: true, dateTime: true, Admission: { select: { admissionDate: true } }, Medication: { include: { StockItem: { select: { id: true, drugCode: true, name: true, strength: true, unitOfMeasure: true } }, ServiceCatalog: { select: { id: true, code: true } } } } } } } });
  if (!claim) throw new NotFoundError('Claim', claimId);
  if (claim.status !== 'draft') throw new Error('Only draft claims can be edited');

  // The forms may send ids that are not valid foreign keys (e.g. a lab/scan *template* id in
  // `serviceCatalogId`). Keep only ids that exist, otherwise the whole save fails on the FK.
  const idsOf = (field: string) => Array.from(new Set((items || []).map((it: any) => it[field]).filter(Boolean))) as string[];
  const [catalogIds, diagnosisIds, tariffIds] = await Promise.all([
    this.prisma.serviceCatalog.findMany({ where: { id: { in: idsOf('serviceCatalogId') } }, select: { id: true } }),
    this.prisma.diagnosis.findMany({ where: { id: { in: idsOf('diagnosisId') } }, select: { id: true } }),
    this.prisma.gDRGTariff.findMany({ where: { id: { in: idsOf('gdrgTariffId') } }, select: { id: true } }),
  ]);
  const validCatalog = new Set(catalogIds.map(r => r.id));
  const validDiagnosis = new Set(diagnosisIds.map(r => r.id));
  const validTariff = new Set(tariffIds.map(r => r.id));
  const requestedBillLineIds = idsOf('billLineItemId');
  const billLineRows = claim.billId && requestedBillLineIds.length
    ? await this.prisma.billLineItem.findMany({
        where: {
          id: { in: requestedBillLineIds },
          billId: claim.billId,
          isVoided: false,
        },
        select: { id: true },
      })
    : [];
  const validBillLineIds = new Set(billLineRows.map((row: any) => row.id));
  const medicationById = new Map((claim.Attendance?.Medication ?? []).map((med: any) => [med.id, med]));
  const medicationsByCode = new Map<string, any[]>();
  for (const med of claim.Attendance?.Medication ?? []) {
    const code = med.StockItem?.drugCode;
    if (!code) continue;
    const rows = medicationsByCode.get(code) ?? [];
    rows.push(med);
    medicationsByCode.set(code, rows);
  }
  const snapshotAt = new Date();

  const rows = (items || []).map((it: any, idx: number) => {
    const codeMatches = medicationsByCode.get(String(it.code ?? '')) ?? [];
    const medication = it.medicationId
      ? medicationById.get(it.medicationId)
      : codeMatches.length === 1 && it.itemCategory === 'medicine' ? codeMatches[0] : null;
    const prescriptionSnapshot = medication ? {
      medicationId: medication.id,
      name: medication.name,
      stockItemId: medication.stockItemId,
      medicineStrength: medication.StockItem?.strength ?? null,
      doseAmount: medication.doseAmount?.toString?.() ?? null,
      doseUnit: medication.doseUnit ?? null,
      dosageText: medication.dosage ?? null,
      frequencyCode: medication.frequencyCode ?? null,
      frequencyText: medication.frequency ?? null,
      frequencyIntervalHours: medication.frequencyIntervalHours ?? null,
      durationValue: medication.durationValue ?? null,
      durationUnit: medication.durationUnit ?? null,
      durationText: medication.duration ?? null,
      route: medication.route ?? null,
      instructions: medication.instructions ?? null,
      prnIndication: medication.prnIndication ?? null,
      prnMaxDosesPerDay: medication.prnMaxDosesPerDay ?? null,
      prnMinimumIntervalHours: medication.prnMinimumIntervalHours ?? null,
      prescribedQuantity: medication.quantity,
      quantityUnit: medication.quantityUnit ?? medication.StockItem?.unitOfMeasure ?? null,
      dispensedQuantity: medication.dispensedQuantity ?? null,
      dispensedAt: medication.dispensedAt?.toISOString?.() ?? null,
      prescribedAt: medication.prescribedAt?.toISOString?.() ?? null,
      prescribedById: medication.prescribedById,
      prescriptionVersion: medication.prescriptionVersion ?? 1,
    } : null;
    const quantity = it.quantity ?? 1;
    const unitPrice = it.unitPrice ?? 0;
    const serviceDate = it.serviceDate ? new Date(it.serviceDate) : null;
    return {
      claimId,
      itemNumber: idx + 1,
      itemCategory: it.itemCategory,
      itemType: it.itemType ?? null,
      code: it.code,
      description: it.description,
      quantity,
      noOfDays: it.noOfDays ?? null,
      unitPrice,
      lineTotal: it.lineTotal ?? quantity * unitPrice,
      serviceDate: serviceDate && !isNaN(serviceDate.getTime()) ? serviceDate : null,
      clinician: it.clinician ?? null,
      prescriberNo: it.prescriberNo ?? null,
      prescriptionText: it.prescriptionText ?? (medication ? [medication.dosage, medication.frequency, medication.duration].filter(Boolean).join(' · ') : null),
      prescriptionSnapshot: prescriptionSnapshot ?? Prisma.DbNull,
      prescriptionSnapshotAt: prescriptionSnapshot ? snapshotAt : null,
      prescriptionSnapshotVersion: prescriptionSnapshot ? (medication.prescriptionVersion ?? 1) : null,
      serviceCatalogId: it.serviceCatalogId && validCatalog.has(it.serviceCatalogId) ? it.serviceCatalogId : null,
      diagnosisId: it.diagnosisId && validDiagnosis.has(it.diagnosisId) ? it.diagnosisId : null,
      gdrgTariffId: it.gdrgTariffId && validTariff.has(it.gdrgTariffId) ? it.gdrgTariffId : null,
      // Preserve bill traceability only when the line is active and belongs to this claim's bill.
      billLineItemId: it.billLineItemId && validBillLineIds.has(it.billLineItemId)
        ? it.billLineItemId
        : null,
      labTestId: null,
      scanId: null,
      procedureId: null,
      medicationId: medication ? medication.id : null,
    };
  });

  let totalClaimAmount: number | undefined;
  // Non-NHIS claim totals must reconcile to the edited line items. Corporate discounts
  // are applied to the lines as well as the header so a saved claim never has mismatched totals.
  const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
  if (claim.InsuranceProvider?.type !== 'nhis') {
    // Corporate claims are identified by their corporate account; their linked
    // insurance provider may legitimately have type "private".
    if (claim.corporateAccountId) {
      const rawDiscount = Number((claim.metadata as any)?.discountPercentage ?? 0);
      if (!Number.isFinite(rawDiscount) || rawDiscount < 0 || rawDiscount > 100) {
        throw new ValidationError('Corporate claim discount must be between 0 and 100 percent.');
      }
      if (rawDiscount > 0) {
        const factor = (100 - rawDiscount) / 100;
        for (const row of rows) {
          row.lineTotal = money(Number(row.lineTotal) * factor);
          row.unitPrice = Number(row.quantity) > 0
            ? money(row.lineTotal / Number(row.quantity))
            : 0;
        }
      }
    }
    totalClaimAmount = money(rows.reduce((sum, row) => sum + Number(row.lineTotal || 0), 0));
  }

  // Preserve validated NHIS header fields outside the validation block so the
  // transaction below can keep the claim header consistent with its line items.
  let nhisPrincipalGdrg: string | undefined;
  let nhisServiceCode: string | null | undefined;
  const authorizationNumbers = new Set<string>();
  if (claim.InsuranceProvider?.type === 'nhis') {
    let gdrgRow = rows.find(r => r.itemCategory === 'gdrg');
    const gdrgCode = gdrgRow?.code || claim.principalGDRG;
    const policyDate = new Date(claim.Attendance?.dateTime ?? claim.Attendance?.Admission?.admissionDate ?? claim.createdAt);
    if (Number.isNaN(policyDate.getTime())) {
      throw new ValidationError('NHIS claim cannot be edited because its attendance service date is invalid.');
    }
    if (!gdrgCode) {
      throw new ValidationError('NHIS claim requires a G-DRG code. Select a valid G-DRG tariff before saving the claim.');
    }
    const tariff = await this.prisma.gDRGTariff.findFirst({
      where: {
        gdrgCode,
        isActive: true,
        effectiveFrom: { lte: policyDate },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: policyDate } }],
      },
      select: { id: true, nhiaTariff: true, nhisServiceCode: true },
    });
    if (!tariff || !Number.isFinite(Number(tariff.nhiaTariff)) || Number(tariff.nhiaTariff) <= 0) {
      throw new ValidationError(`NHIS claim G-DRG "${gdrgCode}" has no valid active tariff for the service date ${policyDate.toISOString().slice(0, 10)}. Activate or correct its tariff before saving the claim.`);
    }
    nhisPrincipalGdrg = gdrgCode;
    nhisServiceCode = tariff.nhisServiceCode;
    const gdrgAmount = Number(tariff.nhiaTariff);
    if (!gdrgRow) {
      // The G-DRG is the principal payable line. Add it when a draft payload
      // omits it so the saved claim items cannot silently disagree with the header.
      gdrgRow = {
        claimId,
        itemNumber: 1,
        itemCategory: 'gdrg',
        itemType: null,
        code: gdrgCode,
        description: `G-DRG ${gdrgCode}`,
        quantity: 1,
        noOfDays: null,
        unitPrice: gdrgAmount,
        lineTotal: gdrgAmount,
        serviceDate: policyDate,
        clinician: null,
        prescriberNo: null,
        prescriptionText: null,
        serviceCatalogId: null,
        diagnosisId: null,
        gdrgTariffId: tariff.id,
        billLineItemId: null,
        labTestId: null,
        scanId: null,
        procedureId: null,
        medicationId: null,
        prescriptionSnapshot: Prisma.DbNull,
        prescriptionSnapshotAt: null,
        prescriptionSnapshotVersion: null,
      };
      rows.unshift(gdrgRow);
      rows.forEach((row, index) => { row.itemNumber = index + 1; });
    } else {
      gdrgRow.unitPrice = gdrgAmount;
      gdrgRow.lineTotal = gdrgAmount;
      gdrgRow.gdrgTariffId = tariff.id;
    }

    const medRows = rows.filter(r => r.itemCategory === 'medicine');
    let medicinesTotal = 0;
    const attendance = claim.Attendance;
    const suppliedMedicines = attendance?.Medication ?? [];
    const authorisations = attendance && claim.insuranceProviderId
      ? await this.prisma.preAuthorisationRequest.findMany({
          where: {
            attendanceId: attendance.id,
            // A claim is only ever raised for a registered patient, so the attendance
            // behind it always carries one; a counter ticket never reaches this path.
            patientId: attendance.patientId as string,
            insuranceProviderId: claim.insuranceProviderId,
            status: { in: ['approved', 'partially_approved'] },
            authNumber: { not: null },
            authExpiry: { gt: policyDate },
          },
          select: { authNumber: true, approvedServices: true },
        })
      : [];
    const claimedQuantityByStockItem = new Map<string, number>();
    for (const row of medRows) {
      const rowPolicyDate = row.serviceDate ?? policyDate;
      const catalog = await this.prisma.serviceCatalog.findFirst({
        where: { OR: [{ code: row.code }, { nhisServiceCode: row.code }, { StockItem: { drugCode: row.code } }] },
        select: {
          code: true,
          StockItem: {
            select: {
              id: true,
              drugCode: true,
              isNHISCovered: true,
              payerRules: {
                where: { insuranceProviderId: claim.insuranceProviderId },
                select: {
                  isCovered: true, authorizationRequired: true, prescribingLevel: true,
                  effectiveFrom: true, effectiveTo: true, tariffPrice: true,
                  copaymentMode: true, copaymentAmount: true, copaymentPercentage: true,
                },
              },
            },
          },
          pricing: {
            where: { isActive: true, effectiveDate: { lte: rowPolicyDate }, OR: [{ expiryDate: null }, { expiryDate: { gt: rowPolicyDate } }] },
            orderBy: { effectiveDate: 'desc' },
            take: 1,
            select: { cashPrice: true, nhisPrice: true },
          },
        },
      });
      const rule = catalog?.StockItem?.payerRules?.[0];
      const currentPricing = catalog?.pricing?.[0];
      // Say which part of the policy is missing: a medicine with no rule at all is a
      // patient-pay item, while an uncovered or out-of-date rule is a configuration gap.
      if (!catalog?.StockItem) {
        throw new ValidationError(`NHIS claim medicine "${row.description}" is not a stocked medicine this claim can be billed against.`);
      }
      if (catalog.StockItem.isNHISCovered !== true) {
        throw new ValidationError(`NHIS claim medicine "${row.description}" has a facility catalogue code and is not listed as NHIS-covered.`);
      }
      if (!rule) {
        throw new ValidationError(`NHIS claim medicine "${row.description}" has no NHIS payer rule, so it is not on the medicine list this scheme pays. It is patient-pay: remove the line or replace it with a covered item.`);
      }
      if (rule.isCovered !== true) {
        throw new ValidationError(`NHIS claim medicine "${row.description}" is on the NHIS list but marked not covered by this scheme.`);
      }
      if (!['A', 'M', 'B1', 'B2', 'C', 'D', 'SM'].includes(String(rule.prescribingLevel ?? '').trim().toUpperCase())) {
        throw new ValidationError(`NHIS claim medicine "${row.description}" has no valid prescribing level. Configure it in the medicine payer rule.`);
      }
      if ((rule.effectiveFrom && rule.effectiveFrom > rowPolicyDate) || (rule.effectiveTo && rule.effectiveTo < rowPolicyDate)) {
        throw new ValidationError(`NHIS claim medicine "${row.description}" has a payer rule that is not in force on the service date ${rowPolicyDate.toISOString().slice(0, 10)}.`);
      }
      // A payer tariff alone is not enough to safely calculate the patient/NHIS
      // allocation: require an active cash-price record as the allocation ceiling.
      if (!currentPricing || !Number.isFinite(Number(currentPricing.cashPrice)) || Number(currentPricing.cashPrice) <= 0) {
        throw new ValidationError(`NHIS claim medicine "${row.description}" has no valid active cash price. Configure current medicine pricing before adding it to an NHIS claim.`);
      }
      const configuredTariff = rule.tariffPrice ?? currentPricing.nhisPrice;
      if (configuredTariff == null || !Number.isFinite(Number(configuredTariff)) || Number(configuredTariff) <= 0) {
        throw new ValidationError(`NHIS claim medicine "${row.description}" has no valid NHIS tariff. Configure the payer-rule tariff or active NHIS price before claiming it.`);
      }
      // Prefer the canonical stock-item identity. A matching drug/service code is
      // only a safe fallback when the prescription record has no stock-item relation;
      // otherwise a reused code must never pull quantities from a different item.
      const matchesDispensedStockItem = (med: any) => {
        if (med.StockItem?.id) return med.StockItem.id === catalog.StockItem?.id;
        return !!row.code && (
          med.StockItem?.drugCode === row.code ||
          med.ServiceCatalog?.code === row.code
        );
      };
      const matchingSuppliedMedicines = suppliedMedicines.filter((med: any) =>
        ['prescribed', 'dispensed', 'administered'].includes(String(med.status)) && matchesDispensedStockItem(med)
      );
      if (!matchingSuppliedMedicines.length) {
        throw new ValidationError(`NHIS claim medicine "${row.description}" does not match an active prescription for this attendance. Select a medicine prescribed for this attendance before saving the claim.`);
      }
      // Quantity is editable, but cannot exceed the quantity prescribed on this attendance.
      // Track totals across rows too, so duplicate lines cannot inflate the claim.
      const suppliedQuantity = matchingSuppliedMedicines.reduce((sum: number, med: any) => sum + Number(med.quantity ?? 0), 0);
      const rowQuantity = Number(row.quantity);
      const alreadyClaimedQuantity = claimedQuantityByStockItem.get(catalog.StockItem?.id ?? '') ?? 0;
      if (!Number.isInteger(rowQuantity) || rowQuantity <= 0 || alreadyClaimedQuantity + rowQuantity > suppliedQuantity) {
        throw new ValidationError(`NHIS claim medicine "${row.description}" quantity (${row.quantity}) exceeds the prescribed quantity for this attendance (${suppliedQuantity - alreadyClaimedQuantity} remaining).`);
      }
      claimedQuantityByStockItem.set(catalog.StockItem?.id ?? '', alreadyClaimedQuantity + rowQuantity);
      // A null authorizationRequired is the imported NHIS list not stating the flag, so only an
      // explicit true demands a pre-authorisation.
      if (rule.authorizationRequired === true) {
        // A stock item may have more than one dispensed row/service-catalog link.
        // Accept authorisation for the canonical stock item or any exact catalog
        // identity attached to those matching dispensed rows, never an unrelated
        // row that merely shares a drug code.
        const matchingServiceCatalogIds = new Set<string>(
          matchingSuppliedMedicines
            .map((med: any) => med.serviceCatalogId)
            .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0),
        );
        const approval = authorisations.find((candidate: any) =>
          approvedServicesCoverPrescription(candidate.approvedServices, {
            stockItemId: catalog.StockItem?.id ?? '',
            serviceCatalogId: '',
          }, rowQuantity) ||
          Array.from(matchingServiceCatalogIds).some(serviceCatalogId =>
            approvedServicesCoverPrescription(candidate.approvedServices, {
              stockItemId: catalog.StockItem?.id ?? '',
              serviceCatalogId,
            }, rowQuantity),
          ),
        );
        if (!approval?.authNumber) {
          throw new ValidationError(`NHIS claim medicine "${row.description}" requires a current, explicit pre-authorisation. The claim item cannot be saved without it.`);
        }
        authorizationNumbers.add(approval.authNumber);
      }
      let allocation;
      try {
        allocation = calculateNHISMedicineAllocation({
          cashPrice: Number(currentPricing?.cashPrice ?? 0),
          nhisTariff: Number(rule.tariffPrice ?? currentPricing?.nhisPrice ?? 0),
          covered: true,
          copaymentMode: rule.copaymentMode,
          copaymentAmount: rule.copaymentAmount == null ? null : Number(rule.copaymentAmount),
          copaymentPercentage: rule.copaymentPercentage ?? null,
        });
      } catch (error) {
        throw new ValidationError(`NHIS claim medicine "${row.description}" cannot be priced: ${error instanceof Error ? error.message : 'invalid payer policy'}`);
      }
      row.unitPrice = allocation.nhisCoveredAmount;
      row.lineTotal = Math.round(row.unitPrice * row.quantity * 100) / 100;
      medicinesTotal += row.lineTotal;
    }
    totalClaimAmount = Math.round((gdrgAmount + medicinesTotal) * 100) / 100;
  }

  if (!userId || !String(userId).trim()) throw new ValidationError('An authenticated user is required to edit claim items');

  await this.prisma.$transaction(async (tx) => {
    const replaced = await tx.insuranceClaimItem.deleteMany({ where: { claimId } });
    if (rows.length) await tx.insuranceClaimItem.createMany({ data: rows });
    const updatedClaim = await tx.insuranceClaim.update({
      where: { id: claimId },
      data: {
        updatedById: userId,
        updatedAt: new Date(),
        ...(totalClaimAmount !== undefined
          ? {
              totalClaimAmount,
              principalGDRG: nhisPrincipalGdrg ?? null,
              gdrgCodes: nhisPrincipalGdrg ? [nhisPrincipalGdrg] : [],
              nhisServiceCodes: nhisServiceCode ? [nhisServiceCode] : [],
              // Keep the claim header in sync with the G-DRG and medicines still
              // present after editing claim lines; remove stale authorisation numbers.
              preAuthNumber: authorizationNumbers.size ? Array.from(authorizationNumbers).join(',') : null,
            }
          : {}),
      },
    });

    const categoryCounts = rows.reduce((counts: Record<string, number>, row: any) => {
      const category = String(row.itemCategory || 'other');
      counts[category] = (counts[category] || 0) + 1;
      return counts;
    }, {});
    await appendAuditLogWithinTransaction(tx, {
      entityType: 'InsuranceClaim',
      entityId: claimId,
      action: 'update',
      performedById: userId,
      previousState: { itemCount: replaced.count },
      newState: {
        itemCount: rows.length,
        ...(totalClaimAmount !== undefined ? { totalClaimAmount } : {}),
      },
      metadata: {
        workflow: 'draft_claim_items_replaced',
        payerType: claim.InsuranceProvider?.type ?? 'unknown',
        itemCategoryCounts: categoryCounts,
        clinicalAndPrescriptionContentOmitted: true,
      },
    });
    return updatedClaim;
  });

  return this.getInsuranceClaim(claimId);
}


async getCorporateClaims(
  status?: string,
  patientId?: string,
  startDate?: Date,
  endDate?: Date,
  corpId?: string,
  page = 1,
  limit = 50
) {
  // Corporate claims are identified by `corporateAccountId`, NOT by provider type:
  // a corporate account is normally billed through a private-type insurance provider,
  // so filtering on InsuranceProvider.type === 'corporate' silently hides them.
  const where: any = { corporateAccountId: { not: null } };
  if (status) where.status = status;
  if (patientId) where.patientId = patientId;
  if (corpId) where.corporateAccountId = corpId;
  if (startDate || endDate) {
    where.Attendance = {};
    if (startDate) where.Attendance.dateTime = { ...where.Attendance.dateTime, gte: startDate };
    if (endDate) {
      const d = new Date(endDate);
      d.setHours(23, 59, 59, 999);
      where.Attendance.dateTime = { ...where.Attendance.dateTime, lte: d };
    }
  }

  const pageNum = Math.max(1, page);
  const limitNum = Math.min(100, limit);
  const skip = (pageNum - 1) * limitNum;

  const [claims, total] = await Promise.all([
    this.prisma.insuranceClaim.findMany({
      where,
      include: {
        InsuranceProvider: { select: { id: true, name: true, type: true } },
        CorporateAccount: { select: { id: true, companyName: true } },
        Patient: { select: { id: true, folderNumber: true, surname: true, otherNames: true } },
        Attendance: {
          select: {
            id: true,
            attendanceNumber: true,
            dateTime: true,
            corporateEmployeeId: true,
          },
        },
        Bill: { select: { id: true, billNumber: true, totalAmount: true } },
        items: CLAIM_LINE_LIST_SELECT,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    }),
    this.prisma.insuranceClaim.count({ where }),
  ]);

  return {
    data: claims,
    pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
  };
}
}