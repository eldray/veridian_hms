// controllers/diagnosisController.ts - CORRECTED FOR SIMPLIFIED SCHEMA
import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthRequest } from '../middleware/authMiddleware';
import { PrismaClient, MorbidityGroup } from '@prisma/client';

const prisma = new PrismaClient();

const handleError = (res: Response, message: string, error: any, statusCode = 500) => {
  console.error(`❌ ${message}:`, error);
  res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
};

// ============================================
// GET ALL DIAGNOSES
// ============================================
export const getDiagnoses = async (req: Request, res: Response) => {
  const { page = 1, limit = 100 } = req.query;
  const take = Math.min(parseInt(limit as string), 100);
  const skip = (parseInt(page as string) - 1) * take;
  
  const [diagnoses, total] = await Promise.all([
    prisma.diagnosis.findMany({
      skip,
      take,
      orderBy: { name: 'asc' }
    }),
    prisma.diagnosis.count()
  ]);
  
  res.json({
    success: true,
    data: diagnoses,
    pagination: {
      page: parseInt(page as string),
      limit: take,
      total,
      pages: Math.ceil(total / take)
    }
  });
};

// ============================================
// GET DIAGNOSIS BY ID
// ============================================
export const getDiagnosisById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const diagnosis = await prisma.diagnosis.findUnique({
      where: { id },
      include: {
        // ✅ GDRG tariff mapping via junction table
        gdrgTariffDiagnoses: {
          include: {
            gdrgTariff: {
              select: {
                id: true,
                gdrgCode: true,
                mdc: true,
                description: true,
                nhiaTariff: true,
                ageSplit: true,
                minAgeYears: true,
                maxAgeYears: true,
                applicableLevels: true,
                nhisServiceCode: true,
                isZoomCode: true,
                effectiveFrom: true,
                effectiveTo: true,
                isActive: true
              }
            }
          }
        },
        // ✅ Admissions where this is the principal diagnosis
        admissionsAsPrincipal: {
          include: {
            Patient: {
              select: {
                id: true,
                folderNumber: true,
                surname: true,
                otherNames: true
              }
            },
            Ward: {
              select: {
                id: true,
                wardName: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        // ✅ Attendance diagnoses (unified - works for OPD and IPD)
        attendanceDiagnoses: {
          include: {
            Attendance: {
              include: {
                Patient: {
                  select: {
                    id: true,
                    folderNumber: true,
                    surname: true,
                    otherNames: true
                  }
                }
              }
            },
            User: {
              select: {
                id: true,
                fullName: true,
                role: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        ServiceCatalog: {
          select: {
            id: true,
            name: true,
            code: true,
            serviceType: true,
            serviceCategory: true,
            pricing: {
              select: {
                cashPrice: true,
                nhisPrice: true,
                insurancePrice: true
              }
            }
          }
        }
      }
    });

    if (!diagnosis) {
      return res.status(404).json({
        success: false,
        message: 'Diagnosis not found'
      });
    }

    res.json({
      success: true,
      data: diagnosis
    });
  } catch (error) {
    handleError(res, 'Error fetching diagnosis', error);
  }
};

// ============================================
// CREATE DIAGNOSIS
// ============================================
export const createDiagnosis = [
  body('name').notEmpty().withMessage('Diagnosis name is required').trim(),
  body('icdCode').notEmpty().withMessage('ICD code is required').trim().toUpperCase(),
  body('morbidityGroup').notEmpty().withMessage('Morbidity group is required'),

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
        name,
        icdCode,
        morbidityGroup,
        description,
        requiresAuthorization,
        isChronic,
        isNHISCovered,
        tariffCode
      } = req.body;

      // Check if ICD code already exists
      const existingByIcd = await prisma.diagnosis.findFirst({
        where: { icdCode: icdCode.trim().toUpperCase() }
      });

      if (existingByIcd) {
        return res.status(400).json({
          success: false,
          message: `Diagnosis with ICD code ${icdCode} already exists`
        });
      }

      // ✅ Create diagnosis - NO gdrgGroupCode or gdrgTariffDiagnoses scalar field
      const diagnosis = await prisma.diagnosis.create({
        data: {
          name: name.trim(),
          icdCode: icdCode.trim().toUpperCase(),
          morbidityGroup: morbidityGroup as MorbidityGroup,
          description: description?.trim(),
          requiresAuthorization: requiresAuthorization || false,
          isChronic: isChronic || false,
          isNHISCovered: isNHISCovered !== undefined ? isNHISCovered : true,
          tariffCode: tariffCode || `DIAG-${icdCode}`,
          isActive: true
        },
        include: {
          gdrgTariffDiagnoses: {
            include: {
              gdrgTariff: {
                select: {
                  gdrgCode: true,
                  nhiaTariff: true
                }
              }
            }
          }
        }
      });

      res.status(201).json({
        success: true,
        data: diagnosis,
        message: 'Diagnosis created successfully'
      });
    } catch (error) {
      handleError(res, 'Error creating diagnosis', error);
    }
  }
];

// ============================================
// UPDATE DIAGNOSIS
// ============================================
export const updateDiagnosis = [
  body('name').optional().trim(),
  body('icdCode').optional().trim().toUpperCase(),
  body('morbidityGroup').optional(),
  body('isActive').optional().isBoolean(),

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
      const { icdCode, ...restData } = req.body;
      const updateData: any = { ...restData, updatedAt: new Date() };

      const existingDiagnosis = await prisma.diagnosis.findUnique({
        where: { id }
      });

      if (!existingDiagnosis) {
        return res.status(404).json({
          success: false,
          message: 'Diagnosis not found'
        });
      }

      // Check for duplicate ICD code if changing
      if (icdCode && icdCode !== existingDiagnosis.icdCode) {
        const duplicateIcd = await prisma.diagnosis.findFirst({
          where: {
            icdCode: icdCode.trim().toUpperCase(),
            id: { not: id }
          }
        });

        if (duplicateIcd) {
          return res.status(400).json({
            success: false,
            message: `Diagnosis with ICD code ${icdCode} already exists`
          });
        }
        updateData.icdCode = icdCode.trim().toUpperCase();
      }

      const diagnosis = await prisma.diagnosis.update({
        where: { id },
        data: updateData,
        include: {
          gdrgTariffDiagnoses: {
            include: {
              gdrgTariff: {
                select: {
                  gdrgCode: true,
                  nhiaTariff: true
                }
              }
            }
          }
        }
      });

      res.json({
        success: true,
        data: diagnosis,
        message: 'Diagnosis updated successfully'
      });
    } catch (error) {
      handleError(res, 'Error updating diagnosis', error);
    }
  }
];

// ============================================
// DELETE DIAGNOSIS
// ============================================
export const deleteDiagnosis = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const diagnosis = await prisma.diagnosis.findUnique({
      where: { id },
      include: {
        admissionsAsPrincipal: { take: 1 },
        attendanceDiagnoses: { take: 1 },
        ServiceCatalog: { take: 1 },
        gdrgTariffDiagnoses: { take: 1 }
      }
    });

    if (!diagnosis) {
      return res.status(404).json({
        success: false,
        message: 'Diagnosis not found'
      });
    }

    // Check for related records
    const hasRelatedRecords = 
      diagnosis.admissionsAsPrincipal.length > 0 ||
      diagnosis.attendanceDiagnoses.length > 0 ||
      diagnosis.ServiceCatalog.length > 0 ||
      diagnosis.gdrgTariffDiagnoses.length > 0;

    if (hasRelatedRecords) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete diagnosis with existing admissions, attendances, service catalog entries, or GDRG tariff associations'
      });
    }

    await prisma.diagnosis.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Diagnosis deleted successfully'
    });
  } catch (error) {
    handleError(res, 'Error deleting diagnosis', error);
  }
};

