// modules/encounter/EncounterRoutes.ts
import { Router } from 'express';
import { EncounterController } from './EncounterController';
import { authenticate } from '../../middleware/authMiddleware';

const router = Router();
const controller = new EncounterController();

// ============================================
// ENCOUNTER ROUTES
// ============================================

// Create encounter
router.post('/', authenticate, ...controller.create);

// Get all encounters with filters
router.get('/', authenticate, controller.getAll);

// Get encounter by ID
router.get('/:id', authenticate, controller.getById);

// Update encounter status
router.put('/:id/status', authenticate, ...controller.updateStatus);

// Add diagnosis to encounter
router.post('/:id/diagnosis', authenticate, ...controller.addDiagnosis);

// Set primary diagnosis
router.put('/:id/diagnosis/primary', authenticate, ...controller.setPrimaryDiagnosis);

// Remove diagnosis from encounter
router.delete('/:id/diagnosis/:diagnosisId', authenticate, controller.removeDiagnosis);

// Add vitals to encounter
router.post('/:id/vitals', authenticate, ...controller.addVitals);

// Update vitals
router.put('/vitals/:vitalsId', authenticate, ...controller.updateVitals);

// Delete vitals
router.delete('/vitals/:vitalsId', authenticate, controller.deleteVitals);

// Add prescription to encounter
router.post('/:id/prescriptions', authenticate, ...controller.addPrescription);

// Dispense medication
router.put('/:encounterId/medications/:medicationId/dispense', authenticate, ...controller.dispenseMedication);

// Remove medication from encounter
router.delete('/:encounterId/medications/:medicationId', authenticate, controller.removeMedication);

// Add lab order to encounter
router.post('/:id/lab-orders', authenticate, ...controller.addLabOrder);

// Update lab order status
router.put('/lab-orders/:labOrderId/status', authenticate, ...controller.updateLabOrderStatus);

// Remove lab order from encounter
router.delete('/:encounterId/lab-orders/:labOrderId', authenticate, controller.removeLabOrder);

// Add scan/radiology to encounter
router.post('/:id/scans', authenticate, ...controller.addScan);

// Update scan status
router.put('/scans/:scanId/status', authenticate, ...controller.updateScanStatus);

// Remove scan from encounter
router.delete('/:encounterId/scans/:scanId', authenticate, controller.removeScan);

// Add procedure to encounter
router.post('/:id/procedures', authenticate, ...controller.addProcedure);

// Update procedure status
router.put('/procedures/:procedureId/status', authenticate, ...controller.updateProcedureStatus);

// Remove procedure from encounter
router.delete('/:encounterId/procedures/:procedureId', authenticate, controller.removeProcedure);

// Add service to encounter
router.post('/:id/services', authenticate, ...controller.addService);

// Remove service from encounter
router.delete('/:encounterId/services/:serviceRenderedId', authenticate, controller.removeService);

// Delete encounter
router.delete('/:id', authenticate, controller.delete);

// Get encounter statistics
router.get('/stats', authenticate, controller.getStats);

// ============================================
// WORKLIST ROUTES (CLINICAL QUEUES)
// ============================================

// Vitals worklist - patients waiting for vitals
router.get('/worklist/vitals', authenticate, controller.getVitalsWorklist);

// Medical worklist - patients waiting for doctor consultation
router.get('/worklist/medical', authenticate, controller.getMedicalWorklist);

// Lab worklist - pending lab orders
router.get('/worklist/lab', authenticate, controller.getLabWorklist);

// Pharmacy worklist - pending prescriptions
router.get('/worklist/pharmacy', authenticate, controller.getPharmacyWorklist);

export default router;
