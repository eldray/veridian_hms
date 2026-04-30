// controllers/antenatalController.ts - FIXED VERSION (Based on actual schema)
// REMOVED: createAntenatalFromAttendance (now in attendance controller)
// REMOVED: recordANCVisitFromAttendance (now in attendance controller)
// KEPT: Only READ, UPDATE, DELETE, and REPORT operations

import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/authMiddleware';

const prisma = new PrismaClient();

// ==============================================
// GET ANTENATAL BOOKING BY ATTENDANCE
// ==============================================
export const getAntenatalByAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { attendanceId } = req.params;

    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: { Patient: true }
    });

    if (!attendance) {
      return res.status(404).json({ success: false, message: 'Attendance not found' });
    }

    if (attendance.attendanceType !== 'antenatal') {
      return res.status(400).json({ 
        success: false, 
        message: 'This attendance is not an antenatal visit' 
      });
    }

    // Get booking linked to this attendance OR active booking
// Get booking linked to this attendance OR active booking
    let booking = null;

    // Check if there's an antenatal booking linked via attendanceId
    if (attendance.attendanceType === 'antenatal') {
      // Find the booking where this attendance is the first ANC attendance
      booking = await prisma.antenatalBooking.findFirst({
        where: { 
          attendanceId: attendance.id  // ✅ Use attendanceId field
        },
        include: {
          visits: { orderBy: { visitNumber: 'asc' } },
          patient: true
        }
      });

    } else {
      // Fallback: find active booking
      booking = await prisma.antenatalBooking.findFirst({
        where: { 
          patientId: attendance.patientId,
          isActive: true,
          isCompleted: false
        },
        include: {
          visits: { orderBy: { visitNumber: 'asc' } },
          patient: true
        }
      });
    }

    res.json({
      success: true,
      data: {
        attendance,
        booking: booking || null,
        visits: booking?.visits || []
      }
    });
  } catch (error) {
    console.error('Error fetching antenatal by attendance:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching antenatal data',
      error: (error as Error).message 
    });
  }
};

// ==============================================
// UPDATE ANC VISIT (for editing after creation)
// ==============================================
export const updateANCVisit = [
  body('gestationalAgeWeeks').optional().isInt({ min: 0, max: 42 }),
  body('weight').optional().isFloat({ min: 0 }),
  body('bloodPressure').optional().isString(),
  body('fetalHeartRate').optional().isInt({ min: 60, max: 200 }),
  body('iptpGiven').optional().isBoolean(),
  body('iptpDoseNumber').optional().isInt({ min: 1, max: 10 }),
  body('ttGiven').optional().isBoolean(),
  body('ttDoseNumber').optional().isInt({ min: 1, max: 5 }),
  body('dangerSignsPresent').optional().isBoolean(),
  body('referralMade').optional().isBoolean(),

  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { id } = req.params;
      const updateData = req.body;

      const updatedVisit = await prisma.aNCVisit.update({
        where: { id },
        data: updateData,
        include: {
          recordedBy: { select: { fullName: true, role: true } }
        }
      });

      res.json({
        success: true,
        message: 'ANC visit updated',
        data: updatedVisit
      });
    } catch (error) {
      console.error('Error updating ANC visit:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error updating ANC visit',
        error: (error as Error).message 
      });
    }
  }
];

// ==============================================
// DELETE ANC VISIT
// ==============================================
export const deleteANCVisit = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.aNCVisit.delete({ where: { id } });

    res.json({
      success: true,
      message: 'ANC visit deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting ANC visit:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting ANC visit',
      error: (error as Error).message 
    });
  }
};

// ==============================================
// GET ANC VISITS BY BOOKING
// ==============================================
export const getANCVisitsByBooking = async (req: AuthRequest, res: Response) => {
  try {
    const { bookingId } = req.params;

    const booking = await prisma.antenatalBooking.findUnique({
      where: { id: bookingId },
      include: {
        visits: {
          orderBy: { visitNumber: 'asc' },
          include: {
            recordedBy: { select: { fullName: true, role: true } }
          }
        },
        patient: {
          select: {
            id: true,
            surname: true,
            otherNames: true,
            folderNumber: true,
            dateOfBirth: true,
            gender: true,
            contact: true
          }
        }
      }
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    res.json({
      success: true,
      data: {
        booking,
        visits: booking.visits
      }
    });
  } catch (error) {
    console.error('Error fetching ANC visits:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching ANC visits',
      error: (error as Error).message 
    });
  }
};

// ==============================================
// GET ANC VISITS BY ATTENDANCE
// ==============================================
export const getANCVisitsByAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { attendanceId } = req.params;

    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: { Patient: true }
    });

    if (!attendance) {
      return res.status(404).json({ success: false, message: 'Attendance not found' });
    }

    // Find booking for this patient
    const booking = await prisma.antenatalBooking.findFirst({
      where: { 
        patientId: attendance.patientId,
        isActive: true,
        isCompleted: false
      },
      include: {
        visits: {
          orderBy: { visitNumber: 'asc' },
          include: {
            recordedBy: { select: { fullName: true, role: true } }
          }
        }
      }
    });

    res.json({
      success: true,
      data: {
        attendance,
        booking: booking || null,
        visits: booking?.visits || []
      }
    });
  } catch (error) {
    console.error('Error fetching ANC visits by attendance:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching ANC visits',
      error: (error as Error).message 
    });
  }
};

