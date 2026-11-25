import { PrismaClient } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { LabTestRepository } from './LabTestRepository';
import { LabTestQueryParams, CreateLabTestDTO, UpdateLabTestDTO, BulkUpdateDTO } from './LabTestTypes';

export class LabTestService extends BaseService {
  private repository: LabTestRepository;

  constructor(prisma: PrismaClient) {
    super('LabTestService');
    this.repository = new LabTestRepository(prisma);
  }

  async getAllLabTests(params: LabTestQueryParams) {
    const { templates, total, pageNum, limitNum } = await this.repository.findAll(params);
    return {
      data: templates,
      pagination: { 
        page: pageNum,      // ✅ Aligned with BaseController.paginated()
        limit: limitNum,    // ✅ Aligned with BaseController.paginated()
        total, 
        totalPages: Math.ceil(total / limitNum) 
      }
    };
  }

  async getLabTestById(id: string) {
    const template = await this.repository.findById(id);
    if (!template) throw new Error('Lab test not found');
    return template;
  }

  // ✅ REMOVED manual findByCode checks! 
  // BaseController.error() will automatically catch Prisma P2002 (Unique Constraint) 
  // and return a clean 400 Bad Request. This saves a DB query.
  async createLabTest(data: CreateLabTestDTO, userId: string | undefined) {
    return this.repository.create(data, userId);
  }

  async updateLabTest(id: string, data: UpdateLabTestDTO) {
    const existingTemplate = await this.repository.findById(id);
    if (!existingTemplate) throw new Error('Lab test not found');
    return this.repository.update(id, data, existingTemplate);
  }

  async deleteLabTest(id: string) { 
    return this.repository.delete(id); 
  }

  async bulkUpdateLabTests(data: BulkUpdateDTO) {
    if (!data.ids || !Array.isArray(data.ids)) throw new Error('ids array is required');
    const result = await this.repository.bulkUpdate(data);
    return { message: `${result.count} lab tests updated`, count: result.count };
  }

  async getLabTestCategories() { return this.repository.getCategories(); }
  async getLabTestSubCategories() { return this.repository.getSubCategories(); }
  async getSpecimenTypes() { return this.repository.getSpecimenTypes(); }
  async getPreparationInstructions() { return this.repository.getPreparationInstructions(); }

  async getLabTestMetadataFields() {
    return {
      specimenTypes: await this.repository.getSpecimenTypes(),
      preparationInstructions: await this.repository.getPreparationInstructions(),
      metadataStructure: {
        specimenType: 'string', preparationInstructions: 'string', turnaroundTime: 'string (e.g., 24-48 hours)',
        normalRange: 'string', containerType: 'string', storageRequirements: 'string'
      }
    };
  }
}