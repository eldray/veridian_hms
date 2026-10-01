import { Router } from 'express';
import { body } from 'express-validator';
import { UserController } from './UserController';
import { protect, requireRole } from '../../middleware/authMiddleware';
import { uploadSingleDocument } from '../../middleware/uploadMiddleware';
import { VALID_ROLES, VALID_SENIORITY, VALID_LEAVE_TYPES, VALID_SHIFT_TYPES } from './UserTypes';

// Role groups
const ADMIN_ONLY = ['admin', 'super_admin'] as const;
const ADMIN_HR = ['admin', 'super_admin', 'hr_officer'] as const;

// Allows the user themself (":id" in the URL) or anyone in `roles`
const selfOrRoles = (roles: readonly string[]) => (req: any, res: any, next: any) => {
  if (req.user?.userId === req.params.id || roles.includes(req.user?.role)) return next();
  return res.status(403).json({ success: false, message: 'Not authorized' });
};

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
  router.get('/documents/:documentId', requireRole([...ADMIN_HR]), controller.getDocumentById);
  router.patch('/documents/:documentId', requireRole([...ADMIN_HR]), controller.updateDocument);
  router.post('/documents/:documentId/verify', requireRole([...ADMIN_HR]), controller.verifyDocument);
  router.post('/documents/:documentId/unverify', requireRole([...ADMIN_HR]), controller.unverifyDocument);
  router.delete('/documents/:documentId', requireRole([...ADMIN_HR]), controller.deleteDocument);

  // ==========================================
  // PER-USER payslips and documents
  // ==========================================

  router.get('/:id/payslips', controller.getUserPayslips);
  router.post('/:id/payslips', requireRole([...ADMIN_HR]), controller.generatePayslip);
  router.get('/:id/documents', controller.getUserDocuments);
  router.post('/:id/documents', selfOrRoles(ADMIN_HR), uploadSingleDocument, controller.uploadUserDocument);

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
  router.get('/shifts/:id', requireRole([...SHIFT_READ]), controller.getShiftById);
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
  router.get('/leaves/:id', requireRole([...LEAVE_READ]), controller.getLeaveById);

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

  // Single user: LAST, so it cannot swallow /shifts, /leaves, /documents, /payslips ...
  router.get('/:id', selfOrRoles(ADMIN_HR), controller.getUserById);

  return router;
};