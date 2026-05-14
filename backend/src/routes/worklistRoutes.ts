// backend/src/routes/worklistRoutes.ts
import { Router } from 'express';
import {
  getVitalsWorklist,
  getMedicalWorklist,
  getLabWorklist,
  getPharmacyWorklist,
  getScanWorklist,
  getTheatreWorklist
} from '../controllers/worklistController';
import { protect } from '../middleware/authMiddleware';  // ✅ Changed from 'authenticate' to 'protect'

const router = Router();

// All worklist routes require authentication
router.use(protect);  // ✅ Changed from 'authenticate' to 'protect'

// Department-specific worklist endpoints
router.get('/vitals', getVitalsWorklist);
router.get('/medical', getMedicalWorklist);
router.get('/lab', getLabWorklist);
router.get('/pharmacy', getPharmacyWorklist);
router.get('/scans', getScanWorklist);
router.get('/theatre', getTheatreWorklist);

export default router;