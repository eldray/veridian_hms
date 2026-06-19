// ==========================================
// DTOs & Interfaces
// ==========================================

export interface PurchaseInvoiceItemDTO {
  stockItemId: string;
  quantity: number;
  unitCost: number;
  batchNumber?: string | null;
  expiryDate?: string | Date | null;
}

export interface CreatePurchaseInvoiceDTO {
  invoiceNumber: string;
  supplierName: string;
  invoiceDate: string | Date;
  totalAmount: number;
  notes?: string | null;
  invoiceItems: PurchaseInvoiceItemDTO[];
  // ✅ NEW: Which physical store/department received this invoice?
  receivedAtDepartmentId?: string; 
}

export interface UpdatePurchaseInvoiceDTO {
  supplierName?: string;
  invoiceDate?: string | Date;
  totalAmount?: number;
  notes?: string | null;
}

export interface PurchaseInvoiceStats {
  totalInvoices: number;
  totalAmount: number; // ✅ FIXED: Now a safe JS number
  recentInvoices: number;
  topSuppliers: Array<{
    supplierName: string;
    totalAmount: number; // ✅ FIXED: Now a safe JS number
    invoiceCount: number;
  }>;
}

// Helper to safely convert Prisma Decimal objects to JS numbers
export const toNumber = (val: any): number => val ? parseFloat(val.toString()) : 0;