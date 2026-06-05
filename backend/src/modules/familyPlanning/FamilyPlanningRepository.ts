// modules/familyPlanning/FamilyPlanningRepository.ts

import { PrismaClient } from '@prisma/client';
import { CreateFPServiceInput, UpdateFPServiceInput, FPServiceFilters } from './FamilyPlanningTypes';

export class FamilyPlanningRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // ===================== CREATE FP SERVICE =====================
  async createFPService(data: CreateFPServiceInput): Promise<any> {
    return this.prisma.familyPlanningService.create({
      data: {
        patientId: data.patientId,
        attendanceId: data.attendanceId,
        serviceDate: data.serviceDate || new Date(),
        method: data.method as any,
        methodCategory: data.methodCategory as any,
        isNewAcceptor: data.isNewAcceptor || false,
        counsellingGiven: data.counsellingGiven ?? true,
        informedConsent: data.informedConsent ?? true,
        sideEffects: data.sideEffects,
        contraindications: data.contraindications,
        medicalEligibilityCategory: data.medicalEligibilityCategory,
        nextFollowUpDate: data.nextFollowUpDate,
        isPostpartum: data.isPostpartum || false,
        isPostAbortion: data.isPostAbortion || false,
        postpartumWeeks: data.postpartumWeeks,
        cypFactor: data.cypFactor || this.calculateCYP(data.method),
        providedById: data.providedById,
        notes: data.notes,
      },
      include: {
        patient: {
          select: {
            id: true,
            surname: true,
            otherNames: true,
            folderNumber: true,
            dateOfBirth: true,
            gender: true,
            contact: true,
          },
        },
        providedBy: {
          select: { id: true, fullName: true, role: true },
        },
      },
    });
  }

  // ===================== GET FP SERVICES =====================
  async getFPServices(filters: FPServiceFilters): Promise<{ records: any[]; total: number }> {
    const { patientId, method, methodCategory, startDate, endDate, isNewAcceptor, page = 1, limit = 50 } = filters;
    
    const where: any = {};
    if (patientId) where.patientId = patientId;
    if (method) where.method = method;
    if (methodCategory) where.methodCategory = methodCategory;
    if (isNewAcceptor !== undefined) where.isNewAcceptor = isNewAcceptor;
    
    if (startDate || endDate) {
      where.serviceDate = {};
      if (startDate) where.serviceDate.gte = startDate;
      if (endDate) where.serviceDate.lte = endDate;
    }

    const skip = (page - 1) * limit;
    const [records, total] = await Promise.all([
      this.prisma.familyPlanningService.findMany({
        where,
        include: {
          patient: {
            select: {
              id: true,
              surname: true,
              otherNames: true,
              folderNumber: true,
              dateOfBirth: true,
              contact: true,
            },
          },
          providedBy: {
            select: { id: true, fullName: true, role: true },
          },
          attendance: {
            select: { id: true, attendanceNumber: true, dateTime: true },
          },
        },
        orderBy: { serviceDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.familyPlanningService.count({ where }),
    ]);

    return { records, total };
  }

  // ===================== GET FP SERVICE BY ID =====================
  async getFPServiceById(id: string): Promise<any | null> {
    return this.prisma.familyPlanningService.findUnique({
      where: { id },
      include: {
        patient: true,
        providedBy: { select: { id: true, fullName: true, role: true } },
        attendance: true,
      },
    });
  }

  // ===================== GET CURRENT METHOD FOR PATIENT =====================
  async getCurrentMethodForPatient(patientId: string): Promise<any | null> {
    // Get the most recent FP service for this patient
    return this.prisma.familyPlanningService.findFirst({
      where: { patientId },
      orderBy: { serviceDate: 'desc' },
      include: {
        patient: true,
        providedBy: { select: { id: true, fullName: true, role: true } },
      },
    });
  }

  // ===================== GET FP HISTORY FOR PATIENT =====================
  async getFPHistoryForPatient(patientId: string): Promise<any[]> {
    return this.prisma.familyPlanningService.findMany({
      where: { patientId },
      orderBy: { serviceDate: 'desc' },
      include: {
        providedBy: { select: { id: true, fullName: true, role: true } },
      },
    });
  }

  // ===================== UPDATE FP SERVICE =====================
  async updateFPService(id: string, data: UpdateFPServiceInput): Promise<any> {
    return this.prisma.familyPlanningService.update({
      where: { id },
      data,
      include: {
        patient: true,
        providedBy: { select: { id: true, fullName: true, role: true } },
      },
    });
  }

  // ===================== DELETE FP SERVICE =====================
  async deleteFPService(id: string): Promise<void> {
    await this.prisma.familyPlanningService.delete({ where: { id } });
  }

  // ===================== STATISTICS =====================
  async getFPStatistics(startDate?: Date, endDate?: Date): Promise<any> {
    const where: any = {};
    if (startDate || endDate) {
      where.serviceDate = {};
      if (startDate) where.serviceDate.gte = startDate;
      if (endDate) where.serviceDate.lte = endDate;
    }

    const [totalServices, newAcceptors, methodMix, categoryMix] = await Promise.all([
      this.prisma.familyPlanningService.count({ where }),
      this.prisma.familyPlanningService.count({ where: { ...where, isNewAcceptor: true } }),
      this.prisma.familyPlanningService.groupBy({
        by: ['method'],
        where,
        _count: true,
      }),
      this.prisma.familyPlanningService.groupBy({
        by: ['methodCategory'],
        where,
        _count: true,
      }),
    ]);

    // Calculate CYP
    const allServices = await this.prisma.familyPlanningService.findMany({
      where,
      select: { cypFactor: true },
    });
    const cyp = allServices.reduce((sum, s) => sum + (s.cypFactor || 0), 0);

    return {
      totalServices,
      newAcceptors,
      currentUsers: totalServices - newAcceptors, // Rough estimate
      methodMix: methodMix.reduce((acc, m) => {
        acc[m.method] = m._count;
        return acc;
      }, {} as Record<string, number>),
      categoryMix: categoryMix.reduce((acc, c) => {
        acc[c.methodCategory] = c._count;
        return acc;
      }, {} as Record<string, number>),
      cyp: Math.round(cyp * 100) / 100,
    };
  }

  // ===================== METHOD MIX REPORT =====================
  async getMethodMix(startDate?: Date, endDate?: Date): Promise<any[]> {
    const where: any = {};
    if (startDate || endDate) {
      where.serviceDate = {};
      if (startDate) where.serviceDate.gte = startDate;
      if (endDate) where.serviceDate.lte = endDate;
    }

    const methodMix = await this.prisma.familyPlanningService.groupBy({
      by: ['method', 'methodCategory'],
      where,
      _count: true,
    });

    const total = methodMix.reduce((sum, m) => sum + m._count, 0);

    return methodMix.map(m => ({
      method: m.method,
      category: m.methodCategory,
      count: m._count,
      percentage: total > 0 ? Math.round((m._count / total) * 10000) / 100 : 0,
    }));
  }

  // ===================== CLIENT DETAILS (FP Register View) =====================
  async getFPClientDetails(patientId: string): Promise<any> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        FamilyPlanningService: {
          orderBy: { serviceDate: 'desc' },
          include: {
            providedBy: { select: { id: true, fullName: true, role: true } },
          },
        },
      },
    });

    if (!patient) return null;

    const fpHistory = patient.FamilyPlanningService || [];
    const currentMethod = fpHistory[0] || null;
    const nextFollowUp = currentMethod?.nextFollowUpDate || null;

    return {
      patient: {
        id: patient.id,
        surname: patient.surname,
        otherNames: patient.otherNames,
        folderNumber: patient.folderNumber,
        dateOfBirth: patient.dateOfBirth,
        age: this.calculateAge(patient.dateOfBirth),
        gender: patient.gender,
        contact: patient.contact,
      },
      currentMethod,
      fpHistory,
      totalVisits: fpHistory.length,
      lastVisitDate: currentMethod?.serviceDate,
      nextFollowUp,
    };
  }

  // ===================== GHS FP REPORT =====================
  async getGHSFPReport(startDate: Date, endDate: Date): Promise<any> {
    const where = {
      serviceDate: { gte: startDate, lte: endDate },
    };

    const [totalServices, methodMix, categoryMix, newAcceptors, postpartumFP, postAbortionFP] = await Promise.all([
      this.prisma.familyPlanningService.count({ where }),
      this.prisma.familyPlanningService.groupBy({
        by: ['method'],
        where,
        _count: true,
      }),
      this.prisma.familyPlanningService.groupBy({
        by: ['methodCategory'],
        where,
        _count: true,
      }),
      this.prisma.familyPlanningService.count({ where: { ...where, isNewAcceptor: true } }),
      this.prisma.familyPlanningService.count({ where: { ...where, isPostpartum: true } }),
      this.prisma.familyPlanningService.count({ where: { ...where, isPostAbortion: true } }),
    ]);

    return {
      period: { startDate, endDate },
      summary: {
        totalServices,
        newAcceptors,
        postpartumFP,
        postAbortionFP,
      },
      methodMix: methodMix.reduce((acc, m) => {
        acc[m.method] = m._count;
        return acc;
      }, {} as Record<string, number>),
      categoryMix: categoryMix.reduce((acc, c) => {
        acc[c.methodCategory] = c._count;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  // ===================== HELPER: Calculate CYP =====================
  private calculateCYP(method: string): number {
    // Couple Year Protection factors (GHS standard)
    const cypFactors: Record<string, number> = {
      pill_coc: 0.0015,
      pill_pop: 0.0015,
      injectable_dmpa: 0.25,
      injectable_net_en: 0.25,
      condom_male: 0.0015,
      condom_female: 0.0015,
      implant_implanon: 3.5,
      implant_jadelle: 3.5,
      iud_copper: 4.0,
      iud_hormonal: 4.0,
      female_sterilization: 1.0,
      male_sterilization: 1.0,
      lam: 0.0015,
      withdrawal: 0.0015,
      calendar: 0.0015,
      other_traditional: 0.0015,
      emergency_contraception: 0.0015,
    };
    return cypFactors[method] || 0.0015;
  }

  // ===================== HELPER: Calculate Age =====================
  private calculateAge(dateOfBirth: Date): number {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }
}