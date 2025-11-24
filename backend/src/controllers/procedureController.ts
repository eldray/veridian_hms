// controllers/procedureController.ts - UPDATED FOR SERVICE CATALOG (CORE FUNCTIONS ONLY)
import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient, ServiceType, ServiceCategory } from '@prisma/client';

const prisma = new PrismaClient();

export const getProcedureTemplates = async (req: Request, res: Response) => {
  try {
    const { category, department, isActive } = req.query;
    const where: any = {
      serviceType: ServiceType.procedure // ✅ Only procedure services
    };
    
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    
    if (category) {
      where.serviceCategory = category as ServiceCategory;
    }
    
    // ✅ Department is now in metadata
    if (department) {
      where.metadata = {
        path: ['department'],
        equals: department
      };
    }

    const templates = await prisma.serviceCatalog.findMany({
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
    
    const template = await prisma.serviceCatalog.findUnique({
      where: { 
        id,
        serviceType: ServiceType.procedure // ✅ Ensure it's a procedure service
      },
      include: {
        pricing: true,
        procedures: { // ✅ CORRECT: Capital P (singular) - matches schema
          include: {
            Attendance: { // ✅ CORRECT: Capital A
              select: {
                attendanceNumber: true,
                Patient: { // ✅ CORRECT: Capital P
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

      // Check if service code already exists
      const existingTemplate = await prisma.serviceCatalog.findUnique({
        where: { code: req.body.code }
      });

      if (existingTemplate) {
        return res.status(400).json({ message: 'Service code already exists' });
      }

      const result = await prisma.$transaction(async (tx) => {
        // Create the procedure service
        const template = await tx.serviceCatalog.create({
          data: {
            name: req.body.name,
            code: req.body.code,
            description: req.body.description,
            serviceType: ServiceType.procedure, // ✅ Fixed service type
            serviceCategory: req.body.serviceCategory as ServiceCategory,
            subType: req.body.category || null, // ✅ Use category as subType
            
            // NHIS Compliance
            nhisServiceCode: req.body.nhisServiceCode,
            tariffCode: req.body.tariffCode,
            isNHISCovered: req.body.isNHISCovered !== undefined ? req.body.isNHISCovered : true,
            
            // Procedure Metadata
// Procedure Metadata - include ALL fields from your Procedure model
          metadata: {
            department: req.body.department,
            duration: req.body.duration || 30,
            requiresAssistant: req.body.requiresAssistant,
            anesthesiaType: req.body.anesthesiaType,
            // ✅ ADDED: New procedure-specific fields from your schema
            anesthesiaNotes: req.body.anesthesiaNotes,
            intraOperativeNotes: req.body.intraOperativeNotes,
            postOperativeNotes: req.body.postOperativeNotes,
            bloodLoss: req.body.bloodLoss,
            complications: req.body.complications,
            outcome: req.body.outcome,
            cost: req.body.cost,
            procedureCategory: req.body.procedureCategory
          },
            
            // Default values
            isActive: req.body.isActive !== undefined ? req.body.isActive : true,
            unit: req.body.unit || 'Procedure',
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
      
      // Check if template exists
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
// Handle metadata updates - include ALL procedure fields
        if (req.body.department || req.body.duration !== undefined) {
          const currentMetadata = existingTemplate.metadata as any || {};
          updateData.metadata = {
            ...currentMetadata,
            department: req.body.department !== undefined ? req.body.department : currentMetadata.department,
            duration: req.body.duration !== undefined ? req.body.duration : currentMetadata.duration,
            requiresAssistant: req.body.requiresAssistant !== undefined ? req.body.requiresAssistant : currentMetadata.requiresAssistant,
            anesthesiaType: req.body.anesthesiaType !== undefined ? req.body.anesthesiaType : currentMetadata.anesthesiaType,
            // ✅ ADDED: New procedure fields
            anesthesiaNotes: req.body.anesthesiaNotes !== undefined ? req.body.anesthesiaNotes : currentMetadata.anesthesiaNotes,
            intraOperativeNotes: req.body.intraOperativeNotes !== undefined ? req.body.intraOperativeNotes : currentMetadata.intraOperativeNotes,
            postOperativeNotes: req.body.postOperativeNotes !== undefined ? req.body.postOperativeNotes : currentMetadata.postOperativeNotes,
            bloodLoss: req.body.bloodLoss !== undefined ? req.body.bloodLoss : currentMetadata.bloodLoss,
            complications: req.body.complications !== undefined ? req.body.complications : currentMetadata.complications,
            outcome: req.body.outcome !== undefined ? req.body.outcome : currentMetadata.outcome,
            cost: req.body.cost !== undefined ? req.body.cost : currentMetadata.cost
          };
        }

        // Update category as subType
        if (req.body.category !== undefined) {
          updateData.subType = req.body.category;
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
      console.error('Error updating procedure template:', error);
      res.status(500).json({ message: 'Error updating procedure template', error });
    }
  }
];

export const deleteProcedureTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if template exists and has dependencies
// Check if template exists and has dependencies
    const existingTemplate = await prisma.serviceCatalog.findFirst({
      where: { 
        id,
        serviceType: ServiceType.procedure 
      },
      include: {
        Procedure: { take: 1 }, // ✅ CORRECT: Capital P (singular)
        pricing: true
      }
    });
    
    if (!existingTemplate) {
      return res.status(404).json({ message: 'Procedure template not found' });
    }

    // Check for dependencies
    if (existingTemplate.Procedure.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete procedure template with associated procedures' 
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
    //Departments are stored in metadata.department for procedure services
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

export const getProcedureAnesthesiaTypes = async (req: Request, res: Response) => {
  try {
    const anesthesiaTypes = [
      'Local',
      'Regional',
      'General',
      'Sedation',
      'Spinal',
      'Epidural',
      'None'
    ];
    
    res.json(anesthesiaTypes);
  } catch (error) {
    console.error('Error fetching anesthesia types:', error);
    res.status(500).json({ message: 'Error fetching anesthesia types', error });
  }
};

export const getProcedureComplicationTypes = async (req: Request, res: Response) => {
  try {
    const complicationTypes = [
      'Bleeding',
      'Infection',
      'Anesthesia complication',
      'Organ injury',
      'Nerve damage',
      'Blood clot',
      'Allergic reaction',
      'Wound dehiscence',
      'Other'
    ];
    
    res.json(complicationTypes);
  } catch (error) {
    console.error('Error fetching complication types:', error);
    res.status(500).json({ message: 'Error fetching complication types', error });
  }
};