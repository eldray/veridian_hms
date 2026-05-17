// RequisitionController.ts - HTTP request handlers for requisition module

import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { RequisitionService } from './RequisitionService';
import {
  CreateRequisitionDTO,
  UpdateRequisitionDTO,
  UpdateRequisitionStatusDTO,
  ApproveRequisitionItemsDTO
} from './RequisitionTypes';

export class RequisitionController {
  private service: RequisitionService;

  constructor(service: RequisitionService) {
    this.service = service;
  }

  // GET ALL REQUISITIONS
  getRequisitions = async (req: Request, res: Response) => {
    try {
      const { departmentId, status, urgency, page, limit } = req.query;

      const params = {
        departmentId: departmentId as string | undefined,
        status: status as string | undefined,
        urgency: urgency as string | undefined,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 50
      };

      const result = await this.service.getAllRequisitions(params);

      res.json(result);
    } catch (error) {
      console.error('Error fetching requisitions:', error);
      res.status(500).json({
        message: 'Error fetching requisitions',
        error: (error as Error).message
      });
    }
  };

  // GET REQUISITION BY ID
  getRequisitionById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const requisition = await this.service.getRequisitionById(id);

      res.json(requisition);
    } catch (error) {
      console.error('Error fetching requisition:', error);
      res.status(404).json({
        message: (error as Error).message || 'Requisition not found',
        error: (error as Error).message
      });
    }
  };

  // CREATE REQUISITION
  createRequisition = [
    body('requestingDepartmentId').notEmpty().withMessage('Department ID is required'),
    body('urgency').isIn(['routine', 'urgent', 'emergency']).withMessage('Valid urgency is required'),
    body('requisitionItems').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('requisitionItems.*.stockItemId').notEmpty().withMessage('Stock item ID is required'),
    body('requisitionItems.*.quantityRequested').isInt({ min: 1 }).withMessage('Quantity must be positive'),

    async (req: Request, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const data: CreateRequisitionDTO = req.body;
        const userId = (req as any).user?.id;

        if (!userId) {
          return res.status(401).json({ message: 'User not authenticated' });
        }

        const requisition = await this.service.createRequisition(data, userId);

        res.status(201).json({
          message: 'Requisition created successfully',
          requisition
        });
      } catch (error) {
        console.error('Error creating requisition:', error);
        res.status(500).json({
          message: 'Error creating requisition',
          error: (error as Error).message
        });
      }
    }
  ];

  // UPDATE REQUISITION STATUS
  updateRequisitionStatus = [
    body('status').isIn(['draft', 'submitted', 'approved', 'fulfilled', 'cancelled']).withMessage('Valid status is required'),
    body('notes').optional().isString(),

    async (req: Request, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const data: UpdateRequisitionStatusDTO = req.body;
        const userId = (req as any).user?.id;

        const requisition = await this.service.updateRequisitionStatus(id, data, userId);

        res.json({
          message: `Requisition status updated to ${data.status}`,
          requisition
        });
      } catch (error) {
        console.error('Error updating requisition status:', error);
        res.status(500).json({
          message: 'Error updating requisition status',
          error: (error as Error).message
        });
      }
    }
  ];

  // DELETE REQUISITION
  deleteRequisition = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      await this.service.deleteRequisition(id);

      res.json({
        message: 'Requisition deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting requisition:', error);
      res.status(500).json({
        message: 'Error deleting requisition',
        error: (error as Error).message
      });
    }
  };

  // APPROVE REQUISITION ITEMS
  approveRequisitionItems = [
    body('approvedItems').isArray({ min: 1 }).withMessage('At least one approved item is required'),
    body('approvedItems.*.requisitionItemId').notEmpty().withMessage('Requisition item ID is required'),
    body('approvedItems.*.quantityApproved').isInt({ min: 0 }).withMessage('Quantity approved must be non-negative'),

    async (req: Request, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const data: ApproveRequisitionItemsDTO = req.body;
        const userId = (req as any).user?.id;

        const requisition = await this.service.approveRequisitionItems(id, data, userId);

        res.json({
          message: 'Requisition items approved successfully',
          requisition
        });
      } catch (error) {
        console.error('Error approving requisition items:', error);
        res.status(500).json({
          message: 'Error approving requisition items',
          error: (error as Error).message
        });
      }
    }
  ];

  // UPDATE REQUISITION (Basic info only)
  updateRequisition = [
    body('purpose').optional().isString(),
    body('urgency').optional().isIn(['routine', 'urgent', 'emergency']),
    body('notes').optional().isString(),

    async (req: Request, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const data: UpdateRequisitionDTO = req.body;
        const userId = (req as any).user?.id;

        const requisition = await this.service.updateRequisition(id, data, userId);

        res.json({
          message: 'Requisition updated successfully',
          requisition
        });
      } catch (error) {
        console.error('Error updating requisition:', error);
        res.status(500).json({
          message: 'Error updating requisition',
          error: (error as Error).message
        });
      }
    }
  ];
}
