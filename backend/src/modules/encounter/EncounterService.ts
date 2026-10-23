import { PrismaClient, AttendanceStatus } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { EncounterRepository } from './EncounterRepository';
import { getCounterService } from '../../services/CounterService';
import { cached } from '../../utils/ttlCache';
import { ValidationError, NotFoundError } from '../../utils/errors';

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
    if (data.paymentMode === 'cash' || data.paymentMode === 'corporate') insuranceProviderId = undefined;

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
      // Delivery and postnatal forms must record clinician-confirmed findings. Do not
      // pre-create records with assumed live birth, maternal wellbeing or breastfeeding status.
      // Their dedicated save endpoints create the clinical record after staff complete the form.

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

  // ============================================
  // ADMISSION & DISCHARGE (WRAPPED IN TRANSACTIONS)
  // ============================================
  async createFormalAdmission(data: CreateAdmissionDTO, userId: string) {
    if (!data.bedId || !data.wardId) {
      throw new ValidationError('A bed and ward must be selected before admission');
    }

    return this.prisma.$transaction(async (tx) => {
      const encounter = await tx.attendance.findUnique({
        where: { id: data.attendanceId },
        include: { Admission: true },
      });
      if (!encounter) throw new NotFoundError('Encounter', data.attendanceId);
      if (encounter.Admission) throw new ValidationError('This encounter already has a formal admission record');
      if (['admitted', 'discharged', 'referred', 'absconded', 'completed', 'cancelled'].includes(encounter.status)) {
        throw new ValidationError('This encounter cannot be admitted in its current status');
      }

      const ward = await tx.ward.findUnique({ where: { id: data.wardId } });
      if (!ward || !ward.isActive) throw new ValidationError('The selected ward is unavailable');
      const bed = await tx.bed.findUnique({ where: { id: data.bedId } });
      if (!bed || bed.wardId !== data.wardId) {
        throw new ValidationError('The selected bed does not belong to the selected ward');
      }

      // Conditionally claim the bed to prevent concurrent admissions from sharing it.
      const bedClaim = await tx.bed.updateMany({
        where: { id: data.bedId, wardId: data.wardId, isOccupied: false },
        data: { isOccupied: true },
      });
      if (bedClaim.count !== 1) {
        throw new ValidationError('The selected bed is no longer available. Refresh the bed list and choose another bed.');
      }

      const attendanceUpdate = await tx.attendance.updateMany({
        where: { id: data.attendanceId, status: encounter.status, bedId: null },
        data: {
          status: 'admitted',
          encounterCategory: 'ipd',
          admissionType: data.admissionType || 'emergency',
          bedId: data.bedId,
          wardId: data.wardId,
          updatedById: userId,
        },
      });
      if (attendanceUpdate.count !== 1) {
        throw new ValidationError('The encounter changed while admission was being processed. Refresh and try again.');
      }

      await tx.ward.update({
        where: { id: data.wardId },
        data: { occupiedBeds: { increment: 1 } },
      });

      return tx.admission.create({
        data: {
          attendanceId: data.attendanceId,
          admissionNumber: getCounterService().nextAdmissionNumber(),
          admissionType: (data.admissionType as any) || 'emergency',
          admissionSource: (data.admissionSource as any) || 'home',
          admissionDate: data.admissionDate || new Date(),
        },
        include: { attendance: { include: { Patient: true, Bed: true, Ward: true } } },
      });
    });
  }
  async dischargeFromEncounter(encounterId: string, dischargeData: any, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const encounter = await tx.attendance.findUnique({
        where: { id: encounterId },
        include: { Admission: true, Patient: true },
      });
      if (!encounter) throw new NotFoundError('Encounter', encounterId);

      const terminal = ['discharged', 'referred', 'absconded', 'completed', 'cancelled'];
      if (terminal.includes(encounter.status)) {
        throw new ValidationError(`Cannot discharge: encounter is already "${encounter.status}"`);
      }

      const transition = await tx.attendance.updateMany({
        where: { id: encounterId, status: encounter.status },
        data: { status: 'discharged', bedId: null, updatedById: userId },
      });
      if (transition.count !== 1) {
        throw new ValidationError('Encounter changed while discharge was being processed. Refresh and try again.');
      }

      if (encounter.Admission && !encounter.Admission.dischargeDate) {
        const existingNotes = Array.isArray(encounter.Admission.dailyNotes)
          ? (encounter.Admission.dailyNotes as any[])
          : [];
        await tx.admission.update({
          where: { id: encounter.Admission.id },
          data: {
            dischargeDate: dischargeData.dischargeDate || new Date(),
            dischargeStatus: (dischargeData.dischargeStatus as any) || 'home',
            dailyNotes: [
              ...existingNotes,
              {
                id: Date.now().toString(),
                notes: `Discharged. Summary: ${dischargeData.dischargeSummary || 'None'}`,
                noteType: 'discharge',
                createdBy: userId,
                createdAt: new Date().toISOString(),
              },
            ],
          },
        });
      }

      if (encounter.bedId) {
        await tx.bed.update({ where: { id: encounter.bedId }, data: { isOccupied: false } });
        if (encounter.wardId) {
          await tx.ward.update({ where: { id: encounter.wardId }, data: { occupiedBeds: { decrement: 1 } } });
        }
      }

      await tx.notification.create({
        data: {
          userId,
          title: 'Patient Discharged',
          message: `${encounter.Patient.surname} ${encounter.Patient.otherNames} discharged.`,
          type: 'clinical',
          priority: 'medium',
          actionType: 'discharge',
          actionId: encounterId,
        },
      });

      return { message: 'Patient discharged successfully', dischargeDate: dischargeData.dischargeDate || new Date() };
    });
  }

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
    const referredToFacility = data.referredToFacility?.trim();
    const referralReason = data.referralReason?.trim();
    if (!referredToFacility) throw new ValidationError('referredToFacility is required');
    if (!referralReason) throw new ValidationError('referralReason is required');

    // Referral creation and every encounter side effect must commit or roll back together.
    return this.prisma.$transaction(async (tx) => {
      const encounter = await tx.attendance.findUnique({
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

      // The unique attendanceId constraint is a final safeguard against two concurrent
      // referrals for the same encounter. If anything later fails, this insert rolls back.
      const referral = await tx.referralRecord.create({
        data: {
          referralNumber: getCounterService().nextReferralNumber(),
          patientId: encounter.patientId,
          attendanceId: encounterId,
          referralType: 'outgoing',
          referralReason,
          referredToFacility,
          referredToDoctor: data.referredToDoctor?.trim() || undefined,
          referredToDepartment: data.referredToDepartment?.trim() || undefined,
          referralNotes: data.referralNotes?.trim() || undefined,
          urgency: data.urgency ?? 'routine',
          referralDate: data.referralDate ? new Date(data.referralDate) : undefined,
          status: 'pending',
          createdById: userId,
        },
        include: {
          patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true } },
          createdBy: { select: { fullName: true, role: true } },
        },
      });

      // Close admission (transfer) within the same transaction.
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
                notes: `Referred to ${referredToFacility}. Reason: ${referralReason}`,
                createdBy: userId,
                createdAt: new Date().toISOString(),
              },
            ],
          },
        });
      }

      // Free the bed and update ward occupancy in the same transaction as the referral.
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

      // Conditional status update prevents an older request overwriting a concurrent change.
      const attendanceUpdate = await tx.attendance.updateMany({
        where: { id: encounterId, status: encounter.status },
        data: { status: 'referred', bedId: null, updatedById: userId },
      });
      if (attendanceUpdate.count !== 1) {
        throw new ValidationError('Encounter changed while referral was being saved. Refresh and try again.');
      }
      const updated = await tx.attendance.findUniqueOrThrow({ where: { id: encounterId } });

      await tx.notification.create({
        data: {
          userId,
          title: 'Patient Referred',
          message: `${encounter.Patient.surname} ${encounter.Patient.otherNames} referred to ${referredToFacility}.`,
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
    return this.prisma.$transaction(async (tx) => {
      const encounter = await tx.attendance.findUnique({
        where: { id: encounterId },
        include: { Admission: true, Patient: true },
      });
      if (!encounter) throw new NotFoundError('Encounter', encounterId);

      const terminal = ['discharged', 'referred', 'absconded', 'completed', 'cancelled'];
      if (terminal.includes(encounter.status)) {
        throw new ValidationError(`Cannot mark absconded: encounter is already "${encounter.status}"`);
      }

      const transition = await tx.attendance.updateMany({
        where: { id: encounterId, status: encounter.status },
        data: { status: 'absconded', bedId: null, updatedById: userId },
      });
      if (transition.count !== 1) {
        throw new ValidationError('Encounter changed while absconding was being processed. Refresh and try again.');
      }

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
        await tx.bed.update({ where: { id: encounter.bedId }, data: { isOccupied: false } });
        if (encounter.wardId) {
          await tx.ward.update({ where: { id: encounter.wardId }, data: { occupiedBeds: { decrement: 1 } } });
        }
      }

      this.logInfo('Encounter absconded', { encounterId, userId, notes: data.notes });
      return tx.attendance.findUniqueOrThrow({ where: { id: encounterId } });
    });
  }

/**
   * Mark an OPD visit as completed.
   * Refuses if an active admission exists — that must be discharged/referred/absconded first.
   */
  async completeEncounter(encounterId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const encounter = await tx.attendance.findUnique({
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

      // Claim completion conditionally to avoid a stale request completing an encounter
      // after another staff member has already changed its lifecycle state.
      const transition = await tx.attendance.updateMany({
        where: { id: encounterId, status: encounter.status },
        data: { status: 'completed', updatedById: userId },
      });
      if (transition.count !== 1) {
        throw new ValidationError('Encounter changed while completion was being saved. Refresh and try again.');
      }

      return tx.attendance.findUniqueOrThrow({ where: { id: encounterId } });
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
    // Keep the public service entry point on the same atomic repository path used by
    // medication status updates, avoiding two competing implementations of stock deduction.
    return this.repository.updateMedication(encounterId, medicationId, {
      status: 'dispensed',
      quantity,
      batchNumber,
      expiryDate,
    }, userId);
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
  async updateEncounter(id: string, data: UpdateEncounterDTO, userId: string) { return this.repository.updateEncounter(id, data, userId); }
  async finalizeClinicalRecord(id: string, userId: string) { return this.repository.finalizeClinicalRecord(id, userId); }
  async updateEncounterStatus(id: string, status: string, userId: string) {
    // Completion must pass the same active-admission and terminal-state checks as
    // the dedicated endpoint. Other clinical transitions have their own workflows.
    if (status === 'completed') return this.completeEncounter(id, userId);
    return this.repository.updateStatus(id, status, userId);
  }
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
  async updateLabTestStatus(labId: string, status: string, results: any, userId: string) { return this.repository.updateLabTestStatus(labId, status, results, userId); }
  async removeLabTest(id: string, labId: string) { return this.repository.removeLabTest(id, labId); }
  
  async addScan(id: string, data: AddScanDTO, userId: string) { return this.repository.addScan(id, data, userId); }
  async updateScanStatus(scanId: string, status: string, results: any, userId: string) { return this.repository.updateScanStatus(scanId, status, results, userId); }
  async removeScan(id: string, scanId: string) { return this.repository.removeScan(id, scanId); }
  
  async addProcedure(id: string, data: AddProcedureDTO, userId: string) { return this.repository.addProcedure(id, data, userId); }
  async updateProcedureStatus(procedureId: string, status: string, data: any, userId: string) { return this.repository.updateProcedureStatus(procedureId, status, data, userId); }
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
  // Consumable stock use: keep controller calls on the transactional repository workflow.
  async getConsumableUses(encounterId: string) {
    return this.repository.getConsumableUses(encounterId);
  }

  async recordConsumableUse(
    encounterId: string,
    data: { stockItemId: string; quantity: number; notes?: string },
    userId: string,
  ) {
    if (!data?.stockItemId?.trim()) throw new ValidationError('Stock item is required');
    if (!Number.isSafeInteger(Number(data.quantity)) || Number(data.quantity) <= 0) {
      throw new ValidationError('Quantity must be a positive whole number');
    }
    return this.repository.recordConsumableUse(encounterId, data.stockItemId, Number(data.quantity), data.notes, userId);
  }

  async updateConsumableUse(
    encounterId: string,
    transactionId: string,
    data: { stockItemId: string; quantity: number; notes?: string },
    userId: string,
  ) {
    if (!data?.stockItemId?.trim()) throw new ValidationError('Stock item is required');
    if (!Number.isSafeInteger(Number(data.quantity)) || Number(data.quantity) <= 0) {
      throw new ValidationError('Quantity must be a positive whole number');
    }
    return this.repository.updateConsumableUse(
      encounterId, transactionId, data.stockItemId, Number(data.quantity), data.notes, userId,
    );
  }

  async deleteConsumableUse(encounterId: string, transactionId: string, userId: string) {
    return this.repository.deleteConsumableUse(encounterId, transactionId, userId);
  }

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