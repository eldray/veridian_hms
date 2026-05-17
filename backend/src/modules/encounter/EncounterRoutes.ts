// modules/encounter/EncounterRoutes.ts
import { Router } from 'express';
import { EncounterController } from './EncounterController';
import { protect } from '../../middleware/authMiddleware';

const router = Router();
const controller = new EncounterController();

// ============================================
// ENCOUNTER ROUTES
// ============================================

// Create encounter - controller.create is an array of middleware
router.post('/', protect, controller.create);

// Get all encounters with filters
router.get('/', protect, controller.getAll);

// Get encounter by ID
router.get('/:id', protect, controller.getById);

// Update encounter status - controller.updateStatus is an array
router.put('/:id/status', protect, controller.updateStatus);

// Add diagnosis to encounter - controller.addDiagnosis is an array
router.post('/:id/diagnosis', protect, controller.addDiagnosis);

// Set primary diagnosis - controller.setPrimaryDiagnosis is an array
router.put('/:id/diagnosis/primary', protect, controller.setPrimaryDiagnosis);

// Remove diagnosis from encounter
router.delete('/:id/diagnosis/:diagnosisId', protect, controller.removeDiagnosis);

// Add vitals to encounter - controller.addVitals is an array
router.post('/:id/vitals', protect, controller.addVitals);

// Update vitals - controller.updateVitals is an array
router.put('/vitals/:vitalsId', protect, controller.updateVitals);

// Delete vitals
router.delete('/vitals/:vitalsId', protect, controller.deleteVitals);

// Add prescription to encounter - controller.addPrescription is an array
router.post('/:id/prescriptions', protect, controller.addPrescription);

// Dispense medication - controller.dispenseMedication is an array
router.put('/:encounterId/medications/:medicationId/dispense', protect, controller.dispenseMedication);

// Remove medication from encounter
router.delete('/:encounterId/medications/:medicationId', protect, controller.removeMedication);

// Add lab order to encounter - controller.addLabOrder is an array
router.post('/:id/lab-orders', protect, controller.addLabOrder);

// Update lab order status - controller.updateLabOrderStatus is an array
router.put('/lab-orders/:labOrderId/status', protect, controller.updateLabOrderStatus);

// Remove lab order from encounter
router.delete('/:encounterId/lab-orders/:labOrderId', protect, controller.removeLabOrder);

// Add scan/radiology to encounter - controller.addScan is an array
router.post('/:id/scans', protect, controller.addScan);

// Update scan status - controller.updateScanStatus is an array
router.put('/scans/:scanId/status', protect, controller.updateScanStatus);

// Remove scan from encounter
router.delete('/:encounterId/scans/:scanId', protect, controller.removeScan);

// Add procedure to encounter - controller.addProcedure is an array
router.post('/:id/procedures', protect, controller.addProcedure);

// Update procedure status - controller.updateProcedureStatus is an array
router.put('/procedures/:procedureId/status', protect, controller.updateProcedureStatus);

// Remove procedure from encounter
router.delete('/:encounterId/procedures/:procedureId', protect, controller.removeProcedure);

// Add service to encounter - controller.addService is an array
router.post('/:id/services', protect, controller.addService);

// Remove service from encounter
router.delete('/:encounterId/services/:serviceRenderedId', protect, controller.removeService);

// Delete encounter
router.delete('/:id', protect, controller.delete);

// Get encounter statistics
router.get('/stats', protect, controller.getStats);

// ============================================
// WORKLIST ROUTES (CLINICAL QUEUES)
// ============================================

// Vitals worklist - patients waiting for vitals
router.get('/worklist/vitals', protect, controller.getVitalsWorklist);

// Medical worklist - patients waiting for doctor consultation
router.get('/worklist/medical', protect, controller.getMedicalWorklist);

// Lab worklist - pending lab orders
router.get('/worklist/lab', protect, controller.getLabWorklist);

// Pharmacy worklist - pending prescriptions
router.get('/worklist/pharmacy', protect, controller.getPharmacyWorklist);

export default router;