// ============================================
// SEARCH DIAGNOSES
// ============================================
export const searchDiagnoses = async (req: AuthRequest, res: Response) => {
  try {
    const { q, field = 'all' } = req.query;
    
    if (!q || (q as string).trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query of at least 2 characters is required'
      });
    }

    const searchTerm = (q as string).trim();
    const where: any = { OR: [] };

    if (field === 'all' || field === 'name') {
      where.OR.push({ name: { contains: searchTerm, mode: 'insensitive' } });
    }
    
    if (field === 'all' || field === 'icdCode') {
      where.OR.push({ icdCode: { contains: searchTerm, mode: 'insensitive' } });
    }
    
    if (field === 'all' || field === 'morbidityGroup') {
      where.OR.push({ morbidityGroup: { equals: searchTerm as any } });
    }

    if (where.OR.length === 0) {
      where.OR.push({ name: { contains: searchTerm, mode: 'insensitive' } });
    }

    const diagnoses = await prisma.diagnosis.findMany({
      where,
      select: {
        id: true,
        name: true,
        icdCode: true,
        morbidityGroup: true,
        description: true,
        isActive: true
      },
      orderBy: { name: 'asc' },
      take: 50
    });

    res.json({
      success: true,
      data: diagnoses
    });
  } catch (error) {
    handleError(res, 'Error searching diagnoses', error);
  }
};