// ==============================================
// GET SINGLE ANC VISIT
// ==============================================
export const getANCVisitById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const visit = await prisma.aNCVisit.findUnique({
      where: { id },
      include: {
        booking: {
          include: {
            patient: {
              select: {
                id: true,
                surname: true,
                otherNames: true,
                folderNumber: true,
                dateOfBirth: true,
                gender: true,
                contact: true
              }
            }
          }
        },
        recordedBy: { select: { fullName: true, role: true } }
      }
    });

    if (!visit) {
      return res.status(404).json({ success: false, message: 'ANC visit not found' });
    }

    res.json({ success: true, data: visit });
  } catch (error) {
    console.error('Error fetching ANC visit:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching ANC visit',
      error: (error as Error).message 
    });
  }
};

// ==============================================
// GET ALL ANTENATAL BOOKINGS (with pagination)
// ==============================================
export const getAntenatalBookings = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 50, isActive = 'true', patientId } = req.query;

    const where: any = {};
    if (isActive === 'true') where.isActive = true;
    if (isActive === 'false') where.isActive = false;
    if (patientId) where.patientId = patientId as string;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    const [bookings, total] = await Promise.all([
      prisma.antenatalBooking.findMany({
        where,
        include: {
          patient: {
            select: {
              id: true,
              surname: true,
              otherNames: true,
              folderNumber: true,
              contact: true,
              dateOfBirth: true
            }
          },
          _count: { select: { visits:true } }
        },
        orderBy: { bookingDate: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.antenatalBooking.count({ where })
    ]);

    res.json({
      success: true,
      data: bookings,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching antenatal bookings:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching bookings',
      error: (error as Error).message 
    });
  }
};

// ==============================================
// GET SINGLE ANTENATAL BOOKING BY PATIENT ID
// ==============================================
export const getAntenatalBooking = async (req: AuthRequest, res: Response) => {
  try {
    const { patientId } = req.params;

    // Find active booking first, then fallback to most recent
    let booking = await prisma.antenatalBooking.findFirst({
      where: { 
        patientId,
        isActive: true,
        isCompleted: false
      },
      include: {
        patient: {
          select: {
            id: true,
            surname: true,
            otherNames: true,
            folderNumber: true,
            dateOfBirth: true,
            gender: true,
            contact: true
          }
        },
        visits: { orderBy: { visitNumber: 'asc' } }
      }
    });

    // If no active booking, get the most recent completed one
    if (!booking) {
      booking = await prisma.antenatalBooking.findFirst({
        where: { patientId },
        orderBy: { createdAt: 'desc' },
        include: {
          patient: {
            select: {
              id: true,
              surname: true,
              otherNames: true,
              folderNumber: true,
              dateOfBirth: true,
              gender: true,
              contact: true
            }
          },
          visits: { orderBy: { visitNumber: 'asc' } }
        }
      });
    }

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'No antenatal booking found for this patient'
      });
    }

    res.json({ success: true, data: booking });
  } catch (error) {
    console.error('Error fetching antenatal booking:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching booking',
      error: (error as Error).message 
    });
  }
};

// ==============================================
// CLOSE ANTENATAL BOOKING (after delivery)
// ==============================================
export const closeAntenatalBooking = [
  body('deliveryDate').optional().isISO8601(),
  body('deliveryOutcome').optional().isString(),
  body('deliveryRecordId').optional().isString(),

  async (req: AuthRequest, res: Response) => {
    try {
      const { patientId } = req.params;
      const { deliveryDate, deliveryOutcome, deliveryRecordId } = req.body;

      const booking = await prisma.antenatalBooking.findFirst({
        where: { 
          patientId,
          isActive: true,
          isCompleted: false
        }
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'No active antenatal booking found'
        });
      }

      const updatedBooking = await prisma.antenatalBooking.update({
        where: { id: booking.id },
        data: {
          isActive: false,
          isCompleted: true,
          deliveryDate: deliveryDate ? new Date(deliveryDate) : new Date(),
          deliveryOutcome: deliveryOutcome || 'delivered',
          deliveryRecordId: deliveryRecordId,
          updatedAt: new Date()
        },
        include: {
          patient: {
            select: {
              id: true,
              surname: true,
              otherNames: true,
              folderNumber: true
            }
          }
        }
      });

      res.json({
        success: true,
        message: 'Antenatal booking closed successfully',
        data: updatedBooking
      });
    } catch (error) {
      console.error('Error closing antenatal booking:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error closing booking',
        error: (error as Error).message 
      });
    }
  }
];

