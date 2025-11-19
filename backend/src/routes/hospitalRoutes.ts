import express from 'express';
import {
  getHospitals,
  getHospitalById,
  createHospital,
  updateHospital,
  deleteHospital,
  getHospitalNHISSettings,
  updateHospitalNHISSettings
} from '../controllers/hospitalController';
import { protect, requireAdmin, requireAccountsStaff } from '../middleware/authMiddleware';

const router = express.Router();

// Hospital CRUD Operations
router.get('/', protect, getHospitals);
router.get('/:id', protect, getHospitalById);
router.post('/', protect, requireAdmin, createHospital);
router.put('/:id', protect, requireAdmin, updateHospital);
router.delete('/:id', protect, requireAdmin, deleteHospital);

// NHIS Specific Settings
router.get('/settings/nhis', protect, requireAccountsStaff, getHospitalNHISSettings);
router.put('/settings/nhis', protect, requireAdmin, updateHospitalNHISSettings);

export default router;