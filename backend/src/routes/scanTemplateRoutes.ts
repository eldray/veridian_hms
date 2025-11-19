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
  bulkUpdateScanTemplates
} from '../controllers/scanTemplateController';
import { protect, requireRadiologyStaff, requireAdmin } from '../middleware/authMiddleware';

const router = express.Router();

// All routes are protected
router.use(protect);

// GET /api/scan-templates - Get all scan templates (with optional filters)
router.get('/', requireRadiologyStaff, getScanTemplates);

// GET /api/scan-templates/categories - Get all unique scan categories
router.get('/categories', requireRadiologyStaff, getScanCategories);

// GET /api/scan-templates/scan-types - Get all unique scan types
router.get('/scan-types', requireRadiologyStaff, getScanTypes);

// GET /api/scan-templates/:id - Get a specific scan template by ID
router.get('/:id', requireRadiologyStaff, getScanTemplateById);

// POST /api/scan-templates - Create a new scan template
router.post('/', requireRadiologyStaff, createScanTemplate);

// PUT /api/scan-templates/:id - Update a scan template
router.put('/:id', requireRadiologyStaff, updateScanTemplate);

// POST /api/scan-templates/bulk-update - Bulk update scan templates
router.post('/bulk-update', requireAdmin, bulkUpdateScanTemplates);

// DELETE /api/scan-templates/:id - Delete a scan template
router.delete('/:id', requireAdmin, deleteScanTemplate);

export default router;