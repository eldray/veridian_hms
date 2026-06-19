import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthRequest } from '../../middleware/authMiddleware';
import { BaseController } from '../../shared/base/BaseController';
import { GDRGService } from './GDRGService';
import { CreateGDRGTariffRequest, UpdateGDRGTariffRequest } from './GDRGTypes';
import { PrismaClient } from '@prisma/client';

export class GDRGController extends BaseController {
  private gdrgService: GDRGService;

  constructor(prisma: PrismaClient) {
    super();
    this.gdrgService = new GDRGService(prisma);
  }

  getTariffs = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    // ✅ Use BaseController's safe pagination parser (caps limit at 100)
    const { page, limit } = this.getPaginationParams(req);
    const { mdc, isActive, search } = req.query;

    const where: any = {};
    if (mdc) where.mdc = mdc;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        { gdrgCode: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { nhisServiceCode: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const include = {
      diagnoses: { include: { diagnosis: { select: { id: true, name: true, icdCode: true, morbidityGroup: true } } } },
      ServiceCatalog: { select: { id: true, name: true, code: true, serviceType: true } }
    };

    const result = await this.gdrgService.getAllTariffs(where, include, page, limit);
    return this.paginated(res, result.data, result.pagination, 'GDRG tariffs retrieved successfully');
  });

  getTariffByCode = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { code } = req.params;
    const include = {
      diagnoses: { include: { diagnosis: { select: { id: true, name: true, icdCode: true, morbidityGroup: true } } } },
      ServiceCatalog: { select: { id: true, name: true, code: true, serviceType: true, pricing: { select: { cashPrice: true, nhisPrice: true, insurancePrice: true } } } }
    };

    const tariff = await this.gdrgService.getTariffByCode(code, include);
    if (!tariff) return this.notFound(res, 'GDRG tariff');
    
    return this.ok(res, tariff, 'GDRG tariff retrieved successfully');
  });

  lookupByAge = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { gdrgCode, patientId, attendanceDate, ageInYears } = req.query;
    if (!gdrgCode) return this.badRequest(res, 'GDRG code is required');

    const result = await this.gdrgService.lookupByAge(
      gdrgCode as string,
      patientId as string | undefined,
      attendanceDate as string | undefined,
      ageInYears ? parseInt(ageInYears as string) : undefined
    );
    return this.ok(res, result, 'GDRG lookup completed');
  });

  createTariff = [
    body('gdrgCode').notEmpty().withMessage('GDRG code is required'),
    body('mdc').notEmpty().withMessage('MDC is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('nhiaTariff').isNumeric({ min: 0 }).withMessage('NHIA tariff must be a positive number'),
    this.asyncHandler(async (req: AuthRequest, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return this.badRequest(res, 'Validation failed', errors.array() as any[]);

      // ✅ BaseController.error() automatically catches Prisma P2002 (Duplicate gdrgCode)
      const tariff = await this.gdrgService.createTariff(req.body);
      return this.created(res, tariff, 'GDRG tariff created successfully');
    })
  ];

  updateTariff = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { code } = req.params;
    // ✅ BaseController.error() automatically catches Prisma P2025 (Not Found)
    const tariff = await this.gdrgService.updateTariff(code, req.body);
    return this.ok(res, tariff, 'GDRG tariff updated successfully');
  });

  deleteTariff = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { code } = req.params;
    await this.gdrgService.deleteTariff(code);
    return this.ok(res, null, 'GDRG tariff deleted successfully');
  });

  linkDiagnosis = [
    body('diagnosisId').notEmpty().withMessage('diagnosisId is required'),
    this.asyncHandler(async (req: AuthRequest, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return this.badRequest(res, 'Validation failed', errors.array() as any[]);

      const { gdrgCode } = req.params;
      const { diagnosisId, isPrimary, mappedIcdCode } = req.body;

      // ✅ BaseController.error() catches P2003 (Invalid reference) and P2002 (Already linked)
      const link = await this.gdrgService.linkDiagnosis(gdrgCode, diagnosisId, isPrimary || false, mappedIcdCode);
      return this.ok(res, link, 'Diagnosis linked to GDRG tariff successfully');
    })
  ];

  unlinkDiagnosis = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { gdrgCode, diagnosisId } = req.params;
    await this.gdrgService.unlinkDiagnosis(gdrgCode, diagnosisId);
    return this.ok(res, null, 'Diagnosis unlinked from GDRG tariff successfully');
  });

  getDiagnosesByGDRG = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { gdrgCode } = req.params;
    const diagnoses = await this.gdrgService.getDiagnosesByGDRG(gdrgCode);
    return this.ok(res, diagnoses, 'Diagnoses retrieved successfully', { count: diagnoses.length });
  });

  getGDRGByDiagnosis = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { diagnosisId } = req.params;
    const gdrgs = await this.gdrgService.getGDRGByDiagnosis(diagnosisId);
    return this.ok(res, gdrgs, 'GDRG tariffs retrieved successfully');
  });

  linkProcedure = [
    body('procedureId').notEmpty().withMessage('procedureId is required'),
    this.asyncHandler(async (req: AuthRequest, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return this.badRequest(res, 'Validation failed', errors.array() as any[]);

      const { gdrgCode } = req.params;
      const { procedureId, isPrimary, mappedCode } = req.body;

      const link = await this.gdrgService.linkProcedure(gdrgCode, procedureId, isPrimary || false, mappedCode);
      return this.ok(res, link, 'Procedure linked to GDRG tariff successfully');
    })
  ];

  unlinkProcedure = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { gdrgCode, procedureId } = req.params;
    await this.gdrgService.unlinkProcedure(gdrgCode, procedureId);
    return this.ok(res, null, 'Procedure unlinked from GDRG tariff successfully');
  });

  getProceduresByGDRG = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { gdrgCode } = req.params;
    const procedures = await this.gdrgService.getProceduresByGDRG(gdrgCode);
    return this.ok(res, procedures, 'Procedures retrieved successfully');
  });

  getGDRGByProcedure = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { procedureId } = req.params;
    const gdrgs = await this.gdrgService.getGDRGByProcedure(procedureId);
    return this.ok(res, gdrgs, 'GDRG tariffs retrieved successfully');
  });
}