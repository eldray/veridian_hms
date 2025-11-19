// routes/settingsRoutes.ts
import express from 'express';
import {
  getAllUsers,
  updateUser,
  deactivateUser,
  getHospitalDetails,
  updateHospitalDetails
} from '../controllers/settingsController';
import { protect, requireAdmin } from '../middleware/authMiddleware';

const router = express.Router();

// All routes are protected and require admin access
router.use(protect, requireAdmin);

// User management routes
router.get('/users', getAllUsers);
router.put('/users/:id', updateUser);
router.patch('/users/:id/deactivate', deactivateUser);

// Hospital management routes
router.get('/hospital', getHospitalDetails);
router.put('/hospital', updateHospitalDetails);

export default router;