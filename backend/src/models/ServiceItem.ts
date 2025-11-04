// models/ServiceItem.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IServiceItem extends Document {
  name: string;
  description?: string;
  categoryId: mongoose.Types.ObjectId;
  code: string;
  cashPrice: number;
  insurancePrice: number;
  costPrice: number;
  unit: string;
  isActive: boolean;
  requiresAuthorization: boolean;
  tariffCode?: string;
  vatRate: number;
  isTaxable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const serviceItemSchema = new Schema<IServiceItem>({
  name: { type: String, required: true },
  description: String,
  categoryId: { type: Schema.Types.ObjectId, ref: 'ServiceCategory', required: true },
  code: { type: String, required: true, unique: true },
  cashPrice: { type: Number, required: true, min: 0 },
  insurancePrice: { type: Number, required: true, min: 0 },
  costPrice: { type: Number, required: true, min: 0 },
  unit: { type: String, required: true, default: 'Each' },
  isActive: { type: Boolean, default: true },
  requiresAuthorization: { type: Boolean, default: false },
  tariffCode: String,
  vatRate: { type: Number, default: 0, min: 0, max: 100 },
  isTaxable: { type: Boolean, default: true }
}, {
  timestamps: true
});

serviceItemSchema.index({ categoryId: 1 });
serviceItemSchema.index({ code: 1 });

export default mongoose.model<IServiceItem>('ServiceItem', serviceItemSchema);
