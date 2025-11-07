// models/LabTestTemplate.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface ILabTestTemplate extends Document {
  name: string;
  investigationCode: string; // Ghana lab code (e.g., "inve02d" for malaria)
  category: string; // 'hematology', 'biochemistry', 'microbiology', etc.
  subCategory?: string;
  description?: string;
  cashPrice: number;
  insurancePrice: number;
  costPrice: number;
  isActive: boolean;
  requiresAuthorization: boolean;
  tariffCode?: string;
  vatRate: number;
  isTaxable: boolean;
  specimenType: string; // 'blood', 'urine', 'stool', 'csf', 'sputum', 'tissue','semen'
  resultTemplate: [{
    fieldName: string;
    fieldType: string;
    label: string;
    referenceRange: string;
    options: string[];
    unit?: string;
  }];
  createdAt: Date;
  updatedAt: Date;
}

const labTestTemplateSchema = new Schema<ILabTestTemplate>({
  name: { type: String, required: true },
  investigationCode: { type: String, required: true, unique: true }, // Unique investigation code
  category: { 
    type: String, 
    required: true,
    enum: ['hematology', 'biochemistry', 'microbiology', 'serology', 'immunology', 'toxicology', 'molecular', 'cytology', 'histopathology']
  },
  subCategory: String,
  description: String,
  cashPrice: { type: Number, required: true, min: 0 },
  insurancePrice: { type: Number, required: true, min: 0 },
  costPrice: { type: Number, required: true, min: 0 },
  isActive: { type: Boolean, default: true },
  requiresAuthorization: { type: Boolean, default: false },
  tariffCode: String,
  vatRate: { type: Number, default: 0, min: 0, max: 100 },
  isTaxable: { type: Boolean, default: true },
  specimenType: { 
    type: String, 
    required: true,
    enum: ['blood', 'urine', 'stool', 'csf', 'sputum','fluid', 'semen','tissue', 'saliva', 'swab', 'other']
  },
  resultTemplate: [{
    fieldName: String,
    fieldType: { 
      type: String, 
      enum: ['number', 'text', 'select', 'textarea', 'boolean'],
      default: 'text'
    },
    label: String,
    referenceRange: String,
    options: [String],
    unit: String
  }]
}, {
  timestamps: true
});

export default mongoose.model<ILabTestTemplate>('LabTestTemplate', labTestTemplateSchema);
