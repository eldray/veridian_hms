// modules/report/ReportRoutes.ts
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { protect, requireRole } from '../../middleware/authMiddleware';
import { ReportController } from './ReportController';

export function createReportRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const controller = new ReportController(prisma);

  router.use(protect);

  router.get('/financial', requireRole(['admin', 'accounts']), (req, res) => controller.getFinancialReport(req, res));
  router.get('/clinical', requireRole(['admin', 'doctor', 'nurse', 'midwife', 'lab_tech', 'sonographer']), (req, res) => controller.getClinicalReport(req, res));
  router.get('/revenue', requireRole(['admin', 'accounts']), (req, res) => controller.getRevenueReport(req, res));
  router.get('/insurance-claims', requireRole(['admin', 'accounts']), (req, res) => controller.getInsuranceClaimsReport(req, res));
  router.get('/attendance', requireRole(['admin', 'doctor', 'nurse', 'midwife', 'records']), (req, res) => controller.getAttendanceReport(req, res));
  router.get('/demographic', requireRole(['admin', 'doctor', 'nurse', 'midwife', 'records', 'accounts']), (req, res) => controller.getDemographicReport(req, res));
  router.get('/export', requireRole(['admin', 'accounts', 'records']), (req, res) => controller.exportReport(req, res));

  router.get('/nhis-expiry', requireRole(['admin', 'accounts']), (req, res) => controller.getNhisExpiryReport(req, res));
  router.get('/nhis-claims-summary', requireRole(['admin', 'accounts']), (req, res) => controller.getNhisClaimsSummary(req, res));
  router.get('/nhis-expiring-soon', requireRole(['admin', 'accounts', 'doctor']), (req, res) => controller.getNhisExpiringSoon(req, res));


  return router;
}