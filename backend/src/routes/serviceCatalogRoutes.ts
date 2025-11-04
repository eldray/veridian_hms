// routes/serviceCatalogRoutes.ts
import express from 'express';
import {
  getServiceCatalog,
  getServiceCatalogById,
  createServiceCatalogItem,
  updateServiceCatalogItem,
  deleteServiceCatalogItem,
  getServiceMetadata
} from '../controllers/serviceCatalogController';
import { protect, requireRole } from '../middleware/authMiddleware';

const router = express.Router();

// Service Catalog
router.get('/', protect, getServiceCatalog);
router.get('/metadata', protect, getServiceMetadata);
router.get('/:id', protect, getServiceCatalogById);
router.post('/', protect, requireRole(['admin']), createServiceCatalogItem);
router.put('/:id', protect, requireRole(['admin']), updateServiceCatalogItem);
router.delete('/:id', protect, requireRole(['admin']), deleteServiceCatalogItem);

export default router;
