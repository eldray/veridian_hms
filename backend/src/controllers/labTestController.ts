// controllers/labTestController.ts - UPDATED FOR SERVICE CATALOG
import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient, ServiceType, ServiceCategory, Priority } from '@prisma/client';

const prisma = new PrismaClient();

// ==========================================
// GET ALL LAB TEST SERVICES (REPLACES TEMPLATES)
// ==========================================

export const getLabTestServices = async (req: Request, res: Response) => {
  try {
    const { 
      serviceCategory, 
      subType, 
      isActive,
      isNHISCovered,
      page = 1, 
      limit = 50 
    } = req.query;
    
    const where: any = {
      serviceType: ServiceType.lab_test // ✅ Only lab test services
    };
    
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    
    if (isNHISCovered !== undefined) {
      where.isNHISCovered = isNHISCovered === 'true';
    }
    
    if (serviceCategory) {
      where.serviceCategory = serviceCategory as ServiceCategory;
    }
    
    if (subType) {
      where.subType = subType as string; // ✅ hematology, biochemistry, etc.
    }

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    const [services, total] = await Promise.all([
      prisma.serviceCatalog.findMany({
        where,
        include: {
          pricing: {
            select: {
              cashPrice: true,
              nhisPrice: true,
              insurancePrice: true,
              isActive: true
            }
          },
          labTests: {
            select: {
              id: true,
              status: true,
              attendance: {
                select: {
                  attendanceNumber: true
                }
              }
            },
            take: 5, // Recent lab tests
            orderBy: {
              requestedAt: 'desc'
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
        orderBy: {
          name: 'asc'
        },
        skip,
        take: limitNum
      }),
      prisma.serviceCatalog.count({ where })
    ]);
    
    res.json({
      success: true,
      data: services,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching lab test services:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching lab test services', 
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

// ==========================================
// GET LAB TEST SERVICE BY ID
// ==========================================

export const getLabTestServiceById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const service = await prisma.serviceCatalog.findUnique({
      where: { 
        id,
        serviceType: ServiceType.lab_test // ✅ Ensure it's a lab test service
      },
      include: {
        pricing: true,
        labTests: {
          include: {
            attendance: {
              select: {
                attendanceNumber: true,
                patient: {
                  select: {
                    surname: true,
                    otherNames: true,
                    folderNumber: true
                  }
                }
              }
            },
            performedBy: {
              select: {
                fullName: true,
                username: true
              }
            },
            verifiedBy: {
              select: {
                fullName: true,
                username: true
              }
            }
          },
          orderBy: {
            requestedAt: 'desc'
          },
          take: 20
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
    
    if (!service) {
      return res.status(404).json({ 
        success: false,
        message: 'Lab test service not found' 
      });
    }
    
    res.json({
      success: true,
      data: service
    });
  } catch (error) {
    console.error('Error fetching lab test service:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching lab test service', 
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

// ==========================================
// CREATE LAB TEST SERVICE (WITH PRICING)
// ==========================================

export const createLabTestService = [
  body('name').notEmpty().withMessage('Service name is required'),
  body('code').notEmpty().withMessage('Service code is required'),
  body('serviceCategory').isIn(Object.values(ServiceCategory)).withMessage('Invalid service category'),
  body('subType').notEmpty().withMessage('Lab sub-type is required (e.g., hematology, biochemistry)'),
  body('cashPrice').isFloat({ min: 0 }).withMessage('Cash price must be a non-negative number'),
  body('nhisPrice').optional().isFloat({ min: 0 }).withMessage('NHIS price must be a non-negative number'),
  body('insurancePrice').isFloat({ min: 0 }).withMessage('Insurance price must be a non-negative number'),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false,
          errors: errors.array() 
        });
      }

      // Check if service code already exists
      const existingService = await prisma.serviceCatalog.findUnique({
        where: { code: req.body.code }
      });

      if (existingService) {
        return res.status(400).json({ 
          success: false,
          message: 'Service code already exists' 
        });
      }

      const result = await prisma.$transaction(async (tx) => {
        // Create the lab test service
        const service = await tx.serviceCatalog.create({
          data: {
            name: req.body.name,
            code: req.body.code,
            description: req.body.description,
            serviceType: ServiceType.lab_test, // ✅ Fixed service type
            serviceCategory: req.body.serviceCategory as ServiceCategory,
            subType: req.body.subType, // ✅ hematology, biochemistry, etc.
            
            // NHIS Compliance
            nhisServiceCode: req.body.nhisServiceCode,
            tariffCode: req.body.tariffCode,
            isNHISCovered: req.body.isNHISCovered !== undefined ? req.body.isNHISCovered : true,
            nhisCoverageType: req.body.nhisCoverageType || 'full',
            
            // Service Metadata
            metadata: req.body.metadata ? req.body.metadata : {
              specimenType: req.body.specimenType,
              preparationInstructions: req.body.preparationInstructions,
              turnaroundTime: req.body.turnaroundTime,
              normalRange: req.body.normalRange
            },
            
            // Authorization & Activation
            requiresAuthorization: req.body.requiresAuthorization !== undefined ? req.body.requiresAuthorization : false,
            requiresClinicalNotes: req.body.requiresClinicalNotes !== undefined ? req.body.requiresClinicalNotes : false,
            isActive: req.body.isActive !== undefined ? req.body.isActive : true,
            
            unit: req.body.unit || 'Test',
            createdById: (req as any).user?.id
          }
        });

        // Create pricing record
        const pricing = await tx.servicePricing.create({
          data: {
            serviceCatalogId: service.id,
            cashPrice: parseFloat(req.body.cashPrice),
            nhisPrice: parseFloat(req.body.nhisPrice) || 0,
            insurancePrice: parseFloat(req.body.insurancePrice),
            vatRate: req.body.vatRate ? parseFloat(req.body.vatRate) : 0,
            isTaxable: req.body.isTaxable !== undefined ? req.body.isTaxable : true,
            isActive: true,
            effectiveDate: new Date()
          }
        });

        return {
          ...service,
          pricing
        };
      });
      
      res.status(201).json({
        success: true,
        message: 'Lab test service created successfully',
        data: result
      });
    } catch (error) {
      console.error('Error creating lab test service:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error creating lab test service', 
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  }
];

// ==========================================
// UPDATE LAB TEST SERVICE
// ==========================================

export const updateLabTestService = [
  body('name').optional().notEmpty().withMessage('Service name cannot be empty'),
  body('code').optional().notEmpty().withMessage('Service code cannot be empty'),
  body('serviceCategory').optional().isIn(Object.values(ServiceCategory)).withMessage('Invalid service category'),
  body('cashPrice').optional().isFloat({ min: 0 }).withMessage('Cash price must be a non-negative number'),
  body('nhisPrice').optional().isFloat({ min: 0 }).withMessage('NHIS price must be a non-negative number'),
  body('insurancePrice').optional().isFloat({ min: 0 }).withMessage('Insurance price must be a non-negative number'),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false,
          errors: errors.array() 
        });
      }

      const { id } = req.params;
      
      // Check if service exists and is a lab test
      const existingService = await prisma.serviceCatalog.findFirst({
        where: { 
          id,
          serviceType: ServiceType.lab_test 
        },
        include: {
          pricing: true
        }
      });
      
      if (!existingService) {
        return res.status(404).json({ 
          success: false,
          message: 'Lab test service not found' 
        });
      }

      // Check if service code is being changed and if it already exists
      if (req.body.code && req.body.code !== existingService.code) {
        const serviceWithCode = await prisma.serviceCatalog.findUnique({
          where: { code: req.body.code }
        });

        if (serviceWithCode) {
          return res.status(400).json({ 
            success: false,
            message: 'Service code already exists' 
          });
        }
      }

      const result = await prisma.$transaction(async (tx) => {
        // Prepare service update data
        const serviceUpdateData: any = { ...req.body };
        
        // Remove pricing fields from service update
        delete serviceUpdateData.cashPrice;
        delete serviceUpdateData.nhisPrice;
        delete serviceUpdateData.insurancePrice;
        delete serviceUpdateData.vatRate;
        delete serviceUpdateData.isTaxable;

        // Update service catalog
        const service = await tx.serviceCatalog.update({
          where: { id },
          data: {
            ...serviceUpdateData,
            updatedAt: new Date()
          }
        });

        // Update pricing if pricing fields are provided
        let pricing = existingService.pricing;
        if (req.body.cashPrice !== undefined || req.body.nhisPrice !== undefined || 
            req.body.insurancePrice !== undefined) {
          
          pricing = await tx.servicePricing.update({
            where: { serviceCatalogId: id },
            data: {
              cashPrice: req.body.cashPrice !== undefined ? parseFloat(req.body.cashPrice) : undefined,
              nhisPrice: req.body.nhisPrice !== undefined ? parseFloat(req.body.nhisPrice) : undefined,
              insurancePrice: req.body.insurancePrice !== undefined ? parseFloat(req.body.insurancePrice) : undefined,
              vatRate: req.body.vatRate !== undefined ? parseFloat(req.body.vatRate) : undefined,
              isTaxable: req.body.isTaxable !== undefined ? req.body.isTaxable : undefined,
              updatedAt: new Date()
            }
          });
        }

        return {
          ...service,
          pricing
        };
      });
      
      res.json({
        success: true,
        message: 'Lab test service updated successfully',
        data: result
      });
    } catch (error) {
      console.error('Error updating lab test service:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error updating lab test service', 
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  }
];

// ==========================================
// DELETE LAB TEST SERVICE
// ==========================================

export const deleteLabTestService = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if service exists and is a lab test
    const existingService = await prisma.serviceCatalog.findFirst({
      where: { 
        id,
        serviceType: ServiceType.lab_test 
      },
      include: {
        labTests: { take: 1 },
        pricing: true
      }
    });
    
    if (!existingService) {
      return res.status(404).json({ 
        success: false,
        message: 'Lab test service not found' 
      });
    }

    // Check for dependencies
    if (existingService.labTests.length > 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Cannot delete lab test service with associated lab tests' 
      });
    }

    await prisma.$transaction(async (tx) => {
      // Delete pricing first
      if (existingService.pricing) {
        await tx.servicePricing.delete({
          where: { serviceCatalogId: id }
        });
      }

      // Delete service catalog
      await tx.serviceCatalog.delete({
        where: { id }
      });
    });

    res.json({ 
      success: true,
      message: 'Lab test service deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting lab test service:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error deleting lab test service', 
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

// ==========================================
// GET LAB TEST SUB-CATEGORIES
// ==========================================

export const getLabTestSubCategories = async (req: Request, res: Response) => {
  try {
    const subCategories = await prisma.serviceCatalog.findMany({
      distinct: ['subType'],
      select: {
        subType: true
      },
      where: {
        serviceType: ServiceType.lab_test,
        subType: {
          not: null
        }
      },
      orderBy: {
        subType: 'asc'
      }
    });
    
    const subCategoryList = subCategories.map(item => item.subType).filter(Boolean);
    
    res.json({
      success: true,
      data: subCategoryList
    });
  } catch (error) {
    console.error('Error fetching lab test sub-categories:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching lab test sub-categories', 
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

// ==========================================
// GET SERVICE CATEGORIES FOR LAB TESTS
// ==========================================

export const getLabServiceCategories = async (req: Request, res: Response) => {
  try {
    const categories = Object.values(ServiceCategory);
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching service categories:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching service categories', 
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

// ==========================================
// GET COMMON LAB TEST METADATA FIELDS
// ==========================================

export const getLabTestMetadataFields = async (req: Request, res: Response) => {
  try {
    // Common specimen types for lab tests
    const specimenTypes = [
      'Blood', 'Urine', 'Stool', 'Sputum', 'CSF', 'Tissue', 
      'Swab', 'Fluid', 'Hair', 'Nail', 'Other'
    ];

    // Common preparation instructions
    const preparationInstructions = [
      'Fasting required',
      'No special preparation',
      'Morning sample preferred',
      'Random sample',
      '24-hour collection',
      'Sterile collection required'
    ];

    res.json({
      success: true,
      data: {
        specimenTypes,
        preparationInstructions,
        // Common metadata structure for lab tests
        metadataStructure: {
          specimenType: 'string',
          preparationInstructions: 'string',
          turnaroundTime: 'string (e.g., 24-48 hours)',
          normalRange: 'string',
          containerType: 'string',
          storageRequirements: 'string'
        }
      }
    });
  } catch (error) {
    console.error('Error fetching lab test metadata fields:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching lab test metadata fields', 
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

// ==========================================
// BULK UPDATE LAB TEST SERVICES STATUS
// ==========================================

export const bulkUpdateLabTestServices = [
  body('ids').isArray().withMessage('Service IDs array is required'),
  body('isActive').isBoolean().withMessage('isActive must be a boolean'),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false,
          errors: errors.array() 
        });
      }

      const { ids, isActive } = req.body;

      const result = await prisma.serviceCatalog.updateMany({
        where: {
          id: { in: ids },
          serviceType: ServiceType.lab_test
        },
        data: {
          isActive,
          updatedAt: new Date()
        }
      });

      res.json({
        success: true,
        message: `Successfully updated ${result.count} lab test services`,
        data: {
          updatedCount: result.count
        }
      });
    } catch (error) {
      console.error('Error in bulk update:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error updating lab test services', 
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  }
];