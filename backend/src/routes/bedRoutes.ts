// routes/bedRoutes.ts
import { Router } from 'express';
import {
  getBeds,
  getBedById,
  createBed,
  updateBed,
  deleteBed
} from '../controllers/bedController';
import {
  protect,
  requireRole,
  requireAdmin,
  requireMedicalStaff
} from '../middleware/authMiddleware';

const router = Router();

// All routes require authentication
router.use(protect);

// Get all beds - accessible by medical staff and admin
router.get('/', requireMedicalStaff, getBeds);

// Get bed by ID - accessible by medical staff and admin
router.get('/:id', requireMedicalStaff, getBedById);

// Create bed - admin only
router.post('/', requireAdmin, createBed);

// Update bed - admin only
router.put('/:id', requireAdmin, updateBed);

// Delete bed - admin only
router.delete('/:id', requireAdmin, deleteBed);

export default router;