// routes/scanTemplateRoutes.ts
import express from 'express';
import { 
  getScanTemplates, 
  getScanTemplateById, 
  createScanTemplate, 
  updateScanTemplate, 
  deleteScanTemplate,
  getScanCategories,
  getScanBodyParts
} from '../controllers/scanTemplateController';
import { protect, requireRole } from '../middleware/authMiddleware';

const router = express.Router();

// Public routes (for dropdowns in frontend)
router.get('/categories', getScanCategories);
router.get('/body-parts', getScanBodyParts);

// Protected routes
router.get('/', protect, getScanTemplates);
router.get('/:id', protect, getScanTemplateById);
router.post('/', protect, requireRole(['admin', 'radiologist']), createScanTemplate);
router.put('/:id', protect, requireRole(['admin', 'radiologist']), updateScanTemplate);
router.delete('/:id', protect, requireRole(['admin']), deleteScanTemplate);

export default router;
