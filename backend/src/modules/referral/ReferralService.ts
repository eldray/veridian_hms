// backend/src/modules/referral/ReferralService.ts

import { ReferralRepository } from './ReferralRepository';
import { 
  CreateOutgoingReferralDTO, 
  CreateIncomingReferralDTO, 
  UpdateReferralStatusDTO,
  ReferralFilters 
} from './ReferralTypes';
import { ReferralStatus } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';

export class ReferralService extends BaseService {
  private repository: ReferralRepository;

  constructor() {
    super('ReferralService');
    this.repository = new ReferralRepository();
  }

  async getAllReferrals(filters: ReferralFilters) {
    this.logger.info('Fetching referrals with filters', { filters });
    return await this.repository.findAll(filters);
  }

  async getReferralById(id: string) {
    this.logger.info('Fetching referral by ID', { id });
    return await this.repository.findById(id);
  }

  async createOutgoingReferral(data: CreateOutgoingReferralDTO, userId: string) {
    this.logger.info('Creating outgoing referral', { patientId: data.patientId, userId });
    
    // Validate patient exists (will throw if not found)
    // This validation is now handled in repository via Prisma foreign key
    
    const referral = await this.repository.createOutgoing(data, userId);
    
    this.logger.info('Outgoing referral created', { 
      referralId: referral.id, 
      referralNumber: referral.referralNumber 
    });
    
    return referral;
  }

  async createIncomingReferral(data: CreateIncomingReferralDTO, userId: string) {
    this.logger.info('Creating incoming referral', { patientId: data.patientId, userId });
    
    const referral = await this.repository.createIncoming(data, userId);
    
    this.logger.info('Incoming referral created', { 
      referralId: referral.id, 
      referralNumber: referral.referralNumber 
    });
    
    return referral;
  }

  async updateReferralStatus(id: string, data: UpdateReferralStatusDTO) {
    this.logger.info('Updating referral status', { id, status: data.status });
    
    const referral = await this.repository.updateStatus(id, data.status, {
      acceptanceNotes: data.acceptanceNotes,
      rejectedReason: data.rejectedReason
    });
    
    this.logger.info('Referral status updated', { 
      id, 
      status: referral.status 
    });
    
    return referral;
  }

  async deleteReferral(id: string) {
    this.logger.info('Deleting referral', { id });
    await this.repository.delete(id);
    this.logger.info('Referral deleted', { id });
    return { success: true, message: 'Referral deleted successfully' };
  }

  async getReferralsByPatient(patientId: string) {
    this.logger.info('Fetching referrals for patient', { patientId });
    return await this.repository.findByPatient(patientId);
  }

  // Business logic helpers
  async getPendingReferralsCount() {
    const filters: ReferralFilters = { status: 'pending' as ReferralStatus, limit: 1 };
    const result = await this.repository.findAll(filters);
    return result.pagination.total;
  }

  async getUrgentReferrals() {
    const filters: ReferralFilters = { 
      status: 'pending' as ReferralStatus, 
      limit: 100 
    };
    const result = await this.repository.findAll(filters);
    
    // Filter urgent ones in service layer
    return result.data.filter(r => r.urgency === 'urgent' || r.urgency === 'stat');
  }
}
