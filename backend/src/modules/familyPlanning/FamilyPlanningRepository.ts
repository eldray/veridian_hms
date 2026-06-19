import { PrismaClient, Prisma } from '@prisma/client';
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
    };
  }

  async createFPService(data: CreateFPServiceInput) {
    return this.getModel().create({
      data: {
        patientId: data.patientId, attendanceId: data.attendanceId,
        serviceDate: data.serviceDate || new Date(), method: data.method as any,
        methodCategory: data.methodCategory as any, isNewAcceptor: data.isNewAcceptor || false,
        counsellingGiven: data.counsellingGiven ?? true, informedConsent: data.informedConsent ?? true,
        sideEffects: data.sideEffects, contraindications: data.contraindications,
        medicalEligibilityCategory: data.medicalEligibilityCategory, nextFollowUpDate: data.nextFollowUpDate,
        isPostpartum: data.isPostpartum || false, isPostAbortion: data.isPostAbortion || false,
        postpartumWeeks: data.postpartumWeeks, cypFactor: data.cypFactor || this.calculateCYP(data.method),
        providedById: data.providedById, notes: data.notes,
      },
      include: this.getStandardIncludes()
    });
  }

  async getFPServices(filters: FPServiceFilters) {
    const { patientId, method, methodCategory, startDate, endDate, isNewAcceptor, page = 1, limit = 50 } = filters;
    
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
      where: { patientId }, orderBy: { serviceDate: 'desc' }, include: this.getStandardIncludes()
    });
  }

  async getFPHistoryForPatient(patientId: string) {
    return this.getModel().findMany({
      where: { patientId }, orderBy: { serviceDate: 'desc' }, include: this.getStandardIncludes()
    });
  }

  // Override update to include relations
  async update(id: string, data: UpdateFPServiceInput) {
    return this.getModel().update({ where: { id }, data, include: this.getStandardIncludes() });
  }

  async getFPStatistics(startDate?: Date, endDate?: Date) {
    const where: Prisma.FamilyPlanningServiceWhereInput = {};
    if (startDate || endDate) {
      where.serviceDate = {};
      if (startDate) where.serviceDate.gte = startDate;
      if (endDate) where.serviceDate.lte = endDate;
    }

    const [totalServices, newAcceptors, methodMix, categoryMix] = await Promise.all([
      this.getModel().count({ where }),
      this.getModel().count({ where: { ...where, isNewAcceptor: true } }),
      this.getModel().groupBy({ by: ['method'], where, _count: true }),
      this.getModel().groupBy({ by: ['methodCategory'], where, _count: true }),
    ]);

    const allServices = await this.getModel().findMany({ where, select: { cypFactor: true } });
    const cyp = allServices.reduce((sum, s) => sum + (s.cypFactor || 0), 0);

    return {
      totalServices, newAcceptors, currentUsers: totalServices - newAcceptors, 
      methodMix: methodMix.reduce((acc, m) => { acc[m.method] = m._count; return acc; }, {} as Record<string, number>),
      categoryMix: categoryMix.reduce((acc, c) => { acc[c.methodCategory] = c._count; return acc; }, {} as Record<string, number>),
      cyp: Math.round(cyp * 100) / 100,
    };
  }

  async getMethodMix(startDate?: Date, endDate?: Date) {
    const where: Prisma.FamilyPlanningServiceWhereInput = {};
    if (startDate || endDate) {
      where.serviceDate = {};
      if (startDate) where.serviceDate.gte = startDate;
      if (endDate) where.serviceDate.lte = endDate;
    }

    const methodMix = await this.getModel().groupBy({ by: ['method', 'methodCategory'], where, _count: true });
    const total = methodMix.reduce((sum, m) => sum + m._count, 0);

    return methodMix.map(m => ({
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
        familyPlanningServices: {
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
    };
  }

  async getGHSFPReport(startDate: Date, endDate: Date) {
    const where = { serviceDate: { gte: startDate, lte: endDate } };

    const [totalServices, methodMix, categoryMix, newAcceptors, postpartumFP, postAbortionFP] = await Promise.all([
      this.getModel().count({ where }),
      this.getModel().groupBy({ by: ['method'], where, _count: true }),
      this.getModel().groupBy({ by: ['methodCategory'], where, _count: true }),
      this.getModel().count({ where: { ...where, isNewAcceptor: true } }),
      this.getModel().count({ where: { ...where, isPostpartum: true } }),
      this.getModel().count({ where: { ...where, isPostAbortion: true } }),
    ]);

    return {
      period: { startDate, endDate },
      summary: { totalServices, newAcceptors, postpartumFP, postAbortionFP },
      methodMix: methodMix.reduce((acc, m) => { acc[m.method] = m._count; return acc; }, {} as Record<string, number>),
      categoryMix: categoryMix.reduce((acc, c) => { acc[c.methodCategory] = c._count; return acc; }, {} as Record<string, number>),
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