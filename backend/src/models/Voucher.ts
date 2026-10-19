import mongoose, { Schema, Document } from 'mongoose';

export interface IVoucher extends Document {
  code: string; // Mã giảm giá (viết hoa, duy nhất)
  description?: string;
  discountType: 'percent' | 'fixed'; // Giảm theo % hoặc số tiền cố định
  discountValue: number; // % giảm (0-100) hoặc số tiền giảm
  maxDiscount?: number | null; // Mức giảm tối đa (chỉ áp dụng cho loại percent)
  minOrderValue: number; // Giá trị đơn tối thiểu để được áp dụng
  startDate: Date; // Ngày bắt đầu hiệu lực
  endDate: Date; // Ngày hết hạn
  usageLimit?: number | null; // Tổng lượt dùng cho phép (null = không giới hạn)
  usageCount: number; // Số lượt đã dùng
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const voucherSchema = new Schema<IVoucher>(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    description: { type: String },
    discountType: { type: String, enum: ['percent', 'fixed'], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    maxDiscount: { type: Number, default: null, min: 0 },
    minOrderValue: { type: Number, default: 0, min: 0 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    usageLimit: { type: Number, default: null, min: 0 },
    usageCount: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<IVoucher>('Voucher', voucherSchema);
