import { Router } from 'express';
import { body } from 'express-validator';
import { UserController } from './UserController';
import { protect, requireRole } from '../../middleware/authMiddleware';
import { VALID_ROLES, VALID_SENIORITY, VALID_LEAVE_TYPES, VALID_SHIFT_TYPES } from './UserTypes';

// Role groups
const ADMIN_ONLY = ['admin', 'super_admin'] as const;
const ADMIN_HR = ['admin', 'super_admin', 'hr_officer'] as const;

export const createUserRoutes = (prisma: any): Router => {
  const router = Router();
  const controller = new UserController(prisma);

  router.use(protect);

  // ==========================================
  // CURRENT USER — static routes FIRST
  // ==========================================

  router.get('/permissions', controller.getMyPermissions);
  router.get('/me/payslips', controller.getMyPayslips);
  router.get('/me/documents', controller.getMyDocuments);

  // ==========================================
  // USER MANAGEMENT
  // ==========================================

  router.post(
    '/',
    requireRole([...ADMIN_ONLY]),
    [
      body('username').trim().notEmpty().isLength({ min: 3 }),
      body('password').isLength({ min: 6 }),
      body('fullName').trim().notEmpty(),
      body('role').isIn(VALID_ROLES as unknown as string[]),
      body('seniority').optional().isIn(VALID_SENIORITY as unknown as string[]),
      body('email').optional({ checkFalsy: true }).isEmail(),
      body('phone').optional().trim(),
      body('licenseNumber').optional().trim(),
      body('specialization').optional().trim(),
      body('departmentId').optional().isString(),
    ],
    controller.createUser,
  );

  router.get('/', requireRole([...ADMIN_ONLY]), controller.getAllUsers);

  // ==========================================
  // FULL PROFILE
  // ==========================================

  router.get('/:id/full-profile', controller.getFullProfile);
  router.patch('/:id/full-profile', controller.updateFullProfile);

  // ==========================================
  // PAYROLL — static routes FIRST
  // ==========================================

  router.get('/payslips/all', requireRole([...ADMIN_HR]), controller.getAllPayslips);
  router.post('/payslips/run-payroll', requireRole([...ADMIN_HR]), controller.runPayroll);
  router.patch('/payslips/:payslipId', requireRole([...ADMIN_HR]), controller.updatePayslip);
  router.get('/payslips/:payslipId', requireRole([...ADMIN_HR]), controller.getPayslipById);
  router.post('/payslips/:payslipId/line-items', requireRole([...ADMIN_HR]), controller.addPayslipLineItem);
  router.patch('/payslips/:payslipId/line-items/:lineItemId', requireRole([...ADMIN_HR]), controller.updatePayslipLineItem);
  router.delete('/payslips/:payslipId/line-items/:lineItemId', requireRole([...ADMIN_HR]), controller.deletePayslipLineItem);

  // ==========================================
  // DOCUMENTS — static FIRST
  // ==========================================

  router.get('/documents/all', requireRole([...ADMIN_HR]), controller.getAllDocuments);

  // ==========================================
  // PER-USER payslips and documents
  // ==========================================

  router.get('/:id/payslips', controller.getUserPayslips);
  router.post('/:id/payslips', requireRole([...ADMIN_HR]), controller.generatePayslip);
  router.get('/:id/documents', controller.getUserDocuments);

  // ==========================================
  // USER UPDATE / DEACTIVATE
  // ==========================================

  router.put(
    '/:id',
    requireRole([...ADMIN_ONLY]),
    [
      body('fullName').optional().trim().notEmpty(),
      body('email').optional().isEmail(),
      body('phone').optional().trim(),
      body('licenseNumber').optional().trim(),
      body('specialization').optional().trim(),
      body('role').optional().isIn(VALID_ROLES as unknown as string[]),
      body('seniority').optional().isIn(VALID_SENIORITY as unknown as string[]),
      body('isActive').optional().isBoolean(),
      body('departmentId').optional().isString(),
      body('imageUrl').optional().isURL(),
      body('headedDepartmentId').optional().isString(),
    ],
    controller.updateUser,
  );

  router.patch('/:id/deactivate', requireRole([...ADMIN_ONLY]), controller.deactivateUser);

  // ==========================================
  // SHIFTS
  //
  // Read:  admin, super_admin, hr_officer, doctor, nurse, midwife
  // Write: admin, super_admin, hr_officer
  // ==========================================

  const SHIFT_READ = ['admin', 'super_admin', 'hr_officer', 'doctor', 'nurse', 'midwife'] as const;

  router.get('/shifts', requireRole([...SHIFT_READ]), controller.getAllShifts);
  router.post(
    '/shifts',
    requireRole([...ADMIN_HR]),
    [
      body('userId').notEmpty().isString(),
      body('shiftDate').notEmpty().isISO8601(),
      body('startTime').notEmpty().matches(/^\d{2}:\d{2}$/),
      body('endTime').notEmpty().matches(/^\d{2}:\d{2}$/),
      body('shiftType').optional().isIn(VALID_SHIFT_TYPES as unknown as string[]),
      body('notes').optional().isString(),
    ],
    controller.createShift,
  );
  router.put(
    '/shifts/:id',
    requireRole([...ADMIN_HR]),
    [
      body('shiftDate').optional().isISO8601(),
      body('startTime').optional().matches(/^\d{2}:\d{2}$/),
      body('endTime').optional().matches(/^\d{2}:\d{2}$/),
      body('shiftType').optional().isIn(VALID_SHIFT_TYPES as unknown as string[]),
      body('status').optional().isIn(['scheduled', 'completed', 'cancelled', 'no_show']),
      body('notes').optional().isString(),
    ],
    controller.updateShift,
  );
  router.delete('/shifts/:id', requireRole([...ADMIN_HR]), controller.deleteShift);

  // ==========================================
  // LEAVES
  //
  // Read:      admin, super_admin, hr_officer, doctor, nurse, midwife
  // Create:    any authenticated user (self-service)
  // Update:    approve/reject → admin, super_admin, hr_officer
  //            cancel       → owner or admin
  // Delete:    owner or admin
  // ==========================================

  const LEAVE_READ = ['admin', 'super_admin', 'hr_officer', 'doctor', 'nurse', 'midwife'] as const;

  router.get('/leaves', requireRole([...LEAVE_READ]), controller.getAllLeaves);

  router.post(
    '/leaves',
    [
      body('leaveType').notEmpty().isIn(VALID_LEAVE_TYPES as unknown as string[]),
      body('startDate').notEmpty().isISO8601(),
      body('endDate').notEmpty().isISO8601(),
      body('reason').optional().isString(),
    ],
    controller.createLeave,
  );

  router.put(
    '/leaves/:id',
    [
      body('status').optional().isIn(['pending', 'approved', 'rejected', 'cancelled']),
      body('reason').optional().isString(),
    ],
    controller.updateLeave,
  );

  router.delete('/leaves/:id', controller.deleteLeave);

  // ==========================================
  // SHIFTS/LEAVES for a specific user (admin view)
  // ==========================================

  router.get(
    '/:id/shifts',
    requireRole([...ADMIN_HR]),
    controller.getAllShifts,
  );

  return router;
};