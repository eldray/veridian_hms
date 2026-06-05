// modules/antenatal/AntenatalController.ts
import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthRequest } from '../../middleware/authMiddleware';
import { AntenatalRepository } from './AntenatalRepository';
import { 
  RegisterAntenatalBookingInput,
  UpdateAntenatalBookingInput,
  RecordANCVisitInput,
  UpdateANCVisitInput,
  RecordDeliveryInput,
  RecordPostnatalInput
} from './AntenatalTypes';

export class AntenatalController {
  private repository: AntenatalRepository;
  private prisma: any;

  constructor(prisma: any) {
    this.prisma = prisma;
    this.repository = new AntenatalRepository(prisma);
  }

  // ===================== REGISTER ANTENATAL BOOKING (AFTER ENCOUNTER CREATED) =====================
  // Called after creating an antenatal encounter to register the patient's antenatal data
  registerAntenatalBooking = [
    body('encounterId').notEmpty().withMessage('Encounter ID required'),
    body('lastMenstrualPeriod').isISO8601().withMessage('Valid LMP date required'),
    body('numberOfPregnancies').isInt({ min: 0 }).withMessage('Valid number of pregnancies (gravida) required'),
    body('numberOfDeliveries').isInt({ min: 0 }).withMessage('Valid number of deliveries (para) required'),
    body('riskLevel').optional().isIn(['low', 'medium', 'high']),
    body('bloodGroup').optional().isString(),
    body('hivStatus').optional().isString(),
    body('hemoglobinLevel').optional().isFloat(),
    body('syphilisStatus').optional().isString(),
    body('previousCesareanSection').optional().isBoolean(),
    body('previousPregnancyComplications').optional().isString(),
    body('gestationalAgeWeeks').optional().isInt({ min: 0, max: 42 }),

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
          encounterId, 
          lastMenstrualPeriod,
          numberOfPregnancies,
          numberOfDeliveries,
          riskLevel,
          bloodGroup,
          hivStatus,
          hemoglobinLevel,
          syphilisStatus,
          previousCesareanSection,
          previousPregnancyComplications,
          gestationalAgeWeeks
        } = req.body;

        // Verify encounter exists and is antenatal type
        const encounter = await this.prisma.attendance.findUnique({
          where: { id: encounterId },
          select: { attendanceType: true, patientId: true, id: true }
        });

        if (!encounter) {
          return res.status(404).json({ success: false, message: 'Encounter not found' });
        }

        if (encounter.attendanceType !== 'antenatal') {
          return res.status(400).json({ success: false, message: 'Antenatal registration can only be added to antenatal encounters' });
        }

        // Check if already registered
        const existingRegistration = await this.prisma.antenatalBooking.findFirst({
          where: { attendanceId: encounterId }
        });

        if (existingRegistration) {
          return res.status(400).json({ success: false, message: 'Antenatal registration already exists for this encounter' });
        }

        // Calculate estimated due date from LMP
        const lmpDate = new Date(lastMenstrualPeriod);
        const estimatedDueDate = new Date(lmpDate);
        estimatedDueDate.setDate(estimatedDueDate.getDate() + 280);

        const registrationData: RegisterAntenatalBookingInput = {
          patientId: encounter.patientId,
          attendanceId: encounterId,
          numberOfPregnancies: numberOfPregnancies,
          numberOfDeliveries: numberOfDeliveries,
          lastMenstrualPeriod: lmpDate,
          estimatedDueDate: estimatedDueDate,
          gestationalAgeWeeks: gestationalAgeWeeks,
          riskLevel: riskLevel || 'low',
          riskFactors: req.body.riskFactors || [],
          bloodGroup: bloodGroup,
          hivStatus: hivStatus,
          hemoglobinLevel: hemoglobinLevel,
          syphilisStatus: syphilisStatus,
          previousCesareanSection: previousCesareanSection || false,
          previousPregnancyComplications: previousPregnancyComplications,
          registeredById: user.id
        };

        const antenatalRecord = await this.repository.registerAntenatalBooking(registrationData);

        // Record first ANC visit
        const firstVisit = await this.repository.recordANCVisit({
          antenatalRecordId: antenatalRecord.id,
          attendanceId: encounterId,
          visitNumber: 1,
          visitDate: new Date(),
          recordedById: user.id
        });

