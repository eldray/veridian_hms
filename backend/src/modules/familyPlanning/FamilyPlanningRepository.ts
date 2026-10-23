import { PrismaClient, Prisma } from '@prisma/client';
import { ValidationError } from '../../utils/errors';
import { BaseRepository } from '../../shared/base/BaseRepository';
import { CreateFPServiceInput, UpdateFPServiceInput, FPServiceFilters } from './FamilyPlanningTypes';

export class FamilyPlanningRepository extends BaseRepository<any, CreateFPServiceInput, UpdateFPServiceInput> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'familyPlanningService');
  }

  private getStandardIncludes() {
    return {
      patient: {
        select: {
          id: true, surname: true, otherNames: true, folderNumber: true,
          dateOfBirth: true, gender: true, contact: true,
        },
      },
      providedBy: { select: { id: true, fullName: true, role: true } },
      attendance: { select: { id: true, attendanceNumber: true, dateTime: true } },
      postpartumDeliveryRecord: { select: { id: true, deliveryDate: true, deliveryOutcome: true } },
      postnatalRecord: { select: { id: true, examinationDate: true, familyPlanningDiscussed: true, familyPlanningMethodAccepted: true } },
      postAbortionRecord: { select: { id: true, abortionDate: true, postAbortionFPCounselled: true, postAbortionFPAccepted: true, fpMethodAccepted: true } },
    };
  }

  private async validateMaternalEventLinks(
    input: {
      isPostpartum?: boolean;
      isPostAbortion?: boolean;
      postpartumDeliveryRecordId?: string | null;
      postnatalRecordId?: string | null;
      postAbortionRecordId?: string | null;
    },
    patientId: string,
    serviceDate: Date,
  ) {
    if (input.isPostpartum && input.isPostAbortion) {
      throw new ValidationError('A service cannot be classified as both postpartum and post-abortion');
    }

    if (input.postpartumDeliveryRecordId) {
      if (!input.isPostpartum) throw new ValidationError('A linked delivery requires the service to be marked postpartum');
      const delivery = await this.prisma.deliveryRecord.findUnique({
        where: { id: input.postpartumDeliveryRecordId },
        select: { id: true, patientId: true, deliveryDate: true },
      });
      if (!delivery) throw new ValidationError('The linked delivery record does not exist');
      if (delivery.patientId !== patientId) throw new ValidationError('The linked delivery must belong to the same patient');
      if (new Date(delivery.deliveryDate).getTime() > serviceDate.getTime()) {
        throw new ValidationError('The linked delivery cannot occur after the family-planning service');
      }
    }

    if (input.postnatalRecordId) {
      if (!input.isPostpartum) throw new ValidationError('A linked postnatal record requires the service to be marked postpartum');
      const postnatal = await this.prisma.postnatalRecord.findUnique({
        where: { id: input.postnatalRecordId },
        select: { id: true, patientId: true, examinationDate: true },
      });
      if (!postnatal) throw new ValidationError('The linked postnatal record does not exist');
      if (postnatal.patientId !== patientId) throw new ValidationError('The linked postnatal record must belong to the same patient');
      if (new Date(postnatal.examinationDate).getTime() > serviceDate.getTime()) {
        throw new ValidationError('The linked postnatal record cannot occur after the family-planning service');
      }
    }

    if (input.postAbortionRecordId) {
      if (!input.isPostAbortion) throw new ValidationError('A linked abortion record requires the service to be marked post-abortion');
      const abortion = await this.prisma.abortionRecord.findUnique({
        where: { id: input.postAbortionRecordId },
        select: { id: true, patientId: true, abortionDate: true },
      });
      if (!abortion) throw new ValidationError('The linked abortion record does not exist');
      if (abortion.patientId !== patientId) throw new ValidationError('The linked abortion record must belong to the same patient');
      if (new Date(abortion.abortionDate).getTime() > serviceDate.getTime()) {
        throw new ValidationError('The linked abortion cannot occur after the family-planning service');
      }
    }

    if (input.postpartumDeliveryRecordId && input.postnatalRecordId) {
      const postnatal = await this.prisma.postnatalRecord.findUnique({
        where: { id: input.postnatalRecordId }, select: { deliveryRecordId: true },
      });
      if (postnatal?.deliveryRecordId && postnatal.deliveryRecordId !== input.postpartumDeliveryRecordId) {
        throw new ValidationError('The linked delivery and postnatal records must refer to the same delivery');
      }
    }
  }

  async createFPService(data: CreateFPServiceInput) {
    if (!data.patientId?.trim()) throw new ValidationError('A patient is required for a family-planning service');
    if (!data.providedById?.trim()) throw new ValidationError('Recording staff is required for a family-planning service');
    if (!data.method || !data.methodCategory) throw new ValidationError('A contraceptive method and method category are required');
    if (data.informedConsent !== true) {
      throw new ValidationError('Explicit informed consent must be documented before saving a family-planning method service');
    }

    const methodCategoryByMethod: Record<string, string> = {
      pill_coc: 'modern_short_acting', pill_pop: 'modern_short_acting',
      injectable_dmpa: 'modern_short_acting', injectable_net_en: 'modern_short_acting',
      condom_male: 'modern_short_acting', condom_female: 'modern_short_acting',
      implant_implanon: 'modern_long_acting', implant_jadelle: 'modern_long_acting',
      iud_copper: 'modern_long_acting', iud_hormonal: 'modern_long_acting',
      female_sterilization: 'permanent', male_sterilization: 'permanent',
      lam: 'traditional', withdrawal: 'traditional', calendar: 'traditional',
      other_traditional: 'traditional', emergency_contraception: 'emergency',
    };
    if (methodCategoryByMethod[data.method] !== data.methodCategory) {
      throw new ValidationError('The selected method does not belong to the selected family-planning category');
    }

    const serviceDate = data.serviceDate ? new Date(data.serviceDate) : new Date();
    if (!Number.isFinite(serviceDate.getTime())) throw new ValidationError('Family-planning service date must be valid');
    const now = new Date();
    const serviceDay = new Date(serviceDate.getFullYear(), serviceDate.getMonth(), serviceDate.getDate()).getTime();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    if (serviceDay > today) throw new ValidationError('A family-planning service date cannot be in the future');

    if (data.medicalEligibilityCategory != null &&
      (!Number.isInteger(Number(data.medicalEligibilityCategory)) ||
       Number(data.medicalEligibilityCategory) < 1 || Number(data.medicalEligibilityCategory) > 4)) {
      throw new ValidationError('Medical eligibility category must be WHO MEC category 1, 2, 3 or 4');
    }
    if (data.isPostpartum && data.isPostAbortion) {
      throw new ValidationError('A service cannot be classified as both postpartum and post-abortion');
    }
    if (data.postpartumWeeks != null &&
      (!data.isPostpartum || !Number.isInteger(Number(data.postpartumWeeks)) ||
       Number(data.postpartumWeeks) < 0 || Number(data.postpartumWeeks) > 52)) {
      throw new ValidationError('Postpartum weeks must be a whole number from 0 to 52 and the service must be marked postpartum');
    }
    if (data.cypFactor != null && (!Number.isFinite(Number(data.cypFactor)) || Number(data.cypFactor) < 0)) {
      throw new ValidationError('CYP factor must be a non-negative number');
    }

    const patient = await this.prisma.patient.findUnique({ where: { id: data.patientId }, select: { id: true } });
    if (!patient) throw new ValidationError('The selected family-planning patient does not exist');

    if (data.attendanceId) {
      const attendance = await this.prisma.attendance.findUnique({
        where: { id: data.attendanceId },
        select: { id: true, patientId: true, status: true },
      });
      if (!attendance) throw new ValidationError('The selected attendance does not exist');
      if (attendance.patientId !== data.patientId) {
        throw new ValidationError('Family-planning patient must match the linked attendance patient');
      }
      if (attendance.status === 'cancelled') {
        throw new ValidationError('Family-planning service cannot be recorded against a cancelled attendance');
      }
    }

    await this.validateMaternalEventLinks(data, data.patientId, serviceDate);

    // Determine first-time acceptance from this patient's dated FP history, not a client-supplied checkbox.
    // Same-day additional method records are continuing records, preventing duplicate "new acceptor" counts.
    const priorOrSameDayServices = await this.getModel().count({
      where: {
        patientId: data.patientId,
        serviceDate: { lte: serviceDate },
        OR: [{ attendanceId: null }, { attendance: { is: { status: { not: 'cancelled' } } } }],
      },
    });
    const isNewAcceptor = priorOrSameDayServices === 0;

    return this.getModel().create({
      data: {
        patientId: data.patientId, attendanceId: data.attendanceId || undefined,
        serviceDate, method: data.method as any,
        methodCategory: data.methodCategory as any, isNewAcceptor,
        counsellingGiven: data.counsellingGiven ?? true, informedConsent: data.informedConsent === true,
        sideEffects: data.sideEffects, contraindications: data.contraindications,
        medicalEligibilityCategory: data.medicalEligibilityCategory, nextFollowUpDate: data.nextFollowUpDate,
        isPostpartum: data.isPostpartum || false, isPostAbortion: data.isPostAbortion || false,
        postpartumWeeks: data.postpartumWeeks,
        postpartumDeliveryRecordId: data.postpartumDeliveryRecordId || undefined,
        postnatalRecordId: data.postnatalRecordId || undefined,
        postAbortionRecordId: data.postAbortionRecordId || undefined,
        cypFactor: data.cypFactor ?? this.calculateCYP(data.method),
        providedById: data.providedById, notes: data.notes,
      },
      include: this.getStandardIncludes()
    });
  }

  async getFPServices(filters: FPServiceFilters) {
    const { patientId, method, methodCategory, startDate, endDate, isNewAcceptor, page = 1, limit = 1000 } = filters;
    
    const where: Prisma.FamilyPlanningServiceWhereInput = {};
    if (patientId) where.patientId = patientId;
    if (method) where.method = method as any;
    if (methodCategory) where.methodCategory = methodCategory as any;
    if (isNewAcceptor !== undefined) where.isNewAcceptor = isNewAcceptor;
    
    if (startDate || endDate) {
      where.serviceDate = {};
      if (startDate) where.serviceDate.gte = startDate;
      if (endDate) where.serviceDate.lte = endDate;
    }

    // ✅ Use BaseRepository's findManyWithPagination for consistent pagination
    const result = await this.findManyWithPagination({
      where, include: this.getStandardIncludes(), orderBy: { serviceDate: 'desc' }, page, limit
    });

    return {
      data: result.data,
      pagination: {
        page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages
      }
    };
  }

  // Override findById to include relations
  async findById(id: string) {
    return this.getModel().findUnique({ where: { id }, include: this.getStandardIncludes() });
  }

  async getCurrentMethodForPatient(patientId: string) {
    return this.getModel().findFirst({
      where: { patientId, ...this.activeAttendanceFilter() },
      orderBy: { serviceDate: 'desc' }, include: this.getStandardIncludes()
    });
  }

  async getFPHistoryForPatient(patientId: string) {
    return this.getModel().findMany({
      where: { patientId, ...this.activeAttendanceFilter() },
      orderBy: { serviceDate: 'desc' }, include: this.getStandardIncludes()
    });
  }

  // Override update to include relations
  async update(id: string, data: UpdateFPServiceInput) {
    if (data.method !== undefined || data.methodCategory !== undefined) {
      const current = await this.getModel().findUnique({
        where: { id },
        select: { method: true, methodCategory: true },
      });
      if (!current) throw new ValidationError('Family-planning service not found');

      const method = data.method ?? current.method;
      const methodCategory = data.methodCategory ?? current.methodCategory;
      const expected: Record<string, string> = {
        pill_coc: 'modern_short_acting', pill_pop: 'modern_short_acting',
        injectable_dmpa: 'modern_short_acting', injectable_net_en: 'modern_short_acting',
        condom_male: 'modern_short_acting', condom_female: 'modern_short_acting',
        implant_implanon: 'modern_long_acting', implant_jadelle: 'modern_long_acting',
        iud_copper: 'modern_long_acting', iud_hormonal: 'modern_long_acting',
        female_sterilization: 'permanent', male_sterilization: 'permanent',
        lam: 'traditional', withdrawal: 'traditional', calendar: 'traditional',
        other_traditional: 'traditional', emergency_contraception: 'emergency',
      };
      if (expected[method] !== methodCategory) {
        throw new ValidationError('The selected method does not belong to the selected family-planning category');
      }
    }
    if (data.medicalEligibilityCategory != null &&
      (!Number.isInteger(Number(data.medicalEligibilityCategory)) ||
       Number(data.medicalEligibilityCategory) < 1 || Number(data.medicalEligibilityCategory) > 4)) {
      throw new ValidationError('Medical eligibility category must be WHO MEC category 1, 2, 3 or 4');
    }
    const current = await this.getModel().findUnique({
      where: { id },
      select: {
        patientId: true, serviceDate: true, isPostpartum: true, isPostAbortion: true,
        postpartumDeliveryRecordId: true, postnatalRecordId: true, postAbortionRecordId: true,
      },
    });
    if (!current) throw new ValidationError('Family-planning service not found');
    const merged = {
      isPostpartum: data.isPostpartum ?? current.isPostpartum,
      isPostAbortion: data.isPostAbortion ?? current.isPostAbortion,
      postpartumDeliveryRecordId: data.postpartumDeliveryRecordId === undefined ? current.postpartumDeliveryRecordId : data.postpartumDeliveryRecordId,
      postnatalRecordId: data.postnatalRecordId === undefined ? current.postnatalRecordId : data.postnatalRecordId,
      postAbortionRecordId: data.postAbortionRecordId === undefined ? current.postAbortionRecordId : data.postAbortionRecordId,
    };
    await this.validateMaternalEventLinks(merged, current.patientId, new Date(current.serviceDate));
    return this.getModel().update({ where: { id }, data, include: this.getStandardIncludes() });
  }

  private activeAttendanceFilter(): Prisma.FamilyPlanningServiceWhereInput {
    // Preserve historical standalone records, but exclude services linked to cancelled encounters.
    return { OR: [{ attendanceId: null }, { attendance: { is: { status: { not: 'cancelled' } } } }] };
  }

  async getFPStatistics(startDate?: Date, endDate?: Date) {
    const where: Prisma.FamilyPlanningServiceWhereInput = { ...this.activeAttendanceFilter() };
    if (startDate || endDate) {
      where.serviceDate = {};
      if (startDate) where.serviceDate.gte = startDate;
      if (endDate) where.serviceDate.lte = endDate;
    }

    const [totalServices, newAcceptors, methodMix, categoryMix, clientRows, allServices] = await Promise.all([
      this.getModel().count({ where }),
      this.getModel().count({ where: { ...where, isNewAcceptor: true } }),
      this.getModel().groupBy({ by: ['method'], where, _count: true }),
      this.getModel().groupBy({ by: ['methodCategory'], where, _count: true }),
      this.getModel().findMany({ where, select: { patientId: true } }),
      this.getModel().findMany({ where, select: { cypFactor: true } }),
    ]);

    const currentUsers = new Set(clientRows.map((row: any) => row.patientId)).size;
    const cyp = allServices.reduce((sum: number, s: any) => sum + (s.cypFactor || 0), 0);

    return {
      totalServices, newAcceptors, currentUsers, 
      methodMix: methodMix.reduce((acc: Record<string, number>, m: any) => { acc[m.method] = m._count; return acc; }, {} as Record<string, number>),
      categoryMix: categoryMix.reduce((acc: Record<string, number>, c: any) => { acc[c.methodCategory] = c._count; return acc; }, {} as Record<string, number>),
      cyp: Math.round(cyp * 100) / 100,
    };
  }

  async getMethodMix(startDate?: Date, endDate?: Date) {
    const where: Prisma.FamilyPlanningServiceWhereInput = { ...this.activeAttendanceFilter() };
    if (startDate || endDate) {
      where.serviceDate = {};
      if (startDate) where.serviceDate.gte = startDate;
      if (endDate) where.serviceDate.lte = endDate;
    }

    const methodMix = await this.getModel().groupBy({ by: ['method', 'methodCategory'], where, _count: true });
    const total = methodMix.reduce((sum: number, m: any) => sum + m._count, 0);

    return methodMix.map((m: any) => ({
      method: m.method, category: m.methodCategory, count: m._count,
      percentage: total > 0 ? Math.round((m._count / total) * 10000) / 100 : 0,
    }));
  }

  async getFPClientDetails(patientId: string) {
    // ✅ CRITICAL FIX: Changed 'FamilyPlanningService' to 'familyPlanningServices' 
    // to match the exact relation name defined in your Patient Prisma model.
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        deliveryRecords: {
          where: { deliveryDate: { lte: new Date() } },
          orderBy: { deliveryDate: 'desc' },
          take: 10,
          select: { id: true, deliveryDate: true, deliveryType: true, deliveryOutcome: true },
        },
        postnatalRecords: {
          where: { examinationDate: { lte: new Date() } },
          orderBy: { examinationDate: 'desc' },
          take: 10,
          select: { id: true, examinationDate: true, deliveryRecordId: true, familyPlanningDiscussed: true, familyPlanningMethodAccepted: true },
        },
        abortionRecords: {
          where: { abortionDate: { lte: new Date() } },
          orderBy: { abortionDate: 'desc' },
          take: 10,
          select: { id: true, abortionDate: true, abortionType: true, postAbortionFPCounselled: true, postAbortionFPAccepted: true, fpMethodAccepted: true },
        },
        familyPlanningServices: {
          where: { OR: [{ attendanceId: null }, { attendance: { is: { status: { not: 'cancelled' } } } }] },
          orderBy: { serviceDate: 'desc' },
          include: { providedBy: { select: { id: true, fullName: true, role: true } } },
        },
      },
    });

    if (!patient) return null;

    const fpHistory = patient.familyPlanningServices || [];
    const currentMethod = fpHistory[0] || null;
    const nextFollowUp = currentMethod?.nextFollowUpDate || null;

    return {
      patient: {
        id: patient.id, surname: patient.surname, otherNames: patient.otherNames,
        folderNumber: patient.folderNumber, dateOfBirth: patient.dateOfBirth,
        age: this.calculateAge(patient.dateOfBirth), gender: patient.gender, contact: patient.contact,
      },
      currentMethod, fpHistory, totalVisits: fpHistory.length,
      lastVisitDate: currentMethod?.serviceDate, nextFollowUp,
      maternalEvents: {
        deliveries: patient.deliveryRecords || [],
        postnatalRecords: patient.postnatalRecords || [],
        abortions: patient.abortionRecords || [],
      },
    };
  }

  async getGHSFPReport(startDate: Date, endDate: Date) {
    const where: Prisma.FamilyPlanningServiceWhereInput = {
      ...this.activeAttendanceFilter(),
      serviceDate: { gte: startDate, lte: endDate },
    };

    const [totalServices, methodMix, categoryMix, newAcceptors, postpartumFP, postAbortionFP,
      linkedPostpartumFP, unlinkedPostpartumFP, linkedPostAbortionFP, unlinkedPostAbortionFP] = await Promise.all([
      this.getModel().count({ where }),
      this.getModel().groupBy({ by: ['method'], where, _count: true }),
      this.getModel().groupBy({ by: ['methodCategory'], where, _count: true }),
      this.getModel().count({ where: { ...where, isNewAcceptor: true } }),
      this.getModel().count({ where: { ...where, isPostpartum: true } }),
      this.getModel().count({ where: { ...where, isPostAbortion: true } }),
      this.getModel().count({ where: { AND: [where, {
        isPostpartum: true,
        OR: [{ postpartumDeliveryRecordId: { not: null } }, { postnatalRecordId: { not: null } }],
      }] } }),
      this.getModel().count({ where: { AND: [where, {
        isPostpartum: true, postpartumDeliveryRecordId: null, postnatalRecordId: null,
      }] } }),
      this.getModel().count({ where: { AND: [where, { isPostAbortion: true, postAbortionRecordId: { not: null } }] } }),
      this.getModel().count({ where: { AND: [where, { isPostAbortion: true, postAbortionRecordId: null }] } }),
    ]);

    return {
      period: { startDate, endDate },
      summary: {
        totalServices, newAcceptors, postpartumFP, postAbortionFP,
        linkedPostpartumFP, unlinkedPostpartumFP, linkedPostAbortionFP, unlinkedPostAbortionFP,
      },
      methodMix: methodMix.reduce((acc: Record<string, number>, m: any) => { acc[m.method] = m._count; return acc; }, {} as Record<string, number>),
      categoryMix: categoryMix.reduce((acc: Record<string, number>, c: any) => { acc[c.methodCategory] = c._count; return acc; }, {} as Record<string, number>),
    };
  }

  private calculateCYP(method: string): number {
    const cypFactors: Record<string, number> = {
      pill_coc: 0.0015, pill_pop: 0.0015, injectable_dmpa: 0.25, injectable_net_en: 0.25,
      condom_male: 0.0015, condom_female: 0.0015, implant_implanon: 3.5, implant_jadelle: 3.5,
      iud_copper: 4.0, iud_hormonal: 4.0, female_sterilization: 1.0, male_sterilization: 1.0,
      lam: 0.0015, withdrawal: 0.0015, calendar: 0.0015, other_traditional: 0.0015, emergency_contraception: 0.0015,
    };
    return cypFactors[method] || 0.0015;
  }

  private calculateAge(dateOfBirth: Date): number {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  }
}