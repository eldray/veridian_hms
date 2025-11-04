import express from 'express';
import { 
  getInsuranceProviders, 
  getInsuranceProviderById, 
  createInsuranceProvider, 
  updateInsuranceProvider, 
  deleteInsuranceProvider 
} from '../controllers/insuranceProviderController';
import { protect, requireRole } from '../middleware/authMiddleware';

const router = express.Router();

// Allow doctors/nurses to view insurance providers for patient registration
router.get('/', protect, requireRole(['admin', 'doctor', 'nurse']), getInsuranceProviders);
router.get('/:id', protect, requireRole(['admin', 'doctor', 'nurse']), getInsuranceProviderById);

// Only admin can modify insurance providers
router.post('/', protect, requireRole(['admin']), createInsuranceProvider);
router.put('/:id', protect, requireRole(['admin']), updateInsuranceProvider);
router.delete('/:id', protect, requireRole(['admin']), deleteInsuranceProvider);

export default router;
