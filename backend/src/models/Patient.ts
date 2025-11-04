// models/Patient.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IPatient extends Document {
  folderNumber: string;
  fullName: string;
  gender: 'male' | 'female' | 'other';
  dateOfBirth: Date;
  age: number;
  contact: string;
  address: string;
  paymentMode?: 'cash' | 'nhis' | 'private_insurance';
  insuranceDetails?: {
    providerId: mongoose.Types.ObjectId;
    memberId: string;
    groupNumber?: string;
    relationship: 'self' | 'spouse' | 'child' | 'other';
    startDate: Date;
    endDate: Date;
    isActive: boolean;
    copayment?: number;
    deductible?: number;
    coverageLimit?: number;
  };
  additionalInfo: {
    title?: string;
    email?: string;
    houseNumber?: string;
    idType?: 'GhanaCard' | 'Voter ID' | 'Passport' | 'Driver License' | 'NHIS Card' | 'Other';
    idNumber?: string;
    bloodType?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'Unknown';
    occupation?: string;
    nextOfKin?: string;
    emergencyContact?: {
      name: string;
      relationship: string;
      phone: string;
    };
  };
  billingAddress?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
  };
  employer?: {
    name: string;
    address: string;
    phone: string;
  };
  imageUrl?: string;
  registeredAt: Date;
  registeredBy: string;
}

const insuranceDetailsSchema = new Schema({
  providerId: { type: Schema.Types.ObjectId, ref: 'InsuranceProvider' },
  memberId: { type: String },
  groupNumber: { type: String },
  relationship: { type: String, enum: ['self', 'spouse', 'child', 'other'], default: 'self' },
  startDate: { type: Date },
  endDate: { type: Date },
  isActive: { type: Boolean, default: true },
  copayment: Number,
  deductible: Number,
  coverageLimit: Number
});

const additionalInfoSchema = new Schema({
  title: { type: String },
  email: { type: String },
  houseNumber: { type: String },
  idType: { 
    type: String, 
    enum: ['GhanaCard', 'Voter ID', 'Passport', 'Driver License', 'NHIS Card', 'Other'] 
  },
  idNumber: { type: String },
  bloodType: { 
    type: String, 
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'] 
  },
  occupation: { type: String },
  nextOfKin: { type: String },
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String,
  },
});

const billingAddressSchema = new Schema({
  street: { type: String },
  city: { type: String },
  state: { type: String },
  postalCode: { type: String }
});

const employerSchema = new Schema({
  name: { type: String },
  address: { type: String },
  phone: { type: String }
});

const patientSchema = new Schema<IPatient>({
  folderNumber: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  gender: { type: String, required: true, enum: ['male', 'female', 'other'] },
  dateOfBirth: { type: Date, required: true },
  age: { type: Number },
  contact: { type: String, required: true },
  address: { type: String, required: true },
  // CHANGED: paymentMode is now optional
  paymentMode: { 
    type: String, 
    enum: ['cash', 'nhis', 'private_insurance'] 
  },
  insuranceDetails: insuranceDetailsSchema,
  additionalInfo: additionalInfoSchema,
  billingAddress: billingAddressSchema,
  employer: employerSchema,
  imageUrl: { type: String },
  registeredAt: { type: Date, default: Date.now },
  registeredBy: { type: String, required: true },
}, { timestamps: true });

// Function to calculate age
const calculateAge = (dob: Date): number => {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
};

// Auto-generate folder number and calculate age before saving
patientSchema.pre('save', async function(next) {
  this.age = calculateAge(this.dateOfBirth);
  
  if (this.isNew) {
    try {
      const lastPatient = await mongoose.model('Patient').findOne().sort({ folderNumber: -1 });
      
      let nextNumber = 10000;
      if (lastPatient && lastPatient.folderNumber) {
        const lastNumber = parseInt(lastPatient.folderNumber.replace('PAT-', ''));
        nextNumber = lastNumber + 1;
      }
      
      this.folderNumber = `PAT-${nextNumber}`;
      next();
    } catch (error) {
      next(error as Error);
    }
  } else {
    next();
  }
});

export default mongoose.model<IPatient>('Patient', patientSchema);