// ==============================================
// GET ANC STATISTICS (for dashboard)
// ==============================================
export const getANCStatistics = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {};
    if (startDate || endDate) {
      where.bookingDate = {};
      if (startDate) where.bookingDate.gte = new Date(startDate as string);
      if (endDate) where.bookingDate.lte = new Date(endDate as string);
    }

    const [
      totalBookings,
      activeBookings,
      highRiskBookings,
      totalVisits,
      iptpDosesGiven,
      ttDosesGiven
    ] = await Promise.all([
      prisma.antenatalBooking.count({ where }),
      prisma.antenatalBooking.count({ where: { ...where, isActive: true } }),
      prisma.antenatalBooking.count({ where: { ...where, riskLevel: 'high' } }),
      prisma.aNCVisit.count({
        where: {
          visitDate: startDate || endDate ? {
            ...(startDate && { gte: new Date(startDate as string) }),
            ...(endDate && { lte: new Date(endDate as string) })
          } : undefined
        }
      }),
      prisma.aNCVisit.count({
        where: {
          iptpGiven: true,
          visitDate: startDate || endDate ? {
            ...(startDate && { gte: new Date(startDate as string) }),
            ...(endDate && { lte: new Date(endDate as string) })
          } : undefined
        }
      }),
      prisma.aNCVisit.count({
        where: {
          ttGiven: true,
          visitDate: startDate || endDate ? {
            ...(startDate && { gte: new Date(startDate as string) }),
            ...(endDate && { lte: new Date(endDate as string) })
          } : undefined
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        totalBookings,
        activeBookings,
        highRiskBookings,
        totalVisits,
        iptpDosesGiven,
        ttDosesGiven,
        averageVisitsPerBooking: totalBookings > 0 ? totalVisits / totalBookings : 0
      }
    });
  } catch (error) {
    console.error('Error fetching ANC statistics:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching statistics',
      error: (error as Error).message 
    });
  }
};

// ==============================================
// GET POSTNATAL DATA BY ATTENDANCE
// ==============================================
export const getPostnatalByAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { attendanceId } = req.params;

    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        Patient: true,
        deliveryRecords: {
          include: { Newborn: true }
        }
      }
    });

    if (!attendance) {
      return res.status(404).json({ success: false, message: 'Attendance not found' });
    }

    if (attendance.attendanceType !== 'postnatal') {
      return res.status(400).json({
        success: false,
        message: 'This attendance is not a postnatal visit'
      });
    }

    // Get linked pregnancy (most recent completed)
    const booking = await prisma.antenatalBooking.findFirst({
      where: { 
        patientId: attendance.patientId,
        isCompleted: true,
        deliveryDate: { not: null }
      },
      orderBy: { deliveryDate: 'desc' }
    });

    res.json({
      success: true,
      data: {
        attendance,
        booking: booking || null,
        deliveryRecords: attendance.deliveryRecords || []
      }
    });
  } catch (error) {
    console.error('Error fetching postnatal data:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching postnatal data',
      error: (error as Error).message 
    });
  }
};

// ==============================================
// RECORD POSTNATAL EXAMINATION
// ==============================================
export const recordPostnatalExamination = [
  body('attendanceId').notEmpty().withMessage('Attendance ID is required'),
  body('maternalCondition').optional().isString(),
  body('babyCondition').optional().isString(),
  body('breastfeedingStatus').optional().isString(),
  body('familyPlanningMethod').optional().isString(),
  body('immunizationsGiven').optional().isString(),
  body('nextVisitDate').optional().isISO8601(),

  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const {
        attendanceId,
        maternalCondition,
        babyCondition,
        breastfeedingStatus,
        familyPlanningMethod,
        immunizationsGiven,
        nextVisitDate,
        notes
      } = req.body;

      if (!req.user?.id) {
        return res.status(401).json({ success: false, message: 'User authentication required' });
      }

      const attendance = await prisma.attendance.findUnique({
        where: { id: attendanceId },
        include: { Patient: true }
      });

      if (!attendance) {
        return res.status(404).json({ success: false, message: 'Attendance not found' });
      }

      if (attendance.attendanceType !== 'postnatal') {
        return res.status(400).json({
          success: false,
          message: 'This attendance is not a postnatal visit'
        });
      }

      const updatedAttendance = await prisma.attendance.update({
        where: { id: attendanceId },
        data: {
          medicalNotes: `
Postnatal Examination:
Maternal: ${maternalCondition || 'N/A'}
Baby: ${babyCondition || 'N/A'}
Breastfeeding: ${breastfeedingStatus || 'N/A'}
Family Planning: ${familyPlanningMethod || 'N/A'}
Immunizations: ${immunizationsGiven || 'N/A'}
Next Visit: ${nextVisitDate || 'N/A'}
${notes ? `Notes: ${notes}` : ''}
          `.trim(),
          updatedById: req.user.id,
          updatedAt: new Date()
        },
        include: { Patient: true }
      });

      res.json({
        success: true,
        message: 'Postnatal examination recorded',
        data: updatedAttendance
      });
    } catch (error) {
      console.error('Error recording postnatal examination:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error recording postnatal examination',
        error: (error as Error).message 
      });
    }
  }
];