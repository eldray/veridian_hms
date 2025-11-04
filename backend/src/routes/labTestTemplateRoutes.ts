import express from 'express';
import { getLabTestTemplates, getLabTestTemplateById, createLabTestTemplate, updateLabTestTemplate, deleteLabTestTemplate } from '../controllers/labTestTemplateController';
import { protect, requireRole } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', protect, requireRole(['admin']), getLabTestTemplates);
router.get('/:id', protect, requireRole(['admin']), getLabTestTemplateById);
router.post('/', protect, requireRole(['admin']), createLabTestTemplate);
router.put('/:id', protect, requireRole(['admin']), updateLabTestTemplate);
router.delete('/:id', protect, requireRole(['admin']), deleteLabTestTemplate);

export default router;
