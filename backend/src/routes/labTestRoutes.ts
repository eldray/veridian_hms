// routes/labTestRoutes.ts - CORRECTED VERSION
import express from 'express';
import {
  getLabTestServices,
  getLabTestServiceById,
  createLabTestService,
  updateLabTestService,
  deleteLabTestService,
  bulkUpdateLabTestServices,
  getLabTestSubCategories,
  getLabTestMetadataFields,
  getLabServiceCategories,  // ✅ ADD THIS IMPORT
} from '../controllers/labTestController';
import { protect, requireLabStaff, requireAdmin } from '../middleware/authMiddleware';

const router = express.Router();

router.use(protect);

// GET /api/lab-test-services/categories - Get all lab test categories
router.get('/categories', requireLabStaff, getLabServiceCategories);

// GET /api/lab-test-services/sub-categories - Get all unique sub-categories
router.get('/sub-categories', requireLabStaff, getLabTestSubCategories);

// GET /api/lab-test-services/specimen-types - Get all specimen types
router.get('/specimen-types', requireLabStaff, getLabTestMetadataFields);

// GET /api/lab-test-services - Get all lab test services (with filters)
router.get('/', requireLabStaff, getLabTestServices);

// GET /api/lab-test-services/:id - Get a specific lab test service by ID (MUST BE LAST)
router.get('/:id', requireLabStaff, getLabTestServiceById);

// POST /api/lab-test-services - Create a new lab test service
router.post('/', requireAdmin, createLabTestService);

// PUT /api/lab-test-services/:id - Update a lab test service
router.put('/:id', requireAdmin, updateLabTestService);

// DELETE /api/lab-test-services/:id - Delete a lab test service
router.delete('/:id', requireAdmin, deleteLabTestService);

// POST /api/lab-test-services/bulk-update - Bulk update lab test services status
router.post('/bulk-update', requireAdmin, bulkUpdateLabTestServices);

export default router;