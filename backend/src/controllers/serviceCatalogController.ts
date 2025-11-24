// controllers/serviceCatalogController.ts - COMPLETE UPDATED VERSION
import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { BillingService } from '../services/BillingService';

const prisma = new PrismaClient();

export const getServiceCatalog = async (req: Request, res: Response) => {
  try {
    const { 
      serviceType, 
      category, 
      search, 
      isActive, 
      page = 1, 
      limit = 50 
    } = req.query;
    
    const where: any = {};
    
    if (serviceType) where.serviceType = serviceType as string;
    if (category) where.serviceCategory = category as string;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    
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
          pricing: true,
          Diagnosis: {  // ✅ Fixed
            select: {
              name: true,
              icdCode: true,
              gdrgCode: true
            }
          },
          User: {
            select: {
              id: true,
              fullName: true
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
        pricing: true,
        Diagnosis: {  // ✅ Fixed
          select: {
            name: true,
            icdCode: true,
            gdrgCode: true
          }
        },
        User: {
          select: {
            id: true,
            fullName: true,
            username: true
          }
        },
        LabTestTemplate: {
          select: {
            name: true,
            investigationCode: true
          }
        },
        ProcedureTemplate: {
          select: {
            name: true,
            procedureCode: true
          }
        },
        ScanTemplate: {
          select: {
            name: true,
            scanCode: true
          }
        },
        StockItem: {
          select: {
            name: true,
            drugCode: true
          }
        },
        Ward: {
          select: {
            wardName: true,
            wardType: true
          }
        },
        ConsultationType: {
          select: {
            name: true,
            code: true
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

export const createServiceCatalogItem = [
  body('name').notEmpty().withMessage('Name is required'),
  body('code').notEmpty().withMessage('Code is required'),
  body('serviceType').isIn([
    'consultation', 'ward', 'lab_test', 'scan', 'medication', 'procedure', 'diagnosis', 'miscellaneous'
  ]).withMessage('Valid service type is required'),
  body('serviceCategory').optional().isIn(['opd', 'ipd', 'diagnostics', 'pharmacy', 'other']),
  body('cashPrice').isNumeric().withMessage('Cash price must be a number'),
  body('nhisPrice').optional().isNumeric().withMessage('NHIS price must be a number'),
  body('insurancePrice').optional().isNumeric().withMessage('Insurance price must be a number'),

  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        cashPrice,
        nhisPrice = 0,
        insurancePrice = cashPrice,
        serviceType,
        diagnosisId,
        ...serviceData
      } = req.body;

      // Auto-assign service category if not provided
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

      // Create service catalog item
      const serviceItem = await prisma.serviceCatalog.create({
        data: {
          ...serviceData,
          serviceType,
          serviceCategory,
          diagnosisId,  // ✅ This field name is correct (lowercase for foreign key)
          isActive: serviceData.isActive !== undefined ? serviceData.isActive : true,
          createdById: (req as any).user?.id,
          pricing: {
            create: {
              cashPrice,
              nhisPrice,
              insurancePrice,
              vatRate: serviceData.vatRate || 0,
              isTaxable: serviceData.isTaxable !== undefined ? serviceData.isTaxable : true
            }
          }
        },
        include: {
          pricing: true,
          Diagnosis: true,  // ✅ Fixed
          User: {
            select: {
              id: true,
              fullName: true
            }
          }
        }
      });

      res.status(201).json({
        message: 'Service catalog item created successfully',
        service: serviceItem
      });
    } catch (error) {
      console.error('Error creating service catalog item:', error);
      
      if ((error as any).code === 'P2002') {
        const field = (error as any).meta?.target?.[0];
        if (field === 'code') {
          return res.status(400).json({ message: 'Service code already exists' });
        }
      }
      
      res.status(500).json({ 
        message: 'Error creating service catalog item', 
        error: (error as Error).message 
      });
    }
  }
];

export const updateServiceCatalogItem = [
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('code').optional().notEmpty().withMessage('Code cannot be empty'),
  body('serviceType').optional().isIn([
    'consultation', 'ward', 'lab_test', 'scan', 'medication', 'procedure', 'diagnosis', 'miscellaneous'
  ]),
  body('cashPrice').optional().isNumeric(),
  body('nhisPrice').optional().isNumeric(),
  body('insurancePrice').optional().isNumeric(),

  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { cashPrice, nhisPrice, insurancePrice, ...updateData } = req.body;

      // Check if service exists
      const existingService = await prisma.serviceCatalog.findUnique({
        where: { id: req.params.id },
        include: { pricing: true }
      });

      if (!existingService) {
        return res.status(404).json({ message: 'Service catalog item not found' });
      }

      // Update service catalog
      const serviceItem = await prisma.serviceCatalog.update({
        where: { id: req.params.id },
        data: {
          ...updateData,
          updatedAt: new Date()
        },
        include: {
          pricing: true,
          diagnosis: true
        }
      });

      // Update pricing if provided
      if (cashPrice !== undefined || nhisPrice !== undefined || insurancePrice !== undefined) {
        await prisma.servicePricing.upsert({
          where: { serviceCatalogId: req.params.id },
          update: {
            cashPrice: cashPrice !== undefined ? cashPrice : existingService.pricing?.cashPrice,
            nhisPrice: nhisPrice !== undefined ? nhisPrice : existingService.pricing?.nhisPrice,
            insurancePrice: insurancePrice !== undefined ? insurancePrice : existingService.pricing?.insurancePrice
          },
          create: {
            serviceCatalogId: req.params.id,
            cashPrice: cashPrice || 0,
            nhisPrice: nhisPrice || 0,
            insurancePrice: insurancePrice || cashPrice || 0
          }
        });
      }

      const updatedService = await prisma.serviceCatalog.findUnique({
        where: { id: req.params.id },
        include: {
          pricing: true,
          Diagnosis: true,  // ✅ Fixed
          User: {
            select: {
              id: true,
              fullName: true
            }
          }
        }
      });

      res.json({
        message: 'Service catalog item updated successfully',
        service: updatedService
      });
    } catch (error) {
      console.error('Error updating service catalog item:', error);
      
      if ((error as any).code === 'P2025') {
        return res.status(404).json({ message: 'Service catalog item not found' });
      }
      
      res.status(500).json({ 
        message: 'Error updating service catalog item', 
        error: (error as Error).message 
      });
    }
  }
];

export const deleteServiceCatalogItem = async (req: Request, res: Response) => {
  try {
    // First delete pricing (if exists) due to foreign key constraint
    await prisma.servicePricing.deleteMany({
      where: { serviceCatalogId: req.params.id }
    });

    const serviceItem = await prisma.serviceCatalog.delete({
      where: { id: req.params.id }
    });

    res.json({ 
      message: 'Service catalog item deleted successfully',
      deletedService: {
        id: serviceItem.id,
        name: serviceItem.name,
        code: serviceItem.code
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

export const getServiceMetadata = async (req: Request, res: Response) => {
  try {
    const [categories, serviceTypes] = await Promise.all([
      prisma.serviceCatalog.findMany({
        distinct: ['serviceCategory'],
        select: { serviceCategory: true },
        where: { serviceCategory: { not: null } }
      }),
      prisma.serviceCatalog.findMany({
        distinct: ['serviceType'],
        select: { serviceType: true }
      })
    ]);

    const nhisServicesCount = await prisma.serviceCatalog.count({
      where: { 
        nhisServiceCode: { not: "" },
        isActive: true
      }
    });

    res.json({
      categories: categories.map(c => c.serviceCategory).filter(Boolean),
      serviceTypes: serviceTypes.map(st => st.serviceType).filter(Boolean),
      nhisSummary: {
        totalNHISReady: nhisServicesCount
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

export const getServicesByCategory = async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    
    if (!['opd', 'ipd', 'diagnostics', 'pharmacy', 'other'].includes(category)) {
      return res.status(400).json({ message: 'Invalid service category' });
    }

    const services = await prisma.serviceCatalog.findMany({
      where: {
        serviceCategory: category as any,
        isActive: true
      },
      include: {
        pricing: true,
        diagnosis: true
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

export const getServiceByNHISCode = async (req: Request, res: Response) => {
  try {
    const { nhisCode } = req.params;
    
    const service = await prisma.serviceCatalog.findFirst({
      where: { nhisServiceCode: nhisCode },
      include: {
        pricing: true,
        diagnosis: true
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

export const getNHISReadinessReport = async (req: Request, res: Response) => {
  try {
    const services = await prisma.serviceCatalog.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        code: true,
        serviceType: true,
        serviceCategory: true,
        nhisServiceCode: true,
        isNHISCovered: true
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

export const checkServiceCoverage = async (req: Request, res: Response) => {
  try {
    const { serviceId, paymentMode, insuranceProviderId } = req.body;
    
    if (!serviceId || !paymentMode) {
      return res.status(400).json({ 
        message: 'serviceId and paymentMode are required' 
      });
    }

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
  } catch (error) {
    console.error('Error checking service coverage:', error);
    res.status(500).json({ 
      message: 'Error checking service coverage', 
      error: (error as Error).message 
    });
  }
};

export const calculateServiceCost = async (req: Request, res: Response) => {
  try {
    const { serviceId, paymentMode, quantity = 1, insuranceProviderId } = req.body;
    
    if (!serviceId || !paymentMode) {
      return res.status(400).json({ 
        message: 'serviceId and paymentMode are required' 
      });
    }

    const service = await prisma.serviceCatalog.findUnique({
      where: { id: serviceId },
      include: { pricing: true }
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
  } catch (error) {
    console.error('Error calculating service cost:', error);
    res.status(500).json({ 
      message: 'Error calculating service cost', 
      error: (error as Error).message 
    });
  }
};

// Bulk update NHIS codes
export const bulkUpdateNHISCodes = [
  body('updates').isArray().withMessage('Updates must be an array'),
  body('updates.*.serviceId').notEmpty().withMessage('Service ID is required'),
  body('updates.*.nhisServiceCode').notEmpty().withMessage('NHIS service code is required'),

  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { updates } = req.body;
      const results = [];

      for (const update of updates) {
        try {
          const service = await prisma.serviceCatalog.update({
            where: { id: update.serviceId },
            data: {
              nhisServiceCode: update.nhisServiceCode,
              tariffCode: update.tariffCode || undefined
            }
          });
          results.push({ serviceId: update.serviceId, status: 'success', service });
        } catch (error) {
          results.push({ 
            serviceId: update.serviceId, 
            status: 'error', 
            error: (error as Error).message 
          });
        }
      }

      res.json({
        message: 'Bulk NHIS code update completed',
        results,
        summary: {
          total: updates.length,
          success: results.filter(r => r.status === 'success').length,
          errors: results.filter(r => r.status === 'error').length
        }
      });
    } catch (error) {
      console.error('Error in bulk NHIS code update:', error);
      res.status(500).json({ 
        message: 'Error updating NHIS codes', 
        error: (error as Error).message 
      });
    }
  }
];