import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient, ProcedureCategory } from '@prisma/client';

const prisma = new PrismaClient();

export const getProcedureTemplates = async (req: Request, res: Response) => {
  try {
    const { isPending, category, department, isActive } = req.query;
    const where: any = {};
    
    if (isPending !== undefined) {
      where.isPending = isPending === 'true';
    }
    
    if (category) {
      where.category = category as ProcedureCategory;
    }
    
    if (department) {
      where.department = department as string;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const templates = await prisma.procedureTemplate.findMany({
      where,
      orderBy: {
        name: 'asc'
      },
      include: {
        procedures: {
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
    console.error('Error fetching procedure templates:', error);
    res.status(500).json({ message: 'Error fetching procedure templates', error });
  }
};

export const getProcedureTemplateById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const template = await prisma.procedureTemplate.findUnique({
      where: { id },
      include: {
        procedures: {
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
            createdAt: 'desc'
          },
          take: 10
        },
        serviceCatalogs: true
      }
    });
    
    if (!template) {
      return res.status(404).json({ message: 'Procedure template not found' });
    }
    
    res.json(template);
  } catch (error) {
    console.error('Error fetching procedure template:', error);
    res.status(500).json({ message: 'Error fetching procedure template', error });
  }
};

export const createProcedureTemplate = [
  body('name').notEmpty().withMessage('Procedure name is required'),
  body('procedureCode').notEmpty().withMessage('Procedure code is required'),
  body('category').isIn(Object.values(ProcedureCategory)).withMessage('Invalid category'),
  body('department').notEmpty().withMessage('Department is required'),
  body('cashPrice').isFloat({ min: 0 }).withMessage('Cash price must be a non-negative number'),
  body('nhisPrice').optional().isFloat({ min: 0 }).withMessage('NHIS price must be a non-negative number'),
  body('insurancePrice').isFloat({ min: 0 }).withMessage('Insurance price must be a non-negative number'),
  body('duration').optional().isInt({ min: 1 }).withMessage('Duration must be a positive number'),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Check if procedure code already exists
      const existingTemplate = await prisma.procedureTemplate.findUnique({
        where: { procedureCode: req.body.procedureCode }
      });

      if (existingTemplate) {
        return res.status(400).json({ message: 'Procedure code already exists' });
      }

      const templateData = {
        name: req.body.name,
        procedureCode: req.body.procedureCode,
        description: req.body.description || null,
        category: req.body.category as ProcedureCategory,
        department: req.body.department,
        cashPrice: parseFloat(req.body.cashPrice),
        nhisPrice: parseFloat(req.body.nhisPrice) || 0,
        insurancePrice: parseFloat(req.body.insurancePrice),
        duration: req.body.duration ? parseInt(req.body.duration) : 30,
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

      const template = await prisma.procedureTemplate.create({
        data: templateData
      });
      
      res.status(201).json(template);
    } catch (error) {
      console.error('Error creating procedure template:', error);
      res.status(500).json({ message: 'Error creating procedure template', error });
    }
  }
];

export const updateProcedureTemplate = [
  body('name').optional().notEmpty().withMessage('Procedure name cannot be empty'),
  body('procedureCode').optional().notEmpty().withMessage('Procedure code cannot be empty'),
  body('category').optional().isIn(Object.values(ProcedureCategory)).withMessage('Invalid category'),
  body('department').optional().notEmpty().withMessage('Department cannot be empty'),
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
      const existingTemplate = await prisma.procedureTemplate.findUnique({
        where: { id }
      });
      
      if (!existingTemplate) {
        return res.status(404).json({ message: 'Procedure template not found' });
      }

      // Check if procedure code is being changed and if it already exists
      if (req.body.procedureCode && req.body.procedureCode !== existingTemplate.procedureCode) {
        const templateWithCode = await prisma.procedureTemplate.findUnique({
          where: { procedureCode: req.body.procedureCode }
        });

        if (templateWithCode) {
          return res.status(400).json({ message: 'Procedure code already exists' });
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

      const template = await prisma.procedureTemplate.update({
        where: { id },
        data: updateData
      });
      
      res.json(template);
    } catch (error) {
      console.error('Error updating procedure template:', error);
      res.status(500).json({ message: 'Error updating procedure template', error });
    }
  }
];

export const deleteProcedureTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if template exists and has dependencies
    const existingTemplate = await prisma.procedureTemplate.findUnique({
      where: { id },
      include: {
        procedures: { take: 1 },
        serviceCatalogs: { take: 1 }
      }
    });
    
    if (!existingTemplate) {
      return res.status(404).json({ message: 'Procedure template not found' });
    }

    // Check for dependencies
    if (existingTemplate.procedures.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete procedure template with associated procedures' 
      });
    }

    if (existingTemplate.serviceCatalogs.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete procedure template with associated service catalogs' 
      });
    }

    await prisma.procedureTemplate.delete({
      where: { id }
    });

    res.json({ message: 'Procedure template deleted successfully' });
  } catch (error) {
    console.error('Error deleting procedure template:', error);
    res.status(500).json({ message: 'Error deleting procedure template', error });
  }
};

export const getProcedureCategories = async (req: Request, res: Response) => {
  try {
    const categories = Object.values(ProcedureCategory);
    res.json(categories);
  } catch (error) {
    console.error('Error fetching procedure categories:', error);
    res.status(500).json({ message: 'Error fetching procedure categories', error });
  }
};

export const getProcedureDepartments = async (req: Request, res: Response) => {
  try {
    const departments = await prisma.procedureTemplate.findMany({
      distinct: ['department'],
      select: {
        department: true
      },
      where: {
        department: {
          not: null
        }
      },
      orderBy: {
        department: 'asc'
      }
    });
    
    const departmentList = departments.map(item => item.department).filter(Boolean);
    res.json(departmentList);
  } catch (error) {
    console.error('Error fetching procedure departments:', error);
    res.status(500).json({ message: 'Error fetching procedure departments', error });
  }
};

export const bulkUpdateProcedureTemplates = [
  body('updates').isArray().withMessage('Updates must be an array'),
  body('updates.*.id').notEmpty().withMessage('Procedure template ID is required'),
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
          prisma.procedureTemplate.update({
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
        message: 'Procedure templates updated successfully',
        updatedCount: results.length,
        templates: results
      });
    } catch (error) {
      console.error('Error in bulk procedure template update:', error);
      res.status(500).json({ message: 'Error updating procedure templates', error });
    }
  }
];