import { Router } from 'express';
import { body } from 'express-validator';
import { UserController } from './UserController';
import { protect, requireRole } from '../../middleware/authMiddleware';
import { VALID_ROLES, VALID_SENIORITY, VALID_LEAVE_TYPES, VALID_SHIFT_TYPES } from './UserTypes';

export const createUserRoutes = (prisma: any): Router => {
  const router = Router();
  const controller = new UserController(prisma);

  router.use(protect);

  // ==========================================
  // USER MANAGEMENT (Admin only)
  // ==========================================

  // Current user's own permissions — MUST be declared before any dynamic /:id route.
  router.get('/permissions', controller.getMyPermissions);

  router.get('/', requireRole(['admin']), controller.getAllUsers);

  router.put(
    '/:id',
    requireRole(['admin']),
    [
      body('fullName').optional().trim().notEmpty(),
      body('email').optional().isEmail(),
      body('phone').optional().trim(),
      body('licenseNumber').optional().trim(),
      body('specialization').optional().trim(),
      body('role').optional().isIn(VALID_ROLES),
      body('seniority').optional().isIn(VALID_SENIORITY),
      body('isActive').optional().isBoolean(),
      body('departmentId').optional().isString(),
      body('imageUrl').optional().isURL(),
      body('headedDepartmentId').optional().isString(),
    ],
    controller.updateUser
  );

  router.patch('/:id/deactivate', requireRole(['admin']), controller.deactivateUser);

  // ==========================================
  // SHIFT MANAGEMENT (Admin, Department Heads)
  // ==========================================

  router.get('/shifts', requireRole(['admin', 'doctor', 'nurse']), controller.getAllShifts);

  router.post(
    '/shifts',
    requireRole(['admin']),
    [
      body('userId').notEmpty().isString(),
      body('shiftDate').notEmpty().isISO8601(),
      body('startTime').notEmpty().matches(/^\d{2}:\d{2}$/),
      body('endTime').notEmpty().matches(/^\d{2}:\d{2}$/),
      body('shiftType').optional().isIn(VALID_SHIFT_TYPES),
      body('notes').optional().isString(),
    ],
    controller.createShift
  );

  router.put(
    '/shifts/:id',
    requireRole(['admin']),
    [
      body('shiftDate').optional().isISO8601(),
      body('startTime').optional().matches(/^\d{2}:\d{2}$/),
      body('endTime').optional().matches(/^\d{2}:\d{2}$/),
      body('shiftType').optional().isIn(VALID_SHIFT_TYPES),
      body('status').optional().isIn(['scheduled', 'completed', 'cancelled', 'no_show']),
      body('notes').optional().isString(),
    ],
    controller.updateShift
  );

  router.delete('/shifts/:id', requireRole(['admin']), controller.deleteShift);

  // ==========================================
  // LEAVE MANAGEMENT (All users can request, Admin approves)
  // ==========================================

  router.get('/leaves', requireRole(['admin', 'doctor', 'nurse']), controller.getAllLeaves);

  router.post(
    '/leaves',
    [
      body('leaveType').notEmpty().isIn(VALID_LEAVE_TYPES),
      body('startDate').notEmpty().isISO8601(),
      body('endDate').notEmpty().isISO8601(),
      body('reason').optional().isString(),
    ],
    controller.createLeave
  );

  router.put(
    '/leaves/:id',
    requireRole(['admin']),
    [
      body('status').optional().isIn(['pending', 'approved', 'rejected', 'cancelled']),
      body('reason').optional().isString(),
    ],
    controller.updateLeave
  );

  router.delete('/leaves/:id', controller.deleteLeave);

  return router;
};