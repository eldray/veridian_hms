/**
 * Appointment Module Controller
 * Handles HTTP requests for appointment management
 */

import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AppointmentService } from './AppointmentService';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../../middleware/authMiddleware';

export class AppointmentController {
  private service: AppointmentService;

  constructor(prisma: PrismaClient) {
    this.service = new AppointmentService(prisma);
  }

  // ============================================
  // GET ALL APPOINTMENTS
  // ============================================
  getAll = async (req: AuthRequest, res: Response) => {
    try {
      const filters = {
        doctorId: req.query.doctorId as string,
        patientId: req.query.patientId as string,
        departmentId: req.query.departmentId as string,
        status: req.query.status as any,
        date: req.query.date ? new Date(req.query.date as string) : undefined,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 50
      };

      const result = await this.service.getAppointments(filters);

      res.json({
        success: true,
        appointments: result.appointments,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          pages: Math.ceil(result.total / result.limit)
        }
      });
    } catch (error) {
      console.error('Error fetching appointments:', error);
      res.status(500).json({
        message: 'Error fetching appointments',
        error: (error as Error).message
      });
    }
  };

  // ============================================
  // GET APPOINTMENT BY ID
  // ============================================
  getById = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const appointment = await this.service.getAppointmentById(id);

      res.json({
        success: true,
        data: appointment
      });
    } catch (error) {
      console.error('Error fetching appointment:', error);
      res.status(404).json({
        message: (error as Error).message
      });
    }
  };

  // ============================================
  // CREATE APPOINTMENT
  // ============================================
  create = [
    body('patientId').notEmpty().withMessage('Patient ID is required'),
    body('doctorId').notEmpty().withMessage('Doctor ID is required'),
    body('departmentId').notEmpty().withMessage('Department ID is required'),
    body('title').notEmpty().withMessage('Appointment title is required'),
    body('appointmentDate').isISO8601().withMessage('Valid appointment date is required'),
    body('appointmentTime').notEmpty().withMessage('Appointment time is required'),
    body('type').isIn(['NEW', 'REVIEW', 'PROCEDURE', 'SURGERY', 'OTHER']).withMessage('Valid appointment type is required'),

    async (req: AuthRequest, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const user = req.user;
        if (!user) {
          return res.status(401).json({ message: 'User authentication required' });
        }

        const {
          patientId,
          doctorId,
          departmentId,
          title,
          description,
          appointmentDate,
          appointmentTime,
          duration = 30,
          type
        } = req.body;

        const appointment = await this.service.createAppointment(
          {
            patientId,
            doctorId,
            departmentId,
            title,
            description,
            appointmentDate: new Date(appointmentDate),
            appointmentTime,
            duration,
            type
          },
          user.id
        );

        res.status(201).json({
          success: true,
          data: appointment,
          message: 'Appointment created successfully'
        });
      } catch (error) {
        console.error('Error creating appointment:', error);
        res.status(500).json({
          message: 'Error creating appointment',
          error: (error as Error).message
        });
      }
    }
  ];

  // ============================================
  // UPDATE APPOINTMENT
  // ============================================
  update = [
    body('status').optional().isIn(['scheduled', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show']).withMessage('Valid status is required'),
    body('type').optional().isIn(['NEW', 'REVIEW', 'PROCEDURE', 'SURGERY', 'OTHER']).withMessage('Valid type is required'),

    async (req: AuthRequest, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const updateData = req.body;

        const appointment = await this.service.updateAppointment(id, updateData);

        res.json({
          success: true,
          data: appointment,
          message: 'Appointment updated successfully'
        });
      } catch (error) {
        console.error('Error updating appointment:', error);
        res.status(500).json({
          message: 'Error updating appointment',
          error: (error as Error).message
        });
      }
    }
  ];

  // ============================================
  // DELETE APPOINTMENT
  // ============================================
  delete = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      await this.service.deleteAppointment(id);

      res.json({
        success: true,
        message: 'Appointment deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting appointment:', error);
      res.status(500).json({
        message: 'Error deleting appointment',
        error: (error as Error).message
      });
    }
  };

  // ============================================
  // GET APPOINTMENT STATISTICS
  // ============================================
  getStatistics = async (req: AuthRequest, res: Response) => {
    try {
      const { dateFrom } = req.query;
      const stats = await this.service.getStatistics(
        dateFrom ? new Date(dateFrom as string) : undefined
      );

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error fetching appointment statistics:', error);
      res.status(500).json({
        message: 'Error fetching appointment statistics',
        error: (error as Error).message
      });
    }
  };

  // ============================================
  // GET DOCTOR SCHEDULE
  // ============================================
  getDoctorSchedule = async (req: AuthRequest, res: Response) => {
    try {
      const { doctorId, date } = req.query;

      if (!doctorId || !date) {
        return res.status(400).json({
          message: 'Doctor ID and date are required'
        });
      }

      const schedule = await this.service.getDoctorSchedule(
        doctorId as string,
        new Date(date as string)
      );

      res.json({
        success: true,
        data: schedule
      });
    } catch (error) {
      console.error('Error fetching doctor schedule:', error);
      res.status(500).json({
        message: 'Error fetching doctor schedule',
        error: (error as Error).message
      });
    }
  };
}
