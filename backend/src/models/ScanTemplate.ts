// models/ScanTemplate.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IScanTemplate extends Document {
  name: string;
  description: string;
  category: string; // e.g., 'xray', 'ultrasound', 'ct-scan', 'mri'
  bodyPart: string; // e.g., 'chest', 'abdomen', 'head', 'spine'
  
  // PRICING
  cashPrice: number;
  insurancePrice: number;
  costPrice: number;
  isActive: boolean;
  requiresAuthorization: boolean;
  tariffCode?: string;
  vatRate: number;
  isTaxable: boolean;
  
  // TECHNICAL SPECIFICATIONS
  preparationInstructions?: string;
  duration: number; // in minutes
  contrastRequired: boolean;
  radiationDose?: string;
  
  // REPORT TEMPLATE
  reportTemplate: [{
    section: string;
    fields: [{
      fieldName: string;
      fieldType: string; // 'text', 'textarea', 'select', 'measurement'
      label: string;
      normalRange?: string;
      options?: string[];
      unit?: string;
    }];
  }];
  
  createdAt: Date;
  updatedAt: Date;
}

const scanTemplateSchema = new Schema<IScanTemplate>({
  name: { type: String, required: true },
  description: { type: String, required: true },
  category: { 
    type: String, 
    required: true,
    enum: ['xray', 'ultrasound', 'ct-scan', 'mri', 'fluoroscopy', 'mammography', 'other']
  },
  bodyPart: { 
    type: String, 
    required: true,
    enum: ['head', 'chest', 'abdomen', 'pelvis', 'spine', 'extremities', 'other']
  },
  
  // PRICING
  cashPrice: { type: Number, required: true, min: 0 },
  insurancePrice: { type: Number, required: true, min: 0 },
  costPrice: { type: Number, required: true, min: 0 },
  isActive: { type: Boolean, default: true },
  requiresAuthorization: { type: Boolean, default: false },
  tariffCode: String,
  vatRate: { type: Number, default: 0, min: 0, max: 100 },
  isTaxable: { type: Boolean, default: true },
  
  // TECHNICAL SPECIFICATIONS
  preparationInstructions: String,
  duration: { type: Number, required: true, min: 1 }, // in minutes
  contrastRequired: { type: Boolean, default: false },
  radiationDose: String,
  
  // REPORT TEMPLATE
  reportTemplate: [{
    section: String,
    fields: [{
      fieldName: String,
      fieldType: { 
        type: String, 
        enum: ['text', 'textarea', 'select', 'measurement', 'boolean'],
        default: 'text'
      },
      label: String,
      normalRange: String,
      options: [String],
      unit: String
    }]
  }],
}, {
  timestamps: true
});

// Index for better query performance
scanTemplateSchema.index({ category: 1, bodyPart: 1 });
scanTemplateSchema.index({ isActive: 1 });

export default mongoose.model<IScanTemplate>('ScanTemplate', scanTemplateSchema);
