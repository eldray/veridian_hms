import { PrismaClient } from '@prisma/client';
import { BaseRepository } from '../../shared/base/BaseRepository';
import {
  CreateAntenatalBookingInput, UpdateAntenatalBookingInput,
  CreateANCVisitInput, UpdateANCVisitInput,
  CreateDeliveryRecordInput, CreatePostnatalRecordInput,
  AntenatalBookingFilters, DeliveryRecordFilters, PostnatalRecordFilters
} from './AntenatalTypes';

export class AntenatalRepository extends BaseRepository<any, any, any> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'antenatalBooking');
  }

  // ===================== ANTENATAL BOOKING =====================
  async createBooking(data: CreateAntenatalBookingInput): Promise<any> {
    const lmp = new Date(data.lmp);
    const edd = this.calculateEDD(lmp);
    
    return this.getModel().create({
      data: {
        patientId: data.patientId, attendanceId: data.attendanceId, currentAttendanceId: data.attendanceId,
        bookingDate: new Date(), lmp, edd, gravida: data.gravida, para: data.para,
        gestationalAgeWeeks: data.gestationalAgeWeeks, riskLevel: data.riskLevel || 'low',
        riskFactors: data.riskFactors || [], bloodGroup: data.bloodGroup, hivStatus: data.hivStatus,
        hbLevel: data.hbLevel, vdrl: data.vdrl, isActive: true, isCompleted: false,
        createdById: data.createdById, iptpDoses: {}, ttDoses: {}
      },
      include: { patient: true }
    });
  }

  async getBookingById(id: string): Promise<any | null> {
    return this.getModel().findUnique({ where: { id }, include: { patient: true, visits: { orderBy: { visitNumber: 'asc' } } } });
  }

  async getBookingByAttendanceId(attendanceId: string): Promise<any | null> {
    return this.getModel().findFirst({ where: { attendanceId }, include: { patient: true, visits: { orderBy: { visitNumber: 'asc' } } } });
  }

  async getActiveBookingByPatientId(patientId: string): Promise<any | null> {
    let booking = await this.getModel().findFirst({
      where: { patientId, isActive: true, isCompleted: false },
      include: { patient: true, visits: { orderBy: { visitNumber: 'asc' } } }
    });

    if (!booking) {
      booking = await this.getModel().findFirst({
        where: { patientId }, orderBy: { bookingDate: 'desc' },
        include: { patient: true, visits: { orderBy: { visitNumber: 'asc' } } }
      });
    }
    return booking;
  }

  async getAllBookings(filters: AntenatalBookingFilters): Promise<{ bookings: any[]; total: number }> {
    const { isActive, patientId, page = 1, limit = 1000 } = filters;
    const where: any = {};
    if (isActive !== undefined) where.isActive = isActive;
    if (patientId) where.patientId = patientId;

    return this.findManyWithPagination({
      where, page, limit: Math.min(limit, 1000), orderBy: { bookingDate: 'desc' },
      include: { patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true, contact: true } }, _count: { select: { visits: true } } }
    }).then(res => ({ bookings: res.data, total: res.total }));
  }

  async updateBooking(id: string, data: UpdateAntenatalBookingInput): Promise<any> {
    return this.getModel().update({ where: { id }, data, include: { patient: true } });
  }

  async closeBooking(id: string, deliveryData: { deliveryDate?: Date; deliveryOutcome?: string; deliveryRecordId?: string }): Promise<any> {
    return this.getModel().update({
      where: { id },
      data: {
        isActive: false, isCompleted: true,
        deliveryDate: deliveryData.deliveryDate || new Date(),
        deliveryOutcome: deliveryData.deliveryOutcome || 'delivered',
        deliveryRecordId: deliveryData.deliveryRecordId, updatedAt: new Date()
      },
      include: { patient: true }
    });
  }

  async deleteBooking(id: string): Promise<void> {
    await this.getModel().delete({ where: { id } });
  }

  // ===================== ANC VISITS =====================
  async createVisit(data: CreateANCVisitInput): Promise<any> {
    return this.prisma.aNCVisit.create({
      data: {
        bookingId: data.bookingId, attendanceId: data.attendanceId, visitNumber: data.visitNumber, visitDate: data.visitDate,
        gestationalAgeWeeks: data.gestationalAgeWeeks, weight: data.weight, bloodPressure: data.bloodPressure,
        fundalHeight: data.fundalHeight, fetalHeartRate: data.fetalHeartRate, fetalMovements: data.fetalMovements,
        presentation: data.presentation, iptpGiven: data.iptpGiven || false, iptpDoseNumber: data.iptpDoseNumber,
        iptpDrug: data.iptpDrug, ttGiven: data.ttGiven || false, ttDoseNumber: data.ttDoseNumber,
        ironGiven: data.ironGiven || false, folateGiven: data.folateGiven || false, calciumGiven: data.calciumGiven || false,
        malariaTestDone: data.malariaTestDone || false, malariaTestResult: data.malariaTestResult,
        malariaTreatmentGiven: data.malariaTreatmentGiven || false, dangerSignsPresent: data.dangerSignsPresent || false,
        dangerSignsList: data.dangerSignsList || [], referralMade: data.referralMade || false, referredTo: data.referredTo,
        nextVisitDate: data.nextVisitDate, returnInstructions: data.returnInstructions, recordedById: data.recordedById
      },
      include: { recordedBy: { select: { fullName: true, role: true } } }
    });
  }

  async getVisitsByBookingId(bookingId: string): Promise<any[]> {
    return this.prisma.aNCVisit.findMany({
      where: { bookingId }, orderBy: { visitNumber: 'asc' },
      include: { recordedBy: { select: { fullName: true, role: true } }, booking: { include: { patient: true } } }
    });
  }

  async getVisitById(id: string): Promise<any | null> {
    return this.prisma.aNCVisit.findUnique({ where: { id }, include: { booking: { include: { patient: true } }, recordedBy: { select: { fullName: true, role: true } } } });
  }

  async updateVisit(id: string, data: UpdateANCVisitInput): Promise<any> {
    return this.prisma.aNCVisit.update({ where: { id }, data, include: { recordedBy: { select: { fullName: true, role: true } } } });
  }

  async deleteVisit(id: string): Promise<void> {
    await this.prisma.aNCVisit.delete({ where: { id } });
  }

  // ===================== DELIVERY RECORDS =====================
  async createDeliveryRecord(data: CreateDeliveryRecordInput): Promise<any> {
    return this.prisma.deliveryRecord.create({
      data: {
        patientId: data.patientId, attendanceId: data.attendanceId, antenatalBookingId: data.antenatalBookingId,
        deliveryDate: data.deliveryDate, deliveryType: data.deliveryType, deliveryOutcome: data.deliveryOutcome,
        placeOfDelivery: data.placeOfDelivery || 'private_hospital', attendant: data.attendant, birthWeight: data.birthWeight,
        gestationWeeks: data.gestationWeeks, apgarScore1min: data.apgarScore1min, apgarScore5min: data.apgarScore5min,
        resusCitationDone: data.resusCitationDone || false, maternalOutcome: data.maternalOutcome || 'alive',
        complications: data.complications || [], notes: data.notes, malePartnerPresentANC: data.malePartnerPresentANC || false,
        malePartnerPresentDelivery: data.malePartnerPresentDelivery || false, malePartnerPresentPNC: data.malePartnerPresentPNC || false,
        maternalDeathsAudited: data.maternalDeathsAudited || false, auditNotes: data.auditNotes, createdById: data.createdById
      },
      include: { patient: true, attendance: true, Newborn: true }
    });
  }

  async getDeliveryRecords(filters: DeliveryRecordFilters): Promise<{ records: any[]; total: number }> {
    const { patientId, startDate, endDate, page = 1, limit = 1000 } = filters;
    const where: any = {};
    if (patientId) where.patientId = patientId;
    if (startDate || endDate) {
      where.deliveryDate = {};
      if (startDate) where.deliveryDate.gte = startDate;
      if (endDate) where.deliveryDate.lte = endDate;
    }

    const [records, total] = await Promise.all([
      this.prisma.deliveryRecord.findMany({
        where, orderBy: { deliveryDate: 'desc' }, skip: (page - 1) * limit, take: limit,
        include: {
          patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true } },
          attendance: { select: { attendanceNumber: true, dateTime: true } },
          Newborn: true, antenatalBooking: { select: { id: true, gravida: true, para: true } }
        }
      }),
      this.prisma.deliveryRecord.count({ where })
    ]);
    return { records, total };
  }

  async getDeliveryRecordById(id: string): Promise<any | null> {
    return this.prisma.deliveryRecord.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true } },
        attendance: { select: { attendanceNumber: true, dateTime: true } },
        Newborn: true, antenatalBooking: { select: { id: true, gravida: true, para: true, edd: true } }
      }
    });
  }

  async updateDeliveryRecord(id: string, data: any): Promise<any> {
    const { attendanceId, patientId, Newborn, ...updateData } = data;
    const updatePayload: any = { ...updateData };
    
    // ✅ PRESERVED: Your exact logic for handling multiple births
    if (Newborn && Newborn.create && Newborn.create.length > 0) {
      updatePayload.Newborn = {
        deleteMany: {},
        create: Newborn.create.map((baby: any) => ({
          order: baby.order, birthWeight: baby.birthWeight, gender: baby.gender,
          apgarScore1min: baby.apgarScore1min, apgarScore5min: baby.apgarScore5min,
          resuscitation: baby.resuscitation, outcome: baby.outcome, anomalies: baby.anomalies || [],
          referredTo: baby.referredTo, breastfeedingWithin30Min: baby.breastfeedingWithin30Min,
          eyeProphylaxisGiven: baby.eyeProphylaxisGiven, cordCareMethod: baby.cordCareMethod,
          babyWeightAt6to10Days: baby.babyWeightAt6to10Days, weightAt6to10DaysDate: baby.weightAt6to10DaysDate
        }))
      };
    } else if (Array.isArray(Newborn)) {
      // ✅ PRODUCTION SAFEGUARD: Fallback if frontend sends an array directly
      updatePayload.Newborn = { deleteMany: {}, create: Newborn };
    }
    
    return this.prisma.deliveryRecord.update({ where: { id }, data: updatePayload, include: { Newborn: true } });
  }

  async deleteDeliveryRecord(id: string): Promise<void> {
    await this.prisma.deliveryRecord.delete({ where: { id } });
  }

  // ===================== POSTNATAL RECORDS =====================
  async createPostnatalRecord(data: CreatePostnatalRecordInput): Promise<any> {
    return this.prisma.postnatalRecord.create({
      data: {
        patientId: data.patientId, attendanceId: data.attendanceId, antenatalBookingId: data.antenatalBookingId,
        deliveryRecordId: data.deliveryRecordId, examinationDate: data.examinationDate, dayNumber: data.dayNumber || 1,
        maternalCondition: data.maternalCondition, breastfeedingStatus: data.breastfeedingStatus, babyCondition: data.babyCondition,
        familyPlanningDiscussed: data.familyPlanningDiscussed || false, familyPlanningMethodAccepted: data.familyPlanningMethodAccepted,
        notes: data.notes, createdById: data.createdById, maternalComplications: [], babyDangerSigns: []
      },
      include: { patient: true, deliveryRecord: true }
    });
  }

  async getPostnatalRecords(filters: PostnatalRecordFilters): Promise<{ records: any[]; total: number }> {
    const { patientId, page = 1, limit = 1000 } = filters;
    const where: any = {};
    if (patientId) where.patientId = patientId;

    const [records, total] = await Promise.all([
      this.prisma.postnatalRecord.findMany({
        where, orderBy: { examinationDate: 'desc' }, skip: (page - 1) * limit, take: limit,
        include: { patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true } }, deliveryRecord: true }
      }),
      this.prisma.postnatalRecord.count({ where })
    ]);
    return { records, total };
  }

  async getPostnatalRecordById(id: string): Promise<any | null> {
    return this.prisma.postnatalRecord.findUnique({ where: { id }, include: { patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true } }, deliveryRecord: true } });
  }

  async updatePostnatalRecord(id: string, data: any): Promise<any> {
    return this.prisma.postnatalRecord.update({ where: { id }, data });
  }

  async deletePostnatalRecord(id: string): Promise<void> {
    await this.prisma.postnatalRecord.delete({ where: { id } });
  }

  // ===================== STATISTICS =====================
  async getANCStatistics(startDate?: Date, endDate?: Date): Promise<any> {
    const where: any = {};
    if (startDate || endDate) { where.bookingDate = {}; if (startDate) where.bookingDate.gte = startDate; if (endDate) where.bookingDate.lte = endDate; }
    const visitWhere: any = {};
    if (startDate || endDate) { visitWhere.visitDate = {}; if (startDate) visitWhere.visitDate.gte = startDate; if (endDate) visitWhere.visitDate.lte = endDate; }

    const [totalBookings, activeBookings, highRiskBookings, totalVisits, iptpDosesGiven, ttDosesGiven] = await Promise.all([
      this.getModel().count({ where }), this.getModel().count({ where: { ...where, isActive: true } }),
      this.getModel().count({ where: { ...where, riskLevel: 'high' } }), this.prisma.aNCVisit.count({ where: visitWhere }),
      this.prisma.aNCVisit.count({ where: { ...visitWhere, iptpGiven: true } }), this.prisma.aNCVisit.count({ where: { ...visitWhere, ttGiven: true } })
    ]);

    return { totalBookings, activeBookings, highRiskBookings, totalVisits, iptpDosesGiven, ttDosesGiven, averageVisitsPerBooking: totalBookings > 0 ? totalVisits / totalBookings : 0 };
  }

  async getDeliveryStatistics(startDate?: Date, endDate?: Date): Promise<any> {
    const where: any = {};
    if (startDate || endDate) { where.deliveryDate = {}; if (startDate) where.deliveryDate.gte = startDate; if (endDate) where.deliveryDate.lte = endDate; }

    const [totalDeliveries, liveBirths, stillbirths, cesareanSections] = await Promise.all([
      this.prisma.deliveryRecord.count({ where }),
      this.prisma.deliveryRecord.count({ where: { ...where, deliveryOutcome: 'live_birth' } }),
      this.prisma.deliveryRecord.count({ where: { ...where, deliveryOutcome: { in: ['stillbirth_fresh', 'stillbirth_macerated'] } } }),
      this.prisma.deliveryRecord.count({ where: { ...where, deliveryType: 'caesarean_section' } })
    ]);
    return { totalDeliveries, liveBirths, stillbirths, cesareanSections };
  }

  async getPostnatalStatistics(startDate?: Date, endDate?: Date): Promise<any> {
    const where: any = {};
    if (startDate || endDate) { where.examinationDate = {}; if (startDate) where.examinationDate.gte = startDate; if (endDate) where.examinationDate.lte = endDate; }

    const [totalRecords, exclusiveBreastfeeding] = await Promise.all([
      this.prisma.postnatalRecord.count({ where }),
      this.prisma.postnatalRecord.count({ where: { ...where, breastfeedingStatus: 'exclusive' } })
    ]);
    return { totalRecords, exclusiveBreastfeeding };
  }

  private calculateEDD(lmp: Date): Date {
    const edd = new Date(lmp);
    edd.setDate(edd.getDate() + 280);
    return edd;
  }
}