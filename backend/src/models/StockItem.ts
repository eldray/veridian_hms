// models/StockItem.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IStockItem extends Document {
  name: string;
  category: string;
  description?: string;
  strength: string; // e.g., "500mg", "200mg", "10mg/ml"
  unitOfMeasure: string; // e.g., "tablet", "capsule", "ml", "vial"
  drugCode: string; // Ghana-specific drug code (e.g., "paraceta1", "amoxi2")
  reorderLevel: number;
  currentStock: number;
  unitPrice: number;
  sellingPrice: number;
  insurancePrice: number;
  supplier: string;
  expiryDate?: Date;
  batchNumber?: string;
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
  strength: { type: String, required: true }, // Strength like "500mg"
  unitOfMeasure: { type: String, required: true }, // Unit like "tablet"
  drugCode: { type: String, required: true, unique: true }, // Ghana drug code
  reorderLevel: { type: Number, required: true },
  currentStock: { type: Number, default: 0 },
  unitPrice: { type: Number, required: true },
  sellingPrice: { type: Number, required: true },
  insurancePrice: { type: Number, required: true },
  supplier: String,
  expiryDate: Date,
  batchNumber: String,
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
