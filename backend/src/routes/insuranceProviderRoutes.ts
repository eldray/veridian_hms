import express from 'express';
import {
  getInsuranceProviders,
  getInsuranceProviderById,
  createInsuranceProvider,
  updateInsuranceProvider,
  deleteInsuranceProvider,
} from '../controllers/insuranceProviderController';
import { protect, requireAdmin, requireMedicalStaff } from '../middleware/authMiddleware';

const router = express.Router();

// Allow doctors/nurses to view insurance providers for patient registration
router.get('/', protect, requireMedicalStaff, getInsuranceProviders);
router.get('/:id', protect, requireMedicalStaff, getInsuranceProviderById);

// Only admin can modify insurance providers
router.post('/', protect, requireAdmin, createInsuranceProvider);
router.put('/:id', protect, requireAdmin, updateInsuranceProvider);
router.delete('/:id', protect, requireAdmin, deleteInsuranceProvider);

export default router;