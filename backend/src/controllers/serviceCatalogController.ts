// controllers/serviceCatalogController.ts - COMPLETE FIXED VERSION

import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient, ServiceType, ServiceCategory } from '@prisma/client';
import { AuthRequest } from '../middleware/authMiddleware';

const prisma = new PrismaClient();

// ==============================================
// GET ALL SERVICE CATALOG ITEMS
// ==============================================
export const getServiceCatalog = async (req: AuthRequest, res: Response) => {
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
    
    if (serviceType) where.serviceType = serviceType as ServiceType;
    if (category) where.serviceCategory = category as ServiceCategory;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { code: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { nhisServiceCode: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(1000, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    const [services, total] = await Promise.all([
      prisma.serviceCatalog.findMany({
        where,
        include: {
          pricing: {
            select: {
              id: true,
              cashPrice: true,
              nhisPrice: true,
              insurancePrice: true,
              vatRate: true,
              isTaxable: true,
              isActive: true,
              effectiveDate: true
            }
          },
          Diagnosis: {
            select: {
              id: true,
              name: true,
              icdCode: true,
              description: true,
              isActive: true
            }
          },
          LabTestTemplate: {
            select: {
              id: true,
              name: true,
              investigationCode: true,
              category: true
            }
          },
          ProcedureTemplate: {
            select: {
              id: true,
              name: true,
              procedureCode: true,
              category: true
            }
          },
          ScanTemplate: {
            select: {
              id: true,
              name: true,
              scanCode: true,
              category: true
            }
          },
          StockItem: {
            select: {
              id: true,
              name: true,
              drugCode: true,
              strength: true,
              currentStock: true
            }
          },
          Ward: {
            select: {
              id: true,
              wardName: true,
              wardType: true
            }
          },
          ConsultationType: {
            select: {
              id: true,
              name: true,
              code: true
            }
          },
          User: {
            select: {
              id: true,
              fullName: true,
              username: true
            }
          },
          _count: {
            select: {
              ServiceRendered: true,
              BillLineItem: true,
              labTests: true,
              scans: true,
              procedures: true,
              medications: true
            }
          }
        },
        orderBy: { name: 'asc' },
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
    console.error('Error fetching service catalog:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching service catalog', 
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

// ==============================================
// GET SERVICE CATALOG ITEM BY ID
// ==============================================
export const getServiceCatalogById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const serviceItem = await prisma.serviceCatalog.findUnique({
      where: { id },
      include: {
        pricing: {
          select: {
            id: true,
            cashPrice: true,
            nhisPrice: true,
            insurancePrice: true,
            vatRate: true,
            isTaxable: true,
            isActive: true,
            effectiveDate: true,
            expiryDate: true
          }
        },
        Diagnosis: {
          select: {
            id: true,
            name: true,
            icdCode: true,
            description: true,
            isActive: true
          }
        },
        LabTestTemplate: {
          select: {
            id: true,
            name: true,
            investigationCode: true,
            category: true,
            specimenType: true
          }
        },
        ProcedureTemplate: {
          select: {
            id: true,
            name: true,
            procedureCode: true,
            category: true,
            department: true
          }
        },
        ScanTemplate: {
          select: {
            id: true,
            name: true,
            scanCode: true,
            category: true,
            bodyPart: true
          }
        },
        StockItem: {
          select: {
            id: true,
            name: true,
            drugCode: true,
            strength: true,
            category: true,
            currentStock: true,
            unitOfMeasure: true
          }
        },
        Ward: {
          select: {
            id: true,
            wardName: true,
            wardType: true,
            totalBeds: true,
            occupiedBeds: true
          }
        },
        ConsultationType: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        User: {
          select: {
            id: true,
            fullName: true,
            username: true,
            role: true
          }
        }
      }
    });

    if (!serviceItem) {
      return res.status(404).json({
        success: false,
        message: 'Service catalog item not found'
      });
    }

    res.json({
      success: true,
      data: serviceItem
    });
  } catch (error) {
    console.error('Error fetching service catalog item:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching service catalog item', 
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

// ==============================================
// CREATE SERVICE CATALOG ITEM
// ==============================================
export const createServiceCatalogItem = [
  body('name').notEmpty().withMessage('Name is required'),
  body('code').notEmpty().withMessage('Code is required'),
  body('serviceType').isIn([
    'consultation', 'ward', 'lab_test', 'scan', 'medication', 'procedure', 'diagnosis', 'miscellaneous'
  ]).withMessage('Valid service type is required'),
  body('cashPrice').isNumeric().withMessage('Cash price must be a number'),

  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false,
          errors: errors.array() 
        });
      }

      const {
        name,
        code,
        description,
        serviceType,
        serviceCategory = 'opd',
        subType,
        nhisServiceCode,
        isNHISCovered = true,
        nhisCoverageType = 'full',
        nhisRequiresAuth = false,
        privateInsRequiresAuth = false,
        isPrivateInsuranceExempted = false,
        unit = 'Each',
        requiresClinicalNotes = false,
        metadata,
        diagnosisId,
        labTestTemplateId,
        procedureTemplateId,
        stockItemId,
        wardId,
        scanTemplateId,
        consultationTypeId,
        cashPrice,
        nhisPrice = 0,
        insurancePrice,
        vatRate = 0,
        isTaxable = true,
        isActive = true
      } = req.body;

      // Check if service code already exists
      const existingService = await prisma.serviceCatalog.findUnique({
        where: { code }
      });

      if (existingService) {
        return res.status(400).json({
          success: false,
          message: `Service code '${code}' already exists`
        });
      }

      const finalInsurancePrice = insurancePrice !== undefined ? insurancePrice : cashPrice;

      // Create service catalog item with pricing in a transaction
      const result = await prisma.$transaction(async (tx) => {
        const serviceItem = await tx.serviceCatalog.create({
          data: {
            name,
            code,
            description: description || null,
            serviceType: serviceType as ServiceType,
            serviceCategory: serviceCategory as ServiceCategory,
            subType: subType || null,
            nhisServiceCode: nhisServiceCode || null,
            isNHISCovered,
            nhisCoverageType,
            nhisRequiresAuth,
            privateInsRequiresAuth,
            isPrivateInsuranceExempted,
            unit,
            requiresClinicalNotes,
            metadata: metadata || null,
            isPending: false,
            isActive,
            diagnosisId: diagnosisId || null,
            labTestTemplateId: labTestTemplateId || null,
            procedureTemplateId: procedureTemplateId || null,
            stockItemId: stockItemId || null,
            wardId: wardId || null,
            scanTemplateId: scanTemplateId || null,
            consultationTypeId: consultationTypeId || null,
            createdById: req.user?.id
          }
        });

        // Create pricing record
        await tx.servicePricing.create({
          data: {
            serviceCatalogId: serviceItem.id,
            cashPrice: parseFloat(cashPrice),
            nhisPrice: parseFloat(nhisPrice),
            insurancePrice: parseFloat(finalInsurancePrice),
            vatRate: parseFloat(vatRate),
            isTaxable,
            effectiveDate: new Date(),
            isActive: true
          }
        });

        return serviceItem;
      });

      const createdService = await prisma.serviceCatalog.findUnique({
        where: { id: result.id },
        include: {
          pricing: true
        }
      });

      console.log(`✅ Service catalog item created: ${name} (${code})`);

      res.status(201).json({
        success: true,
        message: 'Service catalog item created successfully',
        data: createdService
      });

    } catch (error) {
      console.error('Error creating service catalog item:', error);
      
      if ((error as any).code === 'P2002') {
        return res.status(400).json({
          success: false,
          message: 'Service code already exists'
        });
      }
      
      res.status(500).json({ 
        success: false,
        message: 'Error creating service catalog item', 
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  }
];

// ==============================================
// UPDATE SERVICE CATALOG ITEM
// ==============================================
// controllers/serviceCatalogController.ts

export const updateServiceCatalogItem = [
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      console.log('🔄 Updating service catalog item:', { id, updateData });

      // Check if service exists
      const existingService = await prisma.serviceCatalog.findUnique({
        where: { id },
        include: { pricing: true }
      });

      if (!existingService) {
        return res.status(404).json({
          success: false,
          message: 'Service catalog item not found'
        });
      }

      // ✅ Prepare update data - only include fields that exist in schema
      const serviceUpdateData: any = {};
      const pricingUpdateData: any = {};

      // Map frontend fields to backend schema
      if (updateData.name !== undefined) serviceUpdateData.name = updateData.name;
      if (updateData.code !== undefined) serviceUpdateData.code = updateData.code;
      if (updateData.description !== undefined) serviceUpdateData.description = updateData.description;
      if (updateData.serviceType !== undefined) serviceUpdateData.serviceType = updateData.serviceType;
      if (updateData.serviceCategory !== undefined) serviceUpdateData.serviceCategory = updateData.serviceCategory;
      if (updateData.subType !== undefined) serviceUpdateData.subType = updateData.subType;
      if (updateData.nhisServiceCode !== undefined) serviceUpdateData.nhisServiceCode = updateData.nhisServiceCode;
      if (updateData.isNHISCovered !== undefined) serviceUpdateData.isNHISCovered = updateData.isNHISCovered;
      if (updateData.nhisCoverageType !== undefined) serviceUpdateData.nhisCoverageType = updateData.nhisCoverageType;
      if (updateData.nhisRequiresAuth !== undefined) serviceUpdateData.nhisRequiresAuth = updateData.nhisRequiresAuth;
      if (updateData.privateInsRequiresAuth !== undefined) serviceUpdateData.privateInsRequiresAuth = updateData.privateInsRequiresAuth;
      if (updateData.isPrivateInsuranceExempted !== undefined) serviceUpdateData.isPrivateInsuranceExempted = updateData.isPrivateInsuranceExempted;
      if (updateData.unit !== undefined) serviceUpdateData.unit = updateData.unit;
      if (updateData.requiresClinicalNotes !== undefined) serviceUpdateData.requiresClinicalNotes = updateData.requiresClinicalNotes;
      if (updateData.metadata !== undefined) serviceUpdateData.metadata = updateData.metadata;
      if (updateData.tariffCode !== undefined) serviceUpdateData.tariffCode = updateData.tariffCode;
      if (updateData.isActive !== undefined) serviceUpdateData.isActive = updateData.isActive;
      
      // Handle related IDs (these are foreign keys)
      if (updateData.diagnosisId !== undefined) serviceUpdateData.diagnosisId = updateData.diagnosisId || null;
      if (updateData.labTestTemplateId !== undefined) serviceUpdateData.labTestTemplateId = updateData.labTestTemplateId || null;
      if (updateData.procedureTemplateId !== undefined) serviceUpdateData.procedureTemplateId = updateData.procedureTemplateId || null;
      if (updateData.stockItemId !== undefined) serviceUpdateData.stockItemId = updateData.stockItemId || null;
      if (updateData.wardId !== undefined) serviceUpdateData.wardId = updateData.wardId || null;
      if (updateData.scanTemplateId !== undefined) serviceUpdateData.scanTemplateId = updateData.scanTemplateId || null;
      if (updateData.consultationTypeId !== undefined) serviceUpdateData.consultationTypeId = updateData.consultationTypeId || null;

      // Handle pricing fields
      if (updateData.cashPrice !== undefined) pricingUpdateData.cashPrice = updateData.cashPrice;
      if (updateData.nhisPrice !== undefined) pricingUpdateData.nhisPrice = updateData.nhisPrice;
      if (updateData.insurancePrice !== undefined) pricingUpdateData.insurancePrice = updateData.insurancePrice;
      if (updateData.vatRate !== undefined) pricingUpdateData.vatRate = updateData.vatRate;
      if (updateData.isTaxable !== undefined) pricingUpdateData.isTaxable = updateData.isTaxable;

      // Update in transaction
      await prisma.$transaction(async (tx) => {
        // Update service catalog
        if (Object.keys(serviceUpdateData).length > 0) {
          await tx.serviceCatalog.update({
            where: { id },
            data: {
              ...serviceUpdateData,
              updatedAt: new Date()
            }
          });
        }

        // Update pricing if provided
        if (Object.keys(pricingUpdateData).length > 0) {
          const existingPricing = await tx.servicePricing.findUnique({
            where: { serviceCatalogId: id }
          });

          if (existingPricing) {
            await tx.servicePricing.update({
              where: { serviceCatalogId: id },
              data: {
                ...pricingUpdateData,
                updatedAt: new Date()
              }
            });
          } else {
            await tx.servicePricing.create({
              data: {
                serviceCatalogId: id,
                cashPrice: pricingUpdateData.cashPrice || 0,
                nhisPrice: pricingUpdateData.nhisPrice || 0,
                insurancePrice: pricingUpdateData.insurancePrice || 0,
                vatRate: pricingUpdateData.vatRate || 0,
                isTaxable: pricingUpdateData.isTaxable !== undefined ? pricingUpdateData.isTaxable : true,
                effectiveDate: new Date(),
                isActive: true
              }
            });
          }
        }
      });

      // Fetch updated service
      const updatedService = await prisma.serviceCatalog.findUnique({
        where: { id },
        include: { pricing: true }
      });

      console.log('✅ Service updated successfully:', updatedService?.name);

      res.json({
        success: true,
        message: 'Service updated successfully',
        data: updatedService
      });

    } catch (error) {
      console.error('❌ Error updating service catalog item:', error);
      
      // Send detailed error for debugging
      res.status(500).json({
        success: false,
        message: 'Error updating service catalog item',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
        stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
      });
    }
  }
];

// ==============================================
// DELETE SERVICE CATALOG ITEM
// ==============================================
export const deleteServiceCatalogItem = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if service exists and has dependencies
    const existingService = await prisma.serviceCatalog.findUnique({
      where: { id },
      include: {
        pricing: true,
        ServiceRendered: { take: 1 },
        BillLineItem: { take: 1 },
        labTests: { take: 1 },
        scans: { take: 1 },
        procedures: { take: 1 },
        medications: { take: 1 }
      }
    });

    if (!existingService) {
      return res.status(404).json({
        success: false,
        message: 'Service catalog item not found'
      });
    }

    // Check for dependencies
    const hasDependencies = 
      existingService.ServiceRendered.length > 0 ||
      existingService.BillLineItem.length > 0 ||
      existingService.labTests.length > 0 ||
      existingService.scans.length > 0 ||
      existingService.procedures.length > 0 ||
      existingService.medications.length > 0;

    if (hasDependencies) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete service catalog item with associated records. Deactivate it instead.'
      });
    }

    // Delete in transaction
    await prisma.$transaction(async (tx) => {
      // Delete pricing first (foreign key constraint)
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

    console.log(`✅ Service catalog item deleted: ${existingService.name}`);

    res.json({
      success: true,
      message: 'Service catalog item deleted successfully',
      data: {
        id: existingService.id,
        name: existingService.name,
        code: existingService.code
      }
    });

  } catch (error) {
    console.error('Error deleting service catalog item:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error deleting service catalog item', 
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

// ==============================================
// GET SERVICE METADATA
// ==============================================
export const getServiceMetadata = async (req: AuthRequest, res: Response) => {
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
        nhisServiceCode: { not: null },
        nhisServiceCode: { not: "" },
        isActive: true
      }
    });

    const totalActiveServices = await prisma.serviceCatalog.count({
      where: { isActive: true }
    });

    res.json({
      success: true,
      data: {
        categories: categories.map(c => c.serviceCategory).filter(Boolean),
        serviceTypes: serviceTypes.map(st => st.serviceType).filter(Boolean),
        nhisSummary: {
          totalNHISReady: nhisServicesCount,
          totalActiveServices,
          coveragePercentage: totalActiveServices > 0 ? (nhisServicesCount / totalActiveServices) * 100 : 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching service metadata:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching service metadata', 
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

// ==============================================
// GET SERVICES BY CATEGORY
// ==============================================
export const getServicesByCategory = async (req: AuthRequest, res: Response) => {
  try {
    const { category } = req.params;
    
    const validCategories = ['opd', 'ipd', 'diagnostics', 'pharmacy', 'other'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid service category. Valid options: opd, ipd, diagnostics, pharmacy, other'
      });
    }

    const services = await prisma.serviceCatalog.findMany({
      where: {
        serviceCategory: category as ServiceCategory,
        isActive: true
      },
      include: {
        pricing: {
          select: {
            cashPrice: true,
            nhisPrice: true,
            insurancePrice: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: {
        category,
        count: services.length,
        services
      }
    });
  } catch (error) {
    console.error('Error fetching services by category:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching services', 
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

// ==============================================
// GET SERVICE BY NHIS CODE
// ==============================================
export const getServiceByNHISCode = async (req: AuthRequest, res: Response) => {
  try {
    const { nhisCode } = req.params;
    
    const service = await prisma.serviceCatalog.findFirst({
      where: { 
        nhisServiceCode: nhisCode,
        isActive: true
      },
      include: {
        pricing: {
          select: {
            cashPrice: true,
            nhisPrice: true,
            insurancePrice: true
          }
        }
      }
    });

    if (!service) {
      return res.status(404).json({ 
        success: false,
        message: 'Service with specified NHIS code not found' 
      });
    }

    res.json({
      success: true,
      data: service
    });
  } catch (error) {
    console.error('Error fetching service by NHIS code:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching service by NHIS code', 
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

// ==============================================
// GET NHIS READINESS REPORT
// ==============================================
export const getNHISReadinessReport = async (req: AuthRequest, res: Response) => {
  try {
    const services = await prisma.serviceCatalog.findMany({
      where: { isActive: true },
      include: { 
        pricing: {
          select: { nhisPrice: true }
        }
      }
    });
    
    const report = {
      totalServices: services.length,
      nhisReady: services.filter(s => s.nhisServiceCode && s.pricing?.nhisPrice && s.pricing.nhisPrice > 0).length,
      missingNHISCodes: services.filter(s => !s.nhisServiceCode).length,
      missingNHISPrices: services.filter(s => s.nhisServiceCode && (!s.pricing || s.pricing.nhisPrice === 0)).length,
      notCovered: services.filter(s => !s.isNHISCovered).length,
      byServiceType: services.reduce((acc, service) => {
        const type = service.serviceType;
        if (!acc[type]) {
          acc[type] = { total: 0, nhisReady: 0, missingCode: 0, missingPrice: 0, notCovered: 0 };
        }
        acc[type].total++;
        if (service.nhisServiceCode && service.pricing?.nhisPrice > 0) acc[type].nhisReady++;
        if (!service.nhisServiceCode) acc[type].missingCode++;
        if (service.nhisServiceCode && (!service.pricing || service.pricing.nhisPrice === 0)) acc[type].missingPrice++;
        if (!service.isNHISCovered) acc[type].notCovered++;
        return acc;
      }, {} as any),
      servicesMissingNHIS: services
        .filter(s => !s.nhisServiceCode || !s.pricing?.nhisPrice)
        .map(s => ({ 
          id: s.id, 
          name: s.name, 
          code: s.code, 
          serviceType: s.serviceType,
          serviceCategory: s.serviceCategory,
          missingCode: !s.nhisServiceCode, 
          missingPrice: !s.pricing?.nhisPrice 
        }))
    };

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error generating NHIS readiness report:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error generating NHIS readiness report', 
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

// ==============================================
// CHECK SERVICE COVERAGE
// ==============================================
export const checkServiceCoverage = async (req: AuthRequest, res: Response) => {
  try {
    const { serviceId, paymentMode } = req.body;
    
    if (!serviceId || !paymentMode) {
      return res.status(400).json({ 
        success: false,
        message: 'serviceId and paymentMode are required' 
      });
    }

    const service = await prisma.serviceCatalog.findUnique({
      where: { id: serviceId },
      include: { pricing: true }
    });

    if (!service || !service.pricing) {
      return res.status(404).json({ 
        success: false,
        message: 'Service not found or pricing not configured' 
      });
    }

    let isCovered = false;
    let coverageAmount = 0;
    let patientPayable = 0;

    if (paymentMode === 'cash') {
      isCovered = false;
      patientPayable = service.pricing.cashPrice;
    } else if (paymentMode === 'nhis') {
      isCovered = service.isNHISCovered;
      coverageAmount = service.pricing.nhisPrice;
      patientPayable = isCovered ? 0 : service.pricing.cashPrice;
    } else if (paymentMode === 'private_insurance') {
      isCovered = !service.isPrivateInsuranceExempted;
      coverageAmount = service.pricing.insurancePrice;
      patientPayable = isCovered ? 0 : service.pricing.cashPrice;
    }

    res.json({
      success: true,
      data: {
        serviceId,
        serviceName: service.name,
        paymentMode,
        isCovered,
        coverageAmount,
        patientPayable,
        cashPrice: service.pricing.cashPrice,
        nhisPrice: service.pricing.nhisPrice,
        insurancePrice: service.pricing.insurancePrice,
        requiresAuthorization: paymentMode === 'nhis' ? service.nhisRequiresAuth : service.privateInsRequiresAuth
      }
    });
  } catch (error) {
    console.error('Error checking service coverage:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error checking service coverage', 
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

// ==============================================
// CALCULATE SERVICE COST
// ==============================================
export const calculateServiceCost = async (req: AuthRequest, res: Response) => {
  try {
    const { serviceId, paymentMode, quantity = 1 } = req.body;
    
    if (!serviceId || !paymentMode) {
      return res.status(400).json({ 
        success: false,
        message: 'serviceId and paymentMode are required' 
      });
    }

    const service = await prisma.serviceCatalog.findUnique({
      where: { id: serviceId },
      include: { pricing: true }
    });

    if (!service || !service.pricing) {
      return res.status(404).json({ 
        success: false,
        message: 'Service not found or pricing not configured' 
      });
    }

    const qty = parseInt(quantity) || 1;
    let totalAmount = 0;
    let coverageAmount = 0;
    let patientAmount = 0;

    if (paymentMode === 'cash') {
      totalAmount = service.pricing.cashPrice * qty;
      patientAmount = totalAmount;
    } else if (paymentMode === 'nhis') {
      totalAmount = service.pricing.cashPrice * qty;
      coverageAmount = service.pricing.nhisPrice * qty;
      patientAmount = service.isNHISCovered ? totalAmount - coverageAmount : totalAmount;
    } else if (paymentMode === 'private_insurance') {
      totalAmount = service.pricing.cashPrice * qty;
      coverageAmount = service.pricing.insurancePrice * qty;
      patientAmount = service.isPrivateInsuranceExempted ? totalAmount : totalAmount - coverageAmount;
    }

    res.json({
      success: true,
      data: {
        service: {
          id: service.id,
          name: service.name,
          code: service.code
        },
        quantity: qty,
        paymentMode,
        totalAmount,
        coverageAmount,
        patientAmount,
        breakdown: {
          unitPrice: service.pricing.cashPrice,
          nhisUnitPrice: service.pricing.nhisPrice,
          insuranceUnitPrice: service.pricing.insurancePrice,
          vatRate: service.pricing.vatRate,
          isTaxable: service.pricing.isTaxable
        }
      }
    });
  } catch (error) {
    console.error('Error calculating service cost:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error calculating service cost', 
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

// ==============================================
// BULK UPDATE NHIS CODES
// ==============================================
export const bulkUpdateNHISCodes = [
  body('updates').isArray({ min: 1 }).withMessage('Updates must be a non-empty array'),
  body('updates.*.serviceId').notEmpty().withMessage('Service ID is required'),
  body('updates.*.nhisServiceCode').notEmpty().withMessage('NHIS service code is required'),

  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false,
          errors: errors.array() 
        });
      }

      const { updates } = req.body;
      const results = [];
      let successCount = 0;
      let errorCount = 0;

      for (const update of updates) {
        try {
          const service = await prisma.serviceCatalog.update({
            where: { id: update.serviceId },
            data: {
              nhisServiceCode: update.nhisServiceCode,
              tariffCode: update.tariffCode || null,
              isNHISCovered: update.isNHISCovered !== undefined ? update.isNHISCovered : true,
              updatedAt: new Date()
            },
            select: {
              id: true,
              name: true,
              code: true,
              nhisServiceCode: true
            }
          });
          results.push({ serviceId: update.serviceId, status: 'success', service });
          successCount++;
        } catch (error) {
          results.push({ 
            serviceId: update.serviceId, 
            status: 'error', 
            error: (error as Error).message 
          });
          errorCount++;
        }
      }

      console.log(`✅ Bulk NHIS code update: ${successCount} succeeded, ${errorCount} failed`);

      res.json({
        success: true,
        message: 'Bulk NHIS code update completed',
        data: {
          results,
          summary: {
            total: updates.length,
            success: successCount,
            errors: errorCount
          }
        }
      });
    } catch (error) {
      console.error('Error in bulk NHIS code update:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error updating NHIS codes', 
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  }
];

// ==============================================
// TOGGLE SERVICE ACTIVE STATUS
// ==============================================
export const toggleServiceStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (isActive === undefined) {
      return res.status(400).json({
        success: false,
        message: 'isActive field is required'
      });
    }

    const service = await prisma.serviceCatalog.findUnique({
      where: { id }
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service catalog item not found'
      });
    }

    const updatedService = await prisma.serviceCatalog.update({
      where: { id },
      data: {
        isActive,
        updatedAt: new Date()
      },
      include: {
        pricing: true
      }
    });

    res.json({
      success: true,
      message: `Service ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: updatedService
    });
  } catch (error) {
    console.error('Error toggling service status:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error toggling service status', 
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};