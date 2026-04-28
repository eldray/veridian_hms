// controllers/antenatalController.ts - COMPLETE WITH ALL REQUIRED FUNCTIONS
import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient, AntenatalRisk, AttendanceType } from '@prisma/client';
import { AuthRequest } from '../middleware/authMiddleware';

const prisma = new PrismaClient();

// ==============================================
// HELPER FUNCTIONS
// ==============================================

function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

function calculateGestationalAge(lmp: Date, asOfDate: Date = new Date()): number {
  const diffTime = asOfDate.getTime() - lmp.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return Math.floor(diffDays / 7);
}

function calculateEDD(lmp: Date): Date {
  const edd = new Date(lmp);
  edd.setDate(edd.getDate() + 280);
  return edd;
}

function determineRiskLevel(data: any): AntenatalRisk {
  if (data.age && data.age > 35) return 'high';
  if (data.age && data.age < 18) return 'high';
  if (data.gravida > 5) return 'high';
  if (data.previousComplications) return 'high';
  if (data.chronicDisease) return 'high';
  if (data.multiplePregnancy) return 'high';
  if (data.gravida === 1) return 'medium';
  if (data.bookingWeight && data.bookingWeight < 45) return 'medium';
  if (data.bookingWeight && data.bookingWeight > 100) return 'medium';
  if (data.previousCS) return 'medium';
  return 'low';
}

// ==============================================
// GET/POST NATAL BOOKING BY ATTENDANCE
// ==============================================

