// backend/src/modules/worklist/WorklistRoutes.ts

import { Router } from 'express';
import { WorklistController } from './WorklistController';
import { authenticate, authorize } from '../../middleware/authMiddleware';

const router = Router();
const controller = new WorklistController();

// Routes
router.get('/:type', authenticate, authorize(['ADMIN', 'DOCTOR', 'NURSE', 'STAFF']), (req, res) => 
  controller.getWorklist(req, res)
);

router.get('/summary', authenticate, authorize(['ADMIN', 'DOCTOR', 'NURSE', 'STAFF']), (req, res) => 
  controller.getWorklistSummary(req, res)
);

router.get('/stats', authenticate, authorize(['ADMIN', 'DOCTOR', 'NURSE', 'STAFF']), (req, res) => 
  controller.getWorklistStats(req, res)
);

export default router;
