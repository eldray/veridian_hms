// LabTestController.ts - HTTP request handlers for Lab Test module

import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { BaseController } from '../../shared/base/BaseController';
import { LabTestService } from './LabTestService';
import { CreateLabTestServiceDTO, UpdateLabTestServiceDTO, BulkUpdateLabTestDTO } from './LabTestTypes';
import { ServiceCategory } from '@prisma/client';
import { AuthRequest } from '../../middleware/authMiddleware';

export class LabTestController extends BaseController {
  private service: LabTestService;

  constructor(prisma: PrismaClient) {  // ✅ Add prisma parameter
    super();
    this.service = new LabTestService(prisma);  // ✅ Pass to service
  }

  // ============================================
  // GET ALL LAB TEST SERVICES
  // ============================================
  getLabTestServices = async (req: AuthRequest, res: Response) => {
    try {
      let { page = 1, limit = 50 } = req.query;
      
      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));

      const query = {
        serviceCategory: req.query.serviceCategory as any,
        subType: req.query.subType as string,
        isActive: req.query.isActive === 'true',
        isNHISCovered: req.query.isNHISCovered === 'true',
        page: pageNum,
        limit: limitNum
      };

      const result = await this.service.getAllLabTestServices(query);
      this.paginated(res, result.data, result.pagination, 'Lab test services retrieved successfully');
    } catch (error) {
      this.error(res, error);
    }
  };

  // ============================================
  // GET LAB TEST SERVICE BY ID
  // ============================================
  getLabTestServiceById = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const result = await this.service.getLabTestServiceById(id);
      this.ok(res, result.data, 'Lab test service retrieved successfully');
    } catch (error) {
      this.error(res, error);
    }
  };

  // ============================================
  // CREATE LAB TEST SERVICE
  // ============================================
  createLabTestService = [
    body('name').notEmpty().withMessage('Service name is required'),
    body('code').notEmpty().withMessage('Service code is required'),
    body('serviceCategory').isIn(Object.values(ServiceCategory)).withMessage('Invalid service category'),
    body('subType').notEmpty().withMessage('Lab sub-type is required (e.g., hematology, biochemistry)'),
    body('cashPrice').isFloat({ min: 0 }).withMessage('Cash price must be a non-negative number'),
    body('nhisPrice').optional().isFloat({ min: 0 }).withMessage('NHIS price must be a non-negative number'),
    body('insurancePrice').isFloat({ min: 0 }).withMessage('Insurance price must be a non-negative number'),

    async (req: AuthRequest, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return this.badRequest(res, 'Validation failed', errors.array());
        }

        const data: CreateLabTestServiceDTO = {
          name: req.body.name,
          code: req.body.code,
          description: req.body.description,
          serviceCategory: req.body.serviceCategory,
          subType: req.body.subType,
          cashPrice: parseFloat(req.body.cashPrice),
          nhisPrice: req.body.nhisPrice ? parseFloat(req.body.nhisPrice) : undefined,
          insurancePrice: parseFloat(req.body.insurancePrice),
          nhisServiceCode: req.body.nhisServiceCode,
          tariffCode: req.body.tariffCode,
          isNHISCovered: req.body.isNHISCovered,
          nhisCoverageType: req.body.nhisCoverageType,
          nhisRequiresAuth: req.body.nhisRequiresAuth,
          privateInsRequiresAuth: req.body.privateInsRequiresAuth,
          isPrivateInsuranceExempted: req.body.isPrivateInsuranceExempted,
          metadata: req.body.metadata,
          requiresClinicalNotes: req.body.requiresClinicalNotes,
          isActive: req.body.isActive,
          unit: req.body.unit,
          vatRate: req.body.vatRate,
          isTaxable: req.body.isTaxable
        };

        const createdById = req.user?.id;
        
        if (!createdById) {
          return this.unauthorized(res, 'User authentication required');
        }

        const result = await this.service.createLabTestService(data, createdById);
        this.created(res, result.data, 'Lab test service created successfully');
      } catch (error) {
        this.error(res, error);
      }
    }
  ];

  // ============================================
  // UPDATE LAB TEST SERVICE
  // ============================================
  updateLabTestService = [
    body('name').optional().notEmpty().withMessage('Service name cannot be empty'),
    body('code').optional().notEmpty().withMessage('Service code cannot be empty'),
    body('serviceCategory').optional().isIn(Object.values(ServiceCategory)).withMessage('Invalid service category'),
    body('cashPrice').optional().isFloat({ min: 0 }).withMessage('Cash price must be a non-negative number'),
    body('nhisPrice').optional().isFloat({ min: 0 }).withMessage('NHIS price must be a non-negative number'),
    body('insurancePrice').optional().isFloat({ min: 0 }).withMessage('Insurance price must be a non-negative number'),

    async (req: AuthRequest, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return this.badRequest(res, 'Validation failed', errors.array());
        }

        const { id } = req.params;
        const data: UpdateLabTestServiceDTO = {
          id,
          ...req.body
        };

        if (req.body.cashPrice !== undefined) {
          data.cashPrice = parseFloat(req.body.cashPrice);
        }
        if (req.body.nhisPrice !== undefined) {
          data.nhisPrice = parseFloat(req.body.nhisPrice);
        }
        if (req.body.insurancePrice !== undefined) {
          data.insurancePrice = parseFloat(req.body.insurancePrice);
        }

        const result = await this.service.updateLabTestService(id, data);
        this.ok(res, result.data, 'Lab test service updated successfully');
      } catch (error) {
        this.error(res, error);
      }
    }
  ];

  // ============================================
  // DELETE LAB TEST SERVICE
  // ============================================
  deleteLabTestService = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const result = await this.service.deleteLabTestService(id);
      this.ok(res, result, 'Lab test service deleted successfully');
    } catch (error) {
      this.error(res, error);
    }
  };

