import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { protect, requireRole } from '../../middleware/authMiddleware';
import { ConsultationTypeController } from './ConsultationTypeController';

export function createConsultationTypeRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const controller = new ConsultationTypeController(prisma);
  router.use(protect);
  router.get('/', controller.getAll);
  router.get('/:id', controller.getById);
  router.post('/', requireRole(['admin', 'accounts']), controller.create);
  router.put('/:id', requireRole(['admin', 'accounts']), controller.update);
  router.delete('/:id', requireRole(['admin']), controller.delete);
  return router;
}
