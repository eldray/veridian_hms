import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAttendance extends Document {
  attendanceNumber: string;
  patientId: mongoose.Types.ObjectId;
  dateTime: Date;
  attendanceType: string;
  paymentMode: string;
  nhisCCC?: string;
  complaints: string;
  vitals: Array<{
    vitalId: mongoose.Types.ObjectId;
    recordedAt: Date;
    recordedBy: mongoose.Types.ObjectId;
  }>;
  diagnoses: Array<{
    diagnosisId: mongoose.Types.ObjectId;
    primary: boolean;
    notes?: string;
    date: Date;
    createdBy: mongoose.Types.ObjectId;
    icdCode?: string;
  }>;
  labTests: Array<{
    templateId: mongoose.Types.ObjectId;
    status: 'requested' | 'in_progress' | 'completed' | 'cancelled';
    result?: any;
    normalRange?: string;
    units?: string;
    requestedAt: Date;
    completedAt?: Date;
    performedBy?: mongoose.Types.ObjectId;
    verifiedBy?: mongoose.Types.ObjectId;
    notes?: string;
    createdBy: mongoose.Types.ObjectId;
    priority: 'routine' | 'urgent' | 'stat';
  }>;
  procedures: Array<{
    templateId: mongoose.Types.ObjectId;
    status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
    scheduledDate?: Date;
    performedAt?: Date;
    performedBy?: mongoose.Types.ObjectId;
    assistant?: mongoose.Types.ObjectId;
    notes?: string;
    complications?: string;
    outcome?: string;
    cost?: number;
    duration?: number;
    createdBy: mongoose.Types.ObjectId;
  }>;
  scans: Array<{
    scanType: string;
    description: string;
    bodyPart?: string;
    status: 'requested' | 'in_progress' | 'completed' | 'cancelled';
    requestedAt: Date;
    completedAt?: Date;
    result?: string;
    findings?: string;
    impression?: string;
    performedBy?: mongoose.Types.ObjectId;
    verifiedBy?: mongoose.Types.ObjectId;
    imageUrls: string[];
    createdBy: mongoose.Types.ObjectId;
    priority: 'routine' | 'urgent';
  }>;
  medications: Array<{
    stockItemId?: mongoose.Types.ObjectId;
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    quantity: number;
    route?: string;
    instructions?: string;
    status: 'prescribed' | 'dispensed' | 'administered' | 'cancelled';
    prescribedAt: Date;
    dispensedAt?: Date;
    administeredAt?: Date;
    dispensedBy?: mongoose.Types.ObjectId;
    administeredBy?: mongoose.Types.ObjectId;
    prescribedBy: mongoose.Types.ObjectId;
    notes?: string;
  }>;
  progressNotes: Array<{
    note: string;
    type: 'clinical' | 'nursing' | 'progress' | 'discharge';
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
  }>;
  medicalNotes?: string;
  attendingClinician: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  status: 'pending' | 'active' | 'completed' | 'cancelled' | 'admitted' | 'discharged';
  admissionId?: mongoose.Types.ObjectId;
  bedId?: mongoose.Types.ObjectId;
  wardId?: mongoose.Types.ObjectId;
  billId?: mongoose.Types.ObjectId;
  previousAttendanceId?: mongoose.Types.ObjectId;
  totalBill: number;
  paidAmount: number;
  outstandingBalance: number;
  createdAt: Date;
  updatedAt: Date;

  // Billing related fields
  insuranceClaimId?: mongoose.Types.ObjectId;
  preAuthNumber?: string;
  preAuthApproved: boolean;
  preAuthAmount?: number;
  
  // Service tracking
  servicesRendered: Array<{
    serviceItemId: mongoose.Types.ObjectId;
    quantity: number;
    date: Date;
    performedBy: mongoose.Types.ObjectId;
    notes?: string;
  }>;
}

