// routes/attendanceRoutes.ts - OPTIMIZED VERSION
import express from 'express';
import {
  // CRUD Operations
  getAttendances,
  getAttendanceById,
  createAttendance,
  updateAttendance,
  deleteAttendance,
  getAttendanceStats,
  
  // Diagnosis Operations
  addDiagnosisToAttendance,
  removeDiagnosisFromAttendance,
  
  // Lab Test Operations  
  addLabTestToAttendance,
  updateLabTestStatus,
  removeLabTestFromAttendance,
  
  // Procedure Operations
  addProcedureToAttendance,
  updateProcedureStatus,
  removeProcedureFromAttendance,
  
  // Medication Operations
  addMedicationToAttendance,
  updateMedicationStatus,
  removeMedicationFromAttendance,
  
  // Scan Operations
  addScanToAttendance,
  updateScanStatus,
  removeScanFromAttendance,
  
  // Vitals Operations
  addVitalsToAttendance,
  getVitalsByAttendance,
  
  // Progress Notes Operations
  addProgressNoteToAttendance,
  removeProgressNoteFromAttendance,
  
  // Status Operations
  updateAttendanceStatus,
  
  // Billing Operations
  calculateAttendanceBill,
  // generateBillFromAttendance // REMOVED - doesn't exist in controller
} from '../controllers/attendanceController';
import { protect, requireRole } from '../middleware/authMiddleware';

const router = express.Router();

// ===== CRUD OPERATIONS =====
router.route('/')
  .get(protect, requireRole(['admin', 'doctor', 'nurse', 'midwife']), getAttendances)
  .post(protect, requireRole(['admin', 'doctor', 'nurse', 'midwife']), createAttendance);

router.get('/stats', protect, requireRole(['admin', 'doctor', 'nurse']), getAttendanceStats);

router.route('/:id')
  .get(protect, requireRole(['admin', 'doctor', 'nurse', 'midwife']), getAttendanceById)
  .put(protect, requireRole(['admin', 'doctor', 'nurse']), updateAttendance)
  .delete(protect, requireRole(['admin']), deleteAttendance);

// ===== STATUS OPERATIONS =====
router.patch('/:id/status', protect, requireRole(['admin', 'doctor']), updateAttendanceStatus);

// ===== DIAGNOSIS OPERATIONS =====
router.route('/:id/diagnoses')
  .post(protect, requireRole(['admin', 'doctor']), addDiagnosisToAttendance);

router.route('/:id/diagnoses/:diagnosisId')
  .delete(protect, requireRole(['admin', 'doctor']), removeDiagnosisFromAttendance);

// ===== LAB TEST OPERATIONS =====
router.route('/:id/lab-tests')
  .post(protect, requireRole(['admin', 'doctor', 'nurse']), addLabTestToAttendance);

router.route('/:id/lab-tests/:labTestId')
  .put(protect, requireRole(['admin', 'doctor', 'lab_tech']), updateLabTestStatus)
  .delete(protect, requireRole(['admin', 'doctor']), removeLabTestFromAttendance);

// ===== PROCEDURE OPERATIONS =====
router.route('/:id/procedures')
  .post(protect, requireRole(['admin', 'doctor']), addProcedureToAttendance);

router.route('/:id/procedures/:procedureId')
  .put(protect, requireRole(['admin', 'doctor']), updateProcedureStatus)
  .delete(protect, requireRole(['admin', 'doctor']), removeProcedureFromAttendance);

// ===== MEDICATION OPERATIONS =====
router.route('/:id/medications')
  .post(protect, requireRole(['admin', 'doctor']), addMedicationToAttendance);

router.route('/:id/medications/:medicationId')
  .put(protect, requireRole(['admin', 'doctor', 'pharmacist']), updateMedicationStatus)
  .delete(protect, requireRole(['admin', 'doctor']), removeMedicationFromAttendance);

// ===== SCAN OPERATIONS =====
router.route('/:id/scans')
  .post(protect, requireRole(['admin', 'doctor']), addScanToAttendance);

router.route('/:id/scans/:scanId')
  .put(protect, requireRole(['admin', 'doctor', 'lab_tech']), updateScanStatus)
  .delete(protect, requireRole(['admin', 'doctor']), removeScanFromAttendance);

// ===== VITALS OPERATIONS =====
router.route('/:id/vitals')
  .get(protect, requireRole(['admin', 'doctor', 'nurse']), getVitalsByAttendance)
  .post(protect, requireRole(['admin', 'doctor', 'nurse']), addVitalsToAttendance);

// ===== PROGRESS NOTES OPERATIONS =====
router.route('/:id/progress-notes')
  .post(protect, requireRole(['admin', 'doctor', 'nurse']), addProgressNoteToAttendance);

router.route('/:id/progress-notes/:noteId')
  .delete(protect, requireRole(['admin', 'doctor', 'nurse']), removeProgressNoteFromAttendance);

// ===== BILLING OPERATIONS =====
router.post('/:id/calculate-bill', protect, requireRole(['admin', 'accounts']), calculateAttendanceBill);
// router.post('/:id/generate-bill', protect, requireRole(['admin', 'accounts', 'doctor']), generateBillFromAttendance); // REMOVED

export default router;
