import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient, FPMethod, FPMethodCategory } from '@prisma/client';
import { BaseController } from '../../shared/base/BaseController';
import { FamilyPlanningService } from './FamilyPlanningService';

interface AuthRequest extends Request {
  user?: any;
}

export class FamilyPlanningController extends BaseController {
  private service: FamilyPlanningService;

  constructor(prisma: PrismaClient) {
    super();
    this.service = new FamilyPlanningService(prisma);
  }

  createFPService = [
    body('patientId').notEmpty().withMessage('Patient ID is required'),
    // ✅ Use actual Prisma enums for validation instead of hardcoded arrays
    body('method').isIn(Object.values(FPMethod)).withMessage('Invalid FP method'),
    body('methodCategory').isIn(Object.values(FPMethodCategory)).withMessage('Invalid FP method category'),
    this.asyncHandler(async (req: AuthRequest, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return this.badRequest(res, 'Validation failed', errors.array() as any[]);

      const data = { ...req.body, providedById: req.user?.id };
      const record = await this.service.createFPService(data);
      return this.created(res, record, 'Family planning service recorded successfully');
    })
  ];

  getFPServices = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit } = this.getPaginationParams(req);
    const { patientId, method, methodCategory, startDate, endDate, isNewAcceptor } = req.query;

    const filters = {
      patientId: patientId as string,
      method: method as string,
      methodCategory: methodCategory as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      isNewAcceptor: isNewAcceptor === 'true' ? true : isNewAcceptor === 'false' ? false : undefined,
      page, limit
    };

    const result = await this.service.getFPServices(filters);
    return this.paginated(res, result.data, result.pagination, 'FP services retrieved successfully');
  });

  getFPServiceById = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const record = await this.service.getFPServiceById(req.params.id);
    return this.ok(res, record, 'FP service retrieved successfully');
  });

  getCurrentMethod = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const currentMethod = await this.service.getCurrentMethodForPatient(req.params.patientId);
    return this.ok(res, currentMethod, 'Current method retrieved');
  });

  getFPHistory = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const history = await this.service.getFPHistoryForPatient(req.params.patientId);
    return this.ok(res, history, 'FP history retrieved');
  });

  updateFPService = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const record = await this.service.updateFPService(req.params.id, req.body);
    return this.ok(res, record, 'FP service updated successfully');
  });

  deleteFPService = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    await this.service.deleteFPService(req.params.id);
    return this.ok(res, null, 'FP service deleted successfully');
  });

  getStatistics = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { startDate, endDate } = req.query;
    const stats = await this.service.getFPStatistics(
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );
    return this.ok(res, stats, 'Statistics retrieved');
  });

  getMethodMix = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { startDate, endDate } = req.query;
    const methodMix = await this.service.getMethodMix(
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );
    return this.ok(res, methodMix, 'Method mix retrieved');
  });

  getClientDetails = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const details = await this.service.getFPClientDetails(req.params.patientId);
    return this.ok(res, details, 'Client details retrieved');
  });

  getGHSReport = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) return this.badRequest(res, 'Start date and end date are required');
    
    const report = await this.service.getGHSFPReport(
      new Date(startDate as string),
      new Date(endDate as string)
    );
    return this.ok(res, report, 'GHS report generated');
  });
}