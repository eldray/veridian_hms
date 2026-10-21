import { PrismaClient } from '@prisma/client';
import { BaseRepository } from '../../shared/base/BaseRepository';
import { ConflictError, NotFoundError, ValidationError } from '../../utils/errors';
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
    if (Number.isNaN(lmp.getTime())) throw new ValidationError('A valid last menstrual period (LMP) date is required');
    if (lmp.getTime() > Date.now()) throw new ValidationError('LMP cannot be in the future');
    if (!Number.isInteger(Number(data.gravida)) || Number(data.gravida) < 1) {
      throw new ValidationError('Gravida must be a whole number of at least 1 for a current pregnancy');
    }
    if (!Number.isInteger(Number(data.para)) || Number(data.para) < 0 || Number(data.para) > Number(data.gravida)) {
      throw new ValidationError('Para must be a whole number between 0 and gravida');
    }

    const attendance = await this.prisma.attendance.findUnique({
      where: { id: data.attendanceId },
      select: { id: true, patientId: true, attendanceType: true },
    });
    if (!attendance) throw new NotFoundError('Antenatal attendance', data.attendanceId);
    if (attendance.patientId !== data.patientId) {
      throw new ValidationError('Antenatal booking patient must match the selected attendance');
    }
    if (attendance.attendanceType !== 'antenatal') {
      throw new ValidationError('Antenatal booking must be linked to an antenatal attendance');
    }
    const activeBooking = await this.getModel().findFirst({
      where: { patientId: data.patientId, isActive: true, isCompleted: false },
      select: { id: true, attendanceId: true },
    });
    if (activeBooking) {
      throw new ConflictError('An active pregnancy booking already exists for this patient. Update that booking or close it before creating another.');
    }

    const edd = this.calculateEDD(lmp);
    const tt = Number(data.ttDosesGiven) || 0;
    const iptp = Number(data.iptpDosesGiven) || 0;
    if (!Number.isInteger(tt) || tt < 0 || tt > 5) throw new ValidationError('TT doses must be between 0 and 5');
    if (!Number.isInteger(iptp) || iptp < 0 || iptp > 5) throw new ValidationError('IPTp doses must be between 0 and 5');
    const prev = Array.isArray(data.previousComplications) ? data.previousComplications.join(', ') : data.previousComplications;
    const hb = data.hbLevel ?? (data.bookingHb != null && data.bookingHb !== ('' as any) ? Number(data.bookingHb) : undefined);
    const hbNum = hb != null && !Number.isNaN(Number(hb)) ? Number(hb) : undefined;
    if (hbNum != null && (hbNum <= 0 || hbNum > 25)) throw new ValidationError('Haemoglobin must be a valid value in g/dL');
    const numOrU = (v: any) => (v === '' || v == null || Number.isNaN(Number(v)) ? undefined : Number(v));
    const doseDates: any = {};
    // Never invent administration dates for historical doses. Save a date only when staff recorded it.
    for (let i = 1; i <= 5; i++) {
      const ttDate = (data as any)[`tt${i}Date`];
      const iptpDate = (data as any)[`iptp${i}Date`];
      if (ttDate) doseDates[`tt${i}Date`] = new Date(ttDate);
      if (iptpDate) doseDates[`iptp${i}Date`] = new Date(iptpDate);
    }

    return this.getModel().create({
      data: {
        patientId: data.patientId, attendanceId: data.attendanceId, currentAttendanceId: data.attendanceId,
        bookingDate: new Date(), lmp, edd, gravida: data.gravida, para: data.para,
        gestationalAgeWeeks: numOrU(data.gestationalAgeWeeks), gestationalAgeAtBooking: numOrU(data.gestationalAgeWeeks),
        riskLevel: data.riskLevel || 'low',
        riskFactors: data.riskFactors || [], bloodGroup: data.bloodGroup, hivStatus: data.hivStatus || undefined,
        hbLevel: hbNum, hbBooking: hbNum, anaemiaDiagnosed: hbNum != null && hbNum < 11,
        vdrl: data.vdrl || data.syphilisStatus || undefined,
        hepatitisBStatus: data.hepatitisBStatus || undefined,
        partnerHivStatus: data.partnerHIVStatus || undefined,
        hivKnownPositive: !!data.hivKnownPositive,
        malePartnerInvolved: !!data.malePartnerInvolved,
        bookingHeight: numOrU(data.bookingHeight), bookingWeight: numOrU(data.bookingWeight),
        bookingBP: data.bookingBP || undefined,
        previousCSection: !!data.previousCSection, previousComplications: prev || undefined,
        itnGiven: !!data.itnGiven, itnGivenDate: data.itnGiven ? new Date() : undefined,
        ironFolateGiven: !!(data.ironGiven || data.folateGiven),
        iptpDoses: { count: iptp }, ttDoses: { count: tt }, ...doseDates,
        isActive: true, isCompleted: false, createdById: data.createdById
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
    // This endpoint promises an active pregnancy. Returning the latest closed booking
    // here made completed pregnancies appear active in the maternal workflow.
    return this.getModel().findFirst({
      where: { patientId, isActive: true, isCompleted: false },
      orderBy: { bookingDate: 'desc' },
      include: { patient: true, visits: { orderBy: { visitNumber: 'asc' } } }
    });
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
    const allowed = ['gravida', 'para', 'lmp', 'edd', 'gestationalAgeWeeks', 'riskLevel', 'riskFactors', 'isActive', 'isCompleted', 'deliveryDate',
      'deliveryOutcome', 'deliveryRecordId', 'bloodGroup', 'hivStatus', 'hbLevel', 'vdrl', 'currentAttendanceId', 'malePartnerInvolved',
      'partnerHivStatus', 'hivKnownPositive', 'hepatitisBStatus', 'bookingHeight', 'bookingWeight', 'bookingBP', 'itnGiven',
      'ironFolateGiven', 'previousCSection'];
    const clean: any = {};
    for (const k of allowed) if ((data as any)[k] !== undefined) clean[k] = (data as any)[k];
    if (clean.lmp !== undefined) {
      const lmp = new Date(clean.lmp);
      if (Number.isNaN(lmp.getTime())) throw new ValidationError('A valid last menstrual period (LMP) date is required');
      if (lmp.getTime() > Date.now()) throw new ValidationError('LMP cannot be in the future');
      clean.lmp = lmp;
      clean.edd = this.calculateEDD(lmp);
    }
    if (clean.gravida !== undefined && (!Number.isInteger(Number(clean.gravida)) || Number(clean.gravida) < 1)) {
      throw new ValidationError('Gravida must be a whole number of at least 1 for a current pregnancy');
    }
    if (clean.para !== undefined && (!Number.isInteger(Number(clean.para)) || Number(clean.para) < 0)) {
      throw new ValidationError('Para must be a non-negative whole number');
    }
    if (clean.gravida !== undefined || clean.para !== undefined) {
      const existing = await this.getModel().findUnique({ where: { id }, select: { gravida: true, para: true } });
      if (!existing) throw new NotFoundError('Antenatal booking', id);
      const gravida = clean.gravida ?? existing.gravida;
      const para = clean.para ?? existing.para;
      if (para > gravida) throw new ValidationError('Para cannot exceed gravida');
    }
    if (clean.hbLevel != null) {
      if (!Number.isFinite(Number(clean.hbLevel)) || Number(clean.hbLevel) <= 0 || Number(clean.hbLevel) > 25) {
        throw new ValidationError('Haemoglobin must be a valid value in g/dL');
      }
      clean.hbBooking = clean.hbLevel;
      clean.anaemiaDiagnosed = Number(clean.hbLevel) < 11;
    }
    return this.getModel().update({ where: { id }, data: clean, include: { patient: true } });
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
  private mapNewborns(input: any): any[] {
    const list: any[] = Array.isArray(input) ? input : Array.isArray(input?.create) ? input.create : [];
    return list.map((b: any, i: number) => ({
      order: b.order ?? i + 1, birthWeight: Number(b.birthWeight) || 0, gender: b.gender || 'other',
      apgarScore1min: b.apgarScore1min ?? null, apgarScore5min: b.apgarScore5min ?? null,
      resuscitation: !!b.resuscitation, outcome: b.outcome || 'alive', anomalies: b.anomalies || [],
      referredTo: b.referredTo || null, breastfeedingWithin30Min: !!b.breastfeedingWithin30Min,
      eyeProphylaxisGiven: !!b.eyeProphylaxisGiven, cordCareMethod: b.cordCareMethod || 'dry_cord',
      babyWeightAt6to10Days: b.babyWeightAt6to10Days ?? null,
      weightAt6to10DaysDate: b.weightAt6to10DaysDate ? new Date(b.weightAt6to10DaysDate) : null
    }));
  }

  async createDeliveryRecord(data: CreateDeliveryRecordInput): Promise<any> {
    const babies = this.mapNewborns((data as any).Newborn);

    // The birth record and pregnancy closure must succeed or fail together.
    // Otherwise a failed booking update can leave a duplicate active pregnancy
    // after a delivery has already been recorded.
    return this.prisma.$transaction(async (tx) => {
      const attendance = await tx.attendance.findUnique({
        where: { id: data.attendanceId },
        select: { id: true, patientId: true },
      });
      if (!attendance) throw new NotFoundError('Delivery attendance', data.attendanceId);
      if (attendance.patientId !== data.patientId) {
        throw new ValidationError('Delivery patient must match the patient on the selected attendance');
      }

      let booking: any = null;
      if (data.antenatalBookingId) {
        booking = await tx.antenatalBooking.findUnique({ where: { id: data.antenatalBookingId } });
        if (!booking) throw new NotFoundError('Antenatal booking', data.antenatalBookingId);
        if (booking.patientId !== data.patientId) {
          throw new ValidationError('Antenatal booking must belong to the delivery patient');
        }
        if (booking.isCompleted) throw new ConflictError('This antenatal booking has already been completed');
      } else {
        booking = await tx.antenatalBooking.findFirst({
          where: { patientId: data.patientId, isActive: true, isCompleted: false },
          orderBy: { bookingDate: 'desc' },
        });
      }

      const record = await tx.deliveryRecord.create({
        data: {
          patientId: data.patientId, attendanceId: data.attendanceId, antenatalBookingId: booking?.id,
          deliveryDate: data.deliveryDate, deliveryType: data.deliveryType, deliveryOutcome: data.deliveryOutcome,
          placeOfDelivery: data.placeOfDelivery || 'private_hospital', attendant: data.attendant || 'not_recorded',
          gestationWeeks: data.gestationWeeks, apgarScore1min: data.apgarScore1min, apgarScore5min: data.apgarScore5min,
          resusCitationDone: data.resusCitationDone || false, maternalOutcome: data.maternalOutcome || 'alive',
          complications: data.complications || [], malePartnerPresentANC: data.malePartnerPresentANC || false,
          malePartnerPresentDelivery: data.malePartnerPresentDelivery || false, malePartnerPresentPNC: data.malePartnerPresentPNC || false,
          maternalDeathsAudited: data.maternalDeathsAudited || false, auditNotes: data.auditNotes || data.notes, referralTo: data.referralTo,
          birthWeight: data.birthWeight ?? (babies.length ? babies[0].birthWeight : undefined),
          createdById: data.createdById,
          ...(babies.length ? { Newborn: { create: babies } } : {})
        },
        include: { patient: true, attendance: true, Newborn: true }
      });

      if (booking) {
        await tx.antenatalBooking.update({
          where: { id: booking.id },
          data: {
            isActive: false,
            isCompleted: true,
            deliveryDate: data.deliveryDate,
            deliveryOutcome: data.deliveryOutcome,
            deliveryRecordId: record.id,
            updatedAt: new Date(),
          },
        });
      }

      return record;
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
    const d: any = data;
    const arr = (v: any) => (Array.isArray(v) ? v : []);
    return this.prisma.postnatalRecord.create({
      data: {
        patientId: d.patientId, attendanceId: d.attendanceId, antenatalBookingId: d.antenatalBookingId,
        deliveryRecordId: d.deliveryRecordId, examinationDate: d.examinationDate, dayNumber: d.dayNumber || 1,
        maternalCondition: d.maternalCondition, maternalComplications: arr(d.maternalComplications),
        bloodPressure: d.bloodPressure, temperature: d.temperature, pulse: d.pulse, fundalHeight: d.fundalHeight,
        lochia: d.lochia, perinealCondition: d.perinealCondition, caesareanWound: d.caesareanWound,
        breastfeedingStatus: d.breastfeedingStatus, breastfeedingDifficulties: arr(d.breastfeedingDifficulties), latching: d.latching,
        babyCondition: d.babyCondition, babyWeight: d.babyWeight, babyTemperature: d.babyTemperature, babyFeeding: d.babyFeeding,
        jaundice: !!d.jaundice, jaundiceSeverity: d.jaundiceSeverity, cordCondition: d.cordCondition,
        bcgGiven: !!d.bcgGiven, opv0Given: !!d.opv0Given, hepB0Given: !!d.hepB0Given,
        familyPlanningDiscussed: !!d.familyPlanningDiscussed, familyPlanningMethodAccepted: d.familyPlanningMethodAccepted,
        maternalDangerSigns: arr(d.maternalDangerSigns), babyDangerSigns: arr(d.babyDangerSigns),
        referralMade: !!d.referralMade, referredTo: d.referredTo, referralReason: d.referralReason,
        nextVisitDate: d.nextVisitDate ? new Date(d.nextVisitDate) : undefined, nextVisitType: d.nextVisitType,
        malePartnerPresentPNC: !!d.malePartnerPresentPNC,
        notes: d.notes, createdById: d.createdById
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