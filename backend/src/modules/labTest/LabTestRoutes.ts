import { Router } from 'express';
import { LabTestController } from './LabTestController';

export function createLabTestRoutes(): Router {
  const router = Router();
  const controller = new LabTestController();

  router.get('/', controller.getLabTestServices);
  router.get('/sub-categories', controller.getLabTestSubCategories);
  router.get('/metadata-fields', controller.getLabTestMetadataFields);
  router.get('/:id', controller.getLabTestServiceById);
  router.post('/', controller.createLabTestService);
  router.put('/:id', controller.updateLabTestService);
  router.delete('/:id', controller.deleteLabTestService);
  router.patch('/bulk-update', controller.bulkUpdateLabTestServices);

  return router;
}
