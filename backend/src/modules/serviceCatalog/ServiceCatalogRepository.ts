import { PrismaClient, ServiceCatalog } from '@prisma/client';
import { BaseRepository } from '../../shared/base/BaseRepository';

export class ServiceCatalogRepository extends BaseRepository<ServiceCatalog, any, any> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'serviceCatalog');
  }

  // ✅ CRITICAL: Safely updates pricing by expiring the old and creating a new record
  async updatePricingHistorically(serviceCatalogId: string, newPricingData: any, tx?: any) {
    const model = tx ? tx.servicePricing : this.prisma.servicePricing;
    const now = new Date();

    // 0. Start from the price that is active now: a change to ONE price (say cash) must keep the others
    //    (NHIS, insurance, corporate, VAT). Before, the new row held only the changed field, so the
    //    save failed on the missing insurance price, and unchanged prices would have reset to 0.
    const current = await model.findFirst({
      where: { serviceCatalogId, isActive: true },
      orderBy: { effectiveDate: 'desc' }
    });
    const merged: any = {
      ...(current
        ? {
            cashPrice: current.cashPrice, nhisPrice: current.nhisPrice, insurancePrice: current.insurancePrice,
            corporatePrice: current.corporatePrice, vatRate: current.vatRate, isTaxable: current.isTaxable
          }
        : {}),
      ...newPricingData
    };
    if (merged.insurancePrice === undefined) merged.insurancePrice = merged.cashPrice;

    // 1. Expire all currently active pricing records for this service
    await model.updateMany({
      where: { serviceCatalogId, isActive: true },
      data: { isActive: false, expiryDate: now }
    });

    // 2. Create the new pricing record
    return model.create({
      data: {
        serviceCatalogId,
        ...merged,
        effectiveDate: now,
        expiryDate: null,
        isActive: true
      }
    });
  }

  // Helper includes
  private getBaseInclude() {
    return {
      // ✅ Only fetch the currently active pricing
      pricing: {
        where: { isActive: true },
        orderBy: { effectiveDate: 'desc' },
        take: 1,
        select: { id: true, cashPrice: true, nhisPrice: true, insurancePrice: true, corporatePrice: true, vatRate: true, isTaxable: true, isActive: true, effectiveDate: true, expiryDate: true }
      },
      Diagnosis: { select: { id: true, name: true, icdCode: true } },
      LabTestTemplate: { select: { id: true, name: true, investigationCode: true, category: true } },
      ProcedureTemplate: { select: { id: true, name: true, procedureCode: true, category: true } },
      ScanTemplate: { select: { id: true, name: true, scanCode: true, category: true } },
      StockItem: { select: { id: true, name: true, drugCode: true, strength: true, currentStock: true } },
      Ward: { select: { id: true, wardName: true, wardType: true } },
      ConsultationType: { select: { id: true, name: true, code: true } },
      User: { select: { id: true, fullName: true, username: true } },
      _count: { select: { ServiceRendered: true, BillLineItem: true, labTests: true, scans: true, procedures: true, medications: true } }
    };
  }

  async findWithFilters(filters: any) {
    const { serviceType, category, search, isActive, page = 1, limit = 1000 } = filters;
    const where: any = {};
    if (serviceType) where.serviceType = serviceType;
    if (category) where.serviceCategory = category;
    if (isActive !== undefined) where.isActive = isActive === true || isActive === 'true';
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { nhisServiceCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.findManyWithPagination({
      where, page, limit: Math.min(limit, 1000), orderBy: { name: 'asc' },
      include: this.getBaseInclude()
    });
  }

  async findByIdWithDetails(id: string) {
    return this.getModel().findUnique({ where: { id }, include: this.getBaseInclude() });
  }

  // ✅ Find a single active service by its NHIS service code
  async findByNHISCode(nhisServiceCode: string) {
    return this.getModel().findFirst({
      where: { nhisServiceCode },
      include: this.getBaseInclude(),
      orderBy: { createdAt: 'desc' }
    });
  }

  // ✅ Distinct values used to build catalog forms/filters
  async getDistinctCategories(): Promise<string[]> {
    const rows = await this.getModel().findMany({
      distinct: ['serviceCategory'],
      select: { serviceCategory: true },
      orderBy: { serviceCategory: 'asc' }
    });
    return rows.map((r: any) => r.serviceCategory).filter(Boolean);
  }

  async getDistinctServiceTypes(): Promise<string[]> {
    const rows = await this.getModel().findMany({
      distinct: ['serviceType'],
      select: { serviceType: true },
      orderBy: { serviceType: 'asc' }
    });
    return rows.map((r: any) => r.serviceType).filter(Boolean);
  }
}