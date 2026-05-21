// modules/corporate/CorporateController.ts
import { Response } from 'express';
import { BaseController } from '../../shared/base/BaseController';
import { CorporateService } from './CorporateService';
import { AuthRequest } from '../../middleware/authMiddleware';
import { 
  CreateCorporateAccountDTO, 
  UpdateCorporateAccountDTO,
  CreateCorporateEmployeeDTO,
  UpdateCorporateEmployeeDTO
} from './CorporateTypes';

export class CorporateController extends BaseController {
  private corporateService: CorporateService;

  constructor() {
    super();
    this.corporateService = new CorporateService();
  }

  createAccount = async (req: AuthRequest, res: Response) => {
    try {
      const dto: CreateCorporateAccountDTO = req.body;
      const account = await this.corporateService.createAccount(dto);
      this.created(res, account, 'Corporate account created successfully');
    } catch (error: any) {
      this.error(res, error);
    }
  };

  getAccount = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const account = await this.corporateService.getAccount(id);
      if (!account) {
        return this.notFound(res, 'Corporate account');
      }
      this.ok(res, account, 'Corporate account retrieved successfully');
    } catch (error: any) {
      this.error(res, error);
    }
  };

  getAccounts = async (req: AuthRequest, res: Response) => {
    try {
      const filters = req.query;
      const result = await this.corporateService.getAccounts(filters);
      this.ok(res, result.data, 'Corporate accounts retrieved successfully', { pagination: result.pagination });
    } catch (error: any) {
      this.error(res, error);
    }
  };

  updateAccount = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const dto: UpdateCorporateAccountDTO = req.body;
      const account = await this.corporateService.updateAccount(id, dto);
      this.ok(res, account, 'Corporate account updated successfully');
    } catch (error: any) {
      this.error(res, error);
    }
  };

  deactivateAccount = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const account = await this.corporateService.deactivateAccount(id);
      this.ok(res, account, 'Corporate account deactivated successfully');
    } catch (error: any) {
      this.error(res, error);
    }
  };

  addEmployee = async (req: AuthRequest, res: Response) => {
    try {
      const { accountId } = req.params;
      const dto: CreateCorporateEmployeeDTO = req.body;
      const employee = await this.corporateService.addEmployee(accountId, dto);
      this.created(res, employee, 'Employee added successfully');
    } catch (error: any) {
      this.error(res, error);
    }
  };

  getEmployee = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const employee = await this.corporateService.getEmployee(id);
      if (!employee) {
        return this.notFound(res, 'Employee');
      }
      this.ok(res, employee, 'Employee retrieved successfully');
    } catch (error: any) {
      this.error(res, error);
    }
  };

  updateEmployee = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const dto: UpdateCorporateEmployeeDTO = req.body;
      const employee = await this.corporateService.updateEmployee(id, dto);
      this.ok(res, employee, 'Employee updated successfully');
    } catch (error: any) {
      this.error(res, error);
    }
  };

  removeEmployee = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const employee = await this.corporateService.removeEmployee(id);
      this.ok(res, employee, 'Employee removed successfully');
    } catch (error: any) {
      this.error(res, error);
    }
  };

  getEmployees = async (req: AuthRequest, res: Response) => {
    try {
      const { accountId } = req.params;
      const employees = await this.corporateService.getEmployees(accountId);
      this.ok(res, employees, 'Employees retrieved successfully');
    } catch (error: any) {
      this.error(res, error);
    }
  };

  getStatistics = async (req: AuthRequest, res: Response) => {
    try {
      const stats = await this.corporateService.getStatistics();
      this.ok(res, stats, 'Statistics retrieved successfully');
    } catch (error: any) {
      this.error(res, error);
    }
  };

  generateMonthlyBill = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { month, year, discountPercentage } = req.body;
      const generatedById = req.user?.id;

      if (!month || !year) {
        return this.badRequest(res, 'Month and year are required');
      }

      if (!generatedById) {
        return this.unauthorized(res, 'User authentication required');
      }

      const billSummary = await this.corporateService.generateMonthlyBill({
        accountId: id,
        month,
        year,
        discountPercentage,
        generatedById
      });

      this.created(res, billSummary, 'Monthly bill generated successfully');
    } catch (error: any) {
      this.error(res, error);
    }
  };

  getMonthlyBills = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const filters = req.query;
      
      const result = await this.corporateService.getMonthlyBills(id, filters);
      this.ok(res, result.data, 'Monthly bills retrieved successfully', { pagination: result.pagination });
    } catch (error: any) {
      this.error(res, error);
    }
  };
}

export default CorporateController;