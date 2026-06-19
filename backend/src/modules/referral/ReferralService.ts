import { PrismaClient } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { ReferralRepository } from './ReferralRepository';
import { CreateOutgoingReferralDTO, CreateIncomingReferralDTO, UpdateReferralStatusDTO, ReferralFilters } from './ReferralTypes';

export class ReferralService extends BaseService {
  private repository: ReferralRepository;

  constructor(prisma: PrismaClient) {
    super('ReferralService');
    this.repository = new ReferralRepository(prisma);
  }

  async getAllReferrals(filters: ReferralFilters) {
    return this.repository.findAll(filters);
  }

  async getReferralById(id: string) {
    return this.repository.findById(id);
  }

  // ✅ Removed manual corporate account validation (not persisted on ReferralRecord)
  async createOutgoingReferral(data: CreateOutgoingReferralDTO, userId: string) {
    return this.repository.createOutgoing(data, userId);
  }

  async createIncomingReferral(data: CreateIncomingReferralDTO, userId: string) {
    return this.repository.createIncoming(data, userId);
  }

  async updateReferralStatus(id: string, data: UpdateReferralStatusDTO) {
    return this.repository.updateStatus(id, data.status, data);
  }

  async deleteReferral(id: string) {
    await this.repository.delete(id);
  }

  async getReferralsByPatient(patientId: string) {
    return this.repository.findByPatient(patientId);
  }

  // ✅ Consolidated stats logic
  async getDashboardStats() {
    const [pendingCount, urgentReferrals, stats] = await Promise.all([
      this.repository.getPendingCount(),
      this.repository.getUrgentList(10),
      this.repository.getStats()
    ]);

    return {
      pendingCount,
      urgentCount: urgentReferrals.length,
      urgentReferrals,
      ...stats
    };
  }
}