import { PrismaClient, ServiceType } from '@prisma/client';
import { BaseRepository } from '../../shared/base/BaseRepository';

export class ProcedureRepository extends BaseRepository<any, any, any> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'serviceCatalog');
  }

  private getPricingInclude() {
    return { where: { isActive: true }, take: 1, orderBy: { effectiveDate: 'desc' } };
  }

  // ✅ Helper to flatten the 1-to-N pricing array into a single object for the frontend
  private flattenPricing(template: any) {
    if (!template) return null;
    const pricingArray = template.pricing;
    template.pricing = Array.isArray(pricingArray) && pricingArray.length > 0 ? pricingArray[0] : null;
    // `department` is stored on the linked procedure template, not on the service catalog row
    template.department = template.ProcedureTemplate?.department ?? null;
    if ('GDRGTariff' in template) template.gdrgTariff = template.GDRGTariff;
    if ('Ward' in template) template.ward = template.Ward;
    return template;
  }

  async findTemplates(filters: any) {
    const { category, department, isActive, page, limit } = filters;
    const where: any = { serviceType: ServiceType.procedure };

    if (isActive !== undefined) where.isActive = isActive;
    if (category) where.subType = category;
    if (department) where.ProcedureTemplate = { department };

    const skip = (page - 1) * limit;

    const [templates, total] = await Promise.all([
      this.getModel().findMany({
        where,
        include: { pricing: this.getPricingInclude(), ProcedureTemplate: { select: { department: true } }, procedures: { select: { id: true, status: true }, take: 1 } },
        orderBy: [{ name: 'asc' }, { id: 'asc' }], skip, take: limit
      }),
      this.getModel().count({ where })
    ]);

    return {
      templates: templates.map((t: any) => this.flattenPricing(t)),
      pagination: { currentPage: page, pageSize: limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  async findTemplateById(id: string) {
    const template = await this.getModel().findUnique({
      where: { id, serviceType: ServiceType.procedure },
      include: {
        pricing: this.getPricingInclude(),
        ProcedureTemplate: { select: { department: true } },
        GDRGTariff: { select: { id: true, gdrgCode: true, description: true, nhiaTariff: true, mdc: true } },
        Ward: { select: { id: true, wardName: true, wardType: true } },
        procedures: {
          include: { Attendance: { select: { attendanceNumber: true, Patient: { select: { surname: true, otherNames: true, folderNumber: true } } } } },
          orderBy: { createdAt: 'desc' }, take: 10
        }
      }
    });
    return this.flattenPricing(template);
  }

  async createTemplate(data: any, userId: string) {
    {
      // The department (and procedure code/category) belong to a ProcedureTemplate row;
      // the service catalog entry (price, NHIS flags ...) points to it.
      // (The service already runs this inside a transaction, so no transaction is opened here.)
      const procedureTemplate = await this.prisma.procedureTemplate.create({
        data: {
          name: data.name,
          procedureCode: data.code,
          description: data.description,
          category: data.category,
          department: data.department || 'General',
          isNHISCovered: data.isNHISCovered ?? true,
          isPrivateInsExempted: data.isPrivateInsuranceExempted ?? false,
          nhisRequiresAuth: data.nhisRequiresAuth ?? false,
          privateInsRequiresAuth: data.privateInsRequiresAuth ?? false,
          isActive: data.isActive ?? true,
          tariffCode: data.tariffCode,
          duration: data.duration ?? 30,
        }
      });

      return this.prisma.serviceCatalog.create({
      data: {
        procedureTemplateId: procedureTemplate.id,
        name: data.name, code: data.code, description: data.description, serviceType: ServiceType.procedure,
        serviceCategory: data.serviceCategory, subType: data.category,
        nhisServiceCode: data.nhisServiceCode, tariffCode: data.tariffCode, isNHISCovered: data.isNHISCovered,
        nhisRequiresAuth: data.nhisRequiresAuth, isPrivateInsuranceExempted: data.isPrivateInsuranceExempted,
        privateInsRequiresAuth: data.privateInsRequiresAuth, requiresClinicalNotes: data.requiresClinicalNotes,
        isActive: data.isActive, unit: data.unit, gdrgTariffId: data.gdrgTariffId, wardId: data.wardId,
        metadata: {
          requiresAssistant: data.requiresAssistant, anesthesiaType: data.anesthesiaType, anesthesiaNotes: data.anesthesiaNotes,
          intraOperativeNotes: data.intraOperativeNotes, postOperativeNotes: data.postOperativeNotes,
          bloodLoss: data.bloodLoss, complications: data.complications, outcome: data.outcome, cost: data.cost
        },
        createdById: userId
      }
      });
    }
  }

  async createPricing(data: any) {
    return this.prisma.servicePricing.create({ data: { ...data, isActive: true, effectiveDate: new Date() } });
  }

  async updateTemplate(id: string, data: any) {
    return this.getModel().update({ where: { id }, data: { ...data, updatedAt: new Date() } });
  }

  // ✅ FIXED: Historical Pricing Logic (Expire old, create new)
  async updatePricing(serviceCatalogId: string, data: any) {
    await this.prisma.servicePricing.updateMany({
      where: { serviceCatalogId, isActive: true },
      data: { isActive: false, expiryDate: new Date() }
    });
    
    return this.prisma.servicePricing.create({
      data: { serviceCatalogId, ...data, isActive: true, effectiveDate: new Date() }
    });
  }

  async deleteTemplate(id: string) {
    return this.getModel().delete({ where: { id } });
  }

  // ✅ FIXED: Use deleteMany for 1-to-N relationship
  async deletePricing(serviceCatalogId: string) {
    return this.prisma.servicePricing.deleteMany({ where: { serviceCatalogId } });
  }

  async codeExists(code: string, excludeId?: string) {
    const where: any = { code };
    if (excludeId) where.id = { not: excludeId };
    return !!(await this.getModel().findFirst({ where }));
  }

  async procedureCodeExists(procedureCode: string, excludeId?: string) {
    const where: any = { procedureCode };
    if (excludeId) where.id = { not: excludeId };
    return !!(await this.getModel().findFirst({ where }));
  }

  async findWithRelations(id: string) {
    return this.getModel().findFirst({
      where: { id, serviceType: ServiceType.procedure },
      include: { procedures: { take: 1 }, pricing: this.getPricingInclude() }
    });
  }

  async bulkUpdate(ids: string[], isActive: boolean) {
    const result = await this.getModel().updateMany({
      where: { id: { in: ids }, serviceType: ServiceType.procedure },
      data: { isActive, updatedAt: new Date() }
    });
    return result.count;
  }

  async getDepartments() {
    const rows = await this.prisma.procedureTemplate.findMany({
      select: { department: true }, distinct: ['department'], orderBy: { department: 'asc' }
    });
    return rows.map((r) => r.department).filter(Boolean);
  }
}