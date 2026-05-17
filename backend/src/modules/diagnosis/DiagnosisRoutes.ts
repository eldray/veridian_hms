// modules/diagnosis/DiagnosisRoutes.ts

import { Router } from 'express';
import { DiagnosisController } from './DiagnosisController';
import { protect, requireAdmin, requireClinicalStaff } from '../../middleware/authMiddleware';

const router = Router();
const controller = new DiagnosisController();

// ============================================
// DIAGNOSIS ROUTES
// ============================================

// All routes require authentication
router.use(protect);

// GET /api/diagnoses - Get all diagnoses with filters
router.get('/', requireClinicalStaff, controller.getAll);

// GET /api/diagnoses/search - Search diagnoses
router.get('/search', requireClinicalStaff, controller.search);

// GET /api/diagnoses/stats - Get diagnosis statistics (Admin only)
router.get('/stats', requireAdmin, controller.getStats);

// GET /api/diagnoses/morbidity-groups - Get all morbidity groups
router.get('/morbidity-groups', requireClinicalStaff, controller.getMorbidityGroups);

// GET /api/diagnoses/morbidity-group/:morbidityGroup - Get diagnoses by morbidity group
router.get('/morbidity-group/:morbidityGroup', requireClinicalStaff, controller.getByMorbidityGroup);

// GET /api/diagnoses/:id - Get diagnosis by ID
router.get('/:id', requireClinicalStaff, controller.getById);

// POST /api/diagnoses - Create a new diagnosis (Admin only)
router.post('/', requireAdmin, controller.create);

// PUT /api/diagnoses/:id - Update a diagnosis (Admin only)
router.put('/:id', requireAdmin, controller.update);

// DELETE /api/diagnoses/:id - Delete a diagnosis (Admin only)
router.delete('/:id', requireAdmin, controller.delete);

export default router;
