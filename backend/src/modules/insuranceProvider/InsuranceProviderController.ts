import { Response } from 'express';
import { validationResult } from 'express-validator';
import { PrismaClient, InsuranceType } from '@prisma/client';
import { BaseController } from '../../shared/base/BaseController';
import { InsuranceProviderService } from './InsuranceProviderService';
import { AuthRequest } from '../../middleware/authMiddleware';

export class InsuranceProviderController extends BaseController {
  private service: InsuranceProviderService;

  constructor(prisma: PrismaClient) { // ✅ Accept prisma via Dependency Injection
    super();
    this.service = new InsuranceProviderService(prisma);
  }

  getInsuranceProviders = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const filters: any = {};
      if (req.query.isActive !== undefined) filters.isActive = req.query.isActive === 'true';
      if (req.query.type) filters.type = req.query.type as InsuranceType;

      const providers = await this.service.getAllProviders(filters);
      return this.ok(res, providers, 'Insurance providers retrieved');
    } catch (e: any) {
      return this.error(res, e);
    }
  });

  getInsuranceProviderById = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const provider = await this.service.getProviderById(req.params.id);
      if (!provider) return this.notFound(res, 'Insurance provider');
      return this.ok(res, provider, 'Insurance provider retrieved');
    } catch (e: any) {
      return this.error(res, e);
    }
  });

  createInsuranceProvider = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return this.badRequest(res, 'Validation failed', errors.array() as any[]);

    try {
      // ✅ BaseController.error() automatically catches Prisma P2002 (Duplicate Name)
      const provider = await this.service.createProvider(req.body);
      return this.created(res, provider, 'Insurance provider created successfully');
    } catch (e: any) {
      return this.error(res, e);
    }
  });

  updateInsuranceProvider = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return this.badRequest(res, 'Validation failed', errors.array() as any[]);

    try {
      // ✅ BaseController.error() automatically catches Prisma P2025 (Not Found) and P2002 (Duplicate Name)
      const provider = await this.service.updateProvider(req.params.id, req.body);
      return this.ok(res, provider, 'Insurance provider updated successfully');
    } catch (e: any) {
      return this.error(res, e);
    }
  });

  deleteInsuranceProvider = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      // ✅ BaseController.error() automatically catches Prisma P2025 (Not Found) 
      // and P2003 (Foreign Key Constraint if patients/bills exist)
      await this.service.deleteProvider(req.params.id);
      return this.ok(res, null, 'Insurance provider deleted successfully');
    } catch (e: any) {
      return this.error(res, e);
    }
  });

  toggleInsuranceProviderStatus = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const provider = await this.service.toggleProviderStatus(req.params.id);
      const action = provider.isActive ? 'activated' : 'deactivated';
      return this.ok(res, provider, `Insurance provider ${action} successfully`);
    } catch (e: any) {
      return this.error(res, e);
    }
  });

  getInsuranceProviderStats = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const stats = await this.service.getProviderStats(req.params.id);
      if (!stats) return this.notFound(res, 'Insurance provider');
      return this.ok(res, stats, 'Statistics retrieved');
    } catch (e: any) {
      return this.error(res, e);
    }
  });

  getInsuranceTypes = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const types = await this.service.getInsuranceTypes();
      return this.ok(res, types, 'Insurance types retrieved');
    } catch (e: any) {
      return this.error(res, e);
    }
  });
}