// modules/labTest/LabTestController.ts
import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { LabTestService } from './LabTestService';
import { ServiceCategory } from '@prisma/client';
import { CreateLabTestDTO, UpdateLabTestDTO, BulkUpdateDTO } from './LabTestTypes';

export class LabTestController {
  private service: LabTestService;

  constructor(service: LabTestService) {
    this.service = service;
  }

  // GET ALL LAB TESTS
  getLabTests = async (req: Request, res: Response) => {
    try {
      const { isActive, category, subType, page, limit } = req.query;

      const params = {
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
        category: category as string | undefined,
        subType: subType as string | undefined,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 10000
      };

      const result = await this.service.getAllLabTests(params);
      res.json(result);
    } catch (error) {
      console.error('Error fetching lab tests:', error);
      res.status(500).json({
        message: 'Error fetching lab tests',
        error: (error as Error).message
      });
    }
  };

  // GET LAB TEST BY ID
  getLabTestById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const template = await this.service.getLabTestById(id);
      res.json(template);
    } catch (error) {
      console.error('Error fetching lab test:', error);
      res.status(404).json({
        message: (error as Error).message || 'Lab test not found',
        error: (error as Error).message
      });
    }
  };

  // CREATE LAB TEST
  createLabTest = [
    body('name').notEmpty().withMessage('Lab test name is required'),
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

        const data: CreateLabTestDTO = req.body;
        const userId = (req as any).user?.id;

        const template = await this.service.createLabTest(data, userId);
        const templateWithPricing = await this.service.getLabTestById(template.id);

        res.status(201).json(templateWithPricing);
      } catch (error) {
        console.error('Error creating lab test:', error);
        res.status(500).json({
          message: 'Error creating lab test',
          error: (error as Error).message
        });
      }
    }
  ];

  // UPDATE LAB TEST
  updateLabTest = [
    body('name').optional().notEmpty().withMessage('Lab test name cannot be empty'),
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
        const data: UpdateLabTestDTO = req.body;

        const template = await this.service.updateLabTest(id, data);
        const templateWithPricing = await this.service.getLabTestById(template.id);

        res.json(templateWithPricing);
      } catch (error) {
        console.error('Error updating lab test:', error);
        res.status(500).json({
          message: 'Error updating lab test',
          error: (error as Error).message
        });
      }
    }
  ];

  // DELETE LAB TEST
  deleteLabTest = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await this.service.deleteLabTest(id);
      res.json({ message: 'Lab test deleted successfully' });
    } catch (error) {
      console.error('Error deleting lab test:', error);
      res.status(500).json({
        message: 'Error deleting lab test',
        error: (error as Error).message
      });
    }
  };

  // GET LAB TEST CATEGORIES
  getLabTestCategories = async (req: Request, res: Response) => {
    try {
      const categories = await this.service.getLabTestCategories();
      res.json(categories);
    } catch (error) {
      console.error('Error fetching lab test categories:', error);
      res.status(500).json({
        message: 'Error fetching lab test categories',
        error: (error as Error).message
      });
    }
  };

  // GET SPECIMEN TYPES
  getSpecimenTypes = async (req: Request, res: Response) => {
    try {
      const specimenTypes = await this.service.getSpecimenTypes();
      res.json(specimenTypes);
    } catch (error) {
      console.error('Error fetching specimen types:', error);
      res.status(500).json({
        message: 'Error fetching specimen types',
        error: (error as Error).message
      });
    }
  };

  // GET LAB TEST METADATA FIELDS
  getLabTestMetadataFields = async (req: Request, res: Response) => {
    try {
      const result = await this.service.getLabTestMetadataFields();
      res.json(result);
    } catch (error) {
      console.error('Error fetching lab test metadata fields:', error);
      res.status(500).json({
        message: 'Error fetching lab test metadata fields',
        error: (error as Error).message
      });
    }
  };

  // BULK UPDATE LAB TESTS
  bulkUpdateLabTests = async (req: Request, res: Response) => {
    try {
      const { ids, isActive } = req.body;
      const data: BulkUpdateDTO = { ids, isActive };
      const result = await this.service.bulkUpdateLabTests(data);
      res.json(result);
    } catch (error) {
      console.error('Error bulk updating lab tests:', error);
      res.status(500).json({
        message: 'Error bulk updating lab tests',
        error: (error as Error).message
      });
    }
  };
}