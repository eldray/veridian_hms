// modules/encounter/EncounterRoutes.ts
import { Router } from 'express';
import { EncounterController } from './EncounterController';
import { protect, requireRole } from '../../middleware/authMiddleware';

// modules/encounter/EncounterRoutes.ts - CORRECT ORDER

const router = Router();
const controller = new EncounterController();

// ============================================
// SPECIFIC ROUTES FIRST (BEFORE dynamic :id routes)
// ============================================

// DAYCASE ROUTES - MUST BE BEFORE /:id
router.get('/daycase', protect, controller.getDaycasePatients);
router.post('/:id/convert-to-ipd', protect, controller.convertDaycaseToIPD);

// WORKLIST ROUTES

// WORKLIST ROUTES - Match frontend expectations
router.get('/worklist/vitals', protect, controller.getVitalsWorklist);
router.get('/worklist/medical', protect, controller.getMedicalWorklist);
router.get('/worklist/lab', protect, controller.getLabWorklist);
router.get('/worklist/pharmacy', protect, controller.getPharmacyWorklist);
router.get('/worklist/scans', protect, controller.getRadiologyWorklist);
router.get('/worklist/procedures', protect, controller.getProceduresWorklist);
router.get('/worklist/maternal', protect, controller.getMaternalWorklist);
router.get('/worklist/summary', protect, controller.getWorklistSummary);

// STATS ROUTE
router.get('/stats', protect, controller.getStats);

// ADMISSION ROUTES
router.get('/admissions', protect, requireRole(['admin', 'doctor', 'records', 'accounts']), controller.getAllAdmissions);
router.post('/:id/admissions', protect, controller.createAdmission);
router.post('/:id/admissions/notes', protect, controller.addDailyNotes);

// DISCHARGE ROUTES
router.post('/:id/discharge', protect, controller.dischargeEncounter);

// BED OCCUPANCY
router.get('/bed-occupancy', protect, controller.getBedOccupancy);

// ============================================
// DETENTION/OBSERVATION ROUTES (NEW)
// ============================================
router.get('/detention', protect, controller.getDetentionPatients);
router.post('/:id/convert-detention-to-ipd', protect, controller.convertDetentionToIPD);

// ============================================
// FORMAL IPD ROUTES (NEW)
// ============================================
router.get('/formal-ipd', protect, controller.getFormalIPDPatients);

// ============================================
// DYNAMIC ID ROUTES (LAST - catches :id parameters)
// ============================================

router.post('/', protect, controller.create);
router.get('/', protect, controller.getAll);
router.get('/:id', protect, controller.getById);
router.put('/:id', protect, controller.update);
router.put('/:id/status', protect, controller.updateStatus);
router.delete('/:id', protect, controller.delete);

// CLINICAL ROUTES (these use :id from the URL parameter)
router.post('/:id/diagnosis', protect, controller.addDiagnosis);
router.put('/:id/diagnosis/primary', protect, controller.setPrimaryDiagnosis);
router.delete('/:id/diagnosis/:diagnosisId', protect, controller.removeDiagnosis);

router.get('/:id/vitals', protect, controller.getVitalsByEncounter); 
router.post('/:id/vitals', protect, controller.addVitals);
router.put('/vitals/:vitalsId', protect, controller.updateVitals);
router.delete('/vitals/:vitalsId', protect, controller.deleteVitals);

router.post('/:id/prescriptions', protect, controller.addPrescription);
router.put('/:encounterId/medications/:medicationId/dispense', protect, controller.dispenseMedication);
router.delete('/:encounterId/medications/:medicationId', protect, controller.removeMedication);

router.post('/:id/lab-tests', protect, controller.addLabTest);
router.put('/lab-tests/:labTestId/status', protect, controller.updateLabTestStatus);
router.delete('/:encounterId/lab-tests/:labTestId', protect, controller.removeLabTest);

router.post('/:id/scans', protect, controller.addScan);
router.put('/scans/:scanId/status', protect, controller.updateScanStatus);
router.delete('/:encounterId/scans/:scanId', protect, controller.removeScan);

router.post('/:id/procedures', protect, controller.addProcedure);
router.put('/procedures/:procedureId/status', protect, controller.updateProcedureStatus);
router.delete('/:encounterId/procedures/:procedureId', protect, controller.removeProcedure);

router.post('/:id/services', protect, controller.addService);
router.delete('/:encounterId/services/:serviceRenderedId', protect, controller.removeService);

export default router;