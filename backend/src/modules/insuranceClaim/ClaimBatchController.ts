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
      periodYear: req.query.periodYear
        ? parseInt(req.query.periodYear as string, 10)
        : undefined,
      periodMonth: req.query.periodMonth
        ? parseInt(req.query.periodMonth as string, 10)
        : undefined,
      page,
      limit,
    });
    return this.paginated(
      res,
      result.data,
      { page: result.page, limit: result.limit, total: result.total },
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
  // ELIGIBLE (per period, grouped by type)
  // ==========================================
  eligible = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const periodYear = parseInt(req.query.periodYear as string, 10);
    const periodMonth = parseInt(req.query.periodMonth as string, 10);

    if (!Number.isFinite(periodYear) || !Number.isFinite(periodMonth)) {
      return this.badRequest(res, 'periodYear and periodMonth are required (1–12)');
    }
    if (periodMonth < 1 || periodMonth > 12) {
      return this.badRequest(res, 'periodMonth must be 1–12');
    }

    const summary = await this.service.eligibleForPeriod(periodYear, periodMonth);
    return this.ok(res, summary, 'Eligible claims for period');
  });

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