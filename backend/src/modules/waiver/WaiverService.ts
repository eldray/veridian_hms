import { PrismaClient, WaiverStatus, WaiverType } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { WaiverRepository } from './WaiverRepository';

// ✅ Helper to safely convert Prisma Decimal objects to JS numbers for math
const toNumber = (val: any): number => val ? parseFloat(val.toString()) : 0;

export class WaiverService extends BaseService {
  private repository: WaiverRepository;

  constructor(prisma: PrismaClient) {
    super('WaiverService');
    this.repository = new WaiverRepository(prisma);
  }

  async create(data: any) {
    const { billId, patientId, waiverType, amountRequested, reason, requestedById, supportingDocs } = data;

    if (!patientId || !amountRequested || !reason || !requestedById) {
      throw new Error('Patient ID, amount requested, reason, and requested by are required');
    }

    const validTypes: WaiverType[] = ['indigent', 'nhis_exempt', 'staff_discount', 'management_discretion', 'other'];
    const finalWaiverType = waiverType || 'other';
    if (!validTypes.includes(finalWaiverType)) {
      throw new Error(`Invalid waiver type. Must be one of: ${validTypes.join(', ')}`);
    }

    let finalPatientId = patientId;
    let bill = null;
    
    if (billId) {
      bill = await this.repository.getBillById(billId);
      if (!bill) throw new Error('Bill not found');
      if (!finalPatientId) finalPatientId = bill.patientId;
    }

    return this.repository.create({
      billId: billId || null, patientId: finalPatientId, waiverType: finalWaiverType,
      amountRequested: parseFloat(amountRequested), amountApproved: 0, reason,
      status: 'pending', requestedById, supportingDocs: supportingDocs || []
    });
  }

  async getAll(filters: any) {
    return this.repository.findAll(filters);
  }

  async getById(id: string) {
    const waiver = await this.repository.findById(id);
    if (!waiver) throw new Error('Waiver not found');
    return waiver;
  }

  // ✅ FIXED: Decimal math for bill updates
  async approve(id: string, approvedById: string, amountApproved?: number, rejectionReason?: string) {
    const waiver = await this.repository.findById(id);
    if (!waiver) throw new Error('Waiver not found');
    if (waiver.status !== 'pending') throw new Error(`Waiver is already ${waiver.status}`);

    const finalAmountApproved = amountApproved !== undefined ? amountApproved : waiver.amountRequested;
    if (finalAmountApproved > waiver.amountRequested) {
      throw new Error(`Approved amount (${finalAmountApproved}) cannot exceed requested amount (${waiver.amountRequested})`);
    }

    return this.repository.approve(id, approvedById, finalAmountApproved, rejectionReason);
  }

  async reject(id: string, approvedById: string, rejectionReason: string) {
    if (!rejectionReason) throw new Error('Rejection reason is required');
    const waiver = await this.repository.findById(id);
    if (!waiver) throw new Error('Waiver not found');
    if (waiver.status !== 'pending') throw new Error(`Waiver is already ${waiver.status}`);
    return this.repository.reject(id, approvedById, rejectionReason);
  }

  // ✅ FIXED: Decimal math for statistics
  async getStatistics(filters: any) {
    const stats = await this.repository.getStatistics(filters);
    
    // Parse all Decimal aggregates to numbers
    return {
      ...stats,
      totalRequestedAmount: toNumber(stats.totalRequestedAmount),
      totalApprovedAmount: toNumber(stats.totalApprovedAmount),
      averageRequestedAmount: stats.totalWaivers > 0 ? toNumber(stats.totalRequestedAmount) / stats.totalWaivers : 0,
      averageApprovedAmount: stats.approvedWaivers > 0 ? toNumber(stats.totalApprovedAmount) / stats.approvedWaivers : 0
    };
  }

  async getByBillId(billId: string) { return this.repository.findByBillId(billId); }
  async getByPatientId(patientId: string) { return this.repository.findByPatientId(patientId); }

  async update(id: string, data: any) {
    const waiver = await this.repository.findById(id);
    if (!waiver) throw new Error('Waiver not found');
    if (waiver.status !== 'pending') throw new Error('Only pending waivers can be updated');
    
    const updateData: any = {};
    if (data.amountRequested !== undefined) updateData.amountRequested = parseFloat(data.amountRequested);
    if (data.reason !== undefined) updateData.reason = data.reason;
    if (data.supportingDocs !== undefined) updateData.supportingDocs = data.supportingDocs;
    
    return this.repository.update(id, updateData);
  }

  async delete(id: string) {
    const waiver = await this.repository.findById(id);
    if (!waiver) throw new Error('Waiver not found');
    if (waiver.status !== 'pending') throw new Error('Only pending waivers can be deleted');
    return this.repository.delete(id);
  }
}