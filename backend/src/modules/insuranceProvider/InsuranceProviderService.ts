import { PrismaClient, InsuranceType } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { InsuranceProviderRepository } from './InsuranceProviderRepository';
import { CreateInsuranceProviderDTO, UpdateInsuranceProviderDTO } from './InsuranceProviderTypes';

const isPremierProvider = (name: string) => /\bpremier\s+health\b/i.test(String(name || '').trim());

const validatePremierBenefitPolicy = (policy: any) => {
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) {
    throw new Error('Premier Health Insurance benefit caps must be configured.');
  }
  if (policy.version !== 1 || policy.scheme !== 'premier_health') {
    throw new Error('Unsupported Premier benefit policy version.');
  }
  if (Number(policy.opd?.perVisitCap) !== 350 ||
      Number(policy.opd?.maxVisitsPerCalendarMonth) !== 2 ||
      policy.opd?.deferFirstVisitExcess !== true) {
    throw new Error('Premier OPD must be GHS 350 per visit, maximum two visits per calendar month, with first-visit excess deferred.');
  }
  if (Number(policy.ipd?.perAdmissionCap) !== 1200) {
    throw new Error('Premier IPD cap must be GHS 1,200 per admission.');
  }
  if (![2000, 2200].includes(Number(policy.surgery?.cap))) {
    throw new Error('Premier surgery cap must be GHS 2,000 or GHS 2,200.');
  }
  return {
    version: 1,
    scheme: 'premier_health',
    opd: { perVisitCap: 350, maxVisitsPerCalendarMonth: 2, deferFirstVisitExcess: true },
    ipd: { perAdmissionCap: 1200 },
    surgery: { cap: Number(policy.surgery.cap) },
    aggregateCategories: ['service', 'procedure', 'medicine', 'investigation'],
  };
};

export class InsuranceProviderService extends BaseService {
  private repository: InsuranceProviderRepository;

  constructor(prisma: PrismaClient) {
    super('InsuranceProviderService');
    this.repository = new InsuranceProviderRepository(prisma);
  }

  async getAllProviders(filters: { isActive?: boolean; type?: InsuranceType }) {
    return this.repository.findAll(filters);
  }

  async getProviderById(id: string) {
    return this.repository.findById(id);
  }

  // ✅ REMOVED manual findByName check! 
  // Because 'name' has a @unique constraint in your schema, Prisma will throw P2002 if duplicate.
  // BaseController.error() automatically maps P2002 to a clean 400 Bad Request.
  async createProvider(data: CreateInsuranceProviderDTO) {
    const name = data.name.trim();
    const premier = data.type === InsuranceType.private && isPremierProvider(name);
    if (data.benefitPolicy && !premier) {
      throw new Error('Benefit-cap configuration is currently supported only for Premier Health Insurance.');
    }
    const benefitPolicy = premier ? validatePremierBenefitPolicy(data.benefitPolicy) : null;
    return this.repository.create({
      ...data,
      benefitPolicy,
      // NHIS uses tariff rules; Premier uses fixed benefit caps rather than a percentage.
      coveragePercentage: data.type === InsuranceType.nhis || premier ? 100 : data.coveragePercentage,
      name,
      isActive: data.isActive ?? true
    });
  }

  // ✅ REMOVED manual existence and duplicate checks!
  // Prisma handles P2025 (Not Found) and P2002 (Duplicate Name) automatically.
  async updateProvider(id: string, data: UpdateInsuranceProviderDTO) {
    const updateData: any = { ...data };
    if (updateData.name) updateData.name = updateData.name.trim();
    if (updateData.coveragePercentage !== undefined) {
      updateData.coveragePercentage = parseFloat(updateData.coveragePercentage as any);
    }
    const existing = await this.repository.findTypeById(id);
    const effectiveType = updateData.type ?? existing?.type;
    const effectiveName = updateData.name ?? existing?.name ?? '';
    const premier = effectiveType === InsuranceType.private && isPremierProvider(effectiveName);
    if (premier) {
      updateData.benefitPolicy = validatePremierBenefitPolicy(updateData.benefitPolicy ?? existing?.benefitPolicy);
      updateData.coveragePercentage = 100;
    } else {
      if (updateData.benefitPolicy) {
        throw new Error('Benefit-cap configuration is currently supported only for Premier Health Insurance.');
      }
      if (updateData.name !== undefined || updateData.type !== undefined) updateData.benefitPolicy = null;
    }
    if (effectiveType === InsuranceType.nhis) {
      // Prevent API clients and older screens from reintroducing an NHIS percentage.
      updateData.coveragePercentage = 100;
    }
    return this.repository.update(id, updateData);
  }

  // ✅ REMOVED manual hasRelatedRecords check!
  // Because InsuranceProvider is a foreign key in Patient, Attendance, Bill, etc.,
  // Prisma will throw a P2003 error if you try to delete it while records exist.
  // BaseController.error() automatically maps P2003 to a 400 Bad Request.
  async deleteProvider(id: string) {
    await this.repository.delete(id);
  }

  async toggleProviderStatus(id: string) {
    return this.repository.toggleStatus(id);
  }

  async getProviderStats(id: string) {
    return this.repository.getProviderStats(id);
  }

  async getInsuranceTypes(): Promise<string[]> {
    return Object.values(InsuranceType);
  }
}