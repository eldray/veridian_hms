import { PrismaClient, WaiverStatus, WaiverType } from '@prisma/client';

const prisma = new PrismaClient();

interface WaiverFilters {
  billId?: string;
  patientId?: string;
  status?: WaiverStatus;
  waiverType?: WaiverType;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

interface StatisticsFilters {
  startDate?: Date;
  endDate?: Date;
}

export class WaiverService {
  // Create a new waiver request
  async create(data: any) {
    const { 
      billId, 
      patientId, 
      waiverType, 
      amountRequested, 
      reason, 
      requestedById, 
      supportingDocs 
    } = data;

    // Validate required fields (matches PatientWaiver model)
    if (!patientId || !amountRequested || !reason || !requestedById) {
      throw new Error('Patient ID, amount requested, reason, and requested by are required');
    }

    // Validate waiver type
    const validTypes: WaiverType[] = ['indigent', 'nhis_exempt', 'staff_discount', 'management_discretion', 'other'];
    const finalWaiverType = waiverType || 'other';
    if (!validTypes.includes(finalWaiverType)) {
      throw new Error(`Invalid waiver type. Must be one of: ${validTypes.join(', ')}`);
    }

    // Get bill to verify it exists and get patient if not provided
    let finalPatientId = patientId;
    let bill = null;
    
    if (billId) {
      bill = await prisma.bill.findUnique({
        where: { id: billId },
        include: { patient: true }
      });

      if (!bill) {
        throw new Error('Bill not found');
      }

      // If patientId not provided, use bill's patientId
      if (!finalPatientId) {
        finalPatientId = bill.patientId;
      }
    }

    // Create waiver request using PatientWaiver model
    const waiver = await prisma.patientWaiver.create({
      data: {
        billId: billId || null,
        patientId: finalPatientId,
        waiverType: finalWaiverType,
        amountRequested: parseFloat(amountRequested),
        amountApproved: 0,
        reason,
        status: 'pending',
        requestedById,
        supportingDocs: supportingDocs || [],
        requestedBy: {
          connect: { id: requestedById }
        }
      },
      include: {
        patient: {
          select: {
            id: true,
            folderNumber: true,
            surname: true,
            otherNames: true
          }
        },
        bill: {
          select: {
            id: true,
            billNumber: true,
            totalAmount: true,
            paidAmount: true,
            balance: true
          }
        },
        requestedBy: {
          select: {
            id: true,
            fullName: true,
            username: true,
            role: true
          }
        },
        approvedBy: {
          select: {
            id: true,
            fullName: true,
            username: true,
            role: true
          }
        }
      }
    });

    return waiver;
  }

  // Get all waivers with filters
  async getAll(filters: WaiverFilters) {
    const { 
      billId, 
      patientId, 
      status, 
      waiverType,
      startDate, 
      endDate, 
      page = 1, 
      limit = 50 
    } = filters;

    const where: any = {};

    if (billId) where.billId = billId;
    if (patientId) where.patientId = patientId;
    if (status) where.status = status;
    if (waiverType) where.waiverType = waiverType;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const pageNum = Math.max(1, page);
    const limitNum = Math.min(100, Math.max(1, limit));
    const skip = (pageNum - 1) * limitNum;

    const [waivers, total] = await Promise.all([
      prisma.patientWaiver.findMany({
        where,
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
          bill: {
            select: {
              id: true,
              billNumber: true,
              totalAmount: true,
              paidAmount: true,
              balance: true
            }
          },
          requestedBy: {
            select: {
              id: true,
              fullName: true,
              username: true,
              role: true
            }
          },
          approvedBy: {
            select: {
              id: true,
              fullName: true,
              username: true,
              role: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.patientWaiver.count({ where })
    ]);

    return {
      waivers,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalCount: total,
        limit: limitNum
      }
    };
  }

  // Get waiver by ID
  async getById(id: string) {
    const waiver = await prisma.patientWaiver.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            folderNumber: true,
            surname: true,
            otherNames: true,
            contact: true,
            paymentMode: true
          }
        },
        bill: {
          include: {
            BillLineItem: {
              take: 10,
              select: {
                id: true,
                description: true,
                lineTotal: true,
                serviceType: true
              }
            }
          }
        },
        requestedBy: {
          select: {
            id: true,
            fullName: true,
            username: true,
            role: true
          }
        },
        approvedBy: {
          select: {
            id: true,
            fullName: true,
            username: true,
            role: true
          }
        }
      }
    });

