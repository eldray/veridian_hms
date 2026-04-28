// routes/diagnosisRoutes.ts - ADD THIS ROUTE
import { Router } from 'express';
import {
  getDiagnoses,
  getDiagnosisById,
  createDiagnosis,
  updateDiagnosis,
  deleteDiagnosis,
  getDiagnosisStats,
  searchDiagnoses,
  getMorbidityGroups,
  getDiagnosesByMorbidityGroup,
} from '../controllers/diagnosisController';
import {
  protect,
  requireAdmin,
  requireClinicalStaff
} from '../middleware/authMiddleware';

const router = Router();

router.use(protect);

router.get('/', requireClinicalStaff, getDiagnoses);
router.get('/search', requireClinicalStaff, searchDiagnoses);
router.get('/stats', requireAdmin, getDiagnosisStats);
router.get('/morbidity-groups', requireClinicalStaff, getMorbidityGroups);
router.get('/morbidity-group/:morbidityGroup', requireClinicalStaff, getDiagnosesByMorbidityGroup);
router.get('/:id', requireClinicalStaff, getDiagnosisById);
router.post('/', requireAdmin, createDiagnosis);
router.put('/:id', requireAdmin, updateDiagnosis);
router.delete('/:id', requireAdmin, deleteDiagnosis);

export default router;