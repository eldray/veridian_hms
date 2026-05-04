// controllers/billController.ts - COMPLETE FIXED VERSION WITH BILLLINEITEM
import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient, BillStatus, PaymentMode } from '@prisma/client';
import { AuthRequest } from '../middleware/authMiddleware';
import { BillingService } from '../services/BillingService';

const prisma = new PrismaClient();

// ✅ ADD THIS: Void a bill line item
export const voidBillLineItem = [
  body('reason').notEmpty().withMessage('Void reason is required'),

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

      const { lineItemId } = req.params;
      const { reason } = req.body;

      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
      }

      const result = await BillingService.voidBillLineItem(lineItemId, req.user.id, reason);

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Bill line item not found'
        });
      }

      // Get updated bill with line items
      const updatedBill = await prisma.bill.findUnique({
        where: { id: result.billId },
        include: {
          BillLineItem: {
            where: { isVoided: false }
          },
          Patient: {
            select: {
              surname: true,
              otherNames: true,
              folderNumber: true
            }
          }
        }
      });

      res.json({
        success: true,
        message: 'Bill line item voided successfully',
        data: {
          voidedItem: result,
          updatedBill
        }
      });
    } catch (error) {
      handleError(res, 'Error voiding bill line item', error);
    }
  }
];


// Utility function for consistent error responses
const handleError = (res: Response, message: string, error: any, statusCode = 500) => {
  console.error(`❌ ${message}:`, error);
  res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
};

export const getBills = async (req: AuthRequest, res: Response) => {
  try {
    const { patientId, status, paymentMode, dateFrom, dateTo, page = 1, limit = 50 } = req.query;
    
    console.log('💰 Fetching bills with filters:', {
      patientId, status, paymentMode, dateFrom, dateTo
    });

    const where: any = {};
    if (patientId) where.patientId = patientId as string;
    
    if (status) {
      if (typeof status === 'string' && status.includes(',')) {
        const statusArray = status.split(',').map(s => s.trim());
        where.status = { in: statusArray };
      } else {
        where.status = status as BillStatus;
      }
    }

    if (paymentMode) {
      where.paymentMode = paymentMode as PaymentMode;
    }
    
    if (dateFrom || dateTo) {
      where.billDate = {};
      if (dateFrom) where.billDate.gte = new Date(dateFrom as string);
      if (dateTo) where.billDate.lte = new Date(dateTo as string);
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [bills, total] = await Promise.all([
      prisma.bill.findMany({
        where,
        include: {
          Patient: {
            select: {
              id: true,
              surname: true,
              otherNames: true,
              folderNumber: true,
              contact: true
            }
          },
          Attendance: {
            select: {
              id: true,
              attendanceNumber: true,
              attendanceType: true,
              encounterCategory: true
            }
          },
          Admission: {
            select: {
              id: true,
              admissionNumber: true,
              status: true
            }
          },
          InsuranceProvider: {
            select: {
              id: true,
              name: true,
              type: true
            }
          },
          User_Bill_createdByIdToUser: {
            select: {
              id: true,
              fullName: true,
              username: true
            }
          },
        },
        orderBy: {
          billDate: 'desc'
        },
        skip,
        take: limitNum
      }),
      prisma.bill.count({ where })
    ]);

    console.log(`✅ Found ${bills.length} bills out of ${total}`);

    res.json({
      success: true,
      data: bills,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalBills: total,
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1
      }
    });
  } catch (error) {
    handleError(res, 'Error fetching bills', error);
  }
};

