// Enhanced Ward Model
import mongoose, { Schema, Document } from 'mongoose';

export interface IWard extends Document {
  wardName: string;
  wardType: string;
  totalBeds: number;
  occupiedBeds: number;
  // ADD PRICING:
  cashDailyRate: number;
  insuranceDailyRate: number;
  isActive: boolean;
  requiresAuthorization: boolean;
  tariffCode?: string;
  vatRate: number;
  isTaxable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const wardSchema = new Schema<IWard>({
  wardName: { type: String, required: true },
  wardType: { type: String, required: true },
  totalBeds: { type: Number, required: true },
  occupiedBeds: { type: Number, default: 0 },
  cashDailyRate: { type: Number, required: true, min: 0 },
  insuranceDailyRate: { type: Number, required: true, min: 0 },
  isActive: { type: Boolean, default: true },
  requiresAuthorization: { type: Boolean, default: false },
  tariffCode: String,
  vatRate: { type: Number, default: 0, min: 0, max: 100 },
  isTaxable: { type: Boolean, default: true }
}, {
  timestamps: true
});

export default mongoose.model<IWard>('Ward', wardSchema);
