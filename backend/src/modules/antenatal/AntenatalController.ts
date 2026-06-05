// modules/antenatal/AntenatalController.ts
import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthRequest } from '../../middleware/authMiddleware';
import { AntenatalRepository } from './AntenatalRepository';
import {
  CreateAntenatalBookingInput,
  UpdateAntenatalBookingInput,
  CreateANCVisitInput,
  UpdateANCVisitInput,
  CreateDeliveryRecordInput,
  CreatePostnatalRecordInput
} from './AntenatalTypes';

export class AntenatalController {
  private repository: AntenatalRepository;

  constructor(prisma: any) {
    this.repository = new AntenatalRepository(prisma);
  }

  // ===================== ANTENATAL BOOKING CONTROLLERS =====================
  getAntenatalByAttendance = async (req: AuthRequest, res: Response) => {
    try {
      const { attendanceId } = req.params;
      const booking = await this.repository.getBookingByAttendanceId(attendanceId);
      if (!booking) {
        return res.status(404).json({ success: false, message: 'Attendance not found or no booking linked' });
      }
      res.json({
        success: true,
        data: {
          booking: booking || null,
          visits: booking?.visits || []
        }
      });
    } catch (error) {
      console.error('Error fetching antenatal data:', error);
      res.status(500).json({ success: false, message: 'Error fetching antenatal data' });
    }
  };

