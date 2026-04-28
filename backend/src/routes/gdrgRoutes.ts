// routes/gdrgRoutes.ts
import { Router } from 'express';
import {
  getGDRGTariffs,
  getGDRGByCode,
  lookupGDRGByAge,
  createGDRGTariff,
  updateGDRGTariff,
  deleteGDRGTariff,
  linkDiagnosisToGDRG,
  unlinkDiagnosisFromGDRG
} from '../controllers/gdrgController';
import {
  protect,
  requireAdmin,
  requireClinicalStaff,
  requireAccountsStaff
} from '../middleware/authMiddleware';

const router = Router();

// All routes require authentication
router.use(protect);

// ============================================
// PUBLIC (Authenticated) Routes - Clinical staff can view
// ============================================

// Get all GDRG tariffs
router.get('/', requireClinicalStaff, getGDRGTariffs);

// Get GDRG tariff by code
router.get('/:code', requireClinicalStaff, getGDRGByCode);

// Age-based GDRG lookup for NHIS claims (used during claim generation)
router.get('/lookup/age', requireAccountsStaff, lookupGDRGByAge);

// ============================================
// Admin Only Routes
// ============================================

// Create new GDRG tariff
router.post('/', requireAdmin, createGDRGTariff);

// Update GDRG tariff
router.put('/:code', requireAdmin, updateGDRGTariff);

// Delete GDRG tariff
router.delete('/:code', requireAdmin, deleteGDRGTariff);

// Link diagnosis to GDRG tariff
router.post('/:gdrgCode/diagnosis', requireAdmin, linkDiagnosisToGDRG);

// Unlink diagnosis from GDRG tariff
router.delete('/:gdrgCode/diagnosis/:diagnosisId', requireAdmin, unlinkDiagnosisFromGDRG);

export default router;