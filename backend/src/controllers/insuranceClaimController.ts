// controllers/insuranceClaimController.ts - FULLY CORRECTED
import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthRequest } from '../middleware/authMiddleware';
import { PrismaClient } from '@prisma/client';
import { NHISClaimService } from '../services/NHISClaimService'; // ✅ ADD THIS IMPORT

const prisma = new PrismaClient();

// ==========================================
// BASIC VIEWING FUNCTIONS
// ==========================================

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

    const where: any = {};
    
    if (status) {
      if (typeof status === 'string' && status.includes(',')) {
        const statusArray = status.split(',').map(s => s.trim());
        where.status = { in: statusArray };
      } else {
        where.status = status as string;
      }
    }
    
    if (insuranceProviderId) where.insuranceProviderId = insuranceProviderId as string;
    if (patientId) where.patientId = patientId as string;
    
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom as string);
      if (dateTo) {
        const endDate = new Date(dateTo as string);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDate;
      }
    }

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    const [claims, total] = await Promise.all([
      prisma.insuranceClaim.findMany({
        where,
        include: {
          InsuranceProvider: {
            select: {
              id: true,
              name: true,
              type: true,
              coveragePercentage: true
            }
          },
          Patient: {
            select: {
              id: true,
              folderNumber: true,
              surname: true,
              otherNames: true,
              contact: true
            }
          },
          Attendance: {
            select: {
              id: true,
              attendanceNumber: true,
              dateTime: true,
              status: true
            }
          },
          Bill: {
            select: {
              id: true,
              billNumber: true,
              totalAmount: true
            }
          },
          User_InsuranceClaim_createdByIdToUser: {
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
      }),
      prisma.insuranceClaim.count({ where })
    ]);

    console.log(`✅ Found ${claims.length} insurance claims out of ${total} total`);

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

export const getInsuranceClaim = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || id === 'undefined') {
      return res.status(400).json({
        success: false,
        message: 'Valid claim ID is required'
      });
    }

    console.log('📋 Fetching insurance claim by ID:', id);

    const claim = await prisma.insuranceClaim.findUnique({
      where: { id },
      include: {
        InsuranceProvider: {
          select: {
            id: true,
            name: true,
            type: true,
            coveragePercentage: true
          }
        },
        Patient: {
          select: {
            id: true,
            folderNumber: true,
            surname: true,
            otherNames: true,
            contact: true
          }
        },
        Attendance: {
          select: {
            id: true,
            attendanceNumber: true,
            dateTime: true,
            status: true
          }
        },
        Bill: {
          select: {
            id: true,
            billNumber: true,
            totalAmount: true,
            insuranceCovered: true
          }
        },
        User_InsuranceClaim_createdByIdToUser: {
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

// ==========================================
// GENERATE CLAIM DRAFT
// ==========================================

export const generateClaimDraft = [
  body('attendanceId').notEmpty().withMessage('Attendance ID is required'),
  
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

      const { attendanceId } = req.body;

      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
      }

      const result = await prisma.$transaction(async (tx) => {
        const existingClaim = await tx.insuranceClaim.findFirst({
          where: { attendanceId }
        });

        if (existingClaim) {
          console.log('ℹ️ Claim already exists for attendance:', attendanceId);
          return existingClaim;
        }

        // ✅ CORRECTED: Use lowercase relation names
        const attendance = await tx.attendance.findUnique({
          where: { id: attendanceId },
          include: {
            Patient: { 
              include: {
                InsuranceProvider: true
              }
            },
            InsuranceProvider: true,
            Bill: true,
            AttendanceDiagnosis: { 
              include: { 
                Diagnosis: { 
                  select: {
                    id: true,
                    name: true,
                    icdCode: true,
                  }
                } 
              }
            },
            ServiceRendered: {
              include: { 
                ServiceCatalog: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                    nhisServiceCode: true,
                    serviceType: true
                  }
                }
              }
            },
            LabTest: {  // ✅ lowercase 'l', capital 'T'
              include: {
                ServiceCatalog: {  // ✅ lowercase 's', capital 'C'
                  select: {
                    id: true,
                    name: true,
                    code: true,
                    nhisServiceCode: true
                  }
                }
              }
            },
            Medication: {
              include: {
                ServiceCatalog: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                    nhisServiceCode: true
                  }
                },
                StockItem: {
                  select: {
                    id: true,
                    name: true,
                    drugCode: true
                  }
                }
              }
            },
            Procedure: {
              include: {
                ServiceCatalog: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                    nhisServiceCode: true
                  }
                }
              }
            },
            Scan: { 
              include: {
                ServiceCatalog: { 
                  select: {
                    id: true,
                    name: true,
                    code: true,
                    nhisServiceCode: true
                  }
                }
              }
            }
          }
        });

        if (!attendance) throw new Error('Attendance not found');
        if (!attendance.insuranceProviderId) throw new Error('Attendance has no insurance provider');

        const claimNumber = `CLM-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

        // ✅ CORRECTED: Use lowercase relation names in mappings
        const diagnosisCodes = attendance.attendanceDiagnosis
          .map(d => d.diagnosis?.icdCode)
          .filter(Boolean) as string[];

        const procedureCodes = attendance.procedure
          .map(p => p.serviceCatalog?.nhisServiceCode)
          .filter(Boolean) as string[];
        
        const labTestCodes = attendance.labTest
          .map(lt => lt.serviceCatalog?.nhisServiceCode)
          .filter(Boolean) as string[];
        
        const medicationCodes = attendance.Medication
          .map(m => m.ServiceCatalog?.nhisServiceCode || m.StockItem?.drugCode)
          .filter(Boolean) as string[];
        
        const scanCodes = attendance.Scan
          .map(s => s.ServiceCatalog?.nhisServiceCode)
          .filter(Boolean) as string[];
        
        const serviceCodes = attendance.ServiceRendered
          .filter(s => s.ServiceCatalog && !['procedure'].includes(s.ServiceCatalog.serviceType))
          .map(s => s.ServiceCatalog?.nhisServiceCode)
          .filter(Boolean) as string[];

        const totalClaimAmount = attendance.Bill?.insuranceCovered || attendance.Bill?.totalAmount || 0;
        
        // ✅ CORRECTED: Use lowercase 'patient'
        const insuranceDetails = attendance.Patient?.insuranceDetails as any;
        const insuranceNumber = insuranceDetails?.memberId || 'N/A';
        const attendanceCCC = attendance.nhisCCC || 'N/A';

        const claim = await tx.insuranceClaim.create({
          data: {
            claimNumber,
            billId: attendance.Bill?.id,
            patientId: attendance.patientId,
            attendanceId: attendance.id,
            insuranceProviderId: attendance.insuranceProviderId,
            totalClaimAmount,
            status: 'draft',
            createdById: req.user.id,
            diagnosisCodes,
            procedureCodes,
            labTestCodes,
            medicationCodes,
            scanCodes,
            serviceCodes,
            notes: `Insurance Number: ${insuranceNumber}, CCC: ${attendanceCCC}`
          },
          include: {
            InsuranceProvider: true,
            Patient: { select: { id: true, folderNumber: true, surname: true, otherNames: true } },
            Attendance: { select: { id: true, attendanceNumber: true } },
            Bill: { select: { id: true, billNumber: true } }
          }
        });

        await tx.attendance.update({
          where: { id: attendanceId },
          data: { insuranceClaimId: claim.id }
        });

        return { ...claim, insuranceData: { insuranceNumber, attendanceCCC } };
      });

      res.status(201).json({
        success: true,
        message: 'Claim draft generated successfully',
        data: result
      });

    } catch (error) {
      console.error('❌ Error generating claim draft:', error);
      res.status(500).json({
        success: false,
        message: 'Error generating claim draft',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  }
];

// ==========================================
// GET CLAIM DRAFT
// ==========================================

export const getClaimDraft = async (req: AuthRequest, res: Response) => {
  try {
    const { claimId } = req.params;

    if (!claimId || claimId === 'undefined') {
      return res.status(400).json({
        success: false,
        message: 'Valid claim ID is required'
      });
    }

    const claim = await prisma.insuranceClaim.findUnique({
      where: { id: claimId },
      include: {
        Attendance: {
          include: {
            AttendanceDiagnosis: {
              include: { Diagnosis: true }
            },
            ServiceRendered: {
              include: { ServiceCatalog: true }
            },
            LabTest: {
              include: { ServiceCatalog: true }
            },
            Medication: {
              include: { ServiceCatalog: true, StockItem: true }
            },
            Procedure: {
              include: { ServiceCatalog: true }
            },
            Scan: {
              include: { ServiceCatalog: true }
            }
          }
        }
      }
    });

    if (!claim) {
      return res.status(404).json({
        success: false,
        message: 'Claim not found'
      });
    }

    const insuranceDetails = claim.Attendance?.patientId?.insuranceDetails as any;
    const insuranceNumber = insuranceDetails?.memberId || 'N/A';
    const attendanceCCC = claim.Attendance?.nhisCCC || 'N/A';

    res.json({
      success: true,
      data: {
        claim,
        insuranceData: { insuranceNumber, attendanceCCC },
        diagnoses: claim.Attendance?.AttendanceDiagnosis || [],
        services: claim.Attendance?.ServiceRendered || [],
        labTests: claim.Attendance?.LabTest || [],
        medications: claim.Attendance?.Medication || [],
        procedures: claim.Attendance?.Procedure || [],
        scans: claim.Attendance?.Scan || [],
        canEdit: claim.status === 'draft'
      }
    });

  } catch (error) {
    console.error('❌ Error fetching claim draft:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching claim draft',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

// ==========================================
// UPDATE CLAIM DRAFT
// ==========================================

export const updateClaimDraft = [
  body('diagnosisCodes').optional().isArray(),
  body('procedureCodes').optional().isArray(),
  body('labTestCodes').optional().isArray(),
  body('medicationCodes').optional().isArray(),
  body('scanCodes').optional().isArray(),
  body('serviceCodes').optional().isArray(),
  body('totalClaimAmount').optional().isNumeric(),
  
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

      const { claimId } = req.params;
      const { diagnosisCodes, procedureCodes, labTestCodes, medicationCodes, scanCodes, serviceCodes, totalClaimAmount, notes } = req.body;

      const existingClaim = await prisma.insuranceClaim.findUnique({
        where: { id: claimId }
      });

      if (!existingClaim) {
        return res.status(404).json({
          success: false,
          message: 'Claim not found'
        });
      }

      if (existingClaim.status !== 'draft') {
        return res.status(400).json({
          success: false,
          message: 'Only draft claims can be edited'
        });
      }

      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
      }

      const updateData: any = {
        updatedById: req.user.id,
        updatedAt: new Date()
      };

      if (diagnosisCodes !== undefined) updateData.diagnosisCodes = diagnosisCodes;
      if (procedureCodes !== undefined) updateData.procedureCodes = procedureCodes;
      if (labTestCodes !== undefined) updateData.labTestCodes = labTestCodes;
      if (medicationCodes !== undefined) updateData.medicationCodes = medicationCodes;
      if (scanCodes !== undefined) updateData.scanCodes = scanCodes;
      if (serviceCodes !== undefined) updateData.serviceCodes = serviceCodes;
      if (totalClaimAmount !== undefined) updateData.totalClaimAmount = parseFloat(totalClaimAmount);
      if (notes !== undefined) updateData.notes = notes;

      const claim = await prisma.insuranceClaim.update({
        where: { id: claimId },
        data: updateData,
        include: {
          InsuranceProvider: true,
          Patient: { select: { id: true, folderNumber: true, surname: true, otherNames: true } },
          Attendance: { select: { id: true, attendanceNumber: true } },
          Bill: { select: { id: true, billNumber: true, totalAmount: true } }
        }
      });

      res.json({
        success: true,
        message: 'Claim draft updated successfully',
        data: claim
      });
    } catch (error) {
      console.error('❌ Error updating claim draft:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating claim draft',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  }
];

// ==========================================
// FINALIZE CLAIM
// ==========================================

export const finalizeClaim = async (req: AuthRequest, res: Response) => {
  try {
    const { claimId } = req.params;

    if (!claimId || claimId === 'undefined') {
      return res.status(400).json({
        success: false,
        message: 'Valid claim ID is required'
      });
    }

    const claim = await prisma.insuranceClaim.findUnique({
      where: { id: claimId }
    });

    if (!claim) {
      return res.status(404).json({
        success: false,
        message: 'Claim not found'
      });
    }

    if (claim.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft claims can be finalized'
      });
    }

    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    const finalizedClaim = await prisma.insuranceClaim.update({
      where: { id: claimId },
      data: {
        status: 'submitted',
        submissionDate: new Date(),
        updatedById: req.user.id
      },
      include: {
        InsuranceProvider: true,
        Patient: { select: { id: true, folderNumber: true, surname: true, otherNames: true } },
        Attendance: { select: { id: true, attendanceNumber: true } },
        Bill: { select: { id: true, billNumber: true } }
      }
    });

    res.json({
      success: true,
      message: 'Claim finalized successfully',
      data: finalizedClaim
    });

  } catch (error) {
    console.error('❌ Error finalizing claim:', error);
    res.status(500).json({
      success: false,
      message: 'Error finalizing claim',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

// ==========================================
// GENERATE CLAIM XML
// ==========================================

export const generateClaimXML = async (req: AuthRequest, res: Response) => {
  try {
    const { claimId } = req.params;

    if (!claimId || claimId === 'undefined') {
      return res.status(400).json({
        success: false,
        message: 'Valid claim ID is required'
      });
    }

    const claim = await prisma.insuranceClaim.findUnique({
      where: { id: claimId },
      include: {
        Attendance: {
          include: {
            Patient: {
              include: { InsuranceProvider: true }
            },
            AttendanceDiagnosis: {
              include: {
                Diagnosis: true
              }
            },
            ServiceRendered: {
              include: { ServiceCatalog: true }
            }
          }
        },
        InsuranceProvider: true
      }
    });

    if (!claim) {
      return res.status(404).json({
        success: false,
        message: 'Claim not found'
      });
    }

    if (claim.status !== 'submitted' && claim.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Only submitted or approved claims can generate XML'
      });
    }

    const claimXML = `<?xml version="1.0" encoding="UTF-8"?>
<InsuranceClaim>
  <ClaimNumber>${claim.claimNumber}</ClaimNumber>
  <Patient>
    <FolderNumber>${claim.Attendance?.Patient?.folderNumber || 'No Folder'}</FolderNumber>
    <Name>${claim.Attendance?.Patient?.surname || ''} ${claim.Attendance?.Patient?.otherNames || ''}</Name>
    <InsuranceNumber>${(claim.Attendance?.Patient?.insuranceDetails as any)?.memberId || 'N/A'}</InsuranceNumber>
    <AttendanceCCC>${claim.Attendance?.nhisCCC || 'N/A'}</AttendanceCCC>
  </Patient>
  <Provider>
    <Name>${claim.InsuranceProvider?.name || 'Unknown'}</Name>
    <CoveragePercentage>${claim.InsuranceProvider?.coveragePercentage || 0}</CoveragePercentage>
  </Provider>
  <Financial>
    <TotalAmount>${claim.totalClaimAmount}</TotalAmount>
  </Financial>
  <Status>${claim.status}</Status>
  <SubmissionDate>${claim.submissionDate?.toISOString() || new Date().toISOString()}</SubmissionDate>
</InsuranceClaim>`;

    res.set('Content-Type', 'application/xml');
    res.set('Content-Disposition', `attachment; filename="claim_${claim.claimNumber}.xml"`);
    res.send(claimXML);

  } catch (error) {
    console.error('❌ Error generating claim XML:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating claim XML',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

// ==========================================
// GENERATE CLAIM PRINT
// ==========================================

export const generateClaimPrint = async (req: AuthRequest, res: Response) => {
  try {
    const { claimId } = req.params;

    if (!claimId || claimId === 'undefined') {
      return res.status(400).json({
        success: false,
        message: 'Valid claim ID is required'
      });
    }

    const claim = await prisma.insuranceClaim.findUnique({
      where: { id: claimId },
      include: {
        InsuranceProvider: true,
        Patient: true,
        Attendance: true,
        Bill: true,
        User_InsuranceClaim_createdByIdToUser: {
          select: { fullName: true, username: true }
        }
      }
    });

    if (!claim) {
      return res.status(404).json({
        success: false,
        message: 'Claim not found'
      });
    }

    res.json({
      success: true,
      data: {
        claim,
        generatedAt: new Date(),
        generatedBy: req.user?.id
      }
    });

  } catch (error) {
    console.error('❌ Error generating claim print:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating claim print',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

// ==========================================
// GET FINALIZED CLAIMS TOTAL
// ==========================================

export const getFinalizedClaimsTotal = async (req: AuthRequest, res: Response) => {
  try {
    const { dateFrom, dateTo } = req.query;

    const dateFilter: any = {};
    if (dateFrom) {
      const startDate = new Date(dateFrom as string);
      startDate.setHours(0, 0, 0, 0);
      dateFilter.gte = startDate;
    }
    if (dateTo) {
      const endDate = new Date(dateTo as string);
      endDate.setHours(23, 59, 59, 999);
      dateFilter.lte = endDate;
    }

    const finalizedClaims = await prisma.insuranceClaim.findMany({
      where: {
        status: 'submitted',
        ...(dateFrom || dateTo ? { submissionDate: dateFilter } : {})
      },
      include: {
        InsuranceProvider: { select: { id: true, name: true, type: true } },
        Patient: { select: { id: true, folderNumber: true, surname: true, otherNames: true } }
      },
      orderBy: { submissionDate: 'desc' }
    });

    const totalAmount = finalizedClaims.reduce((sum, claim) => sum + claim.totalClaimAmount, 0);

    res.json({
      success: true,
      data: {
        totalFinalizedClaims: finalizedClaims.length,
        totalAmount,
        claims: finalizedClaims.map(claim => ({
          id: claim.id,
          claimNumber: claim.claimNumber,
          patientName: `${claim.Patient?.surname || ''} ${claim.Patient?.otherNames || ''}`.trim(),
          patientFolder: claim.Patient?.folderNumber || 'No Folder',
          insuranceProvider: claim.InsuranceProvider?.name,
          amount: claim.totalClaimAmount,
          submissionDate: claim.submissionDate
        }))
      }
    });

  } catch (error) {
    console.error('❌ Error calculating finalized claims total:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating finalized claims total',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

// ==========================================
// GET CLAIM BY ATTENDANCE ID
// ==========================================

export const getClaimByAttendanceId = async (req: AuthRequest, res: Response) => {
  try {
    const { attendanceId } = req.params;

    if (!attendanceId || attendanceId === 'undefined') {
      return res.status(400).json({
        success: false,
        message: 'Valid attendance ID is required'
      });
    }

    const claim = await prisma.insuranceClaim.findFirst({
      where: { attendanceId },
      include: {
        InsuranceProvider: true,
        Patient: true,
        Attendance: true,
        Bill: true
      }
    });

    if (!claim) {
      return res.status(404).json({
        success: false,
        message: 'No insurance claim found for this attendance'
      });
    }

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

// ==========================================
// UPDATE CLAIM STATUS
// ==========================================

export const updateClaimStatus = [
  body('status').isIn(['draft', 'submitted', 'approved', 'paid', 'rejected']).withMessage('Valid status required'),
  body('notes').optional().isString(),
  
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

      const { claimId } = req.params;
      const { status, notes } = req.body;

      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
      }

      const claim = await prisma.insuranceClaim.findUnique({
        where: { id: claimId }
      });

      if (!claim) {
        return res.status(404).json({
          success: false,
          message: 'Claim not found'
        });
      }

      const updateData: any = {
        status,
        updatedById: req.user.id,
        updatedAt: new Date()
      };

      if (status === 'submitted' && claim.status !== 'submitted') {
        updateData.submissionDate = new Date();
      }

      if (notes) {
        updateData.notes = notes;
      }

      const updatedClaim = await prisma.insuranceClaim.update({
        where: { id: claimId },
        data: updateData,
        include: {
          InsuranceProvider: true,
          Patient: { select: { id: true, folderNumber: true, surname: true, otherNames: true } },
          Attendance: { select: { id: true, attendanceNumber: true } }
        }
      });

      res.json({
        success: true,
        message: `Claim status updated to ${status}`,
        data: updatedClaim
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

// ==========================================
// NHIS CLAIM GENERATION (Using Context-based GDRG)
// ==========================================

export const generateNHISClaim = [
  body('attendanceId').notEmpty().withMessage('Attendance ID is required'),
  
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

      const { attendanceId } = req.body;

      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
      }

      const result = await prisma.$transaction(async (tx) => {
        const existingClaim = await tx.insuranceClaim.findFirst({
          where: { 
            attendanceId,
            InsuranceProvider: { type: 'nhis' }
          }
        });
  
        if (existingClaim) {
          console.log('ℹ️ NHIS claim already exists for attendance:', attendanceId);
          return existingClaim;
        }
  
        const attendance = await tx.attendance.findUnique({
          where: { id: attendanceId },
          include: {
            Patient: { include: { InsuranceProvider: true } },
            InsuranceProvider: true,
            Bill: true,
            AttendanceDiagnosis: {
              include: { Diagnosis: true },
              where: { primary: true }
            },
            ServiceRendered: {
              include: { ServiceCatalog: true }
            }
          }
        });

        if (!attendance) throw new Error('Attendance not found');
        if (!attendance.InsuranceProvider || attendance.InsuranceProvider.type !== 'nhis') {
          throw new Error('Attendance is not for NHIS provider');
        }
        if (!attendance.nhisCCC) throw new Error('NHIS CCC number is required for NHIS claims');

        const patientAgeInYears = NHISClaimService.calculateAgeInYears(
          attendance.Patient.dateOfBirth,
          attendance.dateTime
        );

        const gdrgTariff = await NHISClaimService.resolveGDRGByContext(attendance, patientAgeInYears);

        if (!gdrgTariff) {
          throw new Error(`No GDRG tariff found for attendance type: ${attendance.attendanceType}, age: ${patientAgeInYears}`);
        }

        const claimNumber = `NHIS-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

        const nhisServiceCodes = attendance.ServiceRendered
          .map(s => s.ServiceCatalog?.nhisServiceCode)
          .filter(Boolean) as string[];

        const nhisClaim = await tx.insuranceClaim.create({
          data: {
            claimNumber,
            billId: attendance.Bill?.id,
            patientId: attendance.patientId,
            attendanceId: attendance.id,
            insuranceProviderId: attendance.insuranceProviderId,
            totalClaimAmount: gdrgTariff.nhiaTariff,
            status: 'draft',
            createdById: req.user.id,
            diagnosisCodes: attendance.AttendanceDiagnosis.map(d => d.Diagnosis?.icdCode).filter(Boolean) as string[],
            procedureCodes: [],
            labTestCodes: [],
            medicationCodes: [],
            scanCodes: [],
            serviceCodes: nhisServiceCodes,
            gdrgCodes: [gdrgTariff.gdrgCode],
            nhisServiceCodes: [gdrgTariff.nhisServiceCode],
            notes: `NHIS CCC: ${attendance.nhisCCC}, GDRG: ${gdrgTariff.gdrgCode}, Tariff: ${gdrgTariff.nhiaTariff}`
          },
          include: {
            InsuranceProvider: true,
            Patient: { select: { id: true, folderNumber: true, surname: true, otherNames: true } },
            Attendance: { select: { id: true, attendanceNumber: true, nhisCCC: true } }
          }
        });

        return { claim: nhisClaim, gdrgDetails: gdrgTariff };
      });

      res.status(201).json({
        success: true,
        message: 'NHIS claim generated successfully',
        data: result
      });

    } catch (error) {
      console.error('❌ Error generating NHIS claim:', error);
      res.status(500).json({
        success: false,
        message: 'Error generating NHIS claim',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  }
];

// ==========================================
// PRIVATE INSURANCE CLAIM GENERATION
// ==========================================

export const generatePrivateInsuranceClaim = [
  body('attendanceId').notEmpty().withMessage('Attendance ID is required'),
  
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

      const { attendanceId } = req.body;

      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
      }

      const result = await prisma.$transaction(async (tx) => {
        const existingClaim = await tx.insuranceClaim.findFirst({
          where: { 
            attendanceId,
            InsuranceProvider: { type: 'private' }
          }
        });

        if (existingClaim) {
          console.log('ℹ️ Private insurance claim already exists for attendance:', attendanceId);
          return existingClaim;
        }

        const attendance = await tx.attendance.findUnique({
          where: { id: attendanceId },
          include: {
            Patient: { include: { InsuranceProvider: true } },
            InsuranceProvider: true,
            Bill: true,
            AttendanceDiagnosis: {
              include: { Diagnosis: true }
            },
            ServiceRendered: {
              include: { ServiceCatalog: { include: { pricing: true } } }
            },
            LabTest: { include: { ServiceCatalog: { include: { pricing: true } } } },
            Medication: { include: { ServiceCatalog: { include: { pricing: true } } } },
            Procedure: { include: { ServiceCatalog: { include: { pricing: true } } } },
            Scan: { include: { ServiceCatalog: { include: { pricing: true } } } }
          }
        });

        if (!attendance) throw new Error('Attendance not found');
        if (!attendance.InsuranceProvider || attendance.InsuranceProvider.type !== 'private') {
          throw new Error('Attendance is not for private insurance provider');
        }

        const claimNumber = `PVT-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

        const diagnosisCodes = attendance.AttendanceDiagnosis
          .map(d => d.Diagnosis?.icdCode)
          .filter(Boolean) as string[];

        const procedureCodes = attendance.Procedure
          .map(p => p.ServiceCatalog?.code)
          .filter(Boolean) as string[];
        
        const labTestCodes = attendance.LabTest
          .map(lt => lt.ServiceCatalog?.code)
          .filter(Boolean) as string[];
        
        const medicationCodes = attendance.Medication
          .map(m => m.ServiceCatalog?.code)
          .filter(Boolean) as string[];
        
        const scanCodes = attendance.Scan
          .map(s => s.ServiceCatalog?.code)
          .filter(Boolean) as string[];
        
        const serviceCodes = attendance.ServiceRendered
          .map(s => s.ServiceCatalog?.code)
          .filter(Boolean) as string[];

        const totalClaimAmount = attendance.Bill?.insuranceCovered || attendance.Bill?.totalAmount || 0;

        const privateClaim = await tx.insuranceClaim.create({
          data: {
            claimNumber,
            billId: attendance.Bill?.id,
            patientId: attendance.patientId,
            attendanceId: attendance.id,
            InsuranceProviderId: attendance.insuranceProviderId,
            totalClaimAmount,
            status: 'draft',
            createdById: req.user.id,
            diagnosisCodes,
            procedureCodes,
            labTestCodes,
            medicationCodes,
            scanCodes,
            serviceCodes,
            notes: 'Private insurance claim - itemized billing'
          },
          include: {
            InsuranceProvider: true,
            Patient: { select: { id: true, folderNumber: true, surname: true, otherNames: true } },
            Attendance: { select: { id: true, attendanceNumber: true } }
          }
        });

        return {
          claim: privateClaim,
          serviceCount: serviceCodes.length + labTestCodes.length + medicationCodes.length + procedureCodes.length + scanCodes.length
        };
      });

      res.status(201).json({
        success: true,
        message: 'Private insurance claim generated successfully',
        data: result
      });

    } catch (error) {
      console.error('❌ Error generating private insurance claim:', error);
      res.status(500).json({
        success: false,
        message: 'Error generating private insurance claim',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  }
];