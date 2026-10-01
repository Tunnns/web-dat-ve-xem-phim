import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  fullName: string;
  email: string;
  password?: string; // Tùy chọn nếu có tính năng đăng nhập Google/Facebook
  phone?: string;
  role: 'user' | 'admin';
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    phone: { type: String },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    avatar: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', userSchema);
