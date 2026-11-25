// ScanTemplateService.ts - Business logic layer for scan template module

import { ScanTemplateRepository } from './ScanTemplateRepository';
import {
  ScanTemplateQueryParams,
  CreateScanTemplateDTO,
  UpdateScanTemplateDTO,
  BulkUpdateDTO
} from './ScanTemplateTypes';

export class ScanTemplateService {
  private repository: ScanTemplateRepository;

  constructor(repository: ScanTemplateRepository) {
    this.repository = repository;
  }

  async getAllScanTemplates(params: ScanTemplateQueryParams) {
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

  async getScanTemplateById(id: string) {
    const template = await this.repository.findById(id);

    if (!template) {
      throw new Error('Scan template not found');
    }

    return template;
  }

  async createScanTemplate(data: CreateScanTemplateDTO, userId: string | undefined) {
    // Check if code already exists
    const existing = await this.repository.findByCode(data.code);
    if (existing) {
      throw new Error('Service code already exists');
    }

    return this.repository.create(data, userId);
  }

  async updateScanTemplate(id: string, data: UpdateScanTemplateDTO) {
    const existingTemplate = await this.repository.findById(id);

    if (!existingTemplate) {
      throw new Error('Scan template not found');
    }

    // Check if new code already exists (if code is being changed)
    if (data.code && data.code !== existingTemplate.code) {
      const templateWithCode = await this.repository.findByCode(data.code);
      if (templateWithCode) {
        throw new Error('Service code already exists');
      }
    }

    return this.repository.update(id, data, existingTemplate);
  }

  async deleteScanTemplate(id: string) {
    return this.repository.delete(id);
  }

  async bulkUpdateScanTemplates(data: BulkUpdateDTO) {
    if (!data.ids || !Array.isArray(data.ids)) {
      throw new Error('ids array is required');
    }

    const result = await this.repository.bulkUpdate(data);

    return {
      message: `${result.count} scan templates updated`,
      count: result.count
    };
  }

  async getScanCategories() {
    return this.repository.getCategories();
  }

  async getScanBodyParts() {
    const bodyParts = await this.repository.findDistinctBodyParts();

    if (bodyParts.length === 0) {
      return [
        'head', 'chest', 'neck', 'abdomen', 'pelvis',
        'spine', 'extremities', 'breast', 'other'
      ];
    }

    return bodyParts;
  }

  async getScanTypes() {
    const scanTypes = await this.repository.findDistinctScanTypes();

    if (scanTypes.length === 0) {
      return [
        'Ultrasound', 'X-Ray', 'CT Scan', 'MRI',
        'Mammography', 'Fluoroscopy', 'Doppler', 'Echocardiography'
      ];
    }

    return scanTypes;
  }
}