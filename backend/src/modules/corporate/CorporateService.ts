// modules/corporate/CorporateService.ts
import { PrismaClient } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { CorporateRepository } from './CorporateRepository';
import { 
  CreateCorporateAccountDTO, 
  UpdateCorporateAccountDTO,
  CreateCorporateEmployeeDTO,
  UpdateCorporateEmployeeDTO,
  GetAccountsFilters
} from './CorporateTypes';

export class CorporateService extends BaseService {
  private corporateRepository: CorporateRepository;

  // ✅ FIXED: Accept prisma and pass to repository
  constructor(prisma: PrismaClient) {
    super('CorporateService');
    this.corporateRepository = new CorporateRepository(prisma);
  }

  async createAccount(dto: CreateCorporateAccountDTO) {
    this.logInfo('Creating corporate account', { companyName: dto.companyName });
    
    if (!dto.companyName || !dto.contactPerson || !dto.email || !dto.phone) {
      throw new Error('Company name, contact person, email, and phone are required');
    }

    // Check for duplicate company name
    const existing = await this.corporateRepository.getModel().findFirst({
      where: { companyName: { equals: dto.companyName, mode: 'insensitive' } }
    });
    if (existing) {
      throw new Error('A corporate account with this company name already exists');
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
    this.logInfo('Updating corporate account', { id });
    
    const existing = await this.corporateRepository.getAccount(id);
    if (!existing) {
      throw new Error('Corporate account not found');
    }

    // Check for duplicate name if changing
    if (dto.companyName && dto.companyName !== existing.companyName) {
      const duplicate = await this.corporateRepository.getModel().findFirst({
        where: { 
          companyName: { equals: dto.companyName, mode: 'insensitive' },
          id: { not: id }
        }
      });
      if (duplicate) {
        throw new Error('A corporate account with this company name already exists');
      }
    }

    return this.corporateRepository.updateAccount(id, dto);
  }

  async deactivateAccount(id: string) {
    this.logInfo('Deactivating corporate account', { id });
    
    const existing = await this.corporateRepository.getAccount(id);
    if (!existing) {
      throw new Error('Corporate account not found');
    }

    // Check for outstanding balance
    const balance = parseFloat((existing.currentBalance || 0).toString());
    if (balance > 0) {
      this.logInfo('Deactivating account with outstanding balance', { id, balance });
    }

    return this.corporateRepository.deactivateAccount(id);
  }

  async addEmployee(accountId: string, dto: CreateCorporateEmployeeDTO) {
    this.logInfo('Adding corporate employee', { accountId, employeeId: dto.employeeId });
    
    const account = await this.corporateRepository.getAccount(accountId);
    if (!account) {
      throw new Error('Corporate account not found');
    }
    if (!dto.employeeId || !dto.firstName || !dto.lastName) {
      throw new Error('Employee ID, first name, and last name are required');
    }

    // Check for duplicate employee ID within this account
    const existingEmployee = await this.corporateRepository.prisma.corporateEmployee.findFirst({
      where: { accountId, employeeId: dto.employeeId, isActive: true }
    });
    if (existingEmployee) {
      throw new Error(`Employee ID ${dto.employeeId} already exists in this corporate account`);
    }

    return this.corporateRepository.addEmployee(accountId, dto);
  }

  async getEmployee(id: string) {
    return this.corporateRepository.getEmployee(id);
  }

  async updateEmployee(id: string, dto: UpdateCorporateEmployeeDTO) {
    this.logInfo('Updating corporate employee', { id });
    
    const existing = await this.corporateRepository.getEmployee(id);
    if (!existing) {
      throw new Error('Employee not found');
    }
    return this.corporateRepository.updateEmployee(id, dto);
  }

  async removeEmployee(id: string) {
    this.logInfo('Removing corporate employee', { id });
    
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
    this.logInfo('Fetching corporate statistics');
    return this.corporateRepository.getStatistics();
  }

  async generateMonthlyBill(dto: any) {
    this.logInfo('Generating monthly corporate bill', { 
      accountId: dto.accountId, month: dto.month, year: dto.year 
    });
    return this.corporateRepository.generateMonthlyBill(dto);
  }

  async getMonthlyBills(accountId: string, filters?: any) {
    return this.corporateRepository.getMonthlyBills(accountId, filters);
  }
}