import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/authMiddleware';

const prisma = new PrismaClient();

// ==============================================
// 1. GET BOOKING BY ATTENDANCE ID
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

    let booking = await prisma.antenatalBooking.findFirst({
      where: { attendanceId: attendance.id },
      include: { visits: { orderBy: { visitNumber: 'asc' } }, patient: true }
    });

    res.json({
      success: true,
      data: { attendance, booking: booking || null, visits: booking?.visits || [] }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching antenatal data' });
  }
};

// ==============================================
// 2. GET BOOKING BY BOOKING ID (Primary)
// ==============================================
export const getAntenatalBookingById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const booking = await prisma.antenatalBooking.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true, dateOfBirth: true, gender: true, contact: true } },
        visits: { orderBy: { visitNumber: 'asc' } }
      }
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Antenatal booking not found' });
    }
    res.json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching booking' });
  }
};

// ==============================================
// 3. GET ACTIVE BOOKING BY PATIENT ID (Convenience)
// ==============================================
export const getActiveBookingByPatient = async (req: AuthRequest, res: Response) => {
  try {
    const { patientId } = req.params;

    let booking = await prisma.antenatalBooking.findFirst({
      where: { patientId, isActive: true, isCompleted: false },
      include: {
        patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true, dateOfBirth: true, gender: true, contact: true } },
        visits: { orderBy: { visitNumber: 'asc' } }
      }
    });

    if (!booking) {
      booking = await prisma.antenatalBooking.findFirst({
        where: { patientId },
        orderBy: { createdAt: 'desc' },
        include: {
          patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true, dateOfBirth: true, gender: true, contact: true } },
          visits: { orderBy: { visitNumber: 'asc' } }
        }
      });
    }

    if (!booking) {
      return res.status(404).json({ success: false, message: 'No antenatal booking found for this patient' });
    }
    res.json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching booking' });
  }
};

// ==============================================
// 4. CLOSE BOOKING BY BOOKING ID (Primary)
// ==============================================
export const closeAntenatalBooking = [
  body('deliveryDate').optional().isISO8601(),
  body('deliveryOutcome').optional().isString(),
  body('deliveryRecordId').optional().isString(),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;  // ✅ Booking ID
      const { deliveryDate, deliveryOutcome, deliveryRecordId } = req.body;

      const booking = await prisma.antenatalBooking.findUnique({ where: { id } });
      if (!booking) {
        return res.status(404).json({ success: false, message: 'Antenatal booking not found' });
      }

      const updatedBooking = await prisma.antenatalBooking.update({
        where: { id },
        data: {
          isActive: false,
          isCompleted: true,
          deliveryDate: deliveryDate ? new Date(deliveryDate) : new Date(),
          deliveryOutcome: deliveryOutcome || 'delivered',
          deliveryRecordId: deliveryRecordId,
          updatedAt: new Date()
        },
        include: { patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true } } }
      });

      res.json({ success: true, message: 'Antenatal booking closed successfully', data: updatedBooking });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error closing booking' });
    }
  }
];

// ==============================================
// 5. GET ANC VISITS BY BOOKING ID
// ==============================================
export const getANCVisitsByBooking = async (req: AuthRequest, res: Response) => {
  try {
    const { bookingId } = req.params;
    const booking = await prisma.antenatalBooking.findUnique({
      where: { id: bookingId },
      include: {
        visits: { orderBy: { visitNumber: 'asc' }, include: { recordedBy: { select: { fullName: true, role: true } } } },
        patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true, dateOfBirth: true, gender: true, contact: true } }
      }
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    res.json({ success: true, data: { booking, visits: booking.visits } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching ANC visits' });
  }
};

// ==============================================
// 7. GET SINGLE ANC VISIT BY ID
// ==============================================
export const getANCVisitById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const visit = await prisma.aNCVisit.findUnique({
      where: { id },
      include: {
        booking: { include: { patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true, dateOfBirth: true, gender: true, contact: true } } } },
        recordedBy: { select: { fullName: true, role: true } }
      }
    });

    if (!visit) {
      return res.status(404).json({ success: false, message: 'ANC visit not found' });
    }
    res.json({ success: true, data: visit });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching ANC visit' });
  }
};

// ==============================================
// 8. UPDATE ANC VISIT
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
      const updatedVisit = await prisma.aNCVisit.update({
        where: { id },
        data: req.body,
        include: { recordedBy: { select: { fullName: true, role: true } } }
      });

      res.json({ success: true, message: 'ANC visit updated', data: updatedVisit });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error updating ANC visit' });
    }
  }
];

// ==============================================
// 9. DELETE ANC VISIT
// ==============================================
export const deleteANCVisit = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.aNCVisit.delete({ where: { id } });
    res.json({ success: true, message: 'ANC visit deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting ANC visit' });
  }
};

// ==============================================
// 10. GET ALL BOOKINGS (Paginated)
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
        include: { patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true, contact: true, dateOfBirth: true } }, _count: { select: { visits: true } } },
        orderBy: { bookingDate: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.antenatalBooking.count({ where })
    ]);

    res.json({ success: true, data: bookings, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching bookings' });
  }
};

