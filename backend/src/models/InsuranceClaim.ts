// models/InsuranceClaim.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IInsuranceClaim extends Document {
  claimNumber: string;
  billId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  insuranceProviderId: mongoose.Types.ObjectId;
  attendanceId: mongoose.Types.ObjectId;
  
  // Claim details
  totalClaimAmount: number;
  approvedAmount?: number;
  rejectedAmount?: number;
  paidAmount?: number;
  
  // Status tracking
  status: 'draft' | 'submitted' | 'processing' | 'approved' | 'partially_approved' | 'rejected' | 'paid';
  submissionDate?: Date;
  approvalDate?: Date;
  paymentDate?: Date;
  
  // Documents and references
  preAuthNumber?: string;
  diagnosisCodes: string[];
  procedureCodes: string[];
  notes?: string;
  
  // Tracking
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  
  createdAt: Date;
  updatedAt: Date;
}

const insuranceClaimSchema = new Schema<IInsuranceClaim>({
  claimNumber: { type: String, required: true, unique: true },
  billId: { type: Schema.Types.ObjectId, ref: 'Bill', required: true },
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
  insuranceProviderId: { type: Schema.Types.ObjectId, ref: 'InsuranceProvider', required: true },
  attendanceId: { type: Schema.Types.ObjectId, ref: 'Attendance', required: true },
  
  // Claim details
  totalClaimAmount: { type: Number, required: true, min: 0 },
  approvedAmount: { type: Number, min: 0 },
  rejectedAmount: { type: Number, min: 0 },
  paidAmount: { type: Number, min: 0 },
  
  // Status tracking
  status: { 
    type: String, 
    enum: ['draft', 'submitted', 'processing', 'approved', 'partially_approved', 'rejected', 'paid'],
    default: 'draft'
  },
  submissionDate: Date,
  approvalDate: Date,
  paymentDate: Date,
  
  // Documents and references
  preAuthNumber: String,
  diagnosisCodes: [String],
  procedureCodes: [String],
  notes: String,
  
  // Tracking
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

// Pre-save middleware for claim number
insuranceClaimSchema.pre('save', async function(next) {
  if (this.isNew) {
    const lastClaim = await mongoose.model<IInsuranceClaim>('InsuranceClaim')
      .findOne()
      .sort({ claimNumber: -1 });
    
    let nextNumber = 1000;
    if (lastClaim && lastClaim.claimNumber) {
      const lastNumber = parseInt(lastClaim.claimNumber.replace('CLM-', ''));
      nextNumber = lastNumber + 1;
    }
    
    this.claimNumber = `CLM-${nextNumber}`;
  }
  next();
});

export default mongoose.model<IInsuranceClaim>('InsuranceClaim', insuranceClaimSchema);
