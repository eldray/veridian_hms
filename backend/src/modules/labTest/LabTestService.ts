// modules/labTest/LabTestService.ts
import { LabTestRepository } from './LabTestRepository';
import {
  LabTestQueryParams,
  CreateLabTestDTO,
  UpdateLabTestDTO,
  BulkUpdateDTO
} from './LabTestTypes';

export class LabTestService {
  private repository: LabTestRepository;

  constructor(repository: LabTestRepository) {
    this.repository = repository;
  }

  async getAllLabTests(params: LabTestQueryParams) {
    const { templates, total, pageNum, limitNum } = await this.repository.findAll(params);

    return {
      success: true,
      data: templates,
      pagination: {
        currentPage: pageNum,
        pageSize: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    };
  }

  async getLabTestById(id: string) {
    const template = await this.repository.findById(id);

    if (!template) {
      throw new Error('Lab test not found');
    }

    return template;
  }

  async createLabTest(data: CreateLabTestDTO, userId: string | undefined) {
    const existing = await this.repository.findByCode(data.code);
    if (existing) {
      throw new Error('Service code already exists');
    }

    return this.repository.create(data, userId);
  }

  async updateLabTest(id: string, data: UpdateLabTestDTO) {
    const existingTemplate = await this.repository.findById(id);

    if (!existingTemplate) {
      throw new Error('Lab test not found');
    }

    if (data.code && data.code !== existingTemplate.code) {
      const templateWithCode = await this.repository.findByCode(data.code);
      if (templateWithCode) {
        throw new Error('Service code already exists');
      }
    }

    return this.repository.update(id, data, existingTemplate);
  }

  async deleteLabTest(id: string) {
    return this.repository.delete(id);
  }

  async bulkUpdateLabTests(data: BulkUpdateDTO) {
    if (!data.ids || !Array.isArray(data.ids)) {
      throw new Error('ids array is required');
    }

    const result = await this.repository.bulkUpdate(data);

    return {
      message: `${result.count} lab tests updated`,
      count: result.count
    };
  }

  async getLabTestCategories() {
    return this.repository.getCategories();
  }

  // ✅ ADDED: Get specimen types
  async getSpecimenTypes() {
    return this.repository.getSpecimenTypes();
  }

  // ✅ ADDED: Get preparation instructions
  async getPreparationInstructions() {
    return this.repository.getPreparationInstructions();
  }

  // ✅ ADDED: Get metadata fields (for frontend)
  async getLabTestMetadataFields() {
    const specimenTypes = await this.repository.getSpecimenTypes();
    const preparationInstructions = await this.repository.getPreparationInstructions();

    return {
      success: true,
      data: {
        specimenTypes,
        preparationInstructions,
        metadataStructure: {
          specimenType: 'string',
          preparationInstructions: 'string',
          turnaroundTime: 'string (e.g., 24-48 hours)',
          normalRange: 'string',
          containerType: 'string',
          storageRequirements: 'string'
        }
      }
    };
  }
}