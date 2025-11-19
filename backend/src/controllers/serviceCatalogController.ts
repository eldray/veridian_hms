// controllers/serviceCatalogController.ts - CORRECTED VERSION (First 100 lines showing fix)
import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
// ✅ ADDED: Missing import for BillingService
import { BillingService } from '../services/BillingService';

const prisma = new PrismaClient();

export const getServiceCatalog = async (req: Request, res: Response) => {
  try {
    const { 
      serviceType, 
      category, 
      search, 
      isPending,
      page = 1, 
      limit = 50 
    } = req.query;
    
    const where: any = {};
    
    if (serviceType) where.serviceType = serviceType as string;
    if (category) where.category = category as string;
    if (isPending !== undefined) where.isPending = isPending === 'true';
    
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { code: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { nhisServiceCode: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [services, total] = await Promise.all([
      prisma.serviceCatalog.findMany({
        where,
        include: {
          diagnosis: {
            select: {
              name: true,
              icdCode: true,
              gdrgCode: true
            }
          },
          labTestTemplate: {
            select: {
              name: true,
              investigationCode: true,
              category: true
            }
          },
          procedureTemplate: {
            select: {
              name: true,
              procedureCode: true,
              category: true
            }
          },
          stockItem: {
            select: {
              name: true,
              drugCode: true,
              strength: true,
              unitOfMeasure: true
            }
          },
          ward: {
            select: {
              wardName: true,
              wardType: true,
              cashDailyRate: true,
              insuranceDailyRate: true
            }
          },
          scanTemplate: {
            select: {
              name: true,
              investigationCode: true,
              scanCode: true,
              category: true,
              bodyPart: true
            }
          }
        },
        orderBy: { name: 'asc' },
        skip,
        take: parseInt(limit as string)
      }),
      prisma.serviceCatalog.count({ where })
    ]);

    res.json({
      services,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error) {
    console.error('Error fetching service catalog:', error);
    res.status(500).json({ 
      message: 'Error fetching service catalog', 
      error: (error as Error).message 
    });
  }
};

export const getServiceCatalogById = async (req: Request, res: Response) => {
  try {
    const serviceItem = await prisma.serviceCatalog.findUnique({
      where: { id: req.params.id },
      include: {
        diagnosis: {
          select: {
            name: true,
            icdCode: true,
            gdrgCode: true
          }
        },
        labTestTemplate: {
          select: {
            name: true,
            investigationCode: true,
            category: true
          }
        },
        procedureTemplate: {
          select: {
            name: true,
            procedureCode: true,
            category: true
          }
        },
        stockItem: {
          select: {
            name: true,
            drugCode: true,
            strength: true,
            unitOfMeasure: true
          }
        },
        ward: {
          select: {
            wardName: true,
            wardType: true,
            cashDailyRate: true,
            insuranceDailyRate: true
          }
        },
        scanTemplate: {
          select: {
            name: true,
            scanCode: true,
            category: true,
            bodyPart: true
          }
        }
      }
    });

    if (!serviceItem) {
      return res.status(404).json({ message: 'Service catalog item not found' });
    }

    res.json(serviceItem);
  } catch (error) {
    console.error('Error fetching service catalog item:', error);
    res.status(500).json({ 
      message: 'Error fetching service catalog item', 
      error: (error as Error).message 
    });
  }
};

export const deleteServiceCatalogItem = async (req: Request, res: Response) => {
  try {
    const serviceItem = await prisma.serviceCatalog.delete({
      where: { id: req.params.id }
    });

    res.json({ 
      message: 'Service catalog item deleted successfully',
      deletedService: {
        id: serviceItem.id,
        name: serviceItem.name,
        code: serviceItem.code,
        nhisServiceCode: serviceItem.nhisServiceCode
      }
    });
  } catch (error) {
    console.error('Error deleting service catalog item:', error);
    
    if ((error as any).code === 'P2025') {
      return res.status(404).json({ message: 'Service catalog item not found' });
    }
    
    res.status(500).json({ 
      message: 'Error deleting service catalog item', 
      error: (error as Error).message 
    });
  }
};

// Get available categories and service types
export const getServiceMetadata = async (req: Request, res: Response) => {
  try {
    const [categories, serviceTypes] = await Promise.all([
      prisma.serviceCatalog.findMany({
        distinct: ['category'],
        select: { category: true },
        where: { category: { not: null } }
      }),
      prisma.serviceCatalog.findMany({
        distinct: ['serviceType'],
        select: { serviceType: true }
      })
    ]);

    // ✅ FIXED: Check for non-empty NHIS service codes
    const nhisServicesCount = await prisma.serviceCatalog.count({
      where: { 
        nhisServiceCode: { not: "" },  // Check for non-empty strings
        isPending: true
      }
    });

    // Calculate NHIS readiness by service type
    const services = await prisma.serviceCatalog.findMany({
      where: { isPending: true },
      select: { serviceType: true, nhisServiceCode: true }
    });

    const byServiceType = services.reduce((acc, service) => {
      const type = service.serviceType;
      if (!acc[type]) {
        acc[type] = { total: 0, nhisReady: 0 };
      }
      acc[type].total++;
      if (service.nhisServiceCode && service.nhisServiceCode !== "") {
        acc[type].nhisReady++;
      }
      return acc;
    }, {} as any);

    res.json({
      categories: categories.map(c => c.category).filter(Boolean),
      serviceTypes: serviceTypes.map(st => st.serviceType).filter(Boolean),
      nhisSummary: {
        totalNHISReady: nhisServicesCount,
        byServiceType
      }
    });
  } catch (error) {
    console.error('Error fetching service metadata:', error);
    res.status(500).json({ 
      message: 'Error fetching service metadata', 
      error: (error as Error).message 
    });
  }
};

// Get services by NHIS code
export const getServiceByNHISCode = async (req: Request, res: Response) => {
  try {
    const { nhisCode } = req.params;
    
    const service = await prisma.serviceCatalog.findFirst({
      where: { nhisServiceCode: nhisCode },
      include: {
        diagnosis: {
          select: {
            name: true,
            icdCode: true,
            gdrgCode: true
          }
        },
        labTestTemplate: {
          select: {
            name: true,
            investigationCode: true,
            category: true
          }
        },
        procedureTemplate: {
          select: {
            name: true,
            procedureCode: true,
            category: true
          }
        },
        stockItem: {
          select: {
            name: true,
            drugCode: true,
            strength: true,
            unitOfMeasure: true
          }
        },
        scanTemplate: {
          select: {
            name: true,
            scanCode: true,
            category: true,
            bodyPart: true
          }
        },
        ward: {
          select: {
            wardName: true,
            wardType: true,
            cashDailyRate: true,
            insuranceDailyRate: true
          }
        }
      }
    });

    if (!service) {
      return res.status(404).json({ message: 'Service with specified NHIS code not found' });
    }

    res.json(service);
  } catch (error) {
    console.error('Error fetching service by NHIS code:', error);
    res.status(500).json({ 
      message: 'Error fetching service by NHIS code', 
      error: (error as Error).message 
    });
  }
};

// Bulk NHIS status check
export const getNHISReadinessReport = async (req: Request, res: Response) => {
  try {
    const services = await prisma.serviceCatalog.findMany({
      where: { isPending: true },
      select: {
        id: true,
        name: true,
        code: true,
        serviceType: true,
        nhisServiceCode: true,
        requiresAuthorization: true
      }
    });
    
    const report = {
      totalServices: services.length,
      nhisReady: services.filter(s => s.nhisServiceCode).length,
      missingNHISCodes: services.filter(s => !s.nhisServiceCode).length,
      byServiceType: services.reduce((acc, service) => {
        const type = service.serviceType;
        if (!acc[type]) {
          acc[type] = { total: 0, nhisReady: 0, missing: 0 };
        }
        acc[type].total++;
        if (service.nhisServiceCode) {
          acc[type].nhisReady++;
        } else {
          acc[type].missing++;
        }
        return acc;
      }, {} as any),
      servicesMissingNHIS: services
        .filter(s => !s.nhisServiceCode)
        .map(s => ({ id: s.id, name: s.name, code: s.code, serviceType: s.serviceType }))
    };

    res.json(report);
  } catch (error) {
    console.error('Error generating NHIS readiness report:', error);
    res.status(500).json({ 
      message: 'Error generating NHIS readiness report', 
      error: (error as Error).message 
    });
  }
};

// ✅ UPDATED: createServiceCatalogItem with simplified pricing
export const createServiceCatalogItem = [
  body('name').notEmpty().withMessage('Name is required'),
  body('code').notEmpty().withMessage('Code is required'),
  
  // ✅ Service category validation
  body('serviceCategory').optional().isIn(['opd', 'ipd', 'diagnostics', 'pharmacy', 'other'])
    .withMessage('Valid service category is required'),
  
  body('serviceType').isIn([
    'consultation', 'ward', 'lab_test', 'scan', 'medication', 'procedure', 'diagnosis', 'miscellaneous'
  ]).withMessage('Valid service type is required'),
  
  // ✅ SIMPLIFIED PRICING FIELDS
  body('cashPrice').isNumeric().withMessage('Cash price must be a number'),
  body('nhisPrice').optional().isNumeric().withMessage('NHIS price must be a number'),
  body('insurancePrice').optional().isNumeric().withMessage('Insurance price must be a number'),
  
  // ✅ COVERAGE FLAGS
  body('isNHISCovered').optional().isBoolean(),
  body('isPrivateInsuranceExempted').optional().isBoolean(),
  
  // ✅ AUTHORIZATION FLAGS
  body('nhisRequiresAuth').optional().isBoolean(),
  body('privateInsRequiresAuth').optional().isBoolean(),
  
  body('nhisServiceCode').optional().isString().withMessage('NHIS service code must be a string'),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        serviceType,
        diagnosisId,
        labTestTemplateId,
        procedureTemplateId,
        stockItemId,
        scanTemplateId,
        wardId,
        ...serviceData
      } = req.body;

      // ✅ AUTO-ASSIGN service category if not provided
      const autoAssignCategory = (type: string): string => {
        const mapping: Record<string, string> = {
          consultation: 'opd',
          ward: 'ipd', 
          lab_test: 'diagnostics',
          scan: 'diagnostics',
          medication: 'pharmacy',
          procedure: 'opd',
          diagnosis: 'opd',
          miscellaneous: 'other'
        };
        return mapping[type] || 'opd';
      };

      const serviceCategory = serviceData.serviceCategory || autoAssignCategory(serviceType);

      // ✅ SET DEFAULTS FOR SIMPLIFIED PRICING
      const nhisPrice = serviceData.nhisPrice || 0;
      const insurancePrice = serviceData.insurancePrice || serviceData.cashPrice;
      
      // ✅ SET DEFAULT COVERAGE FLAGS
      const isNHISCovered = serviceData.isNHISCovered !== undefined ? serviceData.isNHISCovered : true;
      const isPrivateInsuranceExempted = serviceData.isPrivateInsuranceExempted || false;
      
      // ✅ SET DEFAULT AUTHORIZATION FLAGS
      const nhisRequiresAuth = serviceData.nhisRequiresAuth || false;
      const privateInsRequiresAuth = serviceData.privateInsRequiresAuth || false;

      // ✅ AUTO-DETERMINE NHIS COVERAGE TYPE
      const determineNHISCoverageType = (): 'full' | 'partial' | 'not_covered' => {
        if (!isNHISCovered) return 'not_covered';
        if (nhisPrice >= serviceData.cashPrice) return 'full';
        return 'partial';
      };

      const nhisCoverageType = determineNHISCoverageType();

      // ... (keep your existing reference validation logic) ...

      // Create service with simplified pricing structure
      const createData = {
        ...serviceData,
        serviceType,
        serviceCategory,
        
        // ✅ SIMPLIFIED PRICING
        cashPrice: serviceData.cashPrice,
        nhisPrice,
        insurancePrice,
        
        // ✅ COVERAGE FLAGS
        isNHISCovered,
        isPrivateInsuranceExempted,
        nhisCoverageType,
        
        // ✅ AUTHORIZATION FLAGS
        nhisRequiresAuth,
        privateInsRequiresAuth,
        
        // References
        diagnosisId,
        labTestTemplateId,
        procedureTemplateId,
        stockItemId,
        scanTemplateId,
        wardId,
        
        // Metadata
        isPending: serviceData.isPending !== undefined ? serviceData.isPending : true,
        requiresClinicalNotes: serviceData.requiresClinicalNotes || false,
        createdById: (req as any).user?.id
      };

      const serviceItem = await prisma.serviceCatalog.create({
        data: createData,
        include: {
          diagnosis: {
            select: {
              name: true,
              icdCode: true,
              gdrgCode: true
            }
          },
          labTestTemplate: {
            select: {
              name: true,
              investigationCode: true,
              category: true
            }
          },
          procedureTemplate: {
            select: {
              name: true,
              procedureCode: true,
              category: true
            }
          },
          stockItem: {
            select: {
              name: true,
              drugCode: true,
              strength: true,
              unitOfMeasure: true
            }
          },
          scanTemplate: {
            select: {
              name: true,
              scanCode: true,
              category: true,
              bodyPart: true
            }
          },
          ward: {
            select: {
              wardName: true,
              wardType: true,
              cashDailyRate: true,
              insuranceDailyRate: true
            }
          }
        }
      });

      res.status(201).json({
        message: 'Service catalog item created successfully',
        service: serviceItem,
        pricingSummary: {
          cashPrice: serviceItem.cashPrice,
          nhisPrice: serviceItem.nhisPrice,
          insurancePrice: serviceItem.insurancePrice,
          nhisCoverageType: serviceItem.nhisCoverageType,
          patientCopay: serviceItem.cashPrice - serviceItem.nhisPrice // Dynamic copay
        }
      });
    } catch (error) {
      console.error('Error creating service catalog item:', error);
      
      if ((error as any).code === 'P2002') {
        const field = (error as any).meta?.target?.[0];
        if (field === 'nhisServiceCode') {
          return res.status(400).json({ 
            message: 'NHIS service code already exists' 
          });
        }
        if (field === 'code') {
          return res.status(400).json({ 
            message: 'Service code already exists' 
          });
        }
      }
      
      res.status(500).json({ 
        message: 'Error creating service catalog item', 
        error: (error as Error).message 
      });
    }
  }
];

// ✅ UPDATED: updateServiceCatalogItem with simplified pricing
export const updateServiceCatalogItem = [
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('code').optional().notEmpty().withMessage('Code cannot be empty'),
  body('serviceType').optional().isIn([
    'consultation', 'ward', 'lab_test', 'scan', 'medication', 'procedure', 'diagnosis', 'miscellaneous'
  ]).withMessage('Valid service type is required'),
  
  // ✅ SIMPLIFIED PRICING VALIDATION
  body('cashPrice').optional().isNumeric().withMessage('Cash price must be a number'),
  body('nhisPrice').optional().isNumeric().withMessage('NHIS price must be a number'),
  body('insurancePrice').optional().isNumeric().withMessage('Insurance price must be a number'),

  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const updateData = { ...req.body, updatedAt: new Date() };

      // Validate service exists
      const existingService = await prisma.serviceCatalog.findUnique({
        where: { id: req.params.id }
      });

      if (!existingService) {
        return res.status(404).json({ message: 'Service catalog item not found' });
      }

      // ✅ AUTO-UPDATE NHIS COVERAGE TYPE IF PRICING CHANGES
      if (req.body.cashPrice !== undefined || req.body.nhisPrice !== undefined) {
        const cashPrice = req.body.cashPrice !== undefined ? req.body.cashPrice : existingService.cashPrice;
        const nhisPrice = req.body.nhisPrice !== undefined ? req.body.nhisPrice : existingService.nhisPrice;
        const isNHISCovered = req.body.isNHISCovered !== undefined ? req.body.isNHISCovered : existingService.isNHISCovered;
        
        if (!isNHISCovered) {
          updateData.nhisCoverageType = 'not_covered';
        } else if (nhisPrice >= cashPrice) {
          updateData.nhisCoverageType = 'full';
        } else {
          updateData.nhisCoverageType = 'partial';
        }
      }

      const serviceItem = await prisma.serviceCatalog.update({
        where: { id: req.params.id },
        data: updateData,
        include: {
          diagnosis: {
            select: {
              name: true,
              icdCode: true,
              gdrgCode: true
            }
          },
          labTestTemplate: {
            select: {
              name: true,
              investigationCode: true,
              category: true
            }
          },
          procedureTemplate: {
            select: {
              name: true,
              procedureCode: true,
              category: true
            }
          },
          stockItem: {
            select: {
              name: true,
              drugCode: true,
              strength: true,
              unitOfMeasure: true
            }
          },
          scanTemplate: {
            select: {
              name: true,
              scanCode: true,
              category: true,
              bodyPart: true
            }
          },
          ward: {
            select: {
              wardName: true,
              wardType: true,
              cashDailyRate: true,
              insuranceDailyRate: true
            }
          }
        }
      });

      res.json({
        message: 'Service catalog item updated successfully',
        service: serviceItem,
        pricingSummary: {
          cashPrice: serviceItem.cashPrice,
          nhisPrice: serviceItem.nhisPrice,
          insurancePrice: serviceItem.insurancePrice,
          nhisCoverageType: serviceItem.nhisCoverageType,
          patientCopay: serviceItem.cashPrice - serviceItem.nhisPrice
        }
      });
    } catch (error) {
      console.error('Error updating service catalog item:', error);
      
      if ((error as any).code === 'P2025') {
        return res.status(404).json({ message: 'Service catalog item not found' });
      }
      
      if ((error as any).code === 'P2002') {
        const field = (error as any).meta?.target?.[0];
        if (field === 'nhisServiceCode') {
          return res.status(400).json({ 
            message: 'NHIS service code already exists' 
          });
        }
        if (field === 'code') {
          return res.status(400).json({ 
            message: 'Service code already exists' 
          });
        }
      }
      
      res.status(500).json({ 
        message: 'Error updating service catalog item', 
        error: (error as Error).message 
      });
    }
  }
];

