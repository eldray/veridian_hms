import { Bill, BillLineItem, BillStatus, PaymentMode } from '@prisma/client';

export interface BillWithRelations extends Bill {
  Patient?: {
    id: string;
    surname: string;
    otherNames: string;
    folderNumber: string | null;
  };
  Attendance?: {
    id: string;
    visitNumber: string;
    serviceType: string;
  };
  BillLineItem?: BillLineItemWithRelations[];
  payments?: Payment[];
  waiver?: PatientWaiver | null;
}

export interface BillLineItemWithRelations extends BillLineItem {
  serviceCatalog?: {
    id: string;
    name: string;
    code: string;
    serviceType: string;
    amount: number;
  };
  voidedBy?: {
    id: string;
    fullName: string;
  };
}

export interface Payment {
  id: string;
  billId: string;
  amount: number;
  paymentMode: PaymentMode;
  paymentDate: Date;
  referenceNumber: string | null;
  paidBy: string | null;
  notes: string | null;
  createdAt: Date;
}

export interface PatientWaiver {
  id: string;
  billId: string | null;
  amountApproved: number;
  status: string;
}

export interface CreateBillInput {
  patientId: string;
  attendanceId?: string;
  paymentMode?: PaymentMode;
  items: {
    serviceCatalogId: string;
    quantity: number;
    unitPrice: number;
    insuranceCoveredPercent?: number;
  }[];
}

export interface UpdateBillInput {
  totalAmount?: number;
  paidAmount?: number;
  status?: BillStatus;
  notes?: string;
}

export interface AddPaymentInput {
  amount: number;
  paymentMode: PaymentMode;
  referenceNumber?: string;
  paidBy?: string;
  notes?: string;
}

export interface BillFilter {
  patientId?: string;
  status?: BillStatus | BillStatus[];
  paymentMode?: PaymentMode;
  dateFrom?: Date;
  dateTo?: Date;
  attendanceId?: string;
}

export interface BillStatistics {
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
  byPaymentMode: Array<{
    paymentMode: PaymentMode;
    _count: { id: number };
    _sum: { totalAmount: number; paidAmount: number };
  }>;
  byStatus: Array<{
    status: BillStatus;
    _count: { id: number };
    _sum: { totalAmount: number; paidAmount: number };
  }>;
}

export interface VoidLineItemInput {
  reason: string;
}
