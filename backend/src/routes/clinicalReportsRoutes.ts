// routes/clinicalReportsRoutes.ts
import { Router } from 'express';
import { protect } from '../middleware/authMiddleware';
import {
  generateLabReport,
  generateScanReport,
  generateProcedureReport,
  generateMedicationReport,
  generateVitalsReport
} from '../controllers/clinicalReportsController';

const router = Router();
router.use(protect);

router.get('/lab', generateLabReport);
router.get('/scans', generateScanReport);
router.get('/procedures', generateProcedureReport);
router.get('/medications', generateMedicationReport);
router.get('/vitals', generateVitalsReport);

export default router;