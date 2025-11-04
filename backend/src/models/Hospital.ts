import mongoose, { Schema } from 'mongoose';

const hospitalSchema = new Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  imageUrl: { type: String }, // Logo
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model('Hospital', hospitalSchema);
