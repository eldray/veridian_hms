import { PrismaClient, ServiceType, ServiceCategory } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { ServiceCatalogRepository } from './ServiceCatalogRepository';
import { ValidationError, NotFoundError } from '../../utils/errors';

export class ServiceCatalogService extends BaseService {
  private repo: ServiceCatalogRepository;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    super('ServiceCatalogService');
    this.prisma = prisma;
    this.repo = new ServiceCatalogRepository(prisma);
  }

  // ✅ Helper to flatten the pricing array so the frontend doesn't break
  private flattenPricing(service: any) {
    if (service && Array.isArray(service.pricing) && service.pricing.length > 0) {
      service.pricing = service.pricing[0];
    } else {
      service.pricing = null;
    }
    return service;
  }

  async getAll(filters: any) { return this.repo.findWithFilters(filters); }

  async getById(id: string) {
    const service = await this.repo.findByIdWithDetails(id);
    if (!service) throw new NotFoundError('Service catalog item', id);
    return this.flattenPricing(service);
  }

  // ✅ Catalog metadata for building forms/filters.
  // Returns the full set of valid enum values (so forms always have every option)
  // merged with whatever distinct values currently exist in the data.
  async getMetadata() {
    const [dbCategories, dbServiceTypes] = await Promise.all([
      this.repo.getDistinctCategories(),
      this.repo.getDistinctServiceTypes(),
    ]);

    const enumCategories = Object.values(ServiceCategory) as string[];
    const enumServiceTypes = Object.values(ServiceType) as string[];

    const merge = (a: string[], b: string[]) =>
      Array.from(new Set([...a, ...b])).filter(Boolean);

    return {
      categories: merge(enumCategories, dbCategories),
      serviceTypes: merge(enumServiceTypes, dbServiceTypes),
      nhisCoverageTypes: ['full', 'partial', 'not_covered'],
      paymentModes: ['cash', 'nhis', 'private_insurance', 'corporate'],
    };
  }

  // ✅ Find a single service by its NHIS service code
  async getByNHISCode(nhisCode: string) {
    if (!nhisCode) throw new ValidationError('NHIS code is required');
    const service = await this.repo.findByNHISCode(nhisCode);
    if (!service) throw new NotFoundError('Service with NHIS code', nhisCode);
    return this.flattenPricing(service);
  }

  async getNHISServices(filters: any) {
    const where: any = { isNHISCovered: true, isActive: true, nhisServiceCode: { not: null } };
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { nhisServiceCode: { contains: filters.search, mode: 'insensitive' } }
      ];
    }
    const result = await this.repo.findManyWithPagination({ where, page: filters.page, limit: filters.limit, orderBy: { name: 'asc' } });
    return { ...result, data: result.data.map(this.flattenPricing) };
  }

  async create(data: any, userId: string) {
    if (!data.name || !data.code || !data.serviceType) throw new ValidationError('Name, code, and service type are required');
    if (data.cashPrice === undefined) throw new ValidationError('cashPrice is required');

    const existing = await this.repo.getModel().findUnique({ where: { code: data.code } });
    if (existing) throw new ValidationError(`Service code '${data.code}' already exists`);

    return this.prisma.$transaction(async (tx) => {
      const serviceItem = await tx.serviceCatalog.create({
        data: {
          name: data.name, code: data.code, description: data.description || null,
          serviceType: data.serviceType as ServiceType, serviceCategory: (data.serviceCategory || 'opd') as ServiceCategory,
          subType: data.subType || null, nhisServiceCode: data.nhisServiceCode || null,
          isNHISCovered: data.isNHISCovered ?? true, nhisCoverageType: data.nhisCoverageType || 'full',
          nhisRequiresAuth: data.nhisRequiresAuth ?? false, privateInsRequiresAuth: data.privateInsRequiresAuth ?? false,
          isPrivateInsuranceExempted: data.isPrivateInsuranceExempted ?? false, unit: data.unit || 'Each',
          requiresClinicalNotes: data.requiresClinicalNotes ?? false, metadata: data.metadata || null,
          tariffCode: data.tariffCode || null, isPending: false, isActive: data.isActive ?? true,
          diagnosisId: data.diagnosisId || null, labTestTemplateId: data.labTestTemplateId || null,
          procedureTemplateId: data.procedureTemplateId || null, stockItemId: data.stockItemId || null,
          wardId: data.wardId || null, scanTemplateId: data.scanTemplateId || null,
          consultationTypeId: data.consultationTypeId || null, gdrgTariffId: data.gdrgTariffId || null,
          createdById: userId,
        },
      });

      await tx.servicePricing.create({
        data: {
          serviceCatalogId: serviceItem.id,
          cashPrice: parseFloat(data.cashPrice),
          nhisPrice: parseFloat(data.nhisPrice || 0),
          insurancePrice: parseFloat(data.insurancePrice ?? data.cashPrice),
          corporatePrice: parseFloat(data.corporatePrice ?? data.insurancePrice ?? data.cashPrice),
          vatRate: parseFloat(data.vatRate || 0),
          isTaxable: data.isTaxable ?? true,
          effectiveDate: new Date(), isActive: true,
        },
      });

      return this.flattenPricing(await this.repo.findByIdWithDetails(serviceItem.id));
    });
  }

  async update(id: string, updateData: any) {
    const existingService = await this.repo.findByIdWithDetails(id);
    if (!existingService) throw new NotFoundError('Service catalog item', id);

    if (updateData.code && updateData.code !== existingService.code) {
      const conflict = await this.repo.getModel().findUnique({ where: { code: updateData.code } });
      if (conflict) throw new ValidationError(`Service code '${updateData.code}' already exists`);
    }

    const serviceFields = ['name', 'code', 'description', 'serviceType', 'serviceCategory', 'subType', 'nhisServiceCode', 'isNHISCovered', 'nhisCoverageType', 'nhisRequiresAuth', 'privateInsRequiresAuth', 'isPrivateInsuranceExempted', 'unit', 'requiresClinicalNotes', 'metadata', 'isActive', 'tariffCode', 'diagnosisId', 'labTestTemplateId', 'procedureTemplateId', 'stockItemId', 'wardId', 'scanTemplateId', 'consultationTypeId', 'gdrgTariffId'];
    const pricingFields = ['cashPrice', 'nhisPrice', 'insurancePrice', 'corporatePrice', 'vatRate', 'isTaxable'];

    const serviceUpdateData: any = {};
    const pricingUpdateData: any = {};

    for (const field of serviceFields) {
      if (updateData[field] !== undefined) {
        const nullableIds = ['diagnosisId', 'labTestTemplateId', 'procedureTemplateId', 'stockItemId', 'wardId', 'scanTemplateId', 'consultationTypeId', 'gdrgTariffId'];
        serviceUpdateData[field] = nullableIds.includes(field) ? (updateData[field] || null) : updateData[field];
      }
    }
    for (const field of pricingFields) {
      if (updateData[field] !== undefined) pricingUpdateData[field] = parseFloat(updateData[field]);
    }

    return this.prisma.$transaction(async (tx) => {
      if (Object.keys(serviceUpdateData).length > 0) {
        await tx.serviceCatalog.update({ where: { id }, data: { ...serviceUpdateData, updatedAt: new Date() } });
      }
      if (Object.keys(pricingUpdateData).length > 0) {
        // ✅ FIXED: Uses historical pricing logic
        await this.repo.updatePricingHistorically(id, pricingUpdateData, tx);
      }
      return this.flattenPricing(await this.repo.findByIdWithDetails(id));
    });
  }

  async updatePricingOnly(id: string, pricingData: any) {
    const service = await this.repo.findByIdWithDetails(id);
    if (!service) throw new NotFoundError('Service catalog item', id);

    const parsedData = {
      ...(pricingData.cashPrice !== undefined && { cashPrice: parseFloat(pricingData.cashPrice) }),
      ...(pricingData.nhisPrice !== undefined && { nhisPrice: parseFloat(pricingData.nhisPrice) }),
      ...(pricingData.insurancePrice !== undefined && { insurancePrice: parseFloat(pricingData.insurancePrice) }),
      ...(pricingData.corporatePrice !== undefined && { corporatePrice: parseFloat(pricingData.corporatePrice) }),
      ...(pricingData.vatRate !== undefined && { vatRate: parseFloat(pricingData.vatRate) }),
      ...(pricingData.isTaxable !== undefined && { isTaxable: pricingData.isTaxable }),
    };

    // ✅ FIXED: Uses historical pricing logic
    return this.repo.updatePricingHistorically(id, parsedData);
  }

  async toggleStatus(id: string, isActive: boolean) {
    const service = await this.repo.getModel().findUnique({ where: { id } });
    if (!service) throw new NotFoundError('Service catalog item', id);
    return this.repo.getModel().update({ where: { id }, data: { isActive } });
  }

  async delete(id: string) {
    const existing = await this.repo.getModel().findUnique({
      where: { id },
      include: { ServiceRendered: { take: 1 }, BillLineItem: { take: 1 }, labTests: { take: 1 }, scans: { take: 1 }, procedures: { take: 1 }, medications: { take: 1 } }
    });
    if (!existing) throw new NotFoundError('Service catalog item', id);

    const hasDependencies = existing.ServiceRendered.length > 0 || existing.BillLineItem.length > 0 || existing.labTests.length > 0 || existing.scans.length > 0 || existing.procedures.length > 0 || existing.medications.length > 0;
    if (hasDependencies) throw new ValidationError('Cannot delete service with associated records. Deactivate it instead.');

    return this.prisma.$transaction(async (tx) => {
      await tx.servicePricing.deleteMany({ where: { serviceCatalogId: id } });
      await tx.serviceCatalog.delete({ where: { id } });
    });
  }

  // ==============================================
  // BUSINESS LOGIC (Preserved exactly from your code)
  // ==============================================

  async checkCoverage(serviceId: string, paymentMode: string) {
    const service = await this.getById(serviceId);
    if (!service.pricing) throw new NotFoundError('Pricing configuration', serviceId);

    const p = service.pricing;
    let isCovered = false, coverageAmount = 0, patientPayable = 0, price = 0;

    switch (paymentMode) {
      case 'cash': price = p.cashPrice; patientPayable = price; break;
      case 'nhis': price = p.nhisPrice; isCovered = service.isNHISCovered; coverageAmount = isCovered ? price : 0; patientPayable = isCovered ? 0 : p.cashPrice; break;
      case 'private_insurance': price = p.insurancePrice; isCovered = !service.isPrivateInsuranceExempted; coverageAmount = isCovered ? price : 0; patientPayable = isCovered ? 0 : p.cashPrice; break;
      case 'corporate': price = p.corporatePrice; isCovered = true; coverageAmount = price; patientPayable = 0; break;
    }

    return { serviceId, serviceName: service.name, paymentMode, price, isCovered, coverageAmount, patientPayable, allPrices: { cashPrice: p.cashPrice, nhisPrice: p.nhisPrice, insurancePrice: p.insurancePrice, corporatePrice: p.corporatePrice } };
  }

  async calculateCost(serviceId: string, paymentMode: string, quantity: number = 1) {
    const service = await this.getById(serviceId);
    if (!service.pricing) throw new NotFoundError('Pricing configuration', serviceId);

    const p = service.pricing;
    const qty = Math.max(1, quantity);
    let unitPrice = 0, totalAmount = 0, coverageAmount = 0, patientAmount = 0, vatAmount = 0;

    switch (paymentMode) {
      case 'cash': unitPrice = p.cashPrice; totalAmount = unitPrice * qty; patientAmount = totalAmount; break;
      case 'nhis': unitPrice = p.nhisPrice; totalAmount = p.cashPrice * qty; coverageAmount = service.isNHISCovered ? unitPrice * qty : 0; patientAmount = totalAmount - coverageAmount; break;
      case 'private_insurance': unitPrice = p.insurancePrice; totalAmount = p.cashPrice * qty; coverageAmount = !service.isPrivateInsuranceExempted ? unitPrice * qty : 0; patientAmount = totalAmount - coverageAmount; break;
      case 'corporate': unitPrice = p.corporatePrice; totalAmount = unitPrice * qty; coverageAmount = totalAmount; patientAmount = 0; break;
    }

    if (p.isTaxable && p.vatRate > 0) { vatAmount = (patientAmount * p.vatRate) / 100; patientAmount += vatAmount; }

    return { service: { id: service.id, name: service.name, code: service.code }, quantity: qty, paymentMode, totalAmount, coverageAmount, patientAmount, vatAmount, breakdown: { unitPrice, cashPrice: p.cashPrice, nhisPrice: p.nhisPrice, insurancePrice: p.insurancePrice, corporatePrice: p.corporatePrice, vatRate: p.vatRate, isTaxable: p.isTaxable } };
  }

  async getStatistics() {
    const [totalServices, activeServices, byType, byCategory, nhisReady, withPricing] = await Promise.all([
      this.repo.count(), this.repo.count({ isActive: true }),
      this.prisma.serviceCatalog.groupBy({ by: ['serviceType'], _count: { serviceType: true } }),
      this.prisma.serviceCatalog.groupBy({ by: ['serviceCategory'], _count: { serviceCategory: true } }),
      this.repo.count({ isNHISCovered: true, isActive: true, nhisServiceCode: { not: null }, pricing: { some: { nhisPrice: { gt: 0 }, isActive: true } } }),
      this.repo.count({ pricing: { some: { isActive: true } } })
    ]);

    return { totalServices, activeServices, inactiveServices: totalServices - activeServices, nhisReady, withPricing, missingPricing: totalServices - withPricing, byType: byType.reduce((acc, item) => { acc[item.serviceType] = item._count.serviceType; return acc; }, {}), byCategory: byCategory.reduce((acc, item) => { acc[item.serviceCategory] = item._count.serviceCategory; return acc; }, {}) };
  }

  async getNHISReadinessReport() {
    const services = await this.repo.getModel().findMany({ where: { isActive: true }, include: { pricing: { where: { isActive: true }, take: 1 } } });
    const mapped = services.map(this.flattenPricing);

    return {
      totalServices: mapped.length,
      nhisReady: mapped.filter(s => s.nhisServiceCode && s.isNHISCovered && (s.pricing?.nhisPrice ?? 0) > 0).length,
      missingNHISCodes: mapped.filter(s => !s.nhisServiceCode).length,
      missingNHISPrices: mapped.filter(s => s.nhisServiceCode && (!s.pricing || s.pricing.nhisPrice === 0)).length,
      notCovered: mapped.filter(s => !s.isNHISCovered).length,
      servicesMissingNHIS: mapped.filter(s => !s.nhisServiceCode || !(s.pricing?.nhisPrice)).map(s => ({ id: s.id, name: s.name, code: s.code, serviceType: s.serviceType, missingCode: !s.nhisServiceCode, missingPrice: !(s.pricing?.nhisPrice) }))
    };
  }

  async bulkImport(services: any[], userId: string) {
    const results = { created: 0, skipped: 0, errors: [] as string[] };
    for (const svc of services) {
      try {
        if (!svc.name || !svc.code || !svc.serviceType) { results.errors.push(`Skipped: missing data for ${svc.code}`); results.skipped++; continue; }
        const exists = await this.repo.getModel().findUnique({ where: { code: svc.code } });
        if (exists) { results.skipped++; continue; }

        await this.prisma.$transaction(async (tx) => {
          const created = await tx.serviceCatalog.create({ data: { name: svc.name, code: svc.code, serviceType: svc.serviceType, serviceCategory: svc.serviceCategory || 'opd', isNHISCovered: svc.isNHISCovered ?? true, createdById: userId } });
          await tx.servicePricing.create({ data: { serviceCatalogId: created.id, cashPrice: parseFloat(svc.cashPrice) || 0, nhisPrice: parseFloat(svc.nhisPrice) || 0, insurancePrice: parseFloat(svc.insurancePrice ?? svc.cashPrice), corporatePrice: parseFloat(svc.corporatePrice ?? svc.insurancePrice ?? svc.cashPrice), effectiveDate: new Date(), isActive: true } });
        });
        results.created++;
      } catch (err: any) { results.errors.push(`Error for '${svc.code}': ${err.message}`); results.skipped++; }
    }
    return results;
  }
}