  getAntenatalBookingById = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const booking = await this.repository.getBookingById(id);
      if (!booking) {
        return res.status(404).json({ success: false, message: 'Antenatal booking not found' });
      }
      res.json({ success: true, data: booking });
    } catch (error) {
      console.error('Error fetching booking:', error);
      res.status(500).json({ success: false, message: 'Error fetching booking' });
    }
  };

  getActiveBookingByPatient = async (req: AuthRequest, res: Response) => {
    try {
      const { patientId } = req.params;
      const booking = await this.repository.getActiveBookingByPatientId(patientId);
      if (!booking) {
        return res.status(404).json({ success: false, message: 'No antenatal booking found for this patient' });
      }
      res.json({ success: true, data: booking });
    } catch (error) {
      console.error('Error fetching booking:', error);
      res.status(500).json({ success: false, message: 'Error fetching booking' });
    }
  };

  createAntenatalBooking = [
    body('patientId').notEmpty().withMessage('Patient ID required'),
    body('attendanceId').notEmpty().withMessage('Attendance ID required'),
    body('gravida').isInt({ min: 0 }).withMessage('Valid gravida required'),
    body('para').isInt({ min: 0 }).withMessage('Valid para required'),
    body('lmp').isISO8601().withMessage('Valid LMP date required'),
    body('riskLevel').optional().isIn(['low', 'medium', 'high']).withMessage('Valid risk level required'),
    async (req: AuthRequest, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ success: false, errors: errors.array() });
        }
        const data: CreateAntenatalBookingInput = {
          ...req.body,
          lmp: new Date(req.body.lmp),
          createdById: req.user!.id
        };
        const booking = await this.repository.createBooking(data);
        res.status(201).json({ success: true, message: 'Antenatal booking created successfully', data: booking });
      } catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({ success: false, message: 'Error creating antenatal booking' });
      }
    }
  ];

  updateAntenatalBooking = [
    body('gravida').optional().isInt({ min: 0 }),
    body('para').optional().isInt({ min: 0 }),
    body('edd').optional().isISO8601(),
    body('riskLevel').optional().isIn(['low', 'medium', 'high']),
    async (req: AuthRequest, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ success: false, errors: errors.array() });
        }
        const { id } = req.params;
        const data: UpdateAntenatalBookingInput = req.body;
        if (data.edd) data.edd = new Date(data.edd);
        
        const booking = await this.repository.updateBooking(id, data);
        res.json({ success: true, message: 'Antenatal booking updated', data: booking });
      } catch (error) {
        console.error('Error updating booking:', error);
        res.status(500).json({ success: false, message: 'Error updating antenatal booking' });
      }
    }
  ];

  closeAntenatalBooking = [
    body('deliveryDate').optional().isISO8601(),
    body('deliveryOutcome').optional().isString(),
    body('deliveryRecordId').optional().isString(),
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params;
        const { deliveryDate, deliveryOutcome, deliveryRecordId } = req.body;
        const booking = await this.repository.closeBooking(id, {
          deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
          deliveryOutcome,
          deliveryRecordId
        });
        res.json({ success: true, message: 'Antenatal booking closed successfully', data: booking });
      } catch (error) {
        console.error('Error closing booking:', error);
        res.status(500).json({ success: false, message: 'Error closing booking' });
      }
    }
  ];

  deleteAntenatalBooking = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      await this.repository.deleteBooking(id);
      res.json({ success: true, message: 'Antenatal booking deleted successfully' });
    } catch (error) {
      console.error('Error deleting booking:', error);
      res.status(500).json({ success: false, message: 'Error deleting antenatal booking' });
    }
  };

  getAntenatalBookings = async (req: AuthRequest, res: Response) => {
    try {
      const { page = 1, limit = 50, isActive = 'true', patientId } = req.query;
      const filters: any = {
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      };
      if (isActive === 'true') filters.isActive = true;
      else if (isActive === 'false') filters.isActive = false;
      if (patientId) filters.patientId = patientId as string;

      const result = await this.repository.getAllBookings(filters);
      res.json({
        success: true,
        data: result.bookings,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total: result.total,
          pages: Math.ceil(result.total / filters.limit)
        }
      });
    } catch (error) {
      console.error('Error fetching bookings:', error);
      res.status(500).json({ success: false, message: 'Error fetching bookings' });
    }
  };

  // ===================== ANC VISIT CONTROLLERS =====================
  getANCVisitsByBooking = async (req: AuthRequest, res: Response) => {
    try {
      const { bookingId } = req.params;
      const visits = await this.repository.getVisitsByBookingId(bookingId);
      const booking = visits.length > 0 ? visits[0].booking : null;
      res.json({ success: true, data: { booking, visits } });
    } catch (error) {
      console.error('Error fetching ANC visits:', error);
      res.status(500).json({ success: false, message: 'Error fetching ANC visits' });
    }
  };

  getANCVisitById = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const visit = await this.repository.getVisitById(id);
      if (!visit) {
        return res.status(404).json({ success: false, message: 'ANC visit not found' });
      }
      res.json({ success: true, data: visit });
    } catch (error) {
      console.error('Error fetching ANC visit:', error);
      res.status(500).json({ success: false, message: 'Error fetching ANC visit' });
    }
  };

  createANCVisit = [
    body('bookingId').notEmpty().withMessage('Booking ID required'),
    body('attendanceId').notEmpty().withMessage('Attendance ID required'),
    body('visitNumber').isInt({ min: 1 }).withMessage('Valid visit number required'),
    body('visitDate').isISO8601().withMessage('Valid visit date required'),
    async (req: AuthRequest, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ success: false, errors: errors.array() });
        }
        const data: CreateANCVisitInput = {
          ...req.body,
          visitDate: new Date(req.body.visitDate),
          recordedById: req.user!.id
        };
        const visit = await this.repository.createVisit(data);
        res.status(201).json({ success: true, message: 'ANC visit recorded successfully', data: visit });
      } catch (error) {
        console.error('Error creating ANC visit:', error);
        res.status(500).json({ success: false, message: 'Error creating ANC visit' });
      }
    }
  ];

  updateANCVisit = [
    body('gestationalAgeWeeks').optional().isInt({ min: 0, max: 42 }),
    body('weight').optional().isFloat({ min: 0 }),
    body('bloodPressure').optional().isString(),
    body('fetalHeartRate').optional().isInt({ min: 60, max: 200 }),
    body('iptpGiven').optional().isBoolean(),
    body('iptpDoseNumber').optional().isInt({ min: 1, max: 10 }),
    body('ttGiven').optional().isBoolean(),
    body('ttDoseNumber').optional().isInt({ min: 1, max: 5 }),
    body('dangerSignsPresent').optional().isBoolean(),
    async (req: AuthRequest, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ success: false, errors: errors.array() });
        }
        const { id } = req.params;
        const data: UpdateANCVisitInput = req.body;
        const visit = await this.repository.updateVisit(id, data);
        res.json({ success: true, message: 'ANC visit updated', data: visit });
      } catch (error) {
        console.error('Error updating ANC visit:', error);
        res.status(500).json({ success: false, message: 'Error updating ANC visit' });
      }
    }
  ];

  deleteANCVisit = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      await this.repository.deleteVisit(id);
      res.json({ success: true, message: 'ANC visit deleted successfully' });
    } catch (error) {
      console.error('Error deleting ANC visit:', error);
      res.status(500).json({ success: false, message: 'Error deleting ANC visit' });
    }
  };

  // ===================== DELIVERY RECORD CONTROLLERS =====================
  createDeliveryRecord = [
    body('patientId').notEmpty().withMessage('Patient ID required'),
    body('attendanceId').notEmpty().withMessage('Attendance ID required'),
    body('deliveryDate').isISO8601().withMessage('Valid delivery date required'),
    body('deliveryType').isIn(['spontaneous_vertex', 'assisted_breech', 'vacuum', 'forceps', 'caesarean_section', 'multiple']).withMessage('Valid delivery type required'),
    body('deliveryOutcome').isIn(['live_birth', 'stillbirth_fresh', 'stillbirth_macerated', 'neonatal_death']).withMessage('Valid delivery outcome required'),
    body('gestationWeeks').optional().isInt({ min: 0, max: 42 }).withMessage('Valid gestational age required'),
    async (req: AuthRequest, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ success: false, errors: errors.array() });
        }
        const data: CreateDeliveryRecordInput = {
          ...req.body,
          deliveryDate: new Date(req.body.deliveryDate),
          createdById: req.user!.id
        };
        const record = await this.repository.createDeliveryRecord(data);
        
        // If there's an antenatal booking, close it
        if (req.body.antenatalBookingId) {
          await this.repository.closeBooking(req.body.antenatalBookingId, {
            deliveryDate: new Date(),
            deliveryOutcome: req.body.deliveryOutcome || 'delivered',
            deliveryRecordId: record.id
          });
        }
        res.status(201).json({ success: true, message: 'Delivery record created successfully', data: record });
      } catch (error) {
        console.error('Error creating delivery record:', error);
        res.status(500).json({ success: false, message: 'Error creating delivery record' });
      }
    }
  ];

  getDeliveryRecords = async (req: AuthRequest, res: Response) => {
    try {
      const { patientId, startDate, endDate, page = 1, limit = 50 } = req.query;
      const filters: any = {
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      };
      if (patientId) filters.patientId = patientId as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);

      const result = await this.repository.getDeliveryRecords(filters);
      res.json({
        success: true,
        data: result.records,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total: result.total,
          pages: Math.ceil(result.total / filters.limit)
        }
      });
    } catch (error) {
      console.error('Error fetching delivery records:', error);
      res.status(500).json({ success: false, message: 'Error fetching delivery records' });
    }
  };

  getDeliveryRecord = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const record = await this.repository.getDeliveryRecordById(id);
      if (!record) {
        return res.status(404).json({ success: false, message: 'Delivery record not found' });
      }
      res.json({ success: true, data: record });
    } catch (error) {
      console.error('Error fetching delivery record:', error);
      res.status(500).json({ success: false, message: 'Error fetching delivery record' });
    }
  };

  updateDeliveryRecord = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const record = await this.repository.updateDeliveryRecord(id, req.body);
      res.json({ success: true, data: record });
    } catch (error) {
      console.error('Error updating delivery record:', error);
      res.status(500).json({ success: false, message: 'Error updating delivery record' });
    }
  };

  deleteDeliveryRecord = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      await this.repository.deleteDeliveryRecord(id);
      res.json({ success: true, message: 'Delivery record deleted successfully' });
    } catch (error) {
      console.error('Error deleting delivery record:', error);
      res.status(500).json({ success: false, message: 'Error deleting delivery record' });
    }
  };

  // ===================== POSTNATAL RECORD CONTROLLERS =====================
  createPostnatalRecord = [
    body('patientId').notEmpty().withMessage('Patient ID required'),
    body('attendanceId').notEmpty().withMessage('Attendance ID required'),
    body('examinationDate').isISO8601().withMessage('Valid examination date required'),
    body('maternalCondition').optional().isIn(['good', 'fair', 'poor', 'critical']).withMessage('Valid maternal condition required'),
    body('breastfeedingStatus').optional().isIn(['exclusive', 'mixed', 'not_breastfeeding']).withMessage('Valid breastfeeding status required'),
    body('babyCondition').optional().isIn(['good', 'fair', 'poor', 'critical']).withMessage('Valid newborn condition required'),
    async (req: AuthRequest, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ success: false, errors: errors.array() });
        }
        const data: CreatePostnatalRecordInput = {
          ...req.body,
          examinationDate: new Date(req.body.examinationDate),
          createdById: req.user!.id
        };
        const record = await this.repository.createPostnatalRecord(data);
        res.status(201).json({ success: true, message: 'Postnatal record created successfully', data: record });
      } catch (error) {
        console.error('Error creating postnatal record:', error);
        res.status(500).json({ success: false, message: 'Error creating postnatal record' });
      }
    }
  ];

  getPostnatalRecords = async (req: AuthRequest, res: Response) => {
    try {
      const { patientId, page = 1, limit = 50 } = req.query;
      const filters: any = {
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      };
      if (patientId) filters.patientId = patientId as string;

      const result = await this.repository.getPostnatalRecords(filters);
      res.json({
        success: true,
        data: result.records,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total: result.total,
          pages: Math.ceil(result.total / filters.limit)
        }
      });
    } catch (error) {
      console.error('Error fetching postnatal records:', error);
      res.status(500).json({ success: false, message: 'Error fetching postnatal records' });
    }
  };

  getPostnatalRecord = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const record = await this.repository.getPostnatalRecordById(id);
      if (!record) {
        return res.status(404).json({ success: false, message: 'Postnatal record not found' });
      }
      res.json({ success: true, data: record });
    } catch (error) {
      console.error('Error fetching postnatal record:', error);
      res.status(500).json({ success: false, message: 'Error fetching postnatal record' });
    }
  };

  updatePostnatalRecord = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const record = await this.repository.updatePostnatalRecord(id, req.body);
      res.json({ success: true, data: record });
    } catch (error) {
      console.error('Error updating postnatal record:', error);
      res.status(500).json({ success: false, message: 'Error updating postnatal record' });
    }
  };

  deletePostnatalRecord = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      await this.repository.deletePostnatalRecord(id);
      res.json({ success: true, message: 'Postnatal record deleted successfully' });
    } catch (error) {
      console.error('Error deleting postnatal record:', error);
      res.status(500).json({ success: false, message: 'Error deleting postnatal record' });
    }
  };

  // ===================== STATISTICS CONTROLLERS =====================
  getANCStatistics = async (req: AuthRequest, res: Response) => {
    try {
      const { startDate, endDate } = req.query;
      let start: Date | undefined = undefined;
      let end: Date | undefined = undefined;
      if (startDate) start = new Date(startDate as string);
      if (endDate) end = new Date(endDate as string);
      const stats = await this.repository.getANCStatistics(start, end);
      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('Error fetching statistics:', error);
      res.status(500).json({ success: false, message: 'Error fetching statistics' });
    }
  };

  getDeliveryStatistics = async (req: AuthRequest, res: Response) => {
    try {
      const { startDate, endDate } = req.query;
      let start: Date | undefined = undefined;
      let end: Date | undefined = undefined;
      if (startDate) start = new Date(startDate as string);
      if (endDate) end = new Date(endDate as string);
      const stats = await this.repository.getDeliveryStatistics(start, end);
      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('Error fetching delivery statistics:', error);
      res.status(500).json({ success: false, message: 'Error fetching statistics' });
    }
  };

  getPostnatalStatistics = async (req: AuthRequest, res: Response) => {
    try {
      const { startDate, endDate } = req.query;
      let start: Date | undefined = undefined;
      let end: Date | undefined = undefined;
      if (startDate) start = new Date(startDate as string);
      if (endDate) end = new Date(endDate as string);
      const stats = await this.repository.getPostnatalStatistics(start, end);
      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('Error fetching postnatal statistics:', error);
      res.status(500).json({ success: false, message: 'Error fetching statistics' });
    }
  };
}