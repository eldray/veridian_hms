import { PrismaClient, Attendance, Admission } from '@prisma/client';
import { BaseRepository } from '../../shared/base/BaseRepository';
import { 
  CreateEncounterDTO, UpdateEncounterDTO, EncounterFilters, 
  AddDiagnosisDTO, AddVitalsDTO, AddPrescriptionDTO, AddLabTestDTO 
} from './EncounterTypes';
import { getCounterService } from '../../services/CounterService';
import { MarService } from '../nursing/NursingService';
import { NotFoundError, ConflictError, ValidationError } from '../../utils/errors';

// ✅ FIXED: Extends BaseRepository for enterprise consistency
/** "Live" visit window (see findManyEncounters). */
export const LIVE_PENDING_DAYS = 14;
export const LIVE_RECENT_HOURS = 72;

/**
 * Worklist windows. A worklist is a queue of work still to do, so it must not grow forever:
 *  - open work (visit pending, test requested, drug prescribed, procedure scheduled): last 30 days
 *    (admitted patients are always included, however long ago they were admitted)
 *  - finished work (result completed, drug dispensed): kept for 72 hours so results can be reviewed
 * Older items stay on the patient's record; they just stop crowding the queue.
 */
export const WORKLIST_OPEN_DAYS = 30;
export const WORKLIST_DONE_HOURS = 72;
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000);
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000);

export class EncounterRepository extends BaseRepository<Attendance, CreateEncounterDTO, UpdateEncounterDTO> {
 private marService: MarService;
  constructor(prisma: PrismaClient) {
    super(prisma, 'attendance');
    this.marService = new MarService(prisma);
  }
  

  // ============================================
  // CORE ENCOUNTER OPERATIONS
  // ============================================
  
  async create(data: CreateEncounterDTO, userId: string) {
    const counterService = getCounterService(); 
    return this.getModel().create({
      data: {
        attendanceNumber: counterService.nextAttendanceNumber(),
        patientId: data.patientId,
        attendanceType: data.attendanceType,
        paymentMode: data.paymentMode,
        nhisCCC: data.nhisCCC,
        insuranceProviderId: data.insuranceProviderId,
        
        // ✅ FIXED: Use complaint field directly (not complaints)
        complaints: data.complaint || '', 
        medicalNotes: data.medicalNotes || '', // Keep this separate
        
        status: 'pending',
        createdById: userId,
        dateTime: new Date(), 
      },
      include: {
        Patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true, dateOfBirth: true, gender: true } }
      }
    });
  }

  async findById(id: string) {
    return this.getModel().findUnique({
      where: { id },
      include: {
        Patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true, dateOfBirth: true, gender: true, contact: true } },
        AttendanceDiagnosis: { include: { Diagnosis: true }, orderBy: { date: 'desc' } },
        Vitals: { orderBy: { recordedAt: 'desc' }, take: 5 },
        Medication: { include: { StockItem: { select: { id: true, name: true, currentStock: true, unitOfMeasure: true } }, User_Medication_prescribedByIdToUser: { select: { fullName: true } } } },
        LabTest: { include: { LabTestTemplate: true, User_LabTest_performedByIdToUser: { select: { fullName: true } } }, orderBy: { requestedAt: 'desc' } },
        Procedure: { include: { ProcedureTemplate: true } },
        Scan: { include: { ScanTemplate: true } },
        referral: { select: { id: true, referralNumber: true, referralType: true, referralReason: true, status: true } },
        ServiceRendered: { include: { ServiceCatalog: { include: { pricing: true } } } }
      }
    });
  }

  async findManyEncounters(filters: EncounterFilters) {
    const { patientId, attendanceType, status, paymentMode, dateFrom, dateTo, page = 1, limit = 1000 } = filters;
    const live = (filters as any).live === true || (filters as any).live === 'true';
    const where: any = {};
    if (patientId) where.patientId = patientId;
    if (attendanceType) where.attendanceType = attendanceType;
    // status may be one value or a comma list: ?status=pending,admitted
    if (status) {
      const list = String(status).split(',').map((x) => x.trim()).filter(Boolean);
      where.status = list.length > 1 ? { in: list } : list[0];
    }
    if (paymentMode) where.paymentMode = paymentMode;
    if (dateFrom || dateTo) {
      where.dateTime = {};
      if (dateFrom) where.dateTime.gte = dateFrom;
      if (dateTo) where.dateTime.lte = dateTo;
    }

    // ?live=true -> what a hospital screen needs "right now":
    //   - every admitted patient, however long ago they were admitted
    //   - pending visits from the last LIVE_PENDING_DAYS days
    //   - every visit from the last LIVE_RECENT_HOURS hours (today's completed/discharged, shift handover)
    if (live) {
      const now = Date.now();
      where.AND = [
        {
          OR: [
            { status: 'admitted' },
            { status: 'pending', dateTime: { gte: new Date(now - LIVE_PENDING_DAYS * 86_400_000) } },
            { dateTime: { gte: new Date(now - LIVE_RECENT_HOURS * 3_600_000) } }
          ]
        }
      ];
    }

    // ✅ Uses BaseRepository pagination helper
    return this.findManyWithPagination({
      where, page, limit: Math.min(limit, 1000), orderBy: { dateTime: 'desc' },
      include: {
        Patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true, dateOfBirth: true, gender: true, contact: true } },
        AttendanceDiagnosis: { include: { Diagnosis: true }, orderBy: { date: 'desc' } },
        Vitals: { orderBy: { recordedAt: 'desc' }, take: 5 },
        Medication: { include: { StockItem: { select: { id: true, name: true, currentStock: true } } } },
        LabTest: { include: { LabTestTemplate: true }, orderBy: { requestedAt: 'desc' } },
        Procedure: { include: { ProcedureTemplate: true } },
        Scan: { include: { ScanTemplate: true } },
        referral: { select: { id: true, referralNumber: true, referralType: true, status: true } }
      }
    });
  }

  async updateEncounter(id: string, data: UpdateEncounterDTO) {
    return this.getModel().update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
      include: { Patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true } } }
    });
  }

  async updateStatus(id: string, status: string) {
    return this.getModel().update({ where: { id }, data: { status: status as any } });
  }

  // ============================================
  // CLINICAL SUB-RESOURCES (Diagnoses, Vitals, etc.)
  // ============================================

  async addDiagnosis(encounterId: string, data: AddDiagnosisDTO, userId: string) {
    if (data.diagnosisType === 'primary') {
      await this.prisma.attendanceDiagnosis.updateMany({
        where: { attendanceId: encounterId, diagnosisType: 'primary' },
        data: { diagnosisType: 'additional' }
      });
    }
    const existing = await this.prisma.attendanceDiagnosis.findFirst({ where: { attendanceId: encounterId, diagnosisId: data.diagnosisId } });
    if (existing) throw new Error('Diagnosis already added to this encounter');

    const diagnosis = await this.prisma.diagnosis.findUnique({ where: { id: data.diagnosisId } });
    return this.prisma.attendanceDiagnosis.create({
      data: { attendanceId: encounterId, diagnosisId: data.diagnosisId, diagnosisType: data.diagnosisType, notes: data.notes, createdById: userId, icdCode: diagnosis?.icdCode || '' },
      include: { Diagnosis: true }
    });
  }

  async removeDiagnosis(encounterId: string, diagnosisId: string) {
    return this.prisma.attendanceDiagnosis.deleteMany({ where: { attendanceId: encounterId, diagnosisId } });
  }

  async addVitals(encounterId: string, data: AddVitalsDTO, userId: string) {
    const {
      fetalHeartRate,
      fundalHeight,
      presentingPart,
      fetalMovement,
      oedema,
      recordedById: _recordedById,
      recordedAt: _recordedAt,
      ...vitalsData
    } = data as AddVitalsDTO & { recordedById?: string; recordedAt?: Date | string };
    const hasAntenatalData = [
      fetalHeartRate,
      fundalHeight,
      presentingPart,
      fetalMovement,
      oedema,
    ].some(value => value !== undefined);

    return this.prisma.$transaction(async (tx) => {
      const attendance = await tx.attendance.findUnique({
        where: { id: encounterId },
        select: { patientId: true },
      });
      if (!attendance) throw new NotFoundError('Encounter', encounterId);

      const savedVitals = await tx.vitals.create({
        data: {
          attendanceId: encounterId,
          patientId: attendance.patientId,
          ...vitalsData,
          recordedById: userId,
          recordedAt: new Date(),
        },
        include: { User: { select: { fullName: true } } },
      });

      if (hasAntenatalData) {
        const ancVisit = await tx.aNCVisit.findUnique({ where: { attendanceId: encounterId } });
        if (!ancVisit) {
          throw new ValidationError('Antenatal assessment fields can only be saved for an antenatal visit');
        }
        await tx.aNCVisit.update({
          where: { id: ancVisit.id },
          data: {
            ...(fetalHeartRate !== undefined && { fetalHeartRate }),
            ...(fundalHeight !== undefined && { fundalHeight: Math.round(fundalHeight) }),
            ...(presentingPart !== undefined && { presentation: presentingPart || null }),
            ...(fetalMovement !== undefined && { fetalMovements: fetalMovement }),
            ...(oedema !== undefined && { oedema }),
            ...(vitalsData.weight !== undefined && { weight: vitalsData.weight }),
            ...(vitalsData.bloodPressure !== undefined && { bloodPressure: vitalsData.bloodPressure }),
          },
        });
      }

      return savedVitals;
    });
  }

  async updateVitals(vitalsId: string, data: any) {
    const {
      fetalHeartRate,
      fundalHeight,
      presentingPart,
      fetalMovement,
      oedema,
      recordedById: _recordedById,
      recordedAt: _recordedAt,
      attendanceId: _attendanceId,
      patientId: _patientId,
      ...vitalsData
    } = data;
    const hasAntenatalData = [
      fetalHeartRate,
      fundalHeight,
      presentingPart,
      fetalMovement,
      oedema,
    ].some(value => value !== undefined);

    return this.prisma.$transaction(async (tx) => {
      const existingVitals = await tx.vitals.findUnique({
        where: { id: vitalsId },
        select: { attendanceId: true },
      });
      if (!existingVitals) throw new NotFoundError('Vitals', vitalsId);

      const updatedVitals = await tx.vitals.update({
        where: { id: vitalsId },
        data: vitalsData,
      });

      if (hasAntenatalData) {
        const ancVisit = await tx.aNCVisit.findUnique({
          where: { attendanceId: existingVitals.attendanceId },
        });
        if (!ancVisit) {
          throw new ValidationError('Antenatal assessment fields can only be saved for an antenatal visit');
        }
        await tx.aNCVisit.update({
          where: { id: ancVisit.id },
          data: {
            ...(fetalHeartRate !== undefined && { fetalHeartRate }),
            ...(fundalHeight !== undefined && { fundalHeight: Math.round(fundalHeight) }),
            ...(presentingPart !== undefined && { presentation: presentingPart || null }),
            ...(fetalMovement !== undefined && { fetalMovements: fetalMovement }),
            ...(oedema !== undefined && { oedema }),
            ...(vitalsData.weight !== undefined && { weight: vitalsData.weight }),
            ...(vitalsData.bloodPressure !== undefined && { bloodPressure: vitalsData.bloodPressure }),
          },
        });
      }

      return updatedVitals;
    });
  }

  async deleteVitals(vitalsId: string) {
    return this.prisma.vitals.delete({ where: { id: vitalsId } });
  }

  async addPrescription(encounterId: string, data: AddPrescriptionDTO, userId: string) {
    const stockItem = await this.prisma.stockItem.findUnique({ where: { id: data.stockItemId } });
    if (!stockItem) throw new Error('Stock item not found');

    const medication = await this.prisma.medication.create({
      data: {
        attendanceId: encounterId,
        stockItemId: data.stockItemId,
        serviceCatalogId: data.serviceCatalogId,
        name: stockItem.name,
        dosage: data.dosage,
        frequency: data.frequency,
        duration: data.duration,
        route: data.route,
        instructions: data.instructions,
        quantity: data.quantity || 1,
        status: 'prescribed',
        prescribedById: userId,
        prescribedAt: new Date(),
      },
      include: {
        StockItem: { select: { id: true, name: true, currentStock: true, unitOfMeasure: true } },
      },
    });

    // ✅ NEW: materialize the MAR schedule
    await this.marService.scheduleDosesForMedication({
      medicationId: medication.id,
      dose: medication.dosage,
      route: medication.route,
      frequency: medication.frequency,
      duration: medication.duration,
      prescribedAt: medication.prescribedAt,
    });

    return medication;
  }

  // ✅ PRODUCTION FIX: Dispensing must deduct stock safely using a transaction
  async dispenseMedication(encounterId: string, medicationId: string, quantity: number, userId: string, batchNumber?: string, expiryDate?: Date) {
    return this.prisma.$transaction(async (tx) => {
      const med = await tx.medication.findUnique({ where: { id: medicationId }, include: { StockItem: true } });
      if (!med) throw new Error('Medication not found');
      if (med.stockItemId && med.StockItem && med.StockItem.currentStock < quantity) throw new Error('Insufficient stock');

      // Update medication status
      const updatedMed = await tx.medication.update({
        where: { id: medicationId },
        data: { status: 'dispensed', dispensedAt: new Date(), dispensedById: userId, dispensedBatchNumber: batchNumber, dispensedExpiryDate: expiryDate, quantity }
      });

      // Deduct stock safely
      if (med.stockItemId && med.StockItem) {
        await tx.stockItem.update({
          where: { id: med.stockItemId },
          data: { currentStock: { decrement: quantity } }
        });
        // Log transaction
        await tx.stockTransaction.create({
          data: { stockItemId: med.stockItemId, transactionType: 'sale', quantity: -quantity, balanceAfter: med.StockItem.currentStock - quantity, performedBy: userId, reference: medicationId }
        });
      }
      return updatedMed;
    });
  }

  // Generic medication update: handles dispensing (atomic stock deduction, guarded
  // against double-deduction) and administration recording in one place.
  /**
   * Generic medication update.
   *
   * - When status becomes 'dispensed': atomically deduct stock, log the
   *   transaction. Idempotent against double-dispense.
   * - When status becomes 'administered': record the administration on
   *   the currently due MedicationDose row.
   */
  async updateMedication(encounterId: string, medicationId: string, data: any, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const med = await tx.medication.findUnique({
        where: { id: medicationId },
        include: { StockItem: true },
      });
      if (!med) throw new Error('Medication not found');

      const updateData: any = {};
      if (data.status !== undefined) updateData.status = data.status;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.administeredDoses !== undefined) updateData.administeredDoses = data.administeredDoses;

      const isDispensing = data.status === 'dispensed' && med.status !== 'dispensed';

      if (isDispensing) {
        const qty = data.quantity ?? med.quantity ?? 1;

        if (med.stockItemId) {
          if (!med.StockItem || med.StockItem.currentStock < qty) {
            throw new Error(`Insufficient stock. Available: ${med.StockItem?.currentStock || 0}`);
          }
          await tx.stockItem.update({
            where: { id: med.stockItemId },
            data: { currentStock: { decrement: qty } },
          });
          const after = await tx.stockItem.findUnique({
            where: { id: med.stockItemId },
            select: { currentStock: true },
          });
          await tx.stockTransaction.create({
            data: {
              stockItemId: med.stockItemId,
              transactionType: 'sale',
              quantity: -qty,
              balanceAfter: after?.currentStock ?? med.StockItem.currentStock - qty,
              performedBy: userId,
              reference: medicationId,
            },
          });
        }
        updateData.quantity = qty;
        updateData.dispensedAt = data.dispensedAt ? new Date(data.dispensedAt) : new Date();
        updateData.dispensedById = data.dispensedById || userId;
        if (data.batchNumber !== undefined) updateData.dispensedBatchNumber = data.batchNumber;
        updateData.dispensedUnitCost = data.dispensedUnitCost ?? med.StockItem?.costPrice ?? null;
      } else if (data.quantity !== undefined) {
        updateData.quantity = data.quantity;
      }

      // ✅ NEW: when marked administered, log it on the due dose row.
      // The UI passes doseId explicitly now; fall back to the next pending one.
      if (data.status === 'administered') {
        updateData.administeredAt = data.administeredAt ? new Date(data.administeredAt) : new Date();
        updateData.administeredById = data.administeredById || userId;
      }

      const updated = await tx.medication.update({
        where: { id: medicationId },
        data: updateData,
        include: {
          StockItem: { select: { id: true, name: true, currentStock: true, unitOfMeasure: true } },
        },
      });

      // Handle the MAR write outside the medication transaction? No — keep it inside.
      if (data.status === 'administered') {
        // If the caller sent a specific doseId, use it. Otherwise pick the next pending.
        let dose = data.doseId
          ? await tx.medicationDose.findUnique({ where: { id: data.doseId } })
          : null;

        if (!dose) {
          dose = await tx.medicationDose.findFirst({
            where: {
              medicationId,
              status: { in: ['scheduled', 'due', 'late'] },
            },
            orderBy: { doseNumber: 'asc' },
          });
        }

        if (dose) {
          await tx.medicationDose.update({
            where: { id: dose.id },
            data: {
              status: 'administered',
              administeredAt: updateData.administeredAt,
              administeredById: updateData.administeredById,
              site: data.site ?? undefined,
              notes: data.notes ?? undefined,
            },
          });
        }
      }

      return updated;
    });
  }

  async removeMedication(encounterId: string, medicationId: string) {
    // Soft delete is safer for medical records
    return this.prisma.medication.update({ where: { id: medicationId }, data: { status: 'cancelled' } });
  }

async addLabTest(encounterId: string, data: AddLabTestDTO, userId: string) {
  // ─────────────────────────────────────────────────────────────
  // Resolve templateId from the ServiceCatalog link if the caller
  // didn't provide one. The frontend sends `serviceCatalogId` only;
  // we walk the relation to find the underlying LabTestTemplate.
  // ─────────────────────────────────────────────────────────────
  let templateId: string | undefined = data.templateId;

  if (!templateId && data.serviceCatalogId) {
    const catalogEntry = await this.prisma.serviceCatalog.findUnique({
      where: { id: data.serviceCatalogId },
      select: { labTestTemplateId: true, name: true, code: true },
    });

    if (!catalogEntry) {
      throw new Error(`ServiceCatalog entry ${data.serviceCatalogId} not found`);
    }
    if (!catalogEntry.labTestTemplateId) {
      throw new Error(
        `ServiceCatalog entry "${catalogEntry.name}" (${catalogEntry.code}) is not linked to a lab test template. ` +
        `Ask an admin to fix the catalog linkage.`,
      );
    }
    templateId = catalogEntry.labTestTemplateId;
  }

  if (!templateId) {
    throw new Error('A lab test template or service catalog entry is required');
  }

  // ─────────────────────────────────────────────────────────────
  // Prisma rule: never pass `undefined` for a scalar FK in `create`.
  // Either omit the key entirely or provide a real value. We always
  // have a real `templateId` at this point, so the key is always set.
  // ─────────────────────────────────────────────────────────────
  return this.prisma.labTest.create({
    data: {
      attendanceId: encounterId,
      templateId,
      serviceCatalogId: data.serviceCatalogId ?? null,
      status: 'requested',
      priority: data.priority ?? 'routine',
      requestedAt: new Date(),
      createdById: userId,
      notes: data.notes ?? null,
    },
    include: {
      LabTestTemplate: true,
      ServiceCatalog: { select: { id: true, name: true, code: true } },
    },
  });
}

  async updateLabTestStatus(labOrderId: string, status: string, data: any, userId?: string) {
    const updateData: any = { status, ...data };
    if (status === 'completed') updateData.completedAt = new Date();
    if (userId && status === 'in_progress') updateData.performedById = userId;
    return this.prisma.labTest.update({ where: { id: labOrderId }, data: updateData });
  }

  async removeLabTest(encounterId: string, labOrderId: string) {
    return this.prisma.labTest.update({ where: { id: labOrderId }, data: { status: 'cancelled' } });
  }

async addScan(encounterId: string, data: any, userId: string) {
  let templateId: string | undefined = data.templateId;

  if (!templateId && data.serviceCatalogId) {
    const catalogEntry = await this.prisma.serviceCatalog.findUnique({
      where: { id: data.serviceCatalogId },
      select: { scanTemplateId: true, name: true, code: true },
    });
    if (!catalogEntry) throw new Error(`ServiceCatalog entry ${data.serviceCatalogId} not found`);
    if (!catalogEntry.scanTemplateId) {
      throw new Error(`ServiceCatalog "${catalogEntry.name}" (${catalogEntry.code}) is not linked to a scan template`);
    }
    templateId = catalogEntry.scanTemplateId;
  }

  if (!templateId) throw new Error('A scan template or service catalog entry is required');

  const template = await this.prisma.scanTemplate.findUnique({ where: { id: templateId } });
  if (!template) throw new Error(`Scan template ${templateId} does not exist`);

  return this.prisma.scan.create({
    data: {
      attendanceId: encounterId,
      templateId: template.id,
      serviceCatalogId: data.serviceCatalogId ?? null,
      scanType: template.scanType || template.name,
      description: template.description ?? null,
      bodyPart: data.bodyPart ?? null,
      status: 'requested',
      priority: data.priority ?? 'routine',
      requestedAt: new Date(),
      createdById: userId,
    },
    include: { ScanTemplate: true },
  });
}

  async updateScanStatus(scanId: string, status: string, data: any) {
    const updateData: any = { status, ...data };
    if (status === 'completed') updateData.completedAt = new Date();
    return this.prisma.scan.update({ where: { id: scanId }, data: updateData });
  }

  async removeScan(encounterId: string, scanId: string) {
    return this.prisma.scan.update({ where: { id: scanId }, data: { status: 'cancelled' } });
  }

async addProcedure(encounterId: string, data: any, userId: string) {
  let templateId: string | undefined = data.templateId;

  if (!templateId && data.serviceCatalogId) {
    const catalogEntry = await this.prisma.serviceCatalog.findUnique({
      where: { id: data.serviceCatalogId },
      select: { procedureTemplateId: true, name: true, code: true },
    });
    if (!catalogEntry) throw new Error(`ServiceCatalog entry ${data.serviceCatalogId} not found`);
    if (!catalogEntry.procedureTemplateId) {
      throw new Error(`ServiceCatalog "${catalogEntry.name}" (${catalogEntry.code}) is not linked to a procedure template`);
    }
    templateId = catalogEntry.procedureTemplateId;
  }

  if (!templateId) throw new Error('A procedure template or service catalog entry is required');

  const template = await this.prisma.procedureTemplate.findUnique({ where: { id: templateId } });
  if (!template) throw new Error(`Procedure template ${templateId} does not exist`);

  return this.prisma.procedure.create({
    data: {
      attendanceId: encounterId,
      templateId: template.id,
      serviceCatalogId: data.serviceCatalogId ?? null,
      status: 'scheduled',
      scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
      notes: data.notes ?? null,
      duration: data.duration ?? null,
      createdById: userId,
    },
    include: { ProcedureTemplate: true },
  });
}

  async updateProcedureStatus(procedureId: string, status: string, data: any) {
    const updateData: any = { status, ...data };
    if (status === 'completed') updateData.performedAt = new Date();
    return this.prisma.procedure.update({ where: { id: procedureId }, data: updateData });
  }

  async removeProcedure(encounterId: string, procedureId: string) {
    return this.prisma.procedure.update({ where: { id: procedureId }, data: { status: 'cancelled' } });
  }

  async addService(encounterId: string, data: any, userId: string) {
    return this.prisma.serviceRendered.create({
      data: { attendanceId: encounterId, serviceItemId: data.serviceCatalogId, quantity: data.quantity || 1, date: new Date(), performedById: userId, notes: data.notes }
    });
  }

  async removeService(encounterId: string, serviceRenderedId: string) {
    return this.prisma.serviceRendered.delete({ where: { id: serviceRenderedId } });
  }

  // ============================================
  // ADMISSION & DISCHARGE (IPD/DAYCASE)
  // ============================================

  async createFormalAdmission(data: any, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const admission = await tx.admission.create({
        data: { attendanceId: data.attendanceId, admissionNumber: getCounterService().nextAdmissionNumber(), admissionType: data.admissionType || 'emergency', admissionSource: data.admissionSource || 'opd' }
      });
      await tx.attendance.update({ where: { id: data.attendanceId }, data: { status: 'admitted', bedId: data.bedId, wardId: data.wardId } });
      return admission;
    });
  }

  // ============================================
  // ADMISSIONS
  // ============================================

  /** Relations loaded for admission lists. */
  private admissionListInclude() {
    return {
      attendance: {
        include: {
          Patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true, contact: true, gender: true, dateOfBirth: true, paymentMode: true } },
          Ward: { select: { id: true, wardName: true, wardType: true } },
          Bed: { select: { id: true, bedNumber: true, isOccupied: true, Ward: { select: { id: true, wardName: true, wardType: true } } } },
          Vitals: { orderBy: { recordedAt: 'desc' as const }, take: 1, select: { recordedAt: true } },
          _count: { select: { Vitals: true, AttendanceDiagnosis: true } }
        }
      }
    };
  }

  /** Relations loaded for a single admission (details page). */
  private admissionDetailInclude() {
    return {
      attendance: {
        include: {
          Patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true, contact: true, gender: true, dateOfBirth: true, paymentMode: true } },
          Ward: { select: { id: true, wardName: true, wardType: true } },
          Bed: { select: { id: true, bedNumber: true, isOccupied: true, Ward: { select: { id: true, wardName: true, wardType: true } } } },
          AttendanceDiagnosis: { include: { Diagnosis: true }, orderBy: { date: 'asc' as const } },
          Vitals: { orderBy: { recordedAt: 'desc' as const }, take: 5 },
          _count: { select: { Vitals: true, AttendanceDiagnosis: true } }
        }
      }
    };
  }

  /**
   * Returns the admission plus the flattened fields the frontend reads
   * (patient / ward / bed, status, and the observation-list fields).
   */
  private shapeAdmission(a: any) {
    const att = a.attendance;
    const patient = att?.Patient ?? null;
    const bed = att?.Bed ?? null;
    const ward = att?.Ward ?? bed?.Ward ?? null;
    const hours = Math.max(0, Math.floor((Date.now() - new Date(a.admissionDate).getTime()) / 3_600_000));

    return {
      ...a,
      status: a.dischargeDate ? 'discharged' : 'active',
      patient, ward, bed,
      // Flattened fields used by the detention / observation list
      attendanceNumber: att?.attendanceNumber,
      patientId: att?.patientId,
      Patient: patient, Ward: ward, Bed: bed,
      patientName: patient ? `${patient.surname} ${patient.otherNames}`.trim() : undefined,
      folderNumber: patient?.folderNumber,
      gender: patient?.gender,
      wardName: ward?.wardName,
      bedNumber: bed?.bedNumber,
      observationHours: hours,
      vitalsCount: att?._count?.Vitals ?? 0,
      diagnosisCount: att?._count?.AttendanceDiagnosis ?? 0,
      lastVitalsAt: att?.Vitals?.[0]?.recordedAt ?? null,
      readyForDecision: hours >= 24
    };
  }

  private isTrue(v: any) { return v === true || v === 'true'; }

  private buildAdmissionWhere(filters: any) {
    const where: any = {};

    if (filters.status === 'active') where.dischargeDate = null;
    else if (filters.status === 'discharged') where.dischargeDate = { not: null };

    if (filters.admissionType) where.admissionType = filters.admissionType;
    else if (this.isTrue(filters.excludeDetention)) where.admissionType = { not: 'detention_observation' };

    if (filters.wardId) {
      where.attendance = { OR: [{ wardId: filters.wardId }, { Bed: { wardId: filters.wardId } }] };
    }

    if (this.isTrue(filters.readyForDecision)) {
      const hours = Number(filters.observationHours) > 0 ? Number(filters.observationHours) : 24;
      where.admissionDate = { lte: new Date(Date.now() - hours * 3_600_000) };
    }
    return where;
  }

  private pageParams(filters: any) {
    const page = Math.max(1, Number(filters?.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters?.limit) || 20));
    return { page, limit, skip: (page - 1) * limit };
  }

  async getAllAdmissions(filters: any) {
    const { page, limit, skip } = this.pageParams(filters);
    const where = this.buildAdmissionWhere(filters);

    const [rows, total] = await Promise.all([
      this.prisma.admission.findMany({
        where,
        include: this.admissionListInclude(),
        orderBy: [{ admissionDate: 'desc' }, { id: 'asc' }],
        skip,
        take: limit
      }),
      this.prisma.admission.count({ where })
    ]);

    return { data: rows.map((r: any) => this.shapeAdmission(r)), total, page, limit };
  }

  /** Active observation patients that have been under observation for `hours` or more. */
  async countReadyForDecision(hours = 24) {
    return this.prisma.admission.count({
      where: {
        dischargeDate: null,
        admissionType: 'detention_observation',
        admissionDate: { lte: new Date(Date.now() - hours * 3_600_000) }
      }
    });
  }

  async getAdmissionById(id: string) {
    const admission = await this.prisma.admission.findUnique({
      where: { id },
      include: this.admissionDetailInclude()
    });
    return admission ? this.shapeAdmission(admission) : null;
  }

  async getAdmissionsByPatientId(patientId: string, filters: any = {}) {
    const { page, limit, skip } = this.pageParams(filters);
    const where = { attendance: { patientId } };

    const [rows, total] = await Promise.all([
      this.prisma.admission.findMany({
        where,
        include: this.admissionListInclude(),
        orderBy: [{ admissionDate: 'desc' }, { id: 'asc' }],
        skip,
        take: limit
      }),
      this.prisma.admission.count({ where })
    ]);

    return { data: rows.map((r: any) => this.shapeAdmission(r)), total, page, limit };
  }

  async updateAdmission(id: string, data: any, userId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.admission.findUnique({ where: { id } });
      if (!existing) throw new NotFoundError('Admission', id);

      const update: any = {};
      if (data.admissionType) update.admissionType = data.admissionType;
      if (data.admissionSource) update.admissionSource = data.admissionSource;
      if (data.dischargeStatus) {
        const allowed = ['home', 'transfer', 'expired', 'against_medical_advice'];
        if (!allowed.includes(data.dischargeStatus)) {
          throw new ValidationError(`dischargeStatus must be one of: ${allowed.join(', ')}`);
        }
        update.dischargeStatus = data.dischargeStatus;
      }
      if (data.dischargeDate) update.dischargeDate = new Date(data.dischargeDate);

      // The Admission table has no dischargeSummary column: keep it as a note instead of dropping it.
      let notes: any[] = Array.isArray(existing.dailyNotes) ? [...(existing.dailyNotes as any[])] : [];
      if (Array.isArray(data.dailyNotes)) notes = data.dailyNotes;
      if (data.dischargeSummary) {
        notes.push({ noteType: 'discharge_summary', notes: data.dischargeSummary, recordedBy: userId, recordedAt: new Date() });
      }
      if (Array.isArray(data.dailyNotes) || data.dischargeSummary) update.dailyNotes = notes;

      const updated = await tx.admission.update({ where: { id }, data: update });

      // Discharging an admission also closes the visit
      if (update.dischargeDate && !existing.dischargeDate) {
        await tx.attendance.update({ where: { id: existing.attendanceId }, data: { status: 'discharged' } });
      }
      return updated;
    });
  }

  async deleteAdmission(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.admission.findUnique({
        where: { id },
        include: { _count: { select: { bills: true } } }
      });
      if (!existing) throw new NotFoundError('Admission', id);
      if (existing._count.bills > 0) {
        throw new ConflictError('This admission already has bills and cannot be deleted. Discharge it instead.');
      }

      await tx.admission.delete({ where: { id } });
      // The visit goes back to pending so it can be re-admitted or closed normally
      await tx.attendance.updateMany({ where: { id: existing.attendanceId, status: 'admitted' }, data: { status: 'pending' } });
      return { id };
    });
  }

  async addDailyNotes(admissionId: string, data: any, userId: string) {
    const admission = await this.prisma.admission.findUnique({ where: { id: admissionId } });
    if (!admission) throw new NotFoundError('Admission', admissionId);

    const notes = Array.isArray(admission.dailyNotes) ? [...(admission.dailyNotes as any[])] : [];
    const note = { id: `note_${Date.now()}`, ...data, recordedBy: userId, recordedAt: new Date() };
    notes.push(note);

    const updated = await this.prisma.admission.update({ where: { id: admissionId }, data: { dailyNotes: notes } });
    return { note, admission: updated };
  }

  async dischargeFromEncounter(encounterId: string, data: any, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const encounter = await tx.attendance.findUnique({ where: { id: encounterId }, include: { Admission: true } });
      if (!encounter) throw new Error('Encounter not found');

      await tx.attendance.update({ where: { id: encounterId }, data: { status: 'discharged' } });
      
      if (encounter.Admission) {
        await tx.admission.update({
          where: { id: encounter.Admission.id },
          data: { dischargeDate: new Date(), dischargeStatus: data.dischargeStatus || 'home' }
        });
      }
      return { message: 'Patient discharged successfully', dischargeDate: new Date() };
    });
  }

  async getBedOccupancy() {
    const beds = await this.prisma.bed.findMany({ include: { Ward: true } });
    const activeAttendances = await this.getModel().findMany({ where: { status: 'admitted', bedId: { not: null } }, include: { Patient: true, Bed: { include: { Ward: true } } } });
    
    return {
      data: activeAttendances.map(a => ({ bed: a.Bed?.bedNumber, ward: a.Bed?.Ward?.wardName, patient: `${a.Patient.surname} ${a.Patient.otherNames}` })),
      summary: { totalBeds: beds.length, occupied: activeAttendances.length, available: beds.length - activeAttendances.length }
    };
  }

  async getEncounterStats(dateFrom?: Date, dateTo?: Date) {
    const where: any = {};
    if (dateFrom || dateTo) {
      where.dateTime = {};
      if (dateFrom) where.dateTime.gte = dateFrom;
      if (dateTo) where.dateTime.lte = dateTo;
    }
    return this.getModel().groupBy({ by: ['attendanceType', 'status'], where, _count: { id: true } });
  }

  // ============================================
  // WORKLISTS (Your brilliant logic, preserved exactly)
  // ============================================

  async getVitalsWorklist(): Promise<any> {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const activeAttendances = await this.getModel().findMany({
      where: { OR: [{ status: 'admitted' }, { status: 'pending', dateTime: { gte: daysAgo(WORKLIST_OPEN_DAYS) } }], encounterCategory: { in: ['opd', 'ipd', 'daycase'] } },
      include: { Patient: { select: { id: true, surname: true, otherNames: true, dateOfBirth: true, gender: true, folderNumber: true }}, Bed: { include: { Ward: true }}, Vitals: { orderBy: { recordedAt: 'desc' }, take: 1 } },
      orderBy: { dateTime: 'asc' }
    });

    const processedItems = activeAttendances.map(attendance => {
      const lastVitals = attendance.Vitals?.[0];
      const hasVitalsToday = lastVitals ? new Date(lastVitals.recordedAt).toDateString() === today.toDateString() : false;
      const waitTime = hasVitalsToday ? 0 : Math.floor((Date.now() - new Date(attendance.dateTime).getTime()) / 60000);
      let priority: 'routine' | 'urgent' | 'stat' = 'routine';
      if (!hasVitalsToday) { const waitHours = waitTime / 60; if (waitHours > 48) priority = 'stat'; else if (waitHours > 24) priority = 'urgent'; }

      return {
        id: attendance.id, patientId: attendance.patientId, attendanceId: attendance.id,
        patient: { name: `${attendance.Patient.surname} ${attendance.Patient.otherNames || ''}`.trim(), age: this.calculateAge(attendance.Patient.dateOfBirth), gender: attendance.Patient.gender, folderNumber: attendance.Patient.folderNumber },
        location: attendance.Bed ? { ward: attendance.Bed.Ward?.wardName, bed: attendance.Bed.bedNumber } : undefined,
        hasVitalsToday, lastVitals: lastVitals ? { bloodPressure: lastVitals.bloodPressure, temperature: lastVitals.temperature, pulse: lastVitals.pulse, respiration: lastVitals.respiration, spo2: lastVitals.spo2, recordedAt: lastVitals.recordedAt } : null,
        waitTime, priority, status: hasVitalsToday ? 'vitals_done' : 'pending_vitals', encounterCategory: attendance.encounterCategory
      };
    });
    return { total: processedItems.length, pending: processedItems.filter(i => !i.hasVitalsToday).length, recent: processedItems.filter(i => i.hasVitalsToday).length, data: processedItems };
  }

  async getMedicalWorklist(): Promise<any> {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const activeAttendances = await this.getModel().findMany({
      where: { OR: [{ status: 'admitted' }, { status: 'pending', dateTime: { gte: daysAgo(WORKLIST_OPEN_DAYS) } }], encounterCategory: { in: ['opd', 'ipd', 'daycase'] } },
      include: { Patient: { select: { id: true, surname: true, otherNames: true, dateOfBirth: true, gender: true, folderNumber: true } }, Bed: { include: { Ward: true } }, Vitals: { where: { recordedAt: { gte: today } }, orderBy: { recordedAt: 'desc' }, take: 1 }, AttendanceDiagnosis: { take: 1 } },
      orderBy: { dateTime: 'asc' }
    });

    const processedItems = activeAttendances.map(attendance => {
      const hasVitalsToday = (attendance.Vitals?.length || 0) > 0;
      const hasMedicalNotesToday = attendance.medicalNotes !== null && attendance.medicalNotes !== '';
      const hasDiagnosis = (attendance.AttendanceDiagnosis?.length || 0) > 0;
      const isPending = hasVitalsToday && !hasMedicalNotesToday && !hasDiagnosis;
      const waitTime = isPending ? Math.floor((Date.now() - new Date(attendance.dateTime).getTime()) / 60000) : 0;
      let priority: 'routine' | 'urgent' | 'stat' = 'routine';
      const waitHours = waitTime / 60;
      if (waitHours > 48) priority = 'stat'; else if (waitHours > 24) priority = 'urgent';

      return {
        id: attendance.id, patientId: attendance.patientId, attendanceId: attendance.id,
        patient: { name: `${attendance.Patient.surname} ${attendance.Patient.otherNames || ''}`.trim(), age: this.calculateAge(attendance.Patient.dateOfBirth), gender: attendance.Patient.gender, folderNumber: attendance.Patient.folderNumber },
        location: attendance.Bed ? { ward: attendance.Bed.Ward?.wardName, bed: attendance.Bed.bedNumber } : undefined,
        hasMedicalNotesToday, vitals: attendance.Vitals?.[0], hasDiagnosis, waitTime, priority,
        status: isPending ? 'pending_doctor' : (hasMedicalNotesToday ? 'reviewed' : 'pending_vitals_first'), encounterCategory: attendance.encounterCategory
      };
    });
    return { total: processedItems.length, pending: processedItems.filter(i => i.status === 'pending_doctor').length, reviewed: processedItems.filter(i => i.hasMedicalNotesToday).length, data: processedItems };
  }

  async getLabWorklist(): Promise<any> {
    const allLabTests = await this.prisma.labTest.findMany({
      where: { OR: [{ status: { in: ['requested', 'in_progress'] }, requestedAt: { gte: daysAgo(WORKLIST_OPEN_DAYS) } }, { status: 'completed', updatedAt: { gte: hoursAgo(WORKLIST_DONE_HOURS) } }] },
      select: {
        id: true,
        attendanceId: true,
        status: true,
        requestedAt: true,
        updatedAt: true,
        completedAt: true,
        Attendance: {
          select: {
            patientId: true,
            Patient: { select: { surname: true, otherNames: true, dateOfBirth: true, gender: true, folderNumber: true } },
            Bed: { select: { bedNumber: true, Ward: { select: { wardName: true } } } }
          }
        },
        LabTestTemplate: { select: { name: true } }
      },
      orderBy: { requestedAt: 'asc' }
    });
    const groupedByAttendance = new Map();
    for (const test of allLabTests) {
      const attendanceId = test.attendanceId;
      if (!groupedByAttendance.has(attendanceId)) {
        groupedByAttendance.set(attendanceId, { attendanceId, patientId: test.Attendance.patientId, patient: { name: `${test.Attendance.Patient.surname} ${test.Attendance.Patient.otherNames || ''}`.trim(), age: this.calculateAge(test.Attendance.Patient.dateOfBirth), gender: test.Attendance.Patient.gender, folderNumber: test.Attendance.Patient.folderNumber }, location: test.Attendance.Bed ? { ward: test.Attendance.Bed.Ward?.wardName, bed: test.Attendance.Bed.bedNumber } : undefined, tests: [], requestedCount: 0, inProgressCount: 0, completedCount: 0, oldestRequestedAt: test.requestedAt });
      }
      const group = groupedByAttendance.get(attendanceId); group.tests.push(test);
      if (test.status === 'requested') group.requestedCount++; else if (test.status === 'in_progress') group.inProgressCount++; else if (test.status === 'completed') group.completedCount++;
      if (new Date(test.requestedAt) < new Date(group.oldestRequestedAt)) group.oldestRequestedAt = test.requestedAt;
    }
    const processedItems = [];
    for (const group of groupedByAttendance.values()) {
      const hasPendingTests = group.requestedCount > 0 || group.inProgressCount > 0;
      const allCompleted = group.completedCount > 0 && group.requestedCount === 0 && group.inProgressCount === 0;
      let waitTime = 0; let priority = 'routine';
      if (hasPendingTests) { waitTime = Math.floor((Date.now() - new Date(group.oldestRequestedAt).getTime()) / 60000); const waitHours = waitTime / 60; if (waitHours > 48) priority = 'stat'; else if (waitHours > 24) priority = 'urgent'; }
      processedItems.push({ id: group.attendanceId, patientId: group.patientId, attendanceId: group.attendanceId, patient: group.patient, location: group.location, testCount: group.tests.length, requestedCount: group.requestedCount, inProgressCount: group.inProgressCount, completedCount: group.completedCount, hasPendingTests, hasResults: allCompleted, oldestRequestedAt: group.oldestRequestedAt, tests: group.tests, waitTime, priority, status: hasPendingTests ? 'pending' : (allCompleted ? 'completed' : 'partial') });
    }
    return { total: processedItems.length, pending: processedItems.filter(i => i.hasPendingTests).length, completed: processedItems.filter(i => i.hasResults).length, inProgress: processedItems.filter(i => i.inProgressCount > 0).length, data: processedItems };
  }

  async getPharmacyWorklist(): Promise<any> {
    const allMedications = await this.prisma.medication.findMany({
      where: { OR: [{ status: 'prescribed', prescribedAt: { gte: daysAgo(WORKLIST_OPEN_DAYS) } }, { status: 'dispensed', updatedAt: { gte: hoursAgo(WORKLIST_DONE_HOURS) } }] },
      select: {
        id: true,
        attendanceId: true,
        name: true,
        dosage: true,
        frequency: true,
        duration: true,
        status: true,
        prescribedAt: true,
        dispensedAt: true,
        StockItem: { select: { name: true } },
        Attendance: {
          select: {
            patientId: true,
            Patient: { select: { id: true, surname: true, otherNames: true, dateOfBirth: true, gender: true, folderNumber: true } },
            Bed: { select: { bedNumber: true, Ward: { select: { wardName: true } } } }
          }
        }
      },
      orderBy: { prescribedAt: 'asc' }
    });
    const groupedByAttendance = new Map<string, any>();
    for (const med of allMedications) {
      const attendanceId = med.attendanceId;
      if (!groupedByAttendance.has(attendanceId)) {
        groupedByAttendance.set(attendanceId, { attendanceId: med.attendanceId, patientId: med.Attendance.patientId, patient: { name: `${med.Attendance.Patient.surname} ${med.Attendance.Patient.otherNames || ''}`.trim(), age: this.calculateAge(med.Attendance.Patient.dateOfBirth), gender: med.Attendance.Patient.gender, folderNumber: med.Attendance.Patient.folderNumber }, location: med.Attendance.Bed ? { ward: med.Attendance.Bed.Ward?.wardName, bed: med.Attendance.Bed.bedNumber } : undefined, medications: [], prescribedCount: 0, dispensedCount: 0, oldestPrescribedAt: med.prescribedAt, newestPrescribedAt: med.prescribedAt });
      }
      const group = groupedByAttendance.get(attendanceId)!; group.medications.push(med);
      if (med.status === 'prescribed') group.prescribedCount++; else if (med.status === 'dispensed') group.dispensedCount++;
      if (new Date(med.prescribedAt) < new Date(group.oldestPrescribedAt)) group.oldestPrescribedAt = med.prescribedAt;
      if (new Date(med.prescribedAt) > new Date(group.newestPrescribedAt)) group.newestPrescribedAt = med.prescribedAt;
    }
    const processedItems: any[] = [];
    for (const group of groupedByAttendance.values()) {
      const hasPendingPrescriptions = group.prescribedCount > 0;
      const allDispensed = group.prescribedCount === 0 && group.dispensedCount > 0;
      let waitTime = 0; let priority: 'routine' | 'urgent' | 'stat' = 'routine';
      if (hasPendingPrescriptions) { waitTime = Math.floor((Date.now() - new Date(group.oldestPrescribedAt).getTime()) / 60000); const waitHours = waitTime / 60; if (waitHours > 48) priority = 'stat'; else if (waitHours > 24) priority = 'urgent'; }
      processedItems.push({ id: group.attendanceId, patientId: group.patientId, attendanceId: group.attendanceId, patient: group.patient, location: group.location, prescriptionCount: group.prescribedCount + group.dispensedCount, prescribedCount: group.prescribedCount, dispensedCount: group.dispensedCount, hasPendingPrescriptions, hasBeenDispensed: allDispensed, oldestPrescribedAt: group.oldestPrescribedAt, medications: group.medications.map((m: any) => ({ id: m.id, name: m.StockItem?.name || m.name, dosage: m.dosage, frequency: m.frequency, duration: m.duration, status: m.status, prescribedAt: m.prescribedAt, dispensedAt: m.dispensedAt })), waitTime, priority, status: hasPendingPrescriptions ? 'pending' : (allDispensed ? 'dispensed' : 'partial'), encounterCategory: 'ipd' });
    }
    return { total: processedItems.length, pending: processedItems.filter(i => i.hasPendingPrescriptions).length, dispensed: processedItems.filter(i => i.hasBeenDispensed).length, data: processedItems };
  }

  async getRadiologyWorklist(): Promise<any> {
    const allScans = await this.prisma.scan.findMany({
      where: { OR: [{ status: { in: ['requested', 'in_progress'] }, requestedAt: { gte: daysAgo(WORKLIST_OPEN_DAYS) } }, { status: 'completed', updatedAt: { gte: hoursAgo(WORKLIST_DONE_HOURS) } }] },
      include: { Attendance: { include: { Patient: { select: { id: true, surname: true, otherNames: true, dateOfBirth: true, gender: true, folderNumber: true } }, Bed: { include: { Ward: true } } } }, ScanTemplate: true, User_Scan_performedByIdToUser: { select: { fullName: true } } }, orderBy: { requestedAt: 'asc' }
    });
    const groupedByAttendance = new Map<string, any>();
    for (const scan of allScans) {
      const attendanceId = scan.attendanceId;
      if (!groupedByAttendance.has(attendanceId)) {
        groupedByAttendance.set(attendanceId, { attendanceId: scan.attendanceId, patientId: scan.Attendance.patientId, patient: { name: `${scan.Attendance.Patient.surname} ${scan.Attendance.Patient.otherNames || ''}`.trim(), age: this.calculateAge(scan.Attendance.Patient.dateOfBirth), gender: scan.Attendance.Patient.gender, folderNumber: scan.Attendance.Patient.folderNumber }, location: scan.Attendance.Bed ? { ward: scan.Attendance.Bed.Ward?.wardName, bed: scan.Attendance.Bed.bedNumber } : undefined, scans: [], requestedCount: 0, inProgressCount: 0, completedCount: 0, oldestRequestedAt: scan.requestedAt, highestPriority: 'routine' });
      }
      const group = groupedByAttendance.get(attendanceId)!; group.scans.push(scan);
      if (scan.status === 'requested') group.requestedCount++; else if (scan.status === 'in_progress') group.inProgressCount++; else if (scan.status === 'completed') group.completedCount++;
      if (new Date(scan.requestedAt) < new Date(group.oldestRequestedAt)) group.oldestRequestedAt = scan.requestedAt;
      let priorityWeight = (scan.priority as string) === 'stat' ? 3 : scan.priority === 'urgent' ? 2 : 1;
      let currentWeight = (group.highestPriority as string) === 'stat' ? 3 : group.highestPriority === 'urgent' ? 2 : 1;
      if (priorityWeight > currentWeight) group.highestPriority = scan.priority || 'routine';
    }
    const processedItems: any[] = [];
    for (const group of groupedByAttendance.values()) {
      const hasPendingScans = group.requestedCount > 0 || group.inProgressCount > 0;
      const allCompleted = group.completedCount > 0 && group.requestedCount === 0 && group.inProgressCount === 0;
      let waitTime = 0; let priority: 'routine' | 'urgent' | 'stat' = group.highestPriority as any;
      if (hasPendingScans) { waitTime = Math.floor((Date.now() - new Date(group.oldestRequestedAt).getTime()) / 60000); const waitHours = waitTime / 60; if (priority !== 'stat' && waitHours > 48) priority = 'stat'; else if (priority !== 'stat' && waitHours > 24 && priority !== 'urgent') priority = 'urgent'; }
      processedItems.push({ id: group.attendanceId, patientId: group.patientId, attendanceId: group.attendanceId, patient: group.patient, location: group.location, scanCount: group.scans.length, requestedCount: group.requestedCount, inProgressCount: group.inProgressCount, completedCount: group.completedCount, hasPendingScans, hasResults: allCompleted, oldestRequestedAt: group.oldestRequestedAt, scanTypes: group.scans.map((s: any) => s.ScanTemplate?.name || s.scanType || 'Unknown').join(', '), waitTime, priority, status: hasPendingScans ? 'pending' : (allCompleted ? 'completed' : 'partial'), encounterCategory: 'ipd' });
    }
    return { total: processedItems.length, pending: processedItems.filter(i => i.hasPendingScans).length, completed: processedItems.filter(i => i.hasResults).length, inProgress: processedItems.filter(i => i.inProgressCount > 0).length, data: processedItems };
  }

  async getProceduresWorklist(): Promise<any> {
    const allProcedures = await this.prisma.procedure.findMany({
      where: { OR: [{ status: 'scheduled', createdAt: { gte: daysAgo(WORKLIST_OPEN_DAYS) } }, { status: 'completed', updatedAt: { gte: hoursAgo(WORKLIST_DONE_HOURS) } }] },
      include: { Attendance: { include: { Patient: { select: { id: true, surname: true, otherNames: true, dateOfBirth: true, gender: true, folderNumber: true } }, Bed: { include: { Ward: true } } } }, ProcedureTemplate: true, User_Procedure_performedByIdToUser: { select: { fullName: true } } }, orderBy: { scheduledDate: 'asc' }
    });
    const groupedByAttendance = new Map<string, any>();
    for (const procedure of allProcedures) {
      const attendanceId = procedure.attendanceId;
      if (!groupedByAttendance.has(attendanceId)) {
        groupedByAttendance.set(attendanceId, { attendanceId: procedure.attendanceId, patientId: procedure.Attendance.patientId, patient: { name: `${procedure.Attendance.Patient.surname} ${procedure.Attendance.Patient.otherNames || ''}`.trim(), age: this.calculateAge(procedure.Attendance.Patient.dateOfBirth), gender: procedure.Attendance.Patient.gender, folderNumber: procedure.Attendance.Patient.folderNumber }, location: procedure.Attendance.Bed ? { ward: procedure.Attendance.Bed.Ward?.wardName, bed: procedure.Attendance.Bed.bedNumber } : undefined, procedures: [], scheduledCount: 0, completedCount: 0, earliestScheduledDate: null });
      }
      const group = groupedByAttendance.get(attendanceId)!; group.procedures.push(procedure);
      if (procedure.status === 'scheduled') group.scheduledCount++; else if (procedure.status === 'completed') group.completedCount++;
      if (procedure.scheduledDate && (!group.earliestScheduledDate || new Date(procedure.scheduledDate) < new Date(group.earliestScheduledDate))) group.earliestScheduledDate = procedure.scheduledDate;
    }
    const processedItems: any[] = [];
    for (const group of groupedByAttendance.values()) {
      const hasPendingProcedures = group.scheduledCount > 0;
      const hasBeenPerformed = group.completedCount > 0 && group.scheduledCount === 0;
      let waitTime = 0; let priority: 'routine' | 'urgent' | 'stat' = 'routine';
      if (hasPendingProcedures && group.earliestScheduledDate) {
        waitTime = Math.floor((new Date(group.earliestScheduledDate).getTime() - Date.now()) / 60000); waitTime = Math.max(0, waitTime);
        const isOverdue = new Date(group.earliestScheduledDate) < new Date();
        if (isOverdue) { const overdueHours = Math.abs(waitTime) / 60; if (overdueHours > 24) priority = 'stat'; else if (overdueHours > 12) priority = 'urgent'; } 
        else { const waitHours = waitTime / 60; if (waitHours < 1) priority = 'stat'; else if (waitHours < 6) priority = 'urgent'; }
      }
      processedItems.push({ id: group.attendanceId, patientId: group.patientId, attendanceId: group.attendanceId, patient: group.patient, location: group.location, procedureCount: group.procedures.length, scheduledCount: group.scheduledCount, inProgressCount: 0, completedCount: group.completedCount, hasPendingProcedures, hasBeenPerformed, earliestScheduledDate: group.earliestScheduledDate, procedureNames: group.procedures.map((p: any) => p.ProcedureTemplate?.name || 'Unknown').join(', '), waitTime, priority, status: hasBeenPerformed ? 'completed' : 'scheduled', encounterCategory: 'ipd' });
    }
    return { total: processedItems.length, scheduled: processedItems.filter(i => i.status === 'scheduled').length, inProgress: 0, completed: processedItems.filter(i => i.status === 'completed').length, data: processedItems };
  }

  async getMaternalWorklist(): Promise<any> {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const maternalAttendances = await this.getModel().findMany({
      where: { attendanceType: { in: ['antenatal', 'delivery', 'postnatal'] }, OR: [{ status: 'admitted' }, { status: 'pending', dateTime: { gte: daysAgo(WORKLIST_OPEN_DAYS) } }] },
      include: { Patient: { select: { id: true, surname: true, otherNames: true, dateOfBirth: true, gender: true, folderNumber: true }}, Bed: { include: { Ward: true }}, Vitals: { orderBy: { recordedAt: 'desc' }, take: 1 }, antenatalBookings: true, currentAntenatalBookings: true, antenatalVisits: { orderBy: { visitDate: 'desc' }, take: 1 }, deliveryRecords: { orderBy: { deliveryDate: 'desc' }, take: 1 }, postnatalRecords: { orderBy: { examinationDate: 'desc' }, take: 1 } },
      orderBy: { dateTime: 'asc' }
    });
    const processedItems = maternalAttendances.map(attendance => {
      const antenatal = attendance.antenatalBookings[0] || attendance.currentAntenatalBookings[0];
      const delivery = attendance.deliveryRecords[0];
      const postnatal = attendance.postnatalRecords[0];
      const lastVitals = attendance.Vitals?.[0];
      const hasBeenAttended = attendance.status === 'completed' || attendance.status === 'discharged';
      const completedToday = hasBeenAttended && new Date(attendance.updatedAt).toDateString() === today.toDateString();
      const waitTime = !hasBeenAttended ? Math.floor((Date.now() - new Date(attendance.dateTime).getTime()) / 60000) : 0;
      let priority: 'routine' | 'urgent' | 'stat' = 'routine';
      const riskLevel = antenatal?.riskLevel || 'low';
      if (!hasBeenAttended) { const waitHours = waitTime / 60; if (riskLevel === 'high' || waitHours > 48) priority = 'stat'; else if (riskLevel === 'medium' || waitHours > 24) priority = 'urgent'; }
      return { id: attendance.id, patientId: attendance.patientId, attendanceId: attendance.id, patient: { name: `${attendance.Patient.surname} ${attendance.Patient.otherNames || ''}`.trim(), age: this.calculateAge(attendance.Patient.dateOfBirth), gender: attendance.Patient.gender, folderNumber: attendance.Patient.folderNumber }, location: attendance.Bed ? { ward: attendance.Bed.Ward?.wardName, bed: attendance.Bed.bedNumber } : undefined, visitType: attendance.attendanceType as any, status: attendance.status, hasBeenAttended: completedToday, completedAt: completedToday ? attendance.updatedAt : undefined, waitTime, priority, riskLevel, encounterCategory: attendance.encounterCategory, gestationalAge: antenatal?.gestationalAgeWeeks, edd: antenatal?.edd, deliveryDate: delivery?.deliveryDate, deliveryType: delivery?.deliveryType, postnatalDay: postnatal?.dayNumber, complaints: attendance.medicalNotes, latestVitals: lastVitals ? { bloodPressure: lastVitals.bloodPressure, temperature: lastVitals.temperature, pulse: lastVitals.pulse } : undefined };
    });
    return { total: processedItems.length, pending: processedItems.filter(i => !i.hasBeenAttended).length, recent: processedItems.filter(i => i.hasBeenAttended).length, data: processedItems };
  }

  // ============================================
  // HELPERS
  // ============================================
  private calculateAge(dateOfBirth: Date): number {
    const birthDate = new Date(dateOfBirth); const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  }
}