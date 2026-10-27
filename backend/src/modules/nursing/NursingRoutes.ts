// src/modules/nursing/NursingRoutes.ts
import { Router } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';
import { NursingController } from './NursingController';
import { protect, requireRole } from '../../middleware/authMiddleware';
import { validateBody } from '../../middleware/validate';
import {
  AdministerDoseSchema,
  CreateNursingNoteSchema,
  CreateNursingTaskSchema,
  RecordDoseVarianceSchema,
  UpdateNursingNoteSchema,
  UpdateNursingTaskSchema,
} from './NursingValidators';

export function createNursingRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const controller = new NursingController(prisma);

  router.use(protect);

  // Read access — any clinical role
  const READERS: UserRole[] = [
    'super_admin', 'admin', 'doctor', 'nurse', 'midwife', 'pharmacist', 'hr_officer',
  ];

  // Write access — the clinical team only
  const WRITERS: UserRole[] = [
    'super_admin', 'admin', 'doctor', 'nurse', 'midwife',
  ];

  // ═══════════════════════════════════════════════════════════
  // MAR — DOSES
  // ═══════════════════════════════════════════════════════════

  router.get('/doses', requireRole(READERS), controller.getDoses);
  router.get('/doses/:id', requireRole(READERS), controller.getDoseById);
  router.get('/medications/:medicationId/doses', requireRole(READERS), controller.getDosesByMedication);
  router.get('/attendance/:attendanceId/shift', requireRole(READERS), controller.getShiftMar);

  router.post('/doses/preview-schedule', requireRole(WRITERS), controller.previewSchedule);
  router.post('/doses/:id/administer', requireRole(WRITERS), validateBody(AdministerDoseSchema), controller.administerDose);
  router.post('/doses/:id/variance', requireRole(WRITERS), validateBody(RecordDoseVarianceSchema), controller.recordVariance);

  // ═══════════════════════════════════════════════════════════
  // NURSING NOTES
  // ═══════════════════════════════════════════════════════════

  router.get('/notes', requireRole(READERS), controller.getNotes);
  router.get('/notes/:id', requireRole(READERS), controller.getNoteById);
  router.post('/notes', requireRole(WRITERS), validateBody(CreateNursingNoteSchema), controller.createNote);
  router.patch('/notes/:id', requireRole(WRITERS), validateBody(UpdateNursingNoteSchema), controller.updateNote);
  router.delete('/notes/:id', requireRole(WRITERS), controller.deleteNote);

  // ═══════════════════════════════════════════════════════════
  // NURSING TASKS
  // ═══════════════════════════════════════════════════════════

  router.get('/tasks', requireRole(READERS), controller.getTasks);
  router.get('/tasks/:id', requireRole(READERS), controller.getTaskById);
  router.post('/tasks', requireRole(WRITERS), validateBody(CreateNursingTaskSchema), controller.createTask);
  router.patch('/tasks/:id', requireRole(WRITERS), validateBody(UpdateNursingTaskSchema), controller.updateTask);
  router.delete('/tasks/:id', requireRole(WRITERS), controller.deleteTask);

  return router;
}

export default createNursingRoutes;