// controllers/waiverController.ts
import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthRequest } from '../middleware/authMiddleware';
import { PrismaClient, WaiverStatus, WaiverType } from '@prisma/client';

const prisma = new PrismaClient();

const handleError = (res: Response, message: string, error: any, statusCode = 500) => {
  console.error(`❌ ${message}:`, error);
  res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
};

// ==========================================
// CREATE WAIVER REQUEST
// ==========================================
export const createWaiverRequest = [
  body('patientId').notEmpty().withMessage('Patient ID is required'),
  body('billId').optional().isString(),
  body('waiverType').isIn(['indigent', 'nhis_exempt', 'staff_discount', 'management_discretion', 'other'])
    .withMessage('Valid waiver type is required'),
  body('reason').notEmpty().withMessage('Reason is required').trim(),
  body('amountRequested').isFloat({ min: 0.01 }).withMessage('Valid amount requested is required'),
  body('supportingDocs').optional().isArray(),

  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
          message: 'Validation failed'
        });
      }

      const {
        patientId,
        billId,
        waiverType,
        reason,
        amountRequested,
        supportingDocs
      } = req.body;

      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
      }

      // Verify patient exists
      const patient = await prisma.patient.findUnique({
        where: { id: patientId }
      });

      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found'
        });
      }

      // Verify bill exists if provided
      if (billId) {
        const bill = await prisma.bill.findUnique({
          where: { id: billId }
        });

        if (!bill) {
          return res.status(404).json({
            success: false,
            message: 'Bill not found'
          });
        }

        // Check if amount requested exceeds bill balance
        if (amountRequested > bill.balance) {
          return res.status(400).json({
            success: false,
            message: `Requested amount (GHS ${amountRequested}) exceeds bill balance (GHS ${bill.balance})`
          });
        }
      }

      const waiver = await prisma.patientWaiver.create({
        data: {
          patientId,
          billId: billId || null,
          waiverType: waiverType as WaiverType,
          reason,
          amountRequested: parseFloat(amountRequested),
          amountApproved: 0,
          status: 'pending',
          requestedById: req.user.id,
          supportingDocs: supportingDocs || []
        },
        include: {
          patient: {
            select: {
              surname: true,
              otherNames: true,
              folderNumber: true
            }
          },
          bill: {
            select: {
              billNumber: true,
              totalAmount: true,
              balance: true,
              patientPayable: true
            }
          },
          requestedBy: {
            select: {
              fullName: true,
              username: true
            }
          }
        }
      });

      console.log(`✅ Waiver request created for patient ${patient.folderNumber}: GHS ${amountRequested}`);

      res.status(201).json({
        success: true,
        message: 'Waiver request submitted successfully',
        data: waiver
      });

    } catch (error) {
      handleError(res, 'Error creating waiver request', error);
    }
  }
];