export const getAntenatalByAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { attendanceId } = req.params;

    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        Patient: true
      }
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance not found'
      });
    }

    if (attendance.attendanceType !== 'antenatal' && attendance.attendanceType !== 'postnatal') {
      return res.status(400).json({
        success: false,
        message: 'This attendance is not an antenatal or postnatal visit'
      });
    }

    const booking = await prisma.antenatalBooking.findUnique({
      where: { patientId: attendance.patientId },
      include: {
        ANCVisit: {
          orderBy: { visitNumber: 'asc' }
        },
        patient: {
          select: {
            surname: true,
            otherNames: true,
            folderNumber: true,
            dateOfBirth: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: {
        attendance,
        booking: booking || null,
        visits: booking?.ANCVisit || []
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
// CREATE/UPDATE ANTENATAL BOOKING FROM ATTENDANCE
// ==============================================
export const createAntenatalFromAttendance = [
  body('attendanceId').notEmpty().withMessage('Attendance ID is required'),
  body('lmp').optional().isISO8601().withMessage('Valid LMP date required'),
  body('gravida').isInt({ min: 1 }).withMessage('Gravida must be at least 1'),
  body('para').isInt({ min: 0 }).withMessage('Para must be non-negative'),

  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const {
        attendanceId,
        lmp,
        gravida,
        para,
        bookingWeight,
        bookingBP,
        bloodGroup,
        rhesusStatus,
        hivStatus,
        syphilisStatus,
        hepatitisBStatus,
        riskNotes
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

      if (attendance.attendanceType !== 'antenatal') {
        return res.status(400).json({
          success: false,
          message: 'This attendance is not an antenatal visit'
        });
      }

      const patient = attendance.Patient;
      const existingBooking = await prisma.antenatalBooking.findUnique({
        where: { patientId: patient.id }
      });

      let edd: Date | undefined;
      let calculatedGestationalAge: number | undefined;

      if (lmp) {
        const lmpDate = new Date(lmp);
        edd = calculateEDD(lmpDate);
        calculatedGestationalAge = calculateGestationalAge(lmpDate, attendance.dateTime);
      }

      const riskData = {
        age: calculateAge(patient.dateOfBirth),
        gravida: parseInt(gravida),
        bookingWeight: bookingWeight ? parseFloat(bookingWeight) : undefined
      };
      const riskLevel = determineRiskLevel(riskData);
      const userRole = req.user.role;
      const isMidwifeOrDoctor = userRole === 'midwife' || userRole === 'doctor' || userRole === 'admin';

      const booking = await prisma.antenatalBooking.upsert({
        where: { patientId: patient.id },
        update: {
          bookingDate: new Date(),
          lmp: lmp ? new Date(lmp) : undefined,
          gestationalAgeWeeks: calculatedGestationalAge,
          estimatedDeliveryDate: edd,
          gravida: parseInt(gravida),
          para: parseInt(para),
          bloodGroup,
          rhesusStatus,
          hivStatus,
          syphilisStatus,
          hepatitisBStatus,
          bookingWeight: bookingWeight ? parseFloat(bookingWeight) : undefined,
          bookingBP,
          riskLevel,
          riskNotes,
          midwifeId: isMidwifeOrDoctor ? req.user.id : undefined,
          doctorId: userRole === 'doctor' ? req.user.id : undefined,
          isActive: true,
          updatedAt: new Date()
        },
        create: {
          patientId: patient.id,
          attendanceId: attendanceId,
          bookingDate: new Date(),
          lmp: lmp ? new Date(lmp) : undefined,
          gestationalAgeWeeks: calculatedGestationalAge,
          estimatedDeliveryDate: edd,
          gravida: parseInt(gravida),
          para: parseInt(para),
          bloodGroup,
          rhesusStatus,
          hivStatus,
          syphilisStatus,
          hepatitisBStatus,
          bookingWeight: bookingWeight ? parseFloat(bookingWeight) : undefined,
          bookingBP,
          riskLevel,
          riskNotes,
          midwifeId: isMidwifeOrDoctor ? req.user.id : undefined,
          doctorId: userRole === 'doctor' ? req.user.id : undefined,
          isActive: true
        },
        include: {
          patient: true,
          midwife: true,
          doctor: true
        }
      });

      await prisma.attendance.update({
        where: { id: attendanceId },
        data: {
          medicalNotes: `Antenatal booking created. EDD: ${edd?.toLocaleDateString() || 'N/A'}, Risk: ${riskLevel}`
        }
      });

      res.status(201).json({
        success: true,
        message: existingBooking ? 'Antenatal booking updated' : 'Antenatal booking created',
        data: booking
      });
    } catch (error) {
      console.error('Error creating antenatal booking:', error);
      res.status(500).json({ success: false, message: 'Error creating antenatal booking', error: (error as Error).message });
    }
  }
];

// ==============================================
// RECORD ANC VISIT FROM ATTENDANCE
// ==============================================
export const recordANCVisitFromAttendance = [
  body('attendanceId').notEmpty().withMessage('Attendance ID is required'),
  body('gestationalAgeWeeks').optional().isInt({ min: 0, max: 42 }),
  body('weight').optional().isFloat({ min: 0 }),
  body('bloodPressure').optional().isString(),
  body('fetalHeartRate').optional().isInt({ min: 60, max: 200 }),

  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const {
        attendanceId,
        gestationalAgeWeeks,
        weight,
        bloodPressure,
        fetalHeartRate,
        presentingPart,
        oedema,
        urinalysis,
        fundalHeight,
        fetalMovement,
        supplementsGiven,
        ttVaccineGiven,
        itnGiven,
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

      if (attendance.attendanceType !== 'antenatal') {
        return res.status(400).json({
          success: false,
          message: 'This attendance is not an antenatal visit'
        });
      }

      let booking = await prisma.antenatalBooking.findUnique({
        where: { patientId: attendance.patientId }
      });

      if (!booking) {
        booking = await prisma.antenatalBooking.create({
          data: {
            patientId: attendance.patientId,
            attendanceId: attendanceId,
            bookingDate: new Date(),
            gravida: 1,
            para: 0,
            riskLevel: 'low',
            isActive: true,
            midwifeId: req.user.id
          }
        });
      }

      const existingVisits = await prisma.aNCVisit.count({
        where: { bookingId: booking.id }
      });
      const nextVisitNumber = existingVisits + 1;

      const ancVisit = await prisma.aNCVisit.create({
        data: {
          bookingId: booking.id,
          attendanceId: attendanceId,
          visitNumber: nextVisitNumber,
          visitDate: new Date(),
          gestationalAgeWeeks: gestationalAgeWeeks ? parseInt(gestationalAgeWeeks) : undefined,
          weight: weight ? parseFloat(weight) : undefined,
          bloodPressure,
          fetalHeartRate: fetalHeartRate ? parseInt(fetalHeartRate) : undefined,
          presentingPart,
          oedema: oedema === 'true' || oedema === true,
          urinalysis,
          fundalHeight: fundalHeight ? parseFloat(fundalHeight) : undefined,
          fetalMovement: fetalMovement === 'true' || fetalMovement === true,
          supplementsGiven,
          ttVaccineGiven: ttVaccineGiven === 'true' || ttVaccineGiven === true,
          itnGiven: itnGiven === 'true' || itnGiven === true,
          nextVisitDate: nextVisitDate ? new Date(nextVisitDate) : undefined,
          notes,
          recordedById: req.user.id
        },
        include: {
          recordedBy: {
            select: {
              fullName: true,
              role: true
            }
          }
        }
      });

      await prisma.attendance.update({
        where: { id: attendanceId },
        data: {
          medicalNotes: `ANC Visit #${nextVisitNumber} completed. GA: ${gestationalAgeWeeks || '?'} weeks. ${notes || ''}`
        }
      });

      res.status(201).json({
        success: true,
        message: `ANC Visit #${nextVisitNumber} recorded`,
        data: ancVisit
      });
    } catch (error) {
      console.error('Error recording ANC visit:', error);
      res.status(500).json({ success: false, message: 'Error recording ANC visit', error: (error as Error).message });
    }
  }
];

// ==============================================
// GET ANC VISITS FOR ATTENDANCE
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

    const booking = await prisma.antenatalBooking.findUnique({
      where: { patientId: attendance.patientId },
      include: {
        ANCVisit: {
          orderBy: { visitNumber: 'asc' },
          include: {
            recordedBy: {
              select: {
                fullName: true,
                role: true
              }
            }
          }
        }
      }
    });

    res.json({
      success: true,
      data: {
        attendance,
        booking,
        visits: booking?.ANCVisit || []
      }
    });
  } catch (error) {
    console.error('Error fetching ANC visits:', error);
    res.status(500).json({ success: false, message: 'Error fetching ANC visits', error: (error as Error).message });
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
          include: {
            Newborn: true
          }
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

    const booking = await prisma.antenatalBooking.findUnique({
      where: { patientId: attendance.patientId }
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
    res.status(500).json({ success: false, message: 'Error fetching postnatal data', error: (error as Error).message });
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
Postnatal Examination Notes:
Maternal: ${maternalCondition || 'N/A'}
Baby: ${babyCondition || 'N/A'}
Breastfeeding: ${breastfeedingStatus || 'N/A'}
Family Planning: ${familyPlanningMethod || 'N/A'}
Immunizations: ${immunizationsGiven || 'N/A'}
Next Visit: ${nextVisitDate || 'N/A'}
${notes ? `Additional Notes: ${notes}` : ''}
          `.trim(),
          updatedById: req.user.id,
          updatedAt: new Date()
        },
        include: {
          Patient: true
        }
      });

      res.json({
        success: true,
        message: 'Postnatal examination recorded',
        data: updatedAttendance
      });
    } catch (error) {
      console.error('Error recording postnatal examination:', error);
      res.status(500).json({ success: false, message: 'Error recording postnatal examination', error: (error as Error).message });
    }
  }
];

// ==============================================
// ✅ ADD MISSING FUNCTIONS REFERENCED IN ROUTES
// ==============================================

// GET ALL ANTENATAL BOOKINGS (with pagination)
export const getAntenatalBookings = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 50, isActive = 'true' } = req.query;

    const where: any = {};
    if (isActive === 'true') where.isActive = true;
    if (isActive === 'false') where.isActive = false;

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
          midwife: {
            select: {
              id: true,
              fullName: true
            }
          },
          doctor: {
            select: {
              id: true,
              fullName: true
            }
          },
          _count: {
            select: {
              ANCVisit: true
            }
          }
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
    res.status(500).json({ success: false, message: 'Error fetching bookings', error: (error as Error).message });
  }
};

// GET SINGLE ANTENATAL BOOKING BY PATIENT ID
export const getAntenatalBooking = async (req: AuthRequest, res: Response) => {
  try {
    const { patientId } = req.params;

    const booking = await prisma.antenatalBooking.findUnique({
      where: { patientId },
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
        midwife: {
          select: {
            id: true,
            fullName: true
          }
        },
        doctor: {
          select: {
            id: true,
            fullName: true
          }
        },
        ANCVisit: {
          orderBy: { visitNumber: 'asc' }
        }
      }
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'No antenatal booking found for this patient'
      });
    }

    res.json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('Error fetching antenatal booking:', error);
    res.status(500).json({ success: false, message: 'Error fetching booking', error: (error as Error).message });
  }
};

// CLOSE ANTENATAL BOOKING (after delivery)
export const closeAntenatalBooking = [
  body('deliveryDate').optional().isISO8601(),
  body('deliveryOutcome').optional().isString(),

  async (req: AuthRequest, res: Response) => {
    try {
      const { patientId } = req.params;
      const { deliveryDate, deliveryOutcome } = req.body;

      const booking = await prisma.antenatalBooking.update({
        where: { patientId },
        data: {
          isActive: false,
          deliveryDate: deliveryDate ? new Date(deliveryDate) : new Date(),
          deliveryOutcome: deliveryOutcome || 'delivered',
          updatedAt: new Date()
        },
        include: {
          patient: {
            select: {
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
        data: booking
      });
    } catch (error) {
      console.error('Error closing antenatal booking:', error);
      res.status(500).json({ success: false, message: 'Error closing booking', error: (error as Error).message });
    }
  }
];

// GET ANC STATISTICS (for dashboard)
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
      totalVisits
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
      })
    ]);

    res.json({
      success: true,
      data: {
        totalBookings,
        activeBookings,
        highRiskBookings,
        totalVisits,
        averageVisitsPerBooking: totalBookings > 0 ? totalVisits / totalBookings : 0
      }
    });
  } catch (error) {
    console.error('Error fetching ANC statistics:', error);
    res.status(500).json({ success: false, message: 'Error fetching statistics', error: (error as Error).message });
  }
};