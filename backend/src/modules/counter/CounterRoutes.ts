import { Router } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';
import { CounterController } from './CounterController';
import { protect, requireRole } from '../../middleware/authMiddleware';
import { validateBody } from '../../middleware/validate';
import {
  AddLabOrderSchema,
  AddSaleItemSchema,
  AddScanOrderSchema,
  CreateTicketSchema,
  DispenseItemSchema,
  LinkClientSchema,
} from './CounterValidators';

/**
 * The counter belongs to the people who stand behind it: the pharmacy bench, the lab,
 * the scan room, and accounts/records who take the money and file the paperwork.
 * Deliberately NOT doctors/nurses — a clinical consultation is opened from the visit
 * screen, and the roles here cannot reach a clinical encounter through this module
 * (CounterService rejects any ticket that is not a walk-in).
 */
const COUNTER_STAFF: UserRole[] = ['admin', 'super_admin', 'pharmacist', 'lab_tech', 'sonographer', 'accounts', 'records'];

export function createCounterRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const controller = new CounterController(prisma);

  router.use(protect);

  // Counter customers are a separate book from the patient register: this search never
  // touches Patient rows, and the patient directory never returns these names.
  router.get('/clients', requireRole(COUNTER_STAFF), controller.searchClients);

  // …but the bench still has to ask "is this person already registered?", which
  // /api/patients will not answer for pharmacist, lab, scan or accounts staff.
  // This returns name, folder and date of birth only — enough to pick the right folder.
  router.get('/patients', requireRole(COUNTER_STAFF), controller.searchPatients);

  router.get('/tickets', requireRole(COUNTER_STAFF), controller.listTickets);
  router.get('/tickets/:id', requireRole(COUNTER_STAFF), controller.getTicket);
  router.post('/tickets', requireRole(COUNTER_STAFF), validateBody(CreateTicketSchema), controller.createTicket);

  router.post('/tickets/:id/items', requireRole(COUNTER_STAFF), validateBody(AddSaleItemSchema), controller.addSaleItem);
  // Handing goods over moves stock, so it is the pharmacy's job and not accounts'.
  router.post(
    '/tickets/:id/items/:medicationId/dispense',
    requireRole(['admin', 'super_admin', 'pharmacist']),
    validateBody(DispenseItemSchema),
    controller.dispenseItem,
  );
  router.delete(
    '/tickets/:id/items/:medicationId',
    requireRole(['admin', 'super_admin', 'pharmacist', 'records']),
    controller.cancelSaleItem,
  );

  router.post('/tickets/:id/lab-tests', requireRole(COUNTER_STAFF), validateBody(AddLabOrderSchema), controller.addLabOrder);
  router.delete('/tickets/:id/lab-tests/:labTestId', requireRole(COUNTER_STAFF), controller.removeLabOrder);
  router.post('/tickets/:id/scans', requireRole(COUNTER_STAFF), validateBody(AddScanOrderSchema), controller.addScanOrder);
  router.delete('/tickets/:id/scans/:scanId', requireRole(COUNTER_STAFF), controller.removeScanOrder);

  // Raising the ticket's bill is the counter's own step, so the bench roles can price a
  // basket. Taking the money stays with accounts on the existing /bills/:id/payment route.
  router.get('/tickets/:id/bill', requireRole(COUNTER_STAFF), controller.getBill);
  router.post('/tickets/:id/bill', requireRole(COUNTER_STAFF), controller.raiseBill);

  router.post('/tickets/:id/close', requireRole(COUNTER_STAFF), controller.closeTicket);

  // Registering someone properly is records' work; the link only says which folder the
  // counter identity became, it does not rewrite the bills already raised.
  router.post('/clients/:id/link', requireRole(['admin', 'super_admin', 'records']), validateBody(LinkClientSchema), controller.linkClient);

  return router;
}
