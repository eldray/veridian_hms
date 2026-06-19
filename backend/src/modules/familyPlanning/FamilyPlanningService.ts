import { PrismaClient } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { FamilyPlanningRepository } from './FamilyPlanningRepository';
import { CreateFPServiceInput, UpdateFPServiceInput, FPServiceFilters } from './FamilyPlanningTypes';

export class FamilyPlanningService extends BaseService {
  private repository: FamilyPlanningRepository;

  constructor(prisma: PrismaClient) {
    super('FamilyPlanningService');
    this.repository = new FamilyPlanningRepository(prisma);
  }

  async createFPService(data: CreateFPServiceInput) {
    // ✅ REMOVED manual patient/attendance existence checks!
    // Because patientId and attendanceId are foreign keys in your schema, 
    // Prisma will automatically throw a P2003 error if they don't exist.
    // BaseController.error() automatically maps P2003 to a clean 400 Bad Request.

    // Business logic: Check if this is truly a new acceptor
    if (data.isNewAcceptor) {
      const existingCount = await this.repository.count({ patientId: data.patientId });
      if (existingCount > 0) {
        data.isNewAcceptor = false; // Auto-correct if they already have a history
      }
    }

    return this.repository.createFPService(data);
  }

  async getFPServices(filters: FPServiceFilters) {
    return this.repository.getFPServices(filters);
  }

  async getFPServiceById(id: string) {
    // ✅ Uses BaseRepository's findById. If not found, Prisma throws P2025 (mapped to 404).
    const service = await this.repository.findById(id);
    if (!service) throw new Error('FP service not found');
    return service;
  }

  async getCurrentMethodForPatient(patientId: string) {
    return this.repository.getCurrentMethodForPatient(patientId);
  }

  async getFPHistoryForPatient(patientId: string) {
    return this.repository.getFPHistoryForPatient(patientId);
  }

  async updateFPService(id: string, data: UpdateFPServiceInput) {
    // ✅ REMOVED manual existence check. Prisma throws P2025 if not found (mapped to 404).
    return this.repository.update(id, data);
  }

  async deleteFPService(id: string) {
    // ✅ REMOVED manual existence check. Prisma throws P2025 if not found (mapped to 404).
    await this.repository.delete(id);
  }

  async getFPStatistics(startDate?: Date, endDate?: Date) {
    return this.repository.getFPStatistics(startDate, endDate);
  }

  async getMethodMix(startDate?: Date, endDate?: Date) {
    return this.repository.getMethodMix(startDate, endDate);
  }

  async getFPClientDetails(patientId: string) {
    const details = await this.repository.getFPClientDetails(patientId);
    if (!details) throw new Error('Patient not found or no FP services recorded');
    return details;
  }

  async getGHSFPReport(startDate: Date, endDate: Date) {
    return this.repository.getGHSFPReport(startDate, endDate);
  }
}