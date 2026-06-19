import { PrismaClient } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { BedRepository } from './BedRepository';
import { CreateBedInput, UpdateBedInput, BedFilter } from './BedTypes';

export class BedService extends BaseService {
  private bedRepository: BedRepository;

  constructor(prisma: PrismaClient) {
    super('BedService');
    this.bedRepository = new BedRepository(prisma);
  }

  async getAllBeds(filter?: BedFilter, page: number = 1, limit: number = 50) {
    this.logInfo('Fetching beds', { filter, page, limit });
    const result = await this.bedRepository.findAll(filter, page, limit);
    return { beds: result.beds, total: result.total, page: result.page, limit: result.limit };
  }

  async getBedById(id: string) {
    const bed = await this.bedRepository.findById(id);
    if (!bed) throw new Error('Bed not found');
    return bed;
  }

  async createBed(data: CreateBedInput) {
    this.logInfo('Creating bed', { wardId: data.wardId, bedNumber: data.bedNumber });
    
    if (!(await this.bedRepository.wardExists(data.wardId))) throw new Error('Ward not found');
    if (await this.bedRepository.findByWardAndBedNumber(data.wardId, data.bedNumber)) {
      throw new Error(`Bed number ${data.bedNumber} already exists in this ward`);
    }

    return this.bedRepository.create(data);
  }

  async updateBed(id: string, data: UpdateBedInput) {
    this.logInfo('Updating bed', { id });
    const existingBed = await this.bedRepository.findById(id);
    if (!existingBed) throw new Error('Bed not found');

    if (data.bedNumber && data.bedNumber !== existingBed.bedNumber) {
      if (await this.bedRepository.findDuplicateInWard(existingBed.wardId, data.bedNumber, id)) {
        throw new Error(`Bed number ${data.bedNumber} already exists in this ward`);
      }
    }

    return this.bedRepository.update(id, data);
  }

  async deleteBed(id: string) {
    this.logInfo('Deleting bed', { id });
    await this.bedRepository.delete(id);
  }

  async getBedStats() {
    return this.bedRepository.getStats();
  }
}