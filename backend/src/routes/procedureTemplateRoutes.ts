import express from 'express';
import {
  getProcedureTemplates,
  getProcedureTemplateById,
  createProcedureTemplate,
  updateProcedureTemplate,
  deleteProcedureTemplate,
  getProcedureCategories,
  getProcedureDepartments,
} from '../controllers/procedureController';
import { protect, requireAdmin, requireClinicalStaff } from '../middleware/authMiddleware';

const router = express.Router();

// All routes are protected
router.use(protect);

// GET /api/procedure-templates - Get all procedure templates (with optional filters)
router.get('/', requireClinicalStaff, getProcedureTemplates);

// GET /api/procedure-templates/categories - Get all procedure categories
router.get('/categories', requireClinicalStaff, getProcedureCategories);

// GET /api/procedure-templates/departments - Get all unique departments
router.get('/departments', requireClinicalStaff, getProcedureDepartments);

// GET /api/procedure-templates/:id - Get a specific procedure template by ID
router.get('/:id', requireClinicalStaff, getProcedureTemplateById);

// POST /api/procedure-templates - Create a new procedure template
router.post('/', requireAdmin, createProcedureTemplate);

// PUT /api/procedure-templates/:id - Update a procedure template
router.put('/:id', requireAdmin, updateProcedureTemplate);

// DELETE /api/procedure-templates/:id - Delete a procedure template
router.delete('/:id', requireAdmin, deleteProcedureTemplate);

export default router;