// ==========================================
// GET ALL WAIVERS
// ==========================================
export const getWaivers = async (req: AuthRequest, res: Response) => {
  try {
    const {
      status,
      waiverType,
      patientId,
      billId,
      dateFrom,
      dateTo,
      page = 1,
      limit = 50
    } = req.query;

    const where: any = {};

    if (status) where.status = status as WaiverStatus;
    if (waiverType) where.waiverType = waiverType as WaiverType;
    if (patientId) where.patientId = patientId as string;
    if (billId) where.billId = billId as string;

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom as string);
      if (dateTo) where.createdAt.lte = new Date(dateTo as string);
    }

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    const [waivers, total] = await Promise.all([
      prisma.patientWaiver.findMany({
        where,
        include: {
          patient: {
            select: {
              id: true,
              surname: true,
              otherNames: true,
              folderNumber: true,
              contact: true
            }
          },
          bill: {
            select: {
              id: true,
              billNumber: true,
              totalAmount: true,
              balance: true,
              status: true
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

    res.json({
      success: true,
      data: waivers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    handleError(res, 'Error fetching waivers', error);
  }
};

// ==========================================
// GET WAIVER BY ID
// ==========================================
export const getWaiverById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const waiver = await prisma.patientWaiver.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            surname: true,
            otherNames: true,
            folderNumber: true,
            contact: true,
            paymentMode: true
          }
        },
        bill: {
          include: {
            BillLineItem: {
              where: { isVoided: false },
              take: 10
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
      return res.status(404).json({
        success: false,
        message: 'Waiver not found'
      });
    }

    res.json({
      success: true,
      data: waiver
    });
  } catch (error) {
    handleError(res, 'Error fetching waiver', error);
  }
};

// ==========================================
// UPDATE WAIVER STATUS
// ==========================================
export const updateWaiverStatus = [
  body('status').isIn(['pending', 'approved', 'rejected']).withMessage('Valid status required'),
  body('amountApproved').optional().isFloat({ min: 0 }),
  body('rejectionReason').optional().isString(),

  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
          message: 'Validation failed'
        });
      }

      const { id } = req.params;
      const { status, amountApproved, rejectionReason } = req.body;

      const waiver = await prisma.patientWaiver.findUnique({
        where: { id },
        include: {
          bill: true
        }
      });

      if (!waiver) {
        return res.status(404).json({
          success: false,
          message: 'Waiver not found'
        });
      }

      const updateData: any = { status };

      if (status === 'approved') {
        if (amountApproved !== undefined) {
          updateData.amountApproved = parseFloat(amountApproved);
        } else {
          updateData.amountApproved = waiver.amountRequested;
        }
        updateData.approvedAt = new Date();
        updateData.approvedById = req.user?.id;
        updateData.rejectionReason = null;
      }

      if (status === 'rejected') {
        updateData.rejectionReason = rejectionReason || waiver.rejectionReason;
        updateData.amountApproved = 0;
        updateData.approvedById = req.user?.id;
        updateData.approvedAt = new Date();
      }

      const updatedWaiver = await prisma.patientWaiver.update({
        where: { id },
        data: updateData,
        include: {
          patient: {
            select: {
              surname: true,
              otherNames: true,
              folderNumber: true
            }
          },
          bill: {
            select: {
              billNumber: true,
              totalAmount: true,
              balance: true
            }
          },
          requestedBy: {
            select: { fullName: true }
          },
          approvedBy: {
            select: { fullName: true }
          }
        }
      });

      // If approved, apply the waiver to the bill
      if (status === 'approved' && waiver.billId && updatedWaiver.amountApproved > 0) {
        await prisma.$transaction(async (tx) => {
          // Update bill with waiver amount
          const bill = await tx.bill.findUnique({
            where: { id: waiver.billId! }
          });

          if (bill) {
            const newWaiverAmount = (bill.waiverAmount || 0) + updatedWaiver.amountApproved;
            const newPatientPayable = bill.patientPayable - updatedWaiver.amountApproved;
            const newBalance = newPatientPayable - bill.paidAmount;

            await tx.bill.update({
              where: { id: waiver.billId },
              data: {
                waiverAmount: newWaiverAmount,
                patientPayable: newPatientPayable,
                balance: newBalance,
                status: newBalance <= 0 ? 'paid' : bill.status
              }
            });

            // Update attendance balance
            if (bill.attendanceId) {
              await tx.attendance.update({
                where: { id: bill.attendanceId },
                data: {
                  outstandingBalance: {
                    decrement: updatedWaiver.amountApproved
                  }
                }
              });
            }
          }
        });

        console.log(`✅ Waiver of GHS ${updatedWaiver.amountApproved} applied to bill ${waiver.bill?.billNumber}`);
      }

      res.json({
        success: true,
        message: `Waiver ${status} successfully`,
        data: updatedWaiver
      });

    } catch (error) {
      handleError(res, 'Error updating waiver status', error);
    }
  }
];

// ==========================================
// APPROVE WAIVER (Shortcut)
// ==========================================
export const approveWaiver = [
  body('amountApproved').optional().isFloat({ min: 0 }),

  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
          message: 'Validation failed'
        });
      }

      const { id } = req.params;
      const { amountApproved } = req.body;

      const waiver = await prisma.patientWaiver.findUnique({
        where: { id },
        include: { bill: true }
      });

      if (!waiver) {
        return res.status(404).json({
          success: false,
          message: 'Waiver not found'
        });
      }

      if (waiver.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: `Cannot approve waiver that is already ${waiver.status}`
        });
      }

      const finalAmount = amountApproved !== undefined ? parseFloat(amountApproved) : waiver.amountRequested;

      const updatedWaiver = await prisma.$transaction(async (tx) => {
        const updated = await tx.patientWaiver.update({
          where: { id },
          data: {
            status: 'approved',
            amountApproved: finalAmount,
            approvedAt: new Date(),
            approvedById: req.user?.id
          }
        });

        // Apply to bill
        if (waiver.billId) {
          const bill = await tx.bill.findUnique({
            where: { id: waiver.billId }
          });

          if (bill) {
            const newWaiverAmount = (bill.waiverAmount || 0) + finalAmount;
            const newPatientPayable = bill.patientPayable - finalAmount;
            const newBalance = newPatientPayable - bill.paidAmount;

            await tx.bill.update({
              where: { id: waiver.billId },
              data: {
                waiverAmount: newWaiverAmount,
                patientPayable: newPatientPayable,
                balance: newBalance,
                status: newBalance <= 0 ? 'paid' : bill.status
              }
            });

            if (bill.attendanceId) {
              await tx.attendance.update({
                where: { id: bill.attendanceId },
                data: {
                  outstandingBalance: {
                    decrement: finalAmount
                  }
                }
              });
            }
          }
        }

        return updated;
      });

      res.json({
        success: true,
        message: `Waiver approved for GHS ${finalAmount}`,
        data: updatedWaiver
      });

    } catch (error) {
      handleError(res, 'Error approving waiver', error);
    }
  }
];

