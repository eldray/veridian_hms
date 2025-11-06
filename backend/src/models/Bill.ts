// models/Bill.ts - CORRECTED VERSION
import mongoose, { Schema, Document } from 'mongoose';

export interface IBill extends Document {
  billNumber: string;
  patientId: mongoose.Types.ObjectId;
  attendanceId: mongoose.Types.ObjectId;
  admissionId?: mongoose.Types.ObjectId;
  
  // Financial breakdown
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    category?: string;
  }>;
  subtotal: number;
  discount: number;
  taxAmount: number;
  totalAmount: number;
  insuranceCovered: number;
  patientPayable: number;
  paidAmount: number;
  balance: number;
  
  // Status and tracking
  status: 'draft' | 'pending' | 'partial' | 'paid' | 'cancelled';
  paymentMode: 'cash' | 'nhis' | 'private_insurance' | 'mixed';
  
  // Insurance information
  insuranceProviderId?: mongoose.Types.ObjectId;
  preAuthNumber?: string;
  claimNumber?: string;
  claimStatus: 'not_required' | 'pending' | 'submitted' | 'approved' | 'rejected';
  
  // References
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  
  // Timestamps
  billDate: Date;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const billSchema = new Schema<IBill>({
  billNumber: { type: String, required: true, unique: true },
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
  attendanceId: { type: Schema.Types.ObjectId, ref: 'Attendance', required: true },
  admissionId: { type: Schema.Types.ObjectId, ref: 'Admission' },
  
  // Financial breakdown - FIXED: Use items array instead of billItems references
  items: [{
    description: { type: String, required: true },
    quantity: { type: Number, required: true, default: 1 },
    unitPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    category: { type: String } // consultation, medication, lab, procedure, etc.
  }],
  subtotal: { type: Number, required: true, default: 0 },
  discount: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true, default: 0 },
  insuranceCovered: { type: Number, default: 0 },
  patientPayable: { type: Number, required: true, default: 0 },
  paidAmount: { type: Number, default: 0 },
  balance: { type: Number, required: true, default: 0 },
  
  // Status and tracking
  status: { 
    type: String, 
    enum: ['draft', 'pending', 'partial', 'paid', 'cancelled'],
    default: 'draft'
  },
  paymentMode: { 
    type: String, 
    enum: ['cash', 'nhis', 'private_insurance', 'mixed'],
    required: true 
  },
  
  // Insurance information
  insuranceProviderId: { type: Schema.Types.ObjectId, ref: 'InsuranceProvider' },
  preAuthNumber: String,
  claimNumber: String,
  claimStatus: { 
    type: String, 
    enum: ['not_required', 'pending', 'submitted', 'approved', 'rejected'],
    default: 'not_required'
  },
  
  // References - REMOVED: billItems since we're using embedded items array
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  
  // Timestamps
  billDate: { type: Date, default: Date.now },
  dueDate: Date
}, {
  timestamps: true
});

// Indexes for better query performance
billSchema.index({ patientId: 1 });
billSchema.index({ attendanceId: 1 });
billSchema.index({ billNumber: 1 });
billSchema.index({ status: 1 });
billSchema.index({ billDate: -1 });

// Pre-save middleware for bill number and calculations
billSchema.pre('save', async function(next) {
  if (this.isNew && !this.billNumber) {
    // Generate bill number only if not provided
    const lastBill = await mongoose.model<IBill>('Bill')
      .findOne()
      .sort({ billNumber: -1 });
    
    let nextNumber = 1000;
    if (lastBill && lastBill.billNumber) {
      const lastNumber = parseInt(lastBill.billNumber.replace('BIL-', ''));
      nextNumber = lastNumber + 1;
    }
    
    this.billNumber = `BIL-${nextNumber}`;
  }
  
  // Calculate subtotal from items
  if (this.items && this.items.length > 0) {
    this.subtotal = this.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  }
  
  // Calculate total amount
  this.totalAmount = this.subtotal - this.discount + this.taxAmount;
  
  // Calculate patient payable (total minus insurance covered)
  this.patientPayable = this.totalAmount - this.insuranceCovered;
  
  // Auto-calculate balance
  this.balance = this.patientPayable - this.paidAmount;
  
  // Auto-update status based on payments
  if (this.balance <= 0 && this.paidAmount > 0) {
    this.status = 'paid';
  } else if (this.paidAmount > 0 && this.paidAmount < this.patientPayable) {
    this.status = 'partial';
  } else if (this.paidAmount === 0 && this.status === 'draft') {
    this.status = 'pending';
  }
  
  next();
});

export default mongoose.model<IBill>('Bill', billSchema);