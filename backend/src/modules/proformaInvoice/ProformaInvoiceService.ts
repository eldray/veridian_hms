import { PrismaClient, ProformaInvoiceStatus } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { ProformaInvoiceRepository } from './ProformaInvoiceRepository';
import { getCounterService } from '../../services/CounterService';

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
    const totalVat = items.reduce((sum, item) => {
      const vatRate = item.vatRate || 0;
      const itemTotal = toNumber(item.unitPrice) * item.quantity;
      return sum + (itemTotal * vatRate / 100);
    }, 0);
    return { subtotal, taxAmount: totalVat, totalAmount: subtotal + totalVat - discount };
  }

  async create(data: any, userId: string) {
    this.logInfo('Creating proforma invoice', { patientId: data.patientId });

    if (!(await this.prisma.patient.findUnique({ where: { id: data.patientId } }))) throw new Error('Patient not found');
    if (data.attendanceId && !(await this.prisma.attendance.findUnique({ where: { id: data.attendanceId } }))) throw new Error('Attendance not found');
    if (data.admissionId && !(await this.prisma.admission.findUnique({ where: { id: data.admissionId } }))) throw new Error('Admission not found');
    if (data.corporateAccountId && !(await this.prisma.corporateAccount.findUnique({ where: { id: data.corporateAccountId } }))) throw new Error('Corporate account not found');

    const processedItems = [];
    for (const item of data.items) {
      if (item.serviceCatalogId) {
        const service = await this.prisma.serviceCatalog.findUnique({
          where: { id: item.serviceCatalogId },
          include: { pricing: { where: { isActive: true }, take: 1, orderBy: { effectiveDate: 'desc' } } } // ✅ FIXED: 1-to-N pricing
        });
        if (!service) throw new Error(`Service catalog item not found: ${item.serviceCatalogId}`);
        
        // ✅ FIXED: Access array element
        if (!item.unitPrice && service.pricing && service.pricing.length > 0) {
          item.unitPrice = toNumber(service.pricing[0].cashPrice);
        }
      }

      const unitPrice = toNumber(item.unitPrice);
      const totalPrice = unitPrice * item.quantity;
      const vatAmount = totalPrice * (item.vatRate || 0) / 100;
      const insuranceCoverage = toNumber(item.insuranceCoverage) || 0;
      const patientResponsibility = item.isInsuranceCovered ? totalPrice - insuranceCoverage : totalPrice;

      processedItems.push({ ...item, unitPrice, vatAmount, totalPrice, patientResponsibility });
    }

    const { subtotal, taxAmount, totalAmount } = this.calculateTotals(processedItems, data.discount || 0);
    const validityDays = data.validityDays || 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + validityDays);

    return this.repository.create({
      referenceNumber: await this.generateReferenceNumber(),
      patientId: data.patientId, attendanceId: data.attendanceId, admissionId: data.admissionId,
      corporateAccountId: data.corporateAccountId, status: 'DRAFT', subtotal, discount: data.discount || 0,
      taxAmount, totalAmount, validityDays, expiresAt, notes: data.notes, termsAndConditions: data.termsAndConditions,
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
    if (!invoice) throw new Error('Proforma invoice not found');
    return invoice;
  }

  async update(id: string, data: any, userId: string) {
    const existing = await this.repository.findById(id);
    if (!existing) throw new Error('Proforma invoice not found');
    if (existing.status !== 'DRAFT') throw new Error('Only draft proforma invoices can be updated');

    let updateData: any = { notes: data.notes, termsAndConditions: data.termsAndConditions, discount: data.discount, validityDays: data.validityDays };

    if (data.items && data.items.length > 0) {
      const processedItems = [];
      for (const item of data.items) {
        if (item.serviceCatalogId) {
          const service = await this.prisma.serviceCatalog.findUnique({
            where: { id: item.serviceCatalogId },
            include: { pricing: { where: { isActive: true }, take: 1, orderBy: { effectiveDate: 'desc' } } }
          });
          if (!service) throw new Error(`Service catalog item not found: ${item.serviceCatalogId}`);
          if (!item.unitPrice && service.pricing && service.pricing.length > 0) {
            item.unitPrice = toNumber(service.pricing[0].cashPrice);
          }
        }
        const unitPrice = toNumber(item.unitPrice);
        const totalPrice = unitPrice * item.quantity;
        const vatAmount = totalPrice * (item.vatRate || 0) / 100;
        processedItems.push({ ...item, unitPrice, vatAmount, totalPrice });
      }
      const { subtotal, taxAmount, totalAmount } = this.calculateTotals(processedItems, data.discount || existing.discount);
      updateData = { ...updateData, subtotal, taxAmount, totalAmount, items: processedItems };
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
    if (!existing) throw new Error('Proforma invoice not found');
    if (existing.status !== 'DRAFT') throw new Error('Only draft proforma invoices can be sent');
    return this.repository.updateStatus(id, 'SENT', { updatedAt: new Date() });
  }

  async accept(id: string, userId: string) {
    const existing = await this.repository.findById(id);
    if (!existing) throw new Error('Proforma invoice not found');
    if (existing.status !== 'SENT') throw new Error('Only sent proforma invoices can be accepted');
    if (existing.expiresAt && new Date() > existing.expiresAt) throw new Error('Proforma invoice has expired');
    return this.repository.updateStatus(id, 'APPROVED', { approvedById: userId, approvedAt: new Date() });
  }

  async reject(id: string, reason: string, userId: string) {
    const existing = await this.repository.findById(id);
    if (!existing) throw new Error('Proforma invoice not found');
    if (existing.status !== 'SENT') throw new Error('Only sent proforma invoices can be rejected');
    return this.repository.updateStatus(id, 'REJECTED', { notes: reason });
  }

  // ✅ FIXED: Wrapped in transaction and uses CounterService
  async convertToBill(id: string, data: any, userId: string) {
    const existing = await this.repository.findById(id);
    if (!existing) throw new Error('Proforma invoice not found');
    if (existing.status !== 'APPROVED' && existing.status !== 'SENT') throw new Error('Only approved or sent proforma invoices can be converted to bills');
    if (existing.convertedToBillId) throw new Error('This proforma invoice has already been converted to a bill');

    return this.prisma.$transaction(async (tx) => {
      const billNumber = getCounterService().nextBillNumber(); // ✅ FIXED: No more Math.random()
      
      const insuranceCovered = existing.items.reduce((sum, item) => sum + toNumber(item.insuranceCoverage), 0);
      const patientPayable = existing.items.reduce((sum, item) => sum + toNumber(item.patientResponsibility), 0) - toNumber(existing.discount);

      const bill = await tx.bill.create({
        data: {
          billNumber, patientId: existing.patientId, attendanceId: existing.attendanceId, admissionId: existing.admissionId,
          paymentMode: data.paymentMode, corporateAccountId: existing.corporateAccountId, status: 'pending',
          subtotal: existing.subtotal, discount: existing.discount, taxAmount: existing.taxAmount, totalAmount: existing.totalAmount,
          insuranceCovered, patientPayable, billDate: new Date(), createdById: userId,
          notes: `Converted from proforma invoice: ${existing.referenceNumber}`
        }
      });

      for (const item of existing.items) {
        await tx.billLineItem.create({
          data: {
            billId: bill.id, serviceCatalogId: item.serviceCatalogId, description: item.description, serviceType: item.serviceType,
            quantity: item.quantity, unitPrice: item.unitPrice, pricingBasis: item.pricingBasis, vatRate: item.vatRate,
            vatAmount: item.vatAmount, lineTotal: item.totalPrice, insuranceCoveredAmount: item.insuranceCoverage,
            patientPayableAmount: item.patientResponsibility, discount: 0
          }
        });
      }

      const updatedProforma = await tx.proformaInvoice.update({
        where: { id }, data: { status: 'CONVERTED', convertedToBillId: bill.id },
        include: { patient: true, corporateAccount: true }
      });

      return { proformaInvoice: updatedProforma, bill };
    });
  }

  async delete(id: string, userId: string) {
    const existing = await this.repository.findById(id);
    if (!existing) throw new Error('Proforma invoice not found');
    if (existing.status !== 'DRAFT') throw new Error('Only draft proforma invoices can be deleted');
    await this.repository.delete(id);
    return { success: true };
  }

  async getStatistics(filters: any) { return this.repository.getStatistics(filters); }
  async getExpiringSoon(days: number = 7) { return this.repository.getExpiringSoon(days); }
  async getByPatientId(patientId: string) { return this.repository.findByPatient(patientId); }
  async getByCorporateAccountId(corporateAccountId: string) { return this.repository.findByCorporateAccount(corporateAccountId); }
}