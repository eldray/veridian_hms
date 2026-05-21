// modules/procedure/ProcedureController.ts
import { Request, Response } from 'express';
import { BaseController } from '../../shared/base/BaseController';
import { ProcedureService } from './ProcedureService';
import { CreateProcedureTemplateRequest, UpdateProcedureTemplateRequest } from './ProcedureTypes';
import { AuthRequest } from '../../types/auth';

export class ProcedureController extends BaseController {
  private procedureService: ProcedureService;

  constructor(prisma: any) {
    super();  // ✅ FIXED - BaseController doesn't need prisma
    this.procedureService = new ProcedureService(prisma);
  }

  getProcedureTemplates = async (req: Request, res: Response) => {
    try {
      const { category, department, isActive, page = 1, limit = 10000 } = req.query;

      const result = await this.procedureService.getTemplates({
        category: category as string,
        department: department as string,
        isActive: isActive as string,
        page: page as string,
        limit: limit as string
      });

      return this.ok(res, result.templates, 'Procedure templates retrieved', result.pagination);
    } catch (error: any) {
      return this.error(res, error);
    }
  };

  getProcedureTemplateById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const template = await this.procedureService.getTemplateById(id);
      return this.ok(res, template, 'Procedure template retrieved');
    } catch (error: any) {
      return this.error(res, error);
    }
  };

  createProcedureTemplate = async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user?.id;
      if (!userId) {
        return this.unauthorized(res, 'User not authenticated');
      }

      const data: CreateProcedureTemplateRequest = req.body;
      const template = await this.procedureService.createTemplate(data, userId);

      return this.created(res, template, 'Procedure template created');
    } catch (error: any) {
      return this.error(res, error);
    }
  };

  updateProcedureTemplate = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = (req as AuthRequest).user?.id;
      const data: UpdateProcedureTemplateRequest = { ...req.body, id };

      const template = await this.procedureService.updateTemplate(id, data, userId);

      return this.ok(res, template, 'Procedure template updated');
    } catch (error: any) {
      return this.error(res, error);
    }
  };

  deleteProcedureTemplate = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await this.procedureService.deleteTemplate(id);
      return this.ok(res, null, 'Procedure template deleted');
    } catch (error: any) {
      return this.error(res, error);
    }
  };

  getProcedureCategories = async (req: Request, res: Response) => {
    try {
      const categories = await this.procedureService.getCategories();
      return this.ok(res, categories, 'Procedure categories retrieved');
    } catch (error: any) {
      return this.error(res, error);
    }
  };

  getProcedureDepartments = async (req: Request, res: Response) => {
    try {
      const departments = await this.procedureService.getDepartments();
      return this.ok(res, departments, 'Procedure departments retrieved');
    } catch (error: any) {
      return this.error(res, error);
    }
  };

  bulkUpdateProcedureTemplates = async (req: Request, res: Response) => {
    try {
      const { ids, isActive } = req.body;

      if (!ids || !Array.isArray(ids)) {
        return this.badRequest(res, 'ids array is required');
      }

      const count = await this.procedureService.bulkUpdate(ids, isActive !== undefined ? isActive : true);

      return this.ok(res, { count }, `${count} procedure templates updated`);
    } catch (error: any) {
      return this.error(res, error);
    }
  };
}