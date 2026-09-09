import { PrismaClient, ServiceType } from '@prisma/client';
import { BaseRepository } from '../../shared/base/BaseRepository';
import { LabTestQueryParams, CreateLabTestDTO, UpdateLabTestDTO, BulkUpdateDTO } from './LabTestTypes';

export class LabTestRepository extends BaseRepository<any, any, any> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'serviceCatalog');
  }

  private getPricingInclude() {
    return {
      where: { isActive: true },
      take: 1,
      orderBy: { effectiveDate: 'desc' as const }
    };
  }

  private flattenPricing(template: any) {
    if (!template) return null;
    const pricingArray = template.pricing;
    template.pricing = Array.isArray(pricingArray) && pricingArray.length > 0 ? pricingArray[0] : null;
    return template;
  }

  async findAll(params: LabTestQueryParams) {
    const { isActive, category, subType, page = 1, limit = 1000 } = params;
    const where: any = { serviceType: ServiceType.lab_test };

    if (isActive !== undefined) where.isActive = isActive;
    if (category) where.serviceCategory = category;
    if (subType) where.subType = { contains: subType, mode: 'insensitive' };

    const pageNum = Math.max(1, page);
    const limitNum = Math.min(1000, Math.max(1, limit));
    const skip = (pageNum - 1) * limitNum;

    const [templates, total] = await Promise.all([
      this.getModel().findMany({
        where,
        include: { pricing: this.getPricingInclude(), LabTestTemplate: true },
        orderBy: { name: 'asc' }, skip, take: limitNum
      }),
      this.getModel().count({ where })
    ]);

    return { templates: templates.map(this.flattenPricing), total, pageNum, limitNum };
  }

  async findById(id: string) {
    // ✅ FIXED: Changed findUnique to findFirst to allow filtering by non-unique fields
    const template = await this.getModel().findFirst({
      where: { id, serviceType: ServiceType.lab_test },
      include: {
        pricing: this.getPricingInclude(),
        LabTestTemplate: true
      }
    });
    return this.flattenPricing(template);
  }

  async create(data: CreateLabTestDTO, userId: string | undefined) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Create LabTestTemplate FIRST
      const labTemplate = await tx.labTestTemplate.create({
        data: {
          name: data.name,
          investigationCode: data.code,
          category: (data.category as any) || 'hematology', // Must match LabCategory enum
          specimenType: (data.specimenType as any) || 'blood', // Must match SpecimenType enum
          resultTemplate: data.resultTemplate,
          normalRangeTemplate: data.normalRange,
          isNHISCovered: data.isNHISCovered ?? true,
          nhisRequiresAuth: data.nhisRequiresAuth || false,
          privateInsRequiresAuth: data.privateInsRequiresAuth || false,
          isPrivateInsExempted: data.isPrivateInsuranceExempted || false,
          tariffCode: data.tariffCode,
          vatRate: data.vatRate || 0,
          isTaxable: data.isTaxable ?? true,
          isActive: data.isActive ?? true
        }
      });

      // 2. Create ServiceCatalog and LINK it to the template
      const catalog = await tx.serviceCatalog.create({
        data: {
          name: data.name, code: data.code, description: data.description,
          serviceType: ServiceType.lab_test, serviceCategory: data.serviceCategory,
          subType: data.subType || null, nhisServiceCode: data.nhisServiceCode,
          tariffCode: data.tariffCode, isNHISCovered: data.isNHISCovered ?? true,
          nhisRequiresAuth: data.nhisRequiresAuth || false,
          privateInsRequiresAuth: data.privateInsRequiresAuth || false,
          isPrivateInsuranceExempted: data.isPrivateInsuranceExempted || false,
          unit: data.unit || 'Test', isActive: data.isActive ?? true,
          createdById: userId,
          labTestTemplateId: labTemplate.id // ✅ THE CRITICAL LINK
        }
      });

      // 3. Create Pricing
      await tx.servicePricing.create({
        data: {
          serviceCatalogId: catalog.id, cashPrice: data.cashPrice,
          nhisPrice: data.nhisPrice || 0, insurancePrice: data.insurancePrice,
          corporatePrice: data.corporatePrice || 0, // ✅ Added
          vatRate: data.vatRate || 0, isTaxable: data.isTaxable ?? true,
          isActive: true, effectiveDate: new Date()
        }
      });

      return this.flattenPricing(await tx.serviceCatalog.findUnique({ 
        where: { id: catalog.id }, 
        include: { pricing: this.getPricingInclude(), LabTestTemplate: true } 
      }));
    });
  }

  async update(id: string, data: UpdateLabTestDTO, existingTemplate: any) {
    return this.prisma.$transaction(async (tx) => {
      const updateData: any = { ...data, updatedAt: new Date() };
      
      // Remove pricing fields from catalog update
      delete updateData.cashPrice; delete updateData.nhisPrice; delete updateData.insurancePrice;
      delete updateData.corporatePrice; delete updateData.vatRate; delete updateData.isTaxable;

      // Handle metadata merging for ServiceCatalog
      if (data.specimenType !== undefined || data.preparationInstructions !== undefined || data.turnaroundTime !== undefined || data.normalRange !== undefined || data.containerType !== undefined || data.resultTemplate !== undefined) {
        const currentMetadata = (existingTemplate.metadata as any) || {};
        updateData.metadata = {
          ...currentMetadata,
          specimenType: data.specimenType ?? currentMetadata.specimenType,
          preparationInstructions: data.preparationInstructions ?? currentMetadata.preparationInstructions,
          turnaroundTime: data.turnaroundTime ?? currentMetadata.turnaroundTime,
          normalRange: data.normalRange ?? currentMetadata.normalRange,
          containerType: data.containerType ?? currentMetadata.containerType,
          resultTemplate: data.resultTemplate ?? currentMetadata.resultTemplate
        };
      }

      const template = await tx.serviceCatalog.update({ where: { id }, data: updateData });

      // ✅ Update the linked LabTestTemplate if relevant fields changed
      if (existingTemplate.labTestTemplateId) {
        const templateUpdateData: any = {};
        if (data.name !== undefined) templateUpdateData.name = data.name;
        if (data.code !== undefined) templateUpdateData.investigationCode = data.code;
        if (data.specimenType !== undefined) templateUpdateData.specimenType = data.specimenType;
        if (data.normalRange !== undefined) templateUpdateData.normalRangeTemplate = data.normalRange;
        if (data.resultTemplate !== undefined) templateUpdateData.resultTemplate = data.resultTemplate;
        
        if (Object.keys(templateUpdateData).length > 0) {
          await tx.labTestTemplate.update({
            where: { id: existingTemplate.labTestTemplateId },
            data: templateUpdateData
          });
        }
      }

      // ✅ Historical Pricing Logic (Expire old, create new)
      if (data.cashPrice !== undefined || data.nhisPrice !== undefined || data.insurancePrice !== undefined || data.corporatePrice !== undefined || data.vatRate !== undefined || data.isTaxable !== undefined) {
        const currentPricing = await tx.servicePricing.findFirst({ where: { serviceCatalogId: id, isActive: true }, orderBy: { effectiveDate: 'desc' } });
        
        if (currentPricing) {
          await tx.servicePricing.update({ where: { id: currentPricing.id }, data: { isActive: false, expiryDate: new Date() } });
        }

        await tx.servicePricing.create({
          data: {
            serviceCatalogId: id,
            cashPrice: data.cashPrice ?? currentPricing?.cashPrice ?? 0,
            nhisPrice: data.nhisPrice ?? currentPricing?.nhisPrice ?? 0,
            insurancePrice: data.insurancePrice ?? currentPricing?.insurancePrice ?? 0,
            corporatePrice: data.corporatePrice ?? currentPricing?.corporatePrice ?? 0,
            vatRate: data.vatRate ?? currentPricing?.vatRate ?? 0,
            isTaxable: data.isTaxable ?? currentPricing?.isTaxable ?? true,
            isActive: true, effectiveDate: new Date()
          }
        });
      }

      return this.flattenPricing(await tx.serviceCatalog.findUnique({ where: { id }, include: { pricing: this.getPricingInclude(), LabTestTemplate: true } }));
    });
  }

  async delete(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const existingTemplate = await tx.serviceCatalog.findFirst({
        where: { id, serviceType: ServiceType.lab_test },
        include: { labTests: { take: 1 }, pricing: true, LabTestTemplate: true }
      });

      if (!existingTemplate) throw new Error('Lab test not found');
      if (existingTemplate.labTests.length > 0) throw new Error('Cannot delete lab test with associated lab test orders');

      await tx.servicePricing.deleteMany({ where: { serviceCatalogId: id } });
      
      // ✅ Delete the linked template
      if (existingTemplate.labTestTemplateId) {
        await tx.labTestTemplate.delete({ where: { id: existingTemplate.labTestTemplateId } });
      }

      await tx.serviceCatalog.delete({ where: { id } });
    });
  }

  async bulkUpdate(data: BulkUpdateDTO) {
    return this.getModel().updateMany({
      where: { id: { in: data.ids }, serviceType: ServiceType.lab_test },
      data: { isActive: data.isActive, updatedAt: new Date() }
    });
  }

  async findByCode(code: string) {
    return this.getModel().findFirst({ where: { code } });
  }

  async getCategories(): Promise<string[]> {
    const categories = await this.getModel().findMany({
      where: { serviceType: ServiceType.lab_test, subType: { not: null } },
      select: { subType: true }, distinct: ['subType']
    });

    const defaultCategories = [
      'hematology', 'biochemistry', 'microbiology', 'serology', 'immunology', 'molecular',
      'pathology', 'cytology', 'histopathology', 'urinalysis', 'pulmonology', 'neurology',
      'cardiology', 'gastroenterology', 'endocrinology', 'toxicology'
    ];

    const existingCategories = categories.map(c => c.subType).filter(Boolean) as string[];
    return existingCategories.length > 0 ? existingCategories : defaultCategories;
  }

  async getSubCategories(): Promise<string[]> {
    const subCategories = await this.prisma.labTestTemplate.findMany({
      where: { subCategory: { not: null } },
      select: { subCategory: true }, distinct: ['subCategory']
    });

    return subCategories.map(s => s.subCategory).filter(Boolean) as string[];
  }

  async getSpecimenTypes(): Promise<string[]> {
    return ['Blood', 'Urine', 'Stool', 'Sputum', 'CSF', 'Tissue', 'Swab', 'Fluid', 'Hair', 'Nail', 'Other'];
  }

  async getPreparationInstructions(): Promise<string[]> {
    return ['Fasting required', 'No special preparation', 'Morning sample preferred', 'Random sample', '24-hour collection', 'Sterile collection required'];
  }
}