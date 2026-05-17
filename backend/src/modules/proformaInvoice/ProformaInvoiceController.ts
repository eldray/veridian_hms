import { Request, Response } from 'express';
import { BaseController } from '../../utils/baseController';
import { ProformaInvoiceService } from './ProformaInvoiceService';
import { 
  CreateProformaInvoiceDTO, 
  UpdateProformaInvoiceDTO,
  ProformaInvoiceFilters,
  ConvertToBillDTO
} from './ProformaInvoiceTypes';

export class ProformaInvoiceController extends BaseController {
  private proformaInvoiceService: ProformaInvoiceService;

  constructor() {
    super('ProformaInvoice');
    this.proformaInvoiceService = new ProformaInvoiceService();
  }

  /**
   * @route   POST /api/proforma-invoices
   * @desc    Create a new proforma invoice
   * @access  Private (Billing Staff, Admin)
   */
  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const data: CreateProformaInvoiceDTO = req.body;
      const userId = req.user?.id;

      if (!userId) {
        this.handleUnauthorized(res, 'User not authenticated');
        return;
      }

      const result = await this.proformaInvoiceService.create(data, userId);
      this.handleSuccess(res, result, 201);
    } catch (error: any) {
      this.handleError(res, error);
    }
  };

  /**
   * @route   GET /api/proforma-invoices
   * @desc    Get all proforma invoices with filters
   * @access  Private (Billing Staff, Admin)
   */
  getAll = async (req: Request, res: Response): Promise<void> => {
    try {
      const filters: ProformaInvoiceFilters = {
        patientId: req.query.patientId as string,
        accountId: req.query.accountId as string,
        status: req.query.status as any,
        encounterId: req.query.encounterId as string,
        fromDate: req.query.fromDate ? new Date(req.query.fromDate as string) : undefined,
        toDate: req.query.toDate ? new Date(req.query.toDate as string) : undefined,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
      };

      const result = await this.proformaInvoiceService.getAll(filters);
      this.handleSuccess(res, result);
    } catch (error: any) {
      this.handleError(res, error);
    }
  };

  /**
   * @route   GET /api/proforma-invoices/:id
   * @desc    Get proforma invoice by ID
   * @access  Private
   */
  getById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await this.proformaInvoiceService.getById(id);
      this.handleSuccess(res, result);
    } catch (error: any) {
      this.handleError(res, error);
    }
  };

  /**
   * @route   PUT /api/proforma-invoices/:id
   * @desc    Update proforma invoice
   * @access  Private (Billing Staff, Admin)
   */
  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const data: UpdateProformaInvoiceDTO = req.body;
      const userId = req.user?.id;

      if (!userId) {
        this.handleUnauthorized(res, 'User not authenticated');
        return;
      }

      const result = await this.proformaInvoiceService.update(id, data, userId);
      this.handleSuccess(res, result);
    } catch (error: any) {
      this.handleError(res, error);
    }
  };

  /**
   * @route   POST /api/proforma-invoices/:id/send
   * @desc    Send proforma invoice to patient/corporate account
   * @access  Private (Billing Staff, Admin)
   */
  send = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        this.handleUnauthorized(res, 'User not authenticated');
        return;
      }

      const result = await this.proformaInvoiceService.send(id, userId);
      this.handleSuccess(res, result);
    } catch (error: any) {
      this.handleError(res, error);
    }
  };

  /**
   * @route   POST /api/proforma-invoices/:id/accept
   * @desc    Accept proforma invoice
   * @access  Private
   */
  accept = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        this.handleUnauthorized(res, 'User not authenticated');
        return;
      }

      const result = await this.proformaInvoiceService.accept(id, userId);
      this.handleSuccess(res, result);
    } catch (error: any) {
      this.handleError(res, error);
    }
  };

  /**
   * @route   POST /api/proforma-invoices/:id/reject
   * @desc    Reject proforma invoice
   * @access  Private
   */
  reject = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const { reason } = req.body;

      if (!userId) {
        this.handleUnauthorized(res, 'User not authenticated');
        return;
      }

      const result = await this.proformaInvoiceService.reject(id, reason, userId);
      this.handleSuccess(res, result);
    } catch (error: any) {
      this.handleError(res, error);
    }
  };

  /**
   * @route   POST /api/proforma-invoices/:id/convert
   * @desc    Convert proforma invoice to bill
   * @access  Private (Billing Staff, Admin)
   */
  convertToBill = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const data: ConvertToBillDTO = req.body;
      const userId = req.user?.id;

      if (!userId) {
        this.handleUnauthorized(res, 'User not authenticated');
        return;
      }

      const result = await this.proformaInvoiceService.convertToBill(id, data, userId);
      this.handleSuccess(res, result, 201);
    } catch (error: any) {
      this.handleError(res, error);
    }
  };

  /**
   * @route   DELETE /api/proforma-invoices/:id
   * @desc    Delete proforma invoice (only drafts)
   * @access  Private (Admin)
   */
  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        this.handleUnauthorized(res, 'User not authenticated');
        return;
      }

      await this.proformaInvoiceService.delete(id, userId);
      this.handleSuccess(res, { message: 'Proforma invoice deleted successfully' });
    } catch (error: any) {
      this.handleError(res, error);
    }
  };

  /**
   * @route   GET /api/proforma-invoices/statistics
   * @desc    Get proforma invoice statistics
   * @access  Private (Admin, Management)
   */
  getStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      const filters: ProformaInvoiceFilters = {
        patientId: req.query.patientId as string,
        accountId: req.query.accountId as string,
        status: req.query.status as any,
        fromDate: req.query.fromDate ? new Date(req.query.fromDate as string) : undefined,
        toDate: req.query.toDate ? new Date(req.query.toDate as string) : undefined,
      };

      const result = await this.proformaInvoiceService.getStatistics(filters);
      this.handleSuccess(res, result);
    } catch (error: any) {
      this.handleError(res, error);
    }
  };
}
