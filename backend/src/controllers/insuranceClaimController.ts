// controllers/insuranceClaimController.ts - CLEANED UP VERSION
import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthRequest } from '../middleware/authMiddleware';
import { generateNHISClaimXML } from '../services/nhisClaimXMLGenerator';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Import services
import { NHISClaimService } from '../services/NHISClaimService';
import { BillingService } from '../services/BillingService';
import { InsuranceService } from '../services/InsuranceService';



/**
 * Submit NHIS Claim with Validation
 */
export const submitNHISClaim = [
  body('attendanceId')
    .notEmpty().withMessage('Attendance ID is required')
    .isString().withMessage('Attendance ID must be a string'),

  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('🔍 Submit NHIS claim validation errors:', errors.array());
        return res.status(400).json({
          success: false,
          errors: errors.array(),
          message: 'Validation failed'
        });
      }

      const { attendanceId, notes } = req.body;

      console.log('📤 Submitting NHIS claim for attendance:', attendanceId);

      const result = await prisma.$transaction(async (tx) => {
        const attendance = await tx.attendance.findUnique({
          where: { id: attendanceId },
          include: {
            diagnoses: {
              include: {
                diagnosis: {
                  select: {
                    id: true,
                    icdCode: true
                  }
                }
              }
            },
            servicesRendered: {
              include: {
                serviceItem: {
                  select: {
                    id: true,
                    nhisServiceCode: true
                  }
                }
              }
            },
            bill: true
          }
        });

        if (!attendance) {
          throw new Error('Attendance not found');
        }

        if (attendance.paymentMode !== 'nhis') {
          throw new Error('Only NHIS attendances can submit NHIS claims');
        }

        if (!attendance.bill) {
          throw new Error('Bill not found for this attendance');
        }

        // Extract diagnosis codes
        const diagnosisCodes = attendance.diagnoses
          .map(d => d.diagnosis.icdCode)
          .filter(Boolean);

        // Extract service codes
        const procedureCodes = attendance.servicesRendered
          .map(s => s.serviceItem.nhisServiceCode)
          .filter(Boolean);

        const claimData = {
          billId: attendance.bill.id,
          patientId: attendance.patientId,
          attendanceId: attendance.id,
          insuranceProviderId: attendance.insuranceProviderId,
          totalClaimAmount: attendance.bill.insuranceCovered,
          diagnosisCodes,
          procedureCodes,
          notes: notes || `NHIS ${attendance.encounterCategory.toUpperCase()} Claim`,
          status: 'submitted' as const,
          submissionDate: new Date(),
          createdById: req.user?.id
        };

        const insuranceClaim = await tx.insuranceClaim.create({
          data: claimData,
          include: {
            patient: {
              select: {
                id: true,
                folderNumber: true,
                fullName: true
              }
            },
            attendance: {
              select: {
                id: true,
                attendanceNumber: true
              }
            },
            bill: {
              select: {
                id: true,
                billNumber: true
              }
            }
          }
        });

        // Update attendance with claim reference
        await tx.attendance.update({
          where: { id: attendanceId },
          data: { insuranceClaimId: insuranceClaim.id }
        });

        return insuranceClaim;
      });

      console.log('✅ NHIS claim submitted successfully:', result.claimNumber);

      res.status(201).json({
        success: true,
        message: 'NHIS claim submitted successfully',
        data: result
      });

    } catch (error) {
      console.error('❌ Error submitting NHIS claim:', error);
      res.status(500).json({
        success: false,
        message: 'Error submitting NHIS claim',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  }
];

/**
 * Get NHIS Claim Status Summary
 */
export const getNHISClaimSummary = async (req: AuthRequest, res: Response) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    console.log('📊 Getting NHIS claim summary...');

    const filter: any = { 
      paymentMode: 'nhis'
    };

    if (dateFrom || dateTo) {
      filter.dateTime = {};
      if (dateFrom) filter.dateTime.gte = new Date(dateFrom as string);
      if (dateTo) filter.dateTime.lte = new Date(dateTo as string);
    }

    const nhisAttendances = await prisma.attendance.findMany({
      where: filter,
      include: {
        insuranceClaim: true,
        patient: {
          select: {
            id: true,
            folderNumber: true,
            fullName: true
          }
        },
        bill: {
          select: {
            id: true,
            totalAmount: true,
            insuranceCovered: true
          }
        }
      },
      orderBy: { dateTime: 'desc' }
    });

    const summary = {
      totalClaims: nhisAttendances.length,
      totalAmount: nhisAttendances.reduce((sum, att) => sum + (att.bill?.insuranceCovered || 0), 0),
      byEncounterType: {
        opd: nhisAttendances.filter(att => att.encounterCategory === 'opd').length,
        ipd: nhisAttendances.filter(att => att.encounterCategory === 'ipd').length,
        daycase: nhisAttendances.filter(att => att.encounterCategory === 'daycase').length
      },
      claims: nhisAttendances.map(att => ({
        attendanceNumber: att.attendanceNumber,
        patientName: att.patient.fullName,
        encounterType: att.encounterCategory,
        visitCategory: att.visitCategory,
        date: att.dateTime,
        claimStatus: att.insuranceClaim?.status || 'not_submitted',
        claimAmount: att.bill?.insuranceCovered || 0
      }))
    };

    console.log('✅ NHIS claim summary fetched');

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('❌ Error fetching NHIS claim summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching NHIS claim summary',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};


/**
 * Get Claim by Attendance ID
 */
export const getClaimByAttendanceId = async (req: AuthRequest, res: Response) => {
  try {
    const { attendanceId } = req.params;

    console.log('📋 Fetching insurance claim by attendance ID:', attendanceId);

    const claim = await prisma.insuranceClaim.findFirst({
      where: { attendanceId },
      include: {
        insuranceProvider: {
          select: {
            id: true,
            name: true,
            type: true,
            coveragePercentage: true
          }
        },
        patient: {
          select: {
            id: true,
            folderNumber: true,
            surname: true,
otherNames: true,
            contact: true
          }
        },
        attendance: {
          select: {
            id: true,
            attendanceNumber: true,
            dateTime: true,
            status: true
          }
        },
        bill: {
          select: {
            id: true,
            billNumber: true,
            totalAmount: true,
            insuranceCovered: true
          }
        }
      }
    });

    if (!claim) {
      return res.status(404).json({
        success: false,
        message: 'Insurance claim not found for this attendance'
      });
    }

    console.log('✅ Insurance claim fetched successfully:', claim.claimNumber);

    res.json({
      success: true,
      data: claim
    });
  } catch (error) {
    console.error('❌ Error fetching insurance claim by attendance ID:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching insurance claim',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

/**
 * Create Insurance Claim for Attendance
 */
export const createInsuranceClaimForAttendance = [
  body('insuranceProviderId')
    .notEmpty().withMessage('Insurance provider ID is required')
    .isString().withMessage('Insurance provider ID must be a string'),

  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('🔍 Create insurance claim validation errors:', errors.array());
        return res.status(400).json({
          success: false,
          errors: errors.array(),
          message: 'Validation failed'
        });
      }

      const { attendanceId } = req.params;
      const { insuranceProviderId, preAuthNumber, notes } = req.body;

      console.log('📝 Creating insurance claim for attendance:', { attendanceId, insuranceProviderId });

      const result = await prisma.$transaction(async (tx) => {
        const [attendance, insuranceProvider, bill] = await Promise.all([
          tx.attendance.findUnique({
            where: { id: attendanceId },
            include: {
              diagnoses: {
                include: {
                  diagnosis: {
                    select: {
                      id: true,
                      icdCode: true
                    }
                  }
                }
              },
              servicesRendered: {
                include: {
                  serviceItem: {
                    select: {
                      id: true,
                      nhisServiceCode: true
                    }
                  }
                }
              }
            }
          }),
          tx.insuranceProvider.findUnique({
            where: { id: insuranceProviderId }
          }),
          tx.bill.findFirst({
            where: { attendanceId }
          })
        ]);

        if (!attendance) {
          throw new Error('Attendance not found');
        }
        if (!insuranceProvider) {
          throw new Error('Insurance provider not found');
        }
        if (!bill) {
          throw new Error('Bill not found for this attendance');
        }

        // Check if claim already exists
        const existingClaim = await tx.insuranceClaim.findFirst({
          where: { attendanceId }
        });

        if (existingClaim) {
          throw new Error('Insurance claim already exists for this attendance');
        }

        // Extract codes
        const diagnosisCodes = attendance.diagnoses
          .map(d => d.diagnosis.icdCode)
          .filter(Boolean);
        const procedureCodes = attendance.servicesRendered
          .map(s => s.serviceItem.nhisServiceCode)
          .filter(Boolean);

        const claimData = {
          billId: bill.id,
          patientId: attendance.patientId,
          insuranceProviderId: insuranceProvider.id,
          attendanceId: attendance.id,
          totalClaimAmount: bill.insuranceCovered || bill.totalAmount,
          preAuthNumber: preAuthNumber,
          diagnosisCodes,
          procedureCodes,
          notes: notes || `Insurance claim for ${attendance.attendanceNumber}`,
          status: 'draft' as const,
          createdById: req.user?.id
        };

        const insuranceClaim = await tx.insuranceClaim.create({
          data: claimData,
          include: {
            insuranceProvider: {
              select: {
                id: true,
                name: true,
                type: true
              }
            },
            patient: {
              select: {
                id: true,
                folderNumber: true,
                fullName: true
              }
            },
            attendance: {
              select: {
                id: true,
                attendanceNumber: true
              }
            },
            bill: {
              select: {
                id: true,
                billNumber: true
              }
            }
          }
        });

        // Update attendance with claim reference
        await tx.attendance.update({
          where: { id: attendanceId },
          data: { insuranceClaimId: insuranceClaim.id }
        });

        return insuranceClaim;
      });

      console.log('✅ Insurance claim created successfully:', result.claimNumber);

      res.status(201).json({
        success: true,
        message: 'Insurance claim created successfully',
        data: result
      });

    } catch (error) {
      console.error('❌ Error creating insurance claim:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating insurance claim',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  }
];

/**
 * Generate Private Insurance Claim
 */
export const generatePrivateInsuranceClaim = async (req: AuthRequest, res: Response) => {
  try {
    const { attendanceId, insuranceProviderId } = req.params;

    console.log('🏢 Generating private insurance claim...', { attendanceId, insuranceProviderId });

    const [attendance, provider, bill] = await Promise.all([
      prisma.attendance.findUnique({
        where: { id: attendanceId },
        include: {
          patient: {
            select: {
              id: true,
              folderNumber: true,
              surname: true,
otherNames: true,
              dateOfBirth: true,
              gender: true,
              insuranceDetails: true
            }
          },
          diagnoses: {
            include: {
              diagnosis: {
                select: {
                  id: true,
                  name: true,
                  icdCode: true
                }
              }
            }
          }
        }
      }),
      prisma.insuranceProvider.findUnique({
        where: { id: insuranceProviderId }
      }),
      prisma.bill.findFirst({
        where: { attendanceId },
        include: {
          items: true
        }
      })
    ]);

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance not found'
      });
    }
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Insurance provider not found'
      });
    }
    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill not found'
      });
    }

    const coverageRate = provider.coveragePercentage / 100;

    const claimItems = bill.items.map(item => {
      const cashTotal = item.totalPrice;
      const insurerPays = cashTotal * coverageRate;
      const patientPays = cashTotal - insurerPays;

      return {
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: cashTotal,
        insurerPays,
        patientPays,
        category: item.category
      };
    });

    const totalInsurer = claimItems.reduce((sum, item) => sum + item.insurerPays, 0);
    const totalPatient = claimItems.reduce((sum, item) => sum + item.patientPays, 0);

    const privateClaim = {
      patientInfo: {
        fullName: attendance.patient.fullName,
        policyNumber: (attendance.patient.insuranceDetails as any)?.memberId,
        dateOfBirth: attendance.patient.dateOfBirth,
        gender: attendance.patient.gender
      },
      clinicalInfo: {
        diagnoses: attendance.diagnoses.map(d => ({
          description: d.diagnosis.name,
          icdCode: d.diagnosis.icdCode,
          primary: d.primary
        }))
      },
      financialSummary: {
        items: claimItems,
        totalInsurer,
        totalPatient,
        coveragePercentage: provider.coveragePercentage
      },
      provider: {
        name: provider.name,
        id: provider.id
      }
    };

    console.log('✅ Private insurance claim generated successfully');

    res.json({
      success: true,
      message: 'Private insurance claim generated successfully',
      data: privateClaim
    });
  } catch (error) {
    console.error('❌ Error generating private insurance claim:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating private insurance claim',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

/**
 * Get Claim by ID
 */
export const getClaimById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    console.log('📋 Fetching insurance claim by ID:', id);

    const claim = await prisma.insuranceClaim.findUnique({
      where: { id },
      include: {
        insuranceProvider: {
          select: {
            id: true,
            name: true,
            type: true,
            coveragePercentage: true
          }
        },
        patient: {
          select: {
            id: true,
            folderNumber: true,
            surname: true,
otherNames: true,
            contact: true
          }
        },
        attendance: {
          select: {
            id: true,
            attendanceNumber: true,
            dateTime: true,
            status: true
          }
        },
        bill: {
          select: {
            id: true,
            billNumber: true,
            totalAmount: true,
            insuranceCovered: true
          }
        },
        createdBy: {
          select: {
            id: true,
            fullName: true,
            username: true
          }
        },
        updatedBy: {
          select: {
            id: true,
            fullName: true,
            username: true
          }
        }
      }
    });

    if (!claim) {
      return res.status(404).json({
        success: false,
        message: 'Insurance claim not found'
      });
    }

    console.log('✅ Insurance claim fetched successfully:', claim.claimNumber);

    res.json({
      success: true,
      data: claim
    });
  } catch (error) {
    console.error('❌ Error fetching insurance claim:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching insurance claim',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

/**
 * Update Claim Status
 */
export const updateClaimStatus = [
  body('status')
    .isIn(['draft', 'submitted', 'approved', 'partially_approved', 'rejected', 'paid'])
    .withMessage('Valid status is required'),

  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('🔍 Update claim status validation errors:', errors.array());
        return res.status(400).json({
          success: false,
          errors: errors.array(),
          message: 'Validation failed'
        });
      }

      const { id } = req.params;
      const { status, approvedAmount, rejectedAmount, paidAmount, notes } = req.body;

      console.log('📝 Updating claim status:', { id, status });

      const updateData: any = {
        status,
        updatedById: req.user?.id,
        updatedAt: new Date()
      };

      // Set dates based on status
      if (status === 'approved' || status === 'partially_approved') {
        updateData.approvalDate = new Date();
        updateData.approvedAmount = approvedAmount;
        updateData.rejectedAmount = rejectedAmount;
      }
      if (status === 'paid') {
        updateData.paymentDate = new Date();
        updateData.paidAmount = paidAmount;
      }
      if (notes) updateData.notes = notes;

      const claim = await prisma.insuranceClaim.update({
        where: { id },
        data: updateData,
        include: {
          insuranceProvider: {
            select: {
              id: true,
              name: true,
              type: true
            }
          },
          patient: {
            select: {
              id: true,
              folderNumber: true,
              fullName: true
            }
          },
          attendance: {
            select: {
              id: true,
              attendanceNumber: true
            }
          },
          bill: {
            select: {
              id: true,
              billNumber: true
            }
          }
        }
      });

      console.log('✅ Claim status updated successfully:', claim.claimNumber);

      res.json({
        success: true,
        message: 'Claim status updated successfully',
        data: claim
      });
    } catch (error) {
      console.error('❌ Error updating claim status:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating claim status',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  }
];

/**
 * Get Claims with Filtering
 */
export const getInsuranceClaims = async (req: AuthRequest, res: Response) => {
  try {
    const { 
      status, 
      insuranceProviderId, 
      patientId, 
      dateFrom, 
      dateTo, 
      page = 1, 
      limit = 50 
    } = req.query;

    console.log('📋 Fetching insurance claims with filters:', {
      status, insuranceProviderId, patientId, dateFrom, dateTo
    });

    // Build filter
    const where: any = {};
    
    // Handle status filter - support multiple statuses via comma separation
    if (status) {
      // Define valid status mapping between frontend and backend
      const statusMapping: { [key: string]: string } = {
        'processing': 'pending' // Map frontend 'processing' to backend 'pending'
      };
      
      if (typeof status === 'string' && status.includes(',')) {
        // Multiple statuses provided as comma-separated string
        const statusArray = status.split(',').map(s => s.trim());
        
        // Map statuses to backend values
        const mappedStatusArray = statusArray.map(s => statusMapping[s] || s);
        
        where.status = { in: mappedStatusArray };
      } else {
        // Single status provided
        const singleStatus = status as string;
        where.status = statusMapping[singleStatus] || singleStatus;
      }
    }
    
    if (insuranceProviderId) where.insuranceProviderId = insuranceProviderId;
    if (patientId) where.patientId = patientId;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom as string);
      if (dateTo) where.createdAt.lte = new Date(dateTo as string);
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const claims = await prisma.insuranceClaim.findMany({
      where,
      include: {
        insuranceProvider: {
          select: {
            id: true,
            name: true,
            type: true,
            coveragePercentage: true
          }
        },
        patient: {
          select: {
            id: true,
            folderNumber: true,
            surname: true,
otherNames: true,
            contact: true
          }
        },
        attendance: {
          select: {
            id: true,
            attendanceNumber: true,
            dateTime: true,
            status: true
          }
        },
        bill: {
          select: {
            id: true,
            billNumber: true,
            totalAmount: true
          }
        },
        createdBy: {
          select: {
            id: true,
            fullName: true,
            username: true
          }
        },
        updatedBy: {
          select: {
            id: true,
            fullName: true,
            username: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum
    });

    const total = await prisma.insuranceClaim.count({ where });

    console.log(`✅ Found ${claims.length} insurance claims`);

    res.json({
      success: true,
      data: claims,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('❌ Error fetching insurance claims:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching insurance claims',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

/**
 * Generate Insurance Claim Data for Preview
 */
export const generateInsuranceClaimData = async (req: AuthRequest, res: Response) => {
  try {
    const { attendanceId } = req.params;

    console.log('📋 Generating insurance claim data for preview:', attendanceId);

    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        patient: {
          select: {
            id: true,
            folderNumber: true,
            surname: true,
otherNames: true,
            dateOfBirth: true,
            gender: true
          }
        },
        insuranceProvider: {
          select: {
            id: true,
            name: true,
            type: true,
            coveragePercentage: true
          }
        },
        diagnoses: {
          include: {
            diagnosis: {
              select: {
                id: true,
                name: true,
                icdCode: true
              }
            }
          }
        },
        servicesRendered: {
          include: {
            serviceItem: {
              select: {
                id: true,
                name: true,
                code: true,
                cashPrice: true,
                insurancePrice: true,
                nhisServiceCode: true
              }
            }
          }
        },
        bill: {
          select: {
            id: true,
            totalAmount: true,
            insuranceCovered: true,
            patientPayable: true
          }
        }
      }
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance not found'
      });
    }

    if (!attendance.bill) {
      return res.status(400).json({
        success: false,
        message: 'Bill not found for this attendance'
      });
    }

    const claimData = {
      attendance: {
        id: attendance.id,
        attendanceNumber: attendance.attendanceNumber,
        dateTime: attendance.dateTime,
        paymentMode: attendance.paymentMode
      },
      patient: attendance.patient,
      insuranceProvider: attendance.insuranceProvider,
      clinicalData: {
        diagnoses: attendance.diagnoses.map(d => ({
          name: d.diagnosis.name,
          icdCode: d.diagnosis.icdCode,
          primary: d.primary
        })),
        services: attendance.servicesRendered.map(s => ({
          name: s.serviceItem.name,
          code: s.serviceItem.code,
          nhisServiceCode: s.serviceItem.nhisServiceCode,
          quantity: s.quantity,
          price: s.serviceItem.insurancePrice || s.serviceItem.cashPrice
        }))
      },
      financialData: {
        totalAmount: attendance.bill.totalAmount,
        insuranceCovered: attendance.bill.insuranceCovered,
        patientPayable: attendance.bill.patientPayable,
        coveragePercentage: attendance.insuranceProvider?.coveragePercentage || 0
      },
      validation: {
        hasDiagnoses: attendance.diagnoses.length > 0,
        hasServices: attendance.servicesRendered.length > 0,
        hasInsuranceProvider: !!attendance.insuranceProvider,
        hasBill: !!attendance.bill,
        isEligibleForClaim: attendance.paymentMode !== 'cash'
      }
    };

    console.log('✅ Insurance claim data generated successfully for preview');

    res.json({
      success: true,
      message: 'Insurance claim data generated successfully',
      data: claimData
    });
  } catch (error) {
    console.error('❌ Error generating insurance claim data:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating insurance claim data',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

/**
 * Generate NHIS Claim XML for IPD/OPD
 */
export const generateNHISClaimXML = async (req: AuthRequest, res: Response) => {
  try {
    const { attendanceId } = req.params;

    console.log('📋 Generating NHIS Claim XML for attendance:', attendanceId);

    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        patient: true,
        diagnoses: {
          include: {
            diagnosis: true
          }
        },
        admission: true,
        servicesRendered: {
          include: {
            serviceItem: true
          }
        },
        insuranceProvider: {
          select: {
            id: true,
            name: true,
            type: true
          }
        }
      }
    });

    if (!attendance) {
      return res.status(404).json({ 
        success: false,
        message: 'Attendance not found' 
      });
    }

    if (attendance.paymentMode !== 'nhis') {
      return res.status(400).json({
        success: false,
        message: 'Only NHIS attendances can generate NHIS claims'
      });
    }

    // ✅ USE NHIS CLAIM SERVICE TO GET STRUCTURED DATA
    const claimData = attendance.admissionId 
      ? await NHISClaimService.generateIPDClaimData(attendance.admissionId)
      : await NHISClaimService.generateOPDClaimData(attendanceId);

    // ✅ USE THE SERVICE FUNCTION FROM nhisClaimXMLGenerator.ts
    const claimXML = await generateNHISClaimXML(claimData);
    
    res.set('Content-Type', 'text/xml');
    res.set('Content-Disposition', `attachment; filename="nhis_claim_${attendance.attendanceNumber}.xml"`);
    res.send(claimXML);

    console.log('✅ NHIS Claim XML generated successfully');

  } catch (error) {
    console.error('❌ Error generating NHIS claim XML:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error generating NHIS claim', 
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

/**
 * Generate NHIS Claim Data (Auto-detects OPD/IPD)
 */
export const generateNHISClaimData = async (req: AuthRequest, res: Response) => {
  try {
    const { attendanceId } = req.params;

    console.log('📋 Generating NHIS claim data for attendance:', attendanceId);

    // Validate attendance exists and is NHIS
    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        patient: true,
        insuranceProvider: true
      }
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance not found'
      });
    }

    if (attendance.paymentMode !== 'nhis') {
      return res.status(400).json({
        success: false,
        message: 'Only NHIS attendances can generate NHIS claims'
      });
    }

    // Validate claim readiness
    const validation = await InsuranceService.validateClaimReadiness(attendanceId, 'NHIS');
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'NHIS claim validation failed',
        errors: validation.errors
      });
    }

    let claimData;
    
    if (attendance.encounterCategory === 'ipd' && attendance.admissionId) {
      // IPD Claim
      claimData = await NHISClaimService.generateIPDClaimData(attendance.admissionId);
    } else {
      // OPD Claim
      claimData = await NHISClaimService.generateOPDClaimData(attendanceId);
    }

    console.log('✅ NHIS claim data generated successfully');

    res.json({
      success: true,
      message: 'NHIS claim data generated successfully',
      claimType: claimData.claimType,
      data: claimData,
      validation: validation
    });
  } catch (error) {
    console.error('❌ Error generating NHIS claim data:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating NHIS claim data',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

/**
 * Generate Private Insurance Claim Data
 */
export const generatePrivateInsuranceClaimData = async (req: AuthRequest, res: Response) => {
  try {
    const { attendanceId } = req.params;

    console.log('🏢 Generating private insurance claim data for attendance:', attendanceId);

    // Validate attendance exists and is private insurance
    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        patient: true,
        insuranceProvider: true
      }
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance not found'
      });
    }

    if (attendance.paymentMode !== 'private_insurance') {
      return res.status(400).json({
        success: false,
        message: 'Only private insurance attendances can generate private insurance claims'
      });
    }

    if (!attendance.insuranceProvider) {
      return res.status(400).json({
        success: false,
        message: 'Insurance provider not found for this attendance'
      });
    }

    // Validate claim readiness
    const validation = await InsuranceService.validateClaimReadiness(attendanceId, 'PRIVATE_INSURANCE');
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Private insurance claim validation failed',
        errors: validation.errors
      });
    }

    // Generate private insurance claim using BillingService
    const claimData = await BillingService.generatePrivateInsuranceClaim(attendanceId);

    console.log('✅ Private insurance claim data generated successfully');

    res.json({
      success: true,
      message: 'Private insurance claim data generated successfully',
      data: claimData,
      validation: validation
    });
  } catch (error) {
    console.error('❌ Error generating private insurance claim data:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating private insurance claim data',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

/**
 * Validate Insurance Claim Readiness
 */
export const validateInsuranceClaim = async (req: AuthRequest, res: Response) => {
  try {
    const { attendanceId } = req.params;
    const { claimType } = req.body;

    if (!['NHIS', 'PRIVATE_INSURANCE'].includes(claimType)) {
      return res.status(400).json({
        success: false,
        message: 'Claim type must be NHIS or PRIVATE_INSURANCE'
      });
    }

    const validation = await InsuranceService.validateClaimReadiness(attendanceId, claimType as any);

    res.json({
      success: validation.isValid,
      message: validation.isValid ? 'Claim is ready for submission' : 'Claim validation failed',
      ...validation
    });
  } catch (error) {
    console.error('Error validating insurance claim readiness:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error validating insurance claim readiness', 
      error: (error as Error).message 
    });
  }
};

/**
 * Submit Insurance Claim (NHIS or Private)
 */
export const submitInsuranceClaim = [
  body('claimType').isIn(['NHIS', 'PRIVATE_INSURANCE']).withMessage('Valid claim type is required'),
  
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

      const { attendanceId } = req.params;
      const { claimType, notes } = req.body;

      console.log('📤 Submitting insurance claim:', { attendanceId, claimType });

      const result = await prisma.$transaction(async (tx) => {
        const attendance = await tx.attendance.findUnique({
          where: { id: attendanceId },
          include: {
            patient: true,
            insuranceProvider: true,
            bill: true
          }
        });

        if (!attendance) {
          throw new Error('Attendance not found');
        }

        if (!attendance.bill) {
          throw new Error('Bill not found for this attendance');
        }

        // Validate payment mode matches claim type
        if (claimType === 'NHIS' && attendance.paymentMode !== 'nhis') {
          throw new Error('NHIS claim requires NHIS payment mode');
        }
        if (claimType === 'PRIVATE_INSURANCE' && attendance.paymentMode !== 'private_insurance') {
          throw new Error('Private insurance claim requires private insurance payment mode');
        }

        // Generate claim number
        const claimNumber = `${claimType}-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

        const claimData = {
          claimNumber,
          billId: attendance.bill.id,
          patientId: attendance.patientId,
          attendanceId: attendance.id,
          insuranceProviderId: attendance.insuranceProviderId,
          totalClaimAmount: attendance.bill.insuranceCovered,
          notes: notes || `${claimType} claim for ${attendance.attendanceNumber}`,
          status: 'submitted' as const,
          submissionDate: new Date(),
          createdById: req.user?.id
        };

        const insuranceClaim = await tx.insuranceClaim.create({
          data: claimData,
          include: {
            insuranceProvider: {
              select: {
                id: true,
                name: true,
                type: true
              }
            },
            patient: {
              select: {
                id: true,
                folderNumber: true,
                fullName: true
              }
            },
            attendance: {
              select: {
                id: true,
                attendanceNumber: true
              }
            },
            bill: {
              select: {
                id: true,
                billNumber: true
              }
            }
          }
        });

        // Update attendance with claim reference
        await tx.attendance.update({
          where: { id: attendanceId },
          data: { insuranceClaimId: insuranceClaim.id }
        });

        return insuranceClaim;
      });

      console.log('✅ Insurance claim submitted successfully:', result.claimNumber);

      res.status(201).json({
        success: true,
        message: 'Insurance claim submitted successfully',
        data: result
      });

    } catch (error) {
      console.error('❌ Error submitting insurance claim:', error);
      res.status(500).json({
        success: false,
        message: 'Error submitting insurance claim',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  }
];

/**
 * Download NHIS Claim XML
 */
export const downloadNHISClaimXML = async (req: AuthRequest, res: Response) => {
  try {
    const { attendanceId } = req.params;

    console.log('📥 Downloading NHIS claim XML for attendance:', attendanceId);

    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        patient: true,
        insuranceProvider: true
      }
    });

    if (!attendance || attendance.paymentMode !== 'nhis') {
      return res.status(400).json({
        success: false,
        message: 'Valid NHIS attendance required'
      });
    }

    // Generate claim data first
    let claimData;
    if (attendance.encounterCategory === 'ipd' && attendance.admissionId) {
      claimData = await NHISClaimService.generateIPDClaimData(attendance.admissionId);
    } else {
      claimData = await NHISClaimService.generateOPDClaimData(attendanceId);
    }

    // Generate XML
    const xml = await generateNHISClaimXML(claimData);

    res.set('Content-Type', 'application/xml');
    res.set('Content-Disposition', `attachment; filename=nhis_claim_${attendance.attendanceNumber}.xml`);
    res.send(xml);

    console.log('✅ NHIS claim XML downloaded successfully');

  } catch (error) {
    console.error('❌ NHIS XML Generation Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate NHIS claim XML',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

// ADD TO insuranceClaimController.ts if needed:

/**
 * Get Claims Ready for Submission (Batch)
 */
export const getClaimsReadyForSubmission = async (req: AuthRequest, res: Response) => {
  try {
    const { claimType, dateFrom, dateTo } = req.query;

    const where: any = {
      status: { in: ['draft', 'rejected'] } // Can be submitted or resubmitted
    };

    if (claimType) {
      // Filter by insurance provider type
      where.insuranceProvider = {
        type: claimType === 'NHIS' ? 'nhis' : 'private'
      };
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom as string);
      if (dateTo) where.createdAt.lte = new Date(dateTo as string);
    }

    const claims = await prisma.insuranceClaim.findMany({
      where,
      include: {
        insuranceProvider: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        patient: {
          select: {
            id: true,
            surname: true,
otherNames: true,
            folderNumber: true
          }
        },
        attendance: {
          select: {
            id: true,
            attendanceNumber: true,
            dateTime: true
          }
        },
        bill: {
          select: {
            id: true,
            billNumber: true,
            totalAmount: true,
            insuranceCovered: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Validate each claim readiness
    const claimsWithReadiness = await Promise.all(
      claims.map(async (claim) => {
        const validation = await InsuranceService.validateClaimReadiness(
          claim.attendanceId, 
          claim.insuranceProvider.type === 'nhis' ? 'NHIS' : 'PRIVATE_INSURANCE'
        );

        return {
          ...claim,
          validation,
          isReadyForSubmission: validation.isValid
        };
      })
    );

    const readyClaims = claimsWithReadiness.filter(claim => claim.isReadyForSubmission);

    res.json({
      claims: readyClaims,
      summary: {
        total: claims.length,
        ready: readyClaims.length,
        totalAmount: readyClaims.reduce((sum, claim) => sum + claim.totalClaimAmount, 0)
      }
    });
  } catch (error) {
    console.error('Error fetching claims ready for submission:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching claims ready for submission',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

/**
 * Get Insurance Claims Statistics
 */
export const getInsuranceClaimsStatistics = async (req: AuthRequest, res: Response) => {
  try {
    const { period = 'month', claimType } = req.query;

    const date = new Date();
    let startDate: Date;

    switch (period) {
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

    const where: any = {
      createdAt: { gte: startDate }
    };

    if (claimType) {
      where.insuranceProvider = {
        type: claimType === 'NHIS' ? 'nhis' : 'private'
      };
    }

    const stats = await prisma.insuranceClaim.groupBy({
      by: ['status'],
      where,
      _count: {
        id: true
      },
      _sum: {
        totalClaimAmount: true,
        approvedAmount: true,
        paidAmount: true
      }
    });

    const totalClaims = stats.reduce((sum, stat) => sum + stat._count.id, 0);
    const totalClaimAmount = stats.reduce((sum, stat) => sum + (stat._sum.totalClaimAmount || 0), 0);
    const totalApproved = stats.reduce((sum, stat) => sum + (stat._sum.approvedAmount || 0), 0);
    const totalPaid = stats.reduce((sum, stat) => sum + (stat._sum.paidAmount || 0), 0);

    const statusBreakdown = stats.reduce((acc, stat) => {
      acc[stat.status] = {
        count: stat._count.id,
        claimAmount: stat._sum.totalClaimAmount || 0,
        approvedAmount: stat._sum.approvedAmount || 0,
        paidAmount: stat._sum.paidAmount || 0
      };
      return acc;
    }, {} as any);

    res.json({
      period: {
        start: startDate,
        end: new Date(),
        type: period
      },
      summary: {
        totalClaims,
        totalClaimAmount,
        totalApproved,
        totalPaid,
        approvalRate: totalClaimAmount > 0 ? (totalApproved / totalClaimAmount) * 100 : 0,
        paymentRate: totalApproved > 0 ? (totalPaid / totalApproved) * 100 : 0
      },
      statusBreakdown,
      readyForSubmission: await prisma.insuranceClaim.count({
        where: {
          ...where,
          status: { in: ['draft', 'rejected'] }
        }
      })
    });
  } catch (error) {
    console.error('Error fetching insurance claims statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching insurance claims statistics',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};