// ==============================================
// 11. GET STATISTICS
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

    const [totalBookings, activeBookings, highRiskBookings, totalVisits, iptpDosesGiven, ttDosesGiven] = await Promise.all([
      prisma.antenatalBooking.count({ where }),
      prisma.antenatalBooking.count({ where: { ...where, isActive: true } }),
      prisma.antenatalBooking.count({ where: { ...where, riskLevel: 'high' } }),
      prisma.aNCVisit.count({ where: { visitDate: startDate || endDate ? { ...(startDate && { gte: new Date(startDate as string) }), ...(endDate && { lte: new Date(endDate as string) }) } : undefined } }),
      prisma.aNCVisit.count({ where: { iptpGiven: true, visitDate: startDate || endDate ? { ...(startDate && { gte: new Date(startDate as string) }), ...(endDate && { lte: new Date(endDate as string) }) } : undefined } }),
      prisma.aNCVisit.count({ where: { ttGiven: true, visitDate: startDate || endDate ? { ...(startDate && { gte: new Date(startDate as string) }), ...(endDate && { lte: new Date(endDate as string) }) } : undefined } })
    ]);

    res.json({ success: true, data: { totalBookings, activeBookings, highRiskBookings, totalVisits, iptpDosesGiven, ttDosesGiven, averageVisitsPerBooking: totalBookings > 0 ? totalVisits / totalBookings : 0 } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching statistics' });
  }
};

// ==============================================
// DELIVERY CONTROLLER FUNCTIONS
// ==============================================

export const getDeliveryRecords = async (req: AuthRequest, res: Response) => {
  try {
    const { patientId, startDate, endDate, page = 1, limit = 50 } = req.query;
    
    const where: any = {};
    if (patientId) where.patientId = patientId as string;
    if (startDate || endDate) {
      where.deliveryDate = {};
      if (startDate) where.deliveryDate.gte = new Date(startDate as string);
      if (endDate) where.deliveryDate.lte = new Date(endDate as string);
    }
    
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;
    
    const [records, total] = await Promise.all([
      prisma.deliveryRecord.findMany({
        where,
        include: {
          patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true } },
          attendance: { select: { attendanceNumber: true, dateTime: true } },
          Newborn: true,
          antenatalBooking: { select: { id: true, gravida: true, para: true } }
        },
        orderBy: { deliveryDate: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.deliveryRecord.count({ where })
    ]);
    
    res.json({
      success: true,
      data: records,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    console.error('Error fetching delivery records:', error);
    res.status(500).json({ success: false, message: 'Error fetching delivery records' });
  }
};

export const getDeliveryRecord = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const record = await prisma.deliveryRecord.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true } },
        attendance: { select: { attendanceNumber: true, dateTime: true } },
        Newborn: true,
        antenatalBooking: { select: { id: true, gravida: true, para: true, edd: true } }
      }
    });
    
    if (!record) {
      return res.status(404).json({ success: false, message: 'Delivery record not found' });
    }
    
    res.json({ success: true, data: record });
  } catch (error) {
    console.error('Error fetching delivery record:', error);
    res.status(500).json({ success: false, message: 'Error fetching delivery record' });
  }
};

export const createDeliveryRecord = [
  body('patientId').notEmpty().withMessage('Patient ID required'),
  body('attendanceId').notEmpty().withMessage('Attendance ID required'),
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }
      
      const record = await prisma.deliveryRecord.create({
        data: {
          ...req.body,
          createdById: req.user!.id
        },
        include: {
          patient: true,
          attendance: true,
          Newborn: true
        }
      });
      
      // If there's an antenatal booking, close it
      if (req.body.antenatalBookingId) {
        await prisma.antenatalBooking.update({
          where: { id: req.body.antenatalBookingId },
          data: {
            isActive: false,
            isCompleted: true,
            deliveryDate: new Date(),
            deliveryOutcome: req.body.deliveryOutcome || 'delivered',
            deliveryRecordId: record.id
          }
        });
      }
      
      res.status(201).json({ success: true, data: record });
    } catch (error) {
      console.error('Error creating delivery record:', error);
      res.status(500).json({ success: false, message: 'Error creating delivery record' });
    }
  }
];

export const updateDeliveryRecord = [
  body('deliveryDate').optional().isISO8601(),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const record = await prisma.deliveryRecord.update({
        where: { id },
        data: req.body,
        include: { Newborn: true }
      });
      res.json({ success: true, data: record });
    } catch (error) {
      console.error('Error updating delivery record:', error);
      res.status(500).json({ success: false, message: 'Error updating delivery record' });
    }
  }
];

export const deleteDeliveryRecord = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.deliveryRecord.delete({ where: { id } });
    res.json({ success: true, message: 'Delivery record deleted successfully' });
  } catch (error) {
    console.error('Error deleting delivery record:', error);
    res.status(500).json({ success: false, message: 'Error deleting delivery record' });
  }
};

