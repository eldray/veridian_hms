import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { BaseController } from '../../shared/base/BaseController';
import { DiagnosisService } from './DiagnosisService';

interface AuthRequest extends Request {
  user?: any;
}

export class DiagnosisController extends BaseController {
  private service: DiagnosisService;

  constructor(prisma: PrismaClient) {
    super();
    this.service = new DiagnosisService(prisma);
  }

  getAll = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      // ✅ Use BaseController's safe pagination parser
      const { page, limit } = this.getPaginationParams(req);
      const { morbidityGroup, isActive, search, searchField } = req.query;

      const filters = {
        page,
        limit,
        morbidityGroup: morbidityGroup as any,
        isActive: isActive === 'true' || isActive === 'false' ? isActive === 'true' : undefined,
        search: search as string,
        searchField: searchField as any
      };

      const result = await this.service.getDiagnoses(filters);
      return this.paginated(res, result.data, result.pagination, 'Diagnoses retrieved successfully');
    } catch (e: any) {
      return this.error(res, e);
    }
  });

  getById = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const diagnosis = await this.service.getDiagnosisById(req.params.id);
      return this.ok(res, diagnosis, 'Diagnosis retrieved successfully');
    } catch (e: any) {
      return this.error(res, e);
    }
  });

  create = [
    body('name').notEmpty().withMessage('Diagnosis name is required').trim(),
    body('icdCode').notEmpty().withMessage('ICD code is required').trim().toUpperCase(),
    body('morbidityGroup').notEmpty().withMessage('Morbidity group is required'),
    this.asyncHandler(async (req: AuthRequest, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return this.badRequest(res, 'Validation failed', errors.array() as any[]);

      try {
        const diagnosis = await this.service.createDiagnosis(req.body);
        return this.created(res, diagnosis, 'Diagnosis created successfully');
      } catch (e: any) {
        // ✅ BaseController.error() automatically catches Prisma P2002 (Duplicate ICD Code)
        return this.error(res, e);
      }
    })
  ];

  update = [
    body('name').optional().trim(),
    body('icdCode').optional().trim().toUpperCase(),
    body('morbidityGroup').optional(),
    body('isActive').optional().isBoolean(),
    this.asyncHandler(async (req: AuthRequest, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return this.badRequest(res, 'Validation failed', errors.array() as any[]);

      try {
        const diagnosis = await this.service.updateDiagnosis(req.params.id, req.body);
        return this.ok(res, diagnosis, 'Diagnosis updated successfully');
      } catch (e: any) {
        // ✅ Catches P2025 (Not Found) and P2002 (Duplicate ICD Code)
        return this.error(res, e);
      }
    })
  ];

  delete = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      await this.service.deleteDiagnosis(req.params.id);
      return this.ok(res, null, 'Diagnosis deleted successfully');
    } catch (e: any) {
      return this.error(res, e);
    }
  });

  search = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const { q, field = 'all' } = req.query;
      if (!q || (q as string).trim().length < 2) {
        return this.badRequest(res, 'Search query must be at least 2 characters');
      }
      const diagnoses = await this.service.searchDiagnoses(q as string, field as any);
      return this.ok(res, diagnoses, 'Diagnoses searched successfully');
    } catch (e: any) {
      return this.error(res, e);
    }
  });

  getStats = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const stats = await this.service.getDiagnosisStats();
      return this.ok(res, stats, 'Diagnosis statistics retrieved');
    } catch (e: any) {
      return this.error(res, e);
    }
  });

  getMorbidityGroups = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const groups = await this.service.getMorbidityGroups();
      return this.ok(res, groups, 'Morbidity groups retrieved');
    } catch (e: any) {
      return this.error(res, e);
    }
  });

  getByMorbidityGroup = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const { morbidityGroup } = req.params;
      const { page, limit } = this.getPaginationParams(req);
      
      const result = await this.service.getDiagnosesByMorbidityGroup(morbidityGroup, page, limit);
      return this.paginated(res, result.diagnoses, result.pagination, 'Diagnoses by morbidity group retrieved');
    } catch (e: any) {
      return this.error(res, e);
    }
  });
}