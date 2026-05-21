// PurchaseInvoiceTypes.ts - Renamed from InvoiceTypes

export interface PurchaseInvoiceItem {
  id: string;
  invoiceId: string;
  stockItemId: string;
  quantity: number;
  unitCost: number;
  batchNumber?: string | null;
  expiryDate?: Date | null;
  createdAt: Date;
}

export interface PurchaseInvoice {
  id: string;
  invoiceNumber: string;
  supplierName: string;
  invoiceDate: Date;
  totalAmount: number;
  notes?: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePurchaseInvoiceDTO {
  invoiceNumber: string;
  supplierName: string;
  invoiceDate: string | Date;
  totalAmount: number;
  notes?: string | null;
  invoiceItems: Array<{
    stockItemId: string;
    quantity: number;
    unitCost: number;
    batchNumber?: string | null;
    expiryDate?: string | Date | null;
  }>;
}

export interface UpdatePurchaseInvoiceDTO {
  supplierName?: string;
  invoiceDate?: string | Date;
  totalAmount?: number;
  notes?: string | null;
}

export interface PurchaseInvoiceWithRelations extends PurchaseInvoice {
  InvoiceItem?: Array<{
    id: string;
    stockItemId: string;
    quantity: number;
    unitCost: number;
    batchNumber?: string | null;
    expiryDate?: Date | null;
    StockItem?: {
      name: string;
      drugCode: string;
      unitOfMeasure: string;
      currentStock?: number;
      costPrice?: number;
    };
  }>;
  StockTransaction?: Array<{
    id: string;
    stockItemId: string;
    transactionType: string;
    quantity: number;
    balanceAfter: number;
    reference: string;
    invoiceId: string;
    performedBy: string;
    createdAt: Date;
    StockItem?: {
      name: string;
      drugCode: string;
    };
  }>;
  User?: {
    fullName: string;
    username: string;
  };
}

export interface PurchaseInvoiceStats {
  totalInvoices: number;
  totalAmount: number;
  recentInvoices: number;
  topSuppliers: Array<{
    supplierName: string;
    totalAmount: number;
    invoiceCount: number;
  }>;
}