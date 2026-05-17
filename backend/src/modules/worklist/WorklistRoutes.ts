// backend/src/modules/worklist/WorklistRoutes.ts

import { Router } from 'express';
import { WorklistController } from './WorklistController';
import { protect } from '../../middleware/authMiddleware';

const router = Router();
const controller = new WorklistController();

// Routes - accessible to all authenticated users
router.get('/:type', protect, (req, res) => 
  controller.getWorklist(req, res)
);

router.get('/summary', protect, (req, res) => 
  controller.getWorklistSummary(req, res)
);

router.get('/stats', protect, (req, res) => 
  controller.getWorklistStats(req, res)
);

export default router;