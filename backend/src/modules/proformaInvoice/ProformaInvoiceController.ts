import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { BaseController } from '../../shared/base/BaseController';
import { ProformaInvoiceService } from './ProformaInvoiceService';
import { AuthRequest } from '../../middleware/authMiddleware';

export class ProformaInvoiceController extends BaseController {
  private proformaInvoiceService: ProformaInvoiceService;

  constructor(prisma: PrismaClient) {
    super();
    this.proformaInvoiceService = new ProformaInvoiceService(prisma);
  }

  create = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.proformaInvoiceService.create(req.body, req.user!.id);
    return this.created(res, result, 'Proforma invoice created successfully');
  });

  getAll = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const filters = {
      patientId: req.query.patientId as string, accountId: req.query.accountId as string,
      status: req.query.status as any, encounterId: req.query.encounterId as string,
      fromDate: req.query.fromDate ? new Date(req.query.fromDate as string) : undefined,
      toDate: req.query.toDate ? new Date(req.query.toDate as string) : undefined,
      page: parseInt(req.query.page as string) || 1, limit: parseInt(req.query.limit as string) || 20
    };
    const result = await this.proformaInvoiceService.getAll(filters);
    return this.paginated(res, result.data, { page: result.pagination.page, limit: result.pagination.limit, total: result.pagination.total }, 'Proforma invoices retrieved');
  });

  getById = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const result = await this.proformaInvoiceService.getById(req.params.id);
      return this.ok(res, result, 'Proforma invoice retrieved');
    } catch (e: any) {
      if (e.message.includes('not found')) return this.notFound(res, 'Proforma invoice');
      throw e;
    }
  });

  update = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const result = await this.proformaInvoiceService.update(req.params.id, req.body, req.user!.id);
      return this.ok(res, result, 'Proforma invoice updated');
    } catch (e: any) {
      if (e.message.includes('not found') || e.message.includes('Only draft')) return this.badRequest(res, e.message);
      throw e;
    }
  });

  send = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const result = await this.proformaInvoiceService.send(req.params.id, req.user!.id);
      return this.ok(res, result, 'Proforma invoice sent');
    } catch (e: any) {
      if (e.message.includes('not found') || e.message.includes('Only draft')) return this.badRequest(res, e.message);
      throw e;
    }
  });

  accept = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const result = await this.proformaInvoiceService.accept(req.params.id, req.user!.id);
      return this.ok(res, result, 'Proforma invoice accepted');
    } catch (e: any) {
      if (e.message.includes('not found') || e.message.includes('Only sent') || e.message.includes('expired')) return this.badRequest(res, e.message);
      throw e;
    }
  });

  reject = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const result = await this.proformaInvoiceService.reject(req.params.id, req.body.reason, req.user!.id);
      return this.ok(res, result, 'Proforma invoice rejected');
    } catch (e: any) {
      if (e.message.includes('not found') || e.message.includes('Only sent')) return this.badRequest(res, e.message);
      throw e;
    }
  });

  convertToBill = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const result = await this.proformaInvoiceService.convertToBill(req.params.id, req.body, req.user!.id);
      return this.created(res, result, 'Proforma invoice converted to bill');
    } catch (e: any) {
      if (e.message.includes('not found') || e.message.includes('Only approved') || e.message.includes('already been converted')) return this.badRequest(res, e.message);
      throw e;
    }
  });

  delete = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      await this.proformaInvoiceService.delete(req.params.id, req.user!.id);
      return this.ok(res, { message: 'Proforma invoice deleted successfully' }, 'Proforma invoice deleted');
    } catch (e: any) {
      if (e.message.includes('not found') || e.message.includes('Only draft')) return this.badRequest(res, e.message);
      throw e;
    }
  });

  getStatistics = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const filters = {
      patientId: req.query.patientId as string, accountId: req.query.accountId as string,
      status: req.query.status as any,
      fromDate: req.query.fromDate ? new Date(req.query.fromDate as string) : undefined,
      toDate: req.query.toDate ? new Date(req.query.toDate as string) : undefined
    };
    const result = await this.proformaInvoiceService.getStatistics(filters);
    return this.ok(res, result, 'Statistics retrieved');
  });

  getExpiring = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const days = req.query.days ? parseInt(req.query.days as string) : 7;
    const result = await this.proformaInvoiceService.getExpiringSoon(days);
    return this.ok(res, result, 'Expiring invoices retrieved');
  });

  getByPatient = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.proformaInvoiceService.getByPatientId(req.params.patientId);
    return this.ok(res, result, 'Patient invoices retrieved');
  });

  getByCorporateAccount = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.proformaInvoiceService.getByCorporateAccountId(req.params.accountId);
    return this.ok(res, result, 'Corporate invoices retrieved');
  });
}