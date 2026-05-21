// modules/referral/ReferralService.ts
import { PrismaClient } from '@prisma/client';
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

  constructor(prisma: PrismaClient) {  // ✅ FIXED - pass prisma
    super('ReferralService');
    this.repository = new ReferralRepository(prisma);
  }

  async getAllReferrals(filters: ReferralFilters) {
    this.logInfo('Fetching referrals with filters', { filters });
    return await this.repository.findAll(filters);
  }

  async getReferralById(id: string) {
    this.logInfo('Fetching referral by ID', { id });
    return await this.repository.findById(id);
  }

  async createOutgoingReferral(data: CreateOutgoingReferralDTO, userId: string) {
    this.logInfo('Creating outgoing referral', { 
      patientId: data.patientId, 
      userId,
      paymentMode: data.corporateAccountId ? 'corporate' : (data.insuranceProviderId ? 'insurance' : 'cash')
    });
    
    // ✅ ADDED - Validate corporate account if provided
    if (data.corporateAccountId) {
      const corporateAccount = await (this.repository as any).prisma.corporateAccount.findUnique({
        where: { id: data.corporateAccountId }
      });
      if (!corporateAccount || !corporateAccount.isActive) {
        throw new Error('Invalid or inactive corporate account');
      }
      this.logInfo('Corporate account validated for referral', { corporateAccountId: data.corporateAccountId });
    }
    
    const referral = await this.repository.createOutgoing(data, userId);
    
    this.logInfo('Outgoing referral created', { 
      referralId: referral.id, 
      referralNumber: referral.referralNumber 
    });
    
    return referral;
  }

  async createIncomingReferral(data: CreateIncomingReferralDTO, userId: string) {
    this.logInfo('Creating incoming referral', { patientId: data.patientId, userId });
    
    const referral = await this.repository.createIncoming(data, userId);
    
    this.logInfo('Incoming referral created', { 
      referralId: referral.id, 
      referralNumber: referral.referralNumber 
    });
    
    return referral;
  }

  async updateReferralStatus(id: string, data: UpdateReferralStatusDTO) {
    this.logInfo('Updating referral status', { id, status: data.status });
    
    const referral = await this.repository.updateStatus(id, data.status, {
      acceptanceNotes: data.acceptanceNotes,
      rejectedReason: data.rejectedReason,
      outcomeNotes: data.outcomeNotes  // ✅ ADDED
    });
    
    this.logInfo('Referral status updated', { 
      id, 
      status: referral.status 
    });
    
    return referral;
  }

  async deleteReferral(id: string) {
    this.logInfo('Deleting referral', { id });
    await this.repository.delete(id);
    this.logInfo('Referral deleted', { id });
    return { success: true, message: 'Referral deleted successfully' };
  }

  async getReferralsByPatient(patientId: string) {
    this.logInfo('Fetching referrals for patient', { patientId });
    return await this.repository.findByPatient(patientId);
  }

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
    return result.data.filter(r => r.urgency === 'urgent' || r.urgency === 'stat');
  }
  
  // ✅ NEW - Get referral statistics
  async getReferralStats() {
    this.logInfo('Fetching referral statistics');
    return await this.repository.getStats();
  }
}