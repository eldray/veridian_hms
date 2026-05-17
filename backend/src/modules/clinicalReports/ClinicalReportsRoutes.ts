/**
 * Clinical Reports Routes
 * Route definitions for clinical report operations
 */

import { Router } from 'express';
import { AuthRequest } from '../../middleware/authMiddleware';
import { clinicalReportsController } from './ClinicalReportsController';

export function createClinicalReportsRoutes(): Router {
  const router = Router();

  // All routes require authentication
  router.use((req: AuthRequest, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    next();
  });

  // Report generation routes
  router.get('/lab', (req: AuthRequest, res) => clinicalReportsController.generateLabReport(req, res));
  router.get('/scan', (req: AuthRequest, res) => clinicalReportsController.generateScanReport(req, res));
  router.get('/procedure', (req: AuthRequest, res) => clinicalReportsController.generateProcedureReport(req, res));
  router.get('/medication', (req: AuthRequest, res) => clinicalReportsController.generateMedicationReport(req, res));
  router.get('/vitals', (req: AuthRequest, res) => clinicalReportsController.generateVitalsReport(req, res));

  return router;
}
