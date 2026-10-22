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
import { decreaseDepartmentStockBalance, increaseDepartmentStockBalance } from '../stockItem/StockItemRepository';

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
    const { departmentId, wardId, supplyingDepartmentId, status, urgency, authenticatedUserId, page = 1, limit = 1000 } = params;

    const where: Prisma.RequisitionWhereInput = {};
    const filters: Prisma.RequisitionWhereInput[] = [];

    // Client filters narrow results; they never grant access. The authenticated user's
    // current database role and department determine the mandatory visibility scope.
    if (authenticatedUserId) {
      const user = await this.prisma.user.findUnique({
        where: { id: authenticatedUserId },
        select: { role: true, departmentId: true }
      });
      if (!user) throw new Error('User not found');

      if (user.role !== 'admin' && user.role !== 'super_admin') {
        const visibleToUser: Prisma.RequisitionWhereInput[] = [
          { requestedById: authenticatedUserId }
        ];
        if (user.departmentId) {
          visibleToUser.push(
            { requestingDepartmentId: user.departmentId },
            { supplyingDepartmentId: user.departmentId }
          );
        }
        filters.push({ OR: visibleToUser });
      }
    } else {
      // Defensive default: never return the unrestricted list without an authenticated ID.
      throw new Error('User not authenticated');
    }

    if (departmentId) filters.push({ requestingDepartmentId: departmentId });
    if (wardId) filters.push({ requestingWardId: wardId });
    if (supplyingDepartmentId) filters.push({ supplyingDepartmentId });
    if (status) filters.push({ status: status as any });
    if (urgency) filters.push({ urgency: urgency as any });
    if (filters.length) where.AND = filters;

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
    notes?: string,
    expectedCurrentStatus?: string
  ) {
    if (status === 'fulfilled') {
      throw new Error('Requisitions can only be marked fulfilled by the atomic stock-fulfilment workflow');
    }
    if (status === 'approved') {
      throw new Error('Requisitions can only be approved through the item-approval workflow');
    }
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

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    // Use the observed state as a compare-and-set guard. A concurrent submit/cancel
    // must not overwrite another request's successful transition.
    const claim = await this.prisma.requisition.updateMany({
      where: { id, ...(expectedCurrentStatus ? { status: expectedCurrentStatus as any } : {}) },
      data: updateData,
    });
    if (claim.count !== 1) {
      throw new Error('This requisition has already changed status. Refresh and try again.');
    }

    const result = await this.prisma.requisition.findUnique({
      where: { id },
      include: {
        departments: { select: { name: true } },
        ward: { select: { wardName: true } },
        requestedBy: { select: { fullName: true } },
        approvedBy: { select: { fullName: true } },
        RequisitionItem: {
          include: {
            StockItem: { select: { name: true, drugCode: true, unitOfMeasure: true } }
          }
        }
      }
    });
    if (!result) throw new Error('Requisition not found after status update');
    return this.legacyKeys(result) as typeof result;
  }

  async delete(id: string) {
    return this.prisma.$transaction(async (tx) => {
      // Claim deletion only while the requisition is still a draft. This closes
      // the race where the service checked "draft", another request submitted
      // it, and this method then deleted a live requisition and its item history.
      const claim = await tx.requisition.updateMany({
        where: { id, status: 'draft' },
        data: { updatedAt: new Date() },
      });
      if (claim.count !== 1) {
        throw new Error('Only a draft requisition can be deleted. It may have changed status; refresh and try again.');
      }

      await tx.requisitionItem.deleteMany({
        where: { requisitionId: id }
      });

      return tx.requisition.delete({
        where: { id }
      });
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

      const lines = await tx.requisitionItem.findMany({ where: { requisitionId: id }, select: { id: true, quantityRequested: true } });
      const lineIds = new Set(lines.map(line => line.id));
      const submittedIds = new Set(approvedItems.map(item => item.requisitionItemId));
      if (submittedIds.size !== approvedItems.length || submittedIds.size !== lineIds.size || [...submittedIds].some(itemId => !lineIds.has(itemId))) {
        throw new Error('Approval must include each line from this requisition exactly once');
      }
      for (const item of approvedItems) {
        const line = lines.find(candidate => candidate.id === item.requisitionItemId)!;
        if (!Number.isSafeInteger(item.quantityApproved) || item.quantityApproved < 0 || item.quantityApproved > line.quantityRequested) {
          throw new Error('Approved quantities must be whole numbers between zero and the requested quantity');
        }
      }

      // Claim approval atomically so two approvers cannot race and overwrite
      // the line quantities after both observed the submitted state.
      const approvalClaim = await tx.requisition.updateMany({
        where: { id, status: 'submitted' },
        data: { status: 'approved', approvedById: userId, approvedAt: new Date() },
      });
      if (approvalClaim.count !== 1) {
        throw new Error('This requisition has already been approved or its status changed. Refresh and try again.');
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
        wardId: null,
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
          departments: { select: { id: true, name: true } },
          ward: { select: { id: true, wardName: true } }
        }
      });

      if (!requisition) throw new Error('Requisition not found');
      if (requisition.status !== 'approved') throw new Error('Only approved requisitions can be fulfilled');

      const toDepartmentId = requisition.requestingDepartmentId;
      const toWardId = requisition.requestingWardId;
      if (Boolean(toDepartmentId) === Boolean(toWardId)) {
        throw new Error('A requisition must identify exactly one receiving department or ward');
      }

      // Validate every stored line before filtering zero-approved quantities. A
      // malformed negative/non-integer quantity must never disappear silently
      // while the remaining lines are fulfilled.
      const requestedLines = requisition.RequisitionItem
        .map(ri => ({ ri, qty: ri.quantityApproved ?? ri.quantityRequested }));
      const invalidLine = requestedLines.find(({ ri, qty }) =>
        !Number.isSafeInteger(ri.quantityRequested) ||
        ri.quantityRequested <= 0 ||
        !Number.isSafeInteger(qty) ||
        qty < 0 ||
        qty > ri.quantityRequested
      );
      if (invalidLine) {
        throw new Error(`Approved quantity for ${invalidLine.ri.StockItem.name} must be a whole number between zero and the positive requested quantity`);
      }
      const lines = requestedLines.filter(l => l.qty > 0);
      if (lines.length === 0) throw new Error('No approved quantities to fulfil');

      // Claim fulfillment only after validating the saved destination and every
      // line. Competing requests cannot issue the same requisition twice.
      const fulfillmentClaim = await tx.requisition.updateMany({
        where: { id, status: 'approved' },
        data: { status: 'fulfilled', fulfilledById: userId, fulfilledAt: new Date() },
      });
      if (fulfillmentClaim.count !== 1) {
        throw new Error('This requisition has already been fulfilled or its status changed. Refresh and try again.');
      }

      const supplierId = requisition.supplyingDepartmentId;
      const reference = requisition.requisitionNumber;

      // A requisition must identify the issuing department. Treating a requisition
      // without a source as consumption would silently reduce hospital stock and
      // make the transfer impossible to audit.
      if (!supplierId) {
        throw new Error('Select a supplying department before fulfilling this requisition');
      }

      // ---------- Validate supplier stock for ALL lines first ----------
      const supplierQty = await this.getDepartmentQuantities(supplierId, lines.map(l => l.ri.stockItemId), tx);
      // Non-batch supplies use the canonical location balance directly. If an item has
      // any batches, only eligible batches at the supplying department are spendable.
      for (const { ri } of lines) {
        const batchCount = await tx.stockBatch.count({ where: { stockItemId: ri.stockItemId } });
        if (batchCount === 0 && !supplierQty.has(ri.stockItemId)) {
          const balance = await tx.stockItemDepartmentBalance.findUnique({
            where: { stockItemId_locationKey: { stockItemId: ri.stockItemId, locationKey: supplierId } },
            select: { quantity: true },
          });
          supplierQty.set(ri.stockItemId, balance?.quantity ?? 0);
        }
      }
      const short = lines.filter(l => (supplierQty.get(l.ri.stockItemId) ?? 0) < l.qty);
      if (short.length > 0) {
        const details = short
          .map(l => `${l.ri.StockItem.name}: requested ${l.qty}, ${requisition.supplyingDepartment?.name || 'supplier'} has ${supplierQty.get(l.ri.stockItemId) ?? 0}`)
          .join('; ');
        throw new Error(`Insufficient stock at ${requisition.supplyingDepartment?.name || 'the supplying department'}: ${details}`);
      }

      for (const { ri, qty } of lines) {
        let remaining = qty;
        // Move the ledger balances first within this transaction. Any later batch or
        // validation failure rolls these changes back, preserving all-or-nothing fulfilment.
        const supplierBalance = await decreaseDepartmentStockBalance(tx, ri.stockItemId, supplierId, qty);
        // Department-to-department transfers remain inside the hospital aggregate.
        // Ward requests are issued for use (wards are not stock-holding locations in
        // this workflow), so they leave the supplier balance and hospital-wide stock.
        const destinationBalance = toDepartmentId
          ? await increaseDepartmentStockBalance(tx, ri.stockItemId, toDepartmentId, qty)
          : null;
        if (toWardId) {
          const updatedAggregate = await tx.stockItem.updateMany({
            where: { id: ri.stockItemId, currentStock: { gte: qty } },
            data: { currentStock: { decrement: qty } },
          });
          if (updatedAggregate.count !== 1) {
            throw new Error(`Insufficient hospital-wide stock for ${ri.StockItem.name} while issuing to a ward`);
          }
        }

        const batchCount = await tx.stockBatch.count({ where: { stockItemId: ri.stockItemId } });
        const batches = batchCount > 0 ? await tx.stockBatch.findMany({
          where: {
            stockItemId: ri.stockItemId, departmentId: supplierId, wardId: null, isActive: true,
            quantity: { gt: 0 }, expiryDate: { gt: new Date() }
          },
          orderBy: { expiryDate: 'asc' } // FEFO
        }) : [];

        for (const batch of batches) {
          if (remaining <= 0) break;
          const move = Math.min(batch.quantity, remaining);

          // guarded decrement at the supplier
          const dec = await tx.stockBatch.updateMany({
            where: {
              id: batch.id, departmentId: supplierId, wardId: null, isActive: true,
              expiryDate: { gt: new Date() }, quantity: { gte: move }
            },
            data: { quantity: { decrement: move } }
          });
          if (dec.count === 0) throw new Error(`Stock for ${ri.StockItem.name} changed while fulfilling. Please retry.`);

          // Only department requests receive stock into another stock-holding
          // location. Ward requests consume/issue the quantity, so the source batch
          // is decremented without creating a duplicate ward batch.
          if (toDepartmentId) {
            const existing = await tx.stockBatch.findFirst({
              where: {
                stockItemId: ri.stockItemId,
                batchNumber: batch.batchNumber,
                departmentId: toDepartmentId,
                wardId: null,
              }
            });
            if (existing) {
              // The schema allows only one row per item/batch/location. Never merge
              // a different expiry/cost lot into that row during a requisition transfer.
              if (existing.expiryDate.getTime() !== batch.expiryDate.getTime()) {
                throw new Error(`Destination already has batch ${batch.batchNumber} with a different expiry date. Reconcile the batch before fulfilling this requisition.`);
              }
              if (Number(existing.costPrice) !== Number(batch.costPrice)) {
                throw new Error(`Destination already has batch ${batch.batchNumber} with a different cost price. Reconcile the batch before fulfilling this requisition.`);
              }
              if (!existing.isActive) {
                throw new Error(`Destination batch ${batch.batchNumber} is inactive. Reconcile the batch before fulfilling this requisition.`);
              }
              await tx.stockBatch.update({ where: { id: existing.id }, data: { quantity: { increment: move } } });
            } else {
              await tx.stockBatch.create({
                data: {
                  stockItemId: ri.stockItemId, batchNumber: batch.batchNumber, expiryDate: batch.expiryDate,
                  costPrice: batch.costPrice, quantity: move, departmentId: toDepartmentId,
                  receivedDate: new Date()
                }
              });
            }
          }
          remaining -= move;
        }

        if (batchCount > 0 && remaining > 0) {
          throw new Error(`Could not allocate ${ri.StockItem.name} from ${requisition.supplyingDepartment?.name || 'supplier'}. Please retry.`);
        }

        if (toDepartmentId) {
          const destinationName = requisition.departments?.name || 'department';
          await tx.stockTransaction.createMany({
            data: [
              {
                stockItemId: ri.stockItemId, transactionType: 'transfer_out', quantity: qty,
                balanceAfter: supplierBalance.quantity, departmentId: supplierId, requisitionId: id,
                reference: `REQ-${reference}`,
                notes: `Transferred to ${destinationName} on requisition ${reference}`, performedBy: userId || undefined
              },
              {
                stockItemId: ri.stockItemId, transactionType: 'transfer_in', quantity: qty,
                balanceAfter: destinationBalance!.quantity, departmentId: toDepartmentId,
                requisitionId: id, reference: `REQ-${reference}`,
                notes: `Received from ${requisition.supplyingDepartment?.name || 'supplier'} on requisition ${reference}`,
                performedBy: userId || undefined
              }
            ]
          });
        } else if (toWardId) {
          await tx.stockTransaction.create({
            data: {
              stockItemId: ri.stockItemId, transactionType: 'requisition', quantity: qty,
              // This requisition leaves the supplying department; balanceAfter must remain a location snapshot.
              balanceAfter: supplierBalance.quantity, departmentId: supplierId, requisitionId: id,
              reference: `REQ-${reference}`,
              notes: `Issued to ward ${requisition.ward?.wardName || toWardId} on requisition ${reference}`,
              performedBy: userId || undefined,
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
