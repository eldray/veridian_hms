// types/billing.ts - Type definitions for billing module

export interface BillFilters {
  patientId?: string;
  admissionId?: string;
  status?: 'PENDING' | 'PARTIAL' | 'PAID' | 'WAIVED' | 'CANCELLED';
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface BillStatistics {
  totalRevenue: number;
  pendingAmount: number;
  paidAmount: number;
  waivedAmount: number;
  totalBills: number;
  pendingBills: number;
  paidBills: number;
  averageBillAmount: number;
}

export interface BillLineItem {
  id: string;
  billId: string;
  serviceId?: string;
  serviceName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: 'ACTIVE' | 'VOID';
  voidReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillingBreakdown {
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  items: BillLineItem[];
}

export interface PaymentFilters {
  billId?: string;
  method?: 'CASH' | 'CARD' | 'MOBILE_MONEY' | 'INSURANCE' | 'WAIVER';
  dateFrom?: string;
  dateTo?: string;
}

export interface BillingCollectionItem {
  id: string;
  description: string;
  quantity: number;
  serviceCategory: string;
  serviceType: string;
  amount: number;
}

export interface BillingCollectionPayment {
  id: string;
  transactionDate: string;
  amount: number;
  paymentMethod: string;
  reference: string | null;
  notes: string | null;
  collector: { id: string; fullName: string; username: string };
  bill: {
    id: string;
    billNumber: string;
    patient: { surname: string; otherNames: string; folderNumber: string };
  };
  items: BillingCollectionItem[];
}

export interface BillingCollectionsReport {
  totalAmount: number;
  paymentCount: number;
  payments: BillingCollectionPayment[];
}
