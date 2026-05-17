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

export class ScanTemplateController {
  private service: ScanTemplateService;

  constructor(service: ScanTemplateService) {
    this.service = service;
  }

  // GET ALL SCAN TEMPLATES
  getScanTemplates = async (req: Request, res: Response) => {
    try {
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
    } catch (error) {
      console.error('Error fetching scan templates:', error);
      res.status(500).json({
        message: 'Error fetching scan templates',
        error: (error as Error).message
      });
    }
  };

  // GET SCAN TEMPLATE BY ID
  getScanTemplateById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const template = await this.service.getScanTemplateById(id);

      res.json(template);
    } catch (error) {
      console.error('Error fetching scan template:', error);
      res.status(404).json({
        message: (error as Error).message || 'Scan template not found',
        error: (error as Error).message
      });
    }
  };

  // CREATE SCAN TEMPLATE
  createScanTemplate = [
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

        const data: CreateScanTemplateDTO = req.body;
        const userId = (req as any).user?.id;

        const template = await this.service.createScanTemplate(data, userId);

        const templateWithPricing = await this.service.getScanTemplateById(template.id);

        res.status(201).json(templateWithPricing);
      } catch (error) {
        console.error('Error creating scan template:', error);
        res.status(500).json({
          message: 'Error creating scan template',
          error: (error as Error).message
        });
      }
    }
  ];

  // UPDATE SCAN TEMPLATE
  updateScanTemplate = [
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
        const data: UpdateScanTemplateDTO = req.body;

        const template = await this.service.updateScanTemplate(id, data);

        const templateWithPricing = await this.service.getScanTemplateById(template.id);

        res.json(templateWithPricing);
      } catch (error) {
        console.error('Error updating scan template:', error);
        res.status(500).json({
          message: 'Error updating scan template',
          error: (error as Error).message
        });
      }
    }
  ];

  // DELETE SCAN TEMPLATE
  deleteScanTemplate = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      await this.service.deleteScanTemplate(id);

      res.json({ message: 'Scan template deleted successfully' });
    } catch (error) {
      console.error('Error deleting scan template:', error);
      res.status(500).json({
        message: 'Error deleting scan template',
        error: (error as Error).message
      });
    }
  };

  // GET SCAN CATEGORIES
  getScanCategories = async (req: Request, res: Response) => {
    try {
      const categories = await this.service.getScanCategories();
      res.json(categories);
    } catch (error) {
      console.error('Error fetching scan categories:', error);
      res.status(500).json({
        message: 'Error fetching scan categories',
        error: (error as Error).message
      });
    }
  };

  // GET SCAN BODY PARTS
  getScanBodyParts = async (req: Request, res: Response) => {
    try {
      const bodyParts = await this.service.getScanBodyParts();
      res.json(bodyParts);
    } catch (error) {
      console.error('Error fetching scan body parts:', error);
      res.status(500).json({
        message: 'Error fetching scan body parts',
        error: (error as Error).message
      });
    }
  };

  // GET SCAN TYPES
  getScanTypes = async (req: Request, res: Response) => {
    try {
      const scanTypes = await this.service.getScanTypes();
      res.json(scanTypes);
    } catch (error) {
      console.error('Error fetching scan types:', error);
      res.status(500).json({
        message: 'Error fetching scan types',
        error: (error as Error).message
      });
    }
  };

  // BULK UPDATE SCAN TEMPLATES
  bulkUpdateScanTemplates = async (req: Request, res: Response) => {
    try {
      const { ids, isActive } = req.body;

      const data: BulkUpdateDTO = { ids, isActive };

      const result = await this.service.bulkUpdateScanTemplates(data);

      res.json(result);
    } catch (error) {
      console.error('Error bulk updating scan templates:', error);
      res.status(500).json({
        message: 'Error bulk updating scan templates',
        error: (error as Error).message
      });
    }
  };
}
