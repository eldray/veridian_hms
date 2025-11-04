// Enhanced Diagnosis Model
import mongoose, { Schema, Document } from 'mongoose';

export interface IDiagnosis extends Document {
  name: string;
  icdCode: string;
  description?: string;
  // ADD THESE PRICING FIELDS:
  cashPrice: number;
  insurancePrice: number;
  costPrice: number;
  isActive: boolean;
  requiresAuthorization: boolean;
  tariffCode?: string;
  vatRate: number;
  isTaxable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const diagnosisSchema = new Schema<IDiagnosis>({
  name: { type: String, required: true },
  icdCode: { type: String, required: true },
  description: { type: String },
  cashPrice: { type: Number, default: 0, min: 0 },
  insurancePrice: { type: Number, default: 0, min: 0 },
  costPrice: { type: Number, default: 0, min: 0 },
  isActive: { type: Boolean, default: true },
  requiresAuthorization: { type: Boolean, default: false },
  tariffCode: String,
  vatRate: { type: Number, default: 0, min: 0, max: 100 },
  isTaxable: { type: Boolean, default: true }
}, {
  timestamps: true
});

export default mongoose.model<IDiagnosis>('Diagnosis', diagnosisSchema);
