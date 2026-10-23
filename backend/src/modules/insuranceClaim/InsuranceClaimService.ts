import { NotFoundError, ValidationError } from '../../utils/errors';
import { Prisma, PrismaClient } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { InsuranceClaimRepository } from './InsuranceClaimRepository';
import { getCounterService } from '../../services/CounterService';
import { mapAttendanceToNHIS } from '../../utils/nhisAttendanceMapping';
import { approvedServicesCoverPrescription } from '../encounter/NHISPreAuthorisation';

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
      include: { InsuranceProvider: { select: { type: true } } }
    });
    if (!existing) return null;
    if (existing.InsuranceProvider?.type === type) return existing;
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


    /**
   * NHIS price per medicine, keyed by drug code. Looks the drug up through its service catalog entry
   * and takes the latest active NHIS price. Drugs with no price are simply absent from the map.
   */
  private async nhisMedicinePrices(client: any, codes: string[]): Promise<Map<string, number>> {
    const prices = new Map<string, number>();
    const unique = Array.from(new Set(codes.filter(Boolean)));
    if (!unique.length) return prices;

    const catalogs = await client.serviceCatalog.findMany({
      where: { OR: [{ code: { in: unique } }, { StockItem: { drugCode: { in: unique } } }] },
      select: {
        code: true,
        StockItem: { select: { drugCode: true } },
        pricing: {
          where: { isActive: true, effectiveDate: { lte: new Date() } },
          orderBy: { effectiveDate: 'desc' },
          take: 1,
          select: { nhisPrice: true },
        },
      },
    });

    for (const c of catalogs) {
      const price = Number(c.pricing?.[0]?.nhisPrice ?? 0);
      for (const key of [c.StockItem?.drugCode, c.code]) {
        if (key && unique.includes(key) && (price > 0 || !prices.has(key))) prices.set(key, price);
      }
    }
    return prices;
  }
  
  // ==========================================
  // BATCH SERVICES (Fully Restored)
  // ==========================================
  async createClaimBatch(claimIds: string[], description: string | null, insuranceType: string | null, userId: string) {
    if (!claimIds?.length) throw new Error('At least one claim ID is required');
    let targetType = insuranceType;

    return this.prisma.$transaction(async (tx) => {
      const claims = await tx.insuranceClaim.findMany({ where: { id: { in: claimIds } }, include: { InsuranceProvider: true, Attendance: { select: { dateTime: true } } } });
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

      const claims = await tx.insuranceClaim.findMany({ where: { id: { in: claimIds }, batchId: null }, include: { InsuranceProvider: true } });
      if (claims.length !== claimIds.length) throw new Error('Claims not found or already in a batch');

      for (const c of claims) {
        if (c.status !== 'finalized') throw new Error(`Claim ${c.claimNumber} is not finalized`);
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
      include: { claims: { include: { InsuranceProvider: true, Patient: true, Attendance: true, Bill: true } }, createdBy: true }
    });
    if (!batch || !batch.claims.length) throw new Error('Batch not found or empty');

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
    const claim = await this.prisma.insuranceClaim.findUnique({ where: { id: claimId } });
    if (!claim) throw new NotFoundError('Claim', claimId);
    if (claim.status !== 'draft') throw new Error('Only draft claims can be finalized');
    return this.prisma.insuranceClaim.update({ where: { id: claimId }, data: { status: 'finalized', finalizedAt: new Date(), finalizedById: userId, updatedById: userId } });
  }

  async updateClaimStatus(claimId: string, status: string, notes: string | undefined, userId: string) {
    const valid = ['draft', 'finalized'];
    if (!valid.includes(status)) throw new Error('Invalid status');
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
      const claimValidationDate = new Date();
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
            effectiveFrom: true,
            effectiveTo: true,
          },
        });
        if (!payerRule || payerRule.isCovered !== true ||
            (payerRule.effectiveFrom && payerRule.effectiveFrom > claimValidationDate) ||
            (payerRule.effectiveTo && payerRule.effectiveTo < claimValidationDate)) {
          throw new ValidationError(
            `NHIS claim cannot include ${med.name ?? stockItem.name}: its medicine coverage rule is missing, uncovered, or outside its effective dates.`,
          );
        }
        if (payerRule.authorizationRequired == null) {
          throw new ValidationError(
            `NHIS claim cannot include ${med.name ?? med.StockItem.name}: its authorisation requirement is unknown. Configure the medicine payer rule before claim generation.`,
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
            }),
          );
          if (!matchingApproval?.authNumber) {
            throw new ValidationError(
              `NHIS claim cannot include ${med.name ?? med.StockItem.name}: no current authorisation explicitly covering this medicine was found.`,
            );
          }
          authorizationNumbers.add(matchingApproval.authNumber);
        }
      }

      const gdrgLink = await tx.gDRGTariffDiagnosis.findFirst({ where: { diagnosisId: pd.diagnosisId }, include: { gdrgTariff: true } });
      if (!gdrgLink) throw new ValidationError(`No G-DRG tariff is mapped to the primary diagnosis "${pd.Diagnosis?.name ?? pd.diagnosisId}". Map it in G-DRG settings or choose a mapped diagnosis.`);

      const age = this.calculateAgeInYears(att.Patient.dateOfBirth, att.dateTime);
      const split = age >= 12 ? 'A' : 'C';
      const base = gdrgLink.gdrgTariff.gdrgCode.slice(0, -1);
      const finalCode = base + split;
      const tariff = await tx.gDRGTariff.findFirst({ where: { gdrgCode: finalCode, isActive: true } }) || gdrgLink.gdrgTariff;

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
          totalClaimAmount: tariff.nhiaTariff, status: 'draft', createdById: userId,
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
          notes: `NHIS CCC: ${att.nhisCCC}, GDRG: ${tariff.gdrgCode}`
        }
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

      // nextPrivateClaimNumber() already returns "PRIV-<n>" - do not prefix it again
      const claimNumber = getCounterService().nextPrivateClaimNumber();
      const claim = await tx.insuranceClaim.create({
        data: {
          claimNumber, billId: att.Bill?.id, patientId: att.patientId, attendanceId: att.id, insuranceProviderId: att.insuranceProviderId!,
          totalClaimAmount: att.Bill?.totalAmount || 0, status: 'draft', createdById: userId,
          diagnosisCodes: safeMap(att.AttendanceDiagnosis, d => d.Diagnosis?.icdCode),
          procedureCodes: safeMap(att.Procedure, p => p.ServiceCatalog?.code),
          labTestCodes: safeMap(att.LabTest, l => l.ServiceCatalog?.code),
          scanCodes: safeMap(att.Scan, s => s.ServiceCatalog?.code),
          serviceCodes: safeMap(att.ServiceRendered, s => s.ServiceCatalog?.code),
          notes: 'Private insurance claim - itemized billing'
        }
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
      if (!providerId) throw new ValidationError(`No insurance provider is set on attendance ${att.attendanceNumber} or on corporate account "${corp.companyName}".`);

      // nextCorporateClaimNumber() already returns "CORP-<n>" - do not prefix it again
      const claimNumber = getCounterService().nextCorporateClaimNumber();
      const claim = await tx.insuranceClaim.create({
        data: {
          claimNumber, billId: att.Bill?.id, patientId: att.patientId, attendanceId: att.id, insuranceProviderId: providerId, corporateAccountId: att.corporateAccountId,
          totalClaimAmount: claimAmt, status: 'finalized', createdById: userId,
          diagnosisCodes: safeMap(att.AttendanceDiagnosis, d => d.Diagnosis?.icdCode),
          procedureCodes: safeMap(att.Procedure, p => p.ServiceCatalog?.code),
          labTestCodes: safeMap(att.LabTest, l => l.ServiceCatalog?.code),
          scanCodes: safeMap(att.Scan, s => s.ServiceCatalog?.code),
          serviceCodes: safeMap(att.ServiceRendered, s => s.ServiceCatalog?.code),
          medicationCodes: safeMap(att.Medication, m => m.StockItem?.drugCode || m.ServiceCatalog?.code),
          notes: `Corporate claim - Employee ID: ${att.corporateEmployeeId || 'N/A'}. Itemized billing.`
        }
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
  const claim = await this.prisma.insuranceClaim.findUnique({ where: { id: claimId }, include: { InsuranceProvider: { select: { type: true } } } });
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
      // Not sent by the forms today; left unset rather than risking an invalid foreign key.
      billLineItemId: null,
      labTestId: null,
      scanId: null,
      procedureId: null,
      medicationId: null,
    };
  });

    // ⬇️ ADD THIS ENTIRE BLOCK — it's missing in the "file name" version
  let totalClaimAmount: number | undefined;
  if (claim.InsuranceProvider?.type === 'nhis') {
    const gdrgRow = rows.find(r => r.itemCategory === 'gdrg');
    const gdrgCode = gdrgRow?.code || claim.principalGDRG;
    const tariff = gdrgCode
      ? await this.prisma.gDRGTariff.findUnique({ where: { gdrgCode }, select: { id: true, nhiaTariff: true } })
      : null;
    const gdrgAmount = Number(tariff?.nhiaTariff ?? 0);
    if (gdrgRow && tariff) {
      gdrgRow.unitPrice = gdrgAmount;
      gdrgRow.lineTotal = gdrgAmount;
      gdrgRow.gdrgTariffId = tariff.id;
    }

    const medRows = rows.filter(r => r.itemCategory === 'medicine');
    const medPrices = await this.nhisMedicinePrices(this.prisma, medRows.map(r => r.code));
    let medicinesTotal = 0;
    for (const r of medRows) {
      r.unitPrice = medPrices.get(r.code) ?? 0;
      r.lineTotal = Math.round(r.unitPrice * r.quantity * 100) / 100;
      medicinesTotal += r.lineTotal;
    }
    totalClaimAmount = Math.round((gdrgAmount + medicinesTotal) * 100) / 100;
  }

  await this.prisma.$transaction(async (tx) => {
    await tx.insuranceClaimItem.deleteMany({ where: { claimId } });
    if (rows.length) await tx.insuranceClaimItem.createMany({ data: rows });
    await tx.insuranceClaim.update({ where: { id: claimId }, data: { updatedById: userId, updatedAt: new Date() } });
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