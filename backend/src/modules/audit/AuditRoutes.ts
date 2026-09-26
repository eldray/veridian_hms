import { Router } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';
import { AuditController } from './AuditController';
import { protect, requireRole } from '../../middleware/authMiddleware';

export function createAuditRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const auditController = new AuditController(prisma);

  // All audit routes require authentication + an admin-level role
  router.use(protect);

  const auditRoles: UserRole[] = ['admin', 'super_admin'];
  router.use(requireRole(auditRoles));

  // ==========================================
  // Static routes FIRST — they must come before /logs/:id
  // ==========================================

  router.get('/logs/meta', auditController.getMeta);
  router.get('/logs/export', auditController.exportLogs);
  router.get('/logs/entity/:entityType/:entityId', auditController.getEntityLogs);
  router.get('/logs/user/:userId', auditController.getUserLogs);

  // ==========================================
  // Dynamic routes LAST
  // ==========================================

  router.get('/logs', auditController.getLogs);
  router.get('/logs/:id', auditController.getLogById);

  return router;
}

export default createAuditRoutes;