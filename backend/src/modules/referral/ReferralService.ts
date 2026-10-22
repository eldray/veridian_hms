import { PrismaClient } from '@prisma/client';
import { ValidationError, NotFoundError } from '../../utils/errors';
import { BaseService } from '../../shared/base/BaseService';
import { ReferralRepository } from './ReferralRepository';
import { CreateOutgoingReferralDTO, CreateIncomingReferralDTO, UpdateReferralStatusDTO, ReferralFilters } from './ReferralTypes';

export class ReferralService extends BaseService {
  private repository: ReferralRepository;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    super('ReferralService');
    this.prisma = prisma;
    this.repository = new ReferralRepository(prisma);
  }

  async getAllReferrals(filters: ReferralFilters) {
    return this.repository.findAll(filters);
  }

  async getReferralById(id: string) {
    return this.repository.findById(id);
  }

  // Validate referral linkage on the server; never rely only on frontend selection.
  async createOutgoingReferral(data: CreateOutgoingReferralDTO, userId: string) {
    if (!data.patientId?.trim()) throw new ValidationError('patientId is required');
    if (!data.referralReason?.trim()) throw new ValidationError('referralReason is required');
    if (!data.referredToFacility?.trim()) throw new ValidationError('referredToFacility is required');

    const patient = await this.prisma.patient.findUnique({
      where: { id: data.patientId },
      select: { id: true }
    });
    if (!patient) throw new NotFoundError('Patient', data.patientId);

    if (data.attendanceId) {
      const attendance = await this.prisma.attendance.findUnique({
        where: { id: data.attendanceId },
        select: { id: true, patientId: true }
      });
      if (!attendance) throw new NotFoundError('Attendance', data.attendanceId);
      if (attendance.patientId !== data.patientId) {
        throw new ValidationError('The selected attendance does not belong to the selected patient');
      }
    }

    return this.repository.createOutgoing(data, userId);
  }

  async createIncomingReferral(data: CreateIncomingReferralDTO, userId: string) {
    if (!data.patientId?.trim()) throw new ValidationError('patientId is required');
    if (!data.referralReason?.trim()) throw new ValidationError('referralReason is required');
    if (!data.referredFromFacility?.trim()) throw new ValidationError('referredFromFacility is required');

    const patient = await this.prisma.patient.findUnique({
      where: { id: data.patientId },
      select: { id: true }
    });
    if (!patient) throw new NotFoundError('Patient', data.patientId);

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