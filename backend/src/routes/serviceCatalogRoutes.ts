// routes/serviceCatalogRoutes.ts - UPDATED
import express from 'express';
import * as serviceCatalogController from '../controllers/serviceCatalogController';
import { protect, requireAdmin, requireAccountsStaff, requireRole } from '../middleware/authMiddleware';

const router = express.Router();

// All routes are protected
router.use(protect);

// GET /api/service-catalog - Get service catalog with filtering
router.get('/', serviceCatalogController.getServiceCatalog);

// GET /api/service-catalog/metadata - Get service metadata
router.get('/metadata', serviceCatalogController.getServiceMetadata);

// GET /api/service-catalog/nhis-report - Get NHIS readiness report
router.get('/nhis-report', requireAccountsStaff, serviceCatalogController.getNHISReadinessReport);

// GET /api/service-catalog/nhis/:nhisCode - Get service by NHIS code
router.get('/nhis/:nhisCode', serviceCatalogController.getServiceByNHISCode);

// GET /api/service-catalog/category/:category - Get services by category
router.get('/category/:category', serviceCatalogController.getServicesByCategory);

// POST /api/service-catalog/check-coverage - Check service coverage
router.post('/check-coverage', serviceCatalogController.checkServiceCoverage);

// POST /api/service-catalog/calculate-cost - Calculate service cost
router.post('/calculate-cost', serviceCatalogController.calculateServiceCost);

// POST /api/service-catalog/bulk-update-nhis - Bulk update NHIS codes
router.post('/bulk-update-nhis', requireRole(['admin', 'accounts']), serviceCatalogController.bulkUpdateNHISCodes);

// GET /api/service-catalog/:id - Get service catalog item by ID
router.get('/:id', serviceCatalogController.getServiceCatalogById);

// POST /api/service-catalog - Create new service catalog item
router.post('/', requireRole(['admin', 'accounts']), serviceCatalogController.createServiceCatalogItem);

// PUT /api/service-catalog/:id - Update service catalog item
router.put('/:id', requireRole(['admin', 'accounts']), serviceCatalogController.updateServiceCatalogItem);

// DELETE /api/service-catalog/:id - Delete service catalog item
router.delete('/:id', requireAdmin, serviceCatalogController.deleteServiceCatalogItem);

export default router;