// ==========================================
// REJECT WAIVER (Shortcut)
// ==========================================
export const rejectWaiver = [
  body('rejectionReason').optional().isString(),

  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
          message: 'Validation failed'
        });
      }

      const { id } = req.params;
      const { rejectionReason } = req.body;

      const waiver = await prisma.patientWaiver.findUnique({
        where: { id }
      });

      if (!waiver) {
        return res.status(404).json({
          success: false,
          message: 'Waiver not found'
        });
      }

      if (waiver.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: `Cannot reject waiver that is already ${waiver.status}`
        });
      }

      const updatedWaiver = await prisma.patientWaiver.update({
        where: { id },
        data: {
          status: 'rejected',
          amountApproved: 0,
          rejectionReason: rejectionReason || waiver.rejectionReason,
          approvedAt: new Date(),
          approvedById: req.user?.id
        }
      });

      res.json({
        success: true,
        message: 'Waiver rejected',
        data: updatedWaiver
      });

    } catch (error) {
      handleError(res, 'Error rejecting waiver', error);
    }
  }
];

// ==========================================
// GET WAIVERS BY BILL
// ==========================================
export const getWaiversByBill = async (req: AuthRequest, res: Response) => {
  try {
    const { billId } = req.params;

    const waivers = await prisma.patientWaiver.findMany({
      where: { billId },
      include: {
        patient: {
          select: {
            surname: true,
            otherNames: true,
            folderNumber: true
          }
        },
        requestedBy: {
          select: { fullName: true, username: true }
        },
        approvedBy: {
          select: { fullName: true, username: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: waivers
    });
  } catch (error) {
    handleError(res, 'Error fetching waivers by bill', error);
  }
};

// ==========================================
// GET WAIVERS BY PATIENT
// ==========================================
export const getWaiversByPatient = async (req: AuthRequest, res: Response) => {
  try {
    const { patientId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    const [waivers, total] = await Promise.all([
      prisma.patientWaiver.findMany({
        where: { patientId },
        include: {
          bill: {
            select: {
              billNumber: true,
              totalAmount: true,
              balance: true
            }
          },
          requestedBy: {
            select: { fullName: true }
          },
          approvedBy: {
            select: { fullName: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.patientWaiver.count({ where: { patientId } })
    ]);

    res.json({
      success: true,
      data: waivers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    handleError(res, 'Error fetching waivers by patient', error);
  }
};

// ==========================================
// GET WAIVER STATISTICS
// ==========================================
export const getWaiverStatistics = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate as string);
    if (endDate) dateFilter.lte = new Date(endDate as string);

    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = dateFilter;
    }

    const [
      totalRequests,
      approvedRequests,
      rejectedRequests,
      pendingRequests,
      totalRequestedAmount,
      totalApprovedAmount,
      byType
    ] = await Promise.all([
      prisma.patientWaiver.count({ where }),
      prisma.patientWaiver.count({ where: { ...where, status: 'approved' } }),
      prisma.patientWaiver.count({ where: { ...where, status: 'rejected' } }),
      prisma.patientWaiver.count({ where: { ...where, status: 'pending' } }),
      prisma.patientWaiver.aggregate({
        where,
        _sum: { amountRequested: true }
      }),
      prisma.patientWaiver.aggregate({
        where: { ...where, status: 'approved' },
        _sum: { amountApproved: true }
      }),
      prisma.patientWaiver.groupBy({
        by: ['waiverType'],
        where,
        _count: true,
        _sum: { amountRequested: true, amountApproved: true }
      })
    ]);

    res.json({
      success: true,
      data: {
        summary: {
          totalRequests,
          approved: approvedRequests,
          rejected: rejectedRequests,
          pending: pendingRequests,
          approvalRate: totalRequests > 0 ? (approvedRequests / totalRequests * 100).toFixed(1) + '%' : '0%',
          totalRequestedAmount: totalRequestedAmount._sum.amountRequested || 0,
          totalApprovedAmount: totalApprovedAmount._sum.amountApproved || 0
        },
        byType
      }
    });
  } catch (error) {
    handleError(res, 'Error fetching waiver statistics', error);
  }
};

// ==========================================
// DELETE WAIVER (Only if pending)
// ==========================================
export const deleteWaiver = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const waiver = await prisma.patientWaiver.findUnique({
      where: { id }
    });

    if (!waiver) {
      return res.status(404).json({
        success: false,
        message: 'Waiver not found'
      });
    }

    if (waiver.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot delete waiver that is ${waiver.status}. Only pending waivers can be deleted.`
      });
    }

    await prisma.patientWaiver.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Waiver deleted successfully'
    });
  } catch (error) {
    handleError(res, 'Error deleting waiver', error);
  }
};