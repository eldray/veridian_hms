// Enhanced StockItem Model (for drugs/consumables)
import mongoose, { Schema, Document } from 'mongoose';

export interface IStockItem extends Document {
  name: string;
  category: string;
  description?: string;
  unitOfMeasure: string;
  reorderLevel: number;
  currentStock: number;
  unitPrice: number;
  sellingPrice: number;
  supplier: string;
  expiryDate?: Date;
  batchNumber?: string;
  // ADD THESE FOR BILLING:
  insurancePrice: number;
  isActive: boolean;
  requiresAuthorization: boolean;
  tariffCode?: string;
  vatRate: number;
  isTaxable: boolean;
  isMedication: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const stockItemSchema = new Schema<IStockItem>({
  name: { type: String, required: true },
  category: { type: String, required: true },
  description: String,
  unitOfMeasure: { type: String, required: true },
  reorderLevel: { type: Number, required: true },
  currentStock: { type: Number, default: 0 },
  unitPrice: { type: Number, required: true },
  sellingPrice: { type: Number, required: true },
  supplier: String,
  expiryDate: Date,
  batchNumber: String,
  // ADD FOR BILLING:
  insurancePrice: { type: Number, required: true }, // Price for insurance patients
  isActive: { type: Boolean, default: true },
  requiresAuthorization: { type: Boolean, default: false },
  tariffCode: String,
  vatRate: { type: Number, default: 0, min: 0, max: 100 },
  isTaxable: { type: Boolean, default: true },
  isMedication: { type: Boolean, default: true }
}, {
  timestamps: true
});

export default mongoose.model<IStockItem>('StockItem', stockItemSchema);
