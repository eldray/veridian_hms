// RequisitionController.ts - HTTP request handlers for requisition module
import { Request, Response } from 'express';
import { BaseController } from '../../shared/base/BaseController';
import { RequisitionService } from './RequisitionService';
import {
  CreateRequisitionDTO,
  UpdateRequisitionDTO,
  UpdateRequisitionStatusDTO,
  ApproveRequisitionItemsDTO
} from './RequisitionTypes';
import { AuthRequest } from '../../middleware/authMiddleware';

export class RequisitionController extends BaseController {
  private service: RequisitionService;

  constructor(service: RequisitionService) {
    super();
    this.service = service;
  }

  // GET ALL REQUISITIONS
  getRequisitions = async (req: Request, res: Response) => {
    try {
      const { departmentId, wardId, status, urgency, page, limit } = req.query;

      const params = {
        departmentId: departmentId as string | undefined,
        wardId: wardId as string | undefined,
        status: status as string | undefined,
        urgency: urgency as string | undefined,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 50
      };

      const result = await this.service.getAllRequisitions(params);

      return this.ok(res, result.requisitions, 'Requisitions fetched successfully', result.pagination);
    } catch (error: any) {
      return this.error(res, error);
    }
  };

  // GET REQUISITION BY ID
  getRequisitionById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const requisition = await this.service.getRequisitionById(id);
      return this.ok(res, requisition, 'Requisition fetched successfully');
    } catch (error: any) {
      return this.error(res, error);
    }
  };

  // CREATE REQUISITION
  createRequisition = async (req: AuthRequest, res: Response) => {
    try {
      const data: CreateRequisitionDTO = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return this.unauthorized(res, 'User not authenticated');
      }

      if (!data.requisitionItems || data.requisitionItems.length === 0) {
        return this.badRequest(res, 'At least one item is required');
      }

      const requisition = await this.service.createRequisition(data, userId);

      return this.created(res, requisition, 'Requisition created successfully');
    } catch (error: any) {
      return this.error(res, error);
    }
  };

  // UPDATE REQUISITION STATUS
  updateRequisitionStatus = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const data: UpdateRequisitionStatusDTO = req.body;
      const userId = req.user?.id;

      // Special handling for 'fulfilled' status - uses new stock validation logic
      if (data.status === 'fulfilled') {
        const requisition = await this.service.fulfillRequisition(id, userId);
        return this.ok(res, requisition, 'Requisition fulfilled successfully');
      }

      const requisition = await this.service.updateRequisitionStatus(id, data, userId);

      return this.ok(res, requisition, `Requisition status updated to ${data.status}`);
    } catch (error: any) {
      return this.error(res, error);
    }
  };

  // DELETE REQUISITION
  deleteRequisition = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      await this.service.deleteRequisition(id);
      return this.ok(res, null, 'Requisition deleted successfully');
    } catch (error: any) {
      return this.error(res, error);
    }
  };

  // APPROVE REQUISITION ITEMS
  approveRequisitionItems = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const data: ApproveRequisitionItemsDTO = req.body;
      const userId = req.user?.id;

      if (!data.approvedItems || data.approvedItems.length === 0) {
        return this.badRequest(res, 'At least one approved item is required');
      }

      const requisition = await this.service.approveRequisitionItems(id, data, userId);

      return this.ok(res, requisition, 'Requisition items approved successfully');
    } catch (error: any) {
      return this.error(res, error);
    }
  };

  // UPDATE REQUISITION (Basic info only)
  updateRequisition = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const data: UpdateRequisitionDTO = req.body;
      const userId = req.user?.id;

      const requisition = await this.service.updateRequisition(id, data, userId);

      return this.ok(res, requisition, 'Requisition updated successfully');
    } catch (error: any) {
      return this.error(res, error);
    }
  };
}