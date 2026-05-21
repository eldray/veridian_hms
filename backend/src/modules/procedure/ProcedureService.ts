// modules/procedure/ProcedureService.ts
import { PrismaClient, ServiceType, ServiceCategory, ProcedureCategory } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { ProcedureRepository } from './ProcedureRepository';
import { CreateProcedureTemplateRequest, UpdateProcedureTemplateRequest } from './ProcedureTypes';

export class ProcedureService extends BaseService {
  private procedureRepository: ProcedureRepository;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    super('ProcedureService');  // ✅ FIXED - pass service name
    this.prisma = prisma;
    this.procedureRepository = new ProcedureRepository(prisma);
  }

  async getTemplates(filters: any) {
    this.logInfo('Getting procedure templates', { filters });
    
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

  async getTemplateById(id: string) {
    this.logDebug('Getting procedure template by ID', { id });
    
    const template = await this.procedureRepository.findTemplateById(id);
    if (!template) {
      throw new Error('Procedure template not found');
    }
    return template;
  }

  async createTemplate(data: CreateProcedureTemplateRequest, userId: string) {
    this.logInfo('Creating procedure template', { name: data.name, code: data.code });

    // Check for duplicate code
    const codeExists = await this.procedureRepository.codeExists(data.code);
    if (codeExists) {
      throw new Error('Service code already exists');
    }

    // Check for duplicate procedure code if provided
    if (data.procedureCode) {
      const procCodeExists = await this.procedureRepository.procedureCodeExists(data.procedureCode);
      if (procCodeExists) {
        throw new Error('Procedure code already exists');
      }
    }

    const template = await this.prisma.$transaction(async (tx) => {
      const repo = new ProcedureRepository(tx as any);
      
      // Create the procedure template in ServiceCatalog
      const created = await repo.createTemplate({
        name: data.name,
        code: data.code,
        procedureCode: data.procedureCode,
        description: data.description,
        serviceCategory: data.serviceCategory || ServiceCategory.opd,
        category: data.category,
        department: data.department,
        nhisServiceCode: data.nhisServiceCode,
        tariffCode: data.tariffCode,
        isNHISCovered: data.isNHISCovered !== undefined ? data.isNHISCovered : true,
        nhisRequiresAuth: data.nhisRequiresAuth || false,
        isPrivateInsuranceExempted: data.isPrivateInsuranceExempted || false,
        privateInsRequiresAuth: data.privateInsRequiresAuth || false,
        requiresClinicalNotes: data.requiresClinicalNotes || false,
        duration: data.duration || 30,
        requiresAssistant: data.requiresAssistant || false,
        anesthesiaType: data.anesthesiaType,
        anesthesiaNotes: data.anesthesiaNotes,
        intraOperativeNotes: data.intraOperativeNotes,
        postOperativeNotes: data.postOperativeNotes,
        bloodLoss: data.bloodLoss,
        complications: data.complications,
        outcome: data.outcome,
        cost: data.cost,
        isActive: data.isActive !== undefined ? data.isActive : true,
        unit: data.unit || 'Procedure',
        gdrgTariffId: data.gdrgTariffId,  // ✅ ADDED - GDRG linking
        wardId: data.wardId  // ✅ ADDED - ward linking
      }, userId);

      // Create pricing
      await repo.createPricing({
        serviceCatalogId: created.id,
        cashPrice: data.cashPrice,
        nhisPrice: data.nhisPrice || 0,
        insurancePrice: data.insurancePrice,
        vatRate: data.vatRate || 0,
        isTaxable: data.isTaxable !== undefined ? data.isTaxable : true
      });

      return created;
    });

    return this.procedureRepository.findTemplateById(template.id);
  }

  async updateTemplate(id: string, data: UpdateProcedureTemplateRequest, userId: string) {
    this.logInfo('Updating procedure template', { id });

    const existing = await this.procedureRepository.findWithRelations(id);
    if (!existing) {
      throw new Error('Procedure template not found');
    }

    // Check code uniqueness if changing
    if (data.code && data.code !== existing.code) {
      const codeExists = await this.procedureRepository.codeExists(data.code, id);
      if (codeExists) {
        throw new Error('Service code already exists');
      }
    }

    // Check procedure code uniqueness if changing
    if (data.procedureCode && data.procedureCode !== existing.procedureCode) {
      const procCodeExists = await this.procedureRepository.procedureCodeExists(data.procedureCode, id);
      if (procCodeExists) {
        throw new Error('Procedure code already exists');
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const repo = new ProcedureRepository(tx as any);
      
      // Update template
      const updateData: any = { ...data };
      delete updateData.cashPrice;
      delete updateData.nhisPrice;
      delete updateData.insurancePrice;
      delete updateData.vatRate;
      delete updateData.isTaxable;
      
      const template = await repo.updateTemplate(id, updateData);

      // Update pricing if provided
      if (data.cashPrice !== undefined || data.nhisPrice !== undefined || data.insurancePrice !== undefined) {
        const pricingData: any = {};
        if (data.cashPrice !== undefined) pricingData.cashPrice = data.cashPrice;
        if (data.nhisPrice !== undefined) pricingData.nhisPrice = data.nhisPrice;
        if (data.insurancePrice !== undefined) pricingData.insurancePrice = data.insurancePrice;
        if (data.vatRate !== undefined) pricingData.vatRate = data.vatRate;
        if (data.isTaxable !== undefined) pricingData.isTaxable = data.isTaxable;

        await repo.updatePricing(id, pricingData);
      }

      return template;
    });

    return this.procedureRepository.findTemplateById(result.id);
  }

  async deleteTemplate(id: string) {
    this.logInfo('Deleting procedure template', { id });

    const existing = await this.procedureRepository.findWithRelations(id);
    if (!existing) {
      throw new Error('Procedure template not found');
    }

    // Check if procedure has been used
    if (existing.procedures && existing.procedures.length > 0) {
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

  async getCategories(): Promise<string[]> {
    return Object.values(ProcedureCategory);
  }

  async getDepartments(): Promise<string[]> {
    return this.procedureRepository.getDepartments();
  }

  async bulkUpdate(ids: string[], isActive: boolean): Promise<number> {
    this.logInfo('Bulk updating procedure templates', { ids, isActive });
    return this.procedureRepository.bulkUpdate(ids, isActive);
  }
}