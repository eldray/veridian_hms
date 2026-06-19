import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { BaseController } from '../../shared/base/BaseController';
import { ServiceCatalogService } from './ServiceCatalogService';
import { AuthRequest } from '../../middleware/authMiddleware';

const prisma = new PrismaClient();

export class ServiceCatalogController extends BaseController {
  private service: ServiceCatalogService;

  constructor() {
    super();
    this.service = new ServiceCatalogService(prisma);
  }

  getServiceCatalog = this.asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = this.getPaginationParams(req);
    const result = await this.service.getAll({ ...req.query, page, limit });
    return this.paginated(res, result.data, { page, limit, total: result.total }, 'Service catalog retrieved');
  });

  getServiceCatalogById = this.asyncHandler(async (req: Request, res: Response) => {
    const service = await this.service.getById(req.params.id);
    return this.ok(res, service, 'Service retrieved');
  });

  getServiceMetadata = this.asyncHandler(async (_req: Request, res: Response) => {
    const metadata = await this.service.getMetadata();
    return this.ok(res, metadata, 'Service metadata retrieved');
  });

  getServiceByNHISCode = this.asyncHandler(async (req: Request, res: Response) => {
    const service = await this.service.getByNHISCode(req.params.nhisCode);
    return this.ok(res, service, 'Service retrieved');
  });

  getNHISServices = this.asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = this.getPaginationParams(req);
    const result = await this.service.getNHISServices({ ...req.query, page, limit });
    return this.paginated(res, result.data, { page, limit, total: result.total }, 'NHIS services retrieved');
  });

  getServiceStatistics = this.asyncHandler(async (req: Request, res: Response) => {
    const stats = await this.service.getStatistics();
    return this.ok(res, stats, 'Statistics retrieved');
  });

  createServiceCatalog = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const service = await this.service.create(req.body, req.user!.id);
    return this.created(res, service, 'Service created');
  });

  updateServiceCatalog = this.asyncHandler(async (req: Request, res: Response) => {
    const service = await this.service.update(req.params.id, req.body);
    return this.ok(res, service, 'Service updated');
  });

  updatePricing = this.asyncHandler(async (req: Request, res: Response) => {
    const pricing = await this.service.updatePricingOnly(req.params.id, req.body);
    return this.ok(res, pricing, 'Pricing updated');
  });

  toggleServiceStatus = this.asyncHandler(async (req: Request, res: Response) => {
    const service = await this.service.toggleStatus(req.params.id, req.body.isActive);
    return this.ok(res, service, 'Status updated');
  });

  deleteServiceCatalog = this.asyncHandler(async (req: Request, res: Response) => {
    await this.service.delete(req.params.id);
    return this.ok(res, null, 'Service deleted');
  });

  checkServiceCoverage = this.asyncHandler(async (req: Request, res: Response) => {
    const result = await this.service.checkCoverage(req.body.serviceId, req.body.paymentMode);
    return this.ok(res, result, 'Coverage checked');
  });

  calculateServiceCost = this.asyncHandler(async (req: Request, res: Response) => {
    const result = await this.service.calculateCost(req.body.serviceId, req.body.paymentMode, req.body.quantity);
    return this.ok(res, result, 'Cost calculated');
  });

  getNHISReadinessReport = this.asyncHandler(async (req: Request, res: Response) => {
    const report = await this.service.getNHISReadinessReport();
    return this.ok(res, report, 'Report generated');
  });

  bulkImportServices = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.bulkImport(req.body.services, req.user!.id);
    return this.ok(res, result, 'Bulk import completed');
  });
}

export const serviceCatalogController = new ServiceCatalogController();