    if (!waiver) {
      throw new Error('Waiver not found');
    }

    return waiver;
  }

  // Approve waiver
  async approve(id: string, approvedById: string, amountApproved?: number, rejectionReason?: string) {
    const waiver = await prisma.patientWaiver.findUnique({
      where: { id },
      include: { bill: true }
    });

    if (!waiver) {
      throw new Error('Waiver not found');
    }

    if (waiver.status !== 'pending') {
      throw new Error(`Waiver is already ${waiver.status}`);
    }

    const finalAmountApproved = amountApproved || waiver.amountRequested;
    
    if (finalAmountApproved > waiver.amountRequested) {
      throw new Error(`Approved amount (${finalAmountApproved}) cannot exceed requested amount (${waiver.amountRequested})`);
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedWaiver = await tx.patientWaiver.update({
        where: { id },
        data: {
          status: 'approved',
          amountApproved: finalAmountApproved,
          approvedById,
          approvedAt: new Date(),
          rejectionReason: null
        },
        include: {
          patient: {
            select: {
              id: true,
              folderNumber: true,
              surname: true,
              otherNames: true
            }
          },
          bill: {
            select: {
              id: true,
              billNumber: true,
              totalAmount: true,
              paidAmount: true,
              balance: true
            }
          },
          requestedBy: {
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
          }
        }
      });

      // Update bill to reflect approved waiver
      if (waiver.billId && finalAmountApproved > 0) {
        await tx.bill.update({
          where: { id: waiver.billId },
          data: {
            waiverAmount: waiver.bill?.waiverAmount ? waiver.bill.waiverAmount + finalAmountApproved : finalAmountApproved,
            patientPayable: (waiver.bill?.totalAmount || 0) - (waiver.bill?.insuranceCovered || 0) - (waiver.bill?.discount || 0) - finalAmountApproved,
            balance: (waiver.bill?.totalAmount || 0) - (waiver.bill?.paidAmount || 0) - finalAmountApproved
          }
        });
      }

      return updatedWaiver;
    });

    return result;
  }

  // Reject waiver
  async reject(id: string, approvedById: string, rejectionReason: string) {
    const waiver = await prisma.patientWaiver.findUnique({
      where: { id }
    });

    if (!waiver) {
      throw new Error('Waiver not found');
    }

    if (waiver.status !== 'pending') {
      throw new Error(`Waiver is already ${waiver.status}`);
    }

    if (!rejectionReason) {
      throw new Error('Rejection reason is required');
    }

    const updatedWaiver = await prisma.patientWaiver.update({
      where: { id },
      data: {
        status: 'rejected',
        approvedById,
        approvedAt: new Date(),
        rejectionReason
      },
      include: {
        patient: {
          select: {
            id: true,
            folderNumber: true,
            surname: true,
            otherNames: true
          }
        },
        bill: {
          select: {
            id: true,
            billNumber: true,
            totalAmount: true
          }
        },
        requestedBy: {
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
        }
      }
    });

    return updatedWaiver;
  }

  // Get waiver statistics
  async getStatistics(filters: StatisticsFilters) {
    const { startDate, endDate } = filters;

    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [
      totalWaivers,
      pendingWaivers,
      approvedWaivers,
      rejectedWaivers,
      totalRequestedAmount,
      totalApprovedAmount,
      byWaiverType
    ] = await Promise.all([
      prisma.patientWaiver.count({ where }),
      prisma.patientWaiver.count({ where: { ...where, status: 'pending' } }),
      prisma.patientWaiver.count({ where: { ...where, status: 'approved' } }),
      prisma.patientWaiver.count({ where: { ...where, status: 'rejected' } }),
      prisma.patientWaiver.aggregate({
        where,
        _sum: { amountRequested: true }
      }),
      prisma.patientWaiver.aggregate({
        where: { ...where, status: 'approved' },
        _sum: { amountApproved: true }
      }),
      // Count by waiver type
      Promise.all([
        prisma.patientWaiver.count({ where: { ...where, waiverType: 'indigent' } }),
        prisma.patientWaiver.count({ where: { ...where, waiverType: 'nhis_exempt' } }),
        prisma.patientWaiver.count({ where: { ...where, waiverType: 'staff_discount' } }),
        prisma.patientWaiver.count({ where: { ...where, waiverType: 'management_discretion' } }),
        prisma.patientWaiver.count({ where: { ...where, waiverType: 'other' } })
      ])
    ]);

    return {
      totalWaivers,
      pendingWaivers,
      approvedWaivers,
      rejectedWaivers,
      totalRequestedAmount: totalRequestedAmount._sum.amountRequested || 0,
      totalApprovedAmount: totalApprovedAmount._sum.amountApproved || 0,
      approvalRate: totalWaivers > 0 ? (approvedWaivers / totalWaivers) * 100 : 0,
      averageRequestedAmount: totalWaivers > 0 ? (totalRequestedAmount._sum.amountRequested || 0) / totalWaivers : 0,
      averageApprovedAmount: approvedWaivers > 0 ? (totalApprovedAmount._sum.amountApproved || 0) / approvedWaivers : 0,
      byWaiverType: {
        indigent: byWaiverType[0],
        nhisExempt: byWaiverType[1],
        staffDiscount: byWaiverType[2],
        managementDiscretion: byWaiverType[3],
        other: byWaiverType[4]
      }
    };
  }

  // Get waivers by bill
  async getByBillId(billId: string) {
    const waivers = await prisma.patientWaiver.findMany({
      where: { billId },
      include: {
        patient: {
          select: {
            id: true,
            folderNumber: true,
            surname: true,
            otherNames: true
          }
        },
        bill: {
          select: {
            id: true,
            billNumber: true,
            totalAmount: true,
            paidAmount: true,
            balance: true
          }
        },
        requestedBy: {
          select: {
            id: true,
            fullName: true,
            username: true,
            role: true
          }
        },
        approvedBy: {
          select: {
            id: true,
            fullName: true,
            username: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return waivers;
  }

  // Get waivers by patient
  async getByPatientId(patientId: string) {
    const waivers = await prisma.patientWaiver.findMany({
      where: { patientId },
      include: {
        patient: {
          select: {
            id: true,
            folderNumber: true,
            surname: true,
            otherNames: true
          }
        },
        bill: {
          select: {
            id: true,
            billNumber: true,
            totalAmount: true,
            paidAmount: true,
            balance: true
          }
        },
        requestedBy: {
          select: {
            id: true,
            fullName: true,
            username: true,
            role: true
          }
        },
        approvedBy: {
          select: {
            id: true,
            fullName: true,
            username: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return waivers;
  }

  // Update waiver (only for pending waivers)
  async update(id: string, data: any) {
    const waiver = await prisma.patientWaiver.findUnique({
      where: { id }
    });

    if (!waiver) {
      throw new Error('Waiver not found');
    }

    if (waiver.status !== 'pending') {
      throw new Error('Only pending waivers can be updated');
    }

    const { amountRequested, reason, supportingDocs } = data;

    return await prisma.patientWaiver.update({
      where: { id },
      data: {
        amountRequested: amountRequested ? parseFloat(amountRequested) : undefined,
        reason: reason !== undefined ? reason : undefined,
        supportingDocs: supportingDocs !== undefined ? supportingDocs : undefined
      },
      include: {
        patient: {
          select: {
            id: true,
            folderNumber: true,
            surname: true,
            otherNames: true
          }
        },
        bill: {
          select: {
            id: true,
            billNumber: true,
            totalAmount: true
          }
        },
        requestedBy: {
          select: {
            id: true,
            fullName: true,
            username: true
          }
        }
      }
    });
  }

  // Delete waiver (only for pending waivers)
  async delete(id: string) {
    const waiver = await prisma.patientWaiver.findUnique({
      where: { id }
    });

    if (!waiver) {
      throw new Error('Waiver not found');
    }

    if (waiver.status !== 'pending') {
      throw new Error('Only pending waivers can be deleted');
    }

    await prisma.patientWaiver.delete({
      where: { id }
    });

    return { message: 'Waiver deleted successfully' };
  }
}

export const waiverService = new WaiverService();