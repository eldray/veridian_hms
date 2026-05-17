// modules/procedure/ProcedureService.ts

import { PrismaClient } from '@prisma/client';
import { BaseService } from '../base/BaseService';
import { ProcedureRepository } from './ProcedureRepository';
import { CreateProcedureTemplateRequest, UpdateProcedureTemplateRequest, GetProcedureTemplatesRequest } from './ProcedureTypes';

export class ProcedureService extends BaseService {
  private procedureRepository: ProcedureRepository;

  constructor(prisma: PrismaClient) {
    super(prisma);
    this.procedureRepository = new ProcedureRepository(prisma);
  }

  // ============================================
  // GET PROCEDURE TEMPLATES
  // ============================================

  async getTemplates(filters: GetProcedureTemplatesRequest) {
    const page = Math.max(1, parseInt(filters.page || '1'));
    const limit = Math.min(10000, Math.max(1, parseInt(filters.limit || '10000')));
    const isActive = filters.isActive !== undefined ? filters.isActive === 'true' : undefined;

    return this.procedureRepository.findTemplates({
      category: filters.category,
      department: filters.department,
      isActive,
      page,
      limit
    });
  }

  // ============================================
  // GET TEMPLATE BY ID
  // ============================================

  async getTemplateById(id: string) {
    const template = await this.procedureRepository.findTemplateById(id);
    if (!template) {
      throw new Error('Procedure template not found');
    }
    return template;
  }

  // ============================================
  // CREATE TEMPLATE
  // ============================================

  async createTemplate(data: CreateProcedureTemplateRequest, userId: string) {
    const codeExists = await this.procedureRepository.codeExists(data.code);
    if (codeExists) {
      throw new Error('Service code already exists');
    }

    const template = await this.prisma.$transaction(async (tx) => {
      const repo = new ProcedureRepository(tx as any);
      const created = await repo.createTemplate(data, userId);

      await repo.createPricing({
        serviceCatalogId: created.id,
        cashPrice: parseFloat(data.cashPrice as any),
        nhisPrice: data.nhisPrice ? parseFloat(data.nhisPrice as any) : 0,
        insurancePrice: parseFloat(data.insurancePrice as any),
        vatRate: data.vatRate ? parseFloat(data.vatRate as any) : 0,
        isTaxable: data.isTaxable !== undefined ? data.isTaxable : true
      });

      return created;
    });

    return this.procedureRepository.findTemplateById(template.id);
  }

  // ============================================
  // UPDATE TEMPLATE
  // ============================================

  async updateTemplate(id: string, data: UpdateProcedureTemplateRequest, userId: string) {
    const existing = await this.procedureRepository.findWithRelations(id);
    if (!existing) {
      throw new Error('Procedure template not found');
    }

    if (data.code && data.code !== existing.code) {
      const codeExists = await this.procedureRepository.codeExists(data.code, id);
      if (codeExists) {
        throw new Error('Service code already exists');
      }
    }

    const updateData: any = { ...data };
    delete updateData.cashPrice;
    delete updateData.nhisPrice;
    delete updateData.insurancePrice;
    delete updateData.vatRate;
    delete updateData.isTaxable;

    // Handle metadata updates
    if (data.department !== undefined || data.duration !== undefined) {
      const currentMetadata = (existing.metadata as any) || {};
      updateData.metadata = {
        ...currentMetadata,
        department: data.department !== undefined ? data.department : currentMetadata.department,
        duration: data.duration !== undefined ? data.duration : currentMetadata.duration,
        requiresAssistant: data.requiresAssistant !== undefined ? data.requiresAssistant : currentMetadata.requiresAssistant,
        anesthesiaType: data.anesthesiaType !== undefined ? data.anesthesiaType : currentMetadata.anesthesiaType,
        anesthesiaNotes: data.anesthesiaNotes !== undefined ? data.anesthesiaNotes : currentMetadata.anesthesiaNotes,
        intraOperativeNotes: data.intraOperativeNotes !== undefined ? data.intraOperativeNotes : currentMetadata.intraOperativeNotes,
        postOperativeNotes: data.postOperativeNotes !== undefined ? data.postOperativeNotes : currentMetadata.postOperativeNotes,
        bloodLoss: data.bloodLoss !== undefined ? data.bloodLoss : currentMetadata.bloodLoss,
        complications: data.complications !== undefined ? data.complications : currentMetadata.complications,
        outcome: data.outcome !== undefined ? data.outcome : currentMetadata.outcome,
        cost: data.cost !== undefined ? data.cost : currentMetadata.cost
      };
    }

    if (data.category !== undefined) {
      updateData.subType = data.category;
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const repo = new ProcedureRepository(tx as any);
      
      const template = await repo.updateTemplate(id, updateData);

      if (data.cashPrice !== undefined || data.nhisPrice !== undefined || data.insurancePrice !== undefined) {
        const pricingData: any = {};
        if (data.cashPrice !== undefined) pricingData.cashPrice = parseFloat(data.cashPrice as any);
        if (data.nhisPrice !== undefined) pricingData.nhisPrice = parseFloat(data.nhisPrice as any);
        if (data.insurancePrice !== undefined) pricingData.insurancePrice = parseFloat(data.insurancePrice as any);
        if (data.vatRate !== undefined) pricingData.vatRate = parseFloat(data.vatRate as any);
        if (data.isTaxable !== undefined) pricingData.isTaxable = data.isTaxable;

        await repo.updatePricing(id, pricingData);
      }

      return template;
    });

    return this.procedureRepository.findTemplateById(result.id);
  }

  // ============================================
  // DELETE TEMPLATE
  // ============================================

  async deleteTemplate(id: string) {
    const existing = await this.procedureRepository.findWithRelations(id);
    if (!existing) {
      throw new Error('Procedure template not found');
    }

    if (existing.procedures.length > 0) {
      throw new Error('Cannot delete procedure template with associated procedures');
    }

    await this.prisma.$transaction(async (tx) => {
      const repo = new ProcedureRepository(tx as any);
      
      if (existing.pricing) {
        await repo.deletePricing(id);
      }

      await repo.deleteTemplate(id);
    });
  }

  // ============================================
  // GET CATEGORIES
  // ============================================

  async getCategories() {
    return this.procedureRepository.getCategories();
  }

  // ============================================
  // GET DEPARTMENTS
  // ============================================

  async getDepartments() {
    return this.procedureRepository.getDepartments();
  }

  // ============================================
  // BULK UPDATE
  // ============================================

  async bulkUpdate(ids: string[], isActive: boolean) {
    return this.procedureRepository.bulkUpdate(ids, isActive);
  }
}
