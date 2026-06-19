import { PrismaClient, Ward, PaymentMode } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { WardRepository } from './WardRepository';
import { CreateWardDTO, UpdateWardDTO, WardFilters, WardWithAvailability, AvailableBedResponse, WardChargeCalculation } from './WardTypes';

const toNumber = (val: any): number => val ? parseFloat(val.toString()) : 0;

export class WardService extends BaseService {
  private repository: WardRepository;

  constructor(prisma: PrismaClient) {
    super('WardService');
    this.repository = new WardRepository(prisma);
  }

  async getWards(filters: WardFilters): Promise<WardWithAvailability[]> {
    this.logInfo('Fetching wards', { filters });
    const wards = await this.repository.findAllWithFilters(filters);
    
    return wards.map(ward => {
      const cash = toNumber(ward.dailyCashRate);
      return {
        ...ward,
        availableBeds: ward.totalBeds - ward.occupiedBeds,
        occupancyRate: ward.totalBeds > 0 ? (ward.occupiedBeds / ward.totalBeds) * 100 : 0,
        pricingByPaymentMode: {
          [PaymentMode.cash]: cash,
          [PaymentMode.nhis]: toNumber(ward.dailyNHISRate) || cash * 0.8,
          [PaymentMode.private_insurance]: toNumber(ward.dailyInsuranceRate) || cash * 0.9,
          [PaymentMode.corporate]: toNumber(ward.dailyInsuranceRate) || cash * 0.85
        }
      };
    });
  }

  async getWardById(id: string): Promise<WardWithAvailability> {
    const ward = await this.repository.findByIdWithDetails(id);
    if (!ward) throw new Error('Ward not found');
    
    const cash = toNumber(ward.dailyCashRate);
    return {
      ...ward,
      availableBeds: ward.totalBeds - ward.occupiedBeds,
      occupancyRate: ward.totalBeds > 0 ? (ward.occupiedBeds / ward.totalBeds) * 100 : 0,
      currentAdmissions: ward._count.Admission,
      pricingByPaymentMode: {
        [PaymentMode.cash]: cash,
        [PaymentMode.nhis]: toNumber(ward.dailyNHISRate) || cash * 0.8,
        [PaymentMode.private_insurance]: toNumber(ward.dailyInsuranceRate) || cash * 0.9,
        [PaymentMode.corporate]: toNumber(ward.dailyInsuranceRate) || cash * 0.85
      }
    };
  }

  async createWard(data: CreateWardDTO, userId: string): Promise<Ward> {
    this.logInfo('Creating new ward', { wardName: data.wardName });
    if (await this.repository.findByName(data.wardName)) throw new Error('A ward with this name already exists');
    if (data.totalBeds < 1) throw new Error('Total beds must be a positive number');
    if (data.dailyCashRate <= 0) throw new Error('Daily cash rate must be positive');
    
    const wardData = {
      ...data, occupiedBeds: 0, isActive: true,
      dailyNHISRate: data.dailyNHISRate || data.dailyCashRate * 0.8,
      dailyInsuranceRate: data.dailyInsuranceRate || data.dailyCashRate * 0.9,
      vatRate: data.vatRate || 0, isTaxable: data.isTaxable ?? true,
      isNHISCovered: data.isNHISCovered ?? true, nhisRequiresAuth: data.nhisRequiresAuth ?? false,
      isPrivateInsExempted: data.isPrivateInsExempted ?? false, requiresAuthorization: data.requiresAuthorization ?? false
    };
    
    return this.repository.create(wardData);
  }

  async updateWard(id: string, data: UpdateWardDTO): Promise<Ward> {
    const existingWard = await this.getWardById(id);
    if (data.wardName && data.wardName !== existingWard.wardName) {
      if (await this.repository.findByName(data.wardName, id)) throw new Error('Another ward with this name already exists');
    }
    return this.repository.update(id, data);
  }

  async deleteWard(id: string): Promise<void> {
    const ward = await this.getWardById(id);
    if (ward.occupiedBeds > 0) throw new Error('Cannot delete ward with occupied beds');
    await this.repository.delete(id);
  }

  async getAvailableBeds(wardId?: string, wardType?: string) {
    const beds = await this.repository.getAvailableBeds(wardId);
    const filteredBeds = beds.filter(bed => (wardType ? bed.Ward.wardType === wardType : true) && bed.Ward.isActive);
    
    const byWardMap = new Map<string, typeof filteredBeds>();
    filteredBeds.forEach(bed => {
      if (!byWardMap.has(bed.wardId)) byWardMap.set(bed.wardId, []);
      byWardMap.get(bed.wardId)!.push(bed);
    });
    
    const byWard = Array.from(byWardMap.entries()).map(([wId, wardBeds]) => ({
      wardId: wId, wardName: wardBeds[0].Ward.wardName, wardType: wardBeds[0].Ward.wardType, availableBeds: wardBeds.length
    }));
    
    return {
      totalAvailableBeds: filteredBeds.length,
      availableBeds: filteredBeds.map(bed => {
        const cash = toNumber(bed.Ward.dailyCashRate);
        return {
          bedId: bed.id, bedNumber: bed.bedNumber, wardId: bed.wardId,
          wardName: bed.Ward.wardName, wardType: bed.Ward.wardType, isWardActive: bed.Ward.isActive,
          dailyRates: {
            cash,
            nhis: toNumber(bed.Ward.dailyNHISRate) || cash * 0.8,
            insurance: toNumber(bed.Ward.dailyInsuranceRate) || cash * 0.9,
            corporate: toNumber(bed.Ward.dailyInsuranceRate) || cash * 0.85
          }
        };
      }),
      byWard
    };
  }

  async calculateCharge(wardId: string, numberOfDays: number, paymentMode: PaymentMode): Promise<WardChargeCalculation> {
    const ward = await this.getWardById(wardId);
    const calc = await this.repository.calculateWardCharge(wardId, numberOfDays, paymentMode);
    return { wardId: ward.id, wardName: ward.wardName, ...calc, numberOfDays, paymentMode };
  }

  async getStats() {
    const stats = await this.repository.getStats();
    return {
      ...stats,
      corporateInsights: {
        corporateEligibleWards: stats.byPaymentMode.totalPrivateInsuranceCovered,
        suggestedCorporateRate: '85% of cash rate',
        averageCorporateDailyRate: stats.revenueProjection.dailyAtFullOccupancy * 0.85,
        potentialCorporateRevenue: stats.revenueProjection.monthlyAtFullOccupancy * 0.85
      }
    };
  }

  async getCorporateEligibleWards(): Promise<Ward[]> {
    const allWards = await this.repository.findAllWithFilters({ isActive: true });
    return allWards.filter(ward => !ward.isPrivateInsExempted);
  }

  async getOccupancyReport(wardId?: string) {
    const wards = wardId ? [await this.getWardById(wardId)] : await this.getWards({ isActive: true });
    return wards.map(ward => {
      const cash = toNumber(ward.dailyCashRate);
      const available = ward.totalBeds - ward.occupiedBeds;
      return {
        wardId: ward.id, wardName: ward.wardName, totalBeds: ward.totalBeds,
        occupiedBeds: ward.occupiedBeds, availableBeds: available,
        occupancyRate: ((ward.occupiedBeds / ward.totalBeds) * 100).toFixed(2),
        revenuePotential: {
          cash: available * cash,
          nhis: available * (toNumber(ward.dailyNHISRate) || cash * 0.8),
          corporate: available * (toNumber(ward.dailyInsuranceRate) || cash * 0.85)
        }
      };
    });
  }
}