import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient, ServiceCategory } from '@prisma/client';
import { BaseController } from '../../shared/base/BaseController';
import { LabTestService } from './LabTestService';

// Local AuthRequest definition to prevent import errors if global types aren't set
interface AuthRequest extends Request {
  user?: any;
}

export class LabTestController extends BaseController {
  private service: LabTestService;

  constructor(prisma: PrismaClient) {
    super();
    this.service = new LabTestService(prisma);
  }

  getLabTests = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    // ✅ Use BaseController's safe pagination parser (caps limit at 100 to prevent memory crashes)
    const { page, limit } = this.getPaginationParams(req);
    
    const params = {
      isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
      category: req.query.category as string | undefined,
      subType: req.query.subType as string | undefined,
      search: req.query.search as string | undefined,
      page,
      limit
    };
    
    const result = await this.service.getAllLabTests(params);
    
    // ✅ Use BaseController's paginated response formatter
    return this.paginated(
      res, 
      result.data, 
      result.pagination, 
      'Lab tests retrieved successfully'
    );
  });

  getLabTestById = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const template = await this.service.getLabTestById(req.params.id);
      return this.ok(res, template, 'Lab test retrieved successfully');
    } catch (e: any) {
      // ✅ Use BaseController's error mapper (handles P2025 Not Found automatically)
      return this.error(res, e);
    }
  });

  createLabTest = [
    body('name').notEmpty(), 
    body('code').notEmpty(), 
    body('serviceCategory').isIn(Object.values(ServiceCategory)),
    body('cashPrice').isNumeric({ min: 0 }), 
    body('insurancePrice').isNumeric({ min: 0 }),
    body('corporatePrice').optional().isNumeric({ min: 0 }), // ✅ Added corporatePrice
    this.asyncHandler(async (req: AuthRequest, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return this.badRequest(res, 'Validation failed', errors.array() as any[]);
      
      try {
        const template = await this.service.createLabTest(req.body, req.user?.id);
        return this.created(res, template, 'Lab test created successfully');
      } catch (e: any) {
        // ✅ BaseController.error() automatically catches Prisma P2002 (Duplicate Code) 
        // and formats it as a 400 Bad Request.
        return this.error(res, e);
      }
    })
  ];

  updateLabTest = [
    body('cashPrice').optional().isNumeric({ min: 0 }), 
    body('insurancePrice').optional().isNumeric({ min: 0 }),
    body('corporatePrice').optional().isNumeric({ min: 0 }),
    this.asyncHandler(async (req: AuthRequest, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return this.badRequest(res, 'Validation failed', errors.array() as any[]);
      
      try {
        const template = await this.service.updateLabTest(req.params.id, req.body);
        return this.ok(res, template, 'Lab test updated successfully');
      } catch (e: any) {
        return this.error(res, e);
      }
    })
  ];

  deleteLabTest = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      await this.service.deleteLabTest(req.params.id);
      return this.ok(res, null, 'Lab test deleted successfully');
    } catch (e: any) {
      return this.error(res, e);
    }
  });

  getLabTestCategories = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const categories = await this.service.getLabTestCategories();
    return this.ok(res, categories, 'Categories retrieved');
  });

  getLabTestSubCategories = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const subCategories = await this.service.getLabTestSubCategories();
    return this.ok(res, subCategories, 'Sub-categories retrieved');
  });

  getSpecimenTypes = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const types = await this.service.getSpecimenTypes();
    return this.ok(res, types, 'Specimen types retrieved');
  });

  getLabTestMetadataFields = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.getLabTestMetadataFields();
    return this.ok(res, result, 'Metadata fields retrieved');
  });

  bulkUpdateLabTests = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const result = await this.service.bulkUpdateLabTests(req.body);
      return this.ok(res, result, result.message);
    } catch (e: any) {
      return this.error(res, e);
    }
  });
}