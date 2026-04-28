// routes/scanRoutes.ts - CORRECTED WITH PROPER ORDER
import express from 'express';
import {
  getScanTemplates,
  getScanTemplateById,
  createScanTemplate,
  updateScanTemplate,
  deleteScanTemplate,
  getScanCategories,
  getScanBodyParts,
  getScanTypes,
} from '../controllers/scanTemplateController';
import { protect, requireRadiologyStaff, requireAdmin } from '../middleware/authMiddleware';

const router = express.Router();

router.use(protect);

// ✅ IMPORTANT: Static routes MUST come before dynamic /:id routes
router.get('/categories', requireRadiologyStaff, getScanCategories);
router.get('/body-parts', requireRadiologyStaff, getScanBodyParts);
router.get('/scan-types', requireRadiologyStaff, getScanTypes);

// GET /api/scan-templates - Get all scan templates
router.get('/', requireRadiologyStaff, getScanTemplates);

// GET /api/scan-templates/:id - Get a specific scan template (MUST be LAST)
router.get('/:id', requireRadiologyStaff, getScanTemplateById);

// POST /api/scan-templates - Create a new scan template
router.post('/', requireRadiologyStaff, createScanTemplate);

// PUT /api/scan-templates/:id - Update a scan template
router.put('/:id', requireRadiologyStaff, updateScanTemplate);

// DELETE /api/scan-templates/:id - Delete a scan template
router.delete('/:id', requireAdmin, deleteScanTemplate);

export default router;