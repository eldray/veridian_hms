// modules/admission/AdmissionRoutes.ts
import { Router } from 'express';
import {
  getAdmissions,
  createAdmission,
  getAdmissionById,
  addSecondaryDiagnosis,
  removeDiagnosis,
  updatePrimaryDiagnosis,
  dischargePatient,
  addDailyNotes,
  getAdmissionStats,
  getAdmissionsByPatientId,
  deleteAdmission,
  updateAdmission,
} from './AdmissionController';

const router = Router();

// GET all admissions with filtering and pagination
router.get('/', getAdmissions);

// GET admission statistics
router.get('/stats', getAdmissionStats);

// GET admissions by patient ID
router.get('/patient/:patientId', getAdmissionsByPatientId);

// GET admission by ID
router.get('/:id', getAdmissionById);

// CREATE new admission
router.post('/', createAdmission);

// UPDATE admission
router.put('/:id', updateAdmission);

// DELETE admission
router.delete('/:id', deleteAdmission);

// ADD secondary diagnosis to admission
router.post('/:id/diagnoses', addSecondaryDiagnosis);

// REMOVE diagnosis from admission
router.delete('/:id/diagnoses/:diagnosisRecordId', removeDiagnosis);

// UPDATE primary diagnosis
router.put('/:id/primary-diagnosis', updatePrimaryDiagnosis);

// DISCHARGE patient
router.post('/:id/discharge', dischargePatient);

// ADD daily notes
router.post('/:id/notes', addDailyNotes);

export default router;
