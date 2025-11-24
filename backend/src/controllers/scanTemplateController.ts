// controllers/scanController.ts - UPDATED FOR SERVICE CATALOG (CORE FUNCTIONS ONLY)
import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient, ServiceType, ServiceCategory } from '@prisma/client';

const prisma = new PrismaClient();

export const getScanTemplates = async (req: Request, res: Response) => {
  try {
    const { isActive, category, bodyPart, scanType } = req.query;
    const where: any = {
      serviceType: 'scan' // ✅ Use string literal matching your enum
    };
    
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    
    if (category) {
      where.serviceCategory = category;
    }
    
    // ✅ Body part and scan type filtering
    if (bodyPart) {
      where.subType = bodyPart; // ✅ bodyPart is stored in subType field
    }
    
    if (scanType) {
      where.OR = [
        { name: { contains: scanType, mode: 'insensitive' } },
        { description: { contains: scanType, mode: 'insensitive' } }
      ];
    }

    const templates = await prisma.serviceCatalog.findMany({
      where,
      include: {
        pricing: true,
        scans: { 
          select: {
            id: true,
            status: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    res.json(templates);
  } catch (error) {
    console.error('Error fetching scan templates:', error);
    res.status(500).json({ message: 'Error fetching scan templates', error });
  }
};

export const getScanTemplateById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const template = await prisma.serviceCatalog.findUnique({
      where: { 
        id,
        serviceType: 'scan'
      },
      include: {
        pricing: true,
        scans: { 
          include: {
            Attendance: {
              select: {
                attendanceNumber: true,
                Patient: { // ✅ Capital P
                  select: {
                    surname: true,
                    otherNames: true,
                    folderNumber: true
                  }
                }
              }
            }
          },
          orderBy: {
            requestedAt: 'desc'
          },
          take: 10
        }
      }
    });
    
    if (!template) {
      return res.status(404).json({ message: 'Scan template not found' });
    }
    
    res.json(template);
  } catch (error) {
    console.error('Error fetching scan template:', error);
    res.status(500).json({ message: 'Error fetching scan template', error });
  }
};

export const createScanTemplate = [
  body('name').notEmpty().withMessage('Scan name is required'),
  body('code').notEmpty().withMessage('Service code is required'),
  body('serviceCategory').isIn(Object.values(ServiceCategory)).withMessage('Invalid category'),
  body('cashPrice').isFloat({ min: 0 }).withMessage('Cash price must be a non-negative number'),
  body('nhisPrice').optional().isFloat({ min: 0 }).withMessage('NHIS price must be a non-negative number'),
  body('insurancePrice').isFloat({ min: 0 }).withMessage('Insurance price must be a non-negative number'),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Check if service code already exists
      const existingTemplate = await prisma.serviceCatalog.findUnique({
        where: { code: req.body.code }
      });

      if (existingTemplate) {
        return res.status(400).json({ message: 'Service code already exists' });
      }

      const result = await prisma.$transaction(async (tx) => {
        // Create the scan service
        const template = await tx.serviceCatalog.create({
          data: {
            name: req.body.name,
            code: req.body.code,
            description: req.body.description,
            serviceType: 'scan', // ✅ String literal
            serviceCategory: req.body.serviceCategory,
            subType: req.body.bodyPart || null, // ✅ Store bodyPart in subType
            
            // NHIS Compliance
            nhisServiceCode: req.body.nhisServiceCode,
            tariffCode: req.body.tariffCode,
            isNHISCovered: req.body.isNHISCovered !== undefined ? req.body.isNHISCovered : true,
            nhisRequiresAuth: req.body.nhisRequiresAuth || false,
            
            // Scan Metadata - store in metadata field
            metadata: {
              bodyPart: req.body.bodyPart,
              preparationInstructions: req.body.preparationInstructions,
              duration: req.body.duration,
              contrastRequired: req.body.contrastRequired || false,
              scanType: req.body.scanType
            },
            
            // Default values
            isActive: req.body.isActive !== undefined ? req.body.isActive : true,
            unit: req.body.unit || 'Each',
            createdById: (req as any).user?.id
          }
        });
      
        // Create pricing record
        await tx.servicePricing.create({
          data: {
            serviceCatalogId: template.id,
            cashPrice: parseFloat(req.body.cashPrice),
            nhisPrice: parseFloat(req.body.nhisPrice) || 0,
            insurancePrice: parseFloat(req.body.insurancePrice),
            vatRate: req.body.vatRate ? parseFloat(req.body.vatRate) : 0,
            isTaxable: req.body.isTaxable !== undefined ? req.body.isTaxable : true,
            isActive: true,
            effectiveDate: new Date()
          }
        });
      
        return template;
      });

      const templateWithPricing = await prisma.serviceCatalog.findUnique({
        where: { id: result.id },
        include: { pricing: true }
      });
      
      res.status(201).json(templateWithPricing);
    } catch (error) {
      console.error('Error creating scan template:', error);
      res.status(500).json({ message: 'Error creating scan template', error });
    }
  }
];

export const updateScanTemplate = [
  body('name').optional().notEmpty().withMessage('Scan name cannot be empty'),
  body('code').optional().notEmpty().withMessage('Service code cannot be empty'),
  body('serviceCategory').optional().isIn(Object.values(ServiceCategory)).withMessage('Invalid category'),
  body('cashPrice').optional().isFloat({ min: 0 }).withMessage('Cash price must be a non-negative number'),
  body('nhisPrice').optional().isFloat({ min: 0 }).withMessage('NHIS price must be a non-negative number'),
  body('insurancePrice').optional().isFloat({ min: 0 }).withMessage('Insurance price must be a non-negative number'),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      
      // Check if template exists
      const existingTemplate = await prisma.serviceCatalog.findFirst({
        where: { 
          id,
          serviceType: ServiceType.scan 
        },
        include: { pricing: true }
      });
      
      if (!existingTemplate) {
        return res.status(404).json({ message: 'Scan template not found' });
      }

      // Check if service code is being changed and if it already exists
      if (req.body.code && req.body.code !== existingTemplate.code) {
        const templateWithCode = await prisma.serviceCatalog.findUnique({
          where: { code: req.body.code }
        });

        if (templateWithCode) {
          return res.status(400).json({ message: 'Service code already exists' });
        }
      }

      const result = await prisma.$transaction(async (tx) => {
        // Prepare update data
        const updateData: any = { ...req.body };
        
        // Remove pricing fields from service update
        delete updateData.cashPrice;
        delete updateData.nhisPrice;
        delete updateData.insurancePrice;
        delete updateData.vatRate;
        delete updateData.isTaxable;
      
        // Handle metadata updates
        if (req.body.bodyPart || req.body.preparationInstructions || req.body.duration !== undefined) {
          const currentMetadata = existingTemplate.metadata as any || {};
          updateData.metadata = {
            ...currentMetadata,
            bodyPart: req.body.bodyPart !== undefined ? req.body.bodyPart : currentMetadata.bodyPart,
            preparationInstructions: req.body.preparationInstructions !== undefined ? req.body.preparationInstructions : currentMetadata.preparationInstructions,
            duration: req.body.duration !== undefined ? req.body.duration : currentMetadata.duration,
            contrastRequired: req.body.contrastRequired !== undefined ? req.body.contrastRequired : currentMetadata.contrastRequired,
            scanType: req.body.scanType !== undefined ? req.body.scanType : currentMetadata.scanType
          };
        }
      
        // Update body part as subType
        if (req.body.bodyPart !== undefined) {
          updateData.subType = req.body.bodyPart;
        }
      
        // Update NHIS fields
        if (req.body.nhisRequiresAuth !== undefined) {
          updateData.nhisRequiresAuth = req.body.nhisRequiresAuth;
        }
      
        // Update service catalog
        const template = await tx.serviceCatalog.update({
          where: { id },
          data: {
            ...updateData,
            updatedAt: new Date()
          }
        });
      
        // Update pricing if provided
        if (req.body.cashPrice !== undefined || req.body.nhisPrice !== undefined || 
            req.body.insurancePrice !== undefined) {
          
          await tx.servicePricing.update({
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
      
        return template;
      });

      const templateWithPricing = await prisma.serviceCatalog.findUnique({
        where: { id: result.id },
        include: { pricing: true }
      });
      
      res.json(templateWithPricing);
    } catch (error) {
      console.error('Error updating scan template:', error);
      res.status(500).json({ message: 'Error updating scan template', error });
    }
  }
];

export const deleteScanTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
// Check if template exists and has dependencies
    const existingTemplate = await prisma.serviceCatalog.findFirst({
      where: { 
        id,
        serviceType: 'scan'
      },
      include: {
        Scan: { take: 1 }, // ✅ Capital S
        pricing: true
      }
    });
    
    if (!existingTemplate) {
      return res.status(404).json({ message: 'Scan template not found' });
    }

    // Check for dependencies
    if (existingTemplate.scans.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete scan template with associated scans' 
      });
    }

    await prisma.$transaction(async (tx) => {
      // Delete pricing first
      if (existingTemplate.pricing) {
        await tx.servicePricing.delete({
          where: { serviceCatalogId: id }
        });
      }

      // Delete service catalog
      await tx.serviceCatalog.delete({
        where: { id }
      });
    });

    res.json({ message: 'Scan template deleted successfully' });
  } catch (error) {
    console.error('Error deleting scan template:', error);
    res.status(500).json({ message: 'Error deleting scan template', error });
  }
};

