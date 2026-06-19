import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { BaseController } from '../../shared/base/BaseController';
import { AntenatalService } from './AntenatalService';
import { AuthRequest } from '../../middleware/authMiddleware';
import { CreateAntenatalBookingInput, UpdateAntenatalBookingInput, CreateANCVisitInput, UpdateANCVisitInput, CreateDeliveryRecordInput, CreatePostnatalRecordInput } from './AntenatalTypes';

export class AntenatalController extends BaseController {
  private service: AntenatalService;

  constructor(service: AntenatalService) {
    super();
    this.service = service;
  }

  // ===================== ANTENATAL BOOKING =====================
  getAntenatalByAttendance = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const booking = await this.service.getBookingByAttendanceId(req.params.attendanceId);
    if (!booking) return this.notFound(res, 'Attendance not found or no booking linked');
    return this.ok(res, { booking, visits: booking?.visits || [] });
  });

  getAntenatalBookingById = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const booking = await this.service.getBookingById(req.params.id);
    if (!booking) return this.notFound(res, 'Antenatal booking');
    return this.ok(res, booking);
  });

  getActiveBookingByPatient = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const booking = await this.service.getActiveBookingByPatientId(req.params.patientId);
    if (!booking) return this.notFound(res, 'No antenatal booking found for this patient');
    return this.ok(res, booking);
  });

  createAntenatalBooking = [
    body('patientId').notEmpty().withMessage('Patient ID required'),
    body('attendanceId').notEmpty().withMessage('Attendance ID required'),
    body('gravida').isInt({ min: 0 }).withMessage('Valid gravida required'),
    body('para').isInt({ min: 0 }).withMessage('Valid para required'),
    body('lmp').isISO8601().withMessage('Valid LMP date required'),
    body('riskLevel').optional().isIn(['low', 'medium', 'high']).withMessage('Valid risk level required'),
    this.asyncHandler(async (req: AuthRequest, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return this.badRequest(res, 'Validation failed', errors.array() as any[]);
      
      const data: CreateAntenatalBookingInput = { ...req.body, lmp: new Date(req.body.lmp), createdById: req.user!.id };
      const booking = await this.service.createBooking(data);
      return this.created(res, booking, 'Antenatal booking created successfully');
    })
  ];

  updateAntenatalBooking = [
    body('gravida').optional().isInt({ min: 0 }),
    body('para').optional().isInt({ min: 0 }),
    body('edd').optional().isISO8601(),
    body('riskLevel').optional().isIn(['low', 'medium', 'high']),
    this.asyncHandler(async (req: AuthRequest, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return this.badRequest(res, 'Validation failed', errors.array() as any[]);
      
      const data: UpdateAntenatalBookingInput = req.body;
      if (data.edd) data.edd = new Date(data.edd);
      
      const booking = await this.service.updateBooking(req.params.id, data);
      return this.ok(res, booking, 'Antenatal booking updated');
    })
  ];

  closeAntenatalBooking = [
    body('deliveryDate').optional().isISO8601(),
    body('deliveryOutcome').optional().isString(),
    body('deliveryRecordId').optional().isString(),
    this.asyncHandler(async (req: AuthRequest, res: Response) => {
      const { deliveryDate, deliveryOutcome, deliveryRecordId } = req.body;
      const booking = await this.service.closeBooking(req.params.id, {
        deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined, deliveryOutcome, deliveryRecordId
      });
      return this.ok(res, booking, 'Antenatal booking closed successfully');
    })
  ];

  deleteAntenatalBooking = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    await this.service.deleteBooking(req.params.id);
    return this.ok(res, null, 'Antenatal booking deleted successfully');
  });

  getAntenatalBookings = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = 1, limit = 50, isActive = 'true', patientId } = req.query;
    const filters: any = { page: parseInt(page as string), limit: parseInt(limit as string) };
    if (isActive === 'true') filters.isActive = true;
    else if (isActive === 'false') filters.isActive = false;
    if (patientId) filters.patientId = patientId as string;

    const result = await this.service.getAllBookings(filters);
    return this.paginated(res, result.bookings, { page: filters.page, limit: filters.limit, total: result.total }, 'Bookings retrieved');
  });

  // ===================== ANC VISITS =====================
  getANCVisitsByBooking = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const visits = await this.service.getVisitsByBookingId(req.params.bookingId);
    const booking = visits.length > 0 ? visits[0].booking : null;
    return this.ok(res, { booking, visits });
  });

  getANCVisitById = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const visit = await this.service.getVisitById(req.params.id);
    if (!visit) return this.notFound(res, 'ANC visit');
    return this.ok(res, visit);
  });

  createANCVisit = [
    body('bookingId').notEmpty().withMessage('Booking ID required'),
    body('attendanceId').notEmpty().withMessage('Attendance ID required'),
    body('visitNumber').isInt({ min: 1 }).withMessage('Valid visit number required'),
    body('visitDate').isISO8601().withMessage('Valid visit date required'),
    this.asyncHandler(async (req: AuthRequest, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return this.badRequest(res, 'Validation failed', errors.array() as any[]);
      
      const data: CreateANCVisitInput = { ...req.body, visitDate: new Date(req.body.visitDate), recordedById: req.user!.id };
      const visit = await this.service.createVisit(data);
      return this.created(res, visit, 'ANC visit recorded successfully');
    })
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
    this.asyncHandler(async (req: AuthRequest, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return this.badRequest(res, 'Validation failed', errors.array() as any[]);
      
      const visit = await this.service.updateVisit(req.params.id, req.body);
      return this.ok(res, visit, 'ANC visit updated');
    })
  ];

  deleteANCVisit = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    await this.service.deleteVisit(req.params.id);
    return this.ok(res, null, 'ANC visit deleted successfully');
  });

  // ===================== DELIVERY RECORDS =====================
  createDeliveryRecord = [
    body('patientId').notEmpty().withMessage('Patient ID required'),
    body('attendanceId').notEmpty().withMessage('Attendance ID required'),
    body('deliveryDate').isISO8601().withMessage('Valid delivery date required'),
    body('deliveryType').isIn(['spontaneous_vertex', 'assisted_breech', 'vacuum', 'forceps', 'caesarean_section', 'multiple']).withMessage('Valid delivery type required'),
    body('deliveryOutcome').isIn(['live_birth', 'stillbirth_fresh', 'stillbirth_macerated', 'neonatal_death']).withMessage('Valid delivery outcome required'),
    body('gestationWeeks').optional().isInt({ min: 0, max: 42 }).withMessage('Valid gestational age required'),
    this.asyncHandler(async (req: AuthRequest, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return this.badRequest(res, 'Validation failed', errors.array() as any[]);
      
      const data: CreateDeliveryRecordInput = { ...req.body, deliveryDate: new Date(req.body.deliveryDate), createdById: req.user!.id };
      const record = await this.service.createDeliveryRecord(data);
      
      if (req.body.antenatalBookingId) {
        await this.service.closeBooking(req.body.antenatalBookingId, {
          deliveryDate: new Date(), deliveryOutcome: req.body.deliveryOutcome || 'delivered', deliveryRecordId: record.id
        });
      }
      return this.created(res, record, 'Delivery record created successfully');
    })
  ];

  getDeliveryRecords = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { patientId, startDate, endDate, page = 1, limit = 50 } = req.query;
    const filters: any = { page: parseInt(page as string), limit: parseInt(limit as string) };
    if (patientId) filters.patientId = patientId as string;
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);

    const result = await this.service.getDeliveryRecords(filters);
    return this.paginated(res, result.records, { page: filters.page, limit: filters.limit, total: result.total }, 'Delivery records retrieved');
  });

  getDeliveryRecord = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const record = await this.service.getDeliveryRecordById(req.params.id);
    if (!record) return this.notFound(res, 'Delivery record');
    return this.ok(res, record);
  });

  // ✅ PRESERVED: Your exact transformation logic for multiple births
  updateDeliveryRecord = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const requestData = { ...req.body };
    if (requestData.newborns) {
      requestData.Newborn = requestData.newborns;
      delete requestData.newborns;
    }
    delete requestData.attendanceId;
    delete requestData.patientId;
    
    const record = await this.service.updateDeliveryRecord(req.params.id, requestData);
    return this.ok(res, record, 'Delivery record updated');
  });

  deleteDeliveryRecord = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    await this.service.deleteDeliveryRecord(req.params.id);
    return this.ok(res, null, 'Delivery record deleted successfully');
  });

  // ===================== POSTNATAL RECORDS =====================
  createPostnatalRecord = [
    body('patientId').notEmpty().withMessage('Patient ID required'),
    body('attendanceId').notEmpty().withMessage('Attendance ID required'),
    body('examinationDate').isISO8601().withMessage('Valid examination date required'),
    body('maternalCondition').optional().isIn(['good', 'fair', 'poor', 'critical']).withMessage('Valid maternal condition required'),
    body('breastfeedingStatus').optional().isIn(['exclusive', 'mixed', 'not_breastfeeding']).withMessage('Valid breastfeeding status required'),
    body('babyCondition').optional().isIn(['good', 'fair', 'poor', 'critical']).withMessage('Valid newborn condition required'),
    this.asyncHandler(async (req: AuthRequest, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return this.badRequest(res, 'Validation failed', errors.array() as any[]);
      
      const data: CreatePostnatalRecordInput = { ...req.body, examinationDate: new Date(req.body.examinationDate), createdById: req.user!.id };
      const record = await this.service.createPostnatalRecord(data);
      return this.created(res, record, 'Postnatal record created successfully');
    })
  ];

  getPostnatalRecords = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { patientId, page = 1, limit = 50 } = req.query;
    const filters: any = { page: parseInt(page as string), limit: parseInt(limit as string) };
    if (patientId) filters.patientId = patientId as string;

    const result = await this.service.getPostnatalRecords(filters);
    return this.paginated(res, result.records, { page: filters.page, limit: filters.limit, total: result.total }, 'Postnatal records retrieved');
  });

  getPostnatalRecord = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const record = await this.service.getPostnatalRecordById(req.params.id);
    if (!record) return this.notFound(res, 'Postnatal record');
    return this.ok(res, record);
  });

  updatePostnatalRecord = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const record = await this.service.updatePostnatalRecord(req.params.id, req.body);
    return this.ok(res, record, 'Postnatal record updated');
  });

  deletePostnatalRecord = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    await this.service.deletePostnatalRecord(req.params.id);
    return this.ok(res, null, 'Postnatal record deleted successfully');
  });

  // ===================== STATISTICS =====================
  getANCStatistics = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const start = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const end = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    return this.ok(res, await this.service.getANCStatistics(start, end));
  });

  getDeliveryStatistics = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const start = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const end = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    return this.ok(res, await this.service.getDeliveryStatistics(start, end));
  });

  getPostnatalStatistics = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const start = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const end = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    return this.ok(res, await this.service.getPostnatalStatistics(start, end));
  });
}