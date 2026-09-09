import { PrismaClient, ProformaInvoiceStatus } from '@prisma/client';
import { BaseRepository } from '../../shared/base/BaseRepository';

export class ProformaInvoiceRepository extends BaseRepository<any, any, any> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'proformaInvoice');
  }

  // NOTE: Prisma relation field names on ProformaInvoice are PascalCase
  // (Patient, Attendance, CorporateAccount, Bill, User_createdBy, User_approvedBy).
  private getBaseInclude() {
    return {
      Patient: { select: { id: true, folderNumber: true, surname: true, otherNames: true, contact: true } },
      Attendance: { select: { id: true, attendanceNumber: true, dateTime: true } },
      admission: { select: { id: true, admissionNumber: true } },
      CorporateAccount: { select: { id: true, companyName: true, companyCode: true } },
      items: {
        include: {
          serviceCatalog: {
            select: {
              id: true, name: true, code: true,
              // ✅ FIXED: Fetch only active pricing for 1-to-N relationship
              pricing: { where: { isActive: true }, take: 1, orderBy: { effectiveDate: 'desc' as const } }
            }
          }
        }
      },
      User_createdBy: { select: { id: true, fullName: true, username: true } },
      User_approvedBy: { select: { id: true, fullName: true, username: true } },
      Bill: true
    };
  }

  // Map Prisma's PascalCase relation keys to the camelCase shape the API/clients expect.
  private normalize(p: any): any {
    if (!p) return p;
    const { Patient, Attendance, CorporateAccount, Bill, User_createdBy, User_approvedBy, ...rest } = p;
    return {
      ...rest,
      ...(Patient !== undefined ? { patient: Patient } : {}),
      ...(Attendance !== undefined ? { attendance: Attendance } : {}),
      ...(CorporateAccount !== undefined ? { corporateAccount: CorporateAccount } : {}),
      ...(Bill !== undefined ? { bill: Bill } : {}),
      ...(User_createdBy !== undefined ? { createdBy: User_createdBy } : {}),
      ...(User_approvedBy !== undefined ? { approvedBy: User_approvedBy } : {}),
    };
  }

  // ✅ FIXED: Wrapped in transaction to prevent orphaned invoices
  async create(data: any) {
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.proformaInvoice.create({
        data: {
          referenceNumber: data.referenceNumber, patientId: data.patientId, attendanceId: data.attendanceId,
          admissionId: data.admissionId, corporateAccountId: data.corporateAccountId, status: data.status || 'DRAFT',
          subtotal: data.subtotal, discount: data.discount || 0, taxAmount: data.taxAmount, totalAmount: data.totalAmount,
          validityDays: data.validityDays || 7, expiresAt: data.expiresAt, notes: data.notes,
          termsAndConditions: data.termsAndConditions, createdById: data.createdById
        }
      });

      if (data.items && data.items.length > 0) {
        await tx.proformaInvoiceItem.createMany({
          data: data.items.map((item: any) => ({
            proformaInvoiceId: invoice.id, serviceCatalogId: item.serviceCatalogId, description: item.description,
            serviceType: item.serviceType, quantity: item.quantity, unitPrice: item.unitPrice, pricingBasis: item.pricingBasis,
            vatRate: item.vatRate || 0, vatAmount: item.vatAmount || 0, totalPrice: item.totalPrice,
            isInsuranceCovered: item.isInsuranceCovered || false, insuranceCoverage: item.insuranceCoverage || 0,
            patientResponsibility: item.patientResponsibility || item.totalPrice
          }))
        });
      }

      const created = await tx.proformaInvoice.findUnique({ where: { id: invoice.id }, include: this.getBaseInclude() });
      return this.normalize(created);
    });
  }

  async findById(id: string) {
    const found = await this.getModel().findUnique({ where: { id }, include: this.getBaseInclude() });
    return this.normalize(found);
  }

  async findManyInvoices(filters: any) {
    const { patientId, corporateAccountId, status, attendanceId, fromDate, toDate, page = 1, limit = 20 } = filters;
    const where: any = {};

    if (patientId) where.patientId = patientId;
    if (corporateAccountId) where.corporateAccountId = corporateAccountId;
    if (status) where.status = status;
    if (attendanceId) where.attendanceId = attendanceId;
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = fromDate;
      if (toDate) where.createdAt.lte = toDate;
    }

    const [items, total] = await Promise.all([
      this.getModel().findMany({
        where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' },
        include: {
          Patient: { select: { id: true, folderNumber: true, surname: true, otherNames: true, contact: true } },
          CorporateAccount: { select: { id: true, companyName: true } },
          items: { include: { serviceCatalog: true } },
          User_createdBy: { select: { id: true, fullName: true } }
        }
      }),
      this.getModel().count({ where })
    ]);

    return { items: items.map((i: any) => this.normalize(i)), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ✅ FIXED: Wrapped in transaction for safe item replacement
  async update(id: string, data: any) {
    return this.prisma.$transaction(async (tx) => {
      if (data.items) {
        await tx.proformaInvoiceItem.deleteMany({ where: { proformaInvoiceId: id } });
        await tx.proformaInvoiceItem.createMany({
          data: data.items.map((item: any) => ({
            proformaInvoiceId: id, serviceCatalogId: item.serviceCatalogId, description: item.description,
            serviceType: item.serviceType, quantity: item.quantity, unitPrice: item.unitPrice, pricingBasis: item.pricingBasis,
            vatRate: item.vatRate || 0, vatAmount: item.vatAmount || 0, totalPrice: item.totalPrice,
            isInsuranceCovered: item.isInsuranceCovered || false, insuranceCoverage: item.insuranceCoverage || 0,
            patientResponsibility: item.patientResponsibility || item.totalPrice
          }))
        });
        delete data.items;
      }

      const updated = await tx.proformaInvoice.update({
        where: { id }, data: { ...data, updatedAt: new Date() },
        include: { Patient: true, items: { include: { serviceCatalog: true } } }
      });
      return this.normalize(updated);
    });
  }

  async updateStatus(id: string, status: ProformaInvoiceStatus, additionalData?: any) {
    const updated = await this.getModel().update({ where: { id }, data: { status, ...additionalData }, include: { Patient: true, items: true } });
    return this.normalize(updated);
  }

  async convertToBill(id: string, billId: string) {
    const updated = await this.getModel().update({
      where: { id }, data: { status: 'CONVERTED', convertedToBillId: billId },
      include: { Patient: true, CorporateAccount: true }
    });
    return this.normalize(updated);
  }

  // ✅ FIXED: Wrapped in transaction to prevent orphaned items
  async delete(id: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.proformaInvoiceItem.deleteMany({ where: { proformaInvoiceId: id } });
      return tx.proformaInvoice.delete({ where: { id } });
    });
  }

  async getStatistics(filters: any) {
    const { patientId, corporateAccountId, status, fromDate, toDate } = filters;
    const where: any = {};

    if (patientId) where.patientId = patientId;
    if (corporateAccountId) where.corporateAccountId = corporateAccountId;
    if (status) where.status = status;
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = fromDate;
      if (toDate) where.createdAt.lte = toDate;
    }

    const [total, byStatus, totalAmount, convertedCount] = await Promise.all([
      this.getModel().count({ where }),
      this.getModel().groupBy({ by: ['status'], where, _count: true, _sum: { totalAmount: true } }),
      this.getModel().aggregate({ where, _sum: { totalAmount: true }, _avg: { totalAmount: true } }),
      this.getModel().count({ where: { ...where, status: 'CONVERTED' } })
    ]);

    return {
      total,
      byStatus: byStatus.map(s => ({ status: s.status, count: s._count, totalAmount: s._sum.totalAmount || 0 })),
      totalAmount: totalAmount._sum.totalAmount || 0,
      averageAmount: totalAmount._avg.totalAmount || 0,
      convertedCount,
      conversionRate: total > 0 ? parseFloat(((convertedCount / total) * 100).toFixed(2)) : 0
    };
  }

  async findByPatient(patientId: string) {
    const rows = await this.getModel().findMany({ where: { patientId }, orderBy: { createdAt: 'desc' }, include: { Patient: true, CorporateAccount: true, items: true } });
    return rows.map((r: any) => this.normalize(r));
  }

  async findByCorporateAccount(corporateAccountId: string) {
    const rows = await this.getModel().findMany({ where: { corporateAccountId }, orderBy: { createdAt: 'desc' }, include: { CorporateAccount: true, Patient: true, items: true } });
    return rows.map((r: any) => this.normalize(r));
  }

  async getExpiringSoon(days: number = 7) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);

    const rows = await this.getModel().findMany({
      where: { status: { in: ['SENT', 'DRAFT'] }, expiresAt: { lte: expiryDate, gte: new Date() } },
      include: { Patient: true, CorporateAccount: true, items: true }, orderBy: { expiresAt: 'asc' }
    });
    return rows.map((r: any) => this.normalize(r));
  }
}