// ✅ NEW ENDPOINT: Get services by category
export const getServicesByCategory = async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    
    if (!['opd', 'ipd', 'diagnostics', 'pharmacy', 'other'].includes(category)) {
      return res.status(400).json({ message: 'Invalid service category' });
    }

    const services = await prisma.serviceCatalog.findMany({
      where: {
        serviceCategory: category as any,
        isPending: true
      },
      include: {
        diagnosis: true,
        labTestTemplate: true,
        procedureTemplate: true,
        stockItem: true,
        scanTemplate: true,
        ward: true
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      category,
      count: services.length,
      services
    });
  } catch (error) {
    console.error('Error fetching services by category:', error);
    res.status(500).json({ 
      message: 'Error fetching services', 
      error: (error as Error).message 
    });
  }
};


// ✅ IMPROVED: Check service coverage with better error handling
export const checkServiceCoverage = async (req: Request, res: Response) => {
  try {
    const { serviceId, paymentMode, insuranceProviderId } = req.body;
    
    if (!serviceId || !paymentMode) {
      return res.status(400).json({ 
        message: 'serviceId and paymentMode are required' 
      });
    }

    // ✅ ADDED: Error handling for BillingService call
    try {
      const coverage = await BillingService.validateServiceCoverage(
        serviceId,
        paymentMode as any,
        insuranceProviderId ? { id: insuranceProviderId } : undefined
      );
      
      res.json({
        serviceId,
        paymentMode,
        coverage
      });
    } catch (serviceError) {
      console.error('BillingService error:', serviceError);
      return res.status(500).json({
        message: 'Error validating service coverage',
        error: (serviceError as Error).message
      });
    }
  } catch (error) {
    console.error('Error checking service coverage:', error);
    res.status(500).json({ 
      message: 'Error checking service coverage', 
      error: (error as Error).message 
    });
  }
};

