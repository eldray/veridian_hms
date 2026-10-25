import { NotFoundError, ValidationError } from '../../utils/errors';
import { Prisma, PrismaClient } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { InsuranceClaimRepository } from './InsuranceClaimRepository';
import { getCounterService } from '../../services/CounterService';
import { mapAttendanceToNHIS } from '../../utils/nhisAttendanceMapping';
import { approvedServicesCoverPrescription } from '../encounter/NHISPreAuthorisation';
import { calculateNHISMedicineAllocation } from '../../utils/pricing';

const toNumber = (val: any): number => val ? parseFloat(val.toString()) : 0;
const safeArrayJoin = (arr: any, sep: string = ','): string => Array.isArray(arr) ? arr.join(sep) : (arr || '');
const safeMap = (arr: any[] | undefined, mapper: (item: any) => any): any[] => (arr || []).map(mapper).filter(Boolean);

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
      const batchNumber = `BATCH-${getCounterService().nextBatchNumber()}`;

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

      const claims = await tx.insuranceClaim.findMany({ where: { id: { in: claimIds }, batchId: null }, include: { InsuranceProvider: true, items: { select: { id: true } } } });
      if (claims.length !== claimIds.length) throw new Error('Claims not found or already in a batch');

      for (const c of claims) {
        if (c.status !== 'finalized') throw new Error(`Claim ${c.claimNumber} is not finalized`);
        if (!c.items?.length) throw new ValidationError(`Claim ${c.claimNumber} has no itemized lines and cannot be added to a batch. Repair the draft claim or resolve it through the claims audit workflow.`);
        if (c.InsuranceProvider?.type !== 'nhis') throw new Error(`Claim ${c.claimNumber} not NHIS`);
      }

      // ✅ FIXED: Decimal math
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

      // ✅ FIXED: Decimal math
      const remAmount = existing.claims.reduce((sum, c) => sum + toNumber(c.totalClaimAmount), 0);

      await tx.claimBatch.update({
        where: { id: batchId },
        data: { totalAmount: toNumber(existing.totalAmount) - remAmount, claims: { disconnect: claimIds.map(id => ({ id })) } }
      });
      await tx.insuranceClaim.updateMany({ where: { id: { in: claimIds } }, data: { batchId: null } });

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
    if (!batch || !batch.claims.length) throw new Error('Batch not found or empty');
    const claimWithoutItems = batch.claims.find((claim: any) => !claim.items?.length);
    if (claimWithoutItems) throw new ValidationError(`Claim ${claimWithoutItems.claimNumber} has no itemized lines. The batch XML cannot be generated until the claim is repaired.`);

    const facilityCode = process.env.NHIS_FACILITY_CODE || 'FAC001';
    
    // ✅ FIXED: Safely join JSON arrays for XML
    const claimsXml = batch.claims.map(c => `    <Claim>
      <ClaimNumber>${c.claimNumber}</ClaimNumber>
      <PatientCCC>${c.Attendance?.nhisCCC || ''}</PatientCCC>
      <PatientName>${c.Patient?.surname || ''} ${c.Patient?.otherNames || ''}</PatientName>
      <TotalAmount>${toNumber(c.totalClaimAmount).toFixed(2)}</TotalAmount>
      <DiagnosisCodes>${safeArrayJoin(c.diagnosisCodes)}</DiagnosisCodes>
      <GDRGCodes>${safeArrayJoin(c.gdrgCodes)}</GDRGCodes>
    </Claim>`).join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<NHISBatchSubmission>
  <BatchInfo>
    <BatchNumber>${batch.batchNumber}</BatchNumber>
    <BatchDate>${new Date(batch.periodYear, batch.periodMonth - 1, 1).toISOString()}</BatchDate>
    <FacilityCode>${facilityCode}</FacilityCode>
    <TotalClaims>${batch.claims.length}</TotalClaims>
    <TotalAmount>${toNumber(batch.totalAmount).toFixed(2)}</TotalAmount>
    <GeneratedBy>${batch.createdBy.fullName || batch.createdBy.username}</GeneratedBy>
    <GeneratedAt>${new Date().toISOString()}</GeneratedAt>
  </BatchInfo>
  <Claims>
${claimsXml}
  </Claims>
