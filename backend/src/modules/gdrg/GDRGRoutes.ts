// GDRGRoutes.ts - Route definitions for GDRG module

import { Router } from 'express';
import { GDRGController } from './GDRGController';
import { protect, requireAdmin, requireClinicalStaff, requireAccountsStaff } from '../../middleware/authMiddleware';

export const createGDRGRoutes = () => {
  const router = Router();
  const controller = new GDRGController();

  // All routes require authentication
  router.use(protect);

  // ============================================
  // PUBLIC (Authenticated) Routes - Clinical staff can view
  // ============================================

  // Get all GDRG tariffs
  router.get('/', requireClinicalStaff, controller.getTariffs);

  // Get GDRG tariff by code
  router.get('/:code', requireClinicalStaff, controller.getTariffByCode);

  // Age-based GDRG lookup for NHIS claims (used during claim generation)
  router.get('/lookup/age', requireAccountsStaff, controller.lookupByAge);

  // ============================================
  // Admin Only Routes
  // ============================================

  // Create new GDRG tariff
  router.post('/', requireAdmin, controller.createTariff);

  // Update GDRG tariff
  router.put('/:code', requireAdmin, controller.updateTariff);

  // Delete GDRG tariff
  router.delete('/:code', requireAdmin, controller.deleteTariff);

  // Link diagnosis to GDRG tariff
  router.post('/:gdrgCode/diagnosis', requireAdmin, controller.linkDiagnosis);

  // Unlink diagnosis from GDRG tariff
  router.delete('/:gdrgCode/diagnosis/:diagnosisId', requireAdmin, controller.unlinkDiagnosis);

  // ============================================
  // Diagnosis Linking Routes
  // ============================================
  router.get('/:gdrgCode/diagnoses', requireClinicalStaff, controller.getDiagnosesByGDRG);
  router.get('/diagnosis/:diagnosisId', requireClinicalStaff, controller.getGDRGByDiagnosis);

  // ============================================
  // Procedure GDRG Linking Routes (Admin Only)
  // ============================================
  router.post('/:gdrgCode/procedure', requireAdmin, controller.linkProcedure);
  router.delete('/:gdrgCode/procedure/:procedureId', requireAdmin, controller.unlinkProcedure);
  router.get('/:gdrgCode/procedures', requireClinicalStaff, controller.getProceduresByGDRG);
  router.get('/procedure/:procedureId', requireClinicalStaff, controller.getGDRGByProcedure);

  return router;
};

export default createGDRGRoutes;
