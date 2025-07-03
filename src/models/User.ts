import mongoose from 'mongoose';

export interface IUser {
  _id: string;
  name: string;
  email: string;
  dateOfBirth?: string;
  isEmailVerified: boolean;
  otpCode?: string;
  otpExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  dateOfBirth: {
    type: String,
    required: false
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  otpCode: {
    type: String,
    required: false
  },
  otpExpires: {
    type: Date,
    required: false
  }
}, {
  timestamps: true
});

export default mongoose.model<IUser>('User', userSchema);