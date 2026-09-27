// src/modules/nursing/NursingController.ts
import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { BaseController } from '../../shared/base/BaseController';
import { NursingService } from './NursingService';
import { AuthRequest } from '../../middleware/authMiddleware';

export class NursingController extends BaseController {
  private service: NursingService;

  constructor(prisma: PrismaClient) {
    super();
    this.service = new NursingService(prisma);
  }

  private actor(req: AuthRequest) {
    return { userId: req.user!.userId, role: req.user!.role };
  }

  // ═══════════════════════════════════════════════════════════
  // DOSES
  // ═══════════════════════════════════════════════════════════

  getDoses = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(500, parseInt(req.query.limit as string) || 500);

    const filters = {
      attendanceId: req.query.attendanceId as string | undefined,
      patientId: req.query.patientId as string | undefined,
      medicationId: req.query.medicationId as string | undefined,
      status: req.query.status as any,
      fromDate: req.query.fromDate ? new Date(req.query.fromDate as string) : undefined,
      toDate: req.query.toDate ? new Date(req.query.toDate as string) : undefined,
      page,
      limit,
    };

    const result = await this.service.getDoses(filters);
    return this.paginated(res, result.doses, { page, limit, total: result.total }, 'Doses retrieved');
  });

  getDoseById = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const dose = await this.service.getDoseById(req.params.id);
    return this.ok(res, dose, 'Dose retrieved');
  });

  getDosesByMedication = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const doses = await this.service.getDosesByMedication(req.params.medicationId);
    return this.ok(res, doses, 'Doses retrieved');
  });

  getShiftMar = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { attendanceId } = req.params;
    const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
    const shift = (req.query.shift as 'morning' | 'afternoon' | 'night') || 'morning';

    const result = await this.service.getShiftMar(attendanceId, date, shift);
    return this.ok(res, result, 'Shift MAR retrieved');
  });

  previewSchedule = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { frequency, duration, prescribedAt } = req.body;
    const preview = this.service.parseSchedule(
      frequency ?? null,
      duration ?? null,
      prescribedAt ? new Date(prescribedAt) : new Date(),
    );
    return this.ok(res, preview, 'Schedule preview');
  });

  administerDose = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const dose = await this.service.administerDose(req.params.id, req.user!.userId, req.body);
    return this.ok(res, dose, 'Dose administered');
  });

  recordVariance = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const dose = await this.service.recordVariance(req.params.id, req.user!.userId, req.body);
    return this.ok(res, dose, 'Variance recorded');
  });

  // ═══════════════════════════════════════════════════════════
  // NOTES
  // ═══════════════════════════════════════════════════════════

  getNotes = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(200, parseInt(req.query.limit as string) || 100);

    const filters = {
      patientId: req.query.patientId as string | undefined,
      attendanceId: req.query.attendanceId as string | undefined,
      admissionId: req.query.admissionId as string | undefined,
      shift: req.query.shift as any,
      noteType: req.query.noteType as any,
      isFlagged: req.query.isFlagged === 'true' ? true : req.query.isFlagged === 'false' ? false : undefined,
      fromDate: req.query.fromDate ? new Date(req.query.fromDate as string) : undefined,
      toDate: req.query.toDate ? new Date(req.query.toDate as string) : undefined,
      search: req.query.search as string | undefined,
      page,
      limit,
    };

    const result = await this.service.getNotes(filters);
    return this.paginated(res, result.notes, { page, limit, total: result.total }, 'Notes retrieved');
  });

  getNoteById = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const note = await this.service.getNoteById(req.params.id);
    return this.ok(res, note, 'Note retrieved');
  });

  createNote = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const note = await this.service.createNote(req.body, req.user!.userId);
    return this.created(res, note, 'Note created');
  });

  updateNote = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const note = await this.service.updateNote(req.params.id, req.body, this.actor(req));
    return this.ok(res, note, 'Note updated');
  });

  deleteNote = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    await this.service.deleteNote(req.params.id, this.actor(req));
    return this.ok(res, null, 'Note deleted');
  });

  // ═══════════════════════════════════════════════════════════
  // TASKS
  // ═══════════════════════════════════════════════════════════

  getTasks = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(200, parseInt(req.query.limit as string) || 200);

    const filters = {
      patientId: req.query.patientId as string | undefined,
      attendanceId: req.query.attendanceId as string | undefined,
      admissionId: req.query.admissionId as string | undefined,
      status: req.query.status as any,
      priority: req.query.priority as any,
      taskType: req.query.taskType as any,
      fromDate: req.query.fromDate ? new Date(req.query.fromDate as string) : undefined,
      toDate: req.query.toDate ? new Date(req.query.toDate as string) : undefined,
      page,
      limit,
    };

    const result = await this.service.getTasks(filters);
    return this.paginated(res, result.tasks, { page, limit, total: result.total }, 'Tasks retrieved');
  });

  getTaskById = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const task = await this.service.getTaskById(req.params.id);
    return this.ok(res, task, 'Task retrieved');
  });

  createTask = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const task = await this.service.createTask(req.body, req.user!.userId);
    return this.created(res, task, 'Task created');
  });

  updateTask = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const task = await this.service.updateTask(req.params.id, req.body, req.user!.userId);
    return this.ok(res, task, 'Task updated');
  });

  deleteTask = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    await this.service.deleteTask(req.params.id);
    return this.ok(res, null, 'Task deleted');
  });
}