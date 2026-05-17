/**
 * Ward Service
 * Business logic layer for Ward operations
 */

import { PrismaClient, Ward } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { WardRepository } from './WardRepository';
import { CreateWardDTO, UpdateWardDTO, WardFilters, WardWithAvailability, AvailableBedResponse } from './WardTypes';
import { NotFoundError, ValidationError, ConflictError } from '../../utils/errors';

export class WardService extends BaseService {
  private repository: WardRepository;

  constructor(prisma: PrismaClient) {
    super('WardService');
    this.repository = new WardRepository(prisma);
  }

  /**
   * Get all wards with optional filters
   */
  async getWards(filters: WardFilters): Promise<WardWithAvailability[]> {
    this.logInfo('Fetching wards', { filters });
    
    const wards = await this.repository.findAllWithFilters(filters);
    
    return wards.map(ward => ({
      ...ward,
      availableBeds: ward.totalBeds - ward.occupiedBeds,
      occupancyRate: ward.totalBeds > 0 ? (ward.occupiedBeds / ward.totalBeds) * 100 : 0
    }));
  }

  /**
   * Get ward by ID with details
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
      currentAdmissions: ward._count.Admission
    };
  }

  /**
   * Create a new ward
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
    
    const wardData = {
      ...data,
      occupiedBeds: 0,
      isActive: true
    };
    
    const ward = await this.repository.create(wardData);
    
    this.logInfo('Ward created successfully', { wardId: ward.id, wardName: ward.wardName });
    
    return ward;
  }

  /**
   * Update ward
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
   * Get available beds
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
        isWardActive: bed.Ward.isActive
      })),
      byWard
    };
  }

  /**
   * Get ward statistics
   */
  async getStats() {
    this.logInfo('Fetching ward statistics');
    return this.repository.getStats();
  }
}
