import { Request, Response, NextFunction } from 'express';
import { BaseController } from '../../utils/baseController';
import { CorporateService } from './CorporateService';
import { 
  CreateCorporateAccountDTO, 
  UpdateCorporateAccountDTO,
  CreateCorporateEmployeeDTO,
  UpdateCorporateEmployeeDTO,
  CorporateAccountResponse,
  CorporateEmployeeResponse
} from './CorporateTypes';

export class CorporateController extends BaseController {
  private corporateService: CorporateService;

  constructor() {
    super();
    this.corporateService = new CorporateService();
    this.createAccount = this.createAccount.bind(this);
    this.getAccount = this.getAccount.bind(this);
    this.getAccounts = this.getAccounts.bind(this);
    this.updateAccount = this.updateAccount.bind(this);
    this.deactivateAccount = this.deactivateAccount.bind(this);
    this.addEmployee = this.addEmployee.bind(this);
    this.getEmployee = this.getEmployee.bind(this);
    this.updateEmployee = this.updateEmployee.bind(this);
    this.removeEmployee = this.removeEmployee.bind(this);
    this.getEmployees = this.getEmployees.bind(this);
    this.getStatistics = this.getStatistics.bind(this);
  }

  async createAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto: CreateCorporateAccountDTO = req.body;
      const account = await this.corporateService.createAccount(dto);
      this.handleSuccess(res, 201, 'Corporate account created successfully', account);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async getAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const account = await this.corporateService.getAccount(id);
      this.handleSuccess(res, 200, 'Corporate account retrieved successfully', account);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async getAccounts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = req.query;
      const accounts = await this.corporateService.getAccounts(filters);
      this.handleSuccess(res, 200, 'Corporate accounts retrieved successfully', accounts);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async updateAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const dto: UpdateCorporateAccountDTO = req.body;
      const account = await this.corporateService.updateAccount(id, dto);
      this.handleSuccess(res, 200, 'Corporate account updated successfully', account);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async deactivateAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const account = await this.corporateService.deactivateAccount(id);
      this.handleSuccess(res, 200, 'Corporate account deactivated successfully', account);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async addEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { accountId } = req.params;
      const dto: CreateCorporateEmployeeDTO = req.body;
      const employee = await this.corporateService.addEmployee(accountId, dto);
      this.handleSuccess(res, 201, 'Employee added successfully', employee);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async getEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const employee = await this.corporateService.getEmployee(id);
      this.handleSuccess(res, 200, 'Employee retrieved successfully', employee);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async updateEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const dto: UpdateCorporateEmployeeDTO = req.body;
      const employee = await this.corporateService.updateEmployee(id, dto);
      this.handleSuccess(res, 200, 'Employee updated successfully', employee);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async removeEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const employee = await this.corporateService.removeEmployee(id);
      this.handleSuccess(res, 200, 'Employee removed successfully', employee);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async getEmployees(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { accountId } = req.params;
      const employees = await this.corporateService.getEmployees(accountId);
      this.handleSuccess(res, 200, 'Employees retrieved successfully', employees);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async getStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await this.corporateService.getStatistics();
      this.handleSuccess(res, 200, 'Statistics retrieved successfully', stats);
    } catch (error) {
      this.handleError(res, error);
    }
  }
}
