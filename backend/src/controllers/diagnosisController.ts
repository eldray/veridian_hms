import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthRequest } from '../middleware/authMiddleware';
import { PrismaClient, DiagnosisCategory, DiagnosisVariant } from '@prisma/client';

const prisma = new PrismaClient();

// Utility function for consistent error responses
const handleError = (res: Response, message: string, error: any, statusCode = 500) => {
  console.error(`❌ ${message}:`, error);
  res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
};

export const getDiagnoses = async (req: AuthRequest, res: Response) => {
  try {
    console.log('🩺 Fetching diagnoses...', {
      user: req.user?.username,
      role: req.user?.role
    });

    const {
      page = 1,
      limit = 50,
      search = '',
      category,
      variant,
      isNHISCovered,
      isChronic,
      isPending,
      requiresAuthorization
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string))); // Cap at 100 for performance
    const skip = (pageNum - 1) * limitNum;

    // Build where clause for filtering
    const where: any = {};

    if (isPending !== undefined) {
      where.isPending = isPending === 'true';
    }

    if (search) {
      const searchTerm = `%${search}%`;
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { icdCode: { contains: search as string, mode: 'insensitive' } },
        { gdrgCode: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { tariffCode: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (category) {
      where.category = category as DiagnosisCategory;
    }

    if (variant) {
      where.variant = variant as DiagnosisVariant;
    }

    if (isNHISCovered !== undefined) {
      where.isNHISCovered = isNHISCovered === 'true';
    }

    if (isChronic !== undefined) {
      where.isChronic = isChronic === 'true';
    }

    if (requiresAuthorization !== undefined) {
      where.requiresAuthorization = requiresAuthorization === 'true';
    }

    const [diagnoses, total] = await Promise.all([
      prisma.diagnosis.findMany({
        where,
        include: {
          principalAdmissions: {
            take: 1,
            select: {
              id: true,
              admissionNumber: true,
              patient: {
                select: {
                  surname: true,
otherNames: true,
                  folderNumber: true
                }
              }
            }
          },
          secondaryAdmissions: {
            take: 1,
            select: {
              id: true,
              admission: {
                select: {
                  id: true,
                  admissionNumber: true,
                  patient: {
                    select: {
                      surname: true,
otherNames: true,
                      folderNumber: true
                    }
                  }
                }
              }
            }
          },
          attendanceDiagnoses: {
            take: 1,
            select: {
              id: true,
              attendance: {
                select: {
                  id: true,
                  attendanceNumber: true,
                  patient: {
                    select: {
                      surname: true,
otherNames: true,
                      folderNumber: true
                    }
                  }
                }
              }
            }
          },
          gdrgTariffs: {
            where: {
              isActive: true,
              effectiveFrom: { lte: new Date() },
              OR: [
                { effectiveTo: null },
                { effectiveTo: { gte: new Date() } }
              ]
            },
            take: 1,
            orderBy: { effectiveFrom: 'desc' }
          },
          _count: {
            select: {
              principalAdmissions: true,
              secondaryAdmissions: true,
              attendanceDiagnoses: true,
              serviceCatalogs: true
            }
          }
        },
        orderBy: [
          { isPending: 'asc' }, // Show approved diagnoses first
          { name: 'asc' }
        ],
        skip,
        take: limitNum
      }),
      prisma.diagnosis.count({ where })
    ]);

    const totalPages = Math.ceil(total / limitNum);

    console.log(`✅ Found ${diagnoses.length} diagnoses out of ${total}`);

    res.json({
      success: true,
      data: diagnoses,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalDiagnoses: total,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });
  } catch (error) {
    handleError(res, 'Error fetching diagnoses', error);
  }
};

export const getDiagnosisById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    console.log('🩺 Fetching diagnosis by ID:', id);

    const diagnosis = await prisma.diagnosis.findUnique({
      where: { id },
      include: {
        principalAdmissions: {
          include: {
            patient: {
              select: {
                id: true,
                folderNumber: true,
                fullName: true
              }
            },
            ward: {
              select: {
                id: true,
                wardName: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        secondaryAdmissions: {
          include: {
            admission: {
              include: {
                patient: {
                  select: {
                    id: true,
                    folderNumber: true,
                    fullName: true
                  }
                },
                ward: {
                  select: {
                    id: true,
                    wardName: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        attendanceDiagnoses: {
          include: {
            attendance: {
              include: {
                patient: {
                  select: {
                    id: true,
                    folderNumber: true,
                    fullName: true
                  }
                }
              }
            },
            createdBy: {
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
        gdrgTariffs: {
          orderBy: { effectiveFrom: 'desc' }
        },
        serviceCatalogs: {
          select: {
            id: true,
            name: true,
            code: true,
            cashPrice: true,
            nhisPrice: true,
            insurancePrice: true,
            serviceType: true
          }
        }
      }
    });

    if (!diagnosis) {
      console.log('❌ Diagnosis not found:', id);
      return res.status(404).json({
        success: false,
        message: 'Diagnosis not found'
      });
    }

    console.log('✅ Diagnosis fetched successfully:', diagnosis.name);

    res.json({
      success: true,
      data: diagnosis
    });
  } catch (error) {
    handleError(res, 'Error fetching diagnosis', error);
  }
};

export const createDiagnosis = [
  body('name')
    .notEmpty().withMessage('Diagnosis name is required')
    .trim()
    .isLength({ min: 2 }).withMessage('Diagnosis name must be at least 2 characters'),
  body('icdCode')
    .notEmpty().withMessage('ICD code is required')
    .trim()
    .toUpperCase(),
  body('gdrgCode')
    .notEmpty().withMessage('GDRG code is required')
    .trim()
    .toUpperCase(),
  body('category')
    .isIn(Object.values(DiagnosisCategory))
    .withMessage('Valid category is required'),

  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('🔍 Create diagnosis validation errors:', errors.array());
        return res.status(400).json({
          success: false,
          errors: errors.array(),
          message: 'Validation failed'
        });
      }

      const {
        name,
        icdCode,
        gdrgCode,
        category,
        variant,
        description,
        isChronic = false,
        isNHISCovered = true,
        requiresAuthorization = false,
        tariffCode
      } = req.body;

      console.log('🩺 Creating new diagnosis...', {
        user: req.user?.username,
        data: { name, icdCode, gdrgCode, category }
      });

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

      // Check if GDRG code already exists
      const existingByGdrg = await prisma.diagnosis.findFirst({
        where: { gdrgCode: gdrgCode.trim().toUpperCase() }
      });

      if (existingByGdrg) {
        return res.status(400).json({
          success: false,
          message: `Diagnosis with GDRG code ${gdrgCode} already exists`
        });
      }

      const diagnosis = await prisma.diagnosis.create({
        data: {
          name: name.trim(),
          icdCode: icdCode.trim().toUpperCase(),
          gdrgCode: gdrgCode.trim().toUpperCase(),
          category: category as DiagnosisCategory,
          variant: variant as DiagnosisVariant,
          description: description?.trim(),
          isChronic: Boolean(isChronic),
          isNHISCovered: Boolean(isNHISCovered),
          requiresAuthorization: Boolean(requiresAuthorization),
          tariffCode: tariffCode?.trim(),
          isPending: Boolean(requiresAuthorization) // Set pending if requires authorization
        },
        include: {
          _count: {
            select: {
              principalAdmissions: true,
              secondaryAdmissions: true,
              attendanceDiagnoses: true,
              serviceCatalogs: true
            }
          }
        }
      });

      console.log('✅ Diagnosis created successfully:', diagnosis.name);

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

export const updateDiagnosis = [
  body('name')
    .optional()
    .notEmpty().withMessage('Diagnosis name cannot be empty')
    .trim()
    .isLength({ min: 2 }).withMessage('Diagnosis name must be at least 2 characters'),
  body('icdCode')
    .optional()
    .notEmpty().withMessage('ICD code cannot be empty')
    .trim()
    .toUpperCase(),
  body('gdrgCode')
    .optional()
    .notEmpty().withMessage('GDRG code cannot be empty')
    .trim()
    .toUpperCase(),
  body('category')
    .optional()
    .isIn(Object.values(DiagnosisCategory))
    .withMessage('Valid category is required'),

  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('🔍 Update diagnosis validation errors:', errors.array());
        return res.status(400).json({
          success: false,
          errors: errors.array(),
          message: 'Validation failed'
        });
      }

      const { id } = req.params;
      const updateData = { ...req.body };

      console.log('📝 Updating diagnosis:', id, {
        updates: Object.keys(updateData)
      });

      // Check if diagnosis exists
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
      if (updateData.icdCode && updateData.icdCode !== existingDiagnosis.icdCode) {
        const duplicateIcd = await prisma.diagnosis.findFirst({
          where: {
            icdCode: updateData.icdCode.trim().toUpperCase(),
            id: { not: id }
          }
        });

        if (duplicateIcd) {
          return res.status(400).json({
            success: false,
            message: `Diagnosis with ICD code ${updateData.icdCode} already exists`
          });
        }
        updateData.icdCode = updateData.icdCode.trim().toUpperCase();
      }

      // Check for duplicate GDRG code if changing
      if (updateData.gdrgCode && updateData.gdrgCode !== existingDiagnosis.gdrgCode) {
        const duplicateGdrg = await prisma.diagnosis.findFirst({
          where: {
            gdrgCode: updateData.gdrgCode.trim().toUpperCase(),
            id: { not: id }
          }
        });

        if (duplicateGdrg) {
          return res.status(400).json({
            success: false,
            message: `Diagnosis with GDRG code ${updateData.gdrgCode} already exists`
          });
        }
        updateData.gdrgCode = updateData.gdrgCode.trim().toUpperCase();
      }

      // Handle text field trimming
      if (updateData.name) updateData.name = updateData.name.trim();
      if (updateData.description) updateData.description = updateData.description.trim();
      if (updateData.tariffCode) updateData.tariffCode = updateData.tariffCode.trim();

      // Convert boolean fields
      if (updateData.isChronic !== undefined) updateData.isChronic = Boolean(updateData.isChronic);
      if (updateData.isNHISCovered !== undefined) updateData.isNHISCovered = Boolean(updateData.isNHISCovered);
      if (updateData.requiresAuthorization !== undefined) updateData.requiresAuthorization = Boolean(updateData.requiresAuthorization);
      if (updateData.isPending !== undefined) updateData.isPending = Boolean(updateData.isPending);

      const diagnosis = await prisma.diagnosis.update({
        where: { id },
        data: updateData,
        include: {
          _count: {
            select: {
              principalAdmissions: true,
              secondaryAdmissions: true,
              attendanceDiagnoses: true,
              serviceCatalogs: true
            }
          }
        }
      });

      console.log('✅ Diagnosis updated successfully:', diagnosis.name);

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

export const deleteDiagnosis = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    console.log('🗑️ Deleting diagnosis:', id);

    // Check if diagnosis exists and has related records
    const diagnosis = await prisma.diagnosis.findUnique({
      where: { id },
      include: {
        principalAdmissions: { take: 1 },
        secondaryAdmissions: { take: 1 },
        attendanceDiagnoses: { take: 1 },
        serviceCatalogs: { take: 1 },
        gdrgTariffs: { take: 1 }
      }
    });

    if (!diagnosis) {
      return res.status(404).json({
        success: false,
        message: 'Diagnosis not found'
      });
    }

    // Check if diagnosis has related records
    const hasRelatedRecords = 
      diagnosis.principalAdmissions.length > 0 ||
      diagnosis.secondaryAdmissions.length > 0 ||
      diagnosis.attendanceDiagnoses.length > 0 ||
      diagnosis.serviceCatalogs.length > 0 ||
      diagnosis.gdrgTariffs.length > 0;

    if (hasRelatedRecords) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete diagnosis with existing admissions, attendances, service catalog entries, or GDRG tariffs'
      });
    }

    await prisma.diagnosis.delete({
      where: { id }
    });

    console.log('✅ Diagnosis deleted successfully:', diagnosis.name);

    res.json({
      success: true,
      message: 'Diagnosis deleted successfully'
    });

  } catch (error) {
    handleError(res, 'Error deleting diagnosis', error);
  }
};

export const getDiagnosisStats = async (req: AuthRequest, res: Response) => {
  try {
    console.log('📊 Getting diagnosis statistics...');

    const [
      totalDiagnoses,
      pendingDiagnoses,
      approvedDiagnoses,
      diagnosesByCategory,
      nhisCovered,
      chronicDiagnoses,
      requiringAuthorization
    ] = await Promise.all([
      prisma.diagnosis.count(),
      prisma.diagnosis.count({ where: { isPending: true } }),
      prisma.diagnosis.count({ where: { isPending: false } }),
      prisma.diagnosis.groupBy({
        by: ['category'],
        _count: true
      }),
      prisma.diagnosis.count({ where: { isNHISCovered: true } }),
      prisma.diagnosis.count({ where: { isChronic: true } }),
      prisma.diagnosis.count({ where: { requiresAuthorization: true } })
    ]);

    const stats = {
      total: totalDiagnoses,
      pending: pendingDiagnoses,
      approved: approvedDiagnoses,
      byCategory: diagnosesByCategory,
      nhisCovered,
      chronic: chronicDiagnoses,
      requiringAuthorization
    };

    console.log('✅ Diagnosis statistics fetched');

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    handleError(res, 'Error fetching diagnosis stats', error);
  }
};

export const bulkUpdateDiagnoses = [
  body('diagnoses').isArray({ min: 1 }).withMessage('Diagnoses array with at least one item is required'),
  body('diagnoses.*.id').notEmpty().withMessage('Diagnosis ID is required'),
  
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

      const { diagnoses } = req.body;

      console.log('🔄 Bulk updating diagnoses:', diagnoses.length);

      const results = await prisma.$transaction(
        diagnoses.map(diagnosis =>
          prisma.diagnosis.update({
            where: { id: diagnosis.id },
            data: {
              isNHISCovered: diagnosis.isNHISCovered !== undefined ? Boolean(diagnosis.isNHISCovered) : undefined,
              isChronic: diagnosis.isChronic !== undefined ? Boolean(diagnosis.isChronic) : undefined,
              isPending: diagnosis.isPending !== undefined ? Boolean(diagnosis.isPending) : undefined,
              requiresAuthorization: diagnosis.requiresAuthorization !== undefined ? Boolean(diagnosis.requiresAuthorization) : undefined
            }
          })
        )
      );

      console.log(`✅ Bulk update completed: ${results.length} diagnoses updated`);

      res.json({
        success: true,
        data: results,
        message: `Successfully updated ${results.length} diagnoses`
      });

    } catch (error) {
      handleError(res, 'Error in bulk update operation', error);
    }
  }
];

export const searchDiagnoses = async (req: AuthRequest, res: Response) => {
  try {
    const { q, field = 'all' } = req.query;
    
    if (!q || (q as string).trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query of at least 2 characters is required'
      });
    }

    console.log('🔍 Searching diagnoses:', { q, field });

    const where: any = {
      OR: []
    };

    const searchTerm = (q as string).trim();

    if (field === 'all' || field === 'name') {
      where.OR.push({ name: { contains: searchTerm, mode: 'insensitive' } });
    }
    
    if (field === 'all' || field === 'icdCode') {
      where.OR.push({ icdCode: { contains: searchTerm, mode: 'insensitive' } });
    }
    
    if (field === 'all' || field === 'gdrgCode') {
      where.OR.push({ gdrgCode: { contains: searchTerm, mode: 'insensitive' } });
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
        gdrgCode: true,
        category: true,
        isPending: true,
        isNHISCovered: true,
        isChronic: true,
        requiresAuthorization: true
      },
      orderBy: { name: 'asc' },
      take: 50 // Increased for better search experience
    });

    console.log(`✅ Search completed: Found ${diagnoses.length} diagnoses`);

    res.json({
      success: true,
      data: diagnoses
    });
  } catch (error) {
    handleError(res, 'Error searching diagnoses', error);
  }
};

export const getDiagnosisCategories = async (req: AuthRequest, res: Response) => {
  try {
    const categories = Object.values(DiagnosisCategory);
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    handleError(res, 'Error fetching diagnosis categories', error);
  }
};

export const getDiagnosisVariants = async (req: AuthRequest, res: Response) => {
  try {
    const variants = Object.values(DiagnosisVariant);
    res.json({
      success: true,
      data: variants
    });
  } catch (error) {
    handleError(res, 'Error fetching diagnosis variants', error);
  }
};