        res.status(201).json({
          success: true,
          data: { 
            antenatalRecord, 
            firstVisit 
          },
          message: 'Antenatal registration completed successfully'
        });
      } catch (error) {
        console.error('Error registering antenatal booking:', error);
        res.status(500).json({ 
          success: false, 
          message: 'Error registering antenatal booking',
          error: (error as Error).message 
        });
      }
    }
  ];

  // ===================== RECORD ANC VISIT (FOLLOW-UP) =====================
  recordANCVisit = [
    body('antenatalRecordId').notEmpty().withMessage('Antenatal record ID required'),
    body('attendanceId').notEmpty().withMessage('Attendance ID required'),
    body('visitNumber').isInt({ min: 1 }).withMessage('Valid visit number required'),
    body('visitDate').isISO8601().withMessage('Valid visit date required'),
    body('gestationalAgeWeeks').optional().isInt({ min: 0, max: 42 }),
    body('weight').optional().isFloat({ min: 0 }),
    body('bloodPressure').optional().isString(),
    body('fundalHeight').optional().isInt(),
    body('fetalHeartRate').optional().isInt({ min: 60, max: 200 }),
    body('fetalMovements').optional().isBoolean(),
    body('presentation').optional().isString(),
    body('iptpDoseGiven').optional().isBoolean(),
    body('iptpDoseNumber').optional().isInt({ min: 1, max: 5 }),
    body('tetanusToxoidGiven').optional().isBoolean(),
    body('tetanusToxoidDoseNumber').optional().isInt({ min: 1, max: 5 }),
    body('ironGiven').optional().isBoolean(),
    body('folateGiven').optional().isBoolean(),
    body('calciumGiven').optional().isBoolean(),
    body('malariaTestDone').optional().isBoolean(),
    body('malariaTestResult').optional().isString(),
    body('dangerSignsPresent').optional().isBoolean(),
    body('dangerSignsList').optional().isArray(),
    body('referralMade').optional().isBoolean(),
    body('referredTo').optional().isString(),
    body('nextVisitDate').optional().isISO8601(),

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

        const visitData: RecordANCVisitInput = {
          antenatalRecordId: req.body.antenatalRecordId,
          attendanceId: req.body.attendanceId,
          visitNumber: req.body.visitNumber,
          visitDate: new Date(req.body.visitDate),
          gestationalAgeWeeks: req.body.gestationalAgeWeeks,
          weight: req.body.weight,
          bloodPressure: req.body.bloodPressure,
          fundalHeight: req.body.fundalHeight,
          fetalHeartRate: req.body.fetalHeartRate,
          fetalMovements: req.body.fetalMovements,
          presentation: req.body.presentation,
          iptpDoseGiven: req.body.iptpDoseGiven || false,
          iptpDoseNumber: req.body.iptpDoseNumber,
          tetanusToxoidGiven: req.body.tetanusToxoidGiven || false,
          tetanusToxoidDoseNumber: req.body.tetanusToxoidDoseNumber,
          ironGiven: req.body.ironGiven || false,
          folateGiven: req.body.folateGiven || false,
          calciumGiven: req.body.calciumGiven || false,
          malariaTestDone: req.body.malariaTestDone || false,
          malariaTestResult: req.body.malariaTestResult,
          dangerSignsPresent: req.body.dangerSignsPresent || false,
          dangerSignsList: req.body.dangerSignsList || [],
          referralMade: req.body.referralMade || false,
          referredTo: req.body.referredTo,
          nextVisitDate: req.body.nextVisitDate ? new Date(req.body.nextVisitDate) : undefined,
          recordedById: user.id
        };

        const visit = await this.repository.recordANCVisit(visitData);

        // Update the current attendance on the antenatal record
        await this.repository.updateAntenatalRecord(req.body.antenatalRecordId, {
          currentAttendanceId: req.body.attendanceId
        });

        res.status(201).json({
          success: true,
          data: visit,
          message: 'ANC visit recorded successfully'
        });
      } catch (error) {
        console.error('Error recording ANC visit:', error);
        res.status(500).json({ 
          success: false, 
          message: 'Error recording ANC visit',
          error: (error as Error).message 
        });
      }
    }
  ];

  // ===================== RECORD DELIVERY =====================
  recordDelivery = [
    body('patientId').notEmpty().withMessage('Patient ID required'),
    body('attendanceId').notEmpty().withMessage('Attendance ID required'),
    body('deliveryDate').isISO8601().withMessage('Valid delivery date required'),
    body('deliveryType').isIn(['spontaneous_vertex', 'assisted_breech', 'vacuum', 'forceps', 'caesarean_section', 'multiple']),
    body('deliveryOutcome').isIn(['live_birth', 'stillbirth_fresh', 'stillbirth_macerated', 'neonatal_death']),
    body('gestationalAgeWeeks').optional().isInt({ min: 0, max: 42 }),
    body('birthWeight').optional().isFloat(),
    body('apgarScore1min').optional().isInt({ min: 0, max: 10 }),
    body('apgarScore5min').optional().isInt({ min: 0, max: 10 }),
    body('resuscitationDone').optional().isBoolean(),
    body('maternalOutcome').optional().isIn(['alive', 'dead_direct_cause', 'dead_indirect_cause', 'dead_unknown']),
    body('complications').optional().isArray(),
    body('newborns').optional().isArray(),

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

        // Find active antenatal record to close
        const activeAntenatalRecord = await this.prisma.antenatalBooking.findFirst({
          where: { 
            patientId: req.body.patientId, 
            isActive: true, 
            isCompleted: false 
          }
        });

        const deliveryData: RecordDeliveryInput = {
          patientId: req.body.patientId,
          attendanceId: req.body.attendanceId,
          antenatalRecordId: activeAntenatalRecord?.id,
          deliveryDate: new Date(req.body.deliveryDate),
          deliveryType: req.body.deliveryType,
          deliveryOutcome: req.body.deliveryOutcome,
          placeOfDelivery: req.body.placeOfDelivery || 'private_hospital',
          attendant: req.body.attendant,
          gestationalAgeWeeks: req.body.gestationalAgeWeeks,
          birthWeight: req.body.birthWeight,
          apgarScore1min: req.body.apgarScore1min,
          apgarScore5min: req.body.apgarScore5min,
          resuscitationDone: req.body.resuscitationDone || false,
          maternalOutcome: req.body.maternalOutcome || 'alive',
          complications: req.body.complications || [],
          notes: req.body.notes,
          malePartnerPresentANC: req.body.malePartnerPresentANC || false,
          malePartnerPresentDelivery: req.body.malePartnerPresentDelivery || false,
          malePartnerPresentPNC: req.body.malePartnerPresentPNC || false,
          recordedById: user.id
        };

        const deliveryRecord = await this.repository.recordDelivery(deliveryData);

        // Close the antenatal record if it exists
        if (activeAntenatalRecord) {
          await this.repository.closeAntenatalRecord(activeAntenatalRecord.id, {
            deliveryDate: new Date(req.body.deliveryDate),
            deliveryOutcome: req.body.deliveryOutcome,
            deliveryRecordId: deliveryRecord.id
          });
        }

        // Record newborns if provided
        if (req.body.newborns && req.body.newborns.length > 0) {
          for (const newborn of req.body.newborns) {
            await this.repository.recordNewborn({
              deliveryRecordId: deliveryRecord.id,
              birthWeight: newborn.birthWeight,
              gender: newborn.gender,
              apgarScore1min: newborn.apgarScore1min,
              apgarScore5min: newborn.apgarScore5min,
              resuscitationDone: newborn.resuscitationDone || false,
              outcome: newborn.outcome || 'alive',
              breastfeedingWithin30Min: newborn.breastfeedingWithin30Min || false,
              eyeProphylaxisGiven: newborn.eyeProphylaxisGiven || false,
              cordCareMethod: newborn.cordCareMethod || 'dry_cord'
            });
          }
        }

        res.status(201).json({
          success: true,
          data: deliveryRecord,
          message: 'Delivery recorded successfully'
        });
      } catch (error) {
        console.error('Error recording delivery:', error);
        res.status(500).json({ 
          success: false, 
          message: 'Error recording delivery',
          error: (error as Error).message 
        });
      }
    }
  ];

  // ===================== RECORD POSTNATAL VISIT =====================
  recordPostnatalVisit = [
    body('patientId').notEmpty().withMessage('Patient ID required'),
    body('attendanceId').notEmpty().withMessage('Attendance ID required'),
    body('examinationDate').isISO8601().withMessage('Valid examination date required'),
    body('dayNumber').isInt({ min: 1 }).withMessage('Valid day number required'),
    body('maternalCondition').optional().isString(),
    body('breastfeedingStatus').optional().isString(),
    body('babyCondition').optional().isString(),
    body('familyPlanningDiscussed').optional().isBoolean(),
    body('familyPlanningMethodAccepted').optional().isString(),

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

        // Find the most recent delivery record for this patient
        const latestDelivery = await this.prisma.deliveryRecord.findFirst({
          where: { patientId: req.body.patientId },
          orderBy: { deliveryDate: 'desc' }
        });

        // Find the antenatal record
        const antenatalRecord = await this.prisma.antenatalBooking.findFirst({
          where: { 
            patientId: req.body.patientId,
            isCompleted: true 
          },
          orderBy: { bookingDate: 'desc' }
        });

        const postnatalData: RecordPostnatalInput = {
          patientId: req.body.patientId,
          attendanceId: req.body.attendanceId,
          antenatalRecordId: antenatalRecord?.id,
          deliveryRecordId: latestDelivery?.id,
          examinationDate: new Date(req.body.examinationDate),
          dayNumber: req.body.dayNumber,
          maternalCondition: req.body.maternalCondition,
          bloodPressure: req.body.bloodPressure,
          temperature: req.body.temperature,
          pulse: req.body.pulse,
          breastfeedingStatus: req.body.breastfeedingStatus,
          babyCondition: req.body.babyCondition,
          babyWeight: req.body.babyWeight,
          familyPlanningDiscussed: req.body.familyPlanningDiscussed || false,
          familyPlanningMethodAccepted: req.body.familyPlanningMethodAccepted,
          notes: req.body.notes,
          recordedById: user.id
        };

        const postnatalRecord = await this.repository.recordPostnatalVisit(postnatalData);

        res.status(201).json({
          success: true,
          data: postnatalRecord,
          message: 'Postnatal visit recorded successfully'
        });
      } catch (error) {
        console.error('Error recording postnatal visit:', error);
        res.status(500).json({ 
          success: false, 
          message: 'Error recording postnatal visit',
          error: (error as Error).message 
        });
      }
    }
  ];

  // ===================== GET ANTENATAL RECORD BY ENCOUNTER =====================
  getAntenatalRecordByEncounter = async (req: AuthRequest, res: Response) => {
    try {
      const { encounterId } = req.params;
      
      const antenatalRecord = await this.repository.getAntenatalRecordByAttendanceId(encounterId);
      
      if (!antenatalRecord) {
        return res.status(404).json({ success: false, message: 'Antenatal record not found for this encounter' });
      }

      res.json({ success: true, data: antenatalRecord });
    } catch (error) {
      console.error('Error fetching antenatal record:', error);
      res.status(500).json({ success: false, message: 'Error fetching antenatal record' });
    }
  };

  // ===================== GET ANTENATAL RECORD BY ID =====================
  getAntenatalRecordById = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      
      const antenatalRecord = await this.repository.getAntenatalRecordById(id);

      if (!antenatalRecord) {
        return res.status(404).json({ success: false, message: 'Antenatal record not found' });
      }
      
      res.json({ success: true, data: antenatalRecord });
    } catch (error) {
      console.error('Error fetching antenatal record:', error);
      res.status(500).json({ success: false, message: 'Error fetching antenatal record' });
    }
  };

  // ===================== GET ACTIVE ANTENATAL RECORD BY PATIENT =====================
  getActiveAntenatalRecordByPatient = async (req: AuthRequest, res: Response) => {
    try {
      const { patientId } = req.params;

      const antenatalRecord = await this.repository.getActiveAntenatalRecordByPatientId(patientId);

      if (!antenatalRecord) {
        return res.status(404).json({ success: false, message: 'No active antenatal record found for this patient' });
      }
      
      res.json({ success: true, data: antenatalRecord });
    } catch (error) {
      console.error('Error fetching antenatal record:', error);
      res.status(500).json({ success: false, message: 'Error fetching antenatal record' });
    }
  };

  // ===================== LIST ALL ANTENATAL RECORDS =====================
  listAntenatalRecords = async (req: AuthRequest, res: Response) => {
    try {
      const { page = 1, limit = 50, isActive = 'true', patientId } = req.query;

      const filters: any = {
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      };

      if (isActive === 'true') filters.isActive = true;
      else if (isActive === 'false') filters.isActive = false;
      if (patientId) filters.patientId = patientId as string;

      const result = await this.repository.getAllAntenatalRecords(filters);

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
      console.error('Error fetching antenatal records:', error);
      res.status(500).json({ success: false, message: 'Error fetching antenatal records' });
    }
  };

  // ===================== UPDATE ANTENATAL RECORD =====================
  updateAntenatalRecord = [
    body('numberOfPregnancies').optional().isInt({ min: 0 }),
    body('numberOfDeliveries').optional().isInt({ min: 0 }),
    body('estimatedDueDate').optional().isISO8601(),
    body('riskLevel').optional().isIn(['low', 'medium', 'high']),
    body('bloodGroup').optional().isString(),
    body('hivStatus').optional().isString(),
    body('hemoglobinLevel').optional().isFloat(),

    async (req: AuthRequest, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { id } = req.params;
        const updates: UpdateAntenatalBookingInput = req.body;
        
        const antenatalRecord = await this.repository.updateAntenatalRecord(id, updates);

        res.json({ 
          success: true, 
          data: antenatalRecord, 
          message: 'Antenatal record updated successfully' 
        });
      } catch (error) {
        console.error('Error updating antenatal record:', error);
        res.status(500).json({ success: false, message: 'Error updating antenatal record' });
      }
    }
  ];

  // ===================== CLOSE ANTENATAL RECORD =====================
  closeAntenatalRecord = [
    body('deliveryDate').optional().isISO8601(),
    body('deliveryOutcome').optional().isString(),
    body('deliveryRecordId').optional().isString(),

    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params;
        const { deliveryDate, deliveryOutcome, deliveryRecordId } = req.body;

        const antenatalRecord = await this.repository.closeAntenatalRecord(id, {
          deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
          deliveryOutcome,
          deliveryRecordId
        });

        res.json({ 
          success: true, 
          data: antenatalRecord, 
          message: 'Antenatal record closed successfully' 
        });
      } catch (error) {
        console.error('Error closing antenatal record:', error);
        res.status(500).json({ success: false, message: 'Error closing antenatal record' });
      }
    }
  ];

  // ===================== DELETE ANTENATAL RECORD =====================
  deleteAntenatalRecord = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      
      await this.repository.deleteAntenatalRecord(id);
      
      res.json({ success: true, message: 'Antenatal record deleted successfully' });
    } catch (error) {
      console.error('Error deleting antenatal record:', error);
      res.status(500).json({ success: false, message: 'Error deleting antenatal record' });
    }
  };

  // ===================== LIST ANC VISITS BY ANTENATAL RECORD =====================
  listANCVisitsByAntenatalRecord = async (req: AuthRequest, res: Response) => {
    try {
      const { antenatalRecordId } = req.params;
      
      const visits = await this.repository.getVisitsByAntenatalRecordId(antenatalRecordId);
      
      res.json({ success: true, data: visits });
    } catch (error) {
      console.error('Error fetching ANC visits:', error);
      res.status(500).json({ success: false, message: 'Error fetching ANC visits' });
    }
  };

  // ===================== GET ANC VISIT BY ID =====================
  getANCVisitById = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      
      const visit = await this.repository.getANCVisitById(id);

      if (!visit) {
        return res.status(404).json({ success: false, message: 'ANC visit not found' });
      }
      
      res.json({ success: true, data: visit });
    } catch (error) {
      console.error('Error fetching ANC visit:', error);
      res.status(500).json({ success: false, message: 'Error fetching ANC visit' });
    }
  };

  // ===================== UPDATE ANC VISIT =====================
  updateANCVisit = [
    body('weight').optional().isFloat({ min: 0 }),
    body('bloodPressure').optional().isString(),
    body('fundalHeight').optional().isInt(),
    body('fetalHeartRate').optional().isInt({ min: 60, max: 200 }),
    body('iptpDoseGiven').optional().isBoolean(),
    body('tetanusToxoidGiven').optional().isBoolean(),

    async (req: AuthRequest, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { id } = req.params;
        const updates: UpdateANCVisitInput = req.body;
        
        const visit = await this.repository.updateANCVisit(id, updates);

        res.json({ 
          success: true, 
          data: visit, 
          message: 'ANC visit updated successfully' 
        });
      } catch (error) {
        console.error('Error updating ANC visit:', error);
        res.status(500).json({ success: false, message: 'Error updating ANC visit' });
      }
    }
  ];

  // ===================== DELETE ANC VISIT =====================
  deleteANCVisit = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      
      await this.repository.deleteANCVisit(id);
      
      res.json({ success: true, message: 'ANC visit deleted successfully' });
    } catch (error) {
      console.error('Error deleting ANC visit:', error);
      res.status(500).json({ success: false, message: 'Error deleting ANC visit' });
    }
  };

  // ===================== STATISTICS =====================
  getAntenatalStatistics = async (req: AuthRequest, res: Response) => {
    try {
      const { startDate, endDate } = req.query;
      
      const stats = await this.repository.getAntenatalStatistics(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('Error fetching antenatal statistics:', error);
      res.status(500).json({ success: false, message: 'Error fetching statistics' });
    }
  };

  getDeliveryStatistics = async (req: AuthRequest, res: Response) => {
    try {
      const { startDate, endDate } = req.query;
      
      const stats = await this.repository.getDeliveryStatistics(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('Error fetching delivery statistics:', error);
      res.status(500).json({ success: false, message: 'Error fetching statistics' });
    }
  };

  getPostnatalStatistics = async (req: AuthRequest, res: Response) => {
    try {
      const { startDate, endDate } = req.query;
      
      const stats = await this.repository.getPostnatalStatistics(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('Error fetching postnatal statistics:', error);
      res.status(500).json({ success: false, message: 'Error fetching statistics' });
    }
  };
}