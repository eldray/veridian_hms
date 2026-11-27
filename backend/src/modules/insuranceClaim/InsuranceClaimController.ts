// backend/src/modules/insuranceClaim/InsuranceClaimController.ts
import { Response } from 'express';
import { BaseController } from '../../shared/base/BaseController';
import { InsuranceClaimService } from './InsuranceClaimService';
import { InsuranceClaimRepository } from './InsuranceClaimRepository';
import { ClaimPrintService } from './ClaimPrintService';
import { NHISClaimXMLBuilder } from './xml/NHISClaimXMLBuilder';
import { ClaimItSubmissionService, claimItClient } from './claimit/ClaimItSubmissionService';
import { AuthRequest } from '../../middleware/authMiddleware';
import prisma from '../../core/database/prisma.client';
import { DocumentService } from '../document/DocumentService';

export class InsuranceClaimController extends BaseController {
  private service: InsuranceClaimService;
  private repo: InsuranceClaimRepository;
  private xmlBuilder: NHISClaimXMLBuilder;
  private printService: ClaimPrintService;
  private claimit: ClaimItSubmissionService;
  private documents: DocumentService;

  constructor() {
    super();
    this.service = new InsuranceClaimService(prisma);
    this.repo = new InsuranceClaimRepository(prisma);
    this.xmlBuilder = new NHISClaimXMLBuilder();
    this.printService = new ClaimPrintService(prisma);
    this.claimit = new ClaimItSubmissionService(prisma);
    this.documents = new DocumentService();
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

  /** The medicines this NHIS claim can bill, already priced - the form's only medicine source. */
  listNHISClaimMedicines = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.listNHISClaimableMedicines(req.params.claimId as string);
    return this.ok(res, result, 'NHIS claimable medicines retrieved');
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

  deleteDraft = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const claim = await this.service.deleteDraftClaim(req.params.claimId);
    return this.ok(res, { id: claim.id, claimNumber: claim.claimNumber }, 'Draft claim deleted');
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

  recordPremierPatientPayment = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const payment = await this.service.recordPremierPatientPayment(req.params.claimId, req.body, req.user!.id);
    const receipt = await this.documents.generatePremierClaimReceipt(req.params.claimId, payment.id, req.user!.id);
    return this.created(res, { payment, receipt }, receipt.success
      ? 'Premier patient payment recorded and receipt generated'
      : 'Payment recorded, but the receipt could not be generated. The collection is saved; ask Accounts to reprint the receipt.');
  });

  reprintPremierPatientPaymentReceipt = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const receipt = await this.documents.generatePremierClaimReceipt(req.params.claimId, req.params.paymentId, req.user!.id);
    if (!receipt.success || !receipt.filePath) return this.badRequest(res, receipt.error || 'Could not generate the payment receipt.');
    return this.ok(res, receipt, 'Premier patient payment receipt is ready');
  });

  listTrackingClaims = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const where: any = { status: 'finalized' };
    const insuranceType = req.query.insuranceType ? String(req.query.insuranceType).trim().toLowerCase() : '';
    if (insuranceType && !['nhis', 'private', 'corporate'].includes(insuranceType)) {
      return this.badRequest(res, 'insuranceType must be nhis, private, or corporate');
    }
    if (insuranceType === 'corporate') {
      // Corporate claims may use a provider whose type is "private".
      where.corporateAccountId = { not: null };
    } else if (insuranceType === 'private') {
      // Keep corporate-account claims out of the private-only tracking view.
      where.InsuranceProvider = { type: 'private' };
      where.corporateAccountId = null;
    } else if (insuranceType === 'nhis') {
      where.InsuranceProvider = { type: 'nhis' };
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
    const data = claims.map((claim: any) => ({
      ...claim,
      tracking: {
        // Payments are reconciled once against the monthly batch, never against individual claims.
        totalPaid: 0,
        outstanding: Number(claim.totalClaimAmount),
        latestStatus: claim.trackingEvents.some((event: any) => event.eventType === 'submission')
          ? 'submitted'
          : 'not_submitted',
      },
    }));
    return this.paginated(res, data, { page, limit, total }, 'Finalized claims tracking retrieved');
  });

  recordTrackingEvent = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { eventType, status, submissionDate, payerReference, notes } = req.body || {};
    // Payments are reconciled against the monthly payer batch, not individual claims.
    if (eventType === 'payment') {
      return this.badRequest(
        res,
        'Individual claim payments are disabled. Record the remittance against the relevant monthly batch in Tracking & payments.',
      );
    }
    const allowedTypes = ['submission', 'note'];
    if (!allowedTypes.includes(eventType)) return this.badRequest(res, 'Invalid tracking event type');
    const claim = await prisma.insuranceClaim.findUnique({
      where: { id: req.params.claimId },
      select: { id: true, claimNumber: true, status: true },
    });
    if (!claim) return this.notFound(res, 'Insurance claim');
    if (claim.status !== 'finalized') return this.badRequest(res, 'Only finalized claims can be tracked for submission');

    if (eventType === 'submission' && !String(payerReference || '').trim()) {
      return this.badRequest(res, 'Enter the payer submission/reference number where available');
    }
    if (eventType === 'submission' && submissionDate && Number.isNaN(new Date(submissionDate).getTime())) {
      return this.badRequest(res, 'Submission date is invalid');
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

  /**
   * What CLAIM-it setup looks like from the app's side, with no secrets in the answer.
   */
  claimitStatus = this.asyncHandler(async (_req: AuthRequest, res: Response) => {
    return this.ok(res, claimItClient.getReadiness(), 'CLAIM-it status retrieved');
  });

  /**
   * Handshake only: fetches a token and writes nothing to the claims database.
   *
   * A failure is returned as data rather than thrown, because "which of the three things is wrong"
   * is the answer the person configuring this needs, not a red toast.
   */
  claimitTestConnection = this.asyncHandler(async (_req: AuthRequest, res: Response) => {
    const result = await claimItClient.testConnection();
    return this.ok(res, result, result.ok ? 'CLAIM-it connection verified' : 'CLAIM-it connection failed');
  });

  /** Send one finalized NHIS claim to CLAIM-it and return its own line of the import report. */
  submitClaimToClaimIt = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.claimit.submitClaim(req.params.claimId, req.user!.id);
    return this.ok(res, result, result.message);
  });

  /**
   * Withdraw a claim from CLAIM-it.
   *
   * Asked for explicitly: leaving a wrong claim on the payer's side is cheaper than silently
   * deleting a batch, so there is no bulk delete behind a list button.
   */
  deleteClaimFromClaimIt = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.claimit.deleteClaimFromClaimIt(req.params.claimId);
    return this.ok(res, result, result.message);
  });

  /** Every CLAIM-it attempt recorded for one claim, newest first. */
  claimitClaimSubmissions = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.claimit.listClaimSubmissions(req.params.claimId);
    return this.ok(res, result, 'CLAIM-it submissions retrieved');
  });
}

export const insuranceClaimController = new InsuranceClaimController();