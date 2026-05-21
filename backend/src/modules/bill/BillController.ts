import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { BillService } from './BillService';
import { AuthRequest } from '../../middleware/authMiddleware';
import { CreateBillInput, AddPaymentInput, VoidLineItemInput } from './BillTypes';

const billService = new BillService();

const handleError = (res: Response, message: string, error: any, statusCode = 500) => {
  console.error(`❌ ${message}:`, error);
  res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
};

export const getBills = async (req: AuthRequest, res: Response) => {
  try {
    const { patientId, status, paymentMode, dateFrom, dateTo, page = 1, limit = 50 } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));

    const filters: any = {};
    if (patientId) filters.patientId = patientId as string;
    
    if (status) {
      if (typeof status === 'string' && status.includes(',')) {
        filters.status = status.split(',').map((s: string) => s.trim());
      } else {
        filters.status = status;
      }
    }
    
    if (paymentMode) filters.paymentMode = paymentMode as string;
    if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
    if (dateTo) filters.dateTo = new Date(dateTo as string);

    const result = await billService.getAllBills(filters, pageNum, limitNum);

    res.json({
      success: true,
      data: result.bills,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit)
      }
    });
  } catch (error) {
    handleError(res, 'Error fetching bills', error);
  }
};

export const getBillById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const bill = await billService.getBillById(id);

    res.json({
      success: true,
      data: bill
    });
  } catch (error: any) {
    if (error.message === 'Bill not found') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    handleError(res, 'Error fetching bill', error);
  }
};

// Validation rules for create bill
export const createBillValidation = [
  body('patientId').notEmpty().withMessage('Patient ID is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one line item is required'),
  body('items.*.serviceCatalogId').notEmpty().withMessage('Service catalog ID is required for each item'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('items.*.unitPrice').isFloat({ min: 0 }).withMessage('Unit price must be non-negative'),
  body('paymentMode').optional().isIn(['cash', 'nhis', 'private_insurance', 'corporate']).withMessage('Invalid payment mode')
];

export const createBill = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
        message: 'Validation failed'
      });
    }

    const body: CreateBillInput = req.body;

    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    const bill = await billService.createBill(body, req.user.id);

    res.status(201).json({
      success: true,
      message: 'Bill created successfully',
      data: bill
    });
  } catch (error: any) {
    if (error.message.includes('required') || error.message.includes('must be') || error.message.includes('cannot be')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    handleError(res, 'Error creating bill', error);
  }
};

// Validation rules for update bill
export const updateBillValidation = [
  body('totalAmount').optional().isFloat({ min: 0 }).withMessage('Total amount must be non-negative'),
  body('status').optional().isIn(['draft', 'pending', 'partial', 'paid', 'cancelled']).withMessage('Invalid status'),
  body('notes').optional().isString()
];

export const updateBill = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
        message: 'Validation failed'
      });
    }

    const { id } = req.params;
    const updateData = req.body;

    const bill = await billService.updateBill(id, updateData);

    res.json({
      success: true,
      message: 'Bill updated successfully',
      data: bill
    });
  } catch (error: any) {
    if (error.message === 'Bill not found') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    if (error.message.includes('cannot be')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    handleError(res, 'Error updating bill', error);
  }
};

export const deleteBill = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await billService.deleteBill(id);

    res.json({
      success: true,
      message: 'Bill deleted successfully'
    });
  } catch (error: any) {
    if (error.message === 'Bill not found') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    handleError(res, 'Error deleting bill', error);
  }
};

// Validation rules for add payment
export const addPaymentValidation = [
  body('amount').isFloat({ min: 0.01 }).withMessage('Payment amount must be greater than 0'),
  body('paymentMode').isIn(['cash', 'mobile_money', 'card', 'bank_transfer', 'cheque']).withMessage('Invalid payment mode'),
  body('referenceNumber').optional().isString(),
  body('notes').optional().isString()
];

export const addPaymentToBill = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
        message: 'Validation failed'
      });
    }

    const { id } = req.params;
    const paymentData: AddPaymentInput = req.body;

    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    const result = await billService.addPayment(id, paymentData, req.user.id);

    res.json({
      success: true,
      message: 'Payment added successfully',
      data: result
    });
  } catch (error: any) {
    if (error.message === 'Bill not found') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    if (error.message.includes('must be') || error.message.includes('Cannot add payment')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    handleError(res, 'Error adding payment', error);
  }
};

// Validation rules for void line item
export const voidLineItemValidation = [
  body('reason').notEmpty().withMessage('Void reason is required')
];

export const voidBillLineItem = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
        message: 'Validation failed'
      });
    }

    const { lineItemId } = req.params;
    const { reason }: VoidLineItemInput = req.body;

    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    const result = await billService.voidLineItem(lineItemId, req.user.id, reason);

    const updatedBill = await billService.getBillById(result.billId);

    res.json({
      success: true,
      message: 'Bill line item voided successfully',
      data: {
        voidedItem: result,
        updatedBill
      }
    });
  } catch (error: any) {
    if (error.message === 'Line item not found' || error.message === 'Bill not found') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    if (error.message.includes('required') || error.message.includes('already voided')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    handleError(res, 'Error voiding bill line item', error);
  }
};

export const getBillStatistics = async (req: AuthRequest, res: Response) => {
  try {
    const { period, dateFrom, dateTo } = req.query;

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (dateFrom && dateTo) {
      startDate = new Date(dateFrom as string);
      endDate = new Date(dateTo as string);
    }

    const stats = await billService.getStatistics(startDate, endDate);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    handleError(res, 'Error fetching bill statistics', error);
  }
};

export const getBillLineItems = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const lineItems = await billService.getLineItems(id);
    const bill = await billService.getBillById(id);

    res.json({
      success: true,
      data: {
        bill: {
          id: bill?.id,
          billNumber: bill?.billNumber,
          status: bill?.status,
          totalAmount: bill?.totalAmount,
          paidAmount: bill?.paidAmount,
          balance: bill?.balance
        },
        lineItems,
        summary: {
          totalItems: lineItems.length,
          subtotal: lineItems.reduce((sum, i) => sum + (i.lineTotal || 0), 0),
          insuranceCovered: lineItems.reduce((sum, i) => sum + (i.insuranceCoveredAmount || 0), 0),
          patientPayable: lineItems.reduce((sum, i) => sum + (i.patientPayableAmount || 0), 0)
        }
      }
    });
  } catch (error: any) {
    if (error.message === 'Bill not found') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    handleError(res, 'Error fetching bill line items', error);
  }
};

// Validation rules for apply waiver
export const applyWaiverValidation = [
  body('waiverId').notEmpty().withMessage('Waiver ID is required')
];

export const applyWaiverToBill = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
        message: 'Validation failed'
      });
    }

    const { billId } = req.params;
    const { waiverId } = req.body;

    const result = await billService.applyWaiver(billId, waiverId);

    res.json({
      success: true,
      message: `Waiver applied successfully`,
      data: result
    });
  } catch (error: any) {
    if (error.message === 'Waiver not found' || error.message === 'Bill not found') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    if (error.message.includes('approved') || error.message.includes('belong')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    handleError(res, 'Error applying waiver to bill', error);
  }
};