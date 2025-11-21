import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { sendNotification } from './notificationController';
import { PrismaClient, AppointmentType, AppointmentStatus } from '@prisma/client';
const prisma = new PrismaClient();

export const getAppointments = async (req: Request, res: Response) => {
  try {
    const { 
      doctorId, 
      patientId, 
      departmentId, 
      status, 
      date,
      page = 1, 
      limit = 50 
    } = req.query;

    const where: any = {};
    
    if (doctorId) where.doctorId = doctorId as string;
    if (patientId) where.patientId = patientId as string;
    if (departmentId) where.departmentId = departmentId as string;
    if (status) where.status = status as AppointmentStatus;
    
    if (date) {
      const targetDate = new Date(date as string);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      where.appointmentDate = {
        gte: targetDate,
        lt: nextDay
      };
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        include: {
          patient: {
            select: {
              id: true,
              surname: true,
              otherNames: true,
              folderNumber: true,
              contact: true
            }
          },
          doctor: {
            select: {
              id: true,
              fullName: true,
              role: true
            }
          },
          department: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: { appointmentDate: 'asc' },
        skip,
        take: parseInt(limit as string)
      }),
      prisma.appointment.count({ where })
    ]);

    res.json({
      appointments,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string))
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

export const getAppointmentById = async (req: Request, res: Response) => {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: req.params.id },
      include: {
        patient: {
          select: {
            id: true,
            surname: true,
            otherNames: true,
            folderNumber: true,
            contact: true
          }
        },
        doctor: {
          select: {
            id: true,
            fullName: true,
            role: true
          }
        },
        department: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    res.json(appointment);
  } catch (error) {
    console.error('Error fetching appointment:', error);
    res.status(500).json({ 
      message: 'Error fetching appointment', 
      error: (error as Error).message 
    });
  }
};

export const createAppointment = [
  body('patientId').notEmpty().withMessage('Patient ID is required'),
  body('doctorId').notEmpty().withMessage('Doctor ID is required'),
  body('departmentId').notEmpty().withMessage('Department ID is required'),
  body('title').notEmpty().withMessage('Appointment title is required'),
  body('appointmentDate').isISO8601().withMessage('Valid appointment date is required'),
  body('appointmentTime').notEmpty().withMessage('Appointment time is required'),
  body('type').isIn(Object.values(AppointmentType)).withMessage('Valid appointment type is required'),

  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
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

      // Validate patient exists
      const patient = await prisma.patient.findUnique({
        where: { id: patientId }
      });

      if (!patient) {
        return res.status(404).json({ message: 'Patient not found' });
      }

      // Validate doctor exists
      const doctor = await prisma.user.findUnique({
        where: { id: doctorId }
      });

      if (!doctor) {
        return res.status(404).json({ message: 'Doctor not found' });
      }

      // Validate department exists
      const department = await prisma.department.findUnique({
        where: { id: departmentId }
      });

      if (!department) {
        return res.status(404).json({ message: 'Department not found' });
      }

      const appointment = await prisma.appointment.create({
        data: {
          patientId,
          doctorId,
          departmentId,
          title,
          description,
          appointmentDate: new Date(appointmentDate),
          appointmentTime,
          duration,
          type,
          status: 'scheduled',
          createdBy: (req as any).user?.id || 'system'
        },
        include: {
          patient: {
            select: {
              surname: true,
              otherNames: true,
              folderNumber: true
            }
          },
          doctor: {
            select: {
              fullName: true
            }
          },
          department: {
            select: {
              name: true
            }
          }
        }
      });

      res.status(201).json({
        message: 'Appointment created successfully',
        appointment
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

export const updateAppointment = [
  body('status').optional().isIn(Object.values(AppointmentStatus)).withMessage('Valid status is required'),
  body('type').optional().isIn(Object.values(AppointmentType)).withMessage('Valid type is required'),

  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const updateData = req.body;

      const appointment = await prisma.appointment.findUnique({
        where: { id }
      });

      if (!appointment) {
        return res.status(404).json({ message: 'Appointment not found' });
      }

      // Handle check-in automatically when status changes to checked_in
      if (updateData.status === 'checked_in' && !appointment.checkedIn) {
        updateData.checkedIn = true;
        updateData.checkedInAt = new Date();
      }

      const updatedAppointment = await prisma.appointment.update({
        where: { id },
        data: {
          ...updateData,
          updatedAt: new Date()
        },
        include: {
          patient: {
            select: {
              surname: true,
              otherNames: true,
              folderNumber: true
            }
          },
          doctor: {
            select: {
              fullName: true
            }
          }
        }
      });

      res.json(updatedAppointment);
    } catch (error) {
      console.error('Error updating appointment:', error);
      res.status(500).json({ 
        message: 'Error updating appointment', 
        error: (error as Error).message 
      });
    }
  }
];

export const deleteAppointment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const appointment = await prisma.appointment.findUnique({
      where: { id }
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    await prisma.appointment.delete({
      where: { id }
    });

    res.json({ 
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

// Add this to your existing appointmentController.js
export const getAppointmentStatistics = async (req: Request, res: Response) => {
  try {
    const { dateFrom } = req.query;
    
    const whereClause: any = {};
    
    if (dateFrom) {
      whereClause.appointmentDate = {
        gte: new Date(dateFrom as string)
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [stats, todayStats] = await Promise.all([
      // Overall statistics
      prisma.appointment.groupBy({
        by: ['status'],
        where: whereClause,
        _count: {
          id: true
        }
      }),
      
      // Today's appointments
      prisma.appointment.count({
        where: {
          appointmentDate: {
            gte: today
          },
          status: {
            in: ['scheduled', 'confirmed']
          }
        }
      })
    ]);

    // Transform to more usable format
    const result = {
      scheduled: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
      today: todayStats
    };

    stats.forEach(stat => {
      result[stat.status] = stat._count.id;
    });

    res.json(result);
  } catch (error) {
    console.error('Appointment stats error:', error);
    res.status(500).json({ 
      error: 'Failed to load appointment statistics',
      details: error.message 
    });
  }
};

export const getDoctorSchedule = async (req: Request, res: Response) => {
  try {
    const { doctorId, date } = req.query;
    
    if (!doctorId || !date) {
      return res.status(400).json({ 
        message: 'Doctor ID and date are required' 
      });
    }

    const targetDate = new Date(date as string);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const appointments = await prisma.appointment.findMany({
      where: {
        doctorId: doctorId as string,
        appointmentDate: {
          gte: targetDate,
          lt: nextDay
        }
      },
      include: {
        patient: {
          select: {
            surname: true,
            otherNames: true,
            folderNumber: true
          }
        },
        department: {
          select: {
            name: true
          }
        }
      },
      orderBy: { appointmentDate: 'asc' }
    });

    res.json(appointments);
  } catch (error) {
    console.error('Error fetching doctor schedule:', error);
    res.status(500).json({ 
      message: 'Error fetching doctor schedule', 
      error: (error as Error).message 
    });
  }
};