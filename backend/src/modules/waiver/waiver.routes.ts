import { Router } from 'express';
import { waiverController } from './waiver.controller';

const router = Router();

// Waiver CRUD routes
router.post('/', waiverController.create.bind(waiverController));
router.get('/', waiverController.getAll.bind(waiverController));
router.get('/statistics', waiverController.getStatistics.bind(waiverController));
router.get('/bill/:billId', waiverController.getByBill.bind(waiverController));
router.get('/patient/:patientId', waiverController.getByPatient.bind(waiverController));
router.get('/:id', waiverController.getById.bind(waiverController));
router.put('/:id', waiverController.update.bind(waiverController));
router.delete('/:id', waiverController.delete.bind(waiverController));

// Approval routes
router.post('/:id/approve', waiverController.approve.bind(waiverController));
router.post('/:id/reject', waiverController.reject.bind(waiverController));

export default router;