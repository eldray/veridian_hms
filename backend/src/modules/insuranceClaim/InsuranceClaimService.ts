// backend/src/modules/insuranceClaim/InsuranceClaimService.ts
import { Prisma, PrismaClient } from '@prisma/client';
import { ConflictError, NotFoundError, ValidationError } from '../../utils/errors';
import { BaseService } from '../../shared/base/BaseService';
import { InsuranceClaimRepository } from './InsuranceClaimRepository';
import { buildBillClaimItems, buildNHISClaimItems } from './ClaimGenerationService';
import {
  buildDatesOfService,
  mapAttendanceToServiceOutcome,
  mapAttendanceTypeToTypeOfAttendance,
  mapEncounterCategoryToTypeOfService,
} from './helpers/AttendanceOutcomeMapper';
import { getCounterService } from '../../services/CounterService';

interface IncomingItem {
  itemCategory: 'diagnosis' | 'investigation' | 'medicine' | 'procedure' | 'service' | 'gdrg';
  itemType?: string | null;
  code: string;
  description: string;
  quantity?: number;
  noOfDays?: number | null;
  unitPrice?: number;
  lineTotal?: number;
  serviceDate?: string | null;
  prescriptionText?: string | null;
  clinician?: string | null;
  prescriberNo?: string | null;
  billLineItemId?: string | null;
  serviceCatalogId?: string | null;
  diagnosisId?: string | null;
  gdrgTariffId?: string | null;
  labTestId?: string | null;
  scanId?: string | null;
  procedureId?: string | null;
  medicationId?: string | null;
}

