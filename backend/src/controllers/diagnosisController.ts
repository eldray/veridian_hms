// controllers/diagnosisController.ts - UPDATED FOR GDRG CORRELATION
import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthRequest } from '../middleware/authMiddleware';
import { PrismaClient, DiagnosisCategory } from '@prisma/client';

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
      gdrgCode
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (search) {
      const searchTerm = `%${search}%`;
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { icdCode: { contains: search as string, mode: 'insensitive' } },
        { gdrgCode: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (category) {
      where.category = category as DiagnosisCategory;
    }

    if (gdrgCode) {
      where.gdrgCode = gdrgCode as string;
    }

    const [diagnoses, total] = await Promise.all([
      prisma.diagnosis.findMany({
        where,
        include: {
          // ✅ ADDED: Include GDRG tariff information
          gdrgTariff: {
            select: {
              nhiaTariff: true,
              category: true,
              isActive: true,
              effectiveFrom: true,
              effectiveTo: true
            }
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
        orderBy: { name: 'asc' },
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
        // ✅ UPDATED: Fixed relation name to match schema
        gdrgTariff: {
          select: {
            id: true,
            gdrgCode: true,
            description: true,
            category: true,
            nhiaTariff: true,
            effectiveFrom: true,
            effectiveTo: true,
            isActive: true
          }
        },
        principalAdmissions: {
          include: {
            patient: {
              select: {
                id: true,
                folderNumber: true,
                surname: true,
                otherNames: true
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
                    surname: true,
                    otherNames: true
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
                    surname: true,
                    otherNames: true
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
        serviceCatalogs: {
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
        description
      } = req.body;

      console.log('🩺 Creating new diagnosis...', {
        user: req.user?.username,
        data: { name, icdCode, gdrgCode, category }
      });

      // Check if ICD code already exists (ICD is unique)
      const existingByIcd = await prisma.diagnosis.findFirst({
        where: { icdCode: icdCode.trim().toUpperCase() }
      });

      if (existingByIcd) {
        return res.status(400).json({
          success: false,
          message: `Diagnosis with ICD code ${icdCode} already exists`
        });
      }

      // ✅ UPDATED: Check if GDRG tariff exists (optional but recommended)
      const gdrgTariff = await prisma.gDRGTariff.findUnique({
        where: { gdrgCode: gdrgCode.trim().toUpperCase() }
      });

      if (!gdrgTariff) {
        console.log('⚠️ GDRG tariff not found for code:', gdrgCode);
        // We can proceed, but log a warning
      }

      const diagnosis = await prisma.diagnosis.create({
        data: {
          name: name.trim(),
          icdCode: icdCode.trim().toUpperCase(),
          gdrgCode: gdrgCode.trim().toUpperCase(),
          category: category as DiagnosisCategory,
          description: description?.trim()
        },
        include: {
          gdrgTariff: {
            select: {
              nhiaTariff: true,
              category: true,
              isActive: true
            }
          },
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
        message: 'Diagnosis created successfully',
        gdrgInfo: gdrgTariff ? 'GDRG tariff found' : 'GDRG tariff not found - please create tariff entry'
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

      // Check for duplicate ICD code if changing (ICD is unique)
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

      // ✅ UPDATED: Check GDRG tariff when GDRG code changes
      if (updateData.gdrgCode && updateData.gdrgCode !== existingDiagnosis.gdrgCode) {
        const gdrgTariff = await prisma.gDRGTariff.findUnique({
          where: { gdrgCode: updateData.gdrgCode.trim().toUpperCase() }
        });

        if (!gdrgTariff) {
          console.log('⚠️ GDRG tariff not found for updated code:', updateData.gdrgCode);
        }
        updateData.gdrgCode = updateData.gdrgCode.trim().toUpperCase();
      }

      // Handle text field trimming
      if (updateData.name) updateData.name = updateData.name.trim();
      if (updateData.description) updateData.description = updateData.description.trim();

      const diagnosis = await prisma.diagnosis.update({
        where: { id },
        data: updateData,
        include: {
          gdrgTariff: {
            select: {
              nhiaTariff: true,
              category: true,
              isActive: true
            }
          },
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

// ... (deleteDiagnosis, getDiagnosisStats, searchDiagnoses, getDiagnosisCategories remain the same)

export const getDiagnosesByGDRG = async (req: AuthRequest, res: Response) => {
  try {
    const { gdrgCode } = req.params;
    
    console.log('🩺 Fetching diagnoses by GDRG code:', gdrgCode);

    const [diagnoses, gdrgTariff] = await Promise.all([
      prisma.diagnosis.findMany({
        where: { gdrgCode: gdrgCode.toUpperCase() },
        include: {
          _count: {
            select: {
              principalAdmissions: true,
              attendanceDiagnoses: true
            }
          }
        },
        orderBy: { name: 'asc' }
      }),
      prisma.gDRGTariff.findUnique({
        where: { gdrgCode: gdrgCode.toUpperCase() }
      })
    ]);

    if (diagnoses.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No diagnoses found for GDRG code: ${gdrgCode}`
      });
    }

    res.json({
      success: true,
      data: {
        gdrgCode,
        gdrgTariff,
        diagnoses,
        count: diagnoses.length
      }
    });
  } catch (error) {
    handleError(res, 'Error fetching diagnoses by GDRG code', error);
  }
};

export const getGDRGTariffs = async (req: AuthRequest, res: Response) => {
  try {
    const { category, isActive } = req.query;
    
    const where: any = {};
    if (category) where.category = category as string;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const tariffs = await prisma.gDRGTariff.findMany({
      where,
      include: {
        _count: {
          select: {
            diagnoses: true
          }
        }
      },
      orderBy: { gdrgCode: 'asc' }
    });

    res.json({
      success: true,
      data: tariffs
    });
  } catch (error) {
    handleError(res, 'Error fetching GDRG tariffs', error);
  }
};

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
        // ✅ UPDATED: Fixed relation name to match schema
        gdrgTariff: { take: 1 }
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
      (diagnosis.gdrgTariff !== null); // ✅ UPDATED: Check for GDRG tariff relation

    if (hasRelatedRecords) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete diagnosis with existing admissions, attendances, service catalog entries, or GDRG tariff associations'
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
      diagnosesByCategory,
      recentDiagnoses,
      // ✅ ADDED: GDRG statistics
      diagnosesWithGDRG
    ] = await Promise.all([
      prisma.diagnosis.count(),
      prisma.diagnosis.groupBy({
        by: ['category'],
        _count: true
      }),
      prisma.diagnosis.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      }),
      // ✅ ADDED: Count diagnoses with valid GDRG tariffs
      prisma.diagnosis.count({
        where: {
          gdrgTariff: {
            isNot: null
          }
        }
      })
    ]);

    const stats = {
      total: totalDiagnoses,
      byCategory: diagnosesByCategory,
      recentAdditions: recentDiagnoses,
      diagnosesWithGDRG,
      gdrgCoverage: totalDiagnoses > 0 ? (diagnosesWithGDRG / totalDiagnoses * 100).toFixed(1) + '%' : '0%',
      categories: Object.keys(DiagnosisCategory).length
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
      // ✅ ADDED: Include GDRG tariff info in search results
      include: {
        gdrgTariff: {
          select: {
            nhiaTariff: true,
            category: true,
            isActive: true
          }
        }
      },
      select: {
        id: true,
        name: true,
        icdCode: true,
        gdrgCode: true,
        category: true,
        description: true
      },
      orderBy: { name: 'asc' },
      take: 50
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

// ✅ ADDED: Function to get diagnoses without GDRG tariffs
export const getDiagnosesWithoutGDRG = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 50 } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    const [diagnoses, total] = await Promise.all([
      prisma.diagnosis.findMany({
        where: {
          gdrgTariff: null
        },
        select: {
          id: true,
          name: true,
          icdCode: true,
          gdrgCode: true,
          category: true,
          description: true,
          createdAt: true
        },
        orderBy: { name: 'asc' },
        skip,
        take: limitNum
      }),
      prisma.diagnosis.count({
        where: {
          gdrgTariff: null
        }
      })
    ]);

    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      data: diagnoses,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalDiagnoses: total,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      },
      message: total === 0 ? 'All diagnoses have GDRG tariffs' : `${total} diagnoses missing GDRG tariffs`
    });
  } catch (error) {
    handleError(res, 'Error fetching diagnoses without GDRG', error);
  }
};