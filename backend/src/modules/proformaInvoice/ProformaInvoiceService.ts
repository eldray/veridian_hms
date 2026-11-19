import { PrismaClient, Prisma, ProformaInvoiceStatus } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { ProformaInvoiceRepository } from './ProformaInvoiceRepository';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { computeLineTax, loadTaxConfiguration, mergeTaxBreakdowns } from '../../utils/tax';

// ✅ Helper to safely convert Prisma Decimal objects to JS numbers for math
const toNumber = (val: any): number => val ? parseFloat(val.toString()) : 0;

export class ProformaInvoiceService extends BaseService {
  private repository: ProformaInvoiceRepository;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    super('ProformaInvoiceService');
    this.prisma = prisma;
    this.repository = new ProformaInvoiceRepository(prisma);
  }

  private async generateReferenceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const count = await this.prisma.proformaInvoice.count({
      where: { createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } }
    });
    return `EST-${year}${month}-${String(count + 1).padStart(4, '0')}`;
  }

  // ✅ FIXED: Safely parse Decimals before math
  private calculateTotals(items: any[], discount: number = 0) {
    const subtotal = items.reduce((sum, item) => sum + (toNumber(item.unitPrice) * item.quantity), 0);
    // Line tax is already component-resolved (VAT + levies), so the invoice total
    // is the sum of the stored amounts rather than a fresh percentage calculation.
    const taxAmount = items.reduce((sum, item) => sum + toNumber(item.vatAmount), 0);
    return { subtotal, taxAmount, totalAmount: subtotal + taxAmount - discount };
  }

  // The catalog carries a price per payment mode, so a line left blank is filled
  // from the tier that matches the basis the line was raised on — not always cash.
  private tierPrice(pricing: any, basis: string): number {
    const row = Array.isArray(pricing) ? pricing[0] : pricing;
    if (!row) return 0;
    const byBasis: Record<string, string> = {
      cash: 'cashPrice', nhis: 'nhisPrice', private_insurance: 'insurancePrice', corporate: 'corporatePrice',
    };
    return toNumber(row[byBasis[basis] || 'cashPrice']);
  }

  async create(data: any, userId: string) {
    this.logInfo('Creating proforma invoice', { patientId: data.patientId });

    // A quote can stand on its own for a walk-in client who is not registered yet,
    // so the patient is only checked when one is attached.
    if (data.patientId && !(await this.prisma.patient.findUnique({ where: { id: data.patientId } }))) throw new NotFoundError('Patient not found');
    if (data.attendanceId && !(await this.prisma.attendance.findUnique({ where: { id: data.attendanceId } }))) throw new NotFoundError('Attendance not found');
    if (data.admissionId && !(await this.prisma.admission.findUnique({ where: { id: data.admissionId } }))) throw new NotFoundError('Admission not found');
    if (data.corporateAccountId && !(await this.prisma.corporateAccount.findUnique({ where: { id: data.corporateAccountId } }))) throw new NotFoundError('Corporate account not found');

    const processedItems = [];
    const taxConfig = await loadTaxConfiguration(this.prisma);
    const lineTaxes = [];
    for (const item of data.items) {
      let pricing: any = null;
      if (item.serviceCatalogId) {
        const service = await this.prisma.serviceCatalog.findUnique({
          where: { id: item.serviceCatalogId },
          include: { pricing: { where: { isActive: true }, take: 1, orderBy: { effectiveDate: 'desc' } } } // ✅ FIXED: 1-to-N pricing
        });
        if (!service) throw new NotFoundError(`Service catalog item not found: ${item.serviceCatalogId}`);
        pricing = Array.isArray(service.pricing) ? service.pricing[0] : service.pricing;

        if (item.unitPrice === undefined || item.unitPrice === null || item.unitPrice === '') {
          item.unitPrice = this.tierPrice(service.pricing, item.pricingBasis);
        }
      }

      const unitPrice = toNumber(item.unitPrice);
      const totalPrice = unitPrice * item.quantity;
      const insuranceCoverage = toNumber(item.insuranceCoverage) || 0;
      const patientResponsibility = item.isInsuranceCovered ? totalPrice - insuranceCoverage : totalPrice;

      // Tax is derived from the catalog, never trusted from the browser. Custom lines
      // (no catalog link) stay exempt unless the caller supplies an explicit rate.
      const lineTax = computeLineTax(
        patientResponsibility,
        {
          isTaxable: pricing ? pricing.isTaxable === true : item.isTaxable === true,
          overrideRate: pricing ? pricing.vatRate ?? 0 : item.vatRate ?? 0,
        },
        taxConfig,
        item.pricingBasis || 'cash',
      );
      if (lineTax.total > 0) lineTaxes.push(lineTax);

      processedItems.push({
        ...item,
        unitPrice,
        vatRate: lineTax.effectiveRate,
        vatAmount: lineTax.total,
        taxBreakdown: lineTax.total > 0 ? lineTax : undefined,
        totalPrice,
        patientResponsibility,
      });
    }

    const { subtotal, taxAmount, totalAmount } = this.calculateTotals(processedItems, data.discount || 0);
    const taxBreakdown = mergeTaxBreakdowns(lineTaxes, processedItems[0]?.pricingBasis || 'cash');
    const validityDays = data.validityDays || 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + validityDays);

    return this.repository.create({
      referenceNumber: await this.generateReferenceNumber(),
      patientId: data.patientId, attendanceId: data.attendanceId, admissionId: data.admissionId,
      corporateAccountId: data.corporateAccountId, status: 'DRAFT', subtotal, discount: data.discount || 0,
      taxAmount, taxBreakdown, totalAmount, validityDays, expiresAt, notes: data.notes, termsAndConditions: data.termsAndConditions,
      createdById: userId, items: processedItems
    });
  }

  async getAll(filters: any) {
    const result = await this.repository.findManyInvoices({
      patientId: filters.patientId, corporateAccountId: filters.accountId, status: filters.status,
      attendanceId: filters.encounterId, fromDate: filters.fromDate, toDate: filters.toDate,
      page: filters.page, limit: filters.limit
    });
    return { data: result.items, pagination: { page: result.page, limit: result.limit, total: result.total, pages: result.totalPages } };
  }

  async getById(id: string) {
    const invoice = await this.repository.findById(id);
    if (!invoice) throw new NotFoundError('Proforma invoice not found');
    return invoice;
  }

  async update(id: string, data: any, userId: string) {
    const existing = await this.repository.findById(id);
    if (!existing) throw new NotFoundError('Proforma invoice not found');
    if (existing.status !== 'DRAFT') throw new ValidationError('Only draft proforma invoices can be updated');

    let updateData: any = { notes: data.notes, termsAndConditions: data.termsAndConditions, discount: data.discount, validityDays: data.validityDays };

    if (Array.isArray(data.items)) {
      if (data.items.length === 0) throw new ValidationError('At least one proforma invoice item is required');
      const taxConfig = await loadTaxConfiguration(this.prisma);
      const processedItems = [];
      const lineTaxes = [];
      for (const item of data.items) {
        let pricing: any = null;
        if (item.serviceCatalogId) {
          const service = await this.prisma.serviceCatalog.findUnique({
            where: { id: item.serviceCatalogId },
            include: { pricing: { where: { isActive: true }, take: 1, orderBy: { effectiveDate: 'desc' } } }
          });
          if (!service) throw new NotFoundError(`Service catalog item not found: ${item.serviceCatalogId}`);
          pricing = Array.isArray(service.pricing) ? service.pricing[0] : service.pricing;
          if (item.unitPrice === undefined || item.unitPrice === null || item.unitPrice === '') {
            item.unitPrice = this.tierPrice(service.pricing, item.pricingBasis);
          }
        }
        const unitPrice = toNumber(item.unitPrice);
        const totalPrice = unitPrice * item.quantity;
        const insuranceCoverage = toNumber(item.insuranceCoverage) || 0;
        const patientResponsibility = item.isInsuranceCovered ? totalPrice - insuranceCoverage : totalPrice;
        const lineTax = computeLineTax(
          patientResponsibility,
          {
            isTaxable: pricing ? pricing.isTaxable === true : item.isTaxable === true,
            overrideRate: pricing ? pricing.vatRate ?? 0 : item.vatRate ?? 0,
          },
          taxConfig,
          item.pricingBasis || 'cash',
        );
        if (lineTax.total > 0) lineTaxes.push(lineTax);
        processedItems.push({
          ...item,
          unitPrice,
          vatRate: lineTax.effectiveRate,
          vatAmount: lineTax.total,
          taxBreakdown: lineTax.total > 0 ? lineTax : undefined,
          totalPrice,
          patientResponsibility,
        });
      }
      const { subtotal, taxAmount, totalAmount } = this.calculateTotals(processedItems, data.discount || existing.discount);
      const taxBreakdown = mergeTaxBreakdowns(lineTaxes, processedItems[0]?.pricingBasis || 'cash');
      updateData = { ...updateData, subtotal, taxAmount, taxBreakdown: taxBreakdown ?? Prisma.DbNull, totalAmount, items: processedItems };
    }

    if (data.validityDays && data.validityDays !== existing.validityDays) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + data.validityDays);
      updateData.expiresAt = expiresAt;
    }

    return this.repository.update(id, updateData);
  }

  async send(id: string, userId: string) {
    const existing = await this.repository.findById(id);
    if (!existing) throw new NotFoundError('Proforma invoice not found');
    if (existing.status !== 'DRAFT') throw new ValidationError('Only draft proforma invoices can be sent');
    return this.repository.updateStatus(id, 'SENT', { updatedAt: new Date() });
  }

  async accept(id: string, userId: string) {
    const existing = await this.repository.findById(id);
    if (!existing) throw new NotFoundError('Proforma invoice not found');
    if (existing.status !== 'SENT') throw new ValidationError('Only sent proforma invoices can be accepted');
    if (existing.expiresAt && new Date() > existing.expiresAt) throw new ValidationError('Proforma invoice has expired');
    return this.repository.updateStatus(id, 'APPROVED', { approvedById: userId, approvedAt: new Date() });
  }

  async reject(id: string, reason: string, userId: string) {
    const existing = await this.repository.findById(id);
    if (!existing) throw new NotFoundError('Proforma invoice not found');
    if (existing.status !== 'SENT') throw new ValidationError('Only sent proforma invoices can be rejected');
    return this.repository.updateStatus(id, 'REJECTED', { notes: reason });
  }

  async delete(id: string, userId: string) {
    const existing = await this.repository.findById(id);
    if (!existing) throw new NotFoundError('Proforma invoice not found');
    if (existing.status !== 'DRAFT') throw new ValidationError('Only draft proforma invoices can be deleted');
    await this.repository.delete(id);
    return { success: true };
  }

  async getStatistics(filters: any) { return this.repository.getStatistics(filters); }
  async getExpiringSoon(days: number = 7) { return this.repository.getExpiringSoon(days); }
  async getByPatientId(patientId: string) { return this.repository.findByPatient(patientId); }
  async getByCorporateAccountId(corporateAccountId: string) { return this.repository.findByCorporateAccount(corporateAccountId); }
}