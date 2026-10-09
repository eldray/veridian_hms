// RequisitionRepository.ts - Data access layer for requisition module
import { PrismaClient, Prisma } from '@prisma/client';
import {
  RequisitionQueryParams,
  CreateRequisitionDTO,
  UpdateRequisitionDTO,
  ApproveRequisitionItemsDTO,
  StockLookupParams,
  StockLookupItem
} from './RequisitionTypes';

export class RequisitionRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * The schema calls these relations requestedBy / approvedBy / fulfilledBy, but the screens
   * (RequisitionManagement) read the older names below. Return both, so nothing else has to change.
   */
  private legacyKeys = <T>(r: T): T => {
    if (!r) return r;
    const src: any = r;
    const out: any = { ...src };
    if ('requestedBy' in src) out.User_Requisition_requestedByIdToUser = src.requestedBy;
    if ('approvedBy' in src) out.User_Requisition_approvedByIdToUser = src.approvedBy;
    if ('fulfilledBy' in src) out.User_Requisition_fulfilledByIdToUser = src.fulfilledBy;
    return out;
  };

  async findAll(params: RequisitionQueryParams) {
    const { departmentId, wardId, supplyingDepartmentId, status, urgency, page = 1, limit = 1000 } = params;

    const where: Prisma.RequisitionWhereInput = {};

    if (departmentId) where.requestingDepartmentId = departmentId;
    if (wardId) where.requestingWardId = wardId;
    if (supplyingDepartmentId) where.supplyingDepartmentId = supplyingDepartmentId;
    if (status) where.status = status as any;
    if (urgency) where.urgency = urgency as any;

    const skip = (page - 1) * limit;

    const [requisitions, total] = await Promise.all([
      this.prisma.requisition.findMany({
        where,
        include: {
          departments: {
            select: { name: true, id: true }
          },
          supplyingDepartment: {
            select: { name: true, id: true }
          },
          ward: {
            select: { wardName: true, id: true }
          },
          requestedBy: {
            select: { fullName: true, role: true, id: true }
          },
          approvedBy: {
            select: { fullName: true, role: true }
          },
          fulfilledBy: {
            select: { fullName: true, role: true }
          },
          RequisitionItem: {
            include: {
              StockItem: {
                select: {
                  id: true,
                  name: true,
                  drugCode: true,
                  unitOfMeasure: true,
                  currentStock: true,
                  reorderLevel: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.requisition.count({ where })
    ]);

    return { requisitions: requisitions.map(this.legacyKeys), total };
  }

  async findById(id: string) {
    const result = await this.prisma.requisition.findUnique({
      where: { id },
      include: {
        departments: {
          select: { name: true, id: true }
        },
        supplyingDepartment: {
          select: { name: true, id: true }
        },
        ward: {
          select: { wardName: true, id: true }
        },
        requestedBy: {
          select: { fullName: true, role: true, username: true }
        },
        approvedBy: {
          select: { fullName: true, role: true }
        },
        fulfilledBy: {
          select: { fullName: true, role: true }
        },
        RequisitionItem: {
          include: {
            StockItem: {
              select: {
                id: true,
                name: true,
                drugCode: true,
                unitOfMeasure: true,
                currentStock: true,
                reorderLevel: true,
                costPrice: true
              }
            }
          }
        }
      }
    });
    return this.legacyKeys(result) as typeof result;
  }

  async create(data: CreateRequisitionDTO, requestedById: string, requisitionNumber: string) {
    const result = await this.prisma.requisition.create({
      data: {
        requisitionNumber,
        requestingDepartmentId: data.requestingDepartmentId || null,
        requestingWardId: data.requestingWardId || null,
        supplyingDepartmentId: data.supplyingDepartmentId || null,
        purpose: data.purpose || null,
        urgency: data.urgency,
        requiredDate: data.requiredDate ? new Date(data.requiredDate) : null,
        notes: data.notes || null,
        requestedById,
        status: 'draft',
        RequisitionItem: {
          create: data.requisitionItems.map((item) => ({
            stockItemId: item.stockItemId,
            quantityRequested: item.quantityRequested,
            purpose: item.purpose || null,
            notes: item.notes || null
          }))
        }
      },
      include: {
        RequisitionItem: {
          include: {
            StockItem: {
              select: {
                name: true,
                drugCode: true,
                unitOfMeasure: true
              }
            }
          }
        },
        departments: {
          select: { name: true }
        },
        supplyingDepartment: {
          select: { name: true }
        },
        ward: {
          select: { wardName: true }
        },
        requestedBy: {
          select: { fullName: true }
        }
      }
    });
    return this.legacyKeys(result) as typeof result;
  }

  async updateStatus(
    id: string,
    status: string,
    userId: string | undefined,
    notes?: string
  ) {
    const updateData: Prisma.RequisitionUncheckedUpdateInput = {
      status: status as any,
      updatedAt: new Date()
    };

    if (status === 'approved') {
      updateData.approvedById = userId;
      updateData.approvedAt = new Date();
    } else if (status === 'fulfilled') {
      updateData.fulfilledById = userId;
      updateData.fulfilledAt = new Date();
    }

    if (notes) {
      updateData.notes = notes;
    }

    const result = await this.prisma.requisition.update({
      where: { id },
      data: updateData,
      include: {
        departments: {
          select: { name: true }
        },
        ward: {
          select: { wardName: true }
        },
        requestedBy: {
          select: { fullName: true }
        },
        approvedBy: {
          select: { fullName: true }
        },
        RequisitionItem: {
          include: {
            StockItem: {
              select: {
                name: true,
                drugCode: true,
                unitOfMeasure: true
              }
            }
          }
        }
      }
    });
    return this.legacyKeys(result) as typeof result;
  }

  async delete(id: string) {
    await this.prisma.requisitionItem.deleteMany({
      where: { requisitionId: id }
    });

    return this.prisma.requisition.delete({
      where: { id }
    });
  }

  async approveItems(
    id: string,
    approvedItems: ApproveRequisitionItemsDTO['approvedItems'],
    userId: string | undefined
  ) {
    return this.prisma.$transaction(async (tx) => {
      const requisition = await tx.requisition.findUnique({
        where: { id }
      });

      if (!requisition) {
        throw new Error('Requisition not found');
      }

      if (requisition.status !== 'submitted') {
        throw new Error('Only submitted requisitions can be approved');
      }

      for (const item of approvedItems) {
        await tx.requisitionItem.update({
          where: { id: item.requisitionItemId },
          data: {
            quantityApproved: item.quantityApproved,
            notes: item.notes || null
          }
        });
      }

      const updatedRequisition = await tx.requisition.update({
        where: { id },
        data: {
          status: 'approved',
          approvedById: userId,
          approvedAt: new Date()
        },
        include: {
          RequisitionItem: {
            include: {
              StockItem: {
                select: {
                  name: true,
                  drugCode: true,
                  unitOfMeasure: true
                }
              }
            }
          }
        }
      });

      return updatedRequisition;
    });
  }

  async update(id: string, data: UpdateRequisitionDTO, existingRequisition: any) {
    return this.prisma.requisition.update({
      where: { id },
      data: {
        purpose: data.purpose !== undefined ? data.purpose : existingRequisition.purpose,
        urgency: data.urgency || existingRequisition.urgency,
        notes: data.notes !== undefined ? data.notes : existingRequisition.notes,
        updatedAt: new Date()
      },
      include: {
        departments: {
          select: { name: true }
        },
        ward: {
          select: { wardName: true }
        },
        RequisitionItem: {
          include: {
            StockItem: {
              select: {
                name: true,
                drugCode: true,
                unitOfMeasure: true
              }
            }
          }
        }
      }
    });
  }

  async count(): Promise<number> {
    return this.prisma.requisition.count();
  }

  // ==========================================================
  // DEPARTMENT STOCK (batches are the per-department ledger)
  // ==========================================================

  /** Usable (non-expired, active) quantity per item held by one department. */
  async getDepartmentQuantities(departmentId: string, stockItemIds: string[], tx?: Prisma.TransactionClient): Promise<Map<string, number>> {
    const client = tx || this.prisma;
    const result = new Map<string, number>();
    if (!departmentId || stockItemIds.length === 0) return result;
    const rows = await client.stockBatch.groupBy({
      by: ['stockItemId'],
      where: {
        departmentId,
        stockItemId: { in: stockItemIds },
        isActive: true,
        quantity: { gt: 0 },
        expiryDate: { gt: new Date() }
      },
      _sum: { quantity: true }
    });
    rows.forEach(r => result.set(r.stockItemId, r._sum.quantity ?? 0));
    return result;
  }

  /** Search-as-you-type lookup used by the requisition form. */
  async stockLookup(params: StockLookupParams): Promise<StockLookupItem[]> {
    const { supplierDepartmentId, requesterDepartmentId, q, limit = 25, inStockOnly = false } = params;
    const term = (q || '').trim();

    const where: Prisma.StockItemWhereInput = { isActive: true };
    if (term) {
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { drugCode: { contains: term, mode: 'insensitive' } },
        { strength: { contains: term, mode: 'insensitive' } }
      ];
    }
    if (inStockOnly) {
      where.StockBatch = {
        some: { departmentId: supplierDepartmentId, isActive: true, quantity: { gt: 0 }, expiryDate: { gt: new Date() } }
      };
    }

    // Fetch a wider page, then rank by what the supplier actually holds
    const items = await this.prisma.stockItem.findMany({
      where,
      orderBy: { name: 'asc' },
      take: Math.min(Math.max(limit, 1), 50) * 4,
      select: { id: true, name: true, drugCode: true, strength: true, category: true, unitOfMeasure: true, reorderLevel: true }
    });

    const ids = items.map(i => i.id);
    const [supplierQty, requesterQty] = await Promise.all([
      this.getDepartmentQuantities(supplierDepartmentId, ids),
      requesterDepartmentId ? this.getDepartmentQuantities(requesterDepartmentId, ids) : Promise.resolve(new Map<string, number>())
    ]);

    return items
      .map(i => ({ ...i, supplierQty: supplierQty.get(i.id) ?? 0, requesterQty: requesterQty.get(i.id) ?? 0 }))
      .sort((a, b) => (b.supplierQty > 0 ? 1 : 0) - (a.supplierQty > 0 ? 1 : 0) || a.name.localeCompare(b.name))
      .slice(0, Math.min(Math.max(limit, 1), 50));
  }

  /**
   * Fulfil an approved requisition.
   *  - Department requester: batches are MOVED (FEFO) from the supplying department to the
   *    requesting department. Hospital-wide stock does not change.
   *  - Ward requester: wards hold no stock, so the quantity is ISSUED from the supplying
   *    department and leaves hospital-wide stock.
   *  - Legacy requisitions with no supplying department keep the old behaviour (deduct global stock).
   */
  async fulfillRequisitionWithStockUpdate(id: string, userId: string | undefined, prisma: PrismaClient) {
    return prisma.$transaction(async (tx) => {
      const requisition = await tx.requisition.findUnique({
        where: { id },
        include: {
          RequisitionItem: { include: { StockItem: true } },
          supplyingDepartment: { select: { id: true, name: true } },
          departments: { select: { id: true, name: true } }
        }
      });

      if (!requisition) throw new Error('Requisition not found');
      if (requisition.status !== 'approved') throw new Error('Only approved requisitions can be fulfilled');

      const lines = requisition.RequisitionItem
        .map(ri => ({ ri, qty: ri.quantityApproved ?? ri.quantityRequested }))
        .filter(l => l.qty > 0);
      if (lines.length === 0) throw new Error('No approved quantities to fulfil');

      const supplierId = requisition.supplyingDepartmentId;
      const reference = requisition.requisitionNumber;

      // ---------- Legacy path: no supplier recorded ----------
      if (!supplierId) {
        for (const { ri, qty } of lines) {
          const updated = await tx.stockItem.updateMany({
            where: { id: ri.stockItemId, currentStock: { gte: qty } },
            data: { currentStock: { decrement: qty } }
          });
          if (updated.count === 0) {
            throw new Error(`Insufficient stock for ${ri.StockItem.name}: need ${qty}, have ${ri.StockItem.currentStock}`);
          }
          const after = await tx.stockItem.findUnique({ where: { id: ri.stockItemId }, select: { currentStock: true } });
          await tx.stockTransaction.create({
            data: {
              stockItemId: ri.stockItemId, transactionType: 'requisition', quantity: qty,
              balanceAfter: after?.currentStock ?? 0, requisitionId: id,
              departmentId: requisition.requestingDepartmentId || undefined,
              reference: `REQ-${reference}`, notes: `Fulfilled requisition ${reference}`, performedBy: userId || undefined
            }
          });
          await tx.requisitionItem.update({ where: { id: ri.id }, data: { quantityFulfilled: qty, performedBy: userId || undefined } });
        }
        return this.markFulfilled(tx, id, userId);
      }

      // ---------- Validate supplier stock for ALL lines first ----------
      const supplierQty = await this.getDepartmentQuantities(supplierId, lines.map(l => l.ri.stockItemId), tx);
      const short = lines.filter(l => (supplierQty.get(l.ri.stockItemId) ?? 0) < l.qty);
      if (short.length > 0) {
        const details = short
          .map(l => `${l.ri.StockItem.name}: requested ${l.qty}, ${requisition.supplyingDepartment?.name || 'supplier'} has ${supplierQty.get(l.ri.stockItemId) ?? 0}`)
          .join('; ');
        throw new Error(`Insufficient stock at ${requisition.supplyingDepartment?.name || 'the supplying department'}: ${details}`);
      }

      const toDepartmentId = requisition.requestingDepartmentId; // null => ward (consumed)

      for (const { ri, qty } of lines) {
        let remaining = qty;

        const batches = await tx.stockBatch.findMany({
          where: {
            stockItemId: ri.stockItemId, departmentId: supplierId, isActive: true,
            quantity: { gt: 0 }, expiryDate: { gt: new Date() }
          },
          orderBy: { expiryDate: 'asc' } // FEFO
        });

        for (const batch of batches) {
          if (remaining <= 0) break;
          const move = Math.min(batch.quantity, remaining);

          // guarded decrement at the supplier
          const dec = await tx.stockBatch.updateMany({
            where: { id: batch.id, quantity: { gte: move } },
            data: { quantity: { decrement: move } }
          });
          if (dec.count === 0) throw new Error(`Stock for ${ri.StockItem.name} changed while fulfilling. Please retry.`);

          if (toDepartmentId) {
            const existing = await tx.stockBatch.findFirst({
              where: { stockItemId: ri.stockItemId, batchNumber: batch.batchNumber, departmentId: toDepartmentId }
            });
            if (existing) {
              await tx.stockBatch.update({ where: { id: existing.id }, data: { quantity: { increment: move }, isActive: true } });
            } else {
              await tx.stockBatch.create({
                data: {
                  stockItemId: ri.stockItemId, batchNumber: batch.batchNumber, expiryDate: batch.expiryDate,
                  costPrice: batch.costPrice, quantity: move, departmentId: toDepartmentId, receivedDate: new Date()
                }
              });
            }
          }
          remaining -= move;
        }

        if (remaining > 0) throw new Error(`Could not allocate ${ri.StockItem.name} from ${requisition.supplyingDepartment?.name || 'supplier'}. Please retry.`);

        const supplierAfter = (await this.getDepartmentQuantities(supplierId, [ri.stockItemId], tx)).get(ri.stockItemId) ?? 0;

        if (toDepartmentId) {
          const requesterAfter = (await this.getDepartmentQuantities(toDepartmentId, [ri.stockItemId], tx)).get(ri.stockItemId) ?? 0;
          await tx.stockTransaction.createMany({
            data: [
              {
                stockItemId: ri.stockItemId, transactionType: 'transfer_out', quantity: qty, balanceAfter: supplierAfter,
                departmentId: supplierId, requisitionId: id, reference: `REQ-${reference}`,
                notes: `Issued to ${requisition.departments?.name || 'department'} on requisition ${reference}`, performedBy: userId || undefined
              },
              {
                stockItemId: ri.stockItemId, transactionType: 'transfer_in', quantity: qty, balanceAfter: requesterAfter,
                departmentId: toDepartmentId, requisitionId: id, reference: `REQ-${reference}`,
                notes: `Received from ${requisition.supplyingDepartment?.name || 'supplier'} on requisition ${reference}`, performedBy: userId || undefined
              }
            ]
          });
        } else {
          // Ward: consumed -> leaves hospital-wide stock too
          const dec = await tx.stockItem.updateMany({
            where: { id: ri.stockItemId, currentStock: { gte: qty } },
            data: { currentStock: { decrement: qty } }
          });
          if (dec.count === 0) throw new Error(`Hospital-wide stock for ${ri.StockItem.name} is lower than ${qty}. Please reconcile stock.`);
          const after = await tx.stockItem.findUnique({ where: { id: ri.stockItemId }, select: { currentStock: true } });
          await tx.stockTransaction.create({
            data: {
              stockItemId: ri.stockItemId, transactionType: 'requisition', quantity: qty, balanceAfter: after?.currentStock ?? 0,
              departmentId: supplierId, requisitionId: id, reference: `REQ-${reference}`,
              notes: `Issued to ward on requisition ${reference}`, performedBy: userId || undefined
            }
          });
        }

        await tx.requisitionItem.update({ where: { id: ri.id }, data: { quantityFulfilled: qty, performedBy: userId || undefined } });
      }

      return this.markFulfilled(tx, id, userId);
    }, { timeout: 30000 });
  }

  private async markFulfilled(tx: Prisma.TransactionClient, id: string, userId: string | undefined) {
    return tx.requisition.update({
      where: { id },
      data: { status: 'fulfilled', fulfilledById: userId, fulfilledAt: new Date() },
      include: {
        RequisitionItem: { include: { StockItem: { select: { name: true, drugCode: true, unitOfMeasure: true } } } }
      }
    });
  }
}