export const getBillById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    console.log('💰 Fetching bill by ID:', id);

    const bill = await prisma.bill.findUnique({
      where: { id },
      include: {
        Patient: {
          select: {
            id: true,
            surname: true,
            otherNames: true,
            folderNumber: true,
            contact: true,
            paymentMode: true
          }
        },
        Attendance: {
          select: {
            id: true,
            attendanceNumber: true,
            attendanceType: true,
            encounterCategory: true,
            dateTime: true
          }
        },
        Admission: {
          select: {
            id: true,
            admissionNumber: true,
            status: true,
            admissionDate: true
          }
        },
        InsuranceProvider: {
          select: {
            id: true,
            name: true,
            type: true,
            coveragePercentage: true
          }
        },
        User_Bill_createdByIdToUser: {
          select: {
            id: true,
            fullName: true,
            username: true
          }
        },
        User_Bill_updatedByIdToUser: {
          select: {
            id: true,
            fullName: true,
            username: true
          }
        },
        Payment: {
          orderBy: { transactionDate: 'desc' }
        },
        InsuranceClaim: {
          select: {
            id: true,
            claimNumber: true,
            status: true,
            totalClaimAmount: true,
            submissionDate: true
          }
        },
        BillLineItem: {
          where: { isVoided: false },
          include: {
            serviceCatalog: {
              select: {
                name: true,
                code: true,
                serviceType: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!bill) {
      console.log('❌ Bill not found:', id);
      return res.status(404).json({ 
        success: false,
        message: 'Bill not found' 
      });
    }

    console.log('✅ Bill fetched successfully:', bill.billNumber);

    res.json({
      success: true,
      data: bill
    });
  } catch (error) {
    handleError(res, 'Error fetching bill', error);
  }
};

export const generateBillFromAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { attendanceId } = req.params;
    console.log('💰 Generating bill from attendance:', attendanceId);

    const result = await BillingService.generateBillFromAttendance(attendanceId);

    const populatedBill = await prisma.bill.findUnique({
      where: { id: result.bill.id },
      include: {
        Patient: {
          select: {
            surname: true,
            otherNames: true,
            folderNumber: true,
            contact: true
          }
        },
        Attendance: {
          select: {
            attendanceNumber: true,
            attendanceType: true
          }
        },
        User_Bill_createdByIdToUser: {
          select: {
            id: true,
            fullName: true,
            username: true
          }
        },
        BillLineItem: {
          where: { isVoided: false },
          include: {
            serviceCatalog: {
              select: {
                name: true,
                code: true
              }
            }
          }
        }
      }
    });

    console.log('✅ Bill generated successfully:', result.bill.billNumber);

    res.json({
      success: true,
      message: 'Bill generated successfully',
      data: {
        bill: populatedBill,
        summary: result.summary,
        breakdown: {
          totalServices: result.summary.itemCount,
          hasExemptions: result.summary.hasExemptedServices,
          requiresAuth: result.summary.requiresAuthorization
        }
      }
    });
  } catch (error) {
    handleError(res, 'Error generating bill', error);
  }
};

export const createBill = [
  body('patientId').notEmpty().withMessage('Patient ID is required'),
  body('attendanceId').notEmpty().withMessage('Attendance ID is required'),
  body('paymentMode').isIn(['cash', 'nhis', 'private_insurance']).withMessage('Valid payment mode is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one bill item is required'),

  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('🔍 Create bill validation errors:', errors.array());
        return res.status(400).json({ 
          success: false,
          errors: errors.array(),
          message: 'Validation failed'
        });
      }

      const { patientId, attendanceId, paymentMode, items } = req.body;

      console.log('💰 Creating manual bill:', { patientId, attendanceId, paymentMode, itemsCount: items.length });

      const result = await prisma.$transaction(async (tx) => {
        const [patient, attendance] = await Promise.all([
          tx.patient.findUnique({ where: { id: patientId } }),
          tx.attendance.findUnique({ 
            where: { id: attendanceId },
            include: { InsuranceProvider: true }
          })
        ]);
      
        if (!patient) throw new Error('Patient not found');
        if (!attendance) throw new Error('Attendance not found');
      
        const billItems = [];
        let totalCashPrice = 0;
        let totalInsuranceCovered = 0;
        let totalPatientPayable = 0;
      
        for (const item of items) {
          const calculation = await BillingService.calculateServiceBilling(
            item.serviceId,
            item.quantity,
            paymentMode as PaymentMode,
            attendance.InsuranceProvider
          );
      
          totalCashPrice += calculation.cashPrice;
          totalInsuranceCovered += calculation.insuranceCovered;
          totalPatientPayable += calculation.patientPayable;
      
          billItems.push({
            serviceId: item.serviceId,
            quantity: item.quantity,
            calculation
          });
        }
      
        // ✅ Create bill WITHOUT items field
        const bill = await tx.bill.create({
          data: {
            patientId,
            attendanceId,
            admissionId: attendance.admissionId,
            paymentMode: paymentMode as PaymentMode,
            insuranceProviderId: attendance.insuranceProviderId,
            billNumber: `BIL-${Date.now()}`,
            subtotal: totalCashPrice,
            taxAmount: 0,
            totalAmount: totalCashPrice,
            insuranceCovered: totalInsuranceCovered,
            patientPayable: totalPatientPayable,
            paidAmount: 0,
            balance: totalPatientPayable,
            status: totalPatientPayable <= 0 ? 'paid' : 'pending',
            createdById: req.user?.id
          },
          include: {
            Patient: {
              select: {
                surname: true,
                otherNames: true,
                folderNumber: true,
                contact: true
              }
            },
            Attendance: {
              select: {
                attendanceNumber: true,
                attendanceType: true
              }
            },
            User_Bill_createdByIdToUser: {
              select: {
                fullName: true
              }
            }
          }
        });

        // ✅ Create BillLineItem records for each service
        for (const item of billItems) {
          const service = await tx.serviceCatalog.findUnique({
            where: { id: item.serviceId },
            include: { pricing: true }
          });

          await tx.billLineItem.create({
            data: {
              billId: bill.id,
              serviceCatalogId: item.serviceId,
              description: service?.name || `Service ${item.serviceId}`,
              serviceType: service?.serviceType || 'miscellaneous',
              quantity: item.quantity,
              unitPrice: service?.pricing?.cashPrice / item.quantity || 0,
              pricingBasis: paymentMode as PaymentMode,
              lineTotal: item.calculation.cashPrice,
              insuranceCoveredAmount: item.calculation.insuranceCovered,
              patientPayableAmount: item.calculation.patientPayable,
              discount: 0
            }
          });
        }
      
        await tx.attendance.update({
          where: { id: attendanceId },
          data: {
            totalBill: totalCashPrice,
            outstandingBalance: totalPatientPayable
          }
        });
      
        return {
          bill,
          summary: {
            totalCashPrice,
            totalInsuranceCovered,
            totalPatientPayable,
            itemCount: billItems.length
          }
        };
      });

      console.log('✅ Manual bill created successfully:', result.bill.billNumber);

      res.status(201).json({
        success: true,
        message: 'Bill created successfully',
        data: result
      });
    } catch (error) {
      handleError(res, 'Error creating bill', error);
    }
  }
];

