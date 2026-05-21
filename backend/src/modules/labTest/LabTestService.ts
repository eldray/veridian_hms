// LabTestService.ts - Business logic layer for Lab Test module

import { LabTestRepository } from './LabTestRepository';
import { 
  LabTestServiceQuery, 
  CreateLabTestServiceDTO, 
  UpdateLabTestServiceDTO,
  BulkUpdateLabTestDTO
} from './LabTestTypes';

export class LabTestService {
  private repository: LabTestRepository;

  constructor(prisma: PrismaClient) {  // ✅ Add prisma parameter
    this.repository = new LabTestRepository(prisma);  // ✅ Pass to repository
  }

  // ============================================
  // GET ALL LAB TEST SERVICES
  // ============================================
  async getAllLabTestServices(query: LabTestServiceQuery) {
    const result = await this.repository.findAll(query);
    
    return {
      success: true,
      data: result.services,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: Math.ceil(result.total / result.limit)
      }
    };
  }

  // ============================================
  // GET LAB TEST SERVICE BY ID
  // ============================================
  async getLabTestServiceById(id: string) {
    const service = await this.repository.findById(id);

    if (!service) {
      throw new Error('Lab test service not found');
    }

    return {
      success: true,
      data: service
    };
  }

  // ============================================
  // CREATE LAB TEST SERVICE
  // ============================================
  async createLabTestService(data: CreateLabTestServiceDTO, createdById: string) {
    // Validate required fields
    if (!data.name || !data.code) {
      throw new Error('Service name and code are required');
    }

    // Check if code already exists
    const codeExists = await this.repository.codeExists(data.code);
    if (codeExists) {
      throw new Error('Service code already exists');
    }

    const result = await this.repository.create(data, createdById);

    return {
      success: true,
      message: 'Lab test service created successfully',
      data: result
    };
  }

  // ============================================
  // UPDATE LAB TEST SERVICE
  // ============================================
  async updateLabTestService(id: string, data: UpdateLabTestServiceDTO) {
    // Check if service exists
    const existingService = await this.repository.findById(id);
    if (!existingService) {
      throw new Error('Lab test service not found');
    }

    // Check if new code already exists (if code is being updated)
    if (data.code && data.code !== existingService.code) {
      const codeExists = await this.repository.codeExists(data.code, id);
      if (codeExists) {
        throw new Error('Service code already exists');
      }
    }

    const result = await this.repository.update(id, data);

    if (!result) {
      throw new Error('Failed to update lab test service');
    }

    return {
      success: true,
      message: 'Lab test service updated successfully',
      data: result
    };
  }

  // ============================================
  // DELETE LAB TEST SERVICE
  // ============================================
  async deleteLabTestService(id: string) {
    const result = await this.repository.delete(id);

    if (!result.found) {
      throw new Error('Lab test service not found');
    }

    if (result.hasAssociatedTests) {
      throw new Error('Cannot delete lab test service with associated lab tests');
    }

    return {
      success: true,
      message: 'Lab test service deleted successfully'
    };
  }

  // ============================================
  // GET LAB TEST SUB-CATEGORIES
  // ============================================
  async getLabTestSubCategories() {
    const subCategories = await this.repository.getSubCategories();

    return {
      success: true,
      data: subCategories
    };
  }

  // ============================================
  // GET LAB TEST METADATA FIELDS
  // ============================================
  async getLabTestMetadataFields() {
    const specimenTypes = [
      'Blood', 'Urine', 'Stool', 'Sputum', 'CSF', 'Tissue',
      'Swab', 'Fluid', 'Hair', 'Nail', 'Other'
    ];

    const preparationInstructions = [
      'Fasting required',
      'No special preparation',
      'Morning sample preferred',
      'Random sample',
      '24-hour collection',
      'Sterile collection required'
    ];

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

  // ============================================
  // BULK UPDATE LAB TEST SERVICES
  // ============================================
  async bulkUpdateLabTestServices(data: BulkUpdateLabTestDTO) {
    if (!data.ids || !Array.isArray(data.ids)) {
      throw new Error('Service IDs array is required');
    }

    if (typeof data.isActive !== 'boolean') {
      throw new Error('isActive must be a boolean');
    }

    const updatedCount = await this.repository.bulkUpdate(data.ids, data.isActive);

    return {
      success: true,
      message: `Successfully updated ${updatedCount} lab test services`,
      data: {
        updatedCount
      }
    };
  }
}
