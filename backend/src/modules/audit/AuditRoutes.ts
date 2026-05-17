import { Router } from 'express';
import { AuditController } from './AuditController';
import { protect } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';

export const AuditRoutes = () => {
  const router = Router();
  const controller = new AuditController();

  // All audit routes require authentication and admin/manager role
  router.use(protect);
  router.use(authorize('ADMIN', 'MANAGER'));

  /**
   * @route   GET /api/audit/logs
   * @desc    Get all audit logs with pagination and filters
   * @access  Private (Admin/Manager only)
   */
  router.get('/logs', controller.getLogs);

  /**
   * @route   GET /api/audit/logs/entity/:entityType/:entityId
   * @desc    Get audit logs for a specific entity
   * @access  Private (Admin/Manager only)
   */
  router.get('/logs/entity/:entityType/:entityId', controller.getEntityLogs);

  /**
   * @route   GET /api/audit/logs/user/:userId
   * @desc    Get audit logs for a specific user
   * @access  Private (Admin/Manager only)
   */
  router.get('/logs/user/:userId', controller.getUserLogs);

  /**
   * @route   GET /api/audit/logs/:id
   * @desc    Get a specific audit log entry
   * @access  Private (Admin/Manager only)
   */
  router.get('/logs/:id', controller.getLogById);

  /**
   * @route   GET /api/audit/logs/export
   * @desc    Export audit logs to CSV/JSON
   * @access  Private (Admin/Manager only)
   */
  router.get('/logs/export', controller.exportLogs);

  return router;
};

export default AuditRoutes;
