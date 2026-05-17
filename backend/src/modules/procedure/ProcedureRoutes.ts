// modules/procedure/ProcedureRoutes.ts

import { Router } from 'express';
import { ProcedureController } from './ProcedureController';
import { body } from 'express-validator';
import { authenticate, authorize } from '../../middleware/authMiddleware';

export const createProcedureRoutes = (prisma: any): Router => {
  const router = Router();
  const controller = new ProcedureController(prisma);

  // All routes require authentication
  router.use(authenticate);

  // ============================================
  // PROCEDURE TEMPLATE ROUTES
  // ============================================

  // Get all procedure templates with pagination
  router.get('/templates', controller.getProcedureTemplates);

  // Get procedure categories
  router.get('/categories', controller.getProcedureCategories);

  // Get procedure departments
  router.get('/departments', controller.getProcedureDepartments);

  // Get single procedure template by ID
  router.get('/templates/:id', controller.getProcedureTemplateById);

  // Create procedure template
  router.post(
    '/templates',
    authorize(['admin', 'doctor']),
    body('name').notEmpty().withMessage('Procedure name is required'),
    body('code').notEmpty().withMessage('Service code is required'),
    body('serviceCategory').isIn(['minor_procedures', 'major_procedures', 'endoscopy', 'surgery', 'other']).withMessage('Invalid category'),
    body('cashPrice').isFloat({ min: 0 }).withMessage('Cash price must be a non-negative number'),
    body('insurancePrice').isFloat({ min: 0 }).withMessage('Insurance price must be a non-negative number'),
    controller.createProcedureTemplate
  );

  // Update procedure template
  router.put(
    '/templates/:id',
    authorize(['admin', 'doctor']),
    body('name').optional().notEmpty().withMessage('Procedure name cannot be empty'),
    body('code').optional().notEmpty().withMessage('Service code cannot be empty'),
    body('serviceCategory').optional().isIn(['minor_procedures', 'major_procedures', 'endoscopy', 'surgery', 'other']).withMessage('Invalid category'),
    body('cashPrice').optional().isFloat({ min: 0 }).withMessage('Cash price must be a non-negative number'),
    body('insurancePrice').optional().isFloat({ min: 0 }).withMessage('Insurance price must be a non-negative number'),
    controller.updateProcedureTemplate
  );

  // Delete procedure template
  router.delete(
    '/templates/:id',
    authorize(['admin']),
    controller.deleteProcedureTemplate
  );

  // Bulk update procedure templates
  router.post(
    '/templates/bulk-update',
    authorize(['admin']),
    controller.bulkUpdateProcedureTemplates
  );

  return router;
};
