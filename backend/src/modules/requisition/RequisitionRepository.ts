// RequisitionRepository.ts - Data access layer for requisition module
import { PrismaClient, Prisma } from '@prisma/client';
import {
  RequisitionQueryParams,
  CreateRequisitionDTO,
  UpdateRequisitionDTO,
  ApproveRequisitionItemsDTO
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
    const { departmentId, wardId, status, urgency, page = 1, limit = 1000 } = params;

    const where: Prisma.RequisitionWhereInput = {};

    if (departmentId) where.requestingDepartmentId = departmentId;
    if (wardId) where.requestingWardId = wardId;
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

  async fulfillRequisitionWithStockUpdate(id: string, userId: string | undefined, prisma: PrismaClient) {
    return prisma.$transaction(async (tx) => {
      const requisition = await tx.requisition.findUnique({
        where: { id },
        include: { RequisitionItem: { include: { StockItem: true } } }
      });

      if (!requisition) throw new Error('Requisition not found');
      
      if (requisition.status !== 'approved') {
        throw new Error('Only approved requisitions can be fulfilled');
      }

      // Validate all items have sufficient stock BEFORE making any updates
      const insufficientItems = [];
      for (const reqItem of requisition.RequisitionItem) {
        const quantityToIssue = reqItem.quantityApproved || reqItem.quantityRequested;
        const stockItem = reqItem.StockItem;
        
        if (stockItem.currentStock < quantityToIssue) {
          insufficientItems.push({
            itemName: stockItem.name,
            required: quantityToIssue,
            available: stockItem.currentStock
          });
        }
      }

      if (insufficientItems.length > 0) {
        const details = insufficientItems
          .map(item => `${item.itemName}: need ${item.required}, have ${item.available}`)
          .join('; ');
        throw new Error(`Insufficient stock for requisition items: ${details}`);
      }

      // Process each item - deduct stock and create transactions (atomic guarded decrements)
      for (const reqItem of requisition.RequisitionItem) {
        const quantityToIssue = reqItem.quantityApproved || reqItem.quantityRequested;
        
        // Atomically decrement ONLY if we still have enough stock
        const updated = await tx.stockItem.updateMany({
          where: { 
            id: reqItem.stockItemId,
            currentStock: { gte: quantityToIssue }
          },
          data: {
            currentStock: { decrement: quantityToIssue }
          }
        });

        if (updated.count === 0) {
          throw new Error(`Concurrent stock depletion detected for item ${reqItem.id}. Please retry.`);
        }

        // The ledger row must record the stock level AFTER this issue (balanceAfter is required)
        const after = await tx.stockItem.findUnique({
          where: { id: reqItem.stockItemId },
          select: { currentStock: true }
        });

        // Create stock transaction record
        await tx.stockTransaction.create({
          data: {
            stockItemId: reqItem.stockItemId,
            transactionType: 'requisition',
            quantity: quantityToIssue,
            balanceAfter: after?.currentStock ?? 0,
            requisitionId: id,
            departmentId: requisition.requestingDepartmentId || undefined,
            reference: `REQ-${requisition.requisitionNumber}`,
            notes: `Fulfilled requisition ${requisition.requisitionNumber}`,
            performedBy: userId || undefined
          }
        });
      }

      // Update requisition status to fulfilled
      const updatedRequisition = await tx.requisition.update({
        where: { id },
        data: {
          status: 'fulfilled',
          fulfilledById: userId,
          fulfilledAt: new Date()
        },
        include: {
          RequisitionItem: {
            include: {
              StockItem: {
                select: { name: true, drugCode: true, unitOfMeasure: true }
              }
            }
          }
        }
      });

      return updatedRequisition;
    });
  }
}