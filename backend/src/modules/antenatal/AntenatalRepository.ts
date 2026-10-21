import { PrismaClient } from '@prisma/client';
import { BaseRepository } from '../../shared/base/BaseRepository';
import { ValidationError } from '../../utils/errors';
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
    if (!data?.patientId?.trim() || !data?.attendanceId?.trim() || !data?.createdById?.trim()) {
      throw new ValidationError('Patient, antenatal attendance, and recording staff are required');
    }
    const lmp = new Date(data.lmp);
    if (!data.lmp || !Number.isFinite(lmp.getTime())) {
      throw new ValidationError('A valid last menstrual period (LMP) date is required');
    }
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (lmp.getTime() > today.getTime()) {
      throw new ValidationError('LMP cannot be in the future');
    }
    const gravida = Number(data.gravida);
    const para = Number(data.para);
    if (!Number.isInteger(gravida) || gravida < 1 || !Number.isInteger(para) || para < 0 || para > gravida) {
      throw new ValidationError('Gravida must be at least 1 and para must be a whole number between 0 and gravida');
    }
    const actor = await this.prisma.user.findUnique({ where: { id: data.createdById }, select: { id: true } });
    if (!actor) throw new ValidationError('The selected recording staff account does not exist');
    const attendance = await this.prisma.attendance.findUnique({
      where: { id: data.attendanceId },
      select: { id: true, patientId: true, attendanceType: true },
    });
    if (!attendance) throw new ValidationError('The selected antenatal attendance does not exist');
    if (attendance.patientId !== data.patientId) {
      throw new ValidationError('The antenatal attendance belongs to a different patient');
    }
    if (attendance.attendanceType !== 'antenatal') {
      throw new ValidationError('Antenatal booking must be linked to an antenatal attendance');
    }

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
        bookingDate: new Date(), lmp, edd, gravida, para,
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
      'visitDate', 'gestationalAgeWeeks', 'gestationalAgeDays',
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
    if (typeof clean.visitDate === 'string') clean.visitDate = new Date(clean.visitDate);
    if (typeof clean.nextVisitDate === 'string') clean.nextVisitDate = new Date(clean.nextVisitDate as string);
    for (const key of ['visitDate', 'nextVisitDate']) {
      const value = clean[key];
      if (value instanceof Date && !Number.isFinite(value.getTime())) {
        throw new ValidationError(`A valid ${key} is required`);
      }
    }
    if (Object.keys(clean).length === 0) {
      throw new ValidationError('No editable antenatal visit fields supplied');
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
    if (!data?.patientId?.trim() || !data?.attendanceId?.trim() || !data?.createdById?.trim() || !data?.attendant?.trim()) {
      throw new ValidationError('Patient, delivery attendance, attendant, and recording staff are required');
    }
    if (!['spontaneous_vertex', 'assisted_breech', 'vacuum', 'forceps', 'caesarean_section', 'multiple'].includes(String(data.deliveryType))) {
      throw new ValidationError('Invalid delivery type');
    }
    if (!['live_birth', 'stillbirth_fresh', 'stillbirth_macerated', 'neonatal_death'].includes(String(data.deliveryOutcome))) {
      throw new ValidationError('Invalid delivery outcome');
    }
    if (data.maternalOutcome !== undefined &&
      !['alive', 'dead_direct_cause', 'dead_indirect_cause', 'dead_unknown'].includes(String(data.maternalOutcome))) {
      throw new ValidationError('Invalid maternal outcome');
    }
    if (data.gestationWeeks !== undefined && data.gestationWeeks !== null &&
      (!Number.isInteger(Number(data.gestationWeeks)) || Number(data.gestationWeeks) < 0 || Number(data.gestationWeeks) > 42)) {
      throw new ValidationError('Gestational age must be a whole number between 0 and 42 weeks');
    }
    const deliveryDate = data.deliveryDate instanceof Date
      ? new Date(data.deliveryDate.getTime())
      : new Date(data.deliveryDate as unknown as string);
    if (!Number.isFinite(deliveryDate.getTime())) {
      throw new ValidationError('A valid delivery date is required');
    }
    const actor = await this.prisma.user.findUnique({ where: { id: data.createdById }, select: { id: true } });
    if (!actor) throw new ValidationError('The selected recording staff account does not exist');

    const babies = this.mapNewborns((data as any).Newborn);
    for (const [index, baby] of babies.entries()) {
      if (!Number.isFinite(baby.birthWeight) || baby.birthWeight <= 0 || baby.birthWeight > 10) {
        throw new ValidationError(`Newborn ${index + 1} must have a valid birth weight`);
      }
      if (!['male', 'female', 'other'].includes(String(baby.gender))) {
        throw new ValidationError(`Newborn ${index + 1} has an invalid gender`);
      }
      if (!['alive', 'dead_within_24hrs', 'dead_1_7days', 'dead_8_28days', 'referred_out'].includes(String(baby.outcome))) {
        throw new ValidationError(`Newborn ${index + 1} has an invalid outcome`);
      }
      for (const scoreKey of ['apgarScore1min', 'apgarScore5min']) {
        const score = baby[scoreKey];
        if (score !== null && score !== undefined &&
          (!Number.isInteger(Number(score)) || Number(score) < 0 || Number(score) > 10)) {
          throw new ValidationError(`Newborn ${index + 1} has an invalid ${scoreKey}`);
        }
      }
      if (baby.weightAt6to10DaysDate && !Number.isFinite(new Date(baby.weightAt6to10DaysDate).getTime())) {
        throw new ValidationError(`Newborn ${index + 1} has an invalid follow-up weight date`);
      }
    }
    if (new Set(babies.map((baby: any) => baby.order)).size !== babies.length) {
      throw new ValidationError('Each newborn must have a unique birth order');
    }
    return this.prisma.$transaction(async (tx) => {
      const attendance = await tx.attendance.findUnique({
        where: { id: data.attendanceId },
        select: { id: true, patientId: true, attendanceType: true },
      });
      if (!attendance) throw new ValidationError('The selected delivery attendance does not exist');
      if (attendance.patientId !== data.patientId) {
        throw new ValidationError('The delivery attendance belongs to a different patient');
      }
      if (attendance.attendanceType !== 'delivery') {
        throw new ValidationError('Delivery record must be linked to a delivery attendance');
      }

      if (data.antenatalBookingId) {
        const booking = await tx.antenatalBooking.findUnique({
          where: { id: data.antenatalBookingId },
          select: { id: true, patientId: true, isActive: true, isCompleted: true },
        });
        if (!booking || booking.patientId !== data.patientId) {
          throw new ValidationError('The antenatal booking does not belong to this patient');
        }
        if (!booking.isActive || booking.isCompleted) {
          throw new ValidationError('This antenatal booking is already closed');
        }
      }

      const record = await tx.deliveryRecord.create({
        data: {
          patientId: data.patientId, attendanceId: data.attendanceId, antenatalBookingId: data.antenatalBookingId,
          deliveryDate, deliveryType: data.deliveryType, deliveryOutcome: data.deliveryOutcome,
          placeOfDelivery: data.placeOfDelivery || 'private_hospital', attendant: data.attendant,
          gestationWeeks: data.gestationWeeks, apgarScore1min: data.apgarScore1min, apgarScore5min: data.apgarScore5min,
          resusCitationDone: data.resusCitationDone || false, maternalOutcome: data.maternalOutcome || 'alive',
          complications: data.complications || [], malePartnerPresentANC: data.malePartnerPresentANC || false,
          malePartnerPresentDelivery: data.malePartnerPresentDelivery || false, malePartnerPresentPNC: data.malePartnerPresentPNC || false,
          maternalDeathsAudited: data.maternalDeathsAudited || false, auditNotes: data.auditNotes, referralTo: data.referralTo,
          birthWeight: data.birthWeight ?? (babies.length ? babies[0].birthWeight : undefined),
          createdById: data.createdById,
          ...(babies.length ? { Newborn: { create: babies } } : {})
        },
        include: { patient: true, attendance: true, Newborn: true }
      });

      // Delivery creation and closure of the related ANC booking must succeed or fail together.
      if (data.antenatalBookingId) {
        const closed = await tx.antenatalBooking.updateMany({
          where: { id: data.antenatalBookingId, patientId: data.patientId, isActive: true, isCompleted: false },
          data: {
            isActive: false, isCompleted: true, deliveryDate,
            deliveryOutcome: String(data.deliveryOutcome), deliveryRecordId: record.id,
            updatedAt: new Date(),
          },
        });
        if (closed.count !== 1) {
          throw new ValidationError('The antenatal booking could not be closed; delivery was not saved');
        }
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
    // Never spread the request body into Prisma: identifiers, creator/audit
    // fields, and unrecognised properties must not be writable from the client.
    const allowed = [
      'deliveryDate', 'deliveryType', 'deliveryOutcome', 'placeOfDelivery',
      'attendant', 'birthWeight', 'gestationWeeks', 'apgarScore1min',
      'apgarScore5min', 'resusCitationDone', 'maternalOutcome', 'complications',
      'malePartnerPresentANC', 'malePartnerPresentDelivery',
      'malePartnerPresentPNC', 'maternalDeathsAudited', 'auditNotes', 'referralTo'
    ];
    const updatePayload: any = {};
    for (const key of allowed) {
      if (data[key] !== undefined) updatePayload[key] = data[key];
    }
    if (updatePayload.deliveryDate !== undefined) {
      updatePayload.deliveryDate = updatePayload.deliveryDate instanceof Date
        ? new Date(updatePayload.deliveryDate.getTime())
        : new Date(updatePayload.deliveryDate);
      if (!Number.isFinite(updatePayload.deliveryDate.getTime())) {
        throw new ValidationError('A valid delivery date is required');
      }
    }
    const numericRanges: Record<string, [number, number]> = {
      birthWeight: [0, 10], gestationWeeks: [0, 42],
      apgarScore1min: [0, 10], apgarScore5min: [0, 10],
    };
    for (const [key, range] of Object.entries(numericRanges)) {
      const value = updatePayload[key];
      if (value === undefined || value === null) continue;
      const numeric = Number(value);
      if (!Number.isFinite(numeric) || numeric < range[0] || numeric > range[1]) {
        throw new ValidationError(`${key} must be between ${range[0]} and ${range[1]}`);
      }
      if (key !== 'birthWeight' && !Number.isInteger(numeric)) {
        throw new ValidationError(`${key} must be a whole number`);
      }
      updatePayload[key] = numeric;
    }
    const Newborn = data.Newborn ?? data.newborns;

    // Preserve the existing multiple-birth replacement behavior, while mapping
    // each newborn explicitly so client-supplied IDs/foreign keys are ignored.
    const hasNewbornUpdate = Array.isArray(Newborn) || Array.isArray(Newborn?.create);
    const newbornList: any[] = Array.isArray(Newborn)
      ? Newborn
      : Array.isArray(Newborn?.create) ? Newborn.create : [];
    if (hasNewbornUpdate) {
      const mappedBabies = newbornList.map((baby: any, index: number) => {
        const birthWeight = Number(baby.birthWeight);
        if (!Number.isFinite(birthWeight) || birthWeight <= 0 || birthWeight > 10) {
          throw new ValidationError(`Newborn ${index + 1} must have a valid birth weight`);
        }
        for (const scoreKey of ['apgarScore1min', 'apgarScore5min']) {
          const score = baby[scoreKey];
          if (score !== undefined && score !== null &&
            (!Number.isInteger(Number(score)) || Number(score) < 0 || Number(score) > 10)) {
            throw new ValidationError(`Newborn ${index + 1} has an invalid ${scoreKey}`);
          }
        }
        const weightDate = baby.weightAt6to10DaysDate ? new Date(baby.weightAt6to10DaysDate) : null;
        if (weightDate && !Number.isFinite(weightDate.getTime())) {
          throw new ValidationError(`Newborn ${index + 1} has an invalid follow-up weight date`);
        }
        return {
          order: baby.order ?? index + 1,
          birthWeight,
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
          weightAt6to10DaysDate: weightDate
        };
      });
      if (new Set(mappedBabies.map((baby: any) => baby.order)).size !== mappedBabies.length) {
        throw new ValidationError('Each newborn must have a unique birth order');
      }
      updatePayload.Newborn = {
        deleteMany: {},
        create: mappedBabies
      };
    }

    if (Object.keys(updatePayload).length === 0) {
      throw new ValidationError('No valid delivery fields supplied for update');
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
    if (!d.patientId?.trim() || !d.attendanceId?.trim() || !d.createdById?.trim()) {
      throw new ValidationError('Patient, postnatal attendance, and recording staff are required');
    }
    const examinationDate = d.examinationDate ? new Date(d.examinationDate) : new Date();
    if (!Number.isFinite(examinationDate.getTime())) {
      throw new ValidationError('A valid postnatal examination date is required');
    }
    const nextVisitDate = d.nextVisitDate ? new Date(d.nextVisitDate) : undefined;
    if (nextVisitDate && !Number.isFinite(nextVisitDate.getTime())) {
      throw new ValidationError('A valid next-visit date is required');
    }
    const dayNumber = d.dayNumber === undefined || d.dayNumber === null || d.dayNumber === '' ? 1 : Number(d.dayNumber);
    if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 365) {
      throw new ValidationError('Postnatal day number must be a whole number between 1 and 365');
    }
    const numericRanges: Record<string, [number, number]> = {
      temperature: [25, 45], pulse: [0, 300], fundalHeight: [0, 100],
      babyWeight: [0, 20], babyTemperature: [25, 45],
    };
    for (const [key, range] of Object.entries(numericRanges)) {
      const value = d[key];
      if (value === undefined || value === null || value === '') continue;
      const numeric = Number(value);
      if (!Number.isFinite(numeric) || numeric < range[0] || numeric > range[1]) {
        throw new ValidationError(`${key} must be between ${range[0]} and ${range[1]}`);
      }
      if (key === 'pulse' || key === 'fundalHeight') {
        if (!Number.isInteger(numeric)) throw new ValidationError(`${key} must be a whole number`);
      }
      d[key] = numeric;
    }

    const attendance = await this.prisma.attendance.findUnique({
      where: { id: d.attendanceId },
      select: { id: true, patientId: true, attendanceType: true },
    });
    if (!attendance) throw new ValidationError('The selected postnatal attendance does not exist');
    if (attendance.patientId !== d.patientId) {
      throw new ValidationError('The postnatal attendance belongs to a different patient');
    }
    if (attendance.attendanceType !== 'postnatal') {
      throw new ValidationError('Postnatal record must be linked to a postnatal attendance');
    }
    if (d.antenatalBookingId) {
      const booking = await this.prisma.antenatalBooking.findUnique({
        where: { id: d.antenatalBookingId },
        select: { id: true, patientId: true },
      });
      if (!booking || booking.patientId !== d.patientId) {
        throw new ValidationError('The antenatal booking does not belong to this patient');
      }
    }
    if (d.deliveryRecordId) {
      const delivery = await this.prisma.deliveryRecord.findUnique({
        where: { id: d.deliveryRecordId },
        select: { id: true, patientId: true },
      });
      if (!delivery || delivery.patientId !== d.patientId) {
        throw new ValidationError('The delivery record does not belong to this patient');
      }
    }
    const actor = await this.prisma.user.findUnique({ where: { id: d.createdById }, select: { id: true } });
    if (!actor) throw new ValidationError('The selected recording staff account does not exist');

    const arr = (v: any) => (Array.isArray(v) ? v : []);
    return this.prisma.postnatalRecord.create({
      data: {
        patientId: d.patientId, attendanceId: d.attendanceId, antenatalBookingId: d.antenatalBookingId,
        deliveryRecordId: d.deliveryRecordId, examinationDate, dayNumber,
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
        nextVisitDate, nextVisitType: d.nextVisitType,
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
    for (const key of ['examinationDate', 'nextVisitDate']) {
      const value = clean[key];
      if (value instanceof Date && !Number.isFinite(value.getTime())) {
        throw new ValidationError(`A valid ${key} is required`);
      }
    }
    if (Object.keys(clean).length === 0) {
      throw new ValidationError('No valid postnatal fields supplied for update');
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