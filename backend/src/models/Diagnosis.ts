// models/Diagnosis.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IDiagnosis extends Document {
  name: string;
  icdCode: string; // ICD-10/11 code (e.g., "A00.0" for Cholera)
  gdrgCode: string; // G-DRG code (e.g., "A01Z" for infectious diseases)
  description?: string;
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
  icdCode: { type: String, required: true }, // Not unique anymore
  gdrgCode: { type: String, required: true }, // G-DRG code
  variant: {
  type: String,
  enum: ['adult', 'child', 'complicated', 'uncomplicated']
},
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
