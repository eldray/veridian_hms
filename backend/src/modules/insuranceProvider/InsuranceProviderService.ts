// InsuranceProviderService.ts
import { InsuranceProviderRepository } from './InsuranceProviderRepository';
import { CreateInsuranceProviderDTO, UpdateInsuranceProviderDTO, InsuranceProviderStats } from './InsuranceProviderTypes';
import { InsuranceType } from '@prisma/client';

export class InsuranceProviderService {
  private insuranceProviderRepository: InsuranceProviderRepository;

  constructor(insuranceProviderRepository?: InsuranceProviderRepository) {
    this.insuranceProviderRepository = insuranceProviderRepository || new InsuranceProviderRepository();
  }

  async getAllProviders(filters: { isActive?: boolean; type?: InsuranceType }) {
    return this.insuranceProviderRepository.findAll(filters);
  }

  async getProviderById(id: string) {
    return this.insuranceProviderRepository.findById(id);
  }

  async createProvider(data: CreateInsuranceProviderDTO) {
    // Check for duplicate name
    const existingProvider = await this.insuranceProviderRepository.findByName(data.name);
    
    if (existingProvider) {
      throw new Error('An insurance provider with this name already exists');
    }

    return this.insuranceProviderRepository.create({
      ...data,
      name: data.name.trim(),
      isActive: data.isActive !== undefined ? data.isActive : true
    });
  }

  async updateProvider(id: string, data: UpdateInsuranceProviderDTO) {
    // Check if provider exists
    const existingProvider = await this.insuranceProviderRepository.findById(id);
    
    if (!existingProvider) {
      throw new Error('Insurance provider not found');
    }

    // Check for duplicate name if name is being updated
    if (data.name && data.name !== existingProvider.name) {
      const duplicateProvider = await this.insuranceProviderRepository.findByName(data.name, id);
      
      if (duplicateProvider) {
        throw new Error('Another insurance provider with this name already exists');
      }
    }

    const updateData: Partial<UpdateInsuranceProviderDTO> = { ...data };
    
    if (updateData.name) {
      updateData.name = updateData.name.trim();
    }
    
    if (updateData.coveragePercentage !== undefined) {
      updateData.coveragePercentage = parseFloat(updateData.coveragePercentage as any);
    }

    return this.insuranceProviderRepository.update(id, updateData as any);
  }

  async deleteProvider(id: string) {
    const hasRelatedRecords = await this.insuranceProviderRepository.hasRelatedRecords(id);
    
    if (hasRelatedRecords) {
      throw new Error('Cannot delete insurance provider with existing patients, attendances, bills, or insurance claims');
    }

    await this.insuranceProviderRepository.delete(id);
  }

  async toggleProviderStatus(id: string) {
    return this.insuranceProviderRepository.toggleStatus(id);
  }

  async getProviderStats(id: string): Promise<InsuranceProviderStats | null> {
    const provider = await this.insuranceProviderRepository.findByIdWithStats(id);
    
    if (!provider) {
      return null;
    }

    // Calculate financial statistics
    const totalBilling = provider.bills.reduce((sum: number, bill: any) => sum + bill.totalAmount, 0);
    const pendingBalance = provider.bills.reduce((sum: number, bill: any) => sum + bill.balance, 0);
    const totalClaims = provider.insuranceClaims.reduce((sum: number, claim: any) => sum + claim.totalClaimAmount, 0);
    const approvedClaims = provider.insuranceClaims
      .filter((claim: any) => claim.status === 'approved' || claim.status === 'paid')
      .reduce((sum: number, claim: any) => sum + (claim.approvedAmount || 0), 0);

    return {
      provider: {
        id: provider.id,
        name: provider.name,
        type: provider.type,
        coveragePercentage: provider.coveragePercentage,
        isActive: provider.isActive
      },
      counts: {
        patients: provider._count.patients,
        attendances: provider._count.attendances,
        bills: provider._count.bills,
        insuranceClaims: provider._count.insuranceClaims
      },
      financials: {
        totalBilling,
        pendingBalance,
        totalClaims,
        approvedClaims
      },
      billStatus: {
        draft: provider.bills.filter((bill: any) => bill.status === 'draft').length,
        pending: provider.bills.filter((bill: any) => bill.status === 'pending').length,
        paid: provider.bills.filter((bill: any) => bill.status === 'paid').length
      },
      claimStatus: {
        draft: provider.insuranceClaims.filter((claim: any) => claim.status === 'draft').length,
        pending: provider.insuranceClaims.filter((claim: any) => claim.status === 'pending').length,
        approved: provider.insuranceClaims.filter((claim: any) => claim.status === 'approved').length,
        paid: provider.insuranceClaims.filter((claim: any) => claim.status === 'paid').length
      }
    };
  }

  async getInsuranceTypes(): Promise<string[]> {
    return Object.values(InsuranceType);
  }
}
