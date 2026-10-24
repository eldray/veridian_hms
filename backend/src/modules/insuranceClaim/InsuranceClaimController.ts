// backend/src/modules/insuranceClaim/InsuranceClaimController.ts
import { Response } from 'express';
import { BaseController } from '../../shared/base/BaseController';
import { InsuranceClaimService } from './InsuranceClaimService';
import { InsuranceClaimRepository } from './InsuranceClaimRepository';
import { ClaimPrintService } from './ClaimPrintService';
import { NHISClaimXMLBuilder } from './xml/NHISClaimXMLBuilder';
import { AuthRequest } from '../../middleware/authMiddleware';
import prisma from '../../core/database/prisma.client';

export class InsuranceClaimController extends BaseController {
  private service: InsuranceClaimService;
  private repo: InsuranceClaimRepository;
  private xmlBuilder: NHISClaimXMLBuilder;
  private printService: ClaimPrintService;

  constructor() {
    super();
    this.service = new InsuranceClaimService(prisma);
    this.repo = new InsuranceClaimRepository(prisma);
    this.xmlBuilder = new NHISClaimXMLBuilder();
    this.printService = new ClaimPrintService(prisma);
  }

  listClaims = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit } = this.getPaginationParams(req);
    const result = await this.service.listClaims({
      status: req.query.status as any,
      insuranceProviderId: req.query.insuranceProviderId as string | undefined,
      corporateAccountId: req.query.corporateAccountId as string | undefined,
      patientId: req.query.patientId as string | undefined,
      dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
      dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
      page,
      limit,
    });
    return this.paginated(
      res,
      result.data,
      { page: result.page, limit: result.limit, total: result.total },
      'Claims retrieved',
    );
  });

  listNHISClaims = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit } = this.getPaginationParams(req);
    const result = await this.service.listClaimsByType('nhis', {
      status: req.query.status as any,
      patientId: req.query.patientId as string | undefined,
      dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
      dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
      page,
      limit,
    });
    return this.paginated(res, result.data, { page: result.page, limit: result.limit, total: result.total }, 'NHIS claims retrieved');
  });

  listPrivateClaims = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit } = this.getPaginationParams(req);
    const result = await this.service.listClaimsByType('private', {
      status: req.query.status as any,
      patientId: req.query.patientId as string | undefined,
      dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
      dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
      page,
      limit,
    });
    return this.paginated(res, result.data, { page: result.page, limit: result.limit, total: result.total }, 'Private claims retrieved');
  });

  listCorporateClaims = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit } = this.getPaginationParams(req);
    const result = await this.service.listClaimsByType('corporate', {
      status: req.query.status as any,
      patientId: req.query.patientId as string | undefined,
      corporateAccountId: req.query.corporateAccountId as string | undefined,
      dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
      dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
      page,
      limit,
    });
    return this.paginated(res, result.data, { page: result.page, limit: result.limit, total: result.total }, 'Corporate claims retrieved');
  });

  listClaimsMissingItems = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit } = this.getPaginationParams(req);
    const result = await this.service.listClaimsMissingItems({
      insuranceType: req.query.insuranceType as string | undefined,
      status: req.query.status as string | undefined,
      page,
      limit,
    });
    return this.paginated(
      res,
      result.data,
      { page: result.page, limit: result.limit, total: result.total },
      'Claims missing itemized lines retrieved for audit',
    );
  });

  getClaim = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const claim = await this.service.getClaim(req.params.id);
    return this.ok(res, claim, 'Claim retrieved');
  });

  getClaimByAttendanceId = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const claim = await this.service.getClaimByAttendanceId(req.params.attendanceId);
    return this.ok(res, claim, 'Claim retrieved');
  });

  generateNHISClaim = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.generateNHISClaim(req.body.attendanceId, req.user!.id);
    return result.isExisting
      ? this.ok(res, result.claim, 'NHIS claim already exists')
      : this.created(res, result.claim, 'NHIS claim generated');
  });

  generatePrivateClaim = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.generatePrivateClaim(req.body.attendanceId, req.user!.id);
    return result.isExisting
      ? this.ok(res, result.claim, 'Private claim already exists')
      : this.created(res, result.claim, 'Private claim generated');
  });

  generateCorporateClaim = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.generateCorporateClaim(req.body.attendanceId, req.user!.id);
    return result.isExisting
      ? this.ok(res, result.claim, 'Corporate claim already exists')
      : this.created(res, { claim: result.claim, creditInfo: result.creditInfo }, 'Corporate claim generated');
  });

  updateDraft = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const claim = await this.service.updateDraftHeader(req.params.claimId, req.body, req.user!.id);
    return this.ok(res, claim, 'Draft updated');
  });

  replaceItems = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const claim = await this.service.replaceClaimItems(
      req.params.claimId,
      req.body.items,
      req.user!.id,
    );
    return this.ok(res, claim, 'Claim items replaced');
  });

  finalizeClaim = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const claim = await this.service.finalizeClaim(req.params.claimId, req.user!.id);
    return this.ok(res, claim, 'Claim finalized');
  });

  downloadClaimXml = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const claim: any = await this.repo.findClaimById(req.params.claimId);
    if (!claim) return this.notFound(res, 'Claim');
    if (claim.InsuranceProvider?.type !== 'nhis') {
      return this.badRequest(res, 'Only NHIS claims produce XML');
    }
    const hospital = await prisma.hospital.findFirst();
    if (!hospital) return this.badRequest(res, 'Hospital record not found');
    const xml = this.xmlBuilder.buildSingleClaimXml(claim, hospital);
    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="claim-${claim.claimNumber}.xml"`);
    return res.send(xml);
  });

  printClaim = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const html = await this.printService.renderClaimHtml(req.params.claimId);
    res.set('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  });

  listTrackingClaims = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const where: any = { status: 'finalized' };
    if (req.query.insuranceType) {
      where.InsuranceProvider = { type: String(req.query.insuranceType) };
    }
    if (req.query.search) {
      const search = String(req.query.search).trim();
      if (search) where.OR = [
        { claimNumber: { contains: search, mode: 'insensitive' } },
        { Patient: { folderNumber: { contains: search, mode: 'insensitive' } } },
        { Patient: { surname: { contains: search, mode: 'insensitive' } } },
        { InsuranceProvider: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }
    const [claims, total] = await Promise.all([
      prisma.insuranceClaim.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { finalizedAt: 'desc' },
        include: {
          InsuranceProvider: { select: { id: true, name: true, type: true } },
          Patient: { select: { id: true, folderNumber: true, surname: true, otherNames: true } },
          Attendance: { select: { attendanceNumber: true, dateTime: true } },
          trackingEvents: { orderBy: { createdAt: 'asc' } },
        },
      }),
      prisma.insuranceClaim.count({ where }),
    ]);
    const data = claims.map((claim: any) => {
      const paid = claim.trackingEvents
        .filter((event: any) => event.eventType === 'payment')
        .reduce((sum: number, event: any) => sum + Number(event.amount || 0), 0);
      return { ...claim, tracking: {
        totalPaid: paid,
        outstanding: Math.max(0, Number(claim.totalClaimAmount) - paid),
        latestStatus: paid >= Number(claim.totalClaimAmount) && paid > 0
          ? 'paid'
          : paid > 0
            ? 'partially_paid'
            : ([...claim.trackingEvents].reverse().find((event: any) => event.eventType === 'adjudication')?.status
              || (claim.trackingEvents.some((event: any) => event.eventType === 'submission') ? 'submitted' : 'not_submitted')),
      }};
    });
    return this.paginated(res, data, { page, limit, total }, 'Finalized claims tracking retrieved');
  });

  recordTrackingEvent = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { eventType, status, submissionDate, payerReference, amount, paymentReference, paymentMethod, notes } = req.body || {};
    const allowedTypes = ['submission', 'adjudication', 'payment', 'note'];
    if (!allowedTypes.includes(eventType)) return this.badRequest(res, 'Invalid tracking event type');
    const claim = await prisma.insuranceClaim.findUnique({
      where: { id: req.params.claimId },
      select: { id: true, claimNumber: true, status: true, totalClaimAmount: true },
    });
    if (!claim) return this.notFound(res, 'Insurance claim');
    if (claim.status !== 'finalized') return this.badRequest(res, 'Only finalized claims can be tracked for submission or remittance');

    if (eventType === 'payment') {
      const numericAmount = Number(amount);
      if (!Number.isFinite(numericAmount) || numericAmount <= 0) return this.badRequest(res, 'Payment amount must be greater than zero');
      if (!String(paymentReference || '').trim()) return this.badRequest(res, 'A payer remittance/payment reference is required to prevent duplicate entries');
      try {
        const event = await prisma.$transaction(async (tx: any) => {
          await tx.$queryRaw`SELECT "id" FROM "InsuranceClaim" WHERE "id" = ${claim.id} FOR UPDATE`;
          const existing = await tx.insuranceClaimTrackingEvent.findMany({
            where: { claimId: claim.id, eventType: 'payment' }, select: { amount: true },
          });
          const paid = existing.reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0);
          if (paid + numericAmount > Number(claim.totalClaimAmount) + 0.005) {
            throw new Error('Payment exceeds the remaining claim amount. Check the remittance and existing allocations.');
          }
          return tx.insuranceClaimTrackingEvent.create({
            data: {
              claimId: claim.id, eventType, amount: numericAmount,
              paymentReference: String(paymentReference).trim(),
              paymentMethod: paymentMethod ? String(paymentMethod).trim() : null,
              payerReference: payerReference ? String(payerReference).trim() : null,
              notes: notes ? String(notes).trim() : null,
              recordedById: req.user!.id,
            },
          });
        });
        return this.created(res, event, 'Claim payment recorded');
      } catch (error: any) {
        if (error?.code === 'P2002' || /unique constraint/i.test(String(error?.message))) {
          return this.conflict(res, 'This payment reference has already been recorded');
        }
        if (String(error?.message || '').includes('exceeds the remaining')) return this.badRequest(res, error.message);
        throw error;
      }
    }

    if (eventType === 'submission' && !String(payerReference || '').trim()) {
      return this.badRequest(res, 'Enter the payer submission/reference number where available');
    }
    const event = await prisma.insuranceClaimTrackingEvent.create({
      data: {
        claimId: claim.id, eventType,
        status: status ? String(status).trim().toLowerCase() : null,
        submissionDate: submissionDate ? new Date(submissionDate) : (eventType === 'submission' ? new Date() : null),
        payerReference: payerReference ? String(payerReference).trim() : null,
        notes: notes ? String(notes).trim() : null,
        recordedById: req.user!.id,
      },
    });
    return this.created(res, event, 'Claim tracking event recorded');
  });

  getClaimsSummary = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const summary = await this.service.getClaimsSummary({ insuranceType: req.query.insuranceType as any });
    return this.ok(res, summary, 'Claims summary retrieved');
  });
}

export const insuranceClaimController = new InsuranceClaimController();