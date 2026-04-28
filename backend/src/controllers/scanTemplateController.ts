// controllers/scanController.ts - UPDATED WITH PAGINATION
import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient, ServiceType, ServiceCategory } from '@prisma/client';

const prisma = new PrismaClient();

// ==========================================
// GET ALL SCAN TEMPLATES (WITH PAGINATION)
// ==========================================
export const getScanTemplates = async (req: Request, res: Response) => {
  try {
    const { isActive, category, bodyPart, scanType, page = 1, limit = 50 } = req.query;
    const where: any = {
      serviceType: 'scan'
    };
    
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    
    if (category) {
      where.serviceCategory = category;
    }
    
    if (bodyPart) {
      where.subType = bodyPart;
    }
    
    if (scanType) {
      where.OR = [
        { name: { contains: scanType, mode: 'insensitive' } },
        { description: { contains: scanType, mode: 'insensitive' } }
      ];
    }

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    const [templates, total] = await Promise.all([
      prisma.serviceCatalog.findMany({
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
        },
        skip,
        take: limitNum
      }),
      prisma.serviceCatalog.count({ where })
    ]);
    
    res.json({
      success: true,
      data: templates,
      pagination: {
        currentPage: pageNum,
        pageSize: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching scan templates:', error);
    res.status(500).json({ message: 'Error fetching scan templates', error });
  }
};

// ==========================================
// GET SCAN TEMPLATE BY ID
// ==========================================
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
                Patient: {
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

// ==========================================
// CREATE SCAN TEMPLATE
// ==========================================
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

      const existingTemplate = await prisma.serviceCatalog.findUnique({
        where: { code: req.body.code }
      });

      if (existingTemplate) {
        return res.status(400).json({ message: 'Service code already exists' });
      }

      const result = await prisma.$transaction(async (tx) => {
        const template = await tx.serviceCatalog.create({
          data: {
            name: req.body.name,
            code: req.body.code,
            description: req.body.description,
            serviceType: 'scan',
            serviceCategory: req.body.serviceCategory,
            subType: req.body.bodyPart || null,
            nhisServiceCode: req.body.nhisServiceCode,
            tariffCode: req.body.tariffCode,
            isNHISCovered: req.body.isNHISCovered !== undefined ? req.body.isNHISCovered : true,
            nhisRequiresAuth: req.body.nhisRequiresAuth || false,
            metadata: {
              bodyPart: req.body.bodyPart,
              preparationInstructions: req.body.preparationInstructions,
              duration: req.body.duration,
              contrastRequired: req.body.contrastRequired || false,
              scanType: req.body.scanType
            },
            isActive: req.body.isActive !== undefined ? req.body.isActive : true,
            unit: req.body.unit || 'Each',
            createdById: (req as any).user?.id
          }
        });
      
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

// ==========================================
// UPDATE SCAN TEMPLATE
// ==========================================
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
      
      const existingTemplate = await prisma.serviceCatalog.findFirst({
        where: { 
          id,
          serviceType: 'scan'
        },
        include: { pricing: true }
      });
      
      if (!existingTemplate) {
        return res.status(404).json({ message: 'Scan template not found' });
      }

      if (req.body.code && req.body.code !== existingTemplate.code) {
        const templateWithCode = await prisma.serviceCatalog.findUnique({
          where: { code: req.body.code }
        });

        if (templateWithCode) {
          return res.status(400).json({ message: 'Service code already exists' });
        }
      }

      const result = await prisma.$transaction(async (tx) => {
        const updateData: any = { ...req.body };
        
        delete updateData.cashPrice;
        delete updateData.nhisPrice;
        delete updateData.insurancePrice;
        delete updateData.vatRate;
        delete updateData.isTaxable;
      
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
      
        if (req.body.bodyPart !== undefined) {
          updateData.subType = req.body.bodyPart;
        }
      
        if (req.body.nhisRequiresAuth !== undefined) {
          updateData.nhisRequiresAuth = req.body.nhisRequiresAuth;
        }
      
        const template = await tx.serviceCatalog.update({
          where: { id },
          data: {
            ...updateData,
            updatedAt: new Date()
          }
        });
      
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

// ==========================================
// DELETE SCAN TEMPLATE
// ==========================================
export const deleteScanTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const existingTemplate = await prisma.serviceCatalog.findFirst({
      where: { 
        id,
        serviceType: 'scan'
      },
      include: {
        scans: { take: 1 },
        pricing: true
      }
    });
    
    if (!existingTemplate) {
      return res.status(404).json({ message: 'Scan template not found' });
    }

    if (existingTemplate.scans.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete scan template with associated scans' 
      });
    }

    await prisma.$transaction(async (tx) => {
      if (existingTemplate.pricing) {
        await tx.servicePricing.delete({
          where: { serviceCatalogId: id }
        });
      }

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

// ==========================================
// GET SCAN CATEGORIES
// ==========================================
export const getScanCategories = async (req: Request, res: Response) => {
  try {
    const categories = Object.values(ServiceCategory);
    res.json(categories);
  } catch (error) {
    console.error('Error fetching scan categories:', error);
    res.status(500).json({ message: 'Error fetching scan categories', error });
  }
};

// ==========================================
// GET SCAN BODY PARTS
// ==========================================
export const getScanBodyParts = async (req: Request, res: Response) => {
  try {
    const templates = await prisma.serviceCatalog.findMany({
      where: {
        serviceType: 'scan',
        subType: { not: null }
      },
      select: { subType: true },
      distinct: ['subType']
    });
    
    const bodyParts = templates
      .map(t => t.subType)
      .filter(Boolean);
    
    if (bodyParts.length === 0) {
      const defaultBodyParts = [
        'head', 'chest', 'neck', 'abdomen', 'pelvis', 
        'spine', 'extremities', 'breast', 'other'
      ];
      res.json(defaultBodyParts);
    } else {
      res.json(bodyParts);
    }
  } catch (error) {
    console.error('Error fetching scan body parts:', error);
    res.status(500).json({ message: 'Error fetching scan body parts', error });
  }
};

// ==========================================
// GET SCAN TYPES
// ==========================================
export const getScanTypes = async (req: Request, res: Response) => {
  try {
    const templates = await prisma.serviceCatalog.findMany({
      where: {
        serviceType: 'scan',
        metadata: {
          path: ['scanType'],
          not: null
        }
      },
      select: { metadata: true }
    });
    
    const scanTypes = templates
      .map(t => (t.metadata as any)?.scanType)
      .filter(Boolean)
      .filter((value, index, self) => self.indexOf(value) === index);
    
    if (scanTypes.length === 0) {
      const defaultScanTypes = [
        'Ultrasound', 'X-Ray', 'CT Scan', 'MRI', 
        'Mammography', 'Fluoroscopy', 'Doppler', 'Echocardiography'
      ];
      res.json(defaultScanTypes);
    } else {
      res.json(scanTypes);
    }
  } catch (error) {
    console.error('Error fetching scan types:', error);
    res.status(500).json({ message: 'Error fetching scan types', error });
  }
};

// ==========================================
// BULK UPDATE SCAN TEMPLATES
// ==========================================
export const bulkUpdateScanTemplates = async (req: Request, res: Response) => {
  try {
    const { ids, isActive } = req.body;
    
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ message: 'ids array is required' });
    }

    const result = await prisma.serviceCatalog.updateMany({
      where: {
        id: { in: ids },
        serviceType: 'scan'
      },
      data: {
        isActive: isActive !== undefined ? isActive : true,
        updatedAt: new Date()
      }
    });

    res.json({ 
      message: `${result.count} scan templates updated`,
      count: result.count
    });
  } catch (error) {
    console.error('Error bulk updating scan templates:', error);
    res.status(500).json({ message: 'Error bulk updating scan templates', error });
  }
};