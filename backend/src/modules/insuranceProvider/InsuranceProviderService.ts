import { PrismaClient, InsuranceType } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { InsuranceProviderRepository } from './InsuranceProviderRepository';
import { CreateInsuranceProviderDTO, UpdateInsuranceProviderDTO } from './InsuranceProviderTypes';

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
    return this.repository.create({ 
      ...data, 
      name: data.name.trim(), 
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