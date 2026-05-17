// GDRGController.ts - HTTP request handlers for GDRG module

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/authMiddleware';
import { GDRGService } from './GDRGService';
import { CreateGDRGTariffRequest, UpdateGDRGTariffRequest } from './GDRGTypes';

export class GDRGController {
  private gdrgService: GDRGService;

  constructor() {
    this.gdrgService = new GDRGService();
  }

  getTariffs = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
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

      const tariffs = await this.gdrgService.getAllTariffs(where, {
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
      });

      res.json({ 
        success: true, 
        data: tariffs, 
        count: tariffs.length 
      });
    } catch (error) {
      next(error);
    }
  };

  getTariffByCode = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { code } = req.params;

      const tariff = await this.gdrgService.getTariffByCode(code, {
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
      });

      if (!tariff) {
        return res.status(404).json({
          success: false,
          message: 'GDRG tariff not found'
        });
      }

      res.json({ success: true, data: tariff });
    } catch (error) {
      next(error);
    }
  };

  lookupByAge = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { gdrgCode, patientId, attendanceDate, ageInYears } = req.query;

      if (!gdrgCode) {
        return res.status(400).json({
          success: false,
          message: 'GDRG code is required'
        });
      }

      const result = await this.gdrgService.lookupByAge(
        gdrgCode as string,
        patientId as string | undefined,
        attendanceDate as string | undefined,
        ageInYears ? parseInt(ageInYears as string) : undefined
      );

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  createTariff = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data: CreateGDRGTariffRequest = req.body;

      // Validate required fields
      if (!data.gdrgCode || !data.mdc || !data.description || data.nhiaTariff === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: gdrgCode, mdc, description, nhiaTariff'
        });
      }

      const tariff = await this.gdrgService.createTariff(data);

      res.status(201).json({
        success: true,
        data: tariff,
        message: 'GDRG tariff created successfully'
      });
    } catch (error: any) {
      if ((error as Error).message === 'GDRG code already exists') {
        return res.status(400).json({
          success: false,
          message: 'GDRG code already exists'
        });
      }
      next(error);
    }
  };

  updateTariff = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { code } = req.params;
      const data: UpdateGDRGTariffRequest = req.body;

      const tariff = await this.gdrgService.updateTariff(code, data);

      res.json({
        success: true,
        data: tariff,
        message: 'GDRG tariff updated successfully'
      });
    } catch (error: any) {
      if ((error as Error).message === 'GDRG tariff not found') {
        return res.status(404).json({
          success: false,
          message: 'GDRG tariff not found'
        });
      }
      next(error);
    }
  };

  deleteTariff = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { code } = req.params;

      await this.gdrgService.deleteTariff(code);

      res.json({
        success: true,
        message: 'GDRG tariff deleted successfully'
      });
    } catch (error: any) {
      if ((error as Error).message.includes('Cannot delete')) {
        return res.status(400).json({
          success: false,
          message: (error as Error).message
        });
      }
      if ((error as Error).message === 'GDRG tariff not found') {
        return res.status(404).json({
          success: false,
          message: 'GDRG tariff not found'
        });
      }
      next(error);
    }
  };

  linkDiagnosis = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { gdrgCode } = req.params;
      const { diagnosisId, isPrimary, mappedIcdCode } = req.body;

      if (!diagnosisId) {
        return res.status(400).json({
          success: false,
          message: 'diagnosisId is required'
        });
      }

      const link = await this.gdrgService.linkDiagnosis(
        gdrgCode,
        diagnosisId,
        isPrimary || false,
        mappedIcdCode
      );

      res.json({
        success: true,
        data: link,
        message: 'Diagnosis linked to GDRG tariff successfully'
      });
    } catch (error: any) {
      if ((error as Error).message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: (error as Error).message
        });
      }
      if ((error as Error).message.includes('already linked')) {
        return res.status(400).json({
          success: false,
          message: (error as Error).message
        });
      }
      next(error);
    }
  };

  unlinkDiagnosis = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { gdrgCode, diagnosisId } = req.params;

      await this.gdrgService.unlinkDiagnosis(gdrgCode, diagnosisId);

      res.json({
        success: true,
        message: 'Diagnosis unlinked from GDRG tariff successfully'
      });
    } catch (error: any) {
      if ((error as Error).message === 'GDRG tariff not found') {
        return res.status(404).json({
          success: false,
          message: 'GDRG tariff not found'
        });
      }
      next(error);
    }
  };

  getDiagnosesByGDRG = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { gdrgCode } = req.params;

      const diagnoses = await this.gdrgService.getDiagnosesByGDRG(gdrgCode);

      res.json({
        success: true,
        data: diagnoses,
        count: diagnoses.length
      });
    } catch (error) {
      next(error);
    }
  };

  getGDRGByDiagnosis = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { diagnosisId } = req.params;

      const gdrgs = await this.gdrgService.getGDRGByDiagnosis(diagnosisId);

      res.json({ success: true, data: gdrgs });
    } catch (error) {
      next(error);
    }
  };

  linkProcedure = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { gdrgCode } = req.params;
      const { procedureId, isPrimary, mappedCode } = req.body;

      if (!procedureId) {
        return res.status(400).json({
          success: false,
          message: 'procedureId is required'
        });
      }

      const link = await this.gdrgService.linkProcedure(
        gdrgCode,
        procedureId,
        isPrimary || false,
        mappedCode
      );

      res.json({
        success: true,
        data: link,
        message: 'Procedure linked to GDRG tariff successfully'
      });
    } catch (error: any) {
      if ((error as Error).message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: (error as Error).message
        });
      }
      if ((error as Error).message.includes('already linked')) {
        return res.status(400).json({
          success: false,
          message: (error as Error).message
        });
      }
      next(error);
    }
  };

  unlinkProcedure = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { gdrgCode, procedureId } = req.params;

      await this.gdrgService.unlinkProcedure(gdrgCode, procedureId);

      res.json({
        success: true,
        message: 'Procedure unlinked from GDRG tariff successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  getProceduresByGDRG = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { gdrgCode } = req.params;

      const procedures = await this.gdrgService.getProceduresByGDRG(gdrgCode);

      res.json({ success: true, data: procedures });
    } catch (error) {
      next(error);
    }
  };

  getGDRGByProcedure = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { procedureId } = req.params;

      const gdrgs = await this.gdrgService.getGDRGByProcedure(procedureId);

      res.json({ success: true, data: gdrgs });
    } catch (error) {
      next(error);
    }
  };
}
