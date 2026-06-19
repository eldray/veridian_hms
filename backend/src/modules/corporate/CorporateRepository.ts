// modules/corporate/CorporateRepository.ts
import { PrismaClient } from '@prisma/client';
import { BaseRepository } from '../../shared/base/BaseRepository';
import { getCounterService } from '../../services/CounterService';

// ✅ Helper to safely convert Prisma Decimal objects to JS numbers
const toNumber = (val: any): number => val ? parseFloat(val.toString()) : 0;

export class CorporateRepository extends BaseRepository<any, any, any> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'corporateAccount');
  }

  async createAccount(dto: any) {
    return this.getModel().create({
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
    return this.getModel().findUnique({
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
        },
        _count: {
          select: {
            employees: true,
            bills: true,
            proformaInvoices: true
          }
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
      where.isActive = isActive === 'true' || isActive === true;
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [accounts, total] = await Promise.all([
      this.getModel().findMany({
        where,
        include: {
          insuranceProvider: true,
          _count: {
            select: {
              employees: true,
              bills: true,
              proformaInvoices: true
            }
          }
        },
        skip,
        take: limitNum,
        orderBy: { companyName: 'asc' }
      }),
      this.getModel().count({ where })
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
    return this.getModel().update({
      where: { id },
      data: dto,
      include: {
        insuranceProvider: true
      }
    });
  }

  async deactivateAccount(id: string) {
    return this.getModel().update({
      where: { id },
      data: { isActive: false }
    });
  }

  async addEmployee(accountId: string, dto: any) {
    return this.prisma.corporateEmployee.create({
      data: {
        employeeId: dto.employeeId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        otherNames: dto.otherNames,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        gender: dto.gender,
        phone: dto.phone,
        email: dto.email,
        department: dto.department,
        position: dto.position,
        enrollmentDate: dto.enrollmentDate ? new Date(dto.enrollmentDate) : new Date(),
        isActive: true,
        accountId: accountId
      }
    });
  }

  async getEmployee(id: string) {
    return this.prisma.corporateEmployee.findUnique({
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
    const updateData: any = { ...dto };
    if (dto.dateOfBirth) updateData.dateOfBirth = new Date(dto.dateOfBirth);
    if (dto.enrollmentDate) updateData.enrollmentDate = new Date(dto.enrollmentDate);
    if (dto.endDate) updateData.endDate = new Date(dto.endDate);

    return this.prisma.corporateEmployee.update({
      where: { id },
      data: updateData
    });
  }

  async removeEmployee(id: string) {
    return this.prisma.corporateEmployee.update({
      where: { id },
      data: {
        isActive: false,
        endDate: new Date()
      }
    });
  }

  async getEmployees(accountId: string) {
    return this.prisma.corporateEmployee.findMany({
      where: {
        accountId,
        isActive: true
      },
      orderBy: { lastName: 'asc' }
    });
  }

  // ✅ FIXED: Decimal math for statistics
  async getStatistics() {
    const [
      totalAccounts,
      activeAccounts,
      totalEmployees,
      activeEmployees,
      totalOutstanding,
      accountsWithDebt
    ] = await Promise.all([
      this.getModel().count(),
      this.getModel().count({ where: { isActive: true } }),
      this.prisma.corporateEmployee.count(),
      this.prisma.corporateEmployee.count({ where: { isActive: true } }),
      this.getModel().aggregate({
        _sum: { currentBalance: true }
      }),
      this.getModel().count({
        where: { currentBalance: { gt: 0 } }
      })
    ]);

    const utilizationData = await this.getModel().findMany({
      where: { creditLimit: { gt: 0 } },
      select: {
        creditLimit: true,
        currentBalance: true
      }
    });

    // ✅ FIXED: Use toNumber() for Decimal math
    const avgUtilization = utilizationData.reduce((acc: number, account: any) => {
      const limit = toNumber(account.creditLimit);
      const balance = toNumber(account.currentBalance);
      if (limit > 0) {
        return acc + (balance / limit);
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
      totalOutstanding: toNumber(totalOutstanding._sum.currentBalance), // ✅ FIXED
      accountsWithDebt,
      averageCreditUtilization: Math.round(avgUtilization * 100)
    };
  }

  // ✅ FIXED: Complete rewrite of monthly bill generation
  async generateMonthlyBill(dto: any) {
    const { accountId, month, year, discountPercentage, generatedById } = dto;

    // Get corporate account
    const account = await this.getModel().findUnique({
      where: { id: accountId },
      include: { employees: true }
    });

    if (!account) {
      throw new Error('Corporate account not found');
    }

    // Calculate date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Build employee lookup map for reliable matching
    // ✅ FIXED: Use email for matching (most reliable), fallback to employeeId in notes
    const employeeMap = new Map<string, any>();
    for (const emp of account.employees.filter((e: any) => e.isActive)) {
      if (emp.email) employeeMap.set(emp.email.toLowerCase(), emp);
      employeeMap.set(emp.employeeId, emp); // Also map by employee ID
    }

    // Find all attendances for this corporate account in the month
    const attendances = await this.prisma.attendance.findMany({
      where: {
        corporateAccountId: accountId,
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
        },
        AttendanceDiagnosis: {
          include: { Diagnosis: true }
        }
      },
      orderBy: { dateTime: 'asc' }
    });

    // Group encounters by patient
    const encountersByPatient = new Map<string, any[]>();
    for (const att of attendances) {
      if (!encountersByPatient.has(att.patientId)) {
        encountersByPatient.set(att.patientId, []);
      }
      encountersByPatient.get(att.patientId)!.push(att);
    }

    // ✅ FIXED: Create individual proforma invoices per patient
    const proformaInvoices: any[] = [];
    const allEncounters: any[] = [];
    let grandSubtotal = 0;
    let grandDiscount = 0;
    let grandTotal = 0;
    const discountPct = discountPercentage !== undefined 
      ? Number(discountPercentage) 
      : toNumber(account.discountPercentage);

    for (const [patientId, patientAttendances] of encountersByPatient) {
      const patient = patientAttendances[0].Patient;
      if (!patient) continue;

      // Build encounter details for this patient
      const patientEncounters = patientAttendances.map(att => {
        const bill = att.Bill;
        // ✅ FIXED: Use toNumber() for all Decimal fields
        const items = (bill?.BillLineItem || []).map(item => ({
          itemName: item.description,
          category: item.serviceType || 'General',
          quantity: item.quantity,
          unitPrice: toNumber(item.unitPrice),
          total: toNumber(item.lineTotal)
        }));

        const totalAmount = items.reduce((sum: number, item: any) => sum + item.total, 0);

        // ✅ FIXED: Reliable employee matching using email or employee ID
        let matchedEmployee: any = null;
        if (patient.email) {
          matchedEmployee = employeeMap.get(patient.email.toLowerCase());
        }
        if (!matchedEmployee && patient.contact) {
          // Try matching by employeeId stored in contact field
          matchedEmployee = employeeMap.get(patient.contact);
        }

        const diagnoses = (att.AttendanceDiagnosis || [])
          .map((d: any) => d.Diagnosis?.name)
          .filter(Boolean)
          .join(', ');

        return {
          attendanceId: att.id,
          patientName: `${patient.surname} ${patient.otherNames || ''}`.trim(),
          employeeId: matchedEmployee?.employeeId || null,
          employeeName: matchedEmployee ? `${matchedEmployee.firstName} ${matchedEmployee.lastName}` : null,
          visitDate: att.dateTime,
          diagnosis: diagnoses || att.medicalNotes || null,
          items,
          totalAmount
        };
      });

      // Calculate patient totals
      // ✅ FIXED: All math uses toNumber()
      const subtotal = patientEncounters.reduce((sum: number, enc: any) => sum + enc.totalAmount, 0);
      const discountAmount = subtotal * (discountPct / 100);
      const totalAmount = subtotal - discountAmount;

      grandSubtotal += subtotal;
      grandDiscount += discountAmount;
      grandTotal += totalAmount;

      // ✅ FIXED: Create proforma invoice with correct patientId AND corporateAccountId
      const counterService = getCounterService();
      const refNumber = `CORP-${year}-${String(month).padStart(2, '0')}-${counterService.nextProformaNumber()}`;

      const proforma = await this.prisma.proformaInvoice.create({
        data: {
          referenceNumber: refNumber,
          patientId: patient.id,           // ✅ FIXED: Actual patient ID
          corporateAccountId: accountId,   // ✅ FIXED: Corporate account link
          status: 'DRAFT',
          subtotal,
          discount: discountAmount,
          taxAmount: 0,
          totalAmount,
          validityDays: account.paymentTerms || 30,
          notes: `Monthly corporate billing for ${patient.surname} ${patient.otherNames || ''} - ${month}/${year}`,
          termsAndConditions: `Payment terms: ${account.paymentTerms || 30} days. Discount: ${discountPct}%`,
          createdById: generatedById,
          items: {
            create: patientEncounters.flatMap((enc: any) => 
              enc.items.map((item: any) => ({
                description: `${item.itemName} - Visit on ${new Date(enc.visitDate).toLocaleDateString()}`,
                serviceType: item.category === 'General' ? 'miscellaneous' : item.category.toLowerCase(),
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                pricingBasis: 'corporate',
                vatRate: 0,
                vatAmount: 0,
                totalPrice: item.total,
                isInsuranceCovered: false,
                insuranceCoverage: 0,
                patientResponsibility: item.total
              }))
            )
          }
        }
      });

      proformaInvoices.push(proforma);
      allEncounters.push(...patientEncounters);
    }

    return {
      accountId,
      companyName: account.companyName,
      month,
      year,
      period: { startDate, endDate },
      encounters: allEncounters,
      proformaInvoices: proformaInvoices.map(p => ({
        id: p.id,
        referenceNumber: p.referenceNumber,
        patientId: p.patientId,
        totalAmount: toNumber(p.totalAmount)
      })),
      subtotal: grandSubtotal,
      discountAmount: grandDiscount,
      discountPercentage: discountPct,
      totalAmount: grandTotal,
      totalPatients: encountersByPatient.size,
      totalEncounters: attendances.length,
      generatedAt: new Date()
    };
  }

  async getMonthlyBills(accountId: string, filters?: any) {
    const { page = 1, limit = 20 } = filters || {};
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [invoices, total] = await Promise.all([
      this.prisma.proformaInvoice.findMany({
        where: {
          corporateAccountId: accountId
        },
        include: {
          Patient: {
            select: {
              surname: true,
              otherNames: true,
              folderNumber: true
            }
          },
          // ✅ FIXED: Use correct relation name from schema
          User_proformaInvoicesCreated: {
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
      this.prisma.proformaInvoice.count({
        where: { corporateAccountId: accountId }
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