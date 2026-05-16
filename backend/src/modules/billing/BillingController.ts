/**
 * Billing Module Controller
 * Handles HTTP requests for billing management
 */

import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { BillingService } from './BillingService';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../../middleware/authMiddleware';

export class BillingController {
  private service: BillingService;

  constructor(prisma: PrismaClient) {
    this.service = new BillingService(prisma);
  }

  // ============================================
  // GET ALL BILLS
  // ============================================
  getAll = async (req: AuthRequest, res: Response) => {
    try {
      const filters = {
        patientId: req.query.patientId as string,
        status: req.query.status as any,
        paymentMode: req.query.paymentMode as any,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 50
      };

      const result = await this.service.getBills(filters);

      res.json({
        success: true,
        data: result.bills,
        pagination: {
          currentPage: result.page,
          totalPages: Math.ceil(result.total / result.limit),
          totalBills: result.total,
          hasNext: result.page < Math.ceil(result.total / result.limit),
          hasPrev: result.page > 1
        }
      });
    } catch (error) {
      console.error('Error fetching bills:', error);
      res.status(500).json({
        message: 'Error fetching bills',
        error: (error as Error).message
      });
    }
  };

  // ============================================
  // GET BILL BY ID
  // ============================================
  getById = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const bill = await this.service.getBillById(id);

      res.json({
        success: true,
        data: bill
      });
    } catch (error) {
      console.error('Error fetching bill:', error);
      res.status(404).json({
        message: (error as Error).message
      });
    }
  };

  // ============================================
  // CREATE BILL
  // ============================================
  create = [
    body('patientId').notEmpty().withMessage('Patient ID is required'),
    body('attendanceId').notEmpty().withMessage('Attendance ID is required'),
    body('paymentMode').isIn(['cash', 'nhis', 'private_insurance']).withMessage('Valid payment mode is required'),
    body('items').isArray({ min: 1 }).withMessage('At least one bill item is required'),

    async (req: AuthRequest, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const user = req.user;
        if (!user) {
          return res.status(401).json({ message: 'User authentication required' });
        }

        const { patientId, attendanceId, paymentMode, items } = req.body;

        const bill = await this.service.createBill(
          { patientId, attendanceId, paymentMode, items },
          user.id
        );

        res.status(201).json({
          success: true,
          data: bill,
          message: 'Bill created successfully'
        });
      } catch (error) {
        console.error('Error creating bill:', error);
        res.status(500).json({
          message: 'Error creating bill',
          error: (error as Error).message
        });
      }
    }
  ];

  // ============================================
  // ADD PAYMENT TO BILL
  // ============================================
  addPayment = [
    body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount is required'),
    body('paymentMethod').isIn(['cash', 'mobile_money', 'card', 'bank_transfer', 'cheque']).withMessage('Valid payment method is required'),

    async (req: AuthRequest, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const user = req.user;
        if (!user) {
          return res.status(401).json({ message: 'User authentication required' });
        }

        const { id } = req.params;
        const { amount, paymentMethod, reference, notes } = req.body;

        const result = await this.service.addPaymentToBill(
          id,
          { amount, paymentMethod, reference, notes },
          user.id
        );

        res.json({
          success: true,
          data: result,
          message: 'Payment added successfully'
        });
      } catch (error) {
        console.error('Error adding payment:', error);
        res.status(500).json({
          message: 'Error adding payment',
          error: (error as Error).message
        });
      }
    }
  ];

  // ============================================
  // UPDATE BILL STATUS
  // ============================================
  updateStatus = [
    body('status').isIn(['draft', 'pending', 'partial', 'paid', 'cancelled']).withMessage('Valid status is required'),

    async (req: AuthRequest, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const user = req.user;
        if (!user) {
          return res.status(401).json({ message: 'User authentication required' });
        }

        const { id } = req.params;
        const { status } = req.body;

        const bill = await this.service.updateBillStatus(id, { status }, user.id);

        res.json({
          success: true,
          data: bill,
          message: 'Bill status updated successfully'
        });
      } catch (error) {
        console.error('Error updating bill status:', error);
        res.status(500).json({
          message: 'Error updating bill status',
          error: (error as Error).message
        });
      }
    }
  ];

  // ============================================
  // GET BILL STATISTICS
  // ============================================
  getStatistics = async (req: AuthRequest, res: Response) => {
    try {
      const { period = 'month' } = req.query;
      const stats = await this.service.getStatistics(period as string);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error fetching bill statistics:', error);
      res.status(500).json({
        message: 'Error fetching bill statistics',
        error: (error as Error).message
      });
    }
  };

  // ============================================
  // GET BILL LINE ITEMS
  // ============================================
  getLineItems = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const result = await this.service.getLineItems(id);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error fetching bill line items:', error);
      res.status(500).json({
        message: 'Error fetching bill line items',
        error: (error as Error).message
      });
    }
  };

  // ============================================
  // VOID BILL LINE ITEM
  // ============================================
  voidLineItem = [
    body('reason').notEmpty().withMessage('Void reason is required'),

    async (req: AuthRequest, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const user = req.user;
        if (!user) {
          return res.status(401).json({ message: 'User authentication required' });
        }

        const { lineItemId } = req.params;
        const { reason } = req.body;

        const result = await this.service.voidLineItem(lineItemId, user.id, reason);

        res.json({
          success: true,
          data: result,
          message: 'Bill line item voided successfully'
        });
      } catch (error) {
        console.error('Error voiding bill line item:', error);
        res.status(500).json({
          message: 'Error voiding bill line item',
          error: (error as Error).message
        });
      }
    }
  ];

  // ============================================
  // APPLY WAIVER TO BILL
  // ============================================
  applyWaiver = [
    body('waiverId').notEmpty().withMessage('Waiver ID is required'),

    async (req: AuthRequest, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const { billId } = req.params;
        const { waiverId } = req.body;

        const result = await this.service.applyWaiver(billId, waiverId);

        res.json({
          success: true,
          data: result,
          message: 'Waiver applied successfully'
        });
      } catch (error) {
        console.error('Error applying waiver:', error);
        res.status(500).json({
          message: 'Error applying waiver',
          error: (error as Error).message
        });
      }
    }
  ];
}
