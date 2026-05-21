/**
 * Ward Service
 * Business logic layer for Ward operations with corporate support
 */

import { PrismaClient, Ward, PaymentMode } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { WardRepository } from './WardRepository';
import { 
  CreateWardDTO, 
  UpdateWardDTO, 
  WardFilters, 
  WardWithAvailability, 
  AvailableBedResponse,
  WardChargeCalculation
} from './WardTypes';
import { NotFoundError, ValidationError, ConflictError } from '../../utils/errors';

export class WardService extends BaseService {
  private repository: WardRepository;

  constructor(prisma: PrismaClient) {
    super('WardService');
    this.repository = new WardRepository(prisma);
  }

  /**
   * Get all wards with optional filters and pricing by payment mode
   */
  async getWards(filters: WardFilters): Promise<WardWithAvailability[]> {
    this.logInfo('Fetching wards', { filters });
    
    const wards = await this.repository.findAllWithFilters(filters);
    
    return wards.map(ward => ({
      ...ward,
      availableBeds: ward.totalBeds - ward.occupiedBeds,
      occupancyRate: ward.totalBeds > 0 ? (ward.occupiedBeds / ward.totalBeds) * 100 : 0,
      pricingByPaymentMode: {
        [PaymentMode.CASH]: ward.dailyCashRate,
        [PaymentMode.NHIS]: ward.dailyNHISRate || ward.dailyCashRate * 0.8,
        [PaymentMode.PRIVATE_INSURANCE]: ward.dailyInsuranceRate || ward.dailyCashRate * 0.9,
        [PaymentMode.CORPORATE]: ward.dailyInsuranceRate || ward.dailyCashRate * 0.85
      }
    }));
  }

  /**
   * Get ward by ID with details and corporate pricing
   */
  async getWardById(id: string): Promise<WardWithAvailability> {
    this.logDebug('Fetching ward by ID', { id });
    
    const ward = await this.repository.findByIdWithDetails(id);
    
    if (!ward) {
      throw new NotFoundError('Ward', id);
    }
    
    return {
      ...ward,
      availableBeds: ward.totalBeds - ward.occupiedBeds,
      occupancyRate: ward.totalBeds > 0 ? (ward.occupiedBeds / ward.totalBeds) * 100 : 0,
      currentAdmissions: ward._count.Admission,
      pricingByPaymentMode: {
        [PaymentMode.CASH]: ward.dailyCashRate,
        [PaymentMode.NHIS]: ward.dailyNHISRate || ward.dailyCashRate * 0.8,
        [PaymentMode.PRIVATE_INSURANCE]: ward.dailyInsuranceRate || ward.dailyCashRate * 0.9,
        [PaymentMode.CORPORATE]: ward.dailyInsuranceRate || ward.dailyCashRate * 0.85
      }
    };
  }

  /**
   * Create a new ward with all pricing fields
   */
  async createWard(data: CreateWardDTO, userId: string): Promise<Ward> {
    this.logInfo('Creating new ward', { wardName: data.wardName });
    
    // Check for duplicate ward name
    const existingWard = await this.repository.findByName(data.wardName);
    if (existingWard) {
      throw new ConflictError('A ward with this name already exists');
    }
    
    // Validate totalBeds
    if (data.totalBeds < 1) {
      throw new ValidationError('Total beds must be a positive number', [
        { field: 'totalBeds', message: 'Must be at least 1', code: 'INVALID' }
      ]);
    }
    
    // Validate pricing
    if (data.dailyCashRate <= 0) {
      throw new ValidationError('Daily cash rate must be positive', [
        { field: 'dailyCashRate', message: 'Must be greater than 0', code: 'INVALID' }
      ]);
    }
    
    const wardData = {
      ...data,
      occupiedBeds: 0,
      isActive: true,
      dailyNHISRate: data.dailyNHISRate || data.dailyCashRate * 0.8,
      dailyInsuranceRate: data.dailyInsuranceRate || data.dailyCashRate * 0.9,
      vatRate: data.vatRate || 0,
      isTaxable: data.isTaxable ?? true,
      isNHISCovered: data.isNHISCovered ?? true,
      nhisRequiresAuth: data.nhisRequiresAuth ?? false,
      isPrivateInsExempted: data.isPrivateInsExempted ?? false,
      requiresAuthorization: data.requiresAuthorization ?? false
    };
    
    const ward = await this.repository.create(wardData);
    
    this.logInfo('Ward created successfully', { wardId: ward.id, wardName: ward.wardName });
    
    return ward;
  }

  /**
   * Update ward with corporate pricing support
   */
  async updateWard(id: string, data: UpdateWardDTO): Promise<Ward> {
    this.logInfo('Updating ward', { id });
    
    // Verify ward exists
    const existingWard = await this.getWardById(id);
    
    // Check for duplicate ward name if updating
    if (data.wardName && data.wardName !== existingWard.wardName) {
      const duplicateWard = await this.repository.findByName(data.wardName, id);
      if (duplicateWard) {
        throw new ConflictError('Another ward with this name already exists');
      }
    }
    
    const ward = await this.repository.update(id, data);
    
    this.logInfo('Ward updated successfully', { id });
    
    return ward;
  }

