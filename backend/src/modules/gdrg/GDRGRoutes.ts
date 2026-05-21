// GDRGRoutes.ts - Route definitions for GDRG module

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { GDRGController } from './GDRGController';
import { protect, requireRole } from '../../middleware/authMiddleware';

export const createGDRGRoutes = (prisma: PrismaClient) => {  // ✅ Accept prisma
  const router = Router();
  const controller = new GDRGController(prisma);  

  // All routes require authentication
  router.use(protect);

  // ============================================
  // Clinical Staff Routes (View only)
  // ============================================

  // Get all GDRG tariffs with pagination
  router.get('/', requireRole(['admin', 'doctor', 'accounts', 'records']), controller.getTariffs);

  // Get GDRG tariff by code
  router.get('/:code', requireRole(['admin', 'doctor', 'accounts', 'records']), controller.getTariffByCode);

  // Age-based GDRG lookup for NHIS claims
  router.get('/lookup/age', requireRole(['admin', 'accounts']), controller.lookupByAge);

  // Get diagnoses by GDRG
  router.get('/:gdrgCode/diagnoses', requireRole(['admin', 'doctor', 'accounts']), controller.getDiagnosesByGDRG);

  // Get GDRG by diagnosis
  router.get('/diagnosis/:diagnosisId', requireRole(['admin', 'doctor', 'accounts']), controller.getGDRGByDiagnosis);

  // Get procedures by GDRG
  router.get('/:gdrgCode/procedures', requireRole(['admin', 'doctor', 'accounts']), controller.getProceduresByGDRG);

  // Get GDRG by procedure
  router.get('/procedure/:procedureId', requireRole(['admin', 'doctor', 'accounts']), controller.getGDRGByProcedure);

  // ============================================
  // Admin Only Routes (Write operations)
  // ============================================

  // Create new GDRG tariff
  router.post('/', requireRole(['admin']), controller.createTariff);

  // Update GDRG tariff
  router.put('/:code', requireRole(['admin']), controller.updateTariff);

  // Delete GDRG tariff
  router.delete('/:code', requireRole(['admin']), controller.deleteTariff);

  // Link diagnosis to GDRG tariff
  router.post('/:gdrgCode/diagnosis', requireRole(['admin']), controller.linkDiagnosis);

  // Unlink diagnosis from GDRG tariff
  router.delete('/:gdrgCode/diagnosis/:diagnosisId', requireRole(['admin']), controller.unlinkDiagnosis);

  // Link procedure to GDRG tariff
  router.post('/:gdrgCode/procedure', requireRole(['admin']), controller.linkProcedure);

  // Unlink procedure from GDRG tariff
  router.delete('/:gdrgCode/procedure/:procedureId', requireRole(['admin']), controller.unlinkProcedure);

  return router;
};

export default createGDRGRoutes;