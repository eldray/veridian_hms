import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { BaseController } from '../../shared/base/BaseController';
import { BillService } from './BillService';
import { AuthRequest } from '../../middleware/authMiddleware';
import { CreateBillInput, AddPaymentInput, VoidLineItemInput } from './BillTypes';

const prisma = new PrismaClient();
const billService = new BillService(prisma);

// ✅ Kept your exact validation arrays
export const createBillValidation = [
  body('patientId').notEmpty().withMessage('Patient ID is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one line item is required'),
  body('items.*.serviceCatalogId').notEmpty().withMessage('Service catalog ID is required for each item'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('items.*.unitPrice').isFloat({ min: 0 }).withMessage('Unit price must be non-negative'),
  body('paymentMode').optional().isIn(['cash', 'nhis', 'private_insurance', 'corporate']).withMessage('Invalid payment mode')
];

export const updateBillValidation = [
  body('totalAmount').optional().isFloat({ min: 0 }).withMessage('Total amount must be non-negative'),
  body('status').optional().isIn(['draft', 'pending', 'partial', 'paid', 'cancelled']).withMessage('Invalid status'),
  body('notes').optional().isString()
];

export const addPaymentValidation = [
  body('amount').isFloat({ min: 0.01 }).withMessage('Payment amount must be greater than 0'),
  body('paymentMethod').isIn(['cash', 'mobile_money', 'card', 'bank_transfer', 'cheque']).withMessage('Invalid payment method'), // ✅ Fixed to paymentMethod
  body('reference').optional().isString(),
  body('notes').optional().isString()
];

export const voidLineItemValidation = [
  body('reason').notEmpty().withMessage('Void reason is required')
];

export const applyWaiverValidation = [
  body('waiverId').notEmpty().withMessage('Waiver ID is required')
];

export class BillController extends BaseController {
  
  getBills = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { patientId, status, paymentMode, dateFrom, dateTo, page = 1, limit = 50 } = req.query;
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));

    const filters: any = { page: pageNum, limit: limitNum };
    if (patientId) filters.patientId = patientId;
    if (status) filters.status = typeof status === 'string' && status.includes(',') ? status.split(',').map((s: string) => s.trim()) : status;
    if (paymentMode) filters.paymentMode = paymentMode;
    if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
    if (dateTo) filters.dateTo = new Date(dateTo as string);

    const result = await billService.getAllBills(filters, pageNum, limitNum);
    return this.paginated(res, result.bills, { page: pageNum, limit: limitNum, total: result.total }, 'Bills retrieved successfully');
  });

  getBillById = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const bill = await billService.getBillById(req.params.id);
      return this.ok(res, bill, 'Bill retrieved successfully');
    } catch (error: any) {
      if (error.message === 'Bill not found') return this.notFound(res, 'Bill');
      throw error;
    }
  });

  createBill = [
    ...createBillValidation,
    this.asyncHandler(async (req: AuthRequest, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return this.badRequest(res, 'Validation failed', errors.array() as any[]);
      if (!req.user?.id) return this.unauthorized(res, 'User authentication required');

      const bill = await billService.createBill(req.body as CreateBillInput, req.user.id);
      return this.created(res, bill, 'Bill created successfully');
    })
  ];

  updateBill = [
    ...updateBillValidation,
    this.asyncHandler(async (req: AuthRequest, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return this.badRequest(res, 'Validation failed', errors.array() as any[]);

      try {
        const bill = await billService.updateBill(req.params.id, req.body);
        return this.ok(res, bill, 'Bill updated successfully');
      } catch (error: any) {
        if (error.message === 'Bill not found') return this.notFound(res, 'Bill');
        throw error;
      }
    })
  ];

  deleteBill = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      await billService.deleteBill(req.params.id);
      return this.ok(res, null, 'Bill deleted successfully');
    } catch (error: any) {
      if (error.message === 'Bill not found') return this.notFound(res, 'Bill');
      throw error;
    }
  });

  addPaymentToBill = [
    ...addPaymentValidation,
    this.asyncHandler(async (req: AuthRequest, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return this.badRequest(res, 'Validation failed', errors.array() as any[]);
      if (!req.user?.id) return this.unauthorized(res, 'User authentication required');

      try {
        const result = await billService.addPayment(req.params.id, req.body as AddPaymentInput, req.user.id);
        return this.ok(res, result, 'Payment added successfully');
      } catch (error: any) {
        if (error.message === 'Bill not found') return this.notFound(res, 'Bill');
        throw error;
      }
    })
  ];

  voidBillLineItem = [
    ...voidLineItemValidation,
    this.asyncHandler(async (req: AuthRequest, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return this.badRequest(res, 'Validation failed', errors.array() as any[]);
      if (!req.user?.id) return this.unauthorized(res, 'User authentication required');

      try {
        const { reason }: VoidLineItemInput = req.body;
        const result = await billService.voidLineItem(req.params.lineItemId, req.user.id, reason);
        const updatedBill = await billService.getBillById(result.billId);
        return this.ok(res, { voidedItem: result, updatedBill }, 'Bill line item voided successfully');
      } catch (error: any) {
        if (error.message === 'Line item not found' || error.message === 'Bill not found') return this.notFound(res, error.message);
        throw error;
      }
    })
  ];

  getBillStatistics = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { dateFrom, dateTo } = req.query;
    const startDate = dateFrom ? new Date(dateFrom as string) : undefined;
    const endDate = dateTo ? new Date(dateTo as string) : undefined;
    const stats = await billService.getStatistics(startDate, endDate);
    return this.ok(res, stats, 'Statistics retrieved successfully');
  });

  getBillLineItems = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const lineItems = await billService.getLineItems(req.params.id);
      const bill = await billService.getBillById(req.params.id);

      // ✅ FIXED: Safely parse Decimals for summary calculation
      const toNum = (val: any) => val ? parseFloat(val.toString()) : 0;

      return this.ok(res, {
        bill: { id: bill?.id, billNumber: bill?.billNumber, status: bill?.status, totalAmount: bill?.totalAmount, paidAmount: bill?.paidAmount, balance: bill?.balance },
        lineItems,
        summary: {
          totalItems: lineItems.length,
          subtotal: lineItems.reduce((sum, i) => sum + toNum(i.lineTotal), 0),
          insuranceCovered: lineItems.reduce((sum, i) => sum + toNum(i.insuranceCoveredAmount), 0),
          patientPayable: lineItems.reduce((sum, i) => sum + toNum(i.patientPayableAmount), 0)
        }
      }, 'Line items retrieved successfully');
    } catch (error: any) {
      if (error.message === 'Bill not found') return this.notFound(res, 'Bill');
      throw error;
    }
  });

  getBillBreakdown = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const breakdown = await billService.getBreakdown(req.params.id);
      return this.ok(res, breakdown, 'Billing breakdown retrieved successfully');
    } catch (error: any) {
      if (error.message === 'Bill not found') return this.notFound(res, 'Bill');
      throw error;
    }
  });

  getBillReport = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const report = await billService.getReport(req.params.id);
      return this.ok(res, report, 'Bill report generated successfully');
    } catch (error: any) {
      if (error.message === 'Bill not found') return this.notFound(res, 'Bill');
      throw error;
    }
  });

  generateBillFromEncounter = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user?.id) return this.unauthorized(res, 'User authentication required');
    try {
      const bill = await billService.generateFromEncounter(req.params.encounterId, req.user.id);
      return this.created(res, bill, 'Bill generated from encounter successfully');
    } catch (error: any) {
      if (error.message === 'Encounter not found') return this.notFound(res, 'Encounter');
      if (error.message === 'A bill already exists for this encounter') return this.conflict(res, error.message);
      throw error;
    }
  });

  applyWaiverToBill = [
    ...applyWaiverValidation,
    this.asyncHandler(async (req: AuthRequest, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return this.badRequest(res, 'Validation failed', errors.array() as any[]);

      try {
        const { waiverId } = req.body;
        const result = await billService.applyWaiver(req.params.billId, waiverId);
        return this.ok(res, result, 'Waiver applied successfully');
      } catch (error: any) {
        if (error.message === 'Waiver not found' || error.message === 'Bill not found') return this.notFound(res, error.message);
        throw error;
      }
    })
  ];
}

export const billController = new BillController();