export const addPaymentToBill = [
  body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount is required'),
  body('paymentMethod').isIn(['cash', 'mobile_money', 'card', 'bank_transfer', 'cheque']).withMessage('Valid payment method is required'),
  body('reference').optional().isString(),
  body('notes').optional().isString(),

  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('🔍 Add payment validation errors:', errors.array());
        return res.status(400).json({ 
          success: false,
          errors: errors.array(),
          message: 'Validation failed'
        });
      }

      const { amount, paymentMethod, reference, notes } = req.body;
      const { id } = req.params;

      console.log('💳 Adding payment to bill:', { billId: id, amount, paymentMethod });

      const result = await prisma.$transaction(async (tx) => {
        const bill = await tx.bill.findUnique({ where: { id } });
        if (!bill) throw new Error('Bill not found');

        const paymentAmount = parseFloat(amount);
        const newPaidAmount = bill.paidAmount + paymentAmount;
        const newBalance = bill.totalAmount - newPaidAmount;

        let newStatus: BillStatus = bill.status;
        if (newBalance <= 0) {
          newStatus = 'paid';
        } else if (newPaidAmount > 0) {
          newStatus = 'partial';
        }

        const updatedBill = await tx.bill.update({
          where: { id },
          data: {
            paidAmount: newPaidAmount,
            balance: newBalance,
            status: newStatus,
            updatedAt: new Date(),
            updatedById: req.user?.id
          },
          include: {
            Patient: {
              select: {
                surname: true,
                otherNames: true,
                folderNumber: true,
                contact: true
              }
            },
            Attendance: {
              select: {
                attendanceNumber: true,
                attendanceType: true
              }
            }
          }
        });

        await tx.payment.create({
          data: {
            billId: id,
            amount: paymentAmount,
            paymentMethod,
            reference: reference || `PAY-${Date.now()}`,
            receivedById: req.user?.id,
            notes,
            transactionDate: new Date()
          }
        });

        return {
          bill: updatedBill,
          payment: {
            amount: paymentAmount,
            paymentMethod,
            reference: reference || `PAY-${Date.now()}`,
            transactionDate: new Date(),
            notes
          }
        };
      });

      console.log('✅ Payment added successfully to bill:', result.bill.billNumber);

      res.json({
        success: true,
        message: 'Payment added successfully',
        data: result
      });
    } catch (error) {
      handleError(res, 'Error adding payment', error);
    }
  }
];