// ✅ IMPROVED: Calculate service cost with better error handling
export const calculateServiceCost = async (req: Request, res: Response) => {
  try {
    const { serviceId, paymentMode, quantity = 1, insuranceProviderId } = req.body;
    
    if (!serviceId || !paymentMode) {
      return res.status(400).json({ 
        message: 'serviceId and paymentMode are required' 
      });
    }

    const service = await prisma.serviceCatalog.findUnique({
      where: { id: serviceId }
    });

    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    let insuranceProvider = undefined;
    if (insuranceProviderId) {
      insuranceProvider = await prisma.insuranceProvider.findUnique({
        where: { id: insuranceProviderId }
      });
    }

    // ✅ ADDED: Error handling for BillingService call
    try {
      const calculation = await BillingService.calculateServiceBilling(
        serviceId,
        quantity,
        paymentMode as any,
        insuranceProvider
      );

      res.json({
        service: {
          id: service.id,
          name: service.name,
          code: service.code
        },
        quantity,
        paymentMode,
        calculation,
        breakdown: {
          totalCashPrice: calculation.cashPrice,
          insuranceCovered: calculation.insuranceCovered,
          patientResponsibility: calculation.patientPayable,
          requiresAuthorization: calculation.requiresAuthorization
        }
      });
    } catch (serviceError) {
      console.error('BillingService error:', serviceError);
      return res.status(500).json({
        message: 'Error calculating service cost',
        error: (serviceError as Error).message
      });
    }
  } catch (error) {
    console.error('Error calculating service cost:', error);
    res.status(500).json({ 
      message: 'Error calculating service cost', 
      error: (error as Error).message 
    });
  }
};