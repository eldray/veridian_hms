// modules/procedure/ProcedureController.ts

import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { BaseController } from '../base/BaseController';
import { ProcedureService } from './ProcedureService';
import { AuthRequest } from '../../types/auth';

export class ProcedureController extends BaseController {
  private procedureService: ProcedureService;

  constructor(prisma: any) {
    super(prisma);
    this.procedureService = new ProcedureService(prisma);
  }

  // ============================================
  // GET PROCEDURE TEMPLATES
  // ============================================

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

      this.handleResponse(res, 200, {
        success: true,
        data: result.templates,
        pagination: result.pagination
      });
    } catch (error) {
      this.handleError(res, error, 'Error fetching procedure templates');
    }
  };

  // ============================================
  // GET PROCEDURE TEMPLATE BY ID
  // ============================================

  getProcedureTemplateById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const template = await this.procedureService.getTemplateById(id);

      this.handleResponse(res, 200, template);
    } catch (error) {
      this.handleError(res, error, 'Error fetching procedure template');
    }
  };

  // ============================================
  // CREATE PROCEDURE TEMPLATE
  // ============================================

  createProcedureTemplate = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return this.handleResponse(res, 400, {
          success: false,
          errors: errors.array()
        });
      }

      const userId = (req as AuthRequest).user?.id;
      const body = req.body;

      const template = await this.procedureService.createTemplate(
        {
          name: body.name,
          code: body.code,
          description: body.description,
          serviceCategory: body.serviceCategory,
          category: body.category,
          nhisServiceCode: body.nhisServiceCode,
          tariffCode: body.tariffCode,
          isNHISCovered: body.isNHISCovered,
          department: body.department,
          duration: body.duration,
          requiresAssistant: body.requiresAssistant,
          anesthesiaType: body.anesthesiaType,
          anesthesiaNotes: body.anesthesiaNotes,
          intraOperativeNotes: body.intraOperativeNotes,
          postOperativeNotes: body.postOperativeNotes,
          bloodLoss: body.bloodLoss,
          complications: body.complications,
          outcome: body.outcome,
          cost: body.cost,
          procedureCategory: body.procedureCategory,
          cashPrice: body.cashPrice,
          nhisPrice: body.nhisPrice,
          insurancePrice: body.insurancePrice,
          vatRate: body.vatRate,
          isTaxable: body.isTaxable,
          isActive: body.isActive,
          unit: body.unit
        },
        userId
      );

      this.handleResponse(res, 201, template);
    } catch (error) {
      this.handleError(res, error, 'Error creating procedure template');
    }
  };

  // ============================================
  // UPDATE PROCEDURE TEMPLATE
  // ============================================

  updateProcedureTemplate = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return this.handleResponse(res, 400, {
          success: false,
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const userId = (req as AuthRequest).user?.id;
      const body = req.body;

      const template = await this.procedureService.updateTemplate(
        id,
        {
          id,
          name: body.name,
          code: body.code,
          serviceCategory: body.serviceCategory,
          category: body.category,
          department: body.department,
          duration: body.duration,
          requiresAssistant: body.requiresAssistant,
          anesthesiaType: body.anesthesiaType,
          anesthesiaNotes: body.anesthesiaNotes,
          intraOperativeNotes: body.intraOperativeNotes,
          postOperativeNotes: body.postOperativeNotes,
          bloodLoss: body.bloodLoss,
          complications: body.complications,
          outcome: body.outcome,
          cost: body.cost,
          cashPrice: body.cashPrice,
          nhisPrice: body.nhisPrice,
          insurancePrice: body.insurancePrice,
          vatRate: body.vatRate,
          isTaxable: body.isTaxable,
          isActive: body.isActive
        },
        userId
      );

      this.handleResponse(res, 200, template);
    } catch (error) {
      this.handleError(res, error, 'Error updating procedure template');
    }
  };

  // ============================================
  // DELETE PROCEDURE TEMPLATE
  // ============================================

  deleteProcedureTemplate = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      await this.procedureService.deleteTemplate(id);

      this.handleResponse(res, 200, {
        success: true,
        message: 'Procedure template deleted successfully'
      });
    } catch (error) {
      this.handleError(res, error, 'Error deleting procedure template');
    }
  };

  // ============================================
  // GET PROCEDURE CATEGORIES
  // ============================================

  getProcedureCategories = async (req: Request, res: Response) => {
    try {
      const categories = await this.procedureService.getCategories();

      this.handleResponse(res, 200, {
        success: true,
        data: categories
      });
    } catch (error) {
      this.handleError(res, error, 'Error fetching procedure categories');
    }
  };

  // ============================================
  // GET PROCEDURE DEPARTMENTS
  // ============================================

  getProcedureDepartments = async (req: Request, res: Response) => {
    try {
      const departments = await this.procedureService.getDepartments();

      this.handleResponse(res, 200, {
        success: true,
        data: departments
      });
    } catch (error) {
      this.handleError(res, error, 'Error fetching procedure departments');
    }
  };

  // ============================================
  // BULK UPDATE PROCEDURE TEMPLATES
  // ============================================

  bulkUpdateProcedureTemplates = async (req: Request, res: Response) => {
    try {
      const { ids, isActive } = req.body;

      if (!ids || !Array.isArray(ids)) {
        return this.handleResponse(res, 400, {
          success: false,
          message: 'ids array is required'
        });
      }

      const count = await this.procedureService.bulkUpdate(ids, isActive !== undefined ? isActive : true);

      this.handleResponse(res, 200, {
        success: true,
        message: `${count} procedure templates updated`,
        count
      });
    } catch (error) {
      this.handleError(res, error, 'Error bulk updating procedure templates');
    }
  };
}