// ============================================
// GET LAB TEST CATEGORIES
// ============================================
getLabTestCategories = async (req: AuthRequest, res: Response) => {
  try {
    // Lab test categories (from Prisma enum or static list)
    const categories = [
      'hematology',
      'biochemistry',
      'microbiology',
      'serology',
      'immunology',
      'molecular',
      'pathology',
      'cytology',
      'histopathology',
      'urinalysis',
      'pulmonology',
      'neurology',
      'cardiology',
      'gastroenterology',
      'endocrinology',
      'toxicology'
    ];
    
    this.ok(res, categories, 'Lab test categories retrieved successfully');
  } catch (error) {
    this.error(res, error);
  }
};

  // ============================================
  // GET LAB TEST SUB-CATEGORIES
  // ============================================
  getLabTestSubCategories = async (req: AuthRequest, res: Response) => {
    try {
      const result = await this.service.getLabTestSubCategories();
      this.ok(res, result.data, 'Lab test sub-categories retrieved successfully');
    } catch (error) {
      this.error(res, error);
    }
  };

  // LabTestController.ts - Add this method

// ============================================
// GET SPECIMEN TYPES
// ============================================
getSpecimenTypes = async (req: AuthRequest, res: Response) => {
  try {
    const specimenTypes = [
      'Blood',
      'Urine',
      'Stool',
      'Sputum',
      'CSF',
      'Tissue',
      'Swab',
      'Fluid',
      'Hair',
      'Nail',
      'Other'
    ];
    
    this.ok(res, specimenTypes, 'Specimen types retrieved successfully');
  } catch (error) {
    this.error(res, error);
  }
};

  // ============================================
  // GET LAB TEST METADATA FIELDS
  // ============================================
  getLabTestMetadataFields = async (req: AuthRequest, res: Response) => {
    try {
      const result = await this.service.getLabTestMetadataFields();
      this.ok(res, result.data, 'Lab test metadata fields retrieved successfully');
    } catch (error) {
      this.error(res, error);
    }
  };

  // ============================================
  // BULK UPDATE LAB TEST SERVICES
  // ============================================
  bulkUpdateLabTestServices = [
    body('ids').isArray().withMessage('Service IDs array is required'),
    body('isActive').isBoolean().withMessage('isActive must be a boolean'),

    async (req: AuthRequest, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return this.badRequest(res, 'Validation failed', errors.array());
        }

        const data: BulkUpdateLabTestDTO = {
          ids: req.body.ids,
          isActive: req.body.isActive
        };

        const result = await this.service.bulkUpdateLabTestServices(data);
        this.ok(res, result.data, result.message);
      } catch (error) {
        this.error(res, error);
      }
    }
  ];
}