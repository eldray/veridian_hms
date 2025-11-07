// models/ScanTemplate.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IScanTemplate extends Document {
  name: string;
  scanCode: string; // Ghana scan code (e.g., "scan01x" for chest X-ray)
  description: string;
  category: string; // 'xray', 'ultrasound', 'ct-scan', 'mri', etc.
  bodyPart: string; // 'head', 'chest', 'abdomen', 'pelvis', etc.
  cashPrice: number;
  insurancePrice: number;
  costPrice: number;
  isActive: boolean;
  requiresAuthorization: boolean;
  tariffCode?: string;
  vatRate: number;
  isTaxable: boolean;
  preparationInstructions?: string;
  duration: number; // in minutes
  contrastRequired: boolean;
  scanType: string; // 'plain', 'contrast', 'angiography', etc.
  createdAt: Date;
  updatedAt: Date;
}

const scanTemplateSchema = new Schema<IScanTemplate>({
  name: { type: String, required: true },
  scanCode: { type: String, required: true, unique: true }, // Unique scan code
  description: { type: String, required: true },
  category: { 
    type: String, 
    required: true,
    enum: ['xray', 'ultrasound', 'ct-scan', 'mri', 'fluoroscopy', 'mammography', 'nuclear', 'pet-scan', 'other']
  },
  bodyPart: { 
    type: String, 
    required: true,
    enum: ['head', 'chest', 'neck','abdomen', 'pelvis', 'spine', 'extremities', 'breast', 'other']
  },
  cashPrice: { type: Number, required: true, min: 0 },
  insurancePrice: { type: Number, required: true, min: 0 },
  costPrice: { type: Number, required: true, min: 0 },
  isActive: { type: Boolean, default: true },
  requiresAuthorization: { type: Boolean, default: false },
  tariffCode: String,
  vatRate: { type: Number, default: 0, min: 0, max: 100 },
  isTaxable: { type: Boolean, default: true },
  preparationInstructions: String,
  duration: { type: Number, required: true, min: 1 },
  contrastRequired: { type: Boolean, default: false },
  scanType: String
}, {
  timestamps: true
});

export default mongoose.model<IScanTemplate>('ScanTemplate', scanTemplateSchema);
