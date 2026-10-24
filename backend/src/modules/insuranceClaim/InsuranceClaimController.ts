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

  getClaimsSummary = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const summary = await this.service.getClaimsSummary({ insuranceType: req.query.insuranceType as any });
    return this.ok(res, summary, 'Claims summary retrieved');
  });
}

export const insuranceClaimController = new InsuranceClaimController();