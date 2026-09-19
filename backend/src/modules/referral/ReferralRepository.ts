import { PrismaClient, ReferralStatus } from '@prisma/client';
import { BaseRepository } from '../../shared/base/BaseRepository';
import { CreateOutgoingReferralDTO, CreateIncomingReferralDTO, ReferralFilters } from './ReferralTypes';
import { getCounterService } from '../../services/CounterService';

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

    const data = referrals.map(ref => ({
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
        referralNotes: data.referralNotes, status: 'pending', createdById
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
        referralNotes: data.referralNotes, status: 'pending', createdById
      },
      include: { patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true } }, createdBy: { select: { fullName: true, role: true } } }
    });
  }

  async updateStatus(id: string, status: ReferralStatus, notes?: any) {
    const updateData: any = { status };
    if (status === 'accepted' && notes?.acceptanceNotes) { updateData.acceptanceNotes = notes.acceptanceNotes; updateData.acceptedAt = new Date(); }
    else if (status === 'rejected' && notes?.rejectedReason) { updateData.rejectedReason = notes.rejectedReason; updateData.rejectedAt = new Date(); }
    else if (status === 'completed') { updateData.completedAt = new Date(); }
    if (notes?.outcomeNotes) updateData.outcomeNotes = notes.outcomeNotes;

    return this.getModel().update({ where: { id }, data: updateData, include: { patient: { select: { id: true, surname: true, otherNames: true } } } });
  }

  async findByPatient(patientId: string) {
    return this.getModel().findMany({
      where: { patientId },
      include: { patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true } }, attendance: { select: { id: true, attendanceNumber: true, dateTime: true } } },
      orderBy: { referralDate: 'desc' }
    });
  }

  // ✅ Optimized Stats Methods
  async getStats() {
    const [total, pending, accepted, cancelled, completed, urgent] = await Promise.all([
      this.getModel().count(),
      this.getModel().count({ where: { status: 'pending' } }),
      this.getModel().count({ where: { status: 'accepted' } }),
      this.getModel().count({ where: { status: 'cancelled' } }),
      this.getModel().count({ where: { status: 'completed' } }),
      this.getModel().count({ where: { urgency: { in: ['urgent', 'stat'] } } })
    ]);
    return { total, pending, accepted, cancelled, completed, urgent };
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