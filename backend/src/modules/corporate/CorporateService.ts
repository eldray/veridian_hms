// modules/corporate/CorporateService.ts
import { CorporateRepository } from './CorporateRepository';
import { 
  CreateCorporateAccountDTO, 
  UpdateCorporateAccountDTO,
  CreateCorporateEmployeeDTO,
  UpdateCorporateEmployeeDTO,
  GetAccountsFilters
} from './CorporateTypes';

export class CorporateService {
  private corporateRepository: CorporateRepository;

  constructor() {
    this.corporateRepository = new CorporateRepository();
  }

  async createAccount(dto: CreateCorporateAccountDTO) {
    if (!dto.companyName || !dto.contactPerson || !dto.email || !dto.phone) {
      throw new Error('Company name, contact person, email, and phone are required');
    }
    return this.corporateRepository.createAccount(dto);
  }

  async getAccount(id: string) {
    return this.corporateRepository.getAccount(id);
  }

  async getAccounts(filters: GetAccountsFilters) {
    return this.corporateRepository.getAccounts(filters);
  }

  async updateAccount(id: string, dto: UpdateCorporateAccountDTO) {
    const existing = await this.corporateRepository.getAccount(id);
    if (!existing) {
      throw new Error('Corporate account not found');
    }
    return this.corporateRepository.updateAccount(id, dto);
  }

  async deactivateAccount(id: string) {
    const existing = await this.corporateRepository.getAccount(id);
    if (!existing) {
      throw new Error('Corporate account not found');
    }
    return this.corporateRepository.deactivateAccount(id);
  }

  async addEmployee(accountId: string, dto: CreateCorporateEmployeeDTO) {
    const account = await this.corporateRepository.getAccount(accountId);
    if (!account) {
      throw new Error('Corporate account not found');
    }
    if (!dto.employeeId || !dto.firstName || !dto.lastName) {
      throw new Error('Employee ID, first name, and last name are required');
    }
    return this.corporateRepository.addEmployee(accountId, dto);
  }

  async getEmployee(id: string) {
    return this.corporateRepository.getEmployee(id);
  }

  async updateEmployee(id: string, dto: UpdateCorporateEmployeeDTO) {
    const existing = await this.corporateRepository.getEmployee(id);
    if (!existing) {
      throw new Error('Employee not found');
    }
    return this.corporateRepository.updateEmployee(id, dto);
  }

  async removeEmployee(id: string) {
    const existing = await this.corporateRepository.getEmployee(id);
    if (!existing) {
      throw new Error('Employee not found');
    }
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