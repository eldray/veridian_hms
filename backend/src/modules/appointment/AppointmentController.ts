import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { BaseController } from '../../shared/base/BaseController';
import { AppointmentService } from './AppointmentService';
import { AuthRequest } from '../../middleware/authMiddleware';

const prisma = new PrismaClient();

export class AppointmentController extends BaseController {
  private service: AppointmentService;

  constructor() {
    super();
    this.service = new AppointmentService(prisma);
  }

  getAll = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit } = this.getPaginationParams(req);
    const filters = {
      clinicianId: req.query.clinicianId as string, patientId: req.query.patientId as string,
      departmentId: req.query.departmentId as string, status: req.query.status as any,
      date: req.query.date ? new Date(req.query.date as string) : undefined,
      dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
      dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
      page, limit
    };
    const result = await this.service.getAppointments(filters);
    return this.paginated(res, result.appointments, { page, limit, total: result.total }, 'Appointments retrieved');
  });

  getById = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const appt = await this.service.getAppointmentById(req.params.id);
      return this.ok(res, appt, 'Appointment retrieved');
    } catch (e: any) {
      if (e.message === 'Appointment not found') return this.notFound(res, 'Appointment');
      throw e;
    }
  });

  create = [
    body('patientId').notEmpty(), body('clinicianId').notEmpty(), body('departmentId').notEmpty(),
    body('title').notEmpty(), body('appointmentDate').isISO8601(), body('appointmentTime').notEmpty(),
    body('type').isIn(['consultation', 'follow_up', 'procedure', 'antenatal', 'postnatal', 'vaccination', 'lab_test', 'scan', 'other']),
    this.asyncHandler(async (req: AuthRequest, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return this.badRequest(res, 'Validation failed', errors.array() as any[]);

      const { appointmentDate, appointmentTime, ...rest } = req.body;
      // ✅ Combines date and time into scheduledAt to match schema
      const scheduledAt = new Date(`${appointmentDate}T${appointmentTime}:00`); 
      
      const appt = await this.service.createAppointment({ ...rest, scheduledAt }, req.user!.id);
      return this.created(res, appt, 'Appointment created');
    })
  ];

  update = [
    body('status').optional().isIn(['scheduled', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show']),
    this.asyncHandler(async (req: AuthRequest, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return this.badRequest(res, 'Validation failed', errors.array() as any[]);
      
      const appt = await this.service.updateAppointment(req.params.id, req.body);
      return this.ok(res, appt, 'Appointment updated');
    })
  ];

  delete = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    await this.service.deleteAppointment(req.params.id);
    return this.ok(res, null, 'Appointment deleted');
  });

  getStatistics = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const stats = await this.service.getStatistics(req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined);
    return this.ok(res, stats, 'Statistics retrieved');
  });

  getClinicianSchedule = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { clinicianId, date } = req.query;
    if (!clinicianId || !date) return this.badRequest(res, 'Clinician ID and date are required');
    const schedule = await this.service.getClinicianSchedule(clinicianId as string, new Date(date as string));
    return this.ok(res, schedule, 'Schedule retrieved');
  });

  getAvailableClinicians = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const roles = req.query.roles ? (req.query.roles as string).split(',') as any[] : undefined;
    const clinicians = await this.service.getAvailableClinicians(roles);
    return this.ok(res, clinicians, 'Clinicians retrieved');
  });

  getAvailableSlots = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { clinicianId, date } = req.query;
    if (!clinicianId || !date) return this.badRequest(res, 'Clinician ID and date are required');
    const result = await this.service.getAvailableSlots(clinicianId as string, new Date(date as string));
    return this.ok(res, result, 'Available slots retrieved');
  });

  convertToAttendance = [
    body('paymentMode').isIn(['cash', 'nhis', 'private_insurance', 'corporate']),
    this.asyncHandler(async (req: AuthRequest, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return this.badRequest(res, 'Validation failed', errors.array() as any[]);
      
      const result = await this.service.convertToAttendance(req.params.id, req.user!.id, req.body);
      return this.ok(res, result, 'Converted to attendance successfully');
    })
  ];
}

export const appointmentController = new AppointmentController();