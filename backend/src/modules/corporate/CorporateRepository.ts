// modules/corporate/CorporateRepository.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class CorporateRepository {
  
  async createAccount(dto: any) {
    return prisma.corporateAccount.create({
      data: {
        companyName: dto.companyName,
        registrationNumber: dto.registrationNumber,
        taxId: dto.taxId,
        contactPerson: dto.contactPerson,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        creditLimit: dto.creditLimit || 0,
        currentBalance: 0,
        paymentTerms: dto.paymentTerms || 30,
        discountPercentage: dto.discountPercentage || 0,
        isActive: true,
        insuranceProviderId: dto.insuranceProviderId
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

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

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
        take: limitNum,
        orderBy: { companyName: 'asc' }
      }),
      prisma.corporateAccount.count({ where })
    ]);

    return {
      data: accounts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    };
  }

  async updateAccount(id: string, dto: any) {
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

  async addEmployee(accountId: string, dto: any) {
    return prisma.corporateEmployee.create({
      data: {
        employeeId: dto.employeeId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        otherNames: dto.otherNames,
        dateOfBirth: dto.dateOfBirth,
        gender: dto.gender,
        phone: dto.phone,
        email: dto.email,
        department: dto.department,
        position: dto.position,
        enrollmentDate: dto.enrollmentDate || new Date(),
        isActive: true,
        accountId: accountId
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

  async updateEmployee(id: string, dto: any) {
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

    const avgUtilization = utilizationData.reduce((acc, account) => {
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

  async generateMonthlyBill(dto: any) {
    const { accountId, month, year, discountPercentage, generatedById } = dto;

    // Get corporate account
    const account = await prisma.corporateAccount.findUnique({
      where: { id: accountId },
      include: {
        employees: true
      }
    });

    if (!account) {
      throw new Error('Corporate account not found');
    }

    // Calculate date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Get employee IDs for matching
    const employeeIds = account.employees.filter(e => e.isActive).map(e => e.employeeId);

    // Find all completed attendances for corporate patients in the month
    const attendances = await prisma.attendance.findMany({
      where: {
        paymentMode: 'corporate',
        corporateAccountId: accountId,
        status: 'completed',
        dateTime: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        Patient: true,
        Bill: {
          include: {
            BillLineItem: {
              where: { isVoided: false }
            }
          }
        }
      }
    });

    // Build encounter details
    const encounters = attendances.map(attendance => {
      const bill = attendance.Bill;
      
      const items = bill?.BillLineItem.map(item => ({
        itemName: item.description,
        category: 'General',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.lineTotal
      })) || [];

      const totalAmount = items.reduce((sum, item) => sum + item.total, 0);

      return {
        attendanceId: attendance.id,
        patientName: `${attendance.Patient.surname} ${attendance.Patient.otherNames || ''}`.trim(),
        employeeId: employeeIds.find(id => 
          attendance.Patient.phone?.includes(id) || 
          attendance.Patient.email?.includes(id)
        ),
        employeeName: account.employees.find(e => e.employeeId === employeeIds.find(id => 
          attendance.Patient.phone?.includes(id) || 
          attendance.Patient.email?.includes(id)
        ))?.firstName,
        visitDate: attendance.dateTime,
        diagnosis: attendance.complaints,
        items,
        totalAmount
      };
    });

    // Calculate totals
    const subtotal = encounters.reduce((sum, enc) => sum + enc.totalAmount, 0);
    const discountPct = discountPercentage !== undefined ? discountPercentage : (account.discountPercentage || 0);
    const discountAmount = subtotal * (discountPct / 100);
    const totalAmount = subtotal - discountAmount;

    // Create Proforma Invoice for the bill
    const proformaInvoice = await prisma.proformaInvoice.create({
      data: {
        referenceNumber: `CORP-${year}-${String(month).padStart(2, '0')}-${Date.now()}`,
        patientId: accountId, // Placeholder - actual patient ID would be needed
        status: 'DRAFT',
        totalAmount: totalAmount,
        discount: discountAmount,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: generatedById,
        notes: `Monthly billing for ${month}/${year}`,
        metadata: {
          billingMonth: month,
          billingYear: year,
          encounterCount: encounters.length,
          subtotal: subtotal,
          discountPercentage: discountPct
        }
      }
    });

    return {
      accountId,
      companyName: account.companyName,
      month,
      year,
      encounters,
      subtotal,
      discountAmount,
      discountPercentage: discountPct,
      totalAmount,
      proformaInvoiceId: proformaInvoice.id,
      generatedAt: new Date()
    };
  }

  async getMonthlyBills(accountId: string, filters?: any) {
    const { page = 1, limit = 20 } = filters || {};
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [invoices, total] = await Promise.all([
      prisma.proformaInvoice.findMany({
        where: {
          corporateAccountId: accountId
        },
        include: {
          User_createdBy: {
            select: {
              fullName: true,
              username: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.proformaInvoice.count({
        where: {
          corporateAccountId: accountId
        }
      })
    ]);

    return {
      data: invoices,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    };
  }
}