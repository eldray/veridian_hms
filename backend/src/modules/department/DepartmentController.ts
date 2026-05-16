/**
 * Department Controller
 * Handles HTTP requests for department operations
 */

import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { DepartmentService } from './DepartmentService';
import { CreateDepartmentDTO, UpdateDepartmentDTO, DepartmentFilters } from './DepartmentTypes';

export class DepartmentController {
  private service: DepartmentService;

  constructor(prisma: PrismaClient) {
    this.service = new DepartmentService(prisma);
  }

  getAll = async (req: Request, res: Response): Promise<void> => {
    try {
      const { isActive, hasHead, page, limit } = req.query;

      const filters: DepartmentFilters = {
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
        hasHead: hasHead !== undefined ? hasHead === 'true' : undefined,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 50
      };

      const departments = await this.service.getAllDepartments(filters);

      res.json({
        success: true,
        data: departments,
        count: departments.length
      });
    } catch (error) {
      console.error('Error fetching departments:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching departments',
        error: (error as Error).message
      });
    }
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const department = await this.service.getDepartmentById(id);

      res.json({
        success: true,
        data: department
      });
    } catch (error) {
      console.error('Error fetching department:', error);
      if ((error as Error).message === 'Department not found') {
        res.status(404).json({
          success: false,
          message: 'Department not found'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Error fetching department',
          error: (error as Error).message
        });
      }
    }
  };

  create = [
    body('name')
      .notEmpty().withMessage('Department name is required')
      .trim()
      .isLength({ min: 2 }).withMessage('Department name must be at least 2 characters'),
    body('description').optional().isString().trim(),
    body('headId').optional().isString(),
    body('color').optional().isString(),
    body('icon').optional().isString(),

    async (req: Request, res: Response): Promise<void> => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          res.status(400).json({
            success: false,
            errors: errors.array()
          });
          return;
        }

        const { name, description, headId, color, icon } = req.body;
        const user = (req as any).user;

        const data: CreateDepartmentDTO = {
          name,
          description,
          headId,
          color,
          icon
        };

        const department = await this.service.createDepartment(data, user?.id);

        res.status(201).json({
          success: true,
          message: 'Department created successfully',
          data: department
        });
      } catch (error) {
        console.error('Error creating department:', error);
        if ((error as Error).message.includes('already exists')) {
          res.status(400).json({
            success: false,
            message: (error as Error).message
          });
        } else if ((error as Error).message === 'Head user not found') {
          res.status(404).json({
            success: false,
            message: 'Head user not found'
          });
        } else {
          res.status(500).json({
            success: false,
            message: 'Error creating department',
            error: (error as Error).message
          });
        }
      }
    }
  ];

  update = [
    body('name').optional().trim().isLength({ min: 2 }).withMessage('Department name must be at least 2 characters'),
    body('description').optional().isString().trim(),
    body('headId').optional().isString(),
    body('color').optional().isString(),
    body('icon').optional().isString(),
    body('isActive').optional().isBoolean(),

    async (req: Request, res: Response): Promise<void> => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          res.status(400).json({
            success: false,
            errors: errors.array()
          });
          return;
        }

        const { id } = req.params;
        const user = (req as any).user;
        const updateData: UpdateDepartmentDTO = req.body;

        const department = await this.service.updateDepartment(id, updateData, user?.id);

        res.json({
          success: true,
          message: 'Department updated successfully',
          data: department
        });
      } catch (error) {
        console.error('Error updating department:', error);
        if ((error as Error).message === 'Department not found') {
          res.status(404).json({
            success: false,
            message: 'Department not found'
          });
        } else if ((error as Error).message.includes('already exists')) {
          res.status(400).json({
            success: false,
            message: (error as Error).message
          });
        } else if ((error as Error).message === 'Head user not found') {
          res.status(404).json({
            success: false,
            message: 'Head user not found'
          });
        } else {
          res.status(500).json({
            success: false,
            message: 'Error updating department',
            error: (error as Error).message
          });
        }
      }
    }
  ];

  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      await this.service.deleteDepartment(id);

      res.json({
        success: true,
        message: 'Department deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting department:', error);
      if ((error as Error).message === 'Department not found') {
        res.status(404).json({
          success: false,
          message: 'Department not found'
        });
      } else if ((error as Error).message.includes('Cannot delete')) {
        res.status(400).json({
          success: false,
          message: (error as Error).message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Error deleting department',
          error: (error as Error).message
        });
      }
    }
  };

  getStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = await this.service.getStatistics();

      res.json({
        success: true,
        stats
      });
    } catch (error) {
      console.error('Error fetching department statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching statistics',
        error: (error as Error).message
      });
    }
  };

  getUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const users = await this.service.getUsersByDepartment(id);

      res.json({
        success: true,
        data: users,
        count: users.length
      });
    } catch (error) {
      console.error('Error fetching department users:', error);
      if ((error as Error).message === 'Department not found') {
        res.status(404).json({
          success: false,
          message: 'Department not found'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Error fetching department users',
          error: (error as Error).message
        });
      }
    }
  };

  assignUser = [
    body('userId').notEmpty().withMessage('User ID is required').isString(),

    async (req: Request, res: Response): Promise<void> => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          res.status(400).json({
            success: false,
            errors: errors.array()
          });
          return;
        }

        const { id } = req.params;
        const { userId } = req.body;
        const user = (req as any).user;

        await this.service.assignUserToDepartment(id, userId);

        res.json({
          success: true,
          message: 'User assigned to department successfully'
        });
      } catch (error) {
        console.error('Error assigning user to department:', error);
        if ((error as Error).message === 'Department not found' || (error as Error).message === 'User not found') {
          res.status(404).json({
            success: false,
            message: (error as Error).message
          });
        } else if ((error as Error).message.includes('already assigned')) {
          res.status(400).json({
            success: false,
            message: (error as Error).message
          });
        } else {
          res.status(500).json({
            success: false,
            message: 'Error assigning user to department',
            error: (error as Error).message
          });
        }
      }
    }
  ];

  removeUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, userId } = req.params;

      await this.service.removeUserFromDepartment(id, userId);

      res.json({
        success: true,
        message: 'User removed from department successfully'
      });
    } catch (error) {
      console.error('Error removing user from department:', error);
      if ((error as Error).message === 'User is not assigned') {
        res.status(400).json({
          success: false,
          message: (error as Error).message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Error removing user from department',
          error: (error as Error).message
        });
      }
    }
  };

  bulkUpdate = [
    body('departmentIds').isArray().withMessage('Department IDs must be an array'),
    body('departmentIds.*').isString().withMessage('Each department ID must be a string'),

    async (req: Request, res: Response): Promise<void> => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          res.status(400).json({
            success: false,
            errors: errors.array()
          });
          return;
        }

        const { departmentIds, ...updateData } = req.body;
        const user = (req as any).user;

        const count = await this.service.bulkUpdateDepartments(departmentIds, updateData);

        res.json({
          success: true,
          message: `${count} department(s) updated successfully`,
          count
        });
      } catch (error) {
        console.error('Error bulk updating departments:', error);
        res.status(500).json({
          success: false,
          message: 'Error bulk updating departments',
          error: (error as Error).message
        });
      }
    }
  ];
}
