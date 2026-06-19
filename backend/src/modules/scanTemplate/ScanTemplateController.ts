// ScanTemplateController.ts - HTTP request handlers for scan template module

import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { ScanTemplateService } from './ScanTemplateService';
import { ServiceCategory } from '@prisma/client';
import {
  CreateScanTemplateDTO,
  UpdateScanTemplateDTO,
  BulkUpdateDTO
} from './ScanTemplateTypes';

/**
 * Async handler wrapper to catch promise rejections
 */
const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: Function) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export class ScanTemplateController {
  private service: ScanTemplateService;

  constructor(service: ScanTemplateService) {
    this.service = service;
  }

  // GET ALL SCAN TEMPLATES
  getScanTemplates = asyncHandler(async (req: Request, res: Response) => {
    const { isActive, category, bodyPart, scanType, page, limit } = req.query;

    const params = {
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      category: category as string | undefined,
      bodyPart: bodyPart as string | undefined,
      scanType: scanType as string | undefined,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 10000
    };

    const result = await this.service.getAllScanTemplates(params);

    res.json(result);
  });

  // GET SCAN TEMPLATE BY ID
  getScanTemplateById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const template = await this.service.getScanTemplateById(id);

    res.json(template);
  });

  // CREATE SCAN TEMPLATE
  createScanTemplate = [
    body('name').notEmpty().withMessage('Scan name is required'),
    body('code').notEmpty().withMessage('Service code is required'),
    body('serviceCategory').isIn(Object.values(ServiceCategory)).withMessage('Invalid category'),
    body('cashPrice').isFloat({ min: 0 }).withMessage('Cash price must be a non-negative number'),
    body('nhisPrice').optional().isFloat({ min: 0 }).withMessage('NHIS price must be a non-negative number'),
    body('insurancePrice').isFloat({ min: 0 }).withMessage('Insurance price must be a non-negative number'),

    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const data: CreateScanTemplateDTO = req.body;
      const userId = (req as any).user?.id;

      const template = await this.service.createScanTemplate(data, userId);

      const templateWithPricing = await this.service.getScanTemplateById(template.id);

      res.status(201).json(templateWithPricing);
    })
  ];

  // UPDATE SCAN TEMPLATE
  updateScanTemplate = [
    body('name').optional().notEmpty().withMessage('Scan name cannot be empty'),
    body('code').optional().notEmpty().withMessage('Service code cannot be empty'),
    body('serviceCategory').optional().isIn(Object.values(ServiceCategory)).withMessage('Invalid category'),
    body('cashPrice').optional().isFloat({ min: 0 }).withMessage('Cash price must be a non-negative number'),
    body('nhisPrice').optional().isFloat({ min: 0 }).withMessage('NHIS price must be a non-negative number'),
    body('insurancePrice').optional().isFloat({ min: 0 }).withMessage('Insurance price must be a non-negative number'),

    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const data: UpdateScanTemplateDTO = req.body;

      const template = await this.service.updateScanTemplate(id, data);

      const templateWithPricing = await this.service.getScanTemplateById(template.id);

      res.json(templateWithPricing);
    })
  ];

  // DELETE SCAN TEMPLATE
  deleteScanTemplate = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    await this.service.deleteScanTemplate(id);

    res.json({ message: 'Scan template deleted successfully' });
  });

  // GET SCAN CATEGORIES
  getScanCategories = asyncHandler(async (req: Request, res: Response) => {
    const categories = await this.service.getScanCategories();
    res.json(categories);
  });

  // GET SCAN BODY PARTS
  getScanBodyParts = asyncHandler(async (req: Request, res: Response) => {
    const bodyParts = await this.service.getScanBodyParts();
    res.json(bodyParts);
  });

  // GET SCAN TYPES
  getScanTypes = asyncHandler(async (req: Request, res: Response) => {
    const scanTypes = await this.service.getScanTypes();
    res.json(scanTypes);
  });

  // BULK UPDATE SCAN TEMPLATES
  bulkUpdateScanTemplates = asyncHandler(async (req: Request, res: Response) => {
    const { ids, isActive } = req.body;

    const data: BulkUpdateDTO = { ids, isActive };

    const result = await this.service.bulkUpdateScanTemplates(data);

    res.json(result);
  });
}