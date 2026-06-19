import { PrismaClient, MorbidityGroup } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { DiagnosisRepository } from './DiagnosisRepository';
import { CreateDiagnosisDTO, UpdateDiagnosisDTO, DiagnosisFilterDTO } from './DiagnosisTypes';

export class DiagnosisService extends BaseService {
  private repository: DiagnosisRepository;

  constructor(prisma: PrismaClient) {
    super('DiagnosisService');
    this.repository = new DiagnosisRepository(prisma);
  }

  async getDiagnoses(filters: DiagnosisFilterDTO) {
    return this.repository.findManyWithFilters(filters);
  }

  async getDiagnosisById(id: string) {
    const diagnosis = await this.repository.findByIdWithRelations(id);
    if (!diagnosis) throw new Error('Diagnosis not found');
    return diagnosis;
  }

  // ✅ REMOVED manual existsByIcdCode check! 
  // Because icdCode is @unique in your schema, Prisma will throw P2002 if duplicate.
  // BaseController.error() automatically maps P2002 to a clean 400 Bad Request.
  async createDiagnosis(data: CreateDiagnosisDTO) {
    return this.repository.create(data);
  }

  // ✅ REMOVED manual this.prisma.diagnosis.findUnique check!
  // This was causing a runtime crash because this.prisma was undefined.
  // If not found, Prisma throws P2025 (mapped to 404). If duplicate ICD, P2002 (mapped to 400).
  async updateDiagnosis(id: string, data: UpdateDiagnosisDTO) {
    return this.repository.update(id, data);
  }

  // ✅ REMOVED manual this.prisma.diagnosis.findUnique check (which was crashing).
  async deleteDiagnosis(id: string) {
    const hasRelated = await this.repository.hasRelatedRecords(id);
    if (hasRelated) {
      throw new Error('Cannot delete diagnosis with existing service catalog entries, GDRG tariff associations, or patient attendance records');
    }
    return this.repository.delete(id);
  }

  async searchDiagnoses(query: string, field: 'name' | 'icdCode' | 'morbidityGroup' | 'all' = 'all') {
    const filters: DiagnosisFilterDTO = { search: query.trim(), searchField: field, limit: 50, page: 1 };
    const result = await this.repository.findManyWithFilters(filters);
    return result.data;
  }

  async getDiagnosisStats() {
    return this.repository.getStats();
  }

  async getMorbidityGroups() {
    return this.repository.getMorbidityGroups();
  }

  // ✅ FIXED: Imported MorbidityGroup from @prisma/client instead of trying to get it from this.prisma
  async getDiagnosesByMorbidityGroup(morbidityGroup: string, page: number = 1, limit: number = 50) {
    const validGroups = Object.values(MorbidityGroup);
    if (!validGroups.includes(morbidityGroup as any)) {
      throw new Error(`Invalid morbidity group. Must be one of: ${validGroups.join(', ')}`);
    }
    return this.repository.findByMorbidityGroup(morbidityGroup as any, page, limit);
  }
}