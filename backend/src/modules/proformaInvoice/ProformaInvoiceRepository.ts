import { PrismaClient, ProformaInvoiceStatus } from '@prisma/client';

const prisma = new PrismaClient();

export class ProformaInvoiceRepository {
  async create(data: any) {
    return prisma.proformaInvoice.create({
      data: {
        referenceNumber: data.referenceNumber,
        patientId: data.patientId,
        attendanceId: data.attendanceId,
        admissionId: data.admissionId,
        corporateAccountId: data.corporateAccountId,
        status: data.status || 'DRAFT',
        subtotal: data.subtotal,
        discount: data.discount || 0,
        taxAmount: data.taxAmount,
        totalAmount: data.totalAmount,
        validityDays: data.validityDays || 7,
        expiresAt: data.expiresAt,
        notes: data.notes,
        termsAndConditions: data.termsAndConditions,
        createdById: data.createdById,
        items: data.items ? {
          create: data.items.map((item: any) => ({
            serviceCatalogId: item.serviceCatalogId,
            description: item.description,
            serviceType: item.serviceType,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            pricingBasis: item.pricingBasis,
            vatRate: item.vatRate || 0,
            vatAmount: item.vatAmount || 0,
            totalPrice: item.totalPrice,
            isInsuranceCovered: item.isInsuranceCovered || false,
            insuranceCoverage: item.insuranceCoverage || 0,
            patientResponsibility: item.patientResponsibility || item.totalPrice
          }))
        } : undefined,
      },
      include: {
        patient: {
          select: {
            id: true,
            folderNumber: true,
            surname: true,
            otherNames: true,
            contact: true
          }
        },
        attendance: {
          select: {
            id: true,
            attendanceNumber: true,
            dateTime: true
          }
        },
        admission: {
          select: {
            id: true,
            admissionNumber: true
          }
        },
        corporateAccount: {
          select: {
            id: true,
            companyName: true
          }
        },
        items: {
          include: {
            serviceCatalog: {
              select: {
                id: true,
                name: true,
                code: true,
                pricing: true
              }
            }
          }
        },
        createdBy: {
          select: {
            id: true,
            fullName: true,
            username: true
          }
        },
        approvedBy: {
          select: {
            id: true,
            fullName: true,
            username: true
          }
        },
        bill: true
      },
    });
  }

