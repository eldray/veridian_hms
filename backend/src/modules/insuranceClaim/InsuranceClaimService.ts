import { PrismaClient } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { InsuranceClaimRepository } from './InsuranceClaimRepository';
import { getCounterService } from '../../services/CounterService';

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
      const claims = await tx.insuranceClaim.findMany({ where: { id: { in: claimIds } }, include: { InsuranceProvider: true } });
      if (claims.length !== claimIds.length) throw new Error('One or more claims not found');
      if (!targetType && claims.length > 0) targetType = claims[0].InsuranceProvider?.type;
      if (!targetType) throw new Error('Insurance type must be specified or determinable');

      for (const c of claims) {
        if (c.status !== 'submitted') throw new Error(`Claim ${c.claimNumber} not submitted`);
        if (c.InsuranceProvider?.type !== targetType) throw new Error(`Claim ${c.claimNumber} type mismatch`);
        if (c.batchId) throw new Error(`Claim ${c.claimNumber} already batched`);
      }

      // ✅ FIXED: Decimal math
      const totalAmount = claims.reduce((sum, c) => sum + toNumber(c.totalClaimAmount), 0);
      const batchNumber = `BATCH-${getCounterService().nextBatchNumber()}`;

      const batch = await tx.claimBatch.create({
        data: { batchNumber, description, totalAmount, status: 'draft', createdById: userId, claims: { connect: claimIds.map(id => ({ id })) } },
        include: { claims: { include: { InsuranceProvider: true, Patient: true, Attendance: true, Bill: true } }, createdBy: { select: { id: true, fullName: true, username: true } } }
      });

      await tx.insuranceClaim.updateMany({ where: { id: { in: claimIds } }, data: { batchId: batch.id } });
      return batch;
    });
  }

  async getClaimBatches(status?: string, startDate?: Date, endDate?: Date, page = 1, limit = 50) {
    const where: any = {};
    if (status) where.status = status;
    if (startDate || endDate) {
      where.batchDate = {};
      if (startDate) where.batchDate.gte = startDate;
      if (endDate) { const d = new Date(endDate); d.setHours(23, 59, 59, 999); where.batchDate.lte = d; }
    }

    const pageNum = Math.max(1, page);
    const limitNum = Math.min(100, Math.max(1, limit));
    const skip = (pageNum - 1) * limitNum;

    const [batches, total] = await Promise.all([
      this.prisma.claimBatch.findMany({
        where, include: { claims: { select: { id: true, claimNumber: true, totalClaimAmount: true, status: true, Patient: { select: { id: true, folderNumber: true, surname: true, otherNames: true } } } }, createdBy: { select: { id: true, fullName: true, username: true } } },
        orderBy: { batchDate: 'desc' }, skip, take: limitNum
      }),
      this.prisma.claimBatch.count({ where })
    ]);

    return { data: batches, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } };
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
      if (existing.status !== 'draft') throw new Error('Can only add claims to draft batches');

      const claims = await tx.insuranceClaim.findMany({ where: { id: { in: claimIds }, batchId: null }, include: { InsuranceProvider: true } });
      if (claims.length !== claimIds.length) throw new Error('Claims not found or already in a batch');

      for (const c of claims) {
        if (c.status !== 'submitted') throw new Error(`Claim ${c.claimNumber} not submitted`);
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
      if (existing.status !== 'draft') throw new Error('Can only remove from draft batches');

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
    <BatchDate>${batch.batchDate.toISOString()}</BatchDate>
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

    await this.prisma.claimBatch.update({ where: { id: batchId }, data: { status: 'generated', xmlGeneratedAt: new Date() } });
    return { xml, batchNumber: batch.batchNumber };
  }

  async updateBatchStatus(batchId: string, status: string) {
    const valid = ['draft', 'generated', 'submitted', 'exported'];
    if (!valid.includes(status)) throw new Error('Invalid status');
    return this.prisma.claimBatch.update({
      where: { id: batchId },
      data: { status: status as any, ...(status === 'submitted' ? { submissionDate: new Date() } : {}) },
      include: { claims: { include: { InsuranceProvider: true, Patient: true, Attendance: true, Bill: true } }, createdBy: { select: { id: true, fullName: true, username: true } } }
    });
  }

  async deleteClaimBatch(batchId: string) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.claimBatch.findUnique({ where: { id: batchId }, include: { claims: true } });
      if (!existing) throw new Error('Batch not found');
      if (existing.status !== 'draft') throw new Error('Can only delete draft batches');
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
    attendance: {
      include: {
        AttendanceDiagnosis: { include: { Diagnosis: true } },
        LabTest: { include: { LabTestTemplate: true, ServiceCatalog: true } },
        Scan: { include: { ScanTemplate: true, ServiceCatalog: true } },
        Medication: { include: { StockItem: true, ServiceCatalog: true } },
        Procedure: { include: { ProcedureTemplate: true, ServiceCatalog: true } },
        referral: true,
      }
    }
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
    if (!claim) throw new Error('Claim not found');
    return this.normalizeClaim(claim);
  }

  async getClaimByAttendanceId(attendanceId: string) {
    const claim = await this.prisma.insuranceClaim.findFirst({ where: { attendanceId }, include: this.claimDetailInclude });
    if (!claim) throw new Error('No claim found for this attendance');
    return this.normalizeClaim(claim);
  }

  async updateClaimDraft(claimId: string, data: any, userId: string) {
    const fields = ['diagnosisCodes', 'procedureCodes', 'labTestCodes', 'scanCodes', 'serviceCodes', 'medicationCodes', 'totalClaimAmount', 'approvedAmount', 'notes', 'preAuthNumber', 'principalGDRG', 'typeOfService', 'serviceOutcome', 'typeOfAttendance', 'mdcCode', 'datesOfService', 'metadata'];
    const toUpdate: any = { updatedById: userId, updatedAt: new Date() };
    fields.forEach(f => { if (data[f] !== undefined) toUpdate[f] = data[f]; });
    return this.prisma.insuranceClaim.update({ where: { id: claimId }, data: toUpdate });
  }

  async finalizeClaim(claimId: string, userId: string) {
    const claim = await this.prisma.insuranceClaim.findUnique({ where: { id: claimId } });
    if (!claim) throw new Error('Claim not found');
    if (claim.status !== 'draft') throw new Error('Only draft claims can be finalized');
    return this.prisma.insuranceClaim.update({ where: { id: claimId }, data: { status: 'submitted', submissionDate: new Date(), updatedById: userId } });
  }

  async updateClaimStatus(claimId: string, status: string, notes: string | undefined, userId: string) {
    const valid = ['draft', 'submitted', 'approved', 'paid', 'rejected'];
    if (!valid.includes(status)) throw new Error('Invalid status');
    const toUpdate: any = { status, updatedById: userId, updatedAt: new Date() };
    if (status === 'submitted') toUpdate.submissionDate = new Date();
    if (status === 'approved') toUpdate.approvalDate = new Date();
    if (status === 'paid') toUpdate.paymentDate = new Date();
    if (notes) toUpdate.notes = notes;
    return this.prisma.insuranceClaim.update({ where: { id: claimId }, data: toUpdate });
  }

  async getFinalizedClaimsTotal(dateFrom?: Date, dateTo?: Date, type?: string) {
    const where: any = { status: 'submitted' };
    if (type === 'nhis') where.InsuranceProvider = { type: 'nhis' };
    if (type === 'private') where.InsuranceProvider = { type: 'private' };
    if (dateFrom || dateTo) {
      where.submissionDate = {};
      if (dateFrom) where.submissionDate.gte = dateFrom;
      if (dateTo) where.submissionDate.lte = dateTo;
    }

    const claims = await this.prisma.insuranceClaim.findMany({ where, include: { InsuranceProvider: true, Patient: true } });
    
    // ✅ FIXED: Decimal math
    const totalAmount = claims.reduce((sum, c) => sum + toNumber(c.totalClaimAmount), 0);

    return {
      total: claims.length, totalAmount,
      claims: claims.map(c => ({ id: c.id, claimNumber: c.claimNumber, patientName: `${c.Patient?.surname || ''} ${c.Patient?.otherNames || ''}`.trim(), amount: toNumber(c.totalClaimAmount), submissionDate: c.submissionDate, provider: c.InsuranceProvider?.name }))
    };
  }

  // ==========================================
  // NHIS SERVICES (Fully Restored)
  // ==========================================
  async generateNHISClaim(attendanceId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.insuranceClaim.findFirst({ where: { attendanceId, InsuranceProvider: { type: 'nhis' } } });
      if (existing) return { claim: existing, isExisting: true };

      const att = await tx.attendance.findUnique({
        where: { id: attendanceId },
        include: { Patient: true, InsuranceProvider: true, Bill: true, Admission: true, AttendanceDiagnosis: { where: { diagnosisType: 'primary' }, include: { Diagnosis: true } }, ServiceRendered: { include: { ServiceCatalog: true } }, Medication: { where: { status: 'dispensed' }, include: { ServiceCatalog: true, StockItem: true } }, LabTest: { where: { status: 'completed' }, include: { ServiceCatalog: true } }, Scan: { where: { status: 'completed' }, include: { ServiceCatalog: true } }, Procedure: { where: { status: 'completed' }, include: { ServiceCatalog: true } } }
      });

      if (!att) throw new Error('Attendance not found');
      if (!att.InsuranceProvider || att.InsuranceProvider.type !== 'nhis') throw new Error('Not NHIS');
      if (!att.nhisCCC) throw new Error('CCC required');
      const pd = att.AttendanceDiagnosis[0];
      if (!pd) throw new Error('Primary diagnosis required');

      const gdrgLink = await tx.gDRGTariffDiagnosis.findFirst({ where: { diagnosisId: pd.diagnosisId }, include: { gdrgTariff: true } });
      if (!gdrgLink) throw new Error(`No GDRG for: ${pd.Diagnosis?.name}`);

      const age = this.calculateAgeInYears(att.Patient.dateOfBirth, att.dateTime);
      const split = age >= 12 ? 'A' : 'C';
      const base = gdrgLink.gdrgTariff.gdrgCode.slice(0, -1);
      const finalCode = base + split;
      const tariff = await tx.gDRGTariff.findFirst({ where: { gdrgCode: finalCode, isActive: true } }) || gdrgLink.gdrgTariff;

      const claimNumber = `NHIS-${getCounterService().nextNHISClaimNumber()}`;
      
      // Helper for dates of service
      let datesOfService: string[] = [];
      if (att.Admission) {
        let curr = new Date(att.Admission.admissionDate);
        const end = att.Admission.dischargeDate || new Date();
        while (curr <= end) { datesOfService.push(curr.toISOString().split('T')[0]); curr.setDate(curr.getDate() + 1); }
      } else { datesOfService.push(att.dateTime.toISOString().split('T')[0]); }

      let typeOfAtt = 'GEN';
      if (att.attendanceType === 'emergency_acute') typeOfAtt = 'EAE';
      else if (att.attendanceType === 'antenatal') typeOfAtt = 'ANC';
      else if (att.attendanceType === 'delivery') typeOfAtt = 'DEL';
      else if (att.attendanceType === 'surgery') typeOfAtt = 'SUR';

      const claim = await tx.insuranceClaim.create({
        data: {
          claimNumber, billId: att.Bill?.id, patientId: att.patientId, attendanceId: att.id, insuranceProviderId: att.insuranceProviderId!,
          totalClaimAmount: tariff.nhiaTariff, status: 'draft', createdById: userId,
          diagnosisCodes: [pd.Diagnosis?.icdCode].filter(Boolean),
          labTestCodes: att.LabTest.map(l => l.ServiceCatalog?.nhisServiceCode).filter(Boolean),
          scanCodes: att.Scan.map(s => s.ServiceCatalog?.nhisServiceCode).filter(Boolean),
          procedureCodes: att.Procedure.map(p => p.ServiceCatalog?.code).filter(Boolean),
          medicationCodes: att.Medication.map(m => m.StockItem?.drugCode || m.ServiceCatalog?.code).filter(Boolean),
          serviceCodes: att.ServiceRendered.map(s => s.ServiceCatalog?.nhisServiceCode).filter(Boolean),
          gdrgCodes: [tariff.gdrgCode], nhisServiceCodes: tariff.nhisServiceCode ? [tariff.nhisServiceCode] : [],
          principalGDRG: tariff.gdrgCode, claimCheckCode: att.nhisCCC,
          typeOfService: att.Admission ? 'IPD' : 'OPD', serviceOutcome: att.status === 'completed' ? 'DISC' : 'CONT',
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
      this.prisma.insuranceClaim.findMany({ where, include: { InsuranceProvider: { select: { id: true, name: true, type: true } }, Patient: { select: { id: true, folderNumber: true, surname: true, otherNames: true } }, attendance: { select: { id: true, attendanceNumber: true, dateTime: true, nhisCCC: true } }, Bill: { select: { id: true, billNumber: true, totalAmount: true } } }, orderBy: { createdAt: 'desc' }, skip, take: limitNum }),
      this.prisma.insuranceClaim.count({ where })
    ]);

    return { data: claims, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } };
  }

  // ==========================================
  // PRIVATE INSURANCE SERVICES (Fully Restored)
  // ==========================================
  async generatePrivateInsuranceClaim(attendanceId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.insuranceClaim.findFirst({ where: { attendanceId, InsuranceProvider: { type: 'private' } } });
      if (existing) return { claim: existing, isExisting: true };

      const att = await tx.attendance.findUnique({
        where: { id: attendanceId },
        include: { Patient: true, InsuranceProvider: true, Bill: { include: { BillLineItem: { include: { serviceCatalog: true } } } }, AttendanceDiagnosis: { include: { Diagnosis: true } }, ServiceRendered: { include: { ServiceCatalog: true } }, LabTest: { include: { ServiceCatalog: true } }, Medication: { include: { ServiceCatalog: true } }, Procedure: { include: { ServiceCatalog: true } }, Scan: { include: { ServiceCatalog: true } } }
      });

      if (!att) throw new Error('Attendance not found');
      if (!att.InsuranceProvider || att.InsuranceProvider.type !== 'private') throw new Error('Not private insurance');

      const claimNumber = `PVT-${getCounterService().nextPrivateClaimNumber()}`;
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
      this.prisma.insuranceClaim.findMany({ where, include: { InsuranceProvider: { select: { id: true, name: true, type: true } }, Patient: { select: { id: true, folderNumber: true, surname: true, otherNames: true } }, attendance: { select: { id: true, attendanceNumber: true, dateTime: true } }, Bill: { select: { id: true, billNumber: true, totalAmount: true } } }, orderBy: { createdAt: 'desc' }, skip, take: limitNum }),
      this.prisma.insuranceClaim.count({ where })
    ]);

    return { data: claims, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } };
  }

  // ==========================================
  // CORPORATE SERVICES (Fully Restored)
  // ==========================================
  async generateCorporateClaim(attendanceId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.insuranceClaim.findFirst({ where: { attendanceId, InsuranceProvider: { type: 'corporate' } } });
      if (existing) return { claim: existing, isExisting: true };

      const att = await tx.attendance.findUnique({
        where: { id: attendanceId },
        include: { Patient: true, InsuranceProvider: true, CorporateAccount: true, Bill: { include: { BillLineItem: { include: { serviceCatalog: true } } } }, AttendanceDiagnosis: { include: { Diagnosis: true } }, ServiceRendered: { include: { ServiceCatalog: true } }, LabTest: { include: { ServiceCatalog: true } }, Medication: { include: { ServiceCatalog: true, StockItem: true } }, Procedure: { include: { ServiceCatalog: true } }, Scan: { include: { ServiceCatalog: true } }, Admission: true }
      });

      if (!att) throw new Error('Attendance not found');
      if (!att.InsuranceProvider || att.InsuranceProvider.type !== 'corporate') throw new Error('Not corporate');
      if (!att.corporateAccountId) throw new Error('Corporate account ID required');

      const corp = await tx.corporateAccount.findUnique({ where: { id: att.corporateAccountId } });
      if (!corp || !corp.isActive) throw new Error('Corporate account inactive');

      // ✅ FIXED: Decimal math for credit limit
      const whereCond: any = { corporateAccountId: att.corporateAccountId, status: { in: ['submitted', 'approved'] } };
      if (att.insuranceProviderId) whereCond.insuranceProviderId = att.insuranceProviderId;
      const outstanding = await tx.insuranceClaim.aggregate({ where: whereCond, _sum: { totalClaimAmount: true } });
      const currentBal = toNumber(outstanding._sum?.totalClaimAmount);
      const claimAmt = toNumber(att.Bill?.totalAmount);
      const projected = currentBal + claimAmt;
      const limit = toNumber(corp.creditLimit);

      if (projected > limit) throw new Error(`Exceeds credit limit. Current: GHS ${currentBal.toFixed(2)}, Limit: GHS ${limit.toFixed(2)}`);

      const claimNumber = `CORP-${getCounterService().nextCorporateClaimNumber()}`;
      const claim = await tx.insuranceClaim.create({
        data: {
          claimNumber, billId: att.Bill?.id, patientId: att.patientId, attendanceId: att.id, insuranceProviderId: att.insuranceProviderId || corp.insuranceProviderId || 'default', corporateAccountId: att.corporateAccountId,
          totalClaimAmount: claimAmt, status: 'submitted', createdById: userId,
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

  async getCorporateClaims(status?: string, patientId?: string, startDate?: Date, endDate?: Date, corpId?: string, page = 1, limit = 50) {
    const where: any = { InsuranceProvider: { type: 'corporate' } };
    if (status) where.status = status;
    if (patientId) where.patientId = patientId;
    if (corpId) where.corporateAccountId = corpId;
    if (startDate || endDate) {
      where.Attendance = {};
      if (startDate) where.Attendance.dateTime = { ...where.Attendance.dateTime, gte: startDate };
      if (endDate) { const d = new Date(endDate); d.setHours(23, 59, 59, 999); where.Attendance.dateTime = { ...where.Attendance.dateTime, lte: d }; }
    }

    const pageNum = Math.max(1, page);
    const limitNum = Math.min(100, limit);
    const skip = (pageNum - 1) * limitNum;

    const [claims, total] = await Promise.all([
      this.prisma.insuranceClaim.findMany({ where, include: { InsuranceProvider: { select: { id: true, name: true, type: true } }, CorporateAccount: { select: { id: true, companyName: true } }, Patient: { select: { id: true, folderNumber: true, surname: true, otherNames: true } }, attendance: { select: { id: true, attendanceNumber: true, dateTime: true, corporateEmployeeId: true } }, Bill: { select: { id: true, billNumber: true, totalAmount: true } } }, orderBy: { createdAt: 'desc' }, skip, take: limitNum }),
      this.prisma.insuranceClaim.count({ where })
    ]);

    return { data: claims, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } };
  }
}