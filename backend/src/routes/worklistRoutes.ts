import { Router } from 'express';
import {
  getVitalsWorklist,
  getMedicalWorklist,
  getLabWorklist,
  getPharmacyWorklist,
  getScanWorklist,
  getTheatreWorklist
} from '../controllers/worklistController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All worklist routes require authentication
router.use(authenticate);

// Department-specific worklist endpoints
router.get('/vitals', getVitalsWorklist);
router.get('/medical', getMedicalWorklist);
router.get('/lab', getLabWorklist);
router.get('/pharmacy', getPharmacyWorklist);
router.get('/scans', getScanWorklist);
router.get('/theatre', getTheatreWorklist);

export default router;
