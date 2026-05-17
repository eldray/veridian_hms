import { PrismaClient } from '@prisma/client';
import { BaseRepository } from '../../utils/baseRepository';
import { 
  CreateCorporateAccountDTO, 
  UpdateCorporateAccountDTO,
  CreateCorporateEmployeeDTO,
  UpdateCorporateEmployeeDTO
} from './CorporateTypes';

const prisma = new PrismaClient();

export class CorporateRepository extends BaseRepository {
  async createAccount(dto: CreateCorporateAccountDTO) {
    return prisma.corporateAccount.create({
      data: {
        ...dto,
        creditLimit: dto.creditLimit || 0,
        currentBalance: 0,
        paymentTerms: dto.paymentTerms || 30,
        discountPercentage: dto.discountPercentage || 0,
        isActive: true
      },
      include: {
        insuranceProvider: true
      }
    });
  }

  async getAccount(id: string) {
    return prisma.corporateAccount.findUnique({
      where: { id },
      include: {
        insuranceProvider: true,
        employees: {
          where: { isActive: true },
          orderBy: { lastName: 'asc' }
        },
        invoices: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        },
        proformaInvoices: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  }

  async getAccounts(filters: any) {
    const { search, insuranceProviderId, isActive, page = 1, limit = 20 } = filters;
    
    const where: any = {};
    
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (insuranceProviderId) {
      where.insuranceProviderId = insuranceProviderId;
    }
    
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [accounts, total] = await Promise.all([
      prisma.corporateAccount.findMany({
        where,
        include: {
          insuranceProvider: true,
          _count: {
            select: {
              employees: true,
              invoices: true,
              proformaInvoices: true
            }
          }
        },
        skip,
        take: Number(limit),
        orderBy: { companyName: 'asc' }
      }),
      prisma.corporateAccount.count({ where })
    ]);

    return {
      data: accounts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    };
  }

  async updateAccount(id: string, dto: UpdateCorporateAccountDTO) {
    return prisma.corporateAccount.update({
      where: { id },
      data: dto,
      include: {
        insuranceProvider: true
      }
    });
  }

  async deactivateAccount(id: string) {
    return prisma.corporateAccount.update({
      where: { id },
      data: { isActive: false }
    });
  }

  async addEmployee(accountId: string, dto: CreateCorporateEmployeeDTO) {
    return prisma.corporateEmployee.create({
      data: {
        ...dto,
        accountId,
        enrollmentDate: dto.enrollmentDate || new Date(),
        isActive: true
      }
    });
  }

  async getEmployee(id: string) {
    return prisma.corporateEmployee.findUnique({
      where: { id },
      include: {
        account: {
          include: {
            insuranceProvider: true
          }
        }
      }
    });
  }

  async updateEmployee(id: string, dto: UpdateCorporateEmployeeDTO) {
    return prisma.corporateEmployee.update({
      where: { id },
      data: dto
    });
  }

  async removeEmployee(id: string) {
    return prisma.corporateEmployee.update({
      where: { id },
      data: {
        isActive: false,
        endDate: new Date()
      }
    });
  }

  async getEmployees(accountId: string) {
    return prisma.corporateEmployee.findMany({
      where: { 
        accountId,
        isActive: true 
      },
      orderBy: { lastName: 'asc' }
    });
  }

  async getStatistics() {
    const [
      totalAccounts,
      activeAccounts,
      totalEmployees,
      activeEmployees,
      totalOutstanding,
      accountsWithDebt
    ] = await Promise.all([
      prisma.corporateAccount.count(),
      prisma.corporateAccount.count({ where: { isActive: true } }),
      prisma.corporateEmployee.count(),
      prisma.corporateEmployee.count({ where: { isActive: true } }),
      prisma.corporateAccount.aggregate({
        _sum: { currentBalance: true }
      }),
      prisma.corporateAccount.count({
        where: { currentBalance: { gt: 0 } }
      })
    ]);

    const utilizationData = await prisma.corporateAccount.findMany({
      where: { creditLimit: { gt: 0 } },
      select: {
        creditLimit: true,
        currentBalance: true
      }
    });

    const avgUtilization = utilizationData.reduce((acc, accoun) => {
      if (account.creditLimit > 0) {
        return acc + (account.currentBalance / account.creditLimit);
      }
      return acc;
    }, 0) / (utilizationData.length || 1);

    return {
      totalAccounts,
      activeAccounts,
      inactiveAccounts: totalAccounts - activeAccounts,
      totalEmployees,
      activeEmployees,
      inactiveEmployees: totalEmployees - activeEmployees,
      totalOutstanding: totalOutstanding._sum.currentBalance || 0,
      accountsWithDebt,
      averageCreditUtilization: Math.round(avgUtilization * 100)
    };
  }
}
