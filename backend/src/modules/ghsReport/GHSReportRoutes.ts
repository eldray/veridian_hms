import { Router } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';
import { GHSReportController } from './GHSReportController';
import { protect, requireRole } from '../../middleware/authMiddleware';

export const createGHSReportRoutes = (prisma: PrismaClient) => {
  const router = Router();
  const controller = new GHSReportController(prisma);

  router.use(protect);
  
  const allowedRoles: UserRole[] = ['admin', 'doctor', 'midwife', 'records', 'accounts'];
  router.use(requireRole(allowedRoles));

  // ── Generate Reports ──────────────────────────────────────────────────────
  router.get('/opd', controller.generateOPDReport);
  router.get('/ipd', controller.generateIPDReport);
  router.get('/idsr', controller.generateIDSRReport);
  router.get('/malaria', controller.generateMalariaReport);
  router.get('/delivery', controller.generateDeliveryReport);
  router.get('/family-planning', controller.getFamilyPlanningReport);
  router.get('/morbidity-mortality', controller.generateMorbidityMortalityReport);
  router.get('/top-diagnoses', controller.getTopDiagnoses);
  router.get('/form-a', controller.generateFormAReport);

  // ─── Family Planning & EPI Stats ────────────────────────────────────────────
  router.get('/family-planning/stats', controller.getFamilyPlanningStats);
  router.get('/epi/stats', controller.getEPIStats);

  router.get(
    '/consulting-room-register',
    requireRole(['admin', 'doctor', 'midwife', 'nurse', 'records', 'accounts']),
    controller.generateConsultingRoomRegister
  );

  // ── Submissions (Specific routes BEFORE dynamic :id routes) ───────────────
  router.get('/submissions', controller.getReportSubmissions);
  router.get('/submissions/:id', controller.getReportById);
  router.get('/submissions/:id/export', controller.exportReportToCSV);

  return router;
};

export default createGHSReportRoutes;