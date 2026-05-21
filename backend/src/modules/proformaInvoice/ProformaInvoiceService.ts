// modules/proformaInvoice/ProformaInvoiceService.ts
import { PrismaClient, ProformaInvoiceStatus } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { ProformaInvoiceRepository } from './ProformaInvoiceRepository';
import {
  CreateProformaInvoiceDTO,
  UpdateProformaInvoiceDTO,
  ProformaInvoiceFilters,
  ConvertToBillDTO,
} from './ProformaInvoiceTypes';

const prisma = new PrismaClient();

export class ProformaInvoiceService extends BaseService {
  private repository: ProformaInvoiceRepository;

  constructor() {
    super('ProformaInvoiceService');
    this.repository = new ProformaInvoiceRepository();
  }

  /**
   * Generate unique reference number
   */
  private async generateReferenceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const count = await prisma.proformaInvoice.count({
      where: {
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    });
    const sequence = String(count + 1).padStart(4, '0');
    return `EST-${year}${month}-${sequence}`;
  }

  /**
   * Calculate invoice totals from items
   */
  private calculateTotals(items: any[], discount: number = 0) {
    const subtotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const totalVat = items.reduce((sum, item) => {
      const vatRate = item.vatRate || 0;
      const itemTotal = item.unitPrice * item.quantity;
      return sum + (itemTotal * vatRate / 100);
    }, 0);
    const totalAmount = subtotal + totalVat - discount;
    
    return { subtotal, taxAmount: totalVat, totalAmount };
  }

