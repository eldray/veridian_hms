// models/ProcedureTemplate.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IProcedureTemplate extends Document {
  name: string;
  procedureCode: string; // Ghana procedure code (e.g., "obgy02A")
  description?: string;
  cashPrice: number;
  insurancePrice: number;
  costPrice: number;
  isActive: boolean;
  requiresAuthorization: boolean;
  tariffCode?: string;
  vatRate: number;
  isTaxable: boolean;
  duration: number; // in minutes
  category: string; // 'surgical', 'diagnostic', 'therapeutic', 'obstetric', etc.
  department: string; // 'surgery', 'obstetrics', 'radiology', 'laboratory', etc.
  createdAt: Date;
  updatedAt: Date;
}

const procedureTemplateSchema = new Schema<IProcedureTemplate>({
  name: { type: String, required: true },
  procedureCode: { type: String, required: true, unique: true }, // Unique procedure code
  description: { type: String },
  cashPrice: { type: Number, required: true, min: 0 },
  insurancePrice: { type: Number, required: true, min: 0 },
  costPrice: { type: Number, required: true, min: 0 },
  isActive: { type: Boolean, default: true },
  requiresAuthorization: { type: Boolean, default: false },
  tariffCode: String,
  vatRate: { type: Number, default: 0, min: 0, max: 100 },
  isTaxable: { type: Boolean, default: true },
  duration: { type: Number, default: 30 }, // minutes
  category: {
    type: String,
    required: true,
    enum: ['surgical', 'diagnostic', 'therapeutic', 'obstetric', 'pediatric', 'dental', 'ophthalmic']
  },
  department: {
    type: String,
    required: true,
    enum: ['surgery', 'obstetrics', 'pediatrics', 'internal_medicine', 'radiology', 'laboratory', 'dental', 'ophthalmology']
  }
}, {
  timestamps: true
});

export default mongoose.model<IProcedureTemplate>('ProcedureTemplate', procedureTemplateSchema);
