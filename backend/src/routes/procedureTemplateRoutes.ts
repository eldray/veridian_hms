import express from 'express';
import { getProcedureTemplates, getProcedureTemplateById, createProcedureTemplate, updateProcedureTemplate, deleteProcedureTemplate } from '../controllers/procedureTemplateController';
import { protect, requireRole } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', protect, requireRole(['admin']), getProcedureTemplates);
router.get('/:id', protect, requireRole(['admin']), getProcedureTemplateById);
router.post('/', protect, requireRole(['admin']), createProcedureTemplate);
router.put('/:id', protect, requireRole(['admin']), updateProcedureTemplate);
router.delete('/:id', protect, requireRole(['admin']), deleteProcedureTemplate);

export default router;
