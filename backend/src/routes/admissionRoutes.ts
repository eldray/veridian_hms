// routes/admissionRoutes.ts - CORRECTED VERSION
import express from 'express';
import {
  getAdmissions,
  getAdmissionById,
  createAdmission,
  updateAdmission,
  deleteAdmission,
  updateAdmissionWithNHISData,
  dischargePatient,
  addDailyNotes, // ✅ ADDED
  getAdmissionStats,
  getAdmissionsByPatientId
} from '../controllers/admissionController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// All routes are protected
router.use(protect);

// GET /api/admissions - Get all admissions (optional query: ?status=admitted)
router.get('/', getAdmissions);

// ✅ Add to admissionRoutes.ts
router.get('/patient/:patientId', getAdmissionsByPatientId);

// GET /api/admissions/stats - Get admission statistics
router.get('/stats', getAdmissionStats); // ✅ ADDED

// GET /api/admissions/:id - Get admission by ID
router.get('/:id', getAdmissionById);

// POST /api/admissions - Create new admission
router.post('/', createAdmission);

// PUT /api/admissions/:id - Update admission
router.put('/:id', updateAdmission);

// DELETE /api/admissions/:id - Delete admission
router.delete('/:id', deleteAdmission);

// PATCH /api/admissions/:id/nhis - Update admission with NHIS IPD data
router.patch('/:id/nhis', updateAdmissionWithNHISData);

// POST /api/admissions/:id/discharge - Discharge patient
router.post('/:id/discharge', dischargePatient);

// POST /api/admissions/:id/daily-notes - Add daily notes to admission
router.post('/:id/daily-notes', addDailyNotes); // ✅ ADDED

export default router;