  async findById(id: string) {
    return prisma.proformaInvoice.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            folderNumber: true,
            surname: true,
            otherNames: true,
            contact: true
          }
        },
        attendance: {
          select: {
            id: true,
            attendanceNumber: true,
            dateTime: true
          }
        },
        admission: {
          select: {
            id: true,
            admissionNumber: true
          }
        },
        corporateAccount: {
          select: {
            id: true,
            companyName: true,
            companyCode: true
          }
        },
        items: {
          include: {
            serviceCatalog: {
              select: {
                id: true,
                name: true,
                code: true,
                pricing: true
              }
            }
          }
        },
        createdBy: {
          select: {
            id: true,
            fullName: true,
            username: true
          }
        },
        approvedBy: {
          select: {
            id: true,
            fullName: true,
            username: true
          }
        },
        bill: true
      },
    });
  }

  async findMany(filters: {
    patientId?: string;
    corporateAccountId?: string;
    status?: ProformaInvoiceStatus;
    attendanceId?: string;
    fromDate?: Date;
    toDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const {
      patientId,
      corporateAccountId,
      status,
      attendanceId,
      fromDate,
      toDate,
      page = 1,
      limit = 20,
    } = filters;

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

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.proformaInvoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: {
            select: {
              id: true,
              folderNumber: true,
              surname: true,
              otherNames: true,
              contact: true
            },
          },
          corporateAccount: {
            select: {
              id: true,
              companyName: true,
            },
          },
          items: {
            include: {
              serviceCatalog: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              fullName: true,
            }
          }
        },
      }),
      prisma.proformaInvoice.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(id: string, data: any) {
    return prisma.proformaInvoice.update({
      where: { id },
      data: {
        notes: data.notes,
        termsAndConditions: data.termsAndConditions,
        discount: data.discount,
        validityDays: data.validityDays,
        subtotal: data.subtotal,
        taxAmount: data.taxAmount,
        totalAmount: data.totalAmount,
        expiresAt: data.expiresAt,
        items: data.items ? {
          deleteMany: {},
          create: data.items.map((item: any) => ({
            serviceCatalogId: item.serviceCatalogId,
            description: item.description,
            serviceType: item.serviceType,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            pricingBasis: item.pricingBasis,
            vatRate: item.vatRate || 0,
            vatAmount: (item.unitPrice * item.quantity) * (item.vatRate || 0) / 100,
            totalPrice: item.unitPrice * item.quantity,
            isInsuranceCovered: item.isInsuranceCovered || false,
            insuranceCoverage: item.insuranceCoverage || 0,
            patientResponsibility: item.isInsuranceCovered 
              ? (item.unitPrice * item.quantity) - (item.insuranceCoverage || 0)
              : item.unitPrice * item.quantity
          }))
        } : undefined,
      },
      include: {
        patient: true,
        items: {
          include: {
            serviceCatalog: true,
          },
        },
      },
    });
  }

  async updateStatus(id: string, status: ProformaInvoiceStatus, additionalData?: any) {
    return prisma.proformaInvoice.update({
      where: { id },
      data: {
        status,
        ...additionalData,
      },
      include: {
        patient: true,
        items: true,
      },
    });
  }

  async convertToBill(id: string, billId: string) {
    return prisma.proformaInvoice.update({
      where: { id },
      data: {
        status: 'CONVERTED',
        convertedToBillId: billId,
      },
      include: {
        patient: true,
        corporateAccount: true,
      },
    });
  }

  async delete(id: string) {
    // First delete all items
    await prisma.proformaInvoiceItem.deleteMany({
      where: { proformaInvoiceId: id },
    });
    
    // Then delete the invoice
    return prisma.proformaInvoice.delete({
      where: { id },
    });
  }

  async getStatistics(filters: {
    patientId?: string;
    corporateAccountId?: string;
    status?: ProformaInvoiceStatus;
    fromDate?: Date;
    toDate?: Date;
  }) {
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
      prisma.proformaInvoice.count({ where }),
      prisma.proformaInvoice.groupBy({
        by: ['status'],
        where,
        _count: true,
        _sum: { totalAmount: true },
      }),
      prisma.proformaInvoice.aggregate({
        where,
        _sum: { totalAmount: true },
        _avg: { totalAmount: true },
      }),
      prisma.proformaInvoice.count({
        where: { ...where, status: 'CONVERTED' },
      }),
    ]);

    const conversionRate = total > 0 ? (convertedCount / total) * 100 : 0;

    return {
      total,
      byStatus: byStatus.map(s => ({
        status: s.status,
        count: s._count,
        totalAmount: s._sum.totalAmount || 0,
      })),
      totalAmount: totalAmount._sum.totalAmount || 0,
      averageAmount: totalAmount._avg.totalAmount || 0,
      convertedCount,
      conversionRate: parseFloat(conversionRate.toFixed(2)),
    };
  }

  async findByPatient(patientId: string) {
    return prisma.proformaInvoice.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      include: {
        patient: true,
        corporateAccount: true,
        items: true,
      },
    });
  }

  async findByCorporateAccount(corporateAccountId: string) {
    return prisma.proformaInvoice.findMany({
      where: { corporateAccountId },
      orderBy: { createdAt: 'desc' },
      include: {
        corporateAccount: true,
        patient: true,
        items: true,
      },
    });
  }

  async getExpiringSoon(days: number = 7) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);

    return prisma.proformaInvoice.findMany({
      where: {
        status: { in: ['SENT', 'DRAFT'] },
        expiresAt: {
          lte: expiryDate,
          gte: new Date(),
        },
      },
      include: {
        patient: true,
        corporateAccount: true,
        items: true,
      },
      orderBy: { expiresAt: 'asc' },
    });
  }
}