// modules/familyPlanning/FamilyPlanningService.ts

import { PrismaClient } from '@prisma/client';
import { FamilyPlanningRepository } from './FamilyPlanningRepository';
import { CreateFPServiceInput, UpdateFPServiceInput, FPServiceFilters } from './FamilyPlanningTypes';

export class FamilyPlanningService {
  private repository: FamilyPlanningRepository;
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
    this.repository = new FamilyPlanningRepository(this.prisma);
  }

  // ===================== CREATE FP SERVICE =====================
  async createFPService(data: CreateFPServiceInput) {
    // Validate method
    const validMethods = [
      'pill_coc', 'pill_pop', 'injectable_dmpa', 'injectable_net_en',
      'condom_male', 'condom_female', 'implant_implanon', 'implant_jadelle',
      'iud_copper', 'iud_hormonal', 'female_sterilization', 'male_sterilization',
      'lam', 'withdrawal', 'calendar', 'other_traditional', 'emergency_contraception'
    ];

    if (!validMethods.includes(data.method)) {
      throw new Error('Invalid FP method');
    }

    // Validate category
    const validCategories = [
      'modern_short_acting', 'modern_long_acting', 'permanent', 'traditional', 'emergency'
    ];

    if (!validCategories.includes(data.methodCategory)) {
      throw new Error('Invalid FP method category');
    }

    // Check if patient exists
    const patient = await this.prisma.patient.findUnique({
      where: { id: data.patientId },
    });

    if (!patient) {
      throw new Error('Patient not found');
    }

    // If attendanceId provided, verify it exists
    if (data.attendanceId) {
      const attendance = await this.prisma.attendance.findUnique({
        where: { id: data.attendanceId },
      });

      if (!attendance) {
        throw new Error('Attendance not found');
      }
    }

    // Check if this is truly a new acceptor (no previous FP services)
    if (data.isNewAcceptor) {
      const existingServices = await this.prisma.familyPlanningService.count({
        where: { patientId: data.patientId },
      });

      if (existingServices > 0) {
        // Not a new acceptor, update the flag
        data.isNewAcceptor = false;
      }
    }

    return this.repository.createFPService(data);
  }

  // ===================== GET FP SERVICES =====================
  async getFPServices(filters: FPServiceFilters) {
    return this.repository.getFPServices(filters);
  }

  // ===================== GET FP SERVICE BY ID =====================
  async getFPServiceById(id: string) {
    const service = await this.repository.getFPServiceById(id);
    if (!service) {
      throw new Error('FP service not found');
    }
    return service;
  }

  // ===================== GET CURRENT METHOD =====================
  async getCurrentMethodForPatient(patientId: string) {
    return this.repository.getCurrentMethodForPatient(patientId);
  }

  // ===================== GET FP HISTORY =====================
  async getFPHistoryForPatient(patientId: string) {
    return this.repository.getFPHistoryForPatient(patientId);
  }

  // ===================== UPDATE FP SERVICE =====================
  async updateFPService(id: string, data: UpdateFPServiceInput) {
    const existing = await this.repository.getFPServiceById(id);
    if (!existing) {
      throw new Error('FP service not found');
    }

    return this.repository.updateFPService(id, data);
  }

  // ===================== DELETE FP SERVICE =====================
  async deleteFPService(id: string) {
    const existing = await this.repository.getFPServiceById(id);
    if (!existing) {
      throw new Error('FP service not found');
    }

    await this.repository.deleteFPService(id);
  }

  // ===================== STATISTICS =====================
  async getFPStatistics(startDate?: Date, endDate?: Date) {
    return this.repository.getFPStatistics(startDate, endDate);
  }

  // ===================== METHOD MIX =====================
  async getMethodMix(startDate?: Date, endDate?: Date) {
    return this.repository.getMethodMix(startDate, endDate);
  }

  // ===================== CLIENT DETAILS =====================
  async getFPClientDetails(patientId: string) {
    const details = await this.repository.getFPClientDetails(patientId);
    if (!details) {
      throw new Error('Patient not found or no FP services recorded');
    }
    return details;
  }

  // ===================== GHS FP REPORT =====================
  async getGHSFPReport(startDate: Date, endDate: Date) {
    return this.repository.getGHSFPReport(startDate, endDate);
  }
}