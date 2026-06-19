import { Router } from 'express';
import { UserRole } from '@prisma/client'; // ✅ Import UserRole
import { auditController } from './AuditController';
import { protect, requireRole } from '../../middleware/authMiddleware';

export function createAuditRoutes(): Router {
  const router = Router();

  // All audit routes require authentication and admin role
  router.use(protect);
  
  // ✅ Explicitly type the array to prevent TypeScript underlines
  const adminRoles: UserRole[] = ['admin'];
  router.use(requireRole(adminRoles));

  // ==========================================
  // ✅ FIXED ROUTE ORDER: Specific routes MUST come before dynamic :id routes
  // ==========================================
  router.get('/logs/export', auditController.exportLogs);
  router.get('/logs/entity/:entityType/:entityId', auditController.getEntityLogs);
  router.get('/logs/user/:userId', auditController.getUserLogs);
  
  // Dynamic routes last
  router.get('/logs', auditController.getLogs);
  router.get('/logs/:id', auditController.getLogById);

  return router;
}

export default createAuditRoutes;