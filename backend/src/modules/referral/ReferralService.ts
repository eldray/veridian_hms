import { PrismaClient } from '@prisma/client';
import { ValidationError, NotFoundError } from '../../utils/errors';
import { BaseService } from '../../shared/base/BaseService';
import { ReferralRepository } from './ReferralRepository';
import {
  CreateOutgoingReferralDTO,
  CreateIncomingReferralDTO,
  UpdateReferralStatusDTO,
  ReferralFilters,
  ReferralPartI,
  ReferralPartII,
  ReferralStructuredForm,
  PART_I_KEYS,
  PART_II_KEYS,
} from './ReferralTypes';

/** Longest single answer accepted for a structured-form field. */
const MAX_FIELD_LENGTH = 4000;

/**
 * Keeps the stored JSON to the declared field set: unknown keys are dropped, values are
 * trimmed strings, and an all-blank part is treated as "not filled in" so a referral
 * created without the structured form does not carry an empty shell.
 */
function normalizePart<K extends string>(
  raw: unknown,
  keys: readonly K[],
  label: string,
): Partial<Record<K, string>> | undefined {
  if (raw == null) return undefined;
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ValidationError(`${label} must be an object`);
  }
  const source = raw as Record<string, unknown>;
  const clean: Partial<Record<K, string>> = {};
  let filled = 0;
  for (const key of keys) {
    const value = source[key];
    if (value == null) continue;
    if (typeof value !== 'string' && typeof value !== 'number') {
      throw new ValidationError(`${label}.${key} must be text`);
    }
    const text = String(value).trim();
    if (text.length > MAX_FIELD_LENGTH) {
      throw new ValidationError(`${label}.${key} is too long (max ${MAX_FIELD_LENGTH} characters)`);
    }
    clean[key] = text;
    if (text) filled += 1;
  }
  return filled > 0 ? clean : undefined;
}

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
    if (!data.referredToFacility?.trim()) throw new ValidationError('referredToFacility is required');

    const partI = normalizePart(data.structuredForm?.partI, PART_I_KEYS, 'structuredForm.partI') as Partial<ReferralPartI> | undefined;
    // The structured form is the entry surface, so its "reason for referral" answers the
    // flat column the list and filters read; an explicitly sent flat reason still wins.
    const referralReason = data.referralReason?.trim() || partI?.reasonForReferral?.trim() || '';
    if (!referralReason) throw new ValidationError('referralReason is required');
    if (!partI?.actionsTaken?.trim()) {
      throw new ValidationError('Part I must record the actions taken before referral');
    }

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

    return this.repository.createOutgoing({
      ...data,
      referralReason,
      structuredForm: partI ? { partI } : undefined,
    }, userId);
  }

  async createIncomingReferral(data: CreateIncomingReferralDTO, userId: string) {
    if (!data.patientId?.trim()) throw new ValidationError('patientId is required');
    if (!data.referredFromFacility?.trim()) throw new ValidationError('referredFromFacility is required');

    const partII = normalizePart(data.structuredForm?.partII, PART_II_KEYS, 'structuredForm.partII') as Partial<ReferralPartII> | undefined;
    const referralReason = data.referralReason?.trim() || partII?.findings?.trim() || '';
    if (!referralReason) throw new ValidationError('referralReason is required');

    const patient = await this.prisma.patient.findUnique({
      where: { id: data.patientId },
      select: { id: true }
    });
    if (!patient) throw new NotFoundError('Patient', data.patientId);

    return this.repository.createIncoming({
      ...data,
      referralReason,
      structuredForm: partII ? { partII } : undefined,
    }, userId);
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