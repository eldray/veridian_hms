// backend/src/modules/encounter/EncounterRouter.ts
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { EncounterController } from './EncounterController';
import { protect, requireRole } from '../../middleware/authMiddleware';
import { uploadScanImages, handleUploadError } from '../../middleware/uploadMiddleware';

export function createEncounterRoutes(prisma: PrismaClient): Router {
  const router = Router();

  const controller = new EncounterController(prisma);

  // Global authentication
  router.use(protect);

  // ============================================
  // SPECIFIC ROUTES FIRST (BEFORE dynamic :id routes)
  // ============================================

  // DAYCASE
  router.get('/daycase', controller.getDaycasePatients);
  router.post('/:id/convert-to-ipd', requireRole(['admin', 'super_admin', 'doctor']), controller.convertDaycaseToIPD);

  // WORKLISTS (read-only — any authenticated staff)
  router.get('/vitals/latest', controller.getLatestVitals);
  router.get('/worklist/vitals', controller.getVitalsWorklist);
  router.get('/worklist/medical', controller.getMedicalWorklist);
  router.get('/worklist/lab', controller.getLabWorklist);
  router.get('/worklist/pharmacy', controller.getPharmacyWorklist);
  router.get('/worklist/scans', controller.getRadiologyWorklist);
  router.get('/worklist/procedures', controller.getProceduresWorklist);
  router.get('/worklist/maternal', controller.getMaternalWorklist);
  router.get('/worklist/summary', controller.getWorklistSummary);

  // STATS
  router.get('/stats', controller.getStats);

  // ADMISSIONS
  router.get(
    '/admissions',
    requireRole(['admin', 'super_admin', 'doctor', 'nurse', 'midwife', 'records', 'accounts']),
    controller.getAllAdmissions,
  );
  router.post(
    '/admissions',
    requireRole(['admin', 'super_admin', 'doctor', 'nurse', 'midwife']),
    controller.createAdmission,
  );

  const admissionReaders = requireRole(['admin', 'super_admin', 'doctor', 'nurse', 'midwife', 'records', 'accounts']);
  router.get('/admissions/patient/:patientId', admissionReaders, controller.getAdmissionsByPatient);
  router.get('/admissions/:id', admissionReaders, controller.getAdmissionById);
  router.put('/admissions/:id', requireRole(['admin', 'super_admin', 'doctor']), controller.updateAdmission);
  router.delete('/admissions/:id', requireRole(['admin', 'super_admin']), controller.deleteAdmission);
  router.post(
    '/admissions/:id/notes',
    requireRole(['admin', 'super_admin', 'doctor', 'nurse', 'midwife']),
    controller.addDailyNotes,
  );

  // Older daily-notes path kept for backward compatibility
  router.post(
    '/:id/admissions/notes',
    requireRole(['admin', 'super_admin', 'doctor', 'nurse', 'midwife']),
    controller.addDailyNotes,
  );

  // TERMINAL TRANSITIONS (discharge / refer / abscond / complete)
  router.post('/:id/discharge', requireRole(['admin', 'super_admin', 'doctor', 'nurse', 'midwife']), controller.dischargeEncounter);
  router.post('/:id/refer', requireRole(['admin', 'super_admin', 'doctor']), controller.referEncounter);
  router.post('/:id/abscond', requireRole(['admin', 'super_admin', 'doctor', 'nurse', 'midwife']), controller.abscondEncounter);
  router.post('/:id/complete', requireRole(['admin', 'super_admin', 'doctor', 'nurse', 'midwife']), controller.completeEncounter);

  // BED OCCUPANCY
  router.get('/bed-occupancy', controller.getBedOccupancy);

  // DETENTION / OBSERVATION
  router.get('/detention', controller.getDetentionPatients);
  router.post('/:id/convert-detention-to-ipd', requireRole(['admin', 'super_admin', 'doctor']), controller.convertDetentionToIPD);

  // FORMAL IPD
  router.get('/formal-ipd', controller.getFormalIPDPatients);

  // ============================================
  // DYNAMIC ID ROUTES (LAST)
  // ============================================

  router.post('/', requireRole(['admin', 'super_admin', 'records', 'doctor', 'nurse', 'midwife']), controller.create);
  router.get('/', controller.getAll);
  router.get('/:id', controller.getById);
  router.post('/:id/finalize-clinical', requireRole(['admin', 'super_admin', 'doctor', 'nurse', 'midwife']), controller.finalizeClinicalRecord);
  router.put('/:id', requireRole(['admin', 'super_admin', 'doctor', 'nurse', 'midwife']), controller.update);
  router.put('/:id/status', requireRole(['admin', 'super_admin', 'doctor']), controller.updateStatus);
  router.delete('/:id', requireRole(['admin', 'super_admin']), controller.delete);

  // ============================================
  // CLINICAL SUB-ROUTES
  // ============================================
  // Reads: any authenticated. Writes: the clinicians who actually produce these records.

  // DIAGNOSIS
  router.post('/:id/diagnosis', requireRole(['admin', 'super_admin', 'doctor']), controller.addDiagnosis);
  router.put('/:id/diagnosis/primary', requireRole(['admin', 'super_admin', 'doctor']), controller.setPrimaryDiagnosis);
  router.delete('/:id/diagnosis/:diagnosisId', requireRole(['admin', 'super_admin', 'doctor']), controller.removeDiagnosis);

  // VITALS
  router.get('/:id/vitals', controller.getVitalsByEncounter);
  router.post('/:id/vitals', requireRole(['admin', 'super_admin', 'doctor', 'nurse', 'midwife']), controller.addVitals);
  router.put('/vitals/:vitalsId', requireRole(['admin', 'super_admin', 'doctor', 'nurse', 'midwife']), controller.updateVitals);
  router.delete('/vitals/:vitalsId', requireRole(['admin', 'super_admin', 'doctor', 'nurse', 'midwife']), controller.deleteVitals);

  // PRESCRIPTIONS + DISPENSING
  router.post('/:id/prescriptions', requireRole(['admin', 'super_admin', 'doctor']), controller.addPrescription);
  router.put(
    '/:encounterId/medications/:medicationId/dispense',
    requireRole(['admin', 'super_admin', 'pharmacist']),
    controller.dispenseMedication,
  );
  router.patch(
    '/:encounterId/medications/:medicationId',
    requireRole(['admin', 'super_admin', 'pharmacist', 'doctor', 'nurse']),
    controller.updateMedication,
  );
  router.delete(
    '/:encounterId/medications/:medicationId',
    requireRole(['admin', 'super_admin', 'doctor', 'pharmacist']),
    controller.removeMedication,
  );

  // LAB
  router.post('/:id/lab-tests', requireRole(['admin', 'super_admin', 'doctor']), controller.addLabTest);
  router.put('/lab-tests/:labTestId/status', requireRole(['admin', 'super_admin', 'lab_tech']), controller.updateLabTestStatus);
  router.delete('/:encounterId/lab-tests/:labTestId', requireRole(['admin', 'super_admin', 'doctor', 'lab_tech']), controller.removeLabTest);

  // SCANS
  router.post('/:id/scans', requireRole(['admin', 'super_admin', 'doctor']), controller.addScan);
  router.post('/scans/:scanId/upload-images', requireRole(['admin', 'super_admin', 'sonographer', 'doctor']), uploadScanImages, handleUploadError, controller.uploadScanImages);
  router.put('/scans/:scanId/status', requireRole(['admin', 'super_admin', 'sonographer']), controller.updateScanStatus);
  router.delete('/:encounterId/scans/:scanId', requireRole(['admin', 'super_admin', 'doctor', 'sonographer']), controller.removeScan);

  // PROCEDURES
  router.post('/:id/procedures', requireRole(['admin', 'super_admin', 'doctor']), controller.addProcedure);
  router.put('/procedures/:procedureId/status', requireRole(['admin', 'super_admin', 'doctor']), controller.updateProcedureStatus);
  router.delete('/:encounterId/procedures/:procedureId', requireRole(['admin', 'super_admin', 'doctor']), controller.removeProcedure);

  // SERVICES RENDERED
  router.post('/:id/services', requireRole(['admin', 'super_admin', 'doctor', 'nurse', 'midwife']), controller.addService);
  router.delete('/:encounterId/services/:serviceRenderedId', requireRole(['admin', 'super_admin', 'doctor', 'nurse']), controller.removeService);

  // CONSUMABLES
  router.get('/:id/consumables', controller.getConsumableUses);
  router.post('/:id/consumables', requireRole(['admin', 'super_admin', 'doctor', 'nurse', 'midwife', 'pharmacist']), controller.recordConsumableUse);
  router.patch('/:id/consumables/:transactionId', requireRole(['admin', 'super_admin', 'doctor', 'nurse', 'midwife', 'pharmacist']), controller.updateConsumableUse);
  router.delete('/:id/consumables/:transactionId', requireRole(['admin', 'super_admin', 'doctor', 'nurse', 'midwife', 'pharmacist']), controller.deleteConsumableUse);

  return router;
}