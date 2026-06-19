import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { EncounterController } from './EncounterController';
import { protect, requireRole } from '../../middleware/authMiddleware';

export function createEncounterRoutes(prisma: PrismaClient): Router {
  const router = Router();
  
  // ✅ FIXED: Pass prisma to the controller constructor
  const controller = new EncounterController(prisma);

  // Global Authentication
  router.use(protect);

  // ============================================
  // SPECIFIC ROUTES FIRST (BEFORE dynamic :id routes)
  // ============================================

  // DAYCASE ROUTES
  router.get('/daycase', controller.getDaycasePatients);
  router.post('/:id/convert-to-ipd', controller.convertDaycaseToIPD);

  // WORKLIST ROUTES
  router.get('/worklist/vitals', controller.getVitalsWorklist);
  router.get('/worklist/medical', controller.getMedicalWorklist);
  router.get('/worklist/lab', controller.getLabWorklist);
  router.get('/worklist/pharmacy', controller.getPharmacyWorklist);
  router.get('/worklist/scans', controller.getRadiologyWorklist);
  router.get('/worklist/procedures', controller.getProceduresWorklist);
  router.get('/worklist/maternal', controller.getMaternalWorklist);
  router.get('/worklist/summary', controller.getWorklistSummary);

  // STATS ROUTE
  router.get('/stats', controller.getStats);

  // ADMISSION ROUTES
  router.get('/admissions', requireRole(['admin', 'doctor', 'records', 'accounts']), controller.getAllAdmissions);
  router.post('/admissions', controller.createAdmission); 
  
  // ✅ FIXED: Added missing route for daily notes
  router.post('/:id/admissions/notes', controller.addDailyNotes);

  // DISCHARGE ROUTES
  router.post('/:id/discharge', controller.dischargeEncounter);

  // BED OCCUPANCY
  router.get('/bed-occupancy', controller.getBedOccupancy);

  // DETENTION/OBSERVATION ROUTES
  router.get('/detention', controller.getDetentionPatients);
  router.post('/:id/convert-detention-to-ipd', controller.convertDetentionToIPD);

  // FORMAL IPD ROUTES
  router.get('/formal-ipd', controller.getFormalIPDPatients);

  // ============================================
  // DYNAMIC ID ROUTES (LAST)
  // ============================================

  router.post('/', controller.create);
  router.get('/', controller.getAll);
  router.get('/:id', controller.getById);
  router.put('/:id', controller.update);
  router.put('/:id/status', controller.updateStatus);
  router.delete('/:id', controller.delete);

  // CLINICAL ROUTES
  router.post('/:id/diagnosis', controller.addDiagnosis);
  router.put('/:id/diagnosis/primary', controller.setPrimaryDiagnosis);
  router.delete('/:id/diagnosis/:diagnosisId', controller.removeDiagnosis);

  router.get('/:id/vitals', controller.getVitalsByEncounter); 
  router.post('/:id/vitals', controller.addVitals);
  router.put('/vitals/:vitalsId', controller.updateVitals);
  router.delete('/vitals/:vitalsId', controller.deleteVitals);

  router.post('/:id/prescriptions', controller.addPrescription);
  router.put('/:encounterId/medications/:medicationId/dispense', controller.dispenseMedication);
  router.patch('/:encounterId/medications/:medicationId', controller.updateMedication);
  router.delete('/:encounterId/medications/:medicationId', controller.removeMedication);

  router.post('/:id/lab-tests', controller.addLabTest);
  router.put('/lab-tests/:labTestId/status', controller.updateLabTestStatus);
  router.delete('/:encounterId/lab-tests/:labTestId', controller.removeLabTest);

  router.post('/:id/scans', controller.addScan);
  router.put('/scans/:scanId/status', controller.updateScanStatus);
  router.delete('/:encounterId/scans/:scanId', controller.removeScan);

  router.post('/:id/procedures', controller.addProcedure);
  router.put('/procedures/:procedureId/status', controller.updateProcedureStatus);
  router.delete('/:encounterId/procedures/:procedureId', controller.removeProcedure);

  router.post('/:id/services', controller.addService);
  router.delete('/:encounterId/services/:serviceRenderedId', controller.removeService);

  return router;
}