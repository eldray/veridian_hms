import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { BaseController } from '../../shared/base/BaseController';
import { CounterService } from './CounterService';
import { AuthRequest } from '../../middleware/authMiddleware';
import { UnauthorizedError } from '../../utils/errors';
import { parsePage, parsePageSize } from '../../shared/pagination';

export class CounterController extends BaseController {
  private service: CounterService;

  constructor(prisma: PrismaClient) {
    super();
    this.service = new CounterService(prisma);
  }

  private actor(req: AuthRequest): string {
    const actorId = req.user?.id || req.user?.userId;
    if (!actorId) throw new UnauthorizedError('Your sign-in is no longer valid. Please sign in again.');
    return actorId;
  }

  searchClients = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const query = String(req.query.query ?? '').trim();
    const limit = Math.min(parsePageSize(req.query.limit, 20), 50);
    const data = await this.service.searchClients(query, limit);
    return this.ok(res, data, 'Counter customers retrieved');
  });

  listTickets = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.listTickets({
      query: req.query.query ? String(req.query.query) : undefined,
      status: req.query.status ? String(req.query.status) : undefined,
      dateFrom: req.query.fromDate ? new Date(String(req.query.fromDate)) : undefined,
      dateTo: req.query.toDate ? new Date(String(req.query.toDate)) : undefined,
      page: parsePage(req.query.page),
      limit: parsePageSize(req.query.limit, 50),
    });
    return this.paginated(res, result.data, {
      page: result.pagination.page,
      limit: result.pagination.limit,
      total: result.pagination.total,
    }, 'Counter tickets retrieved');
  });

  getTicket = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await this.service.getTicket(req.params.id);
    return this.ok(res, data, 'Counter ticket retrieved');
  });

  createTicket = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await this.service.createTicket(req.body, this.actor(req));
    return this.created(res, data, 'Counter ticket opened');
  });

  addSaleItem = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await this.service.addSaleItem(req.params.id, req.body, this.actor(req));
    return this.created(res, data, 'Item added to the ticket');
  });

  dispenseItem = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await this.service.dispenseItem(req.params.id, req.params.medicationId, req.body, this.actor(req));
    return this.ok(res, data, 'Item handed over');
  });

  cancelSaleItem = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await this.service.cancelSaleItem(req.params.id, req.params.medicationId);
    return this.ok(res, data, 'Item removed from the ticket');
  });

  addLabOrder = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await this.service.addLabOrder(req.params.id, req.body, this.actor(req));
    return this.created(res, data, 'Laboratory test requested');
  });

  removeLabOrder = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await this.service.removeLabOrder(req.params.id, req.params.labTestId);
    return this.ok(res, data, 'Laboratory order cancelled');
  });

  addScanOrder = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await this.service.addScanOrder(req.params.id, req.body, this.actor(req));
    return this.created(res, data, 'Scan requested');
  });

  removeScanOrder = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await this.service.removeScanOrder(req.params.id, req.params.scanId);
    return this.ok(res, data, 'Scan order cancelled');
  });

  raiseBill = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await this.service.raiseBill(req.params.id, this.actor(req));
    return this.created(res, data, 'Bill raised for the counter ticket');
  });

  getBill = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await this.service.getBill(req.params.id);
    return this.ok(res, data, 'Counter bill retrieved');
  });

  closeTicket = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await this.service.closeTicket(req.params.id, this.actor(req));
    return this.ok(res, data, 'Counter ticket closed');
  });

  linkClient = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await this.service.linkClientToPatient(req.params.id, req.body.patientId);
    return this.ok(res, data, 'Counter customer linked to their patient folder');
  });
}
