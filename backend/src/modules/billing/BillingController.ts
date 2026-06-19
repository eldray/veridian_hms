import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { BaseController } from '../../shared/base/BaseController';
import { BillingService } from './BillingService';
import { AuthRequest } from '../../middleware/authMiddleware';

export class BillingController extends BaseController {
  private service: BillingService;

  constructor(prisma: PrismaClient) {
    super();
    this.service = new BillingService(prisma);
  }

  // ============================================
  // GET ALL BILLS WITH PAGINATION
  // ============================================
  getAll = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 50);

    const filters = {
      patientId: req.query.patientId as string,
      status: req.query.status as any,
      paymentMode: req.query.paymentMode as any,
      dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
      dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
      page, limit
    };

    const result = await this.service.getBills(filters);
    return this.paginated(res, result.bills, { page, limit, total: result.total }, 'Bills retrieved successfully');
  });

  // ============================================
  // GET BILL BY ID
  // ============================================
  getById = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const bill = await this.service.getBillById(req.params.id);
    return this.ok(res, bill, 'Bill retrieved successfully');
  });

  // ============================================
  // CREATE BILL (Keeps your exact express-validator logic)
  // ============================================
  create = [
    body('patientId').notEmpty().withMessage('Patient ID is required'),
    body('attendanceId').notEmpty().withMessage('Attendance ID is required'),
    body('paymentMode').isIn(['cash', 'nhis', 'private_insurance', 'corporate']).withMessage('Valid payment mode is required'),
    body('items').isArray({ min: 1 }).withMessage('At least one bill item is required'),
    body('corporateAccountId').optional().custom((value, { req }) => {
      if (req.body.paymentMode === 'corporate' && !value) throw new Error('Corporate Account ID is required for corporate payment mode');
      return true;
    }),

    this.asyncHandler(async (req: AuthRequest, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return this.badRequest(res, 'Validation failed', errors.array() as any[]);

      const bill = await this.service.createBill(req.body, req.user!.id);
      return this.created(res, bill, 'Bill created successfully');
    })
  ];

  // ============================================
  // ADD PAYMENT TO BILL
  // ============================================
  addPayment = [
    body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount is required'),
    body('paymentMethod').isIn(['cash', 'mobile_money', 'card', 'bank_transfer', 'cheque']).withMessage('Valid payment method is required'),

    this.asyncHandler(async (req: AuthRequest, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return this.badRequest(res, 'Validation failed', errors.array() as any[]);

      const result = await this.service.addPaymentToBill(req.params.id, req.body, req.user!.id);
      return this.ok(res, result, 'Payment added successfully');
    })
  ];

  // ============================================
  // UPDATE BILL STATUS
  // ============================================
  updateStatus = [
    body('status').isIn(['draft', 'pending', 'partial', 'paid', 'cancelled']).withMessage('Valid status is required'),

    this.asyncHandler(async (req: AuthRequest, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return this.badRequest(res, 'Validation failed', errors.array() as any[]);

      const bill = await this.service.updateBillStatus(req.params.id, req.body, req.user!.id);
      return this.ok(res, bill, 'Bill status updated successfully');
    })
  ];

  // ============================================
  // GET BILL STATISTICS
  // ============================================
  getStatistics = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const stats = await this.service.getStatistics((req.query.period as string) || 'month');
    return this.ok(res, stats, 'Statistics retrieved successfully');
  });

  // ============================================
  // GET BILL LINE ITEMS
  // ============================================
  getLineItems = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.getLineItems(req.params.id);
    return this.ok(res, result, 'Line items retrieved successfully');
  });

  // ============================================
  // VOID BILL LINE ITEM
  // ============================================
  voidLineItem = [
    body('reason').notEmpty().withMessage('Void reason is required'),

    this.asyncHandler(async (req: AuthRequest, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return this.badRequest(res, 'Validation failed', errors.array() as any[]);

      const result = await this.service.voidLineItem(req.params.lineItemId, req.user!.id, req.body.reason);
      return this.ok(res, result, 'Bill line item voided successfully');
    })
  ];

  // ============================================
  // APPLY WAIVER TO BILL
  // ============================================
  applyWaiver = [
    body('waiverId').notEmpty().withMessage('Waiver ID is required'),

    this.asyncHandler(async (req: AuthRequest, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return this.badRequest(res, 'Validation failed', errors.array() as any[]);

      const result = await this.service.applyWaiver(req.params.billId, req.body.waiverId);
      return this.ok(res, result, 'Waiver applied successfully');
    })
  ];
}