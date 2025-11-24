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
          InsuranceProvider: { // ✅ FIXED: Capitalized
            select: {
              id: true,
              name: true,
              type: true,
              coveragePercentage: true
            }
          },
          Patient: { // ✅ FIXED: Capitalized
            select: {
              id: true,
              folderNumber: true,
              surname: true,
              otherNames: true,
              contact: true
            }
          },
          Attendance: { // ✅ FIXED: Capitalized
            select: {
              id: true,
              attendanceNumber: true,
              dateTime: true,
              status: true
            }
          },
          Bill: { // ✅ FIXED: Capitalized
            select: {
              id: true,
              billNumber: true,
              totalAmount: true
            }
          },
          User_InsuranceClaim_createdByIdToUser: { // ✅ FIXED: Correct relation name
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
        InsuranceProvider: { // ✅ FIXED: Capitalized
          select: {
            id: true,
            name: true,
            type: true,
            coveragePercentage: true
          }
        },
        Patient: { // ✅ FIXED: Capitalized
          select: {
            id: true,
            folderNumber: true,
            surname: true,
            otherNames: true,
            contact: true
          }
        },
        Attendance: { // ✅ FIXED: Capitalized
          select: {
            id: true,
            attendanceNumber: true,
            dateTime: true,
            status: true
          }
        },
        Bill: { // ✅ FIXED: Capitalized
          select: {
            id: true,
            billNumber: true,
            totalAmount: true,
            insuranceCovered: true
          }
        },
        User_InsuranceClaim_createdByIdToUser: { // ✅ FIXED: Correct relation name
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
            Patient: { // ✅ FIXED: Capitalized
              include: {
                InsuranceProvider: true // ✅ FIXED: Capitalized
              }
            },
            InsuranceProvider: true, // ✅ FIXED: Capitalized
            Bill: true, // ✅ CORRECT
            AttendanceDiagnosis: { // ✅ FIXED: Correct relation name
              include: { 
                Diagnosis: {
                  select: {
                    id: true,
                    name: true,
                    icdCode: true,
                    gdrgCode: true
                  }
                } 
              }
            },
            ServiceRendered: { // ✅ FIXED: Capitalized
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
            LabTest: { // ✅ FIXED: Capitalized
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
            Medication: { // ✅ FIXED: Capitalized
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
            Procedure: { // ✅ FIXED: Capitalized
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
            Scan: { // ✅ FIXED: Capitalized
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
            InsuranceProvider: true, // ✅ FIXED: Capitalized
            Patient: { // ✅ FIXED: Capitalized
              select: {
                id: true,
                folderNumber: true,
                surname: true,
                otherNames: true
              }
            },
            Attendance: { // ✅ FIXED: Capitalized
              select: {
                id: true,
                attendanceNumber: true
              }
            },
            Bill: { // ✅ FIXED: Capitalized
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

    const attendanceDetails = await prisma.attendance.findUnique({
      where: { id: claim.attendanceId },
      include: {
        AttendanceDiagnosis: {
          include: {
            Diagnosis: {
              select: {
                id: true,
                name: true,
                icdCode: true,
                gdrgCode: true
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
                serviceCategory: true
              }
            }
          }
        },
        LabTest: {
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
          InsuranceProvider: true,
          Patient: {
            select: {
              id: true,
              folderNumber: true,
              surname: true,
              otherNames: true
            }
          },
          Attendance: {
            select: {
              id: true,
              attendanceNumber: true
            }
          },
          Bill: {
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

      console.error('❌ Error updating claim draft:', error);
    } catch (error) {
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

    // ✅ FIXED: All relation names corrected to match schema
    const claim = await prisma.insuranceClaim.findUnique({
      where: { id: claimId },
      include: {
        Attendance: {
          include: {
            Patient: {
              include: {
                InsuranceProvider: true
              }
            },
            AttendanceDiagnosis: {
              include: {
                Diagnosis: {
                  select: {
                    name: true,
                    icdCode: true,
                    gdrgCode: true
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
                    nhisServiceCode: true
                  }
                }
              }
            },
            LabTest: {
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

    // ✅ FIXED: All relation names corrected with safe access
    const insuranceDetails = claim.Attendance?.Patient?.insuranceDetails as any;
    const insuranceNumber = insuranceDetails?.memberId || 'N/A';
    const attendanceCCC = claim.Attendance?.nhisCCC || 'N/A';

    // ✅ FIXED: Patient access with safe fallbacks
    const patientFullName = claim.Patient 
      ? `${claim.Patient.surname || ''} ${claim.Patient.otherNames || ''}`.trim()
      : 'Unknown Patient';

    const patientFolderNumber = claim.Attendance?.Patient?.folderNumber || 'No Folder';
    const patientDateOfBirth = claim.Attendance?.Patient?.dateOfBirth;
    const patientGender = claim.Attendance?.Patient?.gender || 'Unknown';

    // ✅ FIXED: Count services using CORRECT capitalized relation names
    const totalServices = 
      (claim.Attendance?.ServiceRendered?.length || 0) +
      (claim.Attendance?.LabTest?.length || 0) +
      (claim.Attendance?.Medication?.length || 0) +
      (claim.Attendance?.Procedure?.length || 0) +
      (claim.Attendance?.Scan?.length || 0);

    // ✅ FIXED: Generate XML with CORRECT relation names
    const claimXML = `<?xml version="1.0" encoding="UTF-8"?>
<InsuranceClaim>
  <ClaimNumber>${claim.claimNumber}</ClaimNumber>
  <Patient>
    <FolderNumber>${patientFolderNumber}</FolderNumber>
    <Name>${patientFullName}</Name>
    <InsuranceNumber>${insuranceNumber}</InsuranceNumber>
    <AttendanceCCC>${attendanceCCC}</AttendanceCCC>
    <DateOfBirth>${patientDateOfBirth ? patientDateOfBirth.toISOString().split('T')[0] : 'Unknown'}</DateOfBirth>
    <Gender>${patientGender}</Gender>
  </Patient>
  <Provider>
    <Name>${claim.InsuranceProvider?.name || 'Unknown'}</Name>
    <Type>${claim.InsuranceProvider?.type || 'Unknown'}</Type>
    <CoveragePercentage>${claim.InsuranceProvider?.coveragePercentage || 0}</CoveragePercentage>
  </Provider>
  <Attendance>
    <AttendanceNumber>${claim.Attendance?.attendanceNumber || 'Unknown'}</AttendanceNumber>
    <DateTime>${claim.Attendance?.dateTime?.toISOString() || new Date().toISOString()}</DateTime>
    <EncounterCategory>${claim.Attendance?.encounterCategory || 'Unknown'}</EncounterCategory>
  </Attendance>
  <Financial>
    <TotalAmount>${claim.totalClaimAmount}</TotalAmount>
    <DiagnosisCount>${claim.diagnosisCodes.length}</DiagnosisCodes.length>
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
            dateOfBirth: true,
            gender: true,
            contact: true
          }
        },
        Attendance: {
          select: {
            id: true,
            attendanceNumber: true,
            dateTime: true,
            status: true,
            nhisCCC: true,
            encounterCategory: true
          }
        },
        Bill: {
          select: {
            id: true,
            billNumber: true,
            totalAmount: true,
            insuranceCovered: true,
            patientPayable: true
          }
        },
        // ✅ FIX: Use correct relation names
        User_InsuranceClaim_createdByIdToUser: {
          select: {
            fullName: true,
            username: true
          }
        },
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
        AttendanceDiagnosis: {
          include: {
            Diagnosis: {
              select: {
                name: true,
                icdCode: true,
                gdrgCode: true
              }
            },
            User: {
              select: {
                fullName: true,
                role: true
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
                serviceCategory: true
              }
            }
          }
        },
        LabTest: {
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

// ✅ FIXED: Safe patient access with fallback
const patientFullName = claim.Attendance?.Patient 
  ? `${claim.Attendance.Patient.surname || ''} ${claim.Attendance.Patient.otherNames || ''}`.trim()
  : 'Unknown Patient';

const patientFolderNumber = claim.Attendance?.Patient?.folderNumber || 'No Folder';
const patientContact = claim.Attendance?.Patient?.contact || 'No Contact';
    const printData = {
      claim,
      patient: {
        ...claim.Patient,
        fullName: patientFullName
      },
      provider: claim.InsuranceProvider,
      attendance: claim.Attendance,
      bill: claim.Bill,
      insuranceData: {
        insuranceNumber,
        attendanceCCC
      },
      diagnoses: attendanceDetails?.AttendanceDiagnosis || [],
      services: attendanceDetails?.ServiceRendered || [],
      labTests: attendanceDetails?.LabTest || [],
      medications: attendanceDetails?.Medication || [],
      procedures: attendanceDetails?.Procedure || [],
      scans: attendanceDetails?.Scan || [],
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
        InsuranceProvider: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        Patient: { // ✅ FIXED: Capitalized relation name
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
        claims: finalizedClaims.filter(claim => claim.InsuranceProvider?.type === 'nhis'), // ✅ FIXED: Capitalized
        totalAmount: finalizedClaims
          .filter(claim => claim.InsuranceProvider?.type === 'nhis') // ✅ FIXED: Capitalized
          .reduce((sum, claim) => sum + claim.totalClaimAmount, 0)
      },
      private: {
        claims: finalizedClaims.filter(claim => claim.InsuranceProvider?.type === 'private'), // ✅ FIXED: Capitalized
        totalAmount: finalizedClaims
          .filter(claim => claim.InsuranceProvider?.type === 'private') // ✅ FIXED: Capitalized
          .reduce((sum, claim) => sum + claim.totalClaimAmount, 0)
      }
    };

    // ✅ FIXED: Safe patient data access with fallbacks
    const claimsWithFullNames = finalizedClaims.map(claim => ({
      id: claim.id,
      claimNumber: claim.claimNumber,
      patientName: claim.Patient ? `${claim.Patient.surname || ''} ${claim.Patient.otherNames || ''}`.trim() : 'Unknown Patient', // ✅ FIXED: Capitalized + safe access
      patientFolder: claim.Patient?.folderNumber || 'No Folder', // ✅ FIXED: Capitalized + safe access
      insuranceProvider: claim.InsuranceProvider?.name, // ✅ FIXED: Capitalized
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
          InsuranceProvider: true,
          Patient: {
            select: {
              id: true,
              folderNumber: true,
              surname: true,
              otherNames: true
            }
          },
          Attendance: {
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

// ==========================================
// SEPARATE NHIS CLAIM GENERATION
// ==========================================

/**
 * Generate NHIS Claim (GDRG-based, not itemized)
 */
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
        // Check if NHIS claim already exists
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
  
          // Get attendance with NHIS-specific data
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
                      gdrgCode: true
                    }
                  } 
                },
                where: { primary: true }
              },
              ServiceRendered: {
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

        if (!attendance) {
          throw new Error('Attendance not found');
        }

        if (!attendance.InsuranceProvider || attendance.InsuranceProvider.type !== 'nhis') {
          throw new Error('Attendance is not for NHIS provider');
        }

        if (!attendance.nhisCCC) {
          throw new Error('NHIS CCC number is required for NHIS claims');
        }

        // Get primary diagnosis for GDRG calculation
        const primaryDiagnosis = attendance.AttendanceDiagnosis[0]?.Diagnosis;
        if (!primaryDiagnosis) {
          throw new Error('Primary diagnosis required for NHIS claim');
        }

        // Calculate GDRG-based tariff (NHIS specific)
        const gdrgTariff = await calculateGDRGTariff(
          primaryDiagnosis.gdrgCode,
          attendance.attendanceType,
          attendance.patient.dateOfBirth
        );

        // Generate NHIS claim number
        const claimNumber = `NHIS-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

        // Extract NHIS service codes (for reference only)
        const nhisServiceCodes = attendance.ServiceRendered
          .map(s => s.ServiceCatalog?.nhisServiceCode)
          .filter(Boolean) as string[];

        // Create NHIS-specific claim
        const nhisClaim = await tx.insuranceClaim.create({
          data: {
            claimNumber,
            billId: attendance.bill?.id,
            patientId: attendance.patientId,
            attendanceId: attendance.id,
            insuranceProviderId: attendance.insuranceProviderId,
            totalClaimAmount: gdrgTariff.amount, // GDRG tariff amount, not itemized total
            status: 'draft',
            createdById: req.user.id,
            diagnosisCodes: [primaryDiagnosis.icdCode], // Only primary diagnosis for NHIS
            procedureCodes: [],
            labTestCodes: [],
            medicationCodes: [],
            scanCodes: [],
            serviceCodes: nhisServiceCodes, // For reference only
            notes: `NHIS CCC: ${attendance.nhisCCC}, GDRG: ${primaryDiagnosis.gdrgCode}, Tariff: ${gdrgTariff.amount}`
          },
          include: {
            InsuranceProvider: true,
            Patient: {
              select: {
                id: true,
                folderNumber: true,
                surname: true,
                otherNames: true
              }
            },
            Attendance: {
              select: {
                id: true,
                attendanceNumber: true,
                nhisCCC: true
              }
            }
          }
        });

        // Generate NHIS XML
        const nhisXML = generateNHISXMLFormat(nhisClaim, attendance, gdrgTariff, primaryDiagnosis);

        return {
          claim: nhisClaim,
          xml: nhisXML,
          gdrgDetails: gdrgTariff,
          primaryDiagnosis
        };
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
// SEPARATE PRIVATE INSURANCE CLAIM GENERATION
// ==========================================

/**
 * Generate Private Insurance Claim (Itemized billing)
 */
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
        // Check if private insurance claim already exists
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

        // Get attendance with all services for itemized billing
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
                    gdrgCode: true
                  }
                } 
              }
            },
            ServiceRendered: {
              include: { 
                ServiceCatalog: {
                  include: {
                    pricing: true
                  }
                }
              }
            },
            LabTest: {
              include: {
                ServiceCatalog: {
                  include: {
                    pricing: true
                  }
                }
              }
            },
            Medication: {
              include: {
                ServiceCatalog: {
                  include: {
                    pricing: true
                  }
                }
              }
            },
            Procedure: {
              include: {
                ServiceCatalog: {
                  include: {
                    pricing: true
                  }
                }
              }
            },
            Scan: {
              include: {
                ServiceCatalog: {
                  include: {
                    pricing: true
                  }
                }
              }
            }
          }
        });

        if (!attendance) {
          throw new Error('Attendance not found');
        }

        if (!attendance.InsuranceProvider || attendance.InsuranceProvider.type !== 'private') {
          throw new Error('Attendance is not for private insurance provider');
        }

        // Generate claim number
        const claimNumber = `PVT-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

        // Extract all codes for itemized billing
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

        // Calculate total claim amount (itemized total)
        const totalClaimAmount = attendance.bill?.insuranceCovered || 
                                attendance.bill?.totalAmount || 0;

        // Create private insurance claim
        const privateClaim = await tx.insuranceClaim.create({
          data: {
            claimNumber,
            billId: attendance.bill?.id,
            patientId: attendance.patientId,
            attendanceId: attendance.id,
            insuranceProviderId: attendance.insuranceProviderId,
            totalClaimAmount, // Itemized total
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
            Patient: {
              select: {
                id: true,
                folderNumber: true,
                surname: true,
                otherNames: true
              }
            },
            Attendance: {
              select: {
                id: true,
                attendanceNumber: true
              }
            }
          }
        });

        return {
          claim: privateClaim,
          itemizedTotal: totalClaimAmount,
          serviceCount: serviceCodes.length + labTestCodes.length + 
                       medicationCodes.length + procedureCodes.length + scanCodes.length
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

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Calculate GDRG Tariff for NHIS claims
 */
const calculateGDRGTariff = async (gdrgCode: string, attendanceType: string, dateOfBirth: Date): Promise<any> => {
  try {
    // Get GDRG tariff from database
    const gdrgTariff = await prisma.gDRGTariff.findFirst({
      where: { 
        gdrgCode,
        isActive: true,
        effectiveFrom: { lte: new Date() },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: new Date() } }
        ]
      }
    });

    if (!gdrgTariff) {
      throw new Error(`GDRG tariff not found for code: ${gdrgCode}`);
    }

    // Calculate patient age
    const age = calculateAge(dateOfBirth);
    
    // Adjust tariff based on age group if needed
    let adjustedTariff = gdrgTariff.nhiaTariff;
    
    // Apply any age-based adjustments here
    if (gdrgTariff.ageGroup) {
      // Implement age-based tariff adjustments if needed
      console.log(`Applying age group: ${gdrgTariff.ageGroup} for patient age: ${age}`);
    }

    return {
      gdrgCode: gdrgTariff.gdrgCode,
      description: gdrgTariff.description,
      category: gdrgTariff.category,
      baseTariff: gdrgTariff.nhiaTariff,
      amount: adjustedTariff,
      ageGroup: gdrgTariff.ageGroup,
      patientAge: age
    };
  } catch (error) {
    console.error('Error calculating GDRG tariff:', error);
    throw error;
  }
};

/**
 * Generate NHIS XML Format
 */
const generateNHISXMLFormat = (claim: any, attendance: any, gdrgTariff: any, diagnosis: any): string => {
  const patientFullName = `${attendance.Patient.surname} ${attendance.Patient.otherNames}`.trim();
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<NHISClaim xmlns="http://nhis.gov.gh/claims">
  <ClaimHeader>
    <ClaimNumber>${claim.claimNumber}</ClaimNumber>
    <FacilityCode>${process.env.NHIS_FACILITY_CODE || 'FACILITY_CODE'}</FacilityCode>
    <ClaimDate>${new Date().toISOString().split('T')[0]}</ClaimDate>
  </ClaimHeader>
  <PatientInfo>
    <NHISNumber>${attendance.nhisCCC}</NHISNumber>
    <FullName>${patientFullName}</FullName>
    <DateOfBirth>${attendance.Patient.dateOfBirth.toISOString().split('T')[0]}</DateOfBirth>
    <Gender>${attendance.Patient.gender}</Gender>
  </PatientInfo>
  <ClinicalInfo>
    <AttendanceType>${attendance.attendanceType}</AttendanceType>
    <AttendanceDate>${attendance.dateTime.toISOString().split('T')[0]}</AttendanceDate>
    <PrimaryDiagnosis>
      <ICD10Code>${diagnosis.icdCode}</ICD10Code>
      <Description>${diagnosis.name}</Description>
      <GDRGCode>${diagnosis.gdrgCode}</GDRGCode>
    </PrimaryDiagnosis>
  </ClinicalInfo>
  <FinancialInfo>
    <GDRGTariff>
      <Code>${gdrgTariff.gdrgCode}</Code>
      <Description>${gdrgTariff.description}</Description>
      <Category>${gdrgTariff.category}</Category>
      <Amount>${gdrgTariff.amount}</Amount>
    </GDRGTariff>
    <TotalClaimAmount>${gdrgTariff.amount}</TotalClaimAmount>
  </FinancialInfo>
  <ServicesInfo>
    <TotalServices>${claim.serviceCodes.length}</TotalServices>
    <!-- Services listed for reference only (not for pricing) -->
    ${claim.serviceCodes.map((code: string) => `
    <Service>
      <Code>${code}</Code>
    </Service>`).join('')}
  </ServicesInfo>
</NHISClaim>`;
};

/**
 * Calculate age from date of birth
 */
const calculateAge = (dateOfBirth: Date): number => {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};