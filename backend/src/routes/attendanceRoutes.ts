// routes/attendanceRoutes.ts - CORRECTED VERSION
import express from 'express';
import * as attendanceController from '../controllers/attendanceController';
import { uploadScanImages } from '../controllers/attendanceController';
import {
  protect,
  requireAdmin,
  requireDoctor,
  requireMedicalStaff,
  requireClinicalStaff,
  requireLabStaff,
  requirePharmacyStaff,
  requireRadiologyStaff,
  requireRecordsStaff,
  requireAccountsStaff
} from '../middleware/authMiddleware';

const router = express.Router();

// ✅ All routes require authentication
router.use(protect);

// ==========================================
// ATTENDANCE CRUD OPERATIONS
// ==========================================

router.get('/', requireMedicalStaff, attendanceController.getAttendances);
router.get('/stats', requireMedicalStaff, attendanceController.getAttendanceStats);
router.get('/:id', requireMedicalStaff, attendanceController.getAttendanceById);
router.post('/', requireRecordsStaff, attendanceController.createAttendance);
router.put('/:id', requireMedicalStaff, attendanceController.updateAttendance);
router.patch('/:id/status', requireMedicalStaff, attendanceController.updateAttendanceStatus);
router.delete('/:id', requireAdmin, attendanceController.deleteAttendance);

// ==========================================
// DIAGNOSES
// ==========================================
router.post('/:id/diagnoses', requireDoctor, attendanceController.addDiagnosisToAttendance);
router.delete('/:id/diagnoses/:diagnosisId', requireDoctor, attendanceController.removeDiagnosisFromAttendance);

// ==========================================
// LAB TESTS
// ==========================================
router.post('/:id/lab-tests', requireMedicalStaff, attendanceController.addLabTestToAttendance);
router.patch('/:id/lab-tests/:labTestId', requireLabStaff, attendanceController.updateLabTestStatus);
router.delete('/:id/lab-tests/:labTestId', requireDoctor, attendanceController.removeLabTestFromAttendance);

// ==========================================
// PROCEDURES
// ==========================================
router.post('/:id/procedures', requireDoctor, attendanceController.addProcedureToAttendance);
router.patch('/:id/procedures/:procedureId', requireMedicalStaff, attendanceController.updateProcedureStatus);
router.delete('/:id/procedures/:procedureId', requireDoctor, attendanceController.removeProcedureFromAttendance);

// ==========================================
// MEDICATIONS
// ==========================================
router.post('/:id/medications', requireDoctor, attendanceController.addMedicationToAttendance);
router.patch('/:id/medications/:medicationId', requireClinicalStaff, attendanceController.updateMedicationStatus);
router.delete('/:id/medications/:medicationId', requireDoctor, attendanceController.removeMedicationFromAttendance);
router.post('/:id/medications/:medicationId/dispense', 
  requirePharmacyStaff, 
  attendanceController.dispenseMedication
);
// ==========================================
// SCANS
// ==========================================

// Add this route (before the :id route)
router.post('/scans/:scanId/upload-images', protect, uploadScanImages);
router.post('/:id/scans', requireDoctor, attendanceController.addScanToAttendance);
router.patch('/:id/scans/:scanId', requireRadiologyStaff, attendanceController.updateScanStatus);
router.delete('/:id/scans/:scanId', requireDoctor, attendanceController.removeScanFromAttendance);

// ==========================================
// VITALS
// ==========================================
router.post('/:id/vitals', requireMedicalStaff, attendanceController.addVitalsToAttendance);
router.get('/:id/vitals', requireMedicalStaff, attendanceController.getVitalsByAttendance);
router.put('/:id/vitals/:vitalsId', requireMedicalStaff, attendanceController.updateVitals);
router.delete('/:id/vitals/:vitalsId', requireMedicalStaff, attendanceController.deleteVitals);

// ==========================================
// SERVICES & BILLING
// ==========================================
router.post('/:id/services', requireMedicalStaff, attendanceController.addServiceToAttendance);
router.delete('/:id/services/:serviceId', requireAccountsStaff, attendanceController.removeServiceFromAttendance);
router.post('/:id/calculate-bill', requireAccountsStaff, attendanceController.calculateAttendanceBill);
router.get('/:id/billing-breakdown', requireAccountsStaff, attendanceController.getBillingBreakdown); // ✅ ADDED

// ==========================================
// NHIS CLAIM MANAGEMENT
// ==========================================
router.get('/:attendanceId/nhis/validate', requireClinicalStaff, attendanceController.validateNHISClaim);

export default router;
