// models/BillItem.ts - UPDATED VERSION
import mongoose, { Schema, Document } from 'mongoose';

export interface IBillItem extends Document {
  billId: mongoose.Types.ObjectId;
  serviceType: 'diagnosis' | 'lab_test' | 'procedure' | 'medication' | 'ward' | 'consultation' | 'other';
  serviceReference: mongoose.Types.ObjectId; // Reference to the actual service
  serviceItemId?: mongoose.Types.ObjectId; // Optional: reference to ServiceCatalog
  serviceName: string;
  serviceCode: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  vatAmount: number;
  totalAmount: number;
  insuranceCovered: number;
  patientPayable: number;
  date: Date;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const billItemSchema = new Schema<IBillItem>({
  billId: { type: Schema.Types.ObjectId, ref: 'Bill', required: true },
  serviceType: { 
    type: String, 
    required: true,
    enum: ['diagnosis', 'lab_test', 'procedure', 'medication', 'ward', 'consultation', 'other']
  },
  serviceReference: { type: Schema.Types.ObjectId, required: true }, // e.g., diagnosisId, labTestId, etc.
  serviceItemId: { type: Schema.Types.ObjectId, ref: 'ServiceCatalog' }, // Optional: link to service catalog
  serviceName: { type: String, required: true },
  serviceCode: { type: String, required: true },
  description: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1, default: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  vatAmount: { type: Number, default: 0, min: 0 },
  totalAmount: { type: Number, required: true, min: 0 },
  insuranceCovered: { type: Number, default: 0, min: 0 },
  patientPayable: { type: Number, required: true, min: 0 },
  date: { type: Date, default: Date.now },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, {
  timestamps: true
});

billItemSchema.index({ billId: 1 });
billItemSchema.index({ serviceReference: 1 });
billItemSchema.index({ serviceType: 1 });
billItemSchema.index({ serviceItemId: 1 });

export default mongoose.model<IBillItem>('BillItem', billItemSchema);