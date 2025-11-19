// routes/authRoutes.ts
import { Router } from 'express';
import {
  login,
  register,
  getProfile,
  updateProfile,
  changePassword,
  getUsers,
  getUserStats
} from '../controllers/authController';
import { 
  protect, 
  requireAdmin, 
  requireRole,
  requireOwnershipOrAdmin 
} from '../middleware/authMiddleware';
import { body } from 'express-validator';

const router = Router();

// Public routes
router.post('/login', login);
router.post('/register', 
  [
    body('username').isLength({ min: 3 }),
    body('password').isLength({ min: 6 }),
    body('fullName').notEmpty(),
    body('role').isIn(['admin', 'doctor', 'nurse', 'midwife', 'records', 'lab_tech', 'pharmacist', 'accounts', 'sonographer'])
  ],
  register
);

// Protected routes (require authentication)
router.use(protect); // All routes below this require authentication

// User profile routes
router.get('/profile', getProfile);
router.put('/profile', 
  [
    body('email').optional().isEmail(),
    body('fullName').optional().isLength({ min: 2 }),
    body('phone').optional().isMobilePhone('any'),
    body('licenseNumber').optional().isLength({ min: 3 }),
    body('specialization').optional().isLength({ min: 2 })
  ],
  updateProfile
);
router.put('/change-password',
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 6 })
  ],
  changePassword
);

// Admin-only routes
router.get('/users', requireAdmin, getUsers);
router.get('/users/stats', requireAdmin, getUserStats);

export default router;