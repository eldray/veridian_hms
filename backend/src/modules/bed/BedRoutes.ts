import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { BedRepository } from './BedRepository';
import { BedService } from './BedService';
import { BedController } from './BedController';
import { protect, requireRole } from '../../middleware/authMiddleware';

export function createBedRoutes(prisma: PrismaClient): Router {
  const bedRepository = new BedRepository(prisma);
  const bedService = new BedService(bedRepository);
  const bedController = new BedController(bedService);
  
  const router = Router();
  
  // All routes require authentication
  router.use(protect);
  
  // GET /api/beds - Get all beds with optional filtering and pagination
  router.get('/', (req, res) => bedController.getBeds(req, res));
  
  // GET /api/beds/stats - Get bed statistics
  router.get('/stats', async (req, res) => {
    try {
      const stats = await bedService.getBedStats();
      res.json({
        success: true,
        data: stats,
        message: 'Bed statistics retrieved successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error fetching bed statistics',
        error: error.message
      });
    }
  });
  
  // GET /api/beds/:id - Get bed by ID
  router.get('/:id', (req, res) => bedController.getBedById(req, res));
  
  // POST /api/beds - Create a new bed (Admin only)
  router.post('/', requireRole(['admin']), (req, res) => bedController.createBed(req, res));
  
  // PUT /api/beds/:id - Update a bed (Admin only)
  router.put('/:id', requireRole(['admin']), (req, res) => bedController.updateBed(req, res));
  
  // DELETE /api/beds/:id - Delete a bed (Admin only)
  router.delete('/:id', requireRole(['admin']), (req, res) => bedController.deleteBed(req, res));
  
  return router;
}