// Enhanced ProcedureTemplate Model
import mongoose, { Schema, Document } from 'mongoose';

export interface IProcedureTemplate extends Document {
  name: string;
  code: string;
  description?: string;
  // ADD PRICING:
  cashPrice: number;
  insurancePrice: number;
  costPrice: number;
  isActive: boolean;
  requiresAuthorization: boolean;
  tariffCode?: string;
  vatRate: number;
  isTaxable: boolean;
  duration: number; // in minutes
  createdAt: Date;
  updatedAt: Date;
}

const procedureTemplateSchema = new Schema<IProcedureTemplate>({
  name: { type: String, required: true },
  code: { type: String, required: true },
  description: { type: String },
  // ADD PRICING:
  cashPrice: { type: Number, required: true, min: 0 },
  insurancePrice: { type: Number, required: true, min: 0 },
  costPrice: { type: Number, required: true, min: 0 },
  isActive: { type: Boolean, default: true },
  requiresAuthorization: { type: Boolean, default: false },
  tariffCode: String,
  vatRate: { type: Number, default: 0, min: 0, max: 100 },
  isTaxable: { type: Boolean, default: true },
  duration: { type: Number, default: 30 } // minutes
}, {
  timestamps: true
});

export default mongoose.model<IProcedureTemplate>('ProcedureTemplate', procedureTemplateSchema);
