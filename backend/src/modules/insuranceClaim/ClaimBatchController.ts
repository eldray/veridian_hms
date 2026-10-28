import { Response } from 'express';
import { BaseController } from '../../shared/base/BaseController';
import { ClaimBatchService } from './ClaimBatchService';
import { ClaimPrintService } from './ClaimPrintService';
import { AuthRequest } from '../../middleware/authMiddleware';
import prisma from '../../core/database/prisma.client';

export class ClaimBatchController extends BaseController {
  private service: ClaimBatchService;
  private printService: ClaimPrintService;

  constructor() {
    super();
    this.service = new ClaimBatchService(prisma);
    this.printService = new ClaimPrintService(prisma);
  }

  // ==========================================
  // LIST
  // ==========================================
  listBatches = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit } = this.getPaginationParams(req);
    const result = await this.service.listBatches({
      insuranceType: req.query.insuranceType as string | undefined,
      insuranceProviderId: req.query.insuranceProviderId as string | undefined,
      corporateAccountId: req.query.corporateAccountId as string | undefined,
      status: req.query.status as string | undefined,
      search: req.query.search as string | undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      periodYear: req.query.periodYear
        ? parseInt(req.query.periodYear as string, 10)
        : undefined,
      periodMonth: req.query.periodMonth
        ? parseInt(req.query.periodMonth as string, 10)
        : undefined,
      page,
      limit,
    });
    return this.ok(
      res,
      { data: result.data, pagination: result.pagination, summary: result.summary },
      'Claim batches retrieved',
    );
  });

  getBatch = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const batch = await this.service.getBatch(req.params.id);
    return this.ok(res, batch, 'Claim batch retrieved');
  });

  // ==========================================
  // GENERATE
  // ==========================================
  generateBatch = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const batch = await this.service.generateBatch(
      {
        insuranceType: req.body.insuranceType,
        periodYear: req.body.periodYear,
        periodMonth: req.body.periodMonth,
        insuranceProviderId: req.body.insuranceProviderId,
        corporateAccountId: req.body.corporateAccountId,
        description: req.body.description,
      },
      req.user!.id,
    );
    return this.created(res, batch, 'Claim batch generated');
  });

  // ==========================================
  // PERIOD VIEWS (month-driven)
  // ==========================================

  /** Counts + amounts for one month. Pass the provider or account the batch will use to get
   *  exactly the number that batch would take. */
  eligible = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const period = this.parsePeriod(req);
    if (!period) return this.badRequest(res, 'periodYear and periodMonth are required (1–12)');

    const summary = await this.service.eligibleForPeriod(period.periodYear, period.periodMonth, {
      insuranceProviderId: typeof req.query.insuranceProviderId === 'string' ? req.query.insuranceProviderId : null,
      corporateAccountId: typeof req.query.corporateAccountId === 'string' ? req.query.corporateAccountId : null,
    });
    return this.ok(res, summary, 'Eligible claims for period');
  });

  /**
   * GET /insurance-claims/batches/period-claims
   * The claims of one month — batched or not — with that month's totals.
   */
  periodClaims = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const period = this.parsePeriod(req);
    if (!period) return this.badRequest(res, 'periodYear and periodMonth are required (1–12)');

    const result = await this.service.claimsForPeriod(period.periodYear, period.periodMonth, {
      insuranceType: typeof req.query.insuranceType === 'string' ? req.query.insuranceType : undefined,
      batched: typeof req.query.batched === 'string' ? req.query.batched : undefined,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
    });
    return this.ok(res, result, 'Claims for period retrieved');
  });

  private parsePeriod(req: AuthRequest): { periodYear: number; periodMonth: number } | null {
    const periodYear = parseInt(req.query.periodYear as string, 10);
    const periodMonth = parseInt(req.query.periodMonth as string, 10);
    if (!Number.isFinite(periodYear) || !Number.isFinite(periodMonth)) return null;
    return { periodYear, periodMonth };
  }

  // ==========================================
  // FINALIZE / DELETE
  // ==========================================
  finalizeBatch = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const batch = await this.service.finalizeBatch(req.params.id, req.user!.id);
    return this.ok(res, batch, 'Claim batch finalized');
  });

  deleteBatch = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.deleteBatch(req.params.id);
    return this.ok(res, result, 'Claim batch deleted');
  });

  // ==========================================
  // XML (NHIS only)
  // ==========================================
  downloadXml = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { xml, filename } = await this.service.getNHISBatchXml(req.params.id);
    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(xml);
  });

  // ==========================================
  // PRINT (any provider type — batch summary)
  // ==========================================
  printBatch = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const html = await this.printService.renderBatchHtml(req.params.id);
    res.set('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  });
}

export const claimBatchController = new ClaimBatchController();