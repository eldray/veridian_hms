/**
 * Service Catalog Routes
 * Route definitions for service catalog operations
 */

import { Router } from 'express';
import { AuthRequest } from '../../middleware/authMiddleware';
import { serviceCatalogController } from './ServiceCatalogController';

export function createServiceCatalogRoutes(): Router {
  const router = Router();

  // GET all services with filtering and pagination
  router.get('/', (req: AuthRequest, res) => serviceCatalogController.getServiceCatalog(req, res));
  
  // GET services by category
  router.get('/category/:category', (req: AuthRequest, res) => serviceCatalogController.getServicesByCategory(req, res));
  
  // GET NHIS services
  router.get('/nhis', (req: AuthRequest, res) => serviceCatalogController.getNHISServices(req, res));
  
  // GET service statistics
  router.get('/stats', (req: AuthRequest, res) => serviceCatalogController.getServiceStatistics(req, res));
  
  // GET single service by ID
  router.get('/:id', (req: AuthRequest, res) => serviceCatalogController.getServiceCatalogById(req, res));
  
  // POST create new service
  router.post('/', (req: AuthRequest, res) => serviceCatalogController.createServiceCatalog(req, res));
  
  // PUT update service
  router.put('/:id', (req: AuthRequest, res) => serviceCatalogController.updateServiceCatalog(req, res));
  
  // PATCH toggle service status
  router.patch('/:id/toggle', (req: AuthRequest, res) => serviceCatalogController.toggleServiceStatus(req, res));
  
  // PUT update pricing
  router.put('/:id/pricing', (req: AuthRequest, res) => serviceCatalogController.updatePricing(req, res));
  
  // DELETE service
  router.delete('/:id', (req: AuthRequest, res) => serviceCatalogController.deleteServiceCatalog(req, res));
  
  // POST bulk import
  router.post('/bulk-import', (req: AuthRequest, res) => serviceCatalogController.bulkImportServices(req, res));
  
  // GET export services
  router.get('/export', (req: AuthRequest, res) => serviceCatalogController.exportServices(req, res));

  return router;
}
