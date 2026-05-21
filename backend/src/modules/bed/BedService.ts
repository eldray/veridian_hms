import { BedRepository } from './BedRepository';
import { BedWithRelations, CreateBedInput, UpdateBedInput, BedFilter } from './BedTypes';

export class BedService {
  private bedRepository: BedRepository;

  constructor(bedRepository: BedRepository) {
    this.bedRepository = bedRepository;
  }

  async getAllBeds(filter?: BedFilter, page: number = 1, limit: number = 50): Promise<{ beds: BedWithRelations[]; pagination: any }> {
    const result = await this.bedRepository.findAll(filter, page, limit);
    
    return {
      beds: result.beds,
      pagination: {
        page,
        limit,
        total: result.total,
        pages: Math.ceil(result.total / limit)
      }
    };
  }

  async getBedById(id: string): Promise<BedWithRelations | null> {
    const bed = await this.bedRepository.findById(id);
    if (!bed) {
      throw new Error('Bed not found');
    }
    return bed;
  }

  async createBed(data: CreateBedInput): Promise<BedWithRelations> {
    // Check if ward exists
    const wardExists = await this.bedRepository.wardExists(data.wardId);
    if (!wardExists) {
      throw new Error('Ward not found');
    }

    // Check if bed number already exists in the same ward
    const existingBed = await this.bedRepository.findByWardAndBedNumber(
      data.wardId,
      data.bedNumber
    );

    if (existingBed) {
      throw new Error(`Bed number ${data.bedNumber} already exists in this ward`);
    }

    return this.bedRepository.create(data);
  }

  async updateBed(id: string, data: UpdateBedInput): Promise<BedWithRelations> {
    const existingBed = await this.bedRepository.findById(id);
    
    if (!existingBed) {
      throw new Error('Bed not found');
    }

    // Check for duplicate bed number if being updated
    if (data.bedNumber && data.bedNumber !== existingBed.bedNumber) {
      const duplicateBed = await this.bedRepository.findDuplicateInWard(
        existingBed.wardId,
        data.bedNumber,
        id
      );

      if (duplicateBed) {
        throw new Error(`Bed number ${data.bedNumber} already exists in this ward`);
      }
    }

    return this.bedRepository.update(id, data);
  }

  async deleteBed(id: string): Promise<void> {
    await this.bedRepository.delete(id);
  }

  async getBedStats(): Promise<{ total: number; occupied: number; available: number }> {
    return this.bedRepository.getStats();
  }
}