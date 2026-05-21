// modules/diagnosis/DiagnosisService.ts

import { PrismaClient } from '@prisma/client';
import { DiagnosisRepository } from './DiagnosisRepository';
import { CreateDiagnosisDTO, UpdateDiagnosisDTO, DiagnosisFilterDTO } from './DiagnosisTypes';

export class DiagnosisService {
  private repository: DiagnosisRepository;

  constructor(prisma: PrismaClient) {  // ✅ Accept prisma
    this.repository = new DiagnosisRepository(prisma);  // ✅ Pass to repository
  }

  // ============================================
  // GET ALL DIAGNOSES WITH FILTERS
  // ============================================
  async getDiagnoses(filters: DiagnosisFilterDTO) {
    return this.repository.findMany(filters);
  }

  // ============================================
  // GET DIAGNOSIS BY ID
  // ============================================
  async getDiagnosisById(id: string) {
    const diagnosis = await this.repository.findById(id);
    
    if (!diagnosis) {
      throw new Error('Diagnosis not found');
    }
    
    return diagnosis;
  }

  // ============================================
  // CREATE DIAGNOSIS
  // ============================================
  async createDiagnosis(data: CreateDiagnosisDTO) {
    // Validate required fields
    if (!data.name || !data.name.trim()) {
      throw new Error('Diagnosis name is required');
    }

    if (!data.icdCode || !data.icdCode.trim()) {
      throw new Error('ICD code is required');
    }

    if (!data.morbidityGroup) {
      throw new Error('Morbidity group is required');
    }

    // Check for duplicate ICD code
    const exists = await this.repository.existsByIcdCode(data.icdCode);
    if (exists) {
      throw new Error(`Diagnosis with ICD code ${data.icdCode} already exists`);
    }

    return this.repository.create(data);
  }

  // ============================================
  // UPDATE DIAGNOSIS
  // ============================================
  async updateDiagnosis(id: string, data: UpdateDiagnosisDTO) {
    // Check if diagnosis exists
    const existing = await this.prisma.diagnosis.findUnique({
      where: { id }
    });

    if (!existing) {
      throw new Error('Diagnosis not found');
    }

    // Check for duplicate ICD code if changing
    if (data.icdCode && data.icdCode !== existing.icdCode) {
      const exists = await this.repository.existsByIcdCode(data.icdCode, id);
      if (exists) {
        throw new Error(`Diagnosis with ICD code ${data.icdCode} already exists`);
      }
    }

    return this.repository.update(id, data);
  }

  // ============================================
  // DELETE DIAGNOSIS
  // ============================================
  async deleteDiagnosis(id: string) {
    // Check if diagnosis exists
    const diagnosis = await this.prisma.diagnosis.findUnique({
      where: { id }
    });

    if (!diagnosis) {
      throw new Error('Diagnosis not found');
    }

    // Check for related records
    const hasRelated = await this.repository.hasRelatedRecords(id);
    if (hasRelated) {
      throw new Error(
        'Cannot delete diagnosis with existing service catalog entries or GDRG tariff associations'
      );
    }

    return this.repository.delete(id);
  }

  // ============================================
  // SEARCH DIAGNOSES
  // ============================================
  async searchDiagnoses(query: string, field: 'name' | 'icdCode' | 'morbidityGroup' | 'all' = 'all') {
    if (!query || query.trim().length < 2) {
      throw new Error('Search query of at least 2 characters is required');
    }

    const filters: DiagnosisFilterDTO = {
      search: query.trim(),
      searchField: field,
      limit: 50,
      page: 1
    };

    const result = await this.repository.findMany(filters);
    return result.data;
  }

  // ============================================
  // GET DIAGNOSIS STATISTICS
  // ============================================
  async getDiagnosisStats() {
    return this.repository.getStats();
  }

  // ============================================
  // GET MORBIDITY GROUPS
  // ============================================
  async getMorbidityGroups() {
    return this.repository.getMorbidityGroups();
  }

  // ============================================
  // GET DIAGNOSES BY MORBIDITY GROUP
  // ============================================
  async getDiagnosesByMorbidityGroup(morbidityGroup: string, page: number = 1, limit: number = 50) {
    const { MorbidityGroup } = this.prisma;
    
    // Validate morbidity group
    const validGroups = Object.values(MorbidityGroup);
    if (!validGroups.includes(morbidityGroup as any)) {
      throw new Error(`Invalid morbidity group. Must be one of: ${validGroups.join(', ')}`);
    }

    return this.repository.findByMorbidityGroup(morbidityGroup as any, page, limit);
  }
}