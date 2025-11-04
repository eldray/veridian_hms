import mongoose, { Schema } from 'mongoose';
import type { Bed } from '../types';

const bedSchema = new Schema<Bed>({
  wardId: { type: Schema.Types.ObjectId, ref: 'Ward', required: true },
  bedNumber: { type: String, required: true },
  isOccupied: { type: Boolean, default: false },
  currentPatientId: { type: Schema.Types.ObjectId, ref: 'Patient' },
});

export default mongoose.model('Bed', bedSchema);