  /**
   * Delete ward
   */
  async deleteWard(id: string): Promise<void> {
    this.logInfo('Deleting ward', { id });
    
    const ward = await this.getWardById(id);
    
    if (ward.occupiedBeds > 0) {
      throw new ValidationError('Cannot delete ward with occupied beds', [
        { field: 'occupiedBeds', message: 'Ward has occupied beds', code: 'INVALID' }
      ]);
    }
    
    await this.repository.delete(id);
    
    this.logInfo('Ward deleted successfully', { id });
  }

  /**
   * Get available beds with rates for all payment modes including corporate
   */
  async getAvailableBeds(wardId?: string, wardType?: string): Promise<{
    totalAvailableBeds: number;
    availableBeds: AvailableBedResponse[];
    byWard: Array<{ wardId: string; wardName: string; wardType: string; availableBeds: number }>;
  }> {
    this.logInfo('Fetching available beds', { wardId, wardType });
    
    const beds = await this.repository.getAvailableBeds(wardId);
    
    // Filter by ward type if specified
    const filteredBeds = beds.filter(bed => {
      const matchesType = wardType ? bed.Ward.wardType === wardType : true;
      const isWardActive = bed.Ward.isActive;
      return matchesType && isWardActive;
    });
    
    // Group by ward
    const byWardMap = new Map<string, typeof filteredBeds>();
    filteredBeds.forEach(bed => {
      if (!byWardMap.has(bed.wardId)) {
        byWardMap.set(bed.wardId, []);
      }
      byWardMap.get(bed.wardId)!.push(bed);
    });
    
    const byWard = Array.from(byWardMap.entries()).map(([wardId, wardBeds]) => {
      const sampleBed = wardBeds[0];
      return {
        wardId,
        wardName: sampleBed.Ward.wardName,
        wardType: sampleBed.Ward.wardType,
        availableBeds: wardBeds.length
      };
    });
    
    return {
      totalAvailableBeds: filteredBeds.length,
      availableBeds: filteredBeds.map(bed => ({
        bedId: bed.id,
        bedNumber: bed.bedNumber,
        wardId: bed.wardId,
        wardName: bed.Ward.wardName,
        wardType: bed.Ward.wardType,
        isWardActive: bed.Ward.isActive,
        dailyRates: {
          cash: bed.Ward.dailyCashRate,
          nhis: bed.Ward.dailyNHISRate,
          insurance: bed.Ward.dailyInsuranceRate,
          corporate: bed.Ward.dailyInsuranceRate || bed.Ward.dailyCashRate * 0.85
        }
      })),
      byWard
    };
  }

  /**
   * Calculate ward charge for specific payment mode (including corporate)
   */
  async calculateCharge(
    wardId: string,
    numberOfDays: number,
    paymentMode: PaymentMode
  ): Promise<WardChargeCalculation> {
    this.logInfo('Calculating ward charge', { wardId, numberOfDays, paymentMode });
    
    const ward = await this.getWardById(wardId);
    const calculation = await this.repository.calculateWardCharge(wardId, numberOfDays, paymentMode);
    
    return {
      wardId: ward.id,
      wardName: ward.wardName,
      dailyRate: calculation.dailyRate,
      numberOfDays,
      subtotal: calculation.subtotal,
      vatAmount: calculation.vatAmount,
      totalAmount: calculation.totalAmount,
      paymentMode
    };
  }

  /**
   * Get ward statistics with corporate analysis
   */
  async getStats() {
    this.logInfo('Fetching ward statistics');
    const stats = await this.repository.getStats();
    
    // Add corporate-specific insights
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

  /**
   * Get wards by NHIS coverage
   */
  async getWardsByNHISCoverage(isCovered: boolean): Promise<Ward[]> {
    return this.repository.findByNHISCoverage(isCovered);
  }

  /**
   * Get wards available for corporate billing
   */
  async getCorporateEligibleWards(): Promise<Ward[]> {
    const allWards = await this.repository.findAllWithFilters({ isActive: true });
    return allWards.filter(ward => !ward.isPrivateInsExempted);
  }

  /**
   * Get ward occupancy report
   */
  async getOccupancyReport(wardId?: string): Promise<any> {
    const wards = wardId 
      ? [await this.getWardById(wardId)]
      : await this.getWards({ isActive: true });
    
    return wards.map(ward => ({
      wardId: ward.id,
      wardName: ward.wardName,
      totalBeds: ward.totalBeds,
      occupiedBeds: ward.occupiedBeds,
      availableBeds: ward.totalBeds - ward.occupiedBeds,
      occupancyRate: ((ward.occupiedBeds / ward.totalBeds) * 100).toFixed(2),
      revenuePotential: {
        cash: (ward.totalBeds - ward.occupiedBeds) * ward.dailyCashRate,
        nhis: (ward.totalBeds - ward.occupiedBeds) * (ward.dailyNHISRate || ward.dailyCashRate * 0.8),
        corporate: (ward.totalBeds - ward.occupiedBeds) * (ward.dailyInsuranceRate || ward.dailyCashRate * 0.85)
      }
    }));
  }
}