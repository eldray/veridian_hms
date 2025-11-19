// routes/uploadRoutes.ts
import { Router } from 'express';
import {
  servePatientImages,
  serveScanImages,
  serveDocuments
} from '../middleware/uploadMiddleware';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// Serve static files with authentication
router.use('/patients', protect, servePatientImages);
router.use('/scans', protect, serveScanImages);
router.use('/documents', protect, serveDocuments);

export default router;