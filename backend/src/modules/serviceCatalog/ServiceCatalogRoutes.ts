import { Router } from 'express';
import { serviceCatalogController } from './ServiceCatalogController';
import { protect, requireRole } from '../../middleware/authMiddleware';

export function createServiceCatalogRoutes(): Router {
  const router = Router();
  const c = serviceCatalogController;

  // ✅ Global Auth: All routes require authentication
  router.use(protect);

  // Public read access for all authenticated staff
  router.get('/', c.getServiceCatalog);
  router.get('/metadata', c.getServiceMetadata); // Catalog metadata for forms/filters (must precede /:id)
  router.get('/category/:category', c.getServiceCatalog); // Reuses main logic with filter
  router.get('/nhis', c.getNHISServices);
  router.get('/nhis/:nhisCode', c.getServiceByNHISCode); // Single service by NHIS code (must precede /:id)
  router.get('/stats', c.getServiceStatistics);
  router.get('/nhis-readiness', c.getNHISReadinessReport);
  router.get('/export', c.getServiceCatalog); // Reuses main logic
  router.get('/:id', c.getServiceCatalogById);

  // ✅ Restricted Write Access: Only Admins and Accounts can modify pricing/catalog
  router.post('/', requireRole(['admin', 'accounts']), c.createServiceCatalog);
  router.put('/:id', requireRole(['admin', 'accounts']), c.updateServiceCatalog);
  router.patch('/:id/toggle', requireRole(['admin', 'accounts']), c.toggleServiceStatus);
  router.put('/:id/pricing', requireRole(['admin', 'accounts']), c.updatePricing);
  router.delete('/:id', requireRole(['admin']), c.deleteServiceCatalog);
  router.post('/bulk-import', requireRole(['admin', 'accounts']), c.bulkImportServices);

  // Clinical endpoints (Doctors/Nurses can check coverage/cost)
  router.post('/check-coverage', c.checkServiceCoverage);
  router.post('/calculate-cost', c.calculateServiceCost);

  return router;
}