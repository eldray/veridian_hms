import { PrismaClient } from '@prisma/client';
import { BaseRepository } from '../../shared/base/BaseRepository';
import { TransferQueryParams } from './StockTransferTypes';

export class StockTransferRepository extends BaseRepository<any, any, any> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'stockTransfer');
  }

  async findAll(filters: TransferQueryParams) {
    const { originId, destinationId, status, page = 1, limit = 1000 } = filters;
    const where: any = {};
    if (originId) where.originId = originId;
    if (destinationId) where.destinationId = destinationId;
    if (status) where.status = status;

    return this.findManyWithPagination({
      where, page, limit: Math.min(limit, 1000), orderBy: { createdAt: 'desc' },
      include: {
        origin: { select: { id: true, name: true } },
        destination: { select: { id: true, name: true } },
        requestedBy: { select: { id: true, fullName: true } },
        approvedBy: { select: { id: true, fullName: true } },
        items: { include: { stockItem: { select: { id: true, name: true, drugCode: true } } } }
      }
    });
  }

  async findByIdWithDetails(id: string) {
    return this.getModel().findUnique({
      where: { id },
      include: {
        origin: { select: { id: true, name: true } },
        destination: { select: { id: true, name: true } },
        requestedBy: { select: { id: true, fullName: true } },
        approvedBy: { select: { id: true, fullName: true } },
        items: { include: { stockItem: { select: { id: true, name: true, drugCode: true, unitOfMeasure: true } } } }
      }
    });
  }

  async createTransfer(data: any, userId: string, transferNumber: string) {
    return this.getModel().create({
      data: {
        transferNumber,
        originId: data.originId,
        destinationId: data.destinationId,
        status: 'requested',
        requestedById: userId,
        notes: data.notes,
        items: {
          create: data.items.map((i: any) => ({
            stockItemId: i.stockItemId,
            quantityRequested: i.quantityRequested
          }))
        }
      },
      include: { items: true, origin: true, destination: true }
    });
  }

  // ✅ CRITICAL: Gets batches from a specific department, sorted by Expiry Date (FEFO)
  async getBatchesByDepartment(stockItemId: string, departmentId: string, tx?: any) {
    const client = tx || this.prisma;
    return client.stockBatch.findMany({
      where: { stockItemId, departmentId, quantity: { gt: 0 } },
      orderBy: { expiryDate: 'asc' } // First Expiry, First Out!
    });
  }
}