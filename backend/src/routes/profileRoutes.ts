// routes/profileRoutes.ts
import { Router } from 'express';
import { 
  getProfile, 
  updateProfile, 
  changePassword 
} from '../controllers/authController';
import { protect } from '../middleware/authMiddleware';
import { body } from 'express-validator';

const router = Router();

// All routes require authentication
router.use(protect);

router.get('/', getProfile);
router.put('/',
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

export default router;