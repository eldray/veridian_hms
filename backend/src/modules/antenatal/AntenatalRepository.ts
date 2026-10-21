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
    const tt = Math.min(Math.max(Number(data.ttDosesGiven) || 0, 0), 5);
    const iptp = Math.min(Math.max(Number(data.iptpDosesGiven) || 0, 0), 5);
    const prev = Array.isArray(data.previousComplications) ? data.previousComplications.join(', ') : data.previousComplications;
    const hb = data.hbLevel ?? (data.bookingHb != null && data.bookingHb !== ('' as any) ? Number(data.bookingHb) : undefined);
    const hbNum = hb != null && !Number.isNaN(Number(hb)) ? Number(hb) : undefined;
    const numOrU = (v: any) => (v === '' || v == null || Number.isNaN(Number(v)) ? undefined : Number(v));
    const doseDates: any = {};
    for (let i = 1; i <= tt; i++) doseDates[`tt${i}Date`] = new Date();
    for (let i = 1; i <= iptp; i++) doseDates[`iptp${i}Date`] = new Date();

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
    const allowed = ['gravida', 'para', 'edd', 'gestationalAgeWeeks', 'riskLevel', 'riskFactors', 'isActive', 'isCompleted', 'deliveryDate',
      'deliveryOutcome', 'deliveryRecordId', 'bloodGroup', 'hivStatus', 'hbLevel', 'vdrl', 'currentAttendanceId', 'malePartnerInvolved',
      'partnerHivStatus', 'hivKnownPositive', 'hepatitisBStatus', 'bookingHeight', 'bookingWeight', 'bookingBP', 'itnGiven',
      'ironFolateGiven', 'previousCSection'];
    const clean: any = {};
    for (const k of allowed) if ((data as any)[k] !== undefined) clean[k] = (data as any)[k];
    if (clean.hbLevel != null) { clean.hbBooking = clean.hbLevel; clean.anaemiaDiagnosed = Number(clean.hbLevel) < 11; }
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
    // Only allow clinical fields to change. The linked booking, attendance and
    // recorder are immutable after creation so an edit cannot reassign a record
    // or rewrite its audit attribution.
    const allowed = [
      'visitNumber', 'visitDate', 'gestationalAgeWeeks', 'gestationalAgeDays',
      'weight', 'bloodPressure', 'fundalHeight', 'fetalHeartRate', 'fetalMovements',
      'presentation', 'iptpGiven', 'iptpDoseNumber', 'iptpDrug', 'ttGiven',
      'ttDoseNumber', 'ironGiven', 'folateGiven', 'calciumGiven', 'malariaTestDone',
      'malariaTestResult', 'malariaTreatmentGiven', 'dangerSignsPresent',
      'dangerSignsList', 'referralMade', 'referredTo', 'nextVisitDate',
      'returnInstructions'
    ];
    const clean: Record<string, unknown> = {};
    for (const key of allowed) {
      const value = (data as any)[key];
      if (value !== undefined) clean[key] = value;
    }
    return this.prisma.aNCVisit.update({
      where: { id }, data: clean,
      include: { recordedBy: { select: { fullName: true, role: true } } }
    });
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
    return this.prisma.deliveryRecord.create({
      data: {
        patientId: data.patientId, attendanceId: data.attendanceId, antenatalBookingId: data.antenatalBookingId,
        deliveryDate: data.deliveryDate, deliveryType: data.deliveryType, deliveryOutcome: data.deliveryOutcome,
        placeOfDelivery: data.placeOfDelivery || 'private_hospital', attendant: data.attendant, birthWeight: data.birthWeight,
        gestationWeeks: data.gestationWeeks, apgarScore1min: data.apgarScore1min, apgarScore5min: data.apgarScore5min,
        resusCitationDone: data.resusCitationDone || false, maternalOutcome: data.maternalOutcome || 'alive',
        complications: data.complications || [], notes: data.notes, malePartnerPresentANC: data.malePartnerPresentANC || false,
        malePartnerPresentDelivery: data.malePartnerPresentDelivery || false, malePartnerPresentPNC: data.malePartnerPresentPNC || false,
        maternalDeathsAudited: data.maternalDeathsAudited || false, auditNotes: data.auditNotes, referralTo: data.referralTo,
        birthWeight: data.birthWeight ?? (babies.length ? babies[0].birthWeight : undefined),
        createdById: data.createdById,
        ...(babies.length ? { Newborn: { create: babies } } : {})
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
    // Never spread the request body into Prisma: identifiers, creator/audit
    // fields, and unrecognised properties must not be writable from the client.
    const allowed = [
      'deliveryDate', 'deliveryType', 'deliveryOutcome', 'placeOfDelivery',
      'attendant', 'birthWeight', 'gestationWeeks', 'apgarScore1min',
      'apgarScore5min', 'resusCitationDone', 'maternalOutcome', 'complications',
      'notes', 'malePartnerPresentANC', 'malePartnerPresentDelivery',
      'malePartnerPresentPNC', 'maternalDeathsAudited', 'auditNotes', 'referralTo'
    ];
    const updatePayload: any = {};
    for (const key of allowed) {
      if (data[key] !== undefined) updatePayload[key] = data[key];
    }
    const Newborn = data.Newborn ?? data.newborns;

    // Preserve the existing multiple-birth replacement behavior, while mapping
    // each newborn explicitly so client-supplied IDs/foreign keys are ignored.
    const newbornList: any[] = Array.isArray(Newborn)
      ? Newborn
      : Array.isArray(Newborn?.create) ? Newborn.create : [];
    if (newbornList.length > 0) {
      updatePayload.Newborn = {
        deleteMany: {},
        create: newbornList.map((baby: any, index: number) => ({
          order: baby.order ?? index + 1,
          birthWeight: Number(baby.birthWeight) || 0,
          gender: baby.gender || 'other',
          apgarScore1min: baby.apgarScore1min ?? null,
          apgarScore5min: baby.apgarScore5min ?? null,
          resuscitation: !!baby.resuscitation,
          outcome: baby.outcome || 'alive',
          anomalies: Array.isArray(baby.anomalies) ? baby.anomalies : [],
          referredTo: baby.referredTo || null,
          breastfeedingWithin30Min: !!baby.breastfeedingWithin30Min,
          eyeProphylaxisGiven: !!baby.eyeProphylaxisGiven,
          cordCareMethod: baby.cordCareMethod || 'dry_cord',
          babyWeightAt6to10Days: baby.babyWeightAt6to10Days ?? null,
          weightAt6to10DaysDate: baby.weightAt6to10DaysDate
            ? new Date(baby.weightAt6to10DaysDate) : null
        }))
      };
    }

    if (Object.keys(updatePayload).length === 0) {
      throw new Error('No valid delivery fields supplied for update');
    }
    return this.prisma.deliveryRecord.update({
      where: { id }, data: updatePayload, include: { Newborn: true }
    });
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
    // Whitelist editable clinical fields. In particular, patient/attendance
    // links and createdById cannot be reassigned by a PUT request.
    const allowed = [
      'examinationDate', 'dayNumber', 'maternalCondition', 'maternalComplications',
      'bloodPressure', 'temperature', 'pulse', 'fundalHeight', 'lochia',
      'perinealCondition', 'caesareanWound', 'breastfeedingStatus',
      'breastfeedingDifficulties', 'latching', 'babyCondition', 'babyWeight',
      'babyTemperature', 'babyFeeding', 'jaundice', 'jaundiceSeverity',
      'cordCondition', 'bcgGiven', 'opv0Given', 'hepB0Given',
      'familyPlanningDiscussed', 'familyPlanningMethodAccepted',
      'maternalDangerSigns', 'babyDangerSigns', 'referralMade', 'referredTo',
      'referralReason', 'nextVisitDate', 'nextVisitType', 'malePartnerPresentPNC',
      'notes'
    ];
    const clean: Record<string, unknown> = {};
    for (const key of allowed) {
      const value = data[key];
      if (value !== undefined) clean[key] = value;
    }
    if (typeof clean.examinationDate === 'string') clean.examinationDate = new Date(clean.examinationDate);
    if (typeof clean.nextVisitDate === 'string') clean.nextVisitDate = new Date(clean.nextVisitDate);
    if (Object.keys(clean).length === 0) {
      throw new Error('No valid postnatal fields supplied for update');
    }
    return this.prisma.postnatalRecord.update({ where: { id }, data: clean });
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