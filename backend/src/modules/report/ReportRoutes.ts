/**
 * Report Routes
 * Route definitions for report operations
 */

import { Router } from 'express';
import { AuthRequest } from '../../middleware/authMiddleware';
import { reportController } from './ReportController';

export function createReportRoutes(): Router {
  const router = Router();

  // All routes require authentication
  router.use((req: AuthRequest, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    next();
  });

  // Demographic and Clinical Reports
  router.get('/family-planning', (req: AuthRequest, res) => reportController.getFamilyPlanningReport(req, res));
  router.get('/demographic', (req: AuthRequest, res) => reportController.getDemographicReport(req, res));
  router.get('/financial', (req, res) => reportController.getFinancialReport(req, res));
  router.get('/insurance-claims', (req, res) => reportController.getInsuranceClaimsReport(req, res));
  router.get('/clinical', (req, res) => reportController.getClinicalReport(req, res));
  router.get('/morbidity-mortality', (req: AuthRequest, res) => reportController.getMorbidityMortalityReport(req, res));
  
  // Attendance and Revenue Reports
  router.get('/attendance', (req: AuthRequest, res) => reportController.getAttendanceReport(req, res));
  router.get('/revenue', (req: AuthRequest, res) => reportController.getRevenueReport(req, res));
  
  // Clinical Department Reports
  router.get('/lab', (req: AuthRequest, res) => reportController.getLabReport(req, res));
  router.get('/scan', (req: AuthRequest, res) => reportController.getScanReport(req, res));
  router.get('/procedure', (req: AuthRequest, res) => reportController.getProcedureReport(req, res));
  router.get('/medication', (req: AuthRequest, res) => reportController.getMedicationReport(req, res));
  router.get('/vitals', (req: AuthRequest, res) => reportController.getVitalsReport(req, res));
  
  // Export
  router.get('/export', (req: AuthRequest, res) => reportController.exportReport(req, res));

  return router;
}
