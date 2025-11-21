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
} from '../controllers/labTestController';
import { protect, requireLabStaff, requireAdmin } from '../middleware/authMiddleware';

const router = express.Router();

// All routes are protected
router.use(protect);

// GET /api/lab-test-Servicess - Get all lab test Servicess (with optional filters)
router.get('/', requireLabStaff, getLabTestServices);

// GET /api/lab-test-Servicess/categories - Get all lab test categories
router.get('/categories', requireLabStaff, bulkUpdateLabTestServices);

// GET /api/lab-test-Servicess/sub-categories - Get all unique sub-categories
router.get('/sub-categories', requireLabStaff, getLabTestSubCategories);

// GET /api/lab-test-Servicess/specimen-types - Get all specimen types
router.get('/specimen-types', requireLabStaff, getLabTestMetadataFields);

// GET /api/lab-test-Servicess/:id - Get a specific lab test Services by ID
router.get('/:id', requireLabStaff, getLabTestServiceById);

// POST /api/lab-test-Servicess - Create a new lab test Services
router.post('/', requireAdmin, createLabTestService);

// PUT /api/lab-test-Servicess/:id - Update a lab test Services
router.put('/:id', requireAdmin, updateLabTestService);

// DELETE /api/lab-test-Servicess/:id - Delete a lab test Services
router.delete('/:id', requireAdmin, deleteLabTestService);

export default router;