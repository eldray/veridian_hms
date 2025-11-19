import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient, ScanCategory, BodyPart } from '@prisma/client';

const prisma = new PrismaClient();

export const getScanTemplates = async (req: Request, res: Response) => {
  try {
    const { isPending, category, bodyPart, scanType } = req.query;
    const where: any = {};
    
    if (isPending !== undefined) {
      where.isPending = isPending === 'true';
    }
    
    if (category) {
      where.category = category as ScanCategory;
    }
    
    if (bodyPart) {
      where.bodyPart = bodyPart as BodyPart;
    }

    if (scanType) {
      where.scanType = scanType as string;
    }

    const templates = await prisma.scanTemplate.findMany({
      where,
      orderBy: {
        name: 'asc'
      },
      include: {
        scans: {
          select: {
            id: true,
            status: true
          }
        },
        serviceCatalogs: {
          select: {
            id: true,
            code: true
          }
        }
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
    
    const template = await prisma.scanTemplate.findUnique({
      where: { id },
      include: {
        scans: {
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
            }
          },
          orderBy: {
            requestedAt: 'desc'
          },
          take: 10
        },
        serviceCatalogs: true
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
  body('description').notEmpty().withMessage('Description is required'),
  body('scanCode').notEmpty().withMessage('Scan code is required'),
  body('category').isIn(Object.values(ScanCategory)).withMessage('Invalid category'),
  body('bodyPart').isIn(Object.values(BodyPart)).withMessage('Invalid body part'),
  body('cashPrice').isFloat({ min: 0 }).withMessage('Cash price must be a non-negative number'),
  body('nhisPrice').optional().isFloat({ min: 0 }).withMessage('NHIS price must be a non-negative number'),
  body('insurancePrice').isFloat({ min: 0 }).withMessage('Insurance price must be a non-negative number'),
  body('duration').isInt({ min: 1 }).withMessage('Duration must be a positive number'),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Check if scan code already exists
      const existingTemplate = await prisma.scanTemplate.findUnique({
        where: { scanCode: req.body.scanCode }
      });

      if (existingTemplate) {
        return res.status(400).json({ message: 'Scan code already exists' });
      }

      const templateData = {
        name: req.body.name,
        investigationCode: req.body.investigationCode || null,
        scanCode: req.body.scanCode,
        description: req.body.description,
        category: req.body.category as ScanCategory,
        bodyPart: req.body.bodyPart as BodyPart,
        preparationInstructions: req.body.preparationInstructions || null,
        scanType: req.body.scanType || null,
        cashPrice: parseFloat(req.body.cashPrice),
        nhisPrice: parseFloat(req.body.nhisPrice) || 0,
        insurancePrice: parseFloat(req.body.insurancePrice),
        duration: parseInt(req.body.duration),
        contrastRequired: req.body.contrastRequired || false,
        // NHIS and Insurance fields
        isNHISCovered: req.body.isNHISCovered !== undefined ? req.body.isNHISCovered : true,
        isPrivateInsExempted: req.body.isPrivateInsExempted !== undefined ? req.body.isPrivateInsExempted : false,
        nhisRequiresAuth: req.body.nhisRequiresAuth || false,
        privateInsRequiresAuth: req.body.privateInsRequiresAuth || false,
        tariffCode: req.body.tariffCode || null,
        // Default values from schema
        isPending: req.body.isPending !== undefined ? req.body.isPending : true,
        vatRate: req.body.vatRate ? parseFloat(req.body.vatRate) : 0,
        isTaxable: req.body.isTaxable !== undefined ? req.body.isTaxable : true
      };

      const template = await prisma.scanTemplate.create({
        data: templateData
      });
      
      res.status(201).json(template);
    } catch (error) {
      console.error('Error creating scan template:', error);
      res.status(500).json({ message: 'Error creating scan template', error });
    }
  }
];

export const updateScanTemplate = [
  body('name').optional().notEmpty().withMessage('Scan name cannot be empty'),
  body('description').optional().notEmpty().withMessage('Description cannot be empty'),
  body('category').optional().isIn(Object.values(ScanCategory)).withMessage('Invalid category'),
  body('bodyPart').optional().isIn(Object.values(BodyPart)).withMessage('Invalid body part'),
  body('cashPrice').optional().isFloat({ min: 0 }).withMessage('Cash price must be a non-negative number'),
  body('nhisPrice').optional().isFloat({ min: 0 }).withMessage('NHIS price must be a non-negative number'),
  body('insurancePrice').optional().isFloat({ min: 0 }).withMessage('Insurance price must be a non-negative number'),
  body('duration').optional().isInt({ min: 1 }).withMessage('Duration must be a positive number'),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      
      // Check if template exists
      const existingTemplate = await prisma.scanTemplate.findUnique({
        where: { id }
      });
      
      if (!existingTemplate) {
        return res.status(404).json({ message: 'Scan template not found' });
      }

      // Check if scan code is being changed and if it already exists
      if (req.body.scanCode && req.body.scanCode !== existingTemplate.scanCode) {
        const templateWithCode = await prisma.scanTemplate.findUnique({
          where: { scanCode: req.body.scanCode }
        });

        if (templateWithCode) {
          return res.status(400).json({ message: 'Scan code already exists' });
        }
      }

      // Prepare update data
      const updateData: any = { ...req.body };
      
      // Convert numeric fields if they exist
      if (req.body.cashPrice !== undefined) updateData.cashPrice = parseFloat(req.body.cashPrice);
      if (req.body.nhisPrice !== undefined) updateData.nhisPrice = parseFloat(req.body.nhisPrice);
      if (req.body.insurancePrice !== undefined) updateData.insurancePrice = parseFloat(req.body.insurancePrice);
      if (req.body.duration !== undefined) updateData.duration = parseInt(req.body.duration);
      if (req.body.vatRate !== undefined) updateData.vatRate = parseFloat(req.body.vatRate);

      const template = await prisma.scanTemplate.update({
        where: { id },
        data: updateData
      });
      
      res.json(template);
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
    const existingTemplate = await prisma.scanTemplate.findUnique({
      where: { id },
      include: {
        scans: { take: 1 },
        serviceCatalogs: { take: 1 }
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

    if (existingTemplate.serviceCatalogs.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete scan template with associated service catalogs' 
      });
    }

    await prisma.scanTemplate.delete({
      where: { id }
    });

    res.json({ message: 'Scan template deleted successfully' });
  } catch (error) {
    console.error('Error deleting scan template:', error);
    res.status(500).json({ message: 'Error deleting scan template', error });
  }
};

export const getScanCategories = async (req: Request, res: Response) => {
  try {
    const categories = Object.values(ScanCategory);
    res.json(categories);
  } catch (error) {
    console.error('Error fetching scan categories:', error);
    res.status(500).json({ message: 'Error fetching scan categories', error });
  }
};

export const getScanBodyParts = async (req: Request, res: Response) => {
  try {
    const bodyParts = Object.values(BodyPart);
    res.json(bodyParts);
  } catch (error) {
    console.error('Error fetching scan body parts:', error);
    res.status(500).json({ message: 'Error fetching scan body parts', error });
  }
};

export const getScanTypes = async (req: Request, res: Response) => {
  try {
    const scanTypes = await prisma.scanTemplate.findMany({
      distinct: ['scanType'],
      select: {
        scanType: true
      },
      where: {
        scanType: {
          not: null
        }
      }
    });
    
    const scanTypeList = scanTypes.map(item => item.scanType).filter(Boolean);
    res.json(scanTypeList);
  } catch (error) {
    console.error('Error fetching scan types:', error);
    res.status(500).json({ message: 'Error fetching scan types', error });
  }
};

export const bulkUpdateScanTemplates = [
  body('updates').isArray().withMessage('Updates must be an array'),
  body('updates.*.id').notEmpty().withMessage('Scan template ID is required'),
  body('updates.*.cashPrice').optional().isFloat({ min: 0 }).withMessage('Cash price must be a non-negative number'),
  body('updates.*.nhisPrice').optional().isFloat({ min: 0 }).withMessage('NHIS price must be a non-negative number'),
  body('updates.*.insurancePrice').optional().isFloat({ min: 0 }).withMessage('Insurance price must be a non-negative number'),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { updates } = req.body;

      const results = await prisma.$transaction(
        updates.map((update: any) => 
          prisma.scanTemplate.update({
            where: { id: update.id },
            data: {
              ...(update.cashPrice !== undefined && { cashPrice: parseFloat(update.cashPrice) }),
              ...(update.nhisPrice !== undefined && { nhisPrice: parseFloat(update.nhisPrice) }),
              ...(update.insurancePrice !== undefined && { insurancePrice: parseFloat(update.insurancePrice) }),
              ...(update.isPending !== undefined && { isPending: update.isPending }),
              ...(update.isNHISCovered !== undefined && { isNHISCovered: update.isNHISCovered }),
              ...(update.isPrivateInsExempted !== undefined && { isPrivateInsExempted: update.isPrivateInsExempted }),
              ...(update.nhisRequiresAuth !== undefined && { nhisRequiresAuth: update.nhisRequiresAuth }),
              ...(update.privateInsRequiresAuth !== undefined && { privateInsRequiresAuth: update.privateInsRequiresAuth }),
              ...(update.tariffCode !== undefined && { tariffCode: update.tariffCode })
            }
          })
        )
      );

      res.json({
        message: 'Scan templates updated successfully',
        updatedCount: results.length,
        templates: results
      });
    } catch (error) {
      console.error('Error in bulk scan template update:', error);
      res.status(500).json({ message: 'Error updating scan templates', error });
    }
  }
];