export const generateBillReport = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    console.log('📊 Generating bill report for:', id);

    const bill = await prisma.bill.findUnique({
      where: { id },
      include: {
        Patient: {
          select: {
            surname: true,
            otherNames: true,
            folderNumber: true,
            contact: true,
            address: true
          }
        },
        Attendance: {
          select: {
            attendanceNumber: true,
            attendanceType: true,
            dateTime: true
          }
        },
        Admission: {
          select: {
            admissionNumber: true,
            admissionDate: true
          }
        },
        InsuranceProvider: {
          select: {
            name: true,
            coveragePercentage: true
          }
        },
        User_Bill_createdByIdToUser: {
          select: {
            fullName: true
          }
        },
        BillLineItem: {
          where: { isVoided: false },
          include: {
            serviceCatalog: {
              select: {
                name: true,
                code: true
              }
            }
          }
        }
      }
    });

    if (!bill) {
      return res.status(404).json({ 
        success: false,
        message: 'Bill not found' 
      });
    }

    const report = {
      billInfo: {
        billNumber: bill.billNumber,
        billDate: bill.billDate,
        status: bill.status,
        paymentMode: bill.paymentMode
      },
      patientInfo: {
        name: `${bill.Patient.surname} ${bill.Patient.otherNames}`,
        folderNumber: bill.Patient.folderNumber,
        contact: bill.Patient.contact,
        address: bill.Patient.address
      },
      attendanceInfo: {
        attendanceNumber: bill.Attendance?.attendanceNumber,
        type: bill.Attendance?.attendanceType,
        date: bill.Attendance?.dateTime
      },
      admissionInfo: bill.Admission ? {
        admissionNumber: bill.Admission.admissionNumber,
        admissionDate: bill.Admission.admissionDate
      } : null,
      items: bill.BillLineItem.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.lineTotal,
        insuranceCovered: item.insuranceCoveredAmount,
        patientPayable: item.patientPayableAmount
      })),
      financialSummary: {
        subtotal: bill.subtotal,
        tax: bill.taxAmount,
        total: bill.totalAmount,
        insuranceCovered: bill.insuranceCovered,
        patientPayable: bill.patientPayable,
        paidAmount: bill.paidAmount,
        balance: bill.balance
      },
      insuranceInfo: bill.InsuranceProvider ? {
        provider: bill.InsuranceProvider.name,
        coveragePercentage: bill.InsuranceProvider.coveragePercentage
      } : null
    };

    console.log('✅ Bill report generated successfully');

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    handleError(res, 'Error generating bill report', error);
  }
};

export const getBillingBreakdown = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    console.log('📋 Getting billing breakdown for bill:', id);

    const bill = await prisma.bill.findUnique({
      where: { id },
      include: {
        Attendance: {
          select: { id: true }
        }
      }
    });

    if (!bill) {
      return res.status(404).json({ 
        success: false,
        message: 'Bill not found' 
      });
    }

    const breakdown = await BillingService.getBillingBreakdown(bill.Attendance.id);

    res.json({
      success: true,
      data: {
        billId: bill.id,
        billNumber: bill.billNumber,
        paymentMode: bill.paymentMode,
        breakdown
      }
    });
  } catch (error) {
    handleError(res, 'Error getting billing breakdown', error);
  }
};

