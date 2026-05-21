// modules/proformaInvoice/ProformaInvoiceController.ts
import { Request, Response } from 'express';
import { BaseController } from '../../shared/base/BaseController';
import { ProformaInvoiceService } from './ProformaInvoiceService'; // ✅ Add this import
import { 
  CreateProformaInvoiceDTO, 
  UpdateProformaInvoiceDTO,
  ProformaInvoiceFilters,
  ConvertToBillDTO
} from './ProformaInvoiceTypes';
import { AuthRequest } from '../../middleware/authMiddleware';

export class ProformaInvoiceController extends BaseController {
  private proformaInvoiceService: ProformaInvoiceService;

  constructor() {
    super('ProformaInvoice');
    this.proformaInvoiceService = new ProformaInvoiceService(); // ✅ Now ProformaInvoiceService is defined
  }

  /**
   * @route   POST /api/estimates
   * @desc    Create a new proforma invoice
   * @access  Private (Billing Staff, Admin)
   */
  create = async (req: AuthRequest, res: Response): Promise<void> => {
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
   * @route   GET /api/estimates
   * @desc    Get all proforma invoices with filters
   * @access  Private (Billing Staff, Admin)
   */
  getAll = async (req: AuthRequest, res: Response): Promise<void> => {
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
   * @route   GET /api/estimates/:id
   * @desc    Get proforma invoice by ID
   * @access  Private
   */
  getById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await this.proformaInvoiceService.getById(id);
      this.handleSuccess(res, result);
    } catch (error: any) {
      this.handleError(res, error);
    }
  };

  /**
   * @route   PUT /api/estimates/:id
   * @desc    Update proforma invoice
   * @access  Private (Billing Staff, Admin)
   */
  update = async (req: AuthRequest, res: Response): Promise<void> => {
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
   * @route   POST /api/estimates/:id/send
   * @desc    Send proforma invoice to patient/corporate account
   * @access  Private (Billing Staff, Admin)
   */
  send = async (req: AuthRequest, res: Response): Promise<void> => {
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
   * @route   POST /api/estimates/:id/accept
   * @desc    Accept proforma invoice
   * @access  Private
   */
  accept = async (req: AuthRequest, res: Response): Promise<void> => {
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
   * @route   POST /api/estimates/:id/reject
   * @desc    Reject proforma invoice
   * @access  Private
   */
  reject = async (req: AuthRequest, res: Response): Promise<void> => {
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
   * @route   POST /api/estimates/:id/convert
   * @desc    Convert proforma invoice to bill
   * @access  Private (Billing Staff, Admin)
   */
  convertToBill = async (req: AuthRequest, res: Response): Promise<void> => {
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
   * @route   DELETE /api/estimates/:id
   * @desc    Delete proforma invoice (only drafts)
   * @access  Private (Admin)
   */
  delete = async (req: AuthRequest, res: Response): Promise<void> => {
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
   * @route   GET /api/estimates/statistics
   * @desc    Get proforma invoice statistics
   * @access  Private (Admin, Management)
   */
  getStatistics = async (req: AuthRequest, res: Response): Promise<void> => {
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

  /**
   * @route   GET /api/estimates/expiring
   * @desc    Get expiring proforma invoices
   * @access  Private (Admin, Management)
   */
  getExpiring = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const days = req.query.days ? parseInt(req.query.days as string) : 7;
      const result = await this.proformaInvoiceService.getExpiringSoon(days);
      this.handleSuccess(res, result);
    } catch (error: any) {
      this.handleError(res, error);
    }
  };

  /**
   * @route   GET /api/estimates/patient/:patientId
   * @desc    Get proforma invoices by patient
   * @access  Private
   */
  getByPatient = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { patientId } = req.params;
      const result = await this.proformaInvoiceService.getByPatientId(patientId);
      this.handleSuccess(res, result);
    } catch (error: any) {
      this.handleError(res, error);
    }
  };

  /**
   * @route   GET /api/estimates/corporate/:accountId
   * @desc    Get proforma invoices by corporate account
   * @access  Private (Admin, Accounts)
   */
  getByCorporateAccount = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { accountId } = req.params;
      const result = await this.proformaInvoiceService.getByCorporateAccountId(accountId);
      this.handleSuccess(res, result);
    } catch (error: any) {
      this.handleError(res, error);
    }
  };
}