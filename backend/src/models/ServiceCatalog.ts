// models/ServiceCatalog.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IServiceCatalog extends Document {
  name: string;
  code: string;
  description?: string;
  serviceType: 'diagnosis' | 'lab_test' | 'procedure' | 'medication' | 'ward' | 'consultation' | 'other';
  category?: string; // Add category field instead of separate model
  
  // References to existing models
  diagnosisId?: mongoose.Types.ObjectId;
  labTestTemplateId?: mongoose.Types.ObjectId;
  procedureTemplateId?: mongoose.Types.ObjectId;
  stockItemId?: mongoose.Types.ObjectId;
  wardId?: mongoose.Types.ObjectId;
  
  // Unified pricing
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

const serviceCatalogSchema = new Schema<IServiceCatalog>({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  description: String,
  serviceType: { 
    type: String, 
    required: true,
    enum: ['diagnosis', 'lab_test', 'procedure', 'medication', 'ward', 'consultation', 'other']
  },
  category: { 
    type: String, 
    enum: ['consultation', 'diagnostic', 'procedural', 'pharmacy', 'ward', 'laboratory', 'radiology', 'other'],
    default: 'other'
  },
  
  // References to your existing models
  diagnosisId: { type: Schema.Types.ObjectId, ref: 'Diagnosis' },
  labTestTemplateId: { type: Schema.Types.ObjectId, ref: 'LabTestTemplate' },
  procedureTemplateId: { type: Schema.Types.ObjectId, ref: 'ProcedureTemplate' },
  stockItemId: { type: Schema.Types.ObjectId, ref: 'StockItem' },
  wardId: { type: Schema.Types.ObjectId, ref: 'Ward' },
  
  // Unified pricing
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

// Index for better performance
serviceCatalogSchema.index({ serviceType: 1, isActive: 1 });
serviceCatalogSchema.index({ category: 1 });
serviceCatalogSchema.index({ code: 1 });

export default mongoose.model<IServiceCatalog>('ServiceCatalog', serviceCatalogSchema);
