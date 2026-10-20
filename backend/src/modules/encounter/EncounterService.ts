import { PrismaClient, AttendanceStatus } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { EncounterRepository } from './EncounterRepository';
import { getCounterService } from '../../services/CounterService';
import { cached } from '../../utils/ttlCache';
import { ValidationError, NotFoundError } from '../../utils/errors';
import { decreaseDepartmentStockBalance } from '../stockItem/StockBalance';
import { 
  CreateEncounterDTO, UpdateEncounterDTO, AddDiagnosisDTO, AddVitalsDTO, 
  AddPrescriptionDTO, AddLabTestDTO, AddScanDTO, AddProcedureDTO, AddServiceDTO,
  CreateAdmissionDTO, AddDailyNoteDTO, DetentionPatientFilters, ConvertDetentionToIPDDTO
} from './EncounterTypes';

/** Worklists are identical for every user. One result is shared for a few seconds; the cache is
 *  also cleared the moment anyone saves a change (see realtimeBroadcast), so a screen that
 *  refreshes after a save never receives stale data. */
const WORKLIST_CACHE_MS = 5_000;

export class EncounterService extends BaseService {
  private repository: EncounterRepository;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    super('EncounterService');
    this.prisma = prisma;
    this.repository = new EncounterRepository(prisma);
  }

  // ============================================
  // CREATE ENCOUNTER (WRAPPED IN ATOMIC TRANSACTION)
  // ============================================
  async createEncounter(data: CreateEncounterDTO, userId: string) {
    if (data.paymentMode === 'nhis' && !data.nhisCCC) throw new ValidationError('NHIS CCC number is required for NHIS payments');
    if (data.paymentMode === 'corporate' && !data.corporateAccountId) throw new ValidationError('Corporate Account ID is required');

    let encounterCategory = data.encounterCategory || 'opd';
    let admissionType = data.admissionType;
    let shouldCreateAdmission = false;

    if (data.expectedStayHours && data.expectedStayHours <= 12) {
      encounterCategory = 'daycase';
    } else if (data.isObservation || (data.expectedStayHours && data.expectedStayHours > 12 && data.expectedStayHours <= 72)) {
      encounterCategory = 'ipd';
      admissionType = 'detention_observation';
      shouldCreateAdmission = true;
    } else if (data.expectedStayHours && data.expectedStayHours > 72) {
      encounterCategory = 'ipd';
      admissionType = data.admissionType || 'emergency';
      shouldCreateAdmission = true;
    } else if (data.admissionType && data.admissionType !== 'detention_observation') {
      encounterCategory = 'ipd';
      admissionType = data.admissionType;
      shouldCreateAdmission = true;
    }

    if (encounterCategory !== 'opd' && (!data.bedId || !data.wardId)) {
      throw new ValidationError(`${encounterCategory.toUpperCase()} requires a bed and ward assignment`);
    }

    let insuranceProviderId = data.insuranceProviderId;
    if (data.paymentMode === 'nhis' && !insuranceProviderId) {
      const nhisProvider = await this.prisma.insuranceProvider.findFirst({ where: { type: 'nhis', isActive: true } });
      if (nhisProvider) insuranceProviderId = nhisProvider.id;
    }
    if (data.paymentMode === 'cash' || data.paymentMode === 'corporate') insuranceProviderId = null;

    // ✅ PRODUCTION FIX: Wrap entire complex creation flow in a transaction
    return await this.prisma.$transaction(async (tx) => {
      const counterService = getCounterService();
      const encounter = await tx.attendance.create({
        data: {
          attendanceNumber: counterService.nextAttendanceNumber(),
          patientId: data.patientId,
          attendanceType: data.attendanceType,
          paymentMode: data.paymentMode,
          nhisCCC: data.nhisCCC,
          insuranceProviderId,
          medicalNotes: data.complaint || '', // Mapped from schema fix
          encounterCategory,
          status: 'pending',
          createdById: userId,
          dateTime: new Date(),
        },
        include: { Patient: true }
      });

      // 1. Maternal Logic (Passed tx to ensure atomicity)
      if (data.attendanceType === 'antenatal') await this.handleAntenatalEncounter(tx, encounter.id, data.patientId, userId);
      else if (data.attendanceType === 'delivery') await this.handleDeliveryEncounter(tx, encounter.id, data.patientId, userId);
      else if (data.attendanceType === 'postnatal') await this.handlePostnatalEncounter(tx, encounter.id, data.patientId, userId);

      // 2. Bed/Ward Logic (Removed currentPatientId per schema fix)
      if (data.bedId) {
        await tx.bed.update({ where: { id: data.bedId }, data: { isOccupied: true } });
        await tx.ward.update({ where: { id: data.wardId! }, data: { occupiedBeds: { increment: 1 } } });
      }

      // 3. Admission Logic
      if (shouldCreateAdmission && encounterCategory === 'ipd') {
        await tx.admission.create({
          data: {
            attendanceId: encounter.id,
            admissionNumber: counterService.nextAdmissionNumber(),
            admissionType: (admissionType as any) || 'emergency',
            admissionSource: (data.admissionSource as any) || 'opd'
          }
        });
      }

      this.logInfo('Encounter created successfully', { encounterId: encounter.id, category: encounterCategory });
      return encounter;
    });
  }

  // ============================================
  // MATERNAL HANDLERS (Updated to accept `tx`)
  // ============================================
  private async handleAntenatalEncounter(tx: any, encounterId: string, patientId: string, userId: string) {
    const existingBooking = await tx.antenatalBooking.findFirst({ where: { patientId, isActive: true, isCompleted: false } });
    const attendance = await tx.attendance.findUnique({ where: { id: encounterId }, select: { dateTime: true } });

    if (!existingBooking) {
      const booking = await tx.antenatalBooking.create({
        data: {
          patientId, attendanceId: encounterId, currentAttendanceId: encounterId, bookingDate: new Date(),
          gravida: 1, para: 0, riskLevel: 'low', riskFactors: [], isActive: true, isCompleted: false, createdById: userId,
          iptpDoses: {}, ttDoses: {}, previousCSection: false, malariaTested: false, malariaPositive: false,
          anaemiaDiagnosed: false, ironFolateGiven: false, itnGiven: false
        }
      });
      await tx.aNCVisit.create({
        data: {
          bookingId: booking.id, attendanceId: encounterId, visitNumber: 1, visitDate: attendance?.dateTime || new Date(), recordedById: userId,
          iptpGiven: false, ttGiven: false, ironGiven: false, folateGiven: false, calciumGiven: false,
          malariaTestDone: false, malariaTreatmentGiven: false, dangerSignsPresent: false, referralMade: false, oedema: false, dangerSignsList: []
        }
      });
    } else {
      const visitCount = await tx.aNCVisit.count({ where: { bookingId: existingBooking.id } });
      await tx.aNCVisit.create({
        data: {
          bookingId: existingBooking.id, attendanceId: encounterId, visitNumber: visitCount + 1, visitDate: attendance?.dateTime || new Date(), recordedById: userId,
          gravida: existingBooking.gravida, para: existingBooking.para,
          iptpGiven: false, ttGiven: false, ironGiven: false, folateGiven: false, calciumGiven: false,
          malariaTestDone: false, malariaTreatmentGiven: false, dangerSignsPresent: false, referralMade: false, oedema: false, dangerSignsList: []
        }
      });
      await tx.antenatalBooking.update({ where: { id: existingBooking.id }, data: { currentAttendanceId: encounterId } });
    }
  }

  private async handleDeliveryEncounter(tx: any, encounterId: string, patientId: string, userId: string) {
    const antenatalBooking = await tx.antenatalBooking.findFirst({ where: { patientId, isActive: true, isCompleted: false } });
    const user = await tx.user.findUnique({ where: { id: userId }, select: { fullName: true, role: true } });
    const attendantName = user ? `${user.fullName} (${user.role || 'Staff'})` : 'Unknown Attendant';

    const deliveryRecord = await tx.deliveryRecord.create({
      data: {
        patientId, attendanceId: encounterId, antenatalBookingId: antenatalBooking?.id, deliveryDate: new Date(),
        deliveryType: 'spontaneous_vertex', deliveryOutcome: 'live_birth', placeOfDelivery: 'private_hospital',
        attendant: attendantName, maternalOutcome: 'alive', complications: [], createdById: userId,
        malePartnerPresentANC: false, malePartnerPresentDelivery: false, malePartnerPresentPNC: false,
        maternalDeathsAudited: false, auditNotes: null
      }
    });

    if (antenatalBooking) {
      await tx.antenatalBooking.update({
        where: { id: antenatalBooking.id },
        data: { isActive: false, isCompleted: true, deliveryDate: new Date(), deliveryOutcome: 'delivered', deliveryRecordId: deliveryRecord.id }
      });
    }
  }

  private async handlePostnatalEncounter(tx: any, encounterId: string, patientId: string, userId: string) {
    const deliveryRecord = await tx.deliveryRecord.findFirst({ where: { patientId }, orderBy: { deliveryDate: 'desc' } });
    const antenatalBooking = await tx.antenatalBooking.findFirst({ where: { patientId, isCompleted: true }, orderBy: { bookingDate: 'desc' } });
    
    let dayNumber = 1;
    if (deliveryRecord?.deliveryDate) {
      dayNumber = Math.max(1, Math.floor((Date.now() - new Date(deliveryRecord.deliveryDate).getTime()) / (1000 * 60 * 60 * 24)));
    }

    await tx.postnatalRecord.create({
      data: {
        patientId, attendanceId: encounterId, antenatalBookingId: antenatalBooking?.id, deliveryRecordId: deliveryRecord?.id,
        examinationDate: new Date(), dayNumber, maternalCondition: 'good', maternalComplications: [],
        lochia: 'normal', perinealCondition: 'intact', breastfeedingStatus: 'exclusive', breastfeedingDifficulties: [],
        latching: 'good', babyCondition: 'good', babyWeight: deliveryRecord?.birthWeight ? deliveryRecord.birthWeight / 1000 : null,
        babyFeeding: 'good', jaundice: false, cordCondition: 'dry', bcgGiven: false, opv0Given: false, hepB0Given: false,
        familyPlanningDiscussed: false, maternalDangerSigns: [], babyDangerSigns: [], referralMade: false,
        notes: 'Initial postnatal examination created automatically.', createdById: userId
      }
    });
  }

  // ============================================
  // ADMISSION & DISCHARGE (WRAPPED IN TRANSACTIONS)
  // ============================================
  async createFormalAdmission(data: CreateAdmissionDTO, userId: string) {
    const encounter = await this.prisma.attendance.findUnique({ where: { id: data.attendanceId }, include: { Admission: true } });
    if (!encounter) throw new NotFoundError('Encounter', data.attendanceId);
    if (encounter.Admission) throw new ValidationError('This encounter already has a formal admission record');

    return await this.prisma.$transaction(async (tx) => {
      const admission = await tx.admission.create({
        data: {
          attendanceId: data.attendanceId,
          admissionNumber: getCounterService().nextAdmissionNumber(),
          admissionType: (data.admissionType as any) || 'emergency',
          admissionSource: (data.admissionSource as any) || 'home',
          admissionDate: data.admissionDate || new Date(),
        },
        include: { attendance: { include: { Patient: true, Bed: true, Ward: true } } }
      });
      
      await tx.attendance.update({ where: { id: data.attendanceId }, data: { status: 'admitted' } });
      return admission;
    });
  }

  async dischargeFromEncounter(encounterId: string, dischargeData: any, userId: string) {
    const encounter = await this.prisma.attendance.findUnique({ where: { id: encounterId }, include: { Admission: true, Patient: true } });
    if (!encounter) throw new NotFoundError('Encounter', encounterId);
    if (encounter.status === 'discharged') throw new ValidationError('Patient already discharged');

    return await this.prisma.$transaction(async (tx) => {
      await tx.attendance.update({ where: { id: encounterId }, data: { status: 'discharged', bedId: null } });

      if (encounter.Admission) {
        await tx.admission.update({
          where: { id: encounter.Admission.id },
          data: {
            dischargeDate: dischargeData.dischargeDate || new Date(),
            dischargeStatus: (dischargeData.dischargeStatus as any) || 'home',
            dailyNotes: [
              ...(encounter.Admission.dailyNotes as any[] || []),
              { id: Date.now().toString(), notes: `Discharged. Summary: ${dischargeData.dischargeSummary || 'None'}`, noteType: 'discharge', createdBy: userId, createdAt: new Date().toISOString() }
            ]
          }
        });
      }

      if (encounter.bedId) {
        await tx.bed.update({ where: { id: encounter.bedId }, data: { isOccupied: false } }); // Removed currentPatientId
        if (encounter.wardId) await tx.ward.update({ where: { id: encounter.wardId }, data: { occupiedBeds: { decrement: 1 } } });
      }

      await tx.notification.create({
        data: { userId, title: 'Patient Discharged', message: `${encounter.Patient.surname} ${encounter.Patient.otherNames} discharged.`, type: 'clinical', priority: 'medium', actionType: 'discharge', actionId: encounterId }
      });

      return { message: 'Patient discharged successfully', dischargeDate: dischargeData.dischargeDate || new Date() };
    });
  }



    // ============================================
  // POST-VISIT TRANSITIONS
  // ============================================

  /**
   * Refer an attendance to another facility.
   * - Creates the ReferralRecord (via ReferralService so outgoing referrals
   *   stay consistent with the rest of the referral module)
   * - Sets attendance.status = 'referred'
   * - Closes the admission (if any) with dischargeStatus='transfer'
   * - Frees the bed
   */
  async referFromEncounter(encounterId: string, data: {
    referredToFacility: string;
    referralReason: string;
    referredToDoctor?: string;
    referredToDepartment?: string;
    referralNotes?: string;
    urgency?: 'routine' | 'urgent' | 'stat';
    referralDate?: string | Date;
  }, userId: string) {
    if (!data.referredToFacility?.trim()) {
      throw new ValidationError('referredToFacility is required');
    }
    if (!data.referralReason?.trim()) {
      throw new ValidationError('referralReason is required');
    }

    const encounter = await this.prisma.attendance.findUnique({
      where: { id: encounterId },
      include: { Admission: true, Patient: true, referral: true },
    });
    if (!encounter) throw new NotFoundError('Encounter', encounterId);

    const terminal = ['discharged', 'referred', 'absconded', 'completed', 'cancelled'];
    if (terminal.includes(encounter.status)) {
      throw new ValidationError(`Cannot refer: encounter is already "${encounter.status}"`);
    }
    if (encounter.referral) {
      throw new ValidationError(
        `This encounter already has referral ${encounter.referral.referralNumber}`,
      );
    }

    // Reuse the referral module so the record is created by the same
    // code path as `POST /referrals/outgoing`.
    const { ReferralService } = await import('../referral/ReferralService');
    const referralService = new ReferralService(this.prisma);
    const referral = await referralService.createOutgoingReferral(
      {
        patientId: encounter.patientId,
        encounterId: encounterId,
        referralReason: data.referralReason,
        referredToFacility: data.referredToFacility,
        referredToDoctor: data.referredToDoctor,
        referredToDepartment: data.referredToDepartment,
        referralNotes: data.referralNotes,
        urgency: data.urgency ?? 'routine',
        referralDate: data.referralDate as any,
      } as any,
      userId,
    );

    return this.prisma.$transaction(async (tx) => {
      // Close admission (transfer) — mirrors dischargeFromEncounter
      if (encounter.Admission && !encounter.Admission.dischargeDate) {
        const existingNotes = Array.isArray(encounter.Admission.dailyNotes)
          ? (encounter.Admission.dailyNotes as any[])
          : [];
        await tx.admission.update({
          where: { id: encounter.Admission.id },
          data: {
            dischargeDate: new Date(),
            dischargeStatus: 'transfer',
            dailyNotes: [
              ...existingNotes,
              {
                id: Date.now().toString(),
                noteType: 'referral',
                notes: `Referred to ${data.referredToFacility}. Reason: ${data.referralReason}`,
                createdBy: userId,
                createdAt: new Date().toISOString(),
              },
            ],
          },
        });
      }

      // Free the bed / decrement occupancy
      if (encounter.bedId) {
        await tx.bed.update({
          where: { id: encounter.bedId },
          data: { isOccupied: false },
        });
        if (encounter.wardId) {
          await tx.ward.update({
            where: { id: encounter.wardId },
            data: { occupiedBeds: { decrement: 1 } },
          });
        }
      }

      // Set attendance status — one field, no derived state
      const updated = await tx.attendance.update({
        where: { id: encounterId },
        data: { status: 'referred', bedId: null, updatedById: userId },
      });

      await tx.notification.create({
        data: {
          userId,
          title: 'Patient Referred',
          message: `${encounter.Patient.surname} ${encounter.Patient.otherNames} referred to ${data.referredToFacility}.`,
          type: 'clinical',
          priority: data.urgency === 'stat' ? 'urgent' : data.urgency === 'urgent' ? 'high' : 'medium',
          actionType: 'referral',
          actionId: referral.id,
        },
      });

      this.logInfo('Encounter referred', { encounterId, referralId: referral.id, userId });
      return { attendance: updated, referral };
    });
  }

  /**
   * Mark an attendance as absconded (patient left without formal discharge).
   * - Sets attendance.status = 'absconded'
   * - Closes the admission (if any) with dischargeStatus='against_medical_advice'
   * - Frees the bed
   */
  async abscondFromEncounter(encounterId: string, data: { notes?: string; abscondDate?: string | Date }, userId: string) {
    const encounter = await this.prisma.attendance.findUnique({
      where: { id: encounterId },
      include: { Admission: true, Patient: true },
    });
    if (!encounter) throw new NotFoundError('Encounter', encounterId);

    const terminal = ['discharged', 'referred', 'absconded', 'completed', 'cancelled'];
    if (terminal.includes(encounter.status)) {
      throw new ValidationError(`Cannot mark absconded: encounter is already "${encounter.status}"`);
    }

    return this.prisma.$transaction(async (tx) => {
      if (encounter.Admission && !encounter.Admission.dischargeDate) {
        const existingNotes = Array.isArray(encounter.Admission.dailyNotes)
          ? (encounter.Admission.dailyNotes as any[])
          : [];
        await tx.admission.update({
          where: { id: encounter.Admission.id },
          data: {
            dischargeDate: data.abscondDate ? new Date(data.abscondDate) : new Date(),
            dischargeStatus: 'against_medical_advice',
            dailyNotes: [
              ...existingNotes,
              {
                id: Date.now().toString(),
                noteType: 'absconded',
                notes: `Patient absconded. ${data.notes || ''}`.trim(),
                createdBy: userId,
                createdAt: new Date().toISOString(),
              },
            ],
          },
        });
      }

      if (encounter.bedId) {
        await tx.bed.update({
          where: { id: encounter.bedId },
          data: { isOccupied: false },
        });
        if (encounter.wardId) {
          await tx.ward.update({
            where: { id: encounter.wardId },
            data: { occupiedBeds: { decrement: 1 } },
          });
        }
      }

      const updated = await tx.attendance.update({
        where: { id: encounterId },
        data: { status: 'absconded', bedId: null, updatedById: userId },
      });

      this.logInfo('Encounter absconded', { encounterId, userId, notes: data.notes });
      return updated;
    });
  }

  /**
   * Mark an OPD visit as completed.
   * Refuses if an active admission exists — that must be discharged/referred/absconded first.
   */
  async completeEncounter(encounterId: string, userId: string) {
    const encounter = await this.prisma.attendance.findUnique({
      where: { id: encounterId },
      include: { Admission: true },
    });
    if (!encounter) throw new NotFoundError('Encounter', encounterId);

    const terminal = ['discharged', 'referred', 'absconded', 'completed', 'cancelled'];
    if (terminal.includes(encounter.status)) {
      throw new ValidationError(`Cannot complete: encounter is already "${encounter.status}"`);
    }
    if (encounter.Admission && !encounter.Admission.dischargeDate) {
      throw new ValidationError(
        'Cannot complete while an admission is active. Discharge, refer, or mark absconded first.',
      );
    }

    return this.prisma.attendance.update({
      where: { id: encounterId },
      data: { status: 'completed', updatedById: userId },
    });
  }


  
  async convertDetentionToFormalIPD(encounterId: string, data: ConvertDetentionToIPDDTO, userId: string) {
    const encounter = await this.prisma.attendance.findUnique({ where: { id: encounterId }, include: { Admission: true, Patient: true } });
    if (!encounter || !encounter.Admission || encounter.Admission.admissionType !== 'detention_observation') {
      throw new ValidationError('Only detention/observation patients can be converted');
    }

    return await this.prisma.$transaction(async (tx) => {
      const updatedAdmission = await tx.admission.update({
        where: { id: encounter.Admission!.id },
        data: {
          admissionType: data.admissionType as any,
          dailyNotes: [
            ...(encounter.Admission!.dailyNotes as any[] || []),
            { id: Date.now().toString(), notes: `Converted to formal IPD. Reason: ${data.decisionReason || 'Clinical'}`, noteType: 'conversion', createdBy: userId, createdAt: new Date().toISOString() }
          ]
        }
      });

      // ✅ FIXED: Removed invalid `admissionType` update on Attendance
      await tx.attendance.update({
        where: { id: encounterId },
        data: { medicalNotes: `${encounter.medicalNotes || ''}\n\n[${new Date().toISOString()}] Converted to formal IPD` }
      });

      return { success: true, admission: updatedAdmission, message: `Converted to ${data.admissionType}` };
    });
  }

  // ============================================
  // PHARMACY (FIXED RACE CONDITION)
  // ============================================
  async dispenseMedication(encounterId: string, medicationId: string, quantity: number, userId: string, batchNumber?: string, expiryDate?: Date) {
    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      throw new ValidationError('Dispensed quantity must be a positive whole number');
    }

    return this.prisma.$transaction(async (tx) => {
      const medication = await tx.medication.findUnique({
        where: { id: medicationId },
        include: { StockItem: true },
      });
      if (!medication || medication.status !== 'prescribed') {
        throw new ValidationError('Medication not found or not prescribed');
      }
      if (medication.attendanceId !== encounterId) {
        throw new ValidationError('Medication does not belong to this encounter');
      }

      const stockItem = medication.StockItem;
      if (!stockItem) throw new ValidationError('This medication is not linked to a stock item');

      // Department is read from the current user record, not trusted from the request body.
      const dispensingUser = await tx.user.findUnique({
        where: { id: userId },
        select: { departmentId: true },
      });
      if (!dispensingUser) throw new NotFoundError('Dispensing user not found');
      const departmentId = dispensingUser.departmentId ?? null;
      const now = new Date();

      // Claim this prescription inside the same transaction before changing stock. The
      // conditional update prevents two concurrent requests from dispensing the same
      // prescribed medication twice. If a later stock check fails, the transaction rolls back.
      const medicationClaim = await tx.medication.updateMany({
        where: { id: medicationId, attendanceId: encounterId, status: 'prescribed' },
        data: { status: 'dispensed' },
      });
      if (medicationClaim.count !== 1) {
        throw new ValidationError('Medication has already been dispensed or is no longer available');
      }

      // If batch tracking has started for this item, dispensing must consume a matching
      // active, unexpired batch in the user's department/store. Never fall back to aggregate
      // stock when batches exist elsewhere or cannot satisfy the requested quantity.
      const anyBatches = await tx.stockBatch.count({ where: { stockItemId: stockItem.id } });
      let selectedBatch: any = null;

      if (anyBatches === 0) {
        if (batchNumber != null && !batchNumber.trim()) {
          throw new ValidationError('Batch number cannot be blank');
        }
        if (expiryDate !== undefined) {
          if (!(expiryDate instanceof Date) || !Number.isFinite(expiryDate.getTime())) {
            throw new ValidationError('A valid batch expiry date is required');
          }
          if (expiryDate <= now) {
            throw new ValidationError('Expired medication cannot be dispensed');
          }
        }
      }

      if (anyBatches > 0) {
        selectedBatch = await tx.stockBatch.findFirst({
          where: {
            stockItemId: stockItem.id,
            departmentId,
            wardId: null,
            isActive: true,
            expiryDate: { gt: now },
            quantity: { gte: quantity },
          },
          orderBy: [{ expiryDate: 'asc' }, { receivedDate: 'asc' }],
        });
        if (!selectedBatch) {
          throw new ValidationError('No active, unexpired batch in your department has enough stock for this dispense');
        }

        const batchUpdate = await tx.stockBatch.updateMany({
          where: {
            id: selectedBatch.id,
            departmentId,
            wardId: null,
            isActive: true,
            expiryDate: { gt: now },
            quantity: { gte: quantity },
          },
          data: { quantity: { decrement: quantity } },
        });
        if (batchUpdate.count !== 1) {
          throw new ValidationError('Batch stock changed during dispensing. Refresh the stock and try again');
        }
      }

      // Department balance and hospital aggregate must change atomically with the batch.
      await decreaseDepartmentStockBalance(tx, stockItem.id, departmentId, quantity);

      // Guarded aggregate decrement prevents concurrent dispenses from creating negative stock.
      const itemUpdate = await tx.stockItem.updateMany({
        where: { id: stockItem.id, currentStock: { gte: quantity } },
        data: { currentStock: { decrement: quantity } },
      });
      if (itemUpdate.count !== 1) {
        throw new ValidationError(`Insufficient stock. Available: ${stockItem.currentStock}`);
      }
      const updatedStockItem = await tx.stockItem.findUnique({
        where: { id: stockItem.id },
        select: { currentStock: true },
      });
      if (!updatedStockItem) throw new NotFoundError('Stock item not found after dispensing');

      const updatedMedication = await tx.medication.update({
        where: { id: medicationId },
        data: {
          status: 'dispensed',
          quantity,
          dispensedAt: now,
          dispensedById: userId,
          dispensedBatchNumber: selectedBatch?.batchNumber ?? (anyBatches === 0 ? batchNumber : undefined),
          dispensedExpiryDate: selectedBatch?.expiryDate ?? (anyBatches === 0 ? expiryDate : undefined),
          dispensedUnitCost: selectedBatch?.costPrice ?? stockItem.costPrice,
        },
      });

      await tx.stockTransaction.create({
        data: {
          stockItemId: stockItem.id,
          transactionType: 'sale',
          quantity,
          balanceAfter: updatedStockItem.currentStock,
          reference: `Encounter ${encounterId}`,
          notes: selectedBatch ? `Dispensed from batch ${selectedBatch.batchNumber}` : undefined,
          performedBy: userId,
          departmentId: departmentId || undefined,
        },
      });

      return updatedMedication;
    });
  }

  // ============================================
  // STANDARD CRUD & WORKLISTS (Delegated to Repository)
  // ============================================
  async getEncounterById(id: string) {
    const encounter = await this.repository.findById(id);
    if (!encounter) throw new NotFoundError('Encounter', id);
    return encounter;
  }

  async getEncounters(filters: any) { return this.repository.findManyEncounters(filters); }
  async updateEncounter(id: string, data: UpdateEncounterDTO, userId: string) { return this.repository.updateEncounter(id, data); }
  async updateEncounterStatus(id: string, status: string) { return this.repository.updateStatus(id, status); }
  async deleteEncounter(id: string) { return this.repository.delete(id); }
  
  // Clinical Sub-resources
  async addDiagnosis(id: string, data: AddDiagnosisDTO, userId: string) { return this.repository.addDiagnosis(id, data, userId); }
  async setPrimaryDiagnosis(id: string, diagnosisId: string, userId: string) { return this.addDiagnosis(id, { diagnosisId, diagnosisType: 'primary' }, userId); }
  async removeDiagnosis(id: string, diagnosisId: string) { return this.repository.removeDiagnosis(id, diagnosisId); }
  
  /** Latest vitals reading for each of many encounters in ONE query (the nursing board used to ask once per patient). */
  async getLatestVitals(ids: string[]) {
    if (ids.length === 0) return [];
    return this.prisma.vitals.findMany({
      where: { attendanceId: { in: ids.slice(0, 200) } },
      distinct: ['attendanceId'],
      orderBy: [{ attendanceId: 'asc' }, { recordedAt: 'desc' }],
    });
  }

  async getVitalsByEncounter(id: string) { return this.prisma.vitals.findMany({ where: { attendanceId: id }, orderBy: { recordedAt: 'desc' } }); }
  async addVitals(id: string, data: AddVitalsDTO, userId: string) { return this.repository.addVitals(id, data, userId); }
  async updateVitals(id: string, data: any) { return this.repository.updateVitals(id, data); }
  async deleteVitals(id: string) { return this.repository.deleteVitals(id); }
  
  async addPrescription(id: string, data: AddPrescriptionDTO, userId: string) { return this.repository.addPrescription(id, data, userId); }
  async updateMedication(encounterId: string, medId: string, data: any, userId: string) { return this.repository.updateMedication(encounterId, medId, data, userId); }
  async removeMedication(id: string, medId: string) { return this.repository.removeMedication(id, medId); }
  
  async addLabTest(id: string, data: AddLabTestDTO, userId: string) { return this.repository.addLabTest(id, data, userId); }
  async updateLabTestStatus(id: string, status: string, results: any, userId?: string) { return this.repository.updateLabTestStatus(id, status, results, userId); }
  async removeLabTest(id: string, labId: string) { return this.repository.removeLabTest(id, labId); }
  
  async addScan(id: string, data: AddScanDTO, userId: string) { return this.repository.addScan(id, data, userId); }
  async updateScanStatus(id: string, status: string, results: any) { return this.repository.updateScanStatus(id, status, results); }
  async removeScan(id: string, scanId: string) { return this.repository.removeScan(id, scanId); }
  
  async addProcedure(id: string, data: AddProcedureDTO, userId: string) { return this.repository.addProcedure(id, data, userId); }
  async updateProcedureStatus(id: string, status: string, data: any) { return this.repository.updateProcedureStatus(id, status, data); }
  async removeProcedure(id: string, procId: string) { return this.repository.removeProcedure(id, procId); }
  
  async addService(id: string, data: AddServiceDTO, userId: string) { return this.repository.addService(id, data, userId); }
  async removeService(id: string, servId: string) { return this.repository.removeService(id, servId); }

  // Admissions & IPD
  async getAllAdmissions(filters: any) { return this.repository.getAllAdmissions(filters); }
  async getFormalIPDPatients(filters: any) { return this.repository.getAllAdmissions({ ...filters, excludeDetention: true }); }
  async getDetentionPatients(filters: any) {
    const result = await this.repository.getAllAdmissions({ ...filters, admissionType: 'detention_observation' });
    const readyForDecision = await this.repository.countReadyForDecision(Number(filters?.observationHours) || 24);
    return { ...result, summary: { total: result.total, readyForDecision } };
  }
  async getAdmissionById(id: string) {
    const admission = await this.repository.getAdmissionById(id);
    if (!admission) throw new NotFoundError('Admission', id);
    return admission;
  }
  async getAdmissionsByPatientId(patientId: string, filters: any) { return this.repository.getAdmissionsByPatientId(patientId, filters); }
  async updateAdmission(id: string, data: any, userId?: string) { return this.repository.updateAdmission(id, data, userId); }
  async deleteAdmission(id: string) { return this.repository.deleteAdmission(id); }
  async addDailyNotes(id: string, data: AddDailyNoteDTO, userId: string) { return this.repository.addDailyNotes(id, data, userId); }
  async getBedOccupancy() { return this.repository.getBedOccupancy(); }
   async getDaycasePatients(filters: any) {
    return this.repository.findManyEncounters({ ...filters, encounterCategory: 'daycase' });
  }
  async convertDaycaseToIPD(id: string, data: any, userId: string) { return this.createFormalAdmission({ ...data, attendanceId: id }, userId); }

  // Worklists
  async getVitalsWorklist() { return cached('worklist:vitals', WORKLIST_CACHE_MS, () => this.repository.getVitalsWorklist()); }
  async getMedicalWorklist() { return cached('worklist:medical', WORKLIST_CACHE_MS, () => this.repository.getMedicalWorklist()); }
  async getLabWorklist() { return cached('worklist:lab', WORKLIST_CACHE_MS, () => this.repository.getLabWorklist()); }
  async getPharmacyWorklist() { return cached('worklist:pharmacy', WORKLIST_CACHE_MS, () => this.repository.getPharmacyWorklist()); }
  async getRadiologyWorklist() { return cached('worklist:scans', WORKLIST_CACHE_MS, () => this.repository.getRadiologyWorklist()); }
  async getProceduresWorklist() { return cached('worklist:procedures', WORKLIST_CACHE_MS, () => this.repository.getProceduresWorklist()); }
  async getMaternalWorklist() { return cached('worklist:maternal', WORKLIST_CACHE_MS, () => this.repository.getMaternalWorklist()); }
  // Shown on every dashboard/sidebar: computed at most once every 15 s however many users ask
  async getWorklistSummary() {
    return cached('worklist:summary', 15_000, () => this.computeWorklistSummary());
  }

  private async computeWorklistSummary() {
    const [vitals, medical, lab, pharmacy, scans, theatre] = await Promise.all([
      this.getVitalsWorklist(), this.getMedicalWorklist(), this.getLabWorklist(),
      this.getPharmacyWorklist(), this.getRadiologyWorklist(), this.getProceduresWorklist()
    ]);
    return {
      vitals: { count: vitals.pending }, medical: { count: medical.pending }, lab: { count: lab.pending },
      pharmacy: { count: pharmacy.pending }, scans: { count: scans.pending }, theatre: { count: theatre.scheduled },
      total: vitals.pending + medical.pending + lab.pending + pharmacy.pending + scans.pending + theatre.scheduled
    };
  }

  // ✅ FIXED: Prisma groupBy syntax error
  // Counts over the whole visit table are the slowest dashboard query at 1M visits (~0.7 s).
  // Cached for 30 s per date range and shared by everyone who asks at the same time.
  async getEncounterStats(dateFrom?: Date, dateTo?: Date) {
    const key = `encounter-stats:${dateFrom?.toISOString() ?? ''}:${dateTo?.toISOString() ?? ''}`;
    return cached(key, 30_000, () => this.computeEncounterStats(dateFrom, dateTo));
  }

  private async computeEncounterStats(dateFrom?: Date, dateTo?: Date) {
    const where: any = {};
    if (dateFrom || dateTo) {
      where.dateTime = {};
      if (dateFrom) where.dateTime.gte = dateFrom;
      if (dateTo) where.dateTime.lte = dateTo;
    }

    const [total, byType, byStatus, byPaymentMode] = await Promise.all([
      this.prisma.attendance.count({ where }),
      this.prisma.attendance.groupBy({ by: ['attendanceType'], where, _count: { id: true } }),
      this.prisma.attendance.groupBy({ by: ['status'], where, _count: { id: true } }),
      this.prisma.attendance.groupBy({ by: ['paymentMode'], where, _count: { id: true } })
    ]);

    return {
      total,
      byType: byType.map(i => ({ type: i.attendanceType, count: i._count.id })),
      byStatus: byStatus.map(i => ({ status: i.status, count: i._count.id })),
      byPaymentMode: byPaymentMode.map(i => ({ mode: i.paymentMode, count: i._count.id }))
    };
  }

  private calculateAge(dateOfBirth: Date): number {
    const today = new Date(); const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  }
}