export const getDeliveryStatistics = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const where: any = {};
    if (startDate || endDate) {
      where.deliveryDate = {};
      if (startDate) where.deliveryDate.gte = new Date(startDate as string);
      if (endDate) where.deliveryDate.lte = new Date(endDate as string);
    }
    
    const [total, liveBirths, stillbirths, cSections, maternalDeaths] = await Promise.all([
      prisma.deliveryRecord.count({ where }),
      prisma.deliveryRecord.count({ where: { ...where, deliveryOutcome: 'live_birth' } }),
      prisma.deliveryRecord.count({ where: { ...where, deliveryOutcome: { in: ['stillbirth_fresh', 'stillbirth_macerated'] } } }),
      prisma.deliveryRecord.count({ where: { ...where, deliveryType: 'caesarean_section' } }),
      prisma.deliveryRecord.count({ where: { ...where, maternalOutcome: { not: 'alive' } } })
    ]);
    
    res.json({
      success: true,
      data: { total, liveBirths, stillbirths, cSections, maternalDeaths }
    });
  } catch (error) {
    console.error('Error fetching delivery statistics:', error);
    res.status(500).json({ success: false, message: 'Error fetching statistics' });
  }
};

// ==============================================
// POSTNATAL CONTROLLER FUNCTIONS
// ==============================================

export const getPostnatalRecords = async (req: AuthRequest, res: Response) => {
  try {
    const { patientId, startDate, endDate, page = 1, limit = 50 } = req.query;
    
    const where: any = {};
    if (patientId) where.patientId = patientId as string;
    if (startDate || endDate) {
      where.examinationDate = {};
      if (startDate) where.examinationDate.gte = new Date(startDate as string);
      if (endDate) where.examinationDate.lte = new Date(endDate as string);
    }
    
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;
    
    const [records, total] = await Promise.all([
      prisma.postnatalRecord.findMany({
        where,
        include: {
          patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true } },
          attendance: { select: { attendanceNumber: true, dateTime: true } },
          deliveryRecord: { include: { Newborn: true } }
        },
        orderBy: { examinationDate: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.postnatalRecord.count({ where })
    ]);
    
    res.json({
      success: true,
      data: records,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    console.error('Error fetching postnatal records:', error);
    res.status(500).json({ success: false, message: 'Error fetching postnatal records' });
  }
};

export const getPostnatalRecord = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const record = await prisma.postnatalRecord.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true } },
        attendance: { select: { attendanceNumber: true, dateTime: true } },
        deliveryRecord: { include: { Newborn: true } }
      }
    });
    
    if (!record) {
      return res.status(404).json({ success: false, message: 'Postnatal record not found' });
    }
    
    res.json({ success: true, data: record });
  } catch (error) {
    console.error('Error fetching postnatal record:', error);
    res.status(500).json({ success: false, message: 'Error fetching postnatal record' });
  }
};

export const createPostnatalRecord = [
  body('patientId').notEmpty().withMessage('Patient ID required'),
  body('attendanceId').notEmpty().withMessage('Attendance ID required'),
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }
      
      const record = await prisma.postnatalRecord.create({
        data: {
          ...req.body,
          createdById: req.user!.id
        },
        include: {
          patient: true,
          attendance: true,
          deliveryRecord: true
        }
      });
      
      res.status(201).json({ success: true, data: record });
    } catch (error) {
      console.error('Error creating postnatal record:', error);
      res.status(500).json({ success: false, message: 'Error creating postnatal record' });
    }
  }
];

export const updatePostnatalRecord = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const record = await prisma.postnatalRecord.update({
      where: { id },
      data: req.body
    });
    res.json({ success: true, data: record });
  } catch (error) {
    console.error('Error updating postnatal record:', error);
    res.status(500).json({ success: false, message: 'Error updating postnatal record' });
  }
};

export const deletePostnatalRecord = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.postnatalRecord.delete({ where: { id } });
    res.json({ success: true, message: 'Postnatal record deleted successfully' });
  } catch (error) {
    console.error('Error deleting postnatal record:', error);
    res.status(500).json({ success: false, message: 'Error deleting postnatal record' });
  }
};

export const getPostnatalStatistics = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const where: any = {};
    if (startDate || endDate) {
      where.examinationDate = {};
      if (startDate) where.examinationDate.gte = new Date(startDate as string);
      if (endDate) where.examinationDate.lte = new Date(endDate as string);
    }
    
    const [total, day7, day14, day28, day42] = await Promise.all([
      prisma.postnatalRecord.count({ where }),
      prisma.postnatalRecord.count({ where: { ...where, dayNumber: 7 } }),
      prisma.postnatalRecord.count({ where: { ...where, dayNumber: 14 } }),
      prisma.postnatalRecord.count({ where: { ...where, dayNumber: 28 } }),
      prisma.postnatalRecord.count({ where: { ...where, dayNumber: 42 } })
    ]);
    
    res.json({
      success: true,
      data: { total, day7, day14, day28, day42 }
    });
  } catch (error) {
    console.error('Error fetching postnatal statistics:', error);
    res.status(500).json({ success: false, message: 'Error fetching statistics' });
  }
};
