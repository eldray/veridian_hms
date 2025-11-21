// controllers/insuranceClaimController.ts - UPDATED VERSION
import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthRequest } from '../middleware/authMiddleware';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ==========================================
// BASIC VIEWING FUNCTIONS - UPDATED
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


/**
 * Get specific insurance claim by ID - FIXED VERSION
 */
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
// GENERATE CLAIM DRAFT - UPDATED WITH SERVICE CATALOG
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
        // Check if claim already exists
        const existingClaim = await tx.insuranceClaim.findFirst({
          where: { attendanceId }
        });

        if (existingClaim) {
          console.log('ℹ️ Claim already exists for attendance:', attendanceId);
          return existingClaim;
        }

        // ✅ UPDATED: Get attendance data with SERVICE CATALOG relations
        const attendance = await tx.attendance.findUnique({
          where: { id: attendanceId },
          include: {
            patient: {
              include: {
                insuranceProvider: true
              }
            },
            insuranceProvider: true,
            bill: true,
            diagnoses: {
              include: { 
                diagnosis: {
                  select: {
                    id: true,
                    name: true,
                    icdCode: true,
                    gdrgCode: true
                  }
                } 
              }
            },
            servicesRendered: {
              include: { 
                serviceCatalog: { // ✅ UPDATED: serviceItem → serviceCatalog
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
            labTests: {
              include: {
                serviceCatalog: { // ✅ UPDATED: template → serviceCatalog
                  select: {
                    id: true,
                    name: true,
                    code: true,
                    nhisServiceCode: true
                  }
                }
              }
            },
            medications: {
              include: {
                serviceCatalog: { // ✅ UPDATED for pricing codes
                  select: {
                    id: true,
                    name: true,
                    code: true,
                    nhisServiceCode: true
                  }
                },
                stockItem: { // ✅ KEEP for drug codes
                  select: {
                    id: true,
                    name: true,
                    drugCode: true
                  }
                }
              }
            },
            procedures: {
              include: {
                serviceCatalog: { // ✅ UPDATED: template → serviceCatalog
                  select: {
                    id: true,
                    name: true,
                    code: true,
                    nhisServiceCode: true
                  }
                }
              }
            },
            scans: {
              include: {
                serviceCatalog: { // ✅ UPDATED: template → serviceCatalog
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

        if (!attendance) {
          throw new Error('Attendance not found');
        }

        if (!attendance.insuranceProviderId) {
          throw new Error('Attendance has no insurance provider');
        }

        // Generate claim number
        const claimNumber = `CLM-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

        // ✅ UPDATED: Extract codes from SERVICE CATALOG
        const diagnosisCodes = attendance.diagnoses
          .map(d => d.diagnosis?.icdCode)
          .filter(Boolean) as string[];

        // Get procedure codes from procedures with service catalog
        const procedureCodes = attendance.procedures
          .map(p => p.serviceCatalog?.nhisServiceCode)
          .filter(Boolean) as string[];
        
        // Get lab test codes from service catalog
        const labTestCodes = attendance.labTests
          .map(lt => lt.serviceCatalog?.nhisServiceCode)
          .filter(Boolean) as string[];
        
        // Get medication codes - prefer service catalog, fallback to stock item
        const medicationCodes = attendance.medications
          .map(m => m.serviceCatalog?.nhisServiceCode || m.stockItem?.drugCode)
          .filter(Boolean) as string[];
        
        // Get scan codes from service catalog
        const scanCodes = attendance.scans
          .map(s => s.serviceCatalog?.nhisServiceCode)
          .filter(Boolean) as string[];
        
        // Get service codes from services rendered (non-procedure services)
        const serviceCodes = attendance.servicesRendered
          .filter(s => s.serviceCatalog && !['procedure'].includes(s.serviceCatalog.serviceType))
          .map(s => s.serviceCatalog?.nhisServiceCode)
          .filter(Boolean) as string[];

        // Calculate total claim amount
        const totalClaimAmount = attendance.bill?.insuranceCovered || 
                                attendance.bill?.totalAmount || 0;

        // Extract insurance information
        const insuranceDetails = attendance.patient.insuranceDetails as any;
        const insuranceNumber = insuranceDetails?.memberId || 'N/A';
        const attendanceCCC = attendance.nhisCCC || 'N/A';

        console.log('📋 Insurance details for claim:', {
          insuranceNumber,
          attendanceCCC,
          patientId: attendance.patientId,
          provider: attendance.insuranceProvider?.name
        });

        // Create claim draft
        const claim = await tx.insuranceClaim.create({
          data: {
            claimNumber,
            billId: attendance.bill?.id,
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
            insuranceProvider: true,
            patient: {
              select: {
                id: true,
                folderNumber: true,
                surname: true,
                otherNames: true
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
          data: { insuranceClaimId: claim.id }
        });

        return {
          ...claim,
          insuranceData: {
            insuranceNumber,
            attendanceCCC
          }
        };
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
// GET CLAIM DRAFT - UPDATED WITH SERVICE CATALOG
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
            dateOfBirth: true,
            gender: true,
            contact: true
          }
        },
        attendance: {
          select: {
            id: true,
            attendanceNumber: true,
            dateTime: true,
            status: true,
            encounterCategory: true,
            nhisCCC: true
          }
        },
        bill: {
          select: {
            id: true,
            billNumber: true,
            totalAmount: true,
            insuranceCovered: true,
            patientPayable: true
          }
        },
        createdBy: {
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
        message: 'Claim not found'
      });
    }

    // Get patient insurance details
    const patient = await prisma.patient.findUnique({
      where: { id: claim.patientId },
      select: {
        insuranceDetails: true
      }
    });

    // Extract insurance information
    const insuranceDetails = patient?.insuranceDetails as any;
    const insuranceNumber = insuranceDetails?.memberId || 'N/A';
    const attendanceCCC = claim.attendance?.nhisCCC || 'N/A';

    // ✅ UPDATED: Get editable services and diagnoses with SERVICE CATALOG
    const attendanceDetails = await prisma.attendance.findUnique({
      where: { id: claim.attendanceId },
      include: {
        diagnoses: {
          include: {
            diagnosis: {
              select: {
                id: true,
                name: true,
                icdCode: true,
                gdrgCode: true
              }
            }
          }
        },
        servicesRendered: {
          include: {
            serviceCatalog: { // ✅ UPDATED: serviceItem → serviceCatalog
              select: {
                id: true,
                name: true,
                code: true,
                nhisServiceCode: true,
                serviceCategory: true
              }
            }
          }
        },
        labTests: {
          include: {
            serviceCatalog: { // ✅ UPDATED: template → serviceCatalog
              select: {
                id: true,
                name: true,
                code: true,
                nhisServiceCode: true
              }
            }
          }
        },
        medications: {
          include: {
            serviceCatalog: { // ✅ UPDATED for pricing
              select: {
                id: true,
                name: true,
                code: true,
                nhisServiceCode: true
              }
            },
            stockItem: { // ✅ KEEP for inventory
              select: {
                id: true,
                name: true,
                drugCode: true
              }
            }
          }
        },
        procedures: {
          include: {
            serviceCatalog: { // ✅ UPDATED: template → serviceCatalog
              select: {
                id: true,
                name: true,
                code: true,
                nhisServiceCode: true
              }
            }
          }
        },
        scans: {
          include: {
            serviceCatalog: { // ✅ UPDATED: template → serviceCatalog
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

    const editableData = {
      claim,
      insuranceData: {
        insuranceNumber,
        attendanceCCC
      },
      diagnoses: attendanceDetails?.diagnoses || [],
      services: attendanceDetails?.servicesRendered || [],
      labTests: attendanceDetails?.labTests || [],
      medications: attendanceDetails?.medications || [],
      procedures: attendanceDetails?.procedures || [], // ✅ ADDED
      scans: attendanceDetails?.scans || [],
      canEdit: claim.status === 'draft'
    };

    res.json({
      success: true,
      data: editableData
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
// UPDATE CLAIM DRAFT - UPDATED WITH SERVICE CATALOG
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
      const { 
        diagnosisCodes, 
        procedureCodes, 
        labTestCodes,
        medicationCodes,
        scanCodes,
        serviceCodes,
        totalClaimAmount, 
        notes 
      } = req.body;

      // Check if claim exists and is editable
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
          insuranceProvider: true,
          patient: {
            select: {
              id: true,
              folderNumber: true,
              surname: true,
              otherNames: true
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
              billNumber: true,
              totalAmount: true
            }
          }
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
// FINALIZE CLAIM - UPDATED
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

    // Update claim status to finalized
    const finalizedClaim = await prisma.insuranceClaim.update({
      where: { id: claimId },
      data: {
        status: 'submitted',
        submissionDate: new Date(),
        updatedById: req.user.id
      },
      include: {
        insuranceProvider: true,
        patient: {
          select: {
            id: true,
            folderNumber: true,
            surname: true,
            otherNames: true
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
// GENERATE CLAIM XML - UPDATED WITH SERVICE CATALOG
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

    // ✅ UPDATED: Get claim with SERVICE CATALOG relations
    const claim = await prisma.insuranceClaim.findUnique({
      where: { id: claimId },
      include: {
        attendance: {
          include: {
            patient: {
              include: {
                insuranceProvider: true
              }
            },
            diagnoses: {
              include: { 
                diagnosis: {
                  select: {
                    id: true,
                    name: true,
                    icdCode: true,
                    gdrgCode: true
                  }
                } 
              }
            },
            servicesRendered: {
              include: { 
                serviceCatalog: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                    nhisServiceCode: true
                  }
                }
              }
            },
            labTests: {
              include: {
                serviceCatalog: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                    nhisServiceCode: true
                  }
                }
              }
            },
            medications: {
              include: {
                serviceCatalog: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                    nhisServiceCode: true
                  }
                },
                stockItem: {
                  select: {
                    id: true,
                    name: true,
                    drugCode: true
                  }
                }
              }
            },
            procedures: {
              include: {
                serviceCatalog: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                    nhisServiceCode: true
                  }
                }
              }
            },
            scans: {
              include: {
                serviceCatalog: {
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
        },
        insuranceProvider: true
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

    // Extract insurance information
    const insuranceDetails = claim.attendance.patient.insuranceDetails as any;
    const insuranceNumber = insuranceDetails?.memberId || 'N/A';
    const attendanceCCC = claim.attendance.nhisCCC || 'N/A';

    // ✅ UPDATED: Count services from SERVICE CATALOG
    const totalServices = 
      (claim.attendance.servicesRendered?.length || 0) +
      (claim.attendance.labTests?.length || 0) +
      (claim.attendance.medications?.length || 0) +
      (claim.attendance.procedures?.length || 0) +
      (claim.attendance.scans?.length || 0);

    // Generate comprehensive XML
    const claimXML = `<?xml version="1.0" encoding="UTF-8"?>
<InsuranceClaim>
  <ClaimNumber>${claim.claimNumber}</ClaimNumber>
  <Patient>
    <FolderNumber>${claim.attendance.patient.folderNumber}</FolderNumber>
    <Name>${claim.attendance.patient.surname} ${claim.attendance.patient.otherNames}</Name>
    <InsuranceNumber>${insuranceNumber}</InsuranceNumber>
    <AttendanceCCC>${attendanceCCC}</AttendanceCCC>
    <DateOfBirth>${claim.attendance.patient.dateOfBirth.toISOString().split('T')[0]}</DateOfBirth>
    <Gender>${claim.attendance.patient.gender}</Gender>
  </Patient>
  <Provider>
    <Name>${claim.insuranceProvider?.name || 'Unknown'}</Name>
    <Type>${claim.insuranceProvider?.type || 'Unknown'}</Type>
    <CoveragePercentage>${claim.insuranceProvider?.coveragePercentage || 0}</CoveragePercentage>
  </Provider>
  <Attendance>
    <AttendanceNumber>${claim.attendance.attendanceNumber}</AttendanceNumber>
    <DateTime>${claim.attendance.dateTime.toISOString()}</DateTime>
    <EncounterCategory>${claim.attendance.encounterCategory}</EncounterCategory>
  </Attendance>
  <Financial>
    <TotalAmount>${claim.totalClaimAmount}</TotalAmount>
    <DiagnosisCount>${claim.diagnosisCodes.length}</DiagnosisCount>
    <ServiceCount>${totalServices}</ServiceCount>
  </Financial>
  <Status>${claim.status}</Status>
  <SubmissionDate>${claim.submissionDate?.toISOString() || new Date().toISOString()}</SubmissionDate>
  <GeneratedAt>${new Date().toISOString()}</GeneratedAt>
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
// GENERATE CLAIM PRINT - UPDATED WITH SERVICE CATALOG
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
            dateOfBirth: true,
            gender: true,
            contact: true
          }
        },
        attendance: {
          select: {
            id: true,
            attendanceNumber: true,
            dateTime: true,
            status: true,
            nhisCCC: true,
            encounterCategory: true
          }
        },
        bill: {
          select: {
            id: true,
            billNumber: true,
            totalAmount: true,
            insuranceCovered: true,
            patientPayable: true
          }
        },
        createdBy: {
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
        message: 'Claim not found'
      });
    }

    // Get patient insurance details
    const patient = await prisma.patient.findUnique({
      where: { id: claim.patientId },
      select: {
        insuranceDetails: true
      }
    });

    // Extract insurance information
    const insuranceDetails = patient?.insuranceDetails as any;
    const insuranceNumber = insuranceDetails?.memberId || 'N/A';
    const attendanceCCC = claim.attendance?.nhisCCC || 'N/A';

    // ✅ UPDATED: Get detailed services and diagnoses with SERVICE CATALOG
    const attendanceDetails = await prisma.attendance.findUnique({
      where: { id: claim.attendanceId },
      include: {
        diagnoses: {
          include: {
            diagnosis: {
              select: {
                id: true,
                name: true,
                icdCode: true,
                gdrgCode: true
              }
            }
          }
        },
        servicesRendered: {
          include: {
            serviceCatalog: {
              select: {
                id: true,
                name: true,
                code: true,
                nhisServiceCode: true,
                serviceCategory: true
              }
            }
          }
        },
        labTests: {
          include: {
            serviceCatalog: {
              select: {
                id: true,
                name: true,
                code: true,
                nhisServiceCode: true
              }
            }
          }
        },
        medications: {
          include: {
            serviceCatalog: {
              select: {
                id: true,
                name: true,
                code: true,
                nhisServiceCode: true
              }
            },
            stockItem: {
              select: {
                id: true,
                name: true,
                drugCode: true
              }
            }
          }
        },
        procedures: {
          include: {
            serviceCatalog: {
              select: {
                id: true,
                name: true,
                code: true,
                nhisServiceCode: true
              }
            }
          }
        },
        scans: {
          include: {
            serviceCatalog: {
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

    // ✅ ADDED: Calculate patient full name
    const patientFullName = `${claim.patient.surname} ${claim.patient.otherNames}`.trim();

    const printData = {
      claim,
      patient: {
        ...claim.patient,
        fullName: patientFullName
      },
      provider: claim.insuranceProvider,
      attendance: claim.attendance,
      bill: claim.bill,
      insuranceData: {
        insuranceNumber,
        attendanceCCC
      },
      diagnoses: attendanceDetails?.diagnoses || [],
      services: attendanceDetails?.servicesRendered || [],
      labTests: attendanceDetails?.labTests || [],
      medications: attendanceDetails?.medications || [],
      procedures: attendanceDetails?.procedures || [],
      scans: attendanceDetails?.scans || [],
      generatedAt: new Date(),
      generatedBy: req.user?.id
    };

    res.json({
      success: true,
      message: 'Claim data ready for printing',
      data: printData
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
// GET FINALIZED CLAIMS TOTAL - UPDATED
// ==========================================

export const getFinalizedClaimsTotal = async (req: AuthRequest, res: Response) => {
  try {
    const { dateFrom, dateTo } = req.query;

    // Build date filter
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

    // Get finalized claims (submitted status means finalized in our workflow)
    const finalizedClaims = await prisma.insuranceClaim.findMany({
      where: {
        status: 'submitted', // Finalized claims
        ...(dateFrom || dateTo ? { submissionDate: dateFilter } : {})
      },
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
            surname: true,
            otherNames: true
          }
        }
      },
      orderBy: { submissionDate: 'desc' }
    });

    // Calculate totals
    const totalAmount = finalizedClaims.reduce((sum, claim) => sum + claim.totalClaimAmount, 0);
    
    const byInsuranceType = {
      nhis: {
        claims: finalizedClaims.filter(claim => claim.insuranceProvider?.type === 'nhis'),
        totalAmount: finalizedClaims
          .filter(claim => claim.insuranceProvider?.type === 'nhis')
          .reduce((sum, claim) => sum + claim.totalClaimAmount, 0)
      },
      private: {
        claims: finalizedClaims.filter(claim => claim.insuranceProvider?.type === 'private'),
        totalAmount: finalizedClaims
          .filter(claim => claim.insuranceProvider?.type === 'private')
          .reduce((sum, claim) => sum + claim.totalClaimAmount, 0)
      }
    };

    // ✅ ADDED: Calculate patient full names for response
    const claimsWithFullNames = finalizedClaims.map(claim => ({
      id: claim.id,
      claimNumber: claim.claimNumber,
      patientName: `${claim.patient.surname} ${claim.patient.otherNames}`.trim(),
      patientFolder: claim.patient.folderNumber,
      insuranceProvider: claim.insuranceProvider?.name,
      amount: claim.totalClaimAmount,
      submissionDate: claim.submissionDate
    }));

    res.json({
      success: true,
      data: {
        totalFinalizedClaims: finalizedClaims.length,
        totalAmount,
        byInsuranceType,
        claims: claimsWithFullNames
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
// GET CLAIM BY ATTENDANCE ID - UPDATED
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
        message: 'No insurance claim found for this attendance'
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

// ==========================================
// UPDATE CLAIM STATUS - NEW FUNCTION
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

      // Set submission date when moving to submitted
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
          insuranceProvider: true,
          patient: {
            select: {
              id: true,
              folderNumber: true,
              surname: true,
              otherNames: true
            }
          },
          attendance: {
            select: {
              id: true,
              attendanceNumber: true
            }
          }
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