const attendanceSchema = new Schema<IAttendance>({
  attendanceNumber: { 
    type: String, 
    required: true, 
    unique: true,
    default: function() {
      return `TEMP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
  },
  patientId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Patient', 
    required: true,
    index: true 
  },
  dateTime: { 
    type: Date, 
    required: true, 
    default: Date.now,
    index: true 
  },
  attendanceType: { 
    type: String, 
    required: true, 
    enum: [
      'general_opd',
      'specialist_consultation', 
      'antenatal_care',
      'diagnostic_opd',
      'emergency',
      'other_opd',
      'inpatient'
    ],
    index: true 
  },
  paymentMode: { 
    type: String, 
    required: true, 
    enum: ['cash', 'nhis', 'private_insurance'],
    index: true 
  },
  nhisCCC: { 
    type: String,
    index: true 
  },
  complaints: { 
    type: String,
    default: 'No complaints recorded' 
  },
  vitals: [{
    vitalId: { type: Schema.Types.ObjectId, ref: 'Vitals' },
    recordedAt: Date,
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User' }
  }],
  diagnoses: [{
    diagnosisId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Diagnosis', 
      required: true 
    },
    primary: { type: Boolean, default: false },
    notes: String,
    date: { type: Date, default: Date.now },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    icdCode: String
  }],
  labTests: [{
    templateId: { 
      type: Schema.Types.ObjectId, 
      ref: 'LabTestTemplate', 
      required: true 
    },
    status: { 
      type: String, 
      default: 'requested', 
      enum: ['requested', 'in_progress', 'completed', 'cancelled'] 
    },
    result: Schema.Types.Mixed,
    normalRange: String,
    units: String,
    requestedAt: { type: Date, default: Date.now },
    completedAt: Date,
    performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    priority: { type: String, enum: ['routine', 'urgent', 'stat'], default: 'routine' }
  }],
  procedures: [{
    templateId: { 
      type: Schema.Types.ObjectId, 
      ref: 'ProcedureTemplate', 
      required: true 
    },
    status: { 
      type: String, 
      default: 'scheduled', 
      enum: ['scheduled', 'in_progress', 'completed', 'cancelled'] 
    },
    scheduledDate: Date,
    performedAt: Date,
    performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    assistant: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: String,
    complications: String,
    outcome: String,
    cost: Number,
    duration: Number,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
  }],
  scans: [{
    scanType: String,
    description: String,
    bodyPart: String,
    status: { 
      type: String, 
      default: 'requested', 
      enum: ['requested', 'in_progress', 'completed', 'cancelled'] 
    },
    requestedAt: { type: Date, default: Date.now },
    completedAt: Date,
    result: String,
    findings: String,
    impression: String,
    performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    imageUrls: [String],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    priority: { type: String, enum: ['routine', 'urgent'], default: 'routine' }
  }],
  medications: [{
    stockItemId: { type: Schema.Types.ObjectId, ref: 'StockItem' },
    name: { type: String, required: true },
    dosage: String,
    frequency: String,
    duration: String,
    quantity: { type: Number, default: 1 },
    route: String,
    instructions: String,
    status: { 
      type: String, 
      default: 'prescribed', 
      enum: ['prescribed', 'dispensed', 'administered', 'cancelled'] 
    },
    prescribedAt: { type: Date, default: Date.now },
    dispensedAt: Date,
    administeredAt: Date,
    dispensedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    administeredBy: { type: Schema.Types.ObjectId, ref: 'User' },
    prescribedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: String
  }],
  progressNotes: [{
    note: { type: String, required: true },
    type: { 
      type: String, 
      enum: ['clinical', 'nursing', 'progress', 'discharge'], 
      default: 'clinical' 
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  }],
  medicalNotes: String,
  attendingClinician: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  createdBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  updatedBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User' 
  },
  status: { 
    type: String, 
    default: 'pending', 
    enum: ['pending', 'active', 'completed', 'cancelled', 'admitted', 'discharged'],
    index: true 
  },
  admissionId: { type: Schema.Types.ObjectId, ref: 'Admission' },
  bedId: { type: Schema.Types.ObjectId, ref: 'Bed' },
  wardId: { type: Schema.Types.ObjectId, ref: 'Ward' },
  billId: { type: Schema.Types.ObjectId, ref: 'Bill' },
  previousAttendanceId: { type: Schema.Types.ObjectId, ref: 'Attendance' },
  totalBill: { type: Number, default: 0 },
  paidAmount: { type: Number, default: 0 },
  outstandingBalance: { type: Number, default: 0 },

  // Billing related fields
  insuranceClaimId: { type: Schema.Types.ObjectId, ref: 'InsuranceClaim' },
  preAuthNumber: String,
  preAuthApproved: { type: Boolean, default: false },
  preAuthAmount: Number,
  
  // Service tracking
  servicesRendered: [{
    serviceItemId: { type: Schema.Types.ObjectId, ref: 'ServiceItem', required: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    date: { type: Date, default: Date.now },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    notes: String
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtuals
attendanceSchema.virtual('patient', {
  ref: 'Patient',
  localField: 'patientId',
  foreignField: '_id',
  justOne: true
});

attendanceSchema.virtual('admission', {
  ref: 'Admission',
  localField: 'admissionId',
  foreignField: '_id',
  justOne: true
});

// Add virtual for services
attendanceSchema.virtual('services', {
  ref: 'ServiceItem',
  localField: 'servicesRendered.serviceItemId',
  foreignField: '_id'
});

// Pre-save middleware for attendance number
attendanceSchema.pre('save', async function(next) {
  if (this.isNew && this.attendanceNumber.startsWith('TEMP-')) {
    try {
      const lastAttendance = await mongoose.model<IAttendance>('Attendance')
        .findOne({ attendanceNumber: { $not: /TEMP-/ } })
        .sort({ attendanceNumber: -1 });
      
      let nextNumber = 1000;
      
      if (lastAttendance && lastAttendance.attendanceNumber) {
        const lastNumber = parseInt(lastAttendance.attendanceNumber.replace('ATT-', ''));
        nextNumber = lastNumber + 1;
      }
      
      this.attendanceNumber = `ATT-${nextNumber}`;
      console.log(`🔢 Generated attendance number: ${this.attendanceNumber}`);
    } catch (error) {
      return next(error as Error);
    }
  }
  
  // Auto-calculate outstanding balance
  this.outstandingBalance = this.totalBill - this.paidAmount;
  next();
});

export default mongoose.model<IAttendance>('Attendance', attendanceSchema);
