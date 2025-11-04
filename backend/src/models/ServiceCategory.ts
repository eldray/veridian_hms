// models/ServiceCategory.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IServiceCategory extends Document {
  name: string;
  description?: string;
  code: string;
  parentCategory?: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const serviceCategorySchema = new Schema<IServiceCategory>({
  name: { type: String, required: true },
  description: String,
  code: { type: String, required: true, unique: true },
  parentCategory: { type: Schema.Types.ObjectId, ref: 'ServiceCategory' },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

export default mongoose.model<IServiceCategory>('ServiceCategory', serviceCategorySchema);
