// GDRGController.ts - HTTP request handlers for GDRG module

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/authMiddleware';
import { BaseController } from '../../shared/base/BaseController';
import { GDRGService } from './GDRGService';
import { CreateGDRGTariffRequest, UpdateGDRGTariffRequest } from './GDRGTypes';
import { PrismaClient } from '@prisma/client';


export class GDRGController extends BaseController {
  private gdrgService: GDRGService;

  constructor(prisma: PrismaClient) {  // ✅ Accept prisma
    super();
    this.gdrgService = new GDRGService(prisma);  // ✅ Pass it down
  }

  getTariffs = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { mdc, isActive, search, page = 1, limit = 50 } = req.query;

      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));

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
        diagnoses: {
          include: {
            diagnosis: {
              select: {
                id: true,
                name: true,
                icdCode: true,
                morbidityGroup: true
              }
            }
          }
        },
        ServiceCatalog: {
          select: {
            id: true,
            name: true,
            code: true,
            serviceType: true
          }
        }
      };

      const result = await this.gdrgService.getAllTariffs(where, include, pageNum, limitNum);

      this.paginated(res, result.data, result.pagination, 'GDRG tariffs retrieved successfully');
    } catch (error) {
      this.error(res, error);
    }
  };

  getTariffByCode = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { code } = req.params;

      const include = {
        diagnoses: {
          include: {
            diagnosis: {
              select: {
                id: true,
                name: true,
                icdCode: true,
                morbidityGroup: true
              }
            }
          }
        },
        ServiceCatalog: {
          select: {
            id: true,
            name: true,
            code: true,
            serviceType: true,
            pricing: {
              select: {
                cashPrice: true,
                nhisPrice: true,
                insurancePrice: true
              }
            }
          }
        }
      };

      const tariff = await this.gdrgService.getTariffByCode(code, include);

      if (!tariff) {
        return this.notFound(res, 'GDRG tariff');
      }

      this.ok(res, tariff, 'GDRG tariff retrieved successfully');
    } catch (error) {
      this.error(res, error);
    }
  };

  lookupByAge = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { gdrgCode, patientId, attendanceDate, ageInYears } = req.query;

      if (!gdrgCode) {
        return this.badRequest(res, 'GDRG code is required');
      }

      const result = await this.gdrgService.lookupByAge(
        gdrgCode as string,
        patientId as string | undefined,
        attendanceDate as string | undefined,
        ageInYears ? parseInt(ageInYears as string) : undefined
      );

      this.ok(res, result, 'GDRG lookup completed');
    } catch (error) {
      this.error(res, error);
    }
  };

  createTariff = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data: CreateGDRGTariffRequest = req.body;

      // Validate required fields
      if (!data.gdrgCode || !data.mdc || !data.description || data.nhiaTariff === undefined) {
        return this.badRequest(res, 'Missing required fields: gdrgCode, mdc, description, nhiaTariff');
      }

      const tariff = await this.gdrgService.createTariff(data);

      this.created(res, tariff, 'GDRG tariff created successfully');
    } catch (error: any) {
      if (error.message === 'GDRG code already exists') {
        return this.badRequest(res, error.message);
      }
      this.error(res, error);
    }
  };

  updateTariff = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { code } = req.params;
      const data: UpdateGDRGTariffRequest = req.body;

      const tariff = await this.gdrgService.updateTariff(code, data);

      this.ok(res, tariff, 'GDRG tariff updated successfully');
    } catch (error: any) {
      if (error.message === 'GDRG tariff not found') {
        return this.notFound(res, 'GDRG tariff');
      }
      this.error(res, error);
    }
  };

  deleteTariff = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { code } = req.params;

      await this.gdrgService.deleteTariff(code);

      this.ok(res, null, 'GDRG tariff deleted successfully');
    } catch (error: any) {
      if (error.message.includes('Cannot delete')) {
        return this.conflict(res, error.message);
      }
      if (error.message === 'GDRG tariff not found') {
        return this.notFound(res, 'GDRG tariff');
      }
      this.error(res, error);
    }
  };

  linkDiagnosis = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { gdrgCode } = req.params;
      const { diagnosisId, isPrimary, mappedIcdCode } = req.body;

      if (!diagnosisId) {
        return this.badRequest(res, 'diagnosisId is required');
      }

      const link = await this.gdrgService.linkDiagnosis(
        gdrgCode,
        diagnosisId,
        isPrimary || false,
        mappedIcdCode
      );

      this.ok(res, link, 'Diagnosis linked to GDRG tariff successfully');
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return this.notFound(res, error.message);
      }
      if (error.message.includes('already linked')) {
        return this.conflict(res, error.message);
      }
      this.error(res, error);
    }
  };

  unlinkDiagnosis = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { gdrgCode, diagnosisId } = req.params;

      await this.gdrgService.unlinkDiagnosis(gdrgCode, diagnosisId);

      this.ok(res, null, 'Diagnosis unlinked from GDRG tariff successfully');
    } catch (error: any) {
      if (error.message === 'GDRG tariff not found') {
        return this.notFound(res, 'GDRG tariff');
      }
      this.error(res, error);
    }
  };

  getDiagnosesByGDRG = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { gdrgCode } = req.params;

      const diagnoses = await this.gdrgService.getDiagnosesByGDRG(gdrgCode);

      this.ok(res, diagnoses, 'Diagnoses retrieved successfully', { count: diagnoses.length });
    } catch (error) {
      this.error(res, error);
    }
  };

  getGDRGByDiagnosis = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { diagnosisId } = req.params;

      const gdrgs = await this.gdrgService.getGDRGByDiagnosis(diagnosisId);

      this.ok(res, gdrgs, 'GDRG tariffs retrieved successfully');
    } catch (error) {
      this.error(res, error);
    }
  };

  linkProcedure = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { gdrgCode } = req.params;
      const { procedureId, isPrimary, mappedCode } = req.body;

      if (!procedureId) {
        return this.badRequest(res, 'procedureId is required');
      }

      const link = await this.gdrgService.linkProcedure(
        gdrgCode,
        procedureId,
        isPrimary || false,
        mappedCode
      );

      this.ok(res, link, 'Procedure linked to GDRG tariff successfully');
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return this.notFound(res, error.message);
      }
      if (error.message.includes('already linked')) {
        return this.conflict(res, error.message);
      }
      this.error(res, error);
    }
  };

  unlinkProcedure = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { gdrgCode, procedureId } = req.params;

      await this.gdrgService.unlinkProcedure(gdrgCode, procedureId);

      this.ok(res, null, 'Procedure unlinked from GDRG tariff successfully');
    } catch (error) {
      this.error(res, error);
    }
  };

  getProceduresByGDRG = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { gdrgCode } = req.params;

      const procedures = await this.gdrgService.getProceduresByGDRG(gdrgCode);

      this.ok(res, procedures, 'Procedures retrieved successfully');
    } catch (error) {
      this.error(res, error);
    }
  };

  getGDRGByProcedure = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { procedureId } = req.params;

      const gdrgs = await this.gdrgService.getGDRGByProcedure(procedureId);

      this.ok(res, gdrgs, 'GDRG tariffs retrieved successfully');
    } catch (error) {
      this.error(res, error);
    }
  };
}