import { Router } from 'express';
import { PrismaClient, UserRole } from '@prisma/client'; // ✅ Import UserRole
import { ProcedureController } from './ProcedureController';
import { body } from 'express-validator';
import { protect, requireRole } from '../../middleware/authMiddleware';

export function createProcedureRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const controller = new ProcedureController(prisma);

  router.use(protect);

  // ✅ FIXED: Explicitly type the arrays to prevent TypeScript underlines
  const readRoles: UserRole[] = ['admin', 'doctor', 'nurse', 'midwife', 'records', 'accounts'];
  const writeRoles: UserRole[] = ['admin', 'doctor'];
  const adminRoles: UserRole[] = ['admin'];

  // ============================================
  // SPECIFIC ROUTES FIRST (BEFORE dynamic :id routes)
  // ============================================
  router.get('/templates', requireRole(readRoles), controller.getProcedureTemplates);
  router.get('/categories', requireRole(readRoles), controller.getProcedureCategories);
  router.get('/departments', requireRole(readRoles), controller.getProcedureDepartments);
  
  // ✅ FIXED: Moved bulk-update BEFORE /:id
  router.post('/templates/bulk-update', requireRole(adminRoles), controller.bulkUpdateProcedureTemplates);

  // ============================================
  // DYNAMIC ID ROUTES (LAST)
  // ============================================
  router.get('/templates/:id', requireRole(readRoles), controller.getProcedureTemplateById);
  
  router.post(
    '/templates', requireRole(writeRoles),
    [
      body('name').notEmpty().withMessage('Procedure name is required'),
      body('code').notEmpty().withMessage('Service code is required'),
      body('cashPrice').isFloat({ min: 0 }).withMessage('Cash price must be a non-negative number'),
      body('insurancePrice').isFloat({ min: 0 }).withMessage('Insurance price must be a non-negative number')
    ],
    controller.createProcedureTemplate
  );
  
  router.put(
    '/templates/:id', requireRole(writeRoles),
    [
      body('name').optional().notEmpty().withMessage('Procedure name cannot be empty'),
      body('code').optional().notEmpty().withMessage('Service code cannot be empty'),
      body('cashPrice').optional().isFloat({ min: 0 }).withMessage('Cash price must be a non-negative number')
    ],
    controller.updateProcedureTemplate
  );
  
  router.delete('/templates/:id', requireRole(adminRoles), controller.deleteProcedureTemplate);

  return router;
}