import { Bill, BillLineItem, BillStatus, PaymentMode, PaymentMethod } from '@prisma/client';

// ✅ FIXED: Aligned with actual Prisma schema field names
export interface BillWithRelations extends Bill {
  Patient?: { id: string; surname: string; otherNames: string; folderNumber: string | null; contact?: string; };
  Attendance?: { id: string; attendanceNumber: string; attendanceType: string; dateTime?: Date; }; // ✅ Fixed field names
  BillLineItem?: BillLineItemWithRelations[];
  Payment?: PaymentRecord[]; // ✅ Renamed to avoid conflict
}

export interface BillLineItemWithRelations extends BillLineItem {
  serviceCatalog?: { id: string; name: string; code: string; serviceType: string; };
  voidedBy?: { id: string; fullName: string; };
}

// ✅ FIXED: Aligned with actual Prisma Payment model
export interface PaymentRecord {
  id: string;
  billId: string;
  amount: any; // Decimal
  paymentMethod: PaymentMethod; // ✅ Fixed from paymentMode
  transactionDate: Date;        // ✅ Fixed from paymentDate
  reference: string | null;     // ✅ Fixed from referenceNumber
  receivedById: string;         // ✅ Fixed from paidBy
  notes: string | null;
  createdAt: Date;
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

// ✅ FIXED: Aligned with Prisma Payment model
export interface AddPaymentInput {
  amount: number;
  paymentMethod: PaymentMethod; // ✅ Fixed from paymentMode
  reference?: string;           // ✅ Fixed from referenceNumber
  notes?: string;
}

export interface BillFilter {
  patientId?: string;
  status?: BillStatus | BillStatus[];
  paymentMode?: PaymentMode;
  dateFrom?: Date;
  dateTo?: Date;
  attendanceId?: string;
  page?: number;
  limit?: number;
}

export interface VoidLineItemInput {
  reason: string;
}