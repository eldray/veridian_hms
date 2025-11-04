import mongoose, { Schema } from 'mongoose';
import type { Admission } from '../types';

const admissionSchema = new Schema<Admission>({
  admissionNumber: { type: String, required: true, unique: true },
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
  attendanceId: { type: Schema.Types.ObjectId, ref: 'Attendance' },
  wardId: { type: Schema.Types.ObjectId, ref: 'Ward', required: true },
  bedId: { type: Schema.Types.ObjectId, ref: 'Bed', required: true },
  admissionDate: { type: Date, required: true },
  admissionTime: { type: String, required: true },
  admittingDoctor: { type: String, required: true },
  reasonForAdmission: { type: String, required: true },
  diagnosis: { type: String, required: true },
  status: { type: String, default: 'admitted' },
  dischargeDate: Date,
  dischargeTime: String,
  dischargeSummary: String,
  dailyNotes: [{
    id: String,
    date: Date,
    vitals: Object,
    progressNotes: String,
    medications: [Object],
    procedures: [Object],
    recordedBy: String,
    recordedAt: Date,
  }],
  totalBill: { type: Number, default: 0 },
  createdBy: { type: String, required: true },
});

export default mongoose.model('Admission', admissionSchema);