</NHISBatchSubmission>`;

    await this.prisma.claimBatch.update({ where: { id: batchId }, data: { status: 'generated' } });
    return { xml, batchNumber: batch.batchNumber };
  }

  async updateBatchStatus(batchId: string, status: string) {
    const valid = ['generated', 'finalized'];
    if (!valid.includes(status)) throw new Error('Invalid status');
    return this.prisma.claimBatch.update({
      where: { id: batchId },
      data: { status: status as any, ...(status === 'finalized' ? { finalizedAt: new Date() } : {}) },
      include: { claims: { include: { InsuranceProvider: true, Patient: true, Attendance: true, Bill: true } }, createdBy: { select: { id: true, fullName: true, username: true } } }
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
        where, include: { InsuranceProvider: { select: { id: true, name: true, type: true, coveragePercentage: true } }, Patient: { select: { id: true, folderNumber: true, surname: true, otherNames: true, contact: true } }, Attendance: { select: { id: true, attendanceNumber: true, dateTime: true, status: true, nhisCCC: true } }, Bill: { select: { id: true, billNumber: true, totalAmount: true } } },
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
        Medication: { include: { StockItem: true, ServiceCatalog: true } },
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

  async updateClaimDraft(claimId: string, data: any, userId: string) {
    const fields = ['diagnosisCodes', 'procedureCodes', 'labTestCodes', 'scanCodes', 'serviceCodes', 'medicationCodes', 'totalClaimAmount', 'notes', 'preAuthNumber', 'principalGDRG', 'typeOfService', 'serviceOutcome', 'typeOfAttendance', 'mdcCode', 'datesOfService', 'metadata'];
    const toUpdate: any = { updatedById: userId, updatedAt: new Date() };
    fields.forEach(f => { if (data[f] !== undefined) toUpdate[f] = data[f]; });
    return this.prisma.insuranceClaim.update({ where: { id: claimId }, data: toUpdate });
  }

  async finalizeClaim(claimId: string, userId: string) {
    const claim = await this.prisma.insuranceClaim.findUnique({
      where: { id: claimId },
      include: { items: { select: { id: true } } },
    });
    if (!claim) throw new NotFoundError('Claim', claimId);
    if (claim.status !== 'draft') throw new Error('Only draft claims can be finalized');
    if (!claim.items.length) {
      throw new ValidationError('A claim must contain at least one item before it can be finalized. Add or repair the claim items first.');
    }
    return this.prisma.insuranceClaim.update({ where: { id: claimId }, data: { status: 'finalized', finalizedAt: new Date(), finalizedById: userId, updatedById: userId } });
  }

  async updateClaimStatus(claimId: string, status: string, notes: string | undefined, userId: string) {
    const valid = ['draft', 'finalized'];
    if (!valid.includes(status)) throw new Error('Invalid status');
    if (status === 'finalized') {
      const claim = await this.prisma.insuranceClaim.findUnique({
        where: { id: claimId },
        include: { items: { select: { id: true } } },
      });
      if (!claim) throw new NotFoundError('Claim', claimId);
      if (claim.status !== 'draft') throw new Error('Only draft claims can be finalized');
      if (!claim.items.length) {
        throw new ValidationError('A claim must contain at least one item before it can be finalized. Add or repair the claim items first.');
      }
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
    return this.prisma.$transaction(async (tx) => {
      if (!attendanceId) throw new ValidationError('attendanceId is required');
      const existing = await this.findExistingClaim(tx, attendanceId, 'nhis');
      if (existing) return { claim: existing, isExisting: true };

      const att = await tx.attendance.findUnique({
        where: { id: attendanceId },
        include: { Patient: true, InsuranceProvider: true, Bill: true, Admission: true, AttendanceDiagnosis: { where: { diagnosisType: 'primary' }, include: { Diagnosis: true } }, ServiceRendered: { include: { ServiceCatalog: true } }, Medication: { where: { status: 'dispensed' }, include: { ServiceCatalog: true, StockItem: true } }, LabTest: { where: { status: 'completed' }, include: { ServiceCatalog: true } }, Scan: { where: { status: 'completed' }, include: { ServiceCatalog: true } }, Procedure: { where: { status: 'completed' }, include: { ServiceCatalog: true } } }
      });

      if (!att) throw new NotFoundError('Attendance', attendanceId);
      if (!att.InsuranceProvider || att.InsuranceProvider.type !== 'nhis') {
        throw new ValidationError(`Attendance ${att.attendanceNumber} is not an NHIS visit (insurance provider: ${att.InsuranceProvider?.name ?? 'none selected'}). Set the NHIS provider on the attendance first.`);
      }
      if (!att.nhisCCC) throw new ValidationError(`Attendance ${att.attendanceNumber} has no Claim Check Code (CCC). Generate or enter the NHIS CCC before creating the claim.`);
      const pd = att.AttendanceDiagnosis[0];
      if (!pd) throw new ValidationError(`Attendance ${att.attendanceNumber} has no primary diagnosis. Record a primary diagnosis before creating the NHIS claim.`);

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
        if (payerRule.authorizationRequired == null) {
          throw new ValidationError(
            `NHIS claim cannot include ${med.name ?? stockItem.name}: its authorisation requirement is unknown. Configure the medicine payer rule before claim generation.`,
          );
        }
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
          throw new ValidationError(`NHIS claim cannot price ${med.name ?? stockItem.name}: dispensed quantity is missing or invalid.`);
        }
        const coveredUnitAmount = Math.round(allocation.nhisCoveredAmount * 100) / 100;
        const coveredLineAmount = Math.round(coveredUnitAmount * quantity * 100) / 100;
        nhisMedicineClaimTotal += coveredLineAmount;
        nhisMedicineItems.push({
          itemCategory: 'medicine',
          itemType: 'medication',
          code: stockItem.drugCode || med.ServiceCatalog?.code || 'NHIS-MEDICINE',
          description: med.name || stockItem.name,
          quantity,
          unitPrice: coveredUnitAmount,
          lineTotal: coveredLineAmount,
          serviceDate: att.dateTime,
          medicationId: med.id,
          serviceCatalogId: med.ServiceCatalog?.id || null
        });
      }

      const gdrgLink = await tx.gDRGTariffDiagnosis.findFirst({ where: { diagnosisId: pd.diagnosisId }, include: { gdrgTariff: true } });
      if (!gdrgLink) throw new ValidationError(`No G-DRG tariff is mapped to the primary diagnosis "${pd.Diagnosis?.name ?? pd.diagnosisId}". Map it in G-DRG settings or choose a mapped diagnosis.`);

      const age = this.calculateAgeInYears(att.Patient.dateOfBirth, att.dateTime);
      const split = age >= 12 ? 'A' : 'C';
      const base = gdrgLink.gdrgTariff.gdrgCode.slice(0, -1);
      const finalCode = base + split;
      const tariff = await tx.gDRGTariff.findFirst({
        where: {
          gdrgCode: finalCode,
          isActive: true,
          effectiveFrom: { lte: servicePolicyDate },
          OR: [{ effectiveTo: null }, { effectiveTo: { gt: servicePolicyDate } }],
        },
      });
      if (!tariff || !Number.isFinite(Number(tariff.nhiaTariff)) || Number(tariff.nhiaTariff) <= 0) {
        throw new ValidationError(`NHIS claim G-DRG "${finalCode}" has no valid active tariff for the service date ${servicePolicyDate.toISOString().slice(0, 10)}.`);
      }

      // nextNHISClaimNumber() already returns "NHIS-<n>" - do not prefix it again
      const claimNumber = getCounterService().nextNHISClaimNumber();

      // Helper for dates of service
      let datesOfService: string[] = [];
      if (att.Admission) {
        let curr = new Date(att.Admission.admissionDate);
        const end = att.Admission.dischargeDate || new Date();
        while (curr <= end) { datesOfService.push(curr.toISOString().split('T')[0]); curr.setDate(curr.getDate() + 1); }
      } else { datesOfService.push(att.dateTime.toISOString().split('T')[0]); }

      const { typeOfAttendance: typeOfAtt, typeOfService } = mapAttendanceToNHIS(att.attendanceType, !!att.Admission);

      const claim = await tx.insuranceClaim.create({
        data: {
          claimNumber, billId: att.Bill?.id, patientId: att.patientId, attendanceId: att.id, insuranceProviderId: att.insuranceProviderId!,
          preAuthNumber: authorizationNumbers.size ? Array.from(authorizationNumbers).join(',') : undefined,
          totalClaimAmount: Math.round((Number(tariff.nhiaTariff) + nhisMedicineClaimTotal) * 100) / 100, status: 'draft', createdById: userId,
          diagnosisCodes: safeMap([pd.Diagnosis?.icdCode], c => c),
          labTestCodes: safeMap(att.LabTest, l => l.ServiceCatalog?.nhisServiceCode),
          scanCodes: safeMap(att.Scan, s => s.ServiceCatalog?.nhisServiceCode),
          procedureCodes: safeMap(att.Procedure, p => p.ServiceCatalog?.code),
          medicationCodes: safeMap(att.Medication, m => m.StockItem?.drugCode || m.ServiceCatalog?.code),
          serviceCodes: safeMap(att.ServiceRendered, s => s.ServiceCatalog?.nhisServiceCode),
          gdrgCodes: [tariff.gdrgCode], nhisServiceCodes: tariff.nhisServiceCode ? [tariff.nhisServiceCode] : [],
          principalGDRG: tariff.gdrgCode, claimCheckCode: att.nhisCCC,
          typeOfService, serviceOutcome: att.status === 'completed' ? 'DISC' : 'CONT',
          mdcCode: tariff.gdrgCode.match(/^[A-Z]+/)?.[0] || 'MEDI', typeOfAttendance: typeOfAtt, datesOfService,
          notes: `NHIS CCC: ${att.nhisCCC}, GDRG: ${tariff.gdrgCode}`,
          items: {
            create: [
              {
                itemNumber: 1,
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
              ...nhisMedicineItems.map((item, index) => ({
                ...item,
                itemNumber: index + 2
              }))
            ]
          }
        },
        include: { items: { orderBy: { itemNumber: 'asc' } } }
      });

      return { claim, gdrgDetails: tariff, isExisting: false };
    });
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
      this.prisma.insuranceClaim.findMany({ where, include: { InsuranceProvider: { select: { id: true, name: true, type: true } }, Patient: { select: { id: true, folderNumber: true, surname: true, otherNames: true } }, Attendance: { select: { id: true, attendanceNumber: true, dateTime: true, nhisCCC: true } }, Bill: { select: { id: true, billNumber: true, totalAmount: true } } }, orderBy: { createdAt: 'desc' }, skip, take: limitNum }),
      this.prisma.insuranceClaim.count({ where })
    ]);

    return { data: claims, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } };
  }

  // ==========================================
  // PRIVATE INSURANCE SERVICES (Fully Restored)
  // ==========================================
  async generatePrivateInsuranceClaim(attendanceId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      if (!attendanceId) throw new ValidationError('attendanceId is required');
      const existing = await this.findExistingClaim(tx, attendanceId, 'private');
      if (existing) return { claim: existing, isExisting: true };

      const att = await tx.attendance.findUnique({
        where: { id: attendanceId },
        include: { Patient: true, InsuranceProvider: true, Bill: { include: { BillLineItem: { include: { serviceCatalog: true } } } }, AttendanceDiagnosis: { include: { Diagnosis: true } }, ServiceRendered: { include: { ServiceCatalog: true } }, LabTest: { include: { ServiceCatalog: true } }, Medication: { include: { ServiceCatalog: true } }, Procedure: { include: { ServiceCatalog: true } }, Scan: { include: { ServiceCatalog: true } } }
      });

      if (!att) throw new NotFoundError('Attendance', attendanceId);
      if (!att.InsuranceProvider || att.InsuranceProvider.type !== 'private') {
        throw new ValidationError(`Attendance ${att.attendanceNumber} is not a private-insurance visit (insurance provider: ${att.InsuranceProvider?.name ?? 'none selected'}). Select a private insurance provider on the attendance first.`);
      }

      // A private-insurance claim represents the insurer's liability, not the
      // whole bill. Patient co-payments remain on the bill but must not be claimed
      // again from the insurer.
      const billItems = (att.Bill?.BillLineItem ?? []).filter(
        (item: any) => !item.isVoided && toNumber(item.insuranceCoveredAmount) > 0,
      );
      if (!att.Bill?.id || billItems.length === 0) {
        throw new ValidationError('A private insurance claim requires at least one active bill line with a positive insurer-covered amount. Check the payer tariff, coverage and patient co-payment allocation.');
      }

      const insurerClaimAmount = Math.round(
        billItems.reduce((sum: number, item: any) => sum + toNumber(item.insuranceCoveredAmount), 0) * 100,
      ) / 100;
      if (!Number.isFinite(insurerClaimAmount) || insurerClaimAmount <= 0) {
        throw new ValidationError('The private-insurance claim amount must be greater than zero.');
      }

      const claimNumber = getCounterService().nextPrivateClaimNumber();
      const claim = await tx.insuranceClaim.create({
        data: {
          claimNumber, billId: att.Bill.id, patientId: att.patientId, attendanceId: att.id, insuranceProviderId: att.insuranceProviderId!,
          totalClaimAmount: insurerClaimAmount, status: 'draft', createdById: userId,
          diagnosisCodes: safeMap(att.AttendanceDiagnosis, d => d.Diagnosis?.icdCode),
          procedureCodes: safeMap(att.Procedure, p => p.ServiceCatalog?.code),
          labTestCodes: safeMap(att.LabTest, l => l.ServiceCatalog?.code),
          scanCodes: safeMap(att.Scan, s => s.ServiceCatalog?.code),
          serviceCodes: safeMap(att.ServiceRendered, s => s.ServiceCatalog?.code),
          medicationCodes: safeMap(att.Medication, m => m.StockItem?.drugCode || m.ServiceCatalog?.code),
          notes: 'Private insurance claim - itemized billing',
          items: {
            create: billItems.map((item: any, index: number) => {
              const serviceType = String(item.serviceType || 'miscellaneous').toLowerCase();
              const itemCategory = serviceType === 'lab_test' || serviceType === 'scan'
                ? 'investigation'
                : serviceType === 'medication'
                  ? 'medicine'
                  : serviceType === 'procedure'
                    ? 'procedure'
                    : 'service';
              return {
                itemNumber: index + 1,
                itemCategory,
                itemType: serviceType,
                code: item.serviceCatalog?.code || serviceType.toUpperCase(),
                description: item.description,
                quantity: item.quantity,
                // Store the insurer's share as the claim line amount so claim totals
                // reconcile to totalClaimAmount; the patient's co-pay is not claimed.
                unitPrice: item.quantity > 0
                  ? Math.round((toNumber(item.insuranceCoveredAmount) / item.quantity) * 100) / 100
                  : 0,
                lineTotal: toNumber(item.insuranceCoveredAmount),
                serviceDate: att.dateTime,
                billLineItemId: item.id,
                serviceCatalogId: item.serviceCatalogId || null
              };
            })
          }
        },
        include: { items: { orderBy: { itemNumber: 'asc' } } }
      });

      return { claim, isExisting: false };
    });
  }

  async getPrivateInsuranceClaims(status?: string, patientId?: string, startDate?: Date, endDate?: Date, page = 1, limit = 50) {
    const where: any = { InsuranceProvider: { type: 'private' } };
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
      this.prisma.insuranceClaim.findMany({ where, include: { InsuranceProvider: { select: { id: true, name: true, type: true } }, Patient: { select: { id: true, folderNumber: true, surname: true, otherNames: true } }, Attendance: { select: { id: true, attendanceNumber: true, dateTime: true } }, Bill: { select: { id: true, billNumber: true, totalAmount: true } } }, orderBy: { createdAt: 'desc' }, skip, take: limitNum }),
      this.prisma.insuranceClaim.count({ where })
    ]);

    return { data: claims, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } };
  }

  // ==========================================
  // CORPORATE SERVICES (Fully Restored)
  // ==========================================
  async generateCorporateClaim(attendanceId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      if (!attendanceId) throw new ValidationError('attendanceId is required');
      const existing = await this.findExistingClaim(tx, attendanceId, 'corporate');
      if (existing) return { claim: existing, isExisting: true };

      const att = await tx.attendance.findUnique({
        where: { id: attendanceId },
        include: { Patient: true, InsuranceProvider: true, CorporateAccount: true, Bill: { include: { BillLineItem: { include: { serviceCatalog: true } } } }, AttendanceDiagnosis: { include: { Diagnosis: true } }, ServiceRendered: { include: { ServiceCatalog: true } }, LabTest: { include: { ServiceCatalog: true } }, Medication: { include: { ServiceCatalog: true, StockItem: true } }, Procedure: { include: { ServiceCatalog: true } }, Scan: { include: { ServiceCatalog: true } }, Admission: true }
      });

      if (!att) throw new NotFoundError('Attendance', attendanceId);
      if (!att.InsuranceProvider || att.InsuranceProvider.type !== 'corporate') {
        throw new ValidationError(`Attendance ${att.attendanceNumber} is not a corporate visit (insurance provider: ${att.InsuranceProvider?.name ?? 'none selected'}). Select a corporate provider on the attendance first.`);
      }
      if (!att.corporateAccountId) throw new ValidationError(`Attendance ${att.attendanceNumber} has no corporate account linked.`);

      const corp = await tx.corporateAccount.findUnique({ where: { id: att.corporateAccountId } });
      if (!corp) throw new NotFoundError('Corporate account', att.corporateAccountId);
      if (!corp.isActive) throw new ValidationError(`Corporate account "${corp.companyName}" is inactive.`);

      // ✅ FIXED: Decimal math for credit limit
      const whereCond: any = { corporateAccountId: att.corporateAccountId, status: 'finalized' };
      if (att.insuranceProviderId) whereCond.insuranceProviderId = att.insuranceProviderId;
      const outstanding = await tx.insuranceClaim.aggregate({ where: whereCond, _sum: { totalClaimAmount: true } });
      const currentBal = toNumber(outstanding._sum?.totalClaimAmount);
      const claimAmt = toNumber(att.Bill?.totalAmount);
      const projected = currentBal + claimAmt;
      const limit = toNumber(corp.creditLimit);
      // A zero/null credit limit means "no limit configured", not "zero credit".
      if (limit > 0 && projected > limit) {
        throw new ValidationError(
          `Exceeds credit limit. Current: GHS ${currentBal.toFixed(2)}, Limit: GHS ${limit.toFixed(2)}`
        );
      }
      const providerId = att.insuranceProviderId || corp.insuranceProviderId;
      if (!corp.insuranceProviderId) {
        throw new ValidationError(`Configure an insurance provider on corporate account "${corp.companyName}" before generating claims.`);
      }
      if (!providerId) throw new ValidationError(`No insurance provider is set on attendance ${att.attendanceNumber} or on corporate account "${corp.companyName}".`);
      if (providerId !== corp.insuranceProviderId) {
        throw new ValidationError(`The insurance provider selected for attendance ${att.attendanceNumber} does not match corporate account "${corp.companyName}".`);
      }

      // Build claim items from the bill's active, auditable line items.
      const billItems = (att.Bill?.BillLineItem ?? []).filter((item: any) => !item.isVoided);
      if (!att.Bill?.id || billItems.length === 0) {
        throw new ValidationError('A corporate claim requires a bill with at least one active bill line item.');
      }

      const claimNumber = getCounterService().nextCorporateClaimNumber();
      const claim = await tx.insuranceClaim.create({
        data: {
          claimNumber, billId: att.Bill.id, patientId: att.patientId, attendanceId: att.id, insuranceProviderId: providerId, corporateAccountId: att.corporateAccountId,
          totalClaimAmount: claimAmt, status: 'draft', createdById: userId,
          diagnosisCodes: safeMap(att.AttendanceDiagnosis, d => d.Diagnosis?.icdCode),
          procedureCodes: safeMap(att.Procedure, p => p.ServiceCatalog?.code),
          labTestCodes: safeMap(att.LabTest, l => l.ServiceCatalog?.code),
          scanCodes: safeMap(att.Scan, s => s.ServiceCatalog?.code),
          serviceCodes: safeMap(att.ServiceRendered, s => s.ServiceCatalog?.code),
          medicationCodes: safeMap(att.Medication, m => m.StockItem?.drugCode || m.ServiceCatalog?.code),
          notes: `Corporate claim - Employee ID: ${att.corporateEmployeeId || 'N/A'}. Itemized billing.`,
          items: {
            create: billItems.map((item: any, index: number) => {
              const serviceType = String(item.serviceType || 'miscellaneous').toLowerCase();
              const itemCategory = serviceType === 'lab_test' || serviceType === 'scan'
                ? 'investigation'
                : serviceType === 'medication'
                  ? 'medicine'
                  : serviceType === 'procedure'
                    ? 'procedure'
                    : 'service';
              return {
                itemNumber: index + 1,
                itemCategory,
                itemType: serviceType,
                code: item.serviceCatalog?.code || serviceType.toUpperCase(),
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                lineTotal: item.lineTotal,
                serviceDate: att.dateTime,
                billLineItemId: item.id,
                serviceCatalogId: item.serviceCatalogId || null
              };
            })
          }
        },
        include: { items: { orderBy: { itemNumber: 'asc' } } }
      });

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
  return this.updateClaimDraft(claimId, data, userId);
}

/**
 * Controller calls: service.replaceClaimItems(id, items, uid)
 * Replaces ALL line items of a DRAFT claim with the given list (PUT /insurance-claims/:id/items).
 * Items are renumbered 1..n in the order received. The claim header total is not changed here.
 */
async replaceClaimItems(claimId: string, items: any[], userId: string) {
  const claim = await this.prisma.insuranceClaim.findUnique({ where: { id: claimId }, include: { InsuranceProvider: { select: { id: true, type: true } }, Attendance: { select: { id: true, patientId: true, dateTime: true, Admission: { select: { admissionDate: true } }, Medication: { where: { status: 'dispensed' }, include: { StockItem: { select: { id: true, drugCode: true, name: true } }, ServiceCatalog: { select: { id: true, code: true } } } } } } } });
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

  const rows = (items || []).map((it: any, idx: number) => {
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
      prescriptionText: it.prescriptionText ?? null,
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
      medicationId: null,
    };
  });

  let totalClaimAmount: number | undefined;
  // Non-NHIS claim totals must reconcile to the edited line items. Corporate discounts
  // are applied to the lines as well as the header so a saved claim never has mismatched totals.
  const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
  if (claim.InsuranceProvider?.type !== 'nhis') {
    if (claim.InsuranceProvider?.type === 'corporate') {
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
    const dispensedMedicines = attendance?.Medication ?? [];
    const authorisations = attendance && claim.insuranceProviderId
      ? await this.prisma.preAuthorisationRequest.findMany({
          where: {
            attendanceId: attendance.id,
            patientId: attendance.patientId,
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
        where: { OR: [{ code: row.code }, { StockItem: { drugCode: row.code } }] },
        select: {
          code: true,
          StockItem: {
            select: {
              id: true,
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
      if (!catalog?.StockItem || !rule || rule.isCovered !== true || rule.authorizationRequired == null ||
          !['A', 'M', 'B1', 'B2', 'C', 'D', 'SM'].includes(String(rule.prescribingLevel ?? '').trim().toUpperCase()) ||
          (rule.effectiveFrom && rule.effectiveFrom > rowPolicyDate) || (rule.effectiveTo && rule.effectiveTo < rowPolicyDate)) {
        throw new ValidationError(`NHIS claim medicine "${row.description}" has no complete, active payer policy. Configure its coverage, prescribing level, authorization decision and effective dates.`);
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
      // only a safe fallback when the dispensed record has no stock-item relation;
      // otherwise a reused code must never pull quantities from a different item.
      const matchesDispensedStockItem = (med: any) => {
        if (med.StockItem?.id) return med.StockItem.id === catalog.StockItem?.id;
        return !!row.code && (
          med.StockItem?.drugCode === row.code ||
          med.ServiceCatalog?.code === row.code
        );
      };
      const matchingDispensedMedicines = dispensedMedicines.filter(matchesDispensedStockItem);
      if (!matchingDispensedMedicines.length) {
        throw new ValidationError(`NHIS claim medicine "${row.description}" does not match a medicine dispensed for this attendance. Select a valid dispensed medicine before saving the claim.`);
      }
      // Claim edits must not increase the quantity beyond what was actually dispensed.
      // Track totals across rows too, so duplicating a line cannot inflate the claim.
      const dispensedQuantity = matchingDispensedMedicines.reduce((sum: number, med: any) => sum + Number(med.quantity ?? 0), 0);
      const rowQuantity = Number(row.quantity);
      const alreadyClaimedQuantity = claimedQuantityByStockItem.get(catalog.StockItem?.id ?? '') ?? 0;
      if (!Number.isFinite(rowQuantity) || rowQuantity <= 0 || alreadyClaimedQuantity + rowQuantity > dispensedQuantity) {
        throw new ValidationError(`NHIS claim medicine "${row.description}" quantity (${row.quantity}) exceeds the quantity dispensed for this attendance (${dispensedQuantity - alreadyClaimedQuantity} remaining).`);
      }
      claimedQuantityByStockItem.set(catalog.StockItem?.id ?? '', alreadyClaimedQuantity + rowQuantity);
      if (rule.authorizationRequired === true) {
        // A stock item may have more than one dispensed row/service-catalog link.
        // Accept authorisation for the canonical stock item or any exact catalog
        // identity attached to those matching dispensed rows, never an unrelated
        // row that merely shares a drug code.
        const matchingServiceCatalogIds = new Set<string>(
          matchingDispensedMedicines
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

  await this.prisma.$transaction(async (tx) => {
    await tx.insuranceClaimItem.deleteMany({ where: { claimId } });
    if (rows.length) await tx.insuranceClaimItem.createMany({ data: rows });
    await tx.insuranceClaim.update({
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