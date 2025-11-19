import express from 'express';
import {
  getLabTestTemplates,
  getLabTestTemplateById,
  createLabTestTemplate,
  updateLabTestTemplate,
  deleteLabTestTemplate,
  getLabTestCategories,
  getLabTestSubCategories,
  getSpecimenTypes,
  bulkUpdateLabTestTemplates
} from '../controllers/labTestTemplateController';
import { protect, requireLabStaff, requireAdmin } from '../middleware/authMiddleware';

const router = express.Router();

// All routes are protected
router.use(protect);

// GET /api/lab-test-templates - Get all lab test templates (with optional filters)
router.get('/', requireLabStaff, getLabTestTemplates);

// GET /api/lab-test-templates/categories - Get all lab test categories
router.get('/categories', requireLabStaff, getLabTestCategories);

// GET /api/lab-test-templates/sub-categories - Get all unique sub-categories
router.get('/sub-categories', requireLabStaff, getLabTestSubCategories);

// GET /api/lab-test-templates/specimen-types - Get all specimen types
router.get('/specimen-types', requireLabStaff, getSpecimenTypes);

// GET /api/lab-test-templates/:id - Get a specific lab test template by ID
router.get('/:id', requireLabStaff, getLabTestTemplateById);

// POST /api/lab-test-templates - Create a new lab test template
router.post('/', requireAdmin, createLabTestTemplate);

// PUT /api/lab-test-templates/:id - Update a lab test template
router.put('/:id', requireAdmin, updateLabTestTemplate);

// POST /api/lab-test-templates/bulk-update - Bulk update lab test templates
router.post('/bulk-update', requireAdmin, bulkUpdateLabTestTemplates);

// DELETE /api/lab-test-templates/:id - Delete a lab test template
router.delete('/:id', requireAdmin, deleteLabTestTemplate);

export default router;