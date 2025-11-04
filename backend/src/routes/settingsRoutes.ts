import express from 'express';
import { 
  getAllUsers, 
  updateUser, 
  deactivateUser,
  getHospitalDetails,
  updateHospitalDetails
} from '../controllers/settingsController';
import { protect, requireRole } from '../middleware/authMiddleware';

const router = express.Router();

// User management routes (admin only)
router.get('/users', protect, requireRole(['admin']), getAllUsers);
router.put('/users/:id', protect, requireRole(['admin']), updateUser);
router.put('/users/:id/deactivate', protect, requireRole(['admin']), deactivateUser);

// Hospital details routes (admin only)
router.get('/hospital', protect, requireRole(['admin']), getHospitalDetails);
router.put('/hospital', protect, requireRole(['admin']), updateHospitalDetails);

export default router;
