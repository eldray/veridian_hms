import { Prisma, PrismaClient, ReferralStatus } from '@prisma/client';
import { BaseRepository } from '../../shared/base/BaseRepository';
import { ConflictError, NotFoundError, ValidationError } from '../../utils/errors';
import {
  CreateOutgoingReferralDTO,
  CreateIncomingReferralDTO,
  ReferralFilters,
  ReferralPartII,
  ReferralStructuredForm,
  PART_II_KEYS,
} from './ReferralTypes';
import { getCounterService } from '../../services/CounterService';

/** Only declared Part II keys may be merged into a stored structured form. */
function cleanPartII(raw: unknown): Partial<ReferralPartII> {
  if (raw == null) return {};
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ValidationError('partII must be an object');
  }
  const source = raw as Record<string, unknown>;
  const clean: Partial<ReferralPartII> = {};
  for (const key of PART_II_KEYS) {
    const value = source[key];
    if (value == null) continue;
    if (typeof value !== 'string' && typeof value !== 'number') {
      throw new ValidationError(`partII.${key} must be text`);
    }
    clean[key] = String(value).trim();
  }
  return clean;
}

export class ReferralRepository extends BaseRepository<any, any, any> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'referralRecord');
  }

  async findAll(filters: ReferralFilters) {
    const {
      referralType, status, patientId, patientPaymentMode,
      corporateAccountId, insuranceProviderId, dateFrom, dateTo,
      page = 1, limit = 1000
    } = filters;

    const where: any = {};
    if (referralType) where.referralType = referralType;
    if (status) where.status = status;
    if (patientId) where.patientId = patientId;
    
    if (patientPaymentMode) where.patient = { paymentMode: patientPaymentMode };
    
    // ✅ FIXED: Filter by Attendance's corporateAccountId, NOT Patient's insuranceProviderId
    if (corporateAccountId) {
      where.attendance = { corporateAccountId };
    }
    
    if (insuranceProviderId) {
      where.attendance = { ...where.attendance, insuranceProviderId };
    }

    if (dateFrom || dateTo) {
      where.referralDate = {};
      if (dateFrom) where.referralDate.gte = new Date(dateFrom);
      if (dateTo) where.referralDate.lte = new Date(dateTo);
    }

    const pageNum = Math.max(1, page);
    const limitNum = Math.min(100, Math.max(1, limit));
    const skip = (pageNum - 1) * limitNum;

    const [referrals, total] = await Promise.all([
      this.getModel().findMany({
        where,
        include: {
          patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true, contact: true, dateOfBirth: true, gender: true, paymentMode: true, nhisNumber: true, insuranceProviderId: true } },
          attendance: { select: { id: true, attendanceNumber: true, dateTime: true, attendanceType: true, encounterCategory: true, paymentMode: true, InsuranceProvider: { select: { id: true, name: true, type: true } }, CorporateAccount: { select: { id: true, companyName: true } } } },
          createdBy: { select: { id: true, fullName: true, username: true, role: true } }
        },
        orderBy: { referralDate: 'desc' },
        skip, take: limitNum
      }),
      this.getModel().count({ where })
    ]);

    const data = referrals.map((ref: any) => ({
      ...ref,
      patient: ref.patient ? { ...ref.patient, fullName: `${ref.patient.surname} ${ref.patient.otherNames}`.trim() } : null
    }));

    return {
      data,
      pagination: {
        page: pageNum, limit: limitNum, total,
        totalPages: Math.ceil(total / limitNum) // ✅ Aligned with BaseController
      }
    };
  }

  async findById(id: string) {
    const referral = await this.getModel().findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true, contact: true, address: true, dateOfBirth: true, gender: true, paymentMode: true, nhisNumber: true, insuranceProviderId: true, InsuranceProvider: { select: { id: true, name: true, type: true } } } },
        attendance: { select: { id: true, attendanceNumber: true, dateTime: true, attendanceType: true, encounterCategory: true, paymentMode: true, nhisCCC: true, InsuranceProvider: { select: { id: true, name: true, type: true } }, CorporateAccount: { select: { id: true, companyName: true } }, AttendanceDiagnosis: { include: { Diagnosis: { select: { name: true, icdCode: true, morbidityGroup: true } } } }, Vitals: { orderBy: { recordedAt: 'desc' }, take: 1 } } },
        createdBy: { select: { id: true, fullName: true, role: true } }
      }
    });

    // ✅ Throw 404 error so BaseController handles it correctly
    if (!referral) {
      const err = new Error('Referral not found') as any;
      err.status = 404;
      throw err;
    }

    return {
      ...referral,
      patient: referral.patient ? { ...referral.patient, fullName: `${referral.patient.surname} ${referral.patient.otherNames}`.trim() } : null
    };
  }

  async createOutgoing(data: CreateOutgoingReferralDTO, createdById: string) {
    return this.getModel().create({
      data: {
        referralNumber: getCounterService().nextReferralNumber(),
        patientId: data.patientId, attendanceId: data.attendanceId,
        referralType: 'outgoing', referralReason: data.referralReason,
        referredToFacility: data.referredToFacility, referredToDoctor: data.referredToDoctor,
        referredToDepartment: data.referredToDepartment, urgency: data.urgency || 'routine',
        referralNotes: data.referralNotes, status: 'pending', createdById,
        structuredForm: (data.structuredForm as Prisma.InputJsonValue) ?? Prisma.JsonNull
      },
      include: { patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true } }, createdBy: { select: { fullName: true, role: true } } }
    });
  }

  async createIncoming(data: CreateIncomingReferralDTO, createdById: string) {
    return this.getModel().create({
      data: {
        referralNumber: getCounterService().nextReferralNumber(),
        patientId: data.patientId, referralType: 'incoming',
        referralReason: data.referralReason, referredFromFacility: data.referredFromFacility,
        referredFromDoctor: data.referredFromDoctor, urgency: data.urgency || 'routine',
        referralNotes: data.referralNotes, status: 'pending', createdById,
        structuredForm: (data.structuredForm as Prisma.InputJsonValue) ?? Prisma.JsonNull
      },
      include: { patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true } }, createdBy: { select: { fullName: true, role: true } } }
    });
  }

  async updateStatus(id: string, status: ReferralStatus, notes?: any) {
    const model = this.getModel();
    const current = await model.findUnique({
      where: { id },
      select: { id: true, status: true, referralType: true, structuredForm: true },
    });
    if (!current) throw new NotFoundError('Referral', id);

    const allowedTransitions: Record<string, ReferralStatus[]> = {
      pending: ['accepted', 'cancelled'],
      accepted: ['completed'],
      completed: [],
      cancelled: [],
    };
    if (!allowedTransitions[current.status]?.includes(status)) {
      throw new ConflictError(
        current.status === status
          ? `Referral is already ${status}`
          : `Referral cannot transition from ${current.status} to ${status}`,
      );
    }

    // Accepting an outgoing referral is where the receiving clinician's report back is
    // captured, so Part II lands on the same record the referral was raised from.
    const partII = status === 'accepted' ? cleanPartII(notes?.partII) : {};
    if (status === 'accepted' && current.referralType === 'outgoing') {
      if (!partII.findings?.trim()) throw new ValidationError('Part II findings are required when accepting a referral');
      if (!partII.receiverName?.trim()) throw new ValidationError('Part II must name the clinician reporting back');
    }

    const updateData: any = { status };
    if (Object.keys(partII).length > 0) {
      const existing = (current.structuredForm ?? {}) as ReferralStructuredForm;
      updateData.structuredForm = {
        ...(existing as any),
        partII: { ...(existing.partII ?? {}), ...partII },
      } as Prisma.InputJsonValue;
    }
    if (status === 'accepted' && notes?.acceptanceNotes) {
      updateData.outcomeNotes = notes.acceptanceNotes;
    } else if (status === 'cancelled' && (notes?.cancellationReason || notes?.rejectedReason)) {
      updateData.outcomeNotes = notes.cancellationReason || notes.rejectedReason;
    } else if (status === 'completed') {
      updateData.completedAt = new Date();
    }
    if (notes?.outcomeNotes) updateData.outcomeNotes = notes.outcomeNotes;

    // Guard the write against a concurrent status change after the initial read.
    const updated = await model.updateMany({
      where: { id, status: current.status },
      data: updateData,
    });
    if (updated.count !== 1) {
      throw new ConflictError('Referral status changed; refresh and try again');
    }

    return model.findUnique({
      where: { id },
      include: { patient: { select: { id: true, surname: true, otherNames: true } } },
    });
  }

  async findByPatient(patientId: string) {
    return this.getModel().findMany({
      where: { patientId },
      include: { patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true } }, attendance: { select: { id: true, attendanceNumber: true, dateTime: true } } },
      orderBy: { referralDate: 'desc' }
    });
  }

  // One grouped query per axis instead of six count queries, and the breakdowns are returned
  // in the shape the referrals page tiles read (byType / byStatus).
  async getStats() {
    const [byStatus, byType, byUrgency] = await Promise.all([
      this.getModel().groupBy({ by: ['status'], _count: { _all: true } }),
      this.getModel().groupBy({ by: ['referralType'], _count: { _all: true } }),
      this.getModel().groupBy({ by: ['urgency'], _count: { _all: true } }),
    ]);

    type GroupRow = { status?: string; referralType?: string; urgency?: string; _count?: { _all?: number } };
    const all = (rows: GroupRow[]) =>
      rows.reduce((sum, row) => sum + (row._count?._all ?? 0), 0);
    const statusCount = (status: string) =>
      (byStatus as GroupRow[]).find(row => row.status === status)?._count?._all ?? 0;

    const total = all(byStatus as GroupRow[]);
    const urgent = all((byUrgency as GroupRow[]).filter(row => row.urgency === 'urgent' || row.urgency === 'stat'));

    return {
      total,
      totalReferrals: total,
      pending: statusCount('pending'),
      accepted: statusCount('accepted'),
      cancelled: statusCount('cancelled'),
      completed: statusCount('completed'),
      urgent,
      byStatus: (byStatus as GroupRow[]).map(row => ({ status: row.status, _count: row._count?._all ?? 0 })),
      byType: (byType as GroupRow[]).map(row => ({ referralType: row.referralType, _count: row._count?._all ?? 0 })),
    };
  }

  async getPendingCount() {
    return this.getModel().count({ where: { status: 'pending' } });
  }

  async getUrgentList(limit: number = 10) {
    return this.getModel().findMany({
      where: { status: 'pending', urgency: { in: ['urgent', 'stat'] } },
      orderBy: { referralDate: 'desc' },
      take: limit,
      select: { id: true, referralNumber: true, patient: { select: { surname: true, otherNames: true } }, urgency: true, referralDate: true }
    });
  }
}