// ============================================
// GET DIAGNOSIS STATISTICS
// ============================================
export const getDiagnosisStats = async (req: AuthRequest, res: Response) => {
  try {
    const [
      totalDiagnoses,
      activeDiagnoses,
      diagnosesByMorbidityGroup,
      recentDiagnoses,
      diagnosesWithGDRG
    ] = await Promise.all([
      prisma.diagnosis.count(),
      prisma.diagnosis.count({ where: { isActive: true } }),
      prisma.diagnosis.groupBy({
        by: ['morbidityGroup'],
        _count: true
      }),
      prisma.diagnosis.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      prisma.diagnosis.count({
        where: {
          gdrgTariffDiagnoses: { some: {} }
        }
      })
    ]);

    const stats = {
      total: totalDiagnoses,
      active: activeDiagnoses,
      inactive: totalDiagnoses - activeDiagnoses,
      byMorbidityGroup: diagnosesByMorbidityGroup,
      recentAdditions: recentDiagnoses,
      diagnosesWithGDRG,
      gdrgCoverage: totalDiagnoses > 0 ? ((diagnosesWithGDRG / totalDiagnoses) * 100).toFixed(1) + '%' : '0%'
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    handleError(res, 'Error fetching diagnosis stats', error);
  }
};

// ============================================
// GET MORBIDITY GROUPS
// ============================================
export const getMorbidityGroups = async (req: AuthRequest, res: Response) => {
  try {
    const morbidityGroups = Object.values(MorbidityGroup);
    res.json({
      success: true,
      data: morbidityGroups
    });
  } catch (error) {
    handleError(res, 'Error fetching morbidity groups', error);
  }
};

// ============================================
// GET DIAGNOSES BY MORBIDITY GROUP
// ============================================
export const getDiagnosesByMorbidityGroup = async (req: AuthRequest, res: Response) => {
  try {
    const { morbidityGroup } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    const where: any = { morbidityGroup: morbidityGroup as MorbidityGroup };

    const [diagnoses, total] = await Promise.all([
      prisma.diagnosis.findMany({
        where,
        select: {
          id: true,
          name: true,
          icdCode: true,
          morbidityGroup: true,
          description: true,
          isActive: true
        },
        orderBy: { name: 'asc' },
        skip,
        take: limitNum
      }),
      prisma.diagnosis.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        morbidityGroup,
        count: total,
        diagnoses
      },
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalDiagnoses: total,
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1
      }
    });
  } catch (error) {
    handleError(res, 'Error fetching diagnoses by morbidity group', error);
  }
};
