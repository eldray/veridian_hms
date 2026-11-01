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
  /** Which row of the financial breakdown this share was counted under, as `group:row`. */
  breakdownRow: string;
  /** The readable name of that row — the catalog sub-type, or the ward that billed a bed day. */
  breakdownLabel: string;
  amount: number;
}

export interface BillingCollectionPayment {
  id: string;
  transactionDate: string;
  amount: number;
  paymentMethod: string;
  reference: string | null;
  notes: string | null;
  /** A reversed payment is reported under `reversals`, never under `payments`. */
  isVoided: boolean;
  voidedAt: string | null;
  voidReason: string | null;
  collector: { id: string; fullName: string; username: string } | null;
  bill: {
    id: string;
    billNumber: string;
    /** A counter ticket pays without a folder, so the payer is named, not looked up. */
    customer: {
      name: string;
      reference: string | null;
      kind: 'patient' | 'walk_in';
    };
  };
  items: BillingCollectionItem[];
}

export interface BillingBreakdownLine {
  key: string;
  label: string;
  collections: number;
  reversals: number;
  balance: number;
}

export interface BillingBreakdownGroup {
  key: string;
  label: string;
  lines: BillingBreakdownLine[];
  subtotal: { collections: number; reversals: number; balance: number };
}

export interface BillingCashierRow {
  id: string;
  name: string;
  username: string;
  receipts: number;
  collections: number;
  reversals: number;
  balance: number;
  /** Physical money only — mobile money, card, transfer and cheque are not in the drawer. */
  cashAtHand: number;
}

export interface BillingCollectionsReport {
  totalAmount: number;
  paymentCount: number;
  payments: BillingCollectionPayment[];
  totalReversals: number;
  reversalCount: number;
  reversals: BillingCollectionPayment[];
  netCollected: number;
  cashAtHand: number;
  groups: BillingBreakdownGroup[];
  cashiers: BillingCashierRow[];
}
