/**
 * Billing Module Types
 * Type definitions for billing and invoice management
 */

import { BillStatus, PaymentMode, PaymentMethod } from '@prisma/client';

export interface BillItemDTO {
  serviceId: string;
  quantity: number;
}

export interface CreateBillDTO {
  patientId: string;
  attendanceId: string;
  paymentMode: PaymentMode;
  items: BillItemDTO[];
  insuranceProviderId?: string;
  corporateAccountId?: string;
}

export interface AddPaymentDTO {
  amount: number;
  paymentMethod: PaymentMethod;
  reference?: string;
  notes?: string;
}

export interface UpdateBillStatusDTO {
  status: BillStatus;
}

export interface BillFilters {
  patientId?: string;
  status?: BillStatus | BillStatus[];
  paymentMode?: PaymentMode;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

export interface BillSummary {
  id: string;
  billNumber: string;
  billDate: Date;
  status: BillStatus;
  paymentMode: PaymentMode;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  patient: {
    id: string;
    surname: string;
    otherNames: string;
    folderNumber: string;
  };
  corporateAccount?: {
    id: string;
    companyName: string;
  };
}

export interface BillingStatistics {
  period: {
    start: Date;
    end: Date;
    type: string;
  };
  summary: {
    totalBills: number;
    totalAmount: number;
    totalPaid: number;
    totalPending: number;
    collectionRate: number;
  };
  byPaymentMode: any[];
  byStatus: any[];
  corporateSummary?: {
    totalCorporateBills: number;
    totalCorporatePaid: number;
  };
}

export interface BillResponse {
  success: boolean;
  data?: any;
  message?: string;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalBills: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}