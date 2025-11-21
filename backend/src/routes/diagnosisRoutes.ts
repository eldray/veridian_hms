import { Router } from 'express';
import {
  getDiagnoses,
  getDiagnosisById,
  createDiagnosis,
  updateDiagnosis,
  deleteDiagnosis,
  getDiagnosisStats,
  searchDiagnoses,
  getDiagnosisCategories,
} from '../controllers/diagnosisController';
import {
  protect,
  requireAdmin,
  requireClinicalStaff
} from '../middleware/authMiddleware';

const router = Router();

// All routes require authentication
router.use(protect);

// Get all diagnoses - accessible by clinical staff and admin
router.get('/', requireClinicalStaff, getDiagnoses);

// Search diagnoses - accessible by clinical staff and admin
router.get('/search', requireClinicalStaff, searchDiagnoses);

// Get diagnosis statistics - admin only
router.get('/stats', requireAdmin, getDiagnosisStats);

// Get diagnosis categories - accessible by clinical staff and admin
router.get('/categories', requireClinicalStaff, getDiagnosisCategories);

// Get diagnosis by ID - accessible by clinical staff and admin
router.get('/:id', requireClinicalStaff, getDiagnosisById);

// Create diagnosis - admin only
router.post('/', requireAdmin, createDiagnosis);

// Update diagnosis - admin only
router.put('/:id', requireAdmin, updateDiagnosis);

// Delete diagnosis - admin only
router.delete('/:id', requireAdmin, deleteDiagnosis);

export default router;