export const updateBillStatus = [
  body('status').isIn(['draft', 'pending', 'partial', 'paid', 'cancelled']).withMessage('Valid status is required'),

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
      const { status } = req.body;

      console.log('📝 Updating bill status:', { id, status });

      const bill = await prisma.bill.update({
        where: { id },
        data: {
          status: status as BillStatus,
          updatedAt: new Date(),
          updatedById: req.user?.id
        },
        include: {
          Patient: {
            select: {
              surname: true,
              otherNames: true,
              folderNumber: true
            }
          },
          Attendance: {
            select: {
              attendanceNumber: true
            }
          }
        }
      });

      console.log('✅ Bill status updated successfully:', bill.billNumber);

      res.json({
        success: true,
        message: 'Bill status updated successfully',
        data: bill
      });
    } catch (error) {
      handleError(res, 'Error updating bill status', error);
    }
  }
];

export const getBillStatistics = async (req: AuthRequest, res: Response) => {
  try {
    const { period = 'month' } = req.query;
    console.log('📊 Getting bill statistics for period:', period);

    const date = new Date();
    let startDate: Date;

    switch (period) {
      case 'today':
        startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        break;
      case 'week':
        startDate = new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(date.getFullYear(), date.getMonth(), 1);
        break;
      case 'quarter':
        const quarter = Math.floor(date.getMonth() / 3);
        startDate = new Date(date.getFullYear(), quarter * 3, 1);
        break;
      case 'year':
        startDate = new Date(date.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(date.getFullYear(), date.getMonth(), 1);
    }

    const where = {
      billDate: { gte: startDate }
    };

    const [
      totalBills,
      totalAmount,
      totalPaid,
      totalPending,
      byPaymentMode,
      byStatus
    ] = await Promise.all([
      prisma.bill.count({ where }),
      prisma.bill.aggregate({ where, _sum: { totalAmount: true } }),
      prisma.bill.aggregate({ where, _sum: { paidAmount: true } }),
      prisma.bill.count({ where: { ...where, status: { in: ['pending', 'partial'] } } }),
      prisma.bill.groupBy({
        by: ['paymentMode'],
        where,
        _count: { id: true },
        _sum: { totalAmount: true, paidAmount: true }
      }),
      prisma.bill.groupBy({
        by: ['status'],
        where,
        _count: { id: true },
        _sum: { totalAmount: true, paidAmount: true }
      })
    ]);

    const stats = {
      period: {
        start: startDate,
        end: new Date(),
        type: period
      },
      summary: {
        totalBills,
        totalAmount: totalAmount._sum.totalAmount || 0,
        totalPaid: totalPaid._sum.paidAmount || 0,
        totalPending,
        collectionRate: totalAmount._sum.totalAmount ? 
          ((totalPaid._sum.paidAmount || 0) / totalAmount._sum.totalAmount) * 100 : 0
      },
      byPaymentMode,
      byStatus
    };

    console.log('✅ Bill statistics fetched successfully');

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    handleError(res, 'Error fetching bill statistics', error);
  }
};

export const getBillLineItems = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const lineItems = await prisma.billLineItem.findMany({
      where: { billId: id, isVoided: false },
      include: {
        serviceCatalog: {
          select: {
            name: true,
            code: true,
            serviceType: true
          }
        },
        voidedBy: {
          select: { fullName: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    const bill = await prisma.bill.findUnique({
      where: { id },
      select: {
        billNumber: true,
        status: true,
        totalAmount: true,
        paidAmount: true,
        balance: true
      }
    });

    res.json({
      success: true,
      data: {
        bill,
        lineItems,
        summary: {
          totalItems: lineItems.length,
          subtotal: lineItems.reduce((sum, i) => sum + i.lineTotal, 0),
          insuranceCovered: lineItems.reduce((sum, i) => sum + i.insuranceCoveredAmount, 0),
          patientPayable: lineItems.reduce((sum, i) => sum + i.patientPayableAmount, 0)
        }
      }
    });
  } catch (error) {
    handleError(res, 'Error fetching bill line items', error);
  }
};



