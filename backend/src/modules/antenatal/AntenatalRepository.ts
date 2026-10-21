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
    if (!Number.isInteger(Number(data.para)) || Number(data.para) < 0 || Number(data.para) >= Number(data.gravida)) {
      throw new ValidationError('Para must be a whole number from 0 to less than gravida for an ongoing pregnancy');
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

    if (data.riskLevel !== undefined && !['low', 'medium', 'high'].includes(data.riskLevel)) {
      throw new ValidationError('Risk level must be low, medium or high');
    }
    if (data.bookingBP && String(data.bookingBP).trim()) {
      const pressureParts = String(data.bookingBP).trim().replace(/ /g, '').replace('-', '/').split('/');
      const systolic = Number(pressureParts[0]);
      const diastolic = Number(pressureParts[1]);
      if (pressureParts.length !== 2 || !Number.isInteger(systolic) || !Number.isInteger(diastolic) || systolic < 50 || systolic > 260 || diastolic < 20 || diastolic > 160 || systolic <= diastolic) {
        throw new ValidationError('Booking blood pressure must be a plausible systolic/diastolic value, for example 120/80');
      }
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
    const numOrU = (v: any) => (v === '' || v == null || !Number.isFinite(Number(v)) ? undefined : Number(v));
    const doseDates: any = {};
    // Never invent administration dates for historical doses. Save a date only when staff recorded it.
    for (let i = 1; i <= 5; i++) {
      for (const prefix of ['tt', 'iptp']) {
        const field = `${prefix}${i}Date`;
        const value = (data as any)[field];
        if (!value) continue;
        const doseDate = new Date(value);
        if (Number.isNaN(doseDate.getTime())) throw new ValidationError(`${field} must be a valid date`);
        if (doseDate.getTime() > Date.now()) throw new ValidationError(`${field} cannot be in the future`);
        doseDates[field] = doseDate;
      }
    }
    const bookingWeight = numOrU(data.bookingWeight);
    const bookingHeight = numOrU(data.bookingHeight);
    if (bookingWeight !== undefined && (bookingWeight <= 0 || bookingWeight > 350)) {
      throw new ValidationError('Booking weight must be a valid value in kilograms');
    }
    if (bookingHeight !== undefined && (bookingHeight < 30 || bookingHeight > 250)) {
      throw new ValidationError('Booking height must be between 30 and 250 cm');
    }
    const gestation = numOrU(data.gestationalAgeWeeks);
    if (gestation !== undefined && (!Number.isInteger(gestation) || gestation < 0 || gestation > 42)) {
      throw new ValidationError('Gestational age must be between 0 and 42 weeks');
    }

    return this.getModel().create({
      data: {
        patientId: data.patientId, attendanceId: data.attendanceId, currentAttendanceId: data.attendanceId,
        bookingDate: new Date(), lmp, edd, gravida: data.gravida, para: data.para,
        gestationalAgeWeeks: gestation, gestationalAgeAtBooking: gestation,
        riskLevel: data.riskLevel || 'low',
        riskFactors: data.riskFactors || [], bloodGroup: data.bloodGroup, hivStatus: data.hivStatus || undefined,
        hbLevel: hbNum, hbBooking: hbNum, anaemiaDiagnosed: hbNum != null && hbNum < 11,
        vdrl: data.vdrl || data.syphilisStatus || undefined,
        hepatitisBStatus: data.hepatitisBStatus || undefined,
        partnerHivStatus: data.partnerHIVStatus || undefined,
        hivKnownPositive: !!data.hivKnownPositive,
        malePartnerInvolved: !!data.malePartnerInvolved,
        bookingHeight, bookingWeight,
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
    // Pregnancy completion is controlled by the delivery/closure workflow, not by a generic profile update.
    const allowed = ['gravida', 'para', 'lmp', 'edd', 'gestationalAgeWeeks', 'riskLevel', 'riskFactors',
      'bloodGroup', 'hivStatus', 'hbLevel', 'vdrl', 'currentAttendanceId', 'malePartnerInvolved',
      'partnerHivStatus', 'hivKnownPositive', 'hepatitisBStatus', 'bookingHeight', 'bookingWeight', 'bookingBP', 'itnGiven',
      'ironFolateGiven', 'previousCSection'];
    const clean: any = {};
    for (const k of allowed) if ((data as any)[k] !== undefined) clean[k] = (data as any)[k];
    if (Object.keys(clean).length === 0) throw new ValidationError('No supported antenatal booking fields were provided');
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
      if (para >= gravida) throw new ValidationError('Para must be less than gravida for an ongoing pregnancy');
    }
    if (clean.riskLevel !== undefined && !['low', 'medium', 'high'].includes(clean.riskLevel)) {
      throw new ValidationError('Risk level must be low, medium or high');
    }
    if (clean.bookingBP !== undefined && clean.bookingBP !== null && String(clean.bookingBP).trim() !== '') {
      const pressureParts = String(clean.bookingBP).trim().replace(/ /g, '').replace('-', '/').split('/');
      const systolic = Number(pressureParts[0]);
      const diastolic = Number(pressureParts[1]);
      if (pressureParts.length !== 2 || !Number.isInteger(systolic) || !Number.isInteger(diastolic) || systolic < 50 || systolic > 260 || diastolic < 20 || diastolic > 160 || systolic <= diastolic) {
        throw new ValidationError('Booking blood pressure must be a plausible systolic/diastolic value, for example 120/80');
      }
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
    const visitDate = new Date(data.visitDate);
    if (Number.isNaN(visitDate.getTime())) throw new ValidationError('ANC visit date must be valid');
    const nextVisitDate = data.nextVisitDate ? new Date(data.nextVisitDate) : undefined;
    if (nextVisitDate && Number.isNaN(nextVisitDate.getTime())) throw new ValidationError('Next ANC visit date must be valid');
    if (visitDate.getTime() > Date.now()) throw new ValidationError('ANC visit date cannot be in the future');
    if (nextVisitDate && nextVisitDate.getTime() < new Date(new Date().toDateString()).getTime()) {
      throw new ValidationError('Next ANC visit date cannot be in the past');
    }
    if (data.bloodPressure != null && String(data.bloodPressure).trim() !== '') {
      const parts = String(data.bloodPressure).trim().replace(/ /g, '').replace('-', '/').split('/');
      const systolic = Number(parts[0]);
      const diastolic = Number(parts[1]);
      if (parts.length !== 2 || !Number.isInteger(systolic) || !Number.isInteger(diastolic) || systolic < 50 || systolic > 260 || diastolic < 20 || diastolic > 160 || systolic <= diastolic) {
        throw new ValidationError('ANC blood pressure must be a plausible systolic/diastolic value, for example 120/80');
      }
    }
    if (data.gestationalAgeWeeks !== undefined && (!Number.isInteger(Number(data.gestationalAgeWeeks)) || Number(data.gestationalAgeWeeks) < 0 || Number(data.gestationalAgeWeeks) > 42)) {
      throw new ValidationError('Gestational age must be between 0 and 42 weeks');
    }
    if (data.gestationalAgeDays !== undefined && (!Number.isInteger(Number(data.gestationalAgeDays)) || Number(data.gestationalAgeDays) < 0 || Number(data.gestationalAgeDays) > 6)) {
      throw new ValidationError('Gestational age days must be between 0 and 6');
    }
    if (data.weight !== undefined && (!Number.isFinite(Number(data.weight)) || Number(data.weight) <= 0 || Number(data.weight) > 350)) {
      throw new ValidationError('Weight must be a valid value in kilograms');
    }
    if (data.fundalHeight !== undefined && (!Number.isFinite(Number(data.fundalHeight)) || Number(data.fundalHeight) < 0 || Number(data.fundalHeight) > 60)) {
      throw new ValidationError('Fundal height must be between 0 and 60 cm');
    }
    if (data.fetalHeartRate !== undefined && (!Number.isInteger(Number(data.fetalHeartRate)) || Number(data.fetalHeartRate) < 60 || Number(data.fetalHeartRate) > 200)) {
      throw new ValidationError('Fetal heart rate must be between 60 and 200 bpm');
    }
    if (data.iptpDoseNumber !== undefined && (!Number.isInteger(Number(data.iptpDoseNumber)) || Number(data.iptpDoseNumber) < 1 || Number(data.iptpDoseNumber) > 5)) {
      throw new ValidationError('IPTp dose number must be between 1 and 5');
    }
    if (data.ttDoseNumber !== undefined && (!Number.isInteger(Number(data.ttDoseNumber)) || Number(data.ttDoseNumber) < 1 || Number(data.ttDoseNumber) > 5)) {
      throw new ValidationError('TT dose number must be between 1 and 5');
    }

    return this.prisma.$transaction(async (tx) => {
      const [attendance, booking] = await Promise.all([
        tx.attendance.findUnique({
          where: { id: data.attendanceId },
          select: { id: true, patientId: true, attendanceType: true },
        }),
        tx.antenatalBooking.findUnique({ where: { id: data.bookingId } }),
      ]);
      if (!attendance) throw new NotFoundError('ANC attendance', data.attendanceId);
      if (!booking) throw new NotFoundError('Antenatal booking', data.bookingId);
      if (attendance.patientId !== booking.patientId) {
        throw new ValidationError('ANC visit attendance and booking must belong to the same patient');
      }
      if (attendance.attendanceType !== 'antenatal') {
        throw new ValidationError('ANC visit must be linked to an antenatal attendance');
      }

      const existingVisit = await tx.aNCVisit.findUnique({ where: { attendanceId: data.attendanceId } });
      if (existingVisit && existingVisit.bookingId !== booking.id) {
        throw new ConflictError('This attendance is already linked to a different ANC booking');
      }
      if (!existingVisit && (!booking.isActive || booking.isCompleted)) {
        throw new ConflictError('A new ANC visit cannot be added to a closed pregnancy booking');
      }

      const visitFields = {
        visitDate,
        gestationalAgeWeeks: data.gestationalAgeWeeks,
        gestationalAgeDays: data.gestationalAgeDays,
        weight: data.weight,
        bloodPressure: data.bloodPressure,
        fundalHeight: data.fundalHeight,
        fetalHeartRate: data.fetalHeartRate,
        fetalMovements: data.fetalMovements,
        presentation: data.presentation,
        iptpGiven: data.iptpGiven ?? false,
        iptpDoseNumber: data.iptpDoseNumber,
        iptpDrug: data.iptpDrug,
        ttGiven: data.ttGiven ?? false,
        ttDoseNumber: data.ttDoseNumber,
        ironGiven: data.ironGiven ?? false,
        folateGiven: data.folateGiven ?? false,
        calciumGiven: data.calciumGiven ?? false,
        malariaTestDone: data.malariaTestDone ?? false,
        malariaTestResult: data.malariaTestResult,
        malariaTreatmentGiven: data.malariaTreatmentGiven ?? false,
        dangerSignsPresent: data.dangerSignsPresent ?? false,
        dangerSignsList: data.dangerSignsList ?? [],
        referralMade: data.referralMade ?? false,
        referredTo: data.referredTo,
        nextVisitDate,
        returnInstructions: data.returnInstructions,
      };

      // Encounter creation already seeds a blank ANC visit. Update that record instead
      // of attempting a second insert for the same attendance and losing the submitted form.
      if (existingVisit) {
        return tx.aNCVisit.update({
          where: { id: existingVisit.id },
          data: visitFields,
          include: { recordedBy: { select: { fullName: true, role: true } } },
        });
      }

      const visitCount = await tx.aNCVisit.count({ where: { bookingId: booking.id } });
      return tx.aNCVisit.create({
        data: {
          bookingId: booking.id,
          attendanceId: attendance.id,
          visitNumber: visitCount + 1,
          ...visitFields,
          recordedById: data.recordedById,
        },
        include: { recordedBy: { select: { fullName: true, role: true } } },
      });
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
    const allowed = [
      'visitDate', 'gestationalAgeWeeks', 'gestationalAgeDays', 'weight', 'bloodPressure',
      'fundalHeight', 'fetalHeartRate', 'fetalMovements', 'presentation', 'oedema', 'oedemaGrade',
      'urinalysisProtein', 'urinalysisGlucose', 'urinalysisBlood', 'iptpGiven', 'iptpDoseNumber',
      'iptpDrug', 'ttGiven', 'ttDoseNumber', 'ironGiven', 'folateGiven', 'calciumGiven',
      'malariaTestDone', 'malariaTestResult', 'malariaTreatmentGiven', 'dangerSignsPresent',
      'dangerSignsList', 'referralMade', 'referredTo', 'nextVisitDate', 'returnInstructions',
    ];
    const clean: Record<string, any> = {};
    for (const key of allowed) if ((data as any)[key] !== undefined) clean[key] = (data as any)[key];
    if (clean.visitDate && Number.isNaN(new Date(clean.visitDate).getTime())) {
      throw new ValidationError('ANC visit date must be valid');
    }
    if (clean.nextVisitDate && Number.isNaN(new Date(clean.nextVisitDate).getTime())) {
      throw new ValidationError('Next ANC visit date must be valid');
    }
    if (clean.visitDate) {
      clean.visitDate = new Date(clean.visitDate);
      if (clean.visitDate.getTime() > Date.now()) throw new ValidationError('ANC visit date cannot be in the future');
    }
    if (clean.nextVisitDate) {
      clean.nextVisitDate = new Date(clean.nextVisitDate);
      if (clean.nextVisitDate.getTime() < new Date(new Date().toDateString()).getTime()) throw new ValidationError('Next ANC visit date cannot be in the past');
    }
    if (clean.gestationalAgeDays !== undefined && (!Number.isInteger(Number(clean.gestationalAgeDays)) || Number(clean.gestationalAgeDays) < 0 || Number(clean.gestationalAgeDays) > 6)) {
      throw new ValidationError('Gestational age days must be between 0 and 6');
    }
    if (clean.bloodPressure != null && String(clean.bloodPressure).trim() !== '') {
      const parts = String(clean.bloodPressure).trim().replace(/ /g, '').replace('-', '/').split('/');
      const systolic = Number(parts[0]);
      const diastolic = Number(parts[1]);
      if (parts.length !== 2 || !Number.isInteger(systolic) || !Number.isInteger(diastolic) || systolic < 50 || systolic > 260 || diastolic < 20 || diastolic > 160 || systolic <= diastolic) {
        throw new ValidationError('ANC blood pressure must be a plausible systolic/diastolic value, for example 120/80');
      }
    }
    if (clean.iptpDoseNumber !== undefined && (!Number.isInteger(Number(clean.iptpDoseNumber)) || Number(clean.iptpDoseNumber) < 1 || Number(clean.iptpDoseNumber) > 5)) {
      throw new ValidationError('IPTp dose number must be between 1 and 5');
    }
    if (clean.ttDoseNumber !== undefined && (!Number.isInteger(Number(clean.ttDoseNumber)) || Number(clean.ttDoseNumber) < 1 || Number(clean.ttDoseNumber) > 5)) {
      throw new ValidationError('TT dose number must be between 1 and 5');
    }
    if (clean.gestationalAgeWeeks !== undefined && (!Number.isInteger(Number(clean.gestationalAgeWeeks)) || Number(clean.gestationalAgeWeeks) < 0 || Number(clean.gestationalAgeWeeks) > 42)) {
      throw new ValidationError('Gestational age must be between 0 and 42 weeks');
    }
    if (clean.weight !== undefined && (!Number.isFinite(Number(clean.weight)) || Number(clean.weight) <= 0 || Number(clean.weight) > 350)) {
      throw new ValidationError('Weight must be a valid value in kilograms');
    }
    if (clean.fundalHeight !== undefined && (!Number.isFinite(Number(clean.fundalHeight)) || Number(clean.fundalHeight) < 0 || Number(clean.fundalHeight) > 60)) {
      throw new ValidationError('Fundal height must be between 0 and 60 cm');
    }
    if (clean.fetalHeartRate !== undefined && (!Number.isInteger(Number(clean.fetalHeartRate)) || Number(clean.fetalHeartRate) < 60 || Number(clean.fetalHeartRate) > 200)) {
      throw new ValidationError('Fetal heart rate must be between 60 and 200 bpm');
    }
    if (Object.keys(clean).length === 0) throw new ValidationError('No valid ANC visit fields were provided');
    return this.prisma.aNCVisit.update({
      where: { id },
      data: clean,
      include: { recordedBy: { select: { fullName: true, role: true } } },
    });
  }

  async deleteVisit(id: string): Promise<void> {
    await this.prisma.aNCVisit.delete({ where: { id } });
  }

  // ===================== DELIVERY RECORDS =====================
  private mapNewborns(input: any): any[] {
    const list: any[] = Array.isArray(input) ? input : Array.isArray(input?.create) ? input.create : [];
    const allowedOutcomes = ['alive', 'dead_within_24hrs', 'dead_1_7days', 'dead_8_28days', 'referred_out'];
    return list.map((b: any, i: number) => {
      if (!b || !allowedOutcomes.includes(String(b.outcome))) {
        throw new ValidationError(`A confirmed outcome is required for newborn ${i + 1}`);
      }
      const birthWeight = Number(b.birthWeight);
      if (!Number.isFinite(birthWeight) || birthWeight <= 0 || birthWeight > 15000) {
        throw new ValidationError(`Newborn ${i + 1} birth weight must be recorded in grams between 1 and 15000`);
      }
      for (const [field, value] of [['Apgar score at 1 minute', b.apgarScore1min], ['Apgar score at 5 minutes', b.apgarScore5min]] as const) {
        if (value !== undefined && value !== null && (!Number.isInteger(Number(value)) || Number(value) < 0 || Number(value) > 10)) {
          throw new ValidationError(`${field} for newborn ${i + 1} must be an integer between 0 and 10`);
        }
      }
      return {
        order: b.order ?? i + 1, birthWeight, gender: b.gender || 'other',
        apgarScore1min: b.apgarScore1min ?? null, apgarScore5min: b.apgarScore5min ?? null,
        resuscitation: !!b.resuscitation, outcome: b.outcome, anomalies: b.anomalies || [],
        referredTo: b.referredTo || null, breastfeedingWithin30Min: !!b.breastfeedingWithin30Min,
        eyeProphylaxisGiven: !!b.eyeProphylaxisGiven, cordCareMethod: b.cordCareMethod || 'dry_cord',
        babyWeightAt6to10Days: b.babyWeightAt6to10Days ?? null,
        weightAt6to10DaysDate: b.weightAt6to10DaysDate ? new Date(b.weightAt6to10DaysDate) : null
      };
    });
  }

  async createDeliveryRecord(data: CreateDeliveryRecordInput): Promise<any> {
    const babies = this.mapNewborns((data as any).Newborn);

    // The birth record and pregnancy closure must succeed or fail together.
    // Otherwise a failed booking update can leave a duplicate active pregnancy
    // after a delivery has already been recorded.
    return this.prisma.$transaction(async (tx) => {
      const attendance = await tx.attendance.findUnique({
        where: { id: data.attendanceId },
        select: { id: true, patientId: true, attendanceType: true },
      });
      if (!attendance) throw new NotFoundError('Delivery attendance', data.attendanceId);
      if (attendance.patientId !== data.patientId) {
        throw new ValidationError('Delivery patient must match the patient on the selected attendance');
      }
      if (attendance.attendanceType !== 'delivery') {
        throw new ValidationError('Delivery record must be linked to a delivery attendance');
      }
      const deliveryDate = new Date(data.deliveryDate);
      if (Number.isNaN(deliveryDate.getTime())) throw new ValidationError('Delivery date must be valid');
      if (deliveryDate.getTime() > Date.now()) throw new ValidationError('Delivery date cannot be in the future');
      if (!['spontaneous_vertex', 'assisted_breech', 'vacuum', 'forceps', 'caesarean_section', 'multiple'].includes(String(data.deliveryType))) {
        throw new ValidationError('A supported delivery type is required');
      }
      if (!['live_birth', 'stillbirth_fresh', 'stillbirth_macerated', 'neonatal_death'].includes(String(data.deliveryOutcome))) {
        throw new ValidationError('A supported delivery outcome is required');
      }
      if (!['private_hospital', 'government_hospital', 'health_centre', 'clinic', 'chag_facility', 'private_midwife', 'tba_trained', 'tba_untrained', 'home', 'en_route', 'mines_facility', 'quasi_govt_institution'].includes(String(data.placeOfDelivery || 'private_hospital'))) {
        throw new ValidationError('A supported place of delivery is required');
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

      if (!['alive', 'dead_direct_cause', 'dead_indirect_cause', 'dead_unknown'].includes(String(data.maternalOutcome))) {
        throw new ValidationError('A confirmed maternal outcome is required');
      }
      if (data.gestationWeeks !== undefined && (!Number.isInteger(Number(data.gestationWeeks)) || Number(data.gestationWeeks) < 0 || Number(data.gestationWeeks) > 42)) {
        throw new ValidationError('Gestational age at delivery must be between 0 and 42 weeks');
      }
      for (const [field, value] of [['Apgar score at 1 minute', data.apgarScore1min], ['Apgar score at 5 minutes', data.apgarScore5min]] as const) {
        if (value !== undefined && (!Number.isInteger(Number(value)) || Number(value) < 0 || Number(value) > 10)) {
          throw new ValidationError(`${field} must be an integer between 0 and 10`);
        }
      }

      const record = await tx.deliveryRecord.create({
        data: {
          patientId: data.patientId, attendanceId: data.attendanceId, antenatalBookingId: booking?.id,
          deliveryDate, deliveryType: data.deliveryType, deliveryOutcome: data.deliveryOutcome,
          placeOfDelivery: data.placeOfDelivery || 'private_hospital', attendant: data.attendant || 'not_recorded',
          gestationWeeks: data.gestationWeeks, apgarScore1min: data.apgarScore1min, apgarScore5min: data.apgarScore5min,
          resusCitationDone: data.resusCitationDone || false, maternalOutcome: data.maternalOutcome!,
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
    const allowed = [
      'deliveryDate', 'deliveryType', 'deliveryOutcome', 'placeOfDelivery', 'attendant',
      'birthWeight', 'gestationWeeks', 'apgarScore1min', 'apgarScore5min', 'resusCitationDone',
      'maternalOutcome', 'referralTo', 'complications', 'antenatalBookingId',
      'malePartnerPresentANC', 'malePartnerPresentDelivery', 'malePartnerPresentPNC',
      'maternalDeathsAudited', 'auditNotes',
    ];
    const clean: Record<string, any> = {};
    for (const key of allowed) if (data[key] !== undefined) clean[key] = data[key];
    if (clean.deliveryDate !== undefined) {
      const date = new Date(clean.deliveryDate);
      if (Number.isNaN(date.getTime())) throw new ValidationError('Delivery date must be valid');
      clean.deliveryDate = date;
    }
    if (clean.deliveryType !== undefined && !['spontaneous_vertex', 'assisted_breech', 'vacuum', 'forceps', 'caesarean_section', 'multiple'].includes(clean.deliveryType)) {
      throw new ValidationError('Unsupported delivery type');
    }
    if (clean.deliveryOutcome !== undefined && !['live_birth', 'stillbirth_fresh', 'stillbirth_macerated', 'neonatal_death'].includes(clean.deliveryOutcome)) {
      throw new ValidationError('Unsupported delivery outcome');
    }
    if (clean.maternalOutcome !== undefined && !['alive', 'dead_direct_cause', 'dead_indirect_cause', 'dead_unknown'].includes(clean.maternalOutcome)) {
      throw new ValidationError('Unsupported maternal outcome');
    }
    if (clean.birthWeight !== undefined && (!Number.isFinite(Number(clean.birthWeight)) || Number(clean.birthWeight) < 1 || Number(clean.birthWeight) > 15000)) {
      throw new ValidationError('Birth weight must be recorded in grams between 1 and 15000');
    }
    if (clean.gestationWeeks !== undefined && (!Number.isInteger(Number(clean.gestationWeeks)) || Number(clean.gestationWeeks) < 0 || Number(clean.gestationWeeks) > 42)) {
      throw new ValidationError('Gestational age at delivery must be between 0 and 42 weeks');
    }
    for (const field of ['apgarScore1min', 'apgarScore5min']) {
      if (clean[field] !== undefined && (!Number.isInteger(Number(clean[field])) || Number(clean[field]) < 0 || Number(clean[field]) > 10)) {
        throw new ValidationError(`${field} must be an integer between 0 and 10`);
      }
    }
    if (data.Newborn !== undefined && !Array.isArray(data.Newborn) && !Array.isArray(data.Newborn?.create)) {
      throw new ValidationError('Newborn records must be provided as a list');
    }

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.deliveryRecord.findUnique({
        where: { id },
        select: { id: true, patientId: true, deliveryDate: true, deliveryOutcome: true, antenatalBookingId: true },
      });
      if (!existing) throw new NotFoundError('Delivery record', id);

      const bookingId = clean.antenatalBookingId ?? existing.antenatalBookingId;
      let booking: any = null;
      if (bookingId) {
        booking = await tx.antenatalBooking.findUnique({ where: { id: bookingId } });
        if (!booking) throw new NotFoundError('Antenatal booking', bookingId);
        if (booking.patientId !== existing.patientId) throw new ValidationError('Antenatal booking must belong to the delivery patient');
        if (booking.isCompleted && booking.deliveryRecordId && booking.deliveryRecordId !== id) {
          throw new ConflictError('This antenatal booking is already linked to another delivery record');
        }
      }

      const updatePayload: any = { ...clean };
      if (data.Newborn !== undefined) {
        const babies = this.mapNewborns(data.Newborn);
        // Only replace the newborn list when at least one explicit newborn was submitted.
        // An omitted/empty form payload must not erase previously documented babies.
        if (babies.length > 0) updatePayload.Newborn = { deleteMany: {}, create: babies };
      }

      const record = await tx.deliveryRecord.update({
        where: { id },
        data: updatePayload,
        include: { Newborn: true, patient: true, attendance: true },
      });
      if (booking) {
        await tx.antenatalBooking.update({
          where: { id: booking.id },
          data: {
            isActive: false,
            isCompleted: true,
            deliveryDate: record.deliveryDate,
            deliveryOutcome: record.deliveryOutcome,
            deliveryRecordId: record.id,
            updatedAt: new Date(),
          },
        });
      }
      return record;
    });
  }

  async deleteDeliveryRecord(id: string): Promise<void> {
    await this.prisma.deliveryRecord.delete({ where: { id } });
  }

  // ===================== POSTNATAL RECORDS =====================
  async createPostnatalRecord(data: CreatePostnatalRecordInput): Promise<any> {
    const d: any = data;
    const arr = (v: any) => (Array.isArray(v) ? v : []);
    const examinationDate = new Date(d.examinationDate);
    if (Number.isNaN(examinationDate.getTime())) throw new ValidationError('Postnatal examination date must be valid');
    if (examinationDate.getTime() > Date.now()) throw new ValidationError('Postnatal examination date cannot be in the future');
    if (d.dayNumber !== undefined && (!Number.isInteger(Number(d.dayNumber)) || Number(d.dayNumber) < 1 || Number(d.dayNumber) > 365)) {
      throw new ValidationError('Postnatal day number must be between 1 and 365');
    }
    if (d.nextVisitDate) {
      const nextDate = new Date(d.nextVisitDate);
      if (Number.isNaN(nextDate.getTime())) throw new ValidationError('Next postnatal visit date must be valid');
      if (nextDate.getTime() < new Date(new Date().toDateString()).getTime()) throw new ValidationError('Next postnatal visit date cannot be in the past');
    }
    if (d.bloodPressure != null && String(d.bloodPressure).trim() !== '') {
      const parts = String(d.bloodPressure).trim().replace(/ /g, '').replace('-', '/').split('/');
      const systolic = Number(parts[0]);
      const diastolic = Number(parts[1]);
      if (parts.length !== 2 || !Number.isInteger(systolic) || !Number.isInteger(diastolic) || systolic < 50 || systolic > 260 || diastolic < 20 || diastolic > 160 || systolic <= diastolic) throw new ValidationError('Maternal blood pressure must be a plausible systolic/diastolic value, for example 120/80');
    }
    if (d.pulse !== undefined && (!Number.isInteger(Number(d.pulse)) || Number(d.pulse) < 20 || Number(d.pulse) > 250)) throw new ValidationError('Maternal pulse must be between 20 and 250 bpm');
    for (const [field, value] of [['temperature', d.temperature], ['babyTemperature', d.babyTemperature]] as const) {
      if (value !== undefined && value !== null && (!Number.isFinite(Number(value)) || Number(value) < 30 || Number(value) > 45)) throw new ValidationError(`${field === 'temperature' ? 'Maternal' : 'Baby'} temperature must be between 30 and 45 °C`);
    }
    if (d.fundalHeight !== undefined && (!Number.isFinite(Number(d.fundalHeight)) || Number(d.fundalHeight) < 0 || Number(d.fundalHeight) > 60)) throw new ValidationError('Fundal height must be between 0 and 60 cm');
    if (d.babyWeight !== undefined && (!Number.isFinite(Number(d.babyWeight)) || Number(d.babyWeight) < 0.1 || Number(d.babyWeight) > 15)) throw new ValidationError('Baby weight must be between 0.1 and 15 kg');
    if (d.maternalCondition !== undefined && !['good', 'fair', 'poor', 'critical'].includes(d.maternalCondition)) throw new ValidationError('Unsupported maternal condition');
    if (d.babyCondition !== undefined && !['good', 'fair', 'poor', 'critical'].includes(d.babyCondition)) throw new ValidationError('Unsupported newborn condition');
    if (d.breastfeedingStatus !== undefined && !['exclusive', 'mixed', 'not_breastfeeding'].includes(d.breastfeedingStatus)) throw new ValidationError('Unsupported breastfeeding status');
    return this.prisma.$transaction(async (tx) => {
      const attendance = await tx.attendance.findUnique({
        where: { id: d.attendanceId },
        select: { id: true, patientId: true, attendanceType: true },
      });
      if (!attendance) throw new NotFoundError('Postnatal attendance', d.attendanceId);
      if (attendance.patientId !== d.patientId) {
        throw new ValidationError('Postnatal patient must match the selected attendance');
      }
      // The maternal page supports postnatal examination immediately after delivery
      // as well as at a dedicated postnatal attendance.
      if (!['postnatal', 'delivery'].includes(attendance.attendanceType)) {
        throw new ValidationError('Postnatal record must be linked to a delivery or postnatal attendance');
      }

      if (d.antenatalBookingId) {
        const booking = await tx.antenatalBooking.findUnique({ where: { id: d.antenatalBookingId }, select: { id: true, patientId: true } });
        if (!booking) throw new NotFoundError('Antenatal booking', d.antenatalBookingId);
        if (booking.patientId !== d.patientId) throw new ValidationError('Antenatal booking must belong to the postnatal patient');
      }
      if (d.deliveryRecordId) {
        const delivery = await tx.deliveryRecord.findUnique({ where: { id: d.deliveryRecordId }, select: { id: true, patientId: true } });
        if (!delivery) throw new NotFoundError('Delivery record', d.deliveryRecordId);
        if (delivery.patientId !== d.patientId) throw new ValidationError('Delivery record must belong to the postnatal patient');
      }

      return tx.postnatalRecord.create({
        data: {
          patientId: d.patientId, attendanceId: d.attendanceId, antenatalBookingId: d.antenatalBookingId,
          deliveryRecordId: d.deliveryRecordId, examinationDate, dayNumber: d.dayNumber ?? 1,
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
    const allowed = [
      'examinationDate', 'dayNumber', 'maternalCondition', 'maternalComplications',
      'bloodPressure', 'temperature', 'pulse', 'fundalHeight', 'lochia', 'perinealCondition',
      'caesareanWound', 'breastfeedingStatus', 'breastfeedingDifficulties', 'latching',
      'babyCondition', 'babyWeight', 'babyTemperature', 'babyFeeding', 'jaundice',
      'jaundiceSeverity', 'cordCondition', 'bcgGiven', 'opv0Given', 'hepB0Given',
      'familyPlanningDiscussed', 'familyPlanningMethodAccepted', 'maternalDangerSigns',
      'babyDangerSigns', 'referralMade', 'referredTo', 'referralReason', 'nextVisitDate',
      'nextVisitType', 'malePartnerPresentPNC', 'notes',
    ];
    const clean: Record<string, any> = {};
    for (const key of allowed) if (data[key] !== undefined) clean[key] = data[key];
    if (clean.examinationDate !== undefined) {
      const date = new Date(clean.examinationDate);
      if (Number.isNaN(date.getTime())) throw new ValidationError('Postnatal examination date must be valid');
      clean.examinationDate = date;
    }
    if (clean.nextVisitDate !== undefined && clean.nextVisitDate !== null) {
      const date = new Date(clean.nextVisitDate);
      if (Number.isNaN(date.getTime())) throw new ValidationError('Next postnatal visit date must be valid');
      clean.nextVisitDate = date;
    }
    if (clean.dayNumber !== undefined && (!Number.isInteger(Number(clean.dayNumber)) || Number(clean.dayNumber) < 1 || Number(clean.dayNumber) > 365)) {
      throw new ValidationError('Postnatal day number must be between 1 and 365');
    }
    if (clean.temperature !== undefined && (!Number.isFinite(Number(clean.temperature)) || Number(clean.temperature) < 30 || Number(clean.temperature) > 45)) {
      throw new ValidationError('Maternal temperature must be between 30 and 45 °C');
    }
    if (clean.babyTemperature !== undefined && (!Number.isFinite(Number(clean.babyTemperature)) || Number(clean.babyTemperature) < 30 || Number(clean.babyTemperature) > 45)) {
      throw new ValidationError('Baby temperature must be between 30 and 45 °C');
    }
    if (clean.bloodPressure !== undefined && clean.bloodPressure !== null && String(clean.bloodPressure).trim() !== '') {
      const pressureParts = String(clean.bloodPressure).trim().replace(/\s+/g, '').replace('-', '/').split('/');
      const systolic = Number(pressureParts[0]);
      const diastolic = Number(pressureParts[1]);
      if (pressureParts.length !== 2 || !Number.isInteger(systolic) || !Number.isInteger(diastolic) ||
          systolic < 50 || systolic > 260 || diastolic < 20 || diastolic > 160 || systolic <= diastolic) {
        throw new ValidationError('Maternal blood pressure must be a plausible systolic/diastolic value, for example 120/80');
      }
    }
    if (clean.pulse !== undefined && (!Number.isInteger(Number(clean.pulse)) || Number(clean.pulse) < 20 || Number(clean.pulse) > 250)) {
      throw new ValidationError('Maternal pulse must be between 20 and 250 bpm');
    }
    if (clean.fundalHeight !== undefined && (!Number.isFinite(Number(clean.fundalHeight)) || Number(clean.fundalHeight) < 0 || Number(clean.fundalHeight) > 60)) {
      throw new ValidationError('Fundal height must be between 0 and 60 cm');
    }
    if (clean.babyWeight !== undefined && (!Number.isFinite(Number(clean.babyWeight)) || Number(clean.babyWeight) < 0.1 || Number(clean.babyWeight) > 15)) {
      throw new ValidationError('Baby weight must be between 0.1 and 15 kg');
    }
    if (clean.examinationDate !== undefined && clean.examinationDate > new Date()) {
      throw new ValidationError('Postnatal examination date cannot be in the future');
    }
    if (clean.nextVisitDate !== undefined && clean.nextVisitDate !== null && clean.nextVisitDate < new Date()) {
      throw new ValidationError('Next postnatal visit date cannot be in the past');
    }
    if (clean.maternalCondition !== undefined && !['good', 'fair', 'poor', 'critical'].includes(clean.maternalCondition)) {
      throw new ValidationError('Unsupported maternal condition');
    }
    if (clean.babyCondition !== undefined && !['good', 'fair', 'poor', 'critical'].includes(clean.babyCondition)) {
      throw new ValidationError('Unsupported newborn condition');
    }
    if (clean.breastfeedingStatus !== undefined && !['exclusive', 'mixed', 'not_breastfeeding'].includes(clean.breastfeedingStatus)) {
      throw new ValidationError('Unsupported breastfeeding status');
    }
    if (Object.keys(clean).length === 0) throw new ValidationError('No valid postnatal fields were provided');
    return this.prisma.postnatalRecord.update({
      where: { id },
      data: clean,
      include: { patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true } }, deliveryRecord: true },
    });
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