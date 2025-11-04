import mongoose, { Schema } from 'mongoose';

const userSchema = new Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    lowercase: true
  },
  password: { 
    type: String, 
    required: true 
  },
  fullName: { 
    type: String, 
    required: true,
    trim: true
  },
  role: { 
    type: String, 
    required: true,
    enum: [
      'admin', 
      'doctor', 
      'nurse', 
      'midwife',    // NEW
      'records',     // NEW
      'lab_tech', 
      'pharmacist', 
      'accounts'
    ]
  },
  email: { 
    type: String, 
    trim: true,
    lowercase: true
  },
  phone: { 
    type: String, 
    trim: true
  },
  licenseNumber: {   // NEW FIELD
    type: String,
    trim: true
  },
  specialization: {  // NEW FIELD
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Update the updatedAt field before saving
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('User', userSchema);
