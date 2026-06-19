// modules/corporate/CorporateController.ts
import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
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

  // ✅ FIXED: Accept prisma and pass to service
  constructor(prisma: PrismaClient) {
    super();
    this.corporateService = new CorporateService(prisma);
  }

  createAccount = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const dto: CreateCorporateAccountDTO = req.body;
    const account = await this.corporateService.createAccount(dto);
    return this.created(res, account, 'Corporate account created successfully');
  });

  getAccount = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const account = await this.corporateService.getAccount(id);
    if (!account) {
      return this.notFound(res, 'Corporate account');
    }
    return this.ok(res, account, 'Corporate account retrieved successfully');
  });

  getAccounts = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = 1, limit = 20, ...filters } = req.query;
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    
    const result = await this.corporateService.getAccounts({ ...filters, page: pageNum, limit: limitNum });
    return this.paginated(res, result.data, { 
      page: pageNum, limit: limitNum, total: result.total 
    }, 'Corporate accounts retrieved successfully');
  });

  updateAccount = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const dto: UpdateCorporateAccountDTO = req.body;
    const account = await this.corporateService.updateAccount(id, dto);
    return this.ok(res, account, 'Corporate account updated successfully');
  });

  deactivateAccount = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const account = await this.corporateService.deactivateAccount(id);
    return this.ok(res, account, 'Corporate account deactivated successfully');
  });

  addEmployee = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { accountId } = req.params;
    const dto: CreateCorporateEmployeeDTO = req.body;
    const employee = await this.corporateService.addEmployee(accountId, dto);
    return this.created(res, employee, 'Employee added successfully');
  });

  getEmployee = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const employee = await this.corporateService.getEmployee(id);
    if (!employee) {
      return this.notFound(res, 'Employee');
    }
    return this.ok(res, employee, 'Employee retrieved successfully');
  });

  updateEmployee = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const dto: UpdateCorporateEmployeeDTO = req.body;
    const employee = await this.corporateService.updateEmployee(id, dto);
    return this.ok(res, employee, 'Employee updated successfully');
  });

  removeEmployee = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const employee = await this.corporateService.removeEmployee(id);
    return this.ok(res, employee, 'Employee removed successfully');
  });

  getEmployees = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { accountId } = req.params;
    const employees = await this.corporateService.getEmployees(accountId);
    return this.ok(res, employees, 'Employees retrieved successfully');
  });

  getStatistics = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const stats = await this.corporateService.getStatistics();
    return this.ok(res, stats, 'Statistics retrieved successfully');
  });

  generateMonthlyBill = this.asyncHandler(async (req: AuthRequest, res: Response) => {
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

    return this.created(res, billSummary, 'Monthly bill generated successfully');
  });

  getMonthlyBills = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const result = await this.corporateService.getMonthlyBills(id, { 
      page: parseInt(page as string), 
      limit: parseInt(limit as string) 
    });
    return this.paginated(res, result.data, { 
      page: result.pagination.page, 
      limit: result.pagination.limit, 
      total: result.pagination.total 
    }, 'Monthly bills retrieved successfully');
  });
}

export default CorporateController;