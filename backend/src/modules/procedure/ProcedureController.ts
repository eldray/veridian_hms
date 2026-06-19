import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { BaseController } from '../../shared/base/BaseController';
import { ProcedureService } from './ProcedureService';
import { AuthRequest } from '../../middleware/authMiddleware';
import { CreateProcedureTemplateRequest, UpdateProcedureTemplateRequest } from './ProcedureTypes';

export class ProcedureController extends BaseController {
  private procedureService: ProcedureService;

  constructor(prisma: PrismaClient) {
    super();
    this.procedureService = new ProcedureService(prisma);
  }

  getProcedureTemplates = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.procedureService.getTemplates({
      category: req.query.category as string, department: req.query.department as string,
      isActive: req.query.isActive as string, page: req.query.page as string, limit: req.query.limit as string
    });
    return this.ok(res, result.templates, 'Procedure templates retrieved', result.pagination);
  });

  getProcedureTemplateById = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const template = await this.procedureService.getTemplateById(req.params.id);
      return this.ok(res, template, 'Procedure template retrieved');
    } catch (e: any) {
      if (e.message.includes('not found')) return this.notFound(res, 'Procedure template');
      throw e;
    }
  });

  createProcedureTemplate = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return this.unauthorized(res, 'User not authenticated');
    
    try {
      const template = await this.procedureService.createTemplate(req.body as CreateProcedureTemplateRequest, userId);
      return this.created(res, template, 'Procedure template created');
    } catch (e: any) {
      if (e.message.includes('already exists')) return this.badRequest(res, e.message);
      throw e;
    }
  });

  updateProcedureTemplate = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return this.unauthorized(res, 'User not authenticated');

    try {
      const template = await this.procedureService.updateTemplate(req.params.id, { ...req.body, id: req.params.id } as UpdateProcedureTemplateRequest, userId);
      return this.ok(res, template, 'Procedure template updated');
    } catch (e: any) {
      if (e.message.includes('not found') || e.message.includes('already exists')) return this.badRequest(res, e.message);
      throw e;
    }
  });

  deleteProcedureTemplate = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      await this.procedureService.deleteTemplate(req.params.id);
      return this.ok(res, null, 'Procedure template deleted');
    } catch (e: any) {
      if (e.message.includes('not found') || e.message.includes('Cannot delete')) return this.badRequest(res, e.message);
      throw e;
    }
  });

  getProcedureCategories = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const categories = await this.procedureService.getCategories();
    return this.ok(res, categories, 'Procedure categories retrieved');
  });

  getProcedureDepartments = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const departments = await this.procedureService.getDepartments();
    return this.ok(res, departments, 'Procedure departments retrieved');
  });

  bulkUpdateProcedureTemplates = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { ids, isActive } = req.body;
    if (!ids || !Array.isArray(ids)) return this.badRequest(res, 'ids array is required');
    const count = await this.procedureService.bulkUpdate(ids, isActive !== undefined ? isActive : true);
    return this.ok(res, { count }, `${count} procedure templates updated`);
  });
}