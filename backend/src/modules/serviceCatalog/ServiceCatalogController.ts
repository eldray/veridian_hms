/**
 * Service Catalog Controller
 * HTTP request handlers for service catalog operations
 */

import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/authMiddleware';
import { BaseController } from '../../utils/baseController';

// Import legacy controller functions
const legacyController = require('../../controllers/serviceCatalogController');

export class ServiceCatalogController extends BaseController {
  
  async getServiceCatalog(req: AuthRequest, res: Response): Promise<void> {
    try {
      await legacyController.getServiceCatalog(req, res);
    } catch (error) {
      this.handleError(res, error, 'Error fetching service catalog');
    }
  }

  async getServiceCatalogById(req: AuthRequest, res: Response): Promise<void> {
    try {
      await legacyController.getServiceCatalogById(req, res);
    } catch (error) {
      this.handleError(res, error, 'Error fetching service catalog item');
    }
  }

  async createServiceCatalog(req: AuthRequest, res: Response): Promise<void> {
    try {
      await legacyController.createServiceCatalog(req, res);
    } catch (error) {
      this.handleError(res, error, 'Error creating service catalog item');
    }
  }

  async updateServiceCatalog(req: AuthRequest, res: Response): Promise<void> {
    try {
      await legacyController.updateServiceCatalog(req, res);
    } catch (error) {
      this.handleError(res, error, 'Error updating service catalog item');
    }
  }

  async deleteServiceCatalog(req: AuthRequest, res: Response): Promise<void> {
    try {
      await legacyController.deleteServiceCatalog(req, res);
    } catch (error) {
      this.handleError(res, error, 'Error deleting service catalog item');
    }
  }

  async toggleServiceStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      await legacyController.toggleServiceStatus(req, res);
    } catch (error) {
      this.handleError(res, error, 'Error toggling service status');
    }
  }

  async updatePricing(req: AuthRequest, res: Response): Promise<void> {
    try {
      await legacyController.updatePricing(req, res);
    } catch (error) {
      this.handleError(res, error, 'Error updating pricing');
    }
  }

  async getServicesByCategory(req: AuthRequest, res: Response): Promise<void> {
    try {
      await legacyController.getServicesByCategory(req, res);
    } catch (error) {
      this.handleError(res, error, 'Error fetching services by category');
    }
  }

  async getNHISServices(req: AuthRequest, res: Response): Promise<void> {
    try {
      await legacyController.getNHISServices(req, res);
    } catch (error) {
      this.handleError(res, error, 'Error fetching NHIS services');
    }
  }

  async getServiceStatistics(req: AuthRequest, res: Response): Promise<void> {
    try {
      await legacyController.getServiceStatistics(req, res);
    } catch (error) {
      this.handleError(res, error, 'Error fetching service statistics');
    }
  }

  async bulkImportServices(req: AuthRequest, res: Response): Promise<void> {
    try {
      await legacyController.bulkImportServices(req, res);
    } catch (error) {
      this.handleError(res, error, 'Error importing services');
    }
  }

  async exportServices(req: AuthRequest, res: Response): Promise<void> {
    try {
      await legacyController.exportServices(req, res);
    } catch (error) {
      this.handleError(res, error, 'Error exporting services');
    }
  }
}

export const serviceCatalogController = new ServiceCatalogController();
