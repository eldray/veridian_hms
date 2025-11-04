import mongoose, { Schema, Document } from 'mongoose';

export interface IVitals extends Document {
  attendanceId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  bloodPressure?: {
    systolic: number;
    diastolic: number;
    meanArterialPressure?: number;
  };
  temperature?: number;
  pulse?: number;
  respiration?: number;
  spo2?: number;
  weight?: number;
  height?: number;
  bmi?: number;
  bloodGlucose?: number;
  painScale?: number;
  avpu?: 'alert' | 'voice' | 'pain' | 'unresponsive';
  gcs?: {
    eyes: number;
    verbal: number;
    motor: number;
    total?: number;
  };
  notes?: string;
  recordedBy: mongoose.Types.ObjectId;
  recordedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const vitalsSchema = new Schema<IVitals>({
  attendanceId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Attendance', 
    required: true,
    index: true 
  },
  patientId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Patient', 
    required: true,
    index: true 
  },
  
  // Vital Signs
  bloodPressure: {
    systolic: Number,
    diastolic: Number,
    meanArterialPressure: Number
  },
  temperature: Number,
  pulse: Number,
  respiration: Number,
  spo2: Number,
  weight: Number,
  height: Number,
  bmi: Number,
  bloodGlucose: Number,
  painScale: { type: Number, min: 0, max: 10 },
  avpu: { type: String, enum: ['alert', 'voice', 'pain', 'unresponsive'] },
  gcs: {
    eyes: { type: Number, min: 1, max: 4 },
    verbal: { type: Number, min: 1, max: 5 },
    motor: { type: Number, min: 1, max: 6 },
    total: { type: Number, min: 3, max: 15 }
  },
  
  notes: String,
  recordedBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  recordedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Auto-calculate BMI and MAP
vitalsSchema.pre('save', function(next) {
  // Calculate BMI if weight and height provided
  if (this.weight && this.height) {
    const heightInMeters = this.height / 100;
    this.bmi = parseFloat((this.weight / (heightInMeters * heightInMeters)).toFixed(1));
  }
  
  // Calculate Mean Arterial Pressure
  if (this.bloodPressure?.systolic && this.bloodPressure?.diastolic) {
    this.bloodPressure.meanArterialPressure = Math.round(
      this.bloodPressure.diastolic + (this.bloodPressure.systolic - this.bloodPressure.diastolic) / 3
    );
  }
  
  // Calculate GCS total
  if (this.gcs?.eyes && this.gcs?.verbal && this.gcs?.motor) {
    this.gcs.total = this.gcs.eyes + this.gcs.verbal + this.gcs.motor;
  }
  
  next();
});

export default mongoose.model<IVitals>('Vitals', vitalsSchema);