  /**
   * Create a new proforma invoice
   */
  async create(data: CreateProformaInvoiceDTO, userId: string) {
    this.logInfo('Creating proforma invoice', { patientId: data.patientId });

    // Validate that patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: data.patientId },
    });
    if (!patient) {
      throw new Error('Patient not found');
    }

    // Validate attendance if provided
    if (data.attendanceId) {
      const attendance = await prisma.attendance.findUnique({
        where: { id: data.attendanceId },
      });
      if (!attendance) {
        throw new Error('Attendance not found');
      }
    }

    // Validate admission if provided
    if (data.admissionId) {
      const admission = await prisma.admission.findUnique({
        where: { id: data.admissionId },
      });
      if (!admission) {
        throw new Error('Admission not found');
      }
    }

    // Validate corporate account if provided
    if (data.corporateAccountId) {
      const corporateAccount = await prisma.corporateAccount.findUnique({
        where: { id: data.corporateAccountId },
      });
      if (!corporateAccount) {
        throw new Error('Corporate account not found');
      }
    }

    // Validate and process items
    const processedItems = [];
    for (const item of data.items) {
      // Validate service catalog if provided
      if (item.serviceCatalogId) {
        const service = await prisma.serviceCatalog.findUnique({
          where: { id: item.serviceCatalogId },
          include: { pricing: true },
        });
        if (!service) {
          throw new Error(`Service catalog item not found: ${item.serviceCatalogId}`);
        }
        // Use pricing from service catalog if not provided
        if (!item.unitPrice && service.pricing) {
          item.unitPrice = service.pricing.cashPrice;
        }
      }

      const vatRate = item.vatRate || 0;
      const totalPrice = item.unitPrice * item.quantity;
      const vatAmount = totalPrice * vatRate / 100;
      const insuranceCoverage = item.insuranceCoverage || 0;
      const patientResponsibility = item.isInsuranceCovered 
        ? totalPrice - insuranceCoverage
        : totalPrice;

      processedItems.push({
        ...item,
        vatAmount,
        totalPrice,
        patientResponsibility,
      });
    }

    const { subtotal, taxAmount, totalAmount } = this.calculateTotals(processedItems, data.discount || 0);
    
    const referenceNumber = await this.generateReferenceNumber();
    const validityDays = data.validityDays || 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + validityDays);

    const invoiceData = {
      referenceNumber,
      patientId: data.patientId,
      attendanceId: data.attendanceId,
      admissionId: data.admissionId,
      corporateAccountId: data.corporateAccountId,
      status: 'DRAFT',
      subtotal,
      discount: data.discount || 0,
      taxAmount,
      totalAmount,
      validityDays,
      expiresAt,
      notes: data.notes,
      termsAndConditions: data.termsAndConditions,
      createdById: userId,
      items: processedItems.map(item => ({
        serviceCatalogId: item.serviceCatalogId,
        description: item.description,
        serviceType: item.serviceType,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        pricingBasis: item.pricingBasis,
        vatRate: item.vatRate || 0,
        vatAmount: item.vatAmount || 0,
        totalPrice: item.totalPrice || (item.unitPrice * item.quantity),
        isInsuranceCovered: item.isInsuranceCovered || false,
        insuranceCoverage: item.insuranceCoverage || 0,
        patientResponsibility: item.patientResponsibility || (item.unitPrice * item.quantity),
      })),
    };

    const result = await this.repository.create(invoiceData);
    
    this.logInfo('Proforma invoice created', { id: result.id, referenceNumber });
    
    return result;
  }

  /**
   * Get all proforma invoices with filters
   */
  async getAll(filters: ProformaInvoiceFilters) {
    this.logInfo('Fetching proforma invoices', { filters });
    
    const result = await this.repository.findMany({
      patientId: filters.patientId,
      corporateAccountId: filters.accountId,
      status: filters.status,
      attendanceId: filters.encounterId,
      fromDate: filters.fromDate,
      toDate: filters.toDate,
      page: filters.page,
      limit: filters.limit,
    });
    
    return {
      data: result.items,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: result.totalPages,
      },
    };
  }

  /**
   * Get proforma invoice by ID
   */
  async getById(id: string) {
    this.logDebug('Fetching proforma invoice', { id });
    
    const invoice = await this.repository.findById(id);
    
    if (!invoice) {
      throw new Error('Proforma invoice not found');
    }
    
    return invoice;
  }

  /**
   * Update proforma invoice (DRAFT only)
   */
  async update(id: string, data: UpdateProformaInvoiceDTO, userId: string) {
    this.logInfo('Updating proforma invoice', { id });
    
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('Proforma invoice not found');
    }
    
    if (existing.status !== 'DRAFT') {
      throw new Error('Only draft proforma invoices can be updated');
    }
    
    let updateData: any = {
      notes: data.notes,
      termsAndConditions: data.termsAndConditions,
      discount: data.discount,
      validityDays: data.validityDays,
    };
    
    // If items are being updated, recalculate totals
    if (data.items && data.items.length > 0) {
      const processedItems = [];
      for (const item of data.items) {
        if (item.serviceCatalogId) {
          const service = await prisma.serviceCatalog.findUnique({
            where: { id: item.serviceCatalogId },
            include: { pricing: true },
          });
          if (!service && item.serviceCatalogId) {
            throw new Error(`Service catalog item not found: ${item.serviceCatalogId}`);
          }
          if (!item.unitPrice && service?.pricing) {
            item.unitPrice = service.pricing.cashPrice;
          }
        }
        
        const totalPrice = item.unitPrice * item.quantity;
        const vatAmount = totalPrice * (item.vatRate || 0) / 100;
        
        processedItems.push({
          ...item,
          vatAmount,
          totalPrice,
        });
      }
      
      const { subtotal, taxAmount, totalAmount } = this.calculateTotals(processedItems, data.discount || existing.discount);
      
      updateData = {
        ...updateData,
        subtotal,
        taxAmount,
        totalAmount,
        items: processedItems,
      };
    }
    
    // Update expiry date if validity days changed
    if (data.validityDays && data.validityDays !== existing.validityDays) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + data.validityDays);
      updateData.expiresAt = expiresAt;
    }
    
    const result = await this.repository.update(id, updateData);
    
    this.logInfo('Proforma invoice updated', { id });
    
    return result;
  }

  /**
   * Send proforma invoice (change status to SENT)
   */
  async send(id: string, userId: string) {
    this.logInfo('Sending proforma invoice', { id });
    
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('Proforma invoice not found');
    }
    
    if (existing.status !== 'DRAFT') {
      throw new Error('Only draft proforma invoices can be sent');
    }
    
    const result = await this.repository.updateStatus(id, 'SENT', {
      updatedAt: new Date(),
    });
    
    this.logInfo('Proforma invoice sent', { id });
    
    // TODO: Send notification/email/SMS to patient or corporate account
    
    return result;
  }

  /**
   * Accept proforma invoice
   */
  async accept(id: string, userId: string) {
    this.logInfo('Accepting proforma invoice', { id });
    
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('Proforma invoice not found');
    }
    
    if (existing.status !== 'SENT') {
      throw new Error('Only sent proforma invoices can be accepted');
    }
    
    if (existing.expiresAt && new Date() > existing.expiresAt) {
      throw new Error('Proforma invoice has expired');
    }
    
    const result = await this.repository.updateStatus(id, 'APPROVED', {
      approvedById: userId,
      approvedAt: new Date(),
    });
    
    this.logInfo('Proforma invoice accepted', { id });
    
    return result;
  }

  /**
   * Reject proforma invoice
   */
  async reject(id: string, reason: string, userId: string) {
    this.logInfo('Rejecting proforma invoice', { id, reason });
    
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('Proforma invoice not found');
    }
    
    if (existing.status !== 'SENT') {
      throw new Error('Only sent proforma invoices can be rejected');
    }
    
    const result = await this.repository.updateStatus(id, 'REJECTED', {
      notes: reason,
    });
    
    this.logInfo('Proforma invoice rejected', { id });
    
    return result;
  }

  /**
   * Convert proforma invoice to bill
   */
  async convertToBill(id: string, data: ConvertToBillDTO, userId: string) {
    this.logInfo('Converting proforma invoice to bill', { id });
    
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('Proforma invoice not found');
    }
    
    if (existing.status !== 'APPROVED' && existing.status !== 'SENT') {
      throw new Error('Only approved or sent proforma invoices can be converted to bills');
    }
    
    // Check if already converted
    if (existing.convertedToBillId) {
      throw new Error('This proforma invoice has already been converted to a bill');
    }
    
    // Create a new bill
    const billNumber = `BILL-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    
    const bill = await prisma.bill.create({
      data: {
        billNumber,
        patientId: existing.patientId,
        attendanceId: existing.attendanceId,
        admissionId: existing.admissionId,
        paymentMode: data.paymentMode,
        corporateAccountId: existing.corporateAccountId,
        status: 'pending',
        subtotal: existing.subtotal,
        discount: existing.discount,
        taxAmount: existing.taxAmount,
        totalAmount: existing.totalAmount,
        insuranceCovered: existing.items.reduce((sum, item) => sum + (item.insuranceCoverage || 0), 0),
        patientPayable: existing.items.reduce((sum, item) => sum + item.patientResponsibility, 0) - (existing.discount || 0),
        billDate: new Date(),
        createdById: userId,
        notes: `Converted from proforma invoice: ${existing.referenceNumber}`,
      },
    });
    
    // Create bill line items from proforma invoice items
    for (const item of existing.items) {
      await prisma.billLineItem.create({
        data: {
          billId: bill.id,
          serviceCatalogId: item.serviceCatalogId,
          description: item.description,
          serviceType: item.serviceType,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          pricingBasis: item.pricingBasis,
          vatRate: item.vatRate,
          vatAmount: item.vatAmount,
          lineTotal: item.totalPrice,
          insuranceCoveredAmount: item.insuranceCoverage,
          patientPayableAmount: item.patientResponsibility,
          discount: 0,
        },
      });
    }
    
    // Update proforma invoice with bill reference
    const result = await this.repository.convertToBill(id, bill.id);
    
    this.logInfo('Proforma invoice converted to bill', { id, billId: bill.id });
    
    return {
      proformaInvoice: result,
      bill,
    };
  }

  /**
   * Delete proforma invoice (DRAFT only)
   */
  async delete(id: string, userId: string) {
    this.logInfo('Deleting proforma invoice', { id });
    
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('Proforma invoice not found');
    }
    
    if (existing.status !== 'DRAFT') {
      throw new Error('Only draft proforma invoices can be deleted');
    }
    
    await this.repository.delete(id);
    
    this.logInfo('Proforma invoice deleted', { id });
    
    return { success: true };
  }

  /**
   * Get proforma invoice statistics
   */
  async getStatistics(filters: ProformaInvoiceFilters) {
    this.logInfo('Fetching proforma invoice statistics', { filters });
    
    const stats = await this.repository.getStatistics({
      patientId: filters.patientId,
      corporateAccountId: filters.accountId,
      status: filters.status,
      fromDate: filters.fromDate,
      toDate: filters.toDate,
    });
    
    return stats;
  }

  /**
   * Get expiring proforma invoices
   */
  async getExpiringSoon(days: number = 7) {
    this.logInfo('Fetching expiring proforma invoices', { days });
    
    const expiring = await this.repository.getExpiringSoon(days);
    
    return expiring;
  }

  /**
   * Get proforma invoices by patient
   */
  async getByPatientId(patientId: string) {
    this.logInfo('Fetching proforma invoices by patient', { patientId });
    
    const invoices = await this.repository.findByPatient(patientId);
    
    return invoices;
  }

  /**
   * Get proforma invoices by corporate account
   */
  async getByCorporateAccountId(corporateAccountId: string) {
    this.logInfo('Fetching proforma invoices by corporate account', { corporateAccountId });
    
    const invoices = await this.repository.findByCorporateAccount(corporateAccountId);
    
    return invoices;
  }
}