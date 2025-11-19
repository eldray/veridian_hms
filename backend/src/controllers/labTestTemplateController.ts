import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient, LabCategory, SpecimenType } from '@prisma/client';

const prisma = new PrismaClient();

export const getLabTestTemplates = async (req: Request, res: Response) => {
  try {
    const { isPending, category, subCategory, specimenType, isActive } = req.query;
    const where: any = {};
    
    if (isPending !== undefined) {
      where.isPending = isPending === 'true';
    }
    
    if (category) {
      where.category = category as LabCategory;
    }
    
    if (subCategory) {
      where.subCategory = subCategory as string;
    }
    
    if (specimenType) {
      where.specimenType = specimenType as SpecimenType;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const templates = await prisma.labTestTemplate.findMany({
      where,
      orderBy: {
        name: 'asc'
      },
      include: {
        labTests: {
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
    console.error('Error fetching lab test templates:', error);
    res.status(500).json({ message: 'Error fetching lab test templates', error });
  }
};

export const getLabTestTemplateById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const template = await prisma.labTestTemplate.findUnique({
      where: { id },
      include: {
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
      return res.status(404).json({ message: 'Lab test template not found' });
    }
    
    res.json(template);
  } catch (error) {
    console.error('Error fetching lab test template:', error);
    res.status(500).json({ message: 'Error fetching lab test template', error });
  }
};

export const createLabTestTemplate = [
  body('name').notEmpty().withMessage('Test name is required'),
  body('investigationCode').notEmpty().withMessage('Investigation code is required'),
  body('category').isIn(Object.values(LabCategory)).withMessage('Invalid category'),
  body('specimenType').isIn(Object.values(SpecimenType)).withMessage('Invalid specimen type'),
  body('cashPrice').isFloat({ min: 0 }).withMessage('Cash price must be a non-negative number'),
  body('nhisPrice').optional().isFloat({ min: 0 }).withMessage('NHIS price must be a non-negative number'),
  body('insurancePrice').isFloat({ min: 0 }).withMessage('Insurance price must be a non-negative number'),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Check if investigation code already exists
      const existingTemplate = await prisma.labTestTemplate.findUnique({
        where: { investigationCode: req.body.investigationCode }
      });

      if (existingTemplate) {
        return res.status(400).json({ message: 'Investigation code already exists' });
      }

      const templateData = {
        name: req.body.name,
        investigationCode: req.body.investigationCode,
        category: req.body.category as LabCategory,
        subCategory: req.body.subCategory || null,
        description: req.body.description || null,
        specimenType: req.body.specimenType as SpecimenType,
        resultTemplate: req.body.resultTemplate ? req.body.resultTemplate : null,
        cashPrice: parseFloat(req.body.cashPrice),
        nhisPrice: parseFloat(req.body.nhisPrice) || 0,
        insurancePrice: parseFloat(req.body.insurancePrice),
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

      const template = await prisma.labTestTemplate.create({
        data: templateData
      });
      
      res.status(201).json(template);
    } catch (error) {
      console.error('Error creating lab test template:', error);
      res.status(500).json({ message: 'Error creating lab test template', error });
    }
  }
];

export const updateLabTestTemplate = [
  body('name').optional().notEmpty().withMessage('Test name cannot be empty'),
  body('investigationCode').optional().notEmpty().withMessage('Investigation code cannot be empty'),
  body('category').optional().isIn(Object.values(LabCategory)).withMessage('Invalid category'),
  body('specimenType').optional().isIn(Object.values(SpecimenType)).withMessage('Invalid specimen type'),
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
      const existingTemplate = await prisma.labTestTemplate.findUnique({
        where: { id }
      });
      
      if (!existingTemplate) {
        return res.status(404).json({ message: 'Lab test template not found' });
      }

      // Check if investigation code is being changed and if it already exists
      if (req.body.investigationCode && req.body.investigationCode !== existingTemplate.investigationCode) {
        const templateWithCode = await prisma.labTestTemplate.findUnique({
          where: { investigationCode: req.body.investigationCode }
        });

        if (templateWithCode) {
          return res.status(400).json({ message: 'Investigation code already exists' });
        }
      }

      // Prepare update data
      const updateData: any = { ...req.body };
      
      // Convert numeric fields if they exist
      if (req.body.cashPrice !== undefined) updateData.cashPrice = parseFloat(req.body.cashPrice);
      if (req.body.nhisPrice !== undefined) updateData.nhisPrice = parseFloat(req.body.nhisPrice);
      if (req.body.insurancePrice !== undefined) updateData.insurancePrice = parseFloat(req.body.insurancePrice);
      if (req.body.vatRate !== undefined) updateData.vatRate = parseFloat(req.body.vatRate);

      const template = await prisma.labTestTemplate.update({
        where: { id },
        data: updateData
      });
      
      res.json(template);
    } catch (error) {
      console.error('Error updating lab test template:', error);
      res.status(500).json({ message: 'Error updating lab test template', error });
    }
  }
];

export const deleteLabTestTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if template exists and has dependencies
    const existingTemplate = await prisma.labTestTemplate.findUnique({
      where: { id },
      include: {
        labTests: { take: 1 },
        serviceCatalogs: { take: 1 }
      }
    });
    
    if (!existingTemplate) {
      return res.status(404).json({ message: 'Lab test template not found' });
    }

    // Check for dependencies
    if (existingTemplate.labTests.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete lab test template with associated lab tests' 
      });
    }

    if (existingTemplate.serviceCatalogs.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete lab test template with associated service catalogs' 
      });
    }

    await prisma.labTestTemplate.delete({
      where: { id }
    });

    res.json({ message: 'Lab test template deleted successfully' });
  } catch (error) {
    console.error('Error deleting lab test template:', error);
    res.status(500).json({ message: 'Error deleting lab test template', error });
  }
};

export const getLabTestCategories = async (req: Request, res: Response) => {
  try {
    const categories = Object.values(LabCategory);
    res.json(categories);
  } catch (error) {
    console.error('Error fetching lab test categories:', error);
    res.status(500).json({ message: 'Error fetching lab test categories', error });
  }
};

export const getLabTestSubCategories = async (req: Request, res: Response) => {
  try {
    const subCategories = await prisma.labTestTemplate.findMany({
      distinct: ['subCategory'],
      select: {
        subCategory: true
      },
      where: {
        subCategory: {
          not: null
        }
      },
      orderBy: {
        subCategory: 'asc'
      }
    });
    
    const subCategoryList = subCategories.map(item => item.subCategory).filter(Boolean);
    res.json(subCategoryList);
  } catch (error) {
    console.error('Error fetching lab test sub-categories:', error);
    res.status(500).json({ message: 'Error fetching lab test sub-categories', error });
  }
};

export const getSpecimenTypes = async (req: Request, res: Response) => {
  try {
    const specimenTypes = Object.values(SpecimenType);
    res.json(specimenTypes);
  } catch (error) {
    console.error('Error fetching specimen types:', error);
    res.status(500).json({ message: 'Error fetching specimen types', error });
  }
};

export const bulkUpdateLabTestTemplates = [
  body('updates').isArray().withMessage('Updates must be an array'),
  body('updates.*.id').notEmpty().withMessage('Lab test template ID is required'),
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
          prisma.labTestTemplate.update({
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
        message: 'Lab test templates updated successfully',
        updatedCount: results.length,
        templates: results
      });
    } catch (error) {
      console.error('Error in bulk lab test template update:', error);
      res.status(500).json({ message: 'Error updating lab test templates', error });
    }
  }
];