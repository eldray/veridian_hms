import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface WaiverFilters {
  billId?: string;
  patientId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export class WaiverService {
  // Create a new waiver request
  async create(data: any) {
    const { billId, patientId, amount, reason, requestedBy, notes } = data;

    // Validate required fields
    if (!billId || !amount || !reason || !requestedBy) {
      throw new Error('Bill ID, amount, reason, and requested by are required');
    }

    // Get bill to verify it exists
    const bill = await prisma.bill.findUnique({
      where: { id: billId },
      include: { patient: true }
    });

    if (!bill) {
      throw new Error('Bill not found');
    }

    // If patientId not provided, use bill's patientId
    const finalPatientId = patientId || bill.patientId;

    // Create waiver request
    const waiver = await prisma.waiver.create({
      data: {
        billId,
        patientId: finalPatientId,
        amount: parseFloat(amount),
        reason,
        requestedBy,
        notes,
        status: 'PENDING'
      },
      include: {
        bill: true,
        patient: true
      }
    });

    return waiver;
  }

  // Get all waivers with filters
  async getAll(filters: WaiverFilters) {
    const { billId, patientId, status, startDate, endDate, page = 1, limit = 50 } = filters;

    const where: any = {};

    if (billId) where.billId = billId;
    if (patientId) where.patientId = patientId;
    if (status) where.status = status;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [waivers, total] = await Promise.all([
      prisma.waiver.findMany({
        where,
        include: {
          bill: true,
          patient: true,
          requestedByUser: true,
          approvedByUser: true
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.waiver.count({ where })
    ]);

    return {
      waivers,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalCount: total,
        limit
      }
    };
  }

  // Get waiver by ID
  async getById(id: string) {
    const waiver = await prisma.waiver.findUnique({
      where: { id },
      include: {
        bill: true,
        patient: true,
        requestedByUser: true,
        approvedByUser: true
      }
    });

    if (!waiver) {
      throw new Error('Waiver not found');
    }

    return waiver;
  }

  // Approve waiver
  async approve(id: string, approvedBy: string, notes?: string) {
    const waiver = await prisma.waiver.findUnique({
      where: { id }
    });

    if (!waiver) {
      throw new Error('Waiver not found');
    }

    if (waiver.status !== 'PENDING') {
      throw new Error(`Waiver is already ${waiver.status}`);
    }

    const updatedWaiver = await prisma.waiver.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy,
        approvedAt: new Date(),
        approvalNotes: notes
      },
      include: {
        bill: true,
        patient: true,
        requestedByUser: true,
        approvedByUser: true
      }
    });

    // Update bill to reflect waiver
    if (waiver.billId) {
      await prisma.bill.update({
        where: { id: waiver.billId },
        data: {
          waivedAmount: {
            increment: waiver.amount
          }
        }
      });
    }

    return updatedWaiver;
  }

  // Reject waiver
  async reject(id: string, rejectedBy: string, notes?: string) {
    const waiver = await prisma.waiver.findUnique({
      where: { id }
    });

    if (!waiver) {
      throw new Error('Waiver not found');
    }

    if (waiver.status !== 'PENDING') {
      throw new Error(`Waiver is already ${waiver.status}`);
    }

    return await prisma.waiver.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedBy,
        rejectedAt: new Date(),
        rejectionNotes: notes
      },
      include: {
        bill: true,
        patient: true,
        requestedByUser: true,
        approvedByUser: true
      }
    });
  }

  // Get waiver statistics
  async getStatistics(filters: { startDate?: string; endDate?: string }) {
    const { startDate, endDate } = filters;

    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [totalWaivers, pendingWaivers, approvedWaivers, rejectedWaivers, totalAmount, approvedAmount] = await Promise.all([
      prisma.waiver.count({ where }),
      prisma.waiver.count({ where: { ...where, status: 'PENDING' } }),
      prisma.waiver.count({ where: { ...where, status: 'APPROVED' } }),
      prisma.waiver.count({ where: { ...where, status: 'REJECTED' } }),
      prisma.waiver.aggregate({
        where,
        _sum: { amount: true }
      }),
      prisma.waiver.aggregate({
        where: { ...where, status: 'APPROVED' },
        _sum: { amount: true }
      })
    ]);

    return {
      totalWaivers,
      pendingWaivers,
      approvedWaivers,
      rejectedWaivers,
      totalAmount: totalAmount._sum.amount || 0,
      approvedAmount: approvedAmount._sum.amount || 0,
      averageWaiver: totalWaivers > 0 ? (totalAmount._sum.amount || 0) / totalWaivers : 0
    };
  }

  // Get waivers by bill
  async getByBillId(billId: string) {
    const waivers = await prisma.waiver.findMany({
      where: { billId },
      include: {
        bill: true,
        patient: true,
        requestedByUser: true,
        approvedByUser: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return waivers;
  }

  // Get waivers by patient
  async getByPatientId(patientId: string) {
    const waivers = await prisma.waiver.findMany({
      where: { patientId },
      include: {
        bill: true,
        patient: true,
        requestedByUser: true,
        approvedByUser: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return waivers;
  }

  // Update waiver (only for pending waivers)
  async update(id: string, data: any) {
    const waiver = await prisma.waiver.findUnique({
      where: { id }
    });

    if (!waiver) {
      throw new Error('Waiver not found');
    }

    if (waiver.status !== 'PENDING') {
      throw new Error('Only pending waivers can be updated');
    }

    const { amount, reason, notes } = data;

    return await prisma.waiver.update({
      where: { id },
      data: {
        amount: amount ? parseFloat(amount) : undefined,
        reason,
        notes
      },
      include: {
        bill: true,
        patient: true,
        requestedByUser: true,
        approvedByUser: true
      }
    });
  }

  // Delete waiver (only for pending waivers)
  async delete(id: string) {
    const waiver = await prisma.waiver.findUnique({
      where: { id }
    });

    if (!waiver) {
      throw new Error('Waiver not found');
    }

    if (waiver.status !== 'PENDING') {
      throw new Error('Only pending waivers can be deleted');
    }

    await prisma.waiver.delete({
      where: { id }
    });
  }
}

export const waiverService = new WaiverService();
