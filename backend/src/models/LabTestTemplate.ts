// Enhanced LabTestTemplate Model
import mongoose, { Schema, Document } from 'mongoose';

export interface ILabTestTemplate extends Document {
  name: string;
  // ADD PRICING:
  cashPrice: number;
  insurancePrice: number;
  costPrice: number;
  isActive: boolean;
  requiresAuthorization: boolean;
  tariffCode?: string;
  vatRate: number;
  isTaxable: boolean;
  
  resultTemplate: [{
    fieldName: string;
    fieldType: string;
    label: string;
    referenceRange: string;
    options: string[];
  }];
  createdAt: Date;
  updatedAt: Date;
}

const labTestTemplateSchema = new Schema<ILabTestTemplate>({
  name: { type: String, required: true },
  // ADD PRICING:
  cashPrice: { type: Number, required: true, min: 0 },
  insurancePrice: { type: Number, required: true, min: 0 },
  costPrice: { type: Number, required: true, min: 0 },
  isActive: { type: Boolean, default: true },
  requiresAuthorization: { type: Boolean, default: false },
  tariffCode: String,
  vatRate: { type: Number, default: 0, min: 0, max: 100 },
  isTaxable: { type: Boolean, default: true },
  
  resultTemplate: [{
    fieldName: String,
    fieldType: String,
    label: String,
    referenceRange: String,
    options: [String],
  }],
}, {
  timestamps: true
});

export default mongoose.model<ILabTestTemplate>('LabTestTemplate', labTestTemplateSchema);
