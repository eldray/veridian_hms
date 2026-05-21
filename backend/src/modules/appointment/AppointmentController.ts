// modules/appointment/AppointmentController.ts

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

  getAll = async (req: AuthRequest, res: Response) => {
    try {
      const filters = {
        clinicianId: req.query.clinicianId as string,
        patientId: req.query.patientId as string,
        departmentId: req.query.departmentId as string,
        status: req.query.status as any,
        date: req.query.date ? new Date(req.query.date as string) : undefined,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
        page: parseInt(req.query.page as string) || 1,
        limit: Math.min(100, parseInt(req.query.limit as string) || 50)
      };

      const result = await this.service.getAppointments(filters);

      res.json({
        success: true,
        data: result.appointments,
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
        success: false,
        message: 'Error fetching appointments',
        error: (error as Error).message
      });
    }
  };

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
        success: false,
        message: (error as Error).message
      });
    }
  };

  create = [
    body('patientId').notEmpty().withMessage('Patient ID is required'),
    body('clinicianId').notEmpty().withMessage('Clinician ID is required'),
    body('departmentId').notEmpty().withMessage('Department ID is required'),
    body('title').notEmpty().withMessage('Appointment title is required'),
    body('appointmentDate').isISO8601().withMessage('Valid appointment date is required'),
    body('appointmentTime').notEmpty().withMessage('Appointment time is required'),
    body('type').isIn(['consultation', 'follow_up', 'procedure', 'antenatal', 'postnatal', 'vaccination', 'lab_test', 'scan', 'other']).withMessage('Valid appointment type is required'),

    async (req: AuthRequest, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ success: false, errors: errors.array() });
        }

        const user = req.user;
        if (!user) {
          return res.status(401).json({ success: false, message: 'User authentication required' });
        }

        const {
          patientId,
          clinicianId,
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
            clinicianId,
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
          success: false,
          message: 'Error creating appointment',
          error: (error as Error).message
        });
      }
    }
  ];

  update = [
    body('status').optional().isIn(['scheduled', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show']).withMessage('Valid status is required'),
    body('type').optional().isIn(['consultation', 'follow_up', 'procedure', 'antenatal', 'postnatal', 'vaccination', 'lab_test', 'scan', 'other']).withMessage('Valid type is required'),
    body('clinicianId').optional().isString().withMessage('Valid clinician ID is required'),

    async (req: AuthRequest, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ success: false, errors: errors.array() });
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
          success: false,
          message: 'Error updating appointment',
          error: (error as Error).message
        });
      }
    }
  ];

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
        success: false,
        message: 'Error deleting appointment',
        error: (error as Error).message
      });
    }
  };

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
        success: false,
        message: 'Error fetching appointment statistics',
        error: (error as Error).message
      });
    }
  };

  getClinicianSchedule = async (req: AuthRequest, res: Response) => {
    try {
      const { clinicianId, date } = req.query;

      if (!clinicianId || !date) {
        return res.status(400).json({
          success: false,
          message: 'Clinician ID and date are required'
        });
      }

      const schedule = await this.service.getClinicianSchedule(
        clinicianId as string,
        new Date(date as string)
      );

      res.json({
        success: true,
        data: schedule
      });
    } catch (error) {
      console.error('Error fetching clinician schedule:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching clinician schedule',
        error: (error as Error).message
      });
    }
  };

  getAvailableClinicians = async (req: AuthRequest, res: Response) => {
    try {
      const { roles } = req.query;
      const roleArray = roles ? (roles as string).split(',') as any : ['doctor', 'nurse', 'midwife'];
      
      const clinicians = await this.service.getAvailableClinicians(roleArray);

      res.json({
        success: true,
        data: clinicians
      });
    } catch (error) {
      console.error('Error fetching available clinicians:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching available clinicians',
        error: (error as Error).message
      });
    }
  };

  convertToAttendance = [
    body('paymentMode').isIn(['cash', 'nhis', 'private_insurance', 'corporate']).withMessage('Valid payment mode is required'),
    body('insuranceProviderId').optional().isString(),
    body('nhisCCC').optional().isString(),
    body('corporateAccountId').optional().isString(),

    async (req: AuthRequest, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ success: false, errors: errors.array() });
        }

        const user = req.user;
        if (!user) {
          return res.status(401).json({ success: false, message: 'User authentication required' });
        }

        const { id } = req.params;
        const { paymentMode, insuranceProviderId, nhisCCC, corporateAccountId } = req.body;

        const attendance = await this.service.convertToAttendance(
          id,
          user.id,
          { paymentMode, insuranceProviderId, nhisCCC, corporateAccountId }
        );

        res.json({
          success: true,
          data: attendance,
          message: 'Appointment converted to attendance successfully'
        });
      } catch (error) {
        console.error('Error converting to attendance:', error);
        res.status(500).json({
          success: false,
          message: (error as Error).message
        });
      }
    }
  ];
}