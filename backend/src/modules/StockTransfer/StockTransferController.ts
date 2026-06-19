import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { BaseController } from '../../shared/base/BaseController';
import { StockTransferService } from './StockTransferService';
import { AuthRequest } from '../../middleware/authMiddleware';

const prisma = new PrismaClient();

export class StockTransferController extends BaseController {
  private service: StockTransferService;

  constructor() {
    super();
    this.service = new StockTransferService(prisma);
  }

  getAll = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit } = this.getPaginationParams(req);
    const result = await this.service.getAllTransfers({ ...req.query, page, limit });
    return this.paginated(res, result.data, { page, limit, total: result.total }, 'Transfers retrieved');
  });

  getById = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.getTransferById(req.params.id);
    return this.ok(res, result, 'Transfer retrieved');
  });

  request = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.requestTransfer(req.body, req.user!.id);
    return this.created(res, result, 'Transfer requested successfully');
  });

  approve = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.approveTransfer(req.params.id, req.user!.id);
    return this.ok(res, result, 'Transfer approved');
  });

  dispatch = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.dispatchTransfer(req.params.id, req.user!.id);
    return this.ok(res, result, 'Transfer dispatched from origin');
  });

  receive = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.receiveTransfer(req.params.id, req.user!.id);
    return this.ok(res, result, 'Transfer received at destination. Batches updated.');
  });
}

export const stockTransferController = new StockTransferController();