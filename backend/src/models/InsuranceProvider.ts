// models/InsuranceProvider.ts
import mongoose, { Schema } from 'mongoose';

const insuranceProviderSchema = new Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['nhis', 'private'], required: true },
  coveragePercentage: { type: Number, required: true },
  startDate: { type: Date, required: true },
  expiryDate: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  contactInfo: {
    phone: String,
    email: String,
    address: String,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model('InsuranceProvider', insuranceProviderSchema);
