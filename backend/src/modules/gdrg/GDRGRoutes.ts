import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { GDRGController } from './GDRGController';
import { protect, requireRole } from '../../middleware/authMiddleware';

export const createGDRGRoutes = (prisma: PrismaClient) => {
  const router = Router();
  const controller = new GDRGController(prisma);  

  router.use(protect);

  // ============================================
  // ✅ SPECIFIC ROUTES FIRST (BEFORE dynamic :code routes)
  // ============================================
  router.get('/lookup/age', controller.lookupByAge);
  router.get('/diagnosis/:diagnosisId', controller.getGDRGByDiagnosis);
  router.get('/procedure/:procedureId', controller.getGDRGByProcedure);

  // ============================================
  // DYNAMIC CODE ROUTES (LAST)
  // ============================================
  router.get('/', controller.getTariffs);
  router.get('/:code', controller.getTariffByCode);
  router.get('/:gdrgCode/diagnoses', controller.getDiagnosesByGDRG);
  router.get('/:gdrgCode/procedures', controller.getProceduresByGDRG);

  // ============================================
  // ADMIN ONLY ROUTES (Write operations)
  // ============================================
  router.post('/', requireRole(['admin']), controller.createTariff);
  router.put('/:code', requireRole(['admin']), controller.updateTariff);
  router.delete('/:code', requireRole(['admin']), controller.deleteTariff);

  router.post('/:gdrgCode/diagnosis', requireRole(['admin']), controller.linkDiagnosis);
  router.delete('/:gdrgCode/diagnosis/:diagnosisId', requireRole(['admin']), controller.unlinkDiagnosis);

  router.post('/:gdrgCode/procedure', requireRole(['admin']), controller.linkProcedure);
  router.delete('/:gdrgCode/procedure/:procedureId', requireRole(['admin']), controller.unlinkProcedure);

  return router;
};

export default createGDRGRoutes;