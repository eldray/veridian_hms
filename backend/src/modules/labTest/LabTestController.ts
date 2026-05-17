// LabTestController.ts - HTTP request handlers for Lab Test module

import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { LabTestService } from './LabTestService';
import { CreateLabTestServiceDTO, UpdateLabTestServiceDTO, BulkUpdateLabTestDTO } from './LabTestTypes';
import { ServiceCategory } from '@prisma/client';

export class LabTestController {
  private service: LabTestService;

  constructor(service?: LabTestService) {
    this.service = service || new LabTestService();
  }

  // ============================================
  // GET ALL LAB TEST SERVICES
  // ============================================
  getLabTestServices = async (req: Request, res: Response) => {
    try {
      const query = {
        serviceCategory: req.query.serviceCategory as any,
        subType: req.query.subType as string,
        isActive: req.query.isActive === 'true',
        isNHISCovered: req.query.isNHISCovered === 'true',
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10000
      };

      const result = await this.service.getAllLabTestServices(query);
      res.json(result);
    } catch (error) {
      console.error('Error fetching lab test services:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching lab test services',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  };

  // ============================================
  // GET LAB TEST SERVICE BY ID
  // ============================================
  getLabTestServiceById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await this.service.getLabTestServiceById(id);
      res.json(result);
    } catch (error) {
      console.error('Error fetching lab test service:', error);
      res.status(404).json({
        success: false,
        message: (error as Error).message
      });
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

    async (req: Request, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({
            success: false,
            errors: errors.array()
          });
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

        const createdById = (req as any).user?.id;
        const result = await this.service.createLabTestService(data, createdById);
        res.status(201).json(result);
      } catch (error) {
        console.error('Error creating lab test service:', error);
        res.status(500).json({
          success: false,
          message: 'Error creating lab test service',
          error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
        });
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

    async (req: Request, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({
            success: false,
            errors: errors.array()
          });
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
        res.json(result);
      } catch (error) {
        console.error('Error updating lab test service:', error);
        res.status(500).json({
          success: false,
          message: 'Error updating lab test service',
          error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
        });
      }
    }
  ];

  // ============================================
  // DELETE LAB TEST SERVICE
  // ============================================
  deleteLabTestService = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await this.service.deleteLabTestService(id);
      res.json(result);
    } catch (error) {
      console.error('Error deleting lab test service:', error);
      res.status(404).json({
        success: false,
        message: (error as Error).message
      });
    }
  };

  // ============================================
  // GET LAB TEST SUB-CATEGORIES
  // ============================================
  getLabTestSubCategories = async (req: Request, res: Response) => {
    try {
      const result = await this.service.getLabTestSubCategories();
      res.json(result);
    } catch (error) {
      console.error('Error fetching lab test sub-categories:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching lab test sub-categories',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  };

  // ============================================
  // GET LAB TEST METADATA FIELDS
  // ============================================
  getLabTestMetadataFields = async (req: Request, res: Response) => {
    try {
      const result = await this.service.getLabTestMetadataFields();
      res.json(result);
    } catch (error) {
      console.error('Error fetching lab test metadata fields:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching lab test metadata fields',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  };

  // ============================================
  // BULK UPDATE LAB TEST SERVICES
  // ============================================
  bulkUpdateLabTestServices = [
    body('ids').isArray().withMessage('Service IDs array is required'),
    body('isActive').isBoolean().withMessage('isActive must be a boolean'),

    async (req: Request, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({
            success: false,
            errors: errors.array()
          });
        }

        const data: BulkUpdateLabTestDTO = {
          ids: req.body.ids,
          isActive: req.body.isActive
        };

        const result = await this.service.bulkUpdateLabTestServices(data);
        res.json(result);
      } catch (error) {
        console.error('Error in bulk update:', error);
        res.status(500).json({
          success: false,
          message: 'Error updating lab test services',
          error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
        });
      }
    }
  ];
}
