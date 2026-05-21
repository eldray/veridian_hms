// modules/diagnosis/DiagnosisController.ts

import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { DiagnosisService } from './DiagnosisService';
import { AuthRequest } from '../../middleware/authMiddleware';
import { PrismaClient } from '@prisma/client';

export class DiagnosisController {
  private service: DiagnosisService;

  constructor(prisma: PrismaClient) {  // ✅ Accept prisma
    this.service = new DiagnosisService(prisma);  // ✅ Pass to service
  }

  // ============================================
  // GET ALL DIAGNOSES WITH PAGINATION
  // ============================================
  getAll = async (req: AuthRequest, res: Response) => {
    try {
      const { page = 1, limit = 50, morbidityGroup, isActive, search, searchField } = req.query;

      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));

      const filters = {
        page: pageNum,
        limit: limitNum,
        morbidityGroup: morbidityGroup as any,
        isActive: isActive === 'true' || isActive === 'false' ? isActive === 'true' : undefined,
        search: search as string,
        searchField: searchField as any
      };

      const result = await this.service.getDiagnoses(filters);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Error fetching diagnoses:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching diagnoses',
        error: (error as Error).message
      });
    }
  };

  // ============================================
  // GET DIAGNOSIS BY ID
  // ============================================
  getById = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const diagnosis = await this.service.getDiagnosisById(id);

      res.json({
        success: true,
        data: diagnosis
      });
    } catch (error) {
      console.error('Error fetching diagnosis:', error);
      if ((error as Error).message === 'Diagnosis not found') {
        return res.status(404).json({
          success: false,
          message: 'Diagnosis not found'
        });
      }
      res.status(500).json({
        success: false,
        message: 'Error fetching diagnosis',
        error: (error as Error).message
      });
    }
  };

  // ============================================
  // CREATE DIAGNOSIS
  // ============================================
  create = [
    body('name').notEmpty().withMessage('Diagnosis name is required').trim(),
    body('icdCode').notEmpty().withMessage('ICD code is required').trim().toUpperCase(),
    body('morbidityGroup').notEmpty().withMessage('Morbidity group is required'),

    async (req: AuthRequest, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({
            success: false,
            errors: errors.array(),
            message: 'Validation failed'
          });
        }

        const {
          name,
          icdCode,
          morbidityGroup,
          description,
          requiresAuthorization,
          isChronic,
          isNHISCovered,
          tariffCode
        } = req.body;

        const diagnosis = await this.service.createDiagnosis({
          name,
          icdCode,
          morbidityGroup,
          description,
          requiresAuthorization,
          isChronic,
          isNHISCovered,
          tariffCode
        });

        res.status(201).json({
          success: true,
          data: diagnosis,
          message: 'Diagnosis created successfully'
        });
      } catch (error) {
        console.error('Error creating diagnosis:', error);
        if ((error as Error).message.includes('already exists')) {
          return res.status(400).json({
            success: false,
            message: (error as Error).message
          });
        }
        res.status(500).json({
          success: false,
          message: 'Error creating diagnosis',
          error: (error as Error).message
        });
      }
    }
  ];

  // ============================================
  // UPDATE DIAGNOSIS
  // ============================================
  update = [
    body('name').optional().trim(),
    body('icdCode').optional().trim().toUpperCase(),
    body('morbidityGroup').optional(),
    body('isActive').optional().isBoolean(),

    async (req: AuthRequest, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({
            success: false,
            errors: errors.array(),
            message: 'Validation failed'
          });
        }

        const { id } = req.params;
        const updateData = req.body;

        const diagnosis = await this.service.updateDiagnosis(id, updateData);

        res.json({
          success: true,
          data: diagnosis,
          message: 'Diagnosis updated successfully'
        });
      } catch (error) {
        console.error('Error updating diagnosis:', error);
        if ((error as Error).message === 'Diagnosis not found') {
          return res.status(404).json({
            success: false,
            message: 'Diagnosis not found'
          });
        }
        if ((error as Error).message.includes('already exists')) {
          return res.status(400).json({
            success: false,
            message: (error as Error).message
          });
        }
        res.status(500).json({
          success: false,
          message: 'Error updating diagnosis',
          error: (error as Error).message
        });
      }
    }
  ];

  // ============================================
  // DELETE DIAGNOSIS
  // ============================================
  delete = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      await this.service.deleteDiagnosis(id);

      res.json({
        success: true,
        message: 'Diagnosis deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting diagnosis:', error);
      if ((error as Error).message === 'Diagnosis not found') {
        return res.status(404).json({
          success: false,
          message: 'Diagnosis not found'
        });
      }
      if ((error as Error).message.includes('Cannot delete')) {
        return res.status(400).json({
          success: false,
          message: (error as Error).message
        });
      }
      res.status(500).json({
        success: false,
        message: 'Error deleting diagnosis',
        error: (error as Error).message
      });
    }
  };

  // ============================================
  // SEARCH DIAGNOSES
  // ============================================
  search = async (req: AuthRequest, res: Response) => {
    try {
      const { q, field = 'all' } = req.query;

      if (!q || (q as string).trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Search query must be at least 2 characters'
        });
      }

      const diagnoses = await this.service.searchDiagnoses(
        q as string,
        field as any
      );

      res.json({
        success: true,
        data: diagnoses
      });
    } catch (error) {
      console.error('Error searching diagnoses:', error);
      res.status(500).json({
        success: false,
        message: 'Error searching diagnoses',
        error: (error as Error).message
      });
    }
  };

  // ============================================
  // GET DIAGNOSIS STATISTICS
  // ============================================
  getStats = async (req: AuthRequest, res: Response) => {
    try {
      const stats = await this.service.getDiagnosisStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error fetching diagnosis stats:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching diagnosis stats',
        error: (error as Error).message
      });
    }
  };

  // ============================================
  // GET MORBIDITY GROUPS
  // ============================================
  getMorbidityGroups = async (req: AuthRequest, res: Response) => {
    try {
      const groups = await this.service.getMorbidityGroups();

      res.json({
        success: true,
        data: groups
      });
    } catch (error) {
      console.error('Error fetching morbidity groups:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching morbidity groups',
        error: (error as Error).message
      });
    }
  };

  // ============================================
  // GET DIAGNOSES BY MORBIDITY GROUP
  // ============================================
  getByMorbidityGroup = async (req: AuthRequest, res: Response) => {
    try {
      const { morbidityGroup } = req.params;
      const { page = 1, limit = 50 } = req.query;

      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));

      const result = await this.service.getDiagnosesByMorbidityGroup(
        morbidityGroup,
        pageNum,
        limitNum
      );

      res.json({
        success: true,
        data: result.diagnoses,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Error fetching diagnoses by morbidity group:', error);
      if ((error as Error).message.includes('Invalid morbidity group')) {
        return res.status(400).json({
          success: false,
          message: (error as Error).message
        });
      }
      res.status(500).json({
        success: false,
        message: 'Error fetching diagnoses by morbidity group',
        error: (error as Error).message
      });
    }
  };
}