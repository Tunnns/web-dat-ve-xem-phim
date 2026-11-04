import mongoose, { Schema, Document } from 'mongoose';

export type UserRole = 'user' | 'admin' | 'manager' | 'staff';

export interface IUser extends Document {
  fullName: string;
  email: string;
  password?: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  avatar?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      select: false,
    },
    phone: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'manager', 'staff'],
      default: 'user',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    avatar: {
      type: String,
    },
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IUser>('User', userSchema);