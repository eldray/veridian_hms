// controllers/procedureController.ts - UPDATED WITH PAGINATION
import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient, ServiceType, ServiceCategory } from '@prisma/client';

const prisma = new PrismaClient();

export const getProcedureTemplates = async (req: Request, res: Response) => {
  try {
    const { category, department, isActive, page = 1, limit = 10000 } = req.query; // ✅ Changed from 50 to 10000
    const where: any = {
      serviceType: ServiceType.procedure
    };
    
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    
    if (category) {
      where.serviceCategory = category as ServiceCategory;
    }
    
    if (department) {
      where.metadata = {
        path: ['department'],
        equals: department
      };
    }

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(10000, Math.max(1, parseInt(limit as string))); // ✅ Changed max from 100 to 10000
    const skip = (pageNum - 1) * limitNum;

    const [templates, total] = await Promise.all([
      prisma.serviceCatalog.findMany({
        where,
        include: {
          pricing: true,
          procedures: {
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
    console.error('Error fetching procedure templates:', error);
    res.status(500).json({ message: 'Error fetching procedure templates', error });
  }
};

export const getProcedureTemplateById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const template = await prisma.serviceCatalog.findUnique({
      where: { 
        id,
        serviceType: ServiceType.procedure
      },
      include: {
        pricing: true,
        procedures: {
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
            createdAt: 'desc'
          },
          take: 10
        }
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
            serviceType: ServiceType.procedure,
            serviceCategory: req.body.serviceCategory as ServiceCategory,
            subType: req.body.category || null,
            nhisServiceCode: req.body.nhisServiceCode,
            tariffCode: req.body.tariffCode,
            isNHISCovered: req.body.isNHISCovered !== undefined ? req.body.isNHISCovered : true,
            metadata: {
              department: req.body.department,
              duration: req.body.duration || 30,
              requiresAssistant: req.body.requiresAssistant,
              anesthesiaType: req.body.anesthesiaType,
              anesthesiaNotes: req.body.anesthesiaNotes,
              intraOperativeNotes: req.body.intraOperativeNotes,
              postOperativeNotes: req.body.postOperativeNotes,
              bloodLoss: req.body.bloodLoss,
              complications: req.body.complications,
              outcome: req.body.outcome,
              cost: req.body.cost,
              procedureCategory: req.body.procedureCategory
            },
            isActive: req.body.isActive !== undefined ? req.body.isActive : true,
            unit: req.body.unit || 'Procedure',
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
      console.error('Error creating procedure template:', error);
      res.status(500).json({ message: 'Error creating procedure template', error });
    }
  }
];

export const updateProcedureTemplate = [
  body('name').optional().notEmpty().withMessage('Procedure name cannot be empty'),
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
          serviceType: ServiceType.procedure 
        },
        include: { pricing: true }
      });
      
      if (!existingTemplate) {
        return res.status(404).json({ message: 'Procedure template not found' });
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

        if (req.body.department || req.body.duration !== undefined) {
          const currentMetadata = existingTemplate.metadata as any || {};
          updateData.metadata = {
            ...currentMetadata,
            department: req.body.department !== undefined ? req.body.department : currentMetadata.department,
            duration: req.body.duration !== undefined ? req.body.duration : currentMetadata.duration,
            requiresAssistant: req.body.requiresAssistant !== undefined ? req.body.requiresAssistant : currentMetadata.requiresAssistant,
            anesthesiaType: req.body.anesthesiaType !== undefined ? req.body.anesthesiaType : currentMetadata.anesthesiaType,
            anesthesiaNotes: req.body.anesthesiaNotes !== undefined ? req.body.anesthesiaNotes : currentMetadata.anesthesiaNotes,
            intraOperativeNotes: req.body.intraOperativeNotes !== undefined ? req.body.intraOperativeNotes : currentMetadata.intraOperativeNotes,
            postOperativeNotes: req.body.postOperativeNotes !== undefined ? req.body.postOperativeNotes : currentMetadata.postOperativeNotes,
            bloodLoss: req.body.bloodLoss !== undefined ? req.body.bloodLoss : currentMetadata.bloodLoss,
            complications: req.body.complications !== undefined ? req.body.complications : currentMetadata.complications,
            outcome: req.body.outcome !== undefined ? req.body.outcome : currentMetadata.outcome,
            cost: req.body.cost !== undefined ? req.body.cost : currentMetadata.cost
          };
        }

        if (req.body.category !== undefined) {
          updateData.subType = req.body.category;
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
      console.error('Error updating procedure template:', error);
      res.status(500).json({ message: 'Error updating procedure template', error });
    }
  }
];

export const deleteProcedureTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const existingTemplate = await prisma.serviceCatalog.findFirst({
      where: { 
        id,
        serviceType: ServiceType.procedure 
      },
      include: {
        procedures: { take: 1 },
        pricing: true
      }
    });
    
    if (!existingTemplate) {
      return res.status(404).json({ message: 'Procedure template not found' });
    }

    if (existingTemplate.procedures.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete procedure template with associated procedures' 
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

    res.json({ message: 'Procedure template deleted successfully' });
  } catch (error) {
    console.error('Error deleting procedure template:', error);
    res.status(500).json({ message: 'Error deleting procedure template', error });
  }
};

export const getProcedureCategories = async (req: Request, res: Response) => {
  try {
    const categories = Object.values(ServiceCategory);
    res.json(categories);
  } catch (error) {
    console.error('Error fetching procedure categories:', error);
    res.status(500).json({ message: 'Error fetching procedure categories', error });
  }
};

export const getProcedureDepartments = async (req: Request, res: Response) => {
  try {
    const services = await prisma.serviceCatalog.findMany({
      where: { 
        serviceType: ServiceType.procedure,
        metadata: {
          path: ['department'],
          not: null
        }
      },
      select: { metadata: true }
    });
    
    const departments = services
      .map(service => (service.metadata as any)?.department)
      .filter(Boolean)
      .filter((value, index, self) => self.indexOf(value) === index);
    
    res.json(departments);
  } catch (error) {
    console.error('Error fetching procedure departments:', error);
    res.status(500).json({ message: 'Error fetching procedure departments', error });
  }
};

export const bulkUpdateProcedureTemplates = async (req: Request, res: Response) => {
  try {
    const { ids, isActive } = req.body;
    
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ message: 'ids array is required' });
    }

    const result = await prisma.serviceCatalog.updateMany({
      where: {
        id: { in: ids },
        serviceType: ServiceType.procedure
      },
      data: {
        isActive: isActive !== undefined ? isActive : true,
        updatedAt: new Date()
      }
    });

    res.json({ 
      message: `${result.count} procedure templates updated`,
      count: result.count
    });
  } catch (error) {
    console.error('Error bulk updating procedure templates:', error);
    res.status(500).json({ message: 'Error bulk updating procedure templates', error });
  }
};