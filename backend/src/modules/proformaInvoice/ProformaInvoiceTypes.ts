import { ProformaInvoiceStatus } from '@prisma/client';

export interface ProformaInvoice {
  id: string;
  referenceNumber: string;
  patientId: string;
  attendanceId?: string | null;
  admissionId?: string | null;
  corporateAccountId?: string | null;
  status: ProformaInvoiceStatus;
  subtotal: number;
  discount: number;
  taxAmount: number;
  totalAmount: number;
  validityDays: number;
  expiresAt?: Date | null;
  notes?: string | null;
  termsAndConditions?: string | null;
  createdById: string;
  approvedById?: string | null;
  approvedAt?: Date | null;
  convertedToBillId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProformaInvoiceItem {
  id: string;
  proformaInvoiceId: string;
  serviceCatalogId?: string | null;
  description: string;
  serviceType: string;
  quantity: number;
  unitPrice: number;
  pricingBasis: string;
  vatRate: number;
  vatAmount: number;
  totalPrice: number;
  isInsuranceCovered: boolean;
  insuranceCoverage: number;
  patientResponsibility: number;
}

export interface CreateProformaInvoiceDTO {
  patientId: string;
  attendanceId?: string;
  admissionId?: string;
  corporateAccountId?: string;
  items: Array<{
    serviceCatalogId?: string;
    description: string;
    serviceType: string;
    quantity: number;
    unitPrice: number;
    pricingBasis: string;
    vatRate?: number;
    isInsuranceCovered?: boolean;
    insuranceCoverage?: number;
  }>;
  validityDays?: number;
  notes?: string;
  termsAndConditions?: string;
  discount?: number;
}

export interface UpdateProformaInvoiceDTO {
  notes?: string;
  termsAndConditions?: string;
  discount?: number;
  validityDays?: number;
  items?: Array<{
    id?: string;
    serviceCatalogId?: string;
    description: string;
    serviceType: string;
    quantity: number;
    unitPrice: number;
    pricingBasis: string;
    vatRate?: number;
    isInsuranceCovered?: boolean;
    insuranceCoverage?: number;
  }>;
}

export interface ConvertToBillDTO {
  paymentMode: 'cash' | 'nhis' | 'private_insurance' | 'corporate';
  notes?: string;
}

export interface ProformaInvoiceFilters {
  patientId?: string;
  accountId?: string; // corporateAccountId
  status?: ProformaInvoiceStatus;
  encounterId?: string; // attendanceId
  fromDate?: Date;
  toDate?: Date;
  page?: number;
  limit?: number;
}