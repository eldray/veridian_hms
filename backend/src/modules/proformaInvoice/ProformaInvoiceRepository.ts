import { PrismaClient, ProformaStatus } from '@prisma/client';
import { BaseRepository } from '../../utils/baseRepository';

const prisma = new PrismaClient();

export class ProformaInvoiceRepository extends BaseRepository {
  constructor() {
    super('ProformaInvoice');
  }

  async create(data: any) {
    return prisma.proformaInvoice.create({
      data: {
        ...data,
        items: data.items ? {
          create: data.items.map((item: any) => ({
            serviceCatalogId: item.serviceCatalogId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            notes: item.notes,
          }))
        } : undefined,
      },
      include: {
        patient: true,
        account: true,
        encounter: true,
        items: {
          include: {
            serviceCatalog: true,
          },
        },
      },
    });
  }

  async findById(id: string) {
    return prisma.proformaInvoice.findUnique({
      where: { id },
      include: {
        patient: true,
        account: true,
        encounter: true,
        items: {
          include: {
            serviceCatalog: true,
          },
        },
      },
    });
  }

  async findMany(filters: {
    patientId?: string;
    accountId?: string;
    status?: ProformaStatus;
    encounterId?: string;
    fromDate?: Date;
    toDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const {
      patientId,
      accountId,
      status,
      encounterId,
      fromDate,
      toDate,
      page = 1,
      limit = 20,
    } = filters;

    const where: any = {};

    if (patientId) where.patientId = patientId;
    if (accountId) where.accountId = accountId;
    if (status) where.status = status;
    if (encounterId) where.encounterId = encounterId;
    
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
              firstName: true,
              lastName: true,
              otherNames: true,
              phone: true,
              email: true,
            },
          },
          account: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          items: {
            include: {
              serviceCatalog: true,
            },
          },
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
        ...data,
        items: data.items ? {
          deleteMany: {},
          create: data.items.map((item: any) => ({
            serviceCatalogId: item.serviceCatalogId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            notes: item.notes,
          }))
        } : undefined,
      },
      include: {
        patient: true,
        account: true,
        encounter: true,
        items: {
          include: {
            serviceCatalog: true,
          },
        },
      },
    });
  }

  async updateStatus(id: string, status: ProformaStatus, additionalData?: any) {
    return prisma.proformaInvoice.update({
      where: { id },
      data: {
        status,
        ...additionalData,
      },
      include: {
        patient: true,
        account: true,
        items: true,
      },
    });
  }

  async convertToBill(id: string, billId: string) {
    return prisma.proformaInvoice.update({
      where: { id },
      data: {
        status: ProformaStatus.CONVERTED,
        convertedToBillId: billId,
        convertedAt: new Date(),
      },
      include: {
        patient: true,
        account: true,
      },
    });
  }

  async delete(id: string) {
    return prisma.proformaInvoice.delete({
      where: { id },
    });
  }

  async getStatistics(filters: {
    patientId?: string;
    accountId?: string;
    status?: ProformaStatus;
    fromDate?: Date;
    toDate?: Date;
  }) {
    const { patientId, accountId, status, fromDate, toDate } = filters;

    const where: any = {};

    if (patientId) where.patientId = patientId;
    if (accountId) where.accountId = accountId;
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
        where: { ...where, status: ProformaStatus.CONVERTED },
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
        account: true,
        items: true,
      },
    });
  }

  async findByAccount(accountId: string) {
    return prisma.proformaInvoice.findMany({
      where: { accountId },
      orderBy: { createdAt: 'desc' },
      include: {
        account: true,
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
        status: { in: [ProformaStatus.SENT, ProformaStatus.DRAFT] },
        validUntil: {
          lte: expiryDate,
          gte: new Date(),
        },
      },
      include: {
        patient: true,
        account: true,
        items: true,
      },
      orderBy: { validUntil: 'asc' },
    });
  }
}
