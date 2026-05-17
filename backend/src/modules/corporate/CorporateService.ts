import { PrismaClient } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { CorporateRepository } from './CorporateRepository';
import { 
  CreateCorporateAccountDTO, 
  UpdateCorporateAccountDTO,
  CreateCorporateEmployeeDTO,
  UpdateCorporateEmployeeDTO
} from './CorporateTypes';

export class CorporateService extends BaseService {
  private corporateRepository: CorporateRepository;

  constructor() {
    super();
    this.corporateRepository = new CorporateRepository();
  }

  async createAccount(dto: CreateCorporateAccountDTO) {
    return this.corporateRepository.createAccount(dto);
  }

  async getAccount(id: string) {
    return this.corporateRepository.getAccount(id);
  }

  async getAccounts(filters: any) {
    return this.corporateRepository.getAccounts(filters);
  }

  async updateAccount(id: string, dto: UpdateCorporateAccountDTO) {
    return this.corporateRepository.updateAccount(id, dto);
  }

  async deactivateAccount(id: string) {
    return this.corporateRepository.deactivateAccount(id);
  }

  async addEmployee(accountId: string, dto: CreateCorporateEmployeeDTO) {
    return this.corporateRepository.addEmployee(accountId, dto);
  }

  async getEmployee(id: string) {
    return this.corporateRepository.getEmployee(id);
  }

  async updateEmployee(id: string, dto: UpdateCorporateEmployeeDTO) {
    return this.corporateRepository.updateEmployee(id, dto);
  }

  async removeEmployee(id: string) {
    return this.corporateRepository.removeEmployee(id);
  }

  async getEmployees(accountId: string) {
    return this.corporateRepository.getEmployees(accountId);
  }

  async getStatistics() {
    return this.corporateRepository.getStatistics();
  }

  async generateMonthlyBill(dto: any) {
    return this.corporateRepository.generateMonthlyBill(dto);
  }

  async getMonthlyBills(accountId: string, filters?: any) {
    return this.corporateRepository.getMonthlyBills(accountId, filters);
  }
}
