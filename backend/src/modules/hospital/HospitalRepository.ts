import { PrismaClient, Hospital } from '@prisma/client';
import { BaseRepository } from '../../shared/base/BaseRepository';
import { CreateHospitalDTO, UpdateHospitalDTO } from './HospitalTypes';

export class HospitalRepository extends BaseRepository<Hospital, CreateHospitalDTO, UpdateHospitalDTO> {
  // ✅ Kept your exact optional Prisma injection pattern
  constructor(prisma?: PrismaClient) {
    super(prisma || new PrismaClient(), 'hospital');
  }

  async findAll(orderBy: { [key: string]: 'asc' | 'desc' } = { name: 'asc' }): Promise<Hospital[]> {
    return this.getModel().findMany({ orderBy });
  }

  // findById is automatically inherited from BaseRepository

  async findActive(): Promise<Hospital | null> {
    return this.getModel().findFirst({ where: { isActive: true } });
  }

  async getActiveHospital(): Promise<Hospital | null> {
    return this.getModel().findFirst({ where: { isActive: true } });
  }

  // create, update, and delete are automatically inherited from BaseRepository!

  // ✅ FIXED: Prisma requires a unique field for .update(). 
  // We must find the active hospital first, then update it by its unique ID.
  async updateActive(data: any): Promise<Hospital> {
    const activeHospital = await this.getModel().findFirst({ where: { isActive: true } });
    
    if (!activeHospital) {
      throw new Error('No active hospital found to update');
    }

    // Uses the inherited update method from BaseRepository
    return this.update(activeHospital.id, data); 
  }
}