export const getScanCategories = async (req: Request, res: Response) => {
  try {
    const categories = Object.values(ServiceCategory);
    res.json(categories);
  } catch (error) {
    console.error('Error fetching scan categories:', error);
    res.status(500).json({ message: 'Error fetching scan categories', error });
  }
};

export const getScanBodyParts = async (req: Request, res: Response) => {
  try {
    // Body parts are stored in subType field for scan services
    const services = await prisma.serviceCatalog.findMany({
      where: { 
        serviceType: 'scan',
        subType: { not: null }
      },
      select: { subType: true },
      distinct: ['subType']
    });
    
    const bodyParts = services
      .map(service => service.subType)
      .filter(Boolean);
    
    res.json(bodyParts);
  } catch (error) {
    console.error('Error fetching scan body parts:', error);
    res.status(500).json({ message: 'Error fetching scan body parts', error });
  }
};

export const getScanTypes = async (req: Request, res: Response) => {
  try {
    // Scan types are stored in metadata.scanType
    const services = await prisma.serviceCatalog.findMany({
      where: {
        serviceType: 'scan',
        metadata: {
          path: ['scanType'],
          not: null
        }
      },
      select: {
        metadata: true
      }
    });
    
    const scanTypes = services
      .map(service => (service.metadata as any)?.scanType)
      .filter(Boolean)
      .filter((value, index, self) => self.indexOf(value) === index);
    
    res.json(scanTypes);
  } catch (error) {
    console.error('Error fetching scan types:', error);
    res.status(500).json({ message: 'Error fetching scan types', error });
  }
};