import { PrismaClient, Attendance, Admission, type BodyPart, type ScanCategory } from '@prisma/client';
import { BaseRepository } from '../../shared/base/BaseRepository';
import { 
  CreateEncounterDTO, UpdateEncounterDTO, EncounterFilters, 
  AddDiagnosisDTO, AddVitalsDTO, AddPrescriptionDTO, AddLabTestDTO 
} from './EncounterTypes';
import { getCounterService } from '../../services/CounterService';
import { MarService } from '../nursing/NursingService';
import { NotFoundError, ConflictError, ValidationError, UnauthorizedError } from '../../utils/errors';
import { decreaseDepartmentStockBalance, increaseDepartmentStockBalance } from '../stockItem/StockItemRepository';

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
// Expiry is recorded as a calendar date. Keep stock eligible through that day.
const startOfCurrentDay = (): Date => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return today;
};

export const WORKLIST_OPEN_DAYS = 30;
export const WORKLIST_DONE_HOURS = 72;
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000);
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000);
const bodyParts: BodyPart[] = [
  'head', 'chest', 'neck', 'abdomen', 'pelvis', 'spine',
  'extremities', 'breast', 'eye', 'skeleton', 'other',
];

const normalizeScanCategory = (name: string, value?: unknown): ScanCategory => {
  const text = `${String(value || '')} ${name}`.toLowerCase();
  if (/ultrasound|sonograph/.test(text)) return 'ultrasound';
  if (/computed tomography|\bct\b|ct.scan/.test(text)) return 'ct_scan';
  if (/\bmri\b|magnetic resonance/.test(text)) return 'mri';
  if (/fluoroscopy/.test(text)) return 'fluoroscopy';
  if (/mammograph/.test(text)) return 'mammography';
  if (/pet.scan|positron emission/.test(text)) return 'pet_scan';
  if (/nuclear.medicine/.test(text)) return 'nuclear_medicine';
  if (/echocardiogram|\becho\b/.test(text)) return 'echocardiography';
  if (/bone.densitometry|dexa/.test(text)) return 'bone_densitometry';
  if (/dental.x.ray/.test(text)) return 'dental_xray';
  if (/x.ray|radiograph/.test(text)) return 'xray';
  if (/nuclear/.test(text)) return 'nuclear';
  return 'other';
};

const normalizeBodyPart = (value?: unknown): BodyPart => {
  const text = String(value || '').toLowerCase().replace(/[^a-z]/g, '');
  return bodyParts.find((part) => text.includes(part)) || 'other';
};

export class EncounterRepository extends BaseRepository<Attendance, CreateEncounterDTO, UpdateEncounterDTO> {
 private marService: MarService;
  constructor(prisma: PrismaClient) {
    super(prisma, 'attendance');
    this.marService = new MarService(prisma);
  }

  async requireActorId(userId: string) {
    if (!userId) {
      throw new UnauthorizedError('Your sign-in is no longer valid. Please sign in again.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedError('Your sign-in is no longer valid. Please sign in again.');
    }

    return user.id;
  }

  private async requireEncounterId(encounterId: string) {
    const encounter = await this.prisma.attendance.findUnique({
      where: { id: encounterId },
      select: { id: true },
    });
    if (!encounter) throw new NotFoundError('Encounter', encounterId);
    return encounter.id;
  }
  

  // ============================================
  // CORE ENCOUNTER OPERATIONS
  // ============================================
  
  private validateClinicalDocumentation(data: Record<string, any>) {
    const outcomes = ['improved', 'stable', 'unchanged', 'deteriorated', 'deceased', 'unknown'];
    const allergyStatuses = ['not_reviewed', 'no_known_allergies', 'allergies_present'];
    if (data.clinicalOutcome != null && !outcomes.includes(String(data.clinicalOutcome))) {
      throw new ValidationError('Invalid clinical condition outcome');
    }
    if (data.allergyReviewStatus != null && !allergyStatuses.includes(String(data.allergyReviewStatus))) {
      throw new ValidationError('Invalid allergy review status');
    }
    for (const field of ['reviewOfSystems', 'physicalExamStructured']) {
      const value = data[field];
      if (value != null && (typeof value !== 'object' || Array.isArray(value))) {
        throw new ValidationError(`${field} must be a structured object keyed by clinical system`);
      }
    }
    for (const field of ['complaints', 'historyPresentingComplaint', 'physicalExamination', 'assessment', 'treatmentPlan', 'allergyReviewNotes']) {
      const value = data[field];
      if (value != null && typeof value !== 'string') throw new ValidationError(`${field} must be text`);
      if (typeof value === 'string' && value.length > 20000) throw new ValidationError(`${field} exceeds the maximum supported length`);
    }
  }

  async create(data: CreateEncounterDTO, userId: string) {
    this.validateClinicalDocumentation(data as Record<string, any>);
    const actorId = await this.requireActorId(userId);
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
        complaints: data.complaints ?? data.complaint ?? '',
        medicalNotes: data.medicalNotes || '',
        historyPresentingComplaint: data.historyPresentingComplaint,
        reviewOfSystems: data.reviewOfSystems as any,
        physicalExamination: data.physicalExamination,
        physicalExamStructured: data.physicalExamStructured as any,
        assessment: data.assessment,
        treatmentPlan: data.treatmentPlan,
        clinicalOutcome: data.clinicalOutcome as any,
        allergyReviewStatus: data.allergyReviewStatus as any,
        allergyReviewNotes: data.allergyReviewNotes,
        providerId: data.providerId,
        
        status: 'pending',
        createdById: actorId,
        dateTime: new Date(), 
      },
      include: {
        Patient: { select: {
          id: true, surname: true, otherNames: true, folderNumber: true, dateOfBirth: true, gender: true,
          allergies: { select: { id: true, allergen: true, reaction: true, severity: true, notes: true } },
        } }
      }
    });
  }

  async findById(id: string) {
    return this.getModel().findUnique({
      where: { id },
      include: {
        Patient: { select: {
          id: true, surname: true, otherNames: true, folderNumber: true, dateOfBirth: true, gender: true, contact: true,
          allergies: { select: { id: true, allergen: true, reaction: true, severity: true, notes: true } },
          medicalHistories: { select: { id: true, condition: true, diagnosedAt: true, notes: true } },
          surgicalHistories: { select: { id: true, procedure: true, surgeryDate: true, notes: true } },
          familyHistories: { select: { id: true, relation: true, condition: true, notes: true } },
        } },
        AttendanceDiagnosis: { include: { Diagnosis: true }, orderBy: { date: 'desc' } },
        Vitals: { orderBy: { recordedAt: 'desc' }, take: 5 },
        Medication: { include: { StockItem: { select: { id: true, name: true, currentStock: true, unitOfMeasure: true } }, User_Medication_prescribedByIdToUser: { select: { fullName: true } } } },
        LabTest: { include: { LabTestTemplate: true, ServiceCatalog: { select: { id: true, name: true, code: true } }, User_LabTest_performedByIdToUser: { select: { fullName: true } } }, orderBy: { requestedAt: 'desc' } },
        Procedure: { include: { ProcedureTemplate: true, ServiceCatalog: { select: { id: true, name: true, code: true } } } },
        Scan: { include: { ScanTemplate: true, ServiceCatalog: { select: { id: true, name: true, code: true } } } },
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
    if (attendanceType) {
      // one type, or several as "antenatal,delivery,postnatal"
      const types = String(attendanceType).split(',').map((x) => x.trim()).filter(Boolean);
      where.attendanceType = types.length > 1 ? { in: types } : types[0];
    }
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
        LabTest: { include: { LabTestTemplate: true, ServiceCatalog: { select: { id: true, name: true, code: true } } }, orderBy: { requestedAt: 'desc' } },
        Procedure: { include: { ProcedureTemplate: true, ServiceCatalog: { select: { id: true, name: true, code: true } } } },
        Scan: { include: { ScanTemplate: true, ServiceCatalog: { select: { id: true, name: true, code: true } } } },
        referral: { select: { id: true, referralNumber: true, referralType: true, status: true } }
      }
    });
  }

  private normalizeUpdateData(data: UpdateEncounterDTO) {
    const allowedKeys = new Set([
      'status',
      'complaints',
      'medicalNotes',
      'clinicalNotes',
      'historyPresentingComplaint',
      'reviewOfSystems',
      'physicalExamination',
      'physicalExamStructured',
      'assessment',
      'treatmentPlan',
      'clinicalOutcome',
      'allergyReviewStatus',
      'allergyReviewNotes',
      'providerId',
      'followUpDate',
      'dateTime',
      'attendanceType',
      'paymentMode',
      'nhisCCC',
      'insuranceProviderId',
      'corporateAccountId',
      'encounterCategory',
      'bedId',
      'wardId',
      'updatedById',
    ]);

    const normalized: Record<string, any> = {};
    const legacyClinicalNotes: Record<string, any> = {};

    Object.entries(data || {}).forEach(([key, value]) => {
      const nullableClinicalFields = new Set([
        'followUpDate', 'historyPresentingComplaint', 'reviewOfSystems', 'physicalExamination',
        'physicalExamStructured', 'assessment', 'treatmentPlan', 'clinicalOutcome',
        'allergyReviewStatus', 'allergyReviewNotes', 'providerId',
      ]);
      if (value === undefined || (value === null && !nullableClinicalFields.has(key))) return;
      if (key === 'followUpDate' && value === null) {
        normalized.followUpDate = null;
        return;
      }
      if (key === 'updatedAt') return;

      if (key === 'complaint') {
        normalized.complaints = value;
        return;
      }
      if (key === 'admissionType') {
        normalized.admissionType = value;
        return;
      }
      if (key === 'dateTime' || key === 'followUpDate') {
        const date = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(date.getTime())) {
          throw new ValidationError(`Invalid ${key}`);
        }
        normalized[key] = date;
        return;
      }

      if (key === 'onsetDurationQuality' || key === 'treatmentNotes' || key === 'physicianNotes') {
        legacyClinicalNotes[key] = value;
        return;
      }

      if (key === 'status') {
        const allowedStatuses = ['pending', 'admitted', 'discharged', 'completed', 'referred', 'absconded', 'cancelled'];
        if (!allowedStatuses.includes(String(value))) {
          throw new ValidationError('Invalid attendance status');
        }
        normalized.status = value;
        return;
      }

      if (allowedKeys.has(key)) {
        normalized[key] = value;
      }
    });

    if (Object.keys(legacyClinicalNotes).length) {
      const existingClinicalNotes = (data.clinicalNotes && typeof data.clinicalNotes === 'object' && !Array.isArray(data.clinicalNotes))
        ? { ...data.clinicalNotes }
        : {};

      const mappedLegacyClinicalNotes = {
        ...(legacyClinicalNotes.historyPresentingComplaint !== undefined ? { historyPresentingComplaint: legacyClinicalNotes.historyPresentingComplaint } : {}),
        ...(legacyClinicalNotes.onsetDurationQuality !== undefined ? { onsetDurationQuality: legacyClinicalNotes.onsetDurationQuality } : {}),
        ...(legacyClinicalNotes.physicalExamination !== undefined ? { physicalExamination: legacyClinicalNotes.physicalExamination } : {}),
        ...(legacyClinicalNotes.treatmentPlan !== undefined ? { treatmentPlan: legacyClinicalNotes.treatmentPlan } : {}),
        ...(legacyClinicalNotes.treatmentNotes !== undefined ? { treatmentNotes: legacyClinicalNotes.treatmentNotes } : {}),
        ...(legacyClinicalNotes.physicianNotes !== undefined ? { physicianNotes: legacyClinicalNotes.physicianNotes } : {}),
      };

      normalized.clinicalNotes = { ...existingClinicalNotes, ...mappedLegacyClinicalNotes };
    }

    return normalized;
  }

  async updateEncounter(id: string, data: UpdateEncounterDTO, userId: string) {
    this.validateClinicalDocumentation(data as Record<string, any>);
    const actorId = await this.requireActorId(userId);
    const normalizedData = this.normalizeUpdateData(data);
    const admissionType = normalizedData.admissionType;
    delete normalizedData.admissionType;
    if (Object.keys(normalizedData).length === 0 && admissionType === undefined) {
      throw new ValidationError('No editable attendance fields supplied');
    }
    normalizedData.updatedById = actorId;

    return this.prisma.$transaction(async (tx) => {
      const currentClinicalRecord = await tx.attendance.findUnique({
        where: { id },
        select: { id: true, finalizedAt: true },
      });
      if (!currentClinicalRecord) throw new NotFoundError('Encounter', id);
      const clinicalKeys = [
        'complaints', 'historyPresentingComplaint', 'reviewOfSystems', 'physicalExamination',
        'physicalExamStructured', 'assessment', 'treatmentPlan', 'clinicalOutcome',
        'allergyReviewStatus', 'allergyReviewNotes', 'providerId', 'clinicalNotes',
      ];
      if (currentClinicalRecord.finalizedAt && clinicalKeys.some((key) => Object.prototype.hasOwnProperty.call(normalizedData, key))) {
        throw new ConflictError('This clinical record is finalized and cannot be overwritten. Use the facility-approved correction/addendum process.');
      }
      if (admissionType !== undefined) {
        const admission = await tx.admission.findUnique({
          where: { attendanceId: id },
          select: { id: true },
        });
        if (!admission) {
          throw new ValidationError('Create an admission before updating its admission type');
        }
        await tx.admission.update({
          where: { id: admission.id },
          data: { admissionType },
        });
      }

      return tx.attendance.update({
        where: { id },
        data: { ...normalizedData, updatedAt: new Date() },
        include: { Patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true } } }
      });
    });
  }

  async updateStatus(id: string, status: string, userId: string) {
    if (!['pending', 'cancelled'].includes(status)) {
      throw new ValidationError('Use the dedicated admission, completion, discharge, referral or absconded workflow to change an encounter to that status');
    }
    const current = await this.prisma.attendance.findUnique({
      where: { id },
      include: {
        _count: { select: {
          AttendanceDiagnosis: true, LabTest: true, Medication: true, Procedure: true, Scan: true,
          ServiceRendered: true, Vitals: true, nursingNotes: true, nursingTasks: true,
          antenatalVisits: true, deliveryRecords: true, abortionRecords: true, postnatalRecords: true,
          familyPlanningServices: true,
        } },
        Bill: { select: { id: true } },
        Admission: { select: { id: true } },
      },
    });
    if (!current) throw new NotFoundError('Encounter', id);
    if (status === 'pending') {
      if (current.status !== 'pending') throw new ConflictError('A non-pending encounter cannot be reset to pending through a generic status update');
      return current;
    }
    if (current.status !== 'pending') throw new ConflictError('Only a pending encounter can be cancelled');
    const count = current._count || {};
    const hasClinicalActivity = Object.values(count).some((value: any) => Number(value) > 0);
    if (hasClinicalActivity || current.Bill || current.Admission) {
      throw new ConflictError('An encounter with clinical activity, billing or an admission cannot be cancelled through a generic status update');
    }
    const actorId = await this.requireActorId(userId);
    const updated = await this.prisma.attendance.updateMany({
      where: { id, status: 'pending' },
      data: { status: 'cancelled', updatedById: actorId },
    });
    if (updated.count !== 1) throw new ConflictError('Encounter status changed; refresh and try again');
    return this.prisma.attendance.findUnique({ where: { id } });
  }

  async finalizeClinicalRecord(id: string, userId: string) {
    const actorId = await this.requireActorId(userId);
    return this.prisma.$transaction(async (tx) => {
      const record = await tx.attendance.findUnique({
        where: { id },
        include: {
          Vitals: { orderBy: { recordedAt: 'desc' }, take: 1 },
          Patient: { select: { allergies: { select: { id: true, allergen: true, reaction: true, severity: true } } } },
        },
      });
      if (!record) throw new NotFoundError('Encounter', id);
      if (record.finalizedAt) throw new ConflictError('This clinical record has already been finalized');
      const responsibleProvider = record.providerId ? await tx.user.findUnique({
        where: { id: record.providerId },
        select: { id: true, role: true, isActive: true },
      }) : null;
      const required: Array<[string, unknown]> = [
        ['presenting complaint', record.complaints],
        ['history of presenting complaint', record.historyPresentingComplaint],
        ['clinical assessment', record.assessment],
        ['management plan', record.treatmentPlan],
        ['clinical outcome', record.clinicalOutcome],
        ['responsible provider', record.providerId],
      ];
      const missing = required.filter(([, value]) => typeof value === 'string' ? !value.trim() : value === null || value === undefined)
        .map(([label]) => label);
      if (!responsibleProvider || !responsibleProvider.isActive || !['doctor', 'nurse', 'midwife'].includes(responsibleProvider.role)) {
        missing.push('active clinician as responsible provider');
      }
      const latestVitals = record.Vitals[0];
      const hasVitalMeasurement = Boolean(latestVitals && [
        latestVitals.bloodPressure, latestVitals.temperature, latestVitals.pulse,
        latestVitals.respiration, latestVitals.spo2, latestVitals.weight,
        latestVitals.height, latestVitals.muac,
      ].some(value => value !== null && value !== undefined && value !== ''));
      if (!hasVitalMeasurement) missing.push('vital signs with at least one recorded measurement');
      if (!record.reviewOfSystems || typeof record.reviewOfSystems !== 'object' ||
          !Object.values(record.reviewOfSystems as Record<string, unknown>).some(value => typeof value === 'string' && value.trim())) {
        missing.push('structured review of systems');
      }
      if (!record.physicalExamination?.trim()) missing.push('narrative physical examination');
      if (!record.physicalExamStructured || typeof record.physicalExamStructured !== 'object' ||
          !Object.values(record.physicalExamStructured as Record<string, unknown>).some(value => typeof value === 'string' && value.trim())) {
        missing.push('structured physical examination');
      }
      if (!record.allergyReviewStatus || record.allergyReviewStatus === 'not_reviewed') missing.push('allergy review');
      const recordedAllergies = record.Patient?.allergies || [];
      if (recordedAllergies.length > 0 && record.allergyReviewStatus === 'no_known_allergies') {
        missing.push('reconcile recorded patient allergies before confirming no known allergies');
      }
      if (record.allergyReviewStatus === 'allergies_present' && !record.allergyReviewNotes?.trim() && recordedAllergies.length === 0) {
        missing.push('allergy details / reaction');
      }
      if (missing.length) throw new ValidationError(`Cannot finalize clinical record. Complete: ${missing.join(', ')}.`);

      return tx.attendance.update({
        where: { id },
        data: {
          finalizedAt: new Date(),
          finalizedById: actorId,
          providerId: record.providerId || actorId,
          ...(record.allergyReviewStatus !== 'not_reviewed' && !record.allergyReviewedAt
            ? { allergyReviewedAt: new Date(), allergyReviewedById: actorId }
            : {}),
          updatedById: actorId,
        },
        include: { Patient: true, Vitals: { orderBy: { recordedAt: 'desc' }, take: 5 } },
      });
    });
  }

  // ============================================
  // CLINICAL SUB-RESOURCES (Diagnoses, Vitals, etc.)
  // ============================================

  async addDiagnosis(encounterId: string, data: AddDiagnosisDTO, userId: string) {
    const actorId = await this.requireActorId(userId);
    if (!data?.diagnosisId?.trim()) throw new ValidationError('A diagnosis must be selected');
    if (!['primary', 'additional', 'provisional'].includes(String(data.diagnosisType))) {
      throw new ValidationError('Invalid diagnosis type');
    }

    // Keep duplicate detection, primary-diagnosis replacement, and insertion atomic.
    // Previously, a duplicate primary diagnosis could demote the existing primary and
    // then throw, leaving the encounter without its intended primary diagnosis.
    return this.prisma.$transaction(async (tx) => {
      const encounter = await tx.attendance.findUnique({
        where: { id: encounterId },
        select: { id: true },
      });
      if (!encounter) throw new NotFoundError('Encounter', encounterId);

      const diagnosis = await tx.diagnosis.findUnique({ where: { id: data.diagnosisId } });
      if (!diagnosis) throw new NotFoundError('Diagnosis', data.diagnosisId);

      const existing = await tx.attendanceDiagnosis.findFirst({
        where: { attendanceId: encounterId, diagnosisId: data.diagnosisId },
        select: { id: true },
      });
      if (existing) throw new ConflictError('This diagnosis has already been added to the encounter');

      if (data.diagnosisType === 'primary') {
        await tx.attendanceDiagnosis.updateMany({
          where: { attendanceId: encounterId, diagnosisType: 'primary' },
          data: { diagnosisType: 'additional' },
        });
      }

      return tx.attendanceDiagnosis.create({
        data: {
          attendanceId: encounterId,
          diagnosisId: data.diagnosisId,
          diagnosisType: data.diagnosisType,
          notes: data.notes,
          createdById: actorId,
          icdCode: diagnosis.icdCode || '',
        },
        include: { Diagnosis: true },
      });
    }, { isolationLevel: 'Serializable' });
  }

  async removeDiagnosis(encounterId: string, diagnosisId: string) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.attendanceDiagnosis.findFirst({
        where: { attendanceId: encounterId, diagnosisId },
        select: { id: true, diagnosisType: true },
      });
      if (!existing) throw new NotFoundError('Diagnosis in encounter', diagnosisId);

      if (existing.diagnosisType === 'primary') {
        const otherDiagnoses = await tx.attendanceDiagnosis.count({
          where: { attendanceId: encounterId, diagnosisId: { not: diagnosisId } },
        });
        if (otherDiagnoses > 0) {
          throw new ConflictError('Assign another diagnosis as primary before removing the current primary diagnosis');
        }
      }

      return tx.attendanceDiagnosis.deleteMany({ where: { attendanceId: encounterId, diagnosisId } });
    });
  }

  private async getOrCreateANCVisit(tx: any, attendance: { id: string; patientId: string; dateTime: Date }, userId: string) {
    const existingVisit = await tx.aNCVisit.findUnique({ where: { attendanceId: attendance.id } });
    if (existingVisit) return existingVisit;

    let booking = await tx.antenatalBooking.findFirst({
      where: {
        patientId: attendance.patientId,
        OR: [
          { attendanceId: attendance.id },
          { currentAttendanceId: attendance.id },
          { isActive: true, isCompleted: false },
        ],
      },
      orderBy: { bookingDate: 'desc' },
    });

    if (!booking) {
      booking = await tx.antenatalBooking.create({
        data: {
          patientId: attendance.patientId,
          attendanceId: attendance.id,
          currentAttendanceId: attendance.id,
          bookingDate: attendance.dateTime,
          gravida: 1,
          para: 0,
          riskLevel: 'low',
          riskFactors: [],
          isActive: true,
          isCompleted: false,
          createdById: userId,
          iptpDoses: {},
          ttDoses: {},
          previousCSection: false,
          malariaTested: false,
          malariaPositive: false,
          anaemiaDiagnosed: false,
          ironFolateGiven: false,
          itnGiven: false,
        },
      });
    }

    const visitCount = await tx.aNCVisit.count({ where: { bookingId: booking.id } });
    return tx.aNCVisit.create({
      data: {
        bookingId: booking.id,
        attendanceId: attendance.id,
        visitNumber: visitCount + 1,
        visitDate: attendance.dateTime,
        recordedById: userId,
        iptpGiven: false,
        ttGiven: false,
        ironGiven: false,
        folateGiven: false,
        calciumGiven: false,
        malariaTestDone: false,
        malariaTreatmentGiven: false,
        dangerSignsPresent: false,
        referralMade: false,
        oedema: false,
        dangerSignsList: [],
      },
    });
  }

  /**
   * Reject impossible or clearly malformed measurements without applying adult-only
   * clinical thresholds to children or newborns. Units are metric and temperature is °C.
   */
  private validateClinicalVitalValues(data: Record<string, any>) {
    const ranges: Record<string, { min: number; max: number; label: string }> = {
      temperature: { min: 25, max: 45, label: 'Temperature must be recorded in °C between 25 and 45' },
      pulse: { min: 1, max: 300, label: 'Pulse must be between 1 and 300 beats/minute' },
      respiration: { min: 1, max: 100, label: 'Respiratory rate must be between 1 and 100 breaths/minute' },
      spo2: { min: 1, max: 100, label: 'SpO₂ must be between 1 and 100 percent' },
      weight: { min: 0.1, max: 500, label: 'Weight must be recorded in kilograms between 0.1 and 500' },
      height: { min: 10, max: 300, label: 'Height/length must be recorded in centimetres between 10 and 300' },
      muac: { min: 1, max: 80, label: 'MUAC must be recorded in centimetres between 1 and 80' },
      fetalHeartRate: { min: 60, max: 200, label: 'Fetal heart rate must be between 60 and 200 beats/minute' },
      fundalHeight: { min: 0, max: 60, label: 'Fundal height must be between 0 and 60 cm' },
    };
    for (const [field, range] of Object.entries(ranges)) {
      const value = data[field];
      if (value === undefined || value === null || value === '') continue;
      const number = Number(value);
      if (!Number.isFinite(number) || number < range.min || number > range.max) {
        throw new ValidationError(range.label);
      }
    }
    if (data.bloodPressure !== undefined && data.bloodPressure !== null && String(data.bloodPressure).trim() !== '') {
      const value = String(data.bloodPressure).trim();
      const match = value.match(/^(\d{2,3})\s*\/\s*(\d{2,3})(?:\s*mmhg)?$/i);
      if (!match) throw new ValidationError('Blood pressure must use systolic/diastolic format, for example 120/80');
      const systolic = Number(match[1]);
      const diastolic = Number(match[2]);
      if (systolic < 30 || systolic > 300 || diastolic < 20 || diastolic > 200 || diastolic >= systolic) {
        throw new ValidationError('Blood pressure values are outside plausible limits; verify systolic/diastolic readings');
      }
    }
  }

  async addVitals(encounterId: string, data: AddVitalsDTO, userId: string) {
    this.validateClinicalVitalValues(data as Record<string, any>);
    const actorId = await this.requireActorId(userId);
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
    const hasAntenatalData =
      fetalHeartRate !== undefined ||
      fundalHeight !== undefined ||
      Boolean(presentingPart?.trim()) ||
      fetalMovement !== undefined ||
      oedema !== undefined;
    if (Object.keys(vitalsData).length === 0 && !hasAntenatalData) {
      throw new ValidationError('No editable vital-sign fields supplied');
    }

    return this.prisma.$transaction(async (tx) => {
      const attendance = await tx.attendance.findUnique({
        where: { id: encounterId },
        select: { id: true, patientId: true, attendanceType: true, dateTime: true },
      });
      if (!attendance) throw new NotFoundError('Encounter', encounterId);

      if (hasAntenatalData && attendance.attendanceType !== 'antenatal') {
        throw new ValidationError('Antenatal assessment fields can only be saved for an antenatal visit');
      }

      const savedVitals = await tx.vitals.create({
        data: {
          attendanceId: encounterId,
          patientId: attendance.patientId,
          ...vitalsData,
          recordedById: actorId,
          recordedAt: new Date(),
        },
        include: { User: { select: { fullName: true } } },
      });

      if (hasAntenatalData) {
        const ancVisit = await this.getOrCreateANCVisit(tx, attendance, actorId);
        await tx.aNCVisit.update({
          where: { id: ancVisit.id },
          data: {
            ...(fetalHeartRate !== undefined && { fetalHeartRate }),
            ...(fundalHeight !== undefined && { fundalHeight: Math.round(fundalHeight) }),
            ...(presentingPart !== undefined && { presentation: presentingPart.trim() || null }),
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
    this.validateClinicalVitalValues(data as Record<string, any>);
    const {
      fetalHeartRate,
      fundalHeight,
      presentingPart,
      fetalMovement,
      oedema,
    } = data;
    // Allow only measured vitals and notes to be edited. Never pass the full
    // client object into Prisma, where IDs, links, recorder and timestamps live.
    const vitalsData: any = {};
    for (const key of ['bloodPressure', 'temperature', 'pulse', 'respiration', 'spo2', 'weight', 'height', 'bmi', 'muac', 'notes']) {
      if (data[key] !== undefined) vitalsData[key] = data[key];
    }
    const hasAntenatalData =
      fetalHeartRate !== undefined ||
      fundalHeight !== undefined ||
      presentingPart !== undefined ||
      fetalMovement !== undefined ||
      oedema !== undefined;

    if (Object.keys(vitalsData).length === 0 && !hasAntenatalData) {
      throw new ValidationError('No editable vital-sign fields supplied');
    }

    const numericRanges: Record<string, [number, number]> = {
      temperature: [25, 45],
      pulse: [0, 300],
      respiration: [0, 100],
      spo2: [0, 100],
      weight: [0, 500],
      height: [0, 300],
      bmi: [0, 150],
      muac: [0, 100],
    };
    for (const [key, value] of Object.entries(vitalsData)) {
      if (value === null || value === undefined || key === 'notes' || key === 'bloodPressure') continue;
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new ValidationError(`${key} must be a valid number`);
      }
      const range = numericRanges[key];
      if (range && (value < range[0] || value > range[1])) {
        throw new ValidationError(`${key} must be between ${range[0]} and ${range[1]}`);
      }
      if (key === 'pulse' || key === 'respiration') {
        if (!Number.isInteger(value)) throw new ValidationError(`${key} must be a whole number`);
      }
    }
    if (fetalHeartRate !== undefined && fetalHeartRate !== null &&
      (typeof fetalHeartRate !== 'number' || !Number.isFinite(fetalHeartRate) || fetalHeartRate < 0 || fetalHeartRate > 300)) {
      throw new ValidationError('Fetal heart rate must be between 0 and 300');
    }
    if (fundalHeight !== undefined && fundalHeight !== null &&
      (typeof fundalHeight !== 'number' || !Number.isFinite(fundalHeight) || fundalHeight < 0 || fundalHeight > 100)) {
      throw new ValidationError('Fundal height must be between 0 and 100');
    }
    if (fetalMovement !== undefined && typeof fetalMovement !== 'boolean') {
      throw new ValidationError('Fetal movement must be recorded as true or false');
    }
    if (oedema !== undefined && typeof oedema !== 'boolean') {
      throw new ValidationError('Oedema must be recorded as true or false');
    }
    if (presentingPart !== undefined && presentingPart !== null && typeof presentingPart !== 'string') {
      throw new ValidationError('Presenting part must be text');
    }

    return this.prisma.$transaction(async (tx) => {
      const existingVitals = await tx.vitals.findUnique({
        where: { id: vitalsId },
        select: { attendanceId: true, recordedById: true },
      });
      if (!existingVitals) throw new NotFoundError('Vitals', vitalsId);

      const attendance = await tx.attendance.findUnique({
        where: { id: existingVitals.attendanceId },
        select: { id: true, patientId: true, attendanceType: true, dateTime: true },
      });
      if (!attendance) throw new NotFoundError('Encounter', existingVitals.attendanceId);
      if (hasAntenatalData && attendance.attendanceType !== 'antenatal') {
        throw new ValidationError('Antenatal assessment fields can only be saved for an antenatal visit');
      }

      const updatedVitals = await tx.vitals.update({
        where: { id: vitalsId },
        data: vitalsData,
      });

      if (hasAntenatalData) {
        const ancVisit = await this.getOrCreateANCVisit(tx, attendance, existingVitals.recordedById);
        await tx.aNCVisit.update({
          where: { id: ancVisit.id },
          data: {
            ...(fetalHeartRate !== undefined && { fetalHeartRate }),
            ...(fundalHeight !== undefined && { fundalHeight: Math.round(fundalHeight) }),
            ...(presentingPart !== undefined && { presentation: presentingPart.trim() || null }),
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
    const actorId = await this.requireActorId(userId);
    await this.requireEncounterId(encounterId);

    // Catch incomplete or impossible prescriptions before creating a medication
    // record or generating its medication-administration schedule.
    for (const [field, value] of Object.entries({
      dosage: data.dosage,
      frequency: data.frequency,
      duration: data.duration,
    })) {
      if (typeof value !== 'string' || !value.trim()) {
        throw new ValidationError(`${field[0].toUpperCase() + field.slice(1)} is required for a prescription`);
      }
    }
    const quantity = data.quantity === undefined ? 1 : Number(data.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10000) {
      throw new ValidationError('Prescription quantity must be a whole number between 1 and 10000');
    }
    if (data.route !== undefined && !String(data.route).trim()) {
      throw new ValidationError('Route must be provided as a meaningful value or omitted');
    }

    const stockItem = await this.prisma.stockItem.findUnique({ where: { id: data.stockItemId } });
    if (!stockItem) throw new NotFoundError('Stock item', data.stockItemId);
    if (!data.serviceCatalogId) throw new ValidationError('A medication service is required');
    const service = await this.prisma.serviceCatalog.findUnique({ where: { id: data.serviceCatalogId } });
    if (!service || service.serviceType !== 'medication') {
      throw new NotFoundError('Medication service', data.serviceCatalogId);
    }

    // Parse the MAR schedule before writing anything: an unsupported frequency or
    // duration must not leave a prescription behind without its administration plan.
    const prescribedAt = new Date();
    const schedule = this.marService.parseSchedule(data.frequency, data.duration, prescribedAt);

    // Keep the prescription and its medication-administration schedule atomic. If
    // dose creation fails, the prescription itself must roll back as well.
    const medication = await this.prisma.$transaction(async (tx) => {
      const created = await tx.medication.create({
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
          quantity,
          status: 'prescribed',
          prescribedById: actorId,
          prescribedAt,
        },
        include: {
          StockItem: { select: { id: true, name: true, currentStock: true, unitOfMeasure: true } },
        },
      });

      const rows = Array.from({ length: schedule.requiredDoses }, (_, index) => ({
        medicationId: created.id,
        doseNumber: index + 1,
        scheduledAt: new Date(schedule.firstDoseAt.getTime() + index * schedule.intervalHours * 3_600_000),
        status: 'scheduled' as const,
        dose: created.dosage,
        route: created.route,
      }));
      if (rows.length > 0) await tx.medicationDose.createMany({ data: rows });
      return created;
    });

    return medication;
  }

  // ✅ PRODUCTION FIX: Dispensing must deduct stock safely using a transaction
  async dispenseMedication(encounterId: string, medicationId: string, quantity: number, userId: string, batchNumber?: string, expiryDate?: Date) {
    // Keep the legacy repository entry point on the same guarded inventory path.
    return this.updateMedication(encounterId, medicationId, {
      status: 'dispensed', quantity, batchNumber, expiryDate,
    }, userId);
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
    const actorId = await this.requireActorId(userId);
    return this.prisma.$transaction(async (tx) => {
      // Query by the unique medication ID, then verify encounter ownership before
      // any stock or medication mutation. This also keeps repository test doubles
      // aligned with Prisma's unique-record lookup contract.
      const med = await tx.medication.findUnique({
        where: { id: medicationId },
        include: { StockItem: true },
      });
      if (!med || med.attendanceId !== encounterId) throw new NotFoundError('Medication', medicationId);

      // Dispensing is a stock-changing, one-way transition. Never allow a generic
      // medication edit to reset a dispensed order to "prescribed", because that
      // would permit the same prescription to deduct stock a second time.
      if (data.status !== undefined && !['prescribed', 'dispensed', 'administered', 'cancelled'].includes(String(data.status))) {
        throw new ValidationError('Unsupported medication status');
      }
      if (med.status === 'cancelled' && data.status !== undefined && data.status !== 'cancelled') {
        throw new ConflictError('A cancelled medication cannot be reopened');
      }
      if (med.status === 'administered' && data.status !== undefined && data.status !== 'administered') {
        throw new ConflictError('An administered medication cannot be reset or cancelled through an ordinary status update; use the documented clinical correction workflow');
      }
      if (data.status === 'administered' && med.status !== 'dispensed' && med.status !== 'administered') {
        throw new ConflictError('Medication must be dispensed before administration can be recorded');
      }
      if (data.quantity !== undefined && (!Number.isSafeInteger(Number(data.quantity)) || Number(data.quantity) <= 0)) {
        throw new ValidationError('Medication quantity must be a positive whole number');
      }
      if (med.status === 'dispensed' && data.status !== undefined &&
          !['dispensed', 'administered'].includes(String(data.status))) {
        throw new ValidationError('A dispensed medication cannot be reset to a pre-dispensing status; use the documented clinical correction workflow');
      }

      const updateData: any = {};
      if (data.status !== undefined) updateData.status = data.status;
      if (data.notes !== undefined) updateData.notes = data.notes;

      const isDispensing = data.status === 'dispensed' && med.status !== 'dispensed';
      if (med.status === 'dispensed' && data.quantity !== undefined && data.quantity !== med.quantity) {
        throw new ValidationError('A dispensed quantity cannot be edited directly; use a documented stock correction workflow');
      }

      if (isDispensing) {
        const qty = Number(data.quantity ?? med.quantity ?? 1);
        if (!Number.isSafeInteger(qty) || qty <= 0) {
          throw new ValidationError('Dispensed quantity must be a positive whole number');
        }
        if (med.status !== 'prescribed') {
          throw new ValidationError('Only prescribed medication can be dispensed');
        }
        if (!med.stockItemId || !med.StockItem) {
          throw new ValidationError('This medication is not linked to a stock item');
        }

        const dispensingUser = await tx.user.findUnique({
          where: { id: actorId }, select: { departmentId: true, role: true },
        });
        const departmentId = dispensingUser?.departmentId;
        if (!departmentId) throw new ValidationError('Assign the dispensing user to a pharmacy/issuing department before dispensing');

        const stockItem = med.StockItem;
        if (!stockItem.isActive) throw new ValidationError('Inactive stock items cannot be dispensed');
        if (!stockItem.isMedication) throw new ValidationError('The linked stock item is not configured as a medication');
        const batchCount = await tx.stockBatch.count({ where: { stockItemId: stockItem.id } });
        const batches = batchCount > 0 ? await tx.stockBatch.findMany({
          where: {
            stockItemId: stockItem.id, departmentId, wardId: null, isActive: true,
            expiryDate: { gte: startOfCurrentDay() }, quantity: { gt: 0 },
          },
          orderBy: [{ expiryDate: 'asc' }, { receivedDate: 'asc' }],
        }) : [];
        const batchAllocations: Array<{ batchId: string; batchNumber: string; quantity: number; expiryDate: Date; costPrice: string }> = [];
        if (batchCount > 0) {
          const available = batches.reduce((sum, batch) => sum + batch.quantity, 0);
          if (available < qty) {
            throw new ValidationError(`Insufficient usable batch stock in your department. Available: ${available}, requested: ${qty}`);
          }
          let remaining = qty;
          for (const batch of batches) {
            if (remaining <= 0) break;
            const move = Math.min(batch.quantity, remaining);
            const changed = await tx.stockBatch.updateMany({
              where: {
                id: batch.id, departmentId, wardId: null, isActive: true,
                expiryDate: { gte: startOfCurrentDay() }, quantity: { gte: move },
              },
              data: { quantity: { decrement: move } },
            });
            if (changed.count !== 1) throw new ConflictError('Batch stock changed during dispensing; please retry');
            batchAllocations.push({
              batchId: batch.id,
              batchNumber: batch.batchNumber,
              quantity: move,
              expiryDate: batch.expiryDate,
              costPrice: String(batch.costPrice),
            });
            remaining -= move;
          }
        }

        // One transaction keeps the physical batches, department ledger and hospital
        // aggregate aligned. For unbatched legacy items, the department balance is
        // still required and no aggregate-only fallback is permitted.
        const departmentBalance = await decreaseDepartmentStockBalance(tx, stockItem.id, departmentId, qty);
        const stockChanged = await tx.stockItem.updateMany({
          where: { id: stockItem.id, currentStock: { gte: qty } },
          data: { currentStock: { decrement: qty } },
        });
        if (stockChanged.count !== 1) throw new ValidationError(`Insufficient hospital-wide stock. Available: ${stockItem.currentStock}`);

        const claimed = await tx.medication.updateMany({
          where: { id: medicationId, attendanceId: encounterId, status: 'prescribed' },
          data: {
            status: 'dispensed', quantity: qty, dispensedAt: new Date(), dispensedById: actorId,
            dispensedBatchNumber: batchAllocations.length === 1 ? batchAllocations[0].batchNumber : undefined,
            dispensedExpiryDate: batchAllocations.length === 1 ? batchAllocations[0].expiryDate : undefined,
            dispensedUnitCost: batchAllocations.length === 1 ? batchAllocations[0].costPrice : stockItem.costPrice,
          },
        });
        if (claimed.count !== 1) throw new ConflictError('Medication has already been dispensed or is no longer available');

        updateData.status = 'dispensed';
        updateData.quantity = qty;
        updateData.dispensedAt = new Date();
        updateData.dispensedById = actorId;
        updateData.dispensedBatchNumber = batchAllocations.length === 1 ? batchAllocations[0].batchNumber : undefined;
        updateData.dispensedExpiryDate = batchAllocations.length === 1 ? batchAllocations[0].expiryDate : undefined;
        updateData.dispensedUnitCost = batchAllocations.length === 1 ? batchAllocations[0].costPrice : stockItem.costPrice;

        const current = await tx.stockItem.findUnique({
          where: { id: stockItem.id }, select: { currentStock: true },
        });
        if (!current) throw new NotFoundError('Stock item', stockItem.id);
        await tx.stockTransaction.create({
          data: {
            stockItemId: stockItem.id, transactionType: 'sale', quantity: qty,
            // balanceAfter is a location snapshot, not the hospital-wide aggregate.
            balanceAfter: departmentBalance.quantity, performedBy: actorId,
            reference: `Encounter ${encounterId}`,
            notes: batchCount > 0 ? 'Dispensed using FEFO batch allocation' : 'Dispensed from unbatched department stock',
            departmentId,
            batchAllocations: batchAllocations as any,
          },
        });
      } else if (data.quantity !== undefined) {
        updateData.quantity = data.quantity;
      }

      if (data.status === 'administered') {
        updateData.administeredAt = new Date();
        updateData.administeredById = actorId;
      }

      // Resolve and validate a due dose before any clinical record is changed.
      // A medication must not appear administered when no dose could be recorded.
      let administrationDose: any = null;
      if (data.status === 'administered') {
        administrationDose = data.doseId
          ? await tx.medicationDose.findUnique({ where: { id: data.doseId } })
          : await tx.medicationDose.findFirst({
              where: { medicationId, status: { in: ['scheduled', 'due', 'late'] } },
              orderBy: { doseNumber: 'asc' },
            });
        if (data.doseId && !administrationDose) throw new NotFoundError('Medication dose', data.doseId);
        if (administrationDose && administrationDose.medicationId !== medicationId) {
          throw new ValidationError('The selected dose does not belong to this medication');
        }
        if (administrationDose && !['scheduled', 'due', 'late'].includes(administrationDose.status)) {
          throw new ConflictError('This medication dose is no longer awaiting administration');
        }
        if (!administrationDose) {
          throw new ConflictError('No scheduled medication dose is awaiting administration; create or select the correct dose before recording administration');
        }
      }

      const updated = await tx.medication.update({
        where: { id: medicationId },
        data: updateData,
        include: { StockItem: { select: { id: true, name: true, currentStock: true, unitOfMeasure: true } } },
      });

      if (administrationDose) {
        // Conditional claim prevents two staff sessions from recording the same dose.
        const claimedDose = await tx.medicationDose.updateMany({
          where: { id: administrationDose.id, medicationId, status: { in: ['scheduled', 'due', 'late'] } },
          data: {
            status: 'administered',
            administeredAt: updateData.administeredAt,
            administeredById: updateData.administeredById,
            site: data.site ?? undefined,
            notes: data.notes ?? undefined,
          },
        });
        if (claimedDose.count !== 1) {
          throw new ConflictError('This medication dose was recorded by another user or is no longer awaiting administration');
        }
      }

      return updated;
    });
  }

  async removeMedication(encounterId: string, medicationId: string) {
    return this.prisma.$transaction(async (tx) => {
      const medication = await tx.medication.findFirst({
        where: { id: medicationId, attendanceId: encounterId },
        select: { id: true, status: true },
      });
      if (!medication) throw new NotFoundError('Medication', medicationId);
      if (medication.status === 'dispensed' || medication.status === 'administered') {
        throw new ConflictError('A dispensed or administered medication cannot be removed as an ordinary cancellation; document a dispensing return or clinical correction');
      }
      if (medication.status === 'cancelled') {
        throw new ConflictError('This medication is already cancelled');
      }
      if (medication.status !== 'prescribed') {
        throw new ConflictError('Only a prescribed, not-yet-dispensed medication can be cancelled');
      }

      const existing = await tx.medication.findUnique({
        where: { id: medication.id },
        select: { status: true },
      });
      if (!existing) throw new NotFoundError('Medication', medicationId);
      if (existing.status !== 'prescribed') {
        throw new ValidationError('Only an undispensed prescription can be cancelled here; dispensed medication requires the documented return/correction workflow');
      }

      const cancellation = await tx.medication.updateMany({
        where: { id: medication.id, attendanceId: encounterId, status: 'prescribed' },
        data: { status: 'cancelled' },
      });
      if (cancellation.count !== 1) {
        throw new ConflictError('This prescription has changed; refresh before cancelling');
      }
      const cancelled = await tx.medication.findUnique({ where: { id: medication.id } });

      await tx.medicationDose.updateMany({
        where: {
          medicationId: medication.id,
          status: { in: ['scheduled', 'due', 'late'] },
        },
        data: { status: 'discontinued' },
      });

      return cancelled;
    });
  }

async addLabTest(encounterId: string, data: AddLabTestDTO, userId: string) {
  const actorId = await this.requireActorId(userId);
  await this.requireEncounterId(encounterId);
  let templateId: string | undefined;

  if (data.serviceCatalogId) {
    const catalogEntry = await this.prisma.serviceCatalog.findUnique({
      where: { id: data.serviceCatalogId },
      select: { labTestTemplateId: true, name: true, code: true, serviceType: true },
    });

    if (!catalogEntry) {
      throw new NotFoundError('Lab service', data.serviceCatalogId);
    }
    if (catalogEntry.serviceType !== 'lab_test') {
      throw new ValidationError(`Service "${catalogEntry.name}" is not a laboratory service`);
    }
    if (!catalogEntry.labTestTemplateId) {
      throw new ValidationError(
        `ServiceCatalog entry "${catalogEntry.name}" (${catalogEntry.code}) is not linked to a lab test template. ` +
        `Ask an admin to fix the catalog linkage.`,
      );
    }
    templateId = catalogEntry.labTestTemplateId;
  } else {
    templateId = data.templateId;
  }

  if (!templateId) {
    throw new ValidationError('A lab test template or service catalog entry is required');
  }

  const template = await this.prisma.labTestTemplate.findUnique({
    where: { id: templateId },
    select: { id: true },
  });
  if (!template) throw new NotFoundError('Lab test template', templateId);

  return this.prisma.labTest.create({
    data: {
      attendanceId: encounterId,
      templateId,
      serviceCatalogId: data.serviceCatalogId ?? null,
      status: 'requested',
      priority: data.priority ?? 'routine',
      requestedAt: new Date(),
      createdById: actorId,
      notes: data.notes ?? null,
    },
    include: {
      LabTestTemplate: true,
      ServiceCatalog: { select: { id: true, name: true, code: true } },
    },
  });
}

  async updateLabTestStatus(labOrderId: string, status: string, data: any, userId: string) {
    const actorId = await this.requireActorId(userId);
    if (!['requested', 'in_progress', 'completed', 'cancelled'].includes(status)) throw new ValidationError('Unsupported laboratory order status');
    const current = await this.prisma.labTest.findUnique({ where: { id: labOrderId }, select: { id: true, status: true } });
    if (!current) throw new NotFoundError('Laboratory order', labOrderId);
    if (current.status === 'cancelled') throw new ConflictError('A cancelled laboratory order cannot be reopened or changed');
    if (current.status === 'completed') throw new ConflictError('A completed laboratory result is locked; use the documented result-correction workflow');
    if (current.status === 'in_progress' && status === 'requested') throw new ConflictError('A laboratory order in progress cannot return to requested');
    const updateData: any = {};
    for (const field of ['result', 'normalRange', 'units', 'notes']) if (data[field] !== undefined) updateData[field] = data[field];
    if (status !== current.status) updateData.status = status;
    if (status === 'completed') { updateData.completedAt = new Date(); updateData.performedById = actorId; }
    else if (status === 'in_progress') updateData.performedById = actorId;
    if (!Object.keys(updateData).length) throw new ValidationError('No laboratory order changes were provided');
    const updated = await this.prisma.labTest.updateMany({
      where: { id: labOrderId, status: current.status },
      data: updateData,
    });
    if (updated.count !== 1) throw new ConflictError('Laboratory order status changed; refresh and try again');
    return this.prisma.labTest.findUnique({ where: { id: labOrderId } });
  }

  async removeLabTest(encounterId: string, labOrderId: string) {
    // Scope by encounter and only cancel orders that have not been completed.
    const current = await this.prisma.labTest.findFirst({
      where: { id: labOrderId, attendanceId: encounterId }, select: { id: true, status: true },
    });
    if (!current) throw new NotFoundError('Lab order in encounter', labOrderId);
    if (current.status === 'completed' || current.status === 'cancelled') {
      throw new ConflictError('A completed or cancelled laboratory order cannot be cancelled again');
    }
    const result = await this.prisma.labTest.updateMany({
      where: { id: labOrderId, attendanceId: encounterId, status: { in: ['requested', 'in_progress'] } },
      data: { status: 'cancelled' },
    });
    if (result.count !== 1) throw new ConflictError('Laboratory order status changed; refresh and try again');
    return { id: labOrderId, status: 'cancelled' };
  }

async addScan(encounterId: string, data: any, userId: string) {
  const actorId = await this.requireActorId(userId);
  await this.requireEncounterId(encounterId);
  let templateId: string | undefined;
  const serviceCatalogId = data.serviceCatalogId as string | undefined;

  if (serviceCatalogId) {
    const catalogEntry = await this.prisma.serviceCatalog.findUnique({
      where: { id: serviceCatalogId },
      select: {
        id: true, name: true, code: true, description: true, serviceType: true,
        scanTemplateId: true, subType: true, metadata: true, isNHISCovered: true,
        nhisRequiresAuth: true, isActive: true,
      },
    });
    if (!catalogEntry || catalogEntry.serviceType !== 'scan') {
      throw new NotFoundError('Scan service', serviceCatalogId);
    }

    if (catalogEntry.scanTemplateId) {
      const linkedTemplate = await this.prisma.scanTemplate.findUnique({
        where: { id: catalogEntry.scanTemplateId },
        select: { id: true },
      });
      templateId = linkedTemplate?.id;
    }

    if (!templateId) {
      const metadata = catalogEntry.metadata && typeof catalogEntry.metadata === 'object' && !Array.isArray(catalogEntry.metadata)
        ? catalogEntry.metadata as Record<string, unknown>
        : {};
      const scanType = metadata.scanType;
      const bodyPart = normalizeBodyPart(metadata.bodyPart ?? catalogEntry.subType);
      const scanCategory = normalizeScanCategory(catalogEntry.name, scanType);

      templateId = await this.prisma.$transaction(async (tx) => {
        const currentCatalog = await tx.serviceCatalog.findUnique({
          where: { id: serviceCatalogId },
          select: { scanTemplateId: true },
        });
        if (!currentCatalog) throw new NotFoundError('Scan service', serviceCatalogId);
        if (currentCatalog.scanTemplateId) {
          const currentTemplate = await tx.scanTemplate.findUnique({
            where: { id: currentCatalog.scanTemplateId },
            select: { id: true },
          });
          if (currentTemplate) return currentTemplate.id;
        }

        const template = await tx.scanTemplate.upsert({
          where: { scanCode: catalogEntry.code },
          create: {
            name: catalogEntry.name,
            investigationCode: catalogEntry.code,
            scanCode: catalogEntry.code,
            description: catalogEntry.description || catalogEntry.name,
            category: scanCategory,
            bodyPart,
            isNHISCovered: catalogEntry.isNHISCovered,
            nhisRequiresAuth: catalogEntry.nhisRequiresAuth,
            isActive: catalogEntry.isActive,
            preparationInstructions: typeof metadata.preparationInstructions === 'string' ? metadata.preparationInstructions : null,
            duration: typeof metadata.duration === 'number' ? metadata.duration : 30,
            contrastRequired: metadata.contrastRequired === true,
            scanType: typeof scanType === 'string' ? scanType : catalogEntry.name,
            resultTemplate: Array.isArray(metadata.resultTemplate) ? metadata.resultTemplate : undefined,
          },
          update: {},
          select: { id: true },
        });
        await tx.serviceCatalog.update({
          where: { id: serviceCatalogId },
          data: { scanTemplateId: template.id },
        });
        return template.id;
      });
    }
  } else {
    templateId = data.templateId;
  }

  if (!templateId) throw new ValidationError('A scan template or service catalog entry is required');

  const template = await this.prisma.scanTemplate.findUnique({ where: { id: templateId } });
  if (!template) throw new NotFoundError('Scan template', templateId);

  return this.prisma.scan.create({
    data: {
      attendanceId: encounterId,
      templateId: template.id,
      serviceCatalogId: serviceCatalogId ?? null,
      scanType: template.scanType || template.name,
      description: template.description ?? null,
      bodyPart: data.bodyPart ?? null,
      status: 'requested',
      priority: data.priority ?? 'routine',
      requestedAt: new Date(),
      createdById: actorId,
    },
    include: { ScanTemplate: true },
  });
}

  async updateScanStatus(scanId: string, status: string, data: any, userId: string) {
    const actorId = await this.requireActorId(userId);
    if (!['requested', 'in_progress', 'completed', 'cancelled'].includes(status)) throw new ValidationError('Unsupported scan order status');
    const current = await this.prisma.scan.findUnique({ where: { id: scanId }, select: { id: true, status: true } });
    if (!current) throw new NotFoundError('Scan order', scanId);
    if (current.status === 'cancelled') throw new ConflictError('A cancelled scan order cannot be reopened or changed');
    if (current.status === 'completed') throw new ConflictError('A completed scan report is locked; use the documented report-correction workflow');
    if (current.status === 'in_progress' && status === 'requested') throw new ConflictError('A scan in progress cannot return to requested');
    const updateData: any = {};
    for (const field of ['result', 'findings', 'impression']) if (data[field] !== undefined) updateData[field] = data[field];
    if (data.imageUrls !== undefined) {
      if (!Array.isArray(data.imageUrls) || data.imageUrls.some((url: unknown) => typeof url !== 'string' || !url.trim())) throw new ValidationError('Scan image URLs must be a list of non-empty strings');
      updateData.imageUrls = data.imageUrls;
    }
    if (status !== current.status) updateData.status = status;
    if (status === 'completed') { updateData.completedAt = new Date(); updateData.performedById = actorId; }
    else if (status === 'in_progress') updateData.performedById = actorId;
    if (!Object.keys(updateData).length) throw new ValidationError('No scan order changes were provided');
    const updated = await this.prisma.scan.updateMany({
      where: { id: scanId, status: current.status },
      data: updateData,
    });
    if (updated.count !== 1) throw new ConflictError('Scan order status changed; refresh and try again');
    return this.prisma.scan.findUnique({ where: { id: scanId } });
  }

  async removeScan(encounterId: string, scanId: string) {
    const current = await this.prisma.scan.findFirst({
      where: { id: scanId, attendanceId: encounterId }, select: { id: true, status: true },
    });
    if (!current) throw new NotFoundError('Scan in encounter', scanId);
    if (current.status === 'completed' || current.status === 'cancelled') {
      throw new ConflictError('A completed or cancelled scan order cannot be cancelled again');
    }
    const result = await this.prisma.scan.updateMany({
      where: { id: scanId, attendanceId: encounterId, status: { in: ['requested', 'in_progress'] } },
      data: { status: 'cancelled' },
    });
    if (result.count !== 1) throw new ConflictError('Scan order status changed; refresh and try again');
    return { id: scanId, status: 'cancelled' };
  }

async addProcedure(encounterId: string, data: any, userId: string) {
  const actorId = await this.requireActorId(userId);
  await this.requireEncounterId(encounterId);
  let templateId: string | undefined;
  const serviceCatalogId = data.serviceCatalogId as string | undefined;

  if (serviceCatalogId) {
    const catalogEntry = await this.prisma.serviceCatalog.findUnique({
      where: { id: serviceCatalogId },
      select: { procedureTemplateId: true, name: true, code: true, serviceType: true },
    });
    if (!catalogEntry || catalogEntry.serviceType !== 'procedure') {
      throw new NotFoundError('Procedure service', serviceCatalogId);
    }
    if (!catalogEntry.procedureTemplateId) {
      throw new ValidationError(`ServiceCatalog "${catalogEntry.name}" (${catalogEntry.code}) is not linked to a procedure template`);
    }
    templateId = catalogEntry.procedureTemplateId;
  } else {
    templateId = data.templateId;
  }

  if (!templateId) throw new ValidationError('A procedure template or service catalog entry is required');

  const template = await this.prisma.procedureTemplate.findUnique({ where: { id: templateId } });
  if (!template) throw new NotFoundError('Procedure template', templateId);

  return this.prisma.procedure.create({
    data: {
      attendanceId: encounterId,
      templateId: template.id,
      serviceCatalogId: serviceCatalogId ?? null,
      status: 'scheduled',
      scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
      notes: data.notes ?? null,
      duration: data.duration ?? null,
      createdById: actorId,
    },
    include: { ProcedureTemplate: true },
  });
}

  async updateProcedureStatus(procedureId: string, status: string, data: any, userId: string) {
    const actorId = await this.requireActorId(userId);
    if (!['scheduled', 'in_progress', 'completed', 'cancelled'].includes(status)) throw new ValidationError('Unsupported procedure status; use scheduled, in_progress, completed or cancelled');
    const current = await this.prisma.procedure.findUnique({ where: { id: procedureId }, select: { id: true, status: true } });
    if (!current) throw new NotFoundError('Procedure', procedureId);
    if (current.status === 'cancelled') throw new ConflictError('A cancelled procedure cannot be reopened or changed');
    if (current.status === 'completed') throw new ConflictError('A completed procedure record is locked; use the documented clinical correction workflow');
    if (current.status === 'in_progress' && status === 'scheduled') throw new ConflictError('A procedure in progress cannot return to scheduled');
    const updateData: any = {};
    for (const field of ['notes', 'complications', 'outcome', 'anesthesiaNotes', 'intraOperativeNotes', 'postOperativeNotes', 'assistantId', 'scheduledDate', 'duration', 'bloodLoss']) if (data[field] !== undefined) updateData[field] = data[field];
    if (data.scheduledDate !== undefined && data.scheduledDate !== null) {
      const scheduledDate = new Date(data.scheduledDate);
      if (Number.isNaN(scheduledDate.getTime())) throw new ValidationError('Procedure scheduled date must be valid');
      updateData.scheduledDate = scheduledDate;
    }
    if (data.duration !== undefined && data.duration !== null && (!Number.isInteger(Number(data.duration)) || Number(data.duration) < 1 || Number(data.duration) > 1440)) throw new ValidationError('Procedure duration must be between 1 and 1440 minutes');
    if (data.bloodLoss !== undefined && data.bloodLoss !== null && (!Number.isInteger(Number(data.bloodLoss)) || Number(data.bloodLoss) < 0 || Number(data.bloodLoss) > 20000)) throw new ValidationError('Blood loss must be between 0 and 20000 mL');
    if (status !== current.status) updateData.status = status;
    if (status === 'in_progress' || status === 'completed') updateData.performedById = actorId;
    if (status === 'completed') updateData.performedAt = new Date();
    if (!Object.keys(updateData).length) throw new ValidationError('No procedure changes were provided');
    const updated = await this.prisma.procedure.updateMany({
      where: { id: procedureId, status: current.status },
      data: updateData,
    });
    if (updated.count !== 1) throw new ConflictError('Procedure status changed; refresh and try again');
    return this.prisma.procedure.findUnique({ where: { id: procedureId } });
  }

  async removeProcedure(encounterId: string, procedureId: string) {
    const current = await this.prisma.procedure.findFirst({
      where: { id: procedureId, attendanceId: encounterId }, select: { id: true, status: true },
    });
    if (!current) throw new NotFoundError('Procedure in encounter', procedureId);
    if (current.status === 'completed' || current.status === 'cancelled') {
      throw new ConflictError('A completed or cancelled procedure cannot be cancelled again');
    }
    const result = await this.prisma.procedure.updateMany({
      where: { id: procedureId, attendanceId: encounterId, status: { in: ['scheduled', 'in_progress'] } },
      data: { status: 'cancelled' },
    });
    if (result.count !== 1) throw new ConflictError('Procedure status changed; refresh and try again');
    return { id: procedureId, status: 'cancelled' };
  }

  async addService(encounterId: string, data: any, userId: string) {
    const actorId = await this.requireActorId(userId);
    await this.requireEncounterId(encounterId);
    if (!data.serviceCatalogId) throw new ValidationError('A service catalog entry is required');
    const service = await this.prisma.serviceCatalog.findUnique({ where: { id: data.serviceCatalogId } });
    if (!service) throw new NotFoundError('Service', data.serviceCatalogId);
    return this.prisma.serviceRendered.create({
      data: { attendanceId: encounterId, serviceItemId: data.serviceCatalogId, quantity: data.quantity || 1, date: new Date(), performedById: actorId, notes: data.notes }
    });
  }

  async removeService(encounterId: string, serviceRenderedId: string) {
    const result = await this.prisma.serviceRendered.deleteMany({
      where: { id: serviceRenderedId, attendanceId: encounterId },
    });
    if (result.count === 0) throw new NotFoundError('Service rendered in encounter', serviceRenderedId);
    return { id: serviceRenderedId, removed: true };
  }

  async getConsumableUses(encounterId: string) {
    await this.requireEncounterId(encounterId);
    const rows = await this.prisma.stockTransaction.findMany({
      where: { reference: encounterId, notes: { startsWith: 'Consumable use:' } },
      include: { StockItem: { select: { id: true, name: true, unitOfMeasure: true } } },
      orderBy: { transactionDate: 'desc' },
    });
    return rows.filter((row: any) => !/^Consumable use: \[(EDITED|DELETED)\]/i.test(String(row.notes || '')));
  }

  private async consumeConsumableStock(tx: any, stockItemId: string, quantity: number, departmentId: string) {
    const item = await tx.stockItem.findUnique({ where: { id: stockItemId } });
    if (!item || !item.isActive || item.isMedication) throw new NotFoundError('Active consumable', stockItemId);
    const batchCount = await tx.stockBatch.count({ where: { stockItemId } });
    const allocations: Array<{ batchId: string; quantity: number }> = [];
    if (batchCount > 0) {
      const batches = await tx.stockBatch.findMany({
        where: { stockItemId, departmentId, wardId: null, isActive: true, expiryDate: { gte: startOfCurrentDay() }, quantity: { gt: 0 } },
        orderBy: [{ expiryDate: 'asc' }, { receivedDate: 'asc' }],
      });
      const available = batches.reduce((sum: number, b: any) => sum + b.quantity, 0);
      if (available < quantity) throw new ValidationError(`Insufficient usable batch stock for ${item.name}. Available: ${available}, requested: ${quantity}`);
      let remaining = quantity;
      for (const batch of batches) {
        if (remaining <= 0) break;
        const move = Math.min(batch.quantity, remaining);
        const result = await tx.stockBatch.updateMany({
          where: { id: batch.id, departmentId, wardId: null, isActive: true, expiryDate: { gte: startOfCurrentDay() }, quantity: { gte: move } },
          data: { quantity: { decrement: move } },
        });
        if (result.count !== 1) throw new ConflictError('Batch stock changed during consumable use; retry the operation');
        allocations.push({ batchId: batch.id, quantity: move });
        remaining -= move;
      }
    }
    const departmentBalance = await decreaseDepartmentStockBalance(tx, stockItemId, departmentId, quantity);
    const changed = await tx.stockItem.updateMany({
      where: { id: stockItemId, isActive: true, isMedication: false, currentStock: { gte: quantity } },
      data: { currentStock: { decrement: quantity } },
    });
    if (changed.count !== 1) throw new ValidationError(`Insufficient hospital-wide stock for ${item.name}`);
    const stock = await tx.stockItem.findUnique({ where: { id: stockItemId }, select: { id: true } });
    if (!stock) throw new NotFoundError('Stock item', stockItemId);
    return { balanceAfter: departmentBalance.quantity, allocations };
  }

  private async restoreConsumableStock(tx: any, stockItemId: string, quantity: number, departmentId: string | null, allocationsValue: any) {
    const allocations = Array.isArray(allocationsValue) ? allocationsValue : [];
    if (allocations.length > 0) {
      const total = allocations.reduce((sum: number, a: any) => sum + Number(a.quantity || 0), 0);
      if (total !== quantity) throw new ValidationError('Saved batch allocation does not match the original quantity; manual reconciliation is required');
      for (const allocation of allocations) {
        const batchId = String(allocation.batchId || '');
        const amount = Number(allocation.quantity);
        if (!batchId || !Number.isSafeInteger(amount) || amount <= 0) throw new ValidationError('Saved batch allocation is invalid');
        const batch = await tx.stockBatch.findUnique({ where: { id: batchId }, select: { id: true, stockItemId: true, departmentId: true, wardId: true } });
        if (!batch || batch.stockItemId !== stockItemId || batch.departmentId !== departmentId || batch.wardId !== null) {
          throw new ValidationError('Original batch location has changed; manual reconciliation is required');
        }
        // Guard the restore with the original item and location. A concurrent transfer
        // must not move the batch between the read above and this quantity increment.
        const restored = await tx.stockBatch.updateMany({
          where: {
            id: batchId,
            stockItemId,
            departmentId: departmentId || null,
            wardId: null,
          },
          data: { quantity: { increment: amount } },
        });
        if (restored.count !== 1) {
          throw new ConflictError('Original batch location changed during consumable reversal; manual reconciliation is required');
        }
      }
    } else if (await tx.stockBatch.count({ where: { stockItemId } }) > 0) {
      throw new ValidationError('This historic use has no saved batch allocation; manual reconciliation is required');
    }
    const departmentBalance = await increaseDepartmentStockBalance(tx, stockItemId, departmentId, quantity);
    await tx.stockItem.update({ where: { id: stockItemId }, data: { currentStock: { increment: quantity } } });
    const stock = await tx.stockItem.findUnique({ where: { id: stockItemId }, select: { id: true } });
    if (!stock) throw new NotFoundError('Stock item', stockItemId);
    return departmentBalance.quantity;
  }

  async recordConsumableUse(encounterId: string, stockItemId: string, quantity: number, notes: string | undefined, userId: string) {
    const actorId = await this.requireActorId(userId);
    await this.requireEncounterId(encounterId);
    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      throw new ValidationError('Quantity must be a positive whole number');
    }

    return this.prisma.$transaction(async (tx) => {
      const actor = await tx.user.findUnique({ where: { id: actorId }, select: { departmentId: true, role: true } });
      if (!actor?.departmentId) throw new ValidationError('Assign the user to the issuing department before recording consumable use');
      const consumed = await this.consumeConsumableStock(tx, stockItemId, quantity, actor.departmentId);

      return tx.stockTransaction.create({
        data: {
          stockItemId,
          transactionType: 'sale',
          quantity,
          balanceAfter: consumed.balanceAfter,
          reference: encounterId,
          departmentId: actor.departmentId,
          batchAllocations: consumed.allocations as any,
          notes: `Consumable use: ${notes?.trim() || 'Used during encounter'}`,
          performedBy: actorId,
        },
        include: { StockItem: { select: { id: true, name: true, unitOfMeasure: true } } },
      });
    });
  }

  async updateConsumableUse(encounterId: string, transactionId: string, stockItemId: string, quantity: number, notes: string | undefined, userId: string) {
    const actorId = await this.requireActorId(userId);
    await this.requireEncounterId(encounterId);
    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      throw new ValidationError('Quantity must be a positive whole number');
    }

    return this.prisma.$transaction(async (tx) => {
      const previous = await tx.stockTransaction.findFirst({
        where: {
          id: transactionId,
          reference: encounterId,
          notes: { startsWith: 'Consumable use:' },
          NOT: [
            { notes: { startsWith: 'Consumable use: [EDITED]' } },
            { notes: { startsWith: 'Consumable use: [DELETED]' } },
          ],
        },
      });
      if (!previous) throw new NotFoundError('Consumable use', transactionId);
      const claimed = await tx.stockTransaction.updateMany({
        where: {
          id: previous.id,
          reference: encounterId,
          notes: { startsWith: 'Consumable use:' },
          NOT: [
            { notes: { startsWith: 'Consumable use: [EDITED]' } },
            { notes: { startsWith: 'Consumable use: [DELETED]' } },
          ],
        },
        data: { notes: `Consumable use edit in progress: ${previous.id}` },
      });
      if (claimed.count !== 1) throw new ConflictError('This consumable use has already been changed');
      const actor = await tx.user.findUnique({ where: { id: actorId }, select: { departmentId: true, role: true } });
      if (!actor?.departmentId) throw new ValidationError('Assign the user to the issuing department before recording consumable use');
      if (!['admin', 'super_admin'].includes(String(actor.role).toLowerCase()) && previous.departmentId !== actor.departmentId) throw new ValidationError('You can only edit consumable use recorded by your own department');
      const previousBalance = await this.restoreConsumableStock(tx, previous.stockItemId, previous.quantity, previous.departmentId, previous.batchAllocations);
      const consumed = await this.consumeConsumableStock(tx, stockItemId, quantity, actor.departmentId);
      await tx.stockTransaction.update({
        where: { id: previous.id },
        data: { notes: `Consumable use: [EDITED] ${previous.notes?.replace(/^Consumable use:\s*/, '') || ''}` },
      });
      await tx.stockTransaction.create({
        data: {
          stockItemId: previous.stockItemId,
          transactionType: 'adjustment',
          quantity: previous.quantity,
          balanceAfter: previousBalance,
          reference: encounterId,
          departmentId: previous.departmentId,
          batchAllocations: previous.batchAllocations as any,
          notes: `Consumable use edit reversal: ${previous.id}`,
          performedBy: actorId,
        },
      });

      return tx.stockTransaction.create({
        data: {
          stockItemId,
          transactionType: 'sale',
          quantity,
          balanceAfter: consumed.balanceAfter,
          reference: encounterId,
          departmentId: actor.departmentId,
          batchAllocations: consumed.allocations as any,
          notes: `Consumable use: ${notes?.trim() || 'Used during encounter'}`,
          performedBy: actorId,
        },
        include: { StockItem: { select: { id: true, name: true, unitOfMeasure: true } } },
      });
    });
  }

  async deleteConsumableUse(encounterId: string, transactionId: string, userId: string) {
    const actorId = await this.requireActorId(userId);
    await this.requireEncounterId(encounterId);

    return this.prisma.$transaction(async (tx) => {
      const use = await tx.stockTransaction.findFirst({
        where: {
          id: transactionId,
          reference: encounterId,
          notes: { startsWith: 'Consumable use:' },
          NOT: [
            { notes: { startsWith: 'Consumable use: [EDITED]' } },
            { notes: { startsWith: 'Consumable use: [DELETED]' } },
          ],
        },
      });
      if (!use) throw new NotFoundError('Consumable use', transactionId);
      const claimed = await tx.stockTransaction.updateMany({
        where: {
          id: use.id,
          reference: encounterId,
          notes: { startsWith: 'Consumable use:' },
          NOT: [
            { notes: { startsWith: 'Consumable use: [EDITED]' } },
            { notes: { startsWith: 'Consumable use: [DELETED]' } },
          ],
        },
        data: { notes: `Consumable use deletion in progress: ${use.id}` },
      });
      if (claimed.count !== 1) throw new ConflictError('This consumable use has already been changed');
      const actor = await tx.user.findUnique({ where: { id: actorId }, select: { departmentId: true, role: true } });
      if (!actor) throw new UnauthorizedError('Active user could not be verified');
      if (!['admin', 'super_admin'].includes(String(actor.role).toLowerCase()) && use.departmentId !== actor.departmentId) throw new ValidationError('You can only delete consumable use recorded by your own department');
      const restoredBalance = await this.restoreConsumableStock(tx, use.stockItemId, use.quantity, use.departmentId, use.batchAllocations);
      await tx.stockTransaction.update({
        where: { id: use.id },
        data: { notes: `Consumable use: [DELETED] ${use.notes?.replace(/^Consumable use:\s*/, '') || ''}` },
      });
      return tx.stockTransaction.create({
        data: {
          stockItemId: use.stockItemId,
          transactionType: 'adjustment',
          quantity: use.quantity,
          balanceAfter: restoredBalance,
          reference: encounterId,
          departmentId: use.departmentId,
          batchAllocations: use.batchAllocations as any,
          notes: `Consumable use deletion reversal: ${use.id}`,
          performedBy: actorId,
        },
      });
    });
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
      data: activeAttendances.map((a: any) => ({ bed: a.Bed?.bedNumber, ward: a.Bed?.Ward?.wardName, patient: `${a.Patient.surname} ${a.Patient.otherNames}` })),
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
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    const activeAttendances = await this.getModel().findMany({
      where: { OR: [{ status: 'admitted' }, { status: 'pending', dateTime: { gte: daysAgo(WORKLIST_OPEN_DAYS) } }], encounterCategory: { in: ['opd', 'ipd', 'daycase'] } },
      include: { Patient: { select: { id: true, surname: true, otherNames: true, dateOfBirth: true, gender: true, folderNumber: true }}, Bed: { include: { Ward: true }}, Vitals: { orderBy: { recordedAt: 'desc' }, take: 1 } },
      orderBy: { dateTime: 'asc' }
    });

    const processedItems = activeAttendances.map((attendance: any) => {
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
    return { total: processedItems.length, pending: processedItems.filter((i: any) => !i.hasVitalsToday).length, recent: processedItems.filter((i: any) => i.hasVitalsToday).length, data: processedItems };
  }

  async getMedicalWorklist(): Promise<any> {
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    const activeAttendances = await this.getModel().findMany({
      where: { OR: [{ status: 'admitted' }, { status: 'pending', dateTime: { gte: daysAgo(WORKLIST_OPEN_DAYS) } }], encounterCategory: { in: ['opd', 'ipd', 'daycase'] } },
      include: { Patient: { select: { id: true, surname: true, otherNames: true, dateOfBirth: true, gender: true, folderNumber: true } }, Bed: { include: { Ward: true } }, Vitals: { where: { recordedAt: { gte: today } }, orderBy: { recordedAt: 'desc' }, take: 1 }, AttendanceDiagnosis: { take: 1 } },
      orderBy: { dateTime: 'asc' }
    });

    const processedItems = activeAttendances.map((attendance: any) => {
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
    return { total: processedItems.length, pending: processedItems.filter((i: any) => i.status === 'pending_doctor').length, reviewed: processedItems.filter((i: any) => i.hasMedicalNotesToday).length, data: processedItems };
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
    return { total: processedItems.length, pending: processedItems.filter((i: any) => i.hasPendingTests).length, completed: processedItems.filter((i: any) => i.hasResults).length, inProgress: processedItems.filter((i: any) => i.inProgressCount > 0).length, data: processedItems };
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
    return { total: processedItems.length, pending: processedItems.filter((i: any) => i.hasPendingPrescriptions).length, dispensed: processedItems.filter((i: any) => i.hasBeenDispensed).length, data: processedItems };
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
    return { total: processedItems.length, pending: processedItems.filter((i: any) => i.hasPendingScans).length, completed: processedItems.filter((i: any) => i.hasResults).length, inProgress: processedItems.filter((i: any) => i.inProgressCount > 0).length, data: processedItems };
  }

  async getProceduresWorklist(): Promise<any> {
    const allProcedures = await this.prisma.procedure.findMany({
      where: { OR: [{ status: { in: ['scheduled', 'in_progress'] }, createdAt: { gte: daysAgo(WORKLIST_OPEN_DAYS) } }, { status: 'completed', updatedAt: { gte: hoursAgo(WORKLIST_DONE_HOURS) } }] },
      include: { Attendance: { include: { Patient: { select: { id: true, surname: true, otherNames: true, dateOfBirth: true, gender: true, folderNumber: true } }, Bed: { include: { Ward: true } } } }, ProcedureTemplate: true, User_Procedure_performedByIdToUser: { select: { fullName: true } } }, orderBy: { scheduledDate: 'asc' }
    });
    const groupedByAttendance = new Map<string, any>();
    for (const procedure of allProcedures) {
      const attendanceId = procedure.attendanceId;
      if (!groupedByAttendance.has(attendanceId)) {
        groupedByAttendance.set(attendanceId, { attendanceId: procedure.attendanceId, patientId: procedure.Attendance.patientId, patient: { name: `${procedure.Attendance.Patient.surname} ${procedure.Attendance.Patient.otherNames || ''}`.trim(), age: this.calculateAge(procedure.Attendance.Patient.dateOfBirth), gender: procedure.Attendance.Patient.gender, folderNumber: procedure.Attendance.Patient.folderNumber }, location: procedure.Attendance.Bed ? { ward: procedure.Attendance.Bed.Ward?.wardName, bed: procedure.Attendance.Bed.bedNumber } : undefined, procedures: [], scheduledCount: 0, inProgressCount: 0, completedCount: 0, earliestScheduledDate: null });
      }
      const group = groupedByAttendance.get(attendanceId)!; group.procedures.push(procedure);
      if (procedure.status === 'scheduled') group.scheduledCount++; else if (procedure.status === 'in_progress') group.inProgressCount++; else if (procedure.status === 'completed') group.completedCount++;
      if (procedure.scheduledDate && (!group.earliestScheduledDate || new Date(procedure.scheduledDate) < new Date(group.earliestScheduledDate))) group.earliestScheduledDate = procedure.scheduledDate;
    }
    const processedItems: any[] = [];
    for (const group of groupedByAttendance.values()) {
      const hasPendingProcedures = group.scheduledCount > 0 || group.inProgressCount > 0;
      const hasBeenPerformed = group.completedCount > 0 && group.scheduledCount === 0 && group.inProgressCount === 0;
      let waitTime = 0; let priority: 'routine' | 'urgent' | 'stat' = 'routine';
      if (hasPendingProcedures && group.earliestScheduledDate) {
        const minutesUntilScheduled = Math.floor((new Date(group.earliestScheduledDate).getTime() - Date.now()) / 60000);
        waitTime = Math.max(0, minutesUntilScheduled);
        if (minutesUntilScheduled < 0) { const overdueHours = Math.abs(minutesUntilScheduled) / 60; if (overdueHours > 24) priority = 'stat'; else if (overdueHours > 12) priority = 'urgent'; }
        else { const waitHours = minutesUntilScheduled / 60; if (waitHours < 1) priority = 'stat'; else if (waitHours < 6) priority = 'urgent'; }
      }
      processedItems.push({ id: group.attendanceId, patientId: group.patientId, attendanceId: group.attendanceId, patient: group.patient, location: group.location, procedureCount: group.procedures.length, scheduledCount: group.scheduledCount, inProgressCount: group.inProgressCount, completedCount: group.completedCount, hasPendingProcedures, hasBeenPerformed, earliestScheduledDate: group.earliestScheduledDate, procedureNames: group.procedures.map((p: any) => p.ProcedureTemplate?.name || 'Unknown').join(', '), waitTime, priority, status: hasBeenPerformed ? 'completed' : (group.inProgressCount > 0 ? 'in_progress' : 'scheduled'), encounterCategory: 'ipd' });
    }
    return { total: processedItems.length, scheduled: processedItems.filter((i: any) => i.status === 'scheduled').length, inProgress: processedItems.filter((i: any) => i.status === 'in_progress').length, completed: processedItems.filter((i: any) => i.status === 'completed').length, data: processedItems };
  }

  async getMaternalWorklist(): Promise<any> {
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    const maternalAttendances = await this.getModel().findMany({
      where: { attendanceType: { in: ['antenatal', 'delivery', 'postnatal'] }, OR: [{ status: 'admitted' }, { status: 'pending', dateTime: { gte: daysAgo(WORKLIST_OPEN_DAYS) } }] },
      include: { Patient: { select: { id: true, surname: true, otherNames: true, dateOfBirth: true, gender: true, folderNumber: true }}, Bed: { include: { Ward: true }}, Vitals: { orderBy: { recordedAt: 'desc' }, take: 1 }, antenatalBookings: true, currentAntenatalBookings: true, antenatalVisits: { orderBy: { visitDate: 'desc' }, take: 1 }, deliveryRecords: { orderBy: { deliveryDate: 'desc' }, take: 1 }, postnatalRecords: { orderBy: { examinationDate: 'desc' }, take: 1 } },
      orderBy: { dateTime: 'asc' }
    });
    const processedItems = maternalAttendances.map((attendance: any) => {
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
    return { total: processedItems.length, pending: processedItems.filter((i: any) => !i.hasBeenAttended).length, recent: processedItems.filter((i: any) => i.hasBeenAttended).length, data: processedItems };
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