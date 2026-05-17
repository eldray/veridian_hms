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

  async findAll(params: RequisitionQueryParams) {
    const { departmentId, status, urgency, page = 1, limit = 50 } = params;

    const where: Prisma.RequisitionWhereInput = {};

    if (departmentId) where.requestingDepartmentId = departmentId;
    if (status) where.status = status;
    if (urgency) where.urgency = urgency;

    const skip = (page - 1) * limit;

    const [requisitions, total] = await Promise.all([
      this.prisma.requisition.findMany({
        where,
        include: {
          departments: {
            select: { name: true, id: true }
          },
          User_Requisition_requestedByIdToUser: {
            select: { fullName: true, role: true, id: true }
          },
          User_Requisition_approvedByIdToUser: {
            select: { fullName: true, role: true }
          },
          User_Requisition_fulfilledByIdToUser: {
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

    return { requisitions, total };
  }

  async findById(id: string) {
    return this.prisma.requisition.findUnique({
      where: { id },
      include: {
        departments: {
          select: { name: true, id: true }
        },
        User_Requisition_requestedByIdToUser: {
          select: { fullName: true, role: true, username: true }
        },
        User_Requisition_approvedByIdToUser: {
          select: { fullName: true, role: true }
        },
        User_Requisition_fulfilledByIdToUser: {
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
  }

  async create(data: CreateRequisitionDTO, requestedById: string, requisitionNumber: string) {
    return this.prisma.requisition.create({
      data: {
        requisitionNumber,
        requestingDepartmentId: data.requestingDepartmentId,
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
        User_Requisition_requestedByIdToUser: {
          select: { fullName: true }
        }
      }
    });
  }

  async updateStatus(
    id: string,
    status: string,
    userId: string | undefined,
    notes?: string
  ) {
    const updateData: Prisma.RequisitionUpdateInput = {
      status,
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

    return this.prisma.requisition.update({
      where: { id },
      data: updateData,
      include: {
        departments: {
          select: { name: true }
        },
        User_Requisition_requestedByIdToUser: {
          select: { fullName: true }
        },
        User_Requisition_approvedByIdToUser: {
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
  }

  async delete(id: string) {
    // Delete requisition items first
    await this.prisma.requisitionItem.deleteMany({
      where: { requisitionId: id }
    });

    // Then delete requisition
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
}