export class InsuranceClaimService extends BaseService {
  private repo: InsuranceClaimRepository;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    super('InsuranceClaimService');
    this.prisma = prisma;
    this.repo = new InsuranceClaimRepository(prisma);
  }

  // ─── Listing / detail ─────────────────────────────────
  async listClaims(filters: any) {
    return this.repo.findClaimsPaginated({ ...filters, limit: Math.min(filters.limit ?? 20, 100) });
  }

  async listClaimsByType(providerType: 'nhis' | 'private' | 'corporate', filters: any) {
    return this.repo.findClaimsByProviderType(providerType, {
      ...filters,
      limit: Math.min(filters.limit ?? 20, 100),
    });
  }

  async getClaim(id: string) {
    const claim = await this.repo.findClaimById(id);
    if (!claim) throw new NotFoundError('Claim', id);
    return claim;
  }

  async getClaimByAttendanceId(attendanceId: string) {
    const claim = await this.repo.findClaimByAttendanceId(attendanceId);
    if (!claim) throw new NotFoundError('Claim for attendance', attendanceId);
    return claim;
  }

  // ─── CCC resolution ──────────────────────────────────
  /**
   * The attendance creation flow may write the claim check code to either
   * `nhisCCC` or `nhisCCCCode` — both columns exist on the Attendance model.
   * Read whichever is populated so the claim generation doesn't fight the
   * upstream flow. The value used is also snapshotted onto the claim as
   * `claimCheckCode`, so this fallback is only needed here.
   */
  private resolveAttendanceCCC(att: {
    nhisCCC?: string | null;
    nhisCCCCode?: string | null;
  }): string | null {
    const a = att.nhisCCC?.trim();
    if (a) return a;
    const b = att.nhisCCCCode?.trim();
    if (b) return b;
    return null;
  }

  // ─── Generation ───────────────────────────────────────
  async generateNHISClaim(attendanceId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.insuranceClaim.findFirst({ where: { attendanceId } });
      if (existing) return { claim: existing, isExisting: true };

      const att = await tx.attendance.findUnique({
        where: { id: attendanceId },
        include: { InsuranceProvider: true, Patient: true, Admission: true },
      });
      if (!att) throw new ValidationError('Attendance not found');
      if (!att.InsuranceProvider || att.InsuranceProvider.type !== 'nhis')
        throw new ValidationError('Attendance is not NHIS');

      const ccc = this.resolveAttendanceCCC(att);
      if (!ccc) {
        throw new ValidationError(
          'Attendance has no NHIS CCC. Generate it at registration/eligibility check first.',
        );
      }

      const { items, principalGDRG, mdcCode, total } = await buildNHISClaimItems(tx, attendanceId);
      const claimNumber = `NHIS-${getCounterService().nextAttendanceNumber()}`;
      const serviceOutcome = mapAttendanceToServiceOutcome(att.status, att.Admission?.dischargeStatus ?? null);
      const typeOfService = mapEncounterCategoryToTypeOfService(att.encounterCategory);
      const typeOfAttendance = mapAttendanceTypeToTypeOfAttendance(att.attendanceType);
      const datesOfService = buildDatesOfService(
        att.dateTime,
        att.Admission ? { admissionDate: att.Admission.admissionDate, dischargeDate: att.Admission.dischargeDate } : null,
      );

      const claim = await tx.insuranceClaim.create({
        data: {
          claimNumber,
          patientId: att.patientId,
          attendanceId: att.id,
          insuranceProviderId: att.insuranceProviderId!,
          totalClaimAmount: total,
          status: 'draft',
          createdById: userId,
          preAuthNumber: att.preAuthNumber ?? null,
          principalGDRG,
          claimCheckCode: ccc,
          typeOfService,
          typeOfAttendance,
          serviceOutcome,
          mdcCode,
          datesOfService: datesOfService as any,
          items: { create: items },
        },
      });
      return { claim, isExisting: false };
    });
  }

  async generatePrivateClaim(attendanceId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.insuranceClaim.findFirst({ where: { attendanceId } });
      if (existing) return { claim: existing, isExisting: true };

      const att = await tx.attendance.findUnique({
        where: { id: attendanceId },
        include: { InsuranceProvider: true, Admission: true },
      });
      if (!att) throw new ValidationError('Attendance not found');
      if (!att.InsuranceProvider || att.InsuranceProvider.type !== 'private')
        throw new ValidationError('Attendance is not private insurance');

      const { items, total } = await buildBillClaimItems(tx, attendanceId);
      const bill = await tx.bill.findFirst({ where: { attendanceId } });
      const claimNumber = `PRIV-${getCounterService().nextAttendanceNumber()}`;
      const serviceOutcome = mapAttendanceToServiceOutcome(att.status, att.Admission?.dischargeStatus ?? null);
      const typeOfService = mapEncounterCategoryToTypeOfService(att.encounterCategory);
      const typeOfAttendance = mapAttendanceTypeToTypeOfAttendance(att.attendanceType);
      const datesOfService = buildDatesOfService(
        att.dateTime,
        att.Admission ? { admissionDate: att.Admission.admissionDate, dischargeDate: att.Admission.dischargeDate } : null,
      );

      const claim = await tx.insuranceClaim.create({
        data: {
          claimNumber,
          patientId: att.patientId,
          attendanceId: att.id,
          insuranceProviderId: att.insuranceProviderId!,
          billId: bill?.id ?? null,
          totalClaimAmount: total,
          status: 'draft',
          createdById: userId,
          preAuthNumber: att.preAuthNumber ?? null,
          typeOfService,
          typeOfAttendance,
          serviceOutcome,
          datesOfService: datesOfService as any,
          items: { create: items },
        },
      });
      return { claim, isExisting: false };
    });
  }

  async generateCorporateClaim(attendanceId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.insuranceClaim.findFirst({ where: { attendanceId } });
      if (existing) return { claim: existing, isExisting: true, creditInfo: null };

      const att = await tx.attendance.findUnique({
        where: { id: attendanceId },
        include: { InsuranceProvider: true, Admission: true },
      });
      if (!att) throw new ValidationError('Attendance not found');
      if (!att.InsuranceProvider || att.InsuranceProvider.type !== 'corporate')
        throw new ValidationError('Attendance is not corporate');
      if (!att.corporateAccountId) throw new ValidationError('Attendance has no corporate account');

      const corp = await tx.corporateAccount.findUnique({ where: { id: att.corporateAccountId } });
      if (!corp || !corp.isActive) throw new ValidationError('Corporate account is inactive');

      const { items, total } = await buildBillClaimItems(tx, attendanceId);
      const bill = await tx.bill.findFirst({ where: { attendanceId } });
      const outstanding = await tx.insuranceClaim.aggregate({
        where: { corporateAccountId: att.corporateAccountId, status: { in: ['draft', 'finalized'] } },
        _sum: { totalClaimAmount: true },
      });
      const currentBal = outstanding._sum.totalClaimAmount ?? new Prisma.Decimal(0);
      const projected = currentBal.plus(total);
      if (projected.greaterThan(corp.creditLimit)) {
        throw new ConflictError(
          `Exceeds credit limit. Current: ${currentBal.toFixed(2)}, This claim: ${total.toFixed(2)}, Limit: ${corp.creditLimit.toFixed(2)}`,
        );
      }

      const claimNumber = `CORP-${getCounterService().nextAttendanceNumber()}`;
      const serviceOutcome = mapAttendanceToServiceOutcome(att.status, att.Admission?.dischargeStatus ?? null);
      const typeOfService = mapEncounterCategoryToTypeOfService(att.encounterCategory);
      const typeOfAttendance = mapAttendanceTypeToTypeOfAttendance(att.attendanceType);
      const datesOfService = buildDatesOfService(
        att.dateTime,
        att.Admission ? { admissionDate: att.Admission.admissionDate, dischargeDate: att.Admission.dischargeDate } : null,
      );

      const claim = await tx.insuranceClaim.create({
        data: {
          claimNumber,
          patientId: att.patientId,
          attendanceId: att.id,
          insuranceProviderId: att.insuranceProviderId!,
          corporateAccountId: att.corporateAccountId,
          billId: bill?.id ?? null,
          totalClaimAmount: total,
          status: 'draft',
          createdById: userId,
          preAuthNumber: att.preAuthNumber ?? null,
          typeOfService,
          typeOfAttendance,
          serviceOutcome,
          datesOfService: datesOfService as any,
          items: { create: items },
        },
      });

      return {
        claim,
        isExisting: false,
        creditInfo: {
          currentBalance: currentBal.toNumber(),
          projectedBalance: projected.toNumber(),
          limit: corp.creditLimit.toNumber(),
        },
      };
    });
  }

  // ─── Edit (draft only) ────────────────────────────────
  async updateDraftHeader(
    claimId: string,
    data: {
      notes?: string;
      preAuthNumber?: string;
      principalGDRG?: string;
      mdcCode?: string;
      metadata?: Prisma.InputJsonValue;
    },
    userId: string,
  ) {
    const claim = await this.prisma.insuranceClaim.findUnique({ where: { id: claimId } });
    if (!claim) throw new NotFoundError('Claim', claimId);
    if (claim.status !== 'draft') throw new ConflictError('Only draft claims can be edited');

    return this.prisma.insuranceClaim.update({
      where: { id: claimId },
      data: {
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.preAuthNumber !== undefined && { preAuthNumber: data.preAuthNumber }),
        ...(data.principalGDRG !== undefined && { principalGDRG: data.principalGDRG }),
        ...(data.mdcCode !== undefined && { mdcCode: data.mdcCode }),
        ...(data.metadata !== undefined && { metadata: data.metadata }),
        updatedById: userId,
      },
    });
  }

  async replaceClaimItems(claimId: string, items: IncomingItem[], userId: string) {
    if (!Array.isArray(items)) throw new ValidationError('items must be an array');
    if (items.length === 0) throw new ValidationError('items cannot be empty');

    const claim = await this.prisma.insuranceClaim.findUnique({ where: { id: claimId } });
    if (!claim) throw new NotFoundError('Claim', claimId);
    if (claim.status !== 'draft') throw new ConflictError('Only draft claims can be edited');

    let runningTotal = new Prisma.Decimal(0);

    const rows = items.map((item, index) => {
      const quantity = Math.max(1, Math.trunc(Number(item.quantity ?? 1)));
      const unitPrice =
        item.unitPrice != null ? new Prisma.Decimal(item.unitPrice.toString())
        : item.lineTotal != null ? new Prisma.Decimal(item.lineTotal.toString()).dividedBy(quantity)
        : new Prisma.Decimal(0);
      const lineTotal = item.lineTotal != null
        ? new Prisma.Decimal(item.lineTotal.toString())
        : unitPrice.times(quantity);
      runningTotal = runningTotal.plus(lineTotal);

      return {
        claimId,
        itemNumber: index + 1,
        itemCategory: item.itemCategory,
        itemType: item.itemType ?? null,
        code: item.code ?? '',
        description: item.description ?? '',
        quantity,
        noOfDays: item.noOfDays ?? null,
        unitPrice,
        lineTotal,
        serviceDate: item.serviceDate ? new Date(item.serviceDate) : null,
        prescriptionText: item.prescriptionText ?? null,
        clinician: item.clinician ?? null,
        prescriberNo: item.prescriberNo ?? null,
        billLineItemId: item.billLineItemId ?? null,
        serviceCatalogId: item.serviceCatalogId ?? null,
        diagnosisId: item.diagnosisId ?? null,
        gdrgTariffId: item.gdrgTariffId ?? null,
        labTestId: item.labTestId ?? null,
        scanId: item.scanId ?? null,
        procedureId: item.procedureId ?? null,
        medicationId: item.medicationId ?? null,
      };
    });

    return this.prisma.$transaction(async (tx) => {
      await tx.insuranceClaimItem.deleteMany({ where: { claimId } });
      await tx.insuranceClaimItem.createMany({ data: rows });
      return tx.insuranceClaim.update({
        where: { id: claimId },
        data: { totalClaimAmount: runningTotal, updatedById: userId },
        include: { items: { orderBy: { itemNumber: 'asc' } } },
      });
    });
  }

  // ─── Finalize ────────────────────────────────────────
  async finalizeClaim(claimId: string, userId: string) {
    const claim = await this.prisma.insuranceClaim.findUnique({
      where: { id: claimId },
      include: { _count: { select: { items: true } } },
    });
    if (!claim) throw new NotFoundError('Claim', claimId);
    if (claim.status !== 'draft') throw new ConflictError('Only draft claims can be finalized');
    if (claim._count.items === 0) throw new ValidationError('Cannot finalize a claim with no items');

    return this.prisma.insuranceClaim.update({
      where: { id: claimId },
      data: {
        status: 'finalized',
        finalizedAt: new Date(),
        finalizedById: userId,
        updatedById: userId,
      },
    });
  }

  // ─── Summary ─────────────────────────────────────────
  async getClaimsSummary(filters: { insuranceType?: 'nhis' | 'private' | 'corporate' } = {}) {
    const [draft, finalized] = await Promise.all([
      this.prisma.insuranceClaim.aggregate({
        where: {
          status: 'draft',
          ...(filters.insuranceType && { InsuranceProvider: { is: { type: filters.insuranceType } } }),
        },
        _count: true,
        _sum: { totalClaimAmount: true },
      }),
      this.prisma.insuranceClaim.aggregate({
        where: {
          status: 'finalized',
          ...(filters.insuranceType && { InsuranceProvider: { is: { type: filters.insuranceType } } }),
        },
        _count: true,
        _sum: { totalClaimAmount: true },
      }),
    ]);

    return {
      draft: { count: draft._count, totalAmount: draft._sum.totalClaimAmount?.toNumber() ?? 0 },
      finalized: { count: finalized._count, totalAmount: finalized._sum.totalClaimAmount?.toNumber